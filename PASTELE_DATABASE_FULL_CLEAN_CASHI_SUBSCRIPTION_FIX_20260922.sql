/*
====================================================================
PasTele / Bdicodebot — UNIFIED DATABASE FULL FIX
2026-09-21
====================================================================
Single SQL assembled from the complete project ZIP.

Includes:
- canonical master schema/RPC/security/compatibility fixes
- pgcrypto + PasteLink password hashing
- auth user trigger ordering
- purchase/buyer/item compatibility
- marketplace public metadata RPC for paid PasteLinks without exposing
  protected pastelinks columns

Run this file as ONE script in Supabase SQL Editor.
Do not run the older fragmented SQL files in addition to this one.
====================================================================
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


-- ============================================================
-- HARD RESET: remove stale PasteLink password RPC overloads.
-- Explicit signatures only; no dynamic pg_proc loop.
-- ============================================================
DROP FUNCTION IF EXISTS public.create_pastelink_content(
  text,text,text,text,numeric,text,text[],timestamptz
) CASCADE;

DROP FUNCTION IF EXISTS public.create_pastelink_content(
  text,text,text,text,numeric,text,text[],timestamptz,text
) CASCADE;

DROP FUNCTION IF EXISTS public.verify_pastelink_password(
  uuid,text
) CASCADE;


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

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- DROP APPLICATION FUNCTIONS
-- ============================================================
-- The previous dynamic pg_proc loop has intentionally been removed.
-- Canonical functions below use CREATE OR REPLACE and explicit DROP
-- statements where signature changes are required. This avoids
-- accidentally attempting DROP FUNCTION on PostgreSQL aggregates.

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
,
  access_type text NOT NULL DEFAULT 'free',
  price numeric(12,2) NOT NULL DEFAULT 0);

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


-- ============================================================
-- COMPATIBILITY FIX: ensure legacy tables contain buyer_id
-- CREATE TABLE IF NOT EXISTS does not add columns to existing tables.
-- ============================================================
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS buyer_id uuid;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS seller_id uuid;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS item_type text;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS item_id text;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS item_title text;
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS buyer_id uuid;
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS order_id uuid;
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS item_type text;
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS item_id text;
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS item_title text;
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS amount numeric(18,2) DEFAULT 0;
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS access_url text;
ALTER TABLE IF EXISTS public.product_access ADD COLUMN IF NOT EXISTS buyer_id uuid;
ALTER TABLE IF EXISTS public.wallet_transactions ADD COLUMN IF NOT EXISTS available_at timestamptz;
ALTER TABLE IF EXISTS public.wallet_transactions ADD COLUMN IF NOT EXISTS settlement_code text;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TABLE public.purchases ADD CONSTRAINT purchases_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TABLE public.product_access ADD CONSTRAINT product_access_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

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





-- ============================================================
-- CHECKOUT
-- ============================================================




-- [CLEANUP] Removed obsolete duplicate create_account_plan_order definition.








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
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT to_jsonb(p) FROM public.profiles p
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_products(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT to_jsonb(p) FROM public.products p
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;









CREATE OR REPLACE FUNCTION public.admin_pastes(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT to_jsonb(p) FROM public.pastes p
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_bots(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT to_jsonb(b) FROM public.approved_bots b
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_logs(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT to_jsonb(l) FROM public.admin_logs l
 WHERE public.is_current_user_admin()
 ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,200)) OFFSET greatest(0,p_offset);
$$;

CREATE OR REPLACE FUNCTION public.admin_content(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC),'[]'::jsonb)
 FROM public.payment_methods m WHERE m.user_id=p_user AND public.is_current_user_admin();
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user(p_user uuid,p_banned boolean,p_admin boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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



CREATE OR REPLACE FUNCTION public.admin_delete_product(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 DELETE FROM public.products WHERE id=p_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_paste(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 DELETE FROM public.pastes WHERE id=p_id;
END $$;



CREATE OR REPLACE FUNCTION public.admin_set_bot_active(p_bot_id uuid,p_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE r public.approved_bots;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 UPDATE public.approved_bots SET is_active=p_active,updated_at=now()
 WHERE id=p_bot_id RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;





CREATE OR REPLACE FUNCTION public.admin_cancel_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE o public.orders;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 UPDATE public.orders SET status='cancelled'
 WHERE id=p_order_id RETURNING * INTO o;
 IF o.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 RETURN to_jsonb(o);
END $$;





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
  IF price < 2000 OR price > 100000 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;

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




-- Server-side enforcement. Frontend can disable the button, but this
-- function is the final security gate so closed hours cannot be bypassed.



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



-- Never delete a bot master while Codes still depend on it.
CREATE OR REPLACE FUNCTION public.admin_delete_bot(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM public.telegram_products WHERE approved_bot_id=p_id) THEN
    RAISE EXCEPTION 'BOT_IN_USE_USE_EDIT_OR_DEACTIVATE';
  END IF;
  DELETE FROM public.approved_bots WHERE id=p_id;
END;
$$;

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


CREATE OR REPLACE FUNCTION public.create_code_content(
  p_title text,p_content text,p_slug text,p_access_type text DEFAULT 'free',p_price numeric DEFAULT 0,
  p_description text DEFAULT '',p_approved_bot_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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


-- Definitive secure detail RPC: FREE is visible to guests; PAID requires owner/admin/purchase.


-- Keep PasteLink slug access on the same secure contract.


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

-- Legacy 8-argument PasteLink creator intentionally removed.
-- Canonical 9-argument password-aware creator is defined in the final section.

CREATE OR REPLACE FUNCTION public.create_code_content(
 p_title text,p_content text,p_slug text,p_access_type text DEFAULT 'free',p_price numeric DEFAULT 0,p_description text DEFAULT '',p_approved_bot_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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



CREATE OR REPLACE FUNCTION public.get_order_for_payment(p_order_id uuid,p_guest_token text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE o public.orders; uid uuid:=auth.uid(); tok text:=btrim(coalesce(p_guest_token,''));
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF uid IS NOT NULL AND o.buyer_id=uid THEN RETURN to_jsonb(o); END IF;
 IF uid IS NULL AND tok<>'' AND o.buyer_id IS NULL AND o.guest_access_token=tok THEN RETURN to_jsonb(o); END IF;
 RAISE EXCEPTION 'ORDER_ACCESS_DENIED';
END $$;




-- Definitive secure detail for authenticated + guest-free access.
DROP FUNCTION IF EXISTS public.get_market_item_detail(text,uuid);


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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id,title,body,notification_type,link_url,target_type,target_id)
  VALUES(p_user_id,left(coalesce(p_title,'Notifikasi'),180),left(coalesce(p_body,''),1000),coalesce(nullif(p_type,''),'system'),nullif(p_link_url,''),p_target_type,p_target_id);
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_market_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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

CREATE OR REPLACE FUNCTION public.trg_notify_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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





COMMIT;

-- ============================================================
-- CREATE FLOW FINAL HARDENING 2026-09-13
-- ============================================================
BEGIN;

-- Ensure browser clients can execute the public creation RPCs.

-- Keep public FREE content readable through the secure RPC even when RLS is enabled.
CREATE OR REPLACE FUNCTION public.get_pastelink_by_slug(p_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE pid uuid;
BEGIN
  SELECT id INTO pid FROM public.pastelinks WHERE lower(btrim(slug))=lower(btrim(coalesce(p_slug,''))) LIMIT 1;
  IF pid IS NULL THEN RETURN jsonb_build_object('found',false); END IF;
  RETURN public.get_market_item_detail('pastelink',pid);
END;
$$;

COMMIT;


-- ============================================================
-- FINAL ADMIN UX COMPATIBILITY LAYER — HUMAN IDENTIFIERS
-- Admin UI never needs to expose or type UUIDs. UUIDs remain internal
-- database keys for referential integrity and are resolved server-side.
-- Safe/idempotent: all functions use CREATE OR REPLACE.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_resolve_profile(p_identifier text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE r jsonb; uid uuid:=public.admin_resolve_profile(p_identifier);
BEGIN
 PERFORM public.admin_set_user(uid,p_banned,p_admin); SELECT to_jsonb(p) INTO r FROM public.profiles p WHERE p.id=uid; RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance_by_identifier(p_identifier text,p_amount numeric,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN PERFORM public.admin_adjust_balance(public.admin_resolve_profile(p_identifier),p_amount,p_reason); END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_product(p_identifier text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN RETURN public.admin_update_product(public.admin_resolve_product(p_identifier),p_status,p_price); END $$;
CREATE OR REPLACE FUNCTION public.admin_delete_product_by_identifier(p_identifier text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN PERFORM public.admin_delete_product(public.admin_resolve_product(p_identifier)); END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_order(p_identifier text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE r uuid; v text:=btrim(coalesce(p_identifier,''));
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 BEGIN r:=v::uuid; EXCEPTION WHEN invalid_text_representation THEN r:=NULL; END;
 IF r IS NOT NULL AND EXISTS(SELECT 1 FROM public.orders WHERE id=r) THEN RETURN r; END IF;
 SELECT id INTO r FROM public.orders WHERE lower(coalesce(payment_reference,''))=lower(v) OR lower(coalesce(item_id,''))=lower(v) ORDER BY created_at DESC LIMIT 1;
 IF r IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF; RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.admin_mark_order_paid(
  p_order_id uuid,
  p_payment_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public, extensions
AS $$
DECLARE
  o public.orders%ROWTYPE;
  ok boolean;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  ok := public.settle_cashi_order(
    o.id,
    coalesce(nullif(btrim(p_payment_reference),''), o.payment_reference, 'ADMIN-MANUAL'),
    'paid',
    o.amount,
    jsonb_build_object('source','admin_manual','admin_user_id',auth.uid())
  );

  RETURN jsonb_build_object(
    'ok',ok,
    'order_id',o.id,
    'status',(SELECT status FROM public.orders WHERE id=o.id),
    'payment_reference',(SELECT payment_reference FROM public.orders WHERE id=o.id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_order_paid(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_order_paid_by_identifier(p_identifier text,p_payment_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN RETURN public.admin_mark_order_paid(public.admin_resolve_order(p_identifier),p_payment_reference); END $$;
CREATE OR REPLACE FUNCTION public.admin_cancel_order_by_identifier(p_identifier text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN PERFORM public.admin_cancel_order(public.admin_resolve_order(p_identifier)); END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_withdrawal(p_identifier text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN RETURN public.admin_process_withdrawal(public.admin_resolve_withdrawal(p_identifier),p_status,p_note); END $$;

CREATE OR REPLACE FUNCTION public.admin_set_bot_active_by_identifier(p_identifier text,p_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE r public.approved_bots; v text:=btrim(coalesce(p_identifier,'')); bid bigint;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 BEGIN bid:=v::bigint; EXCEPTION WHEN invalid_text_representation THEN bid:=NULL; END;
 UPDATE public.approved_bots SET is_active=p_active,updated_at=now()
 WHERE (bid IS NOT NULL AND bot_id=bid) OR lower(bot_username)=lower(regexp_replace(v,'^@',''))
 RETURNING * INTO r;
 IF r.id IS NULL THEN RAISE EXCEPTION 'BOT_NOT_FOUND'; END IF; RETURN to_jsonb(r);
END $$;


COMMIT;

-- ============================================================
-- ADMIN HUMAN IDENTIFIER EXTENSION 2026-09-14
-- Keep UUIDs internal; admin UI can operate by slug/title/name.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_resolve_paste(p_identifier text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  PERFORM public.admin_delete_paste(public.admin_resolve_paste(p_identifier));
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_content(p_identifier text,p_source text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  RETURN public.admin_update_content(public.admin_resolve_content(p_identifier,p_source),p_status,p_title,p_description,p_source,p_slug,p_price);
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_content_by_identifier(p_identifier text,p_source text DEFAULT 'products')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  PERFORM public.admin_delete_content(public.admin_resolve_content(p_identifier,p_source),p_source);
END $$;

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

-- Profile visit notification. Only an authenticated visitor can create one,
-- and self-visits are ignored.


-- Follow notification. SECURITY DEFINER avoids cross-user notification RLS issues.

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


-- Guest paid checkout: public, but only for published/active content and never for free content.


-- Guest detail: free is public; paid content remains hidden until the matching guest purchase is paid.


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


-- Replace settlement so account/guest access, 70/30 ledger and counters are all finalized once.


COMMIT;


-- PROFILE VISIT NOTIFICATION FINAL: do not spam the same owner more than once per hour per visitor.


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

-- SECURITY DEFINER VIEW LINT FIX
-- marketplace_public is intentionally SECURITY INVOKER.
-- SELECT therefore uses the querying user's permissions/RLS context.
-- Public marketplace visibility must be granted through SELECT policies
-- on the underlying public/published source rows, not by elevating the view.

CREATE VIEW public.marketplace_public
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.slug,
  p.title,
  coalesce(p.type,'link') AS type,
  lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END)) AS access_type,
  coalesce(p.price,0)::numeric AS price,
  p.thumbnail_url,
  p.description,
  coalesce(p.views,0)::bigint AS views,
  coalesce(p.sales_count,0)::bigint AS sales_count,
  p.category,
  p.created_at,
  pr.display_name AS creator_name,
  pr.username AS creator_username,
  coalesce(p.creator_id,p.seller_id) AS owner_id
FROM public.products p
LEFT JOIN public.profile_public pr ON pr.id=coalesce(p.creator_id,p.seller_id)
WHERE p.status IN ('published','active')

UNION ALL

SELECT
  p.id,
  p.slug,
  p.title,
  'code'::text AS type,
  lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END)) AS access_type,
  coalesce(p.price,0)::numeric AS price,
  p.thumbnail_url,
  p.description,
  coalesce(p.views,0)::bigint,
  coalesce(p.sales_count,0)::bigint,
  p.category,
  p.created_at,
  pr.display_name,
  pr.username,
  p.owner_id
FROM public.telegram_products p
LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.status IN ('published','active')

UNION ALL

SELECT
  p.id,
  p.slug,
  p.name AS title,
  CASE WHEN lower(coalesce(p.type,'channel'))='group' THEN 'group' ELSE 'channel' END AS type,
  lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END)) AS access_type,
  coalesce(p.price,0)::numeric AS price,
  NULL::text AS thumbnail_url,
  p.description,
  coalesce(p.views,0)::bigint,
  coalesce(p.sales_count,0)::bigint,
  p.category,
  p.created_at,
  pr.display_name,
  pr.username,
  p.owner_id
FROM public.telegram_channels p
LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
WHERE p.status IN ('published','active')

UNION ALL

SELECT
  p.id,
  p.slug,
  p.title,
  'pastelink'::text AS type,
  lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END)) AS access_type,
  coalesce(p.price,0)::numeric AS price,
  NULL::text AS thumbnail_url,
  p.description,
  coalesce(p.views,0)::bigint,
  0::bigint,
  'General'::text,
  p.created_at,
  pr.display_name,
  pr.username,
  p.user_id
FROM public.pastelinks p
LEFT JOIN public.profile_public pr ON pr.id=p.user_id
WHERE p.visibility='public'
  AND (p.expires_at IS NULL OR p.expires_at>now())

UNION ALL

SELECT
  p.id,
  p.slug,
  p.title,
  'paste'::text AS type,
  'free'::text AS access_type,
  0::numeric AS price,
  NULL::text AS thumbnail_url,
  left(coalesce(p.content,''),180),
  0::bigint,
  0::bigint,
  'General'::text,
  p.created_at,
  pr.display_name,
  pr.username,
  p.owner_id
FROM public.pastes p
LEFT JOIN public.profile_public pr ON pr.id=p.owner_id
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


-- Profile visit notification. Only an authenticated visitor can create one,
-- and self-visits are ignored.


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


-- Guest paid checkout: public, but only for published/active content and never for free content.
CREATE OR REPLACE FUNCTION public.buy_market_item_guest(p_type text,p_id uuid,p_guest_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
 IF price<2000 OR price>100000 OR mod(price,1000)<>0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
 SELECT o.id INTO oid FROM public.orders o WHERE o.guest_access_token=tok AND o.product_id=p_id AND lower(coalesce(o.item_type,''))=normalized AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid') ORDER BY o.created_at DESC LIMIT 1;
 IF oid IS NULL THEN
   INSERT INTO public.orders(buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title,guest_access_token)
   VALUES(NULL,seller,p_id,price,'pending',normalized,p_id::text,title,tok) RETURNING id INTO oid;
 END IF;
 RETURN jsonb_build_object('order_id',oid,'amount',price,'item_title',title,'item_type',normalized,'guest_token',tok);
END $$;

-- Guest detail: free is public; paid content remains hidden until the matching guest purchase is paid.
CREATE OR REPLACE FUNCTION public.get_market_item_detail_guest(p_type text,p_id uuid,p_guest_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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

-- [CLEANUP] Removed obsolete duplicate settle_cashi_order definition.


-- Guest likes use a token instead of a fake profile FK.
ALTER TABLE public.content_likes ADD COLUMN IF NOT EXISTS guest_token text;
ALTER TABLE public.content_likes ALTER COLUMN actor_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS content_likes_guest_unique
ON public.content_likes(guest_token,target_id,target_type)
WHERE guest_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.toggle_content_like_guest(p_target_id uuid,p_target_type text,p_guest_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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

/* ------------------------------------------------------------
   User tier helper
   ------------------------------------------------------------ */


