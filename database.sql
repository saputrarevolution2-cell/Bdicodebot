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
-- TELECOD MARKETPLACE V2 — CREATOR APPROVAL / SETTLEMENT / CHANNELS
-- ============================================================
alter table public.profiles add column if not exists pending_balance bigint not null default 0 check (pending_balance >= 0);
alter table public.profiles add column if not exists telegram_verified boolean not null default false;
alter table public.products add column if not exists listing_type text not null default 'code';
alter table public.products add column if not exists bot_username text;
alter table public.products add column if not exists channel_url text;
alter table public.products add column if not exists code_version text;
alter table public.products add column if not exists approval_status text not null default 'approved';
alter table public.products add column if not exists admin_note text;
alter table public.products add column if not exists platform_fee_pct numeric(5,2) not null default 20.00;
alter table public.products add column if not exists published_at timestamptz;
alter table public.orders add column if not exists platform_fee bigint not null default 0;
alter table public.orders add column if not exists seller_net bigint not null default 0;
alter table public.orders add column if not exists settlement_at timestamptz;
alter table public.transactions add column if not exists available_at timestamptz not null default now();
alter table public.transactions add column if not exists settled_at timestamptz;
alter table public.withdrawals add column if not exists fee bigint not null default 0;
alter table public.withdrawals add column if not exists net_amount bigint not null default 0;

alter table public.products drop constraint if exists products_listing_type_check;
alter table public.products add constraint products_listing_type_check check (listing_type in ('code','channel'));
alter table public.products drop constraint if exists products_approval_status_check;
alter table public.products add constraint products_approval_status_check check (approval_status in ('pending','approved','rejected','banned'));

