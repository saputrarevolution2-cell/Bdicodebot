/* =========================================================
   PasTele Authentication
   PRODUCTION + SUPABASE + CLOUDFLARE TURNSTILE
   ========================================================= */

(() => {
  "use strict";


  /* =======================================================
     SUPABASE CLIENT
     ======================================================= */

  const requireClient = () => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum terkonfigurasi. Pastikan js/config.js berisi Project URL dan anon/publishable key."
      );
    }

    return window.sb;
  };


  /* =======================================================
     NORMALIZE
     ======================================================= */

  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();


  /* =======================================================
     EMAIL VALIDATOR
     ======================================================= */

  const isEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      String(value ?? "").trim()
    );


  /* =======================================================
     GET CAPTCHA TOKEN
     ======================================================= */

  const getCaptchaToken = (
    explicitToken = null
  ) => {

    /*
     * Priority:
     *
     * 1. Token dari Auth.login()
     * 2. Token global login.js
     * 3. Token dari textarea Turnstile
     */

    const directToken =
      String(
        explicitToken ?? ""
      ).trim();

    if (directToken) {
      return directToken;
    }


    const globalToken =
      String(
        window.__pasTeleTurnstileToken ?? ""
      ).trim();

    if (globalToken) {
      return globalToken;
    }


    const textarea =
      document.querySelector(
        'textarea[name="cf-turnstile-response"]'
      );

    if (
      textarea &&
      textarea.value
    ) {
      return String(
        textarea.value
      ).trim();
    }


    return "";
  };


  /* =======================================================
     CLEAR CAPTCHA TOKEN
     ======================================================= */

  const clearCaptchaToken = () => {
    try {
      window.__pasTeleTurnstileToken = "";
    } catch (_) {
      /* ignore */
    }
  };


  /* =======================================================
     AUTH ERROR NORMALIZER
     ======================================================= */

  const authError = (error) => {

    const msg =
      String(
        error?.message ||
        error ||
        ""
      ).trim();

    const low =
      msg.toLowerCase();


    /* =====================================================
       CAPTCHA / TURNSTILE
       ===================================================== */

    if (
      low.includes("captcha") ||
      low.includes("turnstile")
    ) {
      return new Error(
        "Verifikasi keamanan gagal atau sudah kedaluwarsa. Silakan verifikasi kembali."
      );
    }


    /* =====================================================
       INVALID LOGIN
       ===================================================== */

    if (
      low.includes(
        "invalid login credentials"
      ) ||
      low.includes(
        "invalid credentials"
      ) ||
      low.includes(
        "invalid login"
      )
    ) {
      return new Error(
        "Username/Gmail atau kata sandi salah."
      );
    }


    /* =====================================================
       EMAIL NOT CONFIRMED
       ===================================================== */

    if (
      low.includes(
        "email not confirmed"
      )
    ) {
      return new Error(
        "Email belum dikonfirmasi. Cek inbox Gmail kamu terlebih dahulu."
      );
    }


    /* =====================================================
       ALREADY REGISTERED
       ===================================================== */

    if (
      low.includes(
        "user already registered"
      ) ||
      low.includes(
        "already registered"
      ) ||
      low.includes(
        "already been registered"
      )
    ) {
      return new Error(
        "Email sudah terdaftar."
      );
    }


    /* =====================================================
       PASSWORD
       ===================================================== */

    if (
      low.includes(
        "password should be at least"
      )
    ) {
      return new Error(
        "Kata sandi terlalu pendek."
      );
    }


    /* =====================================================
       RATE LIMIT
       ===================================================== */

    if (
      low.includes(
        "rate limit"
      ) ||
      low.includes(
        "too many requests"
      )
    ) {
      return new Error(
        "Terlalu banyak percobaan. Silakan tunggu beberapa saat lalu coba lagi."
      );
    }


    /* =====================================================
       DEFAULT
       ===================================================== */

    if (
      error instanceof Error
    ) {
      return error;
    }


    return new Error(
      msg ||
      "Autentikasi gagal."
    );
  };


  /* =======================================================
     PROFILE BAN CHECK
     ======================================================= */

  const checkProfileBan = async (
    sb,
    userId
  ) => {

    if (!userId) {
      return;
    }


    const {
      data: profile,
      error: profileError
    } =
      await sb
        .from("profiles")
        .select("is_banned")
        .eq("id", userId)
        .maybeSingle();


    /*
     * Jangan menggagalkan login hanya karena
     * query profile gagal.
     */

    if (profileError) {

      console.error(
        "[PasTele] PROFILE CHECK ERROR:",
        profileError
      );

      return;
    }


    if (
      profile?.is_banned === true
    ) {

      try {
        await sb.auth.signOut();
      } catch (_) {
        /* ignore */
      }

      throw new Error(
        "Akun ini sedang diblokir."
      );
    }
  };


  /* =======================================================
     RECORD LOGIN HISTORY
     ======================================================= */

  const recordLogin = async (
    sb
  ) => {

    try {

      let geo = {};


      /* ===================================================
         GEOLOCATION
      =================================================== */

      try {

        const response =
          await fetch(
            "https://ipapi.co/json/",
            {
              cache: "no-store"
            }
          );


        if (
          response.ok
        ) {
          geo =
            await response.json();
        }

      } catch (_) {
        geo = {};
      }


      /* ===================================================
         RECORD LOGIN
      =================================================== */

      const {
        error
      } =
        await sb.rpc(
          "record_login",
          {
            p_city:
              geo.city ||
              null,

            p_region:
              geo.region ||
              null,

            p_country:
              geo.country_name ||
              null,

            p_latitude:
              geo.latitude != null
                ? Number(
                    geo.latitude
                  )
                : null,

            p_longitude:
              geo.longitude != null
                ? Number(
                    geo.longitude
                  )
                : null,

            p_user_agent:
              navigator.userAgent
          }
        );


      if (error) {
        console.warn(
          "[PasTele] record_login RPC error:",
          error
        );
      }

    } catch (error) {

      /*
       * Login tetap berhasil jika
       * history gagal.
       */

      console.warn(
        "[PasTele] Login history could not be recorded:",
        error
      );
    }
  };


  /* =======================================================
     AUTH API
     ======================================================= */

  window.Auth = {


    /* =====================================================
       LOOKUP USERNAME / EMAIL
       ===================================================== */

    lookup: async (
      identifier
    ) => {

      const sb =
        requireClient();


      const value =
        normalize(
          identifier
        );


      if (!value) {
        return null;
      }


      const {
        data,
        error
      } =
        await sb.rpc(
          "resolve_username_login",
          {
            p_username:
              value
          }
        );


      if (error) {

        console.error(
          "[PasTele] ACCOUNT LOOKUP ERROR:",
          error
        );

        throw authError(
          error
        );
      }


      const row =
        Array.isArray(data)
          ? data[0]
          : data;


      if (
        !row?.auth_email
      ) {
        return null;
      }


      return {

        auth_email:
          normalize(
            row.auth_email
          ),

        username:
          String(
            row.username ||
            row.display_name ||
            ""
          ).trim(),

        display_name:
          String(
            row.display_name ||
            ""
          ).trim(),

        is_banned:
          row.is_banned === true,

        status:
          String(
            row.status ||
            ""
          ).trim()

      };
    },


    /* =====================================================
       LOGIN
       ===================================================== */

    login: async (
      identifier,
      password,
      captchaToken = null
    ) => {

      const sb =
        requireClient();


      /* ===================================================
         RAW VALUES
      =================================================== */

      const raw =
        String(
          identifier ?? ""
        ).trim();


      const pass =
        String(
          password ?? ""
        );


      /* ===================================================
         PASSWORD REQUIRED
      =================================================== */

      if (!pass) {
        throw new Error(
          "Kata sandi wajib diisi."
        );
      }


      /* ===================================================
         CAPTCHA TOKEN
      =================================================== */

      const token =
        getCaptchaToken(
          captchaToken
        );


      if (!token) {
        throw new Error(
          "Selesaikan verifikasi keamanan terlebih dahulu."
        );
      }


      let email = "";


      /* ===================================================
         EMAIL LOGIN
      =================================================== */

      if (
        isEmail(raw)
      ) {

        email =
          normalize(
            raw
          );

      }


      /* ===================================================
         USERNAME LOGIN
      =================================================== */

      else {

        const found =
          await window.Auth.lookup(
            raw
          );


        if (
          !found?.auth_email
        ) {
          throw new Error(
            "Akun tidak ditemukan."
          );
        }


        if (
          found.is_banned === true ||
          String(
            found.status || ""
          ).toLowerCase() ===
            "banned"
        ) {
          throw new Error(
            "Akun ini sedang diblokir."
          );
        }


        email =
          normalize(
            found.auth_email
          );
      }


      /* ===================================================
         FINAL EMAIL VALIDATION
      =================================================== */

      if (
        !isEmail(email)
      ) {
        throw new Error(
          "Email akun tidak valid."
        );
      }


      /* ===================================================
         SUPABASE PASSWORD LOGIN
         + CLOUDFLARE TURNSTILE
      =================================================== */

      let data = null;
      let error = null;


      try {

        const result =
          await sb.auth.signInWithPassword({

            email:
              email,

            password:
              pass,

            options: {
              captchaToken:
                token
            }

          });


        data =
          result?.data ||
          null;

        error =
          result?.error ||
          null;

      } catch (requestError) {

        /*
         * Network / client exception.
         */

        clearCaptchaToken();

        throw authError(
          requestError
        );

      } finally {

        /*
         * Token hanya digunakan untuk
         * request login ini.
         */

        clearCaptchaToken();
      }


      /* ===================================================
         SUPABASE ERROR
      =================================================== */

      if (error) {

        console.error(
          "[PasTele] SUPABASE LOGIN ERROR:",
          error
        );

        throw authError(
          error
        );
      }


      /* ===================================================
         SESSION + USER VALIDATION
      =================================================== */

      if (
        !data?.session ||
        !data?.user
      ) {

        throw new Error(
          "Login belum membuat session. Jika konfirmasi email aktif, konfirmasi email terlebih dahulu."
        );
      }


      /* ===================================================
         PROFILE BAN CHECK
      =================================================== */

      await checkProfileBan(
        sb,
        data.user.id
      );


      /* ===================================================
         SESSION PERSISTENCE CHECK
      =================================================== */

      const sessionCheck =
        await sb.auth.getSession();


      if (
        !sessionCheck.data?.session
      ) {

        throw new Error(
          "Login berhasil tetapi session tidak tersimpan. Periksa konfigurasi Auth/Site URL Supabase."
        );
      }


      /* ===================================================
         LOGIN HISTORY
      =================================================== */

      await recordLogin(
        sb
      );


      /* ===================================================
         RETURN
      =================================================== */

      return {

        user:
          data.user,

        session:
          sessionCheck.data.session

      };
    },


    /* =====================================================
       REGISTER
       ===================================================== */

    register: async (
      username,
      email,
      password
    ) => {

      const sb =
        requireClient();


      const cleanUsername =
        normalize(
          username
        );

      const cleanEmail =
        normalize(
          email
        );

      const cleanPassword =
        String(
          password ?? ""
        );


      /* ===================================================
         USERNAME VALIDATION
      =================================================== */

      if (
        !/^[a-z0-9_]{3,32}$/.test(
          cleanUsername
        )
      ) {
        throw new Error(
          "Username hanya boleh berisi huruf, angka, dan underscore (3–32 karakter)."
        );
      }


      /* ===================================================
         EMAIL VALIDATION
      =================================================== */

      if (
        !isEmail(
          cleanEmail
        )
      ) {
        throw new Error(
          "Email tidak valid."
        );
      }


      /* ===================================================
         PASSWORD VALIDATION
      =================================================== */

      if (
        cleanPassword.length < 6
      ) {
        throw new Error(
          "Kata sandi minimal 6 karakter."
        );
      }


      /* ===================================================
         USERNAME AVAILABILITY
      =================================================== */

      const {
        data: available,
        error: availableError
      } =
        await sb.rpc(
          "username_available",
          {
            p_username:
              cleanUsername
          }
        );


      if (availableError) {

        console.error(
          "[PasTele] USERNAME CHECK ERROR:",
          availableError
        );

        throw authError(
          availableError
        );
      }


      if (
        available !== true
      ) {
        throw new Error(
          "Username sudah digunakan."
        );
      }


      /* ===================================================
         SUPABASE REGISTER
      =================================================== */

      const {
        data,
        error
      } =
        await sb.auth.signUp({

          email:
            cleanEmail,

          password:
            cleanPassword,

          options: {

            data: {
              username:
                cleanUsername
            }

          }

        });


      if (error) {

        console.error(
          "[PasTele] SUPABASE REGISTER ERROR:",
          error
        );

        throw authError(
          error
        );
      }


      return data;
    },


    /* =====================================================
       GOOGLE LOGIN
       ===================================================== */

    google: async () => {

      const sb =
        requireClient();


      const {
        error
      } =
        await sb.auth.signInWithOAuth({

          provider:
            "google",

          options: {

            redirectTo:
              `${location.origin}/auth-callback.html`

          }

        });


      if (error) {

        console.error(
          "[PasTele] GOOGLE LOGIN ERROR:",
          error
        );

        throw authError(
          error
        );
      }
    },


    /* =====================================================
       LOGOUT
       ===================================================== */

    logout: async () => {

      const sb =
        requireClient();


      const {
        error
      } =
        await sb.auth.signOut();


      if (error) {
        throw authError(
          error
        );
      }


      clearCaptchaToken();


      location.replace(
        "login.html"
      );
    },


    /* =====================================================
       GET SESSION
       ===================================================== */

    session: async () => {

      if (!window.sb) {
        return null;
      }


      const {
        data,
        error
      } =
        await window.sb.auth.getSession();


      if (error) {

        console.error(
          "[PasTele] GET SESSION ERROR:",
          error
        );

        return null;
      }


      return (
        data?.session ||
        null
      );
    },


    /* =====================================================
       GET USER
       ===================================================== */

    user: async () => {

      if (!window.sb) {
        return null;
      }


      const {
        data,
        error
      } =
        await window.sb.auth.getUser();


      if (error) {
        return null;
      }


      return (
        data?.user ||
        null
      );
    }

  };


  /* =======================================================
     DEBUG
     ======================================================= */

  console.log(
    "[PasTele] Auth initialized.",
    {
      supabase:
        Boolean(window.sb),

      authLogin:
        typeof window.Auth.login ===
        "function",

      authLookup:
        typeof window.Auth.lookup ===
        "function",

      authGoogle:
        typeof window.Auth.google ===
        "function",

      captchaLoginSupported:
        true
    }
  );

})();
