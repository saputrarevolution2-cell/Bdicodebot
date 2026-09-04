document.addEventListener('DOMContentLoaded', async () => {
 const host=document.getElementById('navbar'); if(!host)return;
 const isAdmin=location.pathname.includes('/admin/');
 const base=isAdmin?'../':'';
 let user=null; try{user=await TC.user()}catch(_){}
 const esc=v=>TC?.esc?TC.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 const name=user?.user_metadata?.username||user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Guest';
 const groups=isAdmin?[
  ['Workspace',[
   ['index.html','fa-chart-pie','Overview'],['users.html','fa-users','Users'],['products.html','fa-box','Products'],['orders.html','fa-receipt','Orders']
  ]],
  ['Finance',[
   ['payments.html','fa-credit-card','Payments'],['withdrawals.html','fa-money-bill-transfer','Withdrawals'],['transactions.html','fa-arrow-right-arrow-left','Transactions']
  ]],
  ['System',[
   ['pastes.html','fa-file-lines','Pastes'],['bots.html','fa-robot','Bots'],['logs.html','fa-list','Logs']
  ]]
 ]:[
  ['Workspace',[
   ['dashboard.html','fa-house','Dashboard'],['marketplace.html','fa-store','Marketplace']
  ]],
  ['Create & Manage',[
   ['paste.html','fa-paperclip','Create'],['my-products.html','fa-link','My Links'],['purchases.html','fa-bag-shopping','Purchases']
  ]],
  ['Finance',[
   ['wallet.html','fa-wallet','Wallet'],['withdrawals.html','fa-money-bill-transfer','Withdraw'],['transactions.html','fa-arrow-right-arrow-left','Transactions']
  ]],
  ['Account',[
   ['notifications.html','fa-bell','Notifications'],['profile.html','fa-user','Profile'],['settings.html','fa-gear','Settings']
  ]]
 ];
 const links=groups.flatMap(([,items])=>items);
 host.innerHTML=`<header class="navbar" id="tgSidebar">
  <div class="nav-inner">
   <a class="brand" href="${base}${isAdmin?'index.html':'dashboard.html'}">
    <span class="brand-mark"><i class="fa-brands fa-telegram"></i></span><span>PasTele</span>
   </a>
   <div class="nav-account">
    <a class="nav-account-info" href="${base}${isAdmin?'index.html':'profile.html'}" aria-label="Profil">
      <div class="nav-avatar"><i class="fa-solid fa-user"></i></div>
      <div class="nav-name"><b>${esc(name)}</b><small>${isAdmin?'Administrator':'Profil akun'}</small></div>
    </a>
    <span class="nav-balance" id="navBalance">Rp 0</span>
    <button class="nav-theme" id="navTheme" type="button" title="Tema"><i class="fa-solid fa-moon"></i></button>
   </div>
   <nav class="nav-links" id="navLinks">${groups.map(([title,items])=>`<div class="nav-group"><small class="nav-group-title">${title}</small>${items.map(([href,icon,label])=>`<a href="${base}${href}" data-href="${href}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('')}</div>`).join('')}</nav><div class="nav-extra" id="navSocials"></div><div class="nav-tools"><button class="nav-logout" id="navLogout" type="button"><i class="fa-solid fa-right-from-bracket"></i><span>Log out</span></button></div>
  </div>
 </header>
 <div class="nav-backdrop" id="navBackdrop"></div>
 <button class="nav-toggle" id="navToggle" type="button" aria-label="Menu" aria-expanded="false"><i class="fa-solid fa-bars"></i></button>`;
 const current=location.pathname.split('/').pop()||'index.html';
 document.querySelectorAll('.nav-links a').forEach(a=>{if(a.dataset.href===current)a.classList.add('active')});
 const sidebar=document.getElementById('tgSidebar'), toggle=document.getElementById('navToggle'), backdrop=document.getElementById('navBackdrop');
 const setMenu=open=>{
   sidebar?.classList.toggle('nav-open',open);
   backdrop?.classList.toggle('show',open);
   toggle?.setAttribute('aria-expanded',String(open));
   const icon=toggle?.querySelector('i');
   if(icon) icon.className=`fa-solid ${open?'fa-xmark':'fa-bars'}`;
   document.body.classList.toggle('nav-menu-open',open);
 };
 toggle?.addEventListener('click',()=>setMenu(!sidebar?.classList.contains('nav-open')));
 backdrop?.addEventListener('click',()=>setMenu(false));
 document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
 window.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
 if(user&&window.sb){try{const{data:w}=await sb.from('wallets').select('balance,available_balance').eq('user_id',user.id).maybeSingle();const b=w?.available_balance??w?.balance??0;const e=document.getElementById('navBalance');if(e)e.textContent=TC.money(b)}catch(_){}} 
 const savedTheme=localStorage.getItem('pastele-theme') || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); document.documentElement.dataset.theme=savedTheme; document.body.classList.toggle('theme-dark',savedTheme==='dark');
 const themeBtn=document.getElementById('navTheme'); themeBtn?.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark'; document.documentElement.dataset.theme=dark?'dark':'light'; document.body.classList.toggle('theme-dark',dark); localStorage.setItem('pastele-theme',dark?'dark':'light');const i=themeBtn.querySelector('i');if(i)i.className='fa-solid '+(dark?'fa-sun':'fa-moon')});
 if(document.body.classList.contains('theme-dark')){const i=themeBtn?.querySelector('i');if(i)i.className='fa-solid fa-sun'}
 const logoutBtn=document.getElementById('navLogout'); logoutBtn?.addEventListener('click',async()=>{try{await Auth.logout()}catch(e){TC.toast(e.message,'error')}});
 try{const r=await sb?.rpc('get_public_site_settings');const ss=Array.isArray(r?.data?.socials)?r.data.socials:[];const ns=document.getElementById('navSocials');if(ns&&ss.length)ns.innerHTML='<small>Sosial Media</small>'+ss.slice(0,5).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><i class="${esc(x.icon||'fa-solid fa-link')}"></i><span>${esc(x.name||'Social')}</span></a>`).join('')}catch(_){}

});