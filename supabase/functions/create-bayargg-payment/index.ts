import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });
const env = (name: string) => {
  const v = Deno.env.get(name)?.trim();
  if (!v) throw new Error(`${name} belum diset di Supabase Edge Function Secrets.`);
  return v;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  try {
    const supabaseUrl = env("SUPABASE_URL");
    const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = env("BAYARGG_API_KEY");
    const paymentUrl = env("BAYARGG_PAYMENT_URL");
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ success: false, error: "Sesi login tidak ditemukan." }, 401);

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return json({ success: false, error: "Sesi login tidak valid atau sudah kedaluwarsa." }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.order_id || "").trim();
    if (!orderId) return json({ success: false, error: "order_id wajib diisi." }, 400);

    const { data: order, error: orderError } = await admin.from("orders")
      .select("id,buyer_id,amount,status,item_title,item_type,payment_reference")
      .eq("id", orderId).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return json({ success: false, error: "Order tidak ditemukan." }, 404);
    if (String(order.buyer_id) !== String(auth.user.id)) return json({ success: false, error: "Order bukan milik akun ini." }, 403);

    const current = String(order.status || "").toLowerCase();
    if (["paid", "success", "completed"].includes(current)) {
      return json({ success: true, already_paid: true, order_id: order.id, invoice_id: order.payment_reference, status: "paid" });
    }

    const amount = Math.round(Number(order.amount || 0));
    if (!Number.isFinite(amount) || amount < 5000) return json({ success: false, error: "Nominal pembayaran minimal Rp5.000." }, 400);

    const existingInvoice = String(order.payment_reference || "").trim();
    const reference = existingInvoice || `PASTELE-${String(order.id).replace(/-/g, "").slice(0, 20)}`;

    const response = await fetch("https://api.bayar.gg/api/create-payment.php", {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        amount,
        description: String(order.item_title || "Pembayaran PasTele").slice(0, 180),
        payment_url: paymentUrl,
        payment_method: "qris",
        order_id: reference,
      }),
    });

    const raw = await response.text();
    let data: any = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
    if (!response.ok || data?.success === false) {
      console.error("Bayar.gg create failed", response.status, data);
      return json({ success: false, error: data?.message || data?.error || `Bayar.gg gagal membuat pembayaran (HTTP ${response.status}).` }, 502);
    }

    const d = data?.data || data;
    const invoiceId = String(d?.invoice_id || reference).trim();
    const qrisString = String(d?.qris_string || "").trim();
    const checkout = String(d?.payment_url || "").trim();
    if (!invoiceId) return json({ success: false, error: "Bayar.gg tidak mengembalikan invoice_id." }, 502);
    if (!qrisString && !checkout) return json({ success: false, error: "Bayar.gg tidak mengembalikan QRIS atau payment URL." }, 502);

    const { error: updateError } = await admin.from("orders").update({ payment_reference: invoiceId }).eq("id", order.id);
    if (updateError) throw updateError;

    return json({
      success: true,
      order_id: order.id,
      invoice_id: invoiceId,
      amount: Number(d?.final_amount ?? d?.amount ?? amount),
      final_amount: Number(d?.final_amount ?? d?.amount ?? amount),
      qris_string: qrisString || null,
      payment_url: checkout || null,
      expires_at: d?.expires_at ?? null,
      status: String(d?.status || "pending").toLowerCase(),
      provider: "BAYAR.GG",
      payment_method: d?.payment_method || "qris",
    });
  } catch (e) {
    console.error("create-bayargg-payment", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Internal server error." }, 500);
  }
});
