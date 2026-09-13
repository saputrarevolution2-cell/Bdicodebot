/* GENERATED PAGE JS BUNDLE: paste-view.html */

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


/* ===== SOURCE: js/paste-view.js ===== */
/* =========================================================
   PasTele — PasteLink View
   FINAL SQL SYNC
   SQL TABLE:
   public.pastelinks
   Relevant columns:
   - id
   - user_id
   - slug
   - title
   - content_html
   - visibility
   - password_hash
   - expires_at
   - description
   - tags
   - allow_comments
   - allow_download
   - show_raw
   - anonymous
   - views
   - created_at
   - updated_at
   RPC:
   - increment_paste_view(uuid)
   - record_content_view(uuid,text,uuid)
   - track_analytics(text,text,uuid,uuid)
   - toggle_content_like(uuid,text,uuid)
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    /* =======================================================
       DOM
       ======================================================= */
    const params = new URLSearchParams(location.search);
    // Support both /p/<slug> and /paste-view.html?slug=<slug>.
    const pathParts = (location.pathname || "").split("/").filter(Boolean);
    const pathSlug = pathParts[0]?.toLowerCase() === "p" && pathParts.length >= 2
        ? decodeURIComponent(pathParts.slice(1).join("/")).trim()
        : "";
    const slug = String(params.get("slug") || pathSlug).trim();
    const box = document.getElementById("pasteContent");
    if (!box) {
        console.error("[PasteLink] #pasteContent tidak ditemukan.");
        return;
    }
    /* =======================================================
       BASIC HELPERS
       ======================================================= */
    const esc = (value) => {
        if (window.TC?.esc) {
            return TC.esc(String(value ?? ""));
        }
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
    const client =
        window.sb ||
        window.supabaseClient ||
        window.supabase;
    if (!client) {
        box.innerHTML = `
            <div class="empty">
                Tidak dapat terhubung ke database.
            </div>
        `;
        return;
    }
    /* =======================================================
       URL SANITIZER
       ======================================================= */
    const safeUrl = (value) => {
        let url = String(value || "").trim();
        if (!url) return "";
        if (/^www\./i.test(url)) {
            url = "https://" + url;
        }
        try {
            const parsed = new URL(url);
            if (
                parsed.protocol !== "http:" &&
                parsed.protocol !== "https:"
            ) {
                return "";
            }
            return parsed.href;
        } catch {
            return "";
        }
    };
    /* =======================================================
       SAFE HTML / LINKIFY
       -------------------------------------------------------
       content_html memang berupa HTML dari PasteLink.
       Kita tetap sanitasi elemen/script berbahaya sebelum
       memasukkannya ke DOM.
       ======================================================= */
    const linkify = (raw) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(
            String(raw || ""),
            "text/html"
        );
        /* Remove dangerous elements */
        doc.querySelectorAll(
            "script,iframe,object,embed,style,link,meta,base,form"
        ).forEach((element) => {
            element.remove();
        });
        /* Remove inline event handlers */
        doc.querySelectorAll("*").forEach((element) => {
            [...element.attributes].forEach((attribute) => {
                const name = attribute.name.toLowerCase();
                if (
                    name.startsWith("on") ||
                    name === "srcdoc"
                ) {
                    element.removeAttribute(attribute.name);
                }
            });
        });
        /* Sanitize anchors */
        doc.querySelectorAll("a").forEach((anchor) => {
            const href = safeUrl(
                anchor.getAttribute("href")
            );
            if (!href) {
                anchor.replaceWith(
                    document.createTextNode(
                        anchor.textContent || ""
                    )
                );
                return;
            }
            anchor.setAttribute("href", href);
            anchor.setAttribute("target", "_blank");
            anchor.setAttribute(
                "rel",
                "noopener noreferrer nofollow"
            );
        });
        /*
         * Remove javascript/data/blob URLs from media.
         * Normal HTTPS images are allowed.
         */
        doc.querySelectorAll(
            "img,video,audio,source"
        ).forEach((element) => {
            const attr =
                element.hasAttribute("src")
                    ? "src"
                    : element.hasAttribute("poster")
                        ? "poster"
                        : null;
            if (!attr) return;
            const value =
                element.getAttribute(attr);
            if (!safeUrl(value)) {
                element.removeAttribute(attr);
            }
        });
        /* ===================================================
           AUTO LINK PLAIN URLS
           =================================================== */
        const walker = doc.createTreeWalker(
            doc.body,
            NodeFilter.SHOW_TEXT
        );
        const textNodes = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (
                node.parentElement &&
                !node.parentElement.closest(
                    "a,pre,code,textarea"
                )
            ) {
                textNodes.push(node);
            }
        }
        const urlRegex =
            /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
        textNodes.forEach((node) => {
            const text = node.nodeValue || "";
            let match;
            let lastIndex = 0;
            let changed = false;
            const fragment =
                document.createDocumentFragment();
            urlRegex.lastIndex = 0;
            while ((match = urlRegex.exec(text))) {
                let url = match[1];
                let trailing = "";
                /*
                 * Keep punctuation outside the anchor.
                 */
                while (
                    /[.,!?;:)\]}]$/.test(url)
                ) {
                    trailing =
                        url.slice(-1) + trailing;
                    url = url.slice(0, -1);
                }
                if (match.index > lastIndex) {
                    fragment.appendChild(
                        document.createTextNode(
                            text.slice(
                                lastIndex,
                                match.index
                            )
                        )
                    );
                }
                const href = safeUrl(url);
                if (href) {
                    const anchor =
                        document.createElement("a");
                    anchor.href = href;
                    anchor.target = "_blank";
                    anchor.rel =
                        "noopener noreferrer nofollow";
                    anchor.textContent = url;
                    fragment.appendChild(anchor);
                    if (trailing) {
                        fragment.appendChild(
                            document.createTextNode(
                                trailing
                            )
                        );
                    }
                    changed = true;
                } else {
                    fragment.appendChild(
                        document.createTextNode(
                            match[1]
                        )
                    );
                    changed = true;
                }
                lastIndex =
                    match.index + match[1].length;
            }
            if (!changed) return;
            if (lastIndex < text.length) {
                fragment.appendChild(
                    document.createTextNode(
                        text.slice(lastIndex)
                    )
                );
            }
            node.replaceWith(fragment);
        });
        return doc.body.innerHTML;
    };
    /* =======================================================
       VALIDATE SLUG
       ======================================================= */
    if (!slug) {
        box.innerHTML = `
            <div class="empty">
                Paste tidak ditemukan.
            </div>
        `;
        return;
    }
    /* =======================================================
       LOAD PASTELINK
       -------------------------------------------------------
       Jangan gunakan select('*').
       Ambil hanya kolom yang memang digunakan.
       ======================================================= */
    const result = await client.rpc("get_pastelink_by_slug", {
        p_slug: slug
    });
    if (result.error) {
        console.error(
            "[PasteLink] Query error:",
            result.error
        );
        box.innerHTML = `
            <div class="empty">
                Gagal memuat PasteLink.
            </div>
        `;
        return;
    }
    let paste = Array.isArray(result.data)
        ? result.data[0]
        : result.data;
    if (!paste || paste.found === false) {
        box.innerHTML = `
            <div class="empty">
                PasteLink tidak ditemukan.
            </div>
        `;
        return;
    }

    /* =======================================================
       PAID / FREE ACCESS
       ======================================================= */
    let detail = null;
    try {
        const guestToken=String(new URLSearchParams(location.search).get("guest_token") || localStorage.getItem("pastele-guest-checkout-token") || "").trim();
        const detailResult = guestToken
            ? await client.rpc("get_market_item_detail_guest", {p_type:"pastelink",p_id:paste.id,p_guest_token:guestToken})
            : await client.rpc("get_market_item_detail", {p_type:"pastelink",p_id:paste.id});
        if (!detailResult.error) {
            detail = Array.isArray(detailResult.data) ? detailResult.data[0] : detailResult.data;
            if (detail && detail.found !== false) {
                paste = { ...paste, ...detail };
            }
        }
    } catch (error) {
        console.warn("[PasteLink] Detail RPC gagal:", error);
    }

    const accessType = String(paste.access_type || "free").toLowerCase();
    const isPaid = accessType === "paid" && Number(paste.price || 0) > 0;
    const canAccess = !isPaid || paste.can_access === true;

    if (isPaid && !canAccess) {
        const priceText = Number(paste.price || 0).toLocaleString("id-ID");
        box.innerHTML = `
            <article class="justpaste-view premium-view paste-locked">
                <div class="paste-view-top">
                    <span class="badge"><i class="fa-solid fa-lock"></i> PasteLink Paid</span>
                    <span class="paste-live">Marketplace</span>
                </div>
                <h1>${esc(paste.title || "PasteLink")}</h1>
                ${paste.description ? `<p class="paste-description muted">${esc(paste.description)}</p>` : ""}
                <div class="paste-paywall">
                    <div class="paste-paywall-icon"><i class="fa-solid fa-lock"></i></div>
                    <h2>Konten ini berbayar</h2>
                    <p>Beli akses untuk membuka seluruh isi PasteLink.</p>
                    <strong class="paste-paywall-price">Rp ${priceText}</strong>
                    <button type="button" class="btn primary" id="buyPasteLink">
                        <i class="fa-solid fa-cart-shopping"></i> Beli Akses
                    </button>
                </div>
            </article>
        `;

        document.getElementById("buyPasteLink")?.addEventListener("click", async () => {
            let currentUser = null;
            try { currentUser = typeof window.TC?.user === "function" ? await window.TC.user() : null; } catch (_) {}
            const button = document.getElementById("buyPasteLink");
            if (button) { button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; }
            try {
                const key='pastele-guest-checkout-token'; let guestToken=localStorage.getItem(key); if(!guestToken){guestToken=(crypto?.randomUUID?.()||('guest_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)));localStorage.setItem(key,guestToken);} const buy = await client.rpc("buy_market_item_guest", { p_type: "pastelink", p_id: paste.id, p_guest_token: guestToken });
                if (buy.error) throw buy.error;
                const orderId = buy.data?.order_id;
                if (!orderId) throw new Error("Order tidak berhasil dibuat.");
                location.href = "payment.html?order_id=" + encodeURIComponent(orderId) + "&guest_token=" + encodeURIComponent(guestToken);
            } catch (error) {
                window.TC?.toast?.(error?.message || "Gagal membuat order.", "error");
                if (button) { button.disabled = false; button.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Beli Akses'; }
            }
        });
        return;
    }

    /* =======================================================
       EXPIRATION
       ======================================================= */
    if (
        paste.expires_at &&
        new Date(paste.expires_at).getTime() <= Date.now()
    ) {
        box.innerHTML = `
            <div class="empty">
                Paste sudah expired.
            </div>
        `;
        return;
    }
    /* =======================================================
       TAGS
       ======================================================= */
    const tags = Array.isArray(paste.tags)
        ? paste.tags
        : [];
    const tagHtml = tags
        .filter((tag) => String(tag || "").trim())
        .map(
            (tag) =>
                `<span class="paste-tag">#${esc(tag)}</span>`
        )
        .join("");
    /* =======================================================
       RENDER
       ======================================================= */
    const html = linkify(
        paste.content_html || ""
    );
    box.innerHTML = `
        <article
            class="justpaste-view premium-view"
            data-paste-id="${esc(paste.id)}"
        >
            <div class="paste-view-top">
                <span class="badge">
                    <i class="fa-solid fa-link"></i>
                    PasteLink
                </span>
                <span class="paste-live">
                    <i class="fa-solid fa-circle"></i>
                    Published
                </span>
            </div>
            <h1>
                ${esc(paste.title || "Untitled Paste")}
            </h1>
            ${
                paste.description
                    ? `
                        <p class="paste-description muted">
                            ${esc(paste.description)}
                        </p>
                    `
                    : ""
            }
            <div class="rich-output">
                ${html}
            </div>
            ${
                tagHtml
                    ? `
                        <div class="paste-tags">
                            ${tagHtml}
                        </div>
                    `
                    : ""
            }
            <div class="paste-actions">
                <button
                    type="button"
                    class="btn"
                    id="plike"
                >
                    <i class="fa-regular fa-heart"></i>
                    Like
                </button>
                <button
                    type="button"
                    class="btn"
                    id="pshare"
                >
                    <i class="fa-solid fa-share-nodes"></i>
                    Share
                </button>
            </div>
        </article>
    `;
    /* =======================================================
       VIEW TRACKING
       -------------------------------------------------------
       RPC memang tersedia di SQL.
       Jangan block UI kalau analytics gagal.
       ======================================================= */
    try {
        const viewResult = await client.rpc(
            "increment_paste_view",
            {
                p_id: paste.id
            }
        );
        if (viewResult.error) {
            console.warn(
                "[PasteLink] increment_paste_view:",
                viewResult.error
            );
        }
    } catch (error) {
        console.warn(
            "[PasteLink] View RPC gagal:",
            error
        );
    }
    try {
        const analyticsResult = await client.rpc(
            "record_content_view",
            {
                p_owner: paste.user_id,
                p_target_type: "pastelink",
                p_target_id: paste.id
            }
        );
        if (analyticsResult.error) {
            console.warn(
                "[PasteLink] record_content_view:",
                analyticsResult.error
            );
        }
    } catch (error) {
        console.warn(
            "[PasteLink] Analytics RPC gagal:",
            error
        );
    }
    /* =======================================================
       SHARE
       ======================================================= */
    const shareButton =
        document.getElementById("pshare");
    shareButton?.addEventListener(
        "click",
        async () => {
            const url = location.href;
            let copied = false;
            try {
                if (
                    navigator.clipboard &&
                    window.isSecureContext
                ) {
                    await navigator.clipboard.writeText(
                        url
                    );
                    copied = true;
                }
            } catch {
                copied = false;
            }
            /*
             * Fallback Web Share API.
             */
            if (
                !copied &&
                navigator.share
            ) {
                try {
                    await navigator.share({
                        title:
                            paste.title ||
                            "PasteLink",
                        url
                    });
                } catch {
                    /* User cancelled share */
                }
            }
            /* Track share */
            try {
                const shareResult =
                    await client.rpc(
                        "track_analytics",
                        {
                            p_owner: paste.user_id,
                            p_event_type: "share",
                            p_target_type: "pastelink",
                            p_target_id: paste.id
                        }
                    );
                if (shareResult.error) {
                    console.warn(
                        "[PasteLink] Share analytics:",
                        shareResult.error
                    );
                }
            } catch (error) {
                console.warn(
                    "[PasteLink] Share RPC gagal:",
                    error
                );
            }
            if (window.TC?.toast) {
                TC.toast(
                    copied
                        ? "Link disalin"
                        : "Link siap dibagikan",
                    "success"
                );
            }
        }
    );
    /* =======================================================
       LIKE
       ======================================================= */
    const likeButton =
        document.getElementById("plike");
    likeButton?.addEventListener(
        "click",
        async () => {
            let currentUser = null;
            try {
                if (
                    window.TC &&
                    typeof TC.user === "function"
                ) {
                    currentUser = await TC.user();
                }
            } catch {
                currentUser = null;
            }
            if (!currentUser?.id) {
                location.href =
                    "login.html";
                return;
            }
            likeButton.disabled = true;
            try {
                const likeResult =
                    await client.rpc(
                        "toggle_content_like",
                        {
                            p_owner: paste.user_id,
                            p_target_type: "pastelink",
                            p_target_id: paste.id
                        }
                    );
                if (likeResult.error) {
                    throw likeResult.error;
                }
                const liked =
                    Boolean(
                        likeResult.data?.liked
                    );
                likeButton.innerHTML = liked
                    ? `
                        <i class="fa-solid fa-heart"></i>
                        Liked
                    `
                    : `
                        <i class="fa-regular fa-heart"></i>
                        Like
                    `;
                likeButton.classList.toggle(
                    "active",
                    liked
                );
                if (window.TC?.toast) {
                    TC.toast(
                        liked
                            ? "Ditambahkan ke suka"
                            : "Like dibatalkan",
                        "success"
                    );
                }
            } catch (error) {
                console.error(
                    "[PasteLink] Like error:",
                    error
                );
                if (window.TC?.toast) {
                    TC.toast(
                        error?.message ||
                            "Gagal memproses like.",
                        "error"
                    );
                }
            } finally {
                likeButton.disabled = false;
            }
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
