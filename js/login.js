/* GENERATED PAGE JS BUNDLE: login.html */

/* ===== SOURCE: js/config.js ===== */
/* PasTele / Bdicodebot — NEW PROJECT CONFIG
 * Put ONLY the Supabase project URL and anon/publishable key here.
 * Never put service_role / secret keys in this browser file.
 */
window.PASTELE_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://jxrndamvelqwhbcromye.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo'
});

/* ===== SOURCE: js/supabase.js ===== */
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

/* ===== SOURCE: js/auth.js ===== */
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

/* ===== SOURCE: js/login.js ===== */
/* =========================================================
   PasTele — LOGIN
   FINAL SQL SYNC
   SUPABASE AUTH + USERNAME RPC + CLOUDFLARE TURNSTILE
   SQL RPC:
     resolve_username_login(p_username text)
       -> auth_email, is_banned
   FLOW:
     Step 1
       Username / Gmail
            ↓
       Auth.lookup()
            ↓
       Account Found
            ↓
     Step 2
       Password
            ↓
       Turnstile
            ↓
       Auth.login(email, password, captchaToken)
            ↓
       dashboard.html
   IMPORTANT:
   - Step 1 tidak membutuhkan Turnstile.
   - Turnstile hanya digunakan pada Step 2.
   - Token Turnstile tidak pernah ditampilkan di console.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  /* =======================================================
     ELEMENTS
     ======================================================= */
  const step1 = document.getElementById("loginStep1");
  const step2 = document.getElementById("loginStep2");
  const identifier = document.getElementById("identifier");
  const identifierWrap = document.getElementById("identifierWrap");
  const identifierStatus = document.getElementById("identifierStatus");
  const loginVerifiedState = document.getElementById("loginVerifiedState");
  const continueLogin = document.getElementById("continueLogin");
  const password = document.getElementById("password");
  const toggle = document.getElementById("toggle");
  const google = document.getElementById("google");
  const forgot = document.getElementById("forgot");
  const changeAccount = document.getElementById("changeAccount");
  const toastElement = document.getElementById("toast");
  const securityStatus = document.getElementById("loginSecurityStatus");
  const turnstileContainer = document.getElementById("loginTurnstile");
  /* =======================================================
     SUPABASE
     ======================================================= */
  const supabase =
    window.sb ||
    window.supabaseClient ||
    window.supabase ||
    null;
  if (!supabase?.auth) {
    showToast(
      "Supabase belum siap. Periksa js/config.js dan js/supabase.js.",
      "error"
    );
    return;
  }
  if (!window.Auth) {
    showToast(
      "Auth Core belum dimuat. Pastikan js/auth.js dimuat sebelum js/login.js.",
      "error"
    );
    return;
  }
  /* =======================================================
     STATE
     ======================================================= */
  let currentEmail = "";
  let currentUsername = "";
  let accountFound = false;
  let loginSubmitting = false;
  let turnstileToken = "";
  let turnstileWidgetId = null;
  let turnstileRendering = false;
  /* =======================================================
     TURNSTILE CONFIG
     ======================================================= */
  const TURNSTILE_SITE_KEY = String(
    turnstileContainer?.dataset?.sitekey ||
    window.PASTELE_TURNSTILE_SITE_KEY ||
    ""
  ).trim();
  /* =======================================================
     HELPERS
     ======================================================= */
  function getLoginButton() {
    return (
      step2?.querySelector('button[type="submit"]') ||
      null
    );
  }
  function setLoginButtonEnabled(enabled) {
    const button = getLoginButton();
    if (!button || loginSubmitting) {
      return;
    }
    button.disabled = !Boolean(enabled);
    button.setAttribute(
      "aria-disabled",
      enabled ? "false" : "true"
    );
  }
  function showToast(message, type = "error") {
    const el =
      toastElement ||
      document.getElementById("toast");
    if (!el) {
      return;
    }
    clearTimeout(window.__loginToastTimer);
    el.textContent = String(message || "");
    el.className = "";
    void el.offsetWidth;
    el.className = `show ${type}`;
    window.__loginToastTimer = setTimeout(() => {
      el.className = "";
      el.textContent = "";
    }, 4000);
  }
  function showError(message) {
    showToast(
      message || "Terjadi kesalahan.",
      "error"
    );
  }
  function showSuccess(message) {
    showToast(
      message || "Berhasil.",
      "success"
    );
  }
  function clearError() {
    if (toastElement) {
      toastElement.className = "";
      toastElement.textContent = "";
    }
    clearTimeout(window.__loginToastTimer);
  }
  /* =======================================================
     BUTTON LOADING
     ======================================================= */
  function setButtonLoading(
    button,
    loading,
    loadingText,
    originalHTML = ""
  ) {
    if (!button) {
      return;
    }
    if (loading) {
      button.disabled = true;
      button.setAttribute(
        "aria-disabled",
        "true"
      );
      button.dataset.originalHtml =
        button.innerHTML;
      button.innerHTML = `
        <i
          class="fa-solid fa-spinner fa-spin"
          aria-hidden="true"
        ></i>
        <span>${loadingText}</span>
      `;
      return;
    }
    button.disabled = false;
    button.setAttribute(
      "aria-disabled",
      "false"
    );
    button.innerHTML =
      originalHTML ||
      button.dataset.originalHtml ||
      button.innerHTML;
    delete button.dataset.originalHtml;
  }
  /* =======================================================
     SECURITY STATUS
     ======================================================= */
  function updateSecurityStatus(
    verified = false,
    message = ""
  ) {
    if (!securityStatus) {
      return;
    }
    securityStatus.innerHTML = verified
      ? `
        <i
          class="fa-solid fa-circle-check"
          aria-hidden="true"
        ></i>
        <span>
          ${message || "Verifikasi keamanan berhasil."}
        </span>
      `
      : `
        <i
          class="fa-solid fa-shield-halved"
          aria-hidden="true"
        ></i>
        <span>
          ${message || "Selesaikan verifikasi keamanan sebelum masuk."}
        </span>
      `;
    securityStatus.classList.toggle(
      "verified",
      verified
    );
  }
  /* =======================================================
     TURNSTILE API
     ======================================================= */
  function waitForTurnstile(timeout = 15000) {
    return new Promise((resolve) => {
      if (
        window.turnstile &&
        typeof window.turnstile.render === "function"
      ) {
        resolve(true);
        return;
      }
      const started = Date.now();
      const timer = setInterval(() => {
        if (
          window.turnstile &&
          typeof window.turnstile.render === "function"
        ) {
          clearInterval(timer);
          resolve(true);
          return;
        }
        if (Date.now() - started >= timeout) {
          clearInterval(timer);
          resolve(false);
        }
      }, 100);
    });
  }
  /* =======================================================
     TURNSTILE CALLBACKS
     ======================================================= */
  function onTurnstileSuccess(token) {
    turnstileToken =
      String(token || "").trim();
    const verified =
      Boolean(turnstileToken);
    updateSecurityStatus(
      verified,
      verified
        ? "Verifikasi keamanan berhasil."
        : "Selesaikan verifikasi keamanan sebelum masuk."
    );
    setLoginButtonEnabled(verified);
  }
  function onTurnstileExpired() {
    turnstileToken = "";
    updateSecurityStatus(
      false,
      "Verifikasi kedaluwarsa. Silakan verifikasi kembali."
    );
    setLoginButtonEnabled(false);
    showError(
      "Verifikasi keamanan kedaluwarsa. Silakan verifikasi kembali."
    );
  }
  function onTurnstileTimeout() {
    turnstileToken = "";
    updateSecurityStatus(
      false,
      "Verifikasi timeout. Silakan coba lagi."
    );
    setLoginButtonEnabled(false);
    showError(
      "Verifikasi keamanan timeout. Silakan coba lagi."
    );
  }
  function onTurnstileError(errorCode) {
    turnstileToken = "";
    updateSecurityStatus(
      false,
      "Verifikasi keamanan gagal."
    );
    setLoginButtonEnabled(false);
    /*
     * Jangan log token.
     * Error code Turnstile boleh dicatat.
     */
    console.error(
      "[PasTele] Turnstile error:",
      errorCode
    );
    showError(
      "Verifikasi keamanan gagal. Silakan coba lagi."
    );
  }
  /* =======================================================
     RENDER TURNSTILE
     ======================================================= */
  async function renderTurnstile() {
    if (!turnstileContainer) {
      /*
       * Kalau Turnstile tidak dikonfigurasi,
       * login tetap bisa berjalan.
       */
      if (!TURNSTILE_SITE_KEY) {
        updateSecurityStatus(
          true,
          "Login aman tanpa verifikasi tambahan."
        );
        setLoginButtonEnabled(true);
        return true;
      }
      showError(
        "Elemen verifikasi keamanan tidak ditemukan."
      );
      return false;
    }
    /*
     * Tidak render ulang widget yang sama.
     */
    if (turnstileWidgetId !== null) {
      return true;
    }
    if (turnstileRendering) {
      return false;
    }
    /*
     * Turnstile optional.
     */
    if (!TURNSTILE_SITE_KEY) {
      updateSecurityStatus(
        true,
        "Login aman tanpa verifikasi tambahan."
      );
      setLoginButtonEnabled(true);
      return true;
    }
    turnstileRendering = true;
    try {
      const ready =
        await waitForTurnstile();
      if (!ready) {
        updateSecurityStatus(
          false,
          "Verifikasi keamanan gagal dimuat."
        );
        setLoginButtonEnabled(false);
        showError(
          "Cloudflare Turnstile gagal dimuat. Refresh halaman dan coba lagi."
        );
        return false;
      }
      setLoginButtonEnabled(false);
      turnstileContainer.innerHTML = "";
      turnstileToken = "";
      const widgetId =
        window.turnstile.render(
          turnstileContainer,
          {
            sitekey: TURNSTILE_SITE_KEY,
            theme:
              turnstileContainer.dataset.theme ||
              "auto",
            language:
              turnstileContainer.dataset.language ||
              "id",
            action:
              turnstileContainer.dataset.action ||
              "login",
            callback:
              onTurnstileSuccess,
            "expired-callback":
              onTurnstileExpired,
            "timeout-callback":
              onTurnstileTimeout,
            "error-callback":
              onTurnstileError
          }
        );
      if (
        widgetId === null ||
        widgetId === undefined
      ) {
        throw new Error(
          "Turnstile widget ID tidak tersedia."
        );
      }
      turnstileWidgetId = widgetId;
      updateSecurityStatus(
        false,
        "Selesaikan verifikasi keamanan sebelum masuk."
      );
      setLoginButtonEnabled(false);
      return true;
    } catch (error) {
      console.error(
        "[PasTele] Turnstile render error:",
        error
      );
      turnstileWidgetId = null;
      turnstileToken = "";
      updateSecurityStatus(
        false,
        "Gagal memuat verifikasi keamanan."
      );
      setLoginButtonEnabled(false);
      showError(
        "Gagal memuat verifikasi keamanan. Silakan refresh halaman."
      );
      return false;
    } finally {
      turnstileRendering = false;
    }
  }
  /* =======================================================
     GET TURNSTILE TOKEN
     ======================================================= */
  function getTurnstileToken() {
    if (!TURNSTILE_SITE_KEY) {
      return "";
    }
    if (turnstileToken) {
      return turnstileToken;
    }
    const textarea =
      turnstileContainer?.querySelector(
        'textarea[name="cf-turnstile-response"]'
      );
    if (textarea?.value) {
      turnstileToken =
        String(textarea.value).trim();
      return turnstileToken;
    }
    const fallback =
      document.querySelector(
        'textarea[name="cf-turnstile-response"]'
      );
    if (fallback?.value) {
      turnstileToken =
        String(fallback.value).trim();
      return turnstileToken;
    }
    return "";
  }
  /* =======================================================
     RESET TURNSTILE
     ======================================================= */
  function resetTurnstile() {
    turnstileToken = "";
    if (
      window.turnstile &&
      turnstileWidgetId !== null
    ) {
      try {
        window.turnstile.reset(
          turnstileWidgetId
        );
      } catch (error) {
        console.warn(
          "[PasTele] Turnstile reset error:",
          error
        );
      }
    }
    if (TURNSTILE_SITE_KEY) {
      updateSecurityStatus(
        false,
        "Selesaikan verifikasi keamanan sebelum masuk."
      );
      setLoginButtonEnabled(false);
    } else {
      updateSecurityStatus(
        true,
        "Login aman tanpa verifikasi tambahan."
      );
      setLoginButtonEnabled(true);
    }
  }
  /* =======================================================
     REQUIRE TURNSTILE
     ======================================================= */
  function requireTurnstile() {
    /*
     * Site key tidak ada:
     * Turnstile tidak diwajibkan.
     */
    if (!TURNSTILE_SITE_KEY) {
      return "";
    }
    const token =
      getTurnstileToken();
    if (!token) {
      setLoginButtonEnabled(false);
      showError(
        "Selesaikan verifikasi Cloudflare terlebih dahulu."
      );
      turnstileContainer?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      return null;
    }
    return token;
  }
  /* =======================================================
     STEP 1 UI
     ======================================================= */
  function showContinueButton() {
    if (!continueLogin) {
      return;
    }
    continueLogin.hidden = false;
    continueLogin.disabled = false;
    continueLogin.classList.remove(
      "login-continue-hidden"
    );
    continueLogin.removeAttribute(
      "aria-hidden"
    );
    continueLogin.style.display = "";
  }
  function hideContinueButton() {
    if (!continueLogin) {
      return;
    }
    continueLogin.hidden = true;
    continueLogin.disabled = true;
    continueLogin.classList.add(
      "login-continue-hidden"
    );
    continueLogin.setAttribute(
      "aria-hidden",
      "true"
    );
    continueLogin.style.display = "none";
  }
  function resetIdentifierUI(
    clearValue = true
  ) {
    if (identifier) {
      identifier.disabled = false;
      identifier.removeAttribute(
        "aria-readonly"
      );
      if (clearValue) {
        identifier.value = "";
      }
    }
    identifierWrap?.classList.remove(
      "found"
    );
    identifierStatus?.setAttribute(
      "aria-hidden",
      "true"
    );
    loginVerifiedState?.classList.add(
      "hidden"
    );
  }
  /* =======================================================
     PASSWORD UI
     ======================================================= */
  function resetPasswordUI() {
    if (password) {
      password.value = "";
      password.type = "password";
    }
    if (toggle) {
      toggle.innerHTML =
        '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
      toggle.setAttribute(
        "aria-label",
        "Tampilkan kata sandi"
      );
      toggle.setAttribute(
        "title",
        "Tampilkan kata sandi"
      );
    }
  }
  /* =======================================================
     INITIAL STATE
     ======================================================= */
  function showInitialState(
    clearIdentifier = true
  ) {
    currentEmail = "";
    currentUsername = "";
    accountFound = false;
    loginSubmitting = false;
    resetIdentifierUI(
      clearIdentifier
    );
    resetPasswordUI();
    showContinueButton();
    step1?.classList.remove("hidden");
    step2?.classList.add("hidden");
    resetTurnstile();
    if (TURNSTILE_SITE_KEY) {
      updateSecurityStatus(
        false,
        "Selesaikan verifikasi keamanan sebelum masuk."
      );
    } else {
      updateSecurityStatus(
        true,
        "Login aman tanpa verifikasi tambahan."
      );
    }
  }
  /* =======================================================
     ACCOUNT FOUND UI
     ======================================================= */
  function showAccountFound(found) {
    if (!found) {
      return;
    }
    /*
     * resolve_username_login hanya mengembalikan:
     * auth_email
     * is_banned
     *
     * Jadi username ditampilkan dari input,
     * bukan dari field yang tidak dijamin RPC.
     */
    currentUsername =
      String(
        found.username ||
        found.display_name ||
        identifier?.value ||
        "Pengguna"
      ).trim();
    if (!currentUsername) {
      currentUsername = "Pengguna";
    }
    if (identifier) {
      identifier.value =
        currentUsername;
      identifier.disabled = true;
      identifier.setAttribute(
        "aria-readonly",
        "true"
      );
    }
    identifierWrap?.classList.add(
      "found"
    );
    identifierStatus?.setAttribute(
      "aria-hidden",
      "false"
    );
    loginVerifiedState?.classList.remove(
      "hidden"
    );
    hideContinueButton();
    accountFound = true;
  }
  /* =======================================================
     STEP 1 — ACCOUNT LOOKUP
     ======================================================= */
  step1?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      clearError();
      if (accountFound) {
        return;
      }
      const value =
        String(
          identifier?.value || ""
        ).trim();
      if (!value) {
        showError(
          "Masukkan username atau Gmail terlebih dahulu."
        );
        identifier?.focus();
        return;
      }
      const button =
        continueLogin ||
        step1.querySelector(
          "button[type='submit'], button:not([type])"
        );
      if (!button) {
        return;
      }
      const originalHTML =
        button.innerHTML;
      setButtonLoading(
        button,
        true,
        "Memeriksa..."
      );
      try {
        /*
         * STEP 1 TIDAK menggunakan Turnstile.
         */
        const found =
          await Auth.lookup(value);
        /*
         * Jangan console.log(found).
         * found dapat berisi auth_email.
         */
        if (
          !found ||
          !found.auth_email
        ) {
          currentEmail = "";
          currentUsername = "";
          accountFound = false;
          step2?.classList.add("hidden");
          resetIdentifierUI(false);
          showContinueButton();
          showError(
            "Akun tidak ditemukan. Periksa kembali username atau Gmail kamu."
          );
          return;
        }
        /*
         * CHECK BANNED
         */
        if (
          found.is_banned === true
        ) {
          currentEmail = "";
          currentUsername = "";
          accountFound = false;
          step2?.classList.add("hidden");
          resetIdentifierUI(false);
          showContinueButton();
          showError(
            "Akun ini sedang diblokir dan tidak dapat digunakan untuk login."
          );
          return;
        }
        /*
         * AUTH EMAIL
         */
        currentEmail =
          String(
            found.auth_email || ""
          )
            .trim()
            .toLowerCase();
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            currentEmail
          )
        ) {
          currentEmail = "";
          accountFound = false;
          resetIdentifierUI(false);
          showContinueButton();
          showError(
            "Email akun tidak valid."
          );
          return;
        }
        /*
         * ACCOUNT FOUND
         */
        showAccountFound(found);
        /*
         * SHOW STEP 2
         */
        step1?.classList.remove("hidden");
        step2?.classList.remove("hidden");
        /*
         * Login disabled sampai Turnstile selesai.
         */
        if (TURNSTILE_SITE_KEY) {
          setLoginButtonEnabled(false);
          updateSecurityStatus(
            false,
            "Selesaikan verifikasi keamanan sebelum masuk."
          );
        }
        /*
         * Render setelah Step 2 terlihat.
         */
        const ready =
          await renderTurnstile();
        if (!ready) {
          setLoginButtonEnabled(false);
          showError(
            "Verifikasi keamanan belum siap. Silakan refresh halaman."
          );
          return;
        }
        showSuccess(
          "Akun ditemukan ✓"
        );
        setTimeout(() => {
          password?.focus();
        }, 150);
      } catch (error) {
        console.error(
          "[PasTele] LOGIN LOOKUP ERROR:",
          error
        );
        currentEmail = "";
        currentUsername = "";
        accountFound = false;
        resetIdentifierUI(false);
        step2?.classList.add("hidden");
        showContinueButton();
        showError(
          error?.message ||
          "Terjadi kesalahan saat memeriksa akun."
        );
      } finally {
        if (!accountFound) {
          setButtonLoading(
            button,
            false,
            "",
            originalHTML
          );
        }
      }
    }
  );
  /* =======================================================
     STEP 2 — LOGIN
     ======================================================= */
  step2?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      clearError();
      if (loginSubmitting) {
        return;
      }
      if (
        !currentEmail ||
        !accountFound
      ) {
        showError(
          "Silakan masukkan username atau Gmail terlebih dahulu."
        );
        showInitialState(false);
        identifier?.focus();
        return;
      }
      const pass =
        String(
          password?.value || ""
        );
      if (!pass) {
        showError(
          "Masukkan kata sandi."
        );
        password?.focus();
        return;
      }
      const token =
        requireTurnstile();
      if (token === null) {
        return;
      }
      const button =
        getLoginButton();
      if (!button) {
        return;
      }
      loginSubmitting = true;
      const originalHTML =
        button.innerHTML;
      setButtonLoading(
        button,
        true,
        "Masuk..."
      );
      try {
        /*
         * Jangan console.log token.
         */
        await Auth.login(
          currentEmail,
          pass,
          token
        );
        showSuccess(
          "Login berhasil ✓"
        );
        setTimeout(() => {
          window.location.replace(
            "dashboard.html"
          );
        }, 500);
      } catch (error) {
        console.error(
          "[PasTele] LOGIN ERROR:",
          error
        );
        showError(
          error?.message ||
          "Kata sandi salah atau login gagal."
        );
        /*
         * Token gagal login tidak dipakai ulang.
         */
        resetTurnstile();
        button.innerHTML =
          originalHTML;
        if (TURNSTILE_SITE_KEY) {
          button.disabled = true;
          button.setAttribute(
            "aria-disabled",
            "true"
          );
        }
      } finally {
        loginSubmitting = false;
        if (
          TURNSTILE_SITE_KEY &&
          !turnstileToken
        ) {
          setLoginButtonEnabled(false);
        }
      }
    }
  );
  /* =======================================================
     CHANGE ACCOUNT
     ======================================================= */
  changeAccount?.addEventListener(
    "click",
    () => {
      clearError();
      showInitialState(true);
      showSuccess(
        "Silakan masukkan akun lain."
      );
      setTimeout(() => {
        identifier?.focus();
      }, 100);
    }
  );
  /* =======================================================
     GOOGLE LOGIN
     ======================================================= */
  google?.addEventListener(
    "click",
    async () => {
      clearError();
      const originalHTML =
        google.innerHTML;
      setButtonLoading(
        google,
        true,
        "Menghubungkan..."
      );
      try {
        await Auth.google();
      } catch (error) {
        console.error(
          "[PasTele] GOOGLE LOGIN ERROR:",
          error
        );
        showError(
          error?.message ||
          "Login dengan Google gagal."
        );
        setButtonLoading(
          google,
          false,
          "",
          originalHTML
        );
      }
    }
  );
  /* =======================================================
     FORGOT PASSWORD
     ======================================================= */
  forgot?.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      clearError();
      let email =
        currentEmail;
      /*
       * Jika Step 1 belum dilakukan,
       * resolve akun terlebih dahulu.
       */
      if (!email) {
        const value =
          String(
            identifier?.value || ""
          ).trim();
        if (!value) {
          showError(
            "Masukkan username atau Gmail terlebih dahulu."
          );
          identifier?.focus();
          return;
        }
        try {
          const found =
            await Auth.lookup(value);
          if (
            !found ||
            !found.auth_email
          ) {
            showError(
              "Akun tidak ditemukan."
            );
            return;
          }
          if (
            found.is_banned === true
          ) {
            showError(
              "Akun ini sedang diblokir."
            );
            return;
          }
          email =
            String(
              found.auth_email
            )
              .trim()
              .toLowerCase();
        } catch (error) {
          console.error(
            "[PasTele] FORGOT LOOKUP ERROR:",
            error
          );
          showError(
            error?.message ||
            "Gagal memeriksa akun."
          );
          return;
        }
      }
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        showError(
          "Email akun tidak valid."
        );
        return;
      }
      const originalHTML =
        forgot.innerHTML;
      try {
        forgot.style.pointerEvents =
          "none";
        forgot.innerHTML = `
          <i
            class="fa-solid fa-spinner fa-spin"
            aria-hidden="true"
          ></i>
          Mengirim...
        `;
        const {
          error
        } =
          await supabase.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                new URL(
                  "reset-password.html",
                  window.location.origin
                ).href
            }
          );
        if (error) {
          throw error;
        }
        showSuccess(
          "Link reset password sudah dikirim ke Gmail kamu."
        );
      } catch (error) {
        console.error(
          "[PasTele] RESET PASSWORD ERROR:",
          error
        );
        showError(
          error?.message ||
          "Gagal mengirim reset password."
        );
      } finally {
        forgot.style.pointerEvents = "";
        forgot.innerHTML = originalHTML;
      }
    }
  );
  /* =======================================================
     PASSWORD VISIBILITY
     ======================================================= */
  toggle?.addEventListener(
    "click",
    () => {
      if (!password) {
        return;
      }
      const isPassword =
        password.type === "password";
      password.type =
        isPassword
          ? "text"
          : "password";
      toggle.innerHTML =
        isPassword
          ? '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
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
    }
  );
  /* =======================================================
     INITIALIZE
     ======================================================= */
  showInitialState(false);
  if (TURNSTILE_SITE_KEY) {
    updateSecurityStatus(
      false,
      "Selesaikan verifikasi keamanan sebelum masuk."
    );
    setLoginButtonEnabled(false);
  } else {
    updateSecurityStatus(
      true,
      "Login aman tanpa verifikasi tambahan."
    );
    setLoginButtonEnabled(true);
  }
  /* =======================================================
     SAFE DEBUG
     ======================================================= */
  console.log(
    "[PasTele] Login initialized.",
    {
      supabase: true,
      auth: true,
      turnstileContainer:
        Boolean(turnstileContainer),
      turnstileSiteKeyConfigured:
        Boolean(TURNSTILE_SITE_KEY),
      turnstileExplicit: true
    }
  );
});


