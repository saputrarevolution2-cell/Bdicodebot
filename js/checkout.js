/* =========================================================
   PasTele — CHECKOUT
   FINAL PRODUCTION
   SUPABASE + MARKETPLACE + PAYMENT
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  /* =======================================================
     DOM
     ======================================================= */
  const state = $("checkoutState");
  const content = $("checkoutContent");
  const errorBox = $("checkoutError");
  const payBtn = $("continuePayment");
  /* =======================================================
     HELPERS
     ======================================================= */
  const money = (value) => {
    const amount = Number(value || 0);
    if (window.TC?.money) {
      return window.TC.money(amount);
    }
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };
  const esc = (value) => {
    if (window.TC?.esc) {
      return window.TC.esc(value);
    }
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
    );
  };
  const rpcRow = (data) => {
    if (Array.isArray(data)) {
      return data[0] || null;
    }
    return data || null;
  };
  const showError = (message) => {
    if (state) {
      state.hidden = true;
    }
    if (content) {
      content.hidden = true;
    }
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>
        ${esc(message)}
        <br><br>
        <a href="marketplace.html">Kembali ke marketplace</a>
      `;
    }
  };
  /* =======================================================
     READ URL
     ======================================================= */
  const params =
    new URLSearchParams(location.search);
  const rawType =
    String(params.get("type") || "link")
      .trim()
      .toLowerCase();
  const id =
    String(params.get("id") || "").trim();
  /*
   * Alias lama → tipe canonical.
   *
   * get_market_item_detail()
   * menggunakan p_type + p_id.
   */
  const typeMap = {
    paste: "link",
    pastelink: "link",
    "paste-link": "link",
    paste_link: "link"
  };
  const normalizedType =
    typeMap[rawType] || rawType;
  /*
   * Tipe yang memang dapat diproses
   * oleh marketplace final.
   */
  const allowedTypes = new Set([
    "product",
    "code",
    "telegram_product",
    "telegram_channel",
    "channel",
    "group",
    "link",
    "pastelink"
  ]);
  /* =======================================================
     INITIAL STATE
     ======================================================= */
  try {
    if (!window.sb?.rpc) {
      throw new Error(
        "Supabase belum siap. Silakan refresh halaman."
      );
    }
    if (!id) {
      throw new Error(
        "ID produk tidak ditemukan."
      );
    }
    if (!allowedTypes.has(normalizedType)) {
      throw new Error(
        "Jenis produk tidak didukung."
      );
    }
    /* =====================================================
       AUTH
       ===================================================== */
    let user = null;
    try {
      if (
        typeof window.TC?.user === "function"
      ) {
        user = await window.TC.user();
      } else {
        const { data, error } =
          await window.sb.auth.getUser();
        if (!error) {
          user = data?.user || null;
        }
      }
    } catch (authError) {
      console.warn(
        "[PasTele Checkout] Auth check:",
        authError
      );
      user = null;
    }
    if (!user) {
      const next =
        encodeURIComponent(
          location.href
        );
      location.replace(
        `login.html?redirect=${next}`
      );
      return;
    }
    /* =====================================================
       LOAD PRODUCT
       ===================================================== */
    const result =
      await window.sb.rpc(
        "get_market_item_detail",
        {
          p_type: normalizedType,
          p_id: id
        }
      );
    if (result.error) {
      throw result.error;
    }
    const product =
      rpcRow(result.data);
    if (!product) {
      throw new Error(
        "Produk tidak ditemukan atau sudah tidak tersedia."
      );
    }
    /* =====================================================
       ACCESS CHECK
       ===================================================== */
    if (product.can_access === true) {
      throw new Error(
        "Kamu sudah memiliki akses ke produk ini."
      );
    }
    /* =====================================================
       PRICE
       ===================================================== */
    const price =
      Number(product.price || 0);
    if (!Number.isFinite(price)) {
      throw new Error(
        "Harga produk tidak valid."
      );
    }
    if (price <= 0) {
      throw new Error(
        "Produk ini gratis. Gunakan tombol akses langsung dari halaman produk."
      );
    }
    /* =====================================================
       PRODUCT UI
       ===================================================== */
    const title =
      product.title ||
      product.name ||
      "Produk";
    const creator =
      product.creator_name ||
      product.seller_name ||
      product.username ||
      "Creator";
    const accessType =
      String(
        product.access_type ||
        "Paid"
      )
        .replace(/_/g, " ")
        .trim();
    if ($("productTitle")) {
      $("productTitle").textContent =
        title;
    }
    if ($("productMeta")) {
      $("productMeta").innerHTML = `
        <b>${esc(creator)}</b>
        ·
        ${esc(normalizedType.toUpperCase())}
      `;
    }
    if ($("productViews")) {
      $("productViews").textContent =
        Number(
          product.views || 0
        ).toLocaleString("id-ID");
    }
    if ($("productAccess")) {
      $("productAccess").textContent =
        accessType;
    }
    if ($("productPrice")) {
      $("productPrice").textContent =
        money(price);
    }
    /*
     * Service fee saat checkout produk
     * berasal dari order/payment backend.
     *
     * Jangan menghitung fee sendiri di frontend.
     */
    if ($("serviceFee")) {
      $("serviceFee").textContent =
        money(0);
    }
    if ($("totalPrice")) {
      $("totalPrice").textContent =
        money(price);
    }
    /* =====================================================
       PAYMENT BUTTON
       ===================================================== */
    if (!payBtn) {
      throw new Error(
        "Tombol pembayaran tidak ditemukan."
      );
    }
    let processing = false;
    payBtn.onclick = async () => {
      if (processing) {
        return;
      }
      processing = true;
      const originalHTML =
        payBtn.innerHTML;
      payBtn.disabled = true;
      payBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Membuat order...
      `;
      try {
        /* ===============================================
           CREATE ORDER
           =============================================== */
        const result =
          await window.sb.rpc(
            "create_checkout_order",
            {
              p_type: normalizedType,
              p_id: id
            }
          );
        if (result.error) {
          throw result.error;
        }
        const order =
          rpcRow(result.data);
        if (!order) {
          throw new Error(
            "Server tidak mengembalikan data order."
          );
        }
        const orderId =
          String(
            order.order_id ||
            order.id ||
            ""
          ).trim();
        if (!orderId) {
          throw new Error(
            "Order pembayaran tidak berhasil dibuat."
          );
        }
        /* ===============================================
           PAYMENT PAGE
           =============================================== */
        const paymentUrl =
          new URL(
            "payment.html",
            window.location.href
          );
        paymentUrl.searchParams.set(
          "order_id",
          orderId
        );
        /*
         * Gunakan replace supaya user tidak
         * kembali ke checkout lama dengan tombol
         * yang dapat membuat order kedua.
         */
        location.replace(
          paymentUrl.href
        );
      } catch (error) {
        console.error(
          "[PasTele Checkout] Create order error:",
          error
        );
        const message =
          error?.message ||
          error?.details ||
          error?.hint ||
          "Order pembayaran gagal dibuat.";
        if (typeof window.TC?.toast === "function") {
          window.TC.toast(
            message,
            "error"
          );
        }
        payBtn.disabled = false;
        payBtn.innerHTML =
          originalHTML;
        processing = false;
      }
    };
    /* =====================================================
       SHOW CONTENT
       ===================================================== */
    if (state) {
      state.hidden = true;
    }
    if (errorBox) {
      errorBox.hidden = true;
    }
    if (content) {
      content.hidden = false;
    }
  } catch (error) {
    console.error(
      "[PasTele Checkout]",
      error
    );
    showError(
      error?.message ||
      "Checkout tidak dapat dimuat."
    );
  }
});
