(()=>{"use strict";
const URL="https://jxrndamvelqwhbcromye.supabase.co";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cm5kYW12ZWxxd2hiY3JvbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODIzNTIsImV4cCI6MjEwNDA1ODM1Mn0.M8bqTbSadCPLdWORE769BVBt7hr0VcYfrIWmjHpnfXo";
function init(){if(window.sb)return window.sb;if(window.supabase?.createClient){window.sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:"pastele-auth",detectSessionInUrl:true,flowType:"pkce"}});window.sb=window.sb;return window.sb;}return null;}
window.PasTeleSession={client:init,user:async()=>{const s=init();if(!s)return null;const r=await s.auth.getUser();return r.data?.user||null;},signOut:async()=>{const s=init();if(s)await s.auth.signOut();}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();