/* PasTele Admin runtime — shared by every admin page. */
(() => {
  'use strict';
  if (window.Admin) return;
  const esc = value => window.TC?.esc ? TC.esc(value) : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = value => window.TC?.money ? TC.money(value) : new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value||0));
  const normalizeRows = data => Array.isArray(data) ? data : (data ? [data] : []);
  window.Admin = {
    async guard(){
      if(!window.sb) throw new Error('Supabase belum siap. Periksa js/config.js dan koneksi Supabase.');
      const {data:{user}={},error} = await sb.auth.getUser();
      if(error || !user) { location.replace('../login.html'); throw new Error('Sesi login tidak ditemukan.'); }
      let profile = null;
      try { const q=await sb.from('profiles').select('is_admin,is_banned').eq('id',user.id).maybeSingle(); profile=q.data; if(q.error) throw q.error; } catch(e) { console.warn('[Admin] profile check:',e); }
      if(profile?.is_banned === true) { await sb.auth.signOut(); location.replace('../login.html'); throw new Error('Akun diblokir.'); }
      if(profile && profile.is_admin !== true) { location.replace('../dashboard.html'); throw new Error('Akses admin ditolak.'); }
      return {user,profile};
    },
    async rpc(name, params={}){
      if(!window.sb) throw new Error('Supabase belum siap.');
      const {data,error}=await sb.rpc(name,params);
      if(error) throw error;
      return data;
    },
    _esc: esc,
    _money: money,
    table(data){
      const rows=normalizeRows(data);
      if(!rows.length) return '<div class="empty"><i class="fa-regular fa-folder-open"></i><br>Tidak ada data.</div>';
      const keys=[...new Set(rows.flatMap(r=>Object.keys(r||{})))];
      const head=keys.map(k=>`<th>${esc(k.replaceAll('_',' '))}</th>`).join('');
      const body=rows.map(r=>`<tr>${keys.map(k=>`<td>${formatCell(r?.[k])}</td>`).join('')}</tr>`).join('');
      return `<div class="table-wrap"><table class="table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
      function formatCell(v){
        if(v===null || v===undefined) return '<span class="muted">—</span>';
        if(typeof v==='boolean') return v ? '<span class="badge"><i class="fa-solid fa-check"></i> Yes</span>' : '<span class="badge"><i class="fa-solid fa-minus"></i> No</span>';
        if(typeof v==='object') return `<code>${esc(JSON.stringify(v))}</code>`;
        return esc(v);
      }
    }
  };
})();
