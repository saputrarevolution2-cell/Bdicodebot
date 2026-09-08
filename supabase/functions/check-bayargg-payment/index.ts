import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json; charset=utf-8" };
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:CORS});
const env=(n:string)=>{const v=Deno.env.get(n)?.trim();if(!v)throw new Error(`${n} belum diset di Supabase Edge Function Secrets.`);return v;};
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return json({success:false,error:"Method not allowed."},405);
  try{
    const url=env("SUPABASE_URL"), service=env("SUPABASE_SERVICE_ROLE_KEY"), api=env("BAYARGG_API_KEY");
    const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
    if(!token)return json({success:false,error:"Sesi login tidak ditemukan."},401);
    const admin=createClient(url,service); const au=await admin.auth.getUser(token);
    if(au.error||!au.data.user)return json({success:false,error:"Sesi login tidak valid atau sudah kedaluwarsa."},401);
    const body=await req.json().catch(()=>({})); const oid=String(body?.order_id||"").trim();
    if(!oid)return json({success:false,error:"order_id wajib diisi."},400);
    const {data:order,error:oe}=await admin.from("orders").select("id,buyer_id,amount,status,payment_reference,item_type,item_title").eq("id",oid).maybeSingle();
    if(oe)throw oe;if(!order)return json({success:false,error:"Order tidak ditemukan."},404);
    if(String(order.buyer_id)!==String(au.data.user.id))return json({success:false,error:"Order bukan milik akun ini."},403);
    if(["paid","success","completed"].includes(String(order.status||"").toLowerCase()))return json({success:true,order_id:oid,status:"paid",settled:true});
    const invoice=String(order.payment_reference||"").trim();if(!invoice)return json({success:false,error:"Invoice Bayar.gg belum dibuat."},400);
    const r=await fetch(`https://api.bayar.gg/api/check-payment.php?invoice=${encodeURIComponent(invoice)}`,{headers:{"X-API-Key":api,"Accept":"application/json"}});
    const raw=await r.text();let data:any={};try{data=raw?JSON.parse(raw):{}}catch{data={raw};}
    if(!r.ok||data?.success===false)return json({success:false,error:data?.message||data?.error||`Bayar.gg gagal mengecek pembayaran (HTTP ${r.status}).`},502);
    const d=data?.data||data;const status=String(d?.status||"pending").toLowerCase();let settled=false;
    if(status==="paid"){
      const sr=await admin.rpc("settle_bayargg_order",{p_order_id:order.id,p_invoice_id:invoice,p_gateway_status:"paid",p_final_amount:Number(d?.final_amount??d?.amount??order.amount),p_gateway_payload:d});
      if(sr.error)throw sr.error;settled=sr.data!==false;
    }
    return json({success:true,order_id:oid,invoice_id:invoice,status,amount:d?.amount??null,final_amount:d?.final_amount??null,paid_at:d?.paid_at??null,settled});
  }catch(e){console.error("check-bayargg-payment",e);return json({success:false,error:e instanceof Error?e.message:"Internal server error."},500);}
});
