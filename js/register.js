
document.addEventListener('DOMContentLoaded',()=>{
 const f=document.getElementById('reg'),err=document.getElementById('authError'),notice=document.getElementById('authNotice');
 const show=(el,msg)=>{el.textContent=msg;el.classList.remove('hidden')},hide=el=>el.classList.add('hidden');
 document.querySelectorAll('.toggle').forEach(b=>b.onclick=()=>{const i=document.getElementById(b.dataset.t);i.type=i.type==='password'?'text':'password';b.innerHTML=i.type==='password'?'<i class="fa-solid fa-eye"></i>':'<i class="fa-solid fa-eye-slash"></i>'});
 f.onsubmit=async e=>{e.preventDefault();hide(err);hide(notice);const username=document.getElementById('username').value.trim(),email=document.getElementById('email').value.trim().toLowerCase(),password=document.getElementById('password').value,confirm=document.getElementById('confirm').value,btn=document.getElementById('submit');
 if(!/^[A-Za-z0-9_]{3,32}$/.test(username))return show(err,'Username hanya boleh berisi huruf, angka, dan underscore.');if(password!==confirm)return show(err,'Konfirmasi kata sandi tidak cocok.');if(!window.sb)return show(err,'Supabase belum dikonfigurasi. Buka setup.html untuk menghubungkan database.');
 btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Membuat akun...';
 try{const data=await Auth.register(username,email,password);if(data.session){location.replace('dashboard.html');return}show(notice,'Akun berhasil dibuat. Silakan cek email untuk konfirmasi, lalu login.');f.reset()}catch(x){show(err,x?.message||'Registrasi gagal.')}finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-user-plus"></i> Register'}};
 document.getElementById('google').onclick=async()=>{try{await Auth.google()}catch(x){show(err,x?.message||'Google login gagal.')}}
});
