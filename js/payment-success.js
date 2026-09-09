/* =========================================================
   PasTele — PAYMENT SUCCESS
   FINAL SQL SYNC
   TABLE:
   public.orders
   Relevant columns:
   - id
   - buyer_id
   - seller_id
   - product_id
   - amount
   - status
   - created_at
   - item_type
   - item_id
   - item_title
   - payment_reference
   - paid_at
   - gateway_payload
   Successful statuses:
   - paid
   - success
   - completed
   ========================================================= */
document.addEventListener(
    "DOMContentLoaded",
    async () => {
        "use strict";
        /* ===================================================
           DOM
           =================================================== */
        const params =
            new URLSearchParams(
                location.search
            );
        const orderId =
            String(
                params.get("order_id") || ""
            ).trim();
        const orderEl =
            document.getElementById(
                "successOrder"
            );
        const text =
            document.getElementById(
                "successText"
            );
        const accessButton =
            document.getElementById(
                "openAccess"
            );
        /* ===================================================
           HELPERS
           =================================================== */
        const setText = (value) => {
            if (text) {
                text.textContent =
                    String(value || "");
            }
        };
        const setOrder = (value) => {
            if (orderEl) {
                orderEl.textContent =
                    String(value || "-");
            }
        };
        const setAccessUrl = (url) => {
            if (!accessButton) return;
            accessButton.href =
                String(url || "#");
        };
        const client =
            window.sb ||
            window.supabaseClient ||
            window.supabase ||
            null;
        /* ===================================================
           SUPABASE CHECK
           =================================================== */
        if (!client) {
            setText(
                "Database belum terkonfigurasi."
            );
            return;
        }
        /* ===================================================
           AUTH
           =================================================== */
        let user = null;
        try {
            if (
                !window.TC ||
                typeof TC.user !==
                    "function"
            ) {
                throw new Error(
                    "Sesi login tidak tersedia."
                );
            }
            user =
                await TC.user();
        } catch (error) {
            console.warn(
                "[Payment Success] Auth:",
                error
            );
            const redirect =
                encodeURIComponent(
                    location.href
                );
            location.href =
                `login.html?redirect=${redirect}`;
            return;
        }
        if (!user?.id) {
            const redirect =
                encodeURIComponent(
                    location.href
                );
            location.href =
                `login.html?redirect=${redirect}`;
            return;
        }
        /* ===================================================
           ORDER ID VALIDATION
           =================================================== */
        if (!orderId) {
            setOrder("-");
            setText(
                "Order ID tidak ditemukan."
            );
            setAccessUrl(
                "dashboard.html"
            );
            return;
        }
        setOrder(orderId);
        /* ===================================================
           LOAD ORDER
           ---------------------------------------------------
           Explicit columns only.
           =================================================== */
        try {
            const {
                data: order,
                error
            } = await client
                .from("orders")
                .select(`
                    id,
                    buyer_id,
                    seller_id,
                    product_id,
                    amount,
                    status,
                    created_at,
                    item_type,
                    item_id,
                    item_title,
                    payment_reference,
                    paid_at
                `)
                .eq("id", orderId)
                .eq("buyer_id", user.id)
                .maybeSingle();
            if (error) {
                throw error;
            }
            /* ===============================================
               ORDER NOT FOUND
               =============================================== */
            if (!order) {
                setText(
                    "Order tidak ditemukan atau bukan milik akun ini."
                );
                setAccessUrl(
                    "dashboard.html"
                );
                return;
            }
            /* ===============================================
               NORMALIZE STATUS
               =============================================== */
            const status =
                String(
                    order.status || ""
                )
                    .trim()
                    .toLowerCase();
            const successfulStatuses = [
                "paid",
                "success",
                "completed"
            ];
            /* ===============================================
               PAYMENT NOT YET SUCCESS
               =============================================== */
            if (
                !successfulStatuses.includes(
                    status
                )
            ) {
                setText(
                    "Pembayaran belum berstatus berhasil. Silakan kembali ke halaman pembayaran untuk melanjutkan atau menunggu verifikasi."
                );
                setAccessUrl(
                    `payment.html?order_id=${encodeURIComponent(
                        order.id
                    )}`
                );
                return;
            }
            /* ===============================================
               SUCCESS
               =============================================== */
            const itemTitle =
                String(
                    order.item_title || ""
                ).trim();
            if (itemTitle) {
                setText(
                    `${itemTitle} sudah dibayar dan diverifikasi. Akses pembelian tersedia di akunmu.`
                );
            } else {
                setText(
                    "Pembayaran sudah berhasil dan diverifikasi. Akses pembelian tersedia di akunmu."
                );
            }
            /*
             * Resolve the exact purchased content after the server
             * has marked the order paid and created the purchase row.
             * No query-string access is trusted; ownership is checked
             * by the logged-in buyer + completed purchase.
             */
            let accessUrl = "dashboard.html";
            try {
                const { data: purchase, error: purchaseError } = await client
                    .from("purchases")
                    .select("id,item_type,item_id,item_title,status,access_url")
                    .eq("order_id", order.id)
                    .eq("buyer_id", user.id)
                    .in("status", ["completed","paid","success"])
                    .maybeSingle();
                if (purchaseError) throw purchaseError;

                if (purchase?.access_url) {
                    accessUrl = purchase.access_url;
                } else {
                    const type = String(order.item_type || "").toLowerCase();
                    const id = order.item_id || order.product_id;
                    if (id && type === "pastelink") {
                        const { data } = await client.from("pastelinks").select("slug").eq("id",id).maybeSingle();
                        if (data?.slug) accessUrl = `paste-view.html?slug=${encodeURIComponent(data.slug)}`;
                    } else if (id && type === "telegram_product") {
                        const { data } = await client.from("telegram_products").select("slug").eq("id",id).maybeSingle();
                        if (data?.slug) accessUrl = `product.html?type=code&slug=${encodeURIComponent(data.slug)}`;
                    } else if (id && ["channel","telegram_channel","group","telegram_group"].includes(type)) {
                        const { data } = await client.from("telegram_channels").select("slug,type").eq("id",id).maybeSingle();
                        if (data?.slug) {
                            const prefix = String(data.type || type).toLowerCase() === "group" ? "g" : "ch";
                            accessUrl = `product.html?type=${prefix === "g" ? "group" : "channel"}&slug=${encodeURIComponent(data.slug)}`;
                        }
                    } else if (id && ["product","link"].includes(type)) {
                        const { data } = await client.from("products").select("slug").eq("id",id).maybeSingle();
                        if (data?.slug) accessUrl = `product.html?type=link&slug=${encodeURIComponent(data.slug)}`;
                    }
                }
            } catch (accessError) {
                console.warn("[Payment Success] Access resolve:", accessError);
            }

            setAccessUrl(accessUrl);
            if (accessButton) {
                accessButton.textContent = accessUrl === "dashboard.html" ? "Buka Dashboard" : "Buka Konten";
            }
            setTimeout(() => {
                if (accessUrl && accessUrl !== "#") {
                    window.location.href = accessUrl;
                }
            }, 1200);
            /* ===============================================
               OPTIONAL SUCCESS HOOK
               =============================================== */
            try {
                if (
                    typeof window
                        .onPaymentSuccess
                        === "function"
                ) {
                    await window.onPaymentSuccess(
                        order
                    );
                }
            } catch (hookError) {
                console.warn(
                    "[Payment Success] Hook:",
                    hookError
                );
            }
        } catch (error) {
            console.error(
                "[Payment Success] Order error:",
                error
            );
            const code =
                error?.code || "";
            if (
                code === "42501"
            ) {
                setText(
                    "Akses order ditolak oleh database. Silakan login ulang."
                );
            } else if (
                code === "22P02"
            ) {
                setText(
                    "Order ID tidak valid."
                );
            } else {
                setText(
                    error?.message ||
                        "Gagal memuat informasi transaksi."
                );
            }
            setAccessUrl(
                "dashboard.html"
            );
        }
    }
);
