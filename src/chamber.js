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
  { g: 'prim', name: 'Prim', tag: 'Jirai Kei', rules: 'pencil · two inks · the other hand · her own shapes' },
  { g: 'trix', name: 'Trix', tag: 'E-Girl', rules: 'every point · counting · chess · proof order' },
  { g: 'paige', name: 'Paige', tag: 'Goth', rules: 'heart pairs · face-down cards · the lens' },
  { g: 'vel', name: 'Vel', tag: 'Gyaru', rules: 'portals · mood swings · minefield' },
  { g: 'myne', name: 'Myne', tag: 'Tomboy', rules: 'looping edges · restless · no edges at all' },
];
const REGION = { 1: 'memory', 2: 'feeling', 3: 'self' };
const hasLens = p => ['hearts', 'dots', 'nums', 'pieces'].some(f => (p[f] || []).some(e => { const o = e[e.length - 1]; return o && typeof o === 'object' && !Array.isArray(o) && o.lens; }));
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
  PJ = { p, path: [], drawing: false, solOn: false, solK: 0, peeked: false, t0: performance.now(), tries: 0, hint: null, hintUsed: false, eraseUsed: false, state: 'idle', bad: [], erased: null };
  openWin('projector', { title: `Projector.exe · ${GIRLS[p.girl].name}`, icon: 'brain', w: 580, h: 660, x: CH.opt.intro ? 330 : 120, y: 10,
    onClose: () => { if (PJ) clearInterval(PJ.solTimer); PJ = null; document.removeEventListener('keydown', pjKey); },
    render: b => {
      b.innerHTML = `<div class="pj g-${p.girl}">
        <div class="pj-top"><span>Layer ${p.layer} · ${REGION[p.layer]} · ${p.n}/${panelsOf(p.girl).filter(x => x.layer === p.layer).length}</span><span class="pj-id">${p.id}</span></div>
        <div class="pj-belief" id="pj-belief"><span>${esc(p.belief || '')}</span></div>
        <div class="pj-stage"><svg id="pj-svg" viewBox="${vb(p)}" role="img" aria-label="Puzzle board. Draw a line from the start circle to the exit."></svg></div>
        <div class="pj-msg" id="pj-msg" aria-live="polite"></div>
        <div class="pj-solbox sunk" id="pj-solbox" hidden>
          <div class="sb-why"><b>Ý chính</b> ${esc(p.why || 'Chưa có giải thích cho bảng này.')}${p.solutions !== 1 ? ` <i>(Bảng có ${p.solutions} lời giải; đây là một.)</i>` : ''}</div>
          <div class="sb-ctrl"><button class="btn" id="sb-first" aria-label="Back to start">⏮</button><button class="btn" id="sb-prev" aria-label="Step back">◀</button><button class="btn primary" id="sb-play">▶ Play</button><button class="btn" id="sb-next" aria-label="Step forward">▶</button><span id="sb-k"></span></div>
          <ol class="sb-log" id="sb-log"></ol>
        </div>
        <div class="pj-bar">
          <button class="btn" id="pj-back">◂ Panels</button>
          <button class="btn" id="pj-reset">Reset</button>
          ${CH.opt.mem.tracing_paper ? `<button class="btn" id="pj-hint" title="${esc(CH_MEM.tracing_paper.desc)}">${icon('thread')} trace</button>` : ''}
          ${CH.opt.mem.queen_piece ? `<span class="pj-tok" id="pj-erase" title="${esc(CH_MEM.queen_piece.desc)}">${icon('queen')} ready</span>` : ''}
          ${hasLens(p) ? `<button class="btn" id="pj-lens" aria-pressed="false" title="Some symbols only show through the magnifier">${icon('img')} Lens</button>` : ''}
          <span class="sp"></span>
          <button class="btn" id="pj-sol" aria-pressed="false">Solution</button>
          <button class="btn primary" id="pj-next" hidden>Next ▸</button>
        </div>
        ${CH.opt.debug ? `<div class="pj-debug">solutions: ${p.solutions} · ${esc(p.note || '')}</div>` : ''}
      </div>`;
      $('#pj-back', b).onclick = () => { closeWin('projector'); ['feedcam', 'magnifier'].forEach(closeWin); focusWin('chamber'); };
      $('#pj-reset', b).onclick = () => { PJ.path = []; PJ.state = 'idle'; PJ.bad = []; drawPJ(); };
      const h = $('#pj-hint', b); if (h) h.onclick = useHint;
      $('#pj-sol', b).onclick = () => solMode(!PJ.solOn);
      $('#sb-first', b).onclick = () => solStep(0, true);
      $('#sb-prev', b).onclick = () => solStep(-1);
      $('#sb-next', b).onclick = () => solStep(1);
      $('#sb-play', b).onclick = solPlay;
      $('#pj-next', b).onclick = () => { const L = panelsOf(p.girl).sort((a, c) => a.layer - c.layer || a.n - c.n), i = L.findIndex(x => x.id === p.id); if (L[i + 1]) startPanel(L[i + 1].id); else $('#pj-back', b).click(); };
      const ln = $('#pj-lens', b); if (ln) ln.onclick = () => { PJ.lensOn = !PJ.lensOn; ln.setAttribute('aria-pressed', String(PJ.lensOn)); ln.classList.toggle('on', PJ.lensOn); PJ.lensAt = PJ.lensAt || [PJ.p.w / 2, PJ.p.h / 2]; drawPJ(); };
      bindPJ($('#pj-svg', b));
      document.addEventListener('keydown', pjKey);
      drawPJ();
    } });
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
    CH.done[p.id] = { t: prev ? Math.min(prev.t, t) : t, tries: prev ? Math.min(prev.tries, PJ.tries) : PJ.tries, peek: prev ? prev.peek && PJ.peeked : PJ.peeked }; chSave();
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
