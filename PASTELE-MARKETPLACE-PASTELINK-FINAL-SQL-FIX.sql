-- PasTele FINAL MARKETPLACE FIX
-- Run once in Supabase SQL Editor.
-- Purpose: marketplace_public is metadata-only, so it may use the view
-- owner's permissions to include PAID PasteLink rows without exposing
-- content_html/content to the marketplace view.
BEGIN;
ALTER VIEW public.marketplace_public SET (security_invoker = false);
GRANT SELECT ON public.marketplace_public TO anon, authenticated;
COMMIT;
