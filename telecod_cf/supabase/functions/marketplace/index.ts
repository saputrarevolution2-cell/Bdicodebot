import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!;
const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(url,service);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,content-type"};
const json=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"content-type":"application/json"}});
Deno.serve(async req=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization"); if(!auth) return json({error:"Unauthorized"},401);
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:ue}=await client.auth.getUser(); if(ue||!user)return json({error:"Unauthorized"},401);
  const body=await req.json();
  if(body.action==="create_paid_order"){
    const {data:p,error}=await admin.from("products").select("id,creator_id,title,price,access_type,status").eq("id",body.product_id).single();
    if(error||!p||p.status!=="published"||p.access_type!=="paid") return json({error:"Product unavailable"},400);
    if(p.creator_id===user.id)return json({error:"Cannot buy your own product"},400);
    const {data:existing}=await admin.from("purchases").select("id,status").eq("product_id",p.id).eq("buyer_id",user.id).maybeSingle();
    if(existing?.status==="paid")return json({error:"Already purchased",purchase_id:existing.id},409);
    const {data:purchase,error:pe}=await admin.from("purchases").upsert({product_id:p.id,buyer_id:user.id,amount:p.price,status:"pending"}, {onConflict:"product_id,buyer_id"}).select().single();
    if(pe)throw pe;
    const {data:payment,error:pay}=await admin.from("payments").insert({user_id:user.id,purchase_id:purchase.id,amount:p.price,currency:"IDR",status:"pending"}).select().single();
    if(pay)throw pay;
    await admin.from("purchases").update({payment_id:payment.id}).eq("id",purchase.id);
    return json({ok:true,purchase_id:purchase.id,payment_id:payment.id,amount:p.price});
  }
  return json({error:"Unknown action"},400);
 }catch(e){console.error(e);return json({error:"Server error"},500)}
});
