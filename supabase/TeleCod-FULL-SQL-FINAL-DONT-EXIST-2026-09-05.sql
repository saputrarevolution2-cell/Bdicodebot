-- ============================================================
-- TELECOD / PASTELE SUPABASE FINAL SQL
-- Generated from Bdicodebot-main(2).zip
-- ============================================================
-- Purpose:
--   * Full schema used by the uploaded project
--   * Login history + admin bot controls
--   * Frontend RPC compatibility
--   * Cashi QRIS checkout order support
--   * Telegram code/channel purchase settlement
--   * Idempotent table/index creation
--   * NO business data is intentionally deleted
--
-- IMPORTANT:
--   Run this entire file in Supabase SQL Editor.
--   The script uses IF NOT EXISTS for additive objects.
--   Existing policies/views/functions are recreated where required.
-- ============================================================

-- PasTele production fixed migration
-- Safe for an existing Supabase database. Run in Supabase SQL Editor.
-- IMPORTANT: never put a service_role/secret key in the frontend.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core tables / compatibility columns
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  auth_email text unique not null,
  display_name text,
  avatar_url text,
  role text not null default 'user',
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists balance numeric(14,2) not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.pastelinks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null, title text not null, content_html text not null,
  visibility text not null default 'public' check (visibility in ('public','private')),
  password_hash text, expires_at timestamptz, description text default '', tags text[] default '{}',
  allow_comments boolean default true, allow_download boolean default true, show_raw boolean default true,
  anonymous boolean default false, views bigint not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), seller_id uuid references auth.users(id) on delete cascade,
  creator_id uuid references auth.users(id) on delete cascade, title text not null, slug text unique not null,
  price numeric(14,2) not null default 0, thumbnail_url text,
  type text not null default 'link' check (type in ('link','paste','pastelink','code','channel','group')),
  access_type text not null default 'free' check (access_type in ('free','paid')),
  category text not null default 'General', description text default '', content text default '',
  views bigint not null default 0, sales_count bigint not null default 0,
  status text not null default 'draft' check (status in ('draft','pending','published','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(14,2) not null default 0, available_balance numeric(14,2) not null default 0,
  pending_balance numeric(14,2) not null default 0, updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null default 0, fee numeric(14,2) not null default 0,
  net_amount numeric(14,2) not null default 0, type text not null default 'sale',
  status text not null default 'pending', created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  amount numeric(14,2) not null default 0, fee numeric(14,2) not null default 0,
  net_amount numeric(14,2) not null default 0, type text not null default 'wallet',
  status text not null default 'completed', reference text, created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), buyer_id uuid references auth.users(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null, product_id uuid references public.products(id) on delete set null,
  amount numeric(14,2) not null default 0, status text not null default 'pending', payment_reference text,
  created_at timestamptz not null default now(), paid_at timestamptz
);
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists paid_at timestamptz;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(), buyer_id uuid references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null, order_id uuid references public.orders(id) on delete set null,
  amount numeric(14,2) not null default 0, status text not null default 'paid', created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  title text not null, body text default '', is_read boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  amount numeric(14,2) not null default 0, total_debit numeric(14,2) not null default 0,
  method text, account_name text, account_number text, mode text default 'manual', status text not null default 'pending',
  ticket_code text unique default ('WD-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,10))),
  note text, created_at timestamptz not null default now(), processed_at timestamptz
);
alter table public.withdrawals add column if not exists note text;
alter table public.withdrawals add column if not exists processed_at timestamptz;

-- Frontend compatibility columns. These are ADDITIVE so an existing
-- database is upgraded without deleting existing rows.
alter table public.profiles add column if not exists telegram_username text;
alter table public.profiles add column if not exists whatsapp_number text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists website text;

alter table public.pastelinks add column if not exists description text default '';
alter table public.pastelinks add column if not exists tags text[] default '{}';
alter table public.pastelinks add column if not exists allow_download boolean default true;
alter table public.pastelinks add column if not exists show_raw boolean default true;
alter table public.pastelinks add column if not exists anonymous boolean default false;
alter table public.pastelinks add column if not exists views bigint not null default 0;

alter table public.products add column if not exists seller_id uuid references auth.users(id) on delete cascade;
alter table public.products add column if not exists title text;
alter table public.products add column if not exists description text default '';
alter table public.products add column if not exists content text default '';
alter table public.products add column if not exists thumbnail_url text;
alter table public.products add column if not exists sales_count bigint not null default 0;

alter table public.wallets add column if not exists available_balance numeric(14,2) not null default 0;
alter table public.wallets add column if not exists pending_balance numeric(14,2) not null default 0;

alter table public.orders add column if not exists payment_id text;
alter table public.orders add column if not exists item_type text;
alter table public.orders add column if not exists item_id uuid;
alter table public.orders add column if not exists item_title text;

alter table public.purchases add column if not exists item_type text;
alter table public.purchases add column if not exists item_id uuid;
alter table public.purchases add column if not exists item_title text;

alter table public.telegram_products add column if not exists description text default '';
alter table public.telegram_products add column if not exists product_type text not null default 'code';
alter table public.telegram_channels add column if not exists type text not null default 'channel';

alter table public.wallet_transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.wallet_transactions add column if not exists fee numeric(14,2) not null default 0;
alter table public.wallet_transactions add column if not exists type text not null default 'sale';
alter table public.wallet_transactions add column if not exists created_at timestamptz not null default now();
alter table public.transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.transactions add column if not exists fee numeric(14,2) not null default 0;
alter table public.transactions add column if not exists type text not null default 'wallet';
alter table public.transactions add column if not exists reference text;
alter table public.transactions add column if not exists created_at timestamptz not null default now();

-- Telegram content tables expected by the frontend.
create table if not exists public.approved_bots (
  id uuid primary key default gen_random_uuid(), bot_username text unique not null,
  bot_name text, bot_id bigint, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.telegram_products (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text default '', product_type text not null default 'code',
  access_type text not null default 'free' check (access_type in ('free','paid')),
  price numeric(14,2) not null default 0, bot_username text, telegram_bot_id bigint,
  is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.telegram_channels (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text, username text, type text not null default 'channel' check (type in ('channel','group')),
  access_type text not null default 'free' check (access_type in ('free','paid')),
  price numeric(14,2) not null default 0, telegram_channel_id text,
  is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null, amount numeric(14,2) not null default 0,
  method text, reference text, status text not null default 'pending', created_at timestamptz not null default now(), paid_at timestamptz
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(), admin_id uuid references auth.users(id) on delete set null,
  action text not null, target_id uuid, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists pastelinks_slug_idx on public.pastelinks(slug);
create index if not exists products_public_idx on public.products(status,created_at desc);
create index if not exists products_type_views_idx on public.products(type,views desc);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);
create index if not exists orders_seller_idx on public.orders(seller_id,created_at desc);
create index if not exists withdrawals_user_idx on public.withdrawals(user_id,created_at desc);
create index if not exists profiles_username_lower_idx on public.profiles(lower(username));
create index if not exists profiles_email_lower_idx on public.profiles(lower(auth_email));
create index if not exists products_creator_idx on public.products(creator_id,created_at desc);
create index if not exists products_seller_idx on public.products(seller_id,created_at desc);
create index if not exists pastelinks_user_idx on public.pastelinks(user_id,created_at desc);
create index if not exists wallet_transactions_user_idx on public.wallet_transactions(user_id,created_at desc);
create index if not exists transactions_user_idx on public.transactions(user_id,created_at desc);
create index if not exists purchases_buyer_idx on public.purchases(buyer_id,created_at desc);
create index if not exists telegram_products_owner_idx on public.telegram_products(owner_id,created_at desc);
create index if not exists telegram_channels_owner_idx on public.telegram_channels(owner_id,created_at desc);
create index if not exists payments_order_idx on public.payments(order_id,created_at desc);
create index if not exists admin_logs_created_idx on public.admin_logs(created_at desc);

-- ---------------------------------------------------------------------------
-- Auth bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare uname text;
begin
  uname := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'),''), split_part(new.email,'@',1)));
  insert into public.profiles(id,username,auth_email,display_name)
  values(new.id, uname, lower(new.email), uname)
  on conflict (id) do update set auth_email=excluded.auth_email, updated_at=now();
  insert into public.wallets(user_id) values(new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop function if exists public.resolve_username_login(text);
create or replace function public.resolve_username_login(p_username text)
returns table(auth_email text, is_banned boolean) language sql security definer set search_path=public
as $$
  select p.auth_email, coalesce(p.is_banned,false)
  from public.profiles p
  where lower(p.username)=lower(trim(p_username))
     or lower(p.auth_email)=lower(trim(p_username))
  limit 1
$$;

create or replace function public.username_available(p_username text)
returns boolean language sql security definer set search_path=public
as $$ select not exists(select 1 from public.profiles where lower(username)=lower(trim(p_username))) $$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
revoke all on function public.resolve_username_login(text) from public;
grant execute on function public.resolve_username_login(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public marketplace view
-- ---------------------------------------------------------------------------
drop view if exists public.marketplace_public;
create view public.marketplace_public as
select p.id,p.slug,p.title,p.type,p.access_type,p.price,p.thumbnail_url,p.description,p.content,p.views,p.sales_count,p.category,p.created_at,
       coalesce(pr.display_name,pr.username,'Creator') as creator_name, pr.username as creator_username
from public.products p left join public.profiles pr on pr.id=coalesce(p.creator_id,p.seller_id)
where p.status='published';

grant select on public.marketplace_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: browser uses anon/publishable key; data protection is here, not by hiding the key.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.pastelinks enable row level security;
alter table public.products enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.transactions enable row level security;
alter table public.orders enable row level security;
alter table public.purchases enable row level security;
alter table public.notifications enable row level security;
alter table public.withdrawals enable row level security;
alter table public.approved_bots enable row level security;
alter table public.telegram_products enable row level security;
alter table public.telegram_channels enable row level security;
alter table public.payments enable row level security;
alter table public.admin_logs enable row level security;

-- Remove/recreate app policies to avoid permissive duplicates.
do $$declare r record; begin
  for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in
  ('profiles','pastelinks','products','wallets','wallet_transactions','transactions','orders','purchases','notifications','withdrawals','approved_bots','telegram_products','telegram_channels','payments','admin_logs')
  loop execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop;
end$$;

create policy profiles_select_own on public.profiles for select using (auth.uid()=id);
create policy profiles_update_own on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid()=id);

create policy pastelinks_public_or_own on public.pastelinks for select using ((visibility='public' and (expires_at is null or expires_at>now())) or auth.uid()=user_id);
create policy pastelinks_insert_own on public.pastelinks for insert with check (auth.uid()=user_id);
create policy pastelinks_update_own on public.pastelinks for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy pastelinks_delete_own on public.pastelinks for delete using (auth.uid()=user_id);

create policy products_public_or_own on public.products for select using (status='published' or auth.uid()=creator_id or auth.uid()=seller_id);
create policy products_insert_own on public.products for insert with check (auth.uid()=creator_id or auth.uid()=seller_id);
create policy products_update_own on public.products for update using (auth.uid()=creator_id or auth.uid()=seller_id) with check (auth.uid()=creator_id or auth.uid()=seller_id);
create policy products_delete_own on public.products for delete using (auth.uid()=creator_id or auth.uid()=seller_id);

create policy wallets_own_select on public.wallets for select using (auth.uid()=user_id);
create policy wallet_transactions_own_select on public.wallet_transactions for select using (auth.uid()=user_id);
create policy transactions_own_select on public.transactions for select using (auth.uid()=user_id);
create policy orders_participant_select on public.orders for select using (auth.uid()=buyer_id or auth.uid()=seller_id);
create policy purchases_buyer_select on public.purchases for select using (auth.uid()=buyer_id);
create policy notifications_own_select on public.notifications for select using (auth.uid()=user_id);
create policy notifications_own_update on public.notifications for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy withdrawals_own_select on public.withdrawals for select using (auth.uid()=user_id);
create policy withdrawals_own_insert on public.withdrawals for insert with check (auth.uid()=user_id);
create policy telegram_products_own_select on public.telegram_products for select using (is_published=true or auth.uid()=owner_id);
create policy telegram_products_own_insert on public.telegram_products for insert with check (auth.uid()=owner_id);
create policy telegram_products_own_update on public.telegram_products for update using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy telegram_channels_public_or_own on public.telegram_channels for select using (is_published=true or auth.uid()=owner_id);
create policy telegram_channels_own_insert on public.telegram_channels for insert with check (auth.uid()=owner_id);
create policy telegram_channels_own_update on public.telegram_channels for update using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy approved_bots_active_read on public.approved_bots for select using (is_active=true);

-- No direct browser write policies for payments/admin_logs/wallets/wallet_transactions.

-- ---------------------------------------------------------------------------
-- Explicit browser privileges
-- RLS remains the security boundary. These grants only make the API endpoints
-- callable by anon/authenticated; policies decide which rows are accessible.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.marketplace_public to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant select, insert, update, delete on public.pastelinks to authenticated;
grant select on public.pastelinks to anon;

grant select, insert, update, delete on public.products to authenticated;
grant select on public.products to anon;

grant select on public.wallets to authenticated;
grant select on public.wallet_transactions to authenticated;
grant select on public.transactions to authenticated;

grant select, insert on public.orders to authenticated;
grant select on public.purchases to authenticated;
grant select on public.notifications to authenticated;
grant update on public.notifications to authenticated;

grant select, insert on public.withdrawals to authenticated;

grant select on public.approved_bots to anon, authenticated;
grant select, insert, update on public.telegram_products to authenticated;
grant select on public.telegram_products to anon;
grant select, insert, update on public.telegram_channels to authenticated;
grant select on public.telegram_channels to anon;

grant select on public.payments to authenticated;
grant select on public.admin_logs to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic withdrawal request
-- ---------------------------------------------------------------------------
create or replace function public.request_withdrawal_v2(p_amount numeric,p_mode text,p_method text,p_account_name text,p_account_number text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare uid uuid:=auth.uid(); w public.wallets; wid uuid;
begin
  if uid is null then raise exception 'Login diperlukan'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Nominal tidak valid'; end if;
  if p_mode not in ('manual','instant') then raise exception 'Mode withdrawal tidak valid'; end if;
  if p_mode='manual' and p_amount<100000 then raise exception 'Minimum manual Rp100.000'; end if;
  if p_mode='instant' and p_amount>250000 then raise exception 'Maksimum instant Rp250.000'; end if;
  select * into w from public.wallets where user_id=uid for update;
  if not found then raise exception 'Wallet belum tersedia'; end if;
  if coalesce(w.available_balance,w.balance,0)<p_amount then raise exception 'Saldo tersedia tidak mencukupi'; end if;
  update public.wallets set available_balance=coalesce(available_balance,balance,0)-p_amount,balance=coalesce(balance,0)-p_amount,updated_at=now() where user_id=uid;
  insert into public.withdrawals(user_id,amount,total_debit,method,account_name,account_number,mode,status)
  values(uid,p_amount,p_amount,p_method,p_account_name,p_account_number,p_mode,'pending') returning id into wid;
  insert into public.transactions(user_id,amount,fee,net_amount,type,status,reference) values(uid,-p_amount,0,-p_amount,'withdrawal','pending',wid::text);
  return jsonb_build_object('id',wid,'status','pending');
end $$;
revoke all on function public.request_withdrawal_v2(numeric,text,text,text,text) from public;
grant execute on function public.request_withdrawal_v2(numeric,text,text,text,text) to authenticated;

-- Public paste view counter. No direct write access is granted to the table.
create or replace function public.increment_paste_view(p_slug text)
returns bigint language plpgsql security definer set search_path=public
as $$
declare v bigint;
begin
  update public.pastelinks set views=views+1,updated_at=updated_at
  where slug=trim(p_slug) and visibility='public' and (expires_at is null or expires_at>now())
  returning views into v;
  return coalesce(v,0);
end $$;
revoke all on function public.increment_paste_view(text) from public;
grant execute on function public.increment_paste_view(text) to anon,authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs. Every function checks admin server-side.
-- ---------------------------------------------------------------------------
create or replace function public.assert_admin() returns void language plpgsql security definer set search_path=public
as $$begin if not exists(select 1 from public.profiles where id=auth.uid() and (is_admin=true or role='admin') and coalesce(is_banned,false)=false) then raise exception 'Admin only'; end if; end$$;
revoke all on function public.assert_admin() from public;
grant execute on function public.assert_admin() to authenticated;

create or replace function public.admin_stats()
returns setof jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.assert_admin();
  return query
  select jsonb_build_object(
    'users',(select count(*) from public.profiles),
    'products',(select count(*) from public.products),
    'sales',(select coalesce(sum(sales_count),0) from public.products),
    'revenue',(select coalesce(sum(amount),0) from public.orders where status='paid'),
    'orders',(select count(*) from public.orders),
    'pastes',(select count(*) from public.pastelinks),
    'views',(select coalesce(sum(views),0) from public.products)+(select coalesce(sum(views),0) from public.pastelinks),
    'banned',(select count(*) from public.profiles where is_banned=true),
    'pending',(select count(*) from public.withdrawals where status='pending'),
    'withdrawals_pending',(select count(*) from public.withdrawals where status='pending'),
    'bots_active',(select count(*) from public.approved_bots where is_active=true)
  );
end
$$;
create or replace function public.admin_users(p_limit int default 100,p_offset int default 0) returns setof jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); return query select to_jsonb(x) from (select id,username,auth_email,display_name,role,is_admin,is_banned,balance,created_at from profiles order by created_at desc limit least(greatest(coalesce(p_limit,100),1),200) offset greatest(coalesce(p_offset,0),0)) x; end$$;
create or replace function public.admin_products(p_limit int default 100,p_offset int default 0) returns setof jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); return query select to_jsonb(x) from (select id,title,slug,type,price,status,views,sales_count,creator_id,created_at from products order by created_at desc limit least(greatest(coalesce(p_limit,100),1),200) offset greatest(coalesce(p_offset,0),0)) x; end$$;
create or replace function public.admin_orders(p_limit int default 100,p_offset int default 0) returns setof jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); return query select to_jsonb(x) from (select id,buyer_id,seller_id,product_id,amount,status,payment_reference,created_at,paid_at from orders order by created_at desc limit least(greatest(coalesce(p_limit,100),1),200) offset greatest(coalesce(p_offset,0),0)) x; end$$;
create or replace function public.admin_payments(p_limit int default 100,p_offset int default 0) returns setof jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); return query select to_jsonb(x) from (select id,order_id,user_id,amount,method,reference,status,created_at,paid_at from payments order by created_at desc limit least(greatest(coalesce(p_limit,100),1),200) offset greatest(coalesce(p_offset,0),0)) x; end$$;
create or replace function public.admin_withdrawals(p_limit int default 100,p_offset int default 0) returns setof jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); return query select to_jsonb(x) from (select id,user_id,amount,total_debit,method,account_name,account_number,mode,status,ticket_code,note,created_at,processed_at from withdrawals order by created_at desc limit least(greatest(coalesce(p_limit,100),1),200) offset greatest(coalesce(p_offset,0),0)) x; end$$;
create or replace function public.admin_transactions(p_limit int default 100,p_offset int default 0) returns setof jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); return query select to_jsonb(x) from (select id,user_id,amount,fee,net_amount,type,status,reference,created_at from transactions order by created_at desc limit least(greatest(coalesce(p_limit,100),1),200) offset greatest(coalesce(p_offset,0),0)) x; end$$;
create or replace function public.admin_pastes(p_limit int default 100,p_offset int default 0) returns setof jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); return query select to_jsonb(x) from (select id,user_id,slug,title,visibility,views,created_at,expires_at from pastelinks order by created_at desc limit least(greatest(coalesce(p_limit,100),1),200) offset greatest(coalesce(p_offset,0),0)) x; end$$;
create or replace function public.admin_bots(p_limit int default 100,p_offset int default 0) returns setof jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); return query select to_jsonb(x) from (select id,bot_username,bot_name,bot_id,is_active,created_at from approved_bots order by created_at desc limit least(greatest(coalesce(p_limit,100),1),200) offset greatest(coalesce(p_offset,0),0)) x; end$$;
create or replace function public.admin_logs(p_limit int default 100,p_offset int default 0) returns setof jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); return query select to_jsonb(x) from (select id,admin_id,action,target_id,details,created_at from admin_logs order by created_at desc limit least(greatest(coalesce(p_limit,100),1),200) offset greatest(coalesce(p_offset,0),0)) x; end$$;

