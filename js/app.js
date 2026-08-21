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
  theme = localStorage.getItem("telecod_theme") || "dark";
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
      (lang === "id" ? "🇮🇩 ID" : "🇬🇧 EN") + "⌄";
  }

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
      theme === "light" ? "🌙" : "☀️";
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

on("#langBtn", "click", () => {
  $("#langMenu")?.classList.toggle("open");
});

$$("[data-lang]").forEach(button => {
  button.addEventListener("click", () => {
    const selected = button.dataset.lang;

    if (!T[selected]) return;

    lang = selected;
    tr();

    $("#langMenu")?.classList.remove("open");
  });
});

on("#themeBtn", "click", () => {
  theme = theme === "dark" ? "light" : "dark";
  setTheme();
});

on("#menuBtn", "click", () => {
  $("#navLinks")?.classList.toggle("mobile");
});

$$("#navLinks a").forEach(a => {
  a.addEventListener("click", () => {
    $("#navLinks")?.classList.remove("mobile");
  });
});

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
   AUTH HELPERS
   ========================================================= */

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function validUsername(value) {
  return /^[a-z0-9_]{3,32}$/.test(
    normalizeUsername(value)
  );
}

function validPhone(value) {
  return /^\+?[0-9\s().-]{7,20}$/.test(
    String(value || "").trim()
  );
}

function syntheticEmail(username) {
  return (
    normalizeUsername(username) +
    "@telecod.local"
  );
}

async function ensureSupabase() {
  if (!sup) {
    toast(
      T[lang].authConfig,
      "error"
    );

    return false;
  }

  return true;
}


/* =========================================================
   AUTH MODALS
   ========================================================= */

function openAuth(mode = "login") {
  authMode = mode;

  const modal = $("#authModal");

  if (!modal) return;

  modal.classList.add("open", "show");
  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  setAuthMode(mode);
}

function closeAuth() {
  const modal = $("#authModal");

  if (!modal) return;

  modal.classList.remove("open", "show");
  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}

function setAuthMode(mode) {
  authMode = mode;

  toggle(
    "#tabLogin",
    "selected",
    mode === "login"
  );

  toggle(
    "#tabRegister",
    "selected",
    mode === "register"
  );

  toggle(
    "#loginPanel",
    "hidden",
    mode !== "login"
  );

  toggle(
    "#registerPanel",
    "hidden",
    mode !== "register"
  );
}

function openRecovery() {
  closeAuth();

  $("#forgotModal")?.classList.add("open", "show");
}

function closeRecovery() {
  $("#forgotModal")?.classList.remove("open", "show");
}


/* =========================================================
   AUTH BUTTONS
   ========================================================= */

["#loginTop", "#loginCta"].forEach(
  selector => {
    on(selector, "click", () =>
      openAuth("login")
    );
  }
);

["#registerTop", "#registerCta"].forEach(
  selector => {
    on(selector, "click", () =>
      openAuth("register")
    );
  }
);

on("#tabLogin", "click", () =>
  setAuthMode("login")
);

on("#tabRegister", "click", () =>
  setAuthMode("register")
);

on("#switchRegister", "click", () =>
  setAuthMode("register")
);

on("#switchLogin", "click", () =>
  setAuthMode("login")
);

on("#closeAuth", "click", closeAuth);
on("#closeForgot", "click", closeRecovery);

on("#backToLogin", "click", () => {
  closeRecovery();
  openAuth("login");
});

on("#authModal", "click", event => {
  if (event.target?.id === "authModal") {
    closeAuth();
  }
});

on("#forgotModal", "click", event => {
  if (event.target?.id === "forgotModal") {
    closeRecovery();
  }
});


/* =========================================================
   PASSWORD TOGGLE
   ========================================================= */

$$("[data-password-toggle]").forEach(
  button => {
    button.addEventListener(
      "click",
      () => {
        const id =
          button.dataset.passwordToggle;

        const input = $("#" + id);

        if (!input) return;

        const visible =
          input.type === "text";

        input.type =
          visible
            ? "password"
            : "text";

        button.innerHTML =
          visible
            ? '<i class="fa-regular fa-eye"></i>'
            : '<i class="fa-regular fa-eye-slash"></i>';
      }
    );
  }
);


