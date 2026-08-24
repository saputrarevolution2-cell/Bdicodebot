/* =========================================================
   TELECOD — FRONTEND CORE
   Full fixed / hardened version
   ========================================================= */

"use strict";

/* =========================================================
   TRANSLATIONS
   ========================================================= */

const T = {
  id: {
    home:"Beranda",
    marketplace:"Marketplace",
    features:"Fitur",
    how:"Cara Kerja",
    about:"Tentang",
    contact:"Kontak",
    login:"Login",
    register:"Register",

    eyebrow:"PasteLink Telegram All Code & Channel",
    hero:"PasteLink Telegram All Code & Channel<br>Semua Ada Disini!",

    heroEyebrow:"Platform Code Telegram Terlengkap di Indonesia",
    heroTitle:"Kumpulan <span>Kode Telegram</span><br> dalam Satu Platform",
    heroDescription:"Temukan, bagikan, dan dapatkan berbagai code bot, script, channel tools, dan source code Telegram terbaik dengan mudah, aman, dan terpercaya.",
    heroStart:"Mulai Sekarang",
    heroMarketplace:"Jelajahi Marketplace",
    heroTrust1:"Aman & Terpercaya",
    heroTrust2:"Update Terbaru",
    heroTrust3:"Banyak Pilihan",
    heroTrust4:"Gratis & Premium",
    heroStatUsers:"Pengguna Aktif",
    heroStatCodes:"Code Tersedia",
    heroStatSecurity:"Transaksi Aman",
    heroStatSupport:"Dukungan",

    pasteTitle:"Buat Pastelink",
    pasteSub:"Tempel link kamu disini, semua orang bisa membuat tanpa login!",
    urlPlaceholder:"Tempel link kamu disini...",
    create:"Buat Link",
    urlHelp:"Mendukung link dengan http:// dan www. Contoh: https://t.me/channel atau www.example.com",
    fullEditor:"Buka editor Pastelink lengkap",

    success:"Link Kamu Berhasil Dibuat!",
    copy:"Salin",
    share:"Bagikan:",

    promoKicker:"Web Telegram All Code & Channel & Group 18+",
    promoTitle:"Semua Lengkap Ada Disini!",
    promoText:"Temukan ribuan code bot Telegram, channel premium, group 18+, drama, jav dan masih banyak lagi. Ada yang GRATIS dan ada juga yang PAID dengan kualitas terbaik!",
    loginRegister:"Login / Register",

    why:"Kenapa TeleCod?",

    f1:"Payment Otomatis",
    f1p:"Punya code bot atau link VIP? Buat di sini dan dapatkan pembayaran otomatis.",

    f2:"Tambah Banyak Code",
    f2p:"Semakin banyak code atau link VIP yang kamu tambah, semakin besar cuan kamu!",

    f3:"Marketplace Lengkap",
    f3p:"Jual dan beli code bot, channel, group, drama, jav dan media viral lainnya.",

    f4:"Aman & Terpercaya",
    f4p:"Sistem aman, anti scam, transaksi transparan dan terpercaya.",

    f5:"Support 24/7",
    f5p:"Tim support siap membantu kamu kapan saja jika ada kendala.",

    categories:"Kategori Marketplace Populer",
    catCode:"CODE BOT",
    catChannel:"TELEGRAM CHANNEL",
    catFree:"FREE",
    catPaid:"PREMIUM / PAID",
    mainMarket:"Marketplace Utama Kami",
    marketText:"Semua marketplace lengkap dan ribuan media viral sudah tersedia di bot utama kami di Telegram!",
    openBot:"Buka @mktplbot",

    users:"Pengguna Terdaftar",
    codes:"Code Bot Tersedia",
    transactions:"Transaksi Berhasil",
    payments:"Total Pembayaran",

    featured:"Fitur Unggulan TeleCod",

    m1:"Buat Pastelink Gratis",
    m1p:"Buat pastelink tanpa login, cepat, mudah dan gratis selamanya.",

    m2:"Monetisasi Code",
    m2p:"Ubah code atau bot link VIP kamu menjadi sumber penghasilan otomatis.",

    m3:"Dashboard Lengkap",
    m3p:"Pantau semua statistik, penghasilan dan transaksi secara real-time.",

    m4:"Withdraw Mudah",
    m4p:"Tarik saldo kapan saja ke bank, e-wallet atau crypto.",

    m5:"Multi Bahasa",
    m5p:"Tersedia dalam bahasa Indonesia & English.",

    howKicker:"Mudah, cepat, tanpa ribet",
    howTitle:"Cara Kerja PasteLink",

    s1:"Tempel Link",
    s1p:"Masukkan URL Telegram atau tujuan.",

    s2:"Buat Pastelink",
    s2p:"Atur judul, URL custom dan konten.",

    s3:"Bagikan",
    s3p:"Salin dan bagikan link kamu.",

    ctaKicker:"Mulai Sekarang",
    ctaTitle:"Gabung Sekarang Juga!",
    ctaText:"Raih peluang cuan tanpa batas di TeleCod! Buat, jual, dan dapatkan penghasilan dari setiap code bot atau link VIP yang kamu miliki!",

    footer:"Platform untuk mendapatkan & menjual code bot, channel & group Telegram.",
    nav:"Navigasi",
    legal:"Legal",
    terms:"Syarat & Ketentuan",
    privacy:"Kebijakan Privasi",
    social:"Social Media",
    rights:"All rights reserved.",

    editorTitle:"Buat Pastelink",
    editorSub:"Editor lengkap untuk text, code, gambar dan link.",

    authWelcome:"Aman, cepat & mudah.",

    loginTitle:"Masuk ke TeleCod",
    loginSub:"Gunakan username Telegram dan kata sandi kamu.",

    usernameTelegram:"Username Telegram",
    usernamePlaceholder:"@username",

    password:"Kata sandi",
    passwordPlaceholder:"Masukkan kata sandi",
    passwordMinPlaceholder:"Minimal 6 karakter",

    confirmPassword:"Konfirmasi kata sandi",
    confirmPasswordPlaceholder:"Ulangi kata sandi",

    telegramNumber:"No Telegram",
    telegramNumberPlaceholder:"+62xxxxxxxxxx",

    agreeTerms:"Saya menyetujui Ketentuan & Kebijakan TeleCod",

    forgotPassword:"Lupa kata sandi?",

    orContinue:"Atau masuk dengan",
    orRegisterWith:"Atau daftar dengan",

    continueTelegram:"Telegram",

    noAccount:"Belum punya akun?",
    registerNow:"Daftar sekarang",

    hasAccount:"Sudah punya akun?",
    loginNow:"Masuk sekarang",

    registerTitle:"Buat akun TeleCod",
    registerSub:"Daftar dengan data Telegram kamu.",

    forgotTitle:"Lupa kata sandi?",
    forgotSub:"Gunakan Telegram untuk memulihkan akses.",

    recoveryTelegramTitle:"Pemulihan aman melalui Telegram",
    recoveryTelegramText:"Masuk dengan Telegram untuk memverifikasi akun. Setelah berhasil, kamu dapat melanjutkan pemulihan akun.",

    recoverWithTelegram:"Pulihkan dengan Telegram",
    backToLogin:"Kembali ke Login",

    termsRequired:"Kamu harus menyetujui Ketentuan & Kebijakan TeleCod.",
    invalidUsername:"Username Telegram harus 3–32 karakter.",
    invalidPhone:"Nomor Telegram tidak valid.",
    passwordMismatch:"Konfirmasi kata sandi tidak cocok.",
    passwordShort:"Kata sandi minimal 6 karakter.",

    authConfig:"Supabase belum dikonfigurasi.",
    loginSuccess:"Login berhasil.",
    registerSuccess:"Registrasi berhasil.",

    telegramConfig:"Login Telegram belum dikonfigurasi. Isi TELECOD_TELEGRAM_BOT_USERNAME dan deploy Edge Function Telegram.",

    telegramStart:"Membuka autentikasi Telegram...",

    forgotInfo:"Untuk keamanan, pemulihan dilakukan melalui verifikasi Telegram.",


    addChannel:"Tambah Channel",
    addChannelSub:"Gratis / Berbayar",
    addCode:"Tambah Code",
    addCodeSub:"Gratis / Berbayar",
    all:"Semua",
    changeLanguage:"Ganti Bahasa",
    channel:"Channel",
    code:"Code",
    ctaDevice:"Telegram Marketplace",
    fast:"Proses Cepat",
    featuredSub:"Semua kebutuhan Telegram kamu dalam satu platform.",
    free:"Gratis",
    freeAccessText:"Bisa dibuat dan diambil tanpa login.",
    freeAccessTitle:"Gratis",
    guestPurchaseText:"Pembeli tidak wajib memiliki akun.",
    guestPurchaseTitle:"Pembelian Guest",
    howDescription:"Buat PasteLink, temukan produk marketplace, atau jual code Telegram kamu dalam beberapa langkah.",
    latestMarketplace:"Code & Channel Terbaru",
    latestMarketplaceSub:"Temukan code bot dan channel Telegram dari creator TeleCod.",
    loadingMarketplace:"Memuat marketplace...",
    loadingMarketplaceSub:"Mengambil produk terbaru.",
    marketCreateText:"Tambahkan produk GRATIS tanpa login atau jual produk BERBAYAR setelah login/register.",
    marketCreateTitle:"Punya Code atau Channel?",
    marketEmptyText:"Belum ada produk yang sesuai dengan pencarian kamu.",
    marketEmptyTitle:"Produk belum tersedia",
    marketErrorText:"Silakan coba beberapa saat lagi.",
    marketErrorTitle:"Marketplace tidak dapat dimuat",
    openDashboard:"Buka Dashboard",
    paid:"Berbayar",
    paidAccessText:"Creator wajib login untuk menjual.",
    paidAccessTitle:"Berbayar",
    resetFilter:"Reset Filter",
    retry:"Coba Lagi",
    s4:"Bagikan",
    s4p:"Salin link dan bagikan ke Telegram, WhatsApp atau media sosial lainnya.",
    secure:"Sistem Aman",
    startSelling:"Mulai Jual",
    support:"Support",
    telegramConnected:"Terhubung dengan Telegram",
    tryNow:"Coba Sekarang",
    viewMarketplace:"Lihat Semua Marketplace",
    withdraw:"Withdraw",
    authError:"Terjadi kesalahan autentikasi.",
    dbNote:"Data akan disimpan ke Supabase Database setelah konfigurasi."
  },

  en: {
    home:"Home",
    marketplace:"Marketplace",
    features:"Features",
    how:"How It Works",
    about:"About",
    contact:"Contact",
    login:"Login",
    register:"Register",

    eyebrow:"Telegram PasteLink for All Code & Channels",
    hero:"Telegram PasteLink for All Code & Channels<br>Everything Is Here!",

    heroEyebrow:"The Complete Telegram Code Platform in Indonesia",
    heroTitle:"Telegram <span>Code Collection</span><br> in One Platform",
    heroDescription:"Discover, share, and get bot code, scripts, channel tools, and high-quality Telegram source code in one easy, secure, and trusted platform.",
    heroStart:"Get Started",
    heroMarketplace:"Explore Marketplace",
    heroTrust1:"Safe & Trusted",
    heroTrust2:"Latest Updates",
    heroTrust3:"More Choices",
    heroTrust4:"Free & Premium",
    heroStatUsers:"Active Users",
    heroStatCodes:"Available Code",
    heroStatSecurity:"Secure Transactions",
    heroStatSupport:"Support",

    pasteTitle:"Create Pastelink",
    pasteSub:"Paste your link here. Anyone can create one without logging in!",
    urlPlaceholder:"Paste your link here...",
    create:"Create Link",
    urlHelp:"Supports http:// and www. Example: https://t.me/channel or www.example.com",
    fullEditor:"Open full Pastelink editor",

    success:"Your Link Was Created!",
    copy:"Copy",
    share:"Share:",

    promoKicker:"Telegram Web for Code, Channels & 18+ Groups",
    promoTitle:"Everything You Need Is Here!",
    promoText:"Discover thousands of Telegram bot codes, premium channels, 18+ groups, drama, JAV and much more. FREE and PAID content with quality options!",
    loginRegister:"Login / Register",

    why:"Why TeleCod?",

    f1:"Automatic Payments",
    f1p:"Have a bot code or VIP link? Create it here and receive automatic payments.",

    f2:"Add More Codes",
    f2p:"The more code or VIP links you add, the more you can earn!",

    f3:"Complete Marketplace",
    f3p:"Buy and sell bot codes, channels, groups, drama, JAV and viral media.",

    f4:"Safe & Trusted",
    f4p:"Secure system, anti-scam protection, transparent and trusted transactions.",

    f5:"24/7 Support",
    f5p:"Our support team is ready to help whenever you have an issue.",

    categories:"Popular Marketplace Categories",
    catCode:"CODE BOT",
    catChannel:"TELEGRAM CHANNEL",
    catFree:"FREE",
    catPaid:"PREMIUM / PAID",
    mainMarket:"Our Main Marketplace",
    marketText:"Thousands of marketplace items and viral media are available through our main Telegram bot!",
    openBot:"Open @mktplbot",

    users:"Registered Users",
    codes:"Bot Codes Available",
    transactions:"Successful Transactions",
    payments:"Total Payments",

    featured:"TeleCod Featured Features",

    m1:"Free Pastelink",
    m1p:"Create a pastelink without logging in — fast, easy and free forever.",

    m2:"Code Monetization",
    m2p:"Turn your code or VIP bot links into an automatic income stream.",

    m3:"Complete Dashboard",
    m3p:"Monitor statistics, earnings and transactions in real time.",

    m4:"Easy Withdrawals",
    m4p:"Withdraw anytime to a bank, e-wallet or crypto.",

    m5:"Multi Language",
    m5p:"Available in Indonesian & English.",

    howKicker:"Easy, fast and simple",
    howTitle:"How PasteLink Works",

    s1:"Paste a Link",
    s1p:"Enter a Telegram or destination URL.",

    s2:"Create Pastelink",
    s2p:"Set title, custom URL and content.",

    s3:"Share It",
    s3p:"Copy and share your link.",

    ctaKicker:"Start Now",
    ctaTitle:"Join Us Today!",
    ctaText:"Unlock unlimited earning opportunities on TeleCod. Create, sell and earn from every bot code or VIP link you own!",

    footer:"A platform for discovering and selling Telegram bot codes, channels and groups.",
    nav:"Navigation",
    legal:"Legal",
    terms:"Terms & Conditions",
    privacy:"Privacy Policy",
    social:"Social Media",
    rights:"All rights reserved.",

    editorTitle:"Create Pastelink",
    editorSub:"Full editor for text, code, images and links.",

    authWelcome:"Secure, fast & easy.",

    loginTitle:"Sign in to TeleCod",
    loginSub:"Use your Telegram username and password.",

    usernameTelegram:"Telegram Username",
    usernamePlaceholder:"@username",

    password:"Password",
    passwordPlaceholder:"Enter your password",
    passwordMinPlaceholder:"At least 6 characters",

    confirmPassword:"Confirm password",
    confirmPasswordPlaceholder:"Repeat your password",

    telegramNumber:"Telegram Number",
    telegramNumberPlaceholder:"+62xxxxxxxxxx",

    agreeTerms:"I agree to TeleCod Terms & Policies",

    forgotPassword:"Forgot password?",

    orContinue:"Or continue with",
    orRegisterWith:"Or register with",

    continueTelegram:"Telegram",

    noAccount:"Don't have an account?",
    registerNow:"Register now",

    hasAccount:"Already have an account?",
    loginNow:"Sign in now",

    registerTitle:"Create your TeleCod account",
    registerSub:"Register using your Telegram details.",

    forgotTitle:"Forgot password?",
    forgotSub:"Use Telegram to recover your access.",

    recoveryTelegramTitle:"Secure recovery via Telegram",
    recoveryTelegramText:"Sign in with Telegram to verify your account. After verification, you can continue account recovery.",

    recoverWithTelegram:"Recover with Telegram",
    backToLogin:"Back to Login",

    termsRequired:"You must agree to the TeleCod Terms & Policies.",
    invalidUsername:"Telegram username must be 3–32 characters.",
    invalidPhone:"Invalid Telegram number.",
    passwordMismatch:"Passwords do not match.",
    passwordShort:"Password must be at least 6 characters.",

    authConfig:"Supabase is not configured.",
    loginSuccess:"Login successful.",
    registerSuccess:"Registration successful.",

    telegramConfig:"Telegram Login is not configured. Set TELECOD_TELEGRAM_BOT_USERNAME and deploy the Telegram Edge Function.",

    telegramStart:"Opening Telegram authentication...",

    forgotInfo:"For security, recovery requires Telegram verification.",


    addChannel:"Add Channel",
    addChannelSub:"Free / Paid",
    addCode:"Add Code",
    addCodeSub:"Free / Paid",
    all:"All",
    changeLanguage:"Change Language",
    channel:"Channel",
    code:"Code",
    ctaDevice:"Telegram Marketplace",
    fast:"Fast Process",
    featuredSub:"Everything you need for Telegram in one platform.",
    free:"Free",
    freeAccessText:"Can be created and accessed without login.",
    freeAccessTitle:"Free",
    guestPurchaseText:"Buyers do not need an account.",
    guestPurchaseTitle:"Guest Purchase",
    howDescription:"Create a PasteLink, discover marketplace products, or sell your Telegram code in a few simple steps.",
    latestMarketplace:"Latest Code & Channels",
    latestMarketplaceSub:"Discover Telegram bot codes and channels from TeleCod creators.",
    loadingMarketplace:"Loading marketplace...",
    loadingMarketplaceSub:"Fetching the latest products.",
    marketCreateText:"Add FREE products without login or sell PAID products after login/register.",
    marketCreateTitle:"Have a Code or Channel?",
    marketEmptyText:"No products match your search.",
    marketEmptyTitle:"No products available",
    marketErrorText:"Please try again in a moment.",
    marketErrorTitle:"Marketplace could not be loaded",
    openDashboard:"Open Dashboard",
    paid:"Paid",
    paidAccessText:"Creators must log in to sell.",
    paidAccessTitle:"Paid",
    resetFilter:"Reset Filter",
    retry:"Try Again",
    s4:"Share",
    s4p:"Copy the link and share it to Telegram, WhatsApp, or social media.",
    secure:"Secure System",
    startSelling:"Start Selling",
    support:"Support",
    telegramConnected:"Connected to Telegram",
    tryNow:"Try Now",
    viewMarketplace:"View Full Marketplace",
    withdraw:"Withdraw",
    authError:"Authentication error.",
    dbNote:"Data will be stored in Supabase after configuration."
  }
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let lang = "id";
let theme = "dark";
let authMode = "login";
let sup = null;

try {
  lang = localStorage.getItem("telecod_lang") || "id";
  theme = localStorage.getItem("telecod_theme") || "light";
} catch (_) {}

if (!T[lang]) lang = "id";
if (!["dark", "light"].includes(theme)) theme = "dark";


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = selector => document.querySelector(selector);

const $$ = selector => {
  try {
    return [...document.querySelectorAll(selector)];
  } catch (_) {
    return [];
  }
};

function on(selector, event, handler) {
  const el = $(selector);
  if (el) el.addEventListener(event, handler);
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

function setHTML(selector, value) {
  const el = $(selector);
  if (el) el.innerHTML = value;
}

function toggle(selector, className, state) {
  const el = $(selector);
  if (el) el.classList.toggle(className, Boolean(state));
}


/* =========================================================
   LANGUAGE
   ========================================================= */

function tr() {
  document.documentElement.lang = lang;

  $$("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const value = T[lang]?.[key];

    if (value != null) {
      el.innerHTML = value;
    }
  });

  $$("[data-i18n-placeholder]").forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const value = T[lang]?.[key];

    if (value != null) {
      el.setAttribute("placeholder", value);
    }
  });

  const langBtn = $("#langBtn");

  if (langBtn) {
    langBtn.innerHTML =
      `<span class="lang-flag">${lang === "id" ? "🇮🇩" : "🇬🇧"}</span><span class="lang-code">${lang === "id" ? "ID" : "EN"}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;
    langBtn.setAttribute("aria-expanded", String($("#langMenu")?.classList.contains("show") || false));
    langBtn.setAttribute("aria-label", lang === "id" ? "Pilih bahasa" : "Choose language");
  }

  $$("[data-lang]").forEach(item => {
    const active = item.dataset.lang === lang;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
  });

  try {
    localStorage.setItem("telecod_lang", lang);
  } catch (_) {}
}


/* =========================================================
   THEME
   ========================================================= */

function setTheme() {
  document.documentElement.classList.toggle(
    "light",
    theme === "light"
  );
  document.documentElement.dataset.theme = theme;

  const themeBtn = $("#themeBtn");

  if (themeBtn) {
    themeBtn.innerHTML =
      theme === "light"
        ? '<i class="fa-solid fa-moon" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-sun" aria-hidden="true"></i>';
    themeBtn.setAttribute(
      "aria-label",
      theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang"
    );
    themeBtn.setAttribute("title", theme === "light" ? "Dark mode" : "Light mode");
  }

  try {
    localStorage.setItem("telecod_theme", theme);
  } catch (_) {}
}


/* =========================================================
   TOAST
   ========================================================= */

function toast(message, type = "success") {
  const t = $("#toast");

  if (!t) {
    console.log(`[TeleCod ${type}]`, message);
    return;
  }

  t.className = `toast ${type}`;
  t.textContent = String(message || "");

  requestAnimationFrame(() => {
    t.classList.add("show");
  });

  clearTimeout(window.__telecodToastTimer);

  window.__telecodToastTimer = setTimeout(() => {
    t.classList.remove("show");
  }, 3200);
}


/* =========================================================
   BASIC INIT
   ========================================================= */

function initBasicUI() {
  tr();
  setTheme();

  setText("#year", new Date().getFullYear());
}

initBasicUI();


/* =========================================================
   NAVIGATION
   ========================================================= */

/* =========================================================
   NAVBAR — MOBILE / LANGUAGE / THEME
   ========================================================= */

function closeNavigationMenus(){
  $("#langMenu")?.classList.remove("show","open");
  $("#navLinks")?.classList.remove("show","mobile");
  $("#menuBtn")?.setAttribute("aria-expanded","false");
}

on("#langBtn", "click", (event) => {
  event.stopPropagation();
  const menu = $("#langMenu");
  if (!menu) return;
  const willOpen = !menu.classList.contains("show");
  menu.classList.toggle("show", willOpen);
  menu.classList.remove("open");
  $("#langBtn")?.setAttribute("aria-expanded", String(willOpen));
});

$$("[data-lang]").forEach(button => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const selected = button.dataset.lang;
    if (!T[selected]) return;

    lang = selected;
    tr();

    $$("#langMenu [data-lang]").forEach(item => {
      item.classList.toggle("active", item.dataset.lang === lang);
      item.setAttribute("aria-selected", String(item.dataset.lang === lang));
    });

    $("#langMenu")?.classList.remove("show","open");
    $("#langBtn")?.setAttribute("aria-expanded","false");
  });
});

on("#themeBtn", "click", () => {
  theme = theme === "dark" ? "light" : "dark";
  setTheme();
});

on("#menuBtn", "click", (event) => {
  event.stopPropagation();
  const nav = $("#navLinks");
  if (!nav) return;
  const willOpen = !nav.classList.contains("show");
  nav.classList.toggle("show", willOpen);
  nav.classList.remove("mobile");
  $("#menuBtn")?.setAttribute("aria-expanded", String(willOpen));
});

$$("#navLinks a").forEach(a => {
  a.addEventListener("click", () => {
    closeNavigationMenus();
  });
});

/* Close dropdowns when the user taps/clicks elsewhere. */
document.addEventListener("click", (event) => {
  if (!event.target.closest(".nav-tools")) {
    $("#langMenu")?.classList.remove("show","open");
    $("#langBtn")?.setAttribute("aria-expanded","false");
  }
  if (!event.target.closest(".nav")) {
    closeNavigationMenus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavigationMenus();
});

/* Active section follows the user's scroll position. */
(function initActiveNavbar(){
  const links = $$('#navLinks a[href^="#"]');
  const sections = links
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!links.length || !sections.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    links.forEach(link => {
      const active = link.getAttribute("href") === `#${visible.target.id}`;
      link.classList.toggle("active", active);
      link.setAttribute("aria-current", active ? "page" : "false");
    });
  }, {
    rootMargin: "-35% 0px -55% 0px",
    threshold: [0, .2, .5, .8]
  });

  sections.forEach(section => observer.observe(section));
})();

