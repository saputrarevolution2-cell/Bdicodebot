/* =========================================================
   PasTele — PAYMENT
   FINAL SQL + HTML + BAYARGG SYNC

   DATABASE:
   public.orders

   CANONICAL orders COLUMNS:
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

   IMPORTANT:
   - Frontend NEVER updates orders directly.
   - Payment settlement is handled by Edge Function/RPC.
   - Existing payment_reference is reused.
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        "use strict";

        /* ===================================================
           DOM HELPERS
           =================================================== */

        const $ = (id) =>
            document.getElementById(id);

        const qs =
            new URLSearchParams(
                window.location.search
            );

        const orderId =
            String(
                qs.get("order_id") || ""
            ).trim();

        /* ===================================================
           HTML ELEMENTS
           Matches payment.html
           =================================================== */

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

        const cancel =
            $("cancelPayment");

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

        /* ===================================================
           STATE
           =================================================== */

        let timer = null;

        let creating = false;

        let paymentCreated = false;

        let currentOrder = null;

        let redirecting = false;

        /* ===================================================
           SUPABASE CLIENT
           =================================================== */

        const client =
            window.sb ||
            window.supabaseClient ||
            window.supabase ||
            null;

        /* ===================================================
           STATUS
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
           MONEY
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

        /* ===================================================
           ESCAPE HTML
           =================================================== */

        const esc = (value) => {
            if (
                window.TC &&
                typeof TC.esc ===
                    "function"
            ) {
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

        /* ===================================================
           TOAST
           =================================================== */

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

        /* ===================================================
           STATUS HELPERS
           =================================================== */

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

        /* ===================================================
           STOP POLLING
           =================================================== */

        const stopPolling = () => {
            if (timer) {
                clearInterval(
                    timer
                );

                timer = null;
            }
        };

        /* ===================================================
           FORCE HIDE LOADING
           ---------------------------------------------------
           Important because payment.css may contain
           display:flex/display:grid rules.
           =================================================== */

        const hidePaymentLoading = () => {
            if (!loading) {
                return;
            }

            loading.hidden = true;

            loading.setAttribute(
                "hidden",
                ""
            );

            loading.setAttribute(
                "aria-hidden",
                "true"
            );

            loading.style.display =
                "none";

            loading.style.visibility =
                "hidden";

            loading.style.opacity =
                "0";

            loading.style.pointerEvents =
                "none";
        };

        /* ===================================================
           SHOW PAYMENT CONTENT
           =================================================== */

        const showPaymentContent = () => {
            if (!content) {
                return;
            }

            content.hidden = false;

            content.removeAttribute(
                "hidden"
            );

            content.style.display =
                "";

            content.style.visibility =
                "visible";

            content.style.opacity =
                "1";
        };

        /* ===================================================
           HIDE PAYMENT CONTENT
           =================================================== */

        const hidePaymentContent = () => {
            if (!content) {
                return;
            }

            content.hidden = true;

            content.setAttribute(
                "hidden",
                ""
            );
        };

        /* ===================================================
           HIDE ERROR
           =================================================== */

        const hideError = () => {
            if (!errorBox) {
                return;
            }

            errorBox.hidden = true;

            errorBox.setAttribute(
                "hidden",
                ""
            );

            errorBox.innerHTML = "";
        };

        /* ===================================================
           FAIL SCREEN
           =================================================== */

        const fail = (
            message
        ) => {
            stopPolling();

            hidePaymentLoading();

            hidePaymentContent();

            if (!errorBox) {
                return;
            }

            errorBox.hidden = false;

            errorBox.removeAttribute(
                "hidden"
            );

            errorBox.innerHTML = `
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>
                    ${esc(
                        message ||
                            "Gagal memuat pembayaran."
                    )}
                </span>
            `;
        };

        /* ===================================================
           CHECK SUPABASE
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

            window.location.href =
                `login.html?redirect=${encodeURIComponent(
                    window.location.href
                )}`;

            return;
        }

        if (!user?.id) {
            window.location.href =
                `login.html?redirect=${encodeURIComponent(
                    window.location.href
                )}`;

            return;
        }

        /* ===================================================
           ORDER ID VALIDATION
           =================================================== */

        if (!orderId) {
            fail(
                "Order ID tidak ditemukan."
            );

            return;
        }

        /* ===================================================
           LOAD ORDER
           ---------------------------------------------------
           Uses ONLY canonical columns from SQL.
           =================================================== */

        const loadOrder =
            async () => {
                const {
                    data,
                    error
                } = await client
                    .from("orders")
                    .select(
                        `
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
                        `
                    )
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
                if (!order) {
                    return;
                }

                if (orderIdEl) {
                    orderIdEl.textContent =
                        order.id || orderId;
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
                    const type =
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
                                (char) =>
                                    char.toUpperCase()
                            );

                    orderType.textContent =
                        type;
                }
            };

        /* ===================================================
           RENDER STATUS
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
                        statusIcon.innerHTML = `
                            <i class="fa-solid fa-circle-check"></i>
                        `;
                    }

                    if (statusTitle) {
                        statusTitle.textContent =
                            "Pembayaran berhasil";
                    }

                    if (statusText) {
                        statusText.textContent =
                            "Pembayaran sudah diverifikasi dan order kamu telah berhasil.";
                    }

                    if (statusPill) {
                        statusPill.textContent =
                            "PAID";
                    }

                    stopPolling();

                    if (check) {
                        check.disabled =
                            true;
                    }

                    if (cancel) {
                        cancel.disabled =
                            true;
                    }

                    /*
                     * Prevent multiple redirects.
                     */
                    if (
                        !redirecting
                    ) {
                        redirecting =
                            true;

                        setTimeout(
                            () => {
                                window.location.href =
                                    `payment-success.html?order_id=${encodeURIComponent(
                                        orderId
                                    )}`;
                            },
                            600
                        );
                    }

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
                        statusIcon.innerHTML = `
                            <i class="fa-solid fa-circle-xmark"></i>
                        `;
                    }

                    if (statusTitle) {
                        statusTitle.textContent =
                            "Pembayaran tidak berhasil";
                    }

                    if (statusText) {
                        statusText.textContent =
                            "Order ini sudah tidak dapat dibayar.";
                    }

                    if (statusPill) {
                        statusPill.textContent =
                            normalized.toUpperCase();
                    }

                    stopPolling();

                    if (check) {
                        check.disabled =
                            true;
                    }

                    if (cancel) {
                        cancel.disabled =
                            true;
                    }

                    return "failed";
                }

                /* =========================================
                   PENDING
                   ========================================= */

                if (statusIcon) {
                    statusIcon.innerHTML = `
                        <i class="fa-solid fa-clock"></i>
                    `;
                }

                if (statusTitle) {
                    statusTitle.textContent =
                        "Menunggu pembayaran";
                }

                if (statusText) {
                    statusText.textContent =
                        "Silakan selesaikan pembayaran. Sistem akan memverifikasi pembayaran secara otomatis.";
                }

                if (statusPill) {
                    statusPill.textContent =
                        "PENDING";
                }

                return "pending";
            };

        /* ===================================================
           EXTRACT BAYARGG PAYMENT
           =================================================== */

        const extractPayment =
            (response) => {
                /*
                 * Supabase functions.invoke()
                 * normally returns:
                 *
                 * {
                 *   data: {...},
                 *   error: null
                 * }
                 *
                 * Some backend responses may
                 * additionally wrap data:
                 *
                 * {
                 *   data: {
                 *      data: {...}
                 *   }
                 * }
                 */

                const level1 =
                    response?.data ??
                    response ??
                    {};

                const data =
                    level1?.data &&
                    typeof level1.data ===
                        "object"
                        ? level1.data
                        : level1;

                return {
                    success:
                        data?.success !==
                        false,

                    qris:
                        String(
                            data?.qris_string ??
                                data?.qr_string ??
                                data?.qris ??
                                ""
                        ).trim(),

                    paymentUrl:
                        String(
                            data?.payment_url ??
                                data?.paymentUrl ??
                                data?.url ??
                                ""
                        ).trim(),

                    invoiceId:
                        String(
                            data?.invoice_id ??
                                data?.invoiceId ??
                                ""
                        ).trim(),

                    status:
                        normalizeStatus(
                            data?.status
                        ),

                    finalAmount:
                        data?.final_amount ??
                        data?.finalAmount ??
                        null,

                    raw: data
                };
            };

        /* ===================================================
           READ EDGE FUNCTION ERROR
           =================================================== */

        const getFunctionError =
            async (
                response,
                fallback
            ) => {
                let message =
                    response?.error
                        ?.message ||
                    fallback;

                try {
                    const context =
                        response?.error
                            ?.context;

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
                    /* Ignore parsing failure */
                }

                return message;
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

                        script.dataset.pasteleQrcode =
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
           RENDER PAYMENT
           =================================================== */

        const renderPayment =
            async ({
                qris = "",
                paymentUrl = ""
            } = {}) => {
                /*
                 * Payment information is now being
                 * rendered, therefore loading screen
                 * must disappear.
                 */

                hidePaymentLoading();

                showPaymentContent();

                if (!qr) {
                    return;
                }

                qr.innerHTML = "";

                /* =========================================
                   QRIS
                   ========================================= */

                if (qris) {
                    await loadQr();

                    qr.innerHTML = `
                        <div class="qr-title">
                            <i class="fa-solid fa-qrcode"></i>
                            <span>
                                Scan QRIS Di Bawah Ini
                            </span>
                        </div>

                        <div
                            id="bayarggQr"
                            class="bayargg-qr"
                            aria-label="QRIS pembayaran"
                        ></div>

                        <small class="qr-hint">
                            Scan menggunakan aplikasi bank atau e-wallet yang mendukung QRIS.
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
                            text: qris,
                            width: 240,
                            height: 240,
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
                }

                /* =========================================
                   PAYMENT URL ONLY
                   ========================================= */

                else if (
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
                }

                /* =========================================
                   NOTHING YET
                   ========================================= */

                else {
                    qr.innerHTML = `
                        <div class="qr-loading">
                            <i class="fa-solid fa-clock"></i>

                            <span>
                                Menunggu data pembayaran...
                            </span>
                        </div>
                    `;
                }

                /* =========================================
                   BAYARGG BUTTON
                   ========================================= */

                if (urlBtn) {
                    if (paymentUrl) {
                        urlBtn.hidden =
                            false;

                        urlBtn.removeAttribute(
                            "hidden"
                        );

                        urlBtn.href =
                            paymentUrl;

                        urlBtn.target =
                            "_blank";

                        urlBtn.rel =
                            "noopener noreferrer";

                        urlBtn.innerHTML = `
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            <span>
                                Buka Pembayaran
                            </span>
                        `;
                    } else {
                        urlBtn.hidden =
                            true;

                        urlBtn.setAttribute(
                            "hidden",
                            ""
                        );

                        urlBtn.removeAttribute(
                            "href"
                        );
                    }
                }

                /*
                 * IMPORTANT:
                 * Never allow loading screen to
                 * remain after payment data exists.
                 */
                hidePaymentLoading();
            };

        /* ===================================================
           CREATE / REUSE PAYMENT
           ---------------------------------------------------
           Backend is responsible for reusing an existing
           payment_reference.

           Therefore frontend can safely call this for a
           pending order even after page reload.
           =================================================== */

        const createPayment =
            async (order) => {
                if (
                    creating ||
                    paymentCreated
                ) {
                    return null;
                }

                if (!order) {
                    return null;
                }

                if (
                    isSuccess(
                        order.status
                    ) ||
                    isFailed(
                        order.status
                    )
                ) {
                    return null;
                }

                creating = true;

                try {
                    if (qr) {
                        qr.innerHTML = `
                            <div class="qr-loading">
                                <i class="fa-solid fa-spinner fa-spin"></i>

                                <span>
                                    Menyiapkan QRIS Bayar.gg...
                                </span>
                            </div>
                        `;
                    }

                    /*
                     * IMPORTANT:
                     *
                     * We intentionally call the same
                     * Edge Function even when
                     * payment_reference already exists.
                     *
                     * The backend is responsible for
                     * reusing the existing invoice.
                     *
                     * This prevents the frontend from
                     * losing the QR after reload.
                     */

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
                        const message =
                            await getFunctionError(
                                response,
                                "Gagal menghubungi Edge Function pembayaran."
                            );

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

                    /*
                     * Payment must contain either
                     * QRIS or a payment URL.
                     */

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

                    if (
                        payment.invoiceId
                    ) {
                        console.info(
                            "[Payment] BayarGG invoice:",
                            payment.invoiceId
                        );
                    }

                    return payment;
                } finally {
                    creating = false;
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
                    const message =
                        await getFunctionError(
                            response,
                            "Gagal mengecek status pembayaran."
                        );

                    throw new Error(
                        message
                    );
                }

                const raw =
                    response?.data ??
                    {};

                const data =
                    raw?.data &&
                    typeof raw.data ===
                        "object"
                        ? raw.data
                        : raw;

                return (
                    data || null
                );
            };

        /* ===================================================
           POLL PAYMENT
           =================================================== */

        const poll =
            async () => {
                if (
                    redirecting
                ) {
                    return;
                }

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
                 * Ask backend to synchronize
                 * gateway status.
                 */

                const gateway =
                    await checkGatewayStatus();

                if (!gateway) {
                    return;
                }

                /*
                 * Some backend responses may
                 * return updated payment data.
                 *
                 * If QR/payment URL exists,
                 * render it without creating
                 * another invoice.
                 */

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

                /*
                 * Gateway status is NOT authoritative
                 * for frontend order UI.
                 *
                 * The database order status is.
                 */

                const gatewayStatus =
                    normalizeStatus(
                        gateway.status ||
                            gateway.payment_status ||
                            gateway.paymentStatus
                    );

                /*
                 * If gateway says paid, give the
                 * Edge Function a moment to settle
                 * the database, then reload it.
                 */

                if (
                    gatewayStatus ===
                        "paid" ||
                    gatewayStatus ===
                        "success" ||
                    gatewayStatus ===
                        "completed"
                ) {
                    /*
                     * First immediate reload.
                     */

                    let refreshed =
                        await loadOrder();

                    currentOrder =
                        refreshed;

                    let result =
                        renderStatus(
                            refreshed.status
                        );

                    /*
                     * In normal operation the Edge
                     * Function/RPC has already settled
                     * the order.
                     *
                     * If there is a tiny propagation
                     * delay, retry once shortly.
                     */

                    if (
                        result ===
                        "pending"
                    ) {
                        await new Promise(
                            (resolve) =>
                                setTimeout(
                                    resolve,
                                    700
                                )
                        );

                        refreshed =
                            await loadOrder();

                        currentOrder =
                            refreshed;

                        result =
                            renderStatus(
                                refreshed.status
                            );
                    }

                    return;
                }

                /*
                 * Gateway still pending.
                 *
                 * Do not modify orders from
                 * frontend.
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
                            navigator.clipboard &&
                            window.isSecureContext
                        ) {
                            await navigator
                                .clipboard
                                .writeText(
                                    orderId
                                );

                            toast(
                                "Order ID berhasil disalin.",
                                "success"
                            );

                            return;
                        }

                        /*
                         * Fallback for older browsers.
                         */

                        const textarea =
                            document.createElement(
                                "textarea"
                            );

                        textarea.value =
                            orderId;

                        textarea.style.position =
                            "fixed";

                        textarea.style.opacity =
                            "0";

                        document.body.appendChild(
                            textarea
                        );

                        textarea.focus();

                        textarea.select();

                        const copied =
                            document.execCommand(
                                "copy"
                            );

                        textarea.remove();

                        if (!copied) {
                            throw new Error(
                                "Clipboard tidak tersedia."
                            );
                        }

                        toast(
                            "Order ID berhasil disalin.",
                            "success"
                        );
                    } catch (
                        error
                    ) {
                        console.error(
                            "[Payment] Copy:",
                            error
                        );

                        toast(
                            "Gagal menyalin Order ID.",
                            "error"
                        );
                    }
                };
        }

        /* ===================================================
           CANCEL BUTTON
           ---------------------------------------------------
           IMPORTANT:
           There is currently no buyer-facing cancel
           RPC in the canonical SQL.

           Therefore this button ONLY leaves the
           payment page. It does NOT directly update
           orders.status.
           =================================================== */

        if (cancel) {
            cancel.onclick =
                (event) => {
                    event.preventDefault();

                    if (
                        isSuccess(
                            currentOrder?.status
                        )
                    ) {
                        return;
                    }

                    const confirmed =
                        window.confirm(
                            "Batalkan halaman pembayaran ini? Order tetap tersimpan dan belum dianggap dibatalkan."
                        );

                    if (!confirmed) {
                        return;
                    }

                    stopPolling();

                    /*
                     * Do NOT update orders.status here.
                     * Current SQL has no secure buyer-cancel
                     * RPC.
                     */

                    if (
                        document.referrer &&
                        document.referrer.startsWith(
                            window.location.origin
                        )
                    ) {
                        window.history.back();
                    } else {
                        window.location.href =
                            "marketplace.html";
                    }
                };
        }

        /* ===================================================
           MAIN FLOW
           =================================================== */

        try {
            /*
             * Ensure initial state.
             */

            hideError();

            if (content) {
                content.hidden = true;
                content.setAttribute(
                    "hidden",
                    ""
                );
            }

            /*
             * Keep loading visible only while
             * order is being fetched.
             */

            if (loading) {
                loading.hidden = false;

                loading.removeAttribute(
                    "aria-hidden"
                );

                loading.style.display =
                    "";

                loading.style.visibility =
                    "visible";

                loading.style.opacity =
                    "1";

                loading.style.pointerEvents =
                    "";
            }

            /* ===============================================
               LOAD ORDER
               =============================================== */

            currentOrder =
                await loadOrder();

            /* ===============================================
               RENDER ORDER
               =============================================== */

            renderOrder(
                currentOrder
            );

            /*
             * Order is successfully loaded.
             * The big loading screen must disappear NOW.
             *
             * Do not wait for gateway.
             */

            hidePaymentLoading();

            showPaymentContent();

            hideError();

            /* ===============================================
               INITIAL STATUS
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
               CREATE / REUSE BAYARGG PAYMENT
               =============================================== */

            /*
             * IMPORTANT:
             *
             * Whether payment_reference exists or not,
             * call create-bayargg-payment.
             *
             * Backend handles invoice reuse.
             *
             * This solves the previous problem where
             * QR disappeared after page reload.
             */

            try {
                await createPayment(
                    currentOrder
                );
            } catch (
                paymentError
            ) {
                console.error(
                    "[Payment] Create/reuse:",
                    paymentError
                );

                /*
                 * Do not immediately destroy the whole
                 * payment page if gateway check can still
                 * recover an existing invoice.
                 */

                if (
                    currentOrder
                        .payment_reference
                ) {
                    try {
                        const gateway =
                            await checkGatewayStatus();

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
                    } catch (
                        recoveryError
                    ) {
                        console.warn(
                            "[Payment] Existing payment recovery:",
                            recoveryError
                        );
                    }
                }

                /*
                 * If QR is still unavailable,
                 * show a useful message inside QR area,
                 * while keeping order information visible.
                 */

                if (
                    qr &&
                    !qr.innerHTML.trim()
                ) {
                    qr.innerHTML = `
                        <div class="qr-loading">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>
                                Pembayaran belum dapat dimuat.
                                Tekan "Cek Pembayaran" untuk mencoba lagi.
                            </span>
                        </div>
                    `;
                }
            }

            /* ===============================================
               START POLLING
               =============================================== */

            if (
                !timer
            ) {
                timer =
                    setInterval(
                        () => {
                            poll().catch(
                                (
                                    error
                                ) => {
                                    console.warn(
                                        "[Payment] Poll error:",
                                        error
                                    );
                                }
                            );
                        },
                        5000
                    );
            }

            /* ===============================================
               MANUAL CHECK
               =============================================== */

            if (check) {
                check.onclick =
                    async (
                        event
                    ) => {
                        event.preventDefault();

                        if (
                            check.disabled ||
                            redirecting
                        ) {
                            return;
                        }

                        check.disabled =
                            true;

                        const originalHTML =
                            check.innerHTML;

                        check.innerHTML = `
                            <i class="fa-solid fa-spinner fa-spin"></i>
                            <span>Mengecek...</span>
                        `;

                        try {
                            /*
                             * Reload order first.
                             */

                            currentOrder =
                                await loadOrder();

                            renderOrder(
                                currentOrder
                            );

                            const status =
                                renderStatus(
                                    currentOrder.status
                                );

                            if (
                                status ===
                                    "success" ||
                                status ===
                                    "failed"
                            ) {
                                return;
                            }

                            /*
                             * Check gateway.
                             */

                            const gateway =
                                await checkGatewayStatus();

                            /*
                             * Render returned QR if
                             * backend provides it.
                             */

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

                            /*
                             * Reload DB after gateway
                             * synchronization.
                             */

                            currentOrder =
                                await loadOrder();

                            renderOrder(
                                currentOrder
                            );

                            renderStatus(
                                currentOrder.status
                            );

                            if (
                                isSuccess(
                                    currentOrder.status
                                )
                            ) {
                                toast(
                                    "Pembayaran berhasil diverifikasi.",
                                    "success"
                                );

                                return;
                            }

                            if (
                                isFailed(
                                    currentOrder.status
                                )
                            ) {
                                toast(
                                    "Pembayaran tidak berhasil.",
                                    "error"
                                );

                                return;
                            }

                            toast(
                                "Pembayaran masih menunggu. Jika sudah membayar, tunggu beberapa detik lalu cek kembali.",
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
                             * Restore button unless
                             * payment has finished.
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

                                check.innerHTML =
                                    originalHTML;
                            }
                        }
                    };
            }

            /* ===============================================
               VISIBILITY CHANGE
               =============================================== */

            document.addEventListener(
                "visibilitychange",
                () => {
                    if (
                        document.hidden
                    ) {
                        return;
                    }

                    if (
                        !currentOrder
                    ) {
                        return;
                    }

                    if (
                        isSuccess(
                            currentOrder.status
                        ) ||
                        isFailed(
                            currentOrder.status
                        )
                    ) {
                        return;
                    }

                    poll().catch(
                        () => {}
                    );
                }
            );

            /* ===============================================
               CLEANUP
               =============================================== */

            window.addEventListener(
                "beforeunload",
                stopPolling
            );
        } catch (
            error
        ) {
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
