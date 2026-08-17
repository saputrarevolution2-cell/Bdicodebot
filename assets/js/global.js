
/* TeleCod shared UI safety */
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("img").forEach(img=>{
    if(!img.getAttribute("loading")) img.setAttribute("loading","lazy");
  });
});
