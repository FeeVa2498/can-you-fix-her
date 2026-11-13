// Vel v9: glass tiles (`fragile`). Cross one and it cracks; leave it a second time and it falls away.
// Panels are built so the glass is the only way into a pocket of lights: you go in, light the pocket and must come
// back over the same glass (its last crossing) to reach the goal. Harder panels chain pockets, add arrow tiles and
// a second glass bridge whose order matters.
// Accepted only if: one or two shortest answers; every glass tile falls in the answer (crossed twice); turning any
// glass tile into a plain tile changes the shortest answers; removing any light changes them; no answer ever walks
// back onto a lit light.
// Usage: node tools/vel_v9.js [write]   (env SEC = seconds per panel, ONLY = id prefix)
const E = require('../src/panel_engine.js'), fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '../src/panels.json');
const ri = n => Math.floor(Math.random() * n), shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const K = (x, y) => x + ',' + y, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const sig = r => r.wins.length ? r.wins[0].length + ':' + r.wins.slice().sort().join(',') : 'none';
// [id, layer, n, cols, rows, glass, lights, holes share, pads, minLen, tut, belief]
// v11: about 20 per layer. Layers 1–2: glass + lights only (two kinds). Layer 3: glass + lights + arrow tiles.
// (second pass: the bigger maps were too slow to judge, so these stay at 6×5 or smaller)
const V11 = [];
{
  const L1 = [[4, 4, 1, 2], [5, 4, 1, 2], [4, 4, 1, 3], [5, 4, 2, 2], [5, 4, 1, 3], [5, 5, 1, 3], [5, 5, 2, 3], [6, 4, 2, 2], [6, 4, 1, 3], [5, 5, 2, 2], [6, 5, 1, 3], [6, 5, 2, 3], [6, 5, 2, 4]];
  L1.forEach(([c, r, g, l], k) => V11.push([`vel_1_${7 + k}`, 1, 7 + k, c, r, g, l, .18, 0, 8 + (k >> 1), null, '']));
  const L2 = [[5, 4, 1, 2], [5, 4, 2, 2], [5, 5, 2, 3], [5, 5, 2, 3], [5, 4, 1, 3], [5, 5, 1, 3], [6, 4, 2, 3], [5, 5, 2, 4], [6, 4, 1, 3], [6, 4, 2, 2], [5, 5, 1, 4], [6, 5, 1, 3], [6, 4, 2, 3], [5, 5, 2, 3], [6, 5, 2, 3], [6, 4, 1, 4], [6, 5, 1, 4], [5, 5, 2, 4], [6, 5, 2, 3], [6, 5, 1, 4]];
  L2.forEach(([c, r, g, l], k) => V11.push([`vel_2_${1 + k}`, 2, 1 + k, c, r, g, l, .2, 0, 9 + (k >> 2), null, '']));
  V11.push(['vel_3_t1', 3, 0, 5, 4, 1, 2, .15, 1, 7, 'pads', '']);
  const L3 = [[6, 5, 2, 3, 1], [6, 5, 2, 4, 1], [5, 5, 2, 3, 1], [6, 4, 2, 3, 1], [5, 5, 2, 4, 1], [6, 5, 1, 4, 1], [6, 4, 2, 4, 1], [5, 5, 1, 3, 2], [6, 5, 2, 3, 2], [6, 4, 1, 4, 2], [5, 5, 2, 3, 2], [6, 5, 1, 3, 1], [6, 5, 2, 4, 2], [6, 4, 2, 3, 2]];
  L3.forEach(([c, r, g, l, pd], k) => V11.push([`vel_3_${7 + k}`, 3, 7 + k, c, r, g, l, .2, pd, 12 + (k >> 2), null, '']));
}
const PLAN = [
  ['vel_1_t1', 1, 0, 4, 3, 1, 1, .1, 0, 5, 'fragile', 'glass floor. you get there, you get back. once.'],
  ['vel_1_1', 1, 1, 4, 4, 1, 2, .15, 0, 7, null, 'check your exits before you go in.'],
  ['vel_1_2', 1, 2, 5, 4, 1, 2, .18, 0, 8, null, 'in, clear the room, out. textbook.'],
  ['vel_1_3', 1, 3, 5, 4, 1, 3, .18, 0, 9, null, 'never walk the same hallway twice if you can help it.'],
  ['vel_1_4', 1, 4, 5, 5, 2, 2, .2, 0, 9, null, 'two bridges. pick which one burns first.'],
  ['vel_1_5', 1, 5, 5, 5, 1, 3, .2, 0, 10, null, 'the room looks safe. rooms always look safe.'],
  ['vel_1_6', 1, 6, 6, 5, 2, 3, .2, 0, 11, null, "you don't get a second trip. plan the first one."],
  ['vel_2_t1', 2, 0, 5, 4, 1, 2, .15, 1, 7, 'pads', 'launch pad + glass. fun combo. dangerous combo.'],
  ['vel_2_1', 2, 1, 5, 4, 2, 2, .18, 1, 9, null, 'slide in hot, walk out careful.'],
  ['vel_2_2', 2, 2, 5, 5, 2, 3, .2, 1, 10, null, 'every door you use is a door you lose.'],
  ['vel_2_3', 2, 3, 5, 5, 2, 3, .2, 0, 11, null, 'the second crossing is the one that counts.'],
  ['vel_2_4', 2, 4, 6, 5, 2, 3, .22, 1, 12, null, "i'm not reckless. i'm fast. different thing."],
  ['vel_2_5', 2, 5, 6, 5, 2, 3, .22, 0, 12, null, 'three bridges. one shot each way.'],
  ['vel_2_6', 2, 6, 6, 5, 2, 4, .2, 2, 13, null, 'cover the room, then get out of it.'],
  ['vel_2_7', 2, 7, 6, 5, 2, 4, .22, 1, 13, null, 'if i mess up the order, it all comes down.'],
  ['vel_3_1', 3, 1, 6, 5, 2, 4, .2, 0, 14, null, "people think i'm all noise. i count everything."],
  ['vel_3_2', 3, 2, 6, 5, 2, 4, .22, 1, 15, null, 'some days the floor holds. some days it doesn’t.'],
  ['vel_3_3', 3, 3, 6, 6, 2, 4, .22, 1, 17, null, 'too loud, too much, too fast. still standing.'],
  ['vel_3_4', 3, 4, 7, 5, 2, 5, .22, 1, 19, null, 'i break things. i also know exactly how much they take.'],
  ['vel_3_5', 3, 5, 6, 6, 2, 5, .24, 2, 20, null, 'every bridge i burn, i burned on purpose.'],
  ['vel_3_6', 3, 6, 7, 6, 2, 4, .24, 2, 19, null, "i'm not the bomb. i'm the one who defuses it."],
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
  const [id, layer, n, C, R, nG, nL, holeShare, nPads, minLen] = row;
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
  const sh = shuf(main.slice()); if (sh.length < 2) return null;
  const st = sh[0].split(',').map(Number), gl = sh[1].split(',').map(Number);
  p.boxes = [{ x: st[0], y: st[1] }]; p.exit = [gl];
  // lights: mostly in the pockets, sometimes one on the main part
  const pool = shuf(pockets.flat()).concat(shuf(main.slice(2)));
  p.lights = pool.slice(0, nL).map(k => k.split(',').map(Number));
  if (p.lights.length < nL) return null;
  p.fragile = glass.map(k => k.split(',').map(Number));
  // arrow tiles on the main part, pointing along a run of at least 2 tiles
  const used = new Set([...glass, K(...st), K(...gl), ...p.lights.map(q => K(...q))]);
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
const ALL = JSON.parse(fs.readFileSync(OUT, 'utf8'));
if (process.argv[2] === 'merge') {
  const got = process.argv.slice(3).flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  fs.writeFileSync(OUT, JSON.stringify(ALL.filter(p => p.girl !== 'vel').concat(got), null, 1)); console.log('merged', got.length); process.exit(0);
}
const made = [], SEC = +process.env.SEC || 40, ONLY = process.env.ONLY || '', IDS = process.env.IDS ? process.env.IDS.split(',') : null;
for (const row of (process.env.V11 ? V11 : PLAN)) {
  if (ONLY && !row[0].startsWith(ONLY)) continue;
  if (IDS && !IDS.includes(row[0])) continue;
  const t0 = Date.now(); let best = null, tries = 0;
  while (Date.now() - t0 < SEC * 1000) {
    tries++;
    const p = attempt(row); if (!p) continue;
    const r = judge(p, row[9], row[9] + (row[1] === 1 ? 5 : row[1] === 2 ? 7 : 9), !!row[10]); if (!r) continue;
    const score = r.wins[0].length * 10 - r.wins.length * 8 + (p.pads || []).length * 3;
    if (!best || score > best.score) best = { p, r, score };
    if (best && Date.now() - t0 > SEC * 500) break;   // a good one found and half the time used: stop
  }
  if (!best) { console.log(row[0], 'FAILED after', tries); continue; }
  const { p, r } = best;
  Object.assign(p, { solIn: r.wins[0], solutions: r.wins.length, minMoves: r.wins[0].length, belief: row[11], feature: 'fragile' });
  if (row[10]) p.tut = row[10]; else p.intro = undefined;
  if (!p.pads || !p.pads.length) delete p.pads;
  made.push(p); if (process.env.PART) fs.writeFileSync(process.env.PART, JSON.stringify(made));
  console.log(p.id.padEnd(9), `${p.w + 1}x${p.h + 1}`, 'glass', p.fragile.length, 'lights', p.lights.length, 'pads', (p.pads || []).length, 'len', p.minMoves, 'ways', p.solutions, `(${tries} tries)`);
}
if (process.env.PART) fs.writeFileSync(process.env.PART, JSON.stringify(made));
if (process.argv[2] === 'write') {
  const keep = ALL.filter(p => p.girl !== 'vel' || (ONLY && !p.id.startsWith(ONLY) && !made.some(m => m.id === p.id)));
  const out = ONLY ? ALL.filter(p => !made.some(m => m.id === p.id)).concat(made) : keep.concat(made);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log('wrote', made.length);
}
