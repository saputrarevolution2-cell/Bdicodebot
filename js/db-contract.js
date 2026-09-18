/* PasTele DB contract — compatibility-safe RPC wrapper */
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
  function attachCompat(value){
    if(value!==null && typeof value==="object"){
      try{
        if(!Object.prototype.hasOwnProperty.call(value,"data")){
          Object.defineProperty(value,"data",{value,enumerable:false,configurable:true});
        }
        if(!Object.prototype.hasOwnProperty.call(value,"error")){
          Object.defineProperty(value,"error",{value:null,enumerable:false,configurable:true});
        }
      }catch(_){}
    }
    return value;
  }
  async function rpc(name,args={}){
    const sb=client();
    if(!sb) throw new Error("Supabase client belum siap.");
    const {data,error}=await sb.rpc(name,args);
    if(error) throw dbError(error);
    return attachCompat(unwrap(data));
  }
  async function query(table,builder){
    const sb=client();
    if(!sb) throw new Error("Supabase client belum siap.");
    return builder(sb.from(table));
  }
  window.PasTeleDB={client,rpc,query,unwrap,dbError};
})();