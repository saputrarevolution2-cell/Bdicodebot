/* =========================================================
   PasTele Authentication
   ========================================================= */
window.Auth = {
  /* =======================================================
     LOOKUP ACCOUNT
     Bisa menggunakan:
     - Username
     - Gmail / Email
     ======================================================= */
  lookup: async (identifier) => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum dikonfigurasi. Periksa js/config.js."
      );
    }
    const value = String(identifier || "")
      .trim()
      .toLowerCase();
    if (!value) return null;
    /* -----------------------------------------------------
       JIKA INPUT ADALAH EMAIL
       ----------------------------------------------------- */
    if (value.includes("@")) {
      const { data, error } = await sb
        .from("profiles")
        .select(`
          id,
          username,
          display_name,
          auth_email,
          avatar_url,
          status,
          is_banned
        `)
        .eq("auth_email", value)
        .maybeSingle();
      if (error) {
        console.error("LOOKUP EMAIL ERROR:", error);
        throw error;
      }
      return data || null;
    }
    /* -----------------------------------------------------
       JIKA INPUT ADALAH USERNAME
       Gunakan RPC yang sudah kamu buat
       ----------------------------------------------------- */
    const { data, error } = await sb.rpc(
      "resolve_username_login",
      {
        p_username: value
      }
    );
    if (error) {
      console.error("LOOKUP USERNAME ERROR:", error);
      throw error;
    }
    if (Array.isArray(data)) {
      return data[0] || null;
    }
    return data || null;
  },
  /* =======================================================
     LOGIN
     identifier bisa username ATAU Gmail
     ======================================================= */
  login: async (identifier, password) => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum dikonfigurasi. Periksa js/config.js."
      );
    }
    if (!password) {
      throw new Error("Kata sandi wajib diisi.");
    }
    /* -----------------------------------------------------
       CARI AKUN
       ----------------------------------------------------- */
    const found = await Auth.lookup(identifier);
    if (!found || !found.auth_email) {
      throw new Error("Akun tidak ditemukan.");
    }
    const email = String(found.auth_email)
      .trim()
      .toLowerCase();
    /* -----------------------------------------------------
       CEK STATUS AKUN SEBELUM LOGIN
       ----------------------------------------------------- */
    if (
      found.is_banned === true ||
      String(found.status || "").toLowerCase() === "banned"
    ) {
      throw new Error(
        "Akun ini sedang dinonaktifkan oleh admin."
      );
    }
    /* -----------------------------------------------------
       LOGIN SUPABASE
       ----------------------------------------------------- */
    const { data, error } =
      await sb.auth.signInWithPassword({
        email,
        password
      });
    if (error) {
      console.error(
        "SUPABASE LOGIN ERROR:",
        error
      );
      /* Pesan lebih ramah */
      if (
        error.message &&
        error.message.toLowerCase().includes("invalid login")
      ) {
        throw new Error(
          "Gmail atau kata sandi salah."
        );
      }
      throw error;
    }
    /* -----------------------------------------------------
       PASTIKAN SESSION ADA
       ----------------------------------------------------- */
    if (!data || !data.session) {
      throw new Error(
        "Login berhasil tetapi session belum dibuat. " +
        "Periksa konfigurasi Email Confirmation Supabase."
      );
    }
    /* -----------------------------------------------------
       CEK PROFILE TERBARU
       Jangan bergantung pada TC.profile()
       ----------------------------------------------------- */
    try {
      const { data: profile, error: profileError } =
        await sb
          .from("profiles")
          .select(`
            id,
            username,
            display_name,
            auth_email,
            status,
            is_banned
          `)
          .eq("id", data.user.id)
          .maybeSingle();
      if (!profileError && profile) {
        if (
          profile.is_banned === true ||
          String(profile.status || "").toLowerCase() === "banned"
        ) {
          await sb.auth.signOut();
          throw new Error(
            "Akun ini sedang dinonaktifkan oleh admin."
          );
        }
      }
    } catch (profileError) {
      /*
       * Jangan membatalkan login hanya karena
       * pengecekan profile gagal.
       *
       * Session Supabase sudah valid.
       */
      if (
        profileError?.message ===
        "Akun ini sedang dinonaktifkan oleh admin."
      ) {
        throw profileError;
      }
      console.warn(
        "PROFILE CHECK WARNING:",
        profileError
      );
    }
    /* -----------------------------------------------------
       LOGIN BERHASIL
       ----------------------------------------------------- */
    return {
      user: data.user,
      session: data.session,
      profile: found
    };
  },
  /* =======================================================
     REGISTER
     ======================================================= */
  register: async (
    username,
    email,
    password
  ) => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum dikonfigurasi. Periksa js/config.js."
      );
    }
    const cleanUsername =
      String(username || "")
        .trim()
        .toLowerCase();
    const cleanEmail =
      String(email || "")
        .trim()
        .toLowerCase();
    if (!cleanUsername) {
      throw new Error(
        "Username wajib diisi."
      );
    }
    if (!cleanEmail) {
      throw new Error(
        "Gmail wajib diisi."
      );
    }
    if (!password) {
      throw new Error(
        "Kata sandi wajib diisi."
      );
    }
    /* -----------------------------------------------------
       CEK USERNAME
       ----------------------------------------------------- */
    const {
      data: available,
      error: availableError
    } = await sb.rpc(
      "username_available",
      {
        p_username: cleanUsername
      }
    );
    if (availableError) {
      console.error(
        "USERNAME CHECK ERROR:",
        availableError
      );
      throw availableError;
    }
    if (available === false) {
      throw new Error(
        "Username sudah digunakan."
      );
    }
    /* -----------------------------------------------------
       CREATE SUPABASE USER
       ----------------------------------------------------- */
    const {
      data,
      error
    } = await sb.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername
        }
      }
    });
    if (error) {
      throw error;
    }
    /* -----------------------------------------------------
       SIMPAN PROFILE
       ----------------------------------------------------- */
    if (data?.user) {
      const {
        error: profileError
      } = await sb
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            username: cleanUsername,
            auth_email: cleanEmail,
            display_name: cleanUsername
          },
          {
            onConflict: "id"
          }
        );
      if (profileError) {
        console.error(
          "PROFILE CREATE ERROR:",
          profileError
        );
        throw profileError;
      }
    }
    return data;
  },
  /* =======================================================
     GOOGLE LOGIN
     ======================================================= */
  google: async () => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum dikonfigurasi. Periksa js/config.js."
      );
    }
    const {
      error
    } = await sb.auth.signInWithOAuth({
      provider: "google",
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
      throw error;
    }
  },
  /* =======================================================
     LOGOUT
     ======================================================= */
  logout: async () => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum dikonfigurasi."
      );
    }
    const { error } =
      await sb.auth.signOut();
    if (error) {
      throw error;
    }
    location.replace("login.html");
  },
  /* =======================================================
     GET SESSION
     ======================================================= */
  session: async () => {
    if (!window.sb) return null;
    const {
      data,
      error
    } = await sb.auth.getSession();
    if (error) {
      console.error(
        "GET SESSION ERROR:",
        error
      );
      return null;
    }
    return data?.session || null;
  },
  /* =======================================================
     GET CURRENT USER
     ======================================================= */
  user: async () => {
    if (!window.sb) return null;
    const {
      data,
      error
    } = await sb.auth.getUser();
    if (error) {
      console.error(
        "GET USER ERROR:",
        error
      );
      return null;
    }
    return data?.user || null;
  }
};
