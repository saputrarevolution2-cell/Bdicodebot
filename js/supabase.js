(()=>{
  const cfg=window.PASTELE_CONFIG||{};
  const url=String(cfg.SUPABASE_URL||'').trim().replace(/\/$/,'');
  const key=String(cfg.SUPABASE_ANON_KEY||'').trim();
  const validUrl=/^https:\/\/[^\s/]+(?:\.[^\s/]+)+$/i.test(url);
  const validKey=key.length>20 && !/YOUR_|service_role|secret/i.test(key);
  if (!validUrl) console.warn('[PasTele] Invalid SUPABASE_URL in js/config.js');
  if (!validKey) console.warn('[PasTele] Missing/invalid anon or publishable key in js/config.js. Do not use service_role.');
  window.TC_CONFIG=Object.freeze({SUPABASE_URL:url,SUPABASE_ANON_KEY:key});
  window.sb=(window.supabase&&validUrl&&validKey)?window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  window.TC={
    configured:()=>!!window.sb,
    money:n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0)),
    esc:s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])),
    toast:(m,type='info')=>{let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.append(t)}t.className='toast '+type;t.textContent=String(m??'');Object.assign(t.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:9999,padding:'13px 16px',borderRadius:'13px',background:'#17212b',color:'#fff',border:'1px solid rgba(34,158,217,.35)',boxShadow:'0 10px 35px rgba(0,0,0,.3)',maxWidth:'min(420px,calc(100vw - 36px))'});clearTimeout(window.__tcToast);window.__tcToast=setTimeout(()=>t.remove(),3200)},
    user:async()=>{if(!window.sb)return null;const {data,error}=await window.sb.auth.getUser();if(error)return null;return data?.user||null},
    profile:async()=>{const u=await window.TC.user();if(!u||!window.sb)return null;const {data}=await window.sb.from('profiles').select('*').eq('id',u.id).maybeSingle();return data||null}
  };
})();
