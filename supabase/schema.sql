-- ============================================================
-- TELECOD FINAL DATABASE
-- Supabase / PostgreSQL
-- Run this file on a fresh project or an existing TeleCod DB.
-- ============================================================
create extension if not exists pgcrypto;

-- -------------------- PROFILES -------------------------------
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
alter table public.profiles add column if not exists telegram_number text;
alter table public.profiles add column if not exists last_login_at timestamptz;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_banned boolean not null default false;
create index if not exists profiles_username_idx on public.profiles(lower(username));

-- -------------------- PRODUCTS --------------------------------
create table if not exists public.products(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
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
  is_channel boolean not null default false,
  status text not null default 'draft' check(status in ('draft','published','archived')),
  views bigint not null default 0,
  sales_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paid_product_price check(access_type='free' or price>0)
);
create index if not exists products_creator_idx on public.products(creator_id);
create index if not exists products_market_idx on public.products(status,type,access_type);
create index if not exists products_created_idx on public.products(created_at desc);

-- -------------------- PASTELINKS ------------------------------
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
create index if not exists pastelinks_slug_idx on public.pastelinks(slug);
create index if not exists pastelinks_user_idx on public.pastelinks(user_id);
create index if not exists pastelinks_tags_idx on public.pastelinks using gin(tags);
alter table public.pastelinks add column if not exists destination_url text;
alter table public.pastelinks add column if not exists description text;
alter table public.pastelinks add column if not exists tags text[] not null default '{}';
alter table public.pastelinks add column if not exists allow_comments boolean not null default true;
alter table public.pastelinks add column if not exists allow_download boolean not null default true;
alter table public.pastelinks add column if not exists show_raw boolean not null default true;

-- -------------------- PURCHASES / PAYMENTS --------------------
create table if not exists public.purchases(
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(18,2) not null default 0 check(amount>=0),
  currency text not null default 'IDR',
  status text not null default 'pending' check(status in ('pending','paid','cancelled','refunded')),
  payment_id uuid,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique(product_id,buyer_id)
);
create index if not exists purchases_buyer_idx on public.purchases(buyer_id,created_at desc);
create index if not exists purchases_product_idx on public.purchases(product_id);

create table if not exists public.payments(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  kind text not null default 'purchase' check(kind in ('purchase','deposit')),
  provider text not null default 'dompetx',
  order_id text unique,
  provider_reference text unique,
  amount numeric(18,2) not null check(amount>=0),
  currency text not null default 'IDR',
  status text not null default 'pending' check(status in ('pending','paid','failed','expired','refunded')),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.payments add column if not exists kind text;
alter table public.payments add column if not exists order_id text;
alter table public.payments add column if not exists provider text;
alter table public.payments add column if not exists raw_payload jsonb;
update public.payments set kind='purchase' where kind is null;
update public.payments set provider='dompetx' where provider is null;
create unique index if not exists payments_order_id_idx on public.payments(order_id) where order_id is not null;

alter table public.purchases drop constraint if exists purchases_payment_fk;
alter table public.purchases add constraint purchases_payment_fk foreign key(payment_id) references public.payments(id) on delete set null;

-- -------------------- WALLET / TRANSACTIONS -------------------
create table if not exists public.wallets(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(18,2) not null default 0 check(balance>=0),
  currency text not null default 'IDR',
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists withdrawals_user_idx on public.withdrawals(user_id,created_at desc);

-- -------------------- ADMIN ----------------------------------
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

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1
    from public.profiles
    where id=auth.uid()
      and telegram_id='6665664367'
      and coalesce(is_banned,false)=false
  );
$$;

create or replace function public.admin_stats() returns jsonb
language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
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
  ) into r; return r;
end $$;

