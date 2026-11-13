/* =========================================================
   TITLE SCREEN + TEST CHAMBER
   The chamber is a sandbox for the new line panels: pick a girl,
   pick a panel, play it (with the magnifier → projector intro).
   Nothing here touches the story save.
   ========================================================= */
const PANELS_BUILTIN = __PANELS__;
// the Level editor saves the whole list in this browser; the built-in list is the fallback
let PANELS = edLoad() || JSON.parse(JSON.stringify(PANELS_BUILTIN));
const CH_KEY = 'cyfh_chamber';
const CH = (() => { try { return JSON.parse(localStorage.getItem(CH_KEY)) || {}; } catch (e) { return {}; } })();
CH.done = CH.done || {}; CH.opt = Object.assign({ intro: true, debug: false, view3d: true, retro: true, mem: { tracing_paper: false, queen_piece: false } }, CH.opt || {});
const chSave = () => { try { localStorage.setItem(CH_KEY, JSON.stringify(CH)); } catch (e) { } };
const CH_GIRLS = [
  { g: 'prim', name: 'Prim', tag: 'Jirai Kei', rules: 'landmines (exact moves) · walls · portals' },
  { g: 'trix', name: 'Trix', tag: 'E-Girl', rules: 'rope boxes · sensor blocks (touch n sides) · light tiles' },
  { g: 'paige', name: 'Paige', tag: 'Goth', rules: 'dice: print the brief on the white tiles · arrow tiles · portals' },
  { g: 'vel', name: 'Vel', tag: 'Gyaru', rules: 'glass tiles (crack, then break) · light tiles · arrow tiles' },
];
const REGION = { 1: 'memory', 2: 'feeling', 3: 'self' };
// what each tutorial panel teaches (shown as a NEW tag)
const TEACH = { basic: 'roll to the gold tile', sketch: 'trace the pencil', plates: 'switches open gates', avoid: 'black pencil: keep off', mirror: 'the other hand', swap: 'striped gates swap', nums: 'edge count', ends: 'goal anywhere', holes: 'holes in the map', oneway: 'one-way', portals: 'portals', bridges: 'overpass', boxes: 'every key moves the box', pads: 'dash tiles', stops: 'brake tiles', dash: 'rocket box', budget: 'landmine: exact moves', dice: 'dice: print the brief', lightAll: 'light the whole map', touch: 'sensor blocks: touch n sides', many: 'more boxes', twin: 'twin boxes', nolock: 'goals never lock', opp: 'opposite twin', my: 'up/down twin', trail: 'rope box', switches: 'locks & doors', dbl: 'two-colour switch', colors: 'colour goals', paints: 'paint tiles', cracks: 'cracked tiles', fragile: 'glass: cracks, then breaks', lights: 'light tiles', twinrope: 'two ropes, one reversed', goal: 'every key moves every box' };
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
function panelsOf(g) { return PANELS.filter(p => p.girl === g && !p.ray); }
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
      ${layers.map(L => `<div class="chm-layer"><h4>Layer ${L} · ${REGION[L]}</h4><div class="chm-cards">${list.filter(p => p.layer === L).sort((a, c) => a.n - c.n).map((p, idx) => {
        const d = CH.done[p.id];
        return `<button class="chm-card bevel${d ? ' done' : ''}${p.tut ? ' tut' : ''}" data-p="${p.id}" title="${p.tut ? 'Tutorial: ' + esc(TEACH[p.tut] || p.tut) : ''}"><span class="no">${idx + 1}${p.tut ? '<i>NEW</i>' : ''}</span>${miniBoard(p)}<small>${d ? `✓ ${fmtT(d.t)}<br>${d.tries} ${d.tries === 1 ? 'try' : 'tries'}${d.peek ? '<br><i>saw solution</i>' : ''}` : 'not solved<br>&nbsp;'}</small></button>`;
      }).join('')}</div></div>`).join('')}
      <div class="chm-opts sunk">
        <label><input type="checkbox" id="co-intro" ${CH.opt.intro ? 'checked' : ''}> Magnifier → projector intro</label>
        <label><input type="checkbox" id="co-debug" ${CH.opt.debug ? 'checked' : ''}> Designer info (solution count, notes, show answer)</label>
        <label><input type="checkbox" id="co-story" ${CH.opt.story ? 'checked' : ''}> Story flow preview (her message between maps, like the real game)</label>
        <div class="chm-mem">${Object.entries(CH_MEM).map(([k, m]) => `<label title="${esc(m.desc)}"><input type="checkbox" data-mem="${k}" ${CH.opt.mem[k] ? 'checked' : ''}> ${icon(m.ic)} ${m.name}</label>`).join('')}</div>
        <div class="chm-btns"><button class="btn primary" id="co-editor">✎ Level editor</button><button class="btn" id="co-reset">Clear progress</button><button class="btn" id="co-title">Back to title</button></div>
      </div>
    </div></div>`;
  $$('[data-g]', b).forEach(x => x.onclick = () => { SFX.click(); chGirl = x.dataset.g; renderChamber(b); });
  $$('[data-p]', b).forEach(x => x.onclick = () => { SFX.click(); startPanel(x.dataset.p); });
  $('#co-intro', b).onchange = e => { CH.opt.intro = e.target.checked; chSave(); };
  $('#co-debug', b).onchange = e => { CH.opt.debug = e.target.checked; chSave(); };
  $('#co-story', b).onchange = e => { CH.opt.story = e.target.checked; chSave(); };
  $$('[data-mem]', b).forEach(x => x.onchange = () => { CH.opt.mem[x.dataset.mem] = x.checked; chSave(); });
 $('#co-editor', b).onclick = () => { SFX.click(); openEditor(); };
  $$('[data-p]', b).forEach(x => x.oncontextmenu = e => { e.preventDefault(); openEditor(x.dataset.p); });
  $('#co-reset', b).onclick = () => { CH.done = {}; chSave(); renderChamber(b); };
  $('#co-title', b).onclick = () => location.reload();
}
// tiny preview of a panel (structure only, no answer)
function miniBoard(p) { return `<svg class="mini g-${p.girl}" viewBox="${vb(p, .6)}" aria-hidden="true">${boardSVG(p, { mini: true })}</svg>`; }

/* ---------------- magnifier → projector ---------------- */
async function startPanel(id) {
  const p = PANELS.find(x => x.id === id); if (!p) return;
  if (WINS.projector) { openProjector(p); return; }   // already projecting: swap the map in place, no new scan
  ['feedcam', 'magnifier'].forEach(closeWin);
  if (CH.opt.intro) await magnifierIntro(p);
  openProjector(p);
}
function magnifierIntro(p, o = {}) {
  return new Promise(res => {
    const g = p.girl, A = ART[g] || null;
    if (!o.noCam) openWin('feedcam', { title: `Live feed · ${GIRLS[g].id}`, icon: 'feed', w: 260, h: 330, x: 30, y: 30, render: b => {
      b.innerHTML = `<div class="cam"><div class="cam-room">${A ? `<img src="${A.body}" alt="${GIRLS[g].name} on the chair">` : `<div class="cam-sil" aria-label="${GIRLS[g].name} on the chair"></div>`}<div class="lens" id="lens"></div></div><div class="cam-cap">● REC · room 0</div></div>`;
    } });
    const dk = $('#desktop');
    openWin('magnifier', { title: 'Magnifier.exe · neural scan', icon: 'img', w: 560, h: 470, x: o.noCam ? Math.max(8, (dk.clientWidth - 560) / 2) : 300, y: 24, render: b => { b.innerHTML = magDashHTML(p); } });
    const stop = magDashRun(p);
    const f = $('#magf'), go = $('#mag-go'), bar = $('#magbar'), lens = $('#lens');
    requestAnimationFrame(() => lens && lens.classList.add('on'));
    let k = 0; const iv = setInterval(() => { k = Math.min(100, k + 2); f.textContent = k; bar.style.width = k + '%'; if (k >= 100) { clearInterval(iv); go.disabled = false; go.focus(); SFX.chime(); $('#mg-state').textContent = 'LOCKED'; } }, REDUCED ? 5 : 45);
    const finish = async beam => {
      clearInterval(iv); stop();
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

/* ---------------- Magnifier.exe: a neural-scan dashboard (all for show) ---------------- */
const MG_REG = { 1: { name: 'HIPPOCAMPUS', at: [104, 92] }, 2: { name: 'AMYGDALA', at: [74, 96] }, 3: { name: 'PREFRONTAL', at: [46, 62] } };
function magDashHTML(p) {
  const g = p.girl, R = MG_REG[p.layer];
  const labels = [['PREFRONTAL', 46, 62, 8, 18], ['AMYGDALA', 74, 96, 6, 138], ['HIPPOCAMPUS', 104, 92, 120, 140], ['THALAMUS', 100, 70, 150, 40], ['VISUAL', 160, 80, 168, 112]];
  const call = labels.map(([n, x, y, lx, ly], i) => `<g class="mg-call${n === R.name ? ' hot' : ''}"><circle cx="${x}" cy="${y}" r="3"/><polyline points="${x},${y} ${lx + (lx < x ? 34 : 0)},${ly} ${lx + (lx < x ? 0 : 34)},${ly}"/><text x="${lx}" y="${ly - 3}">${n}</text><text class="v" id="mgv${i}" x="${lx}" y="${ly + 9}">0.00</text></g>`).join('');
  return `<div class="mg">
    <div class="mg-head"><span>SUBJECT · ${esc(GIRLS[g].name.toUpperCase())}</span><span>REGION · ${REGION[p.layer].toUpperCase()} · L${p.layer}</span><span class="rec">● <i id="mg-state">SCANNING</i></span></div>
    <div class="mg-body">
      <div class="mg-p mg-brain"><svg viewBox="0 0 200 160" aria-label="Brain scan of ${esc(GIRLS[g].name)}">
        <defs><radialGradient id="mgglow"><stop offset="0" stop-color="#ff4fd8" stop-opacity=".9"/><stop offset="1" stop-color="#ff4fd8" stop-opacity="0"/></radialGradient>
          <clipPath id="mgclip"><path d="M30 92 C18 60 40 26 82 22 C120 18 160 30 176 58 C188 80 180 104 160 112 C150 128 128 128 120 120 C108 132 84 132 76 120 C56 124 36 112 30 92 Z"/></clipPath></defs>
        <g clip-path="url(#mgclip)"><rect width="200" height="160" fill="#1b0a33"/>
          <g class="mg-gyri"><path d="M40 70 C60 50 80 64 96 48 C112 34 136 46 150 40"/><path d="M36 92 C58 80 70 96 92 82 C112 70 132 86 168 74"/><path d="M60 110 C76 100 96 112 116 102 C132 94 148 104 168 96"/><path d="M70 36 C80 52 74 70 90 80"/><path d="M120 28 C116 50 128 64 120 84"/><path d="M150 46 C142 60 152 76 144 92"/></g>
          <circle class="mg-hot" cx="${R.at[0]}" cy="${R.at[1]}" r="26" fill="url(#mgglow)"/>
          <rect class="mg-sweep" x="0" y="0" width="14" height="160"/></g>
        <path class="mg-outline" d="M30 92 C18 60 40 26 82 22 C120 18 160 30 176 58 C188 80 180 104 160 112 C150 128 128 128 120 120 C108 132 84 132 76 120 C56 124 36 112 30 92 Z"/>
        <path class="mg-outline" d="M112 124 C116 136 118 146 126 152"/>
        ${call}
      </svg></div>
      <div class="mg-col">
        <div class="mg-p mg-heat"><canvas id="mg-heat" width="48" height="30"></canvas><label>CORTICAL HEAT</label></div>
        <div class="mg-p mg-bars" id="mg-bars">${['δ', 'θ', 'α', 'β', 'γ', 'σ', 'μ', 'κ'].map(c => `<div><i style="height:30%"></i><b>${c}</b></div>`).join('')}</div>
      </div>
      <div class="mg-p mg-eeg"><canvas id="mg-eeg" width="320" height="58"></canvas><label>EEG · CH1–3</label></div>
      <div class="mg-p mg-nums">${[['BPM', 'mgn0'], ['SpO₂', 'mgn1'], ['SYNC', 'mgn2'], ['NOISE', 'mgn3'], ['DEPTH', 'mgn4'], ['ANOMALY', 'mgn5']].map(([l, id]) => `<div><b id="${id}">--</b><small>${l}</small></div>`).join('')}</div>
    </div>
    <div class="mg-foot"><span class="mg-lock">LOCK <span class="bar"><i id="magbar"></i></span> <b id="magf">0</b>%</span><button class="btn" id="mag-skip">Skip</button><button class="btn primary" id="mag-go" disabled>Project ▸</button></div>
  </div>`;
}
function magDashRun(p) {
  const heat = $('#mg-heat'), hg = heat.getContext('2d'), eeg = $('#mg-eeg'), eg = eeg.getContext('2d'), bars = $$('#mg-bars i');
  const R = MG_REG[p.layer], hx = R.at[0] / 200 * 48, hy = R.at[1] / 160 * 30;
  const nums = { 0: 72, 1: 98, 2: 60, 3: .12, 4: 2.4, 5: 0 };
  const pal = v => { v = Math.max(0, Math.min(1, v)); const c = [[27, 10, 51], [107, 31, 143], [255, 79, 216], [255, 180, 107], [255, 243, 160]], k = v * 4, i = Math.min(3, Math.floor(k)), w = k - i; return c[i].map((a, j) => Math.round(a + (c[i + 1][j] - a) * w)); };
  const img = hg.createImageData(48, 30);
  let t = 0, last = performance.now(), ph = [0, 0, 0], ey = [29, 29, 29], alive = true, acc = 0;
  eg.fillStyle = '#12062b'; eg.fillRect(0, 0, 320, 58);
  const frame = now => {
    if (!alive || !WINS.magnifier) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; acc += dt;
    // heat map: drifting blobs, one hot spot on the region being scanned
    for (let y = 0; y < 30; y++) for (let x = 0; x < 48; x++) {
      let v = .18 + .12 * Math.sin(x * .3 + t * 1.3) * Math.cos(y * .4 - t);
      v += .5 * Math.exp(-((x - hx) ** 2 + (y - hy) ** 2) / (18 + 8 * Math.sin(t * 3)));
      v += .25 * Math.exp(-((x - 24 - 14 * Math.sin(t * .7)) ** 2 + (y - 15 - 6 * Math.cos(t * .9)) ** 2) / 30);
      const [r, g, b] = pal(v), i = (y * 48 + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    hg.putImageData(img, 0, 0);
    // EEG: scroll left, draw three traces
    const sp = 2; eg.drawImage(eeg, -sp, 0); eg.fillStyle = '#12062b'; eg.fillRect(320 - sp, 0, sp, 58);
    ['#ff4fd8', '#8fdcf7', '#ffd86e'].forEach((c, i) => {
      ph[i] += dt * (6 + i * 3);
      const spike = Math.random() < .02 ? (Math.random() - .5) * 30 : 0;
      const y = 10 + i * 18 + Math.sin(ph[i]) * 4 + Math.sin(ph[i] * 2.7) * 2 + (Math.random() - .5) * 3 + spike;
      eg.strokeStyle = c; eg.lineWidth = 1.2; eg.beginPath(); eg.moveTo(320 - sp - 1, ey[i]); eg.lineTo(319, y); eg.stroke(); ey[i] = y;
    });
    if (acc > .12) {
      acc = 0;
      bars.forEach((b, i) => b.style.height = Math.round(20 + 70 * Math.abs(Math.sin(t * (1 + i * .37) + i)) * (.6 + Math.random() * .4)) + '%');
      nums[0] += (Math.random() - .5) * 3; nums[1] = 96 + Math.random() * 3; nums[2] = Math.min(99, nums[2] + Math.random() * 1.2); nums[3] = Math.max(.01, nums[3] + (Math.random() - .5) * .03); nums[4] += .02 + Math.random() * .03; nums[5] = .5 + .5 * Math.sin(t * 2);
      const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
      set('mgn0', Math.round(nums[0])); set('mgn1', nums[1].toFixed(1) + '%'); set('mgn2', nums[2].toFixed(0) + '%'); set('mgn3', nums[3].toFixed(2)); set('mgn4', nums[4].toFixed(1) + 'm'); set('mgn5', (nums[5] * 100).toFixed(0));
      for (let i = 0; i < 5; i++) set('mgv' + i, (Math.random() * .4 + (i === [2, 1, 0][p.layer - 1] ? .55 : .1)).toFixed(2));
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return () => { alive = false; };
}

/* ---------------- projector music ----------------
   audio/projector_bgm.mp3 plays only while the projector window is open: it fades in when the
   window opens and fades out when it closes (re-opening within the fade picks it back up). The
   desktop's own ambient music is ducked meanwhile. Muted with the tray's sound button. */
const BGM = { el: null, vol: 0, want: 0, iv: null, LEVEL: .5 };
function bgmTick() {
  const el = BGM.el; if (!el) return;
  const target = BGM.want * (AU.on ? BGM.LEVEL : 0), step = BGM.want ? BGM.LEVEL / 50 : BGM.LEVEL / 18;   // ~2.5 s in, ~0.9 s out
  BGM.vol = BGM.vol < target ? Math.min(target, BGM.vol + step) : Math.max(target, BGM.vol - step);
  el.volume = Math.max(0, Math.min(1, BGM.vol));
  if (!BGM.want && BGM.vol <= 0) { el.pause(); clearInterval(BGM.iv); BGM.iv = null; }
  if (BGM.want && BGM.vol >= target) { clearInterval(BGM.iv); BGM.iv = null; }
}
function bgmRun() { if (!BGM.iv) BGM.iv = setInterval(bgmTick, 50); }
function bgmOn() {
  try {
    if (!BGM.el) { BGM.el = new Audio('audio/projector_bgm.mp3'); BGM.el.loop = true; BGM.el.preload = 'auto'; BGM.el.volume = 0; }
    BGM.want = 1; if (BGM.el.paused) { const pr = BGM.el.play(); if (pr && pr.catch) pr.catch(() => { }); }
    bgmRun();
    if (AU.ctx && AU.music) AU.music.gain.setTargetAtTime(0, AU.ctx.currentTime, .6);
  } catch (e) { }
}
function bgmOff() {
  if (!BGM.el) return; BGM.want = 0; bgmRun();
  if (AU.ctx && AU.music) AU.music.gain.setTargetAtTime(.15, AU.ctx.currentTime, 1.2);
}
function bgmMute() { if (BGM.el && BGM.want) bgmRun(); }

/* ---------------- projector: the panel ---------------- */
let PJ = null;
/* PJ_STORY: set by the story map (src/world.js) while one of her memories is projected inside the Fix-it window.
   { g, spend(), locked(), win(p), back() } */
let PJ_STORY = null;
function pjDispose() { if (!PJ) return; clearInterval(PJ.solTimer); clearInterval(PJ.fpsTimer); clearTimeout(PJ.advT); if (PJ.view) PJ.view.dispose(); if (PJ.die3) PJ.die3.dispose(); PJ = null; }
function pjNew(p) {
  if (PJ) { clearInterval(PJ.solTimer); clearInterval(PJ.fpsTimer); clearTimeout(PJ.advT); if (PJ.view) PJ.view.dispose(); }
  PJ = { p, st: null, bs: p.boxes ? PanelEngine.boxStart(p) : null, bsHist: [], drawing: false, solOn: false, solK: 0, peeked: false, t0: performance.now(), tries: 0, hint: null, hintUsed: false, eraseUsed: false, state: 'idle', bad: [], erased: null, view: null };
}
const pjMem = k => PJ_STORY ? k === 'tracing_paper' && hasMem('tracing_paper.mem') : CH.opt.mem[k];
function openProjector(p) {
  if (PJ) { clearInterval(PJ.solTimer); clearInterval(PJ.fpsTimer); clearTimeout(PJ.advT); if (PJ.view) PJ.view.dispose(); }
  const W = WINS.projector;
  PJ = { p, st: null, bs: p.boxes ? PanelEngine.boxStart(p) : null, bsHist: [], drawing: false, solOn: false, solK: 0, peeked: false, t0: performance.now(), tries: 0, hint: null, hintUsed: false, eraseUsed: false, state: 'idle', bad: [], erased: null, view: null };
  const inL = panelsOf(p.girl).filter(x => x.layer === p.layer).sort((a, c) => a.n - c.n), nL = inL.length, idx = inL.findIndex(x => x.id === p.id) + 1;
  const title = `PROJECT3D.EXE · ${GIRLS[p.girl].name}`;
  if (W) { W.o.title = title; W.el.querySelector('.tt').textContent = title; renderProjector(W.body, p, idx, nL); focusWin('projector'); return; }
  openWin('projector', { title, icon: 'brain', w: 600, h: 720, x: CH.opt.intro ? 320 : 120, y: 6,
    onClose: () => { bgmOff(); if (PJ) { clearInterval(PJ.solTimer); clearInterval(PJ.fpsTimer); clearTimeout(PJ.advT); if (PJ.view) PJ.view.dispose(); if (PJ.die3) PJ.die3.dispose(); } PJ = null; document.removeEventListener('keydown', pjKey); },
    render: b => renderProjector(b, p, idx, nL) });
}
function renderProjector(b, p, idx, nL) {
    {
      b.innerHTML = `<div class="pj pj3 g-${p.girl}">
        <div class="pj-menu" role="menubar">
          <div class="mn"><button class="mn-b">File</button><div class="mn-d">
            <button data-m="undo"><span>Undo move</span><kbd>Z</kbd></button><button data-m="reset"><span>Reset panel</span><kbd>R</kbd></button><hr>
            <button data-m="edit"><span>Edit this level</span><kbd></kbd></button><button data-m="back"><span>Back to panels</span><kbd></kbd></button></div></div>
          <div class="mn"><button class="mn-b">View</button><div class="mn-d">
            <button data-m="3d"><span>${CH.opt.view3d ? '☑' : '☐'} 3D projection</span><kbd></kbd></button>
            <button data-m="retro"><span>${CH.opt.retro ? '☑' : '☐'} Chunky pixels (98 mode)</span><kbd></kbd></button></div></div>
          <div class="mn"><button class="mn-b">Help</button><div class="mn-d"><div class="mn-help">
            <b>W A S D</b> or arrows: move (W goes away from you)<br><b>Z</b> undo · <b>R</b> reset${p.boxes ? '' : ' · <b>Enter</b> finish · or drag the little box'}<br>${p.boxes ? 'Every key moves every box. Fill all goals at the same time.' : 'Reach the gold goal tile.'}${(p.plates || []).length ? '<br>Round button: while something stands on it, gates of its colour open (striped gates close).' : ''}</div></div></div>
          <span class="pj-id">${p.id}</span>
        </div>
        <div class="pj-stage pj-vp" id="pj-vp"></div>
        <div class="pj-msg" id="pj-msg" aria-live="polite"></div>
        <div class="pj-solbox sunk" id="pj-solbox" hidden>
          <div class="sb-ctrl"><button class="btn" id="sb-first" aria-label="Back to start">⏮</button><button class="btn" id="sb-prev" aria-label="Step back">◀</button><button class="btn primary" id="sb-play">▶ Play</button><button class="btn" id="sb-next" aria-label="Step forward">▶</button><span id="sb-k"></span></div>
        </div>
        <div class="pj-bar">
          <button class="btn" id="pj-back">◂ Panels</button>
          <button class="btn" id="pj-reset">Reset</button>
          ${pjMem('tracing_paper') ? `<button class="btn" id="pj-hint" title="${esc(CH_MEM.tracing_paper.desc)}">${icon('thread')} trace</button>` : ''}
          ${pjMem('queen_piece') ? `<span class="pj-tok" id="pj-erase" title="${esc(CH_MEM.queen_piece.desc)}">${icon('queen')} ready</span>` : ''}
          <span class="sp"></span>
          <button class="btn" id="pj-sol" aria-pressed="false">Solution</button>
          <button class="btn primary" id="pj-next" hidden>Next ▸</button>
        </div>
        <div class="pj-status"><span id="pj-st1">Ready</span><span>Layer ${p.layer} · ${REGION[p.layer]} · ${idx}/${nL}</span><span id="pj-moves"></span><span id="pj-fps"></span></div>
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
      $('#pj-next', b).onclick = () => goNextPanel();
      $$('[data-m]', b).forEach(el => el.onclick = () => {
        const m = el.dataset.m; el.blur(); SFX.click();
        if (m === 'undo') { pjUndo(); drawPJ(); } else if (m === 'reset') pjReset(); else if (m === 'back') $('#pj-back', b).click(); else if (m === 'edit') openEditor(PANELS.some(x => x.id === p.id) ? p.id : null);
        else if (m === '3d' || m === 'retro') {
          if (m === '3d') CH.opt.view3d = !CH.opt.view3d; else CH.opt.retro = !CH.opt.retro; chSave();
          $('[data-m="3d"] span', b).textContent = `${CH.opt.view3d ? '☑' : '☐'} 3D projection`; $('[data-m=retro] span', b).textContent = `${CH.opt.retro ? '☑' : '☐'} Chunky pixels (98 mode)`;
          if (m === 'retro' && PJ.view) PJ.view.setRetro(CH.opt.retro); else mountStage();
        }
      });
      document.removeEventListener('keydown', pjKey); document.addEventListener('keydown', pjKey);
      if (PJ_STORY) storyProjectorChrome(b, p);
      mountStage(); if (!PJ_STORY) bgmOn();
      PJ.fpsTimer = setInterval(() => { const f = $('#pj-fps'); if (f && PJ) f.textContent = PJ.view ? (PJ.view.fps() ? `WebGL · ${PJ.view.fps()} fps` : 'WebGL') : '2D view'; }, 1000);
    }
}
/* after a win the window stays: the next map is projected in place.
   With "story flow" on, the girl sends a message first (as the real game will do). */
