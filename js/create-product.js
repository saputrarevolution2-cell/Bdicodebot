/* =========================================================
   PasTele — CREATE PRODUCT
   FINAL PRODUCTION
   SUPABASE MASTER SQL SYNC
   AUTHENTICATED USERS ONLY
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
  const submitNormal =
    submitBtn?.querySelector(".submit-normal");
  const submitLoading =
    submitBtn?.querySelector(".submit-loading");
  const priceHint = $("priceHint");
  const thumbPreview = $("thumbPreview");
  const thumbImage = $("thumbImage");
  const descCounter = $("descCounter");
  const contentLabel = $("contentLabel");
  const contentHint = $("contentHint");
  /* =======================================================
     AUTH MODAL
     ======================================================= */
  const authRequiredModal = $("authRequiredModal");
  const authRequiredClose = $("authRequiredClose");
  const authLoginBtn = $("authLoginBtn");
  const authRegisterBtn = $("authRegisterBtn");
  const authRequiredTitle = $("authRequiredTitle");
  const authRequiredText = $("authRequiredText");
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
  /*
   * UI validation.
   *
   * Database products.price hanya mempunyai
   * CHECK price >= 0.
   *
   * Minimum paid dibuat sebagai aturan aplikasi.
   */
  const MIN_PAID_PRICE = 1000;
  const MAX_PRICE = 100000000;
  const MAX_TITLE = 120;
  const MAX_SLUG = 80;
  const MAX_DESCRIPTION = 3000;
  let slugManuallyEdited = false;
  let submitting = false;
  let authModalOpen = false;
  let authModalReturnFocus = null;
  /* =======================================================
     SUPABASE
     ======================================================= */
  const getSupabase = () => {
    const client =
      window.sb ||
      window.supabaseClient;
    if (!client) {
      throw new Error(
        "Supabase belum siap. Periksa konfigurasi Supabase."
      );
    }
    if (!client.auth || !client.from) {
      throw new Error(
        "Supabase client belum lengkap."
      );
    }
    return client;
  };
  /* =======================================================
     TC / TOAST
     ======================================================= */
  const getTC = () =>
    window.TC || null;
  const toast = (
    message,
    kind = "info"
  ) => {
    const TC = getTC();
    if (
      typeof TC?.toast ===
      "function"
    ) {
      TC.toast(
        String(message || ""),
        kind
      );
      return;
    }
    if (kind === "error") {
      console.error(
        "[PasTele]",
        message
      );
    } else {
      console.log(
        "[PasTele]",
        message
      );
    }
  };
  /* =======================================================
     HELPERS
     ======================================================= */
  const normalizeSlug = (
    value
  ) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        MAX_SLUG
      );
  };
  const formatRupiah = (
    value
  ) => {
    const amount =
      Number(value || 0);
    if (
      !Number.isFinite(amount)
    ) {
      return "Rp0";
    }
    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }
    ).format(amount);
  };
  const clearInvalid = (
    element
  ) => {
    if (!element) {
      return;
    }
    element.classList.remove(
      "invalid"
    );
    element.removeAttribute(
      "aria-invalid"
    );
  };
  const markInvalid = (
    element
  ) => {
    if (!element) {
      return;
    }
    element.classList.add(
      "invalid"
    );
    element.setAttribute(
      "aria-invalid",
      "true"
    );
    try {
      element.focus({
        preventScroll: false
      });
    } catch {
      element.focus();
    }
  };
  const setSubmitting = (
    state
  ) => {
    submitting =
      Boolean(state);
    if (!submitBtn) {
      return;
    }
    submitBtn.disabled =
      submitting;
    submitBtn.setAttribute(
      "aria-busy",
      submitting
        ? "true"
        : "false"
    );
    if (submitNormal) {
      submitNormal.hidden =
        submitting;
    }
    if (submitLoading) {
      submitLoading.hidden =
        !submitting;
    }
  };
  /* =======================================================
     CURRENT USER
     ======================================================= */
  const getCurrentUser =
    async () => {
      const TC =
        getTC();
      if (
        typeof TC?.user ===
        "function"
      ) {
        try {
          const user =
            await TC.user();
          if (user?.id) {
            return user;
          }
        } catch (error) {
          console.warn(
            "[PasTele] TC.user() failed:",
            error
          );
        }
      }
      const sb =
        getSupabase();
      try {
        const {
          data,
          error
        } =
          await sb.auth.getUser();
        if (
          !error &&
          data?.user?.id
        ) {
          return data.user;
        }
      } catch (error) {
        console.warn(
          "[PasTele] getUser failed:",
          error
        );
      }
      return null;
    };
  /* =======================================================
     AUTH REQUIRED
     ======================================================= */
  const closeAuthModal =
    () => {
      if (!authRequiredModal) {
        return;
      }
      authRequiredModal.hidden =
        true;
      authRequiredModal.setAttribute(
        "aria-hidden",
        "true"
      );
      document.body.classList.remove(
        "auth-modal-open"
      );
      authModalOpen =
        false;
      if (
        authModalReturnFocus &&
        typeof authModalReturnFocus.focus ===
          "function"
      ) {
        try {
          authModalReturnFocus.focus({
            preventScroll: true
          });
        } catch {
          authModalReturnFocus.focus();
        }
      }
      authModalReturnFocus =
        null;
    };
  const openAuthModal =
    () => {
      if (!authRequiredModal) {
        toast(
          "Silakan masuk atau daftar terlebih dahulu.",
          "warning"
        );
        return;
      }
      authModalReturnFocus =
        document.activeElement;
      if (authRequiredTitle) {
        authRequiredTitle.textContent =
          "Masuk untuk membuat produk";
      }
      if (authRequiredText) {
        authRequiredText.textContent =
          "Kamu harus masuk atau membuat akun PasTele terlebih dahulu sebelum dapat membuat produk.";
      }
      authRequiredModal.hidden =
        false;
      authRequiredModal.setAttribute(
        "aria-hidden",
        "false"
      );
      document.body.classList.add(
        "auth-modal-open"
      );
      authModalOpen =
        true;
      requestAnimationFrame(
        () => {
          authLoginBtn?.focus?.({
            preventScroll: true
          });
        }
      );
    };
  const requireAuthenticated =
    async () => {
      const user =
        await getCurrentUser();
      if (user?.id) {
        return user;
      }
      openAuthModal();
      return null;
    };
  /* =======================================================
     AUTH MODAL EVENTS
     ======================================================= */
  authRequiredModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target?.closest?.(
          "[data-auth-close]"
        )
      ) {
        closeAuthModal();
      }
    }
  );
  authRequiredClose?.addEventListener(
    "click",
    closeAuthModal
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (!authModalOpen) {
        return;
      }
      if (
        event.key ===
        "Escape"
      ) {
        event.preventDefault();
        closeAuthModal();
        return;
      }
      if (
        event.key !== "Tab" ||
        !authRequiredModal
      ) {
        return;
      }
      const focusable =
        authRequiredModal.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
      if (!focusable.length) {
        return;
      }
      const first =
        focusable[0];
      const last =
        focusable[
          focusable.length - 1
        ];
      if (
        event.shiftKey &&
        document.activeElement ===
          first
      ) {
        event.preventDefault();
        last.focus();
      }
      if (
        !event.shiftKey &&
        document.activeElement ===
          last
      ) {
        event.preventDefault();
        first.focus();
      }
    }
  );
  /* =======================================================
     AUTH REDIRECT LINKS
     ======================================================= */
  const currentCreateUrl =
    () => {
      try {
        return (
          window.location.pathname +
          window.location.search
        );
      } catch {
        return "/create.html";
      }
    };
  const prepareAuthLink =
    (element) => {
      if (!element) {
        return;
      }
      try {
        const url =
          new URL(
            element.getAttribute(
              "href"
            ) || "",
            window.location.href
          );
        url.searchParams.set(
          "return",
          currentCreateUrl()
        );
        element.href =
          url.toString();
      } catch {
        /* noop */
      }
    };
  prepareAuthLink(
    authLoginBtn
  );
  prepareAuthLink(
    authRegisterBtn
  );
  /* =======================================================
     PRODUCT TYPE CONFIG
     ======================================================= */
  const TYPE_CONFIG = {
    link: {
      icon: "fa-link",
      placeholder:
        "Masukkan URL atau content / delivery produk...",
      hint:
        "Masukkan link atau informasi yang akan diterima pembeli."
    },
    paste: {
      icon: "fa-file-lines",
      placeholder:
        "Masukkan isi paste / delivery produk...",
      hint:
        "Isi paste akan disimpan sebagai delivery produk."
    },
    pastelink: {
      icon: "fa-link",
      placeholder:
        "Masukkan URL atau isi PasteLink...",
      hint:
        "Masukkan link atau content yang akan ditampilkan pada PasteLink."
    },
    code: {
      icon: "fa-code",
      placeholder:
        "Tempel kode bot di sini...",
      hint:
        "Masukkan source code atau script delivery produk."
    },
    channel: {
      icon: "fa-broadcast-tower",
      placeholder:
        "https://t.me/username atau @username",
      hint:
        "Masukkan username atau link Channel Telegram."
    },
    group: {
      icon: "fa-users",
      placeholder:
        "https://t.me/username atau @username",
      hint:
        "Masukkan username atau link Group Telegram."
    }
  };
  /* =======================================================
     TELEGRAM VALIDATION
     ======================================================= */
  const isValidTelegramTarget =
    (value) => {
      const input =
        String(value || "")
          .trim();
      if (!input) {
        return false;
      }
      if (
        /^@[a-zA-Z0-9_]{5,32}$/.test(
          input
        )
      ) {
        return true;
      }
      if (
        /^[a-zA-Z0-9_]{5,32}$/.test(
          input
        )
      ) {
        return true;
      }
      try {
        const url =
          new URL(input);
        if (
          url.protocol !==
            "https:" &&
          url.protocol !==
            "http:"
        ) {
          return false;
        }
        const hostname =
          url.hostname.toLowerCase();
        if (
          hostname !==
            "t.me" &&
          hostname !==
            "telegram.me" &&
          hostname !==
            "www.telegram.me"
        ) {
          return false;
        }
        const path =
          url.pathname
            .replace(
              /^\/+/,
              ""
            )
            .replace(
              /\/+$/,
              ""
            );
        const username =
          path.split("/")[0];
        return /^[a-zA-Z0-9_]{5,32}$/.test(
          username
        );
      } catch {
        return false;
      }
    };
  /* =======================================================
     TYPE UI
     ======================================================= */
  const syncFeatureForm =
    () => {
      const selectedType =
        String(
          type?.value ||
            "pastelink"
        );
      const config =
        TYPE_CONFIG[
          selectedType
        ] ||
        TYPE_CONFIG.pastelink;
      document.body.dataset.productType =
        selectedType;
      const icon =
        document.querySelector(
          ".create-icon i"
        );
      if (icon) {
        icon.className =
          `fa-solid ${config.icon}`;
      }
      if (content) {
        content.placeholder =
          config.placeholder;
      }
      if (contentLabel) {
        switch (
          selectedType
        ) {
          case "code":
            contentLabel.textContent =
              "Source Code / Delivery";
            break;
          case "channel":
            contentLabel.textContent =
              "Channel Telegram";
            break;
          case "group":
            contentLabel.textContent =
              "Group Telegram";
            break;
          case "pastelink":
            contentLabel.textContent =
              "PasteLink Content";
            break;
          default:
            contentLabel.textContent =
              "Content / Delivery";
        }
      }
      if (contentHint) {
        contentHint.textContent =
          config.hint;
      }
      document.body.dataset.productAccess =
        String(
          access?.value ||
            "free"
        );
    };
  /* =======================================================
     TYPE CHANGE
     ======================================================= */
  type?.addEventListener(
    "change",
    () => {
      clearInvalid(type);
      syncFeatureForm();
    }
  );
  /* =======================================================
     ACCESS CHANGE
     ======================================================= */
  const syncPrice =
    () => {
      if (
        !access ||
        !price
      ) {
        return;
      }
      const isPaid =
        access.value ===
        "paid";
      price.required =
        isPaid;
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
        String(
          MIN_PAID_PRICE
        );
      const current =
        Number(
          price.value || 0
        );
      if (
        !Number.isFinite(
          current
        ) ||
        current <
          MIN_PAID_PRICE
      ) {
        price.value =
          String(
            MIN_PAID_PRICE
          );
      }
      if (priceHint) {
        priceHint.textContent =
          `Harga produk berbayar minimal ${formatRupiah(
            MIN_PAID_PRICE
          )}.`;
      }
    };
  access?.addEventListener(
    "change",
    () => {
      clearInvalid(access);
      syncPrice();
      syncFeatureForm();
    }
  );
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
          normalizeSlug(
            title.value
          );
        clearInvalid(slug);
      }
    }
  );
  slug?.addEventListener(
    "input",
    () => {
      slugManuallyEdited =
        true;
      const normalized =
        normalizeSlug(
          slug.value
        );
      if (
        slug.value !==
        normalized
      ) {
        slug.value =
          normalized;
      }
      clearInvalid(slug);
    }
  );
  /* =======================================================
     PRICE INPUT
     ======================================================= */
  price?.addEventListener(
    "input",
    () => {
      clearInvalid(price);
      const amount =
        Number(
          price.value || 0
        );
      if (
        Number.isFinite(
          amount
        ) &&
        amount >
          MAX_PRICE
      ) {
        price.value =
          String(
            MAX_PRICE
          );
      }
      if (
        Number.isFinite(
          amount
        ) &&
        amount < 0
      ) {
        price.value = "0";
      }
    }
  );
  /* =======================================================
     DESCRIPTION COUNTER
     ======================================================= */
  const updateDescriptionCounter =
    () => {
      if (
        !desc ||
        !descCounter
      ) {
        return;
      }
      descCounter.textContent =
        `${desc.value.length} / ${MAX_DESCRIPTION}`;
    };
  desc?.addEventListener(
    "input",
    updateDescriptionCounter
  );
  /* =======================================================
     THUMBNAIL
     ======================================================= */
  const hideThumbnailPreview =
    () => {
      if (!thumbPreview) {
        return;
      }
      thumbPreview.hidden =
        true;
      thumbImage?.removeAttribute(
        "src"
      );
    };
  const showThumbnailPreview =
    (url) => {
      if (
        !thumbPreview ||
        !thumbImage
      ) {
        return;
      }
      thumbImage.src =
        url;
      thumbPreview.hidden =
        false;
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
          parsed.protocol !==
            "http:" &&
          parsed.protocol !==
            "https:"
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
    hideThumbnailPreview
  );
  /* =======================================================
     DESCRIPTION
     ======================================================= */
  desc?.addEventListener(
    "input",
    () => {
      clearInvalid(desc);
      updateDescriptionCounter();
    }
  );
  /* =======================================================
     CLEAR INVALID
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
  ].forEach(
    (element) => {
      if (!element) {
        return;
      }
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
    }
  );
  /* =======================================================
     VALIDATE
     ======================================================= */
  const validate =
    () => {
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
      /* TITLE */
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
      /* SLUG */
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
      /* TYPE */
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
      /* ACCESS */
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
      /* PRICE */
      if (
        !Number.isFinite(
          amount
        ) ||
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
        amount >
        MAX_PRICE
      ) {
        markInvalid(price);
        toast(
          `Harga maksimal ${formatRupiah(
            MAX_PRICE
          )}.`,
          "error"
        );
        return null;
      }
      if (
        productAccess ===
          "paid" &&
        amount <
          MIN_PAID_PRICE
      ) {
        markInvalid(price);
        toast(
          `Produk berbayar minimal ${formatRupiah(
            MIN_PAID_PRICE
          )}.`,
          "error"
        );
        return null;
      }
      /* THUMBNAIL */
      if (thumbnailUrl) {
        try {
          const parsed =
            new URL(
              thumbnailUrl
            );
          if (
            parsed.protocol !==
              "http:" &&
            parsed.protocol !==
              "https:"
          ) {
            throw new Error();
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
      /* DESCRIPTION */
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
      /* DELIVERY */
      if (!delivery) {
        markInvalid(content);
        toast(
          "Content / delivery produk wajib diisi.",
          "error"
        );
        return null;
      }
      /* TELEGRAM */
      if (
        productType ===
          "channel" ||
        productType ===
          "group"
      ) {
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
      return {
        title:
          productTitle,
        slug:
          productSlug,
        price:
          productAccess ===
            "free"
            ? 0
            : Math.round(
                amount
              ),
        thumbnail_url:
          thumbnailUrl ||
          null,
        type:
          productType,
        access_type:
          productAccess,
        category:
          "General",
        description,
        content:
          delivery,
        status:
          "published"
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
      /* -----------------------------------------------
         VALIDATE
         ----------------------------------------------- */
      const product =
        validate();
      if (!product) {
        return;
      }
      /* -----------------------------------------------
         AUTH
         ----------------------------------------------- */
      const user =
        await requireAuthenticated();
      if (!user?.id) {
        return;
      }
      setSubmitting(true);
      try {
        const sb =
          getSupabase();
        /*
         * IMPORTANT:
         *
         * products RLS final:
         *
         * seller_id = auth.uid()
         * OR creator_id = auth.uid()
         *
         * Jadi kedua field diisi dengan
         * user Supabase yang sedang login.
         */
        const payload = {
          seller_id:
            user.id,
          creator_id:
            user.id,
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
          category:
            product.category,
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
            seller_id:
              payload.seller_id,
            creator_id:
              payload.creator_id,
            type:
              payload.type,
            access_type:
              payload.access_type,
            price:
              payload.price,
            slug:
              payload.slug
          }
        );
        const {
          data,
          error
        } =
          await sb
            .from("products")
            .insert(payload)
            .select(
              "id,slug,title,status"
            )
            .single();
        if (error) {
          console.error(
            "[PasTele] Create product error:",
            error
          );
          /* DUPLICATE SLUG */
          if (
            error.code ===
            "23505"
          ) {
            markInvalid(slug);
            toast(
              "Slug sudah digunakan. Pilih slug lain.",
              "error"
            );
            return;
          }
          /* FOREIGN KEY */
          if (
            error.code ===
            "23503"
          ) {
            toast(
              "Akun atau relasi produk tidak valid. Silakan login ulang.",
              "error"
            );
            return;
          }
          /* CHECK CONSTRAINT */
          if (
            error.code ===
            "23514"
          ) {
            toast(
              "Data produk ditolak oleh aturan database. Periksa harga atau data produk.",
              "error"
            );
            return;
          }
          /* RLS */
          if (
            error.code ===
              "42501" ||
            /row-level security|permission denied/i.test(
              error.message ||
                ""
            )
          ) {
            toast(
              "Kamu tidak memiliki izin membuat produk. Silakan login ulang.",
              "error"
            );
            return;
          }
          toast(
            error.message ||
              "Gagal membuat produk.",
            "error"
          );
          return;
        }
        /* -----------------------------------------------
           SUCCESS
           ----------------------------------------------- */
        console.log(
          "[PasTele] Product created:",
          data
        );
        toast(
          "Produk berhasil dipublikasikan ke Marketplace.",
          "success"
        );
        /*
         * Reset form.
         */
        form.reset();
        if (type) {
          type.value =
            "pastelink";
        }
        if (access) {
          access.value =
            "free";
        }
        if (price) {
          price.value =
            "0";
        }
        slugManuallyEdited =
          false;
        syncFeatureForm();
        syncPrice();
        updateDescriptionCounter();
        hideThumbnailPreview();
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
         * Ke halaman produk milik user.
         */
        setTimeout(
          () => {
            location.replace(
              "my-products.html"
            );
          },
          700
        );
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
  /*
   * Tidak ada lagi guest polling.
   * Create Product memang authenticated-only.
   */
  console.log(
    "[PasTele] Create Product initialized — SQL FINAL SYNC."
  );
});
