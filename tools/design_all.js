// Designs + verifies every Test-chamber panel → src/panels.json
//   node tools/design_all.js            (all girls)
//   node tools/design_all.js vel        (one girl; the others are kept from panels.json)
// For each panel: enumerate the routes the board allows, pick a winding one nobody else uses,
// add clue units (consistent with that route) until at most `target` solutions remain, then
// prune every unit that isn't needed. Hidden mines also get radar numbers until the mine
// layout itself can be deduced.
const E = require('../src/panel_engine.js');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '../src/panels.json');
const ONLY = process.argv[2];

let seed = 1;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const CLUES = ['sketch', 'avoid', 'squares', 'shapes', 'nums', 'pieces', 'order', 'hearts', 'dots', 'broken', 'warm', 'cool', 'mines', 'radar'];
const count = (p, lim) => E.solve(p, lim).length;
const turns = pth => pth.slice(2).filter((n, i) => (n[0] - pth[i][0]) && (n[1] - pth[i][1])).length;
const USED = new Set();

function usedEdges(p, sol) {
  const J = E.jumps(p, sol), s = new Set();
  for (const ln of E.lines(p, sol)) for (let i = 1; i < ln.length; i++) if (!J[i]) s.add(E.ekey(...ln[i - 1], ...ln[i]));
  return s;
}
function allEdges(p) {
  const d = E.dims(p), out = [];
  for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
    const [a, b] = E.norm(p, nx, ny); if (!E.inside(p, a, b) || (a === x && b === y)) continue;
    out.push([x, y, a, b]);
  }
  return out;
}
const cells = p => { const o = []; for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) o.push([x, y]); return o; };
const COLORS = ['pink', 'violet', 'teal'];

/* clue units that agree with the intended route `sol` */
function units(p, sol, kinds) {
  const used = usedEdges(p, sol), U = [];
  const seenNodes = new Set(E.lines(p, sol).flat().map(n => n.join(',')));
  const ends = new Set([...(p.start || []), ...(p.exit || [])].map(n => n.join(',')));
  const reg = kinds.some(k => ['squares', 'shapes', 'pieces', 'hearts'].includes(k)) ? E.regions(p, used) : null;
  for (const k of kinds) {
    if (k === 'sketch') allEdges(p).filter(e => used.has(E.ekey(...e))).forEach(e => U.push({ k, add: [['sketch', e]] }));
    // walls only where the route makes a choice: edges that leave a node of the route
    if (k === 'avoid' || k === 'broken') allEdges(p).filter(e => !used.has(E.ekey(...e)) && (seenNodes.has(e[0] + ',' + e[1]) || seenNodes.has(e[2] + ',' + e[3]))).forEach(e => U.push({ k, add: [[k, e]] }));
    if (k === 'dots') sol.slice(1, -1).filter(n => !ends.has(n.join(','))).forEach(n => U.push({ k, add: [['dots', n]] }));
    if (k === 'order') sol.slice(1, -1).forEach(n => U.push({ k, add: [['order', n]] }));
    if (k === 'nums') cells(p).forEach(([x, y]) => U.push({ k, cells: [[x, y]], add: [['nums', [x, y, E.cellSides(x, y).filter(s => used.has(s)).length]]] }));
    if (k === 'squares') {
      // colour regions so neighbours across the line differ where possible
      const side = {}; const q = [0]; side[0] = 0;
      const adj = r => { const o = new Set(); reg.list[r].forEach(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const t = reg.reg[(x + dx) + ',' + (y + dy)]; if (t !== undefined && t !== r) o.add(t); })); return o; };
      while (q.length) { const a = q.shift(); adj(a).forEach(b => { if (side[b] === undefined) { side[b] = 1 - side[a]; q.push(b); } }); }
      reg.list.forEach((c, r) => { if (side[r] === undefined) side[r] = r % 2; });
      cells(p).forEach(([x, y]) => U.push({ k, cells: [[x, y]], add: [['squares', [x, y, side[reg.reg[x + ',' + y]] ? 'ink' : 'pink']]] }));
    }
    if (k === 'shapes') reg.list.forEach(c => { if (c.length >= 2 && c.length <= 5) { const at = c[Math.floor(rnd() * c.length)]; U.push({ k, cells: [at], add: [['shapes', [at[0], at[1], c.map(z => z.slice())]]] }); } });
    if (k === 'pieces') reg.list.forEach(c => {
      const s = c.length, opts = [];
      for (const a of 'PNBRQ') { if (E.VAL[a] === s) opts.push([a]); for (const b of 'PNRQ') if (E.VAL[a] + E.VAL[b] === s && E.VAL[a] >= E.VAL[b]) opts.push([a, b]); }
      if (!opts.length) return;
      const pick = opts[Math.floor(rnd() * opts.length)], at = shuffle(c.slice()).slice(0, pick.length);
      if (at.length < pick.length) return;
      U.push({ k, cells: at, add: pick.map((pc, i) => ['pieces', [at[i][0], at[i][1], pc]]) });
    });
    if (k === 'hearts') reg.list.forEach(c => {
      if (c.length < 2) return;
      const cs = shuffle(c.slice());
      for (let i = 0; i + 1 < cs.length && i < 6; i += 2) U.push({ k, cells: [cs[i], cs[i + 1]], color: COLORS[(i / 2) % 3], region: c, add: [['hearts', [cs[i][0], cs[i][1], COLORS[(i / 2) % 3]]], ['hearts', [cs[i + 1][0], cs[i + 1][1], COLORS[(i / 2) % 3]]]] });
    });
    if (k === 'mood') {
      // colour edges warm/cool: route edges by the mood the route is in there, others at random
      let up = true; const J = E.jumps(p, sol), moodAt = new Map();
      for (let i = 1; i < sol.length; i++) { if (!J[i]) moodAt.set(E.ekey(...sol[i - 1], ...sol[i]), up); if (E.isSwitch(p, ...sol[i])) up = !up; }
      allEdges(p).forEach(e => { const kk = E.ekey(...e), m = moodAt.has(kk) ? moodAt.get(kk) : rnd() < .5; U.push({ k, add: [[m ? 'warm' : 'cool', e]] }); });
    }
    if (k === 'mines') cells(p).filter(([x, y]) => E.cellSides(x, y).every(s => !used.has(s))).forEach(c => U.push({ k, cells: [c], add: [['mines', c]] }));
  }
  return U;
}
function apply(base, list) {
  const q = clone(base);
  list.forEach(u => u.add.forEach(([f, v]) => { (q[f] = q[f] || []).push(clone(v)); }));
  if (q.order) q.order.sort((a, b) => q.__sol.findIndex(n => n[0] === a[0] && n[1] === a[1]) - q.__sol.findIndex(n => n[0] === b[0] && n[1] === b[1]));
  return q;
}
const strip = q => { const o = clone(q); delete o.__sol; return o; };
const good = (q, sol, target) => {
  if (!E.validate(strip(q), sol).ok) return false;
  const s = E.solve(strip(q), target + 1);
  return target === 1 ? s.length === 1 && same(s[0], sol) : s.length <= target;
};

