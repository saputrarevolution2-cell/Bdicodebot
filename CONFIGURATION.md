# PasTele Production Configuration

## 1. Database connection
Edit `js/config.js` and set only:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or Supabase publishable key)

Do **not** put a `service_role`/secret key in the browser. The anon/publishable key is intentionally public; real protection is provided by Supabase Auth, RLS and server-side RPC checks.

## 2. Database
Run `supabase/FIXED-MIGRATION.sql` in the Supabase SQL Editor. It adds the missing Telegram, transaction, payment and admin RPC structures used by the frontend and keeps existing tables where possible.

## 3. Admin
After your first user is created, set that user's `profiles.is_admin = true` (or `role = 'admin'`) once from the Supabase SQL Editor. Admin actions are then checked server-side by RPCs; hiding an admin URL is not used as security.

## 4. Deploy
Deploy the entire `telecod` folder. Do not expose any service-role key, database password, or secret in static files.
