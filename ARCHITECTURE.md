# TeleCod — Struktur Modular

Setiap halaman memiliki file CSS dan JS sendiri:

- `index.html` → `assets/css/index.css` + `assets/js/index.js`
- `login.html` → `assets/css/login.css` + `assets/js/login.js`
- `register.html` → `assets/css/register.css` + `assets/js/register.js`
- `dashboard.html` → `assets/css/dashboard.css` + `assets/js/dashboard.js`
- dan seterusnya.

Komponen global:
- `components/navbar.html`
- `components/navbar.css`
- `components/navbar.js`
- `components/footer.html`
- `components/footer.css`
- `components/footer.js`

Dengan struktur ini, perubahan navbar cukup dilakukan di folder `components`, sedangkan error halaman dapat diperbaiki di CSS/JS halaman tersebut tanpa mengacak halaman lain.

Catatan: HTML komponen tetap dipisahkan sebagai sumber komponen. Jika ingin dimuat otomatis ke setiap halaman, gunakan loader komponen di masing-masing page JS atau build step.
