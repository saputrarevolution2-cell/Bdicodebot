
-- ================================================================
-- PasTele Admin Panel COMPLETE MANAGEMENT SQL — 2026-09-22
-- Run after the existing unified/master SQL.
-- ================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------
-- Users: complete admin list with username + balance
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_users(p_limit integer DEFAULT 200,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public,extensions
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT p.id,p.username,p.auth_email,p.auth_email AS email,p.role,
           coalesce(p.is_admin,false) AS is_admin,
           coalesce(p.is_banned,false) AS is_banned,
           coalesce(p.balance,0)::numeric AS balance,
           p.created_at,p.updated_at
    FROM public.profiles p
    WHERE public.is_current_user_admin()
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT greatest(1,least(coalesce(p_limit,500),500))
    OFFSET greatest(coalesce(p_offset,0),0)
  ) x
$$;

-- ------------------------------------------------
-- Change user password from admin.
-- Password is stored in Supabase Auth as bcrypt hash.
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_password(p_user uuid,p_password text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,auth
AS $$
DECLARE target public.profiles%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_user IS NULL THEN RAISE EXCEPTION 'USER_ID_REQUIRED'; END IF;
  IF length(coalesce(p_password,'')) < 8 THEN RAISE EXCEPTION 'PASSWORD_TOO_SHORT'; END IF;
  SELECT * INTO target FROM public.profiles WHERE id=p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF coalesce(target.is_admin,false)=true OR lower(coalesce(target.role,''))='owner'
     THEN RAISE EXCEPTION 'ADMIN_OR_OWNER_PASSWORD_PROTECTED'; END IF;

  UPDATE auth.users
  SET encrypted_password=extensions.crypt(p_password,extensions.gen_salt('bf')),
      updated_at=now()
  WHERE id=p_user;

  IF NOT FOUND THEN RAISE EXCEPTION 'AUTH_USER_NOT_FOUND'; END IF;
  RETURN jsonb_build_object('ok',true,'id',p_user,'username',target.username);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_password(uuid,text) TO authenticated;

-- ------------------------------------------------
-- Marketplace Content: all content families + owner username
-- + actual content body for admin editing/viewing.
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_content(p_limit integer DEFAULT 500,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public,extensions
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT p.id,p.title,p.slug,coalesce(p.price,0)::numeric AS price,p.status,
      p.description,coalesce(p.content,'')::text AS content_body,
      coalesce(p.views,0)::bigint AS views,coalesce(p.sales_count,0)::bigint AS sales_count,
      coalesce(p.creator_id,p.seller_id) AS owner_id,pr.username AS owner_username,
      'products'::text AS source,coalesce(p.type,'product')::text AS type,
      lower(coalesce(p.access_type,case when coalesce(p.price,0)>0 then 'paid' else 'free' end)) AS access_type,
      p.created_at,p.updated_at
    FROM public.products p LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
    WHERE public.is_current_user_admin()

    UNION ALL

    SELECT pl.id,pl.title,pl.slug,coalesce(pl.price,0)::numeric,
      CASE WHEN lower(coalesce(pl.visibility,'public'))='public' THEN 'published' ELSE lower(pl.visibility) END,
      pl.description,coalesce(pl.content_html,'')::text,
      coalesce(pl.views,0)::bigint,0::bigint,pl.user_id,pr.username,
      'pastelinks'::text,'pastelink'::text,
      lower(coalesce(pl.access_type,case when coalesce(pl.price,0)>0 then 'paid' else 'free' end)),
      pl.created_at,pl.updated_at
    FROM public.pastelinks pl LEFT JOIN public.profiles pr ON pr.id=pl.user_id
    WHERE public.is_current_user_admin()

    UNION ALL

    SELECT tp.id,tp.title,tp.slug,coalesce(tp.price,0)::numeric,tp.status,tp.description,
      coalesce(tp.content,'')::text,coalesce(tp.views,0)::bigint,coalesce(tp.sales_count,0)::bigint,
      tp.owner_id,pr.username,'telegram_products'::text,'code'::text,
      lower(coalesce(tp.access_type,case when coalesce(tp.price,0)>0 then 'paid' else 'free' end)),
      tp.created_at,tp.updated_at
    FROM public.telegram_products tp LEFT JOIN public.profiles pr ON pr.id=tp.owner_id
    WHERE public.is_current_user_admin()

    UNION ALL

    SELECT tc.id,tc.name AS title,tc.slug,coalesce(tc.price,0)::numeric,tc.status,tc.description,
      coalesce(tc.content,'')::text,coalesce(tc.views,0)::bigint,coalesce(tc.sales_count,0)::bigint,
      tc.owner_id,pr.username,'telegram_channels'::text,
      CASE WHEN lower(coalesce(tc.type,'channel'))='group' THEN 'group' ELSE 'channel' END,
      lower(coalesce(tc.access_type,case when coalesce(tc.price,0)>0 then 'paid' else 'free' end)),
      tc.created_at,tc.updated_at
    FROM public.telegram_channels tc LEFT JOIN public.profiles pr ON pr.id=tc.owner_id
    WHERE public.is_current_user_admin()

    UNION ALL

    SELECT ps.id,ps.title,ps.slug,0::numeric,
      CASE WHEN lower(coalesce(ps.visibility,'public'))='public' THEN 'published' ELSE lower(ps.visibility) END,
      NULL::text,coalesce(ps.content,'')::text,0::bigint,0::bigint,
      ps.owner_id,pr.username,'pastes'::text,'paste'::text,'free'::text,
      ps.created_at,ps.updated_at
    FROM public.pastes ps LEFT JOIN public.profiles pr ON pr.id=ps.owner_id
    WHERE public.is_current_user_admin()
  ) x
  ORDER BY x.created_at DESC NULLS LAST
  LIMIT greatest(1,least(coalesce(p_limit,500),500))
  OFFSET greatest(coalesce(p_offset,0),0)
$$;

GRANT EXECUTE ON FUNCTION public.admin_content(integer,integer) TO authenticated;

-- ------------------------------------------------
-- Content update: title, description, price, status, content.
-- Source-aware and restricted to admin.
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_content(
  p_id uuid,p_status text,p_title text,p_description text,
  p_source text,p_price numeric DEFAULT 0,p_slug text DEFAULT NULL,p_content text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;

  IF p_source='products' THEN
    UPDATE public.products SET title=coalesce(nullif(btrim(p_title),''),title),
      description=coalesce(p_description,description),price=greatest(coalesce(p_price,0),0),
      status=coalesce(nullif(btrim(p_status),''),status),
      slug=coalesce(nullif(btrim(p_slug),''),slug),
      content=coalesce(p_content,content),updated_at=now() WHERE id=p_id;
  ELSIF p_source='pastelinks' THEN
    UPDATE public.pastelinks SET title=coalesce(nullif(btrim(p_title),''),title),
      description=coalesce(p_description,description),price=greatest(coalesce(p_price,0),0),
      visibility=CASE WHEN lower(coalesce(p_status,'')) IN ('published','public','active') THEN 'public' ELSE p_status END,
      slug=coalesce(nullif(btrim(p_slug),''),slug),
      content_html=coalesce(p_content,content_html),updated_at=now() WHERE id=p_id;
  ELSIF p_source='telegram_products' THEN
    UPDATE public.telegram_products SET title=coalesce(nullif(btrim(p_title),''),title),
      description=coalesce(p_description,description),price=greatest(coalesce(p_price,0),0),
      status=coalesce(nullif(btrim(p_status),''),status),
      slug=coalesce(nullif(btrim(p_slug),''),slug),content=coalesce(p_content,content),updated_at=now() WHERE id=p_id;
  ELSIF p_source='telegram_channels' THEN
    UPDATE public.telegram_channels SET name=coalesce(nullif(btrim(p_title),''),name),
      description=coalesce(p_description,description),price=greatest(coalesce(p_price,0),0),
      status=coalesce(nullif(btrim(p_status),''),status),
      slug=coalesce(nullif(btrim(p_slug),''),slug),content=coalesce(p_content,content),updated_at=now() WHERE id=p_id;
  ELSIF p_source='pastes' THEN
    UPDATE public.pastes SET title=coalesce(nullif(btrim(p_title),''),title),
      slug=coalesce(nullif(btrim(p_slug),''),slug),content=coalesce(p_content,content),
      visibility=CASE WHEN lower(coalesce(p_status,'')) IN ('published','public','active') THEN 'public' ELSE p_status END,
      updated_at=now() WHERE id=p_id;
  ELSE RAISE EXCEPTION 'INVALID_CONTENT_SOURCE';
  END IF;

  RETURN jsonb_build_object('ok',true,'id',p_id,'source',p_source);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_content(uuid,text,text,text,text,numeric,text,text) TO authenticated;

-- ------------------------------------------------
-- Orders: username/search/status/delete
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_orders(p_limit integer DEFAULT 500,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT o.*,p.username,p.auth_email
    FROM public.orders o
    LEFT JOIN public.profiles p ON p.id=o.buyer_id
    WHERE public.is_current_user_admin()
    ORDER BY o.created_at DESC NULLS LAST
    LIMIT greatest(1,least(coalesce(p_limit,500),500))
    OFFSET greatest(coalesce(p_offset,0),0)
  ) x
$$;

GRANT EXECUTE ON FUNCTION public.admin_orders(integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id uuid,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF lower(p_status) NOT IN ('pending','paid','success','failed','cancelled','completed') THEN RAISE EXCEPTION 'INVALID_ORDER_STATUS'; END IF;
  UPDATE public.orders SET status=lower(p_status),updated_at=now() WHERE id=p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  RETURN jsonb_build_object('ok',true,'id',p_order_id,'status',lower(p_status));
END;$$;

CREATE OR REPLACE FUNCTION public.admin_delete_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  DELETE FROM public.orders WHERE id=p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  RETURN jsonb_build_object('ok',true,'id',p_order_id);
END;$$;

GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(uuid) TO authenticated;

-- ------------------------------------------------
-- Payments: add username/buyer identity to admin payment list.
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_payments(p_limit integer DEFAULT 500,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT pay.*,coalesce(p.username,pp.username) AS username,
           coalesce(p.auth_email,pp.auth_email) AS auth_email
    FROM public.payments pay
    LEFT JOIN public.orders o ON o.id=pay.order_id
    LEFT JOIN public.profiles p ON p.id=o.buyer_id
    LEFT JOIN public.profiles pp ON pp.id=pay.user_id
    WHERE public.is_current_user_admin()
    ORDER BY pay.created_at DESC NULLS LAST
    LIMIT greatest(1,least(coalesce(p_limit,500),500))
    OFFSET greatest(coalesce(p_offset,0),0)
  ) x
$$;

GRANT EXECUTE ON FUNCTION public.admin_payments(integer,integer) TO authenticated;

-- ------------------------------------------------
-- Withdrawals: username + email in admin list.
-- Existing admin_process_withdrawal remains the authoritative
-- status processor; the frontend requires a reject reason.
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_withdrawals(p_limit integer DEFAULT 300,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT w.*,p.username,p.auth_email
    FROM public.withdrawals w
    LEFT JOIN public.profiles p ON p.id=w.user_id
    WHERE public.is_current_user_admin()
    ORDER BY w.created_at DESC NULLS LAST
    LIMIT greatest(1,least(coalesce(p_limit,500),500))
    OFFSET greatest(coalesce(p_offset,0),0)
  ) x
$$;

GRANT EXECUTE ON FUNCTION public.admin_withdrawals(integer,integer) TO authenticated;

-- ------------------------------------------------
-- Transactions: username + delete
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_transactions(p_limit integer DEFAULT 500,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT t.*,p.username,p.auth_email
    FROM public.transactions t
    LEFT JOIN public.profiles p ON p.id=t.user_id
    WHERE public.is_current_user_admin()
    ORDER BY t.created_at DESC NULLS LAST
    LIMIT greatest(1,least(coalesce(p_limit,500),500))
    OFFSET greatest(coalesce(p_offset,0),0)
  ) x
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_transaction(p_transaction_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  DELETE FROM public.transactions WHERE id=p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRANSACTION_NOT_FOUND'; END IF;
  RETURN jsonb_build_object('ok',true,'id',p_transaction_id);
END;$$;

GRANT EXECUTE ON FUNCTION public.admin_transactions(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_transaction(uuid) TO authenticated;

COMMIT;
