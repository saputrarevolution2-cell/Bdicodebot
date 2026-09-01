/* =========================================================
   PasTele — index.js
   Marketplace loader only
   Footer handled by the page shell / HTML
   ========================================================= */

(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', async () => {
    const $ = (id) => document.getElementById(id);

    /* -------------------------------------------------------
       Helpers
    ------------------------------------------------------- */

    function esc(value) {
      if (window.TC?.esc) {
        return window.TC.esc(value);
      }

      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
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

    function getIcon(type) {
      const icons = {
        code: 'fa-code',
        channel: 'fa-tower-broadcast',
        group: 'fa-users',
        link: 'fa-link',
        payment: 'fa-credit-card',
        paste: 'fa-file-lines',
        pastelink: 'fa-link'
      };

      return icons[String(type || '').toLowerCase()] || 'fa-cube';
    }

    function normalizeType(type) {
      return String(type || '').trim().toLowerCase();
    }

    /* -------------------------------------------------------
       Marketplace
    ------------------------------------------------------- */

    async function loadMarketplace() {
      const box = $('market');

      if (!box) {
        return;
      }

      /*
       * Supabase belum tersedia
       */
      if (
        typeof window.sb === 'undefined' ||
        !window.sb
      ) {
        box.innerHTML = empty(
          'Marketplace siap. Hubungkan database untuk menampilkan produk secara live.'
        );

        renderEmptyRanking();
        return;
      }

      /*
       * Loading state
       */
      box.innerHTML = `
        <div class="market-loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Memuat marketplace...</span>
        </div>
      `;

      try {
        const { data, error } = await window.sb
          .from('marketplace_public')
          .select('*')
          .order('created_at', {
            ascending: false
          })
          .limit(60);

        if (error) {
          throw error;
        }

        const items = Array.isArray(data)
          ? data
          : [];

        renderMarketplace(items);
        renderRankings(items);

      } catch (error) {
        console.error(
          '[PasTele] Marketplace error:',
          error
        );

        box.innerHTML = empty(
          'Marketplace belum dapat memuat data saat ini.'
        );

        renderEmptyRanking();
      }
    }

    /* -------------------------------------------------------
       Marketplace cards
    ------------------------------------------------------- */

    function renderMarketplace(items) {
      const box = $('market');

      if (!box) {
        return;
      }

      if (!items.length) {
        box.innerHTML = empty(
          'Belum ada produk publik dari member.'
        );

        return;
      }

      const visibleItems = items.slice(0, 8);

      box.innerHTML = visibleItems.map((item) => {
        const type = normalizeType(item.type);
        const title = item.title || 'Untitled';
        const category = item.category || 'General';
        const accessType = String(
          item.access_type || 'free'
        ).toUpperCase();

        const price = Number(item.price || 0);

        const productId = encodeURIComponent(
          item.id || ''
        );

        const productType = encodeURIComponent(
          item.type || ''
        );

        return `
          <a
            class="card product"
            href="product.html?id=${productId}&type=${productType}"
            aria-label="${esc(title)}"
          >
            <div class="thumb">
              <i class="fa-solid ${getIcon(type)}"></i>
            </div>

            <div class="pbody">
              <span class="pill">
                ${esc(accessType)}
              </span>

              <h3>
                ${esc(title)}
              </h3>

              <div class="meta">
                <span class="muted">
                  ${esc(category)}
                </span>

                <span class="price">
                  ${price > 0 ? money(price) : 'FREE'}
                </span>
              </div>
            </div>
          </a>
        `;
      }).join('');
    }

    /* -------------------------------------------------------
       Rankings
    ------------------------------------------------------- */

    function renderRankings(items) {
      const rankingSets = [
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

      rankingSets.forEach((set) => {
        const node = $(set.target);

        if (!node) {
          return;
        }

        const ranked = items
          .filter((item) => {
            return set.types.includes(
              normalizeType(item.type)
            );
          })
          .sort((a, b) => {
            return (
              Number(b.views || 0) -
              Number(a.views || 0)
            );
          })
          .slice(0, 10);

        if (!ranked.length) {
          node.innerHTML = `
            <div class="muted ranking-empty">
              <i class="fa-solid fa-chart-simple"></i>
              Belum ada data.
            </div>
          `;

          return;
        }

        node.innerHTML = ranked.map((item, index) => {
          const views = Number(
            item.views || 0
          ).toLocaleString('id-ID');

          const price = Number(
            item.price || 0
          );

          return `
            <div class="topitem">
              <span class="rank">
                #${index + 1}
              </span>

              <span class="topitem-content">
                <b>
                  ${esc(item.title || 'Untitled')}
                </b>

                <small>
                  ${views} views
                  ·
                  ${price > 0 ? money(price) : 'FREE'}
                </small>
              </span>
            </div>
          `;
        }).join('');
      });
    }

    /* -------------------------------------------------------
       Empty ranking state
    ------------------------------------------------------- */

    function renderEmptyRanking() {
      [
        'topLink',
        'topCode',
        'topChannel'
      ].forEach((id) => {
        const node = $(id);

        if (!node) {
          return;
        }

        node.innerHTML = `
          <div class="muted ranking-empty">
            <i class="fa-solid fa-chart-simple"></i>
            Belum ada data.
          </div>
        `;
      });
    }

    /* -------------------------------------------------------
       Start
    ------------------------------------------------------- */

    await loadMarketplace();
  });

})();
