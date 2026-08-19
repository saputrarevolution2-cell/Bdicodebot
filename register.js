window.TC_I18N={
id:{
 title:"Buat akunmu 🚀",desc:"Daftar dengan email, Google, atau Telegram lalu mulai membuat PasteLink dan menjual aset digital.",
 google:"Daftar dengan Google",telegram:"Daftar dengan Telegram",or:"atau daftar manual",
 name:"Nama",namePlaceholder:"Nama lengkap",username:"Username Telegram / Username",usernamePlaceholder:"contoh: telecod_creator",
 email:"Gmail / Email",emailPlaceholder:"Alamat email",password:"Password",passwordPlaceholder:"Minimal 8 karakter",
 submit:"Buat Akun",hasAccount:"Sudah punya akun?",login:"Login",
 success:"Akun berhasil dibuat. Jika konfirmasi email aktif, cek inbox sebelum login.",usernameTaken:"Username sudah digunakan atau tidak valid."
},
en:{
 title:"Create your account 🚀",desc:"Register with email, Google, or Telegram and start creating PasteLinks and selling digital assets.",
 google:"Register with Google",telegram:"Register with Telegram",or:"or register manually",
 name:"Name",namePlaceholder:"Your name",username:"Telegram Username / Username",usernamePlaceholder:"example: telecod_creator",
 email:"Gmail / Email",emailPlaceholder:"Email address",password:"Password",passwordPlaceholder:"Minimum 8 characters",
 submit:"Create Account",hasAccount:"Already have an account?",login:"Login",
 success:"Account created. If email confirmation is enabled, check your inbox before logging in.",usernameTaken:"Username is unavailable or invalid."
}};
const sb=supabase.createClient(TELECOD_CONFIG.SUPABASE_URL,TELECOD_CONFIG.SUPABASE_ANON_KEY);

async function googleRegister(){
 const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/dashboard.html"}});
 if(error)document.getElementById("msg").innerHTML=`<div class="error">${tcEscape(error.message)}</div>`;
}
function loadTelegramWidget(){
 const host=document.getElementById("telegramRegister");if(!host)return;
 const s=document.createElement("script");s.async=true;
 s.src="https://telegram.org/js/telegram-widget.js?22";
 s.dataset.telegramLogin=TELECOD_CONFIG.TELEGRAM_BOT_USERNAME;
 s.dataset.size="large";s.dataset.userpic="false";
 s.dataset.onauth="onTelegramAuth(user)";s.dataset.requestAccess="write";
 host.appendChild(s);
}
async function telegramRegister(user){
 const res=await fetch(TELECOD_CONFIG.SUPABASE_URL+TELECOD_CONFIG.TELEGRAM_AUTH_FUNCTION,{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({telegram:user})
 });
 const data=await res.json();
 if(!res.ok||!data.hashed_token){
  document.getElementById("msg").innerHTML=`<div class="error">${tcEscape(data.error||"Telegram registration failed.")}</div>`;return;
 }
 const {error}=await sb.auth.verifyOtp({token_hash:data.hashed_token,type:"magiclink"});
 if(error){document.getElementById("msg").innerHTML=`<div class="error">${tcEscape(error.message)}</div>`;return;}
 location.href="dashboard.html";
}
window.onTelegramAuth=telegramRegister;

document.addEventListener("DOMContentLoaded",()=>{
 document.getElementById("googleRegister").addEventListener("click",googleRegister);
 loadTelegramWidget();
 document.getElementById("form").addEventListener("submit",async e=>{
  e.preventDefault();
  const username=document.getElementById("username").value.trim().replace(/^@/,"");
  const {data:available,error:availabilityError}=await sb.rpc("username_available",{p_username:username});
  if(availabilityError||available!==true){document.getElementById("msg").innerHTML=`<div class="error">${tcT("usernameTaken")}</div>`;return;}
  const {error}=await sb.auth.signUp({
   email:document.getElementById("email").value.trim(),
   password:document.getElementById("password").value,
   options:{data:{display_name:document.getElementById("name").value.trim(),username}}
  });
  if(error){document.getElementById("msg").innerHTML=`<div class="error">${tcEscape(error.message)}</div>`;return;}
  document.getElementById("msg").innerHTML=`<div class="success">${tcT("success")}</div>`;
  e.target.reset();
 });
});