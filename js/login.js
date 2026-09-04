/* =========================================================
   PasTele — LOGIN
   Stable version
   Username / Gmail → Password → Login
   All notifications use #toast only
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // =======================================================
  // SUPABASE CHECK
  // =======================================================
  if (!window.sb) {
    toast(
      "Supabase belum terkonfigurasi. Isi js/config.js dengan anon/publishable key.",
      "error"
    );
    return;
  }
  // =======================================================
  // ELEMENTS
  // =======================================================
  const step1 = document.getElementById("loginStep1");
  const step2 = document.getElementById("loginStep2");
  const identifier = document.getElementById("identifier");
  const password = document.getElementById("password");
  const toggle = document.getElementById("toggle");
  const google = document.getElementById("google");
  const forgot = document.getElementById("forgot");
  // Email hasil lookup
  let currentEmail = "";
  // =======================================================
  // TOAST
  // =======================================================
  function toast(message, type = "error") {
    const el = document.getElementById("toast");
    if (!el) {
      console.log(`[${type}] ${message}`);
      return;
    }
    el.textContent = message;
    // Reset animation
    el.className = "";
    void el.offsetWidth;
    el.className = `show ${type}`;
    clearTimeout(window.__loginToastTimer);
    window.__loginToastTimer = setTimeout(() => {
      el.className = "";
    }, 4000);
  }
  // =======================================================
  // ERROR
  // Semua error diarahkan ke floating toast
  // =======================================================
  function showError(message) {
    toast(message, "error");
  }
  function clearError() {
    const el = document.getElementById("toast");
    if (el) {
      el.className = "";
      el.textContent = "";
    }
    clearTimeout(window.__loginToastTimer);
  }
  // =======================================================
  // ESCAPE HTML
  // =======================================================
  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  // =======================================================
  // STEP 1
  // CEK USERNAME / GMAIL
  // =======================================================
  step1?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const value = identifier?.value?.trim() || "";
    if (!value) {
      showError("Masukkan username atau Gmail terlebih dahulu.");
      identifier?.focus();
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
      // ===================================================
      // PENTING:
      // JANGAN UBAH Auth.lookup()
      // ===================================================
      const found = await Auth.lookup(value);
      console.log("LOGIN LOOKUP:", found);
      // ===================================================
      // AKUN TIDAK DITEMUKAN
      // ===================================================
      if (!found || !found.auth_email) {
        currentEmail = "";
        step2?.classList.add("hidden");
        step1?.classList.remove("hidden");
        showError(
          "Akun tidak ditemukan. Periksa kembali username atau Gmail kamu."
        );
        return;
      }
      // ===================================================
      // AKUN DIBLOKIR
      // ===================================================
      if (
        found.is_banned === true ||
        String(found.status || "").toLowerCase() === "banned"
      ) {
        currentEmail = "";
        step2?.classList.add("hidden");
        step1?.classList.remove("hidden");
        showError(
          "Akun ini sedang diblokir dan tidak dapat digunakan untuk login."
        );
        return;
      }
      // ===================================================
      // AKUN DITEMUKAN
      // ===================================================
      currentEmail = String(found.auth_email).trim();
      if (!currentEmail) {
        showError("Email akun tidak valid.");
        return;
      }
      // ===================================================
      // PINDAH KE STEP PASSWORD
      // ===================================================
      toast("Akun ditemukan ✓", "success");
      step1?.classList.add("hidden");
      step2?.classList.remove("hidden");
      if (password) {
        password.value = "";
        setTimeout(() => {
          password.focus();
        }, 100);
      }
    } catch (err) {
      console.error("LOGIN LOOKUP ERROR:", err);
      showError(
        err?.message ||
        "Terjadi kesalahan saat memeriksa akun."
      );
    } finally {
      btn.disabled = false;
      btn.innerHTML = oldHTML;
    }
  });
  // =======================================================
  // STEP 2
  // LOGIN PASSWORD
  // =======================================================
  step2?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    // =====================================================
    // BELUM MELAKUKAN LOOKUP
    // =====================================================
    if (!currentEmail) {
      showError(
        "Silakan masukkan username atau Gmail terlebih dahulu."
      );
      step2?.classList.add("hidden");
      step1?.classList.remove("hidden");
      identifier?.focus();
      return;
    }
    // =====================================================
    // PASSWORD KOSONG
    // =====================================================
    const pass = password?.value || "";
    if (!pass) {
      showError("Masukkan kata sandi.");
      password?.focus();
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
      console.log("LOGIN EMAIL:", currentEmail);
      // ===================================================
      // PENTING:
      // AUTH.LOGIN TETAP SAMA
      // ===================================================
      await Auth.login(currentEmail, pass);
      toast("Login berhasil ✓", "success");
      // ===================================================
      // REDIRECT
      // ===================================================
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 600);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      showError(
        err?.message ||
        "Kata sandi salah atau login gagal."
      );
      btn.disabled = false;
      btn.innerHTML = oldHTML;
    }
  });
  // =======================================================
  // GOOGLE LOGIN
  // =======================================================
  google?.addEventListener("click", async () => {
    const oldHTML = google.innerHTML;
    google.disabled = true;
    google.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Menghubungkan...
    `;
    try {
      await Auth.google();
    } catch (err) {
      console.error("GOOGLE LOGIN ERROR:", err);
      showError(
        err?.message ||
        "Login dengan Google gagal."
      );
      google.disabled = false;
      google.innerHTML = oldHTML;
    }
  });
  // =======================================================
  // FORGOT PASSWORD
  // =======================================================
  forgot?.addEventListener("click", async (e) => {
    e.preventDefault();
    clearError();
    const value =
      currentEmail ||
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
      // ===================================================
      // CARI AKUN
      // ===================================================
      const found = await Auth.lookup(value);
      if (!found?.auth_email) {
        showError("Akun tidak ditemukan.");
        return;
      }
      // ===================================================
      // RESET PASSWORD
      // ===================================================
      const { error } =
        await sb.auth.resetPasswordForEmail(
          found.auth_email,
          {
            redirectTo:
              `${window.location.origin}/reset-password.html`
          }
        );
      if (error) throw error;
      toast(
        "Link reset password sudah dikirim ke Gmail kamu.",
        "success"
      );
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      showError(
        err?.message ||
        "Gagal mengirim reset password."
      );
    }
  });
  // =======================================================
  // TOGGLE PASSWORD
  // =======================================================
  toggle?.addEventListener("click", () => {
    if (!password) return;
    const isPassword =
      password.type === "password";
    password.type =
      isPassword ? "text" : "password";
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
  });
});
