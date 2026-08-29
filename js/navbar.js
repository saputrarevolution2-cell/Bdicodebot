document.addEventListener('DOMContentLoaded', async () => {
 const host=document.getElementById('navbar'); if(!host)return;
 const isAdmin=location.pathname.includes('/admin/');
 const base=isAdmin?'../':'';
 let user=null; try{user=await TC.user()}catch(_){}
 const esc=v=>TC?.esc?TC.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 const name=user?.user_metadata?.username||user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Guest';
 const links=isAdmin?[
  ['index.html','fa-chart-pie','Overview'],['users.html','fa-users','Users'],['products.html','fa-box','Products'],
  ['orders.html','fa-receipt','Orders'],['payments.html','fa-credit-card','Payments'],['withdrawals.html','fa-money-bill-transfer','Withdrawals'],
  ['transactions.html','fa-arrow-right-arrow-left','Transactions'],['pastes.html','fa-file-lines','Pastes'],['bots.html','fa-robot','Bots'],['logs.html','fa-list','Logs']
 ]:[
  ['dashboard.html','fa-house','Dashboard'],['marketplace.html','fa-store','Marketplace'],['paste.html','fa-paperclip','Create'],
  ['my-products.html','fa-link','My Links'],['purchases.html','fa-bag-shopping','Purchases'],['wallet.html','fa-wallet','Wallet'],
  ['withdrawals.html','fa-money-bill-transfer','Withdraw'],['transactions.html','fa-arrow-right-arrow-left','Transactions'],
  ['notifications.html','fa-bell','Notifications'],['profile.html','fa-user','Profile'],['settings.html','fa-gear','Settings']
 ];
 host.innerHTML=`<header class="navbar" id="tgSidebar">
  <div class="nav-inner">
   <a class="brand" href="${base}${isAdmin?'index.html':'dashboard.html'}">
    <span class="brand-mark"><i class="fa-brands fa-telegram"></i></span><span>PasTele</span>
   </a>
   <div class="nav-account">
    <div class="nav-account-info"><div class="nav-avatar"><i class="fa-solid fa-user"></i></div>
     <div class="nav-name"><b>${esc(name)}</b><small>${isAdmin?'Administrator':'Online'}</small></div>
    </div>
    <button class="btn nav-theme" id="themeToggle" type="button" title="Tema"><i class="fa-solid fa-moon"></i></button>
    <span class="nav-balance" id="navBalance">Rp 0</span>
   </div>
   <nav class="nav-links" id="navLinks">${links.map(([href,icon,label])=>`<a href="${base}${href}" data-href="${href}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('')}</nav>
  </div>
 </header>
 <button class="nav-toggle" id="navToggle" type="button" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>`;
 const current=location.pathname.split('/').pop()||'index.html';
 document.querySelectorAll('.nav-links a').forEach(a=>{if(a.dataset.href===current)a.classList.add('active')});
 const applyTheme=t=>{document.documentElement.dataset.theme=t;localStorage.setItem('pastele-theme',t);const i=document.querySelector('#themeToggle i');if(i)i.className=`fa-solid ${t==='dark'?'fa-sun':'fa-moon'}`};
 applyTheme(localStorage.getItem('pastele-theme')==='dark'?'dark':'light');
 document.getElementById('themeToggle')?.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
 document.getElementById('navToggle')?.addEventListener('click',()=>document.getElementById('tgSidebar')?.classList.toggle('nav-open'));
 document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>document.getElementById('tgSidebar')?.classList.remove('nav-open')));
 if(user&&window.sb){try{const{data:w}=await sb.from('wallets').select('balance,available_balance').eq('user_id',user.id).maybeSingle();const b=w?.available_balance??w?.balance??0;const e=document.getElementById('navBalance');if(e)e.textContent=TC.money(b)}catch(_){}}
});