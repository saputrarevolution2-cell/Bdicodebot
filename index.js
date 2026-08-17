
window.TC_I18N={
 id:{market:"Marketplace",features:"Fitur",paste:"PasteLink",login:"Login",register:"Daftar",eyebrow:"DIGITAL TELEGRAM MARKETPLACE",
 hero1:"Punya code & media Telegram?",hero2:"Jadikan aset digitalmu bernilai.",heroDesc:"Jual code, bot, media, PasteLink, dan akses digital melalui satu platform premium. Pembeli bisa menemukan aset, checkout, dan mengelola pembelian dari dashboard.",
 start:"Mulai Sekarang",explore:"Jelajahi Marketplace",secure:"Akses aman",fast:"Pengiriman digital cepat",bilingual:"ID / EN",pasteFloat:"Buat, bagikan & lindungi teks.",
 animeTitle:"Create. Sell. Grow.",animeSub:"Bangun katalog digitalmu.",pasteToolTitle:"Paste, simpan & bagikan",pasteToolDesc:"Buat link teks yang rapi, mudah dibagikan, dan bisa dibuat public, unlisted, atau private.",marketToolTitle:"Cari aset digital",marketToolDesc:"Jelajahi code, bot, media, template, channel VIP, dan produk digital lainnya.",sellToolTitle:"Jual karya kamu",sellToolDesc:"Publish produk dan bagikan halaman produkmu ke komunitas Telegram.",
 products:"Produk",sellers:"Creator",pastes:"PasteLink",available:"Platform",discover:"DISCOVER",marketTitle:"Temukan digital asset yang kamu butuhkan.",viewAll:"Lihat semua →",
 featureTitle:"Dibuat untuk creator digital.",featureDesc:"Satu ekosistem untuk discovery, publishing, PasteLink, dan digital access.",f1t:"Code & Bot",f1:"Listing source code, bot, template, dan aset digital yang legal untuk kamu distribusikan.",f2:"Buat paste publik, unlisted, atau private. Cocok untuk snippet, catatan, konfigurasi, dan teks yang ingin dibagikan.",f3t:"Checkout",f3:"Order tersimpan di database dan akses digital mengikuti status pembayaran.",f4t:"Creator Dashboard",f4:"Kelola produk, harga, order, dan aktivitas akun dari satu dashboard.",
 ageTitle:"Konten digital & komunitas",ageDesc:"TeleCod dapat memuat code, media, bot, dan Channel VIP dari pengguna. Dilarang menjual konten ilegal, hasil curian, malware, kredensial, atau materi yang melanggar hak pihak lain.",
 ctaTitle:"Punya aset digital? Mulai jual hari ini.",ctaDesc:"Daftar, buat produk, bagikan link ke Telegram, YouTube, Facebook, X, atau media lain, lalu kelola order dari dashboard.",registerFree:"Daftar Gratis",footerDesc:"Marketplace digital untuk code, bot, media, PasteLink dan akses digital.",links:"Links",legal:"Legal",terms:"Ketentuan",privacy:"Privasi",rights:"All rights reserved.",
 empty:"Belum ada produk yang dipublish."},
 en:{market:"Marketplace",features:"Features",paste:"PasteLink",login:"Login",register:"Register",eyebrow:"DIGITAL TELEGRAM MARKETPLACE",
 hero1:"Have Telegram code & media?",hero2:"Turn your digital assets into value.",heroDesc:"Sell code, bots, media, PasteLinks and digital access from one premium platform. Buyers can discover assets, check out and manage purchases from their dashboard.",
 start:"Get Started",explore:"Explore Marketplace",secure:"Secure access",fast:"Fast digital delivery",bilingual:"EN / ID",pasteFloat:"Create, share & protect your text.",
 animeTitle:"Create. Sell. Grow.",animeSub:"Build your digital catalog.",pasteToolTitle:"Paste, store & share",pasteToolDesc:"Create clean text links that are easy to share and can be public, unlisted or private.",marketToolTitle:"Find digital assets",marketToolDesc:"Explore code, bots, media, templates, VIP channels and other digital products.",sellToolTitle:"Sell your creation",sellToolDesc:"Publish a product and share its product page with your Telegram community.",
 products:"Products",sellers:"Creators",pastes:"PasteLinks",available:"Platform",discover:"DISCOVER",marketTitle:"Find the digital assets you need.",viewAll:"View all →",
 featureTitle:"Built for digital creators.",featureDesc:"One ecosystem for discovery, publishing, PasteLink and digital access.",f1t:"Code & Bot",f1:"List source code, bots, templates and digital assets you are legally allowed to distribute.",f2:"Create public, unlisted or private pastes for snippets, notes, configuration and shareable text.",f3t:"Checkout",f3:"Orders are stored in the database and digital access follows payment status.",f4t:"Creator Dashboard",f4:"Manage products, pricing, orders and account activity from one dashboard.",
 ageTitle:"Digital content & community",ageDesc:"TeleCod may contain code, media, bots and VIP Channels from users. Illegal, stolen, malware, credential or rights-infringing content is prohibited.",
 ctaTitle:"Have a digital asset? Start selling today.",ctaDesc:"Register, create a product, share your link to Telegram, YouTube, Facebook, X or other media, then manage orders from your dashboard.",registerFree:"Register Free",footerDesc:"Digital marketplace for code, bots, media, PasteLinks and digital access.",links:"Links",legal:"Legal",terms:"Terms",privacy:"Privacy",rights:"All rights reserved.",
 empty:"No published products yet."}
};
const sb=supabase.createClient(TELECOD_CONFIG.SUPABASE_URL,TELECOD_CONFIG.SUPABASE_ANON_KEY);
async function loadHome(){
 const [p,s,pa]=await Promise.all([
   sb.from("products").select("id,title,slug,price,thumbnail_url,category,status").eq("status","published").order("created_at",{ascending:false}).limit(6),
   sb.from("profiles").select("id",{count:"exact",head:true}),
   sb.from("pastes").select("id",{count:"exact",head:true})
 ]);
 if(!p.error) renderProducts(p.data||[]);
 const sellers=document.getElementById("statSellers"),pastes=document.getElementById("statPastes");
 if(sellers)sellers.textContent=s.count??"0";if(pastes)pastes.textContent=pa.count??"0";
}
function renderProducts(items){
 const el=document.getElementById("products");if(!el)return;
 document.getElementById("statProducts").textContent=items.length;
 if(!items.length){el.innerHTML=`<div class="empty">${tcT("empty")}</div>`;return}
 el.innerHTML=items.map(x=>`<a class="product" href="product.html?slug=${encodeURIComponent(x.slug)}"><div class="thumb">${x.thumbnail_url?`<img src="${tcEscape(x.thumbnail_url)}" alt="">`:'<i class="fa-solid fa-code"></i>'}</div><div class="pbody"><small>${tcEscape(x.category||"Digital")}</small><h3>${tcEscape(x.title)}</h3><b>${tcMoney(x.price)}</b></div></a>`).join("");
}
window.addEventListener("telecod:language",()=>{loadHome()});
document.addEventListener("DOMContentLoaded",loadHome);
