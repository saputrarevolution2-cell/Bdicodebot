/* PasTele — self-contained dashboard page script. One HTML -> one JS -> one CSS. */
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
    const mode = localStorage.getItem(key) || 'light';
    const hour = new Date().getHours();
    const dark = mode === 'dark';
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
    const client = window.sb || window.supabaseClient;
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
            await client.rpc(
              "resolve_username_login",
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
        await client.rpc("check_email_available", {
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
          await client.rpc(
            "resolve_username_login",
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
        await client.rpc(
          "check_username_available",
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
        (window.sb || window.supabaseClient) &&
        (window.sb?.auth || window.supabaseClient?.auth)
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
    if (!MODES.includes(mode)) mode = 'light';
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
    if (!MODES.includes(mode)) mode = 'light';
    localStorage.setItem(KEY, mode);
    return apply(mode);
  };

  const cycle = () => {
    const current = localStorage.getItem(KEY) || 'light';
    const index = Math.max(0, MODES.indexOf(current));
    return set(['light', 'dark'][(index + 1) % 2]);
  };

  window.PasTeleTheme = Object.freeze({
    get: () => localStorage.getItem(KEY) || 'light',
    resolved: () => resolve(localStorage.getItem(KEY) || 'light'),
    set,
    cycle,
    apply
  });

  apply();
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
          await window.sb.rpc(
            'get_public_site_settings'
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
    const target = '';
    const card = document.createElement('article');
    card.className = 'pt-live-notice';
    card.setAttribute('role', target ? 'link' : 'status');
    card.innerHTML = `<div class="pt-live-icon"><i class="fa-solid ${esc(icon('notification'))}"></i></div><div class="pt-live-copy"><strong>${esc(n.title || 'Notifikasi')}</strong><span>${esc(n.body || '')}</span><small class="pt-live-time">Baru saja${target ? ' · Ketuk untuk membuka' : ''}</small></div><button class="pt-live-close" type="button" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>`;
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
        const r = await window.sb.from('notifications').select('id,user_id,title,body,is_read,created_at').eq('user_id',u.id).gt('created_at',last).order('created_at',{ascending:true}).limit(20);
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
   PasTele — DASHBOARD
   SOURCE: /js/dashboard.js
   VERSION: 2026-09-09
   FINAL SQL SYNC
   ---------------------------------------------------------
   Compatible with:
   SUPABASE_MASTER_FINAL_PENDING_H1_H2_FINAL.sql
   IMPORTANT SQL SYNC:
   - products.seller_id / creator_id
   - telegram_products.status
   - telegram_channels.status
   - pastes.owner_id
   - pastelinks.user_id
   - orders.seller_id / item_type / item_id
   - transactions.user_id / type / reference
   - analytics_events.owner_id
   - content_likes.content_owner_id
   - creator_followers.creator_id
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  'use strict';
  /* =======================================================
     DOM
     ======================================================= */
  const $ = (id) => document.getElementById(id);
  /* =======================================================
     CORE
     ======================================================= */
  const core = window.TC || {};
  const supabase =
    window.sb ||
    window.supabaseClient ||
    window.supabase;
  if (!supabase) {
    console.error(
      'PasTele Dashboard: Supabase client tidak ditemukan.'
    );
    if ($('activity')) {
      $('activity').innerHTML = `
        <div class="empty">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>Supabase belum siap.</span>
        </div>
      `;
    }
    return;
  }
  /* =======================================================
     HELPERS
     ======================================================= */
  const fallbackEsc = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  const esc = (value) =>
    typeof core.esc === 'function'
      ? core.esc(value)
      : fallbackEsc(value);
  const number = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString('id-ID');
  };
  const fallbackMoney = (value) => {
    const n = Number(value || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(n);
  };
  const money = (value) => {
    const n = Number(value || 0);
    return typeof core.money === 'function'
      ? core.money(n)
      : fallbackMoney(n);
  };
  const toast = (
    message,
    type = 'info'
  ) => {
    if (typeof core.toast === 'function') {
      core.toast(message, type);
      return;
    }
    const box = $('toast');
    if (!box) {
      return;
    }
    box.textContent =
      String(message || '');
    box.className = '';
    box.classList.add(
      `toast-${type}`
    );
    clearTimeout(
      toast._timer
    );
    toast._timer =
      setTimeout(() => {
        box.className = '';
        box.textContent = '';
      }, 3500);
  };
  const normalize = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase();
  const safeDate = (value) => {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  };
  const startOfDay = (value) => {
    const date = new Date(value);
    date.setHours(
      0,
      0,
      0,
      0
    );
    return date;
  };
  const addDays = (
    value,
    amount
  ) => {
    const date =
      new Date(value);
    date.setDate(
      date.getDate() + amount
    );
    return date;
  };
  const dateKey = (value) => {
    const date =
      value instanceof Date
        ? value
        : new Date(value);
    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }
    const year =
      date.getFullYear();
    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');
    const day =
      String(
        date.getDate()
      ).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const formatDay = (
    date
  ) =>
    date.toLocaleDateString(
      'id-ID',
      {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      }
    );
  const formatDate = (
    value
  ) => {
    const date =
      safeDate(value);
    if (!date) {
      return '-';
    }
    return date.toLocaleDateString(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  };
  const formatDateTime = (
    value
  ) => {
    const date =
      safeDate(value);
    if (!date) {
      return '-';
    }
    return date.toLocaleString(
      'id-ID'
    );
  };
  /* =======================================================
     PAGINATION FETCH
     ======================================================= */
  async function fetchAll(
    buildQuery,
    pageSize = 1000
  ) {
    const all = [];
    let from = 0;
    while (true) {
      const to =
        from +
        pageSize -
        1;
      const query =
        buildQuery();
      const {
        data,
        error
      } =
        await query.range(
          from,
          to
        );
      if (error) {
        throw error;
      }
      const rows =
        Array.isArray(data)
          ? data
          : [];
      all.push(
        ...rows
      );
      if (
        rows.length <
        pageSize
      ) {
        break;
      }
      from +=
        pageSize;
    }
    return all;
  }
  /* =======================================================
     AUTH
     ======================================================= */
  let user = null;
  try {
    if (
      typeof core.user ===
      'function'
    ) {
      user =
        await core.user();
    } else {
      const {
        data,
        error
      } =
        await supabase.auth.getUser();
      if (error) {
        throw error;
      }
      user =
        data?.user || null;
    }
  } catch (error) {
    console.error(
      'Dashboard auth error:',
      error
    );
    location.replace(
      'login.html'
    );
    return;
  }
  if (!user) {
    location.replace(
      'login.html'
    );
    return;
  }
  /* =======================================================
     GREETING
     ======================================================= */
  if ($('helloName')) {
    $('helloName').textContent =
      user.user_metadata
        ?.username ||
      user.user_metadata
        ?.name ||
      user.user_metadata
        ?.full_name ||
      user.email
        ?.split('@')[0] ||
      'User';
  }
  /* =======================================================
     DATE RANGE
     ======================================================= */
  const today =
    startOfDay(
      new Date()
    );
  /*
   * CURRENT:
   * hari -6 sampai hari ini
   */
  const currentStart =
    addDays(
      today,
      -6
    );
  /*
   * PREVIOUS:
   * 7 hari sebelum current
   */
  const previousStart =
    addDays(
      today,
      -13
    );
  const currentDays =
    Array.from(
      {
        length: 7
      },
      (_, index) =>
        addDays(
          currentStart,
          index
        )
    );
  const previousDays =
    Array.from(
      {
        length: 7
      },
      (_, index) =>
        addDays(
          previousStart,
          index
        )
    );
  const currentDayKeys =
    new Set(
      currentDays.map(
        dateKey
      )
    );
  const previousDayKeys =
    new Set(
      previousDays.map(
        dateKey
      )
    );
  /*
   * Buffer timezone UTC.
   */
  const queryStart =
    addDays(
      previousStart,
      -1
    ).toISOString();
  const queryEnd =
    addDays(
      today,
      1
    ).toISOString();
  /* =======================================================
     SCOPE
     ======================================================= */
  const getScope = () =>
    $('scope')?.value ||
    'all';
  const matchProductType = (
    type,
    scope
  ) => {
    const normalized =
      normalize(type);
    if (
      scope === 'all'
    ) {
      return true;
    }
    if (
      scope === 'paste'
    ) {
      return [
        'link',
        'paste',
        'pastelink'
      ].includes(
        normalized
      );
    }
    return (
      normalized ===
      normalize(scope)
    );
  };
  const matchTelegramProduct = (
    item,
    scope
  ) => {
    if (
      scope === 'all'
    ) {
      return true;
    }
    if (
      scope !== 'code'
    ) {
      return false;
    }
    const type =
      normalize(
        item?.product_type ||
        item?.type
      );
    return [
      'code',
      'product',
      'file'
    ].includes(type);
  };
  const matchChannel = (
    item,
    scope
  ) => {
    if (
      scope === 'all'
    ) {
      return true;
    }
    return (
      normalize(
        item?.type
      ) ===
      normalize(scope)
    );
  };
  const matchEvent = (
    event,
    scope
  ) => {
    if (
      scope === 'all'
    ) {
      return true;
    }
    const target =
      normalize(
        event?.target_type
      );
    if (
      scope === 'paste'
    ) {
      return [
        'link',
        'paste',
        'pastelink'
      ].includes(
        target
      );
    }
    if (
      scope === 'code'
    ) {
      return [
        'code',
        'product',
        'file'
      ].includes(
        target
      );
    }
    if (
      scope === 'channel'
    ) {
      return (
        target ===
        'channel' ||
        target ===
        'telegram_channel'
      );
    }
    if (
      scope === 'group'
    ) {
      return (
        target ===
        'group' ||
        target ===
        'telegram_group'
      );
    }
    return false;
  };
  /* =======================================================
     TREND
     ======================================================= */
  const calculateTrend = (
    current,
    previous
  ) => {
    const currentValue =
      Number(
        current || 0
      );
    const previousValue =
      Number(
        previous || 0
      );
    if (
      currentValue === 0 &&
      previousValue === 0
    ) {
      return {
        direction:
          'stable',
        icon:
          'fa-minus',
        label:
          '0%',
        percent:
          0
      };
    }
    if (
      previousValue === 0 &&
      currentValue > 0
    ) {
      return {
        direction:
          'up',
        icon:
          'fa-arrow-trend-up',
        label:
          '+100%',
        percent:
          100
      };
    }
    const percent =
      (
        (
          currentValue -
          previousValue
        ) /
        previousValue
      ) * 100;
    if (
      Math.abs(percent) <
      0.05
    ) {
      return {
        direction:
          'stable',
        icon:
          'fa-minus',
        label:
          '0%',
        percent:
          0
      };
    }
    const rounded =
      Math.abs(
        percent
      ).toFixed(1);
    if (
      percent > 0
    ) {
      return {
        direction:
          'up',
        icon:
          'fa-arrow-trend-up',
        label:
          `+${rounded}%`,
        percent
      };
    }
    return {
      direction:
        'down',
      icon:
        'fa-arrow-trend-down',
      label:
        `-${rounded}%`,
      percent
    };
  };
  const renderTrend = (
    elementId,
    trend
  ) => {
    const element =
      $(elementId);
    if (
      !element ||
      !trend
    ) {
      return;
    }
    element.className =
      `trend trend-${trend.direction}`;
    element.innerHTML = `
      <i
        class="fa-solid ${esc(trend.icon)}"
        aria-hidden="true"
      ></i>
      <span>
        ${esc(trend.label)}
      </span>
    `;
  };
  /* =======================================================
     PAGINATION UI
     ======================================================= */
  function renderPager(
    id,
    page,
    total,
    onChange
  ) {
    const host =
      $(id);
    if (!host) {
      return;
    }
    if (
      total <= 1
    ) {
      host.innerHTML = '';
      return;
    }
    const buttons = [];
    buttons.push(`
      <button
        type="button"
        ${page === 1 ? 'disabled' : ''}
        data-p="${page - 1}"
        aria-label="Halaman sebelumnya"
      >
        ‹
      </button>
    `);
    for (
      let i = 1;
      i <= total;
      i++
    ) {
      if (
        total > 7 &&
        i > 2 &&
        i < total - 1 &&
        Math.abs(i - page) > 1
      ) {
        if (
          i === 3 ||
          i === total - 2
        ) {
          buttons.push(
            '<span>…</span>'
          );
        }
        continue;
      }
      buttons.push(`
        <button
          type="button"
          class="${i === page ? 'active' : ''}"
          data-p="${i}"
        >
          ${i}
        </button>
      `);
    }
    buttons.push(`
      <button
        type="button"
        ${page === total ? 'disabled' : ''}
        data-p="${page + 1}"
        aria-label="Halaman berikutnya"
      >
        ›
      </button>
    `);
    host.innerHTML =
      buttons.join('');
    host
      .querySelectorAll(
        'button[data-p]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            () => {
              const next =
                Number(
                  button.dataset.p
                );
              if (
                Number.isFinite(
                  next
                ) &&
                next >= 1 &&
                next <= total &&
                next !== page
              ) {
                onChange(
                  next
                );
              }
            }
          );
        }
      );
  }
  /* =======================================================
     PERFORMANCE SNAPSHOT
     ======================================================= */
  const performanceSnapshot = {
    views: {
      label:
        'Views',
      value:
        0,
      trend:
        null
    },
    sales: {
      label:
        'Sales',
      value:
        0,
      trend:
        null
    },
    share: {
      label:
        'Share',
      value:
        0,
      trend:
        null
    },
    revenue: {
      label:
        'Revenue',
      value:
        0,
      trend:
        null
    }
  };
  /* =======================================================
     CHART
     ======================================================= */
  const renderChart = (
    chartData
  ) => {
    const chart =
      $('chart');
    if (!chart) {
      return;
    }
    const max =
      Math.max(
        1,
        ...currentDays.map(
          (day) => {
            const item =
              chartData[
                dateKey(day)
              ] || {};
            return Math.max(
              Number(
                item.views || 0
              ),
              Number(
                item.sales || 0
              ),
              Number(
                item.share || 0
              )
            );
          }
        )
      );
    if (!currentDays.length) {
      chart.innerHTML = `
        <div class="chart-empty-state">
          <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
          <span>Belum ada data performa.</span>
        </div>
      `;
      return;
    }

    chart.innerHTML =
      currentDays
        .map(
          (day) => {
            const key =
              dateKey(day);
            const item =
              chartData[key] || {
                views:
                  0,
                sales:
                  0,
                share:
                  0,
                revenue:
                  0
              };
            const views =
              Number(
                item.views || 0
              );
            const sales =
              Number(
                item.sales || 0
              );
            const share =
              Number(
                item.share || 0
              );
            const viewsHeight =
              views > 0
                ? Math.max(
                    3,
                    (
                      views /
                      max
                    ) * 100
                  )
                : 2;
            const salesHeight =
              sales > 0
                ? Math.max(
                    3,
                    (
                      sales /
                      max
                    ) * 100
                  )
                : 2;
            const shareHeight =
              share > 0
                ? Math.max(
                    3,
                    (
                      share /
                      max
                    ) * 100
                  )
                : 2;
            return `
              <div
                class="chart-day"
                data-date="${esc(key)}"
                tabindex="0"
                role="button"
                title="${esc(
                  `${formatDay(day)} — Views ${number(views)}, Sales ${number(sales)}, Share ${number(share)}`
                )}"
              >
                <div class="bars">
                  <i
                    class="bar-views"
                    style="height:${viewsHeight}%"
                    aria-label="Views ${number(views)}"
                  ></i>
                  <i
                    class="bar-sales"
                    style="height:${salesHeight}%"
                    aria-label="Sales ${number(sales)}"
                  ></i>
                  <i
                    class="bar-share"
                    style="height:${shareHeight}%"
                    aria-label="Share ${number(share)}"
                  ></i>
                </div>
                <small>
                  ${esc(
                    formatDay(day)
                  )}
                </small>
              </div>
            `;
          }
        )
        .join('');
    chart
      .querySelectorAll(
        '.chart-day'
      )
      .forEach(
        (dayElement) => {
          const handler =
            () => {
              const key =
                dayElement
                  .dataset
                  .date;
              const item =
                chartData[
                  key
                ] || {};
              toast(
                `${formatDate(key)} · Views ${number(item.views || 0)} · Sales ${number(item.sales || 0)} · Share ${number(item.share || 0)} · Revenue ${money(item.revenue || 0)}`,
                'info'
              );
            };
          dayElement.addEventListener(
            'click',
            handler
          );
          dayElement.addEventListener(
            'keydown',
            (event) => {
              if (
                event.key ===
                  'Enter' ||
                event.key ===
                  ' '
              ) {
                event.preventDefault();
                handler();
              }
            }
          );
        }
      );
  };
  /* =======================================================
     MAIN LOAD
     ======================================================= */
  async function load() {
    const scope =
      getScope();
    /* =====================================================
       DATABASE
       ===================================================== */
    /* =====================================================
       WALLET SETTLEMENT
       Canonical SQL uses H+2 / 48 hours.
       Failure here must never block the dashboard.
       ===================================================== */
    try {
      await supabase.rpc('release_matured_wallet');
    } catch (walletReleaseError) {
      console.warn(
        'Wallet settlement refresh skipped:',
        walletReleaseError
      );
    }

    const [
      products,
      pastes,
      pastelinks,
      telegramProducts,
      telegramChannels,
      orders,
      transactions,
      analyticsEvents,
      likesResult,
      followsResult,
      walletResult
    ] =
      await Promise.all([
        /*
         * PRODUCTS
         *
         * SQL:
         * seller_id
         * creator_id
         */
        fetchAll(() =>
          supabase
            .from('products')
            .select(
              [
                'id',
                'seller_id',
                'creator_id',
                'title',
                'slug',
                'type',
                'access_type',
                'category',
                'views',
                'sales_count',
                'price',
                'status',
                'created_at'
              ].join(',')
            )
            .or(
              `creator_id.eq.${user.id},seller_id.eq.${user.id}`
            )
            .order(
              'created_at',
              {
                ascending:
                  false
              }
            )
        ),
        /*
         * PASTES
         *
         * SQL:
         * owner_id
         */
        fetchAll(() =>
          supabase
            .from('pastes')
            .select(
              [
                'id',
                'owner_id',
                'title',
                'slug',
                'visibility',
                'created_at'
              ].join(',')
            )
            .eq(
              'owner_id',
              user.id
            )
            .order(
              'created_at',
              {
                ascending:
                  false
              }
            )
        ),
        /*
         * PASTELINKS
         *
         * SQL:
         * user_id
         */
        fetchAll(() =>
          supabase
            .from('pastelinks')
            .select(
              [
                'id',
                'user_id',
                'slug',
                'title',
                'views',
                'created_at'
              ].join(',')
            )
            .eq(
              'user_id',
              user.id
            )
            .order(
              'created_at',
              {
                ascending:
                  false
              }
            )
        ),
        /*
         * TELEGRAM PRODUCTS
         *
         * SQL memakai:
         * status
         * BUKAN legacy_published_flag
         */
        fetchAll(() =>
          supabase
            .from(
              'telegram_products'
            )
            .select(
              [
                'id',
                'owner_id',
                'title',
                'slug',
                'type',
                'product_type',
                'access_type',
                'price',
                'status',
                'views',
                'sales_count',
                'created_at'
              ].join(',')
            )
            .eq(
              'owner_id',
              user.id
            )
            .order(
              'created_at',
              {
                ascending:
                  false
              }
            )
        ),
        /*
         * TELEGRAM CHANNELS
         *
         * SQL memakai:
         * status
         * BUKAN legacy_published_flag
         */
        fetchAll(() =>
          supabase
            .from(
              'telegram_channels'
            )
            .select(
              [
                'id',
                'owner_id',
                'username',
                'name',
                'type',
                'access_type',
                'price',
                'status',
                'views',
                'sales_count',
                'created_at'
              ].join(',')
            )
            .eq(
              'owner_id',
              user.id
            )
            .order(
              'created_at',
              {
                ascending:
                  false
              }
            )
        ),
        /*
         * ORDERS
         */
        fetchAll(() =>
          supabase
            .from('orders')
            .select(
              [
                'id',
                'buyer_id',
                'seller_id',
                'product_id',
                'amount',
                'status',
                'item_type',
                'item_id',
                'item_title',
                'payment_reference',
                'paid_at',
                'created_at'
              ].join(',')
            )
            .eq(
              'seller_id',
              user.id
            )
            .in(
              'status',
              [
                'paid',
                'success',
                'completed'
              ]
            )
            .order(
              'created_at',
              {
                ascending:
                  false
              }
            )
        ),
        /*
         * TRANSACTIONS
         *
         * SQL:
         * sale_earning
         * withdrawal_fee
         * dll.
         */
        fetchAll(() =>
          supabase
            .from(
              'transactions'
            )
            .select(
              [
                'id',
                'user_id',
                'amount',
                'fee',
                'net_amount',
                'type',
                'status',
                'reference',
                'description',
                'created_at'
              ].join(',')
            )
            .eq(
              'user_id',
              user.id
            )
            .order(
              'created_at',
              {
                ascending:
                  false
              }
            )
        ),
        /*
         * ANALYTICS EVENTS
         *
         * SQL:
         * owner_id
         * actor_id
         * event_type
         * target_type
         * target_id
         */
        fetchAll(() =>
          supabase
            .from(
              'analytics_events'
            )
            .select(
              [
                'id',
                'owner_id',
                'actor_id',
                'event_type',
                'target_type',
                'target_id',
                'created_at'
              ].join(',')
            )
            .eq(
              'owner_id',
              user.id
            )
            .gte(
              'created_at',
              queryStart
            )
            .lt(
              'created_at',
              queryEnd
            )
            .order(
              'created_at',
              {
                ascending:
                  false
              }
            )
        ),
        /*
         * LIKES
         *
         * SQL:
         * content_owner_id
         */
        supabase
          .from(
            'content_likes'
          )
          .select(
            'id',
            {
              count:
                'exact',
              head:
                true
            }
          )
          .eq(
            'content_owner_id',
            user.id
          ),
        /*
         * FOLLOWERS
         *
         * SQL:
         * creator_id
         */
        supabase
          .from(
            'creator_followers'
          )
          .select(
            'id',
            {
              count:
                'exact',
              head:
                true
            }
          )
          .eq(
            'creator_id',
            user.id
          ),
        supabase
          .from('wallets')
          .select(
            'balance,available_balance,pending_balance,updated_at'
          )
          .eq(
            'user_id',
            user.id
          )
          .maybeSingle()
      ]);
    /* =====================================================
       ERROR CHECK
       ===================================================== */
    if (
      likesResult?.error
    ) {
      throw likesResult.error;
    }
    if (
      followsResult?.error
    ) {
      throw followsResult.error;
    }
    /* =====================================================
       FILTER CONTENT
       ===================================================== */
    const filteredProducts =
      products.filter(
        (item) =>
          matchProductType(
            item.type,
            scope
          )
      );
    const filteredPastes =
      scope === 'all' ||
      scope === 'paste'
        ? pastes
        : [];
    const filteredPastelinks =
      scope === 'all' ||
      scope === 'paste'
        ? pastelinks
        : [];
    const filteredCodes =
      telegramProducts.filter(
        (item) =>
          matchTelegramProduct(
            item,
            scope
          )
      );
    const filteredChannels =
      telegramChannels.filter(
        (item) =>
          matchChannel(
            item,
            scope
          )
      );
    /* =====================================================
       FILTER ANALYTICS
       ===================================================== */
    const scopedEvents =
      analyticsEvents.filter(
        (event) =>
          matchEvent(
            event,
            scope
          )
      );
    /* =====================================================
       CONTENT COUNT
       ===================================================== */
    const createdCount =
      filteredProducts.length +
      filteredPastes.length +
      filteredPastelinks.length +
      filteredCodes.length +
      filteredChannels.length;
    if ($('created')) {
      $('created').textContent =
        number(
          createdCount
        );
    }
    if (
      $('detailContent')
    ) {
      $('detailContent').textContent =
        number(
          createdCount
        );
    }
    /* =====================================================
       TOTAL LINK
       ===================================================== */
    const totalLink =
      products.filter(
        (item) =>
          [
            'link',
            'paste',
            'pastelink'
          ].includes(
            normalize(
              item.type
            )
          )
      ).length +
      pastes.length +
      pastelinks.length;
    /* =====================================================
       TOTAL CODE
       ===================================================== */
    const totalCode =
      telegramProducts.filter(
        (item) =>
          [
            'code',
            'product',
            'file'
          ].includes(
            normalize(
              item.product_type ||
              item.type
            )
          )
      ).length +
      products.filter(
        (item) =>
          normalize(
            item.type
          ) === 'code'
      ).length;
    /* =====================================================
       TOTAL CHANNEL
       ===================================================== */
    const totalChannel =
      telegramChannels.filter(
        (item) =>
          normalize(
            item.type
          ) === 'channel'
      ).length;
    if (
      $('totalLink')
    ) {
      $('totalLink').textContent =
        number(
          totalLink
        );
    }
    if (
      $('totalCode')
    ) {
      $('totalCode').textContent =
        number(
          totalCode
        );
    }
    if (
      $('totalChannel')
    ) {
      $('totalChannel').textContent =
        number(
          totalChannel
        );
    }
    /* =====================================================
       ALL-TIME STORED VIEWS
       ===================================================== */
    /*
     * Counter tersimpan adalah all-time.
     *
     * Digunakan untuk kartu TOTAL VIEWS.
     *
     * Tidak dicampur dengan analytics
     * supaya tidak double count.
     */
    const storedViews =
      filteredProducts.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.views || 0
          ),
        0
      ) +
      filteredPastelinks.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.views || 0
          ),
        0
      ) +
      filteredCodes.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.views || 0
          ),
        0
      ) +
      filteredChannels.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.views || 0
          ),
        0
      );
    /*
     * Untuk Telegram / content yang
     * tidak punya counter khusus,
     * analytics view tetap menjadi
     * sumber tambahan.
     *
     * Tetapi hanya event target yang
     * tidak mempunyai stored counter.
     */
    const analyticsViews =
      scopedEvents.filter(
        (event) =>
          normalize(
            event.event_type
          ) === 'view'
      ).length;
    const hasStoredViewSources =
      filteredProducts.length >
        0 ||
      filteredPastelinks.length >
        0 ||
      filteredCodes.length >
        0 ||
      filteredChannels.length >
        0;
    /*
     * Dashboard all-time views:
     *
     * Jika content memiliki counter,
     * gunakan counter.
     *
     * Analytics dipakai minimal jika
     * counter belum tersedia.
     */
    const totalViews =
      hasStoredViewSources
        ? storedViews
        : analyticsViews;
    if ($('views')) {
      $('views').textContent =
        number(
          totalViews
        );
    }
    if (
      $('detailViews')
    ) {
      $('detailViews').textContent =
        number(
          totalViews
        );
    }
    /* =====================================================
       ORDER TYPE
       ===================================================== */
    const productById =
      new Map(
        products.map(
          (item) => [
            String(
              item.id
            ),
            item
          ]
        )
      );
    const telegramProductById =
      new Map(
        telegramProducts.map(
          (item) => [
            String(
              item.id
            ),
            item
          ]
        )
      );
    const channelById =
      new Map(
        telegramChannels.map(
          (item) => [
            String(
              item.id
            ),
            item
          ]
        )
      );
    const getOrderType = (
      order
    ) => {
      const explicit =
        normalize(
          order.item_type
        );
      if (
        explicit
      ) {
        return explicit;
      }
      if (
        order.product_id
      ) {
        const id =
          String(
            order.product_id
          );
        const product =
          productById.get(
            id
          );
        if (product) {
          return normalize(
            product.type
          );
        }
        const telegramProduct =
          telegramProductById.get(
            id
          );
        if (
          telegramProduct
        ) {
          return normalize(
            telegramProduct.product_type ||
            telegramProduct.type ||
            'code'
          );
        }
        const channel =
          channelById.get(
            id
          );
        if (
          channel
        ) {
          return normalize(
            channel.type
          );
        }
      }
      return '';
    };
    const normalizeSaleType = (
      type
    ) => {
      let normalized =
        normalize(type);
      normalized =
        normalized.replace(
          /^telegram[-_]/,
          ''
        );
      if (
        normalized ===
        'telegram_product'
      ) {
        return 'code';
      }
      if (
        normalized ===
        'telegram_channel'
      ) {
        return 'channel';
      }
      if (
        normalized ===
        'telegram_group'
      ) {
        return 'group';
      }
      if (
        normalized ===
        'product'
      ) {
        return 'product';
      }
      if (
        normalized ===
        'file'
      ) {
        return 'code';
      }
      return normalized;
    };
    const matchSaleScope = (
      type
    ) => {
      if (
        scope === 'all'
      ) {
        return true;
      }
      const normalized =
        normalizeSaleType(
          type
        );
      if (
        scope === 'paste'
      ) {
        return [
          'link',
          'paste',
          'pastelink'
        ].includes(
          normalized
        );
      }
      if (
        scope === 'code'
      ) {
        return [
          'code',
          'product',
          'file'
        ].includes(
          normalized
        );
      }
      return (
        normalized ===
        normalize(scope)
      );
    };
    /* =====================================================
       SALE TRANSACTIONS
       ===================================================== */
    /*
     * SQL settle_bayargg_order():
     *
     * type        = sale_earning
     * status      = pending
     * reference   = bayargg-order:<order_id>
     *
     * Status pending tetap merupakan
     * seller earning karena dana sedang
     * menunggu H1/H2.
     */
    const saleTransactions =
      transactions.filter(
        (transaction) => {
          const type =
            normalize(
              transaction.type
            );
          const status =
            normalize(
              transaction.status
            );
          return (
            type ===
              'sale_earning' &&
            [
              'pending',
              'completed',
              'paid',
              'success'
            ].includes(
              status
            )
          );
        }
      );
    /* =====================================================
       MATCH TRANSACTION TO ORDER
       ===================================================== */
    const sellerTransactionByOrder =
      new Map();
    saleTransactions.forEach(
      (transaction) => {
        const reference =
          String(
            transaction.reference ??
            ''
          );
        if (
          !reference
        ) {
          return;
        }
        /*
         * Canonical SQL reference:
         *
         * bayargg-order:<uuid>
         */
        const match =
          reference.match(
            /^bayargg-order:(.+)$/i
          );
        if (
          match?.[1]
        ) {
          sellerTransactionByOrder.set(
            String(
              match[1]
            ),
            transaction
          );
          return;
        }
        /*
         * Fallback:
         * direct UUID reference.
         */
        const order =
          orders.find(
            (item) =>
              String(
                item.id
              ) ===
              reference
          );
        if (
          order
        ) {
          sellerTransactionByOrder.set(
            String(
              order.id
            ),
            transaction
          );
        }
      }
    );
    /* =====================================================
       DIRECT SALE TRANSACTIONS
       ===================================================== */
    const paidOrderIds =
      new Set(
        orders.map(
          (order) =>
            String(
              order.id
            )
        )
      );
    const directSaleTransactions =
      saleTransactions.filter(
        (transaction) => {
          const reference =
            String(
              transaction.reference ??
              ''
            );
          /*
           * Jika reference menunjuk
           * ke order, jangan dihitung
           * dua kali.
           */
          const match =
            reference.match(
              /^bayargg-order:(.+)$/i
            );
          if (
            match?.[1] &&
            paidOrderIds.has(
              String(
                match[1]
              )
            )
          ) {
            return false;
          }
          if (
            paidOrderIds.has(
              reference
            )
          ) {
            return false;
          }
          return true;
        }
      );
    /* =====================================================
       SCOPED ORDERS
       ===================================================== */
    const scopedOrders =
      orders.filter(
        (order) =>
          matchSaleScope(
            getOrderType(
              order
            )
          )
      );
    /* =====================================================
       SCOPED DIRECT SALES
       ===================================================== */
    const scopedDirectTransactions =
      directSaleTransactions.filter(
        (transaction) => {
          const description =
            normalize(
              transaction.description
            );
          /*
           * Kalau transaksi standalone
           * tidak menyimpan item type,
           * tetap masukkan pada ALL.
           */
          if (
            scope === 'all'
          ) {
            return true;
          }
          /*
           * Coba baca type dari description
           * jika tersedia.
           */
          const rawType =
            normalize(
              transaction.type
            ).replace(
              /^sell_/,
              ''
            );
          return matchSaleScope(
            rawType
          ) || !description;
        }
      );
    /* =====================================================
       CANONICAL SALE ROWS
       ===================================================== */
    const saleRows = [];
    /*
     * 1. ORDER SALES
     */
    scopedOrders.forEach(
      (order) => {
        const orderId =
          String(
            order.id
          );
        const sellerTransaction =
          sellerTransactionByOrder.get(
            orderId
          );
        /*
         * settlement transaction:
         *
         * amount    = seller share
         * net_amount = seller share
         *
         * Jadi revenue dashboard
         * menggunakan net seller earning.
         */
        const transactionValue =
          sellerTransaction
            ? Number(
                sellerTransaction.net_amount ??
                sellerTransaction.amount ??
                0
              )
            : null;
        const revenue =
          transactionValue !== null
            ? transactionValue
            : Number(
                order.amount || 0
              ) * 0.70;
        saleRows.push({
          id:
            `order:${orderId}`,
          source:
            'order',
          type:
            getOrderType(
              order
            ),
          date:
            order.paid_at ||
            order.created_at,
          revenue
        });
      }
    );
    /*
     * 2. STANDALONE SALE TRANSACTIONS
     */
    scopedDirectTransactions.forEach(
      (transaction) => {
        saleRows.push({
          id:
            `transaction:${transaction.id}`,
          source:
            'transaction',
          type:
            normalizeSaleType(
              transaction.type
            ),
          date:
            transaction.created_at,
          revenue:
            Number(
              transaction.net_amount ??
              transaction.amount ??
              0
            )
        });
      }
    );
    /* =====================================================
       SALES TOTAL
       ===================================================== */
    const totalSales =
      saleRows.length;
    const totalRevenue =
      saleRows.reduce(
        (
          total,
          sale
        ) =>
          total +
          Number(
            sale.revenue || 0
          ),
        0
      );
    if ($('sales')) {
      $('sales').textContent =
        number(
          totalSales
        );
    }
    if (
      $('detailSales')
    ) {
      $('detailSales').textContent =
        number(
          totalSales
        );
    }
    if ($('revenue')) {
      $('revenue').textContent =
        money(
          totalRevenue
        );
    }
    if (
      $('detailRevenue')
    ) {
      $('detailRevenue').textContent =
        money(
          totalRevenue
        );
    }

    /* =====================================================
       FINANCE OVERVIEW
       Canonical wallet fields:
       balance / available_balance / pending_balance.
       ===================================================== */
    const wallet =
      walletResult?.data || null;

    const profileBalance =
      Number(
        profile?.balance || 0
      );

    const availableBalance =
      Number(
        wallet?.available_balance ??
        profileBalance
      );

    const pendingBalance =
      Number(
        wallet?.pending_balance ??
        Math.max(
          0,
          Number(
            wallet?.balance ??
            profileBalance
          ) -
          availableBalance
        )
      );

    const nowLocal =
      new Date();

    const isSameLocalDay = (
      value
    ) => {
      const date =
        safeDate(value);
      if (!date) {
        return false;
      }
      return (
        date.getFullYear() ===
          nowLocal.getFullYear() &&
        date.getMonth() ===
          nowLocal.getMonth() &&
        date.getDate() ===
          nowLocal.getDate()
      );
    };

    const isSameLocalMonth = (
      value
    ) => {
      const date =
        safeDate(value);
      if (!date) {
        return false;
      }
      return (
        date.getFullYear() ===
          nowLocal.getFullYear() &&
        date.getMonth() ===
          nowLocal.getMonth()
      );
    };

    const todayRevenue =
      saleRows.reduce(
        (
          total,
          sale
        ) =>
          total +
          (
            isSameLocalDay(
              sale.date
            )
              ? Number(
                  sale.revenue || 0
                )
              : 0
          ),
        0
      );

    const monthRevenue =
      saleRows.reduce(
        (
          total,
          sale
        ) =>
          total +
          (
            isSameLocalMonth(
              sale.date
            )
              ? Number(
                  sale.revenue || 0
                )
              : 0
          ),
        0
      );

    if ($('pendingBalance')) {
      $('pendingBalance').textContent =
        money(
          Math.max(
            0,
            pendingBalance
          )
        );
    }

    if ($('availableBalance')) {
      $('availableBalance').textContent =
        money(
          Math.max(
            0,
            availableBalance
          )
        );
    }

    if ($('todayRevenue')) {
      $('todayRevenue').textContent =
        money(
          todayRevenue
        );
    }

    if ($('monthRevenue')) {
      $('monthRevenue').textContent =
        money(
          monthRevenue
        );
    }

    /* =====================================================
       INTERACTIONS
       ===================================================== */
    const countEvent =
      (type) =>
        scopedEvents.filter(
          (event) =>
            normalize(
              event.event_type
            ) ===
            normalize(type)
        ).length;
    const likeCount =
      Number(
        likesResult.count || 0
      );
    const followerCount =
      Number(
        followsResult.count || 0
      );
    const shareCount =
      countEvent(
        'share'
      );
    if (
      $('interactions')
    ) {
      const items = [
        {
          icon:
            'fa-eye',
          label:
            'Views',
          value:
            totalViews,
          color:
            'blue'
        },
        {
          icon:
            'fa-heart',
          label:
            'Like',
          value:
            likeCount,
          color:
            'pink'
        },
        {
          icon:
            'fa-share-nodes',
          label:
            'Share',
          value:
            shareCount,
          color:
            'violet'
        },
        {
          icon:
            'fa-user-plus',
          label:
            'Follower',
          value:
            followerCount,
          color:
            'green'
        }
      ];
      $('interactions').innerHTML =
        items
          .map(
            (item) => `
              <div
                class="circle-stat ${esc(
                  item.color
                )}"
              >
                <div class="circle">
                  <i
                    class="fa-solid ${esc(
                      item.icon
                    )}"
                    aria-hidden="true"
                  ></i>
                </div>
                <strong>
                  ${number(
                    item.value
                  )}
                </strong>
                <span>
                  ${esc(
                    item.label
                  )}
                </span>
              </div>
            `
          )
          .join('');
    }
    /* =====================================================
       CHART DATA
       ===================================================== */
    const chartData = {};
    currentDays.forEach(
      (day) => {
        chartData[
          dateKey(day)
        ] = {
          views:
            0,
          sales:
            0,
          share:
            0,
          revenue:
            0
        };
      }
    );
    const previousData = {
      views:
        0,
      sales:
        0,
      share:
        0,
      revenue:
        0
    };
    /* =====================================================
       EVENTS -> CURRENT / PREVIOUS
       ===================================================== */
    for (
      const event of scopedEvents
    ) {
      const date =
        safeDate(
          event.created_at
        );
      if (!date) {
        continue;
      }
      const key =
        dateKey(date);
      const type =
        normalize(
          event.event_type
        );
      /*
       * CURRENT
       */
      if (
        currentDayKeys.has(
          key
        )
      ) {
        if (
          type === 'view'
        ) {
          chartData[
            key
          ].views++;
        }
        if (
          type === 'share'
        ) {
          chartData[
            key
          ].share++;
        }
      }
      /*
       * PREVIOUS
       */
      if (
        previousDayKeys.has(
          key
        )
      ) {
        if (
          type === 'view'
        ) {
          previousData.views++;
        }
        if (
          type === 'share'
        ) {
          previousData.share++;
        }
      }
    }
    /* =====================================================
       SALES -> CURRENT / PREVIOUS
       ===================================================== */
    saleRows.forEach(
      (sale) => {
        const date =
          safeDate(
            sale.date
          );
        if (!date) {
          return;
        }
        const key =
          dateKey(date);
        if (
          currentDayKeys.has(
            key
          )
        ) {
          chartData[
            key
          ].sales++;
          chartData[
            key
          ].revenue +=
            Number(
              sale.revenue || 0
            );
        }
        if (
          previousDayKeys.has(
            key
          )
        ) {
          previousData.sales++;
          previousData.revenue +=
            Number(
              sale.revenue || 0
            );
        }
      }
    );
    /* =====================================================
       CURRENT PERIOD
       ===================================================== */
    const currentData = {
      views:
        0,
      sales:
        0,
      share:
        0,
      revenue:
        0
    };
    currentDays.forEach(
      (day) => {
        const item =
          chartData[
            dateKey(day)
          ] || {};
        currentData.views +=
          Number(
            item.views || 0
          );
        currentData.sales +=
          Number(
            item.sales || 0
          );
        currentData.share +=
          Number(
            item.share || 0
          );
        currentData.revenue +=
          Number(
            item.revenue || 0
          );
      }
    );
    /* =====================================================
       TRENDS
       ===================================================== */
    const viewsTrend =
      calculateTrend(
        currentData.views,
        previousData.views
      );
    const salesTrend =
      calculateTrend(
        currentData.sales,
        previousData.sales
      );
    const shareTrend =
      calculateTrend(
        currentData.share,
        previousData.share
      );
    const revenueTrend =
      calculateTrend(
        currentData.revenue,
        previousData.revenue
      );
    /* =====================================================
       TREND IDS
       ===================================================== */
    renderTrend(
      'performanceViewsTrend',
      viewsTrend
    );
    renderTrend(
      'performanceSalesTrend',
      salesTrend
    );
    renderTrend(
      'performanceShareTrend',
      shareTrend
    );
    renderTrend(
      'performanceRevenueTrend',
      revenueTrend
    );
    renderTrend(
      'revenueTrendChange',
      revenueTrend
    );
    /* =====================================================
       PERFORMANCE SNAPSHOT
       ===================================================== */
    performanceSnapshot.views = {
      label:
        'Views',
      value:
        currentData.views,
      trend:
        viewsTrend
    };
    performanceSnapshot.sales = {
      label:
        'Sales',
      value:
        currentData.sales,
      trend:
        salesTrend
    };
    performanceSnapshot.share = {
      label:
        'Share',
      value:
        currentData.share,
      trend:
        shareTrend
    };
    performanceSnapshot.revenue = {
      label:
        'Revenue',
      value:
        currentData.revenue,
      trend:
        revenueTrend
    };
    /* =====================================================
       PERFORMANCE VALUES
       ===================================================== */
    if (
      $('performanceViews')
    ) {
      $('performanceViews').textContent =
        number(
          currentData.views
        );
    }
    if (
      $('performanceSales')
    ) {
      $('performanceSales').textContent =
        number(
          currentData.sales
        );
    }
    if (
      $('performanceShare')
    ) {
      $('performanceShare').textContent =
        number(
          currentData.share
        );
    }
    if (
      $('performanceRevenue')
    ) {
      $('performanceRevenue').textContent =
        money(
          currentData.revenue
        );
    }
    /* =====================================================
       PERFORMANCE PERIOD
       ===================================================== */
    const firstDay =
      currentDays[0];
    const lastDay =
      currentDays[
        currentDays.length - 1
      ];
    if (
      $('performancePeriod')
    ) {
      $('performancePeriod').textContent =
        `${firstDay.toLocaleDateString(
          'id-ID',
          {
            day:
              '2-digit',
            month:
              'short'
          }
        )} – ${lastDay.toLocaleDateString(
          'id-ID',
          {
            day:
              '2-digit',
            month:
              'short',
            year:
              'numeric'
          }
        )}`;
    }
    if (
      $('periodBadge')
    ) {
      $('periodBadge').textContent =
        '7 Hari';
    }
    /* =====================================================
       PERFORMANCE META
       ===================================================== */
    const performanceMeta =
      document.querySelector(
        '.performance-meta'
      );
    if (
      performanceMeta
    ) {
      const metaItems =
        performanceMeta.querySelectorAll(
          '.performance-meta-item'
        );
      if (
        metaItems[0]
      ) {
        const span =
          metaItems[0]
            .querySelector(
              'span'
            );
        if (span) {
          span.textContent =
            `Dibandingkan ${previousDays[0].toLocaleDateString(
              'id-ID',
              {
                day:
                  '2-digit',
                month:
                  'short'
              }
            )} – ${previousDays[
              previousDays.length -
              1
            ].toLocaleDateString(
              'id-ID',
              {
                day:
                  '2-digit',
                month:
                  'short',
                year:
                  'numeric'
              }
            )}`;
        }
      }
      if (
        metaItems[1]
      ) {
        const span =
          metaItems[1]
            .querySelector(
              'span'
            );
        if (span) {
          span.textContent =
            `Trend otomatis · ${revenueTrend.label}`;
        }
      }
    }
    /* =====================================================
       REVENUE TREND
       ===================================================== */
    if (
      $('revenueTrendValue')
    ) {
      $('revenueTrendValue').textContent =
        money(
          currentData.revenue
        );
    }
    /* =====================================================
       REVENUE BARS
       ===================================================== */
    if (
      $('revenueBars')
    ) {
      const maxRevenue =
        Math.max(
          1,
          ...currentDays.map(
            (day) =>
              Number(
                chartData[
                  dateKey(day)
                ]?.revenue ||
                0
              )
          )
        );
      $('revenueBars').innerHTML =
        currentDays
          .map(
            (day) => {
              const key =
                dateKey(day);
              const item =
                chartData[
                  key
                ] || {};
              const revenue =
                Number(
                  item.revenue ||
                  0
                );
              const height =
                revenue > 0
                  ? Math.max(
                      3,
                      (
                        revenue /
                        maxRevenue
                      ) * 100
                    )
                  : 2;
              return `
                <div
                  class="revenue-bar"
                  data-date="${esc(
                    key
                  )}"
                  tabindex="0"
                  role="button"
                  title="${esc(
                    `${formatDay(day)} — ${money(revenue)}`
                  )}"
                >
                  <i
                    style="height:${height}%"
                  ></i>
                  <small>
                    ${esc(
                      formatDay(day)
                        .split(' ')[0]
                    )}
                  </small>
                </div>
              `;
            }
          )
          .join('');
      $('revenueBars')
        .querySelectorAll(
          '.revenue-bar'
        )
        .forEach(
          (bar) => {
            const showRevenue =
              () => {
                const item =
                  chartData[
                    bar.dataset
                      .date
                  ] || {};
                toast(
                  `${formatDate(
                    bar.dataset.date
                  )} · Revenue ${money(
                    item.revenue ||
                    0
                  )}`,
                  'info'
                );
              };
            bar.addEventListener(
              'click',
              showRevenue
            );
            bar.addEventListener(
              'keydown',
              (event) => {
                if (
                  event.key ===
                    'Enter' ||
                  event.key ===
                    ' '
                ) {
                  event.preventDefault();
                  showRevenue();
                }
              }
            );
          }
        );
    }
    /* =====================================================
       MAIN CHART
       ===================================================== */
    renderChart(
      chartData
    );
    /* =====================================================
       FOLLOWERS
       ===================================================== */
    if (
      $('followerTotal')
    ) {
      $('followerTotal').textContent =
        number(
          followerCount
        );
    }
    /*
     * SQL profiles memang punya country,
     * tetapi creator_followers hanya menyimpan
     * creator_id + follower_id.
     *
     * Tidak melakukan nested relation yang
     * belum tentu tersedia.
     */
    if (
      $('followerCountries')
    ) {
      if (
        followerCount > 0
      ) {
        $('followerCountries').innerHTML = `
          <div class="empty">
            <i class="fa-solid fa-users"></i>
            <span>
              ${number(
                followerCount
              )}
              pengikut tercatat.
            </span>
          </div>
        `;
      } else {
        $('followerCountries').innerHTML = `
          <div class="empty">
            <i class="fa-solid fa-user-plus"></i>
            <span>
              Belum ada pengikut.
            </span>
          </div>
        `;
      }
    }
    if (
      $('followerDonut')
    ) {
      $('followerDonut').style.background =
        followerCount > 0
          ? 'conic-gradient(#229ed9 0 100%)'
          : 'conic-gradient(#dfe7ec 0 100%)';
    }
    /* =====================================================
       RECENT CONTENT
       ===================================================== */
    const recentRows = [
      /*
       * PRODUCTS
       */
      ...filteredProducts.map(
        (item) => ({
          id:
            item.id,
          slug:
            item.slug,
          title:
            item.title ||
            'Untitled',
          type:
            item.type ||
            'link',
          access_type:
            item.access_type ||
            (Number(item.price || 0) > 0 ? 'paid' : 'free'),
          icon:
            normalize(
              item.type
            ) === 'code'
              ? 'fa-code'
              : 'fa-link',
          date:
            item.created_at,
          views:
            Number(
              item.views || 0
            ),
          price:
            Number(
              item.price || 0
            )
        })
      ),
      /*
       * PASTES
       */
      ...filteredPastes.map(
        (item) => ({
          id:
            item.id,
          slug:
            item.slug,
          title:
            item.title ||
            item.slug ||
            'Paste',
          type:
            'paste',
          icon:
            'fa-file-lines',
          date:
            item.created_at,
          views:
            0,
          price:
            0
        })
      ),
      /*
       * PASTELINKS
       */
      ...filteredPastelinks.map(
        (item) => ({
          id:
            item.id,
          slug:
            item.slug,
          title:
            item.title ||
            item.slug ||
            'PasteLink',
          type:
            'pastelink',
          icon:
            'fa-link',
          date:
            item.created_at,
          views:
            Number(
              item.views || 0
            ),
          price:
            0
        })
      ),
      /*
       * TELEGRAM PRODUCTS
       */
      ...filteredCodes.map(
        (item) => ({
          id:
            item.id,
          slug:
            item.slug,
          title:
            item.title ||
            'Code',
          type:
            item.product_type ||
            item.type ||
            'code',
          access_type:
            item.access_type ||
            (Number(item.price || 0) > 0 ? 'paid' : 'free'),
          icon:
            'fa-code',
          date:
            item.created_at,
          views:
            Number(
              item.views || 0
            ),
          price:
            Number(
              item.price || 0
            )
        })
      ),
      /*
       * TELEGRAM CHANNELS
       */
      ...filteredChannels.map(
        (item) => ({
          id:
            item.id,
          slug:
            item.slug ||
            item.username,
          title:
            item.name ||
            item.username ||
            'Telegram',
          type:
            item.type ||
            'channel',
          access_type:
            item.access_type ||
            (Number(item.price || 0) > 0 ? 'paid' : 'free'),
          icon:
            normalize(
              item.type
            ) === 'group'
              ? 'fa-users'
              : 'fa-broadcast-tower',
          date:
            item.created_at,
          views:
            Number(
              item.views || 0
            ),
          price:
            Number(
              item.price || 0
            )
        })
      )
    ].sort(
      (a, b) => {
        const dateA =
          safeDate(
            a.date
          )?.getTime() ||
          0;
        const dateB =
          safeDate(
            b.date
          )?.getTime() ||
          0;
        return (
          dateB -
          dateA
        );
      }
    );
    const recentPageSize = 10;
    let recentPage =
      1;
    const renderRecent =
      () => {
        const totalPages =
          Math.max(
            1,
            Math.ceil(
              recentRows.length /
                recentPageSize
            )
          );
        recentPage =
          Math.min(
            recentPage,
            totalPages
          );
        const start =
          (
            recentPage -
            1
          ) *
          recentPageSize;
        const rows =
          recentRows.slice(
            start,
            start +
              recentPageSize
          );
        if (
          $('recentLinks')
        ) {
          $('recentLinks').innerHTML =
            rows.length
              ? rows
                  .map(
                    (item) => {
                      const slug = String(item.slug || '').trim();
                      const id = String(item.id || '').trim();
                      let href = '';
                      const type = normalize(item.type);
                      const access = String(item.access_type || (Number(item.price || 0) > 0 ? 'paid' : 'free')).toLowerCase() === 'paid' ? 'p' : 'f';
                      if (type === 'paste') {
                        href = slug ? `/paste/${encodeURIComponent(slug)}` : '';
                      } else if (type === 'pastelink') {
                        href = slug ? `/p/${encodeURIComponent(slug)}` : '';
                      } else if (type === 'code') {
                        href = slug ? `/c/${access}/${encodeURIComponent(slug)}` : (id ? `product.html?id=${encodeURIComponent(id)}&type=code` : '');
                      } else if (type === 'channel') {
                        href = slug ? `/ch/${access}/${encodeURIComponent(slug)}` : (id ? `product.html?id=${encodeURIComponent(id)}&type=channel` : '');
                      } else if (type === 'group') {
                        href = slug ? `/g/${access}/${encodeURIComponent(slug)}` : (id ? `product.html?id=${encodeURIComponent(id)}&type=group` : '');
                      } else if (id) {
                        href = `product.html?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`;
                      }
                      const tag = href ? 'a' : 'div';
                      const hrefAttr = href ? ` href="${esc(href)}" aria-label="Buka ${esc(item.title || 'konten')}"` : '';
                      return `
                      <${tag} class="recent-item${href ? ' is-clickable' : ''}"${hrefAttr}>
                        <span class="recent-icon">
                          <i
                            class="fa-solid ${esc(
                              item.icon
                            )}"
                            aria-hidden="true"
                          ></i>
                        </span>
                        <div>
                          <b>
                            ${esc(
                              item.title
                            )}
                          </b>
                          <small>
                            ${esc(
                              String(
                                item.type ||
                                'content'
                              )
                            )}
                            ·
                            ${esc(
                              formatDate(
                                item.date
                              )
                            )}
                          </small>
                        </div>
                        <strong>
                          ${
                            item.price >
                            0
                              ? esc(
                                  money(
                                    item.price
                                  )
                                )
                              : `${number(
                                  item.views
                                )} views`
                          }
                        </strong>
                      </${tag}>
                    `;
                    }
                  )
                  .join('')
              : `
                  <div class="empty">
                    <i class="fa-solid fa-box-open"></i>
                    <span>
                      Belum ada konten.
                    </span>
                  </div>
                `;
        }
        renderPager(
          'recentPagination',
          recentPage,
          totalPages,
          (page) => {
            recentPage =
              page;
            renderRecent();
          }
        );
      };
    renderRecent();
    /* =====================================================
       ACTIVITY
       ===================================================== */
    const activityEvents =
      scopedEvents.map(
        (event) => ({
          type:
            normalize(
              event.event_type
            ) ||
            'activity',
          date:
            event.created_at
        })
      );
    const orderActivities =
      scopedOrders.map(
        (order) => ({
          type:
            'paid',
          date:
            order.paid_at ||
            order.created_at
        })
      );
    const transactionActivities =
      scopedDirectTransactions.map(
        (transaction) => ({
          type:
            'sale',
          date:
            transaction.created_at
        })
      );
    const activities = [
      ...activityEvents,
      ...orderActivities,
      ...transactionActivities
    ].sort(
      (a, b) => {
        const dateA =
          safeDate(
            a.date
          )?.getTime() ||
          0;
        const dateB =
          safeDate(
            b.date
          )?.getTime() ||
          0;
        return (
          dateB -
          dateA
        );
      }
    );
    const activityIcon = (
      type
    ) => {
      switch (
        normalize(type)
      ) {
        case 'view':
          return 'fa-eye';
        case 'like':
          return 'fa-heart';
        case 'share':
          return 'fa-share-nodes';
        case 'follow':
          return 'fa-user-plus';
        case 'paid':
        case 'sale':
          return 'fa-cart-shopping';
        case 'click':
          return 'fa-arrow-pointer';
        case 'download':
          return 'fa-download';
        case 'purchase':
          return 'fa-bag-shopping';
        default:
          return 'fa-bolt';
      }
    };
    const activityLabel = (
      type
    ) => {
      switch (
        normalize(type)
      ) {
        case 'view':
          return 'VIEW';
        case 'like':
          return 'LIKE';
        case 'share':
          return 'SHARE';
        case 'follow':
          return 'FOLLOW';
        case 'paid':
          return 'PAID';
        case 'sale':
          return 'SALE';
        case 'click':
          return 'CLICK';
        case 'download':
          return 'DOWNLOAD';
        case 'purchase':
          return 'PURCHASE';
        default:
          return String(
            type ||
            'ACTIVITY'
          ).toUpperCase();
      }
    };
    const activityPageSize = 10;
    let activityPage =
      1;
    const renderActivity =
      () => {
        const totalPages =
          Math.max(
            1,
            Math.ceil(
              activities.length /
                activityPageSize
            )
          );
        activityPage =
          Math.min(
            activityPage,
            totalPages
          );
        const start =
          (
            activityPage -
            1
          ) *
          activityPageSize;
        const rows =
          activities.slice(
            start,
            start +
              activityPageSize
          );
        if (
          $('activity')
        ) {
          $('activity').innerHTML =
            rows.length
              ? rows
                  .map(
                    (item) => `
                      <div class="activity-row">
                        <span>
                          <i
                            class="fa-solid ${esc(
                              activityIcon(
                                item.type
                              )
                            )}"
                            aria-hidden="true"
                          ></i>
                        </span>
                        <div>
                          <b>
                            ${esc(
                              activityLabel(
                                item.type
                              )
                            )}
                          </b>
                          <small>
                            ${esc(
                              formatDateTime(
                                item.date
                              )
                            )}
                          </small>
                        </div>
                      </div>
                    `
                  )
                  .join('')
              : `
                  <div class="empty">
                    <i class="fa-solid fa-clock"></i>
                    <span>
                      Belum ada aktivitas.
                    </span>
                  </div>
                `;
        }
        renderPager(
          'activityPagination',
          activityPage,
          totalPages,
          (page) => {
            activityPage =
              page;
            renderActivity();
          }
        );
      };
    renderActivity();
    /* =====================================================
       PERFORMANCE CLICK
       ===================================================== */
    document
      .querySelectorAll(
        '[data-performance]'
      )
      .forEach(
        (element) => {
          /*
           * Hindari listener dobel
           * saat scope berubah.
           */
          if (
            element.dataset
              .dashboardBound ===
            'true'
          ) {
            return;
          }
          element.dataset
            .dashboardBound =
            'true';
          element.addEventListener(
            'click',
            () => {
              const key =
                element.dataset
                  .performance;
              const item =
                performanceSnapshot[
                  key
                ];
              if (!item) {
                return;
              }
              const value =
                key ===
                'revenue'
                  ? money(
                      item.value
                    )
                  : number(
                      item.value
                    );
              toast(
                `${item.label}: ${value} · Performa ${item.trend?.label || '0%'}`,
                item.trend
                  ?.direction ===
                  'down'
                  ? 'error'
                  : 'success'
              );
            }
          );
        }
      );
  }
  /* =======================================================
     SCOPE CHANGE
     ======================================================= */
  const scopeElement =
    $('scope');
  if (
    scopeElement
  ) {
    scopeElement.addEventListener(
      'change',
      async () => {
        try {
          await load();
        } catch (
          error
        ) {
          console.error(
            'Dashboard scope error:',
            error
          );
          toast(
            error?.message ||
              'Dashboard gagal dimuat.',
            'error'
          );
        }
      }
    );
  }
  /* =======================================================
     INITIAL LOAD
     ======================================================= */
  try {
    await load();
  } catch (
    error
  ) {
    console.error(
      'Dashboard load error:',
      error
    );
    if (
      $('created')
    ) {
      $('created').textContent =
        '0';
    }
    if (
      $('views')
    ) {
      $('views').textContent =
        '0';
    }
    if (
      $('sales')
    ) {
      $('sales').textContent =
        '0';
    }
    if (
      $('revenue')
    ) {
      $('revenue').textContent =
        money(0);
    }
    if (
      $('recentLinks')
    ) {
      $('recentLinks').innerHTML = `
        <div class="empty">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>
            Dashboard gagal dimuat.
          </span>
        </div>
      `;
    }
    if (
      $('activity')
    ) {
      $('activity').innerHTML = `
        <div class="empty">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>
            ${esc(
              error?.message ||
              'Terjadi kesalahan saat mengambil data.'
            )}
          </span>
        </div>
      `;
    }
    toast(
      error?.message ||
        'Dashboard gagal dimuat.',
      'error'
    );
  }
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
  const sb = () => window.sb || window.supabaseClient || null;
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
    group=q.data; let chatReason=''; try{const sr=await client.rpc('get_public_site_settings'); chatReason=String(sr?.data?.forum_chat?.reason||'').trim()}catch{} $('#ptChatTitle').textContent=group.name; $('#ptChatStatus').textContent=group.is_public===false ? ('Ditutup oleh admin'+(chatReason?' · '+chatReason:'')) : (group.description||'Forum & Group Chat'); if(group.is_public===false){$('#ptChatMessages').innerHTML='<div class="pt-chat-empty"><i class="fa-solid fa-lock"></i><br>Forum Group Chat sedang ditutup oleh admin.'+(chatReason?'<br><small>'+esc(chatReason)+'</small>':'')+'</div>'; $('#ptChatSend')?.setAttribute('disabled','disabled'); return;}
    if(me){try{await client.rpc('join_public_chat',{p_group_id:group.id});await client.rpc('set_chat_presence',{p_group_id:group.id,p_online:true});}catch{}}
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
    const attach=()=>{document.querySelectorAll('#ptForumTrigger').forEach(b=>{if(b.dataset.chatBound)return;b.dataset.chatBound='1';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open()})})};
    attach();new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
