import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const url = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const cleanUsername = (v: unknown) =>
  String(v ?? "").trim().replace(/^@+/, "").toLowerCase();

const validUsername = (v: string) => /^[a-z0-9_]{3,32}$/.test(v);
const validGmail = (v: string) => /^[^@\s]+@gmail\.com$/i.test(v);
const strongEnough = (v: string) => v.length >= 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  if (!url || !serviceKey) {
    return json({ error: "Supabase server configuration belum lengkap." }, 500);
  }

  try {
    const body = await req.json();
    const username = cleanUsername(body.username);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!validUsername(username))
      return json({ error: "Username 3-32 karakter: huruf, angka, underscore." }, 400);
    if (!validGmail(email))
      return json({ error: "Gunakan alamat Gmail yang valid." }, 400);
    if (!strongEnough(password))
      return json({ error: "Kata sandi minimal 6 karakter." }, 400);

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: usernameRow, error: usernameLookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (usernameLookupError) {
      console.error(usernameLookupError);
      return json({ error: "Gagal memeriksa username." }, 500);
    }
    if (usernameRow) return json({ error: "Username sudah digunakan." }, 409);
    // email_confirm=true intentionally disables the Gmail verification step.
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name: username }
    });

    if (created.error || !created.data.user) {
      const msg = created.error?.message || "Gagal membuat akun.";
      if (/already|registered|exists|duplicate/i.test(msg)) return json({ error: "Gmail sudah terdaftar." }, 409);
      return json({ error: msg }, 400);
    }

    const user = created.data.user;

    const profile = await admin.from("profiles").upsert({
      id: user.id,
      username,
      display_name: username,
      last_login_at: new Date().toISOString()
    }, { onConflict: "id" });

    if (profile.error) {
      await admin.auth.admin.deleteUser(user.id);
      return json({ error: "Profil akun gagal dibuat: " + profile.error.message }, 500);
    }

    return json({ ok: true, user: { id: user.id, email: user.email, username } });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Internal server error." }, 500);
  }
});
