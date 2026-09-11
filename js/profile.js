/* GENERATED PAGE JS BUNDLE: profile.html */

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

/* ===== SOURCE: js/profile.js ===== */
/* =========================================================
   PasTele — Profile / Public Creator Profile
   FINAL PREMIUM PROFILE JS
   Matches profile.html + profile.css
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  /* =======================================================
     HELPERS
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  const getTC = () => window.TC || {};

  const getSupabase = () => {
    if (window.sb) return window.sb;
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase) {
      if (typeof window.supabase.from === "function") {
        return window.supabase;
      }
    }
    return null;
  };

  const sb = getSupabase();
  const TC = getTC();

  const esc = (value) => {
    try {
      if (typeof TC.esc === "function") {
        return TC.esc(value);
      }
    } catch (_) {}

    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  };

  const num = (value) => {
    const n = Number(value || 0);

    return Number.isFinite(n)
      ? n.toLocaleString("id-ID")
      : "0";
  };

  const money = (value) => {
    try {
      if (typeof TC.money === "function") {
        return TC.money(value);
      }
    } catch (_) {}

    const n = Number(value || 0);

    return `Rp ${Number.isFinite(n)
      ? n.toLocaleString("id-ID")
      : "0"}`;
  };

  const toast = (message, type = "info") => {
    try {
      if (typeof TC.toast === "function") {
        TC.toast(message, type);
        return;
      }
    } catch (_) {}

    const box = $("toast");

    if (!box) {
      console[type === "error" ? "error" : "log"](message);
      return;
    }

    box.textContent = String(message || "");
    box.dataset.type = type;
    box.classList.add("show");

    clearTimeout(box._toastTimer);

    box._toastTimer = setTimeout(() => {
      box.classList.remove("show");
    }, 3200);
  };

  const formatDate = (value, options = {}) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    const defaultOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric"
    };

    try {
      return new Intl.DateTimeFormat(
        "id-ID",
        {
          ...defaultOptions,
          ...options
        }
      ).format(date);
    } catch (_) {
      return date.toLocaleDateString("id-ID");
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (_) {
      return date.toLocaleString("id-ID");
    }
  };

  const normalizeType = (value) => {
    const raw = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

    if (
      raw === "paste" ||
      raw === "pastelink" ||
      raw === "pastelinks" ||
      raw === "link"
    ) {
      return "link";
    }

    if (
      raw === "code" ||
      raw === "codes"
    ) {
      return "code";
    }

    if (
      raw === "channel" ||
      raw === "telegramchannel"
    ) {
      return "channel";
    }

    if (
      raw === "group" ||
      raw === "telegramgroup"
    ) {
      return "group";
    }

    return "link";
  };

  const getContentIcon = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "fa-code";

      case "channel":
        return "fa-broadcast-tower";

      case "group":
        return "fa-users";

      default:
        return "fa-link";
    }
  };

  const getContentLabel = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "Code";

      case "channel":
        return "Channel";

      case "group":
        return "Group";

      default:
        return "Link";
    }
  };

  const isPaid = (item) => {
    return (
      String(item?.access_type || "").toLowerCase() === "paid" ||
      Number(item?.price || 0) > 0
    );
  };

  const getProfileUrl = () => {
    const username = String(
      profile?.username ||
      ""
    ).trim();

    if (username) {
      return `${location.origin}${location.pathname}?username=${encodeURIComponent(username)}`;
    }

    if (profile?.id) {
      return `${location.origin}${location.pathname}?id=${encodeURIComponent(profile.id)}`;
    }

    return location.href;
  };

  const setText = (id, value) => {
    const el = $(id);

    if (el) {
      el.textContent = value ?? "";
    }
  };

  const setHidden = (id, hidden) => {
    const el = $(id);

    if (!el) return;

    if (hidden) {
      el.setAttribute("hidden", "");
    } else {
      el.removeAttribute("hidden");
    }
  };


  /* =======================================================
     DOM
     ======================================================= */

  const nameEl = $("name");
  const avatarEl = $("avatar");
  const bioEl = $("bio");
  const handleEl = $("handle");
  const verifyEl = $("profileVerify");

  const followBtn = $("followBtn");
  const settingsBtn = $("settingsBtn");
  const adminBtn = $("adminBtn");

  const followersCountEl = $("followersCount");
  const followingCountEl = $("followingCount");
  const totalLikesEl = $("totalLikes");
  const totalContentEl = $("totalContent");

  const followersStat = $("followersStat");
  const followingStat = $("followingStat");

  const detailsEl = $("details");
  const countsEl = $("counts");

  const contentListEl = $("profileContentList");
  const contentTabsEl = $("profileContentTabs");
  const contentPaginationEl = $("profilePagination");

  const contentSearchEl = $("profileContentSearch");
  const clearContentSearchBtn = $("clearProfileContentSearch");
  const contentSortEl = $("profileContentSort");
  const contentResultEl = $("profileContentResult");

  const passwordSection = document.querySelector(".password-section");
  const passwordForm = $("profilePass");
  const passwordInput = $("profileNewPass");
  const passwordToggle = $("profilePassToggle");
  const passwordStrength = $("profilePasswordStrength");
  const passwordSubmit = $("profilePasswordSubmit");
  const passwordSubmitText = passwordSubmit?.querySelector(
    ".password-submit-text"
  );
  const passwordSubmitLoading = passwordSubmit?.querySelector(
    ".password-submit-loading"
  );

  const currentLoginEl = $("currentLogin");
  const lastLoginEl = $("lastLogin");
  const accountStatusEl = $("accountStatus");
  const sessionStatusEl = $("sessionStatus");

  const logoutBtn = $("profileLogoutBtn");

  const shareBtn = $("shareProfileBtn");
  const shareModal = $("profileShareModal");
  const shareClose = $("profileShareClose");
  const shareAvatar = $("shareProfileAvatar");
  const shareName = $("shareProfileName");
  const shareHandle = $("shareProfileHandle");
  const shareUrl = $("profileShareUrl");
  const copyProfileUrlBtn = $("copyProfileUrl");
  const nativeShareBtn = $("nativeShareProfile");
  const copyProfileShareBtn = $("copyProfileShare");


  /* =======================================================
     INITIAL STATE
     ======================================================= */

  if (!sb) {
    toast(
      "Supabase belum siap. Periksa konfigurasi aplikasi.",
      "error"
    );

    return;
  }

  let me = null;
  let profile = null;
  let isOwn = false;

  let content = [];

  let activeType = "all";
  let activePage = 1;

  let searchText = "";
  let sortMode = "newest";

  const pageSize = 5;

  let following = false;
  let followBusy = false;

  let contentLoading = false;
  let profileLoading = false;

  let previousFocus = null;


  /* =======================================================
     AUTH
     ======================================================= */

  const getCurrentUser = async () => {
    try {
      if (typeof TC.user === "function") {
        const user = await TC.user();

        if (user) {
          return user;
        }
      }
    } catch (_) {}

    try {
      const result = await sb.auth.getUser();

      if (!result.error && result.data?.user) {
        return result.data.user;
      }
    } catch (_) {}

    return null;
  };

  try {
    me = await getCurrentUser();
  } catch (_) {
    me = null;
  }


  /* =======================================================
     RESOLVE TARGET PROFILE
     ======================================================= */

  const params = new URLSearchParams(location.search);

  const target =
    params.get("user") ||
    params.get("username") ||
    params.get("id");

  const resolveProfile = async () => {

    /*
     * Public profile:
     * ?username=username
     * ?user=username
     * ?id=uuid
     */

    if (target) {

      const value = String(target).trim();

      if (!value) {
        return null;
      }

      let query = sb
        .from("profiles")
        .select("*");

      /*
       * UUID detection.
       * Do not assume every long string is UUID.
       */

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (uuidPattern.test(value)) {

        query = query.eq("id", value);

      } else {

        query = query.eq(
          "username",
          value.toLowerCase()
        );

      }

      const result = await query.maybeSingle();

      if (result.error) {
        console.error(
          "[Profile] profile query error:",
          result.error
        );

        throw result.error;
      }

      return result.data || null;
    }


    /*
     * Own profile.
     */

    if (!me) {
      return null;
    }

    try {
      if (typeof TC.profile === "function") {

        const ownProfile = await TC.profile();

        if (ownProfile) {
          return ownProfile;
        }
      }
    } catch (_) {}


    /*
     * Fallback directly from profiles.
     */

    const result = await sb
      .from("profiles")
      .select("*")
      .eq("id", me.id)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data || null;
  };


  /* =======================================================
     LOAD PROFILE
     ======================================================= */

  try {

    profileLoading = true;

    profile = await resolveProfile();

    if (!profile) {

      if (!target && !me) {
        location.replace("login.html");
        return;
      }

      renderProfileNotFound();
      return;
    }

    isOwn = Boolean(
      me?.id &&
      profile?.id &&
      String(me.id) === String(profile.id)
    );

  } catch (error) {

    console.error(
      "[Profile] Failed to load profile:",
      error
    );

    renderProfileError(
      error?.message ||
      "Profil gagal dimuat."
    );

    return;

  } finally {
    profileLoading = false;
  }


  /* =======================================================
     RENDER PROFILE HEADER
     ======================================================= */

  const profileName =
    profile.display_name ||
    profile.username ||
    "User";

  const username =
    profile.username ||
    "user";

  setText(
    "name",
    profileName
  );

  setText(
    "avatar",
    String(profileName)
      .trim()
      .slice(0, 1)
      .toUpperCase() || "U"
  );

  setText(
    "bio",
    profile.bio ||
    "Creator PasTele"
  );

  setText(
    "handle",
    `@${username}`
  );

  document.title =
    `${profileName} — PasTele`;


  /* =======================================================
     VERIFY BADGE
     ======================================================= */

  const renderVerification = () => {

    if (!verifyEl) return;

    verifyEl.hidden = true;

    const premium =
      profile.is_premium === true;

    const subscriptionActive =
      !premium &&
      profile.subscription_until &&
      new Date(profile.subscription_until) > new Date();

    if (premium) {

      verifyEl.hidden = false;

      verifyEl.className =
        "profile-verify blue";

      verifyEl.innerHTML =
        '<i class="fa-solid fa-check"></i>';

      verifyEl.title =
        "Premium";

      verifyEl.setAttribute(
        "aria-label",
        "Akun Premium"
      );

      return;
    }

    if (subscriptionActive) {

      verifyEl.hidden = false;

      verifyEl.className =
        "profile-verify green";

      verifyEl.innerHTML =
        '<i class="fa-solid fa-check"></i>';

      verifyEl.title =
        "Langganan aktif";

      verifyEl.setAttribute(
        "aria-label",
        "Langganan aktif"
      );
    }
  };

  renderVerification();


  /* =======================================================
     PROFILE ACTION VISIBILITY
     ======================================================= */

  if (isOwn) {

    setHidden(
      "followBtn",
      true
    );

    if (
      profile.is_admin === true ||
      profile.role === "admin" ||
      profile.role === "owner"
    ) {
      setHidden(
        "adminBtn",
        false
      );
    } else {
      setHidden(
        "adminBtn",
        true
      );
    }

    if (settingsBtn) {
      settingsBtn.removeAttribute("hidden");
    }

    if (passwordSection) {
      passwordSection.removeAttribute("hidden");
    }

  } else {

    setHidden(
      "settingsBtn",
      true
    );

    setHidden(
      "adminBtn",
      true
    );

    if (followBtn) {
      followBtn.removeAttribute("hidden");
    }

    /*
     * Public profiles don't show password section.
     */

    passwordSection?.remove();
  }


  /* =======================================================
     SHARE PROFILE DATA
     ======================================================= */

  const updateSharePreview = () => {

    const url = getProfileUrl();

    setText(
      "shareProfileAvatar",
      String(profileName)
        .trim()
        .slice(0, 1)
        .toUpperCase() || "U"
    );

    setText(
      "shareProfileName",
      profileName
    );

    setText(
      "shareProfileHandle",
      `@${username}`
    );

    if (shareUrl) {
      shareUrl.value = url;
    }
  };


  /* =======================================================
     SHARE MODAL
     ======================================================= */

  const openShareModal = () => {

    if (!shareModal) return;

    updateSharePreview();

    previousFocus =
      document.activeElement;

    shareModal.hidden = false;

    shareModal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "profile-modal-open"
    );

    requestAnimationFrame(() => {
      shareClose?.focus();
    });
  };

  const closeShareModal = () => {

    if (!shareModal) return;

    shareModal.hidden = true;

    shareModal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "profile-modal-open"
    );

    try {
      previousFocus?.focus();
    } catch (_) {}
  };

  shareBtn?.addEventListener(
    "click",
    openShareModal
  );

  shareClose?.addEventListener(
    "click",
    closeShareModal
  );

  shareModal?.querySelectorAll(
    "[data-close-profile-modal]"
  ).forEach((element) => {

    element.addEventListener(
      "click",
      closeShareModal
    );

  });


  /* =======================================================
     ESC CLOSE MODAL
     ======================================================= */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        shareModal &&
        !shareModal.hidden
      ) {
        closeShareModal();
      }

    }
  );


  /* =======================================================
     COPY
     ======================================================= */

  const copyText = async (text) => {

    const value = String(text || "");

    if (!value) {
      throw new Error(
        "Tidak ada data untuk disalin."
      );
    }

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      await navigator.clipboard.writeText(
        value
      );

      return;
    }

    const textarea =
      document.createElement("textarea");

    textarea.value = value;

    textarea.setAttribute(
      "readonly",
      ""
    );

    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(
      textarea
    );

    textarea.select();

    const copied =
      document.execCommand("copy");

    textarea.remove();

    if (!copied) {
      throw new Error(
        "Browser tidak mengizinkan copy."
      );
    }
  };


  const copyProfileLink = async () => {

    try {

      await copyText(
        getProfileUrl()
      );

      toast(
        "Link profil berhasil disalin.",
        "success"
      );

    } catch (error) {

      toast(
        error?.message ||
        "Gagal menyalin link profil.",
        "error"
      );
    }
  };

  copyProfileUrlBtn?.addEventListener(
    "click",
    copyProfileLink
  );

  copyProfileShareBtn?.addEventListener(
    "click",
    copyProfileLink
  );


  /* =======================================================
     NATIVE SHARE
     ======================================================= */

  nativeShareBtn?.addEventListener(
    "click",
    async () => {

      const url = getProfileUrl();

      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {

        try {

          await navigator.share({
            title:
              `${profileName} — PasTele`,
            text:
              `Lihat profil ${profileName} di PasTele.`,
            url
          });

          return;

        } catch (error) {

          if (
            error?.name === "AbortError"
          ) {
            return;
          }
        }
      }

      await copyProfileLink();
    }
  );


  /* =======================================================
     PROFILE COUNTS
     ======================================================= */

  const loadCounts = async () => {

    const [
      followersResult,
      followingResult,
      likesResult,
      contentResult
    ] = await Promise.all([

      sb
        .from("creator_followers")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "creator_id",
          profile.id
        ),

      sb
        .from("creator_followers")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "follower_id",
          profile.id
        ),

      sb
        .from("content_likes")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "content_owner_id",
          profile.id
        ),

      sb
        .from("marketplace_public")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "owner_id",
          profile.id
        )
    ]);

    const errors = [
      followersResult,
      followingResult,
      likesResult,
      contentResult
    ].filter(
      (result) => result?.error
    );

    if (errors.length) {
      console.warn(
        "[Profile] Some statistics failed:",
        errors.map(
          (item) => item.error
        )
      );
    }

    const followers =
      Number(
        followersResult?.count || 0
      );

    const following =
      Number(
        followingResult?.count || 0
      );

    const likes =
      Number(
        likesResult?.count || 0
      );

    const totalContent =
      Number(
        contentResult?.count || 0
      );

    setText(
      "followersCount",
      num(followers)
    );

    setText(
      "followingCount",
      num(following)
    );

    setText(
      "totalLikes",
      num(likes)
    );

    setText(
      "totalContent",
      num(totalContent)
    );

    return {
      followers,
      following,
      likes,
      totalContent
    };
  };

  await loadCounts();


  /* =======================================================
     FOLLOW STATE
     ======================================================= */

  const loadFollowState = async () => {

    if (
      isOwn ||
      !me ||
      !profile?.id
    ) {
      return false;
    }

    const result = await sb
      .from("creator_followers")
      .select("id")
      .eq(
        "creator_id",
        profile.id
      )
      .eq(
        "follower_id",
        me.id
      )
      .maybeSingle();

    if (result.error) {

      console.warn(
        "[Profile] Follow state error:",
        result.error
      );

      return false;
    }

    following =
      Boolean(result.data);

    return following;
  };


  const renderFollowButton = () => {

    if (!followBtn) return;

    if (following) {

      followBtn.classList.remove(
        "primary"
      );

      followBtn.innerHTML =
        '<i class="fa-solid fa-user-check"></i>' +
        "<span>Mengikuti</span>";

      followBtn.dataset.following =
        "1";

      followBtn.setAttribute(
        "aria-label",
        "Berhenti mengikuti creator"
      );

    } else {

      followBtn.classList.add(
        "primary"
      );

      followBtn.innerHTML =
        '<i class="fa-solid fa-user-plus"></i>' +
        "<span>Ikuti</span>";

      followBtn.dataset.following =
        "0";

      followBtn.setAttribute(
        "aria-label",
        "Ikuti creator"
      );
    }
  };


  if (!isOwn) {

    if (me) {

      await loadFollowState();

      renderFollowButton();

    } else {

      if (followBtn) {

        followBtn.classList.add(
          "primary"
        );

        followBtn.innerHTML =
          '<i class="fa-solid fa-right-to-bracket"></i>' +
          "<span>Login untuk mengikuti</span>";

        followBtn.dataset.following =
          "0";

        followBtn.onclick = () => {
          location.href =
            `login.html?redirect=${encodeURIComponent(
              location.href
            )}`;
        };
      }
    }
  }


  /* =======================================================
     FOLLOW / UNFOLLOW
     ======================================================= */

  followBtn?.addEventListener(
    "click",
    async () => {

      if (followBusy) return;

      if (!me) {

        location.href =
          `login.html?redirect=${encodeURIComponent(
            location.href
          )}`;

        return;
      }

      followBusy = true;

      followBtn.disabled = true;

      const wasFollowing =
        following;

      try {

        if (wasFollowing) {

          const result =
            await sb
              .from("creator_followers")
              .delete()
              .eq(
                "creator_id",
                profile.id
              )
              .eq(
                "follower_id",
                me.id
              );

          if (result.error) {
            throw result.error;
          }

          following = false;

          toast(
            "Berhenti mengikuti creator.",
            "success"
          );

        } else {

          const result =
            await sb
              .from("creator_followers")
              .insert({
                creator_id: profile.id,
                follower_id: me.id
              });

          if (result.error) {
            throw result.error;
          }

          following = true;

          toast(
            "Sekarang kamu mengikuti creator.",
            "success"
          );
        }

        renderFollowButton();

        await loadCounts();

      } catch (error) {

        console.error(
          "[Profile] Follow error:",
          error
        );

        /*
         * Unique violation can happen if
         * another request already inserted it.
         */

        if (
          error?.code === "23505"
        ) {

          following = true;

          renderFollowButton();

          await loadCounts();

        } else {

          toast(
            error?.message ||
            "Gagal mengubah status pengikut.",
            "error"
          );
        }

      } finally {

        followBusy = false;

        followBtn.disabled = false;
      }
    }
  );


  /* =======================================================
     FOLLOWING / FOLLOWERS SHORTCUT
     ======================================================= */

  followersStat?.addEventListener(
    "click",
    () => {

      const count =
        Number(
          followersCountEl?.textContent
            ?.replace(/\./g, "")
            ?.replace(/,/g, "") ||
          0
        );

      toast(
        `${num(count)} pengikut creator ini.`,
        "info"
      );
    }
  );

  followingStat?.addEventListener(
    "click",
    () => {

      const count =
        Number(
          followingCountEl?.textContent
            ?.replace(/\./g, "")
            ?.replace(/,/g, "") ||
          0
        );

      toast(
        `${num(count)} akun yang diikuti creator ini.`,
        "info"
      );
    }
  );


  /* =======================================================
     PROFILE DETAILS
     ======================================================= */

  const renderDetails = () => {

    if (!detailsEl) return;

    const email =
      profile.auth_email ||
      profile.email ||
      me?.email ||
      "Privat";

    const createdAt =
      profile.created_at;

    const updatedAt =
      profile.updated_at;

    const role =
      profile.role === "admin" ||
      profile.is_admin === true
        ? "Administrator"
        : "Creator";

    const status =
      profile.is_banned === true
        ? "banned"
        : "active";

    const statusLabel =
      String(status).toLowerCase() === "active"
        ? "Aktif"
        : String(status);

    const rows = [
      {
        label: "Username",
        value: `@${username}`
      },
      {
        label: "Nama",
        value: profileName
      },
      {
        label: "Email",
        value: isOwn
          ? email
          : "Privat"
      },
      {
        label: "Peran",
        value: role
      },
      {
        label: "Status akun",
        value: statusLabel
      },
      {
        label: "Bergabung",
        value: formatDate(createdAt)
      },
      {
        label: "Profil diperbarui",
        value: formatDate(updatedAt)
      },
      {
        label: "Creator",
        value: "Creator / User"
      }
    ];

    detailsEl.innerHTML =
      rows.map(
        (row) => `
          <div class="detail-row">
            <small>${esc(row.label)}</small>
            <b title="${esc(row.value)}">
              ${esc(row.value)}
            </b>
          </div>
        `
      ).join("");
  };

  renderDetails();


  /* =======================================================
     CONTENT SUMMARY
     ======================================================= */

  const renderContentSummary = () => {

    if (!countsEl) return;

    const summary = {
      link: 0,
      code: 0,
      channel: 0,
      group: 0
    };

    content.forEach((item) => {

      const type =
        normalizeType(item.type);

      if (
        Object.prototype.hasOwnProperty.call(
          summary,
          type
        )
      ) {
        summary[type]++;
      }
    });

    const rows = [
      {
        type: "link",
        icon: "fa-link",
        label: "PasteLink",
        count: summary.link,
        color: "blue"
      },
      {
        type: "code",
        icon: "fa-code",
        label: "Code",
        count: summary.code,
        color: "purple"
      },
      {
        type: "channel",
        icon: "fa-broadcast-tower",
        label: "Channel",
        count: summary.channel,
        color: "orange"
      },
      {
        type: "group",
        icon: "fa-users",
        label: "Group",
        count: summary.group,
        color: "pink"
      }
    ];

    countsEl.innerHTML =
      rows.map(
        (row) => `
          <a
            class="content-count"
            href="#publicContentSection"
            data-summary-type="${esc(row.type)}"
          >
            <span>
              <i class="fa-solid ${esc(row.icon)}"></i>
              ${esc(row.label)}
            </span>

            <b>${num(row.count)}</b>
          </a>
        `
      ).join("");

    countsEl
      .querySelectorAll(
        "[data-summary-type]"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          (event) => {

            event.preventDefault();

            const requestedType =
              button.dataset.summaryType;

            activeType =
              requestedType || "all";

            activePage = 1;

            syncContentTabs();

            renderContent();

            document
              .getElementById(
                "publicContentSection"
              )
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
          }
        );

      });
  };


  /* =======================================================
     LOAD PUBLIC CONTENT
     ======================================================= */

  const loadContent = async () => {

    if (!profile?.id) return;

    contentLoading = true;

    if (contentListEl) {

      contentListEl.innerHTML = `
        <div class="profile-loading">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          <span>Memuat konten...</span>
        </div>
      `;
    }

    try {

      const result =
        await sb
          .from("marketplace_public")
          .select(`
            id,
            slug,
            title,
            type,
            access_type,
            price,
            views,
            sales_count,
            created_at,
            description,
            owner_id
          `)
          .eq(
            "owner_id",
            profile.id
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          )
          .limit(500);

      if (result.error) {
        throw result.error;
      }

      content =
        Array.isArray(result.data)
          ? result.data
          : [];

      activePage = 1;

      renderContentSummary();

      renderContent();

    } catch (error) {

      console.error(
        "[Profile] Content error:",
        error
      );

      content = [];

      if (contentListEl) {

        contentListEl.innerHTML = `
          <div class="profile-error">
            <i class="fa-solid fa-triangle-exclamation"></i>

            <strong>
              Konten gagal dimuat
            </strong>

            <span>
              ${esc(
                error?.message ||
                "Terjadi kesalahan saat memuat konten."
              )}
            </span>
          </div>
        `;
      }

      if (contentResultEl) {
        contentResultEl.textContent =
          "Konten tidak dapat dimuat.";
      }

    } finally {

      contentLoading = false;
    }
  };


  /* =======================================================
     FILTER CONTENT
     ======================================================= */

  const getFilteredContent = () => {

    let rows =
      Array.isArray(content)
        ? [...content]
        : [];

    if (activeType !== "all") {

      rows = rows.filter(
        (item) =>
          normalizeType(item.type) ===
          activeType
      );
    }

    if (searchText) {

      const query =
        searchText.toLowerCase();

      rows = rows.filter(
        (item) => {

          const title =
            String(
              item.title || ""
            ).toLowerCase();

          const description =
            String(
              item.description || ""
            ).toLowerCase();

          const type =
            normalizeType(
              item.type
            );

          return (
            title.includes(query) ||
            description.includes(query) ||
            type.includes(query)
          );
        }
      );
    }

    switch (sortMode) {

      case "oldest":

        rows.sort(
          (a, b) =>
            new Date(a.created_at || 0) -
            new Date(b.created_at || 0)
        );

        break;

      case "popular":

        rows.sort(
          (a, b) =>
            Number(b.views || 0) -
            Number(a.views || 0)
        );

        break;

      case "sales":

        rows.sort(
          (a, b) =>
            Number(b.sales_count || 0) -
            Number(a.sales_count || 0)
        );

        break;

      case "newest":
      default:

        rows.sort(
          (a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        );

        break;
    }

    return rows;
  };


  /* =======================================================
     CONTENT CARD
     ======================================================= */

  const renderContentCard = (item) => {

    const type =
      normalizeType(item.type);

    const icon =
      getContentIcon(type);

    const label =
      getContentLabel(type);

    const paid =
      isPaid(item);

    const title =
      item.title ||
      "Untitled";

    const views =
      Number(item.views || 0);

    const sales =
      Number(item.sales_count || 0);

    const created =
      formatDate(item.created_at);

    const price =
      Number(item.price || 0);

    const productUrl =
      `product.html?id=${encodeURIComponent(
        item.id
      )}&type=${encodeURIComponent(
        type
      )}`;

    const accessLabel =
      paid
        ? "PAID"
        : "FREE";

    const meta =
      `${label} · ${num(views)} views · ${created}`;

    return `
      <a
        class="profile-content-card"
        href="${esc(productUrl)}"
        aria-label="${esc(title)}"
      >

        <span class="content-icon">
          <i class="fa-solid ${esc(icon)}"></i>
        </span>

        <main>

          <strong title="${esc(title)}">
            ${esc(title)}
          </strong>

          <small>
            ${esc(meta)}
            · ${esc(accessLabel)}
            ${sales > 0
              ? ` · ${num(sales)} penjualan`
              : ""}
          </small>

        </main>

        <b>
          ${paid
            ? esc(money(price))
            : "FREE"}
        </b>

      </a>
    `;
  };


  /* =======================================================
     CONTENT PAGINATION
     ======================================================= */

  const renderPagination = (totalPages) => {

    if (!contentPaginationEl) {
      return;
    }

    if (totalPages <= 1) {

      contentPaginationEl.innerHTML = "";

      return;
    }

    const buttons = [];

    const addButton = (
      page,
      label,
      active = false,
      disabled = false
    ) => {

      buttons.push(`
        <button
          type="button"
          data-p="${page}"
          ${active ? 'class="active"' : ""}
          ${disabled ? "disabled" : ""}
          aria-label="Halaman ${esc(label)}"
          ${active
            ? 'aria-current="page"'
            : ""}
        >
          ${esc(label)}
        </button>
      `);
    };


    /*
     * Previous
     */

    addButton(
      activePage - 1,
      "Sebelumnya",
      false,
      activePage <= 1
    );


    /*
     * Page range.
     */

    let start =
      Math.max(
        1,
        activePage - 2
      );

    let end =
      Math.min(
        totalPages,
        activePage + 2
      );

    if (activePage <= 3) {
      end =
        Math.min(
          totalPages,
          5
        );
    }

    if (activePage >= totalPages - 2) {
      start =
        Math.max(
          1,
          totalPages - 4
        );
    }


    /*
     * First page.
     */

    if (start > 1) {

      addButton(
        1,
        "1",
        activePage === 1
      );

      if (start > 2) {
        buttons.push(
          `<span aria-hidden="true">…</span>`
        );
      }
    }


    for (
      let page = start;
      page <= end;
      page++
    ) {

      addButton(
        page,
        String(page),
        page === activePage
      );
    }


    /*
     * Last page.
     */

    if (end < totalPages) {

      if (end < totalPages - 1) {
        buttons.push(
          `<span aria-hidden="true">…</span>`
        );
      }

      addButton(
        totalPages,
        String(totalPages),
        activePage === totalPages
      );
    }


    /*
     * Next.
     */

    addButton(
      activePage + 1,
      "Berikutnya",
      false,
      activePage >= totalPages
    );

    contentPaginationEl.innerHTML =
      buttons.join("");


    contentPaginationEl
      .querySelectorAll(
        "button[data-p]"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            if (
              button.disabled
            ) {
              return;
            }

            const nextPage =
              Number(
                button.dataset.p
              );

            if (
              !Number.isFinite(
                nextPage
              )
            ) {
              return;
            }

            activePage =
              Math.max(
                1,
                Math.min(
                  totalPages,
                  nextPage
                )
              );

            renderContent();

            document
              .getElementById(
                "publicContentSection"
              )
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
          }
        );

      });
  };


  /* =======================================================
     RENDER CONTENT
     ======================================================= */

  const renderContent = () => {

    if (!contentListEl) {
      return;
    }

    const filtered =
      getFilteredContent();

    const totalItems =
      filtered.length;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          totalItems / pageSize
        )
      );

    activePage =
      Math.min(
        activePage,
        totalPages
      );

    const start =
      (activePage - 1) *
      pageSize;

    const rows =
      filtered.slice(
        start,
        start + pageSize
      );


    /*
     * Result text.
     */

    if (contentResultEl) {

      if (!totalItems) {

        contentResultEl.textContent =
          searchText
            ? "Tidak ada konten yang cocok dengan pencarian."
            : "Creator ini belum memiliki konten publik.";

      } else {

        const from =
          start + 1;

        const to =
          Math.min(
            start + rows.length,
            totalItems
          );

        contentResultEl.textContent =
          `Menampilkan ${num(from)}–${num(to)} dari ${num(totalItems)} konten`;
      }
    }


    /*
     * Empty.
     */

    if (!rows.length) {

      contentListEl.innerHTML = `
        <div class="profile-empty">

          <i class="fa-solid fa-layer-group"></i>

          <strong>
            ${
              searchText
                ? "Konten tidak ditemukan"
                : "Belum ada konten publik"
            }
          </strong>

          <span>
            ${
              searchText
                ? "Coba gunakan kata kunci lain atau ubah filter."
                : "Creator ini belum memiliki konten publik."
            }
          </span>

        </div>
      `;

      renderPagination(totalPages);

      return;
    }


    /*
     * Cards.
     */

    contentListEl.innerHTML =
      rows
        .map(renderContentCard)
        .join("");


    renderPagination(
      totalPages
    );
  };


  /* =======================================================
     SYNC CONTENT TABS
     ======================================================= */

  const syncContentTabs = () => {

    if (!contentTabsEl) return;

    contentTabsEl
      .querySelectorAll(
        "button[data-type]"
      )
      .forEach((button) => {

        const active =
          normalizeType(
            button.dataset.type
          ) === activeType ||
          (
            activeType === "all" &&
            button.dataset.type === "all"
          );

        button.classList.toggle(
          "active",
          active
        );

        button.setAttribute(
          "aria-selected",
          active
            ? "true"
            : "false"
        );
      });
  };


  /* =======================================================
     CONTENT TAB EVENTS
     ======================================================= */

  contentTabsEl
    ?.querySelectorAll(
      "button[data-type]"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const requested =
            button.dataset.type;

          activeType =
            requested === "all"
              ? "all"
              : normalizeType(
                  requested
                );

          activePage = 1;

          syncContentTabs();

          renderContent();
        }
      );

    });


  /* =======================================================
     SEARCH
     ======================================================= */

  const updateSearchButton = () => {

    if (!clearContentSearchBtn) {
      return;
    }

    if (
      searchText ||
      contentSearchEl?.value
    ) {
      clearContentSearchBtn.hidden =
        false;
    } else {
      clearContentSearchBtn.hidden =
        true;
    }
  };


  contentSearchEl?.addEventListener(
    "input",
    () => {

      searchText =
        String(
          contentSearchEl.value || ""
        ).trim();

      activePage = 1;

      updateSearchButton();

      renderContent();
    }
  );


  clearContentSearchBtn?.addEventListener(
    "click",
    () => {

      if (contentSearchEl) {
        contentSearchEl.value = "";
        contentSearchEl.focus();
      }

      searchText = "";

      activePage = 1;

      updateSearchButton();

      renderContent();
    }
  );


  /* =======================================================
     SORT
     ======================================================= */

  contentSortEl?.addEventListener(
    "change",
    () => {

      sortMode =
        contentSortEl.value ||
        "newest";

      activePage = 1;

      renderContent();
    }
  );


  /* =======================================================
     PASSWORD STRENGTH
     ======================================================= */

  const getPasswordStrength = (password) => {

    const value =
      String(password || "");

    if (!value) {
      return {
        score: 0,
        label: "",
        className: ""
      };
    }

    let score = 0;

    if (value.length >= 6) {
      score++;
    }

    if (value.length >= 10) {
      score++;
    }

    if (/[a-z]/.test(value)) {
      score++;
    }

    if (/[A-Z]/.test(value)) {
      score++;
    }

    if (/[0-9]/.test(value)) {
      score++;
    }

    if (/[^A-Za-z0-9]/.test(value)) {
      score++;
    }


    if (
      value.length < 6
    ) {

      return {
        score,
        label: "Terlalu pendek",
        className: "weak"
      };
    }

    if (score <= 2) {

      return {
        score,
        label: "Password lemah",
        className: "weak"
      };
    }

    if (score <= 4) {

      return {
        score,
        label: "Password cukup kuat",
        className: "medium"
      };
    }

    return {
      score,
      label: "Password kuat",
      className: "strong"
    };
  };


  const renderPasswordStrength = () => {

    if (!passwordStrength) {
      return;
    }

    const result =
      getPasswordStrength(
        passwordInput?.value
      );

    passwordStrength.className =
      "password-strength";

    if (!result.label) {
      passwordStrength.textContent = "";
      return;
    }

    passwordStrength.classList.add(
      result.className
    );

    passwordStrength.textContent =
      result.label;
  };


  passwordInput?.addEventListener(
    "input",
    renderPasswordStrength
  );


  /* =======================================================
     PASSWORD TOGGLE
     ======================================================= */

  passwordToggle?.addEventListener(
    "click",
    () => {

      if (!passwordInput) {
        return;
      }

      const visible =
        passwordInput.type === "text";

      passwordInput.type =
        visible
          ? "password"
          : "text";

      passwordToggle.innerHTML =
        `<i class="fa-solid ${
          visible
            ? "fa-eye"
            : "fa-eye-slash"
        }"></i>`;

      passwordToggle.setAttribute(
        "aria-label",
        visible
          ? "Tampilkan password"
          : "Sembunyikan password"
      );

      passwordToggle.setAttribute(
        "aria-pressed",
        visible
          ? "false"
          : "true"
      );
    }
  );


  /* =======================================================
     PASSWORD BUTTON STATE
     ======================================================= */

  const setPasswordLoading = (
    loading
  ) => {

    if (!passwordSubmit) {
      return;
    }

    passwordSubmit.disabled =
      loading;

    passwordSubmit.classList.toggle(
      "loading",
      loading
    );

    if (passwordSubmitText) {
      passwordSubmitText.hidden =
        loading;
    }

    if (passwordSubmitLoading) {
      passwordSubmitLoading.hidden =
        !loading;
    }
  };


  /* =======================================================
     PASSWORD CHANGE
     ======================================================= */

  passwordForm?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      if (!passwordInput) {
        return;
      }

      const password =
        String(
          passwordInput.value || ""
        );

      if (password.length < 6) {

        toast(
          "Password minimal 6 karakter.",
          "error"
        );

        passwordInput.focus();

        return;
      }

      if (password.length > 128) {

        toast(
          "Password terlalu panjang.",
          "error"
        );

        passwordInput.focus();

        return;
      }

      if (!me) {

        toast(
          "Sesi login tidak ditemukan.",
          "error"
        );

        return;
      }

      setPasswordLoading(
        true
      );

      try {

        const result =
          await sb.auth.updateUser({
            password
          });

        if (result.error) {
          throw result.error;
        }

        toast(
          "Password berhasil diubah.",
          "success"
        );

        passwordForm.reset();

        if (passwordStrength) {
          passwordStrength.textContent = "";
          passwordStrength.className =
            "password-strength";
        }

        if (
          passwordInput.type !==
          "password"
        ) {
          passwordInput.type =
            "password";

          passwordToggle &&
            (
              passwordToggle.innerHTML =
                '<i class="fa-solid fa-eye"></i>'
            );
        }

      } catch (error) {

        console.error(
          "[Profile] Password update error:",
          error
        );

        toast(
          error?.message ||
          "Password gagal diubah.",
          "error"
        );

      } finally {

        setPasswordLoading(
          false
        );
      }
    }
  );


  /* =======================================================
     LOGIN SECURITY
     ======================================================= */

  const renderLoginSecurity = async () => {

    if (currentLoginEl) {

      if (me) {

        currentLoginEl.textContent =
          "Aktif";

      } else {

        currentLoginEl.textContent =
          "Tidak login";
      }
    }


    if (sessionStatusEl) {

      sessionStatusEl.textContent =
        me
          ? "Sesi aktif"
          : "Tidak aktif";
    }


    if (accountStatusEl) {

      const status =
        String(
          profile.is_banned === true
            ? "banned"
            : "active"
        ).toLowerCase();

      if (status === "active") {

        accountStatusEl.textContent =
          "Aktif";

      } else {

        accountStatusEl.textContent =
          status
            .charAt(0)
            .toUpperCase() +
          status.slice(1);
      }
    }


    /*
     * Last login is available from
     * Supabase Auth user metadata when
     * exposed by the current session.
     */

    if (lastLoginEl) {

      let lastLogin = null;

      try {

        const authUser =
          me ||
          (
            await sb.auth.getUser()
          ).data?.user;

        lastLogin =
          authUser?.last_sign_in_at ||
          authUser?.user_metadata
            ?.last_sign_in_at ||
          null;

      } catch (_) {}

      lastLoginEl.textContent =
        lastLogin
          ? formatDateTime(lastLogin)
          : "Belum ada";
    }
  };

  await renderLoginSecurity();


  /* =======================================================
     LOGOUT
     ======================================================= */

  logoutBtn?.addEventListener(
    "click",
    async () => {

      if (
        logoutBtn.disabled
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Yakin ingin keluar dari akun PasTele?"
        );

      if (!confirmed) {
        return;
      }

      logoutBtn.disabled =
        true;

      const originalHtml =
        logoutBtn.innerHTML;

      logoutBtn.innerHTML =
        '<span class="account-action-icon">' +
        '<i class="fa-solid fa-circle-notch fa-spin"></i>' +
        "</span>" +
        "<span>" +
        "<strong>Keluar...</strong>" +
        "<small>Menutup sesi akun</small>" +
        "</span>";

      try {

        if (
          typeof TC.logout ===
          "function"
        ) {

          await TC.logout();

        } else {

          const result =
            await sb.auth.signOut();

          if (result.error) {
            throw result.error;
          }
        }

        toast(
          "Berhasil keluar dari akun.",
          "success"
        );

        setTimeout(
          () => {
            location.replace(
              "login.html"
            );
          },
          350
        );

      } catch (error) {

        console.error(
          "[Profile] Logout error:",
          error
        );

        toast(
          error?.message ||
          "Gagal keluar dari akun.",
          "error"
        );

        logoutBtn.innerHTML =
          originalHtml;

        logoutBtn.disabled =
          false;
      }
    }
  );


  /* =======================================================
     LOAD CONTENT
     ======================================================= */

  await loadContent();

  syncContentTabs();

  updateSearchButton();


  /* =======================================================
     MODAL BODY LOCK
     ======================================================= */

  /*
   * Prevent background scroll while
   * share modal is open.
   */

  const observer =
    new MutationObserver(() => {

      if (
        shareModal &&
        !shareModal.hidden
      ) {

        document.body.style.overflow =
          "hidden";

      } else {

        document.body.style.overflow =
          "";
      }
    });

  if (shareModal) {

    observer.observe(
      shareModal,
      {
        attributes: true,
        attributeFilter: [
          "hidden"
        ]
      }
    );
  }


  /* =======================================================
     FINAL
     ======================================================= */

  console.info(
    "[Profile] Loaded:",
    {
      profileId: profile.id,
      username: profile.username,
      isOwn,
      contentCount: content.length
    }
  );

});


