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


-- ============================================================
-- PasTele FINAL BUY / ACCESS / GUEST PATCH 2026-09-14
-- ============================================================
BEGIN;

-- Paid purchases create a permanent account entitlement through product_access.
CREATE UNIQUE INDEX IF NOT EXISTS product_access_order_product_uidx
ON public.product_access(order_id, product_id);

CREATE UNIQUE INDEX IF NOT EXISTS purchases_buyer_product_paid_uidx
ON public.purchases(buyer_id, product_id)
WHERE buyer_id IS NOT NULL AND product_id IS NOT NULL
  AND lower(coalesce(status,'')) IN ('completed','paid','success');

-- Active subscription is an entitlement; expired subscription is not.
CREATE OR REPLACE FUNCTION public.get_market_item_detail(p_type text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; normalized text:=lower(btrim(coalesce(p_type,''))); can_access boolean:=false; uid uuid:=auth.uid(); paid boolean:=false; sub_active boolean:=false;
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
 paid:=coalesce(r.access_type,'free')='paid' OR coalesce(r.price,0)>0;
 IF uid IS NOT NULL THEN
   SELECT coalesce(is_premium,false) OR coalesce(subscription_until,now()-interval '1 second')>now()
     INTO sub_active FROM public.profiles WHERE id=uid;
 END IF;
 can_access:=NOT paid OR public.is_current_user_admin() OR (uid IS NOT NULL AND uid=r.owner_id) OR sub_active OR
   (uid IS NOT NULL AND EXISTS(SELECT 1 FROM public.purchases pu WHERE pu.buyer_id=uid AND pu.product_id=p_id AND lower(coalesce(pu.status,'')) IN ('completed','paid','success')));
 IF NOT can_access AND paid THEN RETURN (to_jsonb(r)-'content'-'content_html')||jsonb_build_object('found',true,'can_access',false,'is_paid',true); END IF;
 RETURN to_jsonb(r)||jsonb_build_object('found',true,'can_access',true,'is_paid',paid);
END $$;
GRANT EXECUTE ON FUNCTION public.get_market_item_detail(text,uuid) TO anon,authenticated;

-- Guest paid checkout: public, but only for published/active content and never for free content.
CREATE OR REPLACE FUNCTION public.buy_market_item_guest(p_type text,p_id uuid,p_guest_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE normalized text:=lower(btrim(coalesce(p_type,''))); tok text:=btrim(coalesce(p_guest_token,'')); seller uuid; title text; price numeric; oid uuid;
BEGIN
 IF auth.uid() IS NOT NULL THEN RETURN public.buy_market_item(p_type,p_id); END IF;
 IF length(tok)<32 THEN RAISE EXCEPTION 'GUEST_TOKEN_REQUIRED'; END IF;
 IF normalized IN ('product','link') THEN
   SELECT coalesce(p.creator_id,p.seller_id),p.title,p.price INTO seller,title,price FROM public.products p WHERE p.id=p_id AND p.status IN ('published','active'); normalized:='product';
 ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
   SELECT p.owner_id,p.title,p.price INTO seller,title,price FROM public.telegram_products p WHERE p.id=p_id AND p.status IN ('published','active'); normalized:='telegram_product';
 ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
   SELECT p.owner_id,p.name,p.price INTO seller,title,price FROM public.telegram_channels p WHERE p.id=p_id AND p.status IN ('published','active'); normalized:='channel';
 ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
   SELECT p.user_id,p.title,p.price INTO seller,title,price FROM public.pastelinks p WHERE p.id=p_id AND p.visibility='public' AND (p.expires_at IS NULL OR p.expires_at>now()); normalized:='pastelink';
 ELSE RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE'; END IF;
 IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
 IF coalesce(price,0)<=0 THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;
 IF price<5000 OR price>150000 OR mod(price,1000)<>0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
 SELECT o.id INTO oid FROM public.orders o WHERE o.guest_access_token=tok AND o.product_id=p_id AND lower(coalesce(o.item_type,''))=normalized AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid') ORDER BY o.created_at DESC LIMIT 1;
 IF oid IS NULL THEN
   INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title,guest_access_token)
   VALUES(NULL,seller,p_id,price,'pending',normalized,p_id::text,title,tok) RETURNING id INTO oid;
 END IF;
 RETURN jsonb_build_object('order_id',oid,'amount',price,'item_title',title,'item_type',normalized,'guest_token',tok);
END $$;
GRANT EXECUTE ON FUNCTION public.buy_market_item_guest(text,uuid,text) TO anon,authenticated;

-- Guest detail: free is public; paid content remains hidden until the matching guest purchase is paid.
CREATE OR REPLACE FUNCTION public.get_market_item_detail_guest(p_type text,p_id uuid,p_guest_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; normalized text:=lower(btrim(coalesce(p_type,''))); can_access boolean:=false; tok text:=btrim(coalesce(p_guest_token,'')); paid boolean:=false;
BEGIN
 IF normalized IN ('product','link') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,coalesce(p.creator_id,p.seller_id) owner_id INTO r FROM public.products p LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id) WHERE p.id=p_id AND p.status IN ('published','active');
 ELSIF normalized IN ('code','telegram_product','telegram-product') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id INTO r FROM public.telegram_products p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id AND p.status IN ('published','active');
 ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id,p.name title INTO r FROM public.telegram_channels p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id AND p.status IN ('published','active');
 ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.user_id owner_id,'pastelink'::text item_type INTO r FROM public.pastelinks p LEFT JOIN public.profiles pr ON pr.id=p.user_id WHERE p.id=p_id AND p.visibility='public' AND (p.expires_at IS NULL OR p.expires_at>now());
 ELSE RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE'; END IF;
 IF r IS NULL THEN RETURN jsonb_build_object('found',false); END IF;
 paid:=coalesce(r.access_type,'free')='paid' OR coalesce(r.price,0)>0;
 can_access:=NOT paid OR (length(tok)>=32 AND EXISTS(SELECT 1 FROM public.purchases pu JOIN public.orders o ON o.id=pu.order_id WHERE pu.product_id=p_id AND lower(coalesce(pu.status,'')) IN ('completed','paid','success') AND o.guest_access_token=tok AND o.buyer_id IS NULL));
 IF NOT can_access AND paid THEN RETURN (to_jsonb(r)-'content'-'content_html')||jsonb_build_object('found',true,'can_access',false,'is_paid',true); END IF;
 RETURN to_jsonb(r)||jsonb_build_object('found',true,'can_access',true,'is_paid',paid);
END $$;
GRANT EXECUTE ON FUNCTION public.get_market_item_detail_guest(text,uuid,text) TO anon,authenticated;

-- Public anonymous comments and guest likes are intentional. Limit content length at DB level.
ALTER TABLE public.content_comments ADD COLUMN IF NOT EXISTS guest_token text;
ALTER TABLE public.content_comments ADD COLUMN IF NOT EXISTS display_name text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_comments_body_length_check') THEN
    ALTER TABLE public.content_comments ADD CONSTRAINT content_comments_body_length_check CHECK (length(btrim(body)) BETWEEN 1 AND 2000);
  END IF;
END $$;
DROP POLICY IF EXISTS comments_anon_insert ON public.content_comments;
CREATE POLICY comments_anon_insert ON public.content_comments FOR INSERT TO anon WITH CHECK (user_id IS NULL AND length(btrim(coalesce(body,''))) BETWEEN 1 AND 2000);

-- Notifications for successful purchases: buyer account only, seller/creator account only.
CREATE OR REPLACE FUNCTION public.notify_purchase_success(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders%ROWTYPE; seller_name text;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT coalesce(display_name,username,'Creator') INTO seller_name FROM public.profiles WHERE id=o.seller_id;
 IF o.buyer_id IS NOT NULL THEN
   INSERT INTO public.notifications(user_id,title,body,notification_type,target_type,target_id,link_url)
   VALUES(o.buyer_id,'Pembelian berhasil','Pembayaran untuk '||coalesce(o.item_title,'konten')||' berhasil. Akses sudah dibuka.','purchase_success',o.item_type,o.product_id,NULL)
   ON CONFLICT DO NOTHING;
 END IF;
 IF o.seller_id IS NOT NULL THEN
   INSERT INTO public.notifications(user_id,title,body,notification_type,target_type,target_id,link_url)
   VALUES(o.seller_id,'Konten terjual','Konten '||coalesce(o.item_title,'konten')||' berhasil dibeli. Pendapatan creator 70% masuk ke saldo tertunda.','sale_success',o.item_type,o.product_id,NULL)
   ON CONFLICT DO NOTHING;
 END IF;
END $$;

-- Replace settlement so account/guest access, 70/30 ledger and counters are all finalized once.
CREATE OR REPLACE FUNCTION public.settle_bayargg_order(
 p_order_id uuid,p_invoice_id text,p_gateway_status text,p_final_amount numeric,p_gateway_payload jsonb DEFAULT '{}'::jsonb
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders%ROWTYPE; seller_share numeric; platform_fee numeric; local_paid_at timestamp; v_available_at timestamptz; v_settlement_code text; v_balance_before numeric:=0; v_purchase_id uuid;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF lower(coalesce(o.status,'')) IN ('paid','success','completed','settled') THEN RETURN true; END IF;
 IF lower(coalesce(p_gateway_status,'')) NOT IN ('paid','settled','success','completed') THEN RETURN false; END IF;
 IF round(coalesce(p_final_amount,0),0)<>round(coalesce(o.amount,0),0) THEN RAISE EXCEPTION 'AMOUNT_MISMATCH'; END IF;

 UPDATE public.orders SET status='paid',paid_at=coalesce(paid_at,now()),payment_reference=coalesce(p_invoice_id,payment_reference),gateway_payload=coalesce(p_gateway_payload,'{}'::jsonb) WHERE id=o.id;

 IF o.item_type='account_plan' THEN
   IF o.item_id='premium' THEN UPDATE public.profiles SET is_premium=true,updated_at=now() WHERE id=o.buyer_id;
   ELSIF o.item_id IN ('subscription_1','subscription_3','subscription_7') THEN UPDATE public.profiles SET subscription_until=greatest(coalesce(subscription_until,now()),now())+CASE o.item_id WHEN 'subscription_1' THEN interval '1 day' WHEN 'subscription_3' THEN interval '3 days' WHEN 'subscription_7' THEN interval '7 days' END,updated_at=now() WHERE id=o.buyer_id; END IF;
   INSERT INTO public.purchases(buyer_id,product_id,order_id,item_type,item_id,item_title,amount,status) SELECT o.buyer_id,NULL,o.id,o.item_type,o.item_id,o.item_title,o.amount,'completed' WHERE NOT EXISTS(SELECT 1 FROM public.purchases WHERE order_id=o.id);
   RETURN true;
 END IF;

 seller_share:=round(coalesce(o.amount,0)*0.70,2); platform_fee:=round(coalesce(o.amount,0)-seller_share,2);
 local_paid_at:=timezone('Asia/Jakarta',now());
 IF local_paid_at::time < time '21:00:00' THEN v_available_at:=timezone('Asia/Jakarta',date_trunc('day',local_paid_at)+interval '1 day');v_settlement_code:='H1'; ELSE v_available_at:=timezone('Asia/Jakarta',date_trunc('day',local_paid_at)+interval '2 days');v_settlement_code:='H2'; END IF;

 IF NOT EXISTS(SELECT 1 FROM public.purchases WHERE order_id=o.id) THEN
   SELECT coalesce(balance,0) INTO v_balance_before FROM public.wallets WHERE user_id=o.seller_id FOR UPDATE;
   INSERT INTO public.wallets(user_id,balance,available_balance,pending_balance) VALUES(o.seller_id,seller_share,0,seller_share)
   ON CONFLICT(user_id) DO UPDATE SET balance=public.wallets.balance+excluded.balance,pending_balance=public.wallets.pending_balance+excluded.pending_balance,updated_at=now();
   UPDATE public.profiles SET balance=balance+seller_share,updated_at=now() WHERE id=o.seller_id;
   INSERT INTO public.wallet_transactions(user_id,type,amount,balance_before,balance_after,reference,status,available_at,settlement_code)
   VALUES(o.seller_id,'sale_earning',seller_share,v_balance_before,v_balance_before+seller_share,'bayargg-order:'||o.id::text,'pending',v_available_at,v_settlement_code)
   ON CONFLICT DO NOTHING;
   INSERT INTO public.transactions(user_id,amount,fee,net_amount,type,status,reference,description)
   VALUES(o.seller_id,seller_share,platform_fee,seller_share,'sale_earning','pending','bayargg-order:'||o.id::text,'Marketplace sale 70/30 - '||v_settlement_code)
   ON CONFLICT(user_id,reference) DO NOTHING;

   INSERT INTO public.purchases(buyer_id,product_id,order_id,item_type,item_id,item_title,amount,status)
   VALUES(o.buyer_id,o.product_id,o.id,o.item_type,o.item_id,o.item_title,o.amount,'completed') RETURNING id INTO v_purchase_id;

   INSERT INTO public.product_access(order_id,product_id,buyer_id,delivery_url)
   VALUES(o.id,o.product_id,o.buyer_id,NULL) ON CONFLICT(order_id,product_id) DO NOTHING;

   IF lower(coalesce(o.item_type,'')) IN ('product','code') THEN UPDATE public.products SET sales_count=sales_count+1,updated_at=now() WHERE id=o.product_id;
   ELSIF lower(coalesce(o.item_type,''))='telegram_product' THEN UPDATE public.telegram_products SET sales_count=sales_count+1,updated_at=now() WHERE id=o.product_id;
   ELSIF lower(coalesce(o.item_type,'')) IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN UPDATE public.telegram_channels SET sales_count=sales_count+1,updated_at=now() WHERE id=o.product_id;
   ELSIF lower(coalesce(o.item_type,''))='pastelink' THEN UPDATE public.pastelinks SET views=views WHERE id=o.product_id;
   END IF;
   PERFORM public.notify_purchase_success(o.id);
 END IF;
 RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.settle_bayargg_order(uuid,text,text,numeric,jsonb) TO service_role;

COMMIT;


-- PROFILE VISIT NOTIFICATION FINAL: do not spam the same owner more than once per hour per visitor.
CREATE OR REPLACE FUNCTION public.notify_profile_visit(p_profile_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); visitor text;
BEGIN
 IF uid IS NULL OR p_profile_id IS NULL OR uid=p_profile_id THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_profile_id AND is_banned=false) THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.notifications WHERE user_id=p_profile_id AND notification_type='profile_visit' AND target_type='profile' AND target_id=uid AND created_at>now()-interval '1 hour') THEN RETURN; END IF;
 SELECT coalesce(display_name,username,'User') INTO visitor FROM public.profiles WHERE id=uid;
 INSERT INTO public.notifications(user_id,title,body,notification_type,target_type,target_id)
 VALUES(p_profile_id,'Profil dikunjungi',visitor||' mengunjungi profil anda.','profile_visit','profile',uid);
END $$;
GRANT EXECUTE ON FUNCTION public.notify_profile_visit(uuid) TO authenticated;


-- ============================================================
-- PUBLISHED CONTENT VIEW + GUEST ENGAGEMENT FIX 2026-09-14
-- ============================================================
BEGIN;

-- PasteLink keeps its real paid/free access instead of being forced to free.
CREATE OR REPLACE FUNCTION public.get_market_item_detail(p_type text,p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE r record; normalized text:=lower(btrim(coalesce(p_type,''))); paid boolean:=false; can_access boolean:=false;
BEGIN
  IF normalized IN ('product','link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,coalesce(p.creator_id,p.seller_id) owner_id
    INTO r FROM public.products p LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
    WHERE p.id=p_id AND p.status IN ('published','active','live');
  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id
    INTO r FROM public.telegram_products p LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.id=p_id AND p.status IN ('published','active','live');
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id seller_id,p.owner_id owner_id,p.name title
    INTO r FROM public.telegram_channels p LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.id=p_id AND p.status IN ('published','active','live');
  ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.user_id owner_id,
           coalesce(p.access_type,CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END) access_type,
           coalesce(p.price,0)::numeric price,
           p.content_html AS content
    INTO r FROM public.pastelinks p LEFT JOIN public.profiles pr ON pr.id=p.user_id
    WHERE p.id=p_id AND lower(coalesce(p.visibility,'public'))='public'
      AND (p.expires_at IS NULL OR p.expires_at>now());
  ELSE RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE'; END IF;
  IF r IS NULL THEN RETURN jsonb_build_object('found',false); END IF;
  paid:=coalesce(r.access_type,'free')='paid' OR coalesce(r.price,0)>0;
  IF NOT paid THEN can_access:=true;
  ELSIF auth.uid() IS NOT NULL THEN
    can_access := (r.owner_id=auth.uid())
      OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND (p.is_premium=true OR coalesce(p.subscription_until,now()-interval '1 second')>now()))
      OR EXISTS(SELECT 1 FROM public.purchases pu WHERE pu.buyer_id=auth.uid() AND pu.product_id=p_id AND lower(coalesce(pu.status,'')) IN ('completed','paid','success'));
  END IF;
  IF NOT can_access AND paid THEN
    RETURN (to_jsonb(r)-'content'-'content_html')||jsonb_build_object('found',true,'can_access',false,'is_paid',true);
  END IF;
  RETURN to_jsonb(r)||jsonb_build_object('found',true,'can_access',true,'is_paid',paid);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_market_item_detail(text,uuid) TO anon,authenticated;

-- Guest likes use a token instead of a fake profile FK.
ALTER TABLE public.content_likes ADD COLUMN IF NOT EXISTS guest_token text;
ALTER TABLE public.content_likes ALTER COLUMN actor_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS content_likes_guest_unique
ON public.content_likes(guest_token,target_id,target_type)
WHERE guest_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.toggle_content_like_guest(p_target_id uuid,p_target_type text,p_guest_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target text:=lower(btrim(coalesce(p_target_type,''))); owner uuid; existing uuid;
BEGIN
 IF p_target_id IS NULL OR length(btrim(coalesce(p_guest_token,''))) < 16 THEN RAISE EXCEPTION 'INVALID_GUEST_LIKE'; END IF;
 IF target IN ('product','link') THEN SELECT coalesce(creator_id,seller_id) INTO owner FROM public.products WHERE id=p_target_id AND status IN ('published','active','live');
 ELSIF target IN ('telegram_product','code') THEN SELECT owner_id INTO owner FROM public.telegram_products WHERE id=p_target_id AND status IN ('published','active','live');
 ELSIF target IN ('channel','group','telegram_channel') THEN SELECT owner_id INTO owner FROM public.telegram_channels WHERE id=p_target_id AND status IN ('published','active','live');
 ELSIF target='pastelink' THEN SELECT user_id INTO owner FROM public.pastelinks WHERE id=p_target_id AND visibility='public' AND (expires_at IS NULL OR expires_at>now());
 END IF;
 IF owner IS NULL THEN RAISE EXCEPTION 'CONTENT_NOT_FOUND'; END IF;
 SELECT id INTO existing FROM public.content_likes WHERE guest_token=p_guest_token AND target_id=p_target_id AND target_type=target LIMIT 1;
 IF existing IS NULL THEN
   INSERT INTO public.content_likes(content_owner_id,actor_id,guest_token,target_id,target_type) VALUES(owner,NULL,p_guest_token,target_id,target);
   RETURN jsonb_build_object('liked',true);
 END IF;
 DELETE FROM public.content_likes WHERE id=existing;
 RETURN jsonb_build_object('liked',false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_content_like_guest(uuid,text,text) TO anon,authenticated;

-- Anonymous comments remain allowed and retain a guest token for identity.
ALTER TABLE public.content_comments ADD COLUMN IF NOT EXISTS guest_token text;
ALTER TABLE public.content_comments ADD COLUMN IF NOT EXISTS display_name text;
DROP POLICY IF EXISTS comments_anon_insert ON public.content_comments;
CREATE POLICY comments_anon_insert ON public.content_comments FOR INSERT TO anon
WITH CHECK (user_id IS NULL AND length(btrim(coalesce(body,''))) BETWEEN 1 AND 2000);

-- Canonical public view counter for all four published content families.
CREATE OR REPLACE FUNCTION public.record_content_view(p_owner uuid,p_target_type text,p_target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text:=lower(btrim(coalesce(p_target_type,'')));
BEGIN
 IF p_target_id IS NULL THEN RETURN; END IF;
 INSERT INTO public.analytics_events(owner_id,actor_id,event_type,target_type,target_id)
 VALUES(p_owner,auth.uid(),'view',t,p_target_id);
 IF t='telegram_product' THEN UPDATE public.telegram_products SET views=views+1 WHERE id=p_target_id;
 ELSIF t='channel' THEN UPDATE public.telegram_channels SET views=views+1 WHERE id=p_target_id;
 ELSIF t='pastelink' THEN UPDATE public.pastelinks SET views=views+1 WHERE id=p_target_id;
 ELSIF t IN ('product','link') THEN UPDATE public.products SET views=views+1 WHERE id=p_target_id;
 END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_content_view(uuid,text,uuid) TO anon,authenticated;

COMMIT;
