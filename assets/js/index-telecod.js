
const T={
id:{
home:"Beranda",marketplace:"Marketplace",sell:"Jual Code",categories:"Kategori",about:"Tentang",faq:"FAQ",login:"Masuk",register:"Daftar",
search:"Cari code, bot, atau seller...",eyebrow:"Telegram Bot Code Marketplace",hero1:"Temukan & Jual",heroDesc:"Marketplace modern untuk membeli, menjual, dan mengembangkan code bot Telegram. Cepat, aman, dan terpercaya.",safe:"Aman",fast:"Cepat",trusted:"Terpercaya",explore:"Jelajahi Marketplace",sellNow:"Jual Code Sekarang",codeSold:"Code Tersedia",activeSeller:"Seller Aktif",transactions:"Transaksi",members:"Member",popular:"Populer",new:"Terbaru",premium:"Premium",payment:"Payment",popularCode:"Code Populer",communityPick:"Code terbaik pilihan komunitas",viewAll:"Lihat Semua",detail:"Lihat Detail",statsTitle:"Statistik TeleCod",statsDesc:"Bergabung dengan ribuan developer lain",telegramBot:"Telegram Bot,<br>Unlimited Possibilities!",joinText:"Mulai sekarang dan bangun bot impianmu.",startNow:"Mulai Sekarang",whyTitle:"Kenapa Pilih TeleCod?",whyDesc:"Keunggulan yang membuat kami berbeda",safeTrusted:"Aman & Terpercaya",safeDesc:"Transaksi dilindungi sistem escrow yang aman.",fastProcess:"Proses Cepat",fastDesc:"Pembelian & download instan setelah pembayaran.",quality:"Quality Code",qualityDesc:"Code berkualitas dari seller terpercaya.",telegramReady:"Telegram Ready",telegramDesc:"Kompatibel dengan platform Telegram.",howTitle:"Cara Kerja",howDesc:"Total, cepat, dan sederhana",findCode:"Cari Code",findDesc:"Temukan code sesuai kebutuhan.",buy:"Beli",buyDesc:"Lakukan pembayaran dengan metode tersedia.",download:"Download",downloadDesc:"Dapatkan code setelah transaksi berhasil.",deploy:"Deploy",deployDesc:"Jalankan & kembangkan bot Telegrammu.",adultTitle:"Code 18+",adultSub:"Kategori khusus konten dewasa",adultDesc:"Berisi bot untuk kebutuhan konten 18+. Hanya untuk pengguna yang sudah berusia 18+.",adultEnter:"Masuk Kategori 18+",reviewsTitle:"Apa Kata Mereka?",reviewsDesc:"Testimoni dari pengguna TeleCod",joinCommunity:"Bergabung dengan<br>komunitas kami",joinCommunityDesc:"Diskusi, update, dan tips seputar bot Telegram.",joinTelegram:"Join Telegram",haveCode:"Punya Code Bot?",sellStart:"Jual sekarang dan mulai menghasilkan!",sellCode:"Jual Code",viewMarket:"Lihat Marketplace",footerDesc:"Marketplace modern untuk membeli, menjual, dan mengembangkan code bot Telegram.",newsletter:"Dapatkan update terbaru.",help:"Bantuan"
},
en:{
home:"Home",marketplace:"Marketplace",sell:"Sell Code",categories:"Categories",about:"About",faq:"FAQ",login:"Login",register:"Register",
search:"Search code, bot, or seller...",eyebrow:"Telegram Bot Code Marketplace",hero1:"Find & Sell",heroDesc:"A modern marketplace to buy, sell, and build Telegram bot code. Fast, safe, and trusted.",safe:"Safe",fast:"Fast",trusted:"Trusted",explore:"Explore Marketplace",sellNow:"Sell Code Now",codeSold:"Available Code",activeSeller:"Active Sellers",transactions:"Transactions",members:"Members",popular:"Popular",new:"Latest",premium:"Premium",payment:"Payment",popularCode:"Popular Code",communityPick:"Community-picked code",viewAll:"View All",detail:"View Details",statsTitle:"TeleCod Statistics",statsDesc:"Join thousands of other developers",telegramBot:"Telegram Bot,<br>Unlimited Possibilities!",joinText:"Start now and build your dream bot.",startNow:"Start Now",whyTitle:"Why Choose TeleCod?",whyDesc:"Advantages that make us different",safeTrusted:"Safe & Trusted",safeDesc:"Transactions are protected by a secure escrow system.",fastProcess:"Fast Process",fastDesc:"Instant purchase & download after payment.",quality:"Quality Code",qualityDesc:"Quality code from trusted sellers.",telegramReady:"Telegram Ready",telegramDesc:"Compatible with the Telegram platform.",howTitle:"How It Works",howDesc:"Simple, fast, and easy",findCode:"Find Code",findDesc:"Find code that fits your needs.",buy:"Buy",buyDesc:"Pay using the available methods.",download:"Download",downloadDesc:"Get your code after the transaction succeeds.",deploy:"Deploy",deployDesc:"Run and develop your Telegram bot.",adultTitle:"18+ Code",adultSub:"Special adult-content category",adultDesc:"Contains bots for 18+ content. Only for users aged 18 or above.",adultEnter:"Enter 18+ Category",reviewsTitle:"What They Say",reviewsDesc:"Testimonials from TeleCod users",joinCommunity:"Join our<br>community",joinCommunityDesc:"Discussions, updates, and Telegram bot tips.",joinTelegram:"Join Telegram",haveCode:"Have Bot Code?",sellStart:"Sell now and start earning!",sellCode:"Sell Code",viewMarket:"View Marketplace",footerDesc:"A modern marketplace to buy, sell, and build Telegram bot code.",newsletter:"Get the latest updates.",help:"Help"
}};
function setLanguage(lang){
  const dict=T[lang]||T.id;
  localStorage.setItem("telecod_lang",lang);
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{const k=el.dataset.i18n;if(dict[k]!=null)el.innerHTML=dict[k]});
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{const k=el.dataset.i18nPlaceholder;if(dict[k]!=null)el.placeholder=dict[k]});
  document.getElementById("langFlag").textContent=lang==="en"?"🇬🇧":"🇮🇩";
  document.getElementById("langLabel").textContent=lang==="en"?"EN":"ID";
  document.getElementById("footerLang").textContent=lang==="en"?"🇬🇧 EN":"🇮🇩 ID";
}
window.setLanguage=setLanguage;

