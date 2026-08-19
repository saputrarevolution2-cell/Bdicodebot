# TeleCod Production V2

Premium Telegram digital marketplace + PasteLink + creator dashboard.

## Included
- Premium responsive UI, light/dark theme, ID/EN language.
- Homepage quick PasteLink composer and Marketplace discovery.
- Marketplace categories: Code Bot 18+, Drama, JAV, Telegram Bot, Channel VIP/Free, Film, Media, Template.
- Creator-only Payment Link publishing.
- Bot Registry: bot listings are `draft/pending` until admin approval; banning a registered bot archives its active listings.
- 20% platform fee. Creator net = 80% of gross.
- H+1 settlement: net sale funds are held in `pending_balance` for 24 hours before moving to available balance.
- Withdraw manual / instant with fees Rp2.500 / Rp10.000.
- Protected digital delivery after payment, including code + setup instructions + delivery URL.
- Supabase RLS and security-definer RPCs for sensitive operations.
- BAYAR GG hosted checkout + signed webhook adapter.

## Supabase setup
1. Run `database.sql` in Supabase SQL Editor.
2. Create a real Auth user. Promote that real user to admin using the bootstrap SQL comment at the end of `database.sql`.
3. Deploy both Edge Functions under `supabase/functions/`.
4. Set Edge Function secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_ORIGIN`
   - `BAYARGG_API_KEY`
   - `BAYARGG_WEBHOOK_SECRET`
   - optional `BAYARGG_PAYMENT_METHOD` (default `qris_bayar_gg`)
   - optional `BAYARGG_PAYMENT_URL` (default `https://www.bayar.gg/pay`)
5. Configure BAYAR GG webhook callback to:
   `https://<project-ref>.supabase.co/functions/v1/payment-webhook`

BAYAR GG uses `X-API-Key` for API requests and HMAC-signed webhook callbacks. Keep API and webhook secrets only in Edge Function secrets, never in `assets/config.js`.

## Important production behavior
- Unapproved bot payment links are not published.
- Admin approval of a bot publishes pending listings; admin ban archives listings using that bot username.
- Payment completion creates a settlement due at `paid_at + 24 hours`; dashboard calls `settle_due_sales` so due balances become withdrawable.
- The buyer only receives delivery data through `get_paid_delivery()` after a paid order. Public product queries do not expose code content.
- PasteLink passwords are stored as bcrypt hashes via PostgreSQL `crypt()`.

## Reset password
Email/Gmail reset uses Supabase Auth email reset. Username login first resolves the username to its verified account email. If a Telegram-admin-operated reset workflow is required, connect a Telegram admin bot to the reset-request table/function in your backend; do not expose Auth secrets to the browser.