create or replace function public.admin_users(p_limit int default 100,p_offset int default 0) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into r from (
    select p.id,p.username,p.telegram_id,p.telegram_username,p.telegram_number,p.display_name,p.is_admin,p.is_banned,p.created_at,p.last_login_at,coalesce(w.balance,0) balance
    from public.profiles p left join public.wallets w on w.user_id=p.id
    order by p.created_at desc limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x; return r;
end $$;

create or replace function public.admin_products(p_limit int default 100,p_offset int default 0) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into r from (
    select p.*,pr.username creator_username from public.products p left join public.profiles pr on pr.id=p.creator_id
    order by p.created_at desc limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x; return r;
end $$;

create or replace function public.admin_pastes(p_limit int default 100,p_offset int default 0) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into r from (
    select p.id,p.slug,p.title,p.author_name,p.visibility,p.views,p.created_at,p.expires_at,p.user_id,pr.username creator_username
    from public.pastelinks p left join public.profiles pr on pr.id=p.user_id
    order by p.created_at desc limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x; return r;
end $$;

create or replace function public.admin_withdrawals(p_limit int default 100,p_offset int default 0) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into r from (
    select w.*,p.username,p.telegram_id from public.withdrawals w join public.profiles p on p.id=w.user_id
    order by w.created_at desc limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x; return r;
end $$;

create or replace function public.admin_set_user(p_user uuid,p_banned boolean default null,p_admin boolean default null) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.profiles set is_banned=coalesce(p_banned,is_banned),is_admin=coalesce(p_admin,is_admin) where id=p_user;
  insert into public.admin_logs(admin_id,action,target_type,target_id,details) values(auth.uid(),'update_user','user',p_user::text,jsonb_build_object('banned',p_banned,'admin',p_admin));
end $$;

create or replace function public.admin_adjust_balance(p_user uuid,p_amount numeric,p_reason text default 'Admin adjustment') returns void
language plpgsql security definer set search_path=public as $$
declare nb numeric;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  perform public.ensure_wallet(p_user);
  update public.wallets set balance=balance+p_amount where user_id=p_user returning balance into nb;
  if nb < 0 then raise exception 'Balance cannot be negative'; end if;
  insert into public.transactions(user_id,type,direction,amount,status,description) values(p_user,'adjustment',case when p_amount>=0 then 'credit' else 'debit' end,abs(p_amount),'success',p_reason);
  insert into public.admin_logs(admin_id,action,target_type,target_id,details) values(auth.uid(),'adjust_balance','user',p_user::text,jsonb_build_object('amount',p_amount,'reason',p_reason));
end $$;

create or replace function public.admin_update_product(p_id uuid,p_status text,p_price numeric default null) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status is not null and p_status not in ('draft','published','archived') then raise exception 'Invalid status'; end if;
  update public.products set status=coalesce(p_status,status),price=coalesce(p_price,price) where id=p_id;
  insert into public.admin_logs(admin_id,action,target_type,target_id,details) values(auth.uid(),'update_product','product',p_id::text,jsonb_build_object('status',p_status,'price',p_price));
end $$;

create or replace function public.admin_delete_product(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  delete from public.products where id=p_id;
  insert into public.admin_logs(admin_id,action,target_type,target_id) values(auth.uid(),'delete_product','product',p_id::text);
end $$;

create or replace function public.admin_delete_paste(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  delete from public.pastelinks where id=p_id;
  insert into public.admin_logs(admin_id,action,target_type,target_id) values(auth.uid(),'delete_paste','paste',p_id::text);
end $$;

create or replace function public.admin_process_withdrawal(p_id uuid,p_status text,p_note text default null) returns void
language plpgsql security definer set search_path=public as $$
declare w public.withdrawals%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('processing','paid','failed','cancelled') then raise exception 'Invalid withdrawal status'; end if;
  select * into w from public.withdrawals where id=p_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  update public.withdrawals set status=p_status,note=coalesce(p_note,note),processed_at=case when p_status in ('paid','failed','cancelled') then now() else processed_at end where id=p_id;
  if p_status in ('failed','cancelled') and w.status='pending' then
    perform public.ensure_wallet(w.user_id);
    update public.wallets set balance=balance+w.amount where user_id=w.user_id;
    update public.transactions set status='success' where reference_id=w.id and type='withdrawal';
    insert into public.transactions(user_id,type,direction,amount,status,reference_id,description) values(w.user_id,'refund','credit',w.amount,'success',w.id,'Withdrawal returned: '||p_status);
  elsif p_status='paid' then
    update public.transactions set status='success' where reference_id=w.id and type='withdrawal';
  end if;
  insert into public.admin_logs(admin_id,action,target_type,target_id,details) values(auth.uid(),'process_withdrawal','withdrawal',p_id::text,jsonb_build_object('status',p_status,'note',p_note));
end $$;





-- -------------------- ADMIN PAYMENTS / TRANSACTIONS -------------
create or replace function public.admin_payments(p_limit int default 100,p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into r from (
    select pay.*, p.username, p.telegram_id
    from public.payments pay
    left join public.profiles p on p.id=pay.user_id
    order by pay.created_at desc
    limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x;
  return r;
end $$;

create or replace function public.admin_transactions(p_limit int default 200,p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into r from (
    select t.*, p.username, p.telegram_id
    from public.transactions t
    left join public.profiles p on p.id=t.user_id
    order by t.created_at desc
    limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)
  ) x;
  return r;
end $$;

-- -------------------- VIEWS / STATS ---------------------------
create table if not exists public.product_views(
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  viewer_hash text,
  created_at timestamptz not null default now()
);
create index if not exists product_views_product_idx on public.product_views(product_id,created_at desc);

create table if not exists public.site_stats(key text primary key,value bigint not null default 0);
insert into public.site_stats(key,value) values('users',0),('transactions',0) on conflict(key) do nothing;

-- -------------------- HELPERS ---------------------------------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists products_updated on public.products;
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();

drop trigger if exists wallet_updated on public.wallets;
create trigger wallet_updated before update on public.wallets for each row execute function public.set_updated_at();

create or replace function public.ensure_wallet(p_user uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.wallets(user_id) values(p_user) on conflict(user_id) do nothing;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username,telegram_id,telegram_username,telegram_number,display_name)
  values(
    new.id,
    lower(nullif(new.raw_user_meta_data->>'username','')),
    nullif(new.raw_user_meta_data->>'telegram_id',''),
    lower(nullif(new.raw_user_meta_data->>'telegram_username','')),
    nullif(new.raw_user_meta_data->>'telegram_number',''),
    nullif(new.raw_user_meta_data->>'display_name','')
  ) on conflict(id) do nothing;
  perform public.ensure_wallet(new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Create wallet for existing profiles when this migration is run.
insert into public.wallets(user_id) select id from public.profiles on conflict(user_id) do nothing;

-- Public-safe marketplace data: never expose paid content through marketplace listing.
drop view if exists public.marketplace_public;
create view public.marketplace_public with (security_invoker=true) as
select id,creator_id,type,title,slug,description,category,access_type,price,thumbnail_url,telegram_channel,is_channel,status,views,sales_count,created_at,updated_at
from public.products where status='published';
grant select on public.marketplace_public to anon,authenticated;

create or replace function public.increment_product_view(p_product uuid,p_viewer_hash text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.product_views(product_id,viewer_hash) values(p_product,p_viewer_hash);
  update public.products set views=views+1 where id=p_product and status='published';
end $$;

create or replace function public.increment_paste_view(p_slug text)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.pastelinks set views=views+1 where slug=p_slug and visibility<>'private' and (expires_at is null or expires_at>now());
end $$;

create or replace function public.complete_free_purchase(p_product uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare pid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select id into pid from public.purchases where product_id=p_product and buyer_id=auth.uid();
  if pid is not null then return pid; end if;
  insert into public.purchases(product_id,buyer_id,amount,status,paid_at)
  select id,auth.uid(),0,'paid',now() from public.products where id=p_product and status='published' and access_type='free'
  returning id into pid;
  if pid is null then raise exception 'Product is not free or not published'; end if;
  update public.products set sales_count=sales_count+1 where id=p_product;
  return pid;
end $$;

-- Atomic withdrawal request. The balance is reserved immediately, so double-spend is impossible.
create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_account_name text,
  p_account_number text
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  wid uuid;
  bal numeric;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid withdrawal amount'; end if;
  if p_method not in ('bank','ewallet','crypto') then raise exception 'Invalid withdrawal method'; end if;
  perform public.ensure_wallet(auth.uid());
  select balance into bal from public.wallets where user_id=auth.uid() for update;
  if bal < p_amount then raise exception 'Insufficient balance'; end if;
  update public.wallets set balance=balance-p_amount where user_id=auth.uid();
  insert into public.withdrawals(user_id,amount,method,account_name,account_number,status)
  values(auth.uid(),p_amount,p_method,p_account_name,p_account_number,'pending') returning id into wid;
  insert into public.transactions(user_id,type,direction,amount,status,reference_id,description)
  values(auth.uid(),'withdrawal','debit',p_amount,'pending',wid,'Withdrawal request');
  return wid;
end $$;

-- -------------------- MASTER ADMIN GUARD -------------------------
-- Only the verified master Telegram ID may be treated as administrator.
-- The protected ID cannot be assigned by another authenticated profile.
create or replace function public.guard_master_admin_id()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.telegram_id='6665664367'
     and (TG_OP='INSERT' or coalesce(old.telegram_id,'') <> '6665664367') then
    -- The protected ID can only be provisioned by a trusted server/service-role
    -- flow (auth.uid() is null). A normal browser session can never self-assign it.
    if auth.uid() is not null then
      raise exception 'Master administrator identity can only be verified by Telegram auth';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_master_admin_id_trigger on public.profiles;
create trigger guard_master_admin_id_trigger
before insert or update of telegram_id on public.profiles
for each row execute function public.guard_master_admin_id();

-- -------------------- RLS -------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.pastelinks enable row level security;
alter table public.purchases enable row level security;
alter table public.payments enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.product_views enable row level security;
alter table public.site_stats enable row level security;

drop policy if exists profile_select_own on public.profiles;
create policy profile_select_own on public.profiles for select to authenticated using(id=auth.uid());
drop policy if exists profile_update_own on public.profiles;
create policy profile_update_own on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon,authenticated using(status='published' or creator_id=auth.uid());
drop policy if exists products_creator_insert on public.products;
create policy products_creator_insert on public.products for insert to authenticated with check(creator_id=auth.uid());
drop policy if exists products_creator_update on public.products;
create policy products_creator_update on public.products for update to authenticated using(creator_id=auth.uid()) with check(creator_id=auth.uid());
drop policy if exists products_creator_delete on public.products;
create policy products_creator_delete on public.products for delete to authenticated using(creator_id=auth.uid());

drop policy if exists pastelinks_public_read on public.pastelinks;
create policy pastelinks_public_read on public.pastelinks for select to anon,authenticated using(visibility<>'private' and (expires_at is null or expires_at>now()) or user_id=auth.uid());
drop policy if exists pastelinks_owner_insert on public.pastelinks;
create policy pastelinks_owner_insert on public.pastelinks for insert to anon,authenticated with check(user_id is null or user_id=auth.uid());
drop policy if exists pastelinks_owner_update on public.pastelinks;
create policy pastelinks_owner_update on public.pastelinks for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists pastelinks_owner_delete on public.pastelinks;
create policy pastelinks_owner_delete on public.pastelinks for delete to authenticated using(user_id=auth.uid());

drop policy if exists purchases_owner_read on public.purchases;
create policy purchases_owner_read on public.purchases for select to authenticated using(buyer_id=auth.uid());
drop policy if exists purchases_owner_insert on public.purchases;
-- Purchases are created by trusted RPC/Edge Functions only.
-- Paid purchase status can never be changed from the browser.
drop policy if exists purchases_owner_update on public.purchases;

drop policy if exists payments_owner_read on public.payments;
create policy payments_owner_read on public.payments for select to authenticated using(user_id=auth.uid());

drop policy if exists wallet_owner_read on public.wallets;
create policy wallet_owner_read on public.wallets for select to authenticated using(user_id=auth.uid());

drop policy if exists transactions_owner_read on public.transactions;
create policy transactions_owner_read on public.transactions for select to authenticated using(user_id=auth.uid());

drop policy if exists withdrawals_owner_read on public.withdrawals;
create policy withdrawals_owner_read on public.withdrawals for select to authenticated using(user_id=auth.uid());

drop policy if exists product_views_insert on public.product_views;
create policy product_views_insert on public.product_views for insert to anon,authenticated with check(true);
drop policy if exists site_stats_read on public.site_stats;
create policy site_stats_read on public.site_stats for select to anon,authenticated using(true);


-- Admin policies. All sensitive mutations remain behind admin SECURITY DEFINER RPCs.
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists pastelinks_admin_all on public.pastelinks;
create policy pastelinks_admin_all on public.pastelinks for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists withdrawals_admin_read on public.withdrawals;
create policy withdrawals_admin_read on public.withdrawals for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists payments_admin_read on public.payments;
create policy payments_admin_read on public.payments for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists purchases_admin_read on public.purchases;
create policy purchases_admin_read on public.purchases for select to authenticated using(buyer_id=auth.uid() or public.is_admin());
drop policy if exists transactions_admin_read on public.transactions;
create policy transactions_admin_read on public.transactions for select to authenticated using(user_id=auth.uid() or public.is_admin());
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_users(int,int) to authenticated;
grant execute on function public.admin_products(int,int) to authenticated;
grant execute on function public.admin_pastes(int,int) to authenticated;
grant execute on function public.admin_withdrawals(int,int) to authenticated;
grant execute on function public.admin_set_user(uuid,boolean,boolean) to authenticated;
grant execute on function public.admin_adjust_balance(uuid,numeric,text) to authenticated;
grant execute on function public.admin_update_product(uuid,text,numeric) to authenticated;
grant execute on function public.admin_delete_product(uuid) to authenticated;
grant execute on function public.admin_delete_paste(uuid) to authenticated;
grant execute on function public.admin_process_withdrawal(uuid,text,text) to authenticated;
grant execute on function public.complete_free_purchase(uuid) to authenticated;
grant execute on function public.increment_product_view(uuid,text) to anon,authenticated;
grant execute on function public.increment_paste_view(text) to anon,authenticated;
grant execute on function public.request_withdrawal(numeric,text,text,text) to authenticated;

create or replace view public.telecod_public_stats as
select
  (select count(*) from public.profiles) as users,
  (select count(*) from public.products where status='published') as products,
  (select coalesce(sum(views),0) from public.products) as views,
  (select count(*) from public.purchases where status='paid') as purchases;
grant select on public.telecod_public_stats to anon,authenticated;



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

