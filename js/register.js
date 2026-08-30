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
  };

  // Floating toast: visible on top of the page without pushing the form around.
  const toast = (message, type = 'success', duration = 4200) => {
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
        toast('Akun PasTele berhasil dibuat. Selamat datang!', 'success', 2800);
        submit.innerHTML = '<i class="fa-solid fa-check"></i> Berhasil';
        setTimeout(() => location.replace('dashboard.html'), 900);
        return;
      }

      // If Confirm Email is enabled in Supabase, direct login is intentionally blocked.
      // Keep the message floating and explain exactly what must be changed for direct login.
      toast('Akun berhasil dibuat. Cek Gmail untuk verifikasi akun PasTele.', 'success', 6500);
      show(notice, 'Akun berhasil dibuat. Cek Gmail untuk verifikasi akun PasTele. Jika ingin langsung masuk tanpa verifikasi email, nonaktifkan Confirm email di Supabase Auth.');
      f.reset();
    } catch (x) {
      const message = x?.message || 'Registrasi gagal.';
      toast(message, 'error', 5200);
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
