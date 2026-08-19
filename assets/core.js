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

  function ensureSharedShell(){
    const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const isAuth=['login.html','register.html'].includes(path);
    const top=document.querySelector('.topbar');
    if(top){
      const nav=top.querySelector('.nav');
      if(nav && !nav.querySelector('.tc-shared-links')){
        const links=document.createElement('nav');
        links.className='desktop-nav tc-shared-links';
        links.innerHTML=`<a href="index.html"><i class="fa-solid fa-house"></i> Home</a><a href="marketplace.html"><i class="fa-solid fa-store"></i> Marketplace</a><a href="paste.html"><i class="fa-solid fa-paste"></i> PasteLink</a><a href="seller.html"><i class="fa-solid fa-wand-magic-sparkles"></i> Create</a>`;
        nav.insertBefore(links,nav.querySelector('.nav-actions'));
        const menu=document.createElement('button'); menu.className='menu'; menu.type='button'; menu.dataset.menu=''; menu.innerHTML='<i class="fa-solid fa-bars"></i>'; nav.insertBefore(menu,nav.querySelector('.nav-actions'));
        const mobile=document.createElement('div'); mobile.className='mobile-nav tc-mobile-links'; mobile.dataset.mobileNav=''; mobile.innerHTML=`<a href="index.html">Home</a><a href="marketplace.html">Marketplace</a><a href="paste.html">PasteLink</a><a href="seller.html">Create</a><a href="dashboard.html">Dashboard</a>`; top.parentElement.appendChild(mobile);
      }
    }
    if(!document.querySelector('footer.tc-shared-footer')){
      const footer=document.createElement('footer'); footer.className='tc-shared-footer';
      footer.innerHTML=`<div class="wrap tc-footer-grid"><div><a class="brand" href="index.html"><span class="brandmark"><i class="fa-brands fa-telegram"></i></span><span>Tele<span>Cod</span></span></a><p>Premium digital workspace for creators, PasteLinks and digital products.</p></div><div><b>Explore</b><a href="marketplace.html">Marketplace</a><a href="paste.html">PasteLink</a><a href="seller.html">Create Product</a></div><div><b>Account</b><a href="dashboard.html">Dashboard</a><a href="login.html">Login</a><a href="register.html">Register</a></div><div><b>Legal</b><a href="terms.html">Terms</a><a href="privacy.html">Privacy</a></div></div><div class="wrap tc-footer-bottom">© 2026 TeleCod <span>• Built for creators</span></div>`;
      document.body.appendChild(footer);
    }
    if(!document.querySelector('.password-toggle')){
      document.querySelectorAll('input[type="password"]').forEach(input=>{
        const wrap=document.createElement('div'); wrap.className='password-wrap'; input.parentNode.insertBefore(wrap,input); wrap.appendChild(input);
        const btn=document.createElement('button'); btn.type='button'; btn.className='password-toggle'; btn.setAttribute('aria-label','Show password'); btn.innerHTML='<i class="fa-solid fa-eye"></i>';
        btn.onclick=()=>{ const hidden=input.type==='password'; input.type=hidden?'text':'password'; btn.innerHTML=hidden?'<i class="fa-solid fa-eye-slash"></i>':'<i class="fa-solid fa-eye"></i>'; btn.setAttribute('aria-label',hidden?'Hide password':'Show password'); };
        wrap.appendChild(btn);
      });
    }
  }
  async function enhanceSessionNav(){
    if(!window.supabase || !window.TELECOD_CONFIG) return;
    try{
      const client=window.supabase.createClient(TELECOD_CONFIG.SUPABASE_URL,TELECOD_CONFIG.SUPABASE_ANON_KEY);
      const {data}=await client.auth.getUser();
      const actions=document.querySelector('.nav-actions');
      if(actions && data?.user && !actions.querySelector('.tc-account-link')){
        const a=document.createElement('a'); a.className='btn ghost tc-account-link'; a.href='dashboard.html'; a.innerHTML='<i class="fa-solid fa-gauge-high"></i><span>Dashboard</span>'; actions.insertBefore(a,actions.firstChild);
      }
    }catch(_e){}
  }

  window.tcInitUI=function(){
    ensureSharedShell();
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
    enhanceSessionNav();
    tcSetLang(window.TC_LANG);
    applyTheme(window.TC_THEME);
  });
})();