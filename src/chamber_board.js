/* =========================================================
   TEST CHAMBER · drawing and playing a panel (all rules)
   ========================================================= */
const COLS = { pink: '#ff6fb5', ink: '#0d0714' };
const HEART = { pink: '#ff6fb5', violet: '#b48cff', teal: '#5fd6c8' };
const PORTAL = ['#ffd86e', '#8fdcf7', '#b48cff'];
const PIECE = { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛' };
const opt = e => (e && typeof e[e.length - 1] === 'object' && !Array.isArray(e[e.length - 1])) ? e[e.length - 1] : {};
function vb(p, pad = .75) { const d = PanelEngine.dims(p); return `${-pad} ${-pad} ${d.cols - 1 + pad * 2} ${d.rows - 1 + pad * 2}`; }
function allEdgesOf(p) {
  const E = PanelEngine, d = E.dims(p), out = [];
  for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
    const [a, b] = E.norm(p, nx, ny); if (!E.inside(p, a, b) || (a === x && b === y)) continue;
    out.push([x, y, a, b]);
  }
  return out;
}
// an edge as drawable pieces (a wrapped edge becomes two stubs leaving the board)
function edgeSegs(x1, y1, x2, y2) {
  if (Math.abs(x2 - x1) + Math.abs(y2 - y1) === 1) return [[x1, y1, x2, y2]];
  const dx = Math.abs(x2 - x1) > 1 ? -Math.sign(x2 - x1) : (x2 - x1), dy = Math.abs(y2 - y1) > 1 ? -Math.sign(y2 - y1) : (y2 - y1);
  return [[x1, y1, x1 + dx * .5, y1 + dy * .5], [x2 - dx * .5, y2 - dy * .5, x2, y2]];
}
const segLine = (cls, s, extra = '') => `<line class="${cls}" x1="${s[0]}" y1="${s[1]}" x2="${s[2]}" y2="${s[3]}"${extra}/>`;
/* the board. o: { bad, seen (Set of 'x,y' on the line), reveal (show fog/lens), mini, erased } */
function boardSVG(p, o = {}) {
  const E = PanelEngine, d = E.dims(p), br = E.brokenSet(p), out = [];
  const B = (k, i) => o.bad && o.bad[k] && o.bad[k].has(i) ? ' bad' : '';
  const gone = (k, i) => o.erased === k + ':' + i ? ' gone' : '';
  out.push(`<rect class="pb-bg" x="-0.5" y="-0.5" width="${d.cols - 1 + 1}" height="${d.rows - 1 + 1}" rx="0.35"/>`);
  // tracks
  allEdgesOf(p).forEach(([x1, y1, x2, y2]) => {
    if (br.has(E.ekey(x1, y1, x2, y2))) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ddx = (x2 - x1) * .16, ddy = (y2 - y1) * .16;
      if (Math.abs(x2 - x1) + Math.abs(y2 - y1) === 1) out.push(segLine('pb-trk', [x1, y1, mx - ddx, my - ddy]) + segLine('pb-trk', [mx + ddx, my + ddy, x2, y2]));
      return;
    }
    edgeSegs(x1, y1, x2, y2).forEach(s => out.push(segLine('pb-trk', s)));
  });
  if (d.wx) for (let y = 0; y < d.rows; y++) { out.push(`<text class="pb-wrap" x="${-0.62}" y="${y}">‹</text><text class="pb-wrap" x="${d.cols - 1 + .62}" y="${y}">›</text>`); }
  if (d.wy) for (let x = 0; x < d.cols; x++) { out.push(`<text class="pb-wrap" x="${x}" y="${-0.62}">⌃</text><text class="pb-wrap" x="${x}" y="${d.rows - 1 + .66}">⌄</text>`); }
  // edge rules
  const edges = (list, cls, k) => (list || []).forEach((e, i) => edgeSegs(e[0], e[1], e[2], e[3]).forEach(s => out.push(segLine(cls + B(k, i) + gone(k, i), s))));
  edges(p.warm, 'pb-warm', 'warm'); edges(p.cool, 'pb-cool', 'cool');
  edges(p.sketch, 'pb-sketch', 'sketch'); edges(p.avoid, 'pb-avoid', 'avoid');
  // exits
  (p.exit || []).forEach(([x, y]) => { const dir = E.exitDir(p, x, y); out.push(dir ? segLine('pb-trk', [x, y, x + dir[0] * .38, y + dir[1] * .38]) : `<circle class="pb-exitring" cx="${x}" cy="${y}" r=".3"/>`); });
  // cell symbols (fog = face-down card until the line passes next to it)
  const near = (cx, cy) => o.reveal || (o.seen && [[cx, cy], [cx + 1, cy], [cx, cy + 1], [cx + 1, cy + 1]].some(([x, y]) => o.seen.has(x + ',' + y)));
  const lensOnly = [];
  const cell = (e, k, i, draw) => {
    const [cx, cy] = e, f = opt(e);
    if (f.lens && !o.reveal) { lensOnly.push(draw()); return; }
    if (f.fog && !near(cx, cy)) { out.push(`<g class="pb-card${B(k, i)}"><rect x="${cx + .26}" y="${cy + .2}" width=".48" height=".6" rx=".07"/><text x="${cx + .5}" y="${cy + .52}">?</text></g>`); return; }
    out.push(draw());
  };
  (p.squares || []).forEach((e, i) => cell(e, 'squares', i, () => `<rect class="pb-sq${B('squares', i)}${gone('squares', i)}" x="${e[0] + .3}" y="${e[1] + .3}" width=".4" height=".4" rx=".09" fill="${COLS[e[2]]}"/>`));
  (p.nums || []).forEach((e, i) => cell(e, 'nums', i, () => `<text class="pb-num${B('nums', i)}${gone('nums', i)}" x="${e[0] + .5}" y="${e[1] + .5}">${e[2]}</text>`));
  (p.pieces || []).forEach((e, i) => cell(e, 'pieces', i, () => `<text class="pb-piece${B('pieces', i)}${gone('pieces', i)}" x="${e[0] + .5}" y="${e[1] + .53}">${PIECE[e[2]]}</text>`));
  (p.hearts || []).forEach((e, i) => cell(e, 'hearts', i, () => `<text class="pb-heart${B('hearts', i)}${gone('hearts', i)}" x="${e[0] + .5}" y="${e[1] + .55}" fill="${HEART[e[2]]}">♥</text>`));
  (p.shapes || []).forEach((e, i) => cell(e, 'shapes', i, () => {
    const sh = e[2], mx = Math.min(...sh.map(c => c[0])), my = Math.min(...sh.map(c => c[1])), W = Math.max(...sh.map(c => c[0])) - mx + 1, Hh = Math.max(...sh.map(c => c[1])) - my + 1;
    const u = .58 / Math.max(W, Hh, 2), ox = e[0] + .5 - W * u / 2, oy = e[1] + .5 - Hh * u / 2;
    return `<g class="pb-shape${B('shapes', i)}${gone('shapes', i)}">${sh.map(([x, y]) => `<rect x="${ox + (x - mx) * u + .01}" y="${oy + (y - my) * u + .01}" width="${u - .02}" height="${u - .02}"/>`).join('')}</g>`;
  }));
  (p.radar || []).forEach((e, i) => out.push(`<g class="pb-radar"><rect x="${e[0] + .5}" y="${e[1] + .2}" width=".42" height=".42" transform="rotate(45 ${e[0] + .5} ${e[1] + .2})"/><text x="${e[0] + .5}" y="${e[1] + .52}">${e[2]}</text></g>`));
  if (o.showMines) (p.mines || []).forEach((m, i) => out.push(`<text class="pb-mine${B('mines', i)}" x="${m[0] + .5}" y="${m[1] + .55}">✸</text>`));
  // nodes
  if (p.visitAll) for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) out.push(`<circle class="pb-ring${o.seen && o.seen.has(x + ',' + y) ? ' on' : ''}${o.bad && o.bad.visitAll ? ' bad' : ''}" cx="${x}" cy="${y}" r=".09"/>`);
  (p.portals || []).forEach((q, i) => [[q[0], q[1]], [q[2], q[3]]].forEach(([x, y]) => out.push(`<circle class="pb-portal" cx="${x}" cy="${y}" r=".2" stroke="${PORTAL[i % 3]}"/><circle cx="${x}" cy="${y}" r=".09" fill="${PORTAL[i % 3]}"/>`)));
  (p.switches || []).forEach(([x, y]) => out.push(`<g class="pb-switch"><circle cx="${x}" cy="${y}" r=".19"/><path d="M${x} ${y - .19} A.19 .19 0 0 1 ${x} ${y + .19} Z"/></g>`));
  (p.dots || []).forEach((e, i) => {
    const f = opt(e), draw = `<circle class="pb-dot${B('dots', i)}" cx="${e[0]}" cy="${e[1]}" r=".1"/>`;
    if (f.lens && !o.reveal) lensOnly.push(draw);
    else if (f.fog && !(o.reveal || (o.seen && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => o.seen.has((e[0] + a) + ',' + (e[1] + b)))))) out.push(`<text class="pb-fogdot" x="${e[0]}" y="${e[1] + .06}">?</text>`);
    else out.push(draw);
  });
  (p.order || []).forEach((e, i) => out.push(`<g class="pb-order${B('order', i)}"><circle cx="${e[0]}" cy="${e[1]}" r=".17"/><text x="${e[0]}" y="${e[1] + .01}">${i + 1}</text></g>`));
  (p.start || []).forEach(([x, y], i) => out.push(`<circle class="pb-start${p.mirror && i ? ' other' : ''}" cx="${x}" cy="${y}" r=".2"/>`));
  if (lensOnly.length && !o.mini) {
    const L = o.lens;
    if (L) out.push(`<defs><clipPath id="lensclip"><circle cx="${L[0]}" cy="${L[1]}" r=".95"/></clipPath></defs><g clip-path="url(#lensclip)">${lensOnly.join('')}</g><circle class="pb-lens" cx="${L[0]}" cy="${L[1]}" r=".95"/>`);
  }
  return out.join('');
}
// the line, split where it wraps or jumps through a portal
function lineSVG(p, path, cls, tailOut) {
  if (!path.length) return '';
  const E = PanelEngine, J = E.jumps(p, path), polys = [[path[0]]], extra = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (J[i]) { extra.push(`<line class="pb-jump" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`); polys.push([b]); continue; }
    const segs = edgeSegs(a[0], a[1], b[0], b[1]);
    if (segs.length === 1) polys[polys.length - 1].push(b);
    else { polys[polys.length - 1].push([segs[0][2], segs[0][3]]); polys.push([[segs[1][0], segs[1][1]], b]); }
  }
  const last = path[path.length - 1];
  if (tailOut) { const dir = E.exitDir(p, ...last); if (dir) polys[polys.length - 1].push([last[0] + dir[0] * .38, last[1] + dir[1] * .38]); }
  return extra.join('') + polys.map(pl => `<polyline class="pb-line ${cls}" points="${pl.map(n => n.join(',')).join(' ')}"/>`).join('');
}
function drawPJ() {
  if (!PJ) return; const p = PJ.p, svg = $('#pj-svg'); if (!svg) return;
  const line = pts => pts.map(n => n.join(',')).join(' ');
  if (PJ.solOn) { drawSol(svg, line); return; }
  const bad = {};
  if (PJ.state === 'fail') PJ.bad.forEach(x => { if (x.kind === 'visitAll') bad.visitAll = true; else (bad[x.kind] = bad[x.kind] || new Set()).add(x.i); });
  const lines = PJ.path.length ? PanelEngine.lines(p, PJ.path) : [];
  const seen = new Set(lines.flat().map(n => n.join(',')));
  let h = boardSVG(p, { bad, seen, erased: PJ.erased, lens: PJ.lensOn && PJ.lensAt, showMines: PJ.state === 'fail' && bad.mines });
  if (PJ.hint) h += lineSVG(p, PJ.hint, 'hint');
  if (PJ.path.length) {
    const last = PJ.path[PJ.path.length - 1], out = PanelEngine.isExit(p, ...last) && (PJ.state === 'win' || PJ.atExit);
    if (p.mirror) { const m = lines[1]; h += lineSVG(p, m, 'other ' + PJ.state, out) + `<circle class="pb-start on other ${PJ.state}" cx="${m[0][0]}" cy="${m[0][1]}" r=".2"/>`; }
    h += lineSVG(p, PJ.path, PJ.state, out) + `<circle class="pb-start on ${PJ.state}" cx="${PJ.path[0][0]}" cy="${PJ.path[0][1]}" r=".2"/>`;
    if (PJ.state !== 'win') h += `<circle class="pb-head ${PJ.state}" cx="${last[0]}" cy="${last[1]}" r=".11"/>`;
  }
  svg.innerHTML = h + orderOverlay(p, bad);
  const tok = $('#pj-erase'); if (tok) tok.innerHTML = `${icon('queen')} ${PJ.eraseUsed ? 'used' : 'ready'}`;
  const hb = $('#pj-hint'); if (hb) hb.disabled = PJ.hintUsed || PJ.state === 'win';
}
function svgPt(svg, e) { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const r = pt.matrixTransform(svg.getScreenCTM().inverse()); return [r.x, r.y]; }
/* try to move the line one step; handles wrap, portals, the mirror and walls */
function pjStep(dx, dy) {
  const E = PanelEngine, p = PJ.p, path = PJ.path, last = path[path.length - 1], J = E.jumps(p, path);
  const prev = path[path.length - 2];
  const [nx, ny] = E.norm(p, last[0] + dx, last[1] + dy);
  // stepping back the way we came = undo (right after a portal, undo is Backspace / dragging back)
  if (!J[path.length - 1] && prev && prev[0] === nx && prev[1] === ny) { pjBack(); return true; }
  if (!E.inside(p, nx, ny) || (nx === last[0] && ny === last[1])) return false;
  if (!E.neighbors(p, ...last).some(n => n[0] === nx && n[1] === ny)) return false;
  const taken = new Set(E.lines(p, path).flat().map(n => n.join(',')));
  const ok = n => { if (taken.has(n.join(','))) return false; if (p.mirror) { const m = E.mirrorOf(p, n); if (taken.has(m.join(',')) || (m[0] === n[0] && m[1] === n[1])) return false; } return true; };
  if (!ok([nx, ny])) return false;
  path.push([nx, ny]); SFX.step(path.length);
  const t = E.twin(p, nx, ny);
  if (t) { if (ok(t) && !(t[0] === nx && t[1] === ny)) { path.push(t.slice()); SFX.link(); } else { path.pop(); return false; } }
  return true;
}
function pjBack() {
  const E = PanelEngine, J = E.jumps(PJ.p, PJ.path);
  if (PJ.path.length <= 1) return;
  if (J[PJ.path.length - 1]) PJ.path.pop();
  PJ.path.pop(); SFX.tick();
}
function pjFollow(fx, fy) {
  const E = PanelEngine, p = PJ.p, d = E.dims(p);
  for (let guard = 0; guard < 40; guard++) {
    const last = PJ.path[PJ.path.length - 1];
    // on a wrapping board, read the pointer as the copy nearest to the head
    let gx = fx, gy = fy;
    if (d.wx) gx -= d.cols * Math.round((fx - last[0]) / d.cols);
    if (d.wy) gy -= d.rows * Math.round((fy - last[1]) / d.rows);
    // back up along the line
    const J = E.jumps(p, PJ.path), back = J[PJ.path.length - 1] ? PJ.path[PJ.path.length - 3] : PJ.path[PJ.path.length - 2];
    if (back) {
      let bx = back[0], by = back[1]; const ref = J[PJ.path.length - 1] ? PJ.path[PJ.path.length - 2] : last;
      if (d.wx) bx -= d.cols * Math.round((bx - ref[0]) / d.cols); if (d.wy) by -= d.rows * Math.round((by - ref[1]) / d.rows);
      if (!J[PJ.path.length - 1] && Math.hypot(gx - bx, gy - by) < .45) { pjBack(); continue; }
    }
    const dx = gx - last[0], dy = gy - last[1];
    const dir = E.exitDir(p, ...last);
    PJ.atExit = E.isExit(p, ...last) && (!dir || dx * dir[0] + dy * dir[1] > .2);
    const tryAxis = ax => { const v = ax === 'x' ? dx : dy; if (Math.abs(v) < .55) return false; const s = Math.sign(v); const before = PJ.path.length; return pjStep(ax === 'x' ? s : 0, ax === 'y' ? s : 0) && PJ.path.length > before; };
    const first = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    if (tryAxis(first) || tryAxis(first === 'x' ? 'y' : 'x')) continue;
    break;
  }
}
function bindPJ(svg) {
  svg.addEventListener('pointerdown', e => {
    if (!PJ || PJ.state === 'win' || PJ.solOn) return;
    const [fx, fy] = svgPt(svg, e), p = PJ.p;
    const last = PJ.path[PJ.path.length - 1];
    const st = (p.start || []).slice(0, p.mirror ? 1 : 9).find(([x, y]) => Math.hypot(fx - x, fy - y) < .4);
    if (last && Math.hypot(fx - last[0], fy - last[1]) < .4 && PJ.state !== 'fail') { /* keep drawing from the end */ }
    else if (st) { PJ.path = [st.slice()]; SFX.click(); }
    else return;
    PJ.state = 'draw'; PJ.bad = []; PJ.drawing = true; svg.setPointerCapture(e.pointerId); drawPJ();
  });
  svg.addEventListener('pointermove', e => {
    if (!PJ) return; const [fx, fy] = svgPt(svg, e);
    if (PJ.lensOn) PJ.lensAt = [fx, fy];
    if (PJ.drawing) pjFollow(fx, fy);
    if (PJ.drawing || PJ.lensOn) drawPJ();
  });
  const up = () => { if (!PJ || !PJ.drawing) return; PJ.drawing = false; const last = PJ.path[PJ.path.length - 1]; if (last && PanelEngine.isExit(PJ.p, ...last) && PJ.path.length > 1) pjSubmit(); else { PJ.state = 'idle'; drawPJ(); } };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
}
function pjKey(e) {
  if (!PJ || !WINS.projector) return;
  if (PJ.solOn) {
    if (e.key === 'ArrowRight') { e.preventDefault(); solStep(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); solStep(-1); }
    else if (e.key === ' ') { e.preventDefault(); solPlay(); } else if (e.key === 'Escape') solMode(false);
    return;
  }
  if (PJ.state === 'win') return;
  if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const D = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (D) {
    e.preventDefault();
    if (!PJ.path.length || PJ.state === 'fail') { PJ.path = [PJ.p.start[0].slice()]; PJ.bad = []; }
    PJ.state = 'draw'; pjStep(...D); drawPJ();
  } else if (e.key === 'Enter') { const last = PJ.path[PJ.path.length - 1]; if (last && PJ.path.length > 1 && PanelEngine.isExit(PJ.p, ...last)) { e.preventDefault(); pjSubmit(); } }
  else if (e.key === 'Backspace') { e.preventDefault(); pjBack(); drawPJ(); }
  else if (e.key === 'Escape') { PJ.path = []; PJ.state = 'idle'; drawPJ(); }
}
function useHint() {
  if (!PJ || PJ.hintUsed || !PJ.p.sol) return;
  const sol = PJ.p.sol; let k = 0;
  while (k < PJ.path.length && k < sol.length && sol[k][0] === PJ.path[k][0] && sol[k][1] === PJ.path[k][1]) k++;
  const from = Math.max(0, k - 1);
  PJ.hint = sol.slice(from, from + 4);
  PJ.hintUsed = true; SFX.item();
  $('#pj-msg').textContent = k < PJ.path.length ? 'The tracing paper shows where your line went wrong.' : 'The next strokes show through the tracing paper.';
  drawPJ();
}

// numbered points stay readable on top of the line
function orderOverlay(p, bad = {}) { return (p.order || []).map((e, i) => `<g class="pb-order${bad.order && bad.order.has(i) ? ' bad' : ''}"><circle cx="${e[0]}" cy="${e[1]}" r=".15"/><text x="${e[0]}" y="${e[1] + .01}">${i + 1}</text></g>`).join(''); }
