// Designs + verifies the Test-chamber panels → src/panels.json
//   node tools/design_v3.js            all girls
//   node tools/design_v3.js vel        one girl (PART=file.json writes just her panels, for parallel runs)
// Kept as they are: Prim layers 1–2, Trix layer 1.
// Single-line panels: random map features → enumerate routes that really use the feature →
// add clue units (walls, holes, dots, numbers…) agreeing with one winding route until at most
// `target` answers remain → prune clues that aren't needed.
// Box panels (Vel, Myne): random walls/holes/tiles → breadth-first search for the shortest key
// sequences → keep maps with few shortest answers that random play almost never solves.
const E = require('../src/panel_engine.js');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '../src/panels.json');
const ONLY = process.argv[2];

let seed = 1;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const ri = n => Math.floor(rnd() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const turns = pth => pth.slice(2).filter((n, i) => (n[0] - pth[i][0]) && (n[1] - pth[i][1])).length;
const CLUES = ['sketch', 'avoid', 'squares', 'nums', 'dots', 'broken', 'oneway', 'holes'];
const USED = new Set();

const allNodes = p => { const o = []; for (let y = 0; y <= p.h; y++) for (let x = 0; x <= p.w; x++) if (E.inside(p, x, y)) o.push([x, y]); return o; };
function allEdges(p) { const o = []; for (const [x, y] of allNodes(p)) for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) if (E.inside(p, nx, ny)) o.push([x, y, nx, ny]); return o; }
const cells = p => { const o = []; for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) o.push([x, y]); return o; };
const borderNodes = p => allNodes(p).filter(([x, y]) => x === 0 || y === 0 || x === p.w || y === p.h);

/* ---------- random map features ---------- */
function special(p) { return new Set([...(p.start || []), ...(p.exit || []), ...(p.pads || []), ...(p.stops || []), ...(p.bridges || []), ...(p.portals || []).flatMap(q => [[q[0], q[1]], [q[2], q[3]]]), ...(p.plates || [])].map(n => n[0] + ',' + n[1])); }
function features(spec, base) {
  const p = clone(base), g = spec.gen || {};
  const free = () => shuffle(allNodes(p).filter(n => !special(p).has(n.join(','))));
  if (g.ends) {   // start and exit anywhere (exit inside the board or on the border)
    const ns = shuffle(allNodes(p)), s = ns[0];
    const ex = ns.find(n => Math.abs(n[0] - s[0]) + Math.abs(n[1] - s[1]) >= Math.max(p.w, p.h));
    p.start = [s]; p.exit = [ex || ns[1]];
  }
  for (let i = 0; i < (g.holes || 0); i++) { const n = free()[0]; if (n) (p.holes = p.holes || []).push(n); }
  for (let i = 0; i < (g.portals || 0); i++) { const f = free(); const a = f[0], b = f.find(n => Math.abs(n[0] - a[0]) + Math.abs(n[1] - a[1]) >= 3); if (b) (p.portals = p.portals || []).push([...a, ...b]); }
  for (let i = 0; i < (g.bridges || 0); i++) { const n = free().find(([x, y]) => x > 0 && y > 0 && x < p.w && y < p.h); if (n) (p.bridges = p.bridges || []).push(n); }
  for (let i = 0; i < (g.pads || 0); i++) { const n = free()[0]; const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][ri(4)]; if (n) (p.pads = p.pads || []).push([...n, ...d]); }
  for (let i = 0; i < (g.stops || 0); i++) { const n = free()[0]; if (n) (p.stops = p.stops || []).push(n); }
  addSwitches(p, g, () => free()[0]);
  return p;
}
// plates and gates. g.plates (count), g.gates (normal gates), g.toggle (inverted gates), g.ch (channels)
function addSwitches(p, g, pickNode) {
  const ch = g.ch || 1;
  for (let i = 0; i < (g.plates || 0); i++) { const n = pickNode(); if (n) (p.plates = p.plates || []).push([...n, i % ch]); }
  if (!(p.plates || []).length) return;
  const used = new Set([...(p.broken || []), ...(p.gates || [])].map(e => E.ekey(e[0], e[1], e[2], e[3])));
  const add = inv => { const e = shuffle(allEdges(p)).find(e => !used.has(E.ekey(...e))); if (!e) return; used.add(E.ekey(...e)); (p.gates = p.gates || []).push([...e, ri(ch), inv]); };
  for (let i = 0; i < (g.gates || 0); i++) add(0);
  for (let i = 0; i < (g.toggle || 0); i++) add(1);
}
const gateSet = p => new Set((p.gates || []).map(e => E.ekey(e[0], e[1], e[2], e[3])));
// the route actually uses what the panel is about
function usesFeatures(p, sol, need = {}) {
  const st = E.replay(p, sol); if (!st) return false;
  if (need.portals && st.jump.filter(Boolean).length < need.portals) return false;
  if (need.pads && sol.filter(n => E.padAt(p, ...n)).length < need.pads) return false;
  if (need.slides && st.forced.filter((f, i) => f && !st.jump[i]).length < need.slides) return false;
  if (need.bridges && !(p.bridges || []).some(b => sol.filter(n => n[0] === b[0] && n[1] === b[1]).length === 2)) return false;
  if (need.stops && !sol.some(n => E.isStop(p, ...n))) return false;
  if (need.gate || need.toggle) {
    const kinds = new Map((p.gates || []).map(e => [E.ekey(e[0], e[1], e[2], e[3]), e[5]])), hit = { 0: 0, 1: 0 };
    for (let i = 1; i < sol.length; i++) { if (st.jump[i]) continue; const k = kinds.get(E.ekey(...sol[i - 1], ...sol[i])); if (k !== undefined) hit[k ? 1 : 0]++; }
    if (hit[0] < (need.gate || 0) || hit[1] < (need.toggle || 0)) return false;
  }
  return true;
}

/* ---------- clue units that agree with the intended route ---------- */
function units(p, sol, kinds, spec = {}) {
  const st = E.replay(p, sol), used = E.usedEdges(p, sol, st.jump), U = [];
  const onRoute = new Set(E.lines(p, sol).flat().map(n => n.join(',')));
  const sp = special(p);
  for (const k of kinds) {
    if (k === 'sketch') allEdges(p).filter(e => used.has(E.ekey(...e))).forEach(e => U.push({ k, add: [['sketch', e]] }));
    if (k === 'avoid' || k === 'broken') allEdges(p).filter(e => !used.has(E.ekey(...e)) && !gateSet(p).has(E.ekey(...e)) && (onRoute.has(e[0] + ',' + e[1]) || onRoute.has(e[2] + ',' + e[3]))).forEach(e => U.push({ k, add: [[k, e]] }));
    if (k === 'oneway') for (let i = 1; i < sol.length; i++) if (!st.jump[i] && !st.forced[i]) U.push({ k, add: [['oneway', [...sol[i - 1], ...sol[i]]]] });
    if (k === 'holes') allNodes(p).filter(n => !onRoute.has(n.join(',')) && !sp.has(n.join(','))).forEach(n => U.push({ k, add: [['holes', n]] }));
    if (k === 'dots') sol.slice(1, -1).filter(n => !sp.has(n.join(','))).forEach(n => U.push({ k, add: [['dots', n]] }));
    if (k === 'nums') cells(p).filter(([x, y]) => [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].every(n => E.inside(p, ...n)))
      .map(([x, y]) => [x, y, E.cellSides(x, y).filter(s => used.has(s)).length]).filter(c => c[2] >= (spec.numMin || 0) && c[2] <= (spec.numMax ?? 4)).forEach(c => U.push({ k, cells: [[c[0], c[1]]], add: [['nums', c]] }));
    if (k === 'squares') {
      const reg = E.regions(p, used), side = { 0: 0 }, q = [0];
      const adj = r => { const o = new Set(); reg.list[r].forEach(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const t = reg.reg[(x + dx) + ',' + (y + dy)]; if (t !== undefined && t !== r) o.add(t); })); return o; };
      while (q.length) { const a = q.shift(); adj(a).forEach(b => { if (side[b] === undefined) { side[b] = 1 - side[a]; q.push(b); } }); }
      cells(p).forEach(([x, y]) => U.push({ k, cells: [[x, y]], add: [['squares', [x, y, side[reg.reg[x + ',' + y]] ? 'ink' : 'pink']]] }));
    }
  }
  return U;
}
function applyUnits(base, list) { const q = clone(base); list.forEach(u => u.add.forEach(([f, v]) => (q[f] = q[f] || []).push(clone(v)))); return q; }
function good(q, sol, target) {
  if (!E.validate(q, sol).ok) return false;
  const s = E.solve(q, target + 1);
  return target === 1 ? s.length === 1 && same(s[0], sol) : s.length >= 1 && s.length <= target;
}
const needOk = (q, need) => Object.entries(need || {}).every(([f, n]) => (q[f] || []).length >= n);

function designSingle(spec) {
  const target = spec.target || 1, kinds = spec.clues || [];
  for (let attempt = 0; attempt < (spec.gen ? 40 : 1); attempt++) {
    let base = { id: spec.id, girl: spec.girl, layer: spec.layer, n: spec.n, ...clone(spec.base) };
    if (spec.gen) base = features(spec, base);
    let routes = E.solve(base, 250000).filter(s => !USED.has(JSON.stringify(s)) && usesFeatures(base, s, spec.uses) && (!spec.filter || spec.filter(s, base)));
    if (!routes.length) continue;
    routes.sort((a, b) => turns(b) - turns(a) || b.length - a.length);
    routes = shuffle(routes.slice(0, Math.max(6, Math.ceil(routes.length * (spec.top || .3)))));
    for (const sol of routes.slice(0, 25)) {
      const pool = units(base, sol, kinds, spec);
      const lead = shuffle(pool.filter(u => (spec.lead || []).includes(u.k))), rest = shuffle(pool.filter(u => !(spec.lead || []).includes(u.k)));
      const order = lead.slice(0, spec.leadN || 3).concat(shuffle(rest.concat(lead.slice(spec.leadN || 3))));
      const chosen = [], occ = new Set();
      let q = clone(base);
      if (spec.exactMoves) q.moves = E.replay(base, sol).moves;
      for (const u of order) {
        if (good(q, sol, target) && needOk(q, spec.need)) break;
        if ((u.cells || []).some(c => occ.has(c.join(',')))) continue;
        chosen.push(u); (u.cells || []).forEach(c => occ.add(c.join(','))); q = applyUnits(base, chosen); if (spec.exactMoves) q.moves = E.replay(base, sol).moves;
      }
      if (!good(q, sol, target)) continue;
      for (let i = chosen.length - 1; i >= 0; i--) {
        const t = chosen.slice(0, i).concat(chosen.slice(i + 1)); const tq = applyUnits(base, t); if (spec.exactMoves) tq.moves = q.moves;
        if (needOk(tq, spec.need) && good(tq, sol, target)) chosen.splice(i, 1);
      }
      q = applyUnits(base, chosen); if (spec.exactMoves) q.moves = E.replay(base, sol).moves;
      if (!needOk(q, spec.need)) continue;
      const walls = (q.broken || []).length + (q.avoid || []).length;
      if (walls > (spec.walls || 9)) continue;
      if (CLUES.reduce((a, f) => a + (q[f] || []).length, 0) > (spec.max || 20)) continue;
      const sols = E.solve(q, 61);
      q.sol = sols.find(s => same(s, sol)) || sols[0]; q.solutions = sols.length > 60 ? '60+' : sols.length;
      q.minMoves = E.replay(q, q.sol).moves;
      USED.add(JSON.stringify(q.sol));
      return q;
    }
  }
  throw new Error(spec.id + ': could not design');
}

