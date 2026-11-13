#!/usr/bin/env python3
"""Build index.html from src/ + data/.

On GitHub Pages the game reads data/dialogue.xlsx live, so editing dialogue does NOT need a rebuild.
Rebuild only after changing src/ (code, art, levels) or to refresh the dialogue copy that is
packed inside index.html for offline play (opening the file directly)."""
import base64, json, os, subprocess, sys  # needs openpyxl to read data/dialogue.xlsx
ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
CSV = ['session', 'morning', 'night_boss', 'night_index', 'night_lines', 'first_message', 'journal', 'act5_ending']

# game + the new panel engine + title/test chamber; main() runs last
js = '\n'.join(open(P('src', f), encoding='utf-8').read() for f in ('game.js', 'panel_engine.js', 'world.js', 'ending.js', 'music.js', 'chamber.js', 'chamber_board.js', 'chamber_solution.js', 'chamber_3d.js', 'world_3d.js', 'editor.js')) + '\nmain();\n'
js = js.replace('__PANELS__', json.dumps(json.load(open(P('src', 'panels.json'))), separators=(',', ':')))
def sheet_csv(ws):
    import csv, io
    buf = io.StringIO(); w = csv.writer(buf, lineterminator='\n')
    for row in ws.iter_rows(values_only=True):
        w.writerow(['' if v is None else str(int(v)) if isinstance(v, float) and v.is_integer() else str(v) for v in row])
    return buf.getvalue()

# dialogue: data/dialogue.xlsx (the writers' workbook); data/<sheet>.csv is used for any sheet it lacks
embed = {}
xlsx = P('data', 'dialogue.xlsx')
if os.path.exists(xlsx):
    from openpyxl import load_workbook
    wb = load_workbook(xlsx, data_only=True)
    embed = {n: sheet_csv(wb[n]) for n in CSV if n in wb.sheetnames}
for n in CSV:
    if n not in embed and os.path.exists(P('data', n + '.csv')):
        embed[n] = open(P('data', n + '.csv'), encoding='utf-8-sig').read()
missing = [n for n in CSV if n not in embed]
if missing: print('warning: no dialogue for', ', '.join(missing)); embed.update({n: '' for n in missing})
js = js.replace('__CSV_EMBED__', json.dumps(embed, ensure_ascii=False).replace('</', '<\\/'))
for key, f in [('__PRIM_BODY__', 'jirai_body.png'), ('__PRIM_FACE__', 'jirai_face.png'),
               ('__TRIX_BODY__', 'egirl_body.png'), ('__TRIX_FACE__', 'egirl_face.png')]:
    js = js.replace(key, 'data:image/png;base64,' + base64.b64encode(open(P('src', 'art', f), 'rb').read()).decode())

shell = open(P('src', 'shell.html'), encoding='utf-8').read()
page = shell.replace('/*GAME*/', js)
# three.js (MIT, vendor/three.min.js) for the 3D projector, in its own script tag before the game
three = open(P('vendor', 'three.min.js'), encoding='utf-8').read()
page = page.replace('<script>', '<script>' + three + '</script>\n<script>', 1)
i = page.index('</style>') + len('</style>')
out = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
       + page[:i] + '\n</head>\n<body>\n' + page[i:] + '</body>\n</html>\n')
open(P('index.html'), 'w', encoding='utf-8').write(out)

# syntax check when node is available
try:
    s = out[out.rindex('<script>') + 8:out.rindex('</script>')]
    tmp = P('.build_check.js'); open(tmp, 'w', encoding='utf-8').write(s)
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True); os.remove(tmp)
    if r.returncode: print(r.stderr); sys.exit(1)
except FileNotFoundError:
    pass
print('built index.html', len(out) // 1024, 'KB')
