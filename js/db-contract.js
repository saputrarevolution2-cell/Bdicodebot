/* PasTele DB contract — generated from the project SQL master.
   Keep browser credentials limited to Supabase anon/publishable key.
   All privileged mutations must remain RPC/security-definer operations. */
(()=>{"use strict";
  const client=()=>window.sb||window.supabaseClient||window.PasTeleSession?.client?.();
  const unwrap=(data)=>{
    if(Array.isArray(data)) return data.length===1 ? data[0] : data;
    return data;
  };
  const dbError=(error)=>{
    if(!error) return null;
    return new Error(error.message||error.details||error.hint||"Database request failed");
  };
  async function rpc(name,args={}){
    const sb=client();
    if(!sb) throw new Error("Supabase client belum siap.");
    const {data,error}=await sb.rpc(name,args);
    if(error) throw dbError(error);
    return unwrap(data);
  }
  async function query(table, builder){
    const sb=client();
    if(!sb) throw new Error("Supabase client belum siap.");
    return builder(sb.from(table));
  }
  window.PasTeleDB={client,rpc,query,unwrap,dbError};
})();