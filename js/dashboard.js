(()=>{
const C=window.TELECOD_CONFIG||{}, configured=C.SUPABASE_URL&&!C.SUPABASE_URL.includes('YOUR_')&&C.SUPABASE_ANON_KEY&&!C.SUPABASE_ANON_KEY.includes('YOUR_');
const sup=configured?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const MASTER_ADMIN_ID=String(C.ADMIN_TELEGRAM_ID||"6665664367").replace(/\D/g,"");
const state={user:null,profile:{},lang:localStorage.getItem('telecod_lang')||'id'};
const T={
 id:{main:'Menu Utama',creator:'Creator',account:'Akun',dashboard:'Dashboard',marketplace:'Marketplace',channel:'Channel',code:'Code',createChannel:'Buat / Tambah Channel',createCode:'Buat / Tambah Code',purchases:'My Purchases',payment:'Payment',profile:'Profile',settings:'Pengaturan',logout:'Log Out',welcome:'Selamat datang kembali',overview:'Ringkasan akun kamu',products:'Produk Saya',sales:'Penjualan',views:'Views',spent:'Total Belanja',earned:'Total Pendapatan',recent:'Aktivitas Terbaru',quick:'Aksi Cepat',create:'Buat',buy:'Beli',detail:'Detail',free:'Free',paid:'Paid',search:'Cari channel atau code...',all:'Semua',empty:'Belum ada data.',login:'Silakan login terlebih dahulu.',config:'Supabase belum dikonfigurasi.',saved:'Berhasil disimpan.',error:'Terjadi kesalahan.',balance:'Saldo',transactions:'Transaksi',deposit:'Deposit',withdraw:'Withdraw',creatorSince:'Creator sejak',noProducts:'Belum ada produk.',createProduct:'Buat Produk',channelTitle:'Buat Channel',codeTitle:'Buat Code',name:'Nama',description:'Deskripsi',type:'Tipe',price:'Harga',telegram:'Telegram Channel',category:'Kategori',content:'Isi / Code',image:'Thumbnail URL',publish:'Publish',cancel:'Batal',profileInfo:'Informasi Profil',username:'Username Telegram',telegramNo:'No. Telegram',language:'Bahasa',appearance:'Tampilan',security:'Keamanan',dark:'Gelap',light:'Terang',save:'Simpan',purchasesTitle:'My Purchases',paymentTitle:'Payment',marketTitle:'Marketplace',filter:'Filter',channelFree:'Channel Free',channelPaid:'Channel Paid',codeFree:'Code Free',codePaid:'Code Paid',purchase:'Pembelian',status:'Status',date:'Tanggal',amount:'Jumlah',seller:'Creator',typeChannel:'Channel',typeCode:'Code',noPurchases:'Belum ada pembelian.',noTransactions:'Belum ada transaksi.',update:'Update',required:'Field wajib diisi.',minPrice:'Harga tidak valid.',published:'Produk berhasil dipublish.',edit:'Edit',delete:'Hapus',open:'Buka',access:'Akses',pending:'Menunggu pembayaran',paidStatus:'Sudah dibayar',depositHint:'Minimum Rp 10.000',withdrawHint:'Saldo akan dicadangkan saat request.',method:'Metode',accountName:'Nama Pemilik',accountNumber:'Nomor Rekening / Wallet',requestWithdraw:'Ajukan Withdraw',depositAmount:'Jumlah Deposit',pay:'Bayar Sekarang',freeBuy:'Ambil Gratis',paymentCreated:'Pembayaran dibuat. Menunggu hasil gateway.',paymentSuccess:'Pembayaran berhasil.',paymentFailed:'Pembayaran gagal atau kedaluwarsa.',withdrawCreated:'Permintaan withdraw berhasil dibuat.',withdrawHistory:'Riwayat Withdraw',noWithdrawals:'Belum ada withdraw.',detailTitle:'Detail Produk',close:'Tutup',copy:'Salin',copied:'Tersalin.',contentLocked:'Konten hanya tersedia setelah pembelian berhasil.',selfProduct:'Ini produk kamu.',confirmDelete:'Hapus produk ini?',productDeleted:'Produk berhasil dihapus.',productUpdated:'Produk berhasil diperbarui.',loginRequired:'Login diperlukan.',selectMethod:'Pilih metode',bank:'Bank',ewallet:'E-Wallet',crypto:'Crypto',paymentGateway:'DompetX',settingsSaved:'Pengaturan disimpan di perangkat.',availableBalance:'Saldo Tersedia',pendingBalance:'Saldo Pending · H+1',pendingHint:'Penjualan baru tersedia setelah 1 hari.',descriptionLabel:'Deskripsi',productLabel:'Produk',displayName:'Nama Tampilan',passwordManaged:'Password dikelola Supabase Auth.',close:'Tutup'},
 en:{main:'Main Menu',creator:'Creator',account:'Account',dashboard:'Dashboard',marketplace:'Marketplace',channel:'Channel',code:'Code',createChannel:'Create / Add Channel',createCode:'Create / Add Code',purchases:'My Purchases',payment:'Payment',profile:'Profile',settings:'Settings',logout:'Log Out',welcome:'Welcome back',overview:'Your account overview',products:'My Products',sales:'Sales',views:'Views',spent:'Total Spent',earned:'Total Earned',recent:'Recent Activity',quick:'Quick Actions',create:'Create',buy:'Buy',detail:'Detail',free:'Free',paid:'Paid',search:'Search channel or code...',all:'All',empty:'No data yet.',login:'Please sign in first.',config:'Supabase is not configured.',saved:'Saved successfully.',error:'Something went wrong.',balance:'Balance',transactions:'Transactions',deposit:'Deposit',withdraw:'Withdraw',creatorSince:'Creator since',noProducts:'No products yet.',createProduct:'Create Product',channelTitle:'Create Channel',codeTitle:'Create Code',name:'Name',description:'Description',type:'Type',price:'Price',telegram:'Telegram Channel',category:'Category',content:'Content / Code',image:'Thumbnail URL',publish:'Publish',cancel:'Cancel',profileInfo:'Profile Information',username:'Telegram Username',telegramNo:'Telegram Number',language:'Language',appearance:'Appearance',security:'Security',dark:'Dark',light:'Light',save:'Save',purchasesTitle:'My Purchases',paymentTitle:'Payment',marketTitle:'Marketplace',filter:'Filter',channelFree:'Free Channels',channelPaid:'Paid Channels',codeFree:'Free Codes',codePaid:'Paid Codes',purchase:'Purchase',status:'Status',date:'Date',amount:'Amount',seller:'Creator',typeChannel:'Channel',typeCode:'Code',noPurchases:'No purchases yet.',noTransactions:'No transactions yet.',update:'Update',required:'Required field.',minPrice:'Invalid price.',published:'Product published.',edit:'Edit',delete:'Delete',open:'Open',access:'Access',pending:'Waiting for payment',paidStatus:'Paid',depositHint:'Minimum Rp 10,000',withdrawHint:'Balance is reserved when requested.',method:'Method',accountName:'Account Name',accountNumber:'Bank / Wallet Number',requestWithdraw:'Request Withdrawal',depositAmount:'Deposit Amount',pay:'Pay Now',freeBuy:'Get Free',paymentCreated:'Payment created. Waiting for gateway result.',paymentSuccess:'Payment successful.',paymentFailed:'Payment failed or expired.',withdrawCreated:'Withdrawal request created.',withdrawHistory:'Withdrawal History',noWithdrawals:'No withdrawals yet.',detailTitle:'Product Detail',close:'Close',copy:'Copy',copied:'Copied.',contentLocked:'Content is available after successful purchase.',selfProduct:'This is your product.',confirmDelete:'Delete this product?',productDeleted:'Product deleted.',productUpdated:'Product updated.',loginRequired:'Login required.',selectMethod:'Select method',bank:'Bank',ewallet:'E-Wallet',crypto:'Crypto',paymentGateway:'DompetX',settingsSaved:'Settings saved on this device.',availableBalance:'Available Balance',pendingBalance:'Pending Balance · H+1',pendingHint:'New sales become available after 1 day.',descriptionLabel:'Description',productLabel:'Product',displayName:'Display Name',passwordManaged:'Password is managed by Supabase Auth.',close:'Close'}
};
const tr=k=>(T[state.lang]||T.id)[k]||k;
function toast(msg,type=''){const el=$('#toast');if(!el)return;el.innerHTML=`<i class="fa-solid ${type==='success'?'fa-circle-check':type==='error'?'fa-circle-xmark':type==='warning'?'fa-triangle-exclamation':'fa-circle-info'}"></i> <span>${escape(msg)}</span>`;el.className='toast show '+type;clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.className='toast',4000)}
function money(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0))}
function escape(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function initials(s){return (s||'U').replace('@','').slice(0,1).toUpperCase()}
function setTheme(){document.documentElement.dataset.theme='dark';document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');document.body.classList.remove('light');document.body.classList.add('dark');}
function applyLang(){document.documentElement.lang=state.lang;$$('[data-i18n]').forEach(x=>x.textContent=tr(x.dataset.i18n));if($('#langBtn'))$('#langBtn').textContent=state.lang.toUpperCase()}
function setActive(page){$$('.nav-item[data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===page));if(['channel-free','channel-paid'].includes(page))$('#submenu-channel')?.classList.add('open');if(['code-free','code-paid'].includes(page))$('#submenu-code')?.classList.add('open')}
function closeMobile(){$('#sidebar')?.classList.remove('open');$('#overlay')?.classList.remove('show')}
function layoutReady(){
 $('#menuBtn').onclick=()=>{$('#sidebar').classList.toggle('open');$('#overlay').classList.toggle('show')};$('#overlay').onclick=closeMobile;
 $('#langBtn').onclick=()=>{state.lang=state.lang==='id'?'en':'id';localStorage.setItem('telecod_lang',state.lang);applyLang();render()};
 $$('.nav-parent').forEach(b=>b.onclick=()=>$('#submenu-'+b.dataset.toggle).classList.toggle('open'));
 $('#logoutBtn').onclick=async e=>{e.preventDefault();if(sup)await sup.auth.signOut();location.href='/index.html'};$('#userBtn').onclick=()=>location.href='/dashboard?page=profile';setTheme();applyLang();
}
async function loadUser(){if(!sup){toast(tr('config'),'warning');return true}const {data,error}=await sup.auth.getUser();if(error||!data.user){location.href='/index.html?login=1';return false}state.user=data.user;const {data:p}=await sup.from('profiles').select('*').eq('id',state.user.id).maybeSingle();state.profile=p||{};if(state.profile.is_banned){await sup.auth.signOut();location.href='index.html?banned=1';return false}if(state.profile.is_admin || String(state.profile.telegram_id||"").replace(/\D/g,"")===MASTER_ADMIN_ID)$('#adminNav').style.display='flex';await sup.rpc('ensure_wallet',{p_user:state.user.id});$('#topUser').textContent='@'+(state.profile.username||state.user.user_metadata?.username||'user');$('#avatar').textContent=initials(state.profile.username||state.user.email);return true}
async function queryProducts(filters={}){if(!sup)return[];let q=sup.from('marketplace_public').select('*').eq('status','published').order('created_at',{ascending:false});if(filters.type)q=q.eq('type',filters.type);if(filters.access_type)q=q.eq('access_type',filters.access_type);if(filters.search)q=q.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);const {data,error}=await q.limit(100);if(error){toast(error.message,'error');return[]}return data||[]}
function productCard(p,manage=false){const icon=p.type==='channel'?'fa-bullhorn':'fa-code';const own=state.user&&p.creator_id===state.user.id;return `<article class="card product-card"><div class="product-img"><i class="fa-solid ${icon}"></i></div><div class="product-body"><div class="product-type"><span class="pill">${p.type==='channel'?tr('typeChannel'):tr('typeCode')}</span><span class="pill ${p.access_type}">${p.access_type==='free'?tr('free'):tr('paid')}</span></div><div class="product-title">${escape(p.title)}</div><div class="product-desc">${escape(p.description||'')}</div><div class="creator">@${escape(p.creator_username||'creator')} · ${Number(p.views||0).toLocaleString()} views</div><div class="product-foot"><span class="price">${p.access_type==='free'?tr('free'):money(p.price)}</span><div class="actions-inline"><button class="btn btn-secondary" data-detail="${p.id}"><i class="fa-solid fa-eye"></i></button>${own&&manage?`<button class="btn btn-secondary" data-edit="${p.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger" data-delete="${p.id}"><i class="fa-solid fa-trash"></i></button>`:`<button class="btn btn-primary" data-buy="${p.id}"><i class="fa-solid ${p.access_type==='free'?'fa-download':'fa-credit-card'}"></i> ${p.access_type==='free'?tr('freeBuy'):tr('buy')}</button>`}</div></div></div></article>`}
async function openProduct(id){if(!sup)return;const {data:p,error}=await sup.from('products').select('*').eq('id',id).single();if(error||!p)return toast(tr('error'),'error');await sup.rpc('increment_product_view',{p_product:id,p_viewer_hash:state.user?.id||null});const {data:purchase}=state.user?await sup.from('purchases').select('status').eq('product_id',id).eq('buyer_id',state.user.id).maybeSingle():{data:null};const canAccess=p.access_type==='free'||purchase?.status==='paid'||p.creator_id===state.user.id;$('#modal').classList.add('show');$('#modalBody').innerHTML=`<div class="modal-head"><div><div class="eyebrow">${p.type.toUpperCase()}</div><h2 class="section-title">${escape(p.title)}</h2></div><button class="close" id="closeModal"><i class="fa-solid fa-xmark"></i></button></div><p class="muted">${escape(p.description||'')}</p><div class="card modal-inner"><div class="stat-label">${tr('price')}</div><div class="stat-value">${p.access_type==='free'?tr('free'):money(p.price)}</div></div><div class="actions">${canAccess?`<button class="btn btn-primary" id="accessProduct"><i class="fa-solid fa-unlock"></i> ${tr('access')}</button>`:`<button class="btn btn-primary" id="modalBuy"><i class="fa-solid fa-credit-card"></i> ${p.access_type==='free'?tr('freeBuy'):tr('pay')}</button>`}</div>`;$('#closeModal').onclick=()=>$('#modal').classList.remove('show');const b=canAccess?$('#accessProduct'):$('#modalBuy');b.onclick=()=>canAccess?showAccess(p):purchase(p.id)}
function showAccess(p){$('#modalBody').innerHTML=`<div class="modal-head"><h2 class="section-title">${escape(p.title)}</h2><button class="close" id="closeAccess"><i class="fa-solid fa-xmark"></i></button></div>${p.type==='channel'?`<p class="muted">${escape(p.telegram_channel||'')}</p><a class="btn btn-primary" target="_blank" rel="noopener" href="${escape(p.telegram_channel||'#')}"><i class="fa-brands fa-telegram"></i> ${tr('open')}</a>`:`<textarea class="textarea code-area" readonly>${escape(p.content||tr('contentLocked'))}</textarea><button class="btn btn-secondary" id="copyContent"><i class="fa-regular fa-copy"></i> ${tr('copy')}</button>`}`;$('#closeAccess').onclick=()=>$('#modal').classList.remove('show');$('#copyContent')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(p.content||'');toast(tr('copied'),'success')})}
function openPaymentModal(p){
 const qr=p.qr_url?`<div class="payment-qr"><img src="${escape(p.qr_url)}" alt="QRIS"></div>`:'';
 openModal(`<div class="modal-head"><h2 class="section-title"><i class="fa-solid fa-qrcode"></i> ${tr('payment')}</h2><button class="close" id="x"><i class="fa-solid fa-xmark"></i></button></div>
 <div class="payment-modal-body">${qr}<div class="payment-info"><b>${money(p.amount)}</b><span>${escape(p.method||'QRIS')}</span><small>${escape(p.provider_payment_id||p.order_id||'')}</small></div>
 <div class="grid"><button class="btn btn-primary" id="checkPay"><i class="fa-solid fa-rotate"></i> Cek Pembayaran</button><button class="btn btn-secondary" id="closePay">Tutup</button></div>
 <p class="muted">Selesaikan pembayaran melalui QRIS. Status akan diverifikasi langsung ke DompetX.</p></div>`);
 $('#x').onclick=closeModal; $('#closePay').onclick=closeModal;
 $('#checkPay').onclick=async()=>{await pollPayment(p.payment_id,true)};
}
async function createPayment(action,payload={}){
 if(!sup)return toast(tr('config'),'warning');
 const fn=C.PAYMENT_CREATE_FUNCTION_URL;
 if(!fn||fn.includes('YOUR_'))return toast('Payment function belum dikonfigurasi.','warning');
 try{
  const {data:{session}}=await sup.auth.getSession();
  const r=await fetch(fn,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
  const out=await r.json(); if(!r.ok)throw new Error(out.error||'Payment error');
  openPaymentModal(out); pollPayment(out.payment_id,false);
 }catch(e){toast(e.message,'error')}
}
async function pollPayment(id,manual=false){
 for(let i=0;i<manual?1:40;i++){
  if(!manual)await new Promise(r=>setTimeout(r,4000));
  try{
   const {data:{session}}=await sup.auth.getSession();
   const r=await fetch(C.PAYMENT_STATUS_FUNCTION_URL,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({payment_id:id})});
   const p=await r.json();
   if(!r.ok)throw new Error(p.error||'Status error');
   if(p.status==='paid'){toast(tr('paymentSuccess'),'success');closeModal();render();return}
   if(['failed','expired','cancelled','refunded'].includes(p.status)){toast(tr('paymentFailed'),'error');closeModal();render();return}
   if(manual)toast('Pembayaran masih menunggu.','warning');
  }catch(e){if(manual)toast(e.message,'error');}
 }
}
function openDeposit(){openModal(`<div class="modal-head"><h2 class="section-title"><i class="fa-solid fa-circle-plus"></i> Deposit</h2><button class="close" id="depositClose"><i class="fa-solid fa-xmark"></i></button></div><p class="muted">Minimum deposit Rp 10.000. Saldo yang berhasil masuk dapat digunakan untuk membeli Code atau Channel Paid.</p><form id="depositForm" class="grid"><div class="form-group"><label class="form-label">Jumlah Deposit</label><input class="input" id="depositAmount" type="number" min="10000" step="1000" value="10000" required><small class="help">Minimum Rp 10.000</small></div><div class="actions"><button type="button" class="btn btn-secondary" id="depositCancel">Batal</button><button class="btn btn-primary"><i class="fa-solid fa-qrcode"></i> Lanjut ke Pembayaran</button></div></form>`);$('#depositClose').onclick=$('#depositCancel').onclick=closeModal;$('#depositForm').onsubmit=async e=>{e.preventDefault();const amount=Number($('#depositAmount').value);if(!Number.isFinite(amount)||amount<10000)return toast('Minimum deposit Rp 10.000.','error');await createPayment('deposit',{amount})}}
async function purchase(id){if(!state.user)return toast(tr('loginRequired'),'warning');const {data:p}=await sup.from('products').select('id,title,type,access_type,price').eq('id',id).single();if(!p)return;if(p.access_type==='free'){const {error}=await sup.rpc('complete_free_purchase',{p_product:id});if(error)toast(error.message,'error');else{toast(tr('paymentSuccess'),'success');render()}}else await createPayment('purchase',{product_id:id})}
async function renderDashboard(){
 setActive('dashboard');
 const [{data:products},{data:purchases},{data:tx},{data:w},{data:salesPurchases}]=await Promise.all([
  sup.from('products').select('id,title,type,views,created_at').eq('creator_id',state.user.id),
  sup.from('purchases').select('id,amount,status').eq('buyer_id',state.user.id),
  sup.from('transactions').select('*').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(100),
  sup.from('wallets').select('balance,pending_balance').eq('user_id',state.user.id).maybeSingle(),
  sup.from('purchases').select('id,amount,status,created_at,products!inner(id,type,creator_id)').eq('products.creator_id',state.user.id).eq('status','paid').order('created_at',{ascending:false}).limit(500)
 ]);
 const all=products||[], codes=all.filter(x=>x.type==='code'), channels=all.filter(x=>x.type==='channel');
 const views=x=>x.reduce((a,v)=>a+Number(v.views||0),0);
 const earned=x=>(tx||[]).filter(v=>v.type==='sale'&&v.status==='success'&&x.includes(v.reference_id)).reduce((a,v)=>a+Number(v.amount||0),0);
 const codeIds=codes.map(x=>x.id), channelIds=channels.map(x=>x.id);
 const creatorSales=salesPurchases||[];
 const codeEarn=creatorSales.filter(x=>codeIds.includes(x.products?.id)).reduce((a,v)=>a+Number(v.amount||0),0), channelEarn=creatorSales.filter(x=>channelIds.includes(x.products?.id)).reduce((a,v)=>a+Number(v.amount||0),0);
 const totalEarn=creatorSales.reduce((a,v)=>a+Number(v.amount||0),0);
 const totalViews=views(all), balance=Number(w?.balance||0), pending=Number(w?.pending_balance||0);
 const trend=(n)=>`<span class="tc-trend ${n>=0?'up':'down'}"><i class="fa-solid fa-arrow-${n>=0?'trend-up':'trend-down'}"></i> ${Math.abs(n)}%</span>`;
 const periodRows=(days)=>{const now=Date.now(),cut=now-days*86400000;const vals=(tx||[]).filter(v=>new Date(v.created_at).getTime()>=cut&&v.status==='success');return {sales:vals.filter(v=>v.type==='sale').reduce((a,v)=>a+Number(v.amount||0),0),count:vals.length}};
 const d=periodRows(1),w7=periodRows(7),m=periodRows(30);
 const salesPeriod=(days,type)=>{const cut=Date.now()-days*86400000;return creatorSales.filter(x=>new Date(x.created_at).getTime()>=cut&&x.products?.type===type).reduce((a,v)=>a+Number(v.amount||0),0)};
 const cd=salesPeriod(1,'code'),cw=salesPeriod(7,'code'),cm=salesPeriod(30,'code'),chd=salesPeriod(1,'channel'),chw=salesPeriod(7,'channel'),chm=salesPeriod(30,'channel');
 $('#content').innerHTML=`
 <div class="page-head tc-dashboard-head"><div><div class="eyebrow">TELECOD CREATOR CENTER</div><h1 class="page-title">${tr('welcome')}, @${escape(state.profile.username||'user')}</h1><p class="page-sub">${tr('overview')} — pantau Code, Channel, penjualan, saldo, dan performa dalam satu layar.</p></div><div class="tc-create-picker"><button class="btn btn-primary" id="createProductBtn"><i class="fa-solid fa-plus"></i> ${tr('createProduct')} <i class="fa-solid fa-chevron-down"></i></button><div class="tc-create-menu" id="createProductMenu"><a href="/dashboard?page=create-code"><i class="fa-solid fa-code"></i><span><b>Add Code</b><small>Tambahkan source/code ke marketplace</small></span></a><a href="/dashboard?page=create-channel"><i class="fa-brands fa-telegram"></i><span><b>Add Channel</b><small>Tambahkan channel Telegram</small></span></a></div></div></div>
 <div class="tc-overview-grid"><div class="card tc-overview-card"><span class="tc-stat-icon"><i class="fa-solid fa-boxes-stacked"></i></span><div><small>Produk Saya</small><strong>${all.length}</strong><em>${codes.length} Code · ${channels.length} Channel</em></div></div><div class="card tc-overview-card"><span class="tc-stat-icon"><i class="fa-solid fa-eye"></i></span><div><small>Views</small><strong>${totalViews.toLocaleString()}</strong><em>${trend(8)} vs periode sebelumnya</em></div></div><div class="card tc-overview-card"><span class="tc-stat-icon"><i class="fa-solid fa-money-bill-trend-up"></i></span><div><small>Total Pendapatan</small><strong>${money(totalEarn)}</strong><em>${trend(12)} performa penjualan</em></div></div><div class="card tc-overview-card"><span class="tc-stat-icon"><i class="fa-solid fa-wallet"></i></span><div><small>Saldo</small><strong>${money(balance)}</strong><em>Pending ${money(pending)}</em></div></div></div>
 <div class="tc-product-split"><section class="card tc-product-panel"><div class="tc-panel-head"><div><span class="tc-panel-icon code"><i class="fa-solid fa-code"></i></span><div><h2>Code</h2><p>Performa semua produk Code kamu.</p></div></div><a class="btn btn-secondary" href="/dashboard?page=code-free"><i class="fa-solid fa-arrow-right"></i> Kelola</a></div><div class="tc-mini-stats"><div><small>Produk</small><b>${codes.length}</b></div><div><small>Views</small><b>${views(codes).toLocaleString()}</b></div><div><small>Pendapatan</small><b>${money(codeEarn)}</b></div></div><div class="tc-sparkline"><i style="height:35%"></i><i style="height:48%"></i><i style="height:42%"></i><i style="height:62%"></i><i style="height:54%"></i><i style="height:74%"></i><i style="height:82%"></i></div><div class="tc-report-row"><span><i class="fa-solid fa-calendar-day"></i> Hari ini <b>${money(cd)}</b></span><span><i class="fa-solid fa-calendar-week"></i> 7 hari <b>${money(cw)}</b></span><span><i class="fa-solid fa-calendar-days"></i> Bulan <b>${money(cm)}</b></span></div></section>
 <section class="card tc-product-panel"><div class="tc-panel-head"><div><span class="tc-panel-icon channel"><i class="fa-brands fa-telegram"></i></span><div><h2>Channel</h2><p>Performa semua produk Channel kamu.</p></div></div><a class="btn btn-secondary" href="/dashboard?page=channel-free"><i class="fa-solid fa-arrow-right"></i> Kelola</a></div><div class="tc-mini-stats"><div><small>Produk</small><b>${channels.length}</b></div><div><small>Views</small><b>${views(channels).toLocaleString()}</b></div><div><small>Pendapatan</small><b>${money(channelEarn)}</b></div></div><div class="tc-sparkline channel"><i style="height:44%"></i><i style="height:38%"></i><i style="height:58%"></i><i style="height:51%"></i><i style="height:69%"></i><i style="height:64%"></i><i style="height:86%"></i></div><div class="tc-report-row"><span><i class="fa-solid fa-calendar-day"></i> Hari ini <b>${money(chd)}</b></span><span><i class="fa-solid fa-calendar-week"></i> 7 hari <b>${money(chw)}</b></span><span><i class="fa-solid fa-calendar-days"></i> Bulan <b>${money(chm)}</b></span></div></section></div>
 <section class="card tc-report-card"><div class="tc-panel-head"><div><span class="tc-panel-icon"><i class="fa-solid fa-chart-column"></i></span><div><h2>Report Penjualan</h2><p>Ringkasan harian, mingguan, dan bulanan.</p></div></div></div><div class="tc-report-grid"><div><small>Hari Ini</small><strong>${money(d.sales)}</strong><span>${d.count} transaksi ${trend(6)}</span></div><div><small>Minggu Ini</small><strong>${money(w7.sales)}</strong><span>${w7.count} transaksi ${trend(9)}</span></div><div><small>Bulan Ini</small><strong>${money(m.sales)}</strong><span>${m.count} transaksi ${trend(15)}</span></div></div></section>
 <div class="grid two" style="margin-top:18px"><section class="card"><h2 class="section-title"><i class="fa-solid fa-clock-rotate-left"></i> ${tr('recent')}</h2>${tx?.length?`<div class="table-wrap"><table class="table"><thead><tr><th>${tr('date')}</th><th>${tr('description')}</th><th>${tr('amount')}</th><th>${tr('status')}</th></tr></thead><tbody>${tx.slice(0,8).map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString(state.lang==='id'?'id-ID':'en-US')}</td><td>${escape(x.description||x.type)}</td><td class="${x.direction==='credit'?'money-plus':'money-minus'}">${x.direction==='credit'?'+':'-'}${money(x.amount)}</td><td>${escape(x.status)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><i class="fa-solid fa-chart-line big"></i><br>${tr('empty')}</div>`}</section><section class="card"><h2 class="section-title"><i class="fa-solid fa-bolt"></i> Aksi Cepat</h2><div class="tc-quick-grid"><a class="btn btn-primary" href="/dashboard?page=create-code"><i class="fa-solid fa-code"></i> Add Code</a><a class="btn btn-secondary" href="/dashboard?page=create-channel"><i class="fa-brands fa-telegram"></i> Add Channel</a><a class="btn btn-secondary" href="/dashboard?page=payment"><i class="fa-solid fa-wallet"></i> Payment</a><a class="btn btn-secondary" href="/dashboard?page=profile"><i class="fa-solid fa-user"></i> Profile</a></div></section></div>`;
 $('#createProductBtn').onclick=()=>$('#createProductMenu').classList.toggle('show');
 document.addEventListener('click',e=>{if(!e.target.closest('.tc-create-picker'))$('#createProductMenu')?.classList.remove('show')},{once:true});
}
async function renderMarketplace(filter={}){setActive('marketplace');$('#content').innerHTML=`<div class="page-head"><div><div class="eyebrow">TELECOD</div><h1 class="page-title">${tr('marketTitle')}</h1><p class="page-sub">Channel & Code dari creator TeleCod.</p></div></div><div class="toolbar"><input id="marketSearch" class="input search" placeholder="${tr('search')}"><select id="marketType" class="select" style="max-width:160px"><option value="">${tr('all')}</option><option value="channel">Channel</option><option value="code">Code</option></select><select id="marketAccess" class="select" style="max-width:160px"><option value="">${tr('all')}</option><option value="free">Free</option><option value="paid">Paid</option></select></div><div id="marketGrid" class="grid product-grid"></div>`;const load=async()=>{const data=await queryProducts({search:$('#marketSearch').value.trim(),type:$('#marketType').value,access_type:$('#marketAccess').value});$('#marketGrid').innerHTML=data.length?data.map(p=>productCard(p,false)).join(''):`<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-cart-shopping big"></i><br>${tr('empty')}</div>`;bindCards()};$('#marketSearch').oninput=debounce(load,250);$('#marketType').onchange=load;$('#marketAccess').onchange=load;await load()}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
function bindCards(){$$('[data-detail]').forEach(b=>b.onclick=()=>openProduct(b.dataset.detail));$$('[data-buy]').forEach(b=>b.onclick=()=>purchase(b.dataset.buy));$$('[data-edit]').forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));$$('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete))}
async function renderProducts(filter){const type=filter.startsWith('channel')?'channel':'code',access=filter.endsWith('free')?'free':'paid';setActive(filter);const data=await queryProducts({type,access_type:access});const mine=data.filter(p=>p.creator_id===state.user.id);$('#content').innerHTML=`<div class="page-head"><div><div class="eyebrow">${type.toUpperCase()}</div><h1 class="page-title">${type==='channel'?(access==='free'?tr('channelFree'):tr('channelPaid')):(access==='free'?tr('codeFree'):tr('codePaid'))}</h1></div><a class="btn btn-primary" href="/dashboard?page=${type==='channel'?'create-channel':'create-code'}"><i class="fa-solid fa-plus"></i> ${type==='channel'?tr('createChannel'):tr('createCode')}</a></div><div class="grid product-grid">${data.length?data.map(p=>productCard(p,true)).join(''):`<div class="empty" style="grid-column:1/-1"><i class="fa-solid ${type==='channel'?'fa-bullhorn':'fa-code'} big"></i><br>${tr('empty')}</div>`}</div>`;bindCards()}
async function renderCreate(type,editId=null){
  setActive(type==='channel'?'channel':'code');
  let p=null;
  if(editId){
    const r=await sup.from('products').select('*').eq('id',editId).eq('creator_id',state.user.id).single();
    p=r.data;
  }

  const isChannel=type==='channel';
  const title=editId?tr('edit'):(isChannel?tr('channelTitle'):tr('codeTitle'));
  const icon=isChannel?'fa-brands fa-telegram':'fa-solid fa-code';
  const accent=isChannel?'channel':'code';

  $('#content').innerHTML=`
    <div class="creator-create-page ${accent}-create-page">

      <div class="creator-create-hero">
        <div class="creator-create-hero-icon ${accent}">
          <i class="${icon}"></i>
        </div>
        <div class="creator-create-hero-copy">
          <div class="eyebrow">CREATOR • ${isChannel?'CHANNEL':'CODE'}</div>
          <h1 class="page-title">${title}</h1>
          <p class="page-sub">
            ${isChannel
              ? 'Tambahkan channel Telegram kamu ke marketplace dengan tampilan profesional.'
              : 'Tambahkan source code atau bot code dengan informasi lengkap dan rapi.'}
          </p>
        </div>
        <div class="creator-create-badge">
          <i class="fa-solid fa-shield-halved"></i>
          Marketplace
        </div>
      </div>

      <form id="productForm" class="creator-form">

        <div class="creator-form-main">

          <section class="create-section">
            <div class="create-section-head">
              <div class="create-section-icon"><i class="fa-solid fa-circle-info"></i></div>
              <div>
                <h2>Informasi Produk</h2>
                <p>Isi informasi dasar yang akan dilihat pembeli.</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="fTitle">Nama Produk <span>*</span></label>
                <div class="input-wrap">
                  <i class="fa-solid ${isChannel?'fa-bullhorn':'fa-tag'}"></i>
                  <input class="input" id="fTitle" value="${escape(p?.title||'')}" placeholder="${isChannel?'Contoh: Channel Premium Indonesia':'Contoh: Bot Telegram Auto Reply'}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="fCategory">Kategori</label>
                <div class="input-wrap">
                  <i class="fa-solid fa-folder"></i>
                  <input class="input" id="fCategory" value="${escape(p?.category||'')}" placeholder="Contoh: Bot, Tools, Education">
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label" for="fDesc">Deskripsi</label>
                <textarea class="textarea" id="fDesc" rows="5" placeholder="Jelaskan isi, fitur, manfaat, dan informasi penting produk...">${escape(p?.description||'')}</textarea>
                <small class="field-help">Deskripsi yang jelas membuat pembeli lebih mudah memahami produk.</small>
              </div>
            </div>
          </section>

          <section class="create-section">
            <div class="create-section-head">
              <div class="create-section-icon"><i class="fa-solid fa-tags"></i></div>
              <div>
                <h2>Harga & Akses</h2>
                <p>Tentukan apakah produk tersedia gratis atau berbayar.</p>
              </div>
            </div>

            <div class="access-choice">
              <label class="access-card free-choice">
                <input type="radio" name="accessType" value="free" ${!p||p?.access_type==='free'?'checked':''}>
                <span class="access-card-icon"><i class="fa-solid fa-gift"></i></span>
                <span class="access-card-copy">
                  <strong>Free</strong>
                  <small>Pembeli dapat mengakses tanpa pembayaran.</small>
                </span>
                <span class="access-check"><i class="fa-solid fa-check"></i></span>
              </label>

              <label class="access-card paid-choice">
                <input type="radio" name="accessType" value="paid" ${p?.access_type==='paid'?'checked':''}>
                <span class="access-card-icon"><i class="fa-solid fa-crown"></i></span>
                <span class="access-card-copy">
                  <strong>Paid</strong>
                  <small>Pembeli harus membayar sebelum mendapatkan akses.</small>
                </span>
                <span class="access-check"><i class="fa-solid fa-check"></i></span>
              </label>
            </div>

            <div class="price-field" id="priceField">
              <label class="form-label" for="fPrice">Harga Produk <span>*</span></label>
              <div class="price-input-wrap">
                <span>Rp</span>
                <input class="input" id="fPrice" type="number" min="0" value="${Number(p?.price||0)}" placeholder="10000">
              </div>
              <small class="field-help">Minimum harga produk Paid adalah Rp 1.</small>
            </div>
          </section>

          ${isChannel?`
          <section class="create-section">
            <div class="create-section-head">
              <div class="create-section-icon channel"><i class="fa-brands fa-telegram"></i></div>
              <div>
                <h2>Telegram Channel</h2>
                <p>Masukkan link channel yang akan diberikan kepada pembeli.</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fTelegram">Link Channel <span>*</span></label>
              <div class="input-wrap telegram-input">
                <i class="fa-brands fa-telegram"></i>
                <input class="input" id="fTelegram" value="${escape(p?.telegram_channel||'')}" placeholder="https://t.me/namachannel" required>
              </div>
              <small class="field-help">Pastikan bot/admin marketplace memiliki akses yang diperlukan sesuai sistem channel kamu.</small>
            </div>
          </section>
          `:`
          <section class="create-section code-content-section">
            <div class="create-section-head">
              <div class="create-section-icon code"><i class="fa-solid fa-code"></i></div>
              <div>
                <h2>Source Code</h2>
                <p>Masukkan source code atau konten yang akan diterima pembeli.</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fContent">Content / Code <span>*</span></label>
              <textarea class="textarea code-area" id="fContent" rows="16" placeholder="# Tempel source code di sini...">${escape(p?.content||'')}</textarea>
              <small class="field-help">Jangan masukkan password, API key, token bot, atau data rahasia ke dalam produk.</small>
            </div>
          </section>
          `}

          <div class="creator-form-actions">
            <a class="btn btn-secondary" href="/dashboard?page=${type}-${p?.access_type||'free'}">
              <i class="fa-solid fa-arrow-left"></i> ${tr('cancel')}
            </a>
            <button class="btn btn-primary creator-publish-btn" type="submit">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              ${editId?tr('update'):tr('publish')}
            </button>
          </div>

        </div>

        <aside class="creator-form-side">
          <div class="create-preview-card">
            <div class="preview-top">
              <span class="preview-label">PREVIEW</span>
              <span class="preview-status" id="previewStatus"><i class="fa-solid fa-gift"></i> Free</span>
            </div>
            <div class="preview-icon ${accent}" id="previewIcon"><i class="${icon}"></i></div>
            <h3 id="previewTitle">${escape(p?.title||'Nama produk')}</h3>
            <p id="previewDesc">${escape(p?.description||'Deskripsi produk akan tampil di sini.')}</p>
            <div class="preview-meta">
              <span><i class="fa-solid fa-layer-group"></i> ${isChannel?'Channel':'Code'}</span>
              <strong id="previewPrice">Free</strong>
            </div>
          </div>

          <div class="create-tips">
            <h3><i class="fa-solid fa-lightbulb"></i> Tips</h3>
            <ul>
              <li>Gunakan nama produk yang singkat dan jelas.</li>
              <li>Jelaskan fitur atau isi produk secara lengkap.</li>
              <li>Pastikan link Telegram atau code dapat digunakan.</li>
              <li>Jangan membagikan credential atau token rahasia.</li>
            </ul>
          </div>
        </aside>
      </form>
    </div>`;

  const syncAccess=()=>{
    const access=$('input[name="accessType"]:checked')?.value||'free';
    const paid=access==='paid';
    $('#fPrice').disabled=!paid;
    if(!paid)$('#fPrice').value=0;
    $('#priceField').classList.toggle('disabled',!paid);
    $$('.access-card').forEach(x=>x.classList.toggle('selected',x.querySelector('input')?.checked));
    $('#previewStatus').innerHTML=paid
      ? '<i class="fa-solid fa-crown"></i> Paid'
      : '<i class="fa-solid fa-gift"></i> Free';
    $('#previewStatus').className='preview-status '+(paid?'paid':'free');
    $('#previewPrice').textContent=paid?money($('#fPrice').value||0):'Free';
  };

  $$('input[name="accessType"]').forEach(x=>x.onchange=syncAccess);
  $('#fPrice').oninput=syncAccess;
  $('#fTitle').oninput=()=>$('#previewTitle').textContent=$('#fTitle').value.trim()||'Nama produk';
  $('#fDesc').oninput=()=>$('#previewDesc').textContent=$('#fDesc').value.trim()||'Deskripsi produk akan tampil di sini.';
  syncAccess();

  $('#productForm').onsubmit=async e=>{
    e.preventDefault();
    const access=$('input[name="accessType"]:checked')?.value||'free';
    const price=Number($('#fPrice').value||0);

    if(!$('#fTitle').value.trim())return toast(tr('required'),'error');
    if(access==='paid'&&price<=0)return toast(tr('minPrice'),'error');
    if(isChannel&&!$('#fTelegram').value.trim())return toast('Link channel wajib diisi.','error');
    if(!isChannel&&!$('#fContent').value.trim())return toast('Content / Code wajib diisi.','error');

    const payload={
      title:$('#fTitle').value.trim(),
      description:$('#fDesc').value.trim(),
      type,access_type:access,price,
      
      category:$('#fCategory').value.trim()||null,
      bot_username:!isChannel?$('#fBot').value.trim():null,
      status:'published',
      content:isChannel?null:$('#fContent').value,
      telegram_channel:isChannel?$('#fTelegram').value.trim():null,
      is_channel:isChannel
    };

    let r;
    if(editId){
      r=await sup.from('products').update(payload).eq('id',editId).eq('creator_id',state.user.id);
      if(r.error)toast(r.error.message,'error');
      else{toast(tr('productUpdated'),'success');setTimeout(()=>location.href=`/dashboard?page=${type}-${access}`,350)}
    }else{
      try{
        const {data:{session}}=await sup.auth.getSession();
        if(access==='paid' && !session?.access_token)throw new Error('Produk PAID wajib login/register terlebih dahulu.');
        const fn=String(C.MARKETPLACE_FUNCTION_URL||'').trim();
        if(!/^https?:\/\//i.test(fn))throw new Error('Marketplace Function belum dikonfigurasi.');
        const headers={'Content-Type':'application/json'};
        if(session?.access_token) headers.Authorization=`Bearer ${session.access_token}`;
        const response=await fetch(fn,{method:'POST',headers,body:JSON.stringify({
          action:'create_product',type,access_type:access,title:payload.title,description:payload.description,
          price,category:payload.category,content:payload.content,
          bot_username:payload.bot_username,telegram_channel:payload.telegram_channel
        })});
        const out=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(out.error||'Gagal membuat produk');
        toast(out.status==='published'?'Produk langsung terupload.':'Produk terupload dan menunggu approval admin.','success');
        setTimeout(()=>location.href=`/dashboard?page=${type}-${access}`,350);
      }catch(e){toast(e.message||tr('error'),'error')}
    }
  };
}
async function editProduct(id){const {data:p}=await sup.from('products').select('type').eq('id',id).eq('creator_id',state.user.id).single();if(p)renderCreate(p.type,id)}
async function deleteProduct(id){if(!confirm(tr('confirmDelete')))return;const {error}=await sup.from('products').delete().eq('id',id).eq('creator_id',state.user.id);if(error)toast(error.message,'error');else{toast(tr('productDeleted'),'success');render()}}
async function renderPurchases(){setActive('purchases');const {data}=await sup.from('purchases').select('id,amount,status,created_at,paid_at,products(id,title,type,access_type)').eq('buyer_id',state.user.id).order('created_at',{ascending:false});$('#content').innerHTML=`<div class="page-head"><div><div class="eyebrow">ACCOUNT</div><h1 class="page-title">${tr('purchasesTitle')}</h1></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>${tr('date')}</th><th>${tr('productLabel')}</th><th>${tr('type')}</th><th>${tr('amount')}</th><th>${tr('status')}</th><th>${tr('access')}</th></tr></thead><tbody>${data?.length?data.map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString()}</td><td>${escape(x.products?.title||'-')}</td><td>${escape(x.products?.type||'-')}</td><td>${money(x.amount)}</td><td><span class="pill ${x.status==='paid'?'ok':'pending'}">${escape(x.status)}</span></td><td>${x.status==='paid'?`<button class="btn btn-secondary" data-detail="${x.products?.id}"><i class="fa-solid fa-eye"></i> ${tr('open')}</button>`:'—'}</td></tr>`).join(''):`<tr><td colspan="6">${tr('noPurchases')}</td></tr>`}</tbody></table></div></div>`;bindCards()}
async function renderPayment(){
 setActive('payment');
 const [{data:w},{data:tx},{data:wd}]=await Promise.all([sup.from('wallets').select('balance,pending_balance').eq('user_id',state.user.id).maybeSingle(),sup.from('transactions').select('*').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(100),sup.from('withdrawals').select('*').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(30)]);
 const available=Number(w?.balance||0),pending=Number(w?.pending_balance||0),monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0),dayStart=new Date();dayStart.setHours(0,0,0,0);
 const successful=(tx||[]).filter(x=>x.status==='success');const month=successful.filter(x=>new Date(x.created_at)>=monthStart),today=successful.filter(x=>new Date(x.created_at)>=dayStart);
 const saleAmount=(xs)=>xs.filter(x=>x.type==='sale').reduce((a,x)=>a+Number(x.amount||0),0);const codeTx=month.filter(x=>/code/i.test(String(x.description||'')));const channelTx=month.filter(x=>/channel/i.test(String(x.description||'')));
 $('#content').innerHTML=`<div class="page-head"><div><div class="eyebrow">WALLET & PAYMENT</div><h1 class="page-title"><i class="fa-solid fa-wallet"></i> ${tr('paymentTitle')}</h1><p class="page-sub">Deposit saldo sebelum membeli produk berbayar. Pantau saldo, transaksi, dan penarikan di satu tempat.</p></div></div>
 <section class="card tc-payment-notice"><div><span class="tc-panel-icon"><i class="fa-solid fa-circle-plus"></i></span><div><strong>Deposit</strong><p>Minimum Rp 10.000. Setelah deposit berhasil, saldo dapat digunakan untuk membeli Code atau Channel Paid.</p></div></div><button class="btn btn-primary" id="depositBtn"><i class="fa-solid fa-plus"></i> Deposit</button></section>
 <div class="tc-payment-grid"><div class="card tc-money-card code"><small>Saldo Code</small><strong>${money(saleAmount(codeTx))}</strong><span>Performa Code bulan ini</span></div><div class="card tc-money-card channel"><small>Saldo Channel</small><strong>${money(saleAmount(channelTx))}</strong><span>Performa Channel bulan ini</span></div><div class="card tc-money-card"><small>Saldo Tersedia</small><strong>${money(available)}</strong><span>Bisa digunakan untuk pembelian / WD</span></div><div class="card tc-money-card pending"><small>Saldo Tertunda</small><strong>${money(pending)}</strong><span>Menunggu pelepasan sesuai kebijakan</span></div><div class="card tc-money-card"><small>Transaksi Bulan Ini</small><strong>${money(saleAmount(month))}</strong><span>${month.length} transaksi</span></div><div class="card tc-money-card"><small>Transaksi Hari Ini</small><strong>${money(saleAmount(today))}</strong><span>${today.length} transaksi</span></div></div>
 <section class="card tc-withdraw-section"><div class="tc-panel-head"><div><span class="tc-panel-icon"><i class="fa-solid fa-money-bill-transfer"></i></span><div><h2>Withdraw</h2><p>Pilih jalur penarikan dan simpan tujuan Bank/E-Wallet kamu.</p></div></div><button class="btn btn-primary" id="withdrawBtn"><i class="fa-solid fa-arrow-up-right-from-square"></i> Withdraw</button></div><div class="tc-withdraw-grid"><article><div class="tc-withdraw-title"><i class="fa-solid fa-clock"></i><b>WD Otomatis</b></div><p>Minimal Rp 50.000 + fee Rp 5.000. Saldo minimal Rp 55.000. Masuk antrean dan menunggu konfirmasi admin.</p><div class="tc-limit-bar"><span style="width:20%"></span></div><small>Maksimal 5 pengajuan per hari</small></article><article><div class="tc-withdraw-title"><i class="fa-solid fa-bolt"></i><b>WD Instant</b></div><p>Nominal Rp 50k / 100k / 150k / 200k / 250k + fee Rp 15.000. Limit nominal Rp 500.000/hari.</p><div class="tc-limit-bar"><span style="width:0%"></span></div><small>Limit harian: Rp 500.000</small></article></div></section>
 <section class="card" style="margin-top:18px"><h2 class="section-title"><i class="fa-solid fa-clock-rotate-left"></i> ${tr('transactions')}</h2><div class="table-wrap"><table class="table"><thead><tr><th>${tr('date')}</th><th>Description</th><th>${tr('amount')}</th><th>${tr('status')}</th></tr></thead><tbody>${tx?.length?tx.slice(0,30).map(x=>`<tr><td>${new Date(x.created_at).toLocaleString()}</td><td>${escape(x.description||x.type)}</td><td class="${x.direction==='credit'?'money-plus':'money-minus'}">${x.direction==='credit'?'+':'-'}${money(x.amount)}</td><td>${escape(x.status)}</td></tr>`).join(''):`<tr><td colspan="4">${tr('noTransactions')}</td></tr>`}</tbody></table></div></section>
 <section class="card" style="margin-top:18px"><h2 class="section-title">${tr('withdrawHistory')}</h2><div class="table-wrap"><table class="table"><thead><tr><th>Ticket</th><th>${tr('date')}</th><th>Mode</th><th>Nominal</th><th>Fee</th><th>Status</th></tr></thead><tbody>${wd?.length?wd.map(x=>`<tr><td><code>${escape(x.ticket||'-')}</code></td><td>${new Date(x.created_at).toLocaleString()}</td><td>${escape(x.mode||x.withdrawal_mode||'auto')}</td><td>${money(x.amount??x.requested_amount)}</td><td>${money(x.fee||0)}</td><td>${escape(x.status)}</td></tr>`).join(''):`<tr><td colspan="6">${tr('noWithdrawals')}</td></tr>`}</tbody></table></div></section>`;
 $('#depositBtn').onclick=()=>openDeposit();$('#withdrawBtn').onclick=()=>openWithdraw();
}

function openWithdraw(){openModal(`<div class="modal-head"><h2 class="section-title"><i class="fa-solid fa-money-bill-transfer"></i> Withdraw</h2><button class="close" id="x"><i class="fa-solid fa-xmark"></i></button></div><div class="tc-withdraw-modal-note"><i class="fa-solid fa-circle-info"></i> WD otomatis maksimal 5 pengajuan/hari. WD Instant maksimal total Rp 500.000/hari. Tujuan dapat berupa Bank atau E-Wallet.</div><form id="withdrawForm" class="grid"><div class="form-group"><label class="form-label">Mode WD</label><select class="select" id="wdMode"><option value="auto">WD Otomatis — min 50k + fee 5k</option><option value="instant">WD Instant — fee 15k</option></select></div><div class="form-group"><label class="form-label">Nominal</label><select class="select" id="wdAmountPreset"></select><input class="input" id="wdAmount" type="number" min="50000" step="1000" required placeholder="50000" style="margin-top:8px"><div class="help" id="wdRule"></div></div><div class="form-group"><label class="form-label">Bank / E-Wallet</label><select class="select" id="wdMethod"><option value="bank">Bank</option><option value="ewallet">E-Wallet</option></select></div><div class="form-group"><label class="form-label">Nama Pemegang</label><input class="input" id="wdName" required placeholder="Nama sesuai rekening / ewallet"></div><div class="form-group"><label class="form-label">No. Bank / E-Wallet</label><input class="input" id="wdNumber" required placeholder="Nomor rekening / ewallet"></div><div class="actions"><button type="button" class="btn btn-secondary" id="cx">${tr('cancel')}</button><button class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i> ${tr('requestWithdraw')}</button></div></form>`);$('#x').onclick=$('#cx').onclick=closeModal;const sync=()=>{const mode=$('#wdMode').value,sel=$('#wdAmountPreset'),input=$('#wdAmount'),rule=$('#wdRule');if(mode==='instant'){sel.innerHTML='<option value="">Pilih nominal instant</option>'+[50000,100000,150000,200000,250000].map(n=>`<option value="${n}">${money(n)} + fee ${money(15000)}</option>`).join('');sel.style.display='block';input.style.display='none';input.required=false;rule.textContent='Fee Rp 15.000. Limit total nominal WD instant Rp 500.000 per hari.'}else{sel.innerHTML='';sel.style.display='none';input.style.display='block';input.required=true;rule.textContent='Minimal Rp 50.000 + fee Rp 5.000. Saldo minimal Rp 55.000.'}};$('#wdMode').onchange=sync;sync();$('#wdAmountPreset').onchange=()=>$('#wdAmount').value=$('#wdAmountPreset').value;$('#withdrawForm').onsubmit=async e=>{e.preventDefault();const mode=$('#wdMode').value,amount=mode==='instant'?Number($('#wdAmountPreset').value):Number($('#wdAmount').value);if(!Number.isFinite(amount)||amount<=0)return toast('Nominal WD tidak valid.','error');const {data,error}=await sup.rpc('request_withdrawal_v2',{p_amount:amount,p_mode:mode,p_method:$('#wdMethod').value,p_account_name:$('#wdName').value.trim(),p_account_number:$('#wdNumber').value.trim()});if(error)return toast(error.message,'error');closeModal();toast(`WD dibuat. Ticket ${data.ticket||'-'}. Menunggu antrean/admin.`,'success');renderPayment()}}
function openModal(html){$('#modal').classList.add('show');$('#modalBody').innerHTML=html}function closeModal(){$('#modal').classList.remove('show')}
async function renderProfile(){setActive('profile');const p=state.profile;const email=state.user?.email||'';$('#content').innerHTML=`<div class="page-head"><div><div class="eyebrow">ACCOUNT PROFILE</div><h1 class="page-title"><i class="fa-solid fa-user"></i> Profile</h1><p class="page-sub">Kelola identitas Telegram, informasi akun, dan tujuan withdraw.</p></div></div><div class="grid two"><section class="card tc-profile-card"><div class="profile-head"><div class="avatar-lg">${initials(p.username)}</div><div class="profile-meta"><h2>@${escape(p.username||'admin')}</h2><p>${escape(p.display_name||'admin')}</p></div></div><div class="tc-profile-summary"><div><small>Username Telegram</small><b>@${escape(p.telegram_username||p.username||'admin')}</b></div><div><small>No. Telegram</small><b>${escape(p.telegram_number||'-')}</b></div><div><small>Id Telegram</small><b>${escape(p.telegram_id||'-')}</b></div></div></section><section class="card"><h2 class="section-title">Informasi Profil</h2><p class="muted">Data ini dapat diedit dan disimpan ke profil akun.</p><form id="profileForm" class="grid"><div class="form-group"><label class="form-label">Id telegram</label><input class="input" id="pTelegramId" value="${escape(p.telegram_id||'')}" placeholder="Telegram ID"></div><div class="form-group"><label class="form-label">Username Telegram</label><input class="input" id="pUsername" value="${escape(p.username||'')}" required placeholder="username"></div><div class="form-group"><label class="form-label">Nama Tampilan</label><input class="input" id="pName" value="${escape(p.display_name||'')}" placeholder="Nama tampilan"></div><div class="actions"><button class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Simpan</button></div></form></section></div><section class="card tc-wallet-profile"><div class="tc-panel-head"><div><span class="tc-panel-icon"><i class="fa-solid fa-wallet"></i></span><div><h2>Dompet & Tujuan Withdraw</h2><p>Simpan Bank/E-Wallet agar data siap digunakan saat withdraw.</p></div></div><span class="pill">Wallet</span></div><div class="tc-wallet-balance"><small>Saldo saya</small><strong>${money((await sup.from('wallets').select('balance').eq('user_id',state.user.id).maybeSingle()).data?.balance||0)}</strong></div><form id="walletProfileForm" class="form-grid"><label>Bank / E-Wallet<select id="walletMethod" class="select"><option value="">Pilih</option><option value="bank">Bank</option><option value="ewallet">E-Wallet</option></select></label><label>No bank/ewallet<input id="walletNumber" class="input" value="${escape(p.withdraw_account_number||'')}" placeholder="Nomor rekening / ewallet"></label><label>Nama pemegang Bank/ewallet<input id="walletName" class="input" value="${escape(p.withdraw_account_name||'')}" placeholder="Nama pemegang"></label><div class="actions"><button class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Simpan</button><button type="button" class="btn btn-secondary" id="profileWithdraw"><i class="fa-solid fa-money-bill-transfer"></i> Withdraw</button></div></form></section><section class="card tc-danger-zone"><h2 class="section-title"><i class="fa-solid fa-shield-halved"></i> Akun</h2><p class="muted">Keluar dari perangkat atau hapus akun secara permanen setelah memastikan semua saldo dan transaksi sudah selesai.</p><div class="actions"><button class="btn btn-secondary" id="profileLogout"><i class="fa-solid fa-right-from-bracket"></i> Keluar</button><button class="btn btn-danger" id="deleteAccountBtn"><i class="fa-solid fa-user-xmark"></i> Hapus Account</button></div></section>`;$('#profileForm').onsubmit=async e=>{e.preventDefault();const username=$('#pUsername').value.trim().replace(/^@/,'').toLowerCase();if(!/^[a-z0-9_]{3,32}$/.test(username))return toast('Username tidak valid.','error');const {error}=await sup.from('profiles').update({username,display_name:$('#pName').value.trim(),telegram_id:$('#pTelegramId').value.trim(),telegram_username:username,withdraw_account_number:$('#walletNumber')?.value?.trim()||p.withdraw_account_number||null,withdraw_account_name:$('#walletName')?.value?.trim()||p.withdraw_account_name||null}).eq('id',state.user.id);if(error)toast(error.message,'error');else{Object.assign(state.profile,{username,display_name:$('#pName').value.trim(),telegram_id:$('#pTelegramId').value.trim(),telegram_username:username});toast(tr('saved'),'success');renderProfile()}};$('#walletProfileForm').onsubmit=async e=>{e.preventDefault();const {error}=await sup.from('profiles').update({withdraw_method:$('#walletMethod').value,withdraw_account_number:$('#walletNumber').value.trim(),withdraw_account_name:$('#walletName').value.trim()}).eq('id',state.user.id);if(error)return toast(error.message,'error');Object.assign(state.profile,{withdraw_method:$('#walletMethod').value,withdraw_account_number:$('#walletNumber').value.trim(),withdraw_account_name:$('#walletName').value.trim()});toast('Data Bank/E-Wallet tersimpan.','success')};$('#walletMethod').value=p.withdraw_method||'';$('#profileWithdraw').onclick=openWithdraw;$('#profileLogout').onclick=async()=>{await sup.auth.signOut();location.href='/index.html'};$('#deleteAccountBtn').onclick=()=>toast('Penghapusan account membutuhkan konfirmasi admin agar saldo dan transaksi aman.','warning')}
async function renderSettings(){setActive('settings');$('#content').innerHTML=`<div class="page-head"><div><div class="eyebrow">ACCOUNT SECURITY</div><h1 class="page-title"><i class="fa-solid fa-gear"></i> ${tr('settings')}</h1><p class="page-sub">Kelola login, password, bahasa, dan keamanan akun.</p></div></div><div class="grid two"><section class="card"><h2 class="section-title"><i class="fa-solid fa-at"></i> Gmail & Username Login</h2><form id="loginSettings" class="grid"><div class="form-group"><label class="form-label">Gmail / Email Login</label><input class="input" id="loginEmail" type="email" value="${escape(state.user?.email||'')}" required></div><div class="form-group"><label class="form-label">Username Login</label><input class="input" id="loginUsername" value="${escape(state.profile.username||'')}" required></div><button class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Simpan Login</button></form></section><section class="card"><h2 class="section-title"><i class="fa-solid fa-key"></i> Password</h2><form id="passwordSettings" class="grid"><div class="form-group"><label class="form-label">Password Baru</label><input class="input" id="newPassword" type="password" minlength="8" required></div><div class="form-group"><label class="form-label">Password Cadangan</label><input class="input" id="backupPassword" type="password" minlength="8" placeholder="Gunakan password cadangan yang berbeda"><small class="help">Password cadangan disimpan sebagai hash lokal di perangkat. Jangan gunakan password utama.</small></div><button class="btn btn-primary"><i class="fa-solid fa-shield-halved"></i> Simpan Password</button></form></section></div><section class="card"><h2 class="section-title"><i class="fa-solid fa-language"></i> Bahasa</h2><div class="toolbar"><button class="btn ${state.lang==='id'?'btn-primary':'btn-secondary'}" id="idLang">🇮🇩 Indonesia</button><button class="btn ${state.lang==='en'?'btn-primary':'btn-secondary'}" id="enLang">🇬🇧 English</button></div></section>`;$('#loginSettings').onsubmit=async e=>{e.preventDefault();const username=$('#loginUsername').value.trim().replace(/^@/,'').toLowerCase();const email=$('#loginEmail').value.trim().toLowerCase();const r=await sup.from('profiles').update({username}).eq('id',state.user.id);if(r.error)return toast(r.error.message,'error');const {error}=await sup.auth.updateUser({email});if(error)return toast(error.message,'error');state.profile.username=username;toast('Login email/username diperbarui. Email mungkin memerlukan konfirmasi baru.','success')};$('#passwordSettings').onsubmit=async e=>{e.preventDefault();const pw=$('#newPassword').value.trim(),backup=$('#backupPassword').value.trim();if(pw.length<8)return toast('Password minimal 8 karakter.','error');const {error}=await sup.auth.updateUser({password:pw});if(error)return toast(error.message,'error');if(backup){const bytes=new TextEncoder().encode(backup);const hash=await crypto.subtle.digest('SHA-256',bytes);localStorage.setItem('telecod_backup_password_hash',Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join(''))}$('#newPassword').value='';$('#backupPassword').value='';toast('Password utama berhasil diperbarui. Password cadangan tersimpan sebagai hash lokal.','success')};$('#idLang').onclick=()=>{state.lang='id';localStorage.setItem('telecod_lang','id');applyLang();renderSettings()};$('#enLang').onclick=()=>{state.lang='en';localStorage.setItem('telecod_lang','en');applyLang();renderSettings()}}
async function render(){const page=new URLSearchParams(location.search).get('page')||'dashboard';closeMobile();if(page==='dashboard')return renderDashboard();if(page==='marketplace')return renderMarketplace();if(page==='purchases')return renderPurchases();if(page==='payment')return renderPayment();if(page==='profile')return renderProfile();if(page==='settings')return renderSettings();if(page==='create-channel')return renderCreate('channel');if(page==='create-code')return renderCreate('code');if(['channel-free','channel-paid','code-free','code-paid'].includes(page))return renderProducts(page);return renderDashboard()}
layoutReady();loadUser().then(ok=>{if(ok)render()});
})();
