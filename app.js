const T={
id:{home:"Beranda",marketplace:"Marketplace",features:"Fitur",how:"Cara Kerja",about:"Tentang",contact:"Kontak",login:"Login",register:"Register",eyebrow:"PasteLink Telegram All Code & Channel",hero:"PasteLink Telegram All Code & Channel<br>Semua Ada Disini!",pasteTitle:"Buat Pastelink",pasteSub:"Tempel link kamu disini, semua orang bisa membuat tanpa login!",urlPlaceholder:"Tempel link kamu disini...",create:"Buat Link",urlHelp:"Mendukung link dengan http:// dan www. Contoh: https://t.me/channel atau www.example.com",fullEditor:"Buka editor Pastelink lengkap",success:"Link Kamu Berhasil Dibuat!",copy:"Salin",share:"Bagikan:",promoKicker:"Web Telegram All Code & Channel & Group 18+",promoTitle:"Semua Lengkap Ada Disini!",promoText:"Temukan ribuan code bot Telegram, channel premium, group 18+, drama, jav dan masih banyak lagi. Ada yang GRATIS dan ada juga yang PAID dengan kualitas terbaik!",loginRegister:"Login / Register",why:"Kenapa TeleCod?",f1:"Payment Otomatis",f1p:"Punya code bot atau link VIP? Buat di sini dan dapatkan pembayaran otomatis.",f2:"Tambah Banyak Code",f2p:"Semakin banyak code atau link VIP yang kamu tambah, semakin besar cuan kamu!",f3:"Marketplace Lengkap",f3p:"Jual dan beli code bot, channel, group, drama, jav dan media viral lainnya.",f4:"Aman & Terpercaya",f4p:"Sistem aman, anti scam, transaksi transparan dan terpercaya.",f5:"Support 24/7",f5p:"Tim support siap membantu kamu kapan saja jika ada kendala.",categories:"Kategori Marketplace Populer",mainMarket:"Marketplace Utama Kami",marketText:"Semua marketplace lengkap dan ribuan media viral sudah tersedia di bot utama kami di Telegram!",openBot:"Buka @mktplbot",users:"Pengguna Terdaftar",codes:"Code Bot Tersedia",transactions:"Transaksi Berhasil",payments:"Total Pembayaran",featured:"Fitur Unggulan TeleCod",m1:"Buat Pastelink Gratis",m1p:"Buat pastelink tanpa login, cepat, mudah dan gratis selamanya.",m2:"Monetisasi Code",m2p:"Ubah code atau bot link VIP kamu menjadi sumber penghasilan otomatis.",m3:"Dashboard Lengkap",m3p:"Pantau semua statistik, penghasilan dan transaksi secara real-time.",m4:"Withdraw Mudah",m4p:"Tarik saldo kapan saja ke bank, e-wallet atau crypto.",m5:"Multi Bahasa",m5p:"Tersedia dalam bahasa Indonesia & English.",howKicker:"Mudah, cepat, tanpa ribet",howTitle:"Cara Kerja PasteLink",s1:"Tempel Link",s1p:"Masukkan URL Telegram atau tujuan.",s2:"Buat Pastelink",s2p:"Atur judul, URL custom dan konten.",s3:"Bagikan",s3p:"Salin dan bagikan link kamu.",ctaKicker:"Mulai Sekarang",ctaTitle:"Gabung Sekarang Juga!",ctaText:"Raih peluang cuan tanpa batas di TeleCod! Buat, jual, dan dapatkan penghasilan dari setiap code bot atau link VIP yang kamu miliki!",footer:"Platform untuk mendapatkan & menjual code bot, channel & group Telegram.",nav:"Navigasi",legal:"Legal",terms:"Syarat & Ketentuan",privacy:"Kebijakan Privasi",social:"Social Media",rights:"All rights reserved.",editorTitle:"Buat Pastelink",editorSub:"Editor lengkap untuk text, code, gambar dan link.",dbNote:"Data akan disimpan ke Supabase Database setelah konfigurasi."},
en:{home:"Home",marketplace:"Marketplace",features:"Features",how:"How It Works",about:"About",contact:"Contact",login:"Login",register:"Register",eyebrow:"Telegram PasteLink for All Code & Channels",hero:"Telegram PasteLink for All Code & Channels<br>Everything Is Here!",pasteTitle:"Create Pastelink",pasteSub:"Paste your link here. Anyone can create one without logging in!",urlPlaceholder:"Paste your link here...",create:"Create Link",urlHelp:"Supports http:// and www. Example: https://t.me/channel or www.example.com",fullEditor:"Open full Pastelink editor",success:"Your Link Was Created!",copy:"Copy",share:"Share:",promoKicker:"Telegram Web for Code, Channels & 18+ Groups",promoTitle:"Everything You Need Is Here!",promoText:"Discover thousands of Telegram bot codes, premium channels, 18+ groups, drama, JAV and much more. FREE and PAID content with quality options!",loginRegister:"Login / Register",why:"Why TeleCod?",f1:"Automatic Payments",f1p:"Have a bot code or VIP link? Create it here and receive automatic payments.",f2:"Add More Codes",f2p:"The more code or VIP links you add, the more you can earn!",f3:"Complete Marketplace",f3p:"Buy and sell bot codes, channels, groups, drama, JAV and viral media.",f4:"Safe & Trusted",f4p:"Secure system, anti-scam protection, transparent and trusted transactions.",f5:"24/7 Support",f5p:"Our support team is ready to help whenever you have an issue.",categories:"Popular Marketplace Categories",mainMarket:"Our Main Marketplace",marketText:"Thousands of marketplace items and viral media are available through our main Telegram bot!",openBot:"Open @mktplbot",users:"Registered Users",codes:"Bot Codes Available",transactions:"Successful Transactions",payments:"Total Payments",featured:"TeleCod Featured Features",m1:"Free Pastelink",m1p:"Create a pastelink without logging in — fast, easy and free forever.",m2:"Code Monetization",m2p:"Turn your code or VIP bot links into an automatic income stream.",m3:"Complete Dashboard",m3p:"Monitor statistics, earnings and transactions in real time.",m4:"Easy Withdrawals",m4p:"Withdraw anytime to a bank, e-wallet or crypto.",m5:"Multi Language",m5p:"Available in Indonesian & English.",howKicker:"Easy, fast and simple",howTitle:"How PasteLink Works",s1:"Paste a Link",s1p:"Enter a Telegram or destination URL.",s2:"Create Pastelink",s2p:"Set title, custom URL and content.",s3:"Share It",s3p:"Copy and share your link.",ctaKicker:"Start Now",ctaTitle:"Join Us Today!",ctaText:"Unlock unlimited earning opportunities on TeleCod. Create, sell and earn from every bot code or VIP link you own!",footer:"A platform for discovering and selling Telegram bot codes, channels and groups.",nav:"Navigation",legal:"Legal",terms:"Terms & Conditions",privacy:"Privacy Policy",social:"Social Media",rights:"All rights reserved.",editorTitle:"Create Pastelink",editorSub:"Full editor for text, code, images and links.",dbNote:"Data will be stored in Supabase after configuration."}};

