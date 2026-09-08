import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ============================================================
// CORS
// ============================================================
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type,x-webhook-signature,x-webhook-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
// ============================================================
// HELPERS
// ============================================================
const json = (
  body: unknown,
  status = 200,
) =>
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
function bytesToHex(buffer: ArrayBuffer) {
  return Array.from(
    new Uint8Array(buffer),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}
async function hmacSha256(
  secret: string,
  message: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return bytesToHex(signature);
}
function timingSafeEqual(
  a: string,
  b: string,
) {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (left.length !== right.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < left.length; i++) {
    result |=
      left.charCodeAt(i) ^
      right.charCodeAt(i);
  }
  return result === 0;
}
function normalizeStatus(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
function isPaidStatus(status: string) {
  return [
    "paid",
    "settled",
    "success",
    "completed",
  ].includes(status);
}
// ============================================================
// WEBHOOK
// ============================================================
Deno.serve(async (req) => {
  // ----------------------------------------------------------
  // OPTIONS
  // ----------------------------------------------------------
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: CORS,
    });
  }
  // ----------------------------------------------------------
  // METHOD
  // ----------------------------------------------------------
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
    // ========================================================
    // ENV
    // ========================================================
    const webhookSecret =
      env("BAYARGG_WEBHOOK_SECRET");
    const supabaseUrl =
      env("SUPABASE_URL");
    const serviceRoleKey =
      env("SUPABASE_SERVICE_ROLE_KEY");
    // ========================================================
    // READ RAW BODY
    // ========================================================
    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return json(
        {
          success: false,
          error: "Webhook body kosong.",
        },
        400,
      );
    }
    // ========================================================
    // PARSE JSON
    // ========================================================
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json(
        {
          success: false,
          error: "Invalid JSON.",
        },
        400,
      );
    }
    // ========================================================
    // HEADERS
    // ========================================================
    const signature =
      (
        req.headers.get(
          "X-Webhook-Signature",
        ) || ""
      ).trim();
    const headerTimestamp =
      (
        req.headers.get(
          "X-Webhook-Timestamp",
        ) || ""
      ).trim();
    // ========================================================
    // PAYLOAD
    //
    // Expected:
    //
    // invoice_id
    // status
    // final_amount
    // timestamp
    // ========================================================
    const invoiceId = String(
      payload?.invoice_id || "",
    ).trim();
    const status = normalizeStatus(
      payload?.status,
    );
    const timestamp =
      String(
        payload?.timestamp ||
          headerTimestamp ||
          "",
      ).trim();
    const finalAmount = Number(
      payload?.final_amount ??
        payload?.amount ??
        0,
    );
    // ========================================================
    // BASIC VALIDATION
    // ========================================================
    if (!invoiceId) {
      return json(
        {
          success: false,
          error:
            "invoice_id tidak ditemukan.",
        },
        400,
      );
    }
    if (!status) {
      return json(
        {
          success: false,
          error:
            "status pembayaran tidak ditemukan.",
        },
        400,
      );
    }
    if (!timestamp) {
      return json(
        {
          success: false,
          error:
            "timestamp webhook tidak ditemukan.",
        },
        400,
      );
    }
    if (!signature) {
      return json(
        {
          success: false,
          error:
            "X-Webhook-Signature tidak ditemukan.",
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
            "final_amount webhook tidak valid.",
        },
        400,
      );
    }
    // ========================================================
    // SIGNATURE VERIFICATION
    //
    // Format:
    //
    // invoice_id|status|final_amount|timestamp
    // ========================================================
    const signatureMessage =
      `${invoiceId}|${status}|${finalAmount}|${timestamp}`;
    const expectedSignature =
      await hmacSha256(
        webhookSecret,
        signatureMessage,
      );
    if (
      !timingSafeEqual(
        signature,
        expectedSignature,
      )
    ) {
      console.error(
        "BAYAR.GG invalid webhook signature",
        {
          invoiceId,
          status,
        },
      );
      return json(
        {
          success: false,
          error:
            "Invalid webhook signature.",
        },
        401,
      );
    }
    // ========================================================
    // IGNORE NON-PAID EVENTS
    //
    // Hanya status paid/settled/success/completed
    // yang boleh melakukan settlement.
    // ========================================================
    if (!isPaidStatus(status)) {
      return json({
        success: true,
        ignored: true,
        invoice_id: invoiceId,
        status,
        settled: false,
      });
    }
    // ========================================================
    // SUPABASE SERVICE CLIENT
    // ========================================================
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
    // ========================================================
    // FIND ORDER BY BAYAR.GG INVOICE
    //
    // SESUAI SQL MASTER:
    //
    // orders.id
    // orders.buyer_id
    // orders.amount
    // orders.status
    // orders.payment_reference
    // ========================================================
    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .select(
        "id,buyer_id,amount,status,payment_reference,item_type,item_title",
      )
      .eq(
        "payment_reference",
        invoiceId,
      )
      .maybeSingle();
    if (orderError) {
      throw orderError;
    }
    if (!order) {
      console.error(
        "BAYAR.GG order not found",
        {
          invoiceId,
        },
      );
      return json(
        {
          success: false,
          error:
            "Order dengan invoice BAYAR.GG tidak ditemukan.",
          invoice_id: invoiceId,
        },
        404,
      );
    }
    // ========================================================
    // VERIFY STORED INVOICE
    // ========================================================
    if (
      String(
        order.payment_reference || "",
      ).trim() !== invoiceId
    ) {
      return json(
        {
          success: false,
          error:
            "Invoice webhook tidak cocok dengan order.",
        },
        400,
      );
    }
    // ========================================================
    // VERIFY AMOUNT
    //
    // SQL settle_bayargg_order juga melakukan
    // validasi amount.
    //
    // Kita validasi lebih awal agar webhook palsu/
    // nominal salah tidak diteruskan ke settlement.
    // ========================================================
    const orderAmount = Number(
      order.amount || 0,
    );
    if (
      !Number.isFinite(orderAmount) ||
      orderAmount <= 0
    ) {
      return json(
        {
          success: false,
          error:
            "Nominal order tidak valid.",
          order_id: order.id,
        },
        400,
      );
    }
    if (
      Math.round(finalAmount) !==
      Math.round(orderAmount)
    ) {
      console.error(
        "BAYAR.GG amount mismatch",
        {
          invoiceId,
          orderId: order.id,
          orderAmount,
          finalAmount,
        },
      );
      return json(
        {
          success: false,
          error:
            "Nominal webhook tidak sesuai dengan nominal order.",
          order_id: order.id,
          expected_amount: orderAmount,
          received_amount: finalAmount,
        },
        400,
      );
    }
    // ========================================================
    // IDEMPOTENCY
    //
    // Kalau webhook dikirim berkali-kali setelah order
    // sudah paid, jangan menjalankan proses tambahan.
    // ========================================================
    const currentStatus =
      normalizeStatus(order.status);
    if (
      isPaidStatus(currentStatus)
    ) {
      return json({
        success: true,
        already_settled: true,
        settled: true,
        order_id: order.id,
        invoice_id: invoiceId,
        status: "paid",
      });
    }
    // ========================================================
    // SETTLEMENT
    //
    // RPC MASTER:
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
    //
    // - mark order paid
    // - account premium
    // - subscription
    // - marketplace purchase
    // - seller 70%
    // - platform 30%
    // - wallet
    // - transaction
    // - purchase
    // - idempotency
    // ========================================================
    const {
      data: settlementResult,
      error: settlementError,
    } = await admin.rpc(
      "settle_bayargg_order",
      {
        p_order_id: order.id,
        p_invoice_id: invoiceId,
        p_gateway_status: status,
        p_final_amount: finalAmount,
        p_gateway_payload: payload,
      },
    );
    if (settlementError) {
      console.error(
        "BAYAR.GG settlement error:",
        settlementError,
      );
      throw settlementError;
    }
    const settled =
      settlementResult !== false;
    // ========================================================
    // RESPONSE
    // ========================================================
    return json({
      success: true,
      order_id: order.id,
      invoice_id: invoiceId,
      status,
      settled,
      paid: true,
      item_type:
        order.item_type || null,
      item_title:
        order.item_title || null,
      amount: orderAmount,
      final_amount: finalAmount,
      provider: "BAYAR.GG",
    });
  } catch (error) {
    console.error(
      "bayargg-webhook:",
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
