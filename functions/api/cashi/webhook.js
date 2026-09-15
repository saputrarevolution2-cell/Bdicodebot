const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

function supabaseHeaders(env, authorization = "") {
  const h = {
    apikey: env.SUPABASE_ANON_KEY || "",
    "Content-Type": "application/json",
  };
  if (authorization) h.Authorization = authorization;
  return h;
}

async function supabaseRpc(env, name, body, authorization = "", service = false) {
  const key = service ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY;
  if (!key || !env.SUPABASE_URL) throw new Error("Supabase backend environment belum dikonfigurasi.");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (!service && authorization) headers.Authorization = authorization;
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST", headers, body: JSON.stringify(body)
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(data?.message || data?.hint || data?.error || `Supabase RPC HTTP ${r.status}`);
  return data;
}

async function supabasePatch(env, table, filter, patch) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !env.SUPABASE_URL) throw new Error("Supabase service role belum dikonfigurasi.");
  const qs = Object.entries(filter).map(([k,v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`).join("&");
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}?${qs}`, {
    method: "PATCH",
    headers: { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", Prefer:"return=minimal" },
    body: JSON.stringify(patch)
  });
  if (!r.ok) { const t=await r.text(); throw new Error(`Supabase update gagal: ${t}`); }
}

async function supabaseSelectOrder(env, orderId) {
  const key=env.SUPABASE_SERVICE_ROLE_KEY;
  const r=await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*`, {
    headers:{apikey:key,Authorization:`Bearer ${key}`}
  });
  const d=await r.json();
  if(!r.ok || !Array.isArray(d) || !d[0]) throw new Error("ORDER_NOT_FOUND");
  return d[0];
}

function authHeader(request) { return request.headers.get("Authorization") || ""; }

function timingSafeEqualHex(a,b){
  a=String(a||"").toLowerCase(); b=String(b||"").toLowerCase();
  if(a.length!==b.length) return false; let x=0; for(let i=0;i<a.length;i++) x|=a.charCodeAt(i)^b.charCodeAt(i); return x===0;
}
async function hmacHex(secret, raw){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
export async function onRequestOptions(){return new Response(null,{status:204,headers:cors});}
export async function onRequestPost(context){
 const {request,env}=context;
 if(!env.CASHI_SECRET_KEY) return json({success:false,error:"CASHI_SECRET_KEY belum dikonfigurasi di server."},500);
 const signature=request.headers.get("x-gateway-signature"); if(!signature) return json({success:false,error:"Missing signature"},401);
 const raw=await request.text(); const expected=await hmacHex(env.CASHI_SECRET_KEY,raw); if(!timingSafeEqualHex(signature,expected)) return json({success:false,error:"Invalid signature"},401);
 let payload; try{payload=JSON.parse(raw)}catch{return json({success:false,error:"Invalid JSON"},400)}
 const event=String(payload?.event||"").toUpperCase(); const data=payload?.data||{}; if(event!=="PAYMENT_SETTLED" || String(data?.status||"").toUpperCase()!=="SETTLED") return json({success:true,ignored:true});
 const providerId=String(data?.order_id||data?.orderId||"").trim(); if(!providerId) return json({success:false,error:"ORDER_ID_REQUIRED"},400);
 try{
   const order=await supabaseSelectOrder(env,providerId).catch(()=>null);
   // Cashi order_id is PASTELE-<Supabase UUID>; resolve through payment_reference instead.
   let oid=order?.id;
   if(!oid){
     const key=env.SUPABASE_SERVICE_ROLE_KEY; const r=await fetch(`${env.SUPABASE_URL.replace(/\/$/,"")}/rest/v1/orders?payment_reference=eq.${encodeURIComponent(providerId)}&select=id,amount&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}}); const rows=await r.json(); oid=rows?.[0]?.id; }
   if(!oid) return json({success:false,error:"ORDER_NOT_FOUND"},404);
   const rows=await fetch(`${env.SUPABASE_URL.replace(/\/$/,"")}/rest/v1/orders?id=eq.${encodeURIComponent(oid)}&select=amount`,{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`}}).then(r=>r.json());
   const amount=Number(rows?.[0]?.amount||0);
   await supabaseRpc(env,"settle_cashi_order",{p_order_id:oid,p_invoice_id:providerId,p_gateway_status:"SETTLED",p_final_amount:amount,p_gateway_payload:payload},"",true);
   return json({success:true,processed:true,order_id:oid});
 }catch(e){return json({success:false,error:String(e?.message||e)},500)}
}
