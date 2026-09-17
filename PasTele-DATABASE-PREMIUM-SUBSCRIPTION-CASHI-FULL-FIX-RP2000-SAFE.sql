/*
====================================================================
PasTele / TeleCod — DATABASE MASTER SINGLE SQL
2026-09-14
====================================================================
Canonical one-file database for the complete HTML/CSS/JS build.

Order:
1. Core schema + security + RPCs from database.sql
2. Final compatibility fixes for marketplace, guest access,
   likes/comments, notifications, views and Cashi settlement.

Run this single file in Supabase SQL Editor as postgres/service-role.
It is designed to preserve existing application data while creating
missing tables/columns/indexes/functions and replacing the canonical
RPC definitions.
====================================================================
*/

/*
====================================================================
PasTele / Bdicodebot
SUPABASE MASTER FULL FIX — IDEMPOTENT
====================================================================
1) Application tables are NOT dropped; existing data is preserved.
2) Tables use CREATE TABLE IF NOT EXISTS.
3) Columns are added with ADD COLUMN IF NOT EXISTS where migrations need them.
4) Indexes use CREATE INDEX IF NOT EXISTS / CREATE UNIQUE INDEX IF NOT EXISTS.
5) Policies are safely dropped/recreated by name, so reruns do not fail.
6) Triggers are safely dropped/recreated by name.
7) Views are safely dropped/recreated by name.
8) Existing Auth users are never deleted.
9) PostgreSQL has no CREATE FUNCTION IF NOT EXISTS. Functions use CREATE
   OR REPLACE with stable signatures. The historical incompatible
   resolve_username_login return shape is conditionally removed only when
   the old 2-column function exists.
10) Run in Supabase SQL Editor as postgres/service-role.
====================================================================
*/

-- ============================================================
-- PasTele / Bdicodebot
-- CANONICAL MASTER / PRODUCTION SAFE
--
-- IMPORTANT:
-- 1) Application data is preserved; this file does not DROP application tables.
-- 2) Supabase auth.users is never deleted.
-- 3) Existing functions/triggers/views may be replaced to match this schema.
-- 4) Run in Supabase SQL Editor as postgres/service-role.
-- 5) Marketplace seller earnings are 70%; platform fee is 30%.
-- 6) Seller earnings enter PENDING first.
-- 7) H1/H2 settlement rules are retained from the project specification.
-- 8) This file contains ONE canonical marketplace_public view.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- DROP APPLICATION FUNCTIONS
-- ============================================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND (
        p.proname LIKE 'admin_%'
        OR p.proname IN (
          'buy_market_item','create_account_plan_order',
          'create_checkout_order','get_market_item_detail',
          'get_pending_balance_detail','get_public_site_settings',
          'get_public_workspace_stats','increment_paste_view',
          'record_content_view','release_matured_wallet',
          'request_withdrawal_v2','resolve_username_login',
          'check_username_available','settle_cashi_order',
          'toggle_content_like','track_analytics','delete_purchase',
          'is_current_user_admin'
        )
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                   r.nspname,r.proname,r.args);
  END LOOP;
END $$;

-- ============================================================
-- DROP APPLICATION TABLES
-- ============================================================

DROP VIEW IF EXISTS public.profile_public CASCADE;
DROP VIEW IF EXISTS public.marketplace_public CASCADE;


-- ============================================================
-- CORE PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  auth_email text NOT NULL,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user',
  is_admin boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  telegram_username text,
  youtube_url text,
  facebook_url text,
  whatsapp_number text,
  bio text,
  website text,
  country text,
  is_premium boolean NOT NULL DEFAULT false,
  subscription_until timestamptz
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_url text;

-- Canonical public profile view.
-- Only exposes fields needed by public marketplace/profile cards.
-- It intentionally does NOT expose auth_email, balance, role, admin flags,
-- premium/subscription data, or other private profile fields.
DROP VIEW IF EXISTS public.profile_public CASCADE;
CREATE VIEW public.profile_public
WITH (security_invoker=true)
AS
SELECT id, username, display_name, avatar_url, country
FROM public.profiles
WHERE is_banned=false;

GRANT SELECT ON public.profile_public TO anon,authenticated;

