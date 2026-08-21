(() => {
  const q = s => document.querySelector(s);
  const cfg = window.TELECOD_SUPABASE_URL && window.TELECOD_SUPABASE_ANON_KEY;
  const dict = {
    id:{
      title:"Buat kata sandi baru",sub:"Masukkan kata sandi baru untuk akun TeleCod kamu.",
      password:"Kata sandi baru",confirm:"Konfirmasi kata sandi",save:"Simpan Kata Sandi",
      back:"Kembali ke TeleCod",mismatch:"Konfirmasi kata sandi tidak cocok.",
      short:"Kata sandi minimal 6 karakter.",ok:"Kata sandi berhasil diubah. Silakan login kembali.",
      bad:"Link pemulihan tidak valid atau sudah kedaluwarsa.",config:"Supabase belum dikonfigurasi."
    },
    en:{
      title:"Create a new password",sub:"Enter a new password for your TeleCod account.",
      password:"New password",confirm:"Confirm password",save:"Save Password",
      back:"Back to TeleCod",mismatch:"Passwords do not match.",
      short:"Password must be at least 6 characters.",ok:"Password changed successfully. Please sign in again.",
      bad:"The recovery link is invalid or expired.",config:"Supabase is not configured."
    }
  };
  const lang = localStorage.getItem("telecod_lang")==="en" ? "en":"id";
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-r]").forEach(el => el.textContent=dict[lang][el.dataset.r]);

  document.querySelectorAll("[data-toggle]").forEach(btn=>{
    btn.onclick=()=>{
      const input=q("#"+btn.dataset.toggle);
      input.type=input.type==="password"?"text":"password";
      btn.textContent=input.type==="password"?"👁":"🙈";
    };
  });

  function toast(message, type="error"){
    const box=q("#resetToast");
    box.textContent=message;
    box.dataset.type=type;
    box.classList.add("show");
    clearTimeout(window.__resetToast);
    window.__resetToast=setTimeout(()=>box.classList.remove("show"),4500);
  }

  if(!cfg){
    toast(dict[lang].config);
    return;
  }

  const supabase = window.supabase.createClient(
    window.TELECOD_SUPABASE_URL,
    window.TELECOD_SUPABASE_ANON_KEY
  );

  supabase.auth.getSession().then(({data,error})=>{
    if(error || !data.session) toast(dict[lang].bad);
  });

  q("#resetForm").onsubmit=async e=>{
    e.preventDefault();
    const p=q("#newPassword").value;
    const c=q("#confirmPassword").value;
    if(p.length<6) return toast(dict[lang].short);
    if(p!==c) return toast(dict[lang].mismatch);
    const {error}=await supabase.auth.updateUser({password:p});
    if(error) return toast(error.message);
    toast(dict[lang].ok,"success");
    setTimeout(()=>location.href="index.html",1500);
  };
})();
