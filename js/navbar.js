/* =========================================================
   PasTele — UNIVERSAL NAVBAR
   FINAL PREMIUM / RESPONSIVE / SAFE
   Dashboard-style Navigation
   Supports:
   - User Navbar
   - Admin Navbar
   - Mobile Sidebar
   - Light / Dark / System Theme
   - Wallet Balance
   - Social Media
   - Active Navigation
   - Logout
   - Accessibility
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const host = document.getElementById("navbar");
  if (!host) return;

  /* =======================================================
     PREVENT DUPLICATE INITIALIZATION
  ======================================================= */

  if (host.dataset.navbarReady === "1") return;
  host.dataset.navbarReady = "1";

  const isAdmin = location.pathname.includes("/admin/");
  const base = isAdmin ? "../" : "";

  /* =======================================================
     HELPERS
  ======================================================= */

  const getTC = () => window.TC || null;
  const getSB = () => window.sb || null;

  const esc = (value) => {
    try {
      if (getTC()?.esc) {
        return getTC().esc(value);
      }
    } catch (_) {}

    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[char]
    );
  };

  const safeUrl = (value) => {
    try {
      const raw = String(value || "").trim();

      if (!raw) return "#";

      const url = new URL(raw, window.location.origin);

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        return "#";
      }

      return url.href;
    } catch (_) {
      return "#";
    }
  };

  const getCurrentFile = () => {
    const path = location.pathname
      .split("?")[0]
      .split("#")[0]
      .replace(/\/+$/, "");

    const file = path.split("/").pop();

    if (!file) {
      return isAdmin ? "index.html" : "dashboard.html";
    }

    return file.toLowerCase();
  };

  const normalizeFile = (value) => {
    return String(value || "")
      .split("?")[0]
      .split("#")[0]
      .replace(/^\/+/, "")
      .toLowerCase();
  };

  const isSamePath = (href) => {
    return normalizeFile(href) === getCurrentFile();
  };

  /* =======================================================
     USER
  ======================================================= */

  let user = null;

  try {
    if (getTC()?.user) {
      user = await getTC().user();
    }
  } catch (_) {
    user = null;
  }

  /* Fallback Supabase session */
  if (!user && getSB()?.auth) {
    try {
      const { data } = await getSB().auth.getUser();
      user = data?.user || null;
    } catch (_) {
      user = null;
    }
  }

  const metadata = user?.user_metadata || {};

  const name =
    metadata.username ||
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    "Guest";

  /* =======================================================
     NAVIGATION GROUPS
  ======================================================= */

  const groups = isAdmin
    ? [
        [
          "Workspace",
          [
            ["index.html", "fa-chart-pie", "Overview"],
            ["users.html", "fa-users", "Users"],
            ["products.html", "fa-box", "Products"],
            ["content.html", "fa-layer-group", "Content"],
            ["orders.html", "fa-receipt", "Orders"]
          ]
        ],

        [
          "Finance",
          [
            [
              "payments.html",
              "fa-credit-card",
              "Payments"
            ],
            [
              "withdrawals.html",
              "fa-money-bill-transfer",
              "Withdrawals"
            ],
            [
              "transactions.html",
              "fa-arrow-right-arrow-left",
              "Transactions"
            ]
          ]
        ],

        [
          "System",
          [
            [
              "pastes.html",
              "fa-file-lines",
              "Pastes"
            ],
            [
              "bots.html",
              "fa-robot",
              "Bots"
            ],
            [
              "logs.html",
              "fa-list",
              "Logs"
            ]
          ]
        ]
      ]
    : [
        [
          "Workspace",
          [
            [
              "dashboard.html",
              "fa-house",
              "Dashboard"
            ],
            [
              "marketplace.html",
              "fa-store",
              `Marketplace
               <em class="nav-badge nav-hot">
                 <i class="fa-solid fa-fire"></i>
                 Hot
               </em>`
            ]
          ]
        ],

        [
          "Create & Manage",
          [
            [
              "paste.html",
              "fa-paperclip",
              "Create"
            ],
            [
              "my-products.html",
              "fa-box-open",
              "My Products"
            ],
            [
              "my-links.html",
              "fa-link",
              "My Links"
            ],
            [
              "purchases.html",
              "fa-bag-shopping",
              `Purchases
               <em class="nav-badge nav-new">
                 <i class="fa-solid fa-sparkles"></i>
                 New
               </em>`
            ]
          ]
        ],

        [
          "Finance",
          [
            [
              "wallet.html",
              "fa-wallet",
              "Wallet"
            ],
            [
              "withdrawals.html",
              "fa-money-bill-transfer",
              "Withdraw"
            ],
            [
              "transactions.html",
              "fa-arrow-right-arrow-left",
              "Transactions"
            ]
          ]
        ],

        [
          "Tools",
          [
            [
              "payment-methods.html",
              "fa-credit-card",
              "Payment Methods"
            ],
            [
              "setup.html",
              "fa-sliders",
              "Setup"
            ],
            [
              "about.html",
              "fa-circle-info",
              "About"
            ]
          ]
        ],

        [
          "Account",
          [
            [
              "subscription.html",
              "fa-crown",
              `Langganan
               <em class="nav-badge nav-new">
                 <i class="fa-solid fa-sparkles"></i>
                 New
               </em>`
            ],
            [
              "premium.html",
              "fa-gem",
              `Premium
               <em class="nav-badge nav-trend">
                 <i class="fa-solid fa-fire"></i>
                 Trend
               </em>`
            ],
            [
              "notifications.html",
              "fa-bell",
              `Notifications
               <em class="nav-badge nav-new">
                 <i class="fa-solid fa-sparkles"></i>
                 New
               </em>`
            ],
            [
              "profile.html",
              "fa-user",
              "Profile"
            ],
            [
              "settings.html",
              "fa-gear",
              "Settings"
            ]
          ]
        ]
      ];

  /* =======================================================
     RENDER NAVIGATION
  ======================================================= */

  const renderGroups = groups
    .map(([title, items]) => {
      return `
        <div class="nav-group">

          <small class="nav-group-title">
            ${esc(title)}
          </small>

          ${items
            .map(([href, icon, label]) => {
              const active = isSamePath(href);

              return `
                <a
                  href="${base}${esc(href)}"
                  data-href="${esc(href)}"
                  class="nav-link${active ? " active" : ""}"
                  ${active ? 'aria-current="page"' : ""}
                >
                  <i
                    class="fa-solid ${esc(icon)}"
                    aria-hidden="true"
                  ></i>

                  <span>${label}</span>
                </a>
              `;
            })
            .join("")}

        </div>
      `;
    })
    .join("");

  /* =======================================================
     NAVBAR HTML
  ======================================================= */

  host.innerHTML = `
    <header
      class="navbar"
      id="tgSidebar"
      role="navigation"
    >

      <div class="nav-inner">

        <!-- =================================================
             BRAND
        ================================================== -->

        <a
          class="brand"
          href="${base}${isAdmin ? "index.html" : "dashboard.html"}"
          aria-label="PasTele"
        >

          <span class="brand-mark">
            <i
              class="fa-brands fa-telegram"
              aria-hidden="true"
            ></i>
          </span>

          <span>PasTele</span>

        </a>


        <!-- =================================================
             ACCOUNT
        ================================================== -->

        <div class="nav-account">

          <a
            class="nav-account-info"
            href="${base}${isAdmin ? "index.html" : "profile.html"}"
            aria-label="Profil"
          >

            <div class="nav-avatar">
              <i
                class="fa-solid fa-user"
                aria-hidden="true"
              ></i>
            </div>

            <div class="nav-name">

              <b>${esc(name)}</b>

              <small>
                ${isAdmin ? "Administrator" : "Profil akun"}
              </small>

            </div>

          </a>


          <span
            class="nav-balance"
            id="navBalance"
            aria-label="Saldo tersedia"
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

            <i
              class="fa-solid fa-moon"
              aria-hidden="true"
            ></i>

          </button>

        </div>


        <!-- =================================================
             NAVIGATION
        ================================================== -->

        <nav
          class="nav-links"
          id="navLinks"
          aria-label="${isAdmin
            ? "Admin navigation"
            : "Main navigation"}"
        >

          ${renderGroups}

        </nav>


        <!-- =================================================
             SOCIAL MEDIA
        ================================================== -->

        <div
          class="nav-extra"
          id="navSocials"
          aria-label="Sosial Media"
        ></div>


        <!-- =================================================
             TOOLS
        ================================================== -->

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


    <!-- =====================================================
         MOBILE BACKDROP
    ====================================================== -->

    <div
      class="nav-backdrop"
      id="navBackdrop"
      aria-hidden="true"
    ></div>


    <!-- =====================================================
         MOBILE TOGGLE
    ====================================================== -->

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

  /* =======================================================
     ELEMENTS
  ======================================================= */

  const sidebar =
    document.getElementById("tgSidebar");

  const toggle =
    document.getElementById("navToggle");

  const backdrop =
    document.getElementById("navBackdrop");

  const themeBtn =
    document.getElementById("navTheme");

  const logoutBtn =
    document.getElementById("navLogout");

  const balanceEl =
    document.getElementById("navBalance");

  const navLinks = [
    ...document.querySelectorAll("#navLinks a")
  ];


  /* =======================================================
     ACTIVE MENU
  ======================================================= */

  navLinks.forEach((link) => {
    const href = link.dataset.href;

    if (isSamePath(href)) {
      link.classList.add("active");
      link.setAttribute(
        "aria-current",
        "page"
      );
    }
  });


  /* =======================================================
     MOBILE MENU
  ======================================================= */

  const setMenu = (open) => {
    if (!sidebar || !toggle || !backdrop) {
      return;
    }

    sidebar.classList.toggle(
      "nav-open",
      open
    );

    backdrop.classList.toggle(
      "show",
      open
    );

    toggle.setAttribute(
      "aria-expanded",
      String(open)
    );

    toggle.setAttribute(
      "aria-label",
      open
        ? "Tutup menu"
        : "Buka menu"
    );

    toggle.setAttribute(
      "title",
      open
        ? "Tutup menu"
        : "Menu"
    );

    backdrop.setAttribute(
      "aria-hidden",
      String(!open)
    );

    const icon =
      toggle.querySelector("i");

    if (icon) {
      icon.className =
        open
          ? "fa-solid fa-xmark"
          : "fa-solid fa-bars";
    }

    document.body.classList.toggle(
      "nav-menu-open",
      open
    );
  };


  const toggleMenu = () => {
    const isOpen =
      sidebar?.classList.contains(
        "nav-open"
      );

    setMenu(!isOpen);
  };


  toggle?.addEventListener(
    "click",
    toggleMenu
  );


  backdrop?.addEventListener(
    "click",
    () => {
      setMenu(false);
    }
  );


  navLinks.forEach((link) => {
    link.addEventListener(
      "click",
      () => {
        setMenu(false);
      }
    );
  });


  window.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Escape") {
        setMenu(false);
      }

    }
  );


  window.addEventListener(
    "resize",
    () => {

      if (window.innerWidth > 900) {
        setMenu(false);
      }

    }
  );


  /* =======================================================
     AUTO DAY / NIGHT THEME
     ======================================================= */

  const getAutoTheme = () => {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  };

  const applyTheme = () => {
    const theme = getAutoTheme();

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    document.documentElement.classList.toggle('theme-light', theme === 'light');

    if (document.body) {
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme === 'light');
    }

    return theme;
  };

  applyTheme();
  window.setInterval(applyTheme, 60 * 1000);

  /* =======================================================
     WALLET BALANCE
  ======================================================= */

  const formatMoney = (value) => {

    try {
      if (getTC()?.money) {
        return getTC().money(value);
      }
    } catch (_) {}

    return `Rp ${Number(
      value || 0
    ).toLocaleString("id-ID")}`;
  };


  const loadNavbarBalance = async () => {

    if (!user || !getSB()) {
      return;
    }

    try {

      const { data: wallet, error } =
        await getSB()
          .from("wallets")
          .select(
            "balance,available_balance"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (error) {
        return;
      }

      const balance =
        wallet?.available_balance ??
        wallet?.balance ??
        0;

      if (balanceEl) {

        balanceEl.textContent =
          formatMoney(balance);

      }

    } catch (_) {

      /* Wallet failure must never break navbar */

    }

  };


  await loadNavbarBalance();


  /* =======================================================
     LOGOUT
  ======================================================= */

  logoutBtn?.addEventListener(
    "click",
    async () => {

      if (logoutBtn.disabled) {
        return;
      }

      logoutBtn.disabled = true;

      const originalHTML =
        logoutBtn.innerHTML;

      logoutBtn.innerHTML = `
        <i
          class="fa-solid fa-spinner fa-spin"
          aria-hidden="true"
        ></i>

        <span>Keluar...</span>
      `;


      try {

        if (getTC()?.logout) {
          await getTC().logout();
        } else if (window.Auth?.logout) {
          await window.Auth.logout();
        } else if (getSB()?.auth) {
          await getSB().auth.signOut();

          window.location.href =
            `${base}login.html`;
        } else {

          throw new Error(
            "Sistem logout belum tersedia."
          );

        }

      } catch (error) {

        logoutBtn.disabled = false;
        logoutBtn.innerHTML =
          originalHTML;

        try {

          if (getTC()?.toast) {

            getTC().toast(
              error?.message ||
                "Gagal logout",
              "error"
            );

          }

        } catch (_) {}

      }

    }
  );


  /* =======================================================
     SOCIAL MEDIA
  ======================================================= */

  const loadSocials = async () => {

    const sb = getSB();

    if (!sb) {
      return;
    }

    const socialHost =
      document.getElementById(
        "navSocials"
      );

    if (!socialHost) {
      return;
    }


    try {

      const response =
        await sb.rpc(
          "get_public_site_settings"
        );

      if (response?.error) {
        return;
      }

      const socials =
        Array.isArray(
          response?.data?.socials
        )
          ? response.data.socials
          : [];


      if (!socials.length) {
        return;
      }


      const validSocials =
        socials
          .slice(0, 5)
          .map((social) => {

            const url =
              safeUrl(
                social?.url
              );

            if (url === "#") {
              return null;
            }


            const icon =
              String(
                social?.icon ||
                  "fa-solid fa-link"
              ).trim();


            const label =
              String(
                social?.name ||
                  "Social"
              ).trim();


            return `
              <a
                href="${esc(url)}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="${esc(label)}"
                title="${esc(label)}"
              >

                <i
                  class="${esc(icon)}"
                  aria-hidden="true"
                ></i>

                <span>
                  ${esc(label)}
                </span>

              </a>
            `;

          })
          .filter(Boolean)
          .join("");


      if (!validSocials) {
        return;
      }


      socialHost.innerHTML = `
        <small>Sosial Media</small>
        ${validSocials}
      `;

    } catch (_) {

      /* Social settings are optional */

    }

  };


  await loadSocials();


  /* =======================================================
     FOCUS / ACCESSIBILITY
  ======================================================= */

  document.addEventListener(
    "focusin",
    (event) => {

      const link =
        event.target.closest?.(
          "#navLinks a"
        );

      if (!link) {
        return;
      }

      if (
        window.innerWidth <= 900 &&
        !sidebar?.classList.contains(
          "nav-open"
        )
      ) {
        return;
      }

    }
  );


  /* =======================================================
     PAGE VISIBILITY
     Refresh balance when returning to tab
  ======================================================= */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.visibilityState ===
        "visible"
      ) {
        loadNavbarBalance();
      }

    }
  );


  /* =======================================================
     FINAL STATE
  ======================================================= */

  host.dataset.navbarLoaded = "1";

});
