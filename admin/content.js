/* PasTele Admin — Content Manager */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sb = () => window.sb || null;
  const TC = () => window.TC || {};
  const esc = v => TC().esc ? TC().esc(v) : String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = v => TC().money ? TC().money(v) : `Rp ${Number(v||0).toLocaleString('id-ID')}`;
  const toast = (m,t='success') => TC().toast ? TC().toast(m,t) : console.log(m);
  const rows = d => Array.isArray(d) ? d : (d ? [d] : []);
  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;

  let all = [];
  let filtered = [];
  let page = 1;
  const perPage = 8;
  let editing = null;

  const normalizeType = (raw, source='') => {
    const t = String(raw||'').toLowerCase();
    if (source === 'pastelinks' || ['paste','pastelink','paste-link','paste_link'].includes(t)) return 'link';
    if (source === 'telegram_products') return t.includes('group') ? 'group' : 'code';
    if (source === 'telegram_channels') return 'channel';
    if (t === 'telegram_channel') return 'channel';
    if (t === 'telegram_group') return 'group';
    if (t === 'product') return 'product';
    return ['link','code','channel','group'].includes(t) ? t : 'product';
  };
  const typeLabel = t => ({link:'PasteLink',code:'Code',channel:'Channel',group:'Group',product:'Product'})[t] || 'Content';
  const typeIcon = t => ({link:'fa-link',code:'fa-code',channel:'fa-broadcast-tower',group:'fa-users',product:'fa-box'})[t] || 'fa-layer-group';
  const statusOf = x => {
    if (x.source === 'pastelinks') return x.visibility === 'public' ? 'published' : String(x.visibility||'hidden').toLowerCase();
    if (x.is_published === true) return 'published';
    return String(x.status || (x.is_published === false ? 'draft' : 'published')).toLowerCase();
  };
  const creatorName = x => x.creator_name || x.display_name || x.creator_username || x.username || x.owner_username || x.seller_username || 'Unknown creator';
  const creatorId = x => x.creator_id || x.owner_id || x.user_id || x.seller_id || null;

  async function getCreatorMap(ids) {
    const client = sb();
    const clean = [...new Set(ids.filter(Boolean))];
    if (!client || !clean.length) return {};
    try {
      const q = await client.from('profiles').select('id,username,display_name,auth_email,is_admin,is_banned').in('id', clean);
      if (q.error) throw q.error;
      return Object.fromEntries((q.data||[]).map(p => [String(p.id), p]));
    } catch (e) {
      console.warn('[Admin Content] creator map:', e);
      return {};
    }
  }

  async function loadDirect() {
    const client = sb();
    if (!client) throw new Error('Supabase belum siap.');
    const configs = [
      ['products','product','id,title,slug,price,status,description,views,sales_count,creator_id,seller_id,created_at,updated_at,thumbnail_url'],
      ['pastelinks','link','id,title,slug,visibility,content_html,user_id,views,created_at,updated_at,expires_at'],
      ['telegram_products','code','id,title,description,price,access_type,is_published,owner_id,created_at,updated_at'],
      ['telegram_channels','channel','id,name,title,description,price,access_type,is_published,owner_id,created_at,updated_at']
    ];
    const results = await Promise.all(configs.map(async ([source,type,select]) => {
      const q = await client.from(source).select(select).order('created_at',{ascending:false}).limit(500);
      if (q.error) {
        console.warn(`[Admin Content] ${source}:`, q.error);
        return [];
      }
      return (q.data||[]).map(x => ({...x, source, type: normalizeType(type,source), _source:type}));
    }));
    const base = results.flat();
    const creators = await getCreatorMap(base.map(creatorId));
    return base.map(x => {
      const p = creators[String(creatorId(x))] || {};
      return {...x, creator_name:p.display_name||p.username||null, creator_username:p.username||null, auth_email:p.auth_email||null};
    });
  }

  async function loadRpc() {
    try {
      const data = await Admin.rpc('admin_content', {p_limit:500,p_offset:0});
      return rows(data).map(x => ({...x, source:x.source || x.table_name || 'products', type:normalizeType(x.type,x.source||'')}));
    } catch (_) { return null; }
  }

  async function load() {
    $('contentList').innerHTML = '<div class="card admin-loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuat konten...</div>';
    const rpcData = await loadRpc();
    all = rpcData && rpcData.length ? rpcData : await loadDirect();
    render();
  }

  function applyFilters() {
    const q = String($('contentSearch').value||'').trim().toLowerCase();
    const type = $('contentType').value;
    const status = $('contentStatus').value;
    const sort = $('contentSort').value;
    filtered = all.filter(x => {
      const st = statusOf(x);
      const creator = creatorName(x);
      const hay = [x.title,x.name,x.slug,creator,x.creator_username,x.auth_email].map(v=>String(v||'').toLowerCase()).join(' ');
      return (!q || hay.includes(q)) && (type==='all'||normalizeType(x.type,x.source)===type) && (status==='all'||st===status);
    });
    filtered.sort((a,b) => {
      if (sort==='oldest') return new Date(a.created_at||0)-new Date(b.created_at||0);
      if (sort==='views') return n(b.views)-n(a.views);
      if (sort==='sales') return n(b.sales_count)-n(a.sales_count);
      if (sort==='price') return n(b.price)-n(a.price);
      return new Date(b.created_at||0)-new Date(a.created_at||0);
    });
    const pages = Math.max(1,Math.ceil(filtered.length/perPage));
    page = Math.min(page,pages);
  }

  function renderKpis() {
    const published = all.filter(x=>statusOf(x)==='published').length;
    const creators = new Set(all.map(creatorId).filter(Boolean)).size;
    const views = all.reduce((s,x)=>s+n(x.views),0);
    $('contentKpis').innerHTML = [
      ['Total Content',all.length,'fa-layer-group'],
      ['Published',published,'fa-circle-check'],
      ['Creator',creators,'fa-users'],
      ['Total Views',views.toLocaleString('id-ID'),'fa-eye']
    ].map(x=>`<div class="content-kpi"><div class="content-kpi-icon"><i class="fa-solid ${x[2]}"></i></div><small>${esc(x[0])}</small><strong>${esc(x[1])}</strong></div>`).join('');
  }

  function render() {
    applyFilters();
    renderKpis();
    const total = filtered.length;
    const start = (page-1)*perPage;
    const visible = filtered.slice(start,start+perPage);
    $('contentResult').textContent = `${total.toLocaleString('id-ID')} konten ditemukan${total ? ` · halaman ${page}` : ''}`;
    if (!visible.length) {
      $('contentList').innerHTML = '<div class="card content-empty"><i class="fa-regular fa-folder-open"></i><br><br>Tidak ada konten yang cocok.</div>';
    } else {
      $('contentList').innerHTML = visible.map(renderItem).join('');
      visible.forEach(x => {
        document.querySelector(`[data-edit-content="${CSS.escape(String(x._key))}"]`)?.addEventListener('click',()=>openEditor(x));
        document.querySelector(`[data-view-content="${CSS.escape(String(x._key))}"]`)?.addEventListener('click',()=>viewContent(x));
        document.querySelector(`[data-delete-content="${CSS.escape(String(x._key))}"]`)?.addEventListener('click',()=>deleteContent(x));
      });
    }
    renderPagination();
  }

  function renderItem(x) {
    const type = normalizeType(x.type,x.source);
    const status = statusOf(x);
    const id = String(x.id||'');
    x._key = `${x.source}:${id}`;
    const title = x.title || x.name || 'Untitled';
    const creator = creatorName(x);
    const cid = creatorId(x);
    const slug = x.slug || '—';
    const price = n(x.price);
    const link = x.source==='pastelinks' ? `../paste-view.html?slug=${encodeURIComponent(slug)}` : `../product.html?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`;
    return `<article class="content-item">
      <div class="content-type-icon ${esc(type)}"><i class="fa-solid ${esc(typeIcon(type))}"></i></div>
      <div class="content-main">
        <div class="content-title"><strong title="${esc(title)}">${esc(title)}</strong><span class="content-pill">${esc(typeLabel(type))}</span></div>
        <div class="content-sub"><span>Slug: ${esc(slug)}</span><span>·</span><span>Creator: <a class="creator-link" href="../profile.html?id=${encodeURIComponent(cid||'')}" target="_blank" rel="noopener">${esc(creator)}</a></span></div>
        <div class="content-meta"><span class="content-pill ${esc(status)}">${status==='published'?'Published':esc(status)}</span><span class="content-pill"><i class="fa-solid fa-eye"></i> ${n(x.views).toLocaleString('id-ID')}</span><span class="content-pill"><i class="fa-solid fa-cart-shopping"></i> ${n(x.sales_count).toLocaleString('id-ID')}</span><span class="content-pill"><i class="fa-solid fa-money-bill"></i> ${price>0?money(price):'Gratis'}</span></div>
      </div>
      <div class="content-actions">
        <a class="btn icon-only" href="${esc(link)}" target="_blank" rel="noopener" title="Lihat"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
        <button class="btn icon-only" data-edit-content="${esc(x._key)}" type="button" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="btn danger icon-only" data-delete-content="${esc(x._key)}" type="button" title="Hapus"><i class="fa-solid fa-trash"></i></button>
      </div>
    </article>`;
  }

  function renderPagination() {
    const box = $('contentPagination');
    const pages = Math.max(1,Math.ceil(filtered.length/perPage));
    if (pages<=1) { box.hidden=true; box.innerHTML=''; return; }
    box.hidden=false;
    const buttons=[];
    buttons.push(`<button type="button" data-page="${page-1}" ${page===1?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>`);
    const from=Math.max(1,page-2), to=Math.min(pages,from+4);
    for(let i=from;i<=to;i++) buttons.push(`<button type="button" data-page="${i}" class="${i===page?'active':''}">${i}</button>`);
    buttons.push(`<button type="button" data-page="${page+1}" ${page===pages?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>`);
    box.innerHTML=buttons.join('');
    box.querySelectorAll('button[data-page]').forEach(b=>b.addEventListener('click',()=>{const p=Number(b.dataset.page);if(p>=1&&p<=pages){page=p;render();window.scrollTo({top:0,behavior:'smooth'});}}));
  }

  function viewContent(x) {
    const type=normalizeType(x.type,x.source), slug=x.slug;
    const url=x.source==='pastelinks' ? `../paste-view.html?slug=${encodeURIComponent(slug||'')}` : `../product.html?id=${encodeURIComponent(x.id||'')}&type=${encodeURIComponent(type)}`;
    window.open(url,'_blank','noopener');
  }

  function openEditor(x) {
    editing=x;
    $('editId').value=x.id||'';
    $('editSource').value=x.source||'';
    $('editTitle').value=x.title||x.name||'';
    $('editSlug').value=x.slug||'';
    $('editPrice').value=n(x.price);
    $('editStatus').value=statusOf(x);
    $('editDescription').value=x.description||'';
    $('editSlug').disabled=x.source!=='products';
    $('editNote').textContent = x.source==='pastelinks' ? 'PasteLink dikelola melalui kolom title/visibility. Slug tetap dipertahankan agar URL publik tidak rusak.' : 'Perubahan admin harus tetap tunduk pada RLS/RPC database.';
    $('contentModal').hidden=false;
    $('contentModal').setAttribute('aria-hidden','false');
    document.body.classList.add('content-modal-open');
    setTimeout(()=>$('editTitle').focus(),20);
  }

  function closeEditor() {
    $('contentModal').hidden=true;
    $('contentModal').setAttribute('aria-hidden','true');
    document.body.classList.remove('content-modal-open');
    editing=null;
  }

  async function updateViaRpc(payload) {
    try { return await Admin.rpc('admin_update_content',payload); } catch (_) { return null; }
  }

  async function directUpdate(x, data) {
    const client=sb();
    if(!client) throw new Error('Supabase belum siap.');
    let table=x.source;
    let update=data;
    if(table==='pastelinks') update={title:data.title,visibility:data.status==='published'?'public':data.status};
    if(table==='telegram_products') update={title:data.title,description:data.description,price:data.price,is_published:data.status==='published'};
    if(table==='telegram_channels') update={name:data.title,description:data.description,price:data.price,is_published:data.status==='published'};
    if(table==='products') update={title:data.title,price:data.price,status:data.status,description:data.description};
    const ownerCol=table==='pastelinks'?'user_id':table==='products'?'creator_id':'owner_id';
    const q=await client.from(table).update(update).eq('id',x.id);
    if(q.error) throw q.error;
    return q.data;
  }

  async function saveEditor(e) {
    e.preventDefault();
    if(!editing) return;
    const data={title:$('editTitle').value.trim(),slug:$('editSlug').value.trim(),price:n($('editPrice').value),status:$('editStatus').value,description:$('editDescription').value.trim()};
    if(!data.title) return toast('Judul wajib diisi','error');
    const btn=$('saveContentEdit');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    try {
      const rpc=await updateViaRpc({p_id:editing.id,p_source:editing.source,p_title:data.title,p_slug:data.slug||null,p_price:data.price,p_status:data.status,p_description:data.description||null});
      if(rpc===null) await directUpdate(editing,data);
      toast('Konten berhasil diperbarui','success');
      closeEditor(); await load();
    } catch(e) { toast(e?.message||'Gagal memperbarui konten','error'); }
    finally { btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Simpan'; }
  }

  async function deleteContent(x) {
    if(!confirm(`Hapus konten "${x.title||x.name||'Untitled'}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      let rpc=null;
      try { rpc=await Admin.rpc('admin_delete_content',{p_id:x.id,p_source:x.source}); } catch (_) {}
      if(rpc===null) {
        const client=sb();
        if(!client) throw new Error('Supabase belum siap.');
        const q=await client.from(x.source).delete().eq('id',x.id);
        if(q.error) throw q.error;
      }
      toast('Konten berhasil dihapus','success');
      await load();
    } catch(e) { toast(e?.message||'Gagal menghapus konten','error'); }
  }

  $('contentSearch').addEventListener('input',()=>{page=1;render();});
  $('contentType').addEventListener('change',()=>{page=1;render();});
  $('contentStatus').addEventListener('change',()=>{page=1;render();});
  $('contentSort').addEventListener('change',()=>{page=1;render();});
  $('clearContentSearch').addEventListener('click',()=>{$('contentSearch').value='';page=1;render();$('contentSearch').focus();});
  $('resetContentFilters').addEventListener('click',()=>{$('contentSearch').value='';$('contentType').value='all';$('contentStatus').value='all';$('contentSort').value='newest';page=1;render();});
  $('refreshContent').addEventListener('click',load);
  $('contentEditForm').addEventListener('submit',saveEditor);
  $('contentModalClose').addEventListener('click',closeEditor);
  $('cancelContentEdit').addEventListener('click',closeEditor);
  document.querySelector('[data-close-content]')?.addEventListener('click',closeEditor);
  $('deleteContent').addEventListener('click',async()=>{if(editing){const x=editing;closeEditor();await deleteContent(x);}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('contentModal').hidden)closeEditor();});

  (async()=>{
    try { await Admin.guard(); await load(); }
    catch(e) { $('contentList').innerHTML=`<div class="card content-empty">${esc(e?.message||'Akses admin ditolak.')}</div>`; }
  })();
})();
