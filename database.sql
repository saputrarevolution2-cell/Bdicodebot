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
  updated_at timestamptz not null default now(),
  auth_email text unique,
  telegram_id bigint unique,
  telegram_username text
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
declare
  u text;
  display text;
begin
  u := coalesce(nullif(new.raw_user_meta_data->>'username',''),'user_'||substr(replace(new.id::text,'-',''),1,10));
  u := lower(regexp_replace(u,'[^a-zA-Z0-9_]','','g'));
  if length(u)<3 then u := 'user_'||substr(replace(new.id::text,'-',''),1,10); end if;
  if exists(select 1 from public.profiles where username=u and id<>new.id) then
    u := u||'_'||substr(replace(new.id::text,'-',''),1,6);
  end if;
  display := coalesce(nullif(new.raw_user_meta_data->>'display_name',''),nullif(new.raw_user_meta_data->>'full_name',''),split_part(coalesce(new.email,''),'@',1),'TeleCod User');
  insert into public.profiles(id,username,display_name,auth_email,telegram_id,telegram_username)
  values(new.id,u,display,new.email,nullif(new.raw_user_meta_data->>'telegram_id','')::bigint,nullif(new.raw_user_meta_data->>'telegram_username',''))
  on conflict(id) do update set
    display_name=coalesce(excluded.display_name,profiles.display_name),
    auth_email=coalesce(excluded.auth_email,profiles.auth_email),
    telegram_id=coalesce(excluded.telegram_id,profiles.telegram_id),
    telegram_username=coalesce(excluded.telegram_username,profiles.telegram_username);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Resolve a username to its Auth email so username/password login can work.
-- The frontend only needs the matching auth email; password verification remains inside Supabase Auth.
create or replace function public.resolve_username_login(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select auth_email from public.profiles
  where lower(username)=lower(trim(leading '@' from p_username))
  limit 1;
$$;

grant execute on function public.resolve_username_login(text) to anon, authenticated;

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
grant select,insert,update,delete on public.pastes to anon, authenticated;
grant select on public.orders to authenticated;
grant select on public.product_access to authenticated;
grant select on public.transactions to authenticated;
grant select,insert on public.withdrawals to authenticated;
grant execute on function public.create_order(uuid) to authenticated;
grant execute on function public.complete_paid_order(uuid,text) to service_role;

-- IMPORTANT: Never expose service_role/secret keys in frontend.

-- ============================================================
-- TELECOD FINAL ADMIN / PAYMENT / WITHDRAWAL HARDENING
-- ============================================================
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists status text not null default 'active';
-- Keep login-only identity fields out of normal browser SELECT privileges.
revoke select on public.profiles from anon, authenticated;
grant select(id,username,display_name,avatar_url,bio,balance,created_at,updated_at,role,status) on public.profiles to anon, authenticated;
revoke select(auth_email,telegram_id,telegram_username) on public.profiles from anon, authenticated;
grant update on public.profiles to authenticated;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user','admin','suspended'));
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('active','suspended'));

create table if not exists public.payment_settings (
  id integer primary key check (id=1),
  enabled boolean not null default false,
  provider text not null default 'manual',
  mode text not null default 'manual' check (mode in ('manual','api')),
  merchant_id text,
  api_endpoint text,
  qr_image_url text,
  instructions text,
  currency text not null default 'IDR',
  updated_at timestamptz not null default now()
);
insert into public.payment_settings(id) values(1) on conflict(id) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active') $$;

grant execute on function public.is_admin() to anon, authenticated;

-- Admin can see/manage operational data, but secrets are never stored in this table.
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles for select using (true);

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists pastes_admin_all on public.pastes;
create policy pastes_admin_all on public.pastes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders for select using (public.is_admin() or buyer_id=auth.uid() or seller_id=auth.uid());

drop policy if exists access_admin_read on public.product_access;
create policy access_admin_read on public.product_access for select using (public.is_admin() or buyer_id=auth.uid());

drop policy if exists tx_admin_read on public.transactions;
create policy tx_admin_read on public.transactions for select using (public.is_admin() or user_id=auth.uid());

drop policy if exists withdrawal_admin_all on public.withdrawals;
create policy withdrawal_admin_all on public.withdrawals for all using (public.is_admin() or user_id=auth.uid()) with check (public.is_admin() or user_id=auth.uid());

