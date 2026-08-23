# TeleCod Master Control Center

Panel admin tersedia melalui:

`https://telecod.biz.id/admintelecode1122`

`_redirects` sudah mengarahkan path tersebut ke `admin.html`.

## Fitur
- Dashboard statistik real-time
- Users & Creator: ban/unban, saldo, jadikan/cabut admin
- Marketplace: publish/draft/archive, ubah harga, hapus produk
- Approved Bots: tambah/hapus bot
- Pastelink: moderasi dan hapus
- Orders/Purchases: monitoring pembelian
- Payments: monitoring invoice/payment
- Withdrawals: process, paid, return saldo
- Transactions: audit wallet
- Site Control
- Admin Logs
- Dark/light mode
- Global search
- Responsive mobile layout yang mengikuti visual TeleCod index

## Keamanan
URL admin adalah route masuk panel, tetapi operasi database sensitif tetap harus melewati master administrator Supabase/RLS. Jangan menaruh Supabase service-role key di HTML/JavaScript browser.

Jika memakai fungsi tambahan pada versi ini, jalankan:

`supabase/admin_control_center.sql`

setelah schema utama.