on("#hidePaste", "click", () => {
  $(".paste-card")?.classList.add("hidden");
});

// Prevent dead buttons/links on the landing page.
$$('a[href="#"]').forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    const text = (link.textContent || "").trim();
    if (/telegram/i.test(text) || link.querySelector(".fa-telegram")) {
      window.open("https://t.me/mktplbot", "_blank", "noopener");
      return;
    }
    toast(
      lang === "id"
        ? `${text || "Fitur"} akan segera tersedia.`
        : `${text || "This feature"} will be available soon.`,
      "info"
    );
  });
});


/* =========================================================
   LANDING PAGE LINKS / ACTIONS
   ========================================================= */

function openInfoModal(title, body){
  const modal = document.createElement("div");
  modal.className = "modal open show";
  modal.innerHTML = `
    <div class="auth-modal">
      <button type="button" class="close-auth" aria-label="Close">×</button>
      <div class="auth-brand"><div class="auth-logo"><i class="fa-solid fa-circle-info"></i></div><div><strong>${escapeHTML(title)}</strong><small>TeleCod</small></div></div>
      <p style="color:var(--muted);line-height:1.8;font-size:13px">${escapeHTML(body)}</p>
      <button type="button" class="purple-btn" style="width:100%;margin-top:15px">OK</button>
    </div>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelector(".close-auth")?.addEventListener("click",close);
  modal.querySelector(".purple-btn")?.addEventListener("click",close);
  modal.addEventListener("click",e=>{if(e.target===modal)close();});
}

$$('footer a[href="#"]').forEach(link=>{
  link.addEventListener("click",e=>{
    e.preventDefault();
    const text=(link.textContent||"").trim();
    if(/syarat|terms/i.test(text)) openInfoModal(lang==="id"?"Syarat & Ketentuan":"Terms & Conditions", lang==="id"?"Gunakan TeleCod secara bertanggung jawab. Produk dan konten yang melanggar hukum atau hak pihak lain dapat dihapus.":"Use TeleCod responsibly. Illegal or infringing content may be removed.");
    else if(/privasi|privacy/i.test(text)) openInfoModal(lang==="id"?"Kebijakan Privasi":"Privacy Policy", lang==="id"?"TeleCod hanya menggunakan data yang diperlukan untuk akun, keamanan, transaksi dan fitur platform.":"TeleCod uses only the data needed for accounts, security, transactions and platform features.");
    else if(/dmca/i.test(text)) openInfoModal("DMCA", lang==="id"?"Jika kamu pemilik hak dan menemukan konten yang melanggar, hubungi admin TeleCod untuk proses penanganan.":"If you are a rights holder and find infringing content, contact TeleCod admin for review.");
  });
});

$$('.socials a').forEach((link,i)=>{
  const urls=["https://t.me/mktplbot","https://www.youtube.com/","https://www.facebook.com/","https://www.instagram.com/"];
  link.href=urls[i]||urls[0];
  link.target="_blank";
  link.rel="noopener noreferrer";
});

/* =========================================================
   SUPABASE
   ========================================================= */

function isConfiguredValue(value) {
  const x = String(value || "").trim();

  if (!x) return false;

  if (
    /YOUR[_-]?/i.test(x) ||
    /\bPROJECT\b/i.test(x) ||
    /PUBLISHABLE/i.test(x) ||
    /ANON[_-]?KEY/i.test(x) ||
    /example\.com/i.test(x)
  ) {
    return false;
  }

  return true;
}

function getSupabaseConfig() {
  const url = String(
    window.TELECOD_SUPABASE_URL || ""
  ).trim();

  const key = String(
    window.TELECOD_SUPABASE_ANON_KEY || ""
  ).trim();

  return { url, key };
}

function sbReady() {
  const { url, key } = getSupabaseConfig();

  return Boolean(
    window.supabase &&
    isConfiguredValue(url) &&
    isConfiguredValue(key) &&
    /^https?:\/\//i.test(url)
  );
}

function initSupabase() {
  if (!sbReady()) {
    sup = null;
    return null;
  }

  try {
    const { url, key } = getSupabaseConfig();

    sup = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    return sup;
  } catch (error) {
    console.error(
      "TeleCod Supabase initialization failed:",
      error
    );

    sup = null;
    return null;
  }
}

initSupabase();


/* =========================================================
   URL VALIDATION
   ========================================================= */

function normalizeUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  try {
    const url = new URL(raw);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.href;
  } catch (_) {
    return null;
  }
}


/* =========================================================
   SLUG
   ========================================================= */

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 55);
}

function randomSlug() {
  if (crypto?.randomUUID) {
    return crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 12);
  }

  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  );
}


/* =========================================================
   RESULT
   ========================================================= */

function showResult(slug) {
  const url = `${location.origin}/p/${encodeURIComponent(slug)}`;

  const createdUrl = $("#createdUrl");

  if (createdUrl) {
    createdUrl.value = url;
  }

  $("#success")?.classList.remove("hidden");
  $(".paste-card")?.classList.add("hidden");

  $("#success")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


/* =========================================================
   QUICK PASTELINK
   ========================================================= */

async function saveQuick(url) {
  const cleanUrl = normalizeUrl(url);
  if (!cleanUrl) {
    throw new Error(lang === "id" ? "URL tidak valid." : "Invalid URL.");
  }

  const makePayload = () => ({
    slug: randomSlug(),
    title: "Telegram Link",
    destination_url: cleanUrl,
    content_html:
      `<p class="quick-link"><a href="${escapeAttribute(cleanUrl)}" target="_blank" rel="nofollow noopener noreferrer">${escapeHTML(cleanUrl)}</a></p>`,
    visibility: "public",
    anonymous: true,
    publish_timeline: false
  });

  if (sup) {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const payload = makePayload();
      const { data, error } = await sup
        .from("pastelinks")
        .insert(payload)
        .select("slug")
        .single();

      if (!error && data?.slug) return data.slug;
      lastError = error;
      if (!/duplicate|unique/i.test(error?.message || "")) break;
    }
    throw lastError || new Error(lang === "id" ? "Gagal menyimpan Pastelink." : "Failed to save Pastelink.");
  }

  // Local preview is used only when Supabase has not been configured yet.
  const payload = makePayload();
  try {
    localStorage.setItem(`telecod_demo_${payload.slug}`, JSON.stringify(payload));
    localStorage.setItem("telecod_demo_last", JSON.stringify(payload));
  } catch (_) {}
  return payload.slug;
}

on("#quickForm", "submit", async event => {
  event.preventDefault();

  const input = $("#quickUrl");

  if (!input) return;

  const url = normalizeUrl(input.value);

  if (!url) {
    toast(
      lang === "id"
        ? "Masukkan URL http:// atau https:// yang valid."
        : "Enter a valid http:// or https:// URL.",
      "warning"
    );
    return;
  }

  try {
    const slug = await saveQuick(url);

    showResult(slug);

    input.value = "";
  } catch (error) {
    console.error(error);

    toast(
      error?.message ||
      (lang === "id"
        ? "Gagal menyimpan Pastelink."
        : "Failed to save Pastelink."),
      "error"
    );
  }
});


/* =========================================================
   COPY / SHARE
   ========================================================= */

on("#copyUrl", "click", async () => {
  const input = $("#createdUrl");

  if (!input?.value) return;

  try {
    await navigator.clipboard.writeText(input.value);

    toast(
      lang === "id"
        ? "Link disalin"
        : "Link copied"
    );
  } catch (_) {
    try {
      input.select();
      document.execCommand("copy");

      toast(
        lang === "id"
          ? "Link disalin"
          : "Link copied"
      );
    } catch (_) {
      toast(
        lang === "id"
          ? "Gagal menyalin link."
          : "Failed to copy link.",
        "error"
      );
    }
  }
});

$$("[data-share]").forEach(button => {
  button.addEventListener("click", () => {
    const input = $("#createdUrl");

    if (!input?.value) return;

    const url = encodeURIComponent(input.value);

    const shareMap = {
      tg: `https://t.me/share/url?url=${url}`,
      fb: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      wa: `https://wa.me/?text=${url}`,
      x: `https://x.com/intent/post?url=${url}`
    };

    const target = shareMap[button.dataset.share];

    if (!target) return;

    window.open(
      target,
      "_blank",
      "noopener,noreferrer"
    );
  });
});

