document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const form = $('f'), access = $('access'), price = $('price');
  const syncPrice = () => { if (!access || !price) return; const paid = access.value === 'paid'; price.required = paid; if (!paid) price.value = '0'; };
  access?.addEventListener('change', syncPrice); syncPrice();
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const user = await TC.user(); if (!user) return location.replace('login.html');
    if (!window.sb) return TC.toast('Database belum terkonfigurasi.', 'error');
    const cleanSlug = String($('slug')?.value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    const amount = Number($('price')?.value || 0);
    const payload = { seller_id:user.id, creator_id:user.id, title:String($('title')?.value||'').trim(), slug:cleanSlug, price:Math.max(0,amount), thumbnail_url:String($('thumb')?.value||'').trim()||null, type:$('type')?.value, access_type:$('access')?.value, description:String($('desc')?.value||'').trim(), content:$('content')?.value||'', status:'published' };
    if (!payload.title || payload.title.length < 2) return TC.toast('Judul minimal 2 karakter.', 'error');
    if (!payload.slug || payload.slug.length < 3) return TC.toast('Slug minimal 3 karakter.', 'error');
    if (!['link','paste','pastelink','code','channel','group'].includes(payload.type)) return TC.toast('Tipe produk tidak valid.', 'error');
    if (payload.access_type === 'paid' && payload.price <= 0) return TC.toast('Produk berbayar harus memiliki harga.', 'error');
    const { error } = await sb.from('products').insert(payload);
    if (error) return TC.toast(error.code === '23505' ? 'Slug sudah digunakan. Pilih slug lain.' : error.message, 'error');
    TC.toast('Produk berhasil dipublikasikan ke Marketplace.', 'success');
    setTimeout(() => location.replace('my-products.html'), 700);
  });
});