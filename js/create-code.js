/* =========================================================
   PasTele — CREATE CODE
   FINAL / SQL-SYNC
   =========================================================
   DATABASE:
   public.telegram_products

   SQL COLUMNS USED:
   - owner_id
   - title
   - slug
   - type
   - product_type
   - access_type
   - bot_username
   - telegram_bot_id
   - price
   - description
   - content
   - thumbnail_url
   - category
   - status

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

  const $ = (id) =>
    document.getElementById(id);

  const getSupabase = () => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum siap. Silakan refresh halaman."
      );
    }

    return window.sb;
  };

  const toast = (
    message,
    type = "info"
  ) => {
    if (
      typeof window.TC?.toast ===
      "function"
    ) {
      window.TC.toast(
        message,
        type
      );
      return;
    }

    window.alert(message);
  };

  const escapeHTML = (value) => {
    if (
      typeof window.TC?.esc ===
      "function"
    ) {
      return window.TC.esc(value);
    }

    return String(
      value ?? ""
    ).replace(
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

  /* =======================================================
     SLUG
     ======================================================= */

  const slugify = (
    value
  ) => {
    return String(
      value || ""
    )
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
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
        60
      );
  };

  const randomSuffix = () => {
    try {
      const bytes =
        new Uint8Array(6);

      if (
        globalThis.crypto &&
        typeof globalThis.crypto
          .getRandomValues ===
          "function"
      ) {
        globalThis.crypto
          .getRandomValues(
            bytes
          );

        const result =
          Array.from(
            bytes,
            (byte) =>
              (
                byte % 36
              ).toString(36)
          ).join("");

        if (result) {
          return result;
        }
      }
    } catch (error) {
      console.warn(
        "[Create Code] Crypto fallback:",
        error
      );
    }

    return Math.random()
      .toString(36)
      .slice(2, 10);
  };

  const createSlug = (
    title
  ) => {
    const base =
      slugify(title) ||
      "code";

    return `${base}-${randomSuffix()}`;
  };

  /* =======================================================
     AUTH
     ======================================================= */

  const getUser =
    async () => {
      try {
        /*
         * Gunakan helper TC.user()
         * bila tersedia.
         */
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

        /*
         * Fallback Supabase Auth.
         */
        const supabase =
          getSupabase();

        const {
          data,
          error
        } =
          await supabase.auth.getUser();

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

  const getAccess =
    () => {
      return (
        document.querySelector(
          'input[name="access"]:checked'
        )?.value ||
        "free"
      )
        .trim()
        .toLowerCase();
    };

  /* =======================================================
     PRICE
     ======================================================= */

  const getPrice =
    () => {
      if (
        getAccess() !==
        "paid"
      ) {
        return 0;
      }

      return Number(
        $("price")?.value ||
        0
      );
    };

  /* =======================================================
     BOT USERNAME
     ======================================================= */

  const getBotUsername =
    () => {
      return (
        $("botUsername")
          ?.value
          ?.trim()
          .replace(
            /^@+/,
            ""
          ) || ""
      );
    };

  /*
   * Telegram bot username:
   * - 5–32 karakter adalah praktik normal username bot.
   * - Hanya huruf, angka, underscore.
   *
   * Database sendiri menyimpan text,
   * sehingga validasi dilakukan di frontend.
   */
  const isValidBotUsername =
    (username) => {
      return /^[A-Za-z0-9_]{5,32}$/.test(
        username
      );
    };

  /* =======================================================
     PRICE UI
     ======================================================= */

  const updatePriceUI =
    () => {
      const access =
        getAccess();

      const paid =
        access === "paid";

      const priceBox =
        $("priceBox");

      if (priceBox) {
        priceBox.hidden =
          !paid;
      }

      if (
        !paid &&
        $("price")
      ) {
        $("price").value =
          "0";
      }

      /*
       * Saat Paid dipilih dan
       * harga kosong/0, gunakan
       * harga minimum SQL.
       */
      if (
        paid &&
        $("price")
      ) {
        const current =
          Number(
            $("price").value
          );

        if (
          !Number.isFinite(
            current
          ) ||
          current <= 0
        ) {
          $("price").value =
            "5000";
        }
      }
    };

  /* =======================================================
     DESCRIPTION COUNTER
     ======================================================= */

  const updateDescriptionCounter =
    () => {
      const description =
        $("description");

      const counter =
        $("counter");

      if (
        !description ||
        !counter
      ) {
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

  const wireCommon =
    () => {
      document
        .querySelectorAll(
          'input[name="access"]'
        )
        .forEach(
          (input) => {
            input.addEventListener(
              "change",
              updatePriceUI
            );
          }
        );

      $("description")
        ?.addEventListener(
          "input",
          updateDescriptionCounter
        );

      /*
       * Hilangkan @ otomatis
       * ketika user mengetik/paste.
       */
      $("botUsername")
        ?.addEventListener(
          "input",
          () => {
            const input =
              $("botUsername");

            if (!input) {
              return;
            }

            if (
              input.value.includes(
                "@"
              )
            ) {
              input.value =
                input.value.replace(
                  /@/g,
                  ""
                );
            }
          }
        );

      updatePriceUI();
      updateDescriptionCounter();
    };

  /* =======================================================
     VALIDATION
     ======================================================= */

  const validate =
    () => {
      const title =
        $("title")
          ?.value
          ?.trim() ||
        "";

      const botUsername =
        getBotUsername();

      const description =
        $("description")
          ?.value
          ?.trim() ||
        "";

      const content =
        $("content")
          ?.value
          ?.trim() ||
        "";

      const thumbnail =
        $("thumbnail")
          ?.value
          ?.trim() ||
        "";

      const access =
        getAccess();

      const price =
        getPrice();

      /* -----------------------------------------------------
         TITLE
         ----------------------------------------------------- */

      if (
        title.length < 2
      ) {
        toast(
          "Judul minimal 2 karakter.",
          "error"
        );

        $("title")?.focus();

        return null;
      }

      /*
       * HTML maxlength = 120
       * SQL field digunakan sebagai
       * title produk.
       */
      if (
        title.length > 120
      ) {
        toast(
          "Judul maksimal 120 karakter.",
          "error"
        );

        $("title")?.focus();

        return null;
      }

      /* -----------------------------------------------------
         BOT USERNAME
         ----------------------------------------------------- */

      if (
        !botUsername
      ) {
        toast(
          "Nama Bot wajib diisi.",
          "error"
        );

        $("botUsername")?.focus();

        return null;
      }

      if (
        botUsername.length > 32
      ) {
        toast(
          "Username bot maksimal 32 karakter.",
          "error"
        );

        $("botUsername")?.focus();

        return null;
      }

      if (
        !isValidBotUsername(
          botUsername
        )
      ) {
        toast(
          "Username bot tidak valid. Gunakan huruf, angka, dan underscore.",
          "error"
        );

        $("botUsername")?.focus();

        return null;
      }

      /* -----------------------------------------------------
         DESCRIPTION
         ----------------------------------------------------- */

      if (
        description.length >
        3000
      ) {
        toast(
          "Deskripsi maksimal 3000 karakter.",
          "error"
        );

        $("description")?.focus();

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

      if (
        access === "free"
      ) {
        /*
         * Free harus benar-benar
         * tersimpan sebagai 0.
         */
        if (
          price !== 0
        ) {
          toast(
            "Code Gratis tidak boleh memiliki harga.",
            "error"
          );

          return null;
        }
      }

      if (
        access === "paid"
      ) {
        if (
          !Number.isFinite(
            price
          ) ||
          !Number.isInteger(
            price
          )
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

        if (
          price % 1000 !==
          0
        ) {
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

      if (
        content.length >
        1000000
      ) {
        toast(
          "Isi Code terlalu besar. Maksimal 1.000.000 karakter.",
          "error"
        );

        $("content")?.focus();

        return null;
      }

      /* -----------------------------------------------------
         THUMBNAIL
         ----------------------------------------------------- */

      if (
        thumbnail
      ) {
        try {
          const url =
            new URL(
              thumbnail
            );

          if (
            url.protocol !==
              "http:" &&
            url.protocol !==
              "https:"
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
        botUsername,
        description,
        content,
        thumbnail,
        access,
        price,
        slug:
          createSlug(
            title
          )
      };
    };

  /* =======================================================
     SUBMIT BUTTON
     ======================================================= */

  const setSubmitLoading =
    (loading) => {
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
    };

  /* =======================================================
     DATABASE ERROR
     ======================================================= */

  const getDatabaseError =
    (error) => {
      const code =
        String(
          error?.code ||
            ""
        );

      const message =
        String(
          error?.message ||
            ""
        );

      const details =
        String(
          error?.details ||
            ""
        );

      const hint =
        String(
          error?.hint ||
            ""
        );

      const combined =
        `${message} ${details} ${hint}`;

      /* -----------------------------------------------------
         DUPLICATE
         ----------------------------------------------------- */

      if (
        code === "23505"
      ) {
        if (
          /slug/i.test(
            combined
          )
        ) {
          return (
            "Link Code bentrok. Silakan publikasikan lagi."
          );
        }

        return (
          "Data dengan informasi yang sama sudah ada."
        );
      }

      /* -----------------------------------------------------
         FOREIGN KEY
         ----------------------------------------------------- */

      if (
        code === "23503"
      ) {
        return (
          "Akun tidak memiliki data yang diperlukan. Silakan login ulang."
        );
      }

      /* -----------------------------------------------------
         CHECK CONSTRAINT
         ----------------------------------------------------- */

      if (
        code === "23514"
      ) {
        return (
          "Data tidak memenuhi aturan database. Periksa akses dan harga."
        );
      }

      /* -----------------------------------------------------
         NOT NULL
         ----------------------------------------------------- */

      if (
        code === "23502"
      ) {
        if (
          /bot_username/i.test(
            combined
          )
        ) {
          return (
            "Nama Bot wajib diisi."
          );
        }

        return (
          "Ada data wajib yang belum diisi."
        );
      }

      /* -----------------------------------------------------
         PERMISSION
         ----------------------------------------------------- */

      if (
        code === "42501"
      ) {
        return (
          "Kamu tidak memiliki izin untuk membuat Code."
        );
      }

      if (
        /row-level security/i.test(
          combined
        ) ||
        /permission denied/i.test(
          combined
        )
      ) {
        return (
          "Akses ditolak oleh keamanan database. Silakan login ulang."
        );
      }

      /* -----------------------------------------------------
         AUTH
         ----------------------------------------------------- */

      if (
        /JWT/i.test(
          combined
        ) ||
        /auth/i.test(
          combined
        ) &&
        /expired|invalid|session/i.test(
          combined
        )
      ) {
        return (
          "Sesi login sudah berakhir. Silakan login kembali."
        );
      }

      return (
        message ||
        "Gagal menyimpan Code."
      );
    };

  /* =======================================================
     SUCCESS RESULT
     ======================================================= */

  const showResult =
    (
      data,
      url
    ) => {
      const result =
        $("result");

      if (!result) {
        toast(
          "Code berhasil dipublikasikan.",
          "success"
        );

        return;
      }

      result.hidden =
        false;

      result.innerHTML = `
        <div class="result-icon">
          <i class="fa-solid fa-check"></i>
        </div>

        <h2>
          Code berhasil dipublikasikan
        </h2>

        <p>
          <b>${escapeHTML(
            data.title
          )}</b>
          berhasil disimpan untuk bot
          <b>@${escapeHTML(
            data.botUsername
          )}</b>.
        </p>

        <div class="result-url">
          <input
            type="text"
            readonly
            value="${escapeHTML(
              url
            )}"
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
            href="${escapeHTML(
              url
            )}"
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

            } catch (
              error
            ) {
              console.warn(
                "[Create Code] Clipboard:",
                error
              );

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
        behavior:
          "smooth",
        block:
          "center"
      });
    };

  /* =======================================================
     CREATE CODE
     ======================================================= */

  const createCode =
    async (
      data,
      user
    ) => {
      const supabase =
        getSupabase();

      /*
       * =====================================================
       * CANONICAL SQL TABLE
       * =====================================================
       *
       * public.telegram_products
       *
       * Tidak memakai kolom yang tidak ada.
       */

      const payload = {
        owner_id:
          user.id,

        title:
          data.title,

        slug:
          data.slug,

        type:
          "code",

        product_type:
          "code",

        access_type:
          data.access,

        /*
         * SQL:
         * bot_username text
         *
         * Sekarang diisi dari form.
         */
        bot_username:
          data.botUsername,

        /*
         * Belum menghubungkan
         * Telegram Bot ID.
         */
        telegram_bot_id:
          null,

        /*
         * Free = 0
         * Paid = 5000–150000
         */
        price:
          data.price,

        description:
          data.description ||
          "",

        content:
          data.content,

        thumbnail_url:
          data.thumbnail ||
          null,

        category:
          "General",

        status:
          "published"
      };

      console.log(
        "[Create Code] Insert payload:",
        {
          ...payload,
          content:
            `[${data.content.length} chars]`
        }
      );

      const {
        error
      } =
        await supabase
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
       * Jangan SELECT setelah INSERT.
       *
       * Ini sengaja supaya proses
       * tidak bergantung pada SELECT RLS.
       */
      return true;
    };

  /* =======================================================
     SUBMIT
     ======================================================= */

  const handleSubmit =
    async (
      event
    ) => {
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

      /*
       * VALIDATE
       */
      const data =
        validate();

      if (!data) {
        return;
      }

      /*
       * AUTH
       */
      const user =
        await getUser();

      if (!user) {
        return;
      }

      setSubmitLoading(
        true
      );

      try {
        /*
         * INSERT DATABASE
         */
        await createCode(
          data,
          user
        );

        /*
         * PUBLIC URL
         */
        const accessPrefix =
          data.access ===
          "paid"
            ? "p"
            : "f";

        const url =
          new URL(
            `/c/${accessPrefix}/${data.slug}`,
            window.location.origin
          ).href;

        /*
         * SUCCESS
         */
        showResult(
          data,
          url
        );

        /*
         * Reset form.
         */
        form?.reset();

        updatePriceUI();
        updateDescriptionCounter();

        toast(
          "Code berhasil dipublikasikan.",
          "success"
        );

      } catch (
        error
      ) {
        console.error(
          "[PasTele Create Code]",
          error
        );

        toast(
          getDatabaseError(
            error
          ),
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

  const init =
    () => {
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
      {
        once: true
      }
    );
  } else {
    init();
  }

})();
