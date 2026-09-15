# PasTele Final SaaS Build

This build keeps the existing page structure and Settings page untouched as the visual reference.

## Database
Run `database.sql` in Supabase SQL Editor.

Financial rules enforced server-side:
- Creator marketplace revenue: 70%
- Platform share: 30%
- Creator settlement: exactly H+2 / 48 hours after verified payment
- Manual withdrawal: Monday-Friday 09:00-17:00 WIB
- Saturday and Sunday: manual withdrawal closed
- Manual minimum: Rp100.000
- Manual daily requests: Free 1x, Subscription 2x, Premium 5x
- Manual fee: Free/Subscription Rp7.000, Premium Rp2.000
- Instant daily limit: Free Rp100.000, Subscription Rp300.000, Premium Rp500.000
- Instant fee: Free Rp15.000, Subscription Rp13.000, Premium Rp10.000
- Instant withdrawal remains available 24/7

## Frontend
The page-specific JavaScript from the last functional build is restored so the HTML pages actually call the database RPCs they use. CSS receives an additive SaaS polish layer. `settings.css` is intentionally not modified.

Never put Supabase `service_role` or other secrets in browser JavaScript.


## Cashi QRIS — production flow
Paid marketplace orders use Cashi `QRIS_CUSTOM`. The browser never receives the Cashi API key or secret.

### Required server environment
- `CASHI_API_KEY`
- `CASHI_SECRET_KEY`
- `CASHI_CHANNEL=QRIS_CUSTOM`
- `CASHI_API_URL=https://cashi.id/api` (optional; this is the default)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The Cloudflare Pages Functions are:
- `POST /api/cashi/create-order` — creates/reuses a Cashi QRIS order using the amount stored in `orders`.
- `POST /api/cashi/check-status` — checks Cashi and settles a `SETTLED` order.
- `POST /api/cashi/webhook` — verifies `x-gateway-signature` with HMAC-SHA256 before settlement.

Configure the Cashi webhook URL to your deployed `/api/cashi/webhook` endpoint. Never put `CASHI_API_KEY`, `CASHI_SECRET_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` in HTML/CSS/JS.

### Admin structure
Admin is intentionally isolated under `admin/`: each admin page has its own `admin/css/<page>.css` and `admin/js/<page>.js`. Public pages use root `css/` and `js/`.
