-- ============================================================
-- PasTele BOT REQUEST / APPROVAL FEATURE
-- Idempotent migration. Preserves existing approved_bots data.
-- User -> submit bot request -> Admin approve/reject -> approved_bots.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.bot_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bot_username text NOT NULL,
  bot_name text,
  bot_id bigint,
  note text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  approved_bot_id uuid REFERENCES public.approved_bots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS bot_requests_status_created_idx
  ON public.bot_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS bot_requests_requester_created_idx
  ON public.bot_requests(requester_id, created_at DESC);

ALTER TABLE public.bot_requests
  DROP CONSTRAINT IF EXISTS bot_requests_status_check;

ALTER TABLE public.bot_requests
  ADD CONSTRAINT bot_requests_status_check
  CHECK (status IN ('pending','approved','rejected'));

ALTER TABLE public.bot_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bot_requests_owner_read ON public.bot_requests;
CREATE POLICY bot_requests_owner_read
ON public.bot_requests
FOR SELECT TO authenticated
USING (requester_id = auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS bot_requests_owner_insert ON public.bot_requests;
CREATE POLICY bot_requests_owner_insert
ON public.bot_requests
FOR INSERT TO authenticated
WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS bot_requests_admin_update ON public.bot_requests;
CREATE POLICY bot_requests_admin_update
ON public.bot_requests
FOR UPDATE TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.submit_bot_request(
  p_username text,
  p_bot_id bigint DEFAULT NULL,
  p_bot_name text DEFAULT '',
  p_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  clean_username text := lower(regexp_replace(btrim(coalesce(p_username,'')), '^@', ''));
  existing public.approved_bots;
  pending public.bot_requests;
  result public.bot_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;

  IF clean_username !~ '^[a-z0-9_]{5,32}$' THEN
    RAISE EXCEPTION 'INVALID_BOT_USERNAME';
  END IF;

  SELECT * INTO existing
  FROM public.approved_bots
  WHERE lower(bot_username) = clean_username
     OR (p_bot_id IS NOT NULL AND bot_id = p_bot_id)
  LIMIT 1;

  IF existing.id IS NOT NULL AND existing.is_active THEN
    RAISE EXCEPTION 'BOT_ALREADY_APPROVED';
  END IF;

  SELECT * INTO pending
  FROM public.bot_requests
  WHERE requester_id = uid
    AND lower(bot_username) = clean_username
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF pending.id IS NOT NULL THEN
    RAISE EXCEPTION 'BOT_REQUEST_PENDING';
  END IF;

  INSERT INTO public.bot_requests(
    requester_id, bot_username, bot_name, bot_id, note, status
  )
  VALUES(
    uid,
    clean_username,
    nullif(btrim(coalesce(p_bot_name,'')), ''),
    p_bot_id,
    nullif(btrim(coalesce(p_note,'')), ''),
    'pending'
  )
  RETURNING * INTO result;

  RETURN jsonb_build_object(
    'ok', true,
    'id', result.id,
    'status', result.status,
    'bot_username', result.bot_username
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_bot_requests(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT jsonb_build_object(
    'id', r.id,
    'requester_id', r.requester_id,
    'username', p.username,
    'auth_email', p.auth_email,
    'bot_username', r.bot_username,
    'bot_name', r.bot_name,
    'bot_id', r.bot_id,
    'note', r.note,
    'status', r.status,
    'admin_note', r.admin_note,
    'approved_bot_id', r.approved_bot_id,
    'created_at', r.created_at,
    'reviewed_at', r.reviewed_at
  )
  FROM public.bot_requests r
  LEFT JOIN public.profiles p ON p.id = r.requester_id
  WHERE public.is_current_user_admin()
  ORDER BY
    CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
    r.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit,100),500))
  OFFSET greatest(coalesce(p_offset,0),0);
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_bot_request(
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r public.bot_requests;
  b public.approved_bots;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT * INTO r
  FROM public.bot_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF r.id IS NULL THEN RAISE EXCEPTION 'BOT_REQUEST_NOT_FOUND'; END IF;
  IF r.status = 'approved' AND r.approved_bot_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok',true,'status','approved','approved_bot_id',r.approved_bot_id);
  END IF;

  SELECT * INTO b
  FROM public.approved_bots
  WHERE lower(bot_username) = lower(r.bot_username)
     OR (r.bot_id IS NOT NULL AND bot_id = r.bot_id)
  ORDER BY CASE WHEN lower(bot_username)=lower(r.bot_username) THEN 0 ELSE 1 END
  LIMIT 1;

  IF b.id IS NULL THEN
    INSERT INTO public.approved_bots(bot_username, bot_name, bot_id, is_active)
    VALUES(r.bot_username, r.bot_name, r.bot_id, true)
    RETURNING * INTO b;
  ELSE
    UPDATE public.approved_bots
    SET bot_username = r.bot_username,
        bot_name = coalesce(r.bot_name, bot_name),
        bot_id = coalesce(r.bot_id, bot_id),
        is_active = true,
        updated_at = now()
    WHERE id = b.id
    RETURNING * INTO b;
  END IF;

  UPDATE public.bot_requests
  SET status='approved',
      approved_bot_id=b.id,
      admin_note=null,
      reviewed_at=now()
  WHERE id=r.id;

  INSERT INTO public.notifications(user_id,title,body,is_read)
  VALUES(
    r.requester_id,
    'Bot disetujui',
    'Bot @' || r.bot_username || ' sudah disetujui admin dan sekarang tersedia di Create Code.',
    false
  );

  RETURN jsonb_build_object(
    'ok',true,
    'status','approved',
    'approved_bot_id',b.id,
    'bot_username',b.bot_username
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_bot_request(
  p_request_id uuid,
  p_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE r public.bot_requests;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;

  SELECT * INTO r FROM public.bot_requests WHERE id=p_request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'BOT_REQUEST_NOT_FOUND'; END IF;

  UPDATE public.bot_requests
  SET status='rejected',
      admin_note=nullif(btrim(coalesce(p_reason,'')),''),
      reviewed_at=now()
  WHERE id=r.id;

  INSERT INTO public.notifications(user_id,title,body,is_read)
  VALUES(
    r.requester_id,
    'Pengajuan bot ditolak',
    'Pengajuan bot @' || r.bot_username ||
      CASE WHEN btrim(coalesce(p_reason,''))<>'' THEN ' ditolak. Alasan: ' || btrim(p_reason) ELSE ' ditolak oleh admin.' END,
    false
  );

  RETURN jsonb_build_object('ok',true,'status','rejected');
END;
$$;

REVOKE ALL ON FUNCTION public.submit_bot_request(text,bigint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_bot_request(text,bigint,text,text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_bot_requests(integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_bot_requests(integer,integer) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_approve_bot_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_bot_request(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_reject_bot_request(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_bot_request(uuid,text) TO authenticated;

COMMIT;
