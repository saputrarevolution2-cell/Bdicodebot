(() => {
  const langKey="telecod_lang";
  const themeKey="telecod_theme";
  window.TC_LANG=localStorage.getItem(langKey)||"id";
  window.TC_THEME=localStorage.getItem(themeKey)||"dark";

  function applyTheme(theme){
    window.TC_THEME=theme;
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    localStorage.setItem(themeKey,theme);
    document.querySelectorAll("[data-theme-toggle]").forEach(btn=>{
      btn.innerHTML=theme==="dark"
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
      btn.title=theme==="dark"?"Light mode":"Dark mode";
      btn.setAttribute("aria-label",btn.title);
    });
  }
  window.tcSetTheme=applyTheme;
  window.tcToggleTheme=()=>applyTheme(window.TC_THEME==="dark"?"light":"dark");

  // Apply immediately so pages never flash into the wrong theme.
  applyTheme(window.TC_THEME);

  window.tcSetLang=function(lang){
    window.TC_LANG=lang;
    localStorage.setItem(langKey,lang);
    document.documentElement.lang=lang;
    document.querySelectorAll("[data-i18n]").forEach(el=>{
      const key=el.dataset.i18n;
      const value=window.TC_I18N?.[lang]?.[key];
      if(value!==undefined)el.textContent=value;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
      const key=el.dataset.i18nPlaceholder;
      const value=window.TC_I18N?.[lang]?.[key];
      if(value!==undefined)el.placeholder=value;
    });
    const title=document.querySelector("title");
    const titleValue=document.body?.dataset?.[`title${lang==="id"?"Id":"En"}`];
    if(titleValue&&title)title.textContent=titleValue;
    document.querySelectorAll("[data-lang-label]").forEach(el=>el.textContent=lang==="id"?"ID / EN":"EN / ID");
    window.dispatchEvent(new CustomEvent("telecod:language",{detail:{lang}}));
  };

  window.tcT=function(key,fallback=""){
    return window.TC_I18N?.[window.TC_LANG]?.[key]??fallback;
  };
  window.tcEscape=function(value){
    return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  };
  window.tcMoney=function(value){
    return new Intl.NumberFormat(window.TC_LANG==="id"?"id-ID":"en-US",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value||0));
  };

  // Turn plain URLs in displayed user content into safe clickable links.
  window.tcLinkify=function(value){
    const source=String(value??"");
    const urlRe=/(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
    let html="",last=0,m;
    while((m=urlRe.exec(source))){
      html+=tcEscape(source.slice(last,m.index));
      let raw=m[0];
      let trailing="";
      while(/[),.!?;:'\]}>]+$/.test(raw)){
        trailing=raw.slice(-1)+trailing;
        raw=raw.slice(0,-1);
      }
      const href=/^www\./i.test(raw)?"https://"+raw:raw;
      html+=`<a class="tc-link" href="${tcEscape(href)}" target="_blank" rel="noopener noreferrer nofollow">${tcEscape(raw)}</a>${tcEscape(trailing)}`;
      last=m.index+m[0].length;
    }
    html+=tcEscape(source.slice(last));
    return html;
  };

  function addThemeButton(){
    if(document.querySelector("[data-theme-toggle]"))return;
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="theme-toggle";
    btn.dataset.themeToggle="";
    btn.addEventListener("click",window.tcToggleTheme);
    const host=document.querySelector(".nav-actions,.auth-top");
    if(host)host.insertBefore(btn,host.firstChild);
    else{
      btn.style.position="fixed";
      btn.style.right="18px";
      btn.style.top="18px";
      btn.style.zIndex="9999";
      document.body.appendChild(btn);
    }
    applyTheme(window.TC_THEME);
  }

  window.tcInitUI=function(){
    addThemeButton();
    document.querySelectorAll("[data-lang-toggle]").forEach(btn=>{
      if(btn.dataset.bound==="1")return;
      btn.dataset.bound="1";
      btn.addEventListener("click",()=>tcSetLang(window.TC_LANG==="id"?"en":"id"));
    });
    const menu=document.querySelector("[data-menu]");
    const mobile=document.querySelector("[data-mobile-nav]");
    if(menu&&mobile&&!menu.dataset.bound){
      menu.dataset.bound="1";
      menu.addEventListener("click",()=>mobile.classList.toggle("open"));
    }
  };

  document.addEventListener("DOMContentLoaded",()=>{
    tcInitUI();
    tcSetLang(window.TC_LANG);
    applyTheme(window.TC_THEME);
  });
})();