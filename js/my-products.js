/* =========================================================
   PasTele — My Products
   FINAL SQL SYNC
   CLEAN UI / COMPACT
   DATABASE:
     products
     pastelinks
     telegram_products
     telegram_channels
   IMPORTANT:
   - No schema changes.
   - Uses real SQL FINAL columns.
   - No legacy_published_flag.
   - products owner = creator_id OR seller_id.
   - telegram_products owner = owner_id.
   - telegram_channels owner = owner_id.
   - pastelinks owner = user_id.
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    /* =====================================================
       DOM
       ===================================================== */
    const $ = (id) =>
        document.getElementById(id);
    const content =
        $("content");
    const searchInput =
        $("searchInput");
    const clearSearch =
        $("clearSearch");
    const typeFilter =
        $("typeFilter");
    const statusFilter =
        $("statusFilter");
    const refreshBtn =
        $("refreshBtn");
    const totalCount =
        $("totalCount");
    const publishedCount =
        $("publishedCount");
    const paidCount =
        $("paidCount");
    const draftCount =
        $("draftCount");
    const resultInfo =
        $("resultInfo");
    /* =====================================================
       GLOBALS
       ===================================================== */
    const TC =
        window.TC || {};
    const supabase =
        window.sb ||
        window.supabaseClient ||
        window.supabase ||
        null;
    /* =====================================================
       STATE
       ===================================================== */
    let profile = null;
    let groups = [];
    let allItems = [];
    let loading = false;
    /* =====================================================
       HELPERS
       ===================================================== */
    const esc = (value) => {
        const text =
            String(value ?? "");
        if (
            typeof TC.esc ===
            "function"
        ) {
            return TC.esc(text);
        }
        return text
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
    const showToast = (
        message,
        type = "error"
    ) => {
        if (
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
    const normalize = (
        value
    ) => {
        return String(
            value ?? ""
        )
            .trim()
            .toLowerCase();
    };
    /* =====================================================
       TYPE
       ===================================================== */
    const iconFor = (
        type
    ) => {
        const icons = {
            paste:
                "fa-file-lines",
            pastelink:
                "fa-link",
            code:
                "fa-code",
            channel:
                "fa-tower-broadcast",
            product:
                "fa-box"
        };
        return (
            icons[
                normalize(type)
            ] ||
            "fa-box"
        );
    };
    const labelFor = (
        type
    ) => {
        const labels = {
            paste:
                "Paste",
            pastelink:
                "PasteLink",
            code:
                "Code Telegram",
            channel:
                "Channel / Group",
            product:
                "Marketplace"
        };
        return (
            labels[
                normalize(type)
            ] ||
            "Product"
        );
    };
    const typeValue = (
        item,
        fallback
    ) => {
        return normalize(
            item?.type ||
            item?.product_type ||
            fallback ||
            ""
        );
    };
    const titleOf = (
        item
    ) => {
        return String(
            item?.title ||
            item?.name ||
            item?.slug ||
            "Untitled"
        ).trim();
    };
    const descriptionOf = (
        item
    ) => {
        return String(
            item?.description ||
            ""
        ).trim();
    };
    const dateOf = (
        item
    ) => {
        if (
            !item?.created_at
        ) {
            return "Tanggal tidak tersedia";
        }
        const date =
            new Date(
                item.created_at
            );
        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Tanggal tidak tersedia";
        }
        return date.toLocaleDateString(
            "id-ID",
            {
                day:
                    "2-digit",
                month:
                    "short",
                year:
                    "numeric"
            }
        );
    };
    /* =====================================================
       STATUS
       =====================================================
       SQL FINAL menggunakan:
         status = draft
         status = published
         status = active
       Tidak menggunakan legacy_published_flag.
       */
    const statusOf = (
        item
    ) => {
        const status =
            normalize(
                item?.status
            );
        const price =
            Number(
                item?.price || 0
            );
        /*
         * Draft selalu draft.
         */
        if (
            status === "draft"
        ) {
            return {
                value:
                    "draft",
                label:
                    "Draft",
                icon:
                    "fa-file-pen"
            };
        }
        /*
         * Explicit inactive states.
         */
        if (
            status === "inactive" ||
            status === "disabled" ||
            status === "archived"
        ) {
            return {
                value:
                    "draft",
                label:
                    "Inactive",
                icon:
                    "fa-circle-pause"
            };
        }
        /*
         * Paid ditentukan dari harga.
         *
         * Hanya konten yang sudah published/active
         * dianggap published/paid.
         */
        if (
            status === "published" ||
            status === "active"
        ) {
            if (
                Number.isFinite(
                    price
                ) &&
                price > 0
            ) {
                return {
                    value:
                        "paid",
                    label:
                        "Paid",
                    icon:
                        "fa-tag"
                };
            }
            return {
                value:
                    "published",
                label:
                    "Published",
                icon:
                    "fa-circle-check"
            };
        }
        /*
         * Fallback:
         * produk lama tanpa status valid
         * dianggap draft agar tidak salah
         * tampil sebagai produk publik.
         */
        return {
            value:
                "draft",
            label:
                "Draft",
            icon:
                "fa-file-pen"
        };
    };
    /* =====================================================
       URL
       ===================================================== */
    const hrefFor = (
        item,
        type
    ) => {
        if (!item) {
            return "#";
        }
        /*
         * PasteLink
         */
        if (type === "pastelink") {
            if (!item.slug) return "#";
            return `${location.origin}/p/` + encodeURIComponent(item.slug);
        }
        if (type === "paste") {
            if (!item.slug) return "#";
            return `${location.origin}/paste/` + encodeURIComponent(item.slug);
        }
        /*
         * Telegram products/channels
         */
        if (
            type === "code" ||
            type === "channel"
        ) {
            if (
                !item.slug
            ) {
                return "#";
            }
            let prefix =
                "c";
            if (
                type === "channel"
            ) {
                /*
                 * telegram_channels.type
                 * berasal dari schema SQL.
                 */
                const channelType =
                    normalize(
                        item?.type
                    );
                prefix =
                    channelType ===
                    "group"
                        ? "g"
                        : "ch";
            }
            const access =
                normalize(
                    item?.access_type
                ) === "paid"
                        ? "p"
                        : "f";
            return (
                `${location.origin}/${prefix}/${access}/` +
                encodeURIComponent(
                    item.slug
                )
            );
        }
        /*
         * Marketplace products
         */
        if (
            item.id ===
                undefined ||
            item.id ===
                null ||
            item.id === ""
        ) {
            return "#";
        }
        return (
            `${location.origin}/product.html` +
            `?id=${encodeURIComponent(
                item.id
            )}` +
            `&type=${encodeURIComponent(
                item.type ||
                item.product_type ||
                type
            )}`
        );
    };
    /* =====================================================
       FIND ITEM
       ===================================================== */
    const findItem = (
        id,
        type
    ) => {
        const normalizedId =
            String(
                id ?? ""
            );
        const normalizedType =
            normalize(type);
        return allItems.find(
            (entry) => {
                return (
                    String(
                        entry?.id ??
                        ""
                    ) ===
                        normalizedId &&
                    normalize(
                        entry?.__type
                    ) ===
                        normalizedType
                );
            }
        );
    };
    /* =====================================================
       PRICE
       ===================================================== */
    const formatPrice = (
        price
    ) => {
        const value =
            Number(
                price || 0
            );
        if (
            !Number.isFinite(
                value
            ) ||
            value <= 0
        ) {
            return null;
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
            value
        );
    };
    /* =====================================================
       LOADING
       ===================================================== */
    const renderLoading = () => {
        if (!content) {
            return;
        }
        content.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i
                        class="fa-solid fa-spinner fa-spin"
                        aria-hidden="true"
                    ></i>
                </div>
                <strong>
                    Memuat produk...
                </strong>
                <span>
                    Mengambil data terbaru dari database.
                </span>
            </div>
        `;
        if (resultInfo) {
            resultInfo.textContent =
                "Memuat produk...";
        }
    };
    /* =====================================================
       ERROR
       ===================================================== */
    const renderError = (
        message
    ) => {
        if (!content) {
            return;
        }
        content.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon">
                    <i
                        class="fa-solid fa-triangle-exclamation"
                        aria-hidden="true"
                    ></i>
                </div>
                <strong>
                    Gagal memuat produk
                </strong>
                <span>
                    ${esc(
                        message ||
                        "Terjadi kesalahan saat mengambil data."
                    )}
                </span>
                <button
                    class="btn primary"
                    id="retryBtn"
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
        if (resultInfo) {
            resultInfo.textContent =
                "Gagal memuat data.";
        }
        $("retryBtn")
            ?.addEventListener(
                "click",
                loadData
            );
    };
    /* =====================================================
       LOAD DATA
       ===================================================== */
    async function loadData() {
        if (loading) {
            return;
        }
        loading = true;
        renderLoading();
        if (refreshBtn) {
            refreshBtn.disabled =
                true;
            refreshBtn.classList.add(
                "is-loading"
            );
        }
        try {
            if (!supabase) {
                throw new Error(
                    "Supabase belum tersedia."
                );
            }
            /*
             * PROFILE
             */
            if (
                typeof TC.profile !==
                "function"
            ) {
                throw new Error(
                    "TC.profile() tidak tersedia."
                );
            }
            profile =
                await TC.profile();
            if (!profile) {
                location.replace(
                    "login.html"
                );
                return;
            }
            /*
             * =================================================
             * LOAD 4 CONTENT TYPES
             * =================================================
             */
            const [
                productsResponse,
                pasteResponse,
                plainPasteResponse,
                codeResponse,
                channelResponse
            ] =
                await Promise.all([
                    /*
                     * PRODUCTS
                     *
                     * SQL:
                     * creator_id
                     * seller_id
                     */
                    supabase
                        .from(
                            "products"
                        )
                        .select(
                            [
                                "id",
                                "seller_id",
                                "creator_id",
                                "title",
                                "slug",
                                "price",
                                "thumbnail_url",
                                "type",
                                "access_type",
                                "category",
                                "description",
                                "views",
                                "sales_count",
                                "status",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .or(
                            `creator_id.eq.${profile.id},seller_id.eq.${profile.id}`
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        ),
                    /*
                     * PASTELINKS
                     *
                     * SQL:
                     * user_id
                     */
                    supabase
                        .from(
                            "pastelinks"
                        )
                        .select(
                            [
                                "id",
                                "user_id",
                                "slug",
                                "title",
                                "description",
                                "visibility",
                                "expires_at",
                                "views",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
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
                        ),
                    /*
                     * PLAIN PASTES
                     */
                    supabase
                        .from("pastes")
                        .select("id,owner_id,title,slug,content,visibility,created_at,updated_at")
                        .eq("owner_id", profile.id)
                        .order("created_at", {ascending:false}),
                    /*
                     * TELEGRAM PRODUCTS
                     *
                     * SQL:
                     * owner_id
                     * status
                     */
                    supabase
                        .from(
                            "telegram_products"
                        )
                        .select(
                            [
                                "id",
                                "owner_id",
                                "title",
                                "slug",
                                "type",
                                "product_type",
                                "access_type",
                                "bot_username",
                                "telegram_bot_id",
                                "price",
                                "description",
                                "thumbnail_url",
                                "category",
                                "status",
                                "views",
                                "sales_count",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        ),
                    /*
                     * TELEGRAM CHANNELS
                     *
                     * SQL:
                     * owner_id
                     * name
                     * type
                     * status
                     */
                    supabase
                        .from(
                            "telegram_channels"
                        )
                        .select(
                            [
                                "id",
                                "owner_id",
                                "username",
                                "name",
                                "type",
                                "access_type",
                                "telegram_channel_id",
                                "description",
                                "invite_url",
                                "price",
                                "category",
                                "status",
                                "views",
                                "sales_count",
                                "created_at",
                                "updated_at"
                            ].join(",")
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        )
                ]);
            const responses = [
                productsResponse,
                pasteResponse,
                plainPasteResponse,
                codeResponse,
                channelResponse
            ];
            const failed =
                responses.find(
                    (response) =>
                        response?.error
                );
            if (
                failed?.error
            ) {
                throw failed.error;
            }
            /* =================================================
               NORMALIZE
               ================================================= */
            const productItems =
                (
                    productsResponse.data ||
                    []
                ).map(
                    (item) => ({
                        ...item,
                        __type:
                            "product"
                    })
                );
            const pasteLinkItems =
                (pasteResponse.data || []).map(item => ({...item,__type:"pastelink",price:0,access_type:"free",status:item.visibility === "public" ? "published" : item.visibility}));
            const pasteItems =
                (plainPasteResponse.data || []).map(item => ({...item,__type:"paste",price:0,access_type:"free",status:item.visibility === "public" ? "published" : item.visibility}));
            const codeItems =
                (
                    codeResponse.data ||
                    []
                ).map(
                    (item) => ({
                        ...item,
                        __type:
                            "code"
                    })
                );
            const channelItems =
                (
                    channelResponse.data ||
                    []
                ).map(
                    (item) => ({
                        ...item,
                        __type:
                            "channel"
                    })
                );
            /* =================================================
               GROUPS
               ================================================= */
            groups = [
                {
                    key:
                        "pastelink",
                    title:
                        "PasteLink",
                    icon:
                        "fa-link",
                    items:
                        pasteLinkItems
                },
                {
                    key:
                        "paste",
                    title:
                        "Paste",
                    icon:
                        "fa-file-lines",
                    items:
                        pasteItems
                },
                {
                    key:
                        "code",
                    title:
                        "Code Telegram",
                    icon:
                        "fa-code",
                    items:
                        codeItems
                },
                {
                    key:
                        "channel",
                    title:
                        "Channel / Group",
                    icon:
                        "fa-tower-broadcast",
                    items:
                        channelItems
                },
                {
                    key:
                        "product",
                    title:
                        "Marketplace Product",
                    icon:
                        "fa-box",
                    items:
                        productItems
                }
            ];
            allItems =
                groups.flatMap(
                    (group) =>
                        group.items
                );
            updateOverview();
            render();
        } catch (error) {
            console.error(
                "[My Products] Load error:",
                error
            );
            renderError(
                error?.message ||
                "Tidak dapat mengambil data dari database."
            );
        } finally {
            loading = false;
            if (refreshBtn) {
                refreshBtn.disabled =
                    false;
                refreshBtn.classList.remove(
                    "is-loading"
                );
            }
        }
    }
    /* =====================================================
       OVERVIEW
       ===================================================== */
    function updateOverview() {
        const total =
            allItems.length;
        const published =
            allItems.filter(
                (item) => {
                    const status =
                        normalize(
                            item?.status
                        );
                    return (
                        status ===
                            "published" ||
                        status ===
                            "active"
                    );
                }
            ).length;
        const paid =
            allItems.filter(
                (item) => {
                    const status =
                        normalize(
                            item?.status
                        );
                    const price =
                        Number(
                            item?.price ||
                            0
                        );
                    return (
                        (
                            status ===
                                "published" ||
                            status ===
                                "active"
                        ) &&
                        Number.isFinite(
                            price
                        ) &&
                        price > 0
                    );
                }
            ).length;
        const draft =
            allItems.filter(
                (item) =>
                    normalize(
                        item?.status
                    ) ===
                    "draft"
            ).length;
        if (totalCount) {
            totalCount.textContent =
                total;
        }
        if (publishedCount) {
            publishedCount.textContent =
                published;
        }
        if (paidCount) {
            paidCount.textContent =
                paid;
        }
        if (draftCount) {
            draftCount.textContent =
                draft;
        }
    }
    /* =====================================================
       FILTER
       ===================================================== */
    function getFilteredGroups() {
        const search =
            normalize(
                searchInput?.value
            );
        const selectedType =
            typeFilter?.value ||
            "all";
        const selectedStatus =
            statusFilter?.value ||
            "all";
        return groups.map(
            (group) => {
                const filtered =
                    group.items.filter(
                        (item) => {
                            const title =
                                normalize(
                                    titleOf(
                                        item
                                    )
                                );
                            const slug =
                                normalize(
                                    item?.slug
                                );
                            const description =
                                normalize(
                                    descriptionOf(
                                        item
                                    )
                                );
                            const name =
                                normalize(
                                    item?.name
                                );
                            const botUsername =
                                normalize(
                                    item?.bot_username
                                );
                            const username =
                                normalize(
                                    item?.username
                                );
                            const type =
                                typeValue(
                                    item,
                                    group.key
                                );
                            const status =
                                statusOf(
                                    item
                                ).value;
                            const matchesSearch =
                                !search ||
                                title.includes(
                                    search
                                ) ||
                                slug.includes(
                                    search
                                ) ||
                                description.includes(
                                    search
                                ) ||
                                name.includes(
                                    search
                                ) ||
                                botUsername.includes(
                                    search
                                ) ||
                                username.includes(
                                    search
                                ) ||
                                type.includes(
                                    search
                                );
                            const matchesType =
                                selectedType ===
                                    "all" ||
                                group.key ===
                                    selectedType;
                            const matchesStatus =
                                selectedStatus ===
                                    "all" ||
                                status ===
                                    selectedStatus;
                            return (
                                matchesSearch &&
                                matchesType &&
                                matchesStatus
                            );
                        }
                    );
                return {
                    ...group,
                    items:
                        filtered
                };
            }
        );
    }
    /* =====================================================
       MAIN RENDER
       ===================================================== */
    function render() {
        if (!content) {
            return;
        }
        const filteredGroups =
            getFilteredGroups();
        const visibleItems =
            filteredGroups.reduce(
                (
                    total,
                    group
                ) =>
                    total +
                    group.items.length,
                0
            );
        const search =
            String(
                searchInput?.value ||
                ""
            ).trim();
        const hasFilter =
            Boolean(search) ||
            (
                typeFilter?.value ||
                "all"
            ) !== "all" ||
            (
                statusFilter?.value ||
                "all"
            ) !== "all";
        if (resultInfo) {
            resultInfo.textContent =
                hasFilter
                    ? `${visibleItems} hasil ditemukan`
                    : `${allItems.length} konten tersedia`;
        }
        clearSearch?.classList.toggle(
            "hidden",
            !search
        );
        const sections =
            filteredGroups
                .filter(
                    (group) =>
                        group.items.length >
                        0
                )
                .map(
                    renderGroup
                )
                .join("");
        if (sections) {
            content.innerHTML =
                sections;
            bindActions();
            return;
        }
        const isEmptyDatabase =
            allItems.length === 0;
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i
                        class="fa-solid ${
                            isEmptyDatabase
                                ? "fa-box-open"
                                : "fa-magnifying-glass"
                        }"
                        aria-hidden="true"
                    ></i>
                </div>
                <strong>
                    ${
                        isEmptyDatabase
                            ? "Belum ada produk"
                            : "Produk tidak ditemukan"
                    }
                </strong>
                <span>
                    ${
                        isEmptyDatabase
                            ? "Buat PasteLink, Code Telegram, Channel, atau produk marketplace pertamamu."
                            : "Coba ubah kata kunci atau filter pencarian."
                    }
                </span>
                ${
                    isEmptyDatabase
                        ? `
                            <a
                                href="create-product.html"
                                class="btn primary"
                            >
                                <i
                                    class="fa-solid fa-plus"
                                    aria-hidden="true"
                                ></i>
                                Buat Produk
                            </a>
                        `
                        : `
                            <button
                                class="btn"
                                id="resetFilterBtn"
                                type="button"
                            >
                                <i
                                    class="fa-solid fa-filter-circle-xmark"
                                    aria-hidden="true"
                                ></i>
                                Reset Filter
                            </button>
                        `
                }
            </div>
        `;
        $("resetFilterBtn")
            ?.addEventListener(
                "click",
                resetFilters
            );
    }
    /* =====================================================
       RENDER GROUP
       ===================================================== */
    function renderGroup(
        group
    ) {
        return `
            <section class="my-section">
                <div class="my-section-header">
                    <div class="my-section-title">
                        <span
                            class="my-section-title-icon"
                            aria-hidden="true"
                        >
                            <i
                                class="fa-solid ${group.icon}"
                            ></i>
                        </span>
                        <div>
                            <h2>
                                ${esc(
                                    group.title
                                )}
                            </h2>
                        </div>
                    </div>
                    <span
                        class="my-section-count"
                    >
                        ${group.items.length}
                    </span>
                </div>
                <div class="my-list">
                    ${group.items
                        .map(
                            (item) => {
                                const title =
                                    titleOf(
                                        item
                                    );
                                const status =
                                    statusOf(
                                        item
                                    );
                                const price =
                                    formatPrice(
                                        item?.price
                                    );
                                const slug =
                                    String(
                                        item?.slug ||
                                        ""
                                    ).trim();
                                const description =
                                    descriptionOf(
                                        item
                                    );
                                const href =
                                    hrefFor(
                                        item,
                                        group.key
                                    );
                                return `
                                    <article
                                        class="my-row"
                                        data-product-type="${esc(
                                            group.key
                                        )}"
                                    >
                                        <div
                                            class="my-row-head"
                                        >
                                            <span
                                                class="my-icon"
                                                aria-hidden="true"
                                            >
                                                <i
                                                    class="fa-solid ${iconFor(
                                                        group.key
                                                    )}"
                                                ></i>
                                            </span>
                                            <div
                                                class="my-row-main"
                                            >
                                                <div
                                                    class="my-row-title-wrap"
                                                >
                                                    <span
                                                        class="my-row-title"
                                                        title="${esc(
                                                            title
                                                        )}"
                                                    >
                                                        ${esc(
                                                            title
                                                        )}
                                                    </span>
                                                    <span
                                                        class="status-badge status-${esc(
                                                            status.value
                                                        )}"
                                                    >
                                                        <i
                                                            class="fa-solid ${status.icon}"
                                                            aria-hidden="true"
                                                        ></i>
                                                        ${esc(
                                                            status.label
                                                        )}
                                                    </span>
                                                </div>
                                                <div
                                                    class="my-row-meta"
                                                >
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
                                                        ${esc(
                                                            dateOf(
                                                                item
                                                            )
                                                        )}
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
                                                                <span
                                                                    class="meta-price"
                                                                >
                                                                    ${esc(
                                                                        price
                                                                    )}
                                                                </span>
                                                            `
                                                            : ""
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
                                                                    class="meta-slug"
                                                                    title="/${esc(
                                                                        slug
                                                                    )}"
                                                                >
                                                                    /${esc(
                                                                        slug
                                                                    )}
                                                                </span>
                                                            `
                                                            : ""
                                                    }
                                                </div>
                                                ${
                                                    description
                                                        ? `
                                                            <div
                                                                class="my-row-description"
                                                                title="${esc(
                                                                    description
                                                                )}"
                                                            >
                                                                ${esc(
                                                                    description
                                                                )}
                                                            </div>
                                                        `
                                                        : ""
                                                }
                                            </div>
                                        </div>
                                        <div
                                            class="my-row-footer"
                                        >
                                            <div
                                                class="my-row-type"
                                            >
                                                <i
                                                    class="fa-solid ${iconFor(
                                                        group.key
                                                    )}"
                                                    aria-hidden="true"
                                                ></i>
                                                ${esc(
                                                    labelFor(
                                                        group.key
                                                    )
                                                )}
                                            </div>
                                            <div
                                                class="my-row-actions"
                                            >
                                                <button
                                                    class="btn"
                                                    type="button"
                                                    data-action="open"
                                                    data-id="${esc(
                                                        item.id ??
                                                        ""
                                                    )}"
                                                    data-type="${esc(
                                                        group.key
                                                    )}"
                                                    title="Buka"
                                                    aria-label="Buka"
                                                >
                                                    <i
                                                        class="fa-solid fa-arrow-up-right-from-square"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>
                                                        Buka
                                                    </span>
                                                </button>
                                                <button
                                                    class="btn"
                                                    type="button"
                                                    data-action="copy"
                                                    data-id="${esc(
                                                        item.id ??
                                                        ""
                                                    )}"
                                                    data-type="${esc(
                                                        group.key
                                                    )}"
                                                    title="Salin link"
                                                    aria-label="Salin link"
                                                >
                                                    <i
                                                        class="fa-solid fa-copy"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>
                                                        Salin
                                                    </span>
                                                </button>
                                                <button
                                                    class="btn"
                                                    type="button"
                                                    data-action="edit"
                                                    data-id="${esc(
                                                        item.id ??
                                                        ""
                                                    )}"
                                                    data-type="${esc(
                                                        group.key
                                                    )}"
                                                    title="Edit"
                                                    aria-label="Edit"
                                                >
                                                    <i
                                                        class="fa-solid fa-pen"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>
                                                        Edit
                                                    </span>
                                                </button>
                                                <button
                                                    class="btn danger"
                                                    type="button"
                                                    data-action="delete"
                                                    data-id="${esc(
                                                        item.id ??
                                                        ""
                                                    )}"
                                                    data-type="${esc(
                                                        group.key
                                                    )}"
                                                    title="Hapus"
                                                    aria-label="Hapus"
                                                >
                                                    <i
                                                        class="fa-solid fa-trash"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>
                                                        Hapus
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                `;
                            }
                        )
                        .join("")}
                </div>
            </section>
        `;
    }
    /* =====================================================
       ACTION BINDING
       ===================================================== */
    function bindActions() {
        content
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        "click",
                        async (event) => {
                            /*
                             * Jangan biarkan <button>
                             * melakukan action lain.
                             */
                            event.preventDefault();
                            event.stopPropagation();
                            if (
                                button.disabled
                            ) {
                                return;
                            }
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
                                    "Data produk tidak ditemukan. Silakan refresh.",
                                    "error"
                                );
                                return;
                            }
                            try {
                                button.disabled =
                                    true;
                                if (
                                    action ===
                                    "open"
                                ) {
                                    openItem(
                                        item,
                                        type
                                    );
                                } else if (
                                    action ===
                                    "copy"
                                ) {
                                    await copyItem(
                                        item,
                                        type
                                    );
                                } else if (
                                    action ===
                                    "edit"
                                ) {
                                    await editItem(
                                        item,
                                        type
                                    );
                                } else if (
                                    action ===
                                    "delete"
                                ) {
                                    await deleteItem(
                                        item,
                                        type
                                    );
                                }
                            } catch (error) {
                                console.error(
                                    "[My Products] Action error:",
                                    error
                                );
                                showToast(
                                    error?.message ||
                                    "Action gagal.",
                                    "error"
                                );
                            } finally {
                                if (
                                    document.body.contains(
                                        button
                                    )
                                ) {
                                    button.disabled =
                                        false;
                                }
                            }
                        }
                    );
                }
            );
    }
    /* =====================================================
       OPEN
       ===================================================== */
    function openItem(
        item,
        type
    ) {
        const href =
            hrefFor(
                item,
                type
            );
        if (
            !href ||
            href === "#"
        ) {
            showToast(
                "Link untuk konten ini tidak tersedia.",
                "error"
            );
            return;
        }
        window.open(
            href,
            "_blank",
            "noopener,noreferrer"
        );
    }
    /* =====================================================
       COPY
       ===================================================== */
    async function copyItem(
        item,
        type
    ) {
        const href =
            hrefFor(
                item,
                type
            );
        if (
            !href ||
            href === "#"
        ) {
            showToast(
                "Link untuk konten ini tidak tersedia.",
                "error"
            );
            return;
        }
        try {
            if (
                navigator.clipboard &&
                window.isSecureContext
            ) {
                await navigator.clipboard
                    .writeText(
                        href
                    );
            } else {
                const textarea =
                    document.createElement(
                        "textarea"
                    );
                textarea.value =
                    href;
                textarea.setAttribute(
                    "readonly",
                    ""
                );
                textarea.style.position =
                    "fixed";
                textarea.style.left =
                    "-9999px";
                textarea.style.opacity =
                    "0";
                document.body.appendChild(
                    textarea
                );
                textarea.focus();
                textarea.select();
                textarea.setSelectionRange(
                    0,
                    textarea.value.length
                );
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
            }
            showToast(
                "Link berhasil disalin.",
                "success"
            );
        } catch (error) {
            console.error(
                "[My Products] Copy error:",
                error
            );
            showToast(
                "Gagal menyalin link.",
                "error"
            );
        }
    }
    /* =====================================================
       EDIT
       ===================================================== */
    async function editItem(
        item,
        type
    ) {
        const currentTitle =
            titleOf(
                item
            );
        const title =
            prompt(
                "Judul",
                currentTitle
            );
        if (
            title ===
            null
        ) {
            return;
        }
        const cleanTitle =
            title.trim();
        if (
            !cleanTitle
        ) {
            showToast(
                "Judul wajib diisi.",
                "error"
            );
            return;
        }
        let response;
        try {
            /* =============================================
               PASTELINK
               ============================================= */
            if (type === "pastelink") {
                response = await supabase.from("pastelinks")
                        .update({
                            title:
                                cleanTitle
                        })
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "user_id",
                            profile.id
                        );
            }
            /* =============================================
               PLAIN PASTE
               ============================================= */
            else if (type === "paste") {
                const contentValue = prompt("Isi paste", item.content || "");
                if (contentValue === null) return;
                response = await supabase.from("pastes").update({title:cleanTitle,content:contentValue.trim()}).eq("id",item.id).eq("owner_id",profile.id);
            }
            /* =============================================
               TELEGRAM PRODUCT
               ============================================= */
            else if (
                type ===
                "code"
            ) {
                const description =
                    prompt(
                        "Deskripsi",
                        item.description ||
                        ""
                    );
                if (
                    description ===
                    null
                ) {
                    return;
                }
                let price =
                    Number(
                        item.price ||
                        0
                    );
                const currentAccess =
                    normalize(
                        item.access_type
                    );
                let accessType =
                    currentAccess ===
                    "paid"
                        ? "paid"
                        : (
                            price > 0
                                ? "paid"
                                : "free"
                        );
                if (
                    accessType ===
                    "paid" ||
                    price > 0
                ) {
                    const enteredPrice =
                        prompt(
                            "Harga IDR",
                            String(
                                price
                            )
                        );
                    if (
                        enteredPrice ===
                        null
                    ) {
                        return;
                    }
                    price =
                        Number(
                            String(
                                enteredPrice
                            )
                                .replace(
                                    /[^\d]/g,
                                    ""
                                )
                        );
                    if (
                        !Number.isFinite(
                            price
                        ) ||
                        price < 0
                    ) {
                        showToast(
                            "Harga tidak valid.",
                            "error"
                        );
                        return;
                    }
                    accessType =
                        price > 0
                            ? "paid"
                            : "free";
                }
                response =
                    await supabase
                        .from(
                            "telegram_products"
                        )
                        .update({
                            title:
                                cleanTitle,
                            description:
                                description.trim(),
                            price:
                                price,
                            access_type:
                                accessType
                        })
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               TELEGRAM CHANNEL
               ============================================= */
            else if (
                type ===
                "channel"
            ) {
                const description =
                    prompt(
                        "Deskripsi",
                        item.description ||
                        ""
                    );
                if (
                    description ===
                    null
                ) {
                    return;
                }
                let price =
                    Number(
                        item.price ||
                        0
                    );
                const accessType =
                    price > 0
                        ? "paid"
                        : "free";
                const fields = {
                    name:
                        cleanTitle,
                    description:
                        description.trim(),
                    price:
                        Number.isFinite(
                            price
                        ) &&
                        price >= 0
                            ? price
                            : 0,
                    access_type:
                        accessType
                };
                response =
                    await supabase
                        .from(
                            "telegram_channels"
                        )
                        .update(
                            fields
                        )
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               MARKETPLACE PRODUCT
               ============================================= */
            else if (
                type ===
                "product"
            ) {
                const description =
                    prompt(
                        "Deskripsi",
                        item.description ||
                        ""
                    );
                if (
                    description ===
                    null
                ) {
                    return;
                }
                let price =
                    Number(
                        item.price ||
                        0
                    );
                if (
                    !Number.isFinite(
                        price
                    ) ||
                    price < 0
                ) {
                    price = 0;
                }
                /*
                 * Product owner bisa creator_id
                 * atau seller_id.
                 *
                 * Gunakan OR agar sesuai
                 * dengan query loadData().
                 */
                response =
                    await supabase
                        .from(
                            "products"
                        )
                        .update({
                            title:
                                cleanTitle,
                            description:
                                description.trim(),
                            price:
                                price,
                            access_type:
                                price > 0
                                    ? "paid"
                                    : "free"
                        })
                        .eq(
                            "id",
                            item.id
                        )
                        .or(
                            `creator_id.eq.${profile.id},seller_id.eq.${profile.id}`
                        );
            }
            else {
                showToast(
                    "Tipe produk tidak dikenal.",
                    "error"
                );
                return;
            }
            if (
                response?.error
            ) {
                throw response.error;
            }
            showToast(
                "Produk berhasil diperbarui.",
                "success"
            );
            await loadData();
        } catch (error) {
            console.error(
                "[My Products] Edit error:",
                error
            );
            showToast(
                error?.message ||
                "Gagal memperbarui produk.",
                "error"
            );
        }
    }
    /* =====================================================
       DELETE
       ===================================================== */
    async function deleteItem(
        item,
        type
    ) {
        const title =
            titleOf(
                item
            );
        const confirmed =
            confirm(
                `Hapus "${title}"?\n\nTindakan ini tidak dapat dibatalkan.`
            );
        if (
            !confirmed
        ) {
            return;
        }
        let response;
        try {
            /* =============================================
               PASTELINK
               ============================================= */
            if (type === "pastelink") {
                response = await supabase.from("pastelinks")
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "user_id",
                            profile.id
                        );
            }
            else if (type === "paste") {
                response = await supabase.from("pastes").delete().eq("id",item.id).eq("owner_id",profile.id);
            }
            /* =============================================
               TELEGRAM PRODUCT
               ============================================= */
            else if (
                type ===
                "code"
            ) {
                response =
                    await supabase
                        .from(
                            "telegram_products"
                        )
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               TELEGRAM CHANNEL
               ============================================= */
            else if (
                type ===
                "channel"
            ) {
                response =
                    await supabase
                        .from(
                            "telegram_channels"
                        )
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .eq(
                            "owner_id",
                            profile.id
                        );
            }
            /* =============================================
               MARKETPLACE PRODUCT
               ============================================= */
            else if (
                type ===
                "product"
            ) {
                response =
                    await supabase
                        .from(
                            "products"
                        )
                        .delete()
                        .eq(
                            "id",
                            item.id
                        )
                        .or(
                            `creator_id.eq.${profile.id},seller_id.eq.${profile.id}`
                        );
            }
            else {
                showToast(
                    "Tipe produk tidak dikenal.",
                    "error"
                );
                return;
            }
            if (
                response?.error
            ) {
                throw response.error;
            }
            showToast(
                "Konten berhasil dihapus.",
                "success"
            );
            await loadData();
        } catch (error) {
            console.error(
                "[My Products] Delete error:",
                error
            );
            showToast(
                error?.message ||
                "Gagal menghapus konten.",
                "error"
            );
        }
    }
    /* =====================================================
       RESET FILTER
       ===================================================== */
    function resetFilters() {
        if (searchInput) {
            searchInput.value =
                "";
        }
        if (typeFilter) {
            typeFilter.value =
                "all";
        }
        if (statusFilter) {
            statusFilter.value =
                "all";
        }
        render();
    }
    /* =====================================================
       EVENTS
       ===================================================== */
    searchInput?.addEventListener(
        "input",
        render
    );
    typeFilter?.addEventListener(
        "change",
        render
    );
    statusFilter?.addEventListener(
        "change",
        render
    );
    clearSearch?.addEventListener(
        "click",
        () => {
            if (searchInput) {
                searchInput.value =
                    "";
                searchInput.focus();
            }
            render();
        }
    );
    refreshBtn?.addEventListener(
        "click",
        async () => {
            await loadData();
        }
    );
    /* =====================================================
       INITIAL LOAD
       ===================================================== */
    await loadData();
});