create table if not exists public.bot_registry (
  id uuid primary key default gen_random_uuid(),
  bot_username text unique not null,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active','banned','pending')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.product_secrets (
  product_id uuid primary key references public.products(id) on delete cascade,
  code_content text not null,
  usage_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  telegram_username text,
  email text,
  channel text not null check (channel in ('telegram_admin','email')),
  status text not null default 'pending' check (status in ('pending','handled','expired')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index if not exists bot_registry_username_idx on public.bot_registry(lower(bot_username));
create index if not exists products_listing_type_idx on public.products(listing_type,status,created_at desc);
create index if not exists products_bot_idx on public.products(lower(bot_username));
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);
create index if not exists settlement_idx on public.transactions(available_at,settled_at) where type='sale';

drop trigger if exists bot_registry_updated_at on public.bot_registry;
create trigger bot_registry_updated_at before update on public.bot_registry for each row execute function public.set_updated_at();
drop trigger if exists product_secrets_updated_at on public.product_secrets;
create trigger product_secrets_updated_at before update on public.product_secrets for each row execute function public.set_updated_at();

-- Public catalog reads only approved + published listings. Code payload stays in product_secrets.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (
  (status='published' and approval_status='approved') or seller_id=auth.uid() or public.is_admin()
);

-- Prevent direct seller insertion of new listings; creators use create_product_listing().
drop policy if exists products_insert_own on public.products;
create policy products_insert_own on public.products for insert to authenticated with check (false);

alter table public.bot_registry enable row level security;
alter table public.product_secrets enable row level security;
alter table public.notifications enable row level security;
alter table public.password_reset_requests enable row level security;

drop policy if exists bot_registry_admin_read on public.bot_registry;
drop policy if exists bot_registry_admin_write on public.bot_registry;
create policy bot_registry_admin_read on public.bot_registry for select using (public.is_admin());
create policy bot_registry_admin_write on public.bot_registry for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_secrets_owner_read on public.product_secrets;
create policy product_secrets_owner_read on public.product_secrets for select using (exists(select 1 from public.products p where p.id=product_id and (p.seller_id=auth.uid() or public.is_admin())));
drop policy if exists product_secrets_owner_write on public.product_secrets;
create policy product_secrets_owner_write on public.product_secrets for all using (exists(select 1 from public.products p where p.id=product_id and (p.seller_id=auth.uid() or public.is_admin()))) with check (exists(select 1 from public.products p where p.id=product_id and (p.seller_id=auth.uid() or public.is_admin())));

drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications for select using (user_id=auth.uid() or public.is_admin());
drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications for update using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
drop policy if exists password_reset_requests_admin_read on public.password_reset_requests;
create policy password_reset_requests_admin_read on public.password_reset_requests for select using (public.is_admin());

revoke all on public.bot_registry from anon,authenticated;
revoke all on public.product_secrets from anon,authenticated;
revoke all on public.notifications from anon,authenticated;
revoke all on public.password_reset_requests from anon,authenticated;
grant select on public.bot_registry to authenticated;
grant select on public.product_secrets to authenticated;
grant select,update on public.notifications to authenticated;
grant select on public.password_reset_requests to authenticated;

drop function if exists public.create_product_listing(text,text,text,text,bigint,text,text,text,text,text,text,text);
create or replace function public.create_product_listing(
  p_title text, p_slug text, p_category text, p_listing_type text, p_price bigint,
  p_description text, p_bot_username text, p_channel_url text, p_code_version text,
  p_code_content text, p_usage_instructions text, p_thumbnail_url text
) returns public.products
language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid(); p public.products; b public.bot_registry; v_status text:='pending'; v_approval text:='pending';
  v_bot text:=nullif(lower(trim(leading '@' from coalesce(p_bot_username,''))),'');
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.profiles where id=v_user and status='suspended') then raise exception 'Account suspended'; end if;
  if coalesce(trim(p_title),'')='' or length(trim(p_title))>180 then raise exception 'Invalid title'; end if;
  if not p_slug ~ '^[a-zA-Z0-9_-]{3,150}$' then raise exception 'Invalid slug'; end if;
  if p_price<1000 then raise exception 'Minimum price is Rp1.000'; end if;
  if p_listing_type not in ('code','channel') then raise exception 'Invalid listing type'; end if;
  if p_listing_type='code' then
    if v_bot is null then raise exception 'Bot username is required for bot code'; end if;
    if coalesce(trim(p_code_content),'')='' then raise exception 'Bot code is required'; end if;
    select * into b from public.bot_registry where lower(bot_username)=v_bot limit 1;
    if found and b.status='active' then v_status:='published'; v_approval:='approved';
    elsif found and b.status='banned' then v_status:='archived'; v_approval:='banned';
    else v_status:='draft'; v_approval:='pending'; end if;
  else
    if coalesce(trim(p_channel_url),'')='' then raise exception 'Channel link is required'; end if;
    v_status:='published'; v_approval:='approved';
  end if;
  insert into public.products(seller_id,title,slug,category,description,price,thumbnail_url,delivery_type,delivery_url,status,listing_type,bot_username,channel_url,code_version,approval_status,platform_fee_pct,published_at)
  values(v_user,trim(p_title),lower(trim(p_slug)),coalesce(nullif(trim(p_category),''),'Other'),coalesce(p_description,''),p_price,p_thumbnail_url,case when p_listing_type='channel' then 'telegram_channel' else 'digital' end,case when p_listing_type='channel' then p_channel_url else null end,v_status,p_listing_type,v_bot,p_channel_url,p_code_version,v_approval,20.00,case when v_status='published' then now() else null end)
  returning * into p;
  if p_listing_type='code' then
    insert into public.product_secrets(product_id,code_content,usage_instructions) values(p.id,p_code_content,coalesce(p_usage_instructions,''));
  end if;
  if v_approval='pending' then
    insert into public.notifications(user_id,type,title,message) values(v_user,'warning','Listing menunggu persetujuan','Bot belum terdaftar aktif di panel admin. Listing disimpan dan akan dipublikasikan setelah admin menyetujui bot.');
  end if;
  return p;
exception when unique_violation then raise exception 'Slug already exists';
end $$;
grant execute on function public.create_product_listing(text,text,text,text,bigint,text,text,text,text,text,text,text) to authenticated;