on("#closeSuccess", "click", () => {
  $("#success")?.classList.add("hidden");
});


/* =========================================================
   EDITOR
   ========================================================= */

function openEditor() {
  $("#editorModal")?.classList.add("open", "show");
}

function closeEditor() {
  $("#editorModal")?.classList.remove("open", "show");
}

on("#openEditor", "click", openEditor);
on("#closeEditor", "click", closeEditor);

on("#editorModal", "click", event => {
  if (event.target?.id === "editorModal") {
    closeEditor();
  }
});

function editorElement() {
  return $("#editor");
}

function count() {
  const editor = editorElement();

  if (!editor) return;

  const text = editor.innerText.trim();

  const words = text
    ? text.split(/\s+/).filter(Boolean).length
    : 0;

  const chars = text.length;

  setText(
    "#count",
    `${words} words • ${chars} chars`
  );
}

function execEditorCommand(command, value = null) {
  const editor = editorElement();

  if (!editor) return;

  editor.focus();

  try {
    document.execCommand(
      command,
      false,
      value
    );
  } catch (error) {
    console.warn(
      "Editor command failed:",
      command,
      error
    );
  }

  count();
}

$$('#toolbar [data-cmd]').forEach(button => {
  button.addEventListener("click", () => {
    execEditorCommand(
      button.dataset.cmd
    );
  });
});

