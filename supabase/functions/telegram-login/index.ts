import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY") ||
  (() => {
    try {
      return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
    } catch {
      return undefined;
    }
  })();

const botToken =
  Deno.env.get("TELEGRAM_BOT_TOKEN") ||
  Deno.env.get("TELEGRAM_BOT_TOKEN_VALUE") ||
  "";

const siteUrl = (Deno.env.get("TELECOD_SITE_URL") || "").replace(/\/$/, "");
const MASTER_ADMIN_ID = String(Deno.env.get("ADMIN_TELEGRAM_ID") || "6665664367").replace(/\D/g, "");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" },
  });
}

function clean(v: unknown) {
  return String(v ?? "").trim().replace(/^@+/, "").toLowerCase();
}

function safeRedirect(value: string) {
  if (!value) return siteUrl;
  try {
    const target = new URL(value);
    const allowed = siteUrl ? new URL(siteUrl) : null;
    if (!allowed) return siteUrl;
    if (target.origin !== allowed.origin) return siteUrl;
    return target.toString();
  } catch {
    return siteUrl;
  }
}

function constantTimeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(keyBytes: ArrayBuffer, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Telegram Login Widget verification.
 * Only Telegram fields are included in the data-check-string.
 * Our own mode/redirect parameters are deliberately excluded.
 */
async function verifyTelegram(data: Record<string, string>) {
  if (!botToken) return { ok: false, reason: "BOT_TOKEN_NOT_CONFIGURED" };

  const received = String(data.hash || "").toLowerCase();
  const authDate = Number(data.auth_date || 0);
  const id = String(data.id || "");

  if (!received || !id || !authDate) return { ok: false, reason: "MISSING_TELEGRAM_FIELDS" };
  if (!/^[a-f0-9]{64}$/.test(received)) return { ok: false, reason: "INVALID_HASH_FORMAT" };

  const checkString = Object.entries(data)
    .filter(([key, value]) =>
      key !== "hash" &&
      key !== "mode" &&
      key !== "redirect" &&
      value !== undefined &&
      value !== null &&
      value !== ""
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(botToken));
  const calculated = await hmacSha256Hex(secret, checkString);

  if (!constantTimeEqual(calculated, received)) {
    return { ok: false, reason: "HASH_MISMATCH" };
  }

  const now = Math.floor(Date.now() / 1000);
  const age = now - authDate;

  // Telegram auth data is accepted for 24 hours. Future timestamps are rejected.
  if (age < 0 || age > 86400) return { ok: false, reason: "AUTH_EXPIRED" };

  return { ok: true, reason: "OK" };
}

async function readInput(req: Request) {
  const url = new URL(req.url);
  const data: Record<string, string> = Object.fromEntries(url.searchParams.entries());

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        const body = await req.json();
        for (const [key, value] of Object.entries(body || {})) {
          if (value !== undefined && value !== null) data[key] = String(value);
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await req.text();
        for (const [key, value] of new URLSearchParams(body).entries()) data[key] = value;
      }
    } catch {
      // Keep query parameters if POST body is malformed.
    }
  }

  return data;
}

async function authenticate(data: Record<string, string>) {
  if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY_NOT_CONFIGURED");

  const verification = await verifyTelegram(data);
  if (!verification.ok) {
    return json({
      success: false,
      error: "INVALID_TELEGRAM_AUTH",
      message: "Telegram authorization tidak valid atau sudah kedaluwarsa.",
      reason: verification.reason,
    }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const mode = String(data.mode || "login").toLowerCase();
  const tgId = String(data.id);
  const tgUsername = clean(data.username);
  const first = String(data.first_name || "").trim();
  const last = String(data.last_name || "").trim();
  const display = [first, last].filter(Boolean).join(" ") || tgUsername || `Telegram ${tgId}`;

  let profile = (await admin.from("profiles").select("*").eq("telegram_id", tgId).maybeSingle()).data;

  if (!profile && tgUsername) {
    profile = (await admin.from("profiles").select("*").eq("telegram_username", tgUsername).maybeSingle()).data;
    if (profile) {
      const updated = await admin.from("profiles").update({ telegram_id: tgId }).eq("id", profile.id);
      if (updated.error) throw updated.error;
      profile.telegram_id = tgId;
    }
  }

  if (mode === "admin") {
    if (tgId !== MASTER_ADMIN_ID) return text("Telegram account is not the master administrator.", 403);
    if (profile?.is_banned) return text("Administrator is blocked.", 403);
  }

  // Recovery currently uses the same verified Telegram identity and then signs in.
  // Login requires an existing profile; register creates a new one.
  if (!profile && mode === "login") {
    return text("Akun TeleCod belum dibuat. Silakan Register dengan Telegram terlebih dahulu.", 404);
  }

  if (!profile && mode === "recovery") {
    return text("Akun Telegram belum terhubung ke akun TeleCod.", 404);
  }

  let userId = profile?.id;

  if (!profile) {
    const baseUsername = tgUsername || `tg_${tgId}`;
    const taken = await admin.from("profiles").select("id").eq("username", baseUsername).maybeSingle();
    const username = taken.data ? `tg_${tgId}` : baseUsername;
    const email = `telegram_${tgId}@telecod.local`;
    const randomPassword = `${crypto.randomUUID()}Aa9!`;

    const created = await admin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        username,
        telegram_id: tgId,
        telegram_username: tgUsername,
        first_name: first,
        last_name: last,
        terms_accepted: true,
      },
    });

    if (created.error) throw created.error;
    userId = created.data.user.id;

    const inserted = await admin.from("profiles").upsert({
      id: userId,
      username,
      telegram_id: tgId,
      telegram_username: tgUsername || null,
      display_name: display,
      terms_accepted_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      is_admin: tgId === MASTER_ADMIN_ID,
    }, { onConflict: "id" });

    if (inserted.error) throw inserted.error;
  } else {
    if (profile.is_banned) return text("This Telegram account is blocked by an administrator.", 403);

    const updated = await admin.from("profiles").update({
      telegram_username: tgUsername || profile.telegram_username,
      display_name: display,
      last_login_at: new Date().toISOString(),
      is_admin: tgId === MASTER_ADMIN_ID ? true : profile.is_admin,
    }).eq("id", profile.id);

    if (updated.error) throw updated.error;
  }

  const user = await admin.auth.admin.getUserById(userId!);
  if (user.error) throw user.error;

  if (!user.data.user.email) throw new Error("USER_EMAIL_NOT_FOUND");

  const redirectTo = safeRedirect(data.redirect || siteUrl);
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.data.user.email,
    options: { redirectTo },
  });

  if (link.error) throw link.error;

  return Response.redirect(link.data.properties.action_link, 302);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const data = await readInput(req);
    return await authenticate(data);
  } catch (error) {
    console.error("telegram-login error", error);
    return json({
      success: false,
      error: "TELEGRAM_AUTH_SERVER_ERROR",
      message: "Telegram authentication failed on the server.",
    }, 500);
  }
});