let lang=localStorage.getItem("telecod_lang")||"id", theme=localStorage.getItem("telecod_theme")||"dark", authMode="login";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function tr(){document.documentElement.lang=lang;$$("[data-i18n]").forEach(e=>{let v=T[lang][e.dataset.i18n];if(v!=null)e.innerHTML=v});$$("[data-i18n-placeholder]").forEach(e=>e.placeholder=T[lang][e.dataset.i18nPlaceholder]);$("#langBtn").innerHTML=(lang==="id"?"🇮🇩 ID":"🇬🇧 EN")+"⌄";localStorage.setItem("telecod_lang",lang)}
function setTheme(){document.documentElement.classList.toggle("light",theme==="light");$("#themeBtn").innerHTML=theme==="light"?"🌙":"☀️";localStorage.setItem("telecod_theme",theme)}
function toast(m){let t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>t.classList.remove("show"),2600)}
tr();setTheme();$("#year").textContent=new Date().getFullYear();

$("#langBtn").onclick=()=>$("#langMenu").classList.toggle("open");
$$("[data-lang]").forEach(b=>b.onclick=()=>{lang=b.dataset.lang;tr();$("#langMenu").classList.remove("open")});
$("#themeBtn").onclick=()=>{theme=theme==="dark"?"light":"dark";setTheme()};
$("#menuBtn").onclick=()=>$("#navLinks").classList.toggle("mobile");
$$("#navLinks a").forEach(a=>a.onclick=()=>$("#navLinks").classList.remove("mobile"));
$("#hidePaste").onclick=()=>$(".paste-card").classList.add("hidden");