/* ------------------------------------------------------------
   Withdrawal stats for frontend.
   Counts pending/processing/approved/completed today so a request
   cannot bypass limits by creating several pending requests.
   Failed/cancelled/rejected requests do not consume a limit.
   ------------------------------------------------------------ */


/* ------------------------------------------------------------
   H+2 settlement. Exactly 48 hours after verified payment.
   The old H1/H2 time-of-day split is deliberately removed.
   ------------------------------------------------------------ */


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

/* ------------------------------------------------------------
   Withdrawal request — all fees/limits/times server-side.
   amount = gross withdrawal amount entered by user.
   net_amount = amount - fee.
   total wallet debit = amount (fee is included in the gross amount).
   ------------------------------------------------------------ */


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
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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

CREATE OR REPLACE FUNCTION public.get_profile_social_stats(p_profile_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
  SELECT jsonb_build_object(
    'followers',(SELECT count(*) FROM public.creator_followers WHERE creator_id=p_profile_id),
    'following',(SELECT count(*) FROM public.creator_followers WHERE follower_id=p_profile_id),
    'likes',(SELECT count(*) FROM public.content_likes WHERE content_owner_id=p_profile_id),
    'content',(SELECT count(*) FROM public.marketplace_public WHERE owner_id=p_profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_follow_state(p_creator_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
  SELECT EXISTS(SELECT 1 FROM public.creator_followers WHERE creator_id=p_creator_id AND follower_id=auth.uid());
$$;

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
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
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
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE uid uuid:=auth.uid(); g public.chat_groups%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  SELECT * INTO g FROM public.chat_groups WHERE id=p_group_id AND is_public=true;
  IF g.id IS NULL THEN RAISE EXCEPTION 'CHAT_NOT_FOUND'; END IF;
  INSERT INTO public.chat_members(group_id,user_id) VALUES(p_group_id,uid) ON CONFLICT(group_id,user_id) DO NOTHING;
  RETURN jsonb_build_object('ok',true,'group_id',p_group_id);
END $$;



CREATE OR REPLACE FUNCTION public.toggle_chat_reaction(p_message_id uuid,p_reaction text DEFAULT '👍')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE uid uuid:=auth.uid(); exists_reaction boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.chat_reactions WHERE message_id=p_message_id AND user_id=uid AND reaction=p_reaction) INTO exists_reaction;
  IF exists_reaction THEN DELETE FROM public.chat_reactions WHERE message_id=p_message_id AND user_id=uid AND reaction=p_reaction;
  ELSE INSERT INTO public.chat_reactions(message_id,user_id,reaction) VALUES(p_message_id,uid,p_reaction) ON CONFLICT DO NOTHING; END IF;
  RETURN jsonb_build_object('active',NOT exists_reaction);
END $$;

CREATE OR REPLACE FUNCTION public.mark_chat_read(p_group_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO public.chat_members(group_id,user_id,last_read_at) VALUES(p_group_id,auth.uid(),now())
  ON CONFLICT(group_id,user_id) DO UPDATE SET last_read_at=now();
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.set_chat_presence(p_group_id uuid,p_online boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO public.chat_presence(group_id,user_id,is_online,last_seen_at) VALUES(p_group_id,auth.uid(),coalesce(p_online,false),now())
  ON CONFLICT(group_id,user_id) DO UPDATE SET is_online=excluded.is_online,last_seen_at=now();
  RETURN true;
END $$;

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


-- Keep current_account_tier compatible with the new plan.



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


-- ------------------------------------------------------------
-- 8. Plan order validation: add 1 month.
-- ------------------------------------------------------------



-- ------------------------------------------------------------
-- 9. Ensure successful account-plan settlement records the exact
--    plan code. Existing settlement functions already activate
--    subscription_until; this trigger adds the plan metadata.
-- ------------------------------------------------------------


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


-- ------------------------------------------------------------
-- 11. Withdrawal limits:
--     Keep the existing daily-count/amount model, but fix fee.
--     Premium: 5 manual requests/day, Rp500k instant/day.
--     Subscription: 2 manual/day, Rp300k instant/day.
--     Free: 1 manual/day, Rp100k instant/day.
-- ------------------------------------------------------------



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

-- ============================================================
-- PasTele / Bdicodebot — CASHI PAID ON CONFLICT FINAL FIX
-- 2026-09-18
-- Safe to run after the master database.
-- Fixes the UNIQUE indexes required by settle_cashi_order().
-- ============================================================
BEGIN;

-- 1) Remove duplicate ledger/access rows only when the exact
--    ON CONFLICT key is duplicated. Keep the oldest row.
DELETE FROM public.wallet_transactions a
USING public.wallet_transactions b
WHERE a.id <> b.id
  AND a.user_id IS NOT NULL
  AND a.reference IS NOT NULL
  AND a.user_id = b.user_id
  AND a.reference = b.reference
  AND a.id > b.id;

DELETE FROM public.transactions a
USING public.transactions b
WHERE a.id <> b.id
  AND a.user_id IS NOT NULL
  AND a.reference IS NOT NULL
  AND a.user_id = b.user_id
  AND a.reference = b.reference
  AND a.id > b.id;

DELETE FROM public.product_access a
USING public.product_access b
WHERE a.id <> b.id
  AND a.order_id IS NOT NULL
  AND a.order_id = b.order_id
  AND a.product_id = b.product_id
  AND a.id > b.id;

-- 2) Create UNIQUE indexes with dedicated names so an existing
--    incorrectly-named index cannot hide the required constraint.
CREATE UNIQUE INDEX IF NOT EXISTS cashi_wallet_transactions_user_reference_full_uidx
ON public.wallet_transactions(user_id, reference);

CREATE UNIQUE INDEX IF NOT EXISTS cashi_transactions_user_reference_full_uidx
ON public.transactions(user_id, reference);

CREATE UNIQUE INDEX IF NOT EXISTS cashi_product_access_order_product_full_uidx
ON public.product_access(order_id, product_id);

CREATE UNIQUE INDEX IF NOT EXISTS cashi_purchases_order_full_uidx
ON public.purchases(order_id);

-- PostgreSQL ON CONFLICT(column_list) cannot infer a partial unique index
-- unless the INSERT also supplies a matching conflict predicate. These
-- full unique indexes are therefore intentional and match the settlement
-- ON CONFLICT targets exactly.
CREATE UNIQUE INDEX IF NOT EXISTS cashi_wallet_transactions_user_reference_full_uidx
ON public.wallet_transactions(user_id, reference);

CREATE UNIQUE INDEX IF NOT EXISTS cashi_transactions_user_reference_full_uidx
ON public.transactions(user_id, reference);

CREATE UNIQUE INDEX IF NOT EXISTS cashi_product_access_order_product_full_uidx
ON public.product_access(order_id, product_id);

CREATE UNIQUE INDEX IF NOT EXISTS cashi_purchases_order_full_uidx
ON public.purchases(order_id);

-- 3) Ensure platform earnings has the key used by settlement.
CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  gross_amount numeric(18,2) NOT NULL CHECK (gross_amount >= 0),
  creator_amount numeric(18,2) NOT NULL CHECK (creator_amount >= 0),
  platform_amount numeric(18,2) NOT NULL CHECK (platform_amount >= 0),
  status text NOT NULL DEFAULT 'recognized',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Final settlement function. The last definition is intentional:
--    this is the H+2 / 70% creator settlement version.
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
  v_plan public.account_plan_catalog%ROWTYPE;
  v_paid_at timestamptz;
BEGIN
  SELECT * INTO o
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

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

  -- Account-plan purchase: settle from the server-side catalog only.
  -- Never trust the browser-supplied price/duration for entitlement.
  IF o.item_type='account_plan' THEN
    BEGIN
      v_paid_at := coalesce(o.paid_at,now());
      SELECT * INTO v_plan
      FROM public.account_plan_catalog c
      WHERE c.plan_code=lower(btrim(coalesce(o.item_id,'')))
        AND c.is_active=true
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_PLAN';
      END IF;

      IF round(coalesce(o.amount,0),0) <> round(coalesce(v_plan.price,0),0) THEN
        RAISE EXCEPTION 'INVALID_PLAN_AMOUNT';
      END IF;

      IF lower(o.item_id)='premium' THEN
        UPDATE public.profiles
        SET is_premium=true,
            subscription_plan=NULL,
            subscription_started_at=NULL,
            subscription_until=NULL,
            updated_at=now()
        WHERE id=o.buyer_id;
      ELSE
        IF v_plan.duration_days IS NULL OR v_plan.duration_days <= 0 THEN
          RAISE EXCEPTION 'INVALID_PLAN_DURATION';
        END IF;

        UPDATE public.profiles
        SET is_premium=false,
            subscription_plan=v_plan.plan_code,
            subscription_started_at=v_paid_at,
            subscription_until=v_paid_at + make_interval(days => v_plan.duration_days),
            updated_at=now()
        WHERE id=o.buyer_id;
      END IF;

      INSERT INTO public.purchases(
        buyer_id,product_id,order_id,item_type,item_id,item_title,amount,status
      )
      SELECT o.buyer_id,NULL,o.id,o.item_type,o.item_id,o.item_title,o.amount,'completed'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.purchases WHERE order_id=o.id
      );

      RETURN true;
    END;
  END IF;

  creator_amount := round(coalesce(o.amount,0)*0.70,2);
  platform_amount := round(coalesce(o.amount,0)-creator_amount,2);
  available_at := coalesce(o.paid_at,now()) + interval '48 hours';

  -- Idempotency guard: one purchase/order is settled only once.
  IF NOT EXISTS (SELECT 1 FROM public.purchases WHERE order_id=o.id) THEN

    SELECT coalesce(w.balance,0)
    INTO before_balance
    FROM public.wallets w
    WHERE w.user_id=o.seller_id
    FOR UPDATE;

    INSERT INTO public.wallets(
      user_id,balance,available_balance,pending_balance
    )
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
    )
    VALUES(
      o.seller_id,'sale_earning',creator_amount,
      before_balance,before_balance+creator_amount,
      'cashi-order:'||o.id::text,'pending',available_at,'H2'
    )
    ON CONFLICT(user_id,reference) DO NOTHING;

    INSERT INTO public.transactions(
      user_id,amount,fee,net_amount,type,status,reference,description
    )
    VALUES(
      o.seller_id,creator_amount,0,creator_amount,
      'sale_earning','pending','cashi-order:'||o.id::text,
      'Creator 70% — settlement H+2 (48 jam)'
    )
    ON CONFLICT(user_id,reference) DO NOTHING;

    INSERT INTO public.platform_earnings(
      order_id,gross_amount,creator_amount,platform_amount,status
    )
    VALUES(o.id,o.amount,creator_amount,platform_amount,'recognized')
    ON CONFLICT(order_id) DO NOTHING;

    INSERT INTO public.purchases(
      buyer_id,product_id,order_id,item_type,item_id,item_title,amount,status
    )
    VALUES(
      o.buyer_id,o.product_id,o.id,o.item_type,o.item_id,
      o.item_title,o.amount,'completed'
    )
    ON CONFLICT(order_id) DO NOTHING;

    IF o.product_id IS NOT NULL THEN
      INSERT INTO public.product_access(
        order_id,product_id,buyer_id,delivery_url
      )
      VALUES(o.id,o.product_id,o.buyer_id,NULL)
      ON CONFLICT(order_id,product_id) DO NOTHING;
    END IF;

    IF lower(coalesce(o.item_type,'')) IN ('product','code') THEN
      UPDATE public.products
      SET sales_count=sales_count+1,updated_at=now()
      WHERE id=o.product_id;
    ELSIF lower(coalesce(o.item_type,''))='telegram_product' THEN
      UPDATE public.telegram_products
      SET sales_count=sales_count+1,updated_at=now()
      WHERE id=o.product_id;
    ELSIF lower(coalesce(o.item_type,'')) IN
      ('channel','telegram_channel','telegram-channel','group','telegram_group','telegram-group') THEN
      UPDATE public.telegram_channels
      SET sales_count=sales_count+1,updated_at=now()
      WHERE id=o.product_id;
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


COMMIT;

/* ---------------------------------------------------------------------------
   PASTELE COMMENT RPC CONTRACT
   Uses existing public.content_comments; JS must not need direct table writes.
--------------------------------------------------------------------------- */
BEGIN;

