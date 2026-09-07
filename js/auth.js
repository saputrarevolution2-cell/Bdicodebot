/* =========================================================
   PasTele Authentication
   PRODUCTION + CLOUDFLARE TURNSTILE
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
     TURNSTILE TOKEN
     ======================================================= */

  const getCaptchaToken = (
    explicitToken = null
  ) => {

    /*
     * Prioritas:
     *
     * 1. Token yang diberikan Auth.login()
     * 2. Token global dari login.js
     * 3. Token textarea Turnstile
     */

    const direct =
      String(
        explicitToken ?? ""
      ).trim();

    if (direct) {
      return direct;
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
     CLEAR TURNSTILE TOKEN
     ======================================================= */

  const clearCaptchaToken = () => {

    try {
      window.__pasTeleTurnstileToken = "";
    } catch (_) {}

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


    /*
     * CAPTCHA / TURNSTILE
     */

    if (
      low.includes("captcha") ||
      low.includes("turnstile")
    ) {

      return new Error(
        "Verifikasi keamanan gagal atau sudah kedaluwarsa. Silakan verifikasi kembali."
      );
    }


    /*
     * INVALID LOGIN
     */

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


    /*
     * EMAIL NOT CONFIRMED
     */

    if (
      low.includes(
        "email not confirmed"
      )
    ) {

      return new Error(
        "Email belum dikonfirmasi. Cek inbox Gmail kamu terlebih dahulu."
      );
    }


    /*
     * ALREADY REGISTERED
     */

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


    /*
     * PASSWORD
     */

    if (
      low.includes(
        "password should be at least"
      )
    ) {

      return new Error(
        "Kata sandi terlalu pendek."
      );
    }


    /*
     * RATE LIMIT
     */

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


    /*
     * DEFAULT
     */

    return (
      error instanceof Error
        ? error
        : new Error(
            msg ||
            "Autentikasi gagal."
          )
    );
  };


  /* =======================================================
     CHECK PROFILE BAN
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


    if (profileError) {

      console.error(
        "PROFILE CHECK ERROR:",
        profileError
      );

      /*
       * Jangan menggagalkan login hanya karena
       * query profile mengalami masalah jaringan.
       */

      return;
    }


    if (
      profile?.is_banned === true
    ) {

      try {
        await sb.auth.signOut();
      } catch (_) {}

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


      /*
       * Public IP geolocation.
       *
       * Tidak memblokir login jika service
       * geolocation sedang gagal.
       */

      try {

        const response =
          await fetch(
            "https://ipapi.co/json/",
            {
              cache: "no-store"
            }
          );


        if (response.ok) {
          geo =
            await response.json();
        }

      } catch (_) {
        geo = {};
      }


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

    } catch (error) {

      /*
       * Login tetap dianggap berhasil.
       * History hanya fitur tambahan.
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
        normalize(identifier);


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
          "ACCOUNT LOOKUP ERROR:",
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


      const raw =
        String(
          identifier ?? ""
        ).trim();


      const pass =
        String(
          password ?? ""
        );


      /*
       * PASSWORD REQUIRED
       */

      if (!pass) {

        throw new Error(
          "Kata sandi wajib diisi."
        );
      }


      /*
       * TURNSTILE REQUIRED
       */

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
          normalize(raw);

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
          found.auth_email;
      }


      /*
       * EMAIL FINAL VALIDATION
       */

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

      let data;
      let error;


      try {

        ({
          data,
          error
        } =
          await sb.auth
            .signInWithPassword({

              email,

              password: pass,

              options: {
                captchaToken:
                  token
              }

            }));

      } finally {

        /*
         * Token jangan disimpan setelah
         * request login selesai.
         */

        clearCaptchaToken();
      }


      /* ===================================================
         AUTH ERROR
      =================================================== */

      if (error) {

        console.error(
          "SUPABASE LOGIN ERROR:",
          error
        );

        throw authError(
          error
        );
      }


      /* ===================================================
         SESSION VALIDATION
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
        normalize(username);

      const cleanEmail =
        normalize(email);

      const cleanPassword =
        String(
          password ?? ""
        );


      /*
       * USERNAME
       */

      if (
        !/^[a-z0-9_]{3,32}$/.test(
          cleanUsername
        )
      ) {

        throw new Error(
          "Username hanya boleh berisi huruf, angka, dan underscore (3–32 karakter)."
        );
      }


      /*
       * EMAIL
       */

      if (
        !isEmail(
          cleanEmail
        )
      ) {

        throw new Error(
          "Email tidak valid."
        );
      }


      /*
       * PASSWORD
       */

      if (
        cleanPassword.length < 6
      ) {

        throw new Error(
          "Kata sandi minimal 6 karakter."
        );
      }


      /*
       * USERNAME AVAILABILITY
       */

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
          "USERNAME CHECK ERROR:",
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


      /*
       * REGISTER
       */

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
          "SUPABASE REGISTER ERROR:",
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
        await sb.auth
          .signInWithOAuth({

            provider:
              "google",

            options: {

              redirectTo:
                `${location.origin}/auth-callback.html`

            }

          });


      if (error) {

        console.error(
          "GOOGLE LOGIN ERROR:",
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
       SESSION
       ===================================================== */

    session: async () => {

      if (!window.sb) {
        return null;
      }


      const {
        data,
        error
      } =
        await window.sb.auth
          .getSession();


      if (error) {

        console.error(
          "GET SESSION ERROR:",
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
       USER
       ===================================================== */

    user: async () => {

      if (!window.sb) {
        return null;
      }


      const {
        data,
        error
      } =
        await window.sb.auth
          .getUser();


      if (error) {
        return null;
      }


      return (
        data?.user ||
        null
      );
    }

  };

})();
