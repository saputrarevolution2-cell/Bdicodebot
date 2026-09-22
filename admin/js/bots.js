(() => {
  'use strict';
  const A = window.PasTeleAdmin;
  const $ = A.$;
  let data = [];
  let requests = [];

  async function load() {
    const box = $('#adminContent');
    A.setLoading(box);
    try {
      if (!await A.requireAdmin()) return;
      data = await A.rpc('admin_bots', { p_limit: 200, p_offset: 0 });
      requests = await A.rpc('admin_bot_requests', { p_limit: 200, p_offset: 0 });

      box.innerHTML = `
        <section class="bot-request-admin">
          <div class="admin-toolbar">
            <div class="toolbar-title">
              <i class="fa-solid fa-inbox"></i>
              <div>
                <strong>Pengajuan Bot</strong>
                <span>${requests.filter(r => String(r.status || '').toLowerCase() === 'pending').length} menunggu</span>
              </div>
            </div>
          </div>
          <div id="botRequestsTable"></div>
        </section>
        <section class="bot-approved-admin">
          <div class="admin-toolbar">
            <div class="toolbar-title">
              <i class="fa-solid fa-robot"></i>
              <div><strong>Approved Bots</strong><span>${data.length} bot</span></div>
            </div>
            <button class="btn" id="add">+ Tambah Bot</button>
          </div>
          <div id="adminTable"></div>
        </section>`;

      renderRequests();
      A.table($('#adminTable'), data, [
        {label:'Bot', render:r=>`<strong>@${A.esc(String(r.bot_username||'').replace(/^@/,''))}</strong><small>${A.esc(r.bot_name||'-')}</small>`},
        {label:'Bot ID', key:'bot_id'},
        {label:'Status', render:r=>`<span class="status ${r.is_active?'':'danger'}">${r.is_active?'Aktif':'Nonaktif'}</span>`},
        {label:'Created', render:r=>r.created_at?new Date(r.created_at).toLocaleString('id-ID'):'-'}
      ], r=>`<button class="btn small" data-op="edit" data-id="${A.esc(r.id)}">Edit</button> <button class="btn small" data-op="toggle" data-id="${A.esc(r.id)}">${r.is_active?'Nonaktifkan':'Aktifkan'}</button> <button class="btn small danger" data-op="delete" data-id="${A.esc(r.id)}">Hapus</button>`);
      $('#add').onclick = add;
    } catch (e) {
      box.innerHTML = `<div class="empty error-state">${A.esc(A.errText(e))}</div>`;
    }
  }

  function renderRequests() {
    const box = $('#botRequestsTable');
    if (!box) return;
    const pending = requests.filter(r => String(r.status || '').toLowerCase() === 'pending');
    if (!pending.length) {
      box.innerHTML = `<div class="empty">Belum ada pengajuan bot yang menunggu persetujuan.</div>`;
      return;
    }
    A.table(box, pending, [
      {label:'Bot', render:r=>`<strong>@${A.esc(String(r.bot_username||'').replace(/^@/,''))}</strong><small>${A.esc(r.bot_name||'-')}</small>`},
      {label:'Pengaju', render:r=>`<strong>${A.esc(r.username || r.auth_email || '-')}</strong><small>${A.esc(r.note || '')}</small>`},
      {label:'Bot ID', render:r=>r.bot_id ? A.esc(r.bot_id) : '-'},
      {label:'Diajukan', render:r=>r.created_at ? new Date(r.created_at).toLocaleString('id-ID') : '-'}
    ], r=>`<button class="btn small" data-request-op="approve" data-id="${A.esc(r.id)}">Approve</button> <button class="btn small danger" data-request-op="reject" data-id="${A.esc(r.id)}">Tolak</button>`);
  }

  async function add() {
    const username = prompt('Bot username (tanpa @):');
    if (!username) return;
    const id = prompt('Bot ID Telegram:');
    if (!id) return;
    const name = prompt('Nama bot (opsional):') || username;
    try {
      await A.call('admin_upsert_bot', {p_username:username,p_bot_id:Number(id),p_display_name:name});
      A.toast('Bot disimpan.');
      load();
    } catch(e) { A.toast(A.errText(e),'error'); }
  }

  async function approveRequest(id) {
    await A.call('admin_approve_bot_request', {p_request_id:id});
    A.toast('Pengajuan bot disetujui. Bot sekarang tersedia di Create Code.');
    await load();
  }

  async function rejectRequest(id) {
    const reason = prompt('Alasan penolakan (opsional):');
    if (reason === null) return;
    await A.call('admin_reject_bot_request', {p_request_id:id,p_reason:reason});
    A.toast('Pengajuan bot ditolak.');
    await load();
  }

  document.addEventListener('click', async e => {
    const requestBtn = e.target.closest('[data-request-op]');
    if (requestBtn) {
      try {
        if (requestBtn.dataset.requestOp === 'approve') {
          if (!confirm('Approve pengajuan bot ini?')) return;
          await approveRequest(requestBtn.dataset.id);
        } else {
          await rejectRequest(requestBtn.dataset.id);
        }
      } catch (x) { A.toast(A.errText(x),'error'); }
      return;
    }

    const b = e.target.closest('[data-op]');
    if (!b) return;
    try {
      const r = data.find(x => String(x.id) === b.dataset.id);
      if (!r) return;
      if (b.dataset.op === 'edit') {
        const username = prompt('Bot username:',r.bot_username||''); if(username===null)return;
        const idRaw = prompt('Bot ID Telegram:',String(r.bot_id||'')); if(idRaw===null)return;
        const name = prompt('Nama bot:',r.bot_name||''); if(name===null)return;
        const botId = Number(idRaw); if(!Number.isInteger(botId)||botId<=0)throw Error('Bot ID tidak valid.');
        await A.call('admin_update_bot',{p_id:r.id,p_username:username,p_bot_id:botId,p_display_name:name});
      } else if (b.dataset.op === 'toggle') {
        await A.call('admin_set_bot_active',{p_bot_id:r.id,p_active:!r.is_active});
      } else {
        if(!confirm('Hapus bot ini?'))return;
        await A.call('admin_delete_bot',{p_id:b.dataset.id});
      }
      A.toast('Bot diperbarui.');
      await load();
    } catch(x) { A.toast(A.errText(x),'error'); }
  });

  document.addEventListener('DOMContentLoaded',load);
})();