# PasTele — Premium Clean / Production

Static Supabase frontend with a real Postgres-backed marketplace, PasteLink, wallet ledger, purchases, withdrawals, analytics, login history and admin controls.

## Production database
Run `supabase/PRODUCTION-SETUP.sql` as the single SQL setup file in Supabase SQL Editor.

## Frontend config
`js/config.js` contains only the Supabase URL and public anon/publishable key. Never place a service-role/secret key in the browser.

## Security
Paid product content is not exposed through the public marketplace view or direct browser reads. Purchase and withdrawal balance changes happen inside server-side Postgres RPCs.


## Final UI patch — 2026-09-01
- Added a single last-loaded clean visual layer across all HTML pages.
- Fixed the sidebar margin leaking into landing/auth/reset pages.
- Improved responsive mobile/tablet/desktop spacing, cards, forms, tables, admin layout and footer.
- Light/dark theme is applied before first paint and the footer follows the selected theme.
- Added stronger focus states, overflow protection and reduced-motion handling.