const sbReady=()=>window.supabase && window.TELECOD_SUPABASE_URL && !window.TELECOD_SUPABASE_URL.includes("YOUR-PROJECT");
const sup=sbReady()?window.supabase.createClient(window.TELECOD_SUPABASE_URL,window.TELECOD_SUPABASE_ANON_KEY):null;
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,55);
const randomSlug=()=>Math.random().toString(36).slice(2,9)+Math.random().toString(36).slice(2,6);
function showResult(slug){$("#createdUrl").value=location.origin+"/p/"+slug;$("#success").classList.remove("hidden");$(".paste-card").classList.add("hidden");$("#success").scrollIntoView({behavior:"smooth",block:"center"})}

async function saveQuick(url){
  const payload={slug:randomSlug(),title:"Telegram Link",destination_url:url,content_html:`<p><a href="${url}" rel="nofollow noopener">${url}</a></p>`,visibility:"public"};
  if(!sup){localStorage.setItem("telecod_demo_last",JSON.stringify(payload));return payload.slug}
  const {data,error}=await sup.from("pastelinks").insert(payload).select("slug").single();
  if(error)throw error;return data.slug
}
$("#quickForm").onsubmit=async e=>{e.preventDefault();let u=$("#quickUrl").value.trim();if(!/^https?:\/\//i.test(u)){toast(lang==="id"?"URL harus diawali http:// atau https://":"URL must start with http:// or https://");return}try{let s=await saveQuick(u);showResult(s);$("#quickUrl").value=""}catch(err){console.error(err);toast(err.message||"Database error")}};

$("#copyUrl").onclick=async()=>{try{await navigator.clipboard.writeText($("#createdUrl").value);toast(lang==="id"?"Link disalin":"Link copied")}catch{}};
$$("[data-share]").forEach(b=>b.onclick=()=>{let u=encodeURIComponent($("#createdUrl").value),m={tg:`https://t.me/share/url?url=${u}`,fb:`https://www.facebook.com/sharer/sharer.php?u=${u}`,wa:`https://wa.me/?text=${u}`,x:`https://x.com/intent/post?url=${u}`};window.open(m[b.dataset.share],"_blank")});
$("#closeSuccess").onclick=()=>$("#success").classList.add("hidden");

function openEditor(){$("#editorModal").classList.add("open")}function closeEditor(){$("#editorModal").classList.remove("open")}
$("#openEditor").onclick=openEditor;$("#closeEditor").onclick=closeEditor;$("#editorModal").onclick=e=>{if(e.target.id==="editorModal")closeEditor()};
function cmd(c,v=null){$("#editor").focus();document.execCommand(c,false,v);count()}
$$("#toolbar [data-cmd]").forEach(b=>b.onclick=()=>cmd(b.dataset.cmd));
$$("#toolbar [data-block]").forEach(b=>b.onclick=()=>cmd("formatBlock",b.dataset.block));
$("#linkBtn").onclick=()=>{let u=prompt("URL","https://");if(u)cmd("createLink",u)}
$("#codeBtn").onclick=()=>{let s=getSelection()?.toString()||"code";cmd("insertHTML",`<pre><code>${s.replaceAll("<","&lt;").replaceAll(">","&gt;")}</code></pre>`)}
$("#clearBtn").onclick=()=>{$("#editor").innerHTML="";count()}
$("#imgBtn").onclick=()=>$("#imgFile").click();
$("#imgFile").onchange=e=>{let f=e.target.files?.[0];if(!f)return;let r=new FileReader();r.onload=()=>cmd("insertHTML",`<img src="${r.result}" alt="${f.name}">`);r.readAsDataURL(f)}
function count(){let s=$("#editor").innerText.trim();$("#count").textContent=(s?s.split(/\s+/).length:0)+" words • "+s.length+" chars"}
$("#editor").oninput=count;
$("#editor").onpaste=e=>{let i=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith("image/"));if(!i)return;e.preventDefault();let r=new FileReader();r.onload=()=>cmd("insertHTML",`<img src="${r.result}" alt="Pasted image">`);r.readAsDataURL(i.getAsFile())};

$("#pasteForm").onsubmit=async e=>{
 e.preventDefault();let html=window.DOMPurify?DOMPurify.sanitize($("#editor").innerHTML,{USE_PROFILES:{html:true}}):$("#editor").innerHTML.trim();if(!html){toast(lang==="id"?"Konten belum diisi":"Content is empty");return}
 let s=slugify($("#slug").value.trim())||randomSlug(), exp=$("#expiration").value, expires=null;
 if(exp){let ms={1h:3600000,1d:86400000,7d:604800000,30d:2592000000}[exp];expires=new Date(Date.now()+ms).toISOString()}
 let user=null;if(sup){let r=await sup.auth.getUser();user=r.data.user}
 let payload={slug:s,title:$("#pasteTitle").value.trim()||"Untitled",author_name:$("#pasteAuthor").value.trim()||null,content_html:html,visibility:$("#visibility").value,expires_at:expires,syntax:$("#syntax").value,publish_timeline:$("#timeline").checked,anonymous:$("#anonymous").checked,user_id:user?.id||null};
 try{
   if(sup){let {error}=await sup.from("pastelinks").insert(payload);if(error)throw error}
   else localStorage.setItem("telecod_demo_"+s,JSON.stringify(payload));
   closeEditor();showResult(s);toast(lang==="id"?"Pastelink berhasil disimpan":"Pastelink saved");
 }catch(err){console.error(err);toast(err.message||"Database error")}
};

// Auth
function openAuth(mode){authMode=mode;$("#authModal").classList.add("open");$("#tabLogin").classList.toggle("selected",mode==="login");$("#tabRegister").classList.toggle("selected",mode==="register");$("#authSubmit").textContent=mode==="login"?T[lang].login:T[lang].register;$("#authMessage").textContent=""}
["#loginTop","#loginCta"].forEach(s=>$(s).onclick=()=>openAuth("login"));["#registerTop","#registerCta"].forEach(s=>$(s).onclick=()=>openAuth("register"));
$("#tabLogin").onclick=()=>openAuth("login");$("#tabRegister").onclick=()=>openAuth("register");$("#closeAuth").onclick=()=>$("#authModal").classList.remove("open");
$("#authForm").onsubmit=async e=>{e.preventDefault();if(!sup){$("#authMessage").textContent=lang==="id"?"Konfigurasi Supabase belum diisi.":"Supabase is not configured.";return}let email=$("#authEmail").value.trim(),password=$("#authPassword").value;let r=authMode==="login"?await sup.auth.signInWithPassword({email,password}):await sup.auth.signUp({email,password});if(r.error){$("#authMessage").textContent=r.error.message;return}$("#authMessage").textContent=authMode==="login"?(lang==="id"?"Login berhasil.":"Login successful."):(lang==="id"?"Registrasi berhasil, cek email jika konfirmasi aktif.":"Registration successful; check email if confirmation is enabled.")};

async function stats(){if(!sup)return;try{let {count:c}=await sup.from("pastelinks").select("*",{count:"exact",head:true});if(c!=null)$("#statPastes").textContent=c.toLocaleString()+"+";let {data}=await sup.from("site_stats").select("key,value");(data||[]).forEach(x=>{if(x.key==="users")$("#statUsers").textContent=Number(x.value).toLocaleString()+"+";if(x.key==="transactions")$("#statViews").textContent=Number(x.value).toLocaleString()+"+"})}catch(e){console.warn(e)}}
stats();
