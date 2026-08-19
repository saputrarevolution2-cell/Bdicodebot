(() => {
  const langKey = "telecod_lang";
  const themeKey = "telecod_theme";
  window.TC_LANG = localStorage.getItem(langKey) || "id";
  window.TC_THEME = localStorage.getItem(themeKey) || "dark";

  window.TC_CORE_I18N = {
    id: {
      navHome:"Beranda", navMarketplace:"Marketplace", navPaste:"PasteLink", navCreate:"Buat", navDashboard:"Dashboard",
      footerDesc:"Workspace digital premium untuk creator, PasteLink, dan produk digital.", footerExplore:"Jelajahi", footerAccount:"Akun", footerLegal:"Legal",
      footerCreate:"Buat Produk", footerLogin:"Login", footerRegister:"Daftar", footerTerms:"Ketentuan", footerPrivacy:"Privasi",
      themeLight:"Mode terang", themeDark:"Mode gelap", menu:"Menu"
    },
    en: {
      navHome:"Home", navMarketplace:"Marketplace", navPaste:"PasteLink", navCreate:"Create", navDashboard:"Dashboard",
      footerDesc:"A premium digital workspace for creators, PasteLinks, and digital products.", footerExplore:"Explore", footerAccount:"Account", footerLegal:"Legal",
      footerCreate:"Create Product", footerLogin:"Login", footerRegister:"Register", footerTerms:"Terms", footerPrivacy:"Privacy",
      themeLight:"Light mode", themeDark:"Dark mode", menu:"Menu"
    }
  };

  function applyTheme(theme) {
    theme = theme === "light" ? "light" : "dark";
    window.TC_THEME = theme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(themeKey, theme);
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
      const key = theme === "dark" ? "themeLight" : "themeDark";
      btn.innerHTML = theme === "dark" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      btn.title = tcT(key, theme === "dark" ? "Light mode" : "Dark mode");
      btn.setAttribute("aria-label", btn.title);
    });
  }
  window.tcSetTheme = applyTheme;
  window.tcToggleTheme = () => applyTheme(window.TC_THEME === "dark" ? "light" : "dark");

  window.tcT = function(key, fallback = "") {
    return window.TC_I18N?.[window.TC_LANG]?.[key]
      ?? window.TC_CORE_I18N?.[window.TC_LANG]?.[key]
      ?? fallback;
  };

  window.tcSetLang = function(lang) {
    window.TC_LANG = lang === "en" ? "en" : "id";
    localStorage.setItem(langKey, window.TC_LANG);
    document.documentElement.lang = window.TC_LANG;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const value = tcT(el.dataset.i18n);
      if (value !== "") el.textContent = value;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      const value = tcT(el.dataset.i18nHtml);
      if (value !== "") el.innerHTML = value;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const value = tcT(el.dataset.i18nPlaceholder);
      if (value !== "") el.placeholder = value;
    });
    const title = document.querySelector("title");
    const titleValue = document.body?.dataset?.[`title${window.TC_LANG === "id" ? "Id" : "En"}`];
    if (titleValue && title) title.textContent = titleValue;
    document.querySelectorAll("[data-lang-label]").forEach(el => el.textContent = window.TC_LANG === "id" ? "ID / EN" : "EN / ID");
    window.dispatchEvent(new CustomEvent("telecod:language", { detail: { lang: window.TC_LANG } }));
    applyTheme(window.TC_THEME);
  };

  window.tcToast = function(message,type="info",title="TeleCod"){let stack=document.querySelector('.toast-stack');if(!stack){stack=document.createElement('div');stack.className='toast-stack';document.body.appendChild(stack)}const el=document.createElement('div');el.className='tc-toast '+type;const icon=type==='error'?'fa-circle-exclamation':type==='success'?'fa-circle-check':'fa-circle-info';el.innerHTML=`<i class="fa-solid ${icon}"></i><div><b>${tcEscape(title)}</b><span>${tcEscape(message)}</span></div>`;stack.appendChild(el);setTimeout(()=>el.remove(),4200)};

  window.tcEscape = function(value) {
    return String(value ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  };

  window.tcMoney = function(value) {
    return new Intl.NumberFormat(window.TC_LANG === "id" ? "id-ID" : "en-US", {
      style:"currency", currency:"IDR", maximumFractionDigits:0
    }).format(Number(value || 0));
  };

  window.tcLinkify = function(value) {
    const source = String(value ?? "");
    const urlRe = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
    let html = "", last = 0, m;
    while ((m = urlRe.exec(source))) {
      html += tcEscape(source.slice(last, m.index));
      let raw = m[0], trailing = "";
      while (/[),.!?;:'\]} >]+$/.test(raw)) { trailing = raw.slice(-1) + trailing; raw = raw.slice(0, -1); }
      const href = /^www\./i.test(raw) ? "https://" + raw : raw;
      html += `<a class="tc-link" href="${tcEscape(href)}" target="_blank" rel="noopener noreferrer nofollow">${tcEscape(raw)}</a>${tcEscape(trailing)}`;
      last = m.index + m[0].length;
    }
    return html + tcEscape(source.slice(last));
  };

  function addThemeButton() {
    if (document.querySelector("[data-theme-toggle]")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle icon-btn";
    btn.dataset.themeToggle = "";
    btn.addEventListener("click", window.tcToggleTheme);
    const host = document.querySelector(".nav-actions,.auth-top");
    if (host) host.insertBefore(btn, host.firstChild);
    else { btn.style.position="fixed"; btn.style.right="18px"; btn.style.top="18px"; btn.style.zIndex="9999"; document.body.appendChild(btn); }
    applyTheme(window.TC_THEME);
  }

  function ensureSharedShell() {
    const top = document.querySelector(".topbar");
    if (top) {
      const nav = top.querySelector(".nav");
      if (nav && !nav.querySelector(".tc-shared-links")) {
        const links = document.createElement("nav");
        links.className = "desktop-nav tc-shared-links";
        links.innerHTML = `
          <a href="index.html"><i class="fa-solid fa-house"></i><span data-i18n="navHome">Home</span></a>
          <a href="marketplace.html"><i class="fa-solid fa-store"></i><span data-i18n="navMarketplace">Marketplace</span></a>
          <a href="paste.html"><i class="fa-solid fa-paste"></i><span data-i18n="navPaste">PasteLink</span></a>
          <a href="seller.html"><i class="fa-solid fa-wand-magic-sparkles"></i><span data-i18n="navCreate">Create</span></a>`;
        nav.insertBefore(links, nav.querySelector(".nav-actions"));
        const menu = document.createElement("button");
        menu.className = "menu icon-btn"; menu.type = "button"; menu.dataset.menu = "";
        menu.innerHTML = '<i class="fa-solid fa-bars"></i>'; menu.title = tcT("menu","Menu"); menu.setAttribute("aria-label", menu.title);
        nav.insertBefore(menu, nav.querySelector(".nav-actions"));
        const mobile = document.createElement("div");
        mobile.className = "mobile-nav tc-mobile-links"; mobile.dataset.mobileNav = "";
        mobile.innerHTML = `
          <a href="index.html"><i class="fa-solid fa-house"></i><span data-i18n="navHome">Home</span></a>
          <a href="marketplace.html"><i class="fa-solid fa-store"></i><span data-i18n="navMarketplace">Marketplace</span></a>
          <a href="paste.html"><i class="fa-solid fa-paste"></i><span data-i18n="navPaste">PasteLink</span></a>
          <a href="seller.html"><i class="fa-solid fa-wand-magic-sparkles"></i><span data-i18n="navCreate">Create</span></a>
          <a href="dashboard.html"><i class="fa-solid fa-gauge-high"></i><span data-i18n="navDashboard">Dashboard</span></a>`;
        top.parentElement.appendChild(mobile);
      }
    }
    if (!document.querySelector("footer.tc-shared-footer")) {
      const footer = document.createElement("footer"); footer.className = "tc-shared-footer";
      footer.innerHTML = `<div class="wrap tc-footer-grid">
        <div><a class="brand" href="index.html"><span class="brandmark"><i class="fa-brands fa-telegram"></i></span><span>Tele<span>Cod</span></span></a><p data-i18n="footerDesc">${tcT("footerDesc")}</p></div>
        <div><b data-i18n="footerExplore">Explore</b><a href="marketplace.html"><i class="fa-solid fa-store"></i> <span data-i18n="navMarketplace">Marketplace</span></a><a href="paste.html"><i class="fa-solid fa-paste"></i> <span data-i18n="navPaste">PasteLink</span></a><a href="seller.html"><i class="fa-solid fa-box-open"></i> <span data-i18n="footerCreate">Create Product</span></a></div>
        <div><b data-i18n="footerAccount">Account</b><a href="dashboard.html"><i class="fa-solid fa-gauge-high"></i> <span data-i18n="navDashboard">Dashboard</span></a><a href="login.html"><i class="fa-solid fa-right-to-bracket"></i> <span data-i18n="footerLogin">Login</span></a><a href="register.html"><i class="fa-solid fa-user-plus"></i> <span data-i18n="footerRegister">Register</span></a></div>
        <div><b data-i18n="footerLegal">Legal</b><a href="terms.html"><i class="fa-solid fa-file-contract"></i> <span data-i18n="footerTerms">Terms</span></a><a href="privacy.html"><i class="fa-solid fa-shield-halved"></i> <span data-i18n="footerPrivacy">Privacy</span></a></div>
      </div><div class="wrap tc-footer-bottom">© ${new Date().getFullYear()} TeleCod <span>• Premium digital workspace</span></div>`;
      document.body.appendChild(footer);
    }
    document.querySelectorAll('input[type="password"]').forEach(input => {
      if (input.parentElement?.classList.contains("password-wrap")) return;
      const wrap = document.createElement("div"); wrap.className = "password-wrap";
      input.parentNode.insertBefore(wrap,input); wrap.appendChild(input);
      const btn = document.createElement("button"); btn.type="button"; btn.className="password-toggle icon-btn";
      btn.innerHTML='<i class="fa-solid fa-eye"></i>'; btn.setAttribute("aria-label","Show password");
      btn.onclick=()=>{const hidden=input.type==="password";input.type=hidden?"text":"password";btn.innerHTML=hidden?'<i class="fa-solid fa-eye-slash"></i>':'<i class="fa-solid fa-eye"></i>';};
      wrap.appendChild(btn);
    });
  }

  async function enhanceSessionNav() {
    if (!window.supabase || !window.TELECOD_CONFIG) return;
    try {
      const client = window.supabase.createClient(TELECOD_CONFIG.SUPABASE_URL, TELECOD_CONFIG.SUPABASE_ANON_KEY);
      const {data} = await client.auth.getUser();
      const actions = document.querySelector(".nav-actions");
      if (actions && data?.user && !actions.querySelector(".tc-account-link")) {
        const a=document.createElement("a"); a.className="btn ghost tc-account-link"; a.href="dashboard.html";
        a.innerHTML='<i class="fa-solid fa-gauge-high"></i><span data-i18n="navDashboard">Dashboard</span>';
        actions.insertBefore(a,actions.firstChild);
      }
    } catch (_) {}
  }

  window.tcInitUI = function() {
    ensureSharedShell();
    addThemeButton();
    document.querySelectorAll("[data-lang-toggle]").forEach(btn=>{
      if(btn.dataset.bound==="1")return;
      btn.dataset.bound="1"; btn.addEventListener("click",()=>tcSetLang(window.TC_LANG==="id"?"en":"id"));
    });
    const menu=document.querySelector("[data-menu]"), mobile=document.querySelector("[data-mobile-nav]");
    if(menu&&mobile&&!menu.dataset.bound){menu.dataset.bound="1";menu.addEventListener("click",()=>mobile.classList.toggle("open"));}
  };

  document.documentElement.dataset.theme = window.TC_THEME;
  document.documentElement.lang = window.TC_LANG;
  document.addEventListener("DOMContentLoaded",()=>{
    tcInitUI();
    enhanceSessionNav();
    tcSetLang(window.TC_LANG);
    applyTheme(window.TC_THEME);
  });
})();
