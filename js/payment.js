/* =========================================================
   PasTele — PAYMENT
   FINAL SQL + BAYARGG SYNC
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
   EDGE FUNCTIONS:
   - create-bayargg-payment
   - check-bayargg-payment
   SUCCESS:
   - paid
   - success
   - completed
   FAILED:
   - failed
   - cancelled
   - canceled
   - expired
   ========================================================= */
document.addEventListener(
    "DOMContentLoaded",
    async () => {
        "use strict";
        /* ===================================================
           ELEMENTS
           =================================================== */
        const $ = (id) =>
            document.getElementById(id);
        const qs =
            new URLSearchParams(
                location.search
            );
        const orderId =
            String(
                qs.get("order_id") || ""
            ).trim();
        const loading =
            $("paymentLoading");
        const content =
            $("paymentContent");
        const errorBox =
            $("paymentError");
        const qr =
            $("qrWrap");
        const urlBtn =
            $("cashUrl");
        const check =
            $("checkPayment");
        const orderIdEl =
            $("orderId");
        const orderAmount =
            $("orderAmount");
        const orderTitle =
            $("orderTitle");
        const orderType =
            $("orderType");
        const copyOrder =
            $("copyOrder");
        const statusPill =
            $("paymentStatusPill");
        const statusTitle =
            $("paymentStatusTitle");
        const statusText =
            $("paymentStatusText");
        const statusIcon =
            $("statusIcon");
        let timer = null;
        let creating = false;
        let paymentCreated = false;
        let currentOrder = null;
        /* ===================================================
           CLIENT
           =================================================== */
        const client =
            window.sb ||
            window.supabaseClient ||
            window.supabase ||
            null;
        /* ===================================================
           CONSTANTS
           =================================================== */
        const SUCCESS_STATUSES = [
            "paid",
            "success",
            "completed"
        ];
        const FAILED_STATUSES = [
            "failed",
            "cancelled",
            "canceled",
            "expired"
        ];
        /* ===================================================
           HELPERS
           =================================================== */
        const money = (value) => {
            const amount =
                Number(value || 0);
            if (
                window.TC &&
                typeof TC.money ===
                    "function"
            ) {
                return TC.money(
                    amount
                );
            }
            return new Intl.NumberFormat(
                "id-ID",
                {
                    style:
                        "currency",
                    currency:
                        "IDR",
                    maximumFractionDigits:
                        0
                }
            ).format(
                Number.isFinite(
                    amount
                )
                    ? amount
                    : 0
            );
        };
        const esc = (value) => {
            if (window.TC?.esc) {
                return TC.esc(
                    String(
                        value ?? ""
                    )
                );
            }
            return String(
                value ?? ""
            ).replace(
                /[&<>"']/g,
                (char) =>
                    ({
                        "&":
                            "&amp;",
                        "<":
                            "&lt;",
                        ">":
                            "&gt;",
                        '"':
                            "&quot;",
                        "'":
                            "&#039;"
                    })[char]
            );
        };
        const toast = (
            message,
            type = "error"
        ) => {
            if (
                window.TC &&
                typeof TC.toast ===
                    "function"
            ) {
                TC.toast(
                    message,
                    type
                );
                return;
            }
            if (
                type ===
                "error"
            ) {
                console.error(
                    message
                );
            } else {
                console.log(
                    message
                );
            }
        };
        const normalizeStatus = (
            value
        ) =>
            String(
                value || "pending"
            )
                .trim()
                .toLowerCase();
        const isSuccess = (
            status
        ) =>
            SUCCESS_STATUSES.includes(
                normalizeStatus(
                    status
                )
            );
        const isFailed = (
            status
        ) =>
            FAILED_STATUSES.includes(
                normalizeStatus(
                    status
                )
            );
        const stopPolling = () => {
            if (timer) {
                clearInterval(
                    timer
                );
                timer = null;
            }
        };
        /* ===================================================
           FAIL SCREEN
           =================================================== */
        const fail = (
            message
        ) => {
            stopPolling();
            if (loading) {
                loading.hidden =
                    true;
            }
            if (content) {
                content.hidden =
                    true;
            }
            if (errorBox) {
                errorBox.hidden =
                    false;
                errorBox.innerHTML = `
                    <i class="fa-solid fa-circle-exclamation"></i>
                    ${esc(
                        message ||
                            "Gagal memuat pembayaran."
                    )}
                `;
            }
        };
        /* ===================================================
           SUPABASE
           =================================================== */
        if (!client) {
            fail(
                "Supabase client belum siap."
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
                "[Payment] Auth error:",
                error
            );
            location.href =
                `login.html?redirect=${encodeURIComponent(
                    location.href
                )}`;
            return;
        }
        if (!user?.id) {
            location.href =
                `login.html?redirect=${encodeURIComponent(
                    location.href
                )}`;
            return;
        }
        /* ===================================================
           ORDER ID
           =================================================== */
        if (!orderId) {
            fail(
                "order_id tidak ditemukan."
            );
            return;
        }
        /* ===================================================
           LOAD ORDER
           ---------------------------------------------------
           IMPORTANT:
           Restrict order to logged-in buyer.
           =================================================== */
        const loadOrder =
            async () => {
                const {
                    data,
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
                    .eq(
                        "id",
                        orderId
                    )
                    .eq(
                        "buyer_id",
                        user.id
                    )
                    .maybeSingle();
                if (error) {
                    throw error;
                }
                if (!data) {
                    throw new Error(
                        "Order tidak ditemukan atau tidak dapat diakses."
                    );
                }
                return data;
            };
        /* ===================================================
           RENDER ORDER
           =================================================== */
        const renderOrder =
            (order) => {
                if (orderIdEl) {
                    orderIdEl.textContent =
                        order.id;
                }
                if (orderAmount) {
                    orderAmount.textContent =
                        money(
                            order.amount
                        );
                }
                if (orderTitle) {
                    orderTitle.textContent =
                        order.item_title ||
                        "PasTele Order";
                }
                if (orderType) {
                    orderType.textContent =
                        String(
                            order.item_type ||
                                "Pembayaran"
                        )
                            .replace(
                                /_/g,
                                " "
                            )
                            .replace(
                                /\b\w/g,
                                (c) =>
                                    c.toUpperCase()
                            );
                }
            };
        /* ===================================================
           STATUS UI
           =================================================== */
        const renderStatus =
            (status) => {
                const normalized =
                    normalizeStatus(
                        status
                    );
                if (statusPill) {
                    statusPill.textContent =
                        normalized.toUpperCase();
                }
                /* =========================================
                   SUCCESS
                   ========================================= */
                if (
                    isSuccess(
                        normalized
                    )
                ) {
                    if (statusIcon) {
                        statusIcon.innerHTML =
                            `
                                <i class="fa-solid fa-circle-check"></i>
                            `;
                    }
                    if (statusTitle) {
                        statusTitle.textContent =
                            "Pembayaran berhasil";
                    }
                    if (statusText) {
                        statusText.textContent =
                            "Pembayaran sudah diverifikasi.";
                    }
                    stopPolling();
                    if (check) {
                        check.disabled =
                            true;
                    }
                    /*
                     * Redirect only after the
                     * database order is confirmed.
                     */
                    setTimeout(
                        () => {
                            location.href =
                                `payment-success.html?order_id=${encodeURIComponent(
                                    orderId
                                )}`;
                        },
                        500
                    );
                    return "success";
                }
                /* =========================================
                   FAILED
                   ========================================= */
                if (
                    isFailed(
                        normalized
                    )
                ) {
                    if (statusIcon) {
                        statusIcon.innerHTML =
                            `
                                <i class="fa-solid fa-circle-xmark"></i>
                            `;
                    }
                    if (statusTitle) {
                        statusTitle.textContent =
                            "Pembayaran tidak berhasil";
                    }
                    if (statusText) {
                        statusText.textContent =
                            "Order ini tidak lagi dapat dibayar.";
                    }
                    stopPolling();
                    if (check) {
                        check.disabled =
                            true;
                    }
                    return "failed";
                }
                /* =========================================
                   PENDING
                   ========================================= */
                if (statusIcon) {
                    statusIcon.innerHTML =
                        `
                            <i class="fa-solid fa-clock"></i>
                        `;
                }
                if (statusTitle) {
                    statusTitle.textContent =
                        "Menunggu pembayaran";
                }
                if (statusText) {
                    statusText.textContent =
                        "Silakan selesaikan pembayaran. Status akan diverifikasi otomatis.";
                }
                return "pending";
            };
        /* ===================================================
           EXTRACT PAYMENT RESPONSE
           =================================================== */
        const extractPayment =
            (response) => {
                const raw =
                    response?.data ||
                    response ||
                    {};
                const data =
                    raw?.data ||
                    raw;
                return {
                    success:
                        data?.success !==
                        false,
                    qris:
                        String(
                            data?.qris_string ||
                                data?.qr_string ||
                                data?.qris ||
                                ""
                        ).trim(),
                    paymentUrl:
                        String(
                            data?.payment_url ||
                                data?.paymentUrl ||
                                data?.url ||
                                ""
                        ).trim(),
                    invoiceId:
                        String(
                            data?.invoice_id ||
                                data?.invoiceId ||
                                ""
                        ).trim(),
                    status:
                        normalizeStatus(
                            data?.status
                        ),
                    raw: data
                };
            };
        /* ===================================================
           LOAD QR LIBRARY
           =================================================== */
        const loadQr =
            () =>
                new Promise(
                    (
                        resolve,
                        reject
                    ) => {
                        if (
                            window.QRCode
                        ) {
                            resolve();
                            return;
                        }
                        const existing =
                            document.querySelector(
                                'script[data-pastele-qrcode]'
                            );
                        if (
                            existing
                        ) {
                            existing.addEventListener(
                                "load",
                                () =>
                                    resolve(),
                                {
                                    once: true
                                }
                            );
                            existing.addEventListener(
                                "error",
                                () =>
                                    reject(
                                        new Error(
                                            "Library QR tidak dapat dimuat."
                                        )
                                    ),
                                {
                                    once: true
                                }
                            );
                            return;
                        }
                        const script =
                            document.createElement(
                                "script"
                            );
                        script.src =
                            "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
                        script.async =
                            true;
                        script.dataset.paseteleQrcode =
                            "true";
                        script.onload =
                            () =>
                                resolve();
                        script.onerror =
                            () =>
                                reject(
                                    new Error(
                                        "Library QR tidak dapat dimuat."
                                    )
                                );
                        document.head.appendChild(
                            script
                        );
                    }
                );
        /* ===================================================
           RENDER QR
           =================================================== */
        const renderPayment =
            async ({
                qris,
                paymentUrl
            }) => {
                if (!qr) {
                    return;
                }
                if (qris) {
                    await loadQr();
                    qr.innerHTML = `
                        <div class="qr-title">
                            <i class="fa-solid fa-qrcode"></i>
                            <span>
                                Scan QRIS Bayar.gg
                            </span>
                        </div>
                        <div
                            id="bayarggQr"
                            class="bayargg-qr"
                        ></div>
                        <small class="qr-hint">
                            Scan menggunakan aplikasi bank atau e-wallet kamu.
                        </small>
                    `;
                    const qrTarget =
                        $("bayarggQr");
                    if (!qrTarget) {
                        throw new Error(
                            "Area QRIS tidak ditemukan."
                        );
                    }
                    new QRCode(
                        qrTarget,
                        {
                            text:
                                qris,
                            width:
                                240,
                            height:
                                240,
                            colorDark:
                                "#111827",
                            colorLight:
                                "#ffffff",
                            correctLevel:
                                QRCode
                                    .CorrectLevel
                                    .M
                        }
                    );
                } else if (
                    paymentUrl
                ) {
                    qr.innerHTML = `
                        <div class="qr-loading">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            <span>
                                QRIS tidak tersedia.
                                Gunakan halaman pembayaran.
                            </span>
                        </div>
                    `;
                } else {
                    qr.innerHTML = `
                        <div class="qr-loading">
                            <i class="fa-solid fa-clock"></i>
                            <span>
                                Menunggu data pembayaran...
                            </span>
                        </div>
                    `;
                }
                if (
                    urlBtn
                ) {
                    if (
                        paymentUrl
                    ) {
                        urlBtn.hidden =
                            false;
                        urlBtn.href =
                            paymentUrl;
                        urlBtn.target =
                            "_blank";
                        urlBtn.rel =
                            "noopener noreferrer";
                        urlBtn.textContent =
                            "Buka Pembayaran Bayar.gg";
                    } else {
                        urlBtn.hidden =
                            true;
                        urlBtn.removeAttribute(
                            "href"
                        );
                    }
                }
            };
        /* ===================================================
           CREATE PAYMENT
           ---------------------------------------------------
           IMPORTANT:
           Do not create a second invoice if payment
           has already been created during this page
           session.
           =================================================== */
        const createPayment =
            async (order) => {
                if (
                    creating ||
                    paymentCreated
                ) {
                    return;
                }
                creating =
                    true;
                try {
                    if (
                        isSuccess(
                            order.status
                        ) ||
                        isFailed(
                            order.status
                        )
                    ) {
                        return;
                    }
                    if (qr) {
                        qr.innerHTML = `
                            <div class="qr-loading">
                                <i class="fa-solid fa-spinner fa-spin"></i>
                                <span>
                                    Membuat QRIS Bayar.gg...
                                </span>
                            </div>
                        `;
                    }
                    const response =
                        await client.functions.invoke(
                            "create-bayargg-payment",
                            {
                                body: {
                                    order_id:
                                        order.id
                                }
                            }
                        );
                    if (
                        response.error
                    ) {
                        let message =
                            response
                                .error
                                .message ||
                            "Gagal menghubungi Edge Function pembayaran.";
                        try {
                            const context =
                                response
                                    .error
                                    .context;
                            if (
                                context &&
                                typeof context.json ===
                                    "function"
                            ) {
                                const body =
                                    await context.json();
                                message =
                                    body?.error ||
                                    body?.message ||
                                    message;
                            }
                        } catch {
                            /* ignore response parsing */
                        }
                        throw new Error(
                            message
                        );
                    }
                    const payment =
                        extractPayment(
                            response
                        );
                    if (
                        payment.success ===
                        false
                    ) {
                        throw new Error(
                            payment.raw
                                ?.error ||
                                payment.raw
                                    ?.message ||
                                "Bayar.gg gagal membuat pembayaran."
                        );
                    }
                    if (
                        !payment.qris &&
                        !payment.paymentUrl
                    ) {
                        throw new Error(
                            "Bayar.gg tidak mengembalikan QRIS atau payment URL."
                        );
                    }
                    paymentCreated =
                        true;
                    await renderPayment(
                        {
                            qris:
                                payment.qris,
                            paymentUrl:
                                payment.paymentUrl
                        }
                    );
                    /*
                     * Gateway may return an invoice id.
                     * The authoritative order reference
                     * remains orders.payment_reference
                     * maintained by the backend.
                     */
                    if (
                        payment.invoiceId
                    ) {
                        console.info(
                            "[Payment] BayarGG invoice created:",
                            payment.invoiceId
                        );
                    }
                } finally {
                    creating =
                        false;
                }
            };
        /* ===================================================
           CHECK GATEWAY STATUS
           =================================================== */
        const checkGatewayStatus =
            async () => {
                const response =
                    await client.functions.invoke(
                        "check-bayargg-payment",
                        {
                            body: {
                                order_id:
                                    orderId
                            }
                        }
                    );
                if (
                    response.error
                ) {
                    throw response.error;
                }
                const raw =
                    response?.data ||
                    {};
                const data =
                    raw?.data ||
                    raw;
                return data || null;
            };
        /* ===================================================
           POLL
           =================================================== */
        const poll =
            async () => {
                const latest =
                    await loadOrder();
                currentOrder =
                    latest;
                /*
                 * DATABASE FIRST.
                 */
                const dbResult =
                    renderStatus(
                        latest.status
                    );
                if (
                    dbResult ===
                        "success" ||
                    dbResult ===
                        "failed"
                ) {
                    return;
                }
                /*
                 * Ask backend/gateway to
                 * synchronize payment status.
                 *
                 * We do NOT directly update
                 * orders from frontend.
                 */
                const gateway =
                    await checkGatewayStatus()
                        .catch(
                            (error) => {
                                console.warn(
                                    "[Payment] Gateway status check:",
                                    error
                                );
                                return null;
                            }
                        );
                if (!gateway) {
                    return;
                }
                const gatewayStatus =
                    normalizeStatus(
                        gateway.status ||
                            gateway.payment_status ||
                            gateway.paymentStatus
                    );
                /*
                 * If gateway says paid, the
                 * Edge Function should update
                 * orders. Reload DB afterwards.
                 */
                if (
                    gatewayStatus ===
                        "paid" ||
                    gatewayStatus ===
                        "success" ||
                    gatewayStatus ===
                        "completed"
                ) {
                    const refreshed =
                        await loadOrder();
                    currentOrder =
                        refreshed;
                    renderStatus(
                        refreshed.status
                    );
                    return;
                }
                /*
                 * Never overwrite DB order
                 * status from frontend.
                 */
            };
        /* ===================================================
           COPY ORDER ID
           =================================================== */
        if (copyOrder) {
            copyOrder.onclick =
                async () => {
                    try {
                        if (
                            navigator
                                .clipboard
                        ) {
                            await navigator
                                .clipboard
                                .writeText(
                                    String(
                                        orderId
                                    )
                                );
                            toast(
                                "Order ID disalin.",
                                "success"
                            );
                            return;
                        }
                        throw new Error(
                            "Clipboard tidak tersedia."
                        );
                    } catch {
                        toast(
                            "Gagal menyalin Order ID.",
                            "error"
                        );
                    }
                };
        }
        /* ===================================================
           MAIN FLOW
           =================================================== */
        try {
            currentOrder =
                await loadOrder();
            renderOrder(
                currentOrder
            );
            if (loading) {
                loading.hidden =
                    true;
            }
            if (content) {
                content.hidden =
                    false;
            }
            if (errorBox) {
                errorBox.hidden =
                    true;
            }
            /* ===============================================
               EXISTING ORDER STATUS
               =============================================== */
            const initialStatus =
                renderStatus(
                    currentOrder.status
                );
            if (
                initialStatus ===
                    "success" ||
                initialStatus ===
                    "failed"
            ) {
                return;
            }
            /* ===============================================
               CREATE PAYMENT
               =============================================== */
            /*
             * If backend already has a payment
             * reference, do not blindly create
             * another invoice.
             *
             * Existing payment_reference is
             * authoritative evidence that the
             * backend already associated a gateway
             * payment with this order.
             */
            if (
                !currentOrder.payment_reference
            ) {
                await createPayment(
                    currentOrder
                );
            } else {
                /*
                 * Payment was already created.
                 * Ask backend for current gateway
                 * state and let it reconstruct
                 * the payment UI if available.
                 */
                const gateway =
                    await checkGatewayStatus()
                        .catch(
                            () => null
                        );
                if (
                    gateway
                ) {
                    const payment =
                        extractPayment(
                            {
                                data:
                                    gateway
                            }
                        );
                    if (
                        payment.qris ||
                        payment.paymentUrl
                    ) {
                        await renderPayment(
                            {
                                qris:
                                    payment.qris,
                                paymentUrl:
                                    payment.paymentUrl
                            }
                        );
                    }
                }
            }
            /* ===============================================
               POLLING
               =============================================== */
            timer =
                setInterval(
                    () => {
                        poll().catch(
                            (error) => {
                                console.warn(
                                    "[Payment] Poll error:",
                                    error
                                );
                            }
                        );
                    },
                    5000
                );
            /* ===============================================
               MANUAL CHECK
               =============================================== */
            if (check) {
                check.onclick =
                    async () => {
                        if (
                            check.disabled
                        ) {
                            return;
                        }
                        check.disabled =
                            true;
                        try {
                            await poll();
                            toast(
                                "Status pembayaran diperbarui.",
                                "success"
                            );
                        } catch (
                            error
                        ) {
                            console.error(
                                "[Payment] Manual check:",
                                error
                            );
                            toast(
                                error?.message ||
                                    "Gagal mengecek status pembayaran.",
                                "error"
                            );
                        } finally {
                            /*
                             * Keep button disabled if
                             * payment is already finished.
                             */
                            if (
                                currentOrder &&
                                (
                                    isSuccess(
                                        currentOrder.status
                                    ) ||
                                    isFailed(
                                        currentOrder.status
                                    )
                                )
                            ) {
                                check.disabled =
                                    true;
                            } else {
                                check.disabled =
                                    false;
                            }
                        }
                    };
            }
            /* ===============================================
               CLEANUP
               =============================================== */
            window.addEventListener(
                "beforeunload",
                stopPolling
            );
            document.addEventListener(
                "visibilitychange",
                () => {
                    /*
                     * Don't permanently stop polling.
                     * When user returns to tab, perform
                     * one immediate status refresh.
                     */
                    if (
                        !document.hidden &&
                        currentOrder &&
                        !isSuccess(
                            currentOrder.status
                        ) &&
                        !isFailed(
                            currentOrder.status
                        )
                    ) {
                        poll().catch(
                            () => {}
                        );
                    }
                }
            );
        } catch (error) {
            console.error(
                "[PasTele Payment]",
                error
            );
            fail(
                error?.message ||
                    "Pembayaran gagal disiapkan."
            );
        }
    }
);
