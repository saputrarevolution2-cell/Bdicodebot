# PasTele FULL FIX

## 1. Database
Di Supabase SQL Editor jalankan:
1. `supabase/FIXED-MIGRATION.sql`
2. Jika file tersebut sudah pernah dijalankan, tetap jalankan ulang bagian FULL FIX di file tersebut (atau langsung `supabase/PASTELE-FULL-FIX.sql`).

Jangan masukkan service_role/secret key ke frontend.

## 2. Fitur yang diperbaiki
- Marketplace publik mengambil semua member: Pastelink, Product/Link, Code, Channel, Group.
- Create yang dipublish masuk marketplace.
- Dashboard tidak lagi memakai angka/chart random; chart 30 hari berasal dari analytics_events + paid orders.
- Interaksi Views / Like / Share / Follower memakai data database.
- My Links dipisah Pastelink, Code, Channel/Group, dan Product.
- Purchases dipisah per tipe dan dapat dihapus dari daftar via RPC.
- Wallet KPI dan breakdown memakai data wallet_transactions.
- Withdraw punya pilihan nominal instant, progress 0-50% hijau, 50-100% kuning, 100% merah, serta payment method tersimpan.
- Transactions menggabungkan buy, sell, wallet dan withdraw.
- Notifikasi membaca notifications + siaran admin, termasuk gambar dan baca selengkapnya.
- Profile memuat identitas, username Telegram, WhatsApp, Gmail, konten, dan ubah password dengan hide/show.
- Settings menyimpan bank/e-wallet ke database dan menyediakan daftar provider Indonesia/internasional.
- Admin dapat mengatur social media dan publish announcement.
- Navbar dan footer memiliki Log out dan social media.
- Semua halaman mendapat footer bersama dan responsive Android/Desktop.
- Admin guard memakai pemeriksaan server-side `assert_admin()`.

## 3. Catatan
Grafik 30 hari hanya dapat menampilkan event historis yang memang tersimpan. Total counter lama tetap dipertahankan; database tidak diisi angka palsu untuk membuat grafik terlihat ramai.
