# TeleCod — GitHub + Cloudflare Pages

Project ini sudah disusun sebagai static frontend yang dapat dihubungkan langsung ke GitHub dan Cloudflare Pages.

## 1. Upload ke GitHub

Buat repository baru, lalu dari folder project:

```bash
git init
git add .
git commit -m "Initial TeleCod Cloudflare Pages build"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Jangan commit file `.env`, service-role key, bot token, payment secret, atau webhook secret.

## 2. Connect GitHub ke Cloudflare Pages

Cloudflare Dashboard → Workers & Pages → Create application → Pages → Import an existing Git repository.

Pilih repository GitHub TeleCod.

Build settings:

- Framework preset: None
- Build command: kosong
- Build output directory: `.`
- Root directory: `/`

Setelah deploy, setiap `git push` ke branch yang terhubung akan membuat deployment baru.

## 3. Konfigurasi frontend

Edit `js/config.js` before enabling real authentication:

```js
window.TELECOD_CONFIG = {
  SUPABASE_URL: "https://PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  TELEGRAM_BOT_USERNAME: "YOUR_BOT_USERNAME",
  TELEGRAM_AUTH_FUNCTION_URL: "https://PROJECT.supabase.co/functions/v1/telegram-login",
  USERNAME_AUTH_FUNCTION_URL: "https://PROJECT.supabase.co/functions/v1/username-auth",
  MARKETPLACE_FUNCTION_URL: "https://PROJECT.supabase.co/functions/v1/marketplace",
  PAYMENT_CREATE_FUNCTION_URL: "https://PROJECT.supabase.co/functions/v1/payment-create",
  PAYMENT_STATUS_FUNCTION_URL: "https://PROJECT.supabase.co/functions/v1/payment-status",
  PAYMENT_WEBHOOK_URL: "https://PROJECT.supabase.co/functions/v1/payment-webhook",
  SITE_URL: "https://DOMAIN-KAMU.com",
  DOMPETX_API_BASE: "https://api.dompetx.com",
  DOMPETX_PAYMENT_METHOD: "QRIS"
};
```

`SUPABASE_ANON_KEY`/publishable key boleh berada di frontend. Service-role key TIDAK boleh.

## 4. Supabase

Jalankan `supabase/schema.sql`, lalu deploy Edge Functions dari folder project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy username-auth --no-verify-jwt
supabase functions deploy telegram-login --no-verify-jwt
supabase functions deploy marketplace
supabase functions deploy payment-create
supabase functions deploy payment-status
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy withdrawal-admin --no-verify-jwt
```

Secret untuk Supabase Edge Functions disimpan dengan `supabase secrets set`, bukan di GitHub atau `js/config.js`.

## 5. Telegram Login

Set Telegram bot username di `js/config.js` dan `TELEGRAM_BOT_TOKEN` sebagai Supabase secret.

Atur domain website pada konfigurasi Telegram Login Widget sesuai domain production Cloudflare Pages/custom domain.

## 6. Custom domain

Cloudflare Pages → Custom domains → Add domain.

Setelah domain aktif, ubah `SITE_URL` di `js/config.js` dan `TELECOD_SITE_URL` pada Supabase secrets agar callback dan URL Pastelink konsisten.

## 7. Routing

`_redirects` sudah menyiapkan:

- `/admin` → `admin.html`
- `/dashboard` → `dashboard.html`
- `/reset` → `reset.html`
- `/paste` → editor di `index.html`
- `/p/<slug>` → `p.html?slug=<slug>`

## 8. Test setelah deploy

Buka:

```text
https://DOMAIN-KAMU.com/
https://DOMAIN-KAMU.com/admin
https://DOMAIN-KAMU.com/dashboard
https://DOMAIN-KAMU.com/paste
https://DOMAIN-KAMU.com/api/health
```

`/api/health` harus mengembalikan JSON `ok: true`.

## 9. Arsitektur

```text
GitHub
  ↓
Cloudflare Pages
  ├── HTML/CSS/JS
  ├── Pages Functions (/api/*)
  └── _redirects / _headers
          ↓
      Supabase
      ├── Auth
      ├── PostgreSQL + RLS
      └── Edge Functions
             ├── Telegram
             ├── Marketplace
             ├── Payment
             └── Withdrawal
```


## 10. Important
The landing page is safe to open immediately even when Supabase is not configured. Quick PasteLink works in local/demo storage, while real Login/Register, dashboard, marketplace and persistent PasteLinks require the public Supabase URL/key and deployed Edge Functions. No fake credentials are included.
