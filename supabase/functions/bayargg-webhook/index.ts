import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json; charset=utf-8"}});
function hex(buf:ArrayBuffer){return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function hmac(secret:string,message:string){return hex(await crypto.subtle.sign("HMAC",await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]),new TextEncoder().encode(message)));}
function timingSafe(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"content-type,x-webhook-signature"}});
 if(req.method!=="POST")return json({success:false,error:"Method not allowed."},405);
 try{
  const secret=Deno.env.get("BAYARGG_WEBHOOK_SECRET")?.trim();const url=Deno.env.get("SUPABASE_URL")?.trim();const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if(!secret||!url||!service)throw new Error("Webhook secrets Supabase belum lengkap.");
  const raw=await req.text();let body:any;try{body=JSON.parse(raw);}catch{return json({success:false,error:"Invalid JSON."},400);}
  const signature=(req.headers.get("X-Webhook-Signature")||"").trim();
  const invoice=String(body?.invoice_id||"").trim();const status=String(body?.status||"").toLowerCase();const finalAmount=Number(body?.final_amount||0);const timestamp=String(body?.timestamp||"").trim();
  if(!invoice||!timestamp||!signature)return json({success:false,error:"Webhook payload/signature tidak lengkap."},400);
  const expected=await hmac(secret,`${invoice}|${status}|${finalAmount}|${timestamp}`);
  if(!timingSafe(signature.toLowerCase(),expected.toLowerCase()))return json({success:false,error:"Invalid webhook signature."},401);
  if(status!=="paid")return json({success:true,ignored:true,status});
  const admin=createClient(url,service);const {data:order,error:oe}=await admin.from("orders").select("id,buyer_id,seller_id,amount,status,payment_reference").eq("payment_reference",invoice).maybeSingle();
  if(oe)throw oe;if(!order)return json({success:false,error:"Order invoice tidak ditemukan."},404);
  const expectedAmount=Number(order.amount||0);if(!Number.isFinite(finalAmount)||Math.round(finalAmount)!==Math.round(expectedAmount))return json({success:false,error:"Nominal webhook tidak sesuai order."},400);
  if(["paid","success","completed"].includes(String(order.status||"").toLowerCase()))return json({success:true,already_settled:true,order_id:order.id});
  const {data:result,error:se}=await admin.rpc("settle_bayargg_order",{p_order_id:order.id,p_invoice_id:invoice,p_gateway_status:status,p_final_amount:finalAmount,p_gateway_payload:body});
  if(se)throw se;return json({success:true,order_id:order.id,settled:result!==false});
 }catch(e){console.error("bayargg-webhook",e);return json({success:false,error:e instanceof Error?e.message:"Internal server error."},500);}
});
