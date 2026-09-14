/* PasTele Index — database-aligned, standalone page logic */
window.PASTELE_CONFIG=Object.freeze({SUPABASE_URL:"https://jxrndamvelqwhbcromye.supabase.co",SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo"});
const {SUPABASE_URL,SUPABASE_ANON_KEY}=window.PASTELE_CONFIG;
const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:"pastele-auth"}});
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>new Intl.NumberFormat("id-ID",{notation:"compact",maximumFractionDigits:1}).format(Number(n)||0);
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const typeInfo=t=>({
 pastelink:{label:"PasteLink",icon:"fa-link",route:"p"},
 paste:{label:"Paste",icon:"fa-file-lines",route:"paste"},
 code:{label:"Code",icon:"fa-key",route:"c"},
 channel:{label:"Channel",icon:"fa-tower-broadcast",route:"ch"},
 group:{label:"Group",icon:"fa-users",route:"g"},
 link:{label:"Link",icon:"fa-arrow-up-right-from-square",route:"p"},
 product:{label:"Product",icon:"fa-box-open",route:"p"}
}[String(t||"").toLowerCase()]||{label:"Content",icon:"fa-file",route:"p"});
let items=[],activeFilter="all";

function publicUrl(row){
 const t=String(row.type||"").toLowerCase(), ti=typeInfo(t), access=String(row.access_type||"free").toLowerCase();
 if(t==="code") return `c/${access==="paid"?"p":"f"}/${encodeURIComponent(row.slug)}`;
 if(t==="channel") return `ch/${access==="paid"?"p":"f"}/${encodeURIComponent(row.slug)}`;
 if(t==="group") return `g/${access==="paid"?"p":"f"}/${encodeURIComponent(row.slug)}`;
 if(t==="paste") return `paste/${encodeURIComponent(row.slug)}`;
 return `p/${encodeURIComponent(row.slug)}`;
}
function card(row){
 const ti=typeInfo(row.type), paid=String(row.access_type||"free").toLowerCase()==="paid", thumb=row.thumbnail_url;
 return `<article class="ix-card">
   <a href="${publicUrl(row)}" aria-label="Buka ${esc(row.title)}">
    <div class="ix-thumb">${thumb?`<img src="${esc(thumb)}" alt="" loading="lazy">`:`<i class="fa-solid ${ti.icon}"></i>`}
      <span class="ix-type"><i class="fa-solid ${ti.icon}"></i> ${ti.label}</span>
      <span class="ix-price">${paid?rupiah(row.price):"FREE"}</span>
    </div>
    <div class="ix-card-body">
      <div class="ix-card-title">${esc(row.title||"Untitled")}</div>
      <div class="ix-card-desc">${esc(row.description||"Konten creator PasTele.")}</div>
      <div class="ix-card-meta"><span><i class="fa-solid fa-user"></i> ${esc(row.creator_name||row.creator_username||"Creator")}</span><span><i class="fa-solid fa-eye"></i> ${fmt(row.views)}</span></div>
      <div class="ix-card-footer"><span class="ix-open">Lihat detail <i class="fa-solid fa-arrow-right"></i></span><span class="ix-card-meta"><i class="fa-solid fa-bag-shopping"></i> ${fmt(row.sales_count)}</span></div>
    </div>
   </a>
 </article>`;
}
function render(){
 const grid=$("#marketGrid"), empty=$("#marketEmpty");
 let list=items.filter(x=>activeFilter==="all"||String(x.type).toLowerCase()===activeFilter||(activeFilter==="product"&&["link","product","paste"].includes(String(x.type).toLowerCase())));
 if(!list.length){grid.innerHTML="";empty.classList.remove("hidden");return}
 empty.classList.add("hidden"); grid.innerHTML=list.slice(0,9).map(card).join("");
}
async function loadMarketplace(){
 const grid=$("#marketGrid");
 try{
   const {data,error}=await sb.from("marketplace_public").select("id,slug,title,type,access_type,price,thumbnail_url,description,views,sales_count,category,created_at,creator_name,creator_username,owner_id").order("created_at",{ascending:false}).limit(60);
   if(error) throw error;
   items=data||[]; render(); updateStats();
 }catch(e){console.error(e);grid.innerHTML=`<div class="ix-empty"><i class="fa-solid fa-triangle-exclamation"></i><b>Marketplace belum dapat dimuat</b><span>Silakan coba lagi atau buka halaman Marketplace.</span><a href="marketplace.html" class="ix-btn ix-btn-soft">Buka Marketplace</a></div>`;}
}
async function updateStats(){
 const content=items.length, views=items.reduce((a,x)=>a+(Number(x.views)||0),0), sales=items.reduce((a,x)=>a+(Number(x.sales_count)||0),0);
 $("#statContent").textContent=fmt(content); $("#statViews").textContent=fmt(views); $("#statSales").textContent=fmt(sales); $("#heroSales").textContent=fmt(sales);
 const creators=new Set(items.map(x=>x.owner_id).filter(Boolean)).size; $("#statCreators").textContent=fmt(creators);
}
async function updateAuth(){
 try{
  const {data}=await sb.auth.getSession(), user=data?.session?.user;
  if(user){
    $("#loginBtn").href="dashboard.html";$("#loginBtn").innerHTML='<i class="fa-solid fa-gauge-high"></i><span>Dashboard</span>';
    $("#registerBtn").href="profile.html";$("#registerBtn").innerHTML='<i class="fa-solid fa-user"></i><span>Profil</span>';
    $$(".ix-mobile-menu a[href='login.html']").forEach(a=>{a.href="dashboard.html";a.innerHTML='<i class="fa-solid fa-gauge-high"></i> Dashboard'});
    $$(".ix-mobile-menu a[href='register.html']").forEach(a=>{a.href="profile.html";a.innerHTML='<i class="fa-solid fa-user"></i> Profil'});
  }
 }catch(e){console.warn("auth",e)}
}
function theme(){
 const root=document.documentElement, btn=$("#themeBtn");
 const mode=localStorage.getItem("pastele-theme")||"auto";
 const dark=mode==="dark"||(mode==="auto"&&window.matchMedia("(prefers-color-scheme:dark)").matches);
 root.dataset.theme=dark?"dark":"light"; btn.innerHTML=`<i class="fa-solid ${dark?"fa-sun":"fa-moon"}"></i>`;
 btn.onclick=()=>{const d=root.dataset.theme!=="dark";root.dataset.theme=d?"dark":"light";root.dataset.themeMode=d?"dark":"light";localStorage.setItem("pastele-theme",d?"dark":"light");btn.innerHTML=`<i class="fa-solid ${d?"fa-sun":"fa-moon"}"></i>`};
}
function menu(){
 const b=$("#menuBtn"),m=$("#mobileMenu"); b.onclick=()=>{m.classList.toggle("open");b.innerHTML=`<i class="fa-solid ${m.classList.contains("open")?"fa-xmark":"fa-bars"}"></i>`};
 $$("#mobileMenu a").forEach(a=>a.addEventListener("click",()=>m.classList.remove("open")));
}
document.addEventListener("DOMContentLoaded",()=>{
 $("#year").textContent=new Date().getFullYear(); theme();menu();
 $$("#marketFilter button").forEach(b=>b.addEventListener("click",()=>{$$("#marketFilter button").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;render()}));
 updateAuth();loadMarketplace();
});
