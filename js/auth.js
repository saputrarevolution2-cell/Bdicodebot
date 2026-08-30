/* =========================================================
   PasTele Authentication — production fixed
   ========================================================= */
(() => {
  "use strict";

  const requireClient = () => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum terkonfigurasi. Pastikan js/config.js berisi Project URL dan anon/publishable key."
      );
    }
    return window.sb;
  };

  const normalize = value => String(value ?? "").trim().toLowerCase();

  const authError = error => {
    const msg = String(error?.message || error || "").trim();
    const low = msg.toLowerCase();

    if (low.includes("invalid login credentials") ||
        low.includes("invalid credentials") ||
        low.includes("invalid login")) {
      return new Error("Username/Gmail atau kata sandi salah.");
    }
    if (low.includes("email not confirmed")) {
      return new Error("Email belum dikonfirmasi. Cek inbox Gmail kamu terlebih dahulu.");
    }
    if (low.includes("user already registered") ||
        low.includes("already registered") ||
        low.includes("already been registered")) {
      return new Error("Email sudah terdaftar.");
    }
    if (low.includes("password should be at least")) {
      return new Error("Kata sandi terlalu pendek.");
    }
    return error instanceof Error ? error : new Error(msg || "Autentikasi gagal.");
  };

  window.Auth = {
    lookup: async identifier => {
      const sb = requireClient();
      const value = normalize(identifier);
      if (!value) return null;

      const { data, error } = await sb.rpc(
        "resolve_username_login",
        { p_username: value }
      );

      if (error) {
        console.error("ACCOUNT LOOKUP ERROR:", error);
        throw authError(error);
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.auth_email) return null;

      return {
        auth_email: normalize(row.auth_email),
        is_banned: row.is_banned === true
      };
    },

    login: async (identifier, password) => {
      const sb = requireClient();
      const raw = String(identifier ?? "").trim();
      const pass = String(password ?? "");

      if (!pass) throw new Error("Kata sandi wajib diisi.");

      let email;

      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        email = normalize(raw);
      } else {
        const found = await window.Auth.lookup(raw);
        if (!found?.auth_email) {
          throw new Error("Akun tidak ditemukan.");
        }
        if (found.is_banned) {
          throw new Error("Akun ini sedang diblokir.");
        }
        email = found.auth_email;
      }

      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) {
        console.error("SUPABASE LOGIN ERROR:", error);
        throw authError(error);
      }

      if (!data?.session || !data?.user) {
        throw new Error(
          "Login belum membuat session. Jika konfirmasi email aktif, konfirmasi email terlebih dahulu."
        );
      }

      // Confirm the session is actually persisted before the UI redirects.
      const sessionCheck = await sb.auth.getSession();
      if (!sessionCheck.data?.session) {
        throw new Error(
          "Login berhasil tetapi session tidak tersimpan. Periksa konfigurasi Auth/Site URL Supabase."
        );
      }

      return {
        user: data.user,
        session: sessionCheck.data.session
      };
    },

    register: async (username, email, password) => {
      const sb = requireClient();
      const cleanUsername = normalize(username);
      const cleanEmail = normalize(email);
      const cleanPassword = String(password ?? "");

      if (!/^[a-z0-9_]{3,32}$/.test(cleanUsername)) {
        throw new Error(
          "Username hanya boleh berisi huruf, angka, dan underscore (3–32 karakter)."
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new Error("Email tidak valid.");
      }
      if (cleanPassword.length < 6) {
        throw new Error("Kata sandi minimal 6 karakter.");
      }

      const { data: available, error: availableError } =
        await sb.rpc("username_available", {
          p_username: cleanUsername
        });

      if (availableError) {
        console.error("USERNAME CHECK ERROR:", availableError);
        throw authError(availableError);
      }

      if (available !== true) {
        throw new Error("Username sudah digunakan.");
      }

      const { data, error } = await sb.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: { username: cleanUsername }
        }
      });

      if (error) {
        console.error("SUPABASE REGISTER ERROR:", error);
        throw authError(error);
      }

      return data;
    },

    google: async () => {
      const sb = requireClient();

      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth-callback.html`
        }
      });

      if (error) {
        console.error("GOOGLE LOGIN ERROR:", error);
        throw authError(error);
      }
    },

    logout: async () => {
      const sb = requireClient();
      const { error } = await sb.auth.signOut();
      if (error) throw authError(error);
      location.replace("login.html");
    },

    session: async () => {
      if (!window.sb) return null;
      const { data, error } = await window.sb.auth.getSession();
      if (error) {
        console.error("GET SESSION ERROR:", error);
        return null;
      }
      return data?.session || null;
    },

    user: async () => {
      if (!window.sb) return null;
      const { data, error } = await window.sb.auth.getUser();
      if (error) return null;
      return data?.user || null;
    }
  };
})();