function nextPanelOf(p) { const L = panelsOf(p.girl).sort((a, c) => a.layer - c.layer || a.n - c.n); return L[L.findIndex(x => x.id === p.id) + 1] || null; }
function goNextPanel() {
  if (!PJ) return; clearTimeout(PJ.advT);
  const nx = nextPanelOf(PJ.p);
  if (nx) { SFX.click(); openProjector(nx); }
  else $('#pj-back').click();
}
async function afterWin(p) {
  const me = PJ, nx = nextPanelOf(p);
  await wait(PJ.view && !REDUCED ? 2300 : 900);
  if (PJ !== me || PJ.solOn || PJ.state !== 'win') return;
  if (CH.opt.story) { await storyMessage(p); if (PJ !== me || PJ.solOn || PJ.state !== 'win') return; }
  if (!nx) { $('#pj-msg').textContent = `Every map in ${GIRLS[p.girl].name}'s head is clear.`; $('#pj-next').textContent = '◂ Panels'; return; }
  let k = 2; const tick = () => { if (PJ !== me || PJ.solOn || PJ.state !== 'win') return; if (k <= 0) { goNextPanel(); return; } k--; PJ.advT = setTimeout(tick, 600); };
  tick();
}
// a chat strip inside the projector: her reaction lines, your choice, her reply
function storyMessage(p) {
  return new Promise(res => {
    const g = p.girl, vp = $('#pj-vp'); if (!vp) { res(); return; }
    let arr = typeof sesEntries === 'function' ? sesEntries(g, 'react', e => !e.trigger || /^(WIN|PERFECT)_/.test(e.trigger)) : [];
    const steps = arr.length ? playSteps(pickRnd(arr).steps) : [FILLER];
    const A = ART[g], box = document.createElement('div'); box.className = 'pj-chat';
    box.innerHTML = `<div class="pc-head">${A ? `<img src="${A.face}" alt="">` : '<i>?</i>'}<b>${esc(GIRLS[g].name)}</b><span>Yappy Yappy · now</span></div><div class="pc-log"></div><div class="pc-act"></div>`;
    vp.appendChild(box);
    const log = $('.pc-log', box), act = $('.pc-act', box);
    const say = (txt, who) => { const m = document.createElement('div'); m.className = 'pc-m ' + (who || 'her'); m.textContent = txt; log.appendChild(m); log.scrollTop = 1e6; if (who !== 'you') SFX.chime && SFX.chime(); };
    const clean = l => Array.isArray(l) ? [l[0] === 'sys' ? 'sys' : 'her', String(l[1]).replace(/^\{\w+\}/, '')] : ['her', String(l).replace(/^\{\w+\}/, '')];
    const done = () => { box.classList.add('out'); setTimeout(() => { box.remove(); res(); }, 250); };
    (async () => {
      for (const st of steps) {
        for (const l of st.lines || []) { const [w, t] = clean(l); if (!t.trim()) continue; await wait(REDUCED ? 50 : 650); if (!box.isConnected) return; say(t, w); }
        const ch = (st.choices || []).filter(c => !c.req || cond(c.req.cond));
        if (ch.length) {
          const c = await new Promise(r2 => { act.innerHTML = ''; ch.forEach(c => { const bt = document.createElement('button'); bt.className = 'btn'; bt.textContent = c.t; bt.onclick = () => { SFX.click(); r2(c); }; act.appendChild(bt); }); act.firstChild.focus(); });
          act.innerHTML = ''; say(c.t, 'you');
          for (const l of c.r || []) { const [w, t] = clean(l); if (!t.trim()) continue; await wait(REDUCED ? 50 : 700); say(t, w); }
        }
      }
      await wait(REDUCED ? 50 : 500);
      act.innerHTML = '<button class="btn primary">Next map ▸</button>'; act.firstChild.onclick = () => { SFX.click(); done(); }; act.firstChild.focus();
    })();
  });
}
// the projection: 3D when possible, otherwise the flat board
function mountStage() {
  const vp = $('#pj-vp'); if (!vp || !PJ) return;
  if (PJ.view) { PJ.view.dispose(); PJ.view = null; }
  vp.innerHTML = ''; vp.classList.toggle('flat', true);
  // dice panels float the brief and the practice die over the right side; the board shifts left to make room
  const side = (PJ.p.dice || []).length > 0; vp.classList.toggle('has-side', side);
  const host = vp;
  if (CH.opt.view3d && P3.has()) {
    try { PJ.view = P3.create(host, PJ.p); PJ.view.setRetro(!!CH.opt.retro); bindPJ(PJ.view.canvas, PJ.view.toBoard); vp.classList.remove('flat'); vp.insertAdjacentHTML('beforeend', `<div class="pj3-hud">◉ DIVE·PROJ 3D <i>${PJ.p.boxes ? 'BOX' : 'LINE'} MODE</i>${PJ.p.tut ? `<b class="tut">NEW · ${esc(TEACH[PJ.p.tut] || PJ.p.tut)}</b>` : ''}</div>`); }
    catch (e) { console.warn('3D projection failed, using the flat board', e); if (PJ.view) PJ.view.dispose(); PJ.view = null; host.innerHTML = ''; }
  }
  if (!PJ.view) { host.innerHTML = `<svg id="pj-svg" viewBox="${side ? vbSide(PJ.p) : vb(PJ.p)}" role="img" aria-label="Puzzle board. Move with WASD or the arrow keys."></svg>`; bindPJ($('#pj-svg')); }
  vp.insertAdjacentHTML('beforeend', pjSideHTML(PJ.p)); pjSideBind();
  const f = $('#pj-fps'); if (f) f.textContent = PJ.view ? 'WebGL' : '2D view';
  drawPJ();
}
async function pjSubmit() {
  const p = PJ.p, r = p.boxes ? { ok: PanelEngine.boxWon(p, PJ.bs), bad: [{ kind: 'path' }] } : PanelEngine.validate(p, pjPath()); PJ.tries++;
  let ok = r.ok;
  if (!ok && pjMem('queen_piece') && !PJ.eraseUsed && r.bad.length === 1 && r.bad[0].kind !== 'path' && r.bad[0].kind !== 'moves') {
    ok = true; PJ.eraseUsed = true; PJ.erased = r.bad[0].kind + ':' + r.bad[0].i;
    $('#pj-msg').textContent = 'The queen took one rule off the board.';
  }
  if (ok) {
    PJ.state = 'win'; PJ.hint = null; drawPJ(); SFX.win(); if (PJ.view) { const v = PJ.view; setTimeout(() => { if (PJ && PJ.view === v && PJ.state === 'win' && !PJ.solOn) v.winFx(); }, 380); setTimeout(() => { if (PJ && PJ.view === v && PJ.state === 'win') pj3Flash('ERASED', 'win'); }, 1300); } else setTimeout(() => { if (PJ && PJ.state === 'win') pj3Flash('ERASED', 'win'); }, 300);
    $('#pj-msg').textContent = '';
    if (PJ_STORY) { PJ_STORY.win(p); return; }
    const t = performance.now() - PJ.t0, prev = CH.done[p.id];
    CH.done[p.id] = { t: prev ? Math.min(prev.t, t) : t, tries: prev ? Math.min(prev.tries, PJ.tries) : PJ.tries, peek: prev ? prev.peek && PJ.peeked : PJ.peeked }; chSave();
    $('#pj-next').hidden = false;
    UPD.forEach(f => f());
    afterWin(p);
  } else {
    PJ.state = 'fail'; PJ.bad = r.bad; drawPJ(); SFX.buzz(); if (PJ.view) pj3Flash('RULE VIOLATION', 'fail');
    $('#pj-msg').textContent = '';
    setTimeout(() => { if (PJ && PJ.state === 'fail') { PJ.state = 'idle'; drawPJ(); } }, 1400);
  }
}