/* make the hidden mines deducible from radar numbers (Minesweeper-style) */
function addRadar(q) {
  const mines = new Set(q.mines.map(c => c.join(','))), taken = new Set(['squares', 'nums', 'pieces', 'hearts', 'shapes'].flatMap(f => (q[f] || []).map(c => c[0] + ',' + c[1])));
  const around = (x, y) => { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && mines.has((x + dx) + ',' + (y + dy))) n++; return n; };
  const cand = shuffle(cells(q).filter(([x, y]) => !mines.has(x + ',' + y) && !taken.has(x + ',' + y)).map(([x, y]) => [x, y, around(x, y)]))
    .sort((a, b) => (b[2] > 0) - (a[2] > 0));
  const uniqueMines = radar => {
    const known = new Set(radar.map(r => r[0] + ',' + r[1])), unk = cells(q).filter(([x, y]) => !known.has(x + ',' + y) && !taken.has(x + ',' + y));
    let found = 0;
    for (let m = 0; m < (1 << unk.length); m++) {
      const set = new Set(unk.filter((_, i) => m & (1 << i)).map(c => c.join(',')));
      if (radar.every(([x, y, n]) => { let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && set.has((x + dx) + ',' + (y + dy))) c++; return c === n; })) { if (++found > 1) return false; }
    }
    return found === 1;
  };
  const r = [];
  for (const c of cand) { if (uniqueMines(r)) break; r.push(c); }
  if (!uniqueMines(r)) return false;
  for (let i = r.length - 1; i >= 0; i--) { const t = r.slice(0, i).concat(r.slice(i + 1)); if (uniqueMines(t)) r.splice(i, 1); }
  q.radar = r; return true;
}

