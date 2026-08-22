import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKey =
  Deno.env.get("SERVICE_ROLE_KEY") ||
  (() => {
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      return keys.default;
    } catch {
      return undefined;
    }
  })();

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const siteUrl = (Deno.env.get("TELECOD_SITE_URL") || "").replace(/\/$/, "");
const admin = createClient(supabaseUrl, secretKey!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function response(body: string, status=200, headers: Record<string,string>={}) {
  return new Response(body,{status,headers:{...cors,...headers}});
}

async function verifyTelegram(data: Record<string,string>) {
  const received = data.hash;
  if (!received) return false;

  const checkString = Object.entries(data)
    .filter(([k]) => k !== "hash")
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${v}`)
    .join("\n");

  const enc = new TextEncoder();
  const secret = await crypto.subtle.digest("SHA-256", enc.encode(botToken));
  const key = await crypto.subtle.importKey(
    "raw", secret, {name:"HMAC",hash:"SHA-256"}, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(checkString));
  const hex = [...new Uint8Array(signature)]
    .map(x=>x.toString(16).padStart(2,"0")).join("");

  if (hex !== received) return false;

  const authDate = Number(data.auth_date || 0);
  if (!authDate) return false;

  // Telegram recommends checking auth_date to reject stale authorization data.
  if (Math.floor(Date.now()/1000) - authDate > 86400) return false;

  return true;
}

const telegramEmail=(id:string)=>`telegram_${id}@telecod.local`;

async function findProfile(telegramId:string){
  const byId = await admin.from("profiles").select("*")
    .eq("telegram_id",telegramId).maybeSingle();
  return byId.data || null;
}

async function getUserById(id:string){
  const {data,error}=await admin.auth.admin.getUserById(id);
  if(error) throw error;
  return data.user;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});

  try{
    const url=new URL(req.url);
    const data=Object.fromEntries(url.searchParams.entries());
    const mode=(url.searchParams.get("mode") || "login").toLowerCase();

    if(!(await verifyTelegram(data))) return response("Invalid Telegram authorization.",401);

    const telegramId=String(data.id);
    const username=(data.username||"").replace(/^@+/,"").toLowerCase();
    const firstName=data.first_name||"";
    const lastName=data.last_name||"";
    const displayName=[firstName,lastName].filter(Boolean).join(" ") || username || `Telegram ${telegramId}`;

    let profile=await findProfile(telegramId);
    let user=null;

    if(profile?.id){
      if(profile.is_banned) return response("This Telegram account is blocked by an administrator.",403);
      user=await getUserById(profile.id);
    } else {
      const email=telegramEmail(telegramId);
      const randomPassword=crypto.randomUUID()+"Aa9!";
      const {data:usernameTaken}=username
        ? await admin.from("profiles").select("id,telegram_id").eq("username",username).maybeSingle()
        : {data:null};
      if(usernameTaken?.id) return response("Username Telegram sudah digunakan. Login dengan username/password atau gunakan username Telegram lain.",409);

      const created=await admin.auth.admin.createUser({
        email,
        password:randomPassword,
        email_confirm:true,
        user_metadata:{
          username:username || `tg_${telegramId}`,
          telegram_id:telegramId,
          telegram_username:username,
          first_name:firstName,
          last_name:lastName,
          terms_accepted:true,
        }
      });
      if(created.error) throw created.error;
      user=created.data.user;
    }

    if(!user?.email) return response("Telegram account is not linked to a TeleCod user.",400);

    const now=new Date().toISOString();
    await admin.from("profiles").upsert({
      id:user.id,
      username:profile?.username || username || `tg_${telegramId}`,
      telegram_id:telegramId,
      telegram_username:username || profile?.telegram_username || null,
      display_name:displayName,
      terms_accepted_at:now,
      last_login_at:now
    },{onConflict:"id"});

    if(mode==="recovery"){
      if(!siteUrl) return response("TELECOD_SITE_URL is not configured.",500);

      const link=await admin.auth.admin.generateLink({
        type:"recovery",
        email:user.email,
        options:{redirectTo:`${siteUrl}/reset.html`}
      });
      if(link.error) throw link.error;

      return Response.redirect(link.data.properties.action_link,302);
    }

    if(!siteUrl) return response("TELECOD_SITE_URL is not configured.",500);

    const link=await admin.auth.admin.generateLink({
      type:"magiclink",
      email:user.email,
      options:{redirectTo:siteUrl}
    });
    if(link.error) throw link.error;

    return Response.redirect(link.data.properties.action_link,302);
  }catch(error){
    console.error(error);
    return response("Telegram authentication failed.",500,{"Content-Type":"text/plain"});
  }
});