$$('#toolbar [data-block]').forEach(button => {
  button.addEventListener("click", () => {
    execEditorCommand(
      "formatBlock",
      button.dataset.block
    );
  });
});

on("#linkBtn", "click", () => {
  const url = prompt(
    lang === "id" ? "URL" : "URL",
    "https://"
  );

  if (!url) return;

  const cleanUrl = normalizeUrl(url);

  if (!cleanUrl) {
    toast(
      lang === "id"
        ? "URL tidak valid."
        : "Invalid URL.",
      "warning"
    );
    return;
  }

  execEditorCommand(
    "createLink",
    cleanUrl
  );
});

on("#codeBtn", "click", () => {
  const selected =
    window.getSelection()?.toString() ||
    "code";

  const safe = escapeHTML(selected);

  execEditorCommand(
    "insertHTML",
    `<pre><code>${safe}</code></pre>`
  );
});

on("#clearBtn", "click", () => {
  const editor = editorElement();

  if (!editor) return;

  editor.innerHTML = "";
  count();
});

on("#imgBtn", "click", () => {
  $("#imgFile")?.click();
});

on("#imgFile", "change", event => {
  const file = event.target?.files?.[0];

  if (!file) return;

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    toast(
      lang === "id"
        ? "Ukuran gambar maksimal 5 MB."
        : "Maximum image size is 5 MB.",
      "warning"
    );

    event.target.value = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    toast(
      lang === "id"
        ? "File harus berupa gambar."
        : "File must be an image.",
      "warning"
    );

    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const src = String(reader.result || "");

    execEditorCommand(
      "insertHTML",
      `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(file.name)}">`
    );
  };

  reader.onerror = () => {
    toast(
      lang === "id"
        ? "Gagal membaca gambar."
        : "Failed to read image.",
      "error"
    );
  };

  reader.readAsDataURL(file);
});

on("#editor", "input", count);

on("#editor", "paste", event => {
  const items = [
    ...(event.clipboardData?.items || [])
  ];

  const imageItem = items.find(
    item => item.type.startsWith("image/")
  );

  if (!imageItem) return;

  event.preventDefault();

  const file = imageItem.getAsFile();

  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toast(
      lang === "id"
        ? "Ukuran gambar maksimal 5 MB."
        : "Maximum image size is 5 MB.",
      "warning"
    );
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const src = String(reader.result || "");

    execEditorCommand(
      "insertHTML",
      `<img src="${escapeAttribute(src)}" alt="Pasted image">`
    );
  };

  reader.readAsDataURL(file);
});


/* =========================================================
   FULL PASTELINK SAVE
   ========================================================= */

async function getCurrentUser() {
  if (!sup) return null;

  try {
    const {
      data,
      error
    } = await sup.auth.getUser();

    if (error) {
      console.warn(error);
      return null;
    }

    return data?.user || null;
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function getEditorHTML() {
  const editor = $("#editor");

  if (!editor) return "";

  const raw = editor.innerHTML.trim();

  if (!raw) return "";

  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(
      raw,
      {
        USE_PROFILES: {
          html: true
        }
      }
    );
  }

  return raw;
}

async function createPastelink(payload) {
  if (!sup) {
    try {
      localStorage.setItem(`telecod_demo_${payload.slug}`, JSON.stringify(payload));
    } catch (_) {}
    return payload.slug;
  }

  let current = { ...payload };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await sup
      .from("pastelinks")
      .insert(current)
      .select("slug")
      .single();

    if (!error && data?.slug) return data.slug;
    if (!/duplicate|unique/i.test(error?.message || "")) throw error;
    current = { ...current, slug: randomSlug() };
  }
  throw new Error(lang === "id" ? "Tidak bisa membuat URL unik." : "Unable to create a unique URL.");
}

on("#pasteForm", "submit", async event => {
  event.preventDefault();

  const html = getEditorHTML();

  if (!html) {
    toast(
      lang === "id"
        ? "Konten belum diisi."
        : "Content is empty.",
      "warning"
    );
    return;
  }

  const rawSlug =
    $("#slug")?.value?.trim() || "";

  const slug =
    slugify(rawSlug) ||
    randomSlug();

  const expiration =
    $("#expiration")?.value || "";

  let expiresAt = null;

  const expirationMap = {
    "1h": 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000
  };

  if (expirationMap[expiration]) {
    expiresAt =
      new Date(
        Date.now() +
        expirationMap[expiration]
      ).toISOString();
  }

  const user = await getCurrentUser();

  const title =
    $("#pasteTitle")?.value?.trim() ||
    "Untitled";

  const authorName =
    $("#pasteAuthor")?.value?.trim() ||
    null;

  const description =
    $("#pasteDescription")?.value?.trim() ||
    null;

  const tags = String(
    $("#pasteTags")?.value || ""
  )
    .split(",")
    .map(value =>
      value.trim().toLowerCase()
    )
    .filter(Boolean)
    .slice(0, 20);

  const visibility =
    $("#visibility")?.value ||
    "public";

  const syntax =
    $("#syntax")?.value ||
    "plain";

  const payload = {
    slug,
    title,
    author_name: authorName,
    description,
    tags,
    content_html: html,
    visibility,
    expires_at: expiresAt,
    syntax,

    allow_comments:
      $("#allowComments")?.checked !== false,

    allow_download:
      $("#allowDownload")?.checked !== false,

    show_raw:
      $("#showRaw")?.checked !== false,

    publish_timeline:
      $("#timeline")?.checked === true,

    anonymous:
      $("#anonymous")?.checked === true,

    user_id:
      user?.id || null
  };

  const submitButton =
    event.submitter ||
    $("#pasteForm button[type='submit']");

  const originalText =
    submitButton?.innerHTML;

  try {
    if (submitButton) {
      submitButton.disabled = true;

      submitButton.innerHTML =
        lang === "id"
          ? "Menyimpan..."
          : "Saving...";
    }

    const savedSlug =
      await createPastelink(payload);

    closeEditor();
    showResult(savedSlug);

    toast(
      lang === "id"
        ? "Pastelink berhasil disimpan."
        : "Pastelink saved.",
      "success"
    );
  } catch (error) {
    console.error(
      "Pastelink save error:",
      error
    );

    let message =
      error?.message ||
      (lang === "id"
        ? "Gagal menyimpan Pastelink."
        : "Failed to save Pastelink.");

    if (
      /duplicate|unique/i.test(message)
    ) {
      message =
        lang === "id"
          ? "Slug sudah digunakan. Silakan gunakan URL custom lain."
          : "That slug is already used. Please choose another custom URL.";
    }

    toast(message, "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;

      if (originalText != null) {
        submitButton.innerHTML =
          originalText;
      }
    }
  }
});


/* =========================================================
   REGISTER / LOGIN / GMAIL AUTH
   ========================================================= */

let loginIdentifierValue = "";
let loginUserId = null;

