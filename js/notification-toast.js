(()=>{"use strict";
window.PasTeleToast=(message,type="info",ms=3200)=>{
 let t=document.getElementById("toast"); if(!t){t=document.createElement("div");t.id="toast";document.body.appendChild(t);}
 t.className=`pastele-toast ${type}`; t.textContent=String(message??""); t.setAttribute("role","status");
 clearTimeout(window.__pasteleToastTimer); window.__pasteleToastTimer=setTimeout(()=>t.classList.remove("show"),ms);
 requestAnimationFrame(()=>t.classList.add("show"));
};
window.showToast=window.PasTeleToast;
})();