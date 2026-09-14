/* PasTele — self-contained admin page script. One HTML -> one JS -> one CSS. */
/* PasTele / Bdicodebot — NEW PROJECT CONFIG
 * Put ONLY the Supabase project URL and anon/publishable key here.
 * Never put service_role / secret keys in this browser file.
 */
window.PASTELE_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://jxrndamvelqwhbcromye.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo'
});

/* PasTele — zero-flash theme preload. Must run in <head>. */
(() => {
  try {
    const key = 'pastele-theme';
    const mode = localStorage.getItem(key) || 'auto';
    const hour = new Date().getHours();
    const dark = mode === 'dark' ||
      (mode === 'auto' && (hour >= 18 || hour < 6)) ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themeMode = mode;
    root.classList.add(dark ? 'theme-dark' : 'theme-light');
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (_) {}
})();

/* =========================================================
   PasTele — Supabase client
   ========================================================= */
(() => {
  "use strict";

  const cfg = window.PASTELE_CONFIG || {};
  window.__PASTELE_RUNTIME__ = {
    configLoaded: !!window.PASTELE_CONFIG,
    supabaseLibraryLoaded: !!window.supabase,
    configUrl: String(window.PASTELE_CONFIG?.SUPABASE_URL || ""),
    configKeyPresent: !!String(window.PASTELE_CONFIG?.SUPABASE_ANON_KEY || "").trim()
  };
  const url = String(cfg.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(
    cfg.SUPABASE_ANON_KEY ||
    window.__SUPABASE_ANON_KEY__ ||
    ""
  ).trim();

  const validUrl = /^https:\/\/[^\s/]+(?:\.[^\s/]+)+$/i.test(url);
  const validKey =
    key.length > 20 &&
    !/YOUR_|service_role|secret/i.test(key);

  if (!validUrl) {
    console.error("[PasTele] Invalid SUPABASE_URL.");
  }
  if (!validKey) {
    console.error(
      "[PasTele] Supabase anon/publishable key is missing or invalid. " +
      "Put the public anon/publishable key in js/config.js."
    );
  }

  window.TC_CONFIG = Object.freeze({
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: key
  });

  window.sb = null;
  window.__PASTELE_RUNTIME__.validUrl = validUrl;
  window.__PASTELE_RUNTIME__.validKey = validKey;

  if (window.supabase && validUrl && validKey) {
    try {
      window.sb = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "pastele-auth",
          flowType: "pkce"
        }
      });
    } catch (e) {
      window.__PASTELE_RUNTIME__.clientError = String(e?.message || e);
      console.error("[PasTele] Failed to create Supabase client:", e);
    }
  }

  window.__PASTELE_RUNTIME__.clientReady = !!window.sb;

  window.TC = {
    configured: () => !!window.sb,

    money: n =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(Number(n || 0)),

    esc: s =>
      String(s ?? "").replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m])),

    toast: (m, type = "info") => {
      let t = document.getElementById("toast");
      if (!t) {
        t = document.createElement("div");
        t.id = "toast";
        document.body.appendChild(t);
      }
      t.className = "toast " + type;
      t.textContent = String(m ?? "");
      Object.assign(t.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: 9999,
        padding: "13px 16px",
        borderRadius: "13px",
        background: "#17212b",
        color: "#fff",
        border: "1px solid rgba(34,158,217,.35)",
        boxShadow: "0 10px 35px rgba(0,0,0,.3)",
        maxWidth: "min(420px,calc(100vw - 36px))"
      });
      clearTimeout(window.__tcToast);
      window.__tcToast = setTimeout(() => t.remove(), 3200);
    },

    user: async () => {
      if (!window.sb) return null;
      const { data, error } = await window.sb.auth.getUser();
      if (error) return null;
      return data?.user || null;
    },

    profile: async () => {
      const u = await window.TC.user();
      if (!u || !window.sb) return null;
      const { data, error } = await window.sb
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();
      if (error) {
        console.error("[PasTele][DB] profiles:", error);
        return null;
      }
      return data || null;
    },

    reportError: (context, error, extra = {}) => {
      const payload = {
        context,
        message: String(error?.message || error || "Unknown error"),
        code: error?.code || null,
        details: error?.details || null,
        hint: error?.hint || null,
        page: location.href,
        ...extra
      };
      console.error("[PasTele][BUG]", payload);
      return payload;
    },

    dbTest: async () => {
      if (!window.sb) throw new Error("Supabase client belum tersedia.");
      const result = { client: true, auth: false, profiles: false, marketplace: false, errors: [] };
      try {
        const a = await window.sb.auth.getSession();
        if (a.error) throw a.error;
        result.auth = true;
      } catch (e) {
        result.errors.push("Auth: " + (e?.message || e));
      }
      try {
        const q = await window.sb.from("profiles").select("id").limit(1);
        if (q.error) throw q.error;
        result.profiles = true;
      } catch (e) {
        result.errors.push("profiles: " + (e?.message || e));
      }
      try {
        const q = await window.sb.from("marketplace_public").select("id").limit(1);
        if (q.error) throw q.error;
        result.marketplace = true;
      } catch (e) {
        result.errors.push("marketplace_public: " + (e?.message || e));
      }
      return result;
    }
  };
})();

