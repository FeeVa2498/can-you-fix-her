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
   Switches
     plates  [[x,y,ch]]                 a pressure plate on channel ch (0, 1)
     gates   [[x1,y1,x2,y2,ch,inv]]     a gate on a link: open while something stands
                                        on a plate of its channel (inv=1: the other way
                                        round, so the two kinds swap when a plate is pressed).
                                        The line counts as standing on every node it covers;
                                        boxes count while they are on the plate (and a rope
                                        lying on it). Box panels read the gates at the start
                                        of each key press.
   Rules
     sketch  edges that must be used           avoid  edges that must not be used
     dots    nodes that must be visited        visitAll
     squares [[cx,cy,'pink'|'ink']]  one ink per region the line cuts out
     nums    [[cx,cy,n]]  the line uses n of this cell's 4 sides
   Lines
     mirror  'x'|'y'|'rot'  a second line copies the first, rigidly
   Box panels (p.boxes): tokens instead of a line, see the box section below.
             Played and solved as key sequences.
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
    if (C.broken.has(k) || C.avoidHard.has(k) || (C.closed && C.closed.has(k))) return false;
    const ow = C.oneway.get(k); if (ow && !(ow[0] === a[0] && ow[1] === a[1])) return false;
    return true;
  }
  // the gates that are closed when onKey('x,y') says what is standing on each plate
  function gateClosed(p, onKey) {
    const out = new Set(); if (!(p.gates || []).length) return out;
    const act = {}; (p.plates || []).forEach(([x, y, ch]) => { if (onKey(key(x, y))) act[ch] = true; });
    p.gates.forEach(([a, b, c, d, ch, inv]) => { if (!!act[ch] === !!inv) out.add(ekey(a, b, c, d)); });
    return out;
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
    if ((p.gates || []).length) C.closed = gateClosed(p, k => st.cnt.has(k));
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
    if (p.boxes) return { ok: false, bad: [{ kind: 'path' }] };
    const C = ctx(p), st = replay(p, path, C);
    if (!st || !canStop(p, st, C)) return { ok: false, bad: [{ kind: 'path' }] };
    return rules(p, path, st);
  }
  /* every distinct solution (node paths), up to `limit` */
  // budget: give up after this many search steps (sols.capped is then true)
  function solve(p, limit = 50, budget = Infinity) {
    if (p.boxes) return [];
    const C = ctx(p), sols = [], N = nodeCount(p); let steps = 0; sols.capped = false;
    (p.avoid || []).forEach(e => C.avoidHard.add(ekey(e[0], e[1], e[2], e[3])));
    const starts = p.mirror ? (p.start || []).slice(0, 1) : (p.start || []);
    for (const s of starts) {
      const st = start(p, s);
      const dfs = () => {
        if (sols.length >= limit || sols.capped) return;
        if (++steps > budget) { sols.capped = true; return; }
        if (p.moves && st.moves > p.moves) return;
        if (canStop(p, st, C) && (!p.visitAll || st.cnt.size >= N) && rules(p, st.path, st).ok) sols.push(st.path.map(n => n.slice()));
        for (const o of options(p, st, C)) { apply(p, st, o); dfs(); undo(p, st); }
      };
      dfs();
    }
    return sols;
  }

  /* ---------------- boxes: every key moves every box (the whole game, v4) ----------------
     p.boxes [{x,y, m, dash, n, trail, c}]
       m      'opp': reverse twin, every key backwards (left↔right, up↔down). ('mx'/'my' still read: one axis)
       dash   rocket box: one press = slide until a wall, a box, a rope or a closed door stops it
       n      countdown: moves this box may still make. A box at 0 that has to move explodes: the level fails
       trail  rope box: leaves a rope behind; ropes block every box (its own too)
       c      colour 1..3 (0/none = plain)
     p.exit     goals [[x,y,c?]]: a goal with a colour wants a box of that colour; a plain goal takes any box
     p.lights   [[x,y]] light tiles: lit while a rope lies on them (or a rope box stands there)
     p.nums     [[cx,cy,n]] the ropes must use exactly n sides of this square (between four tiles)
     p.switches [[x,y,c,c2?]] a box entering opens every door of colour c for good.
                Double switch (c2): opens its current colour, shuts the other one, then shows the other colour
     p.doors    [[x1,y1,x2,y2,c]] a door between two tiles: shut until a switch of its colour opens it
     p.cracks   [[x,y]] a cracked tile falls away once the box on it leaves (then it's a hole)
     p.paints   [[x,y,c]] a box entering takes colour c
     Map tiles as before: pads (arrow tiles: slide on to the end), stops, portals, holes, broken (walls), oneway.
     Boxes never lock: the panel is won the moment every goal holds a box of its colour, every light is lit
     and every number is right. */
  function boxDir(b, d) { const m = b.m || 'same'; return m === 'mx' ? [-d[0], d[1]] : m === 'my' ? [d[0], -d[1]] : m === 'opp' ? [-d[0], -d[1]] : d; }
  function boxCtx(p) {
    const X = { C: ctx(p), sw: new Map(), paint: new Map(), crack: new Set(), door: new Map() };
    (p.switches || []).forEach((q, i) => X.sw.set(key(q[0], q[1]), i));
    (p.paints || []).forEach(q => X.paint.set(key(q[0], q[1]), q[2]));
    (p.cracks || []).forEach(q => X.crack.add(key(q[0], q[1])));
    (p.doors || []).forEach(q => X.door.set(ekey(q[0], q[1], q[2], q[3]), q[4]));
    return X;
  }
  function boxStart(p) {
    return { pos: p.boxes.map(b => [b.x, b.y]), left: p.boxes.map(b => b.n == null ? null : b.n), col: p.boxes.map(b => b.c || 0),
      open: 0, sw: (p.switches || []).map(q => q[2]), crk: new Set(), trail: new Set(), rope: new Set(), dead: -1, inputs: '',
      tracks: p.boxes.map(b => [[b.x, b.y]]), jumps: p.boxes.map(() => [false]) };
  }
  const doorShut = (X, open, k) => { const c = X.door.get(k); return c !== undefined && !(open & (1 << c)); };
  // a box arrives on tile k: switches and paint
  function enterTile(p, X, s, i, k) {
    const si = X.sw.get(k);
    if (si !== undefined) {
      const q = p.switches[si];
      if (q[3] == null) s.open |= 1 << q[2];
      else { const cur = s.sw[si], oth = cur === q[2] ? q[3] : q[2]; s.open = (s.open | (1 << cur)) & ~(1 << oth); s.sw[si] = oth; }
    }
    const pc = X.paint.get(k); if (pc !== undefined) s.col[i] = pc;
  }
  // one key press; returns { state, moved: [bool…], dead } (a new state; rec=false skips the drawing tracks)
  function boxStep(p, s0, d, rec = true, X = boxCtx(p)) {
    const n = p.boxes.length, C = X.C;
    const s = { pos: s0.pos.map(q => q.slice()), left: s0.left.slice(), col: s0.col.slice(), open: s0.open, sw: s0.sw.slice(), crk: new Set(s0.crk),
      trail: new Set(s0.trail), rope: new Set(s0.rope), dead: s0.dead, inputs: s0.inputs + dirKey(d),
      tracks: rec && s0.tracks ? s0.tracks.map(t => t.map(q => q.slice())) : null, jumps: rec && s0.jumps ? s0.jumps.map(j => j.slice()) : null };
    const moved = Array(n).fill(false);
    if (s0.dead >= 0) return { state: s, moved, dead: s0.dead };
    const act = Array(n).fill(true);
    const dir = p.boxes.map(b => boxDir(b, d)), dash = p.boxes.map(b => !!b.dash);
    const push = (i, q, j) => { if (s.tracks) { s.tracks[i].push(q.slice()); s.jumps[i].push(j); } };
    for (let tick = 0; tick < 200 && act.some(Boolean); tick++) {
      const occ = new Map(s.pos.map((q, i) => [key(...q), i]));
      const want = s.pos.map((q, i) => {
        if (!act[i]) return null;
        const to = [q[0] + dir[i][0], q[1] + dir[i][1]], tk = key(...to);
        return inside(p, ...to) && linkOk(p, C, q, to) && !doorShut(X, s.open, ekey(q[0], q[1], to[0], to[1])) && !s.trail.has(tk) && !s.crk.has(tk) ? to : null;
      });
      const ok = want.map(Boolean);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (ok[i] && ok[j] && want[i][0] === want[j][0] && want[i][1] === want[j][1]) ok[i] = ok[j] = false;
      for (let changed = true; changed;) {
        changed = false;
        for (let i = 0; i < n; i++) {
          if (!ok[i]) continue;
          const j = occ.get(key(...want[i])); if (j === undefined) continue;
          if (!ok[j] || (want[j][0] === s.pos[i][0] && want[j][1] === s.pos[i][1])) { ok[i] = false; changed = true; }
        }
      }
      // countdown: a box with nothing left that has to move blows up
      for (let i = 0; i < n; i++) if (ok[i] && !moved[i] && s.left[i] === 0) { s.dead = i; return { state: s, moved, dead: i }; }
      const left = [];
      for (let i = 0; i < n; i++) {
        if (!ok[i]) { act[i] = false; continue; }
        const from = s.pos[i];
        if (p.boxes[i].trail) { s.trail.add(key(...from)); s.rope.add(ekey(from[0], from[1], want[i][0], want[i][1])); }
        left.push(key(...from));
        s.pos[i] = want[i]; moved[i] = true; push(i, want[i], false);
      }
      for (let i = 0; i < n; i++) {
        if (!ok[i]) continue;
        let at = s.pos[i];
        const t = twin(p, ...at);
        if (t) {
          const busy = s.pos.some((q, j) => j !== i && q[0] === t[0] && q[1] === t[1]) || s.trail.has(key(...t)) || s.crk.has(key(...t));
          if (busy) { act[i] = false; continue; }
          if (p.boxes[i].trail) s.trail.add(key(...at));
          s.pos[i] = t.slice(); at = t; push(i, t, true);
        }
        enterTile(p, X, s, i, key(...at));
        const pd = padAt(p, ...at);
        if (pd) { dir[i] = pd; dash[i] = true; } else if (isStop(p, ...at)) dash[i] = false;
        if (!dash[i]) act[i] = false;
      }
      // cracked tiles fall once nobody stands on them
      if (X.crack.size) for (const k of left) if (X.crack.has(k) && !s.pos.some(q => key(...q) === k)) s.crk.add(k);
    }
    for (let i = 0; i < n; i++) if (moved[i] && s.left[i] !== null) s.left[i]--;
    return { state: s, moved, dead: -1 };
  }
  // what's still missing: { goals: [i…], lights: [i…], nums: [{i,c}…] }
  function boxNeed(p, s) {
    const at = new Map(s.pos.map((q, i) => [key(...q), i]));
    const goals = [], lights = [], nums = [];
    (p.exit || []).forEach((g, i) => { const b = at.get(key(g[0], g[1])); if (b === undefined || (g[2] && s.col[b] !== g[2])) goals.push(i); });
    (p.lights || []).forEach(([x, y], i) => { const k = key(x, y), b = at.get(k); if (!s.trail.has(k) && !(b !== undefined && p.boxes[b].trail)) lights.push(i); });
    (p.nums || []).forEach(([cx, cy, n], i) => { const c = cellSides(cx, cy).filter(k => s.rope.has(k)).length; if (c !== n) nums.push({ i, c }); });
    return { goals, lights, nums };
  }
  function boxWon(p, s) {
    if (s.dead >= 0) return false;
    const N = boxNeed(p, s); return !N.goals.length && !N.lights.length && !N.nums.length;
  }
  function boxReplay(p, inputs) { let s = boxStart(p); const X = boxCtx(p); for (const c of inputs) s = boxStep(p, s, DK[c], true, X).state; return s; }
  const boxKey = s => s.pos.map(q => key(...q)).join('/') + '|' + s.left.join(',') + '|' + s.col.join('') + '|' + s.open + s.sw.join('')
    + (s.crk.size ? '~' + [...s.crk].sort().join(';') : '') + (s.trail.size ? '#' + [...s.trail].sort().join(';') + '#' + [...s.rope].sort().join(';') : '');
  // breadth-first: the shortest key sequences that win (up to `limit`)
  function boxSolve(p, maxDepth = 40, limit = 20, maxStates = 400000) {
    const X = boxCtx(p);
    let s0 = boxStart(p); s0.tracks = s0.jumps = null;
    if (boxWon(p, s0)) return { wins: [''], explored: 0, capped: false };
    let frontier = [s0], wins = [], explored = 0;
    const seen = new Set([boxKey(s0)]);
    for (let depth = 0; depth < maxDepth && frontier.length && !wins.length; depth++) {
      const next = [];
      for (const s of frontier) for (const c of 'RLDU') {
        const r = boxStep(p, s, DK[c], false, X); if (!r.moved.some(Boolean) || r.dead >= 0) continue;
        if (boxWon(p, r.state)) { if (wins.length < limit) wins.push(r.state.inputs); continue; }
        const k = boxKey(r.state); if (seen.has(k)) continue;
        seen.add(k); next.push(r.state); explored++;
        if (explored > maxStates) return { wins, explored, capped: true };
      }
      frontier = next;
    }
    return { wins, explored, capped: false };
  }
  return { gateClosed, validate, solve, replay, options, apply, undo, start, canStop, rules, ctx, neighbors, brokenSet, isStart, isExit, exitDir, key, ekey, nodeCount, dims, norm, inside, twin, jumps, mirrorOf, lines, regions, cellSides, edgeSet, padAt, isStop, isBridge, holeSet, usedEdges,
    boxStart, boxStep, boxWon, boxNeed, boxReplay, boxSolve, boxDir, boxCtx, boxKey, DK, dirKey };
})();
if (typeof module !== 'undefined') module.exports = PanelEngine;
