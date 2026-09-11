/* PasTele — Unified automatic theme manager.
   Default: AUTO (06:00–17:59 light, 18:00–05:59 dark).
   Manual modes remain available from Settings: auto, light, dark, system.
*/
(() => {
  'use strict';
  const root = document.documentElement;
  const KEY = 'pastele-theme';
  const resolve = mode => {
    if (mode === 'light' || mode === 'dark') return mode;
    if (mode === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const h = new Date().getHours();
    return h >= 18 || h < 6 ? 'dark' : 'light';
  };
  const apply = (mode = localStorage.getItem(KEY) || 'auto') => {
    if (!['auto','light','dark','system'].includes(mode)) mode = 'auto';
    const theme = resolve(mode);
    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    root.classList.toggle('theme-dark', theme === 'dark');
    root.classList.toggle('theme-light', theme === 'light');
    root.style.colorScheme = theme;
    document.body?.classList.toggle('theme-dark', theme === 'dark');
    document.body?.classList.toggle('theme-light', theme === 'light');
    document.querySelectorAll('[data-theme-option]').forEach(btn => {
      const active = btn.dataset.themeOption === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    window.dispatchEvent(new CustomEvent('pastele-theme-change', { detail: { mode, theme } }));
    return theme;
  };
  window.PasTeleTheme = {
    get: () => localStorage.getItem(KEY) || 'auto',
    resolved: () => resolve(localStorage.getItem(KEY) || 'auto'),
    set: mode => { localStorage.setItem(KEY, mode); return apply(mode); },
    cycle: () => {
      const modes = ['auto','light','dark'];
      const current = modes.indexOf(localStorage.getItem(KEY) || 'auto');
      const next = modes[(current + 1) % modes.length];
      localStorage.setItem(KEY, next);
      return apply(next);
    },
    apply
  };
  apply();
  window.setInterval(() => {
    const mode = localStorage.getItem(KEY) || 'auto';
    if (mode === 'auto') apply('auto');
  }, 60 * 1000);
  window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change', () => {
    if ((localStorage.getItem(KEY) || 'auto') === 'system') apply('system');
  });
})();
