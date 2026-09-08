/* PasTele — automatic theme: follows system by default, remembers manual choice */
(() => {
  "use strict";
  const KEY = "pastele-theme";
  const root = document.documentElement;

  const apply = (mode) => {
    if (mode === "light" || mode === "dark") root.dataset.theme = mode;
    else delete root.dataset.theme;
    root.dataset.themeMode = mode || "system";
  };

  const saved = localStorage.getItem(KEY) || "system";
  apply(saved);

  const system = window.matchMedia?.("(prefers-color-scheme: dark)");
  system?.addEventListener?.("change", () => {
    if ((localStorage.getItem(KEY) || "system") === "system") apply("system");
  });

  window.PasTeleTheme = {
    get: () => localStorage.getItem(KEY) || "system",
    set: (mode) => {
      mode = ["system","light","dark"].includes(mode) ? mode : "system";
      localStorage.setItem(KEY, mode);
      apply(mode);
      window.dispatchEvent(new CustomEvent("pastele-theme-change", {detail:{mode}}));
    },
    cycle: () => {
      const order = ["system","light","dark"];
      const cur = window.PasTeleTheme.get();
      window.PasTeleTheme.set(order[(order.indexOf(cur)+1)%order.length]);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
      btn.addEventListener("click", () => window.PasTeleTheme.cycle());
    });
  });
})();
