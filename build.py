#!/usr/bin/env python3
"""Build index.html from src/ + data/.

On GitHub Pages the game reads data/*.csv live, so editing dialogue does NOT need a rebuild.
Rebuild only after changing src/ (code, art, levels) or to refresh the dialogue copy that is
packed inside index.html for offline play (opening the file directly)."""
import base64, json, os, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
CSV = ['session', 'morning', 'night_boss', 'night_index', 'night_lines']

js = open(P('src', 'game.js'), encoding='utf-8').read()
embed = {n: open(P('data', n + '.csv'), encoding='utf-8-sig').read() for n in CSV}
js = js.replace('__CSV_EMBED__', json.dumps(embed, ensure_ascii=False).replace('</', '<\\/'))
js = js.replace('__LEVELS__', json.dumps(json.load(open(P('src', 'levels.json'))), separators=(',', ':')))
for key, f in [('__PRIM_BODY__', 'jirai_body.png'), ('__PRIM_FACE__', 'jirai_face.png'),
               ('__TRIX_BODY__', 'egirl_body.png'), ('__TRIX_FACE__', 'egirl_face.png')]:
    js = js.replace(key, 'data:image/png;base64,' + base64.b64encode(open(P('src', 'art', f), 'rb').read()).decode())

shell = open(P('src', 'shell.html'), encoding='utf-8').read()
page = shell.replace('/*GAME*/', js)
i = page.index('</style>') + len('</style>')
out = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
       + page[:i] + '\n</head>\n<body>\n' + page[i:] + '</body>\n</html>\n')
open(P('index.html'), 'w', encoding='utf-8').write(out)

# syntax check when node is available
try:
    s = out[out.index('<script>') + 8:out.rindex('</script>')]
    tmp = P('.build_check.js'); open(tmp, 'w', encoding='utf-8').write(s)
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True); os.remove(tmp)
    if r.returncode: print(r.stderr); sys.exit(1)
except FileNotFoundError:
    pass
print('built index.html', len(out) // 1024, 'KB')
