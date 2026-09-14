
(() => {
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
const toast=(m,t="info")=>window.TC?.toast?window.TC.toast(m,t):alert(m);
const qs=new URLSearchParams(location.search);
const slug=decodeURIComponent((qs.get("slug")||"").trim());
function guestToken(){let k="pastele-guest-checkout-token",v=localStorage.getItem(k);if(!v){v=crypto.randomUUID();localStorage.setItem(k,v)}return v}
async function user(){try{return await window.TC?.user?.()||null}catch{return null}}
function targetType(kind){return kind==="code"?"telegram_product":kind==="channel"||kind==="group"?"channel":kind}
function telegramUrl(item){let x=String(item?.invite_url||item?.username||item?.bot_username||item?.telegram_channel_id||"").trim();if(/^https?:\/\//i.test(x))return x;if(/^@/.test(x))return "https://t.me/"+x.slice(1);if(/^[A-Za-z0-9_]{5,32}$/.test(x))return "https://t.me/"+x;return ""}
async function resolve(kind){
 const client=window.sb;if(!client)throw Error("Supabase belum siap.");
 if(!slug)throw Error("Link konten tidak lengkap.");
 let data,error;
 if(kind==="pastelink")({data,error}=await client.rpc("get_pastelink_by_slug",{p_slug:slug}));
 else if(kind==="code")({data,error}=await client.rpc("get_code_by_slug",{p_slug:slug}));
 else ({data,error}=await client.rpc("get_telegram_content_by_slug",{p_slug:slug,p_type:kind}));
 if(error)throw error;
 return Array.isArray(data)?data[0]:data;
}
async function detailById(kind,id){
 const client=window.sb; const type=targetType(kind);
 const u=await user(); const tok=u?null:localStorage.getItem("pastele-guest-checkout-token");
 const q=tok?await client.rpc("get_market_item_detail_guest",{p_type:type,p_id:id,p_guest_token:tok}):await client.rpc("get_market_item_detail",{p_type:type,p_id:id});
 if(q.error)throw q.error; return Array.isArray(q.data)?q.data[0]:q.data;
}
function isPaid(item){return String(item?.access_type||"free").toLowerCase()==="paid"||Number(item?.price||0)>0}
async function refreshItem(kind,item){
 if(!item?.id)return item;
 try{return await detailById(kind,item.id)}catch{return item}
}
async function accessState(kind,item){
 const paid=isPaid(item); if(!paid)return {ok:true,reason:"free"};
 const u=await user();
 if(u?.id && (String(item.owner_id||item.creator_id||item.seller_id)===String(u.id) || item.can_access===true || item.is_premium===true))return {ok:true,reason:item.is_premium?"premium":"owner"};
 if(u?.id){
   const q=await window.sb.from("purchases").select("id").eq("buyer_id",u.id).eq("product_id",item.id).in("status",["completed","paid","success"]).limit(1);
   if(!q.error&&q.data?.length)return {ok:true,reason:"purchase"};
 }
 const tok=localStorage.getItem("pastele-guest-checkout-token");
 if(tok){
   const q=await window.sb.from("orders").select("id").eq("guest_access_token",tok).eq("product_id",item.id).eq("buyer_id",null).in("status",["paid","completed","success"]).limit(1);
   if(!q.error&&q.data?.length)return {ok:true,reason:"guest_purchase"};
 }
 return {ok:false,reason:"purchase"};
}
async function startBuy(kind,item){
 const paid=isPaid(item); if(!paid)return;
 const u=await user(); let tok=null;
 if(!u){
   tok=guestToken();
   const ok=confirm("Pembelian sebagai Guest.\n\nGuest bisa membeli, tetapi akses tidak dijamin permanen jika identitas Guest hilang. Login/daftar terlebih dahulu disarankan agar pembelian tersimpan permanen di akun.\n\nLanjut sebagai Guest?");
   if(!ok)return;
 }
 const type=targetType(kind);
 const q=await window.sb.rpc("buy_market_item_guest",{p_type:type,p_id:item.id,p_guest_token:tok});
 if(q.error)throw q.error;
 const oid=q.data?.order_id;if(!oid)throw Error("Order ID tidak ditemukan.");
 location.href=`payment.html?order_id=${encodeURIComponent(oid)}${tok?"&guest_token="+encodeURIComponent(tok):""}`;
}
async function loadSocial(kind,item){
 const client=window.sb, tid=item.id, tt=targetType(kind);
 const [likes,comments,shares,u]=await Promise.all([
   client.from("content_likes").select("id,actor_id,guest_token").eq("target_id",tid).eq("target_type",tt),
   client.from("content_comments").select("id,user_id,guest_token,body,display_name,created_at").eq("target_id",tid).eq("target_type",tt).order("created_at",{ascending:false}).limit(100),
   client.from("analytics_events").select("id",{count:"exact",head:true}).eq("target_id",tid).eq("target_type",tt).eq("event_type","share"),
   user()
 ]);
 const lc=$("likeCount"),cc=$("commentCount"),sc=$("shareCount");
 if(lc)lc.textContent=String(likes.error?0:(likes.data||[]).length); if($("likeCountMeta"))$("likeCountMeta").textContent=lc?.textContent||"0";
 if(cc)cc.textContent=String(comments.error?0:(comments.data||[]).length); if($("commentCountMeta"))$("commentCountMeta").textContent=cc?.textContent||"0";
 if(sc)sc.textContent=String(shares.error?0:(shares.count||0)); if($("shareCountMeta"))$("shareCountMeta").textContent=sc?.textContent||"0";
 const mine=!!u?.id && !likes.error && (likes.data||[]).some(x=>String(x.actor_id)===String(u.id));
 $("likeBtn")?.setAttribute("aria-pressed",mine?"true":"false");
 $("likeIcon")?.classList.toggle("fa-solid",mine); $("likeIcon")?.classList.toggle("fa-regular",!mine);
 $("likeLabel")&&( $("likeLabel").textContent=mine?"Disukai":"Suka");
 const list=$("commentList");
 if(list)list.innerHTML=comments.error?"":(comments.data?.length?comments.data.map(c=>`<article class="comment"><div class="avatar"><i class="fa-solid fa-user"></i></div><div><strong>${esc(c.display_name||(c.user_id?"User":"Guest"))}</strong><time>${new Date(c.created_at).toLocaleString("id-ID")}</time><p>${esc(c.body)}</p></div></article>`).join(""):'<div class="empty">Belum ada komentar.</div>');
 $("likeBtn")?.addEventListener("click",async()=>{
   const p=await user();let q;
   if(p?.id)q=await client.rpc("toggle_content_like",{p_target_id:tid,p_target_type:tt,p_owner:item.owner_id||item.creator_id||item.seller_id||null});
   else q=await client.rpc("toggle_content_like_guest",{p_target_id:tid,p_target_type:tt,p_guest_token:guestToken()});
   if(q.error)return toast(q.error.message||"Gagal menyukai.","error"); await loadSocial(kind,item);
 });
 $("shareBtn")?.addEventListener("click",async()=>{
   const url=location.href;try{if(navigator.share)await navigator.share({title:item.title||"PasTele",url});else await navigator.clipboard.writeText(url)}catch(e){if(e?.name==="AbortError")return}
   try{await client.rpc("track_analytics",{p_event_type:"share",p_target_type:tt,p_target_id:tid,p_owner:item.owner_id||item.creator_id||item.seller_id||null})}catch{}
   const n=Number($("shareCount")?.textContent||0)+1;if($("shareCount"))$("shareCount").textContent=String(n);
 });
 const form=$("commentForm"),text=$("commentText"),submit=$("commentSubmit");
 if(form)form.onsubmit=async e=>{
   e.preventDefault();const body=String(text?.value||"").trim();if(!body||body.length>2000)return;
   submit.disabled=true;
   const p=await user();
   const row={target_id:tid,target_type:tt,user_id:p?.id||null,body,display_name:p?.user_metadata?.username||p?.email?.split("@")[0]||null,guest_token:p?null:guestToken()};
   const q=await client.from("content_comments").insert(row);
   if(q.error)toast(q.error.message||"Komentar gagal dikirim.","error");else{text.value="";toast("Komentar berhasil dikirim.","success");await loadSocial(kind,item)}
   submit.disabled=false;
 };
}
function shell(kind,item,access,content){
 const labels={pastelink:"PasteLink",code:"Code",channel:"Channel",group:"Group"};
 const icons={pastelink:"fa-file-lines",code:"fa-code",channel:"fa-tower-broadcast",group:"fa-users"};
 const paid=isPaid(item),title=item.title||item.name||labels[kind];
 return `<header class="view-head"><div class="view-icon"><i class="fa-solid ${icons[kind]}"></i></div><div><span class="badge ${paid?"paid":"free"}"><i class="fa-solid ${paid?"fa-lock":"fa-unlock"}"></i>${paid?"Paid":"Free"}</span><h1>${esc(title)}</h1><p class="view-desc">${esc(item.description||"")}</p></div></header><div class="view-meta"><span class="meta"><i class="fa-solid fa-eye"></i><strong>${Number(item.views||0).toLocaleString("id-ID")}</strong> dilihat</span><span class="meta"><i class="fa-solid fa-cart-shopping"></i><strong>${Number(item.sales_count||0).toLocaleString("id-ID")}</strong> terbeli</span><span class="meta"><i class="fa-solid fa-heart"></i><strong id="likeCountMeta">0</strong> suka</span><span class="meta"><i class="fa-solid fa-share-nodes"></i><strong id="shareCountMeta">0</strong> share</span><span class="meta"><i class="fa-solid fa-comments"></i><strong id="commentCountMeta">0</strong> komentar</span></div><div class="view-body">${content}</div><div class="engage"><div class="social"><button id="likeBtn" aria-pressed="false"><i id="likeIcon" class="fa-regular fa-heart"></i> <span id="likeLabel">Suka</span> <span id="likeCount">0</span></button><button id="shareBtn"><i class="fa-solid fa-share-nodes"></i> Bagikan <span id="shareCount">0</span></button></div><div class="comments"><h3>Komentar</h3><form class="comment-form" id="commentForm"><textarea id="commentText" maxlength="2000" placeholder="Tulis komentar..."></textarea><button class="btn primary" id="commentSubmit"><i class="fa-solid fa-paper-plane"></i> Kirim</button></form><div id="commentList"></div></div></div>`;
}
async function trackView(kind,item){
 try{await window.sb.rpc("record_content_view",{p_owner:item.owner_id||item.creator_id||item.seller_id||null,p_target_type:targetType(kind),p_target_id:item.id})}catch{}
}
window.PasTeleView={ $,esc,money,toast,guestToken,user,isPaid,targetType,telegramUrl,resolve,refreshItem,accessState,startBuy,loadSocial,shell,trackView };
})();

document.addEventListener("DOMContentLoaded",async()=>{const V=window.PasTeleView,root=V.$("viewRoot");try{const kind=(new URLSearchParams(location.search).get("type")||"channel").toLowerCase()==="group"?"group":"channel";let item=await V.resolve(kind);if(!item?.found)throw Error((kind==="group"?"Group":"Channel")+" tidak ditemukan atau sudah tidak tersedia.");item=await V.refreshItem(kind,item);const access=await V.accessState(kind,item);let body;if(!access.ok){body=`<div class="locked"><div class="notice"><i class="fa-solid fa-circle-info"></i> Guest bisa membeli. Login/daftar disarankan agar akses tersimpan permanen di akun.</div><div class="price">${V.money(item.price)}</div><button class="btn primary" id="buyBtn"><i class="fa-solid fa-qrcode"></i> Bayar & Buka</button></div>`}else{const url=V.telegramUrl(item);body=`<div class="tg-card"><div><strong>${V.esc(item.name||item.title||"Telegram")}</strong><p class="view-desc">${V.esc(item.username||item.telegram_channel_id||"")}</p></div>${url?`<a class="btn primary" href="${V.esc(url)}" target="_blank" rel="noopener"><i class="fa-brands fa-telegram"></i> Buka Telegram</a>`:"<span class='status'>Link Telegram belum tersedia.</span>"}</div>`}root.innerHTML=V.shell(kind,item,access,body);V.$("buyBtn")?.addEventListener("click",async()=>{try{await V.startBuy(kind,item)}catch(e){V.toast(e.message||"Checkout gagal","error")}});await V.trackView(kind,item);await V.loadSocial(kind,item)}catch(e){root.innerHTML=`<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><br>${V.esc(e.message||"Gagal memuat konten.")}</div>`}});
