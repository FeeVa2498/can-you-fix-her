// Designs + verifies the Test chamber panels → src/panels.json
// node tools/design_panels.js
// Approach: pick an intended solution, then add the fewest clues that make it the ONLY solution,
// then prove every clue matters (removing any one lets other solutions in).
const E = require('../src/panel_engine.js');
const fs = require('fs'), path = require('path');

let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const edgesOf = pth => pth.slice(1).map((n, i) => [...pth[i], ...n]);
const count = (p, lim = 3) => E.solve(p, lim).length;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// all start→exit simple paths (for picking an interesting intended solution)
function allPaths(p, lim = 200000) { const q = { ...p, sketch: [], squares: [], nums: [], dots: [], visitAll: p.visitAll }; return E.solve(q, lim); }
const turns = pth => pth.slice(2).filter((n, i) => (n[0] - pth[i][0]) && (n[1] - pth[i][1])).length;

// regions of cells cut by a path → colour each region (for ink squares)
function regionsOf(p, pth) {
  const used = new Set(edgesOf(pth).map(e => E.ekey(...e))), reg = {}; let r = 0;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (reg[x + ',' + y] !== undefined) continue;
    const st = [[x, y]]; reg[x + ',' + y] = r;
    while (st.length) {
      const [cx, cy] = st.pop();
      for (const [nx, ny, wall] of [[cx + 1, cy, E.ekey(cx + 1, cy, cx + 1, cy + 1)], [cx - 1, cy, E.ekey(cx, cy, cx, cy + 1)], [cx, cy + 1, E.ekey(cx, cy + 1, cx + 1, cy + 1)], [cx, cy - 1, E.ekey(cx, cy, cx + 1, cy)]]) {
        if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || used.has(wall) || reg[nx + ',' + ny] !== undefined) continue;
        reg[nx + ',' + ny] = r; st.push([nx, ny]);
      }
    }
    r++;
  }
  // 2-colour the regions by which side of the line they sit on (neighbours across the line differ)
  const adj = {}; for (let i = 0; i < r; i++) adj[i] = new Set();
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (x + 1 < p.w && reg[x + ',' + y] !== reg[(x + 1) + ',' + y]) { adj[reg[x + ',' + y]].add(reg[(x + 1) + ',' + y]); adj[reg[(x + 1) + ',' + y]].add(reg[x + ',' + y]); }
    if (y + 1 < p.h && reg[x + ',' + y] !== reg[x + ',' + (y + 1)]) { adj[reg[x + ',' + y]].add(reg[x + ',' + (y + 1)]); adj[reg[x + ',' + (y + 1)]].add(reg[x + ',' + y]); }
  }
  const side = { 0: 0 }, q = [0];
  while (q.length) { const a = q.shift(); adj[a].forEach(b => { if (side[b] === undefined) { side[b] = 1 - side[a]; q.push(b); } }); }
  const color = {}; Object.keys(reg).forEach(k => color[k] = side[reg[k]] ? 'ink' : 'pink');
  return { reg, n: r, color };
}
function cellNum(pth, cx, cy) {
  const used = new Set(edgesOf(pth).map(e => E.ekey(...e)));
  return [E.ekey(cx, cy, cx + 1, cy), E.ekey(cx, cy + 1, cx + 1, cy + 1), E.ekey(cx, cy, cx, cy + 1), E.ekey(cx + 1, cy, cx + 1, cy + 1)].filter(k => used.has(k)).length;
}

