/* TeleCod — safe global UX layer. Business/auth logic remains untouched. */
(()=>{
"use strict";
const LANG="telecod_lang",THEME="telecod_theme";
const lang=()=>localStorage.getItem(LANG)==="en"?"en":"id";
const theme=()=>localStorage.getItem(THEME)==="light"?"light":"dark";
function setTheme(v){
 const t=v==="light"?"light":"dark";localStorage.setItem(THEME,t);
 document.documentElement.dataset.theme=t;
 document.documentElement.classList.toggle("light",t==="light");
 document.documentElement.classList.toggle("dark",t==="dark");
 document.body?.classList.toggle("light",t==="light");
 document.body?.classList.toggle("dark",t==="dark");
 document.querySelectorAll("[data-u-theme-icon]").forEach(x=>x.textContent=t==="light"?"☀️":"🌙");
}
function toggleTheme(){setTheme(theme()==="light"?"dark":"light")}
const authDict={
 id:{"Back to TeleCod":"Kembali ke TeleCod","Safe, fast & easy.":"Aman, cepat & mudah.","Sign in":"Masuk","Register":"Daftar","Register Account":"Daftar Akun","Enter Gmail or username to continue.":"Masukkan Gmail atau username untuk melanjutkan.","Continue":"Lanjutkan","Password":"Kata Sandi","Sign in / Login":"Login / Masuk","Forgot password? Reset password":"Lupa kata sandi? Reset kata sandi","Don’t have an account?":"Belum punya akun?","Register now":"Daftar sekarang","Create username":"Buat username","Enter Gmail":"Masukkan Gmail","Create password":"Buat kata sandi","Confirm Password":"Konfirmasi Kata Sandi","Confirm password":"Konfirmasi kata sandi","Register / Sign up":"Daftar / Register","Register with Gmail":"Daftar dengan Gmail"},
 en:{"Kembali ke TeleCod":"Back to TeleCod","Aman, cepat & mudah.":"Safe, fast & easy.","Masuk":"Sign in","Daftar":"Register","Daftar Akun":"Register Account","Masukkan Gmail atau username untuk melanjutkan.":"Enter Gmail or username to continue.","Lanjutkan":"Continue","Kata Sandi":"Password","Login / Masuk":"Sign in / Login","Lupa kata sandi? Reset kata sandi":"Forgot password? Reset password","Belum punya akun?":"Don’t have an account?","Daftar sekarang":"Register now","Buat username":"Create username","Masukkan Gmail":"Enter Gmail","Buat kata sandi":"Create password","Konfirmasi Kata Sandi":"Confirm Password","Konfirmasi kata sandi":"Confirm password","Daftar / Register":"Register / Sign up","Daftar dengan Gmail":"Register with Gmail"}
};
function translateAuth(){
 const d=authDict[lang()]||{};
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];let n;
 while(n=w.nextNode())nodes.push(n);
 nodes.forEach(x=>{
  const p=x.parentElement;if(!p||["SCRIPT","STYLE","NOSCRIPT"].includes(p.tagName))return;
  const raw=x.nodeValue,key=raw.trim();if(d[key]&&d[key]!==key)x.nodeValue=raw.replace(key,d[key]);
 });
 document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(x=>{
  const v=x.getAttribute("placeholder");if(d[v])x.setAttribute("placeholder",d[v]);
 });
}
function addControls(parent){
 if(!parent||parent.querySelector(".u-controls"))return;
 const wrap=document.createElement("div");wrap.className="u-controls";
 const tb=document.createElement("button");tb.type="button";tb.className="u-theme-btn";tb.setAttribute("aria-label","Toggle theme");tb.innerHTML='<span data-u-theme-icon></span>';tb.onclick=toggleTheme;
 const lb=document.createElement("button");lb.type="button";lb.className="u-lang-btn";lb.setAttribute("aria-label","Change language");lb.textContent=lang().toUpperCase();
 lb.onclick=()=>{const next=lang()==="id"?"en":"id";localStorage.setItem(LANG,next);if(window.TeleCodUI?.setLang)window.TeleCodUI.setLang(next);else location.reload();translateAuth();document.querySelectorAll(".u-lang-btn").forEach(x=>x.textContent=next.toUpperCase());};
 wrap.append(tb,lb);parent.appendChild(wrap);setTheme(theme());
}
function controls(){
 const p=document.querySelector(".header .nav .nav-tools")||document.querySelector(".topbar .top-actions")||document.querySelector(".admin-shell .top-actions");
 if(p)addControls(p);
 else{const shell=document.querySelector(".auth-shell");if(shell&&!shell.querySelector(".u-controls")){const h=document.createElement("div");h.className="u-auth-controls";shell.appendChild(h);addControls(h);}}
 document.querySelectorAll(".u-lang-btn").forEach(x=>x.textContent=lang().toUpperCase());setTheme(theme());
}
function linkify(root=document.body){
 const re=/((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi,w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let n;
 while(n=w.nextNode())nodes.push(n);
 nodes.forEach(node=>{
  const p=node.parentElement;
  if(!p||["SCRIPT","STYLE","NOSCRIPT","A","BUTTON","INPUT","TEXTAREA","SELECT","OPTION","CODE","PRE"].includes(p.tagName))return;
  const text=node.nodeValue;re.lastIndex=0;if(!re.test(text)){re.lastIndex=0;return;}re.lastIndex=0;
  const frag=document.createDocumentFragment();let last=0,m;
  while((m=re.exec(text))){
   if(m.index>last)frag.appendChild(document.createTextNode(text.slice(last,m.index)));
   let raw=m[1],trail="";while(/[),.;!?]+$/.test(raw)){trail=raw.slice(-1)+trail;raw=raw.slice(0,-1);}
   const a=document.createElement("a");a.href=/^www\./i.test(raw)?"https://"+raw:raw;a.target="_blank";a.rel="noopener noreferrer";a.className="tc-auto-link";a.textContent=raw;frag.appendChild(a);
   if(trail)frag.appendChild(document.createTextNode(trail));last=m.index+m[1].length;
  }
  if(last<text.length)frag.appendChild(document.createTextNode(text.slice(last)));
  p.replaceChild(frag,node);
 });
}
function init(){document.documentElement.lang=lang();setTheme(theme());controls();translateAuth();linkify();}
window.TeleCodUnifiedFix={setTheme,toggleTheme,lang,theme,apply:init,linkify};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
const mo=new MutationObserver(()=>{controls();if(!window.__tcLinkifyBusy){window.__tcLinkifyBusy=true;requestAnimationFrame(()=>{window.__tcLinkifyBusy=false;linkify();});}});
mo.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener("storage",e=>{if(e.key===LANG){if(window.TeleCodUI?.setLang)window.TeleCodUI.setLang(lang());translateAuth();controls();}if(e.key===THEME)setTheme(theme());});
})();