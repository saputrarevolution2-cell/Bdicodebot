/* PasTele — self-contained product page script. One HTML -> one JS -> one CSS. */
/* PasTele / Bdicodebot — NEW PROJECT CONFIG
 * Put ONLY the Supabase project URL and anon/publishable key here.
 * Never put service_role / secret keys in this browser file.
 */
window.PASTELE_CONFIG = window.PASTELE_CONFIG || Object.freeze({
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
   PasTele — PRODUCT DETAIL
   FINAL SQL SYNC
   Supports:
   - products (Link / generic)
   - telegram_products (Code)
   - telegram_channels (Channel / Group)
   - pastes (Free)
   - pastelinks are served by paste-view.html via /p/*
   - Free / Paid access
   - Premium / purchase access
   - Like + comments according to SQL RLS
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const $ = id => document.getElementById(id);
  const box = $("content");
  const toast = (m,t="error") => window.TC?.toast ? TC.toast(m,t) : console[t === "error" ? "error" : "log"](m);
  const esc = v => window.TC?.esc ? TC.esc(String(v ?? "")) : String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const money = v => window.TC?.money ? TC.money(v) : `Rp ${Number(v||0).toLocaleString("id-ID")}`;
  const client = window.sb || window.sb || null;
  const params = new URLSearchParams(location.search);
  // Public Product: login is optional. Guest token is the anonymous checkout
  // identity expected by the canonical database RPCs.
  const PRODUCT_GUEST_TOKEN = (() => {
    try {
      const fromUrl = String(params.get("guest_token") || "").trim();
      const saved = String(localStorage.getItem("pastele-guest-checkout-token") || "").trim();
      if (fromUrl.length >= 32) {
        localStorage.setItem("pastele-guest-checkout-token", fromUrl);
        return fromUrl;
      }
      if (saved.length >= 32) return saved;
      const generated = (window.crypto && typeof window.crypto.randomUUID === "function")
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("pastele-guest-checkout-token", generated);
      return generated;
    } catch (_) {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
  })();
  const guestCheckoutToken = () => PRODUCT_GUEST_TOKEN;
  const parseShortRoute = (pathname) => {
    const parts = String(pathname || "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const root = parts[0].toLowerCase();
    if (["c","ch","g"].includes(root) && parts.length >= 3 && ["f","p"].includes(parts[1].toLowerCase())) {
      return { type: root === "c" ? "code" : root === "g" ? "group" : "channel", slug: decodeURIComponent(parts.slice(2).join("/")).trim() };
    }
    if (root === "p" && parts.length >= 2) return { type: "pastelink", slug: decodeURIComponent(parts.slice(1).join("/")).trim() };
    if (root === "paste" && parts.length >= 2) return { type: "paste", slug: decodeURIComponent(parts.slice(1).join("/")).trim() };
    return null;
  };
  const pathRoute = parseShortRoute(location.pathname);
  // Backward compatibility: older Cloudflare deployments redirected /c/f/...
  // to /product. Same-origin referrer normally retains the original path, so
  // use it only when the current URL has no explicit route/query metadata.
  let refRoute = null;
  try { refRoute = parseShortRoute(document.referrer ? new URL(document.referrer).pathname : ""); } catch {}
  const route = pathRoute || refRoute;
  const requestedType = String(params.get("type") || route?.type || "link").trim().toLowerCase();
  const requestedId = String(params.get("id") || "").trim();
  const requestedSlug = String(params.get("slug") || route?.slug || "").trim();
  const normalizedRequestedSlug = requestedSlug.toLowerCase();
  let item = null;
  let resolvedType = requestedType;
  let rpcType = requestedType;

  if (!client || !box) return;

  const normalizeType = (type, row={}) => {
    const t = String(type || "").toLowerCase();
    if (t === "telegram_product" || t === "code") return "code";
    if (["telegram_channel","telegram-channel","channel"].includes(t)) return row.type === "group" ? "group" : "channel";
    if (t === "group" || t === "telegram_group" || t === "telegram-group") return "group";
    if (t === "paste") return "paste";
    if (t === "pastelink" || t === "paste-link" || t === "paste_link") return "pastelink";
    return "link";
  };

  const setHeader = (title, subtitle, icon="fa-box") => {
    const h = document.querySelector(".product-page-title");
    const p = document.querySelector(".product-page-subtitle");
    const b = document.querySelector(".product-badge span");
    const i = document.querySelector(".product-badge i");
    if (h) h.textContent = title || "Product";
    if (p) p.textContent = subtitle || "Detail produk dan akses.";
    if (b) b.textContent = "Product";
    if (i) i.className = `fa-solid ${icon}`;
  };

  const accessType = row => String(row?.access_type || "free").toLowerCase() === "paid" ? "paid" : "free";
  const priceOf = row => Number(row?.price || 0);

  function isOwner(item, profile) {
    if (!item || !profile?.id) return false;
    const me = String(profile.id);
    return [item.owner_id, item.creator_id, item.seller_id, item.user_id]
      .filter(Boolean).map(String).includes(me);
  }

  async function currentProfile(){
    try { return typeof window.TC?.profile === "function" ? await window.TC.profile() : null; } catch { return null; }
  }

  async function resolve(){
    if (requestedType === "pastelink") {
      location.replace(`/p/${encodeURIComponent(requestedSlug)}`);
      return false;
    }
    if (requestedType === "paste") {
      if (requestedId) {
        const q = await client.from("pastes").select("id,owner_id,title,slug,content,visibility,password,created_at,updated_at").eq("id",requestedId).maybeSingle();
        if (q.error) throw q.error;
        item = q.data;
      } else {
        const q = await client.from("pastes").select("id,owner_id,title,slug,content,visibility,password,created_at,updated_at").ilike("slug",normalizedRequestedSlug).maybeSingle();
        if (q.error) throw q.error;
        item = q.data;
      }
      resolvedType = "paste";
      return !!item;
    }

    let table = "products";
    if (requestedType === "code") table = "telegram_products";
    if (["channel","group"].includes(requestedType)) table = "telegram_channels";
    // Short Code URLs (/c/f/<slug> and /c/p/<slug>) must work even when
    // Cloudflare rewrites the request to product.html without adding a query string.
    if (requestedType === "code" && !requestedId && requestedSlug) {
      // Canonical public Code route. The database.sql ships get_code_by_slug(text),
      // but keep a guarded direct lookup for older deployments so the page can
      // fail gracefully instead of showing a misleading generic product error.
      const detailBySlug = await window.PasTeleDB.rpc("get_code_by_slug", { p_slug: normalizedRequestedSlug });
      if (!detailBySlug.error) {
        item = Array.isArray(detailBySlug.data) ? detailBySlug.data[0] : detailBySlug.data;
        if (!item || item.found === false) return false;
        resolvedType = "code";
        rpcType = "telegram_product";
        return true;
      }
      console.warn("[PasTele] get_code_by_slug RPC failed; trying direct published lookup.", detailBySlug.error);
      const legacy = await client
        .from("telegram_products")
        .select("id")
        .ilike("slug", normalizedRequestedSlug)
        .in("status", ["published", "active", "live"])
        .maybeSingle();
      if (legacy.error) throw detailBySlug.error;
      if (!legacy.data?.id) return false;
      const detail = await window.PasTeleDB.rpc("get_market_item_detail", {
        p_type: "telegram_product",
        p_id: legacy.data.id
      });
      if (detail.error) throw detail.error;
      item = Array.isArray(detail.data) ? detail.data[0] : detail.data;
      if (!item || item.found === false) return false;
      resolvedType = "code";
      rpcType = "telegram_product";
      return true;
    }

    // Channel/Group public routes must resolve through SECURITY DEFINER RPC.
    // A direct table SELECT is still subject to RLS and can return no row for
    // guests on older deployments, which caused the generic "not found" page.
    if (["channel","group"].includes(requestedType) && !requestedId && requestedSlug) {
      const resolved = await window.PasTeleDB.rpc("get_telegram_content_by_slug", { p_slug: normalizedRequestedSlug, p_type: requestedType });
      if (resolved.error) throw resolved.error;
      item = Array.isArray(resolved.data) ? resolved.data[0] : resolved.data;
      if (!item || item.found === false) return false;
      resolvedType = normalizeType(requestedType, item);
      rpcType = "channel";
      return true;
    }

    const q = requestedId
      ? await client.from(table).select("id").eq("id",requestedId).maybeSingle()
      : await client.from(table).select("id").ilike("slug",normalizedRequestedSlug).maybeSingle();
    if (q.error) throw q.error;
    if (!q.data?.id) return false;
    const id = q.data.id;
    if (table === "products") rpcType = "product";
    else if (table === "telegram_products") rpcType = "telegram_product";
    else rpcType = "channel";
    const guestToken = PRODUCT_GUEST_TOKEN;
    const detail = guestToken ? await window.PasTeleDB.rpc("get_market_item_detail_guest", {p_type:rpcType,p_id:id,p_guest_token:guestToken}) : await window.PasTeleDB.rpc("get_market_item_detail", {p_type:rpcType,p_id:id});
    if (detail.error) throw detail.error;
    item = Array.isArray(detail.data) ? detail.data[0] : detail.data;
    if (!item || item.found === false) return false;
    resolvedType = normalizeType(requestedType,item);
    return true;
  }

  function isOwner(profile){
    if (!profile?.id || !item) return false;
    return String(item.owner_id || item.creator_id || item.seller_id || item.owner_id) === String(profile.id);
  }

  function canonicalViewUrl(item, resolvedType, token = "") {
    const slug = String(item?.slug || "").trim();
    if (!slug) return "";
    const guest = token ? `&guest_token=${encodeURIComponent(token)}` : "";
    if (resolvedType === "code") return `view-code.html?slug=${encodeURIComponent(slug)}${token ? guest : ""}`;
    if (resolvedType === "pastelink") return `view-pastelink.html?slug=${encodeURIComponent(slug)}${token ? guest : ""}`;
    if (resolvedType === "channel" || resolvedType === "group")
      return `view-telegram.html?type=${encodeURIComponent(resolvedType)}&slug=${encodeURIComponent(slug)}${token ? guest : ""}`;
    if (resolvedType === "paste")
      return `paste-view.html?slug=${encodeURIComponent(slug)}${token ? guest : ""}`;
    return "";
  }

  async function canAccess(){
    const profile = await currentProfile();

    // Canonical database RPC is the source of truth.
    // FREE => public; PAID => owner/admin/completed purchase.
    // Guest PAID => completed order matched to guest_access_token.
    if (item?.can_access === true) {
      return {
        ok: true,
        reason: accessType(item) === "free" ? "free" : "purchase",
        profile,
        token: PRODUCT_GUEST_TOKEN
      };
    }

    // Slug resolvers (get_code_by_slug / get_telegram_content_by_slug)
    // do not receive guest_token, so re-check guest access here.
    if (PRODUCT_GUEST_TOKEN && item?.id) {
      try {
        const rpcType =
          resolvedType === "code" ? "telegram_product" :
          (resolvedType === "channel" || resolvedType === "group") ? "channel" :
          (resolvedType === "pastelink" || resolvedType === "paste") ? "pastelink" :
          "product";

        const d = await window.PasTeleDB.rpc("get_market_item_detail_guest", {
          p_type: rpcType,
          p_id: item.id,
          p_guest_token: PRODUCT_GUEST_TOKEN
        });
        if (d.error) throw d.error;

        const row = Array.isArray(d.data) ? d.data[0] : d.data;
        if (row) item = { ...item, ...row };

        if (row?.can_access === true) {
          return {
            ok: true,
            reason: accessType(item) === "free" ? "free" : "purchase",
            profile,
            token: PRODUCT_GUEST_TOKEN
          };
        }
      } catch (e) {
        console.warn("[Product] Guest access RPC:", e);
      }
    }

    return {
      ok: false,
      reason: "purchase_required",
      profile,
      token: PRODUCT_GUEST_TOKEN
    };
  }

  function renderLocked(access){
    const paid = priceOf(item);
    const login = access.reason === "login";
    box.innerHTML = `
      <div class="product-detail">
        <div class="product-detail-icon"><i class="fa-solid fa-lock"></i></div>
        <span class="badge"><i class="fa-solid fa-tag"></i> Paid</span>
        <h1>${esc(item.title || item.name || "Konten Berbayar")}</h1>
        <p class="muted">${esc(item.description || "Konten ini membutuhkan akses berbayar.")}</p>
        <div class="access-limit-note">
          <i class="fa-solid fa-shield-halved"></i>
          <span>${login ? "Kamu bisa membeli sebagai Guest. Login/daftar lebih disarankan agar pembelian tersimpan permanen di akun." : "Konten ini belum terbuka di akun kamu."}</span>
        </div>
        <div class="product-buy-area">
          <strong class="product-price">${money(paid)}</strong>
          <button class="btn primary" id="productBuyBtn" type="button"><i class="fa-solid fa-bag-shopping"></i> ${priceOf(item) <= 0 ? "Dapatkan Konten" : "Beli Akses"}</button>
          <a class="btn" href="premium.html"><i class="fa-solid fa-gem"></i> Lihat Premium</a>
        </div>
      </div>`;
    $("productBuyBtn")?.addEventListener("click", async()=>{
      if (login) {
        const ok = window.confirm("Pembelian sebagai Guest: akses tidak dijamin permanen jika identitas Guest hilang. Login/daftar terlebih dahulu disarankan agar pembelian tersimpan selamanya di akun. Lanjut sebagai Guest?");
        if (!ok) return;
      }
      const btn=$("productBuyBtn"); btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
      try {
        const typeForCheckout = resolvedType === "code" ? "telegram_product" : (resolvedType === "channel" || resolvedType === "group" ? "channel" : (resolvedType === "paste" ? "pastelink" : "product"));
        const profile = await currentProfile();
        const checkoutToken = guestCheckoutToken();
        const q = profile?.id
          ? await window.PasTeleDB.rpc("buy_market_item",{p_type:typeForCheckout,p_id:item.id})
          : await window.PasTeleDB.rpc("buy_market_item_guest",{p_type:typeForCheckout,p_id:item.id,p_guest_token:checkoutToken});
        if(q.error) throw q.error;
        const oid=q.data?.order_id;
        if(!oid) throw new Error("Order ID tidak ditemukan.");
        location.href=`payment.html?order_id=${encodeURIComponent(oid)}${profile?.id ? "" : `&guest_token=${encodeURIComponent(checkoutToken)}`}`;
      } catch(e) { toast(e.message||"Checkout gagal.","error"); btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-qrcode"></i> Beli Akses'; }
    });
  }

  function renderOpen(access){
    const typeLabel = {link:"Link",paste:"Paste",code:"Code",channel:"Channel",group:"Group"}[resolvedType] || "Product";
    const icon = {link:"fa-link",paste:"fa-file-lines",code:"fa-code",channel:"fa-tower-broadcast",group:"fa-users"}[resolvedType] || "fa-box";
    const title=item.title || item.name || "Untitled";
    let contentHtml="";
    if (resolvedType === "channel" || resolvedType === "group") {
      const target=telegramTarget(item);
      contentHtml = target
        ? `<div class="telegram-access-card"><i class="fa-solid ${icon}"></i><div><strong>${esc(resolvedType === "group" ? "Group Telegram" : "Channel Telegram")}</strong><span>${esc(item.username || item.telegram_channel_id || item.name || "Telegram")}</span></div><a class="btn primary" href="${esc(target)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Telegram</a></div>`
        : `<div class="telegram-empty"><i class="fa-solid ${icon}"></i><div><strong>${esc(item.name || title)}</strong><span>Target Telegram belum memiliki URL publik yang dapat dibuka.</span></div></div>`;
    } else if (resolvedType === "paste") {
      contentHtml = `<div class="rich-output"><pre>${esc(item.content || "")}</pre></div>`;
    } else {
      const raw=String(item.content || "");
      const safe = resolvedType === "link" && /^https?:\/\//i.test(raw.trim())
        ? `<div class="telegram-access-card"><i class="fa-solid fa-link"></i><div><strong>Link tersedia</strong><span>${esc(raw.trim())}</span></div><a class="btn primary" href="${esc(raw.trim())}" target="_blank" rel="noopener noreferrer">Buka Link</a></div>`
        : `<div class="rich-output"><pre>${esc(raw)}</pre></div>`;
      contentHtml=safe;
    }
    box.innerHTML=`
      <div class="product-detail">
        <div class="product-detail-icon"><i class="fa-solid ${icon}"></i></div>
        <span class="badge"><i class="fa-solid ${accessType(item)==="paid"?"fa-tag":"fa-unlock"}"></i> ${accessType(item)==="paid"?"Paid":"Free"}</span>
        <h1>${esc(title)}</h1>
        <p class="muted">${esc(item.description || "")}</p>
        ${access.reason !== "free" ? `<div class="access-limit-note premium-access-note"><i class="fa-solid fa-circle-check"></i><span>Akses berhasil dibuka untuk akun kamu.</span></div>` : ""}
        ${contentHtml}
        <div class="product-detail-meta"><span><i class="fa-solid fa-eye"></i> ${Number(item.views||0).toLocaleString("id-ID")} views</span><span><i class="fa-solid fa-cart-shopping"></i> ${Number(item.sales_count||0).toLocaleString("id-ID")} sales</span></div>
      </div>`;
  }

  async function loadEngagement(){
    const targetId=item?.id; if(!targetId) return;
    const likeBtn=$("productLikeBtn"), likeCount=$("productLikeCount"), likeIcon=$("productLikeIcon"), likeLabel=$("productLikeLabel");
    const shareBtn=$("productShareBtn"), shareCount=$("productShareCount");
    const commentCount=$("productCommentCount"), list=$("productCommentList"), form=$("productCommentForm"), submit=$("productCommentSubmit");
    const targetType = resolvedType === "code" ? "telegram_product" : resolvedType;
    const likes=await client.from("content_likes").select("id,actor_id").eq("target_id",targetId).eq("target_type",targetType);
    if(!likes.error){
      const profile=await currentProfile(); const mine=!!profile?.id && likes.data.some(x=>String(x.actor_id)===String(profile.id));
      if(likeCount) likeCount.textContent=String(likes.data.length);
      if(likeBtn) likeBtn.setAttribute("aria-pressed",mine?"true":"false");
      if(likeIcon) likeIcon.className=mine?"fa-solid fa-heart":"fa-regular fa-heart";
      if(likeLabel) likeLabel.textContent=mine?"Disukai":"Suka";
    }
    if (shareCount) {
      const shares=await client.from("analytics_events").select("id",{count:"exact",head:true}).eq("target_id",targetId).eq("target_type",targetType).eq("event_type","share");
      if(!shares.error) shareCount.textContent=String(shares.count||0);
    }
    if (shareBtn) shareBtn.onclick=async()=>{
      const url=location.href;
      try {
        if (navigator.share) await navigator.share({title:item.title||"PasTele",text:item.description||"Lihat produk ini di PasTele",url});
        else await navigator.clipboard.writeText(url);
      } catch(e) { if(e?.name==='AbortError') return; try { await navigator.clipboard.writeText(url); } catch(_) {} }
      try { await window.PasTeleDB.rpc("track_analytics",{p_event_type:"share",p_target_type:targetType,p_target_id:targetId,p_owner:item.owner_id||item.creator_id||item.seller_id||null}); } catch(e) { console.warn("[Product] Share tracking unavailable:",e); }
      if(shareCount) shareCount.textContent=String(Number(shareCount.textContent||0)+1);
    };
    if (likeBtn) likeBtn.onclick=async()=>{
      const profile=await currentProfile();
      let q;
      if(profile?.id){
        q=await window.PasTeleDB.rpc("toggle_content_like",{p_target_id:targetId,p_target_type:targetType,p_owner:item.owner_id||item.creator_id||item.seller_id||null});
      } else {
        const guestToken=guestCheckoutToken();
        q=await window.PasTeleDB.rpc("toggle_content_like_guest",{p_target_id:targetId,p_target_type:targetType,p_guest_token:guestToken});
      }
      if(q.error){toast(q.error.message||"Gagal menyukai.","error");return;}
      await loadEngagement();

    /* Creator follow — database-backed, using the resolved item owner. */
    const followBtn = document.getElementById("productFollowBtn");
    const ownerId = item?.owner_id || item?.creator_id || item?.seller_id || null;
    if (followBtn && ownerId) {
      const me = await currentProfile();
      if (!me?.id || String(me.id) === String(ownerId)) {
        followBtn.style.display = "none";
      } else {
        const renderFollow = async () => {
          try {
            const q = await window.PasTeleDB.rpc("get_follow_state", { p_creator_id: ownerId });
            if (q.error) return;
            const following = Boolean(q.data);
            followBtn.classList.toggle("active", following);
            followBtn.innerHTML = following
              ? '<i class="fa-solid fa-user-check"></i><span>Mengikuti</span>'
              : '<i class="fa-solid fa-user-plus"></i><span>Ikuti Creator</span>';
          } catch (_) {}
        };
        await renderFollow();
        followBtn.onclick = async () => {
          followBtn.disabled = true;
          try {
            const q = await window.PasTeleDB.rpc("toggle_creator_follow", { p_creator_id: ownerId });
            if (q.error) throw q.error;
            await renderFollow();
            try { await window.PasTeleDB.rpc("record_quest_event", { p_event_type: "follow" }); } catch (_) {}
          } catch (e) {
            toast(e.message || "Gagal mengikuti creator.", "error");
          } finally { followBtn.disabled = false; }
        };
      }
    }
    };
    const comments=await client.from("content_comments").select("id,user_id,body,display_name,created_at").eq("target_id",targetId).eq("target_type",targetType).order("created_at",{ascending:false}).limit(100);
    if(!comments.error){
      if(commentCount) commentCount.textContent=String(comments.data.length);
      if(list) list.innerHTML=comments.data.length?comments.data.map(c=>`<article class="product-comment-item"><div class="product-comment-avatar"><i class="fa-solid fa-user"></i></div><div><strong>${esc(c.display_name || (c.user_id ? "User" : "Guest"))}</strong><time>${new Date(c.created_at).toLocaleString("id-ID")}</time><p>${esc(c.body)}</p></div></article>`).join(""):'<div class="empty">Belum ada komentar.</div>';
    }
    const profile=await currentProfile();
    if(!profile?.id){
      const note=form?.querySelector(".product-comment-actions"); if(note) note.insertAdjacentHTML("beforebegin",'<div class="access-limit-note"><i class="fa-solid fa-right-to-bracket"></i><span>Login diperlukan untuk memberikan komentar.</span></div>');
      if(submit){submit.disabled=true;submit.title="Login diperlukan";}
    } else {
      if (form) form.onsubmit=async e=>{
        e.preventDefault(); const name=$("commentName"), text=$("commentText"); const body=String(text?.value||"").trim(); if(!body) return;
        submit.disabled=true;
        const q=await client.from("content_comments").insert({target_id:targetId,target_type:targetType,user_id:profile.id,body});
        if(q.error) toast(q.error.message||"Komentar gagal dikirim.","error"); else {text.value="";$("commentCharCount").textContent="0";toast("Komentar berhasil dikirim.","success");await loadEngagement();}
        submit.disabled=false;
      };
      $("commentText")?.addEventListener("input",()=>{$("commentCharCount").textContent=String($("commentText").value.length);});
    }
  }

  try {
    box.setAttribute("aria-busy","true");
    const ok=await resolve();
    if(!ok){ box.innerHTML='<div class="empty">Produk tidak ditemukan atau sudah tidak tersedia.</div>'; return; }
    const title=item.title || item.name || "Product";
    setHeader(title,item.description||"Detail produk dan akses.",({link:"fa-link",paste:"fa-file-lines",code:"fa-code",channel:"fa-tower-broadcast",group:"fa-users"}[resolvedType]||"fa-box"));
    const access=await canAccess();
    if(access.ok){
      const target = canonicalViewUrl(item, resolvedType, PRODUCT_GUEST_TOKEN);
      if(target){
        window.location.replace(target);
        return;
      }
      renderOpen(access);
    } else {
      renderLocked(access);
    }

    /* Record every opening; the SQL trigger creates the owner's notification. */
    try {
      const owner = item.owner_id || item.creator_id || item.seller_id || null;
      const targetType = resolvedType === "code" ? "telegram_product" : (resolvedType === "channel" || resolvedType === "group" ? "channel" : resolvedType);
      await window.PasTeleDB.rpc("record_content_view", { p_owner: owner, p_target_type: targetType, p_target_id: item.id });
    } catch (viewError) {
      console.warn("[Product] View tracking unavailable:", viewError);
    }

    await loadEngagement();
  } catch(e){
    console.error("[Product]",e);
    box.innerHTML=`<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><br><br>${esc(e.message||"Gagal memuat produk.")}</div>`;
  } finally { box.setAttribute("aria-busy","false"); }
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




/* =========================================================
   PasTele Product — Guest Register Ticker Auth State
   Logged-in users must not see the "Belum punya akun?" notice.
   ========================================================= */
(() => {
  "use strict";

  function updateProductRegisterTicker(session) {
    const ticker = document.querySelector(".product-register-ticker");
    if (!ticker) return;

    const loggedIn = Boolean(session?.user);
    ticker.classList.toggle("is-authenticated", loggedIn);
    ticker.setAttribute("aria-hidden", loggedIn ? "true" : "false");
  }

  async function syncProductRegisterTicker() {
    try {
      const client =
        window.sb ||
        window.sb ||
        window.supabase?.createClient && null;

      if (!client?.auth) {
        // Do not hide the ticker when auth is unavailable.
        // Guests should still see the notice.
        return;
      }

      const { data } = await client.auth.getSession();
      updateProductRegisterTicker(data?.session || null);

      client.auth.onAuthStateChange((_event, session) => {
        updateProductRegisterTicker(session || null);
      });
    } catch (error) {
      console.warn("[PasTele] Product ticker auth check:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncProductRegisterTicker, { once: true });
  } else {
    syncProductRegisterTicker();
  }
})();
