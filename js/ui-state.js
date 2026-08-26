/* TeleCod unified UI state — fixed Telegram neon theme. */
(()=> {
 const KEY_LANG="telecod_lang";
 const getLang=()=>localStorage.getItem(KEY_LANG)==="en"?"en":"id";
 const applyTheme=()=>{
   document.documentElement.dataset.theme="dark";
   document.documentElement.classList.remove("light");
   document.documentElement.classList.add("dark");
   document.body?.classList.remove("light");
   document.body?.classList.add("dark");
 };
 window.TeleCodUI=Object.assign(window.TeleCodUI||{}, {
   getLang,
   setLang(v){localStorage.setItem(KEY_LANG,v==="en"?"en":"id");location.reload();},
   applyTheme
 });
 applyTheme();
})();
