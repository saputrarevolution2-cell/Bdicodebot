-- PasTele Admin Isolated Login
-- Run once in Supabase SQL Editor.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_login_identity(p_username text)
RETURNS TABLE(auth_email text, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT p.auth_email, p.id
  FROM public.profiles p
  WHERE lower(btrim(coalesce(p.username,''))) = lower(btrim(coalesce(p_username,'')))
    AND lower(btrim(coalesce(p.username,''))) = 'admin'
    AND coalesce(p.is_banned,false)=false
    AND (coalesce(p.is_admin,false)=true OR lower(coalesce(p.role,'')) IN ('admin','owner'))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.admin_login_identity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_login_identity(text) TO anon, authenticated;
COMMIT;
