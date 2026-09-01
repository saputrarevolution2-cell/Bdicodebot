
/* SOURCE: /js/settings-fixed.js?v=20260831-final */
document.addEventListener('DOMContentLoaded',async()=>{
 const p=await TC.profile();if(!p)return location.replace('login.html');const $=id=>document.getElementById(id);$('username').value=p.username||'';$('telegram_username').value=p.telegram_username||'';$('whatsapp_number').value=p.whatsapp_number||'';$('bio').value=p.bio||'';$('email').textContent=p.auth_email||'';
 const providers={ewallet:{ID:['DANA','OVO','GoPay','ShopeePay','LinkAja','iSaku','Sakuku','Jenius Pay','QRIS'],US:['PayPal','Venmo','Cash App','Apple Pay','Google Pay'],GB:['PayPal','Revolut','Wise'],SG:['PayNow','GrabPay','PayPal'],MY:['Touch n Go eWallet','GrabPay','Boost','PayPal'],PH:['GCash','Maya','GrabPay'],TH:['TrueMoney','Rabbit LINE Pay'],AU:['PayPal','Apple Pay','Google Pay'],JP:['PayPay','LINE Pay','Rakuten Pay'],OTHER:['PayPal','Wise','Revolut']},bank:{ID:['BCA','BRI','BNI','Mandiri','BSI','CIMB Niaga','Danamon','Permata','BTN','Bank Jago','SeaBank','Bank Neo Commerce','Maybank Indonesia'],US:['JPMorgan Chase','Bank of America','Wells Fargo','Citibank','U.S. Bank','Capital One'],GB:['HSBC UK','Barclays','Lloyds Bank','NatWest','Santander UK'],SG:['DBS','OCBC','UOB','Standard Chartered Singapore'],MY:['Maybank','CIMB Malaysia','Public Bank','RHB','Hong Leong Bank'],PH:['BDO','BPI','Metrobank','UnionBank','Security Bank'],TH:['Bangkok Bank','Kasikornbank','Krungthai','Siam Commercial Bank'],AU:['Commonwealth Bank','ANZ','Westpac','NAB'],JP:['MUFG','SMBC','Mizuho','Japan Post Bank'],OTHER:['SWIFT / International Bank']}};
 let method='ewallet';function fill(){const arr=providers[method][$('country').value]||providers[method].OTHER;$('provider').innerHTML=arr.map(x=>`<option>${TC.esc(x)}</option>`).join('')}fill();document.querySelectorAll('[data-method]').forEach(b=>b.onclick=()=>{method=b.dataset.method;document.querySelectorAll('[data-method]').forEach(x=>x.classList.toggle('active',x===b));fill()});$('country').onchange=fill;
 $('profileForm').onsubmit=async e=>{e.preventDefault();const r=await sb.from('profiles').update({username:$('username').value.trim(),display_name:$('username').value.trim(),telegram_username:$('telegram_username').value.trim()||null,whatsapp_number:$('whatsapp_number').value.trim()||null,bio:$('bio').value.trim()||null,updated_at:new Date().toISOString()}).eq('id',p.id);TC.toast(r.error?.message||'Profil berhasil disimpan',r.error?'error':'success')};
 $('passForm').onsubmit=async e=>{e.preventDefault();const r=await sb.auth.updateUser({password:$('newpass').value});TC.toast(r.error?.message||'Password berhasil diubah',r.error?'error':'success');if(!r.error)e.target.reset()};
 document.querySelectorAll('[data-toggle-pass]').forEach(b=>b.onclick=()=>{const i=$(b.dataset.togglePass);i.type=i.type==='password'?'text':'password';b.innerHTML=`<i class="fa-solid ${i.type==='password'?'fa-eye':'fa-eye-slash'}"></i>`});
 $('payForm').onsubmit=async e=>{e.preventDefault();const r=await sb.from('payment_methods').insert({user_id:p.id,method_type:method,provider:$('provider').value,account_name:$('pname').value.trim(),account_number:$('pnumber').value.trim(),country:$('country').value});if(r.error)TC.toast(r.error.message,'error');else{TC.toast('Payment tersimpan','success');e.target.reset();fill();loadPayments()}};
 async function loadPayments(){const r=await sb.from('payment_methods').select('*').eq('user_id',p.id).order('created_at',{ascending:false});$('savedPayments').innerHTML=(r.data||[]).map(x=>`<div class="saved-payment"><div><b>${TC.esc(x.provider)}</b><small>${TC.esc(x.method_type)} · ${TC.esc(x.account_name)} · ${TC.esc(x.account_number)}</small></div><button class="btn" data-del-pay="${x.id}"><i class="fa-solid fa-trash"></i></button></div>`).join('')||'<p class="muted">Belum ada payment tersimpan.</p>';document.querySelectorAll('[data-del-pay]').forEach(b=>b.onclick=async()=>{await sb.from('payment_methods').delete().eq('id',b.dataset.delPay).eq('user_id',p.id);loadPayments()})}loadPayments();$('logout').onclick=()=>Auth.logout();
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