document.addEventListener("DOMContentLoaded",()=>{
  const lang=localStorage.getItem("telecod_lang")||"id";
  setLanguage(lang);

  document.getElementById("langBtn")?.addEventListener("click",()=>document.getElementById("langMenu")?.classList.toggle("show"));
  document.querySelectorAll("[data-lang]").forEach(b=>b.addEventListener("click",()=>{setLanguage(b.dataset.lang);document.getElementById("langMenu")?.classList.remove("show")}));
  document.getElementById("footerLang")?.addEventListener("click",()=>setLanguage(lang==="id"?"en":"id"));

  document.getElementById("mobileToggle")?.addEventListener("click",()=>{
    document.getElementById("mobileMenu")?.classList.toggle("show");
  });

  document.getElementById("themeBtn")?.addEventListener("click",()=>{
    document.body.classList.toggle("bright");
    const i=document.querySelector("#themeBtn i");
    if(i)i.className=document.body.classList.contains("bright")?"fa-regular fa-sun":"fa-regular fa-moon";
  });

  document.querySelectorAll(".category").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".category").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      const filter=btn.dataset.filter;
      document.querySelectorAll(".product-card").forEach(card=>{
        const tags=(card.dataset.tags||"").split(" ");
        card.classList.toggle("hidden",filter!=="all"&&!tags.includes(filter));
      });
    });
  });

  const search=document.getElementById("navSearch");
  search?.addEventListener("input",()=>{
    const q=search.value.toLowerCase().trim();
    document.querySelectorAll(".product-card").forEach(card=>{
      card.classList.toggle("hidden",q && !card.innerText.toLowerCase().includes(q));
    });
    if(q)document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
});
