-- PasTele ADMIN CHECK — FINAL SOURCE FIX 2026-09-21
-- The browser must have a real Supabase Auth session.
-- Username "admin" is required, but username alone never grants access.
-- The row must also be not banned and have is_admin=true OR role=admin/owner.

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

CREATE OR REPLACE FUNCTION public.check_admin_username()
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
    RETURN jsonb_build_object(
      'ok',false,'reason','LOGIN_REQUIRED',
      'username',null,'auth_email',null,'is_admin',false,'role',null,'is_banned',false
    );
  END IF;

  SELECT * INTO p
  FROM public.profiles
  WHERE id=uid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok',false,'reason','PROFILE_NOT_FOUND',
      'username',null,'auth_email',null,'is_admin',false,'role',null,'is_banned',false
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',
    lower(btrim(coalesce(p.username,'')))='admin'
    AND coalesce(p.is_banned,false)=false
    AND (
      coalesce(p.is_admin,false)=true
      OR lower(btrim(coalesce(p.role,''))) IN ('admin','owner')
    ),
    'username',p.username,
    'auth_email',p.auth_email,
    'is_admin',coalesce(p.is_admin,false),
    'role',p.role,
    'is_banned',coalesce(p.is_banned,false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_admin_username() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_admin_username() TO authenticated;
