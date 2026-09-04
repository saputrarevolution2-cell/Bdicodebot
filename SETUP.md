# PasTele upgrade

## Supabase
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Open `js/config.js`.
4. Put the Supabase anon/publishable key in `SUPABASE_ANON_KEY`.
5. Run `supabase/FIXED-MIGRATION.sql` in Supabase SQL Editor.
6. In Supabase Authentication, configure Email (and Google OAuth if you want Google login).
7. Set the Site URL and Redirect URLs to your deployed domain, including `auth-callback.html`.

The browser must use the anon/publishable key only. Never put a service-role key in the site.

## Important
This package cannot contain your private Supabase credentials. Until a real Supabase project is connected, login/register and live marketplace data cannot operate against a real database.
