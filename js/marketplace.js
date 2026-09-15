window.PASTELE_MARKETPLACE_PUBLIC = true;
/* PasTele — self-contained marketplace page script. One HTML -> one JS -> one CSS. */
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
    // Marketplace is a public route, including clean URLs /marketplace and /marketplace/.
    // Keep this local to the navbar scope so guest rendering never throws a ReferenceError.
    const isMarketplacePath =
      !isAdmin && /(^|\/)marketplace(?:\.html)?(?:\/)?$/i.test(location.pathname);
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
     * Marketplace is public. Guests must still get the same navbar
     * shell without being forced to authenticate. Other pages keep
     * the original authenticated-only navbar behavior.
     */
    const isGuest = !user;
    if (isGuest && !isMarketplacePath) {
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
      (isGuest ? 'Masuk' : 'Account');
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
    const groups = isGuest
      ? [
          [
            'Menu',
            [
              ['marketplace.html', 'fa-store', 'Marketplace'],
              ['about.html', 'fa-circle-info', 'Tentang']
            ]
          ],
          [
            'Akun',
            [
              ['login.html', 'fa-right-to-bracket', 'Login'],
              ['register.html', 'fa-user-plus', 'Daftar']
            ]
          ]
        ]
      : isAdmin
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
            href="${base}${isAdmin ? 'index.html' : (isGuest ? 'marketplace.html' : 'dashboard.html')}"
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
    if (isGuest && logoutButton) {
      logoutButton.classList.remove('logout');
      logoutButton.innerHTML = `
        <span class="pt-link-icon"><i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i></span>
        <span class="pt-link-label">Login / Daftar</span>
        <i class="fa-solid fa-arrow-right pt-link-arrow" aria-hidden="true"></i>
      `;
    }
    const balanceElement =
      document.getElementById('ptBalance');
    const notificationElement =
      document.getElementById('ptNotif');
    const themeText =
      document.getElementById('ptThemeText');

    /* Guest marketplace: keep the profile control useful but never
       expose private account actions or a fake logout/session state. */
    if (isGuest && dropdown) {
      dropdown.innerHTML = `
        <div class="pt-profile">
          <span class="pt-avatar pt-avatar-lg">
            <i class="fa-solid fa-user" aria-hidden="true"></i>
          </span>
          <div class="pt-profile-text">
            <strong>Pengunjung</strong>
            <small>Marketplace publik</small>
          </div>
        </div>
        <div class="pt-guest-actions">
          <a class="pt-profile-link" href="${base}login.html">
            <i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>
            <span>Login</span>
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <a class="pt-profile-link" href="${base}register.html">
            <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
            <span>Buat akun</span>
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      `;
    }
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
        if (isGuest) {
          location.href = `${base}login.html`;
          return;
        }
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
  const isMarketplacePath = !isAdminPath && /(^|\/)marketplace(?:\.html)?(?:\/)?$/i.test(location.pathname);
  const isPublic = Boolean(window.PASTELE_MARKETPLACE_PUBLIC) || (!isAdminPath && (PUBLIC.has(file) || isMarketplacePath));
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
    // Marketplace is always public. Never show the session-expired lock here.
    if (isPublic || window.PASTELE_MARKETPLACE_PUBLIC) return;
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
   PasTele — Marketplace
   FINAL SQL SYNC
   PUBLIC MARKETPLACE
   - Guest dapat browse marketplace
   - Guest dapat membuka product
   - Checkout/purchase ditangani oleh product/payment flow
   - Tidak membutuhkan auth untuk membaca marketplace
   SQL SOURCE:
     marketplace_public
     products
     telegram_products
     telegram_channels
     content_likes
     analytics_events
   IMPORTANT:
   - Tidak menggunakan content_comments
   - Tidak mengambil content dari marketplace_public
   - Tidak menggunakan kolom legacy_published_flag
   - Tidak menggunakan kolom yang tidak ada di SQL
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  /* =======================================================
     DOM
     ======================================================= */
  const $ = (id) =>
    document.getElementById(id);
  const q =
    $("q");
  const market =
    $("market");
  /* =======================================================
     STATE
     ======================================================= */
  let filter = "all";
  let items = [];
  let page = 1;
  const pageSize = 10;
  /* =======================================================
     GLOBAL HELPERS
     ======================================================= */
  const TC =
    window.TC || {};
  const esc = (value) => {
    const text =
      String(value ?? "");
    if (
      typeof TC.esc === "function"
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
  const number = (value) => {
    const n =
      Number(value ?? 0);
    return Number.isFinite(n)
      ? n
      : 0;
  };
  const lower = (value) => {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  };
  const formatNumber = (value) => {
    return number(value)
      .toLocaleString("id-ID");
  };
  const formatMoney = (value) => {
    const amount =
      number(value);
    if (
      typeof TC.money ===
      "function"
    ) {
      return TC.money(amount);
    }
    return `Rp${amount.toLocaleString("id-ID")}`;
  };
  const toast = (
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
  /* =======================================================
     SUPABASE
     ======================================================= */
  const getSupabase = () => {
    return (
      window.sb ||
      window.supabaseClient ||
      window.supabase ||
      null
    );
  };
  /* =======================================================
     TYPE NORMALIZATION
     ======================================================= */
  const typeOf = (item) => {
    const type =
      lower(item?.type);
    if (
      type === "pastelink" ||
      type === "paste-link" ||
      type === "paste_link"
    ) {
      return "pastelink";
    }
    if (
      type === "telegram_channel" ||
      type === "channel"
    ) {
      return "channel";
    }
    if (
      type === "telegram_group" ||
      type === "group"
    ) {
      return "group";
    }
    if (
      type === "telegram_code" ||
      type === "code"
    ) {
      return "code";
    }
    if (
      type === "paste"
    ) {
      return "paste";
    }
    return type || "link";
  };
  const icon = (type) => {
    switch (
      typeOf({
        type
      })
    ) {
      case "code":
        return "fa-code";
      case "channel":
        return "fa-broadcast-tower";
      case "group":
        return "fa-users";
      case "paste":
        return "fa-file-lines";
      case "pastelink":
        return "fa-link";
      case "link":
      default:
        return "fa-link";
    }
  };
  const typeLabel = (type) => {
    switch (
      typeOf({
        type
      })
    ) {
      case "code":
        return "Code";
      case "channel":
        return "Channel";
      case "group":
        return "Group";
      case "paste":
        return "Paste";
      case "pastelink":
        return "PasteLink";
      case "link":
      default:
        return "Link";
    }
  };
  /* =======================================================
     ACCESS
     ======================================================= */
  const accessType = (
    item
  ) => {
    const access =
      lower(
        item?.access_type
      );
    const price =
      number(
        item?.price
      );
    if (
      access === "paid" ||
      price > 0
    ) {
      return "paid";
    }
    return "free";
  };
  const priceText = (
    item
  ) => {
    const price =
      number(
        item?.price
      );
    return price > 0
      ? formatMoney(price)
      : "FREE";
  };
  /* =======================================================
     CREATOR
     ======================================================= */
  const creatorText = (item) => {
    const username = String(item?.creator_username || "").trim().replace(/^@/, "");
    if (username) return "@" + username;
    const name = String(item?.creator_name || "").trim();
    return name || "Creator";
  };

  // Canonical target_type used by the database RPCs.
  const canonicalTargetType = (value) => {
    const t = typeOf(typeof value === "string" ? { type: value } : (value || {}));
    if (t === "code") return "telegram_product";
    if (t === "pastelink") return "pastelink";
    if (t === "paste") return "paste";
    if (t === "channel") return "channel";
    if (t === "group") return "group";
    if (t === "link") return "link";
    return "product";
  };
  /* =======================================================
     STORED STATS
     ======================================================= */
  const viewsText = (
    item
  ) => {
    return formatNumber(
      item?.views
    );
  };
  const salesText = (
    item
  ) => {
    return formatNumber(
      item?.sales_count
    );
  };
  const likesText = (
    item
  ) => {
    return formatNumber(
      item?.likes_count
    );
  };
  const sharesText = (
    item
  ) => {
    return formatNumber(
      item?.shares_count
    );
  };
  const commentsText = (
    item
  ) => {
    return formatNumber(
      item?.comments_count
    );
  };
  /* =======================================================
     PRODUCT URL
     ======================================================= */
  const productUrl = (item) => {
    const id = item?.id;
    const slug = String(item?.slug || "").trim();
    const type = typeOf(item);
    const access = accessType(item) === "paid" ? "p" : "f";
    if (slug) {
      if (type === "pastelink") return `/p/${encodeURIComponent(slug)}`;
      if (type === "code") return `/c/${access}/${encodeURIComponent(slug)}`;
      if (type === "channel") return `/ch/${access}/${encodeURIComponent(slug)}`;
      if (type === "group") return `/g/${access}/${encodeURIComponent(slug)}`;
      if (type === "paste") return `/paste/${encodeURIComponent(slug)}`;
    }
    return id ? `product.html?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}` : "product.html";
  };
  /* =======================================================
     FILTER
     ======================================================= */
  function matchesFilter(
    item
  ) {
    const type =
      typeOf(item);
    const access =
      accessType(item);
    if (
      filter === "all"
    ) {
      return true;
    }
    if (
      filter === "free" ||
      filter === "paid"
    ) {
      return (
        access === filter
      );
    }
    return (
      type === filter
    );
  }
  /* =======================================================
     SEARCH
     ======================================================= */
  function matchesSearch(
    item
  ) {
    const query =
      lower(
        q?.value
      );
    if (!query) {
      return true;
    }
    const searchable = [
      item?.title,
      item?.creator_name,
      item?.creator_username,
      item?.category,
      item?.description,
      item?.type,
      item?.access_type
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined
      )
      .join(" ")
      .toLowerCase();
    return searchable.includes(
      query
    );
  }
  /* =======================================================
     FILTERED ITEMS
     ======================================================= */
  function filteredItems() {
    return items.filter(
      (item) =>
        matchesFilter(item) &&
        matchesSearch(item)
    );
  }
  /* =======================================================
     THUMBNAIL
     ======================================================= */
  const thumbnailHtml = (
    item,
    type,
    title
  ) => {
    const thumbnail =
      String(
        item?.thumbnail_url || ""
      ).trim();
    if (!thumbnail) {
      return `
        <span class="product-thumb-fallback">
          <i
            class="fa-solid ${icon(type)}"
            aria-hidden="true"
          ></i>
        </span>
      `;
    }
    return `
      <img
        loading="lazy"
        src="${esc(thumbnail)}"
        alt="${esc(title)}"
        onerror="
          this.style.display='none';
          const fallback=this.parentElement?.querySelector('.product-thumb-fallback');
          if(fallback) fallback.hidden=false;
        "
      >
      <span
        class="product-thumb-fallback"
        hidden
      >
        <i
          class="fa-solid ${icon(type)}"
          aria-hidden="true"
        ></i>
      </span>
    `;
  };
  /* =======================================================
     PRODUCT CARD
     ======================================================= */
  function card(
    item
  ) {
    const type =
      typeOf(item);
    const access =
      accessType(item);
    const title =
      String(
        item?.title ||
        "Untitled"
      );
    const creator =
      creatorText(item);
    const description =
      String(
        item?.description ||
        ""
      ).trim();
    const href =
      productUrl(item);
    const ctaLabel = access === "paid" ? "Beli Sekarang" : "Ambil Sekarang";
    return `
      <article class="product-card" data-share-id="${esc(item?.id||'')}" data-share-type="${esc(type)}" data-share-owner="${esc(item?.owner_id||'')}" data-share-url="${esc(href)}">
      <button type="button" class="product-favorite" data-favorite-id="${esc(item?.id||'')}" aria-label="Favorit ${esc(title)}">
        <i class="fa-regular fa-heart" aria-hidden="true"></i>
      </button>
      <button type="button" class="product-share" data-share-card aria-label="Bagikan ${esc(title)}">
        <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
      </button>
      <a class="product-card-link" href="${esc(href)}" aria-label="Buka ${esc(title)}">
        <!-- THUMBNAIL -->
        <div class="product-thumb">
          ${thumbnailHtml(
            item,
            type,
            title
          )}
          <span
            class="product-access ${access}"
          >
            <i
              class="fa-solid ${
                access === "paid"
                  ? "fa-lock"
                  : "fa-unlock"
              }"
              aria-hidden="true"
            ></i>
            ${
              access === "paid"
                ? "PAID"
                : "FREE"
            }
          </span>
        </div>
        <!-- BODY -->
        <div class="product-body">
          <span class="product-type">
            <i
              class="fa-solid ${icon(type)}"
              aria-hidden="true"
            ></i>
            ${esc(
              typeLabel(type)
            )}
          </span>
          <h3 class="product-title">
            ${esc(title)}
          </h3>
          ${
            description
              ? `
                <p class="product-description">
                  ${esc(
                    description
                  )}
                </p>
              `
              : ""
          }
          <div class="product-creator">
            <i class="fa-solid ${type === "code" ? "fa-robot" : type === "channel" ? "fa-broadcast-tower" : type === "group" ? "fa-users" : type === "pastelink" ? "fa-link" : "fa-user"}" aria-hidden="true"></i>
            <span>
              ${esc(
                type === "code" && item?.bot_username ? "Bot @" + String(item.bot_username).replace(/^@/, "") :
                (type === "channel" || type === "group") && (item?.channel_name || item?.channel_username) ?
                  ((type === "group" ? "Group VIP / Chat" : "Channel") + " • " + (item.channel_name || "@" + String(item.channel_username).replace(/^@/, ""))) :
                type === "pastelink" ? "PasteLink • " + creator :
                creator
              )}
            </span>
          </div>
          <!-- ENGAGEMENT -->
          <div class="market-card-stats" aria-label="Statistik konten">
            <span title="Dilihat">
              <i class="fa-solid fa-eye" aria-hidden="true"></i>
              ${viewsText(item)}
            </span>
            <span class="sold" title="Terjual">
              <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
              ${salesText(item)}
            </span>
            <span class="like" title="Like">
              <i class="fa-solid fa-heart" aria-hidden="true"></i>
              ${likesText(item)}
            </span>
            <span class="share" title="Share">
              <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
              ${sharesText(item)}
            </span>
            <span class="comment" title="Komentar">
              <i class="fa-solid fa-comment" aria-hidden="true"></i>
              ${commentsText(item)}
            </span>
          </div>
          <!-- BOTTOM -->
          <div class="product-bottom">
            <strong
              class="product-price ${
                access === "free" ? "free" : ""
              }"
            >
              ${priceText(item)}
            </strong>
          </div>
          <span class="product-cta ${access === "free" ? "free" : ""}">
            <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
            ${ctaLabel}
          </span>
        </div>
      </a>
    `;
  }
  /* =======================================================
     TOP LIST
     ======================================================= */
  function list(
    id,
    array
  ) {
    const element =
      $(id);
    if (!element) {
      return;
    }
    const rows =
      array
        .slice(0, 10)
        .map(
          (
            item,
            index
          ) => {
            const type =
              typeOf(item);
            const href =
              productUrl(item);
            const access =
              accessType(item);
            const title =
              item?.title ||
              "Untitled";
            return `
              <a
                class="market-list-item"
                href="${esc(href)}"
                aria-label="Buka ${esc(title)}"
              >
                <span
                  class="market-rank-number ${
                    index === 0
                      ? "top-one"
                      : ""
                  }"
                >
                  #${index + 1}
                </span>
                <div class="market-list-main">
                  <strong
                    class="market-list-title"
                  >
                    ${esc(title)}
                  </strong>
                  <div class="market-list-meta">
                    <span>
                      <i
                        class="fa-solid ${icon(type)}"
                        aria-hidden="true"
                      ></i>
                      ${esc(
                        typeLabel(type)
                      )}
                    </span>
                    <span>
                      <i
                        class="fa-solid fa-eye"
                        aria-hidden="true"
                      ></i>
                      ${viewsText(item)}
                    </span>
                  </div>
                </div>
                <strong
                  class="market-list-price ${
                    access === "free"
                      ? "free"
                      : ""
                  }"
                >
                  ${priceText(item)}
                </strong>
              </a>
            `;
          }
        )
        .join("");
    element.innerHTML =
      rows ||
      `
        <div class="market-empty">
          <span>
            <i
              class="fa-solid fa-box-open"
              aria-hidden="true"
            ></i>
          </span>
          <div>
            <strong>
              Belum ada data
            </strong>
            <small>
              Belum ada konten pada kategori ini.
            </small>
          </div>
        </div>
      `;
  }
  /* =======================================================
     TOP LISTS
     ======================================================= */
  function renderTopLists() {
    const byViews = (
      a,
      b
    ) => {
      return (
        number(b?.views) -
        number(a?.views)
      );
    };
    list(
      "topLink",
      items
        .filter(
          (item) =>
            typeOf(item) ===
            "link"
        )
        .slice()
        .sort(byViews)
    );
    list(
      "topCode",
      items
        .filter(
          (item) =>
            typeOf(item) ===
            "code"
        )
        .slice()
        .sort(byViews)
    );
    list(
      "topChannel",
      items
        .filter(
          (item) =>
            typeOf(item) ===
            "channel"
        )
        .slice()
        .sort(byViews)
    );
    list(
      "topGroup",
      items
        .filter(
          (item) =>
            typeOf(item) ===
            "group"
        )
        .slice()
        .sort(byViews)
    );
    list(
      "topPaste",
      items
        .filter(item => typeOf(item) === "paste")
        .slice()
        .sort(byViews)
    );
  }
  /* =======================================================
     RESULT BAR
     ======================================================= */
  function updateResult(
    count
  ) {
    const resultTitle =
      $("resultTitle");
    const resultCount =
      $("resultCount");
    const reset =
      $("resetFilters");
    const search =
      q?.value?.trim();
    if (resultTitle) {
      if (
        filter === "all"
      ) {
        resultTitle.textContent =
          search
            ? "Hasil pencarian"
            : "Semua konten";
      } else if (
        filter === "free"
      ) {
        resultTitle.textContent =
          "Konten Free";
      } else if (
        filter === "paid"
      ) {
        resultTitle.textContent =
          "Konten Paid";
      } else {
        resultTitle.textContent =
          `${typeLabel(
            filter
          )} marketplace`;
      }
    }
    if (resultCount) {
      resultCount.textContent =
        `${count} konten`;
    }
    if (reset) {
      reset.hidden =
        filter === "all" &&
        !search;
    }
  }
  /* =======================================================
     PAGINATION
     ======================================================= */
  function renderPager(
    totalPages
  ) {
    const host =
      $("marketPagination");
    if (!host) {
      return;
    }
    if (
      totalPages <= 1
    ) {
      host.innerHTML = "";
      return;
    }
    const buttons = [];
    buttons.push(`
      <button
        type="button"
        ${
          page === 1
            ? "disabled"
            : ""
        }
        data-page="${page - 1}"
        aria-label="Halaman sebelumnya"
      >
        ‹
      </button>
    `);
    for (
      let i = 1;
      i <= totalPages;
      i++
    ) {
      const shouldShow =
        totalPages <= 9 ||
        i <= 2 ||
        i >= totalPages - 1 ||
        Math.abs(
          i - page
        ) <= 1;
      if (
        !shouldShow
      ) {
        if (
          i === 3 ||
          i === totalPages - 2
        ) {
          buttons.push(
            `<span aria-hidden="true">…</span>`
          );
        }
        continue;
      }
      buttons.push(`
        <button
          type="button"
          class="${
            i === page
              ? "active"
              : ""
          }"
          data-page="${i}"
          ${
            i === page
              ? 'aria-current="page"'
              : ""
          }
        >
          ${i}
        </button>
      `);
    }
    buttons.push(`
      <button
        type="button"
        ${
          page === totalPages
            ? "disabled"
            : ""
        }
        data-page="${page + 1}"
        aria-label="Halaman berikutnya"
      >
        ›
      </button>
    `);
    host.innerHTML =
      buttons.join("");
    host
      .querySelectorAll(
        "button[data-page]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              const nextPage =
                Number(
                  button.dataset.page
                );
              if (
                !Number.isFinite(
                  nextPage
                ) ||
                nextPage < 1 ||
                nextPage > totalPages ||
                nextPage === page
              ) {
                return;
              }
              page =
                nextPage;
              render();
              const section =
                document.querySelector(
                  ".marketplace-page"
                );
              if (section) {
                window.scrollTo({
                  top:
                    Math.max(
                      0,
                      section
                        .getBoundingClientRect()
                        .top +
                        window.scrollY -
                        24
                    ),
                  behavior:
                    "smooth"
                });
              }
            }
          );
        }
      );
  }
  /* =======================================================
     MAIN RENDER
     ======================================================= */
  /* =======================================================
     QUEST / ACTIVITY TRACKING
     Uses the existing analytics_events table so marketplace
     actions can be consumed by the Quest system without
     inventing a new database table.
     ======================================================= */
  function bindQuestActivity(){
    if(window.__PASTELE_MARKET_QUEST_BOUND__) return;
    window.__PASTELE_MARKET_QUEST_BOUND__=true;
    document.addEventListener("click", async e=>{
      const link=e.target.closest(".product-card-link");
      if(!link) return;
      const cardEl=link.closest("[data-share-id]");
      if(!cardEl) return;
      const id=cardEl.dataset.shareId;
      const rawType=cardEl.dataset.shareType;
      const type=canonicalTargetType(rawType);
      const owner=cardEl.dataset.shareOwner||null;
      if(!id || !window.sb?.rpc) return;
      try{
        await window.sb.rpc("record_content_view",{
          p_target_id:id,
          p_target_type:type,
          p_owner:owner
        });
      }catch(err){
        console.warn("[Marketplace] quest/view tracking unavailable",err);
      }
    });
  }

  function bindShareButtons(){
    if(window.__PASTELE_MARKET_SHARE_BOUND__) return;
    window.__PASTELE_MARKET_SHARE_BOUND__=true;
    document.addEventListener("click",async e=>{
      const btn=e.target.closest("[data-share-card]"); if(!btn) return;
      e.preventDefault(); e.stopPropagation();
      const card=btn.closest("[data-share-id]"); if(!card) return;
      const id=card.dataset.shareId,rawType=card.dataset.shareType, type=canonicalTargetType(rawType),owner=card.dataset.shareOwner||null;
      const url=new URL(card.dataset.shareUrl||location.href,location.origin).href;
      try { if(navigator.share) await navigator.share({title:"PasTele",url}); else await navigator.clipboard.writeText(url); } catch(err){ if(err?.name==='AbortError') return; try{await navigator.clipboard.writeText(url)}catch(_){} }
      try { await getSupabase().rpc("track_analytics",{p_event_type:"share",p_target_type:type,p_target_id:id,p_owner:owner}); } catch(err){ console.warn("[Marketplace] share tracking unavailable",err); }
      btn.classList.add("shared"); setTimeout(()=>btn.classList.remove("shared"),900);
    });
  }

  function render() {
    if (!market) {
      return;
    }
    const filtered =
      filteredItems()
        .slice()
        .sort(
          (a, b) =>
            new Date(
              b?.created_at ||
              0
            ) -
            new Date(
              a?.created_at ||
              0
            )
        );
    updateResult(
      filtered.length
    );
    const totalPages =
      Math.max(
        1,
        Math.ceil(
          filtered.length /
          pageSize
        )
      );
    page =
      Math.min(
        page,
        totalPages
      );
    const start =
      (page - 1) *
      pageSize;
    const pageItems =
      filtered.slice(
        start,
        start + pageSize
      );
    if (
      pageItems.length
    ) {
      market.innerHTML =
        pageItems
          .map(card)
          .join("");
    } else {
      const hasSearch =
        Boolean(
          q?.value?.trim()
        );
      const hasFilter =
        filter !== "all";
      market.innerHTML = `
        <div class="market-empty">
          <span>
            <i
              class="fa-solid ${
                hasSearch ||
                hasFilter
                  ? "fa-magnifying-glass"
                  : "fa-box-open"
              }"
              aria-hidden="true"
            ></i>
          </span>
          <div>
            <strong>
              ${
                hasSearch ||
                hasFilter
                  ? "Konten tidak ditemukan"
                  : "Belum ada konten"
              }
            </strong>
            <small>
              ${
                hasSearch ||
                hasFilter
                  ? "Coba ubah pencarian atau filter."
                  : "Konten yang dipublikasikan akan muncul di sini."
              }
            </small>
          </div>
        </div>
      `;
    }
    renderPager(
      totalPages
    );
    renderTopLists();
  }
  /* =======================================================
     LOADING
     ======================================================= */
  function setLoading() {
    if (!market) {
      return;
    }
    market.innerHTML = `
      <div class="market-loading">
        <span>
          <i
            class="fa-solid fa-circle-notch fa-spin"
            aria-hidden="true"
          ></i>
        </span>
        <div>
          <strong>
            Memuat marketplace
          </strong>
          <small>
            Mengambil produk terbaru...
          </small>
        </div>
      </div>
    `;
    const resultCount =
      $("resultCount");
    if (resultCount) {
      resultCount.textContent =
        "Memuat...";
    }
    const pagination =
      $("marketPagination");
    if (pagination) {
      pagination.innerHTML = "";
    }
  }
  /* =======================================================
     ERROR
     ======================================================= */
  function setError(
    message
  ) {
    if (!market) {
      return;
    }
    market.innerHTML = `
      <div class="market-error">
        <span>
          <i
            class="fa-solid fa-triangle-exclamation"
            aria-hidden="true"
          ></i>
        </span>
        <div>
          <strong>
            Marketplace gagal dimuat
          </strong>
          <small>
            ${esc(
              message
            )}
          </small>
          <button
            type="button"
            class="btn"
            id="retryMarket"
          >
            <i
              class="fa-solid fa-rotate-right"
              aria-hidden="true"
            ></i>
            Coba lagi
          </button>
        </div>
      </div>
    `;
    $("retryMarket")
      ?.addEventListener(
        "click",
        load
      );
  }
  /* =======================================================
     COUNT BY TARGET
     ======================================================= */
  const countByTarget = (
    rows
  ) => {
    const map =
      Object.create(null);
    for (
      const row of rows || []
    ) {
      const id =
        row?.target_id;
      if (
        id === null ||
        id === undefined ||
        id === ""
      ) {
        continue;
      }
      const key =
        `${lower(row?.target_type)}:${String(id)}`;
      map[key] =
        (map[key] || 0) + 1;
    }
    return map;
  };
  /* =======================================================
     ENGAGEMENT COUNTS
     =======================================================
     SQL FINAL:
       content_likes
         target_id
         target_type
         actor_id
       analytics_events
         target_id
         target_type
         event_type
     IMPORTANT:
       content_comments TIDAK digunakan karena
       tidak ada pada SQL final.
     */
  async function loadEngagementCounts(
    data
  ) {
    const client = getSupabase();
    if (!client || !Array.isArray(data) || !data.length) return data;
    const ids = data.map(item => item?.id).filter(id => id !== null && id !== undefined && id !== "");
    if (!ids.length) return data;

    try {
      const [likesResult, commentsResult, sharesResult] = await Promise.all([
        client.from("content_likes")
          .select("target_id,target_type")
          .in("target_id", ids),
        client.from("content_comments")
          .select("target_id,target_type")
          .in("target_id", ids),
        client.from("analytics_events")
          .select("target_id,target_type,event_type")
          .in("target_id", ids)
          .eq("event_type", "share")
      ]);

      const validProductTarget = row => {
        const targetType = lower(row?.target_type);
        return !targetType || ["product","link","code","channel","group","pastelink","paste","telegram_product","telegram_channel"].includes(targetType);
      };
      const likes = countByTarget((likesResult?.data || []).filter(validProductTarget));
      const comments = countByTarget((commentsResult?.data || []).filter(validProductTarget));
      const shares = countByTarget((sharesResult?.data || []).filter(validProductTarget));

      if (likesResult?.error) console.warn("[Marketplace] Likes count unavailable:", likesResult.error.message || likesResult.error);
      if (commentsResult?.error) console.warn("[Marketplace] Comments count unavailable:", commentsResult.error.message || commentsResult.error);
      if (sharesResult?.error) console.warn("[Marketplace] Shares count unavailable:", sharesResult.error.message || sharesResult.error);

      return data.map(item => {
        const key = `${canonicalTargetType(item)}:${String(item?.id)}`;
        return {
          ...item,
          likes_count: likes[key] || 0,
          comments_count: comments[key] || 0,
          shares_count: shares[key] || 0
        };
      });
    } catch (error) {
      console.warn("[Marketplace] Engagement unavailable:", error);
      return data;
    }
  }
  /* =======================================================
     LOAD MARKETPLACE
     ======================================================= */
  async function load() {
    const client = getSupabase();
    if (!client) {
      setError("Database belum terkonfigurasi.");
      return;
    }
    setLoading();
    try {
      /*
       * IMPORTANT: Marketplace is public. Use the canonical public view
       * as the single source of truth so Link, Code, Channel, Group,
       * PasteLink and Paste all appear consistently for guests.
       */
      const { data: publicRows, error: publicError } = await client
        .from("marketplace_public")
        .select("id,slug,title,type,access_type,price,thumbnail_url,description,views,sales_count,category,created_at,creator_name,creator_username,owner_id")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (publicError) {
        console.warn("[Marketplace] marketplace_public unavailable:", publicError);
        throw publicError;
      }

      let data = (publicRows || []).map(row => ({
        ...row,
        type: typeOf(row),
        access_type: String(row.access_type || (Number(row.price || 0) > 0 ? "paid" : "free")).toLowerCase(),
        owner_id: row.owner_id || null,
        title: row.title || "Untitled",
        description: String(row.description || "").trim(),
        creator_name: row.creator_name || "",
        creator_username: String(row.creator_username || "").replace(/^@/, "")
      })).filter(row => row.id && row.title);

      /* Enrich Telegram-specific cards without making them required.
         If RLS blocks these optional reads, the public cards remain visible. */
      const codeIds = data.filter(x => x.type === "code").map(x => x.id);
      const channelIds = data.filter(x => x.type === "channel" || x.type === "group").map(x => x.id);

      if (codeIds.length) {
        try {
          const r = await client.from("telegram_products")
            .select("id,bot_username,product_type")
            .in("id", codeIds);
          if (!r.error) {
            const m = new Map((r.data || []).map(x => [String(x.id), x]));
            data = data.map(x => {
              const extra = m.get(String(x.id));
              return extra ? { ...x, bot_username: extra.bot_username || "", product_type: extra.product_type || "" } : x;
            });
          }
        } catch (_) {}
      }

      if (channelIds.length) {
        try {
          const r = await client.from("telegram_channels")
            .select("id,username,name,type,description")
            .in("id", channelIds);
          if (!r.error) {
            const m = new Map((r.data || []).map(x => [String(x.id), x]));
            data = data.map(x => {
              const extra = m.get(String(x.id));
              if (!extra) return x;
              return {
                ...x,
                type: lower(extra.type) === "group" ? "group" : x.type,
                channel_username: String(extra.username || "").replace(/^@/, ""),
                channel_name: extra.name || "",
                description: x.description || extra.description || ""
              };
            });
          }
        } catch (_) {}
      }

      /* Creator names are already exposed safely by marketplace_public.
         Do not make a private profiles query a prerequisite for guests. */
      data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      items = await loadEngagementCounts(data);
      page = 1;
      render();
    } catch (error) {
      console.error("[Marketplace] Load error:", error);
      setError("Konten Marketplace belum dapat dimuat. Periksa akses public marketplace_public di Supabase.");
    }
  }

  /* =======================================================
     FILTER BUTTONS
     ======================================================= */
  document
    .querySelectorAll(
      "#tabs .market-tab"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            document
              .querySelectorAll(
                "#tabs .market-tab"
              )
              .forEach(
                (item) => {
                  item.classList.remove(
                    "active"
                  );
                }
              );
            button.classList.add(
              "active"
            );
            filter =
              button.dataset.v ||
              "all";
            page = 1;
            render();
          }
        );
      }
    );
  /* =======================================================
     SEARCH
     ======================================================= */
  function updateSearchButton() {
    const button =
      $("clearSearch");
    if (!button) {
      return;
    }
    button.hidden =
      !q?.value?.trim();
  }
  q?.addEventListener(
    "input",
    () => {
      updateSearchButton();
      page = 1;
      render();
    }
  );
  /* =======================================================
     CLEAR SEARCH
     ======================================================= */
  $("clearSearch")
    ?.addEventListener(
      "click",
      () => {
        if (q) {
          q.value = "";
        }
        updateSearchButton();
        page = 1;
        render();
        q?.focus();
      }
    );
  /* =======================================================
     RESET FILTERS
     ======================================================= */
  $("resetFilters")
    ?.addEventListener(
      "click",
      () => {
        filter =
          "all";
        if (q) {
          q.value = "";
        }
        document
          .querySelectorAll(
            "#tabs .market-tab"
          )
          .forEach(
            (button) => {
              button.classList.toggle(
                "active",
                button.dataset.v ===
                  "all"
              );
            }
          );
        updateSearchButton();
        page = 1;
        render();
      }
    );
  /* =======================================================
     FAVORITE UI
     Public marketplace: the heart never blocks browsing. Guests
     are asked to login; authenticated users get a clear feedback
     message until the project's favorite RPC is wired by schema.
     ======================================================= */
  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".product-favorite");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const iconEl = button.querySelector("i");
    if (iconEl?.classList.contains("fa-regular")) {
      iconEl.classList.remove("fa-regular");
      iconEl.classList.add("fa-solid");
      button.classList.add("active");
    } else {
      iconEl?.classList.remove("fa-solid");
      iconEl?.classList.add("fa-regular");
      button.classList.remove("active");
    }
    try {
      const user = await window.TC?.user?.();
      if (!user) window.TC?.toast?.("Login untuk menyimpan favorit.", "info");
      else window.TC?.toast?.("Favorit dipilih.", "success");
    } catch (_) {}
  });

  /* =======================================================
     INITIAL STATE
     ======================================================= */
  bindShareButtons();
  bindQuestActivity();
  updateSearchButton();
  await load();
});




/* Page-ready marker */
document.documentElement.classList.add("pastele-ready");