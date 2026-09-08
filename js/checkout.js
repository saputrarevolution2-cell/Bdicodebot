document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const type = String(qs.get("type") || "link").toLowerCase();
  const id = qs.get("id");
  const state = $("checkoutState"), content = $("checkoutContent"), errorBox = $("checkoutError"), payBtn = $("continuePayment");
  const money = (v) => window.TC?.money ? window.TC.money(Number(v||0)) : new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(v||0));
  const esc = (v) => window.TC?.esc ? window.TC.esc(v) : String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const normalizedType = ["paste","pastelink","paste-link","paste_link"].includes(type) ? "link" : type;
  const fail = (msg) => { state.hidden=true; errorBox.hidden=false; errorBox.innerHTML=`<i class="fa-solid fa-circle-exclamation"></i> ${esc(msg)} <br><br><a href="marketplace.html">Kembali ke marketplace</a>`; };
  try {
    const user = await window.TC?.user?.().catch(()=>null);
    if (!user) { const next=encodeURIComponent(location.href); location.href=`login.html?redirect=${next}`; return; }
    if (!id) throw new Error("ID produk tidak ditemukan.");
    const result = await window.sb.rpc("get_market_item_detail", {p_type:normalizedType,p_id:id});
    if (result.error) throw result.error;
    const product = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!product) throw new Error("Produk tidak ditemukan atau sudah tidak tersedia.");
    if (product.can_access === true) throw new Error("Kamu sudah memiliki akses ke produk ini.");
    const price = Number(product.price||0);
    if (price <= 0) throw new Error("Produk ini gratis. Gunakan tombol akses langsung dari halaman produk.");
    $("productTitle").textContent=product.title||"Produk";
    $("productMeta").innerHTML=`<b>${esc(product.creator_name||product.seller_name||product.username||"Creator")}</b> · ${esc(normalizedType.toUpperCase())}`;
    $("productViews").textContent=Number(product.views||0).toLocaleString("id-ID");
    $("productAccess").textContent=String(product.access_type||"Paid").replace(/_/g," ");
    $("productPrice").textContent=money(price); $("serviceFee").textContent=money(0); $("totalPrice").textContent=money(price);
    payBtn.onclick=async()=>{
      payBtn.disabled=true; const original=payBtn.innerHTML; payBtn.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i> Membuat order...`;
      try{
        const r=await window.sb.rpc("create_checkout_order",{p_type:normalizedType,p_id:id});
        if(r.error) throw r.error; const order=Array.isArray(r.data)?r.data[0]:r.data;
        if(!order?.order_id) throw new Error("Order pembayaran tidak berhasil dibuat.");
        location.href=`payment.html?order_id=${encodeURIComponent(order.order_id)}`;
      }catch(e){ window.TC?.toast?.(e?.message||"Order gagal dibuat.","error"); payBtn.disabled=false; payBtn.innerHTML=original; }
    };
    state.hidden=true; content.hidden=false;
  } catch(e){ console.error("[PasTele Checkout]",e); fail(e?.message||"Checkout tidak dapat dimuat."); }
});
