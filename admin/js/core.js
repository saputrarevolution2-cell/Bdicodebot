/* PasTele Admin Core — canonical auth/admin guard.
   Browser uses only Supabase anon key. Server-side RPCs must enforce admin privileges. */
(() => {
'use strict';
const CONFIG={SUPABASE_URL:"'https://jxrndamvelqwhbcromye.supabase.co'",SUPABASE_ANON_KEY:"'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo'"};
const sb=window.sb=window.supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>'Rp '+Number(v||0).toLocaleString('id-ID');
const toast=(m,type='ok')=>{const e=$('#toast');if(!e)return;e.textContent=m;e.className='admin-toast '+type;clearTimeout(window.__pttoast);window.__pttoast=setTimeout(()=>e.className='admin-toast',3200)};
async function session(){const {data}=await sb.auth.getSession();return data?.session||null}
async function isAdmin(){
 const s=await session(); if(!s?.user)return {ok:false,reason:'login'};
 let rpc=await sb.rpc('is_current_user_admin');
 if(!rpc.error && (rpc.data===true || rpc.data?.is_admin===true || rpc.data?.is_admin==='true')) return {ok:true,user:s.user};
 // Fallback supports canonical profiles.is_admin=true or role=admin if RPC is absent.
 const q=await sb.from('profiles').select('id,is_admin,role,status,is_banned').eq('id',s.user.id).maybeSingle();
 if(!q.error && q.data && !q.data.is_banned && q.data.status!=='blocked' && q.data.status!=='disabled' &&
    (q.data.is_admin===true || String(q.data.role||'').toLowerCase()==='admin')) return {ok:true,user:s.user,profile:q.data};
 return {ok:false,reason:rpc.error?'rpc': 'not_admin'};
}
function denied(reason){
 document.body.innerHTML=`<main class="admin-denied"><div class="denied-icon"><i class="fa-solid ${reason==='login'?'fa-right-to-bracket':'fa-lock'}"></i></div><h1>${reason==='login'?'Login diperlukan':'Akses ditolak'}</h1><p>${reason==='login'?'Silakan login dengan akun yang sudah menjadi admin.':'Akun ini belum memiliki hak administrator.'}</p><a href="../login.html?redirect=${encodeURIComponent(location.pathname+location.search)}" class="btn primary"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${reason==='login'?'Login':'Kembali'}</a></main>`;
}
function rows(data){if(Array.isArray(data))return data; if(data?.rows&&Array.isArray(data.rows))return data.rows; if(data?.data&&Array.isArray(data.data))return data.data; return data?[data]:[]}
async function rpc(name,args={}){const r=await sb.rpc(name,args); if(r.error) throw r.error; return rows(r.data)}
function setLoading(el,msg='Memuat data...'){if(el)el.innerHTML=`<div class="empty"><i class="fa-solid fa-spinner fa-spin"></i><span>${esc(msg)}</span></div>`}
function table(container, data, columns, actions=''){
 if(!container)return;
 if(!data.length){container.innerHTML='<div class="empty"><i class="fa-solid fa-inbox"></i><strong>Tidak ada data</strong><span>Belum ada data untuk ditampilkan.</span></div>';return}
 container.innerHTML=`<div class="table-wrap"><table><thead><tr>${columns.map(c=>`<th>${esc(c.label)}</th>`).join('')}${actions?'<th>Aksi</th>':''}</tr></thead><tbody>${data.map((r,i)=>`<tr>${columns.map(c=>`<td>${c.render?c.render(r):esc(r[c.key])}</td>`).join('')}${actions?`<td class="row-actions">${actions(r,i)}</td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
window.PasTeleAdmin={sb,$,esc,money,toast,session,isAdmin,denied,rpc,rows,setLoading,table};
})();