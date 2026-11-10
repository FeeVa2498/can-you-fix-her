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
function units(p, sol, kinds) {
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
      .forEach(([x, y]) => U.push({ k, cells: [[x, y]], add: [['nums', [x, y, E.cellSides(x, y).filter(s => used.has(s)).length]]] }));
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
      const pool = units(base, sol, kinds);
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

/* ---------- box panels ---------- */
function randomPlay(p, len, tries = 1500) {
  let wins = 0;
  for (let t = 0; t < tries; t++) { let s = E.boxStart(p); for (let i = 0; i < len; i++) { s = E.boxStep(p, s, E.DK['RLDU'[ri(4)]], false).state; if (E.boxWon(p, s)) { wins++; break; } } }
  return wins / tries;
}
function boxStats(p, inputs) {
  let s = E.boxStart(p), desync = 0, left = false; const onGoal = q => (p.exit || []).some(g => g[0] === q[0] && g[1] === q[1]);
  const movesBy = p.boxes.map(() => 0);
  for (const c of inputs) {
    const before = s.pos.map(q => q.slice()), r = E.boxStep(p, s, E.DK[c]);
    r.moved.forEach((m, i) => { if (m) movesBy[i]++; });
    if (r.moved.some(Boolean) && r.moved.some(m => !m)) desync++;
    before.forEach((q, i) => { if (onGoal(q) && r.moved[i]) left = true; });
    s = r.state;
  }
  return { s, desync, left, movesBy };
}
// did the answer walk through a gate that starts shut (u.gate) and through an inverted gate (u.toggle)?
function gateUse(p, inputs, u) {
  let s = E.boxStart(p);
  const kinds = new Map((p.gates || []).map(e => [E.ekey(e[0], e[1], e[2], e[3]), e[5]])), hit = { 0: 0, 1: 0 };
  const shut0 = E.gateClosed(p, k => s.pos.some(q => q.join(',') === k));
  for (const c of inputs) {
    const before = s.tracks.map(t => t.length), r = E.boxStep(p, s, E.DK[c]);
    r.state.tracks.forEach((t, i) => { for (let k = before[i]; k < t.length; k++) { if (r.state.jumps[i][k]) continue; const ek = E.ekey(...t[k - 1], ...t[k]), kd = kinds.get(ek); if (kd === undefined) continue; if (kd ? true : shut0.has(ek)) hit[kd ? 1 : 0]++; } });
    s = r.state;
  }
  return hit[0] >= (u.gate || 0) && hit[1] >= (u.toggle || 0);
}
function designBox(spec) {
  const g = spec.gen || {};
  for (let attempt = 0; attempt < (spec.tries || 800); attempt++) {
    const p = { id: spec.id, girl: spec.girl, layer: spec.layer, n: spec.n, w: spec.w, h: spec.h };
    const taken = new Set(), pick = (ok = () => true) => { const n = shuffle(allNodes(p)).find(n => !taken.has(n.join(',')) && ok(n)); if (n) taken.add(n.join(',')); return n; };
    for (let i = 0; i < (g.holes || 0); i++) { const n = pick(); if (n) (p.holes = p.holes || []).push(n); }
    taken.clear();
    p.broken = allEdges(p).filter(() => rnd() < (g.walls || .2));
    const boxes = spec.boxes.map(b => { const n = pick(); return n && { x: n[0], y: n[1], ...(b.m && b.m !== 'same' ? { m: b.m } : {}), ...(b.dash ? { dash: true } : {}), ...(b.trail ? { trail: true } : {}) }; });
    if (boxes.some(b => !b)) continue;
    p.boxes = boxes;
    const ng = spec.boxes.length - (spec.helpers || 0);
    p.exit = []; for (let i = 0; i < ng; i++) { const n = pick(); if (n) p.exit.push(n); }
    for (let i = 0; i < (g.pads || 0); i++) { const n = pick(); if (n) (p.pads = p.pads || []).push([...n, ...[[1, 0], [-1, 0], [0, 1], [0, -1]][ri(4)]]); }
    for (let i = 0; i < (g.stops || 0); i++) { const n = pick(); if (n) (p.stops = p.stops || []).push(n); }
    for (let i = 0; i < (g.portals || 0); i++) { const a = pick(), b = a && pick(n => Math.abs(n[0] - a[0]) + Math.abs(n[1] - a[1]) >= 3); if (b) (p.portals = p.portals || []).push([...a, ...b]); }
    for (let i = 0; i < (g.oneway || 0); i++) { const e = shuffle(allEdges(p)).find(e => !p.broken.some(b => E.ekey(...b) === E.ekey(...e))); if (e) (p.oneway = p.oneway || []).push(rnd() < .5 ? e : [e[2], e[3], e[0], e[1]]); }
    if (g.guard) {   // the first goals sit in walled bays whose only door is a gate (the 2nd one inverted when g.toggle)
      const brokenK = new Set(p.broken.map(e => E.ekey(...e)));
      p.exit.slice(0, g.guard).forEach((gl, gi) => {
        const links = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [gl[0], gl[1], gl[0] + dx, gl[1] + dy]).filter(e => E.inside(p, e[2], e[3])));
        if (!links.length) return;
        links.slice(1).forEach(e => { if (!brokenK.has(E.ekey(...e))) { p.broken.push(e); brokenK.add(E.ekey(...e)); } });
        p.broken = p.broken.filter(e => E.ekey(...e) !== E.ekey(...links[0]));
        (p.gates = p.gates || []).push([...links[0], 0, g.toggle && gi === 1 ? 1 : 0]);
      });
      for (let i = 0; i < (g.plates || 1); i++) { const n = pick(); if (n) (p.plates = p.plates || []).push([...n, 0]); }
      if (!(p.plates || []).length) continue;
    } else addSwitches(p, g, () => pick());
    if (!p.broken.length) delete p.broken;
    const maxL = spec.maxLen || 20;
    let r = E.boxSolve(p, maxL, 8, 200000);
    if (!r.wins.length || r.capped) continue;
    // move budgets: each box gets exactly the moves it makes in a shortest answer
    if (spec.boxes.some(b => b.n)) {
      const st = boxStats(p, r.wins[0]);
      let bad = false;
      spec.boxes.forEach((b, i) => { if (b.n) { if (!st.movesBy[i]) bad = true; p.boxes[i].n = st.movesBy[i]; } });
      if (bad) continue;
      const r0 = r; r = E.boxSolve(p, maxL, 8, 200000);
      if (!r.wins.length || r.capped) continue;
      if (!spec.noBind && !(r0.wins.length > r.wins.length || randomPlay({ ...p, boxes: p.boxes.map(b => ({ ...b, n: undefined })) }, r.wins[0].length * 2, 400) > 2 * randomPlay(p, r.wins[0].length * 2, 400))) continue;
    }
    const best = r.wins[0], L = best.length;
    if (L < (spec.minLen || 4)) continue;
    if (r.wins.length > (spec.maxShortest || 3)) continue;
    const st = boxStats(p, best), tr = st.s.tracks.flat(), allJ = st.s.jumps.flat();
    const u = spec.uses || {};
    if (u.pads && tr.filter(n => E.padAt(p, ...n)).length < u.pads) continue;
    if (u.stops && !tr.some(n => E.isStop(p, ...n))) continue;
    if (u.slide && !st.s.tracks.some(t => t.some((n, i) => { if (i < 2) return false; const pd = E.padAt(p, ...t[i - 1]); return pd && n[0] - t[i - 1][0] === pd[0] && n[1] - t[i - 1][1] === pd[1]; }))) continue;
    if (u.portals && !allJ.some(Boolean)) continue;
    if (u.oneway && !(p.oneway || []).some(e => st.s.tracks.some(t => t.some((n, i) => i && t[i - 1][0] === e[0] && t[i - 1][1] === e[1] && n[0] === e[2] && n[1] === e[3])))) continue;
    if (spec.helpers && !st.movesBy[spec.boxes.length - 1]) continue;
    if ((u.gate || u.toggle) && !gateUse(p, best, u)) continue;
    if (spec.leave && !st.left) continue;
    if (st.desync < (spec.desync || 0)) continue;
    const luck = randomPlay(p, L * 2);
    if (luck > (spec.luck || .03)) continue;
    Object.assign(p, { solIn: best, solutions: r.wins.length, minMoves: L, luck: Math.round(luck * 1000) / 10 });
    return p;
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
  plates: 'Công tắc: hộp đứng trên nút tròn thì cổng cùng màu mở; hộp rời đi thì cổng đóng lại. Cổng có sọc làm ngược lại, nên hai loại luôn đổi chỗ cho nhau. Cổng đổi trạng thái sau mỗi lần ấn phím.',
  goal: 'Đưa hộp vào ô goal (ô sáng). Mỗi phím di chuyển mọi hộp cùng lúc; hộp bị chặn thì đứng yên.',
  pads: 'Ô dash (mũi tên xanh): hộp đi vào là bị phóng theo mũi tên tới khi đụng chướng ngại.',
  stops: 'Ô phanh (vuông cam): hộp đang lướt dừng lại ở đây.',
  portals: 'Cổng: hộp vào cổng này ra ở cổng cùng màu (đang lướt thì lướt tiếp).',
  oneway: 'Mũi tên trên khe: chỉ đi qua được theo chiều đó.',
  holes: 'Chỗ trống trên map không đi được.',
  dash: 'Hộp dash (có sọc): mỗi lần ấn, nó lướt tới khi đụng chướng ngại.',
  budget: 'Số trên hộp = số nước nó còn được đi; về 0 là hộp đứng im luôn.',
  mx: 'Hộp có vạch dọc là hộp song sinh: trái/phải bị đảo (lên/xuống vẫn cùng chiều).',
  my: 'Hộp có vạch ngang: lên/xuống bị đảo.',
  opp: 'Hộp có dấu chéo: đi ngược cả hai chiều.',
  many: 'Có nhiều hộp: hộp chặn hộp, nên thứ tự đứng của chúng quan trọng.',
  nolock: 'Hộp vào goal không bị khoá, phím tiếp theo vẫn kéo nó đi. Thắng ngay khi mọi goal cùng có hộp.',
  helpers: 'Có nhiều hộp hơn goal: hộp thừa là vật chắn, dùng nó để dừng hộp khác đúng chỗ.',
  trail: 'Hộp kéo dây: nó để lại sợi dây phía sau, không hộp nào đi qua dây (kể cả chính nó). Cái "đường" ở các bảng khác chính là một hộp như thế.',
};
const BTIP = {
  plates: 'Một hộp giữ công tắc, hộp kia đi qua cổng; rồi đổi vai.',
  pads: 'Lần ngược từ goal: hộp phải dừng ở goal, vậy cái gì chặn nó ở đó?', stops: 'Ô phanh là chỗ duy nhất giữa đường mà hộp đang lướt chịu dừng.',
  dash: 'Hộp dash chỉ dừng cạnh tường: tìm những ô có tường phía sau theo hướng bạn đi.', budget: 'Đếm trước: mỗi nước phí là mất một số, không lấy lại được.',
  mx: 'Dùng tường để làm hai hộp lệch nhau: một hộp bị chặn đứng yên trong khi hộp kia đi tiếp.', many: 'Hộp đứng yên cũng là một bức tường cho hộp khác.',
  nolock: 'Đưa hộp tới goal sau cùng cùng lúc với hộp kia, hoặc kẹp một hộp vào tường cạnh goal để nó đứng yên chờ.', helpers: 'Đặt hộp thừa trước, rồi mới phóng hộp chính.',
  trail: 'Dây cũng là tường: vẽ dây để tạo chỗ dừng cho hộp khác.', portals: 'Coi hai cổng như một ô.', opp: 'Hai hộp đi ngược nhau: tìm chỗ một hộp bị tường giữ lại.', oneway: 'Khe một chiều không cho quay lại: tính thứ tự trước khi đi.',
};
function whyBox(p, spec) {
  const r = ['goal'];
  for (const f of ['pads', 'stops', 'portals', 'oneway', 'holes', 'plates']) if ((p[f] || []).length) r.push(f);
  if (p.boxes.some(b => b.dash)) r.push('dash');
  if (p.boxes.some(b => b.n != null)) r.push('budget');
  for (const m of ['mx', 'my', 'opp']) if (p.boxes.some(b => b.m === m)) r.push(m);
  if (p.boxes.length > 1) r.push('nolock');
  if (p.boxes.length > 2 || (p.boxes.length > 1 && p.boxes.every(b => !b.m))) r.push('many');
  if (p.boxes.length > p.exit.length) r.push('helpers');
  if (p.boxes.some(b => b.trail)) r.push('trail');
  let s = spec.intro ? `Bảng dạy luật mới. ${BRULE[spec.intro]} ` : '';
  s += 'Luật trên bảng: ' + r.filter(k => k !== spec.intro).map(k => BRULE[k]).join(' ') + ' ';
  const tip = BTIP[spec.feature || spec.intro] || BTIP[r[r.length - 1]]; if (tip) s += 'Mẹo: ' + tip;
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
add('prim', 1, 3, { base: SE(3, 3), gen: { plates: 1, gates: 1 }, uses: { gate: 1 }, clues: ['broken'], target: 2, intro: 'plates', belief: 'i only draw what someone drew first.' });
add('prim', 1, 4, { base: SE(4, 3), gen: { plates: 1, gates: 1 }, uses: { gate: 1 }, clues: ['sketch', 'broken'], lead: ['sketch'], need: { sketch: 2 }, feature: 'plates', belief: 'if i trace it, it can\'t be wrong.' });
add('prim', 1, 5, { base: SE(4, 4), gen: { plates: 1, gates: 2 }, uses: { gate: 1 }, clues: ['sketch', 'broken'], lead: ['sketch'], need: { sketch: 2 }, feature: 'plates', belief: "i can't draw. i can only trace." });
add('prim', 1, 6, { base: SE(4, 4), gen: { plates: 2, gates: 2, ch: 2 }, uses: { gate: 2 }, clues: ['sketch', 'broken'], lead: ['sketch'], feature: 'plates', belief: "if i copy, i can't be wrong." });
add('prim', 2, 5, { base: MIR(4, 4), gen: { plates: 1, gates: 1 }, uses: { gate: 1 }, clues: ['sketch', 'avoid'], feature: 'mirror', belief: "we never touch. we can't." });
add('prim', 2, 6, { base: SE(4, 4), gen: { plates: 1, gates: 1 }, uses: { gate: 1 }, clues: ['avoid', 'broken'], lead: ['avoid'], need: { avoid: 1 }, feature: 'plates', belief: 'the wrong line is worse than no line.' });
add('prim', 2, 7, { base: MIR(4, 4), clues: ['sketch', 'avoid', 'broken'], need: { sketch: 1, avoid: 1 }, feature: 'mirror', belief: 'the other hand always knows where i am going.' });

/* PRIM · layer 3: the rules she already has, harder (no new rule) */
add('prim', 3, 1, { base: SE(4, 4), clues: ['sketch', 'avoid', 'broken'], lead: ['sketch'], need: { sketch: 2, avoid: 1 }, feature: 'sketch', belief: 'what if i drew something of my own?' });
add('prim', 3, 2, { base: SE(4, 4), gen: { plates: 1, gates: 1, toggle: 1 }, uses: { gate: 1, toggle: 1 }, clues: ['sketch', 'avoid', 'broken'], lead: ['sketch'], feature: 'plates', belief: "it doesn't look like anything. it's mine." });
add('prim', 3, 3, { base: MIR(4, 4), clues: ['sketch', 'avoid'], need: { sketch: 1, avoid: 1 }, feature: 'mirror', belief: 'my colours. my lines.' });
add('prim', 3, 4, { base: SE(5, 4), gen: { plates: 2, gates: 2, toggle: 1, ch: 2 }, uses: { gate: 2 }, clues: ['sketch', 'avoid', 'broken'], lead: ['sketch'], need: { sketch: 1 }, feature: 'plates', belief: 'no pencil to follow. not really.' });
add('prim', 3, 5, { base: MIR(4, 4), gen: { plates: 1, gates: 1, toggle: 1 }, uses: { gate: 1 }, clues: ['sketch', 'avoid'], feature: 'mirror', belief: 'even the other hand draws my way now.' });
add('prim', 3, 6, { base: SE(5, 4), gen: { plates: 2, gates: 2, toggle: 1, ch: 2 }, uses: { gate: 1, toggle: 1 }, clues: ['sketch', 'avoid', 'broken'], lead: ['avoid'], need: { sketch: 2 }, feature: 'plates', belief: "i don't need the pencil anymore." });
add('prim', 3, 7, { base: MIR(4, 4), gen: { plates: 1, gates: 2, toggle: 1 }, uses: { gate: 1 }, clues: ['sketch', 'avoid', 'broken'], need: { sketch: 1 }, feature: 'mirror', belief: 'i trace so she can draw. that is why i am here.' });

/* TRIX · layers 2–3: edge-count numbers, made harder with walls, holes, any start/exit, visit-all, one-way */
add('trix', 2, 1, { base: SE(4, 3), clues: ['nums', 'broken'], lead: ['nums'], leadN: 4, need: { nums: 3 }, feature: 'nums', belief: 'a number is a promise. i keep promises.' });
add('trix', 2, 2, { base: SE(4, 4), gen: { ends: 1 }, clues: ['nums'], need: { nums: 3 }, intro: 'ends', feature: 'nums', belief: "zero means zero. not 'almost'." });
add('trix', 2, 3, { base: SE(4, 4), gen: { holes: 2 }, clues: ['nums', 'broken'], lead: ['nums'], need: { nums: 3 }, intro: 'holes', feature: 'nums', belief: 'three sides. not two. not four. three.' });
add('trix', 2, 4, { base: SE(4, 4), gen: { ends: 1, holes: 1 }, clues: ['nums', 'broken'], lead: ['nums'], need: { nums: 4 }, feature: 'nums', belief: 'if the count is wrong, everything is wrong.' });
add('trix', 2, 5, { base: SE(5, 4), clues: ['nums', 'broken'], lead: ['nums'], need: { nums: 4 }, feature: 'nums', belief: 'i check it again. and again.' });
add('trix', 2, 6, { base: SE(5, 4), gen: { ends: 1, holes: 2 }, clues: ['nums', 'broken'], lead: ['nums'], need: { nums: 4 }, feature: 'nums', belief: "i don't guess. guessing is for people who can't count." });
add('trix', 2, 7, { base: SE(5, 5), gen: { holes: 2 }, clues: ['nums', 'broken'], lead: ['nums'], leadN: 5, need: { nums: 5 }, feature: 'nums', belief: 'every square answers to me.' });
add('trix', 3, 1, { base: { ...SE(4, 3), visitAll: true }, clues: ['nums', 'broken'], lead: ['nums'], need: { nums: 2 }, feature: 'visitAll', belief: 'the whole board. no gaps.' });
add('trix', 3, 2, { base: { ...SE(4, 4), visitAll: true }, gen: { holes: 2 }, clues: ['nums', 'broken'], lead: ['nums'], need: { nums: 2 }, feature: 'nums', belief: 'i finish what i start. all of it.' });
add('trix', 3, 3, { base: SE(4, 4), clues: ['oneway', 'nums', 'broken'], lead: ['oneway'], need: { oneway: 2, nums: 2 }, intro: 'oneway', feature: 'oneway', belief: 'some roads only go one way. like me.' });
add('trix', 3, 4, { base: SE(5, 4), gen: { ends: 1 }, clues: ['nums', 'oneway', 'broken'], lead: ['nums'], need: { nums: 3, oneway: 1 }, feature: 'nums', belief: 'i count the moves before i make them.' });
add('trix', 3, 5, { base: { ...SE(4, 4), visitAll: true }, gen: { ends: 1, holes: 1 }, clues: ['nums', 'broken'], lead: ['nums'], need: { nums: 2 }, feature: 'visitAll', belief: 'a perfect game has no wasted moves.' });
add('trix', 3, 6, { base: SE(5, 5), gen: { holes: 3 }, clues: ['nums', 'oneway', 'broken'], lead: ['nums'], leadN: 5, need: { nums: 5 }, feature: 'nums', belief: 'perfect is the minimum.' });
add('trix', 3, 7, { base: SE(5, 5), gen: { ends: 1, holes: 2 }, clues: ['nums', 'oneway', 'broken'], lead: ['nums'], leadN: 5, need: { nums: 5 }, feature: 'nums', belief: "i exist to be the one who's never wrong." });

/* PAIGE · portals, overpasses, maps with holes, goals anywhere */
const PG = o => ({ clues: ['broken', 'dots'], lead: ['broken'], walls: 10, ...o });
add('paige', 1, 1, PG({ base: SE(3, 3), gen: { portals: 1 }, uses: { portals: 1 }, target: 3, intro: 'portals', belief: 'nobody should be alone in the dark.' }));
add('paige', 1, 2, PG({ base: SE(4, 3), gen: { portals: 1, ends: 1 }, uses: { portals: 1 }, intro: 'ends', feature: 'portals', belief: "two of a kind. that's the safest hand." }));
add('paige', 1, 3, PG({ base: SE(4, 4), gen: { portals: 1, holes: 2 }, uses: { portals: 1 }, intro: 'holes', feature: 'portals', belief: "if they're going to leave, i leave first." }));
add('paige', 1, 4, PG({ base: SE(4, 4), gen: { portals: 2 }, uses: { portals: 2 }, feature: 'portals', belief: 'some doors are already closed.' }));
add('paige', 1, 5, PG({ base: SE(5, 4), gen: { portals: 2, ends: 1, holes: 2 }, uses: { portals: 1 }, feature: 'portals', belief: 'i keep everyone close. too close.' }));
add('paige', 1, 6, PG({ base: SE(5, 4), gen: { portals: 2, holes: 3 }, uses: { portals: 2 }, feature: 'portals', belief: "stay. please. i'll raise the stakes." }));
add('paige', 2, 1, PG({ base: SE(3, 3), gen: { bridges: 1 }, uses: { bridges: 1 }, target: 3, intro: 'bridges', belief: "you don't get to see the cards before you bet." }));
add('paige', 2, 2, PG({ base: SE(4, 3), gen: { bridges: 1, ends: 1 }, uses: { bridges: 1 }, feature: 'bridges', belief: 'every hand is a gamble.' }));
add('paige', 2, 3, PG({ base: SE(4, 4), gen: { bridges: 1, holes: 2 }, uses: { bridges: 1 }, feature: 'bridges', belief: 'i always bet on the worst outcome. it pays.' }));
add('paige', 2, 4, PG({ base: SE(4, 4), gen: { bridges: 2 }, uses: { bridges: 1 }, clues: ['broken', 'dots'], need: { dots: 1 }, feature: 'bridges', belief: 'the house always wins. i am the house.' }));
add('paige', 2, 5, PG({ base: { ...SE(4, 4), visitAll: true }, gen: { bridges: 1, holes: 1 }, uses: { bridges: 1 }, feature: 'bridges', belief: 'i count the exits in every room.' }));
add('paige', 2, 6, PG({ base: SE(5, 4), gen: { bridges: 2, ends: 1, holes: 2 }, uses: { bridges: 1 }, feature: 'bridges', belief: 'if i lose everything, at least it was my choice.' }));
add('paige', 2, 7, PG({ base: SE(5, 4), gen: { bridges: 2, holes: 3 }, uses: { bridges: 2 }, feature: 'bridges', belief: "i'd rather lose than be left." }));
add('paige', 3, 1, PG({ base: SE(4, 4), gen: { bridges: 1, portals: 1 }, uses: { bridges: 1, portals: 1 }, feature: 'bridges', belief: 'the real cards are hidden. look closer.' }));
add('paige', 3, 2, PG({ base: SE(4, 4), gen: { bridges: 1, portals: 1, ends: 1, holes: 2 }, uses: { bridges: 1, portals: 1 }, feature: 'portals', belief: "nobody sees what i'm holding." }));
add('paige', 3, 3, PG({ base: SE(5, 4), gen: { bridges: 1, portals: 1, holes: 2 }, uses: { bridges: 1, portals: 1 }, clues: ['broken', 'dots', 'nums'], feature: 'bridges', belief: 'half the deck is lies.' }));
add('paige', 3, 4, PG({ base: SE(5, 4), gen: { bridges: 2, portals: 1, ends: 1 }, uses: { bridges: 1, portals: 1 }, feature: 'bridges', belief: 'i read the cards so nobody reads me.' }));
add('paige', 3, 5, PG({ base: { ...SE(4, 4), visitAll: true }, gen: { bridges: 1, portals: 1, holes: 1 }, uses: { portals: 1 }, feature: 'portals', belief: 'i only show my hand to people who stay.' }));
add('paige', 3, 6, PG({ base: SE(5, 5), gen: { bridges: 2, portals: 2, holes: 3 }, uses: { bridges: 1, portals: 2 }, feature: 'portals', belief: 'whatever happens, i saw it coming.' }));
add('paige', 3, 7, PG({ base: SE(5, 5), gen: { bridges: 2, portals: 2, ends: 1, holes: 3 }, uses: { bridges: 2, portals: 1 }, feature: 'bridges', belief: 'as long as someone needs me at the table, i stay.' }));

/* VEL · boxes: dash tiles and stops, then the dash box, then move budgets and several boxes */
const BX = (w, h, boxes, o) => ({ box: true, w, h, boxes, ...o });
const B1 = [{}], D1 = [{ dash: true }];
add('vel', 1, 1, BX(3, 3, B1, { gen: { walls: .15, pads: 2 }, uses: { pads: 1 }, minLen: 3, luck: .15, intro: 'pads', belief: 'omg a launch pad!! ...trajectory confirmed.' }));
add('vel', 1, 2, BX(4, 3, B1, { gen: { walls: .2, pads: 3 }, uses: { pads: 2 }, minLen: 4, luck: .08, feature: 'pads', belief: "always have two exits. that's basic." }));
add('vel', 1, 3, BX(4, 4, B1, { gen: { walls: .2, pads: 3, stops: 1 }, uses: { pads: 1, stops: 1 }, minLen: 5, luck: .06, intro: 'stops', belief: 'cute outfit, full tactical plan underneath.' }));
add('vel', 1, 4, BX(4, 4, B1, { gen: { walls: .22, pads: 4, stops: 1, holes: 2 }, uses: { pads: 2 }, minLen: 6, luck: .05, feature: 'pads', belief: 'if the road is blocked, go around. or through.' }));
add('vel', 1, 5, BX(5, 4, B1, { gen: { walls: .2, pads: 4, stops: 1, portals: 1 }, uses: { pads: 1, portals: 1 }, minLen: 6, luck: .04, intro: 'portals', belief: 'two routes in, two routes out. always.' }));
add('vel', 1, 6, BX(5, 5, B1, { gen: { walls: .22, pads: 5, stops: 2, holes: 3 }, uses: { pads: 3 }, minLen: 7, luck: .03, feature: 'pads', belief: "i'm fun at parties because i know where every exit is." }));
add('vel', 2, 1, BX(3, 3, D1, { gen: { walls: .25 }, minLen: 3, luck: .15, intro: 'dash', belief: 'up, down, up. pick a lane, vel.' }));
add('vel', 2, 2, BX(4, 4, D1, { gen: { walls: .25 }, minLen: 5, luck: .06, feature: 'dash', belief: 'yesterday i loved everyone. today i hate this font.' }));
add('vel', 2, 3, BX(4, 4, D1, { gen: { walls: .2, stops: 2 }, uses: { stops: 1 }, minLen: 5, luck: .05, feature: 'stops', belief: "highs and lows are just terrain. i've mapped worse." }));
add('vel', 2, 4, BX(4, 4, [{}, {}], { helpers: 1, gen: { walls: .18, guard: 1, plates: 1 }, uses: { gate: 1 }, minLen: 4, luck: .06, intro: 'plates', belief: 'when the floor drops, i already have a rope.' }));
add('vel', 2, 5, BX(5, 4, [{ dash: true }, {}], { helpers: 1, gen: { walls: .2 }, minLen: 5, luck: .04, intro: 'helpers', belief: 'i write the sad chapters on the good days. just in case.' }));
add('vel', 2, 6, BX(5, 5, [{ dash: true }, {}], { helpers: 1, gen: { walls: .2, guard: 1, plates: 1, stops: 1 }, uses: { gate: 1 }, minLen: 5, maxLen: 12, luck: .03, feature: 'plates', belief: 'stay sharp. moods are weather. weather passes.' }));
add('vel', 2, 7, BX(5, 5, [{ dash: true }, { dash: true }], { gen: { walls: .22, stops: 1 }, minLen: 6, luck: .02, intro: 'many', belief: 'if i keep moving, the low can never catch me.' }));
add('vel', 3, 1, BX(4, 3, [{ n: 1 }], { gen: { walls: .2, pads: 2 }, minLen: 4, luck: .06, intro: 'budget', belief: 'map the ground before you walk it.' }));
add('vel', 3, 2, BX(4, 4, [{ dash: true, n: 1 }], { gen: { walls: .2, stops: 1 }, minLen: 5, luck: .04, feature: 'budget', belief: "you don't step where you haven't checked. ever." }));
add('vel', 3, 3, BX(4, 4, [{ n: 1 }, { n: 1 }], { gen: { walls: .22 }, minLen: 5, luck: .03, feature: 'budget', belief: 'a story is a minefield. i know where i buried everything.' }));
add('vel', 3, 4, BX(5, 4, [{ dash: true, n: 1 }, { n: 1 }], { gen: { walls: .2, pads: 2 }, minLen: 5, luck: .03, feature: 'many', belief: 'swings and landmines. same drill.' }));
add('vel', 3, 5, BX(5, 4, [{ n: 1 }, { dash: true }, {}], { helpers: 1, gen: { walls: .2, guard: 1, plates: 1 }, uses: { gate: 1 }, minLen: 5, luck: .03, feature: 'helpers', belief: 'i plan for the worst so nobody sees me fall.' }));
add('vel', 3, 6, BX(5, 5, [{ dash: true, n: 1 }, { dash: true, n: 1 }], { gen: { walls: .22, pads: 2, portals: 1 }, minLen: 6, luck: .02, feature: 'budget', belief: "if i'm in control, nothing explodes." }));
add('vel', 3, 7, BX(5, 5, [{ n: 1 }, { dash: true, n: 1 }, {}], { helpers: 1, gen: { walls: .2, guard: 2, toggle: 1, plates: 1 }, uses: { gate: 1, toggle: 1 }, minLen: 6, luck: .02, feature: 'plates', belief: 'as long as the map is mine, nobody gets left behind.' }));

/* MYNE · twin boxes: every key moves both, one of them mirrored; boxes never lock in a goal */
const MX = [{}, { m: 'mx' }];
add('myne', 1, 1, BX(3, 2, MX, { gen: { walls: .2 }, minLen: 3, luck: .2, maxShortest: 4, intro: 'mx', belief: "two of me. one keyboard. let's go." }));
add('myne', 1, 2, BX(3, 3, MX, { gen: { walls: .25 }, minLen: 4, luck: .1, intro: 'nolock', leave: true, belief: 'left goes right. my brain is fine with this.' }));
add('myne', 1, 3, BX(4, 3, MX, { gen: { walls: .25, holes: 1 }, minLen: 5, luck: .05, desync: 2, feature: 'mx', belief: 'if one of us gets stuck, the other keeps running.' }));
add('myne', 1, 4, BX(4, 4, MX, { gen: { walls: .25, holes: 2 }, minLen: 6, luck: .04, desync: 2, feature: 'nolock', belief: 'i look strong so nobody asks me to carry things.' }));
add('myne', 1, 5, BX(4, 4, [{}, { m: 'opp' }], { gen: { walls: .25 }, minLen: 5, luck: .04, desync: 2, intro: 'opp', belief: 'co-op mode with myself. high score.' }));
add('myne', 1, 6, BX(4, 4, MX, { gen: { walls: .28, holes: 2 }, minLen: 7, luck: .02, desync: 3, leave: true, feature: 'nolock', belief: 'if i stop moving, everyone sees how tired i am.' }));
add('myne', 2, 1, BX(3, 3, [{ n: 1 }, { m: 'mx', n: 1 }], { gen: { walls: .2 }, minLen: 4, luck: .06, intro: 'budget', belief: "can't. sit. still." }));
add('myne', 2, 2, BX(4, 3, MX, { gen: { walls: .2, oneway: 2 }, uses: { oneway: 1 }, minLen: 5, luck: .04, desync: 2, intro: 'oneway', belief: 'boredom is a bug. i patch it with noise.' }));
add('myne', 2, 3, BX(4, 4, [{}, { m: 'mx' }, { m: 'my' }], { gen: { walls: .22 }, minLen: 5, luck: .03, desync: 2, intro: 'my', belief: 'ten tabs open. all of them important.' }));
add('myne', 2, 4, BX(4, 4, MX, { gen: { walls: .2, plates: 1, gates: 2 }, uses: { gate: 1 }, minLen: 5, luck: .03, intro: 'plates', belief: 'one-way streets? speedrun route.' }));
add('myne', 2, 5, BX(4, 4, MX, { gen: { walls: .18, guard: 2, toggle: 1, plates: 1 }, uses: { gate: 1, toggle: 1 }, minLen: 5, maxLen: 12, luck: .03, feature: 'plates', belief: "if i'm loud enough nobody notices i'm fragile." }));
add('myne', 2, 6, BX(5, 4, [{ n: 1 }, { m: 'mx', n: 1 }], { gen: { walls: .2, guard: 2, toggle: 1, plates: 1, holes: 1 }, uses: { gate: 1, toggle: 1 }, minLen: 6, luck: .02, feature: 'budget', belief: 'finish everything. right now. all of it.' }));
add('myne', 2, 7, BX(5, 4, [{}, { m: 'mx' }, { m: 'opp' }], { gen: { walls: .2, guard: 2, toggle: 1, plates: 1, oneway: 1 }, uses: { gate: 1, toggle: 1 }, minLen: 6, luck: .02, feature: 'many', belief: 'keep moving or the lag catches up.' }));
add('myne', 3, 1, BX(4, 3, [{ dash: true }, { m: 'mx', dash: true }], { gen: { walls: .25 }, minLen: 4, luck: .08, intro: 'dash', belief: 'boost pads! zoom!' }));
add('myne', 3, 2, BX(4, 4, MX, { gen: { walls: .2, pads: 3, stops: 1 }, uses: { pads: 1 }, minLen: 5, luck: .04, intro: 'pads', belief: "my body can't keep up. so my head runs for both." }));
add('myne', 3, 3, BX(4, 4, [{ dash: true }, { m: 'mx' }], { gen: { walls: .22, portals: 1 }, uses: { portals: 1 }, minLen: 5, luck: .03, intro: 'portals', belief: 'warp, dash, park. combo.' }));
add('myne', 3, 4, BX(4, 4, [{ trail: true }, { m: 'mx' }], { gen: { walls: .2 }, minLen: 6, luck: .03, desync: 1, intro: 'trail', belief: 'every direction is forward if you go fast enough.' }));
add('myne', 3, 5, BX(4, 4, [{ dash: true }, { m: 'mx' }], { gen: { walls: .18, guard: 2, toggle: 1, plates: 1, pads: 1 }, uses: { gate: 1, toggle: 1 }, minLen: 5, luck: .02, feature: 'plates', belief: 'i have to see every pixel. every one.' }));
add('myne', 3, 6, BX(5, 4, [{ trail: true }, { m: 'mx' }], { gen: { walls: .15, guard: 1, plates: 1 }, uses: { gate: 1 }, minLen: 6, luck: .02, feature: 'trail', belief: 'two players, one heart rate.' }));
add('myne', 3, 7, BX(5, 5, [{ n: 1 }, { m: 'mx', dash: true }, { m: 'opp' }], { gen: { walls: .2, guard: 2, toggle: 1, plates: 1, portals: 1 }, uses: { gate: 1, toggle: 1 }, minLen: 7, luck: .02, feature: 'many', belief: 'as long as the game is running, i get to keep playing.' }));

/* TUTORIALS · one tiny, very easy panel right before each mechanic first shows up (id <girl>_<layer>_t<n>) */
const TUT = (girl, layer, before, teach, o, k = 0) => S.push({ id: `${girl}_${layer}_t${before}${k ? 'b' : ''}`, girl, layer, n: before - .6 + k * .3, tut: teach, intro: o.intro || teach, belief: o.belief || '', ...o });
const EZ = o => ({ luck: 1, maxShortest: 6, minLen: 1, ...o });
TUT('prim', 1, 1, 'basic', { base: SE(2, 1), clues: [], target: 99, intro: 'basic' });
TUT('prim', 1, 1, 'sketch', { base: SE(2, 1), clues: ['sketch'], need: { sketch: 2 }, target: 2 }, 1);
TUT('prim', 1, 3, 'plates', { base: SE(2, 1), gen: { plates: 1, gates: 1 }, uses: { gate: 1 }, clues: ['broken'], target: 3 });
TUT('prim', 2, 1, 'avoid', { base: SE(2, 1), clues: ['avoid'], need: { avoid: 1 }, target: 2 });
TUT('prim', 2, 3, 'mirror', { base: MIR(2, 2), clues: [], target: 3 });
TUT('prim', 3, 2, 'swap', { base: SE(3, 1), gen: { plates: 1, gates: 1, toggle: 1 }, uses: { gate: 1, toggle: 1 }, clues: ['broken'], target: 3, intro: 'plates' });
TUT('trix', 1, 3, 'nums', { base: SE(2, 2), clues: ['nums'], lead: ['nums'], need: { nums: 1 }, target: 3 });
TUT('trix', 2, 2, 'ends', { base: SE(2, 2), gen: { ends: 1 }, clues: ['broken'], target: 4 });
TUT('trix', 2, 3, 'holes', { base: SE(2, 2), gen: { holes: 1 }, clues: [], target: 6 });
TUT('trix', 3, 3, 'oneway', { base: SE(2, 2), clues: ['oneway', 'broken'], lead: ['oneway'], need: { oneway: 1 }, target: 3 });
TUT('paige', 1, 1, 'portals', { base: SE(2, 2), gen: { portals: 1 }, uses: { portals: 1 }, clues: ['broken'], target: 3 });
TUT('paige', 2, 1, 'bridges', { base: SE(2, 2), gen: { bridges: 1 }, uses: { bridges: 1 }, clues: ['broken'], target: 3 });
TUT('vel', 1, 1, 'boxes', BX(2, 1, [{}], EZ({ gen: { walls: .01 }, minLen: 2, intro: 'goal' })));
TUT('vel', 1, 1, 'pads', BX(3, 1, [{}], EZ({ gen: { walls: .05, pads: 1 }, uses: { pads: 1, slide: 1 }, maxLen: 3 })), 1);
TUT('vel', 1, 3, 'stops', BX(3, 1, [{}], EZ({ gen: { walls: .01, pads: 1, stops: 1 }, uses: { pads: 1, stops: 1, slide: 1 }, maxLen: 4 })));
TUT('vel', 1, 5, 'portals', BX(3, 2, [{}], EZ({ gen: { walls: .05, portals: 1 }, uses: { portals: 1 }, maxLen: 4 })));
TUT('vel', 2, 1, 'dash', BX(2, 2, D1, EZ({ gen: { walls: .15 }, maxLen: 3 })));
TUT('vel', 2, 4, 'plates', BX(3, 1, [{}, {}], EZ({ helpers: 1, gen: { walls: .01, guard: 1, plates: 1 }, uses: { gate: 1 }, maxLen: 5 })));
TUT('vel', 3, 1, 'budget', BX(3, 1, [{ n: 1 }], EZ({ gen: { walls: .1 }, minLen: 2, maxLen: 4, noBind: true })));
TUT('vel', 3, 7, 'swap', BX(3, 2, [{}, {}, {}], EZ({ helpers: 1, gen: { walls: .05, guard: 2, toggle: 1, plates: 1 }, uses: { gate: 1, toggle: 1 }, minLen: 2, maxLen: 6, tries: 3000, intro: 'plates' })));
TUT('myne', 1, 1, 'twin', BX(2, 1, MX, EZ({ gen: { walls: .01 }, maxLen: 3, intro: 'mx' })));
TUT('myne', 1, 2, 'nolock', BX(3, 1, MX, EZ({ gen: { walls: .1 }, leave: true, minLen: 2, maxLen: 5 })));
TUT('myne', 1, 5, 'opp', BX(2, 2, [{}, { m: 'opp' }], EZ({ gen: { walls: .1 }, desync: 1, maxLen: 4 })));
TUT('myne', 2, 3, 'my', BX(2, 2, [{}, { m: 'my' }], EZ({ gen: { walls: .1 }, desync: 1, maxLen: 4 })));
TUT('myne', 2, 5, 'swap', BX(3, 2, MX, EZ({ gen: { walls: .05, guard: 2, toggle: 1, plates: 1 }, uses: { gate: 1, toggle: 1 }, minLen: 2, maxLen: 6, tries: 3000, intro: 'plates' })));
TUT('myne', 3, 4, 'trail', BX(2, 2, [{ trail: true }], EZ({ gen: { walls: .1 }, minLen: 2, maxLen: 4 })));

/* ======================= build ======================= */
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
const isKept = p => (p.girl === 'prim' && p.layer <= 2) || (p.girl === 'trix' && p.layer === 1);
const keep = old.filter(p => isKept(p) || (ONLY && p.girl !== ONLY && !process.env.PART));
keep.forEach(p => p.sol && USED.add(JSON.stringify(p.sol)));
const out = keep.slice();
const IDS = process.env.IDS ? process.env.IDS.split(',') : null;
for (const spec of S) {
  if (ONLY && spec.girl !== ONLY) continue;
  if (IDS && !IDS.includes(spec.id)) continue;
  seed = hash(spec.id) || 1;
  const t0 = Date.now(); let p;
  try { p = spec.box ? designBox(spec) : designSingle(spec); } catch (e) { console.log('SKIP', spec.id, e.message); continue; }
  Object.assign(p, { belief: spec.belief, intro: spec.intro || null }); if (spec.tut) p.tut = spec.tut;
  p.why = p.boxes ? whyBox(p, spec) : whyFor(p, spec);
  out.push(p);
  const f = ['holes', 'broken', 'oneway', 'pads', 'stops', 'portals', 'bridges', 'plates', 'gates', 'dots', 'nums', 'sketch', 'avoid', 'squares'].filter(k => (p[k] || []).length).map(k => `${k} ${p[k].length}`).join(', ');
  console.log(`${p.id.padEnd(10)} ${p.w}x${p.h}${p.boxes ? ' boxes ' + p.boxes.length : ''}${p.mirror ? ' mirror' : ''}${p.visitAll ? ' all' : ''}${p.moves ? ' moves=' + p.moves : ''}  ${p.boxes ? `shortest ${p.minMoves} (${p.solutions} ways, luck ${p.luck}%)` : `sols ${p.solutions} · ${p.minMoves} moves`}  ${f}  (${Date.now() - t0}ms)`);
}
const ord = { prim: 0, trix: 1, paige: 2, vel: 3, myne: 4 };
out.sort((a, b) => ord[a.girl] - ord[b.girl] || a.layer - b.layer || a.n - b.n);
if (IDS) fs.writeFileSync(process.env.PART, JSON.stringify(out.filter(p => IDS.includes(p.id)), null, 1));
else if (process.env.PART) fs.writeFileSync(process.env.PART, JSON.stringify(out.filter(p => p.girl === ONLY), null, 1));
else fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('wrote', process.env.PART ? out.filter(p => p.girl === ONLY).length : out.length, 'panels');