// try the spec as written, then with progressively looser limits
function design(spec) {
  const tries = [spec,
    { ...spec, walls: (spec.walls || 6) + 3, max: (spec.max || 16) + 4 },
    { ...spec, clues: [...new Set([...(spec.clues || []), 'dots', 'broken'])], walls: 8, max: 20, top: .6 }];
  let err;
  for (const t of tries) { try { const p = designOnce(t); if (t !== spec) p.note = (p.note ? p.note + ' ' : '') + '(relaxed limits)'; return p; } catch (e) { err = e; } }
  throw err;
}
function designOnce(spec) {
  seed = hash(spec.id) || 1;
  const base = { id: spec.id, girl: spec.girl, layer: spec.layer, n: spec.n, ...clone(spec.base) };
  const target = spec.target || 1, kinds = spec.clues || [], need = spec.need || {};
  let routes = E.solve(base, 400000).filter(s => !USED.has(JSON.stringify(s)) && (!spec.filter || spec.filter(s, base)));
  if (!routes.length) throw new Error(spec.id + ': no route');
  routes.sort((a, b) => turns(b) - turns(a) || b.length - a.length);
  routes = shuffle(routes.slice(0, Math.max(6, Math.ceil(routes.length * (spec.top || .3)))));
  for (const sol of routes.slice(0, 60)) {
    const pool = units(base, sol, kinds);
    const lead = shuffle(pool.filter(u => spec.lead && spec.lead.includes(u.k))), rest = shuffle(pool.filter(u => !(spec.lead && spec.lead.includes(u.k))));
    const order = lead.slice(0, spec.leadN || 3).concat(shuffle(rest.concat(lead.slice(spec.leadN || 3))));   // the featured rule first, then a mix
    const chosen = [], occ = new Set(), heartCols = new Map();
    const fits = u => {
      if ((u.cells || []).some(c => occ.has(c.join(',')))) return false;
      if (u.k === 'hearts') { const r = JSON.stringify(u.region); const s = heartCols.get(r) || new Set(); if (s.has(u.color)) return false; }
      return true;
    };
    const take = u => { chosen.push(u); (u.cells || []).forEach(c => occ.add(c.join(','))); if (u.k === 'hearts') { const r = JSON.stringify(u.region); heartCols.set(r, (heartCols.get(r) || new Set()).add(u.color)); } };
    let q = apply({ ...base, __sol: sol }, []);
    for (const u of order) {
      if (good(q, sol, target) && Object.entries(need).every(([f, n]) => (q[f] || []).length >= n)) break;
      if (!fits(u)) continue;
      take(u); q = apply({ ...base, __sol: sol }, chosen);
    }
    if (!good(q, sol, target)) continue;
    // prune, newest first, but keep what `need` asks for
    for (let i = chosen.length - 1; i >= 0; i--) {
      const t = chosen.slice(0, i).concat(chosen.slice(i + 1)), tq = apply({ ...base, __sol: sol }, t);
      if (Object.entries(need).every(([f, n]) => (tq[f] || []).length >= n) && good(tq, sol, target)) chosen.splice(i, 1);
    }
    q = apply({ ...base, __sol: sol }, chosen);
    if (!Object.entries(need).every(([f, n]) => (q[f] || []).length >= n)) continue;
    const total = CLUES.reduce((a, f) => a + (q[f] || []).length, 0);
    if (['avoid', 'broken'].some(f => (q[f] || []).length > (spec.walls || 6))) continue;
    if (total > (spec.max || 16)) continue;
    if (q.mines && q.mines.length && !addRadar(q)) continue;
    const out = strip(q);
    // presentation-only marks
    if (spec.fog) (out[spec.fog] || []).forEach(e => e.push({ fog: true }));
    if (spec.lens) (out[spec.lens] || []).forEach((e, i) => { if (i % (spec.lensEvery || 1) === 0) e.push({ lens: true }); });
    const sols = E.solve(out, 61);
    out.sol = sols.find(s => same(s, sol)) || sols[0]; out.solutions = sols.length > 60 ? '60+' : sols.length;
    USED.add(JSON.stringify(out.sol));
    Object.assign(out, { belief: spec.belief, note: spec.note || '', intro: spec.intro || null });
    out.why = whyFor(out, spec);
    return out;
  }
  throw new Error(spec.id + ': could not design (try another size, target or clue mix)');
}

/* ---------------- key ideas (Vietnamese, for the Solution mode) ---------------- */
const RULE = {
  sketch: 'Nét chì mờ phải được tô lại.',
  avoid: 'Nét chì đen là của "bàn tay kia": không được đi lên nó.',
  squares: 'Mực hồng và mực đen phải nằm ở các vùng khác nhau.',
  mirror: 'Bàn tay kia tự vẽ một đường đối xứng; hai đường không được chạm nhau.',
  shapes: 'Vùng chứa ô hình mẫu phải có đúng hình dạng đó (không xoay).',
  nums: 'Con số trong ô = số cạnh của ô mà đường chạm vào.',
  visitAll: 'Phải đi qua mọi điểm.',
  pieces: 'Số ô của vùng = tổng giá trị quân cờ trong vùng (tốt 1, mã 3, tượng 3, xe 5, hậu 9).',
  order: 'Các điểm đánh số phải được đi qua theo đúng thứ tự 1, 2, 3…',
  hearts: 'Mỗi trái tim phải ở chung vùng với đúng một trái tim cùng màu: không ai một mình, không ai thừa.',
  fog: 'Lá bài úp: ký hiệu chỉ lật lên khi đường đi sát bên ô đó.',
  lens: 'Một số ký hiệu chỉ thấy được qua kính lúp (nút Lens, rê chuột trên bảng).',
  portals: 'Bước lên một cổng thì đường xuất hiện ở cổng cùng màu bên kia.',
  switches: 'Mỗi lần đi qua công tắc ◐, tâm trạng đổi. Đường ấm (cam) chỉ đi được khi đang "lên" (lúc đầu), đường lạnh (xanh) chỉ đi được khi đang "xuống".',
  mines: 'Có mìn giấu trong vài ô. Số trong ô radar ◇ = số mìn ở 8 ô xung quanh. Đường không được chạm cạnh ô có mìn.',
  restless: n => `Không được đi thẳng quá ${n} đoạn liên tiếp: phải rẽ liên tục.`,
  wrapx: 'Mép trái và mép phải nối với nhau: đi ra một bên thì vào lại từ bên kia.',
  wrapxy: 'Bảng nối cả bốn mép (như màn hình game cũ); lối ra là vòng sáng nằm giữa bảng.',
  broken: 'Đoạn đứt không đi được.',
  dots: 'Chấm đen phải được đi qua.',
};
const TIP = {
  sketch: 'Tìm đoạn chì chỉ có một cách nối hợp lý với vòng tròn hoặc lối ra, rồi lần dần vào giữa.',
  avoid: 'Nét chì đen chặn đường như tường: xem chúng tạo thành hành lang nào.',
  squares: 'Hai ô khác màu nằm sát nhau buộc đường phải đi qua cạnh chung của chúng.',
  mirror: 'Đường chính không được chạm trục đối xứng (và không chạm đường phản chiếu): coi trục giữa là tường.',
  shapes: 'Vẽ thử hình mẫu quanh ô của nó: thường chỉ có một chỗ đặt vừa mà không đè lên ký hiệu khác.',
  nums: 'Ô "0" và ô "3" cho nhiều thông tin nhất: bắt đầu từ chúng.',
  pieces: 'Quân giá trị lớn (xe, hậu) cần vùng lớn, quân tốt cần vùng đúng 1 ô: khoanh tốt trước.',
  order: 'Đi từ số này tới số kế bằng đường ngắn nhất, nhưng nhớ chừa lối cho các số sau.',
  hearts: 'Trái tim cùng màu ở xa nhau thì phải chung một vùng lớn; hai trái tim cùng màu nằm sát nhau mà có trái tim thứ ba cùng màu gần đó thì phải tách ra.',
  fog: 'Đi dò dọc mép để lật bài trước, đừng vội cắt bảng.',
  lens: 'Soi kính lúp khắp bảng trước khi vẽ: ký hiệu ẩn thường là chìa khoá.',
  portals: 'Coi hai cổng như một điểm: đường vào một cổng là đi tiếp từ cổng kia.',
  switches: 'Đánh dấu mỗi đoạn màu cần tâm trạng nào, rồi xếp các lần đi qua công tắc cho khớp.',
  mines: 'Giải phần mìn trước như Minesweeper (số 0 = xung quanh an toàn), rồi mới vẽ đường.',
  restless: 'Đường bắt buộc zigzag: đếm số bước để biết sẽ ra lối ra từ hướng nào.',
  wrap: 'Đường ngắn nhất có thể là đi xuyên mép.',
  visitAll: 'Góc bảng chỉ có 2 lối nên đường đi qua góc theo đúng 2 lối đó.',
};
function rulesOf(p) {
  const r = [];
  if (p.wrap) r.push(p.wrap === 'xy' ? 'wrapxy' : 'wrapx');
  for (const f of ['sketch', 'avoid', 'squares', 'shapes', 'nums', 'pieces', 'order', 'hearts', 'dots', 'broken']) if ((p[f] || []).length) r.push(f);
  if (p.mirror) r.push('mirror'); if (p.visitAll) r.push('visitAll'); if (p.portals) r.push('portals'); if (p.switches) r.push('switches');
  if ((p.mines || []).length) r.push('mines'); if (p.restless) r.push('restless');
  if (['hearts', 'dots', 'nums'].some(f => (p[f] || []).some(e => e[e.length - 1] && e[e.length - 1].fog))) r.push('fog');
  if (['hearts', 'dots', 'nums', 'pieces'].some(f => (p[f] || []).some(e => e[e.length - 1] && e[e.length - 1].lens))) r.push('lens');
  return r;
}
function whyFor(p, spec) {
  const r = rulesOf(p), txt = k => typeof RULE[k] === 'function' ? RULE[k](p.restless) : RULE[k];
  const feat = spec.feature || r[0];
  let s = spec.intro ? `Bảng dạy luật mới. ${txt(spec.intro)} ` : '';
  s += 'Luật trên bảng: ' + r.filter(k => k !== spec.intro).map(txt).join(' ') + ' ';
  const tip = TIP[feat] || TIP[feat && feat.replace(/x+y?$/, '')];
  if (tip) s += 'Mẹo: ' + tip;
  if (spec.why) s = spec.why;
  return s.trim();
}

