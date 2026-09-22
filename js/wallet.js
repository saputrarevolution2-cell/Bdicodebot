/* PasTele — self-contained wallet page script. One HTML -> one JS -> one CSS. */
/* PasTele / Bdicodebot — NEW PROJECT CONFIG
 * Put ONLY the Supabase project URL and anon/publishable key here.
 * Never put service_role / secret keys in this browser file.
 */
window.PASTELE_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://jxrndamvelqwhbcromye.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo'
});

/* PasTele — zero-flash theme preload. Must run in <head>. */
(() => {
  try {
    const key = 'pastele-theme';
    const mode = localStorage.getItem(key) || 'auto';
    const hour = new Date().getHours();
    const dark = mode === 'dark' ||
      (mode === 'auto' && (hour >= 18 || hour < 6)) ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themeMode = mode;
    root.classList.add(dark ? 'theme-dark' : 'theme-light');
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (_) {}
})();

/* =========================================================
   PasTele — Supabase client
   ========================================================= */
(() => {
  "use strict";

  const cfg = window.PASTELE_CONFIG || {};
  window.__PASTELE_RUNTIME__ = {
    configLoaded: !!window.PASTELE_CONFIG,
    supabaseLibraryLoaded: !!window.supabase,
    configUrl: String(window.PASTELE_CONFIG?.SUPABASE_URL || ""),
    configKeyPresent: !!String(window.PASTELE_CONFIG?.SUPABASE_ANON_KEY || "").trim()
  };
  const url = String(cfg.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(
    cfg.SUPABASE_ANON_KEY ||
    window.__SUPABASE_ANON_KEY__ ||
    ""
  ).trim();

  const validUrl = /^https:\/\/[^\s/]+(?:\.[^\s/]+)+$/i.test(url);
  const validKey =
    key.length > 20 &&
    !/YOUR_|service_role|secret/i.test(key);

  if (!validUrl) {
    console.error("[PasTele] Invalid SUPABASE_URL.");
  }
  if (!validKey) {
    console.error(
      "[PasTele] Supabase anon/publishable key is missing or invalid. " +
      "Put the public anon/publishable key in js/config.js."
    );
  }

  window.TC_CONFIG = Object.freeze({
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: key
  });

  window.sb = null;
  window.__PASTELE_RUNTIME__.validUrl = validUrl;
  window.__PASTELE_RUNTIME__.validKey = validKey;

  if (window.supabase && validUrl && validKey) {
    try {
      window.sb = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "pastele-auth",
          flowType: "pkce"
        }
      });
    } catch (e) {
      window.__PASTELE_RUNTIME__.clientError = String(e?.message || e);
      console.error("[PasTele] Failed to create Supabase client:", e);
    }
  }

  window.__PASTELE_RUNTIME__.clientReady = !!window.sb;

  window.TC = {
    configured: () => !!window.sb,

    money: n =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(Number(n || 0)),

    esc: s =>
      String(s ?? "").replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m])),

    toast: (m, type = "info") => {
      let t = document.getElementById("toast");
      if (!t) {
        t = document.createElement("div");
        t.id = "toast";
        document.body.appendChild(t);
      }
      t.className = "toast " + type;
      t.textContent = String(m ?? "");
      Object.assign(t.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: 9999,
        padding: "13px 16px",
        borderRadius: "13px",
        background: "#17212b",
        color: "#fff",
        border: "1px solid rgba(34,158,217,.35)",
        boxShadow: "0 10px 35px rgba(0,0,0,.3)",
        maxWidth: "min(420px,calc(100vw - 36px))"
      });
      clearTimeout(window.__tcToast);
      window.__tcToast = setTimeout(() => t.remove(), 3200);
    },

    user: async () => {
      if (!window.sb) return null;
      const { data, error } = await window.sb.auth.getUser();
      if (error) return null;
      return data?.user || null;
    },

    profile: async () => {
      const u = await window.TC.user();
      if (!u || !window.sb) return null;
      const { data, error } = await window.sb
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();
      if (error) {
        console.error("[PasTele][DB] profiles:", error);
        return null;
      }
      return data || null;
    },

    reportError: (context, error, extra = {}) => {
      const payload = {
        context,
        message: String(error?.message || error || "Unknown error"),
        code: error?.code || null,
        details: error?.details || null,
        hint: error?.hint || null,
        page: location.href,
        ...extra
      };
      console.error("[PasTele][BUG]", payload);
      return payload;
    },

    dbTest: async () => {
      if (!window.sb) throw new Error("Supabase client belum tersedia.");
      const result = { client: true, auth: false, profiles: false, marketplace: false, errors: [] };
      try {
        const a = await window.sb.auth.getSession();
        if (a.error) throw a.error;
        result.auth = true;
      } catch (e) {
        result.errors.push("Auth: " + (e?.message || e));
      }
      try {
        const q = await window.sb.from("profiles").select("id").limit(1);
        if (q.error) throw q.error;
        result.profiles = true;
      } catch (e) {
        result.errors.push("profiles: " + (e?.message || e));
      }
      try {
        const q = await window.sb.from("marketplace_public").select("id").limit(1);
        if (q.error) throw q.error;
        result.marketplace = true;
      } catch (e) {
        result.errors.push("marketplace_public: " + (e?.message || e));
      }
      return result;
    }
  };
})();

/* =========================================================
   PasTele — AUTH CORE
   FINAL PRODUCTION
   SUPABASE AUTH + USERNAME LOGIN + GOOGLE OAUTH
   ========================================================= */
(function () {
  "use strict";
  /*
   * Auth Core sengaja tidak menunggu DOMContentLoaded.
   * login.js / register.js dapat langsung memakai window.Auth
   * setelah file ini selesai dimuat.
   */
  const AUTH_CONFIG = {
    callbackPath: "/auth-callback.html",
    dashboardPath: "/dashboard.html",
    loginPath: "/login.html",
    registerPath: "/register.html",
    resetPasswordPath: "/reset-password.html"
  };
  /* =======================================================
     SUPABASE
  ======================================================= */
  function getSupabase() {
    const client = window.sb || window.sb;
    if (!client) {
      throw new Error(
        "Supabase belum siap. Periksa js/config.js dan js/supabase.js."
      );
    }
    if (!client.auth) {
      throw new Error(
        "Supabase Auth belum tersedia."
      );
    }
    return client;
  }
  function assertSupabase() {
    return getSupabase();
  }
  /* =======================================================
     NORMALIZER
  ======================================================= */
  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }
  function normalizeUsername(username) {
    return String(username || "")
      .trim()
      .toLowerCase();
  }
  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      String(value || "").trim()
    );
  }
  /* =======================================================
     URL HELPERS
  ======================================================= */
  function getCallbackUrl() {
    return new URL(
      AUTH_CONFIG.callbackPath,
      window.location.origin
    ).href;
  }
  function getDashboardUrl() {
    return new URL(
      AUTH_CONFIG.dashboardPath,
      window.location.origin
    ).href;
  }
  function getResetPasswordUrl() {
    return new URL(
      AUTH_CONFIG.resetPasswordPath,
      window.location.origin
    ).href;
  }
  /* =======================================================
     ERROR HANDLER
  ======================================================= */
  function getErrorMessage(error) {
    if (!error) {
      return "Terjadi kesalahan autentikasi.";
    }
    if (typeof error === "string") {
      return error;
    }
    const message = String(
      error.message ||
      error.error_description ||
      error.msg ||
      ""
    ).trim();
    const lower = message.toLowerCase();
    if (
      lower.includes("invalid login credentials") ||
      lower.includes("invalid_credentials")
    ) {
      return "Username/Gmail atau kata sandi salah.";
    }
    if (
      lower.includes("email not confirmed") ||
      lower.includes("email_not_confirmed")
    ) {
      return "Email belum dikonfirmasi. Cek inbox atau folder spam email kamu.";
    }
    if (
      lower.includes("user already registered") ||
      lower.includes("already registered") ||
      lower.includes("user_already_exists") ||
      lower.includes("gmail tersebut sudah terdaftar")
    ) {
      return "Gmail tersebut sudah terdaftar. Silakan login.";
    }
    if (lower.includes("username_already_exists") || lower.includes("username sudah digunakan")) {
      return "Username tersebut sudah terdaftar. Silakan pilih username lain.";
    }
    if (
      lower.includes("database error saving new user") ||
      lower.includes("database error creating new user")
    ) {
      return "Akun gagal dibuat karena profile database belum sinkron dengan Supabase Auth.";
    }
    if (
      lower.includes("captcha") ||
      lower.includes("turnstile")
    ) {
      return "Verifikasi keamanan gagal. Silakan coba lagi.";
    }
    if (
      lower.includes("too many requests") ||
      lower.includes("rate limit")
    ) {
      return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
    }
    if (
      lower.includes("user banned") ||
      lower.includes("banned") ||
      lower.includes("diblokir")
    ) {
      return "Akun kamu telah diblokir.";
    }
    if (
      lower.includes("network") ||
      lower.includes("fetch")
    ) {
      return "Koneksi ke server gagal. Periksa koneksi internet lalu coba lagi.";
    }
    return message || "Terjadi kesalahan autentikasi.";
  }
  /* =======================================================
     RPC RESULT HELPER
  ======================================================= */
  function unwrapRpcRow(data) {
    if (Array.isArray(data)) {
      return data[0] || null;
    }
    return data || null;
  }
  /* =======================================================
     AUTH OBJECT
  ======================================================= */
  const Auth = {
    /* =====================================================
       GOOGLE OAUTH
    ===================================================== */
    async google() {
      const client = assertSupabase();
      const redirectTo = getCallbackUrl();
      console.log(
        "[PasTele Auth] Memulai Google OAuth...",
        redirectTo
      );
      const { data, error } =
        await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            queryParams: {
              access_type: "offline",
              prompt: "select_account"
            }
          }
        });
      if (error) {
        console.error(
          "[PasTele Auth] Google OAuth error:",
          error
        );
        throw new Error(
          getErrorMessage(error)
        );
      }
      return data;
    },
    /* =====================================================
       LOGIN
       ===================================================== */
    async login(identifier, password, captchaToken = "") {
      const client = assertSupabase();
      const value = String(identifier || "").trim();
      const pass = String(password || "");
      if (!value) {
        throw new Error(
          "Username atau Gmail wajib diisi."
        );
      }
      if (!pass) {
        throw new Error(
          "Kata sandi wajib diisi."
        );
      }
      let email = "";
      /*
       * ---------------------------------------------------
       * LOGIN DENGAN EMAIL
       * ---------------------------------------------------
       *
       * Tidak perlu query profiles.
       * Supabase Auth langsung menerima email.
       */
      if (isEmail(value)) {
        email = normalizeEmail(value);
      }
      /*
       * ---------------------------------------------------
       * LOGIN DENGAN USERNAME
       * ---------------------------------------------------
       *
       * Gunakan RPC SECURITY DEFINER:
       *
       * resolve_username_login(p_username text)
       *
       * Frontend tidak membaca auth_email secara langsung.
       */
      else {
        const username =
          normalizeUsername(value);
        try {
          const { data, error } =
            await window.PasTeleDB.rpc("resolve_username_login",
              {
                p_username: username
              }
            );
          if (error) {
            console.error(
              "[PasTele Auth] resolve_username_login:",
              error
            );
            throw new Error(
              "Username belum dapat diverifikasi. Silakan coba lagi."
            );
          }
          const row =
            unwrapRpcRow(data);
          if (!row) {
            throw new Error(
              "Username/Gmail tidak ditemukan. Periksa kembali data login kamu."
            );
          }
          if (row.is_banned === true) {
            throw new Error(
              "Akun kamu telah diblokir."
            );
          }
          email = normalizeEmail(
            row.auth_email ||
            row.email ||
            ""
          );
        } catch (error) {
          if (
            /diblokir/i.test(
              String(error?.message || "")
            )
          ) {
            throw error;
          }
          if (
            String(error?.message || "").includes(
              "Username/Gmail tidak ditemukan"
            )
          ) {
            throw error;
          }
          console.error(
            "[PasTele Auth] Username login gagal:",
            error
          );
          throw new Error(
            getErrorMessage(error)
          );
        }
      }
      if (!email) {
        throw new Error(
          "Username/Gmail tidak ditemukan. Periksa kembali data login kamu."
        );
      }
      /*
       * Login ke Supabase Auth.
       */
      const { data, error } =
        await client.auth.signInWithPassword({
          email,
          password: pass
        });
      if (error) {
        throw new Error(
          getErrorMessage(error)
        );
      }
      if (!data?.user) {
        throw new Error(
          "Login gagal. User tidak ditemukan."
        );
      }
      /*
       * Cek status akun setelah login.
       */
      await this.ensureUserAllowed(
        data.user
      );
      return data;
    },
    /* =====================================================
       REGISTER
       ===================================================== */
    async register(
      username,
      email,
      password,
      turnstileToken = ""
    ) {
      const client = assertSupabase();
      const cleanUsername =
        normalizeUsername(username);
      const cleanEmail =
        normalizeEmail(email);
      const cleanPassword =
        String(password || "");
      const token =
        String(turnstileToken || "").trim();
      /* ---------------------------------------------------
         VALIDASI USERNAME
      --------------------------------------------------- */
      if (
        !/^[a-z0-9_]{3,32}$/.test(
          cleanUsername
        )
      ) {
        throw new Error(
          "Username hanya boleh berisi huruf kecil, angka, dan underscore, minimal 3 karakter."
        );
      }
      /* ---------------------------------------------------
         VALIDASI EMAIL
      --------------------------------------------------- */
      if (!isEmail(cleanEmail)) {
        throw new Error(
          "Email tidak valid."
        );
      }
      /* ---------------------------------------------------
         VALIDASI PASSWORD
      --------------------------------------------------- */
      if (cleanPassword.length < 6) {
        throw new Error(
          "Kata sandi minimal 6 karakter."
        );
      }
      /* ---------------------------------------------------
         CEK USERNAME + EMAIL DI DATABASE
      --------------------------------------------------- */
      const available =
        await this.checkUsername(
          cleanUsername
        );
      if (available !== true) {
        throw new Error(
          "Username sudah digunakan. Silakan pilih username lain."
        );
      }

      const emailAvailable =
        await this.checkEmail(
          cleanEmail
        );
      if (emailAvailable !== true) {
        throw new Error(
          "Gmail tersebut sudah terdaftar. Silakan login atau gunakan Gmail lain."
        );
      }
      /* ---------------------------------------------------
         SIGN UP SUPABASE
      --------------------------------------------------- */
      const options = {
        emailRedirectTo:
          getCallbackUrl(),
        data: {
          username: cleanUsername,
          display_name: cleanUsername
        }
      };
      /*
       * Turnstile hanya dikirim jika token tersedia.
       */
      if (token) {
        options.captchaToken = token;
      }
      const { data, error } =
        await client.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options
        });
      if (error) {
        console.error(
          "[PasTele Auth] Register error:",
          error
        );
        throw new Error(
          getErrorMessage(error)
        );
      }
      /*
       * Supabase dapat mengembalikan:
       *
       * session != null
       *   → email confirmation tidak diperlukan
       *
       * session == null
       *   → email confirmation aktif
       */
      return data;
    },
    /* =====================================================
       CHECK EMAIL
       ===================================================== */
    async checkEmail(email) {
      const client = assertSupabase();
      const value = normalizeEmail(email);
      if (!isEmail(value)) {
        throw new Error("Email tidak valid.");
      }
      const { data, error } =
        await window.PasTeleDB.rpc("check_email_available", {
          p_email: value
        });
      if (error) {
        console.error(
          "[PasTele Auth] check_email_available:",
          error
        );
        throw new Error(
          "Database email belum dapat diperiksa. Pastikan SQL final sudah dijalankan di Supabase."
        );
      }
      if (typeof data === "boolean") return data;
      const row = unwrapRpcRow(data);
      if (typeof row === "boolean") return row;
      if (typeof row?.available === "boolean") return row.available;
      throw new Error("Respons pengecekan email dari database tidak valid.");
    },
    /* =====================================================
       LOOKUP USER
       ===================================================== */
    async lookup(identifier) {
      const client = assertSupabase();
      const value =
        String(identifier || "")
          .trim()
          .toLowerCase();
      if (!value) {
        return null;
      }
      /*
       * Email tidak perlu lookup profiles.
       * Kembalikan identitas email langsung.
       */
      if (isEmail(value)) {
        return {
          auth_email: value,
          email: value
        };
      }
      /*
       * Username → RPC SECURITY DEFINER.
       */
      try {
        const { data, error } =
          await window.PasTeleDB.rpc("resolve_username_login",
            {
              p_username: value
            }
          );
        if (error) {
          console.warn(
            "[PasTele Auth] Username lookup RPC gagal:",
            error
          );
          return null;
        }
        const row =
          unwrapRpcRow(data);
        if (!row) {
          return null;
        }
        return row;
      } catch (error) {
        console.warn(
          "[PasTele Auth] Username lookup error:",
          error
        );
        return null;
      }
    },
    /* =====================================================
       CHECK USERNAME
       ===================================================== */
    async checkUsername(username) {
      const client = assertSupabase();
      const value =
        normalizeUsername(username);
      if (!value) {
        throw new Error(
          "Username wajib diisi."
        );
      }
      if (
        !/^[a-z0-9_]{3,32}$/.test(value)
      ) {
        throw new Error(
          "Format username tidak valid."
        );
      }
      /*
       * Gunakan RPC final database.
       *
       * Jangan fallback SELECT profiles dari browser.
       * Ini mencegah masalah RLS/column privilege.
       */
      const { data, error } =
        await window.PasTeleDB.rpc("check_username_available",
          {
            p_username: value
          }
        );
      if (error) {
        console.error(
          "[PasTele Auth] check_username_available:",
          error
        );
        throw new Error(
          "Database username belum dapat diperiksa. Pastikan SQL final sudah dijalankan di Supabase."
        );
      }
      /*
       * Bentuk return dapat berupa boolean
       * atau row { available: boolean }.
       */
      if (typeof data === "boolean") {
        return data;
      }
      const row =
        unwrapRpcRow(data);
      if (
        typeof row === "boolean"
      ) {
        return row;
      }
      if (
        typeof row?.available === "boolean"
      ) {
        return row.available;
      }
      /*
       * Jika RPC tidak mengembalikan format
       * yang dikenali, jangan menganggap username
       * tersedia.
       */
      throw new Error(
        "Respons pengecekan username dari database tidak valid."
      );
    },
    /* =====================================================
       CURRENT USER
       ===================================================== */
    async getUser() {
      const client = assertSupabase();
      const { data, error } =
        await client.auth.getUser();
      if (error) {
        throw error;
      }
      return data?.user || null;
    },
    /* =====================================================
       SESSION
       ===================================================== */
    async getSession() {
      const client = assertSupabase();
      const { data, error } =
        await client.auth.getSession();
      if (error) {
        throw error;
      }
      return data?.session || null;
    },
    /* =====================================================
       LOGOUT
       ===================================================== */
    async logout() {
      const client = assertSupabase();
      const { error } =
        await client.auth.signOut();
      if (error) {
        throw new Error(
          getErrorMessage(error)
        );
      }
      return true;
    },
    /* =====================================================
       RESET PASSWORD
       ===================================================== */
    async resetPassword(email) {
      const client = assertSupabase();
      const cleanEmail =
        normalizeEmail(email);
      if (!isEmail(cleanEmail)) {
        throw new Error(
          "Masukkan alamat email yang valid."
        );
      }
      const redirectTo =
        getResetPasswordUrl();
      const { data, error } =
        await client.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo
          }
        );
      if (error) {
        throw new Error(
          getErrorMessage(error)
        );
      }
      return data;
    },
    /* =====================================================
       UPDATE PASSWORD
       ===================================================== */
    async updatePassword(password) {
      const client = assertSupabase();
      const cleanPassword =
        String(password || "");
      if (cleanPassword.length < 6) {
        throw new Error(
          "Kata sandi minimal 6 karakter."
        );
      }
      const { data, error } =
        await client.auth.updateUser({
          password: cleanPassword
        });
      if (error) {
        throw new Error(
          getErrorMessage(error)
        );
      }
      return data;
    },
    /* =====================================================
       ENSURE USER ALLOWED
       ===================================================== */
    async ensureUserAllowed(user) {
      if (!user?.id) {
        return true;
      }
      const client = assertSupabase();
      try {
        /*
         * Hanya membaca is_banned.
         * Tidak membaca auth_email atau data privat lain.
         */
        const { data, error } =
          await client
            .from("profiles")
            .select("is_banned")
            .eq("id", user.id)
            .maybeSingle();
        /*
         * Jika profile belum bisa dibaca karena
         * timing/RLS, jangan membatalkan login.
         */
        if (error || !data) {
          console.warn(
            "[PasTele Auth] Profile status belum dapat diperiksa:",
            error || "profile tidak ditemukan"
          );
          return true;
        }
        if (data.is_banned === true) {
          await client.auth.signOut();
          throw new Error(
            "Akun kamu telah diblokir."
          );
        }
        return true;
      } catch (error) {
        const message =
          String(error?.message || "");
        if (
          /diblokir/i.test(message)
        ) {
          throw error;
        }
        console.warn(
          "[PasTele Auth] Status profile tidak dapat diperiksa:",
          error
        );
        /*
         * Jangan membuat login gagal hanya
         * karena pemeriksaan profile bermasalah.
         */
        return true;
      }
    },
    /* =====================================================
       AUTH STATE LISTENER
       ===================================================== */
    onAuthStateChange(callback) {
      const client = assertSupabase();
      if (
        typeof callback !== "function"
      ) {
        throw new Error(
          "Callback auth harus berupa function."
        );
      }
      return client.auth.onAuthStateChange(
        (event, session) => {
          try {
            callback(
              event,
              session
            );
          } catch (error) {
            console.error(
              "[PasTele Auth] Auth state callback error:",
              error
            );
          }
        }
      );
    },
    /* =====================================================
       REDIRECT DASHBOARD
       ===================================================== */
    redirectToDashboard() {
      window.location.replace(
        getDashboardUrl()
      );
    },
    /* =====================================================
       READY
       ===================================================== */
    isReady() {
      return Boolean(
        (window.sb || window.sb) &&
        (window.sb?.auth || window.sb?.auth)
      );
    }
  };
  /* =======================================================
     GLOBAL EXPORT
  ======================================================= */
  window.Auth = Auth;
  /*
   * Backward compatibility.
   */
  window.PasTeleAuth = Auth;
  console.log(
    "[PasTele Auth] Auth Core loaded successfully.",
    {
      supabase: Auth.isReady(),
      google:
        typeof Auth.google === "function",
      login:
        typeof Auth.login === "function",
      register:
        typeof Auth.register === "function",
      lookup:
        typeof Auth.lookup === "function",
      usernameCheck:
        typeof Auth.checkUsername === "function"
    }
  );
})();

