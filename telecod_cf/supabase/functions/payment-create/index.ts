import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url=Deno.env.get("SUPABASE_URL")!;
const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const apiKey=Deno.env.get("DOMPETX_API_KEY")!;
const base=(Deno.env.get("DOMPETX_API_BASE")||"https://api.dompetx.com").replace(/\/$/,"");
const method=Deno.env.get("DOMPETX_PAYMENT_METHOD")||"QRIS";
const db=createClient(url,service);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"content-type":"application/json"}});

async function sign(timestamp:string,body:string){
 const data=`${timestamp}.${body}`;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(apiKey),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(data));
 return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function dompetPost(path:string,payload:any,idempotency:string){
 const body=JSON.stringify(payload), timestamp=String(Math.floor(Date.now()/1000)), signature=await sign(timestamp,body);
 const r=await fetch(`${base}${path}`,{method:"POST",headers:{
  "Content-Type":"application/json","X-DOMPAY-API-Key":apiKey,"X-DOMPAY-Signature":signature,
  "X-DOMPAY-Timestamp":timestamp,"Idempotency-Key":idempotency
 },body});
 const out=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(out.message||out.error||out.status_message||`DompetX HTTP ${r.status}`);
 return out;
}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  if(!apiKey)return json({error:"DOMPETX_API_KEY is not configured"},500);
  const auth=req.headers.get("Authorization"); if(!auth)return json({error:"Unauthorized"},401);
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:ue}=await client.auth.getUser(); if(ue||!user)return json({error:"Unauthorized"},401);
  const b=await req.json(), action=String(b.action||""); let amount=0,payment:any,item:any;

  if(action==="purchase"){
   const {data:p,error}=await db.from("products").select("id,creator_id,title,price,access_type,status").eq("id",b.product_id).single();
   if(error||!p||p.status!=="published"||p.access_type!=="paid")return json({error:"Product unavailable"},400);
   if(p.creator_id===user.id)return json({error:"Cannot buy your own product"},400);
   const {data:existing}=await db.from("purchases").select("id,status").eq("product_id",p.id).eq("buyer_id",user.id).maybeSingle();
   if(existing?.status==="paid")return json({error:"Already purchased",purchase_id:existing.id},409);
   let purchase:any=existing;
   if(!purchase){
    const r=await db.from("purchases").insert({product_id:p.id,buyer_id:user.id,amount:p.price,status:"pending"}).select().single();
    if(r.error)throw r.error; purchase=r.data;
   }
   amount=Number(p.price); item={name:p.title,quantity:1,price:amount};
   const ref=`TC-P-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;
   const r=await db.from("payments").insert({user_id:user.id,purchase_id:purchase.id,kind:"purchase",provider:"dompetx",order_id:ref,amount,currency:"IDR",status:"pending"}).select().single();
   if(r.error)throw r.error; payment=r.data;
   await db.from("purchases").update({payment_id:payment.id,amount}).eq("id",purchase.id);
  }else if(action==="deposit"){
   amount=Number(b.amount||0);
   if(!Number.isFinite(amount)||amount<10000)return json({error:"Minimum deposit is Rp 10.000"},400);
   const ref=`TC-D-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;
   const r=await db.from("payments").insert({user_id:user.id,kind:"deposit",provider:"dompetx",order_id:ref,amount,currency:"IDR",status:"pending"}).select().single();
   if(r.error)throw r.error; payment=r.data; item={name:"TeleCod Wallet Deposit",quantity:1,price:amount};
   await db.from("transactions").insert({user_id:user.id,type:"deposit",direction:"credit",amount,status:"pending",reference_id:payment.id,description:"Wallet deposit"});
  }else return json({error:"Unknown action"},400);

  const payload={
   method,amount,currency:"IDR",reference:payment.order_id,settlementSpeed:"standard",
   redirectUrl:b.redirect_url||Deno.env.get("TELECOD_PAYMENT_REDIRECT_URL")||undefined,
   metadata:{order_name:action==="purchase"?"TeleCod Product Purchase":"TeleCod Wallet Deposit",product_name:item.name,customer_name:user.user_metadata?.username||"TeleCod User",customer_email:user.email||undefined,items:[item]}
  };
  const out=await dompetPost("/v1/payments",payload,`tc_${payment.id}`);
  const providerId=String(out.id||out.paymentId||"");
  if(!providerId)throw new Error("DompetX tidak mengembalikan payment id");
  await db.from("payments").update({provider_reference:providerId,raw_payload:out}).eq("id",payment.id);
  return json({ok:true,payment_id:payment.id,order_id:payment.order_id,provider_payment_id:providerId,amount,method,qr_url:`${base}/v1/qr/${encodeURIComponent(providerId)}`});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Payment creation failed"},500)}
});
