# TeleCod Register Tanpa Konfirmasi Gmail

Versi final ini memakai Supabase Edge Function `register-account`.

## Alur
1. User mengisi username, Gmail, password.
2. Edge Function membuat user dengan `email_confirm: true`.
3. Trigger + profile membuat data akun dan wallet.
4. Frontend menampilkan **Registrasi Berhasil** tanpa pindah ke index.
5. User menekan tombol **Login / Masuk** lalu login dengan Gmail/username.

## Deploy
Deploy folder `supabase/functions/register-account` ke project Supabase yang sama dengan konfigurasi pada `js/config.js`.
Pastikan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tersedia sebagai secret Edge Function.
