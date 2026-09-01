
/* SOURCE: /js/create-product.js */
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

/* ===== Page shell: one canonical footer ===== */
(() => {
 const mount=()=>{
   if(document.getElementById('pasteleFooter')) return;
   document.querySelectorAll('body>footer').forEach(x=>x.remove());
   const admin=location.pathname.includes('/admin/'), base=admin?'../':'';
   const f=document.createElement('footer'); f.id='pasteleFooter'; f.className='pastele-footer';
   f.innerHTML=`<div class="container footer-grid">
    <div class="footer-brand-block"><a class="brand" href="${base}index.html"><span class="brand-mark"><i class="fa-brands fa-telegram"></i></span><span>PasTele</span></a><p>Publish, discover, share, and monetize Telegram links, codes, channels and groups.</p><span class="footer-status"><i class="fa-solid fa-circle-check"></i> Platform ready</span></div>
    <div><b>Platform</b><a href="${base}index.html"><i class="fa-solid fa-house"></i> Home</a><a href="${base}marketplace.html"><i class="fa-solid fa-store"></i> Marketplace</a><a href="${base}paste.html"><i class="fa-solid fa-plus"></i> Create</a></div>
    <div><b>Account</b><a href="${base}dashboard.html"><i class="fa-solid fa-gauge-high"></i> Dashboard</a><a href="${base}profile.html"><i class="fa-solid fa-user"></i> Profile</a><a href="${base}settings.html"><i class="fa-solid fa-gear"></i> Settings</a><button type="button" data-footer-logout><i class="fa-solid fa-right-from-bracket"></i> Log out</button></div>
    <div><b>Support</b><a href="${base}notifications.html"><i class="fa-solid fa-bell"></i> Notifications</a><a href="${base}setup.html"><i class="fa-solid fa-circle-question"></i> Help & setup</a></div>
   </div><div class="container footer-bottom"><span>© 2026 PasTele. All rights reserved.</span><span>Secure · Responsive · Database driven</span></div>`;
   document.body.appendChild(f);
   f.querySelector('[data-footer-logout]')?.addEventListener('click',async()=>{try{await Auth.logout()}catch(e){window.TC?.toast?.(e.message,'error')}});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