/* PasTele — Canonical global theme manager. */
(() => {
  'use strict';
  const root = document.documentElement;
  const KEY = 'pastele-theme';
  const MODES = ['auto', 'light', 'dark', 'system'];

  const resolve = (mode) => {
    if (mode === 'light' || mode === 'dark') return mode;
    if (mode === 'system') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    const hour = new Date().getHours();
    return (hour >= 18 || hour < 6) ? 'dark' : 'light';
  };

  const apply = (mode = localStorage.getItem(KEY) || 'auto') => {
    if (!MODES.includes(mode)) mode = 'auto';
    const theme = resolve(mode);
    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    root.classList.toggle('theme-dark', theme === 'dark');
    root.classList.toggle('theme-light', theme === 'light');
    root.style.colorScheme = theme;
    if (document.body) {
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme === 'light');
    }
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      const active = button.dataset.themeOption === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    window.dispatchEvent(new CustomEvent('pastele-theme-change', { detail: { mode, theme } }));
    return theme;
  };

  const set = (mode) => {
    if (!MODES.includes(mode)) mode = 'auto';
    localStorage.setItem(KEY, mode);
    return apply(mode);
  };

  const cycle = () => {
    const current = localStorage.getItem(KEY) || 'auto';
    const index = Math.max(0, MODES.indexOf(current));
    return set(['auto', 'light', 'dark', 'system'][(index + 1) % 4]);
  };

  window.PasTeleTheme = Object.freeze({
    get: () => localStorage.getItem(KEY) || 'auto',
    resolved: () => resolve(localStorage.getItem(KEY) || 'auto'),
    set,
    cycle,
    apply
  });

  apply();
  window.setInterval(() => {
    if ((localStorage.getItem(KEY) || 'auto') === 'auto') apply('auto');
  }, 60 * 1000);

  window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change', () => {
    if ((localStorage.getItem(KEY) || 'auto') === 'system') apply('system');
  });
})();

/* ============================================================
   PasTele — UNIVERSAL NAVBAR
   CLEAN FINAL VERSION
   ------------------------------------------------------------
   Layout:
   [ Menu ] [ Logo ] ................ [ Username / Avatar ]
   Username:
   - Saldo
   - Notifikasi
   - Tema
   - Kelola Profil
   Menu Drawer:
   - Navigation
   - Social
   - Logout at bottom
   Compatible:
   - Desktop
   - Android
   - iOS
   - Mobile browser
   - Admin / User
   ============================================================ */
