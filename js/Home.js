/* =========================================================
   PasTele — Home.js
   ONLY HOME PAGE LOGIC
   Footer is NOT created here.
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  /* ---------------------------------------------------------
     Helpers
  --------------------------------------------------------- */
  function esc(value) {
    if (window.TC?.esc) {
      return window.TC.esc(value);
    }
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }
  function money(value) {
    if (window.TC?.money) {
      return window.TC.money(value);
    }
    const amount = Number(value || 0);
    if (!amount) {
      return 'FREE';
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
  function empty(message) {
    return `
      <div class="card landing-empty">
        <i class="fa-solid fa-box-open"></i>
        <span>${esc(message)}</span>
      </div>
    `;
  }
  /* ---------------------------------------------------------
     Product icon
  --------------------------------------------------------- */
  function getProductIcon(type) {
    const icons = {
      code: 'fa-code',
      channel: 'fa-broadcast-tower',
      group: 'fa-users',
      link: 'fa-link',
      paste: 'fa-file-lines',
      pastelink: 'fa-file-lines',
      payment: 'fa-credit-card'
    };
    return icons[String(type || '').toLowerCase()] || 'fa-cube';
  }
  /* ---------------------------------------------------------
     Render marketplace
  --------------------------------------------------------- */
  async function loadMarketplace() {
    const box = $('market');
    if (!box) {
      return;
    }
    /* Prevent duplicate initialization */
    if (box.dataset.loaded === 'true') {
      return;
    }
    box.dataset.loaded = 'loading';
    /* Supabase not available */
    if (typeof window.sb === 'undefined' || !window.sb) {
      box.innerHTML = empty(
        'Marketplace siap. Hubungkan database untuk menampilkan produk secara live.'
      );
      box.dataset.loaded = 'true';
      return;
    }
    try {
      const { data, error } = await window.sb
        .from('marketplace_public')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) {
        throw error;
      }
      const items = Array.isArray(data) ? data : [];
      /* -----------------------------------------------------
         Marketplace cards
      ----------------------------------------------------- */
      const products = items.slice(0, 8);
      if (!products.length) {
        box.innerHTML = empty(
          'Belum ada produk publik dari member.'
        );
      } else {
        box.innerHTML = products.map(item => {
          const id = encodeURIComponent(item.id || '');
          const type = encodeURIComponent(item.type || '');
          const title = esc(
            item.title || 'Untitled'
          );
          const category = esc(
            item.category || 'General'
          );
          const access = esc(
            String(item.access_type || 'free').toUpperCase()
          );
          const price = item.price
            ? money(item.price)
            : 'FREE';
          return `
            <a
              class="card product"
              href="product.html?id=${id}&type=${type}"
              aria-label="Buka ${title}"
            >
              <div class="thumb">
                <i class="fa-solid ${getProductIcon(item.type)}"></i>
              </div>
              <div class="pbody">
                <span class="pill">
                  ${access}
                </span>
                <h3>
                  ${title}
                </h3>
                <div class="meta">
                  <span class="muted">
                    ${category}
                  </span>
                  <span class="price">
                    ${price}
                  </span>
                </div>
              </div>
            </a>
          `;
        }).join('');
      }
      /* -----------------------------------------------------
         Ranking sections
      ----------------------------------------------------- */
      const rankings = [
        {
          target: 'topLink',
          types: [
            'link',
            'paste',
            'pastelink',
            'payment'
          ]
        },
        {
          target: 'topCode',
          types: [
            'code'
          ]
        },
        {
          target: 'topChannel',
          types: [
            'channel'
          ]
        }
      ];
      rankings.forEach(({ target, types }) => {
        const node = $(target);
        if (!node) {
          return;
        }
        const ranking = items
          .filter(item =>
            types.includes(
              String(item.type || '').toLowerCase()
            )
          )
          .sort(
            (a, b) =>
              Number(b.views || 0) -
              Number(a.views || 0)
          )
          .slice(0, 10);
        if (!ranking.length) {
          node.innerHTML = `
            <div class="muted top-empty">
              <i class="fa-solid fa-chart-simple"></i>
              Belum ada data.
            </div>
          `;
          return;
        }
        node.innerHTML = ranking.map((item, index) => {
          const title = esc(
            item.title || 'Untitled'
          );
          const views = Number(
            item.views || 0
          ).toLocaleString('id-ID');
          const price = item.price
            ? money(item.price)
            : 'FREE';
          return `
            <div class="topitem">
              <span class="rank">
                #${index + 1}
              </span>
              <span class="topitem-info">
                <b>
                  ${title}
                </b>
                <small>
                  ${views} views · ${price}
                </small>
              </span>
            </div>
          `;
        }).join('');
      });
      box.dataset.loaded = 'true';
    } catch (error) {
      console.error(
        '[PasTele] Home marketplace:',
        error
      );
      box.innerHTML = empty(
        'Marketplace belum dapat memuat data saat ini.'
      );
      box.dataset.loaded = 'error';
    }
  }
  /* ---------------------------------------------------------
     Remove accidental duplicate FOOTERS
     
     IMPORTANT:
     This does NOT create a footer.
     It only protects Home from legacy duplicate footer
     elements created by old scripts.
  --------------------------------------------------------- */
  function removeDuplicateFooters() {
    const footers = [
      ...document.querySelectorAll('footer')
    ];
    if (footers.length <= 1) {
      return;
    }
    /*
      Keep an existing canonical footer if it exists.
      Otherwise keep the first footer in the document.
    */
    const canonical =
      document.getElementById('pasteleFooter') ||
      footers[0];
    footers.forEach(footer => {
      if (footer !== canonical) {
        footer.remove();
      }
    });
  }
  /* ---------------------------------------------------------
     Home initialization
  --------------------------------------------------------- */
  await loadMarketplace();
  /*
    Run once after other DOMContentLoaded handlers,
    allowing legacy footer scripts to finish first.
  */
  setTimeout(() => {
    removeDuplicateFooters();
  }, 0);
});
