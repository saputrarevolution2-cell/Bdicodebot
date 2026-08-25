# TeleCod — Register tanpa konfirmasi Gmail

Versi ini mengubah registrasi menjadi server-side Supabase Edge Function.

1. Deploy `supabase/functions/register-account` ke project Supabase.
2. Pastikan Edge Function mempunyai secret `SUPABASE_SERVICE_ROLE_KEY`.
3. Frontend sudah diarahkan ke:
   `https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/register-account`
4. Function membuat user dengan `email_confirm: true`, membuat profile, lalu langsung membuat session.
5. Setelah berhasil, UI menampilkan notifikasi Registrasi Berhasil dan tombol Login/Masuk.
6. Form password login tetap tersembunyi sampai Gmail/username ditemukan di database.

Catatan: jangan pernah menaruh SERVICE ROLE KEY di `js/config.js` atau frontend.
