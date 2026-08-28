-- PasTele / TeleCod baseline schema
-- Run this in Supabase SQL Editor, then open setup.html in the site and enter
-- your Project URL + anon/publishable key.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  auth_email text unique not null,
  display_name text,
  avatar_url text,
  role text not null default 'user',
  is_admin boolean not null default false,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pastelinks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null,
  title text not null,
  content_html text not null,
  visibility text not null default 'public' check (visibility in ('public','private')),
  password_hash text,
  expires_at timestamptz,
  description text default '',
  tags text[] default '{}',
  allow_comments boolean default true,
  allow_download boolean default true,
  show_raw boolean default true,
  anonymous boolean default false,
  views bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade,
  creator_id uuid references auth.users(id) on delete cascade,
  title text not null,
  slug text unique not null,
  price numeric(14,2) not null default 0,
  thumbnail_url text,
  type text not null default 'link' check (type in ('link','paste','pastelink','code','channel','group')),
  access_type text not null default 'free' check (access_type in ('free','paid')),
  category text not null default 'General',
  description text default '',
  content text default '',
  views bigint not null default 0,
  sales_count bigint not null default 0,
  status text not null default 'draft' check (status in ('draft','pending','published','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(14,2) not null default 0,
  available_balance numeric(14,2) not null default 0,
  pending_balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null default 0,
  fee numeric(14,2) not null default 0,
  net_amount numeric(14,2) not null default 0,
  type text not null default 'sale',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references auth.users(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  amount numeric(14,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(14,2) not null default 0,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric(14,2) not null default 0,
  total_debit numeric(14,2) not null default 0,
  method text,
  account_name text,
  account_number text,
  mode text default 'manual',
  status text not null default 'pending',
  ticket_code text unique default ('WD-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,10))),
  created_at timestamptz not null default now()
);

create index if not exists pastelinks_slug_idx on public.pastelinks(slug);
create index if not exists products_public_idx on public.products(status,created_at desc);
create index if not exists products_type_views_idx on public.products(type,views desc);

-- Auto-create profile + wallet after signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare uname text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1));
  insert into public.profiles(id,username,auth_email,display_name)
  values(new.id, uname, new.email, uname)
  on conflict (id) do update set auth_email=excluded.auth_email, updated_at=now();
  insert into public.wallets(user_id) values(new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Login helper: accepts username OR email and returns only the email needed
-- for Supabase password authentication.
create or replace function public.resolve_username_login(p_username text)
returns table(auth_email text)
language sql security definer set search_path=public
as $$
  select p.auth_email
  from public.profiles p
  where lower(p.username)=lower(trim(p_username))
     or lower(p.auth_email)=lower(trim(p_username))
  limit 1;
$$;

create or replace function public.username_available(p_username text)
returns boolean language sql security definer set search_path=public
as $$ select not exists(select 1 from public.profiles where lower(username)=lower(trim(p_username))) $$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

revoke all on function public.resolve_username_login(text) from public;
grant execute on function public.resolve_username_login(text) to anon, authenticated;

-- Public marketplace: only published products are exposed.
create or replace view public.marketplace_public as
select p.id,p.slug,p.title,p.type,p.access_type,p.price,p.thumbnail_url,p.description,
       p.content,p.views,p.sales_count,p.category,p.created_at,
       coalesce(pr.display_name,pr.username,'Creator') as creator_name,
       pr.username as creator_username
from public.products p
left join public.profiles pr on pr.id=coalesce(p.creator_id,p.seller_id)
where p.status='published';

alter view public.marketplace_public set (security_invoker = true);

-- RLS
alter table public.profiles enable row level security;
alter table public.pastelinks enable row level security;
alter table public.products enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.orders enable row level security;
alter table public.purchases enable row level security;
alter table public.notifications enable row level security;
alter table public.withdrawals enable row level security;

drop policy if exists "profile own select" on public.profiles;
create policy "profile own select" on public.profiles for select using (auth.uid()=id);
drop policy if exists "profile own update" on public.profiles;
create policy "profile own update" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
drop policy if exists "profile own insert" on public.profiles;
create policy "profile own insert" on public.profiles for insert with check (auth.uid()=id);

drop policy if exists "paste public read" on public.pastelinks;
create policy "paste public read" on public.pastelinks for select using (visibility='public' and (expires_at is null or expires_at>now()) or auth.uid()=user_id);
drop policy if exists "paste owner insert" on public.pastelinks;
create policy "paste owner insert" on public.pastelinks for insert with check (auth.uid()=user_id);
drop policy if exists "paste owner update" on public.pastelinks;
create policy "paste owner update" on public.pastelinks for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "paste owner delete" on public.pastelinks;
create policy "paste owner delete" on public.pastelinks for delete using (auth.uid()=user_id);

drop policy if exists "product public read" on public.products;
create policy "product public read" on public.products for select using (status='published' or auth.uid()=creator_id or auth.uid()=seller_id);
drop policy if exists "product owner insert" on public.products;
create policy "product owner insert" on public.products for insert with check (auth.uid()=creator_id or auth.uid()=seller_id);
drop policy if exists "product owner update" on public.products;
create policy "product owner update" on public.products for update using (auth.uid()=creator_id or auth.uid()=seller_id) with check (auth.uid()=creator_id or auth.uid()=seller_id);

drop policy if exists "wallet own" on public.wallets;
create policy "wallet own" on public.wallets for select using (auth.uid()=user_id);
drop policy if exists "wallet tx own" on public.wallet_transactions;
create policy "wallet tx own" on public.wallet_transactions for select using (auth.uid()=user_id);
drop policy if exists "orders buyer seller" on public.orders;
create policy "orders buyer seller" on public.orders for select using (auth.uid()=buyer_id or auth.uid()=seller_id);
drop policy if exists "purchases buyer" on public.purchases;
create policy "purchases buyer" on public.purchases for select using (auth.uid()=buyer_id);
drop policy if exists "notifications own" on public.notifications;
create policy "notifications own" on public.notifications for select using (auth.uid()=user_id);
drop policy if exists "withdraw own" on public.withdrawals;
create policy "withdraw own" on public.withdrawals for select using (auth.uid()=user_id);
create policy "withdraw insert own" on public.withdrawals for insert with check (auth.uid()=user_id);
