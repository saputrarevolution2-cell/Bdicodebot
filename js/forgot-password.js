// PasTele — Forgot Password

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot");
  const email = document.getElementById("email");
  const msg = document.getElementById("msg");
  if (!form || !email || !msg || typeof sb === "undefined") return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = email.value.trim();
    if (!value) return;
    msg.textContent = "Mengirim tautan reset…";
    msg.className = "auth-message";
    try {
      const { error } = await sb.auth.resetPasswordForEmail(value, {
        redirectTo: new URL("reset-password.html", location.href).href
      });
      if (error) throw error;
      msg.textContent = "Jika email terdaftar, tautan reset sudah dikirim. Cek Inbox/Spam.";
      msg.className = "auth-message success";
    } catch (error) {
      msg.textContent = error?.message || "Gagal mengirim tautan reset.";
      msg.className = "auth-message error";
    }
  });
});
