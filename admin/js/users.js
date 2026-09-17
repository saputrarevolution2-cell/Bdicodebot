(() => {
'use strict';
const A=window.PasTeleAdmin;
const $=A.$;
async function load(){
 const box=$('#adminContent'); A.setLoading(box);
 try{
  const g=await A.isAdmin(); if(!g.ok){A.denied(g.reason);return;}
  let data=[];
  try{data=await A.rpc('admin_users')}catch(e){
    // Read fallback keeps the panel useful when an admin RPC is temporarily unavailable.
    const table='profiles';
    const q=await A.sb.from(table).select('*').limit(200);
    if(q.error) throw e; data=A.rows(q.data);
  }
  const toolbar=`<div class="admin-toolbar"><div class="toolbar-title"><i class="fa-solid fa-users"></i><div><strong>Users</strong><span>${data.length} data</span></div></div><button class="btn" id="reload"><i class="fa-solid fa-rotate"></i> Refresh</button></div>`;
  box.innerHTML=toolbar+'<div id="adminTable"></div>';
  const cols=[{label:'Id',key:'id'},{label:'Username',key:'username'},{label:'Auth Email',key:'auth_email'},{label:'Role',key:'role'},{label:'Is Admin',render:r=>`<span class="status ${ok}">${r.is_admin?'Aktif':'Tidak'}</span>`},{label:'Is Banned',render:r=>`<span class="status ${ok}">${r.is_banned?'Aktif':'Tidak'}</span>`},{label:'Balance',render:r=>money(r.balance)},{label:'Created',render:r=>new Date(r.created_at).toLocaleString('id-ID')}];
  A.table($('#adminTable'),data,cols);
  $('#reload')?.addEventListener('click',load);
 }catch(e){console.error(e);box.innerHTML=`<div class="empty error-state"><i class="fa-solid fa-triangle-exclamation"></i><strong>Gagal memuat data</strong><span>${A.esc(e.message||'Database error')}</span><button class="btn" id="retry">Coba lagi</button></div>`;$('#retry')?.addEventListener('click',load);}
}
document.addEventListener('DOMContentLoaded',load);
})();