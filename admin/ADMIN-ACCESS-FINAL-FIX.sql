-- PasTele — ADMIN ACCESS FINAL FIX 2026-09-21
-- Run this ONCE in Supabase SQL Editor.
-- Access requires a real authenticated session whose profiles row is:
-- username = admin, not banned, and is_admin=true OR role=admin/owner.

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
  ok boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok',false,'reason','LOGIN_REQUIRED',
      'username',null,'auth_email',null,'is_admin',false,'role',null,'is_banned',false
    );
  END IF;

  SELECT * INTO p
  FROM public.profiles
  WHERE id = uid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok',false,'reason','PROFILE_NOT_FOUND',
      'username',null,'auth_email',null,'is_admin',false,'role',null,'is_banned',false
    );
  END IF;

  ok :=
    lower(btrim(coalesce(p.username,''))) = 'admin'
    AND coalesce(p.is_banned,false) = false
    AND (
      coalesce(p.is_admin,false) = true
      OR lower(btrim(coalesce(p.role,''))) IN ('admin','owner')
    );

  RETURN jsonb_build_object(
    'ok',ok,
    'reason',CASE WHEN ok THEN 'OK' ELSE 'NOT_ADMIN' END,
    'user_id',p.id,
    'username',p.username,
    'auth_email',p.auth_email,
    'is_admin',coalesce(p.is_admin,false),
    'role',p.role,
    'is_banned',coalesce(p.is_banned,false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_access_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_access_check() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(btrim(coalesce(p.username,''))) = 'admin'
      AND coalesce(p.is_banned,false) = false
      AND (
        coalesce(p.is_admin,false) = true
        OR lower(btrim(coalesce(p.role,''))) IN ('admin','owner')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- Verification in SQL Editor cannot see a browser auth.uid(), so this only
-- verifies that the functions exist. Test the actual access from /admin/ after login.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('admin_access_check','is_current_user_admin')
ORDER BY p.proname;
