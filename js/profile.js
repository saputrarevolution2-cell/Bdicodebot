/* =========================================================
   PasTele — Profile / Public Creator Profile
   FINAL PREMIUM PROFILE JS
   Matches profile.html + profile.css
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  /* =======================================================
     HELPERS
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  const getTC = () => window.TC || {};

  const getSupabase = () => {
    if (window.sb) return window.sb;
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase) {
      if (typeof window.supabase.from === "function") {
        return window.supabase;
      }
    }
    return null;
  };

  const sb = getSupabase();
  const TC = getTC();

  const esc = (value) => {
    try {
      if (typeof TC.esc === "function") {
        return TC.esc(value);
      }
    } catch (_) {}

    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  };

  const num = (value) => {
    const n = Number(value || 0);

    return Number.isFinite(n)
      ? n.toLocaleString("id-ID")
      : "0";
  };

  const money = (value) => {
    try {
      if (typeof TC.money === "function") {
        return TC.money(value);
      }
    } catch (_) {}

    const n = Number(value || 0);

    return `Rp ${Number.isFinite(n)
      ? n.toLocaleString("id-ID")
      : "0"}`;
  };

  const toast = (message, type = "info") => {
    try {
      if (typeof TC.toast === "function") {
        TC.toast(message, type);
        return;
      }
    } catch (_) {}

    const box = $("toast");

    if (!box) {
      console[type === "error" ? "error" : "log"](message);
      return;
    }

    box.textContent = String(message || "");
    box.dataset.type = type;
    box.classList.add("show");

    clearTimeout(box._toastTimer);

    box._toastTimer = setTimeout(() => {
      box.classList.remove("show");
    }, 3200);
  };

  const formatDate = (value, options = {}) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    const defaultOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric"
    };

    try {
      return new Intl.DateTimeFormat(
        "id-ID",
        {
          ...defaultOptions,
          ...options
        }
      ).format(date);
    } catch (_) {
      return date.toLocaleDateString("id-ID");
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (_) {
      return date.toLocaleString("id-ID");
    }
  };

  const normalizeType = (value) => {
    const raw = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

    if (
      raw === "paste" ||
      raw === "pastelink" ||
      raw === "pastelinks" ||
      raw === "link"
    ) {
      return "link";
    }

    if (
      raw === "code" ||
      raw === "codes"
    ) {
      return "code";
    }

    if (
      raw === "channel" ||
      raw === "telegramchannel"
    ) {
      return "channel";
    }

    if (
      raw === "group" ||
      raw === "telegramgroup"
    ) {
      return "group";
    }

    return "link";
  };

  const getContentIcon = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "fa-code";

      case "channel":
        return "fa-broadcast-tower";

      case "group":
        return "fa-users";

      default:
        return "fa-link";
    }
  };

  const getContentLabel = (type) => {
    switch (normalizeType(type)) {
      case "code":
        return "Code";

      case "channel":
        return "Channel";

      case "group":
        return "Group";

      default:
        return "Link";
    }
  };

  const isPaid = (item) => {
    return (
      String(item?.access_type || "").toLowerCase() === "paid" ||
      Number(item?.price || 0) > 0
    );
  };

  const getProfileUrl = () => {
    const username = String(
      profile?.username ||
      ""
    ).trim();

    if (username) {
      return `${location.origin}${location.pathname}?username=${encodeURIComponent(username)}`;
    }

    if (profile?.id) {
      return `${location.origin}${location.pathname}?id=${encodeURIComponent(profile.id)}`;
    }

    return location.href;
  };

  const setText = (id, value) => {
    const el = $(id);

    if (el) {
      el.textContent = value ?? "";
    }
  };

  const setHidden = (id, hidden) => {
    const el = $(id);

    if (!el) return;

    if (hidden) {
      el.setAttribute("hidden", "");
    } else {
      el.removeAttribute("hidden");
    }
  };


  /* =======================================================
     DOM
     ======================================================= */

  const nameEl = $("name");
  const avatarEl = $("avatar");
  const bioEl = $("bio");
  const handleEl = $("handle");
  const verifyEl = $("profileVerify");

  const followBtn = $("followBtn");
  const settingsBtn = $("settingsBtn");
  const adminBtn = $("adminBtn");

  const followersCountEl = $("followersCount");
  const followingCountEl = $("followingCount");
  const totalLikesEl = $("totalLikes");
  const totalContentEl = $("totalContent");

  const followersStat = $("followersStat");
  const followingStat = $("followingStat");

  const detailsEl = $("details");
  const countsEl = $("counts");

  const contentListEl = $("profileContentList");
  const contentTabsEl = $("profileContentTabs");
  const contentPaginationEl = $("profilePagination");

  const contentSearchEl = $("profileContentSearch");
  const clearContentSearchBtn = $("clearProfileContentSearch");
  const contentSortEl = $("profileContentSort");
  const contentResultEl = $("profileContentResult");

  const passwordSection = document.querySelector(".password-section");
  const passwordForm = $("profilePass");
  const passwordInput = $("profileNewPass");
  const passwordToggle = $("profilePassToggle");
  const passwordStrength = $("profilePasswordStrength");
  const passwordSubmit = $("profilePasswordSubmit");
  const passwordSubmitText = passwordSubmit?.querySelector(
    ".password-submit-text"
  );
  const passwordSubmitLoading = passwordSubmit?.querySelector(
    ".password-submit-loading"
  );

  const currentLoginEl = $("currentLogin");
  const lastLoginEl = $("lastLogin");
  const accountStatusEl = $("accountStatus");
  const sessionStatusEl = $("sessionStatus");

  const logoutBtn = $("profileLogoutBtn");

  const shareBtn = $("shareProfileBtn");
  const shareModal = $("profileShareModal");
  const shareClose = $("profileShareClose");
  const shareAvatar = $("shareProfileAvatar");
  const shareName = $("shareProfileName");
  const shareHandle = $("shareProfileHandle");
  const shareUrl = $("profileShareUrl");
  const copyProfileUrlBtn = $("copyProfileUrl");
  const nativeShareBtn = $("nativeShareProfile");
  const copyProfileShareBtn = $("copyProfileShare");


  /* =======================================================
     INITIAL STATE
     ======================================================= */

  if (!sb) {
    toast(
      "Supabase belum siap. Periksa konfigurasi aplikasi.",
      "error"
    );

    return;
  }

  let me = null;
  let profile = null;
  let isOwn = false;

  let content = [];

  let activeType = "all";
  let activePage = 1;

  let searchText = "";
  let sortMode = "newest";

  const pageSize = 5;

  let following = false;
  let followBusy = false;

  let contentLoading = false;
  let profileLoading = false;

  let previousFocus = null;


  /* =======================================================
     AUTH
     ======================================================= */

  const getCurrentUser = async () => {
    try {
      if (typeof TC.user === "function") {
        const user = await TC.user();

        if (user) {
          return user;
        }
      }
    } catch (_) {}

    try {
      const result = await sb.auth.getUser();

      if (!result.error && result.data?.user) {
        return result.data.user;
      }
    } catch (_) {}

    return null;
  };

  try {
    me = await getCurrentUser();
  } catch (_) {
    me = null;
  }


  /* =======================================================
     RESOLVE TARGET PROFILE
     ======================================================= */

  const params = new URLSearchParams(location.search);

  const target =
    params.get("user") ||
    params.get("username") ||
    params.get("id");

  const resolveProfile = async () => {

    /*
     * Public profile:
     * ?username=username
     * ?user=username
     * ?id=uuid
     */

    if (target) {

      const value = String(target).trim();

      if (!value) {
        return null;
      }

      let query = sb
        .from("profiles")
        .select("*");

      /*
       * UUID detection.
       * Do not assume every long string is UUID.
       */

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (uuidPattern.test(value)) {

        query = query.eq("id", value);

      } else {

        query = query.eq(
          "username",
          value.toLowerCase()
        );

      }

      const result = await query.maybeSingle();

      if (result.error) {
        console.error(
          "[Profile] profile query error:",
          result.error
        );

        throw result.error;
      }

      return result.data || null;
    }


    /*
     * Own profile.
     */

    if (!me) {
      return null;
    }

    try {
      if (typeof TC.profile === "function") {

        const ownProfile = await TC.profile();

        if (ownProfile) {
          return ownProfile;
        }
      }
    } catch (_) {}


    /*
     * Fallback directly from profiles.
     */

    const result = await sb
      .from("profiles")
      .select("*")
      .eq("id", me.id)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data || null;
  };


  /* =======================================================
     LOAD PROFILE
     ======================================================= */

  try {

    profileLoading = true;

    profile = await resolveProfile();

    if (!profile) {

      if (!target && !me) {
        location.replace("login.html");
        return;
      }

      renderProfileNotFound();
      return;
    }

    isOwn = Boolean(
      me?.id &&
      profile?.id &&
      String(me.id) === String(profile.id)
    );

  } catch (error) {

    console.error(
      "[Profile] Failed to load profile:",
      error
    );

    renderProfileError(
      error?.message ||
      "Profil gagal dimuat."
    );

    return;

  } finally {
    profileLoading = false;
  }


  /* =======================================================
     RENDER PROFILE HEADER
     ======================================================= */

  const profileName =
    profile.display_name ||
    profile.username ||
    "User";

  const username =
    profile.username ||
    "user";

  setText(
    "name",
    profileName
  );

  setText(
    "avatar",
    String(profileName)
      .trim()
      .slice(0, 1)
      .toUpperCase() || "U"
  );

  setText(
    "bio",
    profile.bio ||
    "Creator PasTele"
  );

  setText(
    "handle",
    `@${username}`
  );

  document.title =
    `${profileName} — PasTele`;


  /* =======================================================
     VERIFY BADGE
     ======================================================= */

  const renderVerification = () => {

    if (!verifyEl) return;

    verifyEl.hidden = true;

    const premium =
      profile.is_premium === true;

    const subscriptionActive =
      !premium &&
      profile.subscription_until &&
      new Date(profile.subscription_until) > new Date();

    if (premium) {

      verifyEl.hidden = false;

      verifyEl.className =
        "profile-verify blue";

      verifyEl.innerHTML =
        '<i class="fa-solid fa-check"></i>';

      verifyEl.title =
        "Premium";

      verifyEl.setAttribute(
        "aria-label",
        "Akun Premium"
      );

      return;
    }

    if (subscriptionActive) {

      verifyEl.hidden = false;

      verifyEl.className =
        "profile-verify green";

      verifyEl.innerHTML =
        '<i class="fa-solid fa-check"></i>';

      verifyEl.title =
        "Langganan aktif";

      verifyEl.setAttribute(
        "aria-label",
        "Langganan aktif"
      );
    }
  };

  renderVerification();


  /* =======================================================
     PROFILE ACTION VISIBILITY
     ======================================================= */

  if (isOwn) {

    setHidden(
      "followBtn",
      true
    );

    if (
      profile.is_admin === true ||
      profile.role === "admin" ||
      profile.role === "owner"
    ) {
      setHidden(
        "adminBtn",
        false
      );
    } else {
      setHidden(
        "adminBtn",
        true
      );
    }

    if (settingsBtn) {
      settingsBtn.removeAttribute("hidden");
    }

    if (passwordSection) {
      passwordSection.removeAttribute("hidden");
    }

  } else {

    setHidden(
      "settingsBtn",
      true
    );

    setHidden(
      "adminBtn",
      true
    );

    if (followBtn) {
      followBtn.removeAttribute("hidden");
    }

    /*
     * Public profiles don't show password section.
     */

    passwordSection?.remove();
  }


  /* =======================================================
     SHARE PROFILE DATA
     ======================================================= */

  const updateSharePreview = () => {

    const url = getProfileUrl();

    setText(
      "shareProfileAvatar",
      String(profileName)
        .trim()
        .slice(0, 1)
        .toUpperCase() || "U"
    );

    setText(
      "shareProfileName",
      profileName
    );

    setText(
      "shareProfileHandle",
      `@${username}`
    );

    if (shareUrl) {
      shareUrl.value = url;
    }
  };


  /* =======================================================
     SHARE MODAL
     ======================================================= */

  const openShareModal = () => {

    if (!shareModal) return;

    updateSharePreview();

    previousFocus =
      document.activeElement;

    shareModal.hidden = false;

    shareModal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "profile-modal-open"
    );

    requestAnimationFrame(() => {
      shareClose?.focus();
    });
  };

  const closeShareModal = () => {

    if (!shareModal) return;

    shareModal.hidden = true;

    shareModal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "profile-modal-open"
    );

    try {
      previousFocus?.focus();
    } catch (_) {}
  };

  shareBtn?.addEventListener(
    "click",
    openShareModal
  );

  shareClose?.addEventListener(
    "click",
    closeShareModal
  );

  shareModal?.querySelectorAll(
    "[data-close-profile-modal]"
  ).forEach((element) => {

    element.addEventListener(
      "click",
      closeShareModal
    );

  });


  /* =======================================================
     ESC CLOSE MODAL
     ======================================================= */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        shareModal &&
        !shareModal.hidden
      ) {
        closeShareModal();
      }

    }
  );


  /* =======================================================
     COPY
     ======================================================= */

  const copyText = async (text) => {

    const value = String(text || "");

    if (!value) {
      throw new Error(
        "Tidak ada data untuk disalin."
      );
    }

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      await navigator.clipboard.writeText(
        value
      );

      return;
    }

    const textarea =
      document.createElement("textarea");

    textarea.value = value;

    textarea.setAttribute(
      "readonly",
      ""
    );

    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(
      textarea
    );

    textarea.select();

    const copied =
      document.execCommand("copy");

    textarea.remove();

    if (!copied) {
      throw new Error(
        "Browser tidak mengizinkan copy."
      );
    }
  };


  const copyProfileLink = async () => {

    try {

      await copyText(
        getProfileUrl()
      );

      toast(
        "Link profil berhasil disalin.",
        "success"
      );

    } catch (error) {

      toast(
        error?.message ||
        "Gagal menyalin link profil.",
        "error"
      );
    }
  };

  copyProfileUrlBtn?.addEventListener(
    "click",
    copyProfileLink
  );

  copyProfileShareBtn?.addEventListener(
    "click",
    copyProfileLink
  );


  /* =======================================================
     NATIVE SHARE
     ======================================================= */

  nativeShareBtn?.addEventListener(
    "click",
    async () => {

      const url = getProfileUrl();

      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {

        try {

          await navigator.share({
            title:
              `${profileName} — PasTele`,
            text:
              `Lihat profil ${profileName} di PasTele.`,
            url
          });

          return;

        } catch (error) {

          if (
            error?.name === "AbortError"
          ) {
            return;
          }
        }
      }

      await copyProfileLink();
    }
  );


  /* =======================================================
     PROFILE COUNTS
     ======================================================= */

  const loadCounts = async () => {

    const [
      followersResult,
      followingResult,
      likesResult,
      contentResult
    ] = await Promise.all([

      sb
        .from("creator_followers")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "creator_id",
          profile.id
        ),

      sb
        .from("creator_followers")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "follower_id",
          profile.id
        ),

      sb
        .from("content_likes")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "content_owner_id",
          profile.id
        ),

      sb
        .from("marketplace_public")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "owner_id",
          profile.id
        )
    ]);

    const errors = [
      followersResult,
      followingResult,
      likesResult,
      contentResult
    ].filter(
      (result) => result?.error
    );

    if (errors.length) {
      console.warn(
        "[Profile] Some statistics failed:",
        errors.map(
          (item) => item.error
        )
      );
    }

    const followers =
      Number(
        followersResult?.count || 0
      );

    const following =
      Number(
        followingResult?.count || 0
      );

    const likes =
      Number(
        likesResult?.count || 0
      );

    const totalContent =
      Number(
        contentResult?.count || 0
      );

    setText(
      "followersCount",
      num(followers)
    );

    setText(
      "followingCount",
      num(following)
    );

    setText(
      "totalLikes",
      num(likes)
    );

    setText(
      "totalContent",
      num(totalContent)
    );

    return {
      followers,
      following,
      likes,
      totalContent
    };
  };

  await loadCounts();


  /* =======================================================
     FOLLOW STATE
     ======================================================= */

  const loadFollowState = async () => {

    if (
      isOwn ||
      !me ||
      !profile?.id
    ) {
      return false;
    }

    const result = await sb
      .from("creator_followers")
      .select("id")
      .eq(
        "creator_id",
        profile.id
      )
      .eq(
        "follower_id",
        me.id
      )
      .maybeSingle();

    if (result.error) {

      console.warn(
        "[Profile] Follow state error:",
        result.error
      );

      return false;
    }

    following =
      Boolean(result.data);

    return following;
  };


  const renderFollowButton = () => {

    if (!followBtn) return;

    if (following) {

      followBtn.classList.remove(
        "primary"
      );

      followBtn.innerHTML =
        '<i class="fa-solid fa-user-check"></i>' +
        "<span>Mengikuti</span>";

      followBtn.dataset.following =
        "1";

      followBtn.setAttribute(
        "aria-label",
        "Berhenti mengikuti creator"
      );

    } else {

      followBtn.classList.add(
        "primary"
      );

      followBtn.innerHTML =
        '<i class="fa-solid fa-user-plus"></i>' +
        "<span>Ikuti</span>";

      followBtn.dataset.following =
        "0";

      followBtn.setAttribute(
        "aria-label",
        "Ikuti creator"
      );
    }
  };


  if (!isOwn) {

    if (me) {

      await loadFollowState();

      renderFollowButton();

    } else {

      if (followBtn) {

        followBtn.classList.add(
          "primary"
        );

        followBtn.innerHTML =
          '<i class="fa-solid fa-right-to-bracket"></i>' +
          "<span>Login untuk mengikuti</span>";

        followBtn.dataset.following =
          "0";

        followBtn.onclick = () => {
          location.href =
            `login.html?redirect=${encodeURIComponent(
              location.href
            )}`;
        };
      }
    }
  }


  /* =======================================================
     FOLLOW / UNFOLLOW
     ======================================================= */

  followBtn?.addEventListener(
    "click",
    async () => {

      if (followBusy) return;

      if (!me) {

        location.href =
          `login.html?redirect=${encodeURIComponent(
            location.href
          )}`;

        return;
      }

      followBusy = true;

      followBtn.disabled = true;

      const wasFollowing =
        following;

      try {

        if (wasFollowing) {

          const result =
            await sb
              .from("creator_followers")
              .delete()
              .eq(
                "creator_id",
                profile.id
              )
              .eq(
                "follower_id",
                me.id
              );

          if (result.error) {
            throw result.error;
          }

          following = false;

          toast(
            "Berhenti mengikuti creator.",
            "success"
          );

        } else {

          const result =
            await sb
              .from("creator_followers")
              .insert({
                creator_id: profile.id,
                follower_id: me.id
              });

          if (result.error) {
            throw result.error;
          }

          following = true;

          toast(
            "Sekarang kamu mengikuti creator.",
            "success"
          );
        }

        renderFollowButton();

        await loadCounts();

      } catch (error) {

        console.error(
          "[Profile] Follow error:",
          error
        );

        /*
         * Unique violation can happen if
         * another request already inserted it.
         */

        if (
          error?.code === "23505"
        ) {

          following = true;

          renderFollowButton();

          await loadCounts();

        } else {

          toast(
            error?.message ||
            "Gagal mengubah status pengikut.",
            "error"
          );
        }

      } finally {

        followBusy = false;

        followBtn.disabled = false;
      }
    }
  );


  /* =======================================================
     FOLLOWING / FOLLOWERS SHORTCUT
     ======================================================= */

  followersStat?.addEventListener(
    "click",
    () => {

      const count =
        Number(
          followersCountEl?.textContent
            ?.replace(/\./g, "")
            ?.replace(/,/g, "") ||
          0
        );

      toast(
        `${num(count)} pengikut creator ini.`,
        "info"
      );
    }
  );

  followingStat?.addEventListener(
    "click",
    () => {

      const count =
        Number(
          followingCountEl?.textContent
            ?.replace(/\./g, "")
            ?.replace(/,/g, "") ||
          0
        );

      toast(
        `${num(count)} akun yang diikuti creator ini.`,
        "info"
      );
    }
  );


  /* =======================================================
     PROFILE DETAILS
     ======================================================= */

  const renderDetails = () => {

    if (!detailsEl) return;

    const email =
      profile.auth_email ||
      profile.email ||
      me?.email ||
      "Privat";

    const createdAt =
      profile.created_at;

    const updatedAt =
      profile.updated_at;

    const role =
      profile.role === "admin" ||
      profile.is_admin === true
        ? "Administrator"
        : "Creator";

    const status =
      profile.status ||
      "active";

    const statusLabel =
      String(status).toLowerCase() === "active"
        ? "Aktif"
        : String(status);

    const rows = [
      {
        label: "Username",
        value: `@${username}`
      },
      {
        label: "Nama",
        value: profileName
      },
      {
        label: "Email",
        value: isOwn
          ? email
          : "Privat"
      },
      {
        label: "Peran",
        value: role
      },
      {
        label: "Status akun",
        value: statusLabel
      },
      {
        label: "Bergabung",
        value: formatDate(createdAt)
      },
      {
        label: "Profil diperbarui",
        value: formatDate(updatedAt)
      },
      {
        label: "Creator",
        value: profile.is_creator === true
          ? "Aktif"
          : "Creator PasTele"
      }
    ];

    detailsEl.innerHTML =
      rows.map(
        (row) => `
          <div class="detail-row">
            <small>${esc(row.label)}</small>
            <b title="${esc(row.value)}">
              ${esc(row.value)}
            </b>
          </div>
        `
      ).join("");
  };

  renderDetails();


  /* =======================================================
     CONTENT SUMMARY
     ======================================================= */

  const renderContentSummary = () => {

    if (!countsEl) return;

    const summary = {
      link: 0,
      code: 0,
      channel: 0,
      group: 0
    };

    content.forEach((item) => {

      const type =
        normalizeType(item.type);

      if (
        Object.prototype.hasOwnProperty.call(
          summary,
          type
        )
      ) {
        summary[type]++;
      }
    });

    const rows = [
      {
        type: "link",
        icon: "fa-link",
        label: "PasteLink",
        count: summary.link,
        color: "blue"
      },
      {
        type: "code",
        icon: "fa-code",
        label: "Code",
        count: summary.code,
        color: "purple"
      },
      {
        type: "channel",
        icon: "fa-broadcast-tower",
        label: "Channel",
        count: summary.channel,
        color: "orange"
      },
      {
        type: "group",
        icon: "fa-users",
        label: "Group",
        count: summary.group,
        color: "pink"
      }
    ];

    countsEl.innerHTML =
      rows.map(
        (row) => `
          <a
            class="content-count"
            href="#publicContentSection"
            data-summary-type="${esc(row.type)}"
          >
            <span>
              <i class="fa-solid ${esc(row.icon)}"></i>
              ${esc(row.label)}
            </span>

            <b>${num(row.count)}</b>
          </a>
        `
      ).join("");

    countsEl
      .querySelectorAll(
        "[data-summary-type]"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          (event) => {

            event.preventDefault();

            const requestedType =
              button.dataset.summaryType;

            activeType =
              requestedType || "all";

            activePage = 1;

            syncContentTabs();

            renderContent();

            document
              .getElementById(
                "publicContentSection"
              )
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
          }
        );

      });
  };


  /* =======================================================
     LOAD PUBLIC CONTENT
     ======================================================= */

  const loadContent = async () => {

    if (!profile?.id) return;

    contentLoading = true;

    if (contentListEl) {

      contentListEl.innerHTML = `
        <div class="profile-loading">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          <span>Memuat konten...</span>
        </div>
      `;
    }

    try {

      const result =
        await sb
          .from("marketplace_public")
          .select(`
            id,
            slug,
            title,
            type,
            access_type,
            price,
            views,
            sales_count,
            created_at,
            description,
            owner_id
          `)
          .eq(
            "owner_id",
            profile.id
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          )
          .limit(500);

      if (result.error) {
        throw result.error;
      }

      content =
        Array.isArray(result.data)
          ? result.data
          : [];

      activePage = 1;

      renderContentSummary();

      renderContent();

    } catch (error) {

      console.error(
        "[Profile] Content error:",
        error
      );

      content = [];

      if (contentListEl) {

        contentListEl.innerHTML = `
          <div class="profile-error">
            <i class="fa-solid fa-triangle-exclamation"></i>

            <strong>
              Konten gagal dimuat
            </strong>

            <span>
              ${esc(
                error?.message ||
                "Terjadi kesalahan saat memuat konten."
              )}
            </span>
          </div>
        `;
      }

      if (contentResultEl) {
        contentResultEl.textContent =
          "Konten tidak dapat dimuat.";
      }

    } finally {

      contentLoading = false;
    }
  };


  /* =======================================================
     FILTER CONTENT
     ======================================================= */

  const getFilteredContent = () => {

    let rows =
      Array.isArray(content)
        ? [...content]
        : [];

    if (activeType !== "all") {

      rows = rows.filter(
        (item) =>
          normalizeType(item.type) ===
          activeType
      );
    }

    if (searchText) {

      const query =
        searchText.toLowerCase();

      rows = rows.filter(
        (item) => {

          const title =
            String(
              item.title || ""
            ).toLowerCase();

          const description =
            String(
              item.description || ""
            ).toLowerCase();

          const type =
            normalizeType(
              item.type
            );

          return (
            title.includes(query) ||
            description.includes(query) ||
            type.includes(query)
          );
        }
      );
    }

    switch (sortMode) {

      case "oldest":

        rows.sort(
          (a, b) =>
            new Date(a.created_at || 0) -
            new Date(b.created_at || 0)
        );

        break;

      case "popular":

        rows.sort(
          (a, b) =>
            Number(b.views || 0) -
            Number(a.views || 0)
        );

        break;

      case "sales":

        rows.sort(
          (a, b) =>
            Number(b.sales_count || 0) -
            Number(a.sales_count || 0)
        );

        break;

      case "newest":
      default:

        rows.sort(
          (a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        );

        break;
    }

    return rows;
  };


  /* =======================================================
     CONTENT CARD
     ======================================================= */

  const renderContentCard = (item) => {

    const type =
      normalizeType(item.type);

    const icon =
      getContentIcon(type);

    const label =
      getContentLabel(type);

    const paid =
      isPaid(item);

    const title =
      item.title ||
      "Untitled";

    const views =
      Number(item.views || 0);

    const sales =
      Number(item.sales_count || 0);

    const created =
      formatDate(item.created_at);

    const price =
      Number(item.price || 0);

    const productUrl =
      `product.html?id=${encodeURIComponent(
        item.id
      )}&type=${encodeURIComponent(
        type
      )}`;

    const accessLabel =
      paid
        ? "PAID"
        : "FREE";

    const meta =
      `${label} · ${num(views)} views · ${created}`;

    return `
      <a
        class="profile-content-card"
        href="${esc(productUrl)}"
        aria-label="${esc(title)}"
      >

        <span class="content-icon">
          <i class="fa-solid ${esc(icon)}"></i>
        </span>

        <main>

          <strong title="${esc(title)}">
            ${esc(title)}
          </strong>

          <small>
            ${esc(meta)}
            · ${esc(accessLabel)}
            ${sales > 0
              ? ` · ${num(sales)} penjualan`
              : ""}
          </small>

        </main>

        <b>
          ${paid
            ? esc(money(price))
            : "FREE"}
        </b>

      </a>
    `;
  };


  /* =======================================================
     CONTENT PAGINATION
     ======================================================= */

  const renderPagination = (totalPages) => {

    if (!contentPaginationEl) {
      return;
    }

    if (totalPages <= 1) {

      contentPaginationEl.innerHTML = "";

      return;
    }

    const buttons = [];

    const addButton = (
      page,
      label,
      active = false,
      disabled = false
    ) => {

      buttons.push(`
        <button
          type="button"
          data-p="${page}"
          ${active ? 'class="active"' : ""}
          ${disabled ? "disabled" : ""}
          aria-label="Halaman ${esc(label)}"
          ${active
            ? 'aria-current="page"'
            : ""}
        >
          ${esc(label)}
        </button>
      `);
    };


    /*
     * Previous
     */

    addButton(
      activePage - 1,
      "Sebelumnya",
      false,
      activePage <= 1
    );


    /*
     * Page range.
     */

    let start =
      Math.max(
        1,
        activePage - 2
      );

    let end =
      Math.min(
        totalPages,
        activePage + 2
      );

    if (activePage <= 3) {
      end =
        Math.min(
          totalPages,
          5
        );
    }

    if (activePage >= totalPages - 2) {
      start =
        Math.max(
          1,
          totalPages - 4
        );
    }


    /*
     * First page.
     */

    if (start > 1) {

      addButton(
        1,
        "1",
        activePage === 1
      );

      if (start > 2) {
        buttons.push(
          `<span aria-hidden="true">…</span>`
        );
      }
    }


    for (
      let page = start;
      page <= end;
      page++
    ) {

      addButton(
        page,
        String(page),
        page === activePage
      );
    }


    /*
     * Last page.
     */

    if (end < totalPages) {

      if (end < totalPages - 1) {
        buttons.push(
          `<span aria-hidden="true">…</span>`
        );
      }

      addButton(
        totalPages,
        String(totalPages),
        activePage === totalPages
      );
    }


    /*
     * Next.
     */

    addButton(
      activePage + 1,
      "Berikutnya",
      false,
      activePage >= totalPages
    );

    contentPaginationEl.innerHTML =
      buttons.join("");


    contentPaginationEl
      .querySelectorAll(
        "button[data-p]"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            if (
              button.disabled
            ) {
              return;
            }

            const nextPage =
              Number(
                button.dataset.p
              );

            if (
              !Number.isFinite(
                nextPage
              )
            ) {
              return;
            }

            activePage =
              Math.max(
                1,
                Math.min(
                  totalPages,
                  nextPage
                )
              );

            renderContent();

            document
              .getElementById(
                "publicContentSection"
              )
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
          }
        );

      });
  };


  /* =======================================================
     RENDER CONTENT
     ======================================================= */

  const renderContent = () => {

    if (!contentListEl) {
      return;
    }

    const filtered =
      getFilteredContent();

    const totalItems =
      filtered.length;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          totalItems / pageSize
        )
      );

    activePage =
      Math.min(
        activePage,
        totalPages
      );

    const start =
      (activePage - 1) *
      pageSize;

    const rows =
      filtered.slice(
        start,
        start + pageSize
      );


    /*
     * Result text.
     */

    if (contentResultEl) {

      if (!totalItems) {

        contentResultEl.textContent =
          searchText
            ? "Tidak ada konten yang cocok dengan pencarian."
            : "Creator ini belum memiliki konten publik.";

      } else {

        const from =
          start + 1;

        const to =
          Math.min(
            start + rows.length,
            totalItems
          );

        contentResultEl.textContent =
          `Menampilkan ${num(from)}–${num(to)} dari ${num(totalItems)} konten`;
      }
    }


    /*
     * Empty.
     */

    if (!rows.length) {

      contentListEl.innerHTML = `
        <div class="profile-empty">

          <i class="fa-solid fa-layer-group"></i>

          <strong>
            ${
              searchText
                ? "Konten tidak ditemukan"
                : "Belum ada konten publik"
            }
          </strong>

          <span>
            ${
              searchText
                ? "Coba gunakan kata kunci lain atau ubah filter."
                : "Creator ini belum memiliki konten publik."
            }
          </span>

        </div>
      `;

      renderPagination(totalPages);

      return;
    }


    /*
     * Cards.
     */

    contentListEl.innerHTML =
      rows
        .map(renderContentCard)
        .join("");


    renderPagination(
      totalPages
    );
  };


  /* =======================================================
     SYNC CONTENT TABS
     ======================================================= */

  const syncContentTabs = () => {

    if (!contentTabsEl) return;

    contentTabsEl
      .querySelectorAll(
        "button[data-type]"
      )
      .forEach((button) => {

        const active =
          normalizeType(
            button.dataset.type
          ) === activeType ||
          (
            activeType === "all" &&
            button.dataset.type === "all"
          );

        button.classList.toggle(
          "active",
          active
        );

        button.setAttribute(
          "aria-selected",
          active
            ? "true"
            : "false"
        );
      });
  };


  /* =======================================================
     CONTENT TAB EVENTS
     ======================================================= */

  contentTabsEl
    ?.querySelectorAll(
      "button[data-type]"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const requested =
            button.dataset.type;

          activeType =
            requested === "all"
              ? "all"
              : normalizeType(
                  requested
                );

          activePage = 1;

          syncContentTabs();

          renderContent();
        }
      );

    });


  /* =======================================================
     SEARCH
     ======================================================= */

  const updateSearchButton = () => {

    if (!clearContentSearchBtn) {
      return;
    }

    if (
      searchText ||
      contentSearchEl?.value
    ) {
      clearContentSearchBtn.hidden =
        false;
    } else {
      clearContentSearchBtn.hidden =
        true;
    }
  };


  contentSearchEl?.addEventListener(
    "input",
    () => {

      searchText =
        String(
          contentSearchEl.value || ""
        ).trim();

      activePage = 1;

      updateSearchButton();

      renderContent();
    }
  );


  clearContentSearchBtn?.addEventListener(
    "click",
    () => {

      if (contentSearchEl) {
        contentSearchEl.value = "";
        contentSearchEl.focus();
      }

      searchText = "";

      activePage = 1;

      updateSearchButton();

      renderContent();
    }
  );


  /* =======================================================
     SORT
     ======================================================= */

  contentSortEl?.addEventListener(
    "change",
    () => {

      sortMode =
        contentSortEl.value ||
        "newest";

      activePage = 1;

      renderContent();
    }
  );


  /* =======================================================
     PASSWORD STRENGTH
     ======================================================= */

  const getPasswordStrength = (password) => {

    const value =
      String(password || "");

    if (!value) {
      return {
        score: 0,
        label: "",
        className: ""
      };
    }

    let score = 0;

    if (value.length >= 6) {
      score++;
    }

    if (value.length >= 10) {
      score++;
    }

    if (/[a-z]/.test(value)) {
      score++;
    }

    if (/[A-Z]/.test(value)) {
      score++;
    }

    if (/[0-9]/.test(value)) {
      score++;
    }

    if (/[^A-Za-z0-9]/.test(value)) {
      score++;
    }


    if (
      value.length < 6
    ) {

      return {
        score,
        label: "Terlalu pendek",
        className: "weak"
      };
    }

    if (score <= 2) {

      return {
        score,
        label: "Password lemah",
        className: "weak"
      };
    }

    if (score <= 4) {

      return {
        score,
        label: "Password cukup kuat",
        className: "medium"
      };
    }

    return {
      score,
      label: "Password kuat",
      className: "strong"
    };
  };


  const renderPasswordStrength = () => {

    if (!passwordStrength) {
      return;
    }

    const result =
      getPasswordStrength(
        passwordInput?.value
      );

    passwordStrength.className =
      "password-strength";

    if (!result.label) {
      passwordStrength.textContent = "";
      return;
    }

    passwordStrength.classList.add(
      result.className
    );

    passwordStrength.textContent =
      result.label;
  };


  passwordInput?.addEventListener(
    "input",
    renderPasswordStrength
  );


  /* =======================================================
     PASSWORD TOGGLE
     ======================================================= */

  passwordToggle?.addEventListener(
    "click",
    () => {

      if (!passwordInput) {
        return;
      }

      const visible =
        passwordInput.type === "text";

      passwordInput.type =
        visible
          ? "password"
          : "text";

      passwordToggle.innerHTML =
        `<i class="fa-solid ${
          visible
            ? "fa-eye"
            : "fa-eye-slash"
        }"></i>`;

      passwordToggle.setAttribute(
        "aria-label",
        visible
          ? "Tampilkan password"
          : "Sembunyikan password"
      );

      passwordToggle.setAttribute(
        "aria-pressed",
        visible
          ? "false"
          : "true"
      );
    }
  );


  /* =======================================================
     PASSWORD BUTTON STATE
     ======================================================= */

  const setPasswordLoading = (
    loading
  ) => {

    if (!passwordSubmit) {
      return;
    }

    passwordSubmit.disabled =
      loading;

    passwordSubmit.classList.toggle(
      "loading",
      loading
    );

    if (passwordSubmitText) {
      passwordSubmitText.hidden =
        loading;
    }

    if (passwordSubmitLoading) {
      passwordSubmitLoading.hidden =
        !loading;
    }
  };


  /* =======================================================
     PASSWORD CHANGE
     ======================================================= */

  passwordForm?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      if (!passwordInput) {
        return;
      }

      const password =
        String(
          passwordInput.value || ""
        );

      if (password.length < 6) {

        toast(
          "Password minimal 6 karakter.",
          "error"
        );

        passwordInput.focus();

        return;
      }

      if (password.length > 128) {

        toast(
          "Password terlalu panjang.",
          "error"
        );

        passwordInput.focus();

        return;
      }

      if (!me) {

        toast(
          "Sesi login tidak ditemukan.",
          "error"
        );

        return;
      }

      setPasswordLoading(
        true
      );

      try {

        const result =
          await sb.auth.updateUser({
            password
          });

        if (result.error) {
          throw result.error;
        }

        toast(
          "Password berhasil diubah.",
          "success"
        );

        passwordForm.reset();

        if (passwordStrength) {
          passwordStrength.textContent = "";
          passwordStrength.className =
            "password-strength";
        }

        if (
          passwordInput.type !==
          "password"
        ) {
          passwordInput.type =
            "password";

          passwordToggle &&
            (
              passwordToggle.innerHTML =
                '<i class="fa-solid fa-eye"></i>'
            );
        }

      } catch (error) {

        console.error(
          "[Profile] Password update error:",
          error
        );

        toast(
          error?.message ||
          "Password gagal diubah.",
          "error"
        );

      } finally {

        setPasswordLoading(
          false
        );
      }
    }
  );


  /* =======================================================
     LOGIN SECURITY
     ======================================================= */

  const renderLoginSecurity = async () => {

    if (currentLoginEl) {

      if (me) {

        currentLoginEl.textContent =
          "Aktif";

      } else {

        currentLoginEl.textContent =
          "Tidak login";
      }
    }


    if (sessionStatusEl) {

      sessionStatusEl.textContent =
        me
          ? "Sesi aktif"
          : "Tidak aktif";
    }


    if (accountStatusEl) {

      const status =
        String(
          profile.status ||
          "active"
        ).toLowerCase();

      if (status === "active") {

        accountStatusEl.textContent =
          "Aktif";

      } else {

        accountStatusEl.textContent =
          status
            .charAt(0)
            .toUpperCase() +
          status.slice(1);
      }
    }


    /*
     * Last login is available from
     * Supabase Auth user metadata when
     * exposed by the current session.
     */

    if (lastLoginEl) {

      let lastLogin = null;

      try {

        const authUser =
          me ||
          (
            await sb.auth.getUser()
          ).data?.user;

        lastLogin =
          authUser?.last_sign_in_at ||
          authUser?.user_metadata
            ?.last_sign_in_at ||
          null;

      } catch (_) {}

      lastLoginEl.textContent =
        lastLogin
          ? formatDateTime(lastLogin)
          : "Belum ada";
    }
  };

  await renderLoginSecurity();


  /* =======================================================
     LOGOUT
     ======================================================= */

  logoutBtn?.addEventListener(
    "click",
    async () => {

      if (
        logoutBtn.disabled
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Yakin ingin keluar dari akun PasTele?"
        );

      if (!confirmed) {
        return;
      }

      logoutBtn.disabled =
        true;

      const originalHtml =
        logoutBtn.innerHTML;

      logoutBtn.innerHTML =
        '<span class="account-action-icon">' +
        '<i class="fa-solid fa-circle-notch fa-spin"></i>' +
        "</span>" +
        "<span>" +
        "<strong>Keluar...</strong>" +
        "<small>Menutup sesi akun</small>" +
        "</span>";

      try {

        if (
          typeof TC.logout ===
          "function"
        ) {

          await TC.logout();

        } else {

          const result =
            await sb.auth.signOut();

          if (result.error) {
            throw result.error;
          }
        }

        toast(
          "Berhasil keluar dari akun.",
          "success"
        );

        setTimeout(
          () => {
            location.replace(
              "login.html"
            );
          },
          350
        );

      } catch (error) {

        console.error(
          "[Profile] Logout error:",
          error
        );

        toast(
          error?.message ||
          "Gagal keluar dari akun.",
          "error"
        );

        logoutBtn.innerHTML =
          originalHtml;

        logoutBtn.disabled =
          false;
      }
    }
  );


  /* =======================================================
     LOAD CONTENT
     ======================================================= */

  await loadContent();

  syncContentTabs();

  updateSearchButton();


  /* =======================================================
     MODAL BODY LOCK
     ======================================================= */

  /*
   * Prevent background scroll while
   * share modal is open.
   */

  const observer =
    new MutationObserver(() => {

      if (
        shareModal &&
        !shareModal.hidden
      ) {

        document.body.style.overflow =
          "hidden";

      } else {

        document.body.style.overflow =
          "";
      }
    });

  if (shareModal) {

    observer.observe(
      shareModal,
      {
        attributes: true,
        attributeFilter: [
          "hidden"
        ]
      }
    );
  }


  /* =======================================================
     FINAL
     ======================================================= */

  console.info(
    "[Profile] Loaded:",
    {
      profileId: profile.id,
      username: profile.username,
      isOwn,
      contentCount: content.length
    }
  );

});


