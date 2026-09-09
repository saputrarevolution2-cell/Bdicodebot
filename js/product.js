/* =========================================================
   PasTele — PRODUCT DETAIL
   FINAL SQL SYNC
   Supports:
   - products (Link / generic)
   - telegram_products (Code)
   - telegram_channels (Channel / Group)
   - pastes (Free)
   - pastelinks are served by paste-view.html via /p/*
   - Free / Paid access
   - Premium / purchase access
   - Like + comments according to SQL RLS
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const $ = id => document.getElementById(id);
  const box = $("content");
  const toast = (m,t="error") => window.TC?.toast ? TC.toast(m,t) : console[t === "error" ? "error" : "log"](m);
  const esc = v => window.TC?.esc ? TC.esc(String(v ?? "")) : String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const money = v => window.TC?.money ? TC.money(v) : `Rp ${Number(v||0).toLocaleString("id-ID")}`;
  const client = window.sb || window.supabaseClient || null;
  const params = new URLSearchParams(location.search);
  const requestedType = String(params.get("type") || "link").trim().toLowerCase();
  const requestedId = String(params.get("id") || "").trim();
  const requestedSlug = String(params.get("slug") || "").trim();
  let item = null;
  let resolvedType = requestedType;
  let rpcType = requestedType;

  if (!client || !box) return;

  const normalizeType = (type, row={}) => {
    const t = String(type || "").toLowerCase();
    if (t === "telegram_product" || t === "code") return "code";
    if (["telegram_channel","telegram-channel","channel"].includes(t)) return row.type === "group" ? "group" : "channel";
    if (t === "group" || t === "telegram_group" || t === "telegram-group") return "group";
    if (t === "paste") return "paste";
    if (t === "pastelink" || t === "paste-link" || t === "paste_link") return "pastelink";
    return "link";
  };

  const setHeader = (title, subtitle, icon="fa-box") => {
    const h = document.querySelector(".product-page-title");
    const p = document.querySelector(".product-page-subtitle");
    const b = document.querySelector(".product-badge span");
    const i = document.querySelector(".product-badge i");
    if (h) h.textContent = title || "Product";
    if (p) p.textContent = subtitle || "Detail produk dan akses.";
    if (b) b.textContent = "Product";
    if (i) i.className = `fa-solid ${icon}`;
  };

  const accessType = row => String(row?.access_type || "free").toLowerCase() === "paid" ? "paid" : "free";
  const priceOf = row => Number(row?.price || 0);

  async function currentProfile(){
    try { return typeof window.TC?.profile === "function" ? await window.TC.profile() : null; } catch { return null; }
  }

  async function resolve(){
    if (requestedType === "pastelink") {
      location.replace(`/p/${encodeURIComponent(requestedSlug)}`);
      return false;
    }
    if (requestedType === "paste") {
      if (requestedId) {
        const q = await client.from("pastes").select("id,owner_id,title,slug,content,visibility,password,created_at,updated_at").eq("id",requestedId).maybeSingle();
        if (q.error) throw q.error;
        item = q.data;
      } else {
        const q = await client.from("pastes").select("id,owner_id,title,slug,content,visibility,password,created_at,updated_at").eq("slug",requestedSlug).maybeSingle();
        if (q.error) throw q.error;
        item = q.data;
      }
      resolvedType = "paste";
      return !!item;
    }

    let table = "products";
    if (requestedType === "code") table = "telegram_products";
    if (["channel","group"].includes(requestedType)) table = "telegram_channels";
    const q = requestedId
      ? await client.from(table).select("id").eq("id",requestedId).maybeSingle()
      : await client.from(table).select("id").eq("slug",requestedSlug).maybeSingle();
    if (q.error) throw q.error;
    if (!q.data?.id) return false;
    const id = q.data.id;
    if (table === "products") rpcType = "product";
    else if (table === "telegram_products") rpcType = "telegram_product";
    else rpcType = "channel";
    const detail = await client.rpc("get_market_item_detail", {p_type:rpcType,p_id:id});
    if (detail.error) throw detail.error;
    item = Array.isArray(detail.data) ? detail.data[0] : detail.data;
    if (!item || item.found === false) return false;
    resolvedType = normalizeType(requestedType,item);
    return true;
  }

  function isOwner(profile){
    if (!profile?.id || !item) return false;
    return String(item.owner_id || item.creator_id || item.seller_id || item.owner_id) === String(profile.id);
  }

  async function canAccess(){
    if (accessType(item) === "free" || priceOf(item) <= 0) return {ok:true,reason:"free",profile:await currentProfile()};
    const profile = await currentProfile();
    if (!profile?.id) return {ok:false,reason:"login",profile:null};
    if (profile.is_premium === true || isOwner(profile)) return {ok:true,reason:"premium",profile};
    if (item.can_access === true) return {ok:true,reason:"purchase",profile};
    const purchase = await client.from("purchases").select("id,status").eq("buyer_id",profile.id).eq("product_id",item.id).in("status",["completed","paid","success"]).limit(1);
    if (!purchase.error && purchase.data?.length) return {ok:true,reason:"purchase",profile};
    return {ok:false,reason:"purchase",profile};
  }

  function telegramTarget(row){
    const raw = String(row?.username || row?.bot_username || row?.telegram_channel_id || "").trim();
    if (!raw) return "";
    if (/^https?:\/\/(?:t\.me|telegram\.me)\//i.test(raw)) return raw;
    if (/^@/.test(raw)) return `https://t.me/${raw.slice(1)}`;
    if (/^[A-Za-z0-9_]{5,32}$/.test(raw)) return `https://t.me/${raw}`;
    return "";
  }

  function renderLocked(access){
    const paid = priceOf(item);
    const login = access.reason === "login";
    box.innerHTML = `
      <div class="product-detail">
        <div class="product-detail-icon"><i class="fa-solid fa-lock"></i></div>
        <span class="badge"><i class="fa-solid fa-tag"></i> Paid</span>
        <h1>${esc(item.title || item.name || "Konten Berbayar")}</h1>
        <p class="muted">${esc(item.description || "Konten ini membutuhkan akses berbayar.")}</p>
        <div class="access-limit-note">
          <i class="fa-solid fa-shield-halved"></i>
          <span>${login ? "Silakan login untuk melanjutkan pembelian." : "Konten ini belum terbuka di akun kamu."}</span>
        </div>
        <div class="product-buy-area">
          <strong class="product-price">${money(paid)}</strong>
          <button class="btn primary" id="productBuyBtn" type="button"><i class="fa-solid fa-qrcode"></i> ${login ? "Login untuk Membeli" : "Beli Akses"}</button>
          <a class="btn" href="premium.html"><i class="fa-solid fa-gem"></i> Lihat Premium</a>
        </div>
      </div>`;
    $("productBuyBtn")?.addEventListener("click", async()=>{
      if (login) {
        const next=encodeURIComponent(location.href); location.href=`login.html?redirect=${next}`; return;
      }
      const btn=$("productBuyBtn"); btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
      try {
        const typeForCheckout = resolvedType === "code" ? "telegram_product" : (resolvedType === "channel" || resolvedType === "group" ? "channel" : "product");
        const q=await client.rpc("buy_market_item",{p_type:typeForCheckout,p_id:item.id});
        if(q.error) throw q.error;
        const oid=q.data?.order_id;
        if(!oid) throw new Error("Order ID tidak ditemukan.");
        location.href=`payment.html?order_id=${encodeURIComponent(oid)}`;
      } catch(e) { toast(e.message||"Checkout gagal.","error"); btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-qrcode"></i> Beli Akses'; }
    });
  }

  function renderOpen(access){
    const typeLabel = {link:"Link",paste:"Paste",code:"Code",channel:"Channel",group:"Group"}[resolvedType] || "Product";
    const icon = {link:"fa-link",paste:"fa-file-lines",code:"fa-code",channel:"fa-tower-broadcast",group:"fa-users"}[resolvedType] || "fa-box";
    const title=item.title || item.name || "Untitled";
    let contentHtml="";
    if (resolvedType === "channel" || resolvedType === "group") {
      const target=telegramTarget(item);
      contentHtml = target
        ? `<div class="telegram-access-card"><i class="fa-solid ${icon}"></i><div><strong>${esc(resolvedType === "group" ? "Group Telegram" : "Channel Telegram")}</strong><span>${esc(item.username || item.telegram_channel_id || item.name || "Telegram")}</span></div><a class="btn primary" href="${esc(target)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Telegram</a></div>`
        : `<div class="telegram-empty"><i class="fa-solid ${icon}"></i><div><strong>${esc(item.name || title)}</strong><span>Target Telegram belum memiliki URL publik yang dapat dibuka.</span></div></div>`;
    } else if (resolvedType === "paste") {
      contentHtml = `<div class="rich-output"><pre>${esc(item.content || "")}</pre></div>`;
    } else {
      const raw=String(item.content || "");
      const safe = resolvedType === "link" && /^https?:\/\//i.test(raw.trim())
        ? `<div class="telegram-access-card"><i class="fa-solid fa-link"></i><div><strong>Link tersedia</strong><span>${esc(raw.trim())}</span></div><a class="btn primary" href="${esc(raw.trim())}" target="_blank" rel="noopener noreferrer">Buka Link</a></div>`
        : `<div class="rich-output"><pre>${esc(raw)}</pre></div>`;
      contentHtml=safe;
    }
    box.innerHTML=`
      <div class="product-detail">
        <div class="product-detail-icon"><i class="fa-solid ${icon}"></i></div>
        <span class="badge"><i class="fa-solid ${accessType(item)==="paid"?"fa-tag":"fa-unlock"}"></i> ${accessType(item)==="paid"?"Paid":"Free"}</span>
        <h1>${esc(title)}</h1>
        <p class="muted">${esc(item.description || "")}</p>
        ${access.reason !== "free" ? `<div class="access-limit-note premium-access-note"><i class="fa-solid fa-circle-check"></i><span>Akses berhasil dibuka untuk akun kamu.</span></div>` : ""}
        ${contentHtml}
        <div class="product-detail-meta"><span><i class="fa-solid fa-eye"></i> ${Number(item.views||0).toLocaleString("id-ID")} views</span><span><i class="fa-solid fa-cart-shopping"></i> ${Number(item.sales_count||0).toLocaleString("id-ID")} sales</span></div>
      </div>`;
  }

  async function loadEngagement(){
    const targetId=item?.id; if(!targetId) return;
    const likeBtn=$("productLikeBtn"), likeCount=$("productLikeCount"), likeIcon=$("productLikeIcon"), likeLabel=$("productLikeLabel");
    const commentCount=$("productCommentCount"), list=$("productCommentList"), form=$("productCommentForm"), submit=$("productCommentSubmit");
    const targetType = resolvedType === "code" ? "telegram_product" : resolvedType;
    const likes=await client.from("content_likes").select("id,actor_id").eq("target_id",targetId).eq("target_type",targetType);
    if(!likes.error){
      const profile=await currentProfile(); const mine=!!profile?.id && likes.data.some(x=>String(x.actor_id)===String(profile.id));
      if(likeCount) likeCount.textContent=String(likes.data.length);
      if(likeBtn) likeBtn.setAttribute("aria-pressed",mine?"true":"false");
      if(likeIcon) likeIcon.className=mine?"fa-solid fa-heart":"fa-regular fa-heart";
      if(likeLabel) likeLabel.textContent=mine?"Disukai":"Suka";
    }
    if (likeBtn) likeBtn.onclick=async()=>{
      const profile=await currentProfile();
      if(!profile?.id){ location.href=`login.html?redirect=${encodeURIComponent(location.href)}`; return; }
      const q=await client.rpc("toggle_content_like",{p_target_id:targetId,p_target_type:targetType,p_owner:item.owner_id||item.creator_id||item.seller_id||null});
      if(q.error){toast(q.error.message||"Gagal menyukai.","error");return;}
      await loadEngagement();
    };
    const comments=await client.from("content_comments").select("id,user_id,body,created_at").eq("target_id",targetId).eq("target_type",targetType).order("created_at",{ascending:false}).limit(100);
    if(!comments.error){
      if(commentCount) commentCount.textContent=String(comments.data.length);
      if(list) list.innerHTML=comments.data.length?comments.data.map(c=>`<article class="product-comment-item"><div class="product-comment-avatar"><i class="fa-solid fa-user"></i></div><div><strong>User</strong><time>${new Date(c.created_at).toLocaleString("id-ID")}</time><p>${esc(c.body)}</p></div></article>`).join(""):'<div class="empty">Belum ada komentar.</div>';
    }
    const profile=await currentProfile();
    if(!profile?.id){
      const note=form?.querySelector(".product-comment-actions"); if(note) note.insertAdjacentHTML("beforebegin",'<div class="access-limit-note"><i class="fa-solid fa-right-to-bracket"></i><span>Login diperlukan untuk memberikan komentar.</span></div>');
      if(submit){submit.disabled=true;submit.title="Login diperlukan";}
    } else {
      if (form) form.onsubmit=async e=>{
        e.preventDefault(); const name=$("commentName"), text=$("commentText"); const body=String(text?.value||"").trim(); if(!body) return;
        submit.disabled=true;
        const q=await client.from("content_comments").insert({target_id:targetId,target_type:targetType,user_id:profile.id,body});
        if(q.error) toast(q.error.message||"Komentar gagal dikirim.","error"); else {text.value="";$("commentCharCount").textContent="0";toast("Komentar berhasil dikirim.","success");await loadEngagement();}
        submit.disabled=false;
      };
      $("commentText")?.addEventListener("input",()=>{$("commentCharCount").textContent=String($("commentText").value.length);});
    }
  }

  try {
    box.setAttribute("aria-busy","true");
    const ok=await resolve();
    if(!ok){ box.innerHTML='<div class="empty">Produk tidak ditemukan atau sudah tidak tersedia.</div>'; return; }
    const title=item.title || item.name || "Product";
    setHeader(title,item.description||"Detail produk dan akses.",({link:"fa-link",paste:"fa-file-lines",code:"fa-code",channel:"fa-tower-broadcast",group:"fa-users"}[resolvedType]||"fa-box"));
    const access=await canAccess();
    if(access.ok) renderOpen(access); else renderLocked(access);

    /* Record every opening; the SQL trigger creates the owner's notification. */
    try {
      const owner = item.owner_id || item.creator_id || item.seller_id || null;
      const targetType = resolvedType === "code" ? "telegram_product" : (resolvedType === "channel" || resolvedType === "group" ? "channel" : resolvedType);
      await client.rpc("record_content_view", { p_owner: owner, p_target_type: targetType, p_target_id: item.id });
    } catch (viewError) {
      console.warn("[Product] View tracking unavailable:", viewError);
    }

    await loadEngagement();
  } catch(e){
    console.error("[Product]",e);
    box.innerHTML=`<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><br><br>${esc(e.message||"Gagal memuat produk.")}</div>`;
  } finally { box.setAttribute("aria-busy","false"); }
});
