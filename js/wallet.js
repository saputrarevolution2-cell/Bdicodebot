/* =========================================================
   PasTele — Wallet
   FINAL PREMIUM
   Real Supabase data
   Existing schema only
   Matched with wallet.html
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    /* =====================================================
       DOM HELPERS
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    const $$ = (selector, root = document) => {
        try {
            return Array.from(
                root.querySelectorAll(selector)
            );
        } catch {
            return [];
        }
    };


    /* =====================================================
       DOM
       ===================================================== */

    const availableEl = $("available");
    const availableEls = $$(
        "#available"
    );

    /*
     * HTML saat ini masih mempunyai duplicate id="available".
     * Ambil semua elemen supaya keduanya tetap sinkron.
     */
    const balanceHeroValueEl =
        document.querySelector(
            ".wallet-balance-hero .wallet-balance-value"
        );

    const pendingEl = $("pending");
    const incomeEl = $("income");
    const todayEl = $("today");

    const breakdownEl = $("breakdown");
    const recentActivityEl =
        $("recentActivity");

    const refreshBtn =
        $("refreshWallet");

    const copyBalanceBtn =
        $("copyBalance");

    const pendingCard =
        $("pendingCard");

    const withdrawPanel =
        $("withdrawStatusPanel");


    /* =====================================================
       STATE
       ===================================================== */

    let profile = null;
    let wallet = null;

    let walletRows = [];
    let transactionRows = [];

    let allRows = [];

    let isLoading = false;
    let pendingModal = null;


    /* =====================================================
       GLOBALS
       ===================================================== */

    const getTC = () => {
        return window.TC || {};
    };


    const getSB = () => {
        return (
            window.sb ||
            window.supabaseClient ||
            null
        );
    };


    /* =====================================================
       MONEY
       ===================================================== */

    const money = (value) => {

        const number =
            Number(value ?? 0);

        const amount =
            Number.isFinite(number)
                ? number
                : 0;

        const TC = getTC();

        if (
            typeof TC.money ===
            "function"
        ) {
            try {
                return TC.money(amount);
            } catch {}
        }

        return new Intl.NumberFormat(
            "id-ID",
            {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0
            }
        ).format(amount);
    };


    /* =====================================================
       TOAST
       ===================================================== */

    const showToast = (
        message,
        type = "info"
    ) => {

        const TC = getTC();

        if (
            typeof TC.toast ===
            "function"
        ) {
            try {
                TC.toast(
                    message,
                    type
                );
                return;
            } catch {}
        }

        const toast =
            $("toast");

        if (!toast) {
            return;
        }

        toast.textContent =
            String(
                message || ""
            );

        toast.classList.add(
            "show"
        );

        clearTimeout(
            toast._walletTimer
        );

        toast._walletTimer =
            setTimeout(
                () => {
                    toast.classList.remove(
                        "show"
                    );
                },
                2800
            );
    };


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    const esc = (value) => {

        const TC = getTC();

        if (
            typeof TC.esc ===
            "function"
        ) {
            try {
                return TC.esc(
                    String(
                        value ?? ""
                    )
                );
            } catch {}
        }

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    };


    /* =====================================================
       AMOUNT
       ===================================================== */

    const amountOf = (
        row
    ) => {

        const value =
            row?.net_amount ??
            row?.amount ??
            row?.value ??
            0;

        const amount =
            Number(value);

        return Number.isFinite(
            amount
        )
            ? amount
            : 0;
    };


    /* =====================================================
       TYPE NORMALIZER
       ===================================================== */

    const normalizeType = (
        value
    ) => {

        const type =
            String(
                value || ""
            )
                .trim()
                .toLowerCase()
                .replace(
                    /[\s-]+/g,
                    "_"
                );


        if (
            type.includes(
                "pastelink"
            ) ||
            type.includes(
                "paste_link"
            ) ||
            type.includes(
                "pastelink"
            ) ||
            type === "link"
        ) {
            return "link";
        }


        if (
            type.includes(
                "code"
            ) ||
            type === "file"
        ) {
            return "code";
        }


        if (
            type.includes(
                "channel"
            ) ||
            type.includes(
                "broadcast"
            )
        ) {
            return "channel";
        }


        if (
            type.includes(
                "group"
            )
        ) {
            return "group";
        }


        return "other";
    };


    /* =====================================================
       TYPE LABEL
       ===================================================== */

    const typeLabel = (
        value
    ) => {

        switch (
            normalizeType(value)
        ) {

            case "link":
                return "PasteLink";

            case "code":
                return "Code";

            case "channel":
                return "Channel";

            case "group":
                return "Group";

            default:
                return "Transaksi";
        }
    };


    /* =====================================================
       TYPE ICON
       ===================================================== */

    const typeIcon = (
        value
    ) => {

        switch (
            normalizeType(value)
        ) {

            case "link":
                return "fa-link";

            case "code":
                return "fa-code";

            case "channel":
                return "fa-broadcast-tower";

            case "group":
                return "fa-users";

            default:
                return "fa-wallet";
        }
    };


    /* =====================================================
       TYPE CLASS
       ===================================================== */

    const typeClass = (
        value
    ) => {

        switch (
            normalizeType(value)
        ) {

            case "link":
                return "wallet-type-link";

            case "code":
                return "wallet-type-code";

            case "channel":
                return "wallet-type-channel";

            case "group":
                return "wallet-type-group";

            default:
                return "wallet-type-other";
        }
    };


    /* =====================================================
       STATUS
       ===================================================== */

    const statusOf = (
        row
    ) => {

        return String(
            row?.status ||
            ""
        )
            .trim()
            .toLowerCase();
    };


    /* =====================================================
       STATUS HELPERS
       ===================================================== */

    const isGoodTransaction = (
        row
    ) => {

        const status =
            statusOf(row);

        return [
            "completed",
            "complete",
            "paid",
            "available",
            "success",
            "successful",
            "succeeded"
        ].includes(status)
        &&
        amountOf(row) > 0;
    };


    const isPendingTransaction = (
        row
    ) => {

        const status =
            statusOf(row);

        return [
            "pending",
            "waiting",
            "hold",
            "held",
            "processing"
        ].includes(status)
        &&
        amountOf(row) > 0;
    };


    const isFailedTransaction = (
        row
    ) => {

        return [
            "failed",
            "cancelled",
            "canceled",
            "rejected",
            "declined",
            "expired"
        ].includes(
            statusOf(row)
        );
    };


    /* =====================================================
       DATE
       ===================================================== */

    const formatDate = (
        value
    ) => {

        if (!value) {
            return "-";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "-";
        }

        return date.toLocaleString(
            "id-ID",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    };


    const isToday = (
        value
    ) => {

        if (!value) {
            return false;
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return false;
        }

        const now =
            new Date();

        return (
            date.getFullYear() ===
                now.getFullYear()
            &&
            date.getMonth() ===
                now.getMonth()
            &&
            date.getDate() ===
                now.getDate()
        );
    };


    /* =====================================================
       GET PROFILE
       ===================================================== */

    const getProfile = async () => {

        const TC = getTC();

        /*
         * Prefer existing application profile helper.
         */
        if (
            typeof TC.profile ===
            "function"
        ) {
            try {

                const result =
                    await TC.profile();

                if (
                    result?.id
                ) {
                    return result;
                }

                /*
                 * Some helpers may return
                 * { profile: {...} }.
                 */
                if (
                    result?.profile?.id
                ) {
                    return result.profile;
                }

            } catch (error) {

                console.warn(
                    "TC.profile:",
                    error?.message ||
                    error
                );
            }
        }


        /*
         * Supabase auth fallback.
         */
        const sb =
            getSB();

        if (
            sb?.auth?.getUser
        ) {

            const {
                data,
                error
            } =
                await sb.auth.getUser();

            if (
                error
            ) {
                throw error;
            }

            if (
                data?.user?.id
            ) {
                return data.user;
            }
        }


        return null;
    };


    /* =====================================================
       LOADING STATE
       ===================================================== */

    const setLoadingState = (
        loading
    ) => {

        isLoading =
            Boolean(loading);


        if (refreshBtn) {

            refreshBtn.disabled =
                isLoading;

            refreshBtn.classList.toggle(
                "is-loading",
                isLoading
            );

            const icon =
                refreshBtn.querySelector(
                    "i"
                );

            if (icon) {

                icon.classList.toggle(
                    "fa-spin",
                    isLoading
                );
            }
        }


        if (pendingCard) {

            pendingCard.disabled =
                isLoading;

            pendingCard.classList.toggle(
                "is-loading",
                isLoading
            );
        }


        if (breakdownEl) {

            breakdownEl.setAttribute(
                "aria-busy",
                isLoading
                    ? "true"
                    : "false"
            );
        }


        if (recentActivityEl) {

            recentActivityEl.setAttribute(
                "aria-busy",
                isLoading
                    ? "true"
                    : "false"
            );
        }
    };


    /* =====================================================
       RENDER LOADING
       ===================================================== */

    const renderLoading = () => {

        availableEls.forEach(
            (el) => {
                el.textContent =
                    "—";
            }
        );


        if (pendingEl) {
            pendingEl.textContent =
                "—";
        }


        if (incomeEl) {
            incomeEl.textContent =
                "—";
        }


        if (todayEl) {
            todayEl.textContent =
                "—";
        }


        if (
            balanceHeroValueEl
        ) {
            balanceHeroValueEl.textContent =
                "—";
        }


        if (breakdownEl) {

            breakdownEl.innerHTML = `
                <div class="wallet-loading">

                    <span class="wallet-loading-icon">
                        <i
                            class="fa-solid fa-spinner fa-spin"
                            aria-hidden="true"
                        ></i>
                    </span>

                    <span>
                        Memuat statistik...
                    </span>

                </div>
            `;
        }


        if (recentActivityEl) {

            recentActivityEl.innerHTML = `
                <div class="wallet-loading">

                    <span class="wallet-loading-icon">
                        <i
                            class="fa-solid fa-spinner fa-spin"
                            aria-hidden="true"
                        ></i>
                    </span>

                    <span>
                        Memuat aktivitas...
                    </span>

                </div>
            `;
        }
    };


    /* =====================================================
       ERROR STATE
       ===================================================== */

    const renderError = (
        message
    ) => {

        availableEls.forEach(
            (el) => {
                el.textContent =
                    "—";
            }
        );


        if (pendingEl) {
            pendingEl.textContent =
                "—";
        }


        if (incomeEl) {
            incomeEl.textContent =
                "—";
        }


        if (todayEl) {
            todayEl.textContent =
                "—";
        }


        if (
            balanceHeroValueEl
        ) {
            balanceHeroValueEl.textContent =
                "—";
        }


        if (breakdownEl) {

            breakdownEl.innerHTML = `
                <div class="wallet-state">

                    <div class="wallet-state-icon">
                        <i
                            class="fa-solid fa-triangle-exclamation"
                            aria-hidden="true"
                        ></i>
                    </div>

                    <strong>
                        Wallet gagal dimuat
                    </strong>

                    <span>
                        ${esc(
                            message ||
                            "Terjadi kesalahan saat mengambil data keuangan."
                        )}
                    </span>

                    <button
                        class="btn primary"
                        id="walletRetry"
                        type="button"
                    >
                        <i
                            class="fa-solid fa-rotate"
                            aria-hidden="true"
                        ></i>

                        Coba Lagi
                    </button>

                </div>
            `;
        }


        if (recentActivityEl) {

            recentActivityEl.innerHTML = `
                <div class="wallet-activity-empty">

                    <span class="wallet-activity-empty-icon">

                        <i
                            class="fa-solid fa-circle-exclamation"
                            aria-hidden="true"
                        ></i>

                    </span>

                    <div>

                        <strong>
                            Aktivitas tidak tersedia
                        </strong>

                        <span>
                            Muat ulang halaman untuk mencoba lagi.
                        </span>

                    </div>

                </div>
            `;
        }


        $("walletRetry")
            ?.addEventListener(
                "click",
                () => loadWallet()
            );
    };


    /* =====================================================
       FETCH WALLET DATA
       ===================================================== */

    const fetchWalletData =
        async () => {

            const sb =
                getSB();

            if (!sb) {

                throw new Error(
                    "Supabase belum tersedia. Periksa konfigurasi."
                );
            }


            if (!profile?.id) {

                throw new Error(
                    "ID akun tidak ditemukan."
                );
            }


            /*
             * Release matured wallet balances.
             *
             * Failure is non-blocking because the
             * RPC may not be available to every role.
             */
            try {

                const {
                    error
                } =
                    await sb.rpc(
                        "release_matured_wallet"
                    );

                if (error) {

                    console.warn(
                        "release_matured_wallet:",
                        error.message
                    );
                }

            } catch (error) {

                console.warn(
                    "release_matured_wallet:",
                    error?.message ||
                    error
                );
            }


            const [
                walletResponse,
                walletTransactionsResponse,
                transactionsResponse
            ] =
                await Promise.all([

                    sb
                        .from("wallets")
                        .select("*")
                        .eq(
                            "user_id",
                            profile.id
                        )
                        .maybeSingle(),

                    sb
                        .from(
                            "wallet_transactions"
                        )
                        .select("*")
                        .eq(
                            "user_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        )
                        .limit(500),

                    sb
                        .from("transactions")
                        .select("*")
                        .eq(
                            "user_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        )
                        .limit(500)
                ]);


            if (
                walletResponse?.error
            ) {
                throw walletResponse.error;
            }


            if (
                walletTransactionsResponse?.error
            ) {
                throw walletTransactionsResponse.error;
            }


            if (
                transactionsResponse?.error
            ) {
                throw transactionsResponse.error;
            }


            return {

                wallet:
                    walletResponse?.data ||
                    null,

                walletRows:
                    Array.isArray(
                        walletTransactionsResponse?.data
                    )
                        ? walletTransactionsResponse.data
                        : [],

                transactionRows:
                    Array.isArray(
                        transactionsResponse?.data
                    )
                        ? transactionsResponse.data
                        : []
            };
        };


    /* =====================================================
       BALANCE
       ===================================================== */

    const getAvailableBalance = (
        walletData
    ) => {

        return Number(
            walletData?.available_balance ??
            walletData?.balance ??
            profile?.balance ??
            0
        ) || 0;
    };


    const getPendingBalance = (
        walletData
    ) => {

        return Number(
            walletData?.pending_balance ??
            0
        ) || 0;
    };


    const renderBalances = (
        walletData
    ) => {

        const available =
            getAvailableBalance(
                walletData
            );


        const pending =
            getPendingBalance(
                walletData
            );


        /*
         * Sync every element that currently
         * uses id="available".
         */
        availableEls.forEach(
            (el) => {

                el.textContent =
                    money(
                        available
                    );
            }
        );


        if (
            balanceHeroValueEl
        ) {

            balanceHeroValueEl.textContent =
                money(
                    available
                );
        }


        if (pendingEl) {

            pendingEl.textContent =
                money(
                    pending
                );
        }
    };


    /* =====================================================
       INCOME ROW FILTER
       ===================================================== */

    const isIncomeRow = (
        row
    ) => {

        if (!row) {
            return false;
        }


        const amount =
            amountOf(row);

        if (amount <= 0) {
            return false;
        }


        /*
         * Positive completed transaction.
         */
        if (
            isGoodTransaction(row)
        ) {
            return true;
        }


        /*
         * wallet_transactions may not
         * always have a standard status.
         */
        const type =
            String(
                row?.type ||
                ""
            ).toLowerCase();


        if (
            /^sell_/i.test(type) &&
            ![
                "failed",
                "cancelled",
                "canceled",
                "rejected"
            ].includes(
                statusOf(row)
            )
        ) {
            return true;
        }


        return false;
    };


    /* =====================================================
       DEDUPLICATE SELL TRANSACTIONS
       ===================================================== */

    const buildIncomeRows = () => {

        const result = [];

        const seen = new Set();


        /*
         * wallet_transactions first.
         */
        for (
            const row of walletRows
        ) {

            if (
                !isIncomeRow(row)
            ) {
                continue;
            }


            const key =
                [
                    row?.id,
                    row?.reference,
                    row?.transaction_id,
                    row?.created_at,
                    amountOf(row),
                    row?.type
                ]
                    .filter(
                        value =>
                            value !==
                            undefined &&
                            value !== null
                    )
                    .join("|");


            if (
                key &&
                seen.has(key)
            ) {
                continue;
            }


            if (key) {
                seen.add(key);
            }


            result.push(row);
        }


        /*
         * Add sell_* rows from transactions.
         *
         * Skip obvious duplicates where the same
         * reference already exists in wallet rows.
         */
        for (
            const row of transactionRows
        ) {

            if (
                !/^sell_/i.test(
                    String(
                        row?.type ||
                        ""
                    )
                )
            ) {
                continue;
            }


            if (
                !isIncomeRow(row)
            ) {
                continue;
            }


            const reference =
                String(
                    row?.reference ||
                    row?.payment_reference ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            const duplicate =
                result.some(
                    existing => {

                        const existingRef =
                            String(
                                existing?.reference ||
                                existing?.payment_reference ||
                                ""
                            )
                                .trim()
                                .toLowerCase();


                        if (
                            reference &&
                            existingRef &&
                            reference ===
                                existingRef
                        ) {
                            return true;
                        }


                        const sameTime =
                            existing?.created_at &&
                            row?.created_at &&
                            Math.abs(
                                new Date(
                                    existing.created_at
                                ).getTime()
                                -
                                new Date(
                                    row.created_at
                                ).getTime()
                            ) < 1500;


                        return (
                            sameTime &&
                            amountOf(
                                existing
                            ) ===
                            amountOf(row) &&
                            normalizeType(
                                existing?.type
                            ) ===
                            normalizeType(
                                row?.type
                            )
                        );
                    }
                );


            if (
                duplicate
            ) {
                continue;
            }


            result.push(row);
        }


        return result;
    };


    /* =====================================================
       INCOME STATS
       ===================================================== */

    const renderIncomeStats = (
        rows
    ) => {

        const validRows =
            rows.filter(
                isIncomeRow
            );


        const totalIncome =
            validRows.reduce(
                (
                    total,
                    row
                ) => {

                    return (
                        total +
                        amountOf(row)
                    );
                },
                0
            );


        const todayIncome =
            validRows
                .filter(
                    row =>
                        isToday(
                            row?.created_at
                        )
                )
                .reduce(
                    (
                        total,
                        row
                    ) => {

                        return (
                            total +
                            amountOf(row)
                        );
                    },
                    0
                );


        if (incomeEl) {

            incomeEl.textContent =
                money(
                    totalIncome
                );
        }


        if (todayEl) {

            todayEl.textContent =
                money(
                    todayIncome
                );
        }
    };


    /* =====================================================
       BREAKDOWN
       ===================================================== */

    const renderBreakdown = (
        rows
    ) => {

        if (!breakdownEl) {
            return;
        }


        const types = [

            {
                type: "link",
                icon: "fa-link",
                label: "PasteLink",
                className:
                    "wallet-breakdown-link"
            },

            {
                type: "code",
                icon: "fa-code",
                label: "Code",
                className:
                    "wallet-breakdown-code"
            },

            {
                type: "channel",
                icon:
                    "fa-broadcast-tower",
                label: "Channel",
                className:
                    "wallet-breakdown-channel"
            },

            {
                type: "group",
                icon: "fa-users",
                label: "Group",
                className:
                    "wallet-breakdown-group"
            }
        ];


        const validRows =
            rows.filter(
                isIncomeRow
            );


        breakdownEl.innerHTML =
            types
                .map(
                    item => {

                        const matchingRows =
                            validRows.filter(
                                row =>
                                    normalizeType(
                                        row?.type
                                    ) ===
                                    item.type
                            );


                        const total =
                            matchingRows.reduce(
                                (
                                    sum,
                                    row
                                ) => {

                                    return (
                                        sum +
                                        amountOf(row)
                                    );
                                },
                                0
                            );


                        const count =
                            matchingRows.length;


                        return `
                            <a
                                class="income-item ${item.className}"
                                href="transactions.html?type=${encodeURIComponent(item.type)}"
                                aria-label="${esc(item.label)}"
                            >

                                <span
                                    class="income-item-icon"
                                    aria-hidden="true"
                                >

                                    <i
                                        class="fa-solid ${item.icon}"
                                    ></i>

                                </span>


                                <span
                                    class="income-item-main"
                                >

                                    <b>
                                        ${esc(
                                            item.label
                                        )}
                                    </b>

                                    <small>
                                        ${count.toLocaleString(
                                            "id-ID"
                                        )}
                                        transaksi
                                    </small>

                                </span>


                                <strong>
                                    ${esc(
                                        money(total)
                                    )}
                                </strong>


                                <span
                                    class="income-item-arrow"
                                    aria-hidden="true"
                                >

                                    <i
                                        class="fa-solid fa-arrow-right"
                                    ></i>

                                </span>

                            </a>
                        `;
                    }
                )
                .join("");


        breakdownEl.setAttribute(
            "aria-busy",
            "false"
        );
    };


    /* =====================================================
       RECENT ACTIVITY
       ===================================================== */

    const renderRecentActivity = (
        rows
    ) => {

        if (!recentActivityEl) {
            return;
        }


        const sortedRows =
            [...rows]
                .filter(
                    row =>
                        amountOf(row) !==
                        0
                )
                .sort(
                    (
                        a,
                        b
                    ) => {

                        const aTime =
                            new Date(
                                a?.created_at ||
                                0
                            ).getTime();

                        const bTime =
                            new Date(
                                b?.created_at ||
                                0
                            ).getTime();

                        return (
                            bTime -
                            aTime
                        );
                    }
                )
                .slice(
                    0,
                    6
                );


        if (
            !sortedRows.length
        ) {

            recentActivityEl.innerHTML = `
                <div
                    class="wallet-activity-empty"
                >

                    <span
                        class="wallet-activity-empty-icon"
                    >

                        <i
                            class="fa-solid fa-receipt"
                            aria-hidden="true"
                        ></i>

                    </span>


                    <div>

                        <strong>
                            Belum ada aktivitas
                        </strong>

                        <span>
                            Aktivitas keuangan akan muncul di sini.
                        </span>

                    </div>

                </div>
            `;


            recentActivityEl.setAttribute(
                "aria-busy",
                "false"
            );

            return;
        }


        recentActivityEl.innerHTML =
            sortedRows
                .map(
                    renderActivityItem
                )
                .join("");


        recentActivityEl.setAttribute(
            "aria-busy",
            "false"
        );
    };


    /* =====================================================
       ACTIVITY ITEM
       ===================================================== */

    const renderActivityItem = (
        row
    ) => {

        const type =
            normalizeType(
                row?.type
            );


        const good =
            isGoodTransaction(
                row
            );


        const pending =
            isPendingTransaction(
                row
            );


        const failed =
            isFailedTransaction(
                row
            );


        const amount =
            amountOf(row);


        let stateClass =
            "activity-neutral";

        let statusText =
            "Aktivitas";

        let statusIcon =
            "fa-circle-info";


        if (good) {

            stateClass =
                "activity-success";

            statusText =
                "Berhasil";

            statusIcon =
                "fa-circle-check";

        } else if (pending) {

            stateClass =
                "activity-pending";

            statusText =
                "Pending";

            statusIcon =
                "fa-clock";

        } else if (failed) {

            stateClass =
                "activity-failed";

            statusText =
                "Gagal";

            statusIcon =
                "fa-circle-xmark";
        }


        const label =
            type === "other"
                ? String(
                    row?.type ||
                    "Transaksi"
                )
                : typeLabel(type);


        const sign =
            amount > 0
                ? "+"
                : "";


        return `
            <article
                class="wallet-activity-item ${stateClass}"
            >

                <span
                    class="wallet-activity-icon ${typeClass(type)}"
                    aria-hidden="true"
                >

                    <i
                        class="fa-solid ${typeIcon(type)}"
                    ></i>

                </span>


                <div
                    class="wallet-activity-main"
                >

                    <strong>
                        ${esc(label)}
                    </strong>


                    <span>
                        ${esc(
                            formatDate(
                                row?.created_at
                            )
                        )}
                    </span>

                </div>


                <div
                    class="wallet-activity-amount"
                >

                    <strong>
                        ${sign}${esc(
                            money(amount)
                        )}
                    </strong>


                    <small>

                        <i
                            class="fa-solid ${statusIcon}"
                            aria-hidden="true"
                        ></i>

                        ${esc(
                            statusText
                        )}

                    </small>

                </div>

            </article>
        `;
    };


    /* =====================================================
       WITHDRAW STATE
       ===================================================== */

    const updateWithdrawState = (
        walletData
    ) => {

        if (!withdrawPanel) {
            return;
        }


        const available =
            getAvailableBalance(
                walletData
            );


        const buttons =
            $$(
                ".wallet-withdraw-btn",
                withdrawPanel
            );


        buttons.forEach(
            btn => {

                btn.classList.toggle(
                    "is-disabled",
                    available <= 0
                );


                if (
                    available <= 0
                ) {

                    btn.setAttribute(
                        "aria-disabled",
                        "true"
                    );

                    btn.title =
                        "Belum ada saldo yang dapat ditarik.";

                } else {

                    btn.removeAttribute(
                        "aria-disabled"
                    );

                    btn.title =
                        `Tarik ${money(
                            available
                        )}`;
                }
            }
        );
    };


    /* =====================================================
       PENDING DETAIL
       ===================================================== */

    const showPendingDetail =
        async () => {

            const sb =
                getSB();

            if (!sb) {

                showToast(
                    "Supabase belum tersedia.",
                    "error"
                );

                return;
            }


            if (pendingModal) {
                return;
            }


            try {

                if (pendingCard) {

                    pendingCard.classList.add(
                        "is-loading"
                    );

                    pendingCard.disabled =
                        true;
                }


                const {
                    data,
                    error
                } =
                    await sb.rpc(
                        "get_pending_balance_detail"
                    );


                if (error) {
                    throw error;
                }


                const rows =
                    Array.isArray(data)
                        ? data
                        : [];


                if (!rows.length) {

                    showToast(
                        "Tidak ada saldo yang sedang tertunda.",
                        "info"
                    );

                    return;
                }


                const html =
                    rows
                        .slice(
                            0,
                            20
                        )
                        .map(
                            row => {

                                const amount =
                                    money(
                                        row?.amount ||
                                        0
                                    );


                                const created =
                                    formatDate(
                                        row?.created_at
                                    );


                                const availableAt =
                                    formatDate(
                                        row?.available_at
                                    );


                                const holdLabel =
                                    row?.hold_label ||
                                    "H1";


                                return `
                                    <div
                                        class="wallet-pending-item"
                                    >

                                        <div
                                            class="wallet-pending-item-top"
                                        >

                                            <strong>
                                                ${esc(
                                                    amount
                                                )}
                                            </strong>

                                            <span>
                                                ${esc(
                                                    holdLabel
                                                )}
                                            </span>

                                        </div>


                                        <div
                                            class="wallet-pending-meta"
                                        >

                                            <span>

                                                <i
                                                    class="fa-regular fa-clock"
                                                    aria-hidden="true"
                                                ></i>

                                                Terjual
                                                ${esc(
                                                    created
                                                )}

                                            </span>


                                            <span>

                                                <i
                                                    class="fa-solid fa-unlock"
                                                    aria-hidden="true"
                                                ></i>

                                                Tersedia
                                                ${esc(
                                                    availableAt
                                                )}

                                            </span>

                                        </div>

                                    </div>
                                `;
                            }
                        )
                        .join("");


                const overlay =
                    document.createElement(
                        "div"
                    );


                overlay.className =
                    "wallet-pending-modal";


                overlay.innerHTML = `
                    <div
                        class="wallet-pending-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pendingWalletTitle"
                    >

                        <button
                            type="button"
                            class="wallet-pending-close"
                            aria-label="Tutup"
                        >

                            <i
                                class="fa-solid fa-xmark"
                                aria-hidden="true"
                            ></i>

                        </button>


                        <span class="badge">

                            <i
                                class="fa-solid fa-clock"
                                aria-hidden="true"
                            ></i>

                            SALDO PENDING

                        </span>


                        <h2 id="pendingWalletTitle">
                            Kapan saldo tersedia?
                        </h2>


                        <p class="muted">

                            Penjualan 05:00–20:59 WIB masuk
                            <b>H1</b>.
                            Penjualan 21:00–04:59 WIB masuk
                            <b>H2</b>.

                        </p>


                        <div class="wallet-pending-list">

                            ${html}

                        </div>

                    </div>
                `;


                document.body.appendChild(
                    overlay
                );


                pendingModal =
                    overlay;


                const previousOverflow =
                    document.body.style.overflow;


                document.body.style.overflow =
                    "hidden";


                const close =
                    () => {

                        if (
                            !pendingModal
                        ) {
                            return;
                        }


                        overlay.classList.add(
                            "is-closing"
                        );


                        document.body.style.overflow =
                            previousOverflow;


                        document.removeEventListener(
                            "keydown",
                            escHandler
                        );


                        setTimeout(
                            () => {

                                overlay.remove();

                                pendingModal =
                                    null;

                            },
                            160
                        );
                    };


                const escHandler =
                    event => {

                        if (
                            event.key ===
                            "Escape"
                        ) {
                            close();
                        }
                    };


                overlay
                    .querySelector(
                        ".wallet-pending-close"
                    )
                    ?.addEventListener(
                        "click",
                        close
                    );


                overlay.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            overlay
                        ) {
                            close();
                        }
                    }
                );


                document.addEventListener(
                    "keydown",
                    escHandler
                );


                requestAnimationFrame(
                    () => {

                        overlay
                            .querySelector(
                                ".wallet-pending-close"
                            )
                            ?.focus();
                    }
                );

            } catch (error) {

                console.error(
                    "Pending balance detail:",
                    error
                );


                showToast(
                    error?.message ||
                    "Detail saldo pending gagal dimuat.",
                    "error"
                );

            } finally {

                if (pendingCard) {

                    pendingCard.classList.remove(
                        "is-loading"
                    );

                    pendingCard.disabled =
                        false;
                }
            }
        };


    /* =====================================================
       COPY BALANCE
       ===================================================== */

    const copyBalance =
        async () => {

            /*
             * Use the hero value first.
             */
            const value =
                balanceHeroValueEl?.textContent ||
                availableEl?.textContent ||
                "Rp0";


            if (
                value === "—"
            ) {

                showToast(
                    "Saldo belum selesai dimuat.",
                    "info"
                );

                return;
            }


            try {

                if (
                    navigator.clipboard &&
                    window.isSecureContext
                ) {

                    await navigator.clipboard.writeText(
                        value
                    );

                } else {

                    const textarea =
                        document.createElement(
                            "textarea"
                        );


                    textarea.value =
                        value;


                    textarea.setAttribute(
                        "readonly",
                        ""
                    );


                    textarea.style.position =
                        "fixed";

                    textarea.style.left =
                        "-9999px";

                    textarea.style.top =
                        "0";


                    document.body.appendChild(
                        textarea
                    );


                    textarea.focus();
                    textarea.select();


                    document.execCommand(
                        "copy"
                    );


                    textarea.remove();
                }


                showToast(
                    "Saldo berhasil disalin.",
                    "success"
                );


                if (
                    copyBalanceBtn
                ) {

                    const icon =
                        copyBalanceBtn.querySelector(
                            "i"
                        );


                    if (icon) {

                        icon.className =
                            "fa-solid fa-check";


                        clearTimeout(
                            copyBalanceBtn._walletCopyTimer
                        );


                        copyBalanceBtn._walletCopyTimer =
                            setTimeout(
                                () => {

                                    icon.className =
                                        "fa-regular fa-copy";

                                },
                                1400
                            );
                    }
                }

            } catch (error) {

                console.warn(
                    "Copy balance:",
                    error
                );


                showToast(
                    "Saldo tidak dapat disalin.",
                    "error"
                );
            }
        };


    /* =====================================================
       WITHDRAW GUARD
       ===================================================== */

    document.addEventListener(
        "click",
        event => {

            const withdraw =
                event.target.closest(
                    "#withdrawBtn, .wallet-withdraw-btn"
                );


            if (!withdraw) {
                return;
            }


            if (
                withdraw.classList.contains(
                    "is-disabled"
                ) ||
                withdraw.getAttribute(
                    "aria-disabled"
                ) === "true"
            ) {

                event.preventDefault();


                showToast(
                    "Belum ada saldo tersedia untuk ditarik.",
                    "info"
                );
            }
        }
    );


    /* =====================================================
       EVENTS
       ===================================================== */

    pendingCard?.addEventListener(
        "click",
        showPendingDetail
    );


    refreshBtn?.addEventListener(
        "click",
        () => {

            if (
                !isLoading
            ) {
                loadWallet();
            }
        }
    );


    copyBalanceBtn?.addEventListener(
        "click",
        copyBalance
    );


    /* =====================================================
       LOAD WALLET
       ===================================================== */

    async function loadWallet() {

        if (
            isLoading
        ) {
            return;
        }


        const sb =
            getSB();


        if (!sb) {

            renderError(
                "Supabase belum tersedia. Periksa config.js dan supabase.js."
            );

            return;
        }


        try {

            setLoadingState(
                true
            );


            renderLoading();


            profile =
                await getProfile();


            if (!profile?.id) {

                location.replace(
                    "login.html"
                );

                return;
            }


            const result =
                await fetchWalletData();


            wallet =
                result.wallet;


            walletRows =
                result.walletRows ||
                [];


            transactionRows =
                result.transactionRows ||
                [];


            /*
             * Keep original raw rows for activity.
             */
            allRows = [
                ...walletRows,
                ...transactionRows
                    .filter(
                        row =>
                            /^sell_/i.test(
                                String(
                                    row?.type ||
                                    ""
                                )
                            )
                    )
            ];


            /*
             * Build deduplicated income rows
             * for financial statistics.
             */
            const incomeRows =
                buildIncomeRows();


            renderBalances(
                wallet
            );


            renderIncomeStats(
                incomeRows
            );


            renderBreakdown(
                incomeRows
            );


            renderRecentActivity(
                allRows
            );


            updateWithdrawState(
                wallet
            );


        } catch (error) {

            console.error(
                "Wallet load error:",
                error
            );


            renderError(
                error?.message ||
                "Wallet gagal dimuat."
            );


            showToast(
                error?.message ||
                "Wallet gagal dimuat.",
                "error"
            );

        } finally {

            setLoadingState(
                false
            );
        }
    }


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    await loadWallet();

});
