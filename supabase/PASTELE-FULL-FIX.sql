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



-- Rebuild the unified marketplace view so analytics events also provide views
-- for Code/Channel/Group rows that do not have a native views column.
drop view if exists public.marketplace_public;
create view public.marketplace_public as
select p.id,p.slug,p.title,p.type,p.access_type,p.price,p.thumbnail_url,p.description,p.content,
       greatest(p.views,coalesce((select count(*) from analytics_events ae where ae.target_id=p.id and ae.event_type='view' and ae.target_type=p.type),0)) views,
       p.sales_count,p.category,p.created_at,
       coalesce(pr.display_name,pr.username,'Creator') creator_name,pr.username creator_username,coalesce(p.creator_id,p.seller_id) owner_id
from public.products p left join public.profiles pr on pr.id=coalesce(p.creator_id,p.seller_id)
where p.status='published'
union all
select pl.id,pl.slug,pl.title,'link','free',0,null,pl.description,pl.content_html,
       greatest(pl.views,coalesce((select count(*) from analytics_events ae where ae.target_id=pl.id and ae.event_type in ('view')),0)),0,'PasteLink',pl.created_at,
       coalesce(pr.display_name,pr.username,'Creator'),pr.username,pl.user_id
from public.pastelinks pl left join public.profiles pr on pr.id=pl.user_id
where pl.visibility='public' and (pl.expires_at is null or pl.expires_at>now())
union all
select tp.id,'code-'||replace(tp.id::text,'-',''),tp.title,'code',tp.access_type,tp.price,null,tp.description,'',
       coalesce((select count(*) from analytics_events ae where ae.target_id=tp.id and ae.event_type='view'),0),0,'Code',tp.created_at,
       coalesce(pr.display_name,pr.username,'Creator'),pr.username,tp.owner_id
from public.telegram_products tp left join public.profiles pr on pr.id=tp.owner_id
where tp.is_published=true
union all
select tc.id,tc.type||'-'||replace(tc.id::text,'-',''),coalesce(tc.name,'Telegram'),tc.type,tc.access_type,tc.price,null,'',coalesce(tc.telegram_channel_id,''),
       coalesce((select count(*) from analytics_events ae where ae.target_id=tc.id and ae.event_type='view'),0),0,'Telegram',tc.created_at,
       coalesce(pr.display_name,pr.username,'Creator'),pr.username,tc.owner_id
from public.telegram_channels tc left join public.profiles pr on pr.id=tc.owner_id
where tc.is_published=true;
grant select on public.marketplace_public to anon,authenticated;

-- FINAL 2026 UI/transaction hardening ---------------------------------------
-- Ensure a wallet row exists for every profile and expose admin username login.
insert into public.wallets(user_id) select id from public.profiles p where not exists(select 1 from public.wallets w where w.user_id=p.id);

create or replace function public.get_my_content_counts()
returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object(
  'link',(select count(*) from products where coalesce(creator_id,seller_id)=auth.uid() and type in ('link','paste','pastelink'))+(select count(*) from pastelinks where user_id=auth.uid()),
  'code',(select count(*) from telegram_products where owner_id=auth.uid()),
  'channel',(select count(*) from telegram_channels where owner_id=auth.uid() and type='channel'),
  'group',(select count(*) from telegram_channels where owner_id=auth.uid() and type='group')
 );
$$;
grant execute on function public.get_my_content_counts() to authenticated;

create or replace function public.get_public_announcements(p_limit int default 50)
returns setof public.announcements language sql security definer set search_path=public as $$
 select * from public.announcements where published=true order by coalesce(published_at,created_at) desc limit least(greatest(coalesce(p_limit,50),1),100);
$$;
grant execute on function public.get_public_announcements(int) to anon,authenticated;

commit;
