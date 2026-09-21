
-- ============================================================
-- PasTele ADMIN PANEL COMPLETE MANAGEMENT FIX 2026-09-22
-- ============================================================
BEGIN;

-- Marketplace manager must see the same content families that
-- marketplace_public exposes: Product, Code, Channel/Group, PasteLink.
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
    SELECT
      p.id,p.title,p.slug,p.price,p.status,p.description,
      coalesce(p.views,0)::bigint AS views,
      coalesce(p.sales_count,0)::bigint AS sales_count,
      p.creator_id,p.seller_id,
      coalesce(p.creator_id,p.seller_id) AS owner_id,
      NULL::uuid AS user_id,
      'products'::text AS source,
      coalesce(p.type,'product')::text AS type,
      coalesce(p.access_type,case when coalesce(p.price,0)>0 then 'paid' else 'free' end)::text AS access_type,
      p.thumbnail_url,p.created_at,p.updated_at
    FROM public.products p

    UNION ALL

    SELECT
      pl.id,pl.title,pl.slug,coalesce(pl.price,0)::numeric,
      CASE WHEN lower(coalesce(pl.visibility,'public'))='public' THEN 'published' ELSE lower(pl.visibility) END,
      pl.description,coalesce(pl.views,0)::bigint,0::bigint,
      NULL::uuid,NULL::uuid,pl.user_id AS owner_id,pl.user_id,
      'pastelinks'::text,'pastelink'::text,
      lower(coalesce(pl.access_type,case when coalesce(pl.price,0)>0 then 'paid' else 'free' end))::text,
      NULL::text,pl.created_at,pl.updated_at
    FROM public.pastelinks pl

    UNION ALL

    SELECT
      tp.id,tp.title,tp.slug,coalesce(tp.price,0)::numeric,tp.status,
      tp.description,coalesce(tp.views,0)::bigint,coalesce(tp.sales_count,0)::bigint,
      NULL::uuid,NULL::uuid,tp.owner_id,NULL::uuid,
      'telegram_products'::text,'code'::text,
      lower(coalesce(tp.access_type,case when coalesce(tp.price,0)>0 then 'paid' else 'free' end))::text,
      tp.thumbnail_url,tp.created_at,tp.updated_at
    FROM public.telegram_products tp

    UNION ALL

    SELECT
      tc.id,tc.name AS title,tc.slug,coalesce(tc.price,0)::numeric,tc.status,
      tc.description,coalesce(tc.views,0)::bigint,coalesce(tc.sales_count,0)::bigint,
      NULL::uuid,NULL::uuid,tc.owner_id,NULL::uuid,
      'telegram_channels'::text,
      CASE WHEN lower(coalesce(tc.type,'channel'))='group' THEN 'group' ELSE 'channel' END,
      lower(coalesce(tc.access_type,case when coalesce(tc.price,0)>0 then 'paid' else 'free' end))::text,
      NULL::text,tc.created_at,tc.updated_at
    FROM public.telegram_channels tc

    UNION ALL

    SELECT
      ps.id,ps.title,ps.slug,0::numeric,
      CASE WHEN lower(coalesce(ps.visibility,'public'))='public' THEN 'published' ELSE lower(ps.visibility) END,
      NULL::text,0::bigint,0::bigint,
      NULL::uuid,NULL::uuid,ps.owner_id,ps.owner_id,
      'pastes'::text,'paste'::text,'free'::text,
      NULL::text,ps.created_at,ps.updated_at
    FROM public.pastes ps
  ) x
  WHERE public.is_current_user_admin()
  ORDER BY x.created_at DESC
  LIMIT greatest(1,least(coalesce(p_limit,500),500))
  OFFSET greatest(coalesce(p_offset,0),0);
$$;

-- Real account deletion. Deleting auth.users cascades to profiles;
-- dependent marketplace rows use the existing ON DELETE SET NULL/CASCADE
-- rules from the canonical schema. Admin/owner accounts are protected.
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public, extensions
AS $$
DECLARE
  target public.profiles%ROWTYPE;
  deleted_id uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  IF p_user IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED';
  END IF;

  IF p_user=auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_DELETE_SELF';
  END IF;

  SELECT * INTO target FROM public.profiles WHERE id=p_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF coalesce(target.is_admin,false)=true OR lower(coalesce(target.role,''))='owner' THEN
    RAISE EXCEPTION 'ADMIN_OR_OWNER_CANNOT_BE_DELETED';
  END IF;

  INSERT INTO public.admin_logs(admin_id,action,target_id,details)
  VALUES(auth.uid(),'admin_delete_user',p_user,
         jsonb_build_object('username',target.username,'auth_email',target.auth_email));

  DELETE FROM auth.users
  WHERE id=p_user
  RETURNING id INTO deleted_id;

  IF deleted_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_USER_NOT_FOUND';
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'id',deleted_id,
    'username',target.username,
    'auth_email',target.auth_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_content(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_bot(uuid,text,bigint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_bot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_product(uuid,text,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_content(uuid,text,text,text,text,text,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_content(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bots(integer,integer) TO authenticated;

COMMIT;
