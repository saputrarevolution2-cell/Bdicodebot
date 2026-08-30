/* =========================================================
   PasTele Authentication — fixed
   ========================================================= */
window.Auth = {
  lookup: async (identifier) => {
    if (!window.sb) throw new Error("Supabase belum dikonfigurasi. Isi js/config.js dengan anon/publishable key.");
    const value = String(identifier || "").trim().toLowerCase();
    if (!value) return null;

    // Always use the public RPC. Direct SELECT on profiles is protected by RLS,
    // so email/username lookup must not depend on an anonymous SELECT policy.
    const { data, error } = await window.sb.rpc("resolve_username_login", { p_username: value });
    if (error) {
      console.error("ACCOUNT LOOKUP ERROR:", error);
      throw error;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.auth_email) return null;
    return { auth_email: String(row.auth_email).trim().toLowerCase() };
  },

  login: async (identifier, password) => {
    if (!window.sb) throw new Error("Supabase belum dikonfigurasi. Isi js/config.js dengan anon/publishable key.");
    if (!String(password || "")) throw new Error("Kata sandi wajib diisi.");

    const found = await Auth.lookup(identifier);
    if (!found?.auth_email) throw new Error("Akun tidak ditemukan.");

    const { data, error } = await window.sb.auth.signInWithPassword({
      email: found.auth_email,
      password: String(password)
    });
    if (error) {
      console.error("SUPABASE LOGIN ERROR:", error);
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        throw new Error("Gmail/username atau kata sandi salah.");
      }
      throw error;
    }
    if (!data?.session) throw new Error("Login belum membuat session. Jika konfirmasi email aktif, konfirmasi email terlebih dahulu.");

    // Profile is created server-side by the auth trigger. Do not block login
    // if profile RLS prevents an extra client-side read.
    return { user: data.user, session: data.session, profile: found };
  },

  register: async (username, email, password) => {
    if (!window.sb) throw new Error("Supabase belum dikonfigurasi. Isi js/config.js dengan anon/publishable key.");
    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");
    if (!/^[a-z0-9_]{3,32}$/.test(cleanUsername)) throw new Error("Username hanya boleh berisi huruf, angka, dan underscore (3–32 karakter).");
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("Email tidak valid.");
    if (cleanPassword.length < 6) throw new Error("Kata sandi minimal 6 karakter.");

    const { data: available, error: availableError } = await window.sb.rpc("username_available", { p_username: cleanUsername });
    if (availableError) {
      console.error("USERNAME CHECK ERROR:", availableError);
      throw availableError;
    }
    if (available !== true) throw new Error("Username sudah digunakan.");

    // The database trigger creates the profile + wallet after auth.users insert.
    // Do NOT upsert profiles from the browser, especially when email confirmation
    // is enabled and no authenticated session exists yet.
    const { data, error } = await window.sb.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: { data: { username: cleanUsername } }
    });
    if (error) {
      console.error("SUPABASE REGISTER ERROR:", error);
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        throw new Error("Email sudah terdaftar.");
      }
      throw error;
    }
    return data;
  },

  google: async () => {
    if (!window.sb) throw new Error("Supabase belum dikonfigurasi. Isi js/config.js dengan anon/publishable key.");
    const {
      error
    } = await window.sb.auth.signInWithOAuth({
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
