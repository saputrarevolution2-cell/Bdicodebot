(async()=>{
 try{
  await Admin.guard();
  const raw=await Admin.rpc('admin_stats');
  const rows=Array.isArray(raw)?raw:(raw?[raw]:[]), r=rows[0]||{};
  const defs=[['Users','users','fa-users'],['Products','products','fa-box'],['Sales','sales','fa-chart-line'],['Revenue','revenue','fa-wallet'],['Pastes','pastes','fa-file-lines'],['Views','views','fa-eye'],['Banned','banned','fa-user-slash'],['Pending','pending','fa-clock']];
  document.getElementById('adminContent').innerHTML='<div class="pt-stat-grid">'+defs.map(x=>`<div class="pt-stat"><div class="pt-icon"><i class="fa-solid ${x[2]}"></i></div><span class="kpi">${x[0]}</span><strong>${x[1]==='revenue'?Admin._money(r[x[1]]):Admin._esc(r[x[1]]??0)}</strong></div>`).join('')+'</div>';
  const st=await sb.rpc('get_public_site_settings');
  document.getElementById('socialInput').value=(st.data?.socials||[]).map(x=>[x.name,x.url,x.icon||'fa-solid fa-link'].join('|')).join('\n');
  document.getElementById('saveSocial').onclick=async()=>{
   const socials=document.getElementById('socialInput').value.split('\n').map(l=>{const [name,url,icon]=l.split('|').map(x=>x.trim());return name&&/^https?:\/\//i.test(url)?{name,url,icon:icon||'fa-solid fa-link'}:null}).filter(Boolean);
   const q=await sb.rpc('admin_save_socials',{p_socials:socials}); TC.toast(q.error?.message||'Social media disimpan',q.error?'error':'success');
  };
  document.getElementById('publishAnn').onclick=async()=>{
   const title=document.getElementById('annTitle').value.trim(), body=document.getElementById('annBody').value.trim(), image=document.getElementById('annImage').value.trim();
   if(!title||!body)return TC.toast('Judul dan isi wajib diisi','error');
   const q=await sb.rpc('admin_publish_announcement',{p_title:title,p_body:body,p_image_url:image||null});
   TC.toast(q.error?.message||'Siaran dipublikasikan',q.error?'error':'success');
   if(!q.error){document.getElementById('annTitle').value='';document.getElementById('annBody').value='';document.getElementById('annImage').value='';}
  };
 }catch(e){document.getElementById('adminContent').innerHTML='<div class="empty">'+TC.esc(e.message)+'</div>'}
})();