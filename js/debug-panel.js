/* PasTele — Universal Bug / Database Debug Panel */
(() => {
  'use strict';
  const state = window.__PASTELE_DEBUG_STATE ||= {
    errors: [], warnings: [], logs: [], network: [], started: new Date().toISOString()
  };
  const redact = value => {
    try {
      let s = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      return String(s)
        .replace(/(apikey|authorization|access_token|refresh_token|password|token)\s*[:=]\s*["']?[^"',\s}]+/gi, '$1: [REDACTED]');
    } catch { return String(value); }
  };
  let rendering = false;
  const push = (bucket, msg) => {
    state[bucket].push({time:new Date().toLocaleTimeString(), msg:redact(msg)});
    if (state[bucket].length > 200) state[bucket].shift();
    render();
  };
  const old = {error:console.error.bind(console), warn:console.warn.bind(console), log:console.log.bind(console)};
  console.error = (...a) => { old.error(...a); push('errors', a.map(redact).join(' ')); };
  console.warn = (...a) => { old.warn(...a); push('warnings', a.map(redact).join(' ')); };
  console.log = (...a) => { old.log(...a); push('logs', a.map(redact).join(' ')); };

  window.addEventListener('error', e => {
    const target = e.target;
    if (target && target !== window) push('errors', `Resource error: ${target.tagName || 'resource'} ${target.src || target.href || ''}`);
    else push('errors', `${e.message || 'JavaScript error'} @ ${e.filename || location.pathname}:${e.lineno || ''}:${e.colno || ''}`);
  }, true);
  window.addEventListener('unhandledrejection', e => push('errors', `Unhandled Promise: ${redact(e.reason)}`));

  if (!window.__PASTELE_FETCH_PATCHED) {
    window.__PASTELE_FETCH_PATCHED = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const started = performance.now();
      try {
        const response = await nativeFetch(...args);
        if (!response.ok) {
          let body = '';
          try { body = await response.clone().text(); } catch {}
          push('network', `${response.status} ${response.statusText} ${String(args[0])}\n${body.slice(0,3000)}`);
        }
        return response;
      } catch (e) {
        push('network', `NETWORK FAILED ${String(args[0])}\n${e?.message || e}`);
        throw e;
      } finally {
        const ms = Math.round(performance.now() - started);
        if (ms > 5000) push('warnings', `Slow request ${ms}ms: ${String(args[0])}`);
      }
    };
  }

  const style = document.createElement('style');
  style.textContent = `
  #ptBugRoot{position:fixed;right:12px;bottom:12px;z-index:2147483647;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
  #ptBugBtn{border:1px solid #00eaff;border-radius:999px;padding:10px 14px;background:#07111d;color:#fff;box-shadow:0 8px 30px #0007;cursor:pointer;font-weight:800}
  #ptBugPanel{display:none;width:min(560px,calc(100vw - 20px));max-height:82vh;overflow:auto;margin-bottom:9px;background:#08111c;color:#e7f7ff;border:1px solid #17405a;border-radius:16px;box-shadow:0 25px 80px #000b}
  #ptBugPanel.open{display:block} #ptBugHead{position:sticky;top:0;background:#0b1826ee;backdrop-filter:blur(12px);padding:11px 13px;border-bottom:1px solid #17405a;display:flex;justify-content:space-between;gap:8px;align-items:center}
  #ptBugHead b{color:#00eaff}.ptBugActions{display:flex;gap:5px;flex-wrap:wrap}.ptBugActions button{border:1px solid #24516a;background:#102333;color:#dff8ff;border-radius:8px;padding:6px 9px;cursor:pointer}
  #ptBugBody{padding:12px}.ptBugGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.ptBugCard{border:1px solid #17384c;border-radius:10px;padding:9px;background:#0b1723}.ptBugLabel{font-size:10px;color:#78a2b8;text-transform:uppercase}.ptBugValue{font-weight:800;margin-top:2px;word-break:break-word}.ok{color:#43ffad}.bad{color:#ff667a}
  .ptBugSec{margin-top:11px}.ptBugSec h4{margin:0 0 5px;font-size:11px;color:#78a2b8;text-transform:uppercase}.ptBugLog{white-space:pre-wrap;word-break:break-word;max-height:190px;overflow:auto;padding:9px;border-radius:9px;background:#03080d;color:#ccecf8;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
  @media(max-width:560px){#ptBugRoot{right:8px;bottom:8px}#ptBugPanel{max-height:78vh}.ptBugGrid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  async function diagnostics(){
    let auth='N/A', authErr='';
    if(window.sb){
      try{const r=await sb.auth.getSession();auth=r.data?.session?'SIGNED IN':'NO SESSION';authErr=r.error?.message||''}catch(e){auth='ERROR';authErr=e?.message||String(e)}
    }
    let db={client:!!window.sb,auth:false,profiles:false,marketplace:false,errors:[]};
    if(window.sb && window.TC?.dbTest){try{db=await TC.dbTest()}catch(e){db.errors=[e?.message||String(e)]}}
    return {auth,authErr,db};
  }
  async function render(){
    const body=document.getElementById('ptBugBody'); if(!body || rendering)return;
    rendering = true;
    const d=await diagnostics();
    const cfg=window.TC_CONFIG||window.PASTELE_CONFIG||{};
    const rt=window.__PASTELE_RUNTIME__||{};
    const dbOk=d.db.client&&d.db.auth&&d.db.profiles&&d.db.marketplace;
    body.innerHTML=`<div class="ptBugGrid">
      <div class="ptBugCard"><div class="ptBugLabel">Page</div><div class="ptBugValue">${esc(location.pathname)}</div></div>
      <div class="ptBugCard"><div class="ptBugLabel">Supabase Client</div><div class="ptBugValue ${window.sb?'ok':'bad'}">${window.sb?'READY':'NOT READY'}</div></div>
      <div class="ptBugCard"><div class="ptBugLabel">Database Test</div><div class="ptBugValue ${dbOk?'ok':'bad'}">${dbOk?'PASS':'FAIL'}</div></div>
      <div class="ptBugCard"><div class="ptBugLabel">Auth</div><div class="ptBugValue ${d.auth==='SIGNED IN'?'ok':''}">${esc(d.auth)}</div></div>
      <div class="ptBugCard"><div class="ptBugLabel">JS Bugs</div><div class="ptBugValue ${state.errors.length?'bad':'ok'}">${state.errors.length}</div></div>
      <div class="ptBugCard"><div class="ptBugLabel">Network Bugs</div><div class="ptBugValue ${state.network.length?'bad':'ok'}">${state.network.length}</div></div>
    </div>
    <div class="ptBugSec"><h4>Database</h4><div class="ptBugLog">${esc(JSON.stringify(d.db,null,2))}${d.authErr?'\nAuth error: '+esc(d.authErr):''}</div></div>
    <div class="ptBugSec"><h4>Config / Runtime</h4><div class="ptBugLog">URL: ${esc(cfg.SUPABASE_URL||'Missing URL')}\nKey: ${cfg.SUPABASE_ANON_KEY?'Present':'Missing'}\nconfig.js loaded: ${rt.configLoaded?'YES':'NO'}\nSupabase library: ${rt.supabaseLibraryLoaded?'YES':'NO'}\nURL valid: ${rt.validUrl?'YES':'NO'}\nKey valid: ${rt.validKey?'YES':'NO'}\nClient ready: ${rt.clientReady?'YES':'NO'}${rt.clientError?'\nClient error: '+esc(rt.clientError):''}</div></div>
    <div class="ptBugSec"><h4>Errors</h4><div class="ptBugLog">${state.errors.length?state.errors.map(x=>`[${esc(x.time)}] ${esc(x.msg)}`).join('\n'):'No errors captured.'}</div></div>
    <div class="ptBugSec"><h4>Network / Supabase HTTP</h4><div class="ptBugLog">${state.network.length?state.network.map(x=>`[${esc(x.time)}] ${esc(x.msg)}`).join('\n'):'No failed HTTP requests captured.'}</div></div>
    <div class="ptBugSec"><h4>Warnings</h4><div class="ptBugLog">${state.warnings.length?state.warnings.map(x=>`[${esc(x.time)}] ${esc(x.msg)}`).join('\n'):'No warnings.'}</div></div>
    <div class="ptBugSec"><h4>Console</h4><div class="ptBugLog">${state.logs.length?state.logs.map(x=>`[${esc(x.time)}] ${esc(x.msg)}`).join('\n'):'No console logs.'}</div></div>`;
  }
  function mount(){
    if(document.getElementById('ptBugRoot'))return;
    const root=document.createElement('div');root.id='ptBugRoot';
    root.innerHTML=`<div id="ptBugPanel"><div id="ptBugHead"><b>🐞 PasTele Bug Panel</b><div class="ptBugActions"><button id="ptBugTest">Test DB</button><button id="ptBugClear">Clear</button><button id="ptBugCopy">Copy</button><button id="ptBugClose">×</button></div></div><div id="ptBugBody"></div></div><button id="ptBugBtn" type="button">🐞 BUG</button>`;
    document.body.appendChild(root);
    ptBugBtn.onclick=()=>{ptBugPanel.classList.toggle('open');render()};
    ptBugClose.onclick=()=>ptBugPanel.classList.remove('open');
    ptBugClear.onclick=()=>{state.errors.length=state.network.length=state.warnings.length=state.logs.length=0;render()};
    ptBugTest.onclick=()=>render();
    ptBugCopy.onclick=async()=>{try{await navigator.clipboard?.writeText(JSON.stringify({page:location.href,state},null,2));}catch{}};
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
