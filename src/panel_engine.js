/* =========================================================
   PANEL ENGINE v3 · line puzzles on a grid of nodes
   Shared by the game (browser) and tools/design_v3.js (node).

   Board: w×h cells → (w+1)×(h+1) nodes, x right, y down.
   The line starts on a start node, moves node to node (WASD or drag)
   and never visits a node twice (bridges excepted).
   One key press = one move; forced moves (pads, portals, bridges)
   happen inside that press.

   Map
     holes   [[x,y]]            nodes that don't exist (irregular maps)
     broken  [[x1,y1,x2,y2]]    blocked link
     oneway  [[x1,y1,x2,y2]]    link usable only from (x1,y1) to (x2,y2)
     exit    [[x,y]]            on the border (stub) or anywhere inside (ring)
     moves   n                  the line must reach the exit in exactly n moves
   Special nodes
     portals [[x1,y1,x2,y2]]    stepping on one end carries the line to the other
                                (a slide keeps going out of the other end)
     pads    [[x,y,dx,dy]]      launch pad: the line keeps sliding that way
                                until something blocks it
     stops   [[x,y]]            a slide stops here
     bridges [[x,y]]            overpass: crossed twice, once across and once
                                along, always straight through
   Rules
     sketch  edges that must be used           avoid  edges that must not be used
     dots    nodes that must be visited        visitAll
     squares [[cx,cy,'pink'|'ink']]  one ink per region the line cuts out
     nums    [[cx,cy,n]]  the line uses n of this cell's 4 sides
   Lines
     mirror  'x'|'y'|'rot'  a second line copies the first, rigidly
     twin    'mirror'|'same'|'opposite'  a second line with its own start[1]
             and exit[1]; every key moves both (mirror: left/right swapped).
             A blocked line stays put; a line that reaches its exit parks.
             Twin panels are played and solved as key sequences.
   ========================================================= */
