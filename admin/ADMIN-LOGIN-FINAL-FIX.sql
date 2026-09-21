-- PasTele: dedicated admin authentication check
CREATE OR REPLACE FUNCTION public.admin_access_check()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','login');
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id=auth.uid() LIMIT 1;
  IF p.id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','profile_missing');
  END IF;
  RETURN jsonb_build_object(
    'ok', lower(btrim(coalesce(p.username,'')))='admin'
      AND coalesce(p.is_banned,false)=false
      AND (coalesce(p.is_admin,false)=true OR lower(coalesce(p.role,'')) IN ('admin','owner')),
    'username',p.username,'auth_email',p.auth_email,
    'is_admin',coalesce(p.is_admin,false),'role',p.role,
    'is_banned',coalesce(p.is_banned,false),'user_id',p.id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_access_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_access_check() TO authenticated;
