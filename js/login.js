/* =========================================================
   PasTele — LOGIN
   CLEAN + SUPABASE CAPTCHA + CLOUDFLARE TURNSTILE
   =========================================================
   FLOW:

   Step 1
   Username / Gmail
        ↓
   Auth.lookup()
        ↓
   Account Found
        ↓
   Step 2
   Password
        ↓
   Cloudflare Turnstile
        ↓
   Auth.login(email, password, captchaToken)
        ↓
   Dashboard

   IMPORTANT:
   - Auth.lookup() tetap digunakan
   - Auth.login() tetap digunakan
   - Auth.google() tetap digunakan
   - Supabase reset password tetap digunakan
   - CAPTCHA token dikirim ke Auth.login()
   - auth.js wajib meneruskan captchaToken ke:
       sb.auth.signInWithPassword({
         email,
         password,
         options: {
           captchaToken
         }
       })
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =======================================================
     ELEMENTS
     ======================================================= */

  const step1 = document.getElementById("loginStep1");
  const step2 = document.getElementById("loginStep2");

  const identifier = document.getElementById("identifier");
  const identifierWrap = document.getElementById("identifierWrap");
  const identifierStatus = document.getElementById("identifierStatus");
  const loginVerifiedState = document.getElementById("loginVerifiedState");

  const continueLogin = document.getElementById("continueLogin");

  const password = document.getElementById("password");
  const toggle = document.getElementById("toggle");

  const google = document.getElementById("google");
  const forgot = document.getElementById("forgot");
  const changeAccount = document.getElementById("changeAccount");

  const toastElement = document.getElementById("toast");

  const securityStatus =
    document.getElementById("loginSecurityStatus");

  const turnstileContainer =
    document.getElementById("loginTurnstile");


  /* =======================================================
     SUPABASE CHECK
     ======================================================= */

  if (!window.sb) {
    showToast(
      "Supabase belum terkonfigurasi. Isi js/config.js dengan Project URL dan anon/publishable key.",
      "error"
    );

    return;
  }


  /* =======================================================
     STATE
     ======================================================= */

  let currentEmail = "";
  let currentUsername = "";

  let accountFound = false;

  let turnstileToken = "";
  let turnstileWidgetId = null;

  let turnstileRendering = false;

  let loginSubmitting = false;


  /* =======================================================
     TURNSTILE SITE KEY
     ======================================================= */

  /*
   * Ambil dari data-sitekey HTML jika tersedia.
   *
   * HTML yang direkomendasikan:
   *
   * <div id="loginTurnstile"></div>
   *
   * lalu tambahkan:
   *
   * data-sitekey="SITE_KEY_KAMU"
   *
   * pada container.
   *
   * Contoh:
   *
   * <div
   *   id="loginTurnstile"
   *   data-sitekey="0x4AAAA..."
   * ></div>
   *
   * Jangan pernah masukkan SECRET KEY di frontend.
   */

  const TURNSTILE_SITE_KEY =
    String(
      turnstileContainer?.dataset?.sitekey ||
      window.PASTELE_TURNSTILE_SITE_KEY ||
      ""
    ).trim();


  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(message, type = "error") {
    const el =
      toastElement ||
      document.getElementById("toast");

    if (!el) {
      console.log(`[${type}] ${message}`);
      return;
    }

    clearTimeout(window.__loginToastTimer);

    el.textContent = String(message || "");

    el.className = "";

    void el.offsetWidth;

    el.className = `show ${type}`;

    window.__loginToastTimer =
      setTimeout(() => {
        el.className = "";
        el.textContent = "";
      }, 4000);
  }


  function showError(message) {
    showToast(
      message || "Terjadi kesalahan.",
      "error"
    );
  }


  function showSuccess(message) {
    showToast(
      message || "Berhasil.",
      "success"
    );
  }


  function clearError() {
    if (toastElement) {
      toastElement.className = "";
      toastElement.textContent = "";
    }

    clearTimeout(
      window.__loginToastTimer
    );
  }


  /* =======================================================
     BUTTON LOADING
     ======================================================= */

  function setButtonLoading(
    button,
    loading,
    loadingText,
    originalHTML = ""
  ) {
    if (!button) {
      return;
    }

    if (loading) {
      button.disabled = true;

      button.dataset.originalHtml =
        button.innerHTML;

      button.innerHTML = `
        <i
          class="fa-solid fa-spinner fa-spin"
          aria-hidden="true"
        ></i>
        <span>${loadingText}</span>
      `;
    } else {
      button.disabled = false;

      button.innerHTML =
        originalHTML ||
        button.dataset.originalHtml ||
        button.innerHTML;

      delete button.dataset.originalHtml;
    }
  }


  /* =======================================================
     SECURITY STATUS
     ======================================================= */

  function updateSecurityStatus(
    verified = false,
    message = ""
  ) {
    if (!securityStatus) {
      return;
    }

    if (verified) {
      securityStatus.innerHTML = `
        <i
          class="fa-solid fa-circle-check"
          aria-hidden="true"
        ></i>

        <span>
          ${message || "Verifikasi keamanan berhasil."}
        </span>
      `;

      securityStatus.classList.add(
        "verified"
      );

      return;
    }

    securityStatus.innerHTML = `
      <i
        class="fa-solid fa-shield-halved"
        aria-hidden="true"
      ></i>

      <span>
        ${message || "Selesaikan verifikasi keamanan sebelum masuk."}
      </span>
    `;

    securityStatus.classList.remove(
      "verified"
    );
  }


  /* =======================================================
     WAIT TURNSTILE
     ======================================================= */

  function waitForTurnstile(
    timeout = 15000
  ) {
    return new Promise((resolve) => {
      if (
        window.turnstile &&
        typeof window.turnstile.render === "function"
      ) {
        resolve(true);
        return;
      }

      const started =
        Date.now();

      const timer =
        setInterval(() => {
          if (
            window.turnstile &&
            typeof window.turnstile.render === "function"
          ) {
            clearInterval(timer);
            resolve(true);
            return;
          }

          if (
            Date.now() - started >= timeout
          ) {
            clearInterval(timer);
            resolve(false);
          }
        }, 100);
    });
  }


  /* =======================================================
     TURNSTILE CALLBACK
     ======================================================= */

  function onTurnstileSuccess(token) {
    turnstileToken =
      String(token || "").trim();

    window.__pasTeleTurnstileToken =
      turnstileToken;

    updateSecurityStatus(
      Boolean(turnstileToken),
      "Verifikasi keamanan berhasil."
    );
  }


  function onTurnstileExpired() {
    turnstileToken = "";

    window.__pasTeleTurnstileToken = "";

    updateSecurityStatus(
      false,
      "Verifikasi kedaluwarsa. Silakan verifikasi kembali."
    );

    showError(
      "Verifikasi keamanan kedaluwarsa. Silakan verifikasi kembali."
    );
  }


  function onTurnstileTimeout() {
    turnstileToken = "";

    window.__pasTeleTurnstileToken = "";

    updateSecurityStatus(
      false,
      "Verifikasi timeout. Silakan coba lagi."
    );

    showError(
      "Verifikasi keamanan timeout. Silakan coba lagi."
    );
  }


  function onTurnstileError(errorCode) {
    turnstileToken = "";

    window.__pasTeleTurnstileToken = "";

    updateSecurityStatus(
      false,
      "Verifikasi keamanan gagal."
    );

    console.error(
      "[PasTele] Turnstile error:",
      errorCode
    );

    showError(
      "Verifikasi keamanan gagal. Silakan coba lagi."
    );
  }


  /* =======================================================
     RENDER TURNSTILE
     ======================================================= */

  async function renderTurnstile() {
    if (!turnstileContainer) {
      console.warn(
        "[PasTele] #loginTurnstile tidak ditemukan."
      );

      return false;
    }

    /*
     * Jangan render ulang.
     */

    if (
      turnstileWidgetId !== null
    ) {
      return true;
    }

    if (turnstileRendering) {
      return true;
    }

    /*
     * Site key wajib.
     */

    if (!TURNSTILE_SITE_KEY) {
      console.error(
        "[PasTele] Turnstile site key kosong."
      );

      updateSecurityStatus(
        false,
        "Cloudflare Turnstile belum dikonfigurasi."
      );

      showError(
        "Cloudflare Turnstile belum dikonfigurasi."
      );

      return false;
    }

    turnstileRendering = true;

    try {
      const ready =
        await waitForTurnstile();

      if (!ready) {
        console.error(
          "[PasTele] Turnstile API gagal dimuat."
        );

        updateSecurityStatus(
          false,
          "Verifikasi keamanan gagal dimuat."
        );

        showError(
          "Cloudflare Turnstile gagal dimuat. Refresh halaman dan coba lagi."
        );

        return false;
      }

      /*
       * Pastikan container bersih.
       */

      turnstileContainer.innerHTML = "";

      /*
       * Explicit rendering.
       *
       * Ini lebih stabil karena Step 2
       * awalnya hidden.
       */

      turnstileWidgetId =
        window.turnstile.render(
          turnstileContainer,
          {
            sitekey:
              TURNSTILE_SITE_KEY,

            theme:
              turnstileContainer.dataset.theme ||
              "auto",

            language:
              turnstileContainer.dataset.language ||
              "id",

            action:
              turnstileContainer.dataset.action ||
              "login",

            callback:
              onTurnstileSuccess,

            "expired-callback":
              onTurnstileExpired,

            "timeout-callback":
              onTurnstileTimeout,

            "error-callback":
              onTurnstileError
          }
        );

      updateSecurityStatus(
        false
      );

      return (
        turnstileWidgetId !== null &&
        turnstileWidgetId !== undefined
      );

    } catch (error) {
      console.error(
        "[PasTele] Turnstile render error:",
        error
      );

      turnstileWidgetId = null;

      updateSecurityStatus(
        false,
        "Gagal memuat verifikasi keamanan."
      );

      showError(
        "Gagal memuat verifikasi keamanan."
      );

      return false;

    } finally {
      turnstileRendering = false;
    }
  }


  /* =======================================================
     GET TURNSTILE TOKEN
     ======================================================= */

  function getTurnstileToken() {
    /*
     * Prioritas:
     * 1. Local state
     * 2. Global state
     * 3. Hidden textarea
     */

    if (turnstileToken) {
      return turnstileToken;
    }

    const globalToken =
      String(
        window.__pasTeleTurnstileToken ||
        ""
      ).trim();

    if (globalToken) {
      turnstileToken =
        globalToken;

      return turnstileToken;
    }

    const textarea =
      turnstileContainer?.querySelector(
        'textarea[name="cf-turnstile-response"]'
      );

    if (
      textarea?.value
    ) {
      turnstileToken =
        String(
          textarea.value
        ).trim();

      window.__pasTeleTurnstileToken =
        turnstileToken;

      return turnstileToken;
    }

    const fallbackTextarea =
      document.querySelector(
        'textarea[name="cf-turnstile-response"]'
      );

    if (
      fallbackTextarea?.value
    ) {
      turnstileToken =
        String(
          fallbackTextarea.value
        ).trim();

      window.__pasTeleTurnstileToken =
        turnstileToken;

      return turnstileToken;
    }

    return "";
  }


  /* =======================================================
     RESET TURNSTILE
     ======================================================= */

  function resetTurnstile() {
    turnstileToken = "";

    window.__pasTeleTurnstileToken =
      "";

    if (
      window.turnstile &&
      turnstileWidgetId !== null
    ) {
      try {
        window.turnstile.reset(
          turnstileWidgetId
        );
      } catch (error) {
        console.warn(
          "[PasTele] Turnstile reset error:",
          error
        );
      }
    }

    updateSecurityStatus(
      false
    );
  }


  /* =======================================================
     REQUIRE TURNSTILE
     ======================================================= */

  function requireTurnstile() {
    const token =
      getTurnstileToken();

    if (!token) {
      showError(
        "Selesaikan verifikasi Cloudflare terlebih dahulu."
      );

      turnstileContainer?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      return null;
    }

    return token;
  }


  /* =======================================================
     CONTINUE BUTTON
     ======================================================= */

  function showContinueButton() {
    if (!continueLogin) {
      return;
    }

    continueLogin.hidden = false;

    continueLogin.disabled = false;

    continueLogin.classList.remove(
      "login-continue-hidden"
    );

    continueLogin.removeAttribute(
      "aria-hidden"
    );

    continueLogin.style.display = "";
  }


  function hideContinueButton() {
    if (!continueLogin) {
      return;
    }

    continueLogin.hidden = true;

    continueLogin.disabled = true;

    continueLogin.classList.add(
      "login-continue-hidden"
    );

    continueLogin.setAttribute(
      "aria-hidden",
      "true"
    );

    continueLogin.style.display =
      "none";
  }


  /* =======================================================
     IDENTIFIER UI
     ======================================================= */

  function resetIdentifierUI(
    clearValue = true
  ) {
    if (identifier) {
      identifier.disabled = false;

      identifier.removeAttribute(
        "aria-readonly"
      );

      if (clearValue) {
        identifier.value = "";
      }
    }

    identifierWrap?.classList.remove(
      "found"
    );

    identifierStatus?.setAttribute(
      "aria-hidden",
      "true"
    );

    loginVerifiedState?.classList.add(
      "hidden"
    );
  }


  /* =======================================================
     PASSWORD UI
     ======================================================= */

  function resetPasswordUI() {
    if (password) {
      password.value = "";
      password.type = "password";
    }

    if (toggle) {
      toggle.innerHTML =
        '<i class="fa-solid fa-eye" aria-hidden="true"></i>';

      toggle.setAttribute(
        "aria-label",
        "Tampilkan kata sandi"
      );

      toggle.setAttribute(
        "title",
        "Tampilkan kata sandi"
      );
    }
  }


  /* =======================================================
     INITIAL STATE
     ======================================================= */

  function showInitialState(
    clearIdentifier = true
  ) {
    currentEmail = "";
    currentUsername = "";

    accountFound = false;
    loginSubmitting = false;

    resetIdentifierUI(
      clearIdentifier
    );

    resetPasswordUI();

    showContinueButton();

    step1?.classList.remove(
      "hidden"
    );

    step2?.classList.add(
      "hidden"
    );

    resetTurnstile();

    updateSecurityStatus(
      false
    );
  }


  /* =======================================================
     ACCOUNT FOUND
     ======================================================= */

  function showAccountFound(
    found
  ) {
    if (!found) {
      return;
    }

    currentUsername =
      String(
        found.username ||
        found.display_name ||
        identifier?.value ||
        "Pengguna"
      ).trim();

    if (!currentUsername) {
      currentUsername =
        "Pengguna";
    }

    if (identifier) {
      identifier.value =
        currentUsername;

      identifier.disabled =
        true;

      identifier.setAttribute(
        "aria-readonly",
        "true"
      );
    }

    identifierWrap?.classList.add(
      "found"
    );

    identifierStatus?.setAttribute(
      "aria-hidden",
      "false"
    );

    loginVerifiedState?.classList.remove(
      "hidden"
    );

    hideContinueButton();

    accountFound = true;
  }


  /* =======================================================
     STEP 1 — ACCOUNT LOOKUP
     ======================================================= */

  step1?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      clearError();

      if (accountFound) {
        return;
      }

      const value =
        String(
          identifier?.value ||
          ""
        ).trim();

      if (!value) {
        showError(
          "Masukkan username atau Gmail terlebih dahulu."
        );

        identifier?.focus();

        return;
      }

      const button =
        continueLogin ||
        step1.querySelector(
          "button[type='submit'], button:not([type])"
        );

      if (!button) {
        return;
      }

      const originalHTML =
        button.innerHTML;

      setButtonLoading(
        button,
        true,
        "Memeriksa..."
      );

      try {
        /*
         * IMPORTANT:
         *
         * Step 1 TIDAK lagi membutuhkan
         * Turnstile login.
         *
         * Turnstile hanya digunakan pada
         * password login agar token dikirim
         * ke Supabase signInWithPassword().
         */

        const found =
          await Auth.lookup(
            value
          );

        console.log(
          "[PasTele] LOGIN LOOKUP:",
          found
        );

        /*
         * ACCOUNT NOT FOUND
         */

        if (
          !found ||
          !found.auth_email
        ) {
          currentEmail = "";
          currentUsername = "";

          accountFound = false;

          step2?.classList.add(
            "hidden"
          );

          resetIdentifierUI(
            false
          );

          showContinueButton();

          showError(
            "Akun tidak ditemukan. Periksa kembali username atau Gmail kamu."
          );

          return;
        }

        /*
         * ACCOUNT BANNED
         */

        if (
          found.is_banned === true ||
          String(
            found.status || ""
          ).toLowerCase() === "banned"
        ) {
          currentEmail = "";
          currentUsername = "";

          accountFound = false;

          step2?.classList.add(
            "hidden"
          );

          resetIdentifierUI(
            false
          );

          showContinueButton();

          showError(
            "Akun ini sedang diblokir dan tidak dapat digunakan untuk login."
          );

          return;
        }

        /*
         * AUTH EMAIL
         */

        currentEmail =
          String(
            found.auth_email
          ).trim()
          .toLowerCase();

        if (!currentEmail) {
          currentEmail = "";

          accountFound = false;

          resetIdentifierUI(
            false
          );

          showContinueButton();

          showError(
            "Email akun tidak valid."
          );

          return;
        }

        /*
         * ACCOUNT FOUND
         */

        showAccountFound(
          found
        );

        /*
         * SHOW STEP 2
         */

        step1?.classList.remove(
          "hidden"
        );

        step2?.classList.remove(
          "hidden"
        );

        /*
         * Turnstile baru dirender
         * setelah Step 2 visible.
         */

        updateSecurityStatus(
          false,
          "Selesaikan verifikasi keamanan sebelum masuk."
        );

        const turnstileReady =
          await renderTurnstile();

        if (!turnstileReady) {
          showError(
            "Verifikasi keamanan belum siap. Silakan refresh halaman."
          );

          return;
        }

        showSuccess(
          "Akun ditemukan ✓"
        );

        /*
         * Fokus password.
         */

        if (password) {
          password.value = "";

          setTimeout(() => {
            password.focus();
          }, 150);
        }

      } catch (error) {
        console.error(
          "[PasTele] LOGIN LOOKUP ERROR:",
          error
        );

        currentEmail = "";
        currentUsername = "";

        accountFound = false;

        resetIdentifierUI(
          false
        );

        step2?.classList.add(
          "hidden"
        );

        showContinueButton();

        showError(
          error?.message ||
          "Terjadi kesalahan saat memeriksa akun."
        );

      } finally {
        if (!accountFound) {
          setButtonLoading(
            button,
            false,
            "",
            originalHTML
          );
        }
      }
    }
  );


  /* =======================================================
     STEP 2 — PASSWORD LOGIN
     ======================================================= */

  step2?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      clearError();

      if (loginSubmitting) {
        return;
      }

      /*
       * Account belum ditemukan.
       */

      if (
        !currentEmail ||
        !accountFound
      ) {
        showError(
          "Silakan masukkan username atau Gmail terlebih dahulu."
        );

        showInitialState(
          false
        );

        identifier?.focus();

        return;
      }

      /*
       * Password.
       */

      const pass =
        String(
          password?.value ||
          ""
        );

      if (!pass) {
        showError(
          "Masukkan kata sandi."
        );

        password?.focus();

        return;
      }

      /*
       * Turnstile.
       */

      const token =
        requireTurnstile();

      if (!token) {
        return;
      }

      const button =
        step2.querySelector(
          "button[type='submit']"
        );

      if (!button) {
        return;
      }

      loginSubmitting = true;

      const originalHTML =
        button.innerHTML;

      setButtonLoading(
        button,
        true,
        "Masuk..."
      );

      try {
        console.log(
          "[PasTele] LOGIN EMAIL:",
          currentEmail
        );

        /*
         * Pastikan token terbaru tersedia
         * secara global.
         */

        window.__pasTeleTurnstileToken =
          token;

        /*
         * IMPORTANT:
         *
         * Auth.login() harus menerima
         * parameter ketiga captchaToken.
         *
         * Auth.login(
         *   email,
         *   password,
         *   captchaToken
         * )
         */

        await Auth.login(
          currentEmail,
          pass,
          token
        );

        /*
         * SUCCESS
         */

        showSuccess(
          "Login berhasil ✓"
        );

        /*
         * Sedikit delay agar toast
         * sempat terlihat.
         */

        setTimeout(() => {
          window.location.replace(
            "dashboard.html"
          );
        }, 500);

      } catch (error) {
        console.error(
          "[PasTele] LOGIN ERROR:",
          error
        );

        showError(
          error?.message ||
          "Kata sandi salah atau login gagal."
        );

        /*
         * Turnstile token jangan dipakai
         * ulang setelah request login.
         *
         * Reset agar mendapatkan token baru.
         */

        resetTurnstile();

        setButtonLoading(
          button,
          false,
          "",
          originalHTML
        );

      } finally {
        loginSubmitting = false;
      }
    }
  );


  /* =======================================================
     CHANGE ACCOUNT
     ======================================================= */

  changeAccount?.addEventListener(
    "click",
    () => {
      clearError();

      showInitialState(
        true
      );

      showSuccess(
        "Silakan masukkan akun lain."
      );

      setTimeout(() => {
        identifier?.focus();
      }, 100);
    }
  );


  /* =======================================================
     GOOGLE LOGIN
     ======================================================= */

  google?.addEventListener(
    "click",
    async () => {
      clearError();

      const originalHTML =
        google.innerHTML;

      setButtonLoading(
        google,
        true,
        "Menghubungkan..."
      );

      try {
        /*
         * Google OAuth tetap menggunakan
         * Auth.google().
         */

        await Auth.google();

      } catch (error) {
        console.error(
          "[PasTele] GOOGLE LOGIN ERROR:",
          error
        );

        showError(
          error?.message ||
          "Login dengan Google gagal."
        );

        setButtonLoading(
          google,
          false,
          "",
          originalHTML
        );
      }
    }
  );


  /* =======================================================
     FORGOT PASSWORD
     ======================================================= */

  forgot?.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();

      clearError();

      let email =
        currentEmail;

      /*
       * Kalau user sudah lookup,
       * gunakan email yang sudah ditemukan.
       */

      if (!email) {
        const value =
          String(
            identifier?.value ||
            ""
          ).trim();

        if (!value) {
          showError(
            "Masukkan username atau Gmail terlebih dahulu."
          );

          identifier?.focus();

          return;
        }

        try {
          const found =
            await Auth.lookup(
              value
            );

          if (
            !found ||
            !found.auth_email
          ) {
            showError(
              "Akun tidak ditemukan."
            );

            return;
          }

          if (
            found.is_banned === true
          ) {
            showError(
              "Akun ini sedang diblokir."
            );

            return;
          }

          email =
            String(
              found.auth_email
            )
              .trim()
              .toLowerCase();

        } catch (error) {
          console.error(
            "[PasTele] FORGOT LOOKUP ERROR:",
            error
          );

          showError(
            error?.message ||
            "Gagal memeriksa akun."
          );

          return;
        }
      }

      /*
       * Validate email.
       */

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        showError(
          "Email akun tidak valid."
        );

        return;
      }

      const originalHTML =
        forgot.innerHTML;

      try {
        forgot.style.pointerEvents =
          "none";

        forgot.innerHTML = `
          <i
            class="fa-solid fa-spinner fa-spin"
            aria-hidden="true"
          ></i>
          Mengirim...
        `;

        /*
         * Supabase reset password.
         */

        const {
          error
        } =
          await window.sb.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                `${window.location.origin}/reset-password.html`
            }
          );

        if (error) {
          throw error;
        }

        showSuccess(
          "Link reset password sudah dikirim ke Gmail kamu."
        );

      } catch (error) {
        console.error(
          "[PasTele] RESET PASSWORD ERROR:",
          error
        );

        showError(
          error?.message ||
          "Gagal mengirim reset password."
        );

      } finally {
        forgot.style.pointerEvents =
          "";

        forgot.innerHTML =
          originalHTML;
      }
    }
  );


  /* =======================================================
     PASSWORD VISIBILITY
     ======================================================= */

  toggle?.addEventListener(
    "click",
    () => {
      if (!password) {
        return;
      }

      const isPassword =
        password.type ===
        "password";

      password.type =
        isPassword
          ? "text"
          : "password";

      toggle.innerHTML =
        isPassword
          ? '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-eye" aria-hidden="true"></i>';

      toggle.setAttribute(
        "aria-label",
        isPassword
          ? "Sembunyikan kata sandi"
          : "Tampilkan kata sandi"
      );

      toggle.setAttribute(
        "title",
        isPassword
          ? "Sembunyikan kata sandi"
          : "Tampilkan kata sandi"
      );
    }
  );


  /* =======================================================
     INITIAL STATE
     ======================================================= */

  showInitialState(
    false
  );

  updateSecurityStatus(
    false
  );


  /* =======================================================
     DEBUG — DEVELOPMENT ONLY
     ======================================================= */

  /*
   * Jangan tampilkan token.
   * Hanya status konfigurasi.
   */

  console.log(
    "[PasTele] Login initialized.",
    {
      supabase: Boolean(window.sb),
      turnstileContainer: Boolean(
        turnstileContainer
      ),
      turnstileSiteKeyConfigured:
        Boolean(
          TURNSTILE_SITE_KEY
        )
    }
  );
});
