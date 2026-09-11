/* GENERATED PAGE JS BUNDLE: withdrawals.html */

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

/* ===== SOURCE: js/withdrawals.js ===== */
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
    const INSTANT_FEE = 15000;

    const MANUAL_MIN = 10000;

    const MANUAL_FEE_BANK = 7000;
    const MANUAL_FEE_EWALLET = 7000;

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
        manualFeeText.textContent = `Fee WD Manual ${money(MANUAL_FEE_EWALLET)}. WD hanya dapat diajukan saat jam operasional.`;
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
