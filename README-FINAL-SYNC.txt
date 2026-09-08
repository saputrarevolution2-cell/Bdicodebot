PasTele / Bdicodebot — FINAL SQL SYNC
====================================

This package is synchronized to the supplied Supabase master schema and includes frontend/admin fixes.

IMPORTANT DATABASE RULES
------------------------
1. Run the SQL file:
   SUPABASE_MASTER_FINAL_PENDING_H1_H2_FINAL.sql
2. The SQL file contains a compatibility patch at the end for:
   - Code routing -> telegram_products
   - Link routing -> products
   - Group checkout -> telegram_channels
   - marketplace price/access consistency
   - admin manual paid settlement -> settle_bayargg_order
3. Deploy the Edge Functions under:
   supabase/functions/
4. Configure Supabase Edge Function Secrets (do NOT put service-role keys in frontend files):
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   BAYARGG_API_KEY
   BAYARGG_PAYMENT_URL
   BAYARGG_WEBHOOK_SECRET
5. The frontend only uses the Supabase ANON key in js/config.js.

CONTENT ROUTING
---------------
Link       -> products -> /product.html?type=link&slug=...
Paste      -> pastes -> /paste/... -> product.html?type=paste&slug=...
PasteLink  -> pastelinks -> /p/... -> paste-view.html
Code       -> telegram_products -> /c/f/... or /c/p/...
Channel    -> telegram_channels -> /ch/f/... or /ch/p/...
Group      -> telegram_channels(type=group) -> /g/f/... or /g/p/...

PRICE RULES
-----------
products / telegram_products / telegram_channels:
- Free = Rp0
- Paid = Rp5.000–Rp150.000

The supplied SQL schema has no price column for pastes/pastelinks and its checkout RPC does not support them as paid items. Therefore the create page keeps Paste and PasteLink Free so the UI cannot create a state that the database/payment layer cannot settle.

PAYMENT / SETTLEMENT
--------------------
- Marketplace seller share: 70%
- Platform fee: 30%
- Seller earning is pending first.
- Before 21:00 WIB -> H1, available next calendar day 00:00 WIB.
- At/after 21:00 WIB -> H2, available second calendar day 00:00 WIB.
- Admin manual Mark Paid now uses the same settlement function.

ADMIN PANEL
-----------
Admin pages are synchronized to the supplied RPC inventory and real SQL columns. Content Manager covers products, PasteLink, Paste, Telegram Code, Channel and Group. Users, Orders, Payments, Withdrawals, Transactions, Pastes, Bots and Logs use the corresponding admin RPCs.

Before production deployment, verify the Bayar.gg webhook URL and secret in the gateway dashboard.
