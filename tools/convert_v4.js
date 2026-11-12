// One-off: turn the old line panels into rope-box panels (the whole game is boxes now).
//   start → a rope box, exit → goal, dots/sketch/visit-all → light tiles, avoid → wall, plates/gates (no inverted gate) → switch + door.
// Overpasses, mirror lines and inverted gates have no box equivalent: those panels are listed for the designer to redo.
const E = require('../src/panel_engine.js'), fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '../src/panels.json');
const P = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const redo = [], out = [];
for (const p of P) {
  if (p.boxes) { out.push(p); continue; }
  if ((p.bridges || []).length || p.mirror || (p.gates || []).some(g => g[5]) || (p.squares || []).length) { redo.push(p.id); out.push(p); continue; }
  const q = { id: p.id, girl: p.girl, layer: p.layer, n: p.n, w: p.w, h: p.h };
  ['holes', 'broken', 'oneway', 'portals', 'pads', 'stops', 'nums'].forEach(k => { if ((p[k] || []).length) q[k] = JSON.parse(JSON.stringify(p[k])); });
  if ((p.avoid || []).length) q.broken = (q.broken || []).concat(p.avoid);
  q.boxes = [{ x: p.start[0][0], y: p.start[0][1], trail: true }];
  q.exit = p.exit.map(e => [e[0], e[1]]);
  const L = new Map(), addL = (x, y) => { if (!(x === p.start[0][0] && y === p.start[0][1])) L.set(x + ',' + y, [x, y]); };
  (p.dots || []).forEach(([x, y]) => addL(x, y));
  (p.sketch || []).forEach(e => { addL(e[0], e[1]); addL(e[2], e[3]); });
  if (p.visitAll) { const d = E.dims(p); for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) if (E.inside(p, x, y)) addL(x, y); }
  p.exit.forEach(([x, y]) => L.delete(x + ',' + y));
  if (L.size) q.lights = [...L.values()];
  if ((p.plates || []).length) { q.switches = p.plates.map(([x, y, ch]) => [x, y, ch + 1]); q.doors = p.gates.map(g => [g[0], g[1], g[2], g[3], g[4] + 1]); }
  Object.assign(q, { belief: p.belief, intro: p.intro, why: p.why, note: p.note });
  if (p.tut) q.tut = p.tut;
  // the old answer as key presses
  const st = E.replay(p, p.sol); let keys = '';
  for (let i = 1; i < p.sol.length; i++) if (!st.forced[i]) keys += E.dirKey([p.sol[i][0] - p.sol[i - 1][0], p.sol[i][1] - p.sol[i - 1][1]]);
  if (!E.boxWon(q, E.boxReplay(q, keys))) { redo.push(p.id + '(answer lost)'); out.push(p); continue; }
  let r = E.boxSolve(q, 60, 8, 600000);
  // too many short answers (pencil lines turned into lights say less): light more of the old answer
  const cand = p.sol.slice(1, -1).filter(([x, y]) => !(q.lights || []).some(l => l[0] === x && l[1] === y));
  while (!p.tut && r.wins.length > 2 && cand.length) {
    let best = null;
    for (const c of cand) { const t = { ...q, lights: (q.lights || []).concat([c]) }, rr = E.boxSolve(t, 60, 8, 600000); if (rr.wins.length && (!best || rr.wins.length < best.r.wins.length)) best = { c, r: rr }; }
    if (!best) break;
    q.lights = (q.lights || []).concat([best.c]); cand.splice(cand.indexOf(best.c), 1); r = best.r;
  }
  const win = r.wins.length ? r.wins[0] : keys;
  Object.assign(q, { solIn: win, solutions: r.wins.length || 1, minMoves: win.length, was: 'line' });
  if (r.wins.length > 3 && !p.tut) redo.push(p.id + '(' + r.wins.length + ' shortest)');
  out.push(q);
}
console.log('redo', redo.length, redo.join(' '));
if (process.argv[2] === 'write') fs.writeFileSync(OUT, JSON.stringify(out.map(p => { const o = { ...p }; Object.keys(o).forEach(k => o[k] === undefined && delete o[k]); return o; }), null, 1));