// add clues from `pool` (in order) until the intended path is the only solution, then prune
function minimal(p, field, pool, sol) {
  const q = JSON.parse(JSON.stringify(p)); q[field] = q[field] || [];
  for (const c of pool) {
    if (count(q, 2) === 1) break;
    q[field].push(c);
  }
  if (count(q, 2) !== 1 || !same(E.solve(q, 2)[0], sol)) return null;
  for (let i = q[field].length - 1; i >= 0; i--) {
    const t = JSON.parse(JSON.stringify(q)); t[field].splice(i, 1);
    if (count(t, 2) === 1) q[field] = t[field];
  }
  return q;
}
// add clues until at most k solutions remain (for rule-teaching panels), then prune
function few(p, field, pool, k) {
  const q = JSON.parse(JSON.stringify(p)); q[field] = q[field] || [];
  for (const c of pool) { if (count(q, k + 1) <= k) break; q[field].push(c); }
  if (count(q, k + 1) > k) return null;
  for (let i = q[field].length - 1; i >= 0; i--) { const t = JSON.parse(JSON.stringify(q)); t[field].splice(i, 1); if (count(t, k + 1) <= k) q[field] = t[field]; }
  return q;
}
// every symbol must matter: removing it must let other solutions in
function redundant(p) {
  const out = [];
  for (const f of ['sketch', 'dots', 'squares', 'nums', 'broken']) (p[f] || []).forEach((_, i) => {
    const t = JSON.parse(JSON.stringify(p)); t[f].splice(i, 1);
    if (count(t, 2) === 1) out.push(`${f}[${i}]`);
  });
  if (p.visitAll) { const t = { ...p, visitAll: false }; if (count(t, 2) === 1) out.push('visitAll'); }
  return out;
}

const P = [];
// try intended routes until clues can pin one down
function retry(make, tries = 60) { for (let t = 0; t < tries; t++) { const r = make(); if (r) return r; } throw new Error('no design found'); }
function add(p, opts = {}) {
  const sols = E.solve(p, 60), red = redundant(p);
  if (!sols.length) throw new Error(p.id + ' has no solution');
  if (opts.unique !== false && sols.length !== 1) throw new Error(`${p.id}: ${sols.length} solutions`);
  if (opts.unique !== false && red.length) throw new Error(`${p.id}: redundant ${red.join(', ')}`);
  p.sol = sols[0]; USED.add(JSON.stringify(sols[0])); p.solutions = sols.length >= 60 ? '60+' : sols.length;
  P.push(p);
  console.log(`${p.id.padEnd(9)} ${p.w}x${p.h}  solutions:${String(p.solutions).padEnd(4)} clues:${['sketch', 'squares', 'nums', 'dots', 'broken'].map(f => (p[f] || []).length ? f + ' ' + p[f].length : '').filter(Boolean).join(', ')}${p.visitAll ? ', visitAll' : ''}`);
}
// pick an intended path with the most turns (a winding, non-obvious route), ties broken by seed
const USED = new Set();
function pickPath(p, filter = () => true, take = 1) {
  // a winding route (top quarter by number of turns), never one another panel already uses
  const all = allPaths(p).filter(filter).filter(s => !USED.has(JSON.stringify(s)));
  all.sort((a, b) => turns(b) - turns(a) || b.length - a.length);
  const top = all.slice(0, Math.max(1, Math.ceil(all.length / 4)));
  shuffle(top); for (let i = 1; i < take; i++) rnd();
  const pick = top[Math.floor(rnd() * top.length)];
  USED.add(JSON.stringify(pick));
  return pick;
}

