(()=>{"use strict";
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
async function render(){
 const host=document.getElementById("navbar"); if(!host || host.dataset.rendered)return;
 host.dataset.rendered="1";
 const user=window.PasTeleSession?await window.PasTeleSession.user():null;
 const name=user?.user_metadata?.username||user?.user_metadata?.name||"Akun";
 host.innerHTML=`<nav class="pastele-navbar"><a class="pastele-brand" href="index.html"><span class="pastele-brand-mark">P</span><span>PasTele</span></a><div class="pastele-nav-links"><a href="marketplace.html">Marketplace</a><a href="create-product.html">Create</a><a href="dashboard.html">Dashboard</a><a href="forum.html">Forum</a></div><div class="pastele-nav-account">${user?`<a href="profile.html">@${esc(name)}</a>`:`<a class="pastele-login-link" href="login.html">Login</a>`}</div></nav>`;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})();