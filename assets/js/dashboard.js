// TeleCod page core
const SUPABASE_URL="https://qrhbgffmqorzbcfvnbkk.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJxcmhiZ2ZmbXFvcnpiY2Z2bmJrayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2OTUxMzkyLCJleHAiOjIxMDI1MjczOTJ9.W9tWYiPmYOC9wsruJMypH_Kg0dQpw_klCbACS6PYp48";
if(!window.telecodSupabase&&window.supabase)window.telecodSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage}});
async function tcSession(){if(!window.telecodSupabase)return null;const {data}=await window.telecodSupabase.auth.getSession();return data?.session||null}
async function protectPage(){const s=await tcSession();if(!s){location.replace('login.html');return null}return s}
function tcApplyPageLanguage(dict){const lang=localStorage.getItem('telecod_lang')||'id';document.documentElement.lang=lang;const d=dict[lang]||dict.id;document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(d[k]!=null)el.textContent=d[k]});document.querySelectorAll('[data-lang-label]').forEach(el=>el.textContent=lang==='id'?'ID':'EN')}
function tcToggleLanguage(dict){const lang=(localStorage.getItem('telecod_lang')||'id')==='id'?'en':'id';localStorage.setItem('telecod_lang',lang);tcApplyPageLanguage(dict);window.dispatchEvent(new Event('telecod:language'))}
document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('img').forEach(img=>{if(!img.loading)img.loading='lazy'}));
(async()=>{const s=await protectPage();if(!s)return;const u=s.user;const name=u.user_metadata?.full_name||u.user_metadata?.name||u.user_metadata?.username||u.email?.split('@')[0]||'User';document.getElementById('dashName').textContent=name;document.getElementById('dashEmail').textContent=u.email||'Telegram account';document.getElementById('dashId').textContent=u.id;document.getElementById('dashProvider').textContent=u.app_metadata?.provider||'email'})();
