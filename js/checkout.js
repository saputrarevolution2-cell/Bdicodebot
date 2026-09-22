(()=>{"use strict";
document.addEventListener("DOMContentLoaded",async()=>{
 const $=id=>document.getElementById(id);
 const qs=new URLSearchParams(location.search);
 const type=String(qs.get("type")||qs.get("item_type")||"").trim();
 const id=String(qs.get("id")||qs.get("item_id")||qs.get("product_id")||"").trim();
 const state=$("checkoutState"), content=$("checkoutContent"), error=$("checkoutError");
 const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
 const showError=m=>{if(state)state.hidden=true;if(content)content.hidden=true;if(error){error.hidden=false;error.textContent=m;}};
 try{
   const sb=window.sb;
   if(!sb) throw new Error("Supabase belum siap. Silakan refresh halaman.");
   if(!type||!id) throw new Error("Produk checkout tidak valid.");
   const {data,error:e}=await window.PasTeleDB.rpc("get_market_item_detail_guest",{p_type:type,p_id:id,p_guest_token:localStorage.getItem("pastele-guest-checkout-token")||null});
   if(e) throw e;
   const item=Array.isArray(data)?data[0]:data;
   if(!item) throw new Error("Produk tidak ditemukan.");
   $("productTitle").textContent=item.title||item.item_title||"Produk";
   $("productMeta").textContent=item.category||item.type||type;
   $("productViews").textContent=Number(item.views||0).toLocaleString("id-ID");
   $("productAccess").textContent=String(item.access_type||"free").toUpperCase();
   $("productPrice").textContent=money(item.price||item.amount);
   $("serviceFee").textContent=money(0);
   $("totalPrice").textContent=money(item.price||item.amount);
   if(state)state.hidden=true;if(content)content.hidden=false;
   $("continuePayment")?.addEventListener("click",async()=>{
     const btn=$("continuePayment"); btn.disabled=true;
     try{
       const r=await window.PasTeleDB.rpc("create_checkout_order",{p_type:type,p_id:id});
       if(r.error) throw r.error;
       const row=Array.isArray(r.data)?r.data[0]:r.data;
       if(!row?.order_id) throw new Error("Order tidak berhasil dibuat.");
       const token=localStorage.getItem("pastele-guest-checkout-token")||"";
       location.href=`payment.html?order_id=${encodeURIComponent(row.order_id)}${token?`&guest_token=${encodeURIComponent(token)}`:""}`;
     }catch(e){btn.disabled=false;showError(e?.message||"Gagal membuat order.");}
   });
 }catch(e){showError(e?.message||"Checkout gagal.");}
});
})();