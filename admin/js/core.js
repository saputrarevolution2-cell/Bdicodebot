/* PasTele Admin Core — single Supabase client + shared auth guard. */
(() => {
  'use strict';
  const CONFIG = {
    SUPABASE_URL: 'https://jxrndamvelqwhbcromye.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFseSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo'
  };
  if (!window.supabase?.createClient) { console.error('[PasTele Admin] Supabase library missing'); return; }
  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'pastele-admin-auth' }
  });
  window.sb = sb;
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID');
  const rows = data => Array.isArray(data) ? data : (data?.rows || data?.data || (data ? [data] : []));
  const toast = (message, type='ok') => { const e=$('#toast'); if(!e)return; e.textContent=message; e.className='admin-toast '+type; clearTimeout(window.__ptToast); window.__ptToast=setTimeout(()=>e.className='admin-toast',3200); };
  const setLoading = (el,msg='Memuat data...') => { if(el) el.innerHTML=`<div class="empty"><i class="fa-solid fa-spinner fa-spin"></i><span>${esc(msg)}</span></div>`; };
  const errText = e => e?.message || e?.details || e?.hint || 'Database error';
  const ADMIN_SESSION_KEY='pastele-admin-session-v1';
  async function restoreAdminSession(){
    try{
      const raw=sessionStorage.getItem(ADMIN_SESSION_KEY);
      if(!raw) return null;
      const saved=JSON.parse(raw);
      if(!saved?.access_token || !saved?.refresh_token) return null;
      const r=await sb.auth.setSession({access_token:saved.access_token,refresh_token:saved.refresh_token});
      if(r?.error) throw r.error;
      return r?.data?.session||null;
    }catch(e){
      try{sessionStorage.removeItem(ADMIN_SESSION_KEY)}catch(_){}
      return null;
    }
  }
  async function session(){
    const r=await sb.auth.getSession();
    if(r.error) throw r.error;
    if(r.data?.session?.user) return r.data.session;
    return await restoreAdminSession();
  }
  async function waitForSession(timeout=8000){
    const direct=await session(); if(direct?.user) return direct;
    const restored=await restoreAdminSession(); if(restored?.user) return restored;
    try{ const rr=await sb.auth.refreshSession(); if(rr?.data?.session?.user) return rr.data.session; }catch(_){}
    return new Promise(resolve=>{
      let done=false; let sub=null;
      const finish=s=>{if(done)return;done=true;clearTimeout(timer);try{sub?.unsubscribe()}catch{}resolve(s||null)};
      const timer=setTimeout(async()=>{try{const s=await session();finish(s)}catch{finish(null)}},timeout);
      const r=sb.auth.onAuthStateChange((_event,s)=>{if(s?.user)finish(s)}); sub=r?.data?.subscription;
    });
  }
  async function isAdmin(){
    const s=await waitForSession(8000);
    if(!s?.user) return {ok:false,reason:'login'};
    let lastError=null;

    // Single canonical server-side check. It is deliberately independent
    // from the profiles SELECT RLS policy to avoid recursive RLS checks.
    try{
      const r=await sb.rpc("admin_access_check");
      if(!r.error){
        const d=Array.isArray(r.data)?r.data[0]:r.data;
        if(d?.ok===true) return {ok:true,user:s.user,profile:d,source:'admin_access_check'};
        return {ok:false,reason:'not_admin',profile:d||null,user:s.user};
      }
      lastError=r.error;
    }catch(e){ lastError=e; }

    // Compatibility fallback for an older database.
    try{
      const r=await sb.rpc("is_current_user_admin");
      if(!r.error && r.data===true) return {ok:true,user:s.user,source:'legacy_rpc'};
      if(r.error) lastError=lastError||r.error;
    }catch(e){ lastError=lastError||e; }

    return {ok:false,reason:lastError?'rpc':'not_admin',error:lastError,user:s.user};
  }

  async function requireAdmin(){ const g=await isAdmin(); if(!g.ok){denied(g.reason,g.error||g.profile);return null;} return g; }
  function denied(reason, detail){
    const email=window.PasTeleAdmin?.__lastEmail||window.PasTeleAdmin?.__sessionEmail||'';
    const msg=reason==='login'
      ? 'Sesi login admin tidak ditemukan. Logout lalu login kembali.'
      : reason==='rpc'
        ? `Pengecekan admin gagal${detail?.message?`: ${detail.message}`:''}`
        : 'Akun login ditemukan, tetapi belum lolos hak administrator.';
    document.body.innerHTML=`<main class="admin-denied">
      <div><div class="denied-icon"><i class="fa-solid ${reason==='login'?'fa-right-to-bracket':'fa-lock'}"></i></div>
      <h1>${reason==='login'?'Login diperlukan':'Akses ditolak'}</h1>
      <p>${esc(msg)}</p>
      ${email?`<small>Login: ${esc(email)}</small>`:''}
      <br><br><a href="/admin/login/?redirect=${encodeURIComponent(location.pathname+location.search)}" class="btn primary"><i class="fa-solid fa-arrow-right-to-bracket"></i> Login ulang</a></div>
    </main>`;
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