/* ======================= the panels ======================= */
const S = [];
const add = (girl, layer, n, o) => S.push({ id: `${girl}_${layer}_${n}`, girl, layer, n, ...o });
const SE = (w, h) => ({ w, h, start: [[0, h]], exit: [[w, 0]] });   // bottom-left → top-right

/* ---------- PRIM · tracing, the other hand, drawing her own ---------- */
add('prim', 1, 6, { base: { ...SE(4, 3) }, clues: ['squares', 'sketch'], lead: ['squares'], need: { squares: 3, sketch: 1 }, belief: "if i copy, i can't be wrong." });
add('prim', 2, 1, { base: { ...SE(3, 3) }, clues: ['avoid'], target: 3, need: { avoid: 2 }, intro: 'avoid', belief: "the black lines aren't mine. i won't touch them." });
add('prim', 2, 2, { base: { ...SE(4, 3) }, clues: ['avoid', 'sketch'], lead: ['avoid'], need: { avoid: 2, sketch: 1 }, belief: 'i know which lines are mine. i think.' });
add('prim', 2, 3, { base: { w: 4, h: 3, start: [[0, 3], [4, 3]], exit: [[1, 0], [3, 0]], mirror: 'x' }, clues: ['sketch'], target: 3, intro: 'mirror', belief: 'when i draw, the other hand draws too.' });
add('prim', 2, 4, { base: { w: 4, h: 3, start: [[0, 3], [4, 3]], exit: [[0, 0], [4, 0]], mirror: 'x' }, clues: ['sketch', 'avoid'], lead: ['sketch'], belief: 'it copies everything i do.' });
add('prim', 2, 5, { base: { w: 4, h: 4, start: [[0, 4], [4, 4]], exit: [[1, 0], [3, 0]], mirror: 'x' }, clues: ['squares'], need: { squares: 3 }, belief: "we never touch. we can't." });
add('prim', 2, 6, { base: { ...SE(4, 4) }, clues: ['avoid', 'squares'], lead: ['avoid'], need: { avoid: 2, squares: 2 }, belief: 'pink is mine. the black was never mine.' });
add('prim', 2, 7, { base: { w: 4, h: 4, start: [[0, 4], [4, 4]], exit: [[0, 0], [4, 0]], mirror: 'x' }, clues: ['avoid', 'sketch', 'squares'], need: { avoid: 1, sketch: 1, squares: 1 }, max: 14, belief: 'the other hand always knows where i am going.' });
add('prim', 3, 1, { base: { ...SE(3, 3) }, clues: ['shapes'], target: 3, need: { shapes: 2 }, intro: 'shapes', belief: 'what if i drew something of my own?' });
add('prim', 3, 2, { base: { ...SE(4, 3) }, clues: ['shapes'], need: { shapes: 2 }, belief: "it doesn't look like anything. it's mine." });
add('prim', 3, 3, { base: { ...SE(4, 4) }, clues: ['shapes', 'squares'], lead: ['shapes'], need: { shapes: 2, squares: 1 }, belief: 'my colours. my shapes.' });
add('prim', 3, 4, { base: { ...SE(4, 4) }, clues: ['shapes', 'avoid'], lead: ['shapes'], need: { shapes: 2, avoid: 1 }, belief: 'no pencil. nothing to follow.' });
add('prim', 3, 5, { base: { w: 4, h: 4, start: [[0, 4], [4, 4]], exit: [[0, 0], [4, 0]], mirror: 'x' }, clues: ['shapes', 'sketch'], lead: ['shapes'], need: { shapes: 1 }, belief: 'even the other hand draws my shapes now.' });
add('prim', 3, 6, { base: { ...SE(5, 4) }, clues: ['shapes', 'squares', 'avoid'], lead: ['shapes'], need: { shapes: 2, squares: 1 }, belief: "i don't need the pencil anymore." });
add('prim', 3, 7, { base: { w: 4, h: 4, start: [[0, 4], [4, 4]], exit: [[0, 0], [4, 0]], mirror: 'x' }, clues: ['shapes', 'squares', 'avoid'], lead: ['shapes'], need: { shapes: 1, squares: 1 }, belief: 'i trace so she can draw. that is why i am here.' });

