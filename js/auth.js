/* =========================================================
   PasTele — AUTH CORE
   PRODUCTION + SUPABASE + GOOGLE OAUTH
   ========================================================= */

(function () {
  "use strict";

  /*
   * Jangan tunggu DOMContentLoaded.
   * login.js / register.js bisa langsung memakai window.Auth
   * setelah file ini selesai dimuat.
   */

  const AUTH_CONFIG = {
    callbackPath: "/auth-callback.html",
    dashboardPath: "/dashboard.html",
    loginPath: "/login.html",
    registerPath: "/register.html"
  };

  /* =======================================================
     HELPERS
  ======================================================= */

  function getSupabase() {
    if (window.sb) {
      return window.sb;
    }

    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    throw new Error(
      "Supabase belum siap. Periksa js/config.js dan js/supabase.js."
    );
  }

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

  function getErrorMessage(error) {
    if (!error) {
      return "Terjadi kesalahan autentikasi.";
    }

    if (typeof error === "string") {
      return error;
    }

    return (
      error.message ||
      error.error_description ||
      error.msg ||
      "Terjadi kesalahan autentikasi."
    );
  }

  function assertSupabase() {
    const client = getSupabase();

    if (!client || !client.auth) {
      throw new Error(
        "Supabase Auth belum tersedia."
      );
    }

    return client;
  }

  /* =======================================================
     AUTH OBJECT
  ======================================================= */

  const Auth = {

    /* =====================================================
       GOOGLE LOGIN / REGISTER
       ===================================================== */

    async google() {
      const client = assertSupabase();

      console.log(
        "[PasTele Auth] Memulai Google OAuth..."
      );

      const redirectTo = getCallbackUrl();

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

      console.log(
        "[PasTele Auth] Google OAuth started.",
        {
          redirectTo,
          data
        }
      );

      return data;
    },

    /* =====================================================
       LOGIN
       ===================================================== */

    async login(identifier, password) {
      const client = assertSupabase();

      const value =
        String(identifier || "").trim();

      const pass =
        String(password || "");

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

      /*
       * Kalau identifier berupa email,
       * login langsung menggunakan email.
       */

      let email = "";

      if (
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        email = normalizeEmail(value);
      } else {
        /*
         * Login menggunakan username.
         * Cari email akun melalui RPC / tabel profiles.
         */

        const username =
          normalizeUsername(value);

        try {
          if (
            typeof client.rpc === "function"
          ) {
            const { data, error } =
              await client.rpc(
                "resolve_username_login",
                {
                  p_username: username
                }
              );

            if (!error && data) {
              const row =
                Array.isArray(data)
                  ? data[0]
                  : data;

              email =
                row?.auth_email ||
                row?.email ||
                row?.login_email ||
                "";
            }
          }
        } catch (error) {
          console.warn(
            "[PasTele Auth] RPC username lookup gagal:",
            error
          );
        }

        /*
         * Fallback menggunakan tabel profiles.
         */

        if (!email) {
          try {
            const { data, error } =
              await client
                .from("profiles")
                .select(
                  "auth_email,username"
                )
                .eq(
                  "username",
                  username
                )
                .maybeSingle();

            if (!error && data) {
              email =
                data.auth_email ||
                "";
            }
          } catch (error) {
            console.warn(
              "[PasTele Auth] Profile lookup gagal:",
              error
            );
          }
        }
      }

      if (!email) {
        throw new Error(
          "Akun tidak ditemukan."
        );
      }

      email = normalizeEmail(email);

      console.log(
        "[PasTele Auth] Login:",
        email
      );

      const { data, error } =
        await client.auth.signInWithPassword({
          email,
          password: pass
        });

      if (error) {
        console.error(
          "[PasTele Auth] Login error:",
          error
        );

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
       * Cek status user jika tersedia.
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

      /* VALIDASI */

      if (
        !/^[a-z0-9_]{3,32}$/i.test(
          cleanUsername
        )
      ) {
        throw new Error(
          "Username hanya boleh berisi huruf, angka, dan underscore."
        );
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          cleanEmail
        )
      ) {
        throw new Error(
          "Email tidak valid."
        );
      }

      if (cleanPassword.length < 6) {
        throw new Error(
          "Kata sandi minimal 6 karakter."
        );
      }

      /*
       * Cek username terlebih dahulu.
       */

      try {
        const available =
          await this.checkUsername(
            cleanUsername
          );

        if (available === false) {
          throw new Error(
            "Username sudah digunakan."
          );
        }
      } catch (error) {
        /*
         * Jangan menggagalkan register hanya karena
         * endpoint pengecekan username tidak tersedia.
         */

        if (
          String(error?.message || "")
            .toLowerCase()
            .includes("sudah digunakan")
        ) {
          throw error;
        }

        console.warn(
          "[PasTele Auth] Username availability check dilewati:",
          error
        );
      }

      /*
       * Metadata akan dipakai trigger Supabase
       * untuk membuat profile user.
       */

      const options = {
        emailRedirectTo:
          getCallbackUrl(),

        data: {
          username: cleanUsername,
          display_name: cleanUsername
        }
      };

      /*
       * Turnstile dikirim sebagai captcha token
       * jika tersedia.
       */

      if (token) {
        options.captchaToken = token;
      }

      console.log(
        "[PasTele Auth] Register:",
        {
          username: cleanUsername,
          email: cleanEmail,
          hasTurnstile: Boolean(token)
        }
      );

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
       * Jika session langsung tersedia,
       * user sudah bisa masuk.
       *
       * Jika session null, kemungkinan email confirmation
       * Supabase sedang aktif.
       */

      return data;
    },

    /* =====================================================
       LOOKUP USERNAME
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
       * Jika email, coba resolve berdasarkan email.
       */

      if (
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        try {
          const { data, error } =
            await client
              .from("profiles")
              .select(
                "id,username,display_name,auth_email,role,is_admin,is_banned"
              )
.eq(
                "auth_email",
                value
              )
              .maybeSingle();

          if (!error && data) {
            return data;
          }
        } catch (error) {
          console.warn(
            "[PasTele Auth] Email lookup gagal:",
            error
          );
        }

        return {
          auth_email: value,
          email: value
        };
      }

      /*
       * Username RPC.
       */

      try {
        if (
          typeof client.rpc === "function"
        ) {
          const { data, error } =
            await client.rpc(
              "resolve_username_login",
              {
                p_username: value
              }
            );

          if (!error && data) {
            return Array.isArray(data)
              ? data[0] || null
              : data;
          }
        }
      } catch (error) {
        console.warn(
          "[PasTele Auth] Username RPC error:",
          error
        );
      }

      /*
       * Fallback profiles.
       */

      try {
        const { data, error } =
          await client
            .from("profiles")
            .select(
              "id,username,display_name,auth_email,role,is_admin,is_banned"
            )
            .eq(
              "username",
              value
            )
            .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (error) {
        console.warn(
          "[PasTele Auth] Profile username lookup error:",
          error
        );
      }

      return null;
    },

    /* =====================================================
       CHECK USERNAME
       ===================================================== */

    async checkUsername(username) {
      const client = assertSupabase();

      const value =
        normalizeUsername(username);

      if (!value) {
        return false;
      }

      /*
       * Coba RPC terlebih dahulu jika tersedia.
       */

      try {
        const { data, error } =
          await client.rpc(
            "check_username_available",
            {
              p_username: value
            }
          );

        if (!error) {
          if (typeof data === "boolean") {
            return data;
          }

          if (
            Array.isArray(data) &&
            data.length
          ) {
            const row = data[0];

            if (
              typeof row === "boolean"
            ) {
              return row;
            }

            if (
              typeof row?.available ===
              "boolean"
            ) {
              return row.available;
            }
          }
        }
      } catch (error) {
        console.warn(
          "[PasTele Auth] Username availability RPC tidak tersedia."
        );
      }

      /*
       * Fallback query profiles.
       */

      try {
        const { data, error } =
          await client
            .from("profiles")
            .select("id")
            .eq(
              "username",
              value
            )
            .limit(1);

        if (error) {
          throw error;
        }

        return !(
          Array.isArray(data) &&
          data.length > 0
        );
      } catch (error) {
        console.warn(
          "[PasTele Auth] Username availability check error:",
          error
        );

        /*
         * Jangan menganggap username sudah tersedia
         * jika database tidak bisa diperiksa.
         */

        return true;
      }
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

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          cleanEmail
        )
      ) {
        throw new Error(
          "Masukkan alamat Gmail yang valid."
        );
      }

      const redirectTo =
        new URL(
          "/reset-password.html",
          window.location.origin
        ).href;

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
      if (!user) {
        return true;
      }

      const client = assertSupabase();

      try {
        const { data, error } =
          await client
            .from("profiles")
            .select(
              "status,is_banned"
            )
            .eq(
              "id",
              user.id
            )
            .maybeSingle();

        if (error || !data) {
          return true;
        }

        if (
          data.is_banned === true
        ) {
          await client.auth.signOut();

          throw new Error(
            "Akun kamu telah diblokir."
          );
        }

        if (
          data.status &&
          [
            "banned",
            "blocked",
            "disabled",
            "suspended"
          ].includes(
            String(data.status)
              .toLowerCase()
          )
        ) {
          await client.auth.signOut();

          throw new Error(
            "Akun kamu sedang dinonaktifkan."
          );
        }

        return true;

      } catch (error) {

        if (
          String(error?.message || "")
            .toLowerCase()
            .includes("diblokir")
        ) {
          throw error;
        }

        if (
          String(error?.message || "")
            .toLowerCase()
            .includes("dinonaktifkan")
        ) {
          throw error;
        }

        /*
         * Jangan membuat login gagal hanya karena
         * tabel profiles/RLS belum tersedia.
         */

        console.warn(
          "[PasTele Auth] Status profile tidak dapat diperiksa:",
          error
        );

        return true;
      }
    },

    /* =====================================================
       AUTH STATE LISTENER
       ===================================================== */

    onAuthStateChange(callback) {
      const client = assertSupabase();

      if (
        typeof callback !==
        "function"
      ) {
        throw new Error(
          "Callback auth harus berupa function."
        );
      }

      return client.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
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
       REDIRECT HELPER
       ===================================================== */

    redirectToDashboard() {
      window.location.replace(
        getDashboardUrl()
      );
    },

    /* =====================================================
       DEBUG
       ===================================================== */

    isReady() {
      return Boolean(
        window.sb &&
        window.sb.auth
      );
    }
  };

  /* =======================================================
     EXPORT GLOBAL
     ======================================================= */

  window.Auth = Auth;

  /*
   * Alias supaya kompatibel dengan kode lama.
   */

  window.PasTeleAuth = Auth;

  console.log(
    "[PasTele Auth] Auth Core loaded successfully.",
    {
      supabase: Boolean(
        window.sb
      ),
      google: typeof Auth.google === "function",
      login: typeof Auth.login === "function",
      register: typeof Auth.register === "function",
      lookup: typeof Auth.lookup === "function"
    }
  );

})();
