(async()=>{
try{
 await Admin.guard();
 const render=async()=>{
   const data=await Admin.rpc("admin_bots",{p_limit:100,p_offset:0});
   const rows=Array.isArray(data)?data:(data?[data]:[]);
   document.getElementById('data').innerHTML=rows.length?`<div class="bot-list">${rows.map(x=>`<div class="bot-row"><div class="bot-avatar"><i class="fa-solid fa-robot"></i></div><div class="bot-info"><strong>${TC.esc(x.bot_name||x.bot_username||'Bot')}</strong><span>${TC.esc(x.bot_username||'')} · ID ${TC.esc(x.bot_id||'')}</span></div><span class="pt-status ${x.is_active?'success':'warning'}">${x.is_active?'Aktif':'Nonaktif'}</span><button class="btn" data-toggle-bot="${TC.esc(x.id)}" data-active="${x.is_active?'true':'false'}">${x.is_active?'Nonaktifkan':'Aktifkan'}</button></div>`).join('')}</div>`:'<div class="empty"><i class="fa-solid fa-inbox"></i><br>Belum ada bot.</div>';
   document.querySelectorAll('[data-toggle-bot]').forEach(b=>b.onclick=async()=>{
     try{await Admin.rpc('admin_set_bot_active',{p_bot_id:b.dataset.toggleBot,p_active:b.dataset.active!=='true'});TC.toast(b.dataset.active==='true'?'Bot dinonaktifkan':'Bot diaktifkan');render();}
     catch(e){TC.toast(e.message,'error')}
   });
 };
 document.getElementById('adminContent').innerHTML=`
 <div class="bot-admin-head">
  <div><h2>Kelola Bot</h2><p class="pt-muted">Bot yang aktif di sini otomatis tersedia pada Create Code untuk user.</p></div>
 </div>
 <form id="botForm" class="pt-toolbar">
  <input id="buser" class="input" placeholder="@botusername" required>
  <input id="bid" class="input" type="number" placeholder="Telegram Bot ID" required>
  <input id="bname" class="input" placeholder="Nama bot (opsional)">
  <button class="btn primary"><i class="fa-solid fa-plus"></i> Tambah / Update Bot</button>
 </form>
 <div id="data"><div class="empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div></div>`;
 document.getElementById('botForm').onsubmit=async e=>{
   e.preventDefault();
   try{await Admin.rpc('admin_upsert_bot',{p_username:buser.value,p_bot_id:Number(bid.value),p_display_name:bname.value});TC.toast('Bot berhasil ditambahkan / diperbarui');e.target.reset();await render();}
   catch(x){TC.toast(x.message,'error')}
 };
 await render();
}catch(e){document.getElementById('adminContent').innerHTML='<div class="empty">'+TC.esc(e.message)+'</div>'}
})()