/* =========================================================
   TERMS
   ========================================================= */

function requireTerms(checked) {
  if (!checked) {
    toast(
      T[lang].termsRequired,
      "warning"
    );

    return false;
  }

  return true;
}


/* =========================================================
   LOGIN
   ========================================================= */

on("#loginForm", "submit", async event => {
  event.preventDefault();

  const username =
    normalizeUsername(
      $("#loginUsername")?.value
    );

  const password =
    $("#loginPassword")?.value || "";

  if (!validUsername(username)) {
    toast(
      T[lang].invalidUsername,
      "error"
    );
    return;
  }

  if (password.length < 6) {
    toast(
      T[lang].passwordShort,
      "error"
    );
    return;
  }

  // Terms are required when registering, not on every login.
  if (!(await ensureSupabase())) {
    return;
  }

  const submit =
    event.submitter ||
    $("#loginForm button[type='submit']");

  const original =
    submit?.innerHTML;

  try {
    if (submit) {
      submit.disabled = true;
      submit.innerHTML =
        lang === "id"
          ? "Memproses..."
          : "Signing in...";
    }

    const functionUrl = String(
      window.TELECOD_USERNAME_AUTH_FUNCTION_URL || ""
    ).trim();

    let data = null;

    // Use the username-auth Edge Function first. This avoids exposing or
    // depending on the synthetic email implementation in the browser.
    if (functionUrl && /^https?:\/\//i.test(functionUrl)) {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          action: "login",
          username,
          password,
          terms_accepted: true
        })
      });

      let result = {};
      try { result = await response.json(); } catch (_) {}

      if (!response.ok) {
        throw new Error(
          result?.error ||
          result?.message ||
          `Login gagal (${response.status})`
        );
      }

      if (result?.access_token && result?.refresh_token) {
        const sessionResult = await sup.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token
        });
        if (sessionResult.error) throw sessionResult.error;
        data = sessionResult.data;
      } else {
        throw new Error(
          lang === "id"
            ? "Server login tidak mengembalikan session."
            : "Login server did not return a session."
        );
      }
    } else {
      const result = await sup.auth.signInWithPassword({
        email: syntheticEmail(username),
        password
      });
      if (result.error) throw result.error;
      data = result.data;
    }

    if (!data?.user) {
      throw new Error(
        lang === "id"
          ? "Session login tidak ditemukan."
          : "Login session was not created."
      );
    }

    const profile =
      await sup
        .from("profiles")
        .select("is_banned")
        .eq("id", data.user.id)
        .maybeSingle();

    if (
      profile.data?.is_banned === true
    ) {
      await sup.auth.signOut();

      throw new Error(
        lang === "id"
          ? "Akun kamu diblokir admin."
          : "Your account has been blocked by an administrator."
      );
    }

    await sup
      .from("profiles")
      .update({
        last_login_at:
          new Date().toISOString(),

        terms_accepted_at:
          new Date().toISOString()
      })
      .eq("id", data.user.id);

    localStorage.setItem("telecod_session_hint","1");
    document.documentElement.dataset.authenticated="true";
    closeAuth();
    toast(T[lang].loginSuccess,"success");
    setTimeout(()=>{
      const pending=localStorage.getItem("telecod_pending_market_create");
      if(pending){ location.href="index.html#marketItems"; }
      else { location.href="dashboard.html"; }
    },450);
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    toast(
      error?.message ||
      T[lang].authError,
      "error"
    );
  } finally {
    if (submit) {
      submit.disabled = false;

      if (original != null) {
        submit.innerHTML = original;
      }
    }
  }
});


/* =========================================================
   REGISTER
   ========================================================= */

