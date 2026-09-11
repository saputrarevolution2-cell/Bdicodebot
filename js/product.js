/* GENERATED PAGE JS BUNDLE: product.html */

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

/* ===== SOURCE: js/public-view.js ===== */
/* PasTele public view shell — premium top navigation + ticker */
document.addEventListener("DOMContentLoaded", async () => {
  const host=document.getElementById("publicNavbar");
  if(!host) return;
  const esc=v=>window.TC?.esc?TC.esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  let user=null; try{ user=window.TC?.user ? await TC.user() : null; }catch(_){}
  if(user?.id && window.sb){
    try {
      const {count}=await window.sb.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('is_read',false);
      window.dispatchEvent(new CustomEvent('pastele-notification-count',{detail:{count:Number(count||0)}}));
    } catch(_){}
  }
  host.innerHTML=`
  <div class="public-shell">
    <div class="public-ticker"><div class="public-ticker-track"><span><i class="fa-solid fa-bolt"></i> Gabung sekarang dan nikmati fitur menarik lainnya — jadilah Kreator PasTele yang top dan dapatkan bonus melimpah!</span><span><i class="fa-solid fa-bolt"></i> Gabung sekarang dan nikmati fitur menarik lainnya — jadilah Kreator PasTele yang top dan dapatkan bonus melimpah!</span></div></div>
    <header class="public-nav">
      <a class="public-brand" href="index.html"><span class="public-brand-icon"><i class="fa-brands fa-telegram"></i></span><span>PasTele</span></a>
      <nav class="public-menu" aria-label="Main navigation">
        <a href="marketplace.html"><i class="fa-solid fa-store"></i><span>Marketplace</span><em class="hot"><i class="fa-solid fa-fire"></i> Hot</em></a>
        <a href="notifications.html"><i class="fa-solid fa-bell"></i><span>Notifications</span><em class="new green"><i class="fa-solid fa-sparkles"></i> New</em></a>
        <a href="purchases.html"><i class="fa-solid fa-bag-shopping"></i><span>Purchases</span><em class="new green"><i class="fa-solid fa-sparkles"></i> New</em></a>
      </nav>
      <div class="public-auth">${user
        ? `<a class="public-login" href="dashboard.html"><i class="fa-solid fa-gauge-high"></i> Dashboard</a><a class="public-register" href="profile.html">${esc(user.user_metadata?.username||"Akun")} <i class="fa-solid fa-user"></i></a>`
        : `<a class="public-login" href="login.html">Login</a><a class="public-register" href="register.html">Register</a>`}</div>
    </header>
  </div>`;
});


