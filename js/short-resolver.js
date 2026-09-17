/* PasTele compact public URL resolver.
 * Routes:
 *   /pf/XXXX  PasteLink Free
 *   /pp/XXXX  PasteLink Paid
 *   /gf/XXXX  Group Free
 *   /gp/XXXX  Group Paid
 *   /cf/XXXX  Channel Free OR Code Free
 *   /cp/XXXX  Channel Paid OR Code Paid
 * The final content type is resolved from the database, not guessed from the URL.
 */
window.PASTELE_CONFIG=Object.freeze({
  SUPABASE_URL:'https://jxrndamvelqwhbcromye.supabase.co',
  SUPABASE_ANON_KEY:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDQ1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo'
});
const cfg=window.PASTELE_CONFIG||{};
const client=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const qs=new URLSearchParams(location.search);
// Cloudflare Pages rewrites /pp/ky9m internally to short-resolver.html.
// The browser keeps the public pathname, so query parameters may be absent.
// Fall back to the real pathname to recover prefix + code.
const pathParts=String(location.pathname||'').split('/').filter(Boolean);
const pathPrefix=String(pathParts[0]||'').toLowerCase();
const pathCode=decodeURIComponent(pathParts.slice(1).join('/')).trim();
const prefix=String(qs.get('prefix')||pathPrefix||'').toLowerCase();
const code=String(qs.get('code')||pathCode||'').trim();
const $=id=>document.getElementById(id);
function say(a,b){$('status').textContent=a;if(b)$('detail').textContent=b}
function found(x){const v=Array.isArray(x?.data)?x.data[0]:x?.data;return v?.found===true?v:null}
async function rpc(name,args){const q=await client.rpc(name,args);if(q.error)throw q.error;return found(q)}
async function resolve(){
 if(!/^(pf|pp|gf|gp|cf|cp)$/.test(prefix)||!code){say('Link tidak valid','Kode publik tidak lengkap.');return}
 let item=null,type='';
 if(prefix==='pf'||prefix==='pp'){item=await rpc('get_pastelink_by_slug',{p_slug:code});type='pastelink'}
 else if(prefix==='gf'||prefix==='gp'){item=await rpc('get_telegram_content_by_slug',{p_slug:code,p_type:'group'});type='group'}
 else {
   // cf/cp intentionally serve both Code and Channel. New content creation
   // checks all public content slugs to keep this namespace collision-free.
   item=await rpc('get_code_by_slug',{p_slug:code});
   if(item){type='code'}else{item=await rpc('get_telegram_content_by_slug',{p_slug:code,p_type:'channel'});type='channel'}
 }
 if(!item){say('Konten tidak ditemukan','Link mungkin sudah tidak tersedia atau kode tidak valid.');setTimeout(()=>location.replace('marketplace.html'),1400);return}
 const slug=String(item.slug||code).trim();
 const token=(()=>{try{return localStorage.getItem('pastele-guest-checkout-token')||''}catch{return''}})();
 const guest=token?`&guest_token=${encodeURIComponent(token)}`:'';
 let target='';
 if(type==='pastelink') target=`view-pastelink.html?slug=${encodeURIComponent(slug)}${guest}`;
 else if(type==='code') target=`view-code.html?slug=${encodeURIComponent(slug)}${guest}`;
 else target=`view-telegram.html?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}${guest}`;
 say('Membuka konten...','Mengalihkan ke halaman konten.');
 location.replace(target);
}
resolve().catch(e=>{console.error('[PasTele][ShortResolver]',e);say('Gagal membuka link','Terjadi kesalahan saat membaca data. Coba lagi beberapa saat.');setTimeout(()=>location.replace('marketplace.html'),1800)});
