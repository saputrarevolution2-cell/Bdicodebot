/* PasTele FINAL FIX PACK — 2026-09-14
   UI + routing + pagination + notifications + profile engagement.
   This file is intentionally additive and uses the database contracts
   shipped in database.sql.
*/
(() => {
  "use strict";
  const sb = () => window.sb || window.supabaseClient || null;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const money = v => `Rp ${Number(v||0).toLocaleString("id-ID")}`;
  const currentPath = () => location.pathname.toLowerCase();

  function pager(host, total, page, onPage){
    if(!host) return;
    if(total<=1){host.innerHTML="";return;}
    const pages=[];
    const add=(p,label=p,active=false,disabled=false)=>pages.push(`<button type="button" data-final-page="${p}" class="${active?'active':''}" ${disabled?'disabled':''}>${label}</button>`);
    add(page-1,"‹",false,page===1);
    const from=Math.max(1,page-2),to=Math.min(total,page+2);
    if(from>1){add(1);if(from>2)pages.push("<span>…</span>")}
    for(let i=from;i<=to;i++)add(i,i,i===page);
    if(to<total){if(to<total-1)pages.push("<span>…</span>");add(total)}
    add(page+1,"›",false,page===total);
    host.innerHTML=pages.join("");
    host.querySelectorAll("[data-final-page]").forEach(b=>b.addEventListener("click",()=>onPage(Number(b.dataset.finalPage))));
  }

  async function initIndex(){
    if(!document.body.classList.contains("index-page") || !window.sb) return;
    const host=$("publishedGrid"); if(!host) return;
    // index.js in the supplied package queried non-existent is_published columns.
    // Rebuild its public preview using the actual database.sql columns.
    try{
      const q=await Promise.all([
        sb().from("products").select("id,title,slug,description,price,status,views,sales_count,creator_id,seller_id,created_at,thumbnail_url").in("status",["published","active"]).order("created_at",{ascending:false}).limit(100),
        sb().from("pastelinks").select("id,title,slug,description,visibility,access_type,price,views,user_id,created_at,expires_at").eq("visibility","public").order("created_at",{ascending:false}).limit(100),
        sb().from("telegram_products").select("id,title,description,slug,product_type,type,access_type,price,status,owner_id,views,created_at").in("status",["published","active"]).order("created_at",{ascending:false}).limit(100),
        sb().from("telegram_channels").select("id,name,description,slug,type,access_type,price,status,owner_id,views,created_at").in("status",["published","active"]).order("created_at",{ascending:false}).limit(100)
      ]);
      const rows=[
        ...(q[0].data||[]).map(x=>({...x,_source:"products",type:x.type||"link"})),
        ...(q[1].data||[]).map(x=>({...x,_source:"pastelinks",type:"pastelink"})),
        ...(q[2].data||[]).map(x=>({...x,_source:"telegram_products",type:"code"})),
        ...(q[3].data||[]).map(x=>({...x,_source:"telegram_channels",type:String(x.type||"channel").toLowerCase()==="group"?"group":"channel"}))
      ].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
      const ownerIds=[...new Set(rows.map(x=>x.creator_id||x.owner_id||x.user_id||x.seller_id).filter(Boolean))];
      let pm=new Map();
      if(ownerIds.length){
        const p=await sb().from("profiles").select("id,username,display_name").in("id",ownerIds);
        (p.data||[]).forEach(x=>pm.set(String(x.id),x));
      }
      const url=x=>{
        const slug=String(x.slug||"").trim(), a=(String(x.access_type||"").toLowerCase()==="paid"||Number(x.price||0)>0)?"p":"f";
        if(x._source==="pastelinks")return `/p/${encodeURIComponent(slug)}`;
        if(x.type==="code")return `/c/${a}/${encodeURIComponent(slug)}`;
        if(x.type==="channel")return `/ch/${a}/${encodeURIComponent(slug)}`;
        if(x.type==="group")return `/g/${a}/${encodeURIComponent(slug)}`;
        return slug?`product.html?id=${encodeURIComponent(x.id)}&type=link`:`product.html?id=${encodeURIComponent(x.id)}`;
      };
      const card=x=>{
        const owner=x.creator_id||x.owner_id||x.user_id||x.seller_id, p=pm.get(String(owner));
        const price=Number(x.price||0);
        return `<a class="ix-market-card" href="${esc(url(x))}">
          <div class="ix-market-top"><span class="ix-type"><i class="fa-solid ${x.type==="code"?"fa-code":x.type==="group"?"fa-users":x.type==="channel"?"fa-broadcast-tower":"fa-link"}"></i></span><span class="ix-label">${esc(x.type==="pastelink"?"PasteLink":x.type)}</span></div>
          <h3>${esc(x.title||x.name||"Untitled")}</h3><p>${esc(x.description||"Konten publik PasTele.")}</p>
          <div class="ix-meta"><span><i class="fa-solid fa-eye"></i>${Number(x.views||0).toLocaleString("id-ID")}</span><span><i class="fa-solid fa-user"></i>${esc(p?.display_name||p?.username||"Creator")}</span></div>
          <div class="ix-market-bottom"><strong class="ix-price ${price<=0?"ix-free":""}">${price<=0?"Gratis":esc(money(price))}</strong><span class="ix-open">Buka <i class="fa-solid fa-arrow-right"></i></span></div>
        </a>`;
      };
      host.innerHTML=rows.slice(0,12).map(card).join("")||`<div class="ix-loading"><i class="fa-regular fa-folder-open"></i><b>Belum ada konten publik.</b><small>Konten yang sudah publish akan muncul di sini.</small></div>`;
    }catch(e){console.warn("[PasTele Final] index:",e)}
  }

  function paginateExisting(listHost, perPage=10, pagerClass="final-pager"){
    if(!listHost || listHost.dataset.finalPagination==="1") return;
    listHost.dataset.finalPagination="1";
    const pagerHost=document.createElement("div"); pagerHost.className=pagerClass; listHost.after(pagerHost);
    let page=1, lastSignature="";
    const apply=()=>{
      const children=[...listHost.children].filter(x=>!x.matches(".empty,.final-empty"));
      const sig=children.map(x=>x.outerHTML.length+":"+x.textContent.slice(0,30)).join("|");
      if(sig!==lastSignature){page=1;lastSignature=sig}
      const total=Math.max(1,Math.ceil(children.length/perPage)); page=Math.min(page,total);
      children.forEach((el,i)=>el.style.display=(i>=(page-1)*perPage&&i<page*perPage)?"":"none");
      pager(pagerHost,total,page,p=>{page=p;apply()});
    };
    const mo=new MutationObserver(()=>requestAnimationFrame(apply)); mo.observe(listHost,{childList:true,subtree:true});
    setTimeout(apply,500); setTimeout(apply,1500);
  }

  async function initNotifications(){
    if(!currentPath().endsWith("/notifications.html") || !sb()) return;
    let user=null; try{user=(await sb().auth.getUser()).data?.user||null}catch{}
    if(!user)return;
    const host=$("content"); if(!host)return;
    try{
      const r=await sb().from("notifications").select("id,title,body,is_read,created_at,link_url,notification_type").eq("user_id",user.id).order("created_at",{ascending:false}).limit(200);
      if(r.error)throw r.error;
      const rows=r.data||[];
      host.innerHTML=`<section class="final-notifications-wrap"><header><div><span class="badge"><i class="fa-solid fa-bell"></i> NOTIFIKASI</span><h1>Notifikasi</h1><p>Pembaruan akun dan aktivitas terbaru.</p></div><button class="btn" id="finalReadAll"><i class="fa-solid fa-check-double"></i> Saya sudah baca</button></header><div class="final-notification-list">${rows.map(n=>`
        <article class="notification-item ${n.is_read?"read":"unread"}" data-notification-id="${esc(n.id)}">
          <div class="final-notif-icon"><i class="fa-solid ${n.notification_type==="purchase"?"fa-cart-shopping":n.notification_type==="follow"?"fa-user-plus":"fa-bell"}"></i></div>
          <div class="final-notif-body"><strong>${esc(n.title)}</strong><time>${new Date(n.created_at).toLocaleString("id-ID")}</time>
            <p class="final-notif-text" data-full="${esc(n.body||"")}">${esc((n.body||"").length>180?(n.body||"").slice(0,180)+"…":n.body||"")}</p>
            ${(n.body||"").length>180?`<button type="button" class="final-read-more">Baca selanjutnya</button>`:""}
            ${n.link_url?`<a class="final-notif-link" href="${esc(n.link_url)}">Buka <i class="fa-solid fa-arrow-right"></i></a>`:""}
          </div>
          <span class="final-unread-dot" aria-hidden="true"></span>
        </article>`).join("")||`<div class="final-empty"><i class="fa-regular fa-bell-slash"></i><strong>Tidak ada notifikasi</strong></div>`}</div></section>`;
      host.querySelectorAll(".final-read-more").forEach(b=>b.addEventListener("click",()=>{
        const p=b.previousElementSibling;p.textContent=p.dataset.full||"";b.remove();
      }));
      host.querySelectorAll(".notification-item.unread").forEach(el=>el.addEventListener("click",async e=>{
        if(e.target.closest("a,button"))return;
        const id=el.dataset.notificationId;
        await sb().from("notifications").update({is_read:true}).eq("id",id).eq("user_id",user.id);
        el.classList.remove("unread");el.classList.add("read");
      }));
      $("finalReadAll")?.addEventListener("click",async()=>{
        await sb().from("notifications").update({is_read:true}).eq("user_id",user.id).eq("is_read",false);
        host.querySelectorAll(".notification-item").forEach(x=>x.classList.remove("unread"));
      });
    }catch(e){console.warn("[PasTele Final] notifications:",e)}
  }

  async function initWithdraw(){
    if(!currentPath().endsWith("/withdrawals.html"))return;
    const box=$("manualBox"), status=$("manualStatus"), form=$("wd"); if(!box||!status||!form)return;
    const sync=()=>{
      const closed=["closed","off","inactive"].includes(String(status.dataset.state||"").toLowerCase()) ||
        /sedang tutup|tutup/i.test(status.textContent||"");
      box.classList.toggle("is-closed",closed);
      form.querySelectorAll("input,select,textarea,button").forEach(el=>{el.disabled=closed;el.setAttribute("aria-disabled",String(closed))});
    };
    new MutationObserver(sync).observe(status,{attributes:true,childList:true,subtree:true,characterData:true});
    sync();
  }

  async function initProfile(){
    if(!currentPath().endsWith("/profile.html")||!sb())return;
    try{
      const user=(await sb().auth.getUser()).data?.user; if(!user)return;
      const params=new URLSearchParams(location.search);
      const target=params.get("id")||params.get("username");
      // Existing profile.js remains the source of profile rendering/following.
      // Add visit notification only for another user's profile.
      if(target){
        const profileQuery = /^[0-9a-f-]{36}$/i.test(target)
          ? sb().from("profiles").select("id,username,display_name").eq("id",target).maybeSingle()
          : sb().from("profiles").select("id,username,display_name").eq("username",target).maybeSingle();
        const q=await profileQuery;
        if(!q.error&&q.data?.id&&q.data.id!==user.id){
          await sb().rpc("notify_profile_visit",{p_profile_id:q.data.id});
        }
      }
    }catch(e){console.warn("[PasTele Final] profile visit:",e)}
    const follow=$("followBtn");
    // Never expose follow on own profile.
    const ownText=String(document.body.textContent||"");
    if(follow && /profil saya|my profile/i.test(ownText) && !new URLSearchParams(location.search).get("id")&&!new URLSearchParams(location.search).get("username")) follow.hidden=true;
  }

  async function initProductEngagement(){
    if(!currentPath().includes("product") && !/^\/(c|ch|g|p|paste)\//.test(currentPath()))return;
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<20;i++){if($("productLikeBtn")||$("productCommentForm"))break;await wait(250)}
    const like=$("productLikeBtn"), form=$("productCommentForm"); if(!like&&!form)return;
    const client=sb(); if(!client)return;
    const parts=location.pathname.split("/").filter(Boolean);
    let type="product";
    if(parts[0]==="c")type="telegram_product";
    else if(parts[0]==="ch")type="channel";
    else if(parts[0]==="g")type="channel";
    else if(parts[0]==="p")type="pastelink";
    else if(parts[0]==="paste")type="paste";
    const id=(new URLSearchParams(location.search)).get("id");
    // Find target id from current DOM's canonical product query when available.
    let targetId=id;
    if(!targetId){
      const slug=parts.length>=2?decodeURIComponent(parts.slice(2).join("/")):parts[1];
      const table=type==="telegram_product"?"telegram_products":type==="channel"?"telegram_channels":type==="pastelink"?"pastelinks":"products";
      const col=type==="pastelink"?"slug":"slug";
      try{const q=await client.from(table).select("id").ilike(col,slug).maybeSingle();targetId=q.data?.id||null}catch{}
    }
    if(!targetId)return;
    const guestToken=()=>{let k="pastele-guest-token";let v=localStorage.getItem(k);if(!v){v=crypto.randomUUID();localStorage.setItem(k,v)}return v};
    const refresh=async()=>{
      const l=await client.from("content_likes").select("id,actor_id",{count:"exact"}).eq("target_id",targetId).eq("target_type",type);
      if($("productLikeCount"))$("productLikeCount").textContent=String(l.count||0);
      const me=(await client.auth.getUser()).data?.user||null;
      if(me&&like){const mine=(l.data||[]).some(x=>x.actor_id===me.id);$("productLikeIcon").className=mine?"fa-solid fa-heart":"fa-regular fa-heart";$("productLikeLabel").textContent=mine?"Disukai":"Suka"}
      const c=await client.from("content_comments").select("id,user_id,body,created_at").eq("target_id",targetId).eq("target_type",type).order("created_at",{ascending:false}).limit(100);
      if($("productCommentCount"))$("productCommentCount").textContent=String((c.data||[]).length);
      const list=$("productCommentList");if(list)list.innerHTML=(c.data||[]).map(x=>`<article class="product-comment-item"><div class="product-comment-avatar"><i class="fa-solid fa-user"></i></div><div><strong>${x.user_id?"User":"Guest"}</strong><time>${new Date(x.created_at).toLocaleString("id-ID")}</time><p>${esc(x.body)}</p></div></article>`).join("")||'<div class="empty">Belum ada komentar.</div>';
    };
    if(like)like.onclick=async()=>{
      like.disabled=true;
      try{
        const me=(await client.auth.getUser()).data?.user||null;
        if(me){
          const ex=await client.from("content_likes").select("id").eq("actor_id",me.id).eq("target_id",targetId).eq("target_type",type).maybeSingle();
          if(ex.data)await client.from("content_likes").delete().eq("id",ex.data.id);
          else{
            const tableName=type==="telegram_product"?"telegram_products":type==="channel"?"telegram_channels":type==="pastelink"?"pastelinks":"products";
            const ownerFields=type==="telegram_product"?"owner_id":type==="channel"?"owner_id":type==="pastelink"?"user_id":"creator_id,seller_id";
            const owner=(await client.from(tableName).select(ownerFields).eq("id",targetId).maybeSingle()).data;
            await client.from("content_likes").insert({content_owner_id:owner?.owner_id||owner?.creator_id||owner?.seller_id||owner?.user_id,actor_id:me.id,target_id:targetId,target_type:type});
          }
        }else{
          await client.rpc("toggle_content_like_guest",{p_target_id:targetId,p_target_type:type,p_guest_token:guestToken()});
        }
        await refresh();
      }catch(e){console.warn("[PasTele Final] like:",e)}
      like.disabled=false;
    };
    if(form)form.onsubmit=async e=>{
      e.preventDefault();const input=$("commentText");const body=String(input?.value||"").trim();if(!body||body.length>5000)return;
      const me=(await client.auth.getUser()).data?.user||null;const b={target_id:targetId,target_type:type,user_id:me?.id||null,body};
      const q=await client.from("content_comments").insert(b);
      if(q.error){console.warn("[PasTele Final] comment:",q.error);return}
      input.value="";if($("commentCharCount"))$("commentCharCount").textContent="0";await refresh();
    };
    await refresh();
  }

  function initProductTicker(){
    if(!currentPath().includes("product") && !/^\/(c|ch|g)\//.test(currentPath()))return;
    if(document.querySelector(".final-ticker"))return;
    const main=document.querySelector("main")||document.body;
    const t=document.createElement("div");t.className="final-ticker";
    t.innerHTML='<a href="marketplace.html" aria-label="Kembali ke marketplace"><span><i class="fa-solid fa-bolt"></i> Lihat lebih banyak konten di Marketplace PasTele — klik di sini untuk membuka daftar produk.</span></a>';
    main.prepend(t);
  }

  function boot(){
    initIndex();
    initNotifications();
    initWithdraw();
    initProfile();
    initProductEngagement();
    initProductTicker();
    if(currentPath().endsWith("/my-products.html")){
      const initMy=()=>{
        document.querySelectorAll("#content .my-list").forEach(x=>paginateExisting(x,10));
      };
      setTimeout(initMy,700); setTimeout(initMy,1600);
    }
    // Purchases already has a pager; normalize visible page size to 10 through a compact observer.
    
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
