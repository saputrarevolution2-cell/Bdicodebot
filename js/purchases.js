/* GENERATED PAGE JS BUNDLE: purchases.html */

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
          .select('username,display_name,avatar_url,is_admin,is_premium,subscription_until,telegram_username,whatsapp_number,website,balance')
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
      { url: normalizeSocial(profile?.whatsapp_number, 'whatsapp'), icon:'fa-brands fa-whatsapp', label:'WhatsApp' },
      { url: normalizeSocial(profile?.website, 'website'), icon:'fa-solid fa-globe', label:'Website' }
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

/* ===== SOURCE: js/purchases.js ===== */
/* =========================================================
   PasTele — Purchases
   FINAL PREMIUM
   Search + Filter + Sort + Pagination + Stats
   Supabase + Responsive UI
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  /* =======================================================
     DOM
     ======================================================= */

  const $ = (selector, root = document) => {
    try {
      return root.querySelector(selector);
    } catch {
      return null;
    }
  };

  const $$ = (selector, root = document) => {
    try {
      return [...root.querySelectorAll(selector)];
    } catch {
      return [];
    }
  };

  const content = $("#content");
  const toastBox = $("#toast");

  const searchInput = $("#purchaseSearch");
  const clearSearchBtn = $("#clearPurchaseSearch");

  const statusFilter = $("#purchaseStatus");
  const typeFilter = $("#purchaseType");
  const sortFilter = $("#purchaseSort");
  const resetFilterBtn = $("#resetPurchaseFilters");

  const refreshBtn = $("#refreshPurchases");

  const resultText = $("#purchaseResultText");

  const pagination = $("#purchasePagination");

  const totalPurchasesEl = $("#totalPurchases");
  const successfulPurchasesEl = $("#successfulPurchases");
  const pendingPurchasesEl = $("#pendingPurchases");
  const totalSpentEl = $("#totalSpent");


  /* =======================================================
     STATE
     ======================================================= */

  const state = {
    user: null,
    rows: [],
    filteredRows: [],
    page: 1,
    pageSize: 8,
    search: "",
    status: "all",
    type: "all",
    sort: "newest",
    loading: false
  };


  /* =======================================================
     SAFE GLOBALS
     ======================================================= */

  const TC = window.TC || {};
  const sb = window.sb || window.supabaseClient || null;


  /* =======================================================
     HELPERS
     ======================================================= */

  const esc = (value) => {
    if (typeof TC.esc === "function") {
      return TC.esc(value);
    }

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };


  const money = (value) => {
    const amount = Number(value || 0);

    if (typeof TC.money === "function") {
      try {
        return TC.money(amount);
      } catch {}
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };


  const toast = (message, type = "info") => {
    if (typeof TC.toast === "function") {
      try {
        TC.toast(message, type);
        return;
      } catch {}
    }

    if (!toastBox) return;

    toastBox.textContent = message;
    toastBox.className = `toast toast-${type}`;

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
      toastBox.textContent = "";
      toastBox.className = "";
    }, 3200);
  };


  const normalizeType = (value) => {
    const type = String(value || "")
      .trim()
      .toLowerCase();

    if (
      type === "link" ||
      type === "paste" ||
      type === "pastelink" ||
      type === "paste-link" ||
      type === "paste_link"
    ) {
      return "link";
    }

    if (
      type === "telegram_channel" ||
      type === "telegram-channel"
    ) {
      return "channel";
    }

    if (
      type === "telegram_group" ||
      type === "telegram-group"
    ) {
      return "group";
    }

    return type || "link";
  };


  const normalizeStatus = (value) => {
    const status = String(value || "")
      .trim()
      .toLowerCase();

    if (
      status === "success" ||
      status === "successful" ||
      status === "completed" ||
      status === "complete" ||
      status === "paid"
    ) {
      return "paid";
    }

    if (
      status === "cancel" ||
      status === "cancelled" ||
      status === "canceled"
    ) {
      return "cancelled";
    }

    if (
      status === "failed" ||
      status === "error" ||
      status === "expired"
    ) {
      return "failed";
    }

    if (
      status === "pending" ||
      status === "waiting" ||
      status === "unpaid"
    ) {
      return "pending";
    }

    return status || "pending";
  };


  const typeLabel = (type) => {
    switch (normalizeType(type)) {
      case "link":
        return "PasteLink";

      case "code":
        return "Code";

      case "channel":
        return "Channel";

      case "group":
        return "Group";

      default:
        return "Produk";
    }
  };


  const typeIcon = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "fa-code";

      case "channel":
        return "fa-broadcast-tower";

      case "group":
        return "fa-users";

      case "link":
      default:
        return "fa-link";
    }
  };


  const statusLabel = (status) => {
    switch (normalizeStatus(status)) {
      case "paid":
        return "Berhasil";

      case "pending":
        return "Pending";

      case "failed":
        return "Gagal";

      case "cancelled":
        return "Dibatalkan";

      default:
        return String(status || "Pending");
    }
  };


  const statusIcon = (status) => {
    switch (normalizeStatus(status)) {
      case "paid":
        return "fa-circle-check";

      case "pending":
        return "fa-clock";

      case "failed":
        return "fa-circle-xmark";

      case "cancelled":
        return "fa-ban";

      default:
        return "fa-circle-question";
    }
  };


  const formatDate = (date) => {
    if (!date) return "Tanggal tidak tersedia";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Tanggal tidak tersedia";
    }

    return parsed.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };


  const getProductTitle = (row) => {
    return (
      row?.item_title ||
      row?.products?.title ||
      row?.product?.title ||
      "Produk"
    );
  };


  const getProductType = (row) => {
    return normalizeType(
      row?.item_type ||
      row?.products?.type ||
      row?.product?.type ||
      "link"
    );
  };


  const getProductId = (row) => {
    return (
      row?.item_id ||
      row?.product_id ||
      null
    );
  };


  const getAccessUrl = (row) => {
    const id = getProductId(row);

    if (!id) {
      return null;
    }

    const type = getProductType(row);

    return `product.html?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`;
  };


  const getSearchText = (row) => {
    const title = getProductTitle(row);

    const type = typeLabel(getProductType(row));

    const status = statusLabel(row?.status);

    const id =
      row?.id ||
      row?.item_id ||
      row?.product_id ||
      "";

    return [
      title,
      type,
      status,
      id
    ]
      .join(" ")
      .toLowerCase();
  };


  /* =======================================================
     AUTH
     ======================================================= */

  const getUserProfile = async () => {
    try {
      if (typeof TC.profile === "function") {
        const profile = await TC.profile();

        if (profile) {
          return profile;
        }
      }
    } catch (error) {
      console.warn(
        "[Purchases] TC.profile() failed:",
        error
      );
    }

    try {
      if (!sb?.auth?.getUser) {
        return null;
      }

      const {
        data,
        error
      } = await sb.auth.getUser();

      if (error || !data?.user) {
        return null;
      }

      return data.user;
    } catch (error) {
      console.warn(
        "[Purchases] Supabase auth failed:",
        error
      );

      return null;
    }
  };


  /* =======================================================
     AUTH CHECK
     ======================================================= */

  state.user = await getUserProfile();

  if (!state.user) {
    location.replace("login.html");
    return;
  }


  /* =======================================================
     LOADING
     ======================================================= */

  const setLoading = (loading) => {
    state.loading = Boolean(loading);

    if (content) {
      content.setAttribute(
        "aria-busy",
        loading ? "true" : "false"
      );
    }

    if (refreshBtn) {
      refreshBtn.disabled = loading;

      refreshBtn.classList.toggle(
        "is-loading",
        loading
      );

      const icon = $("i", refreshBtn);

      if (icon) {
        icon.classList.toggle(
          "fa-spin",
          loading
        );
      }
    }
  };


  const renderLoading = () => {
    if (!content) return;

    content.innerHTML = `
      <div class="purchases-loading">

        <div
          class="purchases-loading-icon"
          aria-hidden="true"
        >
          <i class="fa-solid fa-spinner fa-spin"></i>
        </div>

        <div class="purchases-loading-text">

          <strong>
            Memuat pembelian
          </strong>

          <span>
            Sedang mengambil riwayat pembelian kamu...
          </span>

        </div>

      </div>
    `;
  };


  /* =======================================================
     FETCH PURCHASES
     ======================================================= */

  const fetchPurchases = async () => {
    if (!sb) {
      throw new Error(
        "Supabase belum tersedia. Periksa konfigurasi."
      );
    }

    const buyerId =
      state.user?.id ||
      state.user?.user_id;

    if (!buyerId) {
      throw new Error(
        "ID akun tidak ditemukan. Silakan login kembali."
      );
    }

    const query = sb
      .from("purchases")
      .select(`
        id,
        product_id,
        order_id,
        item_type,
        item_id,
        item_title,
        amount,
        status,
        access_url,
        created_at
      `)
      .eq("buyer_id", buyerId)
      .order("created_at", {
        ascending: false
      });

    const {
      data,
      error
    } = await query;

    if (error) {
      throw error;
    }

    return Array.isArray(data)
      ? data
      : [];
  };


  /* =======================================================
     LOAD
     ======================================================= */

  const loadPurchases = async ({
    silent = false
  } = {}) => {

    if (state.loading) {
      return;
    }

    try {

      setLoading(true);

      if (!silent) {
        renderLoading();
      }

      const rows = await fetchPurchases();

      state.rows = rows.map(row => ({
        ...row,

        _type: getProductType(row),

        _status: normalizeStatus(row.status),

        _title: getProductTitle(row),

        _productId: getProductId(row),

        _amount: Number(row.amount || 0),

        _timestamp: new Date(
          row.created_at || 0
        ).getTime()
      }));

      state.page = 1;

      updateStats();

      applyFilters();

    } catch (error) {

      console.error(
        "[Purchases] Load error:",
        error
      );

      renderError(
        error?.message ||
        "Gagal memuat riwayat pembelian."
      );

      toast(
        "Gagal memuat pembelian.",
        "error"
      );

    } finally {

      setLoading(false);

    }
  };


  /* =======================================================
     STATISTICS
     ======================================================= */

  const updateStats = () => {

    const rows = state.rows;

    const total = rows.length;

    const successful = rows.filter(
      row => row._status === "paid"
    ).length;

    const pending = rows.filter(
      row => row._status === "pending"
    ).length;

    const spent = rows
      .filter(row => row._status === "paid")
      .reduce(
        (sum, row) => sum + row._amount,
        0
      );

    if (totalPurchasesEl) {
      totalPurchasesEl.textContent =
        total.toLocaleString("id-ID");
    }

    if (successfulPurchasesEl) {
      successfulPurchasesEl.textContent =
        successful.toLocaleString("id-ID");
    }

    if (pendingPurchasesEl) {
      pendingPurchasesEl.textContent =
        pending.toLocaleString("id-ID");
    }

    if (totalSpentEl) {
      totalSpentEl.textContent =
        money(spent);
    }
  };


  /* =======================================================
     FILTER
     ======================================================= */

  const applyFilters = () => {

    const search = String(
      state.search || ""
    )
      .trim()
      .toLowerCase();

    let rows = [...state.rows];


    /* Search */

    if (search) {
      rows = rows.filter(row =>
        getSearchText(row).includes(search)
      );
    }


    /* Status */

    if (state.status !== "all") {
      rows = rows.filter(
        row => row._status === state.status
      );
    }


    /* Type */

    if (state.type !== "all") {
      rows = rows.filter(
        row => row._type === state.type
      );
    }


    /* Sort */

    switch (state.sort) {

      case "oldest":

        rows.sort(
          (a, b) =>
            a._timestamp - b._timestamp
        );

        break;


      case "price-high":

        rows.sort(
          (a, b) =>
            b._amount - a._amount
        );

        break;


      case "price-low":

        rows.sort(
          (a, b) =>
            a._amount - b._amount
        );

        break;


      case "newest":
      default:

        rows.sort(
          (a, b) =>
            b._timestamp - a._timestamp
        );

        break;
    }


    state.filteredRows = rows;

    const totalPages = Math.max(
      1,
      Math.ceil(
        rows.length / state.pageSize
      )
    );

    if (state.page > totalPages) {
      state.page = totalPages;
    }

    renderPurchases();

    renderPagination();

    updateResultBar();

    updateSearchClear();

  };


  /* =======================================================
     RESULT BAR
     ======================================================= */

  const updateResultBar = () => {

    if (!resultText) {
      return;
    }

    const total = state.filteredRows.length;

    const all = state.rows.length;

    if (!all) {

      resultText.textContent =
        "Belum ada pembelian";

      return;
    }

    if (total === all) {

      resultText.textContent =
        `${all.toLocaleString("id-ID")} pembelian`;

      return;
    }

    resultText.textContent =
      `${total.toLocaleString("id-ID")} dari ${all.toLocaleString("id-ID")} pembelian`;
  };


  /* =======================================================
     SEARCH CLEAR
     ======================================================= */

  const updateSearchClear = () => {

    if (!clearSearchBtn) {
      return;
    }

    clearSearchBtn.hidden =
      !String(
        searchInput?.value || ""
      ).trim();
  };


  /* =======================================================
     RENDER PURCHASES
     ======================================================= */

  const renderPurchases = () => {

    if (!content) {
      return;
    }

    const rows = state.filteredRows;

    if (!rows.length) {

      renderEmpty();

      return;
    }


    const start =
      (state.page - 1) *
      state.pageSize;

    const end =
      start +
      state.pageSize;

    const pageRows =
      rows.slice(start, end);


    content.innerHTML = `
      <div class="purchase-list">

        ${pageRows
          .map(renderPurchaseRow)
          .join("")}

      </div>
    `;

    content.setAttribute(
      "aria-busy",
      "false"
    );


    bindPurchaseActions();
  };


  /* =======================================================
     PURCHASE ROW
     ======================================================= */

  const renderPurchaseRow = (row) => {

    const type = row._type;

    const status = row._status;

    const title = esc(row._title);

    const amount = money(row._amount);

    const date = esc(
      formatDate(row.created_at)
    );

    const id = esc(
      row.id || ""
    );

    const productId =
      row._productId
        ? esc(row._productId)
        : "";

    const accessUrl =
      getAccessUrl(row);

    const canAccess =
      status === "paid" &&
      Boolean(accessUrl);


    return `
      <article
        class="purchase-item"
        data-purchase-id="${id}"
        data-type="${esc(type)}"
        data-status="${esc(status)}"
      >

        <div
          class="purchase-item-icon type-${esc(type)}"
          aria-hidden="true"
        >

          <i
            class="fa-solid ${typeIcon(type)}"
          ></i>

        </div>


        <div class="purchase-item-main">

          <div class="purchase-item-top">

            <span class="purchase-type">
              ${esc(typeLabel(type))}
            </span>

            <span
              class="purchase-status status-${esc(status)}"
            >

              <i
                class="fa-solid ${statusIcon(status)}"
                aria-hidden="true"
              ></i>

              ${esc(statusLabel(status))}

            </span>

          </div>


          <h3 class="purchase-title">
            ${title}
          </h3>


          <div class="purchase-meta">

            <span>

              <i
                class="fa-regular fa-calendar"
                aria-hidden="true"
              ></i>

              ${date}

            </span>


            ${
              productId
                ? `
                  <span>

                    <i
                      class="fa-solid fa-hashtag"
                      aria-hidden="true"
                    ></i>

                    ${productId}

                  </span>
                `
                : ""
            }

          </div>

        </div>


        <div class="purchase-item-price">

          <span>
            Total
          </span>

          <strong>
            ${amount}
          </strong>

        </div>


        <div class="purchase-item-actions">

          ${
            canAccess
              ? `
                <a
                  class="purchase-access-btn"
                  href="${esc(accessUrl)}"
                  title="Buka produk"
                  aria-label="Buka ${title}"
                >

                  <i
                    class="fa-solid fa-arrow-up-right-from-square"
                    aria-hidden="true"
                  ></i>

                  <span>
                    Buka
                  </span>

                </a>
              `
              : `
                <button
                  type="button"
                  class="purchase-access-btn is-disabled"
                  disabled
                  title="Produk belum dapat diakses"
                  aria-label="Produk belum dapat diakses"
                >

                  <i
                    class="fa-solid fa-lock"
                    aria-hidden="true"
                  ></i>

                  <span>
                    Akses
                  </span>

                </button>
              `
          }


          <button
            type="button"
            class="purchase-delete-btn"
            data-delete-purchase="${id}"
            title="Hapus dari daftar pembelian"
            aria-label="Hapus ${title} dari daftar pembelian"
          >

            <i
              class="fa-solid fa-trash-can"
              aria-hidden="true"
            ></i>

          </button>

        </div>

      </article>
    `;
  };


  /* =======================================================
     EMPTY
     ======================================================= */

  const renderEmpty = () => {

    if (!content) {
      return;
    }

    const hasFilters =
      Boolean(state.search) ||
      state.status !== "all" ||
      state.type !== "all";


    if (hasFilters) {

      content.innerHTML = `
        <div class="purchases-empty">

          <div class="purchases-empty-icon">
            <i
              class="fa-solid fa-filter-circle-xmark"
              aria-hidden="true"
            ></i>
          </div>

          <h3>
            Tidak ada hasil
          </h3>

          <p>
            Tidak ada pembelian yang cocok dengan pencarian atau filter kamu.
          </p>

          <button
            type="button"
            class="purchases-empty-btn"
            id="emptyResetFilters"
          >

            <i
              class="fa-solid fa-arrow-rotate-left"
              aria-hidden="true"
            ></i>

            Reset Filter

          </button>

        </div>
      `;

      const reset =
        $("#emptyResetFilters");

      reset?.addEventListener(
        "click",
        resetFilters
      );

      return;
    }


    content.innerHTML = `
      <div class="purchases-empty">

        <div class="purchases-empty-icon">
          <i
            class="fa-solid fa-cart-shopping"
            aria-hidden="true"
          ></i>
        </div>

        <h3>
          Belum Ada Pembelian
        </h3>

        <p>
          Produk yang kamu beli akan muncul di sini.
        </p>

        <a
          href="marketplace.html"
          class="purchases-empty-btn"
        >

          <i
            class="fa-solid fa-store"
            aria-hidden="true"
          ></i>

          Jelajahi Marketplace

        </a>

      </div>
    `;
  };


  /* =======================================================
     ERROR
     ======================================================= */

  const renderError = (message) => {

    if (!content) {
      return;
    }

    content.setAttribute(
      "aria-busy",
      "false"
    );

    content.innerHTML = `
      <div class="purchases-error">

        <div class="purchases-error-icon">

          <i
            class="fa-solid fa-triangle-exclamation"
            aria-hidden="true"
          ></i>

        </div>


        <h3>
          Gagal Memuat Pembelian
        </h3>


        <p>
          ${esc(message)}
        </p>


        <button
          type="button"
          class="purchases-error-btn"
          id="retryPurchases"
        >

          <i
            class="fa-solid fa-rotate-right"
            aria-hidden="true"
          ></i>

          Coba Lagi

        </button>

      </div>
    `;


    $("#retryPurchases")
      ?.addEventListener(
        "click",
        () => loadPurchases()
      );
  };


  /* =======================================================
     PAGINATION
     ======================================================= */

  const renderPagination = () => {

    if (!pagination) {
      return;
    }

    const total =
      state.filteredRows.length;

    const totalPages =
      Math.ceil(
        total /
        state.pageSize
      );


    if (totalPages <= 1) {

      pagination.innerHTML = "";

      pagination.hidden = true;

      return;
    }


    pagination.hidden = false;


    const buttons = [];


    buttons.push(`
      <button
        type="button"
        class="purchase-page-btn purchase-page-prev"
        data-page="${state.page - 1}"
        ${state.page <= 1 ? "disabled" : ""}
        aria-label="Halaman sebelumnya"
        title="Halaman sebelumnya"
      >

        <i
          class="fa-solid fa-chevron-left"
          aria-hidden="true"
        ></i>

      </button>
    `);


    const pageNumbers =
      buildPageNumbers(
        state.page,
        totalPages
      );


    pageNumbers.forEach(page => {

      if (page === "...") {

        buttons.push(`
          <span
            class="purchase-page-dots"
            aria-hidden="true"
          >
            …
          </span>
        `);

        return;
      }


      buttons.push(`
        <button
          type="button"
          class="purchase-page-btn ${
            page === state.page
              ? "active"
              : ""
          }"
          data-page="${page}"
          ${
            page === state.page
              ? 'aria-current="page"'
              : ""
          }
        >
          ${page}
        </button>
      `);

    });


    buttons.push(`
      <button
        type="button"
        class="purchase-page-btn purchase-page-next"
        data-page="${state.page + 1}"
        ${
          state.page >= totalPages
            ? "disabled"
            : ""
        }
        aria-label="Halaman berikutnya"
        title="Halaman berikutnya"
      >

        <i
          class="fa-solid fa-chevron-right"
          aria-hidden="true"
        ></i>

      </button>
    `);


    pagination.innerHTML =
      buttons.join("");


    $$(".purchase-page-btn", pagination)
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            if (button.disabled) {
              return;
            }

            const page =
              Number(
                button.dataset.page
              );

            if (!Number.isFinite(page)) {
              return;
            }

            if (
              page < 1 ||
              page > totalPages
            ) {
              return;
            }

            state.page = page;

            renderPurchases();

            renderPagination();

            updateResultBar();

            window.scrollTo({
              top: 0,
              behavior: "smooth"
            });

          }
        );

      });
  };


  const buildPageNumbers = (
    current,
    total
  ) => {

    if (total <= 7) {
      return Array.from(
        { length: total },
        (_, i) => i + 1
      );
    }


    const pages = [
      1
    ];


    if (current > 4) {
      pages.push("...");
    }


    const start =
      Math.max(
        2,
        current - 1
      );

    const end =
      Math.min(
        total - 1,
        current + 1
      );


    for (
      let i = start;
      i <= end;
      i++
    ) {
      pages.push(i);
    }


    if (current < total - 3) {
      pages.push("...");
    }


    pages.push(total);

    return pages;
  };


  /* =======================================================
     PURCHASE ACTIONS
     ======================================================= */

  const bindPurchaseActions = () => {

    $$("[data-delete-purchase]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => deletePurchase(
            button.dataset.deletePurchase,
            button
          )
        );

      });

  };


  /* =======================================================
     DELETE PURCHASE
     ======================================================= */

  const deletePurchase = async (
    purchaseId,
    button
  ) => {

    if (!purchaseId) {
      return;
    }


    const confirmed =
      window.confirm(
        "Hapus pembelian ini dari daftar pembelian?\n\nAkses produk tidak otomatis dibatalkan."
      );


    if (!confirmed) {
      return;
    }


    if (button) {
      button.disabled = true;

      button.classList.add(
        "is-loading"
      );

      const icon = $("i", button);

      if (icon) {
        icon.className =
          "fa-solid fa-spinner fa-spin";
      }
    }


    try {

      if (!sb) {
        throw new Error(
          "Supabase belum tersedia."
        );
      }


      const {
        error
      } = await sb.rpc(
        "delete_purchase",
        {
          p_id: purchaseId
        }
      );


      if (error) {
        throw error;
      }


      state.rows =
        state.rows.filter(
          row =>
            String(row.id) !==
            String(purchaseId)
        );


      updateStats();

      applyFilters();

      toast(
        "Pembelian berhasil dihapus dari daftar.",
        "success"
      );


    } catch (error) {

      console.error(
        "[Purchases] Delete error:",
        error
      );

      toast(
        error?.message ||
        "Gagal menghapus pembelian.",
        "error"
      );


      if (button) {

        button.disabled = false;

        button.classList.remove(
          "is-loading"
        );

        const icon = $("i", button);

        if (icon) {
          icon.className =
            "fa-solid fa-trash-can";
        }

      }

    }

  };


  /* =======================================================
     RESET FILTERS
     ======================================================= */

  const resetFilters = () => {

    state.search = "";
    state.status = "all";
    state.type = "all";
    state.sort = "newest";
    state.page = 1;


    if (searchInput) {
      searchInput.value = "";
    }

    if (statusFilter) {
      statusFilter.value = "all";
    }

    if (typeFilter) {
      typeFilter.value = "all";
    }

    if (sortFilter) {
      sortFilter.value = "newest";
    }


    updateSearchClear();

    applyFilters();

  };


  /* =======================================================
     EVENTS
     ======================================================= */

  searchInput?.addEventListener(
    "input",
    () => {

      state.search =
        searchInput.value || "";

      state.page = 1;

      updateSearchClear();

      applyFilters();

    }
  );


  clearSearchBtn?.addEventListener(
    "click",
    () => {

      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }

      state.search = "";

      state.page = 1;

      updateSearchClear();

      applyFilters();

    }
  );


  statusFilter?.addEventListener(
    "change",
    () => {

      state.status =
        statusFilter.value || "all";

      state.page = 1;

      applyFilters();

    }
  );


  typeFilter?.addEventListener(
    "change",
    () => {

      state.type =
        normalizeType(
          typeFilter.value
        );

      if (
        typeFilter.value === "all"
      ) {
        state.type = "all";
      }

      state.page = 1;

      applyFilters();

    }
  );


  sortFilter?.addEventListener(
    "change",
    () => {

      state.sort =
        sortFilter.value || "newest";

      state.page = 1;

      applyFilters();

    }
  );


  resetFilterBtn?.addEventListener(
    "click",
    resetFilters
  );


  refreshBtn?.addEventListener(
    "click",
    () => loadPurchases()
  );


  /* =======================================================
     KEYBOARD SHORTCUT
     ======================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {

        if (
          document.activeElement !==
          searchInput
        ) {

          event.preventDefault();

          searchInput?.focus();

        }

      }

    }
  );


  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  await loadPurchases();

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
