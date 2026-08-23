# TeleCod — Cloudflare Pages Ready

Project ini menggunakan **Cloudflare Pages + Pages Functions** untuk frontend/API dan **Supabase Edge Functions** untuk auth/marketplace/payment.

## Tidak menggunakan Python

`server.py` sudah dihapus. Cloudflare Pages tidak membutuhkan Python untuk project ini.

## Deploy Cloudflare Pages

### Dashboard
1. Upload repository/folder project ini ke Cloudflare Pages.
2. Build command: kosongkan jika diminta.
3. Build output directory: `.`
4. Pastikan folder `functions/` berada di root project.

### Wrangler
```bash
npm install
npx wrangler login
npm run deploy
```

## Environment Variables Cloudflare

Set di Pages > Settings > Variables and Secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_USERNAME`
- `SITE_URL`

Jangan masukkan `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, atau secret payment ke JavaScript frontend.

## Supabase Edge Functions

Deploy fungsi di folder `supabase/functions/` melalui Supabase CLI:

```bash
supabase functions deploy username-auth --no-verify-jwt
supabase functions deploy telegram-login --no-verify-jwt
supabase functions deploy marketplace --no-verify-jwt
supabase functions deploy payment-create --no-verify-jwt
supabase functions deploy payment-status --no-verify-jwt
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy withdrawal-admin --no-verify-jwt
```

Set secrets Supabase sesuai fungsi yang digunakan, terutama:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELECOD_SITE_URL`

## Catatan Login Telegram

Domain Cloudflare Pages harus didaftarkan di konfigurasi Telegram Login Widget/BotFather. Setelah itu tombol Telegram di Login, Register, Recovery, dan Admin menggunakan Edge Function `telegram-login`.

## Add Code / Add Channel

Form menggunakan endpoint:
`https://<project>.supabase.co/functions/v1/marketplace`

Paid product mewajibkan session login. Free product dapat mengikuti aturan marketplace yang ditentukan Edge Function/database. Source code paid tidak diekspos lewat view publik.