drop policy if exists payment_settings_public_read on public.payment_settings;
create policy payment_settings_public_read on public.payment_settings for select using (enabled=true or public.is_admin());
drop policy if exists payment_settings_admin_write on public.payment_settings;
create policy payment_settings_admin_write on public.payment_settings for all using (public.is_admin()) with check (public.is_admin());

grant select on public.payment_settings to anon, authenticated;
grant insert,update,delete on public.payment_settings to authenticated;

create or replace function public.request_withdrawal(
  p_amount bigint,
  p_method text,
  p_account_name text,
  p_account_number text
) returns public.withdrawals
language plpgsql security definer set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_balance bigint; v_pending boolean; w public.withdrawals;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount < 10000 then raise exception 'Minimum withdrawal is Rp10.000'; end if;
  if coalesce(trim(p_method),'')='' or coalesce(trim(p_account_name),'')='' or coalesce(trim(p_account_number),'')='' then raise exception 'Withdrawal account is incomplete'; end if;
  select balance into v_balance from public.profiles where id=v_user for update;
  if v_balance is null then raise exception 'Profile not found'; end if;
  select exists(select 1 from public.withdrawals where user_id=v_user and status in ('pending','processing')) into v_pending;
  if v_pending then raise exception 'A withdrawal is already in progress'; end if;
  if v_balance < p_amount then raise exception 'Insufficient balance'; end if;
  update public.profiles set balance=balance-p_amount where id=v_user;
  insert into public.withdrawals(user_id,amount,method,account_name,account_number,status)
  values(v_user,p_amount,trim(p_method),trim(p_account_name),trim(p_account_number),'pending') returning * into w;
  insert into public.transactions(user_id,type,amount,description) values(v_user,'withdrawal',-p_amount,'Withdrawal request');
  return w;
end $$;

grant execute on function public.request_withdrawal(bigint,text,text,text) to authenticated;

create or replace function public.admin_update_withdrawal(
  p_withdrawal_id uuid,
  p_status text,
  p_note text default null
) returns public.withdrawals
language plpgsql security definer set search_path=public
as $$
declare w public.withdrawals; v_old text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('processing','paid','rejected') then raise exception 'Invalid withdrawal status'; end if;
  select * into w from public.withdrawals where id=p_withdrawal_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  v_old:=w.status;
  if v_old in ('paid','rejected') then raise exception 'Withdrawal already finalized'; end if;
  if p_status='rejected' then
    update public.profiles set balance=balance+w.amount where id=w.user_id;
    insert into public.transactions(user_id,type,amount,description) values(w.user_id,'adjustment',w.amount,coalesce(p_note,'Withdrawal rejected - balance returned'));
  end if;
  update public.withdrawals set status=p_status,note=p_note,processed_at=case when p_status in ('paid','rejected') then now() else processed_at end where id=w.id returning * into w;
  return w;
end $$;

grant execute on function public.admin_update_withdrawal(uuid,text,text) to authenticated;

create or replace function public.admin_set_member_role(p_user_id uuid,p_role text)
returns public.profiles language plpgsql security definer set search_path=public
as $$
declare p public.profiles;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_role not in ('user','admin','suspended') then raise exception 'Invalid role'; end if;
  if p_user_id=auth.uid() and p_role<>'admin' then raise exception 'You cannot remove your own admin role'; end if;
  update public.profiles set role=p_role,status=case when p_role='suspended' then 'suspended' else 'active' end where id=p_user_id returning * into p;
  if not found then raise exception 'Member not found'; end if;
  return p;
end $$;
grant execute on function public.admin_set_member_role(uuid,text) to authenticated;

create or replace function public.admin_adjust_balance(p_user_id uuid,p_amount bigint,p_description text default 'Admin balance adjustment')
returns public.profiles language plpgsql security definer set search_path=public
as $$
declare p public.profiles;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_amount=0 then raise exception 'Adjustment cannot be zero'; end if;
  update public.profiles set balance=balance+p_amount where id=p_user_id and balance+p_amount>=0 returning * into p;
  if not found then raise exception 'Member not found or balance would become negative'; end if;
  insert into public.transactions(user_id,type,amount,description) values(p_user_id,'adjustment',p_amount,p_description);
  return p;
