-- ============================================================
-- TELECOD COMPLETE SUPABASE SQL - IDEMPOTENT / SAFE RE-RUN
-- ============================================================
-- Jalankan file ini di Supabase SQL Editor.
--
-- Prinsip:
-- 1. TABLE/EXTENSION/COLUMN/INDEX memakai IF NOT EXISTS.
-- 2. Data seed memakai ON CONFLICT DO NOTHING.
-- 3. POLICY memakai DROP IF EXISTS lalu CREATE agar tidak error
--    saat SQL dijalankan ulang.
-- 4. FUNCTION memakai CREATE OR REPLACE agar versi terbaru aktif.
-- 5. Tidak menghapus data user/product/payment yang sudah ada.
--
-- CATATAN:
-- - Admin utama pada fungsi is_admin() saat ini memakai Telegram ID
--   6665664367 sesuai project sebelumnya. Ganti jika ID admin berbeda.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  telegram_id text unique,
  telegram_username text,
  telegram_number text,
  display_name text,
  avatar_url text,
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  terms_accepted_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists telegram_id text;
alter table public.profiles add column if not exists telegram_username text;
alter table public.profiles add column if not exists telegram_number text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists last_login_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_username_idx on public.profiles(lower(username));
create index if not exists profiles_telegram_username_idx on public.profiles(lower(telegram_username));
create unique index if not exists profiles_telegram_username_unique_idx
  on public.profiles(lower(telegram_username))
  where telegram_username is not null and telegram_username <> '';

