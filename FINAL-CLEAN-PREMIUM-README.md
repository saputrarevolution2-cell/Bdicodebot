# TeleCod Premium — Final Deployment

## What changed
- Full visual redesign focused on a premium SaaS/fintech-style interface.
- Responsive layouts for Android/iPhone and desktop.
- Unified Light/Dark theme tokens across landing, Pastelink, dashboard and admin.
- New premium Telegram/Code hero artwork (`assets/hero-art-premium.svg`).
- New premium favicon (`assets/favicon.svg`).
- Refined cards, forms, buttons, spacing, typography, states and mobile breakpoints.
- Admin access changed from Google/Gmail OAuth to **username + password**.
- Admin login verifies the account through the existing `username-auth` Edge Function and then requires `profiles.is_admin=true`.
- Added a complete database schema and RPC set in `supabase/TELECOD_FULL_FINAL.sql`.

## Supabase
1. Run `supabase/TELECOD_FULL_FINAL.sql` in the Supabase SQL Editor.
2. Deploy the Edge Functions under `supabase/functions/`.
3. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for server-side Edge Functions.
4. Keep only the public anon key in `js/config.js`.
5. Register the admin account normally, then promote it:
   `update public.profiles set is_admin=true where username='USERNAME_ADMIN';`

## Admin
Open `/admin/`.
Use the admin account's TeleCod username and password. Google/Gmail login is no longer required by the admin UI.

## Production notes
- Never put a Supabase service-role key, payment secret, bot token, or webhook secret in frontend files.
- Review existing data before running schema changes on a database that already contains production tables.
- After deployment, clear browser/CDN cache once if an older CSS/JS version remains visible.
