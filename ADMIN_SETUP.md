# TeleCod Production Setup

## Master Admin

Master Telegram ID is fixed to:

`6665664367`

The browser admin page does **not** trust a typed ID as authentication. Access requires:

1. A valid Supabase session.
2. A profile whose `telegram_id` is exactly `6665664367`.
3. The profile is not banned.
4. Database RPCs re-check the same master identity server-side.

### First provisioning

After the master user has completed the verified Telegram login flow, make sure the corresponding `profiles.telegram_id` is `6665664367`.

If the Telegram auth function already writes Telegram IDs correctly, no manual change is required.

If the existing profile was created before Telegram login was enabled, update it once from a trusted Supabase SQL/service-role session.

Do not put a service-role key in frontend files.

## Database

Run:

`supabase/schema.sql`

against the TeleCod Supabase project. The schema includes:

- Pastelink destination URL support
- public/anonymous Pastelink creation
- view counters
- products and purchases
- payments
- wallets and transactions
- withdrawals
- master-admin RPCs
- payment/transaction admin audit views
- RLS checks for admin actions

## Routes

- `/` — landing page
- `/paste` — Pastelink editor
- `/p/<slug>` — public Pastelink
- `/dashboard` — authenticated dashboard
- `/admin` — master admin panel

## Production rule

When Supabase is configured, Pastelink creation is database-only. The localStorage preview is only used when Supabase configuration is absent, so a production deployment cannot silently report a fake database save.

## Admin Login Fix

Master admin Telegram ID: `6665664367`.

After deploying both the frontend and the updated `telegram-login` Edge Function, open:
`https://YOUR-DOMAIN/admin`

Click **Login / Verifikasi dengan Telegram** and use the Telegram account whose ID is `6665664367`. After Telegram verification, the magic-link session now returns to `/admin` instead of the homepage.

Redeploy the function after updating this file:
`supabase functions deploy telegram-login --no-verify-jwt`


## TeleCod production admin

Admin URL:

`https://telecod.biz.id/admin`

Master Telegram ID:

`6665664367`

The ID is prefilled in the admin gate, but **the ID alone never grants access**. The browser must also have a valid Supabase session belonging to the Telegram account `6665664367`. This prevents someone from simply typing the ID and entering the panel.

Required Telegram setup:

1. In BotFather, configure the Telegram Login domain as `telecod.biz.id`.
2. Make sure `TELEGRAM_BOT_TOKEN` is configured in the `telegram-login` Edge Function.
3. Make sure `TELECOD_SITE_URL=https://telecod.biz.id`.
4. Deploy `telegram-login` with JWT verification disabled:
   `supabase functions deploy telegram-login --no-verify-jwt`
5. Deploy the frontend containing `admin.html`, `js/admin.js`, `css/admin.css`, and `_redirects`.
6. Open `https://telecod.biz.id/admin`.
7. Click **Login dengan Telegram** and use the Telegram account with ID `6665664367`.

The database RPCs independently enforce `telegram_id='6665664367'`, so changing the frontend JavaScript cannot turn another Telegram account into an administrator.
