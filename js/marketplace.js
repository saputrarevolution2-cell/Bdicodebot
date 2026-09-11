/* GENERATED PAGE JS BUNDLE: marketplace.html */

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

/* ===== SOURCE: js/marketplace.js ===== */
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
  const pageSize = 5;
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
  const creatorText = (
    item
  ) => {
    return (
      item?.creator_name ||
      item?.creator_username ||
      "Creator"
    );
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
  /* =======================================================
     PRODUCT URL
     ======================================================= */
  const productUrl = (
    item
  ) => {
    const id =
      item?.id;
    if (!id) {
      return "product.html";
    }
    const type = typeOf(item);
    if (type === "pastelink") {
      return "paste-view.html?slug=" + encodeURIComponent(item.slug || "");
    }
    return (
      "product.html" +
      `?id=${encodeURIComponent(id)}` +
      `&type=${encodeURIComponent(type)}`
    );
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
    return `
      <article class="product-card" data-share-id="${esc(item?.id||'')}" data-share-type="${esc(type)}" data-share-owner="${esc(item?.owner_id||'')}" data-share-url="${esc(href)}">
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
            <i
              class="fa-solid fa-user"
              aria-hidden="true"
            ></i>
            <span>
              ${esc(
                creator
              )}
            </span>
          </div>
          <!-- ENGAGEMENT -->
          <div class="market-card-stats">
            <span>
              <i
                class="fa-solid fa-eye"
                aria-hidden="true"
              ></i>
              ${viewsText(item)}
            </span>
            <span class="like">
              <i
                class="fa-solid fa-heart"
                aria-hidden="true"
              ></i>
              ${likesText(item)}
            </span>
            <span class="share">
              <i
                class="fa-solid fa-share-nodes"
                aria-hidden="true"
              ></i>
              ${sharesText(item)}
            </span>
          </div>
          <!-- BOTTOM -->
          <div class="product-bottom">
            <div class="product-stats">
              <span>
                <i
                  class="fa-solid fa-eye"
                  aria-hidden="true"
                ></i>
                ${viewsText(item)}
              </span>
              ${
                number(
                  item?.sales_count
                ) > 0
                  ? `
                    <span>
                      <i
                        class="fa-solid fa-cart-shopping"
                        aria-hidden="true"
                      ></i>
                      ${salesText(
                        item
                      )}
                    </span>
                  `
                  : ""
              }
            </div>
            <strong
              class="product-price ${
                access === "free"
                  ? "free"
                  : ""
              }"
            >
              ${priceText(item)}
            </strong>
          </div>
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
  function bindShareButtons(){
    if(window.__PASTELE_MARKET_SHARE_BOUND__) return;
    window.__PASTELE_MARKET_SHARE_BOUND__=true;
    document.addEventListener("click",async e=>{
      const btn=e.target.closest("[data-share-card]"); if(!btn) return;
      e.preventDefault(); e.stopPropagation();
      const card=btn.closest("[data-share-id]"); if(!card) return;
      const id=card.dataset.shareId,rawType=card.dataset.shareType, type=rawType==='code'?'telegram_product':(rawType==='channel'||rawType==='group'?'channel':rawType),owner=card.dataset.shareOwner||null;
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
        String(id);
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
    const client =
      getSupabase();
    if (
      !client ||
      !Array.isArray(data) ||
      !data.length
    ) {
      return data;
    }
    const ids =
      data
        .map(
          (item) =>
            item?.id
        )
        .filter(
          (id) =>
            id !== null &&
            id !== undefined &&
            id !== ""
        );
    if (!ids.length) {
      return data;
    }
    try {
      /*
       * Hanya query tabel yang benar-benar
       * ada di SQL final.
       */
      const [
        likesResult,
        sharesResult
      ] = await Promise.all([
        client
          .from(
            "content_likes"
          )
          .select(
            "target_id,target_type"
          )
          .in(
            "target_id",
            ids
          ),
        client
          .from(
            "analytics_events"
          )
          .select(
            "target_id,target_type,event_type"
          )
          .in(
            "target_id",
            ids
          )
          .eq(
            "event_type",
            "share"
          )
      ]);
      if (
        likesResult?.error
      ) {
        console.warn(
          "[Marketplace] Likes count unavailable:",
          likesResult.error.message ||
          likesResult.error
        );
      }
      if (
        sharesResult?.error
      ) {
        console.warn(
          "[Marketplace] Shares count unavailable:",
          sharesResult.error.message ||
          sharesResult.error
        );
      }
      /*
       * Count likes.
       *
       * target_type digunakan untuk
       * membedakan content target.
       *
       * Marketplace products memakai
       * target_type = product.
       */
      const likes =
        countByTarget(
          (likesResult?.data || [])
            .filter(
              (row) => {
                const targetType =
                  lower(
                    row?.target_type
                  );
                return (
                  !targetType ||
                  targetType ===
                    "product"
                );
              }
            )
        );
      /*
       * Count shares.
       */
      const shares =
        countByTarget(
          (sharesResult?.data || [])
            .filter(
              (row) => {
                const targetType =
                  lower(
                    row?.target_type
                  );
                return (
                  !targetType ||
                  targetType ===
                    "product"
                );
              }
            )
        );
      return data.map(
        (item) => {
          const key =
            String(
              item?.id
            );
          return {
            ...item,
            likes_count:
              likes[key] || 0,
            shares_count:
              shares[key] || 0
          };
        }
      );
    } catch (error) {
      /*
       * Engagement adalah fitur tambahan.
       * Marketplace tidak boleh gagal hanya
       * karena statistik engagement.
       */
      console.warn(
        "[Marketplace] Engagement unavailable:",
        error
      );
      return data;
    }
  }
  /* =======================================================
     LOAD MARKETPLACE
     ======================================================= */
  async function load() {
    const client =
      getSupabase();
    /*
     * Marketplace PUBLIC.
     *
     * Tidak perlu:
     *   auth.getUser()
     *
     * untuk browsing.
     */
    if (!client) {
      const message =
        "Database belum terkonfigurasi.";
      setError(
        message
      );
      toast(
        message,
        "error"
      );
      return;
    }
    setLoading();
    try {
      /*
       * marketplace_public berasal dari SQL FINAL.
       *
       * HANYA ambil field yang memang
       * dibutuhkan marketplace.
       *
       * content sengaja TIDAK diambil.
       */
      const result =
        await client
          .from(
            "marketplace_public"
          )
          .select(
            [
              "id",
              "slug",
              "title",
              "type",
              "access_type",
              "price",
              "thumbnail_url",
              "description",
              "views",
              "sales_count",
              "category",
              "created_at",
              "creator_name",
              "creator_username",
              "owner_id"
            ].join(",")
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          )
          .limit(500);
      if (
        result.error
      ) {
        throw result.error;
      }
      let data =
        Array.isArray(
          result.data
        )
          ? result.data
          : [];
      /*
       * Hanya produk yang valid.
       *
       * View SQL sudah memfilter:
       *   published / active
       *
       * Jadi tidak perlu query
       * products secara terpisah.
       */
      data =
        data.filter(
          (item) =>
            Boolean(
              item?.id
            ) &&
            Boolean(
              item?.title
            )
        );
      /*
       * Engagement tidak wajib.
       */
      data =
        await loadEngagementCounts(
          data
        );
      items =
        data;
      page = 1;
      render();
    } catch (error) {
      console.error(
        "[Marketplace] Load error:",
        error
      );
      const message =
        error?.message ||
        "Marketplace gagal dimuat.";
      setError(
        message
      );
      toast(
        message,
        "error"
      );
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
     INITIAL STATE
     ======================================================= */
  updateSearchButton();
  await load();
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
