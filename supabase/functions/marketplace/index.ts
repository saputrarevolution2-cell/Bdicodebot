import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url=Deno.env.get("SUPABASE_URL")!;
const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,service);

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization,content-type",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS"
};
const json=(x:any,s=200)=>new Response(JSON.stringify(x),{
  status:s,headers:{...cors,"content-type":"application/json"}
});

async function getUser(req:Request){
  const auth=req.headers.get("Authorization");
  if(!auth)return null;
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await client.auth.getUser();
  return user||null;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||"");
    const user=await getUser(req);

    if(action==="create_product"){
      const access=String(body.access_type||"free").toLowerCase();
      if(access==="paid"&&!user)return json({error:"Login/register diperlukan untuk menambahkan produk PAID."},401);

      const {data,error}=await db.rpc("marketplace_submit_product",{
        p_title:String(body.title||"").trim(),
        p_type:String(body.type||""),
        p_access_type:access,
        p_price:Number(body.price||0),
        p_description:String(body.description||"").trim()||null,
        p_content:body.type==="code"?String(body.content||""):null,
        p_bot_username:body.type==="code"?String(body.bot_username||""):null,
        p_telegram_channel:body.type==="channel"?String(body.telegram_channel||""):null,
        p_category:String(body.category||"").trim()||null,
        p_thumbnail_url:String(body.thumbnail_url||"").trim()||null
      });
      if(error)return json({error:error.message},400);
      return json({ok:true,...data},200);
    }

    if(action==="create_paid_order"){
      const {data:p,error}=await db.from("products")
        .select("id,creator_id,title,price,access_type,status,type,content,telegram_channel")
        .eq("id",body.product_id).single();
      if(error||!p||p.status!=="published"||p.access_type!=="paid")
        return json({error:"Product unavailable"},400);
      if(user&&p.creator_id===user.id)return json({error:"Cannot buy your own product"},400);

      let purchase:any=null;
      if(user){
        const {data:existing}=await db.from("purchases")
          .select("*").eq("product_id",p.id).eq("buyer_id",user.id).maybeSingle();
        if(existing?.status==="paid")return json({error:"Already purchased",purchase_id:existing.id},409);
        purchase=existing;
        if(!purchase){
          const r=await db.from("purchases").insert({
            product_id:p.id,buyer_id:user.id,amount:p.price,status:"pending"
          }).select().single();
          if(r.error)throw r.error;
          purchase=r.data;
        }
      }else{
        const guestToken=crypto.randomUUID()+"-"+crypto.randomUUID();
        const r=await db.from("purchases").insert({
          product_id:p.id,buyer_id:null,guest_token:guestToken,
          amount:p.price,status:"pending"
        }).select().single();
        if(r.error)throw r.error;
        purchase=r.data;
      }
      return json({
        ok:true,purchase_id:purchase.id,amount:p.price,
        guest_token:purchase.guest_token||null
      });
    }

    if(action==="guest_access"){
      const token=String(body.guest_token||"");
      if(!token)return json({error:"Guest token required"},400);
      const {data:purchase}=await db.from("purchases")
        .select("id,status,product_id,amount,products(id,title,type,content,telegram_channel,access_type)")
        .eq("guest_token",token).maybeSingle();
      if(!purchase)return json({error:"Purchase not found"},404);
      if(purchase.status!=="paid")return json({status:purchase.status,access:false},200);
      return json({
        ok:true,access:true,
        product_id:purchase.product_id,
        title:purchase.products?.title,
        type:purchase.products?.type,
        content:purchase.products?.content||null,
        telegram_channel:purchase.products?.telegram_channel||null
      });
    }

    if(action==="free_access"){
      const productId=String(body.product_id||"");
      const {data:p}=await db.from("products")
        .select("id,title,type,access_type,content,telegram_channel")
        .eq("id",productId).eq("status","published").single();
      if(!p)return json({error:"Product not found"},404);
      if(p.access_type!=="free")return json({error:"Product is paid"},400);
      return json({ok:true,access:true,title:p.title,type:p.type,
        content:p.content||null,telegram_channel:p.telegram_channel||null});
    }

    if(action==="guest_status"){
      const token=String(body.guest_token||"");
      const {data:purchase}=await db.from("purchases")
        .select("id,status,product_id").eq("guest_token",token).maybeSingle();
      if(!purchase)return json({error:"Purchase not found"},404);
      const {data:payment}=await db.from("payments")
        .select("status").eq("purchase_id",purchase.id)
        .order("created_at",{ascending:false}).limit(1).maybeSingle();
      return json({ok:true,purchase_status:purchase.status,payment_status:payment?.status||"pending"});
    }

    return json({error:"Unknown action"},400);
  }catch(e){
    console.error(e);
    return json({error:e instanceof Error?e.message:"Server error"},500);
  }
});