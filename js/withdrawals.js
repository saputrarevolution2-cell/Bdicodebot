/* =========================================================
   PasTele — Withdrawals
   Real Supabase data
   Existing schema preserved
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    'use strict';
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
    const DAILY_LIMIT = 500000;
    const INSTANT_MAX = 250000;
    const MANUAL_MIN = 100000;
    const INSTANT_AMOUNTS = [
        50000,
        100000,
        150000,
        200000,
        250000
    ];
    let profile = null;
    let wallet = null;
    let withdrawals = [];
    let paymentMethods = [];
    let selectedInstantAmount = 50000;
    let selectedPaymentMethod = null;
    let isSubmitting = false;
    /* =====================================================
       Helpers
       ===================================================== */
    const money = (value) => {
        const amount = Number(value || 0);
        if (typeof TC?.money === 'function') {
            return TC.money(
                Number.isFinite(amount)
                    ? amount
                    : 0
            );
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(
            Number.isFinite(amount)
                ? amount
                : 0
        );
    };
    const esc = (value) => {
        if (typeof TC?.esc === 'function') {
            return TC.esc(String(value ?? ''));
        }
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
    const toast = (message, type = 'error') => {
        if (typeof TC?.toast === 'function') {
            TC.toast(message, type);
            return;
        }
        alert(message);
    };
    const statusKey = (status) => {
        const value = String(
            status || ''
        ).toLowerCase();
        if (
            ['completed', 'paid', 'success', 'successful'].includes(value)
        ) {
            return 'success';
        }
        if (
            ['failed', 'cancelled', 'canceled', 'rejected'].includes(value)
        ) {
            return value === 'rejected'
                ? 'rejected'
                : 'failed';
        }
        if (value === 'processing') {
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
                ? value.replace(/_/g, ' ')
                : 'Tidak diketahui'
        );
    };
    const methodLabel = (method) => {
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
    const methodIcon = (method) => {
        return String(method || '').toLowerCase() === 'bank'
            ? 'fa-building-columns'
            : 'fa-wallet';
    };
    const amountNumber = (value) => {
        const number = Number(value);
        return Number.isFinite(number)
            ? number
            : 0;
    };
    const isPending = (row) => {
        return [
            'pending',
            'processing'
        ].includes(
            String(row?.status || '').toLowerCase()
        );
    };
    const isCompleted = (row) => {
        return [
            'completed',
            'paid',
            'success',
            'successful'
        ].includes(
            String(row?.status || '').toLowerCase()
        );
    };
    const isToday = (dateValue) => {
        if (!dateValue) {
            return false;
        }
        const date = new Date(dateValue);
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
            button.classList.add('loading');
            button.innerHTML = `
                <i class="fa-solid fa-spinner"></i>
                <span>${esc(loadingText || 'Memproses...')}</span>
            `;
            return;
        }
        button.disabled = false;
        button.classList.remove('loading');
        if (button.dataset.originalHtml) {
            button.innerHTML =
                button.dataset.originalHtml;
        }
    };
    /* =====================================================
       Loading / Error
       ===================================================== */
    const renderHistoryLoading = () => {
        historyEl.innerHTML = `
            <div class="history-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Memuat riwayat...
            </div>
        `;
    };
    const renderHistoryError = (message) => {
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
       Daily limit
       ===================================================== */
    const calculateTodayAmount = () => {
        return withdrawals
            .filter(isToday)
            .reduce(
                (total, row) => {
                    return total + amountNumber(
                        row?.amount
                    );
                },
                0
            );
    };
    const renderDailyLimit = () => {
        const todayAmount =
            calculateTodayAmount();
        const percent = Math.min(
            100,
            Math.round(
                (todayAmount / DAILY_LIMIT) * 100
            )
        );
        dailyBar.style.width =
            `${percent}%`;
        dailyPercent.textContent =
            `${percent}%`;
        dailyText.textContent =
            `${money(todayAmount)} / ${money(DAILY_LIMIT)}`;
        dailyBar.removeAttribute('data-level');
        if (percent >= 100) {
            dailyBar.dataset.level = 'full';
        } else if (percent >= 50) {
            dailyBar.dataset.level = 'half';
        }
    };
    /* =====================================================
       Instant amounts
       ===================================================== */
    const renderInstantAmounts = () => {
        instantBtns.innerHTML =
            INSTANT_AMOUNTS
                .map((amount) => `
                    <button
                        type="button"
                        class="instant-choice ${
                            amount === selectedInstantAmount
                                ? 'selected'
                                : ''
                        }"
                        data-amount="${amount}"
                    >
                        <i class="fa-solid fa-bolt"></i>
                        ${esc(money(amount))}
                    </button>
                `)
                .join('');
        instantBtns
            .querySelectorAll('.instant-choice')
            .forEach((button) => {
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
                            .forEach((item) => {
                                item.classList.remove(
                                    'selected'
                                );
                            });
                        button.classList.add(
                            'selected'
                        );
                        instantAmount.textContent =
                            money(
                                selectedInstantAmount
                            );
                    }
                );
            });
        instantAmount.textContent =
            money(selectedInstantAmount);
    };
    /* =====================================================
       Payment methods
       ===================================================== */
    const applyPaymentMethod = (method) => {
        if (!method) {
            return;
        }
        selectedPaymentMethod = method;
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
            .querySelectorAll('.saved-method')
            .forEach((button) => {
                button.classList.toggle(
                    'selected',
                    button.dataset.methodId ===
                    String(method.id)
                );
            });
    };
    const renderPaymentMethods = () => {
        if (!paymentMethods.length) {
            savedMethodsEl.classList.add(
                'hidden'
            );
            savedMethodsEl.innerHTML = '';
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
                    .map((method) => `
                        <button
                            type="button"
                            class="saved-method ${
                                selectedPaymentMethod?.id === method.id
                                    ? 'selected'
                                    : ''
                            }"
                            data-method-id="${esc(method.id)}"
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
                                    ${method.account_name ? ' · ' : ''}
                                    ${esc(
                                        method.account_number ||
                                        ''
                                    )}
                                </small>
                            </div>
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    `)
                    .join('')}
            </div>
        `;
        savedMethodsEl
            .querySelectorAll(
                '[data-method-id]'
            )
            .forEach((button) => {
                button.addEventListener(
                    'click',
                    () => {
                        const method =
                            paymentMethods.find(
                                (item) =>
                                    String(item.id) ===
                                    String(
                                        button.dataset.methodId
                                    )
                            );
                        applyPaymentMethod(
                            method
                        );
                    }
                );
            });
    };
    /* =====================================================
       Summary
       ===================================================== */
    const renderSummary = () => {
        const balance = amountNumber(
            wallet?.available_balance ??
            wallet?.balance ??
            profile?.balance ??
            0
        );
        const pending = withdrawals
            .filter(isPending)
            .reduce(
                (total, row) => {
                    return total + amountNumber(
                        row?.total_debit ??
                        row?.amount
                    );
                },
                0
            );
        const completed = withdrawals
            .filter(isCompleted)
            .reduce(
                (total, row) => {
                    return total + amountNumber(
                        row?.amount
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
       History
       ===================================================== */
    const renderHistory = () => {
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
                .map((row) => {
                    const date =
                        new Date(row.created_at);
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
                                    year: 'numeric'
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
                                    minute: '2-digit'
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
                                    ${esc(dateText)}
                                </strong>
                                <small>
                                    ${esc(timeText)}
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
                                    <i class="fa-solid ${methodIcon(method)}"></i>
                                    ${esc(
                                        methodLabel(method)
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
                })
                .join('');
    };
    /* =====================================================
       Validation
       ===================================================== */
    const validateCommon = (
        amount,
        mode
    ) => {
        if (!amount || amount <= 0) {
            return 'Nominal wajib diisi.';
        }
        if (mode === 'instant') {
            if (amount > INSTANT_MAX) {
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
        if (
            mode === 'manual' &&
            amount < MANUAL_MIN
        ) {
            return 'WD Manual minimum Rp100.000.';
        }
        const balance =
            amountNumber(
                wallet?.available_balance ??
                wallet?.balance ??
                profile?.balance ??
                0
            );
        if (amount > balance) {
            return 'Saldo tersedia tidak mencukupi.';
        }
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
       Request withdrawal
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
            const response =
                await sb.rpc(
                    'request_withdrawal_v2',
                    {
                        p_amount: amount,
                        p_mode: mode,
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
                    : 'WD Manual berhasil diajukan.',
                'success'
            );
            /*
             * Reload after RPC success so the wallet,
             * limits and history are always synchronized
             * with Supabase.
             */
            setTimeout(() => {
                location.reload();
            }, 650);
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
       Load wallet
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
                            ascending: false
                        }
                    )
                    .limit(100),
                sb
                    .from('payment_methods')
                    .select('*')
                    .eq(
                        'user_id',
                        profile.id
                    )
                    .order(
                        'created_at',
                        {
                            ascending: false
                        }
                    )
            ]);
            if (walletResponse?.error) {
                throw walletResponse.error;
            }
            if (
                withdrawalsResponse?.error
            ) {
                throw withdrawalsResponse.error;
            }
            if (methodsResponse?.error) {
                throw methodsResponse.error;
            }
            wallet =
                walletResponse.data;
            withdrawals =
                withdrawalsResponse.data || [];
            paymentMethods =
                methodsResponse.data || [];
            selectedPaymentMethod =
                paymentMethods[0] || null;
            renderSummary();
            renderDailyLimit();
            renderInstantAmounts();
            renderPaymentMethods();
            renderHistory();
            /*
             * Automatically use the first saved
             * payment method when available.
             */
            if (selectedPaymentMethod) {
                applyPaymentMethod(
                    selectedPaymentMethod
                );
            }
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
       Instant submit
       ===================================================== */
    instantSubmit.addEventListener(
        'click',
        () => {
            requestWithdrawal(
                selectedInstantAmount,
                'instant'
            );
        }
    );
    /* =====================================================
       Manual submit
       ===================================================== */
    form.addEventListener(
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
       Input normalization
       ===================================================== */
    amountEl.addEventListener(
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
        }
    );
    numberEl.addEventListener(
        'input',
        () => {
            /*
             * Keep the field friendly for account numbers
             * while preventing accidental spaces.
             */
            numberEl.value =
                numberEl.value
                    .replace(/\s+/g, '')
                    .trim();
        }
    );
    /* =====================================================
       Urgent admin request
       ===================================================== */
    $('urgent')?.addEventListener(
        'click',
        () => {
            /*
             * The existing implementation only showed a toast.
             * There is currently no known RPC/table in the supplied
             * schema for an actual admin-request ticket.
             *
             * Therefore we keep this honest and do not insert
             * fake data into an unknown table.
             */
            toast(
                'Silakan hubungi admin melalui kanal bantuan PasTele.',
                'success'
            );
        }
    );
    /* =====================================================
       Start
       ===================================================== */
    await loadWallet();
});
