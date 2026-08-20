# TeleCod FINAL — Marketplace + PasteLink + Supabase

Versi final ini melanjutkan project TeleCod sebelumnya dan memperbaiki flow yang sebelumnya masih dummy.

## Fitur

- Login username Telegram + password + show/hide password
- Register username Telegram + nomor Telegram + password + confirm password
- Terms & Policy checkbox
- Forgot password / Telegram recovery flow
- Telegram Login / Register Edge Function
- Dashboard
- Marketplace
- Channel Free / Paid
- Code Free / Paid
- Create / Edit / Delete product
- Product detail + access control
- Free purchase menggunakan RPC database
- Paid purchase menggunakan DompetX Snap
- My Purchases
- Payment / Wallet
- Deposit melalui DompetX
- Saldo creator bertambah setelah payment webhook terverifikasi
- Withdrawal request atomic: saldo langsung dicadangkan, request tersimpan di database
- Withdrawal admin endpoint untuk menandai processing/paid/failed/cancelled
- Transaction ledger
- PasteLink public/unlisted/private + expiry + view counter
- Bahasa Indonesia / English
- Dark / Light
- Font Awesome 6
- Responsive Android / desktop
- RLS Supabase
- Public marketplace tidak mengekspos paid content

## Jalankan lokal

```bash
python3 server.py
```

Buka `http://localhost:8080/index.html`.

## Supabase

1. Buat project Supabase.
2. Isi `js/config.js`.
3. Jalankan seluruh `supabase/schema.sql`.
4. Deploy functions:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy username-auth --no-verify-jwt
supabase functions deploy telegram-login --no-verify-jwt
supabase functions deploy marketplace
supabase functions deploy payment-create
supabase functions deploy payment-status
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy withdrawal-admin --no-verify-jwt
```

## DompetX

Flow Paid Purchase dan Deposit memakai DompetX Snap. Secret key hanya berada di Supabase Edge Function secrets.

Set secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET
supabase secrets set DompetX_SERVER_KEY=YOUR_DompetX_SERVER_KEY
supabase secrets set DompetX_CLIENT_KEY=YOUR_DompetX_CLIENT_KEY
supabase secrets set DompetX_ENV=sandbox
supabase secrets set WITHDRAWAL_ADMIN_SECRET=RANDOM_LONG_SECRET
```

Untuk production:

```bash
supabase secrets set DompetX_ENV=production
```

Atur Payment Notification URL di dashboard DompetX ke:

```text
https://YOUR_PROJECT.supabase.co/functions/v1/payment-webhook
```

Webhook memverifikasi `signature_key` DompetX sebelum mengubah status payment.

## Withdrawal

Withdrawal user benar-benar membuat record `withdrawals`, mengurangi saldo secara atomic, dan membuat transaction pending. Pembayaran payout ke bank/e-wallet/crypto tetap harus dilakukan oleh provider payout atau admin yang kamu pilih.

Untuk memproses withdrawal melalui admin endpoint:

```http
POST /functions/v1/withdrawal-admin
x-admin-secret: YOUR_WITHDRAWAL_ADMIN_SECRET
Content-Type: application/json

{
  "withdrawal_id":"UUID",
  "status":"paid",
  "provider_reference":"PAYOUT-REFERENCE"
}
```

Jika `failed` atau `cancelled`, saldo dikembalikan otomatis.

## Telegram

Bot token hanya disimpan sebagai Edge Function secret. Jangan pernah memasukkannya ke frontend.

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
supabase secrets set TELECOD_SITE_URL=https://domain-kamu.com
```

## Frontend config

Isi:

```js
window.TELECOD_CONFIG={
  SUPABASE_URL:"https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY:"YOUR_PUBLISHABLE_OR_ANON_KEY",
  TELEGRAM_BOT_USERNAME:"YOUR_BOT_USERNAME",
  TELEGRAM_AUTH_FUNCTION_URL:"https://YOUR_PROJECT.supabase.co/functions/v1/telegram-login",
  USERNAME_AUTH_FUNCTION_URL:"https://YOUR_PROJECT.supabase.co/functions/v1/username-auth",
  MARKETPLACE_FUNCTION_URL:"https://YOUR_PROJECT.supabase.co/functions/v1/marketplace",
  PAYMENT_CREATE_FUNCTION_URL:"https://YOUR_PROJECT.supabase.co/functions/v1/payment-create",
  PAYMENT_STATUS_FUNCTION_URL:"https://YOUR_PROJECT.supabase.co/functions/v1/payment-status",
  PAYMENT_WEBHOOK_URL:"https://YOUR_PROJECT.supabase.co/functions/v1/payment-webhook",
  SITE_URL:"https://domain-kamu.com",
  DompetX_CLIENT_KEY:"YOUR_DompetX_CLIENT_KEY",
  DompetX_ENV:"sandbox"
};
```

Frontend hanya boleh memakai Supabase publishable/anon key dan DompetX client key. Jangan masukkan service-role key, bot token, atau DompetX server key ke JavaScript.


## DompetX
TeleCod menggunakan DompetX sebagai payment provider. API resmi DompetX memakai `https://api.dompetx.com`, API key, HMAC-SHA256 signature, timestamp, dan idempotency key. Payment dibuat sebagai transaksi QRIS; QR ditampilkan dari endpoint QRIS DompetX. Status pembayaran diverifikasi dengan endpoint check-status DompetX sebelum wallet/purchase diselesaikan.

Supabase secrets:
```
supabase secrets set DOMPETX_API_KEY=YOUR_DOMPETX_API_KEY
supabase secrets set DOMPETX_API_BASE=https://api.dompetx.com
supabase secrets set DOMPETX_PAYMENT_METHOD=QRIS
```
Jangan masukkan API key DompetX ke frontend.


## Provider final
**Payment provider: DompetX only. Midtrans is not used.** Frontend does not contain a DompetX secret. `payment-create` signs requests server-side with HMAC-SHA256 as required by DompetX; `payment-status` checks the provider transaction directly before crediting wallet or completing a purchase. DompetX documents `POST /v1/payments`, authenticated status endpoints, and public QRIS images under `/v1/qr/{paymentId}`. 
