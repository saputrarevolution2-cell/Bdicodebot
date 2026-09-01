
/* SOURCE: /js/index.js?v=20260831-final */
document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);

  function esc(value) {
    if (window.TC?.esc) return TC.esc(value);
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function money(value) {
    if (window.TC?.money) return TC.money(value);
    return value ? `Rp ${Number(value).toLocaleString('id-ID')}` : 'FREE';
  }

  function empty(message) {
    return `<div class="card landing-empty">${esc(message)}</div>`;
  }

  async function market() {
    const box = $('market');
    if (!box) return;

    if (typeof sb === 'undefined' || !sb) {
      box.innerHTML = empty('Marketplace siap. Hubungkan database untuk menampilkan produk secara live.');
      return;
    }

    try {
      const { data, error } = await sb
        .from('marketplace_public')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) throw error;

      const items = data || [];
      const icon = type => ({
        code: 'fa-code',
        channel: 'fa-broadcast-tower',
        group: 'fa-users',
        link: 'fa-link',
        payment: 'fa-credit-card'
      }[String(type || '').toLowerCase()] || 'fa-cube');

      box.innerHTML = items.slice(0, 8).map(x => `
        <a class="card product" href="product.html?id=${encodeURIComponent(x.id || '')}&type=${encodeURIComponent(x.type || '')}">
          <div class="thumb"><i class="fa-solid ${icon(x.type)}"></i></div>
          <div class="pbody">
            <span class="pill">${esc(x.access_type || 'free').toUpperCase()}</span>
            <h3>${esc(x.title || 'Untitled')}</h3>
            <div class="meta">
              <span class="muted">${esc(x.category || 'General')}</span>
              <span class="price">${x.price ? money(x.price) : 'FREE'}</span>
            </div>
          </div>
        </a>
      `).join('') || empty('Belum ada produk publik dari member.');

      const sets = [
        ['topLink', ['link', 'paste', 'pastelink', 'payment']],
        ['topCode', ['code']],
        ['topChannel', ['channel']]
      ];

      for (const [target, types] of sets) {
        const node = $(target);
        if (!node) continue;

        const arr = items
          .filter(x => types.includes(String(x.type || '').toLowerCase()))
          .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
          .slice(0, 10);

        node.innerHTML = arr.map((x, i) => `
          <div class="topitem">
            <span class="rank">#${i + 1}</span>
            <span>
              <b>${esc(x.title || 'Untitled')}</b>
              <small>${Number(x.views || 0).toLocaleString('id-ID')} views · ${x.price ? money(x.price) : 'FREE'}</small>
            </span>
          </div>
        `).join('') || '<div class="muted">Belum ada data.</div>';
      }
    } catch (error) {
      console.error('[PasTele] Marketplace:', error);
      box.innerHTML = empty('Marketplace belum dapat memuat data saat ini.');
    }
  }

  market();
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
