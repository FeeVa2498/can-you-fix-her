// v12: more special tiles in layer 3. For every layer-3 panel (Prim, Trix, Paige) that uses at most one kind of
// special tile, try adding a portal pair and/or slide (arrow) tiles to the SAME panel, then re-solve it.
// Kept only if: still 1–3 shortest answers, not much shorter than before, no answer re-enters a lit light,
// and every added tile matters (take it away and the shortest answers change). At most 3 kinds per panel.
// Usage: PART=out.json [IDS=a,b] [GIRL=prim] SEC=60 node tools/v12_aug.js      merge: node tools/v12_aug.js merge a.json …
const E = require('../src/panel_engine.js'), fs = require('fs'), path = require('path');
const { pingPong } = require('./pad_loops.js');   // arrow tiles that throw a box back and forth are never allowed
const OUT = path.join(__dirname, '../src/panels.json');
const ALL = JSON.parse(fs.readFileSync(OUT, 'utf8'));
if (process.argv[2] === 'merge') {
  const got = process.argv.slice(3).flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8'))), m = new Map(got.map(p => [p.id, p]));
  fs.writeFileSync(OUT, JSON.stringify(ALL.map(p => m.get(p.id) || p), null, 1)); console.log('merged', got.length); process.exit(0);
}
const ri = n => Math.floor(Math.random() * n), K = (x, y) => x + ',' + y, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const sig = r => r.wins.length ? r.wins[0].length + ':' + r.wins.slice().sort().join(',') : 'none';
const KINDS = ['lights', 'touch', 'nums', 'pads', 'portals', 'oneway', 'switches', 'cracks', 'fragile', 'paints', 'dice'];
const kinds = p => KINDS.filter(k => (p[k] || []).length);
function relights(p, w) { let s = E.boxStart(p); const X = E.boxCtx(p); for (const c of w) { const n = E.boxStep(p, s, E.DK[c], false, X).state; for (const k of s.lit) if (!n.lit.has(k)) return true; s = n; } return false; }
function freeTiles(p) {
  const busy = new Set();
  const add = q => busy.add(K(q[0], q[1]));
  (p.holes || []).forEach(add); (p.exit || []).forEach(add); p.boxes.forEach(b => busy.add(K(b.x, b.y)));
  for (const k of [...(process.env.LIT ? [] : ['lights']), 'touch', 'dice', 'switches', 'fragile', 'cracks', 'paints', 'stops', 'broken']) (p[k] || []).forEach(add);
  (p.pads || []).forEach(add); (p.portals || []).forEach(q => { busy.add(K(q[0], q[1])); busy.add(K(q[2], q[3])); });
  const out = []; for (let y = 0; y <= p.h; y++) for (let x = 0; x <= p.w; x++) if (!busy.has(K(x, y))) out.push([x, y]);
  return { out, busy };
}
const holeAt = (p, x, y) => x < 0 || y < 0 || x > p.w || y > p.h || (p.holes || []).some(q => q[0] === x && q[1] === y) || (p.touch || []).some(q => q[0] === x && q[1] === y);
function mutate(p0, want) {
  const p = JSON.parse(JSON.stringify(p0)), added = [];
  const { out } = freeTiles(p); if (out.length < 3) return null;
  const take = () => { const i = ri(out.length); return out.splice(i, 1)[0]; };
  if (want.includes('portals')) {
    let a, b, t = 0; do { a = take(); b = out.length ? out[ri(out.length)] : null; t++; } while (b && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 3 && t < 20);
    if (!b) return null; out.splice(out.indexOf(b), 1);
    (p.portals = p.portals || []).push([a[0], a[1], b[0], b[1]]); added.push(['portals', p.portals.length - 1]);
  }
  if (want.includes('pads')) {
    const n = 1 + ri(2);
    for (let i = 0; i < n && out.length; i++) {
      const c = take(), ds = D4.filter(([dx, dy]) => !holeAt(p, c[0] + dx, c[1] + dy) && !holeAt(p, c[0] + 2 * dx, c[1] + 2 * dy));
      if (!ds.length) continue; const d = ds[ri(ds.length)];
      (p.pads = p.pads || []).push([c[0], c[1], d[0], d[1]]); added.push(['pads', p.pads.length - 1]);
    }
  }
  return added.length ? { p, added } : null;
}
function judge(p0, r0, cand, depth) {
  const { p, added } = cand, solve = q => E.boxSolve(q, depth, 6, 1200000);
  if (pingPong(p).length) return null;
  const r = solve(p); if (r.capped || !r.wins.length || r.wins.length > 3) return null;
  if (r.wins[0].length < r0.minMoves - 2) return null;
  if ((p.lights || []).length && r.wins.some(w => relights(p, w))) return null;
  const S0 = sig(r);
  for (const [k, i] of added) { const q = { ...p, [k]: p[k].filter((_, j) => j !== i) }; if (!q[k].length) delete q[k]; if (sig(solve(q)) === S0) return null; }
  return r;
}
const IDS = process.env.IDS ? process.env.IDS.split(',') : null, GIRL = process.env.GIRL, SEC = +process.env.SEC || 60;
// REPAD=1 IDS=…: take the panel's arrow tiles away and place new ones (none facing each other)
const REPAD = !!process.env.REPAD;
const targets = REPAD ? ALL.filter(p => IDS.includes(p.id)).map(p => { const q = JSON.parse(JSON.stringify(p)); q._orig = p.minMoves; delete q.pads; return q; }) : ALL.filter(p => p.layer === 3 && !p.tut && !p.ray && ['prim', 'trix', 'paige'].includes(p.girl) && kinds(p).length <= 1 && (!GIRL || p.girl === GIRL) && (!IDS || IDS.includes(p.id)));
const made = [];
for (const p0 of targets) {
  const has = kinds(p0), opts = REPAD ? [['pads']] : [];
  if (REPAD) { p0.minMoves = p0._orig; delete p0._orig; }
  else if (!has.includes('portals')) opts.push(['portals']);
  if (!REPAD && !has.includes('pads')) opts.push(['pads']);
  if (!REPAD && has.length <= 1 && !has.includes('portals') && !has.includes('pads')) opts.push(['portals', 'pads']);
  const depth = p0.minMoves + 8, t0 = Date.now(); let best = null, tries = 0;
  while (Date.now() - t0 < SEC * 1000) {
    tries++;
    const want = opts[ri(opts.length)], cand = mutate(p0, want); if (!cand) continue;
    const r = judge(p0, p0, cand, depth); if (!r) continue;
    const score = r.wins[0].length * 10 - r.wins.length * 8 + kinds(cand.p).length * 6;
    if (!best || score > best.score) best = { p: cand.p, r, score };
    if (Date.now() - t0 > SEC * 600) break;
  }
  if (!best) { console.log(p0.id.padEnd(10), 'kept as is', `(${tries} tries)`); continue; }
  const { p, r } = best;
  Object.assign(p, { solIn: r.wins[0], solutions: r.wins.length, minMoves: r.wins[0].length });
  made.push(p); if (process.env.PART) fs.writeFileSync(process.env.PART, JSON.stringify(made));
  console.log(p.id.padEnd(10), kinds(p0).join('+') || '-', '→', kinds(p).join('+'), 'len', p0.minMoves, '→', p.minMoves, 'ways', p.solutions, `(${tries} tries)`);
}
console.log('DONE');
