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
const normalizeStatus = (value: unknown) =>
  String(value || "pending")
    .trim()
    .toLowerCase();
const isPaidStatus = (status: string) =>
  ["paid", "settled", "success", "completed"].includes(status);
const isFinalOrderStatus = (status: string) =>
  ["paid", "settled", "success", "completed"].includes(status);
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: CORS,
    });
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
    // SESUAI SQL MASTER:
    //
    // orders.id
    // orders.buyer_id
    // orders.amount
    // orders.status
    // orders.payment_reference
    // orders.item_type
    // orders.item_title
    // ==========================================================
    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .select(
        "id,buyer_id,amount,status,payment_reference,item_type,item_title",
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
    // DATABASE IS AUTHORITATIVE
    // ==========================================================
    const databaseStatus = normalizeStatus(
      order.status,
    );
    if (isFinalOrderStatus(databaseStatus)) {
      return json({
        success: true,
        already_paid: true,
        settled: true,
        order_id: order.id,
        invoice_id:
          order.payment_reference || null,
        status: "paid",
        item_type:
          order.item_type || null,
      });
    }
    // Jangan mengecek gateway lagi untuk order
    // yang sudah dibatalkan / expired.
    if (
      ["cancelled", "canceled", "expired"].includes(
        databaseStatus,
      )
    ) {
      return json(
        {
          success: false,
          error:
            "Order sudah tidak dapat diproses.",
          order_id: order.id,
          status: databaseStatus,
        },
        409,
      );
    }
    // ==========================================================
    // INVOICE
    // ==========================================================
    const invoiceId = String(
      order.payment_reference || "",
    ).trim();
    if (!invoiceId) {
      return json(
        {
          success: false,
          error:
            "Invoice BAYAR.GG belum dibuat untuk order ini.",
        },
        400,
      );
    }
    // ==========================================================
    // CHECK BAYAR.GG PAYMENT
    // ==========================================================
    const checkUrl =
      `https://api.bayar.gg/api/check-payment.php?invoice=` +
      encodeURIComponent(invoiceId);
    const gatewayResponse = await fetch(
      checkUrl,
      {
        method: "GET",
        headers: {
          "X-API-Key": bayarGgApiKey,
          Accept: "application/json",
        },
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
        "BAYAR.GG check payment failed:",
        gatewayResponse.status,
        gatewayData,
      );
      return json(
        {
          success: false,
          error:
            gatewayData?.message ||
            gatewayData?.error ||
            `BAYAR.GG gagal mengecek pembayaran (HTTP ${gatewayResponse.status}).`,
        },
        502,
      );
    }
    // ==========================================================
    // NORMALIZE GATEWAY RESPONSE
    // ==========================================================
    const data =
      gatewayData?.data ||
      gatewayData?.payment ||
      gatewayData;
    const gatewayStatus =
      normalizeStatus(data?.status);
    const gatewayInvoice = String(
      data?.invoice_id ||
        data?.invoice ||
        invoiceId,
    ).trim();
    // ==========================================================
    // INVOICE SAFETY CHECK
    //
    // Jangan settlement kalau gateway mengembalikan
    // invoice berbeda dari invoice yang tersimpan.
    // ==========================================================
    if (
      gatewayInvoice &&
      gatewayInvoice !== invoiceId
    ) {
      console.error(
        "BAYAR.GG invoice mismatch:",
        {
          expected: invoiceId,
          received: gatewayInvoice,
        },
      );
      return json(
        {
          success: false,
          error:
            "Invoice BAYAR.GG tidak cocok dengan order.",
        },
        502,
      );
    }
    // ==========================================================
    // AMOUNT
    // ==========================================================
    const orderAmount = Math.round(
      Number(order.amount || 0),
    );
    const gatewayAmountRaw =
      data?.amount ??
      data?.final_amount ??
      orderAmount;
    const finalAmountRaw =
      data?.final_amount ??
      data?.amount ??
      orderAmount;
    const gatewayAmount = Number(
      gatewayAmountRaw,
    );
    const finalAmount = Number(
      finalAmountRaw,
    );
    if (
      !Number.isFinite(orderAmount) ||
      orderAmount <= 0
    ) {
      return json(
        {
          success: false,
          error:
            "Nominal order di database tidak valid.",
        },
        400,
      );
    }
    if (
      !Number.isFinite(finalAmount) ||
      finalAmount <= 0
    ) {
      return json(
        {
          success: false,
          error:
            "Nominal pembayaran dari BAYAR.GG tidak valid.",
          status: gatewayStatus,
        },
        502,
      );
    }
    // ==========================================================
    // PAYMENT STILL PENDING
    // ==========================================================
    if (!isPaidStatus(gatewayStatus)) {
      return json({
        success: true,
        order_id: order.id,
        invoice_id: invoiceId,
        status: gatewayStatus,
        settled: false,
        paid: false,
        amount: Number.isFinite(gatewayAmount)
          ? gatewayAmount
          : null,
        final_amount: finalAmount,
        paid_at:
          data?.paid_at ||
          data?.payment_date ||
          null,
      });
    }
    // ==========================================================
    // PAID
    //
    // Settlement dilakukan melalui RPC SQL:
    //
    // settle_bayargg_order(
    //   p_order_id,
    //   p_invoice_id,
    //   p_gateway_status,
    //   p_final_amount,
    //   p_gateway_payload
    // )
    //
    // RPC menangani:
    // - order paid
    // - Premium
    // - subscription
    // - product purchase
    // - seller 70%
    // - platform 30%
    // - wallet
    // - transactions
    // - purchase record
    // - idempotency
    // ==========================================================
    const {
      data: settlementResult,
      error: settlementError,
    } = await admin.rpc(
      "settle_bayargg_order",
      {
        p_order_id: order.id,
        p_invoice_id: invoiceId,
        p_gateway_status: gatewayStatus,
        p_final_amount: finalAmount,
        p_gateway_payload: data,
      },
    );
    if (settlementError) {
      console.error(
        "BAYAR.GG settlement failed:",
        settlementError,
      );
      throw settlementError;
    }
    const settled =
      settlementResult !== false;
    // ==========================================================
    // RESPONSE
    // ==========================================================
    return json({
      success: true,
      order_id: order.id,
      invoice_id: invoiceId,
      status: gatewayStatus,
      paid: true,
      settled,
      item_type:
        order.item_type || null,
      item_title:
        order.item_title || null,
      amount: Number.isFinite(gatewayAmount)
        ? gatewayAmount
        : orderAmount,
      final_amount: finalAmount,
      paid_at:
        data?.paid_at ||
        data?.payment_date ||
        null,
      provider: "BAYAR.GG",
    });
  } catch (error) {
    console.error(
      "check-bayargg-payment:",
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