create or replace function public.admin_set_bot(
  p_bot_username text,p_status text,p_owner_id uuid default null,p_note text default null
) returns public.bot_registry language plpgsql security definer set search_path=public as $$
declare b public.bot_registry;
  v_bot text:=lower(trim(leading '@' from p_bot_username));
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if v_bot='' or p_status not in ('active','banned','pending') then raise exception 'Invalid bot registry data'; end if;
  insert into public.bot_registry(bot_username,owner_id,status,note) values(v_bot,p_owner_id,p_status,p_note)
  on conflict(bot_username) do update set owner_id=coalesce(excluded.owner_id,bot_registry.owner_id),status=excluded.status,note=excluded.note,updated_at=now()
  returning * into b;
  if p_status='active' then
    update public.products set status='published',approval_status='approved',published_at=coalesce(published_at,now()),admin_note=null where lower(bot_username)=v_bot and approval_status='pending';
  elsif p_status='banned' then
    update public.products set status='archived',approval_status='banned',admin_note=coalesce(p_note,'Bot banned by admin') where lower(bot_username)=v_bot;
  end if;
  return b;
end $$;
grant execute on function public.admin_set_bot(text,text,uuid,text) to authenticated;

create or replace function public.admin_set_product_approval(p_product_id uuid,p_status text,p_note text default null)
returns public.products language plpgsql security definer set search_path=public as $$
declare p public.products;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('approved','rejected','banned','pending') then raise exception 'Invalid approval status'; end if;
  update public.products set approval_status=p_status,status=case when p_status='approved' then 'published' when p_status in ('rejected','banned') then 'archived' else 'draft' end,admin_note=p_note,published_at=case when p_status='approved' then coalesce(published_at,now()) else published_at end where id=p_product_id returning * into p;
  if not found then raise exception 'Product not found'; end if;
  insert into public.notifications(user_id,type,title,message) values(p.seller_id,case when p_status='approved' then 'success' else 'error' end,'Listing status updated','Listing "'||p.title||'" status: '||p_status||coalesce(' — '||p_note,''));
  return p;
end $$;
grant execute on function public.admin_set_product_approval(uuid,text,text) to authenticated;

-- Secure delivery: buyers only receive code after a paid order exists.
drop function if exists public.get_purchased_product(uuid);
create or replace function public.get_purchased_product(p_product_id uuid)
returns table(id uuid,title text,description text,price bigint,listing_type text,bot_username text,channel_url text,code_content text,usage_instructions text)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return query
  select p.id,p.title,p.description,p.price,p.listing_type,p.bot_username,p.channel_url,s.code_content,s.usage_instructions
  from public.products p
  left join public.product_secrets s on s.product_id=p.id
  where p.id=p_product_id and exists(select 1 from public.orders o where o.product_id=p.id and o.buyer_id=v_user and o.status='paid');
  if not found then raise exception 'Paid purchase not found'; end if;
end $$;
grant execute on function public.get_purchased_product(uuid) to authenticated;

