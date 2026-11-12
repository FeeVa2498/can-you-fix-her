// One-off: bombs now tick on every key press. Give each bomb panel the countdown = shortest answer + slack, then re-solve.
const E = require('../src/panel_engine.js'), fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '../src/panels.json'), P = JSON.parse(fs.readFileSync(OUT, 'utf8'));
for (const p of P) {
  if (!p.boxes.some(b => b.n != null)) continue;
  const free = { ...p, boxes: p.boxes.map(b => { const o = { ...b }; delete o.n; return o; }) };
  const r0 = E.boxSolve(free, 60, 8, 800000); if (!r0.wins.length) { console.log('UNSOLVED', p.id); continue; }
  const slack = p.tut ? 2 : { 1: 2, 2: 1, 3: 0 }[p.layer];
  p.boxes.forEach(b => { if (b.n != null) b.n = r0.wins[0].length + slack; });
  const r = E.boxSolve(p, 60, 8, 800000);
  Object.assign(p, { solIn: r.wins[0], solutions: r.wins.length, minMoves: r.wins[0].length });
  console.log(p.id.padEnd(10), 'bomb', p.boxes.filter(b => b.n != null).map(b => b.n).join('/'), 'shortest', p.minMoves, 'ways', p.solutions);
}
fs.writeFileSync(OUT, JSON.stringify(P, null, 1));
