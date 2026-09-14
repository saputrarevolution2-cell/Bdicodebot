/* PasTele — Index page
 * Database source: public.marketplace_public
 * Public URLs:
 *   PasteLink /p/{slug}
 *   Code     /c/f/{slug} or /c/p/{slug}
 *   Channel  /ch/f/{slug} or /ch/p/{slug}
 *   Group    /g/f/{slug} or /g/p/{slug}
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://xczqjqyqvshjzjbxjvpk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjelFqcXlxdnNoanp6amJ4anZwaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0MDAwMDAwLCJleHAiOjIwNTAwMDAwMDB9.placeholder';

  // If the project already exposes a shared client, reuse it.
  const sb = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const state = { items: [], filter: 'all' };

  const nf = new Intl.NumberFormat('id-ID');
  const rupiah = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Number(value) || 0);

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function normalizeType(item) {
    const type = String(item?.type || '').toLowerCase().trim();
    if (type === 'paste' || type === 'pastelink') return 'pastelink';
    if (type === 'code') return 'code';
    if (type === 'channel') return 'channel';
    if (type === 'group') return 'group';
    if (type === 'product') return 'product';
    return 'link';
  }

  function accessType(item) {
    const raw = String(item?.access_type || '').toLowerCase();
    return raw === 'paid' || Number(item?.price) > 0 ? 'paid' : 'free';
  }

  function publicUrl(item) {
    const slug = encodeURIComponent(String(item?.slug || '').trim());
    const type = normalizeType(item);
    const access = accessType(item);

    if (!slug) return '#';
    if (type === 'pastelink') return `/p/${slug}`;
    if (type === 'code') return `/c/${access === 'paid' ? 'p' : 'f'}/${slug}`;
    if (type === 'channel') return `/ch/${access === 'paid' ? 'p' : 'f'}/${slug}`;
    if (type === 'group') return `/g/${access === 'paid' ? 'p' : 'f'}/${slug}`;
    return `/p/${slug}`;
  }

  function typeLabel(type) {
    return ({
      pastelink: 'PasteLink',
      code: 'Code',
      channel: 'Channel',
      group: 'Group',
      product: 'Produk',
      link: 'Link'
    })[type] || 'Konten';
  }

  function setStatus(message = '', error = false) {
    const el = $('#status');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('error', error);
    el.hidden = !message;
  }

  function renderStats() {
    const items = state.items;
    const creators = new Set(items.map(x => x.owner_id).filter(Boolean)).size;
    const views = items.reduce((n, x) => n + (Number(x.views) || 0), 0);
    const sales = items.reduce((n, x) => n + (Number(x.sales_count) || 0), 0);

    $('#statContent').textContent = nf.format(items.length);
    $('#statCreators').textContent = nf.format(creators);
    $('#statViews').textContent = nf.format(views);
    $('#statSales').textContent = nf.format(sales);
  }

  function card(item) {
    const type = normalizeType(item);
    const access = accessType(item);
    const title = escapeHTML(item.title || 'Tanpa judul');
    const description = escapeHTML(item.description || 'Konten tersedia di PasTele.');
    const creator = escapeHTML(item.creator_name || (item.creator_username ? `@${item.creator_username}` : 'Creator PasTele'));
    const category = escapeHTML(item.category || 'General');
    const views = nf.format(Number(item.views) || 0);
    const sales = nf.format(Number(item.sales_count) || 0);
    const price = access === 'paid' ? rupiah(item.price) : 'Gratis';
    const href = publicUrl(item);

    return `
      <article class="content-card">
        <a class="card-link" href="${href}" aria-label="Buka ${title}">
          <div class="card-top">
            <span class="badge type">${typeLabel(type)}</span>
            <span class="badge ${access}">${access === 'paid' ? 'Berbayar' : 'Gratis'}</span>
          </div>
          <div class="card-icon">${type === 'code' ? '</>' : type === 'pastelink' ? '↗' : type === 'channel' ? '◉' : type === 'group' ? '◎' : '◆'}</div>
          <h3>${title}</h3>
          <p>${description}</p>
          <div class="meta"><span>${category}</span><span>${creator}</span></div>
          <div class="card-bottom">
            <span>${price}</span>
            <span>${views} views · ${sales} sales</span>
          </div>
        </a>
      </article>
    `;
  }

  function emptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">⌕</div>
        <h3>Belum ada konten</h3>
        <p>Belum ada konten yang sesuai dengan filter ini.</p>
      </div>
    `;
  }

  function renderMarketplace() {
    const grid = $('#publishedGrid');
    if (!grid) return;

    const filtered = state.filter === 'all'
      ? state.items
      : state.items.filter(x => normalizeType(x) === state.filter);

    grid.innerHTML = filtered.length ? filtered.map(card).join('') : emptyState();
    setStatus('');
  }

  function rankingFor(type) {
    return state.items
      .filter(x => normalizeType(x) === type)
      .slice()
      .sort((a, b) => {
        const scoreA = (Number(a.sales_count) || 0) * 1000 + (Number(a.views) || 0);
        const scoreB = (Number(b.sales_count) || 0) * 1000 + (Number(b.views) || 0);
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }

  function renderRanking(target, type) {
    const el = $(target);
    if (!el) return;
    const rows = rankingFor(type);

    if (!rows.length) {
      el.innerHTML = '<div class="rank-empty">Belum ada data.</div>';
      return;
    }

    el.innerHTML = rows.map((item, i) => `
      <a class="rank-row" href="${publicUrl(item)}">
        <span class="rank-number">${i + 1}</span>
        <span class="rank-main">
          <strong>${escapeHTML(item.title || 'Tanpa judul')}</strong>
          <small>${nf.format(Number(item.views) || 0)} views · ${nf.format(Number(item.sales_count) || 0)} sales</small>
        </span>
        <span class="rank-arrow">›</span>
      </a>
    `).join('');
  }

  function renderRankings() {
    renderRanking('#topLink', 'pastelink');
    renderRanking('#topCode', 'code');
    renderRanking('#topChannel', 'channel');
    renderRanking('#topGroup', 'group');
  }

  async function loadMarketplace() {
    if (!sb) {
      setStatus('Supabase client gagal dimuat.', true);
      return;
    }

    setStatus('Memuat marketplace…');

    const { data, error } = await sb
      .from('marketplace_public')
      .select('id,slug,title,type,access_type,price,thumbnail_url,description,views,sales_count,category,created_at,creator_name,creator_username,owner_id')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[PasTele] marketplace_public:', error);
      setStatus('Marketplace gagal dimuat. Periksa view marketplace_public dan policy Supabase.', true);
      return;
    }

    state.items = Array.isArray(data) ? data : [];
    renderStats();
    renderMarketplace();
    renderRankings();
  }

  function setupFilters() {
    $$('.filter').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter || 'all';
        $$('.filter').forEach(x => {
          const active = x === btn;
          x.classList.toggle('active', active);
          x.setAttribute('aria-selected', String(active));
        });
        renderMarketplace();
      });
    });
  }

  function setupRefresh() {
    $('#refreshBtn')?.addEventListener('click', async () => {
      const btn = $('#refreshBtn');
      btn.disabled = true;
      btn.classList.add('loading');
      try { await loadMarketplace(); }
      finally {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    });
  }

  function setupTheme() {
    try {
      const saved = localStorage.getItem('pastele-theme');
      if (saved === 'dark' || saved === 'light') {
        document.documentElement.dataset.theme = saved;
      }
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupFilters();
    setupRefresh();
    loadMarketplace();
  });
})();
