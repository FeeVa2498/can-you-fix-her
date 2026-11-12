// One-off (v9): Trix edge-number corners → numbered sensor tiles. For each panel with corner numbers, take its intended
// rope route, drop the corner numbers, then place numbered tiles (number = rope tiles on its four sides) off the route
// until the intended answer is the only shortest one again; finally drop any tile that changes nothing.
const E = require('../src/panel_engine.js'), fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '../src/panels.json'), ALL = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const solve = p => E.boxSolve(p, 60, 12, 900000);
const K = (x, y) => x + ',' + y;
const sig = r => r.wins.length ? r.wins[0].length + ':' + r.wins.length : 'none';
for (const p of ALL) {
  if (p.girl !== 'trix' || !(p.nums || []).length) continue;
  const route = p.solIn, s = E.boxReplay(p, route);
  const rope = new Set([...s.trail, ...s.pos.map(q => K(...q))]);
  const used = new Set(rope);
  [p.boxes.map(b => [b.x, b.y]), p.exit, p.lights, p.oneway, p.portals && p.portals.flat ? [] : [], p.touch, p.holes, p.switches, p.pads].forEach(L => (L || []).forEach(q => Array.isArray(q) && used.add(K(q[0], q[1]))));
  (p.portals || []).forEach(q => { used.add(K(q[0], q[1])); if (q.length > 3) used.add(K(q[2], q[3])); });
  const n0 = p.nums.length; delete p.nums;
  const cnt = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => rope.has(K(x + dx, y + dy))).length;
  const cand = [];
  for (let y = 0; y <= p.h; y++) for (let x = 0; x <= p.w; x++) if (!used.has(K(x, y)) && !(p.holes || []).some(h => h[0] === x && h[1] === y)) { const n = cnt(x, y); if (n) cand.push([x, y, n]); }
  p.touch = p.touch || [];
  const ok = r => r.wins.length && r.wins[0] === route || (r.wins.length === 1 && r.wins[0].length === route.length);
  let r = solve(p);
  // greedy: add the tile that cuts the shortest-answer count most, keeping the intended route a winner
  while (!(r.wins.length === 1 && r.wins[0].length === route.length) && cand.length) {
    let best = null;
    for (const c of cand) {
      const q = { ...p, touch: p.touch.concat([c]) }, rr = solve(q);
      if (!rr.wins.length || rr.wins[0].length > route.length && !rr.wins.includes(route)) continue;
      if (!E.boxWon(q, E.boxReplay(q, route))) continue;
      const sc = (rr.wins[0].length === route.length ? 0 : -1000) + rr.wins[0].length * 10 - rr.wins.length;
      if (!best || sc > best.sc) best = { c, sc, rr };
    }
    if (!best) break;
    p.touch.push(best.c); cand.splice(cand.indexOf(best.c), 1); r = best.rr;
  }
  // fallback: the old route can't be pinned down from off-route tiles → search any free tile with any number 1–3
  if (!(r.wins.length === 1 && r.wins[0].length >= route.length * .75)) {
    p.touch = []; r = solve(p);
    const sc = rr => rr.wins.length ? rr.wins[0].length * 10 - Math.min(rr.wins.length, 12) * 25 : -1e9;
    const free = [];
    for (let y = 0; y <= p.h; y++) for (let x = 0; x <= p.w; x++) {
      const k = K(x, y); if (!used.has(k) || rope.has(k) && !p.boxes.some(b => b.x === x && b.y === y) && !(p.exit || []).some(e => e[0] === x && e[1] === y)) if (!(p.holes || []).some(h => h[0] === x && h[1] === y)) for (const n of [1, 2, 3]) free.push([x, y, n]);
    }
    for (let step = 0; step < 5; step++) {
      let best = null;
      for (const c of free) {
        if (p.touch.some(t => t[0] === c[0] && t[1] === c[1])) continue;
        const rr = solve({ ...p, touch: p.touch.concat([c]) });
        if (rr.capped) continue;
        if (!best || sc(rr) > best.v) best = { c, v: sc(rr), rr };
      }
      if (!best || best.v <= sc(r)) break;
      p.touch.push(best.c); r = best.rr;
    }
  }
  // prune
  for (const k of ['touch', 'lights', 'oneway']) for (let i = (p[k] || []).length - 1; i >= 0; i--) {
    const q = { ...p, [k]: p[k].filter((_, j) => j !== i) }, rr = solve(q);
    if (sig(rr) === sig(r)) { p[k] = q[k]; r = rr; }
  }
  ['touch', 'lights', 'oneway'].forEach(k => { if (p[k] && !p[k].length) delete p[k]; });
  if (p.tut === 'nums') p.tut = 'touch';
  Object.assign(p, { solIn: r.wins[0], solutions: r.wins.length, minMoves: r.wins[0].length });
  console.log(p.id.padEnd(10), `${p.w}x${p.h}`, 'corner', n0, '→ tiles', (p.touch || []).length, 'len', route.length, '→', p.minMoves, 'ways', p.solutions);
}
if (process.argv[2] === 'write') { fs.writeFileSync(OUT, JSON.stringify(ALL, null, 1)); console.log('wrote'); }
