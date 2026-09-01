'use strict';

/* =========================================================
   PasTele — Home.js
   Home / Landing Page Controller
   ---------------------------------------------------------
   Responsibility:
   - Load public marketplace
   - Render product cards
   - Render Top Link / Code / Channel
   - Handle loading & error state
   - NO FOOTER GENERATOR
   - NO DUPLICATE PAGE SHELL
   ========================================================= */

(() => {

  /* -------------------------------------------------------
     DOM helper
     ------------------------------------------------------- */

  const $ = (id) => document.getElementById(id);


  /* -------------------------------------------------------
     Escape HTML
     ------------------------------------------------------- */

  function esc(value) {

    if (window.TC?.esc) {
      return window.TC.esc(value);
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


  /* -------------------------------------------------------
     Currency
     ------------------------------------------------------- */

  function money(value) {

    if (window.TC?.money) {
      return window.TC.money(value);
    }

    const amount = Number(value || 0);

    if (amount <= 0) {
      return 'FREE';
    }

    return `Rp ${amount.toLocaleString('id-ID')}`;
  }


  /* -------------------------------------------------------
     Type helper
     ------------------------------------------------------- */

  function typeOf(item) {
    return String(item?.type || '')
      .trim()
      .toLowerCase();
  }


  /* -------------------------------------------------------
     Icon helper
     ------------------------------------------------------- */

  function iconFor(type) {

    const icons = {
      code: 'fa-code',
      channel: 'fa-tower-broadcast',
      group: 'fa-users',
      link: 'fa-link',
      payment: 'fa-credit-card',
      paste: 'fa-file-lines',
      pastelink: 'fa-link'
    };

    return icons[type] || 'fa-cube';
  }


  /* -------------------------------------------------------
     Empty state
     ------------------------------------------------------- */

  function empty(message) {

    return `
      <div class="landing-empty">
        <div class="landing-empty-icon">
          <i class="fa-solid fa-box-open"></i>
        </div>

        <div class="landing-empty-content">
          <strong>Belum ada produk</strong>
          <span>${esc(message)}</span>
        </div>
      </div>
    `;
  }


  /* -------------------------------------------------------
     Loading state
     ------------------------------------------------------- */

  function loading() {

    return `
      <div class="market-loading">
        <div class="loading-spinner">
          <i class="fa-solid fa-spinner fa-spin"></i>
        </div>

        <span>Memuat marketplace...</span>
      </div>
    `;
  }


  /* -------------------------------------------------------
     Render marketplace
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

    box.innerHTML = items
      .slice(0, 8)
      .map((item) => {

        const type = typeOf(item);

        const id = encodeURIComponent(
          item.id || ''
        );

        const itemType = encodeURIComponent(
          item.type || ''
        );

        const title =
          item.title ||
          'Untitled';

        const category =
          item.category ||
          'General';

        const access =
          String(
            item.access_type || 'free'
          ).toUpperCase();

        const price =
          Number(item.price || 0);

        const views =
          Number(item.views || 0);

        return `
          <a
            class="card product"
            href="product.html?id=${id}&type=${itemType}"
            aria-label="${esc(title)}"
          >

            <div class="thumb">
              <i class="fa-solid ${iconFor(type)}"></i>
            </div>

            <div class="pbody">

              <span class="pill">
                ${esc(access)}
              </span>

              <h3>
                ${esc(title)}
              </h3>

              <div class="meta">

                <span class="muted">
                  ${esc(category)}
                </span>

                <span class="price">
                  ${
                    price > 0
                      ? money(price)
                      : 'FREE'
                  }
                </span>

              </div>

              <div class="product-views">
                <i class="fa-solid fa-eye"></i>
                ${views.toLocaleString('id-ID')}
              </div>

            </div>

          </a>
        `;
      })
      .join('');
  }


  /* -------------------------------------------------------
     Render ranking
     ------------------------------------------------------- */

  function renderRanking(
    targetId,
    items,
    allowedTypes
  ) {

    const node = $(targetId);

    if (!node) {
      return;
    }

    const ranking = items
      .filter((item) => {
        return allowedTypes.includes(
          typeOf(item)
        );
      })
      .sort((a, b) => {
        return (
          Number(b.views || 0) -
          Number(a.views || 0)
        );
      })
      .slice(0, 10);

    if (!ranking.length) {

      node.innerHTML = `
        <div class="ranking-empty muted">
          <i class="fa-solid fa-chart-simple"></i>
          <span>Belum ada data.</span>
        </div>
      `;

      return;
    }

    node.innerHTML = ranking
      .map((item, index) => {

        const title =
          item.title ||
          'Untitled';

        const views =
          Number(item.views || 0)
            .toLocaleString('id-ID');

        const price =
          Number(item.price || 0);

        return `
          <div class="topitem">

            <span class="rank">
              #${index + 1}
            </span>

            <span class="topitem-content">

              <b>
                ${esc(title)}
              </b>

              <small>
                <i class="fa-solid fa-eye"></i>
                ${views} views
                <span class="ranking-separator">·</span>
                ${
                  price > 0
                    ? money(price)
                    : 'FREE'
                }
              </small>

            </span>

          </div>
        `;
      })
      .join('');
  }


  /* -------------------------------------------------------
     Render all rankings
     ------------------------------------------------------- */

  function renderRankings(items) {

    renderRanking(
      'topLink',
      items,
      [
        'link',
        'paste',
        'pastelink',
        'payment'
      ]
    );

    renderRanking(
      'topCode',
      items,
      [
        'code'
      ]
    );

    renderRanking(
      'topChannel',
      items,
      [
        'channel'
      ]
    );
  }


  /* -------------------------------------------------------
     Ranking fallback
     ------------------------------------------------------- */

  function renderRankingFallback() {

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
        <div class="ranking-empty muted">
          <i class="fa-solid fa-chart-simple"></i>
          <span>Data belum tersedia.</span>
        </div>
      `;
    });
  }


  /* -------------------------------------------------------
     Load marketplace
     ------------------------------------------------------- */

  async function loadMarketplace() {

    const box = $('market');

    if (!box) {
      return;
    }

    /* Loading */
    box.innerHTML = loading();


    /* Supabase check */

    if (
      typeof window.sb === 'undefined' ||
      !window.sb
    ) {

      box.innerHTML = empty(
        'Marketplace siap. Hubungkan database untuk menampilkan produk secara live.'
      );

      renderRankingFallback();

      return;
    }


    try {

      const {
        data,
        error
      } = await window.sb
        .from('marketplace_public')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(60);


      if (error) {
        throw error;
      }


      const items =
        Array.isArray(data)
          ? data
          : [];


      renderMarketplace(items);
      renderRankings(items);


    } catch (error) {

      console.error(
        '[PasTele] Home marketplace error:',
        error
      );


      box.innerHTML = empty(
        'Marketplace belum dapat memuat data saat ini.'
      );

      renderRankingFallback();
    }
  }


  /* -------------------------------------------------------
     Prevent duplicate Home initialization
     ------------------------------------------------------- */

  if (
    window.__PASTELE_HOME_INITIALIZED__
  ) {
    return;
  }

  window.__PASTELE_HOME_INITIALIZED__ = true;


  /* -------------------------------------------------------
     Init
     ------------------------------------------------------- */

  function init() {
    loadMarketplace();
  }


  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }

})();
