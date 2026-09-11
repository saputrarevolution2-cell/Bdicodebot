/* PasTele — no-flash automatic theme preload */
(() => {
  try {
    const k='pastele-theme', m=localStorage.getItem(k)||'auto';
    const h=new Date().getHours();
    const d=m==='dark'||(m==='auto'?(h>=18||h<6):(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches));
    const r=document.documentElement;
    r.dataset.theme=d?'dark':'light'; r.dataset.themeMode=m; r.style.colorScheme=d?'dark':'light';
    r.classList.add(d?'theme-dark':'theme-light');
  } catch(e) {}
})();
