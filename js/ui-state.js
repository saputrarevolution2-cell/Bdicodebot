/* TeleCod unified UI state — theme + language */
(()=> {
 const KEY_LANG="telecod_lang", KEY_THEME="telecod_theme";
 const getLang=()=>localStorage.getItem(KEY_LANG)==="en"?"en":"id";
 const getTheme=()=>localStorage.getItem(KEY_THEME)==="light"?"light":"dark";
 const applyTheme=()=>{
   const t=getTheme(), root=document.documentElement;
   root.dataset.theme=t; root.classList.toggle("light",t==="light"); root.classList.toggle("dark",t!=="light");
   document.body?.classList.toggle("light",t==="light"); document.body?.classList.toggle("dark",t!=="light");
   document.querySelectorAll("[data-theme-icon]").forEach(e=>e.textContent=t==="light"?"☀️":"🌙");
 };
 const toggleTheme=()=>{localStorage.setItem(KEY_THEME,getTheme()==="light"?"dark":"light");applyTheme();};
 window.TeleCodUI=Object.assign(window.TeleCodUI||{},{
   getLang,lang:getLang,getTheme,applyTheme,toggleTheme,
   setLang(v){localStorage.setItem(KEY_LANG,v==="en"?"en":"id");location.reload();}
 });
 applyTheme();
 document.addEventListener("DOMContentLoaded",applyTheme);
})();