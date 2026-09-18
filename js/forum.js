(()=>{"use strict";

const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const toast=m=>{
  const x=$("#toast"); if(!x)return;
  x.textContent=String(m??""); x.classList.add("show");
  clearTimeout(x._t); x._t=setTimeout(()=>x.classList.remove("show"),2600);
};
const fmtTime=v=>{
  try{return new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"short"}).format(new Date(v))}
  catch{return""}
};

let sb=null,me=null,group=null,messages=[],replyId=null,channel=null;

/* ---------------------------------------------------------
   Supabase
   forum.html loads js/setup.js first. Never put an API key
   inside this file.
--------------------------------------------------------- */
function getClient(){
  return window.sb||window.supabaseClient||null;
}
function requireClient(){
  sb=getClient();
  if(!sb)throw new Error("Supabase client belum siap. Pastikan js/setup.js dimuat sebelum forum.js.");
  return sb;
}

async function getSession(){
  const client=requireClient();
  const r=await client.auth.getSession();
  if(r.error)throw r.error;
  return r.data?.session||null;
}

/* ---------------------------------------------------------
   Theme — follows PasTele's shared localStorage key.
   light <-> dark. setup.js already prevents flash in <head>.
--------------------------------------------------------- */
function applyTheme(){
  const mode=localStorage.getItem("pastele-theme")||"auto";
  const dark=mode==="dark"||
    (mode==="auto"&&(()=>{const h=new Date().getHours();return h>=18||h<6})())||
    (mode==="system"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  document.documentElement.dataset.theme=dark?"dark":"light";
  document.documentElement.dataset.themeMode=mode;
  document.documentElement.classList.toggle("theme-dark",dark);
  document.documentElement.classList.toggle("theme-light",!dark);
  document.documentElement.style.colorScheme=dark?"dark":"light";
  document.body.classList.toggle("dark",dark);

  const b=$("#themeBtn");
  if(b){
    b.innerHTML=`<i class="fa-solid fa-${dark?"sun":"moon"}"></i>`;
    b.title=dark?"Gunakan tema terang":"Gunakan tema gelap";
    b.setAttribute("aria-label",b.title);
  }
}
function toggleTheme(){
  const current=document.documentElement.dataset.theme==="dark"||
    document.body.classList.contains("dark");
  localStorage.setItem("pastele-theme",current?"light":"dark");
  applyTheme();
}
function initTheme(){
  applyTheme();
  $("#themeBtn")?.addEventListener("click",toggleTheme);
  window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change",()=>{
    if((localStorage.getItem("pastele-theme")||"auto")==="system")applyTheme();
  });
}

/* ---------------------------------------------------------
   Navbar / mobile menu
--------------------------------------------------------- */
function setupNav(){
  const menu=$("#mobileMenu"),btn=$("#menuBtn");
  if(btn&&menu){
    btn.addEventListener("click",()=>{
      const open=!menu.hidden;
      menu.hidden=open;
      btn.setAttribute("aria-expanded",String(!open));
      btn.innerHTML=`<i class="fa-solid fa-${open?"bars":"xmark"}"></i>`;
    });
    menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
      menu.hidden=true;btn.setAttribute("aria-expanded","false");
      btn.innerHTML='<i class="fa-solid fa-bars"></i>';
    }));
  }
}
function updateAccount(){
  const label=me?"Akun":"Login";
  const href=me?"profile.html":"login.html";
  const a=$("#accountLink");
  if(a){a.href=href;a.innerHTML=`<i class="fa-solid fa-${me?"user":"right-to-bracket"}"></i><span>${label}</span>`}
  const m=$("#mobileAccountLink");
  if(m){m.href=href;m.innerHTML=`<i class="fa-solid fa-${me?"user":"right-to-bracket"}"></i>${label}`}
  $("#loginHint")?.classList.toggle("hidden",!!me);
}

/* ---------------------------------------------------------
   Group
--------------------------------------------------------- */
async function loadGroup(){
  const client=requireClient();
  const q=await client.from("chat_groups")
    .select("id,name,slug,description,is_public")
    .eq("slug","pastele-community")
    .maybeSingle();

  if(q.error)throw q.error;
  if(!q.data)throw new Error("Forum community belum dibuat di database.");

  group=q.data;
  $("#groupName").textContent=group.name||"PasTele Community";
  $("#groupDescription").textContent=group.description||"Forum & group chat resmi PasTele.";
  $("#chatTitle").textContent=group.name||"PasTele Community";

  let reason="";
  try{
    const data=await window.PasTeleDB.rpc("get_public_site_settings");
    reason=String(data?.forum_chat?.reason||"").trim();
  }catch(_){}

  const closed=group.is_public===false;
  $("#groupStatus").textContent=closed?"Ditutup admin":"Aktif";
  $("#groupStatus").classList.toggle("closed",closed);
  $("#chatStatus").textContent=closed?"Forum sedang ditutup":(group.description||"Forum & group chat");

  const notice=$("#closedNotice");
  notice.classList.toggle("hidden",!closed);
  if(closed){
    notice.innerHTML='<i class="fa-solid fa-lock"></i> Forum Group Chat sedang ditutup oleh admin.'+
      (reason?`<br><small>${esc(reason)}</small>`:"");
  }else notice.textContent="";

  $("#sendBtn").disabled=closed||!me;
  $("#messageInput").disabled=closed||!me;
  return !closed;
}

