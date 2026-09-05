-- ============================================================
-- PASTELE — WORKSPACE STATS / CREATOR DASHBOARD FIX
-- 2026-09-06
--
-- Run this migration in Supabase SQL Editor.
-- Behavior:
--   * Logged-in creator: counts THEIR PasteLinks/products and sales.
--   * Anonymous visitor: counts public/published platform content.
--   * Draft products are included for the creator's own workspace,
--     so creating a product immediately updates the homepage preview.
--   * Rejected products are excluded.
--   * PasteLinks are counted as Link/Payment Link content.
-- ============================================================

begin;

drop function if exists public.get_public_workspace_stats();

create or replace function public.get_public_workspace_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  total_links bigint := 0;
  total_codes bigint := 0;
  total_telegram bigint := 0;
  product_links bigint := 0;
  current_revenue numeric := 0;
  previous_revenue numeric := 0;
  trend numeric := 0;
begin
  if uid is not null then

    -- Creator's own PasteLinks.
    select count(*)
      into total_links
    from public.pastelinks p
    where p.user_id = uid;

    -- Creator's own marketplace products.
    -- A product can use either seller_id or creator_id depending on
    -- which version of the create-product flow created it.
    select
      count(*) filter (
        where lower(coalesce(pr.type,'')) in ('link','payment','paste','pastelink')
          and lower(coalesce(pr.status,'')) <> 'rejected'
      ),
      count(*) filter (
        where lower(coalesce(pr.type,'')) = 'code'
          and lower(coalesce(pr.status,'')) <> 'rejected'
      ),
      count(*) filter (
        where lower(coalesce(pr.type,'')) in ('channel','group')
          and lower(coalesce(pr.status,'')) <> 'rejected'
      )
      into product_links, total_codes, total_telegram
    from public.products pr
    where pr.seller_id = uid or pr.creator_id = uid;

    total_links := total_links + product_links;

    -- Paid orders belonging to this creator.
    select
      coalesce(sum(case
        when o.status = 'paid'
         and o.paid_at >= now() - interval '30 days'
        then coalesce(o.amount,0) else 0 end),0),
      coalesce(sum(case
        when o.status = 'paid'
         and o.paid_at >= now() - interval '60 days'
         and o.paid_at < now() - interval '30 days'
        then coalesce(o.amount,0) else 0 end),0)
      into current_revenue, previous_revenue
    from public.orders o
    where o.seller_id = uid;

  else

    -- Public/anonymous homepage totals.
    select count(*)
      into total_links
    from public.pastelinks p
    where p.visibility = 'public';

    select
      count(*) filter (
        where lower(coalesce(pr.type,'')) in ('link','payment','paste','pastelink')
      ),
      count(*) filter (
        where lower(coalesce(pr.type,'')) = 'code'
      ),
      count(*) filter (
        where lower(coalesce(pr.type,'')) in ('channel','group')
      )
      into product_links, total_codes, total_telegram
    from public.products pr
    where lower(coalesce(pr.status,'')) = 'published';

    total_links := total_links + product_links;

    -- Do not expose seller-specific financial data to anonymous visitors.
    -- This is a platform-level public revenue preview only.
    select
      coalesce(sum(case
        when o.status = 'paid'
         and o.paid_at >= now() - interval '30 days'
        then coalesce(o.amount,0) else 0 end),0),
      coalesce(sum(case
        when o.status = 'paid'
         and o.paid_at >= now() - interval '60 days'
         and o.paid_at < now() - interval '30 days'
        then coalesce(o.amount,0) else 0 end),0)
      into current_revenue, previous_revenue
    from public.orders o;

  end if;

  if previous_revenue = 0 then
    if current_revenue > 0 then trend := 100;
    else trend := 0;
    end if;
  else
    trend := round(((current_revenue - previous_revenue)
                    / previous_revenue) * 100, 1);
  end if;

  return jsonb_build_object(
    'total_revenue', coalesce(current_revenue,0),
    'revenue_trend', coalesce(trend,0),
    'payment_links', coalesce(total_links,0),
    'code_products', coalesce(total_codes,0),
    'telegram_access', coalesce(total_telegram,0),
    'scope', case when uid is null then 'public' else 'creator' end
  );
end;
$$;

revoke all on function public.get_public_workspace_stats() from public;
grant execute on function public.get_public_workspace_stats() to anon, authenticated;

commit;