/* ---------- line → rope box (every panel is a box panel now) ---------- */
// start → rope box, exit → goal, dots / pencil lines / visit-all → light tiles, avoid → wall, plates+gates → switch+door
function lineToBox(p) {
  const q = { id: p.id, girl: p.girl, layer: p.layer, n: p.n, w: p.w, h: p.h };
  ['holes', 'broken', 'oneway', 'portals', 'pads', 'stops', 'nums'].forEach(k => { if ((p[k] || []).length) q[k] = clone(p[k]); });
  if ((p.avoid || []).length) q.broken = (q.broken || []).concat(clone(p.avoid));
  q.boxes = [{ x: p.start[0][0], y: p.start[0][1], trail: true }];
  q.exit = p.exit.map(e => [e[0], e[1]]);
  const L = new Map(), addL = (x, y) => { if (!(x === p.start[0][0] && y === p.start[0][1])) L.set(x + ',' + y, [x, y]); };
  (p.dots || []).forEach(([x, y]) => addL(x, y));
  (p.sketch || []).forEach(e => { addL(e[0], e[1]); addL(e[2], e[3]); });
  if (p.visitAll) allNodes(p).forEach(([x, y]) => addL(x, y));
  p.exit.forEach(([x, y]) => L.delete(x + ',' + y));
  if (L.size) q.lights = [...L.values()];
  if ((p.plates || []).length) { q.switches = p.plates.map(([x, y, ch]) => [x, y, ch + 1]); q.doors = (p.gates || []).map(g => [g[0], g[1], g[2], g[3], g[4] + 1]); }
  const st = E.replay(p, p.sol); let keys = '';
  for (let i = 1; i < p.sol.length; i++) if (!st.forced[i]) keys += E.dirKey([p.sol[i][0] - p.sol[i - 1][0], p.sol[i][1] - p.sol[i - 1][1]]);
  let r = E.boxSolve(q, 60, 8, 600000);
  const cand = p.sol.slice(1, -1).filter(([x, y]) => !(q.lights || []).some(l => l[0] === x && l[1] === y));
  while (r.wins.length > 2 && cand.length) {
    let best = null;
    for (const c of cand) { const t = { ...q, lights: (q.lights || []).concat([c]) }, rr = E.boxSolve(t, 60, 8, 600000); if (rr.wins.length && (!best || rr.wins.length < best.r.wins.length)) best = { c, r: rr }; }
    if (!best) break;
    q.lights = (q.lights || []).concat([best.c]); cand.splice(cand.indexOf(best.c), 1); r = best.r;
  }
  const win = r.wins.length ? r.wins[0] : keys;
  return Object.assign(q, { solIn: win, solutions: r.wins.length || 1, minMoves: win.length });
}

/* ---------- box panels ---------- */
function randomPlay(p, len, tries = 1500) {
  let wins = 0; const X = E.boxCtx(p);
  for (let t = 0; t < tries; t++) { let s = E.boxStart(p); for (let i = 0; i < len; i++) { s = E.boxStep(p, s, E.DK['RLDU'[ri(4)]], false, X).state; if (s.dead >= 0) break; if (E.boxWon(p, s)) { wins++; break; } } }
  return wins / tries;
}
function boxStats(p, inputs) {
  let s = E.boxStart(p), desync = 0, left = false; const onGoal = q => (p.exit || []).some(g => g[0] === q[0] && g[1] === q[1]);
  const movesBy = p.boxes.map(() => 0), X = E.boxCtx(p);
  const hit = { door: 0, dbl: 0, crack: 0, paint: 0 }, swHits = (p.switches || []).map(() => 0);
  for (const c of inputs) {
    const before = s.pos.map(q => q.slice()), lens = s.tracks.map(t => t.length), r = E.boxStep(p, s, E.DK[c], true, X);
    r.moved.forEach((m, i) => { if (m) movesBy[i]++; });
    if (r.moved.some(Boolean) && r.moved.some(m => !m)) desync++;
    before.forEach((q, i) => { if (onGoal(q) && r.moved[i]) left = true; });
    r.state.tracks.forEach((t, i) => { for (let k = lens[i]; k < t.length; k++) {
      const n = t[k], sw = (p.switches || []).findIndex(q => q[0] === n[0] && q[1] === n[1]); if (sw >= 0) swHits[sw]++;
      if (r.state.jumps[i][k]) continue; if (X.door.has(E.ekey(...t[k - 1], ...n))) hit.door++; } });
    if (r.state.crk.size > s.crk.size) hit.crack++;
    if (r.state.col.some((c2, i) => c2 !== s.col[i])) hit.paint++;
    s = r.state;
  }
  hit.dbl = Math.max(0, ...(p.switches || []).map((q, i) => q[3] != null ? swHits[i] : 0));
  // painted boxes that end on a goal of their new colour
  const c0 = E.boxStart(p).col; hit.paintGoal = s.col.filter((c2, i) => c2 !== c0[i] && (p.exit || []).some(g => g[2] === c2 && g[0] === s.pos[i][0] && g[1] === s.pos[i][1])).length;
  return { s, desync, left, movesBy, hit };
}
/* The candidate checks every box panel must pass. Returns { r, best, L, luck } or null. */
// how long the answer may be, by position: early panels stay short, the curve climbs through the layers
const capLen = spec => spec.maxLen || (spec.tut ? 6 : ({ 1: 4, 2: 6, 3: 8 }[spec.layer] + Math.ceil(spec.n * 1.1)));
// a goal is a tile of its own: never on a portal, arrow tile, light, switch, crack, paint, white tile or sensor
function goalAlone(p) {
  const sp = new Set([...(p.portals || []).flatMap(q => [[q[0], q[1]], [q[2], q[3]]]), ...(p.pads || []), ...(p.lights || []), ...(p.switches || []), ...(p.cracks || []), ...(p.paints || []), ...(p.dice || []), ...(p.touch || []), ...(p.stops || [])].map(n => n[0] + ',' + n[1]));
  return (p.exit || []).every(g => !sp.has(g[0] + ',' + g[1]));
}
function relights(p, w) {
  let s = E.boxStart(p); const X = E.boxCtx(p);
  for (const c of w) { const n = E.boxStep(p, s, E.DK[c], false, X).state; for (const k of s.lit) if (!n.lit.has(k)) return true; s = n; }
  return false;
}
function checkBox(p, spec) {
  if (!goalAlone(p)) return null;
  const maxL = capLen(spec);
  let r = E.boxSolve(p, maxL, 8, 200000);
  if (!r.wins.length || r.capped) return null;
  // landmines (Prim): n = the moves that mine makes in a shortest answer; one more move and it blows
  if (spec.boxes.some(b => b.n) && !p.boxes.some(b => b.n != null)) {
    const mv = boxStats(p, r.wins[0]).movesBy, ex = spec.extra || [0, 2];
    if (spec.boxes.some((b, i) => b.n && !mv[i])) return null;
    // the moves it makes in a shortest answer, plus a little to spare (fewer moves used = more time left in the day)
    p._slack = spec.slack ?? 2;
    spec.boxes.forEach((b, i) => { if (b.n) p.boxes[i].n = mv[i] + p._slack; });
    const ns = p.boxes.filter(b => b.n != null).map(b => b.n);
    if (spec.distinct && new Set(ns).size < ns.length) return null;
    r = E.boxSolve(p, maxL, 8, 200000);
    if (!r.wins.length || r.capped) return null;
  }
  // every arrow tile and portal must be needed: take any one away and the panel can't be solved any more
  // need 2: every arrow tile / portal / one-way gap / door must matter (without it the shortest answers change)
  if (spec.need) for (const k of ['pads', 'portals', 'oneway', 'doors']) for (let i = 0; i < (p[k] || []).length; i++) {
    const q = { ...p, [k]: p[k].filter((_, j) => j !== i) };
    if (spec.need === 2) { const rr = E.boxSolve(q, capLen(spec) + 6, 8, 150000); if (rr.capped || (rr.wins.length === r.wins.length && rr.wins.length && rr.wins[0].length === r.wins[0].length && rr.wins.every(w => r.wins.includes(w)))) return null; }
    else { const rr = E.boxSolve(q, capLen(spec) + 6, 1, 150000); if (rr.wins.length || rr.capped) return null; }
  }
  const best = r.wins[0], L = best.length;
  if (L < (spec.minLen || 4)) return null;
  // lights toggle: never design a panel whose answers walk back onto a light already lit (no backtracking)
  if ((p.lights || []).length && p.boxes.some(b => !b.trail) && r.wins.some(w => relights(p, w))) return null;
  if (r.wins.length > (spec.maxShortest || 3)) return null;
  const st = boxStats(p, best), tr = st.s.tracks.flat(), allJ = st.s.jumps.flat();
  const u = spec.uses || {};
  if (u.pads && tr.filter(n => E.padAt(p, ...n)).length < u.pads) return null;
  if (u.stops && !tr.some(n => E.isStop(p, ...n))) return null;
  if (u.slide && !st.s.tracks.some(t => t.some((n, i) => { if (i < 2) return false; const pd = E.padAt(p, ...t[i - 1]); return pd && n[0] - t[i - 1][0] === pd[0] && n[1] - t[i - 1][1] === pd[1]; }))) return null;
  if (u.portals && allJ.filter(Boolean).length < u.portals) return null;
  if (u.oneway && !(p.oneway || []).some(e => st.s.tracks.some(t => t.some((n, i) => i && t[i - 1][0] === e[0] && t[i - 1][1] === e[1] && n[0] === e[2] && n[1] === e[3])))) return null;
  if (u.door && st.hit.door < u.door) return null;
  if (u.dbl && st.hit.dbl < u.dbl) return null;
  if (u.crack && st.hit.crack < u.crack) return null;
  if (u.paint && st.hit.paintGoal < u.paint) return null;
  if (spec.helpers && !st.movesBy[spec.boxes.length - 1]) return null;
  if (spec.leave && !st.left) return null;
  if (st.desync < (spec.desync || 0)) return null;
  const luck = randomPlay(p, L * 2, 600);
  if (luck > (spec.luck || .03)) return null;
  return { r, best, L, luck };
}
function finishBox(p, c) {
  // landmines: wall pruning can shorten the answer, so the numbers follow the final answer
  if (p.boxes.some(b => b.n != null)) { const mv = boxStats(p, c.best).movesBy; p.boxes.forEach((b, i) => { if (b.n != null) b.n = mv[i] + (p._slack || 0); }); c.r = E.boxSolve(p, 60, 8, 400000); c.best = c.r.wins[0]; c.L = c.best.length; }
  delete p._slack;
  const luck = randomPlay(p, c.L * 2);
  Object.assign(p, { solIn: c.best, solutions: c.r.wins.length, minMoves: c.L, luck: Math.round(luck * 1000) / 10 });
  if (c.score !== undefined) p.quality = Math.round(c.score * 10) / 10;
  return p;
}
/* How much thinking a box panel asks for:
   - bits: along the answer, how often exactly one of several different moves keeps you on a shortest route
   - dead: share of reachable positions from which the goals can no longer be reached (traps)
   - greedy: how often "walk every box toward the nearest goal" solves it (bad)
   - plus length, few answers, little clutter */
