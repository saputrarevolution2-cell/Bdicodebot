
/* SOURCE: /js/purchases-fixed.js?v=20260831-final */
document.addEventListener('DOMContentLoaded',async()=>{const p=await TC.profile();if(!p)return location.replace('login.html');const r=await sb.from('purchases').select('id,product_id,amount,status,created_at,item_type,item_id,item_title,products(title,type)').eq('buyer_id',p.id).order('created_at',{ascending:false});const rows=r.data||[],icon=t=>t==='code'?'fa-code':t==='channel'?'fa-broadcast-tower':t==='group'?'fa-users':'fa-link',esc=TC.esc;const groups=[['Pastelink',['link','paste','pastelink']],['Code',['code']],['Channel / Group',['channel','group']]];document.getElementById('content').innerHTML=groups.map(g=>{const a=rows.filter(x=>g[1].includes(x.item_type||x.products?.type||'link'));return `<section class="my-section"><h2><i class="fa-solid ${icon(g[1][0])}"></i> ${g[0]} <span>${a.length}</span></h2>${a.map(x=>`<div class="my-row"><span class="my-icon"><i class="fa-solid ${icon(x.item_type||x.products?.type)}"></i></span><div><b>${esc(x.item_title||x.products?.title||'Produk')}</b><small>${new Date(x.created_at).toLocaleString('id-ID')} · ${esc(x.status)}</small></div><strong>${TC.money(x.amount||0)}</strong><button class="btn danger" data-del="${x.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></div>`).join('')||'<div class="empty">Belum ada pembelian.</div>'}</section>`}).join('');document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Hapus dari daftar pembelian?'))return;const q=await sb.rpc('delete_purchase',{p_id:b.dataset.del});if(q.error)TC.toast(q.error.message,'error');else location.reload()})});

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
