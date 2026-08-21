export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const price = Number(body.price);
    const feePercent = Number(env.MARKET_FEE_PERCENT ?? 20);
    if (!Number.isFinite(price) || price < 0) {
      return Response.json({ success:false, error:"Harga tidak valid" }, { status:400 });
    }
    if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
      return Response.json({ success:false, error:"Konfigurasi fee tidak valid" }, { status:500 });
    }
    const fee = Math.floor(price * feePercent / 100);
    const seller_receive = price - fee;
    return Response.json({ success:true, price, fee_percent:feePercent, fee, seller_receive });
  } catch {
    return Response.json({ success:false, error:"Invalid JSON" }, { status:400 });
  }
}