/* ---------------------------------------------------------
   Messages + public profile links
--------------------------------------------------------- */
async function loadMessages(){
  if(!group)return;
  const client=requireClient();
  const q=await client.from("chat_messages")
    .select("id,group_id,user_id,body,reply_to_id,edited_at,deleted_at,created_at")
    .eq("group_id",group.id)
    .order("created_at",{ascending:true})
    .limit(200);

  if(q.error)throw q.error;
  messages=q.data||[];

  const ids=[...new Set(messages.map(x=>x.user_id).filter(Boolean))];
  const profiles={};

  if(ids.length){
    const p=await client.from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id",ids);
    if(p.error)console.warn("[PasTele Forum] profiles:",p.error.message);
    else(p.data||[]).forEach(x=>profiles[x.id]=x);
  }

  render(profiles);
  if(me){
    try{await window.PasTeleDB.rpc("mark_chat_read",{p_group_id:group.id})}catch(_){}
  }
}

function profileUrl(p){
  if(p?.id)return `profile.html?id=${encodeURIComponent(String(p.id))}`;
  const u=String(p?.username||"").trim().replace(/^@/,"");
  return u?`profile.html?username=${encodeURIComponent(u)}`:"";
}

function render(profiles){
  const box=$("#messages");
  if(!box)return;

  if(!messages.length){
    box.innerHTML='<div class="empty-state"><i class="fa-regular fa-comments"></i><span>Belum ada pesan. Jadilah yang pertama memulai percakapan.</span></div>';
    return;
  }

  box.innerHTML=messages.map(m=>{
    const p=profiles[m.user_id]||{};
    const name=p.display_name||p.username||"Member";
    const href=profileUrl(p);
    const mine=me&&String(me.id)===String(m.user_id);
    const body=m.deleted_at?"Pesan dihapus.":String(m.body??"");
    const reply=m.reply_to_id?messages.find(r=>String(r.id)===String(m.reply_to_id)):null;

    return `<article class="message ${mine?"mine":""}">
      <div class="avatar">${esc(String(name).trim().slice(0,1).toUpperCase()||"M")}</div>
      <div class="bubble">
        <div class="meta">
          ${href?`<a class="forum-profile-link" href="${href}" title="Lihat profil ${esc(name)}">${esc(name)}</a>`:`<strong>${esc(name)}</strong>`}
          <time>${fmtTime(m.created_at)}${m.edited_at?" · diedit":""}</time>
        </div>
        ${reply?`<div class="reply-ref">↪ ${esc(String(reply.body||"").slice(0,90))}</div>`:""}
        <div class="body">${esc(body)}</div>
        ${!m.deleted_at?`<div class="message-actions">
          <button type="button" data-reply="${esc(m.id)}"><i class="fa-solid fa-reply"></i> Balas</button>
          ${mine?`<button type="button" data-edit="${esc(m.id)}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button type="button" data-del="${esc(m.id)}"><i class="fa-solid fa-trash"></i> Hapus</button>`:""}
          <button type="button" data-react="${esc(m.id)}">👍</button>
        </div>`:""}
      </div>
    </article>`;
  }).join("");

  box.scrollTop=box.scrollHeight;
}

/* ---------------------------------------------------------
   Send / reply / edit / delete / reaction
--------------------------------------------------------- */
async function send(e){
  e.preventDefault();
  if(!me){
    location.href=`login.html?redirect=${encodeURIComponent("forum.html")}`;
    return;
  }
  if(group?.is_public===false)return;

  const input=$("#messageInput"),btn=$("#sendBtn"),body=input.value.trim();
  if(!body)return;

  btn.disabled=true;
  try{
    await window.PasTeleDB.rpc("send_chat_message",{
      p_group_id:group.id,p_body:body,p_reply_to:replyId||null
    });
    input.value="";
    input.style.height="auto";
    replyId=null;
    $("#replyBar").classList.add("hidden");
    await loadMessages();
    try{await window.PasTeleDB.rpc("record_quest_event",{p_event_type:"comment"})}catch(_){}
  }catch(e){
    toast(e?.message||"Pesan gagal dikirim.");
  }finally{
    btn.disabled=group?.is_public===false||!me;
    input.focus();
  }
}

