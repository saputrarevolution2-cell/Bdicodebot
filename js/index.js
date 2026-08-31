document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);

  function esc(value) {
    if (window.TC?.esc) return TC.esc(value);
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function money(value) {
    if (window.TC?.money) return TC.money(value);
    return value ? `Rp ${Number(value).toLocaleString('id-ID')}` : 'FREE';
  }

  function empty(message) {
    return `<div class="card landing-empty">${esc(message)}</div>`;
  }

  async function market() {
    const box = $('market');
    if (!box) return;

    if (typeof sb === 'undefined' || !sb) {
      box.innerHTML = empty('Marketplace siap. Hubungkan database untuk menampilkan produk secara live.');
      return;
    }

    try {
      const { data, error } = await sb
        .from('marketplace_public')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) throw error;

      const items = data || [];
      const icon = type => ({
        code: 'fa-code',
        channel: 'fa-broadcast-tower',
        group: 'fa-users',
        link: 'fa-link',
        payment: 'fa-credit-card'
      }[String(type || '').toLowerCase()] || 'fa-cube');

      box.innerHTML = items.slice(0, 8).map(x => `
        <a class="card product" href="product.html?id=${encodeURIComponent(x.id || '')}&type=${encodeURIComponent(x.type || '')}">
          <div class="thumb"><i class="fa-solid ${icon(x.type)}"></i></div>
          <div class="pbody">
            <span class="pill">${esc(x.access_type || 'free').toUpperCase()}</span>
            <h3>${esc(x.title || 'Untitled')}</h3>
            <div class="meta">
              <span class="muted">${esc(x.category || 'General')}</span>
              <span class="price">${x.price ? money(x.price) : 'FREE'}</span>
            </div>
          </div>
        </a>
      `).join('') || empty('Belum ada produk publik dari member.');

      const sets = [
        ['topLink', ['link', 'paste', 'pastelink', 'payment']],
        ['topCode', ['code']],
        ['topChannel', ['channel']]
      ];

      for (const [target, types] of sets) {
        const node = $(target);
        if (!node) continue;

        const arr = items
          .filter(x => types.includes(String(x.type || '').toLowerCase()))
          .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
          .slice(0, 10);

        node.innerHTML = arr.map((x, i) => `
          <div class="topitem">
            <span class="rank">#${i + 1}</span>
            <span>
              <b>${esc(x.title || 'Untitled')}</b>
              <small>${Number(x.views || 0).toLocaleString('id-ID')} views · ${x.price ? money(x.price) : 'FREE'}</small>
            </span>
          </div>
        `).join('') || '<div class="muted">Belum ada data.</div>';
      }
    } catch (error) {
      console.error('[PasTele] Marketplace:', error);
      box.innerHTML = empty('Marketplace belum dapat memuat data saat ini.');
    }
  }

  market();
});
