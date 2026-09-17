/* PasTele — Create Code
 * FREE  : guest/belum login boleh membuat Code.
 * PAID  : wajib login. Login hanya diperiksa saat submit Paid.
 *
 * Tidak ada session/login guard untuk membuka halaman Create Code.
 * Database RPC create_code_content tetap menjadi otoritas final.
 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const client = () => window.sb || window.supabaseClient || null;

  const esc = (value) => {
    if (typeof window.TC?.esc === "function") return window.TC.esc(value);
    return String(value ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  };

  const toast = (message, type = "info") => {
    if (typeof window.TC?.toast === "function") {
      window.TC.toast(message, type);
      return;
    }
    window.alert(String(message || ""));
  };

  const normalizeBotUsername = (value) =>
    String(value || "").trim().replace(/^@+/, "");

  const SHORT_ALPHABET =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  function randomShortCode() {
    const bytes = new Uint32Array(4);
    crypto.getRandomValues(bytes);
    return Array.from(
      bytes,
      (n) => SHORT_ALPHABET[n % SHORT_ALPHABET.length]
    ).join("");
  }

  async function createUniqueShortCode(sb) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const key = randomShortCode();

      const checks = await Promise.all([
        sb.rpc("get_code_by_slug", { p_slug: key }),
        sb.rpc("get_telegram_content_by_slug", {
          p_slug: key,
          p_type: "channel"
        }),
        sb.rpc("get_telegram_content_by_slug", {
          p_slug: key,
          p_type: "group"
        }),
        sb.rpc("get_pastelink_by_slug", { p_slug: key })
      ]);

      const occupied = checks.some((q) => {
        if (q?.error) return true;
        const row = Array.isArray(q.data) ? q.data[0] : q.data;
        return !!row?.found;
      });

      if (!occupied) return key;
    }

    throw new Error(
      "Gagal membuat kode publik unik. Silakan coba lagi."
    );
  }

  const getAccess = () =>
    document.querySelector('input[name="access"]:checked')?.value === "paid"
      ? "paid"
      : "free";

  let bots = [];
  let saving = false;

  function setLoading(on) {
    saving = !!on;
    const button = $("submitBtn");
    if (!button) return;

    button.disabled = saving;
    button.setAttribute("aria-busy", String(saving));

    const normal = button.querySelector(".normal");
    const loading = button.querySelector(".loading");
    if (normal) normal.hidden = saving;
    if (loading) loading.hidden = !saving;
  }

  function requireClient() {
    const sb = client();
    if (!sb) {
      throw new Error(
        "Supabase belum siap. Refresh halaman lalu coba lagi."
      );
    }
    return sb;
  }

  function syncAccessUI() {
    const paid = getAccess() === "paid";
    const box = $("priceBox");
    const price = $("price");

    if (box) box.hidden = !paid;

    if (price) {
      price.disabled = !paid;
      if (!paid) price.value = "0";
      else if (!price.value || Number(price.value) <= 0) price.value = "2000";
    }
  }

  function validate() {
    const title = $("title")?.value.trim() || "";
    const botId = $("botId")?.value || "";
    const content = $("content")?.value.trim() || "";
    const description = $("description")?.value.trim() || "";
    const access = getAccess();

    const rawPrice = $("price")?.value ?? "0";
    const price = access === "paid" ? Number(rawPrice) : 0;

    if (title.length < 2 || title.length > 120) {
      toast("Judul Code harus 2–120 karakter.", "error");
      $("title")?.focus();
      return null;
    }

    if (!botId) {
      toast("Pilih bot yang sudah disetujui admin.", "error");
      $("botId")?.focus();
      return null;
    }

    if (!content) {
      toast("Code / Delivery wajib diisi.", "error");
      $("content")?.focus();
      return null;
    }

    if (
      access === "paid" &&
      (!Number.isInteger(price) ||
        price < 2000 ||
        price > 100000 ||
        price % 1000 !== 0)
    ) {
      toast(
        "Harga Paid harus Rp2.000–Rp100.000 dan kelipatan Rp1.000.",
        "error"
      );
      $("price")?.focus();
      return null;
    }

    return {
      title,
      botId,
      content,
      description,
      access,
      price
    };
  }

  async function getCurrentUserForPaidOnly() {
    const sb = client();
    if (!sb?.auth) return null;

    try {
      const { data, error } = await sb.auth.getUser();
      if (error) return null;
      return data?.user || null;
    } catch (_) {
      return null;
    }
  }

  async function loadBots() {
    const select = $("botId");
    const status = $("botStatus");
    if (!select) return;

    select.disabled = true;
    select.innerHTML = '<option value="">Memuat bot...</option>';
    if (status) status.hidden = true;

    const normalizeRow = (row) => {
      if (!row || typeof row !== "object") return null;

      const id = row.id ?? row.approved_bot_id ?? null;
      const username = normalizeBotUsername(
        row.bot_username ?? row.username ?? row.botUsername ?? ""
      );
      const name = String(
        row.bot_name ?? row.name ?? row.botName ?? ""
      ).trim();

      const active =
        row.is_active === undefined || row.is_active === null
          ? true
          : row.is_active === true ||
            String(row.is_active).toLowerCase() === "true";

      if (!id || !username) return null;

      return {
        id,
        bot_username: username,
        bot_name: name,
        is_active: active
      };
    };

    const normalizeRows = (data) => {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.data)) return data.data;
      if (data && Array.isArray(data.rows)) return data.rows;
      if (data && typeof data === "object" && (data.id || data.approved_bot_id)) {
        return [data];
      }
      return [];
    };

    const renderBots = (rows) => {
      const unique = new Map();

      rows
        .map(normalizeRow)
        .filter(Boolean)
        .filter((row) => row.is_active)
        .forEach((row) => unique.set(String(row.id), row));

      bots = [...unique.values()].sort((a, b) => {
        const aa = (a.bot_name || a.bot_username).toLowerCase();
        const bb = (b.bot_name || b.bot_username).toLowerCase();
        return aa.localeCompare(bb, "id");
      });

      if (!bots.length) {
        select.disabled = true;
        select.innerHTML =
          '<option value="">Belum ada bot aktif</option>';

        if (status) {
          status.hidden = false;
          status.className = "inline-status is-empty";
          status.innerHTML =
            '<i class="fa-solid fa-circle-info"></i>' +
            '<span>Belum ada bot aktif yang disetujui admin.</span>';
        }
        return false;
      }

      select.disabled = false;
      select.innerHTML =
        '<option value="">Silakan pilih bot aktif...</option>' +
        bots.map((bot) => {
          const username = normalizeBotUsername(bot.bot_username);
          const name = String(bot.bot_name || "").trim();
          const label =
            name && name.toLowerCase() !== username.toLowerCase()
              ? ` — ${esc(name)}`
              : "";
          return `<option value="${esc(bot.id)}">🤖 @${esc(username)}${label}</option>`;
        }).join("");

      if (status) {
        status.hidden = false;
        status.className = "inline-status is-ready";
        status.innerHTML =
          '<i class="fa-solid fa-circle-check"></i>' +
          '<span>Silakan pilih bot aktif yang disetujui admin.</span>';
      }

      return true;
    };

    try {
      const sb = requireClient();

      const rpc = await sb.rpc("get_active_approved_bots");
      if (!rpc.error && renderBots(
        Array.isArray(rpc.data) ? rpc.data : (rpc.data?.data || rpc.data?.rows || [])
      )) {
        return;
      }

      const direct = await sb
        .from("approved_bots")
        .select("id,bot_username,bot_name,bot_id,is_active")
        .eq("is_active", true)
        .order("bot_name", { ascending: true });

      if (!direct.error && renderBots(direct.data || [])) return;

      throw direct.error || rpc.error || new Error("BOT_LIST_EMPTY");
    } catch (error) {
      console.error("[PasTele][CreateCode] loadBots:", error);
      bots = [];
      select.disabled = true;
      select.innerHTML =
        '<option value="">Bot gagal dimuat</option>';

      if (status) {
        status.hidden = false;
        status.innerHTML =
          '<i class="fa-solid fa-triangle-exclamation"></i>' +
          '<span>Daftar bot tidak dapat dimuat. Coba refresh halaman.</span>';
      }

      toast(
        "Daftar bot gagal dimuat. Coba refresh halaman.",
        "error"
      );
    }
  }

  function rpcErrorMessage(error) {
    const raw = String(
      error?.message || error?.details || error || ""
    ).trim();

    const code = String(error?.code || "").trim();

    if (code === "42501") {
      return "Akses pembuatan Code ditolak oleh database. Pastikan RPC create_code_content mengizinkan Code Free untuk guest.";
    }

    if (/TITLE_AND_CONTENT_REQUIRED/i.test(raw)) {
      return "Judul dan Code / Delivery wajib diisi.";
    }

    if (/INVALID_ACCESS_TYPE/i.test(raw)) {
      return "Jenis akses tidak valid.";
    }

    if (/LOGIN_REQUIRED_FOR_PAID/i.test(raw)) {
      return "Code Paid hanya bisa dibuat setelah login.";
    }

    if (/INVALID_PAID_PRICE/i.test(raw)) {
      return "Harga Paid harus Rp2.000–Rp100.000 dan kelipatan Rp1.000.";
    }

    if (/APPROVED_BOT_REQUIRED/i.test(raw)) {
      return "Bot yang disetujui admin wajib dipilih.";
    }

    if (/BOT_NOT_FOUND_OR_INACTIVE/i.test(raw)) {
      return "Bot tersebut sudah tidak aktif. Pilih bot lain.";
    }

    if (/duplicate key|23505|already exists/i.test(raw)) {
      return "Kode publik sudah digunakan. Silakan coba publikasikan lagi.";
    }

    return raw || "Gagal menyimpan Code.";
  }

  function renderResult(payload) {
    const result = $("result");
    if (!result) return;

    const slug = String(payload.slug || "").trim();
    const access = payload.access === "paid" ? "p" : "f";
    const url =
      `${location.origin}/c/${access}/${encodeURIComponent(slug)}`;

    const botUsername = normalizeBotUsername(payload.botUsername);

    result.hidden = false;
    result.innerHTML = `
      <div class="result-icon">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <span class="result-label">PUBLISHED</span>
      <h2>Code berhasil dipublikasikan</h2>
      <p>
        <b>${esc(payload.title)}</b>
        · <span>${payload.access === "paid" ? "Paid" : "Free"}</span>
        · Bot <b>@${esc(botUsername)}</b>
      </p>
      <div class="result-url">
        <input readonly value="${esc(url)}" aria-label="URL Code">
        <button id="copyUrl" type="button" aria-label="Salin URL">
          <i class="fa-regular fa-copy"></i>
        </button>
      </div>
      <div class="result-actions">
        <a class="btn primary" href="${esc(url)}">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
          Buka Code
        </a>
        <a class="btn secondary" href="my-products.html">
          <i class="fa-solid fa-box-open"></i>
          Code Saya
        </a>
      </div>
    `;

    $("copyUrl")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast("Link Code berhasil disalin.", "success");
      } catch (_) {
        toast("Gagal menyalin link.", "error");
      }
    });

    result.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function boot() {
    document.querySelectorAll('input[name="access"]').forEach((radio) => {
      radio.addEventListener("change", syncAccessUI);
    });

    $("description")?.addEventListener("input", () => {
      const counter = $("counter");
      if (counter) {
        counter.textContent = String(
          $("description").value.length
        );
      }
    });

    $("botId")?.addEventListener("change", () => {
      const selected = bots.find(
        (bot) => String(bot.id) === String($("botId").value)
      );

      if ($("botUsernamePreview")) {
        $("botUsernamePreview").textContent = selected
          ? `@${normalizeBotUsername(selected.bot_username)}`
          : "";
      }

      const status = $("botStatus");

      if (status && bots.length) {
        status.hidden = false;
        status.className = selected
          ? "inline-status is-selected"
          : "inline-status is-ready";

        status.innerHTML = selected
          ? '<i class="fa-solid fa-circle-check"></i>' +
            '<span>Bot dipilih. Pastikan Code bot yang kamu masukkan memang untuk <strong>@' +
            esc(normalizeBotUsername(selected.bot_username)) +
            '</strong>.</span>'
          : '<i class="fa-solid fa-circle-check"></i>' +
            '<span>Silakan pilih bot aktif yang disetujui admin.</span>';
      }
    });

    $("createForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (saving) return;

      const values = validate();
      if (!values) return;

      setLoading(true);

      try {
        const sb = requireClient();

        /*
         * IMPORTANT:
         * Tidak ada session guard untuk FREE.
         * Guest langsung boleh memanggil RPC.
         *
         * PAID saja yang wajib login.
         */
        if (values.access === "paid") {
          const user = await getCurrentUserForPaidOnly();

          if (!user?.id) {
            toast(
              "Code Paid hanya bisa dibuat setelah login atau daftar akun.",
              "error"
            );

            const next =
              `${location.pathname}${location.search}${location.hash}`;

            const loginUrl =
              `login.html?next=${encodeURIComponent(next)}&reason=paid-create`;

            setLoading(false);

            window.setTimeout(() => {
              window.location.assign(loginUrl);
            }, 450);

            return;
          }
        }

        const bot = bots.find(
          (item) => String(item.id) === String(values.botId)
        );

        if (!bot) {
          throw new Error("BOT_NOT_FOUND_OR_INACTIVE");
        }

        const slug = await createUniqueShortCode(sb);

        const { data, error } = await sb.rpc(
          "create_code_content",
          {
            p_title: values.title,
            p_content: values.content,
            p_slug: slug,
            p_access_type: values.access,
            p_price: values.price,
            p_description: values.description,
            p_approved_bot_id: values.botId
          }
        );

        if (error) throw error;

        const resultData =
          Array.isArray(data)
            ? (data[0] || {})
            : (data || {});

        if (!resultData?.ok || !resultData?.slug) {
          throw new Error(
            "Database tidak mengonfirmasi pembuatan Code."
          );
        }

        renderResult({
          title: values.title,
          access:
            resultData.access_type || values.access,
          slug: resultData.slug,
          botUsername: bot.bot_username
        });

        $("createForm").reset();

        if ($("counter")) $("counter").textContent = "0";
        if ($("botUsernamePreview")) {
          $("botUsernamePreview").textContent = "";
        }

        syncAccessUI();

        toast(
          "Code berhasil dipublikasikan.",
          "success"
        );
      } catch (error) {
        console.error(
          "[PasTele][CreateCode]",
          error
        );

        toast(
          rpcErrorMessage(error),
          "error"
        );
      } finally {
        setLoading(false);
      }
    });

    syncAccessUI();
    loadBots();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
