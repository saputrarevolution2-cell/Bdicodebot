# PasTele / Bdicodebot — Fix Applied

This build fixes the database/frontend contract mismatches found in the uploaded source.

## Main fixes
- Anonymous username login/register RPC permissions.
- Username lookup/check RPCs callable before authentication.
- Paste view RPC now uses UUID `p_id`.
- Analytics RPCs now accept `p_owner` so owner attribution is correct.
- Marketplace detail supports products, Telegram products/channels/groups, and PasteLink.
- Purchase metadata (`item_id`, `item_title`) is stored and read from the actual schema.
- Removed invalid `products (...)` relationship from purchase history query.
- Fixed admin content delete RPC argument mismatch.
- Fixed Bayar.gg Edge Function CORS headers for Supabase browser invocation.
- Fixed admin promotion typo compatibility (`admin` and legacy `admim`).

## Deployment
1. Run `SUPABASE_MASTER_FINAL.sql` in Supabase SQL Editor.
2. Deploy the Edge Functions in `supabase/functions/`.
3. Put the Supabase project URL + anon/publishable key in `js/config.js`.
4. Set Edge Function secrets for Bayar.gg and Supabase service role.
