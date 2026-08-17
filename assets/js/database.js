const SUPABASE_URL='https://qrhbgffmqorzbcfvnbkk.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJxcmhiZ2ZmbXFvcnpiY2Z2bmJrayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2OTUxMzkyLCJleHAiOjIxMDI1MjczOTJ9.W9tWYiPmYOC9wsruJMypH_Kg0dQpw_klCbACS6PYp48';
window.telecodSupabase=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage}});
async function tcSession(){const {data}=await window.telecodSupabase.auth.getSession();return data.session||null}
async function tcUser(){const {data}=await window.telecodSupabase.auth.getUser();return data.user||null}
