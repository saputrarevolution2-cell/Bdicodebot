/* =========================================================
   PasTele — LOGIN FINAL / SELF CONTAINED
   Database-aligned. No config.js / supabase.js / auth.js dependency.
   Uses the same public Supabase project configuration as this project.
   ========================================================= */
(() => {
  "use strict";

  const SUPABASE_URL = "https://jxrndamvelqwhbcromye.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo";

  const $ = id => document.getElementById(id);
  const step1=$("loginStep1"), step2=$("loginStep2"), identifier=$("identifier");
  const identifierWrap=$("identifierWrap"), identifierStatus=$("identifierStatus");
  const verifiedState=$("loginVerifiedState"), verifiedUsername=$("verifiedUsername");
  const continueLogin=$("continueLogin"), accountUsername=$("accountUsername");
  const password=$("password"), toggle=$("toggle"), loginSubmit=$("loginSubmit");
  const loginSubmitText=document.querySelector(".login-submit-text");
  const google=$("google"), changeAccount=$("changeAccount"), securityStatus=$("loginSecurityStatus");
  const accountDisplayName=$("accountDisplayName"), accountAvatar=$("accountAvatar"), turnstileBox=$("loginTurnstile");
  const toast=$("toast"), themeButton=$("themeButton"), footerYear=$("footerYear");

  let sb=null, foundAccount=null, lookupTimer=null, lookupSequence=0, toastTimer=null, loginBusy=false;
  let turnstileWidgetId=null, turnstileToken="";

  const clean=v=>String(v??"").trim();
  const lower=v=>clean(v).toLowerCase();
  const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function toastShow(message,type="error"){
    if(!toast)return;
    clearTimeout(toastTimer);
    const icon=type==="success"?"fa-circle-check":type==="error"?"fa-circle-exclamation":"fa-circle-info";
    toast.className="";
    toast.innerHTML=`<span class="toast-icon"><i class="fa-solid ${icon}"></i></span><span class="toast-message">${esc(message)}</span><button type="button" class="toast-close" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>`;
    toast.classList.add("show",type);
    toast.querySelector(".toast-close")?.addEventListener("click",toastHide,{once:true});
    toastTimer=setTimeout(toastHide,3000);
  }
  function toastHide(){ toast?.classList.remove("show"); }

  function state(s){
    identifierWrap?.classList.remove("is-valid","is-invalid","is-loading");
    identifierStatus?.classList.remove("show","error","loading");
    if(s==="valid"){
      identifierWrap?.classList.add("is-valid"); identifierStatus?.classList.add("show");
      identifierStatus.innerHTML='<i class="fa-solid fa-check"></i>';
    }else if(s==="invalid"){
      identifierWrap?.classList.add("is-invalid"); identifierStatus?.classList.add("show","error");
      identifierStatus.innerHTML='<i class="fa-solid fa-xmark"></i>';
    }else if(s==="loading"){
      identifierWrap?.classList.add("is-loading"); identifierStatus?.classList.add("show","loading");
      identifierStatus.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>';
    }else{
      identifierStatus.innerHTML='<i class="fa-solid fa-check"></i>';
    }
  }

  function createClient(){
    if(sb) return sb;
    if(!window.supabase?.createClient) throw new Error("Library Supabase belum termuat. Refresh halaman.");
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,storageKey:"pastele-auth"}
    });
    window.sb=sb;
    window.supabaseClient=sb;
    return sb;
  }

  function rpcRow(data){
    if(Array.isArray(data)) return data[0]||null;
    return data||null;
  }

  async function lookupAccount(value){
    const client=createClient();
    const v=lower(value);
    if(!v)return null;

    if(isEmail(v)){
      // Database(7): email is resolved through the public-safe profiles query.
      const {data,error}=await client.from("profiles")
        .select("id,username,display_name,auth_email,email,role,status,is_admin,is_banned")
        .or(`auth_email.eq.${v},email.eq.${v}`)
        .maybeSingle();
      if(error) throw error;
      return data||null;
    }

    // Database(7) canonical username resolver.
    const {data,error}=await client.rpc("resolve_username_login",{p_username:v});
    if(error) throw error;
    return rpcRow(data);
  }

  function usable(row){
    return !!row && typeof row==="object" && !!clean(row.username) && row.is_banned!==true;
  }

  function accountName(row){
    return clean(row?.display_name || row?.full_name || row?.name || row?.username || "Pengguna");
  }

  function initials(name){
    const parts=clean(name).split(/\\s+/).filter(Boolean);
    return (parts.slice(0,2).map(x=>x[0]).join("") || "U").toUpperCase();
  }

  function openPassword(row){
    foundAccount=row;
    const uname=clean(row.username)||clean(identifier.value);
    const display=accountName(row);
    if(accountDisplayName) accountDisplayName.textContent=display;
    if(accountUsername) accountUsername.textContent=`@${uname}`;
    if(accountAvatar) accountAvatar.textContent=initials(display);
    verifiedUsername.innerHTML=`<strong>${esc(display)}</strong> · @${esc(uname)} terdaftar`;
    state("valid");
    verifiedState?.classList.remove("hidden");
    continueLogin?.classList.add("hidden");
    step1?.classList.add("account-found");
    step2?.classList.remove("hidden");
    securityStatus.textContent="";
    securityStatus.className="login-security-status";
    renderTurnstile();
    requestAnimationFrame(()=>password?.focus());
  }

  function resetTurnstile(){
    turnstileToken="";
    if(window.turnstile && turnstileWidgetId!==null){
      try{window.turnstile.reset(turnstileWidgetId);}catch(_){}
    }
  }

  function renderTurnstile(){
    if(!turnstileBox)return;
    turnstileBox.classList.remove("hidden");
    const sitekey=clean(turnstileBox.dataset.sitekey);
    if(!sitekey){ security("Verifikasi Cloudflare belum dikonfigurasi.","error"); return; }
    const render=()=>{
      if(!window.turnstile)return;
      if(turnstileWidgetId!==null){
        try{window.turnstile.reset(turnstileWidgetId);}catch(_){}
        return;
      }
      try{
        turnstileWidgetId=window.turnstile.render(turnstileBox,{
          sitekey,
          theme:turnstileBox.dataset.theme||"light",
          language:turnstileBox.dataset.language||"id",
          action:turnstileBox.dataset.action||"login",
          callback:(token)=>{turnstileToken=token; security("Verifikasi Cloudflare berhasil.","success");},
          "expired-callback":()=>{turnstileToken=""; security("Verifikasi Cloudflare kedaluwarsa. Silakan ulangi.","error");},
          "error-callback":()=>{turnstileToken=""; security("Verifikasi Cloudflare gagal. Silakan coba lagi.","error");}
        });
      }catch(e){ console.error("[PasTele Login] Turnstile:",e); }
    };
    if(window.turnstile) render(); else window.addEventListener("load",render,{once:true});
  }

  function resetVisual(){
    state("");
    verifiedState?.classList.add("hidden");
    verifiedUsername.textContent="";
  }

  function back(){
    foundAccount=null; loginBusy=false;
    step2?.classList.add("hidden"); step1?.classList.remove("account-found");
    continueLogin?.classList.remove("hidden");
    password.value="";
    loginSubmit.disabled=false; loginSubmit.classList.remove("loading");
    loginSubmitText.textContent="Masuk";
    securityStatus.textContent=""; securityStatus.className="login-security-status";
    resetTurnstile();
    turnstileBox?.classList.add("hidden");
    resetVisual();
    requestAnimationFrame(()=>identifier?.focus());
  }

  async function check(){
    const seq=++lookupSequence, v=clean(identifier.value);
    if(!v||v.length<3){resetVisual();return;}
    state("loading");
    try{
      const row=await lookupAccount(v);
      if(seq!==lookupSequence)return;
      if(!row){
        foundAccount=null; state("invalid"); resetVisual(); state("invalid"); return;
      }
      if(row.is_banned===true){
        foundAccount=null; state("invalid"); toastShow("Akun kamu telah diblokir.","error"); return;
      }
      if(!usable(row)){
        foundAccount=null; state("invalid"); return;
      }
      openPassword(row);
    }catch(e){
      if(seq!==lookupSequence)return;
      console.error("[PasTele Login] lookup:",e);
      foundAccount=null; state("invalid");
      toastShow("Tidak dapat memeriksa akun. Coba lagi.","error");
    }
  }

  function schedule(){
    clearTimeout(lookupTimer);
    if(step1?.classList.contains("account-found"))return;
    lookupTimer=setTimeout(check,450);
  }

  step1?.addEventListener("submit",async e=>{
    e.preventDefault();
    clearTimeout(lookupTimer);
    if(foundAccount){openPassword(foundAccount);return;}
    await check();
    if(!foundAccount) toastShow("Akun tidak ditemukan. Periksa username atau Gmail kamu.","error");
  });

  identifier?.addEventListener("input",()=>{
    if(foundAccount){back(); identifier.value=clean(identifier.value);}
    resetVisual(); schedule();
  });
  identifier?.addEventListener("keydown",e=>{
    if(e.key==="Enter"){e.preventDefault();clearTimeout(lookupTimer);check();}
  });

  toggle?.addEventListener("click",()=>{
    const show=password.type==="text";
    password.type=show?"password":"text";
    toggle.innerHTML=show?'<i class="fa-regular fa-eye"></i>':'<i class="fa-regular fa-eye-slash"></i>';
  });

  function loading(v){
    loginBusy=v; loginSubmit.disabled=v; loginSubmit.classList.toggle("loading",v);
    loginSubmitText.textContent=v?"Memeriksa...":"Masuk";
  }
  function security(msg,type){
    securityStatus.className=`login-security-status ${type}`;
    securityStatus.innerHTML=`<i class="fa-solid ${type==="success"?"fa-circle-check":"fa-circle-exclamation"}"></i><span>${esc(msg)}</span>`;
  }

  step2?.addEventListener("submit",async e=>{
    e.preventDefault();
    if(loginBusy)return;
    if(!foundAccount){back();return;}
    const pass=String(password.value||"");
    if(!pass){security("Kata sandi wajib diisi.","error");toastShow("Kata sandi wajib diisi.","error");return;}
    if(!turnstileToken){
      security("Selesaikan verifikasi Cloudflare terlebih dahulu.","error");
      toastShow("Selesaikan verifikasi Cloudflare terlebih dahulu.","error");
      return;
    }
    loading(true);
    securityStatus.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i><span>Memverifikasi akun...</span>';
    try{
      const client=createClient();
      // Username must first resolve to the real auth email.
      let email=clean(foundAccount.auth_email||foundAccount.email);
      if(!email && !isEmail(identifier.value)){
        const {data,error}=await client.rpc("resolve_username_login",{p_username:lower(identifier.value)});
        if(error)throw error;
        const row=rpcRow(data);
        email=clean(row?.auth_email||row?.email);
      }
      if(!email)throw new Error("Email autentikasi akun tidak tersedia.");
      const {data,error}=await client.auth.signInWithPassword({email,password:pass});
      if(error)throw error;
      if(!data?.user)throw new Error("Login gagal.");
      if(foundAccount.is_banned===true)throw new Error("Akun kamu telah diblokir.");
      security("Login berhasil. Mengalihkan ke dashboard...","success");
      toastShow("Login berhasil. Selamat datang kembali!","success");
      setTimeout(()=>window.location.replace("/dashboard.html"),650);
    }catch(e){
      console.error("[PasTele Login] sign in:",e);
      const msg=/invalid login credentials/i.test(String(e?.message||""))?"Username/Gmail atau kata sandi salah.":(e?.message||"Login gagal. Coba lagi.");
      security(msg,"error"); toastShow(msg,"error"); loading(false);
    }
  });

  changeAccount?.addEventListener("click",back);

  google?.addEventListener("click",async()=>{
    try{
      createClient();
      google.disabled=true;
      google.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i><span>Menghubungkan Google...</span>';
      const {error}=await sb.auth.signInWithOAuth({
        provider:"google",
        options:{redirectTo:`${window.location.origin}/auth-callback.html`}
      });
      if(error)throw error;
    }catch(e){
      console.error("[PasTele Login] Google:",e);
      toastShow(e?.message||"Login Google gagal.","error");
      google.disabled=false;
      google.innerHTML='<span class="google-icon">G</span><span>Masuk dengan Google</span>';
    }
  });

  themeButton?.addEventListener("click",()=>{
    const current=localStorage.getItem("pastele-theme")||"light";
    const next=current==="dark"?"light":"dark";
    localStorage.setItem("pastele-theme",next);
    document.documentElement.dataset.theme=next;
    themeButton.innerHTML=next==="dark"?'<i class="fa-solid fa-sun"></i>':'<i class="fa-solid fa-moon"></i>';
  });

  function init(){
    if(footerYear)footerYear.textContent=new Date().getFullYear();
    try{
      const mode=localStorage.getItem("pastele-theme")||"light";
      const dark=mode==="dark";
      document.documentElement.dataset.theme=dark?"dark":"light";
      if(themeButton)themeButton.innerHTML=dark?'<i class="fa-solid fa-sun"></i>':'<i class="fa-solid fa-moon"></i>';
    }catch(_){}
    // Supabase library is loaded in login.html. Initialize immediately and expose diagnostics.
    try{createClient();}catch(e){console.error("[PasTele] Supabase init:",e);toastShow("Supabase belum siap. Refresh halaman.","error");}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
