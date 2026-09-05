/* =========================================================
   PasTele — Withdrawals
   Real Supabase data
   Existing schema preserved
   WITHDRAW RULES
   ---------------------------------------------------------
   WD Instant :
   - Buka 24/7
   - Senin-Minggu
   - Maks Rp250.000 / transaksi
   - Maks Rp500.000 / hari
   - Fee Rp15.000
   WD Manual :
   - Normal: Senin-Jumat 07:00-21:00 WIB
   - Sabtu-Minggu / di luar jam normal:
     tetap bisa diajukan
   - Fee normal + OFF_HOURS_FEE
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    'use strict';
    /* =====================================================
       DOM
       ===================================================== */
    const $ = (id) => document.getElementById(id);
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
    /* New HTML elements */
    const manualStatus = $('manualStatus');
    const manualStatusTitle = $('manualStatusTitle');
    const manualStatusText = $('manualStatusText');
    const manualFeeText = $('manualFeeText');
    const withdrawFeePreview = $('withdrawFeePreview');
    const withdrawFee = $('withdrawFee');
    const withdrawNet = $('withdrawNet');
    /* =====================================================
       CONSTANTS
       ===================================================== */
    const DAILY_LIMIT = 500000;
    const INSTANT_MAX = 250000;
    const MANUAL_MIN = 100000;
    const INSTANT_FEE = 15000;
    const MANUAL_FEE_BANK = 10000;
    const MANUAL_FEE_EWALLET = 7000;
    /*
     * Fee tambahan ketika WD Manual dilakukan:
     *
     * - Sabtu
     * - Minggu
     * - Senin-Jumat sebelum 07:00
     * - Senin-Jumat mulai 21:00
     *
     * GANTI ANGKA INI jika nominal fee tambahan
     * yang kamu inginkan berbeda.
     */
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
    /* =====================================================
       TIME / WITHDRAW SCHEDULE
       ===================================================== */
    /*
     * Mendapatkan waktu WIB secara konsisten.
     *
     * Kita tidak memakai timezone browser untuk menentukan
     * jam operasional.
     */
    const getJakartaParts = () => {
        const parts = new Intl.DateTimeFormat(
            'en-US',
            {
                timeZone: TIMEZONE,
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }
        ).formatToParts(new Date());
        const get = (type) => {
            return parts.find(
                (part) => part.type === type
            )?.value;
        };
        const weekday = get('weekday');
        const hour = Number(get('hour') || 0);
        const minute = Number(get('minute') || 0);
        return {
            weekday,
            hour,
            minute,
            totalMinutes: (hour * 60) + minute
        };
    };
    /*
     * Manual NORMAL hanya:
     * Senin-Jumat
     * 07:00 sampai sebelum 21:00 WIB
     */
    const isManualNormalHours = () => {
        const now = getJakartaParts();
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
            currentMinutes >= openMinutes &&
            currentMinutes < closeMinutes
        );
    };
    /*
     * Instant selalu buka.
     */
    const isInstantOpen = () => {
        return true;
    };
    /*
     * Apakah manual sedang di luar jam normal?
     */
    const isManualOffHours = () => {
        return !isManualNormalHours();
    };
    /* =====================================================
       MANUAL FEE
       ===================================================== */
    const getNormalManualFee = () => {
        const method =
            String(
                methodEl?.value || 'ewallet'
            ).toLowerCase();
        if (method === 'bank') {
            return MANUAL_FEE_BANK;
        }
        return MANUAL_FEE_EWALLET;
    };
    const getManualFee = () => {
        const normalFee =
            getNormalManualFee();
        if (isManualOffHours()) {
            return (
                normalFee +
                MANUAL_OFF_HOURS_FEE
            );
        }
        return normalFee;
    };
    /* =====================================================
       MANUAL STATUS UI
       ===================================================== */
    const renderManualSchedule = () => {
        if (!manualStatus) {
            return;
        }
        const normalHours =
            isManualNormalHours();
        const offHours =
            !normalHours;
        manualStatus.classList.remove(
            'open',
            'closed',
            'off-hours'
        );
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
                    `Tetap bisa mengajukan. Fee tambahan ${money(MANUAL_OFF_HOURS_FEE)} berlaku.`;
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
            MANUAL_FEE_BANK + extra;
        const ewalletFee =
            MANUAL_FEE_EWALLET + extra;
        if (extra > 0) {
            manualFeeText.textContent =
                `Fee saat ini: Bank ${money(bankFee)} · E-Wallet ${money(ewalletFee)}`;
        } else {
            manualFeeText.textContent =
                `Fee Bank ${money(MANUAL_FEE_BANK)} · E-Wallet ${money(MANUAL_FEE_EWALLET)}`;
        }
    };
    /* =====================================================
       FEE PREVIEW
       ===================================================== */
    const renderFeePreview = () => {
        if (!withdrawFee || !withdrawNet) {
            return;
        }
        const amount =
            amountNumber(
                amountEl?.value
            );
        if (amount <= 0) {
            withdrawFee.textContent =
                money(getManualFee());
            withdrawNet.textContent =
                money(0);
            return;
        }
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
    };
    /* =====================================================
       HELPERS
       ===================================================== */
    const money = (value) => {
        const amount = Number(
            value || 0
        );
        if (
            typeof TC !== 'undefined' &&
            typeof TC?.money === 'function'
        ) {
            return TC.money(
                Number.isFinite(amount)
                    ? amount
                    : 0
            );
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
        if (
            typeof TC !== 'undefined' &&
            typeof TC?.esc === 'function'
        ) {
            return TC.esc(
                String(value ?? '')
            );
        }
        return String(value ?? '')
            .replace(
                /&/g,
                '&amp;'
            )
            .replace(
                /</g,
                '&lt;'
            )
            .replace(
                />/g,
                '&gt;'
            )
            .replace(
                /"/g,
                '&quot;'
            )
            .replace(
                /'/g,
                '&#039;'
            );
    };
    const toast = (
        message,
        type = 'error'
    ) => {
        if (
            typeof TC !== 'undefined' &&
            typeof TC?.toast === 'function'
        ) {
            TC.toast(
                message,
                type
            );
            return;
        }
        alert(message);
    };
    const statusKey = (status) => {
        const value = String(
            status || ''
        ).toLowerCase();
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
        const value = String(
            status || ''
        ).toLowerCase();
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
        return labels[value] || (
            value
                ? value.replace(
                    /_/g,
                    ' '
                )
                : 'Tidak diketahui'
        );
    };
    const methodLabel = (
        method
    ) => {
        const value = String(
            method || ''
        ).toLowerCase();
        if (value === 'bank') {
            return 'Bank';
        }
        if (
            value === 'ewallet' ||
            value === 'e-wallet'
        ) {
            return 'E-Wallet';
        }
        return method || '-';
    };
    const methodIcon = (
        method
    ) => {
        return String(
            method || ''
        ).toLowerCase() === 'bank'
            ? 'fa-building-columns'
            : 'fa-wallet';
    };
    const amountNumber = (
        value
    ) => {
        const number =
            Number(value);
        return Number.isFinite(number)
            ? number
            : 0;
    };
    const isPending = (row) => {
        return [
            'pending',
            'processing'
        ].includes(
            String(
                row?.status || ''
            ).toLowerCase()
        );
    };
    const isCompleted = (row) => {
        return [
            'completed',
            'paid',
            'success',
            'successful'
        ].includes(
            String(
                row?.status || ''
            ).toLowerCase()
        );
    };
    /* =====================================================
       WIB DATE HELPERS
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
            ).formatToParts(date);
        const get = (type) => {
            return parts.find(
                (part) =>
                    part.type === type
            )?.value;
        };
        return `${get('year')}-${get('month')}-${get('day')}`;
    };
    const todayJakartaKey = () => {
        return jakartaDateKey(
            new Date()
        );
    };
    const isToday = (
        dateValue
    ) => {
        const rowKey =
            jakartaDateKey(
                dateValue
            );
        return (
            rowKey !== null &&
            rowKey ===
                todayJakartaKey()
        );
    };
    /* =====================================================
       BUTTON LOADING
       ===================================================== */
    const setButtonLoading = (
        button,
        loading,
        loadingText
    ) => {
        if (!button) {
            return;
        }
        if (loading) {
            button.dataset.originalHtml =
                button.innerHTML;
            button.disabled = true;
            button.classList.add(
                'loading'
            );
            button.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>
                    ${esc(
                        loadingText ||
                        'Memproses...'
                    )}
                </span>
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
        }
    };
    /* =====================================================
       LOADING / ERROR
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
    };
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
        $('retryHistory')?.addEventListener(
            'click',
            loadWallet
        );
    };
    /* =====================================================
       DAILY LIMIT
       ===================================================== */
    const calculateTodayAmount = () => {
        return withdrawals
            .filter(isToday)
            .filter((row) => {
                /*
                 * Limit Rp500.000 adalah khusus
                 * WD Instant.
                 */
                const mode =
                    String(
                        row?.mode ||
                        ''
                    ).toLowerCase();
                return mode === 'instant';
            })
            .reduce(
                (total, row) => {
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
            calculateTodayAmount();
        const percent = Math.min(
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
            `${money(todayAmount)} / ${money(DAILY_LIMIT)}`;
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
       INSTANT AMOUNTS
       ===================================================== */
    const renderInstantAmounts = () => {
        if (!instantBtns) {
            return;
        }
        instantBtns.innerHTML =
            INSTANT_AMOUNTS
                .map(
                    (amount) => `
                        <button
                            type="button"
                            class="instant-choice ${
                                amount ===
                                selectedInstantAmount
                                    ? 'selected'
                                    : ''
                            }"
                            data-amount="${amount}"
                        >
                            <i class="fa-solid fa-bolt"></i>
                            ${esc(
                                money(amount)
                            )}
                        </button>
                    `
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
                                    button.dataset.amount
                                );
                            instantBtns
                                .querySelectorAll(
                                    '.instant-choice'
                                )
                                .forEach(
                                    (item) => {
                                        item.classList.remove(
                                            'selected'
                                        );
                                    }
                                );
                            button.classList.add(
                                'selected'
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
        methodEl.value =
            method.method_type ||
            method.method ||
            'ewallet';
        nameEl.value =
            method.account_name ||
            '';
        numberEl.value =
            method.account_number ||
            '';
        savedMethodsEl
            ?.querySelectorAll(
                '.saved-method'
            )
            .forEach(
                (button) => {
                    button.classList.toggle(
                        'selected',
                        button.dataset.methodId ===
                        String(method.id)
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
                        (method) => `
                            <button
                                type="button"
                                class="saved-method ${
                                    selectedPaymentMethod?.id ===
                                    method.id
                                        ? 'selected'
                                        : ''
                                }"
                                data-method-id="${esc(
                                    method.id
                                )}"
                            >
                                <div class="saved-method-main">
                                    <strong>
                                        ${esc(
                                            method.provider ||
                                            method.method_type ||
                                            'Payment'
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
                        `
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
                                            button.dataset.methodId
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
            amountNumber(
                wallet?.available_balance ??
                wallet?.balance ??
                profile?.balance ??
                0
            );
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
        balEl.textContent =
            money(balance);
        reqEl.textContent =
            money(pending);
        doneEl.textContent =
            money(completed);
    };
    /* =====================================================
       HISTORY
       ===================================================== */
    const renderHistory = () => {
        if (!historyEl) {
            return;
        }
        historyCount.textContent =
            `${withdrawals.length} transaksi`;
        if (!withdrawals.length) {
            historyEl.innerHTML = `
                <div class="history-empty">
                    <i class="fa-solid fa-receipt"></i>
                    Belum ada pengajuan withdraw.
                </div>
            `;
            return;
        }
        historyEl.innerHTML =
            withdrawals
                .map(
                    (row) => {
                        const date =
                            new Date(
                                row.created_at
                            );
                        const dateText =
                            Number.isNaN(
                                date.getTime()
                            )
                                ? '-'
                                : date.toLocaleDateString(
                                    'id-ID',
                                    {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        timeZone:
                                            TIMEZONE
                                    }
                                );
                        const timeText =
                            Number.isNaN(
                                date.getTime()
                            )
                                ? ''
                                : date.toLocaleTimeString(
                                    'id-ID',
                                    {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone:
                                            TIMEZONE
                                    }
                                );
                        const status =
                            statusKey(
                                row.status
                            );
                        const method =
                            row.method ||
                            row.method_type ||
                            '-';
                        const ticket =
                            row.ticket_code ||
                            row.id ||
                            '-';
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
                                                row.amount
                                            )
                                        )}
                                    </strong>
                                </div>
                                <div class="history-method">
                                    <strong>
                                        <i
                                            class="fa-solid ${
                                                methodIcon(
                                                    method
                                                )
                                            }"
                                        ></i>
                                        ${esc(
                                            methodLabel(
                                                method
                                            )
                                        )}
                                    </strong>
                                    <small>
                                        ${esc(
                                            row.account_number ||
                                            '-'
                                        )}
                                    </small>
                                </div>
                                <div class="history-type">
                                    ${esc(
                                        String(
                                            row.mode ||
                                            'manual'
                                        ).replace(
                                            /_/g,
                                            ' '
                                        )
                                    )}
                                </div>
                                <div>
                                    <span
                                        class="status-badge ${status}"
                                    >
                                        ${esc(
                                            statusLabel(
                                                row.status
                                            )
                                        )}
                                    </span>
                                </div>
                                <div class="ticket-code">
                                    #${esc(ticket)}
                                </div>
                            </div>
                        `;
                    }
                )
                .join('');
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
        if (mode === 'instant') {
            /*
             * Instant selalu buka 24/7.
             */
            if (!isInstantOpen()) {
                return 'WD Instant sedang tidak tersedia.';
            }
            if (
                amount >
                INSTANT_MAX
            ) {
                return 'WD Instant maksimum Rp250.000.';
            }
            const today =
                calculateTodayAmount();
            if (
                today + amount >
                DAILY_LIMIT
            ) {
                return 'Batas WD Instant harian Rp500.000 akan terlampaui.';
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
           BALANCE
           --------------------------------------------- */
        const balance =
            amountNumber(
                wallet?.available_balance ??
                wallet?.balance ??
                profile?.balance ??
                0
            );
        /*
         * Saldo harus cukup untuk nominal + fee.
         */
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
                `Dibutuhkan ${money(totalDebit)} ` +
                `(nominal ${money(amount)} + fee ${money(fee)}).`
            );
        }
        /* ---------------------------------------------
           ACCOUNT
           --------------------------------------------- */
        const accountName =
            nameEl.value.trim();
        const accountNumber =
            numberEl.value.trim();
        if (!accountName) {
            return 'Nama pemegang wajib diisi.';
        }
        if (!accountNumber) {
            return 'Nomor rekening / e-wallet wajib diisi.';
        }
        return null;
    };
    /* =====================================================
       REQUEST WITHDRAWAL
       ===================================================== */
    async function requestWithdrawal(
        amount,
        mode
    ) {
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
        isSubmitting = true;
        const button =
            mode === 'instant'
                ? instantSubmit
                : manualSubmit;
        setButtonLoading(
            button,
            true,
            mode === 'instant'
                ? 'Mengajukan WD...'
                : 'Mengirim pengajuan...'
        );
        try {
            /*
             * IMPORTANT:
             *
             * Fee harus dihitung juga di database/RPC.
             * Frontend hanya sebagai preview.
             */
            const response =
                await sb.rpc(
                    'request_withdrawal_v2',
                    {
                        p_amount:
                            amount,
                        p_mode:
                            mode,
                        p_method:
                            methodEl.value,
                        p_account_name:
                            nameEl.value.trim(),
                        p_account_number:
                            numberEl.value.trim()
                    }
                );
            if (response?.error) {
                throw response.error;
            }
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
             * Reload setelah RPC sukses supaya:
             * - saldo
             * - limit
             * - history
             * selalu sinkron dengan Supabase.
             */
            setTimeout(
                () => {
                    location.reload();
                },
                650
            );
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
            setButtonLoading(
                button,
                false
            );
            isSubmitting = false;
        }
    }
    /* =====================================================
       LOAD WALLET
       ===================================================== */
    async function loadWallet() {
        renderHistoryLoading();
        try {
            profile =
                await TC.profile();
            if (!profile) {
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
                sb
                    .from('wallets')
                    .select('*')
                    .eq(
                        'user_id',
                        profile.id
                    )
                    .maybeSingle(),
                sb
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
                sb
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
                walletResponse.data;
            withdrawals =
                withdrawalsResponse.data ||
                [];
            paymentMethods =
                methodsResponse.data ||
                [];
            selectedPaymentMethod =
                paymentMethods[0] ||
                null;
            renderSummary();
            renderDailyLimit();
            renderInstantAmounts();
            renderPaymentMethods();
            renderHistory();
            renderManualSchedule();
            /*
             * Automatically use first saved
             * payment method.
             */
            if (
                selectedPaymentMethod
            ) {
                applyPaymentMethod(
                    selectedPaymentMethod
                );
            }
            renderFeePreview();
        } catch (error) {
            console.error(
                'Withdrawals load error:',
                error
            );
            historyCount.textContent =
                'Gagal';
            renderHistoryError(
                error?.message ||
                'Data withdraw gagal dimuat.'
            );
        }
    }
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
       MANUAL SUBMIT
       ===================================================== */
    form?.addEventListener(
        'submit',
        (event) => {
            event.preventDefault();
            requestWithdrawal(
                amountNumber(
                    amountEl.value
                ),
                'manual'
            );
        }
    );
    /* =====================================================
       PAYMENT METHOD CHANGE
       ===================================================== */
    methodEl?.addEventListener(
        'change',
        () => {
            renderManualSchedule();
            renderFeePreview();
        }
    );
    /* =====================================================
       AMOUNT CHANGE
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
       ACCOUNT NUMBER
       ===================================================== */
    numberEl?.addEventListener(
        'input',
        () => {
            /*
             * Keep field friendly while
             * preventing accidental spaces.
             */
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
       URGENT ADMIN REQUEST
       ===================================================== */
    $('urgent')?.addEventListener(
        'click',
        () => {
            /*
             * Existing implementation only
             * showed a toast.
             *
             * No fake RPC/table is created.
             */
            toast(
                'Silakan hubungi admin melalui kanal bantuan PasTele.',
                'success'
            );
        }
    );
    /* =====================================================
       REFRESH SCHEDULE STATUS
       ===================================================== */
    /*
     * Update status dan fee setiap menit.
     *
     * Berguna ketika user membuka halaman sebelum
     * jam 21:00 lalu tetap berada di halaman sampai
     * lewat jam operasional.
     */
    setInterval(
        () => {
            renderManualSchedule();
            renderFeePreview();
        },
        60 * 1000
    );
    /* =====================================================
       START
       ===================================================== */
    await loadWallet();
});
