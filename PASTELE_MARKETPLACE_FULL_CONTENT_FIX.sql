-- PasTele Marketplace — FULL CONTENT LISTING FIX
-- Run this AFTER the PasTele master database SQL.
-- Safe listing metadata only. Does NOT expose paid content.

BEGIN;

-- Keep public profile metadata safe and available to both roles.
DROP VIEW IF EXISTS public.profile_public CASCADE;
CREATE VIEW public.profile_public AS
SELECT id, username, display_name, avatar_url, country
FROM public.profiles
WHERE is_banned = false;
GRANT SELECT ON public.profile_public TO anon, authenticated;

-- Canonical public listing view. This view contains metadata only.
DROP VIEW IF EXISTS public.marketplace_public CASCADE;
CREATE VIEW public.marketplace_public AS
SELECT p.id, p.slug, p.title, coalesce(p.type,'link') AS type,
       coalesce(p.access_type, CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END) AS access_type,
       coalesce(p.price,0) AS price, p.thumbnail_url, p.description,
       p.views, p.sales_count, p.category, p.created_at,
       pr.display_name AS creator_name, pr.username AS creator_username,
       coalesce(p.creator_id,p.seller_id) AS owner_id
FROM public.products p
LEFT JOIN public.profile_public pr ON pr.id=coalesce(p.creator_id,p.seller_id)
WHERE p.status IN ('published','active')

UNION ALL

SELECT p.id, p.slug, p.title, 'code'::text AS type,
       coalesce(p.access_type, CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END),
       coalesce(p.price,0), p.thumbnail_url, p.description,
       p.views, p.sales_count, p.category, p.created_at,
       pr.display_name, pr.username, p.owner_id
FROM public.telegram_products p
LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.status IN ('published','active')

UNION ALL

SELECT p.id, p.slug, p.name,
       CASE WHEN lower(coalesce(p.type,'channel'))='group' THEN 'group' ELSE 'channel' END,
       coalesce(p.access_type, CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END),
       coalesce(p.price,0), NULL::text, p.description,
       p.views, p.sales_count, p.category, p.created_at,
       pr.display_name, pr.username, p.owner_id
FROM public.telegram_channels p
LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.status IN ('published','active')

UNION ALL

SELECT p.id, p.slug, p.title, 'pastelink'::text,
       coalesce(p.access_type, CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END),
       coalesce(p.price,0), NULL::text, p.description,
       p.views, 0::bigint, 'General'::text, p.created_at,
       pr.display_name, pr.username, p.user_id
FROM public.pastelinks p
LEFT JOIN public.profile_public pr ON pr.id=p.user_id
WHERE p.visibility='public'
  AND (p.expires_at IS NULL OR p.expires_at>now());

-- Free Paste listings. Only a short preview is exposed.
-- IMPORTANT: no full paste content is returned here.

GRANT SELECT ON public.marketplace_public TO anon, authenticated;

-- SECURITY DEFINER RPC is the canonical frontend listing endpoint.
-- It returns only marketplace metadata and never content/content_html.
DROP FUNCTION IF EXISTS public.get_public_marketplace_items();
CREATE FUNCTION public.get_public_marketplace_items()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT p.id,p.slug,p.title,coalesce(p.type,'link') AS type,
           coalesce(p.access_type,CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END) AS access_type,
           coalesce(p.price,0) AS price,p.thumbnail_url,p.description,
           p.views,p.sales_count,p.category,p.created_at,
           pr.display_name AS creator_name,pr.username AS creator_username,
           coalesce(p.creator_id,p.seller_id) AS owner_id
    FROM public.products p
    LEFT JOIN public.profile_public pr ON pr.id=coalesce(p.creator_id,p.seller_id)
    WHERE p.status IN ('published','active')

    UNION ALL

    SELECT p.id,p.slug,p.title,'code'::text,
           coalesce(p.access_type,CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END),
           coalesce(p.price,0),p.thumbnail_url,p.description,
           p.views,p.sales_count,p.category,p.created_at,
           pr.display_name,pr.username,p.owner_id
    FROM public.telegram_products p
    LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
    WHERE p.status IN ('published','active')

    UNION ALL

    SELECT p.id,p.slug,p.name,
           CASE WHEN lower(coalesce(p.type,'channel'))='group' THEN 'group' ELSE 'channel' END,
           coalesce(p.access_type,CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END),
           coalesce(p.price,0),NULL::text,p.description,
           p.views,p.sales_count,p.category,p.created_at,
           pr.display_name,pr.username,p.owner_id
    FROM public.telegram_channels p
    LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
    WHERE p.status IN ('published','active')

    UNION ALL

    SELECT p.id,p.slug,p.title,'pastelink'::text,
           coalesce(p.access_type,CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END),
           coalesce(p.price,0),NULL::text,p.description,
           p.views,0::bigint,'General'::text,p.created_at,
           pr.display_name,pr.username,p.user_id
    FROM public.pastelinks p
    LEFT JOIN public.profile_public pr ON pr.id=p.user_id
    WHERE p.visibility='public'
      AND (p.expires_at IS NULL OR p.expires_at>now())

    UNION ALL

    SELECT p.id,p.slug,p.title,'paste'::text,'free'::text,0::numeric,NULL::text,
           left(coalesce(p.content,''),180),0::bigint,0::bigint,'General'::text,p.created_at,
           pr.display_name,pr.username,p.owner_id
    FROM public.pastes p
    LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
    WHERE p.visibility='public'
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_public_marketplace_items() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace_items() TO anon,authenticated;

COMMIT;

-- TEST after running:
-- SELECT jsonb_array_length(public.get_public_marketplace_items());
-- SELECT type, access_type, count(*) FROM public.marketplace_public GROUP BY type, access_type ORDER BY type, access_type;
