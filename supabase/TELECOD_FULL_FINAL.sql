-- =========================================================
-- TELECOD — FULL SUPABASE SCHEMA
-- Premium deployment / 2026
-- Run in Supabase SQL Editor on a fresh project or review
-- each DROP/ALTER statement before running on an existing DB.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  telegram_username text,
  telegram_id text,
  telegram_number text,
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  terms_accepted_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists withdraw_method text;
alter table public.profiles add column if not exists withdraw_account_number text;
alter table public.profiles add column if not exists withdraw_account_name text;
create unique index if not exists profiles_username_unique on public.profiles(lower(username)) where username is not null;
create unique index if not exists profiles_telegram_username_unique on public.profiles(lower(telegram_username)) where telegram_username is not null;
create index if not exists profiles_admin_idx on public.profiles(is_admin);
create index if not exists profiles_created_idx on public.profiles(created_at desc);

-- ---------- WALLETS ----------
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(18,2) not null default 0 check (balance >= 0),
  pending_balance numeric(18,2) not null default 0 check (pending_balance >= 0),
  currency text not null default 'IDR',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- PRODUCTS / MARKETPLACE ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text,
  description text,
  category text,
  type text not null check (type in ('code','channel')),
  access_type text not null default 'free' check (access_type in ('free','paid')),
  price bigint not null default 0 check (price >= 0),
  thumbnail_url text,
  bot_username text,
  telegram_channel text,
  content text,
  status text not null default 'pending' check (status in ('draft','pending','published','rejected','archived')),
  views bigint not null default 0 check (views >= 0),
  sales_count bigint not null default 0 check (sales_count >= 0),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_paid_price check (access_type <> 'paid' or price >= 1000)
);
create unique index if not exists products_slug_unique on public.products(lower(slug)) where slug is not null;
create index if not exists products_market_idx on public.products(status,access_type,type,created_at desc);
create index if not exists products_creator_idx on public.products(creator_id,created_at desc);

-- ---------- PURCHASES ----------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  guest_token text,
  amount bigint not null default 0 check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded')),
  payment_id uuid,
  paid_at timestamptz,
  access_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists purchases_user_product_unique on public.purchases(product_id,buyer_id) where buyer_id is not null;
create unique index if not exists purchases_guest_unique on public.purchases(guest_token) where guest_token is not null;
create index if not exists purchases_buyer_idx on public.purchases(buyer_id,created_at desc);
create index if not exists purchases_product_idx on public.purchases(product_id,created_at desc);
create index if not exists purchases_status_idx on public.purchases(status,created_at desc);

-- ---------- PAYMENTS ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  guest_token text,
  kind text not null default 'purchase' check (kind in ('purchase','deposit','refund','withdrawal')),
  provider text not null default 'dompetx',
  order_id text not null,
  provider_reference text,
  amount bigint not null default 0 check (amount >= 0),
  currency text not null default 'IDR',
  method text,
  status text not null default 'pending' check (status in ('pending','paid','failed','expired','cancelled')),
  raw_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists payments_order_unique on public.payments(order_id);
create index if not exists payments_user_idx on public.payments(user_id,created_at desc);
create index if not exists payments_purchase_idx on public.payments(purchase_id,created_at desc);
create index if not exists payments_status_idx on public.payments(status,created_at desc);

-- Add circular FK after both tables exist.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname='purchases_payment_id_fkey'
  ) then
    alter table public.purchases
      add constraint purchases_payment_id_fkey
      foreign key (payment_id) references public.payments(id) on delete set null;
  end if;
end $$;

-- ---------- TRANSACTIONS ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit','purchase','sale','withdrawal','refund','fee','adjustment')),
  direction text not null check (direction in ('credit','debit')),
  amount bigint not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','success','failed','cancelled')),
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions(user_id,created_at desc);
create index if not exists transactions_reference_idx on public.transactions(reference_id,type);

-- ---------- WITHDRAWALS ----------
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount > 0),
  mode text not null default 'manual',
  method text not null,
  account_name text not null,
  account_number text not null,
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','cancelled')),
  provider_reference text,
  note text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists withdrawals_user_idx on public.withdrawals(user_id,created_at desc);
create index if not exists withdrawals_status_idx on public.withdrawals(status,created_at desc);

