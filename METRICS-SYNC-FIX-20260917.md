# PasTele Metrics / Earnings Sync Fix

## Runtime flow
- Public content pages call `record_content_view()` once when the content page opens.
- Marketplace no longer records an extra view on the card click, preventing double-counted opens.
- Likes are stored in `content_likes` and are visible to the marketplace and creator dashboard.
- Shares are stored as `analytics_events` with `event_type='share'` and the content owner.
- Paid sales are settled by `settle_cashi_order()`; creator receives 70% into `wallets.pending_balance` and `profiles.balance`, with H+2 maturity into available balance.
- `orders` / `transactions` remain the source for creator sales and earnings in the dashboard.
- PasteLink now has `sales_count`, so paid PasteLink sales are also reflected in marketplace content counters.

## Database action required
Run the included `PASTELE_DATABASE_MASTER_FULL_FIX_20260917.sql` in Supabase SQL Editor. The added `ALTER TABLE` is idempotent and the final settlement function increments PasteLink `sales_count` once per settled order.

## Short URLs
- `/pf/XXXX` PasteLink Free
- `/pp/XXXX` PasteLink Paid
- `/gf/XXXX` Group Free
- `/gp/XXXX` Group Paid
- `/cf/XXXX` Channel Free / Code Free
- `/cp/XXXX` Channel Paid / Code Paid
