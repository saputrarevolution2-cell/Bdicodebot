/* =========================================================
   PasTele — CREATE CODE
   FINAL CLEAN / SQL-SYNC
   ---------------------------------------------------------
   DATABASE:
   telegram_products

   SUPPORTED:
   - Free
   - Paid

   PAID:
   Rp5.000 — Rp150.000
   Kelipatan Rp1.000

   URL:
   Free -> /c/f/:slug
   Paid -> /c/p/:slug
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     HELPERS
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  const getSupabase = () => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum siap. Silakan refresh halaman."
      );
    }

    return window.sb;
  };

  const toast = (message, type = "info") => {
    if (typeof window.TC?.toast === "function") {
      window.TC.toast(message, type);
      return;
    }

    window.alert(message);
  };

  const escapeHTML = (value) => {
    if (typeof window.TC?.esc === "function") {
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

  const formatMoney = (value) => {
    const amount = Number(value || 0);

    if (typeof window.TC?.money === "function") {
      return window.TC.money(amount);
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  /* =======================================================
     SLUG
     -------------------------------------------------------
     Slug hanya untuk URL.
     User tidak perlu mengisinya.
     ======================================================= */

  const slugify = (value) => {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  };

  const randomSuffix = () => {
    try {
      const bytes = new Uint8Array(5);

      globalThis.crypto?.getRandomValues?.(bytes);

      if (
        bytes.some((value) => value !== 0)
      ) {
        return Array.from(
          bytes,
          (byte) => (byte % 36).toString(36)
        ).join("");
      }
    } catch (error) {
      console.warn(
        "[Create Code] Crypto fallback:",
        error
      );
    }

    return Math.random()
      .toString(36)
      .slice(2, 9);
  };

  const createSlug = (title) => {
    const base =
      slugify(title) || "code";

    return `${base}-${randomSuffix()}`;
  };

  /* =======================================================
     AUTH
     ======================================================= */

  const getUser = async () => {
    try {
      if (
        typeof window.TC?.user ===
        "function"
      ) {
        const user =
          await window.TC.user();

        if (user?.id) {
          return user;
        }
      }

      const supabase = getSupabase();

      const {
        data,
        error
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      const user =
        data?.user || null;

      if (!user?.id) {
        const redirect =
          encodeURIComponent(
            window.location.href
          );

        window.location.replace(
          `login.html?redirect=${redirect}`
        );

        return null;
      }

      return user;
    } catch (error) {
      console.error(
        "[Create Code] Auth:",
        error
      );

      const redirect =
        encodeURIComponent(
          window.location.href
        );

      window.location.replace(
        `login.html?redirect=${redirect}`
      );

      return null;
    }
  };

  /* =======================================================
     ACCESS
     ======================================================= */

  const getAccess = () => {
    return (
      document.querySelector(
        'input[name="access"]:checked'
      )?.value || "free"
    )
      .trim()
      .toLowerCase();
  };

  const getPrice = () => {
    if (getAccess() !== "paid") {
      return 0;
    }

    return Number(
      $("price")?.value || 0
    );
  };

  /* =======================================================
     PRICE UI
     ======================================================= */

  const updatePriceUI = () => {
    const access =
      getAccess();

    const paid =
      access === "paid";

    const priceBox =
      $("priceBox");

    if (priceBox) {
      priceBox.hidden = !paid;
    }

    if (!paid && $("price")) {
      $("price").value = "0";
    }
  };

  /* =======================================================
     DESCRIPTION COUNTER
     ======================================================= */

  const updateDescriptionCounter = () => {
    const description =
      $("description");

    const counter =
      $("counter");

    if (!description || !counter) {
      return;
    }

    counter.textContent =
      String(
        description.value.length
      );
  };

  /* =======================================================
     COMMON EVENTS
     ======================================================= */

  const wireCommon = () => {
    document
      .querySelectorAll(
        'input[name="access"]'
      )
      .forEach((input) => {
        input.addEventListener(
          "change",
          updatePriceUI
        );
      });

    $("description")
      ?.addEventListener(
        "input",
        updateDescriptionCounter
      );

    updatePriceUI();
    updateDescriptionCounter();
  };

  /* =======================================================
     VALIDATION
     ======================================================= */

  const validate = () => {
    const title =
      $("title")
        ?.value
        ?.trim() || "";

    const description =
      $("description")
        ?.value
        ?.trim() || "";

    const content =
      $("content")
        ?.value
        ?.trim() || "";

    const thumbnail =
      $("thumbnail")
        ?.value
        ?.trim() || "";

    const access =
      getAccess();

    const price =
      getPrice();

    /* -----------------------------------------------------
       TITLE
       ----------------------------------------------------- */

    if (title.length < 2) {
      toast(
        "Judul minimal 2 karakter.",
        "error"
      );

      $("title")?.focus();

      return null;
    }

    if (title.length > 150) {
      toast(
        "Judul maksimal 150 karakter.",
        "error"
      );

      $("title")?.focus();

      return null;
    }

    /* -----------------------------------------------------
       ACCESS
       ----------------------------------------------------- */

    if (
      access !== "free" &&
      access !== "paid"
    ) {
      toast(
        "Jenis akses tidak valid.",
        "error"
      );

      return null;
    }

    /* -----------------------------------------------------
       PRICE
       ----------------------------------------------------- */

    if (access === "paid") {
      if (
        !Number.isFinite(price) ||
        !Number.isInteger(price)
      ) {
        toast(
          "Harga harus berupa angka yang valid.",
          "error"
        );

        $("price")?.focus();

        return null;
      }

      if (
        price < 5000 ||
        price > 150000
      ) {
        toast(
          "Harga Paid harus Rp5.000–Rp150.000.",
          "error"
        );

        $("price")?.focus();

        return null;
      }

      if (price % 1000 !== 0) {
        toast(
          "Harga harus kelipatan Rp1.000.",
          "error"
        );

        $("price")?.focus();

        return null;
      }
    }

    /* -----------------------------------------------------
       CONTENT
       ----------------------------------------------------- */

    if (!content) {
      toast(
        "Code / Delivery wajib diisi.",
        "error"
      );

      $("content")?.focus();

      return null;
    }

    if (content.length > 1000000) {
      toast(
        "Isi Code terlalu besar.",
        "error"
      );

      return null;
    }

    /* -----------------------------------------------------
       THUMBNAIL
       ----------------------------------------------------- */

    if (thumbnail) {
      try {
        const url =
          new URL(thumbnail);

        if (
          url.protocol !== "http:" &&
          url.protocol !== "https:"
        ) {
          throw new Error(
            "Invalid protocol"
          );
        }
      } catch {
        toast(
          "URL thumbnail tidak valid.",
          "error"
        );

        $("thumbnail")?.focus();

        return null;
      }
    }

    /* -----------------------------------------------------
       RESULT
       ----------------------------------------------------- */

    return {
      title,
      description,
      content,
      thumbnail,
      access,
      price,
      slug: createSlug(title)
    };
  };

  /* =======================================================
     SUBMIT BUTTON
     ======================================================= */

  const setSubmitLoading = (
    loading
  ) => {
    const button =
      $("submitBtn");

    if (!button) {
      return;
    }

    button.disabled =
      loading;

    const normal =
      button.querySelector(
        ".normal"
      );

    const loadingEl =
      button.querySelector(
        ".loading"
      );

    if (normal) {
      normal.hidden =
        loading;
    }

    if (loadingEl) {
      loadingEl.hidden =
        !loading;
    }

    if (
      !normal &&
      !loadingEl
    ) {
      button.innerHTML =
        loading
          ? `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Menyimpan...</span>
          `
          : `
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>Publikasikan</span>
          `;
    }
  };

  /* =======================================================
     ERROR MESSAGE
     ======================================================= */

  const getDatabaseError =
    (error) => {
      const code =
        String(
          error?.code || ""
        );

      const message =
        String(
          error?.message || ""
        );

      if (
        code === "23505"
      ) {
        if (
          /slug/i.test(
            message
          )
        ) {
          return (
            "Link Code bentrok. Silakan coba publikasikan lagi."
          );
        }

        return (
          "Data dengan informasi yang sama sudah ada."
        );
      }

      if (
        code === "23503"
      ) {
        return (
          "Akun tidak memiliki data yang diperlukan. Silakan login ulang."
        );
      }

      if (
        code === "42501"
      ) {
        return (
          "Kamu tidak memiliki izin untuk membuat Code."
        );
      }

      if (
        code === "23514"
      ) {
        return (
          "Data tidak memenuhi aturan database."
        );
      }

      if (
        /row-level security/i.test(
          message
        ) ||
        /permission denied/i.test(
          message
        )
      ) {
        return (
          "Akses ditolak oleh keamanan database. Silakan login ulang."
        );
      }

      return (
        message ||
        "Gagal menyimpan Code."
      );
    };

  /* =======================================================
     SUCCESS
     ======================================================= */

  const showResult = (
    data,
    url
  ) => {
    const result =
      $("result");

    if (!result) {
      /*
       * Fallback jika HTML belum memiliki
       * result container.
       */
      toast(
        "Code berhasil dipublikasikan.",
        "success"
      );

      return;
    }

    result.hidden = false;

    result.innerHTML = `
      <div class="result-icon">
        <i class="fa-solid fa-check"></i>
      </div>

      <h2>
        Code berhasil dipublikasikan
      </h2>

      <p>
        <b>${escapeHTML(data.title)}</b>
        sudah berhasil disimpan.
      </p>

      <div class="result-url">
        <input
          type="text"
          readonly
          value="${escapeHTML(url)}"
          aria-label="Link Code"
        >

        <button
          type="button"
          id="copyUrl"
          aria-label="Salin link"
          title="Salin link"
        >
          <i class="fa-regular fa-copy"></i>
        </button>
      </div>

      <div class="result-actions">

        <a
          class="btn primary"
          href="${escapeHTML(url)}"
        >
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
          Buka Code
        </a>

        <a
          class="btn secondary"
          href="my-products.html"
        >
          <i class="fa-solid fa-box"></i>
          Konten Saya
        </a>

      </div>
    `;

    $("copyUrl")
      ?.addEventListener(
        "click",
        async () => {
          try {
            await navigator.clipboard.writeText(
              url
            );

            toast(
              "Link berhasil disalin.",
              "success"
            );
          } catch (error) {
            console.warn(
              "[Create Code] Clipboard:",
              error
            );

            /*
             * Fallback manual select.
             */
            const input =
              result.querySelector(
                ".result-url input"
              );

            if (input) {
              input.focus();
              input.select();

              toast(
                "Link dipilih. Silakan salin.",
                "info"
              );
            }
          }
        }
      );

    result.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  };

  /* =======================================================
     CREATE CODE
     ======================================================= */

  const createCode =
    async (data, user) => {
      const supabase =
        getSupabase();

      /*
       * SQL TABLE:
       * public.telegram_products
       *
       * Semua field di bawah memang berasal
       * dari struktur SQL Code.
       */

      const payload = {
        owner_id: user.id,

        title: data.title,

        slug: data.slug,

        type: "code",

        product_type: "code",

        access_type: data.access,

        bot_username: null,

        telegram_bot_id: null,

        price: data.price,

        description:
          data.description || null,

        content: data.content,

        thumbnail_url:
          data.thumbnail || null,

        category: "General",

        status: "published"
      };

      const {
        error
      } = await supabase
        .from(
          "telegram_products"
        )
        .insert(
          payload
        );

      if (error) {
        throw error;
      }

      /*
       * Jangan melakukan SELECT setelah insert.
       *
       * Ini sengaja supaya tidak bergantung
       * pada SELECT RLS.
       */
      return {
        ...data,
        id: null
      };
    };

  /* =======================================================
     SUBMIT
     ======================================================= */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const form =
        $("createForm");

      const submitButton =
        $("submitBtn");

      if (
        submitButton?.disabled
      ) {
        return;
      }

      const data =
        validate();

      if (!data) {
        return;
      }

      const user =
        await getUser();

      if (!user) {
        return;
      }

      setSubmitLoading(
        true
      );

      try {
        await createCode(
          data,
          user
        );

        /*
         * URL publik:
         *
         * Free:
         * /c/f/:slug
         *
         * Paid:
         * /c/p/:slug
         */

        const accessPrefix =
          data.access === "paid"
            ? "p"
            : "f";

        const url =
          new URL(
            `/c/${accessPrefix}/${data.slug}`,
            window.location.origin
          ).href;

        showResult(
          data,
          url
        );

        /*
         * Reset form setelah berhasil.
         */
        form?.reset();

        updatePriceUI();
        updateDescriptionCounter();

        toast(
          "Code berhasil dipublikasikan.",
          "success"
        );

      } catch (error) {
        console.error(
          "[PasTele Create Code]",
          error
        );

        toast(
          getDatabaseError(error),
          "error"
        );

      } finally {
        setSubmitLoading(
          false
        );
      }
    };

  /* =======================================================
     INITIALIZE
     ======================================================= */

  const init = () => {
    const form =
      $("createForm");

    if (!form) {
      console.warn(
        "[PasTele Create Code] #createForm tidak ditemukan."
      );

      return;
    }

    wireCommon();

    form.addEventListener(
      "submit",
      handleSubmit
    );
  };

  /* =======================================================
     DOM READY
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
