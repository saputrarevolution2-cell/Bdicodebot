window.Auth={
 lookup:async identifier=>{
  if(!sb) throw Error('Supabase belum dikonfigurasi. Buka setup.html.');
  const v=String(identifier||'').trim().toLowerCase();
  if(!v) return null;
  const {data,error}=await sb.rpc('resolve_username_login',{p_username:v});
  if(error) throw error;
  return Array.isArray(data)?(data[0]||null):data;
 },
 login:async(identifier,password)=>{
  if(!sb) throw Error('Supabase belum dikonfigurasi. Buka setup.html.');
  if(!password) throw Error('Kata sandi wajib diisi.');
  const found=await Auth.lookup(identifier);
  if(!found?.auth_email) throw Error('Akun tidak ditemukan.');
  const {data,error}=await sb.auth.signInWithPassword({email:found.auth_email,password});
  if(error) throw error;
  if(!data?.session) throw Error('Login belum membuat session. Periksa email confirmation di Supabase.');
  location.replace('dashboard.html');
 },
 register:async(username,email,password)=>{
  if(!sb) throw Error('Supabase belum dikonfigurasi. Buka setup.html.');
  const {data:available,error:ae}=await sb.rpc('username_available',{p_username:username});
  if(ae) throw ae;
  if(available===false) throw Error('Username sudah digunakan.');
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{username}}});
  if(error) throw error;
  if(data.user){
   const {error:pe}=await sb.from('profiles').upsert({id:data.user.id,username,auth_email:email,display_name:username},{onConflict:'id'});
   if(pe) throw pe;
  }
  return data;
 },
 google:async()=>{
  if(!sb)throw Error('Supabase belum dikonfigurasi. Buka setup.html.');
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/auth-callback.html'}});
  if(error)throw error;
 }
};