/* PasTele — Canonical global theme manager. */
(() => {
  'use strict';
  const root = document.documentElement;
  const KEY = 'pastele-theme';
  const MODES = ['auto', 'light', 'dark', 'system'];

  const resolve = (mode) => {
    if (mode === 'light' || mode === 'dark') return mode;
    if (mode === 'system') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    const hour = new Date().getHours();
    return (hour >= 18 || hour < 6) ? 'dark' : 'light';
  };

  const apply = (mode = localStorage.getItem(KEY) || 'auto') => {
    if (!MODES.includes(mode)) mode = 'auto';
    const theme = resolve(mode);
    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    root.classList.toggle('theme-dark', theme === 'dark');
    root.classList.toggle('theme-light', theme === 'light');
    root.style.colorScheme = theme;
    if (document.body) {
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme === 'light');
    }
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      const active = button.dataset.themeOption === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    window.dispatchEvent(new CustomEvent('pastele-theme-change', { detail: { mode, theme } }));
    return theme;
  };

  const set = (mode) => {
    if (!MODES.includes(mode)) mode = 'auto';
    localStorage.setItem(KEY, mode);
    return apply(mode);
  };

  const cycle = () => {
    const current = localStorage.getItem(KEY) || 'auto';
    const index = Math.max(0, MODES.indexOf(current));
    return set(['auto', 'light', 'dark', 'system'][(index + 1) % 4]);
  };

  window.PasTeleTheme = Object.freeze({
    get: () => localStorage.getItem(KEY) || 'auto',
    resolved: () => resolve(localStorage.getItem(KEY) || 'auto'),
    set,
    cycle,
    apply
  });

  apply();
  window.setInterval(() => {
    if ((localStorage.getItem(KEY) || 'auto') === 'auto') apply('auto');
  }, 60 * 1000);

  window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change', () => {
    if ((localStorage.getItem(KEY) || 'auto') === 'system') apply('system');
  });
})();

