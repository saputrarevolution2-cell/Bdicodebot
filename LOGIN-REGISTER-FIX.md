# LOGIN / REGISTER FIX — FINAL

Perbaikan utama:
- Supabase client memakai persistSession + autoRefreshToken + PKCE.
- Session diverifikasi lagi setelah signInWithPassword sebelum redirect.
- Error Auth Supabase diterjemahkan menjadi pesan yang jelas.
- Login username tetap memakai RPC `resolve_username_login`.
- Login email langsung memakai email Auth.
- Register tetap memakai trigger database untuk membuat profile + wallet.
- Google OAuth tetap diarahkan ke `/auth-callback.html`.
- Debug panel tetap dapat dipakai dengan `?debug=telecod112`.

PENTING:
`js/config.js` harus berisi SUPABASE_URL dan anon/publishable key.
Jangan pernah memasukkan service_role/secret key.

Database:
Jalankan `supabase/FIXED-MIGRATION.sql` di Supabase SQL Editor.

Supabase Auth URL:
Tambahkan:
- https://telecod.biz.id/auth-callback.html
- https://telecod.biz.id/login.html
- https://telecod.biz.id/register.html

Set Site URL utama ke:
https://telecod.biz.id

Setelah deploy, buka:
https://telecod.biz.id/login?debug=telecod112
