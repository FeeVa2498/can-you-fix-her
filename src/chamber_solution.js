/* =========================================================
   TEST CHAMBER · Solution mode
   Replays a panel's answer step by step. Each step says what it
   achieves, so it works for any panel; panels.json adds a "key idea"
   (p.why). Hidden things (mines, face-down cards, lens-only symbols)
   are all shown here.
   ========================================================= */
const HEART_VI = { pink: 'hồng', violet: 'tím', teal: 'xanh' };
function regionNote(p, cells) {
  const E = PanelEngine, has = (list) => (list || []).filter(e => cells.some(c => c[0] === e[0] && c[1] === e[1]));
  const bits = [], sq = has(p.squares), hs = has(p.hearts), pc = has(p.pieces), sh = has(p.shapes);
  if (sq.length) { const cols = new Set(sq.map(q => q[2])); bits.push(cols.size === 1 ? `chỉ có mực ${[...cols][0] === 'pink' ? 'hồng' : 'đen'} ✓` : 'còn lẫn hai màu mực'); }
  if (hs.length) { const by = {}; hs.forEach(h => by[h[2]] = (by[h[2]] || 0) + 1); bits.push(Object.entries(by).map(([c, n]) => `${n} tim ${HEART_VI[c] || c}${n === 2 ? ' ✓' : ''}`).join(', ')); }
  if (pc.length) { const sum = pc.reduce((a, q) => a + E.VAL[q[2]], 0); bits.push(`${cells.length} ô, quân cờ cộng lại = ${sum}${sum === cells.length ? ' ✓' : ''}`); }
  if (sh.length) bits.push(sh.length === 1 && E.shapeKey(cells) === E.shapeKey(sh[0][2]) ? 'đúng hình mẫu ✓' : 'chưa đúng hình mẫu');
  return bits.length ? bits.join('; ') : 'vùng trống';
}
const hasRegionRules = p => ['squares', 'hearts', 'pieces', 'shapes'].some(f => (p[f] || []).length);
function solEvents(p) {
  const E = PanelEngine, sol = p.sol, J = E.jumps(p, sol), ev = [['Bắt đầu ở vòng tròn.' + (p.mirror ? ' Bàn tay kia bắt đầu ở vòng tròn đối xứng.' : '')]], used = new Set(), closed = [];
  const skN = (p.sketch || []).length, sk = new Set((p.sketch || []).map(e => E.ekey(e[0], e[1], e[2], e[3])));
  const warm = E.edgeSet(p.warm), cool = E.edgeSet(p.cool);
  const sigOf = regs => regs.map(c => c.map(q => q.join(',')).sort().join('|'));
  let traced = 0, prev = sigOf(E.regions(p, used).list), up = true, ordN = 0;
  for (let k = 1; k < sol.length; k++) {
    const a = sol[k - 1], b = sol[k], out = [];
    if (J[k]) out.push('Qua cổng: đường xuất hiện ở cổng cùng màu.');
    else {
      for (const ln of E.lines(p, sol.slice(0, k + 1))) used.add(E.ekey(...ln[k - 1], ...ln[k]));
      const key = E.ekey(...a, ...b);
      if (sk.has(key)) { traced++; out.push(`Tô nét chì (${traced}/${skN}).`); }
      if (p.mirror) { const m = sol.slice(k - 1, k + 1).map(n => E.mirrorOf(p, n)); if (sk.has(E.ekey(...m[0], ...m[1]))) { traced++; out.push(`Bàn tay kia tô nét chì (${traced}/${skN}).`); } }
      if (warm.has(key)) out.push('Đường ấm: được đi vì đang "lên".');
      if (cool.has(key)) out.push('Đường lạnh: được đi vì đang "xuống".');
      if (Math.abs(b[0] - a[0]) > 1 || Math.abs(b[1] - a[1]) > 1) out.push('Đi xuyên mép, ra ở phía bên kia.');
      (p.nums || []).forEach(([cx, cy, n]) => {
        const sides = E.cellSides(cx, cy); if (!sides.includes(key)) return;
        const c = sides.filter(s => used.has(s)).length;
        out.push(c === n ? `Ô "${n}" đã đủ ${n} cạnh: không được chạm thêm cạnh nào của nó.` : `Ô "${n}": đã chạm ${c}/${n} cạnh.`);
      });
    }
    if (E.isSwitch(p, ...b)) { up = !up; out.push(`Qua công tắc ◐: tâm trạng giờ là "${up ? 'lên' : 'xuống'}", chỉ đi được đường ${up ? 'ấm (cam)' : 'lạnh (xanh)'}.`); }
    const oi = (p.order || []).findIndex(n => n[0] === b[0] && n[1] === b[1]); if (oi >= 0) { ordN++; out.push(`Qua điểm số ${oi + 1}.`); }
    if ((p.dots || []).some(n => n[0] === b[0] && n[1] === b[1])) out.push('Đi qua chấm.');
    if (hasRegionRules(p) && !p.wrap) {
      const regs = E.regions(p, used).list, sig = sigOf(regs);
      if (regs.length > prev.length) {
        const fresh = regs.map((c, i) => ({ c, i })).filter(({ i }) => !prev.includes(sig[i]));
        const biggest = fresh.reduce((x, y) => (y.c.length > x.c.length ? y : x), fresh[0]);
        fresh.filter(f => f !== biggest || fresh.length === 1).forEach(({ c }) => { closed.push({ k, cells: c }); out.push(`Cắt ra một vùng: ${regionNote(p, c)}.`); });
      }
      prev = sig;
    }
    if (k === sol.length - 1) {
      out.push('Tới lối ra.');
      if (hasRegionRules(p) && !p.wrap) {
        const have = new Set(closed.map(c => c.cells.map(q => q.join(',')).sort().join('|')));
        E.regions(p, used).list.forEach(c => { if (!have.has(c.map(q => q.join(',')).sort().join('|'))) { closed.push({ k, cells: c }); out.push(`Vùng còn lại: ${regionNote(p, c)}.`); } });
      }
      if (p.visitAll) out.push(`Đã đi qua đủ ${E.nodeCount(p)}/${E.nodeCount(p)} điểm.`);
      if (skN) out.push(`Đã tô đủ ${skN}/${skN} nét chì.`);
      if ((p.mines || []).length) out.push(`Không chạm cạnh ô nào trong ${p.mines.length} ô có mìn (✸).`);
    }
    if (!out.length) { let dx = b[0] - a[0], dy = b[1] - a[1]; out.push(dx > 0 ? 'Sang phải.' : dx < 0 ? 'Sang trái.' : dy > 0 ? 'Đi xuống.' : 'Đi lên.'); }
    ev.push(out);
  }
  return { ev, closed };
}
function solMode(on) {
  if (!PJ) return;
  PJ.solOn = on; clearInterval(PJ.solTimer); PJ.solTimer = null;
  const box = $('#pj-solbox'), btn = $('#pj-sol');
  box.hidden = !on; btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Back to puzzle' : 'Solution';
  $('#sb-play').textContent = '▶ Play';
  if (on) { PJ.peeked = true; PJ.solData = PJ.solData || solEvents(PJ.p); PJ.solK = 0; renderSolLog(); $('#pj-msg').textContent = ''; }
  drawPJ();
}
function solStep(d, abs) {
  if (!PJ || !PJ.solOn) return;
  const n = PJ.p.sol.length - 1;
  PJ.solK = Math.max(0, Math.min(n, abs ? d : PJ.solK + d));
  if (PJ.solK >= n && PJ.solTimer) { clearInterval(PJ.solTimer); PJ.solTimer = null; $('#sb-play').textContent = '▶ Play'; }
  SFX.step(PJ.solK); renderSolLog(); drawPJ();
}
function solPlay() {
  if (!PJ || !PJ.solOn) return;
  if (PJ.solTimer) { clearInterval(PJ.solTimer); PJ.solTimer = null; $('#sb-play').textContent = '▶ Play'; return; }
  if (PJ.solK >= PJ.p.sol.length - 1) PJ.solK = 0;
  $('#sb-play').textContent = '❚❚ Pause';
  PJ.solTimer = setInterval(() => solStep(1), REDUCED ? 300 : 750);
}
function renderSolLog() {
  const { ev } = PJ.solData, k = PJ.solK, n = PJ.p.sol.length - 1;
  $('#sb-k').textContent = `step ${k}/${n}`;
  const log = $('#sb-log');
  log.innerHTML = ev.slice(0, k + 1).map((lines, i) => `<li class="${i === k ? 'now' : ''}" value="${i}">${lines.map(esc).join(' ')}</li>`).join('');
  const now = $('li.now', log); if (now) now.scrollIntoView({ block: 'nearest' });
}
function drawSol(svg) {
  const E = PanelEngine, p = PJ.p, k = PJ.solK, pts = p.sol.slice(0, k + 1), lines = E.lines(p, pts);
  const seen = new Set(lines.flat().map(n => n.join(','))), J = E.jumps(p, pts), used = new Set();
  for (const ln of lines) for (let i = 1; i < ln.length; i++) if (!J[i]) used.add(E.ekey(...ln[i - 1], ...ln[i]));
  let h = boardSVG(p, { seen, reveal: true, showMines: true });
  PJ.solData.closed.filter(c => c.k <= k).forEach((c, ci) => c.cells.forEach(([x, y]) => { h += `<rect class="sb-reg r${ci % 4}" x="${x + .06}" y="${y + .06}" width=".88" height=".88" rx=".08"/>`; }));
  (p.sketch || []).forEach(e => { if (used.has(E.ekey(e[0], e[1], e[2], e[3]))) edgeSegs(e[0], e[1], e[2], e[3]).forEach(s => { h += segLine('sb-traced', s); }); });
  (p.nums || []).forEach(([cx, cy, n]) => { if (E.cellSides(cx, cy).filter(s => used.has(s)).length === n) h += `<circle class="sb-numok" cx="${cx + .5}" cy="${cy + .5}" r=".3"/>`; });
  const done = k === p.sol.length - 1;
  h += lineSVG(p, p.sol, 'ghost', false);
  if (p.mirror) h += lineSVG(p, lines[1], 'other sol', done) + `<circle class="pb-start on other sol" cx="${lines[1][0][0]}" cy="${lines[1][0][1]}" r=".2"/>`;
  h += lineSVG(p, pts, 'sol', done) + `<circle class="pb-start on sol" cx="${pts[0][0]}" cy="${pts[0][1]}" r=".2"/>`;
  if (!done) h += `<circle class="pb-head sol" cx="${pts[k][0]}" cy="${pts[k][1]}" r=".11"/>`;
  svg.innerHTML = h + orderOverlay(p);
}
