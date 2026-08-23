

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

