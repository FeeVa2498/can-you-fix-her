// v13 · Ray's map: put the designed levels in as ray_1 … ray_20 (5 per girl, behind her gate).
//   rb_prim_1–5 → ray_1–5 · rb_trix_1–5 → ray_6–10 · rb_paige_1–5 → ray_11–15 · rb_vel_1–5 → ray_16–20
// Inputs: the PART files of tools/design_v3.js (Prim, Paige) and tools/vel_v12.js (Vel), and the JSON-line
// output of tools/trix_v10.js (Trix). Checks: 2–3 boxes (the rope box alone), and harder as k grows (warns).
// Usage: node tools/ray_v13.js <file> …
const fs = require('fs'), path = require('path'), E = require('../src/panel_engine.js');
const OUT = path.join(__dirname, '../src/panels.json'), ALL = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const ORDER = ['prim', 'trix', 'paige', 'vel'];
const got = [];
for (const f of process.argv.slice(2)) {
  const txt = fs.readFileSync(f, 'utf8').trim(); if (!txt) continue;
  if (txt[0] === '[') got.push(...JSON.parse(txt)); else txt.split('\n').filter(l => l.trim()[0] === '{').forEach(l => got.push(JSON.parse(l)));
}
const byId = new Map(got.filter(p => /^rb_\w+_\d$/.test(p.id)).map(p => [p.id, p]));
const made = [];
ORDER.forEach((g, gi) => {
  let prev = 0;
  for (let k = 1; k <= 5; k++) {
    const p = byId.get(`rb_${g}_${k}`); if (!p) { console.log('missing', `rb_${g}_${k}`); continue; }
    const rope = p.boxes.some(b => b.trail), nb = p.boxes.length;
    if (rope ? nb !== 1 : nb < 2 || nb > 3) console.log('WARN box count', p.id, nb);
    if (!p.minMoves || !p.solIn) { const r = E.boxSolve(p, 60, 4, 1500000); if (r.wins.length) Object.assign(p, { solIn: r.wins[0], solutions: r.wins.length, minMoves: r.wins[0].length }); }
    if (p.minMoves < prev) console.log('note: shorter than the one before', p.id, p.minMoves, '<', prev);
    prev = p.minMoves;
    const n = gi * 5 + k, q = { ...p, id: 'ray_' + n, girl: g, ray: true, src: g, layer: 1, n, belief: '', tut: undefined, intro: null };
    delete q.tut; made.push(q);
    console.log(q.id.padEnd(7), `${g} ${k}`.padEnd(8), `${p.w}x${p.h}`, 'boxes', nb, 'moves', p.minMoves, 'ways', p.solutions);
  }
});
const keep = ALL.filter(p => !made.some(m => m.id === p.id));
fs.writeFileSync(OUT, JSON.stringify(keep.concat(made), null, 1));
console.log('wrote', made.length, 'ray levels →', OUT);