/* ================= PRIM · layer 1 · tracing ================= */
{
  // 1 · learn the line + pencil sketch: the sketch is the whole route
  const base = { id: 'prim_1_1', girl: 'prim', layer: 1, n: 1, w: 3, h: 3, start: [[0, 3]], exit: [[3, 0]] };
  const sol = [[0, 3], [0, 2], [1, 2], [1, 1], [2, 1], [2, 0], [3, 0]];
  const p = minimal(base, 'sketch', edgesOf(sol), sol);
  add({ ...p, belief: "i only draw on top of other people's lines.", note: 'Dạy cách vẽ đường + nét chì mờ phải được tô lại.' });
}
{
  // 2 · scattered pencil pieces: find the one route that joins them
  const base = { id: 'prim_1_2', girl: 'prim', layer: 1, n: 2, w: 4, h: 3, start: [[0, 3]], exit: [[4, 0]] };
  seed = 11; const p = retry(() => { const sol = pickPath(base, s => s.length >= 10 && s.length <= 12, 3);
    return minimal(base, 'sketch', shuffle(edgesOf(sol).filter((e, i, a) => i > 0 && i < a.length - 1)), sol); });
  add({ ...p, belief: "if i lose the line, i'll ruin the whole page.", note: 'Nét chì rời rạc: phải tìm đường duy nhất nối hết các mảnh.' });
}
{
  // 3 · two inks (her hand / the other hand) must be separated. Teaches the rule: a handful of answers.
  const base = { id: 'prim_1_3', girl: 'prim', layer: 1, n: 3, w: 3, h: 3, start: [[0, 3]], exit: [[3, 0]] };
  seed = 3; const p = retry(() => { const sol = pickPath(base, s => regionsOf(base, s).n === 2, 1);
    const { color } = regionsOf(base, sol);
    return few(base, 'squares', shuffle([...Array(9).keys()].map(i => [i % 3, i / 3 | 0])).map(([x, y]) => [x, y, color[x + ',' + y]]), 4); });
  add({ ...p, belief: 'my hand and the other hand must never touch.', note: 'Dạy luật mực: mỗi vùng chỉ được một màu. Vài lời giải (bảng dạy luật).' }, { unique: false });
}
{
  // 4 · inks with a forced split: unique
  const base = { id: 'prim_1_4', girl: 'prim', layer: 1, n: 4, w: 4, h: 4, start: [[0, 4]], exit: [[4, 0]] };
  seed = 21; const p = retry(() => { const sol = pickPath(base, s => { const r = regionsOf(base, s); return r.n >= 3 && s.length >= 11; }, 2);
    const { color } = regionsOf(base, sol);
    return few(base, 'squares', shuffle([...Array(16).keys()].map(i => [i % 4, i / 4 | 0])).map(([x, y]) => [x, y, color[x + ',' + y]]), 3); });
  add({ ...p, belief: 'pink is mine. black is hers. i keep them apart.', note: 'Chỉ có mực, bảng lớn hơn: chỉ còn rất ít cách chia.' }, { unique: false });
}
{
  // 5 · core: pencil + ink together. The sketch looks like the obvious route; the inks say otherwise.
  const base = { id: 'prim_1_5', girl: 'prim', layer: 1, n: 5, w: 4, h: 4, start: [[0, 4]], exit: [[4, 0]] };
  seed = 33; const p = retry(() => { const sol = pickPath(base, s => regionsOf(base, s).n >= 3 && s.length >= 13, 1);
    const { color } = regionsOf(base, sol);
    // a good share of ink first (not enough alone), then the fewest pencil strokes to finish it
    const inks = shuffle([...Array(16).keys()].map(i => [i % 4, i / 4 | 0])).slice(0, 9).map(([x, y]) => [x, y, color[x + ',' + y]]);
    return minimal({ ...base, squares: inks }, 'sketch', shuffle(edgesOf(sol)), sol); });
  // trim squares that became unnecessary
  for (let i = p.squares.length - 1; i >= 0; i--) { const t = JSON.parse(JSON.stringify(p)); t.squares.splice(i, 1); if (count(t, 2) === 1) p.squares = t.squares; }
  add({ ...p, belief: "i can't draw. i can only trace.", note: 'Bảng lõi: nét chì + mực. Cần dùng cả hai luật.' });
}

