
/* SOURCE: /js/register.js */
document.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('reg');
  const err = document.getElementById('authError');
  const notice = document.getElementById('authNotice');
  const submit = document.getElementById('submit');

  const hide = el => el?.classList.add('hidden');
  const show = (el, msg) => {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.add('floating-notice', 'show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.classList.add('hidden'), 220);
    }, 5000);
  };

  // Floating toast: visible on top of the page without pushing the form around.
  const toast = (message, type = 'success', duration = 5000) => {
    let box = document.getElementById('pastele-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'pastele-toast';
      box.className = 'pastele-toast';
      document.body.appendChild(box);
    }
    box.className = `pastele-toast ${type}`;
    box.innerHTML = `<span class="pastele-toast-icon">${type === 'success' ? '✓' : '!'}</span><span>${message}</span>`;
    requestAnimationFrame(() => box.classList.add('show'));
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove('show'), duration);
  };

  document.querySelectorAll('.toggle').forEach(button => {
    button.onclick = () => {
      const input = document.getElementById(button.dataset.t);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      button.innerHTML = input.type === 'password'
        ? '<i class="fa-solid fa-eye"></i>'
        : '<i class="fa-solid fa-eye-slash"></i>';
    };
  });

  f.onsubmit = async e => {
    e.preventDefault();
    hide(err);
    hide(notice);

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;

    if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
      return show(err, 'Username hanya boleh berisi huruf, angka, dan underscore.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return show(err, 'Email tidak valid.');
    }
    if (password.length < 6) return show(err, 'Kata sandi minimal 6 karakter.');
    if (password !== confirm) return show(err, 'Konfirmasi kata sandi tidak cocok.');
    if (!window.sb) return show(err, 'Supabase belum terkonfigurasi.');

    submit.disabled = true;
    submit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membuat akun...';

    try {
      const data = await Auth.register(username, email, password);

      // Supabase can return a session immediately when email confirmation is disabled.
      if (data?.session) {
        toast('Akun PasTele berhasil dibuat. Selamat datang!', 'success', 5000);
        submit.innerHTML = '<i class="fa-solid fa-check"></i> Berhasil';
        setTimeout(() => location.replace('dashboard.html'), 900);
        return;
      }

      // If Confirm Email is enabled in Supabase, direct login is intentionally blocked.
      // Keep the message floating and explain exactly what must be changed for direct login.
      toast('Akun berhasil dibuat. Cek Gmail untuk verifikasi akun PasTele.', 'success', 5000);
      show(notice, 'Akun berhasil dibuat. Cek Gmail untuk verifikasi akun PasTele. Jika ingin langsung masuk tanpa verifikasi email, nonaktifkan Confirm email di Supabase Auth.');
      f.reset();
    } catch (x) {
      const message = x?.message || 'Registrasi gagal.';
      toast(message, 'error', 5000);
      show(err, message);
    } finally {
      submit.disabled = false;
      submit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Register';
    }
  };

  document.getElementById('google')?.addEventListener('click', async () => {
    hide(err);
    try {
      await Auth.google();
    } catch (x) {
      const message = x?.message || 'Google login gagal.';
      toast(message, 'error');
      show(err, message);
    }
  });
});


/* ===== Page shell: one canonical footer ===== */
(() => {
 const mount=()=>{
   if(document.getElementById('pasteleFooter')) return;
   document.querySelectorAll('body>footer').forEach(x=>x.remove());
   const admin=location.pathname.includes('/admin/'), base=admin?'../':'';
   const f=document.createElement('footer'); f.id='pasteleFooter'; f.className='pastele-footer';
   f.innerHTML=`<div class="container footer-grid">
    <div class="footer-brand-block"><a class="brand" href="${base}index.html"><span class="brand-mark"><i class="fa-brands fa-telegram"></i></span><span>PasTele</span></a><p>Publish, discover, share, and monetize Telegram links, codes, channels and groups.</p><span class="footer-status"><i class="fa-solid fa-circle-check"></i> Platform ready</span></div>
    <div><b>Platform</b><a href="${base}index.html"><i class="fa-solid fa-house"></i> Home</a><a href="${base}marketplace.html"><i class="fa-solid fa-store"></i> Marketplace</a><a href="${base}paste.html"><i class="fa-solid fa-plus"></i> Create</a></div>
    <div><b>Account</b><a href="${base}dashboard.html"><i class="fa-solid fa-gauge-high"></i> Dashboard</a><a href="${base}profile.html"><i class="fa-solid fa-user"></i> Profile</a><a href="${base}settings.html"><i class="fa-solid fa-gear"></i> Settings</a><button type="button" data-footer-logout><i class="fa-solid fa-right-from-bracket"></i> Log out</button></div>
    <div><b>Support</b><a href="${base}notifications.html"><i class="fa-solid fa-bell"></i> Notifications</a><a href="${base}setup.html"><i class="fa-solid fa-circle-question"></i> Help & setup</a></div>
   </div><div class="container footer-bottom"><span>© 2026 PasTele. All rights reserved.</span><span>Secure · Responsive · Database driven</span></div>`;
   document.body.appendChild(f);
   f.querySelector('[data-footer-logout]')?.addEventListener('click',async()=>{try{await Auth.logout()}catch(e){window.TC?.toast?.(e.message,'error')}});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
