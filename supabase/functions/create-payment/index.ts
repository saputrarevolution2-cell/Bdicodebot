import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{
 const auth=req.headers.get('Authorization');if(!auth)return json({error:'Authentication required'},401);
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const admin=createClient(url,service);
 const {data:{user}}=await userClient.auth.getUser();if(!user)return json({error:'Authentication required'},401);
 const {order_id}=await req.json();if(!order_id)return json({error:'order_id required'},400);
 const {data:order,error:oe}=await admin.from('orders').select('id,buyer_id,amount,status,products(title)').eq('id',order_id).single();if(oe||!order)return json({error:'Order not found'},404);
 if(order.buyer_id!==user.id)return json({error:'Forbidden'},403);if(order.status!=='pending')return json({error:'Order is not pending'},400);
 const {data:cfg,error:ce}=await admin.from('payment_settings').select('enabled,provider,mode,merchant_id,api_endpoint').eq('id',1).single();if(ce||!cfg?.enabled||cfg.mode!=='api')return json({error:'Payment API is not configured'},400);
 const endpoint=cfg.api_endpoint||Deno.env.get('PAYMENT_API_ENDPOINT');const key=Deno.env.get('PAYMENT_API_KEY');if(!endpoint||!key)return json({error:'Payment API secrets are not configured'},500);
 // Generic provider adapter. Map this payload to your provider's required fields if needed.
 const providerResponse=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({order_id:order.id,amount:order.amount,currency:'IDR',product:order.products?.title,callback_url:`${url}/functions/v1/payment-webhook`})});
 const raw=await providerResponse.text();let payload:any;try{payload=JSON.parse(raw)}catch{payload={raw}}if(!providerResponse.ok)return json({error:'Payment provider error',details:payload},502);
 const paymentUrl=payload.payment_url||payload.checkout_url||payload.invoice_url||payload.data?.payment_url||payload.data?.checkout_url;const reference=payload.reference||payload.invoice_id||payload.data?.reference||payload.data?.invoice_id;
 await admin.from('orders').update({payment_url:paymentUrl||null,payment_reference:reference||null,payment_provider:cfg.provider}).eq('id',order.id);
 return json({order_id:order.id,payment_url:paymentUrl||null,reference:reference||null,provider:cfg.provider});
}catch(e){return json({error:e instanceof Error?e.message:'Unexpected error'},500)}});
