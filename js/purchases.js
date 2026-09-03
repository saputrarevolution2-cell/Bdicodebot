(() => {
  const esc = v => TC.esc(String(v ?? ''));
  const date = v => {
    if (!v) return '-';
    try { return new Date(v).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
    catch { return '-'; }
  };
  const money = v => Number.isFinite(Number(v)) ? TC.money(Number(v)) : esc(v);
  const status = v => {
    const s = String(v ?? 'unknown').toLowerCase();
    const c = ['paid','completed','success','successful','published','active','approved'].includes(s) ? 'success'
      : ['pending','processing','draft','waiting'].includes(s) ? 'warning'
      : ['failed','rejected','cancelled','canceled','banned'].includes(s) ? 'danger' : 'neutral';
    return `<span class="pt-status ${c}">${esc(v || 'unknown')}</span>`;
  };
  const first = (o, keys) => { for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null && o[k] !== '') return o[k]; return null; };
  const id = v => v ? `<span class="pt-id" title="${esc(v)}">${esc(String(v).slice(0,8))}…</span>` : '-';

  window.PTUI = {
    purchases(rows) {
      const html = rows.map(x => {
        const title = first(x,['title','product_title','name','slug']) || 'Produk';
        const amount = first(x,['amount','price','total_amount','total']);
        const st = first(x,['status','payment_status']) || 'pending';
        return `<div class="pt-list-card">
          <div class="pt-icon"><i class="fa-solid fa-cart-shopping"></i></div>
          <div class="pt-grow"><strong>${esc(title)}</strong><small>${date(x.created_at)} · ID ${id(x.id)}</small></div>
          <div class="pt-actionbar">${amount !== null ? `<span class="pt-money">${money(amount)}</span>`:''}${status(st)}</div>
        </div>`;
      }).join('');
      return html || `<div class="empty"><i class="fa-solid fa-cart-shopping"></i><br>Belum ada pembelian.</div>`;
    },
    transactions(rows) {
      const html = rows.map(x => {
        const amount = first(x,['amount','net_amount','total_amount','value']);
        const type = first(x,['type','transaction_type','category']) || 'Transaction';
        const st = first(x,['status']) || 'completed';
        return `<div class="pt-list-card">
          <div class="pt-icon"><i class="fa-solid fa-arrow-right-arrow-left"></i></div>
          <div class="pt-grow"><strong>${esc(type)}</strong><small>${date(x.created_at)} · ID ${id(x.id)}</small></div>
          <div class="pt-actionbar">${amount !== null ? `<span class="pt-money">${money(amount)}</span>`:''}${status(st)}</div>
        </div>`;
      }).join('');
      return html || `<div class="empty"><i class="fa-solid fa-receipt"></i><br>Belum ada transaksi.</div>`;
    },
    products(rows) {
      const html = rows.map(x => `<div class="pt-list-card">
        <div class="pt-icon"><i class="fa-solid ${x.type==='code'?'fa-code':x.type==='channel'?'fa-broadcast-tower':'fa-link'}"></i></div>
        <div class="pt-grow"><strong>${esc(x.title || 'Untitled')}</strong>
          <small>${esc(x.type || 'link')} · ${esc(x.slug || '-')} · ${date(x.created_at)}</small></div>
        <div class="pt-actionbar"><span class="pt-money">${Number(x.price||0) ? TC.money(x.price) : 'FREE'}</span>${status(x.status||'draft')}</div>
      </div>`).join('');
      return html || `<div class="empty"><i class="fa-solid fa-box-open"></i><br>Belum ada produk.</div>`;
    }
  };
})();

document.addEventListener('DOMContentLoaded',async()=>{const u=await TC.user();if(!u)return location.href='login.html';try{const {data,error}=await sb.from('purchases').select('*').eq('buyer_id',u.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;content.innerHTML=PTUI.purchases(data||[])}catch(e){content.innerHTML=`<div class="empty">${TC.esc(e.message)}</div>`}});