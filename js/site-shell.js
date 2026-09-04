/* PasTele universal footer. Loaded once on every page. */
(()=>{
 if(window.__PASTELE_SITE_SHELL__) return; window.__PASTELE_SITE_SHELL__=true;
 const mount=()=>{
  if(document.getElementById('pasteleFooter')) return;
  const admin=location.pathname.includes('/admin/'),base=admin?'../':'';
  const f=document.createElement('footer');f.id='pasteleFooter';f.className='pastele-footer';
  f.innerHTML=`<div class="container footer-grid">
   <div class="footer-brand-block"><a class="brand" href="${base}index.html"><span class="brand-mark"><i class="fa-brands fa-telegram"></i></span><span>PasTele</span></a><p>Platform digital untuk publish, discover, share, dan monetize Link, Code, Channel &amp; Group Telegram.</p><span class="footer-status"><i class="fa-solid fa-circle-check"></i> Platform ready</span></div>
   <div><b>Platform</b><a href="${base}index.html"><i class="fa-solid fa-house"></i> Beranda</a><a href="${base}marketplace.html"><i class="fa-solid fa-store"></i> Marketplace</a><a href="${base}paste.html"><i class="fa-solid fa-plus"></i> Create</a></div>
   <div><b>Akun</b><a href="${base}dashboard.html"><i class="fa-solid fa-gauge-high"></i> Dashboard</a><a href="${base}profile.html"><i class="fa-solid fa-user"></i> Profile</a><a href="${base}settings.html"><i class="fa-solid fa-gear"></i> Settings</a></div>
   <div><b>Support</b><a href="${base}notifications.html"><i class="fa-solid fa-bell"></i> Notifications</a><a href="${base}my-products.html"><i class="fa-solid fa-link"></i> My Links</a><button type="button" data-footer-logout><i class="fa-solid fa-right-from-bracket"></i> Log out</button></div>
  </div><div class="container footer-bottom"><span>© 2026 PasTele. All rights reserved.</span><span>Secure · Responsive · Database driven</span></div>`;
  document.body.appendChild(f);
  f.querySelector('[data-footer-logout]')?.addEventListener('click',async()=>{try{await Auth.logout()}catch(e){window.TC?.toast?.(e.message,'error')}});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
