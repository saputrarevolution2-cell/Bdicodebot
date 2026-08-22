import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SITE_URL = (Deno.env.get("TELECOD_SITE_URL") || "").replace(/\/+$/, "");

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not configured");
}

if (!SERVICE_ROLE_KEY) {
  throw new Error("SERVICE_ROLE_KEY is not configured");
}

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not configured");
}

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        ...extraHeaders,
      },
    },
  );
}

/**
 * Telegram Login Widget verification
 *
 * secret_key = SHA256(bot_token)
 * data_check_string = sorted key=value pairs except hash
 * hash = HMAC-SHA256(data_check_string, secret_key)
 */
async function verifyTelegram(
  data: Record<string, string>,
): Promise<boolean> {
  const receivedHash = data.hash;

  if (!receivedHash) {
    return false;
  }

  const checkString = Object.entries(data)
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const encoder = new TextEncoder();

  const secretKeyBytes = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(BOT_TOKEN!),
  );

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    secretKeyBytes,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    encoder.encode(checkString),
  );

  const calculatedHash = Array.from(
    new Uint8Array(signature),
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  if (calculatedHash !== receivedHash) {
    return false;
  }

  const authDate = Number(data.auth_date || 0);

  if (!authDate) {
    return false;
  }

  const age = Math.floor(Date.now() / 1000) - authDate;

  // Reject invalid/future/stale authorization data.
  if (age < -60 || age > 86400) {
    return false;
  }

  return true;
}

function telegramEmail(telegramId: string) {
  return `telegram_${telegramId}@telecod.local`;
}

async function findProfile(telegramId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    console.error("findProfile:", error);
    throw error;
  }

  return data || null;
}

async function getAuthUser(userId: string) {
  const { data, error } =
    await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  return data.user;
}

async function createTelegramUser(
  telegramId: string,
  username: string,
  firstName: string,
  lastName: string,
) {
  const email = telegramEmail(telegramId);

  const password =
    `${crypto.randomUUID()}Aa9!${crypto.randomUUID()}`;

  const { data, error } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        telegram_id: telegramId,
        telegram_username: username || null,
        username: username || `tg_${telegramId}`,
        first_name: firstName,
        last_name: lastName,
        terms_accepted: true,
      },
    });

  if (error) {
    throw error;
  }

  return data.user;
}

async function generateMagicLink(
  email: string,
) {
  if (!SITE_URL) {
    throw new Error("TELECOD_SITE_URL is not configured");
  }

  const redirectTo = SITE_URL;

  const { data, error } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo,
      },
    });

  if (error) {
    throw error;
  }

  return data.properties.action_link;
}

async function generateRecoveryLink(
  email: string,
) {
  if (!SITE_URL) {
    throw new Error("TELECOD_SITE_URL is not configured");
  }

  const { data, error } =
    await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${SITE_URL}/reset.html`,
      },
    });

  if (error) {
    throw error;
  }

  return data.properties.action_link;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "METHOD_NOT_ALLOWED",
        },
        405,
      );
    }

    const url = new URL(req.url);

    let params = new URLSearchParams(
      url.searchParams,
    );

    // Support POST form/json as well.
    if (req.method === "POST") {
      const contentType =
        req.headers.get("content-type") || "";

      try {
        if (
          contentType.includes(
            "application/json",
          )
        ) {
          const body = await req.json();

          for (const [key, value] of Object.entries(body)) {
            if (value !== undefined && value !== null) {
              params.set(key, String(value));
            }
          }
        } else if (
          contentType.includes(
            "application/x-www-form-urlencoded",
          )
        ) {
          const body = await req.text();
          const form = new URLSearchParams(body);

          for (const [key, value] of form.entries()) {
            params.set(key, value);
          }
        }
      } catch (error) {
        console.error("POST body parse error:", error);
      }
    }

    const data: Record<string, string> =
      Object.fromEntries(params.entries());

    const mode =
      (data.mode || "login").toLowerCase();

    console.log(
      "Telegram auth request:",
      {
        mode,
        telegram_id: data.id || null,
        username: data.username || null,
      },
    );

    // Health check.
    // Visiting /telegram-login without Telegram data
    // should NOT return "function not found".
    if (!data.id && !data.hash) {
      return jsonResponse({
        success: true,
        function: "telegram-login",
        status: "online",
      });
    }

    const valid = await verifyTelegram(data);

    if (!valid) {
      return jsonResponse(
        {
          success: false,
          error: "INVALID_TELEGRAM_AUTH",
          message:
            "Telegram authorization tidak valid atau sudah kedaluwarsa.",
        },
        401,
      );
    }

    const telegramId = String(data.id);

    const username = (data.username || "")
      .replace(/^@+/, "")
      .trim()
      .toLowerCase();

    const firstName =
      (data.first_name || "").trim();

    const lastName =
      (data.last_name || "").trim();

    const displayName =
      [firstName, lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      username ||
      `Telegram ${telegramId}`;

    let profile = await findProfile(
      telegramId,
    );

    let user = null;

    /**
     * Existing Telegram account.
     */
    if (profile?.id) {
      if (profile.is_banned === true) {
        return jsonResponse(
          {
            success: false,
            error: "ACCOUNT_BANNED",
            message:
              "Akun Telegram ini diblokir oleh administrator.",
          },
          403,
        );
      }

      user = await getAuthUser(
        String(profile.id),
      );
    }

    /**
     * New Telegram account.
     */
    if (!user) {
      if (username) {
        const { data: usernameTaken, error } =
          await supabase
            .from("profiles")
            .select("id,telegram_id")
            .eq("username", username)
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (
          usernameTaken?.id &&
          String(usernameTaken.telegram_id || "") !==
            telegramId
        ) {
          return jsonResponse(
            {
              success: false,
              error: "USERNAME_TAKEN",
              message:
                "Username Telegram sudah digunakan.",
            },
            409,
          );
        }
      }

      user = await createTelegramUser(
        telegramId,
        username,
        firstName,
        lastName,
      );
    }

    if (!user?.id || !user.email) {
      return jsonResponse(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message:
            "Telegram account tidak berhasil terhubung ke TeleCod.",
        },
        400,
      );
    }

    const now =
      new Date().toISOString();

    /**
     * Create/update profile.
     */
    const profilePayload = {
      id: user.id,
      username:
        profile?.username ||
        username ||
        `tg_${telegramId}`,
      telegram_id: telegramId,
      telegram_username:
        username ||
        profile?.telegram_username ||
        null,
      display_name: displayName,
      terms_accepted_at:
        profile?.terms_accepted_at ||
        now,
      last_login_at: now,
    };

    const { error: profileError } =
      await supabase
        .from("profiles")
        .upsert(
          profilePayload,
          {
            onConflict: "id",
          },
        );

    if (profileError) {
      console.error(
        "Profile upsert error:",
        profileError,
      );
      throw profileError;
    }

    /**
     * Recovery mode.
     */
    if (mode === "recovery") {
      const actionLink =
        await generateRecoveryLink(
          user.email,
        );

      return Response.redirect(
        actionLink,
        302,
      );
    }

    /**
     * Normal login.
     */
    const actionLink =
      await generateMagicLink(
        user.email,
      );

    return Response.redirect(
      actionLink,
      302,
    );
  } catch (error) {
    console.error(
      "TELEGRAM LOGIN ERROR:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error: "TELEGRAM_AUTH_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Telegram authentication failed.",
      },
      500,
    );
  }
});
