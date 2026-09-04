# PasTele FULL FIX — 2026-08-31

1. Upload the complete folder to hosting.
2. In Supabase SQL Editor, run `supabase/schema.sql`, then `supabase/FIXED-MIGRATION.sql`, then `supabase/PASTELE-FULL-FIX.sql` if your database is being initialized from scratch.
3. If the database already contains the previous PasTele migration, run only the latest PASTELE-FULL-FIX.sql.
4. Set the admin user by setting `profiles.is_admin=true` or `profiles.role='admin'`. The admin can enter using the normal username/Gmail login and then open `/admin/index.html`.
5. Configure Supabase Auth Site URL/Redirect URLs for the deployed domain.
6. Configure `js/config.js` with the project URL and anon/publishable key.

The final frontend uses one shared footer, persistent light/dark theme, unified member marketplace, separated My Links/Purchases/Transactions sections, analytics widgets, wallet/withdraw visuals, admin social/announcement publishing, and responsive Android/desktop layouts.
