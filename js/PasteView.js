
/* SOURCE: /js/paste-view-fixed.js */
document.addEventListener('DOMContentLoaded',async()=>{const slug=new URLSearchParams(location.search).get('slug'),box=document.getElementById('pasteContent');const r=await sb.from('pastelinks').select('*').eq('slug',slug).maybeSingle(),x=r.data;if(r.error||!x)return box.innerHTML='<div class="empty">Paste tidak ditemukan.</div>';if(x.expires_at&&new Date(x.expires_at)<new Date())return box.innerHTML='<div class="empty">Paste sudah expired.</div>';box.innerHTML=`<article class="justpaste-view"><span class="badge"><i class="fa-solid fa-link"></i> Pastelink</span><h1>${TC.esc(x.title)}</h1><div class="rich-output">${x.content_html}</div><p class="muted">${(x.tags||[]).map(t=>'#'+TC.esc(t)).join(' ')}</p><div class="paste-actions"><button class="btn" id="plike"><i class="fa-regular fa-heart"></i> Like</button><button class="btn" id="pshare"><i class="fa-solid fa-share-nodes"></i> Share</button></div></article>`;await sb.rpc('increment_paste_view',{p_slug:slug});await sb.rpc('record_content_view',{p_owner:x.user_id,p_target_type:'link',p_target_id:x.id});document.getElementById('pshare').onclick=async()=>{try{await navigator.clipboard.writeText(location.href)}catch(_){}await sb.rpc('track_analytics',{p_owner:x.user_id,p_event:'share',p_target_type:'link',p_target_id:x.id});TC.toast('Link disalin');};document.getElementById('plike').onclick=async()=>{const u=await TC.user();if(!u)return location.href='login.html';const q=await sb.rpc('toggle_content_like',{p_owner:x.user_id,p_target_type:'link',p_target_id:x.id});if(q.error)TC.toast(q.error.message,'error');else document.getElementById('plike').innerHTML=q.data?.liked?'<i class="fa-solid fa-heart"></i> Liked':'<i class="fa-regular fa-heart"></i> Like'}});


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
