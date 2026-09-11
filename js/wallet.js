/* GENERATED PAGE JS BUNDLE: wallet.html */

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
      const mode = localStorage.getItem('pastele-theme') || 'auto';
      const el = document.getElementById('ptThemeText');
      if (el) el.textContent = mode === 'auto' ? 'Auto' : mode === 'dark' ? 'Gelap' : mode === 'light' ? 'Terang' : 'System';
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

/* ===== SOURCE: js/wallet.js ===== */
/* =========================================================
   PasTele — Wallet
   FINAL PREMIUM
   Real Supabase data
   Existing schema only
   Matched with wallet.html
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";


    /* =====================================================
       DOM HELPERS
       ===================================================== */

    const $ = (id) => {
        return document.getElementById(id);
    };


    const $$ = (selector, root = document) => {
        try {
            return Array.from(
                root.querySelectorAll(selector)
            );
        } catch {
            return [];
        }
    };


    /* =====================================================
       DOM
       ===================================================== */

    const availableEl =
        $("available");

    const availableCardEl =
        $("availableCard");

    const balanceHeroValueEl =
        document.querySelector(
            ".wallet-balance-hero .wallet-balance-value"
        );

    const pendingEl =
        $("pending");

    const incomeEl =
        $("income");

    const todayEl =
        $("today");

    const breakdownEl =
        $("breakdown");

    const recentActivityEl =
        $("recentActivity");

    const refreshBtn =
        $("refreshWallet");

    const copyBalanceBtn =
        $("copyBalance");

    const pendingCard =
        $("pendingCard");

    const withdrawPanel =
        $("withdrawStatusPanel");


    /* =====================================================
       STATE
       ===================================================== */

    let profile = null;

    let wallet = null;

    let walletRows = [];

    let transactionRows = [];

    let allRows = [];

    let isLoading = false;

    let pendingModal = null;


    /* =====================================================
       GLOBALS
       ===================================================== */

    const getTC = () => {
        return window.TC || {};
    };


    const getSB = () => {
        return (
            window.sb ||
            window.supabaseClient ||
            null
        );
    };


    /* =====================================================
       MONEY
       ===================================================== */

    const money = (value) => {

        const number =
            Number(value ?? 0);

        const amount =
            Number.isFinite(number)
                ? number
                : 0;

        const TC =
            getTC();

        if (
            typeof TC.money ===
            "function"
        ) {
            try {
                return TC.money(
                    amount
                );
            } catch {}
        }

        return new Intl.NumberFormat(
            "id-ID",
            {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0
            }
        ).format(amount);
    };


    /* =====================================================
       TOAST
       ===================================================== */

    const showToast = (
        message,
        type = "info"
    ) => {

        const TC =
            getTC();

        if (
            typeof TC.toast ===
            "function"
        ) {
            try {

                TC.toast(
                    message,
                    type
                );

                return;

            } catch {}
        }


        const toast =
            $("toast");

        if (!toast) {
            return;
        }


        toast.textContent =
            String(
                message || ""
            );


        toast.classList.add(
            "show"
        );


        clearTimeout(
            toast._walletTimer
        );


        toast._walletTimer =
            setTimeout(
                () => {

                    toast.classList.remove(
                        "show"
                    );

                },
                2800
            );
    };


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    const esc = (value) => {

        const TC =
            getTC();

        if (
            typeof TC.esc ===
            "function"
        ) {
            try {

                return TC.esc(
                    String(
                        value ?? ""
                    )
                );

            } catch {}
        }


        return String(
            value ?? ""
        )
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


    /* =====================================================
       AMOUNT
       ===================================================== */

    const amountOf = (
        row
    ) => {

        const value =
            row?.net_amount ??
            row?.amount ??
            row?.value ??
            0;

        const amount =
            Number(value);

        return Number.isFinite(
            amount
        )
            ? amount
            : 0;
    };


    /* =====================================================
       TYPE NORMALIZER
       ===================================================== */

    const normalizeType = (
        value
    ) => {

        const type =
            String(
                value || ""
            )
                .trim()
                .toLowerCase()
                .replace(
                    /[\s-]+/g,
                    "_"
                );


        if (
            type.includes(
                "pastelink"
            ) ||
            type.includes(
                "paste_link"
            ) ||
            type === "link"
        ) {
            return "link";
        }


        if (
            type.includes(
                "code"
            ) ||
            type === "file"
        ) {
            return "code";
        }


        if (
            type.includes(
                "channel"
            ) ||
            type.includes(
                "broadcast"
            )
        ) {
            return "channel";
        }


        if (
            type.includes(
                "group"
            )
        ) {
            return "group";
        }


        return "other";
    };


    /* =====================================================
       TYPE LABEL
       ===================================================== */

    const typeLabel = (
        value
    ) => {

        switch (
            normalizeType(value)
        ) {

            case "link":
                return "PasteLink";

            case "code":
                return "Code";

            case "channel":
                return "Channel";

            case "group":
                return "Group";

            default:
                return "Transaksi";
        }
    };


    /* =====================================================
       TYPE ICON
       ===================================================== */

    const typeIcon = (
        value
    ) => {

        switch (
            normalizeType(value)
        ) {

            case "link":
                return "fa-link";

            case "code":
                return "fa-code";

            case "channel":
                return "fa-broadcast-tower";

            case "group":
                return "fa-users";

            default:
                return "fa-wallet";
        }
    };


    /* =====================================================
       TYPE CLASS
       ===================================================== */

    const typeClass = (
        value
    ) => {

        switch (
            normalizeType(value)
        ) {

            case "link":
                return "wallet-type-link";

            case "code":
                return "wallet-type-code";

            case "channel":
                return "wallet-type-channel";

            case "group":
                return "wallet-type-group";

            default:
                return "wallet-type-other";
        }
    };


    /* =====================================================
       STATUS
       ===================================================== */

    const statusOf = (
        row
    ) => {

        return String(
            row?.status ||
            ""
        )
            .trim()
            .toLowerCase();
    };


    /* =====================================================
       STATUS HELPERS
       ===================================================== */

    const isGoodTransaction = (
        row
    ) => {

        const status =
            statusOf(row);

        return [
            "completed",
            "complete",
            "paid",
            "available",
            "success",
            "successful",
            "succeeded"
        ].includes(
            status
        )
        &&
        amountOf(row) > 0;
    };


    const isPendingTransaction = (
        row
    ) => {

        const status =
            statusOf(row);

        return [
            "pending",
            "waiting",
            "hold",
            "held",
            "processing"
        ].includes(
            status
        )
        &&
        amountOf(row) > 0;
    };


    const isFailedTransaction = (
        row
    ) => {

        return [
            "failed",
            "cancelled",
            "canceled",
            "rejected",
            "declined",
            "expired"
        ].includes(
            statusOf(row)
        );
    };


    /* =====================================================
       DATE
       ===================================================== */

    const formatDate = (
        value
    ) => {

        if (!value) {
            return "-";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "-";
        }


        return date.toLocaleString(
            "id-ID",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    };


    const isToday = (
        value
    ) => {

        if (!value) {
            return false;
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return false;
        }


        const now =
            new Date();


        return (
            date.getFullYear() ===
                now.getFullYear()
            &&
            date.getMonth() ===
                now.getMonth()
            &&
            date.getDate() ===
                now.getDate()
        );
    };


    /* =====================================================
       GET PROFILE
       ===================================================== */

    const getProfile = async () => {

        const TC =
            getTC();


        if (
            typeof TC.profile ===
            "function"
        ) {
            try {

                const result =
                    await TC.profile();


                if (
                    result?.id
                ) {
                    return result;
                }


                if (
                    result?.profile?.id
                ) {
                    return result.profile;
                }

            } catch (error) {

                console.warn(
                    "TC.profile:",
                    error?.message ||
                    error
                );
            }
        }


        const sb =
            getSB();


        if (
            sb?.auth?.getUser
        ) {

            const {
                data,
                error
            } =
                await sb.auth.getUser();


            if (error) {
                throw error;
            }


            if (
                data?.user?.id
            ) {
                return data.user;
            }
        }


        return null;
    };


    /* =====================================================
       LOADING STATE
       ===================================================== */

    const setLoadingState = (
        loading
    ) => {

        isLoading =
            Boolean(loading);


        if (refreshBtn) {

            refreshBtn.disabled =
                isLoading;


            refreshBtn.classList.toggle(
                "is-loading",
                isLoading
            );


            const icon =
                refreshBtn.querySelector(
                    "i"
                );


            if (icon) {

                icon.classList.toggle(
                    "fa-spin",
                    isLoading
                );
            }
        }


        if (pendingCard) {

            pendingCard.disabled =
                isLoading;


            pendingCard.classList.toggle(
                "is-loading",
                isLoading
            );
        }


        if (breakdownEl) {

            breakdownEl.setAttribute(
                "aria-busy",
                isLoading
                    ? "true"
                    : "false"
            );
        }


        if (recentActivityEl) {

            recentActivityEl.setAttribute(
                "aria-busy",
                isLoading
                    ? "true"
                    : "false"
            );
        }
    };


    /* =====================================================
       RENDER LOADING
       ===================================================== */

    const renderLoading = () => {

        if (availableEl) {
            availableEl.textContent =
                "—";
        }


        if (availableCardEl) {
            availableCardEl.textContent =
                "—";
        }


        if (pendingEl) {
            pendingEl.textContent =
                "—";
        }


        if (incomeEl) {
            incomeEl.textContent =
                "—";
        }


        if (todayEl) {
            todayEl.textContent =
                "—";
        }


        if (breakdownEl) {

            breakdownEl.innerHTML = `
                <div class="wallet-loading">

                    <span class="wallet-loading-icon">

                        <i
                            class="fa-solid fa-spinner fa-spin"
                            aria-hidden="true"
                        ></i>

                    </span>

                    <span>
                        Memuat statistik...
                    </span>

                </div>
            `;
        }


        if (recentActivityEl) {

            recentActivityEl.innerHTML = `
                <div class="wallet-loading">

                    <span class="wallet-loading-icon">

                        <i
                            class="fa-solid fa-spinner fa-spin"
                            aria-hidden="true"
                        ></i>

                    </span>

                    <span>
                        Memuat aktivitas...
                    </span>

                </div>
            `;
        }
    };


    /* =====================================================
       ERROR STATE
       ===================================================== */

    const renderError = (
        message
    ) => {

        if (availableEl) {
            availableEl.textContent =
                "—";
        }


        if (availableCardEl) {
            availableCardEl.textContent =
                "—";
        }


        if (pendingEl) {
            pendingEl.textContent =
                "—";
        }


        if (incomeEl) {
            incomeEl.textContent =
                "—";
        }


        if (todayEl) {
            todayEl.textContent =
                "—";
        }


        if (breakdownEl) {

            breakdownEl.innerHTML = `
                <div class="wallet-state">

                    <div class="wallet-state-icon">

                        <i
                            class="fa-solid fa-triangle-exclamation"
                            aria-hidden="true"
                        ></i>

                    </div>


                    <strong>
                        Wallet gagal dimuat
                    </strong>


                    <span>
                        ${esc(
                            message ||
                            "Terjadi kesalahan saat mengambil data keuangan."
                        )}
                    </span>


                    <button
                        class="btn primary"
                        id="walletRetry"
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
        }


        if (recentActivityEl) {

            recentActivityEl.innerHTML = `
                <div class="wallet-activity-empty">

                    <span class="wallet-activity-empty-icon">

                        <i
                            class="fa-solid fa-circle-exclamation"
                            aria-hidden="true"
                        ></i>

                    </span>


                    <div>

                        <strong>
                            Aktivitas tidak tersedia
                        </strong>


                        <span>
                            Muat ulang halaman untuk mencoba lagi.
                        </span>

                    </div>

                </div>
            `;
        }


        $("walletRetry")
            ?.addEventListener(
                "click",
                () => loadWallet()
            );
    };


    /* =====================================================
       FETCH WALLET DATA
       ===================================================== */

    const fetchWalletData =
        async () => {

            const sb =
                getSB();


            if (!sb) {

                throw new Error(
                    "Supabase belum tersedia. Periksa konfigurasi."
                );
            }


            if (!profile?.id) {

                throw new Error(
                    "ID akun tidak ditemukan."
                );
            }


            /*
             * Release matured wallet balances.
             *
             * Non-blocking because this RPC
             * may not be available for every role.
             */
            try {

                const {
                    error
                } =
                    await sb.rpc(
                        "release_matured_wallet"
                    );


                if (error) {

                    console.warn(
                        "release_matured_wallet:",
                        error.message
                    );
                }

            } catch (error) {

                console.warn(
                    "release_matured_wallet:",
                    error?.message ||
                    error
                );
            }


            const [
                walletResponse,
                walletTransactionsResponse,
                transactionsResponse
            ] =
                await Promise.all([

                    sb
                        .from("wallets")
                        .select("*")
                        .eq(
                            "user_id",
                            profile.id
                        )
                        .maybeSingle(),


                    sb
                        .from(
                            "wallet_transactions"
                        )
                        .select("*")
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
                        )
                        .limit(500),


                    sb
                        .from("transactions")
                        .select("*")
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
                        )
                        .limit(500)
                ]);


            if (
                walletResponse?.error
            ) {
                throw walletResponse.error;
            }


            if (
                walletTransactionsResponse?.error
            ) {
                throw walletTransactionsResponse.error;
            }


            if (
                transactionsResponse?.error
            ) {
                throw transactionsResponse.error;
            }


            return {

                wallet:
                    walletResponse?.data ||
                    null,


                walletRows:
                    Array.isArray(
                        walletTransactionsResponse?.data
                    )
                        ? walletTransactionsResponse.data
                        : [],


                transactionRows:
                    Array.isArray(
                        transactionsResponse?.data
                    )
                        ? transactionsResponse.data
                        : []
            };
        };


    /* =====================================================
       BALANCE
       ===================================================== */

    const getAvailableBalance = (
        walletData
    ) => {

        return Number(
            walletData?.available_balance ??
            walletData?.balance ??
            profile?.balance ??
            0
        ) || 0;
    };


    const getPendingBalance = (
        walletData
    ) => {

        return Number(
            walletData?.pending_balance ??
            0
        ) || 0;
    };


    const renderBalances = (
        walletData
    ) => {

        const available =
            getAvailableBalance(
                walletData
            );


        const pending =
            getPendingBalance(
                walletData
            );


        if (availableEl) {

            availableEl.textContent =
                money(
                    available
                );
        }


        if (availableCardEl) {

            availableCardEl.textContent =
                money(
                    available
                );
        }


        if (pendingEl) {

            pendingEl.textContent =
                money(
                    pending
                );
        }
    };


    /* =====================================================
       INCOME ROW FILTER
       ===================================================== */

    const isIncomeRow = (
        row
    ) => {

        if (!row) {
            return false;
        }


        const amount =
            amountOf(row);


        if (amount <= 0) {
            return false;
        }


        if (
            isGoodTransaction(row)
        ) {
            return true;
        }


        const type =
            String(
                row?.type ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            /^sell_/i.test(type) &&
            ![
                "failed",
                "cancelled",
                "canceled",
                "rejected",
                "declined",
                "expired"
            ].includes(
                statusOf(row)
            )
        ) {
            return true;
        }


        return false;
    };


    /* =====================================================
       DEDUPLICATE SELL TRANSACTIONS
       ===================================================== */

    const buildIncomeRows = () => {

        const result = [];

        const seen = new Set();


        /*
         * wallet_transactions first.
         */
        for (
            const row of walletRows
        ) {

            if (
                !isIncomeRow(row)
            ) {
                continue;
            }


            const key =
                [
                    row?.id,
                    row?.reference,
                    row?.transaction_id,
                    row?.created_at,
                    amountOf(row),
                    row?.type
                ]
                    .filter(
                        value =>
                            value !==
                                undefined &&
                            value !==
                                null
                    )
                    .join("|");


            if (
                key &&
                seen.has(key)
            ) {
                continue;
            }


            if (key) {
                seen.add(key);
            }


            result.push(row);
        }


        /*
         * transactions sell_*.
         */
        for (
            const row of transactionRows
        ) {

            if (
                !/^sell_/i.test(
                    String(
                        row?.type ||
                        ""
                    )
                )
            ) {
                continue;
            }


            if (
                !isIncomeRow(row)
            ) {
                continue;
            }


            const reference =
                String(
                    row?.reference ||
                    row?.payment_reference ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            const duplicate =
                result.some(
                    existing => {

                        const existingRef =
                            String(
                                existing?.reference ||
                                existing?.payment_reference ||
                                ""
                            )
                                .trim()
                                .toLowerCase();


                        if (
                            reference &&
                            existingRef &&
                            reference ===
                                existingRef
                        ) {
                            return true;
                        }


                        const existingTime =
                            existing?.created_at
                                ? new Date(
                                    existing.created_at
                                ).getTime()
                                : NaN;


                        const rowTime =
                            row?.created_at
                                ? new Date(
                                    row.created_at
                                ).getTime()
                                : NaN;


                        const sameTime =
                            Number.isFinite(
                                existingTime
                            ) &&
                            Number.isFinite(
                                rowTime
                            ) &&
                            Math.abs(
                                existingTime -
                                rowTime
                            ) < 1500;


                        return (
                            sameTime &&
                            amountOf(
                                existing
                            ) ===
                            amountOf(row) &&
                            normalizeType(
                                existing?.type
                            ) ===
                            normalizeType(
                                row?.type
                            )
                        );
                    }
                );


            if (
                duplicate
            ) {
                continue;
            }


            result.push(row);
        }


        return result;
    };


    /* =====================================================
       INCOME STATS
       ===================================================== */

    const renderIncomeStats = (
        rows
    ) => {

        const validRows =
            rows.filter(
                isIncomeRow
            );


        const totalIncome =
            validRows.reduce(
                (
                    total,
                    row
                ) => {

                    return (
                        total +
                        amountOf(row)
                    );

                },
                0
            );


        const todayIncome =
            validRows
                .filter(
                    row =>
                        isToday(
                            row?.created_at
                        )
                )
                .reduce(
                    (
                        total,
                        row
                    ) => {

                        return (
                            total +
                            amountOf(row)
                        );

                    },
                    0
                );


        if (incomeEl) {

            incomeEl.textContent =
                money(
                    totalIncome
                );
        }


        if (todayEl) {

            todayEl.textContent =
                money(
                    todayIncome
                );
        }
    };


    /* =====================================================
       BREAKDOWN
       ===================================================== */

    const renderBreakdown = (
        rows
    ) => {

        if (!breakdownEl) {
            return;
        }


        const types = [

            {
                type: "link",
                icon: "fa-link",
                label: "PasteLink",
                className:
                    "wallet-breakdown-link"
            },

            {
                type: "code",
                icon: "fa-code",
                label: "Code",
                className:
                    "wallet-breakdown-code"
            },

            {
                type: "channel",
                icon:
                    "fa-broadcast-tower",
                label: "Channel",
                className:
                    "wallet-breakdown-channel"
            },

            {
                type: "group",
                icon: "fa-users",
                label: "Group",
                className:
                    "wallet-breakdown-group"
            }
        ];


        const validRows =
            rows.filter(
                isIncomeRow
            );


        breakdownEl.innerHTML =
            types
                .map(
                    item => {

                        const matchingRows =
                            validRows.filter(
                                row =>
                                    normalizeType(
                                        row?.type
                                    ) ===
                                    item.type
                            );


                        const total =
                            matchingRows.reduce(
                                (
                                    sum,
                                    row
                                ) => {

                                    return (
                                        sum +
                                        amountOf(row)
                                    );

                                },
                                0
                            );


                        const count =
                            matchingRows.length;


                        return `
                            <a
                                class="income-item ${item.className}"
                                href="transactions.html?type=${encodeURIComponent(item.type)}"
                                aria-label="${esc(item.label)}"
                            >

                                <span
                                    class="income-item-icon"
                                    aria-hidden="true"
                                >

                                    <i
                                        class="fa-solid ${item.icon}"
                                    ></i>

                                </span>


                                <span
                                    class="income-item-main"
                                >

                                    <b>
                                        ${esc(
                                            item.label
                                        )}
                                    </b>


                                    <small>
                                        ${count.toLocaleString(
                                            "id-ID"
                                        )}
                                        transaksi
                                    </small>

                                </span>


                                <strong>
                                    ${esc(
                                        money(total)
                                    )}
                                </strong>


                                <span
                                    class="income-item-arrow"
                                    aria-hidden="true"
                                >

                                    <i
                                        class="fa-solid fa-arrow-right"
                                    ></i>

                                </span>

                            </a>
                        `;
                    }
                )
                .join("");


        breakdownEl.setAttribute(
            "aria-busy",
            "false"
        );
    };


    /* =====================================================
       RECENT ACTIVITY
       ===================================================== */

    const renderRecentActivity = (
        rows
    ) => {

        if (!recentActivityEl) {
            return;
        }


        const sortedRows =
            [...rows]
                .filter(
                    row =>
                        amountOf(row) !==
                        0
                )
                .sort(
                    (
                        a,
                        b
                    ) => {

                        const aTime =
                            new Date(
                                a?.created_at ||
                                0
                            ).getTime();


                        const bTime =
                            new Date(
                                b?.created_at ||
                                0
                            ).getTime();


                        return (
                            bTime -
                            aTime
                        );
                    }
                )
                .slice(
                    0,
                    6
                );


        if (
            !sortedRows.length
        ) {

            recentActivityEl.innerHTML = `
                <div
                    class="wallet-activity-empty"
                >

                    <span
                        class="wallet-activity-empty-icon"
                    >

                        <i
                            class="fa-solid fa-receipt"
                            aria-hidden="true"
                        ></i>

                    </span>


                    <div>

                        <strong>
                            Belum ada aktivitas
                        </strong>


                        <span>
                            Aktivitas keuangan akan muncul di sini.
                        </span>

                    </div>

                </div>
            `;


            recentActivityEl.setAttribute(
                "aria-busy",
                "false"
            );


            return;
        }


        recentActivityEl.innerHTML =
            sortedRows
                .map(
                    renderActivityItem
                )
                .join("");


        recentActivityEl.setAttribute(
            "aria-busy",
            "false"
        );
    };


    /* =====================================================
       ACTIVITY ITEM
       ===================================================== */

    const renderActivityItem = (
        row
    ) => {

        const type =
            normalizeType(
                row?.type
            );


        const good =
            isGoodTransaction(
                row
            );


        const pending =
            isPendingTransaction(
                row
            );


        const failed =
            isFailedTransaction(
                row
            );


        const amount =
            amountOf(row);


        let stateClass =
            "activity-neutral";


        let statusText =
            "Aktivitas";


        let statusIcon =
            "fa-circle-info";


        if (good) {

            stateClass =
                "activity-success";

            statusText =
                "Berhasil";

            statusIcon =
                "fa-circle-check";

        } else if (pending) {

            stateClass =
                "activity-pending";

            statusText =
                "Pending";

            statusIcon =
                "fa-clock";

        } else if (failed) {

            stateClass =
                "activity-failed";

            statusText =
                "Gagal";

            statusIcon =
                "fa-circle-xmark";
        }


        const label =
            type === "other"
                ? String(
                    row?.type ||
                    "Transaksi"
                )
                : typeLabel(type);


        const sign =
            amount > 0
                ? "+"
                : "";


        return `
            <article
                class="wallet-activity-item ${stateClass}"
            >

                <span
                    class="wallet-activity-icon ${typeClass(type)}"
                    aria-hidden="true"
                >

                    <i
                        class="fa-solid ${typeIcon(type)}"
                    ></i>

                </span>


                <div
                    class="wallet-activity-main"
                >

                    <strong>
                        ${esc(label)}
                    </strong>


                    <span>
                        ${esc(
                            formatDate(
                                row?.created_at
                            )
                        )}
                    </span>

                </div>


                <div
                    class="wallet-activity-amount"
                >

                    <strong>
                        ${sign}${esc(
                            money(amount)
                        )}
                    </strong>


                    <small>

                        <i
                            class="fa-solid ${statusIcon}"
                            aria-hidden="true"
                        ></i>

                        ${esc(
                            statusText
                        )}

                    </small>

                </div>

            </article>
        `;
    };


    /* =====================================================
       WITHDRAW STATE
       ===================================================== */

    const updateWithdrawState = (
        walletData
    ) => {

        if (!withdrawPanel) {
            return;
        }


        const available =
            getAvailableBalance(
                walletData
            );


        const buttons =
            $$(
                ".wallet-withdraw-btn",
                withdrawPanel
            );


        buttons.forEach(
            btn => {

                const disabled =
                    available <= 0;


                btn.classList.toggle(
                    "is-disabled",
                    disabled
                );


                if (disabled) {

                    btn.setAttribute(
                        "aria-disabled",
                        "true"
                    );


                    btn.title =
                        "Belum ada saldo yang dapat ditarik.";

                } else {

                    btn.removeAttribute(
                        "aria-disabled"
                    );


                    btn.title =
                        `Tarik ${money(
                            available
                        )}`;
                }
            }
        );
    };


    /* =====================================================
       PENDING DETAIL
       ===================================================== */

    const showPendingDetail =
        async () => {

            const sb =
                getSB();


            if (!sb) {

                showToast(
                    "Supabase belum tersedia.",
                    "error"
                );

                return;
            }


            if (pendingModal) {
                return;
            }


            try {

                if (pendingCard) {

                    pendingCard.classList.add(
                        "is-loading"
                    );


                    pendingCard.disabled =
                        true;
                }


                const {
                    data,
                    error
                } =
                    await sb.rpc(
                        "get_pending_balance_detail"
                    );


                if (error) {
                    throw error;
                }


                const rows =
                    Array.isArray(data)
                        ? data
                        : [];


                if (!rows.length) {

                    showToast(
                        "Tidak ada saldo yang sedang tertunda.",
                        "info"
                    );

                    return;
                }


                const html =
                    rows
                        .slice(
                            0,
                            20
                        )
                        .map(
                            row => {

                                const amount =
                                    money(
                                        row?.amount ||
                                        0
                                    );


                                const created =
                                    formatDate(
                                        row?.created_at
                                    );


                                const availableAt =
                                    formatDate(
                                        row?.available_at
                                    );


                                const holdLabel =
                                    row?.hold_label ||
                                    "H1";


                                return `
                                    <div
                                        class="wallet-pending-item"
                                    >

                                        <div
                                            class="wallet-pending-item-top"
                                        >

                                            <strong>
                                                ${esc(
                                                    amount
                                                )}
                                            </strong>


                                            <span>
                                                ${esc(
                                                    holdLabel
                                                )}
                                            </span>

                                        </div>


                                        <div
                                            class="wallet-pending-meta"
                                        >

                                            <span>

                                                <i
                                                    class="fa-regular fa-clock"
                                                    aria-hidden="true"
                                                ></i>

                                                Terjual
                                                ${esc(
                                                    created
                                                )}

                                            </span>


                                            <span>

                                                <i
                                                    class="fa-solid fa-unlock"
                                                    aria-hidden="true"
                                                ></i>

                                                Tersedia
                                                ${esc(
                                                    availableAt
                                                )}

                                            </span>

                                        </div>

                                    </div>
                                `;
                            }
                        )
                        .join("");


                const overlay =
                    document.createElement(
                        "div"
                    );


                overlay.className =
                    "wallet-pending-modal";


                overlay.innerHTML = `
                    <div
                        class="wallet-pending-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pendingWalletTitle"
                    >

                        <button
                            type="button"
                            class="wallet-pending-close"
                            aria-label="Tutup"
                        >

                            <i
                                class="fa-solid fa-xmark"
                                aria-hidden="true"
                            ></i>

                        </button>


                        <span class="badge">

                            <i
                                class="fa-solid fa-clock"
                                aria-hidden="true"
                            ></i>

                            SALDO PENDING

                        </span>


                        <h2 id="pendingWalletTitle">
                            Kapan saldo tersedia?
                        </h2>


                        <p class="muted">

                            Penjualan 05:00–20:59 WIB masuk
                            <b>H1</b>.
                            Penjualan 21:00–04:59 WIB masuk
                            <b>H2</b>.

                        </p>


                        <div class="wallet-pending-list">

                            ${html}

                        </div>

                    </div>
                `;


                document.body.appendChild(
                    overlay
                );


                pendingModal =
                    overlay;


                const previousOverflow =
                    document.body.style.overflow;


                document.body.style.overflow =
                    "hidden";


                const close =
                    () => {

                        if (
                            !pendingModal
                        ) {
                            return;
                        }


                        overlay.classList.add(
                            "is-closing"
                        );


                        document.body.style.overflow =
                            previousOverflow;


                        document.removeEventListener(
                            "keydown",
                            escHandler
                        );


                        setTimeout(
                            () => {

                                overlay.remove();

                                pendingModal =
                                    null;

                            },
                            160
                        );
                    };


                const escHandler =
                    event => {

                        if (
                            event.key ===
                            "Escape"
                        ) {
                            close();
                        }
                    };


                overlay
                    .querySelector(
                        ".wallet-pending-close"
                    )
                    ?.addEventListener(
                        "click",
                        close
                    );


                overlay.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            overlay
                        ) {
                            close();
                        }
                    }
                );


                document.addEventListener(
                    "keydown",
                    escHandler
                );


                requestAnimationFrame(
                    () => {

                        overlay
                            .querySelector(
                                ".wallet-pending-close"
                            )
                            ?.focus();
                    }
                );

            } catch (error) {

                console.error(
                    "Pending balance detail:",
                    error
                );


                showToast(
                    error?.message ||
                    "Detail saldo pending gagal dimuat.",
                    "error"
                );

            } finally {

                if (pendingCard) {

                    pendingCard.classList.remove(
                        "is-loading"
                    );


                    pendingCard.disabled =
                        false;
                }
            }
        };


    /* =====================================================
       COPY BALANCE
       ===================================================== */

    const copyBalance =
        async () => {

            const value =
                balanceHeroValueEl?.textContent ||
                availableEl?.textContent ||
                "Rp0";


            if (
                value === "—"
            ) {

                showToast(
                    "Saldo belum selesai dimuat.",
                    "info"
                );

                return;
            }


            try {

                if (
                    navigator.clipboard &&
                    window.isSecureContext
                ) {

                    await navigator.clipboard.writeText(
                        value
                    );

                } else {

                    const textarea =
                        document.createElement(
                            "textarea"
                        );


                    textarea.value =
                        value;


                    textarea.setAttribute(
                        "readonly",
                        ""
                    );


                    textarea.style.position =
                        "fixed";

                    textarea.style.left =
                        "-9999px";

                    textarea.style.top =
                        "0";


                    document.body.appendChild(
                        textarea
                    );


                    textarea.focus();

                    textarea.select();


                    document.execCommand(
                        "copy"
                    );


                    textarea.remove();
                }


                showToast(
                    "Saldo berhasil disalin.",
                    "success"
                );


                if (
                    copyBalanceBtn
                ) {

                    const icon =
                        copyBalanceBtn.querySelector(
                            "i"
                        );


                    if (icon) {

                        icon.className =
                            "fa-solid fa-check";


                        clearTimeout(
                            copyBalanceBtn._walletCopyTimer
                        );


                        copyBalanceBtn._walletCopyTimer =
                            setTimeout(
                                () => {

                                    icon.className =
                                        "fa-regular fa-copy";

                                },
                                1400
                            );
                    }
                }

            } catch (error) {

                console.warn(
                    "Copy balance:",
                    error
                );


                showToast(
                    "Saldo tidak dapat disalin.",
                    "error"
                );
            }
        };


    /* =====================================================
       WITHDRAW GUARD
       ===================================================== */

    document.addEventListener(
        "click",
        event => {

            const target =
                event.target;


            const withdraw =
                target?.closest?.(
                    "#withdrawBtn, .wallet-withdraw-btn"
                );


            if (!withdraw) {
                return;
            }


            if (
                withdraw.classList.contains(
                    "is-disabled"
                ) ||
                withdraw.getAttribute(
                    "aria-disabled"
                ) === "true"
            ) {

                event.preventDefault();


                showToast(
                    "Belum ada saldo tersedia untuk ditarik.",
                    "info"
                );
            }
        }
    );


    /* =====================================================
       EVENTS
       ===================================================== */

    pendingCard?.addEventListener(
        "click",
        showPendingDetail
    );


    refreshBtn?.addEventListener(
        "click",
        () => {

            if (
                !isLoading
            ) {
                loadWallet();
            }
        }
    );


    copyBalanceBtn?.addEventListener(
        "click",
        copyBalance
    );


    /* =====================================================
       LOAD WALLET
       ===================================================== */

    async function loadWallet() {

        if (
            isLoading
        ) {
            return;
        }


        const sb =
            getSB();


        if (!sb) {

            renderError(
                "Supabase belum tersedia. Periksa config.js dan supabase.js."
            );

            return;
        }


        try {

            setLoadingState(
                true
            );


            renderLoading();


            profile =
                await getProfile();


            if (!profile?.id) {

                location.replace(
                    "login.html"
                );

                return;
            }


            const result =
                await fetchWalletData();


            wallet =
                result.wallet;


            walletRows =
                result.walletRows ||
                [];


            transactionRows =
                result.transactionRows ||
                [];


            /*
             * Activity data.
             *
             * Keep wallet transactions and
             * sell_* transaction records.
             */
            allRows = [
                ...walletRows,
                ...transactionRows.filter(
                    row =>
                        /^sell_/i.test(
                            String(
                                row?.type ||
                                ""
                            )
                        )
                )
            ];


            /*
             * Deduplicated income rows
             * for financial statistics.
             */
            const incomeRows =
                buildIncomeRows();


            renderBalances(
                wallet
            );


            renderIncomeStats(
                incomeRows
            );


            renderBreakdown(
                incomeRows
            );


            renderRecentActivity(
                allRows
            );


            updateWithdrawState(
                wallet
            );

        } catch (error) {

            console.error(
                "Wallet load error:",
                error
            );


            renderError(
                error?.message ||
                "Wallet gagal dimuat."
            );


            showToast(
                error?.message ||
                "Wallet gagal dimuat.",
                "error"
            );

        } finally {

            setLoadingState(
                false
            );
        }
    }


    /* =====================================================
       INITIAL LOAD
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
