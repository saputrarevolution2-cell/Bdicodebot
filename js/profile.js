document.addEventListener('DOMContentLoaded', async () => {
  const nameEl=document.getElementById('name'), mailEl=document.getElementById('mail'), avatarEl=document.getElementById('avatar');
  const adminBtn=document.getElementById('adminBtn');
  const currentEl=document.getElementById('currentLogin'), currentMeta=document.getElementById('currentLoginMeta');
  const lastEl=document.getElementById('lastLogin'), lastMeta=document.getElementById('lastLoginMeta');
  const esc=v=>TC.esc(v);
  const fmt=v=>v?new Date(v).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'—';
  try{
    const profile=await TC.profile();
    if(!profile) return location.replace('login.html');
    const displayName=profile.display_name||profile.username||'User';
    nameEl.textContent=displayName; mailEl.textContent=profile.auth_email||''; avatarEl.textContent=displayName.slice(0,1).toUpperCase();
    const admin=profile.is_admin===true || profile.role==='admin';
    adminBtn.addEventListener('click',e=>{
      if(!admin){e.preventDefault();TC.toast('Anda bukan admin. Akses Panel Admin ditolak.','error');}
    });
    if(!admin) adminBtn.classList.add('disabled-admin');
    if(window.sb){
      const {data,error}=await sb.rpc('get_login_info');
      if(!error){
        const cur=data?.current,last=data?.last;
        if(cur){currentEl.textContent=fmt(cur.logged_in_at);currentMeta.textContent=`${cur.ip_address||'IP tidak tersedia'} · ${[cur.city,cur.region,cur.country].filter(Boolean).join(', ')||'Lokasi tidak tersedia'}`;}
        else {currentEl.textContent='Belum tercatat';currentMeta.textContent='Login berikutnya akan dicatat.';}
        if(last){lastEl.textContent=fmt(last.logged_in_at);lastMeta.textContent=`${last.ip_address||'IP tidak tersedia'} · ${[last.city,last.region,last.country].filter(Boolean).join(', ')||'Lokasi tidak tersedia'}`;}
      }
    }
  }catch(e){console.error(e);location.replace('login.html');}
});