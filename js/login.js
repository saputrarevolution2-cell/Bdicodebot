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
/* =========================================================
   PasTele — UNIVERSAL NAVBAR
   FINAL PREMIUM / RESPONSIVE / SAFE
   Dashboard-style Navigation
   Supports:
   - User Navbar
   - Admin Navbar
   - Mobile Sidebar
   - Light / Dark / System Theme
   - Wallet Balance
   - Social Media
   - Active Navigation
   - Logout
   - Accessibility
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const host = document.getElementById("navbar");
  if (!host) return;

  /* =======================================================
     PREVENT DUPLICATE INITIALIZATION
  ======================================================= */

  if (host.dataset.navbarReady === "1") return;
  host.dataset.navbarReady = "1";

  const isAdmin = location.pathname.includes("/admin/");
  const base = isAdmin ? "../" : "";

  /* =======================================================
     HELPERS
  ======================================================= */

  const getTC = () => window.TC || null;
  const getSB = () => window.sb || null;

  const esc = (value) => {
    try {
      if (getTC()?.esc) {
        return getTC().esc(value);
      }
    } catch (_) {}

    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[char]
    );
  };

  const safeUrl = (value) => {
    try {
      const raw = String(value || "").trim();

      if (!raw) return "#";

      const url = new URL(raw, window.location.origin);

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        return "#";
      }

      return url.href;
    } catch (_) {
      return "#";
    }
  };

  const getCurrentFile = () => {
    const path = location.pathname
      .split("?")[0]
      .split("#")[0]
      .replace(/\/+$/, "");

    const file = path.split("/").pop();

    if (!file) {
      return isAdmin ? "index.html" : "dashboard.html";
    }

    return file.toLowerCase();
  };

  const normalizeFile = (value) => {
    return String(value || "")
      .split("?")[0]
      .split("#")[0]
      .replace(/^\/+/, "")
      .toLowerCase();
  };

  const isSamePath = (href) => {
    return normalizeFile(href) === getCurrentFile();
  };

  /* =======================================================
     USER
  ======================================================= */

  let user = null;

  try {
    if (getTC()?.user) {
      user = await getTC().user();
    }
  } catch (_) {
    user = null;
  }

  /* Fallback Supabase session */
  if (!user && getSB()?.auth) {
    try {
      const { data } = await getSB().auth.getUser();
      user = data?.user || null;
    } catch (_) {
      user = null;
    }
  }

  const metadata = user?.user_metadata || {};

  let profile = null;
  if (user && getSB()) {
    try {
      const { data } = await getSB()
        .from("profiles")
        .select("username,display_name,avatar_url,is_banned,is_admin,role,is_premium,subscription_until")
        .eq("id", user.id)
        .maybeSingle();
      profile = data || null;
    } catch (_) {}
  }

  const name =
    profile?.username ||
    metadata.username ||
    profile?.display_name ||
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    "Guest";

  /* =======================================================
     NAVIGATION GROUPS
  ======================================================= */

  const groups = isAdmin
    ? [
        ["Admin", [
          ["index.html", "fa-chart-pie", "Overview"],
          ["users.html", "fa-users", "Users"],
          ["products.html", "fa-box", "Products"],
          ["content.html", "fa-layer-group", "Content"],
          ["orders.html", "fa-receipt", "Orders"],
          ["payments.html", "fa-credit-card", "Payments"],
          ["withdrawals.html", "fa-money-bill-transfer", "Withdrawals"],
          ["notifications.html", "fa-bell", "Notifications"],
          ["transactions.html", "fa-arrow-right-arrow-left", "Transactions"],
          ["pastes.html", "fa-file-lines", "Pastes"],
          ["bots.html", "fa-robot", "Bots"],
          ["logs.html", "fa-list", "Logs"]
        ]]
      ]
    : [
        ["Menu", [
          ["dashboard.html", "fa-house", "Dashboard"],
          ["marketplace.html", "fa-store", "Marketplace"]
        ]],
        ["Create", [
          ["create-pastelink.html", "fa-link", "PasteLink"],
          ["create-code.html", "fa-code", "Code"],
          ["create-telegram.html?type=channel", "fa-users", "Group / Channel"]
        ]],
        ["Manage", [
          ["my-products.html", "fa-box-open", "My Product"],
          ["purchases.html", "fa-bag-shopping", "Purchases"]
        ]],
        ["Finance", [
          ["wallet.html", "fa-wallet", "Wallet"],
          ["withdrawals.html", "fa-money-bill-transfer", "Withdraw"],
          ["transactions.html", "fa-arrow-right-arrow-left", "Transaction"]
        ]],
        ["Account", [
          ["subscription.html", "fa-crown", "Langganan"],
          ["premium.html", "fa-gem", "Premium"],
          ["notifications.html", "fa-bell", "Notifikasi"],
          ["profile.html", "fa-user", "Profile"],
          ["settings.html", "fa-gear", "Setting"],
          ["about.html", "fa-circle-info", "About"]
        ]]
      ];

  /* =======================================================
     RENDER NAVIGATION
  ======================================================= */

  const renderGroups = groups
    .map(([title, items]) => {
      return `
        <div class="nav-group">

          ${title === "Create" ? `
            <button type="button" class="nav-group-title nav-create-toggle" id="navCreateToggle" aria-expanded="false">
              <span><i class="fa-solid fa-plus"></i> Create</span>
              <i class="fa-solid fa-chevron-down nav-create-chevron"></i>
            </button>
            <div class="nav-create-submenu" id="navCreateSubmenu" hidden>
              ${items.map(([href, icon, label]) => {
                const active = isSamePath(href);
                return `<a href="${base}${esc(href)}" data-href="${esc(href)}" class="nav-link${active ? " active" : ""}" ${active ? 'aria-current="page"' : ""}>
                  <i class="fa-solid ${esc(icon)}" aria-hidden="true"></i><span>${label}</span>
                </a>`;
              }).join("")}
            </div>
          ` : `
            <small class="nav-group-title">${esc(title)}</small>
            ${items.map(([href, icon, label]) => {
              const active = isSamePath(href);
              return `<a href="${base}${esc(href)}" data-href="${esc(href)}" class="nav-link${active ? " active" : ""}" ${active ? 'aria-current="page"' : ""}>
                <i class="fa-solid ${esc(icon)}" aria-hidden="true"></i><span>${label}</span>
              </a>`;
            }).join("")}
          `}

        </div>
      `;
    })
    .join("");

  /* =======================================================
     NAVBAR HTML
  ======================================================= */

  host.innerHTML = `
    <header
      class="navbar"
      id="tgSidebar"
      role="navigation"
    >

      <div class="nav-inner">

        <!-- =================================================
             BRAND
        ================================================== -->

        <a
          class="brand"
          href="${base}${isAdmin ? "index.html" : "dashboard.html"}"
          aria-label="PasTele"
        >

          <span class="brand-mark">
            <i
              class="fa-brands fa-telegram"
              aria-hidden="true"
            ></i>
          </span>

          <span>PasTele</span>

        </a>


        <!-- =================================================
             ACCOUNT
        ================================================== -->

        <div class="nav-account">
          <a
            class="nav-account-info"
            href="${base}${isAdmin ? "index.html" : "profile.html"}"
            aria-label="Profil akun"
          >
            <div class="nav-avatar">
              <i class="fa-solid fa-user" aria-hidden="true"></i>
            </div>
            <div class="nav-name">
              <b>${esc(name)}</b>
              <small id="navAccountStatus">Akun aktif</small>
            </div>
          </a>
          <div class="nav-account-side">
            <span class="nav-balance" id="navBalance" aria-label="Saldo tersedia">Rp 0</span>
            <a class="nav-notification" id="navNotification" href="${base}notifications.html" title="Notifikasi" aria-label="Notifikasi">
              <i class="fa-solid fa-bell" aria-hidden="true"></i>
              <span class="nav-notification-badge" id="navNotificationBadge" hidden>0</span>
            </a>
            <button class="nav-theme" id="navTheme" type="button" title="Ganti tema" aria-label="Ganti tema">
              <i class="fa-solid fa-moon" aria-hidden="true"></i>
            </button>
          </div>
        </div>


        <!-- =================================================
             NAVIGATION
        ================================================== -->

        <nav
          class="nav-links"
          id="navLinks"
          aria-label="${isAdmin
            ? "Admin navigation"
            : "Main navigation"}"
        >

          ${renderGroups}

        </nav>


        <!-- =================================================
             SOCIAL MEDIA
        ================================================== -->

        <div
          class="nav-extra"
          id="navSocials"
          aria-label="Sosial Media"
        ></div>


        <!-- =================================================
             TOOLS
        ================================================== -->

        <div class="nav-tools">

          <button
            class="nav-logout"
            id="navLogout"
            type="button"
          >

            <i
              class="fa-solid fa-right-from-bracket"
              aria-hidden="true"
            ></i>

            <span>Log out</span>

          </button>

        </div>

      </div>

    </header>


    <!-- =====================================================
         MOBILE BACKDROP
    ====================================================== -->

    <div
      class="nav-backdrop"
      id="navBackdrop"
      aria-hidden="true"
    ></div>


    <!-- =====================================================
         MOBILE TOGGLE
    ====================================================== -->

    <button
      class="nav-toggle"
      id="navToggle"
      type="button"
      aria-label="Buka menu"
      aria-expanded="false"
      title="Menu"
    >

      <i
        class="fa-solid fa-bars"
        aria-hidden="true"
      ></i>

    </button>
  `;

  /* =======================================================
     ELEMENTS
  ======================================================= */

  const sidebar =
    document.getElementById("tgSidebar");

  const toggle =
    document.getElementById("navToggle");

  const backdrop =
    document.getElementById("navBackdrop");

  const themeBtn =
    document.getElementById("navTheme");

  const logoutBtn =
    document.getElementById("navLogout");

  const balanceEl =
    document.getElementById("navBalance");

  const navLinks = [
    ...document.querySelectorAll("#navLinks a")
  ];

  const createToggle = document.getElementById("navCreateToggle");
  const createSubmenu = document.getElementById("navCreateSubmenu");
  const createHasActive = [...(createSubmenu?.querySelectorAll("a") || [])].some((a) => a.classList.contains("active"));
  const setCreateOpen = (open) => {
    if (!createToggle || !createSubmenu) return;
    createSubmenu.hidden = !open;
    createToggle.setAttribute("aria-expanded", String(open));
    createToggle.classList.toggle("open", open);
  };
  setCreateOpen(createHasActive);
  createToggle?.addEventListener("click", () => setCreateOpen(createSubmenu.hidden));


  /* =======================================================
     ACTIVE MENU
  ======================================================= */

  navLinks.forEach((link) => {
    const href = link.dataset.href;

    if (isSamePath(href)) {
      link.classList.add("active");
      link.setAttribute(
        "aria-current",
        "page"
      );
    }
  });


  /* =======================================================
     MOBILE MENU
  ======================================================= */

  const setMenu = (open) => {
    if (!sidebar || !toggle || !backdrop) {
      return;
    }

    sidebar.classList.toggle(
      "nav-open",
      open
    );

    backdrop.classList.toggle(
      "show",
      open
    );

    toggle.setAttribute(
      "aria-expanded",
      String(open)
    );

    toggle.setAttribute(
      "aria-label",
      open
        ? "Tutup menu"
        : "Buka menu"
    );

    toggle.setAttribute(
      "title",
      open
        ? "Tutup menu"
        : "Menu"
    );

    backdrop.setAttribute(
      "aria-hidden",
      String(!open)
    );

    const icon =
      toggle.querySelector("i");

    if (icon) {
      icon.className =
        open
          ? "fa-solid fa-xmark"
          : "fa-solid fa-bars";
    }

    document.body.classList.toggle(
      "nav-menu-open",
      open
    );
  };


  const toggleMenu = () => {
    const isOpen =
      sidebar?.classList.contains(
        "nav-open"
      );

    setMenu(!isOpen);
  };


  toggle?.addEventListener(
    "click",
    toggleMenu
  );


  backdrop?.addEventListener(
    "click",
    () => {
      setMenu(false);
    }
  );


  navLinks.forEach((link) => {
    link.addEventListener(
      "click",
      () => {
        setMenu(false);
      }
    );
  });


  window.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Escape") {
        setMenu(false);
      }

    }
  );


  window.addEventListener(
    "resize",
    () => {

      if (window.innerWidth > 900) {
        setMenu(false);
      }

    }
  );


  /* =======================================================
     THEME
  ======================================================= */
  const applyNavbarTheme = () => {
    const mode = window.PasTeleTheme?.get?.() || localStorage.getItem('pastele-theme') || 'system';
    const theme = window.PasTeleTheme?.resolved?.() || document.documentElement.dataset.theme || 'light';
    if (themeBtn) {
      const icon = themeBtn.querySelector('i');
      if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      themeBtn.title = `Tema: ${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}`;
      themeBtn.setAttribute('aria-label', themeBtn.title);
    }
  };
  themeBtn?.addEventListener('click', () => {
    const theme = window.PasTeleTheme?.cycle ? window.PasTeleTheme.cycle() : null;
    applyNavbarTheme();
    try { getTC()?.toast?.(`Tema ${window.PasTeleTheme?.get?.() || 'system'}`, 'success'); } catch (_) {}
  });
  window.addEventListener('pastele-theme-change', applyNavbarTheme);
  applyNavbarTheme();

  /* =======================================================
     ACCOUNT STATUS
  ======================================================= */

  const statusEl = document.getElementById("navAccountStatus");

  const loadAccountStatus = async () => {
    if (!statusEl || isAdmin) return;
    const p = profile;
    if (p?.is_banned) {
      statusEl.textContent = "Akun dibatasi";
    } else if (p?.is_premium || (p?.subscription_until && new Date(p.subscription_until) > new Date())) {
      statusEl.textContent = "Premium aktif";
    } else {
      statusEl.textContent = "Akun aktif";
    }
  };

  await loadAccountStatus();

  /* =======================================================
     WALLET BALANCE
  ======================================================= */

  const formatMoney = (value) => {

    try {
      if (getTC()?.money) {
        return getTC().money(value);
      }
    } catch (_) {}

    return `Rp ${Number(
      value || 0
    ).toLocaleString("id-ID")}`;
  };


  const loadNavbarBalance = async () => {

    if (!user || !getSB()) {
      return;
    }

    try {

      const { data: wallet, error } =
        await getSB()
          .from("wallets")
          .select(
            "balance,available_balance"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (error) {
        return;
      }

      const balance =
        wallet?.available_balance ??
        wallet?.balance ??
        0;

      if (balanceEl) {

        balanceEl.textContent =
          formatMoney(balance);

      }

    } catch (_) {

      /* Wallet failure must never break navbar */

    }

  };


  await loadNavbarBalance();


  /* =======================================================
     LOGOUT
  ======================================================= */

  logoutBtn?.addEventListener(
    "click",
    async () => {

      if (logoutBtn.disabled) {
        return;
      }

      logoutBtn.disabled = true;

      const originalHTML =
        logoutBtn.innerHTML;

      logoutBtn.innerHTML = `
        <i
          class="fa-solid fa-spinner fa-spin"
          aria-hidden="true"
        ></i>

        <span>Keluar...</span>
      `;


      try {

        if (getTC()?.logout) {
          await getTC().logout();
        } else if (window.Auth?.logout) {
          await window.Auth.logout();
        } else if (getSB()?.auth) {
          await getSB().auth.signOut();

          window.location.href =
            `${base}login.html`;
        } else {

          throw new Error(
            "Sistem logout belum tersedia."
          );

        }

      } catch (error) {

        logoutBtn.disabled = false;
        logoutBtn.innerHTML =
          originalHTML;

        try {

          if (getTC()?.toast) {

            getTC().toast(
              error?.message ||
                "Gagal logout",
              "error"
            );

          }

        } catch (_) {}

      }

    }
  );


  /* =======================================================
     GLOBAL NOTIFICATIONS
  ======================================================= */
  const notificationBadge = document.getElementById('navNotificationBadge');
  const loadNotificationBadge = async () => {
    if (!user || !getSB()) return;
    try {
      const { count } = await getSB().from('notifications').select('id', {count:'exact', head:true}).eq('user_id', user.id).eq('is_read', false);
      const n = Number(count || 0);
      if (notificationBadge) { notificationBadge.hidden = n <= 0; notificationBadge.textContent = n > 99 ? '99+' : String(n); }
    } catch (_) {}
  };
  await loadNotificationBadge();

  /* Lightweight live notification — never blocks the page. */
  const showLiveNotification = (item) => {
    if (!item?.title) return;
    let host = document.getElementById('pastele-live-notifications');
    if (!host) {
      host = document.createElement('div');
      host.id = 'pastele-live-notifications';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }

    const card = document.createElement('div');
    card.className = 'pastele-live-notification';
    card.innerHTML = `
      <button type="button" class="pastele-live-close" aria-label="Tutup">×</button>
      <div class="pastele-live-icon"><i class="fa-solid fa-bell"></i></div>
      <div class="pastele-live-copy">
        <strong>${getTC()?.esc ? getTC().esc(item.title) : String(item.title)}</strong>
        <span>${getTC()?.esc ? getTC().esc(item.body || '') : String(item.body || '')}</span>
      </div>`;

    const remove = () => {
      card.classList.add('is-leaving');
      setTimeout(() => card.remove(), 180);
    };
    card.querySelector('.pastele-live-close')?.addEventListener('click', remove);
    host.prepend(card);

    while (host.children.length > 2) host.lastElementChild?.remove();
    requestAnimationFrame(() => card.classList.add('is-visible'));
    setTimeout(remove, 4200);
  };

  if (getSB() && user) {
    try {
      getSB().channel(`pastele-notifications-${user.id}`)
        .on('postgres_changes', {event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${user.id}`}, payload => {
          loadNotificationBadge();
          showLiveNotification(payload?.new);
        }).subscribe();
    } catch (_) {}
  }
  window.setInterval(loadNotificationBadge, 20000);

  /* =======================================================
     ADMIN ALERTS — WITHDRAWAL / SYSTEM NOTIFICATIONS
  ======================================================= */
  if (isAdmin && getSB() && user) {
    try {
      const { count } = await getSB().from('notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('is_read',false);
      const wdLink = [...document.querySelectorAll('#navLinks a')].find(a => /withdrawals\.html$/i.test(a.dataset.href || ''));
      if (wdLink && Number(count || 0) > 0) {
        wdLink.insertAdjacentHTML('beforeend', `<span class="nav-alert-count">${Number(count)>99?'99+':Number(count)}</span>`);
      }
    } catch (_) {}
  }

  /* =======================================================
     SOCIAL MEDIA
  ======================================================= */

  const loadSocials = async () => {
    const sb = getSB();
    const socialHost = document.getElementById("navSocials");
    if (!sb || !socialHost) return;
    try {
      const response = await sb.rpc("get_public_site_settings");
      const socials = Array.isArray(response?.data?.socials) ? response.data.socials : [];
      const wanted = [
        ["telegram", "fa-brands fa-telegram"],
        ["youtube", "fa-brands fa-youtube"],
        ["facebook", "fa-brands fa-facebook"]
      ];
      const links = wanted.map(([key, icon]) => {
        const item = socials.find((x) => String(x?.name || "").toLowerCase().includes(key));
        const url = safeUrl(item?.url);
        if (url === "#") return "";
        return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(key)}" title="${esc(key)}"><i class="${icon}" aria-hidden="true"></i></a>`;
      }).join("");
      if (links) socialHost.innerHTML = `<small>Sosial</small><div class="nav-social-icons">${links}</div>`;
    } catch (_) {}
  };

  await loadSocials();


  /* =======================================================
     FOCUS / ACCESSIBILITY
  ======================================================= */

  document.addEventListener(
    "focusin",
    (event) => {

      const link =
        event.target.closest?.(
          "#navLinks a"
        );

      if (!link) {
        return;
      }

      if (
        window.innerWidth <= 900 &&
        !sidebar?.classList.contains(
          "nav-open"
        )
      ) {
        return;
      }

    }
  );


  /* =======================================================
     PAGE VISIBILITY
     Refresh balance when returning to tab
  ======================================================= */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.visibilityState ===
        "visible"
      ) {
        loadNavbarBalance();
      }

    }
  );


  /* =======================================================
     FINAL STATE
  ======================================================= */

  host.dataset.navbarLoaded = "1";

});


