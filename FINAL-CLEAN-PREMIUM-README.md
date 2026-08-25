# TeleCod Final Clean Premium

## Included
- Premium responsive UI with clean light/dark themes.
- Hero remains dark in light mode, per requirement.
- Indonesia/English language switch with persistent preference.
- Unified theme/language storage across pages.
- Cache-busted CSS/JS assets.
- Hardened registration flow and database-safe Auth trigger.
- Register uses `register-account` Edge Function with `email_confirm: true`.
- Profile creation no longer depends on the Auth trigger's username uniqueness.
- Wallet initialization is non-blocking.

## Supabase
1. Run `supabase/TELECOD_FULL_FINAL.sql`.
2. Deploy `supabase/functions/register-account`.
3. Ensure Edge Function secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist.
4. Keep only the public anon key in `js/config.js`.

## Important
After deployment, clear old browser/CDN cache once. The index assets include a version query so new CSS/JS is requested immediately.
