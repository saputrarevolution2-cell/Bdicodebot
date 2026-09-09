(async()=>{
  try{
    await Admin.guard();
    const data=await Admin.rpc("admin_withdrawals",{p_limit:200,p_offset:0});
    const rows=Array.isArray(data)?data:(data?[data]:[]);
    const pending=rows.filter(r=>String(r?.status||'').toLowerCase()==='pending').length;
    adminContent.innerHTML=`
      <div class="admin-page-head">
        <div><span class="admin-eyebrow">FINANCE</span><h1>Withdrawals</h1><p>Kelola semua permintaan withdrawal user dari satu tempat.</p></div>
        <div class="admin-kpi"><i class="fa-solid fa-bell"></i><b>${pending}</b><span>Pending</span></div>
      </div>
      <div class="pt-toolbar">
        <input id="wid" class="input" placeholder="Withdrawal UUID">
        <select id="wstatus" class="select"><option value="approved">approved</option><option value="completed">completed</option><option value="rejected">rejected</option><option value="cancelled">cancelled</option></select>
        <input id="wnote" class="input" placeholder="Catatan admin">
        <button class="btn primary" id="process"><i class="fa-solid fa-check"></i> Proses</button>
        <button class="btn" id="refresh"><i class="fa-solid fa-rotate"></i> Refresh</button>
      </div>
      ${pending?`<div class="admin-alert"><i class="fa-solid fa-circle-exclamation"></i><div><b>Ada ${pending} withdrawal pending.</b><span>Periksa ID withdrawal dan proses permintaan yang masuk.</span></div></div>`:''}
      <div id="data"></div>`;
    document.getElementById('data').innerHTML=Admin.table(rows);
    document.getElementById('process').onclick=async()=>{try{await Admin.rpc('admin_process_withdrawal',{p_id:document.getElementById('wid').value.trim(),p_status:document.getElementById('wstatus').value,p_note:document.getElementById('wnote').value.trim()||null});TC.toast('Withdrawal diproses','success');location.reload()}catch(e){TC.toast(e.message,'error')}};
    document.getElementById('refresh').onclick=()=>location.reload();
  }catch(e){adminContent.innerHTML='<div class="empty">'+TC.esc(e.message)+'</div>'}
})()