const bkey = E.boxKey;
function graphOf(p, cap = 30000) {
  const s0 = E.boxStart(p), X = E.boxCtx(p); s0.tracks = s0.jumps = null;
  const G = new Map([[bkey(s0), { s: s0, succ: [], win: E.boxWon(p, s0) }]]), q = [s0];
  let capped = false;
  while (q.length) {
    const s = q.shift(), node = G.get(bkey(s)); if (node.win) continue;
    for (const ch of 'RLDU') {
      const r = E.boxStep(p, s, E.DK[ch], false, X); if (!r.moved.some(Boolean) || r.dead >= 0) continue;
      const k = bkey(r.state); node.succ.push(k);
      if (!G.has(k)) { if (G.size >= cap) { capped = true; continue; } G.set(k, { s: r.state, succ: [], win: E.boxWon(p, r.state) }); q.push(r.state); }
    }
  }
  // distance to a win, backwards
  const back = new Map(); G.forEach((n, k) => n.succ.forEach(t => { if (!back.has(t)) back.set(t, []); back.get(t).push(k); }));
  const dist = new Map(), bq = []; G.forEach((n, k) => { if (n.win) { dist.set(k, 0); bq.push(k); } });
  while (bq.length) { const k = bq.shift(); for (const pk of back.get(k) || []) if (!dist.has(pk)) { dist.set(pk, dist.get(k) + 1); bq.push(pk); } }
  return { G, dist, capped, k0: bkey(s0) };
}
function greedyRate(p, L, tries = 24) {
  const goals = p.exit || [], X = E.boxCtx(p);
  const h = s => goals.reduce((a, g) => a + Math.min(99, ...s.pos.filter((q, i) => g[2] == null || s.col[i] === g[2]).map(q => Math.abs(q[0] - g[0]) + Math.abs(q[1] - g[1]))), 0);
  let wins = 0;
  for (let t = 0; t < tries; t++) {
    let s = E.boxStart(p); s.tracks = s.jumps = null; const seen = new Set([bkey(s)]);
    for (let i = 0; i < L * 3 + 4; i++) {
      const opts = 'RLDU'.split('').map(c => E.boxStep(p, s, E.DK[c], false, X)).filter(r => r.moved.some(Boolean) && r.dead < 0).map(r => ({ s: r.state, h: h(r.state) + (seen.has(bkey(r.state)) ? 3 : 0) + rnd() * .5 }));
      if (!opts.length) break;
      opts.sort((a, b) => a.h - b.h); s = opts[0].s; seen.add(bkey(s));
      if (E.boxWon(p, s)) { wins++; break; }
    }
  }
  return wins / tries;
}
function quality(p, c) {
  const { G, dist, k0 } = graphOf(p), X = E.boxCtx(p);
  let bits = 0, k = k0;
  for (const ch of c.best) {
    const node = G.get(k); if (!node) break; const d0 = dist.get(k);
    const succ = [...new Set(node.succ)], good = succ.filter(t => dist.get(t) === d0 - 1);
    if (succ.length >= 2 && good.length === 1) bits += Math.log2(succ.length);
    const r = E.boxStep(p, node.s, E.DK[ch], false, X); k = bkey(r.state);
  }
  let dead = 0; G.forEach((n, kk) => { if (!dist.has(kk)) dead++; });
  const deadR = dead / G.size, greedy = greedyRate(p, c.L);
  const clutter = (p.broken || []).length + (p.holes || []).length * .5 + ((p.lights || []).length + (p.nums || []).length) * .3;
  c.metrics = { bits: +bits.toFixed(1), dead: +deadR.toFixed(2), greedy: +greedy.toFixed(2), states: G.size };
  return bits * 1.4 + c.L * .25 + deadR * 4 - greedy * 10 - (c.r.wins.length - 1) * 1.5 - clutter * .12 - c.luck * 25;
}
// take away every wall the puzzle doesn't need (keeps the same constraints, never lowers the score)
function pruneWalls(p, c, spec) {
  let best = { p, c };
  for (const e of shuffle((p.broken || []).slice())) {
    const q = clone(best.p); q.broken = (q.broken || []).filter(b => E.ekey(...b) !== E.ekey(...e)); if (!q.broken.length) delete q.broken;
    const cc = checkBox(q, spec); if (!cc) continue;
    cc.score = quality(q, cc);
    if (cc.score >= best.c.score - .05) best = { p: q, c: cc };
  }
  return best;
}
/* Light tiles and numbers for rope boxes: explore every position, keep the ones where the goals are done,
   pick a long one as the intended answer, then add lights on its rope / numbers around it until no shorter
   finish keeps every clue and only a few as short ones do. */