/* ===== SOURCE: js/theme.js ===== */
/* PasTele — Theme Manager
   Modes: light, dark, system
   Persists the user's choice and applies it consistently.
*/
(() => {
  'use strict';
  const root = document.documentElement;
  const KEY = 'pastele-theme';
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  const resolved = (mode) => {
    if (mode === 'light' || mode === 'dark') return mode;
    return media?.matches ? 'dark' : 'light';
  };

  const apply = (mode = localStorage.getItem(KEY) || 'system') => {
    if (!['light','dark','system'].includes(mode)) mode = 'system';
    const theme = resolved(mode);
    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    root.classList.toggle('theme-dark', theme === 'dark');
    root.classList.toggle('theme-light', theme === 'light');
    root.style.colorScheme = theme;
    if (document.body) {
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme === 'light');
    }
    document.querySelectorAll('[data-theme-option]').forEach(btn => {
      const active = btn.dataset.themeOption === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    window.dispatchEvent(new CustomEvent('pastele-theme-change', {detail:{mode,theme}}));
    return theme;
  };

  window.PasTeleTheme = {
    get: () => localStorage.getItem(KEY) || 'system',
    resolved: () => resolved(localStorage.getItem(KEY) || 'system'),
    set: (mode) => { localStorage.setItem(KEY, mode); return apply(mode); },
    cycle: () => {
      const modes = ['system','light','dark'];
      const current = modes.indexOf(localStorage.getItem(KEY) || 'system');
      const next = modes[(current + 1) % modes.length];
      localStorage.setItem(KEY, next);
      return apply(next);
    },
    apply
  };

  apply();
  media?.addEventListener?.('change', () => {
    if ((localStorage.getItem(KEY) || 'system') === 'system') apply('system');
  });
})();

