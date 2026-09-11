/* GENERATED PAGE JS BUNDLE: transactions.html */

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
  const initNavbar = async () => {
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

    try {
      if (user && window.sb) {
        const r = await window.sb
          .from('profiles')
          .select('username,display_name,avatar_url,is_admin,is_premium,subscription_until')
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

              <div class="pt-socials" aria-label="Social media">
                <a href="https://t.me/" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><i class="fa-brands fa-telegram"></i></a>
                <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
                <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
                <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>
              </div>

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
            <a href="https://t.me/" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><i class="fa-brands fa-telegram"></i></a>
            <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>
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
      const mode = localStorage.getItem('pastele-theme') || 'system';
      const el = document.getElementById('ptThemeText');
      if (el) el.textContent = mode === 'dark' ? 'Gelap' : mode === 'light' ? 'Terang' : 'System';
    };

    updateThemeLabel();

    document.getElementById('ptTheme').addEventListener('click', () => {
      if (window.PasTeleTheme?.cycle) {
        window.PasTeleTheme.cycle();
      } else {
        const modes = ['system','light','dark'];
        const current = localStorage.getItem('pastele-theme') || 'system';
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

/* ===== SOURCE: js/transactions.js ===== */
/* =========================================================
   PasTele — Transactions
   Canonical page script
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);
  const profile = await TC.profile();
  if (!profile) {
    location.replace("login.html");
    return;
  }
  const state = {
    wallet: [],
    buys: [],
    sells: [],
    all: [],
    filter: "all",
    search: ""
  };
  const esc = (value) => TC.esc(String(value ?? ""));
  const money = (value) => {
    const amount = Number(value ?? 0);
    return TC.money(Math.abs(Number.isFinite(amount) ? amount : 0));
  };
  const date = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return "-";
    }
    return d.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };
  const lower = (value) => String(value ?? "").toLowerCase();
  /* =======================================================
     TYPE / ICON
     ======================================================= */
  const normalizeType = (value) => {
    let type = lower(value);
    type = type
      .replace(/^sell_/, "")
      .replace(/^buy_/, "")
      .trim();
    if (
      type === "paste_link" ||
      type === "pastelink" ||
      type === "paste-link"
    ) {
      return "paste";
    }
    if (!type) {
      return "link";
    }
    return type;
  };
  const typeLabel = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "Code";
      case "channel":
        return "Channel";
      case "group":
        return "Group";
      case "paste":
        return "Paste Link";
      case "link":
      default:
        return "Link";
    }
  };
  const iconForType = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "fa-code";
      case "channel":
        return "fa-broadcast-tower";
      case "group":
        return "fa-users";
      case "paste":
        return "fa-file-lines";
      case "link":
      default:
        return "fa-link";
    }
  };
  /* =======================================================
     STATUS
     ======================================================= */
  const statusClass = (status) => {
    const s = lower(status);
    if (
      ["completed", "paid", "success", "successful", "available"].includes(s)
    ) {
      return "success";
    }
    if (["pending", "processing"].includes(s)) {
      return "pending";
    }
    if (
      ["failed", "cancelled", "canceled", "rejected", "expired"].includes(s)
    ) {
      return "failed";
    }
    return "";
  };
  const statusLabel = (status) => {
    if (!status) return "completed";
    const s = String(status).trim();
    if (!s) return "completed";
    return s;
  };
  /* =======================================================
     AMOUNT
     ======================================================= */
  const amountOf = (item) => {
    const value =
      item?.net_amount ??
      item?.amount ??
      item?.total_amount ??
      0;
    const number = Number(value);
    return Number.isFinite(number) ? Math.abs(number) : 0;
  };
  /* =======================================================
     TITLE
     ======================================================= */
  const titleOf = (item) => {
    return (
      item?.item_title ||
      item?.products?.title ||
      item?.reference ||
      item?.description ||
      "Transaksi"
    );
  };
  /* =======================================================
     TYPE
     ======================================================= */
  const typeOf = (item) => {
    return normalizeType(
      item?.item_type ||
      item?.products?.type ||
      item?.type ||
      "link"
    );
  };
  /* =======================================================
     SIDE
     ======================================================= */
  const sideOfWallet = (item) => {
    const type = lower(item?.type);
    if (type.startsWith("sell_")) {
      return "SELL";
    }
    if (type.startsWith("buy_")) {
      return "BUY";
    }
    const status = lower(item?.status);
    /*
     * Withdrawal / wallet transactions are not forced into
     * BUY/SELL unless the existing transaction type clearly
     * says so.
     */
    if (
      type.includes("withdraw") ||
      type.includes("wd") ||
      type.includes("debit")
    ) {
      return "WALLET_OUT";
    }
    if (
      type.includes("deposit") ||
      type.includes("credit") ||
      type.includes("earning") ||
      type.includes("income")
    ) {
      return "WALLET_IN";
    }
    if (status === "paid") {
      return "WALLET_IN";
    }
    return "WALLET";
  };
  /* =======================================================
     TRANSACTION NORMALIZATION
     ======================================================= */
  const makeBuy = (item, source = "purchase") => {
    return {
      ...item,
      __side: "BUY",
      __source: source,
      __type: typeOf(item),
      __title: titleOf(item),
      __amount: amountOf(item),
      __status: item?.status || "completed",
      __date: item?.created_at || null
    };
  };
  const makeSell = (item, source = "order") => {
    return {
      ...item,
      __side: "SELL",
      __source: source,
      __type: typeOf(item),
      __title: titleOf(item),
      __amount: amountOf(item),
      __status: item?.status || "completed",
      __date: item?.created_at || null
    };
  };
  const makeWallet = (item) => {
    const side = sideOfWallet(item);
    return {
      ...item,
      __side: side,
      __source: "wallet",
      __type: typeOf(item),
      __title:
        item?.reference ||
        item?.description ||
        item?.item_title ||
        "Aktivitas wallet",
      __amount: amountOf(item),
      __status: item?.status || "completed",
      __date: item?.created_at || null
    };
  };
  /* =======================================================
     DUPLICATE KEY
     ======================================================= */
  const uniqueKey = (item) => {
    const source = item.__source || "tx";
    const id = item.id || "";
    if (id) {
      return `${source}:${id}`;
    }
    return [
      source,
      item.__side,
      item.__type,
      item.__title,
      item.__amount,
      item.__date
    ].join("|");
  };
  const unique = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = uniqueKey(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };
  /* =======================================================
     DATA LOADING
     ======================================================= */
  async function loadTransactions() {
    setLoading();
    try {
      const [
        txResult,
        purchaseResult,
        orderResult
      ] = await Promise.all([
        sb
          .from("transactions")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false }),
        sb
          .from("purchases")
          .select(
            "id,item_type,amount,status,created_at"
          )
          .eq("buyer_id", profile.id)
          .order("created_at", { ascending: false }),
        sb
          .from("orders")
          .select(
            "id,product_id,item_type,item_id,item_title,amount,status,created_at"
          )
          .eq("seller_id", profile.id)
          .order("created_at", { ascending: false })
      ]);
      if (txResult.error) {
        throw txResult.error;
      }
      if (purchaseResult.error) {
        throw purchaseResult.error;
      }
      if (orderResult.error) {
        throw orderResult.error;
      }
      const walletRows = txResult.data || [];
      const purchaseRows = purchaseResult.data || [];
      const orderRows = orderResult.data || [];
      /*
       * Existing transaction rows that explicitly represent
       * buy/sell activity.
       */
      const sellWalletRows = walletRows.filter((row) =>
        /^sell_/i.test(String(row.type || ""))
      );
      const buyWalletRows = walletRows.filter((row) =>
        /^buy_/i.test(String(row.type || ""))
      );
      /*
       * Existing non buy/sell transactions remain wallet
       * activity.
       */
      const walletOnlyRows = walletRows.filter((row) => {
        const type = String(row.type || "");
        return !/^sell_/i.test(type) && !/^buy_/i.test(type);
      });
      const buysFromPurchases = purchaseRows.map((row) =>
        makeBuy(row, "purchase")
      );
      const sellsFromOrders = orderRows.map((row) =>
        makeSell(row, "order")
      );
      const buysFromWallet = buyWalletRows.map((row) =>
        makeBuy(
          {
            ...row,
            item_type: typeOf(row),
            item_title:
              row.reference ||
              `Pembelian ${typeLabel(typeOf(row))}`,
            amount: row.net_amount ?? row.amount,
            status: row.status
          },
          "transaction"
        )
      );
      const sellsFromWallet = sellWalletRows.map((row) =>
        makeSell(
          {
            ...row,
            item_type: typeOf(row),
            item_title:
              row.reference ||
              `Penjualan ${typeLabel(typeOf(row))}`,
            amount: row.net_amount ?? row.amount,
            status: row.status
          },
          "transaction"
        )
      );
      const walletOnly = walletOnlyRows.map(makeWallet);
      /*
       * Preserve the existing data sources but prevent exact
       * duplicate rows from the same source.
       */
      state.buys = unique([
        ...buysFromPurchases,
        ...buysFromWallet
      ]);
      state.sells = unique([
        ...sellsFromOrders,
        ...sellsFromWallet
      ]);
      state.wallet = unique(walletOnly);
      state.all = unique([
        ...state.buys,
        ...state.sells,
        ...state.wallet
      ]).sort((a, b) => {
        const da = new Date(a.__date || 0).getTime();
        const db = new Date(b.__date || 0).getTime();
        return db - da;
      });
      renderSummary();
      render();
    } catch (error) {
      console.error("Transactions load error:", error);
      setError(error?.message || "Transaksi gagal dimuat.");
      TC.toast(
        error?.message || "Transaksi gagal dimuat",
        "error"
      );
    }
  }
  /* =======================================================
     SUMMARY
     ======================================================= */
  function renderSummary() {
    const summary = $("summary");
    if (!summary) return;
    const buyCount = state.buys.length;
    const sellCount = state.sells.length;
    const walletCount = state.wallet.length;
    const total = state.all.length;
    summary.innerHTML = `
      <div class="tx-summary-item">
        <span class="tx-summary-icon">
          <i class="fa-solid fa-cart-shopping"></i>
        </span>
        <div>
          <small>Total Buy</small>
          <strong>${buyCount}</strong>
        </div>
      </div>
      <div class="tx-summary-item">
        <span class="tx-summary-icon">
          <i class="fa-solid fa-store"></i>
        </span>
        <div>
          <small>Total Sell</small>
          <strong>${sellCount}</strong>
        </div>
      </div>
      <div class="tx-summary-item">
        <span class="tx-summary-icon">
          <i class="fa-solid fa-wallet"></i>
        </span>
        <div>
          <small>Wallet</small>
          <strong>${walletCount}</strong>
        </div>
      </div>
      <div class="tx-summary-item">
        <span class="tx-summary-icon">
          <i class="fa-solid fa-receipt"></i>
        </span>
        <div>
          <small>Total Aktivitas</small>
          <strong>${total}</strong>
        </div>
      </div>
    `;
  }
  /* =======================================================
     FILTER
     ======================================================= */
  function matchesFilter(item) {
    switch (state.filter) {
      case "buy":
        return item.__side === "BUY";
      case "sell":
        return item.__side === "SELL";
      case "wallet":
        return (
          item.__side === "WALLET" ||
          item.__side === "WALLET_IN" ||
          item.__side === "WALLET_OUT"
        );
      case "all":
      default:
        return true;
    }
  }
  function matchesSearch(item) {
    const query = state.search.trim().toLowerCase();
    if (!query) {
      return true;
    }
    const haystack = [
      item.__title,
      item.reference,
      item.description,
      item.type,
      item.item_type,
      item.item_title,
      item.status,
      item.id,
      item.__side,
      typeLabel(item.__type)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }
  function filteredItems() {
    return state.all.filter((item) => {
      return matchesFilter(item) && matchesSearch(item);
    });
  }
  /* =======================================================
     GROUP
     ======================================================= */
  function groupItems(items) {
    const groups = new Map();
    items.forEach((item) => {
      let key = "wallet";
      if (item.__side === "BUY") {
        key = `buy-${item.__type}`;
      } else if (item.__side === "SELL") {
        key = `sell-${item.__type}`;
      }
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });
    return groups;
  }
  const groupTitle = (key) => {
    if (key === "wallet") {
      return "Wallet";
    }
    const parts = key.split("-");
    const side = parts[0];
    const type = parts.slice(1).join("-");
    return `${side === "buy" ? "Pembelian" : "Penjualan"} ${typeLabel(type)}`;
  };
  const groupIcon = (key) => {
    if (key === "wallet") {
      return "fa-wallet";
    }
    const parts = key.split("-");
    const side = parts[0];
    const type = parts.slice(1).join("-");
    if (side === "buy") {
      return iconForType(type);
    }
    return iconForType(type);
  };
  /* =======================================================
     ROW
     ======================================================= */
  function renderRow(item) {
    const side = item.__side;
    let amountClass = "tx-neutral";
    let sign = "";
    if (side === "SELL" || side === "WALLET_IN") {
      amountClass = "tx-plus";
      sign = "+";
    } else if (side === "BUY" || side === "WALLET_OUT") {
      amountClass = "tx-minus";
      sign = "-";
    }
    const status = statusLabel(item.__status);
    const statusCls = statusClass(status);
    const metaSide =
      side === "BUY"
        ? "Buy"
        : side === "SELL"
          ? "Sell"
          : "Wallet";
    const typeText =
      side === "WALLET" ||
      side === "WALLET_IN" ||
      side === "WALLET_OUT"
        ? ""
        : typeLabel(item.__type);
    const metaParts = [
      metaSide,
      typeText,
      date(item.__date)
    ].filter(Boolean);
    return `
      <article class="tx-row">
        <span class="tx-row-icon">
          <i class="fa-solid ${iconForType(item.__type)}"></i>
        </span>
        <div class="tx-row-main">
          <strong class="tx-row-title">
            ${esc(item.__title)}
          </strong>
          <div class="tx-row-meta">
            ${metaParts
              .map((part, index) => `
                ${index > 0
                  ? '<span class="tx-row-meta-dot">•</span>'
                  : ""}
                <span>${esc(part)}</span>
              `)
              .join("")}
            <span class="tx-status ${statusCls}">
              ${esc(status)}
            </span>
          </div>
        </div>
        <div class="tx-row-amount">
          <strong class="${amountClass}">
            ${sign}${money(item.__amount)}
          </strong>
          ${
            item.id
              ? `<small>#${esc(String(item.id).slice(0, 10))}</small>`
              : ""
          }
        </div>
      </article>
    `;
  }
  /* =======================================================
     SECTION
     ======================================================= */
  function renderSection(title, icon, items) {
    return `
      <section class="tx-section">
        <div class="tx-section-head">
          <div class="tx-section-title">
            <span class="tx-section-icon">
              <i class="fa-solid ${icon}"></i>
            </span>
            <h2>${esc(title)}</h2>
          </div>
          <span class="tx-section-count">
            ${items.length}
          </span>
        </div>
        <div class="tx-rows">
          ${items.map(renderRow).join("")}
        </div>
      </section>
    `;
  }
  /* =======================================================
     RENDER
     ======================================================= */
  function render() {
    const content = $("content");
    if (!content) return;
    const items = filteredItems();
    updateResultBar(items.length);
    if (!items.length) {
      content.innerHTML = `
        <div class="tx-empty">
          <span class="tx-empty-icon">
            <i class="fa-solid fa-receipt"></i>
          </span>
          <div>
            <strong>
              ${
                state.search || state.filter !== "all"
                  ? "Transaksi tidak ditemukan"
                  : "Belum ada transaksi"
              }
            </strong>
            <small>
              ${
                state.search || state.filter !== "all"
                  ? "Coba ubah kata pencarian atau filter."
                  : "Aktivitas transaksi kamu akan muncul di sini."
              }
            </small>
          </div>
        </div>
      `;
      return;
    }
    const groups = groupItems(items);
    const order = [
      "buy-link",
      "buy-paste",
      "buy-code",
      "buy-channel",
      "buy-group",
      "sell-link",
      "sell-paste",
      "sell-code",
      "sell-channel",
      "sell-group",
      "wallet"
    ];
    const html = [];
    order.forEach((key) => {
      if (!groups.has(key)) return;
      const group = groups.get(key);
      if (!group.length) return;
      html.push(
        renderSection(
          groupTitle(key),
          groupIcon(key),
          group
        )
      );
    });
    /*
     * Safety fallback for any future/unknown product type
     * already present in the real database.
     */
    groups.forEach((group, key) => {
      if (order.includes(key)) return;
      html.push(
        renderSection(
          groupTitle(key),
          groupIcon(key),
          group
        )
      );
    });
    content.innerHTML = html.join("");
  }
  /* =======================================================
     RESULT BAR
     ======================================================= */
  function updateResultBar(count) {
    const label = $("resultLabel");
    const counter = $("resultCount");
    const reset = $("resetFilters");
    if (label) {
      if (state.filter === "all") {
        label.textContent = "Semua transaksi";
      } else if (state.filter === "buy") {
        label.textContent = "Transaksi Buy";
      } else if (state.filter === "sell") {
        label.textContent = "Transaksi Sell";
      } else {
        label.textContent = "Aktivitas Wallet";
      }
    }
    if (counter) {
      counter.textContent =
        `${count} transaksi`;
    }
    if (reset) {
      reset.hidden =
        state.filter === "all" &&
        !state.search.trim();
    }
  }
  /* =======================================================
     LOADING
     ======================================================= */
  function setLoading() {
    const content = $("content");
    if (!content) return;
    content.innerHTML = `
      <div class="tx-loading">
        <span class="tx-spinner">
          <i class="fa-solid fa-circle-notch"></i>
        </span>
        <div>
          <strong>Memuat transaksi</strong>
          <small>Mengambil data dari database...</small>
        </div>
      </div>
    `;
    const counter = $("resultCount");
    if (counter) {
      counter.textContent = "Memuat...";
    }
  }
  /* =======================================================
     ERROR
     ======================================================= */
  function setError(message) {
    const content = $("content");
    if (!content) return;
    content.innerHTML = `
      <div class="tx-error">
        <span class="tx-error-icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </span>
        <div>
          <strong>Transaksi gagal dimuat</strong>
          <small>
            ${esc(message)}
          </small>
          <button
            type="button"
            class="btn"
            id="retryTransactions"
          >
            <i class="fa-solid fa-rotate-right"></i>
            Coba lagi
          </button>
        </div>
      </div>
    `;
    $("retryTransactions")?.addEventListener(
      "click",
      loadTransactions
    );
  }
  /* =======================================================
     SEARCH
     ======================================================= */
  const searchInput = $("searchInput");
  const clearSearch = $("clearSearch");
  function updateSearchUI() {
    if (!clearSearch) return;
    clearSearch.hidden =
      !state.search.trim();
  }
  searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value || "";
    updateSearchUI();
    render();
  });
  clearSearch?.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
    }
    state.search = "";
    updateSearchUI();
    render();
    searchInput?.focus();
  });
  /* =======================================================
     FILTER BUTTONS
     ======================================================= */
  document
    .querySelectorAll(".tx-filter")
    .forEach((button) => {
      button.addEventListener("click", () => {
        state.filter =
          button.dataset.filter || "all";
        document
          .querySelectorAll(".tx-filter")
          .forEach((item) => {
            item.classList.toggle(
              "active",
              item === button
            );
          });
        render();
      });
    });
  /* =======================================================
     RESET
     ======================================================= */
  $("resetFilters")?.addEventListener("click", () => {
    state.filter = "all";
    state.search = "";
    if (searchInput) {
      searchInput.value = "";
    }
    document
      .querySelectorAll(".tx-filter")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.filter === "all"
        );
      });
    updateSearchUI();
    render();
  });
  /* =======================================================
     REFRESH
     ======================================================= */
  $("refreshBtn")?.addEventListener("click", async () => {
    const button = $("refreshBtn");
    if (button?.dataset.loading === "1") {
      return;
    }
    if (button) {
      button.dataset.loading = "1";
      button.disabled = true;
      button.innerHTML = `
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <span>Memuat...</span>
      `;
    }
    try {
      await loadTransactions();
    } finally {
      if (button) {
        button.dataset.loading = "0";
        button.disabled = false;
        button.innerHTML = `
          <i class="fa-solid fa-rotate-right"></i>
          <span>Refresh</span>
        `;
      }
    }
  });
  /* =======================================================
     INITIAL LOAD
     ======================================================= */
  await loadTransactions();
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
