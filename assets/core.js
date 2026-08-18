
(() => {
  const langKey = "telecod_lang";
  window.TC_LANG = localStorage.getItem(langKey) || "id";
  window.tcSetLang = function(lang){
    window.TC_LANG = lang;
    localStorage.setItem(langKey, lang);
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el=>{
      const key = el.dataset.i18n;
      const value = window.TC_I18N?.[lang]?.[key];
      if(value !== undefined) el.textContent = value;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
      const key = el.dataset.i18nPlaceholder;
      const value = window.TC_I18N?.[lang]?.[key];
      if(value !== undefined) el.placeholder = value;
    });
    const title = document.querySelector("title");
    const titleValue = document.body?.dataset?.[`title${lang === "id" ? "Id" : "En"}`];
    if(titleValue && title) title.textContent = titleValue;
    document.querySelectorAll("[data-lang-label]").forEach(el=>el.textContent=lang==="id"?"ID / EN":"EN / ID");
    window.dispatchEvent(new CustomEvent("telecod:language",{detail:{lang}}));
  };
  window.tcT = function(key, fallback=""){
    return window.TC_I18N?.[window.TC_LANG]?.[key] ?? fallback;
  };
  window.tcEscape = function(value){
    return String(value ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  };
  window.tcMoney = function(value){
    return new Intl.NumberFormat(window.TC_LANG==="id"?"id-ID":"en-US",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value||0));
  };
  window.tcInitUI = function(){
    document.querySelectorAll("[data-lang-toggle]").forEach(btn=>{
      btn.addEventListener("click",()=>tcSetLang(window.TC_LANG==="id"?"en":"id"));
    });
    const menu=document.querySelector("[data-menu]");
    const mobile=document.querySelector("[data-mobile-nav]");
    if(menu && mobile) menu.addEventListener("click",()=>mobile.classList.toggle("open"));
  };
  document.addEventListener("DOMContentLoaded",()=>{
    tcInitUI();
    tcSetLang(window.TC_LANG);
  });
})();
