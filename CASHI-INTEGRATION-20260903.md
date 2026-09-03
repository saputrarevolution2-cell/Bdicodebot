# PasTele — Cashi QRIS Integration

The paid marketplace flow is now structured as:

1. Buyer clicks **Bayar via Cashi QRIS**.
2. PasTele creates a server-side pending order with the exact product price.
3. The browser calls the Supabase Edge Function `create-cashi-payment`.
4. The Edge Function calls Cashi with the secret API credentials (never exposed to the browser).
5. QR/payment URL is displayed to the buyer.
6. Cashi webhook calls `cashi-webhook` after payment confirmation.
7. `finalize_checkout_order()` atomically marks the order paid, creates the purchase, credits the seller wallet and ledger, and records analytics.
8. The product page polls the order and automatically reloads to reveal the purchased content.

## Required Supabase secrets

Set these as Edge Function secrets:

- `CASHI_API_URL` — exact Cashi create-payment endpoint from your Cashi merchant documentation/dashboard.
- `CASHI_API_KEY` — Cashi API key.
- `CASHI_SECRET` — Cashi secret if required by your endpoint.
- `CASHI_WEBHOOK_SECRET` — secret used to authenticate the Cashi webhook, if applicable.

Do **not** put any Cashi secret in `js/config.js`.

## Deploy

Deploy both functions:

- `supabase/functions/create-cashi-payment`
- `supabase/functions/cashi-webhook`

The exact Cashi endpoint and webhook authentication contract must match the merchant account documentation. The adapter accepts common QR/payment response field names and keeps the gateway secret server-side.
