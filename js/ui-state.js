/* Shared language/theme state */
window.TeleCodUI = {
  getLang() { return localStorage.getItem("lang") || "id"; },
  setLang(lang) { localStorage.setItem("lang", lang === "en" ? "en" : "id"); window.location.reload(); },
  getTheme() { return localStorage.getItem("theme") || "light"; },
  setTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    localStorage.setItem("theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
    document.body?.classList.toggle("dark", t === "dark");
  },
  init() {
    this.setTheme(this.getTheme());
    document.documentElement.dataset.lang = this.getLang();
  }
};
document.addEventListener("DOMContentLoaded", () => window.TeleCodUI.init());
