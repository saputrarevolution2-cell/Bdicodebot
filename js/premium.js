document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const status = document.getElementById("planStatus");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const profile = await window.TC?.profile?.().catch(() => null);
  if (!profile) {
    const next = encodeURIComponent(window.location.href);
    window.location.href = `login.html?redirect=${next}`;
    return;
  }

  const name = profile.display_name || profile.username || profile.auth_email?.split("@")[0] || "User";
  document.getElementById("planName")?.replaceChildren(document.createTextNode(name), (() => { const s=document.createElement("span"); s.className="verify-badge blue"; s.innerHTML='<i class="fa-solid fa-check"></i>'; return s; })());
  const userEl = document.getElementById("planUsername");
  const avatarEl = document.getElementById("planAvatar");
  if (userEl) userEl.textContent = `@${profile.username || "user"}`;
  if (avatarEl) avatarEl.textContent = name.trim().slice(0, 1).toUpperCase();

  if (profile.is_premium === true && status) {
    status.innerHTML = `<div class="active-plan premium-active"><i class="fa-solid fa-circle-check"></i><div><b>Premium Aktif</b><span>Semua akses Paid sudah terbuka.</span></div></div>`;
  }

  const btn = document.getElementById("premiumBuy");
  btn?.addEventListener("click", async () => {
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan checkout...`;
    try {
      const result = await window.sb.rpc("create_account_plan_order", {
        p_plan: "premium",
        p_days: 0,
        p_amount: 250000
      });
      if (result.error) throw result.error;
      const order = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!order?.order_id) throw new Error("Order pembayaran tidak berhasil dibuat.");
      window.location.href = `payment.html?order_id=${encodeURIComponent(order.order_id)}`;
    } catch (error) {
      window.TC?.toast?.(error?.message || "Checkout gagal dibuat.", "error");
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
});
