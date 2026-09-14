/* PasTele — self-contained withdrawals page script. One HTML -> one JS -> one CSS. */
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
   PasTele — Withdrawals
   PREMIUM / SUPABASE / RESPONSIVE
   ---------------------------------------------------------
   Existing schema preserved
   WITHDRAW RULES

   WD Instant:
   - Buka 24/7
   - Senin-Minggu
   - Maks Rp250.000 / transaksi
   - Maks Rp500.000 / hari
   - Fee Rp15.000

   WD Manual:
   - Normal: Senin-Jumat 07:00-21:00 WIB
   - Di luar jam normal tetap bisa diajukan
   - Fee normal + OFF_HOURS_FEE
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    /* =====================================================
       DOM HELPER
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    /* =====================================================
       SAFE GLOBALS
       ===================================================== */

    const getTC = () => {
        return window.TC || null;
    };

    const getSupabase = () => {
        return window.sb || null;
    };

    /* =====================================================
       DOM
       ===================================================== */

    const balEl = $('bal');
    const reqEl = $('req');
    const doneEl = $('done');

    const dailyBar = $('dailyBar');
    const dailyText = $('dailyText');
    const dailyPercent = $('dailyPercent');

    const instantBtns = $('instantBtns');
    const instantAmount = $('instantAmount');
    const instantSubmit = $('instantSubmit');

    const savedMethodsEl = $('savedMethods');

    const form = $('wd');
    const amountEl = $('amount');
    const methodEl = $('method');
    const nameEl = $('aname');
    const numberEl = $('anum');

    const manualSubmit = $('manualSubmit');

    const historyEl = $('history');
    const historyCount = $('historyCount');

    const manualStatus = $('manualStatus');
    const manualStatusTitle = $('manualStatusTitle');
    const manualStatusText = $('manualStatusText');
    const manualClosedNotice = $('manualClosedNotice');
    const manualClosedText = $('manualClosedText');
    const manualFeeText = $('manualFeeText');

    const withdrawFeePreview = $('withdrawFeePreview');
    const withdrawFee = $('withdrawFee');
    const withdrawNet = $('withdrawNet');

    const refreshWithdraw = $('refreshWithdraw');

    const historySearch = $('historySearch');
    const clearHistorySearch = $('clearHistorySearch');
    const historyStatus = $('historyStatus');
    const historySort = $('historySort');
    const historyResult = $('historyResult');
    const historyPagination = $('historyPagination');

    /* Confirmation modal */
    const withdrawConfirmModal = $('withdrawConfirmModal');
    const withdrawConfirmClose = $('withdrawConfirmClose');

    const confirmAmount = $('confirmAmount');
    const confirmFee = $('confirmFee');
    const confirmNet = $('confirmNet');
    const confirmMethod = $('confirmMethod');
    const confirmAccountName = $('confirmAccountName');
    const confirmAccount = $('confirmAccount');

    const withdrawConfirmCancel = $('withdrawConfirmCancel');
    const withdrawConfirmSubmit = $('withdrawConfirmSubmit');

    /* =====================================================
       CONSTANTS
       ===================================================== */

    const DAILY_LIMIT = 500000;

    const INSTANT_MAX = 250000;
    const INSTANT_FEE = 0;

    const MANUAL_MIN = 10000;

    const MANUAL_FEE_BANK = 0;
    const MANUAL_FEE_EWALLET = 0;

    const MANUAL_OPEN_HOUR = 9;
    const MANUAL_CLOSE_HOUR = 21;

    const TIMEZONE = 'Asia/Jakarta';

    const INSTANT_AMOUNTS = [
        50000,
        100000,
        150000,
        200000,
        250000
    ];

    const HISTORY_PER_PAGE = 8;

    /* =====================================================
       STATE
       ===================================================== */

    let profile = null;
    let wallet = null;

    let withdrawals = [];
    let paymentMethods = [];

    let selectedInstantAmount = 50000;
    let selectedPaymentMethod = null;

    let isSubmitting = false;
    let isLoading = false;
    let scheduleStatus = { open: false, reason: 'Memeriksa jadwal WD Manual...' };

    let historyPage = 1;

    let pendingWithdrawal = null;

    /* =====================================================
       HELPERS
       ===================================================== */

    const money = (value) => {
        const amount = Number(value || 0);

        const tc = getTC();

        if (
            tc &&
            typeof tc.money === 'function'
        ) {
            try {
                return tc.money(
                    Number.isFinite(amount)
                        ? amount
                        : 0
                );
            } catch (_) {
                /* fallback below */
            }
        }

        return new Intl.NumberFormat(
            'id-ID',
            {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0
            }
        ).format(
            Number.isFinite(amount)
                ? amount
                : 0
        );
    };

    const esc = (value) => {
        const text = String(value ?? '');

        const tc = getTC();

        if (
            tc &&
            typeof tc.esc === 'function'
        ) {
            try {
                return tc.esc(text);
            } catch (_) {
                /* fallback below */
            }
        }

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const toast = (
        message,
        type = 'error'
    ) => {
        const tc = getTC();

        if (
            tc &&
            typeof tc.toast === 'function'
        ) {
            try {
                tc.toast(
                    message,
                    type
                );
                return;
            } catch (_) {
                /* fallback */
            }
        }

        if (type === 'error') {
            console.error(message);
        }

        window.alert(message);
    };

    const amountNumber = (value) => {
        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return 0;
        }

        const number = Number(
            String(value)
                .replace(/[^\d.-]/g, '')
        );

        return Number.isFinite(number)
            ? number
            : 0;
    };

    const getBalance = () => {
        return amountNumber(
            wallet?.available_balance ??
            wallet?.balance ??
            profile?.balance ??
            0
        );
    };

    const normalizeStatus = (status) => {
        return String(
            status || ''
        )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_');
    };

    const statusKey = (status) => {
        const value =
            normalizeStatus(status);

        if (
            [
                'completed',
                'paid',
                'success',
                'successful'
            ].includes(value)
        ) {
            return 'success';
        }

        if (
            [
                'failed',
                'cancelled',
                'canceled',
                'rejected'
            ].includes(value)
        ) {
            return value === 'rejected'
                ? 'rejected'
                : 'failed';
        }

        if (
            value === 'processing'
        ) {
            return 'processing';
        }

        return 'pending';
    };

    const statusLabel = (status) => {
        const value =
            normalizeStatus(status);

        const labels = {
            pending: 'Menunggu',
            processing: 'Diproses',

            completed: 'Selesai',
            paid: 'Selesai',
            success: 'Selesai',
            successful: 'Selesai',

            failed: 'Gagal',
            cancelled: 'Dibatalkan',
            canceled: 'Dibatalkan',
            rejected: 'Ditolak'
        };

        return labels[value] ||
            (
                value
                    ? value.replace(
                        /_/g,
                        ' '
                    )
                    : 'Tidak diketahui'
            );
    };

    const methodLabel = (method) => {
        const value =
            String(
                method || ''
            )
                .toLowerCase()
                .trim();

        if (value === 'bank') {
            return 'Bank';
        }

        if (
            value === 'ewallet' ||
            value === 'e-wallet' ||
            value === 'wallet'
        ) {
            return 'E-Wallet';
        }

        return method || '-';
    };

    const methodIcon = (method) => {
        return String(
            method || ''
        )
            .toLowerCase()
            .trim() === 'bank'
            ? 'fa-building-columns'
            : 'fa-wallet';
    };

    const isPending = (row) => {
        return [
            'pending',
            'processing'
        ].includes(
            normalizeStatus(
                row?.status
            )
        );
    };

    const isCompleted = (row) => {
        return [
            'completed',
            'paid',
            'success',
            'successful'
        ].includes(
            normalizeStatus(
                row?.status
            )
        );
    };

    const isFailed = (row) => {
        return [
            'failed',
            'cancelled',
            'canceled',
            'rejected'
        ].includes(
            normalizeStatus(
                row?.status
            )
        );
    };

    /* =====================================================
       TIMEZONE
       ===================================================== */

    const getJakartaParts = () => {
        const parts =
            new Intl.DateTimeFormat(
                'en-US',
                {
                    timeZone: TIMEZONE,
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }
            ).formatToParts(
                new Date()
            );

        const get = (type) => {
            return parts.find(
                (part) =>
                    part.type === type
            )?.value;
        };

        const weekday =
            get('weekday');

        let hour =
            Number(
                get('hour') || 0
            );

        const minute =
            Number(
                get('minute') || 0
            );

        /*
         * Beberapa environment Intl bisa
         * menghasilkan "24" pada midnight.
         */
        if (hour === 24) {
            hour = 0;
        }

        return {
            weekday,
            hour,
            minute,
            totalMinutes:
                (hour * 60) + minute
        };
    };

    const isManualNormalHours = () => {
        return Boolean(scheduleStatus?.open);
    };

    const isManualOffHours = () => !isManualNormalHours();

    const isInstantOpen = () => true;

    const loadWithdrawalSchedule = async () => {
        const supabase = getSupabase();
        if (!supabase) return;
        try {
            const { data, error } = await supabase.rpc('withdrawal_schedule_status');
            if (error) throw error;
            scheduleStatus = data || { open:false, reason:'Jadwal tidak tersedia' };
        } catch (error) {
            console.warn('[Withdrawals] schedule:', error);
            // Fail closed for manual WD if the schedule cannot be verified.
            scheduleStatus = { open:false, reason:'Jadwal WD Manual tidak dapat diverifikasi. Coba refresh.' };
        }
        renderManualSchedule();
        renderFeePreview();
    };

    /* =====================================================
       MANUAL FEE
       ===================================================== */

    const getNormalManualFee = () => {
        const method =
            String(
                methodEl?.value ||
                selectedPaymentMethod?.method_type ||
                'ewallet'
            )
                .toLowerCase()
                .trim();

        return method === 'bank'
            ? MANUAL_FEE_BANK
            : MANUAL_FEE_EWALLET;
    };

    const getManualFee = () => getNormalManualFee();

    /* =====================================================
       MANUAL STATUS
       ===================================================== */

    const renderManualSchedule = () => {
        if (!manualStatus) return;

        const open = isManualNormalHours();
        manualStatus.classList.remove('open','closed','off-hours');
        manualStatus.dataset.state = open ? 'open' : 'closed';

        if (manualClosedNotice) {
            manualClosedNotice.hidden = open;
        }

        if (manualSubmit) {
            manualSubmit.disabled = !open;
            manualSubmit.setAttribute('aria-disabled', String(!open));
            manualSubmit.classList.toggle('is-closed', !open);
        }

        if (open) {
            manualStatus.classList.add('open');
            if (manualStatusTitle) manualStatusTitle.textContent = 'WD Manual sedang buka';
            if (manualStatusText) {
                manualStatusText.textContent =
                    scheduleStatus?.reason || 'Senin–Jumat 09:00–21:00 WIB. Kamis malam (malam Jumat) sampai 23:00 WIB.';
            }
        } else {
            manualStatus.classList.add('closed');
            if (manualStatusTitle) manualStatusTitle.textContent = 'WD Manual sedang tutup';
            if (manualStatusText) manualStatusText.textContent =
                scheduleStatus?.reason || 'WD Manual ditutup di luar jadwal operasional.';
            if (manualClosedText) {
                const next = scheduleStatus?.next_open
                    ? String(scheduleStatus.next_open).replace(' ', ' WIB ')
                    : 'jadwal operasional berikutnya';
                manualClosedText.textContent =
                    `Pengajuan WD Manual ditutup. Buka kembali ${next}.`;
            }
        }

        renderManualFeeInfo();
    };

    /* =====================================================
       MANUAL FEE INFO
       ===================================================== */

    const renderManualFeeInfo = () => {
        if (!manualFeeText) return;
        manualFeeText.textContent = `WD Manual hanya dapat diajukan saat jam operasional.`;
    };

    /* =====================================================
       FEE PREVIEW
       ===================================================== */

    const renderFeePreview = () => {
        if (
            !withdrawFee ||
            !withdrawNet
        ) {
            return;
        }

        const amount =
            amountNumber(
                amountEl?.value
            );

        const fee =
            getManualFee();

        const net =
            Math.max(
                0,
                amount - fee
            );

        withdrawFee.textContent =
            money(fee);

        withdrawNet.textContent =
            money(net);

        if (withdrawFeePreview) {
            withdrawFeePreview.classList.remove('fee-increased');
        }
    };

    /* =====================================================
       DATE HELPERS
       ===================================================== */

    const jakartaDateKey = (
        dateValue
    ) => {
        if (!dateValue) {
            return null;
        }

        const date =
            new Date(dateValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        const parts =
            new Intl.DateTimeFormat(
                'en-CA',
                {
                    timeZone: TIMEZONE,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }
            ).formatToParts(
                date
            );

        const get = (type) => {
            return parts.find(
                (part) =>
                    part.type === type
            )?.value;
        };

        return `${get('year')}-${get(
            'month'
        )}-${get('day')}`;
    };

    const todayJakartaKey = () => {
        return jakartaDateKey(
            new Date()
        );
    };

    const isToday = (
        dateValue
    ) => {
        const key =
            jakartaDateKey(
                dateValue
            );

        return (
            key !== null &&
            key ===
                todayJakartaKey()
        );
    };

    /* =====================================================
       BUTTON LOADING
       ===================================================== */

    const setButtonLoading = (
        button,
        loading,
        loadingText = 'Memproses...'
    ) => {
        if (!button) {
            return;
        }

        if (loading) {
            if (
                !button.dataset.originalHtml
            ) {
                button.dataset.originalHtml =
                    button.innerHTML;
            }

            button.disabled = true;

            button.classList.add(
                'loading'
            );

            button.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>${esc(
                    loadingText
                )}</span>
            `;

            return;
        }

        button.disabled = false;

        button.classList.remove(
            'loading'
        );

        if (
            button.dataset.originalHtml
        ) {
            button.innerHTML =
                button.dataset.originalHtml;

            delete button.dataset
                .originalHtml;
        }
    };

    /* =====================================================
       DAILY INSTANT LIMIT
       ===================================================== */

    const getWithdrawalMode = (
        row
    ) => {
        const mode =
            String(
                row?.mode ||
                row?.withdrawal_mode ||
                row?.type ||
                ''
            )
                .toLowerCase()
                .trim();

        return mode;
    };

    const calculateTodayInstantAmount = () => {
        return withdrawals
            .filter((row) =>
                isToday(
                    row?.created_at
                )
            )
            .filter((row) => {
                return (
                    getWithdrawalMode(
                        row
                    ) === 'instant'
                );
            })
            .filter((row) => {
                /*
                 * Pending/processing/completed
                 * tetap dihitung agar user tidak
                 * bisa menghindari daily limit
                 * dengan membuat request berkali-kali.
                 */
                return !isFailed(row);
            })
            .reduce(
                (
                    total,
                    row
                ) => {
                    return (
                        total +
                        amountNumber(
                            row?.amount
                        )
                    );
                },
                0
            );
    };

    const renderDailyLimit = () => {
        if (
            !dailyBar ||
            !dailyText ||
            !dailyPercent
        ) {
            return;
        }

        const todayAmount =
            calculateTodayInstantAmount();

        const percent =
            Math.min(
                100,
                Math.round(
                    (
                        todayAmount /
                        DAILY_LIMIT
                    ) * 100
                )
            );

        dailyBar.style.width =
            `${percent}%`;

        dailyPercent.textContent =
            `${percent}%`;

        dailyText.textContent =
            `${money(
                todayAmount
            )} / ${money(
                DAILY_LIMIT
            )}`;

        dailyBar.removeAttribute(
            'data-level'
        );

        if (percent >= 100) {
            dailyBar.dataset.level =
                'full';
        } else if (percent >= 50) {
            dailyBar.dataset.level =
                'half';
        }
    };

    /* =====================================================
       INSTANT BUTTONS
       ===================================================== */

    const renderInstantAmounts = () => {
        if (!instantBtns) {
            return;
        }

        instantBtns.innerHTML =
            INSTANT_AMOUNTS
                .map(
                    (amount) => {
                        const selected =
                            amount ===
                            selectedInstantAmount;

                        return `
                            <button
                                type="button"
                                class="instant-choice ${
                                    selected
                                        ? 'selected'
                                        : ''
                                }"
                                data-amount="${amount}"
                                aria-pressed="${
                                    selected
                                }"
                            >
                                <i class="fa-solid fa-bolt"></i>
                                ${esc(
                                    money(
                                        amount
                                    )
                                )}
                            </button>
                        `;
                    }
                )
                .join('');

        instantBtns
            .querySelectorAll(
                '.instant-choice'
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        'click',
                        () => {
                            selectedInstantAmount =
                                amountNumber(
                                    button.dataset
                                        .amount
                                );

                            instantBtns
                                .querySelectorAll(
                                    '.instant-choice'
                                )
                                .forEach(
                                    (item) => {
                                        const selected =
                                            item ===
                                            button;

                                        item.classList.toggle(
                                            'selected',
                                            selected
                                        );

                                        item.setAttribute(
                                            'aria-pressed',
                                            String(
                                                selected
                                            )
                                        );
                                    }
                                );

                            if (
                                instantAmount
                            ) {
                                instantAmount.textContent =
                                    money(
                                        selectedInstantAmount
                                    );
                            }
                        }
                    );
                }
            );

        if (instantAmount) {
            instantAmount.textContent =
                money(
                    selectedInstantAmount
                );
        }
    };

    /* =====================================================
       PAYMENT METHODS
       ===================================================== */

    const applyPaymentMethod = (
        method
    ) => {
        if (!method) {
            return;
        }

        selectedPaymentMethod =
            method;

        if (methodEl) {
            methodEl.value =
                method.method_type ||
                method.method ||
                'ewallet';
        }

        if (nameEl) {
            nameEl.value =
                method.account_name ||
                '';
        }

        if (numberEl) {
            numberEl.value =
                method.account_number ||
                '';
        }

        savedMethodsEl
            ?.querySelectorAll(
                '.saved-method'
            )
            .forEach(
                (button) => {
                    const selected =
                        button.dataset
                            .methodId ===
                        String(
                            method.id
                        );

                    button.classList.toggle(
                        'selected',
                        selected
                    );

                    button.setAttribute(
                        'aria-pressed',
                        String(selected)
                    );
                }
            );

        renderManualSchedule();
        renderFeePreview();
    };

    const renderPaymentMethods = () => {
        if (!savedMethodsEl) {
            return;
        }

        if (!paymentMethods.length) {
            savedMethodsEl.classList.add(
                'hidden'
            );

            savedMethodsEl.innerHTML =
                '';

            return;
        }

        savedMethodsEl.classList.remove(
            'hidden'
        );

        savedMethodsEl.innerHTML = `
            <div class="saved-title">
                <i class="fa-solid fa-bookmark"></i>
                Payment tersimpan
            </div>

            <div class="saved-method-list">
                ${paymentMethods
                    .map(
                        (method) => {
                            const selected =
                                selectedPaymentMethod &&
                                String(
                                    selectedPaymentMethod.id
                                ) ===
                                String(
                                    method.id
                                );

                            const provider =
                                method.provider ||
                                method.method_type ||
                                method.method ||
                                'Payment';

                            return `
                                <button
                                    type="button"
                                    class="saved-method ${
                                        selected
                                            ? 'selected'
                                            : ''
                                    }"
                                    data-method-id="${esc(
                                        method.id
                                    )}"
                                    aria-pressed="${
                                        selected
                                    }"
                                >
                                    <div class="saved-method-main">
                                        <strong>
                                            ${esc(
                                                provider
                                            )}
                                        </strong>

                                        <small>
                                            ${esc(
                                                method.account_name ||
                                                ''
                                            )}
                                            ${
                                                method.account_name
                                                    ? ' · '
                                                    : ''
                                            }
                                            ${esc(
                                                method.account_number ||
                                                ''
                                            )}
                                        </small>
                                    </div>

                                    <i class="fa-solid fa-chevron-right"></i>
                                </button>
                            `;
                        }
                    )
                    .join('')}
            </div>
        `;

        savedMethodsEl
            .querySelectorAll(
                '[data-method-id]'
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        'click',
                        () => {
                            const method =
                                paymentMethods.find(
                                    (item) =>
                                        String(
                                            item.id
                                        ) ===
                                        String(
                                            button.dataset
                                                .methodId
                                        )
                                );

                            applyPaymentMethod(
                                method
                            );
                        }
                    );
                }
            );
    };

    /* =====================================================
       SUMMARY
       ===================================================== */

    const renderSummary = () => {
        const balance =
            getBalance();

        const pending =
            withdrawals
                .filter(isPending)
                .reduce(
                    (
                        total,
                        row
                    ) => {
                        return (
                            total +
                            amountNumber(
                                row?.total_debit ??
                                row?.amount
                            )
                        );
                    },
                    0
                );

        const completed =
            withdrawals
                .filter(isCompleted)
                .reduce(
                    (
                        total,
                        row
                    ) => {
                        return (
                            total +
                            amountNumber(
                                row?.amount
                            )
                        );
                    },
                    0
                );

        if (balEl) {
            balEl.textContent =
                money(balance);
        }

        if (reqEl) {
            reqEl.textContent =
                money(pending);
        }

        if (doneEl) {
            doneEl.textContent =
                money(completed);
        }
    };

    /* =====================================================
       HISTORY FILTER
       ===================================================== */

    const getHistoryFiltered = () => {
        let rows = [
            ...withdrawals
        ];

        const search =
            String(
                historySearch?.value ||
                ''
            )
                .trim()
                .toLowerCase();

        const status =
            String(
                historyStatus?.value ||
                'all'
            )
                .trim()
                .toLowerCase();

        const sort =
            String(
                historySort?.value ||
                'newest'
            )
                .trim()
                .toLowerCase();

        if (search) {
            rows = rows.filter(
                (row) => {
                    const haystack = [
                        row?.id,
                        row?.ticket_code,
                        row?.mode,
                        row?.method,
                        row?.method_type,
                        row?.account_name,
                        row?.account_number,
                        row?.status,
                        row?.amount
                    ]
                        .map(
                            (value) =>
                                String(
                                    value ??
                                    ''
                                )
                                    .toLowerCase()
                        )
                        .join(' ');

                    return haystack.includes(
                        search
                    );
                }
            );
        }

        if (
            status &&
            status !== 'all'
        ) {
            rows = rows.filter(
                (row) => {
                    const key =
                        statusKey(
                            row?.status
                        );

                    return (
                        key === status ||
                        normalizeStatus(
                            row?.status
                        ) === status
                    );
                }
            );
        }

        rows.sort(
            (a, b) => {
                const dateA =
                    new Date(
                        a?.created_at ||
                        0
                    ).getTime();

                const dateB =
                    new Date(
                        b?.created_at ||
                        0
                    ).getTime();

                const amountA =
                    amountNumber(
                        a?.amount
                    );

                const amountB =
                    amountNumber(
                        b?.amount
                    );

                switch (sort) {
                    case 'oldest':
                        return (
                            dateA -
                            dateB
                        );

                    case 'highest':
                        return (
                            amountB -
                            amountA
                        );

                    case 'lowest':
                        return (
                            amountA -
                            amountB
                        );

                    case 'newest':
                    default:
                        return (
                            dateB -
                            dateA
                        );
                }
            }
        );

        return rows;
    };

    /* =====================================================
       HISTORY ROW
       ===================================================== */

    const renderHistoryRow = (
        row
    ) => {
        const date =
            new Date(
                row?.created_at
            );

        const validDate =
            !Number.isNaN(
                date.getTime()
            );

        const dateText =
            validDate
                ? date.toLocaleDateString(
                    'id-ID',
                    {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        timeZone:
                            TIMEZONE
                    }
                )
                : '-';

        const timeText =
            validDate
                ? date.toLocaleTimeString(
                    'id-ID',
                    {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone:
                            TIMEZONE
                    }
                )
                : '';

        const status =
            statusKey(
                row?.status
            );

        const method =
            row?.method ||
            row?.method_type ||
            '-';

        const ticket =
            row?.ticket_code ||
            row?.id ||
            '-';

        const mode =
            row?.mode ||
            row?.withdrawal_mode ||
            'manual';

        return `
            <div class="history-row">
                <div class="history-date">
                    <strong>
                        ${esc(
                            dateText
                        )}
                    </strong>

                    <small>
                        ${esc(
                            timeText
                        )}
                    </small>
                </div>

                <div class="history-amount">
                    <strong>
                        ${esc(
                            money(
                                row?.amount
                            )
                        )}
                    </strong>
                </div>

                <div class="history-method">
                    <strong>
                        <i
                            class="fa-solid ${esc(
                                methodIcon(
                                    method
                                )
                            )}"
                        ></i>
                        ${esc(
                            methodLabel(
                                method
                            )
                        )}
                    </strong>

                    <small>
                        ${esc(
                            row?.account_number ||
                            '-'
                        )}
                    </small>
                </div>

                <div class="history-type">
                    ${esc(
                        String(
                            mode
                        ).replace(
                            /_/g,
                            ' '
                        )
                    )}
                </div>

                <div>
                    <span
                        class="status-badge ${esc(
                            status
                        )}"
                    >
                        ${esc(
                            statusLabel(
                                row?.status
                            )
                        )}
                    </span>
                </div>

                <div class="ticket-code">
                    #${esc(
                        ticket
                    )}
                </div>
            </div>
        `;
    };

    /* =====================================================
       PAGINATION
       ===================================================== */

    const renderPagination = (
        totalItems
    ) => {
        if (!historyPagination) {
            return;
        }

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalItems /
                    HISTORY_PER_PAGE
                )
            );

        if (
            totalPages <= 1
        ) {
            historyPagination.innerHTML =
                '';

            historyPagination.classList.add(
                'hidden'
            );

            return;
        }

        historyPagination.classList.remove(
            'hidden'
        );

        historyPage =
            Math.min(
                historyPage,
                totalPages
            );

        const buttons = [];

        buttons.push(`
            <button
                type="button"
                class="pagination-prev"
                data-page="${
                    historyPage - 1
                }"
                ${
                    historyPage <= 1
                        ? 'disabled'
                        : ''
                }
                aria-label="Halaman sebelumnya"
            >
                <i class="fa-solid fa-chevron-left"></i>
            </button>
        `);

        let start =
            Math.max(
                1,
                historyPage - 2
            );

        let end =
            Math.min(
                totalPages,
                historyPage + 2
            );

        if (historyPage <= 3) {
            end =
                Math.min(
                    totalPages,
                    5
                );
        }

        if (
            historyPage >=
            totalPages - 2
        ) {
            start =
                Math.max(
                    1,
                    totalPages - 4
                );
        }

        for (
            let page = start;
            page <= end;
            page++
        ) {
            buttons.push(`
                <button
                    type="button"
                    class="${
                        page ===
                        historyPage
                            ? 'active'
                            : ''
                    }"
                    data-page="${page}"
                    ${
                        page ===
                        historyPage
                            ? 'aria-current="page"'
                            : ''
                    }
                >
                    ${page}
                </button>
            `);
        }

        buttons.push(`
            <button
                type="button"
                class="pagination-next"
                data-page="${
                    historyPage + 1
                }"
                ${
                    historyPage >=
                    totalPages
                        ? 'disabled'
                        : ''
                }
                aria-label="Halaman berikutnya"
            >
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `);

        historyPagination.innerHTML =
            buttons.join('');

        historyPagination
            .querySelectorAll(
                'button[data-page]'
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        'click',
                        () => {
                            const page =
                                Number(
                                    button.dataset
                                        .page
                                );

                            if (
                                !Number.isFinite(
                                    page
                                ) ||
                                page < 1 ||
                                page >
                                    totalPages
                            ) {
                                return;
                            }

                            historyPage =
                                page;

                            renderHistory();
                        }
                    );
                }
            );
    };

    /* =====================================================
       HISTORY
       ===================================================== */

    const renderHistory = () => {
        if (!historyEl) {
            return;
        }

        const filtered =
            getHistoryFiltered();

        const total =
            filtered.length;

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total /
                    HISTORY_PER_PAGE
                )
            );

        if (
            historyPage >
            totalPages
        ) {
            historyPage =
                totalPages;
        }

        const start =
            (
                historyPage -
                1
            ) *
            HISTORY_PER_PAGE;

        const pageRows =
            filtered.slice(
                start,
                start +
                    HISTORY_PER_PAGE
            );

        if (historyCount) {
            historyCount.textContent =
                `${total} transaksi`;
        }

        if (historyResult) {
            if (
                total === 0
            ) {
                historyResult.textContent =
                    withdrawals.length
                        ? 'Tidak ada transaksi yang sesuai filter.'
                        : 'Belum ada transaksi withdraw.';
            } else {
                historyResult.textContent =
                    `Menampilkan ${
                        start + 1
                    }–${
                        Math.min(
                            start +
                                HISTORY_PER_PAGE,
                            total
                        )
                    } dari ${total} transaksi`;
            }
        }

        if (!pageRows.length) {
            historyEl.innerHTML = `
                <div class="history-empty">
                    <i class="fa-solid fa-receipt"></i>

                    <strong>
                        ${
                            withdrawals.length
                                ? 'Tidak ada hasil'
                                : 'Belum ada pengajuan withdraw'
                        }
                    </strong>

                    <span>
                        ${
                            withdrawals.length
                                ? 'Coba ubah pencarian atau filter riwayat.'
                                : 'Riwayat withdraw kamu akan muncul di sini.'
                        }
                    </span>
                </div>
            `;

            renderPagination(
                total
            );

            return;
        }

        historyEl.innerHTML =
            pageRows
                .map(
                    renderHistoryRow
                )
                .join('');

        renderPagination(
            total
        );
    };

    /* =====================================================
       HISTORY LOADING
       ===================================================== */

    const renderHistoryLoading = () => {
        if (!historyEl) {
            return;
        }

        historyEl.innerHTML = `
            <div class="history-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Memuat riwayat...
            </div>
        `;

        if (historyResult) {
            historyResult.textContent =
                'Memuat data...';
        }
    };

    /* =====================================================
       HISTORY ERROR
       ===================================================== */

    const renderHistoryError = (
        message
    ) => {
        if (!historyEl) {
            return;
        }

        historyEl.innerHTML = `
            <div class="history-error">
                <strong>
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Riwayat gagal dimuat
                </strong>

                <span>
                    ${esc(
                        message ||
                        'Terjadi kesalahan saat mengambil riwayat.'
                    )}
                </span>

                <button
                    class="withdraw-submit primary"
                    id="retryHistory"
                    type="button"
                    style="width:auto;padding:8px 12px;"
                >
                    <i class="fa-solid fa-rotate"></i>
                    Coba lagi
                </button>
            </div>
        `;

        $('retryHistory')
            ?.addEventListener(
                'click',
                loadWallet
            );
    };

    /* =====================================================
       CONFIRMATION MODAL
       ===================================================== */

    const closeConfirmModal = () => {
        if (!withdrawConfirmModal) {
            return;
        }

        withdrawConfirmModal.classList.add(
            'hidden'
        );

        withdrawConfirmModal.setAttribute(
            'aria-hidden',
            'true'
        );

        pendingWithdrawal =
            null;

        if (
            withdrawConfirmSubmit
        ) {
            withdrawConfirmSubmit.disabled =
                false;
        }
    };

    const openConfirmModal = (
        amount,
        mode
    ) => {
        const fee =
            mode === 'instant'
                ? INSTANT_FEE
                : getManualFee();

        const net =
            Math.max(
                0,
                amount - fee
            );

        pendingWithdrawal = {
            amount,
            mode,
            fee,
            net,
            method:
                methodEl?.value ||
                'ewallet',
            accountName:
                nameEl?.value
                    ?.trim() ||
                '',
            accountNumber:
                numberEl?.value
                    ?.trim() ||
                ''
        };

        if (confirmAmount) {
            confirmAmount.textContent =
                money(amount);
        }

        if (confirmFee) {
            confirmFee.textContent =
                money(fee);
        }

        if (confirmNet) {
            confirmNet.textContent =
                money(net);
        }

        if (confirmMethod) {
            confirmMethod.textContent =
                methodLabel(
                    pendingWithdrawal.method
                );
        }

        if (confirmAccountName) {
            confirmAccountName.textContent =
                pendingWithdrawal.accountName ||
                '-';
        }

        if (confirmAccount) {
            confirmAccount.textContent =
                pendingWithdrawal.accountNumber ||
                '-';
        }

        if (!withdrawConfirmModal) {
            /*
             * Fallback jika modal tidak tersedia.
             */
            return true;
        }

        withdrawConfirmModal.classList.remove(
            'hidden'
        );

        withdrawConfirmModal.setAttribute(
            'aria-hidden',
            'false'
        );

        setTimeout(
            () => {
                withdrawConfirmSubmit?.focus();
            },
            50
        );

        return false;
    };

    /* =====================================================
       VALIDATION
       ===================================================== */

    const validateCommon = (
        amount,
        mode
    ) => {
        if (
            !amount ||
            amount <= 0
        ) {
            return 'Nominal wajib diisi.';
        }

        /* ---------------------------------------------
           INSTANT
           --------------------------------------------- */

        if (
            mode === 'instant'
        ) {
            if (!isInstantOpen()) {
                return 'WD Instant sedang tidak tersedia.';
            }

            if (
                amount >
                INSTANT_MAX
            ) {
                return 'WD Instant maksimum Rp250.000 per transaksi.';
            }

            const today =
                calculateTodayInstantAmount();

            if (
                today +
                    amount >
                DAILY_LIMIT
            ) {
                const remaining =
                    Math.max(
                        0,
                        DAILY_LIMIT -
                            today
                    );

                return (
                    `Batas WD Instant harian hampir/` +
                    `sudah tercapai. Sisa limit hari ini ` +
                    `${money(remaining)}.`
                );
            }
        }

        /* ---------------------------------------------
           MANUAL
           --------------------------------------------- */

        if (mode === 'manual') {
            if (!isManualNormalHours()) {
                return `WD Manual sedang tutup. ${scheduleStatus?.reason || 'Silakan kembali pada jam operasional.'}`;
            }
            if (amount < MANUAL_MIN) {
                return 'WD Manual minimum Rp10.000.';
            }
        }

        /* ---------------------------------------------
           METHOD
           --------------------------------------------- */

        const method =
            String(
                methodEl?.value ||
                ''
            ).trim();

        if (!method) {
            return 'Pilih metode pencairan terlebih dahulu.';
        }

        /* ---------------------------------------------
           ACCOUNT
           --------------------------------------------- */

        const accountName =
            String(
                nameEl?.value ||
                ''
            ).trim();

        const accountNumber =
            String(
                numberEl?.value ||
                ''
            ).trim();

        if (!accountName) {
            return 'Nama pemegang wajib diisi.';
        }

        if (!accountNumber) {
            return 'Nomor rekening / e-wallet wajib diisi.';
        }

        /* ---------------------------------------------
           BALANCE
           --------------------------------------------- */

        const balance =
            getBalance();

        const fee =
            mode === 'instant'
                ? INSTANT_FEE
                : getManualFee();

        const totalDebit =
            amount + fee;

        if (
            totalDebit >
            balance
        ) {
            return (
                `Saldo tidak mencukupi. ` +
                `Dibutuhkan ${money(
                    totalDebit
                )} ` +
                `(nominal ${money(
                    amount
                )} + fee ${money(
                    fee
                )}).`
            );
        }

        return null;
    };

    /* =====================================================
       RPC REQUEST
       ===================================================== */

    const executeWithdrawal = async (
        amount,
        mode
    ) => {
        const supabase =
            getSupabase();

        if (!supabase) {
            throw new Error(
                'Supabase belum siap. Silakan refresh halaman.'
            );
        }

        const validation =
            validateCommon(
                amount,
                mode
            );

        if (validation) {
            throw new Error(
                validation
            );
        }

        // Recheck the schedule immediately before submitting.
        if (mode === 'manual') {
            const { data: schedule, error: scheduleError } =
                await supabase.rpc('withdrawal_schedule_status');
            if (scheduleError) throw scheduleError;
            scheduleStatus = schedule || scheduleStatus;
            renderManualSchedule();
            if (!scheduleStatus?.open) {
                throw new Error(`WD Manual sedang tutup. ${scheduleStatus?.reason || ''}`.trim());
            }
        }

        /*
         * Fee tetap dihitung ulang oleh database/RPC.
         * Frontend hanya preview.
         */
        const response =
            await supabase.rpc(
                'request_withdrawal_v2',
                {
                    p_amount:
                        amount,

                    p_mode:
                        mode,

                    p_method:
                        methodEl?.value ||
                        'ewallet',

                    p_account_name:
                        nameEl?.value
                            ?.trim() ||
                        '',

                    p_account_number:
                        numberEl?.value
                            ?.trim() ||
                        ''
                }
            );

        if (
            response?.error
        ) {
            throw response.error;
        }

        return response?.data;
    };

    /* =====================================================
       REQUEST WITHDRAWAL
       ===================================================== */

    const requestWithdrawal = async (
        amount,
        mode
    ) => {
        if (isSubmitting) {
            return;
        }

        const validation =
            validateCommon(
                amount,
                mode
            );

        if (validation) {
            toast(
                validation,
                'error'
            );

            return;
        }

        /*
         * Tampilkan confirmation modal
         * sebelum RPC.
         */
        const modalOpened =
            openConfirmModal(
                amount,
                mode
            );

        if (
            modalOpened === false
        ) {
            return;
        }

        await submitConfirmedWithdrawal();
    };

    /* =====================================================
       CONFIRMED SUBMIT
       ===================================================== */

    const submitConfirmedWithdrawal =
        async () => {
            if (
                isSubmitting ||
                !pendingWithdrawal
            ) {
                return;
            }

            const {
                amount,
                mode
            } = pendingWithdrawal;

            const button =
                mode === 'instant'
                    ? instantSubmit
                    : manualSubmit;

            isSubmitting = true;

            if (
                withdrawConfirmSubmit
            ) {
                withdrawConfirmSubmit.disabled =
                    true;

                withdrawConfirmSubmit.dataset
                    .originalHtml =
                    withdrawConfirmSubmit.innerHTML;

                withdrawConfirmSubmit.classList.add(
                    'loading'
                );

                withdrawConfirmSubmit.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Memproses...</span>
                `;
            }

            setButtonLoading(
                button,
                true,
                mode === 'instant'
                    ? 'Mengajukan WD...'
                    : 'Mengirim pengajuan...'
            );

            try {
                await executeWithdrawal(
                    amount,
                    mode
                );

                closeConfirmModal();

                toast(
                    mode === 'instant'
                        ? 'WD Instant berhasil diajukan.'
                        : (
                            isManualOffHours()
                                ? 'WD Manual berhasil diajukan. Fee tambahan di luar jam normal berlaku.'
                                : 'WD Manual berhasil diajukan.'
                        ),
                    'success'
                );

                /*
                 * Refresh data tanpa reload seluruh halaman.
                 */
                isSubmitting = false;

                setButtonLoading(
                    button,
                    false
                );

                await loadWallet({
                    silent: true
                });
            } catch (error) {
                console.error(
                    'Withdrawal error:',
                    error
                );

                toast(
                    error?.message ||
                    'Withdraw gagal diproses.',
                    'error'
                );

                if (
                    withdrawConfirmSubmit
                ) {
                    withdrawConfirmSubmit.disabled =
                        false;

                    withdrawConfirmSubmit.classList.remove(
                        'loading'
                    );

                    if (
                        withdrawConfirmSubmit
                            .dataset
                            .originalHtml
                    ) {
                        withdrawConfirmSubmit.innerHTML =
                            withdrawConfirmSubmit
                                .dataset
                                .originalHtml;

                        delete withdrawConfirmSubmit
                            .dataset
                            .originalHtml;
                    }
                }

                setButtonLoading(
                    button,
                    false
                );

                isSubmitting = false;
            }
        };

    /* =====================================================
       LOAD WALLET
       ===================================================== */

    async function loadWallet(
        options = {}
    ) {
        const {
            silent = false
        } = options;

        const tc =
            getTC();

        const supabase =
            getSupabase();

        if (!supabase) {
            renderHistoryError(
                'Supabase belum siap. Periksa js/supabase.js.'
            );

            return;
        }

        if (
            isLoading &&
            !silent
        ) {
            return;
        }

        isLoading = true;

        if (!silent) {
            renderHistoryLoading();
        }

        try {
            /*
             * Profile melalui TC bila tersedia.
             */
            if (
                tc &&
                typeof tc.profile ===
                    'function'
            ) {
                profile =
                    await tc.profile();
            }

            /*
             * Fallback Supabase Auth.
             */
            if (!profile) {
                const authResult =
                    await supabase.auth.getUser();

                if (
                    authResult?.error
                ) {
                    throw authResult.error;
                }

                const user =
                    authResult?.data
                        ?.user;

                if (!user) {
                    location.replace(
                        'login.html'
                    );

                    return;
                }

                profile = {
                    id: user.id,
                    auth_user_id:
                        user.id,
                    email:
                        user.email ||
                        ''
                };
            }

            if (!profile?.id) {
                location.replace(
                    'login.html'
                );

                return;
            }

            const [
                walletResponse,
                withdrawalsResponse,
                methodsResponse
            ] = await Promise.all([
                supabase
                    .from('wallets')
                    .select('*')
                    .eq(
                        'user_id',
                        profile.id
                    )
                    .maybeSingle(),

                supabase
                    .from('withdrawals')
                    .select('*')
                    .eq(
                        'user_id',
                        profile.id
                    )
                    .order(
                        'created_at',
                        {
                            ascending:
                                false
                        }
                    )
                    .limit(100),

                supabase
                    .from(
                        'payment_methods'
                    )
                    .select('*')
                    .eq(
                        'user_id',
                        profile.id
                    )
                    .order(
                        'created_at',
                        {
                            ascending:
                                false
                        }
                    )
            ]);

            if (
                walletResponse?.error
            ) {
                throw walletResponse.error;
            }

            if (
                withdrawalsResponse?.error
            ) {
                throw withdrawalsResponse.error;
            }

            if (
                methodsResponse?.error
            ) {
                throw methodsResponse.error;
            }

            wallet =
                walletResponse?.data ||
                null;

            withdrawals =
                Array.isArray(
                    withdrawalsResponse?.data
                )
                    ? withdrawalsResponse.data
                    : [];

            paymentMethods =
                Array.isArray(
                    methodsResponse?.data
                )
                    ? methodsResponse.data
                    : [];

            /*
             * Preserve selected method when possible.
             */
            const previousMethodId =
                selectedPaymentMethod?.id;

            selectedPaymentMethod =
                paymentMethods.find(
                    (item) =>
                        String(
                            item.id
                        ) ===
                        String(
                            previousMethodId
                        )
                ) ||
                paymentMethods[0] ||
                null;

            renderSummary();

            renderDailyLimit();

            renderInstantAmounts();

            renderPaymentMethods();

            await loadWithdrawalSchedule();

            if (
                selectedPaymentMethod
            ) {
                applyPaymentMethod(
                    selectedPaymentMethod
                );
            }

            renderFeePreview();

            /*
             * Reset page hanya jika sebelumnya
             * sudah melewati jumlah halaman.
             */
            const filtered =
                getHistoryFiltered();

            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        filtered.length /
                            HISTORY_PER_PAGE
                    )
                );

            if (
                historyPage >
                totalPages
            ) {
                historyPage =
                    totalPages;
            }

            renderHistory();
        } catch (error) {
            console.error(
                'Withdrawals load error:',
                error
            );

            if (historyCount) {
                historyCount.textContent =
                    'Gagal';
            }

            renderHistoryError(
                error?.message ||
                'Data withdraw gagal dimuat.'
            );
        } finally {
            isLoading = false;

            setButtonLoading(
                refreshWithdraw,
                false
            );
        }
    }

    /* =====================================================
       REFRESH
       ===================================================== */

    refreshWithdraw?.addEventListener(
        'click',
        async () => {
            if (isLoading) {
                return;
            }

            setButtonLoading(
                refreshWithdraw,
                true,
                'Memuat...'
            );

            await loadWallet({
                silent: false
            });
        }
    );

    /* =====================================================
       INSTANT SUBMIT
       ===================================================== */

    instantSubmit?.addEventListener(
        'click',
        () => {
            requestWithdrawal(
                selectedInstantAmount,
                'instant'
            );
        }
    );

    /* =====================================================
       MANUAL FORM
       ===================================================== */

    form?.addEventListener(
        'submit',
        (event) => {
            event.preventDefault();

            requestWithdrawal(
                amountNumber(
                    amountEl?.value
                ),
                'manual'
            );
        }
    );

    /* =====================================================
       PAYMENT METHOD
       ===================================================== */

    methodEl?.addEventListener(
        'change',
        () => {
            renderManualSchedule();
            renderFeePreview();
        }
    );

    /* =====================================================
       AMOUNT
       ===================================================== */

    amountEl?.addEventListener(
        'input',
        () => {
            let value =
                amountNumber(
                    amountEl.value
                );

            if (value < 0) {
                value = 0;
            }

            amountEl.value =
                value || '';

            renderFeePreview();
        }
    );

    /* =====================================================
       ACCOUNT NAME
       ===================================================== */

    nameEl?.addEventListener(
        'input',
        () => {
            /*
             * Tidak melakukan uppercase/
             * perubahan isi agar nama tetap
             * sesuai payment method.
             */
            if (
                nameEl.value.length >
                100
            ) {
                nameEl.value =
                    nameEl.value.slice(
                        0,
                        100
                    );
            }
        }
    );

    /* =====================================================
       ACCOUNT NUMBER
       ===================================================== */

    numberEl?.addEventListener(
        'input',
        () => {
            numberEl.value =
                numberEl.value
                    .replace(
                        /\s+/g,
                        ''
                    )
                    .trim();
        }
    );

    /* =====================================================
       HISTORY SEARCH
       ===================================================== */

    historySearch?.addEventListener(
        'input',
        () => {
            historyPage = 1;

            renderHistory();
        }
    );

    /* =====================================================
       CLEAR HISTORY SEARCH
       ===================================================== */

    clearHistorySearch?.addEventListener(
        'click',
        () => {
            if (historySearch) {
                historySearch.value =
                    '';
            }

            historyPage = 1;

            renderHistory();
        }
    );

    /* =====================================================
       HISTORY STATUS
       ===================================================== */

    historyStatus?.addEventListener(
        'change',
        () => {
            historyPage = 1;

            renderHistory();
        }
    );

    /* =====================================================
       HISTORY SORT
       ===================================================== */

    historySort?.addEventListener(
        'change',
        () => {
            historyPage = 1;

            renderHistory();
        }
    );

    /* =====================================================
       ADMIN URGENT
       ===================================================== */

    $('urgent')?.addEventListener(
        'click',
        () => {
            toast(
                'Silakan hubungi admin melalui kanal bantuan PasTele.',
                'success'
            );
        }
    );

    /* =====================================================
       CONFIRM MODAL EVENTS
       ===================================================== */

    withdrawConfirmClose?.addEventListener(
        'click',
        closeConfirmModal
    );

    withdrawConfirmCancel?.addEventListener(
        'click',
        closeConfirmModal
    );

    withdrawConfirmSubmit?.addEventListener(
        'click',
        async () => {
            await submitConfirmedWithdrawal();
        }
    );

    /*
     * Klik backdrop menutup modal.
     */
    withdrawConfirmModal?.addEventListener(
        'click',
        (event) => {
            if (
                event.target ===
                withdrawConfirmModal
            ) {
                closeConfirmModal();
            }
        }
    );

    /* =====================================================
       ESCAPE MODAL
       ===================================================== */

    document.addEventListener(
        'keydown',
        (event) => {
            if (
                event.key ===
                'Escape'
            ) {
                if (
                    withdrawConfirmModal &&
                    !withdrawConfirmModal.classList.contains(
                        'hidden'
                    ) &&
                    !isSubmitting
                ) {
                    closeConfirmModal();
                }
            }
        }
    );

    /* =====================================================
       REFRESH SCHEDULE / FEE
       ===================================================== */

    /*
     * Status dan fee diperbarui setiap menit.
     */
    setInterval(
        () => {
            loadWithdrawalSchedule();
            renderFeePreview();
        },
        60 * 1000
    );

    /* =====================================================
       PAGE VISIBILITY
       ===================================================== */

    /*
     * Ketika user kembali ke tab aplikasi,
     * sinkronkan saldo/history.
     */
    document.addEventListener(
        'visibilitychange',
        () => {
            if (
                document.visibilityState ===
                'visible'
            ) {
                loadWithdrawalSchedule();
                renderFeePreview();
            }
        }
    );

    /* =====================================================
       INITIAL RENDER
       ===================================================== */

    renderManualSchedule();

    renderFeePreview();

    renderInstantAmounts();

    /* =====================================================
       START
       ===================================================== */

    await loadWallet();
});




/* Page-ready marker */
document.documentElement.classList.add("pastele-ready");