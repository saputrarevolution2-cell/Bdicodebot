(()=>{
let sup=null,user=null,lastView={};let timer=null;
const C=window.TELECOD_CONFIG||{};if(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY&&window.supabase){try{sup=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY)}catch{}}
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function push(type,title,message,icon){const key=type+'|'+title+'|'+message;if(localStorage.getItem('tc_n_'+btoa(unescape(encodeURIComponent(key))).slice(0,50)))return;localStorage.setItem('tc_n_'+btoa(unescape(encodeURIComponent(key))).slice(0,50),'1');let a=JSON.parse(localStorage.getItem('telecod_notifications')||'[]');a.unshift({type,title,message,icon,ts:Date.now()});a=a.slice(0,50);localStorage.setItem('telecod_notifications',JSON.stringify(a));window.TeleCodNotifications?.refresh()}
async function tick(){if(!sup||!user)return;try{
 const {data:mine}=await sup.from('products').select('id,title,type,views,created_at').eq('creator_id',user.id).order('created_at',{ascending:false}).limit(50);
 (mine||[]).forEach(p=>{const old=lastView[p.id];if(old!==undefined&&Number(p.views||0)>old)push('view',p.type==='code'?'Code dibuka':'Channel dibuka',`${Number(p.views)-old} orang membuka ${p.title}`,'fa-eye');lastView[p.id]=Number(p.views||0)});
 (mine||[]).slice(0,10).forEach(p=>{const k='tc_product_seen_'+p.id;if(!localStorage.getItem(k)){localStorage.setItem(k,'1');push(p.type==='code'?'add_code':'add_channel',p.type==='code'?'Code ditambahkan':'Channel ditambahkan',`${p.title} berhasil ditambahkan ke marketplace.` ,p.type==='code'?'fa-code':'fa-brands fa-telegram')}});
 try{const {data:a}=await sup.from('telecod_activity').select('id,event_type,title,message,created_at').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(30);(a||[]).forEach(x=>{const k='tc_activity_'+x.id;if(!localStorage.getItem(k)){localStorage.setItem(k,'1');push(x.event_type,x.title,x.message,x.event_type==='view'?'fa-eye':x.event_type.includes('channel')?'fa-brands fa-telegram':x.event_type.includes('buy')?'fa-cart-shopping':'fa-bell')}})}catch{}
 }catch(e){console.debug('notification polling',e)} }
async function start(){if(!sup)return;const r=await sup.auth.getUser();user=r.data?.user;if(!user)return;await tick();timer=setInterval(tick,12000)}
document.addEventListener('DOMContentLoaded',()=>setTimeout(start,700));window.addEventListener('beforeunload',()=>timer&&clearInterval(timer));
})();