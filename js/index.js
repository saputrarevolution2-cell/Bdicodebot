/* PasTele Index — DB aligned with public.marketplace_public */
(() => {
  "use strict";

  // Same Supabase project pattern as the uploaded Settings page.
  const CONFIG = window.PASTELE_CONFIG || Object.freeze({
    SUPABASE_URL: "https://jxrndamvelqwhbcromye.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ4Y3pxanF5cXZzaGp6amJieHZwayIsInJvbGUiOiJhbm9uIn0.public-anon-key"
  });

  const sb = window.supabase?.createClient
    ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "pastele-auth" }
      })
    : null;

  const state = { items: [], filter: "all" };
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const number = (n) => new Intl.NumberFormat("id-ID").format(Number(n) || 0);
  const money = (n) => new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
  const esc = (s="") => String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

  function typeOf(item) {
    const t = String(item?.type || "").toLowerCase();
    if (t === "paste" || t === "pastelink") return "pastelink";
    if (["code","channel","group","product","link"].includes(t)) return t;
    return "link";
  }

  function accessOf(item) {
    return String(item?.access_type || "").toLowerCase() === "paid" || Number(item?.price) > 0 ? "paid" : "free";
  }

  function urlOf(item) {
    const slug = encodeURIComponent(String(item?.slug || "").trim());
    const type = typeOf(item), access = accessOf(item);
    if (!slug) return "#";
    if (type === "pastelink" || type === "link" || type === "product") return `/p/${slug}`;
    if (type === "code") return `/c/${access === "paid" ? "p" : "f"}/${slug}`;
    if (type === "channel") return `/ch/${access === "paid" ? "p" : "f"}/${slug}`;
    if (type === "group") return `/g/${access === "paid" ? "p" : "f"}/${slug}`;
    return `/p/${slug}`;
  }

  const labels = {pastelink:"PasteLink",code:"Code",channel:"Channel",group:"Group",product:"Produk",link:"Link"};
  const icons = {pastelink:"fa-link",code:"fa-code",channel:"fa-brands fa-telegram",group:"fa-users",product:"fa-box",link:"fa-arrow-up-right-from-square"};

  function status(text="", error=false) {
    const el = $("#status"); if (!el) return;
    el.textContent = text; el.hidden = !text; el.classList.toggle("error", error);
  }

  function renderStats() {
    const creators = new Set(state.items.map(x => x.owner_id).filter(Boolean)).size;
    $("#statContent").textContent = number(state.items.length);
    $("#statCreators").textContent = number(creators);
    $("#statViews").textContent = number(state.items.reduce((a,x)=>a+(Number(x.views)||0),0));
    $("#statSales").textContent = number(state.items.reduce((a,x)=>a+(Number(x.sales_count)||0),0));
  }

  function card(item) {
    const type = typeOf(item), access = accessOf(item);
    const title = esc(item.title || "Tanpa judul");
    const desc = esc(item.description || "Konten tersedia di PasTele.");
    const creator = esc(item.creator_name || (item.creator_username ? "@"+item.creator_username : "Creator PasTele"));
    const category = esc(item.category || "General");
    const thumb = String(item.thumbnail_url || "").trim();
    const icon = icons[type] || icons.link;
    return `<article class="ix-card"><a class="ix-card-link" href="${urlOf(item)}">
      <div class="ix-thumb">${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<i class="fa-solid ${icon}"></i>`}</div>
      <div class="ix-card-top"><div class="ix-badges"><span class="ix-tag type">${labels[type]||"Konten"}</span><span class="ix-tag ${access}">${access==="paid"?"Berbayar":"Gratis"}</span></div></div>
      <h3>${title}</h3><p class="ix-desc">${desc}</p>
      <div class="ix-meta"><span>${category}</span><span>${creator}</span></div>
      <div class="ix-card-bottom"><span>${access==="paid"?money(item.price):"Gratis"}</span><span>${number(item.views)} views · ${number(item.sales_count)} sales</span></div>
    </a></article>`;
  }

  function renderCards() {
    const grid = $("#publishedGrid");
    const list = state.filter==="all" ? state.items : state.items.filter(x=>typeOf(x)===state.filter);
    grid.innerHTML = list.length ? list.map(card).join("") : `<div class="ix-empty"><i class="fa-solid fa-box-open"></i><h3>Belum ada konten</h3><p>Belum ada konten yang sesuai dengan filter ini.</p></div>`;
    status("");
  }

  function renderRank(target, type) {
    const el = $(target);
    const list = state.items.filter(x=>typeOf(x)===type).slice().sort((a,b)=>
      ((Number(b.sales_count)||0)*1000+(Number(b.views)||0))-((Number(a.sales_count)||0)*1000+(Number(a.views)||0))
    ).slice(0,5);
    el.innerHTML = list.length ? list.map((x,i)=>`<a class="ix-rank" href="${urlOf(x)}">
      <span class="ix-rank-no">${i+1}</span><span class="ix-rank-main"><strong>${esc(x.title||"Tanpa judul")}</strong><small>${number(x.views)} views · ${number(x.sales_count)} sales</small></span><span class="ix-rank-arrow">›</span>
    </a>`).join("") : `<div class="ix-rank-main"><small>Belum ada data.</small></div>`;
  }

  function renderRankings() {
    renderRank("#topLink","pastelink"); renderRank("#topCode","code"); renderRank("#topChannel","channel"); renderRank("#topGroup","group");
  }

  async function load() {
    if (!sb) { status("Supabase client gagal dimuat.", true); return; }
    status("Memuat marketplace…");
    const {data,error} = await sb.from("marketplace_public")
      .select("id,slug,title,type,access_type,price,thumbnail_url,description,views,sales_count,category,created_at,creator_name,creator_username,owner_id")
      .order("created_at",{ascending:false}).limit(100);
    if (error) {
      console.error("[PasTele] marketplace_public:",error);
      status("Marketplace gagal dimuat. Periksa view marketplace_public dan policy Supabase.",true);
      return;
    }
    state.items = Array.isArray(data) ? data : [];
    renderStats(); renderCards(); renderRankings();
  }

  function theme() {
    try {
      const mode = localStorage.getItem("pastele-theme") || "auto";
      const dark = mode==="dark" || (mode==="auto" && (new Date().getHours()>=18 || new Date().getHours()<6)) ||
        (mode==="system" && matchMedia("(prefers-color-scheme:dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    } catch {}
  }

  document.addEventListener("DOMContentLoaded",()=>{
    theme();
    $$(".ix-filter").forEach(btn=>btn.addEventListener("click",()=>{
      state.filter=btn.dataset.filter||"all";
      $$(".ix-filter").forEach(x=>{const a=x===btn;x.classList.toggle("active",a);x.setAttribute("aria-selected",String(a));});
      renderCards();
    }));
    $("#refreshBtn")?.addEventListener("click",async()=>{
      const b=$("#refreshBtn");b.disabled=true;b.classList.add("loading");
      try{await load()}finally{b.disabled=false;b.classList.remove("loading")}
    });
    load();
  });
})();