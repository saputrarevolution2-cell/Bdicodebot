(() => {
  'use strict';
  const A = window.PasTeleAdmin, $ = A.$;
  let data = [];
  let filteredRows = [];
  let page = 1;
  const PAGE_SIZE = 10;

  const sourceLabel = s => ({
    products:'Product', pastelinks:'PasteLink', telegram_products:'Code',
    telegram_channels:'Channel / Group', pastes:'Paste'
  }[s] || s || 'Content');
  const typeLabel = t => ({
    product:'Product', link:'PasteLink', pastelink:'PasteLink', code:'Code',
    channel:'Channel', group:'Group', paste:'Paste'
  }[String(t || '').toLowerCase()] || t || '-');
  const esc = A.esc;
  const money = A.money;

  function listBox(){ return $('#contentList') || $('#adminContent'); }
  function currentSource(r){ return String(r?.source || 'products'); }
  function contentOf(r){ return String(r?.content_body ?? r?.content ?? '').replace(/\r\n/g,'\n'); }
  function statusOf(r){ return String(r?.status || '').toLowerCase(); }

  async function load(){
    const box = listBox();
    A.setLoading(box, 'Mengambil konten dari database...');
    if ($('#contentResult')) $('#contentResult').textContent = 'Mengambil data...';
    try {
      const guard = await A.requireAdmin();
      if (!guard) return;
      const rows = await A.rpc('admin_content', {p_limit:500, p_offset:0});
      data = Array.isArray(rows) ? rows : [];
      page = 1;
      apply();
    } catch(e) {
      data = [];
      if ($('#contentResult')) $('#contentResult').textContent = 'Gagal memuat konten';
      if (box) box.innerHTML = `<div class="empty error-state"><i class="fa-solid fa-triangle-exclamation"></i><strong>Gagal memuat konten</strong><span>${esc(A.errText(e))}</span><button class="btn primary" id="retryContent" type="button"><i class="fa-solid fa-rotate"></i> Coba lagi</button></div>`;
      $('#retryContent')?.addEventListener('click', load);
    }
  }

  function getRows(){
    const q = String($('#contentSearch')?.value || '').trim().toLowerCase();
    const type = String($('#contentType')?.value || 'all');
    const status = String($('#contentStatus')?.value || 'all');
    const sort = String($('#contentSort')?.value || 'newest');
    let rows = data.filter(r => {
      const hay = [r.title,r.slug,r.id,r.owner_username,r.owner_email,r.owner_id,r.source,r.type].map(x=>String(x||'').toLowerCase()).join(' ');
      const sourceMatch = type === 'all' ||
        (type === 'link' ? currentSource(r)==='pastelinks' :
         type === 'paste' ? currentSource(r)==='pastes' :
         type === 'code' ? currentSource(r)==='telegram_products' :
         (type === 'channel' || type === 'group') ? currentSource(r)==='telegram_channels' :
         type === 'product' ? currentSource(r)==='products' : true);
      const statusMatch = status === 'all' || statusOf(r) === status;
      return (!q || hay.includes(q)) && sourceMatch && statusMatch;
    });
    rows.sort((a,b)=>{
      if(sort==='oldest') return new Date(a.created_at||0)-new Date(b.created_at||0);
      if(sort==='views') return Number(b.views||0)-Number(a.views||0);
      if(sort==='sales') return Number(b.sales_count||0)-Number(a.sales_count||0);
      if(sort==='price') return Number(b.price||0)-Number(a.price||0);
      return new Date(b.created_at||0)-new Date(a.created_at||0);
    });
    return rows;
  }

  function apply(){
    filteredRows = getRows();
    const totalPages = Math.max(1, Math.ceil(filteredRows.length/PAGE_SIZE));
    if(page > totalPages) page = totalPages;
    render();
  }

  function render(){
    const box = listBox();
    const start = (page-1)*PAGE_SIZE;
    const rows = filteredRows.slice(start,start+PAGE_SIZE);
    const total = filteredRows.length;
    if($('#contentKpis')) $('#contentKpis').innerHTML = `
      <div class="kpi"><span class="kpi-icon"><i class="fa-solid fa-layer-group"></i></span><div><strong>${data.length}</strong><span>Total Content</span></div></div>
      <div class="kpi"><span class="kpi-icon success"><i class="fa-solid fa-circle-check"></i></span><div><strong>${data.filter(x=>['published','active','public'].includes(statusOf(x))).length}</strong><span>Published</span></div></div>
      <div class="kpi"><span class="kpi-icon purple"><i class="fa-solid fa-eye"></i></span><div><strong>${data.reduce((n,x)=>n+Number(x.views||0),0).toLocaleString('id-ID')}</strong><span>Total Views</span></div></div>`;
    if($('#contentResult')) $('#contentResult').textContent = total ? `${start+1}-${Math.min(start+PAGE_SIZE,total)} dari ${total} konten` : '0 konten ditemukan';

    if(!rows.length){
      box.innerHTML = `<div class="empty"><i class="fa-solid fa-inbox"></i><strong>${data.length?'Tidak ada hasil':'Belum ada konten'}</strong><span>${data.length?'Coba ubah pencarian atau filter.':'Belum ada konten yang bisa dikelola.'}</span>${data.length?'<button class="btn" id="resetContentEmpty" type="button">Reset filter</button>':''}</div>`;
      $('#resetContentEmpty')?.addEventListener('click',resetFilters);
      renderPagination();
      return;
    }

    A.table(box, rows, [
      {label:'Content', render:r=>`<div class="content-cell"><span class="content-type-icon ${esc(currentSource(r))}"><i class="fa-solid ${currentSource(r)==='telegram_products'?'fa-code':currentSource(r)==='pastelinks'?'fa-link':currentSource(r)==='telegram_channels'?'fa-tower-broadcast':currentSource(r)==='pastes'?'fa-file-lines':'fa-box'}"></i></span><div><strong>${esc(r.title||'-')}</strong><small>${esc(sourceLabel(r.source))} · ${esc(r.slug||r.id||'-')}</small></div></div>`},
      {label:'Owner', render:r=>`<strong>${esc(r.owner_username||'-')}</strong><small>${esc(r.owner_email||r.owner_id||'-')}</small>`},
      {label:'Harga', render:r=>money(r.price)},
      {label:'Status', render:r=>`<span class="status ${['published','active','public'].includes(statusOf(r))?'success':statusOf(r)==='rejected'||statusOf(r)==='hidden'?'danger':'info'}">${esc(r.status||'-')}</span>`},
      {label:'Views / Sales', render:r=>`${Number(r.views||0).toLocaleString('id-ID')} / ${Number(r.sales_count||0).toLocaleString('id-ID')}`},
      {label:'Isi', render:r=>`<button class="btn small" data-view="${esc(r.id)}" data-source="${esc(currentSource(r))}" type="button"><i class="fa-solid fa-eye"></i> Lihat</button>`}
    ], r=>`<div class="row-actions-group"><button class="btn small primary" data-edit="${esc(r.id)}" data-source="${esc(currentSource(r))}" type="button"><i class="fa-solid fa-pen"></i> Edit</button><button class="btn small danger" data-delete="${esc(r.id)}" data-source="${esc(currentSource(r))}" type="button"><i class="fa-solid fa-trash"></i></button></div>`);
    renderPagination();
  }

  function renderPagination(){
    const el = $('#contentPagination');
    const pages = Math.max(1,Math.ceil(filteredRows.length/PAGE_SIZE));
    if(!el) return;
    if(filteredRows.length<=PAGE_SIZE){el.hidden=true;el.innerHTML='';return;}
    el.hidden=false;
    let html=`<button class="page-btn" data-page="${page-1}" ${page<=1?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>`;
    for(let p=1;p<=pages;p++){
      if(p===1 || p===pages || Math.abs(p-page)<=2) html+=`<button class="page-btn ${p===page?'active':''}" data-page="${p}">${p}</button>`;
      else if(p===2 && page>4) html+='<span class="page-dots">…</span>';
      else if(p===pages-1 && page<pages-3) html+='<span class="page-dots">…</span>';
    }
    html+=`<button class="page-btn" data-page="${page+1}" ${page>=pages?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>`;
    el.innerHTML=html;
  }

  function resetFilters(){
    if($('#contentSearch')) $('#contentSearch').value='';
    if($('#contentType')) $('#contentType').value='all';
    if($('#contentStatus')) $('#contentStatus').value='all';
    if($('#contentSort')) $('#contentSort').value='newest';
    page=1;apply();
  }

  function setEditorContent(r){
    const source=currentSource(r);
    const wrap=$('#editContentWrap'), area=$('#editContent'), note=$('#editNote');
    const content=contentOf(r);
    if(!wrap||!area) return;
    wrap.hidden=false;
    area.value=content;
    if(source==='pastelinks'){
      wrap.querySelector('span').textContent='Isi PasteLink (HTML / format konten)';
      note.innerHTML='<i class="fa-solid fa-circle-info"></i> Isi PasteLink diambil langsung dari <b>content_html</b>. Perubahan akan mengganti isi yang tersimpan.';
    }else if(source==='telegram_products'){
      wrap.querySelector('span').textContent='Isi Code / Konten';
      note.innerHTML='<i class="fa-solid fa-circle-info"></i> Isi Code diambil langsung dari <b>telegram_products.content</b>. Slug tetap menjadi identifier dan tidak menggantikan isi konten.';
    }else if(source==='telegram_channels'){
      wrap.querySelector('span').textContent='Link Invite';
      note.innerHTML='<i class="fa-solid fa-circle-info"></i> Untuk Channel / Group, field ini mewakili <b>invite_url</b> sesuai database.';
    }else{
      wrap.querySelector('span').textContent='Isi Konten';
      note.innerHTML='<i class="fa-solid fa-circle-info"></i> Isi ini dibaca dari data konten yang dikembalikan database dan disimpan kembali saat kamu menekan Simpan.';
    }
  }

  function openEditor(r){
    $('#editId').value=r.id||'';
    $('#editSource').value=currentSource(r);
    $('#editTitle').value=r.title||'';
    $('#editSlug').value=r.slug||'';
    $('#editPrice').value=Number(r.price||0);
    $('#editStatus').value=statusOf(r)==='public'?'published':(r.status||'draft');
    $('#editDescription').value=r.description||'';
    setEditorContent(r);
    $('#contentModalTitle').textContent=`Edit ${sourceLabel(currentSource(r))}`;
    $('#contentModal')?.removeAttribute('hidden');
    $('#contentModal')?.setAttribute('aria-hidden','false');
    document.body.classList.add('admin-modal-open');
    setTimeout(()=>$('#editTitle')?.focus(),50);
  }
  function closeEditor(){
    $('#contentModal')?.setAttribute('hidden','');
    $('#contentModal')?.setAttribute('aria-hidden','true');
    document.body.classList.remove('admin-modal-open');
  }

  async function saveEditor(e){
    e.preventDefault();
    const save=$('#saveContentEdit');
    if(!save)return;
    save.disabled=true;save.classList.add('is-loading');
    try{
      const id=$('#editId').value, source=$('#editSource').value;
      const price=Number($('#editPrice').value||0);
      if(!Number.isFinite(price)||price<0) throw Error('Harga tidak valid.');
      const result=await A.call('admin_update_content',{
        p_id:id,p_status:$('#editStatus').value||null,p_title:$('#editTitle').value.trim(),
        p_description:$('#editDescription').value.trim(),p_source:source,p_slug:$('#editSlug').value.trim()||null,
        p_price:price,p_content:$('#editContent').value
      });
      closeEditor();A.toast('Konten berhasil diperbarui.');await load();
      return result;
    }catch(err){A.toast(A.errText(err),'error');}
    finally{save.disabled=false;save.classList.remove('is-loading');}
  }

  function showContent(r){
    const text=contentOf(r).trim();
    openEditor(r);
    $('#contentModalTitle').textContent=`Detail ${sourceLabel(currentSource(r))}`;
    $('#editContent').readOnly=true;
    $('#editTitle').readOnly=true;$('#editSlug').readOnly=true;$('#editPrice').readOnly=true;$('#editDescription').readOnly=true;$('#editStatus').disabled=true;
    $('#saveContentEdit').hidden=true;$('#deleteContent').hidden=true;
    $('#cancelContentEdit').textContent='Tutup';
    if(!text) $('#editContent').placeholder='Konten kosong di database.';
  }
  function resetEditorMode(){
    $('#editContent').readOnly=false;$('#editTitle').readOnly=false;$('#editSlug').readOnly=false;$('#editPrice').readOnly=false;$('#editDescription').readOnly=false;$('#editStatus').disabled=false;
    $('#saveContentEdit').hidden=false;$('#deleteContent').hidden=false;$('#cancelContentEdit').textContent='Batal';
  }

  async function deleteCurrent(){
    const id=$('#editId').value, source=$('#editSource').value;
    const title=$('#editTitle').value||id;
    if(!confirm(`Hapus ${sourceLabel(source)} "${title}"?`))return;
    try{await A.call('admin_delete_content',{p_id:id,p_source:source});closeEditor();A.toast('Konten berhasil dihapus.');await load();}
    catch(e){A.toast(A.errText(e),'error');}
  }

  function bind(){
    $('#refreshContent')?.addEventListener('click',load);
    $('#resetContentFilters')?.addEventListener('click',resetFilters);
    $('#clearContentSearch')?.addEventListener('click',()=>{if($('#contentSearch'))$('#contentSearch').value='';page=1;apply();});
    ['contentSearch','contentType','contentStatus','contentSort'].forEach(id=>$(('#'+id))?.addEventListener('input',()=>{page=1;apply();}));
    $('#contentPagination')?.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;const p=Number(b.dataset.page);if(p>0){page=p;render();window.scrollTo({top:0,behavior:'smooth'});}});
    $('#contentEditForm')?.addEventListener('submit',saveEditor);
    $('#cancelContentEdit')?.addEventListener('click',()=>{closeEditor();resetEditorMode();});
    $('#contentModalClose')?.addEventListener('click',()=>{closeEditor();resetEditorMode();});
    document.querySelector('[data-close-content]')?.addEventListener('click',()=>{closeEditor();resetEditorMode();});
    $('#deleteContent')?.addEventListener('click',deleteCurrent);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#contentModal')?.hidden){closeEditor();resetEditorMode();}});
    document.addEventListener('click',async e=>{
      const b=e.target.closest('[data-edit],[data-delete],[data-view]');if(!b)return;
      const r=data.find(x=>String(x.id)===String(b.dataset.edit||b.dataset.delete||b.dataset.view)&&currentSource(x)===String(b.dataset.source||''));
      if(!r)return;
      if(b.dataset.edit){resetEditorMode();openEditor(r);return;}
      if(b.dataset.view){resetEditorMode();showContent(r);return;}
      if(b.dataset.delete){if(!confirm(`Hapus ${sourceLabel(currentSource(r))} "${r.title||r.id}"?`))return;try{b.disabled=true;await A.call('admin_delete_content',{p_id:r.id,p_source:currentSource(r)});A.toast('Konten berhasil dihapus.');await load();}catch(err){A.toast(A.errText(err),'error')}finally{b.disabled=false;}}
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{bind();load();});
})();
