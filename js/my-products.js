/* GENERATED PAGE JS BUNDLE: my-products.html */

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

    if (!user) {
      host.dataset.ready = "";
      return;
    }

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

/* ===== SOURCE: js/my-products.js ===== */
/* =========================================================
   PasTele — My Products
   FINAL SQL SYNC
   CLEAN UI / COMPACT
   DATABASE:
     products
     pastelinks
     telegram_products
     telegram_channels
   IMPORTANT:
   - No schema changes.
   - Uses real SQL FINAL columns.
   - No legacy_published_flag.
   - products owner = creator_id OR seller_id.
   - telegram_products owner = owner_id.
   - telegram_channels owner = owner_id.
   - pastelinks owner = user_id.
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    /* =====================================================
       DOM
       ===================================================== */
    const $ = (id) =>
        document.getElementById(id);
    const content =
        $("content");
    const searchInput =
        $("searchInput");
    const clearSearch =
        $("clearSearch");
    const typeFilter =
        $("typeFilter");
    const statusFilter =
        $("statusFilter");
    const refreshBtn =
        $("refreshBtn");
    const totalCount =
        $("totalCount");
    const publishedCount =
        $("publishedCount");
    const paidCount =
        $("paidCount");
    const draftCount =
        $("draftCount");
    const resultInfo =
        $("resultInfo");
    /* =====================================================
       GLOBALS
       ===================================================== */
    const TC =
        window.TC || {};
    const supabase =
        window.sb ||
        window.supabaseClient ||
        window.supabase ||
        null;
    /* =====================================================
       STATE
       ===================================================== */
    let profile = null;
    let groups = [];
    let allItems = [];
    let loading = false;
    /* =====================================================
       HELPERS
       ===================================================== */
    const esc = (value) => {
        const text =
            String(value ?? "");
        if (
            typeof TC.esc ===
            "function"
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
    const showToast = (
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
    const normalize = (
        value
    ) => {
        return String(
            value ?? ""
        )
            .trim()
            .toLowerCase();
    };
    /* =====================================================
       TYPE
       ===================================================== */
    const iconFor = (
        type
    ) => {
        const icons = {
            paste:
                "fa-file-lines",
            pastelink:
                "fa-link",
            code:
                "fa-code",
            channel:
                "fa-tower-broadcast",
            product:
                "fa-box"
        };
        return (
            icons[
                normalize(type)
            ] ||
            "fa-box"
        );
    };
    const labelFor = (
        type
    ) => {
        const labels = {
            paste:
                "Paste",
            pastelink:
                "PasteLink",
            code:
                "Code Telegram",
            channel:
                "Channel / Group",
            product:
                "Marketplace"
        };
        return (
            labels[
                normalize(type)
            ] ||
            "Product"
        );
    };
    const typeValue = (
        item,
        fallback
    ) => {
        return normalize(
            item?.type ||
            item?.product_type ||
            fallback ||
            ""
        );
    };
    const titleOf = (
        item
    ) => {
        return String(
            item?.title ||
            item?.name ||
            item?.slug ||
            "Untitled"
        ).trim();
    };
    const descriptionOf = (
        item
    ) => {
        return String(
            item?.description ||
            ""
        ).trim();
    };
    const dateOf = (
        item
    ) => {
        if (
            !item?.created_at
        ) {
            return "Tanggal tidak tersedia";
        }
        const date =
            new Date(
                item.created_at
            );
        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Tanggal tidak tersedia";
        }
        return date.toLocaleDateString(
            "id-ID",
            {
                day:
                    "2-digit",
                month:
                    "short",
                year:
                    "numeric"
            }
        );
    };
    /* =====================================================
       STATUS
       =====================================================
       SQL FINAL menggunakan:
         status = draft
         status = published
         status = active
       Tidak menggunakan legacy_published_flag.
       */
    const statusOf = (
        item
    ) => {
        const status =
            normalize(
                item?.status
            );
        const price =
            Number(
                item?.price || 0
            );
        /*
         * Draft selalu draft.
         */
        if (
            status === "draft"
        ) {
            return {
                value:
                    "draft",
                label:
                    "Draft",
                icon:
                    "fa-file-pen"
            };
        }
        /*
         * Explicit inactive states.
         */
        if (
            status === "inactive" ||
            status === "disabled" ||
            status === "archived"
        ) {
            return {
                value:
                    "draft",
                label:
                    "Inactive",
                icon:
                    "fa-circle-pause"
            };
        }
        /*
         * Paid ditentukan dari harga.
         *
         * Hanya konten yang sudah published/active
         * dianggap published/paid.
         */
        if (
            status === "published" ||
            status === "active"
        ) {
            if (
                Number.isFinite(
                    price
                ) &&
                price > 0
            ) {
                return {
                    value:
                        "paid",
                    label:
                        "Paid",
                    icon:
                        "fa-tag"
                };
            }
            return {
                value:
                    "published",
                label:
                    "Published",
                icon:
                    "fa-circle-check"
            };
        }
        /*
         * Fallback:
         * produk lama tanpa status valid
         * dianggap draft agar tidak salah
         * tampil sebagai produk publik.
         */
        return {
            value:
                "draft",
            label:
                "Draft",
            icon:
                "fa-file-pen"
        };
    };
    /* =====================================================
       URL
       ===================================================== */
    const hrefFor = (
        item,
        type
    ) => {
        if (!item) {
            return "#";
        }
        /*
         * PasteLink
         */
        if (type === "pastelink") {
            if (!item.slug) return "#";
            return `${location.origin}/p/` + encodeURIComponent(item.slug);
        }
        if (type === "paste") {
            if (!item.slug) return "#";
            return `${location.origin}/paste/` + encodeURIComponent(item.slug);
        }
        /*
         * Telegram products/channels
         */
        if (
            type === "code" ||
            type === "channel"
        ) {
            if (
                !item.slug
            ) {
                return "#";
            }
            let prefix =
                "c";
            if (
                type === "channel"
            ) {
                /*
                 * telegram_channels.type
                 * berasal dari schema SQL.
                 */
                const channelType =
                    normalize(
                        item?.type
                    );
                prefix =
                    channelType ===
                    "group"
                        ? "g"
                        : "ch";
            }
            const access =
                normalize(
                    item?.access_type
                ) === "paid"
                        ? "p"
                        : "f";
            return (
                `${location.origin}/${prefix}/${access}/` +
                encodeURIComponent(
                    item.slug
                )
            );
        }
        /*
         * Marketplace products
         */
        if (
            item.id ===
                undefined ||
            item.id ===
                null ||
            item.id === ""
        ) {
            return "#";
        }
        return (
            `${location.origin}/product.html` +
            `?id=${encodeURIComponent(
                item.id
            )}` +
            `&type=${encodeURIComponent(
                item.type ||
                item.product_type ||
                type
            )}`
        );
    };
    /* =====================================================
       FIND ITEM
       ===================================================== */
    const findItem = (
        id,
        type
    ) => {
        const normalizedId =
            String(
                id ?? ""
            );
        const normalizedType =
            normalize(type);
        return allItems.find(
            (entry) => {
                return (
                    String(
                        entry?.id ??
                        ""
                    ) ===
                        normalizedId &&
                    normalize(
                        entry?.__type
                    ) ===
                        normalizedType
                );
            }
        );
    };
    /* =====================================================
       PRICE
       ===================================================== */
    const formatPrice = (
        price
    ) => {
        const value =
            Number(
                price || 0
            );
        if (
            !Number.isFinite(
                value
            ) ||
            value <= 0
        ) {
            return null;
        }
        return new Intl.NumberFormat(
            "id-ID",
            {
                style:
                    "currency",
                currency:
                    "IDR",
                maximumFractionDigits:
                    0
            }
        ).format(
            value
        );
    };
    /* =====================================================
       LOADING
       ===================================================== */
    const renderLoading = () => {
        if (!content) {
            return;
        }
        content.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i
                        class="fa-solid fa-spinner fa-spin"
                        aria-hidden="true"
                    ></i>
                </div>
                <strong>
                    Memuat produk...
                </strong>
                <span>
                    Mengambil data terbaru dari database.
                </span>
            </div>
        `;
        if (resultInfo) {
            resultInfo.textContent =
                "Memuat produk...";
        }
    };
    /* =====================================================
       ERROR
       ===================================================== */
    const renderError = (
        message
    ) => {
        if (!content) {
            return;
        }
        content.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon">
                    <i
                        class="fa-solid fa-triangle-exclamation"
                        aria-hidden="true"
                    ></i>
                </div>
                <strong>
                    Gagal memuat produk
                </strong>
                <span>
                    ${esc(
                        message ||
                        "Terjadi kesalahan saat mengambil data."
                    )}
                </span>
                <button
                    class="btn primary"
                    id="retryBtn"
                    type="button"
                >
                    <i
                        class="fa-solid fa-rotate"
                        aria-hidden="true"
                    ></i>
                    Coba Lagi
                </button>
            </div>
        `;
        if (resultInfo) {
            resultInfo.textContent =
                "Gagal memuat data.";
        }
        $("retryBtn")
            ?.addEventListener(
                "click",
                loadData
            );
    };
    /* =====================================================
       LOAD DATA
       ===================================================== */
    async function loadData() {
        if (loading) {
            return;
        }
        loading = true;
        renderLoading();
        if (refreshBtn) {
            refreshBtn.disabled =
                true;
            refreshBtn.classList.add(
                "is-loading"
            );
        }
        try {
            if (!supabase) {
                throw new Error(
                    "Supabase belum tersedia."
                );
            }
            /*
             * PROFILE
             */
            if (
                typeof TC.profile !==
                "function"
            ) {
                throw new Error(
                    "TC.profile() tidak tersedia."
                );
            }
            profile =
                await TC.profile();
            if (!profile) {
                location.replace(
                    "login.html"
                );
                return;
            }
            /*
             * =================================================
             * LOAD 4 CONTENT TYPES
             * =================================================
             */
            const [
                productsResponse,
                pasteResponse,
                plainPasteResponse,
                codeResponse,
                channelResponse
            ] =
                await Promise.all([
                    /*
                     * PRODUCTS
                     *
                     * SQL:
                     * creator_id
                     * seller_id
                     */
                    supabase
                        .from(
                            "products"
                        )
                        .select(
                            [
                                "id",
                                "seller_id",
                                "creator_id",
                                "title",
                                "slug",
                                "price",
                                "thumbnail_url",
                                "type",
                                "access_type",
                                "category",
                                "description",
                                "views",
                                "sales_count",
                                "status",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .or(
                            `creator_id.eq.${profile.id},seller_id.eq.${profile.id}`
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        ),
                    /*
                     * PASTELINKS
                     *
                     * SQL:
                     * user_id
                     */
                    supabase
                        .from(
                            "pastelinks"
                        )
                        .select(
                            [
                                "id",
                                "user_id",
                                "slug",
                                "title",
                                "description",
                                "access_type",
                                "price",
                                "visibility",
                                "expires_at",
                                "views",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .eq(
                            "user_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        ),
                    /*
                     * PLAIN PASTES
                     */
                    supabase
                        .from("pastes")
                        .select("id,owner_id,title,slug,content,visibility,created_at,updated_at")
                        .eq("owner_id", profile.id)
                        .order("created_at", {ascending:false}),
                    /*
                     * TELEGRAM PRODUCTS
                     *
                     * SQL:
                     * owner_id
                     * status
                     */
                    supabase
                        .from(
                            "telegram_products"
                        )
                        .select(
                            [
                                "id",
                                "owner_id",
                                "title",
                                "slug",
                                "type",
                                "product_type",
                                "access_type",
                                "bot_username",
                                "telegram_bot_id",
                                "price",
                                "description",
                                "thumbnail_url",
                                "category",
                                "status",
                                "views",
                                "sales_count",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        ),
                    /*
                     * TELEGRAM CHANNELS
                     *
                     * SQL:
                     * owner_id
                     * name
                     * type
                     * status
                     */
                    supabase
                        .from(
                            "telegram_channels"
                        )
                        .select(
                            [
                                "id",
                                "owner_id",
                                "username",
                                "name",
                                "type",
                                "access_type",
                                "telegram_channel_id",
                                "description",
                                "invite_url",
                                "price",
                                "category",
                                "status",
                                "views",
                                "sales_count",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        )
                ]);
            const responses = [
                productsResponse,
                pasteResponse,
                plainPasteResponse,
                codeResponse,
                channelResponse
            ];
            const failed =
                responses.find(
                    (response) =>
                        response?.error
                );
            if (
                failed?.error
            ) {
                throw failed.error;
            }
            /* =================================================
               NORMALIZE
               ================================================= */
            const productItems =
                (
                    productsResponse.data ||
                    []
                ).map(
                    (item) => ({
                        ...item,
                        __type:
                            "product"
                    })
                );
            const pasteLinkItems =
                (pasteResponse.data || []).map(item => ({...item,__type:"pastelink",price:Number(item.price||0),access_type:item.access_type||"free",status:item.visibility === "public" ? "published" : item.visibility}));
            const pasteItems =
                (plainPasteResponse.data || []).map(item => ({...item,__type:"paste",price:0,access_type:"free",status:item.visibility === "public" ? "published" : item.visibility}));
            const codeItems =
                (
                    codeResponse.data ||
                    []
                ).map(
                    (item) => ({
                        ...item,
                        __type:
                            "code"
                    })
                );
            const channelItems =
                (
                    channelResponse.data ||
                    []
                ).map(
                    (item) => ({
                        ...item,
                        __type:
                            "channel"
                    })
                );
            /* =================================================
               GROUPS
               ================================================= */
            groups = [
                {
                    key:
                        "pastelink",
                    title:
                        "PasteLink",
                    icon:
                        "fa-link",
                    items:
                        pasteLinkItems
                },
                {
                    key:
                        "paste",
                    title:
                        "Paste",
                    icon:
                        "fa-file-lines",
                    items:
                        pasteItems
                },
                {
                    key:
                        "code",
                    title:
                        "Code Telegram",
                    icon:
                        "fa-code",
                    items:
                        codeItems
                },
                {
                    key:
                        "channel",
                    title:
                        "Channel / Group",
                    icon:
                        "fa-tower-broadcast",
                    items:
                        channelItems
                },
                {
                    key:
                        "product",
                    title:
                        "Marketplace Product",
                    icon:
                        "fa-box",
                    items:
                        productItems
                }
            ];
            allItems =
                groups.flatMap(
                    (group) =>
                        group.items
                );
            updateOverview();
            render();
        } catch (error) {
            console.error(
                "[My Products] Load error:",
                error
            );
            renderError(
                error?.message ||
                "Tidak dapat mengambil data dari database."
            );
        } finally {
            loading = false;
            if (refreshBtn) {
                refreshBtn.disabled =
                    false;
                refreshBtn.classList.remove(
                    "is-loading"
                );
            }
        }
    }
    /* =====================================================
       OVERVIEW
       ===================================================== */
    function updateOverview() {
        const total =
            allItems.length;
        const published =
            allItems.filter(
                (item) => {
                    const status =
                        normalize(
                            item?.status
                        );
                    return (
                        status ===
                            "published" ||
                        status ===
                            "active"
                    );
                }
            ).length;
        const paid =
            allItems.filter(
                (item) => {
                    const status =
                        normalize(
                            item?.status
                        );
                    const price =
                        Number(
                            item?.price ||
                            0
                        );
                    return (
                        (
                            status ===
                                "published" ||
                            status ===
                                "active"
                        ) &&
                        Number.isFinite(
                            price
                        ) &&
                        price > 0
                    );
                }
            ).length;
        const draft =
            allItems.filter(
                (item) =>
                    normalize(
                        item?.status
                    ) ===
                    "draft"
            ).length;
        if (totalCount) {
            totalCount.textContent =
                total;
        }
        if (publishedCount) {
            publishedCount.textContent =
                published;
        }
        if (paidCount) {
            paidCount.textContent =
                paid;
        }
        if (draftCount) {
            draftCount.textContent =
                draft;
        }
    }
    /* =====================================================
       FILTER
       ===================================================== */
    function getFilteredGroups() {
        const search =
            normalize(
                searchInput?.value
            );
        const selectedType =
            typeFilter?.value ||
            "all";
        const selectedStatus =
            statusFilter?.value ||
            "all";
        return groups.map(
            (group) => {
                const filtered =
                    group.items.filter(
                        (item) => {
                            const title =
                                normalize(
                                    titleOf(
                                        item
                                    )
                                );
                            const slug =
                                normalize(
                                    item?.slug
                                );
                            const description =
                                normalize(
                                    descriptionOf(
                                        item
                                    )
                                );
                            const name =
                                normalize(
                                    item?.name
                                );
                            const botUsername =
                                normalize(
                                    item?.bot_username
                                );
                            const username =
                                normalize(
                                    item?.username
                                );
                            const type =
                                typeValue(
                                    item,
                                    group.key
                                );
                            const status =
                                statusOf(
                                    item
                                ).value;
                            const matchesSearch =
                                !search ||
                                title.includes(
                                    search
                                ) ||
                                slug.includes(
                                    search
                                ) ||
                                description.includes(
                                    search
                                ) ||
                                name.includes(
                                    search
                                ) ||
                                botUsername.includes(
                                    search
                                ) ||
                                username.includes(
                                    search
                                ) ||
                                type.includes(
                                    search
                                );
                            const matchesType =
                                selectedType ===
                                    "all" ||
                                group.key ===
                                    selectedType;
                            const matchesStatus =
                                selectedStatus ===
                                    "all" ||
                                status ===
                                    selectedStatus;
                            return (
                                matchesSearch &&
                                matchesType &&
                                matchesStatus
                            );
                        }
                    );
                return {
                    ...group,
                    items:
                        filtered
                };
            }
        );
    }
    /* =====================================================
       MAIN RENDER
       ===================================================== */
    function render() {
        if (!content) {
            return;
        }
        const filteredGroups =
            getFilteredGroups();
        const visibleItems =
            filteredGroups.reduce(
                (
                    total,
                    group
                ) =>
                    total +
                    group.items.length,
                0
            );
        const search =
            String(
                searchInput?.value ||
                ""
            ).trim();
        const hasFilter =
            Boolean(search) ||
            (
                typeFilter?.value ||
                "all"
            ) !== "all" ||
            (
                statusFilter?.value ||
                "all"
            ) !== "all";
        if (resultInfo) {
            resultInfo.textContent =
                hasFilter
                    ? `${visibleItems} hasil ditemukan`
                    : `${allItems.length} konten tersedia`;
        }
        clearSearch?.classList.toggle(
            "hidden",
            !search
        );
        const sections =
            filteredGroups
                .filter(
                    (group) =>
                        group.items.length >
                        0
                )
                .map(
                    renderGroup
                )
                .join("");
        if (sections) {
            content.innerHTML =
                sections;
            bindActions();
            return;
        }
        const isEmptyDatabase =
            allItems.length === 0;
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i
                        class="fa-solid ${
                            isEmptyDatabase
                                ? "fa-box-open"
                                : "fa-magnifying-glass"
                        }"
                        aria-hidden="true"
                    ></i>
                </div>
                <strong>
                    ${
                        isEmptyDatabase
                            ? "Belum ada produk"
                            : "Produk tidak ditemukan"
                    }
                </strong>
                <span>
                    ${
                        isEmptyDatabase
                            ? "Buat PasteLink, Code Telegram, Channel, atau produk marketplace pertamamu."
                            : "Coba ubah kata kunci atau filter pencarian."
                    }
                </span>
                ${
                    isEmptyDatabase
                        ? `
                            <a
                                href="create-product.html"
                                class="btn primary"
                            >
                                <i
                                    class="fa-solid fa-plus"
                                    aria-hidden="true"
                                ></i>
                                Buat Produk
                            </a>
                        `
                        : `
                            <button
                                class="btn"
                                id="resetFilterBtn"
                                type="button"
                            >
                                <i
                                    class="fa-solid fa-filter-circle-xmark"
                                    aria-hidden="true"
                                ></i>
                                Reset Filter
                            </button>
                        `
                }
            </div>
        `;
        $("resetFilterBtn")
            ?.addEventListener(
                "click",
                resetFilters
            );
    }
    /* =====================================================
       RENDER GROUP
       ===================================================== */
    function renderGroup(
        group
    ) {
        return `
            <section class="my-section">
                <div class="my-section-header">
                    <div class="my-section-title">
                        <span
                            class="my-section-title-icon"
                            aria-hidden="true"
                        >
                            <i
                                class="fa-solid ${group.icon}"
                            ></i>
                        </span>
                        <div>
                            <h2>
                                ${esc(
                                    group.title
                                )}
                            </h2>
                        </div>
                    </div>
                    <span
                        class="my-section-count"
                    >
                        ${group.items.length}
                    </span>
                </div>
                <div class="my-list">
                    ${group.items
                        .map(
                            (item) => {
                                const title =
                                    titleOf(
                                        item
                                    );
                                const status =
                                    statusOf(
                                        item
                                    );
                                const price =
                                    formatPrice(
                                        item?.price
                                    );
                                const slug =
                                    String(
                                        item?.slug ||
                                        ""
                                    ).trim();
                                const description =
                                    descriptionOf(
                                        item
                                    );
                                const href =
                                    hrefFor(
                                        item,
                                        group.key
                                    );
                                return `
                                    <article
                                        class="my-row"
                                        data-product-type="${esc(
                                            group.key
                                        )}"
                                    >
                                        <div
                                            class="my-row-head"
                                        >
                                            <span
                                                class="my-icon"
                                                aria-hidden="true"
                                            >
                                                <i
                                                    class="fa-solid ${iconFor(
                                                        group.key
                                                    )}"
                                                ></i>
                                            </span>
                                            <div
                                                class="my-row-main"
                                            >
                                                <div
                                                    class="my-row-title-wrap"
                                                >
                                                    <span
                                                        class="my-row-title"
                                                        title="${esc(
                                                            title
                                                        )}"
                                                    >
                                                        ${esc(
                                                            title
                                                        )}
                                                    </span>
                                                    <span
                                                        class="status-badge status-${esc(
                                                            status.value
                                                        )}"
                                                    >
                                                        <i
                                                            class="fa-solid ${status.icon}"
                                                            aria-hidden="true"
                                                        ></i>
                                                        ${esc(
                                                            status.label
                                                        )}
                                                    </span>
                                                </div>
                                                <div
                                                    class="my-row-meta"
                                                >
                                                    <span>
                                                        ${esc(
                                                            labelFor(
                                                                group.key
                                                            )
                                                        )}
                                                    </span>
                                                    <span
                                                        class="meta-dot"
                                                        aria-hidden="true"
                                                    >
                                                        •
                                                    </span>
                                                    <span>
                                                        ${esc(
                                                            dateOf(
                                                                item
                                                            )
                                                        )}
                                                    </span>
                                                    ${
                                                        price
                                                            ? `
                                                                <span
                                                                    class="meta-dot"
                                                                    aria-hidden="true"
                                                                >
                                                                    •
                                                                </span>
                                                                <span
                                                                    class="meta-price"
                                                                >
                                                                    ${esc(
                                                                        price
                                                                    )}
                                                                </span>
                                                            `
                                                            : ""
                                                    }
                                                    ${
                                                        slug
                                                            ? `
                                                                <span
                                                                    class="meta-dot"
                                                                    aria-hidden="true"
                                                                >
                                                                    •
                                                                </span>
                                                                <span
                                                                    class="meta-slug"
                                                                    title="/${esc(
                                                                        slug
                                                                    )}"
                                                                >
                                                                    /${esc(
                                                                        slug
                                                                    )}
                                                                </span>
                                                            `
                                                            : ""
                                                    }
                                                </div>
                                                ${
                                                    description
                                                        ? `
                                                            <div
                                                                class="my-row-description"
                                                                title="${esc(
                                                                    description
                                                                )}"
                                                            >
                                                                ${esc(
                                                                    description
                                                                )}
                                                            </div>
                                                        `
                                                        : ""
                                                }
                                            </div>
                                        </div>
                                        <div
                                            class="my-row-footer"
                                        >
                                            <div
                                                class="my-row-type"
                                            >
                                                <i
                                                    class="fa-solid ${iconFor(
                                                        group.key
                                                    )}"
                                                    aria-hidden="true"
                                                ></i>
                                                ${esc(
                                                    labelFor(
                                                        group.key
                                                    )
                                                )}
                                            </div>
                                            <div
                                                class="my-row-actions"
                                            >
                                                <button
                                                    class="btn"
                                                    type="button"
                                                    data-action="open"
                                                    data-id="${esc(
                                                        item.id ??
                                                        ""
                                                    )}"
                                                    data-type="${esc(
                                                        group.key
                                                    )}"
                                                    title="Buka"
                                                    aria-label="Buka"
                                                >
                                                    <i
                                                        class="fa-solid fa-arrow-up-right-from-square"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>
                                                        Buka
                                                    </span>
                                                </button>
                                                <button
                                                    class="btn"
                                                    type="button"
                                                    data-action="copy"
                                                    data-id="${esc(
                                                        item.id ??
                                                        ""
                                                    )}"
                                                    data-type="${esc(
                                                        group.key
                                                    )}"
                                                    title="Salin link"
                                                    aria-label="Salin link"
                                                >
                                                    <i
                                                        class="fa-solid fa-copy"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>
                                                        Salin
                                                    </span>
                                                </button>
                                                <button
                                                    class="btn"
                                                    type="button"
                                                    data-action="edit"
                                                    data-id="${esc(
                                                        item.id ??
                                                        ""
                                                    )}"
                                                    data-type="${esc(
                                                        group.key
                                                    )}"
                                                    title="Edit"
                                                    aria-label="Edit"
                                                >
                                                    <i
                                                        class="fa-solid fa-pen"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>
                                                        Edit
                                                    </span>
                                                </button>
                                                <button
                                                    class="btn danger"
                                                    type="button"
                                                    data-action="delete"
                                                    data-id="${esc(
                                                        item.id ??
                                                        ""
                                                    )}"
                                                    data-type="${esc(
                                                        group.key
                                                    )}"
                                                    title="Hapus"
                                                    aria-label="Hapus"
                                                >
                                                    <i
                                                        class="fa-solid fa-trash"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>
                                                        Hapus
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                `;
                            }
                        )
                        .join("")}
                </div>
            </section>
        `;
    }
    /* =====================================================
       ACTION BINDING
       ===================================================== */
    function bindActions() {
        content
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        "click",
                        async (event) => {
                            /*
                             * Jangan biarkan <button>
                             * melakukan action lain.
                             */
                            event.preventDefault();
                            event.stopPropagation();
                            if (
                                button.disabled
                            ) {
                                return;
                            }
                            const id =
                                button.dataset.id;
                            const type =
                                button.dataset.type;
                            const action =
                                button.dataset.action;
                            const item =
                                findItem(
                                    id,
                                    type
                                );
                            if (!item) {
                                showToast(
                                    "Data produk tidak ditemukan. Silakan refresh.",
                                    "error"
                                );
                                return;
                            }
                            try {
                                button.disabled =
                                    true;
                                if (
                                    action ===
                                    "open"
                                ) {
                                    openItem(
                                        item,
                                        type
                                    );
                                } else if (
                                    action ===
                                    "copy"
                                ) {
                                    await copyItem(
                                        item,
                                        type
                                    );
                                } else if (
                                    action ===
                                    "edit"
                                ) {
                                    await editItem(
                                        item,
                                        type
                                    );
                                } else if (
                                    action ===
                                    "delete"
                                ) {
                                    await deleteItem(
                                        item,
                                        type
                                    );
                                }
                            } catch (error) {
                                console.error(
                                    "[My Products] Action error:",
                                    error
                                );
                                showToast(
                                    error?.message ||
                                    "Action gagal.",
                                    "error"
                                );
                            } finally {
                                if (
                                    document.body.contains(
                                        button
                                    )
                                ) {
                                    button.disabled =
                                        false;
                                }
                            }
                        }
                    );
                }
            );
    }
    /* =====================================================
       OPEN
       ===================================================== */
    function openItem(
        item,
        type
    ) {
        const href =
            hrefFor(
                item,
                type
            );
        if (
            !href ||
            href === "#"
        ) {
            showToast(
                "Link untuk konten ini tidak tersedia.",
                "error"
            );
            return;
        }
        window.open(
            href,
            "_blank",
            "noopener,noreferrer"
        );
    }
    /* =====================================================
       COPY
       ===================================================== */
    async function copyItem(
        item,
        type
    ) {
        const href =
            hrefFor(
                item,
                type
            );
        if (
            !href ||
            href === "#"
        ) {
            showToast(
                "Link untuk konten ini tidak tersedia.",
                "error"
            );
            return;
        }
        try {
            if (
                navigator.clipboard &&
                window.isSecureContext
            ) {
                await navigator.clipboard
                    .writeText(
                        href
                    );
            } else {
                const textarea =
                    document.createElement(
                        "textarea"
                    );
                textarea.value =
                    href;
                textarea.setAttribute(
                    "readonly",
                    ""
                );
                textarea.style.position =
                    "fixed";
                textarea.style.left =
                    "-9999px";
                textarea.style.opacity =
                    "0";
                document.body.appendChild(
                    textarea
                );
                textarea.focus();
                textarea.select();
                textarea.setSelectionRange(
                    0,
                    textarea.value.length
                );
                const copied =
                    document.execCommand(
                        "copy"
                    );
                textarea.remove();
                if (!copied) {
                    throw new Error(
                        "Clipboard tidak tersedia."
                    );
                }
            }
            showToast(
                "Link berhasil disalin.",
                "success"
            );
        } catch (error) {
            console.error(
                "[My Products] Copy error:",
                error
            );
            showToast(
                "Gagal menyalin link.",
                "error"
            );
        }
    }
    /* =====================================================
       EDIT
       ===================================================== */
    async function editItem(
        item,
        type
    ) {
        const currentTitle =
            titleOf(
                item
            );
        const title =
            prompt(
                "Judul",
                currentTitle
            );
        if (
            title ===
            null
        ) {
            return;
        }
        const cleanTitle =
            title.trim();
        if (
            !cleanTitle
        ) {
            showToast(
                "Judul wajib diisi.",
                "error"
            );
            return;
        }
        let response;
        try {
            /* =============================================
               PASTELINK
               ============================================= */
            if (type === "pastelink") {
                const currentAccess = normalize(item.access_type) === "paid" ? "paid" : "free";
                const enteredAccess = prompt("Akses (free/paid)", currentAccess);
                if (enteredAccess === null) return;
                const nextAccess = normalize(enteredAccess) === "paid" ? "paid" : "free";
                let nextPrice = nextAccess === "paid" ? Number(prompt("Harga IDR (5000-150000)", item.price || 5000)) : 0;
                if (nextAccess === "paid" && (!Number.isFinite(nextPrice) || nextPrice < 5000 || nextPrice > 150000 || nextPrice % 1000 !== 0)) { showToast("Harga Paid harus Rp5.000-Rp150.000 dan kelipatan Rp1.000.","error"); return; }
                response = await supabase.from("pastelinks")
                        .update({ title: cleanTitle, access_type: nextAccess, price: nextPrice })
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "user_id",
                            profile.id
                        );
            }
            /* =============================================
               PLAIN PASTE
               ============================================= */
            else if (type === "paste") {
                const contentValue = prompt("Isi paste", item.content || "");
                if (contentValue === null) return;
                response = await supabase.from("pastes").update({title:cleanTitle,content:contentValue.trim()}).eq("id",item.id).eq("owner_id",profile.id);
            }
            /* =============================================
               TELEGRAM PRODUCT
               ============================================= */
            else if (
                type ===
                "code"
            ) {
                const description =
                    prompt(
                        "Deskripsi",
                        item.description ||
                        ""
                    );
                if (
                    description ===
                    null
                ) {
                    return;
                }
                let price =
                    Number(
                        item.price ||
                        0
                    );
                const currentAccess =
                    normalize(
                        item.access_type
                    );
                let accessType =
                    currentAccess ===
                    "paid"
                        ? "paid"
                        : (
                            price > 0
                                ? "paid"
                                : "free"
                        );
                if (
                    accessType ===
                    "paid" ||
                    price > 0
                ) {
                    const enteredPrice =
                        prompt(
                            "Harga IDR",
                            String(
                                price
                            )
                        );
                    if (
                        enteredPrice ===
                        null
                    ) {
                        return;
                    }
                    price =
                        Number(
                            String(
                                enteredPrice
                            )
                                .replace(
                                    /[^\d]/g,
                                    ""
                                )
                        );
                    if (
                        !Number.isFinite(
                            price
                        ) ||
                        price < 0
                    ) {
                        showToast(
                            "Harga tidak valid.",
                            "error"
                        );
                        return;
                    }
                    accessType =
                        price > 0
                            ? "paid"
                            : "free";
                }
                response =
                    await supabase
                        .from(
                            "telegram_products"
                        )
                        .update({
                            title:
                                cleanTitle,
                            description:
                                description.trim(),
                            price:
                                price,
                            access_type:
                                accessType
                        })
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               TELEGRAM CHANNEL
               ============================================= */
            else if (
                type ===
                "channel"
            ) {
                const description =
                    prompt(
                        "Deskripsi",
                        item.description ||
                        ""
                    );
                if (
                    description ===
                    null
                ) {
                    return;
                }
                let price =
                    Number(
                        item.price ||
                        0
                    );
                const accessType =
                    price > 0
                        ? "paid"
                        : "free";
                const fields = {
                    name:
                        cleanTitle,
                    description:
                        description.trim(),
                    price:
                        Number.isFinite(
                            price
                        ) &&
                        price >= 0
                            ? price
                            : 0,
                    access_type:
                        accessType
                };
                response =
                    await supabase
                        .from(
                            "telegram_channels"
                        )
                        .update(
                            fields
                        )
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               MARKETPLACE PRODUCT
               ============================================= */
            else if (
                type ===
                "product"
            ) {
                const description =
                    prompt(
                        "Deskripsi",
                        item.description ||
                        ""
                    );
                if (
                    description ===
                    null
                ) {
                    return;
                }
                let price =
                    Number(
                        item.price ||
                        0
                    );
                if (
                    !Number.isFinite(
                        price
                    ) ||
                    price < 0
                ) {
                    price = 0;
                }
                /*
                 * Product owner bisa creator_id
                 * atau seller_id.
                 *
                 * Gunakan OR agar sesuai
                 * dengan query loadData().
                 */
                response =
                    await supabase
                        .from(
                            "products"
                        )
                        .update({
                            title:
                                cleanTitle,
                            description:
                                description.trim(),
                            price:
                                price,
                            access_type:
                                price > 0
                                    ? "paid"
                                    : "free"
                        })
                        .eq(
                            "id",
                            item.id
                        )
                        .or(
                            `creator_id.eq.${profile.id},seller_id.eq.${profile.id}`
                        );
            }
            else {
                showToast(
                    "Tipe produk tidak dikenal.",
                    "error"
                );
                return;
            }
            if (
                response?.error
            ) {
                throw response.error;
            }
            showToast(
                "Produk berhasil diperbarui.",
                "success"
            );
            await loadData();
        } catch (error) {
            console.error(
                "[My Products] Edit error:",
                error
            );
            showToast(
                error?.message ||
                "Gagal memperbarui produk.",
                "error"
            );
        }
    }
    /* =====================================================
       DELETE
       ===================================================== */
    async function deleteItem(
        item,
        type
    ) {
        const title =
            titleOf(
                item
            );
        const confirmed =
            confirm(
                `Hapus "${title}"?\n\nTindakan ini tidak dapat dibatalkan.`
            );
        if (
            !confirmed
        ) {
            return;
        }
        let response;
        try {
            /* =============================================
               PASTELINK
               ============================================= */
            if (type === "pastelink") {
                response = await supabase.from("pastelinks")
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "user_id",
                            profile.id
                        );
            }
            else if (type === "paste") {
                response = await supabase.from("pastes").delete().eq("id",item.id).eq("owner_id",profile.id);
            }
            /* =============================================
               TELEGRAM PRODUCT
               ============================================= */
            else if (
                type ===
                "code"
            ) {
                response =
                    await supabase
                        .from(
                            "telegram_products"
                        )
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               TELEGRAM CHANNEL
               ============================================= */
            else if (
                type ===
                "channel"
            ) {
                response =
                    await supabase
                        .from(
                            "telegram_channels"
                        )
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               MARKETPLACE PRODUCT
               ============================================= */
            else if (
                type ===
                "product"
            ) {
                response =
                    await supabase
                        .from(
                            "products"
                        )
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .or(
                            `creator_id.eq.${profile.id},seller_id.eq.${profile.id}`
                        );
            }
            else {
                showToast(
                    "Tipe produk tidak dikenal.",
                    "error"
                );
                return;
            }
            if (
                response?.error
            ) {
                throw response.error;
            }
            showToast(
                "Konten berhasil dihapus.",
                "success"
            );
            await loadData();
        } catch (error) {
            console.error(
                "[My Products] Delete error:",
                error
            );
            showToast(
                error?.message ||
                "Gagal menghapus konten.",
                "error"
            );
        }
    }
    /* =====================================================
       RESET FILTER
       ===================================================== */
    function resetFilters() {
        if (searchInput) {
            searchInput.value =
                "";
        }
        if (typeFilter) {
            typeFilter.value =
                "all";
        }
        if (statusFilter) {
            statusFilter.value =
                "all";
        }
        render();
    }
    /* =====================================================
       EVENTS
       ===================================================== */
    searchInput?.addEventListener(
        "input",
        render
    );
    typeFilter?.addEventListener(
        "change",
        render
    );
    statusFilter?.addEventListener(
        "change",
        render
    );
    clearSearch?.addEventListener(
        "click",
        () => {
            if (searchInput) {
                searchInput.value =
                    "";
                searchInput.focus();
            }
            render();
        }
    );
    refreshBtn?.addEventListener(
        "click",
        async () => {
            await loadData();
        }
    );
    /* =====================================================
       INITIAL LOAD
       ===================================================== */
    await loadData();
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
