-- TELECOD PRODUCTION DATABASE
-- Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  balance bigint not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text unique not null,
  category text not null default 'Other',
  description text not null default '',
  price bigint not null check (price >= 1000),
  thumbnail_url text,
  delivery_type text not null default 'digital' check (delivery_type in ('digital','telegram_channel','external')),
  delivery_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pastes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  title text not null,
  slug text unique not null,
  content text not null,
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  amount bigint not null check (amount >= 1000),
  status text not null default 'pending' check (status in ('pending','paid','cancelled','expired','refunded')),
  payment_provider text,
  payment_reference text,
  payment_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_access (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  delivery_url text,
  delivered_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('sale','purchase','withdrawal','refund','adjustment')),
  amount bigint not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount >= 10000),
  method text not null,
  account_name text not null,
  account_number text not null,
  status text not null default 'pending' check (status in ('pending','processing','paid','rejected')),
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists products_status_created_idx on public.products(status, created_at desc);
create index if not exists products_seller_idx on public.products(seller_id);
create index if not exists pastes_slug_idx on public.pastes(slug);
create index if not exists orders_buyer_idx on public.orders(buyer_id, created_at desc);
create index if not exists orders_seller_idx on public.orders(seller_id, created_at desc);
create index if not exists transactions_user_idx on public.transactions(user_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists pastes_updated_at on public.pastes;
create trigger pastes_updated_at before update on public.pastes for each row execute function public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare u text;
begin
  u := coalesce(new.raw_user_meta_data->>'username','user_'||substr(replace(new.id::text,'-',''),1,10));
  if exists(select 1 from public.profiles where username=u) then u := u||'_'||substr(replace(new.id::text,'-',''),1,6); end if;
  insert into public.profiles(id,username,display_name)
  values(new.id,u,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)))
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Secure order creation: price/seller are read from product, not trusted from browser.
create or replace function public.create_order(p_product_id uuid)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  p public.products;
  o public.orders;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into p from public.products where id=p_product_id and status='published';
  if not found then raise exception 'Product unavailable'; end if;
  if p.seller_id=v_user then raise exception 'Seller cannot buy own product'; end if;
  insert into public.orders(product_id,buyer_id,seller_id,amount)
  values(p.id,v_user,p.seller_id,p.price)
  returning * into o;
  return o;
end $$;

-- Payment webhook/backend should call this after verified payment.
create or replace function public.complete_paid_order(p_order_id uuid, p_payment_reference text default null)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare o public.orders; p public.products;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status='paid' then return o; end if;
  select * into p from public.products where id=o.product_id;
  update public.orders
    set status='paid', payment_reference=coalesce(p_payment_reference,payment_reference), paid_at=now()
    where id=o.id returning * into o;
  update public.profiles set balance=balance+o.amount where id=o.seller_id;
  insert into public.product_access(order_id,product_id,buyer_id,delivery_url)
  values(o.id,o.product_id,o.buyer_id,p.delivery_url)
  on conflict(order_id) do nothing;
  insert into public.transactions(user_id,order_id,type,amount,description)
  values(o.seller_id,o.id,'sale',o.amount,'Product sale');
  insert into public.transactions(user_id,order_id,type,amount,description)
  values(o.buyer_id,o.id,'purchase',-o.amount,'Product purchase');
  return o;
end $$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.pastes enable row level security;
alter table public.orders enable row level security;
alter table public.product_access enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles for select using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (status='published' or seller_id=auth.uid());
drop policy if exists products_insert_own on public.products;
create policy products_insert_own on public.products for insert with check (seller_id=auth.uid());
drop policy if exists products_update_own on public.products;
create policy products_update_own on public.products for update using (seller_id=auth.uid()) with check (seller_id=auth.uid());
drop policy if exists products_delete_own on public.products;
create policy products_delete_own on public.products for delete using (seller_id=auth.uid());

drop policy if exists pastes_public_read on public.pastes;
create policy pastes_public_read on public.pastes for select using (visibility in ('public','unlisted') or owner_id=auth.uid());
drop policy if exists pastes_insert_public on public.pastes;
create policy pastes_insert_public on public.pastes for insert with check (owner_id is null or owner_id=auth.uid());
drop policy if exists pastes_update_own on public.pastes;
create policy pastes_update_own on public.pastes for update using (owner_id=auth.uid()) with check (owner_id=auth.uid());
drop policy if exists pastes_delete_own on public.pastes;
create policy pastes_delete_own on public.pastes for delete using (owner_id=auth.uid());

drop policy if exists orders_buyer_read on public.orders;
create policy orders_buyer_read on public.orders for select using (buyer_id=auth.uid() or seller_id=auth.uid());
drop policy if exists access_buyer_read on public.product_access;
create policy access_buyer_read on public.product_access for select using (buyer_id=auth.uid());
drop policy if exists tx_owner_read on public.transactions;
create policy tx_owner_read on public.transactions for select using (user_id=auth.uid());
drop policy if exists withdrawal_owner_read on public.withdrawals;
create policy withdrawal_owner_read on public.withdrawals for select using (user_id=auth.uid());
drop policy if exists withdrawal_owner_insert on public.withdrawals;
create policy withdrawal_owner_insert on public.withdrawals for insert with check (user_id=auth.uid());

grant select on public.products to anon, authenticated;
grant select,insert,update,delete on public.products to authenticated;
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant select,insert,update,delete on public.pastes to anon, authenticated;
grant select on public.orders to authenticated;
grant select on public.product_access to authenticated;
grant select on public.transactions to authenticated;
grant select,insert on public.withdrawals to authenticated;
grant execute on function public.create_order(uuid) to authenticated;
grant execute on function public.complete_paid_order(uuid,text) to service_role;

-- IMPORTANT: Never expose service_role/secret keys in frontend.
