-- PasTele Marketplace FINAL SECURITY + LOAD FIX
-- 2026-09-19
--
-- marketplace_public remains SECURITY INVOKER, so Supabase's
-- Security Definer View warning is not triggered.
--
-- The browser does NOT query public.pastelinks directly.
-- A narrowly scoped SECURITY DEFINER FUNCTION returns only the public
-- marketplace metadata needed by the listing page. This function is not a
-- SECURITY DEFINER VIEW and exposes no content_html/password/content fields.

BEGIN;

-- 1) Keep the canonical view as SECURITY INVOKER.
ALTER VIEW public.marketplace_public SET (security_invoker = true);
GRANT SELECT ON public.marketplace_public TO anon, authenticated;

-- 2) Replace the previous RPC that returned SETOF marketplace_public.
--    That design could still be affected by the view's invoker semantics.
DROP FUNCTION IF EXISTS public.get_public_marketplace();

CREATE FUNCTION public.get_public_marketplace()
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  type text,
  access_type text,
  price numeric,
  thumbnail_url text,
  description text,
  views bigint,
  sales_count bigint,
  category text,
  created_at timestamptz,
  creator_name text,
  creator_username text,
  owner_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.slug,
    p.title,
    coalesce(p.type, 'link')::text,
    lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END))::text,
    coalesce(p.price,0)::numeric,
    p.thumbnail_url,
    p.description,
    coalesce(p.views,0)::bigint,
    coalesce(p.sales_count,0)::bigint,
    p.category,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    coalesce(p.creator_id,p.seller_id)
  FROM public.products p
  LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
  WHERE p.status IN ('published','active')

  UNION ALL

  SELECT
    p.id,
    p.slug,
    p.title,
    'code'::text,
    lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END))::text,
    coalesce(p.price,0)::numeric,
    p.thumbnail_url,
    p.description,
    coalesce(p.views,0)::bigint,
    coalesce(p.sales_count,0)::bigint,
    p.category,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    p.owner_id
  FROM public.telegram_products p
  LEFT JOIN public.profiles pr ON pr.id=p.owner_id
  WHERE p.status IN ('published','active')

  UNION ALL

  SELECT
    p.id,
    p.slug,
    p.name::text,
    CASE WHEN lower(coalesce(p.type,'channel'))='group' THEN 'group' ELSE 'channel' END::text,
    lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END))::text,
    coalesce(p.price,0)::numeric,
    NULL::text,
    p.description,
    coalesce(p.views,0)::bigint,
    coalesce(p.sales_count,0)::bigint,
    p.category,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    p.owner_id
  FROM public.telegram_channels p
  LEFT JOIN public.profiles pr ON pr.id=p.owner_id
  WHERE p.status IN ('published','active')

  UNION ALL

  SELECT
    p.id,
    p.slug,
    p.title,
    'pastelink'::text,
    lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END))::text,
    coalesce(p.price,0)::numeric,
    NULL::text,
    p.description,
    coalesce(p.views,0)::bigint,
    0::bigint,
    'General'::text,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    p.user_id
  FROM public.pastelinks p
  LEFT JOIN public.profiles pr ON pr.id=p.user_id
  WHERE p.visibility='public'
    AND (p.expires_at IS NULL OR p.expires_at>now())

  UNION ALL

  SELECT
    p.id,
    p.slug,
    p.title,
    'paste'::text,
    'free'::text,
    0::numeric,
    NULL::text,
    left(coalesce(p.content,''),180),
    0::bigint,
    0::bigint,
    'General'::text,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    p.owner_id
  FROM public.pastes p
  LEFT JOIN public.profiles pr ON pr.id=p.owner_id
  WHERE p.visibility='public'

  ORDER BY created_at DESC
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.get_public_marketplace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace() TO anon, authenticated;

COMMIT;

-- IMPORTANT:
-- Run this AFTER the canonical database has created the source tables.
-- Do not add a public SELECT policy to public.pastelinks just to make
-- paid PasteLinks appear; that would expose protected table columns.
