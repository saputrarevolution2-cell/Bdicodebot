document.addEventListener("DOMContentLoaded", async () => {
  const host = document.getElementById("navbar");
  if (!host) return;
  // Prevent duplicate initialization
  if (host.dataset.navbarReady === "1") return;
  host.dataset.navbarReady = "1";
  const isAdmin = location.pathname.includes("/admin/");
  const base = isAdmin ? "../" : "";
  /* =========================================================
     HELPERS
  ========================================================= */
  const esc = (value) => {
    if (window.TC?.esc) return TC.esc(value);
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  };
  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ""), window.location.origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "#";
      }
      return url.href;
    } catch {
      return "#";
    }
  };
  const getCurrentFile = () => {
    const path = location.pathname.replace(/\/+$/, "");
    const file = path.split("/").pop();
    return file || (isAdmin ? "index.html" : "dashboard.html");
  };
  /* =========================================================
     USER
  ========================================================= */
  let user = null;
  try {
    if (window.TC?.user) {
      user = await TC.user();
    }
  } catch (_) {
    user = null;
  }
  const name =
    user?.user_metadata?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Guest";
  /* =========================================================
     NAVIGATION
  ========================================================= */
  const groups = isAdmin
    ? [
        [
          "Workspace",
          [
            ["index.html", "fa-chart-pie", "Overview"],
            ["users.html", "fa-users", "Users"],
            ["products.html", "fa-box", "Products"],
            ["orders.html", "fa-receipt", "Orders"]
          ]
        ],
        [
          "Finance",
          [
            ["payments.html", "fa-credit-card", "Payments"],
            ["withdrawals.html", "fa-money-bill-transfer", "Withdrawals"],
            ["transactions.html", "fa-arrow-right-arrow-left", "Transactions"]
          ]
        ],
        [
          "System",
          [
            ["pastes.html", "fa-file-lines", "Pastes"],
            ["bots.html", "fa-robot", "Bots"],
            ["logs.html", "fa-list", "Logs"]
          ]
        ]
      ]
    : [
        [
          "Workspace",
          [
            ["dashboard.html", "fa-house", "Dashboard"],
            ["marketplace.html", "fa-store", "Marketplace"]
          ]
        ],
        [
          "Create & Manage",
          [
            ["paste.html", "fa-paperclip", "Create"],
            ["my-products.html", "fa-link", "My Links"],
            ["purchases.html", "fa-bag-shopping", "Purchases"]
          ]
        ],
        [
          "Finance",
          [
            ["wallet.html", "fa-wallet", "Wallet"],
            ["withdrawals.html", "fa-money-bill-transfer", "Withdraw"],
            ["transactions.html", "fa-arrow-right-arrow-left", "Transactions"]
          ]
        ],
        [
          "Account",
          [
            ["notifications.html", "fa-bell", "Notifications"],
            ["profile.html", "fa-user", "Profile"],
            ["settings.html", "fa-gear", "Settings"]
          ]
        ]
      ];
  const renderGroups = groups.map(([title, items]) => {
    return `
      <div class="nav-group">
        <small class="nav-group-title">${esc(title)}</small>
        ${items.map(([href, icon, label]) => `
          <a
            href="${base}${href}"
            data-href="${esc(href)}"
            class="nav-link"
          >
            <i class="fa-solid ${esc(icon)}" aria-hidden="true"></i>
            <span>${esc(label)}</span>
          </a>
        `).join("")}
      </div>
    `;
  }).join("");
  /* =========================================================
     NAVBAR HTML
  ========================================================= */
  host.innerHTML = `
    <header class="navbar" id="tgSidebar">
      <div class="nav-inner">
        <!-- BRAND -->
        <a
          class="brand"
          href="${base}${isAdmin ? "index.html" : "dashboard.html"}"
          aria-label="PasTele"
        >
          <span class="brand-mark">
            <i class="fa-brands fa-telegram" aria-hidden="true"></i>
          </span>
          <span>PasTele</span>
        </a>
        <!-- ACCOUNT -->
        <div class="nav-account">
          <a
            class="nav-account-info"
            href="${base}${isAdmin ? "index.html" : "profile.html"}"
            aria-label="Profil"
          >
            <div class="nav-avatar">
              <i class="fa-solid fa-user" aria-hidden="true"></i>
            </div>
            <div class="nav-name">
              <b>${esc(name)}</b>
              <small>${isAdmin ? "Administrator" : "Profil akun"}</small>
            </div>
          </a>
          <span
            class="nav-balance"
            id="navBalance"
            aria-label="Saldo"
          >
            Rp 0
          </span>
          <button
            class="nav-theme"
            id="navTheme"
            type="button"
            title="Ganti tema"
            aria-label="Ganti tema"
          >
            <i class="fa-solid fa-moon" aria-hidden="true"></i>
          </button>
        </div>
        <!-- NAVIGATION -->
        <nav
          class="nav-links"
          id="navLinks"
          aria-label="${isAdmin ? "Admin navigation" : "Main navigation"}"
        >
          ${renderGroups}
        </nav>
        <!-- SOCIAL -->
        <div
          class="nav-extra"
          id="navSocials"
          aria-label="Sosial Media"
        ></div>
        <!-- TOOLS -->
        <div class="nav-tools">
          <button
            class="nav-logout"
            id="navLogout"
            type="button"
          >
            <i
              class="fa-solid fa-right-from-bracket"
              aria-hidden="true"
            ></i>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </header>
    <!-- MOBILE BACKDROP -->
    <div
      class="nav-backdrop"
      id="navBackdrop"
      aria-hidden="true"
    ></div>
    <!-- MOBILE TOGGLE -->
    <button
      class="nav-toggle"
      id="navToggle"
      type="button"
      aria-label="Buka menu"
      aria-expanded="false"
      title="Menu"
    >
      <i
        class="fa-solid fa-bars"
        aria-hidden="true"
      ></i>
    </button>
  `;
  /* =========================================================
     ELEMENTS
  ========================================================= */
  const sidebar = document.getElementById("tgSidebar");
  const toggle = document.getElementById("navToggle");
  const backdrop = document.getElementById("navBackdrop");
  const themeBtn = document.getElementById("navTheme");
  const logoutBtn = document.getElementById("navLogout");
  const navLinks = [...document.querySelectorAll("#navLinks a")];
  /* =========================================================
     ACTIVE MENU
  ========================================================= */
  const current = getCurrentFile();
  navLinks.forEach((link) => {
    const href = link.dataset.href;
    if (href === current) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
  /* =========================================================
     MOBILE MENU
  ========================================================= */
  const setMenu = (open) => {
    if (!sidebar || !toggle || !backdrop) return;
    sidebar.classList.toggle("nav-open", open);
    backdrop.classList.toggle("show", open);
    toggle.setAttribute(
      "aria-expanded",
      String(open)
    );
    toggle.setAttribute(
      "aria-label",
      open ? "Tutup menu" : "Buka menu"
    );
    toggle.setAttribute(
      "title",
      open ? "Tutup menu" : "Menu"
    );
    backdrop.setAttribute(
      "aria-hidden",
      String(!open)
    );
    const icon = toggle.querySelector("i");
    if (icon) {
      icon.className = `fa-solid ${
        open ? "fa-xmark" : "fa-bars"
      }`;
    }
    document.body.classList.toggle(
      "nav-menu-open",
      open
    );
  };
  const toggleMenu = () => {
    const isOpen = sidebar?.classList.contains("nav-open");
    setMenu(!isOpen);
  };
  toggle?.addEventListener("click", toggleMenu);
  backdrop?.addEventListener("click", () => {
    setMenu(false);
  });
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      setMenu(false);
    });
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenu(false);
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      setMenu(false);
    }
  });
  /* =========================================================
     THEME
  ========================================================= */
  const getStoredTheme = () => {
    const saved = localStorage.getItem("pastele-theme");
    if (saved === "dark" || saved === "light") {
      return saved;
    }
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };
  const applyTheme = (theme) => {
    const normalized =
      theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme =
      normalized;
    document.body.classList.toggle(
      "theme-dark",
      normalized === "dark"
    );
    if (themeBtn) {
      const icon = themeBtn.querySelector("i");
      if (icon) {
        icon.className =
          normalized === "dark"
            ? "fa-solid fa-sun"
            : "fa-solid fa-moon";
      }
      themeBtn.setAttribute(
        "aria-label",
        normalized === "dark"
          ? "Gunakan tema terang"
          : "Gunakan tema gelap"
      );
      themeBtn.setAttribute(
        "title",
        normalized === "dark"
          ? "Tema terang"
          : "Tema gelap"
      );
    }
  };
  const initialTheme = getStoredTheme();
  applyTheme(initialTheme);
  themeBtn?.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.dataset.theme === "dark"
        ? "dark"
        : "light";
    const nextTheme =
      currentTheme === "dark"
        ? "light"
        : "dark";
    localStorage.setItem(
      "pastele-theme",
      nextTheme
    );
    applyTheme(nextTheme);
  });
  /* =========================================================
     WALLET BALANCE
  ========================================================= */
  if (user && window.sb) {
    try {
      const { data: wallet, error } = await sb
        .from("wallets")
        .select("balance,available_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error) {
        const balance =
          wallet?.available_balance ??
          wallet?.balance ??
          0;
        const balanceEl =
          document.getElementById("navBalance");
        if (balanceEl) {
          if (window.TC?.money) {
            balanceEl.textContent =
              TC.money(balance);
          } else {
            balanceEl.textContent =
              `Rp ${Number(balance || 0).toLocaleString("id-ID")}`;
          }
        }
      }
    } catch (_) {
      // Wallet failure must never break navbar.
    }
  }
  /* =========================================================
     LOGOUT
  ========================================================= */
  logoutBtn?.addEventListener("click", async () => {
    if (logoutBtn.disabled) return;
    logoutBtn.disabled = true;
    const originalHTML = logoutBtn.innerHTML;
    logoutBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
      <span>Keluar...</span>
    `;
    try {
      if (window.Auth?.logout) {
        await Auth.logout();
      }
    } catch (error) {
      logoutBtn.disabled = false;
      logoutBtn.innerHTML = originalHTML;
      try {
        if (window.TC?.toast) {
          TC.toast(
            error?.message || "Gagal logout",
            "error"
          );
        }
      } catch (_) {}
      return;
    }
  });
  /* =========================================================
     SOCIAL MEDIA
  ========================================================= */
  if (window.sb) {
    try {
      const response =
        await sb.rpc("get_public_site_settings");
      const socials =
        Array.isArray(response?.data?.socials)
          ? response.data.socials
          : [];
      const socialHost =
        document.getElementById("navSocials");
      if (socialHost && socials.length) {
        const validSocials = socials
          .slice(0, 5)
          .map((social) => {
            const url = safeUrl(social?.url);
            if (url === "#") return null;
            const icon =
              social?.icon ||
              "fa-solid fa-link";
            const label =
              social?.name ||
              "Social";
            return `
              <a
                href="${esc(url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i
                  class="${esc(icon)}"
                  aria-hidden="true"
                ></i>
                <span>${esc(label)}</span>
              </a>
            `;
          })
          .filter(Boolean)
          .join("");
        if (validSocials) {
          socialHost.innerHTML = `
            <small>Sosial Media</small>
            ${validSocials}
          `;
        }
      }
    } catch (_) {
      // Social settings are optional.
    }
  }
});
