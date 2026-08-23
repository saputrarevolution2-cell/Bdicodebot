# TELECOD FULL FIX — DEPLOY CHECKLIST

## Perbaikan yang sudah diterapkan
- Memperbaiki fatal JavaScript syntax error `async async function renderCreate(...)`.
- Memperbaiki submit Add Code/Add Channel di Dashboard agar memakai Marketplace Edge Function dengan session Supabase yang valid.
- Menambahkan `bot_username` saat publish Code sehingga Approved Bots dapat diproses sesuai database.
- Menambahkan validasi session dan URL function sebelum submit agar tidak menghasilkan `Load Failed` yang membingungkan.
- Menambahkan route Cloudflare Pages `/admin` dan `/dashboard`.
- Edge Functions Telegram Login/Register, Username Auth, Marketplace, Payment Create/Status/Webhook dan Withdrawal Admin sudah ikut dalam paket.
- SQL schema dan migration marketplace/wallet tetap disertakan.

## WAJIB setelah upload
1. Jalankan `supabase/schema.sql` pada project database.
2. Jalankan `supabase/final_marketplace_wallet_migration.sql`.
3. Deploy:
   - `supabase functions deploy marketplace --no-verify-jwt`
   - `supabase functions deploy telegram-login --no-verify-jwt`
   - `supabase functions deploy username-auth --no-verify-jwt`
   - `supabase functions deploy payment-create --no-verify-jwt`
   - `supabase functions deploy payment-status --no-verify-jwt`
   - `supabase functions deploy payment-webhook --no-verify-jwt`
   - `supabase functions deploy withdrawal-admin --no-verify-jwt`
4. Set secrets Supabase:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELECOD_SITE_URL=https://domain-kamu.com`
   - `DOMPETX_API_KEY` (jika pembayaran QRIS digunakan)
   - `DOMPETX_API_BASE=https://api.dompetx.com`
   - `DOMPETX_PAYMENT_METHOD=QRIS`
5. Di BotFather, daftarkan domain website untuk Telegram Login Widget.
6. Di Supabase Auth URL Configuration, izinkan `https://domain-kamu.com` dan `https://domain-kamu.com/reset.html`.
7. Pastikan `ADMIN_TELEGRAM_ID` di `js/config.js` sesuai Telegram ID admin.
8. Setelah deploy, hard refresh browser / hapus cache.

## Catatan keamanan
Jangan memasukkan Supabase service-role key, Telegram bot token, DompetX secret, atau webhook secret ke file frontend.
