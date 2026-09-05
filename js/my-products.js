/* =========================================================
   PasTele — My Products
   FINAL CLEAN UI
   Real Supabase data
   No schema changes
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const content = $('content');
    const searchInput = $('searchInput');
    const clearSearch = $('clearSearch');
    const typeFilter = $('typeFilter');
    const statusFilter = $('statusFilter');
    const refreshBtn = $('refreshBtn');
    const totalCount = $('totalCount');
    const publishedCount = $('publishedCount');
    const paidCount = $('paidCount');
    const draftCount = $('draftCount');
    const resultInfo = $('resultInfo');
    let profile = null;
    let groups = [];
    let allItems = [];
    let loading = false;
    /* =====================================================
       Helpers
       ===================================================== */
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
    const showToast = (message, type = 'error') => {
        if (typeof TC?.toast === 'function') {
            TC.toast(message, type);
        } else {
            alert(message);
        }
    };
    const iconFor = (type) => {
        const icons = {
            paste: 'fa-file-lines',
            code: 'fa-code',
            channel: 'fa-broadcast-tower',
            product: 'fa-box'
        };
        return icons[String(type || '').toLowerCase()] || 'fa-box';
    };
    const labelFor = (type) => {
        const labels = {
            paste: 'PasteLink',
            code: 'Code Telegram',
            channel: 'Channel / Group',
            product: 'Marketplace'
        };
        return labels[type] || 'Product';
    };
    const typeValue = (item, fallback) => {
        return String(
            item?.type ||
            item?.product_type ||
            fallback ||
            ''
        ).toLowerCase();
    };
    const titleOf = (item) => {
        return (
            item?.title ||
            item?.name ||
            item?.slug ||
            'Untitled'
        );
    };
    /*
     * Compact date.
     * Tidak lagi menampilkan jam panjang
     * di setiap item.
     */
    const dateOf = (item) => {
        if (!item?.created_at) {
            return 'Tanggal tidak tersedia';
        }
        const date = new Date(item.created_at);
        if (Number.isNaN(date.getTime())) {
            return 'Tanggal tidak tersedia';
        }
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };
    const statusOf = (item) => {
        /*
         * Harga > 0 dianggap Paid
         */
        if (Number(item?.price || 0) > 0) {
            return {
                value: 'paid',
                label: 'Paid',
                icon: 'fa-tag'
            };
        }
        /*
         * Explicit draft
         */
        if (
            item?.is_published === false ||
            item?.status === 'draft'
        ) {
            return {
                value: 'draft',
                label: 'Draft',
                icon: 'fa-file-pen'
            };
        }
        return {
            value: 'published',
            label: 'Published',
            icon: 'fa-circle-check'
        };
    };
    const hrefFor = (item, type) => {
        if (!item) {
            return '#';
        }
        if (type === 'paste') {
            if (!item.slug) {
                return '#';
            }
            return `${location.origin}/paste-view.html?slug=${encodeURIComponent(
                item.slug
            )}`;
        }
        if (!item.id) {
            return '#';
        }
        return `${location.origin}/product.html?id=${encodeURIComponent(
            item.id
        )}&type=${encodeURIComponent(
            item.type ||
            item.product_type ||
            type
        )}`;
    };
    const findItem = (id, type) => {
        return allItems.find((entry) => {
            return String(entry.id) === String(id) &&
                entry.__type === type;
        });
    };
    /* =====================================================
       Price
       ===================================================== */
    const formatPrice = (price) => {
        const value = Number(price || 0);
        if (!Number.isFinite(value) || value <= 0) {
            return null;
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(value);
    };
    /* =====================================================
       Loading / Error
       ===================================================== */
    const renderLoading = () => {
        content.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                </div>
                <strong>Memuat produk...</strong>
                <span>
                    Mengambil data terbaru dari database.
                </span>
            </div>
        `;
        resultInfo.textContent = 'Memuat produk...';
    };
    const renderError = (message) => {
        content.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <strong>Gagal memuat produk</strong>
                <span>
                    ${esc(
                        message ||
                        'Terjadi kesalahan saat mengambil data.'
                    )}
                </span>
                <button
                    class="btn primary"
                    id="retryBtn"
                    type="button"
                >
                    <i class="fa-solid fa-rotate"></i>
                    Coba Lagi
                </button>
            </div>
        `;
        resultInfo.textContent = 'Gagal memuat data.';
        $('retryBtn')?.addEventListener(
            'click',
            loadData
        );
    };
    /* =====================================================
       Load Supabase Data
       ===================================================== */
    async function loadData() {
        if (loading) {
            return;
        }
        loading = true;
        renderLoading();
        refreshBtn.disabled = true;
        refreshBtn.classList.add('is-loading');
        try {
            profile = await TC.profile();
            if (!profile) {
                location.replace('login.html');
                return;
            }
            const [
                productsResponse,
                pasteResponse,
                codeResponse,
                channelResponse
            ] = await Promise.all([
                sb
                    .from('products')
                    .select('*')
                    .eq('creator_id', profile.id)
                    .order('created_at', {
                        ascending: false
                    }),
                sb
                    .from('pastelinks')
                    .select('*')
                    .eq('user_id', profile.id)
                    .order('created_at', {
                        ascending: false
                    }),
                sb
                    .from('telegram_products')
                    .select('*')
                    .eq('owner_id', profile.id)
                    .order('created_at', {
                        ascending: false
                    }),
                sb
                    .from('telegram_channels')
                    .select('*')
                    .eq('owner_id', profile.id)
                    .order('created_at', {
                        ascending: false
                    })
            ]);
            const responses = [
                productsResponse,
                pasteResponse,
                codeResponse,
                channelResponse
            ];
            const failed = responses.find(
                (response) => response?.error
            );
            if (failed?.error) {
                throw failed.error;
            }
            const productItems =
                (productsResponse.data || []).map(
                    (item) => ({
                        ...item,
                        __type: 'product'
                    })
                );
            const pasteItems =
                (pasteResponse.data || []).map(
                    (item) => ({
                        ...item,
                        __type: 'paste'
                    })
                );
            const codeItems =
                (codeResponse.data || []).map(
                    (item) => ({
                        ...item,
                        __type: 'code'
                    })
                );
            const channelItems =
                (channelResponse.data || []).map(
                    (item) => ({
                        ...item,
                        __type: 'channel'
                    })
                );
            groups = [
                {
                    key: 'paste',
                    title: 'PasteLink',
                    icon: 'fa-file-lines',
                    items: pasteItems
                },
                {
                    key: 'code',
                    title: 'Code Telegram',
                    icon: 'fa-code',
                    items: codeItems
                },
                {
                    key: 'channel',
                    title: 'Channel / Group',
                    icon: 'fa-broadcast-tower',
                    items: channelItems
                },
                {
                    key: 'product',
                    title: 'Marketplace Product',
                    icon: 'fa-box',
                    items: productItems
                }
            ];
            allItems = groups.flatMap(
                (group) => group.items
            );
            updateOverview();
            render();
        } catch (error) {
            console.error(
                'My Products load error:',
                error
            );
            renderError(
                error?.message ||
                'Tidak dapat mengambil data dari database.'
            );
        } finally {
            loading = false;
            refreshBtn.disabled = false;
            refreshBtn.classList.remove(
                'is-loading'
            );
        }
    }
    /* =====================================================
       Overview
       ===================================================== */
    function updateOverview() {
        const total = allItems.length;
        const published =
            allItems.filter(
                (item) =>
                    statusOf(item).value === 'published'
            ).length;
        const paid =
            allItems.filter(
                (item) =>
                    statusOf(item).value === 'paid'
            ).length;
        const draft =
            allItems.filter(
                (item) =>
                    statusOf(item).value === 'draft'
            ).length;
        totalCount.textContent = total;
        publishedCount.textContent = published;
        paidCount.textContent = paid;
        draftCount.textContent = draft;
    }
    /* =====================================================
       Filtering
       ===================================================== */
    function getFilteredGroups() {
        const search =
            String(searchInput?.value || '')
                .trim()
                .toLowerCase();
        const selectedType =
            typeFilter?.value || 'all';
        const selectedStatus =
            statusFilter?.value || 'all';
        return groups.map((group) => {
            const filtered =
                group.items.filter((item) => {
                    const title =
                        titleOf(item)
                            .toLowerCase();
                    const slug =
                        String(item.slug || '')
                            .toLowerCase();
                    const type =
                        typeValue(
                            item,
                            group.key
                        );
                    const status =
                        statusOf(item).value;
                    const matchesSearch =
                        !search ||
                        title.includes(search) ||
                        slug.includes(search) ||
                        type.includes(search);
                    const matchesType =
                        selectedType === 'all' ||
                        group.key === selectedType;
                    const matchesStatus =
                        selectedStatus === 'all' ||
                        status === selectedStatus;
                    return (
                        matchesSearch &&
                        matchesType &&
                        matchesStatus
                    );
                });
            return {
                ...group,
                items: filtered
            };
        });
    }
    /* =====================================================
       Main Render
       ===================================================== */
    function render() {
        const filteredGroups =
            getFilteredGroups();
        const visibleItems =
            filteredGroups.reduce(
                (total, group) =>
                    total + group.items.length,
                0
            );
        const hasFilter =
            String(searchInput?.value || '').trim() ||
            (typeFilter?.value || 'all') !== 'all' ||
            (statusFilter?.value || 'all') !== 'all';
        resultInfo.textContent =
            hasFilter
                ? `${visibleItems} hasil ditemukan`
                : `${allItems.length} konten tersedia`;
        clearSearch?.classList.toggle(
            'hidden',
            !String(
                searchInput?.value || ''
            ).trim()
        );
        const sections =
            filteredGroups
                .filter(
                    (group) =>
                        group.items.length > 0
                )
                .map(renderGroup)
                .join('');
        if (sections) {
            content.innerHTML = sections;
            bindActions();
            return;
        }
        const isEmptyDatabase =
            allItems.length === 0;
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fa-solid ${
                        isEmptyDatabase
                            ? 'fa-box-open'
                            : 'fa-magnifying-glass'
                    }"></i>
                </div>
                <strong>
                    ${
                        isEmptyDatabase
                            ? 'Belum ada produk'
                            : 'Produk tidak ditemukan'
                    }
                </strong>
                <span>
                    ${
                        isEmptyDatabase
                            ? 'Buat PasteLink, Code Telegram, Channel, atau produk marketplace pertamamu.'
                            : 'Coba ubah kata kunci atau filter pencarian.'
                    }
                </span>
                ${
                    isEmptyDatabase
                        ? `
                            <a
                                href="create-product.html"
                                class="btn primary"
                            >
                                <i class="fa-solid fa-plus"></i>
                                Buat Produk
                            </a>
                        `
                        : `
                            <button
                                class="btn"
                                id="resetFilterBtn"
                                type="button"
                            >
                                <i class="fa-solid fa-filter-circle-xmark"></i>
                                Reset Filter
                            </button>
                        `
                }
            </div>
        `;
        $('resetFilterBtn')?.addEventListener(
            'click',
            resetFilters
        );
    }
    /* =====================================================
       Render Group
       ===================================================== */
    function renderGroup(group) {
        return `
            <section class="my-section">
                <div class="my-section-header">
                    <div class="my-section-title">
                        <span class="my-section-title-icon">
                            <i class="fa-solid ${group.icon}"></i>
                        </span>
                        <h2>
                            ${esc(group.title)}
                        </h2>
                    </div>
                    <span class="my-section-count">
                        ${group.items.length}
                    </span>
                </div>
                ${group.items.map((item) => {
                    const title =
                        titleOf(item);
                    const status =
                        statusOf(item);
                    const href =
                        hrefFor(
                            item,
                            group.key
                        );
                    const price =
                        formatPrice(
                            item.price
                        );
                    const slug =
                        String(
                            item.slug || ''
                        ).trim();
                    return `
                        <article
                            class="my-row"
                            data-product-type="${esc(group.key)}"
                        >
                            <!-- Icon -->
                            <span
                                class="my-icon"
                                aria-hidden="true"
                            >
                                <i class="fa-solid ${iconFor(group.key)}"></i>
                            </span>
                            <!-- Main -->
                            <div class="my-row-main">
                                <span
                                    class="my-row-title"
                                    title="${esc(title)}"
                                >
                                    ${esc(title)}
                                </span>
                                <div class="my-row-meta">
                                    <span>
                                        ${esc(
                                            labelFor(
                                                group.key
                                            )
                                        )}
                                    </span>
                                    <span
                                        class="meta-dot"
                                        aria-hidden="true"
                                    >
                                        •
                                    </span>
                                    <span>
                                        ${esc(dateOf(item))}
                                    </span>
                                    ${
                                        price
                                            ? `
                                                <span
                                                    class="meta-dot"
                                                    aria-hidden="true"
                                                >
                                                    •
                                                </span>
                                                <span>
                                                    ${esc(price)}
                                                </span>
                                            `
                                            : ''
                                    }
                                    ${
                                        slug
                                            ? `
                                                <span
                                                    class="meta-dot"
                                                    aria-hidden="true"
                                                >
                                                    •
                                                </span>
                                                <span
                                                    title="/${esc(slug)}"
                                                >
                                                    /${esc(slug)}
                                                </span>
                                            `
                                            : ''
                                    }
                                </div>
                            </div>
                            <!-- Status -->
                            <span
                                class="status-badge status-${esc(status.value)}"
                            >
                                <i class="fa-solid ${status.icon}"></i>
                                ${esc(status.label)}
                            </span>
                            <!-- Actions -->
                            <div class="my-row-actions">
                                <button
                                    class="btn"
                                    type="button"
                                    data-action="open"
                                    data-id="${esc(item.id || '')}"
                                    data-type="${esc(group.key)}"
                                    title="Buka"
                                    aria-label="Buka"
                                >
                                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                    <span>Buka</span>
                                </button>
                                <button
                                    class="btn"
                                    type="button"
                                    data-action="copy"
                                    data-id="${esc(item.id || '')}"
                                    data-type="${esc(group.key)}"
                                    title="Salin link"
                                    aria-label="Salin link"
                                >
                                    <i class="fa-solid fa-copy"></i>
                                    <span>Salin</span>
                                </button>
                                <button
                                    class="btn"
                                    type="button"
                                    data-action="edit"
                                    data-id="${esc(item.id || '')}"
                                    data-type="${esc(group.key)}"
                                    title="Edit"
                                    aria-label="Edit"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                    <span>Edit</span>
                                </button>
                                <button
                                    class="btn danger"
                                    type="button"
                                    data-action="delete"
                                    data-id="${esc(item.id || '')}"
                                    data-type="${esc(group.key)}"
                                    title="Hapus"
                                    aria-label="Hapus"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                    <span>Hapus</span>
                                </button>
                            </div>
                        </article>
                    `;
                }).join('')}
            </section>
        `;
    }
    /* =====================================================
       Actions
       ===================================================== */
    function bindActions() {
        content
            .querySelectorAll('[data-action]')
            .forEach((button) => {
                button.addEventListener(
                    'click',
                    async () => {
                        const id =
                            button.dataset.id;
                        const type =
                            button.dataset.type;
                        const action =
                            button.dataset.action;
                        const item =
                            findItem(
                                id,
                                type
                            );
                        if (!item) {
                            showToast(
                                'Data produk tidak ditemukan. Silakan refresh.',
                                'error'
                            );
                            return;
                        }
                        if (action === 'open') {
                            openItem(
                                item,
                                type
                            );
                        }
                        if (action === 'copy') {
                            await copyItem(
                                item,
                                type
                            );
                        }
                        if (action === 'edit') {
                            await editItem(
                                item,
                                type
                            );
                        }
                        if (action === 'delete') {
                            await deleteItem(
                                item,
                                type
                            );
                        }
                    }
                );
            });
    }
    /* =====================================================
       Open
       ===================================================== */
    function openItem(item, type) {
        const href =
            hrefFor(
                item,
                type
            );
        if (!href || href === '#') {
            showToast(
                'Link untuk konten ini tidak tersedia.',
                'error'
            );
            return;
        }
        window.open(
            href,
            '_blank',
            'noopener,noreferrer'
        );
    }
    /* =====================================================
       Copy
       ===================================================== */
    async function copyItem(item, type) {
        const href =
            hrefFor(
                item,
                type
            );
        if (!href || href === '#') {
            showToast(
                'Link untuk konten ini tidak tersedia.',
                'error'
            );
            return;
        }
        try {
            await navigator.clipboard.writeText(
                href
            );
            showToast(
                'Link berhasil disalin',
                'success'
            );
        } catch (error) {
            console.error(
                'Copy error:',
                error
            );
            showToast(
                'Gagal menyalin link',
                'error'
            );
        }
    }
    /* =====================================================
       Edit
       ===================================================== */
    async function editItem(item, type) {
        const currentTitle =
            titleOf(item);
        const title =
            prompt(
                'Judul',
                currentTitle
            );
        if (title === null) {
            return;
        }
        const cleanTitle =
            title.trim();
        if (!cleanTitle) {
            showToast(
                'Judul wajib diisi.',
                'error'
            );
            return;
        }
        let response;
        try {
            /* ---------------------------------------------
               PasteLink
               --------------------------------------------- */
            if (type === 'paste') {
                response =
                    await sb
                        .from('pastelinks')
                        .update({
                            title: cleanTitle
                        })
                        .eq('id', item.id)
                        .eq(
                            'user_id',
                            profile.id
                        );
            }
            /* ---------------------------------------------
               Code
               --------------------------------------------- */
            else if (type === 'code') {
                const description =
                    prompt(
                        'Deskripsi',
                        item.description || ''
                    );
                if (description === null) {
                    return;
                }
                let price =
                    Number(
                        item.price || 0
                    );
                let accessType =
                    item.access_type ||
                    (
                        price > 0
                            ? 'paid'
                            : 'free'
                    );
                if (
                    accessType === 'paid'
                ) {
                    const enteredPrice =
                        prompt(
                            'Harga IDR',
                            String(price)
                        );
                    if (
                        enteredPrice === null
                    ) {
                        return;
                    }
                    price =
                        Number(
                            String(
                                enteredPrice
                            ).replace(
                                /[^\d]/g,
                                ''
                            )
                        );
                    if (
                        !Number.isFinite(price) ||
                        price < 0
                    ) {
                        showToast(
                            'Harga tidak valid.',
                            'error'
                        );
                        return;
                    }
                    accessType =
                        price > 0
                            ? 'paid'
                            : 'free';
                }
                response =
                    await sb
                        .from(
                            'telegram_products'
                        )
                        .update({
                            title:
                                cleanTitle,
                            description:
                                description.trim(),
                            price,
                            access_type:
                                accessType
                        })
                        .eq(
                            'id',
                            item.id
                        )
                        .eq(
                            'owner_id',
                            profile.id
                        );
            }
            /* ---------------------------------------------
               Channel
               --------------------------------------------- */
            else if (type === 'channel') {
                response =
                    await sb
                        .from(
                            'telegram_channels'
                        )
                        .update({
                            name:
                                cleanTitle
                        })
                        .eq(
                            'id',
                            item.id
                        )
                        .eq(
                            'owner_id',
                            profile.id
                        );
            }
            /* ---------------------------------------------
               Marketplace Product
               --------------------------------------------- */
            else if (type === 'product') {
                response =
                    await sb
                        .from(
                            'products'
                        )
                        .update({
                            title:
                                cleanTitle
                        })
                        .eq(
                            'id',
                            item.id
                        )
                        .eq(
                            'creator_id',
                            profile.id
                        );
            }
            else {
                showToast(
                    'Tipe produk tidak dikenal.',
                    'error'
                );
                return;
            }
            if (response?.error) {
                throw response.error;
            }
            showToast(
                'Produk berhasil diperbarui.',
                'success'
            );
            await loadData();
        } catch (error) {
            console.error(
                'Edit product error:',
                error
            );
            showToast(
                error?.message ||
                'Gagal memperbarui produk.',
                'error'
            );
        }
    }
    /* =====================================================
       Delete
       ===================================================== */
    async function deleteItem(
        item,
        type
    ) {
        const title =
            titleOf(item);
        const confirmed =
            confirm(
                `Hapus "${title}"?\n\nTindakan ini tidak dapat dibatalkan.`
            );
        if (!confirmed) {
            return;
        }
        let response;
        try {
            if (type === 'paste') {
                response =
                    await sb
                        .from(
                            'pastelinks'
                        )
                        .delete()
                        .eq(
                            'id',
                            item.id
                        )
                        .eq(
                            'user_id',
                            profile.id
                        );
            }
            else if (type === 'code') {
                response =
                    await sb
                        .from(
                            'telegram_products'
                        )
                        .delete()
                        .eq(
                            'id',
                            item.id
                        )
                        .eq(
                            'owner_id',
                            profile.id
                        );
            }
            else if (type === 'channel') {
                response =
                    await sb
                        .from(
                            'telegram_channels'
                        )
                        .delete()
                        .eq(
                            'id',
                            item.id
                        )
                        .eq(
                            'owner_id',
                            profile.id
                        );
            }
            else if (type === 'product') {
                response =
                    await sb
                        .from(
                            'products'
                        )
                        .delete()
                        .eq(
                            'id',
                            item.id
                        )
                        .eq(
                            'creator_id',
                            profile.id
                        );
            }
            else {
                showToast(
                    'Tipe produk tidak dikenal.',
                    'error'
                );
                return;
            }
            if (response?.error) {
                throw response.error;
            }
            showToast(
                'Konten berhasil dihapus.',
                'success'
            );
            await loadData();
        } catch (error) {
            console.error(
                'Delete product error:',
                error
            );
            showToast(
                error?.message ||
                'Gagal menghapus konten.',
                'error'
            );
        }
    }
    /* =====================================================
       Reset Filters
       ===================================================== */
    function resetFilters() {
        if (searchInput) {
            searchInput.value = '';
        }
        if (typeFilter) {
            typeFilter.value = 'all';
        }
        if (statusFilter) {
            statusFilter.value = 'all';
        }
        render();
    }
    /* =====================================================
       Events
       ===================================================== */
    searchInput?.addEventListener(
        'input',
        render
    );
    typeFilter?.addEventListener(
        'change',
        render
    );
    statusFilter?.addEventListener(
        'change',
        render
    );
    clearSearch?.addEventListener(
        'click',
        () => {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            render();
        }
    );
    refreshBtn?.addEventListener(
        'click',
        async () => {
            await loadData();
        }
    );
    /* =====================================================
       Initial Load
       ===================================================== */
    await loadData();
});
