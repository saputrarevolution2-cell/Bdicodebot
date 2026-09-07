/* PasTele — prevent theme flash before page CSS paints. */
(() => {
  try {
    const saved = localStorage.getItem('pastele-theme');
    const systemTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = saved === 'dark' || saved === 'light' ? saved : systemTheme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();
