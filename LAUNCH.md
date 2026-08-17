# TeleCod — Full Web Starter

## Isi
- Index marketplace neon TeleCod
- Login: Gmail/email + username/ID/@username Telegram
- Register: Gmail + ID/username Telegram + password
- Google OAuth
- Telegram OAuth OIDC melalui Supabase Custom Provider
- Dashboard
- Marketplace
- Jual & Beli
- Payment
- Profil
- Pengaturan
- Navbar dan footer terpisah melalui `assets/js/components.js` + `assets/css/components.css`
- Bahasa Indonesia / English pada halaman aplikasi

## Supabase wajib
1. Jalankan `supabase/schema.sql` di SQL Editor.
2. Aktifkan Email provider dan Google provider.
3. Untuk Telegram Login, buat Custom OIDC provider di Supabase dengan issuer Telegram `https://oauth.telegram.org`, Client ID dan Client Secret dari @BotFather. Identifier provider: `custom:telegram`. Telegram menyediakan OIDC dan PKCE; domain/redirect URL harus didaftarkan di @BotFather. Lihat dokumentasi resmi Telegram dan Supabase.
4. Deploy Edge Function `supabase/functions/login-identifier` dan pastikan environment `SUPABASE_SERVICE_ROLE_KEY` tersedia di function. Jangan pernah menaruh service-role key di frontend.
5. Set Site URL dan Redirect URLs Supabase ke domain produksi, termasuk `/auth-callback.html`.

## Payment
Halaman Payment sudah disiapkan dan siap dihubungkan ke provider QRIS/payment gateway. Endpoint provider belum di-hardcode karena API key/provider produksi harus milik akun kamu.
