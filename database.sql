-- ============================================================
-- TELECOD PRODUCTION DATABASE — REAL / NO DEMO DATA
-- Supabase PostgreSQL migration-safe schema + RLS + RPCs
-- ============================================================
create extension if not exists pgcrypto;

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  balance bigint not null default 0 check (balance >= 0),
  role text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  auth_email text unique,
  telegram_id bigint unique,
  telegram_username text
);
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists auth_email text;
alter table public.profiles add column if not exists telegram_id bigint;
alter table public.profiles add column if not exists telegram_username text;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user','admin','suspended'));
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('active','suspended'));

-- ---------- PRODUCTS ----------
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

-- ---------- PASTELINK ----------
create table if not exists public.pastes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  title text not null,
  slug text unique not null,
  content text not null,
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  password text,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrate old plaintext PasteLink passwords once, then remove plaintext storage.
update public.pastes
set password_hash = crypt(password, gen_salt('bf'))
where password is not null and nullif(password_hash,'') is null;
alter table public.pastes drop column if exists password;

-- ---------- ORDERS ----------
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

-- ---------- PRODUCT ACCESS ----------
create table if not exists public.product_access (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  delivery_url text,
  delivered_at timestamptz not null default now()
);

-- ---------- LEDGER ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('sale','purchase','withdrawal','refund','adjustment')),
  amount bigint not null,
  description text,
  created_at timestamptz not null default now()
);
create unique index if not exists transactions_order_type_uidx
  on public.transactions(order_id,type) where order_id is not null;

-- ---------- WITHDRAWALS ----------
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

-- ---------- PAYMENT CONFIG ----------
-- Contains public operational settings only. API secrets MUST be Edge Function secrets.
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

-- ---------- INDEXES ----------
create index if not exists products_status_created_idx on public.products(status,created_at desc);
create index if not exists products_seller_idx on public.products(seller_id);
create index if not exists pastes_slug_idx on public.pastes(slug);
create index if not exists orders_buyer_idx on public.orders(buyer_id,created_at desc);
create index if not exists orders_seller_idx on public.orders(seller_id,created_at desc);
create index if not exists transactions_user_idx on public.transactions(user_id,created_at desc);
create index if not exists withdrawals_user_idx on public.withdrawals(user_id,created_at desc);

-- ---------- TIMESTAMPS ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists pastes_updated_at on public.pastes;
create trigger pastes_updated_at before update on public.pastes for each row execute function public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists payment_settings_updated_at on public.payment_settings;
create trigger payment_settings_updated_at before update on public.payment_settings for each row execute function public.set_updated_at();

-- ---------- AUTH PROFILE TRIGGER ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  u text;
  display text;
  suffix text := substr(replace(new.id::text,'-',''),1,8);
begin
  u := coalesce(nullif(new.raw_user_meta_data->>'username',''),'user_'||substr(replace(new.id::text,'-',''),1,10));
  u := lower(regexp_replace(u,'[^a-zA-Z0-9_]','','g'));
  if length(u)<3 then u := 'user_'||substr(replace(new.id::text,'-',''),1,10); end if;
  if exists(select 1 from public.profiles where lower(username)=lower(u) and id<>new.id) then u := left(u,22)||'_'||suffix; end if;
  display := coalesce(nullif(new.raw_user_meta_data->>'display_name',''),nullif(new.raw_user_meta_data->>'full_name',''),split_part(coalesce(new.email,''),'@',1),'TeleCod User');
  insert into public.profiles(id,username,display_name,auth_email,telegram_id,telegram_username)
  values(new.id,u,display,new.email,nullif(new.raw_user_meta_data->>'telegram_id','')::bigint,nullif(new.raw_user_meta_data->>'telegram_username',''))
  on conflict(id) do update set
    display_name=coalesce(excluded.display_name,profiles.display_name),
    auth_email=coalesce(excluded.auth_email,profiles.auth_email),
    telegram_id=coalesce(excluded.telegram_id,profiles.telegram_id),
    telegram_username=coalesce(excluded.telegram_username,profiles.telegram_username),
    updated_at=now();
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- SECURITY HELPERS ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active') $$;

