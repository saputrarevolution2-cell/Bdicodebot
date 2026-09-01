
/* SOURCE: /js/my-products-fixed.js?v=20260831-final */
document.addEventListener('DOMContentLoaded',async()=>{const p=await TC.profile();if(!p)return location.replace('login.html');const $=id=>document.getElementById(id),esc=TC.esc, icon=t=>t==='code'?'fa-code':t==='channel'?'fa-broadcast-tower':t==='group'?'fa-users':'fa-link';const [pr,pa,c,ch]=await Promise.all([sb.from('products').select('*').eq('creator_id',p.id).order('created_at',{ascending:false}),sb.from('pastelinks').select('*').eq('user_id',p.id).order('created_at',{ascending:false}),sb.from('telegram_products').select('*').eq('owner_id',p.id).order('created_at',{ascending:false}),sb.from('telegram_channels').select('*').eq('owner_id',p.id).order('created_at',{ascending:false})]);const groups=[['Pastelink',pa.data||[],x=>x.title||x.slug,'fa-link'],['Code',c.data||[],x=>x.title,'fa-code'],['Channel / Group',ch.data||[],x=>x.name||'Telegram','fa-broadcast-tower'],['Marketplace Link / Paid',pr.data||[],x=>x.title,'fa-box']];$('content').innerHTML=groups.map(g=>`<section class="my-section"><h2><i class="fa-solid ${g[3]}"></i> ${g[0]} <span>${g[1].length}</span></h2>${g[1].map(x=>`<div class="my-row"><span class="my-icon"><i class="fa-solid ${g[3]}"></i></span><div><b>${esc(g[2](x))}</b><small>${esc(x.type||x.product_type||'pastelink')} · ${new Date(x.created_at).toLocaleString('id-ID')}</small></div><strong>${Number(x.price||0)?TC.money(x.price):(x.is_published===false?'Draft':'Published')}</strong></div>`).join('')||'<div class="empty">Belum ada konten.</div>'}</section>`).join('')});

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
