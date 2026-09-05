
-- ============================================================
-- TeleCod ACCOUNT PLANS + H1/H2 BALANCE HOLD
-- Run this block in Supabase SQL Editor after the main schema.
-- ============================================================

alter table public.profiles
  add column if not exists is_premium boolean not null default false;
alter table public.profiles
  add column if not exists subscription_until timestamptz;

alter table public.wallet_transactions
  add column if not exists available_at timestamptz;
alter table public.wallet_transactions
  add column if not exists hold_label text;

create table if not exists public.code_access_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  opens integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, usage_date)
);

alter table public.orders add column if not exists item_type text;
alter table public.orders add column if not exists item_id uuid;
alter table public.orders add column if not exists item_title text;

create index if not exists wallet_transactions_pending_idx
  on public.wallet_transactions(user_id,status,available_at);
create index if not exists code_access_usage_date_idx
  on public.code_access_usage(user_id,usage_date);

alter table public.code_access_usage enable row level security;
drop policy if exists "code access own" on public.code_access_usage;
create policy "code access own" on public.code_access_usage
  for select to authenticated using (user_id=auth.uid());

-- ------------------------------------------------------------
-- Mature H1/H2 sales automatically.
--
-- 05:00-20:59 WIB  => H1, available next calendar day.
-- 21:00-04:59 WIB  => H2, available two calendar days later.
-- ------------------------------------------------------------
drop function if exists public.release_matured_wallet();
create or replace function public.release_matured_wallet()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  released numeric := 0;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Login diperlukan'; end if;

  with matured as (
    select id,user_id,net_amount
    from public.wallet_transactions
    where user_id=uid
      and status='pending'
      and available_at is not null
      and available_at <= now()
    for update
  ),
  totals as (
    select user_id,coalesce(sum(net_amount),0) amount
    from matured group by user_id
  )
  update public.wallets w
  set available_balance = w.available_balance + t.amount,
      pending_balance = greatest(0,w.pending_balance - t.amount),
      updated_at=now()
  from totals t
  where w.user_id=t.user_id;

  update public.wallet_transactions wt
  set status='available'
  where wt.user_id=uid
    and wt.status='pending'
    and wt.available_at is not null
    and wt.available_at <= now();

  select coalesce(sum(net_amount),0) into released
  from public.wallet_transactions
  where user_id=uid and status='available'
    and available_at is not null
    and available_at <= now()
    and updated_at >= now() - interval '2 seconds';

  return jsonb_build_object('ok',true,'released',coalesce(released,0));
end;
$$;
grant execute on function public.release_matured_wallet() to authenticated;

drop function if exists public.get_pending_balance_detail();
create or replace function public.get_pending_balance_detail()
returns table(
  id uuid,
  amount numeric,
  created_at timestamptz,
  available_at timestamptz,
  hold_label text
)
language sql
security definer
set search_path=public
as $$
  select id,net_amount,created_at,available_at,coalesce(hold_label,'H1')
  from public.wallet_transactions
  where user_id=auth.uid()
    and status='pending'
  order by available_at asc nulls last, created_at asc;
$$;
grant execute on function public.get_pending_balance_detail() to authenticated;

