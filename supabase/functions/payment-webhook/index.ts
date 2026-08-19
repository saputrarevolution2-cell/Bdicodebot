import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const origin=Deno.env.get("APP_ORIGIN")||"*";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-webhook-secret, x-webhook-signature, x-webhook-timestamp, x-invoice-id","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
async function hmacHex(secret:string,body:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body));return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,'0')).join('');}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const raw=await req.text();
  const body=JSON.parse(raw);
  const secret=Deno.env.get('BAYARGG_WEBHOOK_SECRET')||Deno.env.get('PAYMENT_WEBHOOK_SECRET');
  if(!secret)return json({error:'Webhook secret is not configured'},500);
  const signature=req.headers.get('x-webhook-signature')||'';
  const timestamp=req.headers.get('x-webhook-timestamp')||String(body.timestamp||'');
  const invoice=String(body.invoice_id||body.merchant_order_id||body.external_id||req.headers.get('x-invoice-id')||'');
  const status=String(body.status||body.payment_status||body.transaction_status||'').toLowerCase();
  const finalAmount=Number(body.final_amount??body.amount??0);

  let valid=false;
  if(signature&&timestamp&&invoice){
    const signatureData=`${invoice}|${status}|${finalAmount}|${timestamp}`;
    const expected=await hmacHex(secret,signatureData);
    valid=safeEqual(signature.replace(/^sha256=/i,''),expected);
    const ts=Number(timestamp); if(Number.isFinite(ts)&&Math.abs(Date.now()/1000-ts)>900)valid=false;
  }
  if(!valid){
    const legacy=await hmacHex(secret,raw);
    valid=!!signature&&safeEqual(signature.replace(/^sha256=/i,''),legacy);
  }
  if(!valid&&req.headers.get('x-webhook-secret')!==secret) return json({error:'Invalid webhook signature'},401);
  if(!['paid','success','successful','settled','completed'].includes(status)) return json({ok:true,ignored:true,status});
  if(!invoice)return json({error:'invoice_id required'},400);

  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:order,error}=await admin.from('orders').select('id,amount,status,payment_reference').eq('payment_reference',invoice).maybeSingle();
  if(error||!order)return json({error:'Order not found'},404);
  if(finalAmount!==Number(order.amount))return json({error:'Payment amount mismatch'},400);
  const {error:completeError}=await admin.rpc('complete_paid_order',{p_order_id:order.id,p_payment_reference:invoice});
  if(completeError)throw completeError;
  return json({ok:true,order_id:order.id});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:'Webhook error'},500)}
});
