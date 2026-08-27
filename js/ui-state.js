/* TeleCod UI state — persistent language + light/dark theme. */
(()=> {
  const LANG="telecod_lang", THEME="telecod_theme";
  const getLang=()=>localStorage.getItem(LANG)==="en"?"en":"id";
  const getTheme=()=>localStorage.getItem(THEME)==="light"?"light":"dark";
  function applyTheme(){
    const t=getTheme();
    document.documentElement.dataset.theme=t;
    document.documentElement.classList.toggle("light",t==="light");
    document.documentElement.classList.toggle("dark",t==="dark");
    document.body?.classList.toggle("light",t==="light");
    document.body?.classList.toggle("dark",t==="dark");
  }
  window.TeleCodUI=Object.assign(window.TeleCodUI||{},{
    getLang,lang:getLang,getTheme,
    setLang(v){localStorage.setItem(LANG,v==="en"?"en":"id");document.documentElement.lang=getLang();applyTheme();window.dispatchEvent(new CustomEvent("telecod:language",{detail:{lang:getLang()}}));},
    setTheme(v){localStorage.setItem(THEME,v==="light"?"light":"dark");applyTheme();window.dispatchEvent(new CustomEvent("telecod:theme",{detail:{theme:getTheme()}}));},
    toggleTheme(){this.setTheme(getTheme()==="light"?"dark":"light")},
    applyTheme
  });
  applyTheme();
})();