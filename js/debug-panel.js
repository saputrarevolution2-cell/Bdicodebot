/* TeleCod — Universal Debug Console
 * Enable on ANY page with: ?debug=telecod112
 * The mode is remembered for the current browser tab and propagated to internal links.
 */
(() => {
  'use strict';
  const SECRET = 'telecod112';
  const KEY = '__telecod_debug';
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('debug') === SECRET;
  const enabled = requested || sessionStorage.getItem(KEY) === '1';
  if (!enabled) return;
  if (requested) sessionStorage.setItem(KEY, '1');

  const state = { errors: [], logs: [], info: [], started: new Date().toISOString() };
  const safe = value => {
    try { return typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
    catch { return String(value); }
  };
  const push = (bucket, args) => {
    state[bucket].push({ time: new Date().toLocaleTimeString(), msg: args.map(safe).join(' ') });
    if (state[bucket].length > 100) state[bucket].shift();
    render();
  };

  const oldError = console.error.bind(console);
  const oldWarn = console.warn.bind(console);
  const oldLog = console.log.bind(console);
  console.error = (...a) => { oldError(...a); push('errors', a); };
  console.warn = (...a) => { oldWarn(...a); push('logs', a); };
  console.log = (...a) => { oldLog(...a); push('info', a); };
  window.addEventListener('error', e => push('errors', [`${e.message || 'Unknown error'} @ ${e.filename || location.pathname}:${e.lineno || ''}`]));
  window.addEventListener('unhandledrejection', e => push('errors', [`Unhandled Promise: ${safe(e.reason)}`]));

  const style = document.createElement('style');
  style.id = 'tcDebugStyle';
  style.textContent = `
    #tcDebugRoot{position:fixed;right:16px;bottom:16px;z-index:2147483647;font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif}
    #tcDebugBtn{border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:10px 15px;background:#101828;color:#fff;box-shadow:0 12px 38px rgba(16,24,40,.28);cursor:pointer;font-weight:800;letter-spacing:-.01em;transition:.18s}
    #tcDebugBtn:hover{transform:translateY(-2px);box-shadow:0 16px 42px rgba(16,24,40,.34)}
    #tcDebugPanel{display:none;width:min(460px,calc(100vw - 28px));max-height:min(82vh,720px);overflow:auto;margin-bottom:10px;background:#fff;color:#101828;border:1px solid #e4e7ec;border-radius:20px;box-shadow:0 24px 80px rgba(16,24,40,.22);overflow-x:hidden}
    #tcDebugPanel.open{display:block}
    #tcDebugHead{position:sticky;top:0;z-index:2;padding:13px 15px;background:rgba(255,255,255,.94);backdrop-filter:blur(16px);border-bottom:1px solid #eaecf0;display:flex;align-items:center;justify-content:space-between;gap:10px}
    #tcDebugHead b{font-size:14px}.tcdbg-brand{display:flex;align-items:center;gap:8px}.tcdbg-dot{width:8px;height:8px;border-radius:50%;background:#12b76a;box-shadow:0 0 0 4px rgba(18,183,106,.12)}
    .tcdbg-actions{display:flex;gap:6px}.tcdbg-actions button{border:1px solid #d0d5dd;background:#fff;color:#344054;border-radius:9px;padding:6px 9px;cursor:pointer;font-weight:700}.tcdbg-actions button:hover{background:#f9fafb}
    #tcDebugBody{padding:13px 15px}.tcdbg-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tcdbg-card{border:1px solid #eaecf0;border-radius:12px;padding:10px;background:#fcfcfd}.tcdbg-label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#667085}.tcdbg-value{margin-top:2px;font-weight:800;word-break:break-word}.ok{color:#087443}.bad{color:#b42318}
    .tcdbg-section{margin-top:13px}.tcdbg-section h4{margin:0 0 7px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#667085}.tcdbg-log{background:#0b1220;color:#d0d5dd;border-radius:11px;padding:9px;max-height:160px;overflow:auto;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
    @media(max-width:560px){#tcDebugRoot{right:10px;bottom:10px}#tcDebugPanel{width:calc(100vw - 20px);max-height:78vh}.tcdbg-grid{grid-template-columns:1fr}.tcdbg-actions button{padding:6px 8px}}
    @media(prefers-color-scheme:dark){#tcDebugPanel{background:#101828;color:#f2f4f7;border-color:#344054}#tcDebugHead{background:rgba(16,24,40,.94);border-color:#344054}.tcdbg-card{background:#182230;border-color:#344054}.tcdbg-label,.tcdbg-section h4{color:#98a2b3}.tcdbg-actions button{background:#182230;color:#f2f4f7;border-color:#475467}}
  `;
  (document.head || document.documentElement).appendChild(style);

  function mount() {
    if (document.getElementById('tcDebugRoot')) return;
    const root = document.createElement('div'); root.id = 'tcDebugRoot';
    root.innerHTML = `<div id="tcDebugPanel"><div id="tcDebugHead"><div class="tcdbg-brand"><span class="tcdbg-dot"></span><b>TeleCod Debug</b></div><div class="tcdbg-actions"><button id="tcDbgRefresh" type="button">↻</button><button id="tcDbgClear" type="button">Clear</button><button id="tcDbgClose" type="button">×</button></div></div><div id="tcDebugBody"></div></div><button id="tcDebugBtn" type="button">⚙ Debug</button>`;
    document.body.appendChild(root);
    document.getElementById('tcDebugBtn').onclick = () => { document.getElementById('tcDebugPanel').classList.toggle('open'); render(); };
    document.getElementById('tcDbgClose').onclick = () => document.getElementById('tcDebugPanel').classList.remove('open');
    document.getElementById('tcDbgClear').onclick = () => { state.errors.length = state.logs.length = state.info.length = 0; render(); };
    document.getElementById('tcDbgRefresh').onclick = render;
    if (requested) document.getElementById('tcDebugPanel').classList.add('open');
    render();
    propagateLinks();
  }

  async function checks() {
    const cfg = window.TC_CONFIG || window.PASTELE_CONFIG || {};
    let session = 'N/A', authErr = '';
    if (window.sb) {
      try { const r = await window.sb.auth.getSession(); session = r.data?.session ? 'Signed in' : 'No session'; authErr = r.error?.message || ''; }
      catch (e) { authErr = e?.message || String(e); }
    }
    return { cfg, configured: !!window.sb, session, authErr };
  }

  async function render() {
    const body = document.getElementById('tcDebugBody'); if (!body) return;
    const c = await checks();
    const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
    const path = location.pathname || '/';
    body.innerHTML = `<div class="tcdbg-grid">
      <div class="tcdbg-card"><div class="tcdbg-label">Page</div><div class="tcdbg-value">${esc(path)}</div></div>
      <div class="tcdbg-card"><div class="tcdbg-label">Supabase</div><div class="tcdbg-value ${c.configured?'ok':'bad'}">${c.configured?'READY':'NOT CONFIGURED'}</div></div>
      <div class="tcdbg-card"><div class="tcdbg-label">Auth</div><div class="tcdbg-value">${esc(c.session)}</div></div>
      <div class="tcdbg-card"><div class="tcdbg-label">JS Errors</div><div class="tcdbg-value ${state.errors.length?'bad':'ok'}">${state.errors.length}</div></div>
    </div>
    <div class="tcdbg-section"><h4>Supabase</h4><div class="tcdbg-log">${esc(c.cfg.SUPABASE_URL || 'Missing URL')}\nKey: ${c.cfg.SUPABASE_ANON_KEY ? 'Present' : 'Missing'}${c.authErr ? '\nAuth error: '+esc(c.authErr) : ''}</div></div>
    <div class="tcdbg-section"><h4>Current URL</h4><div class="tcdbg-log">${esc(location.href)}</div></div>
    <div class="tcdbg-section"><h4>Errors</h4><div class="tcdbg-log">${state.errors.length ? state.errors.map(x=>`[${esc(x.time)}] ${esc(x.msg)}`).join('\n') : 'No captured errors.'}</div></div>
    <div class="tcdbg-section"><h4>Warnings</h4><div class="tcdbg-log">${state.logs.length ? state.logs.map(x=>`[${esc(x.time)}] ${esc(x.msg)}`).join('\n') : 'No captured warnings.'}</div></div>
    <div class="tcdbg-section"><h4>Console</h4><div class="tcdbg-log">${state.info.length ? state.info.map(x=>`[${esc(x.time)}] ${esc(x.msg)}`).join('\n') : 'No console logs captured.'}</div></div>`;
  }

  function propagateLinks() {
    document.querySelectorAll('a[href]').forEach(a => {
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:|https?:\/\/)/i.test(raw)) return;
      try {
        const u = new URL(raw, location.href);
        if (u.origin !== location.origin) return;
        u.searchParams.set('debug', SECRET);
        a.setAttribute('href', u.pathname + u.search + u.hash);
      } catch {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
