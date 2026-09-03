document.addEventListener('DOMContentLoaded',async()=>{
 const p=await TC.profile();if(!p)return location.replace('login.html');const $=id=>document.getElementById(id),esc=TC.esc;
 const icon=t=>({code:'fa-code',channel:'fa-broadcast-tower',group:'fa-users',link:'fa-link'}[String(t||'').toLowerCase()]||'fa-box');
 const [pr,pa,c,ch]=await Promise.all([sb.from('products').select('*').eq('creator_id',p.id).order('created_at',{ascending:false}),sb.from('pastelinks').select('*').eq('user_id',p.id).order('created_at',{ascending:false}),sb.from('telegram_products').select('*').eq('owner_id',p.id).order('created_at',{ascending:false}),sb.from('telegram_channels').select('*').eq('owner_id',p.id).order('created_at',{ascending:false})]);
 const groups=[['Pastelink',pa.data||[],'paste','fa-link'],['Code',c.data||[],'code','fa-code'],['Channel / Group',ch.data||[],'channel','fa-broadcast-tower'],['Marketplace Product',pr.data||[],'product','fa-box']];
 function href(x,type){if(type==='paste')return `${location.origin}/paste-view.html?slug=${encodeURIComponent(x.slug||'')}`;return `${location.origin}/product.html?id=${encodeURIComponent(x.id)}&type=${encodeURIComponent(x.type||type)}`}
 async function copy(x,type){try{await navigator.clipboard.writeText(href(x,type));TC.toast('Link berhasil disalin','success')}catch(e){TC.toast('Gagal menyalin link','error')}}
 async function edit(x,type){
  const title=prompt('Judul',x.title||x.name||'');if(title===null)return; const clean=title.trim();if(!clean)return TC.toast('Judul wajib diisi','error');
  let r;
  if(type==='paste')r=await sb.from('pastelinks').update({title:clean}).eq('id',x.id).eq('user_id',p.id);
  else if(type==='code'){const desc=prompt('Deskripsi',x.description||'');if(desc===null)return;const price=x.access_type==='paid'?Number(prompt('Harga IDR',x.price||0)):0;r=await sb.from('telegram_products').update({title:clean,description:desc,price,access_type:price>0?'paid':'free'}).eq('id',x.id).eq('owner_id',p.id)}
  else if(type==='channel'){const desc=prompt('Nama/jenis akses (biarkan kosong jika tidak diubah)',x.description||'');r=await sb.from('telegram_channels').update({name:clean}).eq('id',x.id).eq('owner_id',p.id)}
  else r=await sb.from('products').update({title:clean}).eq('id',x.id).eq('creator_id',p.id);
  if(r?.error)TC.toast(r.error.message,'error');else{TC.toast('Berhasil diperbarui','success');setTimeout(()=>location.reload(),350)}
 }
 async function del(x,type){if(!confirm(`Hapus "${x.title||x.name||'konten ini'}"? Tindakan ini tidak dapat dibatalkan.`))return;let q;
  if(type==='paste')q=await sb.from('pastelinks').delete().eq('id',x.id).eq('user_id',p.id);else if(type==='code')q=await sb.from('telegram_products').delete().eq('id',x.id).eq('owner_id',p.id);else if(type==='channel')q=await sb.from('telegram_channels').delete().eq('id',x.id).eq('owner_id',p.id);else q=await sb.from('products').delete().eq('id',x.id).eq('creator_id',p.id);
  if(q.error)TC.toast(q.error.message,'error');else{TC.toast('Konten dihapus','success');setTimeout(()=>location.reload(),350)}
 }
 $('content').innerHTML=groups.map(g=>`<section class="my-section"><h2><i class="fa-solid ${g[3]}"></i> ${g[0]} <span>${g[1].length}</span></h2>${g[1].map(x=>{const title=x.title||x.name||x.slug||'Untitled';const access=Number(x.price||0)>0?'PAID':(x.is_published===false?'DRAFT':'PUBLISHED');return `<div class="my-row"><span class="my-icon"><i class="fa-solid ${g[3]}"></i></span><div class="my-row-main"><b>${esc(title)}</b><small>${esc(x.type||x.product_type||g[2])} · ${new Date(x.created_at).toLocaleString('id-ID')} · ${access}</small></div><div class="my-row-actions"><button class="btn" data-copy="${x.id}" data-type="${g[2]}"><i class="fa-solid fa-copy"></i> Salin</button><button class="btn" data-edit="${x.id}" data-type="${g[2]}"><i class="fa-solid fa-pen"></i> Edit</button><button class="btn danger" data-delete="${x.id}" data-type="${g[2]}"><i class="fa-solid fa-trash"></i> Hapus</button></div></div>`}).join('')||'<div class="empty">Belum ada konten.</div>'}</section>`).join('');
 const find=(id,type)=>({paste:pa.data||[],code:c.data||[],channel:ch.data||[],product:pr.data||[]}[type]||[]).find(x=>x.id===id);
 document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copy(find(b.dataset.copy,b.dataset.type),b.dataset.type));
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(find(b.dataset.edit,b.dataset.type),b.dataset.type));
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>del(find(b.dataset.delete,b.dataset.type),b.dataset.type));
});
