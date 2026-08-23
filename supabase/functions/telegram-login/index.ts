import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return undefined; } })();
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const siteUrl = (Deno.env.get("TELECOD_SITE_URL") || "").replace(/\/$/,"");
const admin = createClient(supabaseUrl, secretKey!);
const MASTER_ADMIN_ID = String(Deno.env.get("ADMIN_TELEGRAM_ID") || "6665664367").replace(/\D/g,"");
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const response=(body:string,status=200,headers:Record<string,string>={})=>new Response(body,{status,headers:{...cors,...headers}});
const clean=(v:string)=>String(v||"").trim().replace(/^@+/g,"").toLowerCase();

async function verifyTelegram(data:Record<string,string>){
  const received=data.hash; if(!received||!botToken)return false;
  const checkString=Object.entries(data).filter(([k])=>k!=="hash"&&k!=="mode"&&k!=="redirect").sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
  const enc=new TextEncoder();
  const secret=await crypto.subtle.digest("SHA-256",enc.encode(botToken));
  const key=await crypto.subtle.importKey("raw",secret,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,enc.encode(checkString));
  const hex=[...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
  if(hex!==received)return false;
  const age=Math.floor(Date.now()/1000)-Number(data.auth_date||0);
  return age>=0&&age<=86400;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const u=new URL(req.url); const data=Object.fromEntries(u.searchParams.entries());
    const mode=String(data.mode||"login").toLowerCase();
    if(!(await verifyTelegram(data)))return response("Invalid Telegram authorization.",401);
    const tgId=String(data.id); const tgUsername=clean(data.username||"");
    const first=data.first_name||""; const last=data.last_name||""; const display=[first,last].filter(Boolean).join(" ")||tgUsername||`Telegram ${tgId}`;

    let profile=(await admin.from("profiles").select("*").eq("telegram_id",tgId).maybeSingle()).data;
    if(!profile && tgUsername){
      profile=(await admin.from("profiles").select("*").eq("telegram_username",tgUsername).maybeSingle()).data;
      if(profile){
        await admin.from("profiles").update({telegram_id:tgId}).eq("id",profile.id);
        profile.telegram_id=tgId;
      }
    }
    if(mode==="admin"){
      if(tgId!==MASTER_ADMIN_ID)return response("Telegram account is not the master administrator.",403);
      if(profile?.is_banned)return response("Administrator is blocked.",403);
    }

    let userId=profile?.id;
    if(!profile){
      if(mode==="login"||mode==="admin")return response("Akun TeleCod belum dibuat. Silakan Register dengan Telegram terlebih dahulu.",404);
      const baseUsername=tgUsername || `tg_${tgId}`;
      const taken=await admin.from("profiles").select("id").eq("username",baseUsername).maybeSingle();
      const username=taken.data ? `tg_${tgId}` : baseUsername;
      const email=`telegram_${tgId}@telecod.local`;
      const randomPassword=crypto.randomUUID()+"Aa9!";
      const created=await admin.auth.admin.createUser({email,password:randomPassword,email_confirm:true,user_metadata:{username,telegram_id:tgId,telegram_username:tgUsername,first_name:first,last_name:last,terms_accepted:true}});
      if(created.error)throw created.error;
      userId=created.data.user.id;
      await admin.from("profiles").upsert({id:userId,username,telegram_id:tgId,telegram_username:tgUsername||null,display_name:display,terms_accepted_at:new Date().toISOString(),last_login_at:new Date().toISOString(),is_admin:tgId===MASTER_ADMIN_ID},{onConflict:"id"});
    } else {
      if(profile.is_banned)return response("This Telegram account is blocked by an administrator.",403);
      await admin.from("profiles").update({telegram_username:tgUsername||profile.telegram_username,display_name:display,last_login_at:new Date().toISOString(),is_admin:tgId===MASTER_ADMIN_ID ? true : profile.is_admin}).eq("id",profile.id);
    }

    if(!siteUrl)return response("TELECOD_SITE_URL is not configured.",500);
    const user=await admin.auth.admin.getUserById(userId!); if(user.error)throw user.error;
    const link=await admin.auth.admin.generateLink({type:"magiclink",email:user.data.user.email!,options:{redirectTo: data.redirect || siteUrl}});
    if(link.error)throw link.error;
    return Response.redirect(link.data.properties.action_link,302);
  }catch(e){console.error(e);return response("Telegram authentication failed.",500,{"Content-Type":"text/plain"});}
});
