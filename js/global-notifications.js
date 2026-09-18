/* PasTele — Global clean notification toast */
(function () {
  'use strict';
  if (window.__PASTELE_GLOBAL_TOAST__) return;
  window.__PASTELE_GLOBAL_TOAST__ = true;

  const CSS = `
    .pastele-toast-stack{
      position:fixed;right:18px;bottom:18px;z-index:2147483000;
      display:flex;flex-direction:column;gap:10px;width:min(380px,calc(100vw - 24px));
      pointer-events:none;font-family:inherit
    }
    .pastele-toast{
      pointer-events:auto;display:grid;grid-template-columns:38px 1fr 24px;
      align-items:center;gap:11px;padding:13px 13px 13px 12px;border:1px solid rgba(15,23,42,.09);
      border-radius:16px;background:rgba(255,255,255,.97);backdrop-filter:blur(16px);
      box-shadow:0 14px 42px rgba(15,23,42,.16);animation:pasteleToastIn .24s ease both
    }
    .pastele-toast.is-out{animation:pasteleToastOut .2s ease both}
    .pastele-toast-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#f1f5f9;font-size:18px}
    .pastele-toast-title{font-size:13px;font-weight:750;color:#0f172a;line-height:1.25}
    .pastele-toast-message{margin-top:3px;font-size:12px;line-height:1.4;color:#64748b}
    .pastele-toast-close{border:0;background:transparent;color:#94a3b8;font-size:20px;cursor:pointer;padding:2px}
    .pastele-toast-close:hover{color:#0f172a}
    @keyframes pasteleToastIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes pasteleToastOut{to{opacity:0;transform:translateY(8px) scale(.98)}}
    @media(max-width:560px){.pastele-toast-stack{right:12px;bottom:12px}.pastele-toast{border-radius:14px}}
  `;

  function ensure() {
    if (!document.getElementById('pastele-global-toast-css')) {
      const s=document.createElement('style');s.id='pastele-global-toast-css';s.textContent=CSS;
      document.head.appendChild(s);
    }
    let stack=document.querySelector('.pastele-toast-stack');
    if(!stack){stack=document.createElement('div');stack.className='pastele-toast-stack';document.body.appendChild(stack);}
    return stack;
  }

  const icons = {
    purchase:'🛒', sale:'💰', publish:'📢', withdraw:'💸',
    like:'❤️', comment:'💬', follow:'👤', view:'👁️', success:'✓',
    error:'!', warning:'!', info:'i'
  };

  window.PasteleToast = function (data) {
    const d=typeof data==='string'?{message:data}:Object.assign({},data||{});
    const stack=ensure(), item=document.createElement('div');
    item.className='pastele-toast';
    const type=String(d.type||'info').toLowerCase();
    item.innerHTML =
      '<div class="pastele-toast-icon">'+(icons[type]||icons.info)+'</div>'+
      '<div><div class="pastele-toast-title"></div><div class="pastele-toast-message"></div></div>'+
      '<button class="pastele-toast-close" type="button" aria-label="Close">×</button>';
    item.querySelector('.pastele-toast-title').textContent=d.title||'Notifikasi';
    item.querySelector('.pastele-toast-message').textContent=d.message||'';
    item.querySelector('.pastele-toast-close').onclick=()=>close();
    if(d.href){
      item.style.cursor='pointer';
      item.addEventListener('click',e=>{if(e.target.closest('button'))return;location.href=d.href;});
    }
    stack.appendChild(item);
    const timer=setTimeout(close, Number(d.duration)||4500);
    function close(){clearTimeout(timer);if(!item.isConnected)return;item.classList.add('is-out');setTimeout(()=>item.remove(),220);}
    return {close};
  };

  window.PasteleToastFromNotification = function(n){
    return window.PasteleToast({
      type:n.type,
      title:n.title||'Notifikasi',
      message:n.message||n.body||'',
      href:n.href||n.link||null
    });
  };
})();