function setReply(id){
  const m=messages.find(x=>String(x.id)===String(id));if(!m)return;
  replyId=id;
  $("#replyText").textContent=String(m.body||"");
  $("#replyBar").classList.remove("hidden");
  $("#messageInput").focus();
}

async function edit(id){
  const m=messages.find(x=>String(x.id)===String(id));
  if(!m||!me||String(m.user_id)!==String(me.id))return;
  const v=prompt("Edit pesan:",m.body);
  if(v===null||!v.trim())return;
  const q=await requireClient().from("chat_messages").update({
    body:v.trim(),edited_at:new Date().toISOString()
  }).eq("id",id).eq("user_id",me.id);
  if(q.error)toast(q.error.message);else await loadMessages();
}

async function del(id){
  const m=messages.find(x=>String(x.id)===String(id));
  if(!m||!me||String(m.user_id)!==String(me.id))return;
  if(!confirm("Hapus pesan ini?"))return;
  const q=await requireClient().from("chat_messages").update({
    deleted_at:new Date().toISOString()
  }).eq("id",id).eq("user_id",me.id);
  if(q.error)toast(q.error.message);else await loadMessages();
}

async function react(id){
  if(!me){
    location.href=`login.html?redirect=${encodeURIComponent("forum.html")}`;
    return;
  }
  try{await window.PasTeleDB.rpc("toggle_chat_reaction",{p_message_id:id,p_reaction:"👍"})}
  catch(e){toast(e?.message||"Reaksi gagal.");}
}

/* ---------------------------------------------------------
   Realtime
--------------------------------------------------------- */
function subscribe(){
  if(!group||!requireClient().channel)return;
  if(channel)requireClient().removeChannel(channel);
  channel=requireClient()
    .channel("pastele-forum-"+group.id)
    .on("postgres_changes",{
      event:"*",schema:"public",table:"chat_messages",
      filter:`group_id=eq.${group.id}`
    },()=>loadMessages().catch(()=>{}))
    .subscribe();
}

/* ---------------------------------------------------------
   Auth
--------------------------------------------------------- */
async function syncAuth(){
  try{
    const s=await getSession();
    me=s?.user||null;
    updateAccount();
    if(group){
      await loadGroup();
      await loadMessages();
      if(me)try{await window.PasTeleDB.rpc("set_chat_presence",{p_group_id:group.id,p_online:true})}catch(_){}
    }
  }catch(e){console.warn("[PasTele Forum] auth sync:",e)}
}

/* ---------------------------------------------------------
   Init
--------------------------------------------------------- */
async function init(){
  initTheme();
  setupNav();

  try{
    requireClient();
  }catch(e){
    $("#messages").innerHTML=`<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><strong>Forum belum tersedia</strong><span>${esc(e.message)}</span></div>`;
    return;
  }

  try{
    const s=await getSession();
    me=s?.user||null;
    updateAccount();

    const open=await loadGroup();
    await loadMessages();
    subscribe();

    if(me)try{
      await window.PasTeleDB.rpc("set_chat_presence",{p_group_id:group.id,p_online:true});
    }catch(_){}

    if(!open)$("#loginHint").classList.add("hidden");
  }catch(e){
    console.error("[PasTele Forum]",e);
    $("#messages").innerHTML=`<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><strong>Forum belum tersedia</strong><span>${esc(e?.message||"Gagal memuat forum.")}</span></div>`;
  }
}

$("#sendForm")?.addEventListener("submit",send);
$("#refreshChat")?.addEventListener("click",async()=>{
  try{await loadGroup();await loadMessages()}catch(e){toast(e?.message||"Gagal refresh forum.")}
});
$("#cancelReply")?.addEventListener("click",()=>{
  $("#replyBar").classList.add("hidden");replyId=null;
});
$("#messages")?.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.reply)setReply(b.dataset.reply);
  if(b.dataset.edit)edit(b.dataset.edit);
  if(b.dataset.del)del(b.dataset.del);
  if(b.dataset.react)react(b.dataset.react);
});
$("#messageInput")?.addEventListener("input",e=>{
  e.target.style.height="auto";
  e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";
});
$("#messageInput")?.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#sendForm")?.requestSubmit();}
});

(async()=>{
  try{
    requireClient();
    sb.auth.onAuthStateChange(()=>syncAuth());
  }catch(_){}
  await init();
})();
})();