(()=>{"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(v||0));
const rows=v=>Array.isArray(v)?v:(v==null||v===""?[]:[v]);
function theme(){ if(window.PasTeleTheme?.apply) return window.PasTeleTheme.apply(); }
if(!window.sb){const c=window.PASTELE_CONFIG||{},u=c.SUPABASE_URL||"https://jxrndamvelqwhbcromye.supabase.co",k=c.SUPABASE_ANON_KEY||"";if(window.supabase&&u&&k)window.sb=window.supabase.createClient(u,k,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"pastele-auth",flowType:"pkce"}})}
window.TC=window.TC||{};TC.esc=esc;TC.money=money;TC.toast=(msg,type="info")=>{let t=document.getElementById("toast");if(!t){t=document.createElement("div");document.body.appendChild(t)}t.textContent=msg;t.style.cssText=`position:fixed;right:16px;bottom:16px;z-index:9999;padding:13px 16px;border-radius:13px;background:${type==="error"?"#b42318":"#142033"};color:#fff;box-shadow:0 12px 30px #0003;max-width:calc(100vw - 32px)`;clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.remove(),3200)};
window.Admin={rows,esc,money,
async rpc(n,p={}){if(!sb)throw Error("Supabase belum siap.");const q=await sb.rpc(n,p);if(q.error)throw q.error;return q.data},
async guard(){if(!sb?.auth)throw Error("Supabase Auth belum siap.");const a=await sb.auth.getUser();if(a.error||!a.data?.user){location.replace("../login.html");throw Error("Sesi login tidak ditemukan.")}const u=a.data.user,q=await sb.from("profiles").select("id,is_admin,is_banned,role,username,display_name,auth_email,balance").eq("id",u.id).maybeSingle();if(q.error)throw q.error;const p=q.data;if(p?.is_banned){await sb.auth.signOut();location.replace("../login.html");throw Error("Akun diblokir.")}if(!(p?.is_admin===true||["admin","owner","superadmin"].includes(String(p?.role||"").toLowerCase()))){location.replace("../dashboard.html");throw Error("Akses admin ditolak.")}Admin.current={user:u,profile:p};return Admin.current},
format(v){if(v===null||v===undefined||v==="")return'<span class="muted">—</span>';if(typeof v==="boolean")return v?'<span class="badge">✓ Ya</span>':'<span class="badge">× Tidak</span>';if(typeof v==="object")return"<code>"+esc(JSON.stringify(v))+"</code>";return esc(v)},
table(data){const r=rows(data);if(!r.length)return'<div class="empty">Tidak ada data.</div>';const k=[...new Set(r.flatMap(x=>Object.keys(x||{})))];return'<div class="table-wrap"><table><thead><tr>'+k.map(x=>"<th>"+esc(x.replaceAll("_"," "))+"</th>").join("")+"</tr></thead><tbody>"+r.map(x=>"<tr>"+k.map(y=>"<td>"+this.format(x?.[y])+"</td>").join("")+"</tr>").join("")+"</tbody></table></div>"},
mountNav(){const h=document.getElementById("navbar");if(!h)return;h.innerHTML=`<header class="admin-topbar"><div class="admin-topbar-inner"><a class="admin-brand" href="index.html"><span class="admin-brand-mark"><i class="fa-solid fa-bolt"></i></span><span><b>PasTele</b><small>Admin Console</small></span></a><div class="admin-top-actions"><span class="admin-live"><i class="fa-solid fa-circle"></i> SECURE</span><button class="theme-btn btn" id="themeToggle"><i class="fa-solid fa-circle-half-stroke"></i></button><a class="btn" href="../dashboard.html"><i class="fa-solid fa-arrow-left"></i><span>Dashboard</span></a><button class="btn danger" id="adminLogout"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></button></div></div></header>`;themeToggle.onclick=()=>{const x=localStorage.getItem("pastele-theme")||"system";window.PasTeleTheme?.cycle?.()};adminLogout.onclick=async()=>{if(confirm("Keluar dari Admin Console?")){try{await sb.auth.signOut({scope:"global"})}finally{location.replace("../login.html")}}}}
};document.addEventListener("DOMContentLoaded",()=>Admin.mountNav())})();
(async()=>{
  const $=id=>document.getElementById(id), list=$('contentList'), toast=(m,t)=>TC.toast(m,t);
  const norm=x=>String(x||'').toLowerCase();
  let all=[], filtered=[], page=1, perPage=20, editing=null;
  function status(x){return x.source==='pastelinks'?(x.status==='published'?'published':norm(x.status||'hidden')):norm(x.status||'draft')}
  function type(x){return x.type||({products:'product',pastelinks:'link',telegram_products:'code',telegram_channels:'channel'}[x.source]||'product')}
  function icon(t){return ({product:'fa-box',link:'fa-link',code:'fa-code',channel:'fa-broadcast-tower',group:'fa-users'}[t]||'fa-layer-group')}
  function creator(x){return x.creator_name||x.creator_username||x.username||'Unknown'}
  async function load(){list.innerHTML='<div class="card admin-loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuat konten...</div>';all=Admin.rows(await Admin.rpc('admin_content',{p_limit:500,p_offset:0}));render()}
  function render(){const q=norm($('contentSearch').value.trim()),t=$('contentType').value,s=$('contentStatus').value,sort=$('contentSort').value;filtered=all.filter(x=>(!q||[x.title,x.name,x.slug,creator(x)].some(v=>norm(v).includes(q)))&&(t==='all'||type(x)===t)&&(s==='all'||status(x)===s));filtered.sort((a,b)=>sort==='oldest'?new Date(a.created_at)-new Date(b.created_at):sort==='views'?Number(b.views||0)-Number(a.views||0):sort==='sales'?Number(b.sales_count||0)-Number(a.sales_count||0):sort==='price'?Number(b.price||0)-Number(a.price||0):new Date(b.created_at)-new Date(a.created_at));
    $('contentResult').textContent=`${filtered.length.toLocaleString('id-ID')} konten ditemukan`;
    const start=(page-1)*perPage,vis=filtered.slice(start,start+perPage); $('contentKpis').innerHTML=[['Total',all.length,'fa-layer-group'],['Published',all.filter(x=>status(x)==='published').length,'fa-circle-check'],['Creator',new Set(all.map(x=>x.creator_id||x.owner_id||x.user_id).filter(Boolean)).size,'fa-users'],['Views',all.reduce((n,x)=>n+Number(x.views||0),0).toLocaleString('id-ID'),'fa-eye']].map(x=>`<div class="content-kpi"><div class="content-kpi-icon"><i class="fa-solid ${x[2]}"></i></div><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('');
    list.innerHTML=vis.length?vis.map(x=>`<article class="content-item"><div class="content-type-icon"><i class="fa-solid ${icon(type(x))}"></i></div><div class="content-main"><div class="content-title"><strong>${Admin.esc(x.title||x.name||'Untitled')}</strong><span class="content-pill">${Admin.esc(type(x))}</span></div><div class="content-sub"><span>Slug: ${Admin.esc(x.slug||'—')}</span><span>·</span><span>Creator: ${Admin.esc(creator(x))}</span></div><div class="content-meta"><span class="content-pill ${Admin.esc(status(x))}">${Admin.esc(status(x))}</span><span class="content-pill"><i class="fa-solid fa-eye"></i> ${Number(x.views||0).toLocaleString('id-ID')}</span><span class="content-pill"><i class="fa-solid fa-cart-shopping"></i> ${Number(x.sales_count||0).toLocaleString('id-ID')}</span><span class="content-pill">${Number(x.price||0)>0?Admin.money(x.price):'Gratis'}</span></div></div><div class="content-actions"><button class="btn icon-only" data-edit="${Admin.esc(x.id)}" title="Edit"><i class="fa-solid fa-pen"></i></button><button class="btn danger icon-only" data-delete="${Admin.esc(x.id)}" title="Hapus"><i class="fa-solid fa-trash"></i></button></div></article>`).join(''):'<div class="card content-empty empty"><i class="fa-regular fa-folder-open"></i><br>Tidak ada konten yang cocok.</div>';
    vis.forEach(x=>{list.querySelector(`[data-edit="${CSS.escape(String(x.id))}"]`)?.addEventListener('click',()=>open(x));list.querySelector(`[data-delete="${CSS.escape(String(x.id))}"]`)?.addEventListener('click',()=>del(x))});
    const pages=Math.max(1,Math.ceil(filtered.length/perPage));const pg=$('contentPagination');pg.hidden=pages<=1;pg.innerHTML=pages>1?Array.from({length:pages},(_,i)=>`<button data-p="${i+1}" class="${i+1===page?'active':''}">${i+1}</button>`).join(''):'';pg.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{page=Number(b.dataset.p);render()});
  }
  function open(x){editing=x;$('editId').value=x.id;$('editSource').value=x.source;$('editTitle').value=x.title||x.name||'';$('editSlug').value=x.slug||'';$('editPrice').value=Number(x.price||0);$('editStatus').value=status(x)==='public'?'published':status(x);$('editDescription').value=x.description||'';$('editSlug').disabled=x.source!=='products';$('editNote').textContent=x.source==='pastelinks'?'PasteLink memakai visibility public/hidden di SQL.':'Editor menggunakan RPC admin_update_content pada SQL master.';$('contentModal').hidden=false;$('contentModal').setAttribute('aria-hidden','false')}
  function close(){$('contentModal').hidden=true;$('contentModal').setAttribute('aria-hidden','true');editing=null}
  async function save(e){e.preventDefault();if(!editing)return;const payload={p_id:editing.id,p_source:editing.source,p_title:$('editTitle').value.trim()||null,p_slug:$('editSlug').value.trim()||null,p_price:Number($('editPrice').value||0),p_status:$('editStatus').value,p_description:$('editDescription').value.trim()||null};try{await Admin.rpc('admin_update_content',payload);toast('Konten diperbarui','success');close();await load()}catch(e){toast(e.message,'error')}}
  async function del(x){if(!confirm(`Hapus konten "${x.title||x.name||'Untitled'}"?`))return;try{await Admin.rpc('admin_delete_content',{p_id:x.id,p_source:x.source});toast('Konten dihapus','success');await load()}catch(e){toast(e.message,'error')}}
  try{await Admin.guard();$('contentSearch').oninput=()=>{page=1;render()};$('contentType').onchange=()=>{page=1;render()};$('contentStatus').onchange=()=>{page=1;render()};$('contentSort').onchange=()=>{page=1;render()};$('clearContentSearch').onclick=()=>{$('contentSearch').value='';page=1;render()};$('resetContentFilters').onclick=()=>{$('contentSearch').value='';$('contentType').value='all';$('contentStatus').value='all';$('contentSort').value='newest';page=1;render()};$('refreshContent').onclick=load;$('contentEditForm').onsubmit=save;$('contentModalClose').onclick=close;$('cancelContentEdit').onclick=close;$('[data-close-content]')?.addEventListener('click',close);$('deleteContent').onclick=()=>editing&&del(editing);await load()}catch(e){list.innerHTML=`<div class="card empty">${Admin.esc(e.message)}</div>`}
})();

/* ============================================================
   PasTele — GLOBAL SESSION GUARD
   - 24 hours of INACTIVITY => sign out
   - Activity refreshes the inactivity timer
   - Works even when Supabase/client scripts finish loading late
   - Public pages are never blocked
   ============================================================ */
(() => {
  "use strict";

  const INACTIVITY_MS = 24 * 60 * 60 * 1000;
  const ACTIVITY_KEY = "pastele_last_activity";
  const PUBLIC = new Set([
    "index.html", "login.html", "register.html",
    "forgot-password.html", "reset-password.html",
    "auth-callback.html", "marketplace.html", "product.html", "paste-view.html",
    "about.html", "terms.html", "privacy.html"
  ]);

  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isAdminPath = /\/admin(?:\/|$)/i.test(location.pathname);
  const isPublic = !isAdminPath && PUBLIC.has(file);
  let locked = false;
  let initialized = false;
  let timer = null;

  function setActivity() {
    if (locked || isPublic) return;
    try {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch (_) {}
  }

  function getLastActivity() {
    try {
      const value = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
      return Number.isFinite(value) ? value : 0;
    } catch (_) {
      return 0;
    }
  }

  function isExpired() {
    const last = getLastActivity();
    return last > 0 && (Date.now() - last >= INACTIVITY_MS);
  }

  function loginUrl() {
    return location.pathname.includes("/admin/") ? "../login.html" : "login.html";
  }

  function showExpired() {
    if (document.getElementById("pt-session-modal")) return;

    locked = true;

    const style = document.createElement("style");
    style.textContent = `
      #pt-session-modal{
        position:fixed;inset:0;z-index:2147483647;
        display:grid;place-items:center;padding:20px;
        background:rgba(2,6,23,.72);
        backdrop-filter:blur(14px);
      }
      #pt-session-modal .pt-session-box{
        width:min(440px,100%);
        padding:32px 26px;
        border:1px solid rgba(148,163,184,.22);
        border-radius:26px;
        text-align:center;
        background:var(--surface,#fff);
        color:var(--text,#0f172a);
        box-shadow:0 30px 100px rgba(0,0,0,.35);
      }
      #pt-session-modal .pt-session-icon{
        width:66px;height:66px;margin:0 auto 16px;
        display:grid;place-items:center;border-radius:20px;
        background:rgba(99,91,255,.12);
        color:#635bff;font-size:27px;
      }
      #pt-session-modal h2{margin:0 0 9px;font-size:23px}
      #pt-session-modal p{margin:0 auto 22px;max-width:350px;
        color:var(--muted,#64748b);line-height:1.65}
      #pt-session-modal a{
        display:flex;align-items:center;justify-content:center;gap:9px;
        min-height:48px;padding:12px 18px;border-radius:14px;
        background:linear-gradient(135deg,#635bff,#8b5cf6);
        color:#fff!important;text-decoration:none;font-weight:800;
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "pt-session-modal";
    modal.innerHTML = `
      <div class="pt-session-box" role="dialog" aria-modal="true">
        <div class="pt-session-icon"><i class="fa-solid fa-lock"></i></div>
        <h2>Sesi Berakhir</h2>
        <p>Sesi kamu berakhir karena tidak ada aktivitas selama 24 jam. Silakan login kembali untuk melanjutkan.</p>
        <a href="${loginUrl()}"><i class="fa-solid fa-right-to-bracket"></i> Login Kembali</a>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function getClient() {
    if (window.sb?.auth) return window.sb;

    // Some pages load their bundled client after this guard.
    for (let i = 0; i < 80; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (window.sb?.auth) return window.sb;
    }
    return null;
  }

  async function signOutAndLock() {
    if (locked) return;
    try {
      const client = await getClient();
      if (client?.auth) {
        await client.auth.signOut({ scope: "global" });
      }
    } catch (error) {
      console.warn("[PasTele] Session signOut:", error);
    }
    try { localStorage.removeItem(ACTIVITY_KEY); } catch (_) {}
    showExpired();
  }

  function autoTheme() {
    // Automatic day/night theme:
    // 06:00–17:59 = light, 18:00–05:59 = dark.
    try {
      const hour = new Date().getHours();
      const dark = hour >= 18 || hour < 6;
      const root = document.documentElement;
      root.dataset.theme = dark ? "dark" : "light";
      root.dataset.themeMode = "auto";
      root.style.colorScheme = dark ? "dark" : "light";
    } catch (_) {}
  }

  function bindActivity() {
    if (initialized) return;
    initialized = true;

    const events = ["click", "keydown", "touchstart", "pointerdown", "scroll"];
    for (const event of events) {
      document.addEventListener(event, setActivity, {
        passive: true,
        capture: true
      });
    }

    // Also refresh when the user returns to the tab.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        if (isExpired()) signOutAndLock();
        else setActivity();
      }
    });

    window.addEventListener("pageshow", () => {
      if (isExpired()) signOutAndLock();
      else setActivity();
    });
  }

  async function init() {
    autoTheme();

    if (isPublic) return;

    const client = await getClient();
    if (!client?.auth) {
      console.warn("[PasTele] Supabase client not available; session guard could not start.");
      return;
    }

    try {
      const result = await client.auth.getSession();
      const session = result?.data?.session;

      if (!session) {
        showExpired();
        return;
      }

      if (isExpired()) {
        await signOutAndLock();
        return;
      }

      setActivity();
      bindActivity();

      timer = window.setInterval(() => {
        if (isExpired()) signOutAndLock();
      }, 60 * 1000);

      client.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") showExpired();
        if (event === "SIGNED_IN" && !locked) setActivity();
      });
    } catch (error) {
      console.warn("[PasTele] Session guard:", error);
    }
  }

  window.PasTeleSession = Object.freeze({
    touch: setActivity,
    expired: isExpired,
    check: init,
    autoTheme
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

/* PasTele — Live notification toast
 * Shows new user notifications as a clean floating card for 3 seconds.
 * Click opens the notification target URL when one is provided.
 */
(() => {
  'use strict';
  if (window.__PASTELE_NOTIFICATION_TOAST__) return;
  window.__PASTELE_NOTIFICATION_TOAST__ = true;

  const state = { userId: null, channel: null, seen: new Set(), poll: null };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function ensureStyles() {
    if (document.getElementById('pt-live-notification-style')) return;
    const s = document.createElement('style');
    s.id = 'pt-live-notification-style';
    s.textContent = `
      #ptLiveNotifications{position:fixed;top:18px;right:18px;width:min(410px,calc(100vw - 24px));z-index:2147483000;display:grid;gap:10px;pointer-events:none}
      .pt-live-notice{pointer-events:auto;display:grid;grid-template-columns:42px 1fr 24px;gap:11px;align-items:start;padding:13px 14px;border:1px solid color-mix(in srgb,var(--primary,#229ed9) 22%,var(--line,#e5e7eb));border-radius:17px;background:color-mix(in srgb,var(--surface,#fff) 94%,transparent);color:var(--text,#14212b);box-shadow:0 18px 55px rgba(15,23,42,.18);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transform:translateY(-12px) scale(.98);opacity:0;transition:transform .22s ease,opacity .22s ease;cursor:pointer;overflow:hidden}
      html[data-theme="dark"] .pt-live-notice{box-shadow:0 20px 65px rgba(0,0,0,.42);border-color:rgba(148,163,184,.18)}
      .pt-live-notice.is-in{transform:none;opacity:1}.pt-live-notice.is-out{transform:translateY(-10px) scale(.98);opacity:0}
      .pt-live-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,var(--primary,#229ed9),#7c5cff);color:#fff;font-size:16px}
      .pt-live-copy{min-width:0}.pt-live-copy strong{display:block;font-size:13px;line-height:1.3;margin:1px 0 4px}.pt-live-copy span{display:block;font-size:12px;line-height:1.45;color:var(--muted,#718293);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pt-live-time{display:block;margin-top:6px;font-size:10px;color:var(--muted,#718293);font-weight:700}.pt-live-close{border:0;background:transparent;color:var(--muted,#718293);font-size:14px;cursor:pointer;padding:2px}.pt-live-notice:hover{transform:translateY(-2px);box-shadow:0 22px 65px rgba(15,23,42,.22)}
      @media(max-width:600px){#ptLiveNotifications{top:10px;right:10px;width:calc(100vw - 20px)}.pt-live-notice{border-radius:15px}}
      @media(prefers-reduced-motion:reduce){.pt-live-notice{transition:none}}
    `;
    document.head.appendChild(s);
  }

  function root() {
    let el = document.getElementById('ptLiveNotifications');
    if (!el) { el = document.createElement('div'); el.id = 'ptLiveNotifications'; el.setAttribute('aria-live','polite'); document.body.appendChild(el); }
    return el;
  }

  function icon(type) {
    return ({publish:'fa-bullhorn',purchase:'fa-bag-shopping',view:'fa-eye',sale:'fa-circle-check',like:'fa-heart',withdrawal:'fa-wallet'}[type] || 'fa-bell');
  }

  function remove(card) {
    if (!card) return;
    card.classList.remove('is-in'); card.classList.add('is-out');
    setTimeout(() => card.remove(), 230);
  }

  function show(n) {
    if (!n?.id || state.seen.has(n.id)) return;
    state.seen.add(n.id);
    const target = String(n.link_url || '').trim();
    const card = document.createElement('article');
    card.className = 'pt-live-notice';
    card.setAttribute('role', target ? 'link' : 'status');
    card.innerHTML = `<div class="pt-live-icon"><i class="fa-solid ${esc(icon(n.notification_type))}"></i></div><div class="pt-live-copy"><strong>${esc(n.title || 'Notifikasi')}</strong><span>${esc(n.body || '')}</span><small class="pt-live-time">Baru saja${target ? ' · Ketuk untuk membuka' : ''}</small></div><button class="pt-live-close" type="button" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>`;
    const close = card.querySelector('.pt-live-close');
    close.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); remove(card); });
    card.addEventListener('click', async () => {
      if (target) window.location.assign(new URL(target, window.location.origin + "/").href);
      try { await window.sb?.from('notifications').update({is_read:true}).eq('id',n.id).eq('user_id',state.userId); } catch (_) {}
      remove(card);
    });
    root().prepend(card);
    requestAnimationFrame(() => card.classList.add('is-in'));
    setTimeout(() => remove(card), 3000);
  }

  async function init() {
    if (!window.sb) return false;
    let u = null;
    try { u = (await window.sb.auth.getUser()).data?.user || null; } catch (_) { return false; }
    if (!u?.id) return false;
    state.userId = u.id;
    ensureStyles(); root();

    const channelName = `pastele-live-notifications-${u.id}`;
    try {
      state.channel = window.sb.channel(channelName)
        .on('postgres_changes', {event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${u.id}`}, payload => show(payload.new))
        .subscribe();
    } catch (e) { console.warn('[PasTele] Realtime notification unavailable:', e); }

    // Lightweight fallback for browsers/networks where Realtime is delayed.
    let last = new Date().toISOString();
    state.poll = setInterval(async () => {
      try {
        const r = await window.sb.from('notifications').select('id,user_id,title,body,is_read,created_at,notification_type,link_url').eq('user_id',u.id).gt('created_at',last).order('created_at',{ascending:true}).limit(20);
        if (r.error) return;
        for (const n of (r.data || [])) show(n);
        if (r.data?.length) last = r.data[r.data.length - 1].created_at;
      } catch (_) {}
    }, 15000);
    return true;
  }

  function boot() {
    if (!document.body) return;
    const run = () => { let tries=0; const tick=()=>{ if (window.sb) init(); else if (++tries<30) setTimeout(tick,200); }; tick(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  }
  boot();
})();

/* PasTele — Global UI interaction safety layer */
(function () {
  'use strict';

  function isModifiedClick(event) {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  function getDestination(el) {
    return el?.dataset?.href || el?.dataset?.url || el?.getAttribute?.('data-link') || null;
  }

  document.addEventListener('click', function (event) {
    if (isModifiedClick(event)) return;

    const trigger = event.target.closest('[data-href],[data-url],[data-link]');
    if (!trigger || trigger.disabled || trigger.getAttribute('aria-disabled') === 'true') return;

    const destination = getDestination(trigger);
    if (!destination) return;

    if (trigger.matches('a[href]')) return;

    event.preventDefault();
    window.location.href = destination;
  }, false);

  document.addEventListener('keydown', function (event) {
    const el = event.target.closest?.('[data-href],[data-url],[data-link][role="button"]');
    if (!el) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const destination = getDestination(el);
    if (!destination) return;

    event.preventDefault();
    window.location.href = destination;
  }, false);

  // Make explicitly marked cards keyboard accessible without guessing routes.
  document.querySelectorAll('[data-href],[data-url],[data-link]').forEach(function (el) {
    if (!el.hasAttribute('tabindex') && !el.matches('a,button,input,select,textarea')) {
      el.setAttribute('tabindex', '0');
    }
    if (!el.hasAttribute('role') && !el.matches('a,button,input,select,textarea')) {
      el.setAttribute('role', 'button');
    }
  });
})();


/* Admin page hardening */
document.documentElement.classList.add("pastele-ready");