/* ================= TRIX · layer 1 · completeness + counting ================= */
{
  const p = { id: 'trix_1_1', girl: 'trix', layer: 1, n: 1, w: 2, h: 2, start: [[0, 2]], exit: [[2, 0]], visitAll: true };
  add({ ...p, belief: 'every point gets visited. no exceptions.', note: 'Dạy luật phủ kín: đi qua mọi nút. 2 lời giải đối xứng là được.' }, { unique: false });
}
{
  // 2 · visit-all on a bigger board; broken links force the only order
  const base = { id: 'trix_1_2', girl: 'trix', layer: 1, n: 2, w: 3, h: 3, start: [[0, 3]], exit: [[3, 1]], visitAll: true };
  const all = []; for (let y = 0; y <= 3; y++) for (let x = 0; x <= 3; x++) { if (x < 3) all.push([x, y, x + 1, y]); if (y < 3) all.push([x, y, x, y + 1]); }
  seed = 5; const p = retry(() => { const sol = pickPath(base, () => true, 1);
    const solEdges = new Set(edgesOf(sol).map(e => E.ekey(...e)));
    return minimal(base, 'broken', shuffle(all.filter(e => !solEdges.has(E.ekey(...e)))), sol); });
  add({ ...p, belief: 'a gap means i failed.', note: 'Phủ kín + đường đứt: tìm thứ tự duy nhất.' });
}
{
  // 3 · numbers: the line touches exactly n sides of the cell
  const base = { id: 'trix_1_3', girl: 'trix', layer: 1, n: 3, w: 3, h: 3, start: [[0, 3]], exit: [[3, 0]] };
  seed = 9; const p = retry(() => { const sol = pickPath(base, s => s.length >= 10, 2);
    return minimal(base, 'nums', shuffle([...Array(9).keys()].map(i => [i % 3, i / 3 | 0])).map(([x, y]) => [x, y, cellNum(sol, x, y)]), sol); });
  add({ ...p, belief: "numbers don't lie. people do.", note: 'Dạy luật số: đường chạm đúng n cạnh của ô.' });
}
{
  // 4 · numbers + visit-all
  const base = { id: 'trix_1_4', girl: 'trix', layer: 1, n: 4, w: 3, h: 3, start: [[0, 3]], exit: [[3, 1]], visitAll: true };
  seed = 17; const p = retry(() => { const sol = pickPath(base, () => true, 3);
    return minimal(base, 'nums', shuffle([...Array(9).keys()].map(i => [i % 3, i / 3 | 0])).map(([x, y]) => [x, y, cellNum(sol, x, y)]), sol); });
  add({ ...p, belief: 'if i count it twice, it is real.', note: 'Số + phủ kín cùng lúc.' });
}
{
  // 5 · core: 4×4, visit-all + numbers + one dot
  const base = { id: 'trix_1_5', girl: 'trix', layer: 1, n: 5, w: 4, h: 4, start: [[0, 4]], exit: [[4, 0]], visitAll: true };
  seed = 41; const p = retry(() => { const sol = pickPath(base, () => true, 4);
    return minimal(base, 'nums', shuffle([...Array(16).keys()].map(i => [i % 4, i / 4 | 0])).map(([x, y]) => [x, y, cellNum(sol, x, y)]), sol); });
  add({ ...p, belief: "i can't stop until it's perfect.", note: 'Bảng lõi: phủ kín 25 nút + số.' });
}


