/* =========================================================
   PasTele — footer.js
   CANONICAL GLOBAL FOOTER
   ONE FOOTER ONLY
   ========================================================= */
(() => {
  'use strict';
  function mountFooter() {
    /* Remove ALL previous generated/manual duplicate footers */
    const existing = [
      ...document.querySelectorAll('footer')
    ];
    existing.forEach((footer, index) => {
      if (index > 0 || footer.id !== 'pasteleFooter') {
        footer.remove();
      }
    });
    /* If canonical footer already exists, stop */
    if (document.getElementById('pasteleFooter')) {
      return;
    }
    const isAdmin =
      location.pathname.includes('/admin/');
    const base = isAdmin ? '../' : '';
    const footer = document.createElement('footer');
    footer.id = 'pasteleFooter';
    footer.className = 'pastele-footer';
    footer.innerHTML = `
      <div class="container footer-grid">
        <div class="footer-brand-block">
          <a
            class="brand"
            href="${base}index.html"
            aria-label="PasTele Home"
          >
            <span class="brand-mark">
              <i class="fa-solid fa-bolt"></i>
            </span>
            <span>PasTele</span>
          </a>
          <p>
            Publish, discover, share, and monetize
            Telegram links, codes, channels and groups.
          </p>
          <span class="footer-status">
            <i class="fa-solid fa-circle-check"></i>
            Platform ready
          </span>
        </div>
        <div class="footer-column">
          <b>
            <i class="fa-solid fa-layer-group"></i>
            Platform
          </b>
          <a href="${base}index.html">
            <i class="fa-solid fa-house"></i>
            Home
          </a>
          <a href="${base}marketplace.html">
            <i class="fa-solid fa-store"></i>
            Marketplace
          </a>
          <a href="${base}paste.html">
            <i class="fa-solid fa-plus"></i>
            Create
          </a>
        </div>
        <div class="footer-column">
          <b>
            <i class="fa-solid fa-user"></i>
            Account
          </b>
          <a href="${base}dashboard.html">
            <i class="fa-solid fa-gauge-high"></i>
            Dashboard
          </a>
          <a href="${base}profile.html">
            <i class="fa-solid fa-user"></i>
            Profile
          </a>
          <a href="${base}settings.html">
            <i class="fa-solid fa-gear"></i>
            Settings
          </a>
          <button
            type="button"
            data-footer-logout
          >
            <i class="fa-solid fa-right-from-bracket"></i>
            Log out
          </button>
        </div>
        <div class="footer-column">
          <b>
            <i class="fa-solid fa-life-ring"></i>
            Support
          </b>
          <a href="${base}notifications.html">
            <i class="fa-solid fa-bell"></i>
            Notifications
          </a>
          <a href="${base}setup.html">
            <i class="fa-solid fa-circle-question"></i>
            Help & setup
          </a>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>
          © 2026 PasTele. All rights reserved.
        </span>
        <span>
          <i class="fa-solid fa-shield-halved"></i>
          Secure · Responsive · Database driven
        </span>
      </div>
    `;
    document.body.appendChild(footer);
    /* Logout */
    const logout =
      footer.querySelector('[data-footer-logout]');
    if (logout) {
      logout.addEventListener(
        'click',
        async () => {
          try {
            if (
              window.Auth &&
              typeof Auth.logout === 'function'
            ) {
              await Auth.logout();
            }
          } catch (error) {
            console.error(
              '[PasTele] Footer logout:',
              error
            );
            window.TC?.toast?.(
              error.message ||
              'Logout gagal.',
              'error'
            );
          }
        }
      );
    }
  }
  /*
    Wait until DOM exists.
  */
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      mountFooter,
      { once: true }
    );
  } else {
    mountFooter();
  }
})();
