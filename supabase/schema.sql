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
