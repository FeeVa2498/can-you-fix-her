/* =========================================================
   TITLE SCREEN + TEST CHAMBER
   The chamber is a sandbox for the new line panels: pick a girl,
   pick a panel, play it (with the magnifier → projector intro).
   Nothing here touches the story save.
   ========================================================= */
const PANELS = __PANELS__;
const CH_KEY = 'cyfh_chamber';
const CH = (() => { try { return JSON.parse(localStorage.getItem(CH_KEY)) || {}; } catch (e) { return {}; } })();
CH.done = CH.done || {}; CH.opt = Object.assign({ intro: true, debug: false, mem: { tracing_paper: false, queen_piece: false } }, CH.opt || {});
const chSave = () => { try { localStorage.setItem(CH_KEY, JSON.stringify(CH)); } catch (e) { } };
const CH_GIRLS = [
  { g: 'prim', name: 'Prim', tag: 'Jirai Kei', rules: 'pencil sketch · two inks' },
  { g: 'trix', name: 'Trix', tag: 'E-Girl', rules: 'every point · counting' },
  { g: 'paige', name: 'Paige', tag: 'Goth' }, { g: 'vel', name: 'Vel', tag: 'Gyaru' }, { g: 'myne', name: 'Myne', tag: 'Tomboy' },
];
const REGION = { 1: 'memory', 2: 'feeling', 3: 'self' };
const CH_MEM = {
  tracing_paper: { name: 'tracing_paper.mem', ic: 'thread', desc: 'Once per panel: lay it over the board and the next few strokes of the answer show through.' },
  queen_piece: { name: 'queen_piece.mem', ic: 'queen', desc: 'Once per panel: one broken rule is forgiven (like an eraser).' },
};

/* ---------------- title ---------------- */
function titleScreen(hasSave) {
  return new Promise(res => {
    const el = document.createElement('div'); el.id = 'title';
    el.innerHTML = `<div class="tt-box"><div class="logo">Can You<br>Fix Her</div><div class="sub">DIVE OS v2.4 ♡</div>
      <div class="tt-menu">
        <button class="btn primary" data-go="continue" ${hasSave ? '' : 'disabled'}>Continue</button>
        <button class="btn" data-go="new">New game</button>
        <button class="btn" data-go="chamber">Test chamber</button>
      </div><div class="tt-note" id="tt-note"></div></div>`;
    document.body.appendChild(el);
    const done = v => { el.classList.add('out'); setTimeout(() => { el.remove(); res(v); }, REDUCED ? 0 : 300); };
    $$('[data-go]', el).forEach(b => b.onclick = () => {
      auInit(); SFX.click();
      const v = b.dataset.go;
      if (v === 'new' && hasSave && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'New game (erase save?)'; $('#tt-note', el).textContent = 'Your current game will be erased. Click again to confirm.'; return; }
      done(v);
    });
    const first = $('[data-go]:not(:disabled)', el); if (first) first.focus();
  });
}

