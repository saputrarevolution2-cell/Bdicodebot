/* =========================================================
   PasTele — CREATE PRODUCT
   Production / Supabase / Clean Validation
   Compatible with create.html
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =======================================================
     DOM
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  const form = $("f");

  const title = $("title");
  const slug = $("slug");
  const price = $("price");
  const thumb = $("thumb");
  const type = $("type");
  const access = $("access");
  const desc = $("desc");
  const content = $("content");

  const submitBtn = $("submitBtn");
  const submitNormal = submitBtn?.querySelector(".submit-normal");
  const submitLoading = submitBtn?.querySelector(".submit-loading");

  const priceHint = $("priceHint");

  const thumbPreview = $("thumbPreview");
  const thumbImage = $("thumbImage");

  const descCounter = $("descCounter");

  const contentLabel = $("contentLabel");
  const contentHint = $("contentHint");

  /* =======================================================
     CONSTANTS
     ======================================================= */

  const VALID_TYPES = [
    "link",
    "paste",
    "pastelink",
    "code",
    "channel",
    "group"
  ];

  const VALID_ACCESS = [
    "free",
    "paid"
  ];

  const MIN_PAID_PRICE = 1000;
  const MAX_PRICE = 100000000;
  const MAX_TITLE = 120;
  const MAX_SLUG = 80;
  const MAX_DESCRIPTION = 3000;

  let slugManuallyEdited = false;
  let submitting = false;

  /* =======================================================
     HELPERS
     ======================================================= */

  const getTC = () => {
    return window.TC || null;
  };

  const getSupabase = () => {
    return window.sb || null;
  };

  const toast = (message, kind = "info") => {
    const TC = getTC();

    if (typeof TC?.toast === "function") {
      TC.toast(String(message || ""), kind);
      return;
    }

    if (kind === "error") {
      console.error(message);
      return;
    }

    console.log(message);
  };

  const normalizeSlug = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_SLUG);
  };

  const clearInvalid = (element) => {
    if (!element) return;

    element.classList.remove("invalid");
    element.removeAttribute("aria-invalid");
  };

  const markInvalid = (element) => {
    if (!element) return;

    element.classList.add("invalid");
    element.setAttribute("aria-invalid", "true");

    try {
      element.focus({ preventScroll: false });
    } catch {
      element.focus();
    }
  };

  const setSubmitting = (state) => {
    submitting = Boolean(state);

    if (!submitBtn) return;

    submitBtn.disabled = submitting;
    submitBtn.setAttribute(
      "aria-busy",
      submitting ? "true" : "false"
    );

    if (submitNormal) {
      submitNormal.hidden = submitting;
    }

    if (submitLoading) {
      submitLoading.hidden = !submitting;
    }
  };

  const formatRupiah = (value) => {
    const amount = Number(value || 0);

    if (!Number.isFinite(amount)) {
      return "Rp0";
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  /* =======================================================
     PRODUCT TYPE CONFIG
     ======================================================= */

  const TYPE_CONFIG = {
    link: {
      icon: "fa-link",
      label: "Link / URL",
      placeholder: "Masukkan URL atau content / delivery produk...",
      hint: "Masukkan link atau informasi yang akan diterima pembeli."
    },

    paste: {
      icon: "fa-file-lines",
      label: "Paste",
      placeholder: "Masukkan isi paste / delivery produk...",
      hint: "Isi paste akan disimpan sebagai delivery produk."
    },

    pastelink: {
      icon: "fa-link",
      label: "PasteLink",
      placeholder: "Masukkan URL atau isi PasteLink...",
      hint: "Masukkan link atau content yang akan ditampilkan pada PasteLink."
    },

    code: {
      icon: "fa-code",
      label: "Code Telegram",
      placeholder: "Tempel kode bot di sini...",
      hint: "Masukkan source code atau script yang akan menjadi delivery produk."
    },

    channel: {
      icon: "fa-broadcast-tower",
      label: "Channel",
      placeholder: "https://t.me/username atau @username",
      hint: "Masukkan username atau link Channel Telegram."
    },

    group: {
      icon: "fa-users",
      label: "Group",
      placeholder: "https://t.me/username atau @username",
      hint: "Masukkan username atau link Group Telegram."
    }
  };

  /* =======================================================
     TELEGRAM HELPERS
     ======================================================= */

  const normalizeTelegramValue = (value) => {
    return String(value || "").trim();
  };

  const isValidTelegramTarget = (value) => {
    const input = normalizeTelegramValue(value);

    if (!input) {
      return false;
    }

    /*
     * Supported:
     * @username
     * username
     * https://t.me/username
     * http://t.me/username
     * https://telegram.me/username
     */

    if (/^@[a-zA-Z0-9_]{5,32}$/.test(input)) {
      return true;
    }

    if (/^[a-zA-Z0-9_]{5,32}$/.test(input)) {
      return true;
    }

    try {
      const url = new URL(input);

      if (
        url.protocol !== "https:" &&
        url.protocol !== "http:"
      ) {
        return false;
      }

      const hostname = url.hostname.toLowerCase();

      if (
        hostname !== "t.me" &&
        hostname !== "telegram.me" &&
        hostname !== "www.telegram.me"
      ) {
        return false;
      }

      const path = url.pathname
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");

      if (!path) {
        return false;
      }

      const username = path.split("/")[0];

      return /^[a-zA-Z0-9_]{5,32}$/.test(username);
    } catch {
      return false;
    }
  };

  /* =======================================================
     TYPE UI
     ======================================================= */

  const syncFeatureForm = () => {
    const selectedType = String(type?.value || "link");

    const config =
      TYPE_CONFIG[selectedType] ||
      TYPE_CONFIG.link;

    document.body.dataset.productType = selectedType;

    /* -------------------------------
       Header icon
       ------------------------------- */

    const icon = document.querySelector(
      ".create-icon i"
    );

    if (icon) {
      icon.className =
        `fa-solid ${config.icon}`;
    }

    /* -------------------------------
       Content placeholder
       ------------------------------- */

    if (content) {
      content.placeholder =
        config.placeholder;
    }

    /* -------------------------------
       Content label
       ------------------------------- */

    if (contentLabel) {
      if (selectedType === "code") {
        contentLabel.textContent =
          "Source Code / Delivery";
      } else if (
        selectedType === "channel"
      ) {
        contentLabel.textContent =
          "Channel Telegram";
      } else if (
        selectedType === "group"
      ) {
        contentLabel.textContent =
          "Group Telegram";
      } else if (
        selectedType === "pastelink"
      ) {
        contentLabel.textContent =
          "PasteLink Content";
      } else {
        contentLabel.textContent =
          "Content / Delivery";
      }
    }

    /* -------------------------------
       Content hint
       ------------------------------- */

    if (contentHint) {
      contentHint.textContent =
        config.hint;
    }
  };

  type?.addEventListener(
    "change",
    () => {
      clearInvalid(type);
      syncFeatureForm();
    }
  );

  syncFeatureForm();

  /* =======================================================
     AUTO SLUG
     ======================================================= */

  title?.addEventListener(
    "input",
    () => {
      clearInvalid(title);

      if (
        !slugManuallyEdited &&
        slug
      ) {
        slug.value =
          normalizeSlug(title.value);

        clearInvalid(slug);
      }
    }
  );

  slug?.addEventListener(
    "input",
    () => {
      slugManuallyEdited = true;

      const normalized =
        normalizeSlug(slug.value);

      if (
        slug.value !== normalized
      ) {
        slug.value = normalized;
      }

      clearInvalid(slug);
    }
  );

  /* =======================================================
     PRICE / ACCESS
     ======================================================= */

  const syncPrice = () => {
    if (!access || !price) return;

    const isPaid =
      access.value === "paid";

    price.required = isPaid;

    if (!isPaid) {
      price.value = "0";

      price.min = "0";

      if (priceHint) {
        priceHint.textContent =
          "Produk gratis tidak dikenakan biaya.";
      }

      return;
    }

    price.min =
      String(MIN_PAID_PRICE);

    const current =
      Number(price.value || 0);

    if (
      !Number.isFinite(current) ||
      current < MIN_PAID_PRICE
    ) {
      price.value =
        String(MIN_PAID_PRICE);
    }

    if (priceHint) {
      priceHint.textContent =
        `Harga produk berbayar minimal ${formatRupiah(MIN_PAID_PRICE)}.`;
    }
  };

  access?.addEventListener(
    "change",
    () => {
      clearInvalid(access);
      syncPrice();
    }
  );

  price?.addEventListener(
    "input",
    () => {
      clearInvalid(price);

      const raw =
        String(price.value || "");

      if (!raw) {
        return;
      }

      const amount =
        Number(raw);

      if (
        Number.isFinite(amount) &&
        amount > MAX_PRICE
      ) {
        price.value =
          String(MAX_PRICE);
      }

      if (
        Number.isFinite(amount) &&
        amount < 0
      ) {
        price.value = "0";
      }
    }
  );

  syncPrice();

  /* =======================================================
     DESCRIPTION COUNTER
     ======================================================= */

  const updateDescriptionCounter = () => {
    if (!desc || !descCounter) {
      return;
    }

    descCounter.textContent =
      `${desc.value.length} / ${MAX_DESCRIPTION}`;
  };

  desc?.addEventListener(
    "input",
    updateDescriptionCounter
  );

  updateDescriptionCounter();

  /* =======================================================
     THUMBNAIL PREVIEW
     ======================================================= */

  const hideThumbnailPreview = () => {
    if (!thumbPreview) {
      return;
    }

    thumbPreview.hidden = true;

    if (thumbImage) {
      thumbImage.removeAttribute("src");
    }
  };

  const showThumbnailPreview = (
    url
  ) => {
    if (
      !thumbPreview ||
      !thumbImage
    ) {
      return;
    }

    thumbImage.src = url;
    thumbPreview.hidden = false;
  };

  thumb?.addEventListener(
    "input",
    () => {
      clearInvalid(thumb);

      const url =
        String(
          thumb.value || ""
        ).trim();

      if (!url) {
        hideThumbnailPreview();
        return;
      }

      try {
        const parsed =
          new URL(url);

        if (
          parsed.protocol !== "http:" &&
          parsed.protocol !== "https:"
        ) {
          hideThumbnailPreview();
          return;
        }

        showThumbnailPreview(
          parsed.href
        );
      } catch {
        hideThumbnailPreview();
      }
    }
  );

  thumbImage?.addEventListener(
    "error",
    () => {
      hideThumbnailPreview();
    }
  );

  /* =======================================================
     CLEAR INVALID STATES
     ======================================================= */

  [
    title,
    slug,
    price,
    thumb,
    type,
    access,
    desc,
    content
  ].forEach((element) => {
    if (!element) return;

    element.addEventListener(
      "input",
      () => {
        clearInvalid(element);
      }
    );

    element.addEventListener(
      "change",
      () => {
        clearInvalid(element);
      }
    );
  });

  /* =======================================================
     VALIDATION
     ======================================================= */

  const validate = () => {
    const productTitle =
      String(
        title?.value || ""
      ).trim();

    const productSlug =
      normalizeSlug(
        slug?.value
      );

    const productType =
      String(
        type?.value || ""
      ).trim();

    const productAccess =
      String(
        access?.value || ""
      ).trim();

    const rawPrice =
      String(
        price?.value || ""
      ).trim();

    const amount =
      rawPrice === ""
        ? 0
        : Number(rawPrice);

    const thumbnailUrl =
      String(
        thumb?.value || ""
      ).trim();

    const description =
      String(
        desc?.value || ""
      ).trim();

    const delivery =
      String(
        content?.value || ""
      ).trim();

    /* =====================================================
       TITLE
       ===================================================== */

    if (
      !productTitle ||
      productTitle.length < 2
    ) {
      markInvalid(title);

      toast(
        "Judul produk minimal 2 karakter.",
        "error"
      );

      return null;
    }

    if (
      productTitle.length >
      MAX_TITLE
    ) {
      markInvalid(title);

      toast(
        "Judul produk terlalu panjang.",
        "error"
      );

      return null;
    }

    /* =====================================================
       SLUG
       ===================================================== */

    if (
      !productSlug ||
      productSlug.length < 3
    ) {
      markInvalid(slug);

      toast(
        "Slug minimal 3 karakter.",
        "error"
      );

      return null;
    }

    if (
      productSlug.length >
      MAX_SLUG
    ) {
      markInvalid(slug);

      toast(
        "Slug terlalu panjang.",
        "error"
      );

      return null;
    }

    if (
      !/^[a-z0-9-]+$/.test(
        productSlug
      )
    ) {
      markInvalid(slug);

      toast(
        "Slug hanya boleh berisi huruf kecil, angka, dan tanda -.",
        "error"
      );

      return null;
    }

    /* =====================================================
       TYPE
       ===================================================== */

    if (
      !VALID_TYPES.includes(
        productType
      )
    ) {
      markInvalid(type);

      toast(
        "Tipe produk tidak valid.",
        "error"
      );

      return null;
    }

    /* =====================================================
       ACCESS
       ===================================================== */

    if (
      !VALID_ACCESS.includes(
        productAccess
      )
    ) {
      markInvalid(access);

      toast(
        "Jenis akses tidak valid.",
        "error"
      );

      return null;
    }

    /* =====================================================
       PRICE
       ===================================================== */

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      markInvalid(price);

      toast(
        "Harga produk tidak valid.",
        "error"
      );

      return null;
    }

    if (
      amount > MAX_PRICE
    ) {
      markInvalid(price);

      toast(
        `Harga maksimal ${formatRupiah(MAX_PRICE)}.`,
        "error"
      );

      return null;
    }

    if (
      productAccess === "paid" &&
      amount < MIN_PAID_PRICE
    ) {
      markInvalid(price);

      toast(
        `Produk berbayar minimal ${formatRupiah(MIN_PAID_PRICE)}.`,
        "error"
      );

      return null;
    }

    /* =====================================================
       THUMBNAIL
       ===================================================== */

    if (thumbnailUrl) {
      try {
        const parsed =
          new URL(
            thumbnailUrl
          );

        if (
          parsed.protocol !== "http:" &&
          parsed.protocol !== "https:"
        ) {
          markInvalid(thumb);

          toast(
            "Thumbnail harus menggunakan URL HTTP atau HTTPS.",
            "error"
          );

          return null;
        }
      } catch {
        markInvalid(thumb);

        toast(
          "URL thumbnail tidak valid.",
          "error"
        );

        return null;
      }
    }

    /* =====================================================
       DESCRIPTION
       ===================================================== */

    if (
      description.length >
      MAX_DESCRIPTION
    ) {
      markInvalid(desc);

      toast(
        "Deskripsi terlalu panjang.",
        "error"
      );

      return null;
    }

    /* =====================================================
       TELEGRAM CHANNEL / GROUP
       ===================================================== */

    if (
      productType === "channel" ||
      productType === "group"
    ) {
      if (!delivery) {
        markInvalid(content);

        toast(
          productType === "channel"
            ? "Masukkan username atau link Channel Telegram."
            : "Masukkan username atau link Group Telegram.",
          "error"
        );

        return null;
      }

      if (
        !isValidTelegramTarget(
          delivery
        )
      ) {
        markInvalid(content);

        toast(
          "Masukkan username atau link Telegram yang valid.",
          "error"
        );

        return null;
      }
    }

    /* =====================================================
       CODE
       ===================================================== */

    if (
      productType === "code" &&
      !delivery
    ) {
      markInvalid(content);

      toast(
        "Masukkan source code atau delivery Code.",
        "error"
      );

      return null;
    }

    /* =====================================================
       PASTELINK
       ===================================================== */

    if (
      productType === "pastelink" &&
      !delivery
    ) {
      markInvalid(content);

      toast(
        "Masukkan content atau URL PasteLink.",
        "error"
      );

      return null;
    }

    /* =====================================================
       FINAL DATA
       ===================================================== */

    return {
      title: productTitle,

      slug: productSlug,

      price:
        productAccess === "free"
          ? 0
          : Math.round(amount),

      thumbnail_url:
        thumbnailUrl || null,

      type: productType,

      access_type:
        productAccess,

      description,

      content:
        String(
          content?.value || ""
        ).trim()
    };
  };

  /* =======================================================
     SUBMIT
     ======================================================= */

  form?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (submitting) {
        return;
      }

      const product =
        validate();

      if (!product) {
        return;
      }

      setSubmitting(true);

      try {
        /* ===============================================
           AUTH
           =============================================== */

        const TC =
          getTC();

        if (
          !TC ||
          typeof TC.user !== "function"
        ) {
          toast(
            "Sistem autentikasi belum siap. Silakan refresh halaman.",
            "error"
          );

          return;
        }

        const user =
          await TC.user();

        if (!user?.id) {
          toast(
            "Silakan login terlebih dahulu untuk membuat produk.",
            "error"
          );

          setTimeout(() => {
            location.replace(
              "login.html"
            );
          }, 250);

          return;
        }

        /* ===============================================
           SUPABASE
           =============================================== */

        const sb =
          getSupabase();

        if (
          !sb ||
          typeof sb.from !== "function"
        ) {
          toast(
            "Database belum terkonfigurasi.",
            "error"
          );

          return;
        }

        /* ===============================================
           PAYLOAD
           =============================================== */

        const payload = {
          seller_id: user.id,

          creator_id: user.id,

          title:
            product.title,

          slug:
            product.slug,

          price:
            product.price,

          thumbnail_url:
            product.thumbnail_url,

          type:
            product.type,

          access_type:
            product.access_type,

          description:
            product.description,

          content:
            product.content,

          status:
            "published"
        };

        console.log(
          "[PasTele] Creating product:",
          {
            type: payload.type,
            access_type:
              payload.access_type,
            price:
              payload.price,
            slug:
              payload.slug
          }
        );

        /* ===============================================
           INSERT
           =============================================== */

        const {
          data,
          error
        } = await sb
          .from("products")
          .insert(payload)
          .select("id,slug")
          .single();

        if (error) {
          console.error(
            "[PasTele] Create product error:",
            error
          );

          /* ---------------------------------------------
             DUPLICATE
             --------------------------------------------- */

          if (
            error.code === "23505"
          ) {
            markInvalid(slug);

            toast(
              "Slug sudah digunakan. Pilih slug lain.",
              "error"
            );

            return;
          }

          /* ---------------------------------------------
             CHECK CONSTRAINT
             --------------------------------------------- */

          if (
            error.code === "23514"
          ) {
            toast(
              "Data produk ditolak oleh aturan database. Periksa tipe, harga, atau akses produk.",
              "error"
            );

            return;
          }

          /* ---------------------------------------------
             FOREIGN KEY
             --------------------------------------------- */

          if (
            error.code === "23503"
          ) {
            toast(
              "Akun atau relasi produk tidak valid.",
              "error"
            );

            return;
          }

          /* ---------------------------------------------
             RLS
             --------------------------------------------- */

          if (
            error.code === "42501" ||
            /row-level security|permission denied/i.test(
              error.message || ""
            )
          ) {
            toast(
              "Kamu tidak memiliki izin untuk membuat produk.",
              "error"
            );

            return;
          }

          /* ---------------------------------------------
             GENERIC
             --------------------------------------------- */

          toast(
            error.message ||
            "Gagal membuat produk.",
            "error"
          );

          return;
        }

        /* ===============================================
           SUCCESS
           =============================================== */

        console.log(
          "[PasTele] Product created:",
          data
        );

        toast(
          "Produk berhasil dipublikasikan ke Marketplace.",
          "success"
        );

        /*
         * Reset form after successful insert.
         */

        form.reset();

        slugManuallyEdited =
          false;

        syncFeatureForm();

        syncPrice();

        updateDescriptionCounter();

        hideThumbnailPreview();

        /*
         * Clear validation states.
         */

        [
          title,
          slug,
          price,
          thumb,
          type,
          access,
          desc,
          content
        ].forEach(
          clearInvalid
        );

        /*
         * Return to My Products.
         */

        setTimeout(() => {
          location.replace(
            "my-products.html"
          );
        }, 700);
      } catch (error) {
        console.error(
          "[PasTele] Unexpected create product error:",
          error
        );

        toast(
          error?.message ||
          "Terjadi kesalahan saat membuat produk.",
          "error"
        );
      } finally {
        setSubmitting(false);
      }
    }
  );

  /* =======================================================
     INITIAL STATE
     ======================================================= */

  syncFeatureForm();
  syncPrice();
  updateDescriptionCounter();
  hideThumbnailPreview();

  console.log(
    "[PasTele] Create Product initialized."
  );
});
