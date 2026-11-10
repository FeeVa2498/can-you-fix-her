/* =========================================================
   PANEL ENGINE · line puzzles drawn on a grid of nodes
   Shared by the game (browser) and tools/panels.js (node).

   A panel has w×h cells → (w+1)×(h+1) nodes, x right, y down.
   The line starts on a start node and ends on an exit node,
   moving along edges, never revisiting a node.

   Symbols
     broken   [[x1,y1,x2,y2]]   edge can't be used
     sketch   [[x1,y1,x2,y2]]   (Prim) faint pencil line: must be traced (used)
     dots     [[x,y]]           node must be visited
     squares  [[cx,cy,color]]   cell ink: each region the line cuts out may hold one ink colour only
     nums     [[cx,cy,n]]       (Trix) the line uses exactly n of this cell's 4 sides
     visitAll true              (Trix) the line must visit every node
   ========================================================= */
const PanelEngine = (() => {
  const key = (x, y) => x + ',' + y;
  const ekey = (a, b, c, d) => (a < c || (a === c && b < d)) ? `${a},${b}|${c},${d}` : `${c},${d}|${a},${b}`;
  const nodeCount = p => (p.w + 1) * (p.h + 1);
  function brokenSet(p) { const s = new Set(); (p.broken || []).forEach(e => s.add(ekey(...e))); return s; }
  function neighbors(p, x, y, broken) {
    const out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx > p.w || ny > p.h) continue;
      if (broken.has(ekey(x, y, nx, ny))) continue;
      out.push([nx, ny]);
    }
    return out;
  }
  const isStart = (p, x, y) => (p.start || []).some(s => s[0] === x && s[1] === y);
  const isExit = (p, x, y) => (p.exit || []).some(s => s[0] === x && s[1] === y);
  // which way the exit stub points (off the edge of the board)
  function exitDir(p, x, y) { return x === 0 ? [-1, 0] : x === p.w ? [1, 0] : y === 0 ? [0, -1] : [0, 1]; }

  /* returns { ok, broken: [{kind, i}] } — kind/i point at the symbol that failed */
  function validate(p, path) {
    const bad = [];
    if (!path || path.length < 2 || !isStart(p, ...path[0]) || !isExit(p, ...path[path.length - 1])) return { ok: false, bad: [{ kind: 'path' }] };
    const used = new Set(), seen = new Set();
    for (let i = 0; i < path.length; i++) {
      seen.add(key(...path[i]));
      if (i) used.add(ekey(...path[i - 1], ...path[i]));
    }
    (p.sketch || []).forEach((e, i) => { if (!used.has(ekey(...e))) bad.push({ kind: 'sketch', i }); });
    (p.dots || []).forEach((d, i) => { if (!seen.has(key(...d))) bad.push({ kind: 'dots', i }); });
    if (p.visitAll && seen.size !== nodeCount(p)) bad.push({ kind: 'visitAll' });
    (p.nums || []).forEach(([cx, cy, n], i) => {
      const c = [ekey(cx, cy, cx + 1, cy), ekey(cx, cy + 1, cx + 1, cy + 1), ekey(cx, cy, cx, cy + 1), ekey(cx + 1, cy, cx + 1, cy + 1)].filter(k => used.has(k)).length;
      if (c !== n) bad.push({ kind: 'nums', i });
    });
    if ((p.squares || []).length) {
      // regions of cells the line separates
      const reg = {}; let r = 0;
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        if (reg[key(x, y)] !== undefined) continue;
        const st = [[x, y]]; reg[key(x, y)] = r;
        while (st.length) {
          const [cx, cy] = st.pop();
          const nb = [[cx + 1, cy, ekey(cx + 1, cy, cx + 1, cy + 1)], [cx - 1, cy, ekey(cx, cy, cx, cy + 1)], [cx, cy + 1, ekey(cx, cy + 1, cx + 1, cy + 1)], [cx, cy - 1, ekey(cx, cy, cx + 1, cy)]];
          for (const [nx, ny, wall] of nb) {
            if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || used.has(wall) || reg[key(nx, ny)] !== undefined) continue;
            reg[key(nx, ny)] = r; st.push([nx, ny]);
          }
        }
        r++;
      }
      const colors = {};
      p.squares.forEach(([cx, cy, col]) => { const g = reg[key(cx, cy)]; (colors[g] = colors[g] || new Set()).add(col); });
      p.squares.forEach(([cx, cy], i) => { if (colors[reg[key(cx, cy)]].size > 1) bad.push({ kind: 'squares', i }); });
    }
    return { ok: !bad.length, bad };
  }

  /* every distinct solution (as node paths), up to `limit` */
  function solve(p, limit = 50) {
    const broken = brokenSet(p), sols = [], N = nodeCount(p);
    const seen = new Set();
    function dfs(path) {
      if (sols.length >= limit) return;
      const [x, y] = path[path.length - 1];
      if (isExit(p, x, y) && validate(p, path).ok) sols.push(path.slice());
      for (const [nx, ny] of neighbors(p, x, y, broken)) {
        const k = key(nx, ny); if (seen.has(k)) continue;
        seen.add(k); path.push([nx, ny]); dfs(path); path.pop(); seen.delete(k);
      }
    }
    for (const s of p.start || []) { seen.clear(); seen.add(key(...s)); dfs([s.slice()]); }
    return sols;
  }
  return { validate, solve, neighbors, brokenSet, isStart, isExit, exitDir, key, ekey, nodeCount };
})();
if (typeof module !== 'undefined') module.exports = PanelEngine;
