
document.addEventListener("DOMContentLoaded",()=>{
  const step1=document.getElementById("loginStep1");
  const step2=document.getElementById("loginStep2");
  const identifier=document.getElementById("identifier");
  const password=document.getElementById("password");
  const accountInfo=document.getElementById("accountInfo");
  const toggle=document.getElementById("toggle");
  let currentIdentifier="";

  const showError=(msg)=>{
    let el=document.getElementById("loginError");
    if(!el){el=document.createElement("div");el.id="loginError";el.className="auth-error";step1.parentNode.insertBefore(el,step1);}
    el.textContent=msg;
  };
  const clearError=()=>document.getElementById("loginError")?.remove();

  step1.addEventListener("submit",async(e)=>{
    e.preventDefault();
    clearError();
    const value=identifier.value.trim();
    if(!value)return;
    const btn=step1.querySelector("button[type=submit]");
    const old=btn.innerHTML; btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa...';
    try{
      const found=await Auth.lookup(value);
      if(!found?.auth_email) throw new Error("Akun tidak ditemukan.");
      currentIdentifier=value;
      accountInfo.innerHTML='<i class="fa-solid fa-circle-check"></i> Akun ditemukan: <b>'+String(found.auth_email).replace(/[<>&"]/g,"")+'</b>';
      step1.classList.add("hidden");
      step2.classList.remove("hidden");
      password.value="";
      setTimeout(()=>password.focus(),50);
    }catch(err){
      showError(err?.message||"Akun tidak ditemukan.");
    }finally{
      btn.disabled=false; btn.innerHTML=old;
    }
  });

  step2.addEventListener("submit",async(e)=>{
    e.preventDefault();
    clearError();
    if(!currentIdentifier)return;
    const btn=step2.querySelector("button[type=submit]");
    const old=btn.innerHTML; btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Masuk...';
    try{ await Auth.login(currentIdentifier,password.value); }
    catch(err){ showError(err?.message||"Login gagal."); btn.disabled=false; btn.innerHTML=old; }
  });

  document.getElementById('google')?.addEventListener('click',async()=>{ try{ await Auth.google(); }catch(err){ showError(err?.message||'Login Google gagal.'); } });
  document.getElementById('forgot')?.addEventListener('click',async(e)=>{ e.preventDefault(); const email=(currentIdentifier||identifier.value).trim(); if(!email)return; try{ const found=await Auth.lookup(email); if(!found?.auth_email) throw Error('Akun tidak ditemukan.'); const {error}=await sb.auth.resetPasswordForEmail(found.auth_email,{redirectTo:location.origin+'/reset-password.html'}); if(error)throw error; accountInfo.textContent='Link reset kata sandi sudah dikirim ke email.'; }catch(err){ showError(err?.message||'Gagal mengirim reset password.'); } });

  toggle?.addEventListener("click",()=>{
    password.type=password.type==="password"?"text":"password";
    toggle.innerHTML=password.type==="password"?'<i class="fa-solid fa-eye"></i>':'<i class="fa-solid fa-eye-slash"></i>';
  });
});
