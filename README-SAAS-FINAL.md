# PasTele / Bdicodebot — SaaS Premium Final

## Structure
Every HTML page now uses exactly:
- one page CSS bundle
- one page JS bundle

Examples:
- `index.html` -> `css/index.css` + `js/index.js`
- `create-code.html` -> `css/create-code.css` + `js/create-code.js`
- `admin/index.html` -> `admin/index.css` + `admin/index.js`

The previous layered UI overrides (`theme-universal.css`, `final-fixes.css`,
`dashboard-theme.css`, `saas-final.css`) are no longer loaded by the HTML pages.
Their visual responsibilities are consolidated into each page bundle.

## Database
Use ONLY:
`SUPABASE_MASTER_FINAL_FULL_FIX_IDEMPOTENT.sql`

The frontend bundles are aligned to the schema/RPC names in that SQL, including:
- username login resolution
- username/email availability
- Telegram approved bot master relation
- telegram products
- Telegram channel/group listings
- PasteLink access/price
- checkout/order/payment RPCs
- wallet/withdrawal
- admin RPCs

## Deploy
Upload the contents of this folder to your hosting root, or deploy the ZIP contents.
Do not nest the folder itself inside another `Bdicodebot-main` directory.

## Supabase
Keep only the browser-safe Supabase URL and anon/publishable key in the frontend config.
Never put a service-role key in browser code.
