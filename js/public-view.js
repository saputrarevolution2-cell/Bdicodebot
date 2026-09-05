/* PasTele public view shell — premium top navigation + ticker */
document.addEventListener("DOMContentLoaded", async () => {
  const host=document.getElementById("publicNavbar");
  if(!host) return;
  const esc=v=>window.TC?.esc?TC.esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  let user=null; try{ user=window.TC?.user ? await TC.user() : null; }catch(_){}
  host.innerHTML=`
  <div class="public-shell">
    <div class="public-ticker"><div class="public-ticker-track"><span><i class="fa-solid fa-bolt"></i> Gabung sekarang dan nikmati fitur menarik lainnya — jadilah Kreator PasTele yang top dan dapatkan bonus melimpah!</span><span><i class="fa-solid fa-bolt"></i> Gabung sekarang dan nikmati fitur menarik lainnya — jadilah Kreator PasTele yang top dan dapatkan bonus melimpah!</span></div></div>
    <header class="public-nav">
      <a class="public-brand" href="index.html"><span class="public-brand-icon"><i class="fa-brands fa-telegram"></i></span><span>PasTele</span></a>
      <nav class="public-menu" aria-label="Main navigation">
        <a href="marketplace.html"><i class="fa-solid fa-store"></i><span>Marketplace</span><em class="hot"><i class="fa-solid fa-fire"></i> Hot</em></a>
        <a href="notifications.html"><i class="fa-solid fa-bell"></i><span>Notifications</span><em class="new green"><i class="fa-solid fa-sparkles"></i> New</em></a>
        <a href="purchases.html"><i class="fa-solid fa-bag-shopping"></i><span>Purchases</span><em class="new green"><i class="fa-solid fa-sparkles"></i> New</em></a>
      </nav>
      <div class="public-auth">${user
        ? `<a class="public-login" href="dashboard.html"><i class="fa-solid fa-gauge-high"></i> Dashboard</a><a class="public-register" href="profile.html">${esc(user.user_metadata?.username||"Akun")} <i class="fa-solid fa-user"></i></a>`
        : `<a class="public-login" href="login.html">Login</a><a class="public-register" href="register.html">Register</a>`}</div>
    </header>
  </div>`;
});
