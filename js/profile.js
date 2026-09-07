/* PasTele — Profile / Public Creator Profile */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>window.TC?.esc?TC.esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const num=v=>Number(v||0).toLocaleString("id-ID");
  const money=v=>window.TC?.money?TC.money(v):`Rp ${Number(v||0).toLocaleString("id-ID")}`;
  const params=new URLSearchParams(location.search), target=params.get("user")||params.get("username")||params.get("id");
  let me=null, profile=null, isOwn=false;
  try{me=await TC.user()}catch{}
  if(target){
    let query=sb.from("profiles").select("*");
    query=target.length>20&&target.includes("-")?query.eq("id",target):query.eq("username",target.toLowerCase());
    const r=await query.maybeSingle();
    if(r.error||!r.data){$("name").textContent="Profil tidak ditemukan";return}
    profile=r.data; isOwn=me?.id===profile.id;
  }else{
    if(!me){location.replace("login.html");return}
    profile=await TC.profile(); isOwn=true;
    if(!profile){location.replace("login.html");return}
  }
  const name=profile.display_name||profile.username||"User";
  $("name").textContent=name;$("avatar").textContent=name.trim().slice(0,1).toUpperCase()||"U";$("bio").textContent=profile.bio||"Creator PasTele";$("handle").textContent=`@${profile.username||"user"}`;document.title=`${name} — PasTele`;
  if(!isOwn){$("settingsBtn")?.setAttribute("hidden","");$("adminBtn")?.setAttribute("hidden","");$("followBtn")?.removeAttribute("hidden")}else{$("followBtn")?.setAttribute("hidden","");if(profile.is_admin||profile.role==="admin")$("adminBtn")?.removeAttribute("hidden")}
  async function counts(){
    const [f1,f2,l,c]=await Promise.all([
      sb.from("creator_followers").select("id",{count:"exact",head:true}).eq("creator_id",profile.id),
      sb.from("creator_followers").select("id",{count:"exact",head:true}).eq("follower_id",profile.id),
      sb.from("content_likes").select("id",{count:"exact",head:true}).eq("content_owner_id",profile.id),
      sb.from("marketplace_public").select("id",{count:"exact",head:true}).eq("owner_id",profile.id)
    ]);
    $("followersCount").textContent=num(f1.count||0);$("followingCount").textContent=num(f2.count||0);$("totalLikes").textContent=num(l.count||0);$("totalContent").textContent=num(c.count||0);
  }
  await counts();
  if(!isOwn&&me){
    const ex=await sb.from("creator_followers").select("id").eq("creator_id",profile.id).eq("follower_id",me.id).maybeSingle();
    const btn=$("followBtn");
    if(ex.data){btn.classList.remove("primary");btn.innerHTML='<i class="fa-solid fa-user-check"></i><span>Mengikuti</span>';btn.dataset.following="1"}
    btn?.addEventListener("click",async()=>{
      btn.disabled=true;try{
        if(btn.dataset.following==="1"){const r=await sb.from("creator_followers").delete().eq("creator_id",profile.id).eq("follower_id",me.id);if(r.error)throw r.error;btn.dataset.following="0";btn.classList.add("primary");btn.innerHTML='<i class="fa-solid fa-user-plus"></i><span>Ikuti</span>'}
        else{const r=await sb.from("creator_followers").insert({creator_id:profile.id,follower_id:me.id});if(r.error)throw r.error;btn.dataset.following="1";btn.classList.remove("primary");btn.innerHTML='<i class="fa-solid fa-user-check"></i><span>Mengikuti</span>'}
        await counts();
      }catch(e){TC.toast(e?.message||"Gagal mengubah pengikut","error")}finally{btn.disabled=false}
    })
  }else if(!isOwn){$("followBtn").innerHTML='<i class="fa-solid fa-right-to-bracket"></i><span>Login untuk mengikuti</span>';$("followBtn").onclick=()=>location.href="login.html"}
  let content=[],type="all",page=1;const pageSize=5;
  async function loadContent(){
    const r=await sb.from("marketplace_public").select("id,slug,title,type,access_type,price,views,sales_count,created_at,description,owner_id").eq("owner_id",profile.id).order("created_at",{ascending:false}).limit(500);
    if(r.error){$("profileContentList").innerHTML=`<div class="profile-loading"><i class="fa-solid fa-triangle-exclamation"></i><span>${esc(r.error.message)}</span></div>`;return}
    content=r.data||[];page=1;renderContent();
  }
  function renderContent(){
    const filtered=content.filter(x=>type==="all"||x.type===type||(type==="link"&&["paste","pastelink"].includes(x.type)));
    const total=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,total);
    const rows=filtered.slice((page-1)*pageSize,page*pageSize);
    $("profileContentList").innerHTML=rows.length?rows.map(x=>{const t=(x.type||"link").toLowerCase(),icon=t==="code"?"fa-code":t==="channel"?"fa-broadcast-tower":t==="group"?"fa-users":"fa-link";return `<a class="profile-content-card" href="product.html?id=${encodeURIComponent(x.id)}&type=${encodeURIComponent(t)}"><span class="content-icon"><i class="fa-solid ${icon}"></i></span><main><strong>${esc(x.title||"Untitled")}</strong><small>${esc(t)} · ${num(x.views)} views · ${x.access_type==="paid"?"PAID":"FREE"}</small></main><b>${x.price>0?esc(money(x.price)):"FREE"}</b></a>`}).join(""):`<div class="empty">Creator ini belum memiliki konten publik.</div>`;
    renderPager(total);
  }
  function renderPager(total){const host=$("profilePagination");if(!host||total<=1){if(host)host.innerHTML="";return}host.innerHTML=Array.from({length:total},(_,i)=>`<button type="button" class="${i+1===page?"active":""}" data-p="${i+1}">${i+1}</button>`).join("");host.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{page=Number(b.dataset.p);renderContent()}))}
  document.querySelectorAll("#profileContentTabs button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("#profileContentTabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");type=b.dataset.type;page=1;renderContent()}));
  await loadContent();
  if(isOwn){
    const form=$("profilePass"),input=$("profileNewPass"),toggle=$("profilePassToggle");
    toggle?.addEventListener("click",()=>{input.type=input.type==="password"?"text":"password";toggle.innerHTML=`<i class="fa-solid ${input.type==="password"?"fa-eye":"fa-eye-slash"}"></i>`});
    form?.addEventListener("submit",async e=>{e.preventDefault();if(input.value.length<6){TC.toast("Password minimal 6 karakter.","error");return}const btn=form.querySelector('button[type="submit"]');btn.disabled=true;try{const r=await sb.auth.updateUser({password:input.value});if(r.error)throw r.error;TC.toast("Password berhasil diubah.","success");form.reset()}catch(err){TC.toast(err?.message||"Password gagal diubah.","error")}finally{btn.disabled=false}})
  }else document.querySelector(".password-section")?.remove();
});