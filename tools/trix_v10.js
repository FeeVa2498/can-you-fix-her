// One-off (v10): extra Trix panels built from a route first.
//  room: a random path that covers every tile (Hamiltonian) → start/goal at its ends, every other tile a light,
//        walls added until that path is the only answer, then every wall that changes nothing is taken away.
//  dense: a block of number tiles packed together, a long random rope route winding around them, the numbers read off
//        that route, walls added until the shortest answer is unique, then numbers/walls that change nothing removed.
// Usage: node tools/trix_v10.js <id> <room|dense> <w> <h> [minTouch] [seed tries]  → prints JSON line; `merge f` adds.
const E = require('../src/panel_engine.js'), fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '../src/panels.json');
const ri = n => Math.floor(Math.random() * n), shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], K = (x, y) => x + ',' + y;
const solve = (p, cap = 1500000) => E.boxSolve(p, 80, 3, cap);
if (process.argv[2] === 'merge') {
  const all = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  for (const f of process.argv.slice(3)) for (const line of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
    const p = JSON.parse(line); const i = all.findIndex(q => q.id === p.id); if (i >= 0) all[i] = p; else all.push(p); console.log('merged', p.id);
  }
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1)); process.exit(0);
}
const [id, kind, W, H, minT = 0, budget = 120] = process.argv.slice(2).map((v, i) => i > 1 ? +v : v);
const cols = W + 1, rows = H + 1;
const T0 = Date.now();
// random self-avoiding walk with a bias toward tiles that have few free neighbours (keeps it long)
function walk(free, start, want) {
  let best = null;
  for (let t = 0; t < 400; t++) {
    const seen = new Set([K(...start)]), pth = [start];
    for (;;) {
      const [x, y] = pth[pth.length - 1];
      const nx = D4.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => free.has(K(a, b)) && !seen.has(K(a, b)));
      if (!nx.length) break;
      const deg = q => D4.filter(([dx, dy]) => free.has(K(q[0] + dx, q[1] + dy)) && !seen.has(K(q[0] + dx, q[1] + dy))).length;
      shuf(nx); nx.sort((a, b) => deg(a) - deg(b));
      const q = Math.random() < .8 ? nx[0] : nx[ri(nx.length)]; seen.add(K(...q)); pth.push(q);
    }
    if (!best || pth.length > best.length) best = pth;
    if (best.length >= want) break;
  }
  return best;
}
function edgesOff(p, pth) {   // links between neighbouring tiles that the route doesn't use
  const used = new Set(); for (let i = 1; i < pth.length; i++) used.add(E.ekey(...pth[i - 1], ...pth[i]));
  const out = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const a = [x, y], b = [x + dx, y + dy]; if (!E.inside(p, ...a) || !E.inside(p, ...b)) continue;
    if ((p.touch || []).some(t => (t[0] === a[0] && t[1] === a[1]) || (t[0] === b[0] && t[1] === b[1]))) continue;
    if (!used.has(E.ekey(...a, ...b))) out.push([...a, ...b]);
  }
  return out;
}
const sig = r => r.wins.length ? r.wins[0].length + ':' + Math.min(r.wins.length, 3) + (r.capped ? 'c' : '') : 'none';
function tighten(p, pth, route) {   // add walls (route stays legal) until the answer is unique
  let r = solve(p); if (r.capped) return null;
  const pool = shuf(edgesOff(p, pth));
  while (r.wins.length > 1) {
    let best = null;
    for (const e of pool.slice(0, 40)) {
      const q = { ...p, broken: (p.broken || []).concat([e]) }, rr = solve(q); if (rr.capped || !rr.wins.length) continue;
      const v = (rr.wins.length === 1 ? 1000 : 0) + rr.wins[0].length * 5 - rr.wins.length;
      if (!best || v > best.v) best = { e, v, rr };
    }
    if (!best) return null;
    p.broken = (p.broken || []).concat([best.e]); pool.splice(pool.indexOf(best.e), 1); r = best.rr;
    if (p.broken.length > 14) return null;
  }
  // drop walls / numbers that change nothing
  for (const k of ['broken', 'touch']) for (let i = (p[k] || []).length - 1; i >= 0; i--) {
    const q = { ...p, [k]: p[k].filter((_, j) => j !== i) }, rr = solve(q);
    if (!rr.capped && sig(rr) === sig(r) && rr.wins[0] === r.wins[0]) { p[k] = q[k]; r = rr; }
  }
  return r;
}
// Plain box on an all-lights map (lights toggle): the shortest answers are exactly the paths that visit every tile
// once, start → goal. Count them with a quick DFS instead of the general solver.
function hamCount(p, cap = 4000) {
  const BR = new Set((p.broken || []).map(e => E.ekey(...e))), cells = []; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (E.inside(p, x, y)) cells.push([x, y]);
  const idx = new Map(cells.map((c, i) => [K(...c), i])), nb = cells.map(([x, y]) => D4.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => idx.has(K(a, b)) && !BR.has(E.ekey(x, y, a, b))).map(q => idx.get(K(...q))));
  const st = idx.get(K(p.boxes[0].x, p.boxes[0].y)), g = idx.get(K(...p.exit[0])), N = cells.length, seen = new Uint8Array(N);
  let n = 0, first = null; const path = [st]; seen[st] = 1;
  (function go(v, d) {
    if (n >= cap) return;
    if (v === g) { if (d === N) { n++; if (!first) first = path.slice(); } return; }
    for (const w of nb[v]) if (!seen[w]) { seen[w] = 1; path.push(w); go(w, d + 1); path.pop(); seen[w] = 0; }
  })(st, 1);
  const dirs = first && first.slice(1).map((w, i) => { const a = cells[first[i]], b = cells[w]; return b[0] > a[0] ? 'R' : b[0] < a[0] ? 'L' : b[1] > a[1] ? 'D' : 'U'; }).join('');
  return { n, dirs };
}
function tightenHam(p, pth) {
  let c = hamCount(p); const pool = shuf(edgesOff(p, pth));
  while (c.n > 1) {
    let best = null;
    for (const e of pool) { const q = { ...p, broken: (p.broken || []).concat([e]) }, cc = hamCount(q); if (cc.n && (!best || cc.n < best.cc.n)) best = { e, cc }; }
    if (!best) return null;
    p.broken = (p.broken || []).concat([best.e]); pool.splice(pool.indexOf(best.e), 1); c = best.cc;
    if (p.broken.length > 10) return null;
  }
  for (let i = (p.broken || []).length - 1; i >= 0; i--) { const q = { ...p, broken: p.broken.filter((_, j) => j !== i) }; if (hamCount(q).n === 1) p.broken = q.broken; }
  c = hamCount(p);
  return c.n === 1 ? { wins: [c.dirs] } : null;
}
let made = null;
while (!made && Date.now() - T0 < budget * 1000) {
  const p = { id, girl: process.env.GIRL || 'trix', w: W, h: H, boxes: [], exit: [] };
  // a hole or two in the corners for shape
  const holes = []; if (Math.random() < .6) holes.push([[0, 0], [W, 0], [0, H], [W, H]][ri(4)]);
  for (let i = 0; i < (+process.env.HOLES || 0); i++) { const c = [[0, 0], [W, 0], [0, H], [W, H], [ri(cols), 0], [0, ri(rows)], [W, ri(rows)], [ri(cols), H]][ri(8)]; if (!holes.some(h => h[0] === c[0] && h[1] === c[1])) holes.push(c); }
  if (holes.length) p.holes = holes;
  if (kind === 'room') {
    const free = new Set(); for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (E.inside(p, x, y)) free.add(K(x, y));
    const st = [...free][ri(free.size)].split(',').map(Number);
    const pth = walk(free, st, free.size); if (pth.length !== free.size) continue;
    const plain = p.girl === 'prim';   // Prim: a landmine box; lights toggle, so the walk may never step back on one
    p.boxes = [plain ? { x: st[0], y: st[1], n: pth.length - 1 + 2 } : { x: st[0], y: st[1], trail: true }]; p.exit = [pth[pth.length - 1]];
    p.lights = pth.slice(1, -1);
    if (!E.boxWon(p, E.boxReplay(p, (() => { let o = ''; for (let i = 1; i < pth.length; i++) o += pth[i][0] > pth[i - 1][0] ? 'R' : pth[i][0] < pth[i - 1][0] ? 'L' : pth[i][1] > pth[i - 1][1] ? 'D' : 'U'; return o; })()))) continue;
    const route = pth;
    const r = plain ? tightenHam(p, pth) : tighten(p, pth, route); if (!r || r.wins.length !== 1) continue;
    // fewer lights: drop lights the walls already force (keep at least the map lit in the player's eyes = keep all)
    made = { p, r };
  } else {
    // a packed block of number tiles near the middle
    const bw = +process.env.BW || (W >= 4 ? 2 : 1), bh = +process.env.BH || (H >= 4 ? 2 : 1), bx = 1 + ri(Math.max(1, cols - bw - 1)), by = 1 + ri(Math.max(1, rows - bh - 1));
    const block = []; for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) block.push([x, y]);
    // plus one or two loose ones next to the block
    const near = shuf(block.flatMap(([x, y]) => D4.map(([dx, dy]) => [x + dx, y + dy])).filter(([x, y]) => x > 0 && y > 0 && x < cols - 1 && y < rows - 1 && !block.some(b => b[0] === x && b[1] === y)));
    const extra = near.slice(0, ri(3)); const blk = block.concat(extra).filter((q, i, a) => a.findIndex(z => z[0] === q[0] && z[1] === q[1]) === i);
    const free = new Set(); for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (E.inside(p, x, y) && !blk.some(b => b[0] === x && b[1] === y)) free.add(K(x, y));
    const st = [...free][ri(free.size)].split(',').map(Number);
    const pth = walk(free, st, free.size - 2); if (pth.length < free.size - 3) continue;
    const rope = new Set(pth.map(q => K(...q)));
    p.boxes = [{ x: st[0], y: st[1], trail: true }]; p.exit = [pth[pth.length - 1]];
    p.touch = blk.map(([x, y]) => [x, y, D4.filter(([dx, dy]) => rope.has(K(x + dx, y + dy))).length]).filter(t => t[2] > 0);
    if (p.touch.length < minT) continue;
    const r = tighten(p, pth, pth); if (!r || r.wins.length !== 1 || (p.touch || []).length < minT) continue;
    if (r.wins[0].length < pth.length - 4) continue;
    made = { p, r };
  }
}
if (!made) { console.error('FAILED', id); process.exit(1); }
const { p, r } = made;
['broken', 'touch', 'holes'].forEach(k => { if (p[k] && !p[k].length) delete p[k]; });
Object.assign(p, { solIn: r.wins[0], solutions: r.wins.length, minMoves: r.wins[0].length, feature: kind === 'room' ? 'roomAll' : 'touchDense' });
console.error(id, kind, `${W}x${H}`, 'len', p.minMoves, 'walls', (p.broken || []).length, 'numbers', (p.touch || []).length, ((Date.now() - T0) / 1000).toFixed(0) + 's');
console.log(JSON.stringify(p));