/* ===== SOURCE: js/product.js ===== */
/* =========================================================
   PasTele — PRODUCT DETAIL
   FINAL SQL SYNC
   Supports:
   - products (Link / generic)
   - telegram_products (Code)
   - telegram_channels (Channel / Group)
   - pastes (Free)
   - pastelinks are served by paste-view.html via /p/*
   - Free / Paid access
   - Premium / purchase access
   - Like + comments according to SQL RLS
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const $ = id => document.getElementById(id);
  const box = $("content");
  const toast = (m,t="error") => window.TC?.toast ? TC.toast(m,t) : console[t === "error" ? "error" : "log"](m);
  const esc = v => window.TC?.esc ? TC.esc(String(v ?? "")) : String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const money = v => window.TC?.money ? TC.money(v) : `Rp ${Number(v||0).toLocaleString("id-ID")}`;
  const client = window.sb || window.supabaseClient || null;
  const params = new URLSearchParams(location.search);
  const requestedType = String(params.get("type") || "link").trim().toLowerCase();
  const requestedId = String(params.get("id") || "").trim();
  const requestedSlug = String(params.get("slug") || "").trim();
  let item = null;
  let resolvedType = requestedType;
  let rpcType = requestedType;

  if (!client || !box) return;

  const normalizeType = (type, row={}) => {
    const t = String(type || "").toLowerCase();
    if (t === "telegram_product" || t === "code") return "code";
    if (["telegram_channel","telegram-channel","channel"].includes(t)) return row.type === "group" ? "group" : "channel";
    if (t === "group" || t === "telegram_group" || t === "telegram-group") return "group";
    if (t === "paste") return "paste";
    if (t === "pastelink" || t === "paste-link" || t === "paste_link") return "pastelink";
    return "link";
  };

  const setHeader = (title, subtitle, icon="fa-box") => {
    const h = document.querySelector(".product-page-title");
    const p = document.querySelector(".product-page-subtitle");
    const b = document.querySelector(".product-badge span");
    const i = document.querySelector(".product-badge i");
    if (h) h.textContent = title || "Product";
    if (p) p.textContent = subtitle || "Detail produk dan akses.";
    if (b) b.textContent = "Product";
    if (i) i.className = `fa-solid ${icon}`;
  };

  const accessType = row => String(row?.access_type || "free").toLowerCase() === "paid" ? "paid" : "free";
  const priceOf = row => Number(row?.price || 0);

  async function currentProfile(){
    try { return typeof window.TC?.profile === "function" ? await window.TC.profile() : null; } catch { return null; }
  }

  async function resolve(){
    if (requestedType === "pastelink") {
      location.replace(`/p/${encodeURIComponent(requestedSlug)}`);
      return false;
    }
    if (requestedType === "paste") {
      if (requestedId) {
        const q = await client.from("pastes").select("id,owner_id,title,slug,content,visibility,password,created_at,updated_at").eq("id",requestedId).maybeSingle();
        if (q.error) throw q.error;
        item = q.data;
      } else {
        const q = await client.from("pastes").select("id,owner_id,title,slug,content,visibility,password,created_at,updated_at").eq("slug",requestedSlug).maybeSingle();
        if (q.error) throw q.error;
        item = q.data;
      }
      resolvedType = "paste";
      return !!item;
    }

    let table = "products";
    if (requestedType === "code") table = "telegram_products";
    if (["channel","group"].includes(requestedType)) table = "telegram_channels";
    const q = requestedId
      ? await client.from(table).select("id").eq("id",requestedId).maybeSingle()
      : await client.from(table).select("id").eq("slug",requestedSlug).maybeSingle();
    if (q.error) throw q.error;
    if (!q.data?.id) return false;
    const id = q.data.id;
    if (table === "products") rpcType = "product";
    else if (table === "telegram_products") rpcType = "telegram_product";
    else rpcType = "channel";
    const guestToken=String(new URLSearchParams(location.search).get("guest_token") || localStorage.getItem("pastele-guest-checkout-token") || "").trim();
    const detail = guestToken ? await client.rpc("get_market_item_detail_guest", {p_type:rpcType,p_id:id,p_guest_token:guestToken}) : await client.rpc("get_market_item_detail", {p_type:rpcType,p_id:id});
    if (detail.error) throw detail.error;
    item = Array.isArray(detail.data) ? detail.data[0] : detail.data;
    if (!item || item.found === false) return false;
    resolvedType = normalizeType(requestedType,item);
    return true;
  }

  function isOwner(profile){
    if (!profile?.id || !item) return false;
    return String(item.owner_id || item.creator_id || item.seller_id || item.owner_id) === String(profile.id);
  }

  async function canAccess(){
    if (accessType(item) === "free" || priceOf(item) <= 0) return {ok:true,reason:"free",profile:await currentProfile()};
    const profile = await currentProfile();
    if (!profile?.id) return {ok:false,reason:"login",profile:null};
    if (profile.is_premium === true || isOwner(profile)) return {ok:true,reason:"premium",profile};
    if (item.can_access === true) return {ok:true,reason:"purchase",profile};
    const purchase = await client.from("purchases").select("id,status").eq("buyer_id",profile.id).eq("product_id",item.id).in("status",["completed","paid","success"]).limit(1);
    if (!purchase.error && purchase.data?.length) return {ok:true,reason:"purchase",profile};
    return {ok:false,reason:"purchase",profile};
  }

  function telegramTarget(row){
    const raw = String(row?.username || row?.bot_username || row?.telegram_channel_id || "").trim();
    if (!raw) return "";
    if (/^https?:\/\/(?:t\.me|telegram\.me)\//i.test(raw)) return raw;
    if (/^@/.test(raw)) return `https://t.me/${raw.slice(1)}`;
    if (/^[A-Za-z0-9_]{5,32}$/.test(raw)) return `https://t.me/${raw}`;
    return "";
  }

  function guestCheckoutToken(){let k='pastele-guest-checkout-token';let v=localStorage.getItem(k);if(!v){v=(crypto?.randomUUID?.()||('guest_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)));localStorage.setItem(k,v)}return v}

  function renderLocked(access){
    const paid = priceOf(item);
    const login = access.reason === "login";
    box.innerHTML = `
      <div class="product-detail">
        <div class="product-detail-icon"><i class="fa-solid fa-lock"></i></div>
        <span class="badge"><i class="fa-solid fa-tag"></i> Paid</span>
        <h1>${esc(item.title || item.name || "Konten Berbayar")}</h1>
        <p class="muted">${esc(item.description || "Konten ini membutuhkan akses berbayar.")}</p>
        <div class="access-limit-note">
          <i class="fa-solid fa-shield-halved"></i>
          <span>${login ? "Silakan login untuk melanjutkan pembelian." : "Konten ini belum terbuka di akun kamu."}</span>
        </div>
        <div class="product-buy-area">
          <strong class="product-price">${money(paid)}</strong>
          <button class="btn primary" id="productBuyBtn" type="button"><i class="fa-solid fa-qrcode"></i> ${login ? "Login untuk Membeli" : "Beli Akses"}</button>
          <a class="btn" href="premium.html"><i class="fa-solid fa-gem"></i> Lihat Premium</a>
        </div>
      </div>`;
    $("productBuyBtn")?.addEventListener("click", async()=>{
      if (login) {
        const next=encodeURIComponent(location.href); location.href=`login.html?redirect=${next}`; return;
      }
      const btn=$("productBuyBtn"); btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
      try {
        const typeForCheckout = resolvedType === "code" ? "telegram_product" : (resolvedType === "channel" || resolvedType === "group" ? "channel" : (resolvedType === "paste" ? "pastelink" : "product"));
        const guestToken=guestCheckoutToken();
        const q=await client.rpc("buy_market_item_guest",{p_type:typeForCheckout,p_id:item.id,p_guest_token:guestToken});
        if(q.error) throw q.error;
        const oid=q.data?.order_id;
        if(!oid) throw new Error("Order ID tidak ditemukan.");
        location.href=`payment.html?order_id=${encodeURIComponent(oid)}&guest_token=${encodeURIComponent(guestToken)}`;
      } catch(e) { toast(e.message||"Checkout gagal.","error"); btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-qrcode"></i> Beli Akses'; }
    });
  }

  function renderOpen(access){
    const typeLabel = {link:"Link",paste:"Paste",code:"Code",channel:"Channel",group:"Group"}[resolvedType] || "Product";
    const icon = {link:"fa-link",paste:"fa-file-lines",code:"fa-code",channel:"fa-tower-broadcast",group:"fa-users"}[resolvedType] || "fa-box";
    const title=item.title || item.name || "Untitled";
    let contentHtml="";
    if (resolvedType === "channel" || resolvedType === "group") {
      const target=telegramTarget(item);
      contentHtml = target
        ? `<div class="telegram-access-card"><i class="fa-solid ${icon}"></i><div><strong>${esc(resolvedType === "group" ? "Group Telegram" : "Channel Telegram")}</strong><span>${esc(item.username || item.telegram_channel_id || item.name || "Telegram")}</span></div><a class="btn primary" href="${esc(target)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Telegram</a></div>`
        : `<div class="telegram-empty"><i class="fa-solid ${icon}"></i><div><strong>${esc(item.name || title)}</strong><span>Target Telegram belum memiliki URL publik yang dapat dibuka.</span></div></div>`;
    } else if (resolvedType === "paste") {
      contentHtml = `<div class="rich-output"><pre>${esc(item.content || "")}</pre></div>`;
    } else {
      const raw=String(item.content || "");
      const safe = resolvedType === "link" && /^https?:\/\//i.test(raw.trim())
        ? `<div class="telegram-access-card"><i class="fa-solid fa-link"></i><div><strong>Link tersedia</strong><span>${esc(raw.trim())}</span></div><a class="btn primary" href="${esc(raw.trim())}" target="_blank" rel="noopener noreferrer">Buka Link</a></div>`
        : `<div class="rich-output"><pre>${esc(raw)}</pre></div>`;
      contentHtml=safe;
    }
    box.innerHTML=`
      <div class="product-detail">
        <div class="product-detail-icon"><i class="fa-solid ${icon}"></i></div>
        <span class="badge"><i class="fa-solid ${accessType(item)==="paid"?"fa-tag":"fa-unlock"}"></i> ${accessType(item)==="paid"?"Paid":"Free"}</span>
        <h1>${esc(title)}</h1>
        <p class="muted">${esc(item.description || "")}</p>
        ${access.reason !== "free" ? `<div class="access-limit-note premium-access-note"><i class="fa-solid fa-circle-check"></i><span>Akses berhasil dibuka untuk akun kamu.</span></div>` : ""}
        ${contentHtml}
        <div class="product-detail-meta"><span><i class="fa-solid fa-eye"></i> ${Number(item.views||0).toLocaleString("id-ID")} views</span><span><i class="fa-solid fa-cart-shopping"></i> ${Number(item.sales_count||0).toLocaleString("id-ID")} sales</span></div>
      </div>`;
  }

  async function loadEngagement(){
    const targetId=item?.id; if(!targetId) return;
    const likeBtn=$("productLikeBtn"), likeCount=$("productLikeCount"), likeIcon=$("productLikeIcon"), likeLabel=$("productLikeLabel");
    const shareBtn=$("productShareBtn"), shareCount=$("productShareCount");
    const commentCount=$("productCommentCount"), list=$("productCommentList"), form=$("productCommentForm"), submit=$("productCommentSubmit");
    const targetType = resolvedType === "code" ? "telegram_product" : resolvedType;
    const likes=await client.from("content_likes").select("id,actor_id").eq("target_id",targetId).eq("target_type",targetType);
    if(!likes.error){
      const profile=await currentProfile(); const mine=!!profile?.id && likes.data.some(x=>String(x.actor_id)===String(profile.id));
      if(likeCount) likeCount.textContent=String(likes.data.length);
      if(likeBtn) likeBtn.setAttribute("aria-pressed",mine?"true":"false");
      if(likeIcon) likeIcon.className=mine?"fa-solid fa-heart":"fa-regular fa-heart";
      if(likeLabel) likeLabel.textContent=mine?"Disukai":"Suka";
    }
    if (shareCount) {
      const shares=await client.from("analytics_events").select("id",{count:"exact",head:true}).eq("target_id",targetId).eq("target_type",targetType).eq("event_type","share");
      if(!shares.error) shareCount.textContent=String(shares.count||0);
    }
    if (shareBtn) shareBtn.onclick=async()=>{
      const url=location.href;
      try {
        if (navigator.share) await navigator.share({title:item.title||"PasTele",text:item.description||"Lihat produk ini di PasTele",url});
        else await navigator.clipboard.writeText(url);
      } catch(e) { if(e?.name==='AbortError') return; try { await navigator.clipboard.writeText(url); } catch(_) {} }
      try { await client.rpc("track_analytics",{p_event_type:"share",p_target_type:targetType,p_target_id:targetId,p_owner:item.owner_id||item.creator_id||item.seller_id||null}); } catch(e) { console.warn("[Product] Share tracking unavailable:",e); }
      if(shareCount) shareCount.textContent=String(Number(shareCount.textContent||0)+1);
    };
    if (likeBtn) likeBtn.onclick=async()=>{
      const profile=await currentProfile();
      if(!profile?.id){ location.href=`login.html?redirect=${encodeURIComponent(location.href)}`; return; }
      const q=await client.rpc("toggle_content_like",{p_target_id:targetId,p_target_type:targetType,p_owner:item.owner_id||item.creator_id||item.seller_id||null});
      if(q.error){toast(q.error.message||"Gagal menyukai.","error");return;}
      await loadEngagement();
    };
    const comments=await client.from("content_comments").select("id,user_id,body,created_at").eq("target_id",targetId).eq("target_type",targetType).order("created_at",{ascending:false}).limit(100);
    if(!comments.error){
      if(commentCount) commentCount.textContent=String(comments.data.length);
      if(list) list.innerHTML=comments.data.length?comments.data.map(c=>`<article class="product-comment-item"><div class="product-comment-avatar"><i class="fa-solid fa-user"></i></div><div><strong>User</strong><time>${new Date(c.created_at).toLocaleString("id-ID")}</time><p>${esc(c.body)}</p></div></article>`).join(""):'<div class="empty">Belum ada komentar.</div>';
    }
    const profile=await currentProfile();
    if(!profile?.id){
      const note=form?.querySelector(".product-comment-actions"); if(note) note.insertAdjacentHTML("beforebegin",'<div class="access-limit-note"><i class="fa-solid fa-right-to-bracket"></i><span>Login diperlukan untuk memberikan komentar.</span></div>');
      if(submit){submit.disabled=true;submit.title="Login diperlukan";}
    } else {
      if (form) form.onsubmit=async e=>{
        e.preventDefault(); const name=$("commentName"), text=$("commentText"); const body=String(text?.value||"").trim(); if(!body) return;
        submit.disabled=true;
        const q=await client.from("content_comments").insert({target_id:targetId,target_type:targetType,user_id:profile.id,body});
        if(q.error) toast(q.error.message||"Komentar gagal dikirim.","error"); else {text.value="";$("commentCharCount").textContent="0";toast("Komentar berhasil dikirim.","success");await loadEngagement();}
        submit.disabled=false;
      };
      $("commentText")?.addEventListener("input",()=>{$("commentCharCount").textContent=String($("commentText").value.length);});
    }
  }

  try {
    box.setAttribute("aria-busy","true");
    const ok=await resolve();
    if(!ok){ box.innerHTML='<div class="empty">Produk tidak ditemukan atau sudah tidak tersedia.</div>'; return; }
    const title=item.title || item.name || "Product";
    setHeader(title,item.description||"Detail produk dan akses.",({link:"fa-link",paste:"fa-file-lines",code:"fa-code",channel:"fa-tower-broadcast",group:"fa-users"}[resolvedType]||"fa-box"));
    const access=await canAccess();
    if(access.ok) renderOpen(access); else renderLocked(access);

    /* Record every opening; the SQL trigger creates the owner's notification. */
    try {
      const owner = item.owner_id || item.creator_id || item.seller_id || null;
      const targetType = resolvedType === "code" ? "telegram_product" : (resolvedType === "channel" || resolvedType === "group" ? "channel" : resolvedType);
      await client.rpc("record_content_view", { p_owner: owner, p_target_type: targetType, p_target_id: item.id });
    } catch (viewError) {
      console.warn("[Product] View tracking unavailable:", viewError);
    }

    await loadEngagement();
  } catch(e){
    console.error("[Product]",e);
    box.innerHTML=`<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><br><br>${esc(e.message||"Gagal memuat produk.")}</div>`;
  } finally { box.setAttribute("aria-busy","false"); }
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