/* ---------------- chamber: lists ---------------- */
let chGirl = 'prim';
function openChamber() {
  S = fresh(); S.player = { name: 'tester', avatar: '' }; S.flags.chamber = true; S.phase = 'day';
  $$('.dicon').forEach(d => d.hidden = true);   // a bare desktop: nothing from the story here
  openWin('chamber', { title: 'Test chamber', icon: 'puzzle', w: 640, h: 500, x: 30, y: 20, render: (b, rec) => { addUpd(rec, () => renderChamber(b)); renderChamber(b); } });
}
function panelsOf(g) { return PANELS.filter(p => p.girl === g); }
function fmtT(ms) { const s = Math.round(ms / 1000); return `${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`; }
function renderChamber(b) {
  const list = panelsOf(chGirl), G = CH_GIRLS.find(x => x.g === chGirl);
  const layers = [...new Set(list.map(p => p.layer))];
  b.innerHTML = `<div class="chm">
    <div class="chm-girls sunk">${CH_GIRLS.map(x => {
      const n = panelsOf(x.g).length, d = panelsOf(x.g).filter(p => CH.done[p.id]).length;
      return `<button class="chm-girl${x.g === chGirl ? ' sel' : ''}" data-g="${x.g}" ${n ? '' : 'disabled'}>${ART[x.g] ? `<img class="av" src="${ART[x.g].face}" alt="">` : '<div class="av q">?</div>'}<span><b>${x.name}</b><small>${n ? `${d}/${n} solved` : 'no panels yet'}</small></span></button>`;
    }).join('')}</div>
    <div class="chm-main">
      <div class="chm-head"><b>${G.name}</b> <span>${esc(G.tag)}${G.rules ? ' · ' + esc(G.rules) : ''}</span></div>
      ${layers.map(L => `<div class="chm-layer"><h4>Layer ${L} · ${REGION[L]}</h4><div class="chm-cards">${list.filter(p => p.layer === L).sort((a, c) => a.n - c.n).map(p => {
        const d = CH.done[p.id];
        return `<button class="chm-card bevel${d ? ' done' : ''}" data-p="${p.id}"><span class="no">${p.n}</span>${miniBoard(p)}<small>${d ? `✓ ${fmtT(d.t)}<br>${d.tries} ${d.tries === 1 ? 'try' : 'tries'}` : 'not solved<br>&nbsp;'}</small></button>`;
      }).join('')}</div></div>`).join('')}
      <div class="chm-opts sunk">
        <label><input type="checkbox" id="co-intro" ${CH.opt.intro ? 'checked' : ''}> Magnifier → projector intro</label>
        <label><input type="checkbox" id="co-debug" ${CH.opt.debug ? 'checked' : ''}> Designer info (solution count, notes, show answer)</label>
        <div class="chm-mem">${Object.entries(CH_MEM).map(([k, m]) => `<label title="${esc(m.desc)}"><input type="checkbox" data-mem="${k}" ${CH.opt.mem[k] ? 'checked' : ''}> ${icon(m.ic)} ${m.name}</label>`).join('')}</div>
        <div class="chm-btns"><button class="btn" id="co-reset">Clear progress</button><button class="btn" id="co-title">Back to title</button></div>
      </div>
    </div></div>`;
  $$('[data-g]', b).forEach(x => x.onclick = () => { SFX.click(); chGirl = x.dataset.g; renderChamber(b); });
  $$('[data-p]', b).forEach(x => x.onclick = () => { SFX.click(); startPanel(x.dataset.p); });
  $('#co-intro', b).onchange = e => { CH.opt.intro = e.target.checked; chSave(); };
  $('#co-debug', b).onchange = e => { CH.opt.debug = e.target.checked; chSave(); };
  $$('[data-mem]', b).forEach(x => x.onchange = () => { CH.opt.mem[x.dataset.mem] = x.checked; chSave(); });
  $('#co-reset', b).onclick = () => { CH.done = {}; chSave(); renderChamber(b); };
  $('#co-title', b).onclick = () => location.reload();
}
// tiny preview of a panel (structure only, no answer)
function miniBoard(p) { return `<svg class="mini" viewBox="${-0.6} ${-0.6} ${p.w + 1.2} ${p.h + 1.2}" aria-hidden="true">${boardSVG(p, { mini: true })}</svg>`; }

