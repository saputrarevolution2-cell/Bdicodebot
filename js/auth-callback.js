document.addEventListener('DOMContentLoaded', async () => {
  const message = document.getElementById('m');
  if (!window.sb) return location.replace('setup.html');
  try {
    const { data } = await sb.auth.getSession();
    if (data?.session) return location.replace('dashboard.html');
    if (message) message.textContent = 'Login tidak berhasil. Silakan kembali ke halaman login.';
  } catch (_) {
    if (message) message.textContent = 'Terjadi kesalahan saat menyelesaikan login.';
  }
});
