(()=>{
 const url=localStorage.getItem('TC_SUPABASE_URL')||'';
 const key=localStorage.getItem('TC_SUPABASE_ANON_KEY')||'';
 window.TC_CONFIG={SUPABASE_URL:url,SUPABASE_ANON_KEY:key};
 window.sb=(window.supabase&&/^https:\/\//.test(url)&&key)?supabase.createClient(url,key):null;
 window.TC={
  configured:()=>!!window.sb,
  money:n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0)),
  esc:s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])),
  toast:(m,type='info')=>{let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.append(t)}t.className='toast';t.textContent=m;Object.assign(t.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:99,padding:'13px 16px',borderRadius:'13px',background:'#17212b',color:'#fff',border:'1px solid rgba(51,144,236,.3)',boxShadow:'0 10px 35px rgba(0,0,0,.18)'});clearTimeout(window.__tcToast);window.__tcToast=setTimeout(()=>t.remove(),3200)},
  user:async()=>{if(!sb)return null;const {data,error}=await sb.auth.getUser();if(error)return null;return data?.user||null},
  profile:async()=>{let u=await TC.user();if(!u||!sb)return null;let {data}=await sb.from('profiles').select('*').eq('id',u.id).maybeSingle();return data}
 };
})();