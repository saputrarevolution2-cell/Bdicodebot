-- ============================================================
-- PasTele / Bdicodebot — SAFE FINAL PRODUCTION PATCH
-- Existing database: NO DROP, NO auth.users deletion.
-- Run once in Supabase SQL Editor as postgres/service-role.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- PROFILE COMPATIBILITY
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

UPDATE public.profiles
SET status='banned'
WHERE is_banned=true
  AND coalesce(status,'') <> 'banned';

UPDATE public.profiles
SET status='active'
WHERE is_banned=false
  AND lower(coalesce(status,'')) IN ('','banned','blocked','disabled','suspended');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx
ON public.profiles (lower(btrim(username)));

-- ------------------------------------------------------------
-- USERNAME -> CANONICAL AUTH EMAIL
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_username_login(p_username text)
RETURNS TABLE(auth_email text,is_banned boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public,auth
AS $$
  SELECT
    lower(coalesce(u.email,p.auth_email)),
    (p.is_banned OR lower(coalesce(p.status,'')) IN
      ('banned','blocked','disabled','suspended'))
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id=p.id
  WHERE lower(btrim(p.username))=lower(btrim(p_username))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT
    btrim(coalesce(p_username,'')) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE lower(btrim(p.username))=lower(btrim(p_username))
    );
$$;

GRANT EXECUTE ON FUNCTION public.resolve_username_login(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon,authenticated;

-- ------------------------------------------------------------
-- AUTH TRIGGER — collision safe, profile + wallet repair safe
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,auth
AS $$
DECLARE
  uname text;
  base text;
  n integer := 0;
BEGIN
  base := lower(regexp_replace(
    coalesce(
      NEW.raw_user_meta_data->>'username',
      split_part(coalesce(NEW.email,''),'@',1),
      'user'
    ),
    '[^a-zA-Z0-9_]','','g'
  ));

  IF base='' THEN base:='user'; END IF;
  base:=left(base,32);
  uname:=base;

  LOOP
    BEGIN
      INSERT INTO public.profiles(
        id,username,auth_email,display_name,status
      )
      VALUES(
        NEW.id,
        uname,
        coalesce(NEW.email,''),
        coalesce(NEW.raw_user_meta_data->>'display_name',uname),
        'active'
      )
      ON CONFLICT(id) DO UPDATE
      SET auth_email=excluded.auth_email,
          updated_at=now();
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      n:=n+1;
      IF n>50 THEN RAISE; END IF;
      uname:=left(base,23)||'_'||
        lpad((floor(random()*100000000))::bigint::text,8,'0');
      uname:=left(uname,32);
    END;
  END LOOP;

  -- Wallet creation must never make Auth signup fail.
  BEGIN
    IF to_regclass('public.wallets') IS NOT NULL THEN
      EXECUTE
        'INSERT INTO public.wallets(user_id)
         VALUES($1) ON CONFLICT(user_id) DO NOTHING'
      USING NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'PasTele wallet bootstrap skipped for %: %',NEW.id,SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- REPAIR EXISTING AUTH USERS
-- ------------------------------------------------------------
DO $$
DECLARE
  u record;
  uname text;
  base text;
  n integer;
BEGIN
  FOR u IN
    SELECT
      au.id,
      au.email,
      au.raw_user_meta_data,
      au.banned_until
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id=au.id
    WHERE p.id IS NULL
  LOOP
    base:=lower(regexp_replace(
      coalesce(
        u.raw_user_meta_data->>'username',
        split_part(coalesce(u.email,''),'@',1),
        'user'
      ),
      '[^a-zA-Z0-9_]','','g'
    ));

    IF base='' THEN base:='user'; END IF;
    base:=left(base,32);
    uname:=base;
    n:=0;

    WHILE EXISTS(
      SELECT 1 FROM public.profiles p
      WHERE lower(btrim(p.username))=lower(btrim(uname))
    ) LOOP
      n:=n+1;
      IF n>100 THEN
        RAISE EXCEPTION
          'Unable to create unique username for auth user %',u.id;
      END IF;
      uname:=left(base,23)||'_'||lpad(n::text,8,'0');
    END LOOP;

    INSERT INTO public.profiles(
      id,username,auth_email,display_name,status
    )
    VALUES(
      u.id,
      uname,
      coalesce(u.email,''),
      coalesce(u.raw_user_meta_data->>'display_name',uname),
      CASE WHEN u.banned_until IS NOT NULL THEN 'banned' ELSE 'active' END
    )
    ON CONFLICT(id) DO NOTHING;
  END LOOP;
END $$;

-- Sync canonical emails for existing profiles.
UPDATE public.profiles p
SET auth_email=lower(au.email),
    updated_at=now()
FROM auth.users au
WHERE au.id=p.id
  AND au.email IS NOT NULL
  AND p.auth_email IS DISTINCT FROM lower(au.email);

-- Bootstrap missing wallets without blocking the migration.
DO $$
DECLARE
  u uuid;
BEGIN
  IF to_regclass('public.wallets') IS NOT NULL THEN
    FOR u IN SELECT id FROM public.profiles LOOP
      BEGIN
        INSERT INTO public.wallets(user_id)
        VALUES(u)
        ON CONFLICT(user_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Wallet bootstrap skipped for %: %',u,SQLERRM;
      END;
    END LOOP;
  END IF;
END $$;

-- ------------------------------------------------------------
-- GRANTS / SCHEMA CACHE
-- ------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_username_login(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon,authenticated;

NOTIFY pgrst,'reload schema';

COMMIT;

-- Verification
SELECT
  'auth_patch_ok' AS result,
  (SELECT count(*) FROM auth.users) AS auth_users,
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM public.profiles WHERE auth_email IS NOT NULL) AS profiles_with_email;
