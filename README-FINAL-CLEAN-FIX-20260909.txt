PasTele — FINAL CLEAN FIX 2026-09-09

1. DATABASE
Run SUPABASE_MASTER_PENDING...FINAL.sql in Supabase SQL Editor as postgres/service role.
The SQL includes the final compatibility layer, marketplace union view, Paid PasteLink extension, notification triggers, and admin withdrawal alerts.

2. CREATE CENTER
Create Center exposes only:
- PasteLink
- Code
- Group / Channel
After selecting a type, only its relevant form is shown.
All three support Free / Paid.
Free = Rp0.
Paid = Rp5.000–Rp150.000, multiples of Rp1.000.
PasteLink now has access_type and price in SQL and can be purchased through the normal checkout flow.

3. MARKETPLACE
All published sources are exposed by marketplace_public:
products, telegram_products (Code), telegram_channels (Channel/Group), pastelinks (PasteLink), and public pastes.
Paid content is protected by get_market_item_detail; paid content is not returned to unauthorized users.

4. NOTIFICATIONS
SQL triggers create notifications for:
- successful publication
- content view/open
- completed purchase (buyer + seller)
- new withdrawal request (admins)
Navbar shows unread badge and listens for new notifications while the page is open.

5. THEME
Theme modes work as:
- Light
- Dark
- System
Selection is persistent and no longer overwritten by the old automatic day/night code.

6. ADMIN
Admin withdrawal page shows pending count and an alert. Existing admin modules remain available for users, products/content, orders, payments, withdrawals, transactions, pastes, bots, and logs.

7. PAYMENT SECRETS
Frontend only needs Supabase anon configuration.
Edge Functions need the existing production secrets:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
BAYARGG_API_KEY
BAYARGG_PAYMENT_URL
BAYARGG_WEBHOOK_SECRET

Do not put service-role keys in frontend files.