end $$;
grant execute on function public.admin_adjust_balance(uuid,bigint,text) to authenticated;

-- Safe order creation: never trust amount/seller from the browser.
revoke insert on public.orders from authenticated;
revoke update,delete on public.orders from authenticated;
grant execute on function public.create_order(uuid) to authenticated;

-- Product access must only be exposed after a verified payment.
create or replace function public.complete_paid_order(p_order_id uuid, p_payment_reference text default null)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare o public.orders; p public.products;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status='paid' then return o; end if;
  if o.status not in ('pending','expired') then raise exception 'Order cannot be paid'; end if;
  select * into p from public.products where id=o.product_id;
  if not found then raise exception 'Product not found'; end if;
  update public.orders set status='paid',payment_reference=coalesce(p_payment_reference,payment_reference),paid_at=now() where id=o.id returning * into o;
  update public.profiles set balance=balance+o.amount where id=o.seller_id;
  insert into public.product_access(order_id,product_id,buyer_id,delivery_url) values(o.id,o.product_id,o.buyer_id,p.delivery_url) on conflict(order_id) do update set delivery_url=excluded.delivery_url;
  insert into public.transactions(user_id,order_id,type,amount,description) values(o.seller_id,o.id,'sale',o.amount,'Product sale') on conflict do nothing;
  insert into public.transactions(user_id,order_id,type,amount,description) values(o.buyer_id,o.id,'purchase',-o.amount,'Product purchase') on conflict do nothing;
  return o;
end $$;
grant execute on function public.complete_paid_order(uuid,text) to service_role;

-- Admin may edit payment/content operational data through RLS, while API secrets stay in Edge Function secrets.

create or replace function public.admin_mark_order_paid(p_order_id uuid,p_payment_reference text default null)
returns public.orders language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return public.complete_paid_order(p_order_id,p_payment_reference);
end $$;
grant execute on function public.admin_mark_order_paid(uuid,text) to authenticated;

create or replace function public.admin_cancel_order(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path=public
as $$
declare o public.orders;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status='paid' then raise exception 'Paid order cannot be cancelled from this action'; end if;
  update public.orders set status='cancelled' where id=o.id returning * into o;
  return o;
end $$;
grant execute on function public.admin_cancel_order(uuid) to authenticated;

-- Bootstrap admin: after creating your account, replace the UUID below and run once.
-- update public.profiles set role='admin' where id='YOUR-AUTH-USER-UUID';

-- Supabase Edge Function payment contract (generic provider adapter):
-- create-payment receives { order_id }, verifies the authenticated buyer owns the order,
-- reads payment_settings, calls your provider using Edge Function secrets, then updates
-- orders.payment_url/payment_reference. Never put API keys in assets/config.js.
-- payment-webhook receives a provider webhook, verifies PAYMENT_WEBHOOK_SECRET,
-- then calls complete_paid_order(order_id, reference).

-- Privacy hardening: member balances are private. Public pages do not need the profiles table.
drop policy if exists profiles_select_public on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles for select using (auth.uid()=id or public.is_admin());
revoke select on public.profiles from anon;
grant select on public.profiles to authenticated;

-- PasteLink privacy hardening: raw paste rows are not public-readable because they contain content/password.
drop policy if exists pastes_public_read on public.pastes;
drop policy if exists pastes_select_own_or_admin on public.pastes;
create policy pastes_select_own_or_admin on public.pastes for select using (owner_id=auth.uid() or public.is_admin());
revoke select on public.pastes from anon;
grant select on public.pastes to authenticated;

create or replace function public.get_paste(p_slug text,p_password text default null)
returns table(title text,content text,visibility text)
language plpgsql security definer set search_path=public
as $$
declare p public.pastes;
begin
  select * into p from public.pastes where slug=p_slug;
  if not found then raise exception 'Paste not found'; end if;
  if p.visibility='private' and p.owner_id<>auth.uid() then raise exception 'Private paste'; end if;
  if p.password is not null and p.password<>coalesce(p_password,'') then raise exception 'Password required or invalid password'; end if;
  return query select p.title,p.content,p.visibility;
end $$;
grant execute on function public.get_paste(text,text) to anon, authenticated;
