/* =========================================================
   PasTele — Wallet
   Real Supabase data
   Existing schema only
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const availableEl = $('available');
    const pendingEl = $('pending');
    const incomeEl = $('income');
    const todayEl = $('today');
    const breakdownEl = $('breakdown');
    let profile = null;
    /* =====================================================
       Helpers
       ===================================================== */
    const money = (value) => {
        const amount = Number(value || 0);
        if (typeof TC?.money === 'function') {
            return TC.money(
                Number.isFinite(amount) ? amount : 0
            );
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(
            Number.isFinite(amount) ? amount : 0
        );
    };
    const showToast = (message, type = 'error') => {
        if (typeof TC?.toast === 'function') {
            TC.toast(message, type);
        } else {
            alert(message);
        }
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
    const amountOf = (row) => {
        const value = row?.net_amount ?? row?.amount ?? 0;
        const number = Number(value);
        return Number.isFinite(number)
            ? number
            : 0;
    };
    /* =====================================================
       Valid income transaction
       ===================================================== */
    const isGoodTransaction = (row) => {
        const status = String(
            row?.status || ''
        ).toLowerCase();
        return [
            'completed',
            'paid',
            'available',
            'success'
        ].includes(status) && amountOf(row) > 0;
    };
    /* =====================================================
       State
       ===================================================== */
    const renderLoading = () => {
        availableEl.textContent = '—';
        pendingEl.textContent = '—';
        incomeEl.textContent = '—';
        todayEl.textContent = '—';
        breakdownEl.innerHTML = `
            <div class="wallet-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Memuat statistik...</span>
            </div>
        `;
    };
    const renderError = (message) => {
        availableEl.textContent = '—';
        pendingEl.textContent = '—';
        incomeEl.textContent = '—';
        todayEl.textContent = '—';
        breakdownEl.innerHTML = `
            <div class="wallet-state">
                <div class="wallet-state-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <strong>Wallet gagal dimuat</strong>
                <span>
                    ${esc(
                        message ||
                        'Terjadi kesalahan saat mengambil data keuangan.'
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
        $('walletRetry')?.addEventListener(
            'click',
            loadWallet
        );
    };
    /* =====================================================
       Load Wallet
       ===================================================== */
    async function loadWallet() {
        renderLoading();
        try {
            profile = await TC.profile();
            if (!profile) {
                location.replace('login.html');
                return;
            }
            const [
                walletResponse,
                walletTransactionsResponse,
                transactionsResponse
            ] = await Promise.all([
                sb
                    .from('wallets')
                    .select('*')
                    .eq('user_id', profile.id)
                    .maybeSingle(),
                sb
                    .from('wallet_transactions')
                    .select('*')
                    .eq('user_id', profile.id)
                    .order('created_at', {
                        ascending: false
                    })
                    .limit(500),
                sb
                    .from('transactions')
                    .select('*')
                    .eq('user_id', profile.id)
                    .order('created_at', {
                        ascending: false
                    })
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
            const wallet = walletResponse.data;
            /*
             * Keep the existing transaction behavior:
             * wallet_transactions + sell_* transactions.
             */
            const walletRows =
                walletTransactionsResponse.data || [];
            const transactionRows =
                (transactionsResponse.data || [])
                    .filter((row) => {
                        return /^sell_/i.test(
                            String(row?.type || '')
                        );
                    });
            const rows = [
                ...walletRows,
                ...transactionRows
            ];
            /* =================================================
               Balance
               ================================================= */
            const availableBalance =
                wallet?.available_balance ??
                wallet?.balance ??
                profile?.balance ??
                0;
            const pendingBalance =
                wallet?.pending_balance ?? 0;
            availableEl.textContent =
                money(availableBalance);
            pendingEl.textContent =
                money(pendingBalance);
            /* =================================================
               Total income
               ================================================= */
            const validRows =
                rows.filter(isGoodTransaction);
            const totalIncome =
                validRows.reduce(
                    (total, row) => {
                        return total + amountOf(row);
                    },
                    0
                );
            /* =================================================
               Today income
               ================================================= */
            const now = new Date();
            const todayIncome =
                validRows
                    .filter((row) => {
                        if (!row?.created_at) {
                            return false;
                        }
                        const date =
                            new Date(row.created_at);
                        if (
                            Number.isNaN(
                                date.getTime()
                            )
                        ) {
                            return false;
                        }
                        return (
                            date.toDateString() ===
                            now.toDateString()
                        );
                    })
                    .reduce(
                        (total, row) => {
                            return total + amountOf(row);
                        },
                        0
                    );
            incomeEl.textContent =
                money(totalIncome);
            todayEl.textContent =
                money(todayIncome);
            /* =================================================
               Breakdown
               ================================================= */
            renderBreakdown(rows);
        } catch (error) {
            console.error(
                'Wallet load error:',
                error
            );
            renderError(
                error?.message ||
                'Wallet gagal dimuat.'
            );
        }
    }
    /* =====================================================
       Breakdown
       ===================================================== */
    function renderBreakdown(rows) {
        const types = [
            {
                type: 'link',
                icon: 'fa-link',
                label: 'LINK'
            },
            {
                type: 'code',
                icon: 'fa-code',
                label: 'CODE'
            },
            {
                type: 'channel',
                icon: 'fa-broadcast-tower',
                label: 'CHANNEL'
            },
            {
                type: 'group',
                icon: 'fa-users',
                label: 'GROUP'
            }
        ];
        breakdownEl.innerHTML = types
            .map((item) => {
                const total =
                    rows
                        .filter((row) => {
                            if (!isGoodTransaction(row)) {
                                return false;
                            }
                            return String(
                                row?.type || ''
                            )
                                .toLowerCase()
                                .includes(item.type);
                        })
                        .reduce(
                            (sum, row) => {
                                return sum + amountOf(row);
                            },
                            0
                        );
                return `
                    <a
                        class="income-item"
                        href="transactions.html?type=${encodeURIComponent(
                            item.type
                        )}"
                    >
                        <span>
                            <i class="fa-solid ${item.icon}"></i>
                        </span>
                        <b>${esc(item.label)}</b>
                        <strong>
                            ${esc(money(total))}
                        </strong>
                        <small>
                            Detail transaksi
                            <i class="fa-solid fa-arrow-right"></i>
                        </small>
                    </a>
                `;
            })
            .join('');
    }
    /* =====================================================
       Initial load
       ===================================================== */
    await loadWallet();
});