-- Rebuild payment completion with 20% platform fee and H+1 settlement.
create or replace function public.complete_paid_order(p_order_id uuid,p_payment_reference text default null)
returns public.orders language plpgsql security definer set search_path=public as $$
declare o public.orders; p public.products; v_fee bigint; v_net bigint;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status='paid' then return o; end if;
  if o.status<>'pending' then raise exception 'Order cannot be paid'; end if;
  select * into p from public.products where id=o.product_id and status='published' and approval_status='approved';
  if not found then raise exception 'Product unavailable'; end if;
  v_fee:=floor(o.amount*0.20);
  v_net:=o.amount-v_fee;
  update public.orders set status='paid',payment_reference=coalesce(p_payment_reference,payment_reference),paid_at=now(),platform_fee=v_fee,seller_net=v_net,settlement_at=now()+interval '1 day' where id=o.id returning * into o;
  insert into public.product_access(order_id,product_id,buyer_id,delivery_url)
  values(o.id,o.product_id,o.buyer_id,case when p.listing_type='channel' then p.channel_url else null end)
  on conflict(order_id) do update set delivery_url=excluded.delivery_url;
  update public.profiles set pending_balance=pending_balance+v_net where id=o.seller_id;
  insert into public.transactions(user_id,order_id,type,amount,description,available_at)
  values(o.seller_id,o.id,'sale',v_net,'Sale — 20% platform fee, H+1 settlement',now()+interval '1 day') on conflict(order_id,type) do nothing;
  insert into public.transactions(user_id,order_id,type,amount,description,available_at)
  values(o.buyer_id,o.id,'purchase',-o.amount,'Product purchase',now()) on conflict(order_id,type) do nothing;
  insert into public.notifications(user_id,type,title,message) values(o.seller_id,'success','Penjualan berhasil','Order diterima. Pendapatan bersih '||v_net||' akan tersedia setelah H+1.');
  insert into public.notifications(user_id,type,title,message) values(o.buyer_id,'success','Pembayaran berhasil','Pembelian berhasil. Produk sekarang tersedia di Dashboard.');
  return o;
