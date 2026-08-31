/* PasTele — single canonical footer renderer. */
document.addEventListener('DOMContentLoaded', async () => {
  const admin = location.pathname.includes('/admin/');
  const base = admin ? '../' : '';
  let socials = [];
  try {
    if (window.sb) {
      const { data } = await sb.rpc('get_public_site_settings');
      socials = Array.isArray(data?.socials) ? data.socials : [];
    }
  } catch (_) {}
  const safe = v => window.TC?.esc ? TC.esc(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  // Remove every footer already present. This prevents index/custom + shared footer duplication.
  document.querySelectorAll('footer.footer, footer.landing-footer').forEach(el => el.remove());
  const socialHtml = socials.filter(x => /^https?:\/\//i.test(String(x?.url||''))).slice(0,8).map(x =>
    `<a href="${safe(x.url)}" target="_blank" rel="noopener noreferrer" title="${safe(x.name||'Social')}"><i class="${safe(x.icon||'fa-solid fa-link')}"></i><span>${safe(x.name||'Social')}</span></a>`
  ).join('');
  const footer = document.createElement('footer');
  footer.className = 'footer pastele-footer';
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-brand-block">
        <a class="brand" href="${base}index.html"><span class="brand-mark"><i class="fa-brands fa-telegram"></i></span><span>PasTele</span></a>
        <p>Platform digital untuk publish, discover, share, dan monetize Link, Code, Channel &amp; Group Telegram.</p>
        <span class="footer-status"><i class="fa-solid fa-circle-check"></i> Platform ready</span>
      </div>
      <div><b>Platform</b><a href="${base}index.html"><i class="fa-solid fa-house"></i> Beranda</a><a href="${base}marketplace.html"><i class="fa-solid fa-store"></i> Marketplace</a><a href="${base}paste.html"><i class="fa-solid fa-plus"></i> Create</a></div>
      <div><b>Akun</b><a href="${base}dashboard.html"><i class="fa-solid fa-gauge-high"></i> Dashboard</a><a href="${base}profile.html"><i class="fa-solid fa-user"></i> Profile</a><a href="${base}settings.html"><i class="fa-solid fa-gear"></i> Settings</a><button type="button" class="footer-logout" data-footer-logout><i class="fa-solid fa-right-from-bracket"></i> Log out</button></div>
      <div class="footer-social"><b>Sosial Media</b>${socialHtml || '<span class="muted">Belum ada sosial media.</span>'}</div>
    </div>
    <div class="container footer-bottom"><span>© 2026 PasTele. All rights reserved.</span><span>Secure · Responsive · Database driven</span></div>`;
  document.body.appendChild(footer);
  footer.querySelector('[data-footer-logout]')?.addEventListener('click', async () => { try { await Auth.logout(); } catch(e) { window.TC?.toast?.(e.message,'error'); } });
});
