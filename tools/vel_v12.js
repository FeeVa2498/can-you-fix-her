// Vel v12: several boxes at once on glass + lights (+ arrow tiles in layer 3): plain boxes, the reverse twin
// (m:'opp', every key backwards) and the rocket box (dash: one press slides it until something stops it).
// Same acceptance as v9, plus: every special box matters (made plain, the shortest answers change).
// Usage: PART=out.json [IDS=a,b] SEC=60 node tools/vel_v12.js
const E = require('../src/panel_engine.js'), fs = require('fs'), path = require('path');
const ri = n => Math.floor(Math.random() * n), shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const K = (x, y) => x + ',' + y, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const sig = r => r.wins.length ? r.wins[0].length + ':' + r.wins.slice().sort().join(',') : 'none';
const B = {}, O = { m: 'opp' }, D = { dash: true };
// [id, layer, n, cols, rows, glass, lights, holes, pads, minLen, tut, belief, boxes]
const PLAN = [
  ['vel_2_t1', 2, 0, 4, 4, 1, 1, .1, 0, 5, 'many', "two of 'em now. same drill, double the trouble.", [B, B]],
  ['vel_2_t2', 2, 0, 4, 4, 1, 1, .1, 0, 5, 'opp', 'that one does everything backwards. like me on mondays.', [B, O]],
  ['vel_2_t3', 2, 0, 5, 4, 1, 1, .1, 0, 4, 'dash', 'rocket box. it does not stop till it hits something. relatable.', [D, B]],
  ...[[5, 4, 1, 2, [B, B]], [5, 4, 1, 2, [B, O]], [5, 4, 1, 2, [D, B]], [5, 5, 1, 2, [B, B]], [5, 5, 1, 3, [B, O]], [5, 5, 2, 2, [D, B]],
      [6, 4, 1, 3, [B, O]], [6, 4, 2, 2, [D, O]], [5, 5, 1, 2, [B, B, O]], [6, 5, 2, 3, [B, O]], [6, 5, 1, 3, [D, B, B]], [6, 5, 2, 3, [D, O]]]
    .map(([c, r, g, l, bx], k) => [`vel_2_m${k + 1}`, 2, 0, c, r, g, l, .18, 0, 8 + (k >> 2), null, '', bx]),
  ...[[5, 5, 1, 3, 1, [B, O]], [5, 5, 2, 2, 1, [D, B]], [6, 4, 1, 3, 1, [B, B]], [6, 4, 2, 3, 1, [D, O]], [6, 5, 1, 3, 1, [B, O]], [6, 5, 2, 3, 1, [D, B]], [5, 5, 1, 3, 2, [B, B, O]],
      [6, 5, 2, 3, 1, [B, O]], [6, 5, 2, 4, 2, [D, B]], [6, 4, 2, 3, 2, [D, O]], [6, 5, 1, 4, 1, [B, B, O]], [6, 5, 2, 3, 2, [D, B, O]], [6, 5, 2, 4, 1, [B, O]], [6, 5, 2, 4, 2, [D, O]]]
    .map(([c, r, g, l, pd, bx], k) => [`vel_3_m${k + 1}`, 3, 0, c, r, g, l, .18, pd, 10 + (k >> 2), null, '', bx]),
];
function articulation(cells) {   // tiles whose removal splits the floor
  const ids = [...cells], idx = new Map(ids.map((k, i) => [k, i])), disc = Array(ids.length).fill(-1), low = [], out = new Set(); let t = 0;
  const nb = k => { const [x, y] = k.split(',').map(Number); return D4.map(([dx, dy]) => K(x + dx, y + dy)).filter(q => cells.has(q)); };
  const dfs = (u, par) => {
    disc[u] = low[u] = t++; let ch = 0;
    for (const q of nb(ids[u])) { const v = idx.get(q); if (disc[v] < 0) { ch++; dfs(v, u); low[u] = Math.min(low[u], low[v]); if (par >= 0 && low[v] >= disc[u]) out.add(ids[u]); } else if (v !== par) low[u] = Math.min(low[u], disc[v]); }
    if (par < 0 && ch > 1) out.add(ids[u]);
  };
  if (ids.length) dfs(0, -1);
  return out;
}
function comps(cells, without) {
  const seen = new Set(), out = [];
  for (const c of cells) {
    if (seen.has(c) || without.has(c)) continue;
    const comp = [], q = [c]; seen.add(c);
    while (q.length) { const k = q.pop(); comp.push(k); const [x, y] = k.split(',').map(Number); for (const [dx, dy] of D4) { const n = K(x + dx, y + dy); if (cells.has(n) && !seen.has(n) && !without.has(n)) { seen.add(n); q.push(n); } } }
    out.push(comp);
  }
  return out;
}
function attempt(row) {
  const [id, layer, n, C, R, nG, nL, holeShare, nPads, minLen, tut, belief, BX] = row;
  const p = { id, girl: 'vel', layer, n, w: C - 1, h: R - 1, boxes: [], exit: [] };
  const cells = new Set(); for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) cells.add(K(x, y));
  const holes = []; const want = Math.round(C * R * holeShare);
  for (let i = 0; i < want * 3 && holes.length < want; i++) {
    const k = [...cells][ri(cells.size)]; cells.delete(k);
    if (comps(cells, new Set()).length !== 1) { cells.add(k); continue; }
    holes.push(k.split(',').map(Number));
  }
  if (holes.length) p.holes = holes;
  // glass on cut tiles; the pocket behind each one gets lights
  const art = shuf([...articulation(cells)]), glass = [];
  for (const k of art) {
    if (glass.length >= nG) break;
    if (glass.some(g => { const [a, b] = g.split(',').map(Number), [c, d] = k.split(',').map(Number); return Math.abs(a - c) + Math.abs(b - d) < 2; })) continue;
    glass.push(k);
  }
  if (glass.length < nG) return null;
  const parts = comps(cells, new Set(glass)).sort((a, b) => b.length - a.length);
  const main = parts[0], pockets = parts.slice(1).filter(c => c.length >= 1);
  if (!pockets.length) return null;
  // start and goal in the biggest part
  const nb = BX.length, sh = shuf(main.slice()); if (sh.length < nb * 2 + 1) return null;
  const sts = sh.slice(0, nb).map(k => k.split(',').map(Number)), gls = sh.slice(nb, nb * 2).map(k => k.split(',').map(Number));
  p.boxes = BX.map((b, i) => ({ x: sts[i][0], y: sts[i][1], ...b })); p.exit = gls;
  const st = sts[0], gl = gls[0];
  // lights: mostly in the pockets, sometimes one on the main part
  const pool = shuf(pockets.flat()).concat(shuf(sh.slice(nb * 2)));
  p.lights = pool.slice(0, nL).map(k => k.split(',').map(Number));
  if (p.lights.length < nL) return null;
  p.fragile = glass.map(k => k.split(',').map(Number));
  // arrow tiles on the main part, pointing along a run of at least 2 tiles
  const used = new Set([...glass, ...sts.map(q => K(...q)), ...gls.map(q => K(...q)), ...p.lights.map(q => K(...q))]);
  for (let i = 0; i < nPads; i++) {
    const cand = shuf(main.filter(k => !used.has(k)));
    for (const k of cand) {
      const [x, y] = k.split(',').map(Number), ds = shuf(D4.slice());
      const d = ds.find(([dx, dy]) => cells.has(K(x + dx, y + dy)) && cells.has(K(x + 2 * dx, y + 2 * dy)));
      if (d) { (p.pads = p.pads || []).push([x, y, d[0], d[1]]); used.add(k); break; }
    }
  }
  return p;
}
function relights(p, w) { let s = E.boxStart(p); const X = E.boxCtx(p); for (const c of w) { const n = E.boxStep(p, s, E.DK[c], false, X).state; for (const k of s.lit) if (!n.lit.has(k)) return true; s = n; } return false; }
function judge(p, minLen, maxLen, tut) {
  const solve = q => E.boxSolve(q, 44, 6, 700000);
  const r = solve(p); if (r.capped || !r.wins.length || r.wins.length > (p.layer === 3 ? 3 : 2) || r.wins[0].length < minLen || r.wins[0].length > maxLen) return null;
  if (r.wins.some(w => relights(p, w))) return null;
  // every glass tile falls in the answer
  const end = E.boxReplay(p, r.wins[0]); if (!p.fragile.every(q => end.crk.has(K(...q)))) return null;
  const S0 = sig(r);
  // glass matters: plain instead of glass changes the shortest answers
  if (!tut) for (let i = 0; i < p.fragile.length; i++) { const q = { ...p, fragile: p.fragile.filter((_, j) => j !== i) }; if (sig(solve(q)) === S0) return null; }
  for (let i = 0; i < p.lights.length; i++) { const q = { ...p, lights: p.lights.filter((_, j) => j !== i) }; if (sig(solve(q)) === S0) return null; }
  for (let i = 0; i < (p.pads || []).length; i++) { const q = { ...p, pads: p.pads.filter((_, j) => j !== i) }; if (sig(solve(q)) === S0) return null; }
  return r;
}
function judge(p, minLen, maxLen, tut) {
  const solve = q => E.boxSolve(q, maxLen + 1, 6, 900000);
  const r = solve(p); if (r.capped || !r.wins.length || r.wins.length > (p.layer === 3 ? 3 : 2) || r.wins[0].length < minLen || r.wins[0].length > maxLen) return null;
  if (r.wins.some(w => relights(p, w))) return null;
  const end = E.boxReplay(p, r.wins[0]); if (!p.fragile.every(q => end.crk.has(K(...q)))) return null;
  const S0 = sig(r);
  for (let i = 0; i < p.boxes.length; i++) { const b = p.boxes[i]; if (!b.m && !b.dash) continue; const q = { ...p, boxes: p.boxes.map((c, j) => j === i ? { x: c.x, y: c.y } : c) }; if (sig(solve(q)) === S0) return null; }
  if (tut) return r;
  for (let i = 0; i < p.fragile.length; i++) { const q = { ...p, fragile: p.fragile.filter((_, j) => j !== i) }; if (sig(solve(q)) === S0) return null; }
  for (let i = 0; i < p.lights.length; i++) { const q = { ...p, lights: p.lights.filter((_, j) => j !== i) }; if (sig(solve(q)) === S0) return null; }
  for (let i = 0; i < (p.pads || []).length; i++) { const q = { ...p, pads: p.pads.filter((_, j) => j !== i) }; if (sig(solve(q)) === S0) return null; }
  return r;
}
const made = [], SEC = +process.env.SEC || 60, IDS = process.env.IDS ? process.env.IDS.split(',') : null;
for (const row of PLAN) {
  if (IDS && !IDS.includes(row[0])) continue;
  const t0 = Date.now(); let best = null, tries = 0;
  while (Date.now() - t0 < SEC * 1000) {
    tries++;
    const p = attempt(row); if (!p) continue;
    const r = judge(p, row[9], row[9] + (row[10] ? 5 : row[1] === 2 ? 8 : 10), !!row[10]); if (!r) continue;
    const score = row[10] ? -Math.abs(r.wins[0].length - row[9] - 2) * 10 - r.wins.length * 8 : r.wins[0].length * 10 - r.wins.length * 8 + (p.pads || []).length * 3;
    if (!best || score > best.score) best = { p, r, score };
    if (best && Date.now() - t0 > SEC * 500) break;
  }
  if (!best) { console.log(row[0], 'FAILED after', tries); continue; }
  const { p, r } = best;
  Object.assign(p, { solIn: r.wins[0], solutions: r.wins.length, minMoves: r.wins[0].length, belief: row[11], feature: row[10] || (p.boxes.some(b => b.dash) ? 'dash' : p.boxes.some(b => b.m) ? 'opp' : 'many') });
  if (row[10]) p.tut = row[10];
  if (!p.pads || !p.pads.length) delete p.pads;
  made.push(p); if (process.env.PART) fs.writeFileSync(process.env.PART, JSON.stringify(made));
  console.log(p.id.padEnd(9), `${p.w + 1}x${p.h + 1}`, 'boxes', p.boxes.map(b => b.dash ? 'D' : b.m ? 'O' : 'B').join(''), 'glass', p.fragile.length, 'lights', p.lights.length, 'pads', (p.pads || []).length, 'len', p.minMoves, 'ways', p.solutions, `(${tries} tries)`);
}
console.log('DONE');
