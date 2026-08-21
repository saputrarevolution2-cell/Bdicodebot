import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const apiKey=Deno.env.get("DOMPETX_API_KEY")!,base=(Deno.env.get("DOMPETX_API_BASE")||"https://api.dompetx.com").replace(/\/$/,"");
const db=createClient(url,service);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"content-type":"application/json"}});
async function sign(ts:string,body:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(apiKey),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${ts}.${body}`));return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function check(providerId:string){
 const body="{}",ts=String(Math.floor(Date.now()/1000)),sig=await sign(ts,body);
 const r=await fetch(`${base}/v1/payments/check-status/${encodeURIComponent(providerId)}`,{headers:{"X-DOMPAY-API-Key":apiKey,"X-DOMPAY-Signature":sig,"X-DOMPAY-Timestamp":ts}});
 const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.message||out.error||`DompetX HTTP ${r.status}`);return out;
}
async function settle(payment:any){
 const st=String(payment.status||"").toLowerCase();
 if(st!=="paid")return;
 if(payment.kind==="deposit"){
  const {data:tx}=await db.from("transactions").select("id,status").eq("reference_id",payment.id).eq("type","deposit").maybeSingle();
  if(tx?.status!=="success"){
   await db.rpc("ensure_wallet",{p_user:payment.user_id});
   const {data:w}=await db.from("wallets").select("balance").eq("user_id",payment.user_id).single();
   await db.from("wallets").update({balance:Number(w?.balance||0)+Number(payment.amount)}).eq("user_id",payment.user_id);
   if(tx)await db.from("transactions").update({status:"success"}).eq("id",tx.id);
  }
  return;
 }
 const {data:purchase}=await db.from("purchases").select("id,buyer_id,product_id,amount,status,products(creator_id,title,sales_count)").eq("id",payment.purchase_id).single();
 if(!purchase)return;
 if(purchase.status!=="paid"){
  await db.from("purchases").update({status:"paid",paid_at:new Date().toISOString()}).eq("id",purchase.id);
  await db.from("products").update({sales_count:Number((purchase as any).products?.sales_count||0)+1}).eq("id",purchase.product_id);
  const {data:buyerTx}=await db.from("transactions").select("id").eq("reference_id",purchase.id).eq("type","purchase").maybeSingle();
  if(!buyerTx)await db.from("transactions").insert({user_id:purchase.buyer_id,type:"purchase",direction:"debit",amount:purchase.amount,status:"success",reference_id:purchase.id,description:`Purchase: ${(purchase as any).products?.title||"Product"}`});
  const creator=(purchase as any).products?.creator_id;
  if(creator){
   const {data:saleTx}=await db.from("transactions").select("id").eq("reference_id",purchase.id).eq("type","sale").maybeSingle();
   if(!saleTx){await db.from("transactions").insert({user_id:creator,type:"sale",direction:"credit",amount:purchase.amount,status:"success",reference_id:purchase.id,description:`Sale: ${(purchase as any).products?.title||"Product"}`});await db.rpc("ensure_wallet",{p_user:creator});const {data:w}=await db.from("wallets").select("balance").eq("user_id",creator).single();await db.from("wallets").update({balance:Number(w?.balance||0)+Number(purchase.amount)}).eq("user_id",creator);}
  }
 }
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 return (async()=>{try{
  if(!apiKey)return json({error:"DOMPETX_API_KEY is not configured"},500);
  const auth=req.headers.get("Authorization");if(!auth)return json({error:"Unauthorized"},401);
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}}),{data:{user}}=await client.auth.getUser();if(!user)return json({error:"Unauthorized"},401);
  const {payment_id}=await req.json();
  const {data:payment,error}=await db.from("payments").select("*").eq("id",payment_id).eq("user_id",user.id).single();if(error||!payment)return json({error:"Payment not found"},404);
  if(payment.status==="pending"&&payment.provider_reference){
   const out=await check(String(payment.provider_reference));
   const raw=String(out.status||out.payment?.status||"").toLowerCase();
   const mapped=["paid","success","settlement","completed"].includes(raw)?"paid":["expired","expire"].includes(raw)?"expired":["cancelled","canceled","failed","failure"].includes(raw)?"failed":"pending";
   if(mapped!==payment.status||out.id)await db.from("payments").update({status:mapped,raw_payload:out,paid_at:mapped==="paid"?new Date().toISOString():null}).eq("id",payment.id);
   if(["failed","expired","cancelled"].includes(mapped) && payment.kind==="deposit"){
    await db.from("transactions").update({status:"failed"}).eq("reference_id",payment.id).eq("type","deposit").eq("status","pending");
   }
   payment.status=mapped;
  }
  if(payment.status==="paid")await settle(payment);
  return json({ok:true,status:payment.status,kind:payment.kind,payment_id:payment.id});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Status error"},500)}})();
});
