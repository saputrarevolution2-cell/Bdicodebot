
-- ============================================================
-- TELECOD MARKETPLACE + WALLET FINAL FIX
-- Run after the original schema.sql on an existing Supabase DB.
-- ============================================================

-- Anonymous FREE marketplace submissions need no creator profile.
alter table public.products alter column creator_id drop not null;

-- Product moderation states.
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check(status in ('pending','draft','published','archived'));

-- Guest checkout: paid products can be purchased without an account.
alter table public.purchases alter column buyer_id drop not null;
alter table public.purchases add column if not exists guest_token text unique;
alter table public.purchases add column if not exists guest_email text;
create index if not exists purchases_guest_token_idx on public.purchases(guest_token) where guest_token is not null;

alter table public.payments alter column user_id drop not null;
alter table public.payments add column if not exists guest_token text;
create index if not exists payments_guest_token_idx on public.payments(guest_token) where guest_token is not null;

-- Wallet now separates immediately available balance from H+1 pending sales.
alter table public.wallets add column if not exists pending_balance numeric(18,2) not null default 0 check(pending_balance>=0);

-- Withdrawal mode/fee/ticket.
alter table public.withdrawals add column if not exists withdrawal_mode text not null default 'auto';
alter table public.withdrawals add column if not exists fee numeric(18,2) not null default 0;
alter table public.withdrawals add column if not exists requested_amount numeric(18,2);
alter table public.withdrawals add column if not exists total_debit numeric(18,2);
alter table public.withdrawals add column if not exists ticket text unique;
alter table public.withdrawals add column if not exists queue_position integer;