create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path=public
as $$
  select trim(leading '@' from coalesce(p_username,'')) ~ '^[A-Za-z0-9_]{3,32}$'
     and not exists(select 1 from public.profiles where lower(username)=lower(trim(leading '@' from p_username)));
$$;

grant execute on function public.is_admin() to anon,authenticated;
grant execute on function public.username_available(text) to anon,authenticated;

create or replace function public.resolve_username_login(p_username text)
returns text language sql security definer set search_path=public
as $$ select auth_email from public.profiles where lower(username)=lower(trim(leading '@' from p_username)) and status='active' limit 1 $$;
grant execute on function public.resolve_username_login(text) to anon,authenticated;

-- ---------- ORDER CREATION ----------
create or replace function public.create_order(p_product_id uuid)
returns public.orders language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); p public.products; o public.orders;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.profiles where id=v_user and status='suspended') then raise exception 'Account suspended'; end if;
  select * into p from public.products where id=p_product_id and status='published';
  if not found then raise exception 'Product unavailable'; end if;
  if p.seller_id=v_user then raise exception 'Seller cannot buy own product'; end if;
  if exists(select 1 from public.orders where buyer_id=v_user and product_id=p.id and status='paid') then raise exception 'Product already purchased'; end if;
  insert into public.orders(product_id,buyer_id,seller_id,amount) values(p.id,v_user,p.seller_id,p.price) returning * into o;
  return o;
end $$;
grant execute on function public.create_order(uuid) to authenticated;

-- ---------- PAYMENT COMPLETION (SERVICE ROLE ONLY) ----------
create or replace function public.complete_paid_order(p_order_id uuid,p_payment_reference text default null)
returns public.orders language plpgsql security definer set search_path=public as $$
declare o public.orders; p public.products;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status='paid' then return o; end if;
  if o.status<>'pending' then raise exception 'Order cannot be paid'; end if;
  select * into p from public.products where id=o.product_id;
  if not found then raise exception 'Product not found'; end if;
  update public.orders set status='paid',payment_reference=coalesce(p_payment_reference,payment_reference),paid_at=now() where id=o.id returning * into o;
  update public.profiles set balance=balance+o.amount where id=o.seller_id;
  insert into public.product_access(order_id,product_id,buyer_id,delivery_url)
  values(o.id,o.product_id,o.buyer_id,p.delivery_url)
  on conflict(order_id) do update set delivery_url=excluded.delivery_url;
  insert into public.transactions(user_id,order_id,type,amount,description)
  values(o.seller_id,o.id,'sale',o.amount,'Product sale') on conflict(order_id,type) do nothing;
  insert into public.transactions(user_id,order_id,type,amount,description)
  values(o.buyer_id,o.id,'purchase',-o.amount,'Product purchase') on conflict(order_id,type) do nothing;
  return o;
end $$;
revoke all on function public.complete_paid_order(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_paid_order(uuid,text) to service_role;

-- ---------- WITHDRAWAL ----------
create or replace function public.request_withdrawal(p_amount bigint,p_method text,p_account_name text,p_account_number text)
returns public.withdrawals language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_balance bigint; v_pending boolean; w public.withdrawals;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.profiles where id=v_user and status='suspended') then raise exception 'Account suspended'; end if;
  if p_amount<10000 then raise exception 'Minimum withdrawal is Rp10.000'; end if;
  if coalesce(trim(p_method),'')='' or coalesce(trim(p_account_name),'')='' or coalesce(trim(p_account_number),'')='' then raise exception 'Withdrawal account is incomplete'; end if;
  select balance into v_balance from public.profiles where id=v_user for update;
  if v_balance is null then raise exception 'Profile not found'; end if;
  select exists(select 1 from public.withdrawals where user_id=v_user and status in ('pending','processing')) into v_pending;
  if v_pending then raise exception 'A withdrawal is already in progress'; end if;
  if v_balance<p_amount then raise exception 'Insufficient balance'; end if;
  update public.profiles set balance=balance-p_amount where id=v_user;
  insert into public.withdrawals(user_id,amount,method,account_name,account_number) values(v_user,p_amount,trim(p_method),trim(p_account_name),trim(p_account_number)) returning * into w;
  insert into public.transactions(user_id,type,amount,description) values(v_user,'withdrawal',-p_amount,'Withdrawal request');
  return w;
