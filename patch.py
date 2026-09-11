from pathlib import Path
import re
root=Path('/mnt/data/pastele_audit')

# Remove/replace duplicated standalone theme IIFEs embedded at the end of generated page bundles.
pat=re.compile(r"\n\s*const root = document\.documentElement;\n\s*const KEY = 'pastele-theme';\n.*?\n\s*media\?\.addEventListener\?\.\('change', \(\) => \{.*?\n\s*\}\);\n\s*\}\)\(\);", re.S)
replacement="\n  /* Theme is owned by js/theme.js. Keep bundled copies from overriding it. */\n  window.PasTeleTheme?.apply?.();"
for p in (root/'js').glob('*.js'):
    if p.name in {'theme.js','theme-preload.js','session.js'}: continue
    s=p.read_text(encoding='utf8',errors='ignore')
    ns,n=pat.subn(replacement,s)
    if n:
        p.write_text(ns,encoding='utf8')
        print('theme block fixed',p.name,n)

# Settings page has an earlier bespoke theme implementation; make it delegate to the global manager.
p=root/'js/settings.js'; s=p.read_text(encoding='utf8',errors='ignore')
s=s.replace("if (mode === 'light' || mode === 'dark') return mode;\n    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';", "if (mode === 'light' || mode === 'dark') return mode;\n    if (mode === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';\n    const h = new Date().getHours();\n    return h >= 18 || h < 6 ? 'dark' : 'light';")
s=s.replace("if (!['light','dark','system'].includes(mode)) mode = 'system';", "if (!['auto','light','dark','system'].includes(mode)) mode = 'auto';")
s=s.replace("applySettingsTheme(localStorage.getItem(themeKey) || 'system');", "applySettingsTheme(localStorage.getItem(themeKey) || 'auto');")
s=s.replace("const mode = button.dataset.themeOption || 'system';", "const mode = button.dataset.themeOption || 'auto';")
s=s.replace("mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'", "mode === 'auto' ? 'Auto' : mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'")
s=s.replace("(localStorage.getItem(themeKey) || 'system') === 'system'", "(localStorage.getItem(themeKey) || 'auto') === 'system'")
p.write_text(s,encoding='utf8')

# Navbar's label/fallback should agree with Auto mode.
p=root/'js/navbar.js'; s=p.read_text(encoding='utf8',errors='ignore')
s=s.replace("localStorage.getItem('pastele-theme') || 'system'", "localStorage.getItem('pastele-theme') || 'auto'")
s=s.replace("mode === 'dark' ? 'Gelap' : mode === 'light' ? 'Terang' : 'System'", "mode === 'auto' ? 'Auto' : mode === 'dark' ? 'Gelap' : mode === 'light' ? 'Terang' : 'System'")
s=s.replace("const modes = ['system','light','dark'];", "const modes = ['auto','light','dark'];")
p.write_text(s,encoding='utf8')

# Settings UI: add Auto as first option.
p=root/'settings.html'; s=p.read_text(encoding='utf8',errors='ignore')
needle='            <div class="appearance-options">'
if needle in s and 'data-theme-option="auto"' not in s:
    auto='''            <div class="appearance-options">\n\n              <button type="button" class="appearance-option" data-theme-option="auto">\n                <span class="appearance-option-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></span>\n                <span><strong>Auto</strong><small>Siang terang, malam gelap</small></span>\n                <span class="appearance-check"><i class="fa-solid fa-check"></i></span>\n              </button>'''
    s=s.replace(needle,auto,1)
p.write_text(s,encoding='utf8')

