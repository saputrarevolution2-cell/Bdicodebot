(() => {
'use strict'; const A=window.PasTeleAdmin,$=A.$;
async function boot(){
 const g=await A.isAdmin(); if(!g.ok){A.denied(g.reason);return}
 const s=await A.session(); const u=s?.user;
 if($('#email')) $('#email').value=u?.email||'';
 if($('#identity')) $('#identity').innerHTML=`<div class="identity-avatar"><i class="fa-solid fa-user-shield"></i></div><div><strong>${A.esc(u?.email||'Admin')}</strong><span>Authenticated administrator</span></div>`;
 $('#run')?.addEventListener('click',async()=>{const b=$('#run');b.disabled=true;try{const r=await A.window.PasTeleDB.rpc("is_current_user_admin");A.toast(r.error?'Pemeriksaan gagal':(r.data?'Admin terverifikasi':'Bukan admin'),r.error?'error':'ok')}finally{b.disabled=false}});
 $('#logout')?.addEventListener('click',async()=>{await A.sb.auth.signOut();location.href='../login.html'});
 $('#sendUserReset')?.addEventListener('click',async()=>{const email=$('#email')?.value?.trim();if(!email)return A.toast('Email wajib diisi','error');const r=await A.sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/reset-password.html'});A.toast(r.error?.message||'Email reset dikirim',r.error?'error':'ok')});
}
document.addEventListener('DOMContentLoaded',boot);
})();