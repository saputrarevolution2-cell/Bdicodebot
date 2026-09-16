/* PasTele — self-contained my-products page script. One HTML -> one JS -> one CSS. */
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

/* =========================================================
   PasTele — My Products
   FINAL SQL SYNC
   CLEAN UI / COMPACT
   DATABASE:
     products
     pastelinks
     telegram_products
     telegram_channels
   IMPORTANT:
   - No schema changes.
   - Uses real SQL FINAL columns.
   - No legacy_published_flag.
   - products owner = creator_id OR seller_id.
   - telegram_products owner = owner_id.
   - telegram_channels owner = owner_id.
   - pastelinks owner = user_id.
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    /* =====================================================
       DOM
       ===================================================== */
    const $ = (id) =>
        document.getElementById(id);
    const content =
        $("content");
    const searchInput =
        $("searchInput");
    const clearSearch =
        $("clearSearch");
    const typeFilter =
        $("typeFilter");
    const statusFilter =
        $("statusFilter");
    const refreshBtn =
        $("refreshBtn");
    const totalCount =
        $("totalCount");
    const publishedCount =
        $("publishedCount");
    const paidCount =
        $("paidCount");
    const draftCount =
        $("draftCount");
    const resultInfo =
        $("resultInfo");
    /* =====================================================
       GLOBALS
       ===================================================== */
    const TC =
        window.TC || {};
    const supabase =
        window.sb ||
        window.supabaseClient ||
        window.supabase ||
        null;
    /* =====================================================
       STATE
       ===================================================== */
    let profile = null;
    let groups = [];
    let allItems = [];
    let loading = false;
    /* =====================================================
       HELPERS
       ===================================================== */
    const esc = (value) => {
        const text =
            String(value ?? "");
        if (
            typeof TC.esc ===
            "function"
        ) {
            return TC.esc(text);
        }
        return text
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
    const showToast = (
        message,
        type = "error"
    ) => {
        if (
            typeof TC.toast ===
            "function"
        ) {
            TC.toast(
                message,
                type
            );
            return;
        }
        if (
            type === "error"
        ) {
            console.error(
                message
            );
        } else {
            console.log(
                message
            );
        }
    };
    const normalize = (
        value
    ) => {
        return String(
            value ?? ""
        )
            .trim()
            .toLowerCase();
    };
    /* =====================================================
       TYPE
       ===================================================== */
    const iconFor = (
        type
    ) => {
        const icons = {
            paste:
                "fa-file-lines",
            pastelink:
                "fa-link",
            code:
                "fa-code",
            channel:
                "fa-tower-broadcast",
            product:
                "fa-box"
        };
        return (
            icons[
                normalize(type)
            ] ||
            "fa-box"
        );
    };
    const labelFor = (
        type
    ) => {
        const labels = {
            paste:
                "Paste",
            pastelink:
                "PasteLink",
            code:
                "Code Telegram",
            channel:
                "Channel / Group",
            product:
                "Marketplace"
        };
        return (
            labels[
                normalize(type)
            ] ||
            "Product"
        );
    };
    const typeValue = (
        item,
        fallback
    ) => {
        return normalize(
            item?.type ||
            item?.product_type ||
            fallback ||
            ""
        );
    };
    const titleOf = (
        item
    ) => {
        return String(
            item?.title ||
            item?.name ||
            item?.slug ||
            "Untitled"
        ).trim();
    };
    const descriptionOf = (
        item
    ) => {
        return String(
            item?.description ||
            ""
        ).trim();
    };
    const dateOf = (
        item
    ) => {
        if (
            !item?.created_at
        ) {
            return "Tanggal tidak tersedia";
        }
        const date =
            new Date(
                item.created_at
            );
        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Tanggal tidak tersedia";
        }
        return date.toLocaleDateString(
            "id-ID",
            {
                day:
                    "2-digit",
                month:
                    "short",
                year:
                    "numeric"
            }
        );
    };
    /* =====================================================
       STATUS
       =====================================================
       SQL FINAL menggunakan:
         status = draft
         status = published
         status = active
       Tidak menggunakan legacy_published_flag.
       */
    const statusOf = (
        item
    ) => {
        const status =
            normalize(
                item?.status
            );
        const price =
            Number(
                item?.price || 0
            );
        /*
         * Draft selalu draft.
         */
        if (
            status === "draft"
        ) {
            return {
                value:
                    "draft",
                label:
                    "Draft",
                icon:
                    "fa-file-pen"
            };
        }
        /*
         * Explicit inactive states.
         */
        if (
            status === "inactive" ||
            status === "disabled" ||
            status === "archived"
        ) {
            return {
                value:
                    "draft",
                label:
                    "Inactive",
                icon:
                    "fa-circle-pause"
            };
        }
        /*
         * Paid ditentukan dari harga.
         *
         * Hanya konten yang sudah published/active
         * dianggap published/paid.
         */
        if (
            status === "published" ||
            status === "active"
        ) {
            if (
                Number.isFinite(
                    price
                ) &&
                price > 0
            ) {
                return {
                    value:
                        "paid",
                    label:
                        "Paid",
                    icon:
                        "fa-tag"
                };
            }
            return {
                value:
                    "published",
                label:
                    "Published",
                icon:
                    "fa-circle-check"
            };
        }
        /*
         * Fallback:
         * produk lama tanpa status valid
         * dianggap draft agar tidak salah
         * tampil sebagai produk publik.
         */
        return {
            value:
                "draft",
            label:
                "Draft",
            icon:
                "fa-file-pen"
        };
    };
    /* =====================================================
       URL
       ===================================================== */
    const hrefFor = (
        item,
        type
    ) => {
        if (!item) {
            return "#";
        }
        /*
         * PasteLink
         */
        if (type === "pastelink") {
            if (!item.slug) return "#";
            return `${location.origin}/p/` + encodeURIComponent(item.slug);
        }
        if (type === "paste") {
            if (!item.slug) return "#";
            return `${location.origin}/paste/` + encodeURIComponent(item.slug);
        }
        /*
         * Telegram products/channels
         */
        if (
            type === "code" ||
            type === "channel"
        ) {
            if (
                !item.slug
            ) {
                return "#";
            }
            let prefix =
                "c";
            if (
                type === "channel"
            ) {
                /*
                 * telegram_channels.type
                 * berasal dari schema SQL.
                 */
                const channelType =
                    normalize(
                        item?.type
                    );
                prefix =
                    channelType ===
                    "group"
                        ? "g"
                        : "ch";
            }
            const access =
                normalize(
                    item?.access_type
                ) === "paid"
                        ? "p"
                        : "f";
            return (
                `${location.origin}/${prefix}/${access}/` +
                encodeURIComponent(
                    item.slug
                )
            );
        }
        /*
         * Marketplace products
         */
        if (
            item.id ===
                undefined ||
            item.id ===
                null ||
            item.id === ""
        ) {
            return "#";
        }
        return (
            `${location.origin}/product.html` +
            `?id=${encodeURIComponent(
                item.id
            )}` +
            `&type=${encodeURIComponent(
                item.type ||
                item.product_type ||
                type
            )}`
        );
    };
    /* =====================================================
       FIND ITEM
       ===================================================== */
    const findItem = (
        id,
        type
    ) => {
        const normalizedId =
            String(
                id ?? ""
            );
        const normalizedType =
            normalize(type);
        return allItems.find(
            (entry) => {
                return (
                    String(
                        entry?.id ??
                        ""
                    ) ===
                        normalizedId &&
                    normalize(
                        entry?.__type
                    ) ===
                        normalizedType
                );
            }
        );
    };
    /* =====================================================
       PRICE
       ===================================================== */
    const formatPrice = (
        price
    ) => {
        const value =
            Number(
                price || 0
            );
        if (
            !Number.isFinite(
                value
            ) ||
            value <= 0
        ) {
            return null;
        }
        return new Intl.NumberFormat(
            "id-ID",
            {
                style:
                    "currency",
                currency:
                    "IDR",
                maximumFractionDigits:
                    0
            }
        ).format(
            value
        );
    };
    /* =====================================================
       LOADING
       ===================================================== */
    const renderLoading = () => {
        if (!content) {
            return;
        }
        content.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i
                        class="fa-solid fa-spinner fa-spin"
                        aria-hidden="true"
                    ></i>
                </div>
                <strong>
                    Memuat produk...
                </strong>
                <span>
                    Mengambil data terbaru dari database.
                </span>
            </div>
        `;
        if (resultInfo) {
            resultInfo.textContent =
                "Memuat produk...";
        }
    };
    /* =====================================================
       ERROR
       ===================================================== */
    const renderError = (
        message
    ) => {
        if (!content) {
            return;
        }
        content.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon">
                    <i
                        class="fa-solid fa-triangle-exclamation"
                        aria-hidden="true"
                    ></i>
                </div>
                <strong>
                    Gagal memuat produk
                </strong>
                <span>
                    ${esc(
                        message ||
                        "Terjadi kesalahan saat mengambil data."
                    )}
                </span>
                <button
                    class="btn primary"
                    id="retryBtn"
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
        if (resultInfo) {
            resultInfo.textContent =
                "Gagal memuat data.";
        }
        $("retryBtn")
            ?.addEventListener(
                "click",
                loadData
            );
    };
    /* =====================================================
       LOAD DATA
       ===================================================== */
    async function loadData() {
        if (loading) {
            return;
        }
        loading = true;
        renderLoading();
        if (refreshBtn) {
            refreshBtn.disabled =
                true;
            refreshBtn.classList.add(
                "is-loading"
            );
        }
        try {
            if (!supabase) {
                throw new Error(
                    "Supabase belum tersedia."
                );
            }
            /*
             * PROFILE
             */
            if (
                typeof TC.profile !==
                "function"
            ) {
                throw new Error(
                    "TC.profile() tidak tersedia."
                );
            }
            profile =
                await TC.profile();
            if (!profile) {
                location.replace(
                    "login.html"
                );
                return;
            }
            /*
             * =================================================
             * LOAD 4 CONTENT TYPES
             * =================================================
             */
            const [
                productsResponse,
                pasteResponse,
                plainPasteResponse,
                codeResponse,
                channelResponse
            ] =
                await Promise.all([
                    /*
                     * PRODUCTS
                     *
                     * SQL:
                     * creator_id
                     * seller_id
                     */
                    supabase
                        .from(
                            "products"
                        )
                        .select(
                            [
                                "id",
                                "seller_id",
                                "creator_id",
                                "title",
                                "slug",
                                "price",
                                "thumbnail_url",
                                "type",
                                "access_type",
                                "category",
                                "description",
                                "views",
                                "sales_count",
                                "status",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .or(
                            `creator_id.eq.${profile.id},seller_id.eq.${profile.id}`
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        ),
                    /*
                     * PASTELINKS
                     *
                     * SQL:
                     * user_id
                     */
                    supabase
                        .from(
                            "pastelinks"
                        )
                        .select(
                            [
                                "id",
                                "user_id",
                                "slug",
                                "title",
                                "description",
                                "content_html",
                                "access_type",
                                "price",
                                "visibility",
                                "expires_at",
                                "views",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
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
                        ),
                    /*
                     * PLAIN PASTES
                     */
                    supabase
                        .from("pastes")
                        .select("id,owner_id,title,slug,content,visibility,created_at,updated_at")
                        .eq("owner_id", profile.id)
                        .order("created_at", {ascending:false}),
                    /*
                     * TELEGRAM PRODUCTS
                     *
                     * SQL:
                     * owner_id
                     * status
                     */
                    supabase
                        .from(
                            "telegram_products"
                        )
                        .select(
                            [
                                "id",
                                "owner_id",
                                "title",
                                "slug",
                                "type",
                                "product_type",
                                "access_type",
                                "bot_username",
                                "telegram_bot_id",
                                "price",
                                "description",
                                "thumbnail_url",
                                "category",
                                "status",
                                "views",
                                "sales_count",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        ),
                    /*
                     * TELEGRAM CHANNELS
                     *
                     * SQL:
                     * owner_id
                     * name
                     * type
                     * status
                     */
                    supabase
                        .from(
                            "telegram_channels"
                        )
                        .select(
                            [
                                "id",
                                "owner_id",
                                "username",
                                "name",
                                "type",
                                "access_type",
                                "telegram_channel_id",
                                "description",
                                "invite_url",
                                "price",
                                "category",
                                "status",
                                "views",
                                "sales_count",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        )
                ]);
            const responses = [
                productsResponse,
                pasteResponse,
                plainPasteResponse,
                codeResponse,
                channelResponse
            ];
            const failed =
                responses.find(
                    (response) =>
                        response?.error
                );
            if (
                failed?.error
            ) {
                throw failed.error;
            }
            /* =================================================
               NORMALIZE
               ================================================= */
            const productItems =
                (
                    productsResponse.data ||
                    []
                ).map(
                    (item) => ({
                        ...item,
                        __type:
                            "product"
                    })
                );
            const pasteLinkItems =
                (pasteResponse.data || []).map(item => ({...item,__type:"pastelink",price:0,access_type:"free",status:item.visibility === "public" ? "published" : item.visibility}));
            const pasteItems =
                (plainPasteResponse.data || []).map(item => ({...item,__type:"paste",price:0,access_type:"free",status:item.visibility === "public" ? "published" : item.visibility}));
            const codeItems =
                (
                    codeResponse.data ||
                    []
                ).map(
                    (item) => ({
                        ...item,
                        __type:
                            "code"
                    })
                );
            const channelItems =
                (
                    channelResponse.data ||
                    []
                ).map(
                    (item) => ({
                        ...item,
                        __type:
                            "channel"
                    })
                );
            /* =================================================
               GROUPS
               ================================================= */
            groups = [
                {
                    key:
                        "pastelink",
                    title:
                        "PasteLink",
                    icon:
                        "fa-link",
                    items:
                        pasteLinkItems
                },
                {
                    key:
                        "paste",
                    title:
                        "Paste",
                    icon:
                        "fa-file-lines",
                    items:
                        pasteItems
                },
                {
                    key:
                        "code",
                    title:
                        "Code Telegram",
                    icon:
                        "fa-code",
                    items:
                        codeItems
                },
                {
                    key:
                        "channel",
                    title:
                        "Channel / Group",
                    icon:
                        "fa-tower-broadcast",
                    items:
                        channelItems
                },
                {
                    key:
                        "product",
                    title:
                        "Marketplace Product",
                    icon:
                        "fa-box",
                    items:
                        productItems
                }
            ];
            allItems =
                groups.flatMap(
                    (group) =>
                        group.items
                );
            updateOverview();
            render();
        } catch (error) {
            console.error(
                "[My Products] Load error:",
                error
            );
            renderError(
                error?.message ||
                "Tidak dapat mengambil data dari database."
            );
        } finally {
            loading = false;
            if (refreshBtn) {
                refreshBtn.disabled =
                    false;
                refreshBtn.classList.remove(
                    "is-loading"
                );
            }
        }
    }
    /* =====================================================
       OVERVIEW
       ===================================================== */
    function updateOverview() {
        const total =
            allItems.length;
        const published =
            allItems.filter(
                (item) => {
                    const status =
                        normalize(
                            item?.status
                        );
                    return (
                        status ===
                            "published" ||
                        status ===
                            "active"
                    );
                }
            ).length;
        const paid =
            allItems.filter(
                (item) => {
                    const status =
                        normalize(
                            item?.status
                        );
                    const price =
                        Number(
                            item?.price ||
                            0
                        );
                    return (
                        (
                            status ===
                                "published" ||
                            status ===
                                "active"
                        ) &&
                        Number.isFinite(
                            price
                        ) &&
                        price > 0
                    );
                }
            ).length;
        const draft =
            allItems.filter(
                (item) =>
                    normalize(
                        item?.status
                    ) ===
                    "draft"
            ).length;
        if (totalCount) {
            totalCount.textContent =
                total;
        }
        if (publishedCount) {
            publishedCount.textContent =
                published;
        }
        if (paidCount) {
            paidCount.textContent =
                paid;
        }
        if (draftCount) {
            draftCount.textContent =
                draft;
        }
    }
    /* =====================================================
       FILTER
       ===================================================== */
    function getFilteredGroups() {
        const search =
            normalize(
                searchInput?.value
            );
        const selectedType =
            typeFilter?.value ||
            "all";
        const selectedStatus =
            statusFilter?.value ||
            "all";
        return groups.map(
            (group) => {
                const filtered =
                    group.items.filter(
                        (item) => {
                            const title =
                                normalize(
                                    titleOf(
                                        item
                                    )
                                );
                            const slug =
                                normalize(
                                    item?.slug
                                );
                            const description =
                                normalize(
                                    descriptionOf(
                                        item
                                    )
                                );
                            const name =
                                normalize(
                                    item?.name
                                );
                            const botUsername =
                                normalize(
                                    item?.bot_username
                                );
                            const username =
                                normalize(
                                    item?.username
                                );
                            const type =
                                typeValue(
                                    item,
                                    group.key
                                );
                            const status =
                                statusOf(
                                    item
                                ).value;
                            const matchesSearch =
                                !search ||
                                title.includes(
                                    search
                                ) ||
                                slug.includes(
                                    search
                                ) ||
                                description.includes(
                                    search
                                ) ||
                                name.includes(
                                    search
                                ) ||
                                botUsername.includes(
                                    search
                                ) ||
                                username.includes(
                                    search
                                ) ||
                                type.includes(
                                    search
                                );
                            const matchesType =
                                selectedType ===
                                    "all" ||
                                group.key ===
                                    selectedType;
                            const matchesStatus =
                                selectedStatus ===
                                    "all" ||
                                status ===
                                    selectedStatus;
                            return (
                                matchesSearch &&
                                matchesType &&
                                matchesStatus
                            );
                        }
                    );
                return {
                    ...group,
                    items:
                        filtered
                };
            }
        );
    }
    /* =====================================================
       MAIN RENDER
       ===================================================== */
    function render() {
        if (!content) {
            return;
        }
        const filteredGroups =
            getFilteredGroups();
        const visibleItems =
            filteredGroups.reduce(
                (
                    total,
                    group
                ) =>
                    total +
                    group.items.length,
                0
            );
        const search =
            String(
                searchInput?.value ||
                ""
            ).trim();
        const hasFilter =
            Boolean(search) ||
            (
                typeFilter?.value ||
                "all"
            ) !== "all" ||
            (
                statusFilter?.value ||
                "all"
            ) !== "all";
        if (resultInfo) {
            resultInfo.textContent =
                hasFilter
                    ? `${visibleItems} hasil ditemukan`
                    : `${allItems.length} konten tersedia`;
        }
        clearSearch?.classList.toggle(
            "hidden",
            !search
        );
        const sections =
            filteredGroups
                .filter(
                    (group) =>
                        group.items.length >
                        0
                )
                .map(
                    renderGroup
                )
                .join("");
        if (sections) {
            content.innerHTML =
                sections;
            bindActions();
            return;
        }
        const isEmptyDatabase =
            allItems.length === 0;
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i
                        class="fa-solid ${
                            isEmptyDatabase
                                ? "fa-box-open"
                                : "fa-magnifying-glass"
                        }"
                        aria-hidden="true"
                    ></i>
                </div>
                <strong>
                    ${
                        isEmptyDatabase
                            ? "Belum ada produk"
                            : "Produk tidak ditemukan"
                    }
                </strong>
                <span>
                    ${
                        isEmptyDatabase
                            ? "Buat PasteLink, Code Telegram, Channel, atau produk marketplace pertamamu."
                            : "Coba ubah kata kunci atau filter pencarian."
                    }
                </span>
                ${
                    isEmptyDatabase
                        ? `
                            <a
                                href="create-product.html"
                                class="btn primary"
                            >
                                <i
                                    class="fa-solid fa-plus"
                                    aria-hidden="true"
                                ></i>
                                Buat Produk
                            </a>
                        `
                        : `
                            <button
                                class="btn"
                                id="resetFilterBtn"
                                type="button"
                            >
                                <i
                                    class="fa-solid fa-filter-circle-xmark"
                                    aria-hidden="true"
                                ></i>
                                Reset Filter
                            </button>
                        `
                }
            </div>
        `;
        $("resetFilterBtn")
            ?.addEventListener(
                "click",
                resetFilters
            );
    }
    /* =====================================================
       RENDER GROUP
       ===================================================== */
    function renderGroup(group) {
        return `
            <section class="my-section">
                <div class="my-section-header">
                    <div class="my-section-title">
                        <span class="my-section-title-icon" aria-hidden="true">
                            <i class="fa-solid ${group.icon}"></i>
                        </span>
                        <div>
                            <h2>${esc(group.title)}</h2>
                            <span class="my-section-subtitle">Kelola konten ${esc(group.title)}</span>
                        </div>
                    </div>
                    <span class="my-section-count">${group.items.length}</span>
                </div>

                <div class="my-list">
                    ${group.items.map(item => {
                        const title = titleOf(item);
                        const status = statusOf(item);
                        const price = formatPrice(item?.price);
                        const slug = String(item?.slug || "").trim();
                        const description = descriptionOf(item);
                        const href = hrefFor(item, group.key);
                        const safeHref = href && href !== "#" ? href : "";
                        const typeLabel = labelFor(group.key);
                        const views = Number(item?.views ?? 0);
                        const sales = Number(item?.sales_count ?? 0);

                        let secondary = "";
                        if (group.key === "code") {
                            secondary = `
                                <div class="my-row-detail-grid">
                                    <div class="detail-chip">
                                        <i class="fa-solid fa-robot"></i>
                                        <span>Bot</span>
                                        <strong>${esc(item?.bot_username ? "@" + String(item.bot_username).replace(/^@/, "") : "Belum diatur")}</strong>
                                    </div>
                                    <div class="detail-chip">
                                        <i class="fa-solid fa-key"></i>
                                        <span>Code</span>
                                        <strong>${esc(slug || "Belum ada")}</strong>
                                    </div>
                                </div>`;
                        } else if (group.key === "pastelink") {
                            const expired = item?.expires_at
                                ? new Date(item.expires_at)
                                : null;
                            const expiredLabel = expired && !Number.isNaN(expired.getTime())
                                ? expired.toLocaleString("id-ID", {dateStyle:"medium", timeStyle:"short"})
                                : "Tidak expired";
                            secondary = `
                                <div class="my-row-detail-grid">
                                    <div class="detail-chip wide">
                                        <i class="fa-solid fa-file-code"></i>
                                        <span>Konten</span>
                                        <strong>${item?.content_html ? "Tersedia" : "Kosong"}</strong>
                                    </div>
                                    <div class="detail-chip">
                                        <i class="fa-solid fa-clock"></i>
                                        <span>Expired</span>
                                        <strong>${esc(expiredLabel)}</strong>
                                    </div>
                                </div>`;
                        } else if (group.key === "channel") {
                            secondary = `
                                <div class="my-row-detail-grid">
                                    <div class="detail-chip wide">
                                        <i class="fa-solid fa-link"></i>
                                        <span>Link Channel / Group</span>
                                        <strong>${esc(item?.invite_url || item?.username ? (item?.invite_url || "@" + String(item.username).replace(/^@/, "")) : "Belum diatur")}</strong>
                                    </div>
                                </div>`;
                        }

                        return `
                            <article class="my-row" data-product-type="${esc(group.key)}">
                                <div class="my-row-head">
                                    <span class="my-icon" aria-hidden="true">
                                        <i class="fa-solid ${iconFor(group.key)}"></i>
                                    </span>

                                    <div class="my-row-main">
                                        <div class="my-row-title-wrap">
                                            <h3 class="my-row-title" title="${esc(title)}">${esc(title)}</h3>
                                            <span class="status-badge status-${esc(status.value)}">
                                                <i class="fa-solid ${status.icon}" aria-hidden="true"></i>
                                                ${esc(status.label)}
                                            </span>
                                        </div>

                                        <div class="my-row-meta">
                                            <span class="meta-type"><i class="fa-solid ${iconFor(group.key)}"></i> ${esc(typeLabel)}</span>
                                            <span class="meta-dot">•</span>
                                            <span>${esc(dateOf(item))}</span>
                                            ${price ? `<span class="meta-dot">•</span><span class="meta-price">${esc(price)}</span>` : ""}
                                        </div>

                                        ${description ? `<div class="my-row-description">${esc(description)}</div>` : ""}
                                        ${secondary}

                                        ${safeHref ? `
                                            <div class="my-row-url-box">
                                                <div class="my-row-url-label">
                                                    <i class="fa-solid fa-globe"></i>
                                                    <span>Link lengkap</span>
                                                </div>
                                                <a class="my-row-url" href="${esc(safeHref)}" target="_blank" rel="noopener noreferrer" title="${esc(safeHref)}">
                                                    ${esc(safeHref)}
                                                </a>
                                            </div>` : ""}
                                    </div>
                                </div>

                                <div class="my-row-footer">
                                    <div class="my-row-stats">
                                        <span><i class="fa-solid fa-eye"></i> ${esc(String(views))} dilihat</span>
                                        <span><i class="fa-solid fa-bag-shopping"></i> ${esc(String(sales))} terjual</span>
                                    </div>

                                    <div class="my-row-actions">
                                        <button class="btn" type="button" data-action="open" data-id="${esc(item.id ?? "")}" data-type="${esc(group.key)}">
                                            <i class="fa-solid fa-arrow-up-right-from-square"></i><span>Buka</span>
                                        </button>
                                        <button class="btn" type="button" data-action="copy" data-id="${esc(item.id ?? "")}" data-type="${esc(group.key)}">
                                            <i class="fa-solid fa-copy"></i><span>Salin</span>
                                        </button>
                                        <button class="btn primary" type="button" data-action="edit" data-id="${esc(item.id ?? "")}" data-type="${esc(group.key)}">
                                            <i class="fa-solid fa-pen"></i><span>Edit</span>
                                        </button>
                                        <button class="btn danger" type="button" data-action="delete" data-id="${esc(item.id ?? "")}" data-type="${esc(group.key)}">
                                            <i class="fa-solid fa-trash"></i><span>Hapus</span>
                                        </button>
                                    </div>
                                </div>
                            </article>
                        `;
                    }).join("")}
                </div>
            </section>
        `;
    }
    /* =====================================================
       ACTION BINDING
       ===================================================== */
    function bindActions() {
        content
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        "click",
                        async (event) => {
                            /*
                             * Jangan biarkan <button>
                             * melakukan action lain.
                             */
                            event.preventDefault();
                            event.stopPropagation();
                            if (
                                button.disabled
                            ) {
                                return;
                            }
                            const id =
                                button.dataset.id;
                            const type =
                                button.dataset.type;
                            const action =
                                button.dataset.action;
                            const item =
                                findItem(
                                    id,
                                    type
                                );
                            if (!item) {
                                showToast(
                                    "Data produk tidak ditemukan. Silakan refresh.",
                                    "error"
                                );
                                return;
                            }
                            try {
                                button.disabled =
                                    true;
                                if (
                                    action ===
                                    "open"
                                ) {
                                    openItem(
                                        item,
                                        type
                                    );
                                } else if (
                                    action ===
                                    "copy"
                                ) {
                                    await copyItem(
                                        item,
                                        type
                                    );
                                } else if (
                                    action ===
                                    "edit"
                                ) {
                                    await editItem(
                                        item,
                                        type
                                    );
                                } else if (
                                    action ===
                                    "delete"
                                ) {
                                    await deleteItem(
                                        item,
                                        type
                                    );
                                }
                            } catch (error) {
                                console.error(
                                    "[My Products] Action error:",
                                    error
                                );
                                showToast(
                                    error?.message ||
                                    "Action gagal.",
                                    "error"
                                );
                            } finally {
                                if (
                                    document.body.contains(
                                        button
                                    )
                                ) {
                                    button.disabled =
                                        false;
                                }
                            }
                        }
                    );
                }
            );
    }
    /* =====================================================
       OPEN
       ===================================================== */
    function openItem(
        item,
        type
    ) {
        const href =
            hrefFor(
                item,
                type
            );
        if (
            !href ||
            href === "#"
        ) {
            showToast(
                "Link untuk konten ini tidak tersedia.",
                "error"
            );
            return;
        }
        window.open(
            href,
            "_blank",
            "noopener,noreferrer"
        );
    }
    /* =====================================================
       COPY
       ===================================================== */
    async function copyItem(
        item,
        type
    ) {
        const href =
            hrefFor(
                item,
                type
            );
        if (
            !href ||
            href === "#"
        ) {
            showToast(
                "Link untuk konten ini tidak tersedia.",
                "error"
            );
            return;
        }
        try {
            if (
                navigator.clipboard &&
                window.isSecureContext
            ) {
                await navigator.clipboard
                    .writeText(
                        href
                    );
            } else {
                const textarea =
                    document.createElement(
                        "textarea"
                    );
                textarea.value =
                    href;
                textarea.setAttribute(
                    "readonly",
                    ""
                );
                textarea.style.position =
                    "fixed";
                textarea.style.left =
                    "-9999px";
                textarea.style.opacity =
                    "0";
                document.body.appendChild(
                    textarea
                );
                textarea.focus();
                textarea.select();
                textarea.setSelectionRange(
                    0,
                    textarea.value.length
                );
                const copied =
                    document.execCommand(
                        "copy"
                    );
                textarea.remove();
                if (!copied) {
                    throw new Error(
                        "Clipboard tidak tersedia."
                    );
                }
            }
            showToast(
                "Link berhasil disalin.",
                "success"
            );
        } catch (error) {
            console.error(
                "[My Products] Copy error:",
                error
            );
            showToast(
                "Gagal menyalin link.",
                "error"
            );
        }
    }
    /* =====================================================
       EDIT
       ===================================================== */
    /* =====================================================
       EDIT MODAL — FULL FORM PER CONTENT TYPE
       ===================================================== */
    function removeEditModal() {
        // Remove BOTH the modal and its backdrop.
        // Leaving the backdrop mounted was causing the page to stay dim/blurred
        // after Cancel/Save.
        document.getElementById("ptEditModal")?.remove();
        document.getElementById("ptEditBackdrop")?.remove();

        document.body.classList.remove("modal-open");

        // Clean up any stale modal state left by a previous open/close cycle.
        document.documentElement.classList.remove("modal-open", "modal-blur");
        document.body.style.removeProperty("filter");
        document.body.style.removeProperty("backdrop-filter");
        document.body.style.removeProperty("-webkit-backdrop-filter");
    }

    function toLocalDateTimeValue(value) {
        if (!value) return "";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        const pad = n => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function localDateTimeToISO(value) {
        if (!value) return null;
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString();
    }

    function editModalTemplate(item, type) {
        const title = titleOf(item);
        const heading = type === "code" ? "Edit Code Telegram"
            : type === "pastelink" ? "Edit PasteLink"
            : type === "channel" ? `Edit ${normalize(item?.type) === "group" ? "Group" : "Channel"}`
            : type === "paste" ? "Edit Paste"
            : "Edit Produk";

        let fields = "";

        if (type === "code") {
            fields = `
                <div class="edit-field">
                    <label for="editTitle"><i class="fa-solid fa-heading"></i> Judul</label>
                    <input id="editTitle" class="edit-input" maxlength="180" value="${esc(title)}" autocomplete="off">
                </div>
                <div class="edit-field">
                    <label for="editBot"><i class="fa-solid fa-robot"></i> Bot Telegram</label>
                    <input id="editBot" class="edit-input" maxlength="120" value="${esc(item?.bot_username ? "@" + String(item.bot_username).replace(/^@/, "") : "")}" placeholder="@NamaBot" autocomplete="off">
                </div>
                <div class="edit-field">
                    <label for="editCode"><i class="fa-solid fa-key"></i> Code</label>
                    <input id="editCode" class="edit-input" maxlength="180" value="${esc(item?.slug || "")}" placeholder="Code Telegram" autocomplete="off">
                    <small class="edit-help">Code adalah slug publik. Karena kolom slug bersifat UNIQUE, code yang sudah dipakai tidak dapat digunakan.</small>
                </div>`;
        } else if (type === "pastelink") {
            fields = `
                <div class="edit-field">
                    <label for="editTitle"><i class="fa-solid fa-heading"></i> Judul</label>
                    <input id="editTitle" class="edit-input" maxlength="180" value="${esc(title)}" autocomplete="off">
                </div>
                <div class="edit-field">
                    <label for="editContent"><i class="fa-solid fa-file-code"></i> Konten</label>
                    <textarea id="editContent" class="edit-textarea edit-content" rows="14" placeholder="Masukkan konten PasteLink...">${esc(item?.content_html || "")}</textarea>
                    <small class="edit-help">Konten disimpan sebagai HTML sesuai field <code>content_html</code> di database.</small>
                </div>
                <div class="edit-field">
                    <label for="editExpires"><i class="fa-solid fa-clock"></i> Expired</label>
                    <div class="edit-expire-row">
                        <input id="editExpires" class="edit-input" type="datetime-local" value="${esc(toLocalDateTimeValue(item?.expires_at))}">
                        <label class="edit-check">
                            <input id="editNever" type="checkbox" ${item?.expires_at ? "" : "checked"}>
                            <span>Tidak expired</span>
                        </label>
                    </div>
                    <small class="edit-help">Kosongkan / pilih “Tidak expired” untuk membuat PasteLink tanpa batas waktu.</small>
                </div>`;
        } else if (type === "channel") {
            const currentLink = String(item?.invite_url || "").trim();
            fields = `
                <div class="edit-field">
                    <label for="editTitle"><i class="fa-solid fa-heading"></i> Judul</label>
                    <input id="editTitle" class="edit-input" maxlength="180" value="${esc(title)}" autocomplete="off">
                </div>
                <div class="edit-field">
                    <label for="editLink"><i class="fa-solid fa-link"></i> Link Channel / Group</label>
                    <input id="editLink" class="edit-input" maxlength="1000" value="${esc(currentLink)}" placeholder="https://t.me/..." autocomplete="off">
                    <small class="edit-help">Masukkan link Telegram lengkap, misalnya https://t.me/nama_channel atau link invite.</small>
                </div>`;
        } else if (type === "paste") {
            fields = `
                <div class="edit-field">
                    <label for="editTitle"><i class="fa-solid fa-heading"></i> Judul</label>
                    <input id="editTitle" class="edit-input" maxlength="180" value="${esc(title)}" autocomplete="off">
                </div>
                <div class="edit-field">
                    <label for="editContent"><i class="fa-solid fa-file-lines"></i> Konten</label>
                    <textarea id="editContent" class="edit-textarea" rows="14">${esc(item?.content || "")}</textarea>
                </div>`;
        } else {
            fields = `
                <div class="edit-field">
                    <label for="editTitle"><i class="fa-solid fa-heading"></i> Judul</label>
                    <input id="editTitle" class="edit-input" maxlength="180" value="${esc(title)}" autocomplete="off">
                </div>
                <div class="edit-field">
                    <label for="editDescription"><i class="fa-solid fa-align-left"></i> Deskripsi</label>
                    <textarea id="editDescription" class="edit-textarea" rows="8">${esc(item?.description || "")}</textarea>
                </div>
                <div class="edit-field">
                    <label for="editPrice"><i class="fa-solid fa-tag"></i> Harga (IDR)</label>
                    <input id="editPrice" class="edit-input" inputmode="numeric" value="${esc(String(item?.price || 0))}">
                </div>`;
        }

        return `
            <div class="pt-edit-backdrop" id="ptEditBackdrop"></div>
            <section class="pt-edit-modal" id="ptEditModal" role="dialog" aria-modal="true" aria-labelledby="ptEditTitle">
                <header class="pt-edit-head">
                    <div class="pt-edit-heading">
                        <span class="pt-edit-icon"><i class="fa-solid ${iconFor(type)}"></i></span>
                        <div>
                            <span class="pt-edit-eyebrow">${esc(labelFor(type))}</span>
                            <h2 id="ptEditTitle">${esc(heading)}</h2>
                        </div>
                    </div>
                    <button type="button" class="pt-edit-close" id="ptEditClose" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
                </header>
                <form id="ptEditForm" class="pt-edit-form">
                    ${fields}
                    <div id="ptEditError" class="edit-error" hidden></div>
                    <footer class="pt-edit-actions">
                        <button type="button" class="btn" id="ptEditCancel"><i class="fa-solid fa-xmark"></i> Batal</button>
                        <button type="submit" class="btn primary" id="ptEditSave"><i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan</button>
                    </footer>
                </form>
            </section>`;
    }

    async function editItem(item, type) {
        if (!item || !profile?.id) {
            showToast("Data produk tidak tersedia.", "error");
            return;
        }

        removeEditModal();
        document.body.insertAdjacentHTML("beforeend", editModalTemplate(item, type));
        document.body.classList.add("modal-open");

        const modal = document.getElementById("ptEditModal");
        const form = document.getElementById("ptEditForm");
        const errorBox = document.getElementById("ptEditError");
        const saveBtn = document.getElementById("ptEditSave");

        const close = () => removeEditModal();
        document.getElementById("ptEditClose")?.addEventListener("click", close);
        document.getElementById("ptEditCancel")?.addEventListener("click", close);
        document.getElementById("ptEditBackdrop")?.addEventListener("click", close);
        document.addEventListener("keydown", function escEdit(e) {
            if (e.key === "Escape") {
                close();
                document.removeEventListener("keydown", escEdit);
            }
        });

        if (type === "pastelink") {
            const never = document.getElementById("editNever");
            const expires = document.getElementById("editExpires");
            never?.addEventListener("change", () => {
                if (never.checked) {
                    expires.value = "";
                    expires.disabled = true;
                } else {
                    expires.disabled = false;
                }
            });
            if (never?.checked && expires) expires.disabled = true;
        }

        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (saveBtn?.disabled) return;

            const title = String(document.getElementById("editTitle")?.value || "").trim();
            if (!title) {
                errorBox.textContent = "Judul wajib diisi.";
                errorBox.hidden = false;
                return;
            }

            saveBtn.disabled = true;
            saveBtn.classList.add("is-loading");
            errorBox.hidden = true;

            try {
                let response;

                if (type === "code") {
                    const bot = String(document.getElementById("editBot")?.value || "").trim().replace(/^@+/, "");
                    const code = String(document.getElementById("editCode")?.value || "").trim();

                    if (!code) throw new Error("Code wajib diisi.");
                    if (!/^[A-Za-z0-9._-]{3,180}$/.test(code)) {
                        throw new Error("Code hanya boleh berisi huruf, angka, titik, underscore, atau tanda minus.");
                    }

                    response = await supabase.from("telegram_products")
                        .update({
                            title,
                            bot_username: bot || null,
                            slug: code
                        })
                        .eq("id", item.id)
                        .eq("owner_id", profile.id);

                } else if (type === "pastelink") {
                    const contentValue = String(document.getElementById("editContent")?.value || "");
                    const never = !!document.getElementById("editNever")?.checked;
                    const expiresValue = String(document.getElementById("editExpires")?.value || "").trim();

                    if (!contentValue.trim()) throw new Error("Konten PasteLink wajib diisi.");

                    let expiresAt = null;
                    if (!never && expiresValue) {
                        expiresAt = localDateTimeToISO(expiresValue);
                        if (!expiresAt) throw new Error("Tanggal expired tidak valid.");
                        if (new Date(expiresAt).getTime() <= Date.now()) {
                            throw new Error("Tanggal expired harus berada di masa depan.");
                        }
                    }

                    response = await supabase.from("pastelinks")
                        .update({
                            title,
                            content_html: contentValue,
                            expires_at: expiresAt
                        })
                        .eq("id", item.id)
                        .eq("user_id", profile.id);

                } else if (type === "channel") {
                    const link = String(document.getElementById("editLink")?.value || "").trim();
                    if (!link) throw new Error("Link Channel / Group wajib diisi.");

                    let normalizedLink = link;
                    if (!/^https?:\/\//i.test(normalizedLink) && /^t\.me\//i.test(normalizedLink)) {
                        normalizedLink = "https://" + normalizedLink;
                    }

                    response = await supabase.from("telegram_channels")
                        .update({
                            name: title,
                            invite_url: normalizedLink
                        })
                        .eq("id", item.id)
                        .eq("owner_id", profile.id);

                } else if (type === "paste") {
                    const contentValue = String(document.getElementById("editContent")?.value || "").trim();
                    if (!contentValue) throw new Error("Konten wajib diisi.");

                    response = await supabase.from("pastes")
                        .update({
                            title,
                            content: contentValue
                        })
                        .eq("id", item.id)
                        .eq("owner_id", profile.id);

                } else if (type === "product") {
                    const description = String(document.getElementById("editDescription")?.value || "").trim();
                    let price = Number(String(document.getElementById("editPrice")?.value || "0").replace(/[^\d]/g, ""));
                    if (!Number.isFinite(price) || price < 0) price = 0;

                    response = await supabase.from("products")
                        .update({
                            title,
                            description,
                            price,
                            access_type: price > 0 ? "paid" : "free"
                        })
                        .eq("id", item.id)
                        .or(`creator_id.eq.${profile.id},seller_id.eq.${profile.id}`);

                } else {
                    throw new Error("Tipe produk tidak dikenal.");
                }

                if (response?.error) throw response.error;

                close();
                showToast("Perubahan berhasil disimpan.", "success");
                await loadData();

            } catch (error) {
                console.error("[My Products] Edit error:", error);
                errorBox.textContent = error?.message || "Gagal menyimpan perubahan.";
                errorBox.hidden = false;
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.classList.remove("is-loading");
                }
            }
        });
    }
    /* =====================================================
       DELETE
       ===================================================== */
    async function deleteItem(
        item,
        type
    ) {
        const title =
            titleOf(
                item
            );
        const confirmed =
            confirm(
                `Hapus "${title}"?\n\nTindakan ini tidak dapat dibatalkan.`
            );
        if (
            !confirmed
        ) {
            return;
        }
        let response;
        try {
            /* =============================================
               PASTELINK
               ============================================= */
            if (type === "pastelink") {
                response = await supabase.from("pastelinks")
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "user_id",
                            profile.id
                        );
            }
            else if (type === "paste") {
                response = await supabase.from("pastes").delete().eq("id",item.id).eq("owner_id",profile.id);
            }
            /* =============================================
               TELEGRAM PRODUCT
               ============================================= */
            else if (
                type ===
                "code"
            ) {
                response =
                    await supabase
                        .from(
                            "telegram_products"
                        )
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               TELEGRAM CHANNEL
               ============================================= */
            else if (
                type ===
                "channel"
            ) {
                response =
                    await supabase
                        .from(
                            "telegram_channels"
                        )
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               MARKETPLACE PRODUCT
               ============================================= */
            else if (
                type ===
                "product"
            ) {
                response =
                    await supabase
                        .from(
                            "products"
                        )
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .or(
                            `creator_id.eq.${profile.id},seller_id.eq.${profile.id}`
                        );
            }
            else {
                showToast(
                    "Tipe produk tidak dikenal.",
                    "error"
                );
                return;
            }
            if (
                response?.error
            ) {
                throw response.error;
            }
            showToast(
                "Konten berhasil dihapus.",
                "success"
            );
            await loadData();
        } catch (error) {
            console.error(
                "[My Products] Delete error:",
                error
            );
            showToast(
                error?.message ||
                "Gagal menghapus konten.",
                "error"
            );
        }
    }
    /* =====================================================
       RESET FILTER
       ===================================================== */
    function resetFilters() {
        if (searchInput) {
            searchInput.value =
                "";
        }
        if (typeFilter) {
            typeFilter.value =
                "all";
        }
        if (statusFilter) {
            statusFilter.value =
                "all";
        }
        render();
    }
    /* =====================================================
       EVENTS
       ===================================================== */
    searchInput?.addEventListener(
        "input",
        render
    );
    typeFilter?.addEventListener(
        "change",
        render
    );
    statusFilter?.addEventListener(
        "change",
        render
    );
    clearSearch?.addEventListener(
        "click",
        () => {
            if (searchInput) {
                searchInput.value =
                    "";
                searchInput.focus();
            }
            render();
        }
    );
    refreshBtn?.addEventListener(
        "click",
        async () => {
            await loadData();
        }
    );
    /* =====================================================
       INITIAL LOAD
       ===================================================== */
    await loadData();
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
