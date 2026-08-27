(()=>{
const D={id:{Notifications:'Notifikasi','No notifications':'Tidak ada notifikasi','Mark all as read':'Tandai semua sudah dibaca'},en:{Notifications:'Notifications','No notifications':'No notifications','Mark all as read':'Mark all as read'}};
const L=()=>localStorage.getItem('telecod_lang')==='en'?'en':'id';

const UIWORDS={
id:{
"Search user, product, paste, transaction...":"Cari user, produk, paste, transaksi...",
"Verifying...":"Memverifikasi...",
"Keluar":"Keluar","CONTROL CENTER":"PUSAT KONTROL","Dashboard":"Dashboard","Users & Creator":"Pengguna & Kreator",
"Bot Approved":"Bot Disetujui","Orders / Purchases":"Pesanan / Pembelian","Payments":"Pembayaran","Withdrawals":"Penarikan","Transactions":"Transaksi",
"Site Control":"Kontrol Situs","Admin Logs":"Log Admin","Lihat website":"Lihat website","Master Mode":"Mode Master","Protected session":"Sesi terlindungi",
"Masuk ke Panel Admin":"Masuk ke Panel Admin","Username":"Username","Password":"Password","Masuk ke Master Control":"Masuk ke Master Control",
"Informasi Produk":"Informasi Produk","Isi informasi dasar yang akan dilihat pembeli.":"Isi informasi dasar yang akan dilihat pembeli.",
"Nama Produk":"Nama Produk","Deskripsi":"Deskripsi","Kategori":"Kategori","Akses":"Akses","Harga":"Harga","Publish":"Publikasikan",
"PasteLink":"PasteLink","Admin Panel":"Panel Admin","Tambah Channel":"Tambah Channel","Tambah Code":"Tambah Code","Produk FREE bisa dikirim tanpa login. Produk PAID wajib login.":"Produk FREE bisa dikirim tanpa login. Produk PAID wajib login.","Judul":"Judul","Kirim Produk":"Kirim Produk","Link Channel":"Link Channel","Isi Code":"Isi Code","Username Bot":"Username Bot","Bot, Tools, Script...":"Bot, Tools, Script..."
},
en:{
"Search user, product, paste, transaction...":"Search users, products, pastes, transactions...",
"Verifying...":"Verifying...","Keluar":"Logout","CONTROL CENTER":"CONTROL CENTER","Dashboard":"Dashboard","Users & Creator":"Users & Creators",
"Bot Approved":"Approved Bots","Orders / Purchases":"Orders / Purchases","Payments":"Payments","Withdrawals":"Withdrawals","Transactions":"Transactions",
"Site Control":"Site Control","Admin Logs":"Admin Logs","Lihat website":"View website","Master Mode":"Master Mode","Protected session":"Protected session",
"Masuk ke Panel Admin":"Sign in to Admin Panel","Username":"Username","Password":"Password","Masuk ke Master Control":"Enter Master Control",
"Informasi Produk":"Product Information","Isi informasi dasar yang akan dilihat pembeli.":"Enter the basic information buyers will see.",
"Nama Produk":"Product Name","Deskripsi":"Description","Kategori":"Category","Akses":"Access","Harga":"Price","Publish":"Publish",
"PasteLink":"PasteLink","Admin Panel":"Admin Panel","Tambah Channel":"Add Channel","Tambah Code":"Add Code","Produk FREE bisa dikirim tanpa login. Produk PAID wajib login.":"FREE products can be submitted without login. PAID products require login.","Judul":"Title","Kirim Produk":"Submit Product","Link Channel":"Channel Link","Isi Code":"Code Content","Username Bot":"Bot Username","Bot, Tools, Script...":"Bot, Tools, Script..."
}};
function translateAll(){
 const lang=L(), base=UIWORDS[lang]||{}, reverse=lang==='id'?Object.fromEntries(Object.entries(UIWORDS.en||{}).map(([k,v])=>[v,k])):{}, dict={...reverse,...base};
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 const nodes=[]; let n; while(n=walker.nextNode()) nodes.push(n);
 nodes.forEach(node=>{
   if(!node.parentElement || ['SCRIPT','STYLE','NOSCRIPT'].includes(node.parentElement.tagName)) return;
   const raw=node.nodeValue, key=raw.trim();
   if(dict[key] && dict[key]!==key) node.nodeValue=raw.replace(key,dict[key]);
 });
 document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
   const v=el.getAttribute('placeholder'); if(dict[v] && dict[v]!==v) el.setAttribute('placeholder',dict[v]);
 });
 document.documentElement.lang=lang;
}

function apply(){document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');document.body?.classList.remove('light');document.body?.classList.add('dark');document.documentElement.dataset.theme='dark';document.documentElement.lang=L();}
function tr(){document.querySelectorAll('[data-i18n]').forEach(e=>{const k=e.dataset.i18n;if(D[L()]?.[k])e.textContent=D[L()][k]})}
window.TeleCodUI={lang:L,apply,setLang(v){localStorage.setItem('telecod_lang',v==='en'?'en':'id');tr();translateAll();window.dispatchEvent(new CustomEvent('telecod:language',{detail:{lang:L()}}))},translateAll};
function bell(){if(document.querySelector('.telecod-notification'))return;const h=document.querySelector('[data-notification-host]')||document.querySelector('.topbar');if(!h)return;const b=document.createElement('div');b.className='telecod-notification';b.innerHTML='<button class="telecod-notification-btn" aria-label="Notifications"><i class="fa-regular fa-bell"></i><b class="telecod-notification-badge" hidden>0</b></button><div class="telecod-notification-panel" hidden><div class="telecod-notification-head"><strong>Notifications</strong><button class="telecod-mark-read">Mark all as read</button></div><div class="telecod-notification-list"></div></div>';h.appendChild(b);const panel=b.querySelector('.telecod-notification-panel');b.querySelector('.telecod-notification-btn').onclick=()=>panel.hidden=!panel.hidden;document.addEventListener('click',e=>{if(!b.contains(e.target))panel.hidden=true});b.querySelector('.telecod-mark-read').onclick=()=>{localStorage.setItem('telecod_notifications_seen',String(Date.now()));window.TeleCodNotifications?.refresh()};window.TeleCodNotifications={toggle(){panel.hidden=!panel.hidden},refresh(){const a=JSON.parse(localStorage.getItem('telecod_notifications')||'[]');const seen=Number(localStorage.getItem('telecod_notifications_seen')||0);const unread=a.filter(x=>Number(x.ts||0)>seen);const badge=b.querySelector('.telecod-notification-badge');badge.hidden=!unread.length;badge.textContent=unread.length>99?'99+':unread.length;b.querySelector('.telecod-notification-list').innerHTML=a.length?a.slice(0,30).map(n=>`<div class="telecod-notification-item"><div><span class="telecod-notification-icon"><i class="fa-solid ${n.icon||'fa-bell'}"></i></span><b>${String(n.title||'TeleCod').replace(/[<>]/g,'')}</b></div><small>${String(n.message||'').replace(/[<>]/g,'')}</small><time>${new Date(n.ts||Date.now()).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'})}</time></div>`).join(''):`<div class="telecod-empty">${D[L()]['No notifications']}</div>`}};window.TeleCodNotifications.refresh()}
document.addEventListener('DOMContentLoaded',()=>{apply();tr();translateAll();bell();new MutationObserver(()=>translateAll()).observe(document.body,{subtree:true,childList:true});window.addEventListener('storage',e=>{if(e.key==='telecod_lang'){apply();tr();translateAll()}})});
})();
