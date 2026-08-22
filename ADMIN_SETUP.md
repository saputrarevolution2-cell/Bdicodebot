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