-- ---------- PASTELINK ----------
create table if not exists public.pastelinks (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  user_id uuid references public.profiles(id) on delete set null,
  title text not null default 'Telegram Link',
  author_name text,
  description text,
  destination_url text,
  content_html text,
  tags text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  expires_at timestamptz,
  syntax text default 'plain',
  allow_comments boolean not null default true,
  allow_download boolean not null default true,
  show_raw boolean not null default true,
  publish_timeline boolean not null default false,
  anonymous boolean not null default false,
  views bigint not null default 0 check (views >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists pastelinks_slug_unique on public.pastelinks(lower(slug));
create index if not exists pastelinks_user_idx on public.pastelinks(user_id,created_at desc);
create index if not exists pastelinks_public_idx on public.pastelinks(visibility,created_at desc);

-- ---------- SITE STATS ----------
create table if not exists public.site_stats (
  key text primary key,
  value bigint not null default 0,
  label text,
  updated_at timestamptz not null default now()
);

-- ---------- ADMIN AUDIT LOG ----------
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_logs_created_idx on public.admin_logs(created_at desc);

-- ---------- PUBLIC MARKETPLACE VIEW ----------
create or replace view public.marketplace_public
as
select
  p.id,p.creator_id,p.title,p.slug,p.description,p.category,p.type,p.access_type,
  p.price,p.thumbnail_url,p.bot_username,p.telegram_channel,p.content,p.status,
  p.views,p.sales_count,p.created_at,p.updated_at,
  coalesce(pr.display_name,pr.username,'Creator') as creator_name,
  pr.username as creator_username
from public.products p
left join public.profiles pr on pr.id=p.creator_id
where p.status='published';

-- ---------- UPDATED_AT ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists wallets_touch on public.wallets;
create trigger wallets_touch before update on public.wallets for each row execute function public.touch_updated_at();
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists purchases_touch on public.purchases;
create trigger purchases_touch before update on public.purchases for each row execute function public.touch_updated_at();
drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();
drop trigger if exists pastelinks_touch on public.pastelinks;
create trigger pastelinks_touch before update on public.pastelinks for each row execute function public.touch_updated_at();

-- ---------- WALLET ----------
create or replace function public.ensure_wallet(p_user uuid default auth.uid())
returns public.wallets
language plpgsql security definer set search_path=public
as $$
declare w public.wallets;
begin
  if p_user is null then raise exception 'User required'; end if;
  insert into public.wallets(user_id,balance,pending_balance,currency)
  values(p_user,0,0,'IDR')
  on conflict(user_id) do nothing;
  select * into w from public.wallets where user_id=p_user;
  return w;
end $$;

-- ---------- LOGIN LOOKUPS ----------
create or replace function public.resolve_username_login(p_username text)
returns table(id uuid,username text,display_name text,auth_email text,is_banned boolean)
language sql security definer set search_path=public
as $$
  select p.id,p.username,p.display_name,
         coalesce((select u.email from auth.users u where u.id=p.id),
                  lower(p.username)||'@telecod.local') as auth_email,
         p.is_banned
  from public.profiles p
  where lower(p.username)=lower(trim(both '@' from p_username))
     or lower(p.telegram_username)=lower(trim(both '@' from p_username))
  limit 1
$$;

create or replace function public.lookup_user_by_email(p_email text)
returns table(id uuid,username text,display_name text,auth_email text,is_banned boolean)
language sql security definer set search_path=public
as $$
  select p.id,p.username,p.display_name,u.email as auth_email,p.is_banned
  from auth.users u join public.profiles p on p.id=u.id
  where lower(u.email)=lower(trim(p_email))
  limit 1
$$;

-- ---------- MARKETPLACE CREATE ----------
create or replace function public.marketplace_submit_product(
  p_title text,p_type text,p_access_type text,p_price bigint default 0,
  p_description text default null,p_content text default null,
  p_bot_username text default null,p_telegram_channel text default null,
  p_category text default null,p_thumbnail_url text default null
)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare uid uuid:=auth.uid(); pid uuid; base_slug text; final_slug text; n int:=0;
begin
  if uid is null then raise exception 'Login diperlukan'; end if;
  if not exists(select 1 from profiles where id=uid and not is_banned) then raise exception 'Akun tidak diizinkan'; end if;
  if lower(p_type) not in ('code','channel') then raise exception 'Tipe produk tidak valid'; end if;
  if lower(p_access_type) not in ('free','paid') then raise exception 'Akses produk tidak valid'; end if;
  if lower(p_access_type)='paid' and coalesce(p_price,0)<1000 then raise exception 'Harga produk berbayar minimal Rp 1.000'; end if;
  base_slug:=regexp_replace(lower(coalesce(p_title,'product')),'[^a-z0-9]+','-','g');
  base_slug:=trim(both '-' from base_slug);
  if base_slug='' then base_slug:='product'; end if;
  final_slug:=left(base_slug,70);
  while exists(select 1 from products where slug=final_slug) loop
    n:=n+1; final_slug:=left(base_slug,64)||'-'||n;
  end loop;
  insert into products(creator_id,title,slug,type,access_type,price,description,content,bot_username,telegram_channel,category,thumbnail_url,status)
  values(uid,trim(p_title),final_slug,lower(p_type),lower(p_access_type),case when lower(p_access_type)='free' then 0 else p_price end,
         nullif(trim(p_description),''),p_content,nullif(trim(p_bot_username),''),nullif(trim(p_telegram_channel),''),
         nullif(trim(p_category),''),nullif(trim(p_thumbnail_url),''),'published')
  returning id into pid;
  return jsonb_build_object('id',pid,'slug',final_slug,'status','published');
end $$;

-- ---------- FREE PURCHASE ----------
create or replace function public.complete_free_purchase(p_product uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare uid uuid:=auth.uid(); p public.products; pid uuid;
begin
  if uid is null then raise exception 'Login diperlukan'; end if;
  select * into p from products where id=p_product and status='published' for update;
  if p.id is null then raise exception 'Produk tidak ditemukan'; end if;
  if p.access_type<>'free' then raise exception 'Produk berbayar'; end if;
  select id into pid from purchases where product_id=p_product and buyer_id=uid limit 1;
  if pid is null then
    insert into purchases(product_id,buyer_id,amount,status,paid_at,access_granted_at)
    values(p_product,uid,0,'paid',now(),now()) returning id into pid;
  else
    update purchases set status='paid',paid_at=coalesce(paid_at,now()),access_granted_at=coalesce(access_granted_at,now()) where id=pid;
  end if;
  return jsonb_build_object('ok',true,'purchase_id',pid);
end $$;

-- ---------- VIEW COUNTERS ----------
create or replace function public.increment_product_view(p_product uuid,p_viewer_hash text default null)
returns bigint language plpgsql security definer set search_path=public as $$
declare v bigint;
begin
  update products set views=views+1 where id=p_product and status='published' returning views into v;
  return coalesce(v,0);
end $$;

create or replace function public.increment_paste_view(p_slug text)
returns bigint language plpgsql security definer set search_path=public as $$
declare v bigint;
begin
  update pastelinks set views=views+1 where lower(slug)=lower(p_slug) returning views into v;
  return coalesce(v,0);
end $$;

-- ---------- WITHDRAW ----------
create or replace function public.request_withdrawal_v2(
  p_amount bigint,p_mode text,p_method text,p_account_name text,p_account_number text
)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare uid uuid:=auth.uid(); w public.wallets; wid uuid; ticket text;
begin
  if uid is null then raise exception 'Login diperlukan'; end if;
  if p_amount < 10000 then raise exception 'Minimum withdrawal Rp 10.000'; end if;
  if nullif(trim(p_method),'') is null or nullif(trim(p_account_name),'') is null or nullif(trim(p_account_number),'') is null then
    raise exception 'Data penarikan belum lengkap';
  end if;
  perform ensure_wallet(uid);
  select * into w from wallets where user_id=uid for update;
  if w.balance < p_amount then raise exception 'Saldo tidak mencukupi'; end if;
  update wallets set balance=balance-p_amount where user_id=uid;
  insert into withdrawals(user_id,amount,mode,method,account_name,account_number,status)
  values(uid,p_amount,coalesce(p_mode,'manual'),trim(p_method),trim(p_account_name),trim(p_account_number),'pending')
  returning id into wid;
  insert into transactions(user_id,type,direction,amount,status,reference_id,description)
  values(uid,'withdrawal','debit',p_amount,'pending',wid,'Withdrawal request');
  ticket:='TC-WD-'||upper(substr(replace(wid::text,'-',''),1,10));
  return jsonb_build_object('ok',true,'withdrawal_id',wid,'ticket',ticket);
end $$;

-- ---------- MATURED SALES ----------
create or replace function public.release_matured_sales()
returns integer language plpgsql security definer set search_path=public
as $$
declare r record; moved int:=0; net bigint; fee bigint;
begin
  for r in
    select pu.id,pu.product_id,pu.buyer_id,pu.amount,p.creator_id
    from purchases pu join products p on p.id=pu.product_id
    where pu.status='paid' and pu.paid_at is not null
      and pu.paid_at <= now()-interval '24 hours'
      and not exists(select 1 from transactions t where t.reference_id=pu.id and t.type='sale' and t.status='success')
  loop
    fee:=floor(r.amount*0.20); net:=greatest(0,r.amount-fee);
    perform ensure_wallet(r.creator_id);
    update wallets set pending_balance=greatest(0,pending_balance-r.amount),balance=balance+net where user_id=r.creator_id;
    update transactions set amount=net,status='success',description='Sale released after 24h (20% fee)'
      where reference_id=r.id and user_id=r.creator_id and type='sale';
    if not found then
      insert into transactions(user_id,type,direction,amount,status,reference_id,description)
      values(r.creator_id,'sale','credit',net,'success',r.id,'Marketplace sale after 20% fee');
    end if;
    if fee>0 and not exists(select 1 from transactions t where t.reference_id=r.id and t.type='fee') then
      insert into transactions(user_id,type,direction,amount,status,reference_id,description)
      values(r.creator_id,'fee','debit',fee,'success',r.id,'Marketplace fee');
    end if;
    moved:=moved+1;
  end loop;
  return moved;
end $$;


-- ---------- TELECOD ACTIVITY / NOTIFICATIONS ----------
create table if not exists public.telecod_activity (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  title text not null,
  message text,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists telecod_activity_owner_idx on public.telecod_activity(owner_id,created_at desc);

alter table public.telecod_activity enable row level security;
drop policy if exists telecod_activity_owner_select on public.telecod_activity;
create policy telecod_activity_owner_select on public.telecod_activity for select using (owner_id=auth.uid() or is_admin());
grant select on public.telecod_activity to authenticated;

create or replace function public.telecod_log_product_activity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.telecod_activity(owner_id,actor_id,event_type,title,message,product_id)
  values(new.creator_id,auth.uid(),case when new.type='code' then 'add_code' else 'add_channel' end,
    case when new.type='code' then 'Code ditambahkan' else 'Channel ditambahkan' end,
    coalesce(new.title,'Produk')||' berhasil ditambahkan ke marketplace.',new.id);
  return new;
end $$;
drop trigger if exists products_activity_trigger on public.products;
create trigger products_activity_trigger after insert on public.products for each row execute function public.telecod_log_product_activity();

create or replace function public.telecod_log_purchase_activity()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; ptype text; ptitle text;
begin
  if new.status='paid' and (tg_op='INSERT' or old.status is distinct from new.status) then
    select creator_id,type,title into owner,ptype,ptitle from public.products where id=new.product_id;
    if owner is not null then
      insert into public.telecod_activity(owner_id,actor_id,event_type,title,message,product_id)
      values(owner,new.buyer_id,case when ptype='code' then 'buy_code' else 'join_channel' end,
        case when ptype='code' then 'Code dibeli' else 'Member bergabung / mendapat akses' end,
        coalesce(ptitle,'Produk')||case when ptype='code' then ' berhasil dibeli.' else ' mendapatkan akses channel.' end,new.product_id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists purchases_activity_trigger on public.purchases;
create trigger purchases_activity_trigger after insert or update of status on public.purchases for each row execute function public.telecod_log_purchase_activity();

-- Extend the existing view RPC so opening a code/channel creates an owner notification.
create or replace function public.increment_product_view(p_product uuid,p_viewer_hash text default null)
returns bigint language plpgsql security definer set search_path=public as $$
declare v bigint; owner uuid; ptitle text; ptype text;
begin
  update products set views=views+1 where id=p_product and status='published' returning views,creator_id,title,type into v,owner,ptitle,ptype;
  if owner is not null and owner is distinct from auth.uid() then
    insert into public.telecod_activity(owner_id,actor_id,event_type,title,message,product_id)
    values(owner,auth.uid(),'view',case when ptype='code' then 'Code dibuka' else 'Channel dibuka' end,
      coalesce(ptitle,'Produk')||' baru saja dibuka.',p_product);
  end if;
  return coalesce(v,0);
end $$;

-- ---------- ADMIN STATS ----------
create or replace function public.admin_stats()
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from profiles where id=auth.uid() and is_admin and not is_banned) then raise exception 'Admin only'; end if;
  return jsonb_build_object(
    'users',(select count(*) from profiles),
    'products',(select count(*) from products),
    'pastes',(select count(*) from pastelinks),
    'pending_payments',(select count(*) from payments where status='pending'),
    'pending_withdrawals',(select count(*) from withdrawals where status='pending'),
    'paid_payments',(select count(*) from payments where status='paid'),
    'revenue',(select coalesce(sum(amount),0) from payments where status='paid' and kind='purchase')
  );
end $$;

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table wallets enable row level security;
alter table products enable row level security;
alter table purchases enable row level security;
alter table payments enable row level security;
alter table transactions enable row level security;
alter table withdrawals enable row level security;
alter table pastelinks enable row level security;
alter table site_stats enable row level security;
alter table admin_logs enable row level security;

-- Helper for admin policies.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from profiles where id=auth.uid() and is_admin=true and is_banned=false) $$;

drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles for select using (id=auth.uid() or is_admin());
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update using (id=auth.uid() or is_admin()) with check (id=auth.uid() or is_admin());

drop policy if exists wallets_self_select on wallets;
create policy wallets_self_select on wallets for select using (user_id=auth.uid() or is_admin());

drop policy if exists products_public_select on products;
create policy products_public_select on products for select using (status='published' or creator_id=auth.uid() or is_admin());
drop policy if exists products_creator_insert on products;
create policy products_creator_insert on products for insert with check (creator_id=auth.uid() or is_admin());
drop policy if exists products_creator_update on products;
create policy products_creator_update on products for update using (creator_id=auth.uid() or is_admin()) with check (creator_id=auth.uid() or is_admin());
drop policy if exists products_creator_delete on products;
create policy products_creator_delete on products for delete using (creator_id=auth.uid() or is_admin());

drop policy if exists purchases_self_select on purchases;
create policy purchases_self_select on purchases for select using (buyer_id=auth.uid() or is_admin());
drop policy if exists purchases_self_insert on purchases;
create policy purchases_self_insert on purchases for insert with check (buyer_id=auth.uid() or (buyer_id is null and guest_token is not null) or is_admin());

drop policy if exists payments_self_select on payments;
create policy payments_self_select on payments for select using (user_id=auth.uid() or is_admin());

drop policy if exists transactions_self_select on transactions;
create policy transactions_self_select on transactions for select using (user_id=auth.uid() or is_admin());

drop policy if exists withdrawals_self_select on withdrawals;
create policy withdrawals_self_select on withdrawals for select using (user_id=auth.uid() or is_admin());

drop policy if exists pastelinks_public_select on pastelinks;
create policy pastelinks_public_select on pastelinks for select using (visibility='public' or user_id=auth.uid() or is_admin());
drop policy if exists pastelinks_insert on pastelinks;
create policy pastelinks_insert on pastelinks for insert with check (anonymous=true or user_id=auth.uid() or is_admin());
drop policy if exists pastelinks_update on pastelinks;
create policy pastelinks_update on pastelinks for update using (user_id=auth.uid() or is_admin()) with check (user_id=auth.uid() or is_admin());

drop policy if exists site_stats_admin on site_stats;
create policy site_stats_admin on site_stats for all using (is_admin()) with check (is_admin());
drop policy if exists admin_logs_admin on admin_logs;
create policy admin_logs_admin on admin_logs for all using (is_admin()) with check (is_admin());

-- The public view is intended to expose only published products.
grant select on public.marketplace_public to anon,authenticated;
grant select,insert,update,delete on public.pastelinks to anon,authenticated;
grant select on public.products to anon,authenticated;
grant select on public.profiles,public.wallets,public.purchases,public.payments,public.transactions,public.withdrawals,public.site_stats,public.admin_logs to authenticated;

grant execute on function public.ensure_wallet(uuid) to authenticated,service_role;
grant execute on function public.resolve_username_login(text) to anon,authenticated,service_role;
grant execute on function public.lookup_user_by_email(text) to anon,authenticated,service_role;
grant execute on function public.marketplace_submit_product(text,text,text,bigint,text,text,text,text,text,text) to authenticated;
grant execute on function public.complete_free_purchase(uuid) to authenticated;
grant execute on function public.complete_free_purchase(uuid) to authenticated;
grant execute on function public.increment_paste_view(text) to anon,authenticated;
grant execute on function public.request_withdrawal_v2(bigint,text,text,text,text) to authenticated;
grant execute on function public.release_matured_sales() to service_role;
grant execute on function public.admin_stats() to authenticated;

-- ---------- DEFAULT SITE STATS ----------
insert into site_stats(key,value,label) values
('users',0,'Pengguna'),
('products',0,'Produk'),
('pastes',0,'Pastelink'),
('views',0,'Views')
on conflict(key) do nothing;

-- ---------- ADMIN BOOTSTRAP ----------
-- IMPORTANT: after registering your admin account, run:
-- update public.profiles set is_admin=true where username='USERNAME_ADMIN';
-- Never hard-code an admin password in this SQL file.
-- =========================================================
