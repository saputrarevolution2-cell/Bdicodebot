import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const origin=Deno.env.get("APP_ORIGIN")||"*";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const auth=req.headers.get('Authorization');
    if(!auth)return json({error:'Authentication required'},401);
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:{user}}=await userClient.auth.getUser();
    if(!user)return json({error:'Authentication required'},401);
    const {order_id}=await req.json();
    if(!order_id)return json({error:'order_id required'},400);
    const {data:order,error:oe}=await admin.from('orders').select('id,buyer_id,amount,status,products(title)').eq('id',order_id).single();
    if(oe||!order)return json({error:'Order not found'},404);
    if(order.buyer_id!==user.id)return json({error:'Forbidden'},403);
    if(order.status!=='pending')return json({error:'Order is not pending'},400);

    const {data:cfg,error:ce}=await admin.from('payment_settings').select('enabled,provider,mode,api_endpoint,currency').eq('id',1).single();
    if(ce||!cfg?.enabled||cfg.mode!=='api')return json({error:'Payment API is not configured'},400);

    const provider=String(cfg.provider||'bayargg').toLowerCase();
    const key=Deno.env.get('BAYARGG_API_KEY')||Deno.env.get('PAYMENT_API_KEY');
    if(!key)return json({error:'BAYARGG_API_KEY is not configured'},500);
    const endpoint=cfg.api_endpoint||Deno.env.get('BAYARGG_API_ENDPOINT')||'https://www.bayar.gg/api/create-payment.php';
    const callbackUrl=`${url}/functions/v1/payment-webhook`;
    const redirectUrl=`${Deno.env.get('APP_ORIGIN')||'/'}/checkout.html?id=${order.id}`;

    const payload={
      amount:Number(order.amount),
      description:`TeleCod Order ${order.id} — ${order.products?.title||'Digital Product'}`,
      payment_method:Deno.env.get('BAYARGG_PAYMENT_METHOD')||'qris_bayar_gg',
      payment_url:Deno.env.get('BAYARGG_PAYMENT_URL')||'https://www.bayar.gg/pay',
      callback_url:callbackUrl,
      redirect_url:redirectUrl
    };
    const providerResponse=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':key},body:JSON.stringify(payload)});
    const raw=await providerResponse.text();
    let body:any;try{body=JSON.parse(raw)}catch{body={raw}};
    if(!providerResponse.ok||body?.success===false)return json({error:'BayarGG payment error',details:body},502);
    const data=body?.data||body?.payment||body;
    const paymentUrl=data?.payment_url||body?.payment_url;
    const invoiceId=data?.invoice_id||body?.invoice_id;
    const qrisString=data?.qris_string||body?.qris_string||null;
    const finalAmount=Number(data?.final_amount||body?.final_amount||order.amount);
    if(!paymentUrl||!invoiceId)return json({error:'BayarGG did not return payment_url/invoice_id'},502);
    if(finalAmount!==Number(order.amount))return json({error:'Payment amount mismatch from provider'},502);

    const {error:updateError}=await admin.from('orders').update({payment_url:paymentUrl,payment_reference:invoiceId,payment_provider:provider}).eq('id',order.id);
    if(updateError)throw updateError;
    return json({order_id:order.id,payment_url:paymentUrl,reference:invoiceId,qris_string:qrisString,final_amount:finalAmount,expires_at:data?.expires_at||null,provider:'bayargg'});
  }catch(e){
    console.error(e);
    return json({error:e instanceof Error?e.message:'Unexpected error'},500);
  }
});
