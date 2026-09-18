(()=>{"use strict";
const apply=()=>{const mode=localStorage.getItem("pastele-theme")||"light";const dark=mode==="dark"||(mode==="auto"&&window.matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.dataset.theme=dark?"dark":"light";document.documentElement.style.colorScheme=dark?"dark":"light";};
window.PasTeleTheme={get:()=>localStorage.getItem("pastele-theme")||"light",set:m=>{localStorage.setItem("pastele-theme",m);apply();},toggle:()=>{const n=(localStorage.getItem("pastele-theme")||"light")==="dark"?"light":"dark";localStorage.setItem("pastele-theme",n);apply();return n;}};
apply();
})();