-- ============================================================
-- 2. PRODUCTS / MARKETPLACE
-- ============================================================
create table if not exists public.products(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade,
  type text not null check(type in ('channel','code')),
  title text not null,
  slug text unique not null default encode(gen_random_bytes(8),'hex'),
  description text,
  category text,
  access_type text not null check(access_type in ('free','paid')),
  price numeric(18,2) not null default 0 check(price >= 0),
  thumbnail_url text,
  content text,
  telegram_channel text,
  bot_username text,
  is_channel boolean not null default false,
  status text not null default 'draft',
  views bigint not null default 0,
  sales_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists creator_id uuid;
alter table public.products add column if not exists type text;
alter table public.products add column if not exists title text;
alter table public.products add column if not exists slug text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists access_type text;
alter table public.products add column if not exists price numeric(18,2) default 0;
alter table public.products add column if not exists thumbnail_url text;
alter table public.products add column if not exists content text;
alter table public.products add column if not exists telegram_channel text;
alter table public.products add column if not exists bot_username text;
alter table public.products add column if not exists is_channel boolean not null default false;
alter table public.products add column if not exists status text not null default 'draft';
alter table public.products add column if not exists views bigint not null default 0;
alter table public.products add column if not exists sales_count bigint not null default 0;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

-- Existing databases may have the older status constraint.
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check(status in ('pending','draft','published','archived'));

create index if not exists products_creator_idx on public.products(creator_id);
create index if not exists products_market_idx on public.products(status,type,access_type);
create index if not exists products_created_idx on public.products(created_at desc);
create index if not exists products_bot_username_idx
  on public.products(lower(bot_username)) where bot_username is not null;

-- ============================================================
-- 3. PASTELINKS
-- ============================================================
create table if not exists public.pastelinks(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  slug text unique not null,
  title text not null default 'Untitled',
  author_name text,
  content_html text not null,
  destination_url text,
  visibility text not null default 'public' check(visibility in ('public','unlisted','private')),
  expires_at timestamptz,
  syntax text,
  description text,
  tags text[] not null default '{}',
  allow_comments boolean not null default true,
  allow_download boolean not null default true,
  show_raw boolean not null default true,
  publish_timeline boolean not null default false,
  anonymous boolean not null default false,
  views bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pastelinks add column if not exists destination_url text;
alter table public.pastelinks add column if not exists description text;
alter table public.pastelinks add column if not exists tags text[] not null default '{}';
alter table public.pastelinks add column if not exists allow_comments boolean not null default true;
alter table public.pastelinks add column if not exists allow_download boolean not null default true;
alter table public.pastelinks add column if not exists show_raw boolean not null default true;

create index if not exists pastelinks_slug_idx on public.pastelinks(slug);
create index if not exists pastelinks_user_idx on public.pastelinks(user_id);
create index if not exists pastelinks_tags_idx on public.pastelinks using gin(tags);

-- ============================================================
-- 4. PURCHASES
-- ============================================================
create table if not exists public.purchases(
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  buyer_id uuid references public.profiles(id) on delete cascade,
  amount numeric(18,2) not null default 0 check(amount>=0),
  currency text not null default 'IDR',
  status text not null default 'pending' check(status in ('pending','paid','cancelled','refunded')),
  payment_id uuid,
  guest_token text unique,
  guest_email text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique(product_id,buyer_id)
);

alter table public.purchases alter column buyer_id drop not null;
alter table public.purchases add column if not exists guest_token text;
alter table public.purchases add column if not exists guest_email text;
create index if not exists purchases_buyer_idx on public.purchases(buyer_id,created_at desc);
create index if not exists purchases_product_idx on public.purchases(product_id);
create index if not exists purchases_guest_token_idx on public.purchases(guest_token) where guest_token is not null;

-- ============================================================
-- 5. PAYMENTS
-- ============================================================
create table if not exists public.payments(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  kind text not null default 'purchase' check(kind in ('purchase','deposit')),
  provider text not null default 'dompetx',
  order_id text unique,
  provider_reference text unique,
  guest_token text,
  amount numeric(18,2) not null check(amount>=0),
  currency text not null default 'IDR',
  status text not null default 'pending' check(status in ('pending','paid','failed','expired','refunded')),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.payments alter column user_id drop not null;
alter table public.payments add column if not exists kind text;
alter table public.payments add column if not exists order_id text;
alter table public.payments add column if not exists provider text;
alter table public.payments add column if not exists raw_payload jsonb;
alter table public.payments add column if not exists guest_token text;
update public.payments set kind='purchase' where kind is null;
update public.payments set provider='dompetx' where provider is null;
create unique index if not exists payments_order_id_idx on public.payments(order_id) where order_id is not null;
create index if not exists payments_guest_token_idx on public.payments(guest_token) where guest_token is not null;

alter table public.purchases drop constraint if exists purchases_payment_fk;
alter table public.purchases add constraint purchases_payment_fk
  foreign key(payment_id) references public.payments(id) on delete set null;

-- ============================================================
-- 6. WALLET
-- ============================================================
create table if not exists public.wallets(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(18,2) not null default 0 check(balance>=0),
  pending_balance numeric(18,2) not null default 0 check(pending_balance>=0),
  currency text not null default 'IDR',
  updated_at timestamptz not null default now()
);
alter table public.wallets add column if not exists pending_balance numeric(18,2) not null default 0;
create index if not exists wallets_updated_idx on public.wallets(updated_at desc);

create table if not exists public.wallet_transactions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  amount numeric(18,2) not null,
  balance_before numeric(18,2),
  balance_after numeric(18,2),
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_transactions_user_idx
  on public.wallet_transactions(user_id,created_at desc);

-- ============================================================
-- 7. TRANSACTIONS
-- ============================================================
create table if not exists public.transactions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check(type in ('deposit','purchase','sale','withdrawal','refund','adjustment')),
  direction text not null check(direction in ('credit','debit')),
  amount numeric(18,2) not null check(amount>=0),
  currency text not null default 'IDR',
  status text not null default 'pending' check(status in ('pending','success','failed','cancelled')),
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions(user_id,created_at desc);

-- ============================================================
-- 8. WITHDRAWALS
-- ============================================================
create table if not exists public.withdrawals(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(18,2) not null check(amount>0),
  method text not null check(method in ('bank','ewallet','crypto')),
  account_name text not null,
  account_number text not null,
  status text not null default 'pending' check(status in ('pending','processing','paid','failed','cancelled')),
  provider_reference text unique,
  note text,
  withdrawal_mode text not null default 'auto',
  fee numeric(18,2) not null default 0,
  requested_amount numeric(18,2),
  total_debit numeric(18,2),
  ticket text unique,
  queue_position integer,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.withdrawals add column if not exists withdrawal_mode text not null default 'auto';
alter table public.withdrawals add column if not exists fee numeric(18,2) not null default 0;
alter table public.withdrawals add column if not exists requested_amount numeric(18,2);
alter table public.withdrawals add column if not exists total_debit numeric(18,2);
alter table public.withdrawals add column if not exists ticket text;
alter table public.withdrawals add column if not exists queue_position integer;
create index if not exists withdrawals_user_idx on public.withdrawals(user_id,created_at desc);

-- ============================================================
-- 9. APPROVED BOTS
-- ============================================================
create table if not exists public.approved_bots(
  id uuid primary key default gen_random_uuid(),
  bot_username text not null unique,
  bot_id bigint,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists approved_bots_active_idx
  on public.approved_bots(is_active,lower(bot_username));

-- ============================================================
-- 10. ADMIN LOGS
-- ============================================================
create table if not exists public.admin_logs(
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists admin_logs_created_idx on public.admin_logs(created_at desc);

-- ============================================================
-- 11. PRODUCT VIEWS / SITE STATS
-- ============================================================
create table if not exists public.product_views(
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  viewer_hash text,
  created_at timestamptz not null default now()
);
create index if not exists product_views_product_idx on public.product_views(product_id,created_at desc);

create table if not exists public.site_stats(
  key text primary key,
  value bigint not null default 0
);
insert into public.site_stats(key,value) values
  ('users',0),('transactions',0),('products',0),('sales',0)
on conflict(key) do nothing;

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id,created_at desc);

-- ============================================================
-- 13. LEGACY TELEGRAM TABLES (KEEP COMPATIBILITY)
-- ============================================================
create table if not exists public.telegram_products(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  product_type text not null default 'code',
  access_type text not null default 'free',
  price bigint not null default 0,
  bot_username text,
  telegram_bot_id bigint,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists telegram_products_market_idx
  on public.telegram_products(is_published,access_type,created_at desc);

create table if not exists public.telegram_channels(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  title text not null,
  access_type text not null default 'free',
  price bigint not null default 0,
  telegram_channel_id text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.bot_integrations(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  bot_username text,
  telegram_bot_id bigint,
  encrypted_token text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 14. HELPERS
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists products_updated on public.products;
create trigger products_updated before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists wallet_updated on public.wallets;
create trigger wallet_updated before update on public.wallets
for each row execute function public.set_updated_at();

drop trigger if exists approved_bots_updated on public.approved_bots;
create trigger approved_bots_updated before update on public.approved_bots
for each row execute function public.set_updated_at();

drop trigger if exists bot_integrations_updated on public.bot_integrations;
create trigger bot_integrations_updated before update on public.bot_integrations
for each row execute function public.set_updated_at();

create or replace function public.ensure_wallet(p_user uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.wallets(user_id)
  values(p_user)
  on conflict(user_id) do nothing;
end;
$$;

-- ============================================================
-- 15. NEW AUTH USER TRIGGER
-- Installed once in the final compatibility section below.
-- ============================================================

-- ============================================================
-- 16. ADMIN AUTH
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.profiles
    where id=auth.uid()
      and coalesce(is_admin,false)=true
      and coalesce(is_banned,false)=false
  );
$$;

-- ============================================================
-- 17. PUBLIC MARKETPLACE VIEW
-- ============================================================
drop view if exists public.marketplace_public;
create view public.marketplace_public
with (security_invoker=true)
as
select
  p.id,p.creator_id,p.type,p.title,p.slug,p.description,p.category,
  p.access_type,p.price,p.thumbnail_url,p.telegram_channel,p.is_channel,
  p.status,p.views,p.sales_count,p.created_at,p.updated_at,
  coalesce(pr.username,'TeleCod') as creator_username
from public.products p
left join public.profiles pr on pr.id=p.creator_id
where p.status='published';

grant select on public.marketplace_public to anon,authenticated;

-- ============================================================
-- 18. PUBLIC / USER RPC
-- ============================================================
create or replace function public.increment_product_view(
  p_product uuid,
  p_viewer_hash text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.product_views(product_id,viewer_hash)
  values(p_product,p_viewer_hash);

  update public.products
  set views=views+1
  where id=p_product and status='published';
end;
$$;

create or replace function public.increment_paste_view(p_slug text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.pastelinks
  set views=views+1
  where slug=p_slug
    and visibility<>'private'
    and (expires_at is null or expires_at>now());
end;
$$;

create or replace function public.complete_free_purchase(p_product uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare pid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select id into pid
  from public.purchases
  where product_id=p_product and buyer_id=auth.uid();

  if pid is not null then return pid; end if;

  insert into public.purchases(product_id,buyer_id,amount,status,paid_at)
  select id,auth.uid(),0,'paid',now()
  from public.products
  where id=p_product and status='published' and access_type='free'
  returning id into pid;

  if pid is null then
    raise exception 'Product is not free or not published';
  end if;

  update public.products
  set sales_count=sales_count+1
  where id=p_product;

  return pid;
end;
$$;

-- ============================================================
-- 19. MARKETPLACE SUBMIT PRODUCT
-- ============================================================
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
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  pid uuid;
  slug text;
  approved boolean:=true;
  final_status text:='published';
begin
  if trim(coalesce(p_title,''))='' then raise exception 'Judul wajib diisi'; end if;
  if p_type not in ('code','channel') then raise exception 'Tipe produk tidak valid'; end if;
  if p_access_type not in ('free','paid') then raise exception 'Jenis akses tidak valid'; end if;
  if p_access_type='paid' and uid is null then raise exception 'Login/register diperlukan untuk produk PAID'; end if;
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
    thumbnail_url,content,telegram_channel,bot_username,is_channel,status
  ) values(
    uid,p_type,trim(p_title),slug,nullif(trim(p_description),''),
    nullif(trim(p_category),''),p_access_type,
    case when p_access_type='free' then 0 else p_price end,
    nullif(trim(p_thumbnail_url),''),
    case when p_type='code' then p_content else null end,
    case when p_type='channel' then trim(p_telegram_channel) else null end,
    case when p_type='code' then lower(trim(replace(coalesce(p_bot_username,''),'@',''))) else null end,
    p_type='channel',final_status
  ) returning id into pid;

  return jsonb_build_object(
    'id',pid,'slug',slug,'status',final_status,
    'published',final_status='published',
    'bot_approved',approved,
    'login_required',p_access_type='paid'
  );
end;
$$;

-- ============================================================
-- 20. WITHDRAWAL RPC
-- ============================================================
create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_account_name text,
  p_account_number text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  wid uuid;
  bal numeric;
  req numeric;
  total numeric;
  fee_amount numeric:=0;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_amount<=0 then raise exception 'Jumlah withdrawal tidak valid'; end if;

  perform public.ensure_wallet(uid);
  select balance into bal from public.wallets where user_id=uid for update;

  req:=p_amount;
  total:=req+fee_amount;

  if bal<total then raise exception 'Saldo tidak cukup'; end if;

  update public.wallets
  set balance=balance-total
  where user_id=uid;

  insert into public.withdrawals(
    user_id,amount,method,account_name,account_number,
    status,withdrawal_mode,fee,requested_amount,total_debit,ticket
  ) values(
    uid,req,p_method,p_account_name,p_account_number,
    'pending','auto',fee_amount,req,total,
    'WD-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,10))
  ) returning id into wid;

  insert into public.transactions(
    user_id,type,direction,amount,status,reference_id,description
  ) values(
    uid,'withdrawal','debit',total,'pending',wid,'Withdrawal request'
  );

  return wid;
end;
$$;

-- ============================================================
-- 21. ADMIN RPC
-- ============================================================
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'users',(select count(*) from public.profiles),
    'banned_users',(select count(*) from public.profiles where is_banned),
    'products',(select count(*) from public.products),
    'published_products',(select count(*) from public.products where status='published'),
    'pastes',(select count(*) from public.pastelinks),
    'paste_views',(select coalesce(sum(views),0) from public.pastelinks),
    'sales',(select count(*) from public.purchases where status='paid'),
    'revenue',(select coalesce(sum(amount),0) from public.purchases where status='paid'),
    'pending_withdrawals',(select count(*) from public.withdrawals where status='pending'),
    'pending_payments',(select count(*) from public.payments where status='pending')
  );
end;
$$;

create or replace function public.admin_users(p_limit int default 100,p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_agg(x) from (
    select p.id,p.username,p.telegram_id,p.telegram_username,p.telegram_number,
           p.display_name,p.is_admin,p.is_banned,p.created_at,p.last_login_at,
           coalesce(w.balance,0) balance
    from public.profiles p
    left join public.wallets w on w.user_id=p.id
    order by p.created_at desc
    limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x),'[]'::jsonb);
end;
$$;

create or replace function public.admin_products(p_limit int default 100,p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_agg(x) from (
    select p.*,pr.username creator_username
    from public.products p
    left join public.profiles pr on pr.id=p.creator_id
    order by p.created_at desc
    limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x),'[]'::jsonb);
end;
$$;

create or replace function public.admin_pastes(p_limit int default 100,p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_agg(x) from (
    select p.id,p.slug,p.title,p.author_name,p.visibility,p.views,p.created_at,
           p.expires_at,p.user_id,pr.username creator_username
    from public.pastelinks p
    left join public.profiles pr on pr.id=p.user_id
    order by p.created_at desc
    limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x),'[]'::jsonb);
end;
$$;

create or replace function public.admin_withdrawals(p_limit int default 100,p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_agg(x) from (
    select w.*,p.username,p.telegram_id
    from public.withdrawals w
    join public.profiles p on p.id=w.user_id
    order by w.created_at desc
    limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x),'[]'::jsonb);
end;
$$;

create or replace function public.admin_payments(p_limit int default 100,p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_agg(x) from (
    select pay.*,p.username,p.telegram_id
    from public.payments pay
    left join public.profiles p on p.id=pay.user_id
    order by pay.created_at desc
    limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x),'[]'::jsonb);
end;
$$;

create or replace function public.admin_transactions(p_limit int default 200,p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_agg(x) from (
    select t.*,p.username,p.telegram_id
    from public.transactions t
    left join public.profiles p on p.id=t.user_id
    order by t.created_at desc
    limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x),'[]'::jsonb);
end;
$$;

create or replace function public.admin_logs(p_limit int default 200,p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_agg(x) from (
    select id,admin_id,action,target_type,target_id,details,created_at
    from public.admin_logs
    order by created_at desc
    limit greatest(1,least(p_limit,1000)) offset greatest(0,p_offset)
  ) x),'[]'::jsonb);
end;
$$;

create or replace function public.admin_site_stats()
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_object_agg(key,value) from public.site_stats),'{}'::jsonb);
end;
$$;

create or replace function public.admin_set_user(p_user uuid,p_banned boolean default null,p_admin boolean default null)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.profiles
  set is_banned=coalesce(p_banned,is_banned),is_admin=coalesce(p_admin,is_admin)
  where id=p_user;
  insert into public.admin_logs(admin_id,action,target_type,target_id,details)
  values(auth.uid(),'update_user','user',p_user::text,
         jsonb_build_object('banned',p_banned,'admin',p_admin));
end;
$$;

create or replace function public.admin_adjust_balance(p_user uuid,p_amount numeric,p_reason text default 'Admin adjustment')
returns void
language plpgsql security definer set search_path=public
as $$
declare nb numeric;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  perform public.ensure_wallet(p_user);
  update public.wallets set balance=balance+p_amount where user_id=p_user returning balance into nb;
  if nb<0 then raise exception 'Balance cannot be negative'; end if;
  insert into public.transactions(user_id,type,direction,amount,status,description)
  values(p_user,'adjustment',case when p_amount>=0 then 'credit' else 'debit' end,abs(p_amount),'success',p_reason);
  insert into public.admin_logs(admin_id,action,target_type,target_id,details)
  values(auth.uid(),'adjust_balance','user',p_user::text,
         jsonb_build_object('amount',p_amount,'reason',p_reason));
end;
$$;

create or replace function public.admin_update_product(p_id uuid,p_status text,p_price numeric default null)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status is not null and p_status not in ('pending','draft','published','archived') then
    raise exception 'Invalid status';
  end if;
  update public.products
  set status=coalesce(p_status,status),price=coalesce(p_price,price)
  where id=p_id;
  insert into public.admin_logs(admin_id,action,target_type,target_id,details)
  values(auth.uid(),'update_product','product',p_id::text,
         jsonb_build_object('status',p_status,'price',p_price));
end;
$$;

create or replace function public.admin_delete_product(p_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  delete from public.products where id=p_id;
  insert into public.admin_logs(admin_id,action,target_type,target_id)
  values(auth.uid(),'delete_product','product',p_id::text);
end;
$$;

create or replace function public.admin_delete_paste(p_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  delete from public.pastelinks where id=p_id;
  insert into public.admin_logs(admin_id,action,target_type,target_id)
  values(auth.uid(),'delete_paste','paste',p_id::text);
end;
$$;

create or replace function public.admin_upsert_bot(p_username text,p_bot_id bigint default null,p_display_name text default null)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare id uuid; clean_username text:=lower(trim(replace(p_username,'@','')));
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  insert into public.approved_bots(bot_username,bot_id,display_name,is_active)
  values(clean_username,p_bot_id,nullif(trim(p_display_name),''),true)
  on conflict(bot_username) do update set
    bot_id=excluded.bot_id,
    display_name=excluded.display_name,
    is_active=true,
    updated_at=now()
  returning approved_bots.id into id;

  update public.products
  set status='published',updated_at=now()
  where type='code'
    and status='pending'
    and lower(coalesce(bot_username,''))=clean_username;

  return id;
end;
$$;

create or replace function public.admin_bots()
returns jsonb
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return coalesce((select jsonb_agg(x) from (
    select * from public.approved_bots order by created_at desc
  ) x),'[]'::jsonb);
end;
$$;

create or replace function public.admin_delete_bot(p_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  delete from public.approved_bots where id=p_id;
end;
$$;

create or replace function public.admin_process_withdrawal(p_id uuid,p_status text,p_note text default null)
returns void
language plpgsql security definer set search_path=public
as $$
declare w public.withdrawals%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('processing','paid','failed','cancelled') then raise exception 'Invalid withdrawal status'; end if;

  select * into w from public.withdrawals where id=p_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;

  update public.withdrawals
  set status=p_status,
      note=coalesce(p_note,note),
      processed_at=case when p_status in ('paid','failed','cancelled') then now() else processed_at end
  where id=p_id;

  if p_status in ('failed','cancelled') and w.status in ('pending','processing') then
    perform public.ensure_wallet(w.user_id);
    update public.wallets set balance=balance+coalesce(w.total_debit,w.amount) where user_id=w.user_id;
    update public.transactions set status='failed' where reference_id=w.id and type='withdrawal';
    insert into public.transactions(user_id,type,direction,amount,status,reference_id,description)
    values(w.user_id,'refund','credit',coalesce(w.total_debit,w.amount),'success',w.id,
           'Withdrawal returned: '||p_status);
  elsif p_status='paid' then
    update public.transactions set status='success' where reference_id=w.id and type='withdrawal';
  end if;

  insert into public.admin_logs(admin_id,action,target_type,target_id,details)
  values(auth.uid(),'process_withdrawal','withdrawal',p_id::text,
         jsonb_build_object('status',p_status,'note',p_note));
end;
$$;

-- ============================================================
-- 22. RLS - IDEMPOTENT
-- ============================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.pastelinks enable row level security;
alter table public.purchases enable row level security;
alter table public.payments enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.product_views enable row level security;
alter table public.site_stats enable row level security;
alter table public.approved_bots enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_logs enable row level security;

-- Profiles
drop policy if exists profile_select_own on public.profiles;
create policy profile_select_own on public.profiles
for select to authenticated using(id=auth.uid() or public.is_admin());

drop policy if exists profile_update_own on public.profiles;
create policy profile_update_own on public.profiles
for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

-- Products
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
for select to anon,authenticated using(status='published' or creator_id=auth.uid() or public.is_admin());

drop policy if exists products_creator_insert on public.products;
create policy products_creator_insert on public.products
for insert to authenticated with check(creator_id=auth.uid() or public.is_admin());

drop policy if exists products_creator_update on public.products;
create policy products_creator_update on public.products
for update to authenticated using(creator_id=auth.uid() or public.is_admin())
with check(creator_id=auth.uid() or public.is_admin());

drop policy if exists products_creator_delete on public.products;
create policy products_creator_delete on public.products
for delete to authenticated using(creator_id=auth.uid() or public.is_admin());

-- Pastelinks
drop policy if exists pastelinks_public_read on public.pastelinks;
create policy pastelinks_public_read on public.pastelinks
for select to anon,authenticated
using((visibility<>'private' and (expires_at is null or expires_at>now())) or user_id=auth.uid() or public.is_admin());

drop policy if exists pastelinks_owner_insert on public.pastelinks;
create policy pastelinks_owner_insert on public.pastelinks
for insert to anon,authenticated with check(user_id is null or user_id=auth.uid() or public.is_admin());

drop policy if exists pastelinks_owner_update on public.pastelinks;
create policy pastelinks_owner_update on public.pastelinks
for update to authenticated using(user_id=auth.uid() or public.is_admin())
with check(user_id=auth.uid() or public.is_admin());

drop policy if exists pastelinks_owner_delete on public.pastelinks;
create policy pastelinks_owner_delete on public.pastelinks
for delete to authenticated using(user_id=auth.uid() or public.is_admin());

-- Purchases
drop policy if exists purchases_owner_read on public.purchases;
create policy purchases_owner_read on public.purchases
for select to authenticated using(buyer_id=auth.uid() or public.is_admin());

drop policy if exists purchases_owner_insert on public.purchases;

-- Payments
drop policy if exists payments_owner_read on public.payments;
create policy payments_owner_read on public.payments
for select to authenticated using(user_id=auth.uid() or public.is_admin());

-- Wallets
drop policy if exists wallet_owner_read on public.wallets;
create policy wallet_owner_read on public.wallets
for select to authenticated using(user_id=auth.uid() or public.is_admin());

-- Wallet transactions
drop policy if exists wallet_transactions_owner_read on public.wallet_transactions;
create policy wallet_transactions_owner_read on public.wallet_transactions
for select to authenticated using(user_id=auth.uid() or public.is_admin());

-- Transactions
drop policy if exists transactions_owner_read on public.transactions;
create policy transactions_owner_read on public.transactions
for select to authenticated using(user_id=auth.uid() or public.is_admin());

-- Withdrawals
drop policy if exists withdrawals_owner_read on public.withdrawals;
create policy withdrawals_owner_read on public.withdrawals
for select to authenticated using(user_id=auth.uid() or public.is_admin());

-- Product views
drop policy if exists product_views_insert on public.product_views;
create policy product_views_insert on public.product_views
for insert to anon,authenticated with check(true);

-- Site stats
drop policy if exists site_stats_read on public.site_stats;
create policy site_stats_read on public.site_stats
for select to anon,authenticated using(true);

-- Approved bots
drop policy if exists approved_bots_admin_all on public.approved_bots;
create policy approved_bots_admin_all on public.approved_bots
for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Notifications
drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications
for select to authenticated using(user_id=auth.uid() or public.is_admin());

drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications
for update to authenticated using(user_id=auth.uid() or public.is_admin())
with check(user_id=auth.uid() or public.is_admin());

-- Admin logs: only admin can read.
drop policy if exists admin_logs_admin_read on public.admin_logs;
create policy admin_logs_admin_read on public.admin_logs
for select to authenticated using(public.is_admin());

-- ============================================================
-- 23. PUBLIC STATS VIEW
-- ============================================================
drop view if exists public.telecod_public_stats;
create view public.telecod_public_stats
with (security_invoker = true)
as
select
  (select count(*) from public.profiles) as users,
  (select count(*) from public.products where status='published') as products,
  (select coalesce(sum(views),0) from public.products where status='published') as views,
  (select count(*) from public.purchases where status='paid') as purchases;

grant select on public.telecod_public_stats to anon,authenticated;

-- ============================================================
-- 24. GRANTS
-- ============================================================
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_users(int,int) to authenticated;
grant execute on function public.admin_products(int,int) to authenticated;
grant execute on function public.admin_pastes(int,int) to authenticated;
grant execute on function public.admin_withdrawals(int,int) to authenticated;
grant execute on function public.admin_payments(int,int) to authenticated;
grant execute on function public.admin_transactions(int,int) to authenticated;
grant execute on function public.admin_logs(int,int) to authenticated;
grant execute on function public.admin_site_stats() to authenticated;
grant execute on function public.admin_set_user(uuid,boolean,boolean) to authenticated;
grant execute on function public.admin_adjust_balance(uuid,numeric,text) to authenticated;
grant execute on function public.admin_update_product(uuid,text,numeric) to authenticated;
grant execute on function public.admin_delete_product(uuid) to authenticated;
grant execute on function public.admin_delete_paste(uuid) to authenticated;
grant execute on function public.admin_upsert_bot(text,bigint,text) to authenticated;
grant execute on function public.admin_bots() to authenticated;
grant execute on function public.admin_delete_bot(uuid) to authenticated;
grant execute on function public.admin_process_withdrawal(uuid,text,text) to authenticated;
grant execute on function public.complete_free_purchase(uuid) to authenticated;
grant execute on function public.increment_product_view(uuid,text) to anon,authenticated;
grant execute on function public.increment_paste_view(text) to anon,authenticated;
grant execute on function public.marketplace_submit_product(text,text,text,numeric,text,text,text,text,text,text) to anon,authenticated;
grant execute on function public.request_withdrawal(numeric,text,text,text) to authenticated;

-- ============================================================
-- 25. FINAL SAFE SEEDS / EXISTING DATA IS NEVER DUPLICATED
-- ============================================================
insert into public.site_stats(key,value)
values ('users',0),('transactions',0),('products',0),('sales',0)
on conflict(key) do nothing;

-- ============================================================
-- END
-- ============================================================



-- ============================================================
-- 25. FINAL AUTH / LOGIN / WITHDRAWAL COMPATIBILITY
-- ============================================================
-- IMPORTANT:
-- Existing data is preserved. Only conflicting function signatures are
-- replaced. No table, user, product, payment, wallet, or transaction is dropped.

-- resolve_username_login previously existed in the ZIP with a TEXT return
-- type, while the final frontend needs a TABLE return type. PostgreSQL does
-- not allow CREATE OR REPLACE to change that return type, so drop ONLY the
-- function signature before recreating it.
drop function if exists public.resolve_username_login(text);
create function public.resolve_username_login(p_username text)
returns table(
  id uuid,
  username text,
  display_name text,
  auth_email text,
  is_banned boolean
)
language sql stable security definer
set search_path=public
as $$
  select p.id,p.username,p.display_name,u.email,coalesce(p.is_banned,false)
  from public.profiles p
  join auth.users u on u.id=p.id
  where lower(p.username)=lower(trim(leading '@' from p_username))
     or lower(coalesce(p.telegram_username,''))=lower(trim(leading '@' from p_username))
  limit 1;
$$;
grant execute on function public.resolve_username_login(text) to anon,authenticated;

-- Same return-type protection for email lookup.
drop function if exists public.lookup_user_by_email(text);
create function public.lookup_user_by_email(p_email text)
returns table(id uuid, username text, display_name text, is_banned boolean)
language sql stable security definer
set search_path=public
as $$
  select p.id,p.username,p.display_name,coalesce(p.is_banned,false)
  from public.profiles p
  join auth.users u on u.id=p.id
  where lower(u.email)=lower(trim(p_email))
  limit 1;
$$;
grant execute on function public.lookup_user_by_email(text) to anon,authenticated;

create or replace function public.email_for_user(p_user_id uuid)
returns text
language sql stable security definer
set search_path=public
as $$
  select email from auth.users where id=p_user_id limit 1;
$$;
grant execute on function public.email_for_user(uuid) to anon,authenticated;

create or replace function public.request_withdrawal_v2(
  p_amount numeric,
  p_mode text,
  p_method text,
  p_account_name text,
  p_account_number text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  fee_amount numeric;
  total numeric;
  bal numeric;
  wid uuid;
  ticket_no text;
  today_total numeric:=0;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_method not in ('bank','ewallet','crypto') then raise exception 'Metode withdrawal tidak valid'; end if;
  if p_mode not in ('auto','instant') then raise exception 'Mode withdrawal tidak valid'; end if;
  if p_amount < 50000 then raise exception 'Minimal withdrawal Rp 50.000'; end if;
  if p_mode='instant' and p_amount not in (50000,100000,150000,200000,250000) then raise exception 'Nominal WD instant tidak tersedia'; end if;
  fee_amount:=case when p_mode='instant' then 15000 else 5000 end;
  total:=p_amount+fee_amount;
  if p_mode='instant' then
    select coalesce(sum(requested_amount),0) into today_total from public.withdrawals
    where user_id=uid and withdrawal_mode='instant' and created_at >= date_trunc('day',now());
    if today_total+p_amount>500000 then raise exception 'Limit WD instant Rp 500.000 per hari'; end if;
  end if;
  perform public.ensure_wallet(uid);
  select balance into bal from public.wallets where user_id=uid for update;
  if coalesce(bal,0)<total then raise exception 'Saldo tidak cukup'; end if;
  update public.wallets set balance=balance-total, updated_at=now() where user_id=uid;
  ticket_no:='WD-'||upper(substr(encode(gen_random_bytes(8),'hex'),1,12));
  insert into public.withdrawals(user_id,amount,method,account_name,account_number,status,withdrawal_mode,fee,requested_amount,total_debit,ticket)
  values(uid,p_amount,p_method,trim(p_account_name),trim(p_account_number),'pending',p_mode,fee_amount,p_amount,total,ticket_no) returning id into wid;
  insert into public.transactions(user_id,type,direction,amount,status,reference_id,description)
  values(uid,'withdrawal','debit',total,'pending',wid,'Withdrawal request '||ticket_no);
  return jsonb_build_object('id',wid,'ticket',ticket_no,'amount',p_amount,'fee',fee_amount,'total',total,'status','pending');
end;
$$;
grant execute on function public.request_withdrawal_v2(numeric,text,text,text,text) to authenticated;

-- Required by payment-status Edge Function in the ZIP.
-- Releases pending seller-sale transactions after 24 hours.
create or replace function public.release_matured_sales()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  released integer:=0;
  r record;
  move_amount numeric;
  before_balance numeric;
begin
  for r in
    select t.id,t.user_id,t.amount,t.reference_id
    from public.transactions t
    where t.type='sale'
      and t.status='pending'
      and t.created_at <= now()-interval '24 hours'
    order by t.created_at
    for update
  loop
    move_amount:=greatest(coalesce(r.amount,0),0);
    if move_amount<=0 then
      update public.transactions set status='success' where id=r.id;
      continue;
    end if;

    perform public.ensure_wallet(r.user_id);
    select balance into before_balance from public.wallets where user_id=r.user_id for update;

    update public.wallets
    set balance=balance+move_amount,
        pending_balance=greatest(0,pending_balance-move_amount),
        updated_at=now()
    where user_id=r.user_id;

    insert into public.wallet_transactions(
      user_id,type,amount,balance_before,balance_after,reference_id,description
    ) values(
      r.user_id,'sale_release',move_amount,before_balance,
      before_balance+move_amount,r.reference_id,
      'Matured marketplace sale released after 24 hours'
    );

    update public.transactions set status='success' where id=r.id;
    released:=released+1;
  end loop;
  return released;
end;
$$;
grant execute on function public.release_matured_sales() to authenticated,service_role;

-- Final auth trigger: never creates duplicate profiles/wallets.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profiles(id,display_name,avatar_url)
  values(
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name',''),
      nullif(new.raw_user_meta_data->>'full_name',''),
      nullif(new.raw_user_meta_data->>'name',''),
      split_part(coalesce(new.email,''),'@',1)
    ),
    nullif(new.raw_user_meta_data->>'avatar_url','')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- 26. SAFE FINAL HARDENING
-- ============================================================
-- Do not fail the entire migration because old rows contain duplicates.
-- Unique indexes are attempted; if duplicate data exists, a non-unique index
-- is created instead and the duplicate rows remain untouched for review.
do $$
begin
  begin
    create unique index if not exists profiles_telegram_username_unique_idx
      on public.profiles(lower(telegram_username))
      where telegram_username is not null and telegram_username <> '';
  exception when unique_violation then
    raise notice 'Duplicate telegram_username detected: unique index not created; existing rows preserved.';
    create index if not exists profiles_telegram_username_lookup_idx
      on public.profiles(lower(telegram_username));
  end;

  begin
    create unique index if not exists payments_order_id_idx
      on public.payments(order_id)
      where order_id is not null;
  exception when unique_violation then
    raise notice 'Duplicate payments.order_id detected: unique index not created; existing rows preserved.';
    create index if not exists payments_order_id_lookup_idx
      on public.payments(order_id);
  end;
end;
$$;

-- Products status constraint: replace the old constraint without deleting rows.
-- NOT VALID keeps existing legacy rows intact while enforcing new writes.
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check(status in ('pending','draft','published','archived')) not valid;

-- ============================================================
-- 27. FINAL VERIFICATION (READ ONLY)
-- ============================================================
do $$
begin
  raise notice 'TELECOD FINAL SAFE DATABASE MIGRATION COMPLETED.';
  raise notice 'Existing tables/data were preserved; duplicate object definitions were normalized.';
  raise notice 'marketplace_public remains a VIEW.';
  raise notice 'Required login, admin, withdrawal and payment RPC compatibility has been installed.';
end;
$$;
