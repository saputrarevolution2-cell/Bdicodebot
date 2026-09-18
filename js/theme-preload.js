(()=>{try{
 const mode=localStorage.getItem("pastele-theme")||"light";
 const dark=mode==="dark" || (mode==="auto" && window.matchMedia("(prefers-color-scheme:dark)").matches);
 document.documentElement.dataset.theme=dark?"dark":"light";
 document.documentElement.style.colorScheme=dark?"dark":"light";
}catch(_){}})();