-- ------------------------------------------------------------
-- Account plan order
-- subscription_1 = Rp15.000 / 1 day
-- subscription_3 = Rp30.000 / 3 days
-- subscription_7 = Rp50.000 / 7 days
-- premium        = Rp250.000 / lifetime
-- ------------------------------------------------------------
drop function if exists public.create_account_plan_order(text,integer,numeric);
create or replace function public.create_account_plan_order(
  p_plan text,
  p_days integer,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  oid uuid;
  expected numeric;
  title text;
begin
  if uid is null then raise exception 'Login diperlukan'; end if;

  if p_plan='subscription_1' and p_days=1 then expected:=15000;
  elsif p_plan='subscription_3' and p_days=3 then expected:=30000;
  elsif p_plan='subscription_7' and p_days=7 then expected:=50000;
  elsif p_plan='premium' and p_days=0 then expected:=250000;
  else raise exception 'Paket tidak valid'; end if;

  if coalesce(p_amount,0)<>expected then
    raise exception 'Nominal paket tidak sesuai';
  end if;

  if p_plan='premium' and exists(
    select 1 from public.profiles where id=uid and is_premium=true
  ) then
    raise exception 'Akun kamu sudah Premium';
  end if;

  select id into oid
  from public.orders
  where buyer_id=uid and status='pending'
    and item_type=p_plan
  order by created_at desc limit 1;

  if oid is null then
    title:=case when p_plan='premium'
      then 'Upgrade Account Premium'
      else 'Langganan '||p_days||' Hari' end;

    insert into public.orders(
      buyer_id,seller_id,product_id,item_type,item_id,item_title,amount,status
    ) values(uid,null,null,p_plan,null,title,expected,'pending')
    returning id into oid;
  end if;

  return jsonb_build_object(
    'order_id',oid,'amount',expected,'title',title,'plan',p_plan
  );
end;
$$;
grant execute on function public.create_account_plan_order(text,integer,numeric) to authenticated;

-- ------------------------------------------------------------
-- Central access decision.
-- A Premium account opens every paid item.
-- A Langganan account opens paid CODE only, max 5 successful
-- code opens per WIB calendar day.
-- ------------------------------------------------------------
drop function if exists public.consume_account_paid_access(text,uuid);
create or replace function public.consume_account_paid_access(
  p_type text,
  p_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  premium boolean := false;
  sub_until timestamptz;
  already_bought boolean := false;
  d date := (now() at time zone 'Asia/Jakarta')::date;
  opens integer := 0;
begin
  if uid is null then
    return jsonb_build_object('can_access',false,'reason','login');
  end if;

  select coalesce(is_premium,false),subscription_until
  into premium,sub_until
  from public.profiles where id=uid;

  select exists(
    select 1 from public.purchases pu
    where pu.buyer_id=uid
      and pu.status in ('paid','completed')
      and (
        (pu.item_id=p_id and lower(coalesce(pu.item_type,''))=lower(p_type))
        or pu.product_id=p_id
      )
  ) into already_bought;

  if already_bought or premium then
    return jsonb_build_object('can_access',true,'reason',
      case when premium then 'premium' else 'purchased' end);
  end if;

  if lower(p_type)='code' and sub_until is not null and sub_until>now() then
    select coalesce(opens,0) into opens
    from public.code_access_usage
    where user_id=uid and usage_date=d
    for update;

    if not found then
      insert into public.code_access_usage(user_id,usage_date,opens)
      values(uid,d,1);
      return jsonb_build_object('can_access',true,'reason','subscription','opens',1,'limit',5);
    elsif opens < 5 then
      update public.code_access_usage
      set opens=opens+1,updated_at=now()
      where user_id=uid and usage_date=d;
      return jsonb_build_object('can_access',true,'reason','subscription','opens',opens+1,'limit',5);
    else
      return jsonb_build_object('can_access',false,'reason','subscription_limit','opens',opens,'limit',5);
    end if;
  end if;

  return jsonb_build_object('can_access',false,'reason','payment_required');
end;
$$;
grant execute on function public.consume_account_paid_access(text,uuid) to authenticated;

-- ------------------------------------------------------------
-- Rebuild public detail RPC so Premium/Langganan is respected.
-- ------------------------------------------------------------
drop function if exists public.get_market_item_detail(text,uuid);
create or replace function public.get_market_item_detail(
  p_type text,
  p_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_type text := lower(coalesce(p_type,'link'));
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_title text;
  v_description text := '';
  v_content text := '';
  v_access text := 'free';
  v_price numeric := 0;
  v_views bigint := 0;
  v_creator text := 'Creator';
  v_username text;
  v_can_access boolean := false;
  v_reason text := 'payment_required';
  v_exists boolean := false;
  v_access_result jsonb;
begin
  if v_type='code' then
    select tp.owner_id,tp.title,tp.description,tp.access_type,tp.price,
           coalesce(pr.display_name,pr.username,'Creator'),pr.username
    into v_owner,v_title,v_description,v_access,v_price,v_creator,v_username
    from public.telegram_products tp
    left join public.profiles pr on pr.id=tp.owner_id
    where tp.id=p_id and tp.is_published=true;
    v_exists:=found;
    if v_exists then
      select count(*) into v_views from public.analytics_events
      where target_id=p_id and target_type='code' and event_type='view';
    end if;

  elsif v_type in ('channel','group') then
    select tc.owner_id,coalesce(tc.name,'Telegram'),'',
           coalesce(tc.telegram_channel_id,''),tc.access_type,tc.price,
           coalesce(pr.display_name,pr.username,'Creator'),pr.username
    into v_owner,v_title,v_description,v_content,v_access,v_price,v_creator,v_username
    from public.telegram_channels tc
    left join public.profiles pr on pr.id=tc.owner_id
    where tc.id=p_id and tc.type=v_type and tc.is_published=true;
    v_exists:=found;
    if v_exists then
      select count(*) into v_views from public.analytics_events
      where target_id=p_id and target_type=v_type and event_type='view';
    end if;

  elsif v_type='link' then
    select coalesce(p.creator_id,p.seller_id),p.title,p.description,p.content,
           p.access_type,p.price,p.views,
           coalesce(pr.display_name,pr.username,'Creator'),pr.username
    into v_owner,v_title,v_description,v_content,v_access,v_price,v_views,v_creator,v_username
    from public.products p
    left join public.profiles pr on pr.id=coalesce(p.creator_id,p.seller_id)
    where p.id=p_id and p.status='published';
    v_exists:=found;

    if not v_exists then
      select pl.user_id,pl.title,pl.description,pl.content_html,
             'free',0,pl.views,
             coalesce(pr.display_name,pr.username,'Creator'),pr.username
      into v_owner,v_title,v_description,v_content,v_access,v_price,v_views,v_creator,v_username
      from public.pastelinks pl
      left join public.profiles pr on pr.id=pl.user_id
      where pl.id=p_id and pl.visibility='public'
        and (pl.expires_at is null or pl.expires_at>now());
      v_exists:=found;
    end if;
  else
    raise exception 'Tipe produk tidak valid';
  end if;

  if not v_exists or v_owner is null then
    raise exception 'Produk tidak ditemukan atau belum dipublikasikan';
  end if;

  if lower(coalesce(v_access,'free'))='free' then
    v_can_access:=true; v_reason:='free';
  elsif v_uid is not null then
    v_access_result:=public.consume_account_paid_access(v_type,p_id);
    v_can_access:=coalesce((v_access_result->>'can_access')::boolean,false);
    v_reason:=coalesce(v_access_result->>'reason','payment_required');
  end if;

  return jsonb_build_object(
    'id',p_id,'type',v_type,'owner_id',v_owner,'title',v_title,
    'description',coalesce(v_description,''),'content',
      case when v_can_access then coalesce(v_content,'') else '' end,
    'channel_link',case when v_can_access then coalesce(v_content,'') else '' end,
    'access_type',coalesce(v_access,'free'),'price',coalesce(v_price,0),
    'views',coalesce(v_views,0),'creator_name',coalesce(v_creator,'Creator'),
    'creator_username',v_username,'can_access',v_can_access,
    'access_reason',v_reason
  );
end;
$$;
grant execute on function public.get_market_item_detail(text,uuid) to anon,authenticated;

-- ------------------------------------------------------------
-- Payment completion: activate plans and put seller sales into
-- H1/H2 hold instead of making them instantly available.
-- ------------------------------------------------------------
drop function if exists public.admin_mark_order_paid(uuid,text);
create or replace function public.admin_mark_order_paid(
  p_order_id uuid,
  p_payment_reference text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  o public.orders;
  local_paid timestamptz := now();
  local_time time := (local_paid at time zone 'Asia/Jakarta')::time;
  local_date date := (local_paid at time zone 'Asia/Jakarta')::date;
  release_date date;
  release_at timestamptz;
  hold text;
begin
  -- Cashi webhook normally uses service_role. Dashboard admins can also
  -- confirm a payment manually.
  if coalesce(auth.role(),'')<>'service_role' then
    perform public.assert_admin();
  end if;

  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order tidak ditemukan'; end if;

  if o.status='paid' then
    return jsonb_build_object('ok',true,'order_id',o.id,'status','paid','idempotent',true);
  end if;

  update public.orders
  set status='paid',payment_reference=p_payment_reference,paid_at=local_paid
  where id=o.id;

  insert into public.payments(order_id,user_id,amount,reference,status,paid_at)
  values(o.id,o.buyer_id,o.amount,p_payment_reference,'paid',local_paid)
  on conflict do nothing;

  -- Account plan
  if o.item_type in ('subscription_1','subscription_3','subscription_7','premium') then
    if o.item_type='premium' then
      update public.profiles
      set is_premium=true,updated_at=now()
      where id=o.buyer_id;
      insert into public.notifications(user_id,title,body)
      values(o.buyer_id,'Premium Aktif','Pembayaran berhasil. Account Premium kamu sudah aktif dan semua akses Paid terbuka.');
    else
      update public.profiles
      set subscription_until = greatest(
        coalesce(subscription_until,now()),
        now()
      ) + case o.item_type
            when 'subscription_1' then interval '1 day'
            when 'subscription_3' then interval '3 days'
            when 'subscription_7' then interval '7 days'
          end,
          updated_at=now()
      where id=o.buyer_id;
      insert into public.notifications(user_id,title,body)
      values(o.buyer_id,'Langganan Aktif','Pembayaran berhasil. Kamu sekarang dapat membuka Code Paid hingga 5x per hari.');
    end if;

    insert into public.transactions(user_id,amount,fee,net_amount,type,status,reference)
    values(o.buyer_id,-o.amount,0,-o.amount,'account_plan','completed',o.id::text);

  elsif o.product_id is not null then
    insert into public.purchases(buyer_id,product_id,order_id,amount,status,item_type,item_id,item_title)
    values(o.buyer_id,o.product_id,o.id,o.amount,'paid',coalesce(o.item_type,'link'),o.item_id,o.item_title)
    on conflict do nothing;
    update public.products set sales_count=coalesce(sales_count,0)+1,updated_at=now()
    where id=o.product_id;
  elsif o.item_id is not null then
    insert into public.purchases(buyer_id,product_id,order_id,amount,status,item_type,item_id,item_title)
    values(o.buyer_id,null,o.id,o.amount,'paid',o.item_type,o.item_id,o.item_title)
    on conflict do nothing;
  end if;

  -- Seller revenue: total balance records the money immediately, but the
  -- spendable available_balance waits until H1/H2 maturity.
  if o.seller_id is not null and coalesce(o.amount,0)>0 then
    if local_time >= time '21:00' or local_time < time '05:00' then
      release_date:=local_date+2;
      hold:='H2';
    else
      release_date:=local_date+1;
      hold:='H1';
    end if;
    release_at := (release_date::text||' 00:00:00 Asia/Jakarta')::timestamptz;

    insert into public.wallets(user_id) values(o.seller_id)
    on conflict(user_id) do nothing;

    update public.wallets
    set balance=balance+o.amount,
        pending_balance=pending_balance+o.amount,
        updated_at=now()
    where user_id=o.seller_id;

    insert into public.wallet_transactions(
      user_id,amount,fee,net_amount,type,status,created_at,available_at,hold_label
    ) values(
      o.seller_id,o.amount,0,o.amount,
      'sale_'||coalesce(o.item_type,'link'),'pending',
      local_paid,release_at,hold
    );

    insert into public.transactions(user_id,amount,fee,net_amount,type,status,reference)
    values(o.seller_id,o.amount,0,o.amount,'sale_'||coalesce(o.item_type,'link'),'completed',o.id::text);
  end if;

  if coalesce(auth.role(),'')<>'service_role' then
    insert into public.admin_logs(admin_id,action,target_id,details)
    values(auth.uid(),'mark_order_paid',o.id,jsonb_build_object('reference',p_payment_reference,'hold','H1/H2'));
  end if;

  return jsonb_build_object('ok',true,'order_id',o.id,'status','paid');
end;
$$;
grant execute on function public.admin_mark_order_paid(uuid,text) to authenticated;

-- Re-sync old pending wallet rows that predate H1/H2 columns.
-- Only rows still pending are touched.
update public.wallet_transactions wt
set available_at = case
  when ((wt.created_at at time zone 'Asia/Jakarta')::time >= time '21:00'
        or (wt.created_at at time zone 'Asia/Jakarta')::time < time '05:00')
    then ((((wt.created_at at time zone 'Asia/Jakarta')::date + 2)::text||' 00:00:00 Asia/Jakarta')::timestamptz)
  else ((((wt.created_at at time zone 'Asia/Jakarta')::date + 1)::text||' 00:00:00 Asia/Jakarta')::timestamptz)
end,
hold_label = case
  when ((wt.created_at at time zone 'Asia/Jakarta')::time >= time '21:00'
        or (wt.created_at at time zone 'Asia/Jakarta')::time < time '05:00')
    then 'H2' else 'H1' end
where wt.status='pending' and wt.available_at is null;

-- Service-role is used by the Cashi webhook to complete paid orders.
grant execute on function public.admin_mark_order_paid(uuid,text) to service_role;

-- Return an accurate released amount (redefine helper).
drop function if exists public.release_matured_wallet();
create or replace function public.release_matured_wallet()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  released numeric := 0;
begin
  if uid is null then raise exception 'Login diperlukan'; end if;

  select coalesce(sum(net_amount),0) into released
  from public.wallet_transactions
  where user_id=uid and status='pending'
    and available_at is not null and available_at<=now();

  if released>0 then
    update public.wallets
    set available_balance=available_balance+released,
        pending_balance=greatest(0,pending_balance-released),
        updated_at=now()
    where user_id=uid;

    update public.wallet_transactions
    set status='available'
    where user_id=uid and status='pending'
      and available_at is not null and available_at<=now();
  end if;

  return jsonb_build_object('ok',true,'released',released);
end;
$$;
grant execute on function public.release_matured_wallet() to authenticated;
