/* PasTele Admin Core — single Supabase client + shared auth guard. */
(() => {
  'use strict';
  const CONFIG = {
    SUPABASE_URL: 'https://jxrndamvelqwhbcromye.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFseSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo'
  };
  if (!window.supabase?.createClient) { console.error('[PasTele Admin] Supabase library missing'); return; }
  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'pastele-auth' }
  });
  window.sb = sb;
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID');
  const rows = data => Array.isArray(data) ? data : (data?.rows || data?.data || (data ? [data] : []));
  const toast = (message, type='ok') => { const e=$('#toast'); if(!e)return; e.textContent=message; e.className='admin-toast '+type; clearTimeout(window.__ptToast); window.__ptToast=setTimeout(()=>e.className='admin-toast',3200); };
  const setLoading = (el,msg='Memuat data...') => { if(el) el.innerHTML=`<div class="empty"><i class="fa-solid fa-spinner fa-spin"></i><span>${esc(msg)}</span></div>`; };
  const errText = e => e?.message || e?.details || e?.hint || 'Database error';
  async function session(){
    const r=await sb.auth.getSession();
    if(r.error) throw r.error;
    return r.data?.session || null;
  }
  async function waitForSession(timeout=5000){
    const direct=await session(); if(direct?.user) return direct;
    return new Promise(resolve=>{
      let done=false; let sub=null;
      const finish=s=>{if(done)return;done=true;clearTimeout(timer);try{sub?.unsubscribe()}catch{}resolve(s||null)};
      const timer=setTimeout(async()=>{try{const s=await session();finish(s)}catch{finish(null)}},timeout);
      const r=sb.auth.onAuthStateChange((_event,s)=>{if(s?.user)finish(s)}); sub=r?.data?.subscription;
    });
  }
  async function isAdmin(){
    const s=await waitForSession();
    if(!s?.user) return {ok:false,reason:'login'};

    let rpcError=null;

    // Primary admin check through the database RPC.
    try{
      const r=await sb.rpc("is_current_user_admin");
      if(
        !r.error &&
        (
          r.data===true ||
          r.data?.is_admin===true ||
          String(r.data?.is_admin).toLowerCase()==='true'
        )
      ){
        return {ok:true,user:s.user};
      }
      rpcError=r.error||null;
    }catch(e){
      rpcError=e;
    }

    // Fallback: use only columns that exist in public.profiles.
    try{
      const q=await sb
        .from('profiles')
        .select('id,is_admin,role,is_banned')
        .eq('id',s.user.id)
        .maybeSingle();

      if(q.error) throw q.error;

      const profile=q.data;

      if(
        profile &&
        profile.is_banned!==true &&
        (
          profile.is_admin===true ||
          ['admin','owner'].includes(
            String(profile.role||'').toLowerCase()
          )
        )
      ){
        return {ok:true,user:s.user,profile};
      }
    }catch(e){
      rpcError=rpcError||e;
    }

    return {ok:false,reason:rpcError?'rpc':'not_admin',error:rpcError};
  }
  async function requireAdmin(){ const g=await isAdmin(); if(!g.ok){denied(g.reason);return null;} return g; }
  function denied(reason){
    document.body.innerHTML=`<main class="admin-denied"><div class="denied-icon"><i class="fa-solid ${reason==='login'?'fa-right-to-bracket':'fa-lock'}"></i></div><h1>${reason==='login'?'Login diperlukan':'Akses ditolak'}</h1><p>${reason==='login'?'Sesi login tidak ditemukan. Login kembali dengan akun admin.':'Akun ini belum memiliki hak administrator.'}</p><a href="../login.html?redirect=${encodeURIComponent(location.pathname+location.search)}" class="btn primary"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${reason==='login'?'Login':'Kembali'}</a></main>`;
  }
  async function rpc(name,args={}){const r=await sb.rpc(name,args);if(r.error)throw r.error;return rows(r.data);}
  async function call(name,args={}){const r=await sb.rpc(name,args);if(r.error)throw r.error;return r.data;}
  function table(container,data,columns,actions){
    if(!container)return;
    if(!data.length){container.innerHTML='<div class="empty"><i class="fa-solid fa-inbox"></i><strong>Tidak ada data</strong><span>Belum ada data untuk ditampilkan.</span></div>';return;}
    container.innerHTML=`<div class="table-wrap"><table><thead><tr>${columns.map(c=>`<th>${esc(c.label)}</th>`).join('')}${actions?'<th>Aksi</th>':''}</tr></thead><tbody>${data.map((r,i)=>`<tr>${columns.map(c=>`<td>${c.render?c.render(r):esc(r[c.key])}</td>`).join('')}${actions?`<td class="row-actions">${actions(r,i)}</td>`:''}</tr>`).join('')}</tbody></table></div>`;
  }
  window.PasTeleAdmin={CONFIG,sb,$,esc,money,rows,toast,setLoading,errText,session,waitForSession,isAdmin,requireAdmin,denied,rpc,call,table};
})();