end $$;
grant execute on function public.request_withdrawal(bigint,text,text,text) to authenticated;

create or replace function public.admin_update_withdrawal(p_withdrawal_id uuid,p_status text,p_note text default null)
returns public.withdrawals language plpgsql security definer set search_path=public as $$
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

-- ---------- ADMIN OPERATIONS ----------
create or replace function public.admin_set_member_role(p_user_id uuid,p_role text)
returns public.profiles language plpgsql security definer set search_path=public as $$
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
returns public.profiles language plpgsql security definer set search_path=public as $$
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

create or replace function public.admin_mark_order_paid(p_order_id uuid,p_payment_reference text default null)
returns public.orders language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return public.complete_paid_order(p_order_id,p_payment_reference);
end $$;
grant execute on function public.admin_mark_order_paid(uuid,text) to authenticated;

create or replace function public.admin_cancel_order(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path=public as $$
declare o public.orders;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status='paid' then raise exception 'Paid order cannot be cancelled'; end if;
  update public.orders set status='cancelled' where id=o.id returning * into o;
  return o;
end $$;
grant execute on function public.admin_cancel_order(uuid) to authenticated;

create or replace function public.admin_set_product_status(p_product_id uuid,p_status text)
returns public.products language plpgsql security definer set search_path=public as $$
declare p public.products;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('draft','published','archived') then raise exception 'Invalid product status'; end if;
  update public.products set status=p_status where id=p_product_id returning * into p;
  if not found then raise exception 'Product not found'; end if;
  return p;
end $$;
grant execute on function public.admin_set_product_status(uuid,text) to authenticated;

create or replace function public.admin_delete_product(p_product_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  delete from public.products where id=p_product_id;
end $$;
grant execute on function public.admin_delete_product(uuid) to authenticated;

create or replace function public.admin_delete_paste(p_paste_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  delete from public.pastes where id=p_paste_id;
end $$;
grant execute on function public.admin_delete_paste(uuid) to authenticated;

-- ---------- PASTELINK CREATION ----------
create or replace function public.create_paste(
  p_title text, p_slug text, p_content text, p_visibility text default 'public', p_password text default null
) returns public.pastes
language plpgsql security definer set search_path=public as $$
declare v_owner uuid:=auth.uid(); p public.pastes; v_hash text:=null;
begin
  if coalesce(trim(p_title),'')='' or length(trim(p_title))>180 then raise exception 'Invalid paste title'; end if;
  if not p_slug ~ '^[a-zA-Z0-9_-]{6,80}$' then raise exception 'Invalid paste slug'; end if;
  if coalesce(length(p_content),0)=0 or length(p_content)>1000000 then raise exception 'Invalid paste content'; end if;
  if p_visibility not in ('public','unlisted','private') then raise exception 'Invalid paste visibility'; end if;
  if v_owner is not null and exists(select 1 from public.profiles where id=v_owner and status='suspended') then raise exception 'Account suspended'; end if;
  if p_visibility='private' and v_owner is null then raise exception 'Private PasteLink requires login'; end if;
  if p_password is not null and length(p_password)>0 then v_hash:=crypt(p_password,gen_salt('bf')); end if;
  insert into public.pastes(owner_id,title,slug,content,visibility,password_hash)
  values(v_owner,trim(p_title),trim(p_slug),p_content,p_visibility,v_hash) returning * into p;
  return p;
exception when unique_violation then raise exception 'Paste slug already exists';
end $$;
grant execute on function public.create_paste(text,text,text,text,text) to anon,authenticated;

-- ---------- PASTELINK ACCESS ----------
create or replace function public.get_paste(p_slug text,p_password text default null)
returns table(title text,content text,visibility text)
language plpgsql security definer set search_path=public as $$
declare p public.pastes;
begin
  select * into p from public.pastes where slug=trim(p_slug);
  if not found then raise exception 'Paste not found'; end if;
  if p.visibility='private' and p.owner_id<>auth.uid() then raise exception 'Private paste'; end if;
  if p.password_hash is not null and crypt(coalesce(p_password,''),p.password_hash)<>p.password_hash then raise exception 'Password required or invalid password'; end if;
  return query select p.title,p.content,p.visibility;
end $$;
grant execute on function public.get_paste(text,text) to anon,authenticated;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.pastes enable row level security;
alter table public.orders enable row level security;
alter table public.product_access enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.payment_settings enable row level security;

-- Profiles: no public member directory; users can only see themselves, admins can see all.
drop policy if exists profiles_select_public on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles for select using (auth.uid()=id or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);

-- Products: published products are public; sellers manage only their own, admins manage all.
drop policy if exists products_public_read on public.products;
drop policy if exists products_admin_all on public.products;
drop policy if exists products_insert_own on public.products;
drop policy if exists products_update_own on public.products;
drop policy if exists products_delete_own on public.products;
create policy products_public_read on public.products for select using (status='published' or seller_id=auth.uid() or public.is_admin());
create policy products_insert_own on public.products for insert to authenticated with check (seller_id=auth.uid() and not exists(select 1 from public.profiles where id=auth.uid() and status='suspended'));
create policy products_update_own on public.products for update using (seller_id=auth.uid() or public.is_admin()) with check (seller_id=auth.uid() or public.is_admin());
create policy products_delete_own on public.products for delete using (seller_id=auth.uid() or public.is_admin());

-- Pastes: raw content is never public-readable. Public access uses get_paste().
drop policy if exists pastes_public_read on public.pastes;
drop policy if exists pastes_select_own_or_admin on public.pastes;
drop policy if exists pastes_insert_public on public.pastes;
drop policy if exists pastes_update_own on public.pastes;
drop policy if exists pastes_delete_own on public.pastes;
create policy pastes_select_own_or_admin on public.pastes for select using (owner_id=auth.uid() or public.is_admin());
create policy pastes_insert_public on public.pastes for insert to anon,authenticated
  with check ((owner_id is null and visibility in ('public','unlisted')) or owner_id=auth.uid());
create policy pastes_update_own on public.pastes for update using (owner_id=auth.uid() or public.is_admin()) with check (owner_id=auth.uid() or public.is_admin());
create policy pastes_delete_own on public.pastes for delete using (owner_id=auth.uid() or public.is_admin());

-- Orders / access / ledger / withdrawals.
drop policy if exists orders_buyer_read on public.orders;
drop policy if exists orders_admin_read on public.orders;
create policy orders_owner_or_admin_read on public.orders for select using (buyer_id=auth.uid() or seller_id=auth.uid() or public.is_admin());

drop policy if exists access_buyer_read on public.product_access;
create policy access_buyer_or_admin_read on public.product_access for select using (buyer_id=auth.uid() or public.is_admin());

drop policy if exists tx_owner_read on public.transactions;
create policy tx_owner_or_admin_read on public.transactions for select using (user_id=auth.uid() or public.is_admin());

drop policy if exists withdrawal_owner_read on public.withdrawals;
drop policy if exists withdrawal_owner_insert on public.withdrawals;
drop policy if exists withdrawal_admin_all on public.withdrawals;
create policy withdrawal_owner_or_admin_read on public.withdrawals for select using (user_id=auth.uid() or public.is_admin());
create policy withdrawal_admin_update on public.withdrawals for update using (public.is_admin()) with check (public.is_admin());
-- No direct INSERT/DELETE for users. request_withdrawal() is the only withdrawal creation path.

-- Payment settings: browser can read safe operational data only. Admin can write.
drop policy if exists payment_settings_public_read on public.payment_settings;
drop policy if exists payment_settings_admin_write on public.payment_settings;
create policy payment_settings_public_read on public.payment_settings for select using (enabled=true or public.is_admin());
create policy payment_settings_admin_write on public.payment_settings for update using (public.is_admin()) with check (public.is_admin());

-- ---------- GRANTS ----------
revoke all on public.profiles from anon,authenticated;
grant select(id,username,display_name,avatar_url,bio,balance,created_at,updated_at,role,status) on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update(display_name,avatar_url,bio) on public.profiles to authenticated;

revoke all on public.orders from anon,authenticated;
grant select on public.orders to authenticated;
revoke insert,update,delete on public.orders from authenticated;

grant select on public.products to anon,authenticated;
grant insert,update,delete on public.products to authenticated;

grant select on public.pastes to authenticated;
grant insert on public.pastes to anon,authenticated;
grant update,delete on public.pastes to authenticated;

grant select on public.product_access to authenticated;
grant select on public.transactions to authenticated;
revoke all on public.withdrawals from anon,authenticated;
grant select,update on public.withdrawals to authenticated;

grant select on public.payment_settings to anon,authenticated;
grant update on public.payment_settings to authenticated;

-- Keep these internal functions inaccessible except through their intended grants.
revoke all on function public.create_order(uuid) from anon;
revoke all on function public.request_withdrawal(bigint,text,text,text) from anon;
revoke all on function public.admin_update_withdrawal(uuid,text,text) from anon;
revoke all on function public.admin_set_member_role(uuid,text) from anon;
revoke all on function public.admin_adjust_balance(uuid,bigint,text) from anon;
revoke all on function public.admin_mark_order_paid(uuid,text) from anon;
revoke all on function public.admin_cancel_order(uuid) from anon;
revoke all on function public.admin_set_product_status(uuid,text) from anon;
revoke all on function public.admin_delete_product(uuid) from anon;
revoke all on function public.admin_delete_paste(uuid) from anon;

-- ---------- FIRST ADMIN BOOTSTRAP ----------
-- No demo/admin account is created automatically.
-- After creating your real account, run exactly once with your own UUID:
-- update public.profiles set role='admin',status='active' where id='YOUR-AUTH-USER-UUID';
-- Then remove this line from your operational notes; never expose admin UUIDs publicly.

-- ============================================================
-- TELECOD MARKETPLACE V2 — moderation, categories, settlement H+1
-- ============================================================
alter table public.profiles add column if not exists pending_balance bigint not null default 0 check (pending_balance >= 0);
alter table public.products add column if not exists asset_type text not null default 'code';
alter table public.products add column if not exists bot_username text;
alter table public.products add column if not exists bot_approval_status text not null default 'not_required';
alter table public.products add column if not exists channel_type text;
alter table public.products add column if not exists code_content text;
alter table public.products add column if not exists setup_instructions text;
alter table public.products add column if not exists settlement_days integer not null default 1;

alter table public.products drop constraint if exists products_asset_type_check;
alter table public.products add constraint products_asset_type_check check (asset_type in ('code','bot_18','bot_drama','bot_jav','channel_vip','channel_free','media','template','other'));
alter table public.products drop constraint if exists products_bot_approval_check;
alter table public.products add constraint products_bot_approval_check check (bot_approval_status in ('not_required','pending','approved','rejected','banned'));

create table if not exists public.bot_registry (
  id uuid primary key default gen_random_uuid(),
  bot_username text unique not null,
  display_name text,
  telegram_id bigint,
  status text not null default 'approved' check(status in ('approved','banned','review')),
  notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bot_registry_username_idx on public.bot_registry(lower(bot_username));

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  gross_amount bigint not null,
  platform_fee bigint not null,
  net_amount bigint not null,
  status text not null default 'pending' check(status in ('pending','available','reversed')),
  available_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists settlements_seller_status_idx on public.settlements(seller_id,status,available_at);

create table if not exists public.withdrawal_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  method text not null,
  account_name text not null,
  account_number text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.bot_is_approved(p_username text)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.bot_registry where lower(ltrim(p_username,'@'))=lower(ltrim(bot_username,'@')) and status='approved') $$;
grant execute on function public.bot_is_approved(text) to anon,authenticated;

create or replace function public.settle_due_sales(p_user_id uuid default auth.uid())
returns bigint language plpgsql security definer set search_path=public as $$
declare released bigint:=0; r record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_user_id<>auth.uid() and not public.is_admin() then raise exception 'Forbidden'; end if;
  for r in select * from public.settlements where seller_id=p_user_id and status='pending' and available_at<=now() for update loop
    update public.profiles set balance=balance+r.net_amount, pending_balance=greatest(0,pending_balance-r.net_amount) where id=r.seller_id;
    update public.settlements set status='available',released_at=now() where id=r.id;
    insert into public.transactions(user_id,order_id,type,amount,description) values(r.seller_id,r.order_id,'sale',r.net_amount,'Sale settlement H+1 released');
    released:=released+r.net_amount;
  end loop;
  return released;
end $$;
grant execute on function public.settle_due_sales(uuid) to authenticated;

create or replace function public.admin_settle_all()
returns bigint language plpgsql security definer set search_path=public as $$
declare total bigint:=0; r record;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  for r in select seller_id from public.settlements where status='pending' and available_at<=now() group by seller_id loop
    total:=total+public.settle_due_sales(r.seller_id);
  end loop;
  return total;
end $$;
grant execute on function public.admin_settle_all() to authenticated;

-- Replace payment completion so sellers receive 80% after H+1, never instantly.
create or replace function public.complete_paid_order(p_order_id uuid,p_payment_reference text default null)
returns public.orders language plpgsql security definer set search_path=public as $$
declare o public.orders; p public.products; fee bigint; net bigint;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status='paid' then return o; end if;
  if o.status<>'pending' then raise exception 'Order cannot be paid'; end if;
  select * into p from public.products where id=o.product_id and status='published';
  if not found then raise exception 'Product is no longer available'; end if;
  fee:=floor(o.amount*0.20); net:=o.amount-fee;
  update public.orders set status='paid',payment_reference=coalesce(p_payment_reference,payment_reference),paid_at=now() where id=o.id returning * into o;
  update public.profiles set pending_balance=pending_balance+net where id=o.seller_id;
  insert into public.settlements(order_id,seller_id,gross_amount,platform_fee,net_amount,available_at)
  values(o.id,o.seller_id,o.amount,fee,net,now()+interval '1 day') on conflict(order_id) do nothing;
  insert into public.product_access(order_id,product_id,buyer_id,delivery_url) values(o.id,o.product_id,o.buyer_id,p.delivery_url) on conflict(order_id) do update set delivery_url=excluded.delivery_url,delivered_at=now();
  insert into public.transactions(user_id,order_id,type,amount,description) values(o.buyer_id,o.id,'purchase',-o.amount,'Product purchase') on conflict(order_id,type) do nothing;
  return o;
end $$;
revoke all on function public.complete_paid_order(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_paid_order(uuid,text) to service_role;

create or replace function public.create_market_product(
 p_title text,p_slug text,p_category text,p_description text,p_price bigint,p_delivery_type text,p_delivery_url text,p_thumbnail_url text,
 p_asset_type text,p_bot_username text,p_channel_type text,p_code_content text,p_setup_instructions text
) returns public.products language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); r public.products; approval text:='not_required'; st text:='published';
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_asset_type like 'bot_%' then
   if nullif(trim(p_bot_username),'') is null then raise exception 'Bot username wajib diisi'; end if;
   if public.bot_is_approved(p_bot_username) then approval:='approved'; st:='published'; else approval:='pending'; st:='draft'; end if;
 end if;
 insert into public.products(seller_id,title,slug,category,description,price,delivery_type,delivery_url,thumbnail_url,status,asset_type,bot_username,bot_approval_status,channel_type,code_content,setup_instructions)
 values(v_user,trim(p_title),lower(trim(p_slug)),trim(p_category),coalesce(p_description,''),p_price,p_delivery_type,nullif(p_delivery_url,''),nullif(p_thumbnail_url,''),st,p_asset_type,nullif(trim(p_bot_username),''),approval,nullif(trim(p_channel_type),''),nullif(p_code_content,''),nullif(p_setup_instructions,'')) returning * into r;
 return r;
end $$;
grant execute on function public.create_market_product(text,text,text,text,bigint,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.admin_set_bot_status(p_bot_id uuid,p_status text,p_notes text default null)
returns public.bot_registry language plpgsql security definer set search_path=public as $$
declare r public.bot_registry;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_status not in ('approved','banned','review') then raise exception 'Invalid bot status'; end if;
 update public.bot_registry set status=p_status,notes=p_notes,approved_by=case when p_status='approved' then auth.uid() else approved_by end,approved_at=case when p_status='approved' then now() else approved_at end,updated_at=now() where id=p_bot_id returning * into r;
 if not found then raise exception 'Bot not found'; end if;
 if p_status='approved' then update public.products set status='published',bot_approval_status='approved' where lower(ltrim(bot_username,'@'))=lower(ltrim(r.bot_username,'@')) and bot_approval_status='pending';
 elsif p_status='banned' then update public.products set status='archived',bot_approval_status='banned' where lower(ltrim(bot_username,'@'))=lower(ltrim(r.bot_username,'@'));
 end if;
 return r;
end $$;
grant execute on function public.admin_set_bot_status(uuid,text,text) to authenticated;

create or replace function public.admin_register_bot(p_username text,p_display_name text default null,p_telegram_id bigint default null,p_status text default 'approved',p_notes text default null)
returns public.bot_registry language plpgsql security definer set search_path=public as $$
declare r public.bot_registry;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 insert into public.bot_registry(bot_username,display_name,telegram_id,status,notes,approved_by,approved_at) values(ltrim(trim(p_username),'@'),p_display_name,p_telegram_id,p_status,p_notes,case when p_status='approved' then auth.uid() end,case when p_status='approved' then now() end)
 on conflict(bot_username) do update set display_name=excluded.display_name,telegram_id=excluded.telegram_id,status=excluded.status,notes=excluded.notes,approved_by=excluded.approved_by,approved_at=excluded.approved_at,updated_at=now() returning * into r;
 return r;
end $$;
grant execute on function public.admin_register_bot(text,text,bigint,text,text) to authenticated;

-- Public product browsing must not expose delivery/code fields.
revoke select on public.products from anon,authenticated;
grant select(id,title,slug,category,description,price,thumbnail_url,delivery_type,status,created_at,updated_at,seller_id,asset_type,bot_username,bot_approval_status,channel_type) on public.products to anon,authenticated;
grant select on public.bot_registry to authenticated;
revoke all on public.bot_registry from anon;
grant select(id,bot_username,display_name,telegram_id,status,notes,approved_by,approved_at,created_at,updated_at) on public.bot_registry to authenticated;
alter table public.bot_registry enable row level security;
drop policy if exists bot_admin_all on public.bot_registry;
create policy bot_admin_all on public.bot_registry for all using(public.is_admin()) with check(public.is_admin());

-- User-facing product detail helper exposes safe data only.
create or replace function public.get_product_by_slug(p_slug text)
returns table(id uuid,title text,slug text,category text,description text,price bigint,thumbnail_url text,delivery_type text,status text,seller_id uuid,asset_type text,bot_username text,bot_approval_status text,channel_type text)
language sql stable security definer set search_path=public as $$ select id,title,slug,category,description,price,thumbnail_url,delivery_type,status,seller_id,asset_type,bot_username,bot_approval_status,channel_type from public.products where slug=trim(p_slug) and status='published' limit 1 $$;
grant execute on function public.get_product_by_slug(text) to anon,authenticated;

-- Creator settlement summary.
create or replace function public.creator_stats()
returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); out json;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 perform public.settle_due_sales(uid);
 select json_build_object(
   'products',(select count(*) from public.products where seller_id=uid),
   'published',(select count(*) from public.products where seller_id=uid and status='published'),
   'sales',(select count(*) from public.orders where seller_id=uid and status='paid'),
   'gross',(select coalesce(sum(amount),0) from public.orders where seller_id=uid and status='paid'),
   'available',(select balance from public.profiles where id=uid),
   'pending',(select pending_balance from public.profiles where id=uid),
   'withdrawals',(select coalesce(sum(amount),0) from public.withdrawals where user_id=uid and status in ('pending','processing','paid'))
 ) into out;
 return out;
end $$;
grant execute on function public.creator_stats() to authenticated;
create or replace function public.get_paid_delivery(p_order_id uuid)
returns table(title text,code_content text,setup_instructions text,delivery_url text,delivered_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 return query select p.title,p.code_content,p.setup_instructions,a.delivery_url,a.delivered_at from public.product_access a join public.products p on p.id=a.product_id join public.orders o on o.id=a.order_id where a.order_id=p_order_id and o.buyer_id=uid and o.status='paid';
end $$;
grant execute on function public.get_paid_delivery(uuid) to authenticated;
alter table public.withdrawals add column if not exists fee bigint not null default 2500;
alter table public.withdrawals add column if not exists payout_amount bigint;
create or replace function public.request_withdrawal(p_amount bigint,p_method text,p_account_name text,p_account_number text)
returns public.withdrawals language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_balance bigint; v_pending boolean; w public.withdrawals; v_fee bigint;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if exists(select 1 from public.profiles where id=v_user and status='suspended') then raise exception 'Account suspended'; end if;
 if p_amount<10000 then raise exception 'Minimum withdrawal is Rp10.000'; end if;
 if lower(trim(p_method)) not in ('manual','instant','bank','dana','gopay','ovo','shopeepay') then raise exception 'Invalid withdrawal method'; end if;
 v_fee:=case when lower(trim(p_method))='instant' then 10000 else 2500 end;
 if coalesce(trim(p_account_name),'')='' or coalesce(trim(p_account_number),'')='' then raise exception 'Withdrawal account is incomplete'; end if;
 select balance into v_balance from public.profiles where id=v_user for update;
 select exists(select 1 from public.withdrawals where user_id=v_user and status in ('pending','processing')) into v_pending;
 if v_pending then raise exception 'A withdrawal is already in progress'; end if;
 if v_balance < p_amount+v_fee then raise exception 'Saldo tidak cukup untuk nominal + fee withdraw'; end if;
 update public.profiles set balance=balance-p_amount-v_fee where id=v_user;
 insert into public.withdrawals(user_id,amount,fee,payout_amount,method,account_name,account_number) values(v_user,p_amount,v_fee,p_amount,trim(p_method),trim(p_account_name),trim(p_account_number)) returning * into w;
 insert into public.transactions(user_id,type,amount,description) values(v_user,'withdrawal',-(p_amount+v_fee),'Withdrawal request + fee');
 return w;
end $$;
update public.payment_settings set provider='bayargg',mode='api' where id=1 and (provider is null or provider='manual');

-- Helpful view for admin settlement monitoring.
create or replace view public.creator_settlement_queue as
select s.id,s.order_id,s.seller_id,p.username,s.gross_amount,s.platform_fee,s.net_amount,s.status,s.available_at,s.released_at
from public.settlements s join public.profiles p on p.id=s.seller_id;
revoke all on public.creator_settlement_queue from anon,authenticated;
revoke select on public.profiles from authenticated;
grant select(id,username,display_name,avatar_url,bio,balance,pending_balance,created_at,updated_at,role,status) on public.profiles to authenticated;
