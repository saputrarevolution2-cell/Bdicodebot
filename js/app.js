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
    throw new Error(
      lang === "id"
        ? "URL tidak valid."
        : "Invalid URL."
    );
  }

  const payload = {
    slug: randomSlug(),
    title: "Telegram Link",
    destination_url: cleanUrl,
    content_html:
      `<p><a href="${escapeAttribute(cleanUrl)}" rel="nofollow noopener noreferrer">${escapeHTML(cleanUrl)}</a></p>`,
    visibility: "public"
  };

  /* Production */
  if (sup) {
    const { data, error } = await sup
      .from("pastelinks")
      .insert(payload)
      .select("slug")
      .single();

    if (error) throw error;

    return data.slug;
  }

  /* Demo fallback only */
  try {
    localStorage.setItem(
      "telecod_demo_last",
      JSON.stringify(payload)
    );
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
  $("#editorModal")?.classList.add("open");
}

function closeEditor() {
  $("#editorModal")?.classList.remove("open");
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
      localStorage.setItem(
        `telecod_demo_${payload.slug}`,
        JSON.stringify(payload)
      );
    } catch (_) {}

    return payload.slug;
  }

  const {
    data,
    error
  } = await sup
    .from("pastelinks")
    .insert(payload)
    .select("slug")
    .single();

  if (error) throw error;

  return data?.slug || payload.slug;
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

  modal.classList.add("open");
  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  setAuthMode(mode);
}

function closeAuth() {
  const modal = $("#authModal");

  if (!modal) return;

  modal.classList.remove("open");
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

  $("#forgotModal")?.classList.add("open");
}

function closeRecovery() {
  $("#forgotModal")?.classList.remove("open");
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

  if (
    !requireTerms(
      $("#loginTerms")?.checked
    )
  ) {
    return;
  }

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

    const {
      data,
      error
    } = await sup.auth.signInWithPassword({
      email: syntheticEmail(username),
      password
    });

    if (error) throw error;

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

    closeAuth();

    toast(
      T[lang].loginSuccess,
      "success"
    );
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

      /*
        If Edge Function returns email,
        create/login session.
      */

      if (result?.email) {
        const login =
          await sup.auth.signInWithPassword({
            email: result.email,
            password
          });

        if (login.error) {
          throw login.error;
        }
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

    closeAuth();

    toast(
      T[lang].registerSuccess,
      "success"
    );
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
  return {
    bot:
      String(
        window.TELECOD_TELEGRAM_BOT_USERNAME ||
        ""
      ).trim(),

    callback:
      String(
        window.TELECOD_TELEGRAM_AUTH_FUNCTION_URL ||
        ""
      ).trim()
  };
}

function startTelegramAuth(mode = "login") {
  const {
    bot,
    callback
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

  const authUrl =
    callback +
    (callback.includes("?")
      ? "&"
      : "?") +
    "mode=" +
    encodeURIComponent(mode);

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
        document.body.classList.add(
          "logged-in"
        );
      }

      if (
        event === "SIGNED_OUT"
      ) {
        document.body.classList.remove(
          "logged-in"
        );
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
      "open"
    );

    $("#forgotModal")?.classList.remove(
      "open"
    );

    $("#editorModal")?.classList.remove(
      "open"
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


// =========================================================
// TEST LOGIN / REGISTER CLICK
// =========================================================

document.addEventListener("click", (e) => {
  const el = e.target.closest(
    "#loginTop, #loginCta, #registerTop, #registerCta"
  );

  if (el) {
    console.log("AUTH BUTTON DIKLIK:", el.id);
  }
});
