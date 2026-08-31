# PasTele — Premium Clean / Production

Static Supabase frontend with a real Postgres-backed marketplace, PasteLink, wallet ledger, purchases, withdrawals, analytics, login history and admin controls.

## Production database
Run `supabase/PRODUCTION-SETUP.sql` as the single SQL setup file in Supabase SQL Editor.

## Frontend config
`js/config.js` contains only the Supabase URL and public anon/publishable key. Never place a service-role/secret key in the browser.

## Security
Paid product content is not exposed through the public marketplace view or direct browser reads. Purchase and withdrawal balance changes happen inside server-side Postgres RPCs.
