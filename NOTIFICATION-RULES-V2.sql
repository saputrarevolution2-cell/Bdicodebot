-- PasTele Notification Rules V2
-- 1) Remove old "Konten terjual ... Pendapatan creator 70%" copies.
-- 2) Normalize future sale_success notifications to the new Paid wording.
-- 3) Add announcement reactions (Like/Hate) with per-user uniqueness.
-- 4) Allow admins to create announcements.
BEGIN;

DELETE FROM public.notifications
WHERE lower(coalesce(notification_type,''))='sale_success'
  AND (
    lower(coalesce(title,''))='konten terjual'
    OR body ILIKE '%pendapatan creator 70%%'
  );

CREATE OR REPLACE FUNCTION public.normalize_sale_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
  IF lower(coalesce(NEW.notification_type,''))='sale_success' THEN
    NEW.title := '💳 Paid berhasil';
    NEW.body := 'Konten ' || coalesce(NULLIF(btrim(NEW.body),''),'konten') || ' berhasil terjual.';
    -- If the old body is present, extract the content name between "Konten " and " berhasil dibeli".
    IF NEW.body IS NOT NULL THEN
      NEW.body := '💳 Pembayaran berhasil. Konten berhasil terjual.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_sale_notification ON public.notifications;
CREATE TRIGGER trg_normalize_sale_notification
BEFORE INSERT OR UPDATE OF title,body,notification_type
ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.normalize_sale_notification();

CREATE TABLE IF NOT EXISTS public.announcement_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like','hate')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id,user_id)
);

ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcement_reactions_read ON public.announcement_reactions;
CREATE POLICY announcement_reactions_read
ON public.announcement_reactions FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS announcement_reactions_insert ON public.announcement_reactions;
CREATE POLICY announcement_reactions_insert
ON public.announcement_reactions FOR INSERT TO authenticated
WITH CHECK (user_id=auth.uid());

DROP POLICY IF EXISTS announcement_reactions_update ON public.announcement_reactions;
CREATE POLICY announcement_reactions_update
ON public.announcement_reactions FOR UPDATE TO authenticated
USING (user_id=auth.uid())
WITH CHECK (user_id=auth.uid());

DROP POLICY IF EXISTS announcement_reactions_delete ON public.announcement_reactions;
CREATE POLICY announcement_reactions_delete
ON public.announcement_reactions FOR DELETE TO authenticated
USING (user_id=auth.uid());

GRANT SELECT,INSERT,UPDATE,DELETE ON public.announcement_reactions TO authenticated;

DROP POLICY IF EXISTS announcements_admin_insert ON public.announcements;
CREATE POLICY announcements_admin_insert
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS announcements_admin_update ON public.announcements;
CREATE POLICY announcements_admin_update
ON public.announcements FOR UPDATE TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

GRANT SELECT ON public.announcements TO anon,authenticated;
GRANT INSERT,UPDATE ON public.announcements TO authenticated;

COMMIT;
