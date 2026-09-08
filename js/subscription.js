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
  const nameEl = document.getElementById("planName");
  const userEl = document.getElementById("planUsername");
  const avatarEl = document.getElementById("planAvatar");
  if (nameEl) nameEl.innerHTML = `${esc(name)} <span class="verify-badge green"><i class="fa-solid fa-check"></i></span>`;
  if (userEl) userEl.textContent = `@${profile.username || "user"}`;
  if (avatarEl) avatarEl.textContent = name.trim().slice(0, 1).toUpperCase();

  if (profile.subscription_until) {
    const until = new Date(profile.subscription_until);
    if (until > new Date() && status) {
      status.innerHTML = `<div class="active-plan"><i class="fa-solid fa-circle-check"></i><div><b>Langganan Aktif</b><span>Berlaku sampai ${until.toLocaleString("id-ID", {dateStyle:"medium", timeStyle:"short"})}</span></div></div>`;
    }
  }

  for (const btn of document.querySelectorAll(".plan-buy")) {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const original = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan checkout...`;
      try {
        const plan = btn.dataset.plan;
        const days = Number(btn.dataset.days);
        const amount = Number(btn.dataset.amount);
        const result = await window.sb.rpc("create_account_plan_order", {
          p_plan: plan,
          p_days: days,
          p_amount: amount
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
  }
});
