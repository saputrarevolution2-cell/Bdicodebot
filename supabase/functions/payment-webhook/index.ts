import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const configuredOrigin = Deno.env.get("APP_ORIGIN") || "*";
const cors = {
  "Access-Control-Allow-Origin": configuredOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map(v => v.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const secret = Deno.env.get("PAYMENT_WEBHOOK_SECRET");
    if (!secret) return json({ error: "PAYMENT_WEBHOOK_SECRET is not configured" }, 500);

    const raw = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const legacySecret = req.headers.get("x-webhook-secret");
    const expected = await hmacHex(secret, raw);
    if (!(signature && timingSafeEqual(signature.replace(/^sha256=/i, ""), expected)) && legacySecret !== secret) {
      return json({ error: "Invalid webhook signature" }, 401);
    }

    const body = JSON.parse(raw);
    const status = String(body.status ?? body.payment_status ?? body.transaction_status ?? "").toLowerCase();
    if (!["paid", "success", "successful", "settled", "completed"].includes(status)) {
      return json({ ok: true, ignored: true, status });
    }

    const orderId = body.order_id || body.merchant_order_id || body.external_id || null;
    const reference = body.reference || body.transaction_id || body.invoice_id || body.payment_id || null;
    if (!orderId && !reference) return json({ error: "order_id or payment reference required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
    let query = admin.from("orders").select("id,amount,status,payment_reference");
    const { data: order, error: orderError } = orderId
      ? await query.eq("id", orderId).maybeSingle()
      : await query.eq("payment_reference", reference).maybeSingle();
    if (orderError || !order) return json({ error: "Order not found" }, 404);

    if (body.amount !== undefined && Number(body.amount) !== Number(order.amount)) return json({ error: "Payment amount mismatch" }, 400);
    if (body.currency && String(body.currency).toUpperCase() !== "IDR") return json({ error: "Unsupported currency" }, 400);

    const { error } = await admin.rpc("complete_paid_order", {
      p_order_id: order.id,
      p_payment_reference: reference || order.payment_reference || null
    });
    if (error) throw error;
    return json({ ok: true, order_id: order.id });
  } catch (e) {
    console.error("PAYMENT WEBHOOK ERROR", e);
    return json({ error: e instanceof Error ? e.message : "Webhook error" }, 500);
  }
});