/* ===== SOURCE: js/footer.js ===== */
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

/* ===== SOURCE: js/navbar.js ===== */
/* ============================================================
   PasTele — UNIVERSAL NAVBAR
   Layout: [Menu] [Logo] ........ [Username / Avatar]
   Username opens: Saldo / Notifikasi / Tema / Kelola Profil
   Menu drawer contains navigation; Logout stays at bottom.
   ============================================================ */

(() => {
  const initNavbar = async () => { if (/\/admin(?:\/|$)/i.test(location.pathname)) return;
    const host = document.getElementById('navbar');
    if (!host || host.dataset.ready === '1') return;
    host.dataset.ready = '1';

    const isAdmin = /\/admin(?:\/|$)/i.test(location.pathname);
    const base = isAdmin ? '../' : '';
    const file = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();

    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));

    const same = (href) => String(href).split('?')[0].split('#')[0].toLowerCase() === file;

    let user = null;
    let profile = null;

    try {
      if (window.TC?.user) user = await window.TC.user();
    } catch (_) {}

    try {
      if (!user && window.sb?.auth) {
        user = (await window.sb.auth.getUser()).data?.user || null;
      }
    } catch (_) {}

    if (!user) {
      host.dataset.ready = "";
      return;
    }

    try {
      if (user && window.sb) {
        const r = await window.sb
          .from('profiles')
          .select('username,display_name,avatar_url,is_admin,is_premium,subscription_until,telegram_username,youtube_url,facebook_url,whatsapp_number,website,balance')
          .eq('id', user.id)
          .maybeSingle();
        profile = r.data || null;
      }
    } catch (_) {}

    const name =
      profile?.username ||
      profile?.display_name ||
      user?.user_metadata?.username ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Account';

    const premium = Boolean(
      profile?.is_premium &&
      (!profile?.subscription_until || new Date(profile.subscription_until) > new Date())
    );

    let platformSocials = [];
    try {
      const sr = await window.sb?.rpc('get_public_site_settings');
      platformSocials = Array.isArray(sr?.data?.socials) ? sr.data.socials : [];
    } catch (_) {}
    const normalizeSocial = (url, fallback) => {
      let u = String(url || '').trim();
      if (!u) return '';
      if (fallback === 'telegram' && !/^https?:\/\//i.test(u)) u = `https://t.me/${u.replace(/^@/, '')}`;
      if (fallback === 'whatsapp' && !/^https?:\/\//i.test(u)) u = `https://wa.me/${u.replace(/\D/g, '')}`;
      return /^https?:\/\//i.test(u) ? u : '';
    };
    const userSocials = [
      { url: normalizeSocial(profile?.telegram_username, 'telegram'), icon:'fa-brands fa-telegram', label:'Telegram' },
      { url: normalizeSocial(profile?.youtube_url, 'website'), icon:'fa-brands fa-youtube', label:'YouTube' },
      { url: normalizeSocial(profile?.facebook_url, 'website'), icon:'fa-brands fa-facebook', label:'Facebook' },
      { url: normalizeSocial(profile?.whatsapp_number, 'whatsapp'), icon:'fa-brands fa-whatsapp', label:'WhatsApp' }
    ].filter(x => x.url);
    const userSocialHtml = userSocials.length
      ? userSocials.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(x.label)}"><i class="${esc(x.icon)}"></i></a>`).join('')
      : `<span class="pt-social-empty">Belum ada sosial</span>`;
    const platformSocialHtml = platformSocials.length
      ? platformSocials.map(x => { const url=String(x?.url||''); const icon=String(x?.icon||'fa-solid fa-link'); const name=String(x?.name||'Social'); return /^https?:\/\//i.test(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(name)}"><i class="${esc(icon)}"></i></a>` : ''; }).join('')
      : '';

    const groups = isAdmin
      ? [
          ['Admin', [
            ['index.html','fa-chart-pie','Overview'],
            ['users.html','fa-users','Users'],
            ['products.html','fa-box','Products'],
            ['content.html','fa-layer-group','Content'],
            ['orders.html','fa-receipt','Orders'],
            ['payments.html','fa-credit-card','Payments'],
            ['withdrawals.html','fa-money-bill-transfer','Withdrawals'],
            ['notifications.html','fa-bell','Notifications'],
            ['transactions.html','fa-arrow-right-arrow-left','Transactions'],
            ['pastes.html','fa-file-lines','Pastes'],
            ['bots.html','fa-robot','Bots'],
            ['logs.html','fa-list','Logs']
          ]]
        ]
      : [
          ['Menu', [
            ['dashboard.html','fa-house','Dashboard'],
            ['marketplace.html','fa-store','Marketplace']
          ]],
          ['Create', [
            ['create-pastelink.html','fa-link','PasteLink'],
            ['create-code.html','fa-code','Code'],
            ['create-telegram.html?type=channel','fa-users','Group / Channel']
          ]],
          ['Manage', [
            ['my-products.html','fa-box-open','My Product'],
            ['purchases.html','fa-bag-shopping','Purchases']
          ]],
          ['Finance', [
            ['wallet.html','fa-wallet','Wallet'],
            ['withdrawals.html','fa-money-bill-transfer','Withdraw'],
            ['transactions.html','fa-arrow-right-arrow-left','Transaction']
          ]],
          ['Account', [
            ['subscription.html','fa-crown','Langganan'],
            ['premium.html','fa-gem','Premium'],
            ['notifications.html','fa-bell','Notifikasi'],
            ['profile.html','fa-user','Profile'],
            ['settings.html','fa-gear','Setting'],
            ['about.html','fa-circle-info','About']
          ]]
        ];

    const links = (items) => items.map(([href, icon, label]) => {
      const active = same(href);
      return `
        <a class="pt-link${active ? ' active' : ''}"
           href="${base}${esc(href)}"
           ${active ? 'aria-current="page"' : ''}>
          <span class="pt-link-icon"><i class="fa-solid ${esc(icon)}"></i></span>
          <span class="pt-link-label">${esc(label)}</span>
          <i class="fa-solid fa-chevron-right pt-link-arrow"></i>
        </a>`;
    }).join('');

    const avatar = (large = false) =>
      profile?.avatar_url
        ? `<img src="${esc(profile.avatar_url)}" alt="">`
        : `<i class="fa-solid fa-user"></i>`;

    host.innerHTML = `
      <header class="pt-nav">
        <div class="pt-nav-inner">

          <button class="pt-menu-btn" id="ptMenu" type="button"
                  aria-label="Buka menu" aria-expanded="false">
            <i class="fa-solid fa-bars"></i>
          </button>

          <a class="pt-brand"
             href="${base}${isAdmin ? 'index.html' : 'dashboard.html'}"
             aria-label="PasTele">
            <span class="pt-brand-mark">
              <i class="fa-brands fa-telegram"></i>
            </span>
            <span class="pt-brand-name">PasTele</span>
          </a>

          <span class="pt-spacer"></span>

          <div class="pt-user-wrap">
            <button class="pt-user-btn" id="ptUser" type="button"
                    aria-expanded="false" aria-haspopup="true">
              <span class="pt-avatar">${avatar()}</span>
              <span class="pt-name">${esc(name)}</span>
              ${premium ? '<i class="fa-solid fa-circle-check pt-check"></i>' : ''}
              <i class="fa-solid fa-chevron-down pt-chevron"></i>
            </button>

            <div class="pt-dropdown" id="ptDrop" hidden>
              <div class="pt-profile">
                <span class="pt-avatar pt-avatar-lg">${avatar(true)}</span>
                <div class="pt-profile-text">
                  <strong>${esc(name)}</strong>
                  <small>${isAdmin ? 'Administrator' : premium ? 'Premium aktif' : 'Akun aktif'}</small>
                </div>
              </div>

              <div class="pt-account-grid">
                <div class="pt-account-item pt-balance-item">
                  <i class="fa-solid fa-wallet"></i>
                  <span>Saldo</span>
                  <strong>${esc(window.TC?.money ? TC.money(profile?.balance || 0) : ('Rp' + Number(profile?.balance || 0).toLocaleString('id-ID')))}</strong>
                </div>
                <a class="pt-account-item" href="${base}notifications.html">
                  <i class="fa-solid fa-bell"></i>
                  <span>Notifikasi</span>
                  <strong id="ptNotif">0</strong>
                </a>

                <button class="pt-account-item" id="ptTheme" type="button">
                  <i class="fa-solid fa-circle-half-stroke"></i>
                  <span>Tema</span>
                  <strong id="ptThemeText">System</strong>
                </button>
              </div>

              <div class="pt-socials" aria-label="Social media user">${userSocialHtml}</div>

              <a class="pt-profile-link"
                 href="${base}${isAdmin ? 'index.html' : 'profile.html'}">
                <i class="fa-solid fa-user-gear"></i>
                <span>Kelola profil</span>
                <i class="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      </header>

      <div class="pt-backdrop" id="ptBackdrop"></div>

      <aside class="pt-drawer" id="ptDrawer" aria-hidden="true">
        <div class="pt-drawer-head">
          <div class="pt-drawer-title">
            <span>${isAdmin ? 'ADMIN PANEL' : 'WORKSPACE'}</span>
            <strong>${isAdmin ? 'Administration' : 'PasTele Menu'}</strong>
          </div>
          <button class="pt-close-btn" id="ptClose" type="button"
                  aria-label="Tutup menu">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav class="pt-menu-scroll" aria-label="Menu utama">
          ${groups.map(([title, items]) => `
            <section class="pt-group">
              <h3>${esc(title)}</h3>
              ${links(items)}
            </section>`).join('')}
        </nav>

        <div class="pt-drawer-bottom">
          <div class="pt-drawer-socials" aria-label="Social media">
            ${platformSocialHtml}
          </div>
          <button class="pt-link logout" id="ptLogout" type="button">
            <span class="pt-link-icon">
              <i class="fa-solid fa-right-from-bracket"></i>
            </span>
            <span class="pt-link-label">Log out</span>
            <i class="fa-solid fa-arrow-right pt-link-arrow"></i>
          </button>
        </div>
      </aside>`;

    const menu = document.getElementById('ptMenu');
    const drawer = document.getElementById('ptDrawer');
    const backdrop = document.getElementById('ptBackdrop');
    const closeButton = document.getElementById('ptClose');
    const userButton = document.getElementById('ptUser');
    const dropdown = document.getElementById('ptDrop');

    const closeDrawer = () => {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      menu.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('pt-nav-lock');
    };

    const openDrawer = () => {
      dropdown.hidden = true;
      userButton.setAttribute('aria-expanded', 'false');
      drawer.classList.add('open');
      backdrop.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      menu.setAttribute('aria-expanded', 'true');
      document.body.classList.add('pt-nav-lock');
    };

    menu.addEventListener('click', openDrawer);
    closeButton.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);

    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeDrawer);
    });

    userButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const shouldOpen = dropdown.hidden;
      dropdown.hidden = !shouldOpen;
      userButton.setAttribute('aria-expanded', String(shouldOpen));
      if (shouldOpen) closeDrawer();
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('#navbar .pt-user-wrap')) {
        dropdown.hidden = true;
        userButton.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDrawer();
        dropdown.hidden = true;
        userButton.setAttribute('aria-expanded', 'false');
      }
    });

    const money = (value) =>
      new Intl.NumberFormat('id-ID', {
        style:'currency',
        currency:'IDR',
        maximumFractionDigits:0
      }).format(Number(value) || 0);

    try {
      if (user && window.sb) {
        const r = await window.sb
          .from('wallets')
          .select('balance,available_balance')
          .eq('user_id', user.id)
          .maybeSingle();

        const balance = r.data?.available_balance ?? r.data?.balance ?? 0;
        const balanceEl = document.getElementById('ptBalance');
        if (balanceEl) balanceEl.textContent = money(balance);
      }
    } catch (_) {}

    try {
      if (user && window.sb) {
        const r = await window.sb
          .from('notifications')
          .select('id', {count:'exact', head:true})
          .eq('user_id', user.id)
          .eq('is_read', false);

        const notifEl = document.getElementById('ptNotif');
        if (notifEl) notifEl.textContent = String(r.count || 0);
      }
    } catch (_) {}

    const updateThemeLabel = () => {
      const mode = localStorage.getItem('pastele-theme') || 'auto';
      const el = document.getElementById('ptThemeText');
      if (el) el.textContent = mode === 'auto' ? 'Auto' : mode === 'auto' ? 'Auto' : mode === 'dark' ? 'Gelap' : mode === 'light' ? 'Terang' : 'System';
    };

    updateThemeLabel();

    document.getElementById('ptTheme').addEventListener('click', () => {
      if (window.PasTeleTheme?.cycle) {
        window.PasTeleTheme.cycle();
      } else {
        const modes = ['auto','light','dark'];
        const current = localStorage.getItem('pastele-theme') || 'auto';
        localStorage.setItem('pastele-theme', modes[(modes.indexOf(current) + 1) % modes.length]);
        location.reload();
      }
      updateThemeLabel();
    });

    document.getElementById('ptLogout').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const label = button.querySelector('.pt-link-label');
      button.disabled = true;
      if (label) label.textContent = 'Keluar...';

      try {
        if (window.TC?.logout) await window.TC.logout();
        else if (window.Auth?.logout) await window.Auth.logout();
        else if (window.sb?.auth) await window.sb.auth.signOut();
        location.href = `${base}login.html`;
      } catch (_) {
        button.disabled = false;
        if (label) label.textContent = 'Log out';
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar, {once:true});
  } else {
    initNavbar();
  }
})();
