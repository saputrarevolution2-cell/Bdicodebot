document.addEventListener('DOMContentLoaded', async () => {
  'use strict';
  const qs=new URLSearchParams(location.search), initialId=qs.get('id'), slug=qs.get('slug'), type=(qs.get('type')||'link').toLowerCase(), box=document.getElementById('content');
  const esc=v=>window.TC?.esc?TC.esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const icon=t=>t==='code'?'fa-code':t==='channel'||t==='group'?'fa-brands fa-telegram':t==='paste'||t==='pastelink'?'fa-file-lines':'fa-link';
  const safeUrl=v=>{let s=String(v||'').trim();if(!s)return'';if(/^www\./i.test(s))s='https://'+s;if(/^https?:\/\//i.test(s)){try{let u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}}if(/^t\.me\//i.test(s))return'https://'+s;if(/^@[\w\d_]{3,}$/i.test(s))return'https://t.me/'+s.slice(1);return''};
  const textFromHtml=html=>{const d=new DOMParser().parseFromString(String(html||''),'text/html');d.querySelectorAll('script,iframe,object,embed,style').forEach(e=>e.remove());return d.body.textContent||''};
  const linkifyHtml=raw=>{const d=new DOMParser().parseFromString(String(raw||''),'text/html');d.querySelectorAll('script,iframe,object,embed,style').forEach(e=>e.remove());d.querySelectorAll('[onclick],[onerror],[onload],[onmouseover]').forEach(e=>['onclick','onerror','onload','onmouseover'].forEach(a=>e.removeAttribute(a)));d.querySelectorAll('a').forEach(a=>{const h=safeUrl(a.getAttribute('href'));if(h){a.setAttribute('href',h);a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer')}else a.removeAttribute('href')});const walker=d.createTreeWalker(d.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())if(!walker.currentNode.parentElement.closest('a,pre,code'))nodes.push(walker.currentNode);const re=/((?:https?:\/\/|www\.)[^\s<>"']+)/gi;nodes.forEach(n=>{const frag=document.createDocumentFragment();let last=0,m;while((m=re.exec(n.nodeValue))){let url=m[1],trail='';while(/[.,!?;:)\]}]$/.test(url)){trail=url.slice(-1)+trail;url=url.slice(0,-1)}if(m.index>last)frag.append(document.createTextNode(n.nodeValue.slice(last,m.index)));const a=document.createElement('a');a.href=safeUrl(url)||url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=url;frag.append(a);if(trail)frag.append(document.createTextNode(trail));last=m.index+m[1].length}if(last){if(last<n.nodeValue.length)frag.append(document.createTextNode(n.nodeValue.slice(last)));n.replaceWith(frag)}});return d.body.innerHTML};
  const codeText=html=>textFromHtml(html).replace(/\u00a0/g,' ');
  const telegramUrl=v=>{let u=safeUrl(v);return u&&(/t\.me|telegram\.me/i.test(u)?u:'')};
  let id = initialId;
  try{
    // Short public URLs use a 5-character slug. Resolve it to the existing
    // UUID so the existing detail/access RPC remains the single source of truth.
    if(!id && slug){
      const table = type==='code'
        ? 'telegram_products'
        : (type==='channel'||type==='group')
          ? 'telegram_channels'
          : null;
      if(!table){
        box.innerHTML='<div class="empty">Produk tidak ditemukan.</div>';
        return;
      }
      const {data:row,error:slugError}=await sb
        .from(table)
        .select('id')
        .eq('slug',slug)
        .maybeSingle();
      if(slugError || !row?.id){
        box.innerHTML=`<div class="empty">${esc(slugError?.message||'Link tidak ditemukan atau sudah tidak tersedia.')}</div>`;
        return;
      }
      id = row.id;
    }
    if(!id){box.innerHTML='<div class="empty">Produk tidak ditemukan.</div>';return}
    const {data:x,error}=await sb.rpc('get_market_item_detail',{p_type:type,p_id:id});
    if(error||!x){box.innerHTML=`<div class="empty">${esc(error?.message||'Produk tidak ditemukan atau belum dipublikasikan.')}</div>`;return}
    try{await sb.rpc('record_content_view',{p_owner:x.owner_id,p_target_type:type,p_target_id:id})}catch(_){}
    const price=Number(x.price||0), canAccess=x.can_access===true;
    let body='';
    if(type==='channel'||type==='group'){
      const raw=x.channel_link||x.telegram_channel_id||x.content||x.username||'';
      const href=telegramUrl(raw)||safeUrl(raw);
      body=!canAccess?`<div class="telegram-locked"><i class="fa-solid fa-lock"></i><div><strong>Akses Telegram terkunci</strong><span>Bayar atau ambil akses untuk membuka link.</span></div></div>`:raw?`<div class="telegram-access-card"><div class="telegram-access-icon"><i class="fa-brands fa-telegram"></i></div><div class="telegram-access-info"><span>TELEGRAM ${type==='group'?'GROUP':'CHANNEL'}</span><strong>${esc(raw)}</strong></div>${href?`<a class="btn primary telegram-open-btn" href="${esc(href)}" target="_blank" rel="noopener"><i class="fa-brands fa-telegram"></i> Buka Telegram</a>`:`<button class="btn primary telegram-copy-btn" data-copy="${esc(raw)}"><i class="fa-solid fa-copy"></i> Salin</button>`}</div>`:`<div class="telegram-empty"><i class="fa-solid fa-link-slash"></i><div><strong>Link belum tersedia</strong><span>Creator belum menyimpan link Telegram.</span></div></div>`;
    }else if(type==='code'){
      const raw=canAccess?codeText(x.content||''):'Kode berbayar. Buka akses untuk melihat kode lengkap.';
      const botUser=x.bot_username||x.bot||''; const botHref=telegramUrl(botUser)||safeUrl(botUser);
      body=canAccess?`<div class="code-viewer"><div class="code-head"><span><i class="fa-solid fa-code"></i> CODE</span><button class="code-copy" id="copyCode"><i class="fa-solid fa-copy"></i> Salin</button></div><pre><code>${esc(raw)}</code></pre>${botHref?`<a class="telegram-bot-card" href="${esc(botHref)}" target="_blank" rel="noopener"><i class="fa-brands fa-telegram"></i><span><b>Bot Telegram</b><small>${esc(botUser)}</small></span><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`:''}</div>`:`<div class="code-locked"><i class="fa-solid fa-lock"></i><div><b>Kode terkunci</b><span>Bayar untuk membuka dan menyalin kode lengkap.</span></div></div>`;
    }else{
      body=`<div class="rich-output-view">${canAccess?linkifyHtml(x.content_html||x.content||x.description||'Tidak ada konten.'):linkifyHtml(x.description||'Konten berbayar. Buka akses untuk melihat isi lengkap.')}</div>`;
    }
    const accessHint = x.access_reason==='subscription_limit'
      ? '<div class="access-limit-note"><i class="fa-solid fa-clock"></i><span>Batas Langganan 5x Code hari ini sudah tercapai. Kamu bisa mencoba lagi besok atau upgrade Premium.</span></div>'
      : x.access_reason==='subscription'
        ? '<div class="access-limit-note"><i class="fa-solid fa-gem"></i><span>Akses dibuka dengan Langganan · maksimal 5 Code Paid per hari.</span></div>'
        : x.access_reason==='premium'
          ? '<div class="access-limit-note premium-access-note"><i class="fa-solid fa-circle-check"></i><span>Premium aktif · akses Paid terbuka.</span></div>' : '';
    box.innerHTML=`<article class="product-detail premium-view"><div class="product-detail-icon"><i class="fa-solid ${icon(type)}"></i></div><span class="badge">${esc(String(x.access_type||'free').toUpperCase())}</span><h1>${esc(x.title||'Untitled')}</h1><p class="muted">Oleh <b>${esc(x.creator_name||'Creator')}</b> · ${Number(x.views||0).toLocaleString('id-ID')} views</p>${accessHint}${body}<div class="detail-actions"><button class="btn" id="like"><i class="fa-regular fa-heart"></i> Like</button><button class="btn" id="share"><i class="fa-solid fa-share-nodes"></i> Share</button><b class="price">${price?TC.money(price):'FREE'}</b><button class="btn primary" id="buy">${canAccess?'<i class="fa-solid fa-circle-check"></i> Sudah diakses':price?'<i class="fa-solid fa-qrcode"></i> Bayar via Cashi QRIS':'<i class="fa-solid fa-unlock"></i> Ambil akses'}</button></div></article>`;
    if(canAccess)document.getElementById('buy').disabled=true;
    document.getElementById('copyCode')?.addEventListener('click',async()=>{const text=codeText(x.content||'');try{await navigator.clipboard.writeText(text);TC.toast('Kode berhasil disalin','success')}catch(_){TC.toast('Gagal menyalin kode','error')}});
    document.querySelector('.telegram-copy-btn')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(e.currentTarget.dataset.copy||'');TC.toast('Link berhasil disalin','success')}catch(_){TC.toast('Gagal menyalin link','error')}});
    const buy=document.getElementById('buy');buy.onclick=async()=>{const u=await TC.user();if(!u)return location.href='login.html';if(!price){const q=await sb.rpc('buy_market_item',{p_type:type,p_id:id});if(q.error)return TC.toast(q.error.message,'error');TC.toast('Akses berhasil dibuka','success');return setTimeout(()=>location.reload(),500)}buy.disabled=true;buy.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan QR...';try{const o=await sb.rpc('create_checkout_order',{p_type:type,p_id:id});if(o.error)throw o.error;const order=o.data,cfg=window.PASTELE_CONFIG||{},token=cfg.SUPABASE_ANON_KEY,url=(cfg.SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/create-cashi-payment';const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({order_id:order.order_id,amount:Number(order.amount),title:order.title})});const payload=await r.json().catch(()=>({}));if(!r.ok)throw new Error(payload.error||'Gateway Cashi belum tersedia');showPaymentModal(order,payload)}catch(e){TC.toast(e.message||'Pembayaran gagal dibuat','error');buy.disabled=false;buy.innerHTML='<i class="fa-solid fa-qrcode"></i> Bayar via Cashi QRIS'}};
    document.getElementById('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href)}catch(_){}try{await sb.rpc('track_analytics',{p_owner:x.owner_id,p_event:'share',p_target_type:type,p_target_id:id})}catch(_){}TC.toast('Link berhasil disalin','success')};
    document.getElementById('like').onclick=async()=>{const r=await sb.rpc('toggle_content_like',{p_owner:x.owner_id,p_target_type:type,p_target_id:id});if(r.error)return TC.toast(r.error.message,'error');document.getElementById('like').innerHTML=r.data?.liked?'<i class="fa-solid fa-heart"></i> Liked':'<i class="fa-regular fa-heart"></i> Like'};
    function showPaymentModal(order,pay){document.getElementById('cashiModal')?.remove();const m=document.createElement('div');m.className='cashi-modal-backdrop';m.id='cashiModal';m.innerHTML=`<div class="cashi-modal"><button class="cashi-close" type="button">×</button><span class="badge">CASHI · QRIS</span><h2>Bayar ${TC.money(order.amount)}</h2><p class="muted">Nominal pembayaran dikunci sesuai harga produk.</p><div class="cashi-qr">${pay.qr_image?`<img src="${esc(pay.qr_image)}" alt="QRIS Cashi">`:pay.qr_string?`<div class="qr-text">${esc(pay.qr_string)}</div>`:'<div class="empty">QR belum diterima dari Cashi.</div>'}</div>${pay.payment_url?`<a class="btn primary" target="_blank" rel="noopener" href="${esc(pay.payment_url)}">Buka pembayaran Cashi</a>`:''}<p class="cashi-status" id="cashiStatus">Menunggu pembayaran...</p></div>`;document.body.appendChild(m);m.querySelector('.cashi-close').onclick=()=>m.remove();poll(order.order_id,m)}
    async function poll(orderId,m){const timer=setInterval(async()=>{try{const r=await sb.from('orders').select('status,payment_id,paid_at').eq('id',orderId).maybeSingle();if(r.data?.status==='paid'){clearInterval(timer);m.querySelector('#cashiStatus').textContent='Pembayaran berhasil. Membuka akses...';setTimeout(()=>location.reload(),700)}else if(r.data?.status==='expired'){clearInterval(timer);m.querySelector('#cashiStatus').textContent='Pembayaran kedaluwarsa.'}}catch(_){}},2500);setTimeout(()=>clearInterval(timer),18e5)}
  }catch(e){console.error(e);box.innerHTML=`<div class="empty">Gagal memuat produk: ${esc(e?.message||'Unknown error')}</div>`}
});