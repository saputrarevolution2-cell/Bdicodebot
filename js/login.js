/* =========================================================
   PasTele — LOGIN
   CLEAN + CLOUDFLARE TURNSTILE
   ---------------------------------------------------------
   Flow:
   Username / Gmail
        ↓
   Cloudflare Turnstile
        ↓
   Account Found
        ↓
   Password
        ↓
   Cloudflare Turnstile token
        ↓
   Auth.login()
        ↓
   Dashboard

   IMPORTANT:
   - Auth.lookup() tetap digunakan
   - Auth.login() tetap digunakan
   - Auth.google() tetap digunakan
   - Supabase reset password tetap digunakan
   - Turnstile token WAJIB divalidasi server-side
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =======================================================
     SUPABASE CHECK
     ======================================================= */

  if (!window.sb) {
    const el = document.getElementById("toast");

    if (el) {
      el.textContent =
        "Supabase belum terkonfigurasi. Isi js/config.js dengan anon/publishable key.";

      el.className = "";

      void el.offsetWidth;

      el.className = "show error";

      clearTimeout(window.__loginToastTimer);

      window.__loginToastTimer = setTimeout(() => {
        el.className = "";
        el.textContent = "";
      }, 5000);
    }

    return;
  }


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


  /* =======================================================
     STATE
     ======================================================= */

  let currentEmail = "";

  let currentUsername = "";

  let accountFound = false;

  let turnstileToken = "";

  let turnstileWidgetId = null;


  /* =======================================================
     TOAST
     ======================================================= */

  function toast(message, type = "error") {

    const el =
      toastElement ||
      document.getElementById("toast");

    if (!el) {
      console.log(`[${type}] ${message}`);
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


  /* =======================================================
     ERROR
     ======================================================= */

  function showError(message) {

    toast(
      message ||
      "Terjadi kesalahan.",
      "error"
    );
  }


  /* =======================================================
     CLEAR TOAST
     ======================================================= */

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
     CLOUDFLARE TURNSTILE
     ======================================================= */

  function waitForTurnstile(timeout = 10000) {

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
     GET TURNSTILE TOKEN
     ======================================================= */

  function getTurnstileToken() {

    /*
     * Jika callback sudah memberikan token,
     * gunakan token tersebut.
     */

    if (turnstileToken) {
      return turnstileToken;
    }

    /*
     * Fallback:
     * Ambil token dari hidden textarea
     * yang dibuat Cloudflare.
     */

    const input =
      document.querySelector(
        'textarea[name="cf-turnstile-response"]'
      );

    if (
      input &&
      input.value
    ) {

      turnstileToken =
        input.value;

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

      } catch (err) {

        console.warn(
          "TURNSTILE RESET ERROR:",
          err
        );
      }
    }

    updateSecurityStatus(
      false
    );
  }


  /* =======================================================
     SECURITY STATUS
     ======================================================= */

  function updateSecurityStatus(
    verified = false
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
          Verifikasi keamanan berhasil.
        </span>
      `;

      securityStatus.classList.add(
        "verified"
      );

    } else {

      securityStatus.innerHTML = `
        <i
          class="fa-solid fa-shield-halved"
          aria-hidden="true"
        ></i>

        <span>
          Selesaikan verifikasi keamanan sebelum masuk.
        </span>
      `;

      securityStatus.classList.remove(
        "verified"
      );
    }
  }


  /* =======================================================
     INIT TURNSTILE
     ======================================================= */

  async function initTurnstile() {

    const container =
      document.getElementById(
        "loginTurnstile"
      );

    if (!container) {
      console.warn(
        "Turnstile container tidak ditemukan."
      );
      return;
    }

    /*
     * Jangan render dua kali.
     */

    if (
      turnstileWidgetId !== null
    ) {
      return;
    }

    const ready =
      await waitForTurnstile();

    if (!ready) {

      console.error(
        "Cloudflare Turnstile gagal dimuat."
      );

      showError(
        "Verifikasi keamanan gagal dimuat. Refresh halaman dan coba lagi."
      );

      return;
    }

    const widget =
      container.querySelector(
        ".cf-turnstile"
      );

    if (!widget) {
      return;
    }

    /*
     * Ambil sitekey dari HTML.
     */

    const siteKey =
      widget.dataset.sitekey;

    if (
      !siteKey ||
      siteKey === "PASTE_TURNSTILE_SITE_KEY"
    ) {

      console.error(
        "Cloudflare Turnstile Site Key belum diisi."
      );

      showError(
        "Cloudflare Turnstile belum dikonfigurasi."
      );

      return;
    }

    /*
     * Hapus widget declarative agar
     * kita kontrol callback secara penuh.
     */

    widget.innerHTML = "";

    try {

      turnstileWidgetId =
        window.turnstile.render(
          widget,
          {
            sitekey: siteKey,

            theme:
              widget.dataset.theme ||
              "auto",

            language:
              widget.dataset.language ||
              "id",

            action:
              widget.dataset.action ||
              "login",

            callback: (
              token
            ) => {

              turnstileToken =
                String(
                  token || ""
                );

              updateSecurityStatus(
                Boolean(
                  turnstileToken
                )
              );
            },

            "expired-callback": () => {

              turnstileToken = "";

              updateSecurityStatus(
                false
              );

              showError(
                "Verifikasi keamanan kedaluwarsa. Silakan verifikasi kembali."
              );
            },

            "timeout-callback": () => {

              turnstileToken = "";

              updateSecurityStatus(
                false
              );

              showError(
                "Verifikasi keamanan timeout. Silakan coba lagi."
              );
            },

            "error-callback": (
              errorCode
            ) => {

              turnstileToken = "";

              updateSecurityStatus(
                false
              );

              console.error(
                "TURNSTILE ERROR:",
                errorCode
              );

              showError(
                "Verifikasi keamanan gagal. Silakan coba lagi."
              );
            }
          }
        );

    } catch (err) {

      console.error(
        "TURNSTILE INIT ERROR:",
        err
      );

      showError(
        "Gagal memuat verifikasi keamanan."
      );
    }
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

      const container =
        document.getElementById(
          "loginTurnstile"
        );

      container?.scrollIntoView({
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

    continueLogin.classList.remove(
      "login-continue-hidden"
    );

    continueLogin.disabled = false;

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

    continueLogin.classList.add(
      "login-continue-hidden"
    );

    continueLogin.disabled = true;

    continueLogin.setAttribute(
      "aria-hidden",
      "true"
    );

    continueLogin.style.display =
      "none";
  }


  /* =======================================================
     RESET IDENTIFIER UI
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
     RESET PASSWORD UI
     ======================================================= */

  function resetPasswordUI() {

    if (password) {

      password.value = "";

      password.type =
        "password";
    }

    if (toggle) {

      toggle.innerHTML =
        '<i class="fa-solid fa-eye"></i>';

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
     SHOW INITIAL STATE
     ======================================================= */

  function showInitialState(
    clearIdentifier = true
  ) {

    currentEmail = "";

    currentUsername = "";

    accountFound = false;

    resetIdentifierUI(
      clearIdentifier
    );

    showContinueButton();

    step2?.classList.add(
      "hidden"
    );

    step1?.classList.remove(
      "hidden"
    );

    resetPasswordUI();

    resetTurnstile();

    updateSecurityStatus(
      false
    );
  }


  /* =======================================================
     SHOW ACCOUNT FOUND
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
     STEP 1
     USERNAME / GMAIL LOOKUP
     ======================================================= */

  step1?.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      clearError();

      if (accountFound) {
        return;
      }

      const value =
        identifier?.value?.trim() ||
        "";

      if (!value) {

        showError(
          "Masukkan username atau Gmail terlebih dahulu."
        );

        identifier?.focus();

        return;
      }

      /*
       * Turnstile wajib.
       */

      const token =
        requireTurnstile();

      if (!token) {
        return;
      }

      const btn =
        continueLogin ||
        step1.querySelector(
          "button[type='submit'], button:not([type])"
        );

      if (!btn) {
        return;
      }

      const oldHTML =
        btn.innerHTML;

      btn.disabled = true;

      btn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Memeriksa...
      `;

      try {

        /*
         * IMPORTANT:
         *
         * Auth.lookup() tetap digunakan.
         *
         * Token disimpan di window agar
         * auth.js / backend gateway dapat
         * menggunakannya jika diperlukan.
         */

        window.__pasTeleTurnstileToken =
          token;

        const found =
          await Auth.lookup(
            value
          );

        console.log(
          "LOGIN LOOKUP:",
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

          resetTurnstile();

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

          resetTurnstile();

          return;
        }

        /*
         * AUTH EMAIL
         */

        currentEmail =
          String(
            found.auth_email
          ).trim();

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

          resetTurnstile();

          return;
        }

        /*
         * ACCOUNT FOUND
         */

        showAccountFound(
          found
        );

        step1?.classList.remove(
          "hidden"
        );

        step2?.classList.remove(
          "hidden"
        );

        toast(
          "✓ Akun ditemukan",
          "success"
        );

        if (password) {

          password.value = "";

          setTimeout(() => {

            password.focus();

          }, 120);
        }

      } catch (err) {

        console.error(
          "LOGIN LOOKUP ERROR:",
          err
        );

        accountFound = false;

        currentEmail = "";

        currentUsername = "";

        resetIdentifierUI(
          false
        );

        showContinueButton();

        step2?.classList.add(
          "hidden"
        );

        showError(
          err?.message ||
          "Terjadi kesalahan saat memeriksa akun."
        );

        resetTurnstile();

      } finally {

        if (!accountFound) {

          btn.disabled = false;

          btn.innerHTML =
            oldHTML;
        }
      }
    }
  );


  /* =======================================================
     STEP 2
     PASSWORD LOGIN
     ======================================================= */

  step2?.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      clearError();

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

      const pass =
        password?.value || "";

      if (!pass) {

        showError(
          "Masukkan kata sandi."
        );

        password?.focus();

        return;
      }

      /*
       * Turnstile token
       *
       * Token mungkin masih valid setelah
       * lookup, tetapi tetap kita cek ulang.
       */

      const token =
        getTurnstileToken();

      if (!token) {

        showError(
          "Selesaikan verifikasi Cloudflare terlebih dahulu."
        );

        const container =
          document.getElementById(
            "loginTurnstile"
          );

        container?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        return;
      }

      const btn =
        step2.querySelector(
          "button[type='submit']"
        );

      if (!btn) {
        return;
      }

      const oldHTML =
        btn.innerHTML;

      btn.disabled = true;

      btn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Masuk...
      `;

      try {

        console.log(
          "LOGIN EMAIL:",
          currentEmail
        );

        /*
         * Simpan token agar Auth.login()
         * atau auth.js dapat mengambilnya.
         */

        window.__pasTeleTurnstileToken =
          token;

        /*
         * IMPORTANT:
         *
         * Auth.login() tetap digunakan.
         *
         * Agar Turnstile benar-benar aman,
         * Auth.login() / backend harus mengirim
         * token ini ke Cloudflare Siteverify.
         */

        await Auth.login(
          currentEmail,
          pass
        );

        /*
         * SUCCESS
         */

        toast(
          "Login berhasil ✓",
          "success"
        );

        setTimeout(() => {

          window.location.href =
            "dashboard.html";

        }, 600);

      } catch (err) {

        console.error(
          "LOGIN ERROR:",
          err
        );

        showError(
          err?.message ||
          "Kata sandi salah atau login gagal."
        );

        btn.disabled = false;

        btn.innerHTML =
          oldHTML;

        /*
         * Turnstile token mungkin sudah
         * dianggap consumed oleh backend.
         *
         * Reset agar user mendapat token baru.
         */

        resetTurnstile();
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

      toast(
        "Silakan masukkan akun lain.",
        "success"
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

      const oldHTML =
        google.innerHTML;

      google.disabled = true;

      google.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Menghubungkan...
      `;

      try {

        /*
         * Auth.google() tetap digunakan.
         */

        await Auth.google();

      } catch (err) {

        console.error(
          "GOOGLE LOGIN ERROR:",
          err
        );

        showError(
          err?.message ||
          "Login dengan Google gagal."
        );

        google.disabled = false;

        google.innerHTML =
          oldHTML;
      }
    }
  );


  /* =======================================================
     FORGOT PASSWORD
     ======================================================= */

  forgot?.addEventListener(
    "click",
    async (e) => {

      e.preventDefault();

      clearError();

      let email =
        currentEmail;

      /*
       * Jika belum lookup.
       */

      if (!email) {

        const value =
          identifier?.value?.trim() ||
          "";

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

          email =
            String(
              found.auth_email
            ).trim();

        } catch (err) {

          console.error(
            "FORGOT LOOKUP ERROR:",
            err
          );

          showError(
            err?.message ||
            "Gagal memeriksa akun."
          );

          return;
        }
      }

      /*
       * Validate email.
       */

      if (!email) {

        showError(
          "Email akun tidak valid."
        );

        return;
      }

      /*
       * Reset password.
       */

      try {

        const {
          error
        } =
          await sb.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                `${window.location.origin}/reset-password.html`
            }
          );

        if (error) {
          throw error;
        }

        toast(
          "Link reset password sudah dikirim ke Gmail kamu.",
          "success"
        );

      } catch (err) {

        console.error(
          "RESET PASSWORD ERROR:",
          err
        );

        showError(
          err?.message ||
          "Gagal mengirim reset password."
        );
      }
    }
  );


  /* =======================================================
     PASSWORD VISIBILITY TOGGLE
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
          ? '<i class="fa-solid fa-eye-slash"></i>'
          : '<i class="fa-solid fa-eye"></i>';

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
     START TURNSTILE
  ======================================================= */

  initTurnstile();

});
