window.Auth={
  lookup:async identifier=>{
    if(!sb) throw Error('Supabase belum dikonfigurasi');
    const v=identifier.trim();
    try{
      const {data,error}=await sb.rpc('resolve_username_login',{p_username:v});
      if(!error && Array.isArray(data) && data[0]?.auth_email) return data[0];
    }catch(_){}
    const {data,error}=await sb.from('profiles').select('id,username,auth_email,display_name').or(`username.ilike.${v},auth_email.ilike.${v}`).limit(1).maybeSingle();
    if(error) throw error;
    return data||null;
  },
  login:async(identifier,password)=>{
    if(!sb) throw Error('Supabase belum dikonfigurasi');
    const found=await Auth.lookup(identifier);
    if(!found?.auth_email) throw Error('Akun tidak ditemukan.');
    const {error}=await sb.auth.signInWithPassword({email:found.auth_email,password});
    if(error) throw error;
    location.replace('dashboard.html');
  },
  register:async(username,email,password)=>{
    if(!sb) throw Error('Supabase belum dikonfigurasi');
    const {data,error}=await sb.auth.signUp({email,password,options:{data:{username}}});
    if(error) throw error;
    if(data.user){await sb.from('profiles').upsert({id:data.user.id,username,auth_email:email,display_name:username},{onConflict:'id'}).throwOnError()}
    return data
  },
  google:async()=>{if(!sb)throw Error('Supabase belum dikonfigurasi');const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/auth-callback.html'}});if(error)throw error}
};
