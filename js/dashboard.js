/* GENERATED PAGE JS BUNDLE: dashboard.html */

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

/* ===== SOURCE: js/dashboard.js ===== */
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
      followsResult
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
          )
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
          title:
            item.title ||
            'Untitled',
          type:
            item.type ||
            'link',
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
          title:
            item.title ||
            'Code',
          type:
            item.product_type ||
            item.type ||
            'code',
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
          title:
            item.name ||
            item.username ||
            'Telegram',
          type:
            item.type ||
            'channel',
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
    const recentPageSize =
      5;
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
                    (item) => `
                      <div class="recent-item">
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
                      </div>
                    `
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
    const activityPageSize =
      5;
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
