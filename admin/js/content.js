(() => {
'use strict';
const A=window.PasTeleAdmin,$=A.$;
async function boot(){
 const g=await A.isAdmin(); if(!g.ok){A.denied(g.reason);return}
 const box=$('#contentList')||$('#adminContent');
 try{
  let data=[];
  try{data=await A.rpc('admin_content')}catch(e){
   const q=await A.sb.from('telegram_products').select('*').limit(300); if(q.error)throw e; data=A.rows(q.data);
  }
  render(data); bind();
 }catch(e){if(box)box.innerHTML=`<div class="empty error-state"><i class="fa-solid fa-triangle-exclamation"></i><strong>Gagal memuat content</strong><span>${A.esc(e.message)}</span></div>`}
}
function render(data){
 const box=$('#contentList')||$('#contentResult'); if(!box)return;
 if(!data.length){box.innerHTML='<div class="empty"><i class="fa-solid fa-inbox"></i><strong>Content kosong</strong></div>';return}
 box.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>Price</th><th>Status</th><th>Owner</th><th>Created</th><th>Aksi</th></tr></thead><tbody>${data.map(r=>`<tr><td><strong>${A.esc(r.title||r.name||'-')}</strong><small>${A.esc(r.slug||r.id||'')}</small></td><td>${A.esc(r.type||r.source_type||'code')}</td><td>${A.money(r.price)}</td><td><span class="status">${A.esc(r.status||'active')}</span></td><td>${A.esc(r.owner_id||r.creator_id||'-')}</td><td>${r.created_at?new Date(r.created_at).toLocaleString('id-ID'):'-'}</td><td><button class="btn small" data-edit="${A.esc(r.id)}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join('')}</tbody></table></div>`;
}
function bind(){
 $('#refreshContent')?.addEventListener('click',boot);
 $('#resetContentFilters')?.addEventListener('click',()=>location.reload());
}
document.addEventListener('DOMContentLoaded',boot);
})();