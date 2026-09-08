/* PasTele compatibility shell.
   Legacy admin pages may load this file; it delegates to the canonical footer. */
(() => {
  'use strict';
  if (document.querySelector('script[src*="footer.js"]')) return;
  const base = location.pathname.includes('/admin/') ? '../' : '';
  const script = document.createElement('script');
  script.src = `${base}js/footer.js?v=20260908`;
  script.defer = true;
  document.head.appendChild(script);
})();
