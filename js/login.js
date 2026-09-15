/* =========================================================
   PasTele — LOGIN
   FINAL UI + SUPABASE AUTH

   FLOW
   1. Username / Gmail
   2. Cek akun
   3. Jika ditemukan:
      - tampilkan username + centang hijau
      - tombol Lanjut hilang
      - form password muncul
   4. Password benar -> hijau + redirect
   5. Password salah -> merah
   6. Semua toast otomatis hilang setelah 3 detik
   ========================================================= */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const step1 = $("loginStep1");
  const step2 = $("loginStep2");
  const identifier = $("identifier");
  const identifierWrap = $("identifierWrap");
  const identifierStatus = $("identifierStatus");
  const verifiedState = $("loginVerifiedState");
  const verifiedUsername = $("verifiedUsername");
  const continueLogin = $("continueLogin");

  const accountUsername = $("accountUsername");
  const password = $("password");
  const toggle = $("toggle");
  const loginSubmit = $("loginSubmit");
  const loginSubmitText = document.querySelector(".login-submit-text");
  const google = $("google");
  const changeAccount = $("changeAccount");
  const securityStatus = $("loginSecurityStatus");
  const toast = $("toast");
  const themeButton = $("themeButton");
  const footerYear = $("footerYear");

  let foundAccount = null;
  let lookupTimer = null;
  let lookupSequence = 0;
  let toastTimer = null;
  let loginBusy = false;

  const isEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

  const clean = (value) => String(value || "").trim();
  const cleanLower = (value) => clean(value).toLowerCase();

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  /* ---------------------------------------------------------
     TOAST — selalu 3 detik
     --------------------------------------------------------- */
  function showToast(message, type = "error") {
    if (!toast) return;

    clearTimeout(toastTimer);

    const icon = type === "success"
      ? "fa-circle-check"
      : type === "error"
        ? "fa-circle-exclamation"
        : "fa-circle-info";

    toast.className = "";
    toast.innerHTML = `
      <span class="toast-icon"><i class="fa-solid ${icon}"></i></span>
      <span class="toast-message">${esc(message)}</span>
      <button type="button" class="toast-close" aria-label="Tutup">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    toast.classList.add("show", type);

    toast.querySelector(".toast-close")?.addEventListener("click", hideToast, { once: true });

    toastTimer = setTimeout(hideToast, 3000);
  }

  function hideToast() {
    if (!toast) return;
    toast.classList.remove("show");
  }

  /* ---------------------------------------------------------
     ACCOUNT STATE
     --------------------------------------------------------- */
  function setIdentifierState(state) {
    identifierWrap?.classList.remove("is-valid", "is-invalid", "is-loading");
    identifierStatus?.classList.remove("show", "error", "loading");

    if (state === "valid") {
      identifierWrap?.classList.add("is-valid");
      identifierStatus?.classList.add("show");
    } else if (state === "invalid") {
      identifierWrap?.classList.add("is-invalid");
      identifierStatus?.classList.add("show", "error");
      if (identifierStatus) {
        identifierStatus.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      }
    } else if (state === "loading") {
      identifierWrap?.classList.add("is-loading");
      identifierStatus?.classList.add("show", "loading");
      if (identifierStatus) {
        identifierStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      }
    } else {
      if (identifierStatus) {
        identifierStatus.innerHTML = '<i class="fa-solid fa-check"></i>';
      }
    }
  }

  function resetIdentifierVisual() {
    setIdentifierState("");
    verifiedState?.classList.add("hidden");
    if (verifiedUsername) verifiedUsername.textContent = "";
  }

  function displayName(row, fallback) {
    return clean(
      row?.username ||
      row?.display_name ||
      row?.name ||
      fallback
    );
  }

  function accountIsUsable(row) {
    if (!row || typeof row !== "object") return false;

    const username = clean(row.username);
    const authEmail = clean(row.auth_email || row.email);

    /*
     * Auth.lookup() pada versi lama dapat mengembalikan fallback
     * email ketika row profiles tidak terbaca. Fallback tersebut
     * tidak dianggap sebagai akun terverifikasi karena tidak punya
     * username/profile identity.
     */
    return Boolean(username || (authEmail && row.id));
  }

  async function lookupAccount(value) {
    const client = window.sb || window.supabaseClient;

    if (!client) {
      throw new Error("Supabase belum siap.");
    }

    const normalized = cleanLower(value);
    if (!normalized) return null;

    /* Primary: Auth Core yang sudah ada di project. */
    if (window.Auth && typeof window.Auth.lookup === "function") {
      try {
        const row = await window.Auth.lookup(normalized);
        if (accountIsUsable(row)) return row;
      } catch (_) {}
    }

    /*
     * Fallback langsung ke profiles.
     * Kolom yang dipakai mengikuti schema PasTele:
     * username, display_name, auth_email.
     */
    try {
      let query = client
        .from("profiles")
        .select("id,username,display_name,auth_email,email,role,status,is_admin,is_banned");

      if (isEmail(normalized)) {
        query = query.or(`auth_email.eq.${normalized},email.eq.${normalized}`);
      } else {
        query = query.eq("username", normalized);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.warn("[PasTele Login] account lookup:", error);
      throw new Error("Tidak dapat memeriksa akun. Coba lagi.");
    }
  }

  function openPasswordStep(row) {
    foundAccount = row;

    const username = displayName(row, clean(identifier.value));
    if (verifiedUsername) {
      verifiedUsername.innerHTML =
        `<strong>@${esc(row.username || username)}</strong> terdaftar`;
    }

    if (accountUsername) {
      accountUsername.textContent = row.username
        ? `@${row.username}`
        : username;
    }

    setIdentifierState("valid");
    verifiedState?.classList.remove("hidden");

    /*
     * Sesuai permintaan:
     * tombol Lanjut hilang ketika akun ditemukan.
     */
    continueLogin?.classList.add("hidden");

    step1?.classList.add("account-found");
    step2?.classList.remove("hidden");

    securityStatus.textContent = "";
    securityStatus.className = "login-security-status";

    requestAnimationFrame(() => {
      password?.focus({ preventScroll: false });
    });
  }

  function backToIdentifier() {
    foundAccount = null;
    loginBusy = false;

    step2?.classList.add("hidden");
    step1?.classList.remove("account-found");
    continueLogin?.classList.remove("hidden");

    if (loginSubmit) {
      loginSubmit.disabled = false;
      loginSubmit.classList.remove("loading");
    }

    if (loginSubmitText) loginSubmitText.textContent = "Masuk";

    password.value = "";
    securityStatus.textContent = "";
    securityStatus.className = "login-security-status";

    resetIdentifierVisual();

    requestAnimationFrame(() => identifier?.focus());
  }

  /* ---------------------------------------------------------
     STEP 1
     --------------------------------------------------------- */
  async function checkIdentifier() {
    const sequence = ++lookupSequence;
    const value = clean(identifier.value);

    if (!value) {
      resetIdentifierVisual();
      return;
    }

    if (value.length < 3) {
      resetIdentifierVisual();
      return;
    }

    setIdentifierState("loading");

    try {
      const row = await lookupAccount(value);

      if (sequence !== lookupSequence) return;

      if (!row) {
        foundAccount = null;
        setIdentifierState("invalid");
        verifiedState?.classList.add("hidden");
        if (identifierStatus) {
          identifierStatus.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        }
        return;
      }

      openPasswordStep(row);
    } catch (error) {
      if (sequence !== lookupSequence) return;
      setIdentifierState("invalid");
      showToast(error?.message || "Gagal memeriksa akun.", "error");
    }
  }

  function scheduleLookup() {
    clearTimeout(lookupTimer);

    if (step1?.classList.contains("account-found")) return;

    lookupTimer = setTimeout(checkIdentifier, 450);
  }

  step1?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (foundAccount) {
      openPasswordStep(foundAccount);
      return;
    }

    await checkIdentifier();

    if (!foundAccount) {
      showToast("Akun tidak ditemukan. Periksa username atau Gmail kamu.", "error");
    }
  });

  identifier?.addEventListener("input", () => {
    if (foundAccount) {
      backToIdentifier();
      identifier.value = clean(identifier.value);
    }

    resetIdentifierVisual();
    scheduleLookup();
  });

  identifier?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      clearTimeout(lookupTimer);
      checkIdentifier();
    }
  });

  /* ---------------------------------------------------------
     PASSWORD
     --------------------------------------------------------- */
  toggle?.addEventListener("click", () => {
    const showing = password.type === "text";
    password.type = showing ? "password" : "text";

    toggle.innerHTML = showing
      ? '<i class="fa-regular fa-eye"></i>'
      : '<i class="fa-regular fa-eye-slash"></i>';

    toggle.setAttribute(
      "aria-label",
      showing ? "Tampilkan kata sandi" : "Sembunyikan kata sandi"
    );
  });

  function setLoginLoading(loading) {
    loginBusy = loading;

    if (!loginSubmit) return;

    loginSubmit.disabled = loading;
    loginSubmit.classList.toggle("loading", loading);

    if (loginSubmitText) {
      loginSubmitText.textContent = loading ? "Memeriksa..." : "Masuk";
    }
  }

  function securityMessage(message, type) {
    if (!securityStatus) return;

    securityStatus.className = `login-security-status ${type}`;
    securityStatus.innerHTML = `
      <i class="fa-solid ${type === "success" ? "fa-circle-check" : "fa-circle-exclamation"}"></i>
      <span>${esc(message)}</span>
    `;
  }

  step2?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (loginBusy) return;

    const pass = String(password.value || "");
    if (!foundAccount) {
      backToIdentifier();
      showToast("Silakan masukkan username atau Gmail terlebih dahulu.", "error");
      return;
    }

    if (!pass) {
      securityMessage("Kata sandi wajib diisi.", "error");
      showToast("Kata sandi wajib diisi.", "error");
      password.focus();
      return;
    }

    setLoginLoading(true);
    securityStatus.className = "login-security-status";
    securityStatus.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i><span>Memverifikasi akun...</span>';

    try {
      if (!window.Auth || typeof window.Auth.login !== "function") {
        throw new Error("Modul autentikasi belum tersedia.");
      }

      await window.Auth.login(
        clean(identifier.value),
        pass
      );

      securityMessage("Login berhasil. Mengalihkan ke dashboard...", "success");
      showToast("Login berhasil. Selamat datang kembali!", "success");

      /*
       * Beri waktu singkat agar notifikasi hijau terlihat,
       * tetapi tidak menunggu 3 detik penuh.
       */
      setTimeout(() => {
        window.location.replace("/dashboard.html");
      }, 650);

    } catch (error) {
      setLoginLoading(false);

      const raw = String(
        error?.message ||
        error?.error_description ||
        "Login gagal."
      );

      const lower = raw.toLowerCase();

      let message = "Kata sandi salah atau akun tidak dapat masuk.";

      if (
        lower.includes("email not confirmed") ||
        lower.includes("email belum") ||
        lower.includes("confirm")
      ) {
        message = "Email akun belum dikonfirmasi.";
      } else if (
        lower.includes("too many") ||
        lower.includes("rate limit")
      ) {
        message = "Terlalu banyak percobaan. Coba lagi beberapa saat.";
      } else if (
        lower.includes("banned") ||
        lower.includes("blocked") ||
        lower.includes("ditangguhkan")
      ) {
        message = "Akun ini tidak diizinkan untuk masuk.";
      }

      securityMessage(message, "error");
      showToast(message, "error");

      password.focus();
      password.select();
    }
  });

  /* ---------------------------------------------------------
     GOOGLE
     --------------------------------------------------------- */
  google?.addEventListener("click", async () => {
    if (!window.Auth || typeof window.Auth.google !== "function") {
      showToast("Login Google belum tersedia.", "error");
      return;
    }

    google.disabled = true;
    google.classList.add("loading");
    google.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i><span>Membuka Google...</span>';

    try {
      await window.Auth.google();
    } catch (error) {
      showToast(
        error?.message || "Login dengan Google gagal.",
        "error"
      );

      google.disabled = false;
      google.classList.remove("loading");
      google.innerHTML =
        '<span class="google-icon">G</span><span>Masuk dengan Google</span>';
    }
  });

  /* ---------------------------------------------------------
     CHANGE ACCOUNT
     --------------------------------------------------------- */
  changeAccount?.addEventListener("click", backToIdentifier);

  /* ---------------------------------------------------------
     THEME
     --------------------------------------------------------- */
  function getThemeMode() {
    return localStorage.getItem("pastele-theme") || "auto";
  }

  function applyTheme(mode) {
    const dark = mode === "dark" ||
      (mode === "auto" &&
       window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.dataset.theme = dark ? "dark" : "light";

    if (themeButton) {
      themeButton.innerHTML = dark
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';

      themeButton.setAttribute(
        "aria-label",
        dark ? "Gunakan mode terang" : "Gunakan mode gelap"
      );
    }
  }

  themeButton?.addEventListener("click", () => {
    const current = getThemeMode();
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem("pastele-theme", next);
    applyTheme(next);
  });

  window.matchMedia("(prefers-color-scheme: dark)")
    .addEventListener?.("change", () => {
      if (getThemeMode() === "auto") applyTheme("auto");
    });

  /* ---------------------------------------------------------
     INIT
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(getThemeMode());

    if (footerYear) {
      footerYear.textContent = new Date().getFullYear();
    }

    setIdentifierState("");
    verifiedState?.classList.add("hidden");
    step2?.classList.add("hidden");

    identifier?.focus();
  });

})();
