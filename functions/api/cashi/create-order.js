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

export async function onRequestOptions() { return new Response(null,{status:204,headers:cors}); }
export async function onRequestPost(context) {
  const { request, env } = context;
  const body=await readJson(request);
  const orderId=String(body.order_id||"").trim();
  const guestToken=String(body.guest_token||"").trim();
  if(!orderId) return json({success:false,error:"ORDER_ID_REQUIRED"},400);
  if(!env.CASHI_API_KEY) return json({success:false,error:"CASHI_API_KEY belum dikonfigurasi di server."},500);
  try {
    const order=await supabaseRpc(env,"get_order_for_payment",{p_order_id:orderId,p_guest_token:guestToken||null},authHeader(request));
    const existing=String(order?.payment_reference||"").trim();
    if(["paid","success","completed","settled"].includes(String(order?.status||"").toLowerCase())) {
      return json({success:true,status:"SETTLED",order_id:orderId,amount:Number(order.amount||0),already_paid:true});
    }
    if(existing) {
      const check=await fetch(`${env.CASHI_API_URL||"https://cashi.id/api"}/check-status/${encodeURIComponent(existing)}`,{headers:{"x-api-key":env.CASHI_API_KEY}});
      const cd=await check.json().catch(()=>({}));
      if(check.ok && cd?.success && String(cd.status||"").toUpperCase()==="SETTLED") {
        await supabaseRpc(env,"settle_cashi_order",{p_order_id:orderId,p_invoice_id:existing,p_gateway_status:"SETTLED",p_final_amount:Number(order.amount||0),p_gateway_payload:cd},"",true);
        return json({success:true,status:"SETTLED",order_id:orderId,amount:Number(order.amount||0),orderId:existing,raw:cd});
      }
      const saved = order?.gateway_payload?.create_order || {};
      return json({success:true,status:String(cd?.status||"PENDING").toUpperCase(),order_id:orderId,amount:Number(order.amount||0),orderId:existing,checkout_url:cd?.checkout_url||saved?.checkout_url||null,qrUrl:cd?.qrUrl||saved?.qrUrl||null,raw:cd});
    }
    const amount=Number(order.amount||0);
    if(!Number.isFinite(amount) || amount<2000 || amount>10000000) return json({success:false,error:"INVALID_AMOUNT"},400);
    const cashi=await fetch(`${env.CASHI_API_URL||"https://cashi.id/api"}/create-order`,{
      method:"POST",headers:{"x-api-key":env.CASHI_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({amount,order_id:`PASTELE-${orderId}`,kode_channel:env.CASHI_CHANNEL||"QRIS_CUSTOM"})
    });
    const data=await cashi.json().catch(()=>({}));
    if(!cashi.ok || data?.success===false) return json({success:false,error:data?.message||data?.error||`Cashi HTTP ${cashi.status}`,raw:data},502);
    const providerOrderId=String(data.orderId||data.order_id||`PASTELE-${orderId}`).trim();
    await supabasePatch(env,"orders",{id:orderId},{payment_reference:providerOrderId,gateway_payload:{provider:"CASHI",create_order:data}});
    return json({success:true,order_id:orderId,orderId:providerOrderId,amount,checkout_url:data.checkout_url||null,qrUrl:data.qrUrl||null,status:"PENDING",provider:"CASHI",fee:data.fee??null,expires_at:data.expires_at??null});
  } catch(e) { return json({success:false,error:String(e?.message||e)},400); }
}
