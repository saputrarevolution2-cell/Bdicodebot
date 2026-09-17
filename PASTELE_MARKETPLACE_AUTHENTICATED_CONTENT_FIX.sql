-- PasTele Marketplace — Authenticated content listing fix
-- Run this AFTER the main PasTele database SQL.
-- Purpose: guests and logged-in users must see the same public marketplace listing types.
-- This does NOT expose paid content; it only exposes safe listing metadata.

BEGIN;

DROP VIEW IF EXISTS public.marketplace_public CASCADE;
CREATE VIEW public.marketplace_public AS
SELECT p.id,p.slug,p.title,coalesce(p.type,''link'') AS type,p.access_type,p.price,p.thumbnail_url,p.description,
       p.views,p.sales_count,p.category,p.created_at,
       pr.display_name AS creator_name,pr.username AS creator_username,
       coalesce(p.creator_id,p.seller_id) AS owner_id
FROM public.products p
LEFT JOIN public.profile_public pr ON pr.id=coalesce(p.creator_id,p.seller_id)
WHERE p.status IN (''published'',''active'')
UNION ALL
SELECT p.id,p.slug,p.title,''code''::text,p.access_type,p.price,p.thumbnail_url,p.description,
       p.views,p.sales_count,p.category,p.created_at,pr.display_name,pr.username,p.owner_id
FROM public.telegram_products p
LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.status IN (''published'',''active'')
UNION ALL
SELECT p.id,p.slug,p.name,CASE WHEN lower(coalesce(p.type,''channel''))=''group'' THEN ''group'' ELSE ''channel'' END,
       p.access_type,p.price,NULL::text,p.description,p.views,p.sales_count,p.category,p.created_at,
       pr.display_name,pr.username,p.owner_id
FROM public.telegram_channels p
LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.status IN (''published'',''active'')
UNION ALL
SELECT p.id,p.slug,p.title,''pastelink''::text,p.access_type,p.price,NULL::text,p.description,
       p.views,0::bigint,''General''::text,p.created_at,pr.display_name,pr.username,p.user_id
FROM public.pastelinks p
LEFT JOIN public.profile_public pr ON pr.id=p.user_id
WHERE p.visibility=''public'' AND (p.expires_at IS NULL OR p.expires_at>now())
UNION ALL
SELECT p.id,p.slug,p.title,''paste''::text,''free''::text,0::numeric,NULL::text,
       left(coalesce(p.content,),180),0::bigint,0::bigint,General::text,p.created_at,
       pr.display_name,pr.username,p.owner_id
FROM public.pastes p
LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.visibility=public;

GRANT SELECT ON public.marketplace_public TO anon,authenticated;

-- profile_public is already safe: only public profile fields are exposed.
DROP VIEW IF EXISTS public.profile_public CASCADE;
CREATE VIEW public.profile_public AS
SELECT id, username, display_name, avatar_url, country
FROM public.profiles
WHERE is_banned=false;

GRANT SELECT ON public.profile_public TO anon,authenticated;

COMMIT;

-- IMPORTANT: this patch changes LISTING visibility only.
-- Paid access must still be enforced by the product/payment/resolver RPCs.
