-- PasTele / Bdicodebot FINAL AUTH PATCH
-- For an EXISTING Supabase database. Does not delete auth.users or application data.
-- Run in Supabase SQL Editor as postgres/service-role.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Username resolver reads the canonical email from auth.users, not a stale profile email.
CREATE OR REPLACE FUNCTION public.resolve_username_login(p_username text)
RETURNS TABLE(auth_email text,is_banned boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth
AS $$
  SELECT COALESCE(u.email,p.auth_email), p.is_banned
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id=p.id
  WHERE lower(btrim(p.username))=lower(btrim(p_username))
  LIMIT 1;
$$;

-- 2) Availability check is case-insensitive.
CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(btrim(p.username))=lower(btrim(p_username))
  );
$$;

-- 3) Auth trigger: deterministic username, retry on a race, profile + wallet creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,auth
AS $$
DECLARE
  uname text;
  base text;
  n integer := 0;
BEGIN
  base := lower(regexp_replace(
    coalesce(NEW.raw_user_meta_data->>'username', split_part(coalesce(NEW.email,''),'@',1), 'user'),
    '[^a-zA-Z0-9_]','','g'));
  IF base='' THEN base:='user'; END IF;
  base := left(base,32);
  uname := base;

  LOOP
    BEGIN
      INSERT INTO public.profiles(id,username,auth_email,display_name)
      VALUES(NEW.id,uname,coalesce(NEW.email,''),coalesce(NEW.raw_user_meta_data->>'display_name',uname))
      ON CONFLICT(id) DO UPDATE SET auth_email=excluded.auth_email, updated_at=now();
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      n := n + 1;
      IF n > 20 THEN RAISE; END IF;
      uname := left(base,24) || '_' || lpad((floor(random()*100000000))::bigint::text,8,'0');
      uname := left(uname,32);
    END;
  END LOOP;

  -- Wallets may not exist in some legacy deployments; don't make Auth signup fail because of it.
  IF to_regclass('public.wallets') IS NOT NULL THEN
    EXECUTE 'INSERT INTO public.wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING' USING NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Repair missing profile rows for existing Auth users, with collision-safe usernames.
DO $$
DECLARE u record; uname text; base text; n integer;
BEGIN
  FOR u IN SELECT au.id,au.email,au.raw_user_meta_data FROM auth.users au
           LEFT JOIN public.profiles p ON p.id=au.id WHERE p.id IS NULL LOOP
    base := lower(regexp_replace(coalesce(u.raw_user_meta_data->>'username',split_part(coalesce(u.email,''),'@',1),'user'),'[^a-zA-Z0-9_]','','g'));
    IF base='' THEN base:='user'; END IF;
    base := left(base,32); uname := base; n := 0;
    WHILE EXISTS(SELECT 1 FROM public.profiles p WHERE lower(p.username)=lower(uname)) LOOP
      n := n + 1; IF n > 100 THEN RAISE EXCEPTION 'Unable to create unique username for auth user %',u.id; END IF;
      uname := left(base,23)||'_'||lpad(n::text,8,'0');
    END LOOP;
    INSERT INTO public.profiles(id,username,auth_email,display_name)
    VALUES(u.id,uname,coalesce(u.email,''),coalesce(u.raw_user_meta_data->>'display_name',uname))
    ON CONFLICT(id) DO NOTHING;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_username_login(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon,authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
