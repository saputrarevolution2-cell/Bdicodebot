# Channel Link Fix

Perbaikan ini membuat produk `channel` / `group`:
- mengambil link dari `telegram_channels.telegram_channel_id`
- mengembalikan `channel_link` dari RPC `get_market_item_detail`
- menampilkan tombol **Buka Telegram** pada `product.html`
- mengunci link untuk produk Paid sampai pembelian berhasil
- mendukung input `https://t.me/...`, `t.me/...`, `@username`, dan username biasa
- menghapus insert ke kolom `access_content` yang tidak ada pada schema utama

Jalankan `supabase/CHANNEL-LINK-FIX.sql` di Supabase SQL Editor, lalu deploy seluruh folder frontend.
