-- PasTele / Bdicodebot — Create Code access contract
-- FREE  : guest + authenticated
-- PAID  : authenticated only
-- Run AFTER the master SQL and AFTER the marketplace security-invoker patch.

BEGIN;

-- Keep the exact marketplace security patch supplied by the project.
ALTER VIEW IF EXISTS public.profile_public
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.marketplace_public
  SET (security_invoker = true);

GRANT SELECT ON public.profile_public TO anon, authenticated;
GRANT SELECT ON public.marketplace_public TO anon, authenticated;

-- Approved bot list: public users may read active approved bots only.
DROP POLICY IF EXISTS approved_bots_public_read ON public.approved_bots;
CREATE POLICY approved_bots_public_read
ON public.approved_bots
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  OR public.is_current_user_admin()
);

CREATE OR REPLACE FUNCTION public.get_active_approved_bots()
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', b.id,
    'bot_username', b.bot_username,
    'bot_name', b.bot_name,
    'bot_id', b.bot_id
  )
  FROM public.approved_bots b
  WHERE b.is_active = true
  ORDER BY lower(coalesce(b.bot_name, b.bot_username));
$$;

GRANT EXECUTE ON FUNCTION public.get_active_approved_bots()
TO anon, authenticated;

-- IMPORTANT:
-- Do NOT add a login requirement for Free here.
-- auth.uid() may be NULL for a guest and is intentionally stored as owner_id=NULL.
-- Paid is blocked server-side when auth.uid() is NULL.
CREATE OR REPLACE FUNCTION public.create_code_content(
  p_title text,
  p_content text,
  p_slug text,
  p_access_type text DEFAULT 'free',
  p_price numeric DEFAULT 0,
  p_description text DEFAULT '',
  p_approved_bot_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  a text := lower(btrim(coalesce(p_access_type, 'free')));
  pr numeric := coalesce(p_price, 0);
  b public.approved_bots;
  r public.telegram_products;
BEGIN
  IF btrim(coalesce(p_title, '')) = ''
     OR btrim(coalesce(p_content, '')) = '' THEN
    RAISE EXCEPTION 'TITLE_AND_CONTENT_REQUIRED';
  END IF;

  IF a NOT IN ('free', 'paid') THEN
    RAISE EXCEPTION 'INVALID_ACCESS_TYPE';
  END IF;

  -- PAID requires a real Supabase Auth session.
  IF a = 'paid' AND uid IS NULL THEN
    RAISE EXCEPTION 'LOGIN_REQUIRED_FOR_PAID';
  END IF;

  -- FREE is always free and can be created by a guest.
  IF a = 'free' THEN
    pr := 0;
  ELSE
    IF pr < 2000 OR pr > 100000 OR mod(pr, 1000) <> 0 THEN
      RAISE EXCEPTION 'INVALID_PAID_PRICE';
    END IF;
  END IF;

  IF p_approved_bot_id IS NULL THEN
    RAISE EXCEPTION 'APPROVED_BOT_REQUIRED';
  END IF;

  SELECT *
  INTO b
  FROM public.approved_bots
  WHERE id = p_approved_bot_id
    AND is_active = true;

  IF b.id IS NULL THEN
    RAISE EXCEPTION 'BOT_NOT_FOUND_OR_INACTIVE';
  END IF;

  INSERT INTO public.telegram_products(
    owner_id,
    title,
    slug,
    type,
    product_type,
    access_type,
    bot_username,
    telegram_bot_id,
    price,
    description,
    content,
    thumbnail_url,
    category,
    status,
    approved_bot_id
  )
  VALUES(
    uid,
    btrim(p_title),
    btrim(p_slug),
    'code',
    'code',
    a,
    b.bot_username,
    b.bot_id,
    pr,
    coalesce(p_description, ''),
    p_content,
    NULL,
    'General',
    'published',
    b.id
  )
  RETURNING * INTO r;

  RETURN jsonb_build_object(
    'ok', true,
    'id', r.id,
    'slug', r.slug,
    'access_type', r.access_type,
    'price', r.price
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_code_content(
  text, text, text, text, numeric, text, uuid
) TO anon, authenticated;

COMMIT;

-- Verification:
-- 1) Active bots must exist for the bot selector to have choices:
-- SELECT id, bot_username, bot_name, bot_id, is_active
-- FROM public.approved_bots
-- WHERE is_active = true
-- ORDER BY lower(coalesce(bot_name, bot_username));
--
-- 2) The RPC must be callable by anon/authenticated:
-- SELECT public.get_active_approved_bots();