function openAuth(mode="login") {
  const modal=$("#authModal"); if(!modal)return;
  modal.classList.add("open","show"); modal.setAttribute("aria-hidden","false");
  showAuthPanel(mode);
}
function closeAuth(){
  const modal=$("#authModal"); if(!modal)return;
  modal.classList.remove("open","show"); modal.setAttribute("aria-hidden","true");
}
function showAuthPanel(mode){
  ["loginPanel","registerPanel","forgotPanel"].forEach(id=>{const e=$("#"+id); if(e)e.hidden=true;});
  const target=mode==="register"?"registerPanel":mode==="forgot"?"forgotPanel":"loginPanel";
  $( "#"+target ).hidden=false;
  if(mode==="login"){
    $("#loginPasswordForm").hidden=true;
    $("#identifierMessage").hidden=true;
    $("#identifierStatus").textContent="";
    $("#loginIdentifier").focus();
  }
}
function validGmail(v){ return /^[^@\s]+@gmail\.com$/i.test(v.trim()); }

["#loginTop","#loginCta"].forEach(s=>on(s,"click",()=>openAuth("login")));
["#registerTop","#registerCta"].forEach(s=>on(s,"click",()=>openAuth("register")));
on("#closeAuth","click",closeAuth);
on("#authModal","click",e=>{if(e.target?.id==="authModal")closeAuth();});
on("#showLogin","click",()=>showAuthPanel("login"));
on("#showRegister","click",()=>showAuthPanel("register"));
on("#forgotFromRegister","click",()=>showAuthPanel("forgot"));
on("#forgotPassword","click",()=>{$("#forgotEmail").value=validGmail(loginIdentifierValue)?loginIdentifierValue:"";showAuthPanel("forgot");});
on("#backToLogin","click",()=>showAuthPanel("login"));

document.querySelectorAll(".toggle-password").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const input=$("#"+btn.dataset.target);
    if(!input)return;
    input.type=input.type==="password"?"text":"password";
    btn.textContent=input.type==="password"?"👁":"🙈";
  });
});

async function lookupLoginIdentifier(identifier){
  if(!sup)return {error:"Supabase belum dikonfigurasi."};
  const value=identifier.trim();
  if(!value)return {error:"Masukkan Gmail atau username."};

  // Profiles are checked by username first; Gmail is resolved through auth.users
  // only through a secure RPC when available.
  let q=sup.from("profiles").select("id,username,display_name,is_banned").ilike("username",value).maybeSingle();
  const {data:byUsername,error:e1}=await q;
  if(e1)return {error:e1.message};
  if(byUsername)return {user:byUsername,identifier:value};

  // Secure RPC expected in the supplied SQL.
  const {data:byEmail,error:e2}=await sup.rpc("lookup_user_by_email",{p_email:value.toLowerCase()});
  if(e2)return {notFound:true};
  if(byEmail?.id)return {user:byEmail,identifier:value};
  return {notFound:true};
}

on("#loginIdentifierForm","submit",async e=>{
  e.preventDefault();
  const input=$("#loginIdentifier"), status=$("#identifierStatus"), msg=$("#identifierMessage");
  const value=input.value.trim();
  status.textContent="⏳"; msg.hidden=true;
  const result=await lookupLoginIdentifier(value);
  if(result.error){status.textContent="✕";msg.hidden=false;msg.textContent=result.error;msg.className="auth-message error";return;}
  if(result.notFound){
    status.textContent="✕";msg.hidden=false;
    msg.className="auth-message error";
    msg.innerHTML='Akun tidak ada atau belum terdaftar. Silakan daftar terlebih dahulu. <button type="button" id="quickRegister">Daftar / Register</button>';
    on("#quickRegister","click",()=>showAuthPanel("register"));
    return;
  }
  status.textContent="✓"; msg.hidden=false; msg.className="auth-message success";
  msg.textContent=`Akun ditemukan. Masuk sebagai ${result.user.display_name||result.user.username||value}.`;
  loginIdentifierValue=value;
  loginUserId=result.user.id;
  $("#loginWelcome").innerHTML=`✓ Masuk sebagai <strong>${esc(result.user.display_name||result.user.username||value)}</strong>`;
  $("#loginPasswordForm").hidden=false;
  $("#loginPassword").focus();
});

on("#loginPasswordForm","submit",async e=>{
  e.preventDefault();
  if(!sup)return;
  const password=$("#loginPassword").value;
  if(!password)return;
  let email=loginIdentifierValue.trim();
  if(!validGmail(email)){
    const {data}=await sup.rpc("email_for_user",{p_user_id:loginUserId});
    email=data?.email||"";
  }
  if(!validGmail(email)){toast("Gmail akun tidak dapat ditemukan.","error");return;}
  const {error}=await sup.auth.signInWithPassword({email,password});
  if(error){toast("Kata sandi salah. Silakan cek kembali.","error");return;}
  location.href="dashboard.html";
});

async function registerAccount(e){
  e.preventDefault();
  if(!sup)return;
  const username=$("#registerUsername").value.trim().toLowerCase();
  const email=$("#registerEmail").value.trim().toLowerCase();
  const password=$("#registerPassword").value;
  const confirm=$("#registerConfirm").value;
  if(!/^[a-z0-9_]{3,32}$/.test(username))return toast("Username 3-32 karakter: huruf, angka, underscore.","error");
  if(!validGmail(email))return toast("Gunakan alamat Gmail yang valid.","error");
  if(password.length<6)return toast("Kata sandi minimal 6 karakter.","error");
  if(password!==confirm)return toast("Konfirmasi kata sandi tidak sama.","error");

  const {data:existing}=await sup.from("profiles").select("id").ilike("username",username).maybeSingle();
  if(existing)return toast("Username sudah digunakan.","error");

  const {data,error}=await sup.auth.signUp({
    email,password,
    options:{data:{username,display_name:username}}
  });
  if(error){
    toast(error.message||"Pendaftaran gagal.","error"); return;
  }
  if(data?.session){location.href="dashboard.html";return;}
  toast("Pendaftaran berhasil. Cek Gmail untuk verifikasi akun.","success");
  showAuthPanel("login");
}

on("#registerForm","submit",registerAccount);

async function loginWithGoogle(){
  if(!sup)return toast("Supabase belum dikonfigurasi.","error");
  const {error}=await sup.auth.signInWithOAuth({
    provider:"google",
    options:{redirectTo:`${location.origin}/`,queryParams:{prompt:"select_account"}}
  });
  if(error)toast(error.message||"Login Gmail gagal.","error");
}
on("#googleLoginBtn","click",loginWithGoogle);
on("#googleRegisterBtn","click",loginWithGoogle);

