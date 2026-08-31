document.addEventListener('DOMContentLoaded',async()=>{
 const u=await TC.user(); if(!u)return location.replace('login.html');
 const $=id=>document.getElementById(id), esc=v=>TC.esc(v);
 const today=new Date(), start=new Date(today); start.setDate(start.getDate()-29); start.setHours(0,0,0,0);
 const iso=start.toISOString();
 const days=Array.from({length:30},(_,i)=>{let d=new Date(start);d.setDate(start.getDate()+i);return d});
 const key=d=>d.toISOString().slice(0,10);
 let scope=$('scope').value;
 async function load(){
  scope=$('scope').value;
  const [p,pa,c,ch,o,wt,ev,evAll,lk,fl]=await Promise.all([
   sb.from('products').select('id,title,slug,type,views,sales_count,price,created_at,status').eq('creator_id',u.id).order('created_at',{ascending:false}),
   sb.from('pastelinks').select('id,slug,title,views,created_at').eq('user_id',u.id).order('created_at',{ascending:false}),
   sb.from('telegram_products').select('id,title,product_type,access_type,price,is_published,created_at').eq('owner_id',u.id).order('created_at',{ascending:false}),
   sb.from('telegram_channels').select('id,name,type,access_type,price,is_published,created_at').eq('owner_id',u.id).order('created_at',{ascending:false}),
   sb.from('orders').select('id,amount,status,created_at').eq('seller_id',u.id).eq('status','paid'),
   sb.from('wallet_transactions').select('amount,net_amount,type,status,created_at').eq('user_id',u.id).gte('created_at',iso),
   sb.from('analytics_events').select('event_type,target_type,target_id,created_at').eq('owner_id',u.id).gte('created_at',iso),
   sb.from('analytics_events').select('event_type,target_type,target_id,created_at').eq('owner_id',u.id),
   sb.from('content_likes').select('id',{count:'exact',head:true}).eq('content_owner_id',u.id),
   sb.from('creator_followers').select('id',{count:'exact',head:true}).eq('creator_id',u.id)
  ]);
  const products=p.data||[], pastes=pa.data||[], codes=c.data||[], channels=ch.data||[], orders=o.data||[], wallet=wt.data||[], events=ev.data||[], allEvents=evAll.data||[];
  const matches=(type)=>scope==='all'||type===scope||(scope==='paste'&&type==='link');
  const fp=products.filter(x=>matches(String(x.type||'link').toLowerCase())), fpa=scope==='all'||scope==='paste'?pastes:[], fc=scope==='all'||scope==='code'?codes:[], fch=scope==='all'||scope==='channel'||scope==='group'?channels.filter(x=>scope==='all'||x.type===scope):[];
  $('created').textContent=(fp.length+fpa.length+fc.length+fch.length).toLocaleString('id-ID');
  const views=fp.reduce((n,x)=>n+Number(x.views||0),0)+fpa.reduce((n,x)=>n+Number(x.views||0),0);
  $('views').textContent=views.toLocaleString('id-ID'); $('sales').textContent=orders.length.toLocaleString('id-ID');
  $('revenue').textContent=TC.money(orders.reduce((n,x)=>n+Number(x.amount||0),0));
  $('totalLink').textContent=(products.filter(x=>['link','paste','pastelink'].includes(String(x.type||'').toLowerCase())).length+pastes.length).toLocaleString('id-ID');
  $('totalCode').textContent=codes.length.toLocaleString('id-ID'); $('totalChannel').textContent=channels.filter(x=>x.type==='channel').length.toLocaleString('id-ID');
  const evBy=t=>allEvents.filter(x=>x.event_type===t).length;
  const likes=lk.count||0, shares=evBy('share'), follows=fl.count||0;
  $('interactions').innerHTML=[
   ['fa-eye','Views',views,'blue'],['fa-heart','Like',likes,'pink'],['fa-share-nodes','Share',shares,'violet'],['fa-user-plus','Follower',follows,'green']
  ].map(x=>`<div class="circle-stat ${x[3]}"><div class="circle"><i class="fa-solid ${x[0]}"></i></div><strong>${Number(x[2]).toLocaleString('id-ID')}</strong><span>${x[1]}</span></div>`).join('');
  const count={}; for(const d of days)count[key(d)]={views:0,paid:0,share:0};
  for(const x of events){const k=String(x.created_at).slice(0,10);if(count[k]){if(x.event_type==='view')count[k].views++;if(x.event_type==='share')count[k].share++;}}
  for(const x of orders){const k=String(x.created_at).slice(0,10);if(count[k])count[k].paid++;}
  const max=Math.max(1,...days.map(d=>Math.max(count[key(d)].views,count[key(d)].paid,count[key(d)].share)));
  $('chart').innerHTML=days.map(d=>{const k=key(d),v=count[k];return `<div class="chart-day" title="${k}: Views ${v.views}, Paid ${v.paid}, Share ${v.share}"><div class="bars"><i style="height:${Math.max(2,v.views/max*100)}%"></i><i style="height:${Math.max(2,v.paid/max*100)}%"></i><i style="height:${Math.max(2,v.share/max*100)}%"></i></div><small>${d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}).replace(' ','')}</small></div>`}).join('');
  const rows=[...products.map(x=>({title:x.title,type:x.type,icon:x.type==='code'?'fa-code':'fa-link',date:x.created_at,views:x.views||0,price:x.price||0})),...pastes.map(x=>({title:x.title||x.slug,type:'pastelink',icon:'fa-file-lines',date:x.created_at,views:x.views||0,price:0})),...codes.map(x=>({title:x.title,type:'code',icon:'fa-code',date:x.created_at,views:0,price:x.price||0})),...channels.map(x=>({title:x.name||'Channel',type:x.type,icon:'fa-broadcast-tower',date:x.created_at,views:0,price:x.price||0}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  $('recentLinks').innerHTML=rows.map(x=>`<div class="recent-item"><span class="recent-icon"><i class="fa-solid ${x.icon}"></i></span><div><b>${esc(x.title||'Untitled')}</b><small>${esc(x.type)} · ${new Date(x.date).toLocaleDateString('id-ID')}</small></div><strong>${x.price?TC.money(x.price):Number(x.views).toLocaleString('id-ID')+' views'}</strong></div>`).join('')||'<div class="empty">Belum ada konten.</div>';
  const acts=[...events.slice(-6).reverse().map(x=>({t:x.event_type,d:x.created_at})),...orders.slice(0,4).map(x=>({t:'paid',d:x.created_at}))].sort((a,b)=>new Date(b.d)-new Date(a.d)).slice(0,8);
  $('activity').innerHTML=acts.map(x=>`<div class="activity-row"><span><i class="fa-solid ${x.t==='view'?'fa-eye':x.t==='like'?'fa-heart':x.t==='share'?'fa-share-nodes':x.t==='follow'?'fa-user-plus':'fa-cart-shopping'}"></i></span><div><b>${esc(x.t.toUpperCase())}</b><small>${new Date(x.d).toLocaleString('id-ID')}</small></div></div>`).join('')||'<div class="empty">Belum ada aktivitas.</div>';
  $('helloName').textContent=u.user_metadata?.username||u.email?.split('@')[0]||'User';
 }
 $('scope').addEventListener('change',load); load();
});