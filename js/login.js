/* =========================================================
   PasTele — LOGIN
   Stable Clean Version
   Username / Gmail → Account Found → Password → Login
   All notifications use #toast only
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
  const password =
    document.getElementById("password");
  const toggle =
    document.getElementById("toggle");
  const google =
    document.getElementById("google");
  const forgot =
    document.getElementById("forgot");
  /* =======================================================
     ACCOUNT FOUND ELEMENTS
     ======================================================= */
  const identifierWrap =
    document.getElementById("identifierWrap");
  const identifierStatus =
    document.getElementById("identifierStatus");
  const loginAccountState =
    document.getElementById("loginAccountState");
  const accountUsername =
    document.getElementById("accountUsername");
  const changeAccount =
    document.getElementById("changeAccount");
  /* =======================================================
     STATE
     ======================================================= */
  let currentEmail = "";
  let currentUsername = "";
  let accountFound = false;
  /* =======================================================
     TOAST
     ======================================================= */
  function toast(message, type = "error") {
    const el =
      document.getElementById("toast");
    if (!el) {
      console.log(`[${type}] ${message}`);
      return;
    }
    clearTimeout(window.__loginToastTimer);
    el.textContent = String(message || "");
    /*
     * Reset animation supaya toast tetap
     * bisa animasi setiap kali dipanggil.
     */
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
    const el =
      document.getElementById("toast");
    if (el) {
      el.className = "";
      el.textContent = "";
    }
    clearTimeout(
      window.__loginToastTimer
    );
  }
  /* =======================================================
     ESCAPE HTML
     ======================================================= */
  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  /* =======================================================
     SHOW ACCOUNT FOUND
     ======================================================= */
  function showAccountFound(found) {
    if (!found) return;
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
    /* -------------------------------------------------------
       Identifier
       ------------------------------------------------------- */
    if (identifier) {
      /*
       * Tetap tampilkan username.
       * Jangan disembunyikan.
       */
      identifier.value =
        currentUsername;
      /*
       * Lock input setelah akun ditemukan.
       */
      identifier.disabled = true;
      identifier.setAttribute(
        "aria-readonly",
        "true"
      );
    }
    /* -------------------------------------------------------
       Green verified state
       ------------------------------------------------------- */
    identifierWrap?.classList.add(
      "found"
    );
    if (identifierStatus) {
      identifierStatus.setAttribute(
        "aria-hidden",
        "false"
      );
    }
    /* -------------------------------------------------------
       Account information
       ------------------------------------------------------- */
    if (accountUsername) {
      accountUsername.textContent =
        currentUsername;
    }
    /* -------------------------------------------------------
       Account state box
       ------------------------------------------------------- */
    loginAccountState?.classList.remove(
      "hidden"
    );
    /* -------------------------------------------------------
       State
       ------------------------------------------------------- */
    accountFound = true;
  }
  /* =======================================================
     RESET ACCOUNT STATE
     ======================================================= */
  function resetAccountState(
    clearIdentifier = true
  ) {
    currentEmail = "";
    currentUsername = "";
    accountFound = false;
    /* -------------------------------------------------------
       Identifier
       ------------------------------------------------------- */
    if (identifier) {
      identifier.disabled = false;
      identifier.removeAttribute(
        "aria-readonly"
      );
      if (clearIdentifier) {
        identifier.value = "";
      }
    }
    /* -------------------------------------------------------
       Remove verified state
       ------------------------------------------------------- */
    identifierWrap?.classList.remove(
      "found"
    );
    if (identifierStatus) {
      identifierStatus.setAttribute(
        "aria-hidden",
        "true"
      );
    }
    /* -------------------------------------------------------
       Hide account state
       ------------------------------------------------------- */
    loginAccountState?.classList.add(
      "hidden"
    );
    /* -------------------------------------------------------
       Hide password step
       ------------------------------------------------------- */
    step2?.classList.add(
      "hidden"
    );
    /* -------------------------------------------------------
       Show identifier step
       ------------------------------------------------------- */
    step1?.classList.remove(
      "hidden"
    );
    /* -------------------------------------------------------
       Reset password
       ------------------------------------------------------- */
    if (password) {
      password.value = "";
      password.type = "password";
    }
    /* -------------------------------------------------------
       Reset eye button
       ------------------------------------------------------- */
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
     STEP 1
     CEK USERNAME / GMAIL
     ======================================================= */
  step1?.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      clearError();
      /* -----------------------------------------------------
         Input
         ----------------------------------------------------- */
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
      /* -----------------------------------------------------
         Button
         ----------------------------------------------------- */
      const btn =
        step1.querySelector(
          "button[type='submit'], button:not([type])"
        );
      if (!btn) return;
      const oldHTML =
        btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Memeriksa...
      `;
      try {
        /* ===================================================
           IMPORTANT
           Jangan ubah Auth.lookup()
           =================================================== */
        const found =
          await Auth.lookup(value);
        console.log(
          "LOGIN LOOKUP:",
          found
        );
        /* ===================================================
           ACCOUNT NOT FOUND
           =================================================== */
        if (
          !found ||
          !found.auth_email
        ) {
          currentEmail = "";
          accountFound = false;
          step2?.classList.add(
            "hidden"
          );
          loginAccountState?.classList.add(
            "hidden"
          );
          showError(
            "Akun tidak ditemukan. Periksa kembali username atau Gmail kamu."
          );
          return;
        }
        /* ===================================================
           ACCOUNT BANNED
           =================================================== */
        if (
          found.is_banned === true ||
          String(
            found.status || ""
          ).toLowerCase() === "banned"
        ) {
          currentEmail = "";
          accountFound = false;
          step2?.classList.add(
            "hidden"
          );
          loginAccountState?.classList.add(
            "hidden"
          );
          showError(
            "Akun ini sedang diblokir dan tidak dapat digunakan untuk login."
          );
          return;
        }
        /* ===================================================
           VALID EMAIL
           =================================================== */
        currentEmail =
          String(
            found.auth_email
          ).trim();
        if (!currentEmail) {
          currentEmail = "";
          showError(
            "Email akun tidak valid."
          );
          return;
        }
        /* ===================================================
           ACCOUNT FOUND
           =================================================== */
        showAccountFound(
          found
        );
        /* ===================================================
           SHOW PASSWORD
           =================================================== */
        step1?.classList.remove(
          "hidden"
        );
        step2?.classList.remove(
          "hidden"
        );
        /* ===================================================
           SUCCESS NOTIFICATION
           =================================================== */
        toast(
          "Akun ditemukan ✓",
          "success"
        );
        /* ===================================================
           FOCUS PASSWORD
           =================================================== */
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
        showError(
          err?.message ||
          "Terjadi kesalahan saat memeriksa akun."
        );
      } finally {
        btn.disabled = false;
        btn.innerHTML =
          oldHTML;
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
      /* -----------------------------------------------------
         Safety check
         ----------------------------------------------------- */
      if (
        !currentEmail ||
        !accountFound
      ) {
        showError(
          "Silakan masukkan username atau Gmail terlebih dahulu."
        );
        resetAccountState(
          false
        );
        identifier?.focus();
        return;
      }
      /* -----------------------------------------------------
         Password
         ----------------------------------------------------- */
      const pass =
        password?.value || "";
      if (!pass) {
        showError(
          "Masukkan kata sandi."
        );
        password?.focus();
        return;
      }
      /* -----------------------------------------------------
         Login button
         ----------------------------------------------------- */
      const btn =
        step2.querySelector(
          "button[type='submit'], button:not([type])"
        );
      if (!btn) return;
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
        /* ===================================================
           IMPORTANT
           Auth.login tetap sama
           =================================================== */
        await Auth.login(
          currentEmail,
          pass
        );
        /* -----------------------------------------------------
           Success
           ----------------------------------------------------- */
        toast(
          "Login berhasil ✓",
          "success"
        );
        /* -----------------------------------------------------
           Redirect
           ----------------------------------------------------- */
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
      resetAccountState(
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
      /* -----------------------------------------------------
         Use current email if already found.
         Otherwise lookup identifier.
         ----------------------------------------------------- */
      let email =
        currentEmail;
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
      /* -----------------------------------------------------
         Validate email
         ----------------------------------------------------- */
      if (!email) {
        showError(
          "Email akun tidak valid."
        );
        return;
      }
      /* -----------------------------------------------------
         Reset password
         ----------------------------------------------------- */
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
     TOGGLE PASSWORD
     ======================================================= */
  toggle?.addEventListener(
    "click",
    () => {
      if (!password) return;
      const isPassword =
        password.type === "password";
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
  /*
   * Pastikan ketika halaman pertama kali dibuka:
   *
   * Username form  = tampil
   * Account state   = hidden
   * Password        = hidden
   * Identifier      = aktif
   */
  loginAccountState?.classList.add(
    "hidden"
  );
  step2?.classList.add(
    "hidden"
  );
  identifierWrap?.classList.remove(
    "found"
  );
  if (identifier) {
    identifier.disabled = false;
    identifier.removeAttribute(
      "aria-readonly"
    );
  }
});
