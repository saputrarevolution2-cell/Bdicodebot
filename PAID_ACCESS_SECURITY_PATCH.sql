-- PasTele / TeleCod — PAID ACCESS SECURITY PATCH
-- Run AFTER the existing master SQL.
-- Safe to run repeatedly.
BEGIN;

-- 1) Authenticated detail: price > 0 is ALWAYS paid.
DROP FUNCTION IF EXISTS public.get_market_item_detail(text,uuid);
CREATE OR REPLACE FUNCTION public.get_market_item_detail(p_type text,p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r record;
  normalized text:=lower(btrim(coalesce(p_type,'')));
  can_access boolean:=false;
  uid uuid:=auth.uid();
  paid boolean:=false;
BEGIN
  IF normalized IN ('product','link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           coalesce(p.creator_id,p.seller_id) owner_id
    INTO r FROM public.products p
    LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
    WHERE p.id=p_id;
  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id
    INTO r FROM public.telegram_products p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id,p.name title
    INTO r FROM public.telegram_channels p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
  ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.user_id owner_id,'pastelink'::text item_type
    INTO r FROM public.pastelinks p
    LEFT JOIN public.profiles pr ON pr.id=p.user_id WHERE p.id=p_id;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF r IS NULL THEN RETURN jsonb_build_object('found',false); END IF;

  paid := lower(coalesce(r.access_type,'free'))='paid' OR coalesce(r.price,0)>0;
  can_access := NOT paid
    OR (uid IS NOT NULL AND (
      uid=r.owner_id
      OR public.is_current_user_admin()
      OR EXISTS (
        SELECT 1 FROM public.purchases pu
        WHERE pu.buyer_id=uid
          AND pu.product_id=p_id
          AND lower(coalesce(pu.status,'')) IN ('completed','paid','success')
      )
    ));

  IF NOT can_access THEN
    RETURN (to_jsonb(r)-'content'-'content_html')
      || jsonb_build_object('found',true,'can_access',false);
  END IF;

  RETURN to_jsonb(r)||jsonb_build_object('found',true,'can_access',true);
END $$;

GRANT EXECUTE ON FUNCTION public.get_market_item_detail(text,uuid) TO anon,authenticated;

-- 2) Guest detail: price > 0 is ALWAYS paid and only the matching paid order
-- with the same guest token can unlock the payload.
CREATE OR REPLACE FUNCTION public.get_market_item_detail_guest(p_type text,p_id uuid,p_guest_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r record;
  normalized text:=lower(btrim(coalesce(p_type,'')));
  tok text:=btrim(coalesce(p_guest_token,''));
  can_access boolean:=false;
  paid boolean:=false;
BEGIN
  IF normalized IN ('product','link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,coalesce(p.creator_id,p.seller_id) owner_id
    INTO r FROM public.products p LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id) WHERE p.id=p_id;
  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id
    INTO r FROM public.telegram_products p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id,p.name title
    INTO r FROM public.telegram_channels p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
  ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.user_id owner_id,'pastelink'::text item_type
    INTO r FROM public.pastelinks p LEFT JOIN public.profiles pr ON pr.id=p.user_id WHERE p.id=p_id;
  ELSE RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE'; END IF;

  IF r IS NULL THEN RETURN jsonb_build_object('found',false); END IF;

  paid := lower(coalesce(r.access_type,'free'))='paid' OR coalesce(r.price,0)>0;
  can_access := NOT paid OR EXISTS (
    SELECT 1 FROM public.purchases pu
    JOIN public.orders o ON o.id=pu.order_id
    WHERE pu.product_id=p_id
      AND lower(coalesce(pu.status,'')) IN ('completed','paid','success')
      AND o.guest_access_token=tok
      AND o.buyer_id IS NULL
  );

  IF NOT can_access THEN
    RETURN (to_jsonb(r)-'content'-'content_html')
      || jsonb_build_object('found',true,'can_access',false);
  END IF;

  RETURN to_jsonb(r)||jsonb_build_object('found',true,'can_access',true);
END $$;

GRANT EXECUTE ON FUNCTION public.get_market_item_detail_guest(text,uuid,text) TO anon,authenticated;

COMMIT;
