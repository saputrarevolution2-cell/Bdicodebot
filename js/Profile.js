
/* SOURCE: /js/profile-fixed.js?v=20260831-final */
document.addEventListener('DOMContentLoaded',async()=>{
 const p=await TC.profile();if(!p)return location.replace('login.html');const $=id=>document.getElementById(id);
 const name=p.display_name||p.username||'User';$('name').textContent=name;$('avatar').textContent=name.slice(0,1).toUpperCase();$('bio').textContent=p.bio||'Kelola identitas dan kontenmu.';
 const esc=TC.esc;
 $('adminBtn').style.display=(p.is_admin||p.role==='admin')?'inline-flex':'none'; $('details').innerHTML=[['Username',p.username],['Username Telegram',p.telegram_username||'Belum diisi'],['No. WhatsApp',p.whatsapp_number||'Belum diisi'],['Gmail',p.auth_email],['Website',p.website||'Belum diisi'],['Role',p.role||'user'],['Status',p.is_banned?'Banned':'Aktif'],['Bergabung',p.created_at?new Date(p.created_at).toLocaleDateString('id-ID'):'-']].map(x=>`<div class="detail-row"><small>${esc(x[0])}</small><b>${esc(x[1]||'-')}</b></div>`).join('');
 const [pa,c,ch,pr]=await Promise.all([sb.from('pastelinks').select('id',{count:'exact',head:true}).eq('user_id',p.id),sb.from('telegram_products').select('id',{count:'exact',head:true}).eq('owner_id',p.id),sb.from('telegram_channels').select('id',{count:'exact',head:true}).eq('owner_id',p.id),sb.from('products').select('id',{count:'exact',head:true}).eq('creator_id',p.id)]);
 $('counts').innerHTML=[['fa-link','Pastelink',pa.count||0],['fa-code','Code',c.count||0],['fa-broadcast-tower','Channel / Group',ch.count||0],['fa-box','Marketplace product',pr.count||0]].map(x=>`<a class="content-count" href="my-products.html"><span><i class="fa-solid ${x[0]}"></i> ${x[1]}</span><b>${x[2]}</b></a>`).join('');
 $('profilePass').onsubmit=async e=>{e.preventDefault();const v=$('profileNewPass').value;if(v.length<6)return TC.toast('Password minimal 6 karakter','error');const r=await sb.auth.updateUser({password:v});TC.toast(r.error?.message||'Password berhasil diubah',r.error?'error':'success');if(!r.error)e.target.reset()};$('profilePassToggle').onclick=()=>{const i=$('profileNewPass');i.type=i.type==='password'?'text':'password';$('profilePassToggle').innerHTML=`<i class="fa-solid ${i.type==='password'?'fa-eye':'fa-eye-slash'}"></i>`};
 const admin=p.is_admin===true||p.role==='admin';if(!admin) $('adminBtn').style.display='none';
 try{const r=await sb.rpc('get_login_info');$('currentLogin').textContent=r.data?.current?.logged_in_at?new Date(r.data.current.logged_in_at).toLocaleString('id-ID'):'Belum tercatat';$('lastLogin').textContent=r.data?.last?.logged_in_at?new Date(r.data.last.logged_in_at).toLocaleString('id-ID'):'Belum ada'}catch(_){}
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
