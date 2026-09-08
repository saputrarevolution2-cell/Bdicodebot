import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: CORS,
  });
const env = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(
      `${name} belum diset di Supabase Edge Function Secrets.`,
    );
  }
  return value;
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return json(
      {
        success: false,
        error: "Method not allowed.",
      },
      405,
    );
  }
  try {
    // ==========================================================
    // ENV
    // ==========================================================
    const supabaseUrl = env("SUPABASE_URL");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const bayarGgApiKey = env("BAYARGG_API_KEY");
    const bayarGgPaymentUrl = env("BAYARGG_PAYMENT_URL");
    // ==========================================================
    // AUTH
    // ==========================================================
    const authorization =
      req.headers.get("Authorization") ||
      req.headers.get("authorization") ||
      "";
    const accessToken = authorization
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!accessToken) {
      return json(
        {
          success: false,
          error: "Sesi login tidak ditemukan.",
        },
        401,
      );
    }
    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    const {
      data: authData,
      error: authError,
    } = await admin.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return json(
        {
          success: false,
          error:
            "Sesi login tidak valid atau sudah kedaluwarsa.",
        },
        401,
      );
    }
    const userId = authData.user.id;
    // ==========================================================
    // BODY
    // ==========================================================
    const body = await req.json().catch(() => ({}));
    const orderId = String(
      body?.order_id || "",
    ).trim();
    if (!orderId) {
      return json(
        {
          success: false,
          error: "order_id wajib diisi.",
        },
        400,
      );
    }
    // ==========================================================
    // LOAD ORDER
    //
    // Sesuai SQL:
    // orders.id
    // orders.buyer_id
    // orders.amount
    // orders.status
    // orders.item_title
    // orders.item_type
    // orders.payment_reference
    // ==========================================================
    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .select(
        "id,buyer_id,amount,status,item_title,item_type,payment_reference",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) {
      throw orderError;
    }
    if (!order) {
      return json(
        {
          success: false,
          error: "Order tidak ditemukan.",
        },
        404,
      );
    }
    // ==========================================================
    // OWNERSHIP
    // ==========================================================
    if (String(order.buyer_id) !== String(userId)) {
      return json(
        {
          success: false,
          error: "Order bukan milik akun ini.",
        },
        403,
      );
    }
    // ==========================================================
    // DATABASE STATUS IS AUTHORITATIVE
    // ==========================================================
    const currentStatus = String(
      order.status || "",
    ).toLowerCase();
    if (
      ["paid", "success", "completed", "settled"].includes(
        currentStatus,
      )
    ) {
      return json({
        success: true,
        already_paid: true,
        order_id: order.id,
        invoice_id: order.payment_reference || null,
        status: "paid",
      });
    }
    // Jangan membuat invoice baru untuk order yang sudah
    // dibatalkan/expired oleh sistem.
    if (
      ["cancelled", "canceled", "expired"].includes(
        currentStatus,
      )
    ) {
      return json(
        {
          success: false,
          error: "Order sudah tidak dapat dibayar.",
          status: currentStatus,
        },
        409,
      );
    }
    // ==========================================================
    // AMOUNT
    // ==========================================================
    const amount = Math.round(
      Number(order.amount || 0),
    );
    if (!Number.isFinite(amount)) {
      return json(
        {
          success: false,
          error: "Nominal order tidak valid.",
        },
        400,
      );
    }
    // BAYAR GG QRIS Admin:
    // minimum Rp5.000
    // maximum Rp250.000
    if (amount < 5000) {
      return json(
        {
          success: false,
          error: "Nominal pembayaran minimal Rp5.000.",
        },
        400,
      );
    }
    if (amount > 250000) {
      return json(
        {
          success: false,
          error:
            "Nominal QRIS BAYAR GG maksimal Rp250.000.",
        },
        400,
      );
    }
    // ==========================================================
    // EXISTING INVOICE
    //
    // Kalau invoice sudah pernah dibuat, jangan membuat
    // invoice BAYAR GG kedua.
    // ==========================================================
    const existingInvoice = String(
      order.payment_reference || "",
    ).trim();
    if (existingInvoice) {
      return json({
        success: true,
        reused_invoice: true,
        order_id: order.id,
        invoice_id: existingInvoice,
        status: "pending",
        provider: "BAYAR.GG",
        payment_method: "qris",
      });
    }
    // ==========================================================
    // DESCRIPTION
    // ==========================================================
    const description = String(
      order.item_title ||
        "Pembayaran PasTele",
    )
      .replace(/\s+/g, " ")
      .slice(0, 180);
    // ==========================================================
    // CREATE BAYAR GG PAYMENT
    // ==========================================================
    const gatewayResponse = await fetch(
      "https://www.bayar.gg/api/create-payment.php",
      {
        method: "POST",
        headers: {
          "X-API-Key": bayarGgApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          amount,
          description,
          payment_url: bayarGgPaymentUrl,
          payment_method: "qris",
        }),
      },
    );
    const raw = await gatewayResponse.text();
    let gatewayData: any = {};
    try {
      gatewayData = raw
        ? JSON.parse(raw)
        : {};
    } catch {
      gatewayData = {
        raw,
      };
    }
    if (
      !gatewayResponse.ok ||
      gatewayData?.success === false
    ) {
      console.error(
        "BAYAR.GG create payment failed:",
        gatewayResponse.status,
        gatewayData,
      );
      return json(
        {
          success: false,
          error:
            gatewayData?.message ||
            gatewayData?.error ||
            `BAYAR.GG gagal membuat pembayaran (HTTP ${gatewayResponse.status}).`,
        },
        502,
      );
    }
    // ==========================================================
    // NORMALIZE RESPONSE
    // ==========================================================
    const data =
      gatewayData?.data ||
      gatewayData?.payment ||
      gatewayData;
    const invoiceId = String(
      data?.invoice_id || "",
    ).trim();
    const qrisString = String(
      data?.qris_string || "",
    ).trim();
    const checkoutUrl = String(
      data?.payment_url || "",
    ).trim();
    if (!invoiceId) {
      return json(
        {
          success: false,
          error:
            "BAYAR.GG tidak mengembalikan invoice_id.",
        },
        502,
      );
    }
    if (!qrisString && !checkoutUrl) {
      return json(
        {
          success: false,
          error:
            "BAYAR.GG tidak mengembalikan QRIS atau payment URL.",
        },
        502,
      );
    }
    // ==========================================================
    // SAVE BAYAR GG INVOICE
    //
    // Sesuai SQL:
    // orders.payment_reference
    // ==========================================================
    const {
      error: updateError,
    } = await admin
      .from("orders")
      .update({
        payment_reference: invoiceId,
      })
      .eq("id", order.id)
      .eq("buyer_id", userId)
      .is("payment_reference", null);
    if (updateError) {
      throw updateError;
    }
    // ==========================================================
    // RESPONSE
    // ==========================================================
    const gatewayAmount = Number(
      data?.amount ?? amount,
    );
    const finalAmount = Number(
      data?.final_amount ??
        data?.amount ??
        amount,
    );
    return json({
      success: true,
      order_id: order.id,
      invoice_id: invoiceId,
      amount: Number.isFinite(gatewayAmount)
        ? gatewayAmount
        : amount,
      final_amount: Number.isFinite(finalAmount)
        ? finalAmount
        : amount,
      qris_string:
        qrisString || null,
      payment_url:
        checkoutUrl || null,
      expires_at:
        data?.expires_at ?? null,
      status: String(
        data?.status || "pending",
      ).toLowerCase(),
      provider: "BAYAR.GG",
      payment_method:
        data?.payment_method || "qris",
    });
  } catch (error) {
    console.error(
      "create-bayargg-payment:",
      error,
    );
    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      500,
    );
  }
});