on("#forgotForm","submit",async e=>{
  e.preventDefault();
  const email=$("#forgotEmail").value.trim().toLowerCase();
  if(!validGmail(email))return toast("Masukkan Gmail yang valid.","error");
  const {error}=await sup.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/reset-password.html`});
  if(error)toast(error.message||"Gagal mengirim link reset.","error");
  else toast("Link reset kata sandi sudah dikirim ke Gmail.","success");
});

async function finishGoogleSession(){
  if(!sup?.auth)return;
  const {data}=await sup.auth.getSession();
  if(!data?.session?.user)return;
  document.body.classList.add("logged-in");
  document.documentElement.dataset.authenticated="true";
  if(location.pathname.endsWith("/")||location.pathname.endsWith("/index.html")){
    if(location.hash.includes("access_token")||location.search.includes("code=")){
      history.replaceState({},document.title,location.pathname);
      location.href="dashboard.html";
    }
  }
}
if(sup?.auth){
  sup.auth.onAuthStateChange((event,session)=>{
    if(session?.user&&event!=="SIGNED_OUT"){
      document.body.classList.add("logged-in");
      document.documentElement.dataset.authenticated="true";
    }
  });
}
setTimeout(finishGoogleSession,300);

/* =========================================================
   PUBLIC STATS
   ========================================================= */

async function stats() {
  if (!sup) return;

  try {
    const {
      data,
      error
    } = await sup
      .from("telecod_public_stats")
      .select("*")
      .maybeSingle();

    if (!error && data) {
      if ($("#statUsers")) {
        $("#statUsers").textContent =
          Number(
            data.users || 0
          ).toLocaleString() + "+";
      }

      if ($("#statPastes")) {
        $("#statPastes").textContent =
          Number(
            data.pastes || 0
          ).toLocaleString() + "+";
      }

      if ($("#statViews")) {
        $("#statViews").textContent =
          Number(
            data.views ||
            data.transactions ||
            0
          ).toLocaleString() + "+";
      }

      if ($("#statPayments")) {
        $("#statPayments").textContent =
          Number(
            data.payments || 0
          ).toLocaleString() + "+";
      }

      return;
    }

    /*
      Fallback:
      At least display actual Pastelink count.
    */

    const {
      count,
      error: countError
    } = await sup
      .from("pastelinks")
      .select("*", {
        count: "exact",
        head: true
      });

    if (
      !countError &&
      count != null &&
      $("#statPastes")
    ) {
      $("#statPastes").textContent =
        Number(count).toLocaleString() +
        "+";
    }
  } catch (error) {
    console.warn(
      "Stats error:",
      error
    );
  }
}


/* =========================================================
   SECURITY HELPERS
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}


/* =========================================================
   KEYBOARD / UX
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {
    if (event.key !== "Escape") return;

    $("#authModal")?.classList.remove(
      "open", "show"
    );

    $("#forgotModal")?.classList.remove(
      "open", "show"
    );

    $("#editorModal")?.classList.remove(
      "open", "show"
    );

    document
      .querySelectorAll(
        ".telegram-widget-modal"
      )
      .forEach(el => el.remove());

    $("#langMenu")?.classList.remove(
      "open"
    );

    $("#navLinks")?.classList.remove(
      "mobile"
    );
  }
);


/* =========================================================
   INITIAL EDITOR COUNT
   ========================================================= */

count();


/* =========================================================
   INITIAL STATS
   ========================================================= */

stats();


/* =========================================================
   DEBUG / VERSION
   ========================================================= */

window.TeleCod = Object.freeze({
  version: "2026.08.21",
  language: () => lang,
  theme: () => theme,
  supabaseReady: () => Boolean(sup)
});

console.info(
  "%cTeleCod frontend initialized",
  "font-weight:700"
);


/* =========================================================
   TELECOD — INDEX MARKETPLACE V2 FIXED
   DATABASE: products
   ========================================================= */

let marketplaceData=[];
let marketplaceFilter="all";
let marketplaceLoading=false;

/* =========================================================
   NAVIGATION
   ========================================================= */

function goTo(selector){
  const el=document.querySelector(selector);
  if(!el)return;
  el.scrollIntoView({behavior:"smooth",block:"start"});
}

/* =========================================================
   AUTH
   ========================================================= */

function isLoggedIn(){
  return document.documentElement.dataset.authenticated==="true"||
    document.body.classList.contains("logged-in");
}

async function refreshAuthHint(){
  try{
    if(!sup||!sup.auth){
      document.documentElement.dataset.authenticated="false";
      return false;
    }

    const {data}=await sup.auth.getSession();
    const session=data?.session;

    if(session?.user){
      document.documentElement.dataset.authenticated="true";
      document.body.classList.add("logged-in");

      try{
        localStorage.setItem("telecod_session_hint","1");
      }catch(_){}

      return true;
    }

    document.documentElement.dataset.authenticated="false";
    document.body.classList.remove("logged-in");

    try{
      localStorage.removeItem("telecod_session_hint");
    }catch(_){}

    return false;
  }catch(err){
    console.warn("Auth error:",err);
    document.documentElement.dataset.authenticated="false";
    return false;
  }
}

function routeProtected(target="dashboard.html"){
  refreshAuthHint().then(ok=>{
    if(ok){
      location.href=target;
    }else if(typeof openAuth==="function"){
      openAuth("login");
    }else{
      location.href="login.html";
    }
  });
}

/* =========================================================
   MARKET CATEGORY
   ========================================================= */

function marketCategoryValue(item){
  const type=String(item?.type||item?.category||"")
    .trim()
    .toLowerCase();

  if([
    "channel",
    "channels",
    "telegram_channel",
    "telegram-channel"
  ].includes(type))return"channel";

  if([
    "code",
    "codes",
    "bot",
    "bot_code",
    "bot-code",
    "telegram_bot",
    "telegram-code"
  ].includes(type))return"code";

  if(item?.is_channel===true)return"channel";

  return type||"other";
}

/* =========================================================
   ACCESS
   ========================================================= */

function marketAccessValue(item){
  const access=String(item?.access_type||"")
    .trim()
    .toLowerCase();

  const price=Number(item?.price||0);

  if(
    access==="free"||
    access==="gratis"||
    access==="public"||
    price<=0
  )return"free";

  return"paid";
}

/* =========================================================
   PRICE
   ========================================================= */

function formatMarketPrice(item){
  if(marketAccessValue(item)==="free"){
    return typeof lang!=="undefined"&&lang==="en"
      ?"FREE"
      :"GRATIS";
  }

  return`Rp ${Number(item?.price||0).toLocaleString("id-ID")}`;
}

/* =========================================================
   FILTER
   ========================================================= */

function marketMatches(item){
  const filter=marketplaceFilter;
  const category=marketCategoryValue(item);
  const access=marketAccessValue(item);

  if(
    filter!=="all"&&
    filter!==category&&
    filter!==access
  )return false;

  const query=String(
    document.querySelector("#marketSearch")?.value||""
  ).trim().toLowerCase();

  if(!query)return true;

  return[
    item?.title,
    item?.description,
    item?.category,
    item?.type,
    item?.telegram_channel,
    item?.slug
  ].some(value=>
    String(value||"").toLowerCase().includes(query)
  );
}

/* =========================================================
   FREE MODAL
   ========================================================= */

async function openMarketplaceFreeModal(item){
  if(!item)return;
  const isEN=typeof lang!=="undefined"&&lang==="en";
  const title=item.title||"TeleCod Item";
  const category=marketCategoryValue(item);
  const telegram=String(item.telegram_channel||"").trim();

  const modal=document.createElement("div");
  modal.className="modal open show telecod-market-modal";
  modal.innerHTML=`
    <div class="auth-modal market-detail-modal">
      <button type="button" class="close-auth market-modal-close" aria-label="Close">×</button>
      <div class="auth-brand">
        <div class="auth-logo"><i class="${category==="channel"?"fa-solid fa-bullhorn":"fa-solid fa-code"}"></i></div>
        <div><strong>${escapeHTML(title)}</strong><small>TeleCod Marketplace</small></div>
      </div>
      <div class="market-detail-content">
        <div class="market-detail-badges"><span class="market-badge free">${isEN?"FREE":"GRATIS"}</span><span class="market-badge">${escapeHTML(category.toUpperCase())}</span></div>
        <div class="market-detail-icon"><i class="fa-solid ${category==="channel"?"fa-bullhorn":"fa-code"}"></i></div>
        <h2>${escapeHTML(title)}</h2>
        <p>${escapeHTML(item.description||"")}</p>
        <div id="freeAccessBody"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelector(".market-modal-close")?.addEventListener("click",close);
  modal.addEventListener("click",e=>{if(e.target===modal)close()});

  const body=modal.querySelector("#freeAccessBody");
  try{
    const access=await marketplaceCall({action:"free_access",product_id:item.id},false);
    if(access.type==="channel"){
      const href=String(access.telegram_channel||"");
      body.innerHTML=href?`<a class="purple-btn" target="_blank" rel="noopener noreferrer" href="${escapeAttribute(href)}"><i class="fa-brands fa-telegram"></i> ${isEN?"Open Telegram":"Buka Telegram"}</a>`:"<p>Link Telegram belum tersedia.</p>";
    }else{
      body.innerHTML=`<textarea readonly style="width:100%;min-height:260px">${escapeHTML(access.content||"")}</textarea><button class="purple-btn" id="copyFreeCode"><i class="fa-regular fa-copy"></i> ${isEN?"Copy Code":"Salin Code"}</button>`;
      body.querySelector("#copyFreeCode")?.addEventListener("click",async()=>{
        await navigator.clipboard.writeText(access.content||"");toast(isEN?"Copied.":"Code disalin.","success");
      });
    }
  }catch(err){
    body.innerHTML=`<div class="market-no-link">${escapeHTML(err.message||"Gagal memuat item.")}</div>`;
  }
}

/* =========================================================
   OPEN PRODUCT
   ========================================================= */

function openMarketplaceItem(item){
  if(!item)return;

  const access=marketAccessValue(item);

  if(access==="free"){
    openMarketplaceFreeModal(item);
    return;
  }

  openMarketplacePaidModal(item);
  return;

  if(typeof toast==="function"){
    toast(
      typeof lang!=="undefined"&&lang==="en"
        ?"This product does not have a payment page yet."
        :"Produk belum memiliki halaman pembayaran.",
      "warning"
    );
  }
}

/* =========================================================
   CARD
   ========================================================= */

function createMarketplaceCard(item){
  const card=document.createElement("article");
  card.className="market-item";

  const category=marketCategoryValue(item);
  const access=marketAccessValue(item);
  const paid=access==="paid";

  const price=formatMarketPrice(item);

  const icon=
    category==="channel"
      ?"fa-bullhorn"
      :category==="code"
        ?"fa-code"
        :"fa-box";

  const isEN=typeof lang!=="undefined"&&lang==="en";

  const buttonText=paid
    ?(isEN?"View":"Lihat")
    :(isEN?"Open Free":"Buka Gratis");

  card.innerHTML=`
    <div class="market-item-image">
      <div class="market-icon-only"><i class="fa-solid ${icon}"></i></div>
      <span class="market-item-type">
        <i class="fa-solid ${icon}"></i>
        ${escapeHTML(category.toUpperCase())}
      </span>

      <span class="market-item-access ${paid?"paid":"free"}">
        ${paid?"PAID":"FREE"}
      </span>

    </div>

    <div class="market-item-body">

      <small>
        ${
          category==="channel"
            ?"Telegram Channel"
            :category==="code"
              ?"Telegram Bot Code"
              :"TeleCod Marketplace"
        }
      </small>

      <h3>
        ${escapeHTML(item.title||"Untitled")}
      </h3>

      <p>
        ${escapeHTML(
          item.description||
          (isEN?"TeleCod product":"Produk TeleCod")
        )}
      </p>

      <div class="market-item-foot">

        <b>${price}</b>

        <button
          type="button"
          class="purple-btn market-open"
        >
          <i class="fa-solid ${
            paid?"fa-eye":"fa-unlock"
          }"></i>
          ${buttonText}
        </button>

      </div>

    </div>
  `;

  card.querySelector(".market-open")
    ?.addEventListener("click",()=>{
      openMarketplaceItem(item);
    });

  return card;
}

/* =========================================================
   RENDER
   ========================================================= */

function renderMarketplace(){
  const grid=document.querySelector("#marketItemsGrid");
  const empty=document.querySelector("#marketEmpty");
  const error=document.querySelector("#marketError");

  if(!grid)return;

  const sort=document.querySelector("#marketSort")?.value||"latest";

  let items=marketplaceData.filter(marketMatches);

  items.sort((a,b)=>{
    if(sort==="popular"){
      return Number(b.sales_count||0)-Number(a.sales_count||0);
    }

    if(sort==="price_low"){
      return Number(a.price||0)-Number(b.price||0);
    }

    if(sort==="price_high"){
      return Number(b.price||0)-Number(a.price||0);
    }

    return new Date(b.created_at||0)-new Date(a.created_at||0);
  });

  error?.classList.add("hidden");

  grid.innerHTML="";

  if(!items.length){
    empty?.classList.remove("hidden");
    return;
  }

  empty?.classList.add("hidden");

  items.slice(0,12).forEach(item=>{
    grid.appendChild(createMarketplaceCard(item));
  });
}

/* =========================================================
   LOAD MARKETPLACE
   ========================================================= */

async function loadMarketplace(){
  const grid=document.querySelector("#marketItemsGrid");
  const error=document.querySelector("#marketError");
  const empty=document.querySelector("#marketEmpty");
  if(!grid)return;
  if(marketplaceLoading)return;

  marketplaceLoading=true;
  error?.classList.add("hidden");
  empty?.classList.add("hidden");
  grid.innerHTML=`<div class="market-loading"><div class="market-loading-icon"><i class="fa-solid fa-spinner fa-spin"></i></div><strong>${lang==="en"?"Loading marketplace...":"Memuat marketplace..."}</strong><span>${lang==="en"?"Fetching the latest products.":"Mengambil produk terbaru."}</span></div>`;

  const timeout=(promise,ms=9000)=>Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error("Marketplace request timeout")),ms))]);
  const fields="id,creator_id,type,title,slug,description,category,access_type,price,thumbnail_url,telegram_channel,is_channel,status,views,sales_count,created_at,updated_at,creator_username";

  try{
    if(!sup) throw new Error("Supabase belum siap.");

    let data=null, dbError=null;
    try{
      const result=await timeout(sup.from("marketplace_public").select(fields).order("created_at",{ascending:false}).limit(100));
      data=result.data; dbError=result.error;
    }catch(e){ dbError=e; }

    // Fallback for stale/missing marketplace_public view or PostgREST cache.
    if(dbError){
      console.warn("marketplace_public failed, using products fallback:",dbError);
      const result=await timeout(sup.from("products").select("id,creator_id,type,title,slug,description,category,access_type,price,thumbnail_url,telegram_channel,is_channel,status,views,sales_count,created_at,updated_at,profiles(username)").eq("status","published").order("created_at",{ascending:false}).limit(100));
      if(result.error)throw result.error;
      data=(result.data||[]).map(x=>({...x,creator_username:x.profiles?.username||"TeleCod",profiles:undefined}));
    }

    marketplaceData=Array.isArray(data)?data:[];
    renderMarketplace();
  }catch(err){
    console.error("Marketplace load error:",err);
    marketplaceData=[];
    grid.innerHTML="";
    error?.classList.remove("hidden");
    empty?.classList.add("hidden");
  }finally{
    marketplaceLoading=false;
  }
}
/* =========================================================
   CATEGORY
   ========================================================= */

