/* =========================================================
   TITLE SCREEN + TEST CHAMBER
   The chamber is a sandbox for the new line panels: pick a girl,
   pick a panel, play it (with the magnifier → projector intro).
   Nothing here touches the story save.
   ========================================================= */
const PANELS = __PANELS__;
const CH_KEY = 'cyfh_chamber';
const CH = (() => { try { return JSON.parse(localStorage.getItem(CH_KEY)) || {}; } catch (e) { return {}; } })();
CH.done = CH.done || {}; CH.opt = Object.assign({ intro: true, debug: false, view3d: true, retro: true, mem: { tracing_paper: false, queen_piece: false } }, CH.opt || {});
const chSave = () => { try { localStorage.setItem(CH_KEY, JSON.stringify(CH)); } catch (e) { } };
const CH_GIRLS = [
  { g: 'prim', name: 'Prim', tag: 'Jirai Kei', rules: 'pencil · two inks · the other hand' },
  { g: 'trix', name: 'Trix', tag: 'E-Girl', rules: 'edge counts · holes · goals anywhere · one-way · every point' },
  { g: 'paige', name: 'Paige', tag: 'Goth', rules: 'portals · overpasses · broken maps' },
  { g: 'vel', name: 'Vel', tag: 'Gyaru', rules: 'boxes · dash tiles · dash boxes · move budgets' },
  { g: 'myne', name: 'Myne', tag: 'Tomboy', rules: 'twin boxes · no locking · rope boxes' },
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
        return `<button class="chm-card bevel${d ? ' done' : ''}" data-p="${p.id}"><span class="no">${p.n}</span>${miniBoard(p)}<small>${d ? `✓ ${fmtT(d.t)}<br>${d.tries} ${d.tries === 1 ? 'try' : 'tries'}${d.peek ? '<br><i>saw solution</i>' : ''}` : 'not solved<br>&nbsp;'}</small></button>`;
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
function miniBoard(p) { return `<svg class="mini g-${p.girl}" viewBox="${vb(p, .6)}" aria-hidden="true">${boardSVG(p, { mini: true })}</svg>`; }

/* ---------------- magnifier → projector ---------------- */
async function startPanel(id) {
  const p = PANELS.find(x => x.id === id); if (!p) return;
  ['projector', 'feedcam', 'magnifier'].forEach(closeWin);
  if (CH.opt.intro) await magnifierIntro(p);
  openProjector(p);
}
function magnifierIntro(p) {
  return new Promise(res => {
    const g = p.girl, A = ART[g] || null;
    openWin('feedcam', { title: `Live feed · ${GIRLS[g].id}`, icon: 'feed', w: 260, h: 330, x: 30, y: 30, render: b => {
      b.innerHTML = `<div class="cam"><div class="cam-room">${A ? `<img src="${A.body}" alt="${GIRLS[g].name} on the chair">` : `<div class="cam-sil" aria-label="${GIRLS[g].name} on the chair"></div>`}<div class="lens" id="lens"></div></div><div class="cam-cap">● REC · room 0</div></div>`;
    } });
    openWin('magnifier', { title: 'Magnifier.exe', icon: 'img', w: 280, h: 330, x: 310, y: 40, render: b => {
      b.innerHTML = `<div class="mag"><div class="mag-view" id="magv">${PORTRAIT[g] ? `<img src="${portraitURL(g, 'neutral')}" alt="">` : '<div class="mag-sil"></div>'}<div class="mag-tissue g-${g}"></div><div class="mag-scan"></div></div>
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
  PJ = { p, st: null, bs: p.boxes ? PanelEngine.boxStart(p) : null, bsHist: [], drawing: false, solOn: false, solK: 0, peeked: false, t0: performance.now(), tries: 0, hint: null, hintUsed: false, eraseUsed: false, state: 'idle', bad: [], erased: null, view: null };
  const nL = panelsOf(p.girl).filter(x => x.layer === p.layer).length;
  openWin('projector', { title: `PROJECT3D.EXE · ${GIRLS[p.girl].name}`, icon: 'brain', w: 600, h: 720, x: CH.opt.intro ? 320 : 120, y: 6,
    onClose: () => { if (PJ) { clearInterval(PJ.solTimer); clearInterval(PJ.fpsTimer); if (PJ.view) PJ.view.dispose(); } PJ = null; document.removeEventListener('keydown', pjKey); },
    render: b => {
      b.innerHTML = `<div class="pj pj3 g-${p.girl}">
        <div class="pj-menu" role="menubar">
          <div class="mn"><button class="mn-b">File</button><div class="mn-d">
            <button data-m="undo"><span>Undo move</span><kbd>Z</kbd></button><button data-m="reset"><span>Reset panel</span><kbd>R</kbd></button><hr>
            <button data-m="back"><span>Back to panels</span><kbd></kbd></button></div></div>
          <div class="mn"><button class="mn-b">View</button><div class="mn-d">
            <button data-m="3d"><span>${CH.opt.view3d ? '☑' : '☐'} 3D projection</span><kbd></kbd></button>
            <button data-m="retro"><span>${CH.opt.retro ? '☑' : '☐'} Chunky pixels (98 mode)</span><kbd></kbd></button></div></div>
          <div class="mn"><button class="mn-b">Help</button><div class="mn-d"><div class="mn-help">
            <b>W A S D</b> or arrows: move (W goes away from you)<br><b>Z</b> undo · <b>R</b> reset${p.boxes ? '' : ' · <b>Enter</b> finish · or drag the little box'}<br>${p.boxes ? 'Every key moves every box. Fill all goals at the same time.' : 'Walk the box out through the glowing gate.'}</div></div></div>
          <span class="pj-id">${p.id}</span>
        </div>
        <div class="pj-belief" id="pj-belief"><span>${esc(p.belief || '')}</span></div>
        <div class="pj-stage pj-vp" id="pj-vp"></div>
        <div class="pj-msg" id="pj-msg" aria-live="polite"></div>
        <div class="pj-solbox sunk" id="pj-solbox" hidden>
          <div class="sb-why"><b>Ý chính</b> ${esc(p.why || 'Chưa có giải thích cho bảng này.')}${p.solutions !== 1 ? ` <i>(Bảng có ${p.solutions} lời giải${p.boxes ? ' ngắn nhất' : ''}; đây là một.)</i>` : ''}</div>
          <div class="sb-ctrl"><button class="btn" id="sb-first" aria-label="Back to start">⏮</button><button class="btn" id="sb-prev" aria-label="Step back">◀</button><button class="btn primary" id="sb-play">▶ Play</button><button class="btn" id="sb-next" aria-label="Step forward">▶</button><span id="sb-k"></span></div>
          <ol class="sb-log" id="sb-log"></ol>
        </div>
        <div class="pj-bar">
          <button class="btn" id="pj-back">◂ Panels</button>
          <button class="btn" id="pj-reset">Reset</button>
          ${CH.opt.mem.tracing_paper ? `<button class="btn" id="pj-hint" title="${esc(CH_MEM.tracing_paper.desc)}">${icon('thread')} trace</button>` : ''}
          ${CH.opt.mem.queen_piece ? `<span class="pj-tok" id="pj-erase" title="${esc(CH_MEM.queen_piece.desc)}">${icon('queen')} ready</span>` : ''}
          <span class="sp"></span>
          <button class="btn" id="pj-sol" aria-pressed="false">Solution</button>
          <button class="btn primary" id="pj-next" hidden>Next ▸</button>
        </div>
        <div class="pj-status"><span id="pj-st1">Ready</span><span>Layer ${p.layer} · ${REGION[p.layer]} · ${p.n}/${nL}</span><span id="pj-moves"></span><span id="pj-fps"></span></div>
        ${CH.opt.debug ? `<div class="pj-debug">solutions: ${p.solutions} · fewest moves ${p.minMoves || '?'}${p.boxes ? ` · random-play wins ${p.luck}% · answer ${p.solIn}` : ''}</div>` : ''}
      </div>`;
      $('#pj-back', b).onclick = () => { closeWin('projector'); ['feedcam', 'magnifier'].forEach(closeWin); focusWin('chamber'); };
      $('#pj-reset', b).onclick = pjReset;
      const h = $('#pj-hint', b); if (h) h.onclick = useHint;
      $('#pj-sol', b).onclick = () => solMode(!PJ.solOn);
      $('#sb-first', b).onclick = () => solStep(0, true);
      $('#sb-prev', b).onclick = () => solStep(-1);
      $('#sb-next', b).onclick = () => solStep(1);
      $('#sb-play', b).onclick = solPlay;
      $('#pj-next', b).onclick = () => { const L = panelsOf(p.girl).sort((a, c) => a.layer - c.layer || a.n - c.n), i = L.findIndex(x => x.id === p.id); if (L[i + 1]) startPanel(L[i + 1].id); else $('#pj-back', b).click(); };
      $$('[data-m]', b).forEach(el => el.onclick = () => {
        const m = el.dataset.m; el.blur(); SFX.click();
        if (m === 'undo') { pjUndo(); drawPJ(); } else if (m === 'reset') pjReset(); else if (m === 'back') $('#pj-back', b).click();
        else if (m === '3d' || m === 'retro') {
          if (m === '3d') CH.opt.view3d = !CH.opt.view3d; else CH.opt.retro = !CH.opt.retro; chSave();
          $('[data-m="3d"] span', b).textContent = `${CH.opt.view3d ? '☑' : '☐'} 3D projection`; $('[data-m=retro] span', b).textContent = `${CH.opt.retro ? '☑' : '☐'} Chunky pixels (98 mode)`;
          if (m === 'retro' && PJ.view) PJ.view.setRetro(CH.opt.retro); else mountStage();
        }
      });
      document.addEventListener('keydown', pjKey);
      mountStage();
      PJ.fpsTimer = setInterval(() => { const f = $('#pj-fps'); if (f && PJ) f.textContent = PJ.view ? (PJ.view.fps() ? `WebGL · ${PJ.view.fps()} fps` : 'WebGL') : '2D view'; }, 1000);
    } });
}
// the projection: 3D when possible, otherwise the flat board
function mountStage() {
  const vp = $('#pj-vp'); if (!vp || !PJ) return;
  if (PJ.view) { PJ.view.dispose(); PJ.view = null; }
  vp.innerHTML = ''; vp.classList.toggle('flat', true);
  if (CH.opt.view3d && P3.has()) {
    try { PJ.view = P3.create(vp, PJ.p); PJ.view.setRetro(!!CH.opt.retro); bindPJ(PJ.view.canvas, PJ.view.toBoard); vp.classList.remove('flat'); vp.insertAdjacentHTML('beforeend', `<div class="pj3-hud">◉ DIVE·PROJ 3D <i>${PJ.p.boxes ? 'BOX' : 'LINE'} MODE</i></div>`); }
    catch (e) { console.warn('3D projection failed, using the flat board', e); if (PJ.view) PJ.view.dispose(); PJ.view = null; vp.innerHTML = ''; }
  }
  if (!PJ.view) { vp.innerHTML = `<svg id="pj-svg" viewBox="${vb(PJ.p)}" role="img" aria-label="Puzzle board. Move with WASD or the arrow keys."></svg>`; bindPJ($('#pj-svg')); }
  const f = $('#pj-fps'); if (f) f.textContent = PJ.view ? 'WebGL' : '2D view';
  drawPJ();
}
async function pjSubmit() {
  const p = PJ.p, r = p.boxes ? { ok: PanelEngine.boxWon(p, PJ.bs), bad: [{ kind: 'path' }] } : PanelEngine.validate(p, pjPath()); PJ.tries++;
  let ok = r.ok;
  if (!ok && CH.opt.mem.queen_piece && !PJ.eraseUsed && r.bad.length === 1 && r.bad[0].kind !== 'path' && r.bad[0].kind !== 'moves') {
    ok = true; PJ.eraseUsed = true; PJ.erased = r.bad[0].kind + ':' + r.bad[0].i;
    $('#pj-msg').textContent = 'The queen took one rule off the board.';
  }
  if (ok) {
    PJ.state = 'win'; PJ.hint = null; drawPJ(); SFX.win(); if (PJ.view) pj3Flash('◆ BELIEF ERASED ◆', 'win');
    const t = performance.now() - PJ.t0, prev = CH.done[p.id];
    CH.done[p.id] = { t: prev ? Math.min(prev.t, t) : t, tries: prev ? Math.min(prev.tries, PJ.tries) : PJ.tries, peek: prev ? prev.peek && PJ.peeked : PJ.peeked }; chSave();
    $('#pj-belief').classList.add('struck');
    if (!PJ.erased) $('#pj-msg').textContent = `${fmtT(t)} · ${PJ.tries} ${PJ.tries === 1 ? 'try' : 'tries'}`;
    $('#pj-next').hidden = false; $('#pj-next').focus();
    UPD.forEach(f => f());
  } else {
    PJ.state = 'fail'; PJ.bad = r.bad; drawPJ(); SFX.buzz(); if (PJ.view) pj3Flash('RULE VIOLATION', 'fail');
    $('#pj-msg').textContent = '';
    setTimeout(() => { if (PJ && PJ.state === 'fail') { PJ.state = 'idle'; drawPJ(); } }, 1400);
  }
}
