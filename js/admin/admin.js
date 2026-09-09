/* PasTele Admin runtime — FINAL SQL SYNC */
(() => {
  "use strict";
  if (window.Admin) return;
  const esc = value => window.TC?.esc ? TC.esc(value) : String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const money = value => window.TC?.money ? TC.money(value) : new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value||0));
  const rows = data => Array.isArray(data) ? data : (data ? [data] : []);
  const rpc = async(name,params={}) => { if(!window.sb) throw new Error("Supabase belum siap."); const q=await sb.rpc(name,params); if(q.error) throw q.error; return q.data; };
  window.Admin = {
    async guard(){
      if(!window.sb) throw new Error("Supabase belum siap.");
      const session=await sb.auth.getUser();
      if(session.error || !session.data?.user){ location.replace("../login.html"); throw new Error("Sesi login tidak ditemukan."); }
      const user=session.data.user;
      const q=await sb.from("profiles").select("is_admin,is_banned,role,username,display_name").eq("id",user.id).maybeSingle();
      if(q.error) throw q.error;
      const p=q.data;
      if(p?.is_banned===true){ await sb.auth.signOut(); location.replace("../login.html"); throw new Error("Akun diblokir."); }
      const allowed=p?.is_admin===true || ["admin","owner"].includes(String(p?.role||"").toLowerCase());
      if(!allowed){ location.replace("../dashboard.html"); throw new Error("Akses admin ditolak."); }
      return {user,profile:p};
    },
    rpc,
    _esc:esc,
    _money:money,
    table(data){
      const r=rows(data);
      if(!r.length) return '<div class="empty"><i class="fa-regular fa-folder-open"></i><br>Tidak ada data.</div>';
      const keys=[...new Set(r.flatMap(x=>Object.keys(x||{})))];
      const head=keys.map(k=>`<th>${esc(k.replaceAll("_"," "))}</th>`).join("");
      const body=r.map(x=>`<tr>${keys.map(k=>`<td>${this._format(x?.[k])}</td>`).join("")}</tr>`).join("");
      return `<div class="table-wrap"><table class="table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    },
    _format(v){ if(v===null||v===undefined||v==="") return '<span class="muted">—</span>'; if(typeof v==='boolean') return v?'<span class="badge"><i class="fa-solid fa-check"></i> Yes</span>':'<span class="badge"><i class="fa-solid fa-minus"></i> No</span>'; if(typeof v==='object') return `<code>${esc(JSON.stringify(v))}</code>`; return esc(v); },
    async renderTable(container,data){ container.innerHTML=this.table(data); }
  };
})();
