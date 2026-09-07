/* =========================================================
   PasTele — Withdrawals
   PREMIUM / SUPABASE / RESPONSIVE
   ---------------------------------------------------------
   Existing schema preserved
   WITHDRAW RULES

   WD Instant:
   - Buka 24/7
   - Senin-Minggu
   - Maks Rp250.000 / transaksi
   - Maks Rp500.000 / hari
   - Fee Rp15.000

   WD Manual:
   - Normal: Senin-Jumat 07:00-21:00 WIB
   - Di luar jam normal tetap bisa diajukan
   - Fee normal + OFF_HOURS_FEE
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    /* =====================================================
       DOM HELPER
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    /* =====================================================
       SAFE GLOBALS
       ===================================================== */

    const getTC = () => {
        return window.TC || null;
    };

    const getSupabase = () => {
        return window.sb || null;
    };

    /* =====================================================
       DOM
       ===================================================== */

    const balEl = $('bal');
    const reqEl = $('req');
    const doneEl = $('done');

    const dailyBar = $('dailyBar');
    const dailyText = $('dailyText');
    const dailyPercent = $('dailyPercent');

    const instantBtns = $('instantBtns');
    const instantAmount = $('instantAmount');
    const instantSubmit = $('instantSubmit');

    const savedMethodsEl = $('savedMethods');

    const form = $('wd');
    const amountEl = $('amount');
    const methodEl = $('method');
    const nameEl = $('aname');
    const numberEl = $('anum');

    const manualSubmit = $('manualSubmit');

    const historyEl = $('history');
    const historyCount = $('historyCount');

    const manualStatus = $('manualStatus');
    const manualStatusTitle = $('manualStatusTitle');
    const manualStatusText = $('manualStatusText');
    const manualFeeText = $('manualFeeText');

    const withdrawFeePreview = $('withdrawFeePreview');
    const withdrawFee = $('withdrawFee');
    const withdrawNet = $('withdrawNet');

    const refreshWithdraw = $('refreshWithdraw');

    const historySearch = $('historySearch');
    const clearHistorySearch = $('clearHistorySearch');
    const historyStatus = $('historyStatus');
    const historySort = $('historySort');
    const historyResult = $('historyResult');
    const historyPagination = $('historyPagination');

    /* Confirmation modal */
    const withdrawConfirmModal = $('withdrawConfirmModal');
    const withdrawConfirmClose = $('withdrawConfirmClose');

    const confirmAmount = $('confirmAmount');
    const confirmFee = $('confirmFee');
    const confirmNet = $('confirmNet');
    const confirmMethod = $('confirmMethod');
    const confirmAccountName = $('confirmAccountName');
    const confirmAccount = $('confirmAccount');

    const withdrawConfirmCancel = $('withdrawConfirmCancel');
    const withdrawConfirmSubmit = $('withdrawConfirmSubmit');

    /* =====================================================
       CONSTANTS
       ===================================================== */

    const DAILY_LIMIT = 500000;

    const INSTANT_MAX = 250000;
    const INSTANT_FEE = 15000;

    const MANUAL_MIN = 100000;

    const MANUAL_FEE_BANK = 10000;
    const MANUAL_FEE_EWALLET = 7000;

    const MANUAL_OFF_HOURS_FEE = 5000;

    const MANUAL_OPEN_HOUR = 7;
    const MANUAL_CLOSE_HOUR = 21;

    const TIMEZONE = 'Asia/Jakarta';

    const INSTANT_AMOUNTS = [
        50000,
        100000,
        150000,
        200000,
        250000
    ];

    const HISTORY_PER_PAGE = 8;

    /* =====================================================
       STATE
       ===================================================== */

    let profile = null;
    let wallet = null;

    let withdrawals = [];
    let paymentMethods = [];

    let selectedInstantAmount = 50000;
    let selectedPaymentMethod = null;

    let isSubmitting = false;
    let isLoading = false;

    let historyPage = 1;

    let pendingWithdrawal = null;

    /* =====================================================
       HELPERS
       ===================================================== */

    const money = (value) => {
        const amount = Number(value || 0);

        const tc = getTC();

        if (
            tc &&
            typeof tc.money === 'function'
        ) {
            try {
                return tc.money(
                    Number.isFinite(amount)
                        ? amount
                        : 0
                );
            } catch (_) {
                /* fallback below */
            }
        }

        return new Intl.NumberFormat(
            'id-ID',
            {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0
            }
        ).format(
            Number.isFinite(amount)
                ? amount
                : 0
        );
    };

    const esc = (value) => {
        const text = String(value ?? '');

        const tc = getTC();

        if (
            tc &&
            typeof tc.esc === 'function'
        ) {
            try {
                return tc.esc(text);
            } catch (_) {
                /* fallback below */
            }
        }

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const toast = (
        message,
        type = 'error'
    ) => {
        const tc = getTC();

        if (
            tc &&
            typeof tc.toast === 'function'
        ) {
            try {
                tc.toast(
                    message,
                    type
                );
                return;
            } catch (_) {
                /* fallback */
            }
        }

        if (type === 'error') {
            console.error(message);
        }

        window.alert(message);
    };

    const amountNumber = (value) => {
        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return 0;
        }

        const number = Number(
            String(value)
                .replace(/[^\d.-]/g, '')
        );

        return Number.isFinite(number)
            ? number
            : 0;
    };

    const getBalance = () => {
        return amountNumber(
            wallet?.available_balance ??
            wallet?.balance ??
            profile?.balance ??
            0
        );
    };

    const normalizeStatus = (status) => {
        return String(
            status || ''
        )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_');
    };

    const statusKey = (status) => {
        const value =
            normalizeStatus(status);

        if (
            [
                'completed',
                'paid',
                'success',
                'successful'
            ].includes(value)
        ) {
            return 'success';
        }

        if (
            [
                'failed',
                'cancelled',
                'canceled',
                'rejected'
            ].includes(value)
        ) {
            return value === 'rejected'
                ? 'rejected'
                : 'failed';
        }

        if (
            value === 'processing'
        ) {
            return 'processing';
        }

        return 'pending';
    };

    const statusLabel = (status) => {
        const value =
            normalizeStatus(status);

        const labels = {
            pending: 'Menunggu',
            processing: 'Diproses',

            completed: 'Selesai',
            paid: 'Selesai',
            success: 'Selesai',
            successful: 'Selesai',

            failed: 'Gagal',
            cancelled: 'Dibatalkan',
            canceled: 'Dibatalkan',
            rejected: 'Ditolak'
        };

        return labels[value] ||
            (
                value
                    ? value.replace(
                        /_/g,
                        ' '
                    )
                    : 'Tidak diketahui'
            );
    };

    const methodLabel = (method) => {
        const value =
            String(
                method || ''
            )
                .toLowerCase()
                .trim();

        if (value === 'bank') {
            return 'Bank';
        }

        if (
            value === 'ewallet' ||
            value === 'e-wallet' ||
            value === 'wallet'
        ) {
            return 'E-Wallet';
        }

        return method || '-';
    };

    const methodIcon = (method) => {
        return String(
            method || ''
        )
            .toLowerCase()
            .trim() === 'bank'
            ? 'fa-building-columns'
            : 'fa-wallet';
    };

    const isPending = (row) => {
        return [
            'pending',
            'processing'
        ].includes(
            normalizeStatus(
                row?.status
            )
        );
    };

    const isCompleted = (row) => {
        return [
            'completed',
            'paid',
            'success',
            'successful'
        ].includes(
            normalizeStatus(
                row?.status
            )
        );
    };

    const isFailed = (row) => {
        return [
            'failed',
            'cancelled',
            'canceled',
            'rejected'
        ].includes(
            normalizeStatus(
                row?.status
            )
        );
    };

    /* =====================================================
       TIMEZONE
       ===================================================== */

    const getJakartaParts = () => {
        const parts =
            new Intl.DateTimeFormat(
                'en-US',
                {
                    timeZone: TIMEZONE,
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }
            ).formatToParts(
                new Date()
            );

        const get = (type) => {
            return parts.find(
                (part) =>
                    part.type === type
            )?.value;
        };

        const weekday =
            get('weekday');

        let hour =
            Number(
                get('hour') || 0
            );

        const minute =
            Number(
                get('minute') || 0
            );

        /*
         * Beberapa environment Intl bisa
         * menghasilkan "24" pada midnight.
         */
        if (hour === 24) {
            hour = 0;
        }

        return {
            weekday,
            hour,
            minute,
            totalMinutes:
                (hour * 60) + minute
        };
    };

    const isManualNormalHours = () => {
        const now =
            getJakartaParts();

        const weekend =
            now.weekday === 'Sat' ||
            now.weekday === 'Sun';

        if (weekend) {
            return false;
        }

        const currentMinutes =
            now.totalMinutes;

        const openMinutes =
            MANUAL_OPEN_HOUR * 60;

        const closeMinutes =
            MANUAL_CLOSE_HOUR * 60;

        return (
            currentMinutes >=
                openMinutes &&
            currentMinutes <
                closeMinutes
        );
    };

    const isManualOffHours = () => {
        return !isManualNormalHours();
    };

    const isInstantOpen = () => {
        return true;
    };

    /* =====================================================
       MANUAL FEE
       ===================================================== */

    const getNormalManualFee = () => {
        const method =
            String(
                methodEl?.value ||
                selectedPaymentMethod?.method_type ||
                'ewallet'
            )
                .toLowerCase()
                .trim();

        return method === 'bank'
            ? MANUAL_FEE_BANK
            : MANUAL_FEE_EWALLET;
    };

    const getManualFee = () => {
        const normalFee =
            getNormalManualFee();

        return isManualOffHours()
            ? normalFee +
                MANUAL_OFF_HOURS_FEE
            : normalFee;
    };

    /* =====================================================
       MANUAL STATUS
       ===================================================== */

    const renderManualSchedule = () => {
        if (!manualStatus) {
            return;
        }

        const normalHours =
            isManualNormalHours();

        manualStatus.classList.remove(
            'open',
            'closed',
            'off-hours'
        );

        manualStatus.dataset.state =
            normalHours
                ? 'open'
                : 'checking';

        if (normalHours) {
            manualStatus.classList.add(
                'open'
            );

            if (manualStatusTitle) {
                manualStatusTitle.textContent =
                    'WD Manual sedang buka';
            }

            if (manualStatusText) {
                manualStatusText.textContent =
                    'Senin–Jumat, 07:00–21:00 WIB. Fee normal berlaku.';
            }
        } else {
            manualStatus.classList.add(
                'off-hours'
            );

            if (manualStatusTitle) {
                manualStatusTitle.textContent =
                    'WD Manual di luar jam normal';
            }

            if (manualStatusText) {
                manualStatusText.textContent =
                    `Tetap bisa mengajukan. Fee tambahan ${money(
                        MANUAL_OFF_HOURS_FEE
                    )} berlaku.`;
            }
        }

        renderManualFeeInfo();
    };

    /* =====================================================
       MANUAL FEE INFO
       ===================================================== */

    const renderManualFeeInfo = () => {
        if (!manualFeeText) {
            return;
        }

        const extra =
            isManualOffHours()
                ? MANUAL_OFF_HOURS_FEE
                : 0;

        const bankFee =
            MANUAL_FEE_BANK +
            extra;

        const ewalletFee =
            MANUAL_FEE_EWALLET +
            extra;

        if (extra > 0) {
            manualFeeText.textContent =
                `Fee saat ini: Bank ${money(
                    bankFee
                )} · E-Wallet ${money(
                    ewalletFee
                )}`;
        } else {
            manualFeeText.textContent =
                `Fee Bank ${money(
                    MANUAL_FEE_BANK
                )} · E-Wallet ${money(
                    MANUAL_FEE_EWALLET
                )}`;
        }
    };

    /* =====================================================
       FEE PREVIEW
       ===================================================== */

    const renderFeePreview = () => {
        if (
            !withdrawFee ||
            !withdrawNet
        ) {
            return;
        }

        const amount =
            amountNumber(
                amountEl?.value
            );

        const fee =
            getManualFee();

        const net =
            Math.max(
                0,
                amount - fee
            );

        withdrawFee.textContent =
            money(fee);

        withdrawNet.textContent =
            money(net);

        if (withdrawFeePreview) {
            withdrawFeePreview.classList.toggle(
                'fee-increased',
                isManualOffHours()
            );
        }
    };

    /* =====================================================
       DATE HELPERS
       ===================================================== */

    const jakartaDateKey = (
        dateValue
    ) => {
        if (!dateValue) {
            return null;
        }

        const date =
            new Date(dateValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        const parts =
            new Intl.DateTimeFormat(
                'en-CA',
                {
                    timeZone: TIMEZONE,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }
            ).formatToParts(
                date
            );

        const get = (type) => {
            return parts.find(
                (part) =>
                    part.type === type
            )?.value;
        };

        return `${get('year')}-${get(
            'month'
        )}-${get('day')}`;
    };

    const todayJakartaKey = () => {
        return jakartaDateKey(
            new Date()
        );
    };

    const isToday = (
        dateValue
    ) => {
        const key =
            jakartaDateKey(
                dateValue
            );

        return (
            key !== null &&
            key ===
                todayJakartaKey()
        );
    };

    /* =====================================================
       BUTTON LOADING
       ===================================================== */

    const setButtonLoading = (
        button,
        loading,
        loadingText = 'Memproses...'
    ) => {
        if (!button) {
            return;
        }

        if (loading) {
            if (
                !button.dataset.originalHtml
            ) {
                button.dataset.originalHtml =
                    button.innerHTML;
            }

            button.disabled = true;

            button.classList.add(
                'loading'
            );

            button.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>${esc(
                    loadingText
                )}</span>
            `;

            return;
        }

        button.disabled = false;

        button.classList.remove(
            'loading'
        );

        if (
            button.dataset.originalHtml
        ) {
            button.innerHTML =
                button.dataset.originalHtml;

            delete button.dataset
                .originalHtml;
        }
    };

    /* =====================================================
       DAILY INSTANT LIMIT
       ===================================================== */

    const getWithdrawalMode = (
        row
    ) => {
        const mode =
            String(
                row?.mode ||
                row?.withdrawal_mode ||
                row?.type ||
                ''
            )
                .toLowerCase()
                .trim();

        return mode;
    };

    const calculateTodayInstantAmount = () => {
        return withdrawals
            .filter((row) =>
                isToday(
                    row?.created_at
                )
            )
            .filter((row) => {
                return (
                    getWithdrawalMode(
                        row
                    ) === 'instant'
                );
            })
            .filter((row) => {
                /*
                 * Pending/processing/completed
                 * tetap dihitung agar user tidak
                 * bisa menghindari daily limit
                 * dengan membuat request berkali-kali.
                 */
                return !isFailed(row);
            })
            .reduce(
                (
                    total,
                    row
                ) => {
                    return (
                        total +
                        amountNumber(
                            row?.amount
                        )
                    );
                },
                0
            );
    };

    const renderDailyLimit = () => {
        if (
            !dailyBar ||
            !dailyText ||
            !dailyPercent
        ) {
            return;
        }

        const todayAmount =
            calculateTodayInstantAmount();

        const percent =
            Math.min(
                100,
                Math.round(
                    (
                        todayAmount /
                        DAILY_LIMIT
                    ) * 100
                )
            );

        dailyBar.style.width =
            `${percent}%`;

        dailyPercent.textContent =
            `${percent}%`;

        dailyText.textContent =
            `${money(
                todayAmount
            )} / ${money(
                DAILY_LIMIT
            )}`;

        dailyBar.removeAttribute(
            'data-level'
        );

        if (percent >= 100) {
            dailyBar.dataset.level =
                'full';
        } else if (percent >= 50) {
            dailyBar.dataset.level =
                'half';
        }
    };

    /* =====================================================
       INSTANT BUTTONS
       ===================================================== */

    const renderInstantAmounts = () => {
        if (!instantBtns) {
            return;
        }

        instantBtns.innerHTML =
            INSTANT_AMOUNTS
                .map(
                    (amount) => {
                        const selected =
                            amount ===
                            selectedInstantAmount;

                        return `
                            <button
                                type="button"
                                class="instant-choice ${
                                    selected
                                        ? 'selected'
                                        : ''
                                }"
                                data-amount="${amount}"
                                aria-pressed="${
                                    selected
                                }"
                            >
                                <i class="fa-solid fa-bolt"></i>
                                ${esc(
                                    money(
                                        amount
                                    )
                                )}
                            </button>
                        `;
                    }
                )
                .join('');

        instantBtns
            .querySelectorAll(
                '.instant-choice'
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        'click',
                        () => {
                            selectedInstantAmount =
                                amountNumber(
                                    button.dataset
                                        .amount
                                );

                            instantBtns
                                .querySelectorAll(
                                    '.instant-choice'
                                )
                                .forEach(
                                    (item) => {
                                        const selected =
                                            item ===
                                            button;

                                        item.classList.toggle(
                                            'selected',
                                            selected
                                        );

                                        item.setAttribute(
                                            'aria-pressed',
                                            String(
                                                selected
                                            )
                                        );
                                    }
                                );

                            if (
                                instantAmount
                            ) {
                                instantAmount.textContent =
                                    money(
                                        selectedInstantAmount
                                    );
                            }
                        }
                    );
                }
            );

        if (instantAmount) {
            instantAmount.textContent =
                money(
                    selectedInstantAmount
                );
        }
    };

    /* =====================================================
       PAYMENT METHODS
       ===================================================== */

    const applyPaymentMethod = (
        method
    ) => {
        if (!method) {
            return;
        }

        selectedPaymentMethod =
            method;

        if (methodEl) {
            methodEl.value =
                method.method_type ||
                method.method ||
                'ewallet';
        }

        if (nameEl) {
            nameEl.value =
                method.account_name ||
                '';
        }

        if (numberEl) {
            numberEl.value =
                method.account_number ||
                '';
        }

        savedMethodsEl
            ?.querySelectorAll(
                '.saved-method'
            )
            .forEach(
                (button) => {
                    const selected =
                        button.dataset
                            .methodId ===
                        String(
                            method.id
                        );

                    button.classList.toggle(
                        'selected',
                        selected
                    );

                    button.setAttribute(
                        'aria-pressed',
                        String(selected)
                    );
                }
            );

        renderManualSchedule();
        renderFeePreview();
    };

    const renderPaymentMethods = () => {
        if (!savedMethodsEl) {
            return;
        }

        if (!paymentMethods.length) {
            savedMethodsEl.classList.add(
                'hidden'
            );

            savedMethodsEl.innerHTML =
                '';

            return;
        }

        savedMethodsEl.classList.remove(
            'hidden'
        );

        savedMethodsEl.innerHTML = `
            <div class="saved-title">
                <i class="fa-solid fa-bookmark"></i>
                Payment tersimpan
            </div>

            <div class="saved-method-list">
                ${paymentMethods
                    .map(
                        (method) => {
                            const selected =
                                selectedPaymentMethod &&
                                String(
                                    selectedPaymentMethod.id
                                ) ===
                                String(
                                    method.id
                                );

                            const provider =
                                method.provider ||
                                method.method_type ||
                                method.method ||
                                'Payment';

                            return `
                                <button
                                    type="button"
                                    class="saved-method ${
                                        selected
                                            ? 'selected'
                                            : ''
                                    }"
                                    data-method-id="${esc(
                                        method.id
                                    )}"
                                    aria-pressed="${
                                        selected
                                    }"
                                >
                                    <div class="saved-method-main">
                                        <strong>
                                            ${esc(
                                                provider
                                            )}
                                        </strong>

                                        <small>
                                            ${esc(
                                                method.account_name ||
                                                ''
                                            )}
                                            ${
                                                method.account_name
                                                    ? ' · '
                                                    : ''
                                            }
                                            ${esc(
                                                method.account_number ||
                                                ''
                                            )}
                                        </small>
                                    </div>

                                    <i class="fa-solid fa-chevron-right"></i>
                                </button>
                            `;
                        }
                    )
                    .join('')}
            </div>
        `;

        savedMethodsEl
            .querySelectorAll(
                '[data-method-id]'
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        'click',
                        () => {
                            const method =
                                paymentMethods.find(
                                    (item) =>
                                        String(
                                            item.id
                                        ) ===
                                        String(
                                            button.dataset
                                                .methodId
                                        )
                                );

                            applyPaymentMethod(
                                method
                            );
                        }
                    );
                }
            );
    };

    /* =====================================================
       SUMMARY
       ===================================================== */

    const renderSummary = () => {
        const balance =
            getBalance();

        const pending =
            withdrawals
                .filter(isPending)
                .reduce(
                    (
                        total,
                        row
                    ) => {
                        return (
                            total +
                            amountNumber(
                                row?.total_debit ??
                                row?.amount
                            )
                        );
                    },
                    0
                );

        const completed =
            withdrawals
                .filter(isCompleted)
                .reduce(
                    (
                        total,
                        row
                    ) => {
                        return (
                            total +
                            amountNumber(
                                row?.amount
                            )
                        );
                    },
                    0
                );

        if (balEl) {
            balEl.textContent =
                money(balance);
        }

        if (reqEl) {
            reqEl.textContent =
                money(pending);
        }

        if (doneEl) {
            doneEl.textContent =
                money(completed);
        }
    };

    /* =====================================================
       HISTORY FILTER
       ===================================================== */

    const getHistoryFiltered = () => {
        let rows = [
            ...withdrawals
        ];

        const search =
            String(
                historySearch?.value ||
                ''
            )
                .trim()
                .toLowerCase();

        const status =
            String(
                historyStatus?.value ||
                'all'
            )
                .trim()
                .toLowerCase();

        const sort =
            String(
                historySort?.value ||
                'newest'
            )
                .trim()
                .toLowerCase();

        if (search) {
            rows = rows.filter(
                (row) => {
                    const haystack = [
                        row?.id,
                        row?.ticket_code,
                        row?.mode,
                        row?.method,
                        row?.method_type,
                        row?.account_name,
                        row?.account_number,
                        row?.status,
                        row?.amount
                    ]
                        .map(
                            (value) =>
                                String(
                                    value ??
                                    ''
                                )
                                    .toLowerCase()
                        )
                        .join(' ');

                    return haystack.includes(
                        search
                    );
                }
            );
        }

        if (
            status &&
            status !== 'all'
        ) {
            rows = rows.filter(
                (row) => {
                    const key =
                        statusKey(
                            row?.status
                        );

                    return (
                        key === status ||
                        normalizeStatus(
                            row?.status
                        ) === status
                    );
                }
            );
        }

        rows.sort(
            (a, b) => {
                const dateA =
                    new Date(
                        a?.created_at ||
                        0
                    ).getTime();

                const dateB =
                    new Date(
                        b?.created_at ||
                        0
                    ).getTime();

                const amountA =
                    amountNumber(
                        a?.amount
                    );

                const amountB =
                    amountNumber(
                        b?.amount
                    );

                switch (sort) {
                    case 'oldest':
                        return (
                            dateA -
                            dateB
                        );

                    case 'highest':
                        return (
                            amountB -
                            amountA
                        );

                    case 'lowest':
                        return (
                            amountA -
                            amountB
                        );

                    case 'newest':
                    default:
                        return (
                            dateB -
                            dateA
                        );
                }
            }
        );

        return rows;
    };

    /* =====================================================
       HISTORY ROW
       ===================================================== */

    const renderHistoryRow = (
        row
    ) => {
        const date =
            new Date(
                row?.created_at
            );

        const validDate =
            !Number.isNaN(
                date.getTime()
            );

        const dateText =
            validDate
                ? date.toLocaleDateString(
                    'id-ID',
                    {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        timeZone:
                            TIMEZONE
                    }
                )
                : '-';

        const timeText =
            validDate
                ? date.toLocaleTimeString(
                    'id-ID',
                    {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone:
                            TIMEZONE
                    }
                )
                : '';

        const status =
            statusKey(
                row?.status
            );

        const method =
            row?.method ||
            row?.method_type ||
            '-';

        const ticket =
            row?.ticket_code ||
            row?.id ||
            '-';

        const mode =
            row?.mode ||
            row?.withdrawal_mode ||
            'manual';

        return `
            <div class="history-row">
                <div class="history-date">
                    <strong>
                        ${esc(
                            dateText
                        )}
                    </strong>

                    <small>
                        ${esc(
                            timeText
                        )}
                    </small>
                </div>

                <div class="history-amount">
                    <strong>
                        ${esc(
                            money(
                                row?.amount
                            )
                        )}
                    </strong>
                </div>

                <div class="history-method">
                    <strong>
                        <i
                            class="fa-solid ${esc(
                                methodIcon(
                                    method
                                )
                            )}"
                        ></i>
                        ${esc(
                            methodLabel(
                                method
                            )
                        )}
                    </strong>

                    <small>
                        ${esc(
                            row?.account_number ||
                            '-'
                        )}
                    </small>
                </div>

                <div class="history-type">
                    ${esc(
                        String(
                            mode
                        ).replace(
                            /_/g,
                            ' '
                        )
                    )}
                </div>

                <div>
                    <span
                        class="status-badge ${esc(
                            status
                        )}"
                    >
                        ${esc(
                            statusLabel(
                                row?.status
                            )
                        )}
                    </span>
                </div>

                <div class="ticket-code">
                    #${esc(
                        ticket
                    )}
                </div>
            </div>
        `;
    };

    /* =====================================================
       PAGINATION
       ===================================================== */

    const renderPagination = (
        totalItems
    ) => {
        if (!historyPagination) {
            return;
        }

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalItems /
                    HISTORY_PER_PAGE
                )
            );

        if (
            totalPages <= 1
        ) {
            historyPagination.innerHTML =
                '';

            historyPagination.classList.add(
                'hidden'
            );

            return;
        }

        historyPagination.classList.remove(
            'hidden'
        );

        historyPage =
            Math.min(
                historyPage,
                totalPages
            );

        const buttons = [];

        buttons.push(`
            <button
                type="button"
                class="pagination-prev"
                data-page="${
                    historyPage - 1
                }"
                ${
                    historyPage <= 1
                        ? 'disabled'
                        : ''
                }
                aria-label="Halaman sebelumnya"
            >
                <i class="fa-solid fa-chevron-left"></i>
            </button>
        `);

        let start =
            Math.max(
                1,
                historyPage - 2
            );

        let end =
            Math.min(
                totalPages,
                historyPage + 2
            );

        if (historyPage <= 3) {
            end =
                Math.min(
                    totalPages,
                    5
                );
        }

        if (
            historyPage >=
            totalPages - 2
        ) {
            start =
                Math.max(
                    1,
                    totalPages - 4
                );
        }

        for (
            let page = start;
            page <= end;
            page++
        ) {
            buttons.push(`
                <button
                    type="button"
                    class="${
                        page ===
                        historyPage
                            ? 'active'
                            : ''
                    }"
                    data-page="${page}"
                    ${
                        page ===
                        historyPage
                            ? 'aria-current="page"'
                            : ''
                    }
                >
                    ${page}
                </button>
            `);
        }

        buttons.push(`
            <button
                type="button"
                class="pagination-next"
                data-page="${
                    historyPage + 1
                }"
                ${
                    historyPage >=
                    totalPages
                        ? 'disabled'
                        : ''
                }
                aria-label="Halaman berikutnya"
            >
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `);

        historyPagination.innerHTML =
            buttons.join('');

        historyPagination
            .querySelectorAll(
                'button[data-page]'
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        'click',
                        () => {
                            const page =
                                Number(
                                    button.dataset
                                        .page
                                );

                            if (
                                !Number.isFinite(
                                    page
                                ) ||
                                page < 1 ||
                                page >
                                    totalPages
                            ) {
                                return;
                            }

                            historyPage =
                                page;

                            renderHistory();
                        }
                    );
                }
            );
    };

    /* =====================================================
       HISTORY
       ===================================================== */

    const renderHistory = () => {
        if (!historyEl) {
            return;
        }

        const filtered =
            getHistoryFiltered();

        const total =
            filtered.length;

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total /
                    HISTORY_PER_PAGE
                )
            );

        if (
            historyPage >
            totalPages
        ) {
            historyPage =
                totalPages;
        }

        const start =
            (
                historyPage -
                1
            ) *
            HISTORY_PER_PAGE;

        const pageRows =
            filtered.slice(
                start,
                start +
                    HISTORY_PER_PAGE
            );

        if (historyCount) {
            historyCount.textContent =
                `${total} transaksi`;
        }

        if (historyResult) {
            if (
                total === 0
            ) {
                historyResult.textContent =
                    withdrawals.length
                        ? 'Tidak ada transaksi yang sesuai filter.'
                        : 'Belum ada transaksi withdraw.';
            } else {
                historyResult.textContent =
                    `Menampilkan ${
                        start + 1
                    }–${
                        Math.min(
                            start +
                                HISTORY_PER_PAGE,
                            total
                        )
                    } dari ${total} transaksi`;
            }
        }

        if (!pageRows.length) {
            historyEl.innerHTML = `
                <div class="history-empty">
                    <i class="fa-solid fa-receipt"></i>

                    <strong>
                        ${
                            withdrawals.length
                                ? 'Tidak ada hasil'
                                : 'Belum ada pengajuan withdraw'
                        }
                    </strong>

                    <span>
                        ${
                            withdrawals.length
                                ? 'Coba ubah pencarian atau filter riwayat.'
                                : 'Riwayat withdraw kamu akan muncul di sini.'
                        }
                    </span>
                </div>
            `;

            renderPagination(
                total
            );

            return;
        }

        historyEl.innerHTML =
            pageRows
                .map(
                    renderHistoryRow
                )
                .join('');

        renderPagination(
            total
        );
    };

    /* =====================================================
       HISTORY LOADING
       ===================================================== */

    const renderHistoryLoading = () => {
        if (!historyEl) {
            return;
        }

        historyEl.innerHTML = `
            <div class="history-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Memuat riwayat...
            </div>
        `;

        if (historyResult) {
            historyResult.textContent =
                'Memuat data...';
        }
    };

    /* =====================================================
       HISTORY ERROR
       ===================================================== */

    const renderHistoryError = (
        message
    ) => {
        if (!historyEl) {
            return;
        }

        historyEl.innerHTML = `
            <div class="history-error">
                <strong>
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Riwayat gagal dimuat
                </strong>

                <span>
                    ${esc(
                        message ||
                        'Terjadi kesalahan saat mengambil riwayat.'
                    )}
                </span>

                <button
                    class="withdraw-submit primary"
                    id="retryHistory"
                    type="button"
                    style="width:auto;padding:8px 12px;"
                >
                    <i class="fa-solid fa-rotate"></i>
                    Coba lagi
                </button>
            </div>
        `;

        $('retryHistory')
            ?.addEventListener(
                'click',
                loadWallet
            );
    };

    /* =====================================================
       CONFIRMATION MODAL
       ===================================================== */

    const closeConfirmModal = () => {
        if (!withdrawConfirmModal) {
            return;
        }

        withdrawConfirmModal.classList.add(
            'hidden'
        );

        withdrawConfirmModal.setAttribute(
            'aria-hidden',
            'true'
        );

        pendingWithdrawal =
            null;

        if (
            withdrawConfirmSubmit
        ) {
            withdrawConfirmSubmit.disabled =
                false;
        }
    };

    const openConfirmModal = (
        amount,
        mode
    ) => {
        const fee =
            mode === 'instant'
                ? INSTANT_FEE
                : getManualFee();

        const net =
            Math.max(
                0,
                amount - fee
            );

        pendingWithdrawal = {
            amount,
            mode,
            fee,
            net,
            method:
                methodEl?.value ||
                'ewallet',
            accountName:
                nameEl?.value
                    ?.trim() ||
                '',
            accountNumber:
                numberEl?.value
                    ?.trim() ||
                ''
        };

        if (confirmAmount) {
            confirmAmount.textContent =
                money(amount);
        }

        if (confirmFee) {
            confirmFee.textContent =
                money(fee);
        }

        if (confirmNet) {
            confirmNet.textContent =
                money(net);
        }

        if (confirmMethod) {
            confirmMethod.textContent =
                methodLabel(
                    pendingWithdrawal.method
                );
        }

        if (confirmAccountName) {
            confirmAccountName.textContent =
                pendingWithdrawal.accountName ||
                '-';
        }

        if (confirmAccount) {
            confirmAccount.textContent =
                pendingWithdrawal.accountNumber ||
                '-';
        }

        if (!withdrawConfirmModal) {
            /*
             * Fallback jika modal tidak tersedia.
             */
            return true;
        }

        withdrawConfirmModal.classList.remove(
            'hidden'
        );

        withdrawConfirmModal.setAttribute(
            'aria-hidden',
            'false'
        );

        setTimeout(
            () => {
                withdrawConfirmSubmit?.focus();
            },
            50
        );

        return false;
    };

    /* =====================================================
       VALIDATION
       ===================================================== */

    const validateCommon = (
        amount,
        mode
    ) => {
        if (
            !amount ||
            amount <= 0
        ) {
            return 'Nominal wajib diisi.';
        }

        /* ---------------------------------------------
           INSTANT
           --------------------------------------------- */

        if (
            mode === 'instant'
        ) {
            if (!isInstantOpen()) {
                return 'WD Instant sedang tidak tersedia.';
            }

            if (
                amount >
                INSTANT_MAX
            ) {
                return 'WD Instant maksimum Rp250.000 per transaksi.';
            }

            const today =
                calculateTodayInstantAmount();

            if (
                today +
                    amount >
                DAILY_LIMIT
            ) {
                const remaining =
                    Math.max(
                        0,
                        DAILY_LIMIT -
                            today
                    );

                return (
                    `Batas WD Instant harian hampir/` +
                    `sudah tercapai. Sisa limit hari ini ` +
                    `${money(remaining)}.`
                );
            }
        }

        /* ---------------------------------------------
           MANUAL
           --------------------------------------------- */

        if (
            mode === 'manual' &&
            amount < MANUAL_MIN
        ) {
            return 'WD Manual minimum Rp100.000.';
        }

        /* ---------------------------------------------
           METHOD
           --------------------------------------------- */

        const method =
            String(
                methodEl?.value ||
                ''
            ).trim();

        if (!method) {
            return 'Pilih metode pencairan terlebih dahulu.';
        }

        /* ---------------------------------------------
           ACCOUNT
           --------------------------------------------- */

        const accountName =
            String(
                nameEl?.value ||
                ''
            ).trim();

        const accountNumber =
            String(
                numberEl?.value ||
                ''
            ).trim();

        if (!accountName) {
            return 'Nama pemegang wajib diisi.';
        }

        if (!accountNumber) {
            return 'Nomor rekening / e-wallet wajib diisi.';
        }

        /* ---------------------------------------------
           BALANCE
           --------------------------------------------- */

        const balance =
            getBalance();

        const fee =
            mode === 'instant'
                ? INSTANT_FEE
                : getManualFee();

        const totalDebit =
            amount + fee;

        if (
            totalDebit >
            balance
        ) {
            return (
                `Saldo tidak mencukupi. ` +
                `Dibutuhkan ${money(
                    totalDebit
                )} ` +
                `(nominal ${money(
                    amount
                )} + fee ${money(
                    fee
                )}).`
            );
        }

        return null;
    };

    /* =====================================================
       RPC REQUEST
       ===================================================== */

    const executeWithdrawal = async (
        amount,
        mode
    ) => {
        const supabase =
            getSupabase();

        if (!supabase) {
            throw new Error(
                'Supabase belum siap. Silakan refresh halaman.'
            );
        }

        const validation =
            validateCommon(
                amount,
                mode
            );

        if (validation) {
            throw new Error(
                validation
            );
        }

        /*
         * Fee tetap dihitung ulang oleh database/RPC.
         * Frontend hanya preview.
         */
        const response =
            await supabase.rpc(
                'request_withdrawal_v2',
                {
                    p_amount:
                        amount,

                    p_mode:
                        mode,

                    p_method:
                        methodEl?.value ||
                        'ewallet',

                    p_account_name:
                        nameEl?.value
                            ?.trim() ||
                        '',

                    p_account_number:
                        numberEl?.value
                            ?.trim() ||
                        ''
                }
            );

        if (
            response?.error
        ) {
            throw response.error;
        }

        return response?.data;
    };

    /* =====================================================
       REQUEST WITHDRAWAL
       ===================================================== */

    const requestWithdrawal = async (
        amount,
        mode
    ) => {
        if (isSubmitting) {
            return;
        }

        const validation =
            validateCommon(
                amount,
                mode
            );

        if (validation) {
            toast(
                validation,
                'error'
            );

            return;
        }

        /*
         * Tampilkan confirmation modal
         * sebelum RPC.
         */
        const modalOpened =
            openConfirmModal(
                amount,
                mode
            );

        if (
            modalOpened === false
        ) {
            return;
        }

        await submitConfirmedWithdrawal();
    };

    /* =====================================================
       CONFIRMED SUBMIT
       ===================================================== */

    const submitConfirmedWithdrawal =
        async () => {
            if (
                isSubmitting ||
                !pendingWithdrawal
            ) {
                return;
            }

            const {
                amount,
                mode
            } = pendingWithdrawal;

            const button =
                mode === 'instant'
                    ? instantSubmit
                    : manualSubmit;

            isSubmitting = true;

            if (
                withdrawConfirmSubmit
            ) {
                withdrawConfirmSubmit.disabled =
                    true;

                withdrawConfirmSubmit.dataset
                    .originalHtml =
                    withdrawConfirmSubmit.innerHTML;

                withdrawConfirmSubmit.classList.add(
                    'loading'
                );

                withdrawConfirmSubmit.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Memproses...</span>
                `;
            }

            setButtonLoading(
                button,
                true,
                mode === 'instant'
                    ? 'Mengajukan WD...'
                    : 'Mengirim pengajuan...'
            );

            try {
                await executeWithdrawal(
                    amount,
                    mode
                );

                closeConfirmModal();

                toast(
                    mode === 'instant'
                        ? 'WD Instant berhasil diajukan.'
                        : (
                            isManualOffHours()
                                ? 'WD Manual berhasil diajukan. Fee tambahan di luar jam normal berlaku.'
                                : 'WD Manual berhasil diajukan.'
                        ),
                    'success'
                );

                /*
                 * Refresh data tanpa reload seluruh halaman.
                 */
                isSubmitting = false;

                setButtonLoading(
                    button,
                    false
                );

                await loadWallet({
                    silent: true
                });
            } catch (error) {
                console.error(
                    'Withdrawal error:',
                    error
                );

                toast(
                    error?.message ||
                    'Withdraw gagal diproses.',
                    'error'
                );

                if (
                    withdrawConfirmSubmit
                ) {
                    withdrawConfirmSubmit.disabled =
                        false;

                    withdrawConfirmSubmit.classList.remove(
                        'loading'
                    );

                    if (
                        withdrawConfirmSubmit
                            .dataset
                            .originalHtml
                    ) {
                        withdrawConfirmSubmit.innerHTML =
                            withdrawConfirmSubmit
                                .dataset
                                .originalHtml;

                        delete withdrawConfirmSubmit
                            .dataset
                            .originalHtml;
                    }
                }

                setButtonLoading(
                    button,
                    false
                );

                isSubmitting = false;
            }
        };

    /* =====================================================
       LOAD WALLET
       ===================================================== */

    async function loadWallet(
        options = {}
    ) {
        const {
            silent = false
        } = options;

        const tc =
            getTC();

        const supabase =
            getSupabase();

        if (!supabase) {
            renderHistoryError(
                'Supabase belum siap. Periksa js/supabase.js.'
            );

            return;
        }

        if (
            isLoading &&
            !silent
        ) {
            return;
        }

        isLoading = true;

        if (!silent) {
            renderHistoryLoading();
        }

        try {
            /*
             * Profile melalui TC bila tersedia.
             */
            if (
                tc &&
                typeof tc.profile ===
                    'function'
            ) {
                profile =
                    await tc.profile();
            }

            /*
             * Fallback Supabase Auth.
             */
            if (!profile) {
                const authResult =
                    await supabase.auth.getUser();

                if (
                    authResult?.error
                ) {
                    throw authResult.error;
                }

                const user =
                    authResult?.data
                        ?.user;

                if (!user) {
                    location.replace(
                        'login.html'
                    );

                    return;
                }

                profile = {
                    id: user.id,
                    auth_user_id:
                        user.id,
                    email:
                        user.email ||
                        ''
                };
            }

            if (!profile?.id) {
                location.replace(
                    'login.html'
                );

                return;
            }

            const [
                walletResponse,
                withdrawalsResponse,
                methodsResponse
            ] = await Promise.all([
                supabase
                    .from('wallets')
                    .select('*')
                    .eq(
                        'user_id',
                        profile.id
                    )
                    .maybeSingle(),

                supabase
                    .from('withdrawals')
                    .select('*')
                    .eq(
                        'user_id',
                        profile.id
                    )
                    .order(
                        'created_at',
                        {
                            ascending:
                                false
                        }
                    )
                    .limit(100),

                supabase
                    .from(
                        'payment_methods'
                    )
                    .select('*')
                    .eq(
                        'user_id',
                        profile.id
                    )
                    .order(
                        'created_at',
                        {
                            ascending:
                                false
                        }
                    )
            ]);

            if (
                walletResponse?.error
            ) {
                throw walletResponse.error;
            }

            if (
                withdrawalsResponse?.error
            ) {
                throw withdrawalsResponse.error;
            }

            if (
                methodsResponse?.error
            ) {
                throw methodsResponse.error;
            }

            wallet =
                walletResponse?.data ||
                null;

            withdrawals =
                Array.isArray(
                    withdrawalsResponse?.data
                )
                    ? withdrawalsResponse.data
                    : [];

            paymentMethods =
                Array.isArray(
                    methodsResponse?.data
                )
                    ? methodsResponse.data
                    : [];

            /*
             * Preserve selected method when possible.
             */
            const previousMethodId =
                selectedPaymentMethod?.id;

            selectedPaymentMethod =
                paymentMethods.find(
                    (item) =>
                        String(
                            item.id
                        ) ===
                        String(
                            previousMethodId
                        )
                ) ||
                paymentMethods[0] ||
                null;

            renderSummary();

            renderDailyLimit();

            renderInstantAmounts();

            renderPaymentMethods();

            renderManualSchedule();

            if (
                selectedPaymentMethod
            ) {
                applyPaymentMethod(
                    selectedPaymentMethod
                );
            }

            renderFeePreview();

            /*
             * Reset page hanya jika sebelumnya
             * sudah melewati jumlah halaman.
             */
            const filtered =
                getHistoryFiltered();

            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        filtered.length /
                            HISTORY_PER_PAGE
                    )
                );

            if (
                historyPage >
                totalPages
            ) {
                historyPage =
                    totalPages;
            }

            renderHistory();
        } catch (error) {
            console.error(
                'Withdrawals load error:',
                error
            );

            if (historyCount) {
                historyCount.textContent =
                    'Gagal';
            }

            renderHistoryError(
                error?.message ||
                'Data withdraw gagal dimuat.'
            );
        } finally {
            isLoading = false;

            setButtonLoading(
                refreshWithdraw,
                false
            );
        }
    }

    /* =====================================================
       REFRESH
       ===================================================== */

    refreshWithdraw?.addEventListener(
        'click',
        async () => {
            if (isLoading) {
                return;
            }

            setButtonLoading(
                refreshWithdraw,
                true,
                'Memuat...'
            );

            await loadWallet({
                silent: false
            });
        }
    );

    /* =====================================================
       INSTANT SUBMIT
       ===================================================== */

    instantSubmit?.addEventListener(
        'click',
        () => {
            requestWithdrawal(
                selectedInstantAmount,
                'instant'
            );
        }
    );

    /* =====================================================
       MANUAL FORM
       ===================================================== */

    form?.addEventListener(
        'submit',
        (event) => {
            event.preventDefault();

            requestWithdrawal(
                amountNumber(
                    amountEl?.value
                ),
                'manual'
            );
        }
    );

    /* =====================================================
       PAYMENT METHOD
       ===================================================== */

    methodEl?.addEventListener(
        'change',
        () => {
            renderManualSchedule();
            renderFeePreview();
        }
    );

    /* =====================================================
       AMOUNT
       ===================================================== */

    amountEl?.addEventListener(
        'input',
        () => {
            let value =
                amountNumber(
                    amountEl.value
                );

            if (value < 0) {
                value = 0;
            }

            amountEl.value =
                value || '';

            renderFeePreview();
        }
    );

    /* =====================================================
       ACCOUNT NAME
       ===================================================== */

    nameEl?.addEventListener(
        'input',
        () => {
            /*
             * Tidak melakukan uppercase/
             * perubahan isi agar nama tetap
             * sesuai payment method.
             */
            if (
                nameEl.value.length >
                100
            ) {
                nameEl.value =
                    nameEl.value.slice(
                        0,
                        100
                    );
            }
        }
    );

    /* =====================================================
       ACCOUNT NUMBER
       ===================================================== */

    numberEl?.addEventListener(
        'input',
        () => {
            numberEl.value =
                numberEl.value
                    .replace(
                        /\s+/g,
                        ''
                    )
                    .trim();
        }
    );

    /* =====================================================
       HISTORY SEARCH
       ===================================================== */

    historySearch?.addEventListener(
        'input',
        () => {
            historyPage = 1;

            renderHistory();
        }
    );

    /* =====================================================
       CLEAR HISTORY SEARCH
       ===================================================== */

    clearHistorySearch?.addEventListener(
        'click',
        () => {
            if (historySearch) {
                historySearch.value =
                    '';
            }

            historyPage = 1;

            renderHistory();
        }
    );

    /* =====================================================
       HISTORY STATUS
       ===================================================== */

    historyStatus?.addEventListener(
        'change',
        () => {
            historyPage = 1;

            renderHistory();
        }
    );

    /* =====================================================
       HISTORY SORT
       ===================================================== */

    historySort?.addEventListener(
        'change',
        () => {
            historyPage = 1;

            renderHistory();
        }
    );

    /* =====================================================
       ADMIN URGENT
       ===================================================== */

    $('urgent')?.addEventListener(
        'click',
        () => {
            toast(
                'Silakan hubungi admin melalui kanal bantuan PasTele.',
                'success'
            );
        }
    );

    /* =====================================================
       CONFIRM MODAL EVENTS
       ===================================================== */

    withdrawConfirmClose?.addEventListener(
        'click',
        closeConfirmModal
    );

    withdrawConfirmCancel?.addEventListener(
        'click',
        closeConfirmModal
    );

    withdrawConfirmSubmit?.addEventListener(
        'click',
        async () => {
            await submitConfirmedWithdrawal();
        }
    );

    /*
     * Klik backdrop menutup modal.
     */
    withdrawConfirmModal?.addEventListener(
        'click',
        (event) => {
            if (
                event.target ===
                withdrawConfirmModal
            ) {
                closeConfirmModal();
            }
        }
    );

    /* =====================================================
       ESCAPE MODAL
       ===================================================== */

    document.addEventListener(
        'keydown',
        (event) => {
            if (
                event.key ===
                'Escape'
            ) {
                if (
                    withdrawConfirmModal &&
                    !withdrawConfirmModal.classList.contains(
                        'hidden'
                    ) &&
                    !isSubmitting
                ) {
                    closeConfirmModal();
                }
            }
        }
    );

    /* =====================================================
       REFRESH SCHEDULE / FEE
       ===================================================== */

    /*
     * Status dan fee diperbarui setiap menit.
     */
    setInterval(
        () => {
            renderManualSchedule();
            renderFeePreview();
        },
        60 * 1000
    );

    /* =====================================================
       PAGE VISIBILITY
       ===================================================== */

    /*
     * Ketika user kembali ke tab aplikasi,
     * sinkronkan saldo/history.
     */
    document.addEventListener(
        'visibilitychange',
        () => {
            if (
                document.visibilityState ===
                'visible'
            ) {
                renderManualSchedule();
                renderFeePreview();
            }
        }
    );

    /* =====================================================
       INITIAL RENDER
       ===================================================== */

    renderManualSchedule();

    renderFeePreview();

    renderInstantAmounts();

    /* =====================================================
       START
       ===================================================== */

    await loadWallet();
});