const PanelEngine = (() => {
  const key = (x, y) => x + ',' + y;
  const ekey = (a, b, c, d) => (a < c || (a === c && b < d)) ? `${a},${b}|${c},${d}` : `${c},${d}|${a},${b}`;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DK = { R: [1, 0], L: [-1, 0], D: [0, 1], U: [0, -1] };
  const dirKey = ([dx, dy]) => dx > 0 ? 'R' : dx < 0 ? 'L' : dy > 0 ? 'D' : 'U';
  function dims(p) {
    const wx = !!(p.wrap && p.wrap.includes('x')), wy = !!(p.wrap && p.wrap.includes('y'));
    return { wx, wy, cols: wx ? p.w : p.w + 1, rows: wy ? p.h : p.h + 1 };
  }
  const holeSet = p => new Set((p.holes || []).map(([x, y]) => key(x, y)));
  function nodeCount(p) { const d = dims(p); return d.cols * d.rows - (p.holes || []).length; }
  function norm(p, x, y) { const d = dims(p); if (d.wx) x = ((x % d.cols) + d.cols) % d.cols; if (d.wy) y = ((y % d.rows) + d.rows) % d.rows; return [x, y]; }
  function inside(p, x, y) { const d = dims(p); return x >= 0 && y >= 0 && x < d.cols && y < d.rows && !(p.holes || []).some(h => h[0] === x && h[1] === y); }
  const edgeSet = list => { const s = new Set(); (list || []).forEach(e => s.add(ekey(e[0], e[1], e[2], e[3]))); return s; };
  const brokenSet = p => edgeSet(p.broken);
  const cellSides = (cx, cy) => [ekey(cx, cy, cx + 1, cy), ekey(cx, cy + 1, cx + 1, cy + 1), ekey(cx, cy, cx, cy + 1), ekey(cx + 1, cy, cx + 1, cy + 1)];
  function twin(p, x, y) { for (const [a, b, c, d] of p.portals || []) { if (a === x && b === y) return [c, d]; if (c === x && d === y) return [a, b]; } return null; }
  const padAt = (p, x, y) => { const q = (p.pads || []).find(q => q[0] === x && q[1] === y); return q ? [q[2], q[3]] : null; };
  const isStop = (p, x, y) => (p.stops || []).some(q => q[0] === x && q[1] === y);
  const isBridge = (p, x, y) => (p.bridges || []).some(q => q[0] === x && q[1] === y);
  const isStart = (p, x, y) => (p.start || []).some(s => s[0] === x && s[1] === y);
  const isExit = (p, x, y) => (p.exit || []).some(s => s[0] === x && s[1] === y);
  function exitDir(p, x, y) {
    const d = dims(p);
    if (!d.wx && x === 0) return [-1, 0]; if (!d.wx && x === p.w) return [1, 0];
    if (!d.wy && y === 0) return [0, -1]; if (!d.wy && y === p.h) return [0, 1];
    return null;
  }
  function mirrorOf(p, [x, y]) { return p.mirror === 'x' ? [p.w - x, y] : p.mirror === 'y' ? [x, p.h - y] : [p.w - x, p.h - y]; }
  function neighbors(p, x, y, broken = brokenSet(p)) {
    const out = [];
    for (const [dx, dy] of DIRS) { const [nx, ny] = norm(p, x + dx, y + dy); if (inside(p, nx, ny) && !(nx === x && ny === y) && !broken.has(ekey(x, y, nx, ny))) out.push([nx, ny]); }
    return out;
  }
  // a link is usable in this direction?
  function linkOk(p, C, a, b) {
    const k = ekey(a[0], a[1], b[0], b[1]);
    if (C.broken.has(k) || C.avoidHard.has(k)) return false;
    const ow = C.oneway.get(k); if (ow && !(ow[0] === a[0] && ow[1] === a[1])) return false;
    return true;
  }
  function ctx(p) {
    const ow = new Map(); (p.oneway || []).forEach(e => ow.set(ekey(e[0], e[1], e[2], e[3]), [e[0], e[1]]));
    return { broken: brokenSet(p), avoidHard: new Set(), oneway: ow };
  }

  /* ---------------- single line: a state machine over node paths ---------------- */
  // state: path, jump[] (step i was a portal jump), forced[] (step i happened by itself),
  //        cnt (visits per node), axis (first pass axis on bridges), slide, pend ('jump'|'straight'|null), lastDir, moves
  function start(p, s) {
    const st = { path: [s.slice()], jump: [false], forced: [false], cnt: new Map([[key(...s), 1]]), axis: new Map(), slide: null, pend: null, lastDir: null, moves: 0, hist: [] };
    if (p.mirror) st.cnt.set(key(...mirrorOf(p, s)), 1);
    return st;
  }
  function canEnter(p, C, st, from, to, dir, isJump) {
    if (!inside(p, to[0], to[1])) return false;
    if (!isJump && !linkOk(p, C, from, to)) return false;
    const k = key(...to), c = st.cnt.get(k) || 0;
    if (c) {
      if (!isBridge(p, ...to) || c > 1 || isJump) return false;
      const ax = st.axis.get(k); if (!dir || ax === (dir[0] ? 'h' : 'v')) return false;
    }
    if (p.mirror) { const m = mirrorOf(p, to); if ((m[0] === to[0] && m[1] === to[1]) || st.cnt.get(key(...m))) return false; }
    return true;
  }
  // the moves available now: [{to, dir, jump, forced}]
  function options(p, st, C = ctx(p)) {
    const at = st.path[st.path.length - 1];
    if (st.pend === 'jump') { const t = twin(p, ...at); return t && canEnter(p, C, st, at, t, null, true) ? [{ to: t, dir: st.slide, jump: true, forced: true }] : []; }
    if (st.pend === 'straight') { const d = st.lastDir, to = norm(p, at[0] + d[0], at[1] + d[1]); return canEnter(p, C, st, at, to, d, false) ? [{ to, dir: d, jump: false, forced: true }] : []; }
    if (st.slide) { const d = st.slide, to = norm(p, at[0] + d[0], at[1] + d[1]); if (canEnter(p, C, st, at, to, d, false)) return [{ to, dir: d, jump: false, forced: true }]; }
    const out = [];
    for (const d of DIRS) { const to = norm(p, at[0] + d[0], at[1] + d[1]); if (!(to[0] === at[0] && to[1] === at[1]) && canEnter(p, C, st, at, to, d, false)) out.push({ to, dir: d, jump: false, forced: false }); }
    return out;
  }
  // apply a move (mutates; push undo info to st.hist)
  function apply(p, st, o) {
    const k = key(...o.to);
    st.hist.push({ slide: st.slide, pend: st.pend, lastDir: st.lastDir, moves: st.moves, axisSet: false });
    const h = st.hist[st.hist.length - 1];
    if (!o.forced) { st.moves++; st.slide = null; }
    st.path.push(o.to.slice()); st.jump.push(!!o.jump); st.forced.push(!!o.forced);
    st.cnt.set(k, (st.cnt.get(k) || 0) + 1);
    if (p.mirror) { const m = key(...mirrorOf(p, o.to)); st.cnt.set(m, (st.cnt.get(m) || 0) + 1); }
    if (!o.jump && o.dir && isBridge(p, ...o.to) && !st.axis.has(k)) { st.axis.set(k, o.dir[0] ? 'h' : 'v'); h.axisSet = true; }
    st.pend = null;
    if (!o.jump) st.lastDir = o.dir;
    if (!o.jump && twin(p, ...o.to)) st.pend = 'jump';
    else if (!o.jump && isBridge(p, ...o.to)) st.pend = 'straight';
    if (!st.pend) {
      const pd = padAt(p, ...o.to);
      if (pd) st.slide = pd; else if (isStop(p, ...o.to)) st.slide = null;
      else if (o.jump && h.slide) st.slide = h.slide;
    }
  }
  function undo(p, st) {
    const n = st.path.pop(), k = key(...n); st.jump.pop(); st.forced.pop();
    const c = st.cnt.get(k) - 1; if (c) st.cnt.set(k, c); else st.cnt.delete(k);
    if (p.mirror) { const m = key(...mirrorOf(p, n)); const cm = st.cnt.get(m) - 1; if (cm) st.cnt.set(m, cm); else st.cnt.delete(m); }
    const h = st.hist.pop(); if (h.axisSet) st.axis.delete(k);
    st.slide = h.slide; st.pend = h.pend; st.lastDir = h.lastDir; st.moves = h.moves;
  }
  // can the line finish here? (on an exit, nothing forcing it onward)
  function canStop(p, st, C) {
    const at = st.path[st.path.length - 1];
    if (!isExit(p, ...at) || st.path.length < 2 || st.pend) return false;
    if (st.slide && options(p, st, C).some(o => o.forced)) return false;
    if (p.mirror && !isExit(p, ...mirrorOf(p, at))) return false;
    return true;
  }
  // replay a node path; returns the state or null if some step isn't a legal move
  function replay(p, path, C = ctx(p)) {
    if (!path || !path.length || !isStart(p, ...path[0])) return null;
    const st = start(p, path[0]);
    for (let i = 1; i < path.length; i++) {
      const o = options(p, st, C).find(o => o.to[0] === path[i][0] && o.to[1] === path[i][1]);
      if (!o) return null;
      apply(p, st, o);
    }
    return st;
  }
  function lines(p, path) { return p.mirror ? [path, path.map(n => mirrorOf(p, n))] : [path]; }
  function regions(p, used) {
    const reg = {}, list = []; let r = 0;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      if (reg[key(x, y)] !== undefined) continue;
      const st = [[x, y]], cells = [[x, y]]; reg[key(x, y)] = r;
      while (st.length) {
        const [cx, cy] = st.pop();
        for (const [nx, ny, wall] of [[cx + 1, cy, ekey(cx + 1, cy, cx + 1, cy + 1)], [cx - 1, cy, ekey(cx, cy, cx, cy + 1)], [cx, cy + 1, ekey(cx, cy + 1, cx + 1, cy + 1)], [cx, cy - 1, ekey(cx, cy, cx + 1, cy)]]) {
          if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || used.has(wall) || reg[key(nx, ny)] !== undefined) continue;
          reg[key(nx, ny)] = r; st.push([nx, ny]); cells.push([nx, ny]);
        }
      }
      list.push(cells); r++;
    }
    return { reg, list };
  }
  function usedEdges(p, path, J) {
    const used = new Set();
    for (const ln of lines(p, path)) for (let i = 1; i < ln.length; i++) if (!J[i]) used.add(ekey(...ln[i - 1], ...ln[i]));
    return used;
  }
  function jumps(p, path) { const st = replay(p, path); if (st) return st.jump; const j = [false]; for (let i = 1; i < path.length; i++) j.push(Math.abs(path[i][0] - path[i - 1][0]) + Math.abs(path[i][1] - path[i - 1][1]) > 1 && !!twin(p, ...path[i - 1])); return j; }

  /* rules once the line is finished: { ok, bad: [{kind, i}] } */
  function rules(p, path, st) {
    const bad = [], used = usedEdges(p, path, st.jump), seen = new Set(lines(p, path).flat().map(n => key(...n)));
    (p.sketch || []).forEach((e, i) => { if (!used.has(ekey(e[0], e[1], e[2], e[3]))) bad.push({ kind: 'sketch', i }); });
    (p.avoid || []).forEach((e, i) => { if (used.has(ekey(e[0], e[1], e[2], e[3]))) bad.push({ kind: 'avoid', i }); });
    (p.dots || []).forEach((d, i) => { if (!seen.has(key(d[0], d[1]))) bad.push({ kind: 'dots', i }); });
    if (p.visitAll && seen.size !== nodeCount(p)) bad.push({ kind: 'visitAll' });
    if (p.moves && st.moves !== p.moves) bad.push({ kind: 'moves' });
    (p.nums || []).forEach(([cx, cy, n], i) => { if (cellSides(cx, cy).filter(k => used.has(k)).length !== n) bad.push({ kind: 'nums', i }); });
    if ((p.squares || []).length) {
      const { reg } = regions(p, used), colors = {}, R = (x, y) => reg[key(x, y)];
      p.squares.forEach(([cx, cy, col]) => { (colors[R(cx, cy)] = colors[R(cx, cy)] || new Set()).add(col); });
      p.squares.forEach(([cx, cy], i) => { if (colors[R(cx, cy)].size > 1) bad.push({ kind: 'squares', i }); });
    }
    return { ok: !bad.length, bad };
  }
  function validate(p, path) {
    if (p.twin) return { ok: false, bad: [{ kind: 'path' }] };
    const C = ctx(p), st = replay(p, path, C);
    if (!st || !canStop(p, st, C)) return { ok: false, bad: [{ kind: 'path' }] };
    return rules(p, path, st);
  }
  /* every distinct solution (node paths), up to `limit` */
  function solve(p, limit = 50) {
    if (p.twin) return [];
    const C = ctx(p), sols = [], N = nodeCount(p);
    (p.avoid || []).forEach(e => C.avoidHard.add(ekey(e[0], e[1], e[2], e[3])));
    const starts = p.mirror ? (p.start || []).slice(0, 1) : (p.start || []);
    for (const s of starts) {
      const st = start(p, s);
      const dfs = () => {
        if (sols.length >= limit) return;
        if (p.moves && st.moves > p.moves) return;
        if (canStop(p, st, C) && (!p.visitAll || st.cnt.size >= N) && rules(p, st.path, st).ok) sols.push(st.path.map(n => n.slice()));
        for (const o of options(p, st, C)) { apply(p, st, o); dfs(); undo(p, st); }
      };
      dfs();
    }
    return sols;
  }

  /* ---------------- twin: two lines, one keyboard ---------------- */
  function twinDir(p, i, d) { if (!i) return d; return p.twin === 'same' ? d : p.twin === 'opposite' ? [-d[0], -d[1]] : [-d[0], d[1]]; }
  function twinStart(p) {
    return { heads: (p.start || []).slice(0, 2).map(s => ({ path: [s.slice()], jump: [false], slide: null, parked: false })), taken: new Set((p.start || []).slice(0, 2).map(s => key(...s))), inputs: '' };
  }
  const twinClone = s => ({ heads: s.heads.map(h => ({ path: h.path.map(n => n.slice()), jump: h.jump.slice(), slide: h.slide, parked: h.parked })), taken: new Set(s.taken), inputs: s.inputs });
  // one key press; returns { state, moved: [bool, bool] } (state is a new object)
  function twinStep(p, s0, d) {
    const s = twinClone(s0), C = ctx(p), moved = [false, false];
    const free = (h, to, from, isJump) => inside(p, to[0], to[1]) && !s.taken.has(key(...to)) && (isJump || linkOk(p, C, from, to));
    // first steps, decided together (both aiming at one node = both blocked)
    const want = s.heads.map((h, i) => {
      if (h.parked) return null;
      const at = h.path[h.path.length - 1], dd = twinDir(p, i, d), to = norm(p, at[0] + dd[0], at[1] + dd[1]);
      return free(h, to, at, false) ? { to, dd } : null;
    });
    if (want[0] && want[1] && want[0].to[0] === want[1].to[0] && want[0].to[1] === want[1].to[1]) { want[0] = want[1] = null; }
    s.heads.forEach((h, i) => {
      const w = want[i]; if (!w) return;
      moved[i] = true;
      let at = w.to, dir = w.dd, slide = null;
      h.path.push(at.slice()); h.jump.push(false); s.taken.add(key(...at));
      // forced follow-ups: portals, pads
      for (let guard = 0; guard < 60; guard++) {
        const t = twin(p, ...at);
        if (t && !h.jump[h.jump.length - 1]) { if (!free(h, t, at, true)) break; h.path.push(t.slice()); h.jump.push(true); s.taken.add(key(...t)); at = t; continue; }
        const pd = padAt(p, ...at); if (pd) slide = pd; else if (isStop(p, ...at)) slide = null;
        if (!slide) break;
        const nx = norm(p, at[0] + slide[0], at[1] + slide[1]);
        if (!free(h, nx, at, false)) break;
        h.path.push(nx.slice()); h.jump.push(false); s.taken.add(key(...nx)); at = nx;
      }
      if (p.exit && p.exit[i] && at[0] === p.exit[i][0] && at[1] === p.exit[i][1]) h.parked = true;
    });
    s.inputs += dirKey(d);
    return { state: s, moved };
  }
  function twinWon(p, s) {
    if (!s.heads.every(h => h.parked)) return false;
    const seen = new Set(s.heads.flatMap(h => h.path.map(n => key(...n))));
    if ((p.dots || []).some(dd => !seen.has(key(dd[0], dd[1])))) return false;
    if (p.visitAll && seen.size !== nodeCount(p)) return false;
    if (p.moves && s.inputs.length !== p.moves) return false;
    return true;
  }
  function twinRules(p, s) {
    const bad = [], seen = new Set(s.heads.flatMap(h => h.path.map(n => key(...n))));
    if (!s.heads.every(h => h.parked)) bad.push({ kind: 'path' });
    (p.dots || []).forEach((dd, i) => { if (!seen.has(key(dd[0], dd[1]))) bad.push({ kind: 'dots', i }); });
    if (p.visitAll && seen.size !== nodeCount(p)) bad.push({ kind: 'visitAll' });
    if (p.moves && s.inputs.length !== p.moves) bad.push({ kind: 'moves' });
    return { ok: !bad.length, bad };
  }
  function twinReplay(p, inputs) { let s = twinStart(p); for (const c of inputs) s = twinStep(p, s, DK[c]).state; return s; }
  // breadth-first: the shortest key sequences that win (up to `limit`), and how many states were explored
  function twinSolve(p, maxDepth = 40, limit = 20, maxStates = 400000) {
    let frontier = [twinStart(p)], wins = [], explored = 0;
    const seenStates = new Set();
    const sk = s => s.heads.map(h => key(...h.path[h.path.length - 1]) + (h.parked ? 'P' : '')).join('/') + '#' + [...s.taken].sort().join(';');
    seenStates.add(sk(frontier[0]));
    for (let depth = 0; depth < maxDepth && frontier.length && !wins.length; depth++) {
      const next = [];
      for (const s of frontier) for (const c of 'RLDU') {
        const r = twinStep(p, s, DK[c]); if (!r.moved[0] && !r.moved[1]) continue;
        if (p.moves && r.state.inputs.length > p.moves) continue;
        const k = sk(r.state);
        if (twinWon(p, r.state)) { if (wins.length < limit) wins.push(r.state.inputs); continue; }
        if (seenStates.has(k)) continue;
        seenStates.add(k); next.push(r.state); explored++;
        if (explored > maxStates) return { wins, explored, capped: true };
      }
      frontier = next;
    }
    return { wins, explored, capped: false };
  }
  return { validate, solve, replay, options, apply, undo, start, canStop, rules, ctx, neighbors, brokenSet, isStart, isExit, exitDir, key, ekey, nodeCount, dims, norm, inside, twin, jumps, mirrorOf, lines, regions, cellSides, edgeSet, padAt, isStop, isBridge, holeSet, usedEdges,
    twinStart, twinStep, twinWon, twinRules, twinReplay, twinSolve, DK, dirKey, twinDir };
})();
if (typeof module !== 'undefined') module.exports = PanelEngine;
