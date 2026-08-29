document.addEventListener('DOMContentLoaded', async () => {
  const nameEl = document.getElementById('name');
  const mailEl = document.getElementById('mail');
  const avatarEl = document.getElementById('avatar');
  try {
    const profile = await TC.profile();
    if (!profile) return location.replace('login.html');
    const displayName = profile.display_name || profile.username || 'User';
    if (nameEl) nameEl.textContent = displayName;
    if (mailEl) mailEl.textContent = profile.auth_email || '';
    if (avatarEl) avatarEl.textContent = displayName.slice(0, 1).toUpperCase();
  } catch (_) {
    location.replace('login.html');
  }
});