on("#registerForm", "submit", async event => {
  event.preventDefault();

  const username =
    normalizeUsername(
      $("#registerUsername")?.value
    );

  const phone =
    $("#registerPhone")?.value?.trim() ||
    "";

  const password =
    $("#registerPassword")?.value ||
    "";

  const confirm =
    $("#registerConfirm")?.value ||
    "";

  if (!validUsername(username)) {
    toast(
      T[lang].invalidUsername,
      "error"
    );
    return;
  }

  if (!validPhone(phone)) {
    toast(
      T[lang].invalidPhone,
      "error"
    );
    return;
  }

  if (password.length < 6) {
    toast(
      T[lang].passwordShort,
      "error"
    );
    return;
  }

  if (password !== confirm) {
    toast(
      T[lang].passwordMismatch,
      "error"
    );
    return;
  }

  if (
    !requireTerms(
      $("#registerTerms")?.checked
    )
  ) {
    return;
  }

  if (!(await ensureSupabase())) {
    return;
  }

  const submit =
    event.submitter ||
    $("#registerForm button[type='submit']");

  const original =
    submit?.innerHTML;

  try {
    if (submit) {
      submit.disabled = true;

      submit.innerHTML =
        lang === "id"
          ? "Mendaftarkan..."
          : "Creating account...";
    }

    const functionUrl =
      String(
        window.TELECOD_USERNAME_AUTH_FUNCTION_URL ||
        ""
      ).trim();

    /*
      Preferred production flow:
      Edge Function handles username registration.
    */

    if (
      functionUrl &&
      isConfiguredValue(functionUrl) &&
      /^https?:\/\//i.test(functionUrl)
    ) {
      const response =
        await fetch(functionUrl, {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Accept":
              "application/json"
          },

          body: JSON.stringify({
            action: "register",
            username,
            telegram_number: phone,
            password,
            terms_accepted: true
          })
        });

      let result = {};

      try {
        result =
          await response.json();
      } catch (_) {}

      if (!response.ok) {
        throw new Error(
          result?.error ||
          result?.message ||
          T[lang].authError
        );
      }

      // Edge Function may already return a live Supabase session.
      if (result?.access_token && result?.refresh_token) {
        const sessionResult = await sup.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token
        });
        if (sessionResult.error) throw sessionResult.error;
      } else if (result?.email) {
        // Backward compatibility with the previous function response.
        const login = await sup.auth.signInWithPassword({
          email: result.email,
          password
        });
        if (login.error) throw login.error;
      } else if (result?.session_required) {
        throw new Error(
          lang === "id"
            ? "Akun berhasil dibuat, tetapi session belum dibuat. Deploy ulang Edge Function username-auth."
            : "Account created, but no session was created. Redeploy the username-auth Edge Function."
        );
      }
    } else {
      /*
        Fallback Supabase Auth flow.
      */

      const {
        data,
        error
      } = await sup.auth.signUp({
        email:
          syntheticEmail(username),

        password,

        options: {
          data: {
            username,
            telegram_username:
              username,
            telegram_number:
              phone,
            terms_accepted:
              true
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        const {
          error: profileError
        } = await sup
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              username,
              telegram_username:
                username,
              telegram_number:
                phone,
              terms_accepted_at:
                new Date().toISOString()
            },
            {
              onConflict: "id"
            }
          );

        if (profileError) {
          console.warn(
            "Profile creation warning:",
            profileError
          );
        }
      }

      /*
        If email confirmation is enabled,
        Supabase may not create an active session.
      */

      if (!data?.session) {
        toast(
          lang === "id"
            ? "Registrasi berhasil. Silakan cek email konfirmasi jika diminta."
            : "Registration successful. Check your confirmation email if required.",
          "info"
        );

        closeAuth();
        return;
      }
    }

    localStorage.setItem("telecod_session_hint","1");
    document.documentElement.dataset.authenticated="true";
    closeAuth();
    toast(T[lang].registerSuccess,"success");
    setTimeout(()=>{
      const pending=localStorage.getItem("telecod_pending_market_create");
      if(pending){ location.href="index.html#marketItems"; }
      else { location.href="dashboard.html"; }
    },450);
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    toast(
      error?.message ||
      T[lang].authError,
      "error"
    );
  } finally {
    if (submit) {
      submit.disabled = false;

      if (original != null) {
        submit.innerHTML =
          original;
      }
    }
  }
});