function selectMarketplaceCategory(category){
  marketplaceFilter=category||"all";

  document.querySelectorAll(".market-filter-btn")
    .forEach(button=>{
      button.classList.toggle(
        "active",
        button.dataset.filter===marketplaceFilter
      );
    });

  renderMarketplace();
  goTo("#marketplace");
}

/* =========================================================
   INDEX MARKETPLACE — CREATE / GUEST CHECKOUT
   ========================================================= */

function marketplaceFunctionUrl(){
  return String(
    window.TELECOD_CONFIG?.MARKETPLACE_FUNCTION_URL ||
    window.TELECOD_MARKETPLACE_FUNCTION_URL || ""
  ).trim();
}

async function marketplaceCall(body, requireAuth=false){
  const fn=marketplaceFunctionUrl();
  if(!fn)throw new Error("Marketplace function belum dikonfigurasi.");
  const headers={"Content-Type":"application/json","Accept":"application/json"};
  if(requireAuth){
    const {data:{session}}=await sup.auth.getSession();
    if(!session?.access_token)throw new Error("Login/register diperlukan.");
    headers.Authorization=`Bearer ${session.access_token}`;
  }else{
    try{
      const {data:{session}}=await sup.auth.getSession();
      if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;
    }catch(_){}
  }
  const r=await fetch(fn,{method:"POST",headers,body:JSON.stringify(body)});
  const out=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(out.error||out.message||`Marketplace error (${r.status})`);
  return out;
}

function closeDynamicModal(m){try{m?.remove()}catch(_){}}

