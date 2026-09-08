/* =========================================================
   PasTele — PREMIUM / ACCOUNT PLAN
   FINAL SQL SYNC
   PROFILE:
   - username
   - display_name
   - is_premium
   - subscription_until
   RPC:
   create_account_plan_order(
       p_plan text,
       p_days integer,
       p_amount numeric
   )
   PREMIUM:
   plan   = premium
   days   = 0
   amount = 250000
   RPC creates:
   orders.item_type = account_plan
   orders.item_id   = premium
   orders.status    = pending
   ========================================================= */
document.addEventListener(
    "DOMContentLoaded",
    async () => {
        "use strict";
        /* ===================================================
           DOM
           =================================================== */
        const $ = (id) =>
            document.getElementById(id);
        const status =
            $("planStatus");
        const planName =
            $("planName");
        const planUsername =
            $("planUsername");
        const planAvatar =
            $("planAvatar");
        const buyButton =
            $("premiumBuy");
        /* ===================================================
           CLIENT
           =================================================== */
        const client =
            window.sb ||
            window.supabaseClient ||
            window.supabase ||
            null;
        /* ===================================================
           HELPERS
           =================================================== */
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
                type === "error"
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
        const setButtonLoading =
            (
                loading
            ) => {
                if (!buyButton) {
                    return;
                }
                if (loading) {
                    buyButton.disabled =
                        true;
                    buyButton.dataset
                        .originalHtml ??=
                        buyButton.innerHTML;
                    buyButton.innerHTML = `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        Menyiapkan checkout...
                    `;
                } else {
                    buyButton.disabled =
                        false;
                    if (
                        buyButton.dataset
                            .originalHtml
                    ) {
                        buyButton.innerHTML =
                            buyButton.dataset
                                .originalHtml;
                    }
                }
            };
        /* ===================================================
           DATABASE CHECK
           =================================================== */
        if (!client) {
            toast(
                "Database belum terkonfigurasi.",
                "error"
            );
            return;
        }
        /* ===================================================
           AUTH / PROFILE
           =================================================== */
        let profile = null;
        try {
            if (
                !window.TC ||
                typeof TC.profile !==
                    "function"
            ) {
                throw new Error(
                    "Sesi login tidak tersedia."
                );
            }
            profile =
                await TC.profile();
        } catch (error) {
            console.warn(
                "[Premium] Profile error:",
                error
            );
            const next =
                encodeURIComponent(
                    window.location.href
                );
            window.location.href =
                `login.html?redirect=${next}`;
            return;
        }
        if (!profile?.id) {
            const next =
                encodeURIComponent(
                    window.location.href
                );
            window.location.href =
                `login.html?redirect=${next}`;
            return;
        }
        /* ===================================================
           PROFILE UI
           =================================================== */
        const name =
            String(
                profile.display_name ||
                    profile.username ||
                    "User"
            )
                .trim()
                .slice(0, 100);
        if (planName) {
            planName.replaceChildren(
                document.createTextNode(
                    name
                )
            );
            const badge =
                document.createElement(
                    "span"
                );
            badge.className =
                "verify-badge blue";
            badge.innerHTML = `
                <i class="fa-solid fa-check"></i>
            `;
            planName.appendChild(
                badge
            );
        }
        if (planUsername) {
            planUsername.textContent =
                profile.username
                    ? `@${profile.username}`
                    : "@user";
        }
        if (planAvatar) {
            planAvatar.textContent =
                name
                    .charAt(0)
                    .toUpperCase() ||
                "U";
        }
        /* ===================================================
           PREMIUM STATUS
           =================================================== */
        const premiumActive =
            profile.is_premium === true;
        if (
            premiumActive &&
            status
        ) {
            status.innerHTML = `
                <div class="active-plan premium-active">
                    <i class="fa-solid fa-circle-check"></i>
                    <div>
                        <b>
                            Premium Aktif
                        </b>
                        <span>
                            Semua akses Paid sudah terbuka.
                        </span>
                    </div>
                </div>
            `;
        }
        /*
         * If already premium, buying again
         * should not create another account-plan
         * order from this page.
         */
        if (
            premiumActive &&
            buyButton
        ) {
            buyButton.disabled =
                true;
            buyButton.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                Premium Sudah Aktif
            `;
        }
        /* ===================================================
           PREMIUM CHECKOUT
           =================================================== */
        buyButton?.addEventListener(
            "click",
            async () => {
                if (
                    buyButton.disabled
                ) {
                    return;
                }
                /*
                 * Re-check profile before creating
                 * the order so an already activated
                 * account cannot accidentally create
                 * another checkout.
                 */
                let latestProfile =
                    profile;
                try {
                    if (
                        typeof TC.profile ===
                        "function"
                    ) {
                        const fresh =
                            await TC.profile();
                        if (fresh?.id) {
                            latestProfile =
                                fresh;
                        }
                    }
                } catch {
                    /* Keep existing profile */
                }
                if (
                    latestProfile
                        ?.is_premium ===
                    true
                ) {
                    if (status) {
                        status.innerHTML = `
                            <div class="active-plan premium-active">
                                <i class="fa-solid fa-circle-check"></i>
                                <div>
                                    <b>
                                        Premium Aktif
                                    </b>
                                    <span>
                                        Semua akses Paid sudah terbuka.
                                    </span>
                                </div>
                            </div>
                        `;
                    }
                    buyButton.disabled =
                        true;
                    buyButton.innerHTML = `
                        <i class="fa-solid fa-circle-check"></i>
                        Premium Sudah Aktif
                    `;
                    toast(
                        "Akun kamu sudah Premium.",
                        "success"
                    );
                    return;
                }
                setButtonLoading(
                    true
                );
                try {
                    /*
                     * SQL validates:
                     *
                     * p_plan   = premium
                     * p_days   = 0
                     * p_amount = 250000
                     */
                    const result =
                        await client.rpc(
                            "create_account_plan_order",
                            {
                                p_plan:
                                    "premium",
                                p_days:
                                    0,
                                p_amount:
                                    250000
                            }
                        );
                    if (
                        result.error
                    ) {
                        throw result.error;
                    }
                    const data =
                        Array.isArray(
                            result.data
                        )
                            ? result.data[0]
                            : result.data;
                    if (
                        !data?.order_id
                    ) {
                        throw new Error(
                            "Order Premium tidak berhasil dibuat."
                        );
                    }
                    /*
                     * Optional sanity check.
                     */
                    const createdOrderId =
                        String(
                            data.order_id
                        ).trim();
                    if (
                        !createdOrderId
                    ) {
                        throw new Error(
                            "Order ID Premium tidak valid."
                        );
                    }
                    /*
                     * Continue to the same payment
                     * page used by marketplace orders.
                     */
                    window.location.href =
                        `payment.html?order_id=${encodeURIComponent(
                            createdOrderId
                        )}`;
                } catch (
                    error
                ) {
                    console.error(
                        "[Premium] Checkout error:",
                        error
                    );
                    const message =
                        String(
                            error?.message ||
                                ""
                        );
                    if (
                        message
                            .toLowerCase()
                            .includes(
                                "invalid_plan_amount"
                            )
                    ) {
                        toast(
                            "Harga Premium tidak sesuai konfigurasi database.",
                            "error"
                        );
                    } else if (
                        message
                            .toLowerCase()
                            .includes(
                                "invalid_plan"
                            )
                    ) {
                        toast(
                            "Paket Premium tidak valid.",
                            "error"
                        );
                    } else if (
                        message
                            .toLowerCase()
                            .includes(
                                "login_required"
                            )
                    ) {
                        const next =
                            encodeURIComponent(
                                window.location.href
                            );
                        window.location.href =
                            `login.html?redirect=${next}`;
                        return;
                    } else {
                        toast(
                            message ||
                                "Checkout Premium gagal dibuat.",
                            "error"
                        );
                    }
                    setButtonLoading(
                        false
                    );
                }
            }
        );
    }
);
