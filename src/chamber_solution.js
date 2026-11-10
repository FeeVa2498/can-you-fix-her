/* =========================================================
   TEST CHAMBER · Solution mode
   Replays a panel's answer step by step. Each step says what it
   achieves (pencil traced, region cut off and its ink, number cell
   filled), so it works for any panel; panels.json adds a hand-written
   "key idea" (p.why).
   ========================================================= */
function cellRegions(p, used) {
  const E = PanelEngine, reg = {}, list = []; let r = 0;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (reg[x + ',' + y] !== undefined) continue;
    const st = [[x, y]], cells = [[x, y]]; reg[x + ',' + y] = r;
    while (st.length) {
      const [cx, cy] = st.pop();
      for (const [nx, ny, wall] of [[cx + 1, cy, E.ekey(cx + 1, cy, cx + 1, cy + 1)], [cx - 1, cy, E.ekey(cx, cy, cx, cy + 1)], [cx, cy + 1, E.ekey(cx, cy + 1, cx + 1, cy + 1)], [cx, cy - 1, E.ekey(cx, cy, cx + 1, cy)]]) {
        if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || used.has(wall) || reg[nx + ',' + ny] !== undefined) continue;
        reg[nx + ',' + ny] = r; st.push([nx, ny]); cells.push([nx, ny]);
      }
    }
    list.push(cells); r++;
  }
  return list;
}
const cellSides = (E, cx, cy) => [E.ekey(cx, cy, cx + 1, cy), E.ekey(cx, cy + 1, cx + 1, cy + 1), E.ekey(cx, cy, cx, cy + 1), E.ekey(cx + 1, cy, cx + 1, cy + 1)];
function solEvents(p) {
  const E = PanelEngine, sol = p.sol, ev = [['Bắt đầu ở vòng tròn.']], used = new Set();
  const skN = (p.sketch || []).length, sk = new Set((p.sketch || []).map(e => E.ekey(...e)));
  const sigOf = regs => regs.map(c => c.map(q => q.join(',')).sort().join('|'));
  let traced = 0, prev = sigOf(cellRegions(p, used));
  const closed = [];
  for (let k = 1; k < sol.length; k++) {
    const key = E.ekey(...sol[k - 1], ...sol[k]), out = [];
    used.add(key);
    if (sk.has(key)) { traced++; out.push(`Tô nét chì (${traced}/${skN}).`); }
    (p.nums || []).forEach(([cx, cy, n]) => {
      const sides = cellSides(E, cx, cy); if (!sides.includes(key)) return;
      const c = sides.filter(s => used.has(s)).length;
      out.push(c === n ? `Ô "${n}" đã đủ ${n} cạnh: không được chạm thêm cạnh nào của nó.` : `Ô "${n}": đã chạm ${c}/${n} cạnh.`);
    });
    if ((p.squares || []).length) {
      const regs = cellRegions(p, used), sig = sigOf(regs);
      if (regs.length > prev.length) {
        // the newly separated pieces, except the biggest one (the side still open)
        const fresh = regs.map((c, i) => ({ c, i })).filter(({ i }) => !prev.includes(sig[i]));
        const biggest = fresh.reduce((a, b) => (b.c.length > a.c.length ? b : a), fresh[0]);
        fresh.filter(f => f !== biggest || fresh.length === 1).forEach(({ c }) => {
          const cols = new Set((p.squares || []).filter(([x, y]) => c.some(q => q[0] === x && q[1] === y)).map(q => q[2]));
          closed.push({ k, cells: c, col: cols.size === 1 ? [...cols][0] : 'none' });
          out.push(cols.size === 0 ? 'Cắt ra một vùng trống.' : cols.size === 1 ? `Cắt ra một vùng chỉ có mực ${[...cols][0] === 'pink' ? 'hồng' : 'đen'} ✓` : 'Cắt ra một vùng còn lẫn hai màu: phần sau của đường sẽ chia tiếp nó.');
        });
      }
      prev = sig;
    }
    if (k === sol.length - 1) {
      out.push('Tới lối ra.');
      if ((p.squares || []).length) {
        // finish: every region the line made, including the last big one
        const have = new Set(closed.map(c => c.cells.map(q => q.join(',')).sort().join('|')));
        const tally = { pink: 0, ink: 0, none: 0 };
        cellRegions(p, used).forEach(c => {
          const cols = new Set((p.squares || []).filter(([x, y]) => c.some(q => q[0] === x && q[1] === y)).map(q => q[2]));
          const col = cols.size === 1 ? [...cols][0] : 'none'; tally[col]++;
          if (!have.has(c.map(q => q.join(',')).sort().join('|'))) closed.push({ k, cells: c, col });
        });
        out.push(`Bảng chia thành ${tally.pink} vùng hồng, ${tally.ink} vùng đen${tally.none ? `, ${tally.none} vùng trống` : ''}: không vùng nào lẫn màu ✓`);
      }
      if (p.visitAll) out.push(`Đã đi qua đủ ${E.nodeCount(p)}/${E.nodeCount(p)} điểm.`);
      if (skN) out.push(`Đã tô đủ ${skN}/${skN} nét chì.`);
    }
    if (!out.length) { const dx = sol[k][0] - sol[k - 1][0], dy = sol[k][1] - sol[k - 1][1]; out.push(dx > 0 ? 'Sang phải.' : dx < 0 ? 'Sang trái.' : dy > 0 ? 'Đi xuống.' : 'Đi lên.'); }
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
function drawSol(svg, line) {
  const E = PanelEngine, p = PJ.p, k = PJ.solK, pts = p.sol.slice(0, k + 1), seen = new Set(pts.map(n => n.join(',')));
  const used = new Set(); for (let i = 1; i < pts.length; i++) used.add(E.ekey(...pts[i - 1], ...pts[i]));
  let h = boardSVG(p, { seen });
  PJ.solData.closed.filter(c => c.k <= k).forEach(c => c.cells.forEach(([x, y]) => { h += `<rect class="sb-reg ${c.col}" x="${x + .06}" y="${y + .06}" width=".88" height=".88" rx=".08"/>`; }));
  (p.sketch || []).forEach(e => { if (used.has(E.ekey(...e))) h += `<line class="sb-traced" x1="${e[0]}" y1="${e[1]}" x2="${e[2]}" y2="${e[3]}"/>`; });
  (p.nums || []).forEach(([cx, cy, n]) => { if (cellSides(E, cx, cy).filter(s => used.has(s)).length === n) h += `<circle class="sb-numok" cx="${cx + .5}" cy="${cy + .5}" r=".3"/>`; });
  h += `<polyline class="pb-ghost" points="${line(p.sol)}"/>`;
  const done = k === p.sol.length - 1;
  let tail = '';
  if (done) { const last = p.sol[k], [dx, dy] = E.exitDir(p, ...last); tail = ` ${last[0] + dx * .38},${last[1] + dy * .38}`; }
  h += `<polyline class="pb-line sol" points="${line(pts)}${tail}"/><circle class="pb-start on sol" cx="${pts[0][0]}" cy="${pts[0][1]}" r=".2"/>`;
  if (!done) h += `<circle class="pb-head sol" cx="${pts[k][0]}" cy="${pts[k][1]}" r=".11"/>`;
  svg.innerHTML = h;
}
