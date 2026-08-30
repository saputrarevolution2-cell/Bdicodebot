# PasTele — Complete Supabase Setup

## 1. Frontend configuration
Edit `js/config.js` and put only:
- Supabase Project URL
- Supabase anon/publishable key

Never put a `service_role` or secret key in browser code.

## 2. Run the database SQL
In Supabase Dashboard → SQL Editor, run:

`supabase/FIXED-MIGRATION.sql`

The file is idempotent for the existing PasTele schema (`CREATE IF NOT EXISTS`, compatibility columns, policies, grants, indexes and RPCs).

`supabase/schema.sql` contains the same complete production schema.

## 3. Auth settings
In Supabase → Authentication → URL Configuration:
- Site URL: your deployed PasTele URL
- Redirect URL: `https://YOUR-DOMAIN/auth-callback.html`

For local testing also add the exact local callback URL.

If email confirmation is enabled, registration returns a confirmation message and the user must confirm Gmail before password login.

## 4. What this SQL covers
- profiles + automatic profile/wallet creation after Auth signup
- username/Gmail lookup
- marketplace public view
- products
- PasteLinks
- wallets and wallet transactions
- transactions
- orders, payments and purchases
- notifications
- withdrawals + atomic withdrawal RPC
- approved Telegram bots
- Telegram products
- Telegram channels/groups
- admin logs
- admin statistics and management RPCs
- RLS policies and explicit API grants
- indexes for common dashboard/login queries

## 5. Debugging
Every HTML page loads `js/debug-panel.js`.

Tap **🐞 BUG** on the page. It shows:
- Supabase client status
- database test result
- Auth/session status
- JavaScript errors
- failed HTTP/Supabase requests with response body
- resource/script loading errors
- warnings and console output
- Copy button for the captured diagnostics

The panel automatically redacts common credentials/tokens before displaying/copying diagnostics.

## 6. Important fixes included
- `resolve_username_login()` now returns `is_banned` as well as `auth_email`.
- Email login also checks the user's profile ban status after authentication.
- `telegram_channels` insertion now uses the actual schema columns (`name`, `username`, `type`) instead of a nonexistent `title` column.
- Marketplace view has an explicit SELECT grant.
- Browser API privileges are explicitly granted and still restricted by RLS.
- Admin statistics now returns the keys expected by the admin dashboard (`sales`, `revenue`, `banned`, `pending`, etc.).