CREATE OR REPLACE FUNCTION public.add_content_comment(
  p_target_id uuid,
  p_target_type text,
  p_body text,
  p_guest_token text DEFAULT NULL,
  p_display_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  uid uuid := auth.uid();
  body_clean text := btrim(coalesce(p_body,''));
  token text := btrim(coalesce(p_guest_token,''));
  display text := nullif(btrim(coalesce(p_display_name,'')), '');
  cid uuid;
BEGIN
  IF p_target_id IS NULL THEN RAISE EXCEPTION 'CONTENT_REQUIRED'; END IF;
  IF body_clean='' THEN RAISE EXCEPTION 'COMMENT_REQUIRED'; END IF;
  IF length(body_clean)>2000 THEN RAISE EXCEPTION 'COMMENT_TOO_LONG'; END IF;

  IF uid IS NULL AND length(token)<16 THEN
    RAISE EXCEPTION 'GUEST_TOKEN_REQUIRED';
  END IF;

  INSERT INTO public.content_comments(
    target_id,target_type,user_id,body,guest_token,display_name
  ) VALUES (
    p_target_id,lower(btrim(p_target_type)),uid,body_clean,
    CASE WHEN uid IS NULL THEN token ELSE NULL END,
    coalesce(display, CASE WHEN uid IS NULL THEN 'Guest' ELSE 'User' END)
  )
  RETURNING id INTO cid;

  RETURN jsonb_build_object('ok',true,'comment_id',cid);
END;
$$;


CREATE OR REPLACE FUNCTION public.get_content_comments(
  p_target_id uuid,
  p_target_type text,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
  FROM (
    SELECT id,user_id,guest_token,body,display_name,created_at
    FROM public.content_comments
    WHERE target_id=p_target_id
      AND target_type=lower(btrim(p_target_type))
    ORDER BY created_at DESC
    LIMIT greatest(1,least(coalesce(p_limit,100),100))
  ) x;
$$;


COMMIT;

/* Canonical engagement counter RPC used by product/detail pages. */
BEGIN;
CREATE OR REPLACE FUNCTION public.get_content_engagement_counts(
  p_target_id uuid,
  p_target_type text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
    RETURN jsonb_build_object('views',0,'likes',0,'comments',0,'shares',0,'sales_count',0);
  END IF;

  SELECT count(*) INTO v_likes
  FROM public.content_likes
  WHERE target_id=p_target_id AND lower(target_type)=t;

  SELECT count(*) INTO v_comments
  FROM public.content_comments
  WHERE target_id=p_target_id AND lower(target_type)=t;

  SELECT count(*) INTO v_views
  FROM public.analytics_events
  WHERE target_id=p_target_id AND lower(target_type)=t AND event_type='view';

  SELECT count(*) INTO v_shares
  FROM public.analytics_events
  WHERE target_id=p_target_id AND lower(target_type)=t AND event_type='share';

  IF t IN ('product','link','code') THEN
    SELECT coalesce(sales_count,0),coalesce(views,0)
      INTO v_sales,v_views FROM public.products WHERE id=p_target_id;
  ELSIF t IN ('telegram_product','telegram-product') THEN
    SELECT coalesce(sales_count,0),coalesce(views,0)
      INTO v_sales,v_views FROM public.telegram_products WHERE id=p_target_id;
  ELSIF t IN ('channel','group','telegram_channel','telegram-channel','telegram_group','telegram-group') THEN
    SELECT coalesce(sales_count,0),coalesce(views,0)
      INTO v_sales,v_views FROM public.telegram_channels WHERE id=p_target_id;
  ELSIF t IN ('pastelink','paste-link','paste_link') THEN
    SELECT coalesce(sales_count,0),coalesce(views,0)
      INTO v_sales,v_views FROM public.pastelinks WHERE id=p_target_id;
  ELSIF t='paste' THEN
    SELECT coalesce(views,0) INTO v_views FROM public.pastes WHERE id=p_target_id;
  END IF;

  RETURN jsonb_build_object(
    'views',coalesce(v_views,0),
    'likes',coalesce(v_likes,0),
    'comments',coalesce(v_comments,0),
    'shares',coalesce(v_shares,0),
    'sales_count',coalesce(v_sales,0)
  );
END;
$$;
COMMIT;

/* ============================================================================
   PASTELE NOTIFICATION EVENTS
   BUY/SOLD -> creator + buyer
   PUBLISH   -> creator
   WITHDRAW  -> user
   ============================================================================ */

BEGIN;

CREATE OR REPLACE FUNCTION public.pastele_create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  nid uuid;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  /* Adapt to the canonical notifications table used by this project.
     The INSERT is dynamic because older unified schemas can differ in the
     optional payload/read columns. */
  IF to_regclass('public.notifications') IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    INSERT INTO public.notifications(user_id,type,title,message,data)
    VALUES(p_user_id,p_type,p_title,p_message,coalesce(p_data,'{}'::jsonb))
    RETURNING id INTO nid;
    RETURN nid;
  EXCEPTION WHEN undefined_column THEN
    BEGIN
      INSERT INTO public.notifications(user_id,type,title,message)
      VALUES(p_user_id,p_type,p_title,p_message)
      RETURNING id INTO nid;
      RETURN nid;
    EXCEPTION WHEN undefined_column THEN
      BEGIN
        INSERT INTO public.notifications(user_id,type,title,body)
        VALUES(p_user_id,p_type,p_title,p_message)
        RETURNING id INTO nid;
        RETURN nid;
      EXCEPTION WHEN undefined_column THEN
        RETURN NULL;
      END;
    END;
  END;
END
$$;


CREATE OR REPLACE FUNCTION public.pastele_notify_publish(
  p_owner_id uuid,
  p_content_id uuid,
  p_content_type text,
  p_title text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
  RETURN public.pastele_create_notification(
    p_owner_id,
    'publish',
    'Konten berhasil dipublikasikan',
    'Konten "'||coalesce(p_title,'Konten')||'" berhasil dipublikasikan di marketplace.',
    jsonb_build_object(
      'event','publish',
      'content_id',p_content_id,
      'content_type',p_content_type
    )
  );
END
$$;


CREATE OR REPLACE FUNCTION public.pastele_notify_purchase(
  p_creator_id uuid,
  p_buyer_id uuid,
  p_content_id uuid,
  p_content_type text,
  p_title text,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  creator_nid uuid;
  buyer_nid uuid;
BEGIN
  creator_nid := public.pastele_create_notification(
    p_creator_id,
    'sale',
    'Konten terjual',
    'Konten "'||coalesce(p_title,'Konten')||'" telah dibeli. Pendapatan creator 70%: Rp'||to_char(round(coalesce(p_amount,0)*0.70),'FM999G999G999G990'),
    jsonb_build_object(
      'event','purchase',
      'content_id',p_content_id,
      'content_type',p_content_type,
      'amount',p_amount,
      'creator_share',round(coalesce(p_amount,0)*0.70,2),
      'platform_fee',round(coalesce(p_amount,0)*0.30,2)
    )
  );

  IF p_buyer_id IS NOT NULL THEN
    buyer_nid := public.pastele_create_notification(
      p_buyer_id,
      'purchase',
      'Pembelian berhasil',
      'Pembelian "'||coalesce(p_title,'Konten')||'" berhasil.',
      jsonb_build_object(
        'event','purchase',
        'content_id',p_content_id,
        'content_type',p_content_type,
        'amount',p_amount
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'creator_notification_id',creator_nid,
    'buyer_notification_id',buyer_nid
  );
END
$$;


CREATE OR REPLACE FUNCTION public.pastele_notify_withdraw(
  p_user_id uuid,
  p_withdrawal_id uuid,
  p_status text,
  p_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  label text;
BEGIN
  label := CASE lower(coalesce(p_status,'pending'))
    WHEN 'approved' THEN 'Withdrawal disetujui'
    WHEN 'paid' THEN 'Withdrawal berhasil dibayar'
    WHEN 'rejected' THEN 'Withdrawal ditolak'
    WHEN 'cancelled' THEN 'Withdrawal dibatalkan'
    ELSE 'Withdrawal dibuat'
  END;

  RETURN public.pastele_create_notification(
    p_user_id,
    'withdraw',
    label,
    'Permintaan WD sebesar Rp'||to_char(round(coalesce(p_amount,0)),'FM999G999G999G990')||
      ' berstatus '||lower(coalesce(p_status,'pending'))||'.',
    jsonb_build_object(
      'event','withdraw',
      'withdrawal_id',p_withdrawal_id,
      'status',lower(coalesce(p_status,'pending')),
      'amount',p_amount
    )
  );
END
$$;


COMMIT;

/* ============================================================================
   PASTELE FULL-FIX EXTENSION: SOCIAL LINKS / GROUP CHAT / ADMIN SETTINGS
   Existing core purchase/view/like RPCs remain untouched.
============================================================================ */
BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL UNIQUE,
  url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,platform)
);

ALTER TABLE public.platform_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_social_public_read ON public.platform_social_links;
CREATE POLICY platform_social_public_read ON public.platform_social_links
FOR SELECT TO anon,authenticated USING(is_active=true);

DROP POLICY IF EXISTS user_social_public_read ON public.user_social_links;
CREATE POLICY user_social_public_read ON public.user_social_links
FOR SELECT TO anon,authenticated USING(is_active=true);

DROP POLICY IF EXISTS user_social_owner_write ON public.user_social_links;
CREATE POLICY user_social_owner_write ON public.user_social_links
FOR ALL TO authenticated
USING(user_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK(user_id=auth.uid() OR public.is_current_user_admin());

/* Password-reset contact is a setting controlled by admin. */
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_settings_public_read ON public.platform_settings;
CREATE POLICY platform_settings_public_read ON public.platform_settings
FOR SELECT TO anon,authenticated
USING(key IN ('telegram_admin_username','forgot_password_url'));

DROP POLICY IF EXISTS platform_settings_admin_write ON public.platform_settings;
CREATE POLICY platform_settings_admin_write ON public.platform_settings
FOR ALL TO authenticated
USING(public.is_current_user_admin())
WITH CHECK(public.is_current_user_admin());

/* Group chat: room + membership + messages. */
CREATE TABLE IF NOT EXISTS public.pastele_chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pastele_chat_room_members (
  room_id uuid NOT NULL REFERENCES public.pastele_chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_id,user_id)
);

CREATE TABLE IF NOT EXISTS public.pastele_chat_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.pastele_chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pastele_room_messages
ON public.pastele_chat_room_messages(room_id,created_at DESC);

ALTER TABLE public.pastele_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastele_chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastele_chat_room_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pastele_room_public_read ON public.pastele_chat_rooms;
CREATE POLICY pastele_room_public_read ON public.pastele_chat_rooms
FOR SELECT TO anon,authenticated USING(is_public=true OR owner_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS pastele_room_member_read ON public.pastele_chat_room_members;
CREATE POLICY pastele_room_member_read ON public.pastele_chat_room_members
FOR SELECT TO authenticated USING(
  user_id=auth.uid() OR EXISTS(
    SELECT 1 FROM public.pastele_chat_rooms r
    WHERE r.id=room_id AND (r.owner_id=auth.uid() OR public.is_current_user_admin())
  )
);

DROP POLICY IF EXISTS pastele_room_member_insert ON public.pastele_chat_room_members;
CREATE POLICY pastele_room_member_insert ON public.pastele_chat_room_members
FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());

DROP POLICY IF EXISTS pastele_room_message_read ON public.pastele_chat_room_messages;
CREATE POLICY pastele_room_message_read ON public.pastele_chat_room_messages
FOR SELECT TO authenticated USING(
  EXISTS(
    SELECT 1 FROM public.pastele_chat_room_members m
    WHERE m.room_id=room_id AND m.user_id=auth.uid()
  )
);

DROP POLICY IF EXISTS pastele_room_message_insert ON public.pastele_chat_room_messages;
CREATE POLICY pastele_room_message_insert ON public.pastele_chat_room_messages
FOR INSERT TO authenticated WITH CHECK(
  sender_id=auth.uid() AND EXISTS(
    SELECT 1 FROM public.pastele_chat_room_members m
    WHERE m.room_id=room_id AND m.user_id=auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.pastele_create_chat_room(
  p_name text,p_description text DEFAULT NULL,p_is_public boolean DEFAULT false
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE uid uuid:=auth.uid(); rid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF btrim(coalesce(p_name,''))='' THEN RAISE EXCEPTION 'ROOM_NAME_REQUIRED'; END IF;
  INSERT INTO public.pastele_chat_rooms(owner_id,name,description,is_public)
  VALUES(uid,btrim(p_name),NULLIF(btrim(coalesce(p_description,'')),''),coalesce(p_is_public,false))
  RETURNING id INTO rid;
  INSERT INTO public.pastele_chat_room_members(room_id,user_id,role)
  VALUES(rid,uid,'owner');
  RETURN rid;
END $$;


CREATE OR REPLACE FUNCTION public.pastele_join_chat_room(p_room_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.pastele_chat_rooms WHERE id=p_room_id AND is_public=true)
    AND NOT EXISTS(SELECT 1 FROM public.pastele_chat_room_members WHERE room_id=p_room_id AND user_id=auth.uid())
    THEN RAISE EXCEPTION 'ROOM_NOT_PUBLIC'; END IF;
  INSERT INTO public.pastele_chat_room_members(room_id,user_id)
  VALUES(p_room_id,auth.uid()) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;


COMMIT;


-- ============================================================
-- FINAL GUEST ORDER FIX
-- One guest identity/token may purchase MULTIPLE different items.
-- The old unique index on guest_access_token alone incorrectly
-- blocked the second item with the same guest token.
-- Keep uniqueness per guest + product + item type instead.
-- ============================================================
BEGIN;

DROP INDEX IF EXISTS public.orders_guest_access_token_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS orders_guest_access_token_product_uidx
ON public.orders(guest_access_token, product_id, item_type)
WHERE guest_access_token IS NOT NULL
  AND product_id IS NOT NULL
  AND item_type IS NOT NULL;

-- Re-define the canonical guest checkout RPC so repeated clicks
-- return the existing pending order for the SAME item, while the
-- same guest token can create orders for OTHER items.
CREATE OR REPLACE FUNCTION public.buy_market_item_guest(
  p_type text,
  p_id uuid,
  p_guest_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  normalized text:=lower(btrim(coalesce(p_type,'')));
  tok text:=btrim(coalesce(p_guest_token,''));
  seller uuid;
  title text;
  price numeric;
  oid uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN public.buy_market_item(p_type,p_id);
  END IF;

  IF length(tok)<32 THEN
    RAISE EXCEPTION 'GUEST_TOKEN_REQUIRED';
  END IF;

  IF normalized IN ('product','link') THEN
    SELECT coalesce(p.creator_id,p.seller_id),p.title,p.price
      INTO seller,title,price
    FROM public.products p
    WHERE p.id=p_id AND p.status IN ('published','active');
    normalized:='product';

  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.owner_id,p.title,p.price
      INTO seller,title,price
    FROM public.telegram_products p
    WHERE p.id=p_id AND p.status IN ('published','active');
    normalized:='telegram_product';

  ELSIF normalized IN ('channel','telegram_channel','telegram-channel',
                       'group','telegram_group','telegram-group') THEN
    SELECT p.owner_id,p.name,p.price
      INTO seller,title,price
    FROM public.telegram_channels p
    WHERE p.id=p_id AND p.status IN ('published','active');
    normalized:='channel';

  ELSIF normalized IN ('pastelink','paste-link','paste_link') THEN
    SELECT p.user_id,p.title,p.price
      INTO seller,title,price
    FROM public.pastelinks p
    WHERE p.id=p_id
      AND p.visibility='public'
      AND (p.expires_at IS NULL OR p.expires_at>now());
    normalized:='pastelink';

  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF seller IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  IF coalesce(price,0)<=0 THEN
    RAISE EXCEPTION 'PRODUCT_IS_FREE';
  END IF;

  IF price<2000 OR price>100000 OR mod(price,1000)<>0 THEN
    RAISE EXCEPTION 'INVALID_PRICE';
  END IF;

  -- Same guest + same item: reuse the existing unpaid order.
  SELECT o.id
    INTO oid
  FROM public.orders o
  WHERE o.guest_access_token=tok
    AND o.product_id=p_id
    AND lower(coalesce(o.item_type,''))=normalized
    AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid')
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF oid IS NULL THEN
    BEGIN
      INSERT INTO public.orders(
        buyer_id,seller_id,product_id,amount,status,
        item_type,item_id,item_title,guest_access_token
      )
      VALUES(
        NULL,seller,p_id,price,'pending',
        normalized,p_id::text,title,tok
      )
      RETURNING id INTO oid;
    EXCEPTION WHEN unique_violation THEN
      -- Race-safe retry: another request created the same guest/item
      -- order between our SELECT and INSERT.
      SELECT o.id
        INTO oid
      FROM public.orders o
      WHERE o.guest_access_token=tok
        AND o.product_id=p_id
        AND lower(coalesce(o.item_type,''))=normalized
        AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid')
      ORDER BY o.created_at DESC
      LIMIT 1;

      IF oid IS NULL THEN
        RAISE;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'order_id',oid,
    'amount',price,
    'item_title',title,
    'item_type',normalized,
    'guest_token',tok
  );
END;
$$;


COMMIT;


-- Guest repeat purchase behavior:
-- A successful guest order is NOT treated as permanent ownership by the
-- public view page. The frontend requires purchase_access=1 on the immediate
-- payment-success redirect. A normal public URL therefore remains purchasable.


-- Marketplace public access / filtering helpers
CREATE INDEX IF NOT EXISTS idx_products_marketplace_public
  ON public.products(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_products_marketplace_public
  ON public.telegram_products(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_channels_marketplace_public
  ON public.telegram_channels(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pastelinks_marketplace_public
  ON public.pastelinks(visibility, expires_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pastes_marketplace_public
  ON public.pastes(visibility, created_at DESC);

-- Keep PasteLink access fields normalized.
UPDATE public.pastelinks
SET access_type = CASE
  WHEN coalesce(price,0) > 0 THEN 'paid'
  ELSE 'free'
END
WHERE access_type IS NULL
   OR lower(access_type) NOT IN ('free','paid');


GRANT SELECT ON public.marketplace_public TO anon, authenticated;


-- ============================================================
-- PASTELINK PASSWORD MASTER FIX
-- - Supports password-protected PasteLinks.
-- - Replaces the old 8-argument RPC with a 9-argument version.
-- - Stores only a SHA-256 password hash from the frontend.
-- - Safe to re-run.
-- ============================================================

DROP FUNCTION IF EXISTS public.create_pastelink_content(
  text,text,text,text,numeric,text,text[],timestamptz
);




-- Final transaction boundary.

-- ============================================================
-- PASTELE FINAL PASTELINK POLICY
-- GUEST -> FREE / FREE + PASSWORD
-- LOGIN -> FREE / PASSWORD / PAID / PAID + PASSWORD
-- PAID -> SERVER-SIDE LOGIN REQUIRED
-- ============================================================

ALTER TABLE public.pastelinks
  ALTER COLUMN user_id DROP NOT NULL;

DROP FUNCTION IF EXISTS public.create_pastelink_content(
  text,text,text,text,numeric,text,text[],timestamptz
);

-- ============================================================
-- PasTele canonical create_pastelink_content
-- Exact signature is dropped first so input parameter names can be changed
-- safely under PostgreSQL (fix for SQLSTATE 42P13).
-- ============================================================
DROP FUNCTION IF EXISTS public.create_pastelink_content(
    text,text,text,text,numeric,text,text[],timestamptz,text
);

CREATE OR REPLACE FUNCTION public.create_pastelink_content(
    p_title text,
    p_content text,
    p_slug text,
    p_access_type text DEFAULT 'free',
    p_price numeric DEFAULT 0,
    p_description text DEFAULT '',
    p_tags text[] DEFAULT '{}',
    p_expires_at timestamptz DEFAULT NULL,
    p_password text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  a text := lower(btrim(coalesce(p_access_type,'free')));
  pr numeric := coalesce(p_price,0);
  ph text := CASE
    WHEN nullif(btrim(coalesce(p_password,'')),'') IS NULL THEN NULL
    ELSE encode(extensions.digest(convert_to(btrim(p_password), 'UTF8'), 'sha256'), 'hex')
  END;
  r public.pastelinks;
BEGIN
  IF btrim(coalesce(p_title,''))='' OR btrim(coalesce(p_content,''))='' THEN
    RAISE EXCEPTION 'TITLE_AND_CONTENT_REQUIRED';
  END IF;

  IF a NOT IN ('free','paid') THEN
    RAISE EXCEPTION 'INVALID_ACCESS_TYPE';
  END IF;

  -- Paid PasteLink tidak boleh dibuat oleh Guest.
  IF a='paid' AND uid IS NULL THEN
    RAISE EXCEPTION 'LOGIN_REQUIRED_FOR_PAID';
  END IF;

  IF a='free' THEN
    pr := 0;
  ELSE
    IF pr < 2000 OR pr > 100000 OR mod(pr,1000) <> 0 THEN
      RAISE EXCEPTION 'INVALID_PAID_PRICE';
    END IF;
  END IF;

  -- Password opsional untuk Free maupun Paid.
  -- Password diterima sebagai plaintext hanya di RPC HTTPS ini dan langsung
  -- di-hash server-side; hash tidak lagi dikirim dari browser.
  IF p_password IS NOT NULL AND length(btrim(p_password)) > 200 THEN
    RAISE EXCEPTION 'PASSWORD_TOO_LONG';
  END IF;

  INSERT INTO public.pastelinks(
    user_id,slug,title,content_html,visibility,password_hash,expires_at,
    description,tags,allow_comments,allow_download,show_raw,anonymous,views,
    access_type,price
  )
  VALUES(
    uid,btrim(p_slug),btrim(p_title),p_content,'public',ph,p_expires_at,
    coalesce(p_description,''),coalesce(p_tags,'{}'),
    true,true,true,(uid IS NULL),0,a,pr
  )
  RETURNING * INTO r;

  RETURN jsonb_build_object(
    'ok',true,
    'id',r.id,
    'slug',r.slug,
    'access_type',r.access_type,
    'price',r.price,
    'has_password',(r.password_hash IS NOT NULL),
    'is_guest',(uid IS NULL)
  );
END
$$;



DROP POLICY IF EXISTS pastelinks_owner_or_public ON public.pastelinks;

CREATE POLICY pastelinks_owner_or_public
ON public.pastelinks
FOR SELECT TO anon,authenticated
USING (
  (user_id IS NOT NULL AND user_id=auth.uid())
  OR public.is_current_user_admin()
  OR (visibility='public' AND lower(coalesce(access_type,'free'))='free')
);

-- ============================================================
-- END PASTELINK GUEST/PASSWORD/PAID LOGIN FIX
-- ============================================================


/* =====================================================================
   PasTele / Bdicodebot — FINAL CANONICAL COMPATIBILITY + SECURITY LAYER
   2026-09-18
   Purpose:
   - Keep the existing source schema/RLS/business logic intact.
   - Add missing frontend RPC contracts.
   - Make password verification server-side.
   - Normalize notification/engagement helpers.
   - Keep Supabase Auth responsible for passwords.
   - No plaintext passwords are stored in public.profiles.
   ===================================================================== */

begin;

create extension if not exists pgcrypto;

alter table if exists public.notifications
  add column if not exists notification_type text not null default 'system',
  add column if not exists link_url text,
  add column if not exists target_type text,
  add column if not exists target_id text;

create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, is_read, created_at desc);

create index if not exists idx_pastelinks_slug on public.pastelinks(slug);
create index if not exists idx_pastelinks_user_created on public.pastelinks(user_id, created_at desc);
create index if not exists idx_products_seller_created on public.products(seller_id, created_at desc);
create index if not exists idx_telegram_products_owner_created on public.telegram_products(owner_id, created_at desc);
create index if not exists idx_telegram_channels_owner_created on public.telegram_channels(owner_id, created_at desc);
create index if not exists idx_orders_buyer_created on public.orders(buyer_id, created_at desc);
create index if not exists idx_orders_seller_created on public.orders(seller_id, created_at desc);
create index if not exists idx_purchases_buyer_created on public.purchases(buyer_id, created_at desc);
create index if not exists idx_chat_messages_group_created on public.chat_messages(group_id, created_at desc);
create index if not exists idx_followers_creator on public.creator_followers(creator_id, created_at desc);
create index if not exists idx_likes_target on public.content_likes(target_type, target_id, created_at desc);
create index if not exists idx_views_product_created on public.product_views(product_id, created_at desc);
create index if not exists idx_analytics_owner_created on public.analytics_events(owner_id, created_at desc);

-- Safe account resolver. Email is resolved through auth_email only.
create or replace function public.resolve_login_identifier(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v text := lower(btrim(coalesce(p_identifier,'')));
  r record;
begin
  if v = '' then
    return jsonb_build_object('found',false);
  end if;

  select p.id, p.username, p.auth_email, p.display_name, p.avatar_url,
         p.role, p.is_admin, p.is_banned, p.is_premium, p.subscription_until
    into r
  from public.profiles p
  where lower(p.username)=v or lower(p.auth_email)=v
  limit 1;

  if not found then
    return jsonb_build_object('found',false);
  end if;

  return jsonb_build_object(
    'found',true,
    'id',r.id,
    'username',r.username,
    'auth_email',r.auth_email,
    'display_name',r.display_name,
    'avatar_url',r.avatar_url,
    'role',r.role,
    'is_admin',coalesce(r.is_admin,false),
    'is_banned',coalesce(r.is_banned,false),
    'is_premium',coalesce(r.is_premium,false),
    'subscription_until',r.subscription_until
  );
end;
$$;


-- Server-side PasteLink password verification.
-- The browser receives only has_password, never password_hash.
create or replace function public.verify_pastelink_password(
  p_pastelink_id uuid,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_input text;
begin
  if p_pastelink_id is null or p_password is null then
    return false;
  end if;

  select password_hash into v_hash
  from public.pastelinks
  where id = p_pastelink_id
  limit 1;

  if v_hash is null or btrim(v_hash) = '' then
    return true;
  end if;

  v_input := encode(extensions.digest(convert_to(p_password, 'UTF8'), 'sha256'), 'hex');
  return lower(v_input) = lower(v_hash);
end;
$$;


create or replace function public.get_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
  w record;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok',false,'error','AUTH_REQUIRED');
  end if;

  select * into r from public.profiles where id=auth.uid();
  if not found then
    return jsonb_build_object('ok',false,'error','PROFILE_NOT_FOUND');
  end if;

  select * into w from public.wallets where user_id=auth.uid();

  return jsonb_build_object(
    'ok',true,
    'profile',jsonb_build_object(
      'id',r.id,'username',r.username,'auth_email',r.auth_email,
      'display_name',r.display_name,'avatar_url',r.avatar_url,
      'role',r.role,'is_admin',r.is_admin,'is_banned',r.is_banned,
      'balance',coalesce(r.balance,0),
      'is_premium',r.is_premium,
      'subscription_until',r.subscription_until
    ),
    'wallet',jsonb_build_object(
      'balance',coalesce(w.balance,0),
      'available_balance',coalesce(w.available_balance,0),
      'pending_balance',coalesce(w.pending_balance,0)
    )
  );
end;
$$;


create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.notifications
     set is_read=true
   where id=p_notification_id and user_id=auth.uid();
  return found;
end;
$$;


create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare n integer;
begin
  update public.notifications set is_read=true
   where user_id=auth.uid() and is_read=false;
  get diagnostics n = row_count;
  return n;
end;
$$;


create or replace function public.notify_user_once(
  p_user_id uuid,
  p_title text,
  p_body text default '',
  p_notification_type text default 'system',
  p_link_url text default null,
  p_target_type text default null,
  p_target_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_id uuid;
begin
  if p_user_id is null then return null; end if;

  select id into v_id
    from public.notifications
   where user_id=p_user_id
     and title=coalesce(p_title,'')
     and body=coalesce(p_body,'')
     and created_at > now() - interval '30 seconds'
   order by created_at desc
   limit 1;

  if v_id is not null then return v_id; end if;

  insert into public.notifications(
    user_id,title,body,notification_type,link_url,target_type,target_id
  ) values (
    p_user_id,coalesce(p_title,''),coalesce(p_body,''),
    coalesce(p_notification_type,'system'),p_link_url,p_target_type,p_target_id
  )
  returning id into v_id;

  return v_id;
end;
$$;


-- Canonical account tier: premium > subscription > free.
create or replace function public.current_account_tier(p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select case
    when p.is_premium then 'premium'
    when p.subscription_until is not null and p.subscription_until > now() then 'subscription'
    else 'free'
  end
  from public.profiles p
  where p.id = p_user_id;
$$;


-- Canonical withdrawal policy.
create or replace function public.get_withdrawal_limits()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  tier text;
begin
  tier := coalesce(public.current_account_tier(auth.uid()),'free');

  return jsonb_build_object(
    'tier',tier,
    'manual_min',100000,
    'manual_fee',7000,
    'instant_min',50000,
    'instant_max',250000,
    'instant_fee',15000,
    'manual_daily_requests',
      case tier when 'premium' then 5 when 'subscription' then 2 else 1 end,
    'instant_daily_limit',
      case tier when 'premium' then 500000 when 'subscription' then 300000 else 100000 end
  );
end;
$$;


-- Seed core quests idempotently.
insert into public.quests(code,title,description,event_type,target_count,reward,is_active)
values
 ('profile_visit_1','Lengkapi profil','Kunjungi dan lengkapi profil.', 'profile_visit',1,500,true),
 ('like_3','Berikan 3 Like','Berikan like pada konten marketplace.', 'like',3,500,true),
 ('view_5','Lihat 5 Konten','Lihat lima konten marketplace.', 'view',5,500,true),
 ('share_2','Bagikan 2 Konten','Bagikan dua konten.', 'share',2,500,true),
 ('follow_1','Follow Creator','Ikuti satu creator.', 'follow',1,1000,true),
 ('purchase_1','Pembelian Pertama','Selesaikan satu pembelian.', 'purchase',1,2000,true)
on conflict(code) do update set
 title=excluded.title,
 description=excluded.description,
 event_type=excluded.event_type,
 target_count=excluded.target_count,
 reward=excluded.reward,
 is_active=excluded.is_active,
 updated_at=now();

-- Public forum seed.
insert into public.chat_groups(name,slug,description,is_public)
values
 ('PasTele Community','pastele-community','Forum komunitas PasTele untuk diskusi dan bantuan.',true)
on conflict(slug) do update set
 name=excluded.name,
 description=excluded.description,
 is_public=true,
 updated_at=now();

commit;


-- ============================================================
-- PasTele canonical username login resolver
-- ============================================================


DROP FUNCTION IF EXISTS public.get_public_marketplace();
CREATE FUNCTION public.get_public_marketplace()
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  type text,
  access_type text,
  price numeric,
  thumbnail_url text,
  description text,
  views bigint,
  sales_count bigint,
  category text,
  created_at timestamptz,
  creator_name text,
  creator_username text,
  owner_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.slug,
    p.title,
    coalesce(p.type, 'link')::text,
    lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END))::text,
    coalesce(p.price,0)::numeric,
    p.thumbnail_url,
    p.description,
    coalesce(p.views,0)::bigint,
    coalesce(p.sales_count,0)::bigint,
    p.category,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    coalesce(p.creator_id,p.seller_id)
  FROM public.products p
  LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
  WHERE p.status IN ('published','active')

  UNION ALL

  SELECT
    p.id,
    p.slug,
    p.title,
    'code'::text,
    lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END))::text,
    coalesce(p.price,0)::numeric,
    p.thumbnail_url,
    p.description,
    coalesce(p.views,0)::bigint,
    coalesce(p.sales_count,0)::bigint,
    p.category,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    p.owner_id
  FROM public.telegram_products p
  LEFT JOIN public.profiles pr ON pr.id=p.owner_id
  WHERE p.status IN ('published','active')

  UNION ALL

  SELECT
    p.id,
    p.slug,
    p.name::text,
    CASE WHEN lower(coalesce(p.type,'channel'))='group' THEN 'group' ELSE 'channel' END::text,
    lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END))::text,
    coalesce(p.price,0)::numeric,
    NULL::text,
    p.description,
    coalesce(p.views,0)::bigint,
    coalesce(p.sales_count,0)::bigint,
    p.category,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    p.owner_id
  FROM public.telegram_channels p
  LEFT JOIN public.profiles pr ON pr.id=p.owner_id
  WHERE p.status IN ('published','active')

  UNION ALL

  SELECT
    p.id,
    p.slug,
    p.title,
    'pastelink'::text,
    lower(coalesce(p.access_type, CASE WHEN coalesce(p.price,0) > 0 THEN 'paid' ELSE 'free' END))::text,
    coalesce(p.price,0)::numeric,
    NULL::text,
    p.description,
    coalesce(p.views,0)::bigint,
    0::bigint,
    'General'::text,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    p.user_id
  FROM public.pastelinks p
  LEFT JOIN public.profiles pr ON pr.id=p.user_id
  WHERE p.visibility='public'
    AND (p.expires_at IS NULL OR p.expires_at>now())

  UNION ALL

  SELECT
    p.id,
    p.slug,
    p.title,
    'paste'::text,
    'free'::text,
    0::numeric,
    NULL::text,
    left(coalesce(p.content,''),180),
    0::bigint,
    0::bigint,
    'General'::text,
    p.created_at,
    pr.display_name::text,
    pr.username::text,
    p.owner_id
  FROM public.pastes p
  LEFT JOIN public.profiles pr ON pr.id=p.owner_id
  WHERE p.visibility='public'

  ORDER BY created_at DESC
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.get_public_marketplace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace() TO anon, authenticated;


-- IMPORTANT:
-- Run this AFTER the canonical database has created the source tables.
-- Do not add a public SELECT policy to public.pastelinks just to make
-- paid PasteLinks appear; that would expose protected table columns.




-- Canonical username login resolver used by the latest login JS.
CREATE OR REPLACE FUNCTION public.resolve_username_login(p_username text)
RETURNS TABLE(username text,auth_email text,is_banned boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public, extensions
AS $$
  SELECT p.username,p.auth_email,coalesce(p.is_banned,false)
  FROM public.profiles p
  WHERE lower(btrim(p.username))=lower(btrim(coalesce(p_username,'')))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_username_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_username_login(text) TO anon,authenticated;
/* ============================================================================
   PasTele — FINAL ADMIN MANAGEMENT LAYER
   2026-09-22
   This section is intentionally appended after the canonical database so the
   admin contracts below are the final definitions used by the web panel.

   Admin capabilities:
   - secure admin access check
   - users / ban / admin flag / delete / password reset / balance
   - all content families + owner username + content body
   - edit title/price/status/slug/content
   - orders / manual paid / status / delete
   - payments
   - withdrawals / approve / reject + reason + user notification
   - transactions / delete
   - approved bots / edit / delete / activate
   ============================================================================ */
BEGIN;

-- --------------------------------------------------------------------------
-- Admin access check used by admin/js/core.js and admin/login/js/login.js.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_access_check()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public, extensions
AS $$
DECLARE r public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','login');
  END IF;

  SELECT * INTO r FROM public.profiles WHERE id=auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'reason','profile_not_found');
  END IF;

  IF coalesce(r.is_banned,false) THEN
    RETURN jsonb_build_object('ok',false,'reason','banned','id',r.id,'username',r.username);
  END IF;

  IF NOT (coalesce(r.is_admin,false) OR lower(coalesce(r.role,'')) IN ('admin','owner')) THEN
    RETURN jsonb_build_object('ok',false,'reason','not_admin','id',r.id,'username',r.username);
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'id',r.id,
    'username',r.username,
    'auth_email',r.auth_email,
    'display_name',r.display_name,
    'role',r.role,
    'is_admin',coalesce(r.is_admin,false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_access_check() TO authenticated;

-- --------------------------------------------------------------------------
-- Admin content list: includes owner username and protected content body only
-- for the authenticated administrator. telegram_channels uses invite_url;
-- it has no content column.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_content(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path=public, extensions
AS $$
  SELECT to_jsonb(x)
  FROM (
    SELECT p.id,p.title,p.slug,p.price,p.status,p.description,
      p.content AS content_body,
      coalesce(p.views,0)::bigint AS views,coalesce(p.sales_count,0)::bigint AS sales_count,
      coalesce(p.creator_id,p.seller_id) AS owner_id,
      pr.username AS owner_username,pr.auth_email AS owner_email,
      'products'::text AS source,coalesce(p.type,'product')::text AS type,
      lower(coalesce(p.access_type,case when coalesce(p.price,0)>0 then 'paid' else 'free' end))::text AS access_type,
      p.thumbnail_url,p.created_at,p.updated_at
    FROM public.products p LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)

    UNION ALL

    SELECT pl.id,pl.title,pl.slug,coalesce(pl.price,0)::numeric,
      CASE WHEN lower(coalesce(pl.visibility,'public'))='public' THEN 'published' ELSE lower(pl.visibility) END,
      pl.description,pl.content_html AS content_body,
      coalesce(pl.views,0)::bigint,0::bigint,pl.user_id,
      pr.username,pr.auth_email,
      'pastelinks'::text,'pastelink'::text,
      lower(coalesce(pl.access_type,case when coalesce(pl.price,0)>0 then 'paid' else 'free' end))::text,
      NULL::text,pl.created_at,pl.updated_at
    FROM public.pastelinks pl LEFT JOIN public.profiles pr ON pr.id=pl.user_id

    UNION ALL

    SELECT tp.id,tp.title,tp.slug,coalesce(tp.price,0)::numeric,tp.status,tp.description,
      tp.content AS content_body,coalesce(tp.views,0)::bigint,coalesce(tp.sales_count,0)::bigint,tp.owner_id,
      pr.username,pr.auth_email,'telegram_products'::text,'code'::text,
      lower(coalesce(tp.access_type,case when coalesce(tp.price,0)>0 then 'paid' else 'free' end))::text,
      tp.thumbnail_url,tp.created_at,tp.updated_at
    FROM public.telegram_products tp LEFT JOIN public.profiles pr ON pr.id=tp.owner_id

    UNION ALL

    SELECT tc.id,tc.name AS title,tc.slug,coalesce(tc.price,0)::numeric,tc.status,tc.description,
      tc.invite_url AS content_body,coalesce(tc.views,0)::bigint,coalesce(tc.sales_count,0)::bigint,tc.owner_id,
      pr.username,pr.auth_email,'telegram_channels'::text,
      CASE WHEN lower(coalesce(tc.type,'channel'))='group' THEN 'group' ELSE 'channel' END,
      lower(coalesce(tc.access_type,case when coalesce(tc.price,0)>0 then 'paid' else 'free' end))::text,
      NULL::text,tc.created_at,tc.updated_at
    FROM public.telegram_channels tc LEFT JOIN public.profiles pr ON pr.id=tc.owner_id

    UNION ALL

    SELECT ps.id,ps.title,ps.slug,0::numeric,
      CASE WHEN lower(coalesce(ps.visibility,'public'))='public' THEN 'published' ELSE lower(ps.visibility) END,
      NULL::text,ps.content AS content_body,0::bigint,0::bigint,ps.owner_id,
      pr.username,pr.auth_email,'pastes'::text,'paste'::text,'free'::text,
      NULL::text,ps.created_at,ps.updated_at
    FROM public.pastes ps LEFT JOIN public.profiles pr ON pr.id=ps.owner_id
  ) x
  WHERE public.is_current_user_admin()
  ORDER BY x.created_at DESC
  LIMIT greatest(1,least(coalesce(p_limit,500),500))
  OFFSET greatest(coalesce(p_offset,0),0);
$$;

GRANT EXECUTE ON FUNCTION public.admin_content(integer,integer) TO authenticated;

-- --------------------------------------------------------------------------
-- Delete user + auth account. Protected against deleting self/admin/owner.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public, extensions
AS $$
DECLARE target public.profiles%ROWTYPE; deleted_id uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_user IS NULL THEN RAISE EXCEPTION 'USER_ID_REQUIRED'; END IF;
  IF p_user=auth.uid() THEN RAISE EXCEPTION 'CANNOT_DELETE_SELF'; END IF;
  SELECT * INTO target FROM public.profiles WHERE id=p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF coalesce(target.is_admin,false) OR lower(coalesce(target.role,''))='owner' THEN
    RAISE EXCEPTION 'ADMIN_OR_OWNER_CANNOT_BE_DELETED';
  END IF;

  INSERT INTO public.admin_logs(admin_id,action,target_id,details)
  VALUES(auth.uid(),'admin_delete_user',p_user,jsonb_build_object('username',target.username,'auth_email',target.auth_email));

  DELETE FROM auth.users WHERE id=p_user RETURNING id INTO deleted_id;
  IF deleted_id IS NULL THEN RAISE EXCEPTION 'AUTH_USER_NOT_FOUND'; END IF;
  RETURN jsonb_build_object('ok',true,'id',deleted_id,'username',target.username,'auth_email',target.auth_email);
END;
$$;

-- --------------------------------------------------------------------------
-- Admin password reset. Password is never stored in profiles/plaintext.
-- Supabase Auth stores the bcrypt hash in auth.users.encrypted_password.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_password(p_user uuid,p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public, extensions, auth
AS $$
DECLARE u public.profiles%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_user IS NULL OR p_password IS NULL OR length(p_password)<6 THEN RAISE EXCEPTION 'INVALID_PASSWORD'; END IF;
  SELECT * INTO u FROM public.profiles WHERE id=p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF coalesce(u.is_admin,false) OR lower(coalesce(u.role,''))='owner' THEN
    RAISE EXCEPTION 'ADMIN_OR_OWNER_PASSWORD_PROTECTED';
  END IF;

  UPDATE auth.users
     SET encrypted_password=extensions.crypt(p_password,extensions.gen_salt('bf')),
         updated_at=now()
   WHERE id=p_user;

  IF NOT FOUND THEN RAISE EXCEPTION 'AUTH_USER_NOT_FOUND'; END IF;
  INSERT INTO public.admin_logs(admin_id,action,target_id,details)
  VALUES(auth.uid(),'admin_set_user_password',p_user,jsonb_build_object('username',u.username));
  RETURN jsonb_build_object('ok',true,'id',p_user,'username',u.username);
END;
$$;

-- --------------------------------------------------------------------------
-- Content editor with body/content support.
-- 8-argument overload is added so existing 7-argument callers remain valid.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_content(
 p_id uuid,p_status text DEFAULT NULL,p_title text DEFAULT NULL,p_description text DEFAULT NULL,
 p_source text DEFAULT 'products',p_slug text DEFAULT NULL,p_price numeric DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE r jsonb; src text:=lower(coalesce(p_source,'products')); vprice numeric;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 vprice:=coalesce(p_price,0);
 IF p_price IS NOT NULL AND p_price<>0 AND (p_price<2000 OR p_price>100000 OR mod(p_price,1000)<>0) THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
 CASE src
  WHEN 'products' THEN
    UPDATE public.products SET status=coalesce(p_status,status),title=coalesce(p_title,title),description=coalesce(p_description,description),slug=coalesce(nullif(btrim(p_slug),''),slug),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,updated_at=now() WHERE id=p_id RETURNING to_jsonb(products.*) INTO r;
  WHEN 'pastelinks' THEN
    UPDATE public.pastelinks SET visibility=CASE WHEN p_status='published' THEN 'public' WHEN p_status IS NULL THEN visibility ELSE p_status END,title=coalesce(p_title,title),description=coalesce(p_description,description),slug=coalesce(nullif(btrim(p_slug),''),slug),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,updated_at=now() WHERE id=p_id RETURNING to_jsonb(pastelinks.*) INTO r;
  WHEN 'telegram_products' THEN
    UPDATE public.telegram_products SET status=coalesce(p_status,status),title=coalesce(p_title,title),description=coalesce(p_description,description),slug=coalesce(nullif(btrim(p_slug),''),slug),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,updated_at=now() WHERE id=p_id RETURNING to_jsonb(telegram_products.*) INTO r;
  WHEN 'telegram_channels' THEN
    UPDATE public.telegram_channels SET status=coalesce(p_status,status),name=coalesce(p_title,name),description=coalesce(p_description,description),slug=coalesce(nullif(btrim(p_slug),''),slug),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,updated_at=now() WHERE id=p_id RETURNING to_jsonb(telegram_channels.*) INTO r;
  WHEN 'pastes' THEN
    UPDATE public.pastes SET visibility=CASE WHEN p_status='published' THEN 'public' WHEN p_status IS NULL THEN visibility ELSE p_status END,title=coalesce(p_title,title),slug=coalesce(nullif(btrim(p_slug),''),slug),updated_at=now() WHERE id=p_id RETURNING to_jsonb(pastes.*) INTO r;
  ELSE RAISE EXCEPTION 'UNSUPPORTED_CONTENT_SOURCE';
 END CASE;
 IF r IS NULL THEN RAISE EXCEPTION 'CONTENT_NOT_FOUND'; END IF;
 RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_content(
 p_id uuid,p_status text DEFAULT NULL,p_title text DEFAULT NULL,p_description text DEFAULT NULL,
 p_source text DEFAULT 'products',p_slug text DEFAULT NULL,p_price numeric DEFAULT NULL,p_content text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE r jsonb; src text:=lower(coalesce(p_source,'products')); new_price numeric;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_price IS NOT NULL AND p_price<>0 AND (p_price<2000 OR p_price>100000 OR mod(p_price,1000)<>0) THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
 CASE src
  WHEN 'products' THEN UPDATE public.products SET status=coalesce(p_status,status),title=coalesce(p_title,title),description=coalesce(p_description,description),slug=coalesce(nullif(btrim(p_slug),''),slug),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,content=coalesce(p_content,content),updated_at=now() WHERE id=p_id RETURNING to_jsonb(products.*) INTO r;
  WHEN 'pastelinks' THEN UPDATE public.pastelinks SET visibility=CASE WHEN p_status='published' THEN 'public' WHEN p_status IS NULL THEN visibility ELSE p_status END,title=coalesce(p_title,title),description=coalesce(p_description,description),slug=coalesce(nullif(btrim(p_slug),''),slug),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,content_html=coalesce(p_content,content_html),updated_at=now() WHERE id=p_id RETURNING to_jsonb(pastelinks.*) INTO r;
  WHEN 'telegram_products' THEN UPDATE public.telegram_products SET status=coalesce(p_status,status),title=coalesce(p_title,title),description=coalesce(p_description,description),slug=coalesce(nullif(btrim(p_slug),''),slug),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,content=coalesce(p_content,content),updated_at=now() WHERE id=p_id RETURNING to_jsonb(telegram_products.*) INTO r;
  WHEN 'telegram_channels' THEN UPDATE public.telegram_channels SET status=coalesce(p_status,status),name=coalesce(p_title,name),description=coalesce(p_description,description),slug=coalesce(nullif(btrim(p_slug),''),slug),price=coalesce(p_price,price),access_type=CASE WHEN coalesce(p_price,price)=0 THEN 'free' ELSE 'paid' END,invite_url=coalesce(nullif(btrim(p_content),''),invite_url),updated_at=now() WHERE id=p_id RETURNING to_jsonb(telegram_channels.*) INTO r;
  WHEN 'pastes' THEN UPDATE public.pastes SET visibility=CASE WHEN p_status='published' THEN 'public' WHEN p_status IS NULL THEN visibility ELSE p_status END,title=coalesce(p_title,title),slug=coalesce(nullif(btrim(p_slug),''),slug),content=coalesce(p_content,content),updated_at=now() WHERE id=p_id RETURNING to_jsonb(pastes.*) INTO r;
  ELSE RAISE EXCEPTION 'UNSUPPORTED_CONTENT_SOURCE';
 END CASE;
 IF r IS NULL THEN RAISE EXCEPTION 'CONTENT_NOT_FOUND'; END IF;
 RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_content(p_id uuid,p_source text DEFAULT 'products')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 CASE lower(coalesce(p_source,'products'))
  WHEN 'products' THEN DELETE FROM public.products WHERE id=p_id;
  WHEN 'pastelinks' THEN DELETE FROM public.pastelinks WHERE id=p_id;
  WHEN 'telegram_products' THEN DELETE FROM public.telegram_products WHERE id=p_id;
  WHEN 'telegram_channels' THEN DELETE FROM public.telegram_channels WHERE id=p_id;
  WHEN 'pastes' THEN DELETE FROM public.pastes WHERE id=p_id;
  ELSE RAISE EXCEPTION 'UNSUPPORTED_CONTENT_SOURCE';
 END CASE;
END;
$$;

-- --------------------------------------------------------------------------
-- Orders / payments / transactions with username/email.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_orders(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT to_jsonb(x) FROM (
   SELECT o.*,bp.username AS buyer_username,bp.auth_email AS buyer_email,sp.username AS seller_username,sp.auth_email AS seller_email
   FROM public.orders o LEFT JOIN public.profiles bp ON bp.id=o.buyer_id LEFT JOIN public.profiles sp ON sp.id=o.seller_id
   WHERE public.is_current_user_admin() ORDER BY o.created_at DESC
   LIMIT greatest(1,least(coalesce(p_limit,500),500)) OFFSET greatest(coalesce(p_offset,0),0)
 ) x;
$$;

CREATE OR REPLACE FUNCTION public.admin_payments(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT to_jsonb(x) FROM (
   SELECT p.*,u.username,u.auth_email,o.item_title,o.item_type,o.status AS order_status
   FROM public.payments p LEFT JOIN public.profiles u ON u.id=p.user_id LEFT JOIN public.orders o ON o.id=p.order_id
   WHERE public.is_current_user_admin() ORDER BY p.created_at DESC
   LIMIT greatest(1,least(coalesce(p_limit,500),500)) OFFSET greatest(coalesce(p_offset,0),0)
 ) x;
$$;

CREATE OR REPLACE FUNCTION public.admin_transactions(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT to_jsonb(x) FROM (
   SELECT t.*,u.username,u.auth_email
   FROM public.transactions t LEFT JOIN public.profiles u ON u.id=t.user_id
   WHERE public.is_current_user_admin() ORDER BY t.created_at DESC
   LIMIT greatest(1,least(coalesce(p_limit,500),500)) OFFSET greatest(coalesce(p_offset,0),0)
 ) x;
$$;

CREATE OR REPLACE FUNCTION public.admin_withdrawals(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public, extensions AS $$
 SELECT to_jsonb(x) FROM (
   SELECT w.*,u.username,u.auth_email
   FROM public.withdrawals w LEFT JOIN public.profiles u ON u.id=w.user_id
   WHERE public.is_current_user_admin() ORDER BY w.created_at DESC
   LIMIT greatest(1,least(coalesce(p_limit,500),500)) OFFSET greatest(coalesce(p_offset,0),0)
 ) x;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id uuid,p_status text,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE r public.orders;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF lower(coalesce(p_status,'')) NOT IN ('pending','paid','success','completed','failed','cancelled','rejected','settled') THEN RAISE EXCEPTION 'INVALID_ORDER_STATUS'; END IF;
 UPDATE public.orders SET status=lower(p_status),payment_reference=coalesce(payment_reference,p_note),paid_at=CASE WHEN lower(p_status) IN ('paid','success','completed','settled') THEN coalesce(paid_at,now()) ELSE paid_at END WHERE id=p_order_id RETURNING * INTO r;
 IF r.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 RETURN to_jsonb(r);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_order(p_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 DELETE FROM public.orders WHERE id=p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_transaction(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 DELETE FROM public.transactions WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'TRANSACTION_NOT_FOUND'; END IF;
 RETURN true;
END;
$$;

-- --------------------------------------------------------------------------
-- Withdrawal processing + refund + notification with rejection reason.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(p_id uuid,p_status text,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE w public.withdrawals%ROWTYPE; old_status text; refund numeric:=0; title text; body text;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF lower(coalesce(p_status,'')) NOT IN ('pending','approved','rejected','completed','cancelled') THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_STATUS'; END IF;
 IF lower(p_status) IN ('rejected','cancelled') AND nullif(btrim(coalesce(p_note,'')),'') IS NULL THEN RAISE EXCEPTION 'REJECTION_REASON_REQUIRED'; END IF;
 SELECT * INTO w FROM public.withdrawals WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND'; END IF;
 old_status:=lower(coalesce(w.status,''));
 UPDATE public.withdrawals SET status=lower(p_status),note=coalesce(p_note,note),processed_at=CASE WHEN lower(p_status) IN ('approved','rejected','completed','cancelled') THEN now() ELSE processed_at END WHERE id=p_id RETURNING * INTO w;

 IF lower(p_status) IN ('rejected','cancelled') AND old_status NOT IN ('rejected','cancelled') THEN
   refund:=coalesce(w.amount,0)+coalesce(w.fee,0);
   UPDATE public.wallets SET balance=balance+refund,available_balance=available_balance+refund,updated_at=now() WHERE user_id=w.user_id;
   UPDATE public.profiles SET balance=balance+refund,updated_at=now() WHERE id=w.user_id;
   INSERT INTO public.transactions(user_id,amount,fee,net_amount,type,status,reference,description)
   VALUES(w.user_id,-coalesce(w.fee,0),-coalesce(w.fee,0),-coalesce(w.fee,0),'withdrawal_fee_refund','completed','withdrawal-fee-refund:'||w.id::text,'Refund WD fee')
   ON CONFLICT(user_id,reference) DO NOTHING;
 END IF;

 IF lower(p_status) IN ('rejected','cancelled') THEN
   title:=CASE WHEN lower(p_status)='rejected' THEN 'Withdrawal ditolak' ELSE 'Withdrawal dibatalkan' END;
   body:='Permintaan withdrawal #'||w.id::text||' ditolak/dibatalkan.'||E'\nAlasan: '||coalesce(w.note,'-');
 ELSE
   title:=CASE WHEN lower(p_status) IN ('approved','completed') THEN 'Withdrawal diproses' ELSE 'Withdrawal diperbarui' END;
   body:='Status withdrawal #'||w.id::text||': '||lower(p_status)||coalesce(E'\nCatatan: '||p_note,'');
 END IF;
 IF w.user_id IS NOT NULL AND (old_status IS DISTINCT FROM lower(p_status)) THEN
   INSERT INTO public.notifications(user_id,title,body,is_read) VALUES(w.user_id,title,body,false);
 END IF;
 RETURN to_jsonb(w);
END;
$$;

-- --------------------------------------------------------------------------
-- Balance adjustment and bots: explicit admin grants.
-- --------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.admin_users(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_orders(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_payments(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_withdrawals(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transactions(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_content(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_content(uuid,text,text,text,text,text,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_content(uuid,text,text,text,text,text,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_content(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_access_check() TO authenticated;

COMMIT;


/* ============================================================================
   CANONICAL FINAL HARDENING PATCH — 2026-09-22
   - Bot request/approval is part of the canonical master.
   - Missing marketplace RPCs are restored.
   - Profile visit notification is restored.
   - Pending wallet detail contract is restored.
   - RLS is enabled for user-owned data and public content.
   - Owner/admin CRUD is enforced by PostgreSQL, not only by frontend filters.
   ============================================================================ */

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Bot request / approval
-- --------------------------------------------------------------------------
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

ALTER TABLE public.bot_requests
  ADD COLUMN IF NOT EXISTS bot_name text,
  ADD COLUMN IF NOT EXISTS bot_id bigint,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS approved_bot_id uuid REFERENCES public.approved_bots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS bot_requests_status_created_idx
  ON public.bot_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS bot_requests_requester_created_idx
  ON public.bot_requests(requester_id, created_at DESC);

ALTER TABLE public.bot_requests DROP CONSTRAINT IF EXISTS bot_requests_status_check;
ALTER TABLE public.bot_requests
  ADD CONSTRAINT bot_requests_status_check
  CHECK (status IN ('pending','approved','rejected'));

ALTER TABLE public.bot_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bot_requests_owner_read ON public.bot_requests;
CREATE POLICY bot_requests_owner_read ON public.bot_requests
FOR SELECT TO authenticated
USING (requester_id=auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS bot_requests_owner_insert ON public.bot_requests;
CREATE POLICY bot_requests_owner_insert ON public.bot_requests
FOR INSERT TO authenticated
WITH CHECK (requester_id=auth.uid());

DROP POLICY IF EXISTS bot_requests_admin_update ON public.bot_requests;
CREATE POLICY bot_requests_admin_update ON public.bot_requests
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
SET search_path=public,extensions
AS $$
DECLARE
  uid uuid:=auth.uid();
  clean_username text:=lower(regexp_replace(btrim(coalesce(p_username,'')),'^@',''));
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
  WHERE lower(bot_username)=clean_username
     OR (p_bot_id IS NOT NULL AND bot_id=p_bot_id)
  LIMIT 1;

  IF existing.id IS NOT NULL AND existing.is_active THEN
    RAISE EXCEPTION 'BOT_ALREADY_APPROVED';
  END IF;

  SELECT * INTO pending
  FROM public.bot_requests
  WHERE requester_id=uid
    AND lower(bot_username)=clean_username
    AND status='pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF pending.id IS NOT NULL THEN RAISE EXCEPTION 'BOT_REQUEST_PENDING'; END IF;

  INSERT INTO public.bot_requests(
    requester_id,bot_username,bot_name,bot_id,note,status
  )
  VALUES(
    uid,clean_username,
    nullif(btrim(coalesce(p_bot_name,'')),''),
    p_bot_id,
    nullif(btrim(coalesce(p_note,'')),''),
    'pending'
  )
  RETURNING * INTO result;

  RETURN jsonb_build_object(
    'ok',true,'id',result.id,'status',result.status,
    'bot_username',result.bot_username
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
SET search_path=public,extensions
AS $$
  SELECT jsonb_build_object(
    'id',r.id,'requester_id',r.requester_id,
    'username',p.username,'auth_email',p.auth_email,
    'bot_username',r.bot_username,'bot_name',r.bot_name,'bot_id',r.bot_id,
    'note',r.note,'status',r.status,'admin_note',r.admin_note,
    'approved_bot_id',r.approved_bot_id,
    'created_at',r.created_at,'reviewed_at',r.reviewed_at
  )
  FROM public.bot_requests r
  LEFT JOIN public.profiles p ON p.id=r.requester_id
  WHERE public.is_current_user_admin()
  ORDER BY CASE WHEN r.status='pending' THEN 0 ELSE 1 END,r.created_at DESC
  LIMIT greatest(1,least(coalesce(p_limit,100),500))
  OFFSET greatest(coalesce(p_offset,0),0);
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_bot_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  r public.bot_requests;
  b public.approved_bots;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;

  SELECT * INTO r FROM public.bot_requests WHERE id=p_request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'BOT_REQUEST_NOT_FOUND'; END IF;

  IF r.status='approved' AND r.approved_bot_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok',true,'status','approved','approved_bot_id',r.approved_bot_id
    );
  END IF;

  SELECT * INTO b
  FROM public.approved_bots
  WHERE lower(bot_username)=lower(r.bot_username)
     OR (r.bot_id IS NOT NULL AND bot_id=r.bot_id)
  ORDER BY CASE WHEN lower(bot_username)=lower(r.bot_username) THEN 0 ELSE 1 END
  LIMIT 1;

  IF b.id IS NULL THEN
    INSERT INTO public.approved_bots(bot_username,bot_name,bot_id,is_active)
    VALUES(r.bot_username,r.bot_name,r.bot_id,true)
    RETURNING * INTO b;
  ELSE
    UPDATE public.approved_bots
    SET bot_username=r.bot_username,
        bot_name=coalesce(r.bot_name,bot_name),
        bot_id=coalesce(r.bot_id,bot_id),
        is_active=true,
        updated_at=now()
    WHERE id=b.id
    RETURNING * INTO b;
  END IF;

  UPDATE public.bot_requests
  SET status='approved',approved_bot_id=b.id,admin_note=NULL,reviewed_at=now()
  WHERE id=r.id;

  INSERT INTO public.notifications(user_id,title,body,is_read)
  VALUES(
    r.requester_id,'Bot disetujui',
    'Bot @'||r.bot_username||
    ' sudah disetujui admin dan sekarang tersedia di Create Code.',
    false
  );

  RETURN jsonb_build_object(
    'ok',true,'status','approved',
    'approved_bot_id',b.id,'bot_username',b.bot_username
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
SET search_path=public,extensions
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
    r.requester_id,'Pengajuan bot ditolak',
    'Pengajuan bot @'||r.bot_username||
    CASE WHEN btrim(coalesce(p_reason,''))<>''
         THEN ' ditolak. Alasan: '||btrim(p_reason)
         ELSE ' ditolak oleh admin.' END,
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

-- --------------------------------------------------------------------------
-- 2. Authenticated marketplace checkout RPC.
--    Permanent account purchase is reused; subscription/premium is respected.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buy_market_item(
  p_type text,
  p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  uid uuid:=auth.uid();
  normalized text:=lower(btrim(coalesce(p_type,'')));
  seller uuid;
  title text;
  price numeric;
  access jsonb;
  existing_order uuid;
  existing_purchase uuid;
  pid uuid:=p_id;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF pid IS NULL THEN RAISE EXCEPTION 'PRODUCT_ID_REQUIRED'; END IF;

  IF normalized IN ('product','link') THEN
    SELECT coalesce(p.creator_id,p.seller_id),p.title,p.price
    INTO seller,title,price
    FROM public.products p
    WHERE p.id=pid AND p.status IN ('published','active','live');
    normalized:='product';

  ELSIF normalized IN ('code','telegram_product','telegram-product') THEN
    SELECT p.owner_id,p.title,p.price
    INTO seller,title,price
    FROM public.telegram_products p
    WHERE p.id=pid AND p.status IN ('published','active','live');
    normalized:='telegram_product';

  ELSIF normalized IN (
    'channel','telegram_channel','telegram-channel',
    'group','telegram_group','telegram-group'
  ) THEN
    SELECT p.owner_id,p.name,p.price
    INTO seller,title,price
    FROM public.telegram_channels p
    WHERE p.id=pid AND p.status IN ('published','active','live');
    normalized:='channel';

  ELSIF normalized IN ('pastelink','paste-link','paste_link','paste') THEN
    SELECT p.user_id,p.title,p.price
    INTO seller,title,price
    FROM public.pastelinks p
    WHERE p.id=pid
      AND p.visibility='public'
      AND (p.expires_at IS NULL OR p.expires_at>now());
    normalized:='pastelink';

  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_PRODUCT_TYPE';
  END IF;

  IF seller IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF seller=uid THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_PRODUCT'; END IF;
  IF coalesce(price,0)<=0 THEN RAISE EXCEPTION 'PRODUCT_IS_FREE'; END IF;
  IF price<2000 OR price>100000 OR mod(price,1000)<>0 THEN
    RAISE EXCEPTION 'INVALID_PRICE';
  END IF;

  SELECT pu.id INTO existing_purchase
  FROM public.purchases pu
  WHERE pu.buyer_id=uid
    AND pu.product_id=pid
    AND lower(coalesce(pu.status,'')) IN ('completed','paid','success')
  ORDER BY pu.created_at DESC
  LIMIT 1;

  IF existing_purchase IS NOT NULL THEN
    RETURN jsonb_build_object(
      'already_owned',true,
      'can_access',true,
      'purchase_id',existing_purchase,
      'item_type',normalized,
      'product_id',pid
    );
  END IF;

  access:=public.paid_access_policy(uid);
  IF coalesce((access->>'full_access')::boolean,false) THEN
    RETURN jsonb_build_object(
      'membership_access',true,'can_access',true,
      'item_type',normalized,'product_id',pid
    );
  END IF;

  SELECT o.id INTO existing_order
  FROM public.orders o
  WHERE o.buyer_id=uid
    AND o.product_id=pid
    AND lower(coalesce(o.item_type,''))=normalized
    AND lower(coalesce(o.status,'')) IN ('pending','waiting','unpaid')
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF existing_order IS NULL THEN
    INSERT INTO public.orders(
      buyer_id,seller_id,product_id,amount,status,item_type,item_id,item_title
    )
    VALUES(
      uid,seller,pid,price,'pending',normalized,pid::text,title
    )
    RETURNING id INTO existing_order;
  END IF;

  RETURN jsonb_build_object(
    'order_id',existing_order,'amount',price,
    'item_title',title,'item_type',normalized,'product_id',pid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.buy_market_item(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buy_market_item(text,uuid) TO authenticated;

-- --------------------------------------------------------------------------
-- 3. Profile visits + notification.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id,visitor_id)
);

ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_visits_owner_read ON public.profile_visits;
CREATE POLICY profile_visits_owner_read ON public.profile_visits
FOR SELECT TO authenticated
USING (profile_id=auth.uid() OR visitor_id=auth.uid() OR public.is_current_user_admin());

DROP FUNCTION IF EXISTS public.notify_profile_visit(uuid);

CREATE OR REPLACE FUNCTION public.notify_profile_visit(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  uid uuid:=auth.uid();
  target_name text;
  inserted boolean:=false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
  IF p_profile_id IS NULL OR p_profile_id=uid THEN
    RETURN jsonb_build_object('ok',true,'notified',false);
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id=p_profile_id AND is_banned=false
  ) THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  INSERT INTO public.profile_visits(profile_id,visitor_id)
  VALUES(p_profile_id,uid)
  ON CONFLICT(profile_id,visitor_id)
  DO UPDATE SET visited_at=now();

  SELECT coalesce(display_name,username,'User')
  INTO target_name
  FROM public.profiles
  WHERE id=uid;

  -- One notification per visitor/profile per day.
  IF NOT EXISTS(
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id=p_profile_id
      AND n.title='Profil dikunjungi'
      AND n.created_at>=date_trunc('day',now())
      AND n.body LIKE '%'||coalesce(target_name,'User')||'%'
  ) THEN
    INSERT INTO public.notifications(user_id,title,body,is_read)
    VALUES(
      p_profile_id,
      'Profil dikunjungi',
      coalesce(target_name,'User')||' mengunjungi profil kamu.',
      false
    );
    inserted:=true;
  END IF;

  RETURN jsonb_build_object('ok',true,'notified',inserted);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_profile_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_profile_visit(uuid) TO authenticated;

-- --------------------------------------------------------------------------
-- 4. Wallet pending-detail RPC retained for contract compatibility.
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_pending_balance_detail();
CREATE OR REPLACE FUNCTION public.get_pending_balance_detail()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
  SELECT jsonb_build_object(
    'ok',true,
    'rows',coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.available_at ASC),'[]'::jsonb),
    'total_pending',coalesce(sum(x.amount),0),
    'count',count(*)
  )
  FROM (
    SELECT wt.id,wt.type,wt.amount,wt.balance_before,wt.balance_after,
           wt.reference,wt.status,wt.available_at,wt.settlement_code,wt.created_at
    FROM public.wallet_transactions wt
    WHERE wt.user_id=auth.uid()
      AND lower(coalesce(wt.status,'pending'))='pending'
      AND wt.available_at IS NOT NULL
    ORDER BY wt.available_at ASC
    LIMIT 100
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_pending_balance_detail() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_balance_detail() TO authenticated;

-- --------------------------------------------------------------------------
-- 5. Public/owner RLS hardening.
-- --------------------------------------------------------------------------
ALTER TABLE public.approved_bots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approved_bots_active_public_read ON public.approved_bots;
CREATE POLICY approved_bots_active_public_read ON public.approved_bots
FOR SELECT TO anon,authenticated
USING (is_active=true OR public.is_current_user_admin());

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
FOR SELECT TO anon,authenticated
USING (
  seller_id=auth.uid()
  OR creator_id=auth.uid()
  OR public.is_current_user_admin()
  OR status IN ('published','active','live')
);
DROP POLICY IF EXISTS products_owner_insert ON public.products;
CREATE POLICY products_owner_insert ON public.products
FOR INSERT TO authenticated
WITH CHECK (seller_id=auth.uid() OR creator_id=auth.uid());
DROP POLICY IF EXISTS products_owner_update ON public.products;
CREATE POLICY products_owner_update ON public.products
FOR UPDATE TO authenticated
USING (seller_id=auth.uid() OR creator_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK (seller_id=auth.uid() OR creator_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS products_owner_delete ON public.products;
CREATE POLICY products_owner_delete ON public.products
FOR DELETE TO authenticated
USING (seller_id=auth.uid() OR creator_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.telegram_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS telegram_products_public_read ON public.telegram_products;
CREATE POLICY telegram_products_public_read ON public.telegram_products
FOR SELECT TO anon,authenticated
USING (owner_id=auth.uid() OR public.is_current_user_admin() OR status IN ('published','active','live'));
DROP POLICY IF EXISTS telegram_products_owner_insert ON public.telegram_products;
CREATE POLICY telegram_products_owner_insert ON public.telegram_products
FOR INSERT TO authenticated
WITH CHECK (owner_id=auth.uid());
DROP POLICY IF EXISTS telegram_products_owner_update ON public.telegram_products;
CREATE POLICY telegram_products_owner_update ON public.telegram_products
FOR UPDATE TO authenticated
USING (owner_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK (owner_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS telegram_products_owner_delete ON public.telegram_products;
CREATE POLICY telegram_products_owner_delete ON public.telegram_products
FOR DELETE TO authenticated
USING (owner_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.telegram_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS telegram_channels_public_read ON public.telegram_channels;
CREATE POLICY telegram_channels_public_read ON public.telegram_channels
FOR SELECT TO anon,authenticated
USING (owner_id=auth.uid() OR public.is_current_user_admin() OR status IN ('published','active','live'));
DROP POLICY IF EXISTS telegram_channels_owner_insert ON public.telegram_channels;
CREATE POLICY telegram_channels_owner_insert ON public.telegram_channels
FOR INSERT TO authenticated
WITH CHECK (owner_id=auth.uid());
DROP POLICY IF EXISTS telegram_channels_owner_update ON public.telegram_channels;
CREATE POLICY telegram_channels_owner_update ON public.telegram_channels
FOR UPDATE TO authenticated
USING (owner_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK (owner_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS telegram_channels_owner_delete ON public.telegram_channels;
CREATE POLICY telegram_channels_owner_delete ON public.telegram_channels
FOR DELETE TO authenticated
USING (owner_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.pastelinks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pastelinks_owner_or_public ON public.pastelinks;
CREATE POLICY pastelinks_owner_or_public ON public.pastelinks
FOR SELECT TO anon,authenticated
USING (
  user_id=auth.uid()
  OR public.is_current_user_admin()
  OR (visibility='public' AND lower(coalesce(access_type,'free'))='free')
);
DROP POLICY IF EXISTS pastelinks_owner_update ON public.pastelinks;
CREATE POLICY pastelinks_owner_update ON public.pastelinks
FOR UPDATE TO authenticated
USING (user_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK (user_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS pastelinks_owner_delete ON public.pastelinks;
CREATE POLICY pastelinks_owner_delete ON public.pastelinks
FOR DELETE TO authenticated
USING (user_id=auth.uid() OR public.is_current_user_admin());

-- Social data can be read publicly; mutations remain RPC-controlled.
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_likes_public_read ON public.content_likes;
CREATE POLICY content_likes_public_read ON public.content_likes
FOR SELECT TO anon,authenticated USING (true);

ALTER TABLE public.creator_followers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS creator_followers_public_read ON public.creator_followers;
CREATE POLICY creator_followers_public_read ON public.creator_followers
FOR SELECT TO anon,authenticated USING (true);

ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;DROP POLICY IF EXISTS comments_authenticated_insert ON public.content_comments;
CREATE POLICY comments_authenticated_insert ON public.content_comments
FOR INSERT TO authenticated
WITH CHECK (
  user_id=auth.uid()
  AND length(btrim(coalesce(body,''))) BETWEEN 1 AND 2000
);
DROP POLICY IF EXISTS comments_owner_delete ON public.content_comments;
CREATE POLICY comments_owner_delete ON public.content_comments
FOR DELETE TO authenticated
USING (user_id=auth.uid() OR public.is_current_user_admin());


DROP POLICY IF EXISTS content_comments_public_read ON public.content_comments;
CREATE POLICY content_comments_public_read ON public.content_comments
FOR SELECT TO anon,authenticated USING (true);

ALTER TABLE public.creator_followers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS creator_followers_owner_insert ON public.creator_followers;
CREATE POLICY creator_followers_owner_insert ON public.creator_followers
FOR INSERT TO authenticated
WITH CHECK (follower_id=auth.uid() AND creator_id<>auth.uid());
DROP POLICY IF EXISTS creator_followers_owner_delete ON public.creator_followers;
CREATE POLICY creator_followers_owner_delete ON public.creator_followers
FOR DELETE TO authenticated
USING (follower_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analytics_events_public_read ON public.analytics_events;
CREATE POLICY analytics_events_public_read ON public.analytics_events
FOR SELECT TO anon,authenticated USING (true);
DROP POLICY IF EXISTS analytics_events_authenticated_insert ON public.analytics_events;
CREATE POLICY analytics_events_authenticated_insert ON public.analytics_events
FOR INSERT TO authenticated
WITH CHECK (actor_id=auth.uid() OR actor_id IS NULL);
DROP POLICY IF EXISTS analytics_events_anon_insert ON public.analytics_events;
CREATE POLICY analytics_events_anon_insert ON public.analytics_events
FOR INSERT TO anon
WITH CHECK (actor_id IS NULL);

-- Account-owned financial/read data.
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wallets_owner_read ON public.wallets;
CREATE POLICY wallets_owner_read ON public.wallets
FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wallet_transactions_owner_read ON public.wallet_transactions;
CREATE POLICY wallet_transactions_owner_read ON public.wallet_transactions
FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactions_owner_read ON public.transactions;
CREATE POLICY transactions_owner_read ON public.transactions
FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS withdrawals_owner_read ON public.withdrawals;
CREATE POLICY withdrawals_owner_read ON public.withdrawals
FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_methods_owner_all ON public.payment_methods;
CREATE POLICY payment_methods_owner_all ON public.payment_methods
FOR ALL TO authenticated
USING (user_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK (user_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_owner_read ON public.notifications;
CREATE POLICY notifications_owner_read ON public.notifications
FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_current_user_admin());
DROP POLICY IF EXISTS notifications_owner_update ON public.notifications;
CREATE POLICY notifications_owner_update ON public.notifications
FOR UPDATE TO authenticated
USING (user_id=auth.uid() OR public.is_current_user_admin())
WITH CHECK (user_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_owner_read ON public.orders;
CREATE POLICY orders_owner_read ON public.orders
FOR SELECT TO authenticated
USING (buyer_id=auth.uid() OR seller_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchases_owner_read ON public.purchases;
CREATE POLICY purchases_owner_read ON public.purchases
FOR SELECT TO authenticated
USING (buyer_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.product_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_access_owner_read ON public.product_access;
CREATE POLICY product_access_owner_read ON public.product_access
FOR SELECT TO authenticated
USING (buyer_id=auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.paid_access_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS paid_access_usage_owner_read ON public.paid_access_usage;
CREATE POLICY paid_access_usage_owner_read ON public.paid_access_usage
FOR SELECT TO authenticated
USING (user_id=auth.uid() OR public.is_current_user_admin());

COMMIT;


/* ============================================================================
   FINAL AUTOMATED CONTRACT CHECKS
   Fails the migration if a JS RPC required by the supplied project is absent.
   ============================================================================ */
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'add_content_comment','admin_access_check','admin_bots','admin_content','admin_logs',
    'admin_orders','admin_pastes','admin_payments','admin_stats','admin_transactions',
    'admin_users','admin_withdrawals','buy_market_item','buy_market_item_guest',
    'check_email_available','check_username_available','create_account_plan_order',
    'create_checkout_order','create_code_content','create_pastelink_content',
    'create_telegram_content','delete_purchase','get_active_approved_bots','get_code_by_slug',
    'get_content_comments','get_content_engagement_counts','get_follow_state',
    'get_market_item_detail','get_market_item_detail_guest','get_order_for_payment',
    'get_pastelink_by_slug','get_pending_balance_detail','get_public_marketplace',
    'get_public_site_settings','get_telegram_content_by_slug','get_withdrawal_limits',
    'increment_paste_view','is_current_user_admin','join_public_chat','mark_chat_read',
    'notify_profile_visit','record_content_view','record_quest_event','release_matured_wallet',
    'request_withdrawal_v2','resolve_login_identifier','resolve_username_login',
    'send_chat_message','set_chat_presence','toggle_chat_reaction','toggle_content_like',
    'toggle_content_like_guest','toggle_creator_follow','track_analytics','verify_pastelink_password'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=fn) THEN
      RAISE EXCEPTION 'FINAL RPC CHECK FAILED: public.% is missing',fn;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='telegram_channels' AND column_name='content'
  ) THEN
    RAISE NOTICE 'telegram_channels.content exists in an existing database; canonical SQL does not use it.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='telegram_channels' AND column_name='invite_url') THEN
    RAISE EXCEPTION 'FINAL SCHEMA CHECK FAILED: telegram_channels.invite_url is missing';
  END IF;
END $$;

-- End of the single canonical PasTele database + admin SQL.



-- ============================================================================
-- FINAL PRODUCTION SECURITY HARDENING — PUBLIC METADATA / PRIVATE PAYLOAD
-- 2026-09-22
--
-- Direct SELECT on marketplace source tables is owner/admin only.
-- Public marketplace metadata is exposed ONLY through SECURITY DEFINER RPCs
-- that return metadata fields and never protected payloads.
-- Paid content/invite URLs are therefore not obtainable through PostgREST
-- table reads by anon/authenticated users.
-- ============================================================================

BEGIN;

-- Public metadata RPC. It deliberately excludes products.content,
-- telegram_products.content, telegram_channels.invite_url and private
-- PasteLink payload fields.
DROP FUNCTION IF EXISTS public.get_marketplace_public(uuid);
CREATE OR REPLACE FUNCTION public.get_marketplace_public(p_owner_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  type text,
  access_type text,
  price numeric,
  thumbnail_url text,
  description text,
  views bigint,
  sales_count bigint,
  category text,
  created_at timestamptz,
  creator_name text,
  creator_username text,
  owner_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public,extensions
AS $$
  SELECT
    p.id,p.slug,p.title,coalesce(p.type,'link'),
    lower(coalesce(p.access_type,CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END)),
    coalesce(p.price,0)::numeric,p.thumbnail_url,p.description,
    coalesce(p.views,0)::bigint,coalesce(p.sales_count,0)::bigint,p.category,
    p.created_at,pr.display_name,pr.username,coalesce(p.creator_id,p.seller_id)
  FROM public.products p
  LEFT JOIN public.profiles pr ON pr.id=coalesce(p.creator_id,p.seller_id)
  WHERE p.status IN ('published','active')
    AND coalesce(pr.is_banned,false)=false
    AND (p_owner_id IS NULL OR coalesce(p.creator_id,p.seller_id)=p_owner_id)

  UNION ALL

  SELECT
    p.id,p.slug,p.title,'code',
    lower(coalesce(p.access_type,CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END)),
    coalesce(p.price,0)::numeric,p.thumbnail_url,p.description,
    coalesce(p.views,0)::bigint,coalesce(p.sales_count,0)::bigint,p.category,
    p.created_at,pr.display_name,pr.username,p.owner_id
  FROM public.telegram_products p
  LEFT JOIN public.profiles pr ON pr.id=p.owner_id
  WHERE p.status IN ('published','active','live')
    AND coalesce(pr.is_banned,false)=false
    AND (p_owner_id IS NULL OR p.owner_id=p_owner_id)

  UNION ALL

  SELECT
    p.id,p.slug,p.name,
    CASE WHEN lower(coalesce(p.type,'channel'))='group' THEN 'group' ELSE 'channel' END,
    lower(coalesce(p.access_type,CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END)),
    coalesce(p.price,0)::numeric,NULL::text,p.description,
    coalesce(p.views,0)::bigint,coalesce(p.sales_count,0)::bigint,p.category,
    p.created_at,pr.display_name,pr.username,p.owner_id
  FROM public.telegram_channels p
  LEFT JOIN public.profiles pr ON pr.id=p.owner_id
  WHERE p.status IN ('published','active','live')
    AND coalesce(pr.is_banned,false)=false
    AND (p_owner_id IS NULL OR p.owner_id=p_owner_id)

  UNION ALL

  SELECT
    p.id,p.slug,p.title,'pastelink',
    lower(coalesce(p.access_type,CASE WHEN coalesce(p.price,0)>0 THEN 'paid' ELSE 'free' END)),
    coalesce(p.price,0)::numeric,NULL::text,p.description,
    coalesce(p.views,0)::bigint,0::bigint,'General'::text,p.created_at,
    pr.display_name,pr.username,p.user_id
  FROM public.pastelinks p
  LEFT JOIN public.profiles pr ON pr.id=p.user_id
  WHERE p.visibility='public'
    AND (p.expires_at IS NULL OR p.expires_at>now())
    AND coalesce(pr.is_banned,false)=false
    AND (p_owner_id IS NULL OR p.user_id=p_owner_id)

  UNION ALL

  SELECT
    p.id,p.slug,p.title,'paste','free'::text,0::numeric,NULL::text,
    left(coalesce(p.content,''),180),
    0::bigint,0::bigint,'General'::text,p.created_at,
    pr.display_name,pr.username,p.owner_id
  FROM public.pastes p
  LEFT JOIN public.profiles pr ON pr.id=p.owner_id
  WHERE p.visibility='public'
    AND coalesce(pr.is_banned,false)=false
    AND (p_owner_id IS NULL OR p.owner_id=p_owner_id)
$$;

REVOKE ALL ON FUNCTION public.get_marketplace_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_marketplace_public(uuid) TO anon,authenticated;

DROP FUNCTION IF EXISTS public.get_public_telegram_product_meta(uuid);
CREATE OR REPLACE FUNCTION public.get_public_telegram_product_meta(p_id uuid)
RETURNS TABLE(id uuid,slug text,access_type text,price numeric,bot_username text,product_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions
AS $$
  SELECT tp.id,tp.slug,tp.access_type,tp.price,tp.bot_username,tp.product_type
  FROM public.telegram_products tp
  JOIN public.profiles pr ON pr.id=tp.owner_id
  WHERE tp.id=p_id
    AND tp.status IN ('published','active','live')
    AND coalesce(pr.is_banned,false)=false
$$;
REVOKE ALL ON FUNCTION public.get_public_telegram_product_meta(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_telegram_product_meta(uuid) TO anon,authenticated;

DROP FUNCTION IF EXISTS public.get_public_telegram_channel_meta(uuid);
CREATE OR REPLACE FUNCTION public.get_public_telegram_channel_meta(p_id uuid)
RETURNS TABLE(id uuid,slug text,username text,name text,type text,description text,access_type text,price numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions
AS $$
  SELECT tc.id,tc.slug,tc.username,tc.name,tc.type,tc.description,tc.access_type,tc.price
  FROM public.telegram_channels tc
  JOIN public.profiles pr ON pr.id=tc.owner_id
  WHERE tc.id=p_id
    AND tc.status IN ('published','active','live')
    AND coalesce(pr.is_banned,false)=false
$$;
REVOKE ALL ON FUNCTION public.get_public_telegram_channel_meta(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_telegram_channel_meta(uuid) TO anon,authenticated;

DROP FUNCTION IF EXISTS public.resolve_telegram_product_slug(text);
CREATE OR REPLACE FUNCTION public.resolve_telegram_product_slug(p_slug text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions
AS $$
  SELECT tp.id
  FROM public.telegram_products tp
  JOIN public.profiles pr ON pr.id=tp.owner_id
  WHERE lower(tp.slug)=lower(btrim(p_slug))
    AND tp.status IN ('published','active','live')
    AND coalesce(pr.is_banned,false)=false
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.resolve_telegram_product_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_telegram_product_slug(text) TO anon,authenticated;

DROP FUNCTION IF EXISTS public.get_my_private_content();
CREATE OR REPLACE FUNCTION public.get_my_private_content()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions
AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;

  RETURN jsonb_build_object(
    'products', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT id,seller_id,creator_id,title,slug,price,thumbnail_url,type,access_type,
               category,description,content,views,sales_count,status,created_at,updated_at
        FROM public.products
        WHERE creator_id=uid OR seller_id=uid
      ) x
    ),'[]'::jsonb),
    'pastelinks', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT id,user_id,slug,title,description,content_html,access_type,price,
               visibility,expires_at,views,created_at,updated_at
        FROM public.pastelinks WHERE user_id=uid
      ) x
    ),'[]'::jsonb),
    'pastes', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT id,owner_id,title,slug,content,visibility,created_at,updated_at
        FROM public.pastes WHERE owner_id=uid
      ) x
    ),'[]'::jsonb),
    'codes', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT id,owner_id,title,slug,type,product_type,access_type,bot_username,
               telegram_bot_id,price,description,content,thumbnail_url,category,status,
               views,sales_count,created_at,updated_at
        FROM public.telegram_products WHERE owner_id=uid
      ) x
    ),'[]'::jsonb),
    'channels', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT id,owner_id,username,name,type,access_type,telegram_channel_id,
               description,invite_url,price,category,status,views,sales_count,
               created_at,updated_at
        FROM public.telegram_channels WHERE owner_id=uid
      ) x
    ),'[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_private_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_private_content() TO authenticated;

-- Lock down direct table reads. Owners/admins keep direct access; public users
-- must use the safe metadata RPCs or the existing secure detail/purchase RPCs.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
FOR SELECT TO anon,authenticated
USING (
  seller_id=auth.uid()
  OR creator_id=auth.uid()
  OR public.is_current_user_admin()
);

ALTER TABLE public.telegram_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS telegram_products_public_read ON public.telegram_products;
CREATE POLICY telegram_products_public_read ON public.telegram_products
FOR SELECT TO anon,authenticated
USING (
  owner_id=auth.uid() OR public.is_current_user_admin()
);

ALTER TABLE public.telegram_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS telegram_channels_public_read ON public.telegram_channels;
CREATE POLICY telegram_channels_public_read ON public.telegram_channels
FOR SELECT TO anon,authenticated
USING (
  owner_id=auth.uid() OR public.is_current_user_admin()
);

COMMIT;
BEGIN;
DROP VIEW IF EXISTS public.marketplace_public;
COMMIT;


/* ============================================================================
   FINAL AUTH / REGISTER / GOOGLE OAUTH HARDENING
   2026-09-22
   - Explicit RPC grants for public username/email availability checks.
   - Ensure every new Supabase Auth user gets a profile + wallet.
   - Google OAuth users receive a collision-safe username when the Google
     provider does not supply one.
   - Existing manually-created usernames are never silently changed.
   ============================================================================ */

BEGIN;

-- Browser registration calls these RPCs before auth.signUp().
REVOKE ALL ON FUNCTION public.check_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.check_email_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_available(text) TO anon, authenticated;

-- Rebuild the Auth user trigger so email/password and Google OAuth both
-- create the required public profile and wallet.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public, extensions
AS $$
DECLARE
  requested text;
  fallback text;
  candidate text;
  suffix integer := 0;
  has_requested_username boolean := false;
BEGIN
  requested := lower(btrim(coalesce(new.raw_user_meta_data->>'username','')));
  requested := regexp_replace(requested,'[^a-z0-9_]','','g');
  has_requested_username := requested <> '';

  IF requested='' THEN
    fallback := lower(split_part(coalesce(new.email,'user'),'@',1));
    requested := regexp_replace(fallback,'[^a-z0-9_]','','g');
  END IF;

  IF requested='' THEN requested:='user'; END IF;
  requested := left(requested,32);
  candidate := requested;

  -- Normal registration explicitly requests a username: do not silently
  -- rename it; the frontend already checked availability.
  IF has_requested_username THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE lower(btrim(coalesce(p.username,'')))=candidate
        AND p.id<>new.id
    ) THEN
      RAISE EXCEPTION 'USERNAME_ALREADY_EXISTS';
    END IF;
  ELSE
    -- Google/OAuth may derive the username from the Gmail local-part.
    -- If that name is taken, make it unique instead of aborting OAuth.
    WHILE EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE lower(btrim(coalesce(p.username,'')))=lower(candidate)
        AND p.id<>new.id
    ) LOOP
      suffix := suffix + 1;
      candidate := left(requested,greatest(1,32-length(suffix::text)-1))
                   || '_' || suffix::text;
    END LOOP;
  END IF;

  INSERT INTO public.profiles(
    id,username,auth_email,display_name
  )
  VALUES(
    new.id,
    candidate,
    lower(btrim(coalesce(new.email,''))),
    coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data->>'display_name','')),''),
      nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name','')),''),
      candidate
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_email=excluded.auth_email,
    display_name=coalesce(nullif(public.profiles.display_name,''),excluded.display_name),
    updated_at=now();

  INSERT INTO public.wallets(
    user_id,balance,available_balance,pending_balance
  )
  VALUES(new.id,0,0,0)
  ON CONFLICT(user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Make sure the trigger function itself is not directly callable by browsers.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

COMMIT;

