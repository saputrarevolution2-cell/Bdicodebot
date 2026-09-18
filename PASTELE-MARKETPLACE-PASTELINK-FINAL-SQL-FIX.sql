-- PasTele Marketplace Security Fix — 2026-09-19
-- Fixes Supabase "Security Definer View" on public.marketplace_public.
--
-- The VIEW stays SECURITY INVOKER. The browser does not read pastelinks
-- directly. A narrowly-scoped SECURITY DEFINER RPC returns only the columns
-- already exposed by marketplace_public.

BEGIN;

ALTER VIEW public.marketplace_public SET (security_invoker = true);
GRANT SELECT ON public.marketplace_public TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_public_marketplace();

CREATE FUNCTION public.get_public_marketplace()
RETURNS SETOF public.marketplace_public
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.marketplace_public
  ORDER BY created_at DESC
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.get_public_marketplace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace() TO anon, authenticated;

COMMIT;

-- Do NOT add an anonymous SELECT policy to public.pastelinks merely to make
-- paid PasteLinks appear. The marketplace must use the RPC above and never
-- select protected content_html/content fields in the listing query.
