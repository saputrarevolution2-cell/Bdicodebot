-- TeleCod channel/group link fix
-- Run this in Supabase SQL Editor after deploying the updated frontend.
-- The existing telegram_channel_id column is used as the canonical Telegram URL/username/ID.

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
    select tp.owner_id,tp.title,tp.description,tp.content,tp.access_type,tp.price,
           coalesce(pr.display_name,pr.username,'Creator'),pr.username
      into v_owner,v_title,v_description,v_content,v_access,v_price,v_creator,v_username
    from public.telegram_products tp
    left join public.profiles pr on pr.id=tp.owner_id
    where tp.id=p_id and tp.is_published=true;
    v_exists := found;

  elsif v_type in ('channel','group') then
    select tc.owner_id,
           coalesce(tc.name,'Telegram'),
           '',
           coalesce(tc.telegram_channel_id,''),
           tc.access_type,
           tc.price,
           coalesce(pr.display_name,pr.username,'Creator'),
           pr.username
      into v_owner,v_title,v_description,v_content,v_access,v_price,v_creator,v_username
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
    select coalesce(p.creator_id,p.seller_id),p.title,p.description,p.content,
           p.access_type,p.price,p.views,
           coalesce(pr.display_name,pr.username,'Creator'),pr.username
      into v_owner,v_title,v_description,v_content,v_access,v_price,v_views,v_creator,v_username
    from public.products p
    left join public.profiles pr on pr.id=coalesce(p.creator_id,p.seller_id)
    where p.id=p_id and p.status='published';
    v_exists := found;

    if not v_exists then
      select pl.user_id,pl.title,pl.description,pl.content_html,
             'free',0,pl.views,
             coalesce(pr.display_name,pr.username,'Creator'),pr.username
        into v_owner,v_title,v_description,v_content,v_access,v_price,v_views,v_creator,v_username
      from public.pastelinks pl
      left join public.profiles pr on pr.id=pl.user_id
      where pl.id=p_id and pl.visibility='public'
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
      select 1 from public.purchases pu
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
    'channel_link',case when v_type in ('channel','group') and v_can_access then coalesce(v_content,'') else '' end,
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
