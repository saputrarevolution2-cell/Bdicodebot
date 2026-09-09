/* PasTele — Theme Preload: prevents flash and respects saved Light/Dark/System. */
(() => {
  try {
    const key = 'pastele-theme';
    const saved = localStorage.getItem(key) || 'system';
    const dark = saved === 'dark' || (saved === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const theme = dark ? 'dark' : 'light';
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.themeMode = saved;
    root.classList.remove('theme-light','theme-dark');
    root.classList.add(`theme-${theme}`);
    root.style.colorScheme = theme;
  } catch (_) {}
})();
