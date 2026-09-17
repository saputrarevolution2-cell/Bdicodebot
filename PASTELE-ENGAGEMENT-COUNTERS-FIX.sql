-- PasTele engagement counter fix
-- Run AFTER the existing V3 database SQL.
-- This fixes public View Code counters being stuck at 0 because
-- analytics_events is intentionally not publicly readable.

CREATE OR REPLACE FUNCTION public.get_content_engagement_counts(
  p_target_id uuid,
  p_target_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  t text := lower(btrim(coalesce(p_target_type,'')));
  v_views bigint := 0;
  v_likes bigint := 0;
  v_comments bigint := 0;
  v_shares bigint := 0;
  v_sales bigint := 0;
BEGIN
  IF p_target_id IS NULL THEN
    RETURN jsonb_build_object(
      'views',0,'sales_count',0,'likes',0,'shares',0,'comments',0
    );
  END IF;

  SELECT count(*) INTO v_views
  FROM public.analytics_events
  WHERE target_id=p_target_id
    AND lower(coalesce(target_type,''))=t
    AND lower(coalesce(event_type,''))='view';

  SELECT count(*) INTO v_shares
  FROM public.analytics_events
  WHERE target_id=p_target_id
    AND lower(coalesce(target_type,''))=t
    AND lower(coalesce(event_type,''))='share';

  SELECT count(*) INTO v_likes
  FROM public.content_likes
  WHERE target_id=p_target_id
    AND lower(coalesce(target_type,''))=t;

  SELECT count(*) INTO v_comments
  FROM public.content_comments
  WHERE target_id=p_target_id
    AND lower(coalesce(target_type,''))=t;

  IF t IN ('telegram_product','telegram-product','code') THEN
    SELECT coalesce(sales_count,0) INTO v_sales
    FROM public.telegram_products
    WHERE id=p_target_id;
  ELSIF t IN ('channel','group','telegram_channel','telegram-channel',
              'telegram_group','telegram-group') THEN
    SELECT coalesce(sales_count,0) INTO v_sales
    FROM public.telegram_channels
    WHERE id=p_target_id;
  ELSIF t IN ('product','link') THEN
    SELECT coalesce(sales_count,0) INTO v_sales
    FROM public.products
    WHERE id=p_target_id;
  ELSIF t IN ('pastelink','paste-link','paste_link') THEN
    SELECT coalesce(sales_count,0) INTO v_sales
    FROM public.pastelinks
    WHERE id=p_target_id;
  END IF;

  RETURN jsonb_build_object(
    'views',coalesce(v_views,0),
    'sales_count',coalesce(v_sales,0),
    'likes',coalesce(v_likes,0),
    'shares',coalesce(v_shares,0),
    'comments',coalesce(v_comments,0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_content_engagement_counts(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_content_engagement_counts(uuid,text)
TO anon, authenticated;