/* ---------- TRIX · completeness, chess, proof order ---------- */
add('trix', 1, 6, { base: { ...SE(4, 3) }, clues: ['nums', 'broken'], lead: ['nums'], need: { nums: 3 }, belief: 'rules exist so nothing surprises me.' });
add('trix', 2, 1, { base: { ...SE(3, 3) }, clues: ['pieces'], target: 3, need: { pieces: 2 }, intro: 'pieces', belief: 'every piece has a value. so does everyone.' });
add('trix', 2, 2, { base: { ...SE(4, 3) }, clues: ['pieces'], need: { pieces: 2 }, belief: 'a knight is worth three. i counted.' });
add('trix', 2, 3, { base: { ...SE(4, 3) }, clues: ['pieces', 'nums'], lead: ['pieces'], need: { pieces: 2, nums: 1 }, belief: 'pieces and numbers. both obey me.' });
add('trix', 2, 4, { base: { ...SE(4, 3), visitAll: true }, clues: ['pieces'], need: { pieces: 1 }, belief: 'i have to cover the whole board.' });
add('trix', 2, 5, { base: { ...SE(4, 4) }, clues: ['pieces', 'broken'], lead: ['pieces'], leadN: 4, need: { pieces: 3 }, walls: 3, belief: 'i see twelve moves ahead. always.' });
add('trix', 2, 6, { base: { ...SE(4, 4) }, clues: ['pieces', 'nums'], lead: ['pieces'], need: { pieces: 2, nums: 1 }, belief: 'a sacrifice is fine if the math works.' });
add('trix', 2, 7, { base: { ...SE(4, 4) }, clues: ['pieces', 'nums', 'broken'], lead: ['pieces'], need: { pieces: 2, nums: 2 }, belief: "i don't lose. losing is an arithmetic error." });
add('trix', 3, 1, { base: { ...SE(3, 3) }, clues: ['order'], target: 3, need: { order: 3 }, intro: 'order', belief: 'step one, then step two. never skip.' });
add('trix', 3, 2, { base: { ...SE(4, 3) }, clues: ['order'], need: { order: 3 }, belief: 'a proof has exactly one order.' });
add('trix', 3, 3, { base: { ...SE(4, 3), visitAll: true }, clues: ['order'], need: { order: 2 }, belief: 'complete, and in order.' });
add('trix', 3, 4, { base: { ...SE(4, 4) }, clues: ['order', 'nums'], lead: ['order'], need: { order: 2, nums: 1 }, belief: "if i check every line twice, i'm allowed to rest." });
add('trix', 3, 5, { base: { ...SE(4, 4) }, clues: ['order', 'pieces'], lead: ['order'], need: { order: 2, pieces: 1 }, belief: 'the board is mine. every square of it.' });
add('trix', 3, 6, { base: { ...SE(4, 4), visitAll: true }, clues: ['order', 'nums'], lead: ['order'], need: { order: 2, nums: 1 }, belief: 'perfect is the minimum.' });
add('trix', 3, 7, { base: { ...SE(4, 4) }, clues: ['order', 'pieces', 'nums'], lead: ['order'], need: { order: 2, pieces: 1, nums: 1 }, belief: "i exist to be the one who's never wrong." });

