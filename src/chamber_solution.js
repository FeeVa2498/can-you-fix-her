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
  if (p.twin) return twinSolEvents(p);
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
function twinSolEvents(p) {
  const E = PanelEngine, inp = p.solIn, ev = [['Hai đường bắt đầu ở hai vòng tròn: hồng và tím.']];
  let s = E.twinStart(p);
  const nm = ['hồng', 'tím'];
  for (let k = 0; k < inp.length; k++) {
    const c = inp[k], r = E.twinStep(p, s, E.DK[c]), out = [`Ấn ${KEYN[c]}${p.moves ? ` (nước ${k + 1}/${p.moves})` : ''}.`];
    r.state.heads.forEach((h, i) => {
      const was = s.heads[i];
      if (was.parked) { out.push(`Đường ${nm[i]} đã đỗ, đứng yên.`); return; }
      if (!r.moved[i]) { out.push(`Đường ${nm[i]} bị chặn, đứng yên.`); return; }
      const d = E.twinDir(p, i, E.DK[c]), added = h.path.length - was.path.length;
      let t = `Đường ${nm[i]} đi ${ARW[E.dirKey(d)]}`;
      const jumps = h.jump.slice(was.path.length).filter(Boolean).length;
      if (jumps) t += ', qua cổng';
      if (added - jumps > 1) t += `, trượt thêm ${added - jumps - 1} ô`;
      out.push(t + '.');
      if (h.parked) out.push(`Đường ${nm[i]} tới đích của nó và đỗ lại.`);
    });
    s = r.state; ev.push(out);
  }
  ev[ev.length - 1].push('Cả hai đã đỗ: xong.');
  return { ev, n: inp.length };
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
  if (p.twin) {
    const s = E.twinReplay(p, p.solIn.slice(0, k));
    h = boardSVG(p, { seen: new Set(s.heads.flatMap(hd => hd.path.map(n => n.join(',')))), parked: s.heads.map(hd => hd.parked) });
    s.heads.forEach((hd, i) => {
      const last = hd.path[hd.path.length - 1];
      h += lineSVG(p, hd.path, 'sol', false, hd.jump, ` style="stroke:${TWINC[i]}"`) + `<circle class="pb-start on" cx="${hd.path[0][0]}" cy="${hd.path[0][1]}" r=".2" style="fill:${TWINC[i]}"/>`;
      h += hd.parked ? `<circle class="pb-park" cx="${last[0]}" cy="${last[1]}" r=".3" style="stroke:${TWINC[i]}"/>` : `<circle class="pb-head" cx="${last[0]}" cy="${last[1]}" r=".13" style="fill:${TWINC[i]}"/>`;
    });
    svg.innerHTML = h; return;
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
