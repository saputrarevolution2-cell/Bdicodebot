# PasTele — Split UI Build

Struktur front-end sudah dipisahkan per halaman:

- `index.html` → `css/index.css` + `js/index.js`
- `login.html` → `css/login.css` + `js/login.js`
- `register.html` → `css/register.css` + `js/register.js`
- `dashboard.html` → `css/dashboard.css` + `js/dashboard.js`
- dan seterusnya untuk semua halaman.
- Admin juga dipisahkan: `admin/index.html` → `admin/index.css` + `admin/index.js`.

CSS bersama tetap berada di:
- `css/global.css`
- `css/navbar.css`
- `css/pastele-polish.css`

Logic Supabase/auth tetap dipisahkan sebagai dependency bersama di `js/`.
Page controller tidak digabung ke HTML lagi; inline `<script>` sudah dipindahkan ke file JS halaman masing-masing.

UI menggunakan sistem visual PasTele yang konsisten, clean, responsif Android/Desktop, sidebar ala Telegram, surface putih/soft, spacing seragam, dan mode dark yang tetap tersedia dari tombol tema.
