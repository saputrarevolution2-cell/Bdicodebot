document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    /* =========================================================
       PasTele — PRODUCT
       PUBLIC PRODUCT DETAIL
       LIKE + COMMENT FOR EVERYONE
       PAID CHECKOUT + CASHI QRIS
       ========================================================= */

    const qs = new URLSearchParams(window.location.search);

    const initialId = qs.get("id");
    const slug = qs.get("slug");
    const type = normalizeType(qs.get("type") || "link");

    const box = document.getElementById("content");

    const likeBtn = document.getElementById("productLikeBtn");
    const likeIcon = document.getElementById("productLikeIcon");
    const likeLabel = document.getElementById("productLikeLabel");
    const likeCount = document.getElementById("productLikeCount");

    const commentCount = document.getElementById("productCommentCount");
    const commentForm = document.getElementById("productCommentForm");
    const commentName = document.getElementById("commentName");
    const commentText = document.getElementById("commentText");
    const commentCharCount = document.getElementById("commentCharCount");
    const commentSubmit = document.getElementById("productCommentSubmit");
    const commentList = document.getElementById("productCommentList");
    const commentsLoading = document.getElementById("productCommentsLoading");

    const sbClient = window.sb;

    let productId = initialId || null;
    let product = null;

    /* =========================================================
       HELPERS
       ========================================================= */

    const esc = (value) => {
        const v = String(value ?? "");

        if (window.TC?.esc) {
            return window.TC.esc(v);
        }

        return v.replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));
    };

    const toast = (message, type = "info") => {
        if (window.TC?.toast) {
            window.TC.toast(message, type);
            return;
        }

        const toastBox = document.getElementById("toast");

        if (!toastBox) {
            alert(message);
            return;
        }

        toastBox.textContent = message;
        toastBox.className = `show ${type}`;

        window.clearTimeout(toastBox.__timer);

        toastBox.__timer = window.setTimeout(() => {
            toastBox.className = "";
        }, 3000);
    };

    const money = (value) => {
        const amount = Number(value || 0);

        if (window.TC?.money) {
            return window.TC.money(amount);
        }

        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(amount);
    };

    const normalizeType = (value) => {
        const t = String(value || "link")
            .trim()
            .toLowerCase();

        if (
            t === "paste" ||
            t === "pastelink" ||
            t === "paste-link" ||
            t === "paste_link"
        ) {
            return "link";
        }

        if (t === "telegram_channel") {
            return "channel";
        }

        if (t === "telegram_group") {
            return "group";
        }

        return t;
    };

    const getIcon = (t) => {
        if (t === "code") {
            return "fa-solid fa-code";
        }

        if (t === "channel") {
            return "fa-brands fa-telegram";
        }

        if (t === "group") {
            return "fa-brands fa-telegram";
        }

        return "fa-solid fa-link";
    };

    const formatNumber = (value) => {
        return Number(value || 0).toLocaleString("id-ID");
    };

    const formatDate = (value) => {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    };

    /* =========================================================
       URL HELPERS
       ========================================================= */

    const safeUrl = (value) => {
        let s = String(value || "").trim();

        if (!s) {
            return "";
        }

        if (/^www\./i.test(s)) {
            s = "https://" + s;
        }

        if (/^https?:\/\//i.test(s)) {
            try {
                const url = new URL(s);

                if (
                    url.protocol !== "http:" &&
                    url.protocol !== "https:"
                ) {
                    return "";
                }

                return url.href;
            } catch {
                return "";
            }
        }

        if (/^t\.me\//i.test(s)) {
            return "https://" + s;
        }

        if (/^@[\w\d_]{3,}$/i.test(s)) {
            return "https://t.me/" + s.slice(1);
        }

        return "";
    };

    const telegramUrl = (value) => {
        const url = safeUrl(value);

        if (
            url &&
            /(?:t\.me|telegram\.me)/i.test(url)
        ) {
            return url;
        }

        return "";
    };

    /* =========================================================
       HTML / CONTENT HELPERS
       ========================================================= */

    const textFromHtml = (html) => {
        const doc = new DOMParser().parseFromString(
            String(html || ""),
            "text/html"
        );

        doc
            .querySelectorAll(
                "script,iframe,object,embed,style"
            )
            .forEach((element) => element.remove());

        return doc.body?.textContent || "";
    };

    const codeText = (html) => {
        return textFromHtml(html)
            .replace(/\u00a0/g, " ")
            .trim();
    };

    const linkifyHtml = (raw) => {
        const doc = new DOMParser().parseFromString(
            String(raw || ""),
            "text/html"
        );

        doc
            .querySelectorAll(
                "script,iframe,object,embed,style"
            )
            .forEach((element) => element.remove());

        doc
            .querySelectorAll("*")
            .forEach((element) => {
                [...element.attributes].forEach((attr) => {
                    if (
                        attr.name.toLowerCase().startsWith("on")
                    ) {
                        element.removeAttribute(attr.name);
                    }
                });
            });

        doc.querySelectorAll("a").forEach((a) => {
            const href = safeUrl(a.getAttribute("href"));

            if (href) {
                a.setAttribute("href", href);
                a.setAttribute("target", "_blank");
                a.setAttribute("rel", "noopener noreferrer");
            } else {
                a.removeAttribute("href");
            }
        });

        const walker = doc.createTreeWalker(
            doc.body,
            NodeFilter.SHOW_TEXT
        );

        const nodes = [];

        while (walker.nextNode()) {
            const node = walker.currentNode;

            if (
                !node.parentElement?.closest(
                    "a,pre,code"
                )
            ) {
                nodes.push(node);
            }
        }

        const regex =
            /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

        nodes.forEach((node) => {
            const text = node.nodeValue || "";
            const fragment = document.createDocumentFragment();

            let lastIndex = 0;
            let match;

            regex.lastIndex = 0;

            while ((match = regex.exec(text))) {
                let url = match[1];
                let trailing = "";

                while (
                    /[.,!?;:)\]}]$/.test(url)
                ) {
                    trailing =
                        url.slice(-1) + trailing;

                    url = url.slice(0, -1);
                }

                if (match.index > lastIndex) {
                    fragment.appendChild(
                        document.createTextNode(
                            text.slice(
                                lastIndex,
                                match.index
                            )
                        )
                    );
                }

                const a = document.createElement("a");

                const href = safeUrl(url);

                if (href) {
                    a.href = href;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                }

                a.textContent = url;

                fragment.appendChild(a);

                if (trailing) {
                    fragment.appendChild(
                        document.createTextNode(trailing)
                    );
                }

                lastIndex =
                    match.index + match[1].length;
            }

            if (lastIndex > 0) {
                if (lastIndex < text.length) {
                    fragment.appendChild(
                        document.createTextNode(
                            text.slice(lastIndex)
                        )
                    );
                }

                node.replaceWith(fragment);
            }
        });

        return doc.body.innerHTML;
    };

    /* =========================================================
       RESOLVE SLUG
       ========================================================= */

    async function resolveSlug() {
        if (productId || !slug) {
            return;
        }

        let table = null;

        if (type === "code") {
            table = "telegram_products";
        } else if (
            type === "channel" ||
            type === "group"
        ) {
            table = "telegram_channels";
        }

        if (!table) {
            throw new Error(
                "Produk tidak ditemukan."
            );
        }

        const { data, error } = await sbClient
            .from(table)
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data?.id) {
            throw new Error(
                "Link tidak ditemukan atau sudah tidak tersedia."
            );
        }

        productId = data.id;
    }

    /* =========================================================
       LOAD PRODUCT
       ========================================================= */

    async function loadProduct() {
        if (!sbClient) {
            throw new Error(
                "Supabase belum dikonfigurasi."
            );
        }

        await resolveSlug();

        if (!productId) {
            throw new Error(
                "Produk tidak ditemukan."
            );
        }

        const { data, error } =
            await sbClient.rpc(
                "get_market_item_detail",
                {
                    p_type: type,
                    p_id: productId
                }
            );

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error(
                "Produk tidak ditemukan atau belum dipublikasikan."
            );
        }

        product = data;

        try {
            await sbClient.rpc(
                "record_content_view",
                {
                    p_owner: product.owner_id,
                    p_target_type: type,
                    p_target_id: productId
                }
            );
        } catch (_) {
            /* View tracking tidak boleh memblokir halaman. */
        }

        return product;
    }

    /* =========================================================
       RENDER PRODUCT
       ========================================================= */

    function renderProduct(x) {
        const price = Number(x.price || 0);
        const canAccess = x.can_access === true;

        let body = "";

        /* -----------------------------------------------------
           TELEGRAM
           ----------------------------------------------------- */

        if (
            type === "channel" ||
            type === "group"
        ) {
            const raw =
                x.channel_link ||
                x.telegram_channel_id ||
                x.content ||
                x.username ||
                "";

            const href =
                telegramUrl(raw) ||
                safeUrl(raw);

            if (!canAccess) {
                body = `
                    <div class="telegram-locked">
                        <i class="fa-solid fa-lock"></i>

                        <div>
                            <strong>
                                Akses Telegram terkunci
                            </strong>

                            <span>
                                Bayar atau ambil akses untuk
                                membuka link.
                            </span>
                        </div>
                    </div>
                `;
            } else if (raw) {
                body = `
                    <div class="telegram-access-card">

                        <div class="telegram-access-icon">
                            <i class="fa-brands fa-telegram"></i>
                        </div>

                        <div class="telegram-access-info">

                            <span>
                                TELEGRAM ${
                                    type === "group"
                                        ? "GROUP"
                                        : "CHANNEL"
                                }
                            </span>

                            <strong>
                                ${esc(raw)}
                            </strong>

                        </div>

                        ${
                            href
                                ? `
                                    <a
                                        class="btn primary telegram-open-btn"
                                        href="${esc(href)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <i class="fa-brands fa-telegram"></i>
                                        Buka Telegram
                                    </a>
                                `
                                : `
                                    <button
                                        type="button"
                                        class="btn primary telegram-copy-btn"
                                        data-copy="${esc(raw)}"
                                    >
                                        <i class="fa-solid fa-copy"></i>
                                        Salin
                                    </button>
                                `
                        }

                    </div>
                `;
            } else {
                body = `
                    <div class="telegram-empty">

                        <i class="fa-solid fa-link-slash"></i>

                        <div>
                            <strong>
                                Link belum tersedia
                            </strong>

                            <span>
                                Creator belum menyimpan
                                link Telegram.
                            </span>
                        </div>

                    </div>
                `;
            }

        /* -----------------------------------------------------
           CODE
           ----------------------------------------------------- */

        } else if (type === "code") {

            const raw = canAccess
                ? codeText(x.content || "")
                : "Kode berbayar. Buka akses untuk melihat kode lengkap.";

            const botUser =
                x.bot_username ||
                x.bot ||
                "";

            const botHref =
                telegramUrl(botUser) ||
                safeUrl(botUser);

            if (canAccess) {
                body = `
                    <div class="code-viewer">

                        <div class="code-head">

                            <span>
                                <i class="fa-solid fa-code"></i>
                                CODE
                            </span>

                            <button
                                type="button"
                                class="code-copy"
                                id="copyCode"
                            >
                                <i class="fa-solid fa-copy"></i>
                                Salin
                            </button>

                        </div>

                        <pre><code>${esc(raw)}</code></pre>

                        ${
                            botHref
                                ? `
                                    <a
                                        class="telegram-bot-card"
                                        href="${esc(botHref)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <i class="fa-brands fa-telegram"></i>

                                        <span>
                                            <b>
                                                Bot Telegram
                                            </b>

                                            <small>
                                                ${esc(botUser)}
                                            </small>
                                        </span>

                                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                    </a>
                                `
                                : ""
                        }

                    </div>
                `;
            } else {
                body = `
                    <div class="code-locked">

                        <i class="fa-solid fa-lock"></i>

                        <div>
                            <b>
                                Kode terkunci
                            </b>

                            <span>
                                Bayar untuk membuka dan
                                menyalin kode lengkap.
                            </span>
                        </div>

                    </div>
                `;
            }

        /* -----------------------------------------------------
           LINK / PASTELINK
           ----------------------------------------------------- */

        } else {

            body = `
                <div class="rich-output-view">
                    ${
                        canAccess
                            ? linkifyHtml(
                                x.content_html ||
                                x.content ||
                                x.description ||
                                "Tidak ada konten."
                            )
                            : linkifyHtml(
                                x.description ||
                                "Konten berbayar. Buka akses untuk melihat isi lengkap."
                            )
                    }
                </div>
            `;
        }

        /* -----------------------------------------------------
           ACCESS NOTE
           ----------------------------------------------------- */

        const accessHint =
            x.access_reason ===
            "subscription_limit"

                ? `
                    <div class="access-limit-note">

                        <i class="fa-solid fa-clock"></i>

                        <span>
                            Batas Langganan 5x Code hari ini
                            sudah tercapai. Kamu bisa mencoba
                            lagi besok atau upgrade Premium.
                        </span>

                    </div>
                `

                : x.access_reason ===
                  "subscription"

                ? `
                    <div class="access-limit-note">

                        <i class="fa-solid fa-gem"></i>

                        <span>
                            Akses dibuka dengan Langganan
                            · maksimal 5 Code Paid per hari.
                        </span>

                    </div>
                `

                : x.access_reason ===
                  "premium"

                ? `
                    <div class="access-limit-note premium-access-note">

                        <i class="fa-solid fa-circle-check"></i>

                        <span>
                            Premium aktif · akses Paid terbuka.
                        </span>

                    </div>
                `

                : "";

        /* -----------------------------------------------------
           PRODUCT HTML
           ----------------------------------------------------- */

        box.innerHTML = `
            <article class="product-detail premium-view">

                <div class="product-detail-icon">
                    <i class="${getIcon(type)}"></i>
                </div>

                <span class="badge">
                    ${esc(
                        String(
                            x.access_type || "free"
                        ).toUpperCase()
                    )}
                </span>

                <h1>
                    ${esc(
                        x.title || "Untitled"
                    )}
                </h1>

                <p class="muted">
                    Oleh
                    <b>
                        ${esc(
                            x.creator_name ||
                            "Creator"
                        )}
                    </b>

                    ·

                    ${formatNumber(x.views)} views
                </p>

                ${accessHint}

                ${body}

                <div class="detail-actions">

                    <button
                        type="button"
                        class="btn"
                        id="like"
                    >
                        <i class="fa-regular fa-heart"></i>
                        Like
                    </button>

                    <button
                        type="button"
                        class="btn"
                        id="share"
                    >
                        <i class="fa-solid fa-share-nodes"></i>
                        Share
                    </button>

                    <b class="price">
                        ${
                            price
                                ? money(price)
                                : "FREE"
                        }
                    </b>

                    <button
                        type="button"
                        class="btn primary"
                        id="buy"
                    >
                        ${
                            canAccess
                                ? `
                                    <i class="fa-solid fa-circle-check"></i>
                                    Sudah diakses
                                `
                                : price
                                ? `
                                    <i class="fa-solid fa-qrcode"></i>
                                    Bayar via Cashi QRIS
                                `
                                : `
                                    <i class="fa-solid fa-unlock"></i>
                                    Ambil akses
                                `
                        }
                    </button>

                </div>

            </article>
        `;

        const buyButton =
            document.getElementById("buy");

        if (canAccess && buyButton) {
            buyButton.disabled = true;
        }

        bindProductActions(x);
    }

    /* =========================================================
       PRODUCT ACTIONS
       ========================================================= */

    function bindProductActions(x) {

        /* -----------------------------------------------------
           COPY CODE
           ----------------------------------------------------- */

        document
            .getElementById("copyCode")
            ?.addEventListener(
                "click",
                async () => {

                    const text =
                        codeText(
                            x.content || ""
                        );

                    try {
                        await navigator.clipboard.writeText(
                            text
                        );

                        toast(
                            "Kode berhasil disalin",
                            "success"
                        );

                    } catch (_) {

                        toast(
                            "Gagal menyalin kode",
                            "error"
                        );
                    }
                }
            );

        /* -----------------------------------------------------
           COPY TELEGRAM
           ----------------------------------------------------- */

        document
            .querySelector(
                ".telegram-copy-btn"
            )
            ?.addEventListener(
                "click",
                async (event) => {

                    const value =
                        event.currentTarget.dataset.copy ||
                        "";

                    try {
                        await navigator.clipboard.writeText(
                            value
                        );

                        toast(
                            "Link berhasil disalin",
                            "success"
                        );

                    } catch (_) {

                        toast(
                            "Gagal menyalin link",
                            "error"
                        );
                    }
                }
            );

        /* -----------------------------------------------------
           SHARE
           ----------------------------------------------------- */

        document
            .getElementById("share")
            ?.addEventListener(
                "click",
                shareProduct
            );

        /* -----------------------------------------------------
           LIKE
           ----------------------------------------------------- */

        document
            .getElementById("like")
            ?.addEventListener(
                "click",
                toggleLike
            );

        /* -----------------------------------------------------
           BUY
           ----------------------------------------------------- */

        document
            .getElementById("buy")
            ?.addEventListener(
                "click",
                handlePurchase
            );
    }

    /* =========================================================
       SHARE
       ========================================================= */

    async function shareProduct() {

        const shareData = {
            title:
                product?.title ||
                "PasTele Product",

            text:
                "Lihat produk ini di PasTele.",

            url:
                window.location.href
        };

        try {

            if (
                navigator.share
            ) {
                await navigator.share(
                    shareData
                );
            } else {

                await navigator.clipboard.writeText(
                    window.location.href
                );

                toast(
                    "Link berhasil disalin",
                    "success"
                );
            }

        } catch (error) {

            if (
                error?.name !==
                "AbortError"
            ) {
                try {
                    await navigator.clipboard.writeText(
                        window.location.href
                    );

                    toast(
                        "Link berhasil disalin",
                        "success"
                    );
                } catch (_) {}
            }
        }

        try {
            await sbClient.rpc(
                "track_analytics",
                {
                    p_owner:
                        product.owner_id,

                    p_event:
                        "share",

                    p_target_type:
                        type,

                    p_target_id:
                        productId
                }
            );
        } catch (_) {}
    }

    /* =========================================================
       LIKE
       ========================================================= */

    async function toggleLike() {

        if (
            !product ||
            !likeBtn
        ) {
            return;
        }

        likeBtn.disabled = true;

        try {

            const result =
                await sbClient.rpc(
                    "toggle_content_like",
                    {
                        p_owner:
                            product.owner_id,

                        p_target_type:
                            type,

                        p_target_id:
                            productId
                    }
                );

            if (result.error) {
                throw result.error;
            }

            const data =
                Array.isArray(
                    result.data
                )
                    ? result.data[0]
                    : result.data;

            const liked =
                data?.liked === true;

            const total =
                Number(
                    data?.count ??
                    data?.like_count ??
                    likeCount?.textContent ??
                    0
                );

            updateLikeUI(
                liked,
                total
            );

        } catch (error) {

            console.error(
                "LIKE ERROR:",
                error
            );

            toast(
                error?.message ||
                "Like gagal diproses.",
                "error"
            );

        } finally {

            likeBtn.disabled = false;
        }
    }

    function updateLikeUI(
        liked,
        count
    ) {

        if (likeBtn) {
            likeBtn.setAttribute(
                "aria-pressed",
                liked
                    ? "true"
                    : "false"
            );
        }

        if (likeIcon) {
            likeIcon.className =
                liked
                    ? "fa-solid fa-heart"
                    : "fa-regular fa-heart";
        }

        if (likeLabel) {
            likeLabel.textContent =
                liked
                    ? "Disukai"
                    : "Suka";
        }

        if (likeCount) {
            likeCount.textContent =
                formatNumber(count);
        }
    }

    /* =========================================================
       LOAD LIKE COUNT
       ========================================================= */

    async function loadLikeState() {

        if (!product) {
            return;
        }

        try {

            /*
             * Kita ambil data like dari content_likes.
             * Jika query ditolak RLS, halaman produk tetap
             * berjalan tanpa mengganggu detail produk.
             */

            const { data, error } =
                await sbClient
                    .from("content_likes")
                    .select("*", {
                        count: "exact",
                        head: false
                    })
                    .eq(
                        "owner_id",
                        product.owner_id
                    )
                    .eq(
                        "target_type",
                        type
                    )
                    .eq(
                        "target_id",
                        productId
                    );

            if (error) {
                console.warn(
                    "LIKE COUNT:",
                    error
                );

                return;
            }

            const total =
                Array.isArray(data)
                    ? data.length
                    : 0;

            let liked = false;

            /*
             * Untuk user login, cek apakah ada
             * baris milik user tersebut.
             */

            try {

                const user =
                    await window.TC?.user?.();

                if (user?.id) {

                    liked =
                        Array.isArray(data) &&
                        data.some(
                            (row) =>
                                row.user_id ===
                                user.id
                        );
                }

            } catch (_) {}

            updateLikeUI(
                liked,
                total
            );

        } catch (error) {

            console.warn(
                "Unable to load likes:",
                error
            );
        }
    }

    /* =========================================================
       COMMENTS
       ========================================================= */

    async function loadComments() {

        if (!commentList) {
            return;
        }

        if (commentsLoading) {
            commentsLoading.style.display =
                "flex";
        }

        try {

            const {
                data,
                error,
                count
            } = await sbClient
                .from("content_comments")
                .select(
                    "id,owner_id,target_type,target_id,name,content,created_at",
                    {
                        count: "exact"
                    }
                )
                .eq(
                    "owner_id",
                    product.owner_id
                )
                .eq(
                    "target_type",
                    type
                )
                .eq(
                    "target_id",
                    productId
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(50);

            if (error) {
                throw error;
            }

            if (commentsLoading) {
                commentsLoading.style.display =
                    "none";
            }

            const comments =
                Array.isArray(data)
                    ? data
                    : [];

            if (commentCount) {
                commentCount.textContent =
                    formatNumber(
                        count ??
                        comments.length
                    );
            }

            renderComments(
                comments
            );

        } catch (error) {

            console.warn(
                "COMMENT LOAD:",
                error
            );

            if (commentsLoading) {
                commentsLoading.style.display =
                    "none";
            }

            commentCount.textContent =
                "0";

            commentList.innerHTML = `
                <div class="product-comments-empty">

                    <i class="fa-solid fa-comments"></i>

                    <strong>
                        Belum ada komentar
                    </strong>

                    <span>
                        Jadilah yang pertama memberikan
                        komentar.
                    </span>

                </div>
            `;
        }
    }

    function renderComments(
        comments
    ) {

        if (!commentList) {
            return;
        }

        if (!comments.length) {

            commentList.innerHTML = `
                <div class="product-comments-empty">

                    <i class="fa-regular fa-comment-dots"></i>

                    <strong>
                        Belum ada komentar
                    </strong>

                    <span>
                        Jadilah yang pertama memberikan
                        komentar.
                    </span>

                </div>
            `;

            return;
        }

        commentList.innerHTML =
            comments
                .map(
                    (comment) => {

                        const name =
                            String(
                                comment.name ||
                                "Pengunjung"
                            )
                            .trim()
                            .slice(
                                0,
                                50
                            );

                        const content =
                            String(
                                comment.content ||
                                ""
                            )
                            .trim();

                        const initial =
                            name
                                .charAt(0)
                                .toUpperCase() ||
                            "?";

                        return `
                            <article
                                class="product-comment-item"
                                data-comment-id="${esc(
                                    comment.id
                                )}"
                            >

                                <div class="product-comment-avatar">
                                    ${esc(initial)}
                                </div>

                                <div class="product-comment-body">

                                    <div class="product-comment-meta">

                                        <strong>
                                            ${esc(name)}
                                        </strong>

                                        <time
                                            datetime="${esc(
                                                comment.created_at ||
                                                ""
                                            )}"
                                        >
                                            ${esc(
                                                formatDate(
                                                    comment.created_at
                                                )
                                            )}
                                        </time>

                                    </div>

                                    <p>
                                        ${esc(content)}
                                    </p>

                                </div>

                            </article>
                        `;
                    }
                )
                .join("");
    }

    /* =========================================================
       COMMENT COUNTER
       ========================================================= */

    function updateCommentCounter() {

        if (!commentText) {
            return;
        }

        const length =
            commentText.value.length;

        if (commentCharCount) {
            commentCharCount.textContent =
                String(length);
        }
    }

    commentText?.addEventListener(
        "input",
        updateCommentCounter
    );

    /* =========================================================
       SUBMIT COMMENT
       ========================================================= */

    commentForm?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            if (!product) {
                return;
            }

            const name =
                String(
                    commentName?.value || ""
                )
                .trim()
                .replace(/\s+/g, " ");

            const content =
                String(
                    commentText?.value || ""
                )
                .trim();

            if (!name) {
                toast(
                    "Masukkan nama terlebih dahulu.",
                    "error"
                );

                commentName?.focus();

                return;
            }

            if (name.length < 2) {
                toast(
                    "Nama minimal 2 karakter.",
                    "error"
                );

                commentName?.focus();

                return;
            }

            if (!content) {
                toast(
                    "Tulis komentar terlebih dahulu.",
                    "error"
                );

                commentText?.focus();

                return;
            }

            if (content.length < 2) {
                toast(
                    "Komentar terlalu pendek.",
                    "error"
                );

                commentText?.focus();

                return;
            }

            if (name.length > 50) {
                toast(
                    "Nama maksimal 50 karakter.",
                    "error"
                );

                return;
            }

            if (content.length > 500) {
                toast(
                    "Komentar maksimal 500 karakter.",
                    "error"
                );

                return;
            }

            commentSubmit.disabled = true;

            const originalHTML =
                commentSubmit.innerHTML;

            commentSubmit.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Mengirim...</span>
            `;

            try {

                /*
                 * Guest comment:
                 * tidak memanggil TC.user()
                 * dan tidak memaksa autentikasi.
                 */

                const { data, error } =
                    await sbClient
                        .from("content_comments")
                        .insert({
                            owner_id:
                                product.owner_id,

                            target_type:
                                type,

                            target_id:
                                productId,

                            name:
                                name,

                            content:
                                content
                        })
                        .select(
                            "id,owner_id,target_type,target_id,name,content,created_at"
                        )
                        .single();

                if (error) {
                    throw error;
                }

                if (commentName) {
                    commentName.value =
                        "";
                }

                if (commentText) {
                    commentText.value =
                        "";
                }

                updateCommentCounter();

                toast(
                    "Komentar berhasil dikirim.",
                    "success"
                );

                /*
                 * Tambahkan komentar baru langsung
                 * agar terasa realtime.
                 */

                if (data) {

                    const empty =
                        commentList.querySelector(
                            ".product-comments-empty"
                        );

                    if (empty) {
                        empty.remove();
                    }

                    const article =
                        createCommentElement(
                            data
                        );

                    if (
                        commentList.firstChild
                    ) {
                        commentList.insertBefore(
                            article,
                            commentList.firstChild
                        );
                    } else {
                        commentList.appendChild(
                            article
                        );
                    }
                }

                /*
                 * Refresh jumlah komentar dari database.
                 */

                await refreshCommentCount();

            } catch (error) {

                console.error(
                    "COMMENT INSERT:",
                    error
                );

                toast(
                    error?.message ||
                    "Komentar gagal dikirim.",
                    "error"
                );

            } finally {

                commentSubmit.disabled =
                    false;

                commentSubmit.innerHTML =
                    originalHTML;
            }
        }
    );

    function createCommentElement(
        comment
    ) {

        const article =
            document.createElement(
                "article"
            );

        article.className =
            "product-comment-item";

        article.dataset.commentId =
            comment.id || "";

        const name =
            String(
                comment.name ||
                "Pengunjung"
            )
            .trim()
            .slice(0, 50);

        const content =
            String(
                comment.content ||
                ""
            )
            .trim();

        const initial =
            name
                .charAt(0)
                .toUpperCase() ||
            "?";

        article.innerHTML = `
            <div class="product-comment-avatar">
                ${esc(initial)}
            </div>

            <div class="product-comment-body">

                <div class="product-comment-meta">

                    <strong>
                        ${esc(name)}
                    </strong>

                    <time>
                        ${esc(
                            formatDate(
                                comment.created_at
                            )
                        )}
                    </time>

                </div>

                <p>
                    ${esc(content)}
                </p>

            </div>
        `;

        return article;
    }

    /* =========================================================
       REFRESH COMMENT COUNT
       ========================================================= */

    async function refreshCommentCount() {

        try {

            const { count, error } =
                await sbClient
                    .from("content_comments")
                    .select("id", {
                        count: "exact",
                        head: true
                    })
                    .eq(
                        "owner_id",
                        product.owner_id
                    )
                    .eq(
                        "target_type",
                        type
                    )
                    .eq(
                        "target_id",
                        productId
                    );

            if (error) {
                throw error;
            }

            if (commentCount) {
                commentCount.textContent =
                    formatNumber(
                        count || 0
                    );
            }

        } catch (error) {

            console.warn(
                "COMMENT COUNT:",
                error
            );
        }
    }

    /* =========================================================
       PURCHASE
       ========================================================= */

    async function handlePurchase() {

        const buy =
            document.getElementById(
                "buy"
            );

        if (
            !buy ||
            !product
        ) {
            return;
        }

        const price =
            Number(
                product.price || 0
            );

        const canAccess =
            product.can_access === true;

        if (canAccess) {
            return;
        }

        /*
         * Paid product:
         * wajib login ketika akan membeli.
         */

        let user = null;

        try {
            user =
                await window.TC?.user?.();
        } catch (_) {}

        if (!user) {

            const next =
                encodeURIComponent(
                    window.location.href
                );

            window.location.href =
                `login.html?redirect=${next}`;

            return;
        }

        /* -----------------------------------------------------
           FREE ACCESS
           ----------------------------------------------------- */

        if (!price) {

            buy.disabled = true;

            buy.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Membuka akses...
            `;

            try {

                const result =
                    await sbClient.rpc(
                        "buy_market_item",
                        {
                            p_type:
                                type,

                            p_id:
                                productId
                        }
                    );

                if (result.error) {
                    throw result.error;
                }

                toast(
                    "Akses berhasil dibuka.",
                    "success"
                );

                window.setTimeout(
                    () => {
                        window.location.reload();
                    },
                    600
                );

            } catch (error) {

                console.error(
                    "FREE ACCESS:",
                    error
                );

                toast(
                    error?.message ||
                    "Akses gagal dibuka.",
                    "error"
                );

                buy.disabled =
                    false;

                buy.innerHTML = `
                    <i class="fa-solid fa-unlock"></i>
                    Ambil akses
                `;
            }

            return;
        }

        /* -----------------------------------------------------
           PAID
           ----------------------------------------------------- */

        buy.disabled = true;

        buy.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Menyiapkan QR...
        `;

        try {

            const orderResult =
                await sbClient.rpc(
                    "create_checkout_order",
                    {
                        p_type:
                            type,

                        p_id:
                            productId
                    }
                );

            if (orderResult.error) {
                throw orderResult.error;
            }

            const order =
                Array.isArray(
                    orderResult.data
                )
                    ? orderResult.data[0]
                    : orderResult.data;

            if (!order?.order_id) {
                throw new Error(
                    "Order pembayaran tidak berhasil dibuat."
                );
            }

            const config =
                window.PASTELE_CONFIG ||
                {};

            const token =
                config.SUPABASE_ANON_KEY ||
                "";

            const supabaseUrl =
                String(
                    config.SUPABASE_URL ||
                    ""
                ).replace(
                    /\/$/,
                    ""
                );

            if (!supabaseUrl) {
                throw new Error(
                    "SUPABASE_URL belum dikonfigurasi."
                );
            }

            const functionUrl =
                supabaseUrl +
                "/functions/v1/create-cashi-payment";

            const response =
                await fetch(
                    functionUrl,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify({
                                order_id:
                                    order.order_id,

                                amount:
                                    Number(
                                        order.amount
                                    ),

                                title:
                                    order.title
                            })
                    }
                );

            const payload =
                await response
                    .json()
                    .catch(
                        () => ({})
                    );

            if (!response.ok) {
                throw new Error(
                    payload.error ||
                    payload.message ||
                    "Gateway Cashi belum tersedia."
                );
            }

            showPaymentModal(
                order,
                payload
            );

        } catch (error) {

            console.error(
                "PAYMENT ERROR:",
                error
            );

            toast(
                error?.message ||
                "Pembayaran gagal dibuat.",
                "error"
            );

            buy.disabled = false;

            buy.innerHTML = `
                <i class="fa-solid fa-qrcode"></i>
                Bayar via Cashi QRIS
            `;
        }
    }

    /* =========================================================
       CASHI PAYMENT MODAL
       ========================================================= */

    function showPaymentModal(
        order,
        payment
    ) {

        document
            .getElementById(
                "cashiModal"
            )
            ?.remove();

        const modal =
            document.createElement(
                "div"
            );

        modal.className =
            "cashi-modal-backdrop";

        modal.id =
            "cashiModal";

        const qrImage =
            payment.qr_image ||
            payment.qr_url ||
            payment.qris_image ||
            "";

        const qrString =
            payment.qr_string ||
            payment.qris_string ||
            "";

        const paymentUrl =
            payment.payment_url ||
            payment.checkout_url ||
            "";

        modal.innerHTML = `
            <div
                class="cashi-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cashiTitle"
            >

                <button
                    type="button"
                    class="cashi-close"
                    aria-label="Tutup"
                >
                    ×
                </button>

                <span class="badge">
                    CASHI · QRIS
                </span>

                <h2 id="cashiTitle">
                    Bayar ${money(
                        order.amount
                    )}
                </h2>

                <p class="muted">
                    Nominal pembayaran dikunci
                    sesuai harga produk.
                </p>

                <div class="cashi-qr">

                    ${
                        qrImage
                            ? `
                                <img
                                    src="${esc(qrImage)}"
                                    alt="QRIS Cashi"
                                >
                            `
                            : qrString
                            ? `
                                <div class="qr-text">
                                    ${esc(
                                        qrString
                                    )}
                                </div>
                            `
                            : `
                                <div class="empty">
                                    QR belum diterima dari Cashi.
                                </div>
                            `
                    }

                </div>

                ${
                    paymentUrl
                        ? `
                            <a
                                class="btn primary"
                                target="_blank"
                                rel="noopener noreferrer"
                                href="${esc(
                                    paymentUrl
                                )}"
                            >
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                Buka Pembayaran Cashi
                            </a>
                        `
                        : ""
                }

                <p
                    class="cashi-status"
                    id="cashiStatus"
                >
                    <i class="fa-solid fa-clock"></i>
                    Menunggu pembayaran...
                </p>

            </div>
        `;

        document.body.appendChild(
            modal
        );

        const close =
            modal.querySelector(
                ".cashi-close"
            );

        close?.addEventListener(
            "click",
            () => {
                modal.remove();
            }
        );

        modal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    modal
                ) {
                    modal.remove();
                }
            }
        );

        document.addEventListener(
            "keydown",
            function escapeHandler(
                event
            ) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    modal.remove();

                    document.removeEventListener(
                        "keydown",
                        escapeHandler
                    );
                }
            }
        );

        pollPayment(
            order.order_id,
            modal
        );
    }

    /* =========================================================
       PAYMENT POLLING
       ========================================================= */

    async function pollPayment(
        orderId,
        modal
    ) {

        const status =
            modal.querySelector(
                "#cashiStatus"
            );

        const started =
            Date.now();

        const maxDuration =
            30 * 60 * 1000;

        const timer =
            window.setInterval(
                async () => {

                    if (
                        Date.now() -
                            started >
                        maxDuration
                    ) {
                        window.clearInterval(
                            timer
                        );

                        if (status) {
                            status.innerHTML = `
                                <i class="fa-solid fa-clock"></i>
                                Waktu pembayaran berakhir.
                            `;
                        }

                        return;
                    }

                    try {

                        const result =
                            await sbClient
                                .from("orders")
                                .select(
                                    "status,payment_id,paid_at"
                                )
                                .eq(
                                    "id",
                                    orderId
                                )
                                .maybeSingle();

                        if (
                            result.error
                        ) {
                            return;
                        }

                        const current =
                            result.data;

                        if (
                            current?.status ===
                            "paid"
                        ) {

                            window.clearInterval(
                                timer
                            );

                            if (status) {
                                status.innerHTML = `
                                    <i class="fa-solid fa-circle-check"></i>
                                    Pembayaran berhasil.
                                    Membuka akses...
                                `;
                            }

                            toast(
                                "Pembayaran berhasil.",
                                "success"
                            );

                            window.setTimeout(
                                () => {
                                    window.location.reload();
                                },
                                800
                            );

                        } else if (
                            current?.status ===
                            "expired"
                        ) {

                            window.clearInterval(
                                timer
                            );

                            if (status) {
                                status.innerHTML = `
                                    <i class="fa-solid fa-circle-xmark"></i>
                                    Pembayaran kedaluwarsa.
                                `;
                            }
                        }

                    } catch (_) {
                        /* Polling failure is intentionally silent. */
                    }
                },
                2500
            );
    }

    /* =========================================================
       INITIAL LOAD
       ========================================================= */

    try {

        if (!box) {
            return;
        }

        if (!sbClient) {

            box.innerHTML = `
                <div class="empty">
                    Supabase belum dikonfigurasi.
                </div>
            `;

            return;
        }

        const loaded =
            await loadProduct();

        renderProduct(
            loaded
        );

        box.setAttribute(
            "aria-busy",
            "false"
        );

        /*
         * Load engagement setelah produk
         * sudah tampil supaya UI utama
         * tidak menunggu komentar/like.
         */

        await Promise.allSettled([
            loadLikeState(),
            loadComments()
        ]);

    } catch (error) {

        console.error(
            "PRODUCT LOAD ERROR:",
            error
        );

        if (box) {

            box.setAttribute(
                "aria-busy",
                "false"
            );

            box.innerHTML = `
                <div class="empty">

                    <i class="fa-solid fa-circle-exclamation"></i>

                    <strong>
                        Gagal memuat produk
                    </strong>

                    <span>
                        ${esc(
                            error?.message ||
                            "Produk tidak ditemukan."
                        )}
                    </span>

                </div>
            `;
        }

        if (commentList) {
            commentList.innerHTML = `
                <div class="product-comments-empty">

                    <i class="fa-solid fa-comments"></i>

                    <span>
                        Komentar belum dapat dimuat.
                    </span>

                </div>
            `;
        }
    }
});
