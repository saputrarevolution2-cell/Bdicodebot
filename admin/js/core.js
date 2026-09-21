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

    const uid=String(s.user.id||'');
    const email=String(s.user.email||'').trim().toLowerCase();
    let lastError=null;

    // 1) Canonical server-side check. This is the authoritative check.
    try{
      const r=await sb.rpc("is_current_user_admin");
      if(!r.error){
        const v=Array.isArray(r.data)?r.data[0]:r.data;
        if(v===true || v?.is_admin===true || String(v?.is_admin).toLowerCase()==='true'){
          return {ok:true,user:s.user,source:'is_current_user_admin'};
        }
      }else{
        lastError=r.error;
      }
    }catch(e){ lastError=e; }

    // 2) Dedicated username=admin server-side check.
    // The SQL function must still require auth.uid(), admin role/flag and not-banned.
    try{
      const r=await sb.rpc("check_admin_username");
      if(!r.error){
        const d=Array.isArray(r.data)?r.data[0]:r.data;
        if(d?.ok===true){
          return {ok:true,user:s.user,profile:d,source:'check_admin_username'};
        }
        if(d && d.ok===false){
          return {ok:false,reason:'not_admin',profile:d,user:s.user};
        }
      }else{
        lastError=lastError||r.error;
      }
    }catch(e){ lastError=lastError||e; }

    // 3) Read-only profile fallback. It never grants admin on username alone.
    try{
      const q=await sb.from('profiles')
        .select('id,username,auth_email,is_admin,role,is_banned')
        .eq('id',uid)
        .maybeSingle();

      if(!q.error){
        const p=q.data;
        const usernameOk=String(p?.username||'').trim().toLowerCase()==='admin';
        const emailOk=!email || !p?.auth_email || String(p.auth_email).trim().toLowerCase()===email;
        const roleOk=p?.is_admin===true || ['admin','owner'].includes(String(p?.role||'').trim().toLowerCase());
        const banned=p?.is_banned===true;

        if(p && usernameOk && emailOk && !banned && roleOk){
          return {ok:true,user:s.user,profile:p,source:'profile'};
        }
        if(p){
          return {ok:false,reason:'not_admin',profile:p,user:s.user};
        }
      }else{
        lastError=lastError||q.error;
      }
    }catch(e){ lastError=lastError||e; }

    // Surface the actual Supabase error instead of the generic "Pengecekan admin gagal".
    return {
      ok:false,
      reason:lastError?'rpc':'not_admin',
      error:lastError,
      user:s.user,
      diagnostic:{
        user_id:uid,
        email,
        rpc_failed:!!lastError
      }
    };
  }
  async function requireAdmin(){ const g=await isAdmin(); if(!g.ok){denied(g.reason);return null;} return g; }
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
      <br><br><a href="../login.html?redirect=${encodeURIComponent(location.pathname+location.search)}" class="btn primary"><i class="fa-solid fa-arrow-right-to-bracket"></i> Login ulang</a></div>
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
