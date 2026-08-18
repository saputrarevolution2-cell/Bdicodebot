window.TC_I18N={
id:{
 title:"Selamat datang kembali 👋",desc:"Login dengan email, username, Google, atau akun Telegram kamu.",
 google:"Lanjut dengan Google",telegram:"Login dengan Telegram",or:"atau login manual",
 identifier:"Email / Username Telegram",identifierPlaceholder:"Masukkan email atau username",
 password:"Password",passwordPlaceholder:"Masukkan password",submit:"Login",
 noAccount:"Belum punya akun?",register:"Daftar",error:"Terjadi kesalahan saat login.",
 telegramError:"Login Telegram gagal. Pastikan domain website sudah didaftarkan ke BotFather."
},
en:{
 title:"Welcome back 👋",desc:"Log in with your email, username, Google, or Telegram account.",
 google:"Continue with Google",telegram:"Login with Telegram",or:"or use manual login",
 identifier:"Email / Telegram Username",identifierPlaceholder:"Enter email or username",
 password:"Password",passwordPlaceholder:"Enter password",submit:"Login",
 noAccount:"Don't have an account?",register:"Register",error:"Something went wrong while logging in.",
 telegramError:"Telegram login failed. Make sure this website domain is configured in BotFather."
}};
const sb=supabase.createClient(TELECOD_CONFIG.SUPABASE_URL,TELECOD_CONFIG.SUPABASE_ANON_KEY);

function nextPage(){return new URLSearchParams(location.search).get("next")||"dashboard.html";}
function showError(text){document.getElementById("msg").innerHTML=`<div class="error">${tcEscape(text)}</div>`;}

async function loginTelegram(user){
  const msg=document.getElementById("msg");msg.innerHTML="";
  try{
    const res=await fetch(TELECOD_CONFIG.SUPABASE_URL+TELECOD_CONFIG.TELEGRAM_AUTH_FUNCTION,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({telegram:user})
    });
    const data=await res.json();
    if(!res.ok||!data.hashed_token)throw new Error(data.error||tcT("telegramError"));
    const {error}=await sb.auth.verifyOtp({token_hash:data.hashed_token,type:"magiclink"});
    if(error)throw error;
    location.href=nextPage();
  }catch(e){showError(e.message||tcT("telegramError"));}
}
window.onTelegramAuth=loginTelegram;

function loadTelegramWidget(){
  const host=document.getElementById("telegramLogin");if(!host)return;
  if(!TELECOD_CONFIG.TELEGRAM_BOT_USERNAME){host.innerHTML=`<div class="error">TELEGRAM_BOT_USERNAME belum diatur.</div>`;return;}
  const s=document.createElement("script");
  s.async=true;
  s.src="https://telegram.org/js/telegram-widget.js?22";
  s.dataset.telegramLogin=TELECOD_CONFIG.TELEGRAM_BOT_USERNAME;
  s.dataset.size="large";
  s.dataset.userpic="false";
  s.dataset.onauth="onTelegramAuth(user)";
  s.dataset.requestAccess="write";
  host.appendChild(s);
}
document.addEventListener("DOMContentLoaded",()=>{
  loadTelegramWidget();
  document.getElementById("googleLogin").addEventListener("click",async()=>{
    const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:new URLSearchParams(location.search).get("next")?location.origin+"/dashboard.html":location.origin+"/dashboard.html"}});
    if(error)showError(error.message||tcT("error"));
  });
  document.getElementById("form").addEventListener("submit",async e=>{
    e.preventDefault();
    const identifier=document.getElementById("identifier").value.trim();
    let email=identifier;
    if(!identifier.includes("@")){
      const {data,error}=await sb.rpc("resolve_username_login",{p_username:identifier.replace(/^@/,"")});
      if(error||!data){showError(tcT("error"));return;}
      email=data;
    }
    const {error}=await sb.auth.signInWithPassword({email,password:document.getElementById("password").value});
    if(error){showError(error.message||tcT("error"));return;}
    location.href=nextPage();
  });
});