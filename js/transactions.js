/* =========================================================
   PasTele — Transactions
   Canonical page script
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);
  const profile = await TC.profile();
  if (!profile) {
    location.replace("login.html");
    return;
  }
  const state = {
    wallet: [],
    buys: [],
    sells: [],
    all: [],
    filter: "all",
    search: ""
  };
  const esc = (value) => TC.esc(String(value ?? ""));
  const money = (value) => {
    const amount = Number(value ?? 0);
    return TC.money(Math.abs(Number.isFinite(amount) ? amount : 0));
  };
  const date = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return "-";
    }
    return d.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };
  const lower = (value) => String(value ?? "").toLowerCase();
  /* =======================================================
     TYPE / ICON
     ======================================================= */
  const normalizeType = (value) => {
    let type = lower(value);
    type = type
      .replace(/^sell_/, "")
      .replace(/^buy_/, "")
      .trim();
    if (
      type === "paste_link" ||
      type === "pastelink" ||
      type === "paste-link"
    ) {
      return "paste";
    }
    if (!type) {
      return "link";
    }
    return type;
  };
  const typeLabel = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "Code";
      case "channel":
        return "Channel";
      case "group":
        return "Group";
      case "paste":
        return "Paste Link";
      case "link":
      default:
        return "Link";
    }
  };
  const iconForType = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "fa-code";
      case "channel":
        return "fa-broadcast-tower";
      case "group":
        return "fa-users";
      case "paste":
        return "fa-file-lines";
      case "link":
      default:
        return "fa-link";
    }
  };
  /* =======================================================
     STATUS
     ======================================================= */
  const statusClass = (status) => {
    const s = lower(status);
    if (
      ["completed", "paid", "success", "successful", "available"].includes(s)
    ) {
      return "success";
    }
    if (["pending", "processing"].includes(s)) {
      return "pending";
    }
    if (
      ["failed", "cancelled", "canceled", "rejected", "expired"].includes(s)
    ) {
      return "failed";
    }
    return "";
  };
  const statusLabel = (status) => {
    if (!status) return "completed";
    const s = String(status).trim();
    if (!s) return "completed";
    return s;
  };
  /* =======================================================
     AMOUNT
     ======================================================= */
  const amountOf = (item) => {
    const value =
      item?.net_amount ??
      item?.amount ??
      item?.total_amount ??
      0;
    const number = Number(value);
    return Number.isFinite(number) ? Math.abs(number) : 0;
  };
  /* =======================================================
     TITLE
     ======================================================= */
  const titleOf = (item) => {
    return (
      item?.item_title ||
      item?.products?.title ||
      item?.reference ||
      item?.description ||
      "Transaksi"
    );
  };
  /* =======================================================
     TYPE
     ======================================================= */
  const typeOf = (item) => {
    return normalizeType(
      item?.item_type ||
      item?.products?.type ||
      item?.type ||
      "link"
    );
  };
  /* =======================================================
     SIDE
     ======================================================= */
  const sideOfWallet = (item) => {
    const type = lower(item?.type);
    if (type.startsWith("sell_")) {
      return "SELL";
    }
    if (type.startsWith("buy_")) {
      return "BUY";
    }
    const status = lower(item?.status);
    /*
     * Withdrawal / wallet transactions are not forced into
     * BUY/SELL unless the existing transaction type clearly
     * says so.
     */
    if (
      type.includes("withdraw") ||
      type.includes("wd") ||
      type.includes("debit")
    ) {
      return "WALLET_OUT";
    }
    if (
      type.includes("deposit") ||
      type.includes("credit") ||
      type.includes("earning") ||
      type.includes("income")
    ) {
      return "WALLET_IN";
    }
    if (status === "paid") {
      return "WALLET_IN";
    }
    return "WALLET";
  };
  /* =======================================================
     TRANSACTION NORMALIZATION
     ======================================================= */
  const makeBuy = (item, source = "purchase") => {
    return {
      ...item,
      __side: "BUY",
      __source: source,
      __type: typeOf(item),
      __title: titleOf(item),
      __amount: amountOf(item),
      __status: item?.status || "completed",
      __date: item?.created_at || null
    };
  };
  const makeSell = (item, source = "order") => {
    return {
      ...item,
      __side: "SELL",
      __source: source,
      __type: typeOf(item),
      __title: titleOf(item),
      __amount: amountOf(item),
      __status: item?.status || "completed",
      __date: item?.created_at || null
    };
  };
  const makeWallet = (item) => {
    const side = sideOfWallet(item);
    return {
      ...item,
      __side: side,
      __source: "wallet",
      __type: typeOf(item),
      __title:
        item?.reference ||
        item?.description ||
        item?.item_title ||
        "Aktivitas wallet",
      __amount: amountOf(item),
      __status: item?.status || "completed",
      __date: item?.created_at || null
    };
  };
  /* =======================================================
     DUPLICATE KEY
     ======================================================= */
  const uniqueKey = (item) => {
    const source = item.__source || "tx";
    const id = item.id || "";
    if (id) {
      return `${source}:${id}`;
    }
    return [
      source,
      item.__side,
      item.__type,
      item.__title,
      item.__amount,
      item.__date
    ].join("|");
  };
  const unique = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = uniqueKey(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };
  /* =======================================================
     DATA LOADING
     ======================================================= */
  async function loadTransactions() {
    setLoading();
    try {
      const [
        txResult,
        purchaseResult,
        orderResult
      ] = await Promise.all([
        sb
          .from("transactions")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false }),
        sb
          .from("purchases")
          .select(
            "id,item_type,item_title,amount,status,created_at,products(title,type)"
          )
          .eq("buyer_id", profile.id)
          .order("created_at", { ascending: false }),
        sb
          .from("orders")
          .select(
            "id,product_id,amount,status,created_at,products(title,type)"
          )
          .eq("seller_id", profile.id)
          .order("created_at", { ascending: false })
      ]);
      if (txResult.error) {
        throw txResult.error;
      }
      if (purchaseResult.error) {
        throw purchaseResult.error;
      }
      if (orderResult.error) {
        throw orderResult.error;
      }
      const walletRows = txResult.data || [];
      const purchaseRows = purchaseResult.data || [];
      const orderRows = orderResult.data || [];
      /*
       * Existing transaction rows that explicitly represent
       * buy/sell activity.
       */
      const sellWalletRows = walletRows.filter((row) =>
        /^sell_/i.test(String(row.type || ""))
      );
      const buyWalletRows = walletRows.filter((row) =>
        /^buy_/i.test(String(row.type || ""))
      );
      /*
       * Existing non buy/sell transactions remain wallet
       * activity.
       */
      const walletOnlyRows = walletRows.filter((row) => {
        const type = String(row.type || "");
        return !/^sell_/i.test(type) && !/^buy_/i.test(type);
      });
      const buysFromPurchases = purchaseRows.map((row) =>
        makeBuy(row, "purchase")
      );
      const sellsFromOrders = orderRows.map((row) =>
        makeSell(row, "order")
      );
      const buysFromWallet = buyWalletRows.map((row) =>
        makeBuy(
          {
            ...row,
            item_type: typeOf(row),
            item_title:
              row.reference ||
              `Pembelian ${typeLabel(typeOf(row))}`,
            amount: row.net_amount ?? row.amount,
            status: row.status
          },
          "transaction"
        )
      );
      const sellsFromWallet = sellWalletRows.map((row) =>
        makeSell(
          {
            ...row,
            item_type: typeOf(row),
            item_title:
              row.reference ||
              `Penjualan ${typeLabel(typeOf(row))}`,
            amount: row.net_amount ?? row.amount,
            status: row.status
          },
          "transaction"
        )
      );
      const walletOnly = walletOnlyRows.map(makeWallet);
      /*
       * Preserve the existing data sources but prevent exact
       * duplicate rows from the same source.
       */
      state.buys = unique([
        ...buysFromPurchases,
        ...buysFromWallet
      ]);
      state.sells = unique([
        ...sellsFromOrders,
        ...sellsFromWallet
      ]);
      state.wallet = unique(walletOnly);
      state.all = unique([
        ...state.buys,
        ...state.sells,
        ...state.wallet
      ]).sort((a, b) => {
        const da = new Date(a.__date || 0).getTime();
        const db = new Date(b.__date || 0).getTime();
        return db - da;
      });
      renderSummary();
      render();
    } catch (error) {
      console.error("Transactions load error:", error);
      setError(error?.message || "Transaksi gagal dimuat.");
      TC.toast(
        error?.message || "Transaksi gagal dimuat",
        "error"
      );
    }
  }
  /* =======================================================
     SUMMARY
     ======================================================= */
  function renderSummary() {
    const summary = $("summary");
    if (!summary) return;
    const buyCount = state.buys.length;
    const sellCount = state.sells.length;
    const walletCount = state.wallet.length;
    const total = state.all.length;
    summary.innerHTML = `
      <div class="tx-summary-item">
        <span class="tx-summary-icon">
          <i class="fa-solid fa-cart-shopping"></i>
        </span>
        <div>
          <small>Total Buy</small>
          <strong>${buyCount}</strong>
        </div>
      </div>
      <div class="tx-summary-item">
        <span class="tx-summary-icon">
          <i class="fa-solid fa-store"></i>
        </span>
        <div>
          <small>Total Sell</small>
          <strong>${sellCount}</strong>
        </div>
      </div>
      <div class="tx-summary-item">
        <span class="tx-summary-icon">
          <i class="fa-solid fa-wallet"></i>
        </span>
        <div>
          <small>Wallet</small>
          <strong>${walletCount}</strong>
        </div>
      </div>
      <div class="tx-summary-item">
        <span class="tx-summary-icon">
          <i class="fa-solid fa-receipt"></i>
        </span>
        <div>
          <small>Total Aktivitas</small>
          <strong>${total}</strong>
        </div>
      </div>
    `;
  }
  /* =======================================================
     FILTER
     ======================================================= */
  function matchesFilter(item) {
    switch (state.filter) {
      case "buy":
        return item.__side === "BUY";
      case "sell":
        return item.__side === "SELL";
      case "wallet":
        return (
          item.__side === "WALLET" ||
          item.__side === "WALLET_IN" ||
          item.__side === "WALLET_OUT"
        );
      case "all":
      default:
        return true;
    }
  }
  function matchesSearch(item) {
    const query = state.search.trim().toLowerCase();
    if (!query) {
      return true;
    }
    const haystack = [
      item.__title,
      item.reference,
      item.description,
      item.type,
      item.item_type,
      item.item_title,
      item.status,
      item.id,
      item.__side,
      typeLabel(item.__type)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }
  function filteredItems() {
    return state.all.filter((item) => {
      return matchesFilter(item) && matchesSearch(item);
    });
  }
  /* =======================================================
     GROUP
     ======================================================= */
  function groupItems(items) {
    const groups = new Map();
    items.forEach((item) => {
      let key = "wallet";
      if (item.__side === "BUY") {
        key = `buy-${item.__type}`;
      } else if (item.__side === "SELL") {
        key = `sell-${item.__type}`;
      }
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });
    return groups;
  }
  const groupTitle = (key) => {
    if (key === "wallet") {
      return "Wallet";
    }
    const parts = key.split("-");
    const side = parts[0];
    const type = parts.slice(1).join("-");
    return `${side === "buy" ? "Pembelian" : "Penjualan"} ${typeLabel(type)}`;
  };
  const groupIcon = (key) => {
    if (key === "wallet") {
      return "fa-wallet";
    }
    const parts = key.split("-");
    const side = parts[0];
    const type = parts.slice(1).join("-");
    if (side === "buy") {
      return iconForType(type);
    }
    return iconForType(type);
  };
  /* =======================================================
     ROW
     ======================================================= */
  function renderRow(item) {
    const side = item.__side;
    let amountClass = "tx-neutral";
    let sign = "";
    if (side === "SELL" || side === "WALLET_IN") {
      amountClass = "tx-plus";
      sign = "+";
    } else if (side === "BUY" || side === "WALLET_OUT") {
      amountClass = "tx-minus";
      sign = "-";
    }
    const status = statusLabel(item.__status);
    const statusCls = statusClass(status);
    const metaSide =
      side === "BUY"
        ? "Buy"
        : side === "SELL"
          ? "Sell"
          : "Wallet";
    const typeText =
      side === "WALLET" ||
      side === "WALLET_IN" ||
      side === "WALLET_OUT"
        ? ""
        : typeLabel(item.__type);
    const metaParts = [
      metaSide,
      typeText,
      date(item.__date)
    ].filter(Boolean);
    return `
      <article class="tx-row">
        <span class="tx-row-icon">
          <i class="fa-solid ${iconForType(item.__type)}"></i>
        </span>
        <div class="tx-row-main">
          <strong class="tx-row-title">
            ${esc(item.__title)}
          </strong>
          <div class="tx-row-meta">
            ${metaParts
              .map((part, index) => `
                ${index > 0
                  ? '<span class="tx-row-meta-dot">•</span>'
                  : ""}
                <span>${esc(part)}</span>
              `)
              .join("")}
            <span class="tx-status ${statusCls}">
              ${esc(status)}
            </span>
          </div>
        </div>
        <div class="tx-row-amount">
          <strong class="${amountClass}">
            ${sign}${money(item.__amount)}
          </strong>
          ${
            item.id
              ? `<small>#${esc(String(item.id).slice(0, 10))}</small>`
              : ""
          }
        </div>
      </article>
    `;
  }
  /* =======================================================
     SECTION
     ======================================================= */
  function renderSection(title, icon, items) {
    return `
      <section class="tx-section">
        <div class="tx-section-head">
          <div class="tx-section-title">
            <span class="tx-section-icon">
              <i class="fa-solid ${icon}"></i>
            </span>
            <h2>${esc(title)}</h2>
          </div>
          <span class="tx-section-count">
            ${items.length}
          </span>
        </div>
        <div class="tx-rows">
          ${items.map(renderRow).join("")}
        </div>
      </section>
    `;
  }
  /* =======================================================
     RENDER
     ======================================================= */
  function render() {
    const content = $("content");
    if (!content) return;
    const items = filteredItems();
    updateResultBar(items.length);
    if (!items.length) {
      content.innerHTML = `
        <div class="tx-empty">
          <span class="tx-empty-icon">
            <i class="fa-solid fa-receipt"></i>
          </span>
          <div>
            <strong>
              ${
                state.search || state.filter !== "all"
                  ? "Transaksi tidak ditemukan"
                  : "Belum ada transaksi"
              }
            </strong>
            <small>
              ${
                state.search || state.filter !== "all"
                  ? "Coba ubah kata pencarian atau filter."
                  : "Aktivitas transaksi kamu akan muncul di sini."
              }
            </small>
          </div>
        </div>
      `;
      return;
    }
    const groups = groupItems(items);
    const order = [
      "buy-link",
      "buy-paste",
      "buy-code",
      "buy-channel",
      "buy-group",
      "sell-link",
      "sell-paste",
      "sell-code",
      "sell-channel",
      "sell-group",
      "wallet"
    ];
    const html = [];
    order.forEach((key) => {
      if (!groups.has(key)) return;
      const group = groups.get(key);
      if (!group.length) return;
      html.push(
        renderSection(
          groupTitle(key),
          groupIcon(key),
          group
        )
      );
    });
    /*
     * Safety fallback for any future/unknown product type
     * already present in the real database.
     */
    groups.forEach((group, key) => {
      if (order.includes(key)) return;
      html.push(
        renderSection(
          groupTitle(key),
          groupIcon(key),
          group
        )
      );
    });
    content.innerHTML = html.join("");
  }
  /* =======================================================
     RESULT BAR
     ======================================================= */
  function updateResultBar(count) {
    const label = $("resultLabel");
    const counter = $("resultCount");
    const reset = $("resetFilters");
    if (label) {
      if (state.filter === "all") {
        label.textContent = "Semua transaksi";
      } else if (state.filter === "buy") {
        label.textContent = "Transaksi Buy";
      } else if (state.filter === "sell") {
        label.textContent = "Transaksi Sell";
      } else {
        label.textContent = "Aktivitas Wallet";
      }
    }
    if (counter) {
      counter.textContent =
        `${count} transaksi`;
    }
    if (reset) {
      reset.hidden =
        state.filter === "all" &&
        !state.search.trim();
    }
  }
  /* =======================================================
     LOADING
     ======================================================= */
  function setLoading() {
    const content = $("content");
    if (!content) return;
    content.innerHTML = `
      <div class="tx-loading">
        <span class="tx-spinner">
          <i class="fa-solid fa-circle-notch"></i>
        </span>
        <div>
          <strong>Memuat transaksi</strong>
          <small>Mengambil data dari database...</small>
        </div>
      </div>
    `;
    const counter = $("resultCount");
    if (counter) {
      counter.textContent = "Memuat...";
    }
  }
  /* =======================================================
     ERROR
     ======================================================= */
  function setError(message) {
    const content = $("content");
    if (!content) return;
    content.innerHTML = `
      <div class="tx-error">
        <span class="tx-error-icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </span>
        <div>
          <strong>Transaksi gagal dimuat</strong>
          <small>
            ${esc(message)}
          </small>
          <button
            type="button"
            class="btn"
            id="retryTransactions"
          >
            <i class="fa-solid fa-rotate-right"></i>
            Coba lagi
          </button>
        </div>
      </div>
    `;
    $("retryTransactions")?.addEventListener(
      "click",
      loadTransactions
    );
  }
  /* =======================================================
     SEARCH
     ======================================================= */
  const searchInput = $("searchInput");
  const clearSearch = $("clearSearch");
  function updateSearchUI() {
    if (!clearSearch) return;
    clearSearch.hidden =
      !state.search.trim();
  }
  searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value || "";
    updateSearchUI();
    render();
  });
  clearSearch?.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
    }
    state.search = "";
    updateSearchUI();
    render();
    searchInput?.focus();
  });
  /* =======================================================
     FILTER BUTTONS
     ======================================================= */
  document
    .querySelectorAll(".tx-filter")
    .forEach((button) => {
      button.addEventListener("click", () => {
        state.filter =
          button.dataset.filter || "all";
        document
          .querySelectorAll(".tx-filter")
          .forEach((item) => {
            item.classList.toggle(
              "active",
              item === button
            );
          });
        render();
      });
    });
  /* =======================================================
     RESET
     ======================================================= */
  $("resetFilters")?.addEventListener("click", () => {
    state.filter = "all";
    state.search = "";
    if (searchInput) {
      searchInput.value = "";
    }
    document
      .querySelectorAll(".tx-filter")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.filter === "all"
        );
      });
    updateSearchUI();
    render();
  });
  /* =======================================================
     REFRESH
     ======================================================= */
  $("refreshBtn")?.addEventListener("click", async () => {
    const button = $("refreshBtn");
    if (button?.dataset.loading === "1") {
      return;
    }
    if (button) {
      button.dataset.loading = "1";
      button.disabled = true;
      button.innerHTML = `
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <span>Memuat...</span>
      `;
    }
    try {
      await loadTransactions();
    } finally {
      if (button) {
        button.dataset.loading = "0";
        button.disabled = false;
        button.innerHTML = `
          <i class="fa-solid fa-rotate-right"></i>
          <span>Refresh</span>
        `;
      }
    }
  });
  /* =======================================================
     INITIAL LOAD
     ======================================================= */
  await loadTransactions();
});
