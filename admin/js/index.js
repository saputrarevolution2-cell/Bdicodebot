(() => {
  'use strict';

  /*
   * PasTele Admin Control Center
   * Database contract: database.sql
   *
   * Canonical admin RPCs used here:
   *   - is_current_user_admin()
   *   - get_public_site_settings()
   *   - admin_stats()
   *   - admin_set_platform_control(text, boolean, text)
   *
   * No service-role key is used in the browser.
   */

  const CONFIG = {
    SUPABASE_URL: 'https://jxrndamvelqwhbcromye.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo'
  };


  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));
  const money = (value) => 'Rp ' + Number(value || 0).toLocaleString('id-ID');

  let controls = {};
  let guardPassed = false;

  function toast(message, type = 'ok') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'admin-toast ' + type;
    clearTimeout(window.__pasteleAdminToast);
    window.__pasteleAdminToast = setTimeout(() => {
      el.className = 'admin-toast';
    }, 3200);
  }

  function showError(message) {
    const el = $('#alertBox');
    if (!el) return;
    el.className = 'admin-alert error';
    el.innerHTML =
      '<i class="fa-solid fa-triangle-exclamation"></i><span>' + esc(message) + '</span>';
  }

  function clearError() {
    const el = $('#alertBox');
    if (el) el.className = 'admin-alert hidden';
  }

  function redirectToLogin() {
    const target = location.pathname + location.search + location.hash;
    location.replace('../login.html?redirect=' + encodeURIComponent(target));
  }

  function normalizeBool(value) {
    if (value === true || value === false) return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
  }

  async function waitForSession(timeoutMs = 5000) {
    const first = await sb.auth.getSession();
    if (first?.data?.session?.user) return first.data.session;

    return await new Promise((resolve) => {
      let settled = false;

      const finish = (session) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { subscription?.unsubscribe(); } catch (_) {}
        resolve(session || null);
      };

      const timer = setTimeout(() => finish(null), timeoutMs);

      let subscription = null;
      try {
        const result = sb.auth.onAuthStateChange((_event, session) => {
          if (session?.user) finish(session);
        });
        subscription = result?.data?.subscription || null;
      } catch (_) {
        finish(null);
      }
    });
  }

  async function guard() {
    if (guardPassed) return true;

    // Do not redirect immediately while Supabase is restoring the persisted session.
    const session = await waitForSession(5000);

    if (!session?.user) {
      redirectToLogin();
      return false;
    }

    const { data, error } = await sb.rpc('is_current_user_admin');
    let adminOK = !error && (normalizeBool(data) || data?.is_admin === true);

    // Canonical profile fallback: admin is granted by profiles.is_admin=true
    // or role='admin'. This also handles existing admin accounts whose role
    // column was not migrated yet.
    if (!adminOK) {
      const q = await sb.from('profiles')
        .select('id,is_admin,role,status,is_banned')
        .eq('id', session.user.id)
        .maybeSingle();
      adminOK = !q.error && q.data &&
        !normalizeBool(q.data.is_banned) &&
        !['blocked','disabled','suspended'].includes(String(q.data.status || '').toLowerCase()) &&
        (normalizeBool(q.data.is_admin) || String(q.data.role || '').toLowerCase() === 'admin');
    }

    if (!adminOK) {
      if (error) console.error('[PasTele Admin] is_current_user_admin:', error);
      document.body.innerHTML = `
        <main class="admin-denied">
          <div class="denied-icon"><i class="fa-solid fa-lock"></i></div>
          <h1>Akses ditolak</h1>
          <p>Akun login belum memiliki hak administrator.</p>
          <a href="../index.html" class="btn primary"><i class="fa-solid fa-arrow-left"></i> Kembali</a>
        </main>`;
      return false;
    }

    guardPassed = true;
    return true;
  }

  async function loadControls() {
    const { data, error } = await sb.rpc('get_public_site_settings');
    if (error) throw error;

    const settings = data || {};
    controls = {
      forum_chat: {
        enabled: true,
        reason: '',
        ...(settings.forum_chat || {})
      },
      withdrawal_instant: {
        enabled: true,
        reason: '',
        ...(settings.withdrawal_instant || {})
      },
      withdrawal_manual: {
        enabled: true,
        reason: '',
        ...(settings.withdrawal_manual || {})
      }
    };

    Object.keys(controls).forEach((key) => {
      controls[key].enabled = normalizeBool(controls[key].enabled);
      controls[key].reason = String(controls[key].reason || '');
    });

    renderControls();
  }

  function renderControls() {
    const map = {
      forum_chat: ['forum', 'Forum Chat'],
      withdrawal_instant: ['instant', 'WD Instan'],
      withdrawal_manual: ['manual', 'WD Manual']
    };

    Object.entries(map).forEach(([key, [id, label]]) => {
      const c = controls[key] || { enabled: true, reason: '' };

      const badge = $('#' + id + 'Badge');
      const btn = $('#' + id + 'Toggle');
      const text = $('#' + id + 'StatusText');
      const wrap = $('#' + id + 'ReasonWrap');
      const reason = $('#' + id + 'Reason');

      if (badge) {
        badge.textContent = c.enabled ? 'AKTIF' : 'DITUTUP';
        badge.className = 'control-status ' + (c.enabled ? 'on' : 'off');
      }

      if (btn) {
        btn.textContent = c.enabled ? 'Tutup ' + label : 'Buka ' + label;
        btn.className = 'btn control-toggle ' + (c.enabled ? 'danger' : 'success');
        btn.disabled = false;
      }

      if (text) {
        text.textContent = c.enabled
          ? 'Fitur sedang tersedia untuk pengguna.'
          : (c.reason || 'Fitur sedang ditutup oleh admin.');
      }

      if (reason) reason.value = c.reason || '';
      if (wrap) wrap.classList.toggle('hidden', c.enabled);
    });
  }

  async function toggle(section) {
    if (!guardPassed) return;

    const current = controls[section] || { enabled: true, reason: '' };
    let reason = '';

    if (current.enabled) {
      const reasonId =
        section === 'forum_chat'
          ? 'forumReason'
          : section === 'withdrawal_instant'
            ? 'instantReason'
            : 'manualReason';

      reason = String($('#' + reasonId)?.value || '').trim();

      if (!reason) {
        toast('Masukkan alasan sebelum menutup fitur.', 'error');
        $('#' + reasonId)?.focus();
        return;
      }
    } else {
      const label =
        section === 'forum_chat'
          ? 'Forum Group Chat'
          : section === 'withdrawal_instant'
            ? 'WD Instan'
            : 'WD Manual';

      if (!confirm('Buka kembali ' + label + '?')) return;
    }

    const btn = $('[data-control="' + section + '"]');
    const oldHtml = btn?.innerHTML || '';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    }

    clearError();

    try {
      // Exact function signature from database.sql:
      // admin_set_platform_control(text, boolean, text)
      const { data, error } = await sb.rpc('admin_set_platform_control', {
        p_section: section,
        p_enabled: !current.enabled,
        p_reason: reason
      });

      if (error) throw error;

      controls[section] = {
        enabled: normalizeBool(data?.enabled),
        reason: String(data?.reason || '')
      };

      renderControls();
      toast(current.enabled ? 'Fitur berhasil ditutup.' : 'Fitur berhasil dibuka.');
    } catch (error) {
      console.error('[PasTele Admin] admin_set_platform_control:', error);
      showError(error?.message || 'Gagal menyimpan pengaturan.');
      toast('Perubahan gagal disimpan.', 'error');

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
    }
  }

  async function stats() {
    // Exact RPC from database.sql. It returns SETOF jsonb, hence data[0].
    const { data, error } = await sb.rpc('admin_stats');
    if (error) throw error;

    const row = Array.isArray(data) ? (data[0] || {}) : (data || {});

    const cards = [
      ['fa-users', 'Users', row.total_users ?? row.users ?? 0],
      ['fa-box', 'Products', row.total_products ?? row.products ?? 0],
      ['fa-receipt', 'Paid Orders', row.paid_orders ?? 0],
      ['fa-money-bill-transfer', 'Pending WD', row.pending_withdrawals ?? 0],
      ['fa-eye', 'Views', row.views ?? 0],
      ['fa-coins', 'Gross Sales', money(row.gross_sales ?? row.sales ?? 0)]
    ];

    const grid = $('#statsGrid');
    if (!grid) return;

    grid.innerHTML = cards.map(([icon, label, value]) => `
      <div class="admin-stat">
        <span class="stat-icon"><i class="fa-solid ${icon}"></i></span>
        <div>
          <small>${esc(label)}</small>
          <strong>${esc(value)}</strong>
        </div>
      </div>
    `).join('');
  }

  async function load() {
    clearError();

    try {
      await Promise.all([loadControls(), stats()]);
    } catch (error) {
      console.error('[PasTele Admin] load:', error);
      showError(error?.message || 'Gagal memuat data admin.');
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-control]');
    if (button) toggle(button.dataset.control);
  });

  $('#refreshAll')?.addEventListener('click', async () => {
    const button = $('#refreshAll');
    if (button) {
      button.disabled = true;
      button.classList.add('is-loading');
    }

    try {
      if (await guard()) await load();
    } finally {
      if (button) {
        button.disabled = false;
        button.classList.remove('is-loading');
      }
    }
  });

  (async () => {
    try {
      if (await guard()) await load();
    } catch (error) {
      console.error('[PasTele Admin] boot:', error);
      showError(error?.message || 'Gagal menjalankan Admin Control Center.');
    }
  })();
})();
