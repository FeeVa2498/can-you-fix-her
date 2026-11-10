/* =========================================================
   PANEL ENGINE v2 · line puzzles on a grid of nodes
   Shared by the game (browser) and tools/design_panels.js (node).

   Board: w×h cells → (w+1)×(h+1) nodes, x right, y down.
   With wrap 'x' the left and right edges join (w node columns);
   with wrap 'xy' the board is a torus (w×h nodes, no border).
   The line runs from a start node to an exit node along edges and
   never visits a node twice.

   Structure
     start, exit [[x,y]]       mirror: start[1]/exit[1] belong to the mirrored line
     broken  [[x1,y1,x2,y2]]   edge can't be used
     portals [[x1,y1,x2,y2]]   stepping onto one end carries the line to the other
     mirror  'x'|'y'|'rot'     a second line copies the first (it may not touch it)
     wrap    'x'|'xy'
   Rules on edges / nodes
     sketch  edges that must be used          (Prim · pencil)
     avoid   edges that must not be used      (Prim · black pencil)
     dots    nodes that must be visited
     visitAll                                 (Trix)
     order   [[x,y]] visit these in this order (Trix · proof steps)
     switches [[x,y]] each visit flips the mood; warm edges need the first mood,
     warm, cool                                cool edges the second          (Vel)
     mines   [[cx,cy]] hidden cells whose sides the line must not touch       (Vel)
     radar   [[cx,cy,n]] n mines among the 8 cells around                    (Vel)
     restless n: no straight run longer than n edges                         (Myne)
   Rules on regions (cells the line separates)
     squares [[cx,cy,'pink'|'ink']]  one ink per region                        (Prim)
     shapes  [[cx,cy,[[dx,dy],…]]]   the region must have exactly this shape   (Prim)
     nums    [[cx,cy,n]]             the line uses n of this cell's 4 sides    (Trix)
     pieces  [[cx,cy,'P'|'N'|'B'|'R'|'Q']] region size = sum of piece values   (Trix)
     hearts  [[cx,cy,color]]         each heart shares its region with exactly
                                     one other heart of its colour             (Paige)
   Any symbol can carry fog:true (hidden until the line passes next to it) or
   lens:true (only visible through the magnifier). That only changes drawing.
   ========================================================= */