/* =========================================================
   PROFILE FALLBACK ERROR STATES
   ========================================================= */

function renderProfileNotFound() {

  const name =
    document.getElementById("name");

  const avatar =
    document.getElementById("avatar");

  const bio =
    document.getElementById("bio");

  const handle =
    document.getElementById("handle");

  const details =
    document.getElementById("details");

  const counts =
    document.getElementById("counts");

  const content =
    document.getElementById(
      "profileContentList"
    );

  const pagination =
    document.getElementById(
      "profilePagination"
    );

  if (name) {
    name.textContent =
      "Profil tidak ditemukan";
  }

  if (avatar) {
    avatar.textContent =
      "?";
  }

  if (bio) {
    bio.textContent =
      "Profil yang kamu cari tidak tersedia.";
  }

  if (handle) {
    handle.textContent =
      "";
  }

  if (details) {
    details.innerHTML = `
      <div class="profile-error">
        <i class="fa-solid fa-user-slash"></i>

        <strong>
          Profil tidak ditemukan
        </strong>

        <span>
          Username atau profil tersebut
          tidak tersedia.
        </span>
      </div>
    `;
  }

  if (counts) {
    counts.innerHTML = "";
  }

  if (content) {
    content.innerHTML = `
      <div class="profile-empty">
        <i class="fa-solid fa-user-slash"></i>

        <strong>
          Tidak ada profil
        </strong>

        <span>
          Profil creator ini tidak ditemukan
          atau sudah tidak tersedia.
        </span>
      </div>
    `;
  }

  if (pagination) {
    pagination.innerHTML = "";
  }

  document.title =
    "Profil tidak ditemukan — PasTele";
}


function renderProfileError(
  message
) {

  const name =
    document.getElementById("name");

  const avatar =
    document.getElementById("avatar");

  const bio =
    document.getElementById("bio");

  const details =
    document.getElementById("details");

  const content =
    document.getElementById(
      "profileContentList"
    );

  if (name) {
    name.textContent =
      "Gagal memuat profil";
  }

  if (avatar) {
    avatar.textContent =
      "!";
  }

  if (bio) {
    bio.textContent =
      "Terjadi masalah saat memuat data profil.";
  }

  if (details) {
    details.innerHTML = `
      <div class="profile-error">
        <i class="fa-solid fa-triangle-exclamation"></i>

        <strong>
          Profil gagal dimuat
        </strong>

        <span>
          ${escapeProfileText(
            message ||
            "Silakan coba lagi."
          )}
        </span>
      </div>
    `;
  }

  if (content) {
    content.innerHTML = `
      <div class="profile-error">
        <i class="fa-solid fa-triangle-exclamation"></i>

        <strong>
          Data tidak tersedia
        </strong>

        <span>
          Silakan refresh halaman dan coba lagi.
        </span>
      </div>
    `;
  }

  document.title =
    "Profile — PasTele";
}


function escapeProfileText(
  value
) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );
}
