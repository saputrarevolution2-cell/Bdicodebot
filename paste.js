
window.TC_I18N={id:{market:"Marketplace",features:"Fitur",login:"Login",register:"Daftar",title:"Buat & bagikan PasteLink.",desc:"Simpan teks, snippet, konfigurasi, atau catatan dalam satu link yang mudah dibagikan.",point1:"Link mudah dibagikan",point2:"Kontrol privasi",point3:"Akses cepat",free:"GRATIS",labelTitle:"Judul",titlePlaceholder:"Contoh: API configuration",content:"Konten",contentPlaceholder:"Tempel teks, code, catatan, atau konfigurasi di sini...",visibility:"Visibilitas",public:"Public",unlisted:"Unlisted",private:"Private",password:"Password",optional:"Opsional",submit:"Buat PasteLink",success:"Paste berhasil dibuat.",open:"Buka PasteLink",privateLogin:"Login diperlukan untuk PasteLink private."},en:{market:"Marketplace",features:"Features",login:"Login",register:"Register",title:"Create & share PasteLink.",desc:"Store text, snippets, configuration or notes in one clean, shareable link.",point1:"Shareable link",point2:"Privacy controls",point3:"Fast access",free:"FREE",labelTitle:"Title",titlePlaceholder:"Example: API configuration",content:"Content",contentPlaceholder:"Paste text, code, notes or configuration here...",visibility:"Visibility",public:"Public",unlisted:"Unlisted",private:"Private",password:"Password",optional:"Optional",submit:"Create PasteLink",success:"Paste created successfully.",open:"Open PasteLink",privateLogin:"Login is required for a private PasteLink."}};
const sb=supabase.createClient(TELECOD_CONFIG.SUPABASE_URL,TELECOD_CONFIG.SUPABASE_ANON_KEY);
document.addEventListener("DOMContentLoaded",()=>document.getElementById("pasteForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const msg=document.getElementById("msg");msg.innerHTML="";
 const {data:{user}}=await sb.auth.getUser();
 const visibility=document.getElementById("visibility").value;
 if(visibility==="private"&&!user){msg.innerHTML=`<div class="error">${tcT("privateLogin")}</div>`;return;}
 const slug=crypto.randomUUID().replaceAll("-","").slice(0,12);
 const {data,error}=await sb.rpc("create_paste",{
   p_title:document.getElementById("title").value.trim(),
   p_slug:slug,
   p_content:document.getElementById("content").value,
   p_visibility:visibility,
   p_password:document.getElementById("pass").value||null
 });
 if(error){msg.innerHTML=`<div class="error">${tcEscape(error.message)}</div>`;return;}
 msg.innerHTML=`<div class="success">${tcT("success")} <a href="paste-view.html?slug=${encodeURIComponent(slug)}">${tcT("open")}</a></div>`;
 e.target.reset();
}));
