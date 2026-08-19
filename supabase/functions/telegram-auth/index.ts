import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

function response(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,headers:{"Content-Type":"application/json",...cors}
  });
}

async function sha256Hex(input:string){
  const data=new TextEncoder().encode(input);
  const hash=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

async function hmacSha256(key:string,data:string){
  const cryptoKey=await crypto.subtle.importKey(
    "raw",new TextEncoder().encode(key),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]
  );
  const sig=await crypto.subtle.sign("HMAC",cryptoKey,new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

function safeUsername(value:string,id:number){
  const u=(value||`telegram_${id}`).replace(/^@/,"").replace(/[^a-zA-Z0-9_]/g,"").toLowerCase();
  return (u.length>=3?u:`telegram_${id}`).slice(0,32);
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return response({error:"Method not allowed"},405);

  try{
    const botToken=Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!botToken||!supabaseUrl||!serviceKey)
      return response({error:"Telegram auth environment is not configured."},500);

    const body=await req.json();
    const tg=body?.telegram;
    if(!tg?.id||!tg?.auth_date||!tg?.hash)
      return response({error:"Invalid Telegram login payload."},400);

    // Telegram Login Widget payloads must be recent.
    if(Math.abs(Math.floor(Date.now()/1000)-Number(tg.auth_date))>86400)
      return response({error:"Telegram login expired. Please try again."},401);

    const checkData=Object.keys(tg)
      .filter(k=>k!=="hash"&&tg[k]!==undefined&&tg[k]!==null)
      .sort()
      .map(k=>`${k}=${tg[k]}`)
      .join("\n");

    const secret=await sha256Hex(botToken);
    const expected=await hmacSha256(secret,checkData);
    if(expected!==String(tg.hash))
      return response({error:"Telegram signature verification failed."},401);

    const admin=createClient(supabaseUrl,serviceKey,{
      auth:{autoRefreshToken:false,persistSession:false}
    });

    const telegramId=Number(tg.id);
    let username=safeUsername(String(tg.username||""),telegramId);
    const email=`tg_${telegramId}@telegram.telecod.local`;
    let userId:string|null=null;

    const existingProfile=await admin.from("profiles").select("id,username").eq("telegram_id",telegramId).maybeSingle();
    if(existingProfile.data?.username) username=existingProfile.data.username;

    // Find an existing Auth user by the synthetic Telegram email.
    for(let page=1;page<=20;page++){
      const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});
      if(error)throw error;
      const found=data.users.find(u=>u.email===email);
      if(found){userId=found.id;break;}
      if(data.users.length<1000)break;
    }

    if(!userId){
      const conflict=await admin.from("profiles").select("id").eq("username",username).maybeSingle();
      if(conflict.data && conflict.data.id!==userId) username=`${username.slice(0,23)}_${telegramId}`.slice(0,32);
      const created=await admin.auth.admin.createUser({
        email,
        email_confirm:true,
        user_metadata:{
          display_name:[tg.first_name,tg.last_name].filter(Boolean).join(" ")||username,
          username,
          telegram_id:String(telegramId),
          telegram_username:tg.username||username
        }
      });
      if(created.error)throw created.error;
      userId=created.data.user.id;
    }

    // Keep Telegram identity synchronized in the public profile.
    const {error:profileError}=await admin.from("profiles").upsert({
      id:userId,
      username,
      display_name:[tg.first_name,tg.last_name].filter(Boolean).join(" ")||username,
      auth_email:email,
      telegram_id:telegramId,
      telegram_username:tg.username||username,
      updated_at:new Date().toISOString()
    },{onConflict:"id"});
    if(profileError)throw profileError;

    // Create a one-time Supabase magic-link token. The browser exchanges it
    // with verifyOtp(), producing a normal Supabase session.
    const generated=await admin.auth.admin.generateLink({type:"magiclink",email});
    if(generated.error)throw generated.error;
    const hashedToken=(generated.data as any)?.properties?.hashed_token;
    if(!hashedToken)throw new Error("Supabase did not return a magic-link token.");

    return response({
      success:true,
      user_id:userId,
      telegram_username:tg.username||username,
      hashed_token:hashedToken
    });
  }catch(error){
    console.error("TELEGRAM AUTH ERROR",error);
    return response({error:error instanceof Error?error.message:"Telegram authentication failed."},500);
  }
});