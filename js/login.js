
/* SOURCE: /js/login.js */
document.addEventListener("DOMContentLoaded", () => {
  if (!window.sb) {
    const msg = "Supabase belum terkonfigurasi. Isi js/config.js dengan anon/publishable key.";
    const box = document.getElementById("loginStep1");
    const card = box?.closest(".auth-card") || document.body;
    const el = document.createElement("div");
    el.className = "auth-error";
    el.style.display = "flex";
    el.innerHTML = `<i class="fa-solid fa-circle-xmark"></i><span>${msg}</span>`;
    card.prepend(el);
  }
  const step1 = document.getElementById("loginStep1");
  const step2 = document.getElementById("loginStep2");
  const identifier = document.getElementById("identifier");
  const password = document.getElementById("password");
  const accountInfo = document.getElementById("accountInfo");
  const toggle = document.getElementById("toggle");
  const google = document.getElementById("google");
  const forgot = document.getElementById("forgot");
  let currentEmail = "";
  // =====================================================
  // TOAST
  // =====================================================
  function toast(message, type = "error") {
    const el = document.getElementById("toast");
    if (!el) {
      console.log(`[${type}] ${message}`);
      return;
    }
    el.textContent = message;
    el.className = `show ${type}`;
    clearTimeout(window.__loginToastTimer);
    window.__loginToastTimer = setTimeout(() => {
      el.className = "";
    }, 5000);
  }
  // =====================================================
  // ERROR
  // =====================================================
  function showError(message) {
    let el = document.getElementById("loginError");
    if (!el) {
      el = document.createElement("div");
      el.id = "loginError";
      el.className = "auth-error floating-notice";
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <i class="fa-solid fa-circle-xmark"></i>
      <span>${escapeHTML(message)}</span>
    `;
    el.style.display = "flex";
    el.classList.add("show");
    clearTimeout(window.__loginErrorTimer);
    window.__loginErrorTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 220);
    }, 5000);
  }
  function clearError() {
    document.getElementById("loginError")?.remove();
  }
  // =====================================================
  // SUCCESS ACCOUNT
  // =====================================================
  function showAccountSuccess(profile) {
    const email = escapeHTML(profile.auth_email || "");
    const username = escapeHTML(
      profile.username ||
      profile.display_name ||
      "Pengguna"
    );
    accountInfo.innerHTML = `
      <div class="account-success">
        <div class="account-success-icon">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <div class="account-success-text">
          <strong>Akun ditemukan</strong>
          <span>${username}</span>
          <small>${email}</small>
        </div>
      </div>
    `;
    accountInfo.classList.add("success");
  }
  // =====================================================
  // ESCAPE HTML
  // =====================================================
  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  // =====================================================
  // STEP 1
  // CEK USERNAME / GMAIL
  // =====================================================
  step1?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const value = identifier.value.trim();
    if (!value) {
      showError("Masukkan username atau Gmail terlebih dahulu.");
      identifier.focus();
      return;
    }
    const btn = step1.querySelector("button[type='submit'], button:not([type])");
    if (!btn) return;
    const oldHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Memeriksa...
    `;
    try {
      // ===============================================
      // CEK AKUN
      // ===============================================
      const found = await Auth.lookup(value);
      console.log("LOGIN LOOKUP:", found);
      // ===============================================
      // AKUN TIDAK DITEMUKAN
      // ===============================================
      if (!found || !found.auth_email) {
        showError(
          "Akun tidak ditemukan. Periksa kembali username atau Gmail kamu."
        );
        toast("Akun tidak ditemukan.", "error");
        step2.classList.add("hidden");
        currentEmail = "";
        return;
      }
      // ===============================================
      // AKUN DIBLOKIR
      // ===============================================
      if (
        found.is_banned === true ||
        String(found.status || "").toLowerCase() === "banned"
      ) {
        showError(
          "Akun ini sedang diblokir dan tidak dapat digunakan untuk login."
        );
        toast("Akun diblokir.", "error");
        step2.classList.add("hidden");
        currentEmail = "";
        return;
      }
      // ===============================================
      // AKUN DITEMUKAN
      // ===============================================
      currentEmail = String(found.auth_email).trim();
      showAccountSuccess(found);
      toast("Akun ditemukan ✓", "success");
      // Sembunyikan step username
      step1.classList.add("hidden");
      // Tampilkan password
      step2.classList.remove("hidden");
      password.value = "";
      setTimeout(() => {
        password.focus();
      }, 100);
    } catch (err) {
      console.error("LOGIN LOOKUP ERROR:", err);
      showError(
        err?.message ||
        "Terjadi kesalahan saat memeriksa akun."
      );
      toast("Gagal memeriksa akun.", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = oldHTML;
    }
  });
  // =====================================================
  // STEP 2
  // LOGIN PASSWORD
  // =====================================================
  step2?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    if (!currentEmail) {
      showError("Silakan periksa akun terlebih dahulu.");
      step2.classList.add("hidden");
      step1.classList.remove("hidden");
      return;
    }
    const pass = password.value;
    if (!pass) {
      showError("Masukkan kata sandi.");
      password.focus();
      return;
    }
    const btn = step2.querySelector("button[type='submit'], button:not([type])");
    if (!btn) return;
    const oldHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Masuk...
    `;
    try {
      console.log("LOGIN EMAIL:", currentEmail);
      // Auth.login harus menerima identifier + password
      await Auth.login(currentEmail, pass);
      toast("Login berhasil ✓", "success");
      // ===============================================
      // REDIRECT
      // ===============================================
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 600);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      showError(
        err?.message ||
        "Kata sandi salah atau login gagal."
      );
      toast(
        err?.message || "Login gagal.",
        "error"
      );
      btn.disabled = false;
      btn.innerHTML = oldHTML;
    }
  });
  // =====================================================
  // GOOGLE LOGIN
  // =====================================================
  google?.addEventListener("click", async () => {
    google.disabled = true;
    const oldHTML = google.innerHTML;
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
      toast("Login Google gagal.", "error");
      google.disabled = false;
      google.innerHTML = oldHTML;
    }
  });
  // =====================================================
  // FORGOT PASSWORD
  // =====================================================
  forgot?.addEventListener("click", async (e) => {
    e.preventDefault();
    clearError();
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
      const found = await Auth.lookup(value);
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
      if (error) throw error;
      accountInfo.innerHTML = `
        <div class="account-success">
          <div class="account-success-icon">
            <i class="fa-solid fa-envelope-circle-check"></i>
          </div>
          <div class="account-success-text">
            <strong>Email reset password terkirim</strong>
            <span>Periksa inbox Gmail kamu.</span>
          </div>
        </div>
      `;
      toast(
        "Link reset password sudah dikirim.",
        "success"
      );
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      showError(
        err?.message ||
        "Gagal mengirim reset password."
      );
      toast(
        "Gagal mengirim reset password.",
        "error"
      );
    }
  });
  // =====================================================
  // TOGGLE PASSWORD
  // =====================================================
  toggle?.addEventListener("click", () => {
    const isPassword =
      password.type === "password";
    password.type =
      isPassword ? "text" : "password";
    toggle.innerHTML =
      isPassword
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';
  });
});
