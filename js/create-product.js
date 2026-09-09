/* =========================================================
   PasTele — CREATE PRODUCT
   FINAL PRODUCTION
   SUPABASE MASTER SQL SYNC

   ROUTING
   ---------------------------------------------------------
   link                    -> products
   paste                   -> pastes
   pastelink               -> pastelinks
   code                    -> telegram_products
   channel / group         -> telegram_channels

   ACCESS
   ---------------------------------------------------------
   FREE
       access_type = free
       price       = 0

   PAID
       access_type = paid
       price       = Rp5.000 - Rp150.000

   PUBLIC URL
   ---------------------------------------------------------
   Code:
       /c/f/slug
       /c/p/slug

   Channel:
       /ch/f/slug
       /ch/p/slug

   Group:
       /g/f/slug
       /g/p/slug

   PasteLink:
       /p/slug

   Paste:
       /paste/slug

   Link:
       /product.html?type=link&slug=slug

   SUCCESS
   ---------------------------------------------------------
   Show public URL modal
   - Copy
   - Share
   - Open Link
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =======================================================
       DOM
       ======================================================= */

    const $ = (id) =>
        document.getElementById(id);

    const form = $("f");

    const title = $("title");
    const slug = $("slug");
    const price = $("price");
    const thumb = $("thumb");
    const type = $("type");
    const access = $("access");
    const desc = $("desc");
    const content = $("content");

    const submitBtn =
        $("submitBtn");

    const submitNormal =
        submitBtn?.querySelector(
            ".submit-normal"
        );

    const submitLoading =
        submitBtn?.querySelector(
            ".submit-loading"
        );

    const priceHint =
        $("priceHint");

    const thumbPreview =
        $("thumbPreview");

    const thumbImage =
        $("thumbImage");

    const descCounter =
        $("descCounter");

    const contentLabel =
        $("contentLabel");

    const contentHint =
        $("contentHint");

    /* =======================================================
       AUTH MODAL
       ======================================================= */

    const authRequiredModal =
        $("authRequiredModal");

    const authRequiredClose =
        $("authRequiredClose");

    const authLoginBtn =
        $("authLoginBtn");

    const authRegisterBtn =
        $("authRegisterBtn");

    const authRequiredTitle =
        $("authRequiredTitle");

    const authRequiredText =
        $("authRequiredText");

    /* =======================================================
       CONSTANTS
       ======================================================= */

    const VALID_TYPES = [
        "link",
        "paste",
        "pastelink",
        "code",
        "channel",
        "group"
    ];

    const VALID_ACCESS = [
        "free",
        "paid"
    ];

    /*
     * FINAL PRICE
     *
     * Free:
     *   Rp0
     *
     * Paid:
     *   Rp5.000 - Rp150.000
     */
    const MIN_PAID_PRICE = 5000;
    const MAX_PAID_PRICE = 150000;

    const MAX_TITLE = 120;
    const MAX_SLUG = 80;
    const MAX_DESCRIPTION = 3000;
    const MAX_CONTENT = 1000000;

    let slugManuallyEdited = false;
    let submitting = false;

    let authModalOpen = false;
    let authModalReturnFocus = null;

    /* =======================================================
       SUPABASE
       ======================================================= */

    const getSupabase = () => {
        const client =
            window.sb ||
            window.supabaseClient;

        if (!client) {
            throw new Error(
                "Supabase belum siap. Periksa konfigurasi Supabase."
            );
        }

        if (
            !client.auth ||
            !client.from
        ) {
            throw new Error(
                "Supabase client belum lengkap."
            );
        }

        return client;
    };

    /* =======================================================
       TOAST
       ======================================================= */

    const getTC = () =>
        window.TC || null;

    const toast = (
        message,
        kind = "info"
    ) => {
        const TC =
            getTC();

        if (
            typeof TC?.toast ===
            "function"
        ) {
            TC.toast(
                String(
                    message || ""
                ),
                kind
            );

            return;
        }

        if (
            kind === "error"
        ) {
            console.error(
                "[PasTele]",
                message
            );
        } else {
            console.log(
                "[PasTele]",
                message
            );
        }
    };

    /* =======================================================
       HELPERS
       ======================================================= */

    const normalizeSlug = (
        value
    ) => {
        return String(
            value || ""
        )
            .trim()
            .toLowerCase()
            .normalize("NFKD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            )
            .slice(
                0,
                MAX_SLUG
            );
    };

    const randomSlug = (
        length = 5
    ) => {
        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZ" +
            "abcdefghijkmnopqrstuvwxyz" +
            "23456789";

        const bytes =
            new Uint8Array(
                length
            );

        if (
            window.crypto?.getRandomValues
        ) {
            crypto.getRandomValues(
                bytes
            );
        } else {
            for (
                let i = 0;
                i < length;
                i++
            ) {
                bytes[i] =
                    Math.floor(
                        Math.random() *
                            256
                    );
            }
        }

        return Array.from(
            bytes,
            (byte) =>
                chars[
                    byte %
                    chars.length
                ]
        ).join("");
    };

    const formatRupiah = (
        value
    ) => {
        const amount =
            Number(
                value || 0
            );

        if (
            !Number.isFinite(
                amount
            )
        ) {
            return "Rp0";
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
            amount
        );
    };

    const clearInvalid = (
        element
    ) => {
        if (!element) {
            return;
        }

        element.classList.remove(
            "invalid"
        );

        element.removeAttribute(
            "aria-invalid"
        );
    };

    const markInvalid = (
        element
    ) => {
        if (!element) {
            return;
        }

        element.classList.add(
            "invalid"
        );

        element.setAttribute(
            "aria-invalid",
            "true"
        );

        try {
            element.focus({
                preventScroll:
                    false
            });
        } catch {
            try {
                element.focus();
            } catch {
                /* ignore */
            }
        }
    };

    const setSubmitting = (
        state
    ) => {
        submitting =
            Boolean(state);

        if (!submitBtn) {
            return;
        }

        submitBtn.disabled =
            submitting;

        submitBtn.setAttribute(
            "aria-busy",
            submitting
                ? "true"
                : "false"
        );

        if (submitNormal) {
            submitNormal.hidden =
                submitting;
        }

        if (submitLoading) {
            submitLoading.hidden =
                !submitting;
        }
    };

    /* =======================================================
       CURRENT USER
       ======================================================= */

    const getCurrentUser =
        async () => {
            const TC =
                getTC();

            if (
                typeof TC?.user ===
                "function"
            ) {
                try {
                    const user =
                        await TC.user();

                    if (
                        user?.id
                    ) {
                        return user;
                    }
                } catch (
                    error
                ) {
                    console.warn(
                        "[PasTele] TC.user() failed:",
                        error
                    );
                }
            }

            const sb =
                getSupabase();

            try {
                const {
                    data,
                    error
                } =
                    await sb.auth.getUser();

                if (
                    !error &&
                    data?.user?.id
                ) {
                    return data.user;
                }
            } catch (
                error
            ) {
                console.warn(
                    "[PasTele] getUser failed:",
                    error
                );
            }

            return null;
        };

    /* =======================================================
       AUTH MODAL
       ======================================================= */

    const closeAuthModal =
        () => {
            if (
                !authRequiredModal
            ) {
                return;
            }

            authRequiredModal.hidden =
                true;

            authRequiredModal.setAttribute(
                "aria-hidden",
                "true"
            );

            document.body.classList.remove(
                "auth-modal-open"
            );

            authModalOpen =
                false;

            if (
                authModalReturnFocus &&
                typeof authModalReturnFocus.focus ===
                    "function"
            ) {
                try {
                    authModalReturnFocus.focus({
                        preventScroll:
                            true
                    });
                } catch {
                    try {
                        authModalReturnFocus.focus();
                    } catch {
                        /* ignore */
                    }
                }
            }

            authModalReturnFocus =
                null;
        };

    const openAuthModal =
        () => {
            if (
                !authRequiredModal
            ) {
                toast(
                    "Silakan masuk atau daftar terlebih dahulu.",
                    "warning"
                );

                return;
            }

            authModalReturnFocus =
                document.activeElement;

            if (
                authRequiredTitle
            ) {
                authRequiredTitle.textContent =
                    "Masuk untuk membuat produk";
            }

            if (
                authRequiredText
            ) {
                authRequiredText.textContent =
                    "Kamu harus masuk atau membuat akun PasTele terlebih dahulu sebelum dapat membuat produk.";
            }

            authRequiredModal.hidden =
                false;

            authRequiredModal.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "auth-modal-open"
            );

            authModalOpen =
                true;

            requestAnimationFrame(
                () => {
                    authLoginBtn?.focus?.({
                        preventScroll:
                            true
                    });
                }
            );
        };

    const requireAuthenticated =
        async () => {
            const user =
                await getCurrentUser();

            if (
                user?.id
            ) {
                return user;
            }

            openAuthModal();

            return null;
        };

    /* =======================================================
       AUTH MODAL EVENTS
       ======================================================= */

    authRequiredModal?.addEventListener(
        "click",
        (event) => {
            if (
                event.target?.closest?.(
                    "[data-auth-close]"
                )
            ) {
                closeAuthModal();
            }
        }
    );

    authRequiredClose?.addEventListener(
        "click",
        closeAuthModal
    );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                !authModalOpen
            ) {
                return;
            }

            if (
                event.key ===
                "Escape"
            ) {
                event.preventDefault();

                closeAuthModal();

                return;
            }

            if (
                event.key !==
                    "Tab" ||
                !authRequiredModal
            ) {
                return;
            }

            const focusable =
                authRequiredModal.querySelectorAll(
                    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );

            if (
                !focusable.length
            ) {
                return;
            }

            const first =
                focusable[0];

            const last =
                focusable[
                    focusable.length -
                        1
                ];

            if (
                event.shiftKey &&
                document.activeElement ===
                    first
            ) {
                event.preventDefault();
                last.focus();
            }

            if (
                !event.shiftKey &&
                document.activeElement ===
                    last
            ) {
                event.preventDefault();
                first.focus();
            }
        }
    );

    /* =======================================================
       AUTH REDIRECT LINKS
       ======================================================= */

    const currentCreateUrl =
        () => {
            try {
                return (
                    window.location.pathname +
                    window.location.search
                );
            } catch {
                return "/create.html";
            }
        };

    const prepareAuthLink =
        (element) => {
            if (!element) {
                return;
            }

            try {
                const href =
                    element.getAttribute(
                        "href"
                    ) || "";

                const url =
                    new URL(
                        href,
                        window.location.href
                    );

                url.searchParams.set(
                    "return",
                    currentCreateUrl()
                );

                element.href =
                    url.toString();
            } catch {
                /* ignore */
            }
        };

    prepareAuthLink(
        authLoginBtn
    );

    prepareAuthLink(
        authRegisterBtn
    );

    /* =======================================================
       PRODUCT TYPE CONFIG
       ======================================================= */

    const TYPE_CONFIG = {
        link: {
            icon:
                "fa-link",
            placeholder:
                "https://example.com/...",
            hint:
                "Masukkan URL atau link yang akan diterima pembeli."
        },

        paste: {
            icon:
                "fa-file-lines",
            placeholder:
                "Masukkan isi paste / delivery produk...",
            hint:
                "Isi paste akan disimpan sebagai delivery produk."
        },

        pastelink: {
            icon:
                "fa-link",
            placeholder:
                "Masukkan URL atau isi PasteLink...",
            hint:
                "Masukkan link atau content PasteLink."
        },

        code: {
            icon:
                "fa-code",
            placeholder:
                "Tempel source code / script di sini...",
            hint:
                "Masukkan source code atau script yang akan diberikan."
        },

        channel: {
            icon:
                "fa-broadcast-tower",
            placeholder:
                "https://t.me/username atau @username",
            hint:
                "Masukkan username, ID, atau link Channel Telegram."
        },

        group: {
            icon:
                "fa-users",
            placeholder:
                "https://t.me/username atau @username",
            hint:
                "Masukkan username, ID, atau link Group Telegram."
        }
    };

    /* =======================================================
       TELEGRAM TARGET
       ======================================================= */

    const isValidTelegramTarget =
        (value) => {
            const input =
                String(
                    value || ""
                ).trim();

            if (!input) {
                return false;
            }

            /*
             * @username
             */
            if (
                /^@[a-zA-Z0-9_]{5,32}$/.test(
                    input
                )
            ) {
                return true;
            }

            /*
             * username
             */
            if (
                /^[a-zA-Z0-9_]{5,32}$/.test(
                    input
                )
            ) {
                return true;
            }

            /*
             * Telegram numeric ID
             */
            if (
                /^-100\d{5,20}$/.test(
                    input
                )
            ) {
                return true;
            }

            try {
                const url =
                    new URL(
                        input
                    );

                if (
                    url.protocol !==
                        "https:" &&
                    url.protocol !==
                        "http:"
                ) {
                    return false;
                }

                const hostname =
                    url.hostname.toLowerCase();

                if (
                    hostname !==
                        "t.me" &&
                    hostname !==
                        "telegram.me" &&
                    hostname !==
                        "www.telegram.me"
                ) {
                    return false;
                }

                const path =
                    url.pathname
                        .replace(
                            /^\/+/,
                            ""
                        )
                        .replace(
                            /\/+$/,
                            ""
                        );

                const first =
                    path.split(
                        "/"
                    )[0];

                return (
                    /^[a-zA-Z0-9_]{5,32}$/.test(
                        first
                    )
                );
            } catch {
                return false;
            }
        };

    const extractTelegramUsername =
        (value) => {
            const input =
                String(
                    value || ""
                ).trim();

            if (
                /^@[a-zA-Z0-9_]{5,32}$/.test(
                    input
                )
            ) {
                return input;
            }

            if (
                /^[a-zA-Z0-9_]{5,32}$/.test(
                    input
                )
            ) {
                return (
                    "@" +
                    input
                );
            }

            try {
                const url =
                    new URL(
                        input
                    );

                const hostname =
                    url.hostname.toLowerCase();

                if (
                    hostname ===
                        "t.me" ||
                    hostname ===
                        "telegram.me" ||
                    hostname ===
                        "www.telegram.me"
                ) {
                    const username =
                        url.pathname
                            .replace(
                                /^\/+/,
                                ""
                            )
                            .split(
                                "/"
                            )[0];

                    if (
                        /^[a-zA-Z0-9_]{5,32}$/.test(
                            username
                        )
                    ) {
                        return (
                            "@" +
                            username
                        );
                    }
                }
            } catch {
                /* ignore */
            }

            return null;
        };

    /* =======================================================
       TYPE UI
       ======================================================= */

    const syncFeatureForm =
        () => {
            const selectedType =
                String(
                    type?.value ||
                        "pastelink"
                );

            const config =
                TYPE_CONFIG[
                    selectedType
                ] ||
                TYPE_CONFIG.pastelink;

            document.body.dataset.productType =
                selectedType;

            const icon =
                document.querySelector(
                    ".create-icon i"
                );

            if (icon) {
                icon.className =
                    `fa-solid ${config.icon}`;
            }

            if (content) {
                content.placeholder =
                    config.placeholder;
            }

            if (
                contentLabel
            ) {
                switch (
                    selectedType
                ) {
                    case "code":
                        contentLabel.textContent =
                            "Source Code / Delivery";
                        break;

                    case "channel":
                        contentLabel.textContent =
                            "Channel Telegram";
                        break;

                    case "group":
                        contentLabel.textContent =
                            "Group Telegram";
                        break;

                    case "pastelink":
                        contentLabel.textContent =
                            "PasteLink Content";
                        break;

                    case "link":
                        contentLabel.textContent =
                            "Product Link";
                        break;

                    case "paste":
                        contentLabel.textContent =
                            "Paste / Delivery";
                        break;

                    default:
                        contentLabel.textContent =
                            "Content / Delivery";
                }
            }

            if (
                contentHint
            ) {
                contentHint.textContent =
                    config.hint;
            }

            document.body.dataset.productAccess =
                String(
                    access?.value ||
                        "free"
                );
        };

    type?.addEventListener(
        "change",
        () => {
            clearInvalid(type);
            syncFeatureForm();
            syncPrice();
        }
    );

    /* =======================================================
       ACCESS / PRICE
       ======================================================= */

    const syncPrice =
        () => {
            if (
                !access ||
                !price
            ) {
                return;
            }

            const selectedType = String(type?.value || "").toLowerCase();
            const paidOption = access.querySelector('option[value="paid"]');
            const isPriceUnsupported = selectedType === "paste" || selectedType === "pastelink";

            if (paidOption) {
                paidOption.disabled = isPriceUnsupported;
            }

            if (isPriceUnsupported && access.value === "paid") {
                access.value = "free";
            }

            const isPaid = access.value === "paid" && !isPriceUnsupported;

            price.required = isPaid;

            if (!isPaid) {
                price.value =
                    "0";

                price.min =
                    "0";

                price.max =
                    "0";

                if (
                    priceHint
                ) {
                    priceHint.textContent =
                        "Produk Free tidak dikenakan biaya.";
                }

                return;
            }

            price.min =
                String(
                    MIN_PAID_PRICE
                );

            price.max =
                String(
                    MAX_PAID_PRICE
                );

            let current =
                Number(
                    price.value ||
                        0
                );

            if (
                !Number.isFinite(
                    current
                ) ||
                current <
                    MIN_PAID_PRICE
            ) {
                current =
                    MIN_PAID_PRICE;
            }

            if (
                current >
                    MAX_PAID_PRICE
            ) {
                current =
                    MAX_PAID_PRICE;
            }

            price.value =
                String(
                    Math.round(
                        current
                    )
                );

            if (
                priceHint
            ) {
                priceHint.textContent =
                    `Harga Paid ${formatRupiah(
                        MIN_PAID_PRICE
                    )} – ${formatRupiah(
                        MAX_PAID_PRICE
                    )}.`;
            }
        };

    access?.addEventListener(
        "change",
        () => {
            clearInvalid(
                access
            );

            syncPrice();
            syncFeatureForm();
        }
    );

    /* =======================================================
       AUTO SLUG
       ======================================================= */

    title?.addEventListener(
        "input",
        () => {
            clearInvalid(
                title
            );

            if (
                !slugManuallyEdited &&
                slug
            ) {
                slug.value =
                    normalizeSlug(
                        title.value
                    );

                clearInvalid(
                    slug
                );
            }
        }
    );

    slug?.addEventListener(
        "input",
        () => {
            slugManuallyEdited =
                true;

            const normalized =
                normalizeSlug(
                    slug.value
                );

            if (
                slug.value !==
                normalized
            ) {
                slug.value =
                    normalized;
            }

            clearInvalid(
                slug
            );
        }
    );

    /* =======================================================
       PRICE INPUT
       ======================================================= */

    price?.addEventListener(
        "input",
        () => {
            clearInvalid(
                price
            );

            if (
                access?.value !==
                "paid"
            ) {
                price.value =
                    "0";

                return;
            }

            let amount =
                Number(
                    price.value ||
                        0
                );

            if (
                !Number.isFinite(
                    amount
                )
            ) {
                return;
            }

            /*
             * Hard maximum.
             */
            if (
                amount >
                MAX_PAID_PRICE
            ) {
                price.value =
                    String(
                        MAX_PAID_PRICE
                    );

                return;
            }

            if (
                amount < 0
            ) {
                price.value =
                    "0";
            }

            if (
                !Number.isInteger(
                    amount
                )
            ) {
                amount =
                    Math.floor(
                        amount
                    );

                price.value =
                    String(
                        amount
                    );
            }
        }
    );

    /* =======================================================
       DESCRIPTION COUNTER
       ======================================================= */

    const updateDescriptionCounter =
        () => {
            if (
                !desc ||
                !descCounter
            ) {
                return;
            }

            descCounter.textContent =
                `${desc.value.length} / ${MAX_DESCRIPTION}`;
        };

    desc?.addEventListener(
        "input",
        updateDescriptionCounter
    );

    /* =======================================================
       THUMBNAIL
       ======================================================= */

    const hideThumbnailPreview =
        () => {
            if (
                !thumbPreview
            ) {
                return;
            }

            thumbPreview.hidden =
                true;

            thumbImage?.removeAttribute(
                "src"
            );
        };

    const showThumbnailPreview =
        (url) => {
            if (
                !thumbPreview ||
                !thumbImage
            ) {
                return;
            }

            thumbImage.src =
                url;

            thumbPreview.hidden =
                false;
        };

    thumb?.addEventListener(
        "input",
        () => {
            clearInvalid(
                thumb
            );

            const url =
                String(
                    thumb.value ||
                        ""
                ).trim();

            if (!url) {
                hideThumbnailPreview();
                return;
            }

            try {
                const parsed =
                    new URL(
                        url
                    );

                if (
                    parsed.protocol !==
                        "http:" &&
                    parsed.protocol !==
                        "https:"
                ) {
                    hideThumbnailPreview();
                    return;
                }

                showThumbnailPreview(
                    parsed.href
                );
            } catch {
                hideThumbnailPreview();
            }
        }
    );

    thumbImage?.addEventListener(
        "error",
        hideThumbnailPreview
    );

    /* =======================================================
       CLEAR INVALID
       ======================================================= */

    [
        title,
        slug,
        price,
        thumb,
        type,
        access,
        desc,
        content
    ].forEach(
        (element) => {
            if (!element) {
                return;
            }

            element.addEventListener(
                "input",
                () =>
                    clearInvalid(
                        element
                    )
            );

            element.addEventListener(
                "change",
                () =>
                    clearInvalid(
                        element
                    )
            );
        }
    );

    /* =======================================================
       VALIDATE
       ======================================================= */

    const validate =
        () => {
            const productTitle =
                String(
                    title?.value ||
                        ""
                ).trim();

            let productSlug =
                normalizeSlug(
                    slug?.value
                );

            const productType =
                String(
                    type?.value ||
                        ""
                ).trim();

            const productAccess =
                String(
                    access?.value ||
                        ""
                ).trim();

            const rawPrice =
                String(
                    price?.value ||
                        ""
                ).trim();

            const amount =
                rawPrice === ""
                    ? 0
                    : Number(
                        rawPrice
                    );

            const thumbnailUrl =
                String(
                    thumb?.value ||
                        ""
                ).trim();

            const description =
                String(
                    desc?.value ||
                        ""
                ).trim();

            const delivery =
                String(
                    content?.value ||
                        ""
                ).trim();

            /* =================================================
               TITLE
               ================================================= */

            if (
                !productTitle ||
                productTitle.length <
                    2
            ) {
                markInvalid(title);

                toast(
                    "Judul produk minimal 2 karakter.",
                    "error"
                );

                return null;
            }

            if (
                productTitle.length >
                MAX_TITLE
            ) {
                markInvalid(title);

                toast(
                    `Judul produk maksimal ${MAX_TITLE} karakter.`,
                    "error"
                );

                return null;
            }

            /* =================================================
               SLUG
               ================================================= */

            if (
                !productSlug
            ) {
                productSlug =
                    normalizeSlug(
                        productTitle
                    );
            }

            if (
                !productSlug
            ) {
                productSlug =
                    randomSlug(5);
            }

            if (
                productSlug.length <
                3
            ) {
                markInvalid(slug);

                toast(
                    "Slug minimal 3 karakter.",
                    "error"
                );

                return null;
            }

            if (
                !/^[a-z0-9-]+$/.test(
                    productSlug
                )
            ) {
                markInvalid(slug);

                toast(
                    "Slug hanya boleh berisi huruf kecil, angka, dan tanda -.",
                    "error"
                );

                return null;
            }

            if (slug) {
                slug.value =
                    productSlug;
            }

            /* =================================================
               TYPE
               ================================================= */

            if (
                !VALID_TYPES.includes(
                    productType
                )
            ) {
                markInvalid(type);

                toast(
                    "Tipe produk tidak valid.",
                    "error"
                );

                return null;
            }

            /* =================================================
               ACCESS
               ================================================= */

            if (
                !VALID_ACCESS.includes(
                    productAccess
                )
            ) {
                markInvalid(access);

                toast(
                    "Pilih Free atau Paid.",
                    "error"
                );

                return null;
            }

            /*
             * SQL FINAL: public.pastes and public.pastelinks do not
             * contain a price column and are not supported by the
             * checkout RPC as paid marketplace items. Keep them Free
             * here instead of writing data the database cannot settle.
             */
            if (
                (productType === "paste" || productType === "pastelink") &&
                productAccess === "paid"
            ) {
                markInvalid(access);
                toast(
                    productType === "pastelink"
                        ? "PasteLink pada database ini hanya mendukung Free (Rp0)."
                        : "Paste pada database ini hanya mendukung Free (Rp0).",
                    "error"
                );
                return null;
            }

            /* =================================================
               PRICE
               ================================================= */

            if (
                !Number.isFinite(
                    amount
                ) ||
                amount < 0
            ) {
                markInvalid(price);

                toast(
                    "Harga produk tidak valid.",
                    "error"
                );

                return null;
            }

            /*
             * FREE
             * -------------------------------------------------
             * Always Rp0.
             */
            if (
                productAccess ===
                "free"
            ) {
                if (price) {
                    price.value =
                        "0";
                }
            }

            /*
             * PAID MINIMUM
             */
            if (
                productAccess ===
                    "paid" &&
                amount <
                    MIN_PAID_PRICE
            ) {
                markInvalid(price);

                toast(
                    `Produk Paid minimal ${formatRupiah(
                        MIN_PAID_PRICE
                    )}.`,
                    "error"
                );

                return null;
            }

            /*
             * PAID MAXIMUM
             */
            if (
                productAccess ===
                    "paid" &&
                amount % 1000 !== 0
            ) {
                markInvalid(price);

                toast(
                    "Harga Paid harus kelipatan Rp1.000.",
                    "error"
                );

                return null;
            }

            if (
                productAccess ===
                    "paid" &&
                amount >
                    MAX_PAID_PRICE
            ) {
                markInvalid(price);

                toast(
                    `Produk Paid maksimal ${formatRupiah(
                        MAX_PAID_PRICE
                    )}.`,
                    "error"
                );

                return null;
            }

            /* =================================================
               THUMBNAIL
               ================================================= */

            if (
                thumbnailUrl
            ) {
                try {
                    const parsed =
                        new URL(
                            thumbnailUrl
                        );

                    if (
                        parsed.protocol !==
                            "http:" &&
                        parsed.protocol !==
                            "https:"
                    ) {
                        throw new Error();
                    }
                } catch {
                    markInvalid(thumb);

                    toast(
                        "URL thumbnail tidak valid.",
                        "error"
                    );

                    return null;
                }
            }

            /* =================================================
               DESCRIPTION
               ================================================= */

            if (
                description.length >
                MAX_DESCRIPTION
            ) {
                markInvalid(desc);

                toast(
                    `Deskripsi maksimal ${MAX_DESCRIPTION} karakter.`,
                    "error"
                );

                return null;
            }

            /* =================================================
               CONTENT
               ================================================= */

            if (!delivery) {
                markInvalid(content);

                toast(
                    "Content / delivery produk wajib diisi.",
                    "error"
                );

                return null;
            }

            if (
                delivery.length >
                MAX_CONTENT
            ) {
                markInvalid(content);

                toast(
                    "Content / delivery terlalu panjang.",
                    "error"
                );

                return null;
            }

            /* =================================================
               TELEGRAM
               ================================================= */

            if (
                productType ===
                    "channel" ||
                productType ===
                    "group"
            ) {
                if (
                    !isValidTelegramTarget(
                        delivery
                    )
                ) {
                    markInvalid(content);

                    toast(
                        "Masukkan username, ID, atau link Telegram yang valid.",
                        "error"
                    );

                    return null;
                }
            }

            /* =================================================
               FINAL PRODUCT
               ================================================= */

            return {
                title:
                    productTitle,

                slug:
                    productSlug,

                price:
                    productAccess ===
                        "free"
                        ? 0
                        : Math.round(
                            amount
                        ),

                thumbnail_url:
                    thumbnailUrl ||
                    null,

                type:
                    productType,

                access_type:
                    productAccess,

                category:
                    "General",

                description:
                    description,

                content:
                    delivery,

                status:
                    "published"
            };
        };

    /* =======================================================
       PUBLIC URL
       ======================================================= */

    const buildPublicUrl =
        (product) => {
            const origin =
                window.location.origin;

            const accessPrefix =
                product.access_type ===
                    "paid"
                    ? "p"
                    : "f";

            const encodedSlug =
                encodeURIComponent(
                    product.slug
                );

            switch (
                product.type
            ) {
                case "code":
                    return (
                        `${origin}/c/` +
                        `${accessPrefix}/` +
                        encodedSlug
                    );

                case "channel":
                    return (
                        `${origin}/ch/` +
                        `${accessPrefix}/` +
                        encodedSlug
                    );

                case "group":
                    return (
                        `${origin}/g/` +
                        `${accessPrefix}/` +
                        encodedSlug
                    );

                case "pastelink":
                    return `${origin}/p/${encodedSlug}`;

                case "paste":
                    return (
                        `${origin}/product.html?type=paste&slug=` +
                        encodedSlug
                    );

                default:
                    return (
                        `${origin}/product.html?type=` +
                        encodeURIComponent(product.type) +
                        `&slug=` +
                        encodedSlug
                    );
            }
        };

    /* =======================================================
       SUCCESS MODAL STYLE
       ======================================================= */

    const injectPublishModalStyle =
        () => {
            if (
                document.getElementById(
                    "pastelePublishModalStyle"
                )
            ) {
                return;
            }

            const style =
                document.createElement(
                    "style"
                );

            style.id =
                "pastelePublishModalStyle";

            style.textContent = `
                .pastele-publish-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding:
                        max(20px, env(safe-area-inset-top))
                        max(20px, env(safe-area-inset-right))
                        max(20px, env(safe-area-inset-bottom))
                        max(20px, env(safe-area-inset-left));
                    box-sizing: border-box;
                }

                .pastele-publish-modal[hidden] {
                    display: none !important;
                }

                .pastele-publish-backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(5, 12, 22, .60);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                }

                .pastele-publish-dialog {
                    position: relative;
                    width: min(100%, 510px);
                    max-height:
                        min(
                            720px,
                            calc(100dvh - 32px)
                        );
                    overflow-y: auto;
                    border-radius: 26px;
                    padding: 30px;
                    box-sizing: border-box;

                    background:
                        var(
                            --card,
                            #ffffff
                        );

                    color:
                        var(
                            --text,
                            #111827
                        );

                    border:
                        1px solid
                        rgba(
                            127,
                            127,
                            127,
                            .16
                        );

                    box-shadow:
                        0 30px 90px
                        rgba(
                            0,
                            0,
                            0,
                            .28
                        ),
                        0 8px 30px
                        rgba(
                            0,
                            0,
                            0,
                            .12
                        );

                    animation:
                        pastelePublishIn
                        .22s
                        ease-out;
                }

                @keyframes pastelePublishIn {
                    from {
                        opacity: 0;
                        transform:
                            translateY(16px)
                            scale(.98);
                    }

                    to {
                        opacity: 1;
                        transform:
                            translateY(0)
                            scale(1);
                    }
                }

                .pastele-publish-close {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    width: 40px;
                    height: 40px;
                    border: 0;
                    border-radius: 50%;
                    display: grid;
                    place-items: center;
                    cursor: pointer;

                    background:
                        rgba(
                            127,
                            127,
                            127,
                            .10
                        );

                    color: inherit;
                    font-size: 16px;
                }

                .pastele-publish-close:hover {
                    background:
                        rgba(
                            127,
                            127,
                            127,
                            .17
                        );
                }

                .pastele-publish-success-icon {
                    width: 68px;
                    height: 68px;
                    border-radius: 21px;
                    display: grid;
                    place-items: center;
                    margin-bottom: 18px;

                    background:
                        rgba(
                            34,
                            197,
                            94,
                            .12
                        );

                    color:
                        #16a34a;

                    font-size: 29px;
                }

                .pastele-publish-kicker {
                    display: block;
                    margin-bottom: 7px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: .13em;
                    text-transform: uppercase;
                    opacity: .56;
                }

                .pastele-publish-title {
                    margin: 0;
                    padding-right: 38px;
                    font-size: 25px;
                    line-height: 1.22;
                    font-weight: 800;
                }

                .pastele-publish-text {
                    margin:
                        9px 0 20px;
                    line-height: 1.55;
                    opacity: .68;
                }

                .pastele-publish-link-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px;
                    border-radius: 16px;

                    background:
                        rgba(
                            127,
                            127,
                            127,
                            .075
                        );

                    border:
                        1px solid
                        rgba(
                            127,
                            127,
                            127,
                            .13
                        );
                }

                .pastele-publish-link {
                    flex: 1;
                    min-width: 0;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    color: inherit;
                    font-size: 14px;
                    line-height: 1.45;
                    font-family: inherit;
                    word-break: break-all;
                }

                .pastele-publish-copy-small {
                    flex: 0 0 auto;
                    border: 0;
                    border-radius: 11px;
                    padding: 10px 12px;
                    cursor: pointer;

                    background:
                        rgba(
                            127,
                            127,
                            127,
                            .13
                        );

                    color: inherit;
                    font-weight: 700;
                }

                .pastele-publish-actions {
                    display: grid;
                    grid-template-columns:
                        1fr 1fr;
                    gap: 10px;
                    margin-top: 14px;
                }

                .pastele-publish-action {
                    min-height: 49px;
                    border: 0;
                    border-radius: 14px;
                    padding: 12px 14px;

                    display:
                        inline-flex;

                    align-items: center;
                    justify-content: center;
                    gap: 9px;

                    cursor: pointer;
                    font: inherit;
                    font-weight: 750;
                    text-decoration: none;
                    box-sizing: border-box;

                    transition:
                        transform .15s ease,
                        filter .15s ease;
                }

                .pastele-publish-action:hover {
                    filter: brightness(.98);
                }

                .pastele-publish-action:active {
                    transform:
                        translateY(1px);
                }

                .pastele-publish-action-primary {
                    grid-column:
                        1 / -1;

                    background:
                        #2563eb;

                    color: #ffffff;

                    box-shadow:
                        0 8px 22px
                        rgba(
                            37,
                            99,
                            235,
                            .23
                        );
                }

                .pastele-publish-action-secondary {
                    background:
                        rgba(
                            127,
                            127,
                            127,
                            .10
                        );

                    color: inherit;

                    border:
                        1px solid
                        rgba(
                            127,
                            127,
                            127,
                            .14
                        );
                }

                .pastele-publish-meta {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 7px;
                    margin-top: 16px;
                    font-size: 12px;
                    opacity: .55;
                }

                .pastele-publish-meta i {
                    color:
                        #16a34a;
                }

                @media (max-width: 520px) {

                    .pastele-publish-modal {
                        align-items: flex-end;
                        padding: 12px;
                    }

                    .pastele-publish-dialog {
                        width: 100%;
                        border-radius: 25px;
                        padding:
                            25px 18px 18px;

                        max-height:
                            calc(
                                100dvh - 24px
                            );
                    }

                    .pastele-publish-actions {
                        grid-template-columns:
                            1fr;
                    }

                    .pastele-publish-action-primary {
                        grid-column: auto;
                    }

                    .pastele-publish-link-box {
                        align-items:
                            stretch;
                    }

                    .pastele-publish-copy-small {
                        padding-inline:
                            11px;
                    }

                    .pastele-publish-title {
                        font-size: 23px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .pastele-publish-dialog {
                        animation: none;
                    }

                    .pastele-publish-action {
                        transition: none;
                    }
                }

                html.dark .pastele-publish-dialog,
                [data-theme="dark"] .pastele-publish-dialog {
                    background:
                        var(
                            --card,
                            #111827
                        );

                    color:
                        var(
                            --text,
                            #f8fafc
                        );
                }
            `;

            document.head.appendChild(
                style
            );
        };

    /* =======================================================
       SUCCESS MODAL
       ======================================================= */

    let publishModal = null;
    let lastPublicUrl = "";
    let lastPublishedProduct = null;

    const createPublishModal =
        () => {
            if (
                publishModal
            ) {
                return publishModal;
            }

            injectPublishModalStyle();

            const modal =
                document.createElement(
                    "div"
                );

            modal.className =
                "pastele-publish-modal";

            modal.id =
                "pastelePublishModal";

            modal.hidden =
                true;

            modal.setAttribute(
                "aria-hidden",
                "true"
            );

            modal.innerHTML = `
                <div
                    class="pastele-publish-backdrop"
                    data-publish-close
                ></div>

                <div
                    class="pastele-publish-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pastelePublishTitle"
                >

                    <button
                        type="button"
                        class="pastele-publish-close"
                        id="pastelePublishClose"
                        aria-label="Tutup"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                    <div
                        class="pastele-publish-success-icon"
                        aria-hidden="true"
                    >
                        <i class="fa-solid fa-check"></i>
                    </div>

                    <span class="pastele-publish-kicker">
                        PUBLISH BERHASIL
                    </span>

                    <h2
                        class="pastele-publish-title"
                        id="pastelePublishTitle"
                    >
                        Produk berhasil dipublikasikan
                    </h2>

                    <p
                        class="pastele-publish-text"
                        id="pastelePublishText"
                    >
                        Produk kamu sudah tersedia.
                    </p>

                    <div
                        class="pastele-publish-link-box"
                    >

                        <input
                            type="text"
                            class="pastele-publish-link"
                            id="pastelePublishLink"
                            readonly
                            aria-label="Link publik"
                        >

                        <button
                            type="button"
                            class="pastele-publish-copy-small"
                            id="pastelePublishCopy"
                        >
                            <i
                                class="fa-regular fa-copy"
                            ></i>

                            <span>
                                Salin
                            </span>
                        </button>

                    </div>

                    <div
                        class="pastele-publish-actions"
                    >

                        <button
                            type="button"
                            class="
                                pastele-publish-action
                                pastele-publish-action-primary
                            "
                            id="pastelePublishOpen"
                        >
                            <i
                                class="
                                    fa-solid
                                    fa-arrow-up-right-from-square
                                "
                            ></i>

                            <span>
                                Buka Link
                            </span>
                        </button>

                        <button
                            type="button"
                            class="
                                pastele-publish-action
                                pastele-publish-action-secondary
                            "
                            id="pastelePublishShare"
                        >
                            <i
                                class="
                                    fa-solid
                                    fa-share-nodes
                                "
                            ></i>

                            <span>
                                Share
                            </span>
                        </button>

                        <button
                            type="button"
                            class="
                                pastele-publish-action
                                pastele-publish-action-secondary
                            "
                            id="pastelePublishCopyLarge"
                        >
                            <i
                                class="
                                    fa-regular
                                    fa-copy
                                "
                            ></i>

                            <span>
                                Salin Link
                            </span>
                        </button>

                    </div>

                    <div
                        class="pastele-publish-meta"
                    >
                        <i
                            class="
                                fa-solid
                                fa-shield-halved
                            "
                        ></i>

                        <span>
                            Link publik siap dibagikan.
                        </span>
                    </div>

                </div>
            `;

            document.body.appendChild(
                modal
            );

            publishModal =
                modal;

            return modal;
        };

    /* =======================================================
       COPY
       ======================================================= */

    const copyText =
        async (
            text
        ) => {
            const value =
                String(
                    text || ""
                );

            if (!value) {
                return false;
            }

            try {
                if (
                    navigator.clipboard &&
                    window.isSecureContext
                ) {
                    await navigator.clipboard.writeText(
                        value
                    );

                    return true;
                }
            } catch {
                /* fallback */
            }

            try {
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

                const success =
                    document.execCommand(
                        "copy"
                    );

                textarea.remove();

                return success;
            } catch {
                return false;
            }
        };

    /* =======================================================
       CLOSE PUBLISH MODAL
       ======================================================= */

    const closePublishModal =
        () => {
            if (
                !publishModal
            ) {
                return;
            }

            publishModal.hidden =
                true;

            publishModal.setAttribute(
                "aria-hidden",
                "true"
            );

            document.body.classList.remove(
                "publish-modal-open"
            );
        };

    /* =======================================================
       SHOW PUBLISH MODAL
       ======================================================= */

    const showPublishModal =
        (
            product,
            publicUrl
        ) => {
            const modal =
                createPublishModal();

            lastPublicUrl =
                publicUrl;

            lastPublishedProduct =
                product;

            const linkInput =
                modal.querySelector(
                    "#pastelePublishLink"
                );

            const titleElement =
                modal.querySelector(
                    "#pastelePublishTitle"
                );

            const textElement =
                modal.querySelector(
                    "#pastelePublishText"
                );

            if (
                linkInput
            ) {
                linkInput.value =
                    publicUrl;
            }

            if (
                titleElement
            ) {
                titleElement.textContent =
                    "Produk berhasil dipublikasikan";
            }

            if (
                textElement
            ) {
                const accessText =
                    product.access_type ===
                        "paid"
                        ? "Paid"
                        : "Free";

                const typeText =
                    product.type ===
                        "group"
                        ? "Group"
                        : product.type ===
                          "channel"
                        ? "Channel"
                        : product.type ===
                          "code"
                        ? "Code"
                        : product.type ===
                          "pastelink"
                        ? "PasteLink"
                        : product.type ===
                          "paste"
                        ? "Paste"
                        : "Link";

                textElement.textContent =
                    `${typeText} ${accessText} berhasil dipublikasikan. Link publik kamu sudah siap dibagikan.`;
            }

            modal.hidden =
                false;

            modal.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "publish-modal-open"
            );

            requestAnimationFrame(
                () => {
                    linkInput?.focus?.();
                    linkInput?.select?.();
                }
            );
        };

    /* =======================================================
       PUBLISH MODAL EVENTS
       ======================================================= */

    const publishModalInit =
        () => {
            const modal =
                createPublishModal();

            const closeBtn =
                modal.querySelector(
                    "#pastelePublishClose"
                );

            const copyBtn =
                modal.querySelector(
                    "#pastelePublishCopy"
                );

            const copyLargeBtn =
                modal.querySelector(
                    "#pastelePublishCopyLarge"
                );

            const shareBtn =
                modal.querySelector(
                    "#pastelePublishShare"
                );

            const openBtn =
                modal.querySelector(
                    "#pastelePublishOpen"
                );

            const linkInput =
                modal.querySelector(
                    "#pastelePublishLink"
                );

            closeBtn?.addEventListener(
                "click",
                closePublishModal
            );

            modal.addEventListener(
                "click",
                (event) => {
                    if (
                        event.target?.matches?.(
                            "[data-publish-close]"
                        )
                    ) {
                        closePublishModal();
                    }
                }
            );

            const handleCopy =
                async (
                    button
                ) => {
                    const success =
                        await copyText(
                            lastPublicUrl
                        );

                    if (!success) {
                        toast(
                            "Gagal menyalin link. Tekan lama link untuk menyalinnya.",
                            "error"
                        );

                        return;
                    }

                    const oldHTML =
                        button.innerHTML;

                    button.innerHTML = `
                        <i
                            class="fa-solid fa-check"
                        ></i>

                        <span>
                            Tersalin
                        </span>
                    `;

                    toast(
                        "Link berhasil disalin.",
                        "success"
                    );

                    setTimeout(
                        () => {
                            button.innerHTML =
                                oldHTML;
                        },
                        1400
                    );
                };

            copyBtn?.addEventListener(
                "click",
                () =>
                    handleCopy(
                        copyBtn
                    )
            );

            copyLargeBtn?.addEventListener(
                "click",
                () =>
                    handleCopy(
                        copyLargeBtn
                    )
            );

            shareBtn?.addEventListener(
                "click",
                async () => {
                    if (
                        !lastPublicUrl
                    ) {
                        return;
                    }

                    const shareData = {
                        title:
                            lastPublishedProduct?.title ||
                            "Produk PasTele",

                        text:
                            `Lihat ${
                                lastPublishedProduct?.title ||
                                "produk ini"
                            } di PasTele.`,

                        url:
                            lastPublicUrl
                    };

                    if (
                        typeof navigator.share ===
                        "function"
                    ) {
                        try {
                            await navigator.share(
                                shareData
                            );

                            return;
                        } catch (
                            error
                        ) {
                            if (
                                error?.name ===
                                "AbortError"
                            ) {
                                return;
                            }

                            console.warn(
                                "[PasTele] Native share failed:",
                                error
                            );
                        }
                    }

                    const success =
                        await copyText(
                            lastPublicUrl
                        );

                    if (
                        success
                    ) {
                        toast(
                            "Share tidak tersedia. Link berhasil disalin.",
                            "success"
                        );
                    } else {
                        toast(
                            "Tidak dapat membuka Share atau menyalin link.",
                            "error"
                        );
                    }
                }
            );

            openBtn?.addEventListener(
                "click",
                () => {
                    if (
                        !lastPublicUrl
                    ) {
                        return;
                    }

                    window.location.href =
                        lastPublicUrl;
                }
            );

            linkInput?.addEventListener(
                "click",
                () => {
                    linkInput.select();
                }
            );
        };

    publishModalInit();

    /* =======================================================
       GLOBAL ESC FOR PUBLISH MODAL
       ======================================================= */

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                !publishModal ||
                publishModal.hidden
            ) {
                return;
            }

            if (
                event.key ===
                "Escape"
            ) {
                event.preventDefault();

                closePublishModal();
            }
        }
    );

    /* =======================================================
       RESET FORM
       ======================================================= */

    const resetForm =
        () => {
            form?.reset();

            if (type) {
                type.value =
                    "pastelink";
            }

            if (access) {
                access.value =
                    "free";
            }

            if (price) {
                price.value =
                    "0";
            }

            slugManuallyEdited =
                false;

            syncFeatureForm();
            syncPrice();
            updateDescriptionCounter();
            hideThumbnailPreview();

            [
                title,
                slug,
                price,
                thumb,
                type,
                access,
                desc,
                content
            ].forEach(
                clearInvalid
            );
        };

    /* =======================================================
       PASTELINK INSERT
       SQL TABLE: public.pastelinks
       ======================================================= */

    const insertPasteLink = async (sb, user, product) => {
        const payload = {
            user_id: user.id,
            slug: product.slug,
            title: product.title,
            content_html: product.content,
            visibility: "public",
            password_hash: null,
            expires_at: null,
            description: product.description || "",
            tags: [],
            allow_comments: true,
            allow_download: true,
            show_raw: true,
            anonymous: false
        };
        const { error } = await sb.from("pastelinks").insert(payload);
        if (error) throw error;
        return { id: true, slug: product.slug, title: product.title, type: "pastelink", access_type: "free", price: 0 };
    };

    /* =======================================================
       PASTE INSERT
       SQL TABLE: public.pastes
       ======================================================= */

    const insertPaste = async (sb, user, product) => {
        const payload = {
            owner_id: user.id,
            title: product.title,
            slug: product.slug,
            content: product.content,
            visibility: "public",
            password: null
        };
        const { error } = await sb.from("pastes").insert(payload);
        if (error) throw error;
        return { id: true, slug: product.slug, title: product.title, type: "paste", access_type: "free", price: 0 };
    };

    /* =======================================================
       GENERIC PRODUCT INSERT
       ======================================================= */

    const insertGenericProduct =
        async (
            sb,
            user,
            product
        ) => {
            const payload = {
                seller_id:
                    user.id,

                creator_id:
                    user.id,

                title:
                    product.title,

                slug:
                    product.slug,

                price:
                    product.price,

                thumbnail_url:
                    product.thumbnail_url,

                type:
                    product.type,

                access_type:
                    product.access_type,

                category:
                    product.category,

                description:
                    product.description,

                content:
                    product.content,

                status:
                    "published"
            };

            /*
             * Do NOT use SELECT after INSERT.
             *
             * This avoids failure when
             * INSERT policy exists but
             * SELECT policy is restricted.
             */
            const {
                error
            } =
                await sb
                    .from(
                        "products"
                    )
                    .insert(
                        payload
                    );

            if (error) {
                throw error;
            }

            return {
                id:
                    true,

                slug:
                    product.slug,

                title:
                    product.title,

                type:
                    product.type,

                access_type:
                    product.access_type,

                price:
                    product.price,

                status:
                    "published"
            };
        };

    /* =======================================================
       TELEGRAM CODE INSERT
       ======================================================= */

    const insertTelegramCode =
        async (
            sb,
            user,
            product
        ) => {
            const payload = {
                owner_id:
                    user.id,

                title:
                    product.title,

                slug:
                    product.slug,

                type:
                    "code",

                product_type:
                    "code",

                access_type:
                    product.access_type,

                /*
                 * No bot selector exists
                 * on this create page.
                 *
                 * Therefore do not
                 * invent bot data.
                 */
                bot_username:
                    null,

                telegram_bot_id:
                    null,

                price:
                    product.price,

                description:
                    product.description,

                content:
                    product.content,

                thumbnail_url:
                    product.thumbnail_url,

                category:
                    product.category,

                status:
                    "published"
            };

            const {
                error
            } =
                await sb
                    .from(
                        "telegram_products"
                    )
                    .insert(
                        payload
                    );

            if (error) {
                throw error;
            }

            return {
                id:
                    true,

                slug:
                    product.slug,

                title:
                    product.title,

                type:
                    "code",

                product_type:
                    "code",

                access_type:
                    product.access_type,

                price:
                    product.price,

                status:
                    "published"
            };
        };

    /* =======================================================
       TELEGRAM CHANNEL / GROUP INSERT
       ======================================================= */

    const insertTelegramChannel =
        async (
            sb,
            user,
            product
        ) => {
            const username =
                extractTelegramUsername(
                    product.content
                );

            const payload = {
                owner_id:
                    user.id,

                /*
                 * REQUIRED FOR PUBLIC URL
                 */
                slug:
                    product.slug,

                username:
                    username,

                name:
                    product.title,

                type:
                    product.type ===
                        "group"
                        ? "group"
                        : "channel",

                access_type:
                    product.access_type,

                telegram_channel_id:
                    product.content,

                description:
                    product.description,

                invite_url:
                    null,

                price:
                    product.price,

                category:
                    product.category,

                status:
                    "published"
            };

            const {
                error
            } =
                await sb
                    .from(
                        "telegram_channels"
                    )
                    .insert(
                        payload
                    );

            if (error) {
                throw error;
            }

            return {
                id:
                    true,

                slug:
                    product.slug,

                name:
                    product.title,

                title:
                    product.title,

                type:
                    product.type,

                access_type:
                    product.access_type,

                price:
                    product.price,

                status:
                    "published"
            };
        };

    /* =======================================================
       SUBMIT
       ======================================================= */

    form?.addEventListener(
        "submit",
        async (
            event
        ) => {
            event.preventDefault();

            if (
                submitting
            ) {
                return;
            }

            /* -----------------------------------------------
               VALIDATE
               ----------------------------------------------- */

            const product =
                validate();

            if (!product) {
                return;
            }

            /* -----------------------------------------------
               AUTH
               ----------------------------------------------- */

            const user =
                await requireAuthenticated();

            if (
                !user?.id
            ) {
                return;
            }

            setSubmitting(
                true
            );

            try {
                const sb =
                    getSupabase();

                let created =
                    null;

                /* =========================================
                   CODE
                   ========================================= */

                if (
                    product.type ===
                    "code"
                ) {
                    created =
                        await insertTelegramCode(
                            sb,
                            user,
                            product
                        );
                }

                /* =========================================
                   CHANNEL / GROUP
                   ========================================= */

                else if (
                    product.type ===
                        "channel" ||
                    product.type ===
                        "group"
                ) {
                    created =
                        await insertTelegramChannel(
                            sb,
                            user,
                            product
                        );
                }

                /* =========================================
                   PASTELINK / PASTE
                   ========================================= */

                else if (product.type === "pastelink") {
                    created = await insertPasteLink(sb, user, product);
                }

                else if (product.type === "paste") {
                    created = await insertPaste(sb, user, product);
                }

                /* =========================================
                   GENERIC LINK / MARKETPLACE PRODUCT
                   ========================================= */

                else {
                    created = await insertGenericProduct(sb, user, product);
                }

                /* =========================================
                   BUILD PUBLISHED PRODUCT
                   ========================================= */

                if (
                    !created
                ) {
                    throw new Error(
                        "Database tidak mengembalikan hasil publish."
                    );
                }

                const finalSlug =
                    created.slug ||
                    product.slug;

                if (
                    !finalSlug
                ) {
                    throw new Error(
                        "Produk tersimpan tetapi slug publik tidak ditemukan."
                    );
                }

                const publishedProduct =
                    {
                        ...product,

                        slug:
                            finalSlug,

                        title:
                            created.title ||
                            created.name ||
                            product.title,

                        type:
                            created.type ||
                            product.type,

                        access_type:
                            created.access_type ||
                            product.access_type,

                        price:
                            Number.isFinite(
                                Number(
                                    created.price
                                )
                            )
                                ? Number(
                                    created.price
                                )
                                : product.price
                    };

                const publicUrl =
                    buildPublicUrl(
                        publishedProduct
                    );

                console.log(
                    "[PasTele] Product published:",
                    {
                        type:
                            publishedProduct.type,

                        access_type:
                            publishedProduct.access_type,

                        price:
                            publishedProduct.price,

                        slug:
                            publishedProduct.slug,

                        publicUrl
                    }
                );

                /* =========================================
                   SUCCESS TOAST
                   ========================================= */

                toast(
                    publishedProduct.access_type ===
                        "paid"
                        ? "Produk Paid berhasil dipublikasikan."
                        : "Produk Free berhasil dipublikasikan.",
                    "success"
                );

                /* =========================================
                   RESET
                   ========================================= */

                resetForm();

                /* =========================================
                   SHOW PUBLIC LINK
                   ========================================= */

                showPublishModal(
                    publishedProduct,
                    publicUrl
                );
            } catch (
                error
            ) {
                console.error(
                    "[PasTele] Create product error:",
                    error
                );

                const code =
                    String(
                        error?.code ||
                            ""
                    );

                const message =
                    String(
                        error?.message ||
                            ""
                    );

                const details =
                    String(
                        error?.details ||
                            ""
                    );

                const hint =
                    String(
                        error?.hint ||
                            ""
                    );

                console.error(
                    "[PasTele] Database details:",
                    {
                        code,
                        message,
                        details,
                        hint
                    }
                );

                /* -------------------------------------------
                   DUPLICATE
                   ------------------------------------------- */

                if (
                    code ===
                    "23505"
                ) {
                    markInvalid(
                        slug
                    );

                    toast(
                        "Slug sudah digunakan. Silakan gunakan slug lain.",
                        "error"
                    );

                    return;
                }

                /* -------------------------------------------
                   FOREIGN KEY
                   ------------------------------------------- */

                if (
                    code ===
                    "23503"
                ) {
                    toast(
                        "Akun atau relasi database tidak valid. Silakan login ulang.",
                        "error"
                    );

                    return;
                }

                /* -------------------------------------------
                   CHECK
                   ------------------------------------------- */

                if (
                    code ===
                    "23514"
                ) {
                    toast(
                        "Data ditolak database. Pastikan Paid Rp5.000–Rp150.000 dan tipe produk sesuai.",
                        "error"
                    );

                    return;
                }

                /* -------------------------------------------
                   RLS
                   ------------------------------------------- */

                if (
                    code ===
                        "42501" ||
                    /row-level security|permission denied|not authorized/i.test(
                        message
                    )
                ) {
                    toast(
                        "Kamu tidak memiliki izin membuat produk. Silakan login ulang.",
                        "error"
                    );

                    return;
                }

                /* -------------------------------------------
                   INVALID DATA
                   ------------------------------------------- */

                if (
                    /violates|invalid|constraint|not-null|null value/i.test(
                        message
                    )
                ) {
                    toast(
                        message ||
                            "Data produk tidak sesuai aturan database.",
                        "error"
                    );

                    return;
                }

                /* -------------------------------------------
                   UNKNOWN
                   ------------------------------------------- */

                toast(
                    message ||
                        "Terjadi kesalahan saat mempublikasikan produk.",
                    "error"
                );
            } finally {
                setSubmitting(
                    false
                );
            }
        }
    );

    /* =======================================================
       INITIAL STATE
       ======================================================= */

    syncFeatureForm();
    syncPrice();
    updateDescriptionCounter();
    hideThumbnailPreview();

    console.log(
        "[PasTele] Create Product initialized — FINAL FREE/PAID Rp5K-Rp150K + PUBLIC LINK."
    );
});
