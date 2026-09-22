/* PasTele Index — full database-aligned page logic
   Theme is EXPLICIT only: light/dark. No automatic/system theme detection.
*/
(() => {
  "use strict";

  window.PASTELE_CONFIG = window.PASTELE_CONFIG || Object.freeze({
    SUPABASE_URL: "https://jxrndamvelqwhbcromye.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo"
  });

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.PASTELE_CONFIG;
  const sb = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "pastele-auth"
    }
  });

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const fmt = (n) => new Intl.NumberFormat("id-ID", {
    notation:"compact", maximumFractionDigits:1
  }).format(Number(n) || 0);
  const rupiah = (n) => new Intl.NumberFormat("id-ID", {
    style:"currency", currency:"IDR", maximumFractionDigits:0
  }).format(Number(n) || 0);

  const typeInfo = {
    pastelink:{label:"PasteLink",icon:"fa-link"},
    paste:{label:"Paste",icon:"fa-file-lines"},
    code:{label:"Code",icon:"fa-key"},
    channel:{label:"Channel",icon:"fa-tower-broadcast"},
    group:{label:"Group",icon:"fa-users"},
    link:{label:"Link",icon:"fa-arrow-up-right-from-square"},
    product:{label:"Product",icon:"fa-box-open"}
  };

  const normalizeType = (v) => {
    const t = String(v || "").toLowerCase().trim();
    if (["telegram_product","telegram_products","telegram_code","code"].includes(t)) return "code";
    if (["telegram_channel","channel"].includes(t)) return "channel";
    if (["telegram_group","group"].includes(t)) return "group";
    if (["paste-link","paste_link","pastelink"].includes(t)) return "pastelink";
    if (["paste"].includes(t)) return "paste";
    if (["product","link"].includes(t)) return t;
    return t || "product";
  };

  const targetType = (row) => normalizeType(row?.type);

  const publicUrl = (row) => {
    const t = targetType(row);
    const access = String(row?.access_type || "free").toLowerCase();
    const slug = encodeURIComponent(row?.slug || row?.id || "");
    if (t === "code") return `c/${access === "paid" ? "p" : "f"}/${slug}`;
    if (t === "channel") return `ch/${access === "paid" ? "p" : "f"}/${slug}`;
    if (t === "group") return `g/${access === "paid" ? "p" : "f"}/${slug}`;
    if (t === "paste") return `paste/${slug}`;
    return `p/${slug}`;
  };

  /* Only creator usernames are masked. Content title/detail/type remain visible. */
  function maskUsername(username) {
    const raw = String(username || "").trim();
    if (!raw) return "";
    const clean = raw.startsWith("@") ? raw.slice(1) : raw;
    if (!clean) return "@••••";
    if (clean.length <= 3) return "@" + clean[0] + "••";
    if (clean.length <= 6) return "@" + clean.slice(0, 2) + "•••";
    return "@" + clean.slice(0, 2) + "••••" + clean.slice(-2);
  }

  function creatorLabel(row) {
    const display = String(row?.creator_name || "").trim();
    const username = String(row?.creator_username || "").trim();
    if (username) return `${display ? esc(display) + " · " : ""}${esc(maskUsername(username))}`;
    return esc(display || "Creator");
  }

  const engagementKey = (id, type) =>
    `${String(type || "").toLowerCase()}:${String(id || "")}`;

  function countByTarget(rows) {
    const map = Object.create(null);
    for (const row of rows || []) {
      if (row?.target_id == null) continue;
      const key = engagementKey(row.target_id, row.target_type);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }

  async function loadEngagementCounts(data) {
    if (!sb || !Array.isArray(data) || !data.length) return data;
    const ids = data.map(x => x?.id).filter(Boolean);
    if (!ids.length) return data;

    try {
      const [likesResult, commentsResult, sharesResult] = await Promise.all([
        sb.from("content_likes").select("target_id,target_type").in("target_id", ids),
        sb.from("content_comments").select("target_id,target_type").in("target_id", ids),
        sb.from("analytics_events").select("target_id,target_type,event_type").in("target_id", ids).eq("event_type", "share")
      ]);

      if (likesResult?.error) console.warn("[PasTele] likes:", likesResult.error.message);
      if (commentsResult?.error) console.warn("[PasTele] comments:", commentsResult.error.message);
      if (sharesResult?.error) console.warn("[PasTele] shares:", sharesResult.error.message);

      const likes = countByTarget(likesResult?.data || []);
      const comments = countByTarget(commentsResult?.data || []);
      const shares = countByTarget(sharesResult?.data || []);

      return data.map(item => {
        const key = engagementKey(item.id, targetType(item));
        return {
          ...item,
          likes_count: likes[key] || 0,
          comments_count: comments[key] || 0,
          shares_count: shares[key] || 0
        };
      });
    } catch (error) {
      console.warn("[PasTele] engagement counts unavailable:", error);
      return data.map(item => ({...item, likes_count:0, comments_count:0, shares_count:0}));
    }
  }

  let items = [];
  let activeFilter = "all";

  function card(row) {
    const type = targetType(row);
    const ti = typeInfo[type] || typeInfo.product;
    const paid = String(row?.access_type || "free").toLowerCase() === "paid";
    const thumb = row?.thumbnail_url;
    const views = Number(row?.views) || 0;
    const buys = Number(row?.sales_count) || 0;
    const likes = Number(row?.likes_count) || 0;
    const comments = Number(row?.comments_count) || 0;
    const category = row?.category ? esc(row.category) : "General";
    const href = publicUrl(row);

    return `
      <article class="ix-card">
        <a href="${esc(href)}" aria-label="Buka detail ${esc(row?.title || "konten")}">
          <div class="ix-thumb">
            ${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" decoding="async">` : `<i class="fa-solid ${ti.icon}" aria-hidden="true"></i>`}
            <span class="ix-type"><i class="fa-solid ${ti.icon}"></i> ${esc(ti.label)}</span>
            <span class="ix-price">${paid ? rupiah(row?.price) : "FREE"}</span>
          </div>

          <div class="ix-card-body">
            <div class="ix-card-title" title="${esc(row?.title || "Untitled")}">${esc(row?.title || "Untitled")}</div>
            <div class="ix-card-desc">${esc(row?.description || "Konten creator PasTele.")}</div>

            <div class="ix-card-creator">
              <span class="ix-avatar"><i class="fa-solid fa-user"></i></span>
              <span title="Username creator diprivasi">${creatorLabel(row)}</span>
            </div>

            <div class="ix-card-stats" aria-label="Statistik konten">
              <div class="ix-card-stat"><i class="fa-solid fa-eye"></i>Views<b>${fmt(views)}</b></div>
              <div class="ix-card-stat"><i class="fa-solid fa-bag-shopping"></i>Buy<b>${fmt(buys)}</b></div>
              <div class="ix-card-stat"><i class="fa-solid fa-heart"></i>Like<b>${fmt(likes)}</b></div>
              <div class="ix-card-stat"><i class="fa-solid fa-comment"></i>Komentar<b>${fmt(comments)}</b></div>
            </div>

            <div class="ix-card-footer">
              <span class="ix-open">Lihat detail <i class="fa-solid fa-arrow-right"></i></span>
              <span class="ix-access-note">${category}</span>
            </div>
          </div>
        </a>
      </article>
    `;
  }

  function render() {
    const grid = $("#marketGrid");
    const empty = $("#marketEmpty");
    if (!grid || !empty) return;

    const list = items.filter(x => {
      const t = targetType(x);
      if (activeFilter === "all") return true;
      if (activeFilter === "product") return ["product","link","paste"].includes(t);
      return t === activeFilter;
    });

    if (!list.length) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    grid.innerHTML = list.slice(0, 9).map(card).join("");
  }

  async function loadMarketplace() {
    const grid = $("#marketGrid");
    if (!grid) return;

    if (!sb) {
      grid.innerHTML = `
        <div class="ix-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <b>Database belum terkonfigurasi</b>
          <span>Periksa konfigurasi Supabase.</span>
        </div>`;
      return;
    }

    try {
      /*
       * Canonical public source from database.sql.
       * Required fields exist in marketplace_public.
       */
      const { data, error } = await sb.rpc("get_marketplace_public", {
        p_owner_id: null
      });

      if (error) throw error;

      items = await loadEngagementCounts(Array.isArray(data) ? data : []);
      render();
      updateStats();
    } catch (error) {
      console.error("[PasTele] marketplace:", error);
      grid.innerHTML = `
        <div class="ix-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <b>Marketplace belum dapat dimuat</b>
          <span>${esc(error?.message || "Terjadi kesalahan saat mengambil data.")}</span>
          <a href="marketplace.html" class="ix-btn ix-btn-soft">Buka Marketplace</a>
        </div>`;
    }
  }

  function updateStats() {
    const content = items.length;
    const views = items.reduce((a,x) => a + (Number(x?.views) || 0), 0);
    const sales = items.reduce((a,x) => a + (Number(x?.sales_count) || 0), 0);
    const creators = new Set(items.map(x => x?.owner_id).filter(Boolean)).size;

    if ($("#statContent")) $("#statContent").textContent = fmt(content);
    if ($("#statViews")) $("#statViews").textContent = fmt(views);
    if ($("#statSales")) $("#statSales").textContent = fmt(sales);
    if ($("#statCreators")) $("#statCreators").textContent = fmt(creators);
    if ($("#heroSales")) $("#heroSales").textContent = fmt(sales);
  }

  async function updateAuth() {
    if (!sb) return;
    try {
      const { data } = await sb.auth.getSession();
      const user = data?.session?.user;
      if (!user) return;

      const login = $("#loginBtn");
      const register = $("#registerBtn");
      if (login) {
        login.href = "dashboard.html";
        login.innerHTML = '<i class="fa-solid fa-gauge-high"></i><span>Dashboard</span>';
      }
      if (register) {
        register.href = "profile.html";
        register.innerHTML = '<i class="fa-solid fa-user"></i><span>Profil</span>';
      }
      $$("#mobileMenu a[href='login.html']").forEach(a => {
        a.href = "dashboard.html";
        a.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Dashboard';
      });
      $$("#mobileMenu a[href='register.html']").forEach(a => {
        a.href = "profile.html";
        a.innerHTML = '<i class="fa-solid fa-user"></i> Profil';
      });
    } catch (error) {
      console.warn("[PasTele] auth:", error);
    }
  }

  /*
   * Explicit theme selector.
   * No "auto" and no prefers-color-scheme.
   * The button is the user's control: click = light/dark.
   */
  function initTheme() {
    const root = document.documentElement;
    const btn = $("#themeBtn");
    if (!btn) return;

    let mode = localStorage.getItem("pastele-theme");
    if (mode !== "dark" && mode !== "light") mode = "light";

    const apply = (value) => {
      const normalized = value === "dark" ? "dark" : "light";
      root.dataset.theme = normalized;
      root.dataset.themeMode = normalized;
      localStorage.setItem("pastele-theme", normalized);
      btn.innerHTML = normalized === "dark"
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
      btn.title = normalized === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap";
      btn.setAttribute("aria-label", btn.title);
    };

    apply(mode);

    btn.onclick = () => {
      apply(root.dataset.theme === "dark" ? "light" : "dark");
    };
  }

  function initMenu() {
    const button = $("#menuBtn");
    const menu = $("#mobileMenu");
    if (!button || !menu) return;

    button.onclick = () => {
      menu.classList.toggle("open");
      const open = menu.classList.contains("open");
      button.innerHTML = `<i class="fa-solid ${open ? "fa-xmark" : "fa-bars"}"></i>`;
      button.setAttribute("aria-expanded", String(open));
    };

    $$("#mobileMenu a").forEach(a => a.addEventListener("click", () => {
      menu.classList.remove("open");
      button.innerHTML = '<i class="fa-solid fa-bars"></i>';
      button.setAttribute("aria-expanded", "false");
    }));
  }

  function initFilters() {
    $$("#marketFilter button").forEach(button => {
      button.addEventListener("click", () => {
        $$("#marketFilter button").forEach(x => x.classList.remove("active"));
        button.classList.add("active");
        activeFilter = String(button.dataset.filter || "all").toLowerCase();
        render();
      });
    });
  }


  function initFaq() {
    document.querySelectorAll(".ix-faq-grid details").forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        document.querySelectorAll(".ix-faq-grid details[open]").forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  function initHashLinks() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", () => {
        const menu = $("#mobileMenu");
        const button = $("#menuBtn");
        if (menu) menu.classList.remove("open");
        if (button) {
          button.innerHTML = '<i class="fa-solid fa-bars"></i>';
          button.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  function initYear() {
    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initYear();
    initTheme();
    initMenu();
    initFilters();
    initFaq();
    initHashLinks();
    await Promise.allSettled([updateAuth(), loadMarketplace()]);
  });

  window.ptNotify = window.ptNotify || function(message, type="info", title="PasTele") {
    const container = document.getElementById("ptToastContainer") || (() => {
      const x = document.createElement("div");
      x.id = "ptToastContainer";
      document.body.appendChild(x);
      return x;
    })();
    const icon = {
      success:"fa-circle-check",
      error:"fa-circle-xmark",
      warning:"fa-triangle-exclamation",
      info:"fa-circle-info"
    }[type] || "fa-circle-info";

    const safeTitle = String(title).replace(/[<>]/g, "");
    const safeMessage = String(message).replace(/[<>]/g, "");
    const el = document.createElement("div");
    el.className = `pt-toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icon}"></i><div><strong>${safeTitle}</strong><span>${safeMessage}</span></div>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  };
})();