/* ---------- PAIGE · pairs, face-down cards, what only the lens shows ---------- */
const H = (o) => ({ lead: ['hearts'], leadN: 4, walls: 3, max: 14, ...o });
add('paige', 1, 1, H({ base: { ...SE(3, 3) }, clues: ['hearts'], target: 4, need: { hearts: 4 }, intro: 'hearts', belief: 'nobody should be alone in the dark.' }));
add('paige', 1, 2, H({ base: { ...SE(4, 3) }, clues: ['hearts', 'dots'], need: { hearts: 4 }, belief: "two of a kind. that's the safest hand." }));
add('paige', 1, 3, H({ base: { ...SE(4, 3) }, clues: ['hearts', 'broken'], need: { hearts: 6 }, belief: "if they're going to leave, i leave first." }));
add('paige', 1, 4, H({ base: { ...SE(4, 4) }, clues: ['hearts', 'broken'], need: { hearts: 4, broken: 1 }, belief: 'some doors are already closed.' }));
add('paige', 1, 5, H({ base: { ...SE(4, 4) }, clues: ['hearts', 'dots'], need: { hearts: 6 }, belief: 'i keep everyone close. too close.' }));
add('paige', 1, 6, H({ base: { ...SE(4, 4) }, clues: ['hearts', 'dots', 'broken'], need: { hearts: 6, dots: 1 }, belief: "stay. please. i'll raise the stakes." }));
add('paige', 2, 1, H({ base: { ...SE(3, 3) }, clues: ['hearts'], target: 4, need: { hearts: 4 }, fog: 'hearts', intro: 'fog', belief: "you don't get to see the cards before you bet." }));
add('paige', 2, 2, H({ base: { ...SE(4, 3) }, clues: ['hearts', 'dots'], need: { hearts: 4 }, fog: 'hearts', belief: 'every hand is a gamble.' }));
add('paige', 2, 3, H({ base: { ...SE(4, 3) }, clues: ['hearts', 'broken'], need: { hearts: 4, broken: 1 }, fog: 'hearts', belief: 'i always bet on the worst outcome. it pays.' }));
add('paige', 2, 4, H({ base: { ...SE(4, 4) }, clues: ['hearts', 'dots'], need: { hearts: 4, dots: 1 }, fog: 'hearts', belief: 'the house always wins. i am the house.' }));
add('paige', 2, 5, H({ base: { ...SE(4, 4) }, clues: ['hearts', 'broken'], need: { hearts: 6 }, fog: 'hearts', belief: 'i count the exits in every room.' }));
add('paige', 2, 6, H({ base: { ...SE(4, 4) }, clues: ['hearts', 'dots', 'broken'], need: { hearts: 4, dots: 1 }, fog: 'dots', belief: 'if i lose everything, at least it was my choice.' }));
add('paige', 2, 7, H({ base: { ...SE(5, 4) }, clues: ['hearts', 'dots'], need: { hearts: 6 }, fog: 'hearts', max: 16, belief: "i'd rather lose than be left." }));
add('paige', 3, 1, H({ base: { ...SE(3, 3) }, clues: ['hearts'], target: 4, need: { hearts: 4 }, lens: 'hearts', intro: 'lens', belief: 'the real cards are hidden. look closer.' }));
add('paige', 3, 2, H({ base: { ...SE(4, 3) }, clues: ['hearts', 'dots'], need: { hearts: 4 }, lens: 'hearts', lensEvery: 2, belief: "nobody sees what i'm holding." }));
add('paige', 3, 3, H({ base: { ...SE(4, 3) }, clues: ['hearts', 'dots'], need: { hearts: 4, dots: 1 }, lens: 'dots', belief: 'half the deck is lies.' }));
add('paige', 3, 4, H({ base: { ...SE(4, 4) }, clues: ['hearts', 'dots'], need: { hearts: 4, dots: 1 }, lens: 'hearts', lensEvery: 2, belief: 'i read the cards so nobody reads me.' }));
add('paige', 3, 5, H({ base: { ...SE(4, 4) }, clues: ['hearts', 'broken'], need: { hearts: 6 }, lens: 'hearts', lensEvery: 3, belief: 'i only show my hand to people who stay.' }));
add('paige', 3, 6, H({ base: { ...SE(4, 4) }, clues: ['hearts', 'dots', 'broken'], need: { hearts: 4, dots: 2 }, lens: 'dots', fog: 'hearts', belief: 'whatever happens, i saw it coming.' }));
add('paige', 3, 7, H({ base: { ...SE(5, 4) }, clues: ['hearts', 'dots'], need: { hearts: 6, dots: 1 }, lens: 'hearts', lensEvery: 2, max: 16, belief: 'as long as someone needs me at the table, i stay.' }));

