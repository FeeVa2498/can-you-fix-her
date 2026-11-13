// v11: order each girl's layer by difficulty (tutorials keep their place in front on the map; the rest get n = 1…
// by shortest answer, then number of special-tile kinds) and report the special-tile kinds per panel.
const fs = require('fs'), path = require('path'), OUT = path.join(__dirname, '../src/panels.json');
const ALL = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const kinds = p => ['lights', 'touch', 'nums', 'pads', 'portals', 'oneway', 'switches', 'cracks', 'fragile', 'paints', 'dice'].filter(k => (p[k] || []).length).length;
for (const g of ['prim', 'trix', 'paige', 'vel']) for (const L of [1, 2, 3]) {
  const ps = ALL.filter(p => p.girl === g && p.layer === L && !p.ray), rest = ps.filter(p => !p.tut);
  rest.sort((a, b) => a.minMoves + kinds(a) * 2 + a.boxes.length * 2 - (b.minMoves + kinds(b) * 2 + b.boxes.length * 2)).forEach((p, i) => p.n = i + 1);
  const over = ps.filter(p => kinds(p) > (L === 3 ? 3 : 2));
  console.log(g, L, ps.length, 'panels', over.length ? 'OVER: ' + over.map(p => p.id).join(' ') : '');
}
if (process.argv[2] === 'write') { fs.writeFileSync(OUT, JSON.stringify(ALL, null, 1)); console.log('wrote'); }
