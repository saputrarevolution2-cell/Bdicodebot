const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

function env(name: string, required = true) {
  const value = Deno.env.get(name)?.trim() || "";
  if (required && !value) throw new Error(`${name} belum dikonfigurasi.`);
  return value;
}

async function supabaseRpc(
  name: string,
  body: Record<string, unknown>,
  useServiceRole = false,
  userAuthorization = "",
) {
  const base = env("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() || serviceKey;
  const key = useServiceRole ? serviceKey : anonKey;

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  if (!useServiceRole && userAuthorization) {
    headers.Authorization = userAuthorization;
  }

  const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.hint ||
      data?.error ||
      `Supabase RPC ${name} HTTP ${response.status}`,
    );
  }

  return data;
}

async function supabasePatch(
  table: string,
  filter: Record<string, string>,
  patch: Record<string, unknown>,
) {
  const base = env("SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  const qs = Object.entries(filter)
    .map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`)
    .join("&");

  const response = await fetch(`${base}/rest/v1/${table}?${qs}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(`Supabase update ${table} gagal: ${await response.text()}`);
  }
}

async function supabaseSelect(
  table: string,
  query: string,
) {
  const base = env("SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${base}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : []; } catch { data = []; }

  if (!response.ok) throw new Error(`Supabase select ${table} gagal: ${text}`);
  return data;
}

function authHeader(request: Request) {
  return request.headers.get("Authorization") || "";
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function timingSafeEqualHex(a: string, b: string) {
  a = String(a || "").toLowerCase();
  b = String(b || "").toLowerCase();
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacHex(secret: string, raw: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(raw),
  );

  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return json({ success: false, error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const secret = env("CASHI_SECRET_KEY");
    const signature = request.headers.get("x-gateway-signature") || "";

    if (!signature) {
      return json({ success: false, error: "Missing signature" }, 401);
    }

    const raw = await request.text();
    const expected = await hmacHex(secret, raw);

    if (!timingSafeEqualHex(signature, expected)) {
      return json({ success: false, error: "Invalid signature" }, 401);
    }

    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ success: false, error: "Invalid JSON" }, 400);
    }

    const event = String(payload?.event || "").toUpperCase();
    const data = payload?.data || {};
    const status = String(data?.status || "").toUpperCase();

    if (event !== "PAYMENT_SETTLED" || status !== "SETTLED") {
      return json({ success: true, ignored: true });
    }

    const providerId = String(
      data?.order_id ||
      data?.orderId ||
      "",
    ).trim();

    if (!providerId) {
      return json({ success: false, error: "ORDER_ID_REQUIRED" }, 400);
    }

    const rows = await supabaseSelect(
      "orders",
      `payment_reference=eq.${encodeURIComponent(providerId)}&select=id,amount&limit=1`,
    );

    const order = Array.isArray(rows) ? rows[0] : null;
    if (!order?.id) {
      return json({
        success: false,
        error: "ORDER_NOT_FOUND",
        provider_order_id: providerId,
      }, 404);
    }

    const settled = await supabaseRpc(
      "settle_cashi_order",
      {
        p_order_id: order.id,
        p_invoice_id: providerId,
        p_gateway_status: "SETTLED",
        p_final_amount: Number(order.amount || 0),
        p_gateway_payload: payload,
      },
      true,
    );

    return json({
      success: true,
      processed: true,
      order_id: order.id,
      orderId: providerId,
      settled,
    });
  } catch (error) {
    return json({
      success: false,
      error: String((error as Error)?.message || error),
    }, 500);
  }
});
