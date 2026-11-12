// One-off: a bomb now ticks only when its own box moves. Countdown = that box's moves in a shortest answer + slack, then re-solve.
// Panels already designed with the per-box rule (layer 1–2 of v5) are skipped with SKIP=ids.
const E = require('../src/panel_engine.js'), fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '../src/panels.json'), P = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const skip = new Set((process.env.SKIP || '').split(','));
for (const p of P) {
  if (skip.has(p.id) || !p.boxes.some(b => b.n != null)) continue;
  const free = { ...p, boxes: p.boxes.map(b => { const o = { ...b }; delete o.n; return o; }) };
  const r0 = E.boxSolve(free, 60, 8, 800000); if (!r0.wins.length) { console.log('UNSOLVED', p.id); continue; }
  let s = E.boxStart(free); const mv = p.boxes.map(() => 0), last = p.boxes.map(() => -1), W = r0.wins[0];
  [...W].forEach((c, k) => { const r = E.boxStep(free, s, E.DK[c]); r.moved.forEach((m, i) => { if (m) { mv[i]++; last[i] = k; } }); s = r.state; });
  // a bomb that has made its last move before the winning press must not be at 0 by then
  mv.forEach((m, i) => { if (last[i] < W.length - 1) mv[i]++; });
  const slack = p.tut ? 2 : { 1: 2, 2: 1, 3: 0 }[p.layer];
  p.boxes.forEach((b, i) => { if (b.n != null) b.n = Math.max(1, mv[i] + slack); });
  const r = E.boxSolve(p, 60, 8, 800000);
  Object.assign(p, { solIn: r.wins[0], solutions: r.wins.length, minMoves: r.wins[0].length });
  console.log(p.id.padEnd(10), 'bomb', p.boxes.filter(b => b.n != null).map(b => b.n).join('/'), 'shortest', p.minMoves, 'ways', p.solutions);
}
fs.writeFileSync(OUT, JSON.stringify(P, null, 1));
