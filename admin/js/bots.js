(() => {
  'use strict';

  const A = window.PasTeleAdmin;
  if (!A || typeof A.$ !== 'function') {
    const box = document.getElementById('adminContent');
    if (box) {
      box.innerHTML = `
        <div class="empty error-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <strong>Panel admin gagal dimuat</strong>
          <span>Admin core belum tersedia. Refresh halaman.</span>
        </div>`;
    }
    return;
  }

  const $ = A.$;
  let data = [];
  let requests = [];

  function normalizeRows(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.data)) return value.data;
    if (value && Array.isArray(value.rows)) return value.rows;
    if (value && typeof value === 'object') return [value];
    return [];
  }

  function rpcText(e) {
    return String(
      e?.message ||
      e?.details ||
      e?.hint ||
      e?.error_description ||
      e ||
      'Terjadi kesalahan database.'
    ).trim();
  }

  async function load() {
    const box = $('#adminContent');
    if (!box) return;

    A.setLoading(box);

    try {
      if (!await A.requireAdmin()) return;

      const approved = await A.rpc('admin_bots', {
        p_limit: 200,
        p_offset: 0
      });
      data = normalizeRows(approved);

      /*
       * Bot-request moderation is optional. Older/current deployments
       * may not have the request RPCs; that must not break Approved Bots.
       */
      requests = [];
      try {
        const result = await A.rpc('admin_bot_requests', {
          p_limit: 200,
          p_offset: 0
        });
        requests = normalizeRows(result);
      } catch (requestError) {
        console.warn(
          '[PasTele][Admin Bots] admin_bot_requests unavailable:',
          requestError
        );
        requests = [];
      }

      box.innerHTML = `
        <section class="bot-request-admin">
          <div class="admin-toolbar">
            <div class="toolbar-title">
              <i class="fa-solid fa-inbox"></i>
              <div>
                <strong>Pengajuan Bot</strong>
                <span id="botRequestCount">Memuat...</span>
              </div>
            </div>
          </div>
          <div id="botRequestsTable"></div>
        </section>

        <section class="bot-approved-admin">
          <div class="admin-toolbar">
            <div class="toolbar-title">
              <i class="fa-solid fa-robot"></i>
              <div>
                <strong>Approved Bots</strong>
                <span>${data.length} bot</span>
              </div>
            </div>
            <button class="btn primary" id="add" type="button">
              <i class="fa-solid fa-plus"></i> Tambah Bot
            </button>
          </div>
          <div id="adminTable"></div>
        </section>`;

      renderRequests();

      A.table(
        $('#adminTable'),
        data,
        [
          {
            label: 'Bot',
            render: r =>
              `<strong>@${A.esc(String(r.bot_username || '').replace(/^@/, ''))}</strong>` +
              `<small>${A.esc(r.bot_name || '-')}</small>`
          },
          { label: 'Bot ID', key: 'bot_id' },
          {
            label: 'Status',
            render: r =>
              `<span class="status ${r.is_active ? '' : 'danger'}">` +
              `${r.is_active ? 'Aktif' : 'Nonaktif'}</span>`
          },
          {
            label: 'Created',
            render: r =>
              r.created_at
                ? new Date(r.created_at).toLocaleString('id-ID')
                : '-'
          }
        ],
        r =>
          `<button class="btn small" type="button" data-op="edit" data-id="${A.esc(r.id)}">` +
          `<i class="fa-solid fa-pen"></i> Edit</button> ` +
          `<button class="btn small" type="button" data-op="toggle" data-id="${A.esc(r.id)}">` +
          `${r.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button> ` +
          `<button class="btn small danger" type="button" data-op="delete" data-id="${A.esc(r.id)}">` +
          `<i class="fa-solid fa-trash"></i> Hapus</button>`
      );

      $('#add').onclick = add;
    } catch (e) {
      console.error('[PasTele][Admin Bots] load failed:', e);
      box.innerHTML = `
        <div class="empty error-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <strong>Gagal memuat Bots</strong>
          <span>${A.esc(rpcText(e))}</span>
          <button class="btn" type="button" id="retryBots">
            <i class="fa-solid fa-rotate"></i> Coba lagi
          </button>
        </div>`;
      $('#retryBots')?.addEventListener('click', load);
    }
  }

  function renderRequests() {
    const box = $('#botRequestsTable');
    const count = $('#botRequestCount');
    if (!box) return;

    const pending = requests.filter(
      r => String(r.status || '').toLowerCase() === 'pending'
    );

    if (count) {
      count.textContent = pending.length
        ? `${pending.length} menunggu`
        : requests.length
          ? `${requests.length} pengajuan`
          : 'Belum tersedia';
    }

    if (!requests.length) {
      box.innerHTML = `
        <div class="empty bot-request-empty">
          <i class="fa-solid fa-circle-info"></i>
          <strong>Tidak ada data pengajuan bot</strong>
          <span>RPC pengajuan bot belum tersedia pada database ini, atau belum ada pengajuan.</span>
        </div>`;
      return;
    }

    if (!pending.length) {
      box.innerHTML = `
        <div class="empty bot-request-empty">
          <i class="fa-solid fa-circle-check"></i>
          <strong>Tidak ada pengajuan yang menunggu</strong>
          <span>Semua pengajuan bot saat ini sudah diproses.</span>
        </div>`;
      return;
    }

    A.table(
      box,
      pending,
      [
        {
          label: 'Bot',
          render: r =>
            `<strong>@${A.esc(String(r.bot_username || '').replace(/^@/, ''))}</strong>` +
            `<small>${A.esc(r.bot_name || '-')}</small>`
        },
        {
          label: 'Pengaju',
          render: r =>
            `<strong>${A.esc(r.username || r.auth_email || '-')}</strong>` +
            `<small>${A.esc(r.note || '')}</small>`
        },
        {
          label: 'Bot ID',
          render: r => r.bot_id ? A.esc(r.bot_id) : '-'
        },
        {
          label: 'Diajukan',
          render: r =>
            r.created_at
              ? new Date(r.created_at).toLocaleString('id-ID')
              : '-'
        }
      ],
      r =>
        `<button class="btn small" type="button" data-request-op="approve" data-id="${A.esc(r.id)}">` +
        `<i class="fa-solid fa-check"></i> Approve</button> ` +
        `<button class="btn small danger" type="button" data-request-op="reject" data-id="${A.esc(r.id)}">` +
        `<i class="fa-solid fa-xmark"></i> Tolak</button>`
    );
  }

  async function add() {
    let username = prompt('Bot username (tanpa @):');
    if (username === null) return;

    username = String(username).trim().replace(/^@+/, '');
    if (!username) return;

    const idRaw = prompt('Bot ID Telegram:');
    if (idRaw === null) return;

    const botId = Number(String(idRaw).trim());
    if (!Number.isSafeInteger(botId) || botId <= 0) {
      A.toast('Bot ID Telegram tidak valid.', 'error');
      return;
    }

    const name = (prompt('Nama bot (opsional):') || username).trim();

    try {
      await A.call('admin_upsert_bot', {
        p_username: username,
        p_bot_id: botId,
        p_display_name: name
      });
      A.toast('Bot berhasil disimpan.');
      await load();
    } catch (e) {
      A.toast(rpcText(e), 'error');
    }
  }

  async function approveRequest(id) {
    await A.call('admin_approve_bot_request', {
      p_request_id: id
    });
    A.toast('Pengajuan bot disetujui. Bot sekarang tersedia di Create Code.');
    await load();
  }

  async function rejectRequest(id) {
    const reason = prompt('Alasan penolakan (opsional):');
    if (reason === null) return;

    await A.call('admin_reject_bot_request', {
      p_request_id: id,
      p_reason: String(reason).trim()
    });

    A.toast('Pengajuan bot ditolak.');
    await load();
  }

  document.addEventListener('click', async e => {
    const requestBtn = e.target.closest('[data-request-op]');

    if (requestBtn) {
      try {
        requestBtn.disabled = true;

        if (requestBtn.dataset.requestOp === 'approve') {
          if (!confirm('Approve pengajuan bot ini?')) return;
          await approveRequest(requestBtn.dataset.id);
        } else {
          await rejectRequest(requestBtn.dataset.id);
        }
      } catch (x) {
        A.toast(rpcText(x), 'error');
      } finally {
        requestBtn.disabled = false;
      }
      return;
    }

    const b = e.target.closest('[data-op]');
    if (!b) return;

    try {
      const r = data.find(x => String(x.id) === String(b.dataset.id));
      if (!r) return;

      b.disabled = true;

      if (b.dataset.op === 'edit') {
        let username = prompt('Bot username:', r.bot_username || '');
        if (username === null) return;

        username = String(username).trim().replace(/^@+/, '');
        if (!username) {
          A.toast('Bot username wajib diisi.', 'error');
          return;
        }

        const idRaw = prompt(
          'Bot ID Telegram:',
          String(r.bot_id || '')
        );
        if (idRaw === null) return;

        const botId = Number(String(idRaw).trim());
        if (!Number.isSafeInteger(botId) || botId <= 0) {
          throw new Error('Bot ID Telegram tidak valid.');
        }

        const name = prompt(
          'Nama bot:',
          r.bot_name || username
        );
        if (name === null) return;

        await A.call('admin_update_bot', {
          p_id: r.id,
          p_username: username,
          p_bot_id: botId,
          p_display_name: String(name).trim() || username
        });

        A.toast('Bot berhasil diperbarui.');
      } else if (b.dataset.op === 'toggle') {
        await A.call('admin_set_bot_active', {
          p_bot_id: r.id,
          p_active: !Boolean(r.is_active)
        });

        A.toast(
          r.is_active
            ? 'Bot dinonaktifkan.'
            : 'Bot diaktifkan.'
        );
      } else if (b.dataset.op === 'delete') {
        if (!confirm('Hapus bot ini?')) return;

        await A.call('admin_delete_bot', {
          p_id: r.id
        });

        A.toast('Bot berhasil dihapus.');
      }

      await load();
    } catch (x) {
      A.toast(rpcText(x), 'error');
    } finally {
      b.disabled = false;
    }
  });

  document.addEventListener('DOMContentLoaded', load);
})();
