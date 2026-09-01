/* =========================================================
   PasTele — index.js
   Home / Landing Page
   Marketplace loader only
   Footer is handled by HTML, NOT JavaScript.
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  /* =========================================================
     HELPERS
     ========================================================= */
  function esc(value) {
    if (window.TC?.esc) {
      return TC.esc(value);
    }
    return String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[char]
    );
  }
  function money(value) {
    if (window.TC?.money) {
      return TC.money(value);
    }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
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
  function getTypeIcon(type) {
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
  function getProductUrl(item) {
    const id = encodeURIComponent(item?.id || '');
    const type = encodeURIComponent(item?.type || '');
    return `product.html?id=${id}&type=${type}`;
  }
  /* =========================================================
     MARKETPLACE
     ========================================================= */
  async function loadMarketplace() {
    const marketBox = $('market');
    if (!marketBox) {
      return;
    }
    /* Database unavailable */
    if (
      typeof window.sb === 'undefined' ||
      !window.sb
    ) {
      marketBox.innerHTML = empty(
        'Marketplace siap. Hubungkan database untuk menampilkan produk secara live.'
      );
      return;
    }
    /* Loading state */
    marketBox.innerHTML = `
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
      /* =====================================================
         MAIN MARKETPLACE
         ===================================================== */
      const products = items
        .slice(0, 8)
        .map((item) => {
          const type = String(
            item.type || ''
          ).toLowerCase();
          const accessType = String(
            item.access_type || 'free'
          ).toUpperCase();
          const title = item.title || 'Untitled';
          const category =
            item.category || 'General';
          const isPaid =
            Number(item.price) > 0;
          return `
            <a
              class="card product"
              href="${getProductUrl(item)}"
              aria-label="Lihat ${esc(title)}"
            >
              <div class="thumb">
                <i class="fa-solid ${getTypeIcon(type)}"></i>
              </div>
              <div class="pbody">
                <div class="product-top">
                  <span class="pill">
                    ${esc(accessType)}
                  </span>
                  <span class="product-type">
                    ${esc(type || 'product')}
                  </span>
                </div>
                <h3>
                  ${esc(title)}
                </h3>
                <div class="meta">
                  <span class="muted">
                    <i class="fa-solid fa-layer-group"></i>
                    ${esc(category)}
                  </span>
                  <span class="price">
                    ${
                      isPaid
                        ? money(item.price)
                        : 'FREE'
                    }
                  </span>
                </div>
              </div>
            </a>
          `;
        })
        .join('');
      marketBox.innerHTML =
        products ||
        empty(
          'Belum ada produk publik dari member.'
        );
      /* =====================================================
         TOP PRODUCTS
         ===================================================== */
      const rankings = [
        {
          target: 'topLink',
          types: [
            'link',
            'paste',
            'pastelink',
            'payment'
          ],
          icon: 'fa-link'
        },
        {
          target: 'topCode',
          types: ['code'],
          icon: 'fa-code'
        },
        {
          target: 'topChannel',
          types: ['channel'],
          icon: 'fa-broadcast-tower'
        }
      ];
      rankings.forEach(
        ({
          target,
          types,
          icon
        }) => {
          const node = $(target);
          if (!node) {
            return;
          }
          const ranked = items
            .filter((item) =>
              types.includes(
                String(
                  item.type || ''
                ).toLowerCase()
              )
            )
            .sort(
              (a, b) =>
                Number(b.views || 0) -
                Number(a.views || 0)
            )
            .slice(0, 10);
          if (!ranked.length) {
            node.innerHTML = `
              <div class="top-empty">
                <i class="fa-solid ${icon}"></i>
                <span>Belum ada data.</span>
              </div>
            `;
            return;
          }
          node.innerHTML = ranked
            .map((item, index) => {
              const title =
                item.title ||
                'Untitled';
              const views = Number(
                item.views || 0
              );
              const price =
                Number(item.price) > 0
                  ? money(item.price)
                  : 'FREE';
              return `
                <a
                  class="topitem"
                  href="${getProductUrl(item)}"
                >
                  <span class="rank">
                    #${index + 1}
                  </span>
                  <span class="topitem-icon">
                    <i class="fa-solid ${icon}"></i>
                  </span>
                  <span class="topitem-info">
                    <b>
                      ${esc(title)}
                    </b>
                    <small>
                      ${views.toLocaleString(
                        'id-ID'
                      )}
                      views
                      <span>·</span>
                      ${esc(price)}
                    </small>
                  </span>
                  <i class="fa-solid fa-chevron-right topitem-arrow"></i>
                </a>
              `;
            })
            .join('');
        }
      );
    } catch (error) {
      console.error(
        '[PasTele] Marketplace error:',
        error
      );
      marketBox.innerHTML = empty(
        'Marketplace belum dapat memuat data saat ini.'
      );
      ['topLink', 'topCode', 'topChannel']
        .forEach((id) => {
          const node = $(id);
          if (node) {
            node.innerHTML = `
              <div class="top-empty">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>Data belum tersedia.</span>
              </div>
            `;
          }
        });
    }
  }
  /* =========================================================
     START
     ========================================================= */
  loadMarketplace();
});
