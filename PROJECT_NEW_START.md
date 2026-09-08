# PasTele / Bdicodebot — New Project Clean Start

## Database
Run **SUPABASE_FULL_DATABASE.sql** once in the Supabase SQL Editor as `postgres` / service role. It rebuilds only the application schema under `public`; it does not delete `auth.users`.

## Frontend
1. Put the Supabase URL and public anon/publishable key in `js/config.js`.
2. Never put a Supabase `service_role` key, payment secret, or webhook secret in frontend files.
3. Deploy the project as a static site (Cloudflare Pages or equivalent).
4. Configure payment/webhook secrets only in the backend/Edge Function environment.

## UI
All pages now load the final `css/saas-premium.css` layer for consistent SaaS styling, mobile/desktop responsiveness, cards, forms, tables and dark/light support.

## Production cleanup
The legacy `debug-panel.js` and all duplicate SQL/migration files were removed from the publishable source so there is one database source of truth.
