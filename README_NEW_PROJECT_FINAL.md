# Bdicodebot / PasTele — NEW PROJECT FINAL

## 1. Database
Run ONLY `SUPABASE_MASTER_FINAL.sql` in the Supabase SQL Editor as a database owner/postgres.
This rebuilds the public application schema and functions. It does not delete `auth.users`. Existing public application data is intentionally reset.

## 2. Frontend config
Edit `js/config.js` with the new Supabase Project URL and anon/publishable key. Never use a service_role/secret key in frontend.

## 3. Auth
The master SQL creates the auth profile trigger + wallet creation, username resolver, username availability RPC, and purchase deletion RPC.
Turnstile is optional: if no site key is configured, login/register remain usable.

## 4. Deploy
Upload/deploy the entire folder. For Cloudflare Pages, use the folder containing `index.html` as the project root. `_redirects` is included.

## 5. UI
All pages use a unified SaaS UI layer, responsive Android/desktop behavior, automatic theme support, and production debug-panel removal.
