/* =========================================================
   PasTele — Wallet
   FINAL PREMIUM
   Real Supabase data
   Existing schema only
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    /* =====================================================
       DOM
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    const availableEl = $("available");
    const pendingEl = $("pending");
    const incomeEl = $("income");
    const todayEl = $("today");

    const breakdownEl = $("breakdown");
    const recentActivityEl = $("recentActivity");

    const balanceHeroEl = $("balanceHero");

    const refreshBtn = $("refreshWallet");
    const copyBalanceBtn = $("copyBalance");

    const pendingCard = $("pendingCard");

    let profile = null;
    let wallet = null;
    let allRows = [];


    /* =====================================================
       GLOBALS
       ===================================================== */

    const getTC = () => {
        return window.TC || {};
    };

    const getSB = () => {
        return window.sb || window.supabaseClient || null;
    };


    /* =====================================================
       HELPERS
       ===================================================== */

    const money = (value) => {
        const amount = Number(value || 0);

        const safeAmount = Number.isFinite(amount)
            ? amount
            : 0;

        const TC = getTC();

        if (typeof TC.money === "function") {
            try {
                return TC.money(safeAmount);
            } catch {}
        }

        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(safeAmount);
    };


    const showToast = (
        message,
        type = "error"
    ) => {
        const TC = getTC();

        if (typeof TC.toast === "function") {
            try {
                TC.toast(
                    message,
                    type
                );
                return;
            } catch {}
        }

        const toastBox = $("toast");

        if (toastBox) {
            toastBox.textContent = message;
        } else {
            console[type === "error" ? "error" : "log"](
                message
            );
        }
    };


    const esc = (value) => {
        const TC = getTC();

        if (typeof TC.esc === "function") {
            try {
                return TC.esc(
                    String(value ?? "")
                );
            } catch {}
        }

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };


    const amountOf = (row) => {
        const value =
            row?.net_amount ??
            row?.amount ??
            0;

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : 0;
    };


    const normalizeType = (value) => {
        const type = String(
            value || ""
        )
            .trim()
            .toLowerCase();

        if (
            type.includes("pastelink") ||
            type.includes("paste") ||
            type.includes("link")
        ) {
            return "link";
        }

        if (type.includes("code")) {
            return "code";
        }

        if (
            type.includes("channel") ||
            type.includes("broadcast")
        ) {
            return "channel";
        }

        if (
            type.includes("group") ||
            type.includes("telegram_group")
        ) {
            return "group";
        }

        return "other";
    };


    const typeLabel = (type) => {
        switch (normalizeType(type)) {
            case "link":
                return "PasteLink";

            case "code":
                return "Code";

            case "channel":
                return "Channel";

            case "group":
                return "Group";

            default:
                return "Lainnya";
        }
    };


    const typeIcon = (type) => {
        switch (normalizeType(type)) {
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


    const typeClass = (type) => {
        switch (normalizeType(type)) {
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


    const statusOf = (row) => {
        return String(
            row?.status || ""
        )
            .trim()
            .toLowerCase();
    };


    const isGoodTransaction = (row) => {
        const status = statusOf(row);

        return [
            "completed",
            "complete",
            "paid",
            "available",
            "success",
            "successful"
        ].includes(status) &&
        amountOf(row) > 0;
    };


    const isPendingTransaction = (row) => {
        const status = statusOf(row);

        return [
            "pending",
            "waiting",
            "hold",
            "held"
        ].includes(status) &&
        amountOf(row) > 0;
    };


    const formatDate = (value) => {
        if (!value) {
            return "-";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
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


    const isToday = (value) => {
        if (!value) {
            return false;
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return false;
        }

        const now = new Date();

        return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
        );
    };


    /* =====================================================
       LOADING STATE
       ===================================================== */

    const setLoadingState = (loading) => {

        if (refreshBtn) {
            refreshBtn.disabled = loading;

            refreshBtn.classList.toggle(
                "is-loading",
                loading
            );

            const icon =
                refreshBtn.querySelector("i");

            if (icon) {
                icon.classList.toggle(
                    "fa-spin",
                    loading
                );
            }
        }

        if (breakdownEl) {
            breakdownEl.setAttribute(
                "aria-busy",
                loading
                    ? "true"
                    : "false"
            );
        }

        if (recentActivityEl) {
            recentActivityEl.setAttribute(
                "aria-busy",
                loading
                    ? "true"
                    : "false"
            );
        }
    };


    const renderLoading = () => {

        if (availableEl) {
            availableEl.textContent = "—";
        }

        if (pendingEl) {
            pendingEl.textContent = "—";
        }

        if (incomeEl) {
            incomeEl.textContent = "—";
        }

        if (todayEl) {
            todayEl.textContent = "—";
        }

        if (balanceHeroEl) {
            balanceHeroEl.textContent = "—";
        }

        if (breakdownEl) {
            breakdownEl.innerHTML = `
                <div class="wallet-loading">

                    <span class="wallet-loading-icon">
                        <i class="fa-solid fa-spinner fa-spin"></i>
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
                        <i class="fa-solid fa-spinner fa-spin"></i>
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

    const renderError = (message) => {

        if (availableEl) {
            availableEl.textContent = "—";
        }

        if (pendingEl) {
            pendingEl.textContent = "—";
        }

        if (incomeEl) {
            incomeEl.textContent = "—";
        }

        if (todayEl) {
            todayEl.textContent = "—";
        }

        if (balanceHeroEl) {
            balanceHeroEl.textContent = "—";
        }

        if (breakdownEl) {
            breakdownEl.innerHTML = `
                <div class="wallet-state">

                    <div class="wallet-state-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
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
                        <i class="fa-solid fa-rotate"></i>
                        Coba Lagi
                    </button>

                </div>
            `;
        }

        if (recentActivityEl) {
            recentActivityEl.innerHTML = "";
        }

        $("walletRetry")?.addEventListener(
            "click",
            () => loadWallet()
        );
    };


    /* =====================================================
       FETCH WALLET
       ===================================================== */

    const fetchWalletData = async () => {

        const sb = getSB();

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
         * Mature pending wallet balance.
         *
         * This RPC already exists in the current
         * wallet implementation and is safe to call.
         */
        try {
            const {
                error: releaseError
            } = await sb.rpc(
                "release_matured_wallet"
            );

            if (releaseError) {
                console.warn(
                    "release_matured_wallet:",
                    releaseError.message
                );
            }
        } catch (error) {
            console.warn(
                "release_matured_wallet:",
                error?.message || error
            );
        }


        const [
            walletResponse,
            walletTransactionsResponse,
            transactionsResponse
        ] = await Promise.all([

            sb
                .from("wallets")
                .select("*")
                .eq(
                    "user_id",
                    profile.id
                )
                .maybeSingle(),

            sb
                .from("wallet_transactions")
                .select("*")
                .eq(
                    "user_id",
                    profile.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
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
                        ascending: false
                    }
                )
                .limit(500)
        ]);


        if (walletResponse?.error) {
            throw walletResponse.error;
        }

        if (walletTransactionsResponse?.error) {
            throw walletTransactionsResponse.error;
        }

        if (transactionsResponse?.error) {
            throw transactionsResponse.error;
        }


        return {
            wallet:
                walletResponse?.data || null,

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
       LOAD WALLET
       ===================================================== */

    async function loadWallet() {

        if (getSB() == null) {
            renderError(
                "Supabase belum tersedia."
            );
            return;
        }

        try {

            setLoadingState(true);

            renderLoading();


            const TC = getTC();

            if (
                typeof TC.profile ===
                "function"
            ) {
                profile =
                    await TC.profile();
            }


            if (!profile) {

                const sb = getSB();

                if (
                    sb?.auth?.getUser
                ) {

                    const {
                        data,
                        error
                    } =
                        await sb.auth.getUser();

                    if (
                        !error &&
                        data?.user
                    ) {
                        profile =
                            data.user;
                    }
                }
            }


            if (!profile) {

                location.replace(
                    "login.html"
                );

                return;
            }


            const result =
                await fetchWalletData();


            wallet =
                result.wallet;


            /*
             * Existing behavior:
             * wallet_transactions +
             * sell_* transactions.
             */
            const walletRows =
                result.walletRows || [];


            const sellRows =
                (result.transactionRows || [])
                    .filter(row =>
                        /^sell_/i.test(
                            String(
                                row?.type || ""
                            )
                        )
                    );


            /*
             * Keep both sources.
             *
             * For display/statistics we preserve
             * the existing application behavior.
             */
            allRows = [
                ...walletRows,
                ...sellRows
            ];


            renderBalances(
                wallet
            );


            renderIncomeStats(
                allRows
            );


            renderBreakdown(
                allRows
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
       BALANCES
       ===================================================== */

    const renderBalances = (
        walletData
    ) => {

        const availableBalance =
            Number(
                walletData?.available_balance ??
                walletData?.balance ??
                profile?.balance ??
                0
            ) || 0;


        const pendingBalance =
            Number(
                walletData?.pending_balance ??
                0
            ) || 0;


        if (availableEl) {
            availableEl.textContent =
                money(
                    availableBalance
                );
        }


        if (balanceHeroEl) {
            balanceHeroEl.textContent =
                money(
                    availableBalance
                );
        }


        if (pendingEl) {
            pendingEl.textContent =
                money(
                    pendingBalance
                );
        }
    };


    /* =====================================================
       INCOME
       ===================================================== */

    const renderIncomeStats = (
        rows
    ) => {

        const validRows =
            rows.filter(
                isGoodTransaction
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
                .filter(row =>
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
                className: "wallet-breakdown-link"
            },
            {
                type: "code",
                icon: "fa-code",
                label: "Code",
                className: "wallet-breakdown-code"
            },
            {
                type: "channel",
                icon: "fa-broadcast-tower",
                label: "Channel",
                className: "wallet-breakdown-channel"
            },
            {
                type: "group",
                icon: "fa-users",
                label: "Group",
                className: "wallet-breakdown-group"
            }
        ];


        const validRows =
            rows.filter(
                isGoodTransaction
            );


        breakdownEl.innerHTML =
            types
                .map(item => {

                    const matchingRows =
                        validRows.filter(
                            row => {

                                const rowType =
                                    normalizeType(
                                        row?.type
                                    );

                                return (
                                    rowType ===
                                    item.type
                                );
                            }
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
                        >

                            <span class="income-item-icon">

                                <i
                                    class="fa-solid ${item.icon}"
                                    aria-hidden="true"
                                ></i>

                            </span>


                            <span class="income-item-main">

                                <b>
                                    ${esc(item.label)}
                                </b>

                                <small>
                                    ${count.toLocaleString("id-ID")}
                                    transaksi
                                </small>

                            </span>


                            <strong>
                                ${esc(money(total))}
                            </strong>


                            <span class="income-item-arrow">

                                <i
                                    class="fa-solid fa-arrow-right"
                                    aria-hidden="true"
                                ></i>

                            </span>

                        </a>
                    `;

                })
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
                .sort(
                    (a, b) => {

                        const aTime =
                            new Date(
                                a?.created_at || 0
                            ).getTime();

                        const bTime =
                            new Date(
                                b?.created_at || 0
                            ).getTime();

                        return (
                            bTime -
                            aTime
                        );
                    }
                )
                .slice(0, 6);


        if (!sortedRows.length) {

            recentActivityEl.innerHTML = `
                <div class="wallet-activity-empty">

                    <span class="wallet-activity-empty-icon">

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

        } else if (
            [
                "failed",
                "cancelled",
                "canceled",
                "rejected"
            ].includes(
                statusOf(row)
            )
        ) {

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


                <div class="wallet-activity-main">

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


                <div class="wallet-activity-amount">

                    <strong>
                        ${
                            amount > 0
                                ? "+"
                                : ""
                        }${esc(
                            money(amount)
                        )}
                    </strong>


                    <small>

                        <i
                            class="fa-solid ${statusIcon}"
                            aria-hidden="true"
                        ></i>

                        ${esc(statusText)}

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

        const panel =
            $("withdrawStatusPanel");

        if (!panel) {
            return;
        }


        const available =
            Number(
                walletData?.available_balance ??
                walletData?.balance ??
                0
            ) || 0;


        const btn =
            panel.querySelector(
                ".wallet-withdraw-btn"
            );


        if (!btn) {
            return;
        }


        if (available <= 0) {

            btn.classList.add(
                "is-disabled"
            );

            btn.setAttribute(
                "aria-disabled",
                "true"
            );

            btn.title =
                "Belum ada saldo yang dapat ditarik.";

        } else {

            btn.classList.remove(
                "is-disabled"
            );

            btn.removeAttribute(
                "aria-disabled"
            );

            btn.title =
                `Tarik ${money(available)}`;

        }
    };


    /* =====================================================
       PENDING BALANCE DETAIL
       ===================================================== */

    const showPendingDetail = async () => {

        const sb = getSB();

        if (!sb) {
            showToast(
                "Supabase belum tersedia.",
                "error"
            );
            return;
        }


        try {

            pendingCard?.classList.add(
                "is-loading"
            );


            const {
                data,
                error
            } = await sb.rpc(
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
                    .slice(0, 20)
                    .map(row => {

                        const amount =
                            money(
                                row?.amount || 0
                            );


                        const created =
                            formatDate(
                                row?.created_at
                            );


                        const availableAt =
                            formatDate(
                                row?.available_at
                            );


                        return `
                            <div class="wallet-pending-item">

                                <div class="wallet-pending-item-top">

                                    <strong>
                                        ${esc(amount)}
                                    </strong>

                                    <span>
                                        ${esc(
                                            row?.hold_label ||
                                            "H1"
                                        )}
                                    </span>

                                </div>


                                <div class="wallet-pending-meta">

                                    <span>

                                        <i
                                            class="fa-regular fa-clock"
                                            aria-hidden="true"
                                        ></i>

                                        Terjual
                                        ${esc(created)}

                                    </span>


                                    <span>

                                        <i
                                            class="fa-solid fa-unlock"
                                            aria-hidden="true"
                                        ></i>

                                        Tersedia
                                        ${esc(availableAt)}

                                    </span>

                                </div>

                            </div>
                        `;

                    })
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


            const close = () => {

                overlay.classList.add(
                    "is-closing"
                );

                setTimeout(
                    () => overlay.remove(),
                    160
                );
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


            const escHandler = event => {

                if (
                    event.key ===
                    "Escape"
                ) {
                    close();

                    document.removeEventListener(
                        "keydown",
                        escHandler
                    );
                }
            };


            document.addEventListener(
                "keydown",
                escHandler
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

            pendingCard?.classList.remove(
                "is-loading"
            );

        }
    };


    /* =====================================================
       COPY BALANCE
       ===================================================== */

    const copyBalance = async () => {

        const value =
            availableEl?.textContent ||
            "Rp0";


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

                textarea.value = value;

                textarea.style.position =
                    "fixed";

                textarea.style.opacity =
                    "0";

                document.body.appendChild(
                    textarea
                );

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


            if (copyBalanceBtn) {

                const icon =
                    copyBalanceBtn.querySelector(
                        "i"
                    );


                if (icon) {

                    icon.className =
                        "fa-solid fa-check";

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
                "Copy balance failed:",
                error
            );

            showToast(
                "Saldo tidak dapat disalin.",
                "error"
            );
        }
    };


    /* =====================================================
       EVENTS
       ===================================================== */

    pendingCard?.addEventListener(
        "click",
        showPendingDetail
    );


    refreshBtn?.addEventListener(
        "click",
        () => loadWallet()
    );


    copyBalanceBtn?.addEventListener(
        "click",
        copyBalance
    );


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
                )
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
       INITIAL LOAD
       ===================================================== */

    await loadWallet();

});
