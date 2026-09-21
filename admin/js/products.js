(() => {
'use strict';
const A=window.PasTeleAdmin,$=A.$; let data=[];
const sourceLabel=s=>({products:'Product',pastelinks:'PasteLink',telegram_products:'Code',telegram_channels:'Telegram'}[s]||s||'Content');
const typeLabel=t=>({product:'Product',link:'Product',pastelink:'PasteLink',code:'Code',channel:'Channel',group:'Group',paste:'Paste'}[String(t||'').toLowerCase()]||t||'-');

async function load(){
  const box=$('#adminContent'); A.setLoading(box);
  try{
    if(!await A.requireAdmin())return;
    data=await A.rpc('admin_content',{p_limit:500,p_offset:0});
    render();
  }catch(e){
    box.innerHTML=`<div class="empty error-state"><strong>Gagal memuat marketplace content</strong><span>${A.esc(A.errText(e))}</span><button class="btn" id="retry">Coba lagi</button></div>`;
    $('#retry')?.addEventListener('click',load);
  }
}
function render(){
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-toolbar">
    <div class="toolbar-title"><i class="fa-solid fa-boxes-stacked"></i><div><strong>Marketplace Products</strong><span id="count">${data.length} content</span></div></div>
    <div class="toolbar-tools"><input id="search" class="admin-input" placeholder="Cari judul / slug / ID...">
    <select id="source" class="admin-input"><option value="">Semua jenis</option><option value="products">Product</option><option value="pastelinks">PasteLink</option><option value="telegram_products">Code</option><option value="telegram_channels">Channel / Group</option></select>
    <button class="btn" id="reload"><i class="fa-solid fa-rotate"></i> Refresh</button></div>
  </div><div id="adminTable"></div>`;
  paint(data);
  $('#search').addEventListener('input',filter);
  $('#source').addEventListener('change',filter);
  $('#reload').onclick=load;
}
function filter(){
  const q=($('#search').value||'').toLowerCase(), src=$('#source').value;
  paint(data.filter(r=>(!src||r.source===src)&&(!q||`${r.title||''} ${r.slug||''} ${r.id||''} ${r.owner_id||''}`.toLowerCase().includes(q))));
}
function paint(rows){
  $('#count').textContent=`${rows.length} content`;
  A.table($('#adminTable'),rows,[
    {label:'Content',render:r=>`<strong>${A.esc(r.title||'-')}</strong><small>${A.esc(sourceLabel(r.source))} · ${A.esc(r.slug||r.id)}</small>`},
    {label:'Type',render:r=>A.esc(typeLabel(r.type))},
    {label:'Harga',render:r=>A.money(r.price)},
    {label:'Status',render:r=>`<span class="status">${A.esc(r.status||'-')}</span>`},
    {label:'Owner',render:r=>A.esc(r.owner_id||r.user_id||'-')},
    {label:'Views / Sales',render:r=>`${Number(r.views||0).toLocaleString('id-ID')} / ${Number(r.sales_count||0).toLocaleString('id-ID')}`},
    {label:'Created',render:r=>r.created_at?new Date(r.created_at).toLocaleString('id-ID'):'-'}
  ],r=>`<button class="btn small" data-op="edit" data-id="${A.esc(r.id)}">Edit</button> <button class="btn small danger" data-op="delete" data-id="${A.esc(r.id)}">Hapus</button>`);
}
function edit(r){
  const title=prompt('Judul:',r.title||''); if(title===null)return null;
  const desc=prompt('Deskripsi:',r.description||''); if(desc===null)return null;
  const priceRaw=prompt('Harga (0 = Free):',String(r.price??0)); if(priceRaw===null)return null;
  const price=Number(priceRaw); if(!Number.isFinite(price)||price<0)throw Error('Harga tidak valid.');
  const status=prompt('Status / visibility:',r.status||'published'); if(status===null)return null;
  const slug=prompt('Slug (kosong = tetap):',r.slug||''); if(slug===null)return null;
  return {title,desc,price,status,slug};
}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-op][data-id]'); if(!b)return;
  const r=data.find(x=>String(x.id)===String(b.dataset.id)); if(!r)return;
  try{
    b.disabled=true;
    if(b.dataset.op==='delete'){
      if(!confirm(`Hapus ${sourceLabel(r.source)} "${r.title||r.id}"?`))return;
      await A.call('admin_delete_content',{p_id:r.id,p_source:r.source||'products'});
      A.toast('Content berhasil dihapus.');
    }else{
      const v=edit(r); if(!v)return;
      await A.call('admin_update_content',{
        p_id:r.id,p_status:v.status,p_title:v.title,p_description:v.desc,
        p_source:r.source||'products',p_price:v.price,p_slug:v.slug
      });
      A.toast('Content berhasil diperbarui.');
    }
    await load();
  }catch(x){A.toast(A.errText(x),'error')}finally{b.disabled=false}
});
document.addEventListener('DOMContentLoaded',load);
})();