create or replace function public.admin_set_user(p_user uuid,p_banned boolean,p_admin boolean default false) returns jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); if p_user=auth.uid() then raise exception 'Tidak boleh mengubah akun admin yang sedang dipakai'; end if; update profiles set is_banned=coalesce(p_banned,false),is_admin=coalesce(p_admin,false),role=case when coalesce(p_admin,false) then 'admin' else 'user' end,updated_at=now() where id=p_user; insert into admin_logs(admin_id,action,target_id,details) values(auth.uid(),'set_user',p_user,jsonb_build_object('banned',p_banned,'admin',p_admin)); return jsonb_build_object('ok',true); end$$;
create or replace function public.admin_update_product(p_id uuid,p_status text,p_price numeric) returns jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); if p_status not in ('draft','pending','published','rejected') then raise exception 'Status tidak valid'; end if; update products set status=p_status,price=greatest(coalesce(p_price,0),0),updated_at=now() where id=p_id; insert into admin_logs(admin_id,action,target_id,details) values(auth.uid(),'update_product',p_id,jsonb_build_object('status',p_status,'price',p_price)); return jsonb_build_object('ok',true); end$$;
create or replace function public.admin_upsert_bot(p_username text,p_bot_id bigint,p_display_name text) returns jsonb language plpgsql security definer set search_path=public as $$declare bid uuid; begin perform public.assert_admin(); insert into approved_bots(bot_username,bot_id,bot_name,is_active) values(lower(trim(p_username)),p_bot_id,nullif(trim(p_display_name),''),true) on conflict(bot_username) do update set bot_id=excluded.bot_id,bot_name=excluded.bot_name,is_active=true,updated_at=now() returning id into bid; insert into admin_logs(admin_id,action,target_id,details) values(auth.uid(),'upsert_bot',bid,jsonb_build_object('username',p_username)); return jsonb_build_object('ok',true,'id',bid); end$$;
create or replace function public.admin_mark_order_paid(p_order_id uuid,p_payment_reference text) returns jsonb language plpgsql security definer set search_path=public as $$declare o orders; begin perform public.assert_admin(); select * into o from orders where id=p_order_id for update; if not found then raise exception 'Order tidak ditemukan'; end if; update orders set status='paid',payment_reference=p_payment_reference,paid_at=now() where id=p_order_id; insert into payments(order_id,user_id,amount,reference,status,paid_at) values(o.id,o.buyer_id,o.amount,p_payment_reference,'paid',now()); if o.product_id is not null then insert into purchases(buyer_id,product_id,order_id,amount,status) select o.buyer_id,o.product_id,o.id,o.amount,'paid' where not exists(select 1 from purchases where order_id=o.id); update products set sales_count=sales_count+1 where id=o.product_id; end if; if o.seller_id is not null then insert into wallets(user_id) values(o.seller_id) on conflict do nothing; update wallets set balance=balance+o.amount,available_balance=available_balance+o.amount,updated_at=now() where user_id=o.seller_id; insert into wallet_transactions(user_id,amount,fee,net_amount,type,status) values(o.seller_id,o.amount,0,o.amount,'sale','completed'); insert into transactions(user_id,amount,fee,net_amount,type,status,reference) values(o.seller_id,o.amount,0,o.amount,'sale','completed',o.id::text); end if; insert into admin_logs(admin_id,action,target_id,details) values(auth.uid(),'mark_order_paid',o.id,jsonb_build_object('reference',p_payment_reference)); return jsonb_build_object('ok',true); end$$;
create or replace function public.admin_cancel_order(p_order_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$begin perform public.assert_admin(); update orders set status='cancelled' where id=p_order_id and status<>'paid'; insert into admin_logs(admin_id,action,target_id) values(auth.uid(),'cancel_order',p_order_id); return jsonb_build_object('ok',true); end$$;
create or replace function public.admin_process_withdrawal(p_id uuid,p_status text,p_note text) returns jsonb language plpgsql security definer set search_path=public as $$declare w withdrawals; begin perform public.assert_admin(); if p_status not in ('processing','completed','failed','rejected') then raise exception 'Status tidak valid'; end if; select * into w from withdrawals where id=p_id for update; if not found then raise exception 'Withdrawal tidak ditemukan'; end if; update withdrawals set status=p_status,note=p_note,processed_at=case when p_status in ('completed','failed','rejected') then now() else processed_at end where id=p_id; if p_status in ('failed','rejected') and w.status not in ('failed','rejected') then insert into wallets(user_id) values(w.user_id) on conflict do nothing; update wallets set balance=balance+w.total_debit,available_balance=available_balance+w.total_debit,updated_at=now() where user_id=w.user_id; insert into wallet_transactions(user_id,amount,fee,net_amount,type,status) values(w.user_id,w.total_debit,0,w.total_debit,'withdrawal_refund','completed'); insert into transactions(user_id,amount,fee,net_amount,type,status,reference) values(w.user_id,w.total_debit,0,w.total_debit,'withdrawal_refund','completed',w.id::text); end if; insert into admin_logs(admin_id,action,target_id,details) values(auth.uid(),'process_withdrawal',w.id,jsonb_build_object('status',p_status,'note',p_note)); return jsonb_build_object('ok',true); end$$;

-- Lock down RPC execution to authenticated users; each admin RPC performs its own server-side check.
revoke all on function public.admin_stats() from public; grant execute on function public.admin_stats() to authenticated;
revoke all on function public.admin_users(int,int) from public; grant execute on function public.admin_users(int,int) to authenticated;
revoke all on function public.admin_products(int,int) from public; grant execute on function public.admin_products(int,int) to authenticated;
revoke all on function public.admin_orders(int,int) from public; grant execute on function public.admin_orders(int,int) to authenticated;
revoke all on function public.admin_payments(int,int) from public; grant execute on function public.admin_payments(int,int) to authenticated;
revoke all on function public.admin_withdrawals(int,int) from public; grant execute on function public.admin_withdrawals(int,int) to authenticated;
revoke all on function public.admin_transactions(int,int) from public; grant execute on function public.admin_transactions(int,int) to authenticated;
revoke all on function public.admin_pastes(int,int) from public; grant execute on function public.admin_pastes(int,int) to authenticated;
revoke all on function public.admin_bots(int,int) from public; grant execute on function public.admin_bots(int,int) to authenticated;
revoke all on function public.admin_logs(int,int) from public; grant execute on function public.admin_logs(int,int) to authenticated;
revoke all on function public.admin_set_user(uuid,boolean,boolean) from public; grant execute on function public.admin_set_user(uuid,boolean,boolean) to authenticated;
revoke all on function public.admin_update_product(uuid,text,numeric) from public; grant execute on function public.admin_update_product(uuid,text,numeric) to authenticated;
revoke all on function public.admin_upsert_bot(text,bigint,text) from public; grant execute on function public.admin_upsert_bot(text,bigint,text) to authenticated;
revoke all on function public.admin_mark_order_paid(uuid,text) from public; grant execute on function public.admin_mark_order_paid(uuid,text) to authenticated;
revoke all on function public.admin_cancel_order(uuid) from public; grant execute on function public.admin_cancel_order(uuid) to authenticated;
revoke all on function public.admin_process_withdrawal(uuid,text,text) from public; grant execute on function public.admin_process_withdrawal(uuid,text,text) to authenticated;

-- PasTele FULL FIX / Analytics / Marketplace / Social / Announcements / Payments
-- Run AFTER the existing FIXED-MIGRATION.sql in Supabase SQL Editor.
-- Safe additive migration: does not delete existing business rows.

begin;

alter table public.profiles add column if not exists telegram_username text;
alter table public.profiles add column if not exists whatsapp_number text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists website text;
alter table public.purchases add column if not exists item_type text;
alter table public.purchases add column if not exists item_id uuid;
alter table public.purchases add column if not exists item_title text;

create table if not exists public.payment_methods (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 method_type text not null check(method_type in ('ewallet','bank')),
 provider text not null,
 account_name text not null,
 account_number text not null,
 country text default 'ID',
 is_default boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists payment_methods_user_idx on public.payment_methods(user_id,created_at desc);

create table if not exists public.analytics_events (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 event_type text not null check(event_type in ('view','like','share','follow','paid')),
 target_type text,
 target_id uuid,
 created_at timestamptz not null default now()
);
create index if not exists analytics_owner_date_idx on public.analytics_events(owner_id,created_at desc);
create index if not exists analytics_target_idx on public.analytics_events(target_id,event_type,created_at desc);

create table if not exists public.content_likes (
 id uuid primary key default gen_random_uuid(),
 content_owner_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid not null references auth.users(id) on delete cascade,
 target_id uuid not null,
 target_type text not null,
 created_at timestamptz not null default now(),
 unique(actor_id,target_id,target_type)
);
create table if not exists public.creator_followers (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references auth.users(id) on delete cascade,
 follower_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(creator_id,follower_id)
);

create table if not exists public.site_settings (
 id boolean primary key default true,
 socials jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values(true) on conflict(id) do nothing;

create table if not exists public.announcements (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 body text not null default '',
 image_url text,
 published boolean not null default false,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists announcements_public_idx on public.announcements(published,published_at desc);

-- Unified public marketplace. Existing products remain untouched.
drop view if exists public.marketplace_public;
create view public.marketplace_public as
select p.id,p.slug,p.title,p.type,p.access_type,p.price,p.thumbnail_url,p.description,p.content,
       p.views,p.sales_count,p.category,p.created_at,
       coalesce(pr.display_name,pr.username,'Creator') creator_name,pr.username creator_username,coalesce(p.creator_id,p.seller_id) owner_id
from public.products p left join public.profiles pr on pr.id=coalesce(p.creator_id,p.seller_id)
where p.status='published'
union all
select pl.id,pl.slug,pl.title,'link', 'free',0,null,pl.description,pl.content_html,
       pl.views,0,'PasteLink',pl.created_at,
       coalesce(pr.display_name,pr.username,'Creator'),pr.username,pl.user_id
from public.pastelinks pl left join public.profiles pr on pr.id=pl.user_id
where pl.visibility='public' and (pl.expires_at is null or pl.expires_at>now())
union all
select tp.id,'code-'||replace(tp.id::text,'-',''),tp.title,'code',tp.access_type,tp.price,null,tp.description,
       '',0,0,'Code',tp.created_at,coalesce(pr.display_name,pr.username,'Creator'),pr.username,tp.owner_id
from public.telegram_products tp left join public.profiles pr on pr.id=tp.owner_id
where tp.is_published=true
union all
select tc.id,tc.type||'-'||replace(tc.id::text,'-',''),coalesce(tc.name,'Telegram'),tc.type,tc.access_type,tc.price,null,'',
       coalesce(tc.telegram_channel_id,''),0,0,'Telegram',tc.created_at,coalesce(pr.display_name,pr.username,'Creator'),pr.username,tc.owner_id
from public.telegram_channels tc left join public.profiles pr on pr.id=tc.owner_id
where tc.is_published=true;

-- Safe event RPCs. Counters and history are written server-side.
create or replace function public.track_analytics(p_owner uuid,p_event text,p_target_type text,p_target_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if p_event not in ('view','like','share','follow','paid') then raise exception 'Invalid analytics event'; end if;
 if p_event in ('like','follow') and auth.uid() is null then raise exception 'Login diperlukan'; end if;
 insert into public.analytics_events(owner_id,actor_id,event_type,target_type,target_id)
 values(p_owner,auth.uid(),p_event,p_target_type,p_target_id);
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.track_analytics(uuid,text,text,uuid) from public;
grant execute on function public.track_analytics(uuid,text,text,uuid) to anon,authenticated;

create or replace function public.toggle_content_like(p_owner uuid,p_target_type text,p_target_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); liked boolean;
begin
 if uid is null then raise exception 'Login diperlukan'; end if;
 select true into liked from content_likes where actor_id=uid and target_id=p_target_id and target_type=p_target_type limit 1;
 if liked then
  delete from content_likes where actor_id=uid and target_id=p_target_id and target_type=p_target_type;
  return jsonb_build_object('liked',false);
 else
  insert into content_likes(content_owner_id,actor_id,target_id,target_type) values(p_owner,uid,p_target_id,p_target_type);
  insert into analytics_events(owner_id,actor_id,event_type,target_type,target_id) values(p_owner,uid,'like',p_target_type,p_target_id);
  return jsonb_build_object('liked',true);
 end if;
end $$;
grant execute on function public.toggle_content_like(uuid,text,uuid) to authenticated;

create or replace function public.toggle_creator_follow(p_creator uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); following boolean;
begin
 if uid is null then raise exception 'Login diperlukan'; end if;
 if uid=p_creator then raise exception 'Tidak dapat follow diri sendiri'; end if;
 select true into following from creator_followers where creator_id=p_creator and follower_id=uid limit 1;
 if following then
  delete from creator_followers where creator_id=p_creator and follower_id=uid;
  return jsonb_build_object('following',false);
 else
  insert into creator_followers(creator_id,follower_id) values(p_creator,uid);
  insert into analytics_events(owner_id,actor_id,event_type,target_type,target_id) values(p_creator,uid,'follow','creator',p_creator);
  return jsonb_build_object('following',true);
 end if;
end $$;
grant execute on function public.toggle_creator_follow(uuid) to authenticated;

create or replace function public.record_content_view(p_owner uuid,p_target_type text,p_target_id uuid)
returns bigint language plpgsql security definer set search_path=public as $$
declare v bigint:=0;
begin
 insert into analytics_events(owner_id,actor_id,event_type,target_type,target_id) values(p_owner,auth.uid(),'view',p_target_type,p_target_id);
 if p_target_type in ('product','link') then
   if exists(select 1 from products where id=p_target_id) then update products set views=views+1 where id=p_target_id returning views into v;
   else update pastelinks set views=views+1 where id=p_target_id returning views into v; end if;
 elsif p_target_type='pastelink' then update pastelinks set views=views+1 where id=p_target_id returning views into v;
 end if;
 return coalesce(v,0);
end $$;
grant execute on function public.record_content_view(uuid,text,uuid) to anon,authenticated;

create or replace function public.get_public_site_settings()
returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object('socials',coalesce((select socials from site_settings where id=true),'[]'::jsonb));
$$;
grant execute on function public.get_public_site_settings() to anon,authenticated;

create or replace function public.admin_save_socials(p_socials jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
begin perform public.assert_admin(); update site_settings set socials=coalesce(p_socials,'[]'::jsonb),updated_at=now() where id=true; return jsonb_build_object('ok',true); end $$;
grant execute on function public.admin_save_socials(jsonb) to authenticated;

create or replace function public.admin_publish_announcement(p_title text,p_body text,p_image_url text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare aid uuid;
begin perform public.assert_admin(); insert into announcements(title,body,image_url,published,published_at) values(trim(p_title),p_body,nullif(trim(p_image_url),''),true,now()) returning id into aid;
 insert into notifications(user_id,title,body) select id,trim(p_title),left(p_body,1000) from profiles where coalesce(is_banned,false)=false;
 return jsonb_build_object('ok',true,'id',aid);
end $$;
grant execute on function public.admin_publish_announcement(text,text,text) to authenticated;


create or replace function public.buy_market_item(p_type text,p_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); owner uuid; price numeric:=0; title text; itype text:=lower(coalesce(p_type,'link')); already boolean;
begin
 if uid is null then raise exception 'Login diperlukan'; end if;
 if itype='code' then
  select tp.owner_id,tp.price,tp.title into owner,price,title from telegram_products tp where tp.id=p_id and tp.is_published=true;
 elsif itype in ('channel','group') then
  select tc.owner_id,tc.price,coalesce(tc.name,'Telegram') into owner,price,title from telegram_channels tc where tc.id=p_id and tc.is_published=true;
 elsif itype='link' then
  select coalesce(prd.creator_id,prd.seller_id),prd.price,prd.title into owner,price,title from products prd where prd.id=p_id and prd.status='published';
  if owner is null then select pl.user_id,0,coalesce(pl.title,pl.slug) into owner,price,title from pastelinks pl where pl.id=p_id and visibility='public' and (expires_at is null or expires_at>now()); end if;
 else raise exception 'Tipe produk tidak valid'; end if;
 if owner is null then raise exception 'Produk tidak ditemukan'; end if;
 if owner=uid then raise exception 'Tidak dapat membeli produk sendiri'; end if;
 select exists(select 1 from purchases where buyer_id=uid and (product_id=p_id or item_id=p_id) and status in ('paid','completed')) into already;
 if already then raise exception 'Produk sudah pernah dibeli'; end if;
 if coalesce(price,0)>0 then
  update wallets set balance=balance-price,available_balance=available_balance-price,updated_at=now() where user_id=uid and coalesce(available_balance,balance)>=price;
  if not found then raise exception 'Saldo tersedia tidak mencukupi'; end if;
  insert into wallets(user_id) values(owner) on conflict(user_id) do nothing;
  update wallets set balance=balance+price,available_balance=available_balance+price,updated_at=now() where user_id=owner;
 end if;
 insert into purchases(buyer_id,product_id,item_type,item_id,item_title,amount,status) values(uid,case when itype='link' and exists(select 1 from products where id=p_id) then p_id else null end,itype,p_id,title,coalesce(price,0),'paid');
 insert into transactions(user_id,amount,fee,net_amount,type,status,reference) values(uid,-coalesce(price,0),0,-coalesce(price,0),'buy_'||itype,'completed',p_id::text);
 insert into transactions(user_id,amount,fee,net_amount,type,status,reference) values(owner,coalesce(price,0),0,coalesce(price,0),'sell_'||itype,'completed',p_id::text);
 insert into analytics_events(owner_id,actor_id,event_type,target_type,target_id) values(owner,uid,'paid',itype,p_id);
 if itype='link' and exists(select 1 from products where id=p_id) then update products set sales_count=sales_count+1,updated_at=now() where id=p_id; end if;
 return jsonb_build_object('ok',true,'price',coalesce(price,0),'title',title);
end $$;
grant execute on function public.buy_market_item(text,uuid) to authenticated;

create or replace function public.delete_purchase(p_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin delete from purchases where id=p_id and buyer_id=auth.uid(); return jsonb_build_object('ok',true); end $$;
grant execute on function public.delete_purchase(uuid) to authenticated;

create or replace function public.admin_payment_methods(p_user uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin perform public.assert_admin(); return coalesce((select jsonb_agg(to_jsonb(x)) from (select * from payment_methods where user_id=p_user order by created_at desc)x),'[]'::jsonb); end $$;

-- RLS
alter table public.payment_methods enable row level security;
alter table public.analytics_events enable row level security;
alter table public.content_likes enable row level security;
alter table public.creator_followers enable row level security;
alter table public.site_settings enable row level security;
alter table public.announcements enable row level security;

drop policy if exists payment_methods_own on public.payment_methods;
create policy payment_methods_own on public.payment_methods for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists analytics_own_read on public.analytics_events;
create policy analytics_own_read on public.analytics_events for select using(auth.uid()=owner_id);
drop policy if exists likes_public_read on public.content_likes;
create policy likes_public_read on public.content_likes for select using(true);
drop policy if exists follows_public_read on public.creator_followers;
create policy follows_public_read on public.creator_followers for select using(true);
drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read on public.announcements for select using(published=true);
drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings for select using(true);

grant select,insert,update,delete on public.payment_methods to authenticated;
grant select on public.analytics_events to authenticated;
grant select on public.content_likes,public.creator_followers to anon,authenticated;
grant select on public.announcements,public.site_settings to anon,authenticated;

-- Existing create flows become marketplace-visible when explicitly published.
-- No data is modified here.

commit;


-- PasTele: login history + bot controls
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_address inet,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  user_agent text,
  logged_in_at timestamptz not null default now()
);
create index if not exists login_history_user_time_idx on public.login_history(user_id,logged_in_at desc);
alter table public.login_history enable row level security;
drop policy if exists "Users can read own login history" on public.login_history;
create policy "Users can read own login history" on public.login_history for select using (auth.uid()=user_id);

create or replace function public.record_login(
  p_city text default null,p_region text default null,p_country text default null,
  p_latitude double precision default null,p_longitude double precision default null,p_user_agent text default null
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_ip text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  begin
    v_ip := coalesce(
      (current_setting('request.headers',true)::jsonb->>'x-forwarded-for'),
      (current_setting('request.headers',true)::jsonb->>'x-real-ip')
    );
  exception when others then v_ip := null;
  end;
  if v_ip is not null and position(',' in v_ip)>0 then v_ip:=split_part(v_ip,',',1); end if;
  insert into public.login_history(user_id,ip_address,city,region,country,latitude,longitude,user_agent)
  values(auth.uid(),nullif(trim(v_ip),'' )::inet,p_city,p_region,p_country,p_latitude,p_longitude,p_user_agent);
  return jsonb_build_object('ok',true);
exception when invalid_text_representation then
  insert into public.login_history(user_id,city,region,country,latitude,longitude,user_agent)
  values(auth.uid(),p_city,p_region,p_country,p_latitude,p_longitude,p_user_agent);
  return jsonb_build_object('ok',true);
end
$$;

create or replace function public.get_login_info() returns jsonb
language plpgsql security definer set search_path=public
as $$
declare a jsonb; b jsonb;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 select to_jsonb(x) into a from (
   select id,ip_address::text as ip_address,city,region,country,latitude,longitude,logged_in_at
   from public.login_history where user_id=auth.uid() order by logged_in_at desc limit 1
 ) x;
 select to_jsonb(x) into b from (
   select id,ip_address::text as ip_address,city,region,country,latitude,longitude,logged_in_at
   from public.login_history where user_id=auth.uid() order by logged_in_at desc offset 1 limit 1
 ) x;
 return jsonb_build_object('current',a,'last',b);
end
$$;

-- Only admins may toggle whether a bot appears in Create Code.
create or replace function public.admin_set_bot_active(p_bot_id uuid,p_active boolean)
returns jsonb language plpgsql security definer set search_path=public
as $$
begin
 perform public.assert_admin();
 update public.approved_bots set is_active=coalesce(p_active,false),updated_at=now() where id=p_bot_id;
 if not found then raise exception 'Bot tidak ditemukan'; end if;
 insert into public.admin_logs(admin_id,action,target_id,details)
 values(auth.uid(),'set_bot_active',p_bot_id,jsonb_build_object('active',p_active));
 return jsonb_build_object('ok',true);
end $$;

-- ============================================================
-- TELECOD / PASTELE FINAL COMPATIBILITY LAYER
-- ============================================================
-- This section fills the RPCs used by the current frontend in the ZIP
-- but missing from schema.sql, and adds checkout metadata for Telegram
-- products/channels. It is intentionally non-destructive to business data.

begin;

-- Checkout metadata for non-products marketplace items.
alter table public.orders add column if not exists item_type text;
alter table public.orders add column if not exists item_id uuid;
alter table public.orders add column if not exists item_title text;

create index if not exists orders_item_idx
  on public.orders(item_type,item_id,created_at desc);

-- ------------------------------------------------------------
-- Public workspace statistics
-- ------------------------------------------------------------
drop function if exists public.get_public_workspace_stats();
create or replace function public.get_public_workspace_stats()
returns jsonb
language sql
security definer
set search_path=public
as $$
  with rev as (
    select
      coalesce(sum(case
        when status='paid'
         and paid_at >= now() - interval '30 days'
        then amount else 0 end),0) as current_rev,
      coalesce(sum(case
        when status='paid'
         and paid_at >= now() - interval '60 days'
         and paid_at <  now() - interval '30 days'
        then amount else 0 end),0) as previous_rev
    from public.orders
  ),
  counts as (
    select
      (select count(*) from public.products
       where status='published'
         and type in ('link','paste','pastelink')) as payment_links,
      (select count(*) from public.telegram_products
       where is_published=true) as code_products,
      (select count(*) from public.telegram_channels
       where is_published=true) as telegram_access
  )
  select jsonb_build_object(
    'total_revenue',(select current_rev from rev),
    'revenue_trend',
      case
        when (select previous_rev from rev)=0
          then case when (select current_rev from rev)>0 then 100 else 0 end
        else round(
          (((select current_rev from rev)-(select previous_rev from rev))
          / nullif((select previous_rev from rev),0))*100,1)
      end,
    'payment_links',(select payment_links from counts),
    'code_products',(select code_products from counts),
    'telegram_access',(select telegram_access from counts)
  );
$$;
revoke all on function public.get_public_workspace_stats() from public;
grant execute on function public.get_public_workspace_stats() to anon,authenticated;

-- ------------------------------------------------------------
-- Unified marketplace item detail
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
  v_exists boolean := false;
begin
  if v_type='code' then
    select
      tp.owner_id, tp.title, tp.description, tp.access_type, tp.price,
      coalesce(pr.display_name,pr.username,'Creator'), pr.username
    into
      v_owner,v_title,v_description,v_access,v_price,v_creator,v_username
    from public.telegram_products tp
    left join public.profiles pr on pr.id=tp.owner_id
    where tp.id=p_id and tp.is_published=true;

    v_exists := found;
    if v_exists then
      select count(*) into v_views
      from public.analytics_events ae
      where ae.target_id=p_id and ae.target_type='code' and ae.event_type='view';
    end if;

  elsif v_type in ('channel','group') then
    select
      tc.owner_id,
      coalesce(tc.name,'Telegram'),
      '',
      coalesce(tc.telegram_channel_id,''),
      tc.access_type,
      tc.price,
      coalesce(pr.display_name,pr.username,'Creator'),
      pr.username
    into
      v_owner,v_title,v_description,v_content,v_access,v_price,v_creator,v_username
    from public.telegram_channels tc
    left join public.profiles pr on pr.id=tc.owner_id
    where tc.id=p_id and tc.type=v_type and tc.is_published=true;

    v_exists := found;
    if v_exists then
      select count(*) into v_views
      from public.analytics_events ae
      where ae.target_id=p_id and ae.target_type=v_type and ae.event_type='view';
    end if;

  elsif v_type='link' then
    select
      coalesce(p.creator_id,p.seller_id),p.title,p.description,p.content,
      p.access_type,p.price,p.views,
      coalesce(pr.display_name,pr.username,'Creator'),pr.username
    into
      v_owner,v_title,v_description,v_content,v_access,v_price,v_views,
      v_creator,v_username
    from public.products p
    left join public.profiles pr on pr.id=coalesce(p.creator_id,p.seller_id)
    where p.id=p_id and p.status='published';

    v_exists := found;

    if not v_exists then
      select
        pl.user_id,pl.title,pl.description,pl.content_html,
        'free',0,pl.views,
        coalesce(pr.display_name,pr.username,'Creator'),pr.username
      into
        v_owner,v_title,v_description,v_content,v_access,v_price,v_views,
        v_creator,v_username
      from public.pastelinks pl
      left join public.profiles pr on pr.id=pl.user_id
      where pl.id=p_id
        and pl.visibility='public'
        and (pl.expires_at is null or pl.expires_at>now());

      v_exists := found;
    end if;
  else
    raise exception 'Tipe produk tidak valid';
  end if;

  if not v_exists or v_owner is null then
    raise exception 'Produk tidak ditemukan atau belum dipublikasikan';
  end if;

  if lower(coalesce(v_access,'free'))='free' then
    v_can_access := true;
  elsif v_uid is not null then
    select exists(
      select 1
      from public.purchases pu
      where pu.buyer_id=v_uid
        and pu.status in ('paid','completed')
        and (
          (pu.item_id=p_id and lower(coalesce(pu.item_type,''))=v_type)
          or pu.product_id=p_id
        )
    ) into v_can_access;
  end if;

  return jsonb_build_object(
    'id',p_id,
    'type',v_type,
    'owner_id',v_owner,
    'title',v_title,
    'description',coalesce(v_description,''),
    'content',case when v_can_access then coalesce(v_content,'') else '' end,
    'channel_link',case
      when v_can_access then coalesce(v_content,'')
      else ''
    end,
    'access_type',coalesce(v_access,'free'),
    'price',coalesce(v_price,0),
    'views',coalesce(v_views,0),
    'creator_name',coalesce(v_creator,'Creator'),
    'creator_username',v_username,
    'can_access',v_can_access
  );
end;
$$;
revoke all on function public.get_market_item_detail(text,uuid) from public;
grant execute on function public.get_market_item_detail(text,uuid) to anon,authenticated;

-- ------------------------------------------------------------
-- Atomic checkout order creation for Cashi QRIS
-- ------------------------------------------------------------
drop function if exists public.create_checkout_order(text,uuid);
create or replace function public.create_checkout_order(
  p_type text,
  p_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_type text := lower(coalesce(p_type,'link'));
  v_owner uuid;
  v_title text;
  v_price numeric := 0;
  v_order_id uuid;
begin
  if v_uid is null then
    raise exception 'Login diperlukan';
  end if;

  if v_type='code' then
    select owner_id,title,price
    into v_owner,v_title,v_price
    from public.telegram_products
    where id=p_id and is_published=true;

  elsif v_type in ('channel','group') then
    select owner_id,coalesce(name,'Telegram'),price
    into v_owner,v_title,v_price
    from public.telegram_channels
    where id=p_id and type=v_type and is_published=true;

  elsif v_type='link' then
    select coalesce(creator_id,seller_id),title,price
    into v_owner,v_title,v_price
    from public.products
    where id=p_id and status='published';

    if v_owner is null then
      select user_id,coalesce(title,slug),0
      into v_owner,v_title,v_price
      from public.pastelinks
      where id=p_id
        and visibility='public'
        and (expires_at is null or expires_at>now());
    end if;
  else
    raise exception 'Tipe produk tidak valid';
  end if;

  if v_owner is null then
    raise exception 'Produk tidak ditemukan atau belum dipublikasikan';
  end if;

  if v_owner=v_uid then
    raise exception 'Tidak dapat membeli produk sendiri';
  end if;

  if coalesce(v_price,0)<=0 then
    raise exception 'Produk ini gratis; gunakan akses gratis';
  end if;

  if exists(
    select 1 from public.purchases
    where buyer_id=v_uid
      and status in ('paid','completed')
      and (
        (item_id=p_id and lower(coalesce(item_type,''))=v_type)
        or product_id=p_id
      )
  ) then
    raise exception 'Produk sudah pernah dibeli';
  end if;

  -- Reuse an existing pending order for the same buyer/item to prevent
  -- duplicate invoices when the button is tapped repeatedly.
  select id into v_order_id
  from public.orders
  where buyer_id=v_uid
    and status='pending'
    and item_id=p_id
    and item_type=v_type
  order by created_at desc
  limit 1;

  if v_order_id is null then
    insert into public.orders(
      buyer_id,seller_id,product_id,item_type,item_id,item_title,
      amount,status
    )
    values(
      v_uid,
      v_owner,
      case
        when v_type='link'
         and exists(select 1 from public.products where id=p_id)
        then p_id
        else null
      end,
      v_type,p_id,v_title,coalesce(v_price,0),'pending'
    )
    returning id into v_order_id;
  end if;

  return jsonb_build_object(
    'order_id',v_order_id,
    'amount',coalesce(v_price,0),
    'title',v_title,
    'type',v_type,
    'item_id',p_id
  );
end;
$$;
revoke all on function public.create_checkout_order(text,uuid) from public;
grant execute on function public.create_checkout_order(text,uuid) to authenticated;

-- ------------------------------------------------------------
-- Complete paid-order settlement for both products and Telegram items
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
begin
  perform public.assert_admin();

  select * into o
  from public.orders
  where id=p_order_id
  for update;

  if not found then
    raise exception 'Order tidak ditemukan';
  end if;

  if o.status='paid' then
    return jsonb_build_object('ok',true,'already_paid',true,'order_id',o.id);
  end if;

  if o.status='cancelled' then
    raise exception 'Order sudah dibatalkan';
  end if;

  update public.orders
  set status='paid',
      payment_reference=p_payment_reference,
      paid_at=now()
  where id=o.id;

  insert into public.payments(
    order_id,user_id,amount,method,reference,status,paid_at
  )
  values(
    o.id,o.buyer_id,o.amount,'cashi_qris',
    p_payment_reference,'paid',now()
  );

  insert into public.purchases(
    buyer_id,product_id,order_id,amount,status,item_type,item_id,item_title
  )
  select
    o.buyer_id,o.product_id,o.id,o.amount,'paid',
    o.item_type,o.item_id,o.item_title
  where not exists(
    select 1 from public.purchases
    where order_id=o.id
  );

  if o.product_id is not null then
    update public.products
    set sales_count=sales_count+1,updated_at=now()
    where id=o.product_id;
  end if;

  if o.seller_id is not null and coalesce(o.amount,0)>0 then
    insert into public.wallets(user_id)
    values(o.seller_id)
    on conflict(user_id) do nothing;

    update public.wallets
    set balance=balance+o.amount,
        available_balance=available_balance+o.amount,
        updated_at=now()
    where user_id=o.seller_id;

    insert into public.wallet_transactions(
      user_id,amount,fee,net_amount,type,status
    )
    values(
      o.seller_id,o.amount,0,o.amount,'sale','completed'
    );

    insert into public.transactions(
      user_id,amount,fee,net_amount,type,status,reference
    )
    values(
      o.seller_id,o.amount,0,o.amount,'sale','completed',o.id::text
    );
  end if;

  insert into public.admin_logs(
    admin_id,action,target_id,details
  )
  values(
    auth.uid(),'mark_order_paid',o.id,
    jsonb_build_object(
      'reference',p_payment_reference,
      'item_type',o.item_type,
      'item_id',o.item_id
    )
  );

  return jsonb_build_object(
    'ok',true,
    'order_id',o.id,
    'status','paid'
  );
end;
$$;
revoke all on function public.admin_mark_order_paid(uuid,text) from public;
grant execute on function public.admin_mark_order_paid(uuid,text) to authenticated;

-- ------------------------------------------------------------
-- Final helper RPCs present in the ZIP's full-fix migration
-- ------------------------------------------------------------
drop function if exists public.get_my_content_counts();
create or replace function public.get_my_content_counts()
returns jsonb
language sql
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'link',
      (select count(*) from public.products
       where coalesce(creator_id,seller_id)=auth.uid()
         and type in ('link','paste','pastelink'))
      +(select count(*) from public.pastelinks where user_id=auth.uid()),
    'code',
      (select count(*) from public.telegram_products where owner_id=auth.uid()),
    'channel',
      (select count(*) from public.telegram_channels
       where owner_id=auth.uid() and type='channel'),
    'group',
      (select count(*) from public.telegram_channels
       where owner_id=auth.uid() and type='group')
  );
$$;
grant execute on function public.get_my_content_counts() to authenticated;

drop function if exists public.get_public_announcements(int);
create or replace function public.get_public_announcements(p_limit int default 50)
returns setof public.announcements
language sql
security definer
set search_path=public
as $$
  select *
  from public.announcements
  where published=true
  order by coalesce(published_at,created_at) desc
  limit least(greatest(coalesce(p_limit,50),1),100);
$$;
revoke all on function public.get_public_announcements(int) from public;
grant execute on function public.get_public_announcements(int) to anon,authenticated;

commit;

-- ============================================================
-- FINAL SANITY CHECKS
-- ============================================================
-- These SELECTs are read-only. Run them after the migration if desired.
-- They should return the expected objects without changing any data.

select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'profiles','pastelinks','products','wallets','wallet_transactions',
    'transactions','orders','purchases','notifications','withdrawals',
    'approved_bots','telegram_products','telegram_channels','payments',
    'admin_logs','payment_methods','analytics_events','content_likes',
    'creator_followers','site_settings','announcements','login_history'
  )
order by table_name;

select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'resolve_username_login','username_available','request_withdrawal_v2',
    'increment_paste_view','assert_admin','admin_stats','admin_users',
    'admin_products','admin_orders','admin_payments','admin_withdrawals',
    'admin_transactions','admin_pastes','admin_bots','admin_logs',
    'admin_set_user','admin_update_product','admin_upsert_bot',
    'admin_mark_order_paid','admin_cancel_order','admin_process_withdrawal',
    'track_analytics','toggle_content_like','toggle_creator_follow',
    'record_content_view','get_public_site_settings','admin_save_socials',
    'admin_publish_announcement','buy_market_item','delete_purchase',
    'admin_payment_methods','record_login','get_login_info',
    'admin_set_bot_active','get_public_workspace_stats',
    'get_market_item_detail','create_checkout_order',
    'get_my_content_counts','get_public_announcements'
  )
order by routine_name;



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