function clueCover(p, spec) { const r = clueCover0(p, spec); delete p.litAll; return r; }
function clueCover0(p, spec) {
  const g = spec.gen || {}, cap = spec.cap || 40000, maxL = capLen(spec);
  // plain boxes light tiles by stepping on them: while exploring, remember every tile any box stepped on
  const plain = g.lights && !p.boxes.some(b => b.trail); if (plain) p.litAll = true;
  const X = E.boxCtx(p);
  const s0 = E.boxStart(p); s0.tracks = s0.jumps = null;
  const seen = new Set([bkey(s0)]); let fr = [s0]; const done = [];
  const goalsOk = s => !E.boxNeed({ ...p, lights: [], nums: [] }, s).goals.length;
  for (let depth = 1; depth <= maxL && fr.length; depth++) {
    const nx = [];
    for (const s of fr) for (const c of 'RLDU') {
      const r = E.boxStep(p, s, E.DK[c], false, X); if (!r.moved.some(Boolean) || r.dead >= 0) continue;
      const k = bkey(r.state); if (seen.has(k)) continue; seen.add(k);
      if (seen.size > cap) return null;
      nx.push(r.state); if (goalsOk(r.state)) done.push({ s: r.state, d: depth });
    }
    fr = nx;
  }
  const deep = done.filter(o => o.d >= (spec.minLen || 4) && o.s.trail.size + o.s.lit.size >= 3); if (!deep.length) return null;
  deep.sort((a, b) => b.d - a.d || b.s.trail.size - a.s.trail.size);
  const T = deep[ri(Math.max(1, Math.ceil(deep.length * .25)))], D = T.d;
  const sp = new Set([...(p.exit || []), ...p.boxes.map(b => [b.x, b.y]), ...(p.switches || []), ...(p.pads || []), ...(p.portals || []).flatMap(q => [[q[0], q[1]], [q[2], q[3]]])].map(n => n[0] + ',' + n[1]));
  const lit = s => { const o = new Set(s.trail); s.lit.forEach(k => o.add(k)); s.pos.forEach((q, i) => { if (p.boxes[i].trail) o.add(q.join(',')); }); return o; };
  const units = [];
  if (g.lights) [...lit(T.s)].filter(k => !sp.has(k)).forEach(k => units.push({ k: 'lights', v: k.split(',').map(Number), ok: s => lit(s).has(k) }));
  if (g.nums) cells(p).filter(([x, y]) => [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].every(n => E.inside(p, ...n))).forEach(([x, y]) => {
    const n = E.cellSides(x, y).filter(k => T.s.rope.has(k)).length; if (n < (spec.numMin ?? 1) || n > (spec.numMax ?? 3)) return;
    units.push({ k: 'nums', v: [x, y, n], ok: s => E.cellSides(x, y).filter(k => s.rope.has(k)).length === n });
  });
  if (g.touch) {   // sensor blocks: tiles the intended rope never covers, counting how many of their sides it touches
    const L = lit(T.s), starts = new Set(p.boxes.map(b => b.x + ',' + b.y));
    allNodes(p).forEach(([x, y]) => {
      const k = x + ',' + y; if (L.has(k) || sp.has(k) || starts.has(k)) return;
      const cnt = s2 => D4.filter(([dx, dy]) => s2.has((x + dx) + ',' + (y + dy))).length, n = cnt(L);
      if (n < (spec.numMin ?? 1) || n > (spec.numMax ?? 3)) return;
      units.push({ k: 'touch', v: [x, y, n], ok: s => { const l = lit(s); return !l.has(k) && cnt(l) === n; } });
    });
  }
  if (spec.cluster && g.touch) {   // number tiles packed close together: keep only those near one random centre
    const tu = units.filter(u => u.k === 'touch'); if (!tu.length) return null;
    const c = tu[ri(tu.length)].v, r = spec.cluster;
    for (let i = units.length - 1; i >= 0; i--) if (units[i].k === 'touch' && Math.max(Math.abs(units[i].v[0] - c[0]), Math.abs(units[i].v[1] - c[1])) > r) units.splice(i, 1);
  }
  let alive = done.filter(o => o.d <= D && o !== T);
  const chosen = [], room = { lights: g.lights || 0, nums: g.nums || 0, touch: g.touch || 0 };
  const short = () => alive.filter(o => o.d < D).length, ties = () => alive.filter(o => o.d === D).length;
  while ((short() || ties() > (spec.maxShortest || 3) - 1)) {
    let best = null; const cutters = [];
    for (const u of shuffle(units.slice())) { if (!room[u.k] || chosen.includes(u)) continue; const cut = alive.filter(o => !u.ok(o.s)).length; if (cut) cutters.push({ u, cut }); if (cut && (!best || cut > best.cut)) best = { u, cut }; }
    if (!best) return null;
    if (spec.clueRand && cutters.length) best = cutters[ri(cutters.length)];   // many small clues instead of a few big ones
    chosen.push(best.u); room[best.u.k]--; alive = alive.filter(o => best.u.ok(o.s));
  }
  if (spec.clueRand) {   // drop clues the others already imply
    const all0 = done.filter(o => o.d <= D && o !== T), okAll = (us, o) => us.every(u => u.ok(o.s));
    for (let i = chosen.length - 1; i >= 0; i--) {
      const rest = chosen.filter((_, j) => j !== i), al = all0.filter(o => okAll(rest, o));
      if (!al.some(o => o.d < D) && al.filter(o => o.d === D).length <= (spec.maxShortest || 3) - 1) chosen.splice(i, 1);
    }
    alive = all0.filter(o => okAll(chosen, o));
  }
  if (spec.minTouch && chosen.filter(u => u.k === 'touch').length < spec.minTouch) return null;
  if (chosen.length < (spec.minClues || 1)) {   // at least one clue the player has to read
    const extra = shuffle(units.filter(u => !chosen.includes(u) && room[u.k]))[0]; if (extra) chosen.push(extra);
  }
  chosen.forEach(u => (p[u.k] = p[u.k] || []).push(u.v));
  return p;
}
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function connected(p) {
  const all = allNodes(p); if (!all.length) return false;
  const seen = new Set([all[0].join(',')]), q = [all[0]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of D4) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && E.inside(p, x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  return seen.size === all.length;
}
/* Dice (Paige): roll the dice at random for a while; where they stop become the goals, and some of the tiles they
   stamped on the way become targets ("this tile must end up showing a 4"). More targets are added until only a few
   shortest answers are left. */
function diceCover(p, spec) {
  const g = spec.gen || {}, maxL = capLen(spec), Lw = Math.max(spec.minLen || 4, maxL - 2 - ri(3));
  const q = { ...p, diceAll: true, exit: [] }, X = E.boxCtx(q);
  let s = E.boxStart(q); s.tracks = s.jumps = null; let last = null;
  for (let k = 0; k < Lw; k++) {
    const opts = 'RLDU'.split('').filter(c => c !== last).map(c => ({ c, r: E.boxStep(q, s, E.DK[c], false, X) })).filter(o => o.r.moved.some(Boolean));
    if (!opts.length) return null;
    const o = opts[ri(opts.length)]; s = o.r.state; last = { R: 'L', L: 'R', U: 'D', D: 'U' }[o.c];
  }
  if (s.pos.some((q2, i) => q2[0] === p.boxes[i].x && q2[1] === p.boxes[i].y)) return null;
  p.exit = s.pos.map((q2, i) => p.boxes.length > 1 ? [...q2, s.col[i]] : q2.slice());
  const sp = new Set([...p.exit, ...p.boxes.map(b => [b.x, b.y]), ...(p.pads || []), ...(p.portals || []).flatMap(t => [[t[0], t[1]], [t[2], t[3]]])].map(n => n[0] + ',' + n[1]));
  const cand = shuffle([...s.stamp].filter(([k]) => !sp.has(k)).map(([k, v]) => [...k.split(',').map(Number), v]));
  if (cand.length < (g.dice || 1)) return null;
  p.dice = cand.splice(0, g.dice || 1);
  for (let extra = 0; extra <= (g.diceMore ?? 2); extra++) {
    const r = E.boxSolve(p, maxL, 8, 150000);
    if (!r.wins.length || r.capped) return null;
    if (r.wins.length <= (spec.maxShortest || 3) && r.wins[0].length >= (spec.minLen || 4)) return p;
    if (!cand.length) return null;
    p.dice.push(cand.shift());
  }
  return null;
}
/* Specs write colours relative to the girl: 0 = her own colour, 1..3 = another girl's colour in this order.
   Panels store the real colour (0 pink Prim, 1 red Trix, 2 purple Paige, 3 yellow Vel, 4 blue Myne). */
const GI = { prim: 0, trix: 1, paige: 2, vel: 3, myne: 4 }, ALT = { prim: [2, 4, 3], trix: [4, 3, 2], paige: [4, 3, 1], vel: [2, 4, 1], myne: [3, 1, 2] };   // pink stays Prim's (landmines)
const absHue = (girl, k) => k ? ALT[girl][k - 1] : GI[girl];
function absColors(p) {
  p.boxes.forEach(b => { if (b.c != null) { if (b.c) b.c = absHue(p.girl, b.c); else delete b.c; } });
  (p.exit || []).forEach(g => { if (g[2] != null) g[2] = absHue(p.girl, g[2]); });
  (p.paints || []).forEach(q => { q[2] = absHue(p.girl, q[2]); });
  return p;
}
function designBox(spec) {
  const g = spec.gen || {}, cands = [], T0 = Date.now();
  for (let attempt = 0; attempt < (spec.tries || 3000); attempt++) {
    if (Date.now() - T0 > (spec.time || 25000) * 2 && !cands.length) break;
    const p = { id: spec.id, girl: spec.girl, layer: spec.layer, n: spec.n, w: spec.w, h: spec.h };
    const taken = new Set(), pick = (ok = () => true) => { const n = shuffle(allNodes(p)).find(n => !taken.has(n.join(',')) && ok(n)); if (n) taken.add(n.join(',')); return n; };
    for (let i = 0; i < (g.holes || 0); i++) { const n = pick(); if (n) (p.holes = p.holes || []).push(n); }
    // bites: chunks taken out of the outline so maps get odd shapes
    for (let i = 0; i < (g.bites || 0); i++) {
      const border = allNodes(p).filter(([x, y]) => (x === 0 || y === 0 || x === p.w || y === p.h) && !taken.has(x + ',' + y));
      let n = border[ri(border.length)]; if (!n) break;
      for (let k = 0; k < 1 + ri(3) && n; k++) {
        taken.add(n.join(',')); (p.holes = p.holes || []).push(n);
        const nb = D4.map(([dx, dy]) => [n[0] + dx, n[1] + dy]).filter(q => E.inside(p, ...q) && !taken.has(q.join(',')));
        n = rnd() < .6 ? nb[ri(nb.length)] : null;
      }
    }
    if ((p.holes || []).length && !g.portals && !connected(p)) continue;   // with portals a split map is fine (they join it)
    taken.clear();
    p.broken = allEdges(p).filter(() => rnd() < (g.walls || .2));
    const boxes = spec.boxes.map(b => { const n = pick(); return n && { x: n[0], y: n[1], ...(b.m && b.m !== 'same' ? { m: b.m } : {}), ...(b.dash ? { dash: true } : {}), ...(b.trail ? { trail: true } : {}), ...(b.die ? { die: true } : {}), ...(b.c ? { c: b.c } : {}) }; });
    if (boxes.some(b => !b)) continue;
    p.boxes = boxes;
    const ng = spec.boxes.length - (spec.helpers || 0);
    p.exit = []; for (let i = 0; i < ng; i++) { const n = pick(); if (n) p.exit.push(spec.boxes[i].goal != null ? [...n, spec.boxes[i].goal] : spec.colored || spec.boxes[i].c ? [...n, spec.boxes[i].c || 0] : n); }
    // arrow tiles: with g.padMin, only where the slide runs at least that many tiles (a long slide is worth taking)
    for (let i = 0; i < (g.pads || 0); i++) {
      const br = new Set((p.broken || []).map(e => E.ekey(...e)));
      const run = (n, dd) => { let k = 0, x = n[0], y = n[1]; while (E.inside(p, x + dd[0], y + dd[1]) && !br.has(E.ekey(x, y, x + dd[0], y + dd[1]))) { x += dd[0]; y += dd[1]; k++; } return k; };
      let got = null;
      for (let t = 0; t < 30 && !got; t++) { const n = shuffle(allNodes(p)).find(q => !taken.has(q.join(','))), dd = D4[ri(4)]; if (n && run(n, dd) >= (g.padMin || 1)) got = [n, dd]; }
      if (got) {
        taken.add(got[0].join(',')); (p.pads = p.pads || []).push([...got[0], ...got[1]]);
        // g.padGoal: the first goal sits where that slide ends, so the arrow tile is the way in
        if (g.padGoal && i === 0) {
          let [x, y] = got[0]; const dd = got[1]; while (E.inside(p, x + dd[0], y + dd[1]) && !br.has(E.ekey(x, y, x + dd[0], y + dd[1]))) { x += dd[0]; y += dd[1]; }
          if (p.exit.length && !p.boxes.some(b => b.x === x && b.y === y)) { p.exit[0] = p.exit[0].length > 2 ? [x, y, p.exit[0][2]] : [x, y]; taken.add(x + ',' + y); }
        }
      }
    }
    for (let i = 0; i < (g.stops || 0); i++) { const n = pick(); if (n) (p.stops = p.stops || []).push(n); }
    for (let i = 0; i < (g.portals || 0); i++) { const a = pick(), b = a && pick(n => Math.abs(n[0] - a[0]) + Math.abs(n[1] - a[1]) >= 3); if (b) (p.portals = p.portals || []).push([...a, ...b]); }
    for (let i = 0; i < (g.litR || 0); i++) { const n = pick(); if (n) (p.lights = p.lights || []).push(n); }   // light tiles dropped at random (the search decides if they make a good panel)
    for (let i = 0; i < (g.cracks || 0); i++) { const n = pick(); if (n) (p.cracks = p.cracks || []).push(n); }
    for (const c of g.paints || []) { const n = pick(); if (n) (p.paints = p.paints || []).push([...n, c]); }
    for (let i = 0; i < (g.oneway || 0); i++) { const e = shuffle(allEdges(p)).find(e => !p.broken.some(b => E.ekey(...b) === E.ekey(...e))); if (e) (p.oneway = p.oneway || []).push(rnd() < .5 ? e : [e[2], e[3], e[0], e[1]]); }
    absColors(p);
    if (g.guard) {   // the first goals sit in walled bays whose only way in is a door (colour 1, or 1 and 2 with g.two)
      const brokenK = new Set(p.broken.map(e => E.ekey(...e)));
      let fail = false;
      p.exit.slice(0, g.guard).forEach((gl, gi) => {
        const links = shuffle(D4.map(([dx, dy]) => [gl[0], gl[1], gl[0] + dx, gl[1] + dy]).filter(e => E.inside(p, e[2], e[3])));
        if (!links.length) { fail = true; return; }
        links.slice(1).forEach(e => { if (!brokenK.has(E.ekey(...e))) { p.broken.push(e); brokenK.add(E.ekey(...e)); } });
        p.broken = p.broken.filter(e => E.ekey(...e) !== E.ekey(...links[0]));
        (p.doors = p.doors || []).push([...links[0], g.two ? (gi % 2) + 1 : 1]);
      });
      if (fail) continue;
    }
    for (let i = 0; i < (g.doors || 0); i++) { const e = shuffle(allEdges(p)).find(e => !p.broken.some(b => E.ekey(...b) === E.ekey(...e)) && !(p.doors || []).some(b => E.ekey(...b) === E.ekey(...e))); if (e) (p.doors = p.doors || []).push([...e, g.two ? (i % 2) + 1 : 1]); }
    if ((p.doors || []).length) {
      const cols = [...new Set(p.doors.map(d => d[4]))].sort();
      if (g.dbl) { const n = pick(); if (!n) continue; p.switches = [[...n, 1, 2]]; }
      else { p.switches = []; for (const c of cols) { const n = pick(); if (n) p.switches.push([...n, c]); } }
    }
    if (g.sym) {   // a closed maze that looks the same turned upside down: the twin always mirrors the first box exactly
      const rot = ([x, y]) => [p.w - x, p.h - y], same = (a, b) => a[0] === b[0] && a[1] === b[1];
      const a = [p.boxes[0].x, p.boxes[0].y], b = rot(a), ga = p.exit[0], gb = rot(ga);
      if (same(a, b) || same(ga, gb) || same(a, ga) || same(a, gb)) continue;
      p.boxes[1].x = b[0]; p.boxes[1].y = b[1]; p.exit = [ga, [...gb, ...p.exit[1].slice(2)]];
      const ks = new Set(), all = [];
      (p.broken || []).forEach(e => [e, [...rot([e[0], e[1]]), ...rot([e[2], e[3]])]].forEach(f => { const k = E.ekey(...f); if (!ks.has(k)) { ks.add(k); all.push(f); } }));
      p.broken = all;
      if (p.broken.length < (g.minWalls || 0)) continue;
    }
    if (!p.broken.length) delete p.broken;
    if (g.lightAll) {   // light the whole map: every tile is a light except where boxes start and the goals
      const skip = new Set([...p.boxes.map(b => b.x + ',' + b.y), ...p.exit.map(q => q[0] + ',' + q[1]), ...(p.pads || []).map(q => q[0] + ',' + q[1]), ...(p.portals || []).flatMap(q => [q[0] + ',' + q[1], q[2] + ',' + q[3]])]);
      p.lights = allNodes(p).filter(n => !skip.has(n.join(',')));
    }
    if (g.lights || g.nums || g.touch) { if (!clueCover(p, spec)) continue; }
    if (g.dice) { if (!diceCover(p, spec)) continue; }
    const c = checkBox(p, spec); if (!c) continue;
    if (spec.tut && !spec.pick) return finishBox(p, c);
    c.score = quality(p, c); cands.push({ p, c });
    if (cands.length >= (spec.pool || 36) || Date.now() - T0 > (spec.time || 25000)) break;
  }
  if (cands.length) {
    cands.sort((x, y) => y.c.score - x.c.score);
    const { p, c } = spec.gen && spec.gen.sym ? cands[0] : pruneWalls(cands[0].p, cands[0].c, spec);
    return finishBox(p, c);
  }
  throw new Error(spec.id + ': could not design box panel');
}

/* ---------- key ideas ---------- */
const RULE = {
  sketch: 'Nét chì mờ phải được tô lại.', avoid: 'Nét chì đen không được đi lên.', squares: 'Mực hồng và mực đen phải nằm ở các vùng khác nhau.',
  mirror: 'Bàn tay kia tự vẽ một đường đối xứng; hai đường không được chạm nhau.', nums: 'Con số trong ô = số cạnh của ô mà đường chạm vào.',
  visitAll: 'Phải đi qua mọi điểm.', dots: 'Chấm đen phải được đi qua.', broken: 'Đoạn đứt không đi được.', holes: 'Map có lỗ: chỗ trống không đi được.',
  oneway: 'Mũi tên trên đoạn nối: chỉ đi được theo chiều đó.', portals: 'Bước lên cổng thì đường xuất hiện ở cổng cùng màu (đang trượt thì trượt tiếp).',
  bridges: 'Cầu vượt: được đi qua hai lần, một lần ngang một lần dọc, luôn đi thẳng qua.', pads: 'Bệ phóng: giẫm lên là trượt theo mũi tên tới khi bị chặn.',
  stops: 'Ô phanh: đang trượt thì dừng lại ở đây.', moves: n => `Phải tới đích bằng đúng ${n} nước (mỗi lần ấn phím là một nước, cả cú trượt tính một nước).`,
  ends: 'Điểm xuất phát và đích có thể nằm ở bất kỳ đâu.',
  basic: 'Ấn WASD để lăn khối, kéo theo sợi dây phía sau; dây không được cắt qua chính nó. Đưa khối tới ô vàng.',
  plates: 'Công tắc: khi đường đã phủ lên nút tròn, các cổng cùng màu mở ra (cổng có sọc thì ngược lại: đóng lại).',
  twin: 'Hai đường song sinh: ấn trái thì đường hồng sang trái, đường tím sang phải (lên/xuống thì cùng chiều). Đường bị chặn thì đứng yên, đường kia vẫn đi. Mỗi đường tới đích của mình thì đỗ lại; thắng khi cả hai đã đỗ.',
};
const TIP = {
  nums: 'Ô "0" và ô "3" cho nhiều thông tin nhất: bắt đầu từ chúng.', sketch: 'Tìm đoạn chì chỉ nối được theo một cách.', squares: 'Hai ô khác màu nằm sát nhau buộc đường đi qua cạnh chung.',
  mirror: 'Coi trục giữa như tường.', portals: 'Coi hai cổng như một điểm.', bridges: 'Cầu vượt là chỗ duy nhất đường được cắt qua chính nó: dùng nó để quay lại vùng đã đi.',
  plates: 'Tìm cổng chắn lối duy nhất tới đích, rồi tính đường đi qua công tắc trước đó.',
  pads: 'Tính trước bệ phóng sẽ đưa bạn tới đâu; đôi khi phải tự tạo "tường" bằng chính đường đã vẽ để cú trượt dừng đúng chỗ.', moves: 'Đếm nước: cú trượt dài chỉ tính một nước, nên đường dài chưa chắc tốn nhiều nước.',
  twin: 'Dùng tường để làm hai đường lệch nhịp: một đường bị chặn đứng yên trong khi đường kia đi tiếp.', oneway: 'Mũi tên chặn đường quay lại: tính thứ tự trước khi đi.',
  visitAll: 'Góc chỉ có 2 lối nên đường đi qua góc theo đúng 2 lối đó.',
};
const BRULE = {
  goal: 'Mỗi phím điều khiển mọi hộp trên bảng cùng lúc; hộp bị chặn thì đứng yên. Đưa hộp vào ô goal.',
  colors: 'Hộp có màu của các cô gái (hồng, đỏ, tím, vàng, xanh): hộp màu nào phải vào goal màu đó; goal viền trắng nhận hộp nào cũng được.',
  trail: 'Hộp dây: lăn tới đâu để lại dây tới đó; dây là tường với mọi hộp, kể cả chính nó (đi nhầm thì ấn Z để lùi lại).',
  lights: 'Ô đèn: hộp bước vào ô đèn đang tắt thì đèn bật; bước vào lại ô đèn đang sáng thì đèn tắt (trượt ngang qua cũng tính). Dây nằm trên đèn thì đèn sáng luôn. Thắng khi mọi đèn đều sáng.',
  nums: 'Ô số cạnh: ô vuông viền đứt nối tâm bốn ô xung quanh, số ở giữa. Dây phải đi đúng ngần ấy cạnh của ô vuông đó (x/y cho biết đã có bao nhiêu; viền xanh khi đúng, đỏ khi thừa).',
  touch: 'Ô số (tấm đồng có số to ở giữa): không đi vào được; dây phải phủ đúng ngần ấy ô nằm sát 4 cạnh của nó. Mỗi cạnh có một đèn, sáng lên khi ô bên đó có dây; đủ số thì cả ô chuyển xanh, thừa thì đỏ.',
  switches: 'Ô chốt: hộp đi vào là mở hẳn mọi cửa cùng màu.',
  dbl: 'Ô công tắc hai màu: lúc đầu tường màu đang hiện trên công tắc dựng lên, tường màu kia hạ xuống. Giẫm vào thì tường màu đang hiện hạ xuống, tường màu kia trồi lên, công tắc đổi sang màu kia.',
  cracks: 'Ô nứt: hộp rời đi là ô sụp thành lỗ.',
  paints: 'Ô sơn: hộp đi vào bị đổi sang màu của ô.',
  pads: 'Ô mũi tên: hộp đi vào là trượt theo mũi tên tới cuối đường.',
  stops: 'Ô phanh (vuông cam): hộp đang trượt dừng lại ở đây.',
  portals: 'Cổng: hộp vào cổng này ra ở cổng cùng màu (đang trượt thì trượt tiếp).',
  oneway: 'Mũi tên trên khe: chỉ đi qua được theo chiều đó.',
  holes: 'Chỗ trống trên map không đi được.',
  dash: 'Hộp tên lửa: mỗi lần ấn, nó trượt tới khi đụng tường, hộp khác, dây hoặc cửa đóng.',
  budget: 'Hộp mìn (hồng): số trên hộp là số nước nó còn được đi; mỗi lần nó thật sự di chuyển thì giảm 1 (bị tường chặn thì không giảm). Về 0 mà còn bị bắt đi tiếp là mìn nổ, thua bàn. Số đó đúng bằng số nước của đường ngắn nhất: không có nước nào để phí.',
  dice: 'Xúc xắc: mỗi lần lăn là đổi mặt; ô nó đáp xuống bị in mặt đang úp xuống đất. Các ô trắng là giấy cần in: ĐỀ BÀI bên cạnh cho biết mỗi ô trắng phải mang số nào (lần in cuối cùng tính). In đúng hết rồi về goal mới thắng. Đi vào ô mũi tên thì xúc xắc trượt chứ không lăn, giữ nguyên mặt. Kéo chuột trên xúc xắc nháp để xoay thử.',
  mx: 'Hộp có vạch dọc: trái/phải bị đảo.', my: 'Hộp có vạch ngang: lên/xuống bị đảo.',
  opp: 'Hộp song sinh ngược (dấu chéo): làm ngược mọi phím, trái thành phải, lên thành xuống.',
  many: 'Có nhiều hộp: hộp chặn hộp, nên thứ tự đứng của chúng quan trọng.',
  nolock: 'Hộp vào goal không bị khoá, phím tiếp theo vẫn kéo nó đi. Thắng ngay khi mọi goal cùng có hộp đúng màu.',
  helpers: 'Có nhiều hộp hơn goal: hộp thừa là vật chắn, dùng nó để dừng hộp khác đúng chỗ.',
};
const BTIP = {
  pads: 'Lần ngược từ goal: hộp phải dừng ở goal, vậy cái gì chặn nó ở đó?', stops: 'Ô phanh là chỗ duy nhất giữa đường mà hộp đang trượt chịu dừng.',
  dash: 'Hộp tên lửa chỉ dừng cạnh vật chắn: tìm những ô có tường phía sau theo hướng bạn đi.', budget: 'Mìn chỉ đủ nước cho đường ngắn nhất: hộp nào tới goal trước phải được tường giữ đứng yên trong lúc hộp kia đi tiếp.', dice: 'Lần ngược từ ô số: mặt úp xuống phải là số đó, vậy nước lăn cuối vào ô phải đến từ hướng nào?',
  mx: 'Dùng tường để làm hai hộp lệch nhau.', many: 'Hộp đứng yên cũng là một bức tường cho hộp khác.',
  nolock: 'Đưa hộp tới goal sau cùng cùng lúc với hộp kia, hoặc kẹp một hộp vào tường cạnh goal để nó đứng yên chờ.', helpers: 'Đặt hộp thừa trước, rồi mới phóng hộp chính.',
  trail: 'Dây cũng là tường: kéo dây để tạo chỗ dừng cho hộp khác.', portals: 'Coi hai cổng như một ô.', opp: 'Hai hộp luôn đi ngược nhau: dùng tường giữ một hộp đứng yên trong khi hộp kia đi tiếp.', oneway: 'Khe một chiều không cho quay lại: tính thứ tự trước khi đi.',
  lights: 'Đèn ở góc hay ngõ cụt cho biết dây buộc phải vòng qua đâu.', roomAll: 'Thắp cả phòng: dây phải phủ mọi ô rồi mới tới goal. Ô góc và ngõ cụt chỉ có một hai lối: dây buộc phải đi qua chúng theo đúng lối đó, bắt đầu tính từ đấy.', touchDense: 'Các ô số đứng sát nhau dùng chung ô cạnh: một ô có dây có thể được hai, ba ô số cùng đếm. Bắt đầu từ ô số mà các ô quanh nó ít lựa chọn nhất.', lightAll: 'Mê cung: ô nào cũng là đèn, mà đi lại ô đã sáng là đèn tắt. Tìm một đường đi qua mỗi ô đúng một lần; ngõ cụt chỉ nên là điểm cuối.', touch: 'Ô số 3 gần như bị dây bao quanh; ô số 1 chỉ cho dây chạm một bên: bắt đầu từ chúng.', nums: 'Ô "1" và ô "3" cho nhiều thông tin nhất: bắt đầu từ chúng.',
  switches: 'Tìm cửa chặn lối duy nhất tới goal, rồi tính đường đi qua ô chốt trước đó.', dbl: 'Mỗi lần giẫm là đổi phe: tính xem hộp nào phải đi qua lúc tường xanh hạ, hộp nào lúc tường hồng hạ.',
  cracks: 'Đi qua ô nứt là đốt cầu: tính xem có cần quay lại không trước khi bước.', paints: 'Có khi hộp phải đi vòng qua ô sơn trước khi về goal.', colors: 'Mỗi màu một goal: xem hộp nào phải đi trước hộp nào.',
};
function boxRules(p) {
  const r = ['goal'];
  if (p.boxes.some(b => b.c != null && b.c !== E.girlHue(p)) || (p.exit || []).some(g => g[2] != null)) r.push('colors');
  if (p.boxes.some(b => b.trail)) r.push('trail');
  for (const f of ['lights', 'nums', 'touch', 'pads', 'stops', 'portals', 'oneway', 'holes', 'cracks', 'paints']) if ((p[f] || []).length) r.push(f);
  if ((p.switches || []).some(q => q[3] == null)) r.push('switches');
  if ((p.switches || []).some(q => q[3] != null)) r.push('dbl');
  if (p.boxes.some(b => b.dash)) r.push('dash');
  if (p.boxes.some(b => b.die)) r.push('dice');
  if (p.boxes.some(b => b.n != null)) r.push('budget');
  for (const m of ['mx', 'my', 'opp']) if (p.boxes.some(b => b.m === m)) r.push(m);
  if (p.boxes.length > 1) r.push('nolock');
  if (p.boxes.length > 2 || (p.boxes.length > 1 && p.boxes.every(b => !b.m))) r.push('many');
  if (p.boxes.length > (p.exit || []).length) r.push('helpers');
  return r;
}
function whyBox(p, spec) {
  const r = boxRules(p), intro = spec.intro && BRULE[spec.intro] ? spec.intro : null;
  let s = intro ? `Bảng dạy luật mới. ${BRULE[intro]} ` : '';
  s += 'Luật trên bảng: ' + r.filter(k => k !== intro).map(k => BRULE[k]).join(' ') + ' ';
  const tip = BTIP[spec.feature] || BTIP[intro] || BTIP[r[r.length - 1]] || BTIP[r[1]]; if (tip) s += 'Mẹo: ' + tip;
  return s.trim();
}
function whyFor(p, spec) {
  const r = [];
  if (p.twin) r.push('twin');
  for (const f of ['pads', 'stops', 'portals', 'bridges', 'plates', 'oneway', 'holes', 'sketch', 'avoid', 'squares', 'nums', 'dots', 'broken']) if ((p[f] || []).length) r.push(f);
  if (p.mirror) r.push('mirror'); if (p.visitAll) r.push('visitAll'); if (p.moves) r.push('moves');
  const t = k => typeof RULE[k] === 'function' ? RULE[k](p.moves) : RULE[k];
  let s = spec.intro ? `Bảng dạy luật mới. ${t(spec.intro)} ` : '';
  s += 'Luật trên bảng: ' + r.filter(k => k !== spec.intro).map(t).join(' ') + ' ';
  const tip = TIP[spec.feature || spec.intro || r[0]]; if (tip) s += 'Mẹo: ' + tip;
  return s.trim();
}

/* ======================= the panels ======================= */
const S = [];
const add = (girl, layer, n, o) => S.push({ id: `${girl}_${layer}_${n}`, girl, layer, n, ...o });
const SE = (w, h) => ({ w, h, start: [[0, h]], exit: [[w, 0]] });
const MIR = (w, h) => ({ w, h, start: [[0, h], [w, h]], exit: [[0, 0], [w, 0]], mirror: 'x' });

/* PRIM · layers 1–2 replacements for the old ink panels: pressure plates and gates */

/* PRIM · layer 3: the rules she already has, harder (no new rule) */

/* TRIX · layers 2–3: edge-count numbers, made harder with walls, holes, any start/exit, visit-all, one-way */

/* PAIGE · portals, overpasses, maps with holes, goals anywhere */
const PG = o => ({ clues: ['broken', 'dots'], lead: ['broken'], walls: 10, ...o });

/* VEL · boxes: dash tiles and stops, then the dash box, then move budgets and several boxes */
const BX = (w, h, boxes, o) => ({ box: true, w, h, boxes, ...o });
const B1 = [{}], D1 = [{ dash: true }];
add('vel', 1, 1, BX(3, 3, B1, { gen: { walls: .15, pads: 2 }, uses: { pads: 1 }, minLen: 3, luck: .15, intro: 'pads', belief: 'omg a launch pad!! ...trajectory confirmed.' }));
add('vel', 1, 2, BX(4, 3, B1, { gen: { walls: .2, pads: 3 }, uses: { pads: 2 }, minLen: 4, luck: .08, feature: 'pads', belief: "always have two exits. that's basic." }));
add('vel', 1, 3, BX(4, 4, B1, { gen: { walls: .2, pads: 3 }, uses: { pads: 1 }, minLen: 5, luck: .06, feature: 'pads', belief: 'cute outfit, full tactical plan underneath.' }));
add('vel', 1, 4, BX(4, 4, B1, { gen: { walls: .22, pads: 4, holes: 2 }, uses: { pads: 2 }, minLen: 6, luck: .05, feature: 'pads', belief: 'if the road is blocked, go around. or through.' }));
add('vel', 1, 6, BX(5, 5, B1, { gen: { walls: .22, pads: 5, holes: 3 }, uses: { pads: 3 }, minLen: 7, luck: .03, feature: 'pads', belief: "i'm fun at parties because i know where every exit is." }));
add('vel', 3, 1, BX(4, 3, [{ n: 1 }], { gen: { walls: .2, pads: 2 }, minLen: 4, luck: .06, intro: 'budget', belief: 'map the ground before you walk it.' }));
add('vel', 3, 2, BX(4, 4, [{ dash: true, n: 1 }], { gen: { walls: .2 }, minLen: 6, luck: .04, feature: 'budget', belief: "you don't step where you haven't checked. ever." }));
add('vel', 3, 3, BX(4, 4, [{ n: 1 }, { n: 1 }], { gen: { walls: .22 }, minLen: 5, luck: .03, feature: 'budget', belief: 'a story is a minefield. i know where i buried everything.' }));
add('vel', 3, 4, BX(5, 4, [{ dash: true, n: 1 }, { n: 1 }], { gen: { walls: .2, pads: 2 }, minLen: 6, luck: .03, feature: 'many', belief: 'swings and landmines. same drill.' }));
add('vel', 3, 6, BX(5, 5, [{ dash: true, n: 1 }, { dash: true, n: 1 }], { gen: { walls: .22, pads: 2, portals: 1 }, minLen: 7, luck: .02, feature: 'budget', belief: "if i'm in control, nothing explodes." }));

/* MYNE · twin boxes: every key moves both, one of them mirrored; boxes never lock in a goal */
const MX = [{}, { m: 'opp' }];   // the twin copies every key backwards: left↔right and up↔down
add('myne', 3, 1, BX(4, 3, [{ dash: true }, { m: 'opp', dash: true }], { gen: { walls: .25 }, minLen: 5, luck: .08, intro: 'dash', belief: 'boost pads! zoom!' }));
add('myne', 3, 2, BX(4, 4, MX, { gen: { walls: .2, pads: 3 }, uses: { pads: 1 }, minLen: 5, luck: .04, intro: 'pads', belief: "my body can't keep up. so my head runs for both." }));
add('myne', 3, 3, BX(4, 4, [{ dash: true }, { m: 'opp' }], { gen: { walls: .22, portals: 1 }, uses: { portals: 1 }, minLen: 6, luck: .03, intro: 'portals', belief: 'warp, dash, park. combo.' }));
add('myne', 3, 4, BX(4, 4, [{ trail: true }, { m: 'opp' }], { gen: { walls: .2 }, minLen: 6, luck: .03, desync: 1, intro: 'trail', belief: 'every direction is forward if you go fast enough.' }));

/* TUTORIALS · one tiny, very easy panel right before each mechanic first shows up (id <girl>_<layer>_t<n>) */
const TUT = (girl, layer, before, teach, o, k = 0) => S.push({ id: `${girl}_${layer}_t${before}${k ? 'b' : ''}`, girl, layer, n: before - .6 + k * .3, tut: teach, intro: o.intro || teach, belief: o.belief || '', ...o });
const EZ = o => ({ luck: 1, maxShortest: 6, minLen: 1, ...o });
TUT('vel', 1, 1, 'boxes', BX(2, 1, [{}], EZ({ gen: { walls: .01 }, minLen: 2, intro: 'goal' })));
TUT('vel', 1, 1, 'pads', BX(3, 1, [{}], EZ({ gen: { walls: .05, pads: 1 }, uses: { pads: 1, slide: 1 }, maxLen: 3 })), 1);
TUT('vel', 1, 5, 'portals', BX(3, 2, [{}], EZ({ gen: { walls: .05, portals: 1 }, uses: { portals: 1 }, maxLen: 4 })));
TUT('myne', 3, 4, 'trail', BX(2, 2, [{ trail: true }], EZ({ gen: { walls: .1 }, minLen: 2, maxLen: 4 })));


/* ======================= v4: everything is boxes =======================
   R = rope box, RO = reverse-twin rope box. Panels below replace the line panels that had overpasses,
   mirror lines or inverted gates, and every box panel that used the old pressure plates. */
const R = { trail: true }, RO = { trail: true, m: 'opp' };
/* PRIM · the other hand (twin ropes), locks and double locks, light tiles */
/* PAIGE · layer 2: cracked tiles (burnt bridges); layer 3: a rope box among other boxes, portals and cracks */
/* VEL · locks instead of plates, colours, countdowns that explode */
add('vel', 3, 5, BX(5, 4, [{ n: 1 }, { dash: true }, {}], { helpers: 1, gen: { walls: .2, guard: 1 }, uses: { door: 1 }, minLen: 5, luck: .03, feature: 'helpers' }));
add('vel', 3, 7, BX(5, 5, [{ n: 1 }, { dash: true, n: 1 }, {}], { helpers: 1, gen: { walls: .2, guard: 2, two: 1, dbl: 1 }, uses: { dbl: 2 }, minLen: 6, luck: .02, feature: 'dbl' }));
add('vel', 3, 8, BX(5, 4, [{ c: 1, n: 1 }, { c: 2, dash: true }, { c: 3 }], { gen: { walls: .2 }, minLen: 7, luck: .02, feature: 'colors', belief: 'three plans. three colours. zero surprises.' }));
/* MYNE · twins with locks and double locks, paint */
add('myne', 3, 5, BX(4, 4, [{ dash: true }, { m: 'opp' }], { gen: { walls: .18, guard: 2, two: 1, dbl: 1, pads: 1 }, uses: { dbl: 2 }, minLen: 6, luck: .02, feature: 'dbl' }));
add('myne', 3, 6, BX(5, 4, [R, { m: 'opp' }], { gen: { walls: .15, guard: 1, lights: 2 }, uses: { door: 1 }, minLen: 6, luck: .02, feature: 'trail' }));
add('myne', 3, 7, BX(5, 5, [{ n: 1 }, { m: 'opp', dash: true }, { m: 'opp' }], { helpers: 1, gen: { walls: .2, guard: 2, two: 1, dbl: 1, portals: 1 }, uses: { dbl: 2 }, minLen: 7, luck: .02, feature: 'many' }));
add('myne', 3, 8, BX(4, 4, [{ c: 1, goal: 2 }, { m: 'opp', c: 2, goal: 1 }], { gen: { walls: .2, paints: [2, 1] }, uses: { paint: 1 }, minLen: 6, luck: .03, feature: 'paints', belief: 'new skin, same player.' }));
add('myne', 3, 9, BX(4, 4, [{ c: 1 }, { m: 'opp', c: 2, goal: 1 }], { gen: { walls: .2, paints: [1] }, uses: { paint: 1 }, minLen: 6, luck: .02, feature: 'colors', belief: 'if i change fast enough, nobody sees the old me.' }));
/* TRIX · the rope box gets a countdown: count every move */

TUT('vel', 3, 7, 'dbl', BX(3, 2, [{}, {}], EZ({ gen: { walls: .05, guard: 2, two: 1, dbl: 1 }, uses: { dbl: 2 }, minLen: 2, maxLen: 7, tries: 3000 })));
TUT('myne', 3, 8, 'paints', BX(3, 1, [{ c: 1, goal: 2 }], EZ({ gen: { walls: .05, paints: [2] }, uses: { paint: 1 }, minLen: 2, maxLen: 5 })));


/* ======================= v5 · one box in layer 1, other selves from layer 2 =======================
   Layer 1: a single box and one or two tile mechanics. Layer 2: two to three mechanics, at most two boxes
   that need a goal, in her colour (0) and another self's colour (1). Rope boxes never share a panel with other boxes. */
const P0 = {}, A1 = { c: 1 }, T1 = { m: 'opp', c: 1 }, R0 = { trail: true }, R1 = { trail: true, c: 1 }, RT1 = { trail: true, m: 'opp', c: 1 };
const CL = o => ({ colored: 1, ...o });
add('vel', 1, 5, BX(5, 4, [P0], { gen: { walls: .2, pads: 2, portals: 1 }, uses: { pads: 1, portals: 1 }, minLen: 7, luck: .05, feature: 'portals' }));
/* MYNE · layer 1: one box; holes, one-way gaps, a bomb */
add('myne', 1, 1, BX(3, 3, [P0], { gen: { walls: .28, holes: 1 }, minLen: 5, luck: .08 }));
TUT('myne', 1, 2, 'oneway', BX(3, 1, [P0], EZ({ gen: { walls: .05, oneway: 1 }, uses: { oneway: 1 }, minLen: 2, maxLen: 5 })));
add('myne', 1, 2, BX(3, 3, [P0], { gen: { walls: .22, oneway: 2 }, uses: { oneway: 1 }, minLen: 6, luck: .06, feature: 'oneway' }));
add('myne', 1, 3, BX(4, 3, [{ n: 1 }], { gen: { walls: .22, holes: 1 }, minLen: 6, luck: .05, feature: 'budget' }));
add('myne', 1, 4, BX(4, 4, [{ n: 1 }], { gen: { walls: .22, oneway: 2 }, uses: { oneway: 1 }, minLen: 7, luck: .04, feature: 'budget' }));
add('myne', 1, 5, BX(4, 4, [P0], { gen: { walls: .22, oneway: 3, holes: 2 }, uses: { oneway: 2 }, minLen: 8, luck: .03, feature: 'oneway' }));
add('myne', 1, 6, BX(5, 4, [{ n: 1 }], { gen: { walls: .22, oneway: 2, holes: 1 }, uses: { oneway: 1 }, minLen: 9, luck: .03, feature: 'budget' }));
/* PRIM · layer 2: two ropes (her and another self), the reversed rope, lights, locks */
/* TRIX · layer 2: two ropes, numbers, one-way gaps, holes */
/* PAIGE · layer 2: plain boxes, cracked tiles, portals, two selves */
/* VEL · layer 2: rocket box, arrows, stops, two selves, a lock */
TUT('vel', 2, 1, 'dash', BX(2, 2, [{ dash: true }], EZ({ gen: { walls: .1 }, minLen: 2, maxLen: 4 })));
add('vel', 2, 1, BX(3, 3, [{ dash: true }], { gen: { walls: .2 }, minLen: 5, luck: .05, feature: 'dash' }));
add('vel', 2, 2, BX(4, 3, [{ dash: true }], { gen: { walls: .2, pads: 2 }, uses: { pads: 1 }, minLen: 6, luck: .04, feature: 'dash' }));
TUT('vel', 2, 3, 'colors', BX(3, 1, [P0, A1], EZ(CL({ gen: { walls: .05 }, minLen: 2, maxLen: 6 }))));
add('vel', 2, 3, BX(4, 3, [P0, A1], CL({ gen: { walls: .2, pads: 2 }, uses: { pads: 1 }, minLen: 7, luck: .03, feature: 'colors' })));
add('vel', 2, 4, BX(4, 4, [{ dash: true }, A1], CL({ gen: { walls: .2 }, minLen: 8, luck: .03, feature: 'dash' })));
add('vel', 2, 5, BX(4, 4, [P0, A1], CL({ gen: { walls: .18, guard: 1, pads: 1 }, uses: { door: 1 }, minLen: 9, luck: .02, feature: 'switches' })));
add('vel', 2, 6, BX(4, 4, [{ dash: true }, { dash: true, c: 1 }], CL({ gen: { walls: .2 }, minLen: 9, luck: .02, feature: 'dash' })));
add('vel', 2, 7, BX(5, 4, [{ dash: true }, A1], CL({ gen: { walls: .2, guard: 1, pads: 1 }, uses: { door: 1 }, minLen: 10, luck: .02, feature: 'switches' })));
/* MYNE · layer 2: the reversed self, one-way gaps, paint, bombs, a lock */
TUT('myne', 2, 1, 'twin', BX(3, 3, [P0, T1], EZ(CL({ gen: { walls: .2, sym: 1, minWalls: 6 }, minLen: 3, maxLen: 7, maxShortest: 2, pick: 1, pool: 20, intro: 'opp' }))));
add('myne', 2, 1, BX(3, 3, [P0, T1], CL({ gen: { walls: .2 }, minLen: 6, luck: .04, feature: 'opp' })));
add('myne', 2, 2, BX(4, 3, [P0, T1], CL({ gen: { walls: .18, oneway: 2 }, uses: { oneway: 1 }, minLen: 7, luck: .03, feature: 'oneway' })));
TUT('myne', 2, 3, 'paints', BX(3, 1, [{ goal: 1 }], EZ({ gen: { walls: .05, paints: [1] }, uses: { paint: 1 }, minLen: 2, maxLen: 5 })));
add('myne', 2, 3, BX(4, 3, [P0, { m: 'opp', c: 1, goal: 0 }], CL({ gen: { walls: .2, paints: [0] }, uses: { paint: 1 }, minLen: 8, luck: .03, feature: 'paints' })));
add('myne', 2, 4, BX(4, 4, [{ n: 1 }, { m: 'opp', c: 1, n: 1 }], CL({ gen: { walls: .18, holes: 1 }, minLen: 8, luck: .03, feature: 'budget' })));
add('myne', 2, 5, BX(4, 4, [P0, T1], CL({ gen: { walls: .18, guard: 1, oneway: 1 }, uses: { door: 1 }, minLen: 9, luck: .02, feature: 'switches' })));
add('myne', 2, 6, BX(4, 4, [{ goal: 1 }, { m: 'opp', c: 1, goal: 0 }], CL({ gen: { walls: .2, paints: [1, 0], oneway: 1 }, uses: { paint: 2 }, minLen: 10, luck: .02, feature: 'paints' })));
add('myne', 2, 7, BX(5, 4, [{ n: 1 }, T1], CL({ gen: { walls: .2, guard: 1 }, uses: { door: 1 }, minLen: 10, luck: .02, feature: 'budget' })));

/* ======================= v6 · Prim: landmines · Trix: ropes & edge numbers · Paige: dice =======================
   Prim's pink boxes are landmines: exactly n moves, then sit on a goal. Walls, portals and odd-shaped maps only. */
const M = { n: 1 }, MT = { n: 1, m: 'opp' }, DIE = { die: true }, DIE1 = { die: true, c: 1 };
/* Prim extras: arrow tiles and light tiles (a mine switches a light on by stepping on it) */
/* PRIM v7: mines with a little to spare (+2), every arrow tile / portal must be needed, light-the-whole-map mazes,
   two mines already in layer 1, reverse-twin mines from layer 2 */
TUT('prim', 1, 1, 'budget', BX(3, 1, [M], EZ({ gen: { walls: .02 }, minLen: 3, maxLen: 6 })));
add('prim', 1, 1, BX(3, 2, [M], { gen: { walls: .2, bites: 1 }, minLen: 5, luck: .08, feature: 'budget' }));
add('prim', 1, 2, BX(3, 3, [M], { gen: { walls: .22, bites: 2 }, minLen: 6, luck: .06, feature: 'budget' }));
TUT('prim', 1, 3, 'portals', BX(3, 2, [M], EZ({ gen: { walls: .05, portals: 1 }, uses: { portals: 1 }, need: 1, minLen: 2, maxLen: 6 })));
add('prim', 1, 3, BX(4, 3, [M], { gen: { walls: .15, portals: 1, holes: 2, bites: 1 }, uses: { portals: 1 }, need: 1, minLen: 5, luck: .05, feature: 'portals', time: 40000, tries: 8000 }));
TUT('prim', 1, 4, 'pads', BX(3, 2, [M], EZ({ gen: { walls: .05, pads: 1 }, uses: { pads: 1 }, need: 1, minLen: 2, maxLen: 6 })));
add('prim', 1, 4, BX(4, 3, [M], { gen: { walls: .15, pads: 1, padMin: 3, padGoal: 1, bites: 1 }, uses: { pads: 1 }, need: 1, slack: 1, minLen: 5, luck: .05, feature: 'pads', time: 40000, tries: 8000 }));
TUT('prim', 1, 5, 'lights', BX(3, 2, [M], EZ({ gen: { walls: .05, litR: 1 }, minLen: 3, maxLen: 6 })));
add('prim', 1, 5, BX(4, 3, [M], { gen: { walls: .2, litR: 2, bites: 2 }, minLen: 7, luck: .04, feature: 'lights' }));
add('prim', 1, 6, BX(2, 3, [M], { gen: { walls: .3, lightAll: 1, bites: 1 }, minLen: 7, maxLen: 18, luck: .02, feature: 'lightAll', cap: 300000 }));
TUT('prim', 1, 7, 'many', BX(3, 2, [M, M], EZ({ gen: { walls: .05 }, minLen: 3, maxLen: 7 })));
add('prim', 1, 7, BX(3, 3, [M, M], { gen: { walls: .2, bites: 1 }, minLen: 6, luck: .04, feature: 'many' }));
add('prim', 1, 8, BX(4, 3, [M, M], { gen: { walls: .15, pads: 1, padMin: 3, bites: 2 }, uses: { pads: 1 }, need: 1, slack: 1, minLen: 7, luck: .03, feature: 'pads', time: 45000, tries: 8000 }));
add('prim', 1, 9, BX(3, 3, [M], { gen: { walls: .3, lightAll: 1, bites: 2 }, minLen: 10, maxLen: 24, luck: .02, feature: 'lightAll', cap: 600000, time: 40000 }));
TUT('prim', 2, 1, 'twin', BX(3, 3, [M, MT], EZ({ gen: { walls: .2, sym: 1, minWalls: 6 }, minLen: 3, maxLen: 8, maxShortest: 2, pick: 1, pool: 20 })));
add('prim', 2, 1, BX(3, 3, [M, MT], { gen: { walls: .2, bites: 1 }, minLen: 7, luck: .03, feature: 'opp' }));
add('prim', 2, 2, BX(4, 3, [M, M], { gen: { walls: .2, portals: 1, bites: 2 }, uses: { portals: 1 }, need: 1, distinct: 1, minLen: 8, luck: .03, feature: 'portals' }));
add('prim', 2, 3, BX(4, 3, [M, MT], { gen: { walls: .15, pads: 1, padMin: 3, padGoal: 1, bites: 1 }, uses: { pads: 2 }, need: 1, slack: 1, minLen: 8, luck: .02, feature: 'pads', time: 45000, tries: 8000 }));
add('prim', 2, 4, BX(4, 3, [M], { gen: { walls: .3, lightAll: 1, bites: 2 }, minLen: 12, maxLen: 28, luck: .02, feature: 'lightAll', cap: 800000, time: 50000 }));
add('prim', 2, 5, BX(4, 4, [M, M], { gen: { walls: .15, pads: 1, padMin: 3, padGoal: 1, bites: 2 }, uses: { pads: 2 }, need: 1, slack: 1, distinct: 1, minLen: 9, luck: .02, feature: 'pads', time: 45000, tries: 8000 }));
add('prim', 2, 6, BX(4, 4, [M, MT], { gen: { walls: .2, litR: 2, bites: 2 }, minLen: 10, luck: .02, feature: 'lights' }));
add('prim', 2, 7, BX(4, 4, [M, MT], { gen: { walls: .15, portals: 1, holes: 2, bites: 2 }, uses: { portals: 1 }, need: 1, minLen: 10, luck: .02, feature: 'opp', time: 45000, tries: 8000 }));
add('prim', 2, 8, BX(3, 2, [M, M], { gen: { walls: .3, lightAll: 1 }, distinct: 1, minLen: 8, maxLen: 20, luck: .02, feature: 'lightAll', cap: 600000, time: 50000 }));
add('prim', 2, 9, BX(4, 3, [M, M], { gen: { walls: .15, portals: 1, holes: 2, bites: 1 }, uses: { portals: 1 }, need: 1, minLen: 9, luck: .02, feature: 'portals', time: 50000, tries: 10000 }));
add('prim', 3, 1, BX(4, 3, [M, M, M], { gen: { walls: .25, bites: 1 }, minLen: 10, maxShortest: 4, luck: .03, feature: 'many', cap: 400000, time: 60000 }));
add('prim', 3, 2, BX(4, 4, [M, M, MT], { gen: { walls: .15, portals: 1, holes: 2, bites: 1 }, uses: { portals: 2 }, need: 1, minLen: 11, luck: .02, feature: 'opp', cap: 150000, time: 50000, tries: 8000 }));
add('prim', 3, 3, BX(4, 3, [M], { gen: { walls: .32, lightAll: 1, bites: 1 }, minLen: 14, maxLen: 30, luck: .02, feature: 'lightAll', cap: 900000, time: 60000 }));
add('prim', 3, 4, BX(5, 4, [M, M, M], { gen: { walls: .2, litR: 3, bites: 3 }, distinct: 1, minLen: 12, luck: .02, feature: 'lights', cap: 150000 }));
add('prim', 3, 5, BX(4, 4, [M, MT], { gen: { walls: .15, pads: 1, padMin: 3, padGoal: 1, bites: 2 }, uses: { pads: 2 }, need: 1, slack: 1, minLen: 11, luck: .02, feature: 'pads', time: 50000, tries: 8000 }));
add('prim', 3, 6, BX(3, 2, [M, MT], { gen: { walls: .3, lightAll: 1 }, minLen: 9, maxLen: 22, luck: .02, feature: 'lightAll', cap: 700000, time: 50000 }));
add('prim', 3, 7, BX(5, 4, [M, MT], { gen: { walls: .15, portals: 1, holes: 3, bites: 2 }, uses: { portals: 1 }, need: 1, minLen: 12, luck: .02, feature: 'portals', time: 60000, tries: 8000 }));
add('prim', 3, 8, BX(5, 4, [M, MT, M], { gen: { walls: .15, litR: 2, portals: 1, holes: 3, bites: 1 }, uses: { portals: 1 }, need: 1, minLen: 12, luck: .02, feature: 'opp', cap: 150000, time: 60000, tries: 8000 }));
add('prim', 3, 9, BX(4, 4, [M], { gen: { walls: .32, lightAll: 1, bites: 3 }, minLen: 16, maxLen: 34, luck: .02, feature: 'lightAll', cap: 1200000, time: 60000 }));
/* Trix: rope boxes and edge numbers (+ a few lights); two ropes from layer 2 */
/* TRIX v8: one rope box per panel. Most panels are the old rope / edge-number panels (tools/trix_v8.js), these fill the gaps */
TUT('trix', 1, 5, 'oneway', BX(3, 2, [R0], EZ({ gen: { walls: .15, oneway: 1 }, uses: { oneway: 1 }, need: 2, minLen: 3, maxLen: 8, tries: 6000 })));
add('trix', 2, 3, BX(4, 3, [R0], { gen: { walls: .12, nums: 3, oneway: 1 }, uses: { oneway: 1 }, need: 2, minLen: 10, luck: .01, feature: 'oneway', cap: 150000, time: 50000, tries: 6000 }));
TUT('trix', 2, 6, 'portals', BX(3, 2, [R0], EZ({ gen: { walls: .05, portals: 1 }, uses: { portals: 1 }, need: 2, minLen: 3, maxLen: 7 })));
TUT('trix', 3, 6, 'switches', BX(3, 2, [R0], EZ({ gen: { walls: .05, guard: 1 }, uses: { door: 1 }, need: 2, minLen: 3, maxLen: 8 })));
add('trix', 3, 9, BX(5, 4, [R0], { gen: { walls: .08, nums: 5, bites: 2 }, minLen: 18, luck: .01, feature: 'nums', cap: 250000, time: 60000 }));
/* TRIX v10: light-the-whole-room and packed-number panels are built route-first by tools/trix_v10.js (random
   generation here almost never finds a rope that covers every tile) */
/* Paige: a die to print the right numbers, arrow tiles that slide it without turning, portals; two dice in layer 3 */
TUT('paige', 1, 1, 'dice', BX(3, 1, [DIE], EZ({ gen: { walls: .02, dice: 1, diceMore: 0 }, minLen: 2, maxLen: 6 })));
add('paige', 1, 1, BX(3, 2, [DIE], { gen: { walls: 0.1, dice: 1 }, minLen: 4, luck: .04, feature: 'dice' }));
add('paige', 1, 2, BX(3, 3, [DIE], { gen: { walls: 0.12, dice: 2, bites: 1 }, minLen: 5, luck: .04, feature: 'dice' }));
add('paige', 1, 3, BX(4, 3, [DIE], { gen: { walls: 0.12, dice: 2, bites: 2 }, minLen: 6, luck: .04, feature: 'dice' }));
TUT('paige', 1, 4, 'pads', BX(3, 2, [DIE], EZ({ gen: { walls: .05, pads: 1, dice: 1 }, uses: { pads: 1 }, minLen: 2, maxLen: 6 })));
add('paige', 1, 4, BX(4, 3, [DIE], { gen: { walls: 0.12, pads: 1, dice: 2, bites: 1 }, uses: { pads: 1 }, minLen: 6, luck: .04, feature: 'dice' }));
add('paige', 1, 5, BX(4, 4, [DIE], { gen: { walls: 0.12, pads: 2, dice: 2, bites: 2 }, uses: { pads: 1 }, minLen: 7, luck: .04, feature: 'dice' }));
add('paige', 1, 6, BX(5, 4, [DIE], { gen: { walls: 0.12, pads: 2, dice: 3, bites: 3 }, uses: { pads: 1 }, minLen: 8, luck: .04, feature: 'dice' }));
TUT('paige', 2, 1, 'portals', BX(3, 2, [DIE], EZ({ gen: { walls: .05, portals: 1, dice: 1 }, uses: { portals: 1 }, minLen: 3, maxLen: 7 })));
add('paige', 2, 1, BX(4, 3, [DIE], { gen: { walls: 0.12, portals: 1, dice: 2, bites: 1 }, uses: { portals: 1 }, minLen: 7, luck: .03, feature: 'dice' }));
add('paige', 2, 2, BX(4, 3, [DIE], { gen: { walls: 0.12, pads: 2, dice: 3, bites: 2 }, uses: { pads: 1 }, minLen: 8, luck: .03, feature: 'dice' }));
add('paige', 2, 3, BX(4, 4, [DIE], { gen: { walls: 0.12, portals: 1, pads: 1, dice: 2, bites: 2 }, uses: { portals: 1 }, minLen: 9, luck: .03, feature: 'dice' }));
add('paige', 2, 4, BX(4, 4, [DIE], { gen: { walls: 0.12, pads: 2, dice: 3, bites: 3 }, uses: { pads: 1 }, minLen: 9, luck: .03, feature: 'dice' }));
add('paige', 2, 5, BX(5, 4, [DIE], { gen: { walls: 0.12, portals: 1, pads: 2, dice: 3, bites: 2 }, uses: { portals: 1, pads: 1 }, minLen: 10, luck: .03, feature: 'dice' }));
add('paige', 2, 6, BX(5, 4, [DIE], { gen: { walls: 0.12, pads: 3, dice: 4, bites: 3 }, uses: { pads: 2 }, minLen: 11, luck: .03, feature: 'dice' }));
add('paige', 2, 7, BX(5, 5, [DIE], { gen: { walls: 0.12, portals: 1, pads: 2, dice: 4, bites: 4 }, uses: { portals: 1, pads: 1 }, minLen: 12, luck: .03, feature: 'dice' }));
TUT('paige', 3, 1, 'colors', BX(3, 2, [DIE, DIE1], EZ(CL({ gen: { walls: .05, dice: 1 }, minLen: 3, maxLen: 8 }))));
add('paige', 3, 1, BX(4, 3, [DIE, DIE1], CL({ gen: { walls: 0.12, dice: 2, bites: 1 }, minLen: 8, luck: .02, feature: 'dice' })));
add('paige', 3, 2, BX(4, 4, [DIE, DIE1], CL({ gen: { walls: 0.12, dice: 2, pads: 1, bites: 2 }, minLen: 9, luck: .02, feature: 'dice' })));
add('paige', 3, 3, BX(4, 4, [DIE, DIE1], CL({ gen: { walls: 0.12, dice: 3, portals: 1, bites: 2 }, minLen: 10, luck: .02, feature: 'dice' })));
add('paige', 3, 4, BX(5, 4, [DIE, DIE1], CL({ gen: { walls: 0.12, dice: 3, pads: 2, bites: 3 }, minLen: 10, luck: .02, feature: 'dice' })));
add('paige', 3, 5, BX(5, 4, [DIE, DIE1], CL({ gen: { walls: 0.12, dice: 3, portals: 1, pads: 1, bites: 3 }, minLen: 11, luck: .02, feature: 'dice' })));
add('paige', 3, 6, BX(5, 5, [DIE, DIE1], CL({ gen: { walls: 0.12, dice: 4, pads: 2, bites: 4 }, minLen: 12, luck: .02, feature: 'dice' })));
add('paige', 3, 7, BX(5, 5, [DIE, DIE1], CL({ gen: { walls: 0.12, dice: 4, portals: 1, pads: 2, bites: 3 }, minLen: 13, luck: .02, feature: 'dice', time: 50000, tries: 6000 })));

/* ======================= build =======================
   Never rebuilds the whole set by itself (hand-tuned and converted panels stay as they are):
     IDS=a,b PART=out.json node tools/design_v3.js     design just these ids into out.json
     NEW=1 PART=out.json node tools/design_v3.js       design every spec whose id isn't in panels.json yet
     node tools/design_v3.js merge out1.json out2.json  put designed panels into src/panels.json (same id → replaced)
     node tools/design_v3.js retext                     rewrite every panel's "key idea" text from what's on it */
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
const ord = { prim: 0, trix: 1, paige: 2, vel: 3, myne: 4 };
const sortP = a => a.sort((x, y) => ord[x.girl] - ord[y.girl] || x.layer - y.layer || x.n - y.n);
const INTRO = { plates: 'switches', sketch: 'lights', dots: 'lights', visitAll: 'lights', basic: 'trail', boxes: 'goal', twin: 'opp', twinrope: 'opp', swap: 'dbl' };
const retext = p => { const intro = p.tut ? (INTRO[p.tut] || p.tut) : (INTRO[p.intro] || p.intro); p.why = whyBox(p, { intro, feature: p.feature }); return p; };
if (ONLY === 'list') { console.log(S.map(s => s.id).join(',')); }
else if (ONLY === 'merge') {
  const all = old.slice();
  process.argv.slice(3).forEach(f => JSON.parse(fs.readFileSync(f, 'utf8')).forEach(p => { const i = all.findIndex(o => o.id === p.id); if (i >= 0) all[i] = p; else all.push(p); }));
  fs.writeFileSync(OUT, JSON.stringify(sortP(all), null, 1)); console.log('merged →', all.length, 'panels');
} else if (ONLY === 'retext') {
  old.forEach(p => { if (p.boxes && !p.edited) retext(p); });
  fs.writeFileSync(OUT, JSON.stringify(old, null, 1)); console.log('retext', old.length);
} else {
  const IDS = process.env.IDS ? process.env.IDS.split(',') : null;
  if (!IDS && !process.env.NEW) { console.log('Say which panels: IDS=a,b or NEW=1 (and PART=file.json).'); process.exit(1); }
  const out = [];
  for (const spec of S) {
    if (IDS ? !IDS.includes(spec.id) : old.some(o => o.id === spec.id)) continue;
    const prev = old.find(o => o.id === spec.id);
    if (prev && prev.edited) { console.log('keep (hand-edited)', spec.id); continue; }
    seed = hash(spec.id) || 1;
    const t0 = Date.now(); let p;
    try { p = spec.box ? designBox(spec) : lineToBox(designSingle(spec)); } catch (e) { console.log('SKIP', spec.id, e.message); continue; }
    Object.assign(p, { belief: spec.belief || (prev && prev.belief) || '', intro: spec.intro || null }); if (spec.tut) p.tut = spec.tut;
    if (spec.feature) p.feature = spec.feature;
    retext(p);
    out.push(p);
    const f = ['holes', 'broken', 'oneway', 'pads', 'stops', 'portals', 'lights', 'nums', 'switches', 'doors', 'cracks', 'paints', 'dice'].filter(k => (p[k] || []).length).map(k => `${k} ${p[k].length}`).join(', ');
    console.log(`${p.id.padEnd(10)} ${p.w}x${p.h} boxes ${p.boxes.map(b => (b.trail ? 'R' : 'B') + (b.m ? '~' : '') + (b.dash ? '>' : '') + (b.c != null ? b.c : '') + (b.n != null ? '#' + b.n : '')).join(' ')}  shortest ${p.minMoves} (${p.solutions} ways, luck ${p.luck}%${p.quality !== undefined ? ', q ' + p.quality : ''})  ${f}  (${Date.now() - t0}ms)`);
  }
  fs.writeFileSync(process.env.PART || OUT + '.part', JSON.stringify(out, null, 1));
  console.log('wrote', out.length, 'panels');
}
