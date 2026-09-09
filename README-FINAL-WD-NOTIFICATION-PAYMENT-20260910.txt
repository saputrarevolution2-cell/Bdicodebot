PasTele / Bdicodebot — FINAL CLEAN FIX
2026-09-10

PERUBAHAN UTAMA
1. WD Manual otomatis CLOSED:
   - Sabtu & Minggu: tutup
   - Tanggal merah / cuti bersama yang terdaftar: tutup
   - Senin-Rabu: 09:00-21:00 WIB
   - Kamis malam (malam Jumat): 09:00-23:00 WIB
   - Jumat: 09:00-21:00 WIB
   - Tombol WD Manual otomatis disabled saat tutup dan muncul alasan + waktu buka berikutnya.
   - RPC request_withdrawal_v2 juga memblokir server-side, jadi tidak bisa dibypass dari browser.
   - WD Instant tetap memakai aturan sebelumnya.

2. Tanggal merah 2026:
   - 17 hari libur nasional + 8 cuti bersama sesuai SKB 3 Menteri 2026.
   - Disimpan di public.withdrawal_holidays dan dapat dikelola admin via SQL bila tahun berikutnya berubah.

3. ADMIN NOTIFICATIONS:
   - Menu Admin > Notifications.
   - Buat, edit, publish/unpublish, dan hapus pengumuman.
   - Pengumuman yang dipublish otomatis dikirim ke tabel notifications untuk semua user.
   - Inbox notifikasi mencegah duplikasi announcement + notification.
   - Edit/hapus pengumuman ikut menyinkronkan salinan notifikasi user.
   - Tidak membutuhkan secret baru.

4. PAYMENT -> CONTENT:
   - Setelah order berstatus paid/success/completed dan purchase terbentuk, payment-success mencoba resolve URL konten yang benar:
     PasteLink -> paste-view
     Code -> product code
     Group -> product group
     Channel -> product channel
     Link -> product link
   - Redirect dilakukan setelah verifikasi order milik user dan purchase completed.
   - Settlement tetap melalui RPC/Edge Function, bukan frontend.
   - Trigger purchase mengirim notifikasi pembayaran/pembelian ke semua user.

CARA DEPLOY
1. Jalankan SUPABASE_MASTER_FINAL_PENDING_H1_H2_FINAL.sql di Supabase SQL Editor sebagai postgres/service role.
2. Deploy folder/source hasil ZIP ke hosting seperti sebelumnya.
3. Edge Functions/payment secret yang sudah ada tidak perlu secret baru untuk fitur WD/notification ini.
4. Hard refresh browser / purge cache bila masih melihat JS lama.

CATATAN
- Tanggal merah 2026 bersumber dari SKB 3 Menteri 2026.
- Untuk 2027 dan seterusnya, tambahkan daftar tanggal resmi ke public.withdrawal_holidays agar penutupan otomatis tetap akurat.
