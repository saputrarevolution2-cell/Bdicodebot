(() => {
'use strict';
const A=window.PasTeleAdmin;
const $=A.$;
async function load(){
 const box=$('#adminContent'); A.setLoading(box);
 try{
  const g=await A.isAdmin(); if(!g.ok){A.denied(g.reason);return;}
  let data=[];
  try{data=await A.rpc('admin_pastes')}catch(e){
    // Read fallback keeps the panel useful when an admin RPC is temporarily unavailable.
    const table='pastes';
    const q=await A.sb.from(table).select('*').limit(200);
    if(q.error) throw e; data=A.rows(q.data);
  }
  const toolbar=`<div class="admin-toolbar"><div class="toolbar-title"><i class="fa-solid fa-file-lines"></i><div><strong>Pastes</strong><span>${data.length} data</span></div></div><button class="btn" id="reload"><i class="fa-solid fa-rotate"></i> Refresh</button></div>`;
  box.innerHTML=toolbar+'<div id="adminTable"></div>';
  const cols=[{label:'Id',key:'id'},{label:'Title',key:'title'},{label:'Slug',key:'slug'},{label:'Status',key:'status'},{label:'Owner Id',key:'owner_id'},{label:'Created',render:r=>new Date(r.created_at).toLocaleString('id-ID')}];
  A.table($('#adminTable'),data,cols);
  $('#reload')?.addEventListener('click',load);
 }catch(e){console.error(e);box.innerHTML=`<div class="empty error-state"><i class="fa-solid fa-triangle-exclamation"></i><strong>Gagal memuat data</strong><span>${A.esc(e.message||'Database error')}</span><button class="btn" id="retry">Coba lagi</button></div>`;$('#retry')?.addEventListener('click',load);}
}
document.addEventListener('DOMContentLoaded',load);
})();