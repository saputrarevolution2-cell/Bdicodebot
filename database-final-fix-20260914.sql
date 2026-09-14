-- ============================================================
-- PasTele FINAL FIX PACK — 2026-09-14
-- Run AFTER database.sql. Idempotent.
-- ============================================================
BEGIN;

-- Public marketplace: the frontend no longer depends on a security-invoker
-- UNION view, but keep the view correct for other clients.
DROP VIEW IF EXISTS public.marketplace_public;
CREATE VIEW public.marketplace_public
WITH (security_invoker=true)
AS
SELECT p.id,p.slug,p.title,coalesce(p.type,'link') AS type,p.access_type,p.price,p.thumbnail_url,p.description,
       p.views,p.sales_count,p.category,p.created_at,
       pr.display_name AS creator_name,pr.username AS creator_username,
       coalesce(p.creator_id,p.seller_id) AS owner_id
FROM public.products p LEFT JOIN public.profile_public pr ON pr.id=coalesce(p.creator_id,p.seller_id)
WHERE p.status IN ('published','active')
UNION ALL
SELECT p.id,p.slug,p.title,'code'::text,p.access_type,p.price,p.thumbnail_url,p.description,
       p.views,p.sales_count,p.category,p.created_at,pr.display_name,pr.username,p.owner_id
FROM public.telegram_products p LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.status IN ('published','active')
UNION ALL
SELECT p.id,p.slug,p.name,CASE WHEN lower(coalesce(p.type,'channel'))='group' THEN 'group' ELSE 'channel' END,
       p.access_type,p.price,NULL::text,p.description,p.views,p.sales_count,p.category,p.created_at,
       pr.display_name,pr.username,p.owner_id
FROM public.telegram_channels p LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.status IN ('published','active')
UNION ALL
SELECT p.id,p.slug,p.title,'pastelink'::text,p.access_type,p.price,NULL::text,p.description,
       p.views,0::bigint,'General'::text,p.created_at,pr.display_name,pr.username,p.user_id
FROM public.pastelinks p LEFT JOIN public.profile_public pr ON pr.id=p.user_id
WHERE p.visibility='public' AND (p.expires_at IS NULL OR p.expires_at>now())
UNION ALL
SELECT p.id,p.slug,p.title,'paste'::text,'free'::text,0::numeric,NULL::text,
       left(coalesce(p.content,''),180),0::bigint,0::bigint,'General'::text,p.created_at,
       pr.display_name,pr.username,p.owner_id
FROM public.pastes p LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.visibility='public';

GRANT SELECT ON public.marketplace_public TO anon,authenticated;

-- Anonymous comments are allowed; user_id remains NULL for guests.
DROP POLICY IF EXISTS comments_anon_insert ON public.content_comments;
CREATE POLICY comments_anon_insert
ON public.content_comments
FOR INSERT TO anon
WITH CHECK (user_id IS NULL);

-- Guest like toggle. A deterministic UUID derived from a browser token is used
-- only as an anonymous actor identity; it never maps to auth.users.
CREATE OR REPLACE FUNCTION public.toggle_content_like_guest(
  p_target_id uuid,
  p_target_type text,
  p_guest_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  actor uuid;
  owner uuid;
  target text:=lower(btrim(coalesce(p_target_type,'')));
  existing uuid;
BEGIN
  IF p_target_id IS NULL OR length(btrim(coalesce(p_guest_token,''))) < 16 THEN
    RAISE EXCEPTION 'INVALID_GUEST_LIKE';
  END IF;

  actor := md5('pastele:guest:'||p_guest_token)::uuid;

  IF target IN ('product','link') THEN
    SELECT coalesce(creator_id,seller_id) INTO owner
    FROM public.products WHERE id=p_target_id AND status IN ('published','active');
  ELSIF target IN ('telegram_product','code') THEN
    SELECT owner_id INTO owner
    FROM public.telegram_products WHERE id=p_target_id AND status IN ('published','active');
  ELSIF target IN ('channel','group','telegram_channel') THEN
    SELECT owner_id INTO owner
    FROM public.telegram_channels WHERE id=p_target_id AND status IN ('published','active');
  ELSIF target='pastelink' THEN
    SELECT user_id INTO owner
    FROM public.pastelinks WHERE id=p_target_id AND visibility='public'
      AND (expires_at IS NULL OR expires_at>now());
  ELSIF target='paste' THEN
    SELECT owner_id INTO owner
    FROM public.pastes WHERE id=p_target_id AND visibility='public';
  END IF;

  IF owner IS NULL THEN RAISE EXCEPTION 'CONTENT_NOT_FOUND'; END IF;

  SELECT id INTO existing FROM public.content_likes
  WHERE actor_id=actor AND target_id=p_target_id AND target_type=target
  LIMIT 1;

  IF existing IS NULL THEN
    INSERT INTO public.content_likes(content_owner_id,actor_id,target_id,target_type)
    VALUES(owner,actor,p_target_id,target);
    RETURN jsonb_build_object('liked',true);
  ELSE
    DELETE FROM public.content_likes WHERE id=existing;
    RETURN jsonb_build_object('liked',false);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_content_like_guest(uuid,text,text) TO anon,authenticated;

-- Profile visit notification. Only an authenticated visitor can create one,
-- and self-visits are ignored.
CREATE OR REPLACE FUNCTION public.notify_profile_visit(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE uid uuid:=auth.uid(); visitor text;
BEGIN
  IF uid IS NULL OR p_profile_id IS NULL OR uid=p_profile_id THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_profile_id AND is_banned=false) THEN RETURN; END IF;
  SELECT coalesce(display_name,username,'User') INTO visitor FROM public.profiles WHERE id=uid;
  INSERT INTO public.notifications(user_id,title,body,notification_type,target_type,target_id)
  VALUES(p_profile_id,'Profil dikunjungi',visitor||' mengunjungi profil anda.','profile_visit','profile',uid);
END;
$$;
GRANT EXECUTE ON FUNCTION public.notify_profile_visit(uuid) TO authenticated;

-- Follow notification. SECURITY DEFINER avoids cross-user notification RLS issues.
CREATE OR REPLACE FUNCTION public.notify_follow_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE follower_name text;
BEGIN
  SELECT coalesce(display_name,username,'User') INTO follower_name
  FROM public.profiles WHERE id=NEW.follower_id;
  INSERT INTO public.notifications(user_id,title,body,notification_type,target_type,target_id)
  VALUES(NEW.creator_id,'Pengikut baru',follower_name||' mulai mengikuti anda.','follow','profile',NEW.follower_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_follow_event ON public.creator_followers;
CREATE TRIGGER trg_notify_follow_event
AFTER INSERT ON public.creator_followers
FOR EACH ROW EXECUTE FUNCTION public.notify_follow_event();

COMMIT;
