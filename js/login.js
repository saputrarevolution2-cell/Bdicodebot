/* =========================================================
   PasTele — /js/login.js
   Login logic + SINGLE floating toast notification
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     ELEMENTS
     ======================================================= */
  const step1 = document.getElementById("loginStep1");
  const step2 = document.getElementById("loginStep2");
  const identifier = document.getElementById("identifier");
  const password = document.getElementById("password");
  const toggle = document.getElementById("toggle");
  const google = document.getElementById("google");
  const forgot = document.getElementById("forgot");
  const toastElement = document.getElementById("toast");
  let currentEmail = "";
  /* =======================================================
     TOAST
     ======================================================= */
  let toastTimer = null;
  function toast(message, type = "error") {
    if (!toastElement) {
      console.log(`[${type}] ${message}`);
      return;
    }
    clearTimeout(toastTimer);
    toastElement.textContent = String(message || "");
    toastElement.className = `show ${type}`;
    toastTimer = setTimeout(() => {
      toastElement.className = "";
      toastElement.textContent = "";
    }, 5000);
  }
  /* =======================================================
     ERROR
     SEMUA ERROR SEKARANG KE FLOATING TOAST
     ======================================================= */
  function showError(message) {
    toast(
      message || "Terjadi kesalahan.",
      "error"
    );
  }
  /* =======================================================
     SUCCESS
     SEMUA SUCCESS KE FLOATING TOAST
     ======================================================= */
  function showSuccess(message) {
    toast(
      message || "Berhasil.",
      "success"
    );
  }
  /* =======================================================
     SUPABASE CHECK
     ======================================================= */
  if (!window.sb) {
    showError(
      "Supabase belum terkonfigurasi. Isi js/config.js dengan anon/publishable key."
    );
  }
  /* =======================================================
     STEP 1
     CEK USERNAME / GMAIL
     ======================================================= */
  step1?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = identifier.value.trim();
    if (!value) {
      showError(
        "Masukkan username atau Gmail terlebih dahulu."
      );
      identifier.focus();
      return;
    }
    const btn = step1.querySelector(
      "button[type='submit'], button:not([type])"
    );
    if (!btn) return;
    const oldHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Memeriksa...
    `;
    try {
      /* =================================================
         JANGAN UBAH Auth.lookup()
         ================================================= */
      const found = await Auth.lookup(value);
      console.log(
        "LOGIN LOOKUP:",
        found
      );
      /* =================================================
         AKUN TIDAK DITEMUKAN
         ================================================= */
      if (!found || !found.auth_email) {
        showError(
          "Akun tidak ditemukan. Periksa kembali username atau Gmail kamu."
        );
        step2.classList.add("hidden");
        currentEmail = "";
        return;
      }
      /* =================================================
         AKUN DIBLOKIR
         ================================================= */
      if (
        found.is_banned === true ||
        String(found.status || "").toLowerCase() === "banned"
      ) {
        showError(
          "Akun ini sedang diblokir dan tidak dapat digunakan untuk login."
        );
        step2.classList.add("hidden");
        currentEmail = "";
        return;
      }
      /* =================================================
         AKUN DITEMUKAN
         ================================================= */
      currentEmail =
        String(found.auth_email).trim();
      /*
       * Tidak lagi memakai accountInfo.
       * Notifikasi hanya floating.
       */
      showSuccess(
        "Akun ditemukan ✓"
      );
      /* =================================================
         PINDAH KE PASSWORD
         ================================================= */
      step1.classList.add("hidden");
      step2.classList.remove("hidden");
      password.value = "";
      setTimeout(() => {
        password.focus();
      }, 100);
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
      btn.innerHTML = oldHTML;
    }
  });
  /* =======================================================
     STEP 2
     LOGIN PASSWORD
     ======================================================= */
  step2?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentEmail) {
      showError(
        "Silakan periksa akun terlebih dahulu."
      );
      step2.classList.add("hidden");
      step1.classList.remove("hidden");
      identifier.focus();
      return;
    }
    const pass = password.value;
    if (!pass) {
      showError(
        "Masukkan kata sandi."
      );
      password.focus();
      return;
    }
    const btn = step2.querySelector(
      "button[type='submit'], button:not([type])"
    );
    if (!btn) return;
    const oldHTML = btn.innerHTML;
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
       * Auth.login tetap menggunakan
       * email hasil Auth.lookup()
       */
      await Auth.login(
        currentEmail,
        pass
      );
      showSuccess(
        "Login berhasil ✓"
      );
      /* =================================================
         REDIRECT
         ================================================= */
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
      btn.innerHTML = oldHTML;
    }
  });
  /* =======================================================
     GOOGLE LOGIN
     ======================================================= */
  google?.addEventListener("click", async () => {
    google.disabled = true;
    const oldHTML =
      google.innerHTML;
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
      google.innerHTML = oldHTML;
    }
  });
  /* =======================================================
     FORGOT PASSWORD
     ======================================================= */
  forgot?.addEventListener("click", async (e) => {
    e.preventDefault();
    const value =
      currentEmail ||
      identifier.value.trim();
    if (!value) {
      showError(
        "Masukkan username atau Gmail terlebih dahulu."
      );
      identifier.focus();
      return;
    }
    try {
      const found =
        await Auth.lookup(value);
      if (!found?.auth_email) {
        showError(
          "Akun tidak ditemukan."
        );
        return;
      }
      const { error } =
        await sb.auth.resetPasswordForEmail(
          found.auth_email,
          {
            redirectTo:
              `${window.location.origin}/reset-password.html`
          }
        );
      if (error) {
        throw error;
      }
      showSuccess(
        "Link reset password sudah dikirim. Periksa inbox Gmail kamu."
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
  });
  /* =======================================================
     TOGGLE PASSWORD
     ======================================================= */
  toggle?.addEventListener("click", () => {
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
  });
});
