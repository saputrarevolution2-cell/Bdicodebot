-- PasTele FINAL METRICS SECURITY FIX
-- Run on an existing database after the current master SQL.
-- Fixes Security Definer View lint for content_metrics_public while preserving public metrics.

BEGIN;

DROP FUNCTION IF EXISTS public.get_content_metrics(uuid,text);
DROP FUNCTION IF EXISTS public.get_creator_dashboard_stats();
DROP VIEW IF EXISTS public.content_metrics_public;
DROP FUNCTION IF EXISTS public.get_public_content_metrics_row(uuid,text);

CREATE FUNCTION public.get_public_content_metrics_row(
  p_target_id uuid,
  p_target_type text
)
RETURNS TABLE(
  views bigint,
  sales bigint,
  likes bigint,
  comments bigint,
  shares bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  t text := lower(btrim(coalesce(p_target_type,'')));
  ok boolean := false;
  v_views bigint := 0;
  v_sales bigint := 0;
  v_likes bigint := 0;
  v_comments bigint := 0;
  v_shares bigint := 0;
BEGIN
  IF p_target_id IS NULL OR t='' THEN
    RETURN QUERY SELECT 0::bigint,0::bigint,0::bigint,0::bigint,0::bigint;
    RETURN;
  END IF;

  IF t IN ('product','link') THEN
    SELECT true,coalesce(p.views,0),coalesce(p.sales_count,0)
      INTO ok,v_views,v_sales
    FROM public.products p
    WHERE p.id=p_target_id AND p.status IN ('published','active');
    t := 'product';

  ELSIF t IN ('code','telegram_product','telegram-product') THEN
    SELECT true,coalesce(p.views,0),coalesce(p.sales_count,0)
      INTO ok,v_views,v_sales
    FROM public.telegram_products p
    WHERE p.id=p_target_id AND p.status IN ('published','active');
    t := 'code';

  ELSIF t IN ('channel','group','telegram_channel','telegram-channel',
              'telegram_group','telegram-group') THEN
    SELECT true,coalesce(p.views,0),coalesce(p.sales_count,0)
      INTO ok,v_views,v_sales
    FROM public.telegram_channels p
    WHERE p.id=p_target_id AND p.status IN ('published','active');
    IF EXISTS (
      SELECT 1 FROM public.telegram_channels p
      WHERE p.id=p_target_id AND lower(coalesce(p.type,'channel'))='group'
        AND p.status IN ('published','active')
    ) THEN t := 'group'; ELSE t := 'channel'; END IF;

  ELSIF t IN ('pastelink','paste-link','paste_link') THEN
    SELECT true,coalesce(p.views,0),coalesce(p.sales_count,0)
      INTO ok,v_views,v_sales
    FROM public.pastelinks p
    WHERE p.id=p_target_id
      AND p.visibility='public'
      AND (p.expires_at IS NULL OR p.expires_at>now());
    t := 'pastelink';

  ELSIF t='paste' THEN
    SELECT true
      INTO ok
    FROM public.pastes p
    WHERE p.id=p_target_id AND p.visibility='public';
    SELECT count(*) INTO v_views
    FROM public.analytics_events a
    WHERE a.target_id=p_target_id
      AND lower(a.target_type)='paste'
      AND lower(a.event_type)='view';
    v_sales := 0;
  END IF;

  IF NOT coalesce(ok,false) THEN
    RETURN QUERY SELECT 0::bigint,0::bigint,0::bigint,0::bigint,0::bigint;
    RETURN;
  END IF;

  SELECT count(*) INTO v_likes
  FROM public.content_likes l
  WHERE l.target_id=p_target_id
    AND (
      (t='product' AND lower(l.target_type) IN ('product','link')) OR
      (t='code' AND lower(l.target_type) IN ('code','telegram_product','telegram-product')) OR
      (t IN ('channel','group') AND lower(l.target_type) IN (
        'channel','group','telegram_channel','telegram-channel',
        'telegram_group','telegram-group')) OR
      (t='pastelink' AND lower(l.target_type) IN ('pastelink','paste-link','paste_link')) OR
      (t='paste' AND lower(l.target_type)='paste')
    );

  SELECT count(*) INTO v_comments
  FROM public.content_comments c
  WHERE c.target_id=p_target_id
    AND (
      (t='product' AND lower(c.target_type) IN ('product','link')) OR
      (t='code' AND lower(c.target_type) IN ('code','telegram_product','telegram-product')) OR
      (t IN ('channel','group') AND lower(c.target_type) IN (
        'channel','group','telegram_channel','telegram-channel',
        'telegram_group','telegram-group')) OR
      (t='pastelink' AND lower(c.target_type) IN ('pastelink','paste-link','paste_link')) OR
      (t='paste' AND lower(c.target_type)='paste')
    );

  SELECT count(*) INTO v_shares
  FROM public.analytics_events a
  WHERE a.target_id=p_target_id
    AND lower(a.event_type)='share'
    AND (
      (t='product' AND lower(a.target_type) IN ('product','link')) OR
      (t='code' AND lower(a.target_type) IN ('code','telegram_product','telegram-product')) OR
      (t IN ('channel','group') AND lower(a.target_type) IN (
        'channel','group','telegram_channel','telegram-channel',
        'telegram_group','telegram-group')) OR
      (t='pastelink' AND lower(a.target_type) IN ('pastelink','paste-link','paste_link')) OR
      (t='paste' AND lower(a.target_type)='paste')
    );

  RETURN QUERY SELECT
    coalesce(v_views,0),coalesce(v_sales,0),coalesce(v_likes,0),
    coalesce(v_comments,0),coalesce(v_shares,0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_content_metrics_row(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_content_metrics_row(uuid,text)
  TO anon,authenticated;

CREATE VIEW public.content_metrics_public
WITH (security_invoker=true)
AS
SELECT
  p.id AS target_id,
  'product'::text AS target_type,
  m.views,m.sales,m.likes,m.comments,m.shares
FROM public.products p
CROSS JOIN LATERAL public.get_public_content_metrics_row(p.id,'product') m
WHERE p.status IN ('published','active')

UNION ALL

SELECT
  p.id,
  'code'::text,
  m.views,m.sales,m.likes,m.comments,m.shares
FROM public.telegram_products p
CROSS JOIN LATERAL public.get_public_content_metrics_row(p.id,'code') m
WHERE p.status IN ('published','active')

UNION ALL

SELECT
  p.id,
  CASE WHEN lower(coalesce(p.type,'channel'))='group'
       THEN 'group' ELSE 'channel' END::text,
  m.views,m.sales,m.likes,m.comments,m.shares
FROM public.telegram_channels p
CROSS JOIN LATERAL public.get_public_content_metrics_row(
  p.id,CASE WHEN lower(coalesce(p.type,'channel'))='group' THEN 'group' ELSE 'channel' END
) m
WHERE p.status IN ('published','active')

UNION ALL

SELECT
  p.id,
  'pastelink'::text,
  m.views,m.sales,m.likes,m.comments,m.shares
FROM public.pastelinks p
CROSS JOIN LATERAL public.get_public_content_metrics_row(p.id,'pastelink') m
WHERE p.visibility='public'
  AND (p.expires_at IS NULL OR p.expires_at>now())

UNION ALL

SELECT
  p.id,
  'paste'::text,
  m.views,m.sales,m.likes,m.comments,m.shares
FROM public.pastes p
CROSS JOIN LATERAL public.get_public_content_metrics_row(p.id,'paste') m
WHERE p.visibility='public';

GRANT SELECT ON public.content_metrics_public TO anon,authenticated;

-- ============================================================
-- 6. Single-content metrics RPC
-- ============================================================
DROP FUNCTION IF EXISTS public.get_content_metrics(uuid,text);

CREATE FUNCTION public.get_content_metrics(
  p_target_id uuid,
  p_target_type text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT jsonb_build_object(
    'target_id',m.target_id,
    'target_type',m.target_type,
    'views',m.views,
    'sales',m.sales,
    'likes',m.likes,
    'comments',m.comments,
    'shares',m.shares
  )
  FROM public.content_metrics_public m
  WHERE m.target_id=p_target_id
    AND lower(m.target_type)=lower(btrim(coalesce(p_target_type,'')))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_metrics(uuid,text)
  TO anon,authenticated;

-- ============================================================
-- 7. Creator Dashboard RPC
--
-- One canonical payload for Dashboard / Profile / My Products.
-- Revenue includes seller earnings (70%) and follows transaction
-- settlement status. Wallet balances come from wallets.
-- ============================================================
DROP FUNCTION IF EXISTS public.get_creator_dashboard_stats();

CREATE FUNCTION public.get_creator_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();

  v_balance numeric:=0;
  v_available numeric:=0;
  v_pending numeric:=0;

  v_today numeric:=0;
  v_month numeric:=0;
  v_total_revenue numeric:=0;

  v_views bigint:=0;
  v_sales bigint:=0;
  v_likes bigint:=0;
  v_comments bigint:=0;
  v_shares bigint:=0;
  v_content bigint:=0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'LOGIN_REQUIRED';
  END IF;

  SELECT
    coalesce(w.balance,0),
    coalesce(w.available_balance,0),
    coalesce(w.pending_balance,0)
  INTO v_balance,v_available,v_pending
  FROM public.wallets w
  WHERE w.user_id=uid;

  SELECT
    coalesce(sum(
      CASE
        WHEN t.created_at >= date_trunc('day',now())
        THEN t.net_amount ELSE 0
      END),0),
    coalesce(sum(
      CASE
        WHEN t.created_at >= date_trunc('month',now())
        THEN t.net_amount ELSE 0
      END),0),
    coalesce(sum(t.net_amount),0)
  INTO v_today,v_month,v_total_revenue
  FROM public.transactions t
  WHERE t.user_id=uid
    AND t.type='sale_earning'
    AND t.status IN ('pending','completed');

  SELECT
    count(*),
    coalesce(sum(m.views),0),
    coalesce(sum(m.sales),0),
    coalesce(sum(m.likes),0),
    coalesce(sum(m.comments),0),
    coalesce(sum(m.shares),0)
  INTO
    v_content,v_views,v_sales,v_likes,v_comments,v_shares
  FROM public.content_metrics_public m
  WHERE EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id=m.target_id
      AND m.target_type='product'
      AND coalesce(p.creator_id,p.seller_id)=uid
  )
  OR EXISTS (
    SELECT 1
    FROM public.telegram_products p
    WHERE p.id=m.target_id
      AND m.target_type='code'
      AND p.owner_id=uid
  )
  OR EXISTS (
    SELECT 1
    FROM public.telegram_channels p
    WHERE p.id=m.target_id
      AND m.target_type IN ('channel','group')
      AND p.owner_id=uid
  )
  OR EXISTS (
    SELECT 1
    FROM public.pastelinks p
    WHERE p.id=m.target_id
      AND m.target_type='pastelink'
      AND p.user_id=uid
  )
  OR EXISTS (
    SELECT 1
    FROM public.pastes p
    WHERE p.id=m.target_id
      AND m.target_type='paste'
      AND p.owner_id=uid
  );

  RETURN jsonb_build_object(
    'balance',v_balance,
    'available_balance',v_available,
    'pending_balance',v_pending,
    'today_revenue',v_today,
    'month_revenue',v_month,
    'total_revenue',v_total_revenue,
    'content',v_content,
    'views',v_views,
    'sales',v_sales,
    'likes',v_likes,
    'comments',v_comments,
    'shares',v_shares
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_dashboard_stats()
  TO authenticated;


COMMIT;
