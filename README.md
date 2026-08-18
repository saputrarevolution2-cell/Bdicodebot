# TeleCod Premium — Final Light/Dark + Auth + Smart PasteLink

Versi ini sudah dipoles untuk:
- 🌙 Dark mode + ☀️ Light mode global, tersimpan di localStorage.
- 🌐 ID / EN.
- 🎨 Premium responsive UI, Font Awesome, emoji, micro-animation mascot.
- 🛍️ Marketplace, creator, dashboard, admin, checkout tetap dipertahankan.
- 📝 PasteLink public / unlisted / private.
- 🔗 `https://...` dan `www....` di isi PasteLink otomatis menjadi link clickable saat dilihat.
- 🔐 Login/register Email + Username + Google/Gmail + Telegram.
- 📱 Telegram Login Widget diverifikasi server-side lewat Supabase Edge Function.
- 👤 Username Telegram disimpan pada profile.
- 🔒 Secret Telegram Bot Token hanya di Supabase Edge Function secret.

## 1. Jalankan database

Buka Supabase SQL Editor dan jalankan seluruh `database.sql`.

SQL ini menambahkan:
- `profiles.auth_email`
- `profiles.telegram_id`
- `profiles.telegram_username`
- fungsi `resolve_username_login()`
- trigger profile untuk user baru
- privilege column-level supaya field login-only tidak ikut SELECT biasa.

## 2. Google / Gmail OAuth

Di Supabase Dashboard:
Authentication → Providers → Google → Enable.

Isi Client ID dan Client Secret dari Google Cloud Console.

Tambahkan redirect URL:
`https://DOMAIN-KAMU/dashboard.html`

Untuk development tambahkan domain localhost sesuai URL yang kamu gunakan.

## 3. Telegram Login

Project menggunakan Telegram Bot:
`ZyxFidxBot`

Pastikan bot yang digunakan benar-benar bot yang kamu kontrol.

Di BotFather, konfigurasi domain website pada Telegram Login sesuai domain production kamu.

Jangan taruh Bot Token di `assets/config.js`.

Set secret Supabase Edge Function:

`TELEGRAM_BOT_TOKEN=TOKEN_BOT_KAMU`

Deploy function:
`supabase/functions/telegram-auth/index.ts`

Set environment:
`SUPABASE_URL`
`SUPABASE_SERVICE_ROLE_KEY`

Kedua variable Supabase tersebut tersedia otomatis pada Edge Functions pada konfigurasi standar Supabase. Jangan expose service role key ke frontend.

## 4. URL frontend

`assets/config.js` berisi:
- Supabase URL
- Supabase anon key
- Telegram bot username
- path function Telegram auth

Kalau bot/domain berubah, cukup ubah:
`TELEGRAM_BOT_USERNAME`

## 5. Username login

Login menerima:
- email + password
- username + password
- Google
- Telegram

Username tanpa password tidak aman untuk dijadikan metode autentikasi mandiri. Karena itu username Telegram dipakai sebagai identifier login hanya untuk akun yang memang mempunyai password.

Login Telegram menggunakan Telegram Login Widget sehingga identitas Telegram diverifikasi melalui signature Telegram di server.

## 6. PasteLink Smart URL

Contoh isi:

https://google.com
www.example.com
https://telegram.org

Saat PasteLink dibuka, URL tersebut tampil sebagai anchor yang:
- bisa diklik
- membuka tab baru
- memakai `noopener noreferrer nofollow`
- tidak mengeksekusi HTML dari user

Isi selain URL tetap ditampilkan sebagai plain text yang aman.

## 7. Theme

Tombol ☀️ / 🌙 muncul otomatis di navbar/auth header.

Pilihan disimpan:
`localStorage.telecod_theme`

Default:
`dark`

User dapat pindah:
Dark → Light → Dark

## 8. Catatan keamanan

- Supabase anon key boleh berada di frontend.
- Supabase service role key TIDAK boleh berada di frontend.
- Telegram Bot Token TIDAK boleh berada di frontend.
- Payment secret tetap hanya di Edge Function.
- Paste content selalu di-escape; URL dibuat clickable tanpa `innerHTML` dari raw content.