const PanelEngine = (() => {
  const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9 };
  const key = (x, y) => x + ',' + y;
  const ekey = (a, b, c, d) => (a < c || (a === c && b < d)) ? `${a},${b}|${c},${d}` : `${c},${d}|${a},${b}`;
  function dims(p) {
    const wx = !!(p.wrap && p.wrap.includes('x')), wy = !!(p.wrap && p.wrap.includes('y'));
    return { wx, wy, cols: wx ? p.w : p.w + 1, rows: wy ? p.h : p.h + 1 };
  }
  const nodeCount = p => { const d = dims(p); return d.cols * d.rows; };
  function norm(p, x, y) { const d = dims(p); if (d.wx) x = ((x % d.cols) + d.cols) % d.cols; if (d.wy) y = ((y % d.rows) + d.rows) % d.rows; return [x, y]; }
  function inside(p, x, y) { const d = dims(p); return x >= 0 && y >= 0 && x < d.cols && y < d.rows; }
  const edgeSet = list => { const s = new Set(); (list || []).forEach(e => s.add(ekey(e[0], e[1], e[2], e[3]))); return s; };
  function brokenSet(p) { return edgeSet(p.broken); }
  const cellSides = (cx, cy) => [ekey(cx, cy, cx + 1, cy), ekey(cx, cy + 1, cx + 1, cy + 1), ekey(cx, cy, cx, cy + 1), ekey(cx + 1, cy, cx + 1, cy + 1)];
  function mineEdges(p) { const s = new Set(); (p.mines || []).forEach(([cx, cy]) => cellSides(cx, cy).forEach(k => s.add(k))); return s; }
  function twin(p, x, y) {
    for (const [a, b, c, d] of p.portals || []) { if (a === x && b === y) return [c, d]; if (c === x && d === y) return [a, b]; }
    return null;
  }
  function neighbors(p, x, y, broken = brokenSet(p)) {
    const out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const [nx, ny] = norm(p, x + dx, y + dy);
      if (!inside(p, nx, ny) || (nx === x && ny === y)) continue;
      if (broken.has(ekey(x, y, nx, ny))) continue;
      out.push([nx, ny]);
    }
    return out;
  }
  const isStart = (p, x, y) => (p.start || []).some(s => s[0] === x && s[1] === y);
  const isExit = (p, x, y) => (p.exit || []).some(s => s[0] === x && s[1] === y);
  // which way the exit stub points (off the board); null = an exit in the middle (torus)
  function exitDir(p, x, y) {
    const d = dims(p);
    if (!d.wx && x === 0) return [-1, 0]; if (!d.wx && x === p.w) return [1, 0];
    if (!d.wy && y === 0) return [0, -1]; if (!d.wy && y === p.h) return [0, 1];
    return null;
  }
  function mirrorOf(p, [x, y]) { return p.mirror === 'x' ? [p.w - x, y] : p.mirror === 'y' ? [x, p.h - y] : [p.w - x, p.h - y]; }
  const isSwitch = (p, x, y) => (p.switches || []).some(s => s[0] === x && s[1] === y);

  /* was step i (path[i-1] → path[i]) a portal jump? */
  function jumps(p, path) {
    const j = new Array(path.length).fill(false);
    for (let i = 1; i < path.length; i++) {
      const t = twin(p, ...path[i - 1]);
      j[i] = !!(t && !j[i - 1] && t[0] === path[i][0] && t[1] === path[i][1]);
    }
    return j;
  }
  // all lines drawn (the player's, and the mirror's)
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
  const shapeKey = cells => { const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1])); return cells.map(([x, y]) => (x - mx) + ',' + (y - my)).sort().join(' '); };

  /* structural check: legal moves, no revisits, start → exit (and the mirror line too) */
  function structure(p, path) {
    if (!path || path.length < 2 || !isStart(p, ...path[0]) || !isExit(p, ...path[path.length - 1])) return false;
    if (p.mirror && !(p.start || []).some(s => s[0] === mirrorOf(p, path[0])[0] && s[1] === mirrorOf(p, path[0])[1])) return false;
    const broken = brokenSet(p), J = jumps(p, path), seen = new Set();
    for (let i = 0; i < path.length; i++) {
      const [x, y] = path[i];
      if (!inside(p, x, y)) return false;
      if (i) {
        if (!J[i] && !neighbors(p, ...path[i - 1], broken).some(n => n[0] === x && n[1] === y)) return false;
        // stepping onto a portal must carry the line through it
        if (!J[i] && twin(p, x, y) && !(i + 1 < path.length && J[i + 1])) return false;
      }
      seen.add(key(x, y));
    }
    if (seen.size !== path.length) return false;
    if (p.mirror) {
      const m = path.map(n => mirrorOf(p, n));
      if (m.some(n => seen.has(key(...n)))) return false;
      if (!isExit(p, ...m[m.length - 1])) return false;
    }
    return true;
  }

  /* returns { ok, bad: [{kind, i}] } — kind/i point at the symbol that failed */
  function validate(p, path) {
    if (!structure(p, path)) return { ok: false, bad: [{ kind: 'path' }] };
    const bad = [], used = new Set(), seen = new Set(), J = jumps(p, path);
    for (const ln of lines(p, path)) for (let i = 0; i < ln.length; i++) { seen.add(key(...ln[i])); if (i && !J[i]) used.add(ekey(...ln[i - 1], ...ln[i])); }
    (p.sketch || []).forEach((e, i) => { if (!used.has(ekey(e[0], e[1], e[2], e[3]))) bad.push({ kind: 'sketch', i }); });
    (p.avoid || []).forEach((e, i) => { if (used.has(ekey(e[0], e[1], e[2], e[3]))) bad.push({ kind: 'avoid', i }); });
    (p.dots || []).forEach((d, i) => { if (!seen.has(key(d[0], d[1]))) bad.push({ kind: 'dots', i }); });
    if (p.visitAll && seen.size !== nodeCount(p)) bad.push({ kind: 'visitAll' });
    if (p.order) {
      const idx = p.order.map(([x, y]) => path.findIndex(n => n[0] === x && n[1] === y));
      idx.forEach((v, i) => { if (v < 0 || (i && v < idx[i - 1])) bad.push({ kind: 'order', i }); });
    }
    if (p.restless) for (const ln of lines(p, path)) {
      let run = 0, dir = null;
      for (let i = 1; i < ln.length; i++) {
        if (J[i]) { run = 0; dir = null; continue; }
        let dx = ln[i][0] - ln[i - 1][0], dy = ln[i][1] - ln[i - 1][1];
        if (Math.abs(dx) > 1) dx = -Math.sign(dx); if (Math.abs(dy) > 1) dy = -Math.sign(dy);   // wrapped step
        const d = dx + ',' + dy; run = d === dir ? run + 1 : 1; dir = d;
        if (run > p.restless) { bad.push({ kind: 'restless', i }); break; }
      }
    }
    if (p.switches) {
      const warm = edgeSet(p.warm), cool = edgeSet(p.cool); let up = true;
      for (let i = 1; i < path.length; i++) {
        if (!J[i]) {
          const k = ekey(...path[i - 1], ...path[i]);
          if (warm.has(k) && !up) bad.push({ kind: 'warm', i: (p.warm || []).findIndex(e => ekey(e[0], e[1], e[2], e[3]) === k) });
          if (cool.has(k) && up) bad.push({ kind: 'cool', i: (p.cool || []).findIndex(e => ekey(e[0], e[1], e[2], e[3]) === k) });
        }
        if (isSwitch(p, ...path[i])) up = !up;
      }
    }
    (p.mines || []).forEach(([cx, cy], i) => { if (cellSides(cx, cy).some(k => used.has(k))) bad.push({ kind: 'mines', i }); });
    (p.nums || []).forEach(([cx, cy, n], i) => { if (cellSides(cx, cy).filter(k => used.has(k)).length !== n) bad.push({ kind: 'nums', i }); });
    if ((p.squares || []).length || (p.hearts || []).length || (p.pieces || []).length || (p.shapes || []).length) {
      const { reg, list } = regions(p, used), R = (cx, cy) => reg[key(cx, cy)];
      if ((p.squares || []).length) {
        const colors = {};
        p.squares.forEach(([cx, cy, col]) => { (colors[R(cx, cy)] = colors[R(cx, cy)] || new Set()).add(col); });
        p.squares.forEach(([cx, cy], i) => { if (colors[R(cx, cy)].size > 1) bad.push({ kind: 'squares', i }); });
      }
      (p.hearts || []).forEach(([cx, cy, col], i) => {
        const n = p.hearts.filter(([x, y, c]) => c === col && R(x, y) === R(cx, cy)).length;
        if (n !== 2) bad.push({ kind: 'hearts', i });
      });
      (p.pieces || []).forEach(([cx, cy], i) => {
        const r = R(cx, cy), sum = p.pieces.filter(([x, y]) => R(x, y) === r).reduce((a, q) => a + VAL[q[2]], 0);
        if (list[r].length !== sum) bad.push({ kind: 'pieces', i });
      });
      (p.shapes || []).forEach(([cx, cy, shape], i) => {
        const r = R(cx, cy), others = p.shapes.filter(([x, y]) => R(x, y) === r).length;
        if (others !== 1 || shapeKey(list[r]) !== shapeKey(shape)) bad.push({ kind: 'shapes', i });
      });
    }
    return { ok: !bad.length, bad };
  }

  /* every distinct solution (as the player's node path), up to `limit` */
  function solve(p, limit = 50) {
    const broken = brokenSet(p), sols = [], N = nodeCount(p);
    const hard = new Set([...edgeSet(p.avoid), ...mineEdges(p)]);
    const warm = edgeSet(p.warm), cool = edgeSet(p.cool);
    const ord = (p.order || []).map(([x, y]) => key(x, y));
    const occ = new Set();
    function dfs(path, up, run, dir, jumped, nextOrd) {
      if (sols.length >= limit) return;
      const [x, y] = path[path.length - 1];
      if (isExit(p, x, y) && !(twin(p, x, y) && !jumped) && (!p.visitAll || occ.size === N) && nextOrd === ord.length && validate(p, path).ok) sols.push(path.slice());
      // standing on a portal reached by a normal step: the only move is through it
      const t = twin(p, x, y);
      const moves = t && !jumped ? [[t, true]] : neighbors(p, x, y, broken).map(n => [n, false]);
      for (const [[nx, ny], isJump] of moves) {
        const k = key(nx, ny); if (occ.has(k)) continue;
        let m = null;
        if (p.mirror) { m = mirrorOf(p, [nx, ny]); const mk = key(...m); if (occ.has(mk) || mk === k) continue; }
        let nup = up, nrun = 0, ndir = null;
        if (!isJump) {
          const ek = ekey(x, y, nx, ny);
          if (hard.has(ek)) continue;
          if (warm.has(ek) && !up) continue;
          if (cool.has(ek) && up) continue;
          if (p.restless) {
            let dx = nx - x, dy = ny - y; if (Math.abs(dx) > 1) dx = -Math.sign(dx); if (Math.abs(dy) > 1) dy = -Math.sign(dy);
            ndir = dx + ',' + dy; nrun = ndir === dir ? run + 1 : 1;
            if (nrun > p.restless) continue;
          }
        }
        let no = nextOrd;
        const oi = ord.indexOf(k);
        if (oi >= 0) { if (oi !== nextOrd) continue; no++; }
        if (isSwitch(p, nx, ny)) nup = !up;
        occ.add(k); if (m) occ.add(key(...m));
        path.push([nx, ny]); dfs(path, nup, nrun, ndir, isJump, no); path.pop();
        occ.delete(k); if (m) occ.delete(key(...m));
      }
    }
    const starts = p.mirror ? (p.start || []).slice(0, 1) : (p.start || []);
    for (const s of starts) {
      occ.clear(); occ.add(key(...s)); if (p.mirror) occ.add(key(...mirrorOf(p, s)));
      const o0 = ord[0] === key(...s) ? 1 : 0;
      dfs([s.slice()], true, 0, null, false, o0);
    }
    return sols;
  }
  return { validate, solve, neighbors, brokenSet, isStart, isExit, exitDir, key, ekey, nodeCount, dims, norm, inside, twin, jumps, mirrorOf, lines, regions, cellSides, shapeKey, VAL, isSwitch, edgeSet };
})();
if (typeof module !== 'undefined') module.exports = PanelEngine;
