document.addEventListener("DOMContentLoaded", async () => {
  const message = document.getElementById("m");
  const client = window.sb;
  if (!client) {
    location.replace("setup.html");
    return;
  }

  try {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
      // Remove OAuth parameters so refresh cannot replay the callback.
      history.replaceState({}, document.title, location.pathname);
    }

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data?.session) {
      location.replace("dashboard.html");
      return;
    }
    if (message) message.textContent = "Login tidak berhasil. Silakan kembali ke halaman login.";
  } catch (e) {
    console.error("[PasTele OAuth callback]", e);
    if (message) message.textContent = e?.message || "Terjadi kesalahan saat menyelesaikan login.";
  }
});
