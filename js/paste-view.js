/* =========================================================
   PasTele — PasteLink View
   FINAL SQL SYNC
   SQL TABLE:
   public.pastelinks
   Relevant columns:
   - id
   - user_id
   - slug
   - title
   - content_html
   - visibility
   - password_hash
   - expires_at
   - description
   - tags
   - allow_comments
   - allow_download
   - show_raw
   - anonymous
   - views
   - created_at
   - updated_at
   RPC:
   - increment_paste_view(uuid)
   - record_content_view(uuid,text,uuid)
   - track_analytics(text,text,uuid,uuid)
   - toggle_content_like(uuid,text,uuid)
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    /* =======================================================
       DOM
       ======================================================= */
    const params = new URLSearchParams(location.search);
    const slug = String(params.get("slug") || "").trim();
    const box = document.getElementById("pasteContent");
    if (!box) {
        console.error("[PasteLink] #pasteContent tidak ditemukan.");
        return;
    }
    /* =======================================================
       BASIC HELPERS
       ======================================================= */
    const esc = (value) => {
        if (window.TC?.esc) {
            return TC.esc(String(value ?? ""));
        }
        return String(value ?? "").replace(
            /[&<>"']/g,
            (char) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                })[char]
        );
    };
    const client =
        window.sb ||
        window.supabaseClient ||
        window.supabase;
    if (!client) {
        box.innerHTML = `
            <div class="empty">
                Tidak dapat terhubung ke database.
            </div>
        `;
        return;
    }
    /* =======================================================
       URL SANITIZER
       ======================================================= */
    const safeUrl = (value) => {
        let url = String(value || "").trim();
        if (!url) return "";
        if (/^www\./i.test(url)) {
            url = "https://" + url;
        }
        try {
            const parsed = new URL(url);
            if (
                parsed.protocol !== "http:" &&
                parsed.protocol !== "https:"
            ) {
                return "";
            }
            return parsed.href;
        } catch {
            return "";
        }
    };
    /* =======================================================
       SAFE HTML / LINKIFY
       -------------------------------------------------------
       content_html memang berupa HTML dari PasteLink.
       Kita tetap sanitasi elemen/script berbahaya sebelum
       memasukkannya ke DOM.
       ======================================================= */
    const linkify = (raw) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(
            String(raw || ""),
            "text/html"
        );
        /* Remove dangerous elements */
        doc.querySelectorAll(
            "script,iframe,object,embed,style,link,meta,base,form"
        ).forEach((element) => {
            element.remove();
        });
        /* Remove inline event handlers */
        doc.querySelectorAll("*").forEach((element) => {
            [...element.attributes].forEach((attribute) => {
                const name = attribute.name.toLowerCase();
                if (
                    name.startsWith("on") ||
                    name === "srcdoc"
                ) {
                    element.removeAttribute(attribute.name);
                }
            });
        });
        /* Sanitize anchors */
        doc.querySelectorAll("a").forEach((anchor) => {
            const href = safeUrl(
                anchor.getAttribute("href")
            );
            if (!href) {
                anchor.replaceWith(
                    document.createTextNode(
                        anchor.textContent || ""
                    )
                );
                return;
            }
            anchor.setAttribute("href", href);
            anchor.setAttribute("target", "_blank");
            anchor.setAttribute(
                "rel",
                "noopener noreferrer nofollow"
            );
        });
        /*
         * Remove javascript/data/blob URLs from media.
         * Normal HTTPS images are allowed.
         */
        doc.querySelectorAll(
            "img,video,audio,source"
        ).forEach((element) => {
            const attr =
                element.hasAttribute("src")
                    ? "src"
                    : element.hasAttribute("poster")
                        ? "poster"
                        : null;
            if (!attr) return;
            const value =
                element.getAttribute(attr);
            if (!safeUrl(value)) {
                element.removeAttribute(attr);
            }
        });
        /* ===================================================
           AUTO LINK PLAIN URLS
           =================================================== */
        const walker = doc.createTreeWalker(
            doc.body,
            NodeFilter.SHOW_TEXT
        );
        const textNodes = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (
                node.parentElement &&
                !node.parentElement.closest(
                    "a,pre,code,textarea"
                )
            ) {
                textNodes.push(node);
            }
        }
        const urlRegex =
            /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
        textNodes.forEach((node) => {
            const text = node.nodeValue || "";
            let match;
            let lastIndex = 0;
            let changed = false;
            const fragment =
                document.createDocumentFragment();
            urlRegex.lastIndex = 0;
            while ((match = urlRegex.exec(text))) {
                let url = match[1];
                let trailing = "";
                /*
                 * Keep punctuation outside the anchor.
                 */
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
                const href = safeUrl(url);
                if (href) {
                    const anchor =
                        document.createElement("a");
                    anchor.href = href;
                    anchor.target = "_blank";
                    anchor.rel =
                        "noopener noreferrer nofollow";
                    anchor.textContent = url;
                    fragment.appendChild(anchor);
                    if (trailing) {
                        fragment.appendChild(
                            document.createTextNode(
                                trailing
                            )
                        );
                    }
                    changed = true;
                } else {
                    fragment.appendChild(
                        document.createTextNode(
                            match[1]
                        )
                    );
                    changed = true;
                }
                lastIndex =
                    match.index + match[1].length;
            }
            if (!changed) return;
            if (lastIndex < text.length) {
                fragment.appendChild(
                    document.createTextNode(
                        text.slice(lastIndex)
                    )
                );
            }
            node.replaceWith(fragment);
        });
        return doc.body.innerHTML;
    };
    /* =======================================================
       VALIDATE SLUG
       ======================================================= */
    if (!slug) {
        box.innerHTML = `
            <div class="empty">
                Paste tidak ditemukan.
            </div>
        `;
        return;
    }
    /* =======================================================
       LOAD PASTELINK
       -------------------------------------------------------
       Jangan gunakan select('*').
       Ambil hanya kolom yang memang digunakan.
       ======================================================= */
    const result = await client
        .from("pastelinks")
        .select(`
            id,
            user_id,
            slug,
            title,
            content_html,
            visibility,
            expires_at,
            description,
            tags,
            allow_comments,
            allow_download,
            show_raw,
            anonymous,
            access_type,
            price,
            views,
            created_at,
            updated_at
        `)
        .eq("slug", slug)
        .maybeSingle();
    if (result.error) {
        console.error(
            "[PasteLink] Query error:",
            result.error
        );
        box.innerHTML = `
            <div class="empty">
                Gagal memuat PasteLink.
            </div>
        `;
        return;
    }
    let paste = result.data;
    if (!paste) {
        box.innerHTML = `
            <div class="empty">
                Paste tidak ditemukan.
            </div>
        `;
        return;
    }

    /* =======================================================
       PAID / FREE ACCESS
       ======================================================= */
    let detail = null;
    try {
        const detailResult = await client.rpc("get_market_item_detail", {
            p_type: "pastelink",
            p_id: paste.id
        });
        if (!detailResult.error) {
            detail = Array.isArray(detailResult.data) ? detailResult.data[0] : detailResult.data;
            if (detail && detail.found !== false) {
                paste = { ...paste, ...detail };
            }
        }
    } catch (error) {
        console.warn("[PasteLink] Detail RPC gagal:", error);
    }

    const accessType = String(paste.access_type || "free").toLowerCase();
    const isPaid = accessType === "paid" && Number(paste.price || 0) > 0;
    const canAccess = !isPaid || paste.can_access === true;

    if (isPaid && !canAccess) {
        const priceText = Number(paste.price || 0).toLocaleString("id-ID");
        box.innerHTML = `
            <article class="justpaste-view premium-view paste-locked">
                <div class="paste-view-top">
                    <span class="badge"><i class="fa-solid fa-lock"></i> PasteLink Paid</span>
                    <span class="paste-live">Marketplace</span>
                </div>
                <h1>${esc(paste.title || "PasteLink")}</h1>
                ${paste.description ? `<p class="paste-description muted">${esc(paste.description)}</p>` : ""}
                <div class="paste-paywall">
                    <div class="paste-paywall-icon"><i class="fa-solid fa-lock"></i></div>
                    <h2>Konten ini berbayar</h2>
                    <p>Beli akses untuk membuka seluruh isi PasteLink.</p>
                    <strong class="paste-paywall-price">Rp ${priceText}</strong>
                    <button type="button" class="btn primary" id="buyPasteLink">
                        <i class="fa-solid fa-cart-shopping"></i> Beli Akses
                    </button>
                </div>
            </article>
        `;

        document.getElementById("buyPasteLink")?.addEventListener("click", async () => {
            let currentUser = null;
            try { currentUser = typeof window.TC?.user === "function" ? await window.TC.user() : null; } catch (_) {}
            if (!currentUser?.id) {
                location.href = "login.html?return=" + encodeURIComponent(location.pathname + location.search);
                return;
            }
            const button = document.getElementById("buyPasteLink");
            if (button) { button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; }
            try {
                const buy = await client.rpc("buy_market_item", { p_type: "pastelink", p_id: paste.id });
                if (buy.error) throw buy.error;
                const orderId = buy.data?.order_id;
                if (!orderId) throw new Error("Order tidak berhasil dibuat.");
                location.href = "payment.html?order_id=" + encodeURIComponent(orderId);
            } catch (error) {
                window.TC?.toast?.(error?.message || "Gagal membuat order.", "error");
                if (button) { button.disabled = false; button.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Beli Akses'; }
            }
        });
        return;
    }

    /* =======================================================
       EXPIRATION
       ======================================================= */
    if (
        paste.expires_at &&
        new Date(paste.expires_at).getTime() <= Date.now()
    ) {
        box.innerHTML = `
            <div class="empty">
                Paste sudah expired.
            </div>
        `;
        return;
    }
    /* =======================================================
       TAGS
       ======================================================= */
    const tags = Array.isArray(paste.tags)
        ? paste.tags
        : [];
    const tagHtml = tags
        .filter((tag) => String(tag || "").trim())
        .map(
            (tag) =>
                `<span class="paste-tag">#${esc(tag)}</span>`
        )
        .join("");
    /* =======================================================
       RENDER
       ======================================================= */
    const html = linkify(
        paste.content_html || ""
    );
    box.innerHTML = `
        <article
            class="justpaste-view premium-view"
            data-paste-id="${esc(paste.id)}"
        >
            <div class="paste-view-top">
                <span class="badge">
                    <i class="fa-solid fa-link"></i>
                    PasteLink
                </span>
                <span class="paste-live">
                    <i class="fa-solid fa-circle"></i>
                    Published
                </span>
            </div>
            <h1>
                ${esc(paste.title || "Untitled Paste")}
            </h1>
            ${
                paste.description
                    ? `
                        <p class="paste-description muted">
                            ${esc(paste.description)}
                        </p>
                    `
                    : ""
            }
            <div class="rich-output">
                ${html}
            </div>
            ${
                tagHtml
                    ? `
                        <div class="paste-tags">
                            ${tagHtml}
                        </div>
                    `
                    : ""
            }
            <div class="paste-actions">
                <button
                    type="button"
                    class="btn"
                    id="plike"
                >
                    <i class="fa-regular fa-heart"></i>
                    Like
                </button>
                <button
                    type="button"
                    class="btn"
                    id="pshare"
                >
                    <i class="fa-solid fa-share-nodes"></i>
                    Share
                </button>
            </div>
        </article>
    `;
    /* =======================================================
       VIEW TRACKING
       -------------------------------------------------------
       RPC memang tersedia di SQL.
       Jangan block UI kalau analytics gagal.
       ======================================================= */
    try {
        const viewResult = await client.rpc(
            "increment_paste_view",
            {
                p_id: paste.id
            }
        );
        if (viewResult.error) {
            console.warn(
                "[PasteLink] increment_paste_view:",
                viewResult.error
            );
        }
    } catch (error) {
        console.warn(
            "[PasteLink] View RPC gagal:",
            error
        );
    }
    try {
        const analyticsResult = await client.rpc(
            "record_content_view",
            {
                p_owner: paste.user_id,
                p_target_type: "link",
                p_target_id: paste.id
            }
        );
        if (analyticsResult.error) {
            console.warn(
                "[PasteLink] record_content_view:",
                analyticsResult.error
            );
        }
    } catch (error) {
        console.warn(
            "[PasteLink] Analytics RPC gagal:",
            error
        );
    }
    /* =======================================================
       SHARE
       ======================================================= */
    const shareButton =
        document.getElementById("pshare");
    shareButton?.addEventListener(
        "click",
        async () => {
            const url = location.href;
            let copied = false;
            try {
                if (
                    navigator.clipboard &&
                    window.isSecureContext
                ) {
                    await navigator.clipboard.writeText(
                        url
                    );
                    copied = true;
                }
            } catch {
                copied = false;
            }
            /*
             * Fallback Web Share API.
             */
            if (
                !copied &&
                navigator.share
            ) {
                try {
                    await navigator.share({
                        title:
                            paste.title ||
                            "PasteLink",
                        url
                    });
                } catch {
                    /* User cancelled share */
                }
            }
            /* Track share */
            try {
                const shareResult =
                    await client.rpc(
                        "track_analytics",
                        {
                            p_owner: paste.user_id,
                            p_event_type: "share",
                            p_target_type: "pastelink",
                            p_target_id: paste.id
                        }
                    );
                if (shareResult.error) {
                    console.warn(
                        "[PasteLink] Share analytics:",
                        shareResult.error
                    );
                }
            } catch (error) {
                console.warn(
                    "[PasteLink] Share RPC gagal:",
                    error
                );
            }
            if (window.TC?.toast) {
                TC.toast(
                    copied
                        ? "Link disalin"
                        : "Link siap dibagikan",
                    "success"
                );
            }
        }
    );
    /* =======================================================
       LIKE
       ======================================================= */
    const likeButton =
        document.getElementById("plike");
    likeButton?.addEventListener(
        "click",
        async () => {
            let currentUser = null;
            try {
                if (
                    window.TC &&
                    typeof TC.user === "function"
                ) {
                    currentUser = await TC.user();
                }
            } catch {
                currentUser = null;
            }
            if (!currentUser?.id) {
                location.href =
                    "login.html";
                return;
            }
            likeButton.disabled = true;
            try {
                const likeResult =
                    await client.rpc(
                        "toggle_content_like",
                        {
                            p_owner: paste.user_id,
                            p_target_type: "pastelink",
                            p_target_id: paste.id
                        }
                    );
                if (likeResult.error) {
                    throw likeResult.error;
                }
                const liked =
                    Boolean(
                        likeResult.data?.liked
                    );
                likeButton.innerHTML = liked
                    ? `
                        <i class="fa-solid fa-heart"></i>
                        Liked
                    `
                    : `
                        <i class="fa-regular fa-heart"></i>
                        Like
                    `;
                likeButton.classList.toggle(
                    "active",
                    liked
                );
                if (window.TC?.toast) {
                    TC.toast(
                        liked
                            ? "Ditambahkan ke suka"
                            : "Like dibatalkan",
                        "success"
                    );
                }
            } catch (error) {
                console.error(
                    "[PasteLink] Like error:",
                    error
                );
                if (window.TC?.toast) {
                    TC.toast(
                        error?.message ||
                            "Gagal memproses like.",
                        "error"
                    );
                }
            } finally {
                likeButton.disabled = false;
            }
        }
    );
});
