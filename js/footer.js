/* =========================================================
   PasTele — Global Footer
   Clean • Minimal • Responsive • ONE FOOTER
   ========================================================= */
(() => {
  'use strict';
  function mountFooter() {
    /* Remove every existing footer */
    document.querySelectorAll('footer').forEach(el => el.remove());
    /* Prevent duplicate */
    if (document.getElementById('pasteleFooter')) return;
    const isAdmin = location.pathname.includes('/admin/');
    const base = isAdmin ? '../' : '';
    const footer = document.createElement('footer');
    footer.id = 'pasteleFooter';
    footer.className = 'pastele-footer';
    footer.innerHTML = `
      <div class="container footer-inner">
        <div class="footer-main">
          <!-- Brand -->
          <div class="footer-brand">
            <a
              href="${base}index.html"
              class="footer-logo"
              aria-label="PasTele"
            >
              <span class="footer-logo-icon">
                <i class="fa-solid fa-bolt"></i>
              </span>
              <span>PasTele</span>
            </a>
            <p>
              Platform digital untuk publish, discover,
              share, dan monetize Link, Code, Channel
              & Group Telegram.
            </p>
          </div>
          <!-- Navigation -->
          <nav class="footer-nav" aria-label="Footer navigation">
            <div class="footer-nav-group">
              <strong>Platform</strong>
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
            <div class="footer-nav-group">
              <strong>Akun</strong>
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
            <div class="footer-nav-group">
              <strong>Bantuan</strong>
              <a href="${base}notifications.html">
                <i class="fa-solid fa-bell"></i>
                Notifikasi
              </a>
              <a href="${base}setup.html">
                <i class="fa-solid fa-circle-question"></i>
                Bantuan
              </a>
              <button
                type="button"
                data-footer-logout
              >
                <i class="fa-solid fa-right-from-bracket"></i>
                Log out
              </button>
            </div>
          </nav>
        </div>
        <!-- Bottom -->
        <div class="footer-bottom">
          <span>
            © 2026 PasTele. All rights reserved.
          </span>
          <span class="footer-secure">
            <i class="fa-solid fa-shield-halved"></i>
            Secure platform
          </span>
        </div>
      </div>
    `;
    document.body.appendChild(footer);
    /* Logout */
    const logout =
      footer.querySelector('[data-footer-logout]');
    if (logout) {
      logout.addEventListener('click', async () => {
        try {
          if (
            window.Auth &&
            typeof window.Auth.logout === 'function'
          ) {
            await window.Auth.logout();
          }
        } catch (error) {
          console.error(
            '[PasTele] Logout:',
            error
          );
          window.TC?.toast?.(
            error?.message || 'Logout gagal.',
            'error'
          );
        }
      });
    }
  }
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
