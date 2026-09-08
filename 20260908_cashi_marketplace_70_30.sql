-- PasTele marketplace + Cashi settlement
-- Seller/creator receives 70%; platform fee is 30%.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS item_type text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS item_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS item_title text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_uidx
ON public.orders(payment_reference)
WHERE payment_reference IS NOT NULL;

DROP FUNCTION IF EXISTS public.create_checkout_order(text,text);

CREATE OR REPLACE FUNCTION public.create_checkout_order(p_type text, p_id text)
RETURNS TABLE(order_id uuid, amount numeric, item_title text, item_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  uid uuid := auth.uid();
  seller uuid;
  title text;
  price numeric;
  oid uuid;
  normalized text := lower(coalesce(p_type,''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF p_id IS NULL OR btrim(p_id)='' THEN RAISE EXCEPTION 'PRODUCT_ID_REQUIRED'; END IF;

  IF normalized IN ('link','paste','pastelink','paste-link','paste_link') THEN
    SELECT p.user_id,p.title,p.price INTO seller,title,price FROM public.pastelinks p WHERE p.id::text=p_id LIMIT 1;
  ELSIF normalized IN ('product','code') THEN
    SELECT p.seller_id,p.title,p.price INTO seller,title,price FROM public.products p WHERE p.id::text=p_id LIMIT 1;
  ELSIF normalized IN ('telegram_product','telegram-product') THEN
    SELECT p.owner_id,p.title,p.price INTO seller,title,price FROM public.telegram_products p WHERE p.id::text=p_id LIMIT 1;
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel') THEN
    SELECT p.owner_id,p.name,p.price INTO seller,title,price FROM public.telegram_channels p WHERE p.id::text=p_id LIMIT 1;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF seller=uid THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_PRODUCT'; END IF;
  IF coalesce(price,0)<=0 THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;

  SELECT o.id INTO oid FROM public.orders o
  WHERE o.buyer_id=uid AND o.product_id::text=p_id AND lower(coalesce(o.item_type,''))=normalized
    AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid')
  ORDER BY o.created_at DESC LIMIT 1;

  IF oid IS NULL THEN
    INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title)
    VALUES(uid,seller,p_id::uuid,price,'pending',normalized,p_id,title)
    RETURNING id INTO oid;
  END IF;

  RETURN QUERY SELECT oid,price,title,normalized;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_cashi_order(p_order_id uuid, p_gateway_status text, p_gateway_payload jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  seller_share numeric;
  platform_fee numeric;
  tx_exists boolean;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF lower(coalesce(o.status,'')) IN ('paid','success','completed') THEN RETURN true; END IF;
  IF upper(coalesce(p_gateway_status,'')) <> 'SETTLED' THEN RETURN false; END IF;

  seller_share := round(coalesce(o.amount,0) * 0.70, 2);
  platform_fee := round(coalesce(o.amount,0) - seller_share, 2);

  UPDATE public.orders
  SET status='paid', paid_at=coalesce(paid_at,now()), payment_reference=coalesce(payment_reference, p_gateway_payload #>> '{data,order_id}')
  WHERE id=o.id;

  -- Credit seller atomically. Wallet rows are created if absent.
  INSERT INTO public.wallets(user_id,balance,available_balance,pending_balance)
  VALUES(o.seller_id,seller_share,seller_share,0)
  ON CONFLICT(user_id) DO UPDATE SET
    balance=coalesce(public.wallets.balance,0)+excluded.balance,
    available_balance=coalesce(public.wallets.available_balance,0)+excluded.available_balance;

  SELECT EXISTS(
    SELECT 1 FROM public.transactions t
    WHERE t.user_id=o.seller_id AND t.reference=('cashi-order:'||o.id::text)
  ) INTO tx_exists;

  IF NOT tx_exists THEN
    INSERT INTO public.transactions(user_id,amount,fee,net_amount,type,status,reference)
    VALUES(o.seller_id,seller_share,platform_fee,seller_share,'sale_earning','completed','cashi-order:'||o.id::text);
  END IF;

  -- Product sales counter.
  IF lower(coalesce(o.item_type,'')) IN ('product','code') THEN
    UPDATE public.products SET sales_count=coalesce(sales_count,0)+1, updated_at=now() WHERE id=o.product_id;
  ELSIF lower(coalesce(o.item_type,'')) IN ('telegram_product','telegram-product') THEN
    UPDATE public.telegram_products SET sales_count=coalesce(sales_count,0)+1, updated_at=now() WHERE id=o.product_id;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_cashi_order(uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_cashi_order(uuid,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(text,text) TO authenticated;
