PasTele / Bdicodebot — FINAL DEPLOYMENT PACK

1) DATABASE
Run ONLY:
  DATABASE_SAFE_FINAL_FIX.sql

This is the safe existing-database patch:
- does NOT drop application tables
- does NOT delete auth.users
- repairs missing profiles
- synchronizes profile auth_email with auth.users
- fixes username availability
- fixes username -> canonical email login
- repairs the auth trigger
- creates missing wallets when the wallets table exists
- aligns profile.status with the frontend

If you are intentionally rebuilding a DEVELOPMENT database from zero, use
DATABASE_FULL_FIX_FINAL.sql instead. That file is destructive by design.

2) FRONTEND CONFIG
Edit:
  js/config.js

Keep only:
  SUPABASE_URL = your public Supabase Project URL
  SUPABASE_ANON_KEY = your anon/publishable key

NEVER put SUPABASE_SERVICE_ROLE_KEY in js/config.js.

3) SUPABASE EDGE FUNCTION SECRETS
Set these in Supabase Edge Functions secrets:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  BAYARGG_API_KEY
  BAYARGG_PAYMENT_URL
  BAYARGG_WEBHOOK_SECRET

Do not commit these values to GitHub.

4) BAYARGG FUNCTIONS
Deploy the functions in:
  supabase/functions/create-bayargg-payment
  supabase/functions/check-bayargg-payment
  supabase/functions/bayargg-webhook

5) AUTH URLS
In Supabase Authentication URL Configuration, allow:
  https://YOUR-DOMAIN/auth-callback.html
  https://YOUR-DOMAIN/dashboard.html

Also set your deployed site as the Site URL.

6) CLOUDFLARE TURNSTILE
The register/login pages use explicit Turnstile when a site key is present.
The site key is public and belongs in the HTML/config; the Turnstile secret
must never be placed in frontend JavaScript.

7) TEST ORDER
Register -> email confirmation (if enabled) -> login by username ->
login by Gmail -> dashboard -> create product -> marketplace ->
checkout -> Bayar.gg payment -> webhook/status -> purchases ->
withdrawal.

8) IMPORTANT FIXES INCLUDED IN THIS ZIP
- Removed frontend reads of private profiles.auth_email.
- Removed frontend query of non-existent profiles.status from auth guard;
  the DB patch adds status for broader UI compatibility.
- Fixed product payment polling to use orders.payment_reference.
- Fixed transactions page to use columns that actually exist in the database.
- Removed hard-coded admin username "admim" from the master database.
- Added responsive/stability CSS layer already used by the auth pages.
