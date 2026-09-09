/* =========================================================
   PasTele — UNIVERSAL NAVBAR
   CLEAN SAAS / MENU DRAWER / ACCOUNT DROPDOWN
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const host = document.getElementById("navbar");
  if (!host || host.dataset.navbarReady === "1") return;
  host.dataset.navbarReady = "1";

  const isAdmin = location.pathname.includes("/admin/");
  const base = isAdmin ? "../" : "";

  const sb = () => window.sb || null;
  const tc = () => window.TC || null;
  const esc = (v) => tc()?.esc ? tc().esc(v) : String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
  const currentFile = () => (location.pathname.split("?")[0].split("#")[0].replace(/\/+$/,"").split("/").pop() || (isAdmin ? "index.html" : "dashboard.html")).toLowerCase();
  const same = href => String(href).split("?")[0].split("#")[0].replace(/^\/+/,"").toLowerCase() === currentFile();

  let user = null, profile = null;
  try { user = tc()?.user ? await tc().user() : null; } catch {}
  if (!user && sb()?.auth) {
    try { user = (await sb().auth.getUser()).data?.user || null; } catch {}
  }
  if (user && sb()) {
    try {
      const r = await sb().from("profiles")
        .select("username,display_name,avatar_url,is_banned,is_admin,role,is_premium,subscription_until")
        .eq("id", user.id).maybeSingle();
      profile = r.data || null;
    } catch {}
  }

  const name = profile?.username || user?.user_metadata?.username ||
    profile?.display_name || user?.user_metadata?.full_name ||
    user?.user_metadata?.name || user?.email?.split("@")[0] || "Guest";
  const isPremium = Boolean(profile?.is_premium && (!profile?.subscription_until || new Date(profile.subscription_until) > new Date()));

  const groups = isAdmin ? [
    ["Admin", [
      ["index.html","fa-chart-pie","Overview"],["users.html","fa-users","Users"],
      ["products.html","fa-box","Products"],["content.html","fa-layer-group","Content"],
      ["orders.html","fa-receipt","Orders"],["payments.html","fa-credit-card","Payments"],
      ["withdrawals.html","fa-money-bill-transfer","Withdrawals"],["notifications.html","fa-bell","Notifications"],
      ["transactions.html","fa-arrow-right-arrow-left","Transactions"],["pastes.html","fa-file-lines","Pastes"],
      ["bots.html","fa-robot","Bots"],["logs.html","fa-list","Logs"]
    ]]
  ] : [
    ["Menu",[["dashboard.html","fa-house","Dashboard"],["marketplace.html","fa-store","Marketplace"]]],
    ["Create",[["create-pastelink.html","fa-link","PasteLink"],["create-code.html","fa-code","Code"],["create-telegram.html?type=channel","fa-users","Group / Channel"]]],
    ["Manage",[["my-products.html","fa-box-open","My Product"],["purchases.html","fa-bag-shopping","Purchases"]]],
    ["Finance",[["wallet.html","fa-wallet","Wallet"],["withdrawals.html","fa-money-bill-transfer","Withdraw"],["transactions.html","fa-arrow-right-arrow-left","Transaction"]]],
    ["Account",[["subscription.html","fa-crown","Langganan"],["premium.html","fa-gem","Premium"],["notifications.html","fa-bell","Notifikasi"],["profile.html","fa-user","Profile"],["settings.html","fa-gear","Setting"],["about.html","fa-circle-info","About"]]]
  ];

  const renderItems = items => items.map(([href, icon, label]) => `
    <a class="nav-menu-link${same(href) ? " active" : ""}" href="${base}${esc(href)}" data-href="${esc(href)}" ${same(href) ? 'aria-current="page"' : ""}>
      <span class="nav-menu-icon"><i class="fa-solid ${esc(icon)}" aria-hidden="true"></i></span>
      <span class="nav-menu-label">${esc(label)}</span>
      <i class="fa-solid fa-chevron-right nav-menu-arrow" aria-hidden="true"></i>
    </a>`).join("");

  host.innerHTML = `
    <header class="navbar" id="tgSidebar">
      <div class="nav-inner">
        <button class="nav-toggle" id="navToggle" type="button" aria-label="Buka menu" aria-expanded="false">
          <i class="fa-solid fa-bars"></i>
        </button>

        <a class="brand" href="${base}${isAdmin ? "index.html" : "dashboard.html"}" aria-label="PasTele">
          <span class="brand-mark"><i class="fa-brands fa-telegram"></i></span>
          <span class="brand-text">PasTele</span>
        </a>

        <div class="nav-spacer"></div>

        <div class="nav-user-wrap">
          <button class="nav-user-button" id="navUserButton" type="button" aria-expanded="false" aria-controls="navUserDropdown">
            <span class="nav-avatar">${profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : `<i class="fa-solid fa-user"></i>`}</span>
            <span class="nav-user-name">${esc(name)}</span>
            ${isPremium ? '<i class="fa-solid fa-circle-check nav-premium-check" title="Premium aktif"></i>' : ''}
            <i class="fa-solid fa-chevron-down nav-user-chevron"></i>
          </button>

          <div class="nav-user-dropdown" id="navUserDropdown" hidden>
            <div class="nav-user-dropdown-head">
              <span class="nav-avatar large">${profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : `<i class="fa-solid fa-user"></i>`}</span>
              <div><strong>${esc(name)}</strong><small>${isAdmin ? "Administrator" : isPremium ? "Premium aktif" : "Akun aktif"}</small></div>
            </div>
            <div class="nav-account-grid">
              <div class="nav-account-card"><i class="fa-solid fa-wallet"></i><span>Saldo</span><strong id="navBalance">Rp 0</strong></div>
              <a class="nav-account-card" href="${base}notifications.html"><i class="fa-solid fa-bell"></i><span>Notifikasi</span><strong id="navNotificationCount">0</strong></a>
              <button class="nav-account-card" id="navTheme" type="button"><i class="fa-solid fa-moon"></i><span>Tema</span><strong id="navThemeText">System</strong></button>
            </div>
            <a class="nav-dropdown-profile" href="${base}${isAdmin ? "index.html" : "profile.html"}"><i class="fa-solid fa-user-gear"></i> Kelola profil <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        </div>
      </div>
    </header>

    <div class="nav-backdrop" id="navBackdrop" aria-hidden="true"></div>

    <aside class="nav-drawer" id="navDrawer" aria-hidden="true">
      <div class="nav-drawer-head">
        <div><span class="nav-drawer-kicker">${isAdmin ? "ADMIN PANEL" : "WORKSPACE"}</span><strong>${isAdmin ? "Administration" : "PasTele Menu"}</strong></div>
        <button class="nav-drawer-close" id="navDrawerClose" type="button" aria-label="Tutup menu"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <nav class="nav-menu-list" aria-label="${isAdmin ? "Admin menu" : "Main menu"}">
        ${groups.map(([title,items]) => `<section class="nav-menu-group"><h3>${esc(title)}</h3>${renderItems(items)}</section>`).join("")}
      </nav>
      <div class="nav-drawer-bottom">
        ${!isAdmin ? `<a class="nav-menu-link special" href="${base}wallet.html"><span class="nav-menu-icon"><i class="fa-solid fa-wallet"></i></span><span class="nav-menu-label">Wallet & Saldo</span><i class="fa-solid fa-chevron-right nav-menu-arrow"></i></a>` : ""}
        <button class="nav-menu-link logout" id="navLogout" type="button">
          <span class="nav-menu-icon"><i class="fa-solid fa-right-from-bracket"></i></span><span class="nav-menu-label">Log out</span><i class="fa-solid fa-arrow-right nav-menu-arrow"></i>
        </button>
      </div>
    </aside>
  `;

  const toggle = document.getElementById("navToggle");
  const drawer = document.getElementById("navDrawer");
  const backdrop = document.getElementById("navBackdrop");
  const userBtn = document.getElementById("navUserButton");
  const userDrop = document.getElementById("navUserDropdown");
  const logout = document.getElementById("navLogout");

  const openMenu = () => {
    drawer?.classList.add("open"); backdrop?.classList.add("open");
    drawer?.setAttribute("aria-hidden","false"); toggle?.setAttribute("aria-expanded","true");
    document.body.classList.add("nav-menu-open");
  };
  const closeMenu = () => {
    drawer?.classList.remove("open"); backdrop?.classList.remove("open");
    drawer?.setAttribute("aria-hidden","true"); toggle?.setAttribute("aria-expanded","false");
    document.body.classList.remove("nav-menu-open");
  };
  toggle?.addEventListener("click", openMenu);
  backdrop?.addEventListener("click", closeMenu);
  document.getElementById("navDrawerClose")?.addEventListener("click", closeMenu);
  drawer?.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", e => { if(e.key==="Escape"){ closeMenu(); userDrop?.setAttribute("hidden",""); userBtn?.setAttribute("aria-expanded","false"); }});

  userBtn?.addEventListener("click", e => {
    e.stopPropagation();
    const open = !userDrop.hasAttribute("hidden");
    if(open){ userDrop.setAttribute("hidden",""); userBtn.setAttribute("aria-expanded","false"); }
    else { userDrop.removeAttribute("hidden"); userBtn.setAttribute("aria-expanded","true"); }
  });
  document.addEventListener("click", e => {
    if(!e.target.closest(".nav-user-wrap")) { userDrop?.setAttribute("hidden",""); userBtn?.setAttribute("aria-expanded","false"); }
  });

  const formatMoney = value => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value)||0);
  const loadBalance = async () => {
    if(!user || !sb()) return;
    try {
      let data = (await sb().from("wallets").select("balance,available_balance").eq("user_id",user.id).maybeSingle()).data;
      if(!data) data = (await sb().from("wallets").select("balance").eq("user_id",user.id).maybeSingle()).data;
      const el = document.getElementById("navBalance");
      if(el) el.textContent = formatMoney(data?.available_balance ?? data?.balance ?? 0);
    } catch {}
  };
  const loadNotifications = async () => {
    if(!user || !sb()) return;
    try {
      const r = await sb().from("notifications").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("is_read",false);
      const n = Number(r.count||0), el=document.getElementById("navNotificationCount");
      if(el) el.textContent = n > 99 ? "99+" : String(n);
    } catch {}
  };
  const updateThemeLabel = () => {
    const mode = window.PasTeleTheme?.get?.() || localStorage.getItem("pastele-theme") || "system";
    const text = mode === "dark" ? "Gelap" : mode === "light" ? "Terang" : "System";
    const icon = document.querySelector("#navTheme i");
    const el = document.getElementById("navThemeText");
    if(el) el.textContent=text;
    if(icon) icon.className = `fa-solid ${mode==="dark" ? "fa-moon" : mode==="light" ? "fa-sun" : "fa-circle-half-stroke"}`;
  };
  document.getElementById("navTheme")?.addEventListener("click", () => {
    if(window.PasTeleTheme?.cycle) window.PasTeleTheme.cycle();
    else {
      const modes=["system","light","dark"], cur=localStorage.getItem("pastele-theme")||"system";
      localStorage.setItem("pastele-theme",modes[(modes.indexOf(cur)+1)%3]);
      location.reload();
    }
    updateThemeLabel();
  });
  window.addEventListener("pastele-theme-change", updateThemeLabel);
  updateThemeLabel(); await loadBalance(); await loadNotifications();

  logout?.addEventListener("click", async () => {
    if(logout.disabled) return;
    logout.disabled=true;
    logout.innerHTML='<span class="nav-menu-icon"><i class="fa-solid fa-spinner fa-spin"></i></span><span class="nav-menu-label">Keluar...</span>';
    try {
      if(tc()?.logout) await tc().logout();
      else if(window.Auth?.logout) await window.Auth.logout();
      else if(sb()?.auth) await sb().auth.signOut();
      location.href=`${base}login.html`;
    } catch(e) {
      logout.disabled=false;
      logout.innerHTML='<span class="nav-menu-icon"><i class="fa-solid fa-right-from-bracket"></i></span><span class="nav-menu-label">Log out</span><i class="fa-solid fa-arrow-right nav-menu-arrow"></i>';
      tc()?.toast?.(e?.message||"Gagal logout","error");
    }
  });

  host.dataset.navbarLoaded="1";
});
