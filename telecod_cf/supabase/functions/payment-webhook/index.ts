// DompetX payment status is verified server-to-server by payment-status.
// Configure a DompetX webhook to call this endpoint only if your merchant
// dashboard provides a webhook signature contract. Until then, payment-status
// polls DompetX's authenticated check-status endpoint and is the source of truth.
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS"}});
 return new Response(JSON.stringify({ok:true,provider:"dompetx",message:"Use payment-status for verified status polling."}),{status:200,headers:{"content-type":"application/json","Access-Control-Allow-Origin":"*"}});
});
