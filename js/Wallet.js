
/* SOURCE: /js/wallet-fixed.js?v=20260831-final */
document.addEventListener('DOMContentLoaded',async()=>{const p=await TC.profile();if(!p)return location.replace('login.html');const $=id=>document.getElementById(id);try{const [wq,wtx,tx]=await Promise.all([sb.from('wallets').select('*').eq('user_id',p.id).maybeSingle(),sb.from('wallet_transactions').select('*').eq('user_id',p.id).order('created_at',{ascending:false}).limit(500),sb.from('transactions').select('*').eq('user_id',p.id).order('created_at',{ascending:false}).limit(500)]);const w=wq.data,rows=[...(wtx.data||[]),...(tx.data||[]).filter(x=>/^sell_/i.test(String(x.type)))];const good=x=>['completed','paid','available','success'].includes(String(x.status).toLowerCase())&&Number(x.net_amount??x.amount)>0,total=rows.filter(good).reduce((n,x)=>n+Number(x.net_amount??x.amount??0),0),today=rows.filter(x=>good(x)&&new Date(x.created_at).toDateString()===new Date().toDateString()).reduce((n,x)=>n+Number(x.net_amount??x.amount??0),0);$('available').textContent=TC.money(w?.available_balance??w?.balance??p.balance);$('pending').textContent=TC.money(w?.pending_balance||0);$('income').textContent=TC.money(total);$('today').textContent=TC.money(today);const types=[['link','fa-link','LINK'],['code','fa-code','CODE'],['channel','fa-broadcast-tower','CHANNEL'],['group','fa-users','GROUP']];$('breakdown').innerHTML=types.map(([t,i,l])=>`<a class="income-item" href="transactions.html?type=${t}"><span><i class="fa-solid ${i}"></i></span><b>${l}</b><strong>${TC.money(rows.filter(x=>String(x.type||'').toLowerCase().includes(t)&&good(x)).reduce((n,x)=>n+Number(x.net_amount??x.amount??0),0))}</strong><small>Detail transaksi <i class="fa-solid fa-arrow-right"></i></small></a>`).join('')}catch(e){console.error(e);TC.toast(e.message||'Wallet gagal dimuat','error')}});

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
