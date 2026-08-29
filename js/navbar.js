document.addEventListener('DOMContentLoaded', async () => {
  const host = document.getElementById('navbar');
  if (!host) return;

  const isAdmin = location.pathname.includes('/admin/');
  const base = isAdmin ? '../' : '';
  let user = null;
  try { user = await TC.user(); } catch (_) {}

  const esc = (v) => TC?.esc ? TC.esc(v) : String(v ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));

  const name = user?.user_metadata?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] || 'User';

  const links = isAdmin ? [
    ['index.html','fa-chart-pie','Overview'],['users.html','fa-users','Users'],
    ['products.html','fa-box','Products'],['orders.html','fa-receipt','Orders'],
    ['payments.html','fa-credit-card','Payments'],['withdrawals.html','fa-money-bill-transfer','Withdrawals'],
    ['transactions.html','fa-arrow-right-arrow-left','Transactions'],['pastes.html','fa-file-lines','Pastes'],
    ['bots.html','fa-robot','Bots'],['logs.html','fa-list','Logs']
  ] : [
    ['dashboard.html','fa-house','Dashboard'],['paste.html','fa-link','Create'],
    ['my-products.html','fa-list','My Links'],['marketplace.html','fa-store','Marketplace'],
    ['wallet.html','fa-wallet','Wallet'],['withdrawals.html','fa-money-bill-transfer','Withdraw'],
    ['transactions.html','fa-arrow-right-arrow-left','Transactions'],['profile.html','fa-user','Profile'],
    ['settings.html','fa-gear','Settings'],['notifications.html','fa-bell','Notifications']
  ];

  host.innerHTML = `
    <header class="navbar">
      <div class="nav-inner">
        <a class="brand" href="${base}${isAdmin ? 'index.html' : 'dashboard.html'}">
          <span class="brand-mark"><i class="fa-solid fa-paper-plane"></i></span>
          <span>PasTele</span>
        </a>
        <button class="nav-toggle" id="navToggle" type="button" aria-label="Buka menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <nav class="nav-links" id="navLinks">
          ${links.map(([href,icon,label]) =>
            `<a href="${base}${href}" data-href="${href}">
              <i class="fa-solid ${icon}"></i><span>${label}</span>
            </a>`).join('')}
        </nav>
        <div class="nav-account">
          <button class="btn nav-theme" id="themeToggle" type="button" title="Tema terang/gelap" aria-label="Ganti tema">
            <i class="fa-solid fa-sun"></i>
          </button>
          <div class="nav-account-info">
            <div class="nav-avatar"><i class="fa-solid fa-user"></i></div>
            <div class="nav-name"><b>${esc(name)}</b><small>${isAdmin ? 'Administrator' : 'Account'}</small></div>
          </div>
          <span class="nav-balance" id="navBalance">Rp 0</span>
        </div>
      </div>
    </header>`;

  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.dataset.href === current) a.classList.add('active');
  });

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = `fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`;
    localStorage.setItem('pastele-theme', theme);
  };
  const saved = localStorage.getItem('pastele-theme');
  applyTheme(saved === 'light' ? 'light' : 'dark');
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });

  document.getElementById('navToggle')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('open');
  });

  if (user && window.sb) {
    try {
      const {data:w} = await sb.from('wallets').select('balance,available_balance').eq('user_id', user.id).maybeSingle();
      const bal = w?.available_balance ?? w?.balance ?? 0;
      const el = document.getElementById('navBalance');
      if (el) el.textContent = TC.money(bal);
    } catch (_) {}
  }
});