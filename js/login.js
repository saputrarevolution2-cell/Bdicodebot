/* =========================================================
   PasTele — LOGIN
   FINAL SQL SYNC
   SUPABASE AUTH + USERNAME RPC + CLOUDFLARE TURNSTILE
   SQL RPC:
     resolve_username_login(p_username text)
       -> auth_email, is_banned
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
       Turnstile
            ↓
       Auth.login(email, password, captchaToken)
            ↓
       dashboard.html
   IMPORTANT:
   - Step 1 tidak membutuhkan Turnstile.
   - Turnstile hanya digunakan pada Step 2.
   - Token Turnstile tidak pernah ditampilkan di console.
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
  const securityStatus = document.getElementById("loginSecurityStatus");
  const turnstileContainer = document.getElementById("loginTurnstile");
  /* =======================================================
     SUPABASE
     ======================================================= */
  const supabase =
    window.sb ||
    window.supabaseClient ||
    window.supabase ||
    null;
  if (!supabase?.auth) {
    showToast(
      "Supabase belum siap. Periksa js/config.js dan js/supabase.js.",
      "error"
    );
    return;
  }
  if (!window.Auth) {
    showToast(
      "Auth Core belum dimuat. Pastikan js/auth.js dimuat sebelum js/login.js.",
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
  let loginSubmitting = false;
  let turnstileToken = "";
  let turnstileWidgetId = null;
  let turnstileRendering = false;
  /* =======================================================
     TURNSTILE CONFIG
     ======================================================= */
  const TURNSTILE_SITE_KEY = String(
    turnstileContainer?.dataset?.sitekey ||
    window.PASTELE_TURNSTILE_SITE_KEY ||
    ""
  ).trim();
  /* =======================================================
     HELPERS
     ======================================================= */
  function getLoginButton() {
    return (
      step2?.querySelector('button[type="submit"]') ||
      null
    );
  }
  function setLoginButtonEnabled(enabled) {
    const button = getLoginButton();
    if (!button || loginSubmitting) {
      return;
    }
    button.disabled = !Boolean(enabled);
    button.setAttribute(
      "aria-disabled",
      enabled ? "false" : "true"
    );
  }
  function showToast(message, type = "error") {
    const el =
      toastElement ||
      document.getElementById("toast");
    if (!el) {
      return;
    }
    clearTimeout(window.__loginToastTimer);
    el.textContent = String(message || "");
    el.className = "";
    void el.offsetWidth;
    el.className = `show ${type}`;
    window.__loginToastTimer = setTimeout(() => {
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
    clearTimeout(window.__loginToastTimer);
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
    securityStatus.innerHTML = verified
      ? `
        <i
          class="fa-solid fa-circle-check"
          aria-hidden="true"
        ></i>
        <span>
          ${message || "Verifikasi keamanan berhasil."}
        </span>
      `
      : `
        <i
          class="fa-solid fa-shield-halved"
          aria-hidden="true"
        ></i>
        <span>
          ${message || "Selesaikan verifikasi keamanan sebelum masuk."}
        </span>
      `;
    securityStatus.classList.toggle(
      "verified",
      verified
    );
  }
  /* =======================================================
     TURNSTILE API
     ======================================================= */
  function waitForTurnstile(timeout = 15000) {
    return new Promise((resolve) => {
      if (
        window.turnstile &&
        typeof window.turnstile.render === "function"
      ) {
        resolve(true);
        return;
      }
      const started = Date.now();
      const timer = setInterval(() => {
        if (
          window.turnstile &&
          typeof window.turnstile.render === "function"
        ) {
          clearInterval(timer);
          resolve(true);
          return;
        }
        if (Date.now() - started >= timeout) {
          clearInterval(timer);
          resolve(false);
        }
      }, 100);
    });
  }
  /* =======================================================
     TURNSTILE CALLBACKS
     ======================================================= */
  function onTurnstileSuccess(token) {
    turnstileToken =
      String(token || "").trim();
    const verified =
      Boolean(turnstileToken);
    updateSecurityStatus(
      verified,
      verified
        ? "Verifikasi keamanan berhasil."
        : "Selesaikan verifikasi keamanan sebelum masuk."
    );
    setLoginButtonEnabled(verified);
  }
  function onTurnstileExpired() {
    turnstileToken = "";
    updateSecurityStatus(
      false,
      "Verifikasi kedaluwarsa. Silakan verifikasi kembali."
    );
    setLoginButtonEnabled(false);
    showError(
      "Verifikasi keamanan kedaluwarsa. Silakan verifikasi kembali."
    );
  }
  function onTurnstileTimeout() {
    turnstileToken = "";
    updateSecurityStatus(
      false,
      "Verifikasi timeout. Silakan coba lagi."
    );
    setLoginButtonEnabled(false);
    showError(
      "Verifikasi keamanan timeout. Silakan coba lagi."
    );
  }
  function onTurnstileError(errorCode) {
    turnstileToken = "";
    updateSecurityStatus(
      false,
      "Verifikasi keamanan gagal."
    );
    setLoginButtonEnabled(false);
    /*
     * Jangan log token.
     * Error code Turnstile boleh dicatat.
     */
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
      /*
       * Kalau Turnstile tidak dikonfigurasi,
       * login tetap bisa berjalan.
       */
      if (!TURNSTILE_SITE_KEY) {
        updateSecurityStatus(
          true,
          "Login aman tanpa verifikasi tambahan."
        );
        setLoginButtonEnabled(true);
        return true;
      }
      showError(
        "Elemen verifikasi keamanan tidak ditemukan."
      );
      return false;
    }
    /*
     * Tidak render ulang widget yang sama.
     */
    if (turnstileWidgetId !== null) {
      return true;
    }
    if (turnstileRendering) {
      return false;
    }
    /*
     * Turnstile optional.
     */
    if (!TURNSTILE_SITE_KEY) {
      updateSecurityStatus(
        true,
        "Login aman tanpa verifikasi tambahan."
      );
      setLoginButtonEnabled(true);
      return true;
    }
    turnstileRendering = true;
    try {
      const ready =
        await waitForTurnstile();
      if (!ready) {
        updateSecurityStatus(
          false,
          "Verifikasi keamanan gagal dimuat."
        );
        setLoginButtonEnabled(false);
        showError(
          "Cloudflare Turnstile gagal dimuat. Refresh halaman dan coba lagi."
        );
        return false;
      }
      setLoginButtonEnabled(false);
      turnstileContainer.innerHTML = "";
      turnstileToken = "";
      const widgetId =
        window.turnstile.render(
          turnstileContainer,
          {
            sitekey: TURNSTILE_SITE_KEY,
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
      if (
        widgetId === null ||
        widgetId === undefined
      ) {
        throw new Error(
          "Turnstile widget ID tidak tersedia."
        );
      }
      turnstileWidgetId = widgetId;
      updateSecurityStatus(
        false,
        "Selesaikan verifikasi keamanan sebelum masuk."
      );
      setLoginButtonEnabled(false);
      return true;
    } catch (error) {
      console.error(
        "[PasTele] Turnstile render error:",
        error
      );
      turnstileWidgetId = null;
      turnstileToken = "";
      updateSecurityStatus(
        false,
        "Gagal memuat verifikasi keamanan."
      );
      setLoginButtonEnabled(false);
      showError(
        "Gagal memuat verifikasi keamanan. Silakan refresh halaman."
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
    if (!TURNSTILE_SITE_KEY) {
      return "";
    }
    if (turnstileToken) {
      return turnstileToken;
    }
    const textarea =
      turnstileContainer?.querySelector(
        'textarea[name="cf-turnstile-response"]'
      );
    if (textarea?.value) {
      turnstileToken =
        String(textarea.value).trim();
      return turnstileToken;
    }
    const fallback =
      document.querySelector(
        'textarea[name="cf-turnstile-response"]'
      );
    if (fallback?.value) {
      turnstileToken =
        String(fallback.value).trim();
      return turnstileToken;
    }
    return "";
  }
  /* =======================================================
     RESET TURNSTILE
     ======================================================= */
  function resetTurnstile() {
    turnstileToken = "";
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
    if (TURNSTILE_SITE_KEY) {
      updateSecurityStatus(
        false,
        "Selesaikan verifikasi keamanan sebelum masuk."
      );
      setLoginButtonEnabled(false);
    } else {
      updateSecurityStatus(
        true,
        "Login aman tanpa verifikasi tambahan."
      );
      setLoginButtonEnabled(true);
    }
  }
  /* =======================================================
     REQUIRE TURNSTILE
     ======================================================= */
  function requireTurnstile() {
    /*
     * Site key tidak ada:
     * Turnstile tidak diwajibkan.
     */
    if (!TURNSTILE_SITE_KEY) {
      return "";
    }
    const token =
      getTurnstileToken();
    if (!token) {
      setLoginButtonEnabled(false);
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
     STEP 1 UI
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
    continueLogin.style.display = "none";
  }
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
    step1?.classList.remove("hidden");
    step2?.classList.add("hidden");
    resetTurnstile();
    if (TURNSTILE_SITE_KEY) {
      updateSecurityStatus(
        false,
        "Selesaikan verifikasi keamanan sebelum masuk."
      );
    } else {
      updateSecurityStatus(
        true,
        "Login aman tanpa verifikasi tambahan."
      );
    }
  }
  /* =======================================================
     ACCOUNT FOUND UI
     ======================================================= */
  function showAccountFound(found) {
    if (!found) {
      return;
    }
    /*
     * resolve_username_login hanya mengembalikan:
     * auth_email
     * is_banned
     *
     * Jadi username ditampilkan dari input,
     * bukan dari field yang tidak dijamin RPC.
     */
    currentUsername =
      String(
        found.username ||
        found.display_name ||
        identifier?.value ||
        "Pengguna"
      ).trim();
    if (!currentUsername) {
      currentUsername = "Pengguna";
    }
    if (identifier) {
      identifier.value =
        currentUsername;
      identifier.disabled = true;
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
          identifier?.value || ""
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
         * STEP 1 TIDAK menggunakan Turnstile.
         */
        const found =
          await Auth.lookup(value);
        /*
         * Jangan console.log(found).
         * found dapat berisi auth_email.
         */
        if (
          !found ||
          !found.auth_email
        ) {
          currentEmail = "";
          currentUsername = "";
          accountFound = false;
          step2?.classList.add("hidden");
          resetIdentifierUI(false);
          showContinueButton();
          showError(
            "Akun tidak ditemukan. Periksa kembali username atau Gmail kamu."
          );
          return;
        }
        /*
         * CHECK BANNED
         */
        if (
          found.is_banned === true
        ) {
          currentEmail = "";
          currentUsername = "";
          accountFound = false;
          step2?.classList.add("hidden");
          resetIdentifierUI(false);
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
            found.auth_email || ""
          )
            .trim()
            .toLowerCase();
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            currentEmail
          )
        ) {
          currentEmail = "";
          accountFound = false;
          resetIdentifierUI(false);
          showContinueButton();
          showError(
            "Email akun tidak valid."
          );
          return;
        }
        /*
         * ACCOUNT FOUND
         */
        showAccountFound(found);
        /*
         * SHOW STEP 2
         */
        step1?.classList.remove("hidden");
        step2?.classList.remove("hidden");
        /*
         * Login disabled sampai Turnstile selesai.
         */
        if (TURNSTILE_SITE_KEY) {
          setLoginButtonEnabled(false);
          updateSecurityStatus(
            false,
            "Selesaikan verifikasi keamanan sebelum masuk."
          );
        }
        /*
         * Render setelah Step 2 terlihat.
         */
        const ready =
          await renderTurnstile();
        if (!ready) {
          setLoginButtonEnabled(false);
          showError(
            "Verifikasi keamanan belum siap. Silakan refresh halaman."
          );
          return;
        }
        showSuccess(
          "Akun ditemukan ✓"
        );
        setTimeout(() => {
          password?.focus();
        }, 150);
      } catch (error) {
        console.error(
          "[PasTele] LOGIN LOOKUP ERROR:",
          error
        );
        currentEmail = "";
        currentUsername = "";
        accountFound = false;
        resetIdentifierUI(false);
        step2?.classList.add("hidden");
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
     STEP 2 — LOGIN
     ======================================================= */
  step2?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      clearError();
      if (loginSubmitting) {
        return;
      }
      if (
        !currentEmail ||
        !accountFound
      ) {
        showError(
          "Silakan masukkan username atau Gmail terlebih dahulu."
        );
        showInitialState(false);
        identifier?.focus();
        return;
      }
      const pass =
        String(
          password?.value || ""
        );
      if (!pass) {
        showError(
          "Masukkan kata sandi."
        );
        password?.focus();
        return;
      }
      const token =
        requireTurnstile();
      if (token === null) {
        return;
      }
      const button =
        getLoginButton();
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
        /*
         * Jangan console.log token.
         */
        await Auth.login(
          currentEmail,
          pass,
          token
        );
        showSuccess(
          "Login berhasil ✓"
        );
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
         * Token gagal login tidak dipakai ulang.
         */
        resetTurnstile();
        button.innerHTML =
          originalHTML;
        if (TURNSTILE_SITE_KEY) {
          button.disabled = true;
          button.setAttribute(
            "aria-disabled",
            "true"
          );
        }
      } finally {
        loginSubmitting = false;
        if (
          TURNSTILE_SITE_KEY &&
          !turnstileToken
        ) {
          setLoginButtonEnabled(false);
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
      showInitialState(true);
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
       * Jika Step 1 belum dilakukan,
       * resolve akun terlebih dahulu.
       */
      if (!email) {
        const value =
          String(
            identifier?.value || ""
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
            await Auth.lookup(value);
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
          await supabase.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                new URL(
                  "reset-password.html",
                  window.location.origin
                ).href
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
        forgot.style.pointerEvents = "";
        forgot.innerHTML = originalHTML;
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
        password.type === "password";
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
     INITIALIZE
     ======================================================= */
  showInitialState(false);
  if (TURNSTILE_SITE_KEY) {
    updateSecurityStatus(
      false,
      "Selesaikan verifikasi keamanan sebelum masuk."
    );
    setLoginButtonEnabled(false);
  } else {
    updateSecurityStatus(
      true,
      "Login aman tanpa verifikasi tambahan."
    );
    setLoginButtonEnabled(true);
  }
  /* =======================================================
     SAFE DEBUG
     ======================================================= */
  console.log(
    "[PasTele] Login initialized.",
    {
      supabase: true,
      auth: true,
      turnstileContainer:
        Boolean(turnstileContainer),
      turnstileSiteKeyConfigured:
        Boolean(TURNSTILE_SITE_KEY),
      turnstileExplicit: true
    }
  );
});
