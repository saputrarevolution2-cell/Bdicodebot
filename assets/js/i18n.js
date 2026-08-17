
window.TeleCodI18n = (() => {
 const dict = {
  id:{
   "nav.dashboard":"Dashboard","nav.marketplace":"Marketplace","nav.sellbuy":"Jual & Beli","nav.payment":"Payment","nav.profile":"Profil","nav.settings":"Pengaturan",
   "footer.desc":"Marketplace code bot Telegram untuk developer.","footer.platform":"Platform","footer.account":"Akun","footer.help":"Bantuan",
   "common.indonesian":"Indonesia","common.english":"English"
  },
  en:{
   "nav.dashboard":"Dashboard","nav.marketplace":"Marketplace","nav.sellbuy":"Sell & Buy","nav.payment":"Payments","nav.profile":"Profile","nav.settings":"Settings",
   "footer.desc":"Telegram bot code marketplace for developers.","footer.platform":"Platform","footer.account":"Account","footer.help":"Help",
   "common.indonesian":"Indonesian","common.english":"English"
  }
 };
 const key="telecod_language";
 function lang(){return localStorage.getItem(key)||"id"}
 function apply(){
  const l=lang(), d=dict[l]||dict.id;
  document.documentElement.lang=l;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
   const k=el.dataset.i18n;if(d[k]!=null)el.textContent=d[k];
  });
  const b=document.getElementById("languageToggle");if(b)b.textContent=l==="id"?"EN":"ID";
 }
 function toggle(){localStorage.setItem(key,lang()==="id"?"en":"id");apply();window.dispatchEvent(new Event("telecod:language"))}
 document.addEventListener("DOMContentLoaded",()=>{apply();document.getElementById("languageToggle")?.addEventListener("click",toggle)});
 return {lang,apply,toggle};
})();
