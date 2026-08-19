# TeleCod — Real Supabase Edition

Versi ini dibuat ulang mengikuti referensi screenshot:
- artwork dari gambar referensi dimasukkan ke `assets/`
- dark/light mode
- Indonesia/English
- responsive Android/mobile/desktop
- quick PasteLink
- full rich-text Pastelink editor
- login/register Supabase Auth
- penyimpanan Pastelink ke Supabase PostgreSQL
- public/unlisted/private
- expiration
- owner/user relation
- view counter RPC
- RLS policies
- halaman `p.html?slug=...` untuk membuka PasteLink

## 1. Buat database

1. Buat project di Supabase.
2. Buka SQL Editor.
3. Jalankan seluruh file `supabase/schema.sql`.

## 2. Masukkan API

Buka `js/config.js`:

```js
window.TELECOD_SUPABASE_URL = "https://PROJECT.supabase.co";
window.TELECOD_SUPABASE_ANON_KEY = "YOUR_ANON_OR_PUBLISHABLE_KEY";
```

Gunakan **anon/publishable key**, bukan `service_role`.

## 3. Jalankan

Untuk testing:

```bash
python -m http.server 8080
```

Buka:
`http://localhost:8080`

## 4. URL PasteLink

URL publik menggunakan format seperti screenshot: `/p/SLUG`.

`vercel.json` sudah menyediakan rewrite untuk Vercel, dan `_redirects` untuk hosting static yang mendukung Netlify-style redirects. `p.html` menjadi halaman targetnya.

## 5. Keamanan

RLS sudah aktif. Anonymous user boleh membuat PasteLink, tetapi hanya field yang dibatasi policy.

Untuk production dengan traffic besar, tambahkan:
- Edge Function untuk create paste
- rate limit
- CAPTCHA/Turnstile
- sanitasi HTML server-side
- validasi destination URL
- upload gambar ke Supabase Storage
- anti-abuse/moderation

Jangan pernah menaruh `service_role` key di frontend.