/* ---------- VEL · extraction points, mood swings, the minefield ---------- */
const P1 = (w, h, a, b) => ({ ...SE(w, h), portals: [[...a, ...b]] });
const uses = s => s.some((n, i) => i && Math.abs(n[0] - s[i - 1][0]) + Math.abs(n[1] - s[i - 1][1]) > 1);
const flips = (k = 1) => (s, p) => s.filter(n => E.isSwitch(p, ...n)).length >= k;
add('vel', 1, 1, { base: P1(3, 3, [1, 3], [2, 0]), filter: uses, clues: ['dots', 'broken'], walls: 4, target: 3, intro: 'portals', belief: 'omg a teleporter!! ...extraction point confirmed.' });
add('vel', 1, 2, { base: P1(4, 3, [0, 1], [4, 2]), filter: uses, clues: ['dots', 'broken'], belief: "always have two exits. that's basic." });
add('vel', 1, 3, { base: P1(4, 3, [1, 1], [3, 2]), filter: uses, clues: ['dots', 'broken'], walls: 3, need: { dots: 2 }, belief: 'cute outfit, full tactical plan underneath.' });
add('vel', 1, 4, { base: P1(4, 3, [2, 3], [2, 0]), filter: uses, clues: ['broken', 'dots'], lead: ['broken'], need: { broken: 2 }, belief: 'if the road is blocked, go around. or through.' });
add('vel', 1, 5, { base: { ...SE(4, 4), portals: [[0, 2, 4, 3], [2, 4, 1, 0]] }, filter: uses, clues: ['dots', 'broken'], need: { dots: 1 }, belief: 'two routes in, two routes out. always.' });
add('vel', 1, 6, { base: { ...SE(4, 4), portals: [[1, 3, 3, 1], [0, 1, 4, 3]] }, filter: uses, clues: ['dots', 'broken'], need: { dots: 1, broken: 1 }, belief: "i'm fun at parties because i know where every exit is." });
add('vel', 2, 1, { base: { ...SE(3, 3), switches: [[1, 2]] }, filter: flips(), clues: ['mood'], target: 3, intro: 'switches', belief: 'up, down, up. pick a lane, vel.' });
add('vel', 2, 2, { base: { ...SE(4, 3), switches: [[2, 1]] }, filter: flips(), clues: ['mood'], max: 12, belief: 'yesterday i loved everyone. today i hate this font.' });
add('vel', 2, 3, { base: { ...SE(4, 3), switches: [[1, 2], [3, 1]] }, filter: flips(2), clues: ['mood'], max: 12, belief: "highs and lows are just terrain. i've mapped worse." });
add('vel', 2, 4, { base: { ...SE(4, 4), switches: [[2, 2]], portals: [[0, 1, 4, 3]] }, filter: (s, p) => uses(s) && flips()(s, p), clues: ['mood'], max: 12, belief: 'when the floor drops, i already have a rope.' });
add('vel', 2, 5, { base: { ...SE(4, 4), switches: [[1, 2], [3, 2]] }, filter: flips(1), clues: ['mood', 'dots'], lead: ['mood'], max: 13, belief: 'i write the sad chapters on the good days. just in case.' });
add('vel', 2, 6, { base: { ...SE(4, 4), switches: [[2, 3], [2, 1]] }, filter: flips(2), clues: ['mood', 'broken'], lead: ['mood'], max: 13, belief: 'stay sharp. moods are weather. weather passes.' });
add('vel', 2, 7, { base: { ...SE(4, 4), switches: [[1, 1], [3, 3]], portals: [[0, 2, 4, 2]] }, filter: (s, p) => uses(s) && flips(1)(s, p), clues: ['mood'], max: 14, belief: 'if i keep moving, the low can never catch me.' });
add('vel', 3, 1, { base: { ...SE(3, 3) }, clues: ['mines'], target: 3, need: { mines: 1 }, intro: 'mines', belief: 'map the minefield before you walk it.' });
add('vel', 3, 2, { base: { ...SE(4, 3) }, clues: ['mines'], need: { mines: 2 }, belief: "you don't step where you haven't checked. ever." });
add('vel', 3, 3, { base: P1(4, 3, [0, 1], [3, 3]), filter: uses, clues: ['mines'], need: { mines: 1 }, belief: "a story is a minefield. i know where i buried everything." });
add('vel', 3, 4, { base: { ...SE(4, 4), switches: [[2, 2]] }, filter: flips(), clues: ['mines', 'mood'], lead: ['mines'], need: { mines: 1 }, max: 14, belief: 'mood swings and landmines. same drill.' });
add('vel', 3, 5, { base: { ...SE(4, 4) }, clues: ['mines'], need: { mines: 2 }, belief: 'i plan for the worst so nobody sees me fall.' });
add('vel', 3, 6, { base: { ...SE(4, 4) }, clues: ['mines', 'dots'], lead: ['mines'], need: { mines: 2, dots: 1 }, belief: "if i'm in control, nothing explodes." });
add('vel', 3, 7, { base: { ...SE(4, 4), switches: [[1, 2]], portals: [[0, 1, 3, 4]] }, filter: (s, p) => uses(s) && flips()(s, p), clues: ['mines', 'mood'], lead: ['mines'], need: { mines: 1 }, max: 14, belief: 'as long as i hold the map, nobody gets left behind.' });

