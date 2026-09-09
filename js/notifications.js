/* =========================================================
   PasTele — Notifications
   FINAL SQL SYNC
   Compatible with SUPABASE_MASTER_FINAL_PENDING_H1_H2_FINAL.sql
   Tables:
   - notifications
   - announcements
   notifications:
   id, user_id, title, body, is_read, created_at
   announcements:
   id, title, body, image_url, published,
   published_at, created_at, updated_at
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    /* =======================================================
       HELPERS
       ======================================================= */
    const $ = (selector) => document.querySelector(selector);
    const content = $("#content");
    if (!content) {
        console.error("[Notifications] #content tidak ditemukan.");
        return;
    }
    const escapeHtml = (value) => {
        if (window.TC?.esc) {
            return TC.esc(String(value ?? ""));
        }
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };
    const formatDate = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "-";
        }
        return date.toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    };
    const getClient = () => {
        return (
            window.sb ||
            window.supabaseClient ||
            window.supabase ||
            null
        );
    };
    /* =======================================================
       AUTH
       ======================================================= */
    let user = null;
    try {
        if (!window.TC || typeof TC.user !== "function") {
            console.error("[Notifications] TC.user() tidak tersedia.");
            location.replace("login.html");
            return;
        }
        user = await TC.user();
    } catch (error) {
        console.error("[Notifications] Gagal mengambil user:", error);
        location.replace("login.html");
        return;
    }
    if (!user?.id) {
        location.replace("login.html");
        return;
    }
    const client = getClient();
    if (!client) {
        content.innerHTML = `
            <div class="empty">
                Tidak dapat terhubung ke database.
            </div>
        `;
        return;
    }
    /* =======================================================
       LOAD NOTIFICATIONS
       ======================================================= */
    let notifications = [];
    let announcements = [];
    const [notificationResult, announcementResult] = await Promise.allSettled([
        client
            .from("notifications")
            .select("id,user_id,title,body,is_read,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        client
            .from("announcements")
            .select(
                "id,title,body,image_url,published,published_at,created_at,updated_at"
            )
            .eq("published", true)
            .order("published_at", { ascending: false })
    ]);
    /* =======================================================
       NOTIFICATIONS RESULT
       ======================================================= */
    if (notificationResult.status === "fulfilled") {
        const result = notificationResult.value;
        if (result.error) {
            console.error(
                "[Notifications] Query notifications gagal:",
                result.error
            );
        } else {
            notifications = Array.isArray(result.data)
                ? result.data
                : [];
        }
    } else {
        console.error(
            "[Notifications] Request notifications gagal:",
            notificationResult.reason
        );
    }
    /* =======================================================
       ANNOUNCEMENTS RESULT
       ======================================================= */
    if (announcementResult.status === "fulfilled") {
        const result = announcementResult.value;
        if (result.error) {
            console.error(
                "[Notifications] Query announcements gagal:",
                result.error
            );
        } else {
            announcements = Array.isArray(result.data)
                ? result.data
                : [];
        }
    } else {
        console.error(
            "[Notifications] Request announcements gagal:",
            announcementResult.reason
        );
    }
    /* =======================================================
       NORMALIZE DATA
       ======================================================= */
    const notificationRows = notifications.map((item) => ({
        id: item.id,
        source: "notification",
        title: item.title || "Notifikasi",
        body: item.body || "",
        image_url: null,
        created_at: item.created_at,
        is_read: Boolean(item.is_read),
        notification_id: item.id
    }));
    const announcementRows = announcements.map((item) => ({
        id: item.id,
        source: "announcement",
        title: item.title || "Pengumuman",
        body: item.body || "",
        image_url: item.image_url || null,
        created_at:
            item.published_at ||
            item.created_at ||
            null,
        is_read: true,
        notification_id: null
    }));
    // Avoid showing the same admin announcement twice: once from
    // announcements and again from the all-user notification inbox.
    const noticeKeys = new Set(
        notificationRows.map(item => `${item.title}||${item.body}`)
    );
    const filteredAnnouncements = announcementRows.filter(
        item => !noticeKeys.has(`${item.title}||${item.body}`)
    );

    const rows = [
        ...notificationRows,
        ...filteredAnnouncements
    ].sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
    });
    /* =======================================================
       EMPTY STATE
       ======================================================= */
    if (!rows.length) {
        content.innerHTML = `
            <div class="empty">
                <i class="fa-regular fa-bell-slash"></i>
                <div>Belum ada notifikasi.</div>
            </div>
        `;
        return;
    }
    /* =======================================================
       RENDER
       ======================================================= */
    content.innerHTML = rows
        .map((item, index) => {
            const isAnnouncement =
                item.source === "announcement";
            const body = String(item.body || "");
            const isLong = body.length > 300;
            const preview = isLong
                ? body.slice(0, 300) + "..."
                : body;
            const unreadClass =
                !isAnnouncement && !item.is_read
                    ? "unread"
                    : "";
            const image = item.image_url
                ? `
                    <img
                        class="notice-image"
                        src="${escapeHtml(item.image_url)}"
                        alt=""
                        loading="lazy"
                        onerror="this.style.display='none'"
                    >
                `
                : "";
            return `
                <article
                    class="notice-card ${escapeHtml(item.source)} ${unreadClass}"
                    data-index="${index}"
                    data-notification-id="${escapeHtml(
                        item.notification_id || ""
                    )}"
                >
                    ${image}
                    <div class="notice-inner">
                        <div class="notice-head">
                            <span class="badge">
                                <i class="fa-solid ${
                                    isAnnouncement
                                        ? "fa-bullhorn"
                                        : "fa-bell"
                                }"></i>
                                ${
                                    isAnnouncement
                                        ? "SIARAN ADMIN"
                                        : "NOTIFIKASI"
                                }
                            </span>
                            ${
                                !isAnnouncement && !item.is_read
                                    ? `
                                        <span class="notice-unread">
                                            BARU
                                        </span>
                                    `
                                    : ""
                            }
                        </div>
                        <h2>
                            ${escapeHtml(item.title)}
                        </h2>
                        <div
                            class="notice-short ${
                                isLong ? "" : "expanded"
                            }"
                            id="notice-body-${index}"
                        >
                            ${escapeHtml(
                                isLong ? preview : body
                            )}
                        </div>
                        ${
                            isLong
                                ? `
                                    <button
                                        type="button"
                                        class="btn notice-more"
                                        data-more="${index}"
                                    >
                                        Baca selengkapnya
                                    </button>
                                `
                                : ""
                        }
                        <small class="notice-date">
                            <i class="fa-regular fa-clock"></i>
                            ${formatDate(item.created_at)}
                        </small>
                    </div>
                </article>
            `;
        })
        .join("");
    /* =======================================================
       READ MORE / COLLAPSE
       ======================================================= */
    rows.forEach((item, index) => {
        const button = document.querySelector(
            `[data-more="${index}"]`
        );
        if (!button) return;
        const bodyElement = document.getElementById(
            `notice-body-${index}`
        );
        if (!bodyElement) return;
        const fullBody = String(item.body || "");
        button.addEventListener("click", () => {
            const expanded =
                bodyElement.classList.toggle("expanded");
            if (expanded) {
                bodyElement.textContent = fullBody;
                button.textContent = "Tutup";
            } else {
                bodyElement.textContent =
                    fullBody.length > 300
                        ? fullBody.slice(0, 300) + "..."
                        : fullBody;
                button.textContent =
                    "Baca selengkapnya";
            }
        });
    });
    /* =======================================================
       MARK NOTIFICATIONS AS READ
       -------------------------------------------------------
       Hanya notifications milik user sendiri.
       announcements tidak di-update karena tidak memiliki
       user_id / is_read.
       ======================================================= */
    const unreadIds = notificationRows
        .filter((item) => !item.is_read)
        .map((item) => item.notification_id)
        .filter(Boolean);
    if (unreadIds.length) {
        try {
            const { error } = await client
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .in("id", unreadIds);
            if (error) {
                console.error(
                    "[Notifications] Gagal menandai sudah dibaca:",
                    error
                );
            } else {
                /* Update UI tanpa reload */
                unreadIds.forEach((id) => {
                    const card = document.querySelector(
                        `[data-notification-id="${CSS.escape(id)}"]`
                    );
                    if (!card) return;
                    card.classList.remove("unread");
                    const badge =
                        card.querySelector(".notice-unread");
                    if (badge) {
                        badge.remove();
                    }
                });
            }
        } catch (error) {
            console.error(
                "[Notifications] Mark read exception:",
                error
            );
        }
    }
    /* =======================================================
       OPTIONAL GLOBAL COUNTER REFRESH
       -------------------------------------------------------
       Jika navbar/sidebar memiliki fungsi refresh badge,
       jalankan tanpa membuat halaman error.
       ======================================================= */
    try {
        if (typeof window.refreshNotificationCount === "function") {
            await window.refreshNotificationCount();
        }
    } catch (error) {
        console.warn(
            "[Notifications] refreshNotificationCount gagal:",
            error
        );
    }
    try {
        if (typeof window.updateNotificationBadge === "function") {
            await window.updateNotificationBadge();
        }
    } catch (error) {
        console.warn(
            "[Notifications] updateNotificationBadge gagal:",
            error
        );
    }
});
