"""Publish the Studio Work pieces into public/work/<slug>/.

Usage: python3 -I tools/publish-studio.py <studio source dir>
Each piece is copied with only the files its page references. Inline scripts move
into site.js so the site's security rules can forbid inline scripts. Every piece is
noindex: they are made-up businesses and must not be listed as real local companies.
"""
import os, re, shutil, sys

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'work')
PIECES = {'basalt': 'sweathouse', 'lacquer-room': 'detailer', 'inlay': 'tailor'}
REF = re.compile(r'''(?:src|href|srcset)="([^"#:?]+)"|url\(\s*['"]?([^)'"#:]+)['"]?\s*\)''')

def refs(text):
    for a, b in REF.findall(text):
        p = (a or b).strip()
        if p and not p.startswith('/') and not p.startswith('data'):
            yield p

for slug, name in PIECES.items():
    sdir, odir = os.path.join(SRC, name), os.path.join(OUT, slug)
    if os.path.isdir(odir): shutil.rmtree(odir)
    os.makedirs(odir)
    html = open(os.path.join(sdir, 'index.html'), encoding='utf-8').read()
    assert not re.search(r'\son[a-z]+\s*=\s*"', html), f'{slug}: inline event handler, move it into the script'
    scripts = re.findall(r'<script>(.*?)</script>', html, re.S)
    if scripts:
        open(os.path.join(odir, 'site.js'), 'w', encoding='utf-8').write('\n'.join(s.strip() for s in scripts) + '\n')
        html = re.sub(r'<script>.*?</script>', '', html, flags=re.S)
        html = html.replace('</body>', '<script src="site.js"></script>\n</body>', 1)
    head = (f'<meta name="robots" content="noindex">\n<link rel="canonical" href="https://quvlo.co/work/{slug}/">\n'
            '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n')
    html = re.sub(r'(<meta charset="[^"]*">)', r'\1\n' + head, html, count=1)
    open(os.path.join(odir, 'index.html'), 'w', encoding='utf-8').write(html)
    todo, seen = list(refs(html)), set()
    while todo:  # follow references inside copied CSS too (fonts.css -> fonts/*.woff2)
        rel = todo.pop()
        if rel in seen or rel == 'site.js': continue  # site.js is written above, not copied
        seen.add(rel)
        src = os.path.join(sdir, rel)
        if not os.path.isfile(src): print(f'  {slug}: missing {rel}'); continue
        dst = os.path.join(odir, rel); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(src, dst)
        if rel.endswith('.css'):
            base = os.path.dirname(rel)
            todo += [os.path.normpath(os.path.join(base, r)) for r in refs(open(src, encoding='utf-8').read())]
    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(odir) for f in fs)
    print(f'{slug}: {len(seen)} files, {size / 1e6:.2f} MB')
