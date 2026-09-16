/* PasTele — self-contained settings page script. One HTML -> one JS -> one CSS. */
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
       CHANGE EMAIL / GMAIL
       ===================================================== */
    async updateEmail(email) {
      const client = assertSupabase();
      const cleanEmail = normalizeEmail(email);
      if (!isEmail(cleanEmail)) throw new Error("Masukkan Gmail / email yang valid.");
      const { data, error } = await client.auth.updateUser({ email: cleanEmail });
      if (error) throw new Error(getErrorMessage(error));
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

/* Page-ready marker */
document.documentElement.classList.add("pastele-ready");
/* PasTele clean notification bridge */
window.ptNotify = window.ptNotify || function(message, type="info", title="PasTele") {
  const container = document.getElementById("ptToastContainer") || (()=>{const x=document.createElement("div");x.id="ptToastContainer";document.body.appendChild(x);return x;})();
  const icon={success:"fa-circle-check",error:"fa-circle-xmark",warning:"fa-triangle-exclamation",info:"fa-circle-info"}[type]||"fa-circle-info";
  const el=document.createElement("div"); el.className=`pt-toast ${type}`; el.innerHTML=`<i class="fa-solid ${icon}"></i><div><strong>${String(title).replace(/[<>]/g,"")}</strong><span>${String(message).replace(/[<>]/g,"")}</span></div>`;
  container.appendChild(el); setTimeout(()=>el.remove(),4200);
};


/* =========================================================
   PasTele — SETTINGS PAGE HANDLER
   DATABASE-SYNCED / NO-INFINITE-LOADING
   ---------------------------------------------------------
   Tables used by this page:
   - profiles
   - payment_methods
   - wallets (read-only balance)
   - notifications (read-only unread count)
   Supabase Auth:
   - auth.getUser()
   - auth.updateUser()
   Notification preferences are device-local because the
   supplied database.sql has no user notification-preference
   table/columns.
   ========================================================= */
(() => {
  "use strict";

  const PAGE = "settings";
  const TIMEOUT_MS = 12000;

  const $ = (id) => document.getElementById(id);

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));

  const toast = (message, type = "info") => {
    if (typeof window.ptNotify === "function") {
      window.ptNotify(message, type, "Settings");
      return;
    }
    if (window.TC?.toast) {
      window.TC.toast(message, type);
      return;
    }
    console[type === "error" ? "error" : "log"]("[PasTele Settings]", message);
  };

  const withTimeout = async (promise, ms = TIMEOUT_MS) => {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Permintaan database timeout.")), ms);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  };

  const getClient = () => {
    const sb = window.sb || window.supabaseClient;
    if (!sb?.auth) throw new Error("Supabase belum siap.");
    return sb;
  };

  const getUser = async () => {
    const sb = getClient();
    const { data, error } = await withTimeout(sb.auth.getUser());
    if (error) throw error;
    if (!data?.user?.id) throw new Error("Sesi login tidak ditemukan.");
    return data.user;
  };

  const setBusy = (button, busy, loadingText = "Menyimpan...") => {
    if (!button) return;
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
    const normal = button.querySelector(".submit-text");
    const loading = button.querySelector(".submit-loading");
    if (normal) normal.hidden = busy;
    if (loading) {
      loading.hidden = !busy;
      const textNode = loading.querySelector("span");
      if (textNode) textNode.textContent = loadingText;
    }
  };

  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = String(value ?? "");
  };

  /* ---------------------------------------------------------
     PROFILE
     --------------------------------------------------------- */
  const PROFILE_FIELDS = [
    "username",
    "display_name",
    "telegram_username",
    "youtube_url",
    "facebook_url",
    "whatsapp_number",
    "bio",
    "website",
    "country"
  ];

  const normalizeUsername = (value) =>
    String(value || "").trim().toLowerCase().replace(/^@+/, "");

  const normalizeUrl = (value) => {
    const v = String(value || "").trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const normalizeTelegram = (value) => {
    const v = String(value || "").trim();
    if (!v) return null;
    if (/^https?:\/\/t\.me\//i.test(v)) return v;
    return `@${v.replace(/^@+/, "")}`;
  };

  const normalizeWhatsapp = (value) => {
    const v = String(value || "").trim();
    if (!v) return null;
    if (/^https?:\/\/wa\.me\//i.test(v)) return v;
    return v;
  };

  const loadProfile = async (user) => {
    const sb = getClient();
    const { data, error } = await withTimeout(
      sb.from("profiles")
        .select(PROFILE_FIELDS.join(","))
        .eq("id", user.id)
        .maybeSingle()
    );
    if (error) throw error;
    if (!data) throw new Error("Profile akun belum ditemukan.");

    setText("username", data.username || "");
    const usernameInput = $("username");
    if (usernameInput) usernameInput.value = data.username || "";

    const values = {
      telegram_username: data.telegram_username || "",
      youtube_url: data.youtube_url || "",
      facebook_url: data.facebook_url || "",
      whatsapp_number: data.whatsapp_number || "",
      bio: data.bio || ""
    };

    Object.entries(values).forEach(([id, value]) => {
      const el = $(id);
      if (el) el.value = value;
    });

    const country = $("country");
    if (country && data.country) country.value = data.country;

    updateBioCounter();
    return data;
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const form = $("profileForm");
    const button = $("saveProfile");
    if (!form || button?.disabled) return;

    try {
      const user = await getUser();
      const username = normalizeUsername($("username")?.value);

      if (!/^[a-z0-9_]{3,32}$/.test(username)) {
        throw new Error("Username hanya boleh berisi huruf kecil, angka, dan underscore, minimal 3 karakter.");
      }

      setBusy(button, true, "Menyimpan...");

      /* Username must remain unique. Exclude the current profile. */
      const sb = getClient();
      const { data: same, error: checkError } = await withTimeout(
        sb.from("profiles")
          .select("id")
          .eq("username", username)
          .neq("id", user.id)
          .maybeSingle()
      );
      if (checkError) throw checkError;
      if (same?.id) throw new Error("Username tersebut sudah digunakan.");

      const payload = {
        username,
        telegram_username: normalizeTelegram($("telegram_username")?.value),
        youtube_url: normalizeUrl($("youtube_url")?.value),
        facebook_url: normalizeUrl($("facebook_url")?.value),
        whatsapp_number: normalizeWhatsapp($("whatsapp_number")?.value),
        bio: String($("bio")?.value || "").trim() || null
      };

      const { error } = await withTimeout(
        sb.from("profiles")
          .update(payload)
          .eq("id", user.id)
      );
      if (error) throw error;

      toast("Profil berhasil disimpan.", "success");
    } catch (error) {
      console.error("[PasTele Settings] save profile:", error);
      toast(error?.message || "Profil gagal disimpan.", "error");
    } finally {
      setBusy(button, false);
    }
  };

  /* ---------------------------------------------------------
     PASSWORD
     --------------------------------------------------------- */
  const updatePasswordStrength = () => {
    const input = $("newpass");
    const output = $("passwordStrength");
    if (!input || !output) return;

    const value = String(input.value || "");
    if (!value) {
      output.textContent = "";
      output.removeAttribute("data-strength");
      return;
    }

    let score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    const label =
      score <= 2 ? "Password lemah" :
      score <= 4 ? "Password cukup kuat" :
      "Password kuat";

    output.textContent = label;
    output.dataset.strength = score <= 2 ? "weak" : score <= 4 ? "medium" : "strong";
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const form = $("passForm");
    const button = $("changePassword");
    if (!form || button?.disabled) return;

    try {
      const password = String($("newpass")?.value || "");
      if (password.length < 6) throw new Error("Password minimal 6 karakter.");

      setBusy(button, true, "Menyimpan...");
      const sb = getClient();

      const { error } = await withTimeout(
        sb.auth.updateUser({ password })
      );
      if (error) throw error;

      form.reset();
      updatePasswordStrength();
      toast("Password berhasil diubah.", "success");
    } catch (error) {
      console.error("[PasTele Settings] password:", error);
      toast(error?.message || "Password gagal diubah.", "error");
    } finally {
      setBusy(button, false);
    }
  };

  /* ---------------------------------------------------------
     PAYMENT METHODS
     --------------------------------------------------------- */
  const E_WALLETS_ID = [
    ["DANA", "DANA"],
    ["OVO", "OVO"],
    ["GOPAY", "GoPay"],
    ["SHOPEEPAY", "ShopeePay"],
    ["LINKAJA", "LinkAja"],
    ["QRIS", "QRIS"]
  ];

  const BANKS_ID = [
    ["BCA", "BCA"],
    ["BRI", "BRI"],
    ["BNI", "BNI"],
    ["MANDIRI", "Bank Mandiri"],
    ["CIMB", "CIMB Niaga"],
    ["BSI", "Bank Syariah Indonesia"],
    ["BTN", "BTN"],
    ["SEABANK", "SeaBank"],
    ["JAGO", "Bank Jago"],
    ["PERMATA", "PermataBank"]
  ];

  const fillProviders = (method = "ewallet", selected = "") => {
    const select = $("provider");
    if (!select) return;

    const list = method === "bank" ? BANKS_ID : E_WALLETS_ID;
    select.innerHTML = list.map(([value, label]) =>
      `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`
    ).join("");

    if (selected && list.some(([v]) => v === selected)) {
      select.value = selected;
    } else if (list.length) {
      select.value = list[0][0];
    }
  };

  const getPaymentMethod = () =>
    document.querySelector(".payment-tab.active")?.dataset.method || "ewallet";

  const setPaymentMethod = (method) => {
    document.querySelectorAll(".payment-tab").forEach((tab) => {
      const active = tab.dataset.method === method;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    fillProviders(method);
  };

  const loadPayments = async (user) => {
    const box = $("savedPayments");
    const count = $("savedPaymentCount");

    if (box) {
      box.innerHTML = `
        <div class="payment-loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Memuat payment...</span>
        </div>`;
    }

    try {
      const sb = getClient();
      const { data, error } = await withTimeout(
        sb.from("payment_methods")
          .select("id,method_type,provider,account_name,account_number,country,is_default,created_at,updated_at")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
      );
      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      if (count) count.textContent = String(rows.length);

      if (!box) return rows;

      if (!rows.length) {
        box.innerHTML = `
          <div class="payment-loading">
            <i class="fa-solid fa-wallet"></i>
            <span>Belum ada payment tersimpan.</span>
          </div>`;
        return rows;
      }

      box.innerHTML = rows.map((row) => {
        const icon = row.method_type === "bank"
          ? "fa-building-columns"
          : "fa-wallet";
        const number = String(row.account_number || "");
        const masked = number.length > 4
          ? `${"•".repeat(Math.max(0, Math.min(8, number.length - 4)))}${escapeHtml(number.slice(-4))}`
          : escapeHtml(number);

        return `
          <article class="saved-payment-item" data-payment-id="${escapeHtml(row.id)}">
            <div class="saved-payment-icon">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div class="saved-payment-content">
              <strong>${escapeHtml(row.provider || row.method_type || "Payment")}</strong>
              <span>${escapeHtml(row.account_name || "-")}</span>
              <small>${masked}</small>
            </div>
            ${row.is_default ? `<span class="saved-payment-badge">Default</span>` : ""}
            <button type="button" class="btn icon-btn payment-delete-btn"
              data-payment-delete="${escapeHtml(row.id)}"
              aria-label="Hapus payment"
              title="Hapus payment">
              <i class="fa-solid fa-trash"></i>
            </button>
          </article>`;
      }).join("");

      return rows;
    } catch (error) {
      console.error("[PasTele Settings] load payment methods:", error);
      if (count) count.textContent = "0";
      if (box) {
        box.innerHTML = `
          <div class="payment-loading">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>Payment tidak dapat dimuat. Coba refresh halaman.</span>
          </div>`;
      }
      return [];
    }
  };

  const savePayment = async (event) => {
    event.preventDefault();
    const form = $("payForm");
    const button = $("savePayment");
    if (!form || button?.disabled) return;

    try {
      const user = await getUser();
      const methodType = getPaymentMethod();
      const provider = String($("provider")?.value || "").trim();
      const accountName = String($("pname")?.value || "").trim();
      const accountNumber = String($("pnumber")?.value || "").trim();
      const country = String($("country")?.value || "ID").trim();

      if (!provider) throw new Error("Provider payment wajib dipilih.");
      if (!accountName) throw new Error("Nama pemegang rekening wajib diisi.");
      if (!accountNumber) throw new Error("Nomor rekening / e-wallet wajib diisi.");

      setBusy(button, true, "Menyimpan...");

      const sb = getClient();

      /* If this is the first method, make it default. */
      const { count, error: countError } = await withTimeout(
        sb.from("payment_methods")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
      );
      if (countError) throw countError;

      const payload = {
        user_id: user.id,
        method_type: methodType,
        provider,
        account_name: accountName,
        account_number: accountNumber,
        country: country || "ID",
        is_default: Number(count || 0) === 0
      };

      const { error } = await withTimeout(
        sb.from("payment_methods").insert(payload)
      );
      if (error) throw error;

      form.reset();
      setPaymentMethod("ewallet");
      await loadPayments(user);
      toast("Payment berhasil disimpan.", "success");
    } catch (error) {
      console.error("[PasTele Settings] save payment:", error);
      toast(error?.message || "Payment gagal disimpan.", "error");
    } finally {
      setBusy(button, false);
    }
  };

  const deletePayment = async (id, button) => {
    if (!id || button?.disabled) return;

    try {
      const user = await getUser();
      if (!window.confirm("Hapus payment tersimpan ini?")) return;

      if (button) button.disabled = true;
      const sb = getClient();

      const { data: target, error: readError } = await withTimeout(
        sb.from("payment_methods")
          .select("id,is_default")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle()
      );
      if (readError) throw readError;
      if (!target) throw new Error("Payment tidak ditemukan.");

      const { error } = await withTimeout(
        sb.from("payment_methods")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id)
      );
      if (error) throw error;

      /* Keep one remaining method as default when needed. */
      if (target.is_default) {
        const { data: remaining } = await withTimeout(
          sb.from("payment_methods")
            .select("id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
        );
        if (remaining?.[0]?.id) {
          await withTimeout(
            sb.from("payment_methods")
              .update({ is_default: true })
              .eq("id", remaining[0].id)
              .eq("user_id", user.id)
          );
        }
      }

      await loadPayments(user);
      toast("Payment berhasil dihapus.", "success");
    } catch (error) {
      console.error("[PasTele Settings] delete payment:", error);
      toast(error?.message || "Payment gagal dihapus.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  };

  /* ---------------------------------------------------------
     ACCOUNT / SESSION
     --------------------------------------------------------- */
  const loadAccountInfo = async (user, profile) => {
    setText("email", user.email || profile?.auth_email || "-");
    setText("accountStatus", profile?.is_banned ? "Diblokir" : "Aktif");
    setText("accountRole",
      profile?.is_admin ? "Administrator" :
      (profile?.role || "User")
    );

    const premiumActive = Boolean(
      profile?.is_premium &&
      (!profile?.subscription_until || new Date(profile.subscription_until) > new Date())
    );

    setText("premiumStatus", premiumActive ? "Premium aktif" : "Free");

    const adminButton = $("adminBtn");
    if (adminButton) adminButton.hidden = !Boolean(profile?.is_admin);

    setText("sessionStatus", "Aktif");
    setText(
      "lastLogin",
      user.last_sign_in_at
        ? new Date(user.last_sign_in_at).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short"
          })
        : "Belum tersedia"
    );
  };

  /* ---------------------------------------------------------
     LOCAL NOTIFICATION PREFERENCES
     --------------------------------------------------------- */
  const NOTIFY_KEY = "pastele-notification-preferences";

  const loadNotificationPrefs = () => {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(NOTIFY_KEY) || "{}") || {};
    } catch (_) {}

    ["notifyWallet", "notifySales", "notifyFollowers", "notifyAnnouncements"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.checked = saved[id] !== false;

      el.addEventListener("change", () => {
        const next = {};
        ["notifyWallet", "notifySales", "notifyFollowers", "notifyAnnouncements"].forEach((key) => {
          const node = $(key);
          if (node) next[key] = node.checked;
        });
        localStorage.setItem(NOTIFY_KEY, JSON.stringify(next));
        toast("Preferensi notifikasi diperbarui.", "success");
      });
    });
  };

  /* ---------------------------------------------------------
     THEME
     --------------------------------------------------------- */
  const initTheme = () => {
    const options = document.querySelectorAll("[data-theme-option]");
    if (!options.length) return;

    const apply = (mode) => {
      if (window.PasTeleTheme?.set) {
        window.PasTeleTheme.set(mode);
      } else {
        localStorage.setItem("pastele-theme", mode);
        const dark =
          mode === "dark" ||
          (mode === "system" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) ||
          (mode === "auto" && ((new Date()).getHours() >= 18 || (new Date()).getHours() < 6));

        document.documentElement.dataset.theme = dark ? "dark" : "light";
        document.documentElement.classList.toggle("theme-dark", dark);
        document.documentElement.classList.toggle("theme-light", !dark);
      }

      options.forEach((node) => {
        const active = node.dataset.themeOption === mode;
        node.classList.toggle("active", active);
        node.setAttribute("aria-pressed", String(active));
      });
    };

    const current = () => {
      const value = localStorage.getItem("pastele-theme") || "auto";
      return ["auto", "light", "dark", "system"].includes(value) ? value : "auto";
    };

    options.forEach((node) => {
      node.addEventListener("click", () => {
        apply(node.dataset.themeOption || "auto");
      });
    });

    apply(current());
  };

  /* ---------------------------------------------------------
     BIO COUNTER / PASSWORD EYE
     --------------------------------------------------------- */
  const updateBioCounter = () => {
    const input = $("bio");
    const counter = $("bioCounter");
    if (!input || !counter) return;
    counter.textContent = `${String(input.value || "").length}/500`;
  };

  const initPasswordToggles = () => {
    document.querySelectorAll("[data-toggle-pass]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = $(button.dataset.togglePass);
        if (!input) return;
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        button.setAttribute("aria-pressed", String(!visible));
        button.setAttribute("aria-label", visible ? "Tampilkan password" : "Sembunyikan password");
        const icon = button.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-eye", visible);
          icon.classList.toggle("fa-eye-slash", !visible);
        }
      });
    });
  };

  /* ---------------------------------------------------------
     EMAIL / GMAIL SETTINGS
     --------------------------------------------------------- */
  const loadCurrentEmail = async (user) => {
    const email = String(user?.email || "").trim();
    setText("email", email || "-");
    setText("currentEmail", email || "-");
    const badge = $("emailVerifiedBadge");
    if (badge) {
      const verified = !!user?.email_confirmed_at;
      badge.classList.toggle("is-unverified", !verified);
      badge.innerHTML = verified
        ? '<i class="fa-solid fa-circle-check"></i> Terverifikasi'
        : '<i class="fa-solid fa-circle-exclamation"></i> Belum terverifikasi';
    }
  };

  const saveEmail = async (event) => {
    event.preventDefault();
    const button = $("changeEmail");
    if (!button || button.disabled) return;
    try {
      const user = await getUser();
      const email = normalizeEmail($("newEmail")?.value);
      if (!isEmail(email)) throw new Error("Masukkan Gmail / email yang valid.");
      if (email === normalizeEmail(user?.email)) throw new Error("Gmail baru sama dengan Gmail saat ini.");
      setBusy(button, true, "Mengirim...");
      if (window.Auth?.updateEmail) await window.Auth.updateEmail(email);
      else {
        const { error } = await withTimeout(getClient().auth.updateUser({ email }));
        if (error) throw error;
      }
      $("emailForm")?.reset();
      toast("Permintaan ganti Gmail berhasil dikirim. Cek email baru untuk konfirmasi.", "success");
    } catch (error) {
      console.error("[PasTele Settings] change email:", error);
      toast(error?.message || "Gagal mengganti Gmail.", "error");
    } finally {
      setBusy(button, false);
    }
  };

  /* ---------------------------------------------------------
     APP PREFERENCES
     --------------------------------------------------------- */
  const PREF_KEY = "pastele-preferences";
  const loadPreferences = () => {
    let data = {};
    try { data = JSON.parse(localStorage.getItem(PREF_KEY) || "{}") || {}; } catch (_) {}
    const language = $("languagePreference");
    const time = $("timeFormatPreference");
    if (language) language.value = ["id","en","zh"].includes(data.language) ? data.language : "id";
    if (time) time.value = data.timeFormat === "12" ? "12" : "24";
    if ($("prefMotion")) $("prefMotion").checked = data.motion !== false;
    if ($("prefMobile")) $("prefMobile").checked = data.mobile !== false;
    if ($("prefConfirm")) $("prefConfirm").checked = data.confirm !== false;
    document.documentElement.dataset.language = language?.value || "id";
    document.documentElement.classList.toggle("reduce-motion", data.motion === false);
  };

  const savePreferences = () => {
    const data = {
      language: $("languagePreference")?.value || "id",
      timeFormat: $("timeFormatPreference")?.value || "24",
      motion: $("prefMotion")?.checked !== false,
      mobile: $("prefMobile")?.checked !== false,
      confirm: $("prefConfirm")?.checked !== false,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PREF_KEY, JSON.stringify(data));
    document.documentElement.dataset.language = data.language;
    document.documentElement.classList.toggle("reduce-motion", !data.motion);
    toast("Preferensi berhasil disimpan.", "success");
  };

  /* ---------------------------------------------------------
     BOOT
     --------------------------------------------------------- */
  const boot = async () => {
    const settingsPage =
      $("profileForm") ||
      $("payForm") ||
      $("passForm") ||
      $("notificationSettings");

    if (!settingsPage) return;

    initTheme();
    loadNotificationPrefs();
    initPasswordToggles();
    loadPreferences();

    $("emailForm")?.addEventListener("submit", saveEmail);
    $("savePreferences")?.addEventListener("click", savePreferences);

    $("bio")?.addEventListener("input", updateBioCounter);
    $("newpass")?.addEventListener("input", updatePasswordStrength);

    $("profileForm")?.addEventListener("submit", saveProfile);
    $("passForm")?.addEventListener("submit", savePassword);
    $("payForm")?.addEventListener("submit", savePayment);

    document.querySelectorAll(".payment-tab").forEach((tab) => {
      tab.addEventListener("click", () => setPaymentMethod(tab.dataset.method || "ewallet"));
    });
    setPaymentMethod("ewallet");

    $("savedPayments")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-payment-delete]");
      if (!button) return;
      deletePayment(button.dataset.paymentDelete, button);
    });

    $("logout")?.addEventListener("click", async () => {
      const button = $("logout");
      if (button?.disabled) return;
      if (!window.confirm("Keluar dari akun PasTele di perangkat ini?")) return;

      if (button) button.disabled = true;
      try {
        const sb = getClient();
        const { error } = await withTimeout(sb.auth.signOut());
        if (error) throw error;
        location.href = "login.html";
      } catch (error) {
        console.error("[PasTele Settings] logout:", error);
        toast(error?.message || "Logout gagal.", "error");
        if (button) button.disabled = false;
      }
    });

    /* All database reads are isolated so one failed query cannot
       leave the whole Settings page in a permanent loading state. */
    try {
      const user = await getUser();
      await loadCurrentEmail(user);

      let profile = null;
      try {
        profile = await loadProfile(user);
      } catch (error) {
        console.error("[PasTele Settings] profile load:", error);
        toast("Profil belum dapat dimuat. Coba refresh halaman.", "error");
      }

      try {
        await loadPayments(user);
      } catch (error) {
        console.error("[PasTele Settings] payments boot:", error);
      }

      try {
        await loadAccountInfo(user, profile || {});
      } catch (error) {
        console.error("[PasTele Settings] account info:", error);
      }

      updateBioCounter();
      updatePasswordStrength();
    } catch (error) {
      console.error("[PasTele Settings] boot:", error);
      setText("sessionStatus", "Sesi tidak tersedia");
      setText("lastLogin", "-");
      setText("accountStatus", "Tidak dapat dimuat");
      setText("accountRole", "-");
      setText("premiumStatus", "-");
      setText("email", "-");
      toast(error?.message || "Sesi login tidak dapat diverifikasi.", "error");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();


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


/* Final navbar scroll safety:
   keep body lock state synchronized with common drawer open/close states. */
(function initNavbarScrollSafety(){
  if (window.__PASTELE_NAV_SCROLL_SAFETY__) return;
  window.__PASTELE_NAV_SCROLL_SAFETY__ = true;

  const sync = () => {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const drawer = nav.querySelector(
      '.pt-drawer.open, .pt-nav-drawer.open, .nav-drawer.open, .mobile-nav.open, .mobile-menu.open, ' +
      '[data-drawer].open, [aria-expanded="true"]'
    );
    document.body.classList.toggle('nav-open', !!drawer);
  };

  document.addEventListener('click', () => setTimeout(sync, 0), {passive:true});
  window.addEventListener('resize', sync, {passive:true});
  window.addEventListener('orientationchange', sync, {passive:true});
  setTimeout(sync, 50);
})();
