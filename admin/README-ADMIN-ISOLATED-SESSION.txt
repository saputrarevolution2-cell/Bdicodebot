ADMIN LOGIN TERPISAH - FINAL

Admin login uses Supabase Auth storageKey: pastele-admin-auth.
Admin panel uses the same key. It does not depend on the public user session pastele-auth.

URL: /admin/login/
Username: admin
Password: the existing Supabase Auth password for the admin account.

Required DB function: public.admin_access_check() returning jsonb {ok:true,...}.
