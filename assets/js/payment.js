// TeleCod page core
const SUPABASE_URL="https://qrhbgffmqorzbcfvnbkk.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJxcmhiZ2ZmbXFvcnpiY2Z2bmJrayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2OTUxMzkyLCJleHAiOjIxMDI1MjczOTJ9.W9tWYiPmYOC9wsruJMypH_Kg0dQpw_klCbACS6PYp48";
if(!window.telecodSupabase&&window.supabase)window.telecodSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage}});
async function tcSession(){if(!window.telecodSupabase)return null;const {data}=await window.telecodSupabase.auth.getSession();return data?.session||null}
async function protectPage(){const s=await tcSession();if(!s){location.replace('login.html');return null}return s}
function tcApplyPageLanguage(dict){const lang=localStorage.getItem('telecod_lang')||'id';document.documentElement.lang=lang;const d=dict[lang]||dict.id;document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(d[k]!=null)el.textContent=d[k]});document.querySelectorAll('[data-lang-label]').forEach(el=>el.textContent=lang==='id'?'ID':'EN')}
function tcToggleLanguage(dict){const lang=(localStorage.getItem('telecod_lang')||'id')==='id'?'en':'id';localStorage.setItem('telecod_lang',lang);tcApplyPageLanguage(dict);window.dispatchEvent(new Event('telecod:language'))}
document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('img').forEach(img=>{if(!img.loading)img.loading='lazy'}));
(async()=>{if(!await protectPage())return;const p=new URLSearchParams(location.search).get('product');if(p)document.getElementById('paymentProduct').value=p;document.getElementById('paymentForm')?.addEventListener('submit',e=>{e.preventDefault();const m=document.getElementById('paymentMsg');m.textContent='Permintaan pembayaran tersimpan sebagai demo. Hubungkan payment gateway untuk produksi.';m.style.display='block'})})();
