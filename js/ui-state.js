/* TeleCod unified theme/language state. Compatible with app.js and telecod-ui.js. */
(()=> {
  const KEY_LANG="telecod_lang", KEY_THEME="telecod_theme";
  const getLang=()=>localStorage.getItem(KEY_LANG)==="en"?"en":"id";
  const getTheme=()=>localStorage.getItem(KEY_THEME)==="dark"?"dark":"light";
  function applyTheme(){
    const t=getTheme(), root=document.documentElement;
    root.dataset.theme=t;
    root.classList.toggle("dark",t==="dark");
    root.classList.toggle("light",t==="light");
    if(document.body){document.body.classList.toggle("dark",t==="dark");document.body.classList.toggle("light",t==="light");}
  }
  window.TeleCodUI=Object.assign(window.TeleCodUI||{},{
    getLang,setLang(v){localStorage.setItem(KEY_LANG,v==="en"?"en":"id");location.reload();},
    getTheme,setTheme(v){localStorage.setItem(KEY_THEME,v==="dark"?"dark":"light");applyTheme();},
    lang:getLang,theme:getTheme
  });
  applyTheme();
})();