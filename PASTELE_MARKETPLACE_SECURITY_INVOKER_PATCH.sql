-- PasTele Marketplace — Security Invoker View Fix
-- Run this AFTER the PasTele master SQL.
-- This fixes the Supabase linter findings for public.marketplace_public and
-- public.profile_public without changing the marketplace listing schema.
-- It does NOT grant access to paid content.

BEGIN;

ALTER VIEW IF EXISTS public.profile_public
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.marketplace_public
  SET (security_invoker = true);

GRANT SELECT ON public.profile_public TO anon, authenticated;
GRANT SELECT ON public.marketplace_public TO anon, authenticated;

COMMIT;

-- Verify: these should report security_invoker = true.
-- SELECT n.nspname AS schema_name, c.relname AS view_name,
--        c.reloptions
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relname IN ('profile_public','marketplace_public')
--   AND c.relkind = 'v';
