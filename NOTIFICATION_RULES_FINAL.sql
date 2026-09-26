-- PasTele FINAL NOTIFICATION RULES
-- View = never notify
-- Publish = global
-- Paid success = buyer + seller
-- Like = content owner only
-- Comment = content owner only
-- Follow = creator only (existing)
-- Withdrawal/system = keep existing system notifications

BEGIN;

-- 1) VIEW: never create a notification.
-- Keep the function for trigger compatibility, but make it a no-op.
CREATE OR REPLACE FUNCTION public.trg_notify_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- 2) LIKE: notify only the owner of the liked content.
CREATE OR REPLACE FUNCTION public.trg_notify_content_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  owner_id uuid := NEW.content_owner_id;
  actor_id uuid := NEW.actor_id;
  label text := 'Konten';
  kind text := lower(coalesce(NEW.target_type,'content'));
  actor_name text := 'Seseorang';
BEGIN
  IF owner_id IS NULL OR (actor_id IS NOT NULL AND owner_id = actor_id) THEN
    RETURN NEW;
  END IF;

  BEGIN
    IF kind='pastelink' THEN
      SELECT title INTO label FROM public.pastelinks WHERE id=NEW.target_id;
    ELSIF kind IN ('code','telegram_product') THEN
      SELECT title INTO label FROM public.telegram_products WHERE id=NEW.target_id;
    ELSIF kind IN ('channel','group','telegram_channel') THEN
      SELECT name INTO label FROM public.telegram_channels WHERE id=NEW.target_id;
    ELSIF kind IN ('product','link') THEN
      SELECT title INTO label FROM public.products WHERE id=NEW.target_id;
    ELSIF kind='paste' THEN
      SELECT title INTO label FROM public.pastes WHERE id=NEW.target_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    label := 'Konten';
  END;

  IF actor_id IS NOT NULL THEN
    SELECT coalesce(display_name,username,'User') INTO actor_name
    FROM public.profiles WHERE id=actor_id;
  END IF;

  PERFORM public.notify_user_once(
    owner_id,
    'Konten mendapat Like',
    actor_name || ' menyukai ' || kind || ' "' || coalesce(label,'Konten') || '".',
    'like',
    NULL,
    kind,
    NEW.target_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_content_like ON public.content_likes;
CREATE TRIGGER trg_notify_content_like
AFTER INSERT ON public.content_likes
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_content_like();

-- 3) COMMENT: notify only the owner of the commented content.
CREATE OR REPLACE FUNCTION public.trg_notify_content_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  owner_id uuid;
  actor_id uuid := NEW.user_id;
  actor_name text := coalesce(nullif(btrim(NEW.display_name),''),'Guest');
  label text := 'Konten';
  kind text := lower(coalesce(NEW.target_type,'content'));
  target_url text := NULL;
BEGIN
  IF NEW.target_id IS NULL THEN RETURN NEW; END IF;

  IF kind='pastelink' THEN
    SELECT user_id,title INTO owner_id,label FROM public.pastelinks WHERE id=NEW.target_id;
    SELECT 'paste-view.html?slug='||slug INTO target_url FROM public.pastelinks WHERE id=NEW.target_id;
  ELSIF kind IN ('code','telegram_product') THEN
    SELECT owner_id,title INTO owner_id,label FROM public.telegram_products WHERE id=NEW.target_id;
    target_url := 'product.html?type=code&id='||NEW.target_id::text;
  ELSIF kind IN ('channel','group','telegram_channel') THEN
    SELECT owner_id,name INTO owner_id,label FROM public.telegram_channels WHERE id=NEW.target_id;
    target_url := 'product.html?type='||CASE WHEN kind='group' THEN 'group' ELSE 'channel' END||'&id='||NEW.target_id::text;
  ELSIF kind IN ('product','link') THEN
    SELECT coalesce(creator_id,seller_id),title INTO owner_id,label FROM public.products WHERE id=NEW.target_id;
    target_url := 'product.html?type=product&id='||NEW.target_id::text;
  ELSIF kind='paste' THEN
    SELECT owner_id,title INTO owner_id,label FROM public.pastes WHERE id=NEW.target_id;
    target_url := 'paste-view.html?id='||NEW.target_id::text;
  END IF;

  IF owner_id IS NULL OR (actor_id IS NOT NULL AND owner_id=actor_id) THEN
    RETURN NEW;
  END IF;

  IF actor_id IS NOT NULL THEN
    SELECT coalesce(display_name,username,'User') INTO actor_name
    FROM public.profiles WHERE id=actor_id;
  END IF;

  PERFORM public.notify_user_once(
    owner_id,
    'Konten mendapat Komentar',
    actor_name || ' mengomentari ' || kind || ' "' || coalesce(label,'Konten') || '".',
    'comment',
    target_url,
    kind,
    NEW.target_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_content_comment ON public.content_comments;
CREATE TRIGGER trg_notify_content_comment
AFTER INSERT ON public.content_comments
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_content_comment();

-- 4) Clean old VIEW notifications so they do not remain visible in the inbox.
DELETE FROM public.notifications
WHERE lower(coalesce(notification_type,''))='view'
   OR lower(coalesce(title,''))='konten dibuka';

COMMIT;
