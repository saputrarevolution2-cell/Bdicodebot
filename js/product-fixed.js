document.addEventListener('DOMContentLoaded', async () => {
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id');
  const type = (qs.get('type') || 'link').toLowerCase();
  const box = document.getElementById('content');
  const icon = t => t === 'code' ? 'fa-code' : t === 'channel' ? 'fa-broadcast-tower' : t === 'group' ? 'fa-users' : 'fa-link';
  if (!id) { box.innerHTML = '<div class="empty">Produk tidak ditemukan.</div>'; return; }
  const { data: x, error } = await sb.rpc('get_market_item_detail', { p_type: type, p_id: id });
  if (error || !x) { box.innerHTML = `<div class="empty">${TC.esc(error?.message || 'Produk tidak ditemukan atau belum dipublikasikan.')}</div>`; return; }
  try { await sb.rpc('record_content_view', { p_owner: x.owner_id, p_target_type: type, p_target_id: id }); } catch (_) {}
  const follow = x.creator_username ? '<button class="btn" id="follow"><i class="fa-solid fa-user-plus"></i> Follow creator</button>' : '';
  const price = Number(x.price || 0);
  const canAccess = x.can_access === true;
  const content = canAccess ? (x.content || x.description || 'Tidak ada detail.') : (price > 0 ? 'Konten berbayar. Beli untuk membuka akses.' : (x.description || 'Tidak ada detail.'));
  box.innerHTML = `<article class="product-detail">
    <div class="product-detail-icon"><i class="fa-solid ${icon(type)}"></i></div>
    <span class="badge">${TC.esc(String(x.access_type || 'free').toUpperCase())}</span>
    <h1>${TC.esc(x.title || 'Untitled')}</h1>
    <p class="muted">Oleh <b>${TC.esc(x.creator_name || 'Creator')}</b> · ${Number(x.views || 0).toLocaleString('id-ID')} views</p>
    <div class="detail-body">${canAccess ? content : TC.esc(content)}</div>
    <div class="detail-actions">
      <button class="btn" id="like"><i class="fa-regular fa-heart"></i> Like</button>
      <button class="btn" id="share"><i class="fa-solid fa-share-nodes"></i> Share</button>
      ${follow}<b class="price">${price ? TC.money(price) : 'FREE'}</b>
      <button class="btn primary" id="buy"><i class="fa-solid fa-cart-shopping"></i> ${price && !canAccess ? 'Beli sekarang' : canAccess ? 'Sudah diakses' : 'Ambil akses'}</button>
    </div>
  </article>`;
  const buy = document.getElementById('buy');
  if (canAccess) { buy.disabled = true; buy.classList.add('disabled'); }
  buy.onclick = async () => {
    const u = await TC.user(); if (!u) return location.href = 'login.html';
    if (!confirm(price ? `Beli ${x.title} seharga ${TC.money(price)} dari saldo wallet?` : `Ambil ${x.title}?`)) return;
    const q = await sb.rpc('buy_market_item', { p_type: type, p_id: id });
    if (q.error) TC.toast(q.error.message, 'error'); else { TC.toast('Pembelian berhasil', 'success'); setTimeout(() => location.href = 'purchases.html', 500); }
  };
  document.getElementById('share').onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); } catch (_) {}
    try { await sb.rpc('track_analytics', { p_owner: x.owner_id, p_event: 'share', p_target_type: type, p_target_id: id }); } catch (_) {}
    TC.toast('Link berhasil disalin', 'success');
  };
  document.getElementById('like').onclick = async () => {
    const r = await sb.rpc('toggle_content_like', { p_owner: x.owner_id, p_target_type: type, p_target_id: id });
    if (r.error) return TC.toast(r.error.message, 'error');
    document.getElementById('like').innerHTML = r.data?.liked ? '<i class="fa-solid fa-heart"></i> Liked' : '<i class="fa-regular fa-heart"></i> Like';
  };
  document.getElementById('follow')?.addEventListener('click', async () => {
    const r = await sb.rpc('toggle_creator_follow', { p_creator: x.owner_id });
    if (r.error) return TC.toast(r.error.message, 'error');
    document.getElementById('follow').innerHTML = r.data?.following ? '<i class="fa-solid fa-user-check"></i> Following' : '<i class="fa-solid fa-user-plus"></i> Follow creator';
  });
});