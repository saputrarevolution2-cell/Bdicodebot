# TeleCod — Production Premium

TeleCod is a premium bilingual digital marketplace + PasteLink workspace for creators.

## Included

- Premium responsive UI for desktop, tablet and mobile
- Dark / Light theme persisted in `localStorage`
- Indonesian / English language switch across the app shell and page content
- Font Awesome icon system
- Supabase Auth: email/password, Google OAuth and Telegram Login
- Marketplace: products, checkout, product access and seller balance
- PasteLink: public / unlisted / private + server-side password hashing
- Admin: payment configuration, orders, withdrawals, products, PasteLinks and members
- Production-oriented PostgreSQL schema with RLS and security RPCs
- No demo products, fake members, fake orders or fake balances are seeded
- Payment secrets remain in Supabase Edge Function secrets
- Webhook signature validation + payment amount/currency validation

## 1. Database

Run the complete `database.sql` in the Supabase SQL Editor.

The migration is designed to be re-runnable and adds missing columns/tables where possible. Existing plaintext PasteLink passwords are migrated to bcrypt-style hashes and the plaintext column is removed.

### First admin

Create your real account first. Then run this once with your own Supabase Auth user UUID:

```sql
update public.profiles
set role='admin', status='active'
where id='YOUR-AUTH-USER-UUID';
```

No fake/admin account is created automatically.

## 2. Frontend configuration

Edit `assets/config.js` only for public values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_USERNAME`
- Telegram auth function path

Never place:

- Supabase service-role key
- Telegram bot token
- Payment API secret/key
- Webhook secret

inside frontend files.

## 3. Google OAuth

Enable Google in Supabase Authentication → Providers.

Use your real production callback/redirect URL according to the Supabase project configuration.

## 4. Telegram Login

Deploy:

- `supabase/functions/telegram-auth`

Set Edge Function secrets:

- `TELEGRAM_BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Configure the production domain in Telegram BotFather.

## 5. Payment

The checkout supports:

### Manual QRIS

Configure from Admin → Payment:

- provider name
- QR image URL
- payment instructions
- enabled mode

The payment is intentionally **not** auto-marked as paid by the browser. An admin must verify the payment and mark the order paid through the protected admin RPC.

### API / Automatic

Deploy:

- `supabase/functions/create-payment`
- `supabase/functions/payment-webhook`

Configure public provider settings in Admin → Payment. Put provider secrets only in Edge Function secrets.

Required secrets for the generic adapter:

- `PAYMENT_API_KEY`
- `PAYMENT_WEBHOOK_SECRET`
- optional `PAYMENT_API_ENDPOINT`
- optional `APP_ORIGIN`

The generic `create-payment` adapter expects the provider to return one of:

- `payment_url`
- `checkout_url`
- `invoice_url`

and optionally:

- `reference`
- `invoice_id`

For a specific provider, map its request/response format inside `create-payment/index.ts` rather than exposing the secret to the browser.

The webhook requires `PAYMENT_WEBHOOK_SECRET` and accepts either:

- `x-webhook-signature: sha256=<HMAC-SHA256(raw-body)>`
- legacy `x-webhook-secret` equal to the configured secret

The webhook also verifies the order amount and IDR currency when those fields are supplied by the provider.

## 6. Security model

- RLS is enabled on all application tables.
- User balance cannot be directly edited from the browser.
- Withdrawal creation is only through `request_withdrawal()`.
- Direct order insertion is revoked; orders are created by `create_order()`.
- Paid order completion is service-role only.
- Admin role changes and balance adjustments use protected RPCs.
- Raw PasteLink content is not public-readable from the table.
- PasteLink passwords are hashed server-side.
- Public users cannot read private member profile data.

## 7. Deployment

This package is static frontend + Supabase backend.

Deploy the project root to your static host and deploy the Supabase Edge Functions separately.

Before production, verify:

1. Supabase URL/key
2. Google OAuth
3. Telegram BotFather domain
4. Edge Function secrets
5. Payment provider credentials
6. Payment webhook URL
7. First admin role
8. RLS policies
9. Production domain HTTPS

## 8. Important

This package contains **real database logic, not dummy marketplace data**. You still need to connect your real payment provider credentials and your real Supabase project configuration before live transactions can run.