(() => {
  'use strict';
  const NAVBAR_ID = 'navbar';
  const initNavbar = async () => {
    const host = document.getElementById(NAVBAR_ID);
    if (!host) return;
    /* Prevent duplicate initialization */
    if (host.dataset.ready === '1') return;
    host.dataset.ready = '1';
    /* ========================================================
       PAGE CONTEXT
       ======================================================== */
    const isAdmin = /\/admin(?:\/|$)/i.test(location.pathname);
    const currentPath = location.pathname.replace(/\/+$/, '');
    const currentFile =
      (currentPath.split('/').pop() || 'dashboard.html').toLowerCase();
    /*
     * Admin pages normally live one directory deeper.
     * User pages stay at root.
     */
    const base = isAdmin ? '../' : '';
    /* ========================================================
       HELPERS
       ======================================================== */
    const esc = (value) => {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char]));
    };
    const normalizePath = (href) => {
      return String(href || '')
        .split('?')[0]
        .split('#')[0]
        .replace(/^\.?\//, '')
        .toLowerCase();
    };
    const samePage = (href) => {
      return normalizePath(href) === currentFile;
    };
    const safeUrl = (value) => {
      const url = String(value || '').trim();
      if (!url) return '';
      if (!/^https?:\/\//i.test(url)) {
        return '';
      }
      return url;
    };
    const money = (value) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(Number(value) || 0);
    };
    /* ========================================================
       AUTH USER
       ======================================================== */
    let user = null;
    let profile = null;
    try {
      if (window.TC?.user) {
        user = await window.TC.user();
      }
    } catch (_) {
      user = null;
    }
    try {
      if (!user && window.sb?.auth) {
        const result = await window.sb.auth.getUser();
        user = result?.data?.user || null;
      }
    } catch (_) {
      user = null;
    }
    /*
     * If no authenticated user, allow another initialization
     * attempt later.
     */
    if (!user) {
      host.dataset.ready = '';
      return;
    }
    /* ========================================================
       PROFILE
       ======================================================== */
    try {
      if (window.sb && user?.id) {
        const result = await window.sb
          .from('profiles')
          .select(`
            username,
            display_name,
            avatar_url,
            is_admin,
            is_premium,
            subscription_until,
            telegram_username,
            youtube_url,
            facebook_url,
            whatsapp_number,
            website,
            balance
          `)
          .eq('id', user.id)
          .maybeSingle();
        if (!result?.error) {
          profile = result?.data || null;
        }
      }
    } catch (_) {
      profile = null;
    }
    /* ========================================================
       USER NAME
       ======================================================== */
    const name =
      profile?.username ||
      profile?.display_name ||
      user?.user_metadata?.username ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Account';
    /* ========================================================
       PREMIUM STATUS
       ======================================================== */
    const premium = Boolean(
      profile?.is_premium &&
      (
        !profile?.subscription_until ||
        new Date(profile.subscription_until) > new Date()
      )
    );
    /* ========================================================
       SOCIAL NORMALIZER
       ======================================================== */
    const normalizeSocial = (value, type = '') => {
      let url = String(value || '').trim();
      if (!url) return '';
      if (
        type === 'telegram' &&
        !/^https?:\/\//i.test(url)
      ) {
        url =
          `https://t.me/${url.replace(/^@/, '')}`;
      }
      if (
        type === 'whatsapp' &&
        !/^https?:\/\//i.test(url)
      ) {
        const number =
          url.replace(/\D/g, '');
        if (!number) return '';
        url =
          `https://wa.me/${number}`;
      }
      return safeUrl(url);
    };
    /* ========================================================
       USER SOCIALS
       ======================================================== */
    const userSocials = [
      {
        url: normalizeSocial(
          profile?.telegram_username,
          'telegram'
        ),
        icon: 'fa-brands fa-telegram',
        label: 'Telegram'
      },
      {
        url: normalizeSocial(
          profile?.youtube_url
        ),
        icon: 'fa-brands fa-youtube',
        label: 'YouTube'
      },
      {
        url: normalizeSocial(
          profile?.facebook_url
        ),
        icon: 'fa-brands fa-facebook',
        label: 'Facebook'
      },
      {
        url: normalizeSocial(
          profile?.whatsapp_number,
          'whatsapp'
        ),
        icon: 'fa-brands fa-whatsapp',
        label: 'WhatsApp'
      }
    ].filter((item) => item.url);
    const userSocialHtml = userSocials.length
      ? userSocials
          .map((item) => `
            <a
              href="${esc(item.url)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="${esc(item.label)}"
            >
              <i class="${esc(item.icon)}"></i>
            </a>
          `)
          .join('')
      : `
          <span class="pt-social-empty">
            Belum ada sosial
          </span>
        `;
    /* ========================================================
       PLATFORM SOCIALS
       ======================================================== */
    let platformSocials = [];
    try {
      if (window.sb?.rpc) {
        const result =
          await window.PasTeleDB.rpc("get_public_site_settings"
          );
        if (
          !result?.error &&
          Array.isArray(result?.data?.socials)
        ) {
          platformSocials =
            result.data.socials;
        }
      }
    } catch (_) {
      platformSocials = [];
    }
    const platformSocialHtml =
      platformSocials
        .map((item) => {
          const url =
            safeUrl(item?.url);
          const icon =
            String(
              item?.icon ||
              'fa-solid fa-link'
            );
          const label =
            String(
              item?.name ||
              'Social'
            );
          if (!url) return '';
          return `
            <a
              href="${esc(url)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="${esc(label)}"
            >
              <i class="${esc(icon)}"></i>
            </a>
          `;
        })
        .filter(Boolean)
        .join('');
    /* ========================================================
       NAVIGATION GROUPS
       ======================================================== */
    const groups = isAdmin
      ? [
          [
            'Admin',
            [
              ['index.html', 'fa-chart-pie', 'Overview'],
              ['users.html', 'fa-users', 'Users'],
              ['products.html', 'fa-box', 'Products'],
              ['content.html', 'fa-layer-group', 'Content'],
              ['orders.html', 'fa-receipt', 'Orders'],
              ['payments.html', 'fa-credit-card', 'Payments'],
              [
                'withdrawals.html',
                'fa-money-bill-transfer',
                'Withdrawals'
              ],
              [
                'notifications.html',
                'fa-bell',
                'Notifications'
              ],
              [
                'transactions.html',
                'fa-arrow-right-arrow-left',
                'Transactions'
              ],
              [
                'pastes.html',
                'fa-file-lines',
                'Pastes'
              ],
              [
                'bots.html',
                'fa-robot',
                'Bots'
              ],
              [
                'logs.html',
                'fa-list',
                'Logs'
              ]
            ]
          ]
        ]
      : [
          [
            'Menu',
            [
              ['dashboard.html', 'fa-house', 'Dashboard'],
              ['marketplace.html', 'fa-store', 'Marketplace']
            ]
          ],
          [
            'Create',
            [
              [
                'create-pastelink.html',
                'fa-link',
                'PasteLink'
              ],
              [
                'create-code.html',
                'fa-code',
                'Code'
              ],
              [
                'create-telegram.html?type=channel',
                'fa-users',
                'Group / Channel'
              ]
            ]
          ],
          [
            'Manage',
            [
              [
                'my-products.html',
                'fa-box-open',
                'My Product'
              ],
              [
                'purchases.html',
                'fa-bag-shopping',
                'Purchases'
              ]
            ]
          ],
          [
            'Finance',
            [
              [
                'wallet.html',
                'fa-wallet',
                'Wallet'
              ],
              [
                'withdrawals.html',
                'fa-money-bill-transfer',
                'Withdraw'
              ],
              [
                'transactions.html',
                'fa-arrow-right-arrow-left',
                'Transaction'
              ]
            ]
          ],
          [
            'Account',
            [
              [
                'subscription.html',
                'fa-crown',
                'Langganan'
              ],
              [
                'premium.html',
                'fa-gem',
                'Premium'
              ],
              [
                'notifications.html',
                'fa-bell',
                'Notifikasi'
              ],
              [
                'profile.html',
                'fa-user',
                'Profile'
              ],
              [
                'settings.html',
                'fa-gear',
                'Setting'
              ],
              [
                'about.html',
                'fa-circle-info',
                'About'
              ]
            ]
          ]
        ];
    /* ========================================================
       NAVIGATION LINKS
       ======================================================== */
    const renderLinks = (items) => {
      return items
        .map(([href, icon, label]) => {
          const active =
            samePage(href);
          return `
            <a
              class="pt-link${active ? ' active' : ''}"
              href="${base}${esc(href)}"
              ${active
                ? 'aria-current="page"'
                : ''}
            >
              <span class="pt-link-icon">
                <i class="fa-solid ${esc(icon)}"></i>
              </span>
              <span class="pt-link-label">
                ${esc(label)}
              </span>
              <i
                class="fa-solid fa-chevron-right pt-link-arrow"
                aria-hidden="true"
              ></i>
            </a>
          `;
        })
        .join('');
    };
    /* ========================================================
       AVATAR
       ======================================================== */
    const renderAvatar = () => {
      if (profile?.avatar_url) {
        const imageUrl =
          safeUrl(profile.avatar_url);
        if (imageUrl) {
          return `
            <img
              src="${esc(imageUrl)}"
              alt=""
              loading="lazy"
            >
          `;
        }
      }
      return `
        <i
          class="fa-solid fa-user"
          aria-hidden="true"
        ></i>
      `;
    };
    /* ========================================================
       INITIAL BALANCE
       ======================================================== */
    let initialBalance =
      Number(profile?.balance) || 0;
    /* ========================================================
       NAVBAR HTML
       ======================================================== */
    host.innerHTML = `
      <header class="pt-nav">
        <div class="pt-nav-inner">
          <!-- MENU -->
          <button
            class="pt-menu-btn"
            id="ptMenu"
            type="button"
            aria-label="Buka menu"
            aria-expanded="false"
            aria-controls="ptDrawer"
          >
            <i
              class="fa-solid fa-bars"
              aria-hidden="true"
            ></i>
          </button>
          <!-- BRAND -->
          <a
            class="pt-brand"
            href="${base}${isAdmin ? 'index.html' : 'dashboard.html'}"
            aria-label="PasTele"
          >
            <span class="pt-brand-mark">
              <i
                class="fa-brands fa-telegram"
                aria-hidden="true"
              ></i>
            </span>
            <span class="pt-brand-name">
              PasTele
            </span>
          </a>
          <span class="pt-spacer"></span>
          <!-- USER -->
          <div class="pt-user-wrap">
            <button
              class="pt-user-btn"
              id="ptUser"
              type="button"
              aria-expanded="false"
              aria-haspopup="true"
              aria-controls="ptDrop"
            >
              <span class="pt-avatar">
                ${renderAvatar()}
              </span>
              <span class="pt-name">
                ${esc(name)}
              </span>
              ${
                premium
                  ? `
                    <i
                      class="fa-solid fa-circle-check pt-check"
                      aria-label="Premium"
                    ></i>
                  `
                  : ''
              }
              <i
                class="fa-solid fa-chevron-down pt-chevron"
                aria-hidden="true"
              ></i>
            </button>
            <!-- USER DROPDOWN -->
            <div
              class="pt-dropdown"
              id="ptDrop"
              hidden
            >
              <div class="pt-profile">
                <span class="pt-avatar pt-avatar-lg">
                  ${renderAvatar()}
                </span>
                <div class="pt-profile-text">
                  <strong>
                    ${esc(name)}
                  </strong>
                  <small>
                    ${
                      isAdmin
                        ? 'Administrator'
                        : premium
                          ? 'Premium aktif'
                          : 'Akun aktif'
                    }
                  </small>
                </div>
              </div>
              <!-- ACCOUNT CARDS -->
              <div class="pt-account-grid">
                <div
                  class="pt-account-item pt-balance-item"
                >
                  <i
                    class="fa-solid fa-wallet"
                    aria-hidden="true"
                  ></i>
                  <span>
                    Saldo
                  </span>
                  <strong id="ptBalance">
                    ${esc(money(initialBalance))}
                  </strong>
                </div>
                <a
                  class="pt-account-item"
                  href="${base}notifications.html"
                >
                  <i
                    class="fa-solid fa-bell"
                    aria-hidden="true"
                  ></i>
                  <span>
                    Notifikasi
                  </span>
                  <strong id="ptNotif">
                    0
                  </strong>
                </a>
                <button
                  class="pt-account-item"
                  id="ptTheme"
                  type="button"
                >
                  <i
                    class="fa-solid fa-circle-half-stroke"
                    aria-hidden="true"
                  ></i>
                  <span>
                    Tema
                  </span>
                  <strong id="ptThemeText">
                    Auto
                  </strong>
                </button>
              </div>
              <!-- USER SOCIAL -->
              <div
                class="pt-socials"
                aria-label="Social media user"
              >
                ${userSocialHtml}
              </div>
              <!-- PROFILE -->
              <a
                class="pt-profile-link"
                href="${base}${isAdmin ? 'index.html' : 'profile.html'}"
              >
                <i
                  class="fa-solid fa-user-gear"
                  aria-hidden="true"
                ></i>
                <span>
                  Kelola profil
                </span>
                <i
                  class="fa-solid fa-arrow-right"
                  aria-hidden="true"
                ></i>
              </a>
            </div>
          </div>
        </div>
      </header>
      <!-- BACKDROP -->
      <div
        class="pt-backdrop"
        id="ptBackdrop"
        aria-hidden="true"
      ></div>
      <!-- DRAWER -->
      <aside
        class="pt-drawer"
        id="ptDrawer"
        aria-hidden="true"
      >
        <div class="pt-drawer-head">
          <div class="pt-drawer-title">
            <span>
              ${isAdmin ? 'ADMIN PANEL' : 'WORKSPACE'}
            </span>
            <strong>
              ${isAdmin
                ? 'Administration'
                : 'PasTele Menu'}
            </strong>
          </div>
          <button
            class="pt-close-btn"
            id="ptClose"
            type="button"
            aria-label="Tutup menu"
          >
            <i
              class="fa-solid fa-xmark"
              aria-hidden="true"
            ></i>
          </button>
        </div>
        <nav
          class="pt-menu-scroll"
          aria-label="Menu utama"
        >
          ${groups
            .map(([title, items]) => `
              <section class="pt-group">
                <h3>
                  ${esc(title)}
                </h3>
                ${renderLinks(items)}
              </section>
            `)
            .join('')}
        </nav>
        <button class="pt-link pt-forum-trigger" id="ptForumTrigger" type="button">
          <span class="pt-link-icon"><i class="fa-solid fa-comments"></i></span>
          <span class="pt-link-label">Forum Group Chat</span>
          <i class="fa-solid fa-chevron-right pt-link-arrow" aria-hidden="true"></i>
        </button>
        <!-- DRAWER BOTTOM -->
        <div class="pt-drawer-bottom">
          ${
            platformSocialHtml
              ? `
                <div
                  class="pt-drawer-socials"
                  aria-label="Social media"
                >
                  ${platformSocialHtml}
                </div>
              `
              : ''
          }
          <button
            class="pt-link logout"
            id="ptLogout"
            type="button"
          >
            <span class="pt-link-icon">
              <i
                class="fa-solid fa-right-from-bracket"
                aria-hidden="true"
              ></i>
            </span>
            <span class="pt-link-label">
              Log out
            </span>
            <i
              class="fa-solid fa-arrow-right pt-link-arrow"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </aside>
    `;
    /* ========================================================
       ELEMENT REFERENCES
       ======================================================== */
    const menu =
      document.getElementById('ptMenu');
    const drawer =
      document.getElementById('ptDrawer');
    const backdrop =
      document.getElementById('ptBackdrop');
    const closeButton =
      document.getElementById('ptClose');
    const userButton =
      document.getElementById('ptUser');
    const dropdown =
      document.getElementById('ptDrop');
    const themeButton =
      document.getElementById('ptTheme');
    const logoutButton =
      document.getElementById('ptLogout');
    const balanceElement =
      document.getElementById('ptBalance');
    const notificationElement =
      document.getElementById('ptNotif');
    const themeText =
      document.getElementById('ptThemeText');
    /* ========================================================
       DRAWER STATE
       ======================================================== */
    const closeDrawer = () => {
      if (!drawer || !backdrop || !menu) return;
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      drawer.setAttribute(
        'aria-hidden',
        'true'
      );
      backdrop.setAttribute(
        'aria-hidden',
        'true'
      );
      menu.setAttribute(
        'aria-expanded',
        'false'
      );
      document.body.classList.remove(
        'pt-nav-lock'
      );
    };
    const openDrawer = () => {
      if (!drawer || !backdrop || !menu) return;
      /* Close user dropdown first */
      if (dropdown) {
        dropdown.hidden = true;
      }
      if (userButton) {
        userButton.setAttribute(
          'aria-expanded',
          'false'
        );
      }
      drawer.classList.add('open');
      backdrop.classList.add('open');
      drawer.setAttribute(
        'aria-hidden',
        'false'
      );
      backdrop.setAttribute(
        'aria-hidden',
        'false'
      );
      menu.setAttribute(
        'aria-expanded',
        'true'
      );
      document.body.classList.add(
        'pt-nav-lock'
      );
    };
    /* ========================================================
       DROPDOWN STATE
       ======================================================== */
    const closeDropdown = () => {
      if (!dropdown || !userButton) return;
      dropdown.hidden = true;
      userButton.setAttribute(
        'aria-expanded',
        'false'
      );
    };
    const openDropdown = () => {
      if (!dropdown || !userButton) return;
      closeDrawer();
      dropdown.hidden = false;
      userButton.setAttribute(
        'aria-expanded',
        'true'
      );
    };
    /* ========================================================
       EVENT: MENU
       ======================================================== */
    menu?.addEventListener(
      'click',
      openDrawer
    );
    /* ========================================================
       EVENT: CLOSE
       ======================================================== */
    closeButton?.addEventListener(
      'click',
      closeDrawer
    );
    backdrop?.addEventListener(
      'click',
      closeDrawer
    );
    /* ========================================================
       EVENT: DRAWER LINKS
       ======================================================== */
    drawer
      ?.querySelectorAll('a')
      .forEach((link) => {
        link.addEventListener(
          'click',
          closeDrawer
        );
      });
    /* ========================================================
       EVENT: USER BUTTON
       ======================================================== */
    userButton?.addEventListener(
      'click',
      (event) => {
        event.stopPropagation();
        if (!dropdown) return;
        if (dropdown.hidden) {
          openDropdown();
        } else {
          closeDropdown();
        }
      }
    );
    /* ========================================================
       EVENT: ACCOUNT ITEMS
       ======================================================== */
    dropdown?.querySelectorAll(
      '.pt-account-item'
    ).forEach((item) => {
      item.addEventListener(
        'click',
        (event) => {
          event.stopPropagation();
        }
      );
    });
    /* ========================================================
       EVENT: PROFILE LINK
       ======================================================== */
    dropdown
      ?.querySelector('.pt-profile-link')
      ?.addEventListener(
        'click',
        closeDropdown
      );
    /* ========================================================
       EVENT: OUTSIDE CLICK
       ======================================================== */
    document.addEventListener(
      'click',
      (event) => {
        const target =
          event.target;
        if (
          !target?.closest(
            '#navbar .pt-user-wrap'
          )
        ) {
          closeDropdown();
        }
      }
    );
    /* ========================================================
       EVENT: ESCAPE
       ======================================================== */
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape') return;
        closeDrawer();
        closeDropdown();
      }
    );
    /* ========================================================
       EVENT: RESIZE
       ======================================================== */
    window.addEventListener(
      'resize',
      () => {
        /*
         * Keep UI stable when rotating
         * or switching browser viewport.
         */
        if (window.innerWidth > 900) {
          document.body.classList.remove(
            'pt-nav-lock'
          );
        }
      },
      { passive: true }
    );
    /* ========================================================
       LOAD WALLET
       ======================================================== */
    try {
      if (
        user?.id &&
        window.sb &&
        balanceElement
      ) {
        const result =
          await window.sb
            .from('wallets')
            .select(
              'balance,available_balance'
            )
            .eq(
              'user_id',
              user.id
            )
            .maybeSingle();
        if (!result?.error) {
          const balance =
            result?.data?.available_balance ??
            result?.data?.balance ??
            initialBalance;
          balanceElement.textContent =
            money(balance);
        }
      }
    } catch (_) {
      /*
       * Keep profile balance
       * if wallet query fails.
       */
    }
    /* ========================================================
       LOAD NOTIFICATION COUNT
       ======================================================== */
    try {
      if (
        user?.id &&
        window.sb &&
        notificationElement
      ) {
        const result =
          await window.sb
            .from('notifications')
            .select(
              'id',
              {
                count: 'exact',
                head: true
              }
            )
            .eq(
              'user_id',
              user.id
            )
            .eq(
              'is_read',
              false
            );
        if (!result?.error) {
          notificationElement.textContent =
            String(
              Number(result?.count) || 0
            );
        }
      }
    } catch (_) {
      /*
       * Keep 0 if notification
       * query is unavailable.
       */
    }
    /* ========================================================
       THEME LABEL
       ======================================================== */
    const getThemeMode = () => {
      const stored =
        localStorage.getItem(
          'pastele-theme'
        );
      if (
        stored === 'light' ||
        stored === 'dark' ||
        stored === 'auto'
      ) {
        return stored;
      }
      return 'auto';
    };
    const updateThemeLabel = () => {
      if (!themeText) return;
      const mode =
        getThemeMode();
      const labels = {
        auto: 'Auto',
        light: 'Terang',
        dark: 'Gelap'
      };
      themeText.textContent =
        labels[mode] || 'Auto';
    };
    updateThemeLabel();
    /* ========================================================
       THEME BUTTON
       ======================================================== */
    themeButton?.addEventListener(
      'click',
      async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          if (
            window.PasTeleTheme?.cycle
          ) {
            await window.PasTeleTheme.cycle();
            /*
             * Allow theme.js to update
             * localStorage before reading it.
             */
            setTimeout(
              updateThemeLabel,
              0
            );
          } else {
            const modes = [
              'auto',
              'light',
              'dark'
            ];
            const current =
              getThemeMode();
            const index =
              modes.indexOf(current);
            const next =
              modes[
                (index + 1) %
                modes.length
              ];
            localStorage.setItem(
              'pastele-theme',
              next
            );
            /*
             * Apply class/data attribute
             * immediately where possible.
             */
            if (next === 'dark') {
              document.documentElement
                .setAttribute(
                  'data-theme',
                  'dark'
                );
            } else if (next === 'light') {
              document.documentElement
                .setAttribute(
                  'data-theme',
                  'light'
                );
            } else {
              document.documentElement
                .removeAttribute(
                  'data-theme'
                );
            }
            updateThemeLabel();
          }
        } catch (_) {
          updateThemeLabel();
        }
      }
    );
    /* ========================================================
       LOGOUT
       ======================================================== */
    logoutButton?.addEventListener(
      'click',
      async (event) => {
        event.preventDefault();
        const button =
          event.currentTarget;
        if (
          button.disabled
        ) {
          return;
        }
        const label =
          button.querySelector(
            '.pt-link-label'
          );
        const originalText =
          label?.textContent ||
          'Log out';
        button.disabled = true;
        if (label) {
          label.textContent =
            'Keluar...';
        }
        closeDrawer();
        closeDropdown();
        try {
          if (
            window.TC?.logout
          ) {
            await window.TC.logout();
          } else if (
            window.Auth?.logout
          ) {
            await window.Auth.logout();
          } else if (
            window.sb?.auth
          ) {
            await window.sb.auth.signOut();
          }
          /*
           * Always send user to login
           * after successful logout.
           */
          location.href =
            `${base}login.html`;
        } catch (_) {
          button.disabled = false;
          if (label) {
            label.textContent =
              originalText;
          }
        }
      }
    );
    /* ========================================================
       FINISH
       ======================================================== */
    updateThemeLabel();
  };
  /* ============================================================
     BOOT
     ============================================================ */
  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initNavbar,
      { once: true }
    );
  } else {
    initNavbar();
  }
})();

