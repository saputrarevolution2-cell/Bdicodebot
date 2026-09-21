-- PasTele Admin Panel RLS / RPC FINAL FIX
-- Run once in Supabase SQL Editor.
-- The browser must be authenticated. Admin identity is the current auth.uid()
-- whose profiles row has username=admin, is_admin=true OR role admin/owner,
-- and is not banned.

CREATE OR REPLACE FUNCTION public.admin_access_check()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','login');
  END IF;

  SELECT * INTO p
  FROM public.profiles
  WHERE id = uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'reason','profile_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', (
      lower(btrim(coalesce(p.username,''))) = 'admin'
      AND coalesce(p.is_banned,false) = false
      AND (coalesce(p.is_admin,false) = true OR lower(coalesce(p.role,'')) IN ('admin','owner'))
    ),
    'id', p.id,
    'username', p.username,
    'auth_email', p.auth_email,
    'is_admin', coalesce(p.is_admin,false),
    'role', p.role,
    'is_banned', coalesce(p.is_banned,false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((public.admin_access_check()->>'ok')::boolean, false);
$$;

REVOKE ALL ON FUNCTION public.admin_access_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_access_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- Keep profile RLS from exposing other users to ordinary authenticated users.
-- Admin access is evaluated by the SECURITY DEFINER RPC above, not by a direct
-- client-side SELECT of another profile.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
CREATE POLICY profiles_update_own_or_admin
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_current_user_admin())
WITH CHECK (id = auth.uid() OR public.is_current_user_admin());

-- Verification (safe in SQL editor; SQL editor has no auth.uid, so this will be false there).
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE pronamespace='public'::regnamespace
  AND proname IN ('admin_access_check','is_current_user_admin')
ORDER BY proname;
