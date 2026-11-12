// (The designer adds trix_1_t5, 2_3, 2_t6, 3_t6 and 3_9 afterwards.)
// One-off (v8): Trix = one rope box per panel. Old rope panels (line era, git 616a9cf) are brought back, current
// single-rope sensor panels are kept, every special tile that changes nothing is taken away, then all are re-solved.
const E = require('../src/panel_engine.js'), fs = require('fs'), path = require('path');
const S = process.env.S, OUT = path.join(__dirname, '../src/panels.json');
const OLD = JSON.parse(fs.readFileSync(S + '/old_616a9cf.json', 'utf8')), CUR = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const from = (src, id) => JSON.parse(JSON.stringify((src === 'old' ? OLD : CUR).find(p => p.id === id)));
// [new id, layer, n, source, old id, tutorial tag]
const PLAN = [
  ['trix_1_t1', 1, .4, 'old', 'prim_1_t1', 'trail'], ['trix_1_1', 1, 1, 'old', 'prim_1_1'], ['trix_1_t2', 1, 1.4, 'old', 'trix_1_t3', 'nums'], ['trix_1_2', 1, 2, 'old', 'trix_1_3'],
  ['trix_1_3', 1, 3, 'old', 'trix_1_2'], ['trix_1_4', 1, 4, 'old', 'trix_1_6'], ['trix_1_5', 1, 5, 'old', 'trix_2_2'], ['trix_1_6', 1, 6, 'old', 'prim_1_2'],
  ['trix_2_t1', 2, .4, 'cur', 'trix_1_t2', 'touch'], ['trix_2_1', 2, 1, 'cur', 'trix_1_2'], ['trix_2_2', 2, 2, 'old', 'trix_2_5'], 
  ['trix_2_4', 2, 4, 'cur', 'trix_1_5'], ['trix_2_5', 2, 5, 'old', 'trix_3_8'], ['trix_2_6', 2, 6, 'old', 'paige_1_2'], ['trix_2_7', 2, 7, 'old', 'prim_1_4'], ['trix_2_8', 2, 8, 'cur', 'trix_1_6'],
  ['trix_3_1', 3, 1, 'old', 'trix_3_3'], ['trix_3_2', 3, 2, 'old', 'trix_1_4'], ['trix_3_3', 3, 3, 'old', 'trix_3_4'], ['trix_3_4', 3, 4, 'old', 'paige_1_5'], ['trix_3_5', 3, 5, 'old', 'trix_3_1'],
  ['trix_3_6', 3, 6, 'old', 'prim_1_6'], ['trix_3_7', 3, 7, 'old', 'trix_3_6'], ['trix_3_8', 3, 8, 'old', 'trix_3_2'],
];
const solve = p => E.boxSolve(p, 60, 12, 900000);
const sig = r => r.wins.length ? r.wins[0].length + ':' + r.wins.length + (r.capped ? 'c' : '') : 'none';
const out = [];
for (const [id, layer, n, src, oid, tut] of PLAN) {
  const p = from(src, oid);
  Object.assign(p, { id, girl: 'trix', layer, n }); delete p.tut; if (tut) p.tut = tut;
  ['was', 'quality', 'luck', 'feature', 'edited'].forEach(k => delete p[k]);
  p.boxes = [{ x: p.boxes[0].x, y: p.boxes[0].y, trail: true }];
  let base = solve(p); if (!base.wins.length) { console.log('UNSOLVABLE', id, oid); continue; }
  // take away whatever changes nothing: same shortest length and the same number of shortest answers without it
  const kinds = ['lights', 'nums', 'touch', 'oneway', 'portals', 'pads', 'doors', 'holes'];
  let removed = [];
  for (const k of kinds) for (let i = (p[k] || []).length - 1; i >= 0; i--) {
    if (k === 'holes') continue;   // holes shape the map
    const q = { ...p, [k]: p[k].filter((_, j) => j !== i) }; if (k === 'doors' && !q.doors.length) { delete q.doors; }
    const r = solve(q);
    if (!r.capped && !base.capped && sig(r) === sig(base) && r.wins.every(w => base.wins.includes(w))) { removed.push(k); p[k] = q[k]; }
  }
  if ((p.switches || []).length && !(p.doors || []).length) { removed.push('switches'); delete p.switches; }
  kinds.concat(['switches']).forEach(k => { if (p[k] && !p[k].length) delete p[k]; });
  base = solve(p);
  Object.assign(p, { solIn: base.wins[0], solutions: base.wins.length, minMoves: base.wins[0].length });
  const prev = CUR.find(q => q.id === id); p.belief = (prev && prev.belief) || p.belief || '';
  const f = ['lights', 'nums', 'touch', 'oneway', 'portals', 'holes', 'switches', 'doors'].filter(k => (p[k] || []).length).map(k => k + ' ' + p[k].length).join(', ');
  console.log(id.padEnd(10), '←', (src + ':' + oid).padEnd(16), `${p.w}x${p.h}`, 'len', p.minMoves, 'ways', p.solutions, '|', f, removed.length ? '| dropped ' + removed.length : '');
  out.push(p);
}
if (process.argv[2] === 'write') { const all = CUR.filter(p => p.girl !== 'trix').concat(out); fs.writeFileSync(OUT, JSON.stringify(all, null, 1)); console.log('wrote', all.length); }
