/* =========================================================
   PasTele — footer.js
   GLOBAL FOOTER • CLEAN • HORIZONTAL • ONE ONLY
   ========================================================= */
(() => {
  'use strict';
  function mountFooter() {
    // Hapus semua footer lama
    document.querySelectorAll('footer').forEach(el => el.remove());
    const isAdmin = location.pathname.includes('/admin/');
    const base = isAdmin ? '../' : '';
    const footer = document.createElement('footer');
    footer.id = 'pasteleFooter';
    footer.className = 'pt-footer';
    footer.innerHTML = `
      <div class="pt-footer-wrap">
        <div class="pt-footer-top">
          <div class="pt-footer-brand">
            <a href="${base}index.html" class="pt-footer-logo">
              <span class="pt-footer-logo-icon">
                <i class="fa-solid fa-bolt"></i>
              </span>
              <span>PasTele</span>
            </a>
            <p>
              Platform digital untuk publish, discover, share,
              dan monetize Link, Code, Channel & Group Telegram.
            </p>
            <span class="pt-footer-status">
              <i class="fa-solid fa-circle-check"></i>
              Platform ready
            </span>
          </div>
          <nav class="pt-footer-links">
            <div class="pt-footer-col">
              <h4>
                <i class="fa-solid fa-layer-group"></i>
                Platform
              </h4>
              <a href="${base}index.html">
                <i class="fa-solid fa-house"></i>
                Beranda
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
            <div class="pt-footer-col">
              <h4>
                <i class="fa-solid fa-user"></i>
                Akun
              </h4>
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
            </div>
            <div class="pt-footer-col">
              <h4>
                <i class="fa-solid fa-life-ring"></i>
                Bantuan
              </h4>
              <a href="${base}notifications.html">
                <i class="fa-solid fa-bell"></i>
                Notifikasi
              </a>
              <a href="${base}setup.html">
                <i class="fa-solid fa-circle-question"></i>
                Bantuan
              </a>
              <button type="button" data-footer-logout>
                <i class="fa-solid fa-right-from-bracket"></i>
                Log out
              </button>
            </div>
          </nav>
        </div>
        <div class="pt-footer-bottom">
          <span>© 2026 PasTele. All rights reserved.</span>
          <span>
            <i class="fa-solid fa-shield-halved"></i>
            Secure platform
          </span>
        </div>
      </div>
    `;
    document.body.appendChild(footer);
    const logout = footer.querySelector('[data-footer-logout]');
    logout?.addEventListener('click', async () => {
      try {
        if (window.Auth && typeof Auth.logout === 'function') {
          await Auth.logout();
        }
      } catch (error) {
        console.error('[PasTele] Footer logout:', error);
        window.TC?.toast?.(
          error?.message || 'Logout gagal.',
          'error'
        );
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFooter, {
      once: true
    });
  } else {
    mountFooter();
  }
})();