/* ---------------- magnifier → projector ---------------- */
async function startPanel(id) {
  const p = PANELS.find(x => x.id === id); if (!p) return;
  ['projector', 'feedcam', 'magnifier'].forEach(closeWin);
  if (CH.opt.intro) await magnifierIntro(p);
  openProjector(p);
}
function magnifierIntro(p) {
  return new Promise(res => {
    const g = p.girl, A = ART[g];
    openWin('feedcam', { title: `Live feed · ${GIRLS[g].id}`, icon: 'feed', w: 260, h: 330, x: 30, y: 30, render: b => {
      b.innerHTML = `<div class="cam"><div class="cam-room"><img src="${A.body}" alt="${GIRLS[g].name} on the chair"><div class="lens" id="lens"></div></div><div class="cam-cap">● REC · room 0</div></div>`;
    } });
    openWin('magnifier', { title: 'Magnifier.exe', icon: 'img', w: 280, h: 330, x: 310, y: 40, render: b => {
      b.innerHTML = `<div class="mag"><div class="mag-view" id="magv"><img src="${portraitURL(g, 'neutral')}" alt=""><div class="mag-tissue g-${g}"></div><div class="mag-scan"></div></div>
        <div class="mag-info">region: <b>${REGION[p.layer]}</b> · layer ${p.layer}<br>focus <span id="magf">0</span>%</div>
        <div class="mag-btns"><button class="btn" id="mag-skip">Skip</button><button class="btn primary" id="mag-go" disabled>Project ▸</button></div></div>`;
    } });
    const lens = $('#lens'), f = $('#magf'), go = $('#mag-go'), v = $('#magv');
    requestAnimationFrame(() => lens.classList.add('on'));
    let k = 0; const iv = setInterval(() => { k = Math.min(100, k + 4); f.textContent = k; v.style.setProperty('--z', 1 + k / 60); v.style.setProperty('--t', k / 100); if (k >= 100) { clearInterval(iv); go.disabled = false; go.focus(); SFX.chime(); } }, REDUCED ? 5 : 45);
    const finish = async beam => {
      clearInterval(iv);
      if (beam && !REDUCED) {
        SFX.link();
        const r = WINS.magnifier.el.getBoundingClientRect(), d = $('#desktop').getBoundingClientRect();
        const bm = document.createElement('div'); bm.className = 'beam';
        Object.assign(bm.style, { left: (r.right - d.left - 10) + 'px', top: (r.top - d.top + r.height * .35) + 'px' });
        $('#desktop').appendChild(bm); await wait(520); bm.remove();
      }
      res();
    };
    $('#mag-go').onclick = () => finish(true);
    $('#mag-skip').onclick = () => finish(false);
  });
}