end $$;
revoke all on function public.complete_paid_order(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_paid_order(uuid,text) to service_role;

create or replace function public.release_matured_settlements()
returns integer language plpgsql security definer set search_path=public as $$
declare r record; n integer:=0;
begin
  for r in select t.id,t.user_id,t.amount from public.transactions t where t.type='sale' and t.settled_at is null and t.available_at<=now() for update skip locked loop
    update public.profiles set balance=balance+r.amount,pending_balance=greatest(0,pending_balance-r.amount) where id=r.user_id;
    update public.transactions set settled_at=now() where id=r.id;
    insert into public.notifications(user_id,type,title,message) values(r.user_id,'success','Saldo tersedia','Pendapatan H+1 sebesar '||r.amount||' sekarang tersedia untuk withdraw.');
    n:=n+1;
  end loop;
  return n;
end $$;
grant execute on function public.release_matured_settlements() to authenticated;

-- Withdrawal fees: manual Rp2.500, instant Rp10.000.
drop function if exists public.request_withdrawal(bigint,text,text,text);
create or replace function public.request_withdrawal(p_amount bigint,p_method text,p_account_name text,p_account_number text)
returns public.withdrawals language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_balance bigint; v_pending boolean; w public.withdrawals; v_fee bigint; v_net bigint;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount<10000 then raise exception 'Minimum withdrawal is Rp10.000'; end if;
  if p_method not in ('manual','instant') then raise exception 'Withdrawal method must be manual or instant'; end if;
  v_fee:=case when p_method='instant' then 10000 else 2500 end;
  if p_amount<=v_fee then raise exception 'Withdrawal amount must exceed the withdrawal fee'; end if;
  v_net:=p_amount-v_fee;
  select balance into v_balance from public.profiles where id=v_user for update;
  select exists(select 1 from public.withdrawals where user_id=v_user and status in ('pending','processing')) into v_pending;
  if coalesce(v_pending,false) then raise exception 'A withdrawal is already in progress'; end if;
  if coalesce(v_balance,0)<p_amount then raise exception 'Insufficient available balance'; end if;
  update public.profiles set balance=balance-p_amount where id=v_user;
  insert into public.withdrawals(user_id,amount,method,account_name,account_number,fee,net_amount) values(v_user,p_amount,p_method,trim(p_account_name),trim(p_account_number),v_fee,v_net) returning * into w;
  insert into public.transactions(user_id,type,amount,description,available_at) values(v_user,'withdrawal',-p_amount,'Withdrawal request — fee '||v_fee,now());
  insert into public.notifications(user_id,type,title,message) values(v_user,'info','Withdraw diajukan','Request '||p_method||' berhasil. Fee '||v_fee||', diterima '||v_net||'.');
  return w;
end $$;
grant execute on function public.request_withdrawal(bigint,text,text,text) to authenticated;

create or replace function public.request_password_reset(p_channel text,p_identifier text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_email text; v_tg text; r uuid;
begin
  if p_channel not in ('telegram_admin','email') then raise exception 'Invalid reset channel'; end if;
  if p_channel='email' then
    select id,auth_email,telegram_username into v_id,v_email,v_tg from public.profiles where lower(auth_email)=lower(trim(p_identifier)) and status='active' limit 1;
  else
    select id,auth_email,telegram_username into v_id,v_email,v_tg from public.profiles where lower(telegram_username)=lower(trim(leading '@' from p_identifier)) and status='active' limit 1;
  end if;
  if v_id is null then raise exception 'Account not found'; end if;
  insert into public.password_reset_requests(user_id,telegram_username,email,channel) values(v_id,v_tg,v_email,p_channel) returning id into r;
  if p_channel='telegram_admin' then
    insert into public.notifications(user_id,type,title,message) values(v_id,'info','Reset password diminta','Permintaan reset dikirim ke admin. Admin akan mengirim instruksi reset satu kali melalui Telegram.');
  end if;
  return r;
end $$;
grant execute on function public.request_password_reset(text,text) to anon,authenticated;

-- Admin can mark a password reset request handled after assisting the user.
create or replace function public.admin_handle_reset_request(p_request_id uuid)
returns public.password_reset_requests language plpgsql security definer set search_path=public as $$
declare r public.password_reset_requests;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.password_reset_requests set status='handled',handled_at=now() where id=p_request_id returning * into r;
  if not found then raise exception 'Reset request not found'; end if;
  return r;
end $$;
grant execute on function public.admin_handle_reset_request(uuid) to authenticated;

-- Optional Supabase pg_cron schedule: if pg_cron is enabled in the project, run the following once:
-- select cron.schedule('telecod-release-h1','*/15 * * * *','select public.release_matured_settlements();');

-- Final privilege hardening for V2 fields.
revoke select on public.profiles from authenticated;
grant select(id,username,display_name,avatar_url,bio,balance,pending_balance,created_at,updated_at,role,status,auth_email,telegram_id,telegram_username,telegram_verified) on public.profiles to authenticated;
revoke insert,update,delete on public.products from authenticated;
grant select on public.products to anon,authenticated;
revoke insert,update,delete on public.bot_registry from authenticated;
revoke insert,update,delete on public.product_secrets from authenticated;
revoke insert,delete on public.notifications from authenticated;
revoke insert,update,delete on public.password_reset_requests from authenticated;

-- Notify admins when a creator submits a pending bot listing or a withdrawal.
create or replace function public.notify_admins_event(p_type text,p_title text,p_message text)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,type,title,message)
  select id,p_type,p_title,p_message from public.profiles where role='admin' and status='active';
end $$;
revoke all on function public.notify_admins_event(text,text,text) from public,anon,authenticated;

drop function if exists public.create_product_listing(text,text,text,text,bigint,text,text,text,text,text,text,text);
create or replace function public.create_product_listing(
  p_title text, p_slug text, p_category text, p_listing_type text, p_price bigint,
  p_description text, p_bot_username text, p_channel_url text, p_code_version text,
  p_code_content text, p_usage_instructions text, p_thumbnail_url text
) returns public.products
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); p public.products; b public.bot_registry; v_status text:='pending'; v_approval text:='pending'; v_bot text:=nullif(lower(trim(leading '@' from coalesce(p_bot_username,''))),'');
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.profiles where id=v_user and status='suspended') then raise exception 'Account suspended'; end if;
  if coalesce(trim(p_title),'')='' or length(trim(p_title))>180 then raise exception 'Invalid title'; end if;
  if not p_slug ~ '^[a-zA-Z0-9_-]{3,150}$' then raise exception 'Invalid slug'; end if;
  if p_price<1000 then raise exception 'Minimum price is Rp1.000'; end if;
  if p_listing_type not in ('code','channel') then raise exception 'Invalid listing type'; end if;
  if p_listing_type='code' then
    if v_bot is null then raise exception 'Bot username is required for bot code'; end if;
    if coalesce(trim(p_code_content),'')='' then raise exception 'Bot code is required'; end if;
    select * into b from public.bot_registry where lower(bot_username)=v_bot limit 1;
    if found and b.status='active' then v_status:='published'; v_approval:='approved';
    elsif found and b.status='banned' then v_status:='archived'; v_approval:='banned';
    else v_status:='draft'; v_approval:='pending'; end if;
  else
    if coalesce(trim(p_channel_url),'')='' then raise exception 'Channel link is required'; end if;
    v_status:='published'; v_approval:='approved';
  end if;
  insert into public.products(seller_id,title,slug,category,description,price,thumbnail_url,delivery_type,delivery_url,status,listing_type,bot_username,channel_url,code_version,approval_status,platform_fee_pct,published_at)
  values(v_user,trim(p_title),lower(trim(p_slug)),coalesce(nullif(trim(p_category),''),'Other'),coalesce(p_description,''),p_price,p_thumbnail_url,case when p_listing_type='channel' then 'telegram_channel' else 'digital' end,case when p_listing_type='channel' then p_channel_url else null end,v_status,p_listing_type,v_bot,p_channel_url,p_code_version,v_approval,20.00,case when v_status='published' then now() else null end)
  returning * into p;
  if p_listing_type='code' then
    insert into public.product_secrets(product_id,code_content,usage_instructions) values(p.id,p_code_content,coalesce(p_usage_instructions,''));
  end if;
  if v_approval='pending' then
    insert into public.notifications(user_id,type,title,message) values(v_user,'warning','Listing menunggu persetujuan','Bot belum terdaftar aktif di panel admin. Listing disimpan dan akan dipublikasikan setelah admin menyetujui bot.');
    perform public.notify_admins_event('warning','Pending bot listing','Creator '||v_user||' submitted bot @'||v_bot||' for approval: '||p.title);
  end if;
  return p;
