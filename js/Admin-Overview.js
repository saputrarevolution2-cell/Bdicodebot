
/* SOURCE: admin/admin.js */
window.Admin={
  guard:async()=>{
    let p=await TC.profile();
    if(!p||(!p.is_admin&&p.role!=='admin')){location.href='../index.html';throw Error('Admin only')}
    return p;
  },
  rpc:async(name,args={})=>{
    let {data,error}=await sb.rpc(name,args);
    if(error)throw error;
    return data;
  },
  _esc:v=>TC.esc(String(v??'')),
  _date:v=>{if(!v)return'-';try{return new Date(v).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return'-'}},
  _money:v=>Number.isFinite(Number(v))?TC.money(Number(v)):TC.esc(String(v??'')),
  _status:v=>{
    const s=String(v??'unknown').toLowerCase();
    const c=['paid','completed','success','published','active','approved'].includes(s)?'success':
      ['pending','processing','draft','waiting'].includes(s)?'warning':
      ['failed','rejected','cancelled','canceled','banned'].includes(s)?'danger':'neutral';
    return `<span class="pt-status ${c}">${TC.esc(v||'unknown')}</span>`;
  },
  table:rows=>{
    if(!rows?.length)return '<div class="empty"><i class="fa-solid fa-inbox"></i><br>Tidak ada data.</div>';
    const all=Object.keys(rows[0]);
    const priority=['title','name','username','email','type','category','status','access_type','price','amount','net_amount','method','account_name','account_number','created_at','updated_at'];
    let keys=priority.filter(k=>all.includes(k));
    if(!keys.length) keys=all.filter(k=>!['id','uuid'].includes(k)).slice(0,8);
    if(keys.length>9)keys=keys.slice(0,9);
    const label=k=>({access_type:'Akses',created_at:'Dibuat',updated_at:'Diubah',net_amount:'Bersih',account_name:'Nama Rekening',account_number:'No. Rekening'}[k]||k.replace(/_/g,' '));
    const cell=(r,k)=>{
      const v=r[k];
      if(v===null||v===undefined||v==='')return '<span class="pt-muted">—</span>';
      if(k==='created_at'||k==='updated_at')return Admin._date(v);
      if(['price','amount','net_amount','balance','fee','total_amount','total_debit'].includes(k))return `<span class="pt-money">${Admin._money(v)}</span>`;
      if(k==='status'||k==='access_type')return Admin._status(v);
      if(typeof v==='object')return `<span class="pt-long">${Admin._esc(JSON.stringify(v))}</span>`;
      const str=String(v);
      if((k==='id'||k.endsWith('_id'))&&str.length>12)return `<span class="pt-id" title="${Admin._esc(str)}">${Admin._esc(str.slice(0,8))}…</span>`;
      return `<span class="${str.length>45?'pt-long':''}" title="${str.length>45?Admin._esc(str):''}">${Admin._esc(str)}</span>`;
    };
    return `<div class="table-wrap"><table class="table pt-admin-table"><thead><tr>${keys.map(k=>`<th>${Admin._esc(label(k))}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${cell(r,k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="pt-muted" style="font-size:12px;margin-top:9px">Menampilkan ${rows.length} data · kolom internal yang tidak relevan disembunyikan agar tabel tetap rapi.</div>`;
  }
};

/* SOURCE: ../js/admin/admin.js */
window.Admin={
  guard:async()=>{
    let p=await TC.profile();
    if(!p||(!p.is_admin&&p.role!=='admin')){location.href='../index.html';throw Error('Admin only')}
    return p;
  },
  rpc:async(name,args={})=>{
    let {data,error}=await sb.rpc(name,args);
    if(error)throw error;
    return data;
  },
  _esc:v=>TC.esc(String(v??'')),
  _date:v=>{if(!v)return'-';try{return new Date(v).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return'-'}},
  _money:v=>Number.isFinite(Number(v))?TC.money(Number(v)):TC.esc(String(v??'')),
  _status:v=>{
    const s=String(v??'unknown').toLowerCase();
    const c=['paid','completed','success','published','active','approved'].includes(s)?'success':
      ['pending','processing','draft','waiting'].includes(s)?'warning':
      ['failed','rejected','cancelled','canceled','banned'].includes(s)?'danger':'neutral';
    return `<span class="pt-status ${c}">${TC.esc(v||'unknown')}</span>`;
  },
  table:rows=>{
    if(!rows?.length)return '<div class="empty"><i class="fa-solid fa-inbox"></i><br>Tidak ada data.</div>';
    const all=Object.keys(rows[0]);
    const priority=['title','name','username','email','type','category','status','access_type','price','amount','net_amount','method','account_name','account_number','created_at','updated_at'];
    let keys=priority.filter(k=>all.includes(k));
    if(!keys.length) keys=all.filter(k=>!['id','uuid'].includes(k)).slice(0,8);
    if(keys.length>9)keys=keys.slice(0,9);
    const label=k=>({access_type:'Akses',created_at:'Dibuat',updated_at:'Diubah',net_amount:'Bersih',account_name:'Nama Rekening',account_number:'No. Rekening'}[k]||k.replace(/_/g,' '));
    const cell=(r,k)=>{
      const v=r[k];
      if(v===null||v===undefined||v==='')return '<span class="pt-muted">—</span>';
      if(k==='created_at'||k==='updated_at')return Admin._date(v);
      if(['price','amount','net_amount','balance','fee','total_amount','total_debit'].includes(k))return `<span class="pt-money">${Admin._money(v)}</span>`;
      if(k==='status'||k==='access_type')return Admin._status(v);
      if(typeof v==='object')return `<span class="pt-long">${Admin._esc(JSON.stringify(v))}</span>`;
      const str=String(v);
      if((k==='id'||k.endsWith('_id'))&&str.length>12)return `<span class="pt-id" title="${Admin._esc(str)}">${Admin._esc(str.slice(0,8))}…</span>`;
      return `<span class="${str.length>45?'pt-long':''}" title="${str.length>45?Admin._esc(str):''}">${Admin._esc(str)}</span>`;
    };
    return `<div class="table-wrap"><table class="table pt-admin-table"><thead><tr>${keys.map(k=>`<th>${Admin._esc(label(k))}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${cell(r,k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="pt-muted" style="font-size:12px;margin-top:9px">Menampilkan ${rows.length} data · kolom internal yang tidak relevan disembunyikan agar tabel tetap rapi.</div>`;
  }
};

/* SOURCE: index-fixed.js */
(async()=>{
 try{
  await Admin.guard();
  const raw=await Admin.rpc('admin_stats');
  const rows=Array.isArray(raw)?raw:(raw?[raw]:[]), r=rows[0]||{};
  const defs=[['Users','users','fa-users'],['Products','products','fa-box'],['Sales','sales','fa-chart-line'],['Revenue','revenue','fa-wallet'],['Pastes','pastes','fa-file-lines'],['Views','views','fa-eye'],['Banned','banned','fa-user-slash'],['Pending','pending','fa-clock']];
  document.getElementById('adminContent').innerHTML='<div class="pt-stat-grid">'+defs.map(x=>`<div class="pt-stat"><div class="pt-icon"><i class="fa-solid ${x[2]}"></i></div><span class="kpi">${x[0]}</span><strong>${x[1]==='revenue'?Admin._money(r[x[1]]):Admin._esc(r[x[1]]??0)}</strong></div>`).join('')+'</div>';
  const st=await sb.rpc('get_public_site_settings');
  document.getElementById('socialInput').value=(st.data?.socials||[]).map(x=>[x.name,x.url,x.icon||'fa-solid fa-link'].join('|')).join('\n');
  document.getElementById('saveSocial').onclick=async()=>{
   const socials=document.getElementById('socialInput').value.split('\n').map(l=>{const [name,url,icon]=l.split('|').map(x=>x.trim());return name&&/^https?:\/\//i.test(url)?{name,url,icon:icon||'fa-solid fa-link'}:null}).filter(Boolean);
   const q=await sb.rpc('admin_save_socials',{p_socials:socials}); TC.toast(q.error?.message||'Social media disimpan',q.error?'error':'success');
  };
  document.getElementById('publishAnn').onclick=async()=>{
   const title=document.getElementById('annTitle').value.trim(), body=document.getElementById('annBody').value.trim(), image=document.getElementById('annImage').value.trim();
   if(!title||!body)return TC.toast('Judul dan isi wajib diisi','error');
   const q=await sb.rpc('admin_publish_announcement',{p_title:title,p_body:body,p_image_url:image||null});
   TC.toast(q.error?.message||'Siaran dipublikasikan',q.error?'error':'success');
   if(!q.error){document.getElementById('annTitle').value='';document.getElementById('annBody').value='';document.getElementById('annImage').value='';}
  };
 }catch(e){document.getElementById('adminContent').innerHTML='<div class="empty">'+TC.esc(e.message)+'</div>'}
})();

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
