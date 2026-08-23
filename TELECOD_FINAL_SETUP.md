# TeleCod Final Setup

## 1. Supabase
1. Buat/ pilih project Supabase.
2. Jalankan `supabase/schema.sql` pada SQL Editor untuk fresh install.
3. Untuk database yang sudah pernah dipakai, jalankan `supabase/telecod_final_auth_marketplace.sql`.
4. Deploy Edge Functions: `telegram-login`, `username-auth`, `marketplace`, lalu functions payment yang memang dipakai project.

## 2. Telegram Login
Set secrets pada Supabase Edge Functions:
- `TELEGRAM_BOT_TOKEN` = token bot TeleCod
- `TELECOD_SITE_URL` = domain produksi, contoh `https://telecod.id`
- `ADMIN_TELEGRAM_ID` = Telegram ID master admin (default project: 6665664367)
- `SUPABASE_SERVICE_ROLE_KEY` = service role key (server secret only)

Di BotFather, set domain/login website sesuai domain produksi. Jangan pernah menaruh bot token atau service role key di frontend.

## 3. Frontend
Edit `js/config.js` hanya untuk nilai public:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_USERNAME`
- function URLs

## 4. Perilaku final
- Login username atau username Telegram: jika ada -> centang hijau; jika tidak -> silang merah + pesan belum dibuat. Password diminta setelah identifier.
- Register memakai username + username Telegram + password. Nomor Telegram opsional.
- Login/Register Telegram tersedia.
- Admin dapat login lewat Telegram master atau username/password akun admin yang sudah `is_admin=true` dan Telegram ID master.
- Add Code/Channel FREE: langsung terupload tanpa login.
- Add Code/Channel PAID: wajib login/register.
- Add Code dengan bot yang belum ada di Approved Bots: status `pending` dan menunggu approval admin.
- Admin dapat mengelola Approved Bots dan mengubah status produk pending menjadi published.
