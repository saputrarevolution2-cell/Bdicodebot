-- PasTele — Bayar.gg payments + marketplace 70/30
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS item_type text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS item_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS item_title text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_uidx ON public.orders(payment_reference) WHERE payment_reference IS NOT NULL;

DROP FUNCTION IF EXISTS public.create_checkout_order(text,text);
CREATE OR REPLACE FUNCTION public.create_checkout_order(p_type text,p_id text)
RETURNS TABLE(order_id uuid,amount numeric,item_title text,item_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); seller uuid; title text; price numeric; oid uuid; normalized text:=lower(coalesce(p_type,''));
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 IF btrim(coalesce(p_id,''))='' THEN RAISE EXCEPTION 'PRODUCT_ID_REQUIRED'; END IF;
 IF normalized IN ('link','paste','pastelink','paste-link','paste_link') THEN SELECT p.user_id,p.title,p.price INTO seller,title,price FROM public.pastelinks p WHERE p.id::text=p_id LIMIT 1;
 ELSIF normalized IN ('product','code') THEN SELECT p.seller_id,p.title,p.price INTO seller,title,price FROM public.products p WHERE p.id::text=p_id LIMIT 1;
 ELSIF normalized IN ('telegram_product','telegram-product') THEN SELECT p.owner_id,p.title,p.price INTO seller,title,price FROM public.telegram_products p WHERE p.id::text=p_id LIMIT 1;
 ELSIF normalized IN ('channel','telegram_channel','telegram-channel') THEN SELECT p.owner_id,p.name,p.price INTO seller,title,price FROM public.telegram_channels p WHERE p.id::text=p_id LIMIT 1;
 ELSE RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE'; END IF;
 IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
 IF seller=uid THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_PRODUCT'; END IF;
 IF coalesce(price,0)<=0 THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;
 SELECT o.id INTO oid FROM public.orders o WHERE o.buyer_id=uid AND o.product_id::text=p_id AND lower(coalesce(o.item_type,''))=normalized AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid') ORDER BY o.created_at DESC LIMIT 1;
 IF oid IS NULL THEN INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title) VALUES(uid,seller,p_id::uuid,price,'pending',normalized,p_id,title) RETURNING id INTO oid; END IF;
 RETURN QUERY SELECT oid,price,title,normalized;
END $$;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(text,text) TO authenticated;

DROP FUNCTION IF EXISTS public.create_account_plan_order(text,integer,numeric);

CREATE OR REPLACE FUNCTION public.create_account_plan_order(p_plan text,p_days integer,p_amount numeric)
RETURNS TABLE(order_id uuid,amount numeric,item_title text,item_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); oid uuid; expected numeric; title text; normalized text:=lower(coalesce(p_plan,''));
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 IF normalized='premium' THEN expected:=250000; title:='PasTele Premium';
 ELSIF normalized IN ('subscription_1','subscription_3','subscription_7') THEN expected:=CASE normalized WHEN 'subscription_1' THEN 15000 WHEN 'subscription_3' THEN 30000 WHEN 'subscription_7' THEN 50000 END; title:='Langganan PasTele '||coalesce(p_days,0)||' Hari';
 ELSE RAISE EXCEPTION 'INVALID_PLAN'; END IF;
 IF round(coalesce(p_amount,0),0)<>expected THEN RAISE EXCEPTION 'INVALID_PLAN_AMOUNT'; END IF;
 INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title) VALUES(uid,uid,NULL,expected,'pending','account_plan',normalized,title) RETURNING id INTO oid;
 RETURN QUERY SELECT oid,expected,title,'account_plan'::text;
END $$;
GRANT EXECUTE ON FUNCTION public.create_account_plan_order(text,integer,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.settle_bayargg_order(p_order_id uuid,p_invoice_id text,p_gateway_status text,p_final_amount numeric,p_gateway_payload jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders%ROWTYPE; seller_share numeric; platform_fee numeric; tx_exists boolean; plan text; days integer;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF lower(coalesce(o.status,'')) IN ('paid','success','completed') THEN RETURN true; END IF;
 IF lower(coalesce(p_gateway_status,'')) NOT IN ('paid','settled') THEN RETURN false; END IF;
 IF round(coalesce(p_final_amount,0),0)<>round(coalesce(o.amount,0),0) THEN RAISE EXCEPTION 'AMOUNT_MISMATCH'; END IF;
 UPDATE public.orders SET status='paid',paid_at=coalesce(paid_at,now()),payment_reference=coalesce(p_invoice_id,payment_reference) WHERE id=o.id;
 IF lower(coalesce(o.item_type,''))='account_plan' THEN
   plan:=lower(coalesce(o.item_id,''));
   IF plan='premium' THEN UPDATE public.profiles SET is_premium=true WHERE id=o.buyer_id;
   ELSE days:=CASE plan WHEN 'subscription_1' THEN 1 WHEN 'subscription_3' THEN 3 WHEN 'subscription_7' THEN 7 ELSE 0 END;
     IF days>0 THEN UPDATE public.profiles SET subscription_until=greatest(coalesce(subscription_until,now()),now())+(days||' days')::interval WHERE id=o.buyer_id; END IF;
   END IF;
 ELSE
   seller_share:=round(coalesce(o.amount,0)*0.70,2); platform_fee:=round(coalesce(o.amount,0)-seller_share,2);
   INSERT INTO public.wallets(user_id,balance,available_balance,pending_balance) VALUES(o.seller_id,seller_share,seller_share,0) ON CONFLICT(user_id) DO UPDATE SET balance=coalesce(public.wallets.balance,0)+excluded.balance,available_balance=coalesce(public.wallets.available_balance,0)+excluded.available_balance;
   SELECT EXISTS(SELECT 1 FROM public.transactions t WHERE t.user_id=o.seller_id AND t.reference=('bayargg-order:'||o.id::text)) INTO tx_exists;
   IF NOT tx_exists THEN INSERT INTO public.transactions(user_id,amount,fee,net_amount,type,status,reference) VALUES(o.seller_id,seller_share,platform_fee,seller_share,'sale_earning','completed','bayargg-order:'||o.id::text); END IF;
   IF lower(coalesce(o.item_type,'')) IN ('product','code') THEN UPDATE public.products SET sales_count=coalesce(sales_count,0)+1,updated_at=now() WHERE id=o.product_id;
   ELSIF lower(coalesce(o.item_type,'')) IN ('telegram_product','telegram-product') THEN UPDATE public.telegram_products SET sales_count=coalesce(sales_count,0)+1,updated_at=now() WHERE id=o.product_id; END IF;
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.settle_bayargg_order(uuid,text,text,numeric,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_bayargg_order(uuid,text,text,numeric,jsonb) TO service_role;
