import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  (() => {
    try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; }
    catch { return undefined; }
  })();
const admin = createClient(url, serviceKey!);
const emailFor = (username: string) => `${username.toLowerCase()}@telecod.local`;
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: cors });
const clean = (v:string) => String(v||"").trim().replace(/^@+/g,"").toLowerCase();
const valid = (v:string) => /^[a-z0-9_]{3,32}$/.test(v);

async function lookup(username:string){
  const u=clean(username);
  if(!valid(u)) return null;
  const a=await admin.from("profiles").select("id,username,telegram_username,telegram_id,is_banned").eq("username",u).maybeSingle();
  if(a.data)return a.data;
  const b=await admin.from("profiles").select("id,username,telegram_username,telegram_id,is_banned").eq("telegram_username",u).maybeSingle();
  return b.data||null;
}

Deno.serve(async req => {
  if(req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if(req.method !== "POST") return json({error:"Method not allowed"},405);

  try {
    const body=await req.json();
    const action=String(body.action||"").toLowerCase();
    const username=clean(body.username);
    const telegramUsername=clean(body.telegram_username || body.tg_username || "");
    const password=String(body.password||"");

    if(action === "check"){
      if(!valid(username)) return json({exists:false,valid:false,available:false,match:null});
      const profile=await lookup(username);
      return json({
        exists:!!profile,
        valid:true,
        available:!profile,
        match: profile ? (profile.username===username ? "username" : "telegram_username") : null,
        username:profile?.username||null,
        telegram_username:profile?.telegram_username||null,
        is_banned:!!profile?.is_banned
      });
    }

    if(!valid(username)) return json({error:"Username harus 3-32 karakter: huruf kecil, angka, atau _."},400);
    if(action !== "register" && password.length < 6) return json({error:"Kata sandi minimal 6 karakter."},400);

    if(action === "register"){
      if(!valid(telegramUsername)) return json({error:"Username Telegram harus 3-32 karakter."},400);
      if(password.length < 6) return json({error:"Kata sandi minimal 6 karakter."},400);
      if(!body.terms_accepted) return json({error:"Ketentuan & Kebijakan wajib disetujui."},400);

      const [uTaken,tgTaken]=await Promise.all([
        admin.from("profiles").select("id").eq("username",username).maybeSingle(),
        admin.from("profiles").select("id").eq("telegram_username",telegramUsername).maybeSingle()
      ]);
      if(uTaken.data) return json({error:"Username sudah digunakan."},409);
      if(tgTaken.data) return json({error:"Username Telegram sudah digunakan."},409);

      const created=await admin.auth.admin.createUser({
        email:emailFor(username), password, email_confirm:true,
        user_metadata:{username,telegram_username:telegramUsername,telegram_number:String(body.telegram_number||"").trim(),terms_accepted:true}
      });
      if(created.error) return json({error:created.error.message},400);

      const profile=await admin.from("profiles").upsert({
        id:created.data.user.id,username,telegram_username:telegramUsername,
        telegram_number:String(body.telegram_number||"").trim()||null,
        terms_accepted_at:new Date().toISOString(),last_login_at:new Date().toISOString()
      },{onConflict:"id"}).select().single();
      if(profile.error) return json({error:profile.error.message},500);

      const signed=await admin.auth.signInWithPassword({email:emailFor(username),password});
      if(signed.error || !signed.data.session) return json({ok:true,session_required:true,email:emailFor(username),user_id:created.data.user.id});
      return json({ok:true,access_token:signed.data.session.access_token,refresh_token:signed.data.session.refresh_token,user:signed.data.user});
    }

    if(action === "login"){
      const profile=await lookup(username);
      if(!profile) return json({error:"Username / username Telegram belum dibuat.",code:"ACCOUNT_NOT_FOUND"},404);
      if(profile.is_banned) return json({error:"Akun kamu diblokir admin.",code:"BANNED"},403);

      const loginUsername=profile.username || username;
      const signed=await admin.auth.signInWithPassword({email:emailFor(loginUsername),password});
      if(signed.error || !signed.data.session) return json({error:"Kata sandi salah.",code:"INVALID_PASSWORD"},401);

      await admin.from("profiles").update({last_login_at:new Date().toISOString()}).eq("id",profile.id);
      return json({ok:true,access_token:signed.data.session.access_token,refresh_token:signed.data.session.refresh_token,user:signed.data.user,profile});
    }

    return json({error:"Unknown action"},400);
  } catch(e){
    console.error(e);
    return json({error:e instanceof Error ? e.message : "Internal server error"},500);
  }
});
