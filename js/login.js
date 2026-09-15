/* PasTele Login — FIX 2
   Username/Gmail account resolver + password login.
   Uses SECURITY DEFINER RPCs when available; never treats a fake
   email as an existing account just because it was typed.
*/
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const step1=$('loginStep1'), step2=$('loginStep2'), identifier=$('identifier');
  const identifierWrap=$('identifierWrap'), identifierStatus=$('identifierStatus');
  const verifiedState=$('loginVerifiedState'), verifiedUsername=$('verifiedUsername');
  const continueLogin=$('continueLogin'), accountUsername=$('accountUsername');
  const password=$('password'), toggle=$('toggle'), loginSubmit=$('loginSubmit');
  const loginSubmitText=document.querySelector('.login-submit-text');
  const google=$('google'), changeAccount=$('changeAccount'), securityStatus=$('loginSecurityStatus');
  const toast=$('toast'), themeButton=$('themeButton'), footerYear=$('footerYear');
  let foundAccount=null, lookupTimer=null, seq=0, toastTimer=null, loginBusy=false;

  const clean=v=>String(v??'').trim();
  const lower=v=>clean(v).toLowerCase();
  const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function showToast(message,type='error'){
    if(!toast)return; clearTimeout(toastTimer);
    const icon=type==='success'?'fa-circle-check':type==='error'?'fa-circle-exclamation':'fa-circle-info';
    toast.className=''; toast.innerHTML=`<span class="toast-icon"><i class="fa-solid ${icon}"></i></span><span class="toast-message">${esc(message)}</span><button type="button" class="toast-close" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>`;
    toast.classList.add('show',type);
    toast.querySelector('.toast-close')?.addEventListener('click',hideToast,{once:true});
    toastTimer=setTimeout(hideToast,3000);
  }
  function hideToast(){toast?.classList.remove('show');}

  function setIdentifierState(state){
    identifierWrap?.classList.remove('is-valid','is-invalid','is-loading');
    identifierStatus?.classList.remove('show','error','loading');
    if(state==='valid'){identifierWrap?.classList.add('is-valid');identifierStatus?.classList.add('show');}
    else if(state==='invalid'){identifierWrap?.classList.add('is-invalid');identifierStatus?.classList.add('show','error');if(identifierStatus)identifierStatus.innerHTML='<i class="fa-solid fa-xmark"></i>';}
    else if(state==='loading'){identifierWrap?.classList.add('is-loading');identifierStatus?.classList.add('show','loading');if(identifierStatus)identifierStatus.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>';}
    else if(identifierStatus) identifierStatus.innerHTML='<i class="fa-solid fa-check"></i>';
  }
  function resetVisual(){setIdentifierState('');verifiedState?.classList.add('hidden');if(verifiedUsername)verifiedUsername.textContent='';}
  function usable(row){return !!row && typeof row==='object' && !!clean(row.username||row.display_name||row.auth_email||row.email);}
  function nameOf(row,fallback){return clean(row?.username||row?.display_name||row?.name||fallback);}
  function unwrap(data){return Array.isArray(data)?(data[0]||null):data||null;}

  async function rpc(client,name,args){
    if(!client?.rpc) return {data:null,error:new Error('RPC tidak tersedia')};
    return client.rpc(name,args);
  }

  async function resolveAccount(value){
    const client=window.sb||window.supabaseClient;
    if(!client) throw new Error('Supabase belum siap.');
    const v=lower(value); if(!v)return null;

    // USERNAME: gunakan RPC yang memang tersedia di database(7).sql.
    // RPC mengembalikan username, auth_email, is_banned.
    if(!emailRe.test(v)){
      const r=await rpc(client,'resolve_username_login',{p_username:v});
      if(r.error){
        console.error('[PasTele Login] resolve_username_login:',r.error);
        throw new Error('Username belum dapat diverifikasi. Coba lagi.');
      }
      const row=unwrap(r.data);
      return row||null;
    }

    // GMAIL/EMAIL: database saat ini TIDAK mempunyai resolve_email_login.
    // Policy database(7).sql mengizinkan anon membaca profiles yang tidak diblokir,
    // jadi cukup cari auth_email di profiles. Jangan menambahkan SQL/RPC baru.
    const q=await client
      .from('profiles')
      .select('username,auth_email,is_banned')
      .eq('auth_email',v)
      .maybeSingle();

    if(q.error){
      console.error('[PasTele Login] email lookup:',q.error);
      throw new Error('Tidak dapat memeriksa Gmail. Coba lagi.');
    }
    return q.data||null;
  }

  function openPassword(row){
    if(row?.is_banned===true){showToast('Akun kamu telah diblokir.','error');return;}
    foundAccount=row;
    const username=nameOf(row,clean(identifier.value));
    if(verifiedUsername) verifiedUsername.innerHTML=`<strong>@${esc(row.username||username)}</strong> terdaftar`;
    if(accountUsername) accountUsername.textContent=row.username?`@${row.username}`:username;
    setIdentifierState('valid'); verifiedState?.classList.remove('hidden');
    continueLogin?.classList.add('hidden'); step1?.classList.add('account-found'); step2?.classList.remove('hidden');
    securityStatus.textContent=''; securityStatus.className='login-security-status';
    requestAnimationFrame(()=>password?.focus({preventScroll:false}));
  }
  function back(){
    foundAccount=null;loginBusy=false;step2?.classList.add('hidden');step1?.classList.remove('account-found');continueLogin?.classList.remove('hidden');
    if(loginSubmit){loginSubmit.disabled=false;loginSubmit.classList.remove('loading')}; if(loginSubmitText)loginSubmitText.textContent='Masuk';
    if(password)password.value=''; if(securityStatus){securityStatus.textContent='';securityStatus.className='login-security-status'} resetVisual(); identifier?.focus();
  }
  async function check(value,showErrors=true){
    const my=++seq,v=clean(value); if(!v){resetVisual();return null;}
    setIdentifierState('loading');
    try{
      const row=await resolveAccount(v); if(my!==seq)return null;
      if(!usable(row)){setIdentifierState('invalid');if(showErrors)showToast('Username/Gmail tidak ditemukan. Periksa kembali data login kamu.','error');return null;}
      openPassword(row); return row;
    }catch(e){
      if(my!==seq)return null;
      setIdentifierState('invalid');
      if(showErrors)showToast(e?.message||'Tidak dapat memeriksa akun. Coba lagi.','error');
      return null;
    }
  }

  identifier?.addEventListener('input',()=>{
    clearTimeout(lookupTimer); foundAccount=null; step2?.classList.add('hidden'); step1?.classList.remove('account-found'); continueLogin?.classList.remove('hidden'); resetVisual();
    const v=clean(identifier.value); if(!v)return;
    lookupTimer=setTimeout(()=>check(v,false),500);
  });
  step1?.addEventListener('submit',async e=>{e.preventDefault();await check(identifier.value,true)});
  changeAccount?.addEventListener('click',e=>{e.preventDefault();back()});
  toggle?.addEventListener('click',()=>{if(!password)return;const hidden=password.type==='password';password.type=hidden?'text':'password';toggle.setAttribute('aria-label',hidden?'Sembunyikan kata sandi':'Tampilkan kata sandi');toggle.innerHTML=`<i class="fa-solid ${hidden?'fa-eye-slash':'fa-eye'}"></i>`;password.focus()});

  step2?.addEventListener('submit',async e=>{
    e.preventDefault(); if(loginBusy)return;
    if(!foundAccount){await check(identifier.value,true);return;}
    const pass=clean(password.value); if(!pass){showToast('Kata sandi wajib diisi.','error');password?.focus();return;}
    const Auth=window.Auth; if(!Auth||typeof Auth.login!=='function'){showToast('Sistem autentikasi belum siap.','error');return;}
    loginBusy=true; loginSubmit.disabled=true; loginSubmit.classList.add('loading'); if(loginSubmitText)loginSubmitText.textContent='Memeriksa...';
    securityStatus.textContent='Memverifikasi akun...'; securityStatus.className='login-security-status loading';
    try{
      await Auth.login(clean(identifier.value),pass,'');
      securityStatus.textContent='Login berhasil. Mengalihkan...'; securityStatus.className='login-security-status success';
      showToast('Login berhasil. Selamat datang kembali!','success');
      setTimeout(()=>{window.location.href='/dashboard.html'},650);
    }catch(err){
      loginBusy=false;loginSubmit.disabled=false;loginSubmit.classList.remove('loading');if(loginSubmitText)loginSubmitText.textContent='Masuk';
      securityStatus.textContent=err?.message||'Username atau kata sandi salah.';securityStatus.className='login-security-status error';showToast(err?.message||'Username atau kata sandi salah.','error');
    }
  });
  google?.addEventListener('click',async()=>{if(!window.Auth?.google){showToast('Google Authentication belum siap.','error');return}try{google.disabled=true;google.classList.add('loading');await window.Auth.google()}catch(e){google.disabled=false;google.classList.remove('loading');showToast(e?.message||'Login Google gagal.','error')}});

  function applyTheme(){const mode=localStorage.getItem('pastele-theme')||'auto';const dark=mode==='dark'||(mode==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';if(themeButton)themeButton.innerHTML=`<i class="fa-solid ${dark?'fa-sun':'fa-moon'}"></i>`}
  themeButton?.addEventListener('click',()=>{const cur=localStorage.getItem('pastele-theme')||'auto';localStorage.setItem('pastele-theme',cur==='dark'?'light':'dark');applyTheme()});
  applyTheme(); if(footerYear)footerYear.textContent=new Date().getFullYear();
})();