/* ---------- MYNE · screens that loop, can't sit still, a whole world that wraps ---------- */
const WX = (w, h, sx, ex) => ({ w, h, wrap: 'x', start: [[sx, h]], exit: [[ex, 0]] });
const crosses = s => s.some((n, i) => i && Math.abs(n[0] - s[i - 1][0]) > 1);
const crossesY = s => s.some((n, i) => i && Math.abs(n[1] - s[i - 1][1]) > 1);
add('myne', 1, 1, { base: WX(3, 3, 0, 2), filter: crosses, clues: ['dots', 'broken'], walls: 4, target: 3, intro: 'wrapx', belief: 'screen edge? not real. it loops.' });
add('myne', 1, 2, { base: WX(4, 3, 1, 2), filter: crosses, clues: ['dots', 'broken'], walls: 3, need: { dots: 2 }, belief: 'wait where was i. oh right. the other side.' });
add('myne', 1, 3, { base: WX(4, 3, 0, 1), filter: crosses, clues: ['broken'], need: { broken: 2 }, belief: 'shortcuts are the only real way to travel.' });
add('myne', 1, 4, { base: WX(4, 3, 2, 3), filter: crosses, clues: ['dots', 'broken'], need: { dots: 1, broken: 1 }, belief: 'i look strong so nobody asks me to carry things.' });
add('myne', 1, 5, { base: { ...WX(4, 3, 0, 2), visitAll: true }, filter: crosses, clues: ['broken'], belief: '100% completion or it doesn\'t count. ...ooh, a side quest.' });
add('myne', 1, 6, { base: WX(4, 4, 1, 3), filter: crosses, clues: ['dots', 'broken'], need: { dots: 1, broken: 1 }, belief: 'if i stop moving, everyone sees how tired i am.' });
add('myne', 2, 1, { base: { ...SE(3, 3), restless: 1 }, clues: ['dots', 'broken'], walls: 4, target: 3, intro: 'restless', belief: "can't. sit. still." });
add('myne', 2, 2, { base: { ...SE(4, 3), restless: 2 }, clues: ['dots', 'broken'], need: { dots: 1 }, belief: 'boredom is a bug. i patch it with noise.' });
add('myne', 2, 3, { base: { ...SE(4, 3), restless: 1 }, clues: ['broken', 'dots'], need: { broken: 1 }, belief: 'ten tabs open. all of them important.' });
add('myne', 2, 4, { base: { ...WX(4, 3, 0, 2), restless: 2 }, filter: crosses, clues: ['dots', 'broken'], walls: 3, need: { dots: 1 }, belief: 'loop, turn, loop. like a speedrun.' });
add('myne', 2, 5, { base: { ...WX(4, 4, 1, 2), restless: 1 }, filter: crosses, clues: ['dots', 'broken'], need: { dots: 1 }, belief: "if i'm loud enough nobody notices i'm fragile." });
add('myne', 2, 6, { base: { ...SE(4, 3), restless: 3, visitAll: true }, clues: ['broken', 'dots'], target: 1, belief: 'finish everything. right now. all of it.' });
add('myne', 2, 7, { base: { ...WX(4, 4, 0, 3), restless: 2 }, filter: crosses, clues: ['dots', 'broken'], need: { dots: 1, broken: 1 }, belief: 'keep moving or the lag catches up.' });
const T = (w, h, s, e) => ({ w, h, wrap: 'xy', start: [s], exit: [e] });
const torus = s => crosses(s) && crossesY(s);
add('myne', 3, 1, { base: T(3, 3, [0, 0], [1, 1]), filter: s => crosses(s) || crossesY(s), clues: ['dots', 'broken'], walls: 4, target: 3, intro: 'wrapxy', belief: 'the whole world is one screen. no edges anywhere.' });
add('myne', 3, 2, { base: T(4, 3, [0, 0], [2, 1]), filter: torus, clues: ['dots', 'broken'], walls: 3, need: { dots: 2 }, belief: "if there's no edge, i can't fall off." });
add('myne', 3, 3, { base: T(4, 3, [1, 2], [3, 0]), filter: torus, clues: ['broken', 'dots'], need: { broken: 2 }, belief: 'walls are just level design.' });
add('myne', 3, 4, { base: { ...T(4, 4, [0, 0], [2, 2]), restless: 2 }, filter: torus, clues: ['dots', 'broken'], walls: 3, need: { dots: 1 }, belief: 'every direction is forward if you go far enough.' });
add('myne', 3, 5, { base: { ...T(4, 3, [0, 0], [3, 2]), visitAll: true }, filter: torus, clues: ['broken'], belief: 'i have to see every pixel. every one.' });
add('myne', 3, 6, { base: { ...T(4, 4, [1, 1], [3, 3]), restless: 2 }, filter: torus, clues: ['dots', 'broken'], need: { dots: 1, broken: 1 }, belief: "my body can't keep up. so my head runs for both." });
add('myne', 3, 7, { base: { ...T(4, 4, [0, 3], [2, 1]), restless: 1 }, filter: torus, clues: ['dots', 'broken'], need: { dots: 1 }, belief: 'as long as the game is running, i get to keep playing.' });

/* ======================= build ======================= */
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
const keep = old.filter(p => (p.layer === 1 && p.n <= 5 && (p.girl === 'prim' || p.girl === 'trix')) || (ONLY && p.girl !== ONLY));
keep.forEach(p => USED.add(JSON.stringify(p.sol)));
const out = keep.slice();
for (const spec of S) {
  if (ONLY && spec.girl !== ONLY) continue;
  if (keep.some(p => p.id === spec.id)) continue;
  const t0 = Date.now(); let p;
  try { p = design(spec); } catch (e) { console.log('SKIP', spec.id, e.message); continue; }
  out.push(p);
  const clue = CLUES.filter(f => (p[f] || []).length).map(f => `${f} ${p[f].length}`).join(', ');
  console.log(`${p.id.padEnd(10)} ${p.w}x${p.h}${p.wrap ? ' wrap ' + p.wrap : ''}${p.mirror ? ' mirror' : ''}${p.portals ? ' portals' : ''}${p.switches ? ' switches ' + p.switches.length : ''}${p.visitAll ? ' all' : ''}${p.restless ? ' restless ' + p.restless : ''}  sols ${String(p.solutions).padEnd(3)} ${clue}  (${Date.now() - t0}ms)`);
}
const ord = { prim: 0, trix: 1, paige: 2, vel: 3, myne: 4 };
out.sort((a, b) => ord[a.girl] - ord[b.girl] || a.layer - b.layer || a.n - b.n);
if (process.env.PART) fs.writeFileSync(process.env.PART, JSON.stringify(out.filter(p => p.girl === ONLY), null, 1));   // parallel runs: merge later
else fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('wrote', out.length, 'panels');
