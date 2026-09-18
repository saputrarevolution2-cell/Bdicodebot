/* PasTele — shared data contract helpers */
(function(){
  'use strict';
  window.PasteleData = window.PasteleData || {};
  window.PasteleData.PAID_MIN = 2000;
  window.PasteleData.PAID_MAX = 100000;
  window.PasteleData.PLATFORM_FEE = 0.30;
  window.PasteleData.CREATOR_SHARE = 0.70;

  window.PasteleData.isValidPaidPrice = function(v){
    const n=Number(v);
    return Number.isFinite(n) && n>=2000 && n<=100000 && n%1000===0;
  };

  window.PasteleData.isPaid = function(item){
    return String(item?.access_type||'free').toLowerCase()==='paid' || Number(item?.price||0)>0;
  };

  window.PasteleData.normalizeType = function(t){
    t=String(t||'').toLowerCase().replace(/[\s_-]+/g,'');
    if(t.includes('pastelink')) return 'pastelink';
    if(t.includes('channel')) return 'channel';
    if(t.includes('group')) return 'group';
    if(t.includes('code') || t.includes('telegramproduct')) return 'code';
    return t||'product';
  };
})();