/* =========================================================
   PROFILE FALLBACK ERROR STATES
   ========================================================= */

function renderProfileNotFound() {

  const name =
    document.getElementById("name");

  const avatar =
    document.getElementById("avatar");

  const bio =
    document.getElementById("bio");

  const handle =
    document.getElementById("handle");

  const details =
    document.getElementById("details");

  const counts =
    document.getElementById("counts");

  const content =
    document.getElementById(
      "profileContentList"
    );

  const pagination =
    document.getElementById(
      "profilePagination"
    );

  if (name) {
    name.textContent =
      "Profil tidak ditemukan";
  }

  if (avatar) {
    avatar.textContent =
      "?";
  }

  if (bio) {
    bio.textContent =
      "Profil yang kamu cari tidak tersedia.";
  }

  if (handle) {
    handle.textContent =
      "";
  }

  if (details) {
    details.innerHTML = `
      <div class="profile-error">
        <i class="fa-solid fa-user-slash"></i>

        <strong>
          Profil tidak ditemukan
        </strong>

        <span>
          Username atau profil tersebut
          tidak tersedia.
        </span>
      </div>
    `;
  }

  if (counts) {
    counts.innerHTML = "";
  }

  if (content) {
    content.innerHTML = `
      <div class="profile-empty">
        <i class="fa-solid fa-user-slash"></i>

        <strong>
          Tidak ada profil
        </strong>

        <span>
          Profil creator ini tidak ditemukan
          atau sudah tidak tersedia.
        </span>
      </div>
    `;
  }

  if (pagination) {
    pagination.innerHTML = "";
  }

  document.title =
    "Profil tidak ditemukan — PasTele";
}


function renderProfileError(
  message
) {

  const name =
    document.getElementById("name");

  const avatar =
    document.getElementById("avatar");

  const bio =
    document.getElementById("bio");

  const details =
    document.getElementById("details");

  const content =
    document.getElementById(
      "profileContentList"
    );

  if (name) {
    name.textContent =
      "Gagal memuat profil";
  }

  if (avatar) {
    avatar.textContent =
      "!";
  }

  if (bio) {
    bio.textContent =
      "Terjadi masalah saat memuat data profil.";
  }

  if (details) {
    details.innerHTML = `
      <div class="profile-error">
        <i class="fa-solid fa-triangle-exclamation"></i>

        <strong>
          Profil gagal dimuat
        </strong>

        <span>
          ${escapeProfileText(
            message ||
            "Silakan coba lagi."
          )}
        </span>
      </div>
    `;
  }

  if (content) {
    content.innerHTML = `
      <div class="profile-error">
        <i class="fa-solid fa-triangle-exclamation"></i>

        <strong>
          Data tidak tersedia
        </strong>

        <span>
          Silakan refresh halaman dan coba lagi.
        </span>
      </div>
    `;
  }

  document.title =
    "Profile — PasTele";
}


function escapeProfileText(
  value
) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );
}


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
