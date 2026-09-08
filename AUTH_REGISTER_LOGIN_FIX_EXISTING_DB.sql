-- PasTele AUTH REGISTER + LOGIN FIX
-- Safe patch for existing database. Does NOT delete user data.
CREATE OR REPLACE FUNCTION public.resolve_username_login(p_username text)
RETURNS TABLE(auth_email text,is_banned boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT p.auth_email,p.is_banned
  FROM public.profiles p
  WHERE lower(btrim(p.username))=lower(btrim(p_username))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(btrim(p.username))=lower(btrim(p_username))
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uname text;
  base text;
BEGIN
  base := coalesce(
    NEW.raw_user_meta_data->>'username',
    split_part(coalesce(NEW.email,''),'@',1),
    'user'
  );
  uname := lower(regexp_replace(base,'[^a-zA-Z0-9_]','','g'));
  IF uname='' THEN uname:='user'; END IF;
  uname := left(uname,32);

  WHILE EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.username)=lower(uname)
  ) LOOP
    uname := left(split_part(uname,'_',1),23)||'_'||floor(random()*99999999)::int;
    uname := left(uname,32);
  END LOOP;

  INSERT INTO public.profiles(id,username,auth_email,display_name)
  VALUES(
    NEW.id,
    uname,
    coalesce(NEW.email,''),
    coalesce(NEW.raw_user_meta_data->>'display_name',uname)
  )
  ON CONFLICT(id) DO UPDATE SET
    auth_email=excluded.auth_email,
    updated_at=now();

  INSERT INTO public.wallets(user_id)
  VALUES(NEW.id)
  ON CONFLICT(user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Prevent case-sensitive duplicates going forward.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx
ON public.profiles(lower(username));

NOTIFY pgrst, 'reload schema';