exception when unique_violation then raise exception 'Slug already exists';
end $$;
grant execute on function public.create_product_listing(text,text,text,text,bigint,text,text,text,text,text,text,text) to authenticated;

-- Rebuild withdrawal request with admin notifications.
drop function if exists public.request_withdrawal(bigint,text,text,text);
create or replace function public.request_withdrawal(p_amount bigint,p_method text,p_account_name text,p_account_number text)
returns public.withdrawals language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_balance bigint; v_pending boolean; w public.withdrawals; v_fee bigint; v_net bigint;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount<10000 then raise exception 'Minimum withdrawal is Rp10.000'; end if;
  if p_method not in ('manual','instant') then raise exception 'Withdrawal method must be manual or instant'; end if;
  v_fee:=case when p_method='instant' then 10000 else 2500 end;
  if p_amount<=v_fee then raise exception 'Withdrawal amount must exceed the withdrawal fee'; end if;
  v_net:=p_amount-v_fee;
  select balance into v_balance from public.profiles where id=v_user for update;
  select exists(select 1 from public.withdrawals where user_id=v_user and status in ('pending','processing')) into v_pending;
  if coalesce(v_pending,false) then raise exception 'A withdrawal is already in progress'; end if;
  if coalesce(v_balance,0)<p_amount then raise exception 'Insufficient available balance'; end if;
  update public.profiles set balance=balance-p_amount where id=v_user;
  insert into public.withdrawals(user_id,amount,method,account_name,account_number,fee,net_amount) values(v_user,p_amount,p_method,trim(p_account_name),trim(p_account_number),v_fee,v_net) returning * into w;
  insert into public.transactions(user_id,type,amount,description,available_at) values(v_user,'withdrawal',-p_amount,'Withdrawal request — fee '||v_fee,now());
  insert into public.notifications(user_id,type,title,message) values(v_user,'info','Withdraw diajukan','Request '||p_method||' berhasil. Fee '||v_fee||', diterima '||v_net||'.');
  perform public.notify_admins_event('info','New withdrawal request','User '||v_user||' requested '||p_method||' withdrawal of '||p_amount||'.');
  return w;
