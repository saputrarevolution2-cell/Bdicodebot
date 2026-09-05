# PasTele FINAL FIX — 2026-09-06

## 1. Upload
Deploy the contents of this folder to the same web root used by the current PasTele site.

## 2. Supabase
Open Supabase → SQL Editor and run:

`supabase/WORKSPACE-STATS-FIX-2026-09-06.sql`

This fixes the homepage Workspace counters.

### Counter behavior
- Logged in: shows the current creator's own PasteLinks/products and their paid sales.
- Code Product increases immediately after a Code product is created (draft/pending/published; rejected is excluded).
- Payment Link includes the creator's PasteLinks and link/payment products.
- Telegram Access includes channel/group products.
- Anonymous visitors see public/published platform totals.

If you use the complete SQL instead of migrations, use:
`supabase/TeleCod-FULL-SQL-FINAL-DONT-EXIST-2026-09-05.sql`

## 3. Cache
The final CSS/JS references use a new cache-buster:
`20260906-final2`

After deployment, hard refresh the site.

## 4. Important
Never put a Supabase `service_role`/secret key in frontend files. Only the public anon/publishable key belongs in `js/config.js`.

## 5. Quick verification
1. Login.
2. Create a PasteLink.
3. Return to homepage.
4. Create a Code Product.
5. Return to homepage.
6. `Code Product` should increase immediately.
7. `Payment Link` should include the PasteLink.
8. Test dark/light theme and mobile width.
