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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return json({ success: false, error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body?.order_id || "").trim();
    const guestToken = String(body?.guest_token || "").trim();

    if (!orderId) return json({ success: false, error: "ORDER_ID_REQUIRED" }, 400);

    const cashiKey = env("CASHI_API_KEY");
    const cashiBase = (Deno.env.get("CASHI_API_URL")?.trim() || "https://cashi.id/api").replace(/\/$/, "");

    const order = await supabaseRpc(
      "get_order_for_payment",
      {
        p_order_id: orderId,
        p_guest_token: guestToken || null,
      },
      false,
      authHeader(request),
    );

    const providerId = String(order?.payment_reference || "").trim();
    if (!providerId) {
      return json({ success: false, error: "PAYMENT_REFERENCE_NOT_FOUND" }, 400);
    }

    const response = await fetch(
      `${cashiBase}/check-status/${encodeURIComponent(providerId)}`,
      { headers: { "x-api-key": cashiKey } },
    );

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({
        success: false,
        error: data?.message || `Cashi HTTP ${response.status}`,
        raw: data,
      }, 502);
    }

    const status = String(data?.status || "PENDING").toUpperCase();
    const saved = order?.gateway_payload?.create_order || {};

    if (status === "SETTLED") {
      const settled = await supabaseRpc(
        "settle_cashi_order",
        {
          p_order_id: orderId,
          p_invoice_id: providerId,
          p_gateway_status: "SETTLED",
          p_final_amount: Number(order?.amount || 0),
          p_gateway_payload: data,
        },
        true,
      );

      return json({
        success: true,
        status: "SETTLED",
        order_id: orderId,
        orderId: providerId,
        amount: Number(order?.amount || 0),
        checkout_url: data?.checkout_url || saved?.checkout_url || null,
        qrUrl: data?.qrUrl || saved?.qrUrl || null,
        settled,
        raw: data,
      });
    }

    return json({
      success: true,
      status,
      order_id: orderId,
      orderId: providerId,
      amount: Number(order?.amount || 0),
      checkout_url: data?.checkout_url || saved?.checkout_url || null,
      qrUrl: data?.qrUrl || saved?.qrUrl || null,
      provider: data?.provider || saved?.provider || "CASHI",
      fee: data?.fee ?? saved?.fee ?? null,
      expires_at: data?.expires_at ?? saved?.expires_at ?? null,
      raw: data,
    });
  } catch (error) {
    return json({
      success: false,
      error: String((error as Error)?.message || error),
    }, 400);
  }
});
