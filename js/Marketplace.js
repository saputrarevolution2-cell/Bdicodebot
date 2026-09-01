
/* SOURCE: /js/marketplace-fixed.js */
document.addEventListener('DOMContentLoaded', async () => {
  let filter='all', items=[]; const q=document.getElementById('q');
  const icon=t=>t==='code'?'fa-code':t==='channel'?'fa-broadcast-tower':t==='group'?'fa-users':'fa-link';
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.v;render()});
  q?.addEventListener('input',render);
  async function load(){
    if(!window.sb)return TC.toast('Database belum terkonfigurasi.','error');
    const r=await sb.from('marketplace_public').select('id,slug,title,type,access_type,price,thumbnail_url,description,content,views,sales_count,category,created_at,creator_name,creator_username,owner_id').order('created_at',{ascending:false}).limit(500);
    if(r.error)return TC.toast(r.error.message,'error'); items=r.data||[]; render();
  }
  function ok(x){const t=String(x.type||'').toLowerCase(),a=String(x.access_type||'').toLowerCase();return(filter==='all'||filter===t||filter===a)&&(`${x.title||''} ${x.creator_name||''} ${x.category||''}`.toLowerCase().includes((q?.value||'').toLowerCase()))}
  function card(x){return `<a class="card product-card" href="product.html?id=${encodeURIComponent(x.id)}&type=${encodeURIComponent(x.type)}"><div class="thumb">${x.thumbnail_url?`<img loading="lazy" src="${TC.esc(x.thumbnail_url)}" alt="">`:`<i class="fa-solid ${icon(x.type)}"></i>`}</div><div class="product-body"><span class="rank">${TC.esc(String(x.access_type||'free').toUpperCase())}</span><h3>${TC.esc(x.title||'Untitled')}</h3><p class="muted">${TC.esc(x.creator_name||'Creator')}</p><div class="row" style="justify-content:space-between"><span><i class="fa-solid fa-eye"></i> ${Number(x.views||0).toLocaleString('id-ID')}</span><b>${Number(x.price||0)?TC.money(x.price):'FREE'}</b></div></div></a>`}
  function list(id,arr){const el=document.getElementById(id);if(!el)return;el.innerHTML=arr.slice(0,10).map((x,i)=>`<a class="list-item" href="product.html?id=${encodeURIComponent(x.id)}&type=${encodeURIComponent(x.type)}"><span><b>#${i+1}</b> ${TC.esc(x.title||'Untitled')}<small class="muted"> · ${Number(x.views||0).toLocaleString('id-ID')} views</small></span><b>${Number(x.price||0)?TC.money(x.price):'FREE'}</b></a>`).join('')||'<div class="empty">Belum ada data.</div>'}
  function render(){document.getElementById('market').innerHTML=items.filter(ok).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(card).join('')||'<div class="empty" style="grid-column:1/-1">Belum ada konten yang dipublikasikan.</div>';list('topLink',items.filter(x=>x.type==='link').sort((a,b)=>Number(b.views||0)-Number(a.views||0)));list('topCode',items.filter(x=>x.type==='code').sort((a,b)=>Number(b.views||0)-Number(a.views||0)));list('topChannel',items.filter(x=>x.type==='channel').sort((a,b)=>Number(b.views||0)-Number(a.views||0)));list('topGroup',items.filter(x=>x.type==='group').sort((a,b)=>Number(b.views||0)-Number(a.views||0)))}
  load();
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
