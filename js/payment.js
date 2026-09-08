document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const orderId = qs.get("order_id");
  const money = (v) => window.TC?.money ? window.TC.money(Number(v || 0)) : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v || 0));
  const esc = (v) => window.TC?.esc ? window.TC.esc(v) : String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));

  const loading = $("paymentLoading");
  const content = $("paymentContent");
  const errorBox = $("paymentError");
  const qr = $("qrWrap");
  const urlBtn = $("cashUrl");
  const check = $("checkPayment");
  let timer = null;
  let creating = false;

  const fail = (msg) => {
    if (loading) loading.hidden = true;
    if (content) content.hidden = true;
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${esc(msg)}`;
    }
  };

  const renderStatus = (status) => {
    const s = String(status || "pending").toLowerCase();
    $("paymentStatusPill").textContent = s.toUpperCase();
    const title = $("paymentStatusTitle");
    const text = $("paymentStatusText");
    const icon = $("statusIcon");

    if (["paid", "success", "completed"].includes(s)) {
      icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      title.textContent = "Pembayaran berhasil";
      text.textContent = "Pembayaran sudah diverifikasi. Membuka halaman sukses...";
      clearInterval(timer);
      setTimeout(() => location.href = `payment-success.html?order_id=${encodeURIComponent(orderId)}`, 700);
      return true;
    }

    if (["failed", "cancelled", "canceled", "expired"].includes(s)) {
      icon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
      title.textContent = "Pembayaran tidak berhasil";
      text.textContent = "Order ini tidak lagi dapat dibayar. Silakan buat transaksi baru.";
      clearInterval(timer);
      return false;
    }

    icon.innerHTML = '<i class="fa-solid fa-clock"></i>';
    title.textContent = "Menunggu pembayaran";
    text.textContent = "Scan QRIS Cashi. Setelah pembayaran selesai, status akan diverifikasi otomatis.";
    return false;
  };

  const loadOrder = async () => {
    const r = await window.sb.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) throw new Error("Order tidak ditemukan atau tidak dapat diakses.");
    return r.data;
  };

  const createPayment = async (order) => {
    if (creating) return;
    creating = true;
    qr.innerHTML = '<div class="qr-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Membuat QRIS Cashi...</span></div>';

    const cfg = window.PASTELE_CONFIG || {};
    const base = String(cfg.SUPABASE_URL || "").replace(/\/$/, "");
    if (!base) throw new Error("SUPABASE_URL belum dikonfigurasi.");

    const session = await window.sb.auth.getSession();
    const token = session.data?.session?.access_token || "";
    if (!token) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");

    const r = await fetch(`${base}/functions/v1/create-cashi-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ order_id: order.id })
    });

    const p = await r.json().catch(() => ({}));
    if (!r.ok || p?.success === false) throw new Error(p.error || p.message || "Cashi gagal membuat pembayaran.");

    // Cashi's documented QR field is exactly `qrUrl` and contains a data:image/png URL.
    const qrUrl = p.qrUrl || p.qr_url || p.qr_image || p.qris_image || "";
    const paymentUrl = p.checkout_url || p.payment_url || "";

    if (qrUrl) {
      qr.innerHTML = `
        <div class="qr-title"><i class="fa-solid fa-qrcode"></i><span>Scan QRIS Cashi</span></div>
        <img class="cashi-qr-image" src="${esc(qrUrl)}" alt="QRIS Cashi" loading="eager" decoding="async">
        <small class="qr-hint">Buka aplikasi bank/e-wallet kamu lalu scan QR di atas.</small>
      `;
    } else {
      qr.innerHTML = '<div class="qr-loading"><i class="fa-solid fa-circle-exclamation"></i><span>CashI tidak mengembalikan QR. Silakan buka pembayaran Cashi.</span></div>';
    }

    if (paymentUrl) {
      urlBtn.hidden = false;
      urlBtn.href = paymentUrl;
    }

    creating = false;
  };

  const checkGatewayStatus = async () => {
    const cfg = window.PASTELE_CONFIG || {};
    const base = String(cfg.SUPABASE_URL || "").replace(/\/$/, "");
    const session = await window.sb.auth.getSession();
    const token = session.data?.session?.access_token || "";
    if (!token) return null;
    const r = await fetch(`${base}/functions/v1/check-cashi-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order_id: orderId })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return null;
    return d;
  };

  try {
    const user = await window.TC?.user?.().catch(() => null);
    if (!user) {
      const next = encodeURIComponent(location.href);
      location.href = `login.html?redirect=${next}`;
      return;
    }
    if (!orderId) throw new Error("order_id tidak ditemukan.");

    const order = await loadOrder();
    $("orderId").textContent = order.id;
    $("orderAmount").textContent = money(order.amount);
    $("orderTitle").textContent = order.item_title || "PasTele Order";
    $("orderType").textContent = String(order.item_type || "Pembayaran").replace(/_/g, " ");

    $("copyOrder").onclick = () => navigator.clipboard?.writeText(String(order.id)).then(() => window.TC?.toast?.("Order ID disalin.", "success"));
    content.hidden = false;
    loading.hidden = true;

    if (renderStatus(order.status)) return;
    if (!["failed", "cancelled", "canceled", "expired"].includes(String(order.status || "").toLowerCase())) {
      await createPayment(order);
    }

    const poll = async () => {
      const latest = await loadOrder();
      if (renderStatus(latest.status)) return;
      // Webhook is authoritative; this fallback also asks Cashi directly through our server function.
      const gateway = await checkGatewayStatus().catch(() => null);
      if (gateway?.status) renderStatus(String(gateway.status).toLowerCase() === "settled" ? "paid" : latest.status);
    };

    timer = setInterval(poll, 5000);
    check.onclick = async () => {
      check.disabled = true;
      try {
        await poll();
        window.TC?.toast?.("Status pembayaran diperbarui.", "success");
      } catch (e) {
        window.TC?.toast?.(e.message || "Gagal mengecek status.", "error");
      } finally {
        check.disabled = false;
      }
    };

    window.addEventListener("beforeunload", () => clearInterval(timer));
  } catch (e) {
    console.error("[PasTele Payment]", e);
    fail(e?.message || "Pembayaran gagal disiapkan.");
  }
});
