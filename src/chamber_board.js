/* =========================================================
   TEST CHAMBER · drawing and playing a panel (engine v3)
   Keyboard: WASD / arrows move, Z (or Backspace) undoes a move,
   R resets, Enter submits. Mouse drag works for one-line panels.
   ========================================================= */
const COLS = { pink: '#ff6fb5', ink: '#0d0714' };
const PORTAL = ['#ffd86e', '#8fdcf7', '#7be3a4'];
const TWINC = ['#ff8cc6', '#b48cff'];
function vb(p, pad = .75) { const d = PanelEngine.dims(p); return `${-pad} ${-pad} ${d.cols - 1 + pad * 2} ${d.rows - 1 + pad * 2}`; }
function allEdgesOf(p) {
  const E = PanelEngine, d = E.dims(p), out = [];
  for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) {
    if (!E.inside(p, x, y)) continue;
    for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) if (E.inside(p, nx, ny)) out.push([x, y, nx, ny]);
  }
  return out;
}
function edgeSegs(x1, y1, x2, y2) { return [[x1, y1, x2, y2]]; }
const segLine = (cls, s, extra = '') => `<line class="${cls}" x1="${s[0]}" y1="${s[1]}" x2="${s[2]}" y2="${s[3]}"${extra}/>`;
const arrowAt = (x, y, dx, dy, s, cls) => {   // a small chevron pointing (dx,dy)
  const px = -dy, py = dx;
  return `<path class="${cls}" d="M${x - dx * s * .6 + px * s} ${y - dy * s * .6 + py * s} L${x + dx * s * .7} ${y + dy * s * .7} L${x - dx * s * .6 - px * s} ${y - dy * s * .6 - py * s}"/>`;
};
/* the board. o: { bad, seen (Set of 'x,y'), mini, erased, parked:[bool,bool] } */
function boardSVG(p, o = {}) {
  const E = PanelEngine, d = E.dims(p), br = E.brokenSet(p), out = [];
  const B = (k, i) => o.bad && o.bad[k] && o.bad[k].has(i) ? ' bad' : '';
  const gone = (k, i) => o.erased === k + ':' + i ? ' gone' : '';
  // floor: a plain slab, or (with holes) a blob that follows the nodes that exist
  if (!(p.holes || []).length) out.push(`<rect class="pb-bg" x="-0.5" y="-0.5" width="${d.cols}" height="${d.rows}" rx="0.35"/>`);
  else {
    const f = [];
    for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) if (E.inside(p, x, y)) f.push(`<rect x="${x - .5}" y="${y - .5}" width="1" height="1" rx=".32"/>`);
    allEdgesOf(p).forEach(([x1, y1, x2, y2]) => f.push(`<rect x="${Math.min(x1, x2) - .5 + (x1 === x2 ? 0 : .3)}" y="${Math.min(y1, y2) - .5 + (y1 === y2 ? 0 : .3)}" width="${x1 === x2 ? 1 : 1.4}" height="${y1 === y2 ? 1 : 1.4}"/>`));
    // fill the square between four existing nodes
    for (let y = 0; y < d.rows - 1; y++) for (let x = 0; x < d.cols - 1; x++) if ([[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].every(n => E.inside(p, ...n))) f.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    out.push(`<g class="pb-bg blob">${f.join('')}</g>`);
    (p.holes || []).forEach(([x, y]) => out.push(`<circle class="pb-hole" cx="${x}" cy="${y}" r=".12"/>`));
  }
  // tracks (a broken link shows as a gap)
  const ow = new Map((p.oneway || []).map(e => [E.ekey(e[0], e[1], e[2], e[3]), e]));
  allEdgesOf(p).forEach(([x1, y1, x2, y2]) => {
    if (br.has(E.ekey(x1, y1, x2, y2))) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ddx = (x2 - x1) * .16, ddy = (y2 - y1) * .16;
      out.push(segLine('pb-trk', [x1, y1, mx - ddx, my - ddy]) + segLine('pb-trk', [mx + ddx, my + ddy, x2, y2]));
      return;
    }
    out.push(segLine('pb-trk', [x1, y1, x2, y2]));
  });
  ow.forEach(e => out.push(arrowAt((e[0] + e[2]) / 2, (e[1] + e[3]) / 2, e[2] - e[0], e[3] - e[1], .13, 'pb-ow')));
  // edge rules
  const edges = (list, cls, k) => (list || []).forEach((e, i) => out.push(segLine(cls + B(k, i) + gone(k, i), e)));
  edges(p.sketch, 'pb-sketch', 'sketch'); edges(p.avoid, 'pb-avoid', 'avoid');
  // exits: a stub off the border, or a ring inside the board
  (p.exit || []).forEach(([x, y], i) => {
    const dir = p.twin ? null : E.exitDir(p, x, y);
    const tw = p.twin ? ` style="stroke:${TWINC[i]}"` : '';
    out.push(dir ? segLine('pb-trk', [x, y, x + dir[0] * .38, y + dir[1] * .38]) : `<circle class="pb-exitring${o.parked && o.parked[i] ? ' parked' : ''}" cx="${x}" cy="${y}" r=".3"${tw}/>`);
  });
  // cells
  (p.squares || []).forEach((e, i) => out.push(`<rect class="pb-sq${B('squares', i)}${gone('squares', i)}" x="${e[0] + .3}" y="${e[1] + .3}" width=".4" height=".4" rx=".09" fill="${COLS[e[2]]}"/>`));
  (p.nums || []).forEach((e, i) => out.push(`<text class="pb-num${B('nums', i)}${gone('nums', i)}" x="${e[0] + .5}" y="${e[1] + .5}">${e[2]}</text>`));
  // nodes
  if (p.visitAll) for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) if (E.inside(p, x, y)) out.push(`<circle class="pb-ring${o.seen && o.seen.has(x + ',' + y) ? ' on' : ''}${o.bad && o.bad.visitAll ? ' bad' : ''}" cx="${x}" cy="${y}" r=".09"/>`);
  (p.stops || []).forEach(([x, y]) => out.push(`<rect class="pb-stop" x="${x - .17}" y="${y - .17}" width=".34" height=".34" rx=".06"/>`));
  (p.pads || []).forEach(([x, y, dx, dy]) => out.push(`<g class="pb-pad"><circle cx="${x}" cy="${y}" r=".22"/>${arrowAt(x, y, dx, dy, .12, '')}</g>`));
  (p.bridges || []).forEach(([x, y]) => out.push(`<g class="pb-bridge"><rect x="${x - .2}" y="${y - .2}" width=".4" height=".4" rx=".05" transform="rotate(45 ${x} ${y})"/><path d="M${x - .1} ${y}H${x + .1}M${x} ${y - .1}V${y + .1}"/></g>`));
  (p.portals || []).forEach((q, i) => [[q[0], q[1]], [q[2], q[3]]].forEach(([x, y]) => out.push(`<circle class="pb-portal" cx="${x}" cy="${y}" r=".21" stroke="${PORTAL[i % 3]}"/><circle cx="${x}" cy="${y}" r=".09" fill="${PORTAL[i % 3]}"/>`)));
  (p.dots || []).forEach((e, i) => out.push(`<circle class="pb-dot${B('dots', i)}" cx="${e[0]}" cy="${e[1]}" r=".1"/>`));
  (p.start || []).forEach(([x, y], i) => out.push(`<circle class="pb-start${p.mirror && i ? ' other' : ''}" cx="${x}" cy="${y}" r=".2"${p.twin ? ` style="fill:${TWINC[i]};opacity:.55"` : ''}/>`));
  return out.join('');
}
// the line, split where it jumps through a portal. J: jump flags (computed if missing)
function lineSVG(p, path, cls, tailOut, J, style = '') {
  if (!path.length) return '';
  const E = PanelEngine; J = J || E.jumps(p, path);
  const polys = [[path[0]]], extra = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (J[i]) { extra.push(`<line class="pb-jump" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"${style}/>`); polys.push([b]); continue; }
    polys[polys.length - 1].push(b);
  }
  const last = path[path.length - 1];
  if (tailOut) { const dir = E.exitDir(p, ...last); if (dir) polys[polys.length - 1].push([last[0] + dir[0] * .38, last[1] + dir[1] * .38]); }
  return extra.join('') + polys.map(pl => `<polyline class="pb-line ${cls}" points="${pl.map(n => n.join(',')).join(' ')}"${style}/>`).join('');
}
// bridges crossed twice get a little "over" mark so the crossing reads as an overpass
function bridgeOver(p, path) {
  return (p.bridges || []).filter(b => path.filter(n => n[0] === b[0] && n[1] === b[1]).length > 1).map(([x, y]) => `<circle class="pb-over" cx="${x}" cy="${y}" r=".13"/>`).join('');
}

