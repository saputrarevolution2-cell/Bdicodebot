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