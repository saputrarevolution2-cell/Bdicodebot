
/* SOURCE: /js/reset-password.js */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('f');
  const password = document.getElementById('p');
  const message = document.getElementById('m');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.sb) { message.textContent = 'Supabase belum dikonfigurasi.'; return; }
    const { error } = await sb.auth.updateUser({ password: password.value });
    message.textContent = error ? error.message : 'Password berhasil diubah. Silakan login.';
    if (!error) setTimeout(() => location.replace('login.html'), 1200);
  });
});
