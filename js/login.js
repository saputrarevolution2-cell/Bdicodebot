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
   Supabase signInWithPassword()
        ↓
   Dashboard

   IMPORTANT:
   - Step 1 TIDAK membutuhkan Turnstile
   - Turnstile hanya aktif di Step 2
   - Explicit Turnstile rendering
   - Token tidak pernah ditampilkan di console
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =======================================================
     ELEMENTS
     ======================================================= */

  const step1 =
    document.getElementById("loginStep1");

  const step2 =
    document.getElementById("loginStep2");

  const identifier =
    document.getElementById("identifier");

  const identifierWrap =
    document.getElementById("identifierWrap");

  const identifierStatus =
    document.getElementById("identifierStatus");

  const loginVerifiedState =
    document.getElementById("loginVerifiedState");

  const continueLogin =
    document.getElementById("continueLogin");

  const password =
    document.getElementById("password");

  const toggle =
    document.getElementById("toggle");

  const google =
    document.getElementById("google");

  const forgot =
    document.getElementById("forgot");

  const changeAccount =
    document.getElementById("changeAccount");

  const toastElement =
    document.getElementById("toast");

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

  const TURNSTILE_SITE_KEY =
    String(
      turnstileContainer?.dataset?.sitekey ||
      window.PASTELE_TURNSTILE_SITE_KEY ||
      ""
    ).trim();


  /* =======================================================
     HELPERS
     ======================================================= */

  function getLoginButton() {
    return (
      step2?.querySelector(
        'button[type="submit"]'
      ) || null
    );
  }


  function setLoginButtonEnabled(enabled) {
    const button =
      getLoginButton();

    if (!button) {
      return;
    }

    if (loginSubmitting) {
      return;
    }

    button.disabled =
      !Boolean(enabled);

    button.setAttribute(
      "aria-disabled",
      enabled ? "false" : "true"
    );
  }


  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(
    message,
    type = "error"
  ) {
    const el =
      toastElement ||
      document.getElementById("toast");

    if (!el) {
      console.log(
        `[${type}] ${message}`
      );

      return;
    }

    clearTimeout(
      window.__loginToastTimer
    );

    el.textContent =
      String(message || "");

    el.className = "";

    void el.offsetWidth;

    el.className =
      `show ${type}`;

    window.__loginToastTimer =
      setTimeout(() => {
        el.className = "";
        el.textContent = "";
      }, 4000);
  }


  function showError(message) {
    showToast(
      message ||
      "Terjadi kesalahan.",
      "error"
    );
  }


  function showSuccess(message) {
    showToast(
      message ||
      "Berhasil.",
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

      button.setAttribute(
        "aria-disabled",
        "true"
      );

      button.dataset.originalHtml =
        button.innerHTML;

      button.innerHTML = `
        <i
          class="fa-solid fa-spinner fa-spin"
          aria-hidden="true"
        ></i>
        <span>${loadingText}</span>
      `;

      return;
    }

    button.disabled = false;

    button.setAttribute(
      "aria-disabled",
      "false"
    );

    button.innerHTML =
      originalHTML ||
      button.dataset.originalHtml ||
      button.innerHTML;

    delete button.dataset.originalHtml;
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
          ${
            message ||
            "Verifikasi keamanan berhasil."
          }
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
        ${
          message ||
          "Selesaikan verifikasi keamanan sebelum masuk."
        }
      </span>
    `;

    securityStatus.classList.remove(
      "verified"
    );
  }


  /* =======================================================
     WAIT TURNSTILE API
     ======================================================= */

  function waitForTurnstile(
    timeout = 15000
  ) {
    return new Promise((resolve) => {
      if (
        window.turnstile &&
        typeof window.turnstile.render ===
          "function"
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
            typeof window.turnstile.render ===
              "function"
          ) {
            clearInterval(timer);
            resolve(true);
            return;
          }

          if (
            Date.now() - started >=
            timeout
          ) {
            clearInterval(timer);
            resolve(false);
          }
        }, 100);
    });
  }


  /* =======================================================
     TURNSTILE SUCCESS
     ======================================================= */

  function onTurnstileSuccess(
    token
  ) {
    turnstileToken =
      String(token || "").trim();

    window.__pasTeleTurnstileToken =
      turnstileToken;

    const verified =
      Boolean(turnstileToken);

    updateSecurityStatus(
      verified,
      verified
        ? "Verifikasi keamanan berhasil."
        : "Selesaikan verifikasi keamanan sebelum masuk."
    );

    /*
     * IMPORTANT:
     * Tombol Masuk baru aktif setelah
     * Turnstile menghasilkan token.
     */
    setLoginButtonEnabled(
      verified
    );
  }


  /* =======================================================
     TURNSTILE EXPIRED
     ======================================================= */

  function onTurnstileExpired() {
    turnstileToken = "";

    window.__pasTeleTurnstileToken =
      "";

    updateSecurityStatus(
      false,
      "Verifikasi kedaluwarsa. Silakan verifikasi kembali."
    );

    setLoginButtonEnabled(
      false
    );

    showError(
      "Verifikasi keamanan kedaluwarsa. Silakan verifikasi kembali."
    );
  }


  /* =======================================================
     TURNSTILE TIMEOUT
     ======================================================= */

  function onTurnstileTimeout() {
    turnstileToken = "";

    window.__pasTeleTurnstileToken =
      "";

    updateSecurityStatus(
      false,
      "Verifikasi timeout. Silakan coba lagi."
    );

    setLoginButtonEnabled(
      false
    );

    showError(
      "Verifikasi keamanan timeout. Silakan coba lagi."
    );
  }


  /* =======================================================
     TURNSTILE ERROR
     ======================================================= */

  function onTurnstileError(
    errorCode
  ) {
    turnstileToken = "";

    window.__pasTeleTurnstileToken =
      "";

    updateSecurityStatus(
      false,
      "Verifikasi keamanan gagal."
    );

    setLoginButtonEnabled(
      false
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
     * Jangan render dua kali.
     */

    if (
      turnstileWidgetId !== null
    ) {
      return true;
    }

    /*
     * Hindari render bersamaan.
     */

    if (turnstileRendering) {
      return false;
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

      setLoginButtonEnabled(
        false
      );

      showError(
        "Cloudflare Turnstile belum dikonfigurasi."
      );

      return false;
    }

    turnstileRendering =
      true;

    try {
      /*
       * Tunggu API Cloudflare selesai
       * dimuat oleh browser.
       */

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

        setLoginButtonEnabled(
          false
        );

        showError(
          "Cloudflare Turnstile gagal dimuat. Refresh halaman dan coba lagi."
        );

        return false;
      }

      /*
       * Pastikan tombol tetap disabled
       * sebelum callback success.
       */

      setLoginButtonEnabled(
        false
      );

      /*
       * Container harus kosong karena
       * menggunakan explicit rendering.
       */

      turnstileContainer.innerHTML =
        "";

      /*
       * Reset token lama.
       */

      turnstileToken = "";

      window.__pasTeleTurnstileToken =
        "";

      /*
       * Explicit rendering.
       */

      const widgetId =
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

      /*
       * Cloudflare biasanya mengembalikan
       * widget ID berupa string.
       */

      if (
        widgetId === null ||
        widgetId === undefined
      ) {
        throw new Error(
          "Turnstile widget ID tidak tersedia."
        );
      }

      turnstileWidgetId =
        widgetId;

      updateSecurityStatus(
        false,
        "Selesaikan verifikasi keamanan sebelum masuk."
      );

      setLoginButtonEnabled(
        false
      );

      return true;

    } catch (error) {
      console.error(
        "[PasTele] Turnstile render error:",
        error
      );

      turnstileWidgetId =
        null;

      turnstileToken =
        "";

      window.__pasTeleTurnstileToken =
        "";

      updateSecurityStatus(
        false,
        "Gagal memuat verifikasi keamanan."
      );

      setLoginButtonEnabled(
        false
      );

      showError(
        "Gagal memuat verifikasi keamanan. Silakan refresh halaman."
      );

      return false;

    } finally {
      turnstileRendering =
        false;
    }
  }


  /* =======================================================
     GET TURNSTILE TOKEN
     ======================================================= */

  function getTurnstileToken() {
    /*
     * 1. Local state
     */

    if (turnstileToken) {
      return turnstileToken;
    }

    /*
     * 2. Global state
     */

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

    /*
     * 3. Textarea di widget
     */

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

    /*
     * 4. Fallback global textarea.
     */

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
    turnstileToken =
      "";

    window.__pasTeleTurnstileToken =
      "";

    /*
     * Tombol login harus kembali
     * disabled setelah reset.
     */

    setLoginButtonEnabled(
      false
    );

    /*
     * Reset widget Cloudflare.
     */

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
      false,
      "Selesaikan verifikasi keamanan sebelum masuk."
    );
  }


  /* =======================================================
     REQUIRE TURNSTILE
     ======================================================= */

  function requireTurnstile() {
    const token =
      getTurnstileToken();

    if (!token) {
      setLoginButtonEnabled(
        false
      );

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

    continueLogin.hidden =
      false;

    continueLogin.disabled =
      false;

    continueLogin.classList.remove(
      "login-continue-hidden"
    );

    continueLogin.removeAttribute(
      "aria-hidden"
    );

    continueLogin.style.display =
      "";
  }


  function hideContinueButton() {
    if (!continueLogin) {
      return;
    }

    continueLogin.hidden =
      true;

    continueLogin.disabled =
      true;

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
      identifier.disabled =
        false;

      identifier.removeAttribute(
        "aria-readonly"
      );

      if (clearValue) {
        identifier.value =
          "";
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
      password.value =
        "";

      password.type =
        "password";
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
    currentEmail =
      "";

    currentUsername =
      "";

    accountFound =
      false;

    loginSubmitting =
      false;

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
      false,
      "Selesaikan verifikasi keamanan sebelum masuk."
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

    accountFound =
      true;
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
         * Step 1 TIDAK menggunakan
         * Turnstile.
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
          currentEmail =
            "";

          currentUsername =
            "";

          accountFound =
            false;

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
          ).toLowerCase() ===
            "banned"
        ) {
          currentEmail =
            "";

          currentUsername =
            "";

          accountFound =
            false;

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
          )
            .trim()
            .toLowerCase();

        if (!currentEmail) {
          currentEmail =
            "";

          accountFound =
            false;

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
         * Password login belum boleh
         * dilakukan sebelum Turnstile.
         */

        setLoginButtonEnabled(
          false
        );

        updateSecurityStatus(
          false,
          "Selesaikan verifikasi keamanan sebelum masuk."
        );

        /*
         * Render Turnstile setelah Step 2
         * sudah terlihat.
         */

        const turnstileReady =
          await renderTurnstile();

        if (!turnstileReady) {
          setLoginButtonEnabled(
            false
          );

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
          password.value =
            "";

          setTimeout(() => {
            password.focus();
          }, 150);
        }

      } catch (error) {
        console.error(
          "[PasTele] LOGIN LOOKUP ERROR:",
          error
        );

        currentEmail =
          "";

        currentUsername =
          "";

        accountFound =
          false;

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
        getLoginButton();

      if (!button) {
        return;
      }

      loginSubmitting =
        true;

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
         * Token tersedia untuk Auth.login().
         *
         * Jangan pernah console.log(token).
         */

        window.__pasTeleTurnstileToken =
          token;

        /*
         * IMPORTANT:
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
         * Jangan reset Turnstile setelah
         * login berhasil karena halaman
         * akan pindah.
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
         * Token Turnstile jangan dipakai
         * kembali setelah request gagal.
         */

        resetTurnstile();

        /*
         * Kembalikan tombol tetapi tetap
         * disabled karena token sudah reset.
         */

        button.innerHTML =
          originalHTML;

        button.disabled =
          true;

        button.setAttribute(
          "aria-disabled",
          "true"
        );

      } finally {
        loginSubmitting =
          false;

        /*
         * Kalau login gagal, tetap disabled
         * sampai Turnstile diverifikasi ulang.
         */

        if (!turnstileToken) {
          setLoginButtonEnabled(
            false
          );
        }
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
       * Jika akun sudah ditemukan,
       * gunakan email tersebut.
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
    false,
    "Selesaikan verifikasi keamanan sebelum masuk."
  );

  /*
   * Pastikan tombol Masuk disabled
   * saat halaman pertama kali dibuka.
   */

  setLoginButtonEnabled(
    false
  );


  /* =======================================================
     DEBUG — NO TOKEN
     ======================================================= */

  console.log(
    "[PasTele] Login initialized.",
    {
      supabase:
        Boolean(window.sb),

      turnstileContainer:
        Boolean(
          turnstileContainer
        ),

      turnstileSiteKeyConfigured:
        Boolean(
          TURNSTILE_SITE_KEY
        ),

      turnstileExplicit:
        true
    }
  );
});
