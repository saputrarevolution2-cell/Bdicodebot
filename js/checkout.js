/* =========================================================
   PasTele — CHECKOUT
   FINAL CLEAN / SQL-SYNC
   ---------------------------------------------------------
   SQL CONTRACT:
   - products            = link
   - telegram_products   = code
   - telegram_channels  = group / channel
   - pastelinks          = pastelink
   - pastes              = FREE ONLY / no checkout
   - create_checkout_order(text,text)
   - get_market_item_detail(text,uuid)
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  /* =======================================================
     DOM
     ======================================================= */

  const $ = (id) => document.getElementById(id);

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

  const normalizeType = (type) => {
    const value = String(type || "")
      .trim()
      .toLowerCase();

    /*
     * IMPORTANT:
     * Jangan mengubah pastelink menjadi link.
     *
     * Canonical type sesuai SQL:
     *
     * product / link       -> products
     * code                 -> telegram_products
     * channel / group      -> telegram_channels
     * pastelink            -> pastelinks
     */

    if (["product", "link"].includes(value)) {
      return "product";
    }

    if (
      [
        "code",
        "telegram_product",
        "telegram-product"
      ].includes(value)
    ) {
      return "telegram_product";
    }

    if (
      [
        "channel",
        "telegram_channel",
        "telegram-channel",
        "group",
        "telegram_group",
        "telegram-group"
      ].includes(value)
    ) {
      /*
       * SQL create_checkout_order()
       * normalizes both group/channel -> channel.
       */
      return "channel";
    }

    if (
      [
        "pastelink",
        "paste-link",
        "paste_link"
      ].includes(value)
    ) {
      return "pastelink";
    }

    /*
     * Plain paste bukan produk paid.
     * Jangan mengubahnya menjadi pastelink.
     */
    if (value === "paste") {
      return "paste";
    }

    return value;
  };

  const typeLabel = (type) => {
    switch (type) {
      case "product":
        return "Link";

      case "telegram_product":
        return "Code";

      case "channel":
        return "Group / Channel";

      case "pastelink":
        return "PasteLink";

      case "paste":
        return "Paste";

      default:
        return "Produk";
    }
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
        <div class="checkout-error-icon">
          <i class="fa-solid fa-circle-exclamation"></i>
        </div>

        <div class="checkout-error-title">
          Checkout tidak dapat dilanjutkan
        </div>

        <div class="checkout-error-message">
          ${esc(message)}
        </div>

        <div class="checkout-error-actions">
          <a
            class="btn"
            href="marketplace.html"
          >
            <i class="fa-solid fa-store"></i>
            Kembali ke Marketplace
          </a>
        </div>
      `;
    }
  };

  const showSuccessAccess = (product) => {
    const itemType = normalizeType(product?.item_type);

    let url = "marketplace.html";

    if (itemType === "pastelink") {
      url = `paste-view.html?slug=${encodeURIComponent(
        product.slug || ""
      )}`;
    } else if (itemType === "product") {
      url = `product.html?type=link&slug=${encodeURIComponent(
        product.slug || ""
      )}`;
    } else if (itemType === "telegram_product") {
      url = `product.html?type=code&slug=${encodeURIComponent(
        product.slug || ""
      )}`;
    } else if (itemType === "channel") {
      const sourceType =
        String(product.type || "").toLowerCase() === "group"
          ? "group"
          : "channel";

      url =
        `product.html?type=${sourceType}` +
        `&slug=${encodeURIComponent(product.slug || "")}`;
    }

    location.replace(url);
  };

  /* =======================================================
     URL
     ======================================================= */

  const params = new URLSearchParams(location.search);

  const rawType = String(
    params.get("type") || ""
  )
    .trim()
    .toLowerCase();

  const id = String(
    params.get("id") || ""
  ).trim();

  const normalizedType = normalizeType(rawType);

  /* =======================================================
     VALIDATION
     ======================================================= */

  const allowedTypes = new Set([
    "product",
    "telegram_product",
    "channel",
    "pastelink"
  ]);

  try {
    if (!window.sb?.rpc) {
      throw new Error(
        "Supabase belum siap. Silakan refresh halaman."
      );
    }

    if (!id) {
      throw new Error(
        "ID konten tidak ditemukan."
      );
    }

    /*
     * Checkout hanya untuk produk berbayar.
     *
     * Plain Paste tidak masuk karena SQL tidak
     * menjadikannya item berbayar.
     */
    if (!allowedTypes.has(normalizedType)) {
      if (normalizedType === "paste") {
        throw new Error(
          "Paste biasa adalah konten gratis dan tidak menggunakan pembayaran."
        );
      }

      throw new Error(
        "Jenis konten tidak didukung untuk checkout."
      );
    }

    /*
     * PostgreSQL uuid validation.
     */
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(id)) {
      throw new Error(
        "ID konten tidak valid."
      );
    }

    /* =====================================================
       AUTH
       ===================================================== */

    let user = null;

    try {
      if (typeof window.TC?.user === "function") {
        user = await window.TC.user();
      } else {
        const {
          data,
          error
        } = await window.sb.auth.getUser();

        if (!error) {
          user = data?.user || null;
        }
      }
    } catch (authError) {
      console.warn(
        "[PasTele Checkout] Auth check:",
        authError
      );
    }

    if (!user) {
      const next = encodeURIComponent(
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

    const detailResult =
      await window.sb.rpc(
        "get_market_item_detail",
        {
          p_type: normalizedType,
          p_id: id
        }
      );

    if (detailResult?.error) {
      throw detailResult.error;
    }

    const product = rpcRow(
      detailResult?.data
    );

    if (!product) {
      throw new Error(
        "Konten tidak ditemukan."
      );
    }

    if (product.found === false) {
      throw new Error(
        "Konten tidak ditemukan atau sudah tidak tersedia."
      );
    }

    /* =====================================================
       ACCESS CHECK
       ===================================================== */

    if (product.can_access === true) {
      /*
       * User sudah punya akses.
       * Jangan membuat order baru.
       *
       * Arahkan kembali ke kontennya.
       */

      if (
        product.slug ||
        product.item_type
      ) {
        showSuccessAccess(product);
        return;
      }

      throw new Error(
        "Kamu sudah memiliki akses ke konten ini."
      );
    }

    /* =====================================================
       PRICE
       ===================================================== */

    const price = Number(
      product.price || 0
    );

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error(
        "Harga konten tidak valid."
      );
    }

    /*
     * Checkout hanya untuk paid.
     */
    if (price <= 0) {
      throw new Error(
        "Konten ini gratis. Silakan akses langsung dari halaman konten."
      );
    }

    /*
     * SQL final:
     * Paid marketplace = Rp5.000 - Rp150.000
     */
    if (
      price < 5000 ||
      price > 150000
    ) {
      throw new Error(
        "Harga konten berada di luar batas pembayaran."
      );
    }

    /* =====================================================
       PRODUCT INFO
       ===================================================== */

    const title =
      product.title ||
      product.name ||
      "Produk";

    const creator =
      product.creator_name ||
      product.creator_username ||
      product.seller_name ||
      product.username ||
      "Creator";

    const accessType =
      String(
        product.access_type || "paid"
      )
        .replace(/_/g, " ")
        .trim();

    const displayType =
      typeLabel(normalizedType);

    /* =====================================================
       UPDATE UI
       ===================================================== */

    if ($("productTitle")) {
      $("productTitle").textContent =
        title;
    }

    if ($("productMeta")) {
      $("productMeta").innerHTML = `
        <b>${esc(creator)}</b>
        <span aria-hidden="true">·</span>
        <span>${esc(displayType)}</span>
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
     * Jangan menghitung service fee di frontend.
     * Backend yang menentukan settlement/payment.
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
        <span>Membuat pembayaran...</span>
      `;

      try {
        /* ===============================================
           CREATE CHECKOUT ORDER
           =============================================== */

        const orderResult =
          await window.sb.rpc(
            "create_checkout_order",
            {
              p_type: normalizedType,
              p_id: id
            }
          );

        if (orderResult?.error) {
          throw orderResult.error;
        }

        const order = rpcRow(
          orderResult?.data
        );

        if (!order) {
          throw new Error(
            "Server tidak mengembalikan data order."
          );
        }

        /*
         * SQL RETURNS:
         *
         * order_id uuid
         * amount numeric
         * item_title text
         * item_type text
         */

        const orderId = String(
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
         * Simpan tujuan konten hanya sebagai
         * fallback UX.
         *
         * Akses final tetap diverifikasi oleh
         * database/purchase setelah pembayaran.
         */

        paymentUrl.searchParams.set(
          "type",
          normalizedType
        );

        paymentUrl.searchParams.set(
          "id",
          id
        );

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
          "Pembayaran gagal dibuat.";

        if (
          typeof window.TC?.toast ===
          "function"
        ) {
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
       SHOW CHECKOUT
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