/* =========================================================
   PasTele — Universal Footer
   PREMIUM / CLEAN / RESPONSIVE
   Terms / Privacy / About / Support
   Automatic Year
   Loaded once on every page
   ========================================================= */

(() => {
  'use strict';

  /* =======================================================
     PREVENT DUPLICATE FOOTER
     ======================================================= */

  if (window.__PASTELE_FOOTER__) {
    return;
  }

  window.__PASTELE_FOOTER__ = true;

  /* =======================================================
     HELPERS
     ======================================================= */

  const getBasePath = () => {
    const path = window.location.pathname || '';

    return path.includes('/admin/')
      ? '../'
      : '';
  };

  const base = getBasePath();

  const currentYear =
    new Date().getFullYear();

  const safePath = (file) =>
    `${base}${file}`;

  /* =======================================================
     FOOTER MOUNT
     ======================================================= */

  const mountFooter = () => {

    /* Jangan membuat footer kedua */
    if (
      document.getElementById(
        'pasteleFooter'
      )
    ) {
      return;
    }

    /* Pastikan body tersedia */
    if (!document.body) {
      return;
    }

    /* =====================================================
       FOOTER
       ===================================================== */

    const footer =
      document.createElement('footer');

    footer.id =
      'pasteleFooter';

    footer.className =
      'pastele-footer';

    footer.setAttribute(
      'role',
      'contentinfo'
    );

    footer.innerHTML = `

      <!-- =================================================
           MAIN FOOTER
           ================================================= -->

      <div class="container footer-container">

        <!-- BRAND -->
        <div class="footer-brand">

          <a
            href="${safePath('index.html')}"
            class="footer-brand-link"
            aria-label="PasTele Beranda"
          >

            <span class="footer-brand-mark">
              <i class="fa-brands fa-telegram"></i>
            </span>

            <span class="footer-brand-name">
              PasTele
            </span>

          </a>


          <p class="footer-description">
            Platform digital untuk publish,
            discover, share, dan monetize
            Link, Code, Channel &amp; Group Telegram.
          </p>


          <div
            class="footer-platform-status"
            aria-label="Status platform"
          >

            <span
              class="footer-status-indicator"
              aria-hidden="true"
            ></span>

            <span>
              Platform ready
            </span>

          </div>

        </div>


        <!-- PLATFORM -->
        <div class="footer-column">

          <h3>
            Platform
          </h3>

          <a
            href="${safePath('index.html')}"
          >
            <i class="fa-solid fa-house"></i>
            <span>Beranda</span>
          </a>

          <a
            href="${safePath('marketplace.html')}"
          >
            <i class="fa-solid fa-store"></i>
            <span>Marketplace</span>
          </a>

        </div>


        <!-- INFORMASI -->
        <div class="footer-column">

          <h3>
            Informasi
          </h3>

          <a
            href="${safePath('about.html')}"
          >
            <i class="fa-solid fa-circle-info"></i>
            <span>Tentang PasTele</span>
          </a>

          <a
            href="${safePath('terms.html')}"
          >
            <i class="fa-solid fa-file-contract"></i>
            <span>Terms of Service</span>
          </a>

          <a
            href="${safePath('privacy.html')}"
          >
            <i class="fa-solid fa-shield-halved"></i>
            <span>Privacy Policy</span>
          </a>

        </div>


        <!-- BANTUAN -->
        <div class="footer-column">

          <h3>
            Bantuan
          </h3>

          <a
            href="${safePath('notifications.html')}"
          >
            <i class="fa-solid fa-bell"></i>
            <span>Notifications</span>
          </a>

          <a
            href="${safePath('settings.html')}"
          >
            <i class="fa-solid fa-gear"></i>
            <span>Settings</span>
          </a>

          <a
            href="mailto:support@pastele.com"
          >
            <i class="fa-solid fa-headset"></i>
            <span>Contact Support</span>
          </a>

        </div>

      </div>


      <!-- =================================================
           FOOTER BOTTOM
           ================================================= -->

      <div class="container footer-bottom">

        <div class="footer-copyright">

          <span>
            © ${currentYear} PasTele
          </span>

          <span
            class="footer-dot"
            aria-hidden="true"
          >
            ·
          </span>

          <span>
            All rights reserved.
          </span>

        </div>


        <div class="footer-meta">

          <span>
            <i class="fa-solid fa-lock"></i>
            Secure
          </span>

          <span>
            <i class="fa-solid fa-mobile-screen-button"></i>
            Responsive
          </span>

          <span>
            <i class="fa-solid fa-database"></i>
            Database driven
          </span>

        </div>

      </div>

    `;

    /* =====================================================
       APPEND
       ===================================================== */

    document.body.appendChild(
      footer
    );
  };

  /* =======================================================
     DOM READY
     ======================================================= */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      mountFooter,
      {
        once: true
      }
    );

  } else {

    mountFooter();

  }

})();

/* ============================================================
   PasTele — GLOBAL SESSION GUARD
   - 24 hours of INACTIVITY => sign out
   - Activity refreshes the inactivity timer
   - Works even when Supabase/client scripts finish loading late
   - Public pages are never blocked
   ============================================================ */
