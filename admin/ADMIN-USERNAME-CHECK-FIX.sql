-- PasTele Admin Username Check — FINAL
-- Run this once in Supabase SQL Editor. It does NOT grant admin by username alone:
-- the authenticated user must be username=admin, is_admin=true OR role admin/owner, and not banned.

CREATE OR REPLACE FUNCTION public.check_admin_username()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT jsonb_build_object(
    'ok', EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(btrim(coalesce(p.username,''))) = 'admin'
        AND coalesce(p.is_banned,false) = false
        AND (coalesce(p.is_admin,false) = true OR lower(coalesce(p.role,'')) IN ('admin','owner'))
    ),
    'username', p.username,
    'auth_email', p.auth_email,
    'is_admin', p.is_admin,
    'role', p.role,
    'is_banned', p.is_banned
  )
  FROM public.profiles p
  WHERE p.id = auth.uid()
  UNION ALL
  SELECT jsonb_build_object('ok',false,'username',null,'auth_email',null,'is_admin',false,'role',null,'is_banned',false)
  WHERE auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles x WHERE x.id=auth.uid());
$$;

REVOKE ALL ON FUNCTION public.check_admin_username() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_admin_username() TO authenticated;
