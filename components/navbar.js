
(() => {
 const nav=document.getElementById("tcNavLinks"),btn=document.getElementById("tcMenuButton");
 btn?.addEventListener("click",()=>nav?.classList.toggle("show"));
 const page=location.pathname.split("/").pop()||"index.html";
 document.querySelectorAll(".tc-nav-links a").forEach(a=>{if(a.getAttribute("href")===page)a.classList.add("active")});
})();