-- Approved Telegram bots maintained by the master admin.
create table if not exists public.approved_bots(
  id uuid primary key default gen_random_uuid(),
  bot_username text not null unique,
  bot_id bigint,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists approved_bots_active_idx on public.approved_bots(is_active,lower(bot_username));

alter table public.approved_bots enable row level security;
drop policy if exists approved_bots_admin_all on public.approved_bots;
create policy approved_bots_admin_all on public.approved_bots for all to authenticated
using(public.is_admin()) with check(public.is_admin());

-- Public-safe marketplace view. Never exposes code content.
drop view if exists public.marketplace_public;
create view public.marketplace_public with (security_invoker=true) as
select
  p.id,p.creator_id,p.type,p.title,p.slug,p.description,p.category,p.access_type,
  p.price,p.thumbnail_url,p.telegram_channel,p.is_channel,p.status,p.views,
  p.sales_count,p.created_at,p.updated_at,
  coalesce(pr.username, 'TeleCod') as creator_username
from public.products p
left join public.profiles pr on pr.id=p.creator_id
where p.status='published';
grant select on public.marketplace_public to anon,authenticated;

-- Replace product RLS so anonymous users can only insert through the trusted
-- marketplace Edge Function, not arbitrary browser inserts.
drop policy if exists products_creator_insert on public.products;
drop policy if exists products_creator_update on public.products;
drop policy if exists products_creator_delete on public.products;
create policy products_creator_update on public.products for update to authenticated
using(creator_id=auth.uid()) with check(creator_id=auth.uid());
create policy products_creator_delete on public.products for delete to authenticated
using(creator_id=auth.uid());

-- Purchase read policies remain owner/admin only. Guest purchases are accessed
-- through the marketplace Edge Function using an unguessable token.
drop policy if exists purchases_owner_read on public.purchases;
create policy purchases_owner_read on public.purchases for select to authenticated
using(buyer_id=auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- Product submission RPC
-- ------------------------------------------------------------
create or replace function public.marketplace_submit_product(
  p_title text,
  p_type text,
  p_access_type text,
  p_price numeric default 0,
  p_description text default null,
  p_content text default null,
  p_bot_username text default null,
  p_telegram_channel text default null,
  p_category text default null,
  p_thumbnail_url text default null
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  slug text;
  approved boolean := false;
  final_status text := 'published';
begin
  if trim(coalesce(p_title,''))='' then raise exception 'Judul wajib diisi'; end if;
  if p_type not in ('code','channel') then raise exception 'Tipe produk tidak valid'; end if;
  if p_access_type not in ('free','paid') then raise exception 'Jenis akses tidak valid'; end if;
  if p_access_type='paid' and uid is null then raise exception 'Login/register diperlukan untuk produk paid'; end if;
  if p_access_type='paid' and coalesce(p_price,0)<=0 then raise exception 'Harga paid harus lebih dari 0'; end if;
  if p_type='code' and trim(coalesce(p_content,''))='' then raise exception 'Code wajib diisi'; end if;
  if p_type='channel' and trim(coalesce(p_telegram_channel,''))='' then raise exception 'Link Channel/Group wajib diisi'; end if;

  if p_type='code' then
    select exists(
      select 1 from public.approved_bots
      where is_active=true
        and lower(bot_username)=lower(trim(replace(coalesce(p_bot_username,''),'@','')))
    ) into approved;
    if not approved then final_status:='pending'; end if;
  end if;

  slug:=encode(gen_random_bytes(8),'hex');
  insert into public.products(
    creator_id,type,title,slug,description,category,access_type,price,
    thumbnail_url,content,telegram_channel,is_channel,status
  ) values(
    uid,p_type,trim(p_title),slug,nullif(trim(p_description),''),
    nullif(trim(p_category),''),p_access_type,case when p_access_type='free' then 0 else p_price end,
    nullif(trim(p_thumbnail_url),''),case when p_type='code' then p_content else null end,
    case when p_type='channel' then trim(p_telegram_channel) else null end,
    p_type='channel',final_status
  ) returning id into pid;

  return jsonb_build_object(
    'id',pid,'slug',slug,'status',final_status,
    'published',final_status='published','bot_approved',approved
  );
end $$;

grant execute on function public.marketplace_submit_product(text,text,text,numeric,text,text,text,text,text,text)
to anon,authenticated;

-- ------------------------------------------------------------
-- H+1 sale settlement
-- ------------------------------------------------------------
create or replace function public.release_matured_sales()
returns integer
language plpgsql security definer set search_path=public
as $$
declare
  r record;
  released integer:=0;
  fee_amount numeric;
  receive_amount numeric;
begin
  for r in
    select t.id,t.user_id,t.amount,t.reference_id
    from public.transactions t
    where t.type='sale' and t.status='pending'
      and t.created_at <= now() - interval '1 day'
    for update skip locked
  loop
    update public.transactions set status='success' where id=r.id and status='pending';
    if found then
      perform public.ensure_wallet(r.user_id);
      update public.wallets
      set pending_balance=greatest(0,pending_balance-r.amount),
          balance=balance+r.amount
      where user_id=r.user_id;
      released:=released+1;
    end if;
  end loop;
  return released;
end $$;
grant execute on function public.release_matured_sales() to anon,authenticated;

-- ------------------------------------------------------------
-- Withdrawal queue: auto = min 50k + 5k fee; instant fixed amounts
-- = 15k fee and 500k/day limit.
-- ------------------------------------------------------------
create or replace function public.request_withdrawal_v2(
  p_amount numeric,
  p_mode text,
  p_method text,
  p_account_name text,
  p_account_number text
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  bal numeric;
  fee_amount numeric;
  total numeric;
  wid uuid;
  ticket text;
  qpos integer;
  today_total numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_method not in ('bank','ewallet','crypto') then raise exception 'Metode payout tidak valid'; end if;
  if p_mode not in ('auto','instant') then raise exception 'Mode WD tidak valid'; end if;
  if p_account_name is null or trim(p_account_name)='' then raise exception 'Nama pemilik wajib diisi'; end if;
  if p_account_number is null or trim(p_account_number)='' then raise exception 'Nomor rekening/wallet wajib diisi'; end if;

  if p_mode='auto' then
    if p_amount < 50000 then raise exception 'WD otomatis minimal Rp 50.000'; end if;
    fee_amount:=5000;
  else
    if p_amount not in (50000,100000,150000,200000,250000) then
      raise exception 'Nominal WD instant hanya 50k/100k/150k/200k/250k';
    end if;
    fee_amount:=15000;
    select coalesce(sum(requested_amount),0) into today_total
    from public.withdrawals
    where user_id=uid and withdrawal_mode='instant'
      and created_at >= date_trunc('day',now())
      and status not in ('failed','cancelled');
    if today_total+p_amount>500000 then
      raise exception 'Limit WD instant Rp 500.000 per hari telah tercapai';
    end if;
  end if;

  total:=p_amount+fee_amount;
  perform public.release_matured_sales();
  perform public.ensure_wallet(uid);
  select balance into bal from public.wallets where user_id=uid for update;
  if bal < total then
    raise exception 'Saldo tersedia tidak cukup. Dibutuhkan '||total::text||' termasuk fee.';
  end if;

  update public.wallets set balance=balance-total where user_id=uid;

  ticket:='WD-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,8));
  select count(*)+1 into qpos from public.withdrawals where created_at::date=current_date and status in ('pending','processing');

  insert into public.withdrawals(
    user_id,amount,method,account_name,account_number,status,
    withdrawal_mode,fee,requested_amount,total_debit,ticket,queue_position
  ) values(
    uid,total,p_method,trim(p_account_name),trim(p_account_number),'pending',
    p_mode,fee_amount,p_amount,total,ticket,qpos
  ) returning id into wid;

  insert into public.transactions(
    user_id,type,direction,amount,status,reference_id,description
  ) values(
    uid,'withdrawal','debit',total,'pending',wid,
    case when p_mode='instant'
      then 'WD Instant Rp '||p_amount::text||' + fee Rp 15000'
      else 'WD Otomatis Rp '||p_amount::text||' + fee Rp 5000'
    end
  );

  return jsonb_build_object(
    'id',wid,'ticket',ticket,'queue_position',qpos,
    'requested_amount',p_amount,'fee',fee_amount,'total_debit',total
  );
end $$;
grant execute on function public.request_withdrawal_v2(numeric,text,text,text,text) to authenticated;

-- Admin bot management.
create or replace function public.admin_bots()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_agg(x order by x.created_at desc) from public.approved_bots x),'[]'::jsonb);
end $$;

create or replace function public.admin_upsert_bot(
  p_username text,p_bot_id bigint default null,p_display_name text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  insert into public.approved_bots(bot_username,bot_id,display_name,is_active)
  values(lower(trim(replace(p_username,'@',''))),p_bot_id,nullif(trim(p_display_name),''),true)
  on conflict(bot_username) do update set bot_id=excluded.bot_id,display_name=excluded.display_name,is_active=true,updated_at=now()
  returning approved_bots.id into id;
  return id;
end $$;

create or replace function public.admin_delete_bot(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  delete from public.approved_bots where id=p_id;
end $$;

grant execute on function public.admin_bots() to authenticated;
grant execute on function public.admin_upsert_bot(text,bigint,text) to authenticated;
grant execute on function public.admin_delete_bot(uuid) to authenticated;

-- Allow admin to see pending anonymous products and existing admin RPC handles them.
drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products for all to authenticated
using(public.is_admin()) with check(public.is_admin());

-- Ensure admin product RPC accepts pending.
create or replace function public.admin_update_product(p_id uuid,p_status text,p_price numeric default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status is not null and p_status not in ('pending','draft','published','archived') then
    raise exception 'Invalid status';
  end if;
  update public.products set status=coalesce(p_status,status),price=coalesce(p_price,price) where id=p_id;
  insert into public.admin_logs(admin_id,action,target_type,target_id,details)
  values(auth.uid(),'update_product','product',p_id::text,jsonb_build_object('status',p_status,'price',p_price));
end $$;
grant execute on function public.admin_update_product(uuid,text,numeric) to authenticated;

-- Updated withdrawal admin RPC: failed/cancelled refunds total debit.
create or replace function public.admin_process_withdrawal(p_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare w public.withdrawals%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('processing','paid','failed','cancelled') then raise exception 'Invalid withdrawal status'; end if;
  select * into w from public.withdrawals where id=p_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;

  update public.withdrawals
  set status=p_status,note=coalesce(p_note,note),
      processed_at=case when p_status in ('paid','failed','cancelled') then now() else processed_at end
  where id=p_id;

  if p_status in ('failed','cancelled') and w.status in ('pending','processing') then
    perform public.ensure_wallet(w.user_id);
    update public.wallets set balance=balance+coalesce(w.total_debit,w.amount) where user_id=w.user_id;
    update public.transactions set status='failed' where reference_id=w.id and type='withdrawal';
  elsif p_status='paid' then
    update public.transactions set status='success' where reference_id=w.id and type='withdrawal';
  end if;
end $$;
grant execute on function public.admin_process_withdrawal(uuid,text,text) to authenticated;

-- Existing wallet rows are initialized automatically.
update public.wallets set pending_balance=0 where pending_balance is null;

-- ============================================================
-- TELECOD FINAL AUTH + MARKETPLACE RULES (append-safe)
-- ============================================================

alter table public.profiles add column if not exists telegram_username text;
create index if not exists profiles_telegram_username_idx on public.profiles(lower(telegram_username));

-- Keep the first row when old databases contain duplicate Telegram usernames.
with ranked as (
  select id, row_number() over(partition by lower(telegram_username) order by created_at,id) rn
  from public.profiles
  where telegram_username is not null and telegram_username <> ''
)
update public.profiles p set telegram_username=null
where p.id in (select id from ranked where rn>1);
create unique index if not exists profiles_telegram_username_unique_idx on public.profiles(lower(telegram_username)) where telegram_username is not null and telegram_username <> '';

alter table public.products alter column creator_id drop not null;
alter table public.products add column if not exists bot_username text;
create index if not exists products_bot_username_idx on public.products(lower(bot_username)) where bot_username is not null;

create or replace function public.marketplace_submit_product(
  p_title text,
  p_type text,
  p_access_type text,
  p_price numeric default 0,
  p_description text default null,
  p_content text default null,
  p_bot_username text default null,
  p_telegram_channel text default null,
  p_category text default null,
  p_thumbnail_url text default null
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  uid uuid := auth.uid();
  pid uuid; slug text; approved boolean := true; final_status text := 'published';
begin
  if trim(coalesce(p_title,''))='' then raise exception 'Judul wajib diisi'; end if;
  if p_type not in ('code','channel') then raise exception 'Tipe produk tidak valid'; end if;
  if p_access_type not in ('free','paid') then raise exception 'Jenis akses tidak valid'; end if;
  if p_access_type='paid' and uid is null then raise exception 'Login/register diperlukan untuk produk PAID'; end if;
  if p_access_type='paid' and coalesce(p_price,0)<=0 then raise exception 'Harga paid harus lebih dari 0'; end if;
  if p_type='code' and trim(coalesce(p_content,''))='' then raise exception 'Code wajib diisi'; end if;
  if p_type='channel' and trim(coalesce(p_telegram_channel,''))='' then raise exception 'Link Channel/Group wajib diisi'; end if;

  if p_type='code' then
    select exists(select 1 from public.approved_bots where is_active=true and lower(bot_username)=lower(trim(replace(coalesce(p_bot_username,''),'@','')))) into approved;
    if not approved then final_status:='pending'; end if;
  end if;

  slug:=encode(gen_random_bytes(8),'hex');
  insert into public.products(creator_id,type,title,slug,description,category,access_type,price,thumbnail_url,content,telegram_channel,bot_username,is_channel,status)
  values(uid,p_type,trim(p_title),slug,nullif(trim(p_description),''),nullif(trim(p_category),''),p_access_type,case when p_access_type='free' then 0 else p_price end,nullif(trim(p_thumbnail_url),''),case when p_type='code' then p_content else null end,case when p_type='channel' then trim(p_telegram_channel) else null end,case when p_type='code' then lower(trim(replace(coalesce(p_bot_username,''),'@',''))) else null end,p_type='channel',final_status)
  returning id into pid;

  return jsonb_build_object('id',pid,'slug',slug,'status',final_status,'published',final_status='published','bot_approved',approved,'login_required',p_access_type='paid');
end $$;
grant execute on function public.marketplace_submit_product(text,text,text,numeric,text,text,text,text,text,text) to anon,authenticated;

create or replace function public.admin_upsert_bot(p_username text,p_bot_id bigint default null,p_display_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare id uuid; clean_username text:=lower(trim(replace(p_username,'@','')));
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  insert into public.approved_bots(bot_username,bot_id,display_name,is_active)
  values(clean_username,p_bot_id,nullif(trim(p_display_name),''),true)
  on conflict(bot_username) do update set bot_id=excluded.bot_id,display_name=excluded.display_name,is_active=true,updated_at=now()
  returning approved_bots.id into id;
  update public.products set status='published',updated_at=now()
  where type='code' and status='pending' and lower(coalesce(bot_username,''))=clean_username;
  return id;
end $$;
grant execute on function public.admin_upsert_bot(text,bigint,text) to authenticated;