/* ---------------- state helpers ---------------- */
const pjPath = () => PJ.st ? PJ.st.path : [];
function pjMovesText() {
  const p = PJ.p, n = p.twin ? (PJ.ts ? PJ.ts.inputs.length : 0) : (PJ.st ? PJ.st.moves : 0);
  return p.moves ? `moves ${n}/${p.moves}` : `moves ${n}`;
}
function drawPJ() {
  if (!PJ) return; const p = PJ.p, svg = $('#pj-svg'); if (!svg) return;
  if (PJ.solOn) { drawSol(svg); return; }
  const bad = {};
  if (PJ.state === 'fail') PJ.bad.forEach(x => { if (x.kind === 'visitAll') bad.visitAll = true; else (bad[x.kind] = bad[x.kind] || new Set()).add(x.i); });
  let h;
  if (p.twin) {
    const ts = PJ.ts, seen = new Set(ts.heads.flatMap(hd => hd.path.map(n => n.join(','))));
    h = boardSVG(p, { bad, seen, erased: PJ.erased, parked: ts.heads.map(hd => hd.parked) });
    ts.heads.forEach((hd, i) => {
      const st = ` style="stroke:${TWINC[i]}"`;
      h += lineSVG(p, hd.path, PJ.state === 'fail' ? 'fail' : PJ.state === 'win' ? 'win' : '', false, hd.jump, PJ.state === 'draw' || PJ.state === 'idle' ? st : '');
      const last = hd.path[hd.path.length - 1];
      h += `<circle class="pb-start on" cx="${hd.path[0][0]}" cy="${hd.path[0][1]}" r=".2" style="fill:${TWINC[i]}"/>`;
      h += hd.parked ? `<circle class="pb-park" cx="${last[0]}" cy="${last[1]}" r=".3" style="stroke:${TWINC[i]}"/>` : `<circle class="pb-head" cx="${last[0]}" cy="${last[1]}" r=".13" style="fill:${TWINC[i]}"/>`;
    });
  } else {
    const path = pjPath(), lines = path.length ? PanelEngine.lines(p, path) : [];
    const seen = new Set(lines.flat().map(n => n.join(',')));
    h = boardSVG(p, { bad, seen, erased: PJ.erased });
    if (PJ.hint) h += lineSVG(p, PJ.hint.path, 'hint', false, PJ.hint.jump);
    if (path.length) {
      const last = path[path.length - 1], out = PJ.state === 'win';
      if (p.mirror) { const m = lines[1]; h += lineSVG(p, m, 'other ' + PJ.state, out, PJ.st.jump) + `<circle class="pb-start on other ${PJ.state}" cx="${m[0][0]}" cy="${m[0][1]}" r=".2"/>`; }
      h += lineSVG(p, path, PJ.state, out, PJ.st.jump) + bridgeOver(p, path) + `<circle class="pb-start on ${PJ.state}" cx="${path[0][0]}" cy="${path[0][1]}" r=".2"/>`;
      if (PJ.state !== 'win') h += `<circle class="pb-head ${PJ.state}" cx="${last[0]}" cy="${last[1]}" r=".11"/>`;
    }
  }
  svg.innerHTML = h;
  const mv = $('#pj-moves'); if (mv) { mv.textContent = pjMovesText(); mv.classList.toggle('bad', !!(bad.moves)); }
  const tok = $('#pj-erase'); if (tok) tok.innerHTML = `${icon('queen')} ${PJ.eraseUsed ? 'used' : 'ready'}`;
  const hb = $('#pj-hint'); if (hb) hb.disabled = PJ.hintUsed || PJ.state === 'win';
}
function pjReset() {
  if (!PJ) return;
  PJ.st = null; PJ.ts = PJ.p.twin ? PanelEngine.twinStart(PJ.p) : null; PJ.tsHist = [];
  PJ.state = 'idle'; PJ.bad = []; drawPJ();
}
function svgPt(svg, e) { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const r = pt.matrixTransform(svg.getScreenCTM().inverse()); return [r.x, r.y]; }
const sameDir = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