end $$;
grant execute on function public.request_withdrawal(bigint,text,text,text) to authenticated;

-- Mark legacy sales from the pre-H+1 schema as already settled so migration never double-credits them.
update public.transactions
set settled_at=coalesce(settled_at,created_at)
where type='sale' and settled_at is null and available_at <= created_at + interval '5 minutes';

-- Allow free Telegram channel listings while keeping bot-code minimum price at Rp1.000.
alter table public.products drop constraint if exists products_price_check;
alter table public.products add constraint products_price_check check ((listing_type='channel' and price>=0) or (listing_type='code' and price>=1000));

create or replace function public.create_product_listing(
  p_title text, p_slug text, p_category text, p_listing_type text, p_price bigint,
  p_description text, p_bot_username text, p_channel_url text, p_code_version text,
  p_code_content text, p_usage_instructions text, p_thumbnail_url text
) returns public.products
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); p public.products; b public.bot_registry; v_status text:='pending'; v_approval text:='pending'; v_bot text:=nullif(lower(trim(leading '@' from coalesce(p_bot_username,''))),'');
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.profiles where id=v_user and status='suspended') then raise exception 'Account suspended'; end if;
  if coalesce(trim(p_title),'')='' or length(trim(p_title))>180 then raise exception 'Invalid title'; end if;
  if not p_slug ~ '^[a-zA-Z0-9_-]{3,150}$' then raise exception 'Invalid slug'; end if;
  if p_listing_type not in ('code','channel') then raise exception 'Invalid listing type'; end if;
  if p_listing_type='code' and p_price<1000 then raise exception 'Minimum bot-code price is Rp1.000'; end if;
  if p_listing_type='channel' and p_price<0 then raise exception 'Invalid channel price'; end if;
  if p_listing_type='code' then
    if v_bot is null then raise exception 'Bot username is required for bot code'; end if;
    if coalesce(trim(p_code_content),'')='' then raise exception 'Bot code is required'; end if;
    select * into b from public.bot_registry where lower(bot_username)=v_bot limit 1;
    if found and b.status='active' then v_status:='published'; v_approval:='approved';
    elsif found and b.status='banned' then v_status:='archived'; v_approval:='banned';
    else v_status:='draft'; v_approval:='pending'; end if;
  else
    if coalesce(trim(p_channel_url),'')='' then raise exception 'Channel link is required'; end if;
    v_status:='published'; v_approval:='approved';
  end if;
  insert into public.products(seller_id,title,slug,category,description,price,thumbnail_url,delivery_type,delivery_url,status,listing_type,bot_username,channel_url,code_version,approval_status,platform_fee_pct,published_at)
  values(v_user,trim(p_title),lower(trim(p_slug)),coalesce(nullif(trim(p_category),''),'Other'),coalesce(p_description,''),p_price,p_thumbnail_url,case when p_listing_type='channel' then 'telegram_channel' else 'digital' end,case when p_listing_type='channel' then p_channel_url else null end,v_status,p_listing_type,v_bot,p_channel_url,p_code_version,v_approval,20.00,case when v_status='published' then now() else null end)
  returning * into p;
  if p_listing_type='code' then insert into public.product_secrets(product_id,code_content,usage_instructions) values(p.id,p_code_content,coalesce(p_usage_instructions,'')); end if;
  if v_approval='pending' then
    insert into public.notifications(user_id,type,title,message) values(v_user,'warning','Listing menunggu persetujuan','Bot belum terdaftar aktif di panel admin. Listing disimpan dan akan dipublikasikan setelah admin menyetujui bot.');
    perform public.notify_admins_event('warning','Pending bot listing','Creator '||v_user||' submitted bot @'||v_bot||' for approval: '||p.title);
  end if;
  return p;
exception when unique_violation then raise exception 'Slug already exists';
end $$;
grant execute on function public.create_product_listing(text,text,text,text,bigint,text,text,text,text,text,text,text) to authenticated;