(() => {
  "use strict";

  const INACTIVITY_MS = 24 * 60 * 60 * 1000;
  const ACTIVITY_KEY = "pastele_last_activity";
  const PUBLIC = new Set([
    "index.html", "login.html", "register.html",
    "forgot-password.html", "reset-password.html",
    "auth-callback.html", "marketplace.html", "product.html", "paste-view.html",
    "about.html", "terms.html", "privacy.html"
  ]);

  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isAdminPath = /\/admin(?:\/|$)/i.test(location.pathname);
  const isPublic = !isAdminPath && PUBLIC.has(file);
  let locked = false;
  let initialized = false;
  let timer = null;

  function setActivity() {
    if (locked || isPublic) return;
    try {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch (_) {}
  }

  function getLastActivity() {
    try {
      const value = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
      return Number.isFinite(value) ? value : 0;
    } catch (_) {
      return 0;
    }
  }

  function isExpired() {
    const last = getLastActivity();
    return last > 0 && (Date.now() - last >= INACTIVITY_MS);
  }

  function loginUrl() {
    return location.pathname.includes("/admin/") ? "../login.html" : "login.html";
  }

  function showExpired() {
    if (document.getElementById("pt-session-modal")) return;

    locked = true;

    const style = document.createElement("style");
    style.textContent = `
      #pt-session-modal{
        position:fixed;inset:0;z-index:2147483647;
        display:grid;place-items:center;padding:20px;
        background:rgba(2,6,23,.72);
        backdrop-filter:blur(14px);
      }
      #pt-session-modal .pt-session-box{
        width:min(440px,100%);
        padding:32px 26px;
        border:1px solid rgba(148,163,184,.22);
        border-radius:26px;
        text-align:center;
        background:var(--surface,#fff);
        color:var(--text,#0f172a);
        box-shadow:0 30px 100px rgba(0,0,0,.35);
      }
      #pt-session-modal .pt-session-icon{
        width:66px;height:66px;margin:0 auto 16px;
        display:grid;place-items:center;border-radius:20px;
        background:rgba(99,91,255,.12);
        color:#635bff;font-size:27px;
      }
      #pt-session-modal h2{margin:0 0 9px;font-size:23px}
      #pt-session-modal p{margin:0 auto 22px;max-width:350px;
        color:var(--muted,#64748b);line-height:1.65}
      #pt-session-modal a{
        display:flex;align-items:center;justify-content:center;gap:9px;
        min-height:48px;padding:12px 18px;border-radius:14px;
        background:linear-gradient(135deg,#635bff,#8b5cf6);
        color:#fff!important;text-decoration:none;font-weight:800;
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "pt-session-modal";
    modal.innerHTML = `
      <div class="pt-session-box" role="dialog" aria-modal="true">
        <div class="pt-session-icon"><i class="fa-solid fa-lock"></i></div>
        <h2>Sesi Berakhir</h2>
        <p>Sesi kamu berakhir karena tidak ada aktivitas selama 24 jam. Silakan login kembali untuk melanjutkan.</p>
        <a href="${loginUrl()}"><i class="fa-solid fa-right-to-bracket"></i> Login Kembali</a>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function getClient() {
    if (window.sb?.auth) return window.sb;

    // Some pages load their bundled client after this guard.
    for (let i = 0; i < 80; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (window.sb?.auth) return window.sb;
    }
    return null;
  }

  async function signOutAndLock() {
    if (locked) return;
    try {
      const client = await getClient();
      if (client?.auth) {
        await client.auth.signOut({ scope: "global" });
      }
    } catch (error) {
      console.warn("[PasTele] Session signOut:", error);
    }
    try { localStorage.removeItem(ACTIVITY_KEY); } catch (_) {}
    showExpired();
  }

  function autoTheme() {
    // Automatic day/night theme:
    // 06:00–17:59 = light, 18:00–05:59 = dark.
    try {
      const hour = new Date().getHours();
      const dark = hour >= 18 || hour < 6;
      const root = document.documentElement;
      root.dataset.theme = dark ? "dark" : "light";
      root.dataset.themeMode = "auto";
      root.style.colorScheme = dark ? "dark" : "light";
    } catch (_) {}
  }

  function bindActivity() {
    if (initialized) return;
    initialized = true;

    const events = ["click", "keydown", "touchstart", "pointerdown", "scroll"];
    for (const event of events) {
      document.addEventListener(event, setActivity, {
        passive: true,
        capture: true
      });
    }

    // Also refresh when the user returns to the tab.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        if (isExpired()) signOutAndLock();
        else setActivity();
      }
    });

    window.addEventListener("pageshow", () => {
      if (isExpired()) signOutAndLock();
      else setActivity();
    });
  }

  async function init() {
    autoTheme();

    if (isPublic) return;

    const client = await getClient();
    if (!client?.auth) {
      console.warn("[PasTele] Supabase client not available; session guard could not start.");
      return;
    }

    try {
      const result = await client.auth.getSession();
      const session = result?.data?.session;

      if (!session) {
        showExpired();
        return;
      }

      if (isExpired()) {
        await signOutAndLock();
        return;
      }

      setActivity();
      bindActivity();

      timer = window.setInterval(() => {
        if (isExpired()) signOutAndLock();
      }, 60 * 1000);

      client.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") showExpired();
        if (event === "SIGNED_IN" && !locked) setActivity();
      });
    } catch (error) {
      console.warn("[PasTele] Session guard:", error);
    }
  }

  window.PasTeleSession = Object.freeze({
    touch: setActivity,
    expired: isExpired,
    check: init,
    autoTheme
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

/* PasTele — Live notification toast
 * Shows new user notifications as a clean floating card for 3 seconds.
 * Click opens the notification target URL when one is provided.
 */
(() => {
  'use strict';
  if (window.__PASTELE_NOTIFICATION_TOAST__) return;
  window.__PASTELE_NOTIFICATION_TOAST__ = true;

  const state = { userId: null, channel: null, seen: new Set(), poll: null };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function ensureStyles() {
    if (document.getElementById('pt-live-notification-style')) return;
    const s = document.createElement('style');
    s.id = 'pt-live-notification-style';
    s.textContent = `
      #ptLiveNotifications{position:fixed;top:18px;right:18px;width:min(410px,calc(100vw - 24px));z-index:2147483000;display:grid;gap:10px;pointer-events:none}
      .pt-live-notice{pointer-events:auto;display:grid;grid-template-columns:42px 1fr 24px;gap:11px;align-items:start;padding:13px 14px;border:1px solid color-mix(in srgb,var(--primary,#229ed9) 22%,var(--line,#e5e7eb));border-radius:17px;background:color-mix(in srgb,var(--surface,#fff) 94%,transparent);color:var(--text,#14212b);box-shadow:0 18px 55px rgba(15,23,42,.18);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transform:translateY(-12px) scale(.98);opacity:0;transition:transform .22s ease,opacity .22s ease;cursor:pointer;overflow:hidden}
      html[data-theme="dark"] .pt-live-notice{box-shadow:0 20px 65px rgba(0,0,0,.42);border-color:rgba(148,163,184,.18)}
      .pt-live-notice.is-in{transform:none;opacity:1}.pt-live-notice.is-out{transform:translateY(-10px) scale(.98);opacity:0}
      .pt-live-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,var(--primary,#229ed9),#7c5cff);color:#fff;font-size:16px}
      .pt-live-copy{min-width:0}.pt-live-copy strong{display:block;font-size:13px;line-height:1.3;margin:1px 0 4px}.pt-live-copy span{display:block;font-size:12px;line-height:1.45;color:var(--muted,#718293);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pt-live-time{display:block;margin-top:6px;font-size:10px;color:var(--muted,#718293);font-weight:700}.pt-live-close{border:0;background:transparent;color:var(--muted,#718293);font-size:14px;cursor:pointer;padding:2px}.pt-live-notice:hover{transform:translateY(-2px);box-shadow:0 22px 65px rgba(15,23,42,.22)}
      @media(max-width:600px){#ptLiveNotifications{top:10px;right:10px;width:calc(100vw - 20px)}.pt-live-notice{border-radius:15px}}
      @media(prefers-reduced-motion:reduce){.pt-live-notice{transition:none}}
    `;
    document.head.appendChild(s);
  }

  function root() {
    let el = document.getElementById('ptLiveNotifications');
    if (!el) { el = document.createElement('div'); el.id = 'ptLiveNotifications'; el.setAttribute('aria-live','polite'); document.body.appendChild(el); }
    return el;
  }

  function icon(type) {
    return ({publish:'fa-bullhorn',purchase:'fa-bag-shopping',view:'fa-eye',sale:'fa-circle-check',like:'fa-heart',withdrawal:'fa-wallet'}[type] || 'fa-bell');
  }

  function remove(card) {
    if (!card) return;
    card.classList.remove('is-in'); card.classList.add('is-out');
    setTimeout(() => card.remove(), 230);
  }

  function show(n) {
    if (!n?.id || state.seen.has(n.id)) return;
    state.seen.add(n.id);
    const target = String(n.link_url || '').trim();
    const card = document.createElement('article');
    card.className = 'pt-live-notice';
    card.setAttribute('role', target ? 'link' : 'status');
    card.innerHTML = `<div class="pt-live-icon"><i class="fa-solid ${esc(icon(n.notification_type))}"></i></div><div class="pt-live-copy"><strong>${esc(n.title || 'Notifikasi')}</strong><span>${esc(n.body || '')}</span><small class="pt-live-time">Baru saja${target ? ' · Ketuk untuk membuka' : ''}</small></div><button class="pt-live-close" type="button" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>`;
    const close = card.querySelector('.pt-live-close');
    close.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); remove(card); });
    card.addEventListener('click', async () => {
      if (target) window.location.assign(new URL(target, window.location.origin + "/").href);
      try { await window.sb?.from('notifications').update({is_read:true}).eq('id',n.id).eq('user_id',state.userId); } catch (_) {}
      remove(card);
    });
    root().prepend(card);
    requestAnimationFrame(() => card.classList.add('is-in'));
    setTimeout(() => remove(card), 3000);
  }

  async function init() {
    if (!window.sb) return false;
    let u = null;
    try { u = (await window.sb.auth.getUser()).data?.user || null; } catch (_) { return false; }
    if (!u?.id) return false;
    state.userId = u.id;
    ensureStyles(); root();

    const channelName = `pastele-live-notifications-${u.id}`;
    try {
      state.channel = window.sb.channel(channelName)
        .on('postgres_changes', {event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${u.id}`}, payload => show(payload.new))
        .subscribe();
    } catch (e) { console.warn('[PasTele] Realtime notification unavailable:', e); }

    // Lightweight fallback for browsers/networks where Realtime is delayed.
    let last = new Date().toISOString();
    state.poll = setInterval(async () => {
      try {
        const r = await window.sb.from('notifications').select('id,user_id,title,body,is_read,created_at,notification_type,link_url').eq('user_id',u.id).gt('created_at',last).order('created_at',{ascending:true}).limit(20);
        if (r.error) return;
        for (const n of (r.data || [])) show(n);
        if (r.data?.length) last = r.data[r.data.length - 1].created_at;
      } catch (_) {}
    }, 15000);
    return true;
  }

  function boot() {
    if (!document.body) return;
    const run = () => { let tries=0; const tick=()=>{ if (window.sb) init(); else if (++tries<30) setTimeout(tick,200); }; tick(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  }
  boot();
})();

/* PasTele — Global UI interaction safety layer */
(function () {
  'use strict';

  function isModifiedClick(event) {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  function getDestination(el) {
    return el?.dataset?.href || el?.dataset?.url || el?.getAttribute?.('data-link') || null;
  }

  document.addEventListener('click', function (event) {
    if (isModifiedClick(event)) return;

    const trigger = event.target.closest('[data-href],[data-url],[data-link]');
    if (!trigger || trigger.disabled || trigger.getAttribute('aria-disabled') === 'true') return;

    const destination = getDestination(trigger);
    if (!destination) return;

    if (trigger.matches('a[href]')) return;

    event.preventDefault();
    window.location.href = destination;
  }, false);

  document.addEventListener('keydown', function (event) {
    const el = event.target.closest?.('[data-href],[data-url],[data-link][role="button"]');
    if (!el) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const destination = getDestination(el);
    if (!destination) return;

    event.preventDefault();
    window.location.href = destination;
  }, false);

  // Make explicitly marked cards keyboard accessible without guessing routes.
  document.querySelectorAll('[data-href],[data-url],[data-link]').forEach(function (el) {
    if (!el.hasAttribute('tabindex') && !el.matches('a,button,input,select,textarea')) {
      el.setAttribute('tabindex', '0');
    }
    if (!el.hasAttribute('role') && !el.matches('a,button,input,select,textarea')) {
      el.setAttribute('role', 'button');
    }
  });
})();



/* =========================================================
   PasTele — Wallet
   FINAL PREMIUM
   Real Supabase data
   Existing schema only
   Matched with wallet.html
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";


    /* =====================================================
       DOM HELPERS
       ===================================================== */

    const $ = (id) => {
        return document.getElementById(id);
    };


    const $$ = (selector, root = document) => {
        try {
            return Array.from(
                root.querySelectorAll(selector)
            );
        } catch {
            return [];
        }
    };


    /* =====================================================
       DOM
       ===================================================== */

    const availableEl =
        $("available");

    const availableCardEl =
        $("availableCard");

    const balanceHeroValueEl =
        document.querySelector(
            ".wallet-balance-hero .wallet-balance-value"
        );

    const pendingEl =
        $("pending");

    const incomeEl =
        $("income");

    const todayEl =
        $("today");

    const breakdownEl =
        $("breakdown");

    const recentActivityEl =
        $("recentActivity");

    const refreshBtn =
        $("refreshWallet");

    const copyBalanceBtn =
        $("copyBalance");

    const pendingCard =
        $("pendingCard");

    const withdrawPanel =
        $("withdrawStatusPanel");


    /* =====================================================
       STATE
       ===================================================== */

    let profile = null;

    let wallet = null;

    let walletRows = [];

    let transactionRows = [];

    let allRows = [];

    let isLoading = false;

    let pendingModal = null;


    /* =====================================================
       GLOBALS
       ===================================================== */

    const getTC = () => {
        return window.TC || {};
    };


    const getSB = () => {
        return (
            window.sb ||
            window.sb ||
            null
        );
    };


    /* =====================================================
       MONEY
       ===================================================== */

    const money = (value) => {

        const number =
            Number(value ?? 0);

        const amount =
            Number.isFinite(number)
                ? number
                : 0;

        const TC =
            getTC();

        if (
            typeof TC.money ===
            "function"
        ) {
            try {
                return TC.money(
                    amount
                );
            } catch {}
        }

        return new Intl.NumberFormat(
            "id-ID",
            {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0
            }
        ).format(amount);
    };


    /* =====================================================
       TOAST
       ===================================================== */

    const showToast = (
        message,
        type = "info"
    ) => {

        const TC =
            getTC();

        if (
            typeof TC.toast ===
            "function"
        ) {
            try {

                TC.toast(
                    message,
                    type
                );

                return;

            } catch {}
        }


        const toast =
            $("toast");

        if (!toast) {
            return;
        }


        toast.textContent =
            String(
                message || ""
            );


        toast.classList.add(
            "show"
        );


        clearTimeout(
            toast._walletTimer
        );


        toast._walletTimer =
            setTimeout(
                () => {

                    toast.classList.remove(
                        "show"
                    );

                },
                2800
            );
    };


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    const esc = (value) => {

        const TC =
            getTC();

        if (
            typeof TC.esc ===
            "function"
        ) {
            try {

                return TC.esc(
                    String(
                        value ?? ""
                    )
                );

            } catch {}
        }


        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    };


    /* =====================================================
       AMOUNT
       ===================================================== */

    const amountOf = (
        row
    ) => {

        const value =
            row?.net_amount ??
            row?.amount ??
            row?.value ??
            0;

        const amount =
            Number(value);

        return Number.isFinite(
            amount
        )
            ? amount
            : 0;
    };


    /* =====================================================
       TYPE NORMALIZER
       ===================================================== */

    const normalizeType = (
        value
    ) => {

        const type =
            String(
                value || ""
            )
                .trim()
                .toLowerCase()
                .replace(
                    /[\s-]+/g,
                    "_"
                );


        if (
            type.includes(
                "pastelink"
            ) ||
            type.includes(
                "paste_link"
            ) ||
            type === "link"
        ) {
            return "link";
        }


        if (
            type.includes(
                "code"
            ) ||
            type === "file"
        ) {
            return "code";
        }


        if (
            type.includes(
                "channel"
            ) ||
            type.includes(
                "broadcast"
            )
        ) {
            return "channel";
        }


        if (
            type.includes(
                "group"
            )
        ) {
            return "group";
        }


        return "other";
    };


    /* =====================================================
       TYPE LABEL
       ===================================================== */

    const typeLabel = (
        value
    ) => {

        switch (
            normalizeType(value)
        ) {

            case "link":
                return "PasteLink";

            case "code":
                return "Code";

            case "channel":
                return "Channel";

            case "group":
                return "Group";

            default:
                return "Transaksi";
        }
    };


    /* =====================================================
       TYPE ICON
       ===================================================== */

    const typeIcon = (
        value
    ) => {

        switch (
            normalizeType(value)
        ) {

            case "link":
                return "fa-link";

            case "code":
                return "fa-code";

            case "channel":
                return "fa-broadcast-tower";

            case "group":
                return "fa-users";

            default:
                return "fa-wallet";
        }
    };


    /* =====================================================
       TYPE CLASS
       ===================================================== */

    const typeClass = (
        value
    ) => {

        switch (
            normalizeType(value)
        ) {

            case "link":
                return "wallet-type-link";

            case "code":
                return "wallet-type-code";

            case "channel":
                return "wallet-type-channel";

            case "group":
                return "wallet-type-group";

            default:
                return "wallet-type-other";
        }
    };


    /* =====================================================
       STATUS
       ===================================================== */

    const statusOf = (
        row
    ) => {

        return String(
            row?.status ||
            ""
        )
            .trim()
            .toLowerCase();
    };


    /* =====================================================
       STATUS HELPERS
       ===================================================== */

    const isGoodTransaction = (
        row
    ) => {

        const status =
            statusOf(row);

        return [
            "completed",
            "complete",
            "paid",
            "available",
            "success",
            "successful",
            "succeeded"
        ].includes(
            status
        )
        &&
        amountOf(row) > 0;
    };


    const isPendingTransaction = (
        row
    ) => {

        const status =
            statusOf(row);

        return [
            "pending",
            "waiting",
            "hold",
            "held",
            "processing"
        ].includes(
            status
        )
        &&
        amountOf(row) > 0;
    };


    const isFailedTransaction = (
        row
    ) => {

        return [
            "failed",
            "cancelled",
            "canceled",
            "rejected",
            "declined",
            "expired"
        ].includes(
            statusOf(row)
        );
    };


    /* =====================================================
       DATE
       ===================================================== */

    const formatDate = (
        value
    ) => {

        if (!value) {
            return "-";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "-";
        }


        return date.toLocaleString(
            "id-ID",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    };


    const isToday = (
        value
    ) => {

        if (!value) {
            return false;
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return false;
        }


        const now =
            new Date();


        return (
            date.getFullYear() ===
                now.getFullYear()
            &&
            date.getMonth() ===
                now.getMonth()
            &&
            date.getDate() ===
                now.getDate()
        );
    };


    /* =====================================================
       GET PROFILE
       ===================================================== */

    const getProfile = async () => {

        const TC =
            getTC();


        if (
            typeof TC.profile ===
            "function"
        ) {
            try {

                const result =
                    await TC.profile();


                if (
                    result?.id
                ) {
                    return result;
                }


                if (
                    result?.profile?.id
                ) {
                    return result.profile;
                }

            } catch (error) {

                console.warn(
                    "TC.profile:",
                    error?.message ||
                    error
                );
            }
        }


        const sb =
            getSB();


        if (
            sb?.auth?.getUser
        ) {

            const {
                data,
                error
            } =
                await sb.auth.getUser();


            if (error) {
                throw error;
            }


            if (
                data?.user?.id
            ) {
                return data.user;
            }
        }


        return null;
    };


    /* =====================================================
       LOADING STATE
       ===================================================== */

    const setLoadingState = (
        loading
    ) => {

        isLoading =
            Boolean(loading);


        if (refreshBtn) {

            refreshBtn.disabled =
                isLoading;


            refreshBtn.classList.toggle(
                "is-loading",
                isLoading
            );


            const icon =
                refreshBtn.querySelector(
                    "i"
                );


            if (icon) {

                icon.classList.toggle(
                    "fa-spin",
                    isLoading
                );
            }
        }


        if (pendingCard) {

            pendingCard.disabled =
                isLoading;


            pendingCard.classList.toggle(
                "is-loading",
                isLoading
            );
        }


        if (breakdownEl) {

            breakdownEl.setAttribute(
                "aria-busy",
                isLoading
                    ? "true"
                    : "false"
            );
        }


        if (recentActivityEl) {

            recentActivityEl.setAttribute(
                "aria-busy",
                isLoading
                    ? "true"
                    : "false"
            );
        }
    };


    /* =====================================================
       RENDER LOADING
       ===================================================== */

    const renderLoading = () => {

        if (availableEl) {
            availableEl.textContent =
                "—";
        }


        if (availableCardEl) {
            availableCardEl.textContent =
                "—";
        }


        if (pendingEl) {
            pendingEl.textContent =
                "—";
        }


        if (incomeEl) {
            incomeEl.textContent =
                "—";
        }


        if (todayEl) {
            todayEl.textContent =
                "—";
        }


        if (breakdownEl) {

            breakdownEl.innerHTML = `
                <div class="wallet-loading">

                    <span class="wallet-loading-icon">

                        <i
                            class="fa-solid fa-spinner fa-spin"
                            aria-hidden="true"
                        ></i>

                    </span>

                    <span>
                        Memuat statistik...
                    </span>

                </div>
            `;
        }


        if (recentActivityEl) {

            recentActivityEl.innerHTML = `
                <div class="wallet-loading">

                    <span class="wallet-loading-icon">

                        <i
                            class="fa-solid fa-spinner fa-spin"
                            aria-hidden="true"
                        ></i>

                    </span>

                    <span>
                        Memuat aktivitas...
                    </span>

                </div>
            `;
        }
    };


    /* =====================================================
       ERROR STATE
       ===================================================== */

    const renderError = (
        message
    ) => {

        if (availableEl) {
            availableEl.textContent =
                "—";
        }


        if (availableCardEl) {
            availableCardEl.textContent =
                "—";
        }


        if (pendingEl) {
            pendingEl.textContent =
                "—";
        }


        if (incomeEl) {
            incomeEl.textContent =
                "—";
        }


        if (todayEl) {
            todayEl.textContent =
                "—";
        }


        if (breakdownEl) {

            breakdownEl.innerHTML = `
                <div class="wallet-state">

                    <div class="wallet-state-icon">

                        <i
                            class="fa-solid fa-triangle-exclamation"
                            aria-hidden="true"
                        ></i>

                    </div>


                    <strong>
                        Wallet gagal dimuat
                    </strong>


                    <span>
                        ${esc(
                            message ||
                            "Terjadi kesalahan saat mengambil data keuangan."
                        )}
                    </span>


                    <button
                        class="btn primary"
                        id="walletRetry"
                        type="button"
                    >

                        <i
                            class="fa-solid fa-rotate"
                            aria-hidden="true"
                        ></i>

                        Coba Lagi

                    </button>

                </div>
            `;
        }


        if (recentActivityEl) {

            recentActivityEl.innerHTML = `
                <div class="wallet-activity-empty">

                    <span class="wallet-activity-empty-icon">

                        <i
                            class="fa-solid fa-circle-exclamation"
                            aria-hidden="true"
                        ></i>

                    </span>


                    <div>

                        <strong>
                            Aktivitas tidak tersedia
                        </strong>


                        <span>
                            Muat ulang halaman untuk mencoba lagi.
                        </span>

                    </div>

                </div>
            `;
        }


        $("walletRetry")
            ?.addEventListener(
                "click",
                () => loadWallet()
            );
    };


    /* =====================================================
       FETCH WALLET DATA
       ===================================================== */

    const fetchWalletData =
        async () => {

            const sb =
                getSB();


            if (!sb) {

                throw new Error(
                    "Supabase belum tersedia. Periksa konfigurasi."
                );
            }


            if (!profile?.id) {

                throw new Error(
                    "ID akun tidak ditemukan."
                );
            }


            /*
             * Release matured wallet balances.
             *
             * Non-blocking because this RPC
             * may not be available for every role.
             */
            try {

                const {
                    error
                } =
                    await window.PasTeleDB.rpc("release_matured_wallet"
                    );


                if (error) {

                    console.warn(
                        "release_matured_wallet:",
                        error.message
                    );
                }

            } catch (error) {

                console.warn(
                    "release_matured_wallet:",
                    error?.message ||
                    error
                );
            }


            const [
                walletResponse,
                walletTransactionsResponse,
                transactionsResponse
            ] =
                await Promise.all([

                    sb
                        .from("wallets")
                        .select("*")
                        .eq(
                            "user_id",
                            profile.id
                        )
                        .maybeSingle(),


                    sb
                        .from(
                            "wallet_transactions"
                        )
                        .select("*")
                        .eq(
                            "user_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        )
                        .limit(500),


                    sb
                        .from("transactions")
                        .select("*")
                        .eq(
                            "user_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        )
                        .limit(500)
                ]);


            if (
                walletResponse?.error
            ) {
                throw walletResponse.error;
            }


            if (
                walletTransactionsResponse?.error
            ) {
                throw walletTransactionsResponse.error;
            }


            if (
                transactionsResponse?.error
            ) {
                throw transactionsResponse.error;
            }


            return {

                wallet:
                    walletResponse?.data ||
                    null,


                walletRows:
                    Array.isArray(
                        walletTransactionsResponse?.data
                    )
                        ? walletTransactionsResponse.data
                        : [],


                transactionRows:
                    Array.isArray(
                        transactionsResponse?.data
                    )
                        ? transactionsResponse.data
                        : []
            };
        };


    /* =====================================================
       BALANCE
       ===================================================== */

    const getAvailableBalance = (
        walletData
    ) => {

        return Number(
            walletData?.available_balance ??
            walletData?.balance ??
            profile?.balance ??
            0
        ) || 0;
    };


    const getPendingBalance = (
        walletData
    ) => {

        return Number(
            walletData?.pending_balance ??
            0
        ) || 0;
    };


    const renderBalances = (
        walletData
    ) => {

        const available =
            getAvailableBalance(
                walletData
            );


        const pending =
            getPendingBalance(
                walletData
            );


        if (availableEl) {

            availableEl.textContent =
                money(
                    available
                );
        }


        if (availableCardEl) {

            availableCardEl.textContent =
                money(
                    available
                );
        }


        if (pendingEl) {

            pendingEl.textContent =
                money(
                    pending
                );
        }
    };


    /* =====================================================
       INCOME ROW FILTER
       ===================================================== */

    const isIncomeRow = (
        row
    ) => {

        if (!row) {
            return false;
        }


        const amount =
            amountOf(row);


        if (amount <= 0) {
            return false;
        }


        if (
            isGoodTransaction(row)
        ) {
            return true;
        }


        const type =
            String(
                row?.type ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            /^sell_/i.test(type) &&
            ![
                "failed",
                "cancelled",
                "canceled",
                "rejected",
                "declined",
                "expired"
            ].includes(
                statusOf(row)
            )
        ) {
            return true;
        }


        return false;
    };


    /* =====================================================
       DEDUPLICATE SELL TRANSACTIONS
       ===================================================== */

    const buildIncomeRows = () => {

        const result = [];

        const seen = new Set();


        /*
         * wallet_transactions first.
         */
        for (
            const row of walletRows
        ) {

            if (
                !isIncomeRow(row)
            ) {
                continue;
            }


            const key =
                [
                    row?.id,
                    row?.reference,
                    row?.transaction_id,
                    row?.created_at,
                    amountOf(row),
                    row?.type
                ]
                    .filter(
                        value =>
                            value !==
                                undefined &&
                            value !==
                                null
                    )
                    .join("|");


            if (
                key &&
                seen.has(key)
            ) {
                continue;
            }


            if (key) {
                seen.add(key);
            }


            result.push(row);
        }


        /*
         * transactions sell_*.
         */
        for (
            const row of transactionRows
        ) {

            if (
                !/^sell_/i.test(
                    String(
                        row?.type ||
                        ""
                    )
                )
            ) {
                continue;
            }


            if (
                !isIncomeRow(row)
            ) {
                continue;
            }


            const reference =
                String(
                    row?.reference ||
                    row?.payment_reference ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            const duplicate =
                result.some(
                    existing => {

                        const existingRef =
                            String(
                                existing?.reference ||
                                existing?.payment_reference ||
                                ""
                            )
                                .trim()
                                .toLowerCase();


                        if (
                            reference &&
                            existingRef &&
                            reference ===
                                existingRef
                        ) {
                            return true;
                        }


                        const existingTime =
                            existing?.created_at
                                ? new Date(
                                    existing.created_at
                                ).getTime()
                                : NaN;


                        const rowTime =
                            row?.created_at
                                ? new Date(
                                    row.created_at
                                ).getTime()
                                : NaN;


                        const sameTime =
                            Number.isFinite(
                                existingTime
                            ) &&
                            Number.isFinite(
                                rowTime
                            ) &&
                            Math.abs(
                                existingTime -
                                rowTime
                            ) < 1500;


                        return (
                            sameTime &&
                            amountOf(
                                existing
                            ) ===
                            amountOf(row) &&
                            normalizeType(
                                existing?.type
                            ) ===
                            normalizeType(
                                row?.type
                            )
                        );
                    }
                );


            if (
                duplicate
            ) {
                continue;
            }


            result.push(row);
        }


        return result;
    };


    /* =====================================================
       INCOME STATS
       ===================================================== */

    const renderIncomeStats = (
        rows
    ) => {

        const validRows =
            rows.filter(
                isIncomeRow
            );


        const totalIncome =
            validRows.reduce(
                (
                    total,
                    row
                ) => {

                    return (
                        total +
                        amountOf(row)
                    );

                },
                0
            );


        const todayIncome =
            validRows
                .filter(
                    row =>
                        isToday(
                            row?.created_at
                        )
                )
                .reduce(
                    (
                        total,
                        row
                    ) => {

                        return (
                            total +
                            amountOf(row)
                        );

                    },
                    0
                );


        if (incomeEl) {

            incomeEl.textContent =
                money(
                    totalIncome
                );
        }


        if (todayEl) {

            todayEl.textContent =
                money(
                    todayIncome
                );
        }
    };


    /* =====================================================
       BREAKDOWN
       ===================================================== */

    const renderBreakdown = (
        rows
    ) => {

        if (!breakdownEl) {
            return;
        }


        const types = [

            {
                type: "link",
                icon: "fa-link",
                label: "PasteLink",
                className:
                    "wallet-breakdown-link"
            },

            {
                type: "code",
                icon: "fa-code",
                label: "Code",
                className:
                    "wallet-breakdown-code"
            },

            {
                type: "channel",
                icon:
                    "fa-broadcast-tower",
                label: "Channel",
                className:
                    "wallet-breakdown-channel"
            },

            {
                type: "group",
                icon: "fa-users",
                label: "Group",
                className:
                    "wallet-breakdown-group"
            }
        ];


        const validRows =
            rows.filter(
                isIncomeRow
            );


        breakdownEl.innerHTML =
            types
                .map(
                    item => {

                        const matchingRows =
                            validRows.filter(
                                row =>
                                    normalizeType(
                                        row?.type
                                    ) ===
                                    item.type
                            );


                        const total =
                            matchingRows.reduce(
                                (
                                    sum,
                                    row
                                ) => {

                                    return (
                                        sum +
                                        amountOf(row)
                                    );

                                },
                                0
                            );


                        const count =
                            matchingRows.length;


                        return `
                            <a
                                class="income-item ${item.className}"
                                href="transactions.html?type=${encodeURIComponent(item.type)}"
                                aria-label="${esc(item.label)}"
                            >

                                <span
                                    class="income-item-icon"
                                    aria-hidden="true"
                                >

                                    <i
                                        class="fa-solid ${item.icon}"
                                    ></i>

                                </span>


                                <span
                                    class="income-item-main"
                                >

                                    <b>
                                        ${esc(
                                            item.label
                                        )}
                                    </b>


                                    <small>
                                        ${count.toLocaleString(
                                            "id-ID"
                                        )}
                                        transaksi
                                    </small>

                                </span>


                                <strong>
                                    ${esc(
                                        money(total)
                                    )}
                                </strong>


                                <span
                                    class="income-item-arrow"
                                    aria-hidden="true"
                                >

                                    <i
                                        class="fa-solid fa-arrow-right"
                                    ></i>

                                </span>

                            </a>
                        `;
                    }
                )
                .join("");


        breakdownEl.setAttribute(
            "aria-busy",
            "false"
        );
    };


    /* =====================================================
       RECENT ACTIVITY
       ===================================================== */

    let activityPage = 1;
    const ACTIVITY_PAGE_SIZE = 6;
    const renderRecentActivity = (
        rows
    ) => {

        if (!recentActivityEl) {
            return;
        }


        const sortedRows =
            [...rows]
                .filter(
                    row =>
                        amountOf(row) !==
                        0
                )
                .sort(
                    (
                        a,
                        b
                    ) => {

                        const aTime =
                            new Date(
                                a?.created_at ||
                                0
                            ).getTime();


                        const bTime =
                            new Date(
                                b?.created_at ||
                                0
                            ).getTime();


                        return (
                            bTime -
                            aTime
                        );
                    }
                )
                ;
        const totalPages = Math.max(1, Math.ceil(sortedRows.length / ACTIVITY_PAGE_SIZE));
        activityPage = Math.min(Math.max(1, activityPage), totalPages);
        const pageRows = sortedRows.slice((activityPage - 1) * ACTIVITY_PAGE_SIZE, activityPage * ACTIVITY_PAGE_SIZE);


        if (
            !sortedRows.length
        ) {

            recentActivityEl.innerHTML = `
                <div
                    class="wallet-activity-empty"
                >

                    <span
                        class="wallet-activity-empty-icon"
                    >

                        <i
                            class="fa-solid fa-receipt"
                            aria-hidden="true"
                        ></i>

                    </span>


                    <div>

                        <strong>
                            Belum ada aktivitas
                        </strong>


                        <span>
                            Aktivitas keuangan akan muncul di sini.
                        </span>

                    </div>

                </div>
            `;


            recentActivityEl.setAttribute(
                "aria-busy",
                "false"
            );


            return;
        }


        recentActivityEl.innerHTML =
            pageRows
                .map(
                    renderActivityItem
                )
                .join("");
        let pager = document.getElementById("walletActivityPagination");
        if (!pager) { pager = document.createElement("div"); pager.id="walletActivityPagination"; pager.className="wallet-pagination"; recentActivityEl.parentElement?.appendChild(pager); }
        if (totalPages > 1) {
            pager.innerHTML = Array.from({length:totalPages},(_,i)=>`<button type="button" class="${i+1===activityPage?'active':''}" data-wallet-page="${i+1}">${i+1}</button>`).join("");
            pager.querySelectorAll("[data-wallet-page]").forEach(b=>b.onclick=()=>{activityPage=Number(b.dataset.walletPage);renderRecentActivity(rows)});
        } else pager.innerHTML="";


        recentActivityEl.setAttribute(
            "aria-busy",
            "false"
        );
    };


    /* =====================================================
       ACTIVITY ITEM
       ===================================================== */

    const renderActivityItem = (
        row
    ) => {

        const type =
            normalizeType(
                row?.type
            );


        const good =
            isGoodTransaction(
                row
            );


        const pending =
            isPendingTransaction(
                row
            );


        const failed =
            isFailedTransaction(
                row
            );


        const amount =
            amountOf(row);


        let stateClass =
            "activity-neutral";


        let statusText =
            "Aktivitas";


        let statusIcon =
            "fa-circle-info";


        if (good) {

            stateClass =
                "activity-success";

            statusText =
                "Berhasil";

            statusIcon =
                "fa-circle-check";

        } else if (pending) {

            stateClass =
                "activity-pending";

            statusText =
                "Pending";

            statusIcon =
                "fa-clock";

        } else if (failed) {

            stateClass =
                "activity-failed";

            statusText =
                "Gagal";

            statusIcon =
                "fa-circle-xmark";
        }


        const label =
            type === "other"
                ? String(
                    row?.type ||
                    "Transaksi"
                )
                : typeLabel(type);


        const sign =
            amount > 0
                ? "+"
                : "";


        return `
            <article
                class="wallet-activity-item ${stateClass}"
            >

                <span
                    class="wallet-activity-icon ${typeClass(type)}"
                    aria-hidden="true"
                >

                    <i
                        class="fa-solid ${typeIcon(type)}"
                    ></i>

                </span>


                <div
                    class="wallet-activity-main"
                >

                    <strong>
                        ${esc(label)}
                    </strong>


                    <span>
                        ${esc(
                            formatDate(
                                row?.created_at
                            )
                        )}
                    </span>

                </div>


                <div
                    class="wallet-activity-amount"
                >

                    <strong>
                        ${sign}${esc(
                            money(amount)
                        )}
                    </strong>


                    <small>

                        <i
                            class="fa-solid ${statusIcon}"
                            aria-hidden="true"
                        ></i>

                        ${esc(
                            statusText
                        )}

                    </small>

                </div>

            </article>
        `;
    };


    /* =====================================================
       WITHDRAW STATE
       ===================================================== */

    const updateWithdrawState = (
        walletData
    ) => {

        if (!withdrawPanel) {
            return;
        }


        const available =
            getAvailableBalance(
                walletData
            );


        const buttons =
            $$(
                ".wallet-withdraw-btn",
                withdrawPanel
            );


        buttons.forEach(
            btn => {

                const disabled =
                    available <= 0;


                btn.classList.toggle(
                    "is-disabled",
                    disabled
                );


                if (disabled) {

                    btn.setAttribute(
                        "aria-disabled",
                        "true"
                    );


                    btn.title =
                        "Belum ada saldo yang dapat ditarik.";

                } else {

                    btn.removeAttribute(
                        "aria-disabled"
                    );


                    btn.title =
                        `Tarik ${money(
                            available
                        )}`;
                }
            }
        );
    };


    /* =====================================================
       PENDING DETAIL
       ===================================================== */

    const showPendingDetail =
        async () => {

            const sb =
                getSB();


            if (!sb) {

                showToast(
                    "Supabase belum tersedia.",
                    "error"
                );

                return;
            }


            if (pendingModal) {
                return;
            }


            try {

                if (pendingCard) {

                    pendingCard.classList.add(
                        "is-loading"
                    );


                    pendingCard.disabled =
                        true;
                }


                /*
                 * The canonical database does not expose a
                 * get_pending_balance_detail RPC. Build the detail
                 * directly from the existing wallet_transactions
                 * columns returned by fetchWalletData().
                 */
                const rows = walletRows
                    .filter(row =>
                        String(row?.status || "pending").toLowerCase() === "pending"
                        && row?.available_at
                    )
                    .sort((a, b) =>
                        new Date(a.available_at).getTime() -
                        new Date(b.available_at).getTime()
                    );


                if (!rows.length) {

                    showToast(
                        "Tidak ada saldo yang sedang tertunda.",
                        "info"
                    );

                    return;
                }


                const html =
                    rows
                        .slice(
                            0,
                            20
                        )
                        .map(
                            row => {

                                const amount =
                                    money(
                                        row?.amount ||
                                        0
                                    );


                                const created =
                                    formatDate(
                                        row?.created_at
                                    );


                                const availableAt =
                                    formatDate(
                                        row?.available_at
                                    );


                                const holdLabel =
                                    "H+2";


                                return `
                                    <div
                                        class="wallet-pending-item"
                                    >

                                        <div
                                            class="wallet-pending-item-top"
                                        >

                                            <strong>
                                                ${esc(
                                                    amount
                                                )}
                                            </strong>


                                            <span>
                                                ${esc(
                                                    holdLabel
                                                )}
                                            </span>

                                        </div>


                                        <div
                                            class="wallet-pending-meta"
                                        >

                                            <span>

                                                <i
                                                    class="fa-regular fa-clock"
                                                    aria-hidden="true"
                                                ></i>

                                                Terjual
                                                ${esc(
                                                    created
                                                )}

                                            </span>


                                            <span>

                                                <i
                                                    class="fa-solid fa-unlock"
                                                    aria-hidden="true"
                                                ></i>

                                                Tersedia
                                                ${esc(
                                                    availableAt
                                                )}

                                            </span>

                                        </div>

                                    </div>
                                `;
                            }
                        )
                        .join("");


                const overlay =
                    document.createElement(
                        "div"
                    );


                overlay.className =
                    "wallet-pending-modal";


                overlay.innerHTML = `
                    <div
                        class="wallet-pending-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pendingWalletTitle"
                    >

                        <button
                            type="button"
                            class="wallet-pending-close"
                            aria-label="Tutup"
                        >

                            <i
                                class="fa-solid fa-xmark"
                                aria-hidden="true"
                            ></i>

                        </button>


                        <span class="badge">

                            <i
                                class="fa-solid fa-clock"
                                aria-hidden="true"
                            ></i>

                            SALDO PENDING

                        </span>


                        <h2 id="pendingWalletTitle">
                            Kapan saldo tersedia?
                        </h2>


                        <p class="muted">

                            Saldo penjualan akan tersedia setelah settlement <b>H+2</b> selesai.
                            Waktu tersedia mengikuti <b>available_at</b> dari database.

                        </p>


                        <div class="wallet-pending-list">

                            ${html}

                        </div>

                    </div>
                `;


                document.body.appendChild(
                    overlay
                );


                pendingModal =
                    overlay;


                const previousOverflow =
                    document.body.style.overflow;


                document.body.style.overflow =
                    "hidden";


                const close =
                    () => {

                        if (
                            !pendingModal
                        ) {
                            return;
                        }


                        overlay.classList.add(
                            "is-closing"
                        );


                        document.body.style.overflow =
                            previousOverflow;


                        document.removeEventListener(
                            "keydown",
                            escHandler
                        );


                        setTimeout(
                            () => {

                                overlay.remove();

                                pendingModal =
                                    null;

                            },
                            160
                        );
                    };


                const escHandler =
                    event => {

                        if (
                            event.key ===
                            "Escape"
                        ) {
                            close();
                        }
                    };


                overlay
                    .querySelector(
                        ".wallet-pending-close"
                    )
                    ?.addEventListener(
                        "click",
                        close
                    );


                overlay.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            overlay
                        ) {
                            close();
                        }
                    }
                );


                document.addEventListener(
                    "keydown",
                    escHandler
                );


                requestAnimationFrame(
                    () => {

                        overlay
                            .querySelector(
                                ".wallet-pending-close"
                            )
                            ?.focus();
                    }
                );

            } catch (error) {

                console.error(
                    "Pending balance detail:",
                    error
                );


                showToast(
                    error?.message ||
                    "Detail saldo pending gagal dimuat.",
                    "error"
                );

            } finally {

                if (pendingCard) {

                    pendingCard.classList.remove(
                        "is-loading"
                    );


                    pendingCard.disabled =
                        false;
                }
            }
        };


    /* =====================================================
       COPY BALANCE
       ===================================================== */

    const copyBalance =
        async () => {

            const value =
                balanceHeroValueEl?.textContent ||
                availableEl?.textContent ||
                "Rp0";


            if (
                value === "—"
            ) {

                showToast(
                    "Saldo belum selesai dimuat.",
                    "info"
                );

                return;
            }


            try {

                if (
                    navigator.clipboard &&
                    window.isSecureContext
                ) {

                    await navigator.clipboard.writeText(
                        value
                    );

                } else {

                    const textarea =
                        document.createElement(
                            "textarea"
                        );


                    textarea.value =
                        value;


                    textarea.setAttribute(
                        "readonly",
                        ""
                    );


                    textarea.style.position =
                        "fixed";

                    textarea.style.left =
                        "-9999px";

                    textarea.style.top =
                        "0";


                    document.body.appendChild(
                        textarea
                    );


                    textarea.focus();

                    textarea.select();


                    document.execCommand(
                        "copy"
                    );


                    textarea.remove();
                }


                showToast(
                    "Saldo berhasil disalin.",
                    "success"
                );


                if (
                    copyBalanceBtn
                ) {

                    const icon =
                        copyBalanceBtn.querySelector(
                            "i"
                        );


                    if (icon) {

                        icon.className =
                            "fa-solid fa-check";


                        clearTimeout(
                            copyBalanceBtn._walletCopyTimer
                        );


                        copyBalanceBtn._walletCopyTimer =
                            setTimeout(
                                () => {

                                    icon.className =
                                        "fa-regular fa-copy";

                                },
                                1400
                            );
                    }
                }

            } catch (error) {

                console.warn(
                    "Copy balance:",
                    error
                );


                showToast(
                    "Saldo tidak dapat disalin.",
                    "error"
                );
            }
        };


    /* =====================================================
       WITHDRAW GUARD
       ===================================================== */

    document.addEventListener(
        "click",
        event => {

            const target =
                event.target;


            const withdraw =
                target?.closest?.(
                    "#withdrawBtn, .wallet-withdraw-btn"
                );


            if (!withdraw) {
                return;
            }


            if (
                withdraw.classList.contains(
                    "is-disabled"
                ) ||
                withdraw.getAttribute(
                    "aria-disabled"
                ) === "true"
            ) {

                event.preventDefault();


                showToast(
                    "Belum ada saldo tersedia untuk ditarik.",
                    "info"
                );
            }
        }
    );


    /* =====================================================
       EVENTS
       ===================================================== */

    pendingCard?.addEventListener(
        "click",
        showPendingDetail
    );


    refreshBtn?.addEventListener(
        "click",
        () => {

            if (
                !isLoading
            ) {
                loadWallet();
            }
        }
    );


    copyBalanceBtn?.addEventListener(
        "click",
        copyBalance
    );


    /* =====================================================
       LOAD WALLET
       ===================================================== */

    async function loadWallet() {

        if (
            isLoading
        ) {
            return;
        }


        const sb =
            getSB();


        if (!sb) {

            renderError(
                "Supabase belum tersedia. Periksa config.js dan supabase.js."
            );

            return;
        }


        try {

            setLoadingState(
                true
            );


            renderLoading();


            profile =
                await getProfile();


            if (!profile?.id) {

                location.replace(
                    "login.html"
                );

                return;
            }


            const result =
                await fetchWalletData();


            wallet =
                result.wallet;


            walletRows =
                result.walletRows ||
                [];


            transactionRows =
                result.transactionRows ||
                [];


            /*
             * Activity data.
             *
             * Keep wallet transactions and
             * sell_* transaction records.
             */
            allRows = [
                ...walletRows,
                ...transactionRows.filter(
                    row =>
                        /^sell_/i.test(
                            String(
                                row?.type ||
                                ""
                            )
                        )
                )
            ];


            /*
             * Deduplicated income rows
             * for financial statistics.
             */
            const incomeRows =
                buildIncomeRows();


            renderBalances(
                wallet
            );


            renderIncomeStats(
                incomeRows
            );


            renderBreakdown(
                incomeRows
            );


            renderRecentActivity(
                allRows
            );


            updateWithdrawState(
                wallet
            );

        } catch (error) {

            console.error(
                "Wallet load error:",
                error
            );


            renderError(
                error?.message ||
                "Wallet gagal dimuat."
            );


            showToast(
                error?.message ||
                "Wallet gagal dimuat.",
                "error"
            );

        } finally {

            setLoadingState(
                false
            );
        }
    }


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    await loadWallet();

});




/* Page-ready marker */
document.documentElement.classList.add("pastele-ready");

/* =========================================================
   PasTele — COMMUNITY CHAT
   No extra HTML/JS/CSS files required. The UI is mounted by the
   existing universal navbar JS and talks to the SQL chat schema.
   ========================================================= */
(() => {
  'use strict';
  if (window.__PASTELE_CHAT_BOOTED__) return;
  window.__PASTELE_CHAT_BOOTED__ = true;
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const $ = s => document.querySelector(s);
  const sb = () => window.sb || window.sb || null;
  let group=null, me=null, messages=[], replyId=null, channel=null;
  const getUser = async()=>{
    try{ if(window.TC?.user) return await window.TC.user(); }catch{}
    try{ return (await sb()?.auth?.getUser())?.data?.user || null; }catch{return null}
  };
  const toast = (m,t='info')=>{ try{window.TC?.toast?.(m,t)}catch{} };
  const initials = name => esc(String(name||'User').trim().charAt(0).toUpperCase()||'U');
  const fmt = d => { try{return new Date(d).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});}catch{return ''} };
  function mount(){
    if($('#ptChatModal')) return;
    document.body.insertAdjacentHTML('beforeend',`
      <div class="pt-chat-backdrop" id="ptChatBackdrop"></div>
      <section class="pt-chat-modal" id="ptChatModal" role="dialog" aria-modal="true" aria-labelledby="ptChatTitle">
        <header class="pt-chat-head"><div class="pt-chat-avatar"><i class="fa-solid fa-comments"></i></div><div class="pt-chat-head-main"><strong id="ptChatTitle">PasTele Community</strong><small id="ptChatStatus">Forum & Group Chat</small></div><button class="pt-chat-close" id="ptChatClose" type="button"><i class="fa-solid fa-xmark"></i></button></header>
        <div class="pt-chat-toolbar"><button class="active" type="button"><i class="fa-solid fa-message"></i> Chat</button><button type="button" id="ptChatRefresh"><i class="fa-solid fa-rotate"></i> Refresh</button><button type="button" id="ptChatMark"><i class="fa-solid fa-check-double"></i> Read</button></div>
        <div class="pt-chat-messages" id="ptChatMessages"><div class="pt-chat-empty">Memuat community...</div></div>
        <div class="pt-chat-compose"><div class="pt-chat-reply" id="ptChatReply"><span id="ptChatReplyText"></span><button id="ptChatReplyClose" type="button"><i class="fa-solid fa-xmark"></i></button></div><div id="ptChatLogin" class="pt-chat-login hidden">Login untuk ikut mengirim pesan. <a href="/login.html">Masuk</a></div><div class="pt-chat-compose-row"><textarea class="pt-chat-input" id="ptChatInput" maxlength="4000" rows="1" placeholder="Tulis pesan..."></textarea><button class="pt-chat-send" id="ptChatSend" type="button" aria-label="Kirim"><i class="fa-solid fa-paper-plane"></i></button></div></div>
      </section>`);
    $('#ptChatClose').onclick=close; $('#ptChatBackdrop').onclick=close;
    $('#ptChatReplyClose').onclick=()=>{replyId=null;$('#ptChatReply').classList.remove('is-open')};
    $('#ptChatRefresh').onclick=loadMessages; $('#ptChatMark').onclick=markRead; $('#ptChatSend').onclick=send;
    $('#ptChatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
  }
  async function open(){ mount(); $('#ptChatBackdrop').classList.add('is-open');$('#ptChatModal').classList.add('is-open'); await bootData(); }
  function close(){ $('#ptChatBackdrop')?.classList.remove('is-open');$('#ptChatModal')?.classList.remove('is-open'); }
  async function bootData(){
    const client=sb(); if(!client){$('#ptChatMessages').innerHTML='<div class="pt-chat-empty">Supabase belum siap.</div>';return}
    me=await getUser(); $('#ptChatLogin').classList.toggle('hidden',!!me);
    const q=await client.from('chat_groups').select('id,name,slug,description,is_public').eq('slug','pastele-community').maybeSingle();
    if(q.error||!q.data){$('#ptChatMessages').innerHTML='<div class="pt-chat-empty">Community belum tersedia. Jalankan database.sql terbaru.</div>';return}
    group=q.data; let chatReason=''; try{const sr=await window.PasTeleDB.rpc("get_public_site_settings"); chatReason=String(sr?.data?.forum_chat?.reason||'').trim()}catch{} $('#ptChatTitle').textContent=group.name; $('#ptChatStatus').textContent=group.is_public===false ? ('Ditutup oleh admin'+(chatReason?' · '+chatReason:'')) : (group.description||'Forum & Group Chat'); if(group.is_public===false){$('#ptChatMessages').innerHTML='<div class="pt-chat-empty"><i class="fa-solid fa-lock"></i><br>Forum Group Chat sedang ditutup oleh admin.'+(chatReason?'<br><small>'+esc(chatReason)+'</small>':'')+'</div>'; $('#ptChatSend')?.setAttribute('disabled','disabled'); return;}
    if(me){try{await window.PasTeleDB.rpc("join_public_chat",{p_group_id:group.id});await window.PasTeleDB.rpc("set_chat_presence",{p_group_id:group.id,p_online:true});}catch{}}
    await loadMessages(); subscribe();
  }
  async function loadMessages(){
    if(!group||!sb()) return;
    const q=await sb().from('chat_messages').select('id,group_id,user_id,body,reply_to_id,edited_at,deleted_at,created_at').eq('group_id',group.id).order('created_at',{ascending:true}).limit(200);
    if(q.error){$('#ptChatMessages').innerHTML='<div class="pt-chat-empty">Gagal memuat pesan.</div>';return}
    messages=q.data||[]; const ids=[...new Set(messages.map(x=>x.user_id).filter(Boolean))]; let profiles=[]; if(ids.length){const pr=await sb().from('profile_public').select('id,username,display_name,avatar_url').in('id',ids); profiles=pr.data||[];} const pm=new Map(profiles.map(x=>[String(x.id),x])); messages=messages.map(x=>({...x,profiles:pm.get(String(x.user_id))||null})); render();
  }
  function render(){
    const box=$('#ptChatMessages'); if(!box)return;
    if(!messages.length){box.innerHTML='<div class="pt-chat-empty"><i class="fa-regular fa-comments"></i><br>Belum ada pesan. Jadilah yang pertama menyapa.</div>';return}
    box.innerHTML=messages.map(m=>{
      const mine=String(m.user_id||'')===String(me?.id||''); const name=m.profiles?.display_name||m.profiles?.username||'User';
      const body=m.deleted_at?'Pesan dihapus':m.body; const reply=messages.find(x=>x.id===m.reply_to_id);
      return `<div class="pt-chat-row ${mine?'mine':''}" data-mid="${esc(m.id)}"><div class="pt-chat-user-avatar">${initials(name)}</div><div class="pt-chat-bubble"><div class="pt-chat-author">${esc(name)}${mine?' • Kamu':''}</div>${reply?`<div style="font-size:9px;opacity:.65;margin-bottom:5px">↪ ${esc(reply.body).slice(0,90)}</div>`:''}<div class="pt-chat-body">${esc(body)}</div><div class="pt-chat-time">${fmt(m.created_at)}${m.edited_at?' · diedit':''}</div>${!m.deleted_at?`<div class="pt-chat-actions"><button data-reply="${esc(m.id)}">↩ Balas</button><button data-react="${esc(m.id)}">👍</button>${mine?`<button data-edit="${esc(m.id)}">Edit</button><button data-delete="${esc(m.id)}">Hapus</button>`:''}</div>`:''}</div></div>`;
    }).join('');
    box.querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>{replyId=b.dataset.reply;const m=messages.find(x=>x.id===replyId);$('#ptChatReplyText').textContent='Membalas: '+(m?.body||'').slice(0,90);$('#ptChatReply').classList.add('is-open');$('#ptChatInput').focus()});
    box.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>react(b.dataset.react));
    box.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>del(b.dataset.delete)); box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));
    box.scrollTop=box.scrollHeight;
  }
  async function send(){
    const input=$('#ptChatInput'); const body=String(input?.value||'').trim(); if(!body)return;
    me=me||await getUser(); if(!me){toast('Login untuk ikut chat.','info');location.href='/login.html';return}
    if(!group)return; const btn=$('#ptChatSend');btn.disabled=true;
    try{const q=await sb().rpc('send_chat_message',{p_group_id:group.id,p_body:body,p_reply_to:replyId||null});if(q.error)throw q.error;input.value='';replyId=null;$('#ptChatReply').classList.remove('is-open');await loadMessages();try{await sb().rpc('record_quest_event',{p_event_type:'comment'})}catch{}}catch(e){toast(e.message||'Pesan gagal dikirim.','error')}finally{btn.disabled=false;input.focus()}
  }
  async function react(id){try{const u=me||await getUser();if(!u){toast('Login untuk memberi reaksi.','info');return}const q=await sb().rpc('toggle_chat_reaction',{p_message_id:id,p_reaction:'👍'});if(q.error)throw q.error;toast(q.data?.active?'Reaksi ditambahkan':'Reaksi dihapus','success')}catch(e){toast(e.message||'Reaksi gagal.','error')}}
  async function edit(id){if(!me)return;const m=messages.find(x=>x.id===id);if(!m||String(m.user_id)!==String(me.id))return;const body=prompt('Edit pesan:',m.body);if(body===null)return;const value=String(body).trim();if(!value)return;const q=await sb().from('chat_messages').update({body:value,edited_at:new Date().toISOString()}).eq('id',id).eq('user_id',me.id);if(q.error)toast(q.error.message||'Gagal mengedit.','error');else loadMessages()}
  async function del(id){if(!me)return;const m=messages.find(x=>x.id===id);if(!m||String(m.user_id)!==String(me.id))return;if(!confirm('Hapus pesan ini?'))return;const q=await sb().from('chat_messages').update({deleted_at:new Date().toISOString()}).eq('id',id).eq('user_id',me.id);if(q.error)toast(q.error.message||'Gagal menghapus.','error');else loadMessages()}
  async function markRead(){if(me&&group)try{await sb().rpc('mark_chat_read',{p_group_id:group.id});toast('Chat ditandai sudah dibaca.','success')}catch{}}
  function subscribe(){if(!sb()?.channel||!group)return;if(channel)try{sb().removeChannel(channel)}catch{};channel=sb().channel('pastele-chat-'+group.id).on('postgres_changes',{event:'*',schema:'public',table:'chat_messages',filter:`group_id=eq.${group.id}`},()=>loadMessages()).subscribe()}
  function bind(){
    const attach=()=>{document.querySelectorAll('#ptForumTrigger').forEach(b=>{if(b.dataset.chatBound)return;b.dataset.chatBound='1';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();location.href='forum.html'})})};
    attach();new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