// The "key idea" shown in the Test chamber's Solution mode. Written for the layouts the seeds above produce:
// if a panel is regenerated with a different layout, rewrite its entry.
const WHY = {
  prim_1_1: 'Bảng dạy cách chơi. Mọi đoạn nét chì mờ đều phải được tô lại. Ở đây các đoạn chì nối đuôi nhau thành một bậc thang từ vòng tròn tới lối ra: chỉ cần đi theo.',
  prim_1_2: 'Có 6 đoạn chì rời rạc và chỉ một thứ tự đi qua hết. Mẹo: đoạn chì dọc ở cột giữa phía trên chỉ tô được theo chiều từ trên xuống, vì ngay sau nó là dãy chì ở hàng giữa chạy thẳng tới lối ra. Vậy trước đó đường phải gom hết phần bên trái (chữ L bên dưới, rồi đoạn chì hàng giữa bên trái) rồi mới lên hàng trên cùng.',
  prim_1_3: 'Bảng dạy luật mực: đường đi cắt bảng thành các vùng, mỗi vùng chỉ được chứa một màu. Ô hồng và ô đen nằm xen kẽ nhau, nên mỗi cặp hồng–đen nằm sát nhau phải bị đường đi chia cắt. Đi thẳng dọc mép không làm được, đường phải luồn vào giữa bảng. Bảng có 4 lời giải, đây là một trong số đó.',
  prim_1_4: 'Ô đen ở hàng trên cùng bị các ô hồng vây quanh, nên đường phải khoanh riêng nó thành một vùng nhỏ. Hai ô đen bên phải phải nằm cùng phía, tách khỏi ô hồng ở góc trên bên phải. Bảng có 3 lời giải, khác nhau ở phần giữa bảng.',
  prim_1_5: 'Bảng lõi: nét chì gợi ý một con đường nhưng không đủ, mực mới quyết định. Ô hồng ở góc trên trái có ô đen ngay dưới nên đường phải cắt ngang giữa hai ô đó, vì vậy đoạn chì ở hàng thứ ba dẫn sang trái. Sau đó đường vòng lên hàng trên, tô đoạn chì ở hàng thứ hai từ phải sang trái, đi xuống cột giữa để tách các ô hồng ở giữa khỏi các ô đen hai bên, rồi zigzag ở cột phải để khoanh ô đen bên phải.',
  trix_1_1: 'Luật phủ kín: phải đi qua mọi điểm (các vòng tròn nhỏ sáng lên khi đi qua). Với 3×3 điểm chỉ cần đi kiểu con rắn, hết hàng này tới hàng kia. Có 2 lời giải đối xứng (theo hàng hoặc theo cột).',
  trix_1_2: 'Hai đoạn đứt làm điểm thứ hai trong hàng thứ ba chỉ còn đúng 2 đường nối. Một điểm phải đi qua mà chỉ có 2 lối thì đường bắt buộc dùng cả hai lối đó: từ vòng tròn đi lên, rẽ phải, rồi đi xuống. Phần còn lại là đi kiểu con rắn: hết hàng dưới, lên, quay trái, lên tiếp, rồi sang phải tới lối ra.',
  trix_1_3: 'Luật số: con số là số cạnh của ô mà đường đi chạm vào. Ô "3" ở góc dưới bên trái nghĩa là đường ôm 3 trong 4 cạnh của nó: đi lên, sang phải, rồi đi xuống. Các ô "2" bên cạnh buộc đường lượn qua lại, và ô "1" phía trên cho biết đường chỉ chạm nó đúng một cạnh.',
  trix_1_4: 'Chỉ có một con số, nhưng kết hợp với luật phủ kín là đủ. Ô "3" ở hàng trên nghĩa là đường phải tạo hình chữ U quanh nó: đi xuống, sang phải, rồi đi lên. Muốn phủ hết 16 điểm mà vẫn tạo được chữ U đó ngay trước lối ra, đường phải đi hết hàng dưới trước, lượn rắn lên, rồi mới làm chữ U.',
  trix_1_5: 'Bảng lõi: 25 điểm phải đi qua hết, cộng 5 con số. Mẹo 1: góc không phải điểm xuất phát hay lối ra chỉ có 2 lối, nên đường đi qua góc theo đúng 2 lối đó. Mẹo 2: ô "3" ở hàng trên lại là chữ U như bảng trước. Mẹo 3: hai ô "2" bên trái hàng thứ ba buộc đường cắt ngang giữa bảng thay vì đi thẳng lên mép trái, còn hai ô "2" bên phải buộc đường zigzag ở cột phải.',
};
P.forEach(p => { if (!WHY[p.id]) throw new Error('no key idea written for ' + p.id); p.why = WHY[p.id]; });
fs.writeFileSync(path.join(__dirname, '../src/panels.json'), JSON.stringify(P, null, 1));
console.log('wrote', P.length, 'panels');
