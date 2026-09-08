/* PasTele — UNIVERSAL AUTOMATIC DAY/NIGHT THEME
   06:00–17:59 => LIGHT
   18:00–05:59 => DARK
*/
(() => {
  'use strict';

  const root = document.documentElement;
  const NIGHT_START = 18;
  const DAY_START = 6;

  const getAutoTheme = () => {
    const hour = new Date().getHours();
    return (hour >= DAY_START && hour < NIGHT_START) ? 'light' : 'dark';
  };

  const apply = () => {
    const theme = getAutoTheme();

    root.dataset.theme = theme;
    root.classList.toggle('theme-dark', theme === 'dark');
    root.classList.toggle('theme-light', theme === 'light');
    root.style.colorScheme = theme;

    if (document.body) {
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme === 'light');
    }

    window.dispatchEvent(new CustomEvent('pastele-theme-change', {
      detail: { mode: 'auto', theme }
    }));

    return theme;
  };

  // Always automatic. Clear old manual/system preference so it cannot override.
  try { localStorage.removeItem('pastele-theme'); } catch (_) {}

  apply();

  // Re-check at every minute so an already-open page switches at 18:00 / 06:00.
  const tick = () => apply();
  window.setInterval(tick, 60 * 1000);

  // Public API retained for compatibility with existing code.
  window.PasTeleTheme = {
    get: () => 'auto',
    resolved: getAutoTheme,
    set: () => apply(),
    cycle: () => apply(),
    apply
  };
})();