# Public/no-navbar policy.
no_nav={'index.html','login.html','register.html','forgot-password.html','reset-password.html','auth-callback.html','checkout.html','payment.html','payment-methods.html','payment-success.html','paste-view.html','terms.html','privacy.html'}
# All pages get theme preload + theme manager + unified system CSS. Authenticated pages keep session guard.
for p in root.glob('*.html'):
    name=p.name.lower(); s=p.read_text(encoding='utf8',errors='ignore')
    # remove known missing stylesheet refs
    s=re.sub(r'\s*<link[^>]+href=["\']css/app\.css[^>]+>', '', s, flags=re.I)
    s=re.sub(r'\s*<link[^>]+href=["\']css/footer\.css[^>]+>', '', s, flags=re.I)
    # index must have core/final; all pages get final + system.
    if 'href="css/core.css' not in s and "href='css/core.css" not in s:
        s=s.replace('</head>', '  <link rel="stylesheet" href="css/core.css?v=20260912">\n</head>',1)
    if 'href="css/final-polish.css' not in s:
        s=s.replace('</head>', '  <link rel="stylesheet" href="css/final-polish.css?v=20260912">\n</head>',1)
    if 'href="css/pastele-theme.css' not in s:
        s=s.replace('</head>', '  <link rel="stylesheet" href="css/pastele-theme.css?v=20260912">\n</head>',1)
    if 'js/theme-preload.js' not in s:
        s=s.replace('<head>', '<head>\n  <script src="js/theme-preload.js?v=20260912"></script>',1)
    if 'js/theme.js' not in s:
        s=s.replace('</head>', '  <script src="js/theme.js?v=20260912"></script>\n</head>',1)
    # Remove navbar placeholder on explicit standalone/public pages.
    if name in no_nav:
        s=re.sub(r'\s*<div\s+id=["\']navbar["\'][^>]*>\s*</div>', '', s, flags=re.I)
        # remove external navbar.js
        s=re.sub(r'\s*<script[^>]+src=["\'][^"\']*js/navbar\.js[^"\']*["\'][^>]*>\s*</script>', '', s, flags=re.I)
        s=s.replace('class="app-page ', 'class="public-no-navbar app-page ')
        if 'class="app-page"' in s: s=s.replace('class="app-page"','class="public-no-navbar app-page"',1)
    # authenticated pages get session.js; public pages don't.
    if name not in {'index.html','login.html','register.html','forgot-password.html','reset-password.html','auth-callback.html'} and 'js/session.js' not in s:
        s=s.replace('</body>', '  <script src="js/session.js?v=20260912"></script>\n</body>',1)
    # Remove duplicate external navbar for bundles that already contain initNavbar.
    pagejs='js/'+name.replace('.html','.js')
    if pagejs in [f'js/{x.name}' for x in (root/'js').glob('*.js')]:
        try: js=(root/pagejs).read_text(encoding='utf8',errors='ignore')
        except: js=''
        if 'initNavbar' in js:
            s=re.sub(r'\s*<script[^>]+src=["\'][^"\']*js/navbar\.js[^"\']*["\'][^>]*>\s*</script>', '', s, flags=re.I)
    p.write_text(s,encoding='utf8')

# Admin HTML gets same theme system and session; paths are ../
for p in (root/'admin').glob('*.html'):
    s=p.read_text(encoding='utf8',errors='ignore')
    if 'css/pastele-theme.css' not in s:
        s=s.replace('</head>', '  <link rel="stylesheet" href="../css/pastele-theme.css?v=20260912">\n</head>',1)
    if 'js/theme-preload.js' not in s:
        s=s.replace('<head>', '<head>\n  <script src="../js/theme-preload.js?v=20260912"></script>',1)
    if 'js/theme.js' not in s:
        s=s.replace('</head>', '  <script src="../js/theme.js?v=20260912"></script>\n</head>',1)
    if 'js/session.js' not in s:
        s=s.replace('</body>', '  <script src="../js/session.js?v=20260912"></script>\n</body>',1)
    p.write_text(s,encoding='utf8')

# Index-specific hard safety against any legacy lock.
p=root/'css/index.css'; s=p.read_text(encoding='utf8',errors='ignore')
s=re.sub(r'\.index-page\{[^}]*overflow:hidden[^}]*\}', lambda m:m.group(0).replace('overflow:hidden','overflow:visible'), s)
s += '\n/* FINAL INDEX SCROLL/THEME SAFETY */\nhtml,body{height:auto!important;min-height:100%;overflow-x:hidden!important;overflow-y:auto!important}\n.index-page,.index-page main{height:auto!important;min-height:0!important;overflow:visible!important}\n'
p.write_text(s,encoding='utf8')

print('HTML/CSS normalization complete')