/* ---------------- projector: the panel ---------------- */
let PJ = null;
function openProjector(p) {
  PJ = { p, path: [], drawing: false, t0: performance.now(), tries: 0, hint: null, hintUsed: false, eraseUsed: false, state: 'idle', bad: [], erased: null };
  openWin('projector', { title: `Projector.exe · ${GIRLS[p.girl].name}`, icon: 'brain', w: 560, h: 600, x: CH.opt.intro ? 330 : 120, y: 10,
    onClose: () => { PJ = null; document.removeEventListener('keydown', pjKey); },
    render: b => {
      b.innerHTML = `<div class="pj g-${p.girl}">
        <div class="pj-top"><span>Layer ${p.layer} · ${REGION[p.layer]} · ${p.n}/${panelsOf(p.girl).filter(x => x.layer === p.layer).length}</span><span class="pj-id">${p.id}</span></div>
        <div class="pj-belief" id="pj-belief"><span>${esc(p.belief || '')}</span></div>
        <div class="pj-stage"><svg id="pj-svg" viewBox="${-0.75} ${-0.75} ${p.w + 1.5} ${p.h + 1.5}" role="img" aria-label="Puzzle board. Draw a line from the start circle to the exit."></svg></div>
        <div class="pj-msg" id="pj-msg" aria-live="polite"></div>
        <div class="pj-bar">
          <button class="btn" id="pj-back">◂ Panels</button>
          <button class="btn" id="pj-reset">Reset</button>
          ${CH.opt.mem.tracing_paper ? `<button class="btn" id="pj-hint" title="${esc(CH_MEM.tracing_paper.desc)}">${icon('thread')} trace</button>` : ''}
          ${CH.opt.mem.queen_piece ? `<span class="pj-tok" id="pj-erase" title="${esc(CH_MEM.queen_piece.desc)}">${icon('queen')} ready</span>` : ''}
          <span class="sp"></span>
          ${CH.opt.debug ? `<button class="btn" id="pj-sol">Show answer</button>` : ''}
          <button class="btn primary" id="pj-next" hidden>Next ▸</button>
        </div>
        ${CH.opt.debug ? `<div class="pj-debug">solutions: ${p.solutions} · ${esc(p.note || '')}</div>` : ''}
      </div>`;
      $('#pj-back', b).onclick = () => { closeWin('projector'); ['feedcam', 'magnifier'].forEach(closeWin); focusWin('chamber'); };
      $('#pj-reset', b).onclick = () => { PJ.path = []; PJ.state = 'idle'; PJ.bad = []; drawPJ(); };
      const h = $('#pj-hint', b); if (h) h.onclick = useHint;
      const s = $('#pj-sol', b); if (s) s.onclick = () => { PJ.showSol = !PJ.showSol; drawPJ(); };
      $('#pj-next', b).onclick = () => { const L = panelsOf(p.girl).sort((a, c) => a.layer - c.layer || a.n - c.n), i = L.findIndex(x => x.id === p.id); if (L[i + 1]) startPanel(L[i + 1].id); else $('#pj-back', b).click(); };
      bindPJ($('#pj-svg', b));
      document.addEventListener('keydown', pjKey);
      drawPJ();
    } });
}
const COLS = { pink: '#ff6fb5', ink: '#0d0714' };
function boardSVG(p, o = {}) {
  const E = PanelEngine, br = E.brokenSet(p), sk = new Set((p.sketch || []).map(e => E.ekey(...e)));
  const out = [];
  out.push(`<rect class="pb-bg" x="-0.5" y="-0.5" width="${p.w + 1}" height="${p.h + 1}" rx="0.35"/>`);
  // tracks
  for (let y = 0; y <= p.h; y++) for (let x = 0; x <= p.w; x++) {
    for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
      if (nx > p.w || ny > p.h) continue;
      const k = E.ekey(x, y, nx, ny);
      if (br.has(k)) { // broken: two stubs with a gap
        const mx = (x + nx) / 2, my = (y + ny) / 2, dx = (nx - x) * .32, dy = (ny - y) * .32;
        out.push(`<line class="pb-trk" x1="${x}" y1="${y}" x2="${mx - dx * .5}" y2="${my - dy * .5}"/><line class="pb-trk" x1="${mx + dx * .5}" y1="${my + dy * .5}" x2="${nx}" y2="${ny}"/>`);
      } else out.push(`<line class="pb-trk" x1="${x}" y1="${y}" x2="${nx}" y2="${ny}"/>`);
      if (sk.has(k)) { const i = p.sketch.findIndex(e => E.ekey(...e) === k); out.push(`<line class="pb-sketch${o.bad && o.bad.sketch.has(i) ? ' bad' : ''}" x1="${x}" y1="${y}" x2="${nx}" y2="${ny}"/>`); }
    }
  }
  // exits
  (p.exit || []).forEach(([x, y]) => { const [dx, dy] = E.exitDir(p, x, y); out.push(`<line class="pb-trk" x1="${x}" y1="${y}" x2="${x + dx * .38}" y2="${y + dy * .38}"/>`); });
  // cell symbols
  (p.squares || []).forEach(([x, y, c], i) => out.push(`<rect class="pb-sq${o.bad && o.bad.squares.has(i) ? ' bad' : ''}${o.erased === 'squares:' + i ? ' gone' : ''}" x="${x + .3}" y="${y + .3}" width=".4" height=".4" rx=".09" fill="${COLS[c]}"/>`));
  (p.nums || []).forEach(([x, y, n], i) => out.push(`<text class="pb-num${o.bad && o.bad.nums.has(i) ? ' bad' : ''}${o.erased === 'nums:' + i ? ' gone' : ''}" x="${x + .5}" y="${y + .5}">${n}</text>`));
  // visit-all: every node is a small ring waiting to be filled
  if (p.visitAll) for (let y = 0; y <= p.h; y++) for (let x = 0; x <= p.w; x++) out.push(`<circle class="pb-ring${o.seen && o.seen.has(x + ',' + y) ? ' on' : ''}${o.bad && o.bad.visitAll ? ' bad' : ''}" cx="${x}" cy="${y}" r=".09"/>`);
  (p.dots || []).forEach(([x, y], i) => out.push(`<circle class="pb-dot${o.bad && o.bad.dots.has(i) ? ' bad' : ''}" cx="${x}" cy="${y}" r=".1"/>`));
  (p.start || []).forEach(([x, y]) => out.push(`<circle class="pb-start" cx="${x}" cy="${y}" r=".2"/>`));
  return out.join('');
}
function drawPJ() {
  if (!PJ) return; const p = PJ.p, svg = $('#pj-svg'); if (!svg) return;
  const bad = { sketch: new Set(), squares: new Set(), nums: new Set(), dots: new Set(), visitAll: false };
  if (PJ.state === 'fail') PJ.bad.forEach(x => x.kind === 'visitAll' ? bad.visitAll = true : bad[x.kind] && bad[x.kind].add(x.i));
  const seen = new Set(PJ.path.map(n => n.join(',')));
  let h = boardSVG(p, { bad, seen, erased: PJ.erased });
  const line = pts => pts.map(n => n.join(',')).join(' ');
  if (PJ.showSol && p.sol) h += `<polyline class="pb-ghost" points="${line(p.sol)}"/>`;
  if (PJ.hint) h += `<polyline class="pb-hint" points="${line(PJ.hint)}"/>`;
  if (PJ.path.length) {
    const last = PJ.path[PJ.path.length - 1];
    let tail = '';
    if (PanelEngine.isExit(p, ...last) && (PJ.state === 'win' || PJ.atExit)) { const [dx, dy] = PanelEngine.exitDir(p, ...last); tail = ` ${last[0] + dx * .38},${last[1] + dy * .38}`; }
    h += `<polyline class="pb-line ${PJ.state}" points="${line(PJ.path)}${tail}"/><circle class="pb-start on ${PJ.state}" cx="${PJ.path[0][0]}" cy="${PJ.path[0][1]}" r=".2"/>`;
    if (PJ.state !== 'win') h += `<circle class="pb-head ${PJ.state}" cx="${last[0]}" cy="${last[1]}" r=".11"/>`;
  }
  svg.innerHTML = h;
  const tok = $('#pj-erase'); if (tok) tok.innerHTML = `${icon('queen')} ${PJ.eraseUsed ? 'used' : 'ready'}`;
  const hb = $('#pj-hint'); if (hb) hb.disabled = PJ.hintUsed || PJ.state === 'win';
}
// pointer → node coordinates
function svgPt(svg, e) { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = svg.getScreenCTM().inverse(); const r = pt.matrixTransform(m); return [r.x, r.y]; }
function pjCanStep(n) {
  const p = PJ.p, last = PJ.path[PJ.path.length - 1], [x, y] = n;
  if (x < 0 || y < 0 || x > p.w || y > p.h) return false;
  if (PanelEngine.brokenSet(p).has(PanelEngine.ekey(...last, x, y))) return false;
  return !PJ.path.some(q => q[0] === x && q[1] === y);
}
function pjFollow(fx, fy) {
  const p = PJ.p;
  for (let guard = 0; guard < 40; guard++) {
    const last = PJ.path[PJ.path.length - 1], prev = PJ.path[PJ.path.length - 2];
    // back up along the line
    if (prev && Math.hypot(fx - prev[0], fy - prev[1]) < .45) { PJ.path.pop(); SFX.tick(); continue; }
    const dx = fx - last[0], dy = fy - last[1];
    PJ.atExit = PanelEngine.isExit(p, ...last) && (() => { const [ex, ey] = PanelEngine.exitDir(p, ...last); return dx * ex + dy * ey > .2; })();
    const tryAxis = ax => { const d = ax === 'x' ? dx : dy; if (Math.abs(d) < .55) return false; const s = Math.sign(d), n = ax === 'x' ? [last[0] + s, last[1]] : [last[0], last[1] + s]; if (!pjCanStep(n)) return false; PJ.path.push(n); SFX.step(PJ.path.length); return true; };
    const first = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    if (tryAxis(first) || tryAxis(first === 'x' ? 'y' : 'x')) continue;
    break;
  }
}
function bindPJ(svg) {
  svg.addEventListener('pointerdown', e => {
    if (!PJ || PJ.state === 'win') return;
    const [fx, fy] = svgPt(svg, e), p = PJ.p;
    const last = PJ.path[PJ.path.length - 1];
    const st = (p.start || []).find(([x, y]) => Math.hypot(fx - x, fy - y) < .4);
    if (last && Math.hypot(fx - last[0], fy - last[1]) < .4 && PJ.state !== 'fail') { /* keep drawing from the end */ }
    else if (st) { PJ.path = [st.slice()]; SFX.click(); }
    else return;
    PJ.state = 'draw'; PJ.bad = []; PJ.drawing = true; svg.setPointerCapture(e.pointerId); drawPJ();
  });
  svg.addEventListener('pointermove', e => { if (!PJ || !PJ.drawing) return; const [fx, fy] = svgPt(svg, e); pjFollow(fx, fy); drawPJ(); });
  const up = () => { if (!PJ || !PJ.drawing) return; PJ.drawing = false; const last = PJ.path[PJ.path.length - 1]; if (last && PanelEngine.isExit(PJ.p, ...last)) pjSubmit(); else { PJ.state = 'idle'; drawPJ(); } };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
}
function pjKey(e) {
  if (!PJ || !WINS.projector || PJ.state === 'win') return;
  if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const D = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (D) {
    e.preventDefault();
    if (!PJ.path.length || PJ.state === 'fail') { PJ.path = [PJ.p.start[0].slice()]; PJ.bad = []; }
    PJ.state = 'draw';
    const last = PJ.path[PJ.path.length - 1], prev = PJ.path[PJ.path.length - 2], n = [last[0] + D[0], last[1] + D[1]];
    if (prev && prev[0] === n[0] && prev[1] === n[1]) PJ.path.pop(); else if (pjCanStep(n)) { PJ.path.push(n); SFX.step(PJ.path.length); }
    drawPJ();
  } else if (e.key === 'Enter') { const last = PJ.path[PJ.path.length - 1]; if (last && PanelEngine.isExit(PJ.p, ...last)) pjSubmit(); }
  else if (e.key === 'Backspace') { e.preventDefault(); if (PJ.path.length > 1) PJ.path.pop(); drawPJ(); }
  else if (e.key === 'Escape') { PJ.path = []; PJ.state = 'idle'; drawPJ(); }
}
function useHint() {
  if (!PJ || PJ.hintUsed || !PJ.p.sol) return;
  const sol = PJ.p.sol; let k = 0;
  while (k < PJ.path.length && k < sol.length && sol[k][0] === PJ.path[k][0] && sol[k][1] === PJ.path[k][1]) k++;
  const from = Math.max(0, k - 1);
  PJ.hint = sol.slice(from, from + 4); PJ.hintUsed = true; SFX.item();
  $('#pj-msg').textContent = k < PJ.path.length ? 'The tracing paper shows where your line went wrong.' : 'The next strokes show through the tracing paper.';
  drawPJ();
}
async function pjSubmit() {
  const p = PJ.p, r = PanelEngine.validate(p, PJ.path); PJ.tries++;
  let ok = r.ok;
  if (!ok && CH.opt.mem.queen_piece && !PJ.eraseUsed && r.bad.length === 1 && r.bad[0].kind !== 'path') {
    ok = true; PJ.eraseUsed = true; PJ.erased = r.bad[0].kind + ':' + r.bad[0].i;
    $('#pj-msg').textContent = 'The queen took one rule off the board.';
  }
  if (ok) {
    PJ.state = 'win'; PJ.hint = null; drawPJ(); SFX.win();
    const t = performance.now() - PJ.t0, prev = CH.done[p.id];
    CH.done[p.id] = { t: prev ? Math.min(prev.t, t) : t, tries: prev ? Math.min(prev.tries, PJ.tries) : PJ.tries }; chSave();
    $('#pj-belief').classList.add('struck');
    if (!PJ.erased) $('#pj-msg').textContent = `${fmtT(t)} · ${PJ.tries} ${PJ.tries === 1 ? 'try' : 'tries'}`;
    $('#pj-next').hidden = false; $('#pj-next').focus();
    UPD.forEach(f => f());
  } else {
    PJ.state = 'fail'; PJ.bad = r.bad; drawPJ(); SFX.buzz();
    $('#pj-msg').textContent = '';
    setTimeout(() => { if (PJ && PJ.state === 'fail') { PJ.state = 'idle'; drawPJ(); } }, 1400);
  }
}