/* one key press. Returns true if something moved. */
function pjMove(d) {
  const E = PanelEngine, p = PJ.p;
  if (PJ.state === 'fail') { PJ.state = 'draw'; PJ.bad = []; }
  if (p.twin) {
    const r = E.twinStep(p, PJ.ts, d);
    if (!r.moved[0] && !r.moved[1]) { SFX.tick(); return false; }
    PJ.tsHist.push(PJ.ts); PJ.ts = r.state; PJ.state = 'draw';
    SFX.step(PJ.ts.inputs.length);
    if (r.state.heads.some((h, i) => h.parked && !PJ.tsHist[PJ.tsHist.length - 1].heads[i].parked)) SFX.link();
    if (PJ.ts.heads.every(h => h.parked)) pjSubmit();
    return true;
  }
  if (!PJ.st) PJ.st = E.start(p, p.start[0]);
  const st = PJ.st, C = E.ctx(p), at = st.path[st.path.length - 1];
  PJ.state = 'draw';
  // walking off through the exit stub = submit
  const ed = E.exitDir(p, ...at);
  if (ed && sameDir(ed, d) && E.canStop(p, st, C)) { pjSubmit(); return true; }
  const o = E.options(p, st, C).find(o => !o.forced && sameDir(o.dir, d));
  if (!o) {
    // pressing back the way the last move came = undo
    const i = st.path.length - 1;
    if (i > 0 && !st.forced[i] && sameDir(st.lastDir, [-d[0], -d[1]])) { pjUndo(); return true; }
    SFX.tick(); return false;
  }
  const before = st.path.length;
  E.apply(p, st, o);
  for (let g = 0; g < 80; g++) { const f = E.options(p, st, C); if (f.length === 1 && f[0].forced) E.apply(p, st, f[0]); else break; }
  if (st.pend) { while (st.path.length > before) E.undo(p, st); SFX.tick(); return false; }   // a portal or bridge with no way out
  SFX.step(st.path.length);
  if (st.path.length - before > 1) SFX.link();
  return true;
}
function pjUndo() {
  const E = PanelEngine, p = PJ.p;
  if (PJ.state === 'fail') { PJ.state = 'draw'; PJ.bad = []; }
  if (p.twin) { if (PJ.tsHist.length) { PJ.ts = PJ.tsHist.pop(); SFX.tick(); } return; }
  const st = PJ.st; if (!st) return;
  if (st.path.length <= 1) { PJ.st = null; return; }
  while (st.path.length > 1 && st.forced[st.forced.length - 1]) E.undo(p, st);
  if (st.path.length > 1) E.undo(p, st);
  SFX.tick();
}
/* mouse drag (one-line panels): steer the head toward the pointer */
function pjFollow(fx, fy) {
  const E = PanelEngine;
  for (let guard = 0; guard < 40; guard++) {
    const st = PJ.st, path = st.path, last = path[path.length - 1];
    // back over the node the last move started from = undo
    let j = path.length - 1; while (j > 0 && st.forced[j]) j--;
    const back = j > 0 ? path[j - 1] : null;
    if (back && Math.hypot(fx - back[0], fy - back[1]) < .4) { pjUndo(); if (!PJ.st) PJ.st = E.start(PJ.p, PJ.p.start[0]); continue; }
    const dx = fx - last[0], dy = fy - last[1];
    const tryAxis = ax => { const v = ax === 'x' ? dx : dy; if (Math.abs(v) < .55) return false; const s = Math.sign(v); return pjMove(ax === 'x' ? [s, 0] : [0, s]); };
    const first = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    if (PJ.state === 'win') return;
    if (tryAxis(first) || tryAxis(first === 'x' ? 'y' : 'x')) continue;
    break;
  }
}
function bindPJ(svg) {
  svg.addEventListener('pointerdown', e => {
    if (!PJ || PJ.state === 'win' || PJ.solOn || PJ.p.twin) return;
    const [fx, fy] = svgPt(svg, e), p = PJ.p, path = pjPath();
    const last = path[path.length - 1];
    const st = (p.start || []).slice(0, 1).find(([x, y]) => Math.hypot(fx - x, fy - y) < .4);
    if (last && Math.hypot(fx - last[0], fy - last[1]) < .4 && PJ.state !== 'fail') { /* keep drawing from the end */ }
    else if (st) { PJ.st = PanelEngine.start(p, st); SFX.click(); }
    else return;
    PJ.state = 'draw'; PJ.bad = []; PJ.drawing = true; svg.setPointerCapture(e.pointerId); drawPJ();
  });
  svg.addEventListener('pointermove', e => {
    if (!PJ || !PJ.drawing) return; const [fx, fy] = svgPt(svg, e);
    pjFollow(fx, fy); drawPJ();
  });
  const up = () => {
    if (!PJ || !PJ.drawing) return; PJ.drawing = false;
    if (PJ.state === 'win') return;
    const st = PJ.st; if (st && PanelEngine.canStop(PJ.p, st, PanelEngine.ctx(PJ.p))) pjSubmit(); else drawPJ();
  };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
}
const KEYDIR = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
function pjKey(e) {
  if (!PJ || !WINS.projector) return;
  if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (PJ.solOn) {
    if (k === 'ArrowRight' || k === 'd') { e.preventDefault(); solStep(1); } else if (k === 'ArrowLeft' || k === 'a') { e.preventDefault(); solStep(-1); }
    else if (k === ' ') { e.preventDefault(); solPlay(); } else if (k === 'Escape') solMode(false);
    return;
  }
  if (PJ.state === 'win') return;
  const D = KEYDIR[k];
  if (D) { e.preventDefault(); pjMove(D); drawPJ(); }
  else if (k === 'z' || k === 'Backspace') { e.preventDefault(); pjUndo(); drawPJ(); }
  else if (k === 'r' || k === 'Escape') { e.preventDefault(); pjReset(); }
  else if (k === 'Enter') {
    if (PJ.p.twin) return;
    if (PJ.st && PanelEngine.canStop(PJ.p, PJ.st, PanelEngine.ctx(PJ.p))) { e.preventDefault(); pjSubmit(); }
  }
}
// tracing paper: the next few moves of the answer show through
function useHint() {
  if (!PJ || PJ.hintUsed) return;
  const E = PanelEngine, p = PJ.p;
  PJ.hintUsed = true; SFX.item();
  if (p.twin) {
    const have = PJ.ts.inputs, sol = p.solIn; let k = 0;
    while (k < have.length && k < sol.length && have[k] === sol[k]) k++;
    const arrows = { R: '→', L: '←', U: '↑', D: '↓' };
    $('#pj-msg').textContent = k < have.length ? `The tracing paper says: undo ${have.length - k} move(s), then ${[...sol.slice(k, k + 3)].map(c => arrows[c]).join(' ')}` : `The tracing paper says: ${[...sol.slice(k, k + 3)].map(c => arrows[c]).join(' ')}`;
    drawPJ(); return;
  }
  const sol = p.sol, path = pjPath(); let k = 0;
  while (k < path.length && k < sol.length && sol[k][0] === path[k][0] && sol[k][1] === path[k][1]) k++;
  const from = Math.max(0, k - 1), J = E.jumps(p, sol);
  PJ.hint = { path: sol.slice(from, from + 5), jump: J.slice(from, from + 5).map((j, i) => i ? j : false) };
  $('#pj-msg').textContent = k < path.length ? 'The tracing paper shows where your line went wrong.' : 'The next strokes show through the tracing paper.';
  drawPJ();
}
