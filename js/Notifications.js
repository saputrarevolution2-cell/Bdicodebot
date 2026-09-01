
/* SOURCE: /js/notifications-fixed.js?v=20260831-final */
document.addEventListener('DOMContentLoaded',async()=>{const u=await TC.user();if(!u)return location.replace('login.html');const [n,a]=await Promise.all([sb.from('notifications').select('*').eq('user_id',u.id).order('created_at',{ascending:false}),sb.from('announcements').select('*').eq('published',true).order('published_at',{ascending:false})]);const rows=[...(n.data||[]).map(x=>({...x,source:'notification'})),...(a.data||[]).map(x=>({...x,source:'announcement',title:x.title,body:x.body,image_url:x.image_url,created_at:x.published_at||x.created_at}))].sort((x,y)=>new Date(y.created_at)-new Date(x.created_at));document.getElementById('content').innerHTML=rows.map((x,i)=>`<article class="notice-card ${x.source}">${x.image_url?`<img src="${TC.esc(x.image_url)}" alt="">`:''}<div class="notice-inner"><span class="badge"><i class="fa-solid ${x.source==='announcement'?'fa-bullhorn':'fa-bell'}"></i> ${x.source==='announcement'?'SIARAN ADMIN':'NOTIFIKASI'}</span><h2>${TC.esc(x.title)}</h2><div class="notice-short" id="n${i}">${TC.esc(x.body)}</div>${String(x.body||'').length>300?`<button class="btn" data-more="${i}">Baca selengkapnya</button>`:''}<small>${new Date(x.created_at).toLocaleString('id-ID')}</small></div></article>`).join('')||'<div class="empty">Belum ada notifikasi.</div>';rows.forEach((x,i)=>{const b=document.querySelector(`[data-more="${i}"]`);b?.addEventListener('click',()=>{const el=document.getElementById('n'+i);el.classList.toggle('expanded');b.textContent=el.classList.contains('expanded')?'Tutup':'Baca selengkapnya'})})});

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
