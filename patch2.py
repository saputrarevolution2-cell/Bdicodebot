from pathlib import Path
import re
root=Path('/mnt/data/pastele_audit')
# Prevent any navbar implementation from rendering before/without authentication.
for p in list((root/'js').glob('*.js')):
    s=p.read_text(encoding='utf8',errors='ignore')
    if 'const initNavbar = async () =>' in s and 'if (!user) return;' not in s:
        needle='    } catch (_) {}\n\n    try {\n      if (user && window.sb) {'
        repl='    } catch (_) {}\n\n    if (!user) {\n      host.dataset.ready = \"\";\n      return;\n    }\n\n    try {\n      if (user && window.sb) {'
        if needle in s:
            s=s.replace(needle,repl,1)
        else:
            # fallback based on exact profile try block
            s=s.replace("    } catch (_) {}\n\n    try {\n      if (user && window.sb)", "    } catch (_) {}\n\n    if (!user) { host.dataset.ready = ''; return; }\n\n    try {\n      if (user && window.sb)",1)
        p.write_text(s,encoding='utf8')

# Make the same auth gate in the standalone navbar.js.
p=root/'js/navbar.js'; s=p.read_text(encoding='utf8',errors='ignore')
if 'if (!user)' not in s:
    s=s.replace("    } catch (_) {}\n\n    try {\n      if (user && window.sb)", "    } catch (_) {}\n\n    if (!user) { host.dataset.ready = ''; return; }\n\n    try {\n      if (user && window.sb)",1)
p.write_text(s,encoding='utf8')

# Public content pages should be viewable without a login; authenticated actions remain protected.
p=root/'js/session.js'; s=p.read_text(encoding='utf8',errors='ignore')
s=s.replace('    "forgot-password.html", "reset-password.html"\n', '    "forgot-password.html", "reset-password.html",\n    "auth-callback.html", "marketplace.html", "product.html", "paste-view.html",\n    "about.html", "terms.html", "privacy.html"\n')
p.write_text(s,encoding='utf8')

# Add the universal footer to normal/public content pages, not auth/payment standalone screens.
footer_exclude={'index.html','login.html','register.html','forgot-password.html','reset-password.html','auth-callback.html','checkout.html','payment.html','payment-methods.html','payment-success.html','paste-view.html'}
for p in root.glob('*.html'):
    if p.name.lower() in footer_exclude: continue
    s=p.read_text(encoding='utf8',errors='ignore')
    if 'js/footer.js' not in s:
        s=s.replace('</body>', '  <script src="js/footer.js?v=20260912"></script>\n</body>',1)
    p.write_text(s,encoding='utf8')

# Remove duplicate script includes that point to missing or duplicate shell files.
for p in root.glob('*.html'):
    s=p.read_text(encoding='utf8',errors='ignore')
    s=re.sub(r'\s*<script[^>]+src=["\'](?:\.\./)?js/navbar\.js[^"\']*["\'][^>]*>\s*</script>', '', s, flags=re.I)
    p.write_text(s,encoding='utf8')
