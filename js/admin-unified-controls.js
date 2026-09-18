/* PasTele — Admin unified controls contract.
   Existing admin page handlers can call these helpers; no legacy RPC is
   overwritten here. */
(function(){
  'use strict';
  window.PasteleAdmin = {
    async setPlatformSocialLink(supabase, platform, url){
      if(!supabase) throw new Error('Supabase client missing');
      return supabase.from('platform_social_links').upsert({
        platform:String(platform).trim(),
        url:String(url).trim(),
        is_active:true,
        updated_at:new Date().toISOString()
      },{onConflict:'platform'});
    },
    async setUserSocialLink(supabase, userId, platform, url){
      if(!supabase) throw new Error('Supabase client missing');
      return supabase.from('user_social_links').upsert({
        user_id:userId,
        platform:String(platform).trim(),
        url:String(url).trim(),
        is_active:true,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id,platform'});
    }
  };
})();
