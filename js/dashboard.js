(() => {
    'use strict';

    /* =========================================================
       TELECOD DASHBOARD
       Full Dashboard.js
       Supabase + DompetX
    ========================================================= */

    const C = window.TELECOD_CONFIG || {};

    const configured =
        !!C.SUPABASE_URL &&
        !String(C.SUPABASE_URL).includes('YOUR_') &&
        !!C.SUPABASE_ANON_KEY &&
        !String(C.SUPABASE_ANON_KEY).includes('YOUR_');

    const sup =
        configured && window.supabase
            ? window.supabase.createClient(
                C.SUPABASE_URL,
                C.SUPABASE_ANON_KEY
            )
            : null;

    /* =========================================================
       HELPERS
    ========================================================= */

    const $ = selector => document.querySelector(selector);

    const $$ = selector =>
        Array.from(document.querySelectorAll(selector));

    const state = {
        user: null,
        profile: {},
        lang: localStorage.getItem('telecod_lang') || 'id',
        theme: localStorage.getItem('telecod_theme') || 'dark',
        initialized: false
    };

    const T = {
        id: {
            main: 'Menu Utama',
            creator: 'Creator',
            account: 'Akun',
            dashboard: 'Dashboard',
            marketplace: 'Marketplace',
            channel: 'Channel',
            code: 'Code',
            createChannel: 'Buat / Tambah Channel',
            createCode: 'Buat / Tambah Code',
            purchases: 'My Purchases',
            payment: 'Payment',
            profile: 'Profile',
            settings: 'Pengaturan',
            logout: 'Log Out',

            welcome: 'Selamat datang kembali',
            overview: 'Ringkasan akun kamu',
            products: 'Produk Saya',
            sales: 'Penjualan',
            views: 'Views',
            spent: 'Total Belanja',
            earned: 'Total Pendapatan',
            recent: 'Aktivitas Terbaru',
            quick: 'Aksi Cepat',

            create: 'Buat',
            buy: 'Beli',
            detail: 'Detail',
            free: 'Free',
            paid: 'Paid',

            search: 'Cari channel atau code...',
            all: 'Semua',
            empty: 'Belum ada data.',
            login: 'Silakan login terlebih dahulu.',
            config: 'Supabase belum dikonfigurasi.',
            saved: 'Berhasil disimpan.',
            error: 'Terjadi kesalahan.',

            balance: 'Saldo',
            transactions: 'Transaksi',
            deposit: 'Deposit',
            withdraw: 'Withdraw',

            creatorSince: 'Creator sejak',
            noProducts: 'Belum ada produk.',
            createProduct: 'Buat Produk',

            channelTitle: 'Buat Channel',
            codeTitle: 'Buat Code',

            name: 'Nama',
            description: 'Deskripsi',
            type: 'Tipe',
            price: 'Harga',
            telegram: 'Telegram Channel',
            category: 'Kategori',
            content: 'Isi / Code',
            image: 'Thumbnail URL',
            publish: 'Publish',
            cancel: 'Batal',

            profileInfo: 'Informasi Profil',
            username: 'Username Telegram',
            telegramNo: 'No. Telegram',
            language: 'Bahasa',
            appearance: 'Tampilan',
            security: 'Keamanan',
            dark: 'Gelap',
            light: 'Terang',
            save: 'Simpan',

            purchasesTitle: 'My Purchases',
            paymentTitle: 'Payment',
            marketTitle: 'Marketplace',

            filter: 'Filter',
            channelFree: 'Channel Free',
            channelPaid: 'Channel Paid',
            codeFree: 'Code Free',
            codePaid: 'Code Paid',

            purchase: 'Pembelian',
            status: 'Status',
            date: 'Tanggal',
            amount: 'Jumlah',
            seller: 'Creator',

            typeChannel: 'Channel',
            typeCode: 'Code',

            noPurchases: 'Belum ada pembelian.',
            noTransactions: 'Belum ada transaksi.',

            update: 'Update',
            required: 'Field wajib diisi.',
            minPrice: 'Harga tidak valid.',
            published: 'Produk berhasil dipublish.',

            edit: 'Edit',
            delete: 'Hapus',
            open: 'Buka',
            access: 'Akses',

            pending: 'Menunggu pembayaran',
            paidStatus: 'Sudah dibayar',

            depositHint: 'Minimum Rp 10.000',
            withdrawHint: 'Saldo akan dicadangkan saat request.',

            method: 'Metode',
            accountName: 'Nama Pemilik',
            accountNumber: 'Nomor Rekening / Wallet',
            requestWithdraw: 'Ajukan Withdraw',

            depositAmount: 'Jumlah Deposit',
            pay: 'Bayar Sekarang',
            freeBuy: 'Ambil Gratis',

            paymentCreated:
                'Pembayaran dibuat. Menunggu hasil gateway.',

            paymentSuccess: 'Pembayaran berhasil.',
            paymentFailed:
                'Pembayaran gagal atau kedaluwarsa.',

            withdrawCreated:
                'Permintaan withdraw berhasil dibuat.',

            withdrawHistory: 'Riwayat Withdraw',
            noWithdrawals: 'Belum ada withdraw.',

            detailTitle: 'Detail Produk',
            close: 'Tutup',
            copy: 'Salin',
            copied: 'Tersalin.',

            contentLocked:
                'Konten hanya tersedia setelah pembelian berhasil.',

            selfProduct: 'Ini produk kamu.',
            confirmDelete: 'Hapus produk ini?',
            productDeleted: 'Produk berhasil dihapus.',
            productUpdated: 'Produk berhasil diperbarui.',

            loginRequired: 'Login diperlukan.',
            selectMethod: 'Pilih metode',

            bank: 'Bank',
            ewallet: 'E-Wallet',
            crypto: 'Crypto',

            paymentGateway: 'DompetX',

            settingsSaved:
                'Pengaturan disimpan di perangkat.'
        },

        en: {
            main: 'Main Menu',
            creator: 'Creator',
            account: 'Account',
            dashboard: 'Dashboard',
            marketplace: 'Marketplace',
            channel: 'Channel',
            code: 'Code',
            createChannel: 'Create / Add Channel',
            createCode: 'Create / Add Code',
            purchases: 'My Purchases',
            payment: 'Payment',
            profile: 'Profile',
            settings: 'Settings',
            logout: 'Log Out',

            welcome: 'Welcome back',
            overview: 'Your account overview',
            products: 'My Products',
            sales: 'Sales',
            views: 'Views',
            spent: 'Total Spent',
            earned: 'Total Earned',
            recent: 'Recent Activity',
            quick: 'Quick Actions',

            create: 'Create',
            buy: 'Buy',
            detail: 'Detail',
            free: 'Free',
            paid: 'Paid',

            search: 'Search channel or code...',
            all: 'All',
            empty: 'No data yet.',
            login: 'Please sign in first.',
            config: 'Supabase is not configured.',
            saved: 'Saved successfully.',
            error: 'Something went wrong.',

            balance: 'Balance',
            transactions: 'Transactions',
            deposit: 'Deposit',
            withdraw: 'Withdraw',

            creatorSince: 'Creator since',
            noProducts: 'No products yet.',
            createProduct: 'Create Product',

            channelTitle: 'Create Channel',
            codeTitle: 'Create Code',

            name: 'Name',
            description: 'Description',
            type: 'Type',
            price: 'Price',
            telegram: 'Telegram Channel',
            category: 'Category',
            content: 'Content / Code',
            image: 'Thumbnail URL',
            publish: 'Publish',
            cancel: 'Cancel',

            profileInfo: 'Profile Information',
            username: 'Telegram Username',
            telegramNo: 'Telegram Number',
            language: 'Language',
            appearance: 'Appearance',
            security: 'Security',
            dark: 'Dark',
            light: 'Light',
            save: 'Save',

            purchasesTitle: 'My Purchases',
            paymentTitle: 'Payment',
            marketTitle: 'Marketplace',

            filter: 'Filter',
            channelFree: 'Free Channels',
            channelPaid: 'Paid Channels',
            codeFree: 'Free Codes',
            codePaid: 'Paid Codes',

            purchase: 'Purchase',
            status: 'Status',
            date: 'Date',
            amount: 'Amount',
            seller: 'Creator',

            typeChannel: 'Channel',
            typeCode: 'Code',

            noPurchases: 'No purchases yet.',
            noTransactions: 'No transactions yet.',

            update: 'Update',
            required: 'Required field.',
            minPrice: 'Invalid price.',
            published: 'Product published.',

            edit: 'Edit',
            delete: 'Delete',
            open: 'Open',
            access: 'Access',

            pending: 'Waiting for payment',
            paidStatus: 'Paid',

            depositHint: 'Minimum Rp 10,000',
            withdrawHint:
                'Balance is reserved when requested.',

            method: 'Method',
            accountName: 'Account Name',
            accountNumber: 'Bank / Wallet Number',
            requestWithdraw: 'Request Withdrawal',

            depositAmount: 'Deposit Amount',
            pay: 'Pay Now',
            freeBuy: 'Get Free',

            paymentCreated:
                'Payment created. Waiting for gateway result.',

            paymentSuccess: 'Payment successful.',
            paymentFailed:
                'Payment failed or expired.',

            withdrawCreated:
                'Withdrawal request created.',

            withdrawHistory: 'Withdrawal History',
            noWithdrawals: 'No withdrawals yet.',

            detailTitle: 'Product Detail',
            close: 'Close',
            copy: 'Copy',
            copied: 'Copied.',

            contentLocked:
                'Content is available after successful purchase.',

            selfProduct: 'This is your product.',
            confirmDelete: 'Delete this product?',
            productDeleted: 'Product deleted.',
            productUpdated: 'Product updated.',

            loginRequired: 'Login required.',
            selectMethod: 'Select method',

            bank: 'Bank',
            ewallet: 'E-Wallet',
            crypto: 'Crypto',

            paymentGateway: 'DompetX',

            settingsSaved:
                'Settings saved on this device.'
        }
    };

    const tr = key =>
        (T[state.lang] || T.id)[key] || key;

    /* =========================================================
       SECURITY / FORMAT
    ========================================================= */

    function escape(value) {
        return String(value ?? '').replace(
            /[&<>"']/g,
            char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[char]
        );
    }

    function safeUrl(value) {
        const url = String(value || '').trim();

        if (!url) return '#';

        try {
            const parsed = new URL(url, window.location.origin);

            if (
                parsed.protocol === 'http:' ||
                parsed.protocol === 'https:' ||
                parsed.protocol === 'tg:'
            ) {
                return escape(parsed.href);
            }
        } catch (_) {}

        return '#';
    }

    function money(value) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(Number(value || 0));
    }

    function initials(value) {
        return String(value || 'U')
            .replace('@', '')
            .trim()
            .slice(0, 1)
            .toUpperCase() || 'U';
    }

    function formatDate(value) {
        if (!value) return '-';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return '-';

        return date.toLocaleString(
            state.lang === 'id' ? 'id-ID' : 'en-US'
        );
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString(
            state.lang === 'id' ? 'id-ID' : 'en-US'
        );
    }

    function debounce(fn, delay = 250) {
        let timer;

        return (...args) => {
            clearTimeout(timer);

            timer = setTimeout(() => {
                fn(...args);
            }, delay);
        };
    }

    /* =========================================================
       TOAST
    ========================================================= */

    function toast(message, type = '') {
        const element = $('#toast');

        if (!element) {
            console[type === 'error' ? 'error' : 'log'](message);
            return;
        }

        const icon =
            type === 'success'
                ? 'fa-circle-check'
                : type === 'error'
                    ? 'fa-circle-xmark'
                    : type === 'warning'
                        ? 'fa-triangle-exclamation'
                        : 'fa-circle-info';

        element.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escape(message)}</span>
        `;

        element.className = `toast show ${type}`;

        clearTimeout(window.__telecodToast);

        window.__telecodToast = setTimeout(() => {
            element.className = 'toast';
        }, 4000);
    }

    /* =========================================================
       THEME / LANGUAGE
    ========================================================= */

    function setTheme() {
        document.documentElement.dataset.theme = state.theme;

        localStorage.setItem(
            'telecod_theme',
            state.theme
        );
    }

    function applyLang() {
        document.documentElement.lang = state.lang;

        $$('[data-i18n]').forEach(element => {
            element.textContent =
                tr(element.dataset.i18n);
        });

        const langButton = $('#langBtn');

        if (langButton) {
            langButton.textContent =
                state.lang.toUpperCase();
        }
    }

    /* =========================================================
       MOBILE / NAVIGATION
    ========================================================= */

    function closeMobile() {
        $('#sidebar')?.classList.remove('open');
        $('#overlay')?.classList.remove('show');
    }

    function setActive(page) {
        $$('.nav-item[data-page]').forEach(item => {
            item.classList.toggle(
                'active',
                item.dataset.page === page
            );
        });

        if (
            ['channel-free', 'channel-paid']
                .includes(page)
        ) {
            $('#submenu-channel')
                ?.classList.add('open');
        }

        if (
            ['code-free', 'code-paid']
                .includes(page)
        ) {
            $('#submenu-code')
                ?.classList.add('open');
        }
    }

    function layoutReady() {
        const menu = $('#menuBtn');

        if (menu) {
            menu.onclick = () => {
                $('#sidebar')
                    ?.classList.toggle('open');

                $('#overlay')
                    ?.classList.toggle('show');
            };
        }

        $('#overlay')?.addEventListener(
            'click',
            closeMobile
        );

        $('#themeBtn')?.addEventListener(
            'click',
            () => {
                state.theme =
                    state.theme === 'dark'
                        ? 'light'
                        : 'dark';

                setTheme();
            }
        );

        $('#langBtn')?.addEventListener(
            'click',
            () => {
                state.lang =
                    state.lang === 'id'
                        ? 'en'
                        : 'id';

                localStorage.setItem(
                    'telecod_lang',
                    state.lang
                );

                applyLang();

                render();
            }
        );

        $$('.nav-parent').forEach(button => {
            button.addEventListener('click', () => {
                const target =
                    $('#submenu-' +
                        button.dataset.toggle);

                target?.classList.toggle('open');
            });
        });

        $('#logoutBtn')?.addEventListener(
            'click',
            async event => {
                event.preventDefault();

                try {
                    if (sup) {
                        await sup.auth.signOut();
                    }
                } finally {
                    location.href =
                        'index.html';
                }
            }
        );

        $('#userBtn')?.addEventListener(
            'click',
            () => {
                location.href =
                    'dashboard.html?page=profile';
            }
        );

        $('#notifBtn')?.addEventListener(
            'click',
            () => {
                toast(
                    state.lang === 'id'
                        ? 'Tidak ada notifikasi baru.'
                        : 'No new notifications.'
                );
            }
        );

        $('#modal')?.addEventListener(
            'click',
            event => {
                if (
                    event.target === $('#modal')
                ) {
                    closeModal();
                }
            }
        );

        setTheme();
        applyLang();
    }

    /* =========================================================
       AUTH
    ========================================================= */

    async function loadUser() {
        if (!sup) {
            toast(
                tr('config'),
                'warning'
            );

            return false;
        }

        try {
            const {
                data,
                error
            } = await sup.auth.getUser();

            if (
                error ||
                !data?.user
            ) {
                location.href =
                    'index.html?login=1';

                return false;
            }

            state.user = data.user;

            const {
                data: profile,
                error: profileError
            } = await sup
                .from('profiles')
                .select('*')
                .eq('id', state.user.id)
                .maybeSingle();

            if (profileError) {
                console.warn(
                    'Profile:',
                    profileError
                );
            }

            state.profile =
                profile || {};

            if (state.profile.is_banned) {
                await sup.auth.signOut();

                location.href =
                    'index.html?banned=1';

                return false;
            }

            try {
                await sup.rpc(
                    'ensure_wallet',
                    {
                        p_user:
                            state.user.id
                    }
                );
            } catch (_) {}

            const username =
                state.profile.username ||
                state.user.user_metadata?.username ||
                'user';

            const avatar =
                state.profile.username ||
                state.user.email ||
                'user';

            if ($('#topUser')) {
                $('#topUser').textContent =
                    '@' + username;
            }

            if ($('#avatar')) {
                $('#avatar').textContent =
                    initials(avatar);
            }

            if (
                state.profile.is_admin &&
                $('#adminNav')
            ) {
                $('#adminNav').style.display =
                    'flex';
            }

            return true;
        } catch (error) {
            console.error(error);

            toast(
                error.message ||
                tr('error'),
                'error'
            );

            return false;
        }
    }

    /* =========================================================
       PRODUCTS
    ========================================================= */

    async function queryProducts(filters = {}) {
        if (!sup) return [];

        let query = sup
            .from('marketplace_public')
            .select('*')
            .eq('status', 'published')
            .order(
                'created_at',
                { ascending: false }
            );

        if (filters.type) {
            query = query.eq(
                'type',
                filters.type
            );
        }

        if (filters.access_type) {
            query = query.eq(
                'access_type',
                filters.access_type
            );
        }

        if (filters.search) {
            const search =
                filters.search
                    .replace(/[%_,]/g, ' ')
                    .trim();

            if (search) {
                query = query.or(
                    `title.ilike.%${search}%,description.ilike.%${search}%`
                );
            }
        }

        const {
            data,
            error
        } = await query.limit(100);

        if (error) {
            console.error(error);

            toast(
                error.message ||
                tr('error'),
                'error'
            );

            return [];
        }

        return data || [];
    }

    function productCard(
        product,
        manage = false
    ) {
        const icon =
            product.type === 'channel'
                ? 'fa-bullhorn'
                : 'fa-code';

        const own =
            state.user &&
            product.creator_id ===
            state.user.id;

        const image =
            product.thumbnail_url
                ? `
                    <img
                        src="${safeUrl(product.thumbnail_url)}"
                        alt=""
                        loading="lazy"
                    >
                `
                : `
                    <i class="fa-solid ${icon}"></i>
                `;

        return `
            <article class="card product-card">

                <div class="product-img">
                    ${image}
                </div>

                <div class="product-body">

                    <div class="product-type">

                        <span class="pill">
                            ${
                                product.type === 'channel'
                                    ? tr('typeChannel')
                                    : tr('typeCode')
                            }
                        </span>

                        <span class="pill ${
                            product.access_type
                        }">
                            ${
                                product.access_type === 'free'
                                    ? tr('free')
                                    : tr('paid')
                            }
                        </span>

                    </div>

                    <div class="product-title">
                        ${escape(product.title)}
                    </div>

                    <div class="product-desc">
                        ${escape(
                            product.description || ''
                        )}
                    </div>

                    <div class="creator">
                        @${escape(
                            product.creator_username ||
                            'creator'
                        )}
                        ·
                        ${formatNumber(product.views)}
                        views
                    </div>

                    <div class="product-foot">

                        <span class="price">
                            ${
                                product.access_type === 'free'
                                    ? tr('free')
                                    : money(product.price)
                            }
                        </span>

                        <div class="actions-inline">

                            <button
                                type="button"
                                class="btn btn-secondary"
                                data-detail="${escape(product.id)}"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </button>

                            ${
                                own && manage
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-secondary"
                                            data-edit="${escape(product.id)}"
                                        >
                                            <i class="fa-solid fa-pen"></i>
                                        </button>

                                        <button
                                            type="button"
                                            class="btn btn-danger"
                                            data-delete="${escape(product.id)}"
                                        >
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    `
                                    : `
                                        <button
                                            type="button"
                                            class="btn btn-primary"
                                            data-buy="${escape(product.id)}"
                                        >
                                            <i class="fa-solid ${
                                                product.access_type === 'free'
                                                    ? 'fa-download'
                                                    : 'fa-credit-card'
                                            }"></i>

                                            ${
                                                product.access_type === 'free'
                                                    ? tr('freeBuy')
                                                    : tr('buy')
                                            }
                                        </button>
                                    `
                            }

                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    /* =========================================================
       PRODUCT DETAIL
    ========================================================= */

    async function openProduct(id) {
        if (!sup || !id) return;

        const {
            data: product,
            error
        } = await sup
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !product) {
            toast(
                error?.message ||
                tr('error'),
                'error'
            );

            return;
        }

        try {
            await sup.rpc(
                'increment_product_view',
                {
                    p_product: id,
                    p_viewer_hash:
                        state.user?.id || null
                }
            );
        } catch (_) {}

        let purchase = null;

        if (state.user) {
            const result =
                await sup
                    .from('purchases')
                    .select('status')
                    .eq(
                        'product_id',
                        id
                    )
                    .eq(
                        'buyer_id',
                        state.user.id
                    )
                    .maybeSingle();

            purchase = result.data;
        }

        const canAccess =
            product.access_type === 'free' ||
            purchase?.status === 'paid' ||
            product.creator_id ===
            state.user?.id;

        openModal(`
            <div class="modal-head">

                <div>
                    <div class="eyebrow">
                        ${escape(
                            String(product.type || '')
                                .toUpperCase()
                        )}
                    </div>

                    <h2 class="section-title">
                        ${escape(product.title)}
                    </h2>
                </div>

                <button
                    type="button"
                    class="close"
                    id="closeModal"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <p class="muted">
                ${escape(
                    product.description || ''
                )}
            </p>

            <div class="card modal-inner">

                <div class="stat-label">
                    ${tr('price')}
                </div>

                <div class="stat-value">
                    ${
                        product.access_type === 'free'
                            ? tr('free')
                            : money(product.price)
                    }
                </div>

            </div>

            <div class="actions">

                ${
                    canAccess
                        ? `
                            <button
                                type="button"
                                class="btn btn-primary"
                                id="accessProduct"
                            >
                                <i class="fa-solid fa-unlock"></i>
                                ${tr('access')}
                            </button>
                        `
                        : `
                            <button
                                type="button"
                                class="btn btn-primary"
                                id="modalBuy"
                            >
                                <i class="fa-solid fa-credit-card"></i>
                                ${
                                    product.access_type === 'free'
                                        ? tr('freeBuy')
                                        : tr('pay')
                                }
                            </button>
                        `
                }

            </div>
        `);

        $('#closeModal')?.addEventListener(
            'click',
            closeModal
        );

        if (canAccess) {
            $('#accessProduct')?.addEventListener(
                'click',
                () => showAccess(product)
            );
        } else {
            $('#modalBuy')?.addEventListener(
                'click',
                () => purchase(product.id)
            );
        }
    }

    /* =========================================================
       ACCESS PRODUCT
    ========================================================= */

    function showAccess(product) {
        openModal(`
            <div class="modal-head">

                <h2 class="section-title">
                    ${escape(product.title)}
                </h2>

                <button
                    type="button"
                    class="close"
                    id="closeAccess"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            ${
                product.type === 'channel'
                    ? `
                        <p class="muted">
                            ${escape(
                                product.telegram_channel || ''
                            )}
                        </p>

                        <a
                            class="btn btn-primary"
                            target="_blank"
                            rel="noopener noreferrer"
                            href="${safeUrl(
                                product.telegram_channel
                            )}"
                        >
                            <i class="fa-brands fa-telegram"></i>
                            ${tr('open')}
                        </a>
                    `
                    : `
                        <textarea
                            class="textarea code-area"
                            readonly
                        >${escape(
                            product.content ||
                            tr('contentLocked')
                        )}</textarea>

                        <button
                            type="button"
                            class="btn btn-secondary"
                            id="copyContent"
                        >
                            <i class="fa-regular fa-copy"></i>
                            ${tr('copy')}
                        </button>
                    `
            }
        `);

        $('#closeAccess')?.addEventListener(
            'click',
            closeModal
        );

        $('#copyContent')?.addEventListener(
            'click',
            async () => {
                try {
                    await navigator.clipboard.writeText(
                        product.content || ''
                    );

                    toast(
                        tr('copied'),
                        'success'
                    );
                } catch (_) {
                    toast(
                        'Clipboard tidak tersedia.',
                        'warning'
                    );
                }
            }
        );
    }

    /* =========================================================
       PAYMENT
    ========================================================= */

    function openPaymentModal(payment) {
        const qr =
            payment.qr_url
                ? `
                    <div class="payment-qr">
                        <img
                            src="${safeUrl(payment.qr_url)}"
                            alt="QRIS"
                        >
                    </div>
                `
                : '';

        openModal(`
            <div class="modal-head">

                <h2 class="section-title">
                    <i class="fa-solid fa-qrcode"></i>
                    ${tr('payment')}
                </h2>

                <button
                    type="button"
                    class="close"
                    id="paymentClose"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <div class="payment-modal-body">

                ${qr}

                <div class="payment-info">

                    <b>
                        ${money(payment.amount)}
                    </b>

                    <span>
                        ${escape(
                            payment.method ||
                            'QRIS'
                        )}
                    </span>

                    <small>
                        ${escape(
                            payment.provider_payment_id ||
                            payment.order_id ||
                            ''
                        )}
                    </small>

                </div>

                <div class="grid">

                    <button
                        type="button"
                        class="btn btn-primary"
                        id="checkPay"
                    >
                        <i class="fa-solid fa-rotate"></i>
                        Cek Pembayaran
                    </button>

                    <button
                        type="button"
                        class="btn btn-secondary"
                        id="closePay"
                    >
                        ${tr('close')}
                    </button>

                </div>

                <p class="muted">
                    Selesaikan pembayaran melalui QRIS.
                    Status akan diverifikasi melalui DompetX.
                </p>

            </div>
        `);

        $('#paymentClose')?.addEventListener(
            'click',
            closeModal
        );

        $('#closePay')?.addEventListener(
            'click',
            closeModal
        );

        $('#checkPay')?.addEventListener(
            'click',
            () =>
                pollPayment(
                    payment.payment_id,
                    true
                )
        );
    }

    async function createPayment(
        action,
        payload = {}
    ) {
        if (!sup) {
            toast(
                tr('config'),
                'warning'
            );

            return;
        }

        const functionUrl =
            String(
                C.PAYMENT_CREATE_FUNCTION_URL ||
                ''
            ).trim();

        if (
            !functionUrl ||
            functionUrl.includes('YOUR_')
        ) {
            toast(
                'Payment function belum dikonfigurasi.',
                'warning'
            );

            return;
        }

        try {
            const {
                data: sessionData
            } = await sup.auth.getSession();

            const token =
                sessionData?.session?.access_token;

            if (!token) {
                throw new Error(
                    tr('loginRequired')
                );
            }

            const response =
                await fetch(
                    functionUrl,
                    {
                        method: 'POST',

                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            action,
                            ...payload
                        })
                    }
                );

            const output =
                await response
                    .json()
                    .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    output.error ||
                    'Payment error'
                );
            }

            if (
                !output.payment_id
            ) {
                throw new Error(
                    'Payment ID tidak diterima.'
                );
            }

            toast(
                tr('paymentCreated'),
                'success'
            );

            openPaymentModal(output);

            pollPayment(
                output.payment_id,
                false
            );

        } catch (error) {
            console.error(error);

            toast(
                error.message ||
                tr('error'),
                'error'
            );
        }
    }

    async function pollPayment(
        paymentId,
        manual = false
    ) {
        if (!paymentId || !sup) return;

        const functionUrl =
            String(
                C.PAYMENT_STATUS_FUNCTION_URL ||
                ''
            ).trim();

        if (
            !functionUrl ||
            functionUrl.includes('YOUR_')
        ) {
            toast(
                'Payment status function belum dikonfigurasi.',
                'warning'
            );

            return;
        }

        const maxAttempts =
            manual ? 1 : 40;

        for (
            let attempt = 0;
            attempt < maxAttempts;
            attempt++
        ) {
            if (!manual) {
                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            4000
                        )
                );
            }

            try {
                const {
                    data: sessionData
                } = await sup.auth.getSession();

                const token =
                    sessionData?.session
                        ?.access_token;

                if (!token) {
                    throw new Error(
                        tr('loginRequired')
                    );
                }

                const response =
                    await fetch(
                        functionUrl,
                        {
                            method: 'POST',

                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify({
                                    payment_id:
                                        paymentId
                                })
                        }
                    );

                const result =
                    await response
                        .json()
                        .catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                        'Status payment error'
                    );
                }

                const status =
                    String(
                        result.status ||
                        ''
                    ).toLowerCase();

                if (
                    [
                        'paid',
                        'success',
                        'successful'
                    ].includes(status)
                ) {
                    toast(
                        tr('paymentSuccess'),
                        'success'
                    );

                    closeModal();

                    await render();

                    return;
                }

                if (
                    [
                        'failed',
                        'expired',
                        'cancelled',
                        'refunded'
                    ].includes(status)
                ) {
                    toast(
                        tr('paymentFailed'),
                        'error'
                    );

                    closeModal();

                    await render();

                    return;
                }

                if (manual) {
                    toast(
                        'Pembayaran masih menunggu.',
                        'warning'
                    );
                }

            } catch (error) {
                console.error(error);

                if (manual) {
                    toast(
                        error.message ||
                        tr('error'),
                        'error'
                    );
                }
            }
        }
    }

    /* =========================================================
       PURCHASE
    ========================================================= */

    async function purchase(id) {
        if (!state.user) {
            toast(
                tr('loginRequired'),
                'warning'
            );

            return;
        }

        if (!sup || !id) return;

        const {
            data: product,
            error
        } = await sup
            .from('products')
            .select(
                'id,title,type,access_type,price,status,creator_id'
            )
            .eq('id', id)
            .single();

        if (error || !product) {
            toast(
                error?.message ||
                tr('error'),
                'error'
            );

            return;
        }

        if (
            product.creator_id ===
            state.user.id
        ) {
            toast(
                tr('selfProduct'),
                'warning'
            );

            return;
        }

        if (
            product.status !==
            'published'
        ) {
            toast(
                'Produk belum tersedia.',
                'warning'
            );

            return;
        }

        /* FREE */

        if (
            product.access_type ===
            'free'
        ) {
            try {
                const {
                    error: rpcError
                } = await sup.rpc(
                    'complete_free_purchase',
                    {
                        p_product:
                            id
                    }
                );

                if (rpcError) {
                    throw rpcError;
                }

                toast(
                    tr('paymentSuccess'),
                    'success'
                );

                await render();

            } catch (error) {
                toast(
                    error.message ||
                    tr('error'),
                    'error'
                );
            }

            return;
        }

        /* PAID */

        await createPayment(
            'purchase',
            {
                product_id: id
            }
        );
    }

    /* =========================================================
       DASHBOARD
    ========================================================= */

    async function renderDashboard() {
        setActive('dashboard');

        if (!sup || !state.user) {
            return;
        }

        const [
            productsResult,
            purchasesResult,
            txResult,
            walletResult
        ] = await Promise.all([
            sup
                .from('products')
                .select(
                    'id,views'
                )
                .eq(
                    'creator_id',
                    state.user.id
                ),

            sup
                .from('purchases')
                .select(
                    'id,amount,status'
                )
                .eq(
                    'buyer_id',
                    state.user.id
                ),

            sup
                .from('transactions')
                .select('*')
                .eq(
                    'user_id',
                    state.user.id
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                )
                .limit(6),

            sup
                .from('wallets')
                .select(
                    'balance,pending_balance'
                )
                .eq(
                    'user_id',
                    state.user.id
                )
                .maybeSingle()
        ]);

        const products =
            productsResult.data || [];

        const purchases =
            purchasesResult.data || [];

        const transactions =
            txResult.data || [];

        const wallet =
            walletResult.data || {};

        const views =
            products.reduce(
                (total, product) =>
                    total +
                    Number(
                        product.views || 0
                    ),
                0
            );

        const spent =
            purchases
                .filter(
                    item =>
                        item.status ===
                        'paid'
                )
                .reduce(
                    (total, item) =>
                        total +
                        Number(
                            item.amount || 0
                        ),
                    0
                );

        const earned =
            transactions
                .filter(
                    item =>
                        item.type ===
                            'sale' &&
                        item.status ===
                            'success'
                )
                .reduce(
                    (total, item) =>
                        total +
                        Number(
                            item.amount || 0
                        ),
                    0
                );

        const username =
            state.profile.username ||
            'user';

        $('#content').innerHTML = `
            <div class="page-head">

                <div>

                    <div class="eyebrow">
                        TELECOD
                    </div>

                    <h1 class="page-title">
                        ${tr('welcome')},
                        @${escape(username)}
                        👋
                    </h1>

                    <p class="page-sub">
                        ${tr('overview')}
                    </p>

                </div>

                <a
                    class="btn btn-primary"
                    href="dashboard.html?page=create-channel"
                >
                    <i class="fa-solid fa-plus"></i>
                    ${tr('createProduct')}
                </a>

            </div>

            <div class="grid stats-grid">

                <div class="card">
                    <div class="stat-label">
                        ${tr('products')}
                    </div>

                    <div class="stat-value">
                        ${products.length}
                    </div>
                </div>

                <div class="card">
                    <div class="stat-label">
                        ${tr('views')}
                    </div>

                    <div class="stat-value">
                        ${formatNumber(views)}
                    </div>
                </div>

                <div class="card">
                    <div class="stat-label">
                        ${tr('earned')}
                    </div>

                    <div class="stat-value">
                        ${money(earned)}
                    </div>
                </div>

                <div class="card">
                    <div class="stat-label">
                        ${tr('balance')}
                    </div>

                    <div class="stat-value">
                        ${money(
                            wallet.balance
                        )}
                    </div>
                </div>

            </div>

            <div
                class="grid two"
                style="margin-top:15px"
            >

                <section class="card">

                    <h2 class="section-title">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        ${tr('recent')}
                    </h2>

                    ${
                        transactions.length
                            ? `
                                <div class="table-wrap">

                                    <table class="table">

                                        <thead>
                                            <tr>
                                                <th>${tr('date')}</th>
                                                <th>Description</th>
                                                <th>${tr('amount')}</th>
                                                <th>${tr('status')}</th>
                                            </tr>
                                        </thead>

                                        <tbody>

                                            ${transactions
                                                .map(
                                                    item => `
                                                        <tr>

                                                            <td>
                                                                ${formatDate(
                                                                    item.created_at
                                                                )}
                                                            </td>

                                                            <td>
                                                                ${escape(
                                                                    item.description ||
                                                                    item.type ||
                                                                    '-'
                                                                )}
                                                            </td>

                                                            <td class="${
                                                                item.direction ===
                                                                'credit'
                                                                    ? 'money-plus'
                                                                    : 'money-minus'
                                                            }">
                                                                ${
                                                                    item.direction ===
                                                                    'credit'
                                                                        ? '+'
                                                                        : '-'
                                                                }
                                                                ${money(
                                                                    item.amount
                                                                )}
                                                            </td>

                                                            <td>
                                                                ${escape(
                                                                    item.status ||
                                                                    '-'
                                                                )}
                                                            </td>

                                                        </tr>
                                                    `
                                                )
                                                .join('')}

                                        </tbody>

                                    </table>

                                </div>
                            `
                            : `
                                <div class="empty">

                                    <i class="fa-solid fa-chart-line big"></i>

                                    <br>

                                    ${tr('empty')}

                                </div>
                            `
                    }

                </section>

                <section class="card">

                    <h2 class="section-title">
                        <i class="fa-solid fa-bolt"></i>
                        ${tr('quick')}
                    </h2>

                    <div class="grid">

                        <a
                            class="btn btn-primary"
                            href="dashboard.html?page=create-channel"
                        >
                            <i class="fa-solid fa-bullhorn"></i>
                            ${tr('createChannel')}
                        </a>

                        <a
                            class="btn btn-secondary"
                            href="dashboard.html?page=create-code"
                        >
                            <i class="fa-solid fa-code"></i>
                            ${tr('createCode')}
                        </a>

                        <a
                            class="btn btn-secondary"
                            href="dashboard.html?page=marketplace"
                        >
                            <i class="fa-solid fa-cart-shopping"></i>
                            ${tr('marketplace')}
                        </a>

                    </div>

                </section>

            </div>
        `;
    }

    /* =========================================================
       MARKETPLACE
    ========================================================= */

    async function renderMarketplace() {
        setActive('marketplace');

        $('#content').innerHTML = `
            <div class="page-head">

                <div>

                    <div class="eyebrow">
                        TELECOD
                    </div>

                    <h1 class="page-title">
                        ${tr('marketTitle')}
                    </h1>

                    <p class="page-sub">
                        Channel & Code dari creator TeleCod.
                    </p>

                </div>

            </div>

            <div class="toolbar">

                <input
                    id="marketSearch"
                    class="input search"
                    placeholder="${tr('search')}"
                >

                <select
                    id="marketType"
                    class="select"
                    style="max-width:160px"
                >
                    <option value="">
                        ${tr('all')}
                    </option>

                    <option value="channel">
                        Channel
                    </option>

                    <option value="code">
                        Code
                    </option>
                </select>

                <select
                    id="marketAccess"
                    class="select"
                    style="max-width:160px"
                >
                    <option value="">
                        ${tr('all')}
                    </option>

                    <option value="free">
                        Free
                    </option>

                    <option value="paid">
                        Paid
                    </option>
                </select>

            </div>

            <div
                id="marketGrid"
                class="grid product-grid"
            ></div>
        `;

        const load = async () => {
            const data =
                await queryProducts({
                    search:
                        $('#marketSearch')
                            ?.value
                            ?.trim(),

                    type:
                        $('#marketType')
                            ?.value,

                    access_type:
                        $('#marketAccess')
                            ?.value
                });

            const grid =
                $('#marketGrid');

            if (!grid) return;

            grid.innerHTML =
                data.length
                    ? data
                        .map(product =>
                            productCard(
                                product,
                                false
                            )
                        )
                        .join('')
                    : `
                        <div
                            class="empty"
                            style="grid-column:1/-1"
                        >
                            <i class="fa-solid fa-cart-shopping big"></i>
                            <br>
                            ${tr('empty')}
                        </div>
                    `;

            bindCards();
        };

        $('#marketSearch')?.addEventListener(
            'input',
            debounce(load, 300)
        );

        $('#marketType')?.addEventListener(
            'change',
            load
        );

        $('#marketAccess')?.addEventListener(
            'change',
            load
        );

        await load();
    }

    /* =========================================================
       MY PRODUCTS
    ========================================================= */

    async function renderProducts(page) {
        const isChannel =
            page.startsWith('channel');

        const type =
            isChannel
                ? 'channel'
                : 'code';

        const access =
            page.endsWith('free')
                ? 'free'
                : 'paid';

        setActive(page);

        const data =
            await queryProducts({
                type,
                access_type:
                    access
            });

        $('#content').innerHTML = `
            <div class="page-head">

                <div>

                    <div class="eyebrow">
                        ${type.toUpperCase()}
                    </div>

                    <h1 class="page-title">

                        ${
                            type === 'channel'
                                ? (
                                    access === 'free'
                                        ? tr('channelFree')
                                        : tr('channelPaid')
                                )
                                : (
                                    access === 'free'
                                        ? tr('codeFree')
                                        : tr('codePaid')
                                )
                        }

                    </h1>

                </div>

                <a
                    class="btn btn-primary"
                    href="dashboard.html?page=${
                        type === 'channel'
                            ? 'create-channel'
                            : 'create-code'
                    }"
                >
                    <i class="fa-solid fa-plus"></i>

                    ${
                        type === 'channel'
                            ? tr('createChannel')
                            : tr('createCode')
                    }

                </a>

            </div>

            <div class="grid product-grid">

                ${
                    data.length
                        ? data
                            .map(product =>
                                productCard(
                                    product,
                                    true
                                )
                            )
                            .join('')
                        : `
                            <div
                                class="empty"
                                style="grid-column:1/-1"
                            >
                                <i class="fa-solid ${
                                    type === 'channel'
                                        ? 'fa-bullhorn'
                                        : 'fa-code'
                                } big"></i>

                                <br>

                                ${tr('empty')}
                            </div>
                        `
                }

            </div>
        `;

        bindCards();
    }

    function bindCards() {
        $$('[data-detail]').forEach(button => {
            button.addEventListener(
                'click',
                () =>
                    openProduct(
                        button.dataset.detail
                    )
            );
        });

        $$('[data-buy]').forEach(button => {
            button.addEventListener(
                'click',
                () =>
                    purchase(
                        button.dataset.buy
                    )
            );
        });

        $$('[data-edit]').forEach(button => {
            button.addEventListener(
                'click',
                () =>
                    editProduct(
                        button.dataset.edit
                    )
            );
        });

        $$('[data-delete]').forEach(button => {
            button.addEventListener(
                'click',
                () =>
                    deleteProduct(
                        button.dataset.delete
                    )
            );
        });
    }

    /* =========================================================
       CREATE / EDIT PRODUCT
    ========================================================= */

    async function renderCreate(
        type,
        editId = null
    ) {
        const isChannel =
            type === 'channel';

        setActive(type);

        let product = null;

        if (editId) {
            const result =
                await sup
                    .from('products')
                    .select('*')
                    .eq('id', editId)
                    .eq(
                        'creator_id',
                        state.user.id
                    )
                    .single();

            if (result.error) {
                toast(
                    result.error.message,
                    'error'
                );

                return;
            }

            product = result.data;
        }

        const title =
            editId
                ? tr('edit')
                : (
                    isChannel
                        ? tr('channelTitle')
                        : tr('codeTitle')
                );

        const icon =
            isChannel
                ? 'fa-brands fa-telegram'
                : 'fa-solid fa-code';

        const accent =
            isChannel
                ? 'channel'
                : 'code';

        $('#content').innerHTML = `
            <div
                class="creator-create-page ${accent}-create-page"
            >

                <div class="creator-create-hero">

                    <div
                        class="creator-create-hero-icon ${accent}"
                    >
                        <i class="${icon}"></i>
                    </div>

                    <div
                        class="creator-create-hero-copy"
                    >

                        <div class="eyebrow">
                            CREATOR • ${
                                isChannel
                                    ? 'CHANNEL'
                                    : 'CODE'
                            }
                        </div>

                        <h1 class="page-title">
                            ${title}
                        </h1>

                        <p class="page-sub">
                            ${
                                isChannel
                                    ? 'Tambahkan channel Telegram kamu ke marketplace dengan tampilan profesional.'
                                    : 'Tambahkan source code atau bot code dengan informasi lengkap dan rapi.'
                            }
                        </p>

                    </div>

                    <div
                        class="creator-create-badge"
                    >
                        <i class="fa-solid fa-shield-halved"></i>
                        Marketplace
                    </div>

                </div>

                <form
                    id="productForm"
                    class="creator-form"
                >

                    <div class="creator-form-main">

                        <section class="create-section">

                            <div class="create-section-head">

                                <div class="create-section-icon">
                                    <i class="fa-solid fa-circle-info"></i>
                                </div>

                                <div>
                                    <h2>
                                        Informasi Produk
                                    </h2>

                                    <p>
                                        Isi informasi dasar yang akan dilihat pembeli.
                                    </p>
                                </div>

                            </div>

                            <div class="form-grid">

                                <div class="form-group">

                                    <label
                                        class="form-label"
                                        for="fTitle"
                                    >
                                        Nama Produk
                                        <span>*</span>
                                    </label>

                                    <div class="input-wrap">

                                        <i class="fa-solid ${
                                            isChannel
                                                ? 'fa-bullhorn'
                                                : 'fa-tag'
                                        }"></i>

                                        <input
                                            class="input"
                                            id="fTitle"
                                            value="${escape(
                                                product?.title || ''
                                            )}"
                                            placeholder="${
                                                isChannel
                                                    ? 'Contoh: Channel Premium Indonesia'
                                                    : 'Contoh: Bot Telegram Auto Reply'
                                            }"
                                            required
                                        >

                                    </div>

                                </div>

                                <div class="form-group">

                                    <label
                                        class="form-label"
                                        for="fCategory"
                                    >
                                        Kategori
                                    </label>

                                    <div class="input-wrap">

                                        <i class="fa-solid fa-folder"></i>

                                        <input
                                            class="input"
                                            id="fCategory"
                                            value="${escape(
                                                product?.category || ''
                                            )}"
                                            placeholder="Contoh: Bot, Tools, Education"
                                        >

                                    </div>

                                </div>

                                <div class="form-group full">

                                    <label
                                        class="form-label"
                                        for="fDesc"
                                    >
                                        Deskripsi
                                    </label>

                                    <textarea
                                        class="textarea"
                                        id="fDesc"
                                        rows="5"
                                        placeholder="Jelaskan isi, fitur, manfaat, dan informasi penting produk..."
                                    >${escape(
                                        product?.description || ''
                                    )}</textarea>

                                    <small class="field-help">
                                        Deskripsi yang jelas membuat pembeli lebih mudah memahami produk.
                                    </small>

                                </div>

                            </div>

                        </section>

                        <section class="create-section">

                            <div class="create-section-head">

                                <div class="create-section-icon">
                                    <i class="fa-solid fa-tags"></i>
                                </div>

                                <div>
                                    <h2>
                                        Harga & Akses
                                    </h2>

                                    <p>
                                        Tentukan apakah produk tersedia gratis atau berbayar.
                                    </p>
                                </div>

                            </div>

                            <div class="access-choice">

                                <label class="access-card free-choice">

                                    <input
                                        type="radio"
                                        name="accessType"
                                        value="free"
                                        ${
                                            !product ||
                                            product.access_type === 'free'
                                                ? 'checked'
                                                : ''
                                        }
                                    >

                                    <span class="access-card-icon">
                                        <i class="fa-solid fa-gift"></i>
                                    </span>

                                    <span class="access-card-copy">

                                        <strong>
                                            Free
                                        </strong>

                                        <small>
                                            Pembeli dapat mengakses tanpa pembayaran.
                                        </small>

                                    </span>

                                    <span class="access-check">
                                        <i class="fa-solid fa-check"></i>
                                    </span>

                                </label>

                                <label class="access-card paid-choice">

                                    <input
                                        type="radio"
                                        name="accessType"
                                        value="paid"
                                        ${
                                            product?.access_type === 'paid'
                                                ? 'checked'
                                                : ''
                                        }
                                    >

                                    <span class="access-card-icon">
                                        <i class="fa-solid fa-crown"></i>
                                    </span>

                                    <span class="access-card-copy">

                                        <strong>
                                            Paid
                                        </strong>

                                        <small>
                                            Pembeli harus membayar sebelum mendapatkan akses.
                                        </small>

                                    </span>

                                    <span class="access-check">
                                        <i class="fa-solid fa-check"></i>
                                    </span>

                                </label>

                            </div>

                            <div
                                class="price-field"
                                id="priceField"
                            >

                                <label
                                    class="form-label"
                                    for="fPrice"
                                >
                                    Harga Produk
                                    <span>*</span>
                                </label>

                                <div class="price-input-wrap">

                                    <span>
                                        Rp
                                    </span>

                                    <input
                                        class="input"
                                        id="fPrice"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value="${Number(
                                            product?.price || 0
                                        )}"
                                        placeholder="10000"
                                    >

                                </div>

                                <small class="field-help">
                                    Minimum harga produk Paid adalah Rp 1.
                                </small>

                            </div>

                        </section>

                        <section class="create-section">

                            <div class="create-section-head">

                                <div class="create-section-icon">
                                    <i class="fa-solid fa-image"></i>
                                </div>

                                <div>
                                    <h2>
                                        Media
                                    </h2>

                                    <p>
                                        Opsional. Gunakan thumbnail agar produk terlihat lebih menarik.
                                    </p>
                                </div>

                            </div>

                            <div class="form-group">

                                <label
                                    class="form-label"
                                    for="fImage"
                                >
                                    Thumbnail URL
                                </label>

                                <div class="input-wrap">

                                    <i class="fa-solid fa-link"></i>

                                    <input
                                        class="input"
                                        id="fImage"
                                        value="${escape(
                                            product?.thumbnail_url || ''
                                        )}"
                                        placeholder="https://contoh.com/thumbnail.jpg"
                                    >

                                </div>

                            </div>

                        </section>

                        ${
                            isChannel
                                ? `
                                    <section class="create-section">

                                        <div class="create-section-head">

                                            <div class="create-section-icon channel">
                                                <i class="fa-brands fa-telegram"></i>
                                            </div>

                                            <div>
                                                <h2>
                                                    Telegram Channel
                                                </h2>

                                                <p>
                                                    Masukkan link channel yang akan diberikan kepada pembeli.
                                                </p>
                                            </div>

                                        </div>

                                        <div class="form-group">

                                            <label
                                                class="form-label"
                                                for="fTelegram"
                                            >
                                                Link Channel
                                                <span>*</span>
                                            </label>

                                            <div class="input-wrap telegram-input">

                                                <i class="fa-brands fa-telegram"></i>

                                                <input
                                                    class="input"
                                                    id="fTelegram"
                                                    value="${escape(
                                                        product?.telegram_channel || ''
                                                    )}"
                                                    placeholder="https://t.me/namachannel"
                                                    required
                                                >

                                            </div>

                                            <small class="field-help">
                                                Pastikan link Telegram dapat diakses oleh pembeli.
                                            </small>

                                        </div>

                                    </section>
                                `
                                : `
                                    <section class="create-section code-content-section">

                                        <div class="create-section-head">

                                            <div class="create-section-icon code">
                                                <i class="fa-solid fa-code"></i>
                                            </div>

                                            <div>
                                                <h2>
                                                    Source Code
                                                </h2>

                                                <p>
                                                    Masukkan source code atau konten yang akan diterima pembeli.
                                                </p>
                                            </div>

                                        </div>

                                        <div class="form-group">

                                            <label
                                                class="form-label"
                                                for="fContent"
                                            >
                                                Content / Code
                                                <span>*</span>
                                            </label>

                                            <textarea
                                                class="textarea code-area"
                                                id="fContent"
                                                rows="16"
                                                placeholder="# Tempel source code di sini..."
                                            >${escape(
                                                product?.content || ''
                                            )}</textarea>

                                            <small class="field-help">
                                                Jangan masukkan password, API key, token bot, atau data rahasia.
                                            </small>

                                        </div>

                                    </section>
                                `
                        }

                        <div class="creator-form-actions">

                            <a
                                class="btn btn-secondary"
                                href="dashboard.html?page=${
                                    type
                                }-${
                                    product?.access_type ||
                                    'free'
                                }"
                            >
                                <i class="fa-solid fa-arrow-left"></i>
                                ${tr('cancel')}
                            </a>

                            <button
                                class="btn btn-primary creator-publish-btn"
                                type="submit"
                            >
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                                ${
                                    editId
                                        ? tr('update')
                                        : tr('publish')
                                }
                            </button>

                        </div>

                    </div>

                    <aside class="creator-form-side">

                        <div class="create-preview-card">

                            <div class="preview-top">

                                <span class="preview-label">
                                    PREVIEW
                                </span>

                                <span
                                    class="preview-status"
                                    id="previewStatus"
                                >
                                    <i class="fa-solid fa-gift"></i>
                                    Free
                                </span>

                            </div>

                            <div
                                class="preview-icon ${accent}"
                                id="previewIcon"
                            >
                                <i class="${icon}"></i>
                            </div>

                            <h3 id="previewTitle">
                                ${escape(
                                    product?.title ||
                                    'Nama produk'
                                )}
                            </h3>

                            <p id="previewDesc">
                                ${escape(
                                    product?.description ||
                                    'Deskripsi produk akan tampil di sini.'
                                )}
                            </p>

                            <div class="preview-meta">

                                <span>
                                    <i class="fa-solid fa-layer-group"></i>
                                    ${
                                        isChannel
                                            ? 'Channel'
                                            : 'Code'
                                    }
                                </span>

                                <strong id="previewPrice">
                                    Free
                                </strong>

                            </div>

                        </div>

                        <div class="create-tips">

                            <h3>
                                <i class="fa-solid fa-lightbulb"></i>
                                Tips
                            </h3>

                            <ul>

                                <li>
                                    Gunakan nama produk yang singkat dan jelas.
                                </li>

                                <li>
                                    Jelaskan fitur atau isi produk secara lengkap.
                                </li>

                                <li>
                                    Pastikan link Telegram atau code dapat digunakan.
                                </li>

                                <li>
                                    Jangan membagikan credential atau token rahasia.
                                </li>

                            </ul>

                        </div>

                    </aside>

                </form>
            </div>
        `;

        const syncAccess = () => {
            const access =
                document.querySelector(
                    'input[name="accessType"]:checked'
                )?.value || 'free';

            const paid =
                access === 'paid';

            const price =
                $('#fPrice');

            if (price) {
                price.disabled =
                    !paid;

                if (!paid) {
                    price.value = 0;
                }
            }

            $('#priceField')
                ?.classList.toggle(
                    'disabled',
                    !paid
                );

            $$('.access-card')
                .forEach(card => {
                    card.classList.toggle(
                        'selected',
                        !!card.querySelector(
                            'input'
                        )?.checked
                    );
                });

            const status =
                $('#previewStatus');

            if (status) {
                status.innerHTML =
                    paid
                        ? '<i class="fa-solid fa-crown"></i> Paid'
                        : '<i class="fa-solid fa-gift"></i> Free';

                status.className =
                    `preview-status ${
                        paid
                            ? 'paid'
                            : 'free'
                    }`;
            }

            if ($('#previewPrice')) {
                $('#previewPrice')
                    .textContent =
                    paid
                        ? money(
                            price?.value || 0
                        )
                        : 'Free';
            }
        };

        $$(
            'input[name="accessType"]'
        ).forEach(input => {
            input.addEventListener(
                'change',
                syncAccess
            );
        });

        $('#fPrice')?.addEventListener(
            'input',
            syncAccess
        );

        $('#fTitle')?.addEventListener(
            'input',
            () => {
                $('#previewTitle').textContent =
                    $('#fTitle').value.trim() ||
                    'Nama produk';
            }
        );

        $('#fDesc')?.addEventListener(
            'input',
            () => {
                $('#previewDesc').textContent =
                    $('#fDesc').value.trim() ||
                    'Deskripsi produk akan tampil di sini.';
            }
        );

        syncAccess();

        $('#productForm')
            ?.addEventListener(
                'submit',
                async event => {
                    event.preventDefault();

                    const access =
                        document.querySelector(
                            'input[name="accessType"]:checked'
                        )?.value ||
                        'free';

                    const price =
                        Number(
                            $('#fPrice')?.value ||
                            0
                        );

                    const title =
                        $('#fTitle')
                            ?.value
                            ?.trim() ||
                        '';

                    const description =
                        $('#fDesc')
                            ?.value
                            ?.trim() ||
                        '';

                    const category =
                        $('#fCategory')
                            ?.value
                            ?.trim() ||
                        '';

                    const thumbnail =
                        $('#fImage')
                            ?.value
                            ?.trim() ||
                        '';

                    if (!title) {
                        toast(
                            tr('required'),
                            'error'
                        );

                        return;
                    }

                    if (
                        access === 'paid' &&
                        (
                            !Number.isFinite(
                                price
                            ) ||
                            price <= 0
                        )
                    ) {
                        toast(
                            tr('minPrice'),
                            'error'
                        );

                        return;
                    }

                    let telegram = null;
                    let content = null;

                    if (isChannel) {
                        telegram =
                            $('#fTelegram')
                                ?.value
                                ?.trim() ||
                            '';

                        if (!telegram) {
                            toast(
                                'Link channel wajib diisi.',
                                'error'
                            );

                            return;
                        }

                        if (
                            !/^https?:\/\/t\.me\//i
                                .test(
                                    telegram
                                )
                        ) {
                            toast(
                                'Link channel harus berupa https://t.me/...',
                                'error'
                            );

                            return;
                        }
                    } else {
                        content =
                            $('#fContent')
                                ?.value ||
                            '';

                        if (!content.trim()) {
                            toast(
                                'Content / Code wajib diisi.',
                                'error'
                            );

                            return;
                        }
                    }

                    const payload = {
                        title,
                        description,
                        type,
                        access_type:
                            access,
                        price:
                            access === 'paid'
                                ? price
                                : 0,
                        thumbnail_url:
                            thumbnail ||
                            null,
                        category:
                            category ||
                            null,
                        content:
                            isChannel
                                ? null
                                : content,
                        telegram_channel:
                            isChannel
                                ? telegram
                                : null,
                        is_channel:
                            isChannel
                    };

                    const submitButton =
                        document.querySelector(
                            '#productForm button[type="submit"]'
                        );

                    if (submitButton) {
                        submitButton.disabled =
                            true;
                    }

                    try {
                        /* =========================
                           EDIT
                        ========================= */

                        if (editId) {
                            const result =
                                await sup
                                    .from(
                                        'products'
                                    )
                                    .update(
                                        payload
                                    )
                                    .eq(
                                        'id',
                                        editId
                                    )
                                    .eq(
                                        'creator_id',
                                        state.user.id
                                    );

                            if (result.error) {
                                throw result.error;
                            }

                            toast(
                                tr(
                                    'productUpdated'
                                ),
                                'success'
                            );

                            setTimeout(
                                () => {
                                    location.href =
                                        `dashboard.html?page=${type}-${access}`;
                                },
                                400
                            );

                            return;
                        }

                        /* =========================
                           CREATE
                        ========================= */

                        const functionUrl =
                            String(
                                C.MARKETPLACE_FUNCTION_URL ||
                                ''
                            ).trim();

                        if (
                            !functionUrl ||
                            functionUrl.includes(
                                'YOUR_'
                            )
                        ) {
                            throw new Error(
                                'MARKETPLACE_FUNCTION_URL belum dikonfigurasi.'
                            );
                        }

                        const {
                            data: sessionData
                        } =
                            await sup.auth
                                .getSession();

                        const token =
                            sessionData
                                ?.session
                                ?.access_token;

                        if (!token) {
                            throw new Error(
                                tr(
                                    'loginRequired'
                                )
                            );
                        }

                        const response =
                            await fetch(
                                functionUrl,
                                {
                                    method:
                                        'POST',

                                    headers: {
                                        Authorization:
                                            `Bearer ${token}`,

                                        'Content-Type':
                                            'application/json'
                                    },

                                    body:
                                        JSON.stringify({
                                            action:
                                                'create_product',

                                            ...payload
                                        })
                                }
                            );

                        const output =
                            await response
                                .json()
                                .catch(
                                    () => ({})
                                );

                        if (!response.ok) {
                            throw new Error(
                                output.error ||
                                'Gagal membuat produk.'
                            );
                        }

                        toast(
                            output.status ===
                                'published'
                                ? tr(
                                    'published'
                                )
                                : 'Produk dibuat dan menunggu admin.',
                            'success'
                        );

                        setTimeout(
                            () => {
                                location.href =
                                    `dashboard.html?page=${type}-${access}`;
                            },
                            500
                        );

                    } catch (error) {
                        console.error(error);

                        toast(
                            error.message ||
                            tr('error'),
                            'error'
                        );

                        if (
                            submitButton
                        ) {
                            submitButton.disabled =
                                false;
                        }
                    }
                }
            );
    }

    async function editProduct(id) {
        if (!sup || !id) return;

        const {
            data,
            error
        } = await sup
            .from('products')
            .select('type')
            .eq('id', id)
            .eq(
                'creator_id',
                state.user.id
            )
            .single();

        if (error || !data) {
            toast(
                error?.message ||
                tr('error'),
                'error'
            );

            return;
        }

        await renderCreate(
            data.type,
            id
        );
    }

    async function deleteProduct(id) {
        if (!sup || !id) return;

        if (
            !confirm(
                tr('confirmDelete')
            )
        ) {
            return;
        }

        const {
            error
        } = await sup
            .from('products')
            .delete()
            .eq('id', id)
            .eq(
                'creator_id',
                state.user.id
            );

        if (error) {
            toast(
                error.message,
                'error'
            );

            return;
        }

        toast(
            tr('productDeleted'),
            'success'
        );

        await render();
    }

    /* =========================================================
       PURCHASES
    ========================================================= */

    async function renderPurchases() {
        setActive('purchases');

        const {
            data,
            error
        } = await sup
            .from('purchases')
            .select(`
                id,
                amount,
                status,
                created_at,
                paid_at,
                products(
                    id,
                    title,
                    type,
                    access_type
                )
            `)
            .eq(
                'buyer_id',
                state.user.id
            )
            .order(
                'created_at',
                {
                    ascending:
                        false
                }
            );

        if (error) {
            toast(
                error.message,
                'error'
            );
        }

        const purchases =
            data || [];

        $('#content').innerHTML = `
            <div class="page-head">

                <div>

                    <div class="eyebrow">
                        ACCOUNT
                    </div>

                    <h1 class="page-title">
                        ${tr('purchasesTitle')}
                    </h1>

                </div>

            </div>

            <div class="card">

                <div class="table-wrap">

                    <table class="table">

                        <thead>

                            <tr>
                                <th>${tr('date')}</th>
                                <th>Product</th>
                                <th>${tr('type')}</th>
                                <th>${tr('amount')}</th>
                                <th>${tr('status')}</th>
                                <th>${tr('access')}</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${
                                purchases.length
                                    ? purchases
                                        .map(item => `
                                            <tr>

                                                <td>
                                                    ${formatDate(
                                                        item.created_at
                                                    )}
                                                </td>

                                                <td>
                                                    ${escape(
                                                        item.products?.title ||
                                                        '-'
                                                    )}
                                                </td>

                                                <td>
                                                    ${escape(
                                                        item.products?.type ||
                                                        '-'
                                                    )}
                                                </td>

                                                <td>
                                                    ${money(
                                                        item.amount
                                                    )}
                                                </td>

                                                <td>
                                                    <span
                                                        class="pill ${
                                                            item.status === 'paid'
                                                                ? 'ok'
                                                                : 'pending'
                                                        }"
                                                    >
                                                        ${escape(
                                                            item.status ||
                                                            '-'
                                                        )}
                                                    </span>
                                                </td>

                                                <td>

                                                    ${
                                                        item.status === 'paid'
                                                            ? `
                                                                <button
                                                                    type="button"
                                                                    class="btn btn-secondary"
                                                                    data-detail="${escape(
                                                                        item.products?.id
                                                                    )}"
                                                                >
                                                                    <i class="fa-solid fa-eye"></i>
                                                                    ${tr('open')}
                                                                </button>
                                                            `
                                                            : '—'
                                                    }

                                                </td>

                                            </tr>
                                        `)
                                        .join('')
                                    : `
                                        <tr>
                                            <td colspan="6">
                                                ${tr(
                                                    'noPurchases'
                                                )}
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>
        `;

        bindCards();
    }

    /* =========================================================
       PAYMENT PAGE
    ========================================================= */

    async function renderPayment() {
        setActive('payment');

        try {
            await sup.rpc(
                'release_matured_sales'
            );
        } catch (_) {}

        const [
            walletResult,
            transactionResult,
            withdrawalResult
        ] = await Promise.all([
            sup
                .from('wallets')
                .select(
                    'balance,pending_balance'
                )
                .eq(
                    'user_id',
                    state.user.id
                )
                .maybeSingle(),

            sup
                .from('transactions')
                .select('*')
                .eq(
                    'user_id',
                    state.user.id
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                )
                .limit(50),

            sup
                .from('withdrawals')
                .select('*')
                .eq(
                    'user_id',
                    state.user.id
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                )
                .limit(30)
        ]);

        const wallet =
            walletResult.data || {};

        const transactions =
            transactionResult.data || [];

        const withdrawals =
            withdrawalResult.data || [];

        const available =
            Number(
                wallet.balance || 0
            );

        const pending =
            Number(
                wallet.pending_balance ||
                0
            );

        $('#content').innerHTML = `
            <div class="page-head">

                <div>

                    <div class="eyebrow">
                        ACCOUNT
                    </div>

                    <h1 class="page-title">
                        ${tr('paymentTitle')}
                    </h1>

                    <p class="page-sub">
                        Saldo penjualan masuk ke Pending
                        dan otomatis menjadi Available setelah H+1.
                    </p>

                </div>

            </div>

            <div class="grid three">

                <div class="card">

                    <div class="stat-label">
                        Saldo Tersedia
                    </div>

                    <div class="balance">
                        ${money(available)}
                    </div>

                </div>

                <div class="card">

                    <div class="stat-label">
                        Saldo Pending · H+1
                    </div>

                    <div class="balance">
                        ${money(pending)}
                    </div>

                    <div class="help">
                        Penjualan baru tersedia setelah 1 hari.
                    </div>

                </div>

                <div class="card">

                    <div class="stat-label">
                        <i class="fa-solid fa-circle-plus"></i>
                        ${tr('deposit')}
                    </div>

                    <button
                        type="button"
                        class="btn btn-primary"
                        style="margin-top:10px"
                        id="depositBtn"
                    >
                        <i class="fa-solid fa-circle-plus"></i>
                        ${tr('deposit')}
                    </button>

                    <div class="help">
                        ${tr('depositHint')}
                    </div>

                </div>

            </div>

            <div
                class="card"
                style="margin-top:15px"
            >

                <div class="panel-head">

                    <h2 class="section-title">
                        <i class="fa-solid fa-money-bill-transfer"></i>
                        Withdraw
                    </h2>

                    <button
                        type="button"
                        class="btn btn-primary"
                        id="withdrawBtn"
                    >
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        Withdraw
                    </button>

                </div>

                <div class="grid two">

                    <div>

                        <b>
                            WD Otomatis
                        </b>

                        <p class="muted">
                            Minimal Rp 50.000 + fee Rp 5.000.
                            Saldo minimal Rp 55.000.
                            Masuk antrean dan menunggu konfirmasi admin.
                        </p>

                    </div>

                    <div>

                        <b>
                            WD Instant
                        </b>

                        <p class="muted">
                            Rp 50k / 100k / 150k /
                            200k / 250k + fee Rp 15.000.
                            Limit Rp 500.000/hari.
                        </p>

                    </div>

                </div>

            </div>

            <div
                class="card"
                style="margin-top:15px"
            >

                <h2 class="section-title">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    ${tr('transactions')}
                </h2>

                <div class="table-wrap">

                    <table class="table">

                        <thead>

                            <tr>
                                <th>${tr('date')}</th>
                                <th>Description</th>
                                <th>${tr('amount')}</th>
                                <th>${tr('status')}</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${
                                transactions.length
                                    ? transactions
                                        .map(item => `
                                            <tr>

                                                <td>
                                                    ${formatDate(
                                                        item.created_at
                                                    )}
                                                </td>

                                                <td>
                                                    ${escape(
                                                        item.description ||
                                                        item.type ||
                                                        '-'
                                                    )}
                                                </td>

                                                <td
                                                    class="${
                                                        item.direction === 'credit'
                                                            ? 'money-plus'
                                                            : 'money-minus'
                                                    }"
                                                >
                                                    ${
                                                        item.direction === 'credit'
                                                            ? '+'
                                                            : '-'
                                                    }

                                                    ${money(
                                                        item.amount
                                                    )}
                                                </td>

                                                <td>
                                                    ${escape(
                                                        item.status ||
                                                        '-'
                                                    )}
                                                </td>

                                            </tr>
                                        `)
                                        .join('')
                                    : `
                                        <tr>
                                            <td colspan="4">
                                                ${tr(
                                                    'noTransactions'
                                                )}
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>

            <div
                class="card"
                style="margin-top:15px"
            >

                <h2 class="section-title">
                    ${tr('withdrawHistory')}
                </h2>

                <div class="table-wrap">

                    <table class="table">

                        <thead>

                            <tr>
                                <th>Ticket</th>
                                <th>${tr('date')}</th>
                                <th>Mode</th>
                                <th>Nominal</th>
                                <th>Fee</th>
                                <th>Total</th>
                                <th>Queue</th>
                                <th>${tr('status')}</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${
                                withdrawals.length
                                    ? withdrawals
                                        .map(item => `
                                            <tr>

                                                <td>
                                                    <code>
                                                        ${escape(
                                                            item.ticket ||
                                                            '-'
                                                        )}
                                                    </code>
                                                </td>

                                                <td>
                                                    ${formatDate(
                                                        item.created_at
                                                    )}
                                                </td>

                                                <td>
                                                    ${escape(
                                                        item.withdrawal_mode ||
                                                        'auto'
                                                    )}
                                                </td>

                                                <td>
                                                    ${money(
                                                        item.requested_amount ??
                                                        item.amount
                                                    )}
                                                </td>

                                                <td>
                                                    ${money(
                                                        item.fee || 0
                                                    )}
                                                </td>

                                                <td>
                                                    ${money(
                                                        item.total_debit ??
                                                        item.amount
                                                    )}
                                                </td>

                                                <td>
                                                    ${escape(
                                                        item.queue_position ??
                                                        '-'
                                                    )}
                                                </td>

                                                <td>
                                                    ${escape(
                                                        item.status ||
                                                        '-'
                                                    )}
                                                </td>

                                            </tr>
                                        `)
                                        .join('')
                                    : `
                                        <tr>
                                            <td colspan="8">
                                                ${tr(
                                                    'noWithdrawals'
                                                )}
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>
        `;

        $('#depositBtn')?.addEventListener(
            'click',
            openDeposit
        );

        $('#withdrawBtn')?.addEventListener(
            'click',
            openWithdraw
        );
    }

    /* =========================================================
       DEPOSIT
    ========================================================= */

    function openDeposit() {
        openModal(`
            <div class="modal-head">

                <h2 class="section-title">
                    <i class="fa-solid fa-circle-plus"></i>
                    ${tr('deposit')}
                </h2>

                <button
                    type="button"
                    class="close"
                    id="depositClose"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <form
                id="depositForm"
                class="grid"
            >

                <div class="form-group">

                    <label class="form-label">
                        ${tr('depositAmount')}
                    </label>

                    <input
                        class="input"
                        id="depositAmount"
                        type="number"
                        min="10000"
                        step="1000"
                        placeholder="10000"
                        required
                    >

                    <small class="field-help">
                        ${tr('depositHint')}
                    </small>

                </div>

                <div class="actions">

                    <button
                        type="button"
                        class="btn btn-secondary"
                        id="depositCancel"
                    >
                        ${tr('cancel')}
                    </button>

                    <button
                        type="submit"
                        class="btn btn-primary"
                    >
                        <i class="fa-solid fa-qrcode"></i>
                        ${tr('pay')}
                    </button>

                </div>

            </form>
        `);

        $('#depositClose')?.addEventListener(
            'click',
            closeModal
        );

        $('#depositCancel')?.addEventListener(
            'click',
            closeModal
        );

        $('#depositForm')?.addEventListener(
            'submit',
            async event => {
                event.preventDefault();

                const amount =
                    Number(
                        $('#depositAmount')
                            ?.value ||
                        0
                    );

                if (
                    !Number.isFinite(amount) ||
                    amount < 10000
                ) {
                    toast(
                        'Minimum deposit Rp 10.000.',
                        'error'
                    );

                    return;
                }

                await createPayment(
                    'deposit',
                    {
                        amount
                    }
                );
            }
        );
    }

    /* =========================================================
       WITHDRAW
    ========================================================= */

    function openWithdraw() {
        openModal(`
            <div class="modal-head">

                <h2 class="section-title">
                    <i class="fa-solid fa-money-bill-transfer"></i>
                    ${tr('withdraw')}
                </h2>

                <button
                    type="button"
                    class="close"
                    id="withdrawClose"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <form
                id="withdrawForm"
                class="grid"
            >

                <div class="form-group">

                    <label class="form-label">
                        Mode WD
                    </label>

                    <select
                        class="select"
                        id="wdMode"
                    >

                        <option value="auto">
                            WD Otomatis — min 50k + fee 5k
                        </option>

                        <option value="instant">
                            WD Instant — fee 15k
                        </option>

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        ${tr('amount')}
                    </label>

                    <select
                        class="select"
                        id="wdAmountPreset"
                    ></select>

                    <input
                        class="input"
                        id="wdAmount"
                        type="number"
                        min="50000"
                        step="1000"
                        required
                        placeholder="50000"
                        style="margin-top:8px"
                    >

                    <div
                        class="help"
                        id="wdRule"
                    >
                        Minimal Rp 50.000 +
                        fee Rp 5.000 =
                        saldo Rp 55.000.
                    </div>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        ${tr('method')}
                    </label>

                    <select
                        class="select"
                        id="wdMethod"
                    >

                        <option value="bank">
                            ${tr('bank')}
                        </option>

                        <option value="ewallet">
                            ${tr('ewallet')}
                        </option>

                        <option value="crypto">
                            ${tr('crypto')}
                        </option>

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        ${tr('accountName')}
                    </label>

                    <input
                        class="input"
                        id="wdName"
                        required
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        ${tr('accountNumber')}
                    </label>

                    <input
                        class="input"
                        id="wdNumber"
                        required
                    >

                </div>

                <div class="actions">

                    <button
                        type="button"
                        class="btn btn-secondary"
                        id="withdrawCancel"
                    >
                        ${tr('cancel')}
                    </button>

                    <button
                        type="submit"
                        class="btn btn-primary"
                    >
                        <i class="fa-solid fa-paper-plane"></i>
                        ${tr('requestWithdraw')}
                    </button>

                </div>

            </form>
        `);

        $('#withdrawClose')?.addEventListener(
            'click',
            closeModal
        );

        $('#withdrawCancel')?.addEventListener(
            'click',
            closeModal
        );

        const syncWithdraw =
            () => {
                const mode =
                    $('#wdMode')
                        ?.value;

                const select =
                    $('#wdAmountPreset');

                const input =
                    $('#wdAmount');

                const rule =
                    $('#wdRule');

                if (
                    mode === 'instant'
                ) {
                    select.innerHTML =
                        `
                            <option value="">
                                Pilih nominal instant
                            </option>

                            ${
                                [
                                    50000,
                                    100000,
                                    150000,
                                    200000,
                                    250000
                                ]
                                    .map(
                                        amount => `
                                            <option value="${amount}">
                                                ${money(amount)}
                                                + fee
                                                ${money(15000)}
                                            </option>
                                        `
                                    )
                                    .join('')
                            }
                        `;

                    select.style.display =
                        'block';

                    input.style.display =
                        'none';

                    input.required =
                        false;

                    rule.textContent =
                        'Fee Rp 15.000. Limit total nominal WD instant Rp 500.000 per hari.';

                } else {
                    select.innerHTML =
                        '';

                    select.style.display =
                        'none';

                    input.style.display =
                        'block';

                    input.required =
                        true;

                    rule.textContent =
                        'Minimal Rp 50.000 + fee Rp 5.000. Saldo minimal Rp 55.000.';
                }
            };

        $('#wdMode')?.addEventListener(
            'change',
            syncWithdraw
        );

        $('#wdAmountPreset')?.addEventListener(
            'change',
            () => {
                $('#wdAmount').value =
                    $('#wdAmountPreset')
                        .value;
            }
        );

        syncWithdraw();

        $('#withdrawForm')
            ?.addEventListener(
                'submit',
                async event => {
                    event.preventDefault();

                    const mode =
                        $('#wdMode')
                            .value;

                    const amount =
                        mode === 'instant'
                            ? Number(
                                $('#wdAmountPreset')
                                    .value
                            )
                            : Number(
                                $('#wdAmount')
                                    .value
                            );

                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {
                        toast(
                            'Nominal WD tidak valid.',
                            'error'
                        );

                        return;
                    }

                    if (
                        mode === 'auto' &&
                        amount < 50000
                    ) {
                        toast(
                            'Minimum WD otomatis Rp 50.000.',
                            'error'
                        );

                        return;
                    }

                    if (
                        mode === 'instant' &&
                        ![
                            50000,
                            100000,
                            150000,
                            200000,
                            250000
                        ].includes(
                            amount
                        )
                    ) {
                        toast(
                            'Nominal WD Instant tidak valid.',
                            'error'
                        );

                        return;
                    }

                    const accountName =
                        $('#wdName')
                            .value
                            .trim();

                    const accountNumber =
                        $('#wdNumber')
                            .value
                            .trim();

                    if (
                        !accountName ||
                        !accountNumber
                    ) {
                        toast(
                            tr('required'),
                            'error'
                        );

                        return;
                    }

                    try {
                        const {
                            data,
                            error
                        } = await sup.rpc(
                            'request_withdrawal_v2',
                            {
                                p_amount:
                                    amount,

                                p_mode:
                                    mode,

                                p_method:
                                    $('#wdMethod')
                                        .value,

                                p_account_name:
                                    accountName,

                                p_account_number:
                                    accountNumber
                            }
                        );

                        if (error) {
                            throw error;
                        }

                        closeModal();

                        toast(
                            `WD dibuat. Ticket ${
                                data?.ticket ||
                                '-'
                            }. Menunggu antrean/admin.`,
                            'success'
                        );

                        await renderPayment();

                    } catch (error) {
                        console.error(error);

                        toast(
                            error.message ||
                            tr('error'),
                            'error'
                        );
                    }
                }
            );
    }

    /* =========================================================
       PROFILE
    ========================================================= */

    async function renderProfile() {
        setActive('profile');

        const profile =
            state.profile || {};

        $('#content').innerHTML = `
            <div class="page-head">

                <div>

                    <div class="eyebrow">
                        ACCOUNT
                    </div>

                    <h1 class="page-title">
                        <i class="fa-solid fa-user"></i>
                        ${tr('profile')}
                    </h1>

                </div>

            </div>

            <div class="grid two">

                <section class="card">

                    <div class="profile-head">

                        <div class="avatar-lg">
                            ${initials(
                                profile.username
                            )}
                        </div>

                        <div class="profile-meta">

                            <h2>
                                @${escape(
                                    profile.username ||
                                    'user'
                                )}
                            </h2>

                            <p>
                                ${escape(
                                    profile.display_name ||
                                    'TeleCod Creator'
                                )}
                            </p>

                        </div>

                    </div>

                    <div
                        style="margin-top:20px"
                        class="grid"
                    >

                        <div>

                            <div class="stat-label">
                                ${tr('username')}
                            </div>

                            <div>
                                ${escape(
                                    profile.username ||
                                    '-'
                                )}
                            </div>

                        </div>

                        <div>

                            <div class="stat-label">
                                ${tr('telegramNo')}
                            </div>

                            <div>
                                ${escape(
                                    profile.telegram_number ||
                                    profile.telegram_id ||
                                    '-'
                                )}
                            </div>

                        </div>

                    </div>

                </section>

                <section class="card">

                    <h2 class="section-title">
                        ${tr('profileInfo')}
                    </h2>

                    <form
                        id="profileForm"
                        class="grid"
                    >

                        <div class="form-group">

                            <label class="form-label">
                                ${tr('username')}
                            </label>

                            <input
                                class="input"
                                id="pUsername"
                                value="${escape(
                                    profile.username ||
                                    ''
                                )}"
                                required
                            >

                        </div>

                        <div class="form-group">

                            <label class="form-label">
                                Display Name
                            </label>

                            <input
                                class="input"
                                id="pName"
                                value="${escape(
                                    profile.display_name ||
                                    ''
                                )}"
                            >

                        </div>

                        <div class="actions">

                            <button
                                type="submit"
                                class="btn btn-primary"
                            >
                                <i class="fa-solid fa-floppy-disk"></i>
                                ${tr('save')}
                            </button>

                        </div>

                    </form>

                </section>

            </div>
        `;

        $('#profileForm')
            ?.addEventListener(
                'submit',
                async event => {
                    event.preventDefault();

                    const username =
                        $('#pUsername')
                            .value
                            .trim()
                            .replace(
                                /^@/,
                                ''
                            )
                            .toLowerCase();

                    const displayName =
                        $('#pName')
                            .value
                            .trim();

                    if (
                        !/^[a-z0-9_]{3,32}$/
                            .test(
                                username
                            )
                    ) {
                        toast(
                            'Username tidak valid.',
                            'error'
                        );

                        return;
                    }

                    const {
                        error
                    } = await sup
                        .from('profiles')
                        .update({
                            username,
                            display_name:
                                displayName
                        })
                        .eq(
                            'id',
                            state.user.id
                        );

                    if (error) {
                        toast(
                            error.message,
                            'error'
                        );

                        return;
                    }

                    state.profile.username =
                        username;

                    state.profile.display_name =
                        displayName;

                    if ($('#topUser')) {
                        $('#topUser')
                            .textContent =
                            '@' + username;
                    }

                    if ($('#avatar')) {
                        $('#avatar')
                            .textContent =
                            initials(
                                username
                            );
                    }

                    toast(
                        tr('saved'),
                        'success'
                    );

                    await renderProfile();
                }
            );
    }

    /* =========================================================
       SETTINGS
    ========================================================= */

    async function renderSettings() {
        setActive('settings');

        $('#content').innerHTML = `
            <div class="page-head">

                <div>

                    <div class="eyebrow">
                        ACCOUNT
                    </div>

                    <h1 class="page-title">
                        <i class="fa-solid fa-gear"></i>
                        ${tr('settings')}
                    </h1>

                </div>

            </div>

            <div class="grid two">

                <section class="card">

                    <h2 class="section-title">
                        ${tr('appearance')}
                    </h2>

                    <div class="toolbar">

                        <button
                            type="button"
                            class="btn ${
                                state.theme === 'dark'
                                    ? 'btn-primary'
                                    : 'btn-secondary'
                            }"
                            id="dark"
                        >
                            <i class="fa-solid fa-moon"></i>
                            ${tr('dark')}
                        </button>

                        <button
                            type="button"
                            class="btn ${
                                state.theme === 'light'
                                    ? 'btn-primary'
                                    : 'btn-secondary'
                            }"
                            id="light"
                        >
                            <i class="fa-solid fa-sun"></i>
                            ${tr('light')}
                        </button>

                    </div>

                </section>

                <section class="card">

                    <h2 class="section-title">
                        ${tr('language')}
                    </h2>

                    <div class="toolbar">

                        <button
                            type="button"
                            class="btn ${
                                state.lang === 'id'
                                    ? 'btn-primary'
                                    : 'btn-secondary'
                            }"
                            id="idLang"
                        >
                            🇮🇩 Indonesia
                        </button>

                        <button
                            type="button"
                            class="btn ${
                                state.lang === 'en'
                                    ? 'btn-primary'
                                    : 'btn-secondary'
                            }"
                            id="enLang"
                        >
                            🇬🇧 English
                        </button>

                    </div>

                </section>

                <section class="card">

                    <h2 class="section-title">
                        ${tr('security')}
                    </h2>

                    <p class="muted">
                        Password dikelola Supabase Auth.
                    </p>

                    <a
                        class="btn btn-secondary"
                        href="reset.html"
                    >
                        <i class="fa-solid fa-key"></i>
                        Reset Password
                    </a>

                </section>

            </div>
        `;

        $('#dark')?.addEventListener(
            'click',
            () => {
                state.theme =
                    'dark';

                setTheme();

                renderSettings();
            }
        );

        $('#light')?.addEventListener(
            'click',
            () => {
                state.theme =
                    'light';

                setTheme();

                renderSettings();
            }
        );

        $('#idLang')?.addEventListener(
            'click',
            () => {
                state.lang =
                    'id';

                localStorage.setItem(
                    'telecod_lang',
                    'id'
                );

                applyLang();

                renderSettings();
            }
        );

        $('#enLang')?.addEventListener(
            'click',
            () => {
                state.lang =
                    'en';

                localStorage.setItem(
                    'telecod_lang',
                    'en'
                );

                applyLang();

                renderSettings();
            }
        );
    }

    /* =========================================================
       MODAL
    ========================================================= */

    function openModal(html) {
        const modal =
            $('#modal');

        const body =
            $('#modalBody');

        if (!modal || !body) {
            return;
        }

        body.innerHTML =
            html;

        modal.classList.add(
            'show'
        );
    }

    function closeModal() {
        $('#modal')
            ?.classList.remove(
                'show'
            );
    }

    /* =========================================================
       ROUTER
    ========================================================= */

    async function render() {
        if (!state.user) {
            return;
        }

        closeMobile();

        const params =
            new URLSearchParams(
                location.search
            );

        const page =
            params.get('page') ||
            'dashboard';

        try {
            switch (page) {
                case 'dashboard':
                    return await renderDashboard();

                case 'marketplace':
                    return await renderMarketplace();

                case 'purchases':
                    return await renderPurchases();

                case 'payment':
                    return await renderPayment();

                case 'profile':
                    return await renderProfile();

                case 'settings':
                    return await renderSettings();

                case 'create-channel':
                    return await renderCreate(
                        'channel'
                    );

                case 'create-code':
                    return await renderCreate(
                        'code'
                    );

                case 'channel-free':
                case 'channel-paid':
                case 'code-free':
                case 'code-paid':
                    return await renderProducts(
                        page
                    );

                default:
                    return await renderDashboard();
            }

        } catch (error) {
            console.error(
                'TELECOD DASHBOARD ERROR:',
                error
            );

            toast(
                error.message ||
                tr('error'),
                'error'
            );
        }
    }

    /* =========================================================
       INITIALIZE
    ========================================================= */

    async function init() {
        if (state.initialized) {
            return;
        }

        state.initialized =
            true;

        layoutReady();

        if (!sup) {
            toast(
                tr('config'),
                'warning'
            );

            return;
        }

        const authenticated =
            await loadUser();

        if (!authenticated) {
            return;
        }

        await render();
    }

    init();

})();
