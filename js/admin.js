(() => {
  "use strict";

  const C = window.TELECOD_CONFIG || {};
  const MASTER_ADMIN_ID = String(C.ADMIN_TELEGRAM_ID || "6665664367").replace(/\D/g, "");
  const configured = !!(
    C.SUPABASE_URL && C.SUPABASE_ANON_KEY &&
    !/YOUR_|PROJECT\b|PUBLISHABLE|ANON[_-]?KEY/i.test(`${C.SUPABASE_URL} ${C.SUPABASE_ANON_KEY}`)
  );
  const sup = configured && window.supabase ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const content = $("#content");
  const state = {
    page: "overview",
    profile: null,
    users: [],
    products: [],
    pastes: [],
    withdrawals: [],
    bots: [],
    payments: [],
    transactions: []
  };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
  const money = n => new Intl.NumberFormat("id-ID", {
    style:"currency", currency:"IDR", maximumFractionDigits:0
  }).format(Number(n || 0));
  const date = v => v ? new Date(v).toLocaleString("id-ID") : "-";

  function toast(message, type = "") {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(window.__adminToast);
    window.__adminToast = setTimeout(() => el.className = "toast", 2600);
  }

  function showGate(message = "") {
    if (!content) return;
    content.innerHTML = `
      <section class="admin-gate">
        <div class="gate-icon"><i class="fa-solid fa-shield-halved"></i></div>
        <span class="gate-kicker">TELECOD ADMIN SECURITY</span>
        <h1>Master Administrator</h1>
        <p>Panel ini hanya menerima Telegram ID master yang terdaftar di database.</p>
        <label>Telegram ID Master
          <input id="adminIdInput" inputmode="numeric" maxlength="20" placeholder="6665664367" autocomplete="off">
        </label>
        <button id="verifyAdminId" class="btn primary" type="button">
          <i class="fa-solid fa-lock-open"></i> Verifikasi Akses
        </button>
        <button id="telegramAdminLogin" class="btn telegram" type="button">
          <i class="fa-brands fa-telegram"></i> Login / Verifikasi dengan Telegram
        </button>
        ${message ? `<div class="gate-error">${esc(message)}</div>` : ""}
        <small>Telegram ID yang diketik di sini bukan password. Akses tetap diverifikasi oleh Supabase session + database.</small>
      </section>`;
    const input = $("#adminIdInput");
    const verify = () => verifyMasterId(input?.value);
    $("#verifyAdminId").onclick = verify;
    input?.addEventListener("keydown", e => { if (e.key === "Enter") verify(); });
    $("#telegramAdminLogin").onclick = startTelegramAdminAuth;
  }

  async function verifyMasterId(value) {
    const entered = String(value || "").replace(/\D/g, "");
    if (entered !== MASTER_ADMIN_ID) {
      toast("Telegram ID tidak diizinkan.", "error");
      return;
    }
    if (!sup) {
      toast("Supabase belum dikonfigurasi.", "error");
      return;
    }
    const { data: auth, error: authError } = await sup.auth.getUser();
    if (authError || !auth?.user) {
      toast("Silakan verifikasi/login dengan Telegram terlebih dahulu.", "warning");
      startTelegramAdminAuth();
      return;
    }
    const { data: profile, error } = await sup
      .from("profiles")
      .select("id,telegram_id,telegram_username,username,display_name,is_banned")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (error || !profile) {
      toast("Profil Telegram tidak ditemukan.", "error");
      return;
    }
    if (String(profile.telegram_id || "") !== MASTER_ADMIN_ID || profile.is_banned) {
      toast("Session ini bukan master administrator.", "error");
      return;
    }
    await bootAuthorized(profile);
  }

  function startTelegramAdminAuth() {
    const bot = String(C.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
    const callback = String(C.TELEGRAM_AUTH_FUNCTION_URL || "");
    if (!bot || !/^https?:\/\//i.test(callback)) {
      toast("Telegram Auth Function belum dikonfigurasi.", "error");
      return;
    }

    const modal = document.createElement("div");
    modal.className = "admin-telegram-modal";
    modal.innerHTML = `
      <div class="admin-telegram-card">
        <button class="admin-modal-close" type="button">×</button>
        <div class="gate-icon telegram"><i class="fa-brands fa-telegram"></i></div>
        <h2>Verifikasi Telegram</h2>
        <p>Gunakan akun Telegram yang memiliki ID <b>${MASTER_ADMIN_ID}</b>.</p>
        <div id="adminTelegramWidget"></div>
        <small>Telegram Login harus sudah dikonfigurasi di BotFather dan Edge Function.</small>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".admin-modal-close").onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = bot;
    script.dataset.size = "large";
    script.dataset.userpic = "false";
    script.dataset.authUrl =
      `${callback}${callback.includes("?") ? "&" : "?"}${new URLSearchParams({
        mode: "admin",
        redirect: `${location.origin}/admin`
      })}`;
    modal.querySelector("#adminTelegramWidget").appendChild(script);
  }

  async function rpc(name, args = {}) {
    if (!sup) throw new Error("Supabase belum dikonfigurasi.");
    const { data, error } = await sup.rpc(name, args);
    if (error) throw error;
    return data;
  }

  async function bootAuthorized(profile) {
    state.profile = profile;
    $("#adminUser").textContent =
      `@${profile.username || profile.telegram_username || MASTER_ADMIN_ID}`;
    $("#adminGate")?.remove();
    bindNav();
    await render();
  }

  function bindNav() {
    $$(".admin-side button").forEach(button => {
      button.onclick = async () => {
        state.page = button.dataset.page;
        $$(".admin-side button").forEach(x =>
          x.classList.toggle("active", x === button)
        );
        try { await render(); }
        catch (e) { showError(e); }
      };
    });

    $("#logout").onclick = async () => {
      if (sup) await sup.auth.signOut();
      location.href = "index.html";
    };
  }

  async function ensureMasterSession() {
    if (!sup) return showGate("Supabase belum dikonfigurasi.");
    const { data: auth } = await sup.auth.getUser();
    if (!auth?.user) return showGate();
    const { data: profile } = await sup
      .from("profiles")
      .select("id,telegram_id,telegram_username,username,display_name,is_banned")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (!profile || String(profile.telegram_id || "") !== MASTER_ADMIN_ID || profile.is_banned) {
      return showGate("Session Telegram ini bukan master administrator.");
    }
    return bootAuthorized(profile);
  }

  async function render() {
    const map = {
      overview, users, products, pastes, payments, transactions, withdrawals, bots
    };
    return (map[state.page] || overview)();
  }

  function title(h, sub, right = "") {
    return `<div class="admin-title"><div><h1>${h}</h1><p class="muted">${sub}</p></div>${right}</div>`;
  }

  async function overview() {
    const s = await rpc("admin_stats");
    content.innerHTML = `
      ${title("Overview","Kontrol pusat seluruh TeleCod.")}
      <div class="stats-grid">
        ${[
          ["Users",s.users],["Products",s.products],["Pastes",s.pastes],
          ["Sales",s.sales],["Revenue",money(s.revenue)],["Paste Views",s.paste_views],
          ["Banned",s.banned_users],["Published",s.published_products],
          ["Pending WD",s.pending_withdrawals],["Pending Pay",s.pending_payments]
        ].map(([a,b]) => `<div class="stat-card"><small>${a}</small><b>${esc(b)}</b></div>`).join("")}
      </div>
      <div class="panel quick-admin">
        <div class="panel-head"><b>Master controls</b><span class="pill ok">TG ${MASTER_ADMIN_ID}</span></div>
        <div class="quick-grid">
          ${[
            ["users","Users","fa-users"],["products","Products","fa-box"],
            ["pastes","Pastelink","fa-paste"],["payments","Payments","fa-credit-card"],
            ["transactions","Transactions","fa-receipt"],["withdrawals","Withdrawals","fa-money-bill-transfer"]
          ].map(x=>`<button class="quick-action" data-go="${x[0]}"><i class="fa-solid ${x[2]}"></i><span>${x[1]}</span></button>`).join("")}
        </div>
      </div>`;
    $$("[data-go]").forEach(b => b.onclick = async () => {
      state.page = b.dataset.go;
      $$(".admin-side button").forEach(x => x.classList.toggle("active", x.dataset.page === state.page));
      await render();
    });
  }

  async function users() {
    state.users = await rpc("admin_users",{p_limit:500,p_offset:0});
    content.innerHTML = `
      ${title("Users","Kelola akun, Telegram ID, status ban dan saldo.",
        `<input id="userSearch" class="search" placeholder="Cari username / Telegram ID">`)}
      <div class="panel"><div class="table-wrap"><table class="admin-table">
      <thead><tr><th>User</th><th>Telegram ID</th><th>Balance</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody id="rows"></tbody></table></div></div>`;
    drawUsers();
    $("#userSearch").oninput = drawUsers;
  }

  function drawUsers() {
    const q = ($("#userSearch")?.value || "").toLowerCase();
    const rows = state.users.filter(u =>
      [u.username,u.telegram_username,u.telegram_id,u.display_name]
        .join(" ").toLowerCase().includes(q)
    );
    $("#rows").innerHTML = rows.map(u => `
      <tr>
        <td><b>${esc(u.display_name || u.username || "User")}</b><br>
          <span class="muted">@${esc(u.username || u.telegram_username || "-")}</span></td>
        <td><code>${esc(u.telegram_id || "-")}</code></td>
        <td>${money(u.balance)}</td>
        <td><span class="pill ${u.is_banned ? "bad":"ok"}">${u.is_banned ? "BANNED":"ACTIVE"}</span></td>
        <td><div class="actions">
          <button class="btn" data-user="${u.id}" data-act="ban">${u.is_banned?"Unban":"Ban"}</button>
          <button class="btn primary" data-user="${u.id}" data-act="balance">Adjust Saldo</button>
        </div></td>
      </tr>`).join("") || `<tr><td colspan="5" class="empty">Tidak ada user.</td></tr>`;
    $$("[data-user]").forEach(b => b.onclick = () => userAction(b.dataset.user,b.dataset.act));
  }

  async function userAction(id, act) {
    const u = state.users.find(x => x.id === id);
    if (!u) return;
    try {
      if (act === "ban") {
        await rpc("admin_set_user",{p_user:id,p_banned:!u.is_banned});
        toast("Status user diperbarui.","success");
      } else {
        const amount = prompt("Nominal perubahan saldo. Contoh 50000 atau -25000");
        if (amount === null) return;
        const n = Number(amount);
        if (!Number.isFinite(n) || n === 0) return toast("Nominal tidak valid.","error");
        const reason = prompt("Alasan adjustment","Admin adjustment") || "Admin adjustment";
        await rpc("admin_adjust_balance",{p_user:id,p_amount:n,p_reason:reason});
        toast("Saldo diperbarui.","success");
      }
      await users();
    } catch (e) { toast(e.message || "Gagal.","error"); }
  }

  async function products() {
    state.products = await rpc("admin_products",{p_limit:500,p_offset:0});
    content.innerHTML = `
      ${title("Products","Moderasi dan kelola semua produk creator.")}
      <div class="panel"><div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Produk</th><th>Creator</th><th>Tipe</th><th>Harga</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${state.products.map(p => `<tr>
        <td><b>${esc(p.title)}</b><br><span class="muted">${esc(p.slug)}</span></td>
        <td>@${esc(p.creator_username || "-")}</td><td>${esc(p.type)}</td>
        <td>${p.access_type === "free" ? "FREE" : money(p.price)}</td>
        <td><span class="pill ${p.status==="published"?"ok":p.status==="archived"?"bad":"warn"}">${esc(p.status)}</span></td>
        <td><div class="actions">
          <button class="btn" data-p="${p.id}" data-status="published">Publish</button>
          <button class="btn" data-p="${p.id}" data-status="draft">Draft</button>
          <button class="btn" data-p="${p.id}" data-status="archived">Archive</button>
          <button class="btn primary" data-price="${p.id}" data-current="${p.price}">Harga</button>
          <button class="btn danger" data-del="${p.id}">Delete</button>
        </div></td>
      </tr>`).join("") || `<tr><td colspan="6" class="empty">Tidak ada produk.</td></tr>`}</tbody></table></div></div>`;
    $$("[data-p]").forEach(b => b.onclick = async () => {
      try { await rpc("admin_update_product",{p_id:b.dataset.p,p_status:b.dataset.status}); toast("Status produk diperbarui.","success"); await products(); }
      catch(e){toast(e.message,"error")}
    });
    $$("[data-price]").forEach(b => b.onclick = async () => {
      const price = prompt("Harga baru (0 diperbolehkan hanya untuk produk free):", b.dataset.current);
      if (price === null) return;
      const n = Number(price);
      if (!Number.isFinite(n) || n < 0) return toast("Harga tidak valid.","error");
      try { await rpc("admin_update_product",{p_id:b.dataset.price,p_status:null,p_price:n}); toast("Harga diperbarui.","success"); await products(); }
      catch(e){toast(e.message,"error")}
    });
    $$("[data-del]").forEach(b => b.onclick = async () => {
      if (!confirm("Hapus produk ini?")) return;
      try { await rpc("admin_delete_product",{p_id:b.dataset.del}); toast("Produk dihapus.","success"); await products(); }
      catch(e){toast(e.message,"error")}
    });
  }

  async function bots() {
    state.bots = await rpc("admin_bots");
    content.innerHTML = `
      ${title("Approved Bots","Bot yang ada di daftar ini dapat langsung publish saat user menambahkan Code.")}
      <div class="panel">
        <div class="panel-head">
          <b>Tambah / aktifkan Bot</b>
          <button id="addBot" class="btn primary"><i class="fa-solid fa-plus"></i> Tambah Bot</button>
        </div>
        <div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Bot</th><th>Bot ID</th><th>Nama</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>${state.bots.map(b => `<tr>
            <td><b>@${esc(b.bot_username)}</b></td>
            <td>${esc(b.bot_id || "-")}</td>
            <td>${esc(b.display_name || "-")}</td>
            <td><span class="pill ${b.is_active?"ok":"bad"}">${b.is_active?"ACTIVE":"OFF"}</span></td>
            <td><button class="btn danger" data-bot-delete="${b.id}">Hapus</button></td>
          </tr>`).join("") || `<tr><td colspan="5" class="empty">Belum ada bot.</td></tr>`}</tbody>
        </table></div>
      </div>`;
    $("#addBot").onclick = async () => {
      const username = prompt("Username bot Telegram, contoh: mybot");
      if (!username) return;
      const botId = prompt("Bot ID (opsional)", "") || null;
      const displayName = prompt("Nama bot (opsional)", "") || null;
      try {
        await rpc("admin_upsert_bot", {
          p_username: username.replace(/^@/,"").trim(),
          p_bot_id: botId ? Number(botId) : null,
          p_display_name: displayName
        });
        toast("Bot berhasil ditambahkan.","success");
        await bots();
      } catch(e) { toast(e.message || "Gagal menambah bot.","error"); }
    };
    $$("[data-bot-delete]").forEach(b => b.onclick = async () => {
      if (!confirm("Hapus bot dari daftar approved?")) return;
      try { await rpc("admin_delete_bot",{p_id:b.dataset.botDelete}); toast("Bot dihapus.","success"); await bots(); }
      catch(e){ toast(e.message || "Gagal.","error"); }
    });
  }

  async function pastes() {
    state.pastes = await rpc("admin_pastes",{p_limit:500,p_offset:0});
    content.innerHTML = `
      ${title("Pastelink","Moderasi semua Pastelink yang tersimpan di database.")}
      <div class="panel"><div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Paste</th><th>Creator</th><th>Visibility</th><th>Views</th><th>Dibuat</th><th>Aksi</th></tr></thead>
      <tbody>${state.pastes.map(p => `<tr>
        <td><b>${esc(p.title)}</b><br><a href="/p/${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">/p/${esc(p.slug)}</a></td>
        <td>@${esc(p.creator_username || p.author_name || "anonymous")}</td>
        <td>${esc(p.visibility)}</td><td>${Number(p.views||0).toLocaleString()}</td><td>${date(p.created_at)}</td>
        <td><button class="btn danger" data-del-paste="${p.id}">Delete</button></td>
      </tr>`).join("") || `<tr><td colspan="6" class="empty">Tidak ada paste.</td></tr>`}</tbody></table></div></div>`;
    $$("[data-del-paste]").forEach(b => b.onclick = async () => {
      if (!confirm("Hapus Pastelink ini?")) return;
      try { await rpc("admin_delete_paste",{p_id:b.dataset.delPaste}); toast("Pastelink dihapus.","success"); await pastes(); }
      catch(e){toast(e.message,"error")}
    });
  }

  async function payments() {
    state.payments = await rpc("admin_payments",{p_limit:500,p_offset:0});
    content.innerHTML = `
      ${title("Payments","Pantau semua invoice/payment yang tercatat.")}
      <div class="panel"><div class="table-wrap"><table class="admin-table">
      <thead><tr><th>User</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Reference</th><th>Dibuat</th></tr></thead>
      <tbody>${state.payments.map(p => `<tr>
        <td>@${esc(p.username||"-")}<br><span class="muted">TG ${esc(p.telegram_id||"-")}</span></td>
        <td>${money(p.amount)}</td><td>${esc(p.provider||"-")}</td>
        <td><span class="pill ${p.status==="paid"?"ok":p.status==="failed"?"bad":"warn"}">${esc(p.status||"-")}</span></td>
        <td><code>${esc(p.order_id||p.provider_reference||p.id||"-")}</code></td><td>${date(p.created_at)}</td>
      </tr>`).join("") || `<tr><td colspan="6" class="empty">Tidak ada payment.</td></tr>`}</tbody></table></div></div>`;
  }

  async function transactions() {
    state.transactions = await rpc("admin_transactions",{p_limit:500,p_offset:0});
    content.innerHTML = `
      ${title("Transactions","Audit seluruh mutasi saldo dan transaksi pengguna.")}
      <div class="panel"><div class="table-wrap"><table class="admin-table">
      <thead><tr><th>User</th><th>Type</th><th>Direction</th><th>Amount</th><th>Status</th><th>Reference</th><th>Dibuat</th></tr></thead>
      <tbody>${state.transactions.map(t => `<tr>
        <td>@${esc(t.username||"-")}<br><span class="muted">TG ${esc(t.telegram_id||"-")}</span></td>
        <td>${esc(t.type||"-")}</td><td>${esc(t.direction||"-")}</td><td>${money(t.amount)}</td>
        <td><span class="pill ${t.status==="success"?"ok":t.status==="failed"?"bad":"warn"}">${esc(t.status||"-")}</span></td>
        <td><code>${esc(t.reference_id||"-")}</code></td><td>${date(t.created_at)}</td>
      </tr>`).join("") || `<tr><td colspan="7" class="empty">Tidak ada transaksi.</td></tr>`}</tbody></table></div></div>`;
  }

  async function withdrawals() {
    state.withdrawals = await rpc("admin_withdrawals",{p_limit:500,p_offset:0});
    content.innerHTML = `
      ${title("Withdrawals","Proses request withdraw sampai selesai.")}
      <div class="panel"><div class="table-wrap"><table class="admin-table">
      <thead><tr><th>User</th><th>Ticket</th><th>Mode</th><th>Nominal</th><th>Fee</th><th>Total</th><th>Method</th><th>Account</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${state.withdrawals.map(w => `<tr>
        <td>@${esc(w.username||"-")}<br><span class="muted">TG ${esc(w.telegram_id||"-")}</span></td>
        <td><code>${esc(w.ticket||"-")}</code></td>
        <td>${esc(w.withdrawal_mode||"auto")}</td>
        <td>${money(w.requested_amount??w.amount)}</td>
        <td>${money(w.fee||0)}</td>
        <td>${money(w.total_debit??w.amount)}</td>
        <td>${esc(w.method)}</td>
        <td>${esc(w.account_name)}<br><code>${esc(w.account_number)}</code></td>
        <td><span class="pill ${w.status==="paid"?"ok":w.status==="failed"||w.status==="cancelled"?"bad":"warn"}">${esc(w.status)}</span></td>
        <td><div class="actions">
          <button class="btn" data-w="${w.id}" data-s="processing">Process</button>
          <button class="btn success" data-w="${w.id}" data-s="paid">Paid</button>
          <button class="btn danger" data-w="${w.id}" data-s="failed">Failed/Return</button>
        </div></td>
      </tr>`).join("") || `<tr><td colspan="10" class="empty">Tidak ada withdrawal.</td></tr>`}</tbody></table></div></div>`;
    $$("[data-w]").forEach(b => b.onclick = async () => {
      const note = prompt("Catatan admin (opsional)","") || null;
      try { await rpc("admin_process_withdrawal",{p_id:b.dataset.w,p_status:b.dataset.s,p_note:note}); toast("Status withdraw diperbarui.","success"); await withdrawals(); }
      catch(e){toast(e.message,"error")}
    });
  }

  function showError(e) {
    console.error(e);
    if (content) content.innerHTML = `<div class="panel empty"><i class="fa-solid fa-triangle-exclamation"></i><h2>Admin error</h2><p>${esc(e?.message || "Unknown error")}</p></div>`;
  }

  ensureMasterSession().catch(showError);
})();