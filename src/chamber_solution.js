/* =========================================================
   TEST CHAMBER · Solution mode
   Replays a panel's answer one key press at a time and says what
   each press does (slides, portals, overpasses, counts…).
   panels.json adds a "key idea" (p.why).
   ========================================================= */
const ARW = { R: '→', L: '←', U: '↑', D: '↓' };
const KEYN = { R: 'D / →', L: 'A / ←', U: 'W / ↑', D: 'S / ↓' };
function regionNote(p, cells) {
  const sq = (p.squares || []).filter(e => cells.some(c => c[0] === e[0] && c[1] === e[1]));
  if (!sq.length) return 'vùng trống';
  const cols = new Set(sq.map(q => q[2]));
  return cols.size === 1 ? `chỉ có mực ${[...cols][0] === 'pink' ? 'hồng' : 'đen'} ✓` : 'còn lẫn hai màu mực';
}
// one-line panels: the answer split into key presses
function solMovesOf(p) {
  const st = PanelEngine.replay(p, p.sol), ends = [0];
  for (let i = 1; i < p.sol.length; i++) if (i === p.sol.length - 1 || !st.forced[i + 1]) ends.push(i);
  return { st, ends };
}
function solEvents(p) {
  const E = PanelEngine;
  if (p.boxes) return boxSolEvents(p);
  const sol = p.sol, { st, ends } = solMovesOf(p), ev = [['Bắt đầu ở vòng tròn.' + (p.mirror ? ' Bàn tay kia bắt đầu ở vòng tròn đối xứng.' : '')]];
  const used = new Set(), skN = (p.sketch || []).length, sk = new Set((p.sketch || []).map(e => E.ekey(e[0], e[1], e[2], e[3])));
  let traced = 0;
  for (let m = 1; m < ends.length; m++) {
    const s = ends[m - 1], e = ends[m], out = [];
    const d0 = [sol[s + 1][0] - sol[s][0], sol[s + 1][1] - sol[s][1]];
    out.push(`Ấn ${KEYN[E.dirKey(d0)]}${p.moves ? ` (nước ${m}/${p.moves})` : ''}.`);
    let slid = 0;
    for (let i = s + 1; i <= e; i++) {
      const a = sol[i - 1], b = sol[i];
      if (st.jump[i]) { out.push('Qua cổng: đường xuất hiện ở cổng cùng màu' + (st.forced[i + 1] && !st.jump[i + 1] ? ' và trượt tiếp ra phía bên kia.' : '.')); continue; }
      if (st.forced[i] && !E.isBridge(p, ...a)) slid++;
      if (E.isBridge(p, ...a) && i > 1 && st.forced[i]) out.push('Đi thẳng qua cầu vượt.');
      if (E.padAt(p, ...b)) { const pd = E.padAt(p, ...b); out.push(`Giẫm lên bệ phóng ${ARW[E.dirKey(pd)]}.`); }
      if (E.isStop(p, ...b) && st.forced[i]) out.push('Phanh ở ô dừng.');
      for (const ln of E.lines(p, sol.slice(0, i + 1))) used.add(E.ekey(...ln[i - 1], ...ln[i]));
      const key = E.ekey(...a, ...b);
      if (sk.has(key)) { traced++; out.push(`Tô nét chì (${traced}/${skN}).`); }
      if (p.mirror) { const mm = [a, b].map(n => E.mirrorOf(p, n)); if (sk.has(E.ekey(...mm[0], ...mm[1]))) { traced++; out.push(`Bàn tay kia tô nét chì (${traced}/${skN}).`); } }
      (p.nums || []).forEach(([cx, cy, n]) => {
        if (!E.cellSides(cx, cy).includes(key)) return;
        const c = E.cellSides(cx, cy).filter(x => used.has(x)).length;
        out.push(c === n ? `Ô "${n}" đã đủ ${n} cạnh: không chạm thêm cạnh nào của nó.` : `Ô "${n}": đã chạm ${c}/${n} cạnh.`);
      });
      if ((p.dots || []).some(n => n[0] === b[0] && n[1] === b[1])) out.push('Đi qua chấm.');
      if (E.isBridge(p, ...b) && sol.slice(0, i).some(n => n[0] === b[0] && n[1] === b[1])) out.push('Vượt qua chính đường cũ ở cầu vượt.');
    }
    if (slid) { const b = sol[e]; out.push(`Trượt ${slid} ô rồi dừng ${E.isStop(p, ...b) ? 'ở ô phanh' : 'vì bị chặn (tường, mép, lỗ hoặc chính đường đã vẽ)'}.`); }
    if (m === ends.length - 1) {
      out.push('Tới đích.');
      if ((p.squares || []).length) E.regions(p, used).list.forEach(c => { if ((p.squares || []).some(q => c.some(x => x[0] === q[0] && x[1] === q[1]))) out.push(`Một vùng: ${regionNote(p, c)}.`); });
      if (p.visitAll) out.push(`Đã đi qua đủ ${E.nodeCount(p)}/${E.nodeCount(p)} điểm.`);
      if (skN) out.push(`Đã tô đủ ${skN}/${skN} nét chì.`);
      if (p.moves) out.push(`Đúng ${p.moves} nước.`);
    }
    ev.push(out);
  }
  return { ev, ends, n: ends.length - 1 };
}
const HUEN = ['trắng', 'hồng', 'xanh', 'lục'];
function boxName(p, s, i) {
  const b = p.boxes[i], kind = b.trail ? 'Hộp dây' : b.dash ? 'Hộp tên lửa' : 'Hộp';
  if (p.boxes.length === 1) return kind;
  const same = p.boxes.filter((q, j) => (q.trail ? 1 : q.dash ? 2 : 0) === (b.trail ? 1 : b.dash ? 2 : 0) && s.col[j] === s.col[i] && (q.m || '') === (b.m || '')).length;
  return `${kind}${s.col[i] ? ' ' + HUEN[s.col[i]] : ''}${b.m === 'opp' ? ' song sinh' : ''}${same > 1 ? ' #' + (i + 1) : ''}`;
}
function boxSolEvents(p) {
  const E = PanelEngine, inp = p.solIn, n = p.boxes.length, X = E.boxCtx(p);
  const ev = [[n === 1 ? 'Hộp bắt đầu ở đây.' : `${n} hộp bắt đầu ở đây; mỗi phím điều khiển cả ${n}.`]];
  const goalAt = q => (p.exit || []).find(g => g[0] === q[0] && g[1] === q[1]);
  let s = E.boxStart(p);
  for (let k = 0; k < inp.length; k++) {
    const c = inp[k], r = E.boxStep(p, s, E.DK[c], true, X), ns = r.state, out = [`Ấn ${KEYN[c]}.`];
    p.boxes.forEach((b, i) => {
      const nm = boxName(p, s, i);
      if (!r.moved[i]) { out.push(`${nm} bị chặn, đứng yên.`); return; }
      const t = ns.tracks[i].slice(s.tracks[i].length - 1), J = ns.jumps[i].slice(s.tracks[i].length - 1);
      const d = E.boxDir(b, E.DK[c]), jumps = J.filter(Boolean).length, steps = t.length - 1 - jumps;
      let msg = `${nm} đi ${ARW[E.dirKey(d)]}${steps > 1 ? ` ${steps} ô` : ''}`;
      if (t.slice(1).some(q => E.padAt(p, ...q))) msg += ', bị ô mũi tên đẩy đi';
      if (jumps) msg += ', qua cổng';
      if (steps > 1 && E.isStop(p, ...ns.pos[i])) msg += ', dừng ở ô phanh';
      if (ns.col[i] !== s.col[i]) msg += `, bị sơn thành màu ${HUEN[ns.col[i]]}`;
      
      msg += '.';
      const g = goalAt(ns.pos[i]);
      if (g && (!g[2] || g[2] === ns.col[i])) msg += ' Đang đứng trong goal.';
      else if (goalAt(s.pos[i])) msg += ' Rời khỏi goal (hộp không bị khoá).';
      out.push(msg);
    });
    const bombs = ns.left.filter(l => l != null); if (bombs.length) out.push(`Bom còn ${[...new Set(bombs)].join('/')}.`);
    if (ns.open !== s.open) [1, 2, 3].forEach(cc => { const was = s.open & (1 << cc), now = ns.open & (1 << cc); if (now && !was) out.push(`Cửa ${HUEN[cc]} mở.`); if (was && !now) out.push(`Cửa ${HUEN[cc]} đóng lại.`); });
    if (ns.crk.size > s.crk.size) out.push('Ô nứt sụp xuống thành lỗ.');
    const lit = l => (p.lights || []).length - E.boxNeed(p, l).lights.length;
    if ((p.lights || []).length && lit(ns) !== lit(s)) out.push(`Đèn sáng ${lit(ns)}/${p.lights.length}.`);
    s = ns; ev.push(out);
  }
  const last = ev[ev.length - 1];
  if ((p.nums || []).length) last.push('Mọi con số đều đúng.');
  last.push('Mọi goal có hộp đúng màu' + ((p.lights || []).length ? ', mọi đèn đều sáng' : '') + ': xong.');
  return { ev, n: inp.length };
}
function solMode(on) {
  if (!PJ) return;
  PJ.solOn = on; clearInterval(PJ.solTimer); PJ.solTimer = null; clearTimeout(PJ.advT);
  const box = $('#pj-solbox'), btn = $('#pj-sol');
  box.hidden = !on; btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Back to puzzle' : 'Solution';
  $('#sb-play').textContent = '▶ Play';
  if (on) { PJ.peeked = true; PJ.solData = PJ.solData || solEvents(PJ.p); PJ.solK = 0; renderSolLog(); $('#pj-msg').textContent = ''; }
  drawPJ();
}
function solStep(d, abs) {
  if (!PJ || !PJ.solOn) return;
  const n = PJ.solData.n;
  PJ.solK = Math.max(0, Math.min(n, abs ? d : PJ.solK + d));
  if (PJ.solK >= n && PJ.solTimer) { clearInterval(PJ.solTimer); PJ.solTimer = null; $('#sb-play').textContent = '▶ Play'; }
  SFX.step(PJ.solK); renderSolLog(); drawPJ();
}
function solPlay() {
  if (!PJ || !PJ.solOn) return;
  if (PJ.solTimer) { clearInterval(PJ.solTimer); PJ.solTimer = null; $('#sb-play').textContent = '▶ Play'; return; }
  if (PJ.solK >= PJ.solData.n) PJ.solK = 0;
  $('#sb-play').textContent = '❚❚ Pause';
  PJ.solTimer = setInterval(() => solStep(1), REDUCED ? 300 : 800);
}
function renderSolLog() {
  const { ev, n } = PJ.solData, k = PJ.solK;
  $('#sb-k').textContent = `move ${k}/${n}`;
  const log = $('#sb-log');
  log.innerHTML = ev.slice(0, k + 1).map((lines, i) => `<li class="${i === k ? 'now' : ''}" value="${i}">${lines.map(esc).join(' ')}</li>`).join('');
  const now = $('li.now', log); if (now) now.scrollIntoView({ block: 'nearest' });
}
function drawSol(svg) {
  const E = PanelEngine, p = PJ.p, k = PJ.solK, done = k === PJ.solData.n;
  let h;
  if (p.boxes) {
    const s = E.boxReplay(p, p.solIn.slice(0, k));
    svg.innerHTML = boxBoardSVG(p, { s, noBoxes: true }) + boxesSVG(p, s, { cls: 'sol' });
    return;
  }
  const { st, ends } = solMovesOf(p), upto = ends[k], pts = p.sol.slice(0, upto + 1), J = st.jump.slice(0, upto + 1), lines = E.lines(p, pts);
  const seen = new Set(lines.flat().map(n => n.join(','))), used = E.usedEdges(p, pts, J);
  h = boardSVG(p, { seen });
  if (done && (p.squares || []).length) E.regions(p, used).list.forEach((c, ci) => c.forEach(([x, y]) => { h += `<rect class="sb-reg r${ci % 4}" x="${x + .06}" y="${y + .06}" width=".88" height=".88" rx=".08"/>`; }));
  (p.sketch || []).forEach(e => { if (used.has(E.ekey(e[0], e[1], e[2], e[3]))) h += segLine('sb-traced', e); });
  (p.nums || []).forEach(([cx, cy, n]) => { if (E.cellSides(cx, cy).filter(s => used.has(s)).length === n) h += `<circle class="sb-numok" cx="${cx + .5}" cy="${cy + .5}" r=".3"/>`; });
  h += lineSVG(p, p.sol, 'ghost', false, st.jump);
  if (p.mirror) h += lineSVG(p, lines[1], 'other sol', done, J) + `<circle class="pb-start on other sol" cx="${lines[1][0][0]}" cy="${lines[1][0][1]}" r=".2"/>`;
  h += lineSVG(p, pts, 'sol', done, J) + bridgeOver(p, pts) + `<circle class="pb-start on sol" cx="${pts[0][0]}" cy="${pts[0][1]}" r=".2"/>`;
  if (!done) h += `<circle class="pb-head sol" cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r=".11"/>`;
  svg.innerHTML = h;
}
