/* PasTele — AUTO DAY/NIGHT PRELOAD
   Day: 06:00–17:59 = light
   Night: 18:00–05:59 = dark
   No OS theme and no stale saved theme can override this.
*/
(() => {
  try {
    const hour = new Date().getHours();
    const theme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.remove('theme-light','theme-dark');
    root.classList.add(`theme-${theme}`);
    root.style.colorScheme = theme;
  } catch (_) {}
})();