CREATE TABLE IF NOT EXISTS public.admins (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  telegram_id bigint NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PRODUCTS / MARKETPLACE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  price numeric(18,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  thumbnail_url text,
  type text NOT NULL DEFAULT 'link',
  access_type text NOT NULL DEFAULT 'free',
  category text NOT NULL DEFAULT 'General',
  description text DEFAULT '',
  content text DEFAULT '',
  views bigint NOT NULL DEFAULT 0,
  sales_count bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'code',
  product_type text,
  access_type text NOT NULL DEFAULT 'free',
  bot_username text,
  telegram_bot_id bigint,
  price numeric(18,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  content text DEFAULT '',
  thumbnail_url text,
  category text DEFAULT 'General',
  status text NOT NULL DEFAULT 'draft',
  views bigint NOT NULL DEFAULT 0,
  sales_count bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  username text,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'channel',
  access_type text NOT NULL DEFAULT 'free',
  telegram_channel_id text,
  description text DEFAULT '',
  invite_url text,
  price numeric(18,2) NOT NULL DEFAULT 0,
  category text DEFAULT 'General',
  status text NOT NULL DEFAULT 'draft',
  views bigint NOT NULL DEFAULT 0,
  sales_count bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  product_id uuid,
  order_id uuid,
  item_type text,
  item_id text,
  item_title text,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  access_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  product_id uuid,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  item_type text,
  item_id text,
  item_title text,
  payment_reference text,
  paid_at timestamptz,
  gateway_payload jsonb DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_uidx
ON public.orders(payment_reference)
WHERE payment_reference IS NOT NULL;

-- ============================================================
-- PASTE / PASTELINK
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pastelinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content_html text NOT NULL,
  visibility text NOT NULL DEFAULT 'public',
  password_hash text,
  expires_at timestamptz,
  description text DEFAULT '',
  tags text[] DEFAULT '{}'::text[],
  allow_comments boolean DEFAULT true,
  allow_download boolean DEFAULT true,
  show_raw boolean DEFAULT true,
  anonymous boolean DEFAULT false,
  views bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pastes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  visibility text NOT NULL DEFAULT 'public',
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PAYMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id integer PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'manual',
  mode text NOT NULL DEFAULT 'manual',
  merchant_id text,
  api_endpoint text,
  qr_image_url text,
  instructions text,
  currency text NOT NULL DEFAULT 'IDR',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_settings(id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  method_type text NOT NULL,
  provider text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  country text DEFAULT 'ID',
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  method text,
  reference text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_uidx
ON public.payments(reference)
WHERE reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  delivery_url text,
  delivered_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_views (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  product_id uuid NOT NULL,
  viewer_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- WALLET / TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  available_balance numeric(18,2) NOT NULL DEFAULT 0,
  pending_balance numeric(18,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  fee numeric(18,2) NOT NULL DEFAULT 0,
  net_amount numeric(18,2) NOT NULL DEFAULT 0,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  reference text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_uidx
ON public.transactions(user_id, reference)
WHERE reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  balance_before numeric(18,2) NOT NULL DEFAULT 0,
  balance_after numeric(18,2) NOT NULL DEFAULT 0,
  reference text,
  status text NOT NULL DEFAULT 'completed',
  available_at timestamptz,
  settlement_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  fee numeric(18,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  net_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  mode text,
  method text,
  account_name text,
  account_number text,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- ============================================================
-- SOCIAL / CONTENT / NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.creator_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(creator_id,follower_id)
);

CREATE TABLE IF NOT EXISTS public.content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,
  target_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_id,target_id,target_type)
);

CREATE TABLE IF NOT EXISTS public.content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL,
  target_type text NOT NULL DEFAULT 'product',
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  target_type text,
  target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.code_access_usage (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  opens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,usage_date)
);

CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address inet,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  user_agent text,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BOT / SITE SETTINGS / STATS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.approved_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_username text NOT NULL UNIQUE,
  bot_name text,
  bot_id bigint,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bot_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  bot_username text,
  telegram_bot_id bigint,
  encrypted_token text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings(id) VALUES(1)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.site_stats (
  id integer PRIMARY KEY,
  total_users bigint NOT NULL DEFAULT 0,
  total_products bigint NOT NULL DEFAULT 0,
  total_orders bigint NOT NULL DEFAULT 0,
  total_sales numeric(18,2) NOT NULL DEFAULT 0,
  total_revenue numeric(18,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_stats(id) VALUES(1)
ON CONFLICT(id) DO NOTHING;

-- ============================================================
-- PUBLIC VIEWS
-- ============================================================



-- ============================================================
-- AUTH PROFILE + WALLET AUTOMATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  candidate text;
  n integer := 0;
BEGIN
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username',''),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  IF base_username = '' THEN
    base_username := lower(split_part(coalesce(new.email,'user'),'@',1));
    base_username := regexp_replace(base_username,'[^a-zA-Z0-9_]','','g');
  END IF;
  IF base_username = '' THEN base_username := 'user'; END IF;
  base_username := left(base_username, 24);
  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username=candidate) LOOP
    n := n + 1;
    candidate := left(base_username, greatest(1, 32-length(n::text)-1)) || '_' || n::text;
  END LOOP;

  INSERT INTO public.profiles(id,username,auth_email,display_name)
  VALUES(
    new.id,
    candidate,
    lower(coalesce(new.email,'')),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), candidate)
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_email=excluded.auth_email,
    display_name=coalesce(public.profiles.display_name,excluded.display_name),
    updated_at=now();

  INSERT INTO public.wallets(user_id,balance,available_balance,pending_balance)
  VALUES(new.id,0,0,0)
  ON CONFLICT(user_id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep profile email synchronized after email changes.
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET auth_email=lower(coalesce(new.email,'')), updated_at=now()
  WHERE id=new.id;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON public.profiles(is_admin,role);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON public.purchases(buyer_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS purchases_order_id_uidx ON public.purchases(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id,is_read,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_owner ON public.analytics_events(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_maturity ON public.wallet_transactions(user_id,available_at) WHERE status='pending';

-- ============================================================
-- HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id=auth.uid()
      AND p.is_banned=false
      AND (p.is_admin=true OR lower(p.role) IN ('admin','owner'))
  );
$$;

-- ============================================================
-- PURCHASE MANAGEMENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_purchase(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  DELETE FROM public.purchases
  WHERE id=p_id AND (buyer_id=auth.uid() OR public.is_current_user_admin());
  IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_NOT_FOUND'; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- USER HELPERS
-- ============================================================

-- PostgreSQL cannot change OUT/RETURNS TABLE shape with CREATE OR REPLACE.
-- Remove the historical 2-column version only when that exact incompatible
-- return shape exists; otherwise leave the current function untouched.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname='resolve_username_login'
      AND pg_get_function_identity_arguments(p.oid)='p_username text'
      AND pg_get_function_result(p.oid) LIKE 'TABLE(auth_email text, is_banned boolean)%'
  ) THEN
    DROP FUNCTION public.resolve_username_login(text);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_username_login(p_username text)
RETURNS TABLE(username text,auth_email text,is_banned boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT p.username,p.auth_email,COALESCE(p.is_banned,false)
  FROM public.profiles p
  WHERE lower(btrim(p.username))=lower(btrim(coalesce(p_username,'')))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT NOT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE lower(username)=lower(btrim(p_username))
  );
$$;

-- ============================================================
-- CHECKOUT
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_checkout_order(p_type text,p_id text)
RETURNS TABLE(order_id uuid,amount numeric,item_title text,item_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();
  seller uuid;
  title text;
  price numeric;
  oid uuid;
  normalized text:=lower(btrim(coalesce(p_type,'')));
  pid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF btrim(coalesce(p_id,''))='' THEN RAISE EXCEPTION 'PRODUCT_ID_REQUIRED'; END IF;

  BEGIN
    pid := p_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'INVALID_PRODUCT_ID';
  END;

  IF normalized IN ('product','code') THEN
    SELECT p.seller_id,p.title,p.price INTO seller,title,price
    FROM public.products p WHERE p.id=pid;
  ELSIF normalized IN ('telegram_product','telegram-product') THEN
    SELECT p.owner_id,p.title,p.price INTO seller,title,price
    FROM public.telegram_products p WHERE p.id=pid;
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel') THEN
    SELECT p.owner_id,p.name,p.price INTO seller,title,price
    FROM public.telegram_channels p WHERE p.id=pid;
  ELSIF normalized IN ('link','paste','pastelink','paste-link','paste_link') THEN
    SELECT p.user_id,p.title,0::numeric INTO seller,title,price
    FROM public.pastelinks p WHERE p.id=pid;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF seller=uid THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_PRODUCT'; END IF;
  IF coalesce(price,0)<=0 THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;

  SELECT o.id INTO oid
  FROM public.orders o
  WHERE o.buyer_id=uid AND o.product_id=pid
    AND lower(coalesce(o.item_type,''))=normalized
    AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid')
  ORDER BY o.created_at DESC LIMIT 1;

  IF oid IS NULL THEN
    INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title)
    VALUES(uid,seller,pid,price,'pending',normalized,p_id,title)
    RETURNING id INTO oid;
  END IF;

  RETURN QUERY SELECT oid,price,title,normalized;
END $$;

CREATE OR REPLACE FUNCTION public.create_account_plan_order(
  p_plan text,p_days integer,p_amount numeric
)
RETURNS TABLE(order_id uuid,amount numeric,item_title text,item_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 uid uuid:=auth.uid(); oid uuid; expected numeric; title text;
 normalized text:=lower(btrim(coalesce(p_plan,'')));
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;

 IF normalized='premium' THEN expected:=250000; title:='PasTele Premium';
 ELSIF normalized='subscription_1' THEN expected:=15000; title:='Langganan PasTele 1 Hari';
 ELSIF normalized='subscription_3' THEN expected:=30000; title:='Langganan PasTele 3 Hari';
 ELSIF normalized='subscription_7' THEN expected:=50000; title:='Langganan PasTele 7 Hari';
 ELSE RAISE EXCEPTION 'INVALID_PLAN'; END IF;

 IF round(coalesce(p_amount,0),0)<>expected THEN RAISE EXCEPTION 'INVALID_PLAN_AMOUNT'; END IF;

 INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title)
 VALUES(uid,uid,NULL,expected,'pending','account_plan',normalized,title)
 RETURNING id INTO oid;

 RETURN QUERY SELECT oid,expected,title,'account_plan'::text;
END $$;

-- ============================================================
-- Cashi SETTLEMENT 70/30
-- ============================================================

CREATE OR REPLACE FUNCTION public.settle_cashi_order(
 p_order_id uuid,p_invoice_id text,p_gateway_status text,
 p_final_amount numeric,p_gateway_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 o public.orders%ROWTYPE;
 seller_share numeric; platform_fee numeric;
 local_paid_at timestamp;
 v_available_at timestamptz;
 v_settlement_code text;
 v_balance_before numeric:=0;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF lower(coalesce(o.status,'')) IN ('paid','success','completed','settled') THEN RETURN true; END IF;
 IF lower(coalesce(p_gateway_status,'')) NOT IN ('paid','settled','success') THEN RETURN false; END IF;
 IF round(coalesce(p_final_amount,0),0)<>round(coalesce(o.amount,0),0) THEN RAISE EXCEPTION 'AMOUNT_MISMATCH'; END IF;

 IF o.item_type='account_plan' THEN
   UPDATE public.orders SET status='paid',paid_at=coalesce(paid_at,now()),
     payment_reference=coalesce(p_invoice_id,payment_reference),
     gateway_payload=coalesce(p_gateway_payload,'{}'::jsonb) WHERE id=o.id;
   IF o.item_id='premium' THEN
     UPDATE public.profiles SET is_premium=true,updated_at=now() WHERE id=o.buyer_id;
   ELSIF o.item_id IN ('subscription_1','subscription_3','subscription_7') THEN
     UPDATE public.profiles SET subscription_until=greatest(coalesce(subscription_until,now()),now())+
       CASE o.item_id WHEN 'subscription_1' THEN interval '1 day' WHEN 'subscription_3' THEN interval '3 days'
       WHEN 'subscription_7' THEN interval '7 days' END,updated_at=now() WHERE id=o.buyer_id;
   END IF;
   INSERT INTO public.purchases(buyer_id,product_id,order_id,item_type,item_id,item_title,amount,status)
   SELECT o.buyer_id,NULL,o.id,o.item_type,o.item_id,o.item_title,o.amount,'completed'
   WHERE NOT EXISTS(SELECT 1 FROM public.purchases WHERE order_id=o.id);
   RETURN true;
 END IF;

 seller_share:=round(coalesce(o.amount,0)*0.70,2);
 platform_fee:=round(coalesce(o.amount,0)-seller_share,2);

 -- WIB/Asia-Jakarta settlement rule:
 -- before 21:00 WIB = H1 (next calendar day)
 -- 21:00 WIB or later = H2 (second calendar day)
 local_paid_at:=timezone('Asia/Jakarta',now());
 IF local_paid_at::time < time '21:00:00' THEN
   v_available_at:=timezone('Asia/Jakarta',date_trunc('day',local_paid_at)+interval '1 day');
   v_settlement_code:='H1';
 ELSE
   v_available_at:=timezone('Asia/Jakarta',date_trunc('day',local_paid_at)+interval '2 days');
   v_settlement_code:='H2';
 END IF;

 UPDATE public.orders SET status='paid',paid_at=coalesce(paid_at,now()),
   payment_reference=coalesce(p_invoice_id,payment_reference),
   gateway_payload=coalesce(p_gateway_payload,'{}'::jsonb) WHERE id=o.id;

 IF NOT EXISTS(SELECT 1 FROM public.purchases WHERE order_id=o.id) THEN
   SELECT coalesce(balance,0) INTO v_balance_before
   FROM public.wallets WHERE user_id=o.seller_id FOR UPDATE;

   -- 70% belongs to seller, but stays PENDING until H1/H2.
   INSERT INTO public.wallets(user_id,balance,available_balance,pending_balance)
   VALUES(o.seller_id,seller_share,0,seller_share)
   ON CONFLICT(user_id) DO UPDATE SET
     balance=public.wallets.balance+excluded.balance,
     pending_balance=public.wallets.pending_balance+excluded.pending_balance,
     updated_at=now();

   UPDATE public.profiles SET balance=balance+seller_share,updated_at=now() WHERE id=o.seller_id;

   INSERT INTO public.wallet_transactions(
     user_id,type,amount,balance_before,balance_after,reference,status,available_at,settlement_code
   ) VALUES(
     o.seller_id,'sale_earning',seller_share,v_balance_before,
     v_balance_before+seller_share,'cashi-order:'||o.id::text,'pending',v_available_at,v_settlement_code
   );

   INSERT INTO public.transactions(user_id,amount,fee,net_amount,type,status,reference,description)
   VALUES(o.seller_id,seller_share,platform_fee,seller_share,'sale_earning','pending',
          'cashi-order:'||o.id::text,'Marketplace sale 70/30 - '||v_settlement_code)
   ON CONFLICT(user_id,reference) DO NOTHING;

   IF lower(coalesce(o.item_type,'')) IN ('product','code') THEN
     UPDATE public.products SET sales_count=sales_count+1,updated_at=now() WHERE id=o.product_id;
   ELSIF lower(coalesce(o.item_type,''))='telegram_product' THEN
     UPDATE public.telegram_products SET sales_count=sales_count+1,updated_at=now() WHERE id=o.product_id;
   ELSIF lower(coalesce(o.item_type,'')) IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
     UPDATE public.telegram_channels SET sales_count=sales_count+1,updated_at=now() WHERE id=o.product_id;
   END IF;

   INSERT INTO public.purchases(buyer_id,product_id,order_id,item_type,item_id,item_title,amount,status)
   VALUES(o.buyer_id,o.product_id,o.id,o.item_type,o.item_id,o.item_title,o.amount,'completed');
 END IF;
 RETURN true;
END $$;

-- ============================================================
-- MARKETPLACE
-- ============================================================

CREATE OR REPLACE FUNCTION public.buy_market_item(p_type text,p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 r record; result jsonb;
BEGIN
 SELECT * INTO r FROM public.create_checkout_order(p_type,p_id::text);
 result:=jsonb_build_object(
   'order_id',r.order_id,'amount',r.amount,
   'item_title',r.item_title,'item_type',r.item_type
 );
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_market_item_detail(p_type text,p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  r record;
  normalized text:=lower(btrim(coalesce(p_type,'')));
BEGIN
  IF normalized IN ('product','code') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           coalesce(p.creator_id,p.seller_id) AS owner_id
    INTO r
    FROM public.products p
    LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
    WHERE p.id=p_id;

  ELSIF normalized IN ('telegram_product','telegram-product') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name
    INTO r
    FROM public.telegram_products p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.id=p_id;

  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.owner_id AS seller_id,
           p.name AS title
    INTO r
    FROM public.telegram_channels p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.id=p_id;

  ELSIF normalized IN ('link','paste','pastelink','paste-link','paste_link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.user_id AS owner_id,
           0::numeric AS price,
           'link'::text AS item_type
    INTO r
    FROM public.pastelinks p
    LEFT JOIN public.profiles pr ON pr.id=p.user_id
    WHERE p.id=p_id;

  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF r IS NULL THEN
    RETURN jsonb_build_object('found',false);
  END IF;

  RETURN to_jsonb(r)||jsonb_build_object(
    'found',true,
    'can_access',
      CASE
        WHEN auth.uid() IS NULL THEN false
        WHEN EXISTS(
          SELECT 1 FROM public.purchases pu
          WHERE pu.buyer_id=auth.uid()
            AND pu.product_id=p_id
            AND lower(coalesce(pu.status,'')) IN ('completed','paid','success')
        ) THEN true
        WHEN public.is_current_user_admin() THEN true
        ELSE false
      END
  );
END $$;

-- ============================================================
-- WALLET / WITHDRAWAL
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_pending_balance_detail()
RETURNS TABLE(
 id uuid,amount numeric,created_at timestamptz,
 available_at timestamptz,hold_label text
)
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
 SELECT wt.id,wt.amount,wt.created_at,wt.available_at,
        CASE wt.settlement_code WHEN 'H2' THEN 'Settlement H2' ELSE 'Settlement H1' END
 FROM public.wallet_transactions wt
 WHERE wt.user_id=auth.uid()
   AND wt.status='pending'
 ORDER BY wt.available_at ASC,wt.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.release_matured_wallet()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE moved numeric:=0; uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;

 SELECT coalesce(sum(amount),0) INTO moved
 FROM public.wallet_transactions
 WHERE user_id=uid AND status='pending'
   AND available_at IS NOT NULL AND available_at<=now();

 UPDATE public.wallet_transactions
 SET status='completed'
 WHERE user_id=uid AND status='pending'
   AND available_at IS NOT NULL AND available_at<=now();

 IF moved>0 THEN
   UPDATE public.wallets
   SET pending_balance=greatest(0,pending_balance-moved),
       available_balance=available_balance+moved,updated_at=now()
   WHERE user_id=uid;

   UPDATE public.transactions t
   SET status='completed'
   WHERE t.user_id=uid AND t.type='sale_earning' AND t.status='pending'
     AND EXISTS (
       SELECT 1 FROM public.wallet_transactions wt
       WHERE wt.user_id=uid AND wt.reference=t.reference
         AND wt.status='completed' AND wt.available_at<=now()
     );
 END IF;

 RETURN jsonb_build_object('released',moved);
END $$;

CREATE OR REPLACE FUNCTION public.release_all_matured_wallets()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 r record; moved_total numeric:=0; moved_users integer:=0;
BEGIN
 FOR r IN
   SELECT wt.user_id,coalesce(sum(wt.amount),0) AS amount
   FROM public.wallet_transactions wt
   WHERE wt.status='pending'
     AND wt.available_at IS NOT NULL
     AND wt.available_at<=now()
     AND wt.user_id IS NOT NULL
   GROUP BY wt.user_id
 LOOP
   UPDATE public.wallet_transactions
   SET status='completed'
   WHERE user_id=r.user_id AND status='pending'
     AND available_at IS NOT NULL AND available_at<=now();

   UPDATE public.wallets
   SET pending_balance=greatest(0,pending_balance-r.amount),
       available_balance=available_balance+r.amount,updated_at=now()
   WHERE user_id=r.user_id;

   UPDATE public.transactions t
   SET status='completed'
   WHERE t.user_id=r.user_id AND t.type='sale_earning' AND t.status='pending'
     AND EXISTS (
       SELECT 1 FROM public.wallet_transactions wt
       WHERE wt.user_id=r.user_id AND wt.reference=t.reference
         AND wt.status='completed' AND wt.available_at<=now()
     );

   moved_total:=moved_total+r.amount;
   moved_users:=moved_users+1;
 END LOOP;

 RETURN jsonb_build_object('released',moved_total,'users',moved_users);
END $$;

CREATE OR REPLACE FUNCTION public.request_withdrawal_v2(
 p_amount numeric,p_mode text,p_method text,p_account_name text,p_account_number text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 uid uuid:=auth.uid(); wid uuid; available numeric:=0;
 fee numeric:=0; net_amount numeric:=0; total_debit numeric:=0;
 mode_normalized text:=lower(btrim(coalesce(p_mode,'')));
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 IF p_amount IS NULL OR p_amount<=0 THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_AMOUNT'; END IF;

 -- Manual WD: fee Rp7.000. Instant WD: fee Rp15.000.
 IF mode_normalized='instant' THEN
   IF p_amount<50000 THEN RAISE EXCEPTION 'MINIMUM_INSTANT_WITHDRAWAL_50000'; END IF;
   IF p_amount>250000 THEN RAISE EXCEPTION 'MAXIMUM_INSTANT_WITHDRAWAL_250000'; END IF;
   fee:=0;
 ELSIF mode_normalized='manual' THEN
   IF p_amount<10000 THEN RAISE EXCEPTION 'MINIMUM_MANUAL_WITHDRAWAL_10000'; END IF;
   fee:=0;
 ELSE
   RAISE EXCEPTION 'INVALID_WITHDRAWAL_MODE';
 END IF;

 net_amount:=greatest(0,p_amount-fee);
 total_debit:=p_amount+fee;

 SELECT available_balance INTO available
 FROM public.wallets WHERE user_id=uid FOR UPDATE;
 IF coalesce(available,0)<total_debit THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

 UPDATE public.wallets
 SET available_balance=available_balance-total_debit,
     balance=balance-total_debit,
     updated_at=now()
 WHERE user_id=uid;

 UPDATE public.profiles
 SET balance=balance-total_debit,updated_at=now()
 WHERE id=uid;

 INSERT INTO public.withdrawals(
   user_id,amount,fee,net_amount,mode,method,account_name,account_number,status
 ) VALUES(uid,p_amount,fee,net_amount,mode_normalized,p_method,p_account_name,p_account_number,'pending')
 RETURNING id INTO wid;

 INSERT INTO public.transactions(
   user_id,amount,fee,net_amount,type,status,reference,description
 ) VALUES(
   uid,fee,fee,fee,'withdrawal_fee','completed',
   'withdrawal-fee:'||wid::text,
   CASE WHEN mode_normalized='instant' THEN 'WD Instant fee Rp15.000' ELSE 'WD Manual fee Rp7.000' END
 );

 RETURN jsonb_build_object(
   'id',wid,'status','pending','amount',p_amount,'fee',fee,
   'net_amount',net_amount,'total_debit',total_debit,'mode',mode_normalized
 );
END $$;

-- ============================================================
-- ANALYTICS
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_paste_view(p_id uuid)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v bigint;
BEGIN
 UPDATE public.pastelinks SET views=views+1 WHERE id=p_id RETURNING views INTO v;
 RETURN coalesce(v,0);
END $$;

-- Explicitly remove the historical incompatible return type before recreation.
DROP FUNCTION IF EXISTS public.record_content_view(uuid,text,uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.record_content_view(
 p_target_id uuid,p_target_type text,p_owner uuid DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE t text:=lower(btrim(coalesce(p_target_type,'')));
BEGIN
 IF p_target_id IS NULL THEN RETURN false; END IF;
 INSERT INTO public.analytics_events(owner_id,actor_id,event_type,target_type,target_id)
 VALUES(coalesce(p_owner,auth.uid()),auth.uid(),'view',t,p_target_id);
 -- Keep marketplace counters and analytics in sync.
 IF t IN ('product','link','code') THEN
   UPDATE public.products SET views=views+1,updated_at=now() WHERE id=p_target_id;
 ELSIF t IN ('telegram_product','telegram-product') THEN
   UPDATE public.telegram_products SET views=views+1,updated_at=now() WHERE id=p_target_id;
 ELSIF t IN ('channel','group','telegram_channel','telegram-channel','telegram_group','telegram-group') THEN
   UPDATE public.telegram_channels SET views=views+1,updated_at=now() WHERE id=p_target_id;
 ELSIF t IN ('pastelink','paste-link') THEN
   UPDATE public.pastelinks SET views=views+1 WHERE id=p_target_id;
 ELSIF t='paste' THEN
   UPDATE public.pastes SET views=views+1 WHERE id=p_target_id;
 END IF;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.toggle_content_like(
 p_target_id uuid,p_target_type text,p_owner uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE liked boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.content_likes
   WHERE actor_id=auth.uid() AND target_id=p_target_id AND target_type=p_target_type) INTO liked;
 IF liked THEN
   DELETE FROM public.content_likes
   WHERE actor_id=auth.uid() AND target_id=p_target_id AND target_type=p_target_type;
   RETURN jsonb_build_object('liked',false);
 ELSE
   INSERT INTO public.content_likes(content_owner_id,actor_id,target_id,target_type)
   VALUES(coalesce(p_owner,auth.uid()),auth.uid(),p_target_id,p_target_type);
   RETURN jsonb_build_object('liked',true);
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.track_analytics(
 p_event_type text DEFAULT NULL,p_target_type text DEFAULT NULL,p_target_id uuid DEFAULT NULL,p_owner uuid DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
 INSERT INTO public.analytics_events(owner_id,actor_id,event_type,target_type,target_id)
 VALUES(coalesce(p_owner,auth.uid()),auth.uid(),coalesce(p_event_type,''),p_target_type,p_target_id);
 RETURN true;
END $$;

-- ============================================================
-- PUBLIC SETTINGS / STATS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_site_settings()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
 SELECT coalesce(settings,'{}'::jsonb)
 FROM public.site_settings WHERE id=1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_workspace_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
 SELECT jsonb_build_object(
   'users',(SELECT count(*) FROM public.profiles WHERE is_banned=false),
   'products',(SELECT count(*) FROM public.products WHERE status IN ('published','active')),
   'orders',(SELECT count(*) FROM public.orders WHERE status IN ('paid','success','completed')),
   'sales',(SELECT coalesce(sum(amount),0) FROM public.orders WHERE status IN ('paid','success','completed'))
 );
$$;

-- ============================================================
-- ADMIN RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS SETOF jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
 SELECT jsonb_build_object(
   'total_users',(SELECT count(*) FROM public.profiles),
   'active_users',(SELECT count(*) FROM public.profiles WHERE is_banned=false),
   'banned_users',(SELECT count(*) FROM public.profiles WHERE is_banned=true),
   'total_products',(SELECT count(*) FROM public.products),
   'published_products',(SELECT count(*) FROM public.products WHERE status IN ('published','active')),
   'total_orders',(SELECT count(*) FROM public.orders),
   'paid_orders',(SELECT count(*) FROM public.orders WHERE status IN ('paid','success','completed')),
   'pending_orders',(SELECT count(*) FROM public.orders WHERE status IN ('pending','waiting','unpaid')),
   'total_payments',(SELECT count(*) FROM public.payments),
   'total_withdrawals',(SELECT count(*) FROM public.withdrawals),
   'pending_withdrawals',(SELECT count(*) FROM public.withdrawals WHERE status='pending'),
   'gross_sales',(SELECT coalesce(sum(amount),0) FROM public.orders WHERE status IN ('paid','success','completed')),
   'seller_earnings',(SELECT coalesce(sum(net_amount),0) FROM public.transactions WHERE type='sale_earning'),
   'platform_fee',(SELECT coalesce(sum(fee),0) FROM public.transactions WHERE type='sale_earning'),
   'users',(SELECT count(*) FROM public.profiles),
   'products',(SELECT count(*) FROM public.products),
   'orders',(SELECT count(*) FROM public.orders),
   'sales',(SELECT coalesce(sum(amount),0) FROM public.orders WHERE status IN ('paid','success','completed')),
   'revenue',(SELECT coalesce(sum(fee),0) FROM public.transactions WHERE type='sale_earning'),
   'pastes',(SELECT count(*) FROM public.pastes),
   'views',(SELECT coalesce(sum(views),0) FROM public.products),
   'banned',(SELECT count(*) FROM public.profiles WHERE is_banned=true),
   'pending',(SELECT count(*) FROM public.orders WHERE status IN ('pending','waiting','unpaid')),
   'withdrawal_fee_revenue',(SELECT coalesce(sum(amount),0) FROM public.transactions WHERE type='withdrawal_fee'),
   'total_platform_revenue',(SELECT coalesce(sum(fee),0) FROM public.transactions WHERE type='sale_earning') + (SELECT coalesce(sum(amount),0) FROM public.transactions WHERE type='withdrawal_fee')
 )
 WHERE public.is_current_user_admin();
$$;

CREATE OR REPLACE FUNCTION public.admin_site_stats()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$ SELECT coalesce((SELECT row_to_json(s)::jsonb FROM public.site_stats s WHERE id=1 AND public.is_current_user_admin()),'{}'::jsonb); $$;

CREATE OR REPLACE FUNCTION public.admin_users(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(p) FROM public.profiles p
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_products(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(p) FROM public.products p
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_orders(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(o) FROM public.orders o
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_payments(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(p) FROM public.payments p
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_transactions(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(t) FROM public.transactions t
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_withdrawals(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(w) FROM public.withdrawals w
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_pastes(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(p) FROM public.pastes p
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_bots(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(b) FROM public.approved_bots b
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_logs(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(l) FROM public.admin_logs l
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_content(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(x) FROM (
   SELECT p.id,p.title,p.slug,p.price,p.status,p.description,p.views,p.sales_count,p.creator_id,p.seller_id,
          NULL::uuid AS owner_id,NULL::uuid AS user_id,'products'::text AS source,p.type,p.thumbnail_url,p.created_at,p.updated_at
   FROM public.products p
   UNION ALL
   SELECT pl.id,pl.title,pl.slug,0::numeric,CASE WHEN pl.visibility='public' THEN 'published' ELSE pl.visibility END,
          pl.description,pl.views,0::bigint,NULL::uuid,NULL::uuid,NULL::uuid,pl.user_id,
          'pastelinks'::text,'link'::text,NULL::text,pl.created_at,pl.updated_at
   FROM public.pastelinks pl
   UNION ALL
   SELECT tp.id,tp.title,tp.slug,tp.price,tp.status,tp.description,tp.views,tp.sales_count,NULL::uuid,NULL::uuid,
          tp.owner_id,NULL::uuid,'telegram_products'::text,'code'::text,tp.thumbnail_url,tp.created_at,tp.updated_at
   FROM public.telegram_products tp
   UNION ALL
   SELECT tc.id,tc.name AS title,NULL::text,tc.price,tc.status,tc.description,tc.views,tc.sales_count,NULL::uuid,NULL::uuid,
          tc.owner_id,NULL::uuid,'telegram_channels'::text,'channel'::text,NULL::text,tc.created_at,tc.updated_at
   FROM public.telegram_channels tc
 ) x
 WHERE public.is_current_user_admin()
 ORDER BY x.created_at DESC
 LIMIT greatest(1,least(coalesce(p_limit,50),500))
 OFFSET greatest(coalesce(p_offset,0),0);
$$;

CREATE OR REPLACE FUNCTION public.admin_payment_methods(p_user uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC),'[]'::jsonb)
 FROM public.payment_methods m WHERE m.user_id=p_user AND public.is_current_user_admin();
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user(p_user uuid,p_banned boolean,p_admin boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.profiles;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 UPDATE public.profiles
 SET is_banned=p_banned,is_admin=p_admin,
     role=CASE WHEN p_admin THEN 'admin' ELSE 'user' END,
     updated_at=now()
 WHERE id=p_user
 RETURNING * INTO r;

 IF r.id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

 INSERT INTO public.admin_logs(admin_id,action,target_id,details)
 VALUES(auth.uid(),'admin_set_user',p_user,
        jsonb_build_object('banned',p_banned,'admin',p_admin));

 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
 p_user uuid,p_amount numeric,p_reason text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;

 INSERT INTO public.wallets(user_id,balance,available_balance,pending_balance)
 VALUES(p_user,p_amount,p_amount,0)
 ON CONFLICT(user_id) DO UPDATE SET
   balance=public.wallets.balance+p_amount,
   available_balance=public.wallets.available_balance+p_amount,
   updated_at=now();

 UPDATE public.profiles
 SET balance=balance+p_amount,updated_at=now()
 WHERE id=p_user;

 INSERT INTO public.transactions(user_id,amount,fee,net_amount,type,status,reference,description)
 VALUES(p_user,p_amount,0,p_amount,'admin_adjustment','completed',
        'admin-adjustment:'||gen_random_uuid()::text,coalesce(p_reason,'Admin balance adjustment'));
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_product(p_id uuid,p_status text,p_price numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.products;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 UPDATE public.products SET status=p_status,price=p_price,updated_at=now()
 WHERE id=p_id RETURNING * INTO r;
 IF r.id IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_product(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 DELETE FROM public.products WHERE id=p_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_paste(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 DELETE FROM public.pastes WHERE id=p_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_bot(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 DELETE FROM public.approved_bots WHERE id=p_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_bot_active(p_bot_id uuid,p_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.approved_bots;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 UPDATE public.approved_bots SET is_active=p_active,updated_at=now()
 WHERE id=p_bot_id RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_bot(
 p_username text,p_bot_id bigint,p_display_name text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.approved_bots;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 INSERT INTO public.approved_bots(bot_username,bot_id,bot_name,is_active)
 VALUES(lower(btrim(p_username)),p_bot_id,p_display_name,true)
 ON CONFLICT(bot_username) DO UPDATE SET
   bot_id=excluded.bot_id,
   bot_name=excluded.bot_name,
   is_active=true,
   updated_at=now()
 RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.admin_mark_order_paid(
 p_order_id uuid,p_payment_reference text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 UPDATE public.orders
 SET status='paid',paid_at=coalesce(paid_at,now()),
     payment_reference=coalesce(p_payment_reference,payment_reference)
 WHERE id=p_order_id RETURNING * INTO o;

 IF o.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 RETURN to_jsonb(o);
END $$;

CREATE OR REPLACE FUNCTION public.admin_cancel_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 UPDATE public.orders SET status='cancelled'
 WHERE id=p_order_id RETURNING * INTO o;
 IF o.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 RETURN to_jsonb(o);
END $$;

CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
 p_id uuid,p_status text,p_note text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE w public.withdrawals%ROWTYPE; old_status text; refund numeric:=0;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF lower(coalesce(p_status,'')) NOT IN ('pending','approved','rejected','completed','cancelled')
 THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_STATUS'; END IF;

 SELECT * INTO w FROM public.withdrawals WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND'; END IF;
 old_status:=lower(coalesce(w.status,''));

 UPDATE public.withdrawals SET status=lower(p_status),note=p_note,
   processed_at=CASE WHEN lower(p_status) IN ('approved','rejected','completed','cancelled') THEN now() ELSE processed_at END
 WHERE id=p_id RETURNING * INTO w;

 IF lower(p_status) IN ('rejected','cancelled') AND old_status NOT IN ('rejected','cancelled') THEN
   refund:=coalesce(w.amount,0)+coalesce(w.fee,0);
   UPDATE public.wallets SET balance=balance+refund,available_balance=available_balance+refund,updated_at=now()
   WHERE user_id=w.user_id;
   UPDATE public.profiles SET balance=balance+refund,updated_at=now() WHERE id=w.user_id;

   INSERT INTO public.transactions(
     user_id,amount,fee,net_amount,type,status,reference,description
   ) VALUES(
     w.user_id,-coalesce(w.fee,0),-coalesce(w.fee,0),-coalesce(w.fee,0),
     'withdrawal_fee_refund','completed','withdrawal-fee-refund:'||w.id::text,
     'Refund WD fee'
   )
   ON CONFLICT(user_id,reference) DO NOTHING;
 END IF;
 RETURN to_jsonb(w);
END $$;

CREATE OR REPLACE FUNCTION public.admin_publish_announcement(
 p_title text,p_body text,p_image_url text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.announcements;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 INSERT INTO public.announcements(title,body,image_url,published,published_at)
 VALUES(p_title,p_body,p_image_url,true,now())
 RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_socials(p_socials jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 UPDATE public.site_settings
 SET settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object('socials',p_socials),
     updated_at=now()
 WHERE id=1;
 RETURN public.get_public_site_settings();
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_content(
 p_id uuid,p_status text DEFAULT NULL,p_title text DEFAULT NULL,p_description text DEFAULT NULL,
 p_source text DEFAULT 'products',p_slug text DEFAULT NULL,p_price numeric DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 CASE lower(coalesce(p_source,'products'))
  WHEN 'products' THEN
   UPDATE public.products SET status=coalesce(p_status,status),title=coalesce(p_title,title),
     slug=coalesce(nullif(p_slug,''),slug),price=coalesce(p_price,price),
     description=coalesce(p_description,description),updated_at=now()
   WHERE id=p_id RETURNING to_jsonb(products.*) INTO r;
  WHEN 'pastelinks' THEN
   UPDATE public.pastelinks SET visibility=CASE WHEN p_status='published' THEN 'public'
     WHEN p_status IS NULL THEN visibility ELSE p_status END,
     title=coalesce(p_title,title),description=coalesce(p_description,description),updated_at=now()
   WHERE id=p_id RETURNING to_jsonb(pastelinks.*) INTO r;
  WHEN 'telegram_products' THEN
   UPDATE public.telegram_products SET status=coalesce(p_status,status),title=coalesce(p_title,title),
     price=coalesce(p_price,price),description=coalesce(p_description,description),updated_at=now()
   WHERE id=p_id RETURNING to_jsonb(telegram_products.*) INTO r;
  WHEN 'telegram_channels' THEN
   UPDATE public.telegram_channels SET status=coalesce(p_status,status),name=coalesce(p_title,name),
     price=coalesce(p_price,price),description=coalesce(p_description,description),updated_at=now()
   WHERE id=p_id RETURNING to_jsonb(telegram_channels.*) INTO r;
  ELSE RAISE EXCEPTION 'UNSUPPORTED_CONTENT_SOURCE';
 END CASE;
 IF r IS NULL THEN RAISE EXCEPTION 'CONTENT_NOT_FOUND'; END IF;
 RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_content(p_id uuid,p_source text DEFAULT 'products')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 CASE lower(coalesce(p_source,'products'))
  WHEN 'products' THEN DELETE FROM public.products WHERE id=p_id;
  WHEN 'pastelinks' THEN DELETE FROM public.pastelinks WHERE id=p_id;
  WHEN 'telegram_products' THEN DELETE FROM public.telegram_products WHERE id=p_id;
  WHEN 'telegram_channels' THEN DELETE FROM public.telegram_channels WHERE id=p_id;
  ELSE RAISE EXCEPTION 'UNSUPPORTED_CONTENT_SOURCE';
 END CASE;
END $$;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastelinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
FOR SELECT TO authenticated
USING(id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_public_read ON public.profiles
FOR SELECT TO anon
USING(is_banned=false);

DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
CREATE POLICY profiles_update_own_or_admin ON public.profiles
FOR UPDATE TO authenticated
USING(id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
FOR SELECT TO anon,authenticated
USING(status IN ('published','active') OR seller_id=auth.uid() OR creator_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS products_owner_write ON public.products;
CREATE POLICY products_owner_write ON public.products
FOR ALL TO authenticated
USING(seller_id=auth.uid() OR creator_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(seller_id=auth.uid() OR creator_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS orders_buyer_seller_admin ON public.orders;
CREATE POLICY orders_buyer_seller_admin ON public.orders
FOR SELECT TO authenticated
USING(buyer_id=auth.uid() OR seller_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS payments_owner_admin ON public.payments;
CREATE POLICY payments_owner_admin ON public.payments
FOR SELECT TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS payment_methods_owner ON public.payment_methods;
CREATE POLICY payment_methods_owner ON public.payment_methods
FOR ALL TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS notifications_owner ON public.notifications;
CREATE POLICY notifications_owner ON public.notifications
FOR ALL TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS pastelinks_owner_or_public ON public.pastelinks;
CREATE POLICY pastelinks_owner_or_public ON public.pastelinks
FOR SELECT TO anon,authenticated
USING(visibility='public' OR user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS pastelinks_owner_write ON public.pastelinks;
CREATE POLICY pastelinks_owner_write ON public.pastelinks
FOR ALL TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS pastes_owner_or_public ON public.pastes;
CREATE POLICY pastes_owner_or_public ON public.pastes
FOR SELECT TO anon,authenticated
USING(visibility='public' OR owner_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS pastes_owner_write ON public.pastes;
CREATE POLICY pastes_owner_write ON public.pastes
FOR ALL TO authenticated
USING(owner_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(owner_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS purchases_owner_admin ON public.purchases;
CREATE POLICY purchases_owner_admin ON public.purchases
FOR SELECT TO authenticated
USING(buyer_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS withdrawals_owner_admin ON public.withdrawals;
CREATE POLICY withdrawals_owner_admin ON public.withdrawals
FOR SELECT TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS transactions_owner_admin ON public.transactions;
CREATE POLICY transactions_owner_admin ON public.transactions
FOR SELECT TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS wallets_owner_admin ON public.wallets;
CREATE POLICY wallets_owner_admin ON public.wallets
FOR SELECT TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin());


-- Additional RLS for tables used directly by the web app.
ALTER TABLE public.telegram_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_access_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telegram_products_public_read ON public.telegram_products;
CREATE POLICY telegram_products_public_read ON public.telegram_products
FOR SELECT TO anon,authenticated
USING(status IN ('published','active') OR owner_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS telegram_products_owner_write ON public.telegram_products;
CREATE POLICY telegram_products_owner_write ON public.telegram_products
FOR ALL TO authenticated
USING(owner_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(owner_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS telegram_channels_public_read ON public.telegram_channels;
CREATE POLICY telegram_channels_public_read ON public.telegram_channels
FOR SELECT TO anon,authenticated
USING(status IN ('published','active') OR owner_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS telegram_channels_owner_write ON public.telegram_channels;
CREATE POLICY telegram_channels_owner_write ON public.telegram_channels
FOR ALL TO authenticated
USING(owner_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(owner_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS followers_read ON public.creator_followers;
CREATE POLICY followers_read ON public.creator_followers
FOR SELECT TO authenticated USING(creator_id=auth.uid() OR follower_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS followers_write ON public.creator_followers;
CREATE POLICY followers_write ON public.creator_followers
FOR ALL TO authenticated
USING(follower_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(follower_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS likes_read ON public.content_likes;
CREATE POLICY likes_read ON public.content_likes
FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS likes_write ON public.content_likes;
CREATE POLICY likes_write ON public.content_likes
FOR ALL TO authenticated
USING(actor_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(actor_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS product_views_public_insert ON public.product_views;
CREATE POLICY product_views_public_insert ON public.product_views
FOR INSERT TO anon,authenticated WITH CHECK(true);
DROP POLICY IF EXISTS product_views_admin_read ON public.product_views;
CREATE POLICY product_views_admin_read ON public.product_views
FOR SELECT TO authenticated USING(public.is_current_user_admin());

DROP POLICY IF EXISTS announcements_public_read ON public.announcements;
CREATE POLICY announcements_public_read ON public.announcements
FOR SELECT TO anon,authenticated USING(published=true OR public.is_current_user_admin());
DROP POLICY IF EXISTS announcements_admin_write ON public.announcements;
CREATE POLICY announcements_admin_write ON public.announcements
FOR ALL TO authenticated
USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());

DROP POLICY IF EXISTS analytics_owner_write ON public.analytics_events;
CREATE POLICY analytics_owner_write ON public.analytics_events
FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid() OR actor_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS analytics_owner_read ON public.analytics_events;
CREATE POLICY analytics_owner_read ON public.analytics_events
FOR SELECT TO authenticated USING(owner_id=auth.uid() OR actor_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS usage_owner ON public.code_access_usage;
CREATE POLICY usage_owner ON public.code_access_usage
FOR ALL TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS login_history_owner ON public.login_history;
CREATE POLICY login_history_owner ON public.login_history
FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS approved_bots_public_read ON public.approved_bots;
CREATE POLICY approved_bots_public_read ON public.approved_bots
FOR SELECT TO anon,authenticated USING(is_active=true OR public.is_current_user_admin());
DROP POLICY IF EXISTS approved_bots_admin_write ON public.approved_bots;
CREATE POLICY approved_bots_admin_write ON public.approved_bots
FOR ALL TO authenticated USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());

DROP POLICY IF EXISTS bot_integrations_owner ON public.bot_integrations;
CREATE POLICY bot_integrations_owner ON public.bot_integrations
FOR ALL TO authenticated
USING(owner_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(owner_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS payment_settings_public_read ON public.payment_settings;
CREATE POLICY payment_settings_public_read ON public.payment_settings
FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS payment_settings_admin_write ON public.payment_settings;
CREATE POLICY payment_settings_admin_write ON public.payment_settings
FOR ALL TO authenticated USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());

DROP POLICY IF EXISTS comments_public_read ON public.content_comments;
CREATE POLICY comments_public_read ON public.content_comments
FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS comments_owner_write ON public.content_comments;
CREATE POLICY comments_owner_write ON public.content_comments
FOR ALL TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS access_buyer_owner ON public.product_access;
CREATE POLICY access_buyer_owner ON public.product_access
FOR SELECT TO authenticated USING(buyer_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS wallet_transactions_owner ON public.wallet_transactions;
CREATE POLICY wallet_transactions_owner ON public.wallet_transactions
FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS admins_admin_only ON public.admins;
CREATE POLICY admins_admin_only ON public.admins
FOR ALL TO authenticated USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());
DROP POLICY IF EXISTS admin_logs_admin_only ON public.admin_logs;
CREATE POLICY admin_logs_admin_only ON public.admin_logs
FOR SELECT TO authenticated USING(public.is_current_user_admin());
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings
FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS site_settings_admin_write ON public.site_settings;
CREATE POLICY site_settings_admin_write ON public.site_settings
FOR ALL TO authenticated USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());
DROP POLICY IF EXISTS site_stats_public_read ON public.site_stats;
CREATE POLICY site_stats_public_read ON public.site_stats
FOR SELECT TO anon,authenticated USING(true);

-- ============================================================
-- GRANTS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
GRANT SELECT ON public.profile_public TO anon,authenticated;
GRANT SELECT (id,username,display_name,avatar_url,country,created_at)
ON public.profiles TO anon;
GRANT SELECT ON public.products,public.pastelinks,public.pastes,public.announcements TO anon,authenticated;

GRANT SELECT,INSERT,UPDATE,DELETE ON
 public.products,public.telegram_products,public.telegram_channels,
 public.pastelinks,public.pastes,public.payment_methods,public.notifications,
 public.creator_followers,public.content_likes,public.content_comments
TO authenticated;
GRANT SELECT,UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.announcements,public.payment_settings,public.site_settings,public.site_stats TO anon,authenticated;
GRANT INSERT ON public.product_views TO anon,authenticated;
GRANT SELECT,INSERT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.wallets,public.transactions,public.wallet_transactions,public.withdrawals,public.purchases,public.product_access TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_username_login(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_market_item_detail(text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_site_settings() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_workspace_stats() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.increment_paste_view(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_content_view(uuid,text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.track_analytics(text,text,uuid,uuid) TO anon,authenticated;


REVOKE ALL ON FUNCTION public.release_all_matured_wallets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_all_matured_wallets() TO service_role;

-- ============================================================
-- OPTIONAL AUTOMATIC SETTLEMENT RELEASE (PG_CRON)
-- Runs hourly. If pg_cron is unavailable, the SQL continues.
-- The settlement timestamp itself is already stored per sale.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name='pg_cron'
  ) THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron could not be enabled: %', SQLERRM;
    END;

    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='cron' AND p.proname='schedule'
    ) THEN
      BEGIN
        PERFORM cron.unschedule(jobid)
        FROM cron.job
        WHERE jobname='pastele-release-matured-wallets';
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      PERFORM cron.schedule(
        'pastele-release-matured-wallets',
        '0 * * * *',
        $cron$SELECT public.release_all_matured_wallets();$cron$
      );
    END IF;
  END IF;
END $$;


-- Service role can execute settlement.
REVOKE ALL ON FUNCTION public.settle_cashi_order(uuid,text,text,numeric,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_cashi_order(uuid,text,text,numeric,jsonb) TO service_role;

-- ============================================================
-- RECREATE ADMIM ADMIN FLAG
-- Existing auth user is preserved. If profile exists, promote it.
-- ============================================================

UPDATE public.profiles
SET role='admin',is_admin=true,is_banned=false,updated_at=now()
WHERE lower(btrim(username)) IN ('admin','admim');

-- ============================================================
-- STATISTICS REFRESH
-- ============================================================

UPDATE public.site_stats
SET total_users=(SELECT count(*) FROM public.profiles),
    total_products=(SELECT count(*) FROM public.products),
    total_orders=(SELECT count(*) FROM public.orders),
    total_sales=(SELECT coalesce(sum(amount),0) FROM public.orders WHERE status IN ('paid','success','completed')),
    total_revenue=(SELECT coalesce(sum(fee),0) FROM public.transactions WHERE type='sale_earning'),
    updated_at=now()
WHERE id=1;



-- RPC SIGNATURES VERIFIED AGAINST USER-PROVIDED INVENTORY: admin_adjust_balance, admin_bots, admin_cancel_order, admin_content, admin_delete_bot, admin_delete_content, admin_delete_paste, admin_delete_product, admin_logs, admin_mark_order_paid, admin_orders, admin_pastes, admin_payment_methods, admin_payments, admin_process_withdrawal, admin_products, admin_publish_announcement, admin_save_socials, admin_set_bot_active, admin_set_user, admin_site_stats, admin_stats, admin_transactions, admin_update_content, admin_update_product, admin_upsert_bot, admin_users, admin_withdrawals

-- ============================================================
-- FINAL SETTLEMENT / SCHEMA VERIFICATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='purchases' AND column_name='item_id'
  ) THEN
    RAISE EXCEPTION 'purchases.item_id is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='purchases' AND column_name='item_title'
  ) THEN
    RAISE EXCEPTION 'purchases.item_title is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='wallet_transactions' AND column_name='available_at'
  ) THEN
    RAISE EXCEPTION 'wallet_transactions.available_at is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='wallet_transactions' AND column_name='settlement_code'
  ) THEN
    RAISE EXCEPTION 'wallet_transactions.settlement_code is missing';
  END IF;
END $$;


-- ============================================================
-- SECURITY VERIFICATION
-- ============================================================
DO $$
DECLARE
  rel_kind char;
  rel_options text[];
BEGIN
  SELECT c.relkind, c.reloptions
    INTO rel_kind, rel_options
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='profile_public';

  IF rel_kind <> 'v' THEN
    RAISE EXCEPTION 'profile_public was not created as a view';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(coalesce(rel_options, ARRAY[]::text[])) AS x(opt)
    WHERE lower(opt) LIKE 'security_barrier=%'
  ) THEN
    RAISE NOTICE 'profile_public has security_barrier enabled';
  END IF;
END $$;



-- ============================================================


-- ============================================================
-- FINAL PUBLIC CODE ROUTE RESOLVER
-- /c/f/<slug> and /c/p/<slug> -> telegram_products by slug.
-- Uses the same access-control logic as get_market_item_detail.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_code_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT id INTO pid
  FROM public.telegram_products
  WHERE slug = btrim(coalesce(p_slug,''))
    AND lower(coalesce(status,'')) = 'published'
  LIMIT 1;

  IF pid IS NULL THEN
    RETURN jsonb_build_object('found',false);
  END IF;

  RETURN public.get_market_item_detail('telegram_product', pid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_code_by_slug(text) TO anon,authenticated;

COMMIT;
-- ============================================================
-- PasTele FINAL FRONTEND/ADMIN COMPATIBILITY PATCH
-- Keeps the existing schema, fixes RPC routing and admin settlement.
-- ============================================================
BEGIN;

-- Enforce the marketplace price contract used by the web app.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_access_check;
ALTER TABLE public.products ADD CONSTRAINT products_price_access_check
CHECK ((access_type='free' AND price=0) OR (access_type='paid' AND price BETWEEN 2000 AND 100000)) NOT VALID;

ALTER TABLE public.telegram_products DROP CONSTRAINT IF EXISTS telegram_products_price_access_check;
ALTER TABLE public.telegram_products ADD CONSTRAINT telegram_products_price_access_check
CHECK ((access_type='free' AND price=0) OR (access_type='paid' AND price BETWEEN 2000 AND 100000)) NOT VALID;

ALTER TABLE public.telegram_channels DROP CONSTRAINT IF EXISTS telegram_channels_price_access_check;
ALTER TABLE public.telegram_channels ADD CONSTRAINT telegram_channels_price_access_check
CHECK ((access_type='free' AND price=0) OR (access_type='paid' AND price BETWEEN 2000 AND 100000)) NOT VALID;

-- Code belongs to telegram_products, not products.
CREATE OR REPLACE FUNCTION public.get_market_item_detail(p_type text,p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  r record;
  normalized text:=lower(btrim(coalesce(p_type,'')));
BEGIN
  IF normalized IN ('product','link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           coalesce(p.creator_id,p.seller_id) AS owner_id
    INTO r
    FROM public.products p
    LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
    WHERE p.id=p_id;

  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.owner_id AS seller_id
    INTO r
    FROM public.telegram_products p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.id=p_id;

  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.owner_id AS seller_id,
           p.name AS title
    INTO r
    FROM public.telegram_channels p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.id=p_id;

  ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.user_id AS owner_id,
           0::numeric AS price,
           'free'::text AS access_type,
           'pastelink'::text AS item_type
    INTO r
    FROM public.pastelinks p
    LEFT JOIN public.profiles pr ON pr.id=p.user_id
    WHERE p.id=p_id;

  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF r IS NULL THEN
    RETURN jsonb_build_object('found',false);
  END IF;

  RETURN to_jsonb(r)||jsonb_build_object(
    'found',true,
    'can_access',
      CASE
        WHEN auth.uid() IS NULL THEN false
        WHEN EXISTS(
          SELECT 1 FROM public.purchases pu
          WHERE pu.buyer_id=auth.uid()
            AND pu.product_id=p_id
            AND lower(coalesce(pu.status,'')) IN ('completed','paid','success')
        ) THEN true
        WHEN public.is_current_user_admin() THEN true
        ELSE false
      END
  );
END $$;

-- Checkout routing: Code -> telegram_products; Group -> telegram_channels.
CREATE OR REPLACE FUNCTION public.create_checkout_order(p_type text,p_id text)
RETURNS TABLE(order_id uuid,amount numeric,item_title text,item_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid(); seller uuid; title text; price numeric; oid uuid;
  normalized text:=lower(btrim(coalesce(p_type,''))); pid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF btrim(coalesce(p_id,''))='' THEN RAISE EXCEPTION 'PRODUCT_ID_REQUIRED'; END IF;
  BEGIN pid:=p_id::uuid; EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'INVALID_PRODUCT_ID'; END;

  IF normalized IN ('product','link') THEN
    SELECT coalesce(p.creator_id,p.seller_id),p.title,p.price INTO seller,title,price
    FROM public.products p WHERE p.id=pid;
    normalized:='product';
  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.owner_id,p.title,p.price INTO seller,title,price
    FROM public.telegram_products p WHERE p.id=pid;
    normalized:='telegram_product';
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.owner_id,p.name,p.price INTO seller,title,price
    FROM public.telegram_channels p WHERE p.id=pid;
    normalized:='channel';
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF seller=uid THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_PRODUCT'; END IF;
  IF coalesce(price,0)<=0 THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;

  SELECT o.id INTO oid
  FROM public.orders o
  WHERE o.buyer_id=uid AND o.product_id=pid
    AND lower(coalesce(o.item_type,''))=normalized
    AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid')
  ORDER BY o.created_at DESC LIMIT 1;

  IF oid IS NULL THEN
    INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title)
    VALUES(uid,seller,pid,price,'pending',normalized,p_id,title)
    RETURNING id INTO oid;
  END IF;

  RETURN QUERY SELECT oid,price,title,normalized;
END $$;

-- Admin manual payment now performs the same settlement as Cashi,
-- including purchases, seller 70% pending balance, and H1/H2 maturity.
CREATE OR REPLACE FUNCTION public.admin_mark_order_paid(
 p_order_id uuid,p_payment_reference text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 o public.orders;
 payload jsonb;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF lower(coalesce(o.status,'')) IN ('paid','success','completed','settled') THEN RETURN to_jsonb(o); END IF;

 payload:=jsonb_build_object('source','admin_manual','admin_id',auth.uid(),'reference',p_payment_reference);
 PERFORM public.settle_cashi_order(
   o.id,
   nullif(p_payment_reference,''),
   'paid',
   o.amount,
   payload
 );

 SELECT * INTO o FROM public.orders WHERE id=p_order_id;
 RETURN to_jsonb(o);
END $$;

COMMIT;

-- ============================================================
-- ADMIN PRICE / ACCESS CONSISTENCY PATCH
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_update_product(p_id uuid,p_status text,p_price numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.products;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_price IS NULL OR p_price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
 UPDATE public.products
 SET status=p_status,
     price=p_price,
     access_type=CASE WHEN p_price=0 THEN 'free' ELSE 'paid' END,
     updated_at=now()
 WHERE id=p_id RETURNING * INTO r;
 IF r.id IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_content(
 p_id uuid,p_status text DEFAULT NULL,p_title text DEFAULT NULL,p_description text DEFAULT NULL,
 p_source text DEFAULT 'products',p_slug text DEFAULT NULL,p_price numeric DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 CASE lower(coalesce(p_source,'products'))
  WHEN 'products' THEN
   IF p_price IS NOT NULL AND p_price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
   UPDATE public.products SET status=coalesce(p_status,status),title=coalesce(p_title,title),
     slug=coalesce(nullif(p_slug,''),slug),price=coalesce(p_price,price),
     access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,
     description=coalesce(p_description,description),updated_at=now()
   WHERE id=p_id RETURNING to_jsonb(products.*) INTO r;
  WHEN 'pastelinks' THEN
   UPDATE public.pastelinks SET visibility=CASE WHEN p_status='published' THEN 'public'
     WHEN p_status IS NULL THEN visibility ELSE p_status END,
     title=coalesce(p_title,title),description=coalesce(p_description,description),updated_at=now()
   WHERE id=p_id RETURNING to_jsonb(pastelinks.*) INTO r;
  WHEN 'pastes' THEN
   UPDATE public.pastes SET title=coalesce(p_title,title),slug=coalesce(nullif(p_slug,''),slug),updated_at=now()
   WHERE id=p_id RETURNING to_jsonb(pastes.*) INTO r;
  WHEN 'telegram_products' THEN
   IF p_price IS NOT NULL AND p_price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
   UPDATE public.telegram_products SET status=coalesce(p_status,status),title=coalesce(p_title,title),
     price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,
     description=coalesce(p_description,description),updated_at=now()
   WHERE id=p_id RETURNING to_jsonb(telegram_products.*) INTO r;
  WHEN 'telegram_channels' THEN
   IF p_price IS NOT NULL AND p_price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
   UPDATE public.telegram_channels SET status=coalesce(p_status,status),name=coalesce(p_title,name),
     price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,
     description=coalesce(p_description,description),updated_at=now()
   WHERE id=p_id RETURNING to_jsonb(telegram_channels.*) INTO r;
  ELSE RAISE EXCEPTION 'UNSUPPORTED_CONTENT_SOURCE';
 END CASE;
 IF r IS NULL THEN RAISE EXCEPTION 'CONTENT_NOT_FOUND'; END IF;
 RETURN r;
END $$;

COMMIT;


-- ============================================================


-- PasTele FINAL NOTIFICATION + PAID PASTELINK EXTENSION
-- ============================================================
BEGIN;

-- PasteLink participates in the same marketplace contract as
-- Code / Channel / Group. Existing rows remain Free (Rp0).
ALTER TABLE public.pastelinks ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'free';
ALTER TABLE public.pastelinks ADD COLUMN IF NOT EXISTS price numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.pastelinks DROP CONSTRAINT IF EXISTS pastelinks_price_access_check;
ALTER TABLE public.pastelinks ADD CONSTRAINT pastelinks_price_access_check
CHECK ((access_type='free' AND price=0) OR (access_type='paid' AND price BETWEEN 2000 AND 100000)) NOT VALID;
CREATE INDEX IF NOT EXISTS idx_pastelinks_user ON public.pastelinks(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pastelinks_access ON public.pastelinks(access_type,price);

-- Checkout now supports Paid PasteLink.
CREATE OR REPLACE FUNCTION public.create_checkout_order(p_type text,p_id text)
RETURNS TABLE(order_id uuid,amount numeric,item_title text,item_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid:=auth.uid(); seller uuid; title text; price numeric; oid uuid;
  normalized text:=lower(btrim(coalesce(p_type,''))); pid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF btrim(coalesce(p_id,''))='' THEN RAISE EXCEPTION 'PRODUCT_ID_REQUIRED'; END IF;
  BEGIN pid:=p_id::uuid; EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'INVALID_PRODUCT_ID'; END;

  IF normalized IN ('product','link') THEN
    SELECT coalesce(p.creator_id,p.seller_id),p.title,p.price INTO seller,title,price FROM public.products p WHERE p.id=pid;
    normalized:='product';
  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.owner_id,p.title,p.price INTO seller,title,price FROM public.telegram_products p WHERE p.id=pid;
    normalized:='telegram_product';
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.owner_id,p.name,p.price INTO seller,title,price FROM public.telegram_channels p WHERE p.id=pid;
    normalized:='channel';
  ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
    SELECT p.user_id,p.title,p.price INTO seller,title,price FROM public.pastelinks p WHERE p.id=pid;
    normalized:='pastelink';
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF seller=uid THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_PRODUCT'; END IF;
  IF coalesce(price,0)<=0 THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;

  SELECT o.id INTO oid FROM public.orders o
  WHERE o.buyer_id=uid AND o.product_id=pid
    AND lower(coalesce(o.item_type,''))=normalized
    AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid')
  ORDER BY o.created_at DESC LIMIT 1;

  IF oid IS NULL THEN
    INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title)
    VALUES(uid,seller,pid,price,'pending',normalized,p_id,title) RETURNING id INTO oid;
  END IF;
  RETURN QUERY SELECT oid,price,title,normalized;
END $$;

-- Detail RPC supports PasteLink paid/free and does not leak paid content
-- before the buyer/owner/admin has access.
CREATE OR REPLACE FUNCTION public.get_market_item_detail(p_type text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r record; result jsonb; normalized text:=lower(btrim(coalesce(p_type,'')));
  can_access boolean:=false;
BEGIN
  IF normalized IN ('product','link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,coalesce(p.creator_id,p.seller_id) owner_id
    INTO r FROM public.products p LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id) WHERE p.id=p_id;
  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id seller_id,p.owner_id owner_id
    INTO r FROM public.telegram_products p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id seller_id,p.owner_id owner_id,p.name title
    INTO r FROM public.telegram_channels p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
  ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.user_id owner_id,'pastelink'::text item_type
    INTO r FROM public.pastelinks p LEFT JOIN public.profiles pr ON pr.id=p.user_id WHERE p.id=p_id;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF r IS NULL THEN RETURN jsonb_build_object('found',false); END IF;

  can_access := auth.uid() IS NOT NULL AND (
    auth.uid()=r.owner_id OR
    public.is_current_user_admin() OR
    coalesce(r.access_type,'free')='free' OR
    EXISTS(SELECT 1 FROM public.purchases pu WHERE pu.buyer_id=auth.uid() AND pu.product_id=p_id
      AND lower(coalesce(pu.status,'')) IN ('completed','paid','success'))
  );

  result:=to_jsonb(r)||jsonb_build_object('found',true,'can_access',can_access);
  IF NOT can_access AND coalesce(r.access_type,'free')='paid' THEN
    result:=result-'content'-'content_html';
  END IF;
  RETURN result;
END $$;

-- Normalize notification creation for publication, views, purchases and withdrawals.
CREATE OR REPLACE FUNCTION public.notify_user_once(p_user_id uuid,p_title text,p_body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id,title,body)
  VALUES(p_user_id,left(coalesce(p_title,'Notifikasi'),180),left(coalesce(p_body,''),1000));
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_market_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner uuid; label text;
BEGIN
  owner:=coalesce(
    nullif(to_jsonb(NEW)->>'user_id','')::uuid,
    nullif(to_jsonb(NEW)->>'owner_id','')::uuid,
    nullif(to_jsonb(NEW)->>'creator_id','')::uuid,
    nullif(to_jsonb(NEW)->>'seller_id','')::uuid
  );
  label:=coalesce(to_jsonb(NEW)->>'title',to_jsonb(NEW)->>'name','Konten');
  PERFORM public.notify_user_once(owner,'Publikasi berhasil', 'Konten "'||label||'" sudah dipublikasikan ke Marketplace.');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_pastelink_publish ON public.pastelinks;
CREATE TRIGGER trg_notify_pastelink_publish AFTER INSERT ON public.pastelinks FOR EACH ROW
WHEN (NEW.visibility='public') EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_product_publish ON public.products;
CREATE TRIGGER trg_notify_product_publish AFTER INSERT ON public.products FOR EACH ROW
WHEN (NEW.status='published') EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_telegram_product_publish ON public.telegram_products;
CREATE TRIGGER trg_notify_telegram_product_publish AFTER INSERT ON public.telegram_products FOR EACH ROW
WHEN (NEW.status='published') EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_telegram_channel_publish ON public.telegram_channels;
CREATE TRIGGER trg_notify_telegram_channel_publish AFTER INSERT ON public.telegram_channels FOR EACH ROW
WHEN (NEW.status='published') EXECUTE FUNCTION public.trg_notify_market_publication();

CREATE OR REPLACE FUNCTION public.trg_notify_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE seller uuid;
BEGIN
  SELECT seller_id INTO seller FROM public.orders WHERE id=NEW.order_id;
  PERFORM public.notify_user_once(NEW.buyer_id,'Pembelian berhasil','Akses untuk "'||coalesce(NEW.item_title,'Produk')||'" sudah tersedia.');
  PERFORM public.notify_user_once(seller,'Produk terjual','"'||coalesce(NEW.item_title,'Produk')||'" dibeli oleh user. Penghasilan seller diproses sesuai settlement.');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_purchase ON public.purchases;
CREATE TRIGGER trg_notify_purchase AFTER INSERT ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.trg_notify_purchase();

CREATE OR REPLACE FUNCTION public.trg_notify_view()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND NEW.actor_id IS DISTINCT FROM NEW.owner_id THEN
    PERFORM public.notify_user_once(NEW.owner_id,'Konten dibuka','Konten kamu baru saja dibuka di PasTele.');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_content_view ON public.analytics_events;
CREATE TRIGGER trg_notify_content_view AFTER INSERT ON public.analytics_events FOR EACH ROW
WHEN (NEW.event_type='view') EXECUTE FUNCTION public.trg_notify_view();

CREATE OR REPLACE FUNCTION public.trg_notify_withdrawal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a uuid;
BEGIN
  FOR a IN SELECT id FROM public.profiles WHERE is_admin=true OR lower(role) IN ('admin','owner') LOOP
    PERFORM public.notify_user_once(a,'Withdrawal baru','Ada permintaan WD baru #'||NEW.id::text||' sebesar Rp'||to_char(coalesce(NEW.amount,0),'FM999G999G999G990'));
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_withdrawal ON public.withdrawals;
CREATE TRIGGER trg_notify_withdrawal AFTER INSERT ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.trg_notify_withdrawal();

COMMIT;


-- Compatibility fix: telegram_channels must have a public slug because
-- marketplace/routing/create-center use /ch|g/<access>/<slug>.
BEGIN;
ALTER TABLE public.telegram_channels
  ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.telegram_channels
SET slug = lower(substr(md5(id::text || coalesce(telegram_channel_id, name)), 1, 10))
WHERE slug IS NULL OR btrim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS telegram_channels_slug_uidx
  ON public.telegram_channels(slug);

ALTER TABLE public.telegram_channels
  ALTER COLUMN slug SET NOT NULL;
COMMIT;

-- Final marketplace view: every supported publishable source.
BEGIN;

COMMIT;

-- Final admin content editor contract for paid PasteLink.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_update_content(
 p_id uuid,p_status text DEFAULT NULL,p_title text DEFAULT NULL,p_description text DEFAULT NULL,
 p_source text DEFAULT 'products',p_slug text DEFAULT NULL,p_price numeric DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; src text:=lower(coalesce(p_source,'products')); new_price numeric;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_price IS NOT NULL AND (p_price<0 OR p_price>150000) THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
 CASE src
  WHEN 'products' THEN
   UPDATE public.products SET status=coalesce(p_status,status),title=coalesce(p_title,title),slug=coalesce(nullif(p_slug,''),slug),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,description=coalesce(p_description,description),updated_at=now() WHERE id=p_id RETURNING to_jsonb(products.*) INTO r;
  WHEN 'pastelinks' THEN
   UPDATE public.pastelinks SET visibility=CASE WHEN p_status='published' THEN 'public' WHEN p_status IS NULL THEN visibility ELSE p_status END,title=coalesce(p_title,title),description=coalesce(p_description,description),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,updated_at=now() WHERE id=p_id RETURNING to_jsonb(pastelinks.*) INTO r;
  WHEN 'telegram_products' THEN
   UPDATE public.telegram_products SET status=coalesce(p_status,status),title=coalesce(p_title,title),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,description=coalesce(p_description,description),updated_at=now() WHERE id=p_id RETURNING to_jsonb(telegram_products.*) INTO r;
  WHEN 'telegram_channels' THEN
   UPDATE public.telegram_channels SET status=coalesce(p_status,status),name=coalesce(p_title,name),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,description=coalesce(p_description,description),updated_at=now() WHERE id=p_id RETURNING to_jsonb(telegram_channels.*) INTO r;
  WHEN 'pastes' THEN
   UPDATE public.pastes SET visibility=CASE WHEN p_status='published' THEN 'public' WHEN p_status IS NULL THEN visibility ELSE p_status END,title=coalesce(p_title,title),slug=coalesce(nullif(p_slug,''),slug) WHERE id=p_id RETURNING to_jsonb(pastes.*) INTO r;
  ELSE RAISE EXCEPTION 'UNSUPPORTED_CONTENT_SOURCE';
 END CASE;
 IF r IS NULL THEN RAISE EXCEPTION 'CONTENT_NOT_FOUND'; END IF;
 RETURN r;
END $$;
COMMIT;

-- ============================================================
-- GLOBAL USER NOTIFICATIONS — FINAL
-- All registered users receive lightweight notifications for
-- marketplace publication, likes, views and purchases.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.notify_all_users(
  p_title text,
  p_body text,
  p_exclude_user uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
  INSERT INTO public.notifications(user_id,title,body)
  SELECT p.id,
         left(coalesce(p_title,'Notifikasi'),180),
         left(coalesce(p_body,''),1000)
  FROM public.profiles p
  WHERE p.id IS NOT NULL
    AND (p_exclude_user IS NULL OR p.id <> p_exclude_user)
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = p.id
        AND n.title = left(coalesce(p_title,'Notifikasi'),180)
        AND n.body = left(coalesce(p_body,''),1000)
        AND n.created_at > now() - interval '10 minutes'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_market_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  owner uuid;
  label text;
  kind text;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF TG_TABLE_NAME='products' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
    IF TG_TABLE_NAME='telegram_products' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
    IF TG_TABLE_NAME='telegram_channels' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
    IF TG_TABLE_NAME='pastelinks' AND OLD.visibility IS NOT DISTINCT FROM NEW.visibility THEN RETURN NEW; END IF;
  END IF;

  owner := coalesce(
    nullif(to_jsonb(NEW)->>'user_id','')::uuid,
    nullif(to_jsonb(NEW)->>'owner_id','')::uuid,
    nullif(to_jsonb(NEW)->>'creator_id','')::uuid,
    nullif(to_jsonb(NEW)->>'seller_id','')::uuid
  );

  label := coalesce(
    nullif(to_jsonb(NEW)->>'title',''),
    nullif(to_jsonb(NEW)->>'name',''),
    'Konten'
  );

  kind := CASE
    WHEN TG_TABLE_NAME = 'pastelinks' THEN 'PasteLink'
    WHEN TG_TABLE_NAME = 'telegram_products' THEN 'Code'
    WHEN TG_TABLE_NAME = 'telegram_channels' AND lower(coalesce(to_jsonb(NEW)->>'type','')) = 'group' THEN 'Group'
    WHEN TG_TABLE_NAME = 'telegram_channels' THEN 'Channel'
    ELSE 'Produk'
  END;

  PERFORM public.notify_all_users(
    'Konten baru di Marketplace',
    kind || ' "' || label || '" baru saja dipublikasikan di Marketplace.',
    NULL
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_content_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  label text := 'Konten';
  kind text := coalesce(NEW.target_type,'content');
BEGIN
  BEGIN
    IF NEW.target_type = 'pastelink' THEN
      SELECT title INTO label FROM public.pastelinks WHERE id=NEW.target_id;
    ELSIF NEW.target_type IN ('code','telegram_product') THEN
      SELECT title INTO label FROM public.telegram_products WHERE id=NEW.target_id;
    ELSIF NEW.target_type IN ('channel','group','telegram_channel') THEN
      SELECT name INTO label FROM public.telegram_channels WHERE id=NEW.target_id;
    ELSIF NEW.target_type IN ('product','link') THEN
      SELECT title INTO label FROM public.products WHERE id=NEW.target_id;
    ELSIF NEW.target_type = 'paste' THEN
      SELECT title INTO label FROM public.pastes WHERE id=NEW.target_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    label := 'Konten';
  END;

  PERFORM public.notify_all_users(
    'Konten mendapat Like',
    coalesce(kind,'Konten') || ' "' || coalesce(label,'Konten') || '" mendapat Like baru.',
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_content_like ON public.content_likes;
CREATE TRIGGER trg_notify_content_like
AFTER INSERT ON public.content_likes
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_content_like();

CREATE OR REPLACE FUNCTION public.trg_notify_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  label text := 'Konten';
  kind text := coalesce(NEW.target_type,'content');
BEGIN
  BEGIN
    IF NEW.target_type = 'pastelink' THEN
      SELECT title INTO label FROM public.pastelinks WHERE id=NEW.target_id;
    ELSIF NEW.target_type IN ('code','telegram_product') THEN
      SELECT title INTO label FROM public.telegram_products WHERE id=NEW.target_id;
    ELSIF NEW.target_type IN ('channel','group','telegram_channel') THEN
      SELECT name INTO label FROM public.telegram_channels WHERE id=NEW.target_id;
    ELSIF NEW.target_type IN ('product','link') THEN
      SELECT title INTO label FROM public.products WHERE id=NEW.target_id;
    ELSIF NEW.target_type = 'paste' THEN
      SELECT title INTO label FROM public.pastes WHERE id=NEW.target_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    label := 'Konten';
  END;

  PERFORM public.notify_all_users(
    'Konten dibuka',
    coalesce(kind,'Konten') || ' "' || coalesce(label,'Konten') || '" baru saja dibuka.',
    NULL
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  seller uuid;
BEGIN
  SELECT seller_id INTO seller
  FROM public.orders
  WHERE id=NEW.order_id;

  PERFORM public.notify_all_users(
    'Pembelian Marketplace',
    'Pembelian "' || coalesce(NEW.item_title,'Produk') || '" berhasil diproses.',
    NULL
  );

  RETURN NEW;
END;
$$;

-- Realtime for the navbar bell/toast. Safe if already enabled.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END;
$$;

COMMIT;

-- ============================================================
-- FINAL CHECKOUT OVERRIDE — PAID PASTELINK + FREE/Paid SAFETY
-- This is intentionally the last definition so it wins over
-- older duplicate create_checkout_order definitions above.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.create_checkout_order(p_type text,p_id text)
RETURNS TABLE(order_id uuid,amount numeric,item_title text,item_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();
  seller uuid;
  title text;
  price numeric;
  oid uuid;
  normalized text:=lower(btrim(coalesce(p_type,'')));
  pid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF btrim(coalesce(p_id,''))='' THEN RAISE EXCEPTION 'PRODUCT_ID_REQUIRED'; END IF;
  BEGIN
    pid:=p_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'INVALID_PRODUCT_ID';
  END;

  IF normalized IN ('product','link') THEN
    SELECT coalesce(p.creator_id,p.seller_id),p.title,p.price
      INTO seller,title,price
    FROM public.products p WHERE p.id=pid;
    normalized:='product';
  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.owner_id,p.title,p.price
      INTO seller,title,price
    FROM public.telegram_products p WHERE p.id=pid;
    normalized:='telegram_product';
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.owner_id,p.name,p.price
      INTO seller,title,price
    FROM public.telegram_channels p WHERE p.id=pid;
    normalized:='channel';
  ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
    SELECT p.user_id,p.title,p.price
      INTO seller,title,price
    FROM public.pastelinks p WHERE p.id=pid;
    normalized:='pastelink';
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF seller=uid THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_PRODUCT'; END IF;
  IF coalesce(price,0)<=0 THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;
  IF price < 5000 OR price > 150000 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;

  SELECT o.id INTO oid
  FROM public.orders o
  WHERE o.buyer_id=uid
    AND o.product_id=pid
    AND lower(coalesce(o.item_type,''))=normalized
    AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid')
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF oid IS NULL THEN
    INSERT INTO public.orders(
      buyer_id,seller_id,product_id,amount,status,
      item_type,item_id,item_title
    )
    VALUES(
      uid,seller,pid,price,'pending',
      normalized,p_id,title
    )
    RETURNING id INTO oid;
  END IF;

  RETURN QUERY SELECT oid,price,title,normalized;
END;
$$;

COMMIT;



-- ============================================================
-- FINAL PUBLICATION NOTIFICATION TRIGGERS
-- Notify every registered user when an existing draft is
-- switched to published/public by an admin.
-- ============================================================
BEGIN;

DROP TRIGGER IF EXISTS trg_notify_product_publish ON public.products;
CREATE TRIGGER trg_notify_product_publish
AFTER INSERT OR UPDATE OF status ON public.products
FOR EACH ROW
WHEN (NEW.status IN ('published','active'))
EXECUTE FUNCTION public.trg_notify_market_publication();

DROP TRIGGER IF EXISTS trg_notify_telegram_product_publish ON public.telegram_products;
CREATE TRIGGER trg_notify_telegram_product_publish
AFTER INSERT OR UPDATE OF status ON public.telegram_products
FOR EACH ROW
WHEN (NEW.status='published')
EXECUTE FUNCTION public.trg_notify_market_publication();

DROP TRIGGER IF EXISTS trg_notify_telegram_channel_publish ON public.telegram_channels;
CREATE TRIGGER trg_notify_telegram_channel_publish
AFTER INSERT OR UPDATE OF status ON public.telegram_channels
FOR EACH ROW
WHEN (NEW.status='published')
EXECUTE FUNCTION public.trg_notify_market_publication();

DROP TRIGGER IF EXISTS trg_notify_pastelink_publish ON public.pastelinks;
CREATE TRIGGER trg_notify_pastelink_publish
AFTER INSERT OR UPDATE OF visibility ON public.pastelinks
FOR EACH ROW
WHEN (NEW.visibility='public')
EXECUTE FUNCTION public.trg_notify_market_publication();

COMMIT;


-- ============================================================
-- FINAL WD OPERATING SCHEDULE + ADMIN ANNOUNCEMENTS
-- WIB / Asia-Jakarta
-- Manual WD:
--   Mon-Wed 09:00-21:00
--   Thu (malam Jumat) 09:00-23:00
--   Fri 09:00-21:00
--   Sat/Sun + configured public holidays = CLOSED
-- Instant WD is unchanged.
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.withdrawal_holidays (
  holiday_date date PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'national',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS withdrawal_holidays_public_read ON public.withdrawal_holidays;
CREATE POLICY withdrawal_holidays_public_read
ON public.withdrawal_holidays
FOR SELECT TO anon,authenticated
USING (is_active=true OR public.is_current_user_admin());

DROP POLICY IF EXISTS withdrawal_holidays_admin_write ON public.withdrawal_holidays;
CREATE POLICY withdrawal_holidays_admin_write
ON public.withdrawal_holidays
FOR ALL TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

GRANT SELECT ON public.withdrawal_holidays TO anon,authenticated;
GRANT ALL ON public.withdrawal_holidays TO authenticated;

-- Official 2026 Indonesian national holidays + collective leave.
-- Source: SKB 3 Menteri 2026 (17 national holidays + 8 collective leave).
INSERT INTO public.withdrawal_holidays(holiday_date,name,kind)
VALUES
 ('2026-01-01','Tahun Baru 2026 Masehi','national'),
 ('2026-01-16','Isra Mikraj Nabi Muhammad saw.','national'),
 ('2026-02-16','Cuti Bersama Tahun Baru Imlek 2577 Kongzili','collective_leave'),
 ('2026-02-17','Tahun Baru Imlek 2577 Kongzili','national'),
 ('2026-03-18','Cuti Bersama Hari Suci Nyepi','collective_leave'),
 ('2026-03-19','Hari Suci Nyepi (Tahun Baru Saka 1948)','national'),
 ('2026-03-20','Cuti Bersama Idulfitri 1447 H','collective_leave'),
 ('2026-03-21','Idulfitri 1447 H','national'),
 ('2026-03-22','Idulfitri 1447 H','national'),
 ('2026-03-23','Cuti Bersama Idulfitri 1447 H','collective_leave'),
 ('2026-03-24','Cuti Bersama Idulfitri 1447 H','collective_leave'),
 ('2026-04-03','Wafat Yesus Kristus','national'),
 ('2026-04-05','Kebangkitan Yesus Kristus (Paskah)','national'),
 ('2026-05-01','Hari Buruh Internasional','national'),
 ('2026-05-14','Kenaikan Yesus Kristus','national'),
 ('2026-05-15','Cuti Bersama Kenaikan Yesus Kristus','collective_leave'),
 ('2026-05-27','Iduladha 1447 H','national'),
 ('2026-05-28','Cuti Bersama Iduladha 1447 H','collective_leave'),
 ('2026-05-31','Hari Raya Waisak 2570 BE','national'),
 ('2026-06-01','Hari Lahir Pancasila','national'),
 ('2026-06-16','1 Muharam Tahun Baru Islam 1448 H','national'),
 ('2026-08-17','Proklamasi Kemerdekaan','national'),
 ('2026-08-25','Maulid Nabi Muhammad saw.','national'),
 ('2026-12-24','Cuti Bersama Kelahiran Yesus Kristus','collective_leave'),
 ('2026-12-25','Kelahiran Yesus Kristus','national')
ON CONFLICT (holiday_date) DO UPDATE
SET name=excluded.name, kind=excluded.kind, is_active=true;

CREATE OR REPLACE FUNCTION public.withdrawal_schedule_status(
  p_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  local_ts timestamp;
  d date;
  dow int;
  mins int;
  close_mins int;
  holiday_name text;
  is_holiday boolean;
  is_open boolean := false;
  reason text := '';
  next_open timestamp;
BEGIN
  local_ts := timezone('Asia/Jakarta', coalesce(p_at,now()));
  d := local_ts::date;
  dow := extract(isodow from local_ts)::int; -- Mon=1 ... Sun=7
  mins := extract(hour from local_ts)::int*60 + extract(minute from local_ts)::int;

  SELECT h.name INTO holiday_name
  FROM public.withdrawal_holidays h
  WHERE h.holiday_date=d AND h.is_active=true
  LIMIT 1;

  is_holiday := holiday_name IS NOT NULL;

  IF is_holiday THEN
    reason := 'Tanggal merah: '||holiday_name;
  ELSIF dow IN (6,7) THEN
    reason := CASE WHEN dow=6 THEN 'Hari Sabtu' ELSE 'Hari Minggu' END;
  ELSE
    close_mins := CASE WHEN dow=4 THEN 23*60 ELSE 21*60 END; -- Thu = malam Jumat
    IF mins >= 9*60 AND mins < close_mins THEN
      is_open := true;
      reason := CASE WHEN dow=4 THEN 'Kamis 09:00-23:00 WIB (malam Jumat)'
                     ELSE 'Senin-Jumat 09:00-21:00 WIB' END;
    ELSE
      reason := CASE WHEN dow=4 THEN 'Di luar jam WD Manual Kamis (09:00-23:00 WIB)'
                     ELSE 'Di luar jam WD Manual (09:00-21:00 WIB)' END;
    END IF;
  END IF;

  IF NOT is_open THEN
    -- Find the next weekday/non-holiday opening at 09:00 WIB.
    FOR i IN 1..370 LOOP
      IF extract(isodow from (d+i)::date)::int BETWEEN 1 AND 5
         AND NOT EXISTS (
           SELECT 1 FROM public.withdrawal_holidays h
           WHERE h.holiday_date=(d+i)::date AND h.is_active=true
         ) THEN
        next_open := ((d+i)::date + time '09:00');
        EXIT;
      END IF;
    END LOOP;
    -- If today is an open weekday but before 09:00, today is the next opening.
    IF NOT is_holiday AND dow BETWEEN 1 AND 5 AND mins < 9*60 THEN
      next_open := d + time '09:00';
    END IF;
  ELSE
    next_open := local_ts;
  END IF;

  RETURN jsonb_build_object(
    'open',is_open,
    'weekday',dow,
    'date',d,
    'time',to_char(local_ts,'HH24:MI'),
    'reason',reason,
    'holiday',is_holiday,
    'holiday_name',holiday_name,
    'open_time','09:00',
    'close_time',CASE WHEN dow=4 THEN '23:00' ELSE '21:00' END,
    'timezone','Asia/Jakarta',
    'next_open',CASE WHEN next_open IS NULL THEN NULL
                     ELSE to_char(next_open,'YYYY-MM-DD HH24:MI:SS') END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.withdrawal_schedule_status(timestamptz) TO anon,authenticated;

-- Server-side enforcement. Frontend can disable the button, but this
-- function is the final security gate so closed hours cannot be bypassed.
CREATE OR REPLACE FUNCTION public.request_withdrawal_v2(
 p_amount numeric,p_mode text,p_method text,p_account_name text,p_account_number text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 uid uuid:=auth.uid(); wid uuid; available numeric:=0;
 fee numeric:=0; net_amount numeric:=0; total_debit numeric:=0;
 mode_normalized text:=lower(btrim(coalesce(p_mode,'')));
 sched jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 IF p_amount IS NULL OR p_amount<=0 THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_AMOUNT'; END IF;

 -- Manual WD is schedule-controlled. Instant remains unchanged.
 IF mode_normalized='manual' THEN
   sched:=public.withdrawal_schedule_status(now());
   IF coalesce((sched->>'open')::boolean,false)=false THEN
     RAISE EXCEPTION 'WITHDRAWAL_CLOSED:%', coalesce(sched->>'reason','WD Manual sedang ditutup');
   END IF;
   IF p_amount<10000 THEN RAISE EXCEPTION 'MINIMUM_MANUAL_WITHDRAWAL_10000'; END IF;
   fee:=0;
 ELSIF mode_normalized='instant' THEN
   IF p_amount<50000 THEN RAISE EXCEPTION 'MINIMUM_INSTANT_WITHDRAWAL_50000'; END IF;
   IF p_amount>250000 THEN RAISE EXCEPTION 'MAXIMUM_INSTANT_WITHDRAWAL_250000'; END IF;
   fee:=0;
 ELSE
   RAISE EXCEPTION 'INVALID_WITHDRAWAL_MODE';
 END IF;

 net_amount:=greatest(0,p_amount-fee);
 total_debit:=p_amount+fee;

 SELECT available_balance INTO available
 FROM public.wallets WHERE user_id=uid FOR UPDATE;
 IF coalesce(available,0)<total_debit THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

 UPDATE public.wallets
 SET available_balance=available_balance-total_debit,
     balance=balance-total_debit,
     updated_at=now()
 WHERE user_id=uid;

 UPDATE public.profiles
 SET balance=balance-total_debit,updated_at=now()
 WHERE id=uid;

 INSERT INTO public.withdrawals(
   user_id,amount,fee,net_amount,mode,method,account_name,account_number,status
 ) VALUES(uid,p_amount,fee,net_amount,mode_normalized,p_method,p_account_name,p_account_number,'pending')
 RETURNING id INTO wid;

 INSERT INTO public.transactions(
   user_id,amount,fee,net_amount,type,status,reference,description
 ) VALUES(
   uid,fee,fee,fee,'withdrawal_fee','completed',
   'withdrawal-fee:'||wid::text,
   CASE WHEN mode_normalized='instant' THEN 'WD Instant fee Rp15.000' ELSE 'WD Manual fee Rp7.000' END
 );

 RETURN jsonb_build_object(
   'id',wid,'status','pending','amount',p_amount,'fee',fee,
   'net_amount',net_amount,'total_debit',total_debit,'mode',mode_normalized
 );
END $$;

GRANT EXECUTE ON FUNCTION public.request_withdrawal_v2(numeric,text,text,text,text) TO authenticated;

-- ============================================================
-- ADMIN ANNOUNCEMENT CRUD
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_announcements(
 p_limit integer DEFAULT 100,
 p_offset integer DEFAULT 0
)
RETURNS SETOF public.announcements
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 RETURN QUERY
 SELECT * FROM public.announcements
 ORDER BY coalesce(published_at,created_at) DESC
 LIMIT greatest(1,least(coalesce(p_limit,100),500))
 OFFSET greatest(0,coalesce(p_offset,0));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_announcement(
 p_id uuid DEFAULT NULL,
 p_title text DEFAULT '',
 p_body text DEFAULT '',
 p_image_url text DEFAULT NULL,
 p_published boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 r public.announcements;
 old_title text;
 old_body text;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF btrim(coalesce(p_title,''))='' THEN RAISE EXCEPTION 'TITLE_REQUIRED'; END IF;

 IF p_id IS NULL THEN
   INSERT INTO public.announcements(title,body,image_url,published,published_at)
   VALUES(left(btrim(p_title),180),coalesce(p_body,''),nullif(btrim(coalesce(p_image_url,'')),''),coalesce(p_published,true),
          CASE WHEN coalesce(p_published,true) THEN now() ELSE NULL END)
   RETURNING * INTO r;
 ELSE
   SELECT title,body INTO old_title,old_body
   FROM public.announcements WHERE id=p_id FOR UPDATE;

   IF old_title IS NULL THEN RAISE EXCEPTION 'ANNOUNCEMENT_NOT_FOUND'; END IF;

   UPDATE public.announcements
   SET title=left(btrim(p_title),180),
       body=coalesce(p_body,''),
       image_url=nullif(btrim(coalesce(p_image_url,'')),''),
       published=coalesce(p_published,false),
       published_at=CASE
         WHEN coalesce(p_published,false) AND published_at IS NULL THEN now()
         WHEN NOT coalesce(p_published,false) THEN NULL
         ELSE published_at
       END,
       updated_at=now()
   WHERE id=p_id
   RETURNING * INTO r;

   -- Keep the all-user inbox copy synchronized with the edited announcement.
   UPDATE public.notifications
   SET title=r.title, body=left(coalesce(r.body,''),1000)
   WHERE title=old_title AND body=left(coalesce(old_body,''),1000);

   IF NOT r.published THEN
     DELETE FROM public.notifications
     WHERE title=r.title AND body=left(coalesce(r.body,''),1000);
   END IF;
 END IF;

 IF r.published THEN
   PERFORM public.notify_all_users(
     r.title,
     left(coalesce(r.body,''),1000),
     NULL
   );
 END IF;

 RETURN to_jsonb(r);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_announcement(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 r public.announcements;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 SELECT * INTO r FROM public.announcements WHERE id=p_id;
 IF NOT FOUND THEN RETURN false; END IF;
 DELETE FROM public.announcements WHERE id=p_id;
 DELETE FROM public.notifications
 WHERE title=r.title AND body=left(coalesce(r.body,''),1000);
 RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_announcements(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_announcement(uuid,text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_announcement(uuid) TO authenticated;

COMMIT;

-- ============================================================
-- FINAL HARDENING PATCH — AUTH + BOT MASTER RELATION + CREATE
-- This block is intentionally last so it overrides earlier
-- duplicate definitions in this master reset file.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1) Case-insensitive identity uniqueness.
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_ci_uidx
ON public.profiles (lower(btrim(username)));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_email_ci_uidx
ON public.profiles (lower(btrim(auth_email)));

-- ------------------------------------------------------------
-- 2) Username/email availability RPCs.
-- Email is checked against auth.users because auth.users is the
-- real source of truth for authentication.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_email_available(p_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE lower(btrim(coalesce(u.email,''))) = lower(btrim(coalesce(p_email,'')))
  );
$$;

CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(btrim(coalesce(p.username,''))) = lower(btrim(coalesce(p_username,'')))
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_username_login(p_username text)
RETURNS TABLE(username text,auth_email text,is_banned boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT p.username,p.auth_email,p.is_banned
  FROM public.profiles p
  WHERE lower(btrim(p.username))=lower(btrim(coalesce(p_username,'')))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_available(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_username_login(text) TO anon,authenticated;

-- ------------------------------------------------------------
-- 3) Rebuild the new-user trigger so the requested username is
-- preserved. No silent username_1 substitution.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  requested text;
  fallback text;
BEGIN
  requested := lower(btrim(coalesce(new.raw_user_meta_data->>'username','')));
  requested := regexp_replace(requested,'[^a-z0-9_]','','g');

  IF requested='' THEN
    fallback := lower(split_part(coalesce(new.email,'user'),'@',1));
    requested := regexp_replace(fallback,'[^a-z0-9_]','','g');
  END IF;

  IF requested='' THEN requested:='user'; END IF;
  requested := left(requested,32);

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(btrim(p.username))=requested
      AND p.id<>new.id
  ) THEN
    RAISE EXCEPTION 'USERNAME_ALREADY_EXISTS';
  END IF;

  INSERT INTO public.profiles(id,username,auth_email,display_name)
  VALUES(
    new.id,
    requested,
    lower(btrim(coalesce(new.email,''))),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''),requested)
  )
  ON CONFLICT (id) DO UPDATE SET
    username=excluded.username,
    auth_email=excluded.auth_email,
    display_name=coalesce(public.profiles.display_name,excluded.display_name),
    updated_at=now();

  INSERT INTO public.wallets(user_id,balance,available_balance,pending_balance)
  VALUES(new.id,0,0,0)
  ON CONFLICT(user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 4) Repair profiles for AUTH users that already existed before
-- this SQL was executed. This is the important fix for the
-- "username tidak terdaftar" problem after a public profile reset.
-- ------------------------------------------------------------
DO $$
DECLARE
  u record;
  base text;
  candidate text;
  suffix integer;
BEGIN
  FOR u IN
    SELECT id,email,raw_user_meta_data,created_at
    FROM auth.users
    ORDER BY created_at,id
  LOOP
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id=u.id) THEN
      CONTINUE;
    END IF;

    base := lower(btrim(coalesce(u.raw_user_meta_data->>'username','')));
    base := regexp_replace(base,'[^a-z0-9_]','','g');
    IF base='' THEN
      base := lower(split_part(coalesce(u.email,'user'),'@',1));
      base := regexp_replace(base,'[^a-z0-9_]','','g');
    END IF;
    IF base='' THEN base:='user'; END IF;
    base:=left(base,24);
    candidate:=base;
    suffix:=0;

    WHILE EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE lower(btrim(p.username))=lower(candidate)
    ) LOOP
      suffix:=suffix+1;
      candidate:=left(base,greatest(1,32-length(suffix::text)-1))||'_'||suffix::text;
    END LOOP;

    INSERT INTO public.profiles(
      id,username,auth_email,display_name,created_at,updated_at
    ) VALUES(
      u.id,candidate,lower(btrim(coalesce(u.email,''))),candidate,
      coalesce(u.created_at,now()),now()
    );

    INSERT INTO public.wallets(user_id,balance,available_balance,pending_balance)
    VALUES(u.id,0,0,0)
    ON CONFLICT(user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 5) BOT MASTER RELATION.
-- telegram_products keeps a snapshot for compatibility, but
-- approved_bot_id is now the source of truth.
-- ------------------------------------------------------------
ALTER TABLE public.telegram_products
  ADD COLUMN IF NOT EXISTS approved_bot_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname='telegram_products_approved_bot_id_fkey'
  ) THEN
    ALTER TABLE public.telegram_products
      ADD CONSTRAINT telegram_products_approved_bot_id_fkey
      FOREIGN KEY (approved_bot_id)
      REFERENCES public.approved_bots(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_telegram_products_approved_bot
ON public.telegram_products(approved_bot_id);

CREATE UNIQUE INDEX IF NOT EXISTS approved_bots_telegram_id_uidx
ON public.approved_bots(bot_id)
WHERE bot_id IS NOT NULL;

-- Link old Code rows to their master bot when possible.
UPDATE public.telegram_products tp
SET approved_bot_id=ab.id,
    bot_username=regexp_replace(coalesce(ab.bot_username,tp.bot_username),'^@',''),
    telegram_bot_id=coalesce(ab.bot_id,tp.telegram_bot_id)
FROM public.approved_bots ab
WHERE tp.approved_bot_id IS NULL
  AND (
    (tp.telegram_bot_id IS NOT NULL AND ab.bot_id=tp.telegram_bot_id)
    OR lower(regexp_replace(coalesce(tp.bot_username,''),'^@',''))=
       lower(regexp_replace(coalesce(ab.bot_username,''),'^@',''))
  );

CREATE OR REPLACE FUNCTION public.sync_telegram_product_bot()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  UPDATE public.telegram_products
  SET bot_username=regexp_replace(coalesce(NEW.bot_username,''),'^@',''),
      telegram_bot_id=NEW.bot_id,
      updated_at=now()
  WHERE approved_bot_id=NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_telegram_product_bot ON public.approved_bots;
CREATE TRIGGER trg_sync_telegram_product_bot
AFTER UPDATE OF bot_username,bot_id,bot_name,is_active ON public.approved_bots
FOR EACH ROW EXECUTE FUNCTION public.sync_telegram_product_bot();

-- ------------------------------------------------------------
-- 6) Admin bot update RPC. Editing the same master row changes
-- every Code that references it automatically.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_bot(
  p_id uuid,
  p_username text,
  p_bot_id bigint,
  p_display_name text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE r public.approved_bots;
DECLARE clean_username text;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  clean_username:=lower(regexp_replace(btrim(coalesce(p_username,'')),'^@',''));
  IF clean_username !~ '^[a-z0-9_]{5,32}$' THEN
    RAISE EXCEPTION 'INVALID_BOT_USERNAME';
  END IF;
  IF p_bot_id IS NULL THEN
    RAISE EXCEPTION 'BOT_ID_REQUIRED';
  END IF;

  UPDATE public.approved_bots
  SET bot_username=clean_username,
      bot_id=p_bot_id,
      bot_name=nullif(btrim(coalesce(p_display_name,'')),''),
      is_active=true,
      updated_at=now()
  WHERE id=p_id
  RETURNING * INTO r;

  IF r.id IS NULL THEN RAISE EXCEPTION 'BOT_NOT_FOUND'; END IF;
  RETURN to_jsonb(r);
END;
$$;

-- Compatibility upsert: same Telegram Bot ID means the same master
-- bot, so changing its username updates the existing master record.
CREATE OR REPLACE FUNCTION public.admin_upsert_bot(
  p_username text,p_bot_id bigint,p_display_name text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE r public.approved_bots;
DECLARE clean_username text;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  clean_username:=lower(regexp_replace(btrim(coalesce(p_username,'')),'^@',''));
  IF clean_username !~ '^[a-z0-9_]{5,32}$' THEN RAISE EXCEPTION 'INVALID_BOT_USERNAME'; END IF;
  IF p_bot_id IS NULL THEN RAISE EXCEPTION 'BOT_ID_REQUIRED'; END IF;

  SELECT * INTO r FROM public.approved_bots
  WHERE bot_id=p_bot_id OR lower(bot_username)=clean_username
  ORDER BY CASE WHEN bot_id=p_bot_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF r.id IS NOT NULL THEN
    UPDATE public.approved_bots
    SET bot_username=clean_username,
        bot_id=p_bot_id,
        bot_name=nullif(btrim(coalesce(p_display_name,'')),''),
        is_active=true,
        updated_at=now()
    WHERE id=r.id
    RETURNING * INTO r;
  ELSE
    INSERT INTO public.approved_bots(bot_username,bot_id,bot_name,is_active)
    VALUES(clean_username,p_bot_id,nullif(btrim(coalesce(p_display_name,'')),''),true)
    RETURNING * INTO r;
  END IF;

  RETURN to_jsonb(r);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_bot(uuid,text,bigint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_bot(text,bigint,text) TO authenticated;

-- ------------------------------------------------------------
-- 7) Public bot list helper for Create Code. Only active bots.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_approved_bots()
RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT jsonb_build_object(
    'id',b.id,
    'bot_username',b.bot_username,
    'bot_name',b.bot_name,
    'bot_id',b.bot_id
  )
  FROM public.approved_bots b
  WHERE b.is_active=true
  ORDER BY lower(coalesce(b.bot_name,b.bot_username));
$$;
GRANT EXECUTE ON FUNCTION public.get_active_approved_bots() TO anon,authenticated;

-- ------------------------------------------------------------
-- 8) Stronger PasteLink access/price validation.
-- ------------------------------------------------------------
ALTER TABLE public.pastelinks
  DROP CONSTRAINT IF EXISTS pastelinks_price_access_check;
ALTER TABLE public.pastelinks
  ADD CONSTRAINT pastelinks_price_access_check
  CHECK (
    (access_type='free' AND price=0)
    OR
    (access_type='paid' AND price BETWEEN 2000 AND 100000 AND mod(price,1000)=0)
  ) NOT VALID;

COMMIT;

-- ============================================================
-- END FINAL HARDENING PATCH
-- ============================================================

BEGIN;

-- Final Code detail: expose current master-bot data so the UI can
-- always show the latest admin-edited username/name.
CREATE OR REPLACE FUNCTION public.get_market_item_detail(p_type text,p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r record;
  result jsonb;
  normalized text:=lower(btrim(coalesce(p_type,'')));
  can_access boolean:=false;
BEGIN
  IF normalized IN ('product','link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           coalesce(p.creator_id,p.seller_id) owner_id
    INTO r FROM public.products p
    LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
    WHERE p.id=p_id;
  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.owner_id seller_id,p.owner_id owner_id,
           ab.bot_username master_bot_username,
           ab.bot_name master_bot_name,
           ab.bot_id master_bot_id,
           coalesce(ab.is_active,false) bot_active
    INTO r FROM public.telegram_products p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    LEFT JOIN public.approved_bots ab ON ab.id=p.approved_bot_id
    WHERE p.id=p_id;
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.owner_id seller_id,p.owner_id owner_id,p.name title
    INTO r FROM public.telegram_channels p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.id=p_id;
  ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.user_id owner_id,'pastelink'::text item_type
    INTO r FROM public.pastelinks p
    LEFT JOIN public.profiles pr ON pr.id=p.user_id
    WHERE p.id=p_id;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF r IS NULL THEN RETURN jsonb_build_object('found',false); END IF;

  can_access:=auth.uid() IS NOT NULL AND (
    auth.uid()=r.owner_id OR
    public.is_current_user_admin() OR
    coalesce(r.access_type,'free')='free' OR
    EXISTS(
      SELECT 1 FROM public.purchases pu
      WHERE pu.buyer_id=auth.uid()
        AND pu.product_id=p_id
        AND lower(coalesce(pu.status,'')) IN ('completed','paid','success')
    )
  );

  result:=to_jsonb(r)||jsonb_build_object('found',true,'can_access',can_access);

  IF normalized IN ('code','telegram_product','telegram-product') THEN
    result:=result||jsonb_build_object(
      'bot_username',coalesce(r.master_bot_username,r.bot_username),
      'bot_name',r.master_bot_name,
      'bot_id',r.master_bot_id,
      'bot_active',coalesce(r.bot_active,false)
    );
  END IF;

  IF NOT can_access AND coalesce(r.access_type,'free')='paid' THEN
    result:=result-'content'-'content_html';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_market_item_detail(text,uuid) TO anon,authenticated;

-- Never delete a bot master while Codes still depend on it.
CREATE OR REPLACE FUNCTION public.admin_delete_bot(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM public.telegram_products WHERE approved_bot_id=p_id) THEN
    RAISE EXCEPTION 'BOT_IN_USE_USE_EDIT_OR_DEACTIVATE';
  END IF;
  DELETE FROM public.approved_bots WHERE id=p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_bot(uuid) TO authenticated;

COMMIT;

BEGIN;

-- ------------------------------------------------------------
-- Secure PasteLink reads: paid content is returned only through
-- the SECURITY DEFINER detail RPC after access verification.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS pastelinks_owner_or_public ON public.pastelinks;
CREATE POLICY pastelinks_owner_or_public
ON public.pastelinks
FOR SELECT TO anon,authenticated
USING (
  user_id=auth.uid()
  OR public.is_current_user_admin()
  OR (visibility='public' AND coalesce(access_type,'free')='free')
);

CREATE OR REPLACE FUNCTION public.get_pastelink_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT id INTO pid
  FROM public.pastelinks
  WHERE slug=btrim(coalesce(p_slug,''))
  LIMIT 1;

  IF pid IS NULL THEN
    RETURN jsonb_build_object('found',false);
  END IF;

  RETURN public.get_market_item_detail('pastelink',pid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pastelink_by_slug(text) TO anon,authenticated;

COMMIT;


-- ============================================================================
-- FINAL PRODUCT ACCESS + GUEST FREE CREATION HARDENING
-- ============================================================================
-- Rules:
-- 1) Guest users may OPEN/VISIT only FREE public content.
-- 2) PAID content never exposes its protected payload until a completed purchase.
-- 3) Guest users may CREATE FREE PasteLink / Code / Channel / Group.
-- 4) PAID creation requires an authenticated account.
-- 5) Authenticated owners/admins may manage their own content.
-- 6) Price/access are normalized together: free => 0, paid => Rp5k..Rp150k step Rp1k.
-- ============================================================================
BEGIN;

ALTER TABLE public.pastelinks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.pastelinks ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'free';
ALTER TABLE public.pastelinks ADD COLUMN IF NOT EXISTS price numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.pastelinks DROP CONSTRAINT IF EXISTS pastelinks_price_access_check;
ALTER TABLE public.pastelinks ADD CONSTRAINT pastelinks_price_access_check CHECK (
  (access_type='free' AND price=0) OR
  (access_type='paid' AND price BETWEEN 2000 AND 100000 AND mod(price,1000)=0)
) NOT VALID;

-- Public metadata is exposed through the marketplace view; base tables are
-- intentionally limited to rows that are safe for direct frontend reads.
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
FOR SELECT TO anon,authenticated
USING (
  seller_id=auth.uid() OR creator_id=auth.uid() OR public.is_current_user_admin()
  OR status IN ('published','active')
);

DROP POLICY IF EXISTS telegram_products_public_read ON public.telegram_products;
CREATE POLICY telegram_products_public_read ON public.telegram_products
FOR SELECT TO anon,authenticated
USING (
  owner_id=auth.uid() OR public.is_current_user_admin()
  OR status IN ('published','active')
);

DROP POLICY IF EXISTS telegram_channels_public_read ON public.telegram_channels;
CREATE POLICY telegram_channels_public_read ON public.telegram_channels
FOR SELECT TO anon,authenticated
USING (
  owner_id=auth.uid() OR public.is_current_user_admin()
  OR status IN ('published','active')
);

-- Paid PasteLinks are NOT directly readable by guests/unpaid users.
DROP POLICY IF EXISTS pastelinks_owner_or_public ON public.pastelinks;
CREATE POLICY pastelinks_owner_or_public ON public.pastelinks
FOR SELECT TO anon,authenticated
USING (
  user_id=auth.uid()
  OR public.is_current_user_admin()
  OR (visibility='public' AND coalesce(access_type,'free')='free')
);

-- Guest/authenticated creation RPCs. These are the ONLY public write paths.
CREATE OR REPLACE FUNCTION public.create_pastelink_content(
  p_title text,p_content text,p_slug text,p_access_type text DEFAULT 'free',
  p_price numeric DEFAULT 0,p_description text DEFAULT '',p_tags text[] DEFAULT '{}',
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); a text:=lower(btrim(coalesce(p_access_type,'free'))); pr numeric:=coalesce(p_price,0); r public.pastelinks;
BEGIN
 IF btrim(coalesce(p_title,''))='' OR btrim(coalesce(p_content,''))='' THEN RAISE EXCEPTION 'TITLE_AND_CONTENT_REQUIRED'; END IF;
 IF a NOT IN ('free','paid') THEN RAISE EXCEPTION 'INVALID_ACCESS_TYPE'; END IF;
 IF a='paid' AND uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED_FOR_PAID'; END IF;
 IF a='free' THEN pr:=0; ELSE IF pr<2000 OR pr>100000 OR mod(pr,1000)<>0 THEN RAISE EXCEPTION 'INVALID_PAID_PRICE'; END IF; END IF;
 INSERT INTO public.pastelinks(user_id,slug,title,content_html,visibility,password_hash,expires_at,description,tags,allow_comments,allow_download,show_raw,anonymous,views,access_type,price)
 VALUES(uid,btrim(p_slug),btrim(p_title),p_content,'public',NULL,p_expires_at,coalesce(p_description,''),coalesce(p_tags,'{}'),true,true,true,uid IS NULL,0,a,pr)
 RETURNING * INTO r;
 RETURN jsonb_build_object('ok',true,'id',r.id,'slug',r.slug,'access_type',r.access_type,'price',r.price);
END $$;

CREATE OR REPLACE FUNCTION public.create_code_content(
  p_title text,p_content text,p_slug text,p_access_type text DEFAULT 'free',p_price numeric DEFAULT 0,
  p_description text DEFAULT '',p_approved_bot_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); a text:=lower(btrim(coalesce(p_access_type,'free'))); pr numeric:=coalesce(p_price,0); b public.approved_bots; r public.telegram_products;
BEGIN
 IF btrim(coalesce(p_title,''))='' OR btrim(coalesce(p_content,''))='' THEN RAISE EXCEPTION 'TITLE_AND_CONTENT_REQUIRED'; END IF;
 IF a NOT IN ('free','paid') THEN RAISE EXCEPTION 'INVALID_ACCESS_TYPE'; END IF;
 IF a='paid' AND uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED_FOR_PAID'; END IF;
 IF a='free' THEN pr:=0; ELSE IF pr<2000 OR pr>100000 OR mod(pr,1000)<>0 THEN RAISE EXCEPTION 'INVALID_PAID_PRICE'; END IF; END IF;
 IF p_approved_bot_id IS NULL THEN RAISE EXCEPTION 'APPROVED_BOT_REQUIRED'; END IF;
 SELECT * INTO b FROM public.approved_bots WHERE id=p_approved_bot_id AND is_active=true;
 IF b.id IS NULL THEN RAISE EXCEPTION 'BOT_NOT_FOUND_OR_INACTIVE'; END IF;
 INSERT INTO public.telegram_products(owner_id,title,slug,type,product_type,access_type,bot_username,telegram_bot_id,price,description,content,thumbnail_url,category,status,approved_bot_id)
 VALUES(uid,btrim(p_title),btrim(p_slug),'code','code',a,b.bot_username,b.bot_id,pr,coalesce(p_description,''),p_content,NULL,'General','published',b.id)
 RETURNING * INTO r;
 RETURN jsonb_build_object('ok',true,'id',r.id,'slug',r.slug,'access_type',r.access_type,'price',r.price);
END $$;

CREATE OR REPLACE FUNCTION public.create_telegram_content(
  p_name text,p_slug text,p_type text,p_access_type text DEFAULT 'free',p_price numeric DEFAULT 0,
  p_description text DEFAULT '',p_username text DEFAULT NULL,p_invite_url text DEFAULT NULL,
  p_telegram_channel_id text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); a text:=lower(btrim(coalesce(p_access_type,'free'))); pr numeric:=coalesce(p_price,0); k text:=CASE WHEN lower(coalesce(p_type,''))='group' THEN 'group' ELSE 'channel' END; r public.telegram_channels;
BEGIN
 IF btrim(coalesce(p_name,''))='' THEN RAISE EXCEPTION 'TITLE_REQUIRED'; END IF;
 IF a NOT IN ('free','paid') THEN RAISE EXCEPTION 'INVALID_ACCESS_TYPE'; END IF;
 IF a='paid' AND uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED_FOR_PAID'; END IF;
 IF a='free' THEN pr:=0; ELSE IF pr<2000 OR pr>100000 OR mod(pr,1000)<>0 THEN RAISE EXCEPTION 'INVALID_PAID_PRICE'; END IF; END IF;
 INSERT INTO public.telegram_channels(owner_id,slug,username,name,type,access_type,telegram_channel_id,description,invite_url,price,category,status)
 VALUES(uid,btrim(p_slug),p_username,btrim(p_name),k,a,p_telegram_channel_id,coalesce(p_description,''),p_invite_url,pr,'General','published')
 RETURNING * INTO r;
 RETURN jsonb_build_object('ok',true,'id',r.id,'slug',r.slug,'access_type',r.access_type,'price',r.price,'type',r.type);
END $$;

GRANT EXECUTE ON FUNCTION public.create_pastelink_content(text,text,text,text,numeric,text,text[],timestamptz) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_code_content(text,text,text,text,numeric,text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_telegram_content(text,text,text,text,numeric,text,text,text,text) TO anon,authenticated;

-- Definitive secure detail RPC: FREE is visible to guests; PAID requires owner/admin/purchase.
CREATE OR REPLACE FUNCTION public.get_market_item_detail(p_type text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; result jsonb; normalized text:=lower(btrim(coalesce(p_type,''))); can_access boolean:=false; uid uuid:=auth.uid(); paid boolean:=false;
BEGIN
 IF normalized IN ('product','link','code') THEN
   IF normalized='code' THEN
     SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id seller_id,p.owner_id owner_id,
            ab.bot_username master_bot_username,ab.bot_name master_bot_name,ab.bot_id master_bot_id,coalesce(ab.is_active,false) bot_active
     INTO r FROM public.telegram_products p LEFT JOIN public.profiles pr ON pr.id=p.owner_id LEFT JOIN public.approved_bots ab ON ab.id=p.approved_bot_id WHERE p.id=p_id;
   ELSE
     SELECT p.*,pr.username creator_username,pr.display_name creator_name,coalesce(p.creator_id,p.seller_id) owner_id
     INTO r FROM public.products p LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id) WHERE p.id=p_id;
   END IF;
 ELSIF normalized IN ('telegram_product','telegram-product') THEN
   SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id seller_id,p.owner_id owner_id,
          ab.bot_username master_bot_username,ab.bot_name master_bot_name,ab.bot_id master_bot_id,coalesce(ab.is_active,false) bot_active
   INTO r FROM public.telegram_products p LEFT JOIN public.profiles pr ON pr.id=p.owner_id LEFT JOIN public.approved_bots ab ON ab.id=p.approved_bot_id WHERE p.id=p_id;
 ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
   SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id seller_id,p.owner_id owner_id,p.name title
   INTO r FROM public.telegram_channels p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
 ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
   SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.user_id owner_id,'pastelink'::text item_type
   INTO r FROM public.pastelinks p LEFT JOIN public.profiles pr ON pr.id=p.user_id WHERE p.id=p_id;
 ELSE RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE'; END IF;
 IF r IS NULL THEN RETURN jsonb_build_object('found',false); END IF;
 paid:=coalesce(r.access_type,'free')='paid' OR coalesce(r.price,0)>0;
 can_access:=NOT paid OR public.is_current_user_admin() OR (uid IS NOT NULL AND uid=r.owner_id) OR
   (uid IS NOT NULL AND EXISTS(SELECT 1 FROM public.purchases pu WHERE pu.buyer_id=uid AND pu.product_id=p_id AND lower(coalesce(pu.status,'')) IN ('completed','paid','success')));
 result:=to_jsonb(r)||jsonb_build_object('found',true,'can_access',can_access,'is_paid',paid);
 IF NOT can_access AND paid THEN result:=result-'content'-'content_html'; END IF;
 RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION public.get_market_item_detail(text,uuid) TO anon,authenticated;

-- Keep PasteLink slug access on the same secure contract.
CREATE OR REPLACE FUNCTION public.get_pastelink_by_slug(p_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pid uuid;
BEGIN SELECT id INTO pid FROM public.pastelinks WHERE slug=btrim(coalesce(p_slug,'')) LIMIT 1; IF pid IS NULL THEN RETURN jsonb_build_object('found',false); END IF; RETURN public.get_market_item_detail('pastelink',pid); END $$;
GRANT EXECUTE ON FUNCTION public.get_pastelink_by_slug(text) TO anon,authenticated;

-- Withdrawal schedule remains authoritative from SQL RPC; frontend must fail closed.
COMMIT;


-- ============================================================
-- FINAL ACCESS/PURCHASE HARDENING 2026-09-11
-- Rules:
--   * Guest may CREATE FREE PasteLink/Code/Group/Channel.
--   * Guest may BUY PAID content without registering.
--   * Creating PAID content requires authentication.
--   * PAID content is only revealed after successful payment.
--   * Guest purchase access is bound to an unguessable bearer token.
-- ============================================================
BEGIN;

ALTER TABLE public.pastelinks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.pastelinks ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'free';
ALTER TABLE public.pastelinks ADD COLUMN IF NOT EXISTS price numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.telegram_products ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'free';
ALTER TABLE public.telegram_products ADD COLUMN IF NOT EXISTS price numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.telegram_channels ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'free';
ALTER TABLE public.telegram_channels ADD COLUMN IF NOT EXISTS price numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_access_token text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_guest_access_token_uidx ON public.orders(guest_access_token) WHERE guest_access_token IS NOT NULL;

-- Public FREE rows only. Paid content must be opened through access RPCs.
DROP POLICY IF EXISTS pastelinks_owner_or_public ON public.pastelinks;
CREATE POLICY pastelinks_owner_or_public ON public.pastelinks FOR SELECT TO anon,authenticated
USING (
  (user_id IS NOT NULL AND user_id=auth.uid())
  OR public.is_current_user_admin()
  OR (visibility='public' AND lower(coalesce(access_type,'free'))='free')
);

CREATE OR REPLACE FUNCTION public.create_pastelink_content(
  p_title text,p_content text,p_slug text,p_access_type text DEFAULT 'free',
  p_price numeric DEFAULT 0,p_description text DEFAULT '',p_tags text[] DEFAULT '{}',
  p_expires_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); a text:=lower(btrim(coalesce(p_access_type,'free'))); pr numeric:=coalesce(p_price,0); r public.pastelinks;
BEGIN
 IF btrim(coalesce(p_title,''))='' OR btrim(coalesce(p_content,''))='' THEN RAISE EXCEPTION 'TITLE_AND_CONTENT_REQUIRED'; END IF;
 IF a NOT IN ('free','paid') THEN RAISE EXCEPTION 'INVALID_ACCESS_TYPE'; END IF;
 IF a='paid' AND uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED_FOR_PAID'; END IF;
 IF a='free' THEN pr:=0; ELSE IF pr<2000 OR pr>100000 OR mod(pr,1000)<>0 THEN RAISE EXCEPTION 'INVALID_PAID_PRICE'; END IF; END IF;
 INSERT INTO public.pastelinks(user_id,slug,title,content_html,visibility,password_hash,expires_at,description,tags,allow_comments,allow_download,show_raw,anonymous,views,access_type,price)
 VALUES(uid,btrim(p_slug),btrim(p_title),p_content,'public',NULL,p_expires_at,coalesce(p_description,''),coalesce(p_tags,'{}'),true,true,true,uid IS NULL,0,a,pr) RETURNING * INTO r;
 RETURN jsonb_build_object('ok',true,'id',r.id,'slug',r.slug,'access_type',r.access_type,'price',r.price);
END $$;

CREATE OR REPLACE FUNCTION public.create_code_content(
 p_title text,p_content text,p_slug text,p_access_type text DEFAULT 'free',p_price numeric DEFAULT 0,p_description text DEFAULT '',p_approved_bot_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); a text:=lower(btrim(coalesce(p_access_type,'free'))); pr numeric:=coalesce(p_price,0); b public.approved_bots; r public.telegram_products;
BEGIN
 IF btrim(coalesce(p_title,''))='' OR btrim(coalesce(p_content,''))='' THEN RAISE EXCEPTION 'TITLE_AND_CONTENT_REQUIRED'; END IF;
 IF a NOT IN ('free','paid') THEN RAISE EXCEPTION 'INVALID_ACCESS_TYPE'; END IF;
 IF a='paid' AND uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED_FOR_PAID'; END IF;
 IF a='free' THEN pr:=0; ELSE IF pr<2000 OR pr>100000 OR mod(pr,1000)<>0 THEN RAISE EXCEPTION 'INVALID_PAID_PRICE'; END IF; END IF;
 IF p_approved_bot_id IS NULL THEN RAISE EXCEPTION 'APPROVED_BOT_REQUIRED'; END IF;
 SELECT * INTO b FROM public.approved_bots WHERE id=p_approved_bot_id AND is_active=true;
 IF b.id IS NULL THEN RAISE EXCEPTION 'BOT_NOT_FOUND_OR_INACTIVE'; END IF;
 INSERT INTO public.telegram_products(owner_id,title,slug,type,product_type,access_type,bot_username,telegram_bot_id,price,description,content,thumbnail_url,category,status,approved_bot_id)
 VALUES(uid,btrim(p_title),btrim(p_slug),'code','code',a,b.bot_username,b.bot_id,pr,coalesce(p_description,''),p_content,NULL,'General','published',b.id) RETURNING * INTO r;
 RETURN jsonb_build_object('ok',true,'id',r.id,'slug',r.slug,'access_type',r.access_type,'price',r.price);
END $$;

CREATE OR REPLACE FUNCTION public.create_telegram_content(
 p_name text,p_slug text,p_type text,p_access_type text DEFAULT 'free',p_price numeric DEFAULT 0,p_description text DEFAULT '',p_username text DEFAULT NULL,p_invite_url text DEFAULT NULL,p_telegram_channel_id text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); a text:=lower(btrim(coalesce(p_access_type,'free'))); pr numeric:=coalesce(p_price,0); k text:=CASE WHEN lower(coalesce(p_type,''))='group' THEN 'group' ELSE 'channel' END; r public.telegram_channels;
BEGIN
 IF btrim(coalesce(p_name,''))='' THEN RAISE EXCEPTION 'TITLE_REQUIRED'; END IF;
 IF a NOT IN ('free','paid') THEN RAISE EXCEPTION 'INVALID_ACCESS_TYPE'; END IF;
 IF a='paid' AND uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED_FOR_PAID'; END IF;
 IF a='free' THEN pr:=0; ELSE IF pr<2000 OR pr>100000 OR mod(pr,1000)<>0 THEN RAISE EXCEPTION 'INVALID_PAID_PRICE'; END IF; END IF;
 INSERT INTO public.telegram_channels(owner_id,slug,username,name,type,access_type,telegram_channel_id,description,invite_url,price,category,status)
 VALUES(uid,btrim(p_slug),p_username,btrim(p_name),k,a,p_telegram_channel_id,coalesce(p_description,''),p_invite_url,pr,'General','published') RETURNING * INTO r;
 RETURN jsonb_build_object('ok',true,'id',r.id,'slug',r.slug,'access_type',r.access_type,'price',r.price,'type',r.type);
END $$;

CREATE OR REPLACE FUNCTION public.buy_market_item_guest(p_type text,p_id uuid,p_guest_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; normalized text:=lower(btrim(coalesce(p_type,''))); tok text:=btrim(coalesce(p_guest_token,'')); seller uuid; title text; price numeric; oid uuid;
BEGIN
 IF auth.uid() IS NOT NULL THEN RETURN public.buy_market_item(p_type,p_id); END IF;
 IF length(tok)<32 THEN RAISE EXCEPTION 'GUEST_TOKEN_REQUIRED'; END IF;
 IF normalized IN ('product','link') THEN SELECT coalesce(p.creator_id,p.seller_id),p.title,p.price INTO seller,title,price FROM public.products p WHERE p.id=p_id; normalized:='product';
 ELSIF normalized IN ('code','telegram_product','telegram-product') THEN SELECT p.owner_id,p.title,p.price INTO seller,title,price FROM public.telegram_products p WHERE p.id=p_id; normalized:='telegram_product';
 ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN SELECT p.owner_id,p.name,p.price INTO seller,title,price FROM public.telegram_channels p WHERE p.id=p_id; normalized:='channel';
 ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN SELECT p.user_id,p.title,p.price INTO seller,title,price FROM public.pastelinks p WHERE p.id=p_id; normalized:='pastelink';
 ELSE RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE'; END IF;
 IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
 IF coalesce(price,0)<=0 THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;
 IF price<5000 OR price>150000 OR mod(price,1000)<>0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
 SELECT o.id INTO oid FROM public.orders o WHERE o.guest_access_token=tok AND o.product_id=p_id AND lower(coalesce(o.item_type,''))=normalized AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid') ORDER BY o.created_at DESC LIMIT 1;
 IF oid IS NULL THEN INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title,guest_access_token) VALUES(NULL,seller,p_id,price,'pending',normalized,p_id::text,title,tok) RETURNING id INTO oid; END IF;
 RETURN jsonb_build_object('order_id',oid,'amount',price,'item_title',title,'item_type',normalized,'guest_token',tok);
END $$;

CREATE OR REPLACE FUNCTION public.get_order_for_payment(p_order_id uuid,p_guest_token text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; uid uuid:=auth.uid(); tok text:=btrim(coalesce(p_guest_token,''));
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF uid IS NOT NULL AND o.buyer_id=uid THEN RETURN to_jsonb(o); END IF;
 IF uid IS NULL AND tok<>'' AND o.buyer_id IS NULL AND o.guest_access_token=tok THEN RETURN to_jsonb(o); END IF;
 RAISE EXCEPTION 'ORDER_ACCESS_DENIED';
END $$;

CREATE OR REPLACE FUNCTION public.get_market_item_detail_guest(p_type text,p_id uuid,p_guest_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; normalized text:=lower(btrim(coalesce(p_type,''))); can_access boolean:=false; tok text:=btrim(coalesce(p_guest_token,''));
BEGIN
 IF normalized IN ('product','link') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,coalesce(p.creator_id,p.seller_id) owner_id INTO r FROM public.products p LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id) WHERE p.id=p_id;
 ELSIF normalized IN ('code','telegram_product','telegram-product') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id INTO r FROM public.telegram_products p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
 ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id,p.name title INTO r FROM public.telegram_channels p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
 ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.user_id owner_id,'pastelink'::text item_type INTO r FROM public.pastelinks p LEFT JOIN public.profiles pr ON pr.id=p.user_id WHERE p.id=p_id;
 ELSE RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE'; END IF;
 IF r IS NULL THEN RETURN jsonb_build_object('found',false); END IF;
 can_access:=coalesce(r.access_type,'free')='free' OR EXISTS(SELECT 1 FROM public.purchases pu JOIN public.orders o ON o.id=pu.order_id WHERE pu.product_id=p_id AND lower(coalesce(pu.status,'')) IN ('completed','paid','success') AND o.guest_access_token=tok AND o.buyer_id IS NULL);
 IF NOT can_access AND coalesce(r.access_type,'free')='paid' THEN RETURN (to_jsonb(r)-'content'-'content_html')||jsonb_build_object('found',true,'can_access',false); END IF;
 RETURN to_jsonb(r)||jsonb_build_object('found',true,'can_access',true);
END $$;

GRANT EXECUTE ON FUNCTION public.buy_market_item_guest(text,uuid,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_for_payment(uuid,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_market_item_detail_guest(text,uuid,text) TO anon,authenticated;

-- Definitive secure detail for authenticated + guest-free access.
DROP FUNCTION IF EXISTS public.get_market_item_detail(text,uuid);
CREATE OR REPLACE FUNCTION public.get_market_item_detail(p_type text,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; normalized text:=lower(btrim(coalesce(p_type,''))); can_access boolean:=false; uid uuid:=auth.uid();
BEGIN
 IF normalized IN ('product','link') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,coalesce(p.creator_id,p.seller_id) owner_id INTO r FROM public.products p LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id) WHERE p.id=p_id;
 ELSIF normalized IN ('code','telegram_product','telegram-product') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id INTO r FROM public.telegram_products p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
 ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.owner_id owner_id,p.name title INTO r FROM public.telegram_channels p LEFT JOIN public.profiles pr ON pr.id=p.owner_id WHERE p.id=p_id;
 ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN SELECT p.*,pr.username creator_username,pr.display_name creator_name,p.user_id owner_id,'pastelink'::text item_type INTO r FROM public.pastelinks p LEFT JOIN public.profiles pr ON pr.id=p.user_id WHERE p.id=p_id;
 ELSE RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE'; END IF;
 IF r IS NULL THEN RETURN jsonb_build_object('found',false); END IF;
 can_access:=coalesce(r.access_type,'free')='free' OR (uid IS NOT NULL AND (uid=r.owner_id OR public.is_current_user_admin() OR EXISTS(SELECT 1 FROM public.purchases pu WHERE pu.buyer_id=uid AND pu.product_id=p_id AND lower(coalesce(pu.status,'')) IN ('completed','paid','success'))));
 IF NOT can_access AND coalesce(r.access_type,'free')='paid' THEN RETURN (to_jsonb(r)-'content'-'content_html')||jsonb_build_object('found',true,'can_access',false); END IF;
 RETURN to_jsonb(r)||jsonb_build_object('found',true,'can_access',true);
END $$;
GRANT EXECUTE ON FUNCTION public.get_market_item_detail(text,uuid) TO anon,authenticated;

COMMIT;

-- ============================================================
-- PASTELE LIVE NOTIFICATIONS — FINAL OVERRIDE
-- Publish: all users. Open: owner only. Purchase: buyer + seller.
-- Every notification carries a direct target URL for the 3s toast.
-- ============================================================
BEGIN;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_type text NOT NULL DEFAULT 'system';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_url text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_id uuid;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON public.notifications(user_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_user_once(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text DEFAULT 'system',
  p_link_url text DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id,title,body,notification_type,link_url,target_type,target_id)
  VALUES(p_user_id,left(coalesce(p_title,'Notifikasi'),180),left(coalesce(p_body,''),1000),coalesce(nullif(p_type,''),'system'),nullif(p_link_url,''),p_target_type,p_target_id);
END $$;

CREATE OR REPLACE FUNCTION public.notify_all_users(
  p_title text,
  p_body text,
  p_exclude_user uuid DEFAULT NULL,
  p_type text DEFAULT 'system',
  p_link_url text DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.notifications(user_id,title,body,notification_type,link_url,target_type,target_id)
  SELECT p.id,left(coalesce(p_title,'Notifikasi'),180),left(coalesce(p_body,''),1000),coalesce(nullif(p_type,''),'system'),nullif(p_link_url,''),p_target_type,p_target_id
  FROM public.profiles p
  WHERE p.id IS NOT NULL AND (p_exclude_user IS NULL OR p.id<>p_exclude_user);
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_market_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  nr jsonb := to_jsonb(NEW);
  orow jsonb := CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  owner uuid;
  label text;
  kind text;
  target text;
  target_id uuid;
  status_new text := lower(coalesce(nr->>'status',''));
  status_old text := lower(coalesce(orow->>'status',''));
  visibility_new text := lower(coalesce(nr->>'visibility',''));
  visibility_old text := lower(coalesce(orow->>'visibility',''));
  item_type text := lower(coalesce(nr->>'type',''));
BEGIN
  IF TG_OP='UPDATE' THEN
    IF TG_TABLE_NAME IN ('products','telegram_products','telegram_channels') AND status_new IS NOT DISTINCT FROM status_old THEN RETURN NEW; END IF;
    IF TG_TABLE_NAME='pastelinks' AND visibility_new IS NOT DISTINCT FROM visibility_old THEN RETURN NEW; END IF;
  END IF;

  owner := CASE
    WHEN TG_TABLE_NAME='pastelinks' THEN nullif(nr->>'user_id','')::uuid
    WHEN TG_TABLE_NAME IN ('telegram_products','telegram_channels') THEN nullif(nr->>'owner_id','')::uuid
    WHEN TG_TABLE_NAME='products' THEN coalesce(nullif(nr->>'creator_id','')::uuid,nullif(nr->>'seller_id','')::uuid)
    ELSE NULL
  END;

  label := CASE WHEN TG_TABLE_NAME='telegram_channels' THEN coalesce(nr->>'name','Channel') ELSE coalesce(nr->>'title','Konten') END;
  kind := CASE
    WHEN TG_TABLE_NAME='pastelinks' THEN 'PasteLink'
    WHEN TG_TABLE_NAME='telegram_products' THEN 'Code'
    WHEN TG_TABLE_NAME='telegram_channels' AND item_type='group' THEN 'Group'
    WHEN TG_TABLE_NAME='telegram_channels' THEN 'Channel'
    ELSE 'Produk'
  END;
  target_id := nullif(nr->>'id','')::uuid;
  target := CASE
    WHEN TG_TABLE_NAME='pastelinks' THEN 'paste-view.html?slug='||coalesce(nr->>'slug','')
    WHEN TG_TABLE_NAME='telegram_products' THEN 'product.html?type=code&id='||coalesce(nr->>'id','')
    WHEN TG_TABLE_NAME='telegram_channels' THEN 'product.html?type='||CASE WHEN item_type='group' THEN 'group' ELSE 'channel' END||'&id='||coalesce(nr->>'id','')
    WHEN TG_TABLE_NAME='products' THEN 'product.html?type=product&id='||coalesce(nr->>'id','')
    ELSE 'marketplace.html'
  END;

  IF owner IS NOT NULL THEN
    PERFORM public.notify_all_users(
      'Konten baru di Marketplace',
      kind||' "'||label||'" baru saja dipublikasikan.',
      owner,'publish',target,lower(kind),target_id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_pastelink_publish ON public.pastelinks;
CREATE TRIGGER trg_notify_pastelink_publish AFTER INSERT OR UPDATE OF visibility ON public.pastelinks FOR EACH ROW WHEN (NEW.visibility='public') EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_product_publish ON public.products;
CREATE TRIGGER trg_notify_product_publish AFTER INSERT OR UPDATE OF status ON public.products FOR EACH ROW WHEN (NEW.status IN ('published','active')) EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_telegram_product_publish ON public.telegram_products;
CREATE TRIGGER trg_notify_telegram_product_publish AFTER INSERT OR UPDATE OF status ON public.telegram_products FOR EACH ROW WHEN (NEW.status='published') EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_telegram_channel_publish ON public.telegram_channels;
CREATE TRIGGER trg_notify_telegram_channel_publish AFTER INSERT OR UPDATE OF status ON public.telegram_channels FOR EACH ROW WHEN (NEW.status='published') EXECUTE FUNCTION public.trg_notify_market_publication();

CREATE OR REPLACE FUNCTION public.trg_notify_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE seller uuid; target text; kind text:=lower(coalesce(NEW.item_type,'product')); title text:=coalesce(NEW.item_title,'Produk');
BEGIN
  SELECT seller_id INTO seller FROM public.orders WHERE id=NEW.order_id;
  IF kind IN ('pastelink','paste','link') THEN target:='paste-view.html?slug='||coalesce((SELECT slug FROM public.pastelinks WHERE id=NEW.product_id),'');
  ELSIF kind IN ('telegram_product','code') THEN target:='product.html?type=code&id='||coalesce(NEW.product_id::text,NEW.item_id,'');
  ELSIF kind IN ('channel','group','telegram_channel','telegram-channel','telegram_group','telegram-group') THEN target:='product.html?type='||CASE WHEN kind LIKE '%group%' THEN 'group' ELSE 'channel' END||'&id='||coalesce(NEW.product_id::text,NEW.item_id,'');
  ELSE target:='product.html?type=product&id='||coalesce(NEW.product_id::text,NEW.item_id,''); END IF;
  PERFORM public.notify_user_once(NEW.buyer_id,'Pembelian berhasil','Akses untuk "'||title||'" sudah tersedia.','purchase',coalesce(NEW.access_url,target),kind,NEW.product_id);
  IF seller IS NOT NULL AND seller IS DISTINCT FROM NEW.buyer_id THEN
    PERFORM public.notify_user_once(seller,'Produk terjual','"'||title||'" berhasil dibeli oleh user.','sale',target,kind,NEW.product_id);
  END IF;
  RETURN NEW;
END $$;

-- Rebuild triggers so the final functions above are always used.
DROP TRIGGER IF EXISTS trg_notify_pastelink_publish ON public.pastelinks;
CREATE TRIGGER trg_notify_pastelink_publish AFTER INSERT OR UPDATE OF visibility ON public.pastelinks FOR EACH ROW WHEN (NEW.visibility='public') EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_product_publish ON public.products;
CREATE TRIGGER trg_notify_product_publish AFTER INSERT OR UPDATE OF status ON public.products FOR EACH ROW WHEN (NEW.status IN ('published','active')) EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_telegram_product_publish ON public.telegram_products;
CREATE TRIGGER trg_notify_telegram_product_publish AFTER INSERT OR UPDATE OF status ON public.telegram_products FOR EACH ROW WHEN (NEW.status='published') EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_telegram_channel_publish ON public.telegram_channels;
CREATE TRIGGER trg_notify_telegram_channel_publish AFTER INSERT OR UPDATE OF status ON public.telegram_channels FOR EACH ROW WHEN (NEW.status='published') EXECUTE FUNCTION public.trg_notify_market_publication();
DROP TRIGGER IF EXISTS trg_notify_purchase ON public.purchases;
CREATE TRIGGER trg_notify_purchase AFTER INSERT ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.trg_notify_purchase();
DROP TRIGGER IF EXISTS trg_notify_content_view ON public.analytics_events;
CREATE TRIGGER trg_notify_content_view AFTER INSERT ON public.analytics_events FOR EACH ROW WHEN (NEW.event_type='view') EXECUTE FUNCTION public.trg_notify_view();

-- Ensure Realtime can stream notification inserts to the logged-in browser.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  END;
END $$;

COMMIT;


-- ============================================================
-- FINAL CANONICAL COMPATIBILITY PATCH — 2026-09-12
-- Frontend <-> Database contract hardening
-- ============================================================
BEGIN;

-- Notifications: the frontend and notification triggers use these
-- optional metadata fields. Existing rows remain untouched.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS notification_type text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id uuid;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications(user_id, is_read, created_at DESC);

-- Canonical public Code resolver.
-- It deliberately accepts published/active/live rows to remain compatible
-- with older data while keeping the returned detail protected by the
-- canonical get_market_item_detail() access rules.
CREATE OR REPLACE FUNCTION public.get_code_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT tp.id
    INTO pid
  FROM public.telegram_products tp
  WHERE lower(btrim(coalesce(tp.slug,''))) =
        lower(btrim(coalesce(p_slug,'')))
    AND lower(coalesce(tp.status,'published')) IN
        ('published','active','live')
  ORDER BY tp.created_at DESC NULLS LAST
  LIMIT 1;

  IF pid IS NULL THEN
    RETURN jsonb_build_object(
      'found', false,
      'error', 'CODE_NOT_FOUND'
    );
  END IF;

  RETURN public.get_market_item_detail('code', pid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_code_by_slug(text)
  TO anon, authenticated;

COMMIT;



-- ============================================================
-- FINAL PUBLIC SLUG RESOLVER PATCH — FREE CODE / CHANNEL / GROUP / PASTELINK
-- Fixes guest public URLs after static-host rewrites and RLS differences.
-- Safe to run repeatedly.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.get_telegram_content_by_slug(
  p_slug text,
  p_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  r record;
  wanted text := lower(btrim(coalesce(p_type,'')));
BEGIN
  SELECT tp.*, pr.username AS creator_username, pr.display_name AS creator_name,
         tp.owner_id AS owner_id
    INTO r
  FROM public.telegram_channels tp
  LEFT JOIN public.profiles pr ON pr.id = tp.owner_id
  WHERE lower(btrim(coalesce(tp.slug,''))) = lower(btrim(coalesce(p_slug,'')))
    AND lower(coalesce(tp.status,'published')) IN ('published','active','live')
    AND (wanted = '' OR wanted NOT IN ('channel','group') OR lower(coalesce(tp.type,'channel')) = wanted)
  ORDER BY tp.created_at DESC NULLS LAST
  LIMIT 1;

  IF r IS NULL THEN
    RETURN jsonb_build_object('found',false,'error','TELEGRAM_CONTENT_NOT_FOUND');
  END IF;

  RETURN public.get_market_item_detail('channel', r.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_telegram_content_by_slug(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_pastelink_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT p.id INTO pid
  FROM public.pastelinks p
  WHERE lower(btrim(coalesce(p.slug,''))) = lower(btrim(coalesce(p_slug,'')))
    AND lower(coalesce(p.visibility,'public')) = 'public'
    AND (p.expires_at IS NULL OR p.expires_at > now())
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT 1;

  IF pid IS NULL THEN
    RETURN jsonb_build_object('found',false,'error','PASTELINK_NOT_FOUND');
  END IF;

  RETURN public.get_market_item_detail('pastelink',pid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pastelink_by_slug(text) TO anon, authenticated;

COMMIT;

-- ============================================================
-- CREATE FLOW FINAL HARDENING 2026-09-13
-- ============================================================
BEGIN;

-- Ensure browser clients can execute the public creation RPCs.
GRANT EXECUTE ON FUNCTION public.create_pastelink_content(text,text,text,text,numeric,text,text[],timestamptz) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_code_content(text,text,text,text,numeric,text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_telegram_content(text,text,text,text,numeric,text,text,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_approved_bots() TO anon,authenticated;

-- Keep public FREE content readable through the secure RPC even when RLS is enabled.
CREATE OR REPLACE FUNCTION public.get_pastelink_by_slug(p_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pid uuid;
BEGIN
  SELECT id INTO pid FROM public.pastelinks WHERE lower(btrim(slug))=lower(btrim(coalesce(p_slug,''))) LIMIT 1;
  IF pid IS NULL THEN RETURN jsonb_build_object('found',false); END IF;
  RETURN public.get_market_item_detail('pastelink',pid);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_pastelink_by_slug(text) TO anon,authenticated;

COMMIT;


-- ============================================================
-- FINAL ADMIN UX COMPATIBILITY LAYER — HUMAN IDENTIFIERS
-- Admin UI never needs to expose or type UUIDs. UUIDs remain internal
-- database keys for referential integrity and are resolved server-side.
-- Safe/idempotent: all functions use CREATE OR REPLACE.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_resolve_profile(p_identifier text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r uuid; v text:=lower(btrim(coalesce(p_identifier,'')));
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF v='' THEN RAISE EXCEPTION 'USER_IDENTIFIER_REQUIRED'; END IF;
 BEGIN r:=v::uuid; EXCEPTION WHEN invalid_text_representation THEN r:=NULL; END;
 IF r IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id=r) THEN RETURN r; END IF;
 SELECT id INTO r FROM public.profiles WHERE lower(username)=v OR lower(auth_email)=v LIMIT 1;
 IF r IS NULL THEN SELECT id INTO r FROM public.profiles WHERE lower(coalesce(display_name,''))=v LIMIT 1; END IF;
 IF r IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
 RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_by_identifier(p_identifier text,p_banned boolean,p_admin boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; uid uuid:=public.admin_resolve_profile(p_identifier);
BEGIN
 PERFORM public.admin_set_user(uid,p_banned,p_admin); SELECT to_jsonb(p) INTO r FROM public.profiles p WHERE p.id=uid; RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance_by_identifier(p_identifier text,p_amount numeric,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.admin_adjust_balance(public.admin_resolve_profile(p_identifier),p_amount,p_reason); END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_product(p_identifier text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r uuid; v text:=btrim(coalesce(p_identifier,''));
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF v='' THEN RAISE EXCEPTION 'PRODUCT_IDENTIFIER_REQUIRED'; END IF;
 BEGIN r:=v::uuid; EXCEPTION WHEN invalid_text_representation THEN r:=NULL; END;
 IF r IS NOT NULL AND EXISTS(SELECT 1 FROM public.products WHERE id=r) THEN RETURN r; END IF;
 SELECT id INTO r FROM public.products WHERE lower(slug)=lower(v) OR lower(title)=lower(v) ORDER BY created_at DESC LIMIT 1;
 IF r IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF; RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_product_by_identifier(p_identifier text,p_status text,p_price numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RETURN public.admin_update_product(public.admin_resolve_product(p_identifier),p_status,p_price); END $$;
CREATE OR REPLACE FUNCTION public.admin_delete_product_by_identifier(p_identifier text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.admin_delete_product(public.admin_resolve_product(p_identifier)); END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_order(p_identifier text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r uuid; v text:=btrim(coalesce(p_identifier,''));
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 BEGIN r:=v::uuid; EXCEPTION WHEN invalid_text_representation THEN r:=NULL; END;
 IF r IS NOT NULL AND EXISTS(SELECT 1 FROM public.orders WHERE id=r) THEN RETURN r; END IF;
 SELECT id INTO r FROM public.orders WHERE lower(coalesce(payment_reference,''))=lower(v) OR lower(coalesce(item_id,''))=lower(v) ORDER BY created_at DESC LIMIT 1;
 IF r IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF; RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.admin_mark_order_paid_by_identifier(p_identifier text,p_payment_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RETURN public.admin_mark_order_paid(public.admin_resolve_order(p_identifier),p_payment_reference); END $$;
CREATE OR REPLACE FUNCTION public.admin_cancel_order_by_identifier(p_identifier text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.admin_cancel_order(public.admin_resolve_order(p_identifier)); END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_withdrawal(p_identifier text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r uuid; v text:=btrim(coalesce(p_identifier,''));
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 BEGIN r:=v::uuid; EXCEPTION WHEN invalid_text_representation THEN r:=NULL; END;
 IF r IS NOT NULL AND EXISTS(SELECT 1 FROM public.withdrawals WHERE id=r) THEN RETURN r; END IF;
 SELECT w.id INTO r FROM public.withdrawals w LEFT JOIN public.profiles p ON p.id=w.user_id
 WHERE lower(coalesce(p.username,''))=lower(v) OR lower(coalesce(p.auth_email,''))=lower(v) OR lower(coalesce(w.account_number,''))=lower(v)
 ORDER BY w.created_at DESC LIMIT 1;
 IF r IS NULL THEN RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND'; END IF; RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal_by_identifier(p_identifier text,p_status text,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RETURN public.admin_process_withdrawal(public.admin_resolve_withdrawal(p_identifier),p_status,p_note); END $$;

CREATE OR REPLACE FUNCTION public.admin_set_bot_active_by_identifier(p_identifier text,p_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.approved_bots; v text:=btrim(coalesce(p_identifier,'')); bid bigint;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 BEGIN bid:=v::bigint; EXCEPTION WHEN invalid_text_representation THEN bid:=NULL; END;
 UPDATE public.approved_bots SET is_active=p_active,updated_at=now()
 WHERE (bid IS NOT NULL AND bot_id=bid) OR lower(bot_username)=lower(regexp_replace(v,'^@',''))
 RETURNING * INTO r;
 IF r.id IS NULL THEN RAISE EXCEPTION 'BOT_NOT_FOUND'; END IF; RETURN to_jsonb(r);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_profile(text),public.admin_set_user_by_identifier(text,boolean,boolean),public.admin_adjust_balance_by_identifier(text,numeric,text),public.admin_resolve_product(text),public.admin_update_product_by_identifier(text,text,numeric),public.admin_delete_product_by_identifier(text),public.admin_resolve_order(text),public.admin_mark_order_paid_by_identifier(text,text),public.admin_cancel_order_by_identifier(text),public.admin_resolve_withdrawal(text),public.admin_process_withdrawal_by_identifier(text,text,text),public.admin_set_bot_active_by_identifier(text,boolean) TO authenticated;

COMMIT;

-- ============================================================
-- ADMIN HUMAN IDENTIFIER EXTENSION 2026-09-14
-- Keep UUIDs internal; admin UI can operate by slug/title/name.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_resolve_paste(p_identifier text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r uuid; v text:=btrim(coalesce(p_identifier,''));
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF v='' THEN RAISE EXCEPTION 'PASTE_IDENTIFIER_REQUIRED'; END IF;
  BEGIN r:=v::uuid; EXCEPTION WHEN invalid_text_representation THEN r:=NULL; END;
  IF r IS NOT NULL AND EXISTS(SELECT 1 FROM public.pastes WHERE id=r) THEN RETURN r; END IF;
  SELECT id INTO r FROM public.pastes
  WHERE lower(slug)=lower(v) OR lower(title)=lower(v)
  ORDER BY created_at DESC LIMIT 1;
  IF r IS NULL THEN RAISE EXCEPTION 'PASTE_NOT_FOUND'; END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_paste_by_identifier(p_identifier text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.admin_delete_paste(public.admin_resolve_paste(p_identifier));
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_content(p_identifier text,p_source text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r uuid; v text:=btrim(coalesce(p_identifier,'')); src text:=lower(btrim(coalesce(p_source,'products')));
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF v='' THEN RAISE EXCEPTION 'CONTENT_IDENTIFIER_REQUIRED'; END IF;
  BEGIN r:=v::uuid; EXCEPTION WHEN invalid_text_representation THEN r:=NULL; END;
  IF src='products' THEN
    IF r IS NULL OR NOT EXISTS(SELECT 1 FROM public.products WHERE id=r) THEN
      SELECT id INTO r FROM public.products WHERE lower(slug)=lower(v) OR lower(title)=lower(v) ORDER BY created_at DESC LIMIT 1;
    END IF;
  ELSIF src='pastelinks' THEN
    IF r IS NULL OR NOT EXISTS(SELECT 1 FROM public.pastelinks WHERE id=r) THEN
      SELECT id INTO r FROM public.pastelinks WHERE lower(slug)=lower(v) OR lower(title)=lower(v) ORDER BY created_at DESC LIMIT 1;
    END IF;
  ELSIF src='telegram_products' THEN
    IF r IS NULL OR NOT EXISTS(SELECT 1 FROM public.telegram_products WHERE id=r) THEN
      SELECT id INTO r FROM public.telegram_products WHERE lower(slug)=lower(v) OR lower(title)=lower(v) ORDER BY created_at DESC LIMIT 1;
    END IF;
  ELSIF src='telegram_channels' THEN
    IF r IS NULL OR NOT EXISTS(SELECT 1 FROM public.telegram_channels WHERE id=r) THEN
      SELECT id INTO r FROM public.telegram_channels WHERE lower(slug)=lower(v) OR lower(name)=lower(v) ORDER BY created_at DESC LIMIT 1;
    END IF;
  ELSIF src='pastes' THEN
    IF r IS NULL OR NOT EXISTS(SELECT 1 FROM public.pastes WHERE id=r) THEN
      SELECT id INTO r FROM public.pastes WHERE lower(slug)=lower(v) OR lower(title)=lower(v) ORDER BY created_at DESC LIMIT 1;
    END IF;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_CONTENT_SOURCE';
  END IF;
  IF r IS NULL THEN RAISE EXCEPTION 'CONTENT_NOT_FOUND'; END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_content_by_identifier(
  p_identifier text,p_source text DEFAULT 'products',p_status text DEFAULT NULL,p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,p_slug text DEFAULT NULL,p_price numeric DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN public.admin_update_content(public.admin_resolve_content(p_identifier,p_source),p_status,p_title,p_description,p_source,p_slug,p_price);
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_content_by_identifier(p_identifier text,p_source text DEFAULT 'products')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.admin_delete_content(public.admin_resolve_content(p_identifier,p_source),p_source);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_paste(text),public.admin_delete_paste_by_identifier(text),public.admin_resolve_content(text,text),public.admin_update_content_by_identifier(text,text,text,text,text,text,numeric),public.admin_delete_content_by_identifier(text,text) TO authenticated;
COMMIT;


-- ============================================================
-- PasTele FINAL FIX PACK — consolidated into single canonical SQL
-- Safe to run as one script. No early references to marketplace_public.
-- ============================================================
BEGIN;

-- Canonical public marketplace view.
-- Does NOT expose protected content/content_html for paid items.


-- marketplace_public is granted after its canonical CREATE VIEW below.

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
CREATE OR REPLACE FUNCTION public.settle_cashi_order(
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
   VALUES(o.seller_id,'sale_earning',seller_share,v_balance_before,v_balance_before+seller_share,'cashi-order:'||o.id::text,'pending',v_available_at,v_settlement_code)
   ON CONFLICT DO NOTHING;
   INSERT INTO public.transactions(user_id,amount,fee,net_amount,type,status,reference,description)
   VALUES(o.seller_id,seller_share,platform_fee,seller_share,'sale_earning','pending','cashi-order:'||o.id::text,'Marketplace sale 70/30 - '||v_settlement_code)
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
GRANT EXECUTE ON FUNCTION public.settle_cashi_order(uuid,text,text,numeric,jsonb) TO service_role;

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

/* ================================================================
   FINAL CANONICAL COMPATIBILITY LAYER
   ================================================================ */

-- ============================================================
-- PasTele FINAL FIX PACK — 2026-09-14
-- Run AFTER database.sql. Idempotent.
-- ============================================================
BEGIN;

-- Canonical public marketplace view.
-- Does NOT expose protected content/content_html for paid items.
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

GRANT EXECUTE ON FUNCTION public.toggle_content_like_guest(uuid,text,text) TO anon,authenticated;

-- Profile visit notification. Only an authenticated visitor can create one,
-- and self-visits are ignored.

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
CREATE OR REPLACE FUNCTION public.settle_cashi_order(
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
   VALUES(o.seller_id,'sale_earning',seller_share,v_balance_before,v_balance_before+seller_share,'cashi-order:'||o.id::text,'pending',v_available_at,v_settlement_code)
   ON CONFLICT DO NOTHING;
   INSERT INTO public.transactions(user_id,amount,fee,net_amount,type,status,reference,description)
   VALUES(o.seller_id,seller_share,platform_fee,seller_share,'sale_earning','pending','cashi-order:'||o.id::text,'Marketplace sale 70/30 - '||v_settlement_code)
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
GRANT EXECUTE ON FUNCTION public.settle_cashi_order(uuid,text,text,numeric,jsonb) TO service_role;

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
COMMIT;

/* ============================================================
   PasTele FINAL FINANCE / WALLET / WITHDRAWAL OVERRIDE
   Version: 2026-09-15
   Timezone: Asia/Jakarta (WIB)

   BUSINESS RULES
   - Marketplace creator settlement: 70% creator / 30% platform
   - Creator earnings mature exactly H+2 (48 hours after payment)
   - Manual WD: Mon-Fri 09:00-17:00 WIB only; Sat/Sun closed
   - Manual minimum: Rp100,000
   - Manual daily count: Free 1x, Subscription 2x, Premium 5x
   - Manual fee: Free/Subscription Rp7,000; Premium Rp2,000
   - Instant daily amount: Free Rp100,000; Subscription Rp300,000; Premium Rp500,000
   - Instant fee: Free Rp15,000; Subscription Rp13,000; Premium Rp10,000
   - Instant is available 24/7
   - All limits/fees are enforced server-side.
   ============================================================ */

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_until timestamptz;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS balance numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS available_balance numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS pending_balance numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS available_at timestamptz;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS settlement_code text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS fee numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS net_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_access_token text;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_reference_uidx
  ON public.wallet_transactions(user_id, reference)
  WHERE reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS purchases_order_uidx
  ON public.purchases(order_id)
  WHERE order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  gross_amount numeric(18,2) NOT NULL CHECK (gross_amount >= 0),
  creator_amount numeric(18,2) NOT NULL CHECK (creator_amount >= 0),
  platform_amount numeric(18,2) NOT NULL CHECK (platform_amount >= 0),
  status text NOT NULL DEFAULT 'recognized',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_earnings_admin_read ON public.platform_earnings;
CREATE POLICY platform_earnings_admin_read ON public.platform_earnings
  FOR SELECT TO authenticated USING (public.is_current_user_admin());
GRANT SELECT ON public.platform_earnings TO authenticated;

/* ------------------------------------------------------------
   Withdrawal policy endpoint
   ------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.withdrawal_policy()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT jsonb_build_object(
    'timezone','Asia/Jakarta',
    'manual',jsonb_build_object(
      'open_time','09:00',
      'close_time','17:00',
      'days',jsonb_build_array(1,2,3,4,5),
      'minimum',100000,
      'fee_free',7000,
      'fee_subscription',7000,
      'fee_premium',2000,
      'daily_count_free',1,
      'daily_count_subscription',2,
      'daily_count_premium',5
    ),
    'instant',jsonb_build_object(
      'available_24_7',true,
      'daily_limit_free',100000,
      'daily_limit_subscription',300000,
      'daily_limit_premium',500000,
      'fee_free',15000,
      'fee_subscription',13000,
      'fee_premium',10000
    ),
    'settlement',jsonb_build_object(
      'creator_percent',70,
      'platform_percent',30,
      'hold_hours',48,
      'code','H2'
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.withdrawal_policy() TO anon,authenticated;

/* ------------------------------------------------------------
   Manual schedule: exact user rule, no holiday exception.
   Sat/Sun closed. Mon-Fri 09:00 inclusive through before 17:00.
   ------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.withdrawal_schedule_status(
  p_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  local_ts timestamp := timezone('Asia/Jakarta',coalesce(p_at,now()));
  d date := local_ts::date;
  dow integer := extract(isodow from local_ts)::integer;
  mins integer := extract(hour from local_ts)::integer*60 + extract(minute from local_ts)::integer;
  is_open boolean := dow BETWEEN 1 AND 5 AND mins >= 540 AND mins < 1020;
  reason text;
  next_open timestamp;
BEGIN
  IF is_open THEN
    reason := 'WD Manual buka Senin-Jumat 09:00-17:00 WIB.';
    next_open := local_ts;
  ELSIF dow IN (6,7) THEN
    reason := CASE WHEN dow=6 THEN 'WD Manual tutup hari Sabtu.' ELSE 'WD Manual tutup hari Minggu.' END;
  ELSIF mins < 540 THEN
    reason := 'WD Manual belum buka. Buka pukul 09:00 WIB.';
    next_open := d + time '09:00';
  ELSE
    reason := 'WD Manual sudah tutup. Buka kembali pada hari kerja berikutnya pukul 09:00 WIB.';
  END IF;

  IF NOT is_open AND next_open IS NULL THEN
    FOR i IN 1..7 LOOP
      IF extract(isodow from (d+i)::date)::integer BETWEEN 1 AND 5 THEN
        next_open := (d+i)::date + time '09:00';
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'open',is_open,
    'weekday',dow,
    'date',d,
    'time',to_char(local_ts,'HH24:MI'),
    'reason',reason,
    'open_time','09:00',
    'close_time','17:00',
    'timezone','Asia/Jakarta',
    'next_open',CASE WHEN next_open IS NULL THEN NULL ELSE to_char(next_open,'YYYY-MM-DD HH24:MI:SS') END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.withdrawal_schedule_status(timestamptz) TO anon,authenticated;

/* ------------------------------------------------------------
   User tier helper
   ------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.current_account_tier(p_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT CASE
    WHEN p.is_premium THEN 'premium'
    WHEN p.subscription_until IS NOT NULL AND p.subscription_until > now() THEN 'subscription'
    ELSE 'free'
  END
  FROM public.profiles p
  WHERE p.id=p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.current_account_tier(uuid) TO authenticated;

/* ------------------------------------------------------------
   Withdrawal stats for frontend.
   Counts pending/processing/approved/completed today so a request
   cannot bypass limits by creating several pending requests.
   Failed/cancelled/rejected requests do not consume a limit.
   ------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.get_withdrawal_limits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid := auth.uid();
  tier text;
  manual_count integer := 0;
  instant_amount numeric := 0;
  manual_max_count integer;
  instant_limit numeric;
  manual_fee numeric;
  instant_fee numeric;
  sched jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  tier := public.current_account_tier(uid);

  SELECT count(*)::integer INTO manual_count
  FROM public.withdrawals w
  WHERE w.user_id=uid
    AND lower(coalesce(w.mode,''))='manual'
    AND timezone('Asia/Jakarta',w.created_at)::date=timezone('Asia/Jakarta',now())::date
    AND lower(coalesce(w.status,'')) NOT IN ('rejected','cancelled','canceled','failed');

  SELECT coalesce(sum(w.amount),0) INTO instant_amount
  FROM public.withdrawals w
  WHERE w.user_id=uid
    AND lower(coalesce(w.mode,''))='instant'
    AND timezone('Asia/Jakarta',w.created_at)::date=timezone('Asia/Jakarta',now())::date
    AND lower(coalesce(w.status,'')) NOT IN ('rejected','cancelled','canceled','failed');

  IF tier='premium' THEN
    manual_max_count:=5; instant_limit:=500000; manual_fee:=2000; instant_fee:=10000;
  ELSIF tier='subscription' THEN
    manual_max_count:=2; instant_limit:=300000; manual_fee:=7000; instant_fee:=13000;
  ELSE
    manual_max_count:=1; instant_limit:=100000; manual_fee:=7000; instant_fee:=15000;
  END IF;

  sched := public.withdrawal_schedule_status(now());

  RETURN jsonb_build_object(
    'tier',tier,
    'manual',jsonb_build_object(
      'minimum',100000,
      'fee',manual_fee,
      'daily_max_count',manual_max_count,
      'used_count',manual_count,
      'remaining_count',greatest(0,manual_max_count-manual_count),
      'schedule',sched
    ),
    'instant',jsonb_build_object(
      'fee',instant_fee,
      'daily_limit',instant_limit,
      'used_amount',instant_amount,
      'remaining_amount',greatest(0,instant_limit-instant_amount)
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_limits() TO authenticated;

/* ------------------------------------------------------------
   H+2 settlement. Exactly 48 hours after verified payment.
   The old H1/H2 time-of-day split is deliberately removed.
   ------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.settle_cashi_order(
  p_order_id uuid,
  p_invoice_id text,
  p_gateway_status text,
  p_final_amount numeric,
  p_gateway_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  creator_amount numeric;
  platform_amount numeric;
  available_at timestamptz;
  before_balance numeric := 0;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  IF lower(coalesce(o.status,'')) IN ('paid','success','completed','settled') THEN
    RETURN true;
  END IF;

  IF lower(coalesce(p_gateway_status,'')) NOT IN ('paid','settled','success','completed') THEN
    RETURN false;
  END IF;

  IF round(coalesce(p_final_amount,0),0) <> round(coalesce(o.amount,0),0) THEN
    RAISE EXCEPTION 'AMOUNT_MISMATCH';
  END IF;

  UPDATE public.orders
  SET status='paid',
      paid_at=coalesce(paid_at,now()),
      payment_reference=coalesce(p_invoice_id,payment_reference),
      gateway_payload=coalesce(p_gateway_payload,'{}'::jsonb)
  WHERE id=o.id;

  IF o.item_type='account_plan' THEN
    IF o.item_id='premium' THEN
      UPDATE public.profiles SET is_premium=true,updated_at=now() WHERE id=o.buyer_id;
    ELSIF o.item_id IN ('subscription_1','subscription_3','subscription_7') THEN
      UPDATE public.profiles
      SET subscription_until=greatest(coalesce(subscription_until,now()),now())+
        CASE o.item_id
          WHEN 'subscription_1' THEN interval '1 day'
          WHEN 'subscription_3' THEN interval '3 days'
          WHEN 'subscription_7' THEN interval '7 days'
        END,
        updated_at=now()
      WHERE id=o.buyer_id;
    END IF;

    INSERT INTO public.purchases(buyer_id,product_id,order_id,item_type,item_id,item_title,amount,status)
    SELECT o.buyer_id,NULL,o.id,o.item_type,o.item_id,o.item_title,o.amount,'completed'
    WHERE NOT EXISTS(SELECT 1 FROM public.purchases WHERE order_id=o.id);
    RETURN true;
  END IF;

  creator_amount := round(coalesce(o.amount,0)*0.70,2);
  platform_amount := round(coalesce(o.amount,0)-creator_amount,2);
  available_at := coalesce(o.paid_at,now()) + interval '48 hours';

  IF NOT EXISTS(SELECT 1 FROM public.purchases WHERE order_id=o.id) THEN
    SELECT coalesce(w.balance,0) INTO before_balance
    FROM public.wallets w WHERE w.user_id=o.seller_id FOR UPDATE;

    INSERT INTO public.wallets(user_id,balance,available_balance,pending_balance)
    VALUES(o.seller_id,creator_amount,0,creator_amount)
    ON CONFLICT(user_id) DO UPDATE SET
      balance=public.wallets.balance+excluded.balance,
      pending_balance=public.wallets.pending_balance+excluded.pending_balance,
      updated_at=now();

    UPDATE public.profiles
    SET balance=balance+creator_amount,updated_at=now()
    WHERE id=o.seller_id;

    INSERT INTO public.wallet_transactions(
      user_id,type,amount,balance_before,balance_after,reference,status,available_at,settlement_code
    ) VALUES(
      o.seller_id,'sale_earning',creator_amount,before_balance,before_balance+creator_amount,
      'cashi-order:'||o.id::text,'pending',available_at,'H2'
    )
    ON CONFLICT(user_id,reference) DO NOTHING;

    INSERT INTO public.transactions(
      user_id,amount,fee,net_amount,type,status,reference,description
    ) VALUES(
      o.seller_id,creator_amount,0,creator_amount,'sale_earning','pending',
      'cashi-order:'||o.id::text,'Creator 70% — settlement H+2 (48 jam)'
    )
    ON CONFLICT(user_id,reference) DO NOTHING;

    INSERT INTO public.platform_earnings(order_id,gross_amount,creator_amount,platform_amount,status)
    VALUES(o.id,o.amount,creator_amount,platform_amount,'recognized')
    ON CONFLICT(order_id) DO NOTHING;

    INSERT INTO public.purchases(
      buyer_id,product_id,order_id,item_type,item_id,item_title,amount,status
    ) VALUES(
      o.buyer_id,o.product_id,o.id,o.item_type,o.item_id,o.item_title,o.amount,'completed'
    );

    IF o.product_id IS NOT NULL THEN
      INSERT INTO public.product_access(order_id,product_id,buyer_id,delivery_url)
      VALUES(o.id,o.product_id,o.buyer_id,NULL)
      ON CONFLICT(order_id,product_id) DO NOTHING;
    END IF;

    IF lower(coalesce(o.item_type,'')) IN ('product','code') THEN
      UPDATE public.products SET sales_count=sales_count+1,updated_at=now() WHERE id=o.product_id;
    ELSIF lower(coalesce(o.item_type,''))='telegram_product' THEN
      UPDATE public.telegram_products SET sales_count=sales_count+1,updated_at=now() WHERE id=o.product_id;
    ELSIF lower(coalesce(o.item_type,'')) IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
      UPDATE public.telegram_channels SET sales_count=sales_count+1,updated_at=now() WHERE id=o.product_id;
    END IF;

    BEGIN
      PERFORM public.notify_purchase_success(o.id);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END IF;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.settle_cashi_order(uuid,text,text,numeric,jsonb) TO service_role;

/* ------------------------------------------------------------
   Release matured H+2 creator earnings.
   ------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.release_matured_wallet()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();
  moved numeric:=0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;

  SELECT coalesce(sum(amount),0) INTO moved
  FROM public.wallet_transactions
  WHERE user_id=uid AND status='pending'
    AND available_at IS NOT NULL AND available_at<=now();

  UPDATE public.wallet_transactions
  SET status='completed'
  WHERE user_id=uid AND status='pending'
    AND available_at IS NOT NULL AND available_at<=now();

  IF moved>0 THEN
    UPDATE public.wallets
    SET pending_balance=greatest(0,pending_balance-moved),
        available_balance=available_balance+moved,
        updated_at=now()
    WHERE user_id=uid;

    UPDATE public.transactions t
    SET status='completed'
    WHERE t.user_id=uid AND t.type='sale_earning' AND t.status='pending'
      AND EXISTS(
        SELECT 1 FROM public.wallet_transactions wt
        WHERE wt.user_id=uid AND wt.reference=t.reference AND wt.status='completed'
      );
  END IF;

  RETURN jsonb_build_object('released',moved);
END;
$$;
GRANT EXECUTE ON FUNCTION public.release_matured_wallet() TO authenticated;

CREATE OR REPLACE FUNCTION public.release_all_matured_wallets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  r record;
  moved_total numeric:=0;
  moved_users integer:=0;
BEGIN
  FOR r IN
    SELECT user_id,coalesce(sum(amount),0) amount
    FROM public.wallet_transactions
    WHERE status='pending' AND available_at IS NOT NULL AND available_at<=now() AND user_id IS NOT NULL
    GROUP BY user_id
  LOOP
    UPDATE public.wallet_transactions
    SET status='completed'
    WHERE user_id=r.user_id AND status='pending' AND available_at<=now();

    UPDATE public.wallets
    SET pending_balance=greatest(0,pending_balance-r.amount),
        available_balance=available_balance+r.amount,
        updated_at=now()
    WHERE user_id=r.user_id;

    UPDATE public.transactions t
    SET status='completed'
    WHERE t.user_id=r.user_id AND t.type='sale_earning' AND t.status='pending'
      AND EXISTS(
        SELECT 1 FROM public.wallet_transactions wt
        WHERE wt.user_id=r.user_id AND wt.reference=t.reference AND wt.status='completed'
      );

    moved_total:=moved_total+r.amount;
    moved_users:=moved_users+1;
  END LOOP;

  RETURN jsonb_build_object('released',moved_total,'users',moved_users);
END;
$$;
GRANT EXECUTE ON FUNCTION public.release_all_matured_wallets() TO service_role;

/* ------------------------------------------------------------
   Withdrawal request — all fees/limits/times server-side.
   amount = gross withdrawal amount entered by user.
   net_amount = amount - fee.
   total wallet debit = amount (fee is included in the gross amount).
   ------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.request_withdrawal_v2(
  p_amount numeric,
  p_mode text,
  p_method text,
  p_account_name text,
  p_account_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();
  tier text;
  mode_normalized text:=lower(btrim(coalesce(p_mode,'')));
  amount numeric:=round(coalesce(p_amount,0),2);
  fee numeric:=0;
  net_amount numeric:=0;
  available numeric:=0;
  manual_count integer:=0;
  instant_used numeric:=0;
  manual_max_count integer;
  instant_limit numeric;
  sched jsonb;
  wid uuid;
  before_balance numeric:=0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF amount<=0 THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_AMOUNT'; END IF;
  IF length(btrim(coalesce(p_account_name,'')))<2 THEN RAISE EXCEPTION 'ACCOUNT_NAME_REQUIRED'; END IF;
  IF length(btrim(coalesce(p_account_number,'')))<5 THEN RAISE EXCEPTION 'ACCOUNT_NUMBER_REQUIRED'; END IF;

  tier:=public.current_account_tier(uid);

  IF tier='premium' THEN
    manual_max_count:=5; instant_limit:=500000; fee:=CASE WHEN mode_normalized='manual' THEN 2000 ELSE 10000 END;
  ELSIF tier='subscription' THEN
    manual_max_count:=2; instant_limit:=300000; fee:=CASE WHEN mode_normalized='manual' THEN 7000 ELSE 13000 END;
  ELSE
    manual_max_count:=1; instant_limit:=100000; fee:=CASE WHEN mode_normalized='manual' THEN 7000 ELSE 15000 END;
  END IF;

  IF mode_normalized='manual' THEN
    sched:=public.withdrawal_schedule_status(now());
    IF coalesce((sched->>'open')::boolean,false)=false THEN
      RAISE EXCEPTION 'WITHDRAWAL_CLOSED:%',coalesce(sched->>'reason','WD Manual sedang ditutup.');
    END IF;
    IF amount<100000 THEN RAISE EXCEPTION 'MINIMUM_MANUAL_WITHDRAWAL_100000'; END IF;

    SELECT count(*)::integer INTO manual_count
    FROM public.withdrawals w
    WHERE w.user_id=uid AND lower(coalesce(w.mode,''))='manual'
      AND timezone('Asia/Jakarta',w.created_at)::date=timezone('Asia/Jakarta',now())::date
      AND lower(coalesce(w.status,'')) NOT IN ('rejected','cancelled','canceled','failed');

    IF manual_count>=manual_max_count THEN
      RAISE EXCEPTION 'MANUAL_DAILY_COUNT_LIMIT';
    END IF;

  ELSIF mode_normalized='instant' THEN
    SELECT coalesce(sum(w.amount),0) INTO instant_used
    FROM public.withdrawals w
    WHERE w.user_id=uid AND lower(coalesce(w.mode,''))='instant'
      AND timezone('Asia/Jakarta',w.created_at)::date=timezone('Asia/Jakarta',now())::date
      AND lower(coalesce(w.status,'')) NOT IN ('rejected','cancelled','canceled','failed');

    IF instant_used+amount>instant_limit THEN
      RAISE EXCEPTION 'INSTANT_DAILY_LIMIT:%',greatest(0,instant_limit-instant_used);
    END IF;
  ELSE
    RAISE EXCEPTION 'INVALID_WITHDRAWAL_MODE';
  END IF;

  /* User receives amount minus fee; wallet loses exactly amount entered. */
  net_amount:=greatest(0,amount-fee);

  SELECT coalesce(w.balance,0),coalesce(w.available_balance,0)
  INTO before_balance,available
  FROM public.wallets w WHERE w.user_id=uid FOR UPDATE;

  IF coalesce(available,0)<amount THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  UPDATE public.wallets
  SET available_balance=available_balance-amount,
      balance=balance-amount,
      updated_at=now()
  WHERE user_id=uid;

  UPDATE public.profiles
  SET balance=greatest(0,balance-amount),updated_at=now()
  WHERE id=uid;

  INSERT INTO public.withdrawals(
    user_id,amount,fee,net_amount,mode,method,account_name,account_number,status
  ) VALUES(
    uid,amount,fee,net_amount,mode_normalized,btrim(p_method),btrim(p_account_name),btrim(p_account_number),'pending'
  ) RETURNING id INTO wid;

  INSERT INTO public.wallet_transactions(
    user_id,type,amount,balance_before,balance_after,reference,status,available_at,settlement_code
  ) VALUES(
    uid,'withdrawal',-amount,before_balance,before_balance-amount,'withdrawal:'||wid::text,'completed',now(),'WD'
  ) ON CONFLICT(user_id,reference) DO NOTHING;

  INSERT INTO public.transactions(
    user_id,amount,fee,net_amount,type,status,reference,description
  ) VALUES(
    uid,-amount,fee,net_amount,'withdrawal','pending','withdrawal:'||wid::text,
    CASE WHEN mode_normalized='instant' THEN 'WD Instant' ELSE 'WD Manual' END
  ) ON CONFLICT(user_id,reference) DO NOTHING;

  RETURN jsonb_build_object(
    'id',wid,
    'status','pending',
    'tier',tier,
    'amount',amount,
    'fee',fee,
    'net_amount',net_amount,
    'mode',mode_normalized,
    'manual_daily_max_count',manual_max_count,
    'instant_daily_limit',instant_limit
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal_v2(numeric,text,text,text,text) TO authenticated;

COMMIT;


-- ============================================================
-- PasTele SOCIAL + QUEST + COMMUNITY CHAT FINAL PATCH
-- Version: 2026-09-16
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- Social counters / follows
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_creator_followers_creator ON public.creator_followers(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_followers_follower ON public.creator_followers(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_likes_target ON public.content_likes(target_id, target_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_comments_target ON public.content_comments(target_id, target_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_target_event ON public.analytics_events(target_id, target_type, event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.toggle_creator_follow(p_creator_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); exists_follow boolean; follower_count bigint;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF p_creator_id IS NULL OR p_creator_id=uid THEN RAISE EXCEPTION 'INVALID_FOLLOW_TARGET'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_creator_id AND is_banned=false) THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.creator_followers WHERE creator_id=p_creator_id AND follower_id=uid) INTO exists_follow;
  IF exists_follow THEN
    DELETE FROM public.creator_followers WHERE creator_id=p_creator_id AND follower_id=uid;
  ELSE
    INSERT INTO public.creator_followers(creator_id,follower_id) VALUES(p_creator_id,uid) ON CONFLICT DO NOTHING;
  END IF;
  SELECT count(*) INTO follower_count FROM public.creator_followers WHERE creator_id=p_creator_id;
  RETURN jsonb_build_object('following',NOT exists_follow,'followers',follower_count);
END $$;
GRANT EXECUTE ON FUNCTION public.toggle_creator_follow(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_social_stats(p_profile_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'followers',(SELECT count(*) FROM public.creator_followers WHERE creator_id=p_profile_id),
    'following',(SELECT count(*) FROM public.creator_followers WHERE follower_id=p_profile_id),
    'likes',(SELECT count(*) FROM public.content_likes WHERE content_owner_id=p_profile_id),
    'content',(SELECT count(*) FROM public.marketplace_public WHERE owner_id=p_profile_id)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_social_stats(uuid) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_follow_state(p_creator_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.creator_followers WHERE creator_id=p_creator_id AND follower_id=auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.get_follow_state(uuid) TO authenticated;

-- ------------------------------------------------------------
-- Quest system: social actions become durable progress records.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_type text NOT NULL,
  target_count integer NOT NULL DEFAULT 1 CHECK(target_count>0),
  reward numeric(18,2) NOT NULL DEFAULT 0 CHECK(reward>=0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0 CHECK(progress>=0),
  completed_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quest_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON public.quest_progress(user_id,updated_at DESC);

INSERT INTO public.quests(code,title,description,event_type,target_count,reward)
VALUES
 ('like_content','Like Content','Berikan like pada konten.','like',5,0),
 ('comment_content','Comment Content','Tulis komentar pada konten.','comment',3,0),
 ('share_content','Share Content','Bagikan konten PasTele.','share',3,0),
 ('follow_creator','Follow Creator','Ikuti creator di PasTele.','follow',2,0),
 ('visit_content','Explore Content','Buka konten marketplace.','view',10,0)
ON CONFLICT(code) DO UPDATE SET title=excluded.title,description=excluded.description,event_type=excluded.event_type,target_count=excluded.target_count;

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quests_public_read ON public.quests;
CREATE POLICY quests_public_read ON public.quests FOR SELECT TO anon,authenticated USING(is_active=true OR public.is_current_user_admin());
DROP POLICY IF EXISTS quests_admin_write ON public.quests;
CREATE POLICY quests_admin_write ON public.quests FOR ALL TO authenticated USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());
DROP POLICY IF EXISTS quest_progress_owner_read ON public.quest_progress;
CREATE POLICY quest_progress_owner_read ON public.quest_progress FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.record_quest_event(p_event_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); q record; p record; new_progress integer;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','LOGIN_REQUIRED'); END IF;
  FOR q IN SELECT * FROM public.quests WHERE is_active=true AND event_type=lower(btrim(p_event_type)) LOOP
    INSERT INTO public.quest_progress(quest_id,user_id,progress)
    VALUES(q.id,uid,0) ON CONFLICT(quest_id,user_id) DO NOTHING;
    SELECT * INTO p FROM public.quest_progress WHERE quest_id=q.id AND user_id=uid FOR UPDATE;
    IF p.completed_at IS NULL THEN
      new_progress:=LEAST(q.target_count,p.progress+1);
      UPDATE public.quest_progress SET progress=new_progress,completed_at=CASE WHEN new_progress>=q.target_count THEN coalesce(completed_at,now()) ELSE completed_at END,updated_at=now() WHERE id=p.id;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok',true);
END $$;
GRANT EXECUTE ON FUNCTION public.record_quest_event(text) TO authenticated;

-- ------------------------------------------------------------
-- Telegram-like public community group chat
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  avatar_url text,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','moderator','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  UNIQUE(group_id,user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 4000),
  reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  pinned_at timestamptz,
  pinned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT '👍',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id,user_id,reaction)
);

CREATE TABLE IF NOT EXISTS public.chat_message_reads (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(message_id,user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_presence (
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(group_id,user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created ON public.chat_messages(group_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_group ON public.chat_members(group_id,joined_at);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON public.chat_reactions(message_id,created_at);

INSERT INTO public.chat_groups(name,slug,description,is_public)
VALUES('PasTele Community','pastele-community','Forum & group chat resmi komunitas PasTele.',true)
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,description=excluded.description,is_public=excluded.is_public;

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_groups_public_read ON public.chat_groups;
CREATE POLICY chat_groups_public_read ON public.chat_groups FOR SELECT TO anon,authenticated USING(is_public=true OR created_by=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS chat_members_read ON public.chat_members;
CREATE POLICY chat_members_read ON public.chat_members FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS chat_members_join ON public.chat_members;
CREATE POLICY chat_members_join ON public.chat_members FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS chat_members_leave ON public.chat_members;
CREATE POLICY chat_members_leave ON public.chat_members FOR DELETE TO authenticated USING(user_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS chat_messages_public_read ON public.chat_messages;
CREATE POLICY chat_messages_public_read ON public.chat_messages FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.chat_groups g WHERE g.id=group_id AND g.is_public=true) OR EXISTS(SELECT 1 FROM public.chat_members m WHERE m.group_id=group_id AND m.user_id=auth.uid()) OR public.is_current_user_admin());
DROP POLICY IF EXISTS chat_messages_owner_update ON public.chat_messages;
CREATE POLICY chat_messages_owner_update ON public.chat_messages FOR UPDATE TO authenticated USING(user_id=auth.uid() OR public.is_current_user_admin()) WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS chat_reactions_read ON public.chat_reactions;
CREATE POLICY chat_reactions_read ON public.chat_reactions FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS chat_reactions_write ON public.chat_reactions;
CREATE POLICY chat_reactions_write ON public.chat_reactions FOR ALL TO authenticated USING(user_id=auth.uid() OR public.is_current_user_admin()) WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS chat_reads_owner ON public.chat_message_reads;
CREATE POLICY chat_reads_owner ON public.chat_message_reads FOR ALL TO authenticated USING(user_id=auth.uid() OR public.is_current_user_admin()) WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS chat_presence_read ON public.chat_presence;
CREATE POLICY chat_presence_read ON public.chat_presence FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS chat_presence_write ON public.chat_presence;
CREATE POLICY chat_presence_write ON public.chat_presence FOR ALL TO authenticated USING(user_id=auth.uid() OR public.is_current_user_admin()) WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.join_public_chat(p_group_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); g public.chat_groups%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  SELECT * INTO g FROM public.chat_groups WHERE id=p_group_id AND is_public=true;
  IF g.id IS NULL THEN RAISE EXCEPTION 'CHAT_NOT_FOUND'; END IF;
  INSERT INTO public.chat_members(group_id,user_id) VALUES(p_group_id,uid) ON CONFLICT(group_id,user_id) DO NOTHING;
  RETURN jsonb_build_object('ok',true,'group_id',p_group_id);
END $$;
GRANT EXECUTE ON FUNCTION public.join_public_chat(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.send_chat_message(p_group_id uuid,p_body text,p_reply_to uuid DEFAULT NULL)
RETURNS public.chat_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); r public.chat_messages;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF length(btrim(coalesce(p_body,'')))<1 OR length(p_body)>4000 THEN RAISE EXCEPTION 'INVALID_MESSAGE'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.chat_groups WHERE id=p_group_id AND is_public=true) AND NOT EXISTS(SELECT 1 FROM public.chat_members WHERE group_id=p_group_id AND user_id=uid) THEN RAISE EXCEPTION 'NOT_A_MEMBER'; END IF;
  INSERT INTO public.chat_members(group_id,user_id) VALUES(p_group_id,uid) ON CONFLICT DO NOTHING;
  INSERT INTO public.chat_messages(group_id,user_id,body,reply_to_id) VALUES(p_group_id,uid,btrim(p_body),p_reply_to) RETURNING * INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.send_chat_message(uuid,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_chat_reaction(p_message_id uuid,p_reaction text DEFAULT '👍')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); exists_reaction boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.chat_reactions WHERE message_id=p_message_id AND user_id=uid AND reaction=p_reaction) INTO exists_reaction;
  IF exists_reaction THEN DELETE FROM public.chat_reactions WHERE message_id=p_message_id AND user_id=uid AND reaction=p_reaction;
  ELSE INSERT INTO public.chat_reactions(message_id,user_id,reaction) VALUES(p_message_id,uid,p_reaction) ON CONFLICT DO NOTHING; END IF;
  RETURN jsonb_build_object('active',NOT exists_reaction);
END $$;
GRANT EXECUTE ON FUNCTION public.toggle_chat_reaction(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_chat_read(p_group_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO public.chat_members(group_id,user_id,last_read_at) VALUES(p_group_id,auth.uid(),now())
  ON CONFLICT(group_id,user_id) DO UPDATE SET last_read_at=now();
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.mark_chat_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_chat_presence(p_group_id uuid,p_online boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO public.chat_presence(group_id,user_id,is_online,last_seen_at) VALUES(p_group_id,auth.uid(),coalesce(p_online,false),now())
  ON CONFLICT(group_id,user_id) DO UPDATE SET is_online=excluded.is_online,last_seen_at=now();
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.set_chat_presence(uuid,boolean) TO authenticated;

GRANT SELECT ON public.chat_groups,public.chat_messages,public.chat_reactions,public.chat_presence TO anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.chat_members TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.chat_message_reads TO authenticated;

DO $$ BEGIN
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages'; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions'; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_presence'; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

COMMIT;


-- ============================================================
-- ADMIN PLATFORM CONTROLS — FORUM CHAT + WITHDRAWAL MODES
-- ============================================================
-- Settings are stored in site_settings.settings so no extra table is required.
-- Only admins can change these values. Public clients read them through
-- get_public_site_settings(). Withdrawal RPCs enforce the switches server-side.

UPDATE public.site_settings
SET settings = jsonb_set(
  jsonb_set(
    jsonb_set(
      coalesce(settings,'{}'::jsonb),
      '{forum_chat}',
      coalesce(settings->'forum_chat','{"enabled":true,"reason":""}'::jsonb),
      true
    ),
    '{withdrawal_instant}',
    coalesce(settings->'withdrawal_instant','{"enabled":true,"reason":""}'::jsonb),
    true
  ),
  '{withdrawal_manual}',
  coalesce(settings->'withdrawal_manual','{"enabled":true,"reason":""}'::jsonb),
  true
),
updated_at=now()
WHERE id=1;

CREATE OR REPLACE FUNCTION public.admin_set_platform_control(
  p_section text,
  p_enabled boolean,
  p_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  section_name text := lower(btrim(coalesce(p_section,'')));
  clean_reason text := left(btrim(coalesce(p_reason,'')),500);
  current_settings jsonb;
  new_settings jsonb;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  IF section_name NOT IN ('forum_chat','withdrawal_instant','withdrawal_manual') THEN
    RAISE EXCEPTION 'INVALID_CONTROL_SECTION';
  END IF;

  SELECT coalesce(settings,'{}'::jsonb)
    INTO current_settings
  FROM public.site_settings
  WHERE id=1
  FOR UPDATE;

  new_settings := jsonb_set(
    current_settings,
    ARRAY[section_name],
    jsonb_build_object(
      'enabled',coalesce(p_enabled,false),
      'reason',CASE WHEN coalesce(p_enabled,false) THEN '' ELSE clean_reason END,
      'updated_at',now()
    ),
    true
  );

  UPDATE public.site_settings
  SET settings=new_settings,updated_at=now()
  WHERE id=1;

  IF section_name='forum_chat' THEN
    UPDATE public.chat_groups
    SET is_public=coalesce(p_enabled,false),updated_at=now()
    WHERE slug='pastele-community';
  END IF;

  RETURN jsonb_build_object(
    'section',section_name,
    'enabled',coalesce(p_enabled,false),
    'reason',CASE WHEN coalesce(p_enabled,false) THEN '' ELSE clean_reason END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_platform_control(text,boolean,text) TO authenticated;

-- Final withdrawal security gate with admin-controlled instant/manual switches.
CREATE OR REPLACE FUNCTION public.request_withdrawal_v2(
 p_amount numeric,p_mode text,p_method text,p_account_name text,p_account_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
 uid uuid:=auth.uid();
 wid uuid;
 available numeric:=0;
 fee numeric:=0;
 net_amount numeric:=0;
 total_debit numeric:=0;
 mode_normalized text:=lower(btrim(coalesce(p_mode,'')));
 sched jsonb;
 settings jsonb;
 mode_cfg jsonb;
 mode_enabled boolean;
 mode_reason text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 IF p_amount IS NULL OR p_amount<=0 THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_AMOUNT'; END IF;

 SELECT coalesce(s.settings,'{}'::jsonb) INTO settings
 FROM public.site_settings s WHERE s.id=1;

 IF mode_normalized='manual' THEN
   mode_cfg:=coalesce(settings->'withdrawal_manual','{"enabled":true,"reason":""}'::jsonb);
   mode_enabled:=coalesce((mode_cfg->>'enabled')::boolean,true);
   mode_reason:=coalesce(mode_cfg->>'reason','WD Manual sedang ditutup');
   IF NOT mode_enabled THEN
     RAISE EXCEPTION 'WITHDRAWAL_CLOSED:%',mode_reason;
   END IF;

   sched:=public.withdrawal_schedule_status(now());
   IF coalesce((sched->>'open')::boolean,false)=false THEN
     RAISE EXCEPTION 'WITHDRAWAL_CLOSED:%',coalesce(sched->>'reason','WD Manual sedang ditutup');
   END IF;
   IF p_amount<10000 THEN RAISE EXCEPTION 'MINIMUM_MANUAL_WITHDRAWAL_10000'; END IF;
   fee:=0;

 ELSIF mode_normalized='instant' THEN
   mode_cfg:=coalesce(settings->'withdrawal_instant','{"enabled":true,"reason":""}'::jsonb);
   mode_enabled:=coalesce((mode_cfg->>'enabled')::boolean,true);
   mode_reason:=coalesce(mode_cfg->>'reason','WD Instan sedang ditutup');
   IF NOT mode_enabled THEN
     RAISE EXCEPTION 'WITHDRAWAL_CLOSED:%',mode_reason;
   END IF;

   IF p_amount<50000 THEN RAISE EXCEPTION 'MINIMUM_INSTANT_WITHDRAWAL_50000'; END IF;
   IF p_amount>250000 THEN RAISE EXCEPTION 'MAXIMUM_INSTANT_WITHDRAWAL_250000'; END IF;
   fee:=0;

 ELSE
   RAISE EXCEPTION 'INVALID_WITHDRAWAL_MODE';
 END IF;

 net_amount:=greatest(0,p_amount-fee);
 total_debit:=p_amount+fee;

 SELECT available_balance INTO available
 FROM public.wallets WHERE user_id=uid FOR UPDATE;

 IF coalesce(available,0)<total_debit THEN
   RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
 END IF;

 UPDATE public.wallets
 SET available_balance=available_balance-total_debit,
     balance=balance-total_debit,
     updated_at=now()
 WHERE user_id=uid;

 UPDATE public.profiles
 SET balance=greatest(0,balance-total_debit),updated_at=now()
 WHERE id=uid;

 INSERT INTO public.withdrawals(
   user_id,amount,fee,net_amount,mode,method,account_name,account_number,status
 ) VALUES(
   uid,p_amount,fee,net_amount,mode_normalized,
   btrim(coalesce(p_method,'')),btrim(coalesce(p_account_name,'')),
   btrim(coalesce(p_account_number,'')),'pending'
 ) RETURNING id INTO wid;

 INSERT INTO public.transactions(
   user_id,amount,fee,net_amount,type,status,reference,description
 ) VALUES(
   uid,fee,fee,fee,'withdrawal_fee','completed',
   'withdrawal-fee:'||wid::text,
   CASE WHEN mode_normalized='instant' THEN 'WD Instant fee Rp15.000'
        ELSE 'WD Manual fee Rp7.000' END
 );

 RETURN jsonb_build_object(
   'id',wid,'status','pending','amount',p_amount,'fee',fee,
   'net_amount',net_amount,'total_debit',total_debit,'mode',mode_normalized
 );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_withdrawal_v2(numeric,text,text,text,text) TO authenticated;



-- Closed forum is a hard server-side lock: existing members cannot bypass it.
CREATE OR REPLACE FUNCTION public.send_chat_message(
 p_group_id uuid,p_body text,p_reply_to uuid DEFAULT NULL
)
RETURNS public.chat_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE uid uuid:=auth.uid(); r public.chat_messages;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 IF length(btrim(coalesce(p_body,'')))<1 OR length(p_body)>4000 THEN RAISE EXCEPTION 'INVALID_MESSAGE'; END IF;

 IF NOT EXISTS(
   SELECT 1 FROM public.chat_groups
   WHERE id=p_group_id AND is_public=true
 ) AND NOT public.is_current_user_admin() THEN
   RAISE EXCEPTION 'CHAT_CLOSED';
 END IF;

 INSERT INTO public.chat_members(group_id,user_id)
 VALUES(p_group_id,uid) ON CONFLICT DO NOTHING;

 INSERT INTO public.chat_messages(group_id,user_id,body,reply_to_id)
 VALUES(p_group_id,uid,btrim(p_body),p_reply_to)
 RETURNING * INTO r;
 RETURN r;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_chat_message(uuid,text,uuid) TO authenticated;


/* ============================================================
   PasTele / TeleCod — ACCESS PLAN + WITHDRAWAL FEE FINAL PATCH
   2026-09-17
   ------------------------------------------------------------
   Plans:
   FREE:
     - Paid Code: must purchase individually
     - Paid PasteLink: must purchase individually
     - Paid Channel/Group: must purchase individually

   SUBSCRIPTION 1 DAY — Rp15.000:
     - Paid Code: 2 unique opens / active day
     - Paid PasteLink: 3 unique opens / active day
     - Active: 24 hours

   SUBSCRIPTION 3 DAYS — Rp30.000:
     - Paid Code: 3 unique opens / day
     - Paid PasteLink: 5 unique opens / day
     - Active: 3 days

   SUBSCRIPTION 7 DAYS — Rp50.000:
     - Paid Code: 5 unique opens / day
     - Paid PasteLink: 7 unique opens / day
     - Active: 7 days

   SUBSCRIPTION 1 MONTH — Rp150.000:
     - Paid Code: 10 unique opens / day
     - Paid PasteLink: 20 unique opens / day
     - Active: 30 days
     - QRIS/Cashi handled by checkout layer

   PREMIUM FULL ACCESS — Rp250.000:
     - Paid Code: unlimited
     - Paid PasteLink: unlimited
     - Paid Channel/Group: included
     - No per-item purchase required
     - Full access

   Withdrawal:
     - Free: fee Rp15.000
     - Subscription: fee Rp13.000
     - Premium: fee Rp10.000
     - Manual minimum Rp100.000
     - Instant minimum Rp50.000, maximum Rp250.000
     - Admin notification is inserted on every successful request.
   ============================================================ */

BEGIN;

-- ------------------------------------------------------------
-- 1. Subscription plan metadata
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (
    subscription_plan IS NULL OR
    subscription_plan IN (
      'subscription_1',
      'subscription_3',
      'subscription_7',
      'subscription_30'
    )
  );

CREATE TABLE IF NOT EXISTS public.account_plan_catalog (
  plan_code text PRIMARY KEY,
  plan_name text NOT NULL,
  price numeric(18,2) NOT NULL CHECK(price >= 0),
  duration_days integer NOT NULL CHECK(duration_days > 0),
  paid_code_daily_limit integer,
  paid_pastelink_daily_limit integer,
  full_access boolean NOT NULL DEFAULT false,
  payment_provider text NOT NULL DEFAULT 'cashi',
  payment_method text NOT NULL DEFAULT 'qris',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.account_plan_catalog(
  plan_code,plan_name,price,duration_days,
  paid_code_daily_limit,paid_pastelink_daily_limit,
  full_access,payment_provider,payment_method,is_active
) VALUES
('subscription_1','Langganan 1 Hari',15000,1,2,3,false,'cashi','qris',true),
('subscription_3','Langganan 3 Hari',30000,3,3,5,false,'cashi','qris',true),
('subscription_7','Langganan 7 Hari',50000,7,5,7,false,'cashi','qris',true),
('subscription_30','Langganan 1 Bulan',150000,30,10,20,false,'cashi','qris',true),
('premium','Premium Full Access',250000,36500,NULL,NULL,true,'cashi','qris',true)
ON CONFLICT(plan_code) DO UPDATE SET
  plan_name=excluded.plan_name,
  price=excluded.price,
  duration_days=excluded.duration_days,
  paid_code_daily_limit=excluded.paid_code_daily_limit,
  paid_pastelink_daily_limit=excluded.paid_pastelink_daily_limit,
  full_access=excluded.full_access,
  payment_provider=excluded.payment_provider,
  payment_method=excluded.payment_method,
  is_active=excluded.is_active,
  updated_at=now();

-- Backfill active subscription plan from the most recent paid plan order.
UPDATE public.profiles p
SET subscription_plan = q.item_id
FROM (
  SELECT DISTINCT ON (o.buyer_id)
    o.buyer_id,
    o.item_id
  FROM public.orders o
  WHERE o.item_type='account_plan'
    AND o.item_id IN ('subscription_1','subscription_3','subscription_7','subscription_30')
    AND lower(coalesce(o.status,'')) IN ('paid','success','completed','settled')
  ORDER BY o.buyer_id,o.paid_at DESC NULLS LAST,o.created_at DESC
) q
WHERE p.id=q.buyer_id
  AND p.subscription_until IS NOT NULL
  AND p.subscription_until>now()
  AND p.subscription_plan IS DISTINCT FROM q.item_id;

-- ------------------------------------------------------------
-- 2. Daily paid-content usage
--    One unique content target counts once per Asia/Jakarta day.
--    Reopening the same target on the same day does not consume
--    another quota unit.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paid_access_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,usage_date,target_type,target_id)
);

CREATE INDEX IF NOT EXISTS idx_paid_access_usage_user_date
ON public.paid_access_usage(user_id,usage_date,target_type);

ALTER TABLE public.account_plan_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS account_plan_catalog_public_read ON public.account_plan_catalog;
CREATE POLICY account_plan_catalog_public_read
ON public.account_plan_catalog
FOR SELECT TO anon,authenticated
USING(is_active=true);

GRANT SELECT ON public.account_plan_catalog TO anon,authenticated;

-- ------------------------------------------------------------
-- 3. Current plan helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_subscription_plan(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT CASE
    WHEN p.is_premium=true THEN 'premium'
    WHEN p.subscription_until IS NULL OR p.subscription_until<=now() THEN NULL
    WHEN p.subscription_plan IN ('subscription_1','subscription_3','subscription_7','subscription_30')
      THEN p.subscription_plan
    ELSE COALESCE((
      SELECT o.item_id
      FROM public.orders o
      WHERE o.buyer_id=p.id
        AND o.item_type='account_plan'
        AND o.item_id IN ('subscription_1','subscription_3','subscription_7','subscription_30')
        AND lower(coalesce(o.status,'')) IN ('paid','success','completed','settled')
      ORDER BY o.paid_at DESC NULLS LAST,o.created_at DESC
      LIMIT 1
    ),'subscription_1')
  END
  FROM public.profiles p
  WHERE p.id=p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.current_subscription_plan(uuid) TO authenticated;

-- Keep current_account_tier compatible with the new plan.
CREATE OR REPLACE FUNCTION public.current_account_tier(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT CASE
    WHEN p.is_premium=true THEN 'premium'
    WHEN p.subscription_until IS NOT NULL AND p.subscription_until>now() THEN 'subscription'
    ELSE 'free'
  END
  FROM public.profiles p
  WHERE p.id=p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.current_account_tier(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 4. Plan access rules
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.paid_access_policy(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  plan text;
  tier text;
  code_limit integer;
  paste_limit integer;
BEGIN
  tier:=public.current_account_tier(p_user_id);
  plan:=public.current_subscription_plan(p_user_id);

  IF tier='premium' THEN
    RETURN jsonb_build_object(
      'tier','premium',
      'plan','premium',
      'full_access',true,
      'paid_code_daily_limit',NULL,
      'paid_pastelink_daily_limit',NULL,
      'paid_channel_group_access',true
    );
  END IF;

  IF tier='subscription' THEN
    SELECT paid_code_daily_limit,paid_pastelink_daily_limit
    INTO code_limit,paste_limit
    FROM public.account_plan_catalog
    WHERE plan_code=plan;

    RETURN jsonb_build_object(
      'tier','subscription',
      'plan',COALESCE(plan,'subscription_1'),
      'full_access',false,
      'paid_code_daily_limit',COALESCE(code_limit,2),
      'paid_pastelink_daily_limit',COALESCE(paste_limit,3),
      'paid_channel_group_access',false
    );
  END IF;

  RETURN jsonb_build_object(
    'tier','free',
    'plan','free',
    'full_access',false,
    'paid_code_daily_limit',0,
    'paid_pastelink_daily_limit',0,
    'paid_channel_group_access',false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.paid_access_policy(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 5. Consume/check subscription paid-content quota.
--    Returns true when the target is accessible.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_paid_access(
  p_target_type text,
  p_target_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();
  normalized text:=lower(btrim(coalesce(p_target_type,'')));
  tier text;
  plan text;
  daily_limit integer:=0;
  usage_count integer:=0;
  usage_date date:=timezone('Asia/Jakarta',now())::date;
  already_used boolean:=false;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'reason','LOGIN_REQUIRED');
  END IF;

  IF p_target_id IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'reason','INVALID_TARGET');
  END IF;

  tier:=public.current_account_tier(uid);
  plan:=public.current_subscription_plan(uid);

  -- Owner/admin/premium: full access, no quota consumption.
  IF public.is_current_user_admin()
     OR EXISTS(
       SELECT 1 FROM public.products
       WHERE id=p_target_id
         AND coalesce(creator_id,seller_id)=uid
     )
     OR EXISTS(
       SELECT 1 FROM public.telegram_products
       WHERE id=p_target_id AND owner_id=uid
     )
     OR EXISTS(
       SELECT 1 FROM public.telegram_channels
       WHERE id=p_target_id AND owner_id=uid
     )
     OR EXISTS(
       SELECT 1 FROM public.pastelinks
       WHERE id=p_target_id AND user_id=uid
     )
  THEN
    RETURN jsonb_build_object(
      'allowed',true,'reason','OWNER_OR_ADMIN','tier',tier,'plan',plan
    );
  END IF;

  IF tier='premium' THEN
    RETURN jsonb_build_object(
      'allowed',true,'reason','PREMIUM_FULL_ACCESS',
      'tier','premium','plan','premium','unlimited',true
    );
  END IF;

  IF tier<>'subscription' THEN
    RETURN jsonb_build_object(
      'allowed',false,'reason','PURCHASE_REQUIRED',
      'tier','free','plan','free'
    );
  END IF;

  IF normalized IN ('code','telegram_product','telegram-product') THEN
    normalized:='code';
    SELECT paid_code_daily_limit INTO daily_limit
    FROM public.account_plan_catalog
    WHERE plan_code=plan;
  ELSIF normalized IN ('pastelink','paste','paste-link','paste_link','link') THEN
    normalized:='pastelink';
    SELECT paid_pastelink_daily_limit INTO daily_limit
    FROM public.account_plan_catalog
    WHERE plan_code=plan;
  ELSE
    -- Subscription plans do not include paid channel/group access.
    RETURN jsonb_build_object(
      'allowed',false,'reason','PURCHASE_REQUIRED',
      'tier','subscription','plan',plan,
      'message','Channel/Group Paid harus dibeli satu per satu.'
    );
  END IF;

  daily_limit:=COALESCE(daily_limit,0);

  IF daily_limit<=0 THEN
    RETURN jsonb_build_object(
      'allowed',false,'reason','QUOTA_EXHAUSTED',
      'tier','subscription','plan',plan,
      'daily_limit',daily_limit,'used',0,'remaining',0
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.paid_access_usage u
    WHERE u.user_id=uid
      AND u.usage_date=usage_date
      AND u.target_type=normalized
      AND u.target_id=p_target_id
  ) INTO already_used;

  IF already_used THEN
    SELECT count(*)::integer INTO usage_count
    FROM public.paid_access_usage u
    WHERE u.user_id=uid
      AND u.usage_date=usage_date
      AND u.target_type=normalized;

    RETURN jsonb_build_object(
      'allowed',true,'reason','ALREADY_OPENED_TODAY',
      'tier','subscription','plan',plan,
      'daily_limit',daily_limit,
      'used',usage_count,
      'remaining',greatest(0,daily_limit-usage_count)
    );
  END IF;

  -- Serialize quota changes per user.
  PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;

  SELECT count(*)::integer INTO usage_count
  FROM public.paid_access_usage u
  WHERE u.user_id=uid
    AND u.usage_date=usage_date
    AND u.target_type=normalized;

  IF usage_count>=daily_limit THEN
    RETURN jsonb_build_object(
      'allowed',false,'reason','QUOTA_EXHAUSTED',
      'tier','subscription','plan',plan,
      'daily_limit',daily_limit,
      'used',usage_count,'remaining',0
    );
  END IF;

  INSERT INTO public.paid_access_usage(
    user_id,usage_date,target_type,target_id
  ) VALUES(
    uid,usage_date,normalized,p_target_id
  )
  ON CONFLICT(user_id,usage_date,target_type,target_id) DO NOTHING;

  SELECT count(*)::integer INTO usage_count
  FROM public.paid_access_usage u
  WHERE u.user_id=uid
    AND u.usage_date=usage_date
    AND u.target_type=normalized;

  RETURN jsonb_build_object(
    'allowed',true,'reason','SUBSCRIPTION_QUOTA',
    'tier','subscription','plan',plan,
    'daily_limit',daily_limit,
    'used',usage_count,
    'remaining',greatest(0,daily_limit-usage_count)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_paid_access(text,uuid) TO authenticated;

-- ------------------------------------------------------------
-- 6. Checkout:
--    Free users buy paid items individually.
--    Subscription users may buy content outside their included
--    quota/type.
--    Premium users don't need to purchase included paid content.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_type text,
  p_id text
)
RETURNS TABLE(order_id uuid,amount numeric,item_title text,item_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();
  seller uuid;
  title text;
  price numeric;
  oid uuid;
  normalized text:=lower(btrim(coalesce(p_type,'')));
  pid uuid;
  tier text;
  plan text;
  paid boolean:=false;
  included boolean:=false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF btrim(coalesce(p_id,''))='' THEN RAISE EXCEPTION 'PRODUCT_ID_REQUIRED'; END IF;

  BEGIN
    pid:=p_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'INVALID_PRODUCT_ID';
  END;

  IF normalized IN ('product','link') THEN
    SELECT coalesce(p.creator_id,p.seller_id),p.title,p.price
    INTO seller,title,price
    FROM public.products p WHERE p.id=pid;
    normalized:='product';
  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.owner_id,p.title,p.price
    INTO seller,title,price
    FROM public.telegram_products p WHERE p.id=pid;
    normalized:='code';
  ELSIF normalized IN ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
    SELECT p.owner_id,p.name,p.price
    INTO seller,title,price
    FROM public.telegram_channels p WHERE p.id=pid;
    normalized:='channel';
  ELSIF normalized IN ('link','paste','pastelink','paste-link','paste_link') THEN
    SELECT p.user_id,p.title,p.price
    INTO seller,title,price
    FROM public.pastelinks p WHERE p.id=pid;
    normalized:='pastelink';
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF seller=uid THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_PRODUCT'; END IF;

  paid:=coalesce(price,0)>0;
  IF NOT paid THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;

  tier:=public.current_account_tier(uid);
  plan:=public.current_subscription_plan(uid);

  IF tier='premium' THEN
    included:=true;
  ELSIF tier='subscription' AND normalized IN ('code','pastelink') THEN
    -- Included quota is checked/consumed by the content-open flow.
    -- Checkout is therefore not necessary for included Code/PasteLink.
    included:=true;
  END IF;

  IF included THEN
    RAISE EXCEPTION 'ACCESS_INCLUDED:%',coalesce(plan,'premium');
  END IF;

  SELECT o.id INTO oid
  FROM public.orders o
  WHERE o.buyer_id=uid
    AND o.product_id=pid
    AND lower(coalesce(o.item_type,''))=normalized
    AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid')
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF oid IS NULL THEN
    INSERT INTO public.orders(
      buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title
    ) VALUES(
      uid,seller,pid,price,'pending',normalized,p_id,title
    ) RETURNING id INTO oid;
  END IF;

  RETURN QUERY SELECT oid,price,title,normalized;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_checkout_order(text,text) TO authenticated;

-- ------------------------------------------------------------
-- 7. Secure market detail with plan access.
--    Paid subscription access is consumed once per unique target
--    per Asia/Jakarta day.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_market_item_detail(text,uuid);

CREATE OR REPLACE FUNCTION public.get_market_item_detail(
  p_type text,
  p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  r record;
  normalized text:=lower(btrim(coalesce(p_type,'')));
  paid boolean:=false;
  can_access boolean:=false;
  access_result jsonb;
  uid uuid:=auth.uid();
BEGIN
  IF normalized IN ('product','link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           coalesce(p.creator_id,p.seller_id) owner_id
    INTO r
    FROM public.products p
    LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
    WHERE p.id=p_id AND p.status IN ('published','active','live');

  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.owner_id owner_id
    INTO r
    FROM public.telegram_products p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.id=p_id AND p.status IN ('published','active','live');

  ELSIF normalized IN ('channel','telegram_channel','telegram-channel',
                       'group','telegram_group','telegram-group') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.owner_id seller_id,p.owner_id owner_id,p.name title
    INTO r
    FROM public.telegram_channels p
    LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.id=p_id AND p.status IN ('published','active','live');

  ELSIF normalized IN ('pastelink','paste-link','paste_link','paste','link') THEN
    SELECT p.*,pr.username creator_username,pr.display_name creator_name,
           p.user_id owner_id,
           coalesce(p.access_type,
             CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END
           ) access_type,
           coalesce(p.price,0)::numeric price,
           p.content_html AS content
    INTO r
    FROM public.pastelinks p
    LEFT JOIN public.profiles pr ON pr.id=p.user_id
    WHERE p.id=p_id
      AND lower(coalesce(p.visibility,'public'))='public'
      AND (p.expires_at IS NULL OR p.expires_at>now());

  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF r IS NULL THEN
    RETURN jsonb_build_object('found',false);
  END IF;

  paid:=coalesce(r.access_type,'free')='paid' OR coalesce(r.price,0)>0;

  IF NOT paid THEN
    can_access:=true;
  ELSIF uid IS NULL THEN
    can_access:=false;
  ELSIF r.owner_id=uid OR public.is_current_user_admin() THEN
    can_access:=true;
  ELSIF EXISTS(
    SELECT 1 FROM public.purchases pu
    WHERE pu.buyer_id=uid
      AND pu.product_id=p_id
      AND lower(coalesce(pu.status,'')) IN ('completed','paid','success')
  ) THEN
    can_access:=true;
  ELSE
    access_result:=public.consume_paid_access(normalized,p_id);
    can_access:=coalesce((access_result->>'allowed')::boolean,false);
  END IF;

  IF NOT can_access AND paid THEN
    RETURN (to_jsonb(r)-'content'-'content_html')||
      jsonb_build_object(
        'found',true,
        'can_access',false,
        'is_paid',true,
        'access_policy',public.paid_access_policy(uid)
      );
  END IF;

  RETURN to_jsonb(r)||
    jsonb_build_object(
      'found',true,
      'can_access',true,
      'is_paid',paid,
      'access_policy',public.paid_access_policy(uid),
      'access_result',coalesce(access_result,'{}'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_market_item_detail(text,uuid)
TO anon,authenticated;

-- ------------------------------------------------------------
-- 8. Plan order validation: add 1 month.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_account_plan_order(
  p_plan text,
  p_days integer,
  p_amount numeric
)
RETURNS TABLE(order_id uuid,amount numeric,item_title text,item_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();
  oid uuid;
  expected numeric;
  title text;
  normalized text:=lower(btrim(coalesce(p_plan,'')));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;

  SELECT c.price,c.plan_name
  INTO expected,title
  FROM public.account_plan_catalog c
  WHERE c.plan_code=normalized AND c.is_active=true;

  IF expected IS NULL THEN
    RAISE EXCEPTION 'INVALID_PLAN';
  END IF;

  IF round(coalesce(p_amount,0),0)<>round(expected,0) THEN
    RAISE EXCEPTION 'INVALID_PLAN_AMOUNT';
  END IF;

  IF normalized = 'subscription_1' THEN
    IF p_days IS NULL OR p_days <> 1 THEN
      RAISE EXCEPTION 'INVALID_PLAN_DURATION';
    END IF;

  ELSIF normalized = 'subscription_3' THEN
    IF p_days IS NULL OR p_days <> 3 THEN
      RAISE EXCEPTION 'INVALID_PLAN_DURATION';
    END IF;

  ELSIF normalized = 'subscription_7' THEN
    IF p_days IS NULL OR p_days <> 7 THEN
      RAISE EXCEPTION 'INVALID_PLAN_DURATION';
    END IF;

  ELSIF normalized = 'subscription_30' THEN
    IF p_days IS NULL OR p_days <> 30 THEN
      RAISE EXCEPTION 'INVALID_PLAN_DURATION';
    END IF;
  END IF;

  INSERT INTO public.orders(
    buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title
  ) VALUES(
    uid,uid,NULL,expected,'pending','account_plan',normalized,title
  ) RETURNING id INTO oid;

  RETURN QUERY SELECT oid,expected,title,'account_plan'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_account_plan_order(text,integer,numeric)
TO authenticated;

-- ------------------------------------------------------------
-- 9. Ensure successful account-plan settlement records the exact
--    plan code. Existing settlement functions already activate
--    subscription_until; this trigger adds the plan metadata.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_account_plan_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  duration_days integer;
BEGIN
  IF NEW.item_type='account_plan'
     AND lower(coalesce(NEW.status,'')) IN ('paid','success','completed','settled')
     AND NEW.buyer_id IS NOT NULL
  THEN
    IF NEW.item_id='premium' THEN
      UPDATE public.profiles
      SET is_premium=true,
          updated_at=now()
      WHERE id=NEW.buyer_id;

    ELSIF NEW.item_id IN ('subscription_1','subscription_3','subscription_7','subscription_30') THEN
      SELECT c.duration_days INTO duration_days
      FROM public.account_plan_catalog c
      WHERE c.plan_code=NEW.item_id;

      UPDATE public.profiles
      SET subscription_plan=NEW.item_id,
          subscription_started_at=coalesce(subscription_started_at,coalesce(NEW.paid_at,now())),
          updated_at=now()
      WHERE id=NEW.buyer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_account_plan_after_payment ON public.orders;
CREATE TRIGGER trg_sync_account_plan_after_payment
AFTER INSERT OR UPDATE OF status,paid_at ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_account_plan_after_payment();

-- ------------------------------------------------------------
-- 10. Final withdrawal policy
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdrawal_policy()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT jsonb_build_object(
    'timezone','Asia/Jakarta',
    'manual',jsonb_build_object(
      'open_time','09:00',
      'close_time','17:00',
      'days',jsonb_build_array(1,2,3,4,5),
      'minimum',100000,
      'fee_free',15000,
      'fee_subscription',13000,
      'fee_premium',10000
    ),
    'instant',jsonb_build_object(
      'available_24_7',true,
      'minimum',50000,
      'maximum',250000,
      'fee_free',15000,
      'fee_subscription',13000,
      'fee_premium',10000
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.withdrawal_policy() TO anon,authenticated;

-- ------------------------------------------------------------
-- 11. Withdrawal limits:
--     Keep the existing daily-count/amount model, but fix fee.
--     Premium: 5 manual requests/day, Rp500k instant/day.
--     Subscription: 2 manual/day, Rp300k instant/day.
--     Free: 1 manual/day, Rp100k instant/day.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_withdrawal_limits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();
  tier text;
  manual_count integer:=0;
  instant_amount numeric:=0;
  manual_max_count integer;
  instant_limit numeric;
  manual_fee numeric;
  instant_fee numeric;
  sched jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;

  tier:=public.current_account_tier(uid);

  SELECT count(*)::integer INTO manual_count
  FROM public.withdrawals w
  WHERE w.user_id=uid
    AND lower(coalesce(w.mode,''))='manual'
    AND timezone('Asia/Jakarta',w.created_at)::date=timezone('Asia/Jakarta',now())::date
    AND lower(coalesce(w.status,'')) NOT IN ('rejected','cancelled','canceled','failed');

  SELECT coalesce(sum(w.amount),0) INTO instant_amount
  FROM public.withdrawals w
  WHERE w.user_id=uid
    AND lower(coalesce(w.mode,''))='instant'
    AND timezone('Asia/Jakarta',w.created_at)::date=timezone('Asia/Jakarta',now())::date
    AND lower(coalesce(w.status,'')) NOT IN ('rejected','cancelled','canceled','failed');

  IF tier='premium' THEN
    manual_max_count:=5;
    instant_limit:=500000;
    manual_fee:=10000;
    instant_fee:=10000;
  ELSIF tier='subscription' THEN
    manual_max_count:=2;
    instant_limit:=300000;
    manual_fee:=13000;
    instant_fee:=13000;
  ELSE
    manual_max_count:=1;
    instant_limit:=100000;
    manual_fee:=15000;
    instant_fee:=15000;
  END IF;

  sched:=public.withdrawal_schedule_status(now());

  RETURN jsonb_build_object(
    'tier',tier,
    'plan',public.current_subscription_plan(uid),
    'manual',jsonb_build_object(
      'minimum',100000,
      'fee',manual_fee,
      'daily_max_count',manual_max_count,
      'used_count',manual_count,
      'remaining_count',greatest(0,manual_max_count-manual_count),
      'schedule',sched
    ),
    'instant',jsonb_build_object(
      'minimum',50000,
      'maximum',250000,
      'fee',instant_fee,
      'daily_limit',instant_limit,
      'used_amount',instant_amount,
      'remaining_amount',greatest(0,instant_limit-instant_amount)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_withdrawal_limits() TO authenticated;

-- ------------------------------------------------------------
-- 12. Final secure withdrawal request.
--     The amount entered is gross withdrawal.
--     Fee is deducted from that gross amount:
--       net = amount - fee
--     Example Rp250.000:
--       Free       => Rp235.000
--       Subscription=> Rp237.000
--       Premium    => Rp240.000
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_withdrawal_v2(
  p_amount numeric,
  p_mode text,
  p_method text,
  p_account_name text,
  p_account_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid:=auth.uid();
  wid uuid;
  tier text;
  available numeric:=0;
  fee numeric:=0;
  net_amount numeric:=0;
  mode_normalized text:=lower(btrim(coalesce(p_mode,'')));
  sched jsonb;
  settings jsonb;
  mode_cfg jsonb;
  mode_enabled boolean;
  mode_reason text;
  manual_count integer:=0;
  instant_used numeric:=0;
  manual_max_count integer;
  instant_limit numeric;
  before_balance numeric:=0;
  actor_name text;
  admin_body text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF p_amount IS NULL OR p_amount<=0 THEN
    RAISE EXCEPTION 'INVALID_WITHDRAWAL_AMOUNT';
  END IF;
  IF length(btrim(coalesce(p_account_name,'')))<2 THEN
    RAISE EXCEPTION 'ACCOUNT_NAME_REQUIRED';
  END IF;
  IF length(btrim(coalesce(p_account_number,'')))<5 THEN
    RAISE EXCEPTION 'ACCOUNT_NUMBER_REQUIRED';
  END IF;

  tier:=public.current_account_tier(uid);

  IF tier='premium' THEN
    manual_max_count:=5;
    instant_limit:=500000;
    fee:=10000;
  ELSIF tier='subscription' THEN
    manual_max_count:=2;
    instant_limit:=300000;
    fee:=13000;
  ELSE
    manual_max_count:=1;
    instant_limit:=100000;
    fee:=15000;
  END IF;

  -- Respect admin enable/disable switches.
  SELECT coalesce(s.settings,'{}'::jsonb)
  INTO settings
  FROM public.site_settings s
  WHERE s.id=1;

  IF mode_normalized='manual' THEN
    mode_cfg:=coalesce(
      settings->'withdrawal_manual',
      '{"enabled":true,"reason":""}'::jsonb
    );
    mode_enabled:=coalesce((mode_cfg->>'enabled')::boolean,true);
    mode_reason:=coalesce(mode_cfg->>'reason','WD Manual sedang ditutup');

    IF NOT mode_enabled THEN
      RAISE EXCEPTION 'WITHDRAWAL_CLOSED:%',mode_reason;
    END IF;

    sched:=public.withdrawal_schedule_status(now());
    IF coalesce((sched->>'open')::boolean,false)=false THEN
      RAISE EXCEPTION 'WITHDRAWAL_CLOSED:%',
        coalesce(sched->>'reason','WD Manual sedang ditutup');
    END IF;

    IF p_amount<100000 THEN
      RAISE EXCEPTION 'MINIMUM_MANUAL_WITHDRAWAL_100000';
    END IF;

    SELECT count(*)::integer INTO manual_count
    FROM public.withdrawals w
    WHERE w.user_id=uid
      AND lower(coalesce(w.mode,''))='manual'
      AND timezone('Asia/Jakarta',w.created_at)::date=timezone('Asia/Jakarta',now())::date
      AND lower(coalesce(w.status,'')) NOT IN ('rejected','cancelled','canceled','failed');

    IF manual_count>=manual_max_count THEN
      RAISE EXCEPTION 'MANUAL_DAILY_COUNT_LIMIT';
    END IF;

  ELSIF mode_normalized='instant' THEN
    mode_cfg:=coalesce(
      settings->'withdrawal_instant',
      '{"enabled":true,"reason":""}'::jsonb
    );
    mode_enabled:=coalesce((mode_cfg->>'enabled')::boolean,true);
    mode_reason:=coalesce(mode_cfg->>'reason','WD Instant sedang ditutup');

    IF NOT mode_enabled THEN
      RAISE EXCEPTION 'WITHDRAWAL_CLOSED:%',mode_reason;
    END IF;

    IF p_amount<50000 THEN
      RAISE EXCEPTION 'MINIMUM_INSTANT_WITHDRAWAL_50000';
    END IF;

    IF p_amount>250000 THEN
      RAISE EXCEPTION 'MAXIMUM_INSTANT_WITHDRAWAL_250000';
    END IF;

    SELECT coalesce(sum(w.amount),0) INTO instant_used
    FROM public.withdrawals w
    WHERE w.user_id=uid
      AND lower(coalesce(w.mode,''))='instant'
      AND timezone('Asia/Jakarta',w.created_at)::date=timezone('Asia/Jakarta',now())::date
      AND lower(coalesce(w.status,'')) NOT IN ('rejected','cancelled','canceled','failed');

    IF instant_used+p_amount>instant_limit THEN
      RAISE EXCEPTION 'INSTANT_DAILY_LIMIT:%',
        greatest(0,instant_limit-instant_used);
    END IF;

  ELSE
    RAISE EXCEPTION 'INVALID_WITHDRAWAL_MODE';
  END IF;

  net_amount:=greatest(0,p_amount-fee);

  -- The fee is taken from the gross withdrawal amount.
  SELECT coalesce(w.balance,0),coalesce(w.available_balance,0)
  INTO before_balance,available
  FROM public.wallets w
  WHERE w.user_id=uid
  FOR UPDATE;

  IF coalesce(available,0)<p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  UPDATE public.wallets
  SET available_balance=available_balance-p_amount,
      balance=balance-p_amount,
      updated_at=now()
  WHERE user_id=uid;

  UPDATE public.profiles
  SET balance=greatest(0,balance-p_amount),
      updated_at=now()
  WHERE id=uid;

  INSERT INTO public.withdrawals(
    user_id,amount,fee,net_amount,mode,method,
    account_name,account_number,status
  ) VALUES(
    uid,p_amount,fee,net_amount,mode_normalized,
    btrim(coalesce(p_method,'')),
    btrim(p_account_name),
    btrim(p_account_number),
    'pending'
  ) RETURNING id INTO wid;

  INSERT INTO public.wallet_transactions(
    user_id,type,amount,balance_before,balance_after,
    reference,status,available_at,settlement_code
  ) VALUES(
    uid,'withdrawal',-p_amount,
    before_balance,before_balance-p_amount,
    'withdrawal:'||wid::text,
    'completed',now(),'WD'
  ) ON CONFLICT(user_id,reference) DO NOTHING;

  INSERT INTO public.transactions(
    user_id,amount,fee,net_amount,type,status,reference,description
  ) VALUES(
    uid,-p_amount,fee,net_amount,
    'withdrawal','pending',
    'withdrawal:'||wid::text,
    CASE
      WHEN mode_normalized='instant'
        THEN 'WD Instant — Fee platform '||to_char(fee,'FM999G999G999')
      ELSE
        'WD Manual — Fee platform '||to_char(fee,'FM999G999G999')
    END
  ) ON CONFLICT(user_id,reference) DO NOTHING;

  -- Admin notification.
  SELECT coalesce(p.display_name,p.username,'User')
  INTO actor_name
  FROM public.profiles p
  WHERE p.id=uid;

  admin_body:=
    'Pengajuan '||
    CASE WHEN mode_normalized='instant' THEN 'WD Instant' ELSE 'WD Manual' END||
    ' baru.'||
    E'\n\nUser: '||coalesce(actor_name,'User')||
    E'\nNominal: Rp'||to_char(p_amount,'FM999G999G999')||
    E'\nFee platform: Rp'||to_char(fee,'FM999G999G999')||
    E'\nTotal diterima: Rp'||to_char(net_amount,'FM999G999G999')||
    E'\nMetode: '||btrim(coalesce(p_method,'-'))||
    E'\nAtas nama: '||btrim(p_account_name)||
    E'\nNo. tujuan: '||btrim(p_account_number)||
    E'\nStatus: Menunggu diproses'||
    E'\nID: '||wid::text;

  INSERT INTO public.notifications(user_id,title,body)
  SELECT p.id,
         '🔔 Pengajuan Withdraw Baru',
         left(admin_body,4000)
  FROM public.profiles p
  WHERE p.is_admin=true
    AND p.is_banned=false;

  RETURN jsonb_build_object(
    'id',wid,
    'status','pending',
    'tier',tier,
    'plan',public.current_subscription_plan(uid),
    'amount',p_amount,
    'fee',fee,
    'net_amount',net_amount,
    'total_received',net_amount,
    'mode',mode_normalized,
    'account_name',btrim(p_account_name),
    'account_number',btrim(p_account_number)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_withdrawal_v2(numeric,text,text,text,text)
TO authenticated;

COMMIT;



-- ============================================================
-- PasTele FINAL PREMIUM + SUBSCRIPTION CATALOG REPAIR
-- ============================================================
-- Purpose:
-- 1. Guarantee account_plan_catalog has the required columns/data.
-- 2. Guarantee all 4 subscription plans + Premium exist and are active.
-- 3. Make create_account_plan_order read price/duration from catalog.
-- 4. Support subscription_30 (1 month).
-- 5. Activate subscription_until after successful payment.
-- 6. Activate Premium permanently through profiles.is_premium.
-- 7. Keep catalog readable by the frontend.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- A. Make the catalog schema safe even if an older table already
--    existed before this migration.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_plan_catalog (
  plan_code text PRIMARY KEY,
  plan_name text NOT NULL,
  price numeric(18,2) NOT NULL DEFAULT 0 CHECK(price >= 0),
  duration_days integer NOT NULL DEFAULT 1 CHECK(duration_days > 0),
  paid_code_daily_limit integer,
  paid_pastelink_daily_limit integer,
  full_access boolean NOT NULL DEFAULT false,
  payment_provider text NOT NULL DEFAULT 'cashi',
  payment_method text NOT NULL DEFAULT 'qris',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS plan_name text;

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS price numeric(18,2);

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS duration_days integer;

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS paid_code_daily_limit integer;

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS paid_pastelink_daily_limit integer;

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS full_access boolean;

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS payment_provider text;

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS is_active boolean;

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.account_plan_catalog
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Fill NULLs in case an older catalog existed with incomplete rows.
UPDATE public.account_plan_catalog
SET
  plan_name = COALESCE(NULLIF(plan_name,''), initcap(replace(plan_code,'_',' '))),
  price = COALESCE(price,0),
  duration_days = CASE
    WHEN COALESCE(duration_days,0) > 0 THEN duration_days
    WHEN plan_code='subscription_1' THEN 1
    WHEN plan_code='subscription_3' THEN 3
    WHEN plan_code='subscription_7' THEN 7
    WHEN plan_code='subscription_30' THEN 30
    WHEN plan_code='premium' THEN 36500
    ELSE 1
  END,
  full_access = COALESCE(full_access,false),
  payment_provider = COALESCE(NULLIF(payment_provider,''),'cashi'),
  payment_method = COALESCE(NULLIF(payment_method,''),'qris'),
  is_active = COALESCE(is_active,true),
  created_at = COALESCE(created_at,now()),
  updated_at = now();

-- ------------------------------------------------------------
-- B. Canonical package catalog.
-- ------------------------------------------------------------
INSERT INTO public.account_plan_catalog (
  plan_code,
  plan_name,
  price,
  duration_days,
  paid_code_daily_limit,
  paid_pastelink_daily_limit,
  full_access,
  payment_provider,
  payment_method,
  is_active
)
VALUES
  ('subscription_1','Langganan 1 Hari',15000,1,2,3,false,'cashi','qris',true),
  ('subscription_3','Langganan 3 Hari',30000,3,3,5,false,'cashi','qris',true),
  ('subscription_7','Langganan 7 Hari',50000,7,5,7,false,'cashi','qris',true),
  ('subscription_30','Langganan 1 Bulan',150000,30,10,20,false,'cashi','qris',true),
  ('premium','Premium',250000,36500,NULL,NULL,true,'cashi','qris',true)
ON CONFLICT (plan_code) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days,
  paid_code_daily_limit = EXCLUDED.paid_code_daily_limit,
  paid_pastelink_daily_limit = EXCLUDED.paid_pastelink_daily_limit,
  full_access = EXCLUDED.full_access,
  payment_provider = EXCLUDED.payment_provider,
  payment_method = EXCLUDED.payment_method,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ------------------------------------------------------------
-- C. Frontend-readable catalog.
-- ------------------------------------------------------------
ALTER TABLE public.account_plan_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_plan_catalog_public_read
ON public.account_plan_catalog;

CREATE POLICY account_plan_catalog_public_read
ON public.account_plan_catalog
FOR SELECT
TO anon, authenticated
USING (is_active = true);

GRANT SELECT ON public.account_plan_catalog TO anon, authenticated;

-- ------------------------------------------------------------
-- D. Canonical account-plan order RPC.
--    The amount is NEVER trusted from the frontend.
--    It must match the catalog.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_account_plan_order(
  p_plan text,
  p_days integer,
  p_amount numeric
)
RETURNS TABLE(
  order_id uuid,
  amount numeric,
  item_title text,
  item_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid := auth.uid();
  oid uuid;
  normalized text := lower(btrim(coalesce(p_plan,'')));
  expected numeric;
  expected_days integer;
  title text;
  already_active boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'LOGIN_REQUIRED';
  END IF;

  SELECT
    c.price,
    c.duration_days,
    c.plan_name
  INTO
    expected,
    expected_days,
    title
  FROM public.account_plan_catalog c
  WHERE c.plan_code = normalized
    AND c.is_active = true
  LIMIT 1;

  IF expected IS NULL THEN
    RAISE EXCEPTION 'INVALID_PLAN';
  END IF;

  IF round(coalesce(p_amount,0),0) <> round(expected,0) THEN
    RAISE EXCEPTION 'INVALID_PLAN_AMOUNT';
  END IF;

  -- Premium is permanent and must use p_days=0 from the Premium page.
  IF normalized = 'premium' THEN

    SELECT coalesce(p.is_premium,false)
    INTO already_active
    FROM public.profiles p
    WHERE p.id = uid;

    IF already_active THEN
      RAISE EXCEPTION 'PREMIUM_ALREADY_ACTIVE';
    END IF;

    IF p_days IS NULL OR p_days <> 0 THEN
      RAISE EXCEPTION 'INVALID_PLAN_DURATION';
    END IF;

  ELSE

    IF p_days IS NULL OR p_days <> expected_days THEN
      RAISE EXCEPTION 'INVALID_PLAN_DURATION';
    END IF;

    IF normalized NOT IN (
      'subscription_1',
      'subscription_3',
      'subscription_7',
      'subscription_30'
    ) THEN
      RAISE EXCEPTION 'INVALID_PLAN';
    END IF;

  END IF;

  INSERT INTO public.orders (
    buyer_id,
    seller_id,
    product_id,
    amount,
    status,
    item_type,
    item_id,
    item_title
  )
  VALUES (
    uid,
    uid,
    NULL,
    expected,
    'pending',
    'account_plan',
    normalized,
    title
  )
  RETURNING id INTO oid;

  RETURN QUERY
  SELECT
    oid,
    expected,
    title,
    'account_plan'::text;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.create_account_plan_order(text,integer,numeric)
TO authenticated;

-- ------------------------------------------------------------
-- E. Successful account-plan settlement.
--    Subscription gets an exact expiry date.
--    Premium becomes permanent.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_account_plan_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  plan_days integer;
  paid_time timestamptz;
BEGIN
  IF NEW.item_type <> 'account_plan'
     OR lower(coalesce(NEW.status,'')) NOT IN
        ('paid','success','completed','settled')
     OR NEW.buyer_id IS NULL
  THEN
    RETURN NEW;
  END IF;

  paid_time := COALESCE(NEW.paid_at, now());

  IF NEW.item_id = 'premium' THEN

    UPDATE public.profiles
    SET
      is_premium = true,
      subscription_plan = NULL,
      subscription_started_at = NULL,
      subscription_until = NULL,
      updated_at = now()
    WHERE id = NEW.buyer_id;

  ELSIF NEW.item_id IN (
    'subscription_1',
    'subscription_3',
    'subscription_7',
    'subscription_30'
  ) THEN

    SELECT c.duration_days
    INTO plan_days
    FROM public.account_plan_catalog c
    WHERE c.plan_code = NEW.item_id
      AND c.is_active = true
    LIMIT 1;

    IF plan_days IS NULL OR plan_days <= 0 THEN
      RAISE EXCEPTION 'INVALID_PLAN_DURATION';
    END IF;

    UPDATE public.profiles
    SET
      is_premium = false,
      subscription_plan = NEW.item_id,
      subscription_started_at = paid_time,
      subscription_until = paid_time + make_interval(days => plan_days),
      updated_at = now()
    WHERE id = NEW.buyer_id;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_account_plan_after_payment
ON public.orders;

CREATE TRIGGER trg_sync_account_plan_after_payment
AFTER INSERT OR UPDATE OF status, paid_at
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_account_plan_after_payment();

-- ------------------------------------------------------------
-- F. Ensure the profile columns needed by the plan system exist.
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_until timestamptz;

-- Re-apply the allowed subscription-plan values.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (
    subscription_plan IS NULL
    OR subscription_plan IN (
      'subscription_1',
      'subscription_3',
      'subscription_7',
      'subscription_30'
    )
  );

-- ------------------------------------------------------------
-- G. Final verification result.
--    This returns the exact rows that should appear in the
--    Supabase SQL result after this migration.
-- ------------------------------------------------------------
SELECT
  plan_code,
  plan_name,
  price,
  duration_days,
  paid_code_daily_limit,
  paid_pastelink_daily_limit,
  full_access,
  payment_provider,
  payment_method,
  is_active
FROM public.account_plan_catalog
WHERE plan_code IN (
  'subscription_1',
  'subscription_3',
  'subscription_7',
  'subscription_30',
  'premium'
)
ORDER BY CASE plan_code
  WHEN 'subscription_1' THEN 1
  WHEN 'subscription_3' THEN 2
  WHEN 'subscription_7' THEN 3
  WHEN 'subscription_30' THEN 4
  WHEN 'premium' THEN 5
  ELSE 99
END;

COMMIT;

-- ============================================================
-- END FINAL PREMIUM + SUBSCRIPTION CATALOG REPAIR
-- ============================================================


-- ============================================================
-- FINAL CASHI CLEANUP
-- No Bayar.gg settlement function remains authoritative.
-- Remove the legacy function if it exists from an older migration.
-- ============================================================
DROP FUNCTION IF EXISTS public.settle_bayargg_order(uuid,text,text,numeric,jsonb);

-- Make the Cashi settlement function the only service-role settlement RPC.
REVOKE ALL ON FUNCTION public.settle_cashi_order(uuid,text,text,numeric,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_cashi_order(uuid,text,text,numeric,jsonb) TO service_role;

-- Force the account-plan catalog to use Cashi.
UPDATE public.account_plan_catalog
SET payment_provider='cashi',
    payment_method='qris',
    updated_at=now()
WHERE plan_code IN ('subscription_1','subscription_3','subscription_7','subscription_30','premium');

-- Canonical platform package verification.
SELECT
  plan_code,
  plan_name,
  price,
  duration_days,
  paid_code_daily_limit,
  paid_pastelink_daily_limit,
  full_access,
  payment_provider,
  payment_method,
  is_active
FROM public.account_plan_catalog
WHERE plan_code IN ('subscription_1','subscription_3','subscription_7','subscription_30','premium')
ORDER BY CASE plan_code
  WHEN 'subscription_1' THEN 1
  WHEN 'subscription_3' THEN 2
  WHEN 'subscription_7' THEN 3
  WHEN 'subscription_30' THEN 4
  WHEN 'premium' THEN 5
  ELSE 99
END;
