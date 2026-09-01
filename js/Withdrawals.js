
/* SOURCE: /js/withdrawals-fixed.js */
document.addEventListener('DOMContentLoaded',async()=>{
 const p=await TC.profile();if(!p)return location.replace('login.html');const $=id=>document.getElementById(id);
 const wq=await sb.from('wallets').select('*').eq('user_id',p.id).maybeSingle(),w=wq.data;
 const rq=await sb.from('withdrawals').select('*').eq('user_id',p.id).order('created_at',{ascending:false}).limit(100),rows=rq.data||[];
 $('bal').textContent=TC.money(w?.available_balance??w?.balance??p.balance);$('req').textContent=TC.money(rows.filter(x=>['pending','processing'].includes(x.status)).reduce((n,x)=>n+Number(x.total_debit||x.amount||0),0));$('done').textContent=TC.money(rows.filter(x=>['completed','paid','success'].includes(x.status)).reduce((n,x)=>n+Number(x.amount||0),0));
 const today=rows.filter(x=>new Date(x.created_at).toDateString()===new Date().toDateString()).reduce((n,x)=>n+Number(x.amount||0),0),pct=Math.min(100,today/500000*100),bar=$('dailyBar');bar.style.width=pct+'%';bar.dataset.level=pct>=100?'full':pct>=50?'half':'low';$('dailyText').textContent=TC.money(today)+' / '+TC.money(500000);
 const saved=await sb.from('payment_methods').select('*').eq('user_id',p.id).order('created_at',{ascending:false});const methods=saved.data||[];
 $('instantBtns').innerHTML=[50000,100000,150000,200000,250000].map(n=>`<button type="button" class="btn instant-choice" data-a="${n}"><i class="fa-solid fa-bolt"></i> ${TC.money(n)}</button>`).join('');$('method').innerHTML=['ewallet','bank'].map(x=>`<option value="${x}">${x==='ewallet'?'E-Wallet':'Bank'}</option>`).join('');
 function choose(n){$('amount').value=n;$('mode').value='instant';$('wd').querySelector('button[type=submit]').innerHTML='<i class="fa-solid fa-bolt"></i> Withdraw Instan';$('amount').focus()}
 document.querySelectorAll('.instant-choice').forEach(b=>b.onclick=()=>choose(Number(b.dataset.a)));
 const wrap=document.createElement('div');wrap.className='saved-withdraw';wrap.innerHTML='<b><i class="fa-solid fa-bookmark"></i> Payment tersimpan</b>'+methods.map(x=>`<button type="button" class="btn" data-method-id="${x.id}">${TC.esc(x.provider)} · ${TC.esc(x.account_number)}</button>`).join('');$('wd').prepend(wrap);wrap.querySelectorAll('[data-method-id]').forEach(b=>b.onclick=()=>{const x=methods.find(m=>m.id===b.dataset.methodId);$('method').value=x.method_type;$('aname').value=x.account_name;$('anum').value=x.account_number});
 $('mode').onchange=()=>{$('wd').querySelector('button[type=submit]').innerHTML=$('mode').value==='instant'?'<i class="fa-solid fa-bolt"></i> Withdraw Instan':'<i class="fa-solid fa-paper-plane"></i> Ajukan penarikan'};
 $('wd').onsubmit=async e=>{e.preventDefault();const a=Number($('amount').value);if(!a)return TC.toast('Nominal wajib diisi','error');if($('mode').value==='manual'&&a<100000)return TC.toast('Manual minimum Rp100.000','error');if($('mode').value==='instant'&&a>250000)return TC.toast('Instant maksimum Rp250.000','error');if(a>(Number(w?.available_balance??w?.balance??0)))return TC.toast('Saldo tidak mencukupi','error');try{const r=await sb.rpc('request_withdrawal_v2',{p_amount:a,p_mode:$('mode').value,p_method:$('method').value,p_account_name:$('aname').value,p_account_number:$('anum').value});if(r.error)throw r.error;TC.toast('Withdraw berhasil diajukan','success');setTimeout(()=>location.reload(),600)}catch(e){TC.toast(e.message,'error')}};
 $('history').innerHTML=rows.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('id-ID')}</td><td>${TC.money(x.amount)}</td><td><i class="fa-solid ${x.method==='bank'?'fa-building-columns':'fa-wallet'}"></i> ${TC.esc(x.method)}<br><small>${TC.esc(x.account_number||'')}</small></td><td>${TC.esc(x.mode)}</td><td>${TC.esc(x.status)}</td><td>${TC.esc(x.ticket_code||x.id)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Belum ada pengajuan.</td></tr>';
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
