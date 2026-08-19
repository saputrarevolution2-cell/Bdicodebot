import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const origin=Deno.env.get('APP_ORIGIN')||'*';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const auth=req.headers.get('Authorization'); if(!auth)return json({error:'Authentication required'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user}}=await userClient.auth.getUser();if(!user)return json({error:'Authentication required'},401);
  const {order_id}=await req.json();if(!order_id)return json({error:'order_id required'},400);
  const {data:order,error}=await admin.from('orders').select('id,buyer_id,amount,status,payment_reference').eq('id',order_id).single();
  if(error||!order||order.buyer_id!==user.id)return json({error:'Order not found'},404);
  if(order.status==='paid')return json({status:'paid'});
  if(!order.payment_reference)return json({status:order.status});
  const key=Deno.env.get('BAYARGG_API_KEY')||Deno.env.get('PAYMENT_API_KEY');if(!key)return json({error:'Payment API key not configured'},500);
  const endpoint=Deno.env.get('BAYARGG_CHECK_ENDPOINT')||'https://www.bayar.gg/api/check-payment.php';
  const r=await fetch(`${endpoint}?invoice=${encodeURIComponent(order.payment_reference)}`,{headers:{'X-API-Key':key}});
  const body=await r.json();const data=body?.data||body;
  const status=String(data?.status||'').toLowerCase();
  if(['paid','success','successful','settled','completed'].includes(status)){
    const finalAmount=Number(data?.final_amount??data?.amount??order.amount);if(finalAmount!==Number(order.amount))return json({error:'Payment amount mismatch'},400);
    const {error:ce}=await admin.rpc('complete_paid_order',{p_order_id:order.id,p_payment_reference:order.payment_reference});if(ce)throw ce;
    return json({status:'paid'});
  }
  return json({status:status||order.status,expires_at:data?.expires_at||null});
 }catch(e){return json({error:e instanceof Error?e.message:'Unexpected error'},500)}
});
