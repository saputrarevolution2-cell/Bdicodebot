/* PasTele index.js — public data only. No dashboard logic. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const n=v=>Number.isFinite(Number(v))?Number(v):0;
  const compact=v=>{v=n(v);if(v>=1e6)return (v/1e6).toFixed(v>=1e7?0:1)+"jt";if(v>=1e3)return (v/1e3).toFixed(v>=1e4?0:1)+"rb";return v.toLocaleString("id-ID")};
  const money=v=>n(v)<=0?"Gratis":"Rp "+n(v).toLocaleString("id-ID");
  let items=[],filter="all";

  const meta={
    link:{label:"PasteLink",icon:"fa-link",cls:"link"},
    code:{label:"Code",icon:"fa-code",cls:"code"},
    channel:{label:"Channel",icon:"fa-broadcast-tower",cls:"channel"},
    group:{label:"Group",icon:"fa-users",cls:"group"},
    product:{label:"Product",icon:"fa-box",cls:"product"}
  };

  const typeOf=(r,s)=>{
    s=String(s||"").toLowerCase();
    const raw=String(r?.type||r?.product_type||r?.item_type||"").toLowerCase();
    if(s==="pastelinks")return"link";
    if(s==="telegram_products")return raw.includes("group")?"group":"code";
    if(s==="telegram_channels")return raw==="group"?"group":"channel";
    if(["link","paste","pastelink","paste-link"].includes(raw))return"link";
    if(raw==="code"||raw==="telegram_product")return"code";
    if(raw==="group"||raw==="telegram_group")return"group";
    if(raw==="channel"||raw==="telegram_channel")return"channel";
    return"product";
  };
  const published=(r,s)=>{
    if(s==="pastelinks")return String(r?.visibility||"").toLowerCase()==="public";
    if("is_published" in (r||{}))return r.is_published===true;
    return ["published","public","active"].includes(String(r?.status||"").toLowerCase());
  };
  const title=r=>r?.title||r?.name||"Untitled";
  const views=r=>n(r?.views||r?.view_count);
  const creator=r=>r?.creator_name||r?.display_name||r?.creator_username||r?.username||"Creator PasTele";
  const owner=r=>r?.creator_id||r?.owner_id||r?.user_id||r?.seller_id;
  const access=r=>String(r?.access_type||"").toLowerCase()||(n(r?.price)>0?"paid":"free");
  const url=r=>{
    const t=typeOf(r,r._source),s=encodeURIComponent(r?.slug||"");
    if(r._source==="pastelinks")return"paste-view.html?slug="+s;
    const p=access(r)==="paid"?"p":"f";
    if(t==="code")return"/c/"+p+"/"+s;
    if(t==="channel")return"/ch/"+p+"/"+s;
    if(t==="group")return"/g/"+p+"/"+s;
    return"product.html?id="+encodeURIComponent(r?.id||"");
  };

  async function table(source,select){
    if(!window.sb)return[];
    try{
      let q=await sb.from(source).select(select).order("created_at",{ascending:false}).limit(100);
      if(q.error)throw q.error;
      return(q.data||[]).filter(r=>published(r,source)).map(r=>({...r,_source:source}));
    }catch(e){console.warn("[PasTele index]",source,e);return[]}
  }

  async function addCreators(rows){
    if(!window.sb)return rows;
    const ids=[...new Set(rows.map(owner).filter(Boolean))];if(!ids.length)return rows;
    try{
      const q=await sb.from("profiles").select("id,username,display_name").in("id",ids);
      if(q.error)return rows;
      const map=Object.fromEntries((q.data||[]).map(x=>[String(x.id),x]));
      return rows.map(r=>{const p=map[String(owner(r))];return p?({...r,creator_name:p.display_name||p.username,creator_username:p.username}):r});
    }catch(_){return rows}
  }

  function card(r){
    const t=typeOf(r,r._source),m=meta[t]||meta.product,p=n(r.price);
    return`<a class="ix-market-card" href="${esc(url(r))}">
      <div class="ix-market-top"><span class="ix-type ${m.cls}"><i class="fa-solid ${m.icon}"></i></span><span class="ix-label">${m.label}</span></div>
      <h3>${esc(title(r))}</h3><p>${esc(r.description||(t==="link"?"PasteLink publik PasTele.":"Konten publik PasTele."))}</p>
      <div class="ix-meta"><span><i class="fa-solid fa-eye"></i>${compact(views(r))}</span><span><i class="fa-solid fa-user"></i>${esc(creator(r))}</span></div>
      <div class="ix-market-bottom"><strong class="ix-price ${p<=0?"ix-free":""}">${esc(p<=0?"Gratis":money(p))}</strong><span class="ix-open">Buka <i class="fa-solid fa-arrow-up-right-from-square"></i></span></div>
    </a>`;
  }

  function render(){
    const host=$("publishedGrid");if(!host)return;
    const data=filter==="all"?items:items.filter(r=>typeOf(r,r._source)===filter);
    host.innerHTML=data.slice(0,12).map(card).join("")||`<div class="ix-loading"><i class="fa-regular fa-folder-open"></i><b>Belum ada konten publik.</b><small>Konten yang sudah publish akan muncul di sini.</small></div>`;
  }

  function rank(id,t){
    const host=$(id);if(!host)return;
    const data=items.filter(r=>typeOf(r,r._source)===t).sort((a,b)=>views(b)-views(a)).slice(0,10);
    if(!data.length){host.innerHTML='<div class="ix-rank-row"><span></span><span class="ix-rank-title"><b>Belum ada data.</b></span><span></span></div>';return}
    host.innerHTML=data.map((r,i)=>`<a class="ix-rank-row" href="${esc(url(r))}"><span class="ix-rank-no">#${i+1}</span><span class="ix-rank-title"><b>${esc(title(r))}</b><small><span><i class="fa-solid fa-eye"></i> ${compact(views(r))}</span><span><i class="fa-solid fa-user"></i> ${esc(creator(r))}</span></small></span><strong class="ix-rank-price ${n(r.price)<=0?"free":""}">${esc(n(r.price)<=0?"Gratis":money(r.price))}</strong></a>`).join("");
  }

  async function loadContent(){
    const [p,l,c,ch]=await Promise.all([
      table("products","id,title,slug,description,price,status,views,sales_count,creator_id,seller_id,created_at,updated_at,thumbnail_url"),
      table("pastelinks","id,title,slug,description,visibility,views,user_id,created_at,updated_at,expires_at"),
      table("telegram_products","id,title,description,slug,product_type,access_type,price,is_published,owner_id,views,created_at,updated_at"),
      table("telegram_channels","id,name,title,description,slug,type,access_type,price,is_published,owner_id,views,created_at,updated_at")
    ]);
    items=await addCreators([...p,...l,...c,...ch].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)));
    render();rank("topLink","link");rank("topCode","code");rank("topChannel","channel");rank("topGroup","group");
  }

  async function loadStats(){
    if(!window.sb)return;
    try{
      const q=await sb.rpc("get_public_workspace_stats");
      if(q.error||!q.data)return;
      const x=q.data;
      const content=n(x.total_content||x.content||x.public_content);
      const creators=n(x.creators||x.total_creators||x.creator_count);
      const viewsN=n(x.total_views||x.views);
      const sales=n(x.sales||x.total_sales||x.sales_count);
      if($("statContent"))$("statContent").textContent=compact(content);
      if($("statCreators"))$("statCreators").textContent=compact(creators);
      if($("statViews"))$("statViews").textContent=compact(viewsN);
      if($("statSales"))$("statSales").textContent=compact(sales);
      if($("mockPastes"))$("mockPastes").textContent=compact(x.payment_links||x.pastes||0);
      if($("mockCodes"))$("mockCodes").textContent=compact(x.code_products||x.codes||0);
      if($("mockTelegram"))$("mockTelegram").textContent=compact(x.telegram_access||x.telegram||0);
      const rev=n(x.total_revenue||x.revenue||0);
      if($("mockRevenue"))$("mockRevenue").textContent="Rp"+rev.toLocaleString("id-ID");
      if($("creatorMoney"))$("creatorMoney").textContent=rev.toLocaleString("id-ID");
    }catch(e){console.warn("[PasTele stats]",e)}
  }

  function filters(){document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.filter||"all";render()}))}
  function reveal(){
    const els=document.querySelectorAll("[data-reveal]");
    if(!("IntersectionObserver"in window)){els.forEach(x=>x.classList.add("is-visible"));return}
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const x=e.target;setTimeout(()=>x.classList.add("is-visible"),Number(x.dataset.delay||0));io.unobserve(x)}}),{threshold:.08});
    els.forEach(x=>io.observe(x));
  }
  function init(){filters();reveal();Promise.allSettled([loadContent(),loadStats()])}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();