function openMarketplaceCreateModal(type){
  const isCode=type==="code";
  const modal=document.createElement("div");
  modal.className="modal open show telecod-market-create-modal";
  modal.innerHTML=`
    <div class="auth-modal market-detail-modal" style="max-width:620px">
      <button type="button" class="close-auth market-create-close">×</button>
      <div class="auth-brand">
        <div class="auth-logo"><i class="fa-solid ${isCode?"fa-code":"fa-brands fa-telegram"}"></i></div>
        <div><strong>${isCode?"Tambah Code":"Tambah Channel / Group"}</strong><small>Marketplace TeleCod</small></div>
      </div>
      <div class="market-form-intro">
        <div class="market-form-badge"><i class="fa-solid ${isCode?"fa-wand-magic-sparkles":"fa-paper-plane"}"></i></div>
        <div>
          <b>${isCode?"Publish Code Bot":"Publish Channel / Group"}</b>
          <span>${isCode?"Isi detail code bot kamu dengan rapi.":"Tambahkan channel atau group Telegram kamu ke marketplace."}</span>
        </div>
      </div>
      <form id="marketCreateForm" class="auth-form market-create-form">
        <label class="auth-field market-field">
          <span><i class="fa-solid fa-heading"></i> Judul ${isCode?"Code":"Channel / Group"}</span>
          <div class="field-wrap">
            <i class="fa-solid fa-pen"></i>
            <input id="mcTitle" required maxlength="120" placeholder="${isCode?"Contoh: Bot Telegram Premium":"Contoh: Channel Premium"}">
          </div>
        </label>
        ${isCode?`
          <label class="auth-field market-field">
            <span><i class="fa-solid fa-code"></i> Source Code</span>
            <textarea id="mcContent" required rows="10" placeholder="Tempel source code bot Telegram di sini..."></textarea>
            <small class="field-help"><i class="fa-solid fa-circle-info"></i> Jangan masukkan token bot, password, API key, atau secret ke dalam code.</small>
          </label>
          <label class="auth-field market-field">
            <span><i class="fa-brands fa-telegram"></i> Username Bot <em>opsional</em></span>
            <div class="field-wrap">
              <i class="fa-brands fa-telegram"></i>
              <input id="mcBot" maxlength="64" placeholder="@namabot">
            </div>
            <small class="field-help"><i class="fa-solid fa-shield-halved"></i> Bot yang sudah Approved dapat langsung dipublish. Bot lain akan menunggu review admin.</small>
          </label>
        `:`
          <label class="auth-field market-field">
            <span><i class="fa-solid fa-layer-group"></i> Akses Channel / Group</span>
            <div class="field-wrap">
              <i class="fa-solid fa-lock"></i>
              <select id="mcChannelType">
                <option value="free">Free — Gratis</option>
                <option value="paid">VIP / Paid — Berbayar</option>
              </select>
            </div>
          </label>
          <label class="auth-field market-field" id="mcPriceWrap" style="display:none">
            <span><i class="fa-solid fa-tag"></i> Harga</span>
            <div class="field-wrap">
              <i class="fa-solid fa-rupiah-sign"></i>
              <input id="mcPrice" type="number" min="1" step="1000" placeholder="50000">
            </div>
          </label>
          <label class="auth-field market-field">
            <span><i class="fa-solid fa-link"></i> Link Channel / Group</span>
            <div class="field-wrap">
              <i class="fa-solid fa-link"></i>
              <input id="mcTelegram" required placeholder="https://t.me/channel">
            </div>
          </label>
        `}
        ${isCode?`
          <div class="market-access-grid">
            <label class="auth-field market-field">
              <span><i class="fa-solid fa-unlock"></i> Akses</span>
              <div class="field-wrap">
                <i class="fa-solid fa-ticket"></i>
                <select id="mcAccess"><option value="free">Free — Gratis</option><option value="paid">Paid — Berbayar</option></select>
              </div>
            </label>
            <label class="auth-field market-field" id="mcCodePriceWrap" style="display:none">
              <span><i class="fa-solid fa-tag"></i> Harga</span>
              <div class="field-wrap">
                <i class="fa-solid fa-rupiah-sign"></i>
                <input id="mcCodePrice" type="number" min="1" step="1000" placeholder="50000">
              </div>
            </label>
          </div>
        `:``}
        <label class="auth-field market-field">
          <span><i class="fa-solid fa-align-left"></i> Deskripsi <em>opsional</em></span>
          <textarea id="mcDesc" rows="3" maxlength="1000" placeholder="Jelaskan isi atau keunggulan produk kamu..."></textarea>
        </label>
        <div class="market-form-footer">
          <div class="market-form-note"><i class="fa-solid fa-shield-halved"></i><span>Data kamu diproses secara aman.</span></div>
          <div class="actions market-form-actions">
            <button type="button" class="auth-secondary-btn" id="mcCancel"><i class="fa-solid fa-xmark"></i> Batal</button>
            <button class="purple-btn auth-submit" type="submit"><i class="fa-solid fa-plus"></i> Tambahkan</button>
          </div>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  const close=()=>closeDynamicModal(modal);
  modal.querySelector(".market-create-close").onclick=close;
  modal.querySelector("#mcCancel").onclick=close;
  modal.onclick=e=>{if(e.target===modal)close()};

  const access=modal.querySelector("#mcAccess");
  const channelType=modal.querySelector("#mcChannelType");
  const sync=()=>{
    const paid=isCode?access.value==="paid":channelType.value==="paid";
    const wrap=modal.querySelector(isCode?"#mcCodePriceWrap":"#mcPriceWrap");
    if(wrap)wrap.style.display=paid?"block":"none";
  };
  access?.addEventListener("change",sync);
  channelType?.addEventListener("change",sync);
  sync();

  modal.querySelector("#marketCreateForm").onsubmit=async e=>{
    e.preventDefault();
    const chosenAccess=isCode?access.value:channelType.value;
    if(chosenAccess==="paid"){
      const ok=await refreshAuthHint();
      if(!ok){
        localStorage.setItem("telecod_pending_market_create",type);
        close();
        openAuth("login");
        toast("Produk PAID wajib login/register terlebih dahulu.","warning");
        return;
      }
    }
    const price=isCode
      ?Number(modal.querySelector("#mcCodePrice")?.value||0)
      :Number(modal.querySelector("#mcPrice")?.value||0);
    if(chosenAccess==="paid"&&price<=0)return toast("Harga PAID wajib diisi.","error");
    const btn=modal.querySelector('button[type="submit"]');
    btn.disabled=true;
    try{
      const out=await marketplaceCall({
        action:"create_product",
        type,
        access_type:chosenAccess,
        title:modal.querySelector("#mcTitle").value.trim(),
        content:isCode?modal.querySelector("#mcContent").value:null,
        bot_username:isCode?modal.querySelector("#mcBot").value.trim():null,
        telegram_channel:!isCode?modal.querySelector("#mcTelegram").value.trim():null,
        price,
        description:modal.querySelector("#mcDesc").value.trim()
      },chosenAccess==="paid");
      localStorage.removeItem("telecod_pending_market_create");
      close();
      if(out.status==="published"){
        toast("Berhasil ditambahkan ke Marketplace.","success");
      }else{
        toast("Berhasil dikirim. Menunggu konfirmasi admin karena Bot belum terdaftar.","warning");
      }
      await loadMarketplace();
    }catch(err){
      toast(err.message||"Gagal menambahkan produk.","error");
    }finally{btn.disabled=false}
  };
}

async function openMarketplacePaidModal(item){
  const modal=document.createElement("div");
  modal.className="modal open show telecod-market-paid-modal";
  modal.innerHTML=`
    <div class="auth-modal market-detail-modal" style="max-width:520px">
      <button class="close-auth" id="paidClose">×</button>
      <div class="auth-brand"><div class="auth-logo"><i class="fa-solid fa-qrcode"></i></div>
        <div><strong>${escapeHTML(item.title||"Pembelian")}</strong><small>Bayar melalui DompetX QRIS</small></div></div>
      <div id="paidCheckout" style="text-align:center;padding:10px">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:30px"></i><p>Membuat QR pembayaran...</p>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const close=()=>closeDynamicModal(modal);
  modal.querySelector("#paidClose").onclick=close;
  modal.onclick=e=>{if(e.target===modal)close()};
  const box=modal.querySelector("#paidCheckout");
  try{
    const pay=await fetch(String(window.TELECOD_CONFIG?.PAYMENT_CREATE_FUNCTION_URL||""),{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"purchase",product_id:item.id})
    });
    const payment=await pay.json().catch(()=>({}));
    if(!pay.ok)throw new Error(payment.error||"Gagal membuat pembayaran DompetX.");
    box.innerHTML=`
      <div class="payment-qr"><img src="${escapeAttribute(payment.qr_url)}" alt="QRIS DompetX" style="max-width:280px;width:100%;border-radius:16px"></div>
      <h3>${formatMarketPrice(item)}</h3>
      <p>Scan QRIS dengan aplikasi pembayaran. Status akan dicek otomatis.</p>
      <div id="paidStatus" class="market-no-link">Menunggu pembayaran...</div>
      <button class="purple-btn" id="paidCheck"><i class="fa-solid fa-rotate"></i> Cek Pembayaran</button>`;
    const statusEl=box.querySelector("#paidStatus");
    const guestToken=payment.guest_token||"";
    let stopped=false;
    const check=async()=>{
      if(stopped)return;
      const fn=String(window.TELECOD_CONFIG?.PAYMENT_STATUS_FUNCTION_URL||"");
      const headers={"Content-Type":"application/json"};
      const {data:{session}}=await sup.auth.getSession();
      if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;
      const r=await fetch(fn,{method:"POST",headers,body:JSON.stringify({payment_id:payment.payment_id,guest_token:guestToken})});
      const st=await r.json().catch(()=>({}));
      if(st.status==="paid"){
        statusEl.textContent="Pembayaran berhasil. Mengambil produk...";
        stopped=true;
        const access=await marketplaceCall({action:"guest_access",guest_token:guestToken},false);
        box.innerHTML=`<h3>Pembayaran Berhasil ✓</h3>
          ${access.type==="channel"
            ?`<a class="purple-btn" target="_blank" rel="noopener" href="${escapeAttribute(access.telegram_channel||"#")}"><i class="fa-brands fa-telegram"></i> Buka Channel / Group</a>`
            :`<textarea readonly style="width:100%;min-height:260px">${escapeHTML(access.content||"")}</textarea><button class="purple-btn" id="copyGuestCode">Salin Code</button>`}
          <p class="market-no-link">Simpan halaman ini sampai selesai menggunakan produk.</p>`;
        box.querySelector("#copyGuestCode")?.addEventListener("click",async()=>{await navigator.clipboard.writeText(access.content||"");toast("Code disalin.","success")});
        return;
      }
      if(["failed","expired","cancelled"].includes(st.status)){
        statusEl.textContent="Pembayaran gagal/kedaluwarsa.";
        stopped=true;return;
      }
      if(!stopped)setTimeout(check,4000);
    };
    box.querySelector("#paidCheck").onclick=check;
    check();
  }catch(err){
    box.innerHTML=`<div class="market-no-link"><i class="fa-solid fa-circle-xmark"></i><p>${escapeHTML(err.message||"Gagal membuat pembayaran.")}</p></div>`;
  }
}

/* =========================================================
   INDEX BUTTONS
   ========================================================= */

function setupIndexButtons(){

  /* =========================================================
     ADD CODE / ADD CHANNEL
     Modal harus langsung terbuka.
     Auth dicek di dalam modal saat memilih PAID.
  ========================================================= */

  on("#addCodeBtn","click",()=>{
    openMarketplaceCreateModal("code");
  });

  on("#addChannelBtn","click",()=>{
    openMarketplaceCreateModal("channel");
  });


  /* =========================================================
     PASTELINK
  ========================================================= */

  if(typeof on==="function"){

    on("#featurePasteBtn","click",()=>{
      if(typeof openEditor==="function"){
        openEditor();
      }
    });

    on("#featureSellBtn","click",()=>{
      routeProtected("dashboard.html");
    });

    on("#featureDashboardBtn","click",()=>{
      routeProtected("dashboard.html");
    });

    on("#featureWithdrawBtn","click",()=>{
      routeProtected("dashboard.html");
    });


    /* =======================================================
       LANGUAGE
    ======================================================= */

    on("#featureLanguageBtn","click",()=>{

      if(typeof lang==="undefined"){
        return;
      }

      lang=lang==="id"?"en":"id";

      try{
        localStorage.setItem("telecod_lang",lang);
      }catch(_){}

      if(typeof tr==="function"){
        tr();
      }

      if(typeof renderMarketplace==="function"){
        renderMarketplace();
      }
    });


    /* =======================================================
       MARKETPLACE SEARCH
    ======================================================= */

    on("#marketSearch","input",()=>{
      if(typeof renderMarketplace==="function"){
        renderMarketplace();
      }
    });


    /* =======================================================
       CLEAR SEARCH
    ======================================================= */

    on("#clearMarketSearch","click",()=>{

      const input=document.querySelector("#marketSearch");

      if(input){
        input.value="";
      }

      if(typeof renderMarketplace==="function"){
        renderMarketplace();
      }

      input?.focus();
    });


    /* =======================================================
       MARKETPLACE SORT
    ======================================================= */

    on("#marketSort","change",()=>{

      if(typeof renderMarketplace==="function"){
        renderMarketplace();
      }

    });


    /* =======================================================
       RESET MARKET FILTER
    ======================================================= */

    on("#resetMarketFilter","click",()=>{

      marketplaceFilter="all";

      const input=document.querySelector("#marketSearch");
      const sort=document.querySelector("#marketSort");

      if(input){
        input.value="";
      }

      if(sort){
        sort.value="latest";
      }

      document
        .querySelectorAll(".market-filter-btn")
        .forEach(btn=>{

          btn.classList.toggle(
            "active",
            btn.dataset.filter==="all"
          );

        });

      if(typeof renderMarketplace==="function"){
        renderMarketplace();
      }

    });


    /* =======================================================
       RETRY MARKETPLACE
    ======================================================= */

    on("#retryMarket","click",()=>{

      if(typeof loadMarketplace==="function"){
        loadMarketplace();
      }

    });

  }


  /* =========================================================
     CATEGORY
  ========================================================= */

  document
    .querySelectorAll("[data-category]")
    .forEach(el=>{

      el.addEventListener("click",event=>{

        event.preventDefault();

        if(typeof selectMarketplaceCategory==="function"){
          selectMarketplaceCategory(
            el.dataset.category || "all"
          );
        }

      });

    });


  /* =========================================================
     MARKETPLACE FILTER
  ========================================================= */

  document
    .querySelectorAll(".market-filter-btn")
    .forEach(btn=>{

      btn.addEventListener("click",event=>{

        event.preventDefault();

        if(typeof selectMarketplaceCategory==="function"){
          selectMarketplaceCategory(
            btn.dataset.filter || "all"
          );
        }

      });

    });


  /* =========================================================
     NAVIGATION
  ========================================================= */

  document
    .querySelectorAll("#navLinks a")
    .forEach(link=>{

      link.addEventListener("click",()=>{

        const href=link.getAttribute("href") || "";

        if(href.startsWith("#")){

          setTimeout(()=>{
            if(typeof goTo==="function"){
              goTo(href);
            }
          },0);

        }

      });

    });


  /* =========================================================
     FOOTER
  ========================================================= */

  document
    .querySelectorAll('footer a[href="#"]')
    .forEach(link=>{

      link.addEventListener("click",event=>{

        event.preventDefault();

        if(typeof toast==="function"){

          toast(
            typeof lang!=="undefined" && lang==="en"
              ? "That page is not available yet."
              : "Halaman tersebut belum tersedia.",
            "info"
          );

        }

      });

    });


  /* =========================================================
     YEAR
  ========================================================= */

  const year=document.querySelector("#year");

  if(year){
    year.textContent=new Date().getFullYear();
  }


  /* =========================================================
     AUTH STATUS
     
     Jangan blokir tombol Add Code/Add Channel.
     Auth hint dijalankan di background.
  ========================================================= */

  if(typeof refreshAuthHint==="function"){
    Promise
      .resolve()
      .then(()=>refreshAuthHint())
      .catch(error=>{
        console.warn(
          "refreshAuthHint failed:",
          error
        );
      });
  }


  /* =========================================================
     MARKETPLACE
  ========================================================= */

  if(typeof loadMarketplace==="function"){

    Promise
      .resolve(loadMarketplace())
      .then(()=>{

        let pending=null;

        try{
          pending=localStorage.getItem(
            "telecod_pending_market_create"
          );
        }catch(_){}

        if(
          pending &&
          typeof isLoggedIn==="function" &&
          isLoggedIn()
        ){

          setTimeout(()=>{

            openMarketplaceCreateModal(
              pending
            );

            try{
              localStorage.removeItem(
                "telecod_pending_market_create"
              );
            }catch(_){}

          },250);

        }

      })
      .catch(error=>{

        console.warn(
          "Marketplace loading failed:",
          error
        );

      });

  }

}

/* =========================================================
   DOM READY
   ========================================================= */

if(document.readyState==="loading"){
  document.addEventListener(
    "DOMContentLoaded",
    setupIndexButtons,
    {once:true}
  );
}else{
  setupIndexButtons();
}
