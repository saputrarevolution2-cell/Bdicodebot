import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  (() => {
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      return keys.default;
    } catch {
      return undefined;
    }
  })();
const admin = createClient(url, serviceKey!);

const emailFor = (username: string) => `${username.toLowerCase()}@telecod.local`;
const json = (body: unknown, status=200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return json({error:"Method not allowed"},405);

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const username = String(body.username || "").trim().replace(/^@+/,"").toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.telegram_number || "").trim();

    if (!/^[a-z0-9_]{3,32}$/.test(username)) return json({error:"Username Telegram tidak valid."},400);
    if (password.length < 6) return json({error:"Kata sandi minimal 6 karakter."},400);

    if (action === "register") {
      if (!body.terms_accepted) return json({error:"Ketentuan & Kebijakan wajib disetujui."},400);

      const { data: existing } = await admin.from("profiles")
        .select("id").eq("username", username).maybeSingle();
      if (existing) return json({error:"Username Telegram sudah digunakan."},409);

      const { data: created, error } = await admin.auth.admin.createUser({
        email: emailFor(username),
        password,
        email_confirm: true,
        user_metadata: {
          username,
          telegram_username: username,
          telegram_number: phone,
          terms_accepted: true,
        },
      });
      if (error) return json({error:error.message},400);

      await admin.from("profiles").upsert({
        id: created.user.id,
        username,
        telegram_username: username,
        telegram_number: phone,
        terms_accepted_at: new Date().toISOString(),
      }, {onConflict:"id"});

      return json({ok:true,email:emailFor(username)});
    }

    return json({error:"Unknown action"},400);
  } catch (e) {
    console.error(e);
    return json({error:"Internal server error"},500);
  }
});