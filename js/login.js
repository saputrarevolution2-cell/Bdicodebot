/* =========================================================
   PasTele — LOGIN
   Stable Clean Version
   Username / Gmail → Account Found → Password → Login
   UI:
   - Identifier tetap tampil setelah akun ditemukan
   - Identifier berubah menjadi username terdaftar
   - Identifier terkunci
   - Check hijau muncul di dalam input
   - Status verified kecil di bawah input
   - Tombol Lanjut hilang
   - Password section muncul
   - Akun ditemukan hanya menggunakan floating #toast
   - Ganti akun mengembalikan form ke kondisi awal
   IMPORTANT:
   - Auth.lookup() tetap digunakan
   - Auth.login() tetap digunakan
   - Auth.google() tetap digunakan
   - Supabase reset password tetap digunakan
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
  /* =======================================================
     STATE
     ======================================================= */
  let currentEmail = "";
  let currentUsername = "";
  let accountFound = false;
  /* =======================================================
     TOAST
     Semua notifikasi menggunakan #toast
     ======================================================= */
  function toast(message, type = "error") {
    const el =
      toastElement ||
      document.getElementById("toast");
    if (!el) {
      console.log(`[${type}] ${message}`);
      return;
    }
    clearTimeout(window.__loginToastTimer);
    el.textContent =
      String(message || "");
    el.className = "";
    /*
     * Force browser reflow.
     * Membuat animasi tetap berjalan
     * walaupun toast dipanggil berulang.
     */
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
     SHOW INITIAL STATE
     ======================================================= */
  function showInitialState(
    clearIdentifier = true
  ) {
    /* -----------------------------------------------------
       Reset internal state
       ----------------------------------------------------- */
    currentEmail = "";
    currentUsername = "";
    accountFound = false;
    /* -----------------------------------------------------
       Identifier
       ----------------------------------------------------- */
    if (identifier) {
      identifier.disabled = false;
      identifier.removeAttribute(
        "aria-readonly"
      );
      if (clearIdentifier) {
        identifier.value = "";
      }
    }
    /* -----------------------------------------------------
       Remove green check
       ----------------------------------------------------- */
    identifierWrap?.classList.remove(
      "found"
    );
    /* -----------------------------------------------------
       Reset check accessibility
       ----------------------------------------------------- */
    identifierStatus?.setAttribute(
      "aria-hidden",
      "true"
    );
    /* -----------------------------------------------------
       Hide verified text
       ----------------------------------------------------- */
    loginVerifiedState?.classList.add(
      "hidden"
    );
    /* -----------------------------------------------------
       Show Lanjut
       ----------------------------------------------------- */
    if (continueLogin) {
      continueLogin.style.display = "";
      continueLogin.disabled = false;
    }
    /* -----------------------------------------------------
       Hide password
       ----------------------------------------------------- */
    step2?.classList.add(
      "hidden"
    );
    /* -----------------------------------------------------
       Show identifier form
       ----------------------------------------------------- */
    step1?.classList.remove(
      "hidden"
    );
    /* -----------------------------------------------------
       Reset password
       ----------------------------------------------------- */
    if (password) {
      password.value = "";
      password.type = "password";
    }
    /* -----------------------------------------------------
       Reset eye icon
       ----------------------------------------------------- */
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
     SHOW ACCOUNT FOUND
     ======================================================= */
  function showAccountFound(found) {
    if (!found) {
      return;
    }
    /* -----------------------------------------------------
       Get registered username
       ----------------------------------------------------- */
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
    /* -----------------------------------------------------
       Keep identifier visible
       ----------------------------------------------------- */
    if (identifier) {
      /*
       * Ganti nilai input dengan username
       * yang benar-benar terdaftar.
       */
      identifier.value =
        currentUsername;
      /*
       * Lock identifier.
       */
      identifier.disabled = true;
      identifier.setAttribute(
        "aria-readonly",
        "true"
      );
    }
    /* -----------------------------------------------------
       Green check inside identifier
       ----------------------------------------------------- */
    identifierWrap?.classList.add(
      "found"
    );
    if (identifierStatus) {
      identifierStatus.setAttribute(
        "aria-hidden",
        "false"
      );
    }
    /* -----------------------------------------------------
       Inline verified status
       ----------------------------------------------------- */
    loginVerifiedState?.classList.remove(
      "hidden"
    );
    /* -----------------------------------------------------
       Hide Lanjut completely
       ----------------------------------------------------- */
    if (continueLogin) {
      continueLogin.style.display =
        "none";
    }
    /* -----------------------------------------------------
       State
       ----------------------------------------------------- */
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
      /* ---------------------------------------------------
         Prevent duplicate lookup
         --------------------------------------------------- */
      if (accountFound) {
        return;
      }
      /* ---------------------------------------------------
         Identifier value
         --------------------------------------------------- */
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
      /* ---------------------------------------------------
         Continue button
         --------------------------------------------------- */
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
      /* ---------------------------------------------------
         Lookup
         --------------------------------------------------- */
      try {
        /*
         * IMPORTANT:
         * Jangan ubah Auth.lookup().
         */
        const found =
          await Auth.lookup(value);
        console.log(
          "LOGIN LOOKUP:",
          found
        );
        /* =================================================
           ACCOUNT NOT FOUND
           ================================================= */
        if (
          !found ||
          !found.auth_email
        ) {
          currentEmail = "";
          currentUsername = "";
          accountFound = false;
          /*
           * Pastikan password tetap tersembunyi.
           */
          step2?.classList.add(
            "hidden"
          );
          /*
           * Pastikan identifier kembali normal.
           */
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
          if (identifier) {
            identifier.disabled = false;
            identifier.removeAttribute(
              "aria-readonly"
            );
          }
          showError(
            "Akun tidak ditemukan. Periksa kembali username atau Gmail kamu."
          );
          return;
        }
        /* =================================================
           ACCOUNT BANNED
           ================================================= */
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
          if (identifier) {
            identifier.disabled = false;
            identifier.removeAttribute(
              "aria-readonly"
            );
          }
          showError(
            "Akun ini sedang diblokir dan tidak dapat digunakan untuk login."
          );
          return;
        }
        /* =================================================
           VALID AUTH EMAIL
           ================================================= */
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
        /* =================================================
           ACCOUNT FOUND
           ================================================= */
        showAccountFound(
          found
        );
        /* =================================================
           SHOW PASSWORD SECTION
           ================================================= */
        step1?.classList.remove(
          "hidden"
        );
        step2?.classList.remove(
          "hidden"
        );
        /* =================================================
           SUCCESS TOAST
           ================================================= */
        toast(
          "✓ Akun ditemukan",
          "success"
        );
        /* =================================================
           FOCUS PASSWORD
           ================================================= */
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
        /*
         * Jangan mengembalikan display jika
         * akun sudah ditemukan.
         */
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
      /* ---------------------------------------------------
         Safety check
         --------------------------------------------------- */
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
      /* ---------------------------------------------------
         Password
         --------------------------------------------------- */
      const pass =
        password?.value || "";
      if (!pass) {
        showError(
          "Masukkan kata sandi."
        );
        password?.focus();
        return;
      }
      /* ---------------------------------------------------
         Login button
         --------------------------------------------------- */
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
      /* ---------------------------------------------------
         Auth login
         --------------------------------------------------- */
      try {
        console.log(
          "LOGIN EMAIL:",
          currentEmail
        );
        /*
         * IMPORTANT:
         * Auth.login() tetap sama.
         */
        await Auth.login(
          currentEmail,
          pass
        );
        /* -------------------------------------------------
           Success
           ------------------------------------------------- */
        toast(
          "Login berhasil ✓",
          "success"
        );
        /* -------------------------------------------------
           Redirect
           ------------------------------------------------- */
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
      /*
       * Kembalikan semuanya ke kondisi
       * awal.
       */
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
         * IMPORTANT:
         * Auth.google() tetap sama.
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
      /*
       * Jika akun sudah ditemukan,
       * langsung gunakan email yang sudah didapat.
       */
      let email =
        currentEmail;
      /* ---------------------------------------------------
         Jika belum lookup, lakukan lookup.
         --------------------------------------------------- */
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
          /*
           * IMPORTANT:
           * Auth.lookup() tetap sama.
           */
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
      /* ---------------------------------------------------
         Validate email
         --------------------------------------------------- */
      if (!email) {
        showError(
          "Email akun tidak valid."
        );
        return;
      }
      /* ---------------------------------------------------
         Reset password
         --------------------------------------------------- */
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
   * Saat halaman pertama kali dibuka:
   *
   * Identifier       = tampil
   * Identifier       = aktif
   * Check hijau      = hidden
   * Verified status  = hidden
   * Lanjut           = tampil
   * Password         = hidden
   * Account state    = tidak ada
   */
  showInitialState(
    false
  );
});
