/* =========================================================
   PasTele — Purchases
   FINAL PREMIUM
   Search + Filter + Sort + Pagination + Stats
   Supabase + Responsive UI
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  /* =======================================================
     DOM
     ======================================================= */

  const $ = (selector, root = document) => {
    try {
      return root.querySelector(selector);
    } catch {
      return null;
    }
  };

  const $$ = (selector, root = document) => {
    try {
      return [...root.querySelectorAll(selector)];
    } catch {
      return [];
    }
  };

  const content = $("#content");
  const toastBox = $("#toast");

  const searchInput = $("#purchaseSearch");
  const clearSearchBtn = $("#clearPurchaseSearch");

  const statusFilter = $("#purchaseStatus");
  const typeFilter = $("#purchaseType");
  const sortFilter = $("#purchaseSort");
  const resetFilterBtn = $("#resetPurchaseFilters");

  const refreshBtn = $("#refreshPurchases");

  const resultText = $("#purchaseResultText");

  const pagination = $("#purchasePagination");

  const totalPurchasesEl = $("#totalPurchases");
  const successfulPurchasesEl = $("#successfulPurchases");
  const pendingPurchasesEl = $("#pendingPurchases");
  const totalSpentEl = $("#totalSpent");


  /* =======================================================
     STATE
     ======================================================= */

  const state = {
    user: null,
    rows: [],
    filteredRows: [],
    page: 1,
    pageSize: 8,
    search: "",
    status: "all",
    type: "all",
    sort: "newest",
    loading: false
  };


  /* =======================================================
     SAFE GLOBALS
     ======================================================= */

  const TC = window.TC || {};
  const sb = window.sb || window.supabaseClient || null;


  /* =======================================================
     HELPERS
     ======================================================= */

  const esc = (value) => {
    if (typeof TC.esc === "function") {
      return TC.esc(value);
    }

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };


  const money = (value) => {
    const amount = Number(value || 0);

    if (typeof TC.money === "function") {
      try {
        return TC.money(amount);
      } catch {}
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };


  const toast = (message, type = "info") => {
    if (typeof TC.toast === "function") {
      try {
        TC.toast(message, type);
        return;
      } catch {}
    }

    if (!toastBox) return;

    toastBox.textContent = message;
    toastBox.className = `toast toast-${type}`;

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
      toastBox.textContent = "";
      toastBox.className = "";
    }, 3200);
  };


  const normalizeType = (value) => {
    const type = String(value || "")
      .trim()
      .toLowerCase();

    if (
      type === "link" ||
      type === "paste" ||
      type === "pastelink" ||
      type === "paste-link" ||
      type === "paste_link"
    ) {
      return "link";
    }

    if (
      type === "telegram_channel" ||
      type === "telegram-channel"
    ) {
      return "channel";
    }

    if (
      type === "telegram_group" ||
      type === "telegram-group"
    ) {
      return "group";
    }

    return type || "link";
  };


  const normalizeStatus = (value) => {
    const status = String(value || "")
      .trim()
      .toLowerCase();

    if (
      status === "success" ||
      status === "successful" ||
      status === "completed" ||
      status === "complete" ||
      status === "paid"
    ) {
      return "paid";
    }

    if (
      status === "cancel" ||
      status === "cancelled" ||
      status === "canceled"
    ) {
      return "cancelled";
    }

    if (
      status === "failed" ||
      status === "error" ||
      status === "expired"
    ) {
      return "failed";
    }

    if (
      status === "pending" ||
      status === "waiting" ||
      status === "unpaid"
    ) {
      return "pending";
    }

    return status || "pending";
  };


  const typeLabel = (type) => {
    switch (normalizeType(type)) {
      case "link":
        return "PasteLink";

      case "code":
        return "Code";

      case "channel":
        return "Channel";

      case "group":
        return "Group";

      default:
        return "Produk";
    }
  };


  const typeIcon = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "fa-code";

      case "channel":
        return "fa-broadcast-tower";

      case "group":
        return "fa-users";

      case "link":
      default:
        return "fa-link";
    }
  };


  const statusLabel = (status) => {
    switch (normalizeStatus(status)) {
      case "paid":
        return "Berhasil";

      case "pending":
        return "Pending";

      case "failed":
        return "Gagal";

      case "cancelled":
        return "Dibatalkan";

      default:
        return String(status || "Pending");
    }
  };


  const statusIcon = (status) => {
    switch (normalizeStatus(status)) {
      case "paid":
        return "fa-circle-check";

      case "pending":
        return "fa-clock";

      case "failed":
        return "fa-circle-xmark";

      case "cancelled":
        return "fa-ban";

      default:
        return "fa-circle-question";
    }
  };


  const formatDate = (date) => {
    if (!date) return "Tanggal tidak tersedia";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Tanggal tidak tersedia";
    }

    return parsed.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };


  const getProductTitle = (row) => {
    return (
      row?.item_title ||
      row?.products?.title ||
      row?.product?.title ||
      "Produk"
    );
  };


  const getProductType = (row) => {
    return normalizeType(
      row?.item_type ||
      row?.products?.type ||
      row?.product?.type ||
      "link"
    );
  };


  const getProductId = (row) => {
    return (
      row?.item_id ||
      row?.product_id ||
      null
    );
  };


  const getAccessUrl = (row) => {
    const id = getProductId(row);

    if (!id) {
      return null;
    }

    const type = getProductType(row);

    return `product.html?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`;
  };


  const getSearchText = (row) => {
    const title = getProductTitle(row);

    const type = typeLabel(getProductType(row));

    const status = statusLabel(row?.status);

    const id =
      row?.id ||
      row?.item_id ||
      row?.product_id ||
      "";

    return [
      title,
      type,
      status,
      id
    ]
      .join(" ")
      .toLowerCase();
  };


  /* =======================================================
     AUTH
     ======================================================= */

  const getUserProfile = async () => {
    try {
      if (typeof TC.profile === "function") {
        const profile = await TC.profile();

        if (profile) {
          return profile;
        }
      }
    } catch (error) {
      console.warn(
        "[Purchases] TC.profile() failed:",
        error
      );
    }

    try {
      if (!sb?.auth?.getUser) {
        return null;
      }

      const {
        data,
        error
      } = await sb.auth.getUser();

      if (error || !data?.user) {
        return null;
      }

      return data.user;
    } catch (error) {
      console.warn(
        "[Purchases] Supabase auth failed:",
        error
      );

      return null;
    }
  };


  /* =======================================================
     AUTH CHECK
     ======================================================= */

  state.user = await getUserProfile();

  if (!state.user) {
    location.replace("login.html");
    return;
  }


  /* =======================================================
     LOADING
     ======================================================= */

  const setLoading = (loading) => {
    state.loading = Boolean(loading);

    if (content) {
      content.setAttribute(
        "aria-busy",
        loading ? "true" : "false"
      );
    }

    if (refreshBtn) {
      refreshBtn.disabled = loading;

      refreshBtn.classList.toggle(
        "is-loading",
        loading
      );

      const icon = $("i", refreshBtn);

      if (icon) {
        icon.classList.toggle(
          "fa-spin",
          loading
        );
      }
    }
  };


  const renderLoading = () => {
    if (!content) return;

    content.innerHTML = `
      <div class="purchases-loading">

        <div
          class="purchases-loading-icon"
          aria-hidden="true"
        >
          <i class="fa-solid fa-spinner fa-spin"></i>
        </div>

        <div class="purchases-loading-text">

          <strong>
            Memuat pembelian
          </strong>

          <span>
            Sedang mengambil riwayat pembelian kamu...
          </span>

        </div>

      </div>
    `;
  };


  /* =======================================================
     FETCH PURCHASES
     ======================================================= */

  const fetchPurchases = async () => {
    if (!sb) {
      throw new Error(
        "Supabase belum tersedia. Periksa konfigurasi."
      );
    }

    const buyerId =
      state.user?.id ||
      state.user?.user_id;

    if (!buyerId) {
      throw new Error(
        "ID akun tidak ditemukan. Silakan login kembali."
      );
    }

    const query = sb
      .from("purchases")
      .select(`
        id,
        product_id,
        amount,
        status,
        created_at,
        item_type,
        item_id,
        item_title,
        products (
          title,
          type
        )
      `)
      .eq("buyer_id", buyerId)
      .order("created_at", {
        ascending: false
      });

    const {
      data,
      error
    } = await query;

    if (error) {
      throw error;
    }

    return Array.isArray(data)
      ? data
      : [];
  };


  /* =======================================================
     LOAD
     ======================================================= */

  const loadPurchases = async ({
    silent = false
  } = {}) => {

    if (state.loading) {
      return;
    }

    try {

      setLoading(true);

      if (!silent) {
        renderLoading();
      }

      const rows = await fetchPurchases();

      state.rows = rows.map(row => ({
        ...row,

        _type: getProductType(row),

        _status: normalizeStatus(row.status),

        _title: getProductTitle(row),

        _productId: getProductId(row),

        _amount: Number(row.amount || 0),

        _timestamp: new Date(
          row.created_at || 0
        ).getTime()
      }));

      state.page = 1;

      updateStats();

      applyFilters();

    } catch (error) {

      console.error(
        "[Purchases] Load error:",
        error
      );

      renderError(
        error?.message ||
        "Gagal memuat riwayat pembelian."
      );

      toast(
        "Gagal memuat pembelian.",
        "error"
      );

    } finally {

      setLoading(false);

    }
  };


  /* =======================================================
     STATISTICS
     ======================================================= */

  const updateStats = () => {

    const rows = state.rows;

    const total = rows.length;

    const successful = rows.filter(
      row => row._status === "paid"
    ).length;

    const pending = rows.filter(
      row => row._status === "pending"
    ).length;

    const spent = rows
      .filter(row => row._status === "paid")
      .reduce(
        (sum, row) => sum + row._amount,
        0
      );

    if (totalPurchasesEl) {
      totalPurchasesEl.textContent =
        total.toLocaleString("id-ID");
    }

    if (successfulPurchasesEl) {
      successfulPurchasesEl.textContent =
        successful.toLocaleString("id-ID");
    }

    if (pendingPurchasesEl) {
      pendingPurchasesEl.textContent =
        pending.toLocaleString("id-ID");
    }

    if (totalSpentEl) {
      totalSpentEl.textContent =
        money(spent);
    }
  };


  /* =======================================================
     FILTER
     ======================================================= */

  const applyFilters = () => {

    const search = String(
      state.search || ""
    )
      .trim()
      .toLowerCase();

    let rows = [...state.rows];


    /* Search */

    if (search) {
      rows = rows.filter(row =>
        getSearchText(row).includes(search)
      );
    }


    /* Status */

    if (state.status !== "all") {
      rows = rows.filter(
        row => row._status === state.status
      );
    }


    /* Type */

    if (state.type !== "all") {
      rows = rows.filter(
        row => row._type === state.type
      );
    }


    /* Sort */

    switch (state.sort) {

      case "oldest":

        rows.sort(
          (a, b) =>
            a._timestamp - b._timestamp
        );

        break;


      case "price-high":

        rows.sort(
          (a, b) =>
            b._amount - a._amount
        );

        break;


      case "price-low":

        rows.sort(
          (a, b) =>
            a._amount - b._amount
        );

        break;


      case "newest":
      default:

        rows.sort(
          (a, b) =>
            b._timestamp - a._timestamp
        );

        break;
    }


    state.filteredRows = rows;

    const totalPages = Math.max(
      1,
      Math.ceil(
        rows.length / state.pageSize
      )
    );

    if (state.page > totalPages) {
      state.page = totalPages;
    }

    renderPurchases();

    renderPagination();

    updateResultBar();

    updateSearchClear();

  };


  /* =======================================================
     RESULT BAR
     ======================================================= */

  const updateResultBar = () => {

    if (!resultText) {
      return;
    }

    const total = state.filteredRows.length;

    const all = state.rows.length;

    if (!all) {

      resultText.textContent =
        "Belum ada pembelian";

      return;
    }

    if (total === all) {

      resultText.textContent =
        `${all.toLocaleString("id-ID")} pembelian`;

      return;
    }

    resultText.textContent =
      `${total.toLocaleString("id-ID")} dari ${all.toLocaleString("id-ID")} pembelian`;
  };


  /* =======================================================
     SEARCH CLEAR
     ======================================================= */

  const updateSearchClear = () => {

    if (!clearSearchBtn) {
      return;
    }

    clearSearchBtn.hidden =
      !String(
        searchInput?.value || ""
      ).trim();
  };


  /* =======================================================
     RENDER PURCHASES
     ======================================================= */

  const renderPurchases = () => {

    if (!content) {
      return;
    }

    const rows = state.filteredRows;

    if (!rows.length) {

      renderEmpty();

      return;
    }


    const start =
      (state.page - 1) *
      state.pageSize;

    const end =
      start +
      state.pageSize;

    const pageRows =
      rows.slice(start, end);


    content.innerHTML = `
      <div class="purchase-list">

        ${pageRows
          .map(renderPurchaseRow)
          .join("")}

      </div>
    `;

    content.setAttribute(
      "aria-busy",
      "false"
    );


    bindPurchaseActions();
  };


  /* =======================================================
     PURCHASE ROW
     ======================================================= */

  const renderPurchaseRow = (row) => {

    const type = row._type;

    const status = row._status;

    const title = esc(row._title);

    const amount = money(row._amount);

    const date = esc(
      formatDate(row.created_at)
    );

    const id = esc(
      row.id || ""
    );

    const productId =
      row._productId
        ? esc(row._productId)
        : "";

    const accessUrl =
      getAccessUrl(row);

    const canAccess =
      status === "paid" &&
      Boolean(accessUrl);


    return `
      <article
        class="purchase-item"
        data-purchase-id="${id}"
        data-type="${esc(type)}"
        data-status="${esc(status)}"
      >

        <div
          class="purchase-item-icon type-${esc(type)}"
          aria-hidden="true"
        >

          <i
            class="fa-solid ${typeIcon(type)}"
          ></i>

        </div>


        <div class="purchase-item-main">

          <div class="purchase-item-top">

            <span class="purchase-type">
              ${esc(typeLabel(type))}
            </span>

            <span
              class="purchase-status status-${esc(status)}"
            >

              <i
                class="fa-solid ${statusIcon(status)}"
                aria-hidden="true"
              ></i>

              ${esc(statusLabel(status))}

            </span>

          </div>


          <h3 class="purchase-title">
            ${title}
          </h3>


          <div class="purchase-meta">

            <span>

              <i
                class="fa-regular fa-calendar"
                aria-hidden="true"
              ></i>

              ${date}

            </span>


            ${
              productId
                ? `
                  <span>

                    <i
                      class="fa-solid fa-hashtag"
                      aria-hidden="true"
                    ></i>

                    ${productId}

                  </span>
                `
                : ""
            }

          </div>

        </div>


        <div class="purchase-item-price">

          <span>
            Total
          </span>

          <strong>
            ${amount}
          </strong>

        </div>


        <div class="purchase-item-actions">

          ${
            canAccess
              ? `
                <a
                  class="purchase-access-btn"
                  href="${esc(accessUrl)}"
                  title="Buka produk"
                  aria-label="Buka ${title}"
                >

                  <i
                    class="fa-solid fa-arrow-up-right-from-square"
                    aria-hidden="true"
                  ></i>

                  <span>
                    Buka
                  </span>

                </a>
              `
              : `
                <button
                  type="button"
                  class="purchase-access-btn is-disabled"
                  disabled
                  title="Produk belum dapat diakses"
                  aria-label="Produk belum dapat diakses"
                >

                  <i
                    class="fa-solid fa-lock"
                    aria-hidden="true"
                  ></i>

                  <span>
                    Akses
                  </span>

                </button>
              `
          }


          <button
            type="button"
            class="purchase-delete-btn"
            data-delete-purchase="${id}"
            title="Hapus dari daftar pembelian"
            aria-label="Hapus ${title} dari daftar pembelian"
          >

            <i
              class="fa-solid fa-trash-can"
              aria-hidden="true"
            ></i>

          </button>

        </div>

      </article>
    `;
  };


  /* =======================================================
     EMPTY
     ======================================================= */

  const renderEmpty = () => {

    if (!content) {
      return;
    }

    const hasFilters =
      Boolean(state.search) ||
      state.status !== "all" ||
      state.type !== "all";


    if (hasFilters) {

      content.innerHTML = `
        <div class="purchases-empty">

          <div class="purchases-empty-icon">
            <i
              class="fa-solid fa-filter-circle-xmark"
              aria-hidden="true"
            ></i>
          </div>

          <h3>
            Tidak ada hasil
          </h3>

          <p>
            Tidak ada pembelian yang cocok dengan pencarian atau filter kamu.
          </p>

          <button
            type="button"
            class="purchases-empty-btn"
            id="emptyResetFilters"
          >

            <i
              class="fa-solid fa-arrow-rotate-left"
              aria-hidden="true"
            ></i>

            Reset Filter

          </button>

        </div>
      `;

      const reset =
        $("#emptyResetFilters");

      reset?.addEventListener(
        "click",
        resetFilters
      );

      return;
    }


    content.innerHTML = `
      <div class="purchases-empty">

        <div class="purchases-empty-icon">
          <i
            class="fa-solid fa-cart-shopping"
            aria-hidden="true"
          ></i>
        </div>

        <h3>
          Belum Ada Pembelian
        </h3>

        <p>
          Produk yang kamu beli akan muncul di sini.
        </p>

        <a
          href="marketplace.html"
          class="purchases-empty-btn"
        >

          <i
            class="fa-solid fa-store"
            aria-hidden="true"
          ></i>

          Jelajahi Marketplace

        </a>

      </div>
    `;
  };


  /* =======================================================
     ERROR
     ======================================================= */

  const renderError = (message) => {

    if (!content) {
      return;
    }

    content.setAttribute(
      "aria-busy",
      "false"
    );

    content.innerHTML = `
      <div class="purchases-error">

        <div class="purchases-error-icon">

          <i
            class="fa-solid fa-triangle-exclamation"
            aria-hidden="true"
          ></i>

        </div>


        <h3>
          Gagal Memuat Pembelian
        </h3>


        <p>
          ${esc(message)}
        </p>


        <button
          type="button"
          class="purchases-error-btn"
          id="retryPurchases"
        >

          <i
            class="fa-solid fa-rotate-right"
            aria-hidden="true"
          ></i>

          Coba Lagi

        </button>

      </div>
    `;


    $("#retryPurchases")
      ?.addEventListener(
        "click",
        () => loadPurchases()
      );
  };


  /* =======================================================
     PAGINATION
     ======================================================= */

  const renderPagination = () => {

    if (!pagination) {
      return;
    }

    const total =
      state.filteredRows.length;

    const totalPages =
      Math.ceil(
        total /
        state.pageSize
      );


    if (totalPages <= 1) {

      pagination.innerHTML = "";

      pagination.hidden = true;

      return;
    }


    pagination.hidden = false;


    const buttons = [];


    buttons.push(`
      <button
        type="button"
        class="purchase-page-btn purchase-page-prev"
        data-page="${state.page - 1}"
        ${state.page <= 1 ? "disabled" : ""}
        aria-label="Halaman sebelumnya"
        title="Halaman sebelumnya"
      >

        <i
          class="fa-solid fa-chevron-left"
          aria-hidden="true"
        ></i>

      </button>
    `);


    const pageNumbers =
      buildPageNumbers(
        state.page,
        totalPages
      );


    pageNumbers.forEach(page => {

      if (page === "...") {

        buttons.push(`
          <span
            class="purchase-page-dots"
            aria-hidden="true"
          >
            …
          </span>
        `);

        return;
      }


      buttons.push(`
        <button
          type="button"
          class="purchase-page-btn ${
            page === state.page
              ? "active"
              : ""
          }"
          data-page="${page}"
          ${
            page === state.page
              ? 'aria-current="page"'
              : ""
          }
        >
          ${page}
        </button>
      `);

    });


    buttons.push(`
      <button
        type="button"
        class="purchase-page-btn purchase-page-next"
        data-page="${state.page + 1}"
        ${
          state.page >= totalPages
            ? "disabled"
            : ""
        }
        aria-label="Halaman berikutnya"
        title="Halaman berikutnya"
      >

        <i
          class="fa-solid fa-chevron-right"
          aria-hidden="true"
        ></i>

      </button>
    `);


    pagination.innerHTML =
      buttons.join("");


    $$(".purchase-page-btn", pagination)
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            if (button.disabled) {
              return;
            }

            const page =
              Number(
                button.dataset.page
              );

            if (!Number.isFinite(page)) {
              return;
            }

            if (
              page < 1 ||
              page > totalPages
            ) {
              return;
            }

            state.page = page;

            renderPurchases();

            renderPagination();

            updateResultBar();

            window.scrollTo({
              top: 0,
              behavior: "smooth"
            });

          }
        );

      });
  };


  const buildPageNumbers = (
    current,
    total
  ) => {

    if (total <= 7) {
      return Array.from(
        { length: total },
        (_, i) => i + 1
      );
    }


    const pages = [
      1
    ];


    if (current > 4) {
      pages.push("...");
    }


    const start =
      Math.max(
        2,
        current - 1
      );

    const end =
      Math.min(
        total - 1,
        current + 1
      );


    for (
      let i = start;
      i <= end;
      i++
    ) {
      pages.push(i);
    }


    if (current < total - 3) {
      pages.push("...");
    }


    pages.push(total);

    return pages;
  };


  /* =======================================================
     PURCHASE ACTIONS
     ======================================================= */

  const bindPurchaseActions = () => {

    $$("[data-delete-purchase]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => deletePurchase(
            button.dataset.deletePurchase,
            button
          )
        );

      });

  };


  /* =======================================================
     DELETE PURCHASE
     ======================================================= */

  const deletePurchase = async (
    purchaseId,
    button
  ) => {

    if (!purchaseId) {
      return;
    }


    const confirmed =
      window.confirm(
        "Hapus pembelian ini dari daftar pembelian?\n\nAkses produk tidak otomatis dibatalkan."
      );


    if (!confirmed) {
      return;
    }


    if (button) {
      button.disabled = true;

      button.classList.add(
        "is-loading"
      );

      const icon = $("i", button);

      if (icon) {
        icon.className =
          "fa-solid fa-spinner fa-spin";
      }
    }


    try {

      if (!sb) {
        throw new Error(
          "Supabase belum tersedia."
        );
      }


      const {
        error
      } = await sb.rpc(
        "delete_purchase",
        {
          p_id: purchaseId
        }
      );


      if (error) {
        throw error;
      }


      state.rows =
        state.rows.filter(
          row =>
            String(row.id) !==
            String(purchaseId)
        );


      updateStats();

      applyFilters();

      toast(
        "Pembelian berhasil dihapus dari daftar.",
        "success"
      );


    } catch (error) {

      console.error(
        "[Purchases] Delete error:",
        error
      );

      toast(
        error?.message ||
        "Gagal menghapus pembelian.",
        "error"
      );


      if (button) {

        button.disabled = false;

        button.classList.remove(
          "is-loading"
        );

        const icon = $("i", button);

        if (icon) {
          icon.className =
            "fa-solid fa-trash-can";
        }

      }

    }

  };


  /* =======================================================
     RESET FILTERS
     ======================================================= */

  const resetFilters = () => {

    state.search = "";
    state.status = "all";
    state.type = "all";
    state.sort = "newest";
    state.page = 1;


    if (searchInput) {
      searchInput.value = "";
    }

    if (statusFilter) {
      statusFilter.value = "all";
    }

    if (typeFilter) {
      typeFilter.value = "all";
    }

    if (sortFilter) {
      sortFilter.value = "newest";
    }


    updateSearchClear();

    applyFilters();

  };


  /* =======================================================
     EVENTS
     ======================================================= */

  searchInput?.addEventListener(
    "input",
    () => {

      state.search =
        searchInput.value || "";

      state.page = 1;

      updateSearchClear();

      applyFilters();

    }
  );


  clearSearchBtn?.addEventListener(
    "click",
    () => {

      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }

      state.search = "";

      state.page = 1;

      updateSearchClear();

      applyFilters();

    }
  );


  statusFilter?.addEventListener(
    "change",
    () => {

      state.status =
        statusFilter.value || "all";

      state.page = 1;

      applyFilters();

    }
  );


  typeFilter?.addEventListener(
    "change",
    () => {

      state.type =
        normalizeType(
          typeFilter.value
        );

      if (
        typeFilter.value === "all"
      ) {
        state.type = "all";
      }

      state.page = 1;

      applyFilters();

    }
  );


  sortFilter?.addEventListener(
    "change",
    () => {

      state.sort =
        sortFilter.value || "newest";

      state.page = 1;

      applyFilters();

    }
  );


  resetFilterBtn?.addEventListener(
    "click",
    resetFilters
  );


  refreshBtn?.addEventListener(
    "click",
    () => loadPurchases()
  );


  /* =======================================================
     KEYBOARD SHORTCUT
     ======================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {

        if (
          document.activeElement !==
          searchInput
        ) {

          event.preventDefault();

          searchInput?.focus();

        }

      }

    }
  );


  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  await loadPurchases();

});