/* =========================================================
   TELEGRAM AUTH
   ========================================================= */

function getTelegramConfig() {
  const config = window.TELECOD_CONFIG || {};

  return {
    bot: String(
      window.TELECOD_TELEGRAM_BOT_USERNAME ||
      config.TELEGRAM_BOT_USERNAME ||
      ""
    ).trim(),

    callback: String(
      window.TELECOD_TELEGRAM_AUTH_FUNCTION_URL ||
      config.TELEGRAM_AUTH_FUNCTION_URL ||
      ""
    ).trim(),

    siteUrl: String(
      window.TELECOD_SITE_URL ||
      config.SITE_URL ||
      location.origin
    ).trim()
  };
}

function startTelegramAuth(mode = "login") {
  const {
    bot,
    callback,
    siteUrl
  } = getTelegramConfig();

  if (
    !bot ||
    !callback ||
    !isConfiguredValue(bot) ||
    !isConfiguredValue(callback) ||
    !/^https?:\/\//i.test(callback)
  ) {
    toast(
      T[lang].telegramConfig,
      "warning"
    );

    return;
  }

  const cleanBot =
    bot.replace(/^@/, "");

  const params = new URLSearchParams({
    mode,
    redirect: siteUrl || location.origin
  });

  const authUrl = `${callback}${callback.includes("?") ? "&" : "?"}${params.toString()}`;

  const modal =
    document.createElement("div");

  modal.className =
    "telegram-widget-modal";

  const title =
    mode === "recovery"
      ? (
          lang === "id"
            ? "Pulihkan dengan Telegram"
            : "Recover with Telegram"
        )
      : (
          lang === "id"
            ? "Masuk dengan Telegram"
            : "Continue with Telegram"
        );

  const description =
    mode === "recovery"
      ? (
          lang === "id"
            ? "Verifikasi akun melalui Telegram untuk melanjutkan pemulihan."
            : "Verify your account through Telegram to continue recovery."
        )
      : (
          lang === "id"
            ? "Klik tombol Telegram di bawah untuk memverifikasi akun."
            : "Click the Telegram button below to verify your account."
        );

  const note =
    lang === "id"
      ? "Domain website harus sudah didaftarkan di BotFather."
      : "The website domain must be registered in BotFather.";

  modal.innerHTML = `
    <div class="telegram-widget-card">

      <button
        class="telegram-widget-close"
        type="button"
        aria-label="Close"
      >
        ×
      </button>

      <div class="auth-logo telegram-logo">
        <i class="fa-brands fa-telegram"></i>
      </div>

      <h3>${escapeHTML(title)}</h3>

      <p>${escapeHTML(description)}</p>

      <div id="telegramWidget"></div>

      <small>${escapeHTML(note)}</small>

    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector(
      ".telegram-widget-close"
    )
    ?.addEventListener(
      "click",
      () => modal.remove()
    );

  modal.addEventListener(
    "click",
    event => {
      if (event.target === modal) {
        modal.remove();
      }
    }
  );

  const script =
    document.createElement("script");

  script.src =
    "https://telegram.org/js/telegram-widget.js?22";

  script.async = true;

  script.dataset.telegramLogin =
    cleanBot;

  script.dataset.size =
    "large";

  script.dataset.userpic =
    "false";

  script.dataset.authUrl =
    authUrl;

  script.dataset.requestAccess =
    "write";

  modal
    .querySelector("#telegramWidget")
    ?.appendChild(script);
}

on(
  "#telegramLoginBtn",
  "click",
  () => startTelegramAuth("login")
);

on(
  "#telegramRegisterBtn",
  "click",
  () => startTelegramAuth("register")
);

on(
  "#telegramRecoveryBtn",
  "click",
  () => {
    closeRecovery();
    startTelegramAuth("recovery");
  }
);


/* =========================================================
   SUPABASE AUTH STATE
   ========================================================= */

function initAuthListener() {
  if (!sup?.auth) return;

  sup.auth.onAuthStateChange(
    (event, session) => {
      if (
        event === "SIGNED_IN" &&
        session?.user
      ) {
        document.body.classList.add("logged-in");
        document.documentElement.dataset.authenticated="true";
        try{ localStorage.setItem("telecod_session_hint","1"); }catch(_){}
      }

      if (event === "SIGNED_OUT") {
        document.body.classList.remove("logged-in");
        document.documentElement.dataset.authenticated="false";
        try{ localStorage.removeItem("telecod_session_hint"); }catch(_){}
      }
    }
  );
}

initAuthListener();


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
    if(!window.sup||!sup.auth){
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
        ${item.thumbnail_url?`<img class="market-detail-image" src="${escapeAttribute(item.thumbnail_url)}" alt="${escapeAttribute(title)}" onerror="this.style.display='none'">`:""}
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

  const thumbnail=item.thumbnail_url||"assets/reference.jpg";

  card.innerHTML=`
    <div class="market-item-image">

      <img
        src="${escapeAttribute(thumbnail)}"
        alt="${escapeAttribute(item.title||"TeleCod")}"
        loading="lazy"
        onerror="this.src='assets/reference.jpg'"
      >

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

  if(!window.sup){
    grid.innerHTML="";
    empty?.classList.remove("hidden");
    return;
  }

  if(marketplaceLoading)return;

  marketplaceLoading=true;

  grid.innerHTML=`
    <div class="market-loading">
      <div class="market-loading-icon">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>

      <strong>
        ${
          typeof lang!=="undefined"&&lang==="en"
            ?"Loading marketplace..."
            :"Memuat marketplace..."
        }
      </strong>

      <span>
        ${
          typeof lang!=="undefined"&&lang==="en"
            ?"Loading available Codes & Channels."
            :"Mengambil Code & Channel yang tersedia."
        }
      </span>
    </div>
  `;

  try{

    /*
     * PENTING:
     * Ini 100% sesuai kolom tabel products kamu.
     */

    const{
      data,
      error:dbError
    }=await sup
      .from("marketplace_public")
      .select(`
        id,
        creator_id,
        creator_username,
        title,
        slug,
        category,
        description,
        price,
        thumbnail_url,
        status,
        created_at,
        updated_at,
        type,
        access_type,
        telegram_channel,
        is_channel,
        views,
        sales_count
      `)
      .order("created_at",{ascending:false})
      .limit(100);

    if(dbError)throw dbError;

    marketplaceData=Array.isArray(data)?data:[];

    console.log(
      "TeleCod Marketplace loaded:",
      marketplaceData.length
    );

    renderMarketplace();

  }catch(err){

    console.error(
      "Marketplace load error:",
      err
    );

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
      <form id="marketCreateForm" class="auth-form">
        <label class="auth-field"><span>Judul ${isCode?"code":"channel/group"}</span>
          <input id="mcTitle" required maxlength="120" placeholder="${isCode?"Judul code":"Nama channel/group"}">
        </label>
        ${isCode?`
          <label class="auth-field"><span>Code</span>
            <textarea id="mcContent" required rows="9" placeholder="Paste code bot di sini..."></textarea>
          </label>
          <label class="auth-field"><span>Bot</span>
            <input id="mcBot" maxlength="64" placeholder="@namabot">
            <small class="field-help">Jika Bot ada di daftar Approved Bots admin, langsung publish. Jika belum ada, status menunggu admin.</small>
          </label>
        `:`
          <label class="auth-field"><span>Jenis Channel/Group Telegram</span>
            <select id="mcChannelType">
              <option value="free">Free</option>
              <option value="paid">VIP / Paid</option>
            </select>
          </label>
          <label class="auth-field" id="mcPriceWrap" style="display:none"><span>Harga</span>
            <input id="mcPrice" type="number" min="1" step="1000" placeholder="50000">
          </label>
          <label class="auth-field"><span>Link Channel/Group</span>
            <input id="mcTelegram" required placeholder="https://t.me/channel">
          </label>
        `}
        ${isCode?`
          <label class="auth-field"><span>Free / Paid</span>
            <select id="mcAccess"><option value="free">Free</option><option value="paid">Paid</option></select>
          </label>
          <label class="auth-field" id="mcCodePriceWrap" style="display:none"><span>Harga</span>
            <input id="mcCodePrice" type="number" min="1" step="1000" placeholder="50000">
          </label>
        `:``}
        <label class="auth-field"><span>Deskripsi (opsional)</span><textarea id="mcDesc" rows="3" placeholder="Keterangan produk"></textarea></label>
        <div class="actions" style="display:flex;gap:10px">
          <button type="button" class="auth-secondary-btn" id="mcCancel">Batal</button>
          <button class="purple-btn auth-submit" type="submit"><i class="fa-solid fa-plus"></i> Add / Tambahkan</button>
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

  on("#addCodeBtn","click",async()=>{
    await refreshAuthHint();
    openMarketplaceCreateModal("code");
  });

  on("#addChannelBtn","click",async()=>{
    await refreshAuthHint();
    openMarketplaceCreateModal("channel");
  });

  /* PASTELINK */

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

    on("#featureLanguageBtn","click",()=>{
      if(typeof lang==="undefined")return;

      lang=lang==="id"?"en":"id";

      try{
        localStorage.setItem("telecod_lang",lang);
      }catch(_){}

      if(typeof tr==="function")tr();

      renderMarketplace();
    });

    on("#marketSearch","input",renderMarketplace);

    on("#clearMarketSearch","click",()=>{
      const input=document.querySelector("#marketSearch");

      if(input)input.value="";

      renderMarketplace();
      input?.focus();
    });

    on("#marketSort","change",renderMarketplace);

    on("#resetMarketFilter","click",()=>{
      marketplaceFilter="all";

      const input=document.querySelector("#marketSearch");
      const sort=document.querySelector("#marketSort");

      if(input)input.value="";
      if(sort)sort.value="latest";

      document.querySelectorAll(".market-filter-btn")
        .forEach(btn=>{
          btn.classList.toggle(
            "active",
            btn.dataset.filter==="all"
          );
        });

      renderMarketplace();
    });

    on("#retryMarket","click",loadMarketplace);
  }

  /* CATEGORY */

  document.querySelectorAll("[data-category]")
    .forEach(el=>{
      el.addEventListener("click",event=>{
        event.preventDefault();

        selectMarketplaceCategory(
          el.dataset.category||"all"
        );
      });
    });

  /* FILTER */

  document.querySelectorAll(".market-filter-btn")
    .forEach(btn=>{
      btn.addEventListener("click",event=>{
        event.preventDefault();

        selectMarketplaceCategory(
          btn.dataset.filter||"all"
        );
      });
    });

  /* NAV */

  document.querySelectorAll("#navLinks a")
    .forEach(link=>{
      link.addEventListener("click",()=>{
        const href=link.getAttribute("href")||"";

        if(href.startsWith("#")){
          setTimeout(()=>goTo(href),0);
        }
      });
    });

  /* FOOTER */

  document.querySelectorAll('footer a[href="#"]')
    .forEach(link=>{
      link.addEventListener("click",event=>{
        event.preventDefault();

        if(typeof toast==="function"){
          toast(
            typeof lang!=="undefined"&&lang==="en"
              ?"That page is not available yet."
              :"Halaman tersebut belum tersedia.",
            "info"
          );
        }
      });
    });

  /* YEAR */

  const year=document.querySelector("#year");

  if(year){
    year.textContent=new Date().getFullYear();
  }

  /* AUTH */

  refreshAuthHint();

  /* MARKETPLACE */

  loadMarketplace().then(()=>{
    const pending=localStorage.getItem("telecod_pending_market_create");
    if(pending && isLoggedIn()){
      setTimeout(()=>openMarketplaceCreateModal(pending),250);
    }
  });
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
