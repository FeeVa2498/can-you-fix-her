/* =========================================================
   FIX-IT · the story map. Her mind as a big map: you are a box in her colour.
   Every glowing tile is a memory (one panel); clear it and you keep its key.
   Each layer of her is a big locked gate that wants a number of keys (you have more
   memories than it needs, so you choose which to do). Every input costs her stamina.
   ========================================================= */
const KEY_SHARE = .6;            // a gate wants this share of the memories behind it
const OW_RW = 13, OW_STRIDE = 14, OW_H = 11, OW_CORE = 6;
const OW_THEME = {   // per girl: floor, wall, accent (her colour)
  prim: { floor: ['#6a4a80', '#75538c'], wall: '#160b1d', wallTop: '#2a1636', acc: '#ff7eb6', hue: 0 },
  trix: { floor: ['#5e3a52', '#68425b'], wall: '#14080f', wallTop: '#2a1220', acc: '#ff4d5e', hue: 1 },
  paige: { floor: ['#4a3a6e', '#53427a'], wall: '#0f0a1a', wallTop: '#211832', acc: '#a46bff', hue: 2 },
  ray: { floor: ['#8a8494', '#938d9c'], wall: '#100d14', wallTop: '#2a2530', acc: '#e8e4ee', hue: 0 },
  vel: { floor: ['#6e5a33', '#78633a'], wall: '#160f06', wallTop: '#2e2310', acc: '#ffd23f', hue: 3 },
};
const OW_REGION = ['memory', 'feeling', 'self'];
const keysNeed = n => Math.max(1, Math.ceil(n * KEY_SHARE));
function owRand(seed) { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
function owSeed(t) { let h = 2166136261; for (const c of t) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function owLayers(g) { return [1, 2, 3].map(L => panelsOf(g).filter(p => p.layer === L).sort((a, b) => a.n - b.n)); }

/* ---------------- the map: three maze regions joined by gates, and a small core room ---------------- */
const OWMAP = {};
/* A layer is laid out left → right like a level:
   1. a straight corridor with her tutorials ON the road: each one is sealed behind (you must clear it to pass);
      if the layer has no tutorial, its first memory is the forced one;
   2. then the road branches: short side paths, each ending in a normal memory (choose which ones);
   3. further on, longer side paths to the hard memories;
   4. the gate (a/b keys) closes the layer. After the third gate: her core. */
const OW_MID = 5;
function owBuild(g) {
  if (OWMAP[g]) return OWMAP[g];
  if (g === 'ray') return (OWMAP.ray = rayMap());
  const ov = typeof mapOverride === 'function' && mapOverride(g); if (ov) return (OWMAP[g] = ov);   // a layout from the map editor
  const lay = owLayers(g), H = 11, mid = OW_MID;
  const cells = [];   // [x, y, v] v: 1 floor · 2 gate · 3 seal
  const nodes = [], gates = [], seals = [];
  const floor = (x, y) => cells.push([x, y, 1]);
  let x = 1;
  floor(x, mid); floor(x + 1, mid); x += 2;
  for (let r = 0; r < 3; r++) {
    const ps = lay[r]; if (!ps.length) continue;
    let tuts = ps.filter(p => p.tut), rest = ps.filter(p => !p.tut);
    if (!tuts.length) { tuts = rest.slice(0, 1); rest = rest.slice(1); }
    let i = 0;
    const node = (p, nx, ny) => { nodes.push({ x: nx, y: ny, layer: r + 1, pid: p.id, i: i++, tut: !!p.tut }); floor(nx, ny); };
    // 1. the forced corridor
    tuts.forEach(p => { floor(x, mid); node(p, x + 1, mid); cells.push([x + 2, mid, 3]); seals.push({ x: x + 2, y: mid, pid: p.id }); x += 3; });
    floor(x, mid); x++;
    // 2. side paths: normals first, hard ones (the last ~40%) on longer paths further along
    const nHard = rest.length >= 4 ? Math.round(rest.length * .4) : 0, easy = rest.slice(0, rest.length - nHard), hard = rest.slice(rest.length - nHard);
    let up = true;
    easy.forEach(p => { floor(x, mid); floor(x + 1, mid); const d = up ? -1 : 1; floor(x + 1, mid + d); floor(x + 1, mid + 2 * d); node(p, x + 1, mid + 3 * d); up = !up; x += 2; });
    if (hard.length) { floor(x, mid); floor(x + 1, mid); x += 2; }
    hard.forEach(p => {   // a path with a bend: three up/down, one sideways
      floor(x, mid); floor(x + 1, mid); floor(x + 2, mid); const d = up ? -1 : 1;
      floor(x + 1, mid + d); floor(x + 1, mid + 2 * d); floor(x + 1, mid + 3 * d); floor(x + 2, mid + 3 * d); floor(x + 3, mid + 3 * d); node(p, x + 3, mid + 4 * d);
      up = !up; x += 3;
    });
    // 4. the gate, with a little plaza in front
    floor(x, mid); floor(x + 1, mid); floor(x + 1, mid - 1); floor(x + 1, mid + 1); x += 2;
    cells.push([x, mid, 2]); gates.push({ x, y: mid, layer: r + 1, total: ps.length, need: keysNeed(ps.length) }); x++;
    floor(x, mid); x++;
  }
  // the core room
  for (let yy = mid - 2; yy <= mid + 2; yy++) for (let xx = x; xx < x + 5; xx++) floor(xx, yy);
  const core = [x + 2, mid]; x += 6;
  const W = x + 1, t = new Uint8Array(W * H);
  cells.forEach(([cx, cy, v]) => { if (cx >= 0 && cy >= 0 && cx < W && cy < H && (t[cy * W + cx] === 0 || v > 1)) t[cy * W + cx] = v; });
  const M = { g, W, H, t, nodes, gates, seals, start: [1, mid], core, nodeAt: new Map(nodes.map((n, k) => [n.y * W + n.x, k])) };
  OWMAP[g] = M; return M;
}
function owBfs(t, W, H, [sx, sy]) {
  const d = new Int16Array(W * H).fill(-1), q = [[sx, sy]]; d[sy * W + sx] = 0;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue;
      const k = b * W + a; if (t[k] !== 1 || d[k] >= 0) continue; d[k] = d[y * W + x] + 1; q.push([a, b]);
    }
  }
  return d;
}

/* ---------------- her progress on the map (saved in S.g[g].ow) ---------------- */
function owState(g) {
  const st = S.g[g], M = owBuild(g);
  if (!st.ow) st.ow = { x: M.start[0], y: M.start[1], solved: {}, seen: '' };
  if (st.ow.seen.length !== M.W * M.H || st.ow.seen.includes('0')) st.ow.seen = '1'.repeat(M.W * M.H);   // no fog of war
  return st.ow;
}
// keys per layer: { have, need, total }
function owKeys(g) {
  const M = owBuild(g), o = owState(g);
  const bonus = (S.g[g] && S.g[g].bonusKeys) || {};   // keys won at night (timed questions) count like solved memories
  return M.gates.map(G => ({ have: M.nodes.filter(n => n.layer === G.layer && o.solved[n.pid]).length + (bonus[G.layer] || 0), need: G.need, total: G.total }));
}
function owFirstOpen(g) {
  const M = owBuild(g), o = owState(g), L = S.g[g].layer + 1;
  const n = M.nodes.find(n => n.layer === Math.min(3, L) && !o.solved[n.pid]) || M.nodes[0];
  return n && PANELS.find(p => p.id === n.pid);
}
const owGateOpen = (g, G) => S.g[g].layer >= G.layer;
function owPassable(g, x, y) {
  const M = owBuild(g); if (x < 0 || y < 0 || x >= M.W || y >= M.H) return false;
  const v = M.t[y * M.W + x]; if (v === 1) return true;
  if (v === 2) { const G = M.gates.find(G => G.x === x && G.y === y); return owGateOpen(g, G); }
  if (v === 3) { const sl = M.seals.find(q => q.x === x && q.y === y); return !!owState(g).solved[sl.pid]; }
  return false;
}
function owReveal(g) {
  const M = owBuild(g), o = owState(g), a = o.seen.split(''); let ch = false;
  for (let y = o.y - 3; y <= o.y + 3; y++) for (let x = o.x - 4; x <= o.x + 4; x++) {
    if (x < 0 || y < 0 || x >= M.W || y >= M.H) continue; const k = y * M.W + x; if (a[k] !== '1') { a[k] = '1'; ch = true; }
  }
  if (ch) o.seen = a.join('');
}

/* ---------------- the Fix-it window ---------------- */
const OW = { g: null, mode: 'map', anim: null, raf: 0, frozen: false, msg: '', msgT: 0, shake: 0, keyFx: null, ro: null };
function openWorld(g) {
  OW.g = g; OW.mode = 'map'; owState(g); owReveal(g);
  const dk = $('#desktop'), W = dk.clientWidth, H = dk.clientHeight;
  const fw = W >= 1240 ? 380 : 340, cw = W >= 1240 ? 360 : 330;
  const ww = Math.max(480, W - fw - cw - 32), x = fw + 16;
  openWin('fixit', { title: `Fix-it · ${GIRLS[g].name}`, icon: 'brain', w: ww, h: Math.min(H - 16, 720), x, y: 8, noClose: () => !!S.session,
    onClose: () => { owStop(); }, render: b => owRenderShell(b) });
  placeWin('fixit', x, 8, ww, Math.min(H - 16, 720));
  focusWin('fixit');
}
function owRenderShell(b) {
  const g = OW.g;
  b.innerHTML = `<div class="ow g-${g}" style="--acc:${OW_THEME[g].acc}">
    <div class="ow-top"><span class="ow-keys" id="ow-keys"></span><span class="ow-reg" id="ow-reg"></span><span class="sp"></span>
      <span class="ow-stam" id="ow-stam" title="Her stamina for today. Every input costs a little."><i></i><b></b></span>
      <button class="btn" id="ow-end">End session</button></div>
    <div class="ow-main" id="ow-main"><div class="ow-view" id="ow-view"><canvas id="ow-cv"></canvas><canvas class="ow-mini" id="ow-mini"></canvas><div class="ow-card" id="ow-card" hidden></div><div class="ow-msg" id="ow-msg" aria-live="polite"></div></div></div>
    <div class="ow-help">W A S D / arrows: move · Enter: dive into a memory · Esc (in a memory): back to the map</div></div>`;
  $('#ow-end', b).onclick = () => { SFX.click(); endSessionEarly(); };
  const cv = $('#ow-cv', b), view = $('#ow-view', b);
  if (OW.ro) OW.ro.disconnect();
  OW.ro = new ResizeObserver(() => { const r = view.getBoundingClientRect(); cv.width = Math.max(10, r.width | 0); cv.height = Math.max(10, r.height | 0); owDraw(); });
  OW.ro.observe(view);
  document.removeEventListener('keydown', owKey); document.addEventListener('keydown', owKey);
  owDispose3();
  if (typeof P3 !== 'undefined' && P3.has()) { try { OW.v3 = OW3.create(view, g); cv.hidden = true; } catch (e) { console.warn('3D map unavailable', e); OW.v3 = null; } }
  if (OW.keyFx && performance.now() - OW.keyFx < 4000) { OW.keyFx = null; setTimeout(() => owSay('+1 key'), 60); }
  owHud(); owLoop();
}
function owDispose3() { if (OW.v3) { OW.v3.dispose(); OW.v3 = null; } }
function owStop() { owDispose3(); cancelAnimationFrame(OW.raf); OW.raf = 0; if (OW.ro) OW.ro.disconnect(); OW.ro = null; document.removeEventListener('keydown', owKey); }
function owClose() { if (PJ_STORY) { PJ_STORY = null; pjDispose(); document.removeEventListener('keydown', pjKey); } owStop(); OW.g = null; }
function owFocus() { const w = WINS.fixit; if (w) focusWin('fixit'); }
function owHud() {
  const g = OW.g; if (!g || !$('#ow-keys')) return;
  const M = owBuild(g), ks = owKeys(g), L = Math.min(M.gates.length, S.g[g].layer + 1), k = ks[L - 1], o = owState(g);
  const done = S.g[g].layer >= M.gates.length;
  $('#ow-keys').innerHTML = done ? `${keyIcon(g)} <b>every gate open</b>` : `${keyIcon(g)} <b>${k.have}</b>/${k.need} <small>keys · gate ${L}</small>`;
  const region = M.gates.findIndex(G => o.x < G.x); const rg = region < 0 ? 'core' : OW_REGION[region];
  $('#ow-reg').textContent = `Layer ${region < 0 ? 3 : region + 1} · ${rg}`;
  const pct = staminaPct(), st = $('#ow-stam');
  st.querySelector('i').style.width = pct + '%'; st.querySelector('b').textContent = `${clockStr()} · ${pct}%`; st.classList.toggle('low', pct <= 15);
  // the card for the memory you're standing on
  const card = $('#ow-card'); if (!card) return;
  const ni = M.nodeAt.get(o.y * M.W + o.x);
  if (OW.mode === 'map' && ni != null) {
    const n = M.nodes[ni], p = PANELS.find(q => q.id === n.pid);
    card.hidden = false;
    card.innerHTML = `<b>Memory ${n.layer}·${n.i + 1}</b>${p && p.tut ? ` <span class="new">NEW · ${esc(TEACH[p.tut] || p.tut)}</span>` : ''}${o.solved[n.pid] ? ' <span class="got">key taken ✓</span>' : ''}<span class="go">Enter ▸ dive in</span>`;
  } else card.hidden = true;
}
function keyIcon(g) { return `<svg class="kic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="8" r="3.4" fill="none" stroke="${OW_THEME[g].acc}" stroke-width="2"/><path d="M8 8h7M12 8v3M14.5 8v2" stroke="${OW_THEME[g].acc}" stroke-width="2" fill="none"/></svg>`; }
function owSay(t) { OW.msg = t; OW.msgT = performance.now(); const m = $('#ow-msg'); if (m) { m.textContent = t; m.classList.remove('on'); void m.offsetWidth; m.classList.add('on'); } }

/* every gameplay input costs a minute of her day */
function owSpend(kind = 'move') {
  if (S.phase !== 'day' || S.dayOver || reckoning()) return;
  // mementos: hourglass (undo is free), dog tag (every other step on the map is free), d20 (one in five is free)
  let free = kind === 'reset' && hasMem('hourglass.mem');
  if (!free && kind === 'map' && hasMem('dog_tag.mem')) { OW.dog = (OW.dog || 0) + 1; free = OW.dog % 2 === 0; }
  if (!free && S.session && S.session.lucky) { OW.hot = (OW.hot || 0) + 1; free = OW.hot % 2 === 0; }   // Paige's coin: every 2 inputs cost 1 minute
  if (!free && hasMem('lucky_d20.mem') && Math.random() < .2) { free = true; owSay('🎲 lucky · free move'); }
  if (!free) S.mins += 1;
  if (S.mins >= DAY_END) overload();
  owHud(); renderTray();
  if (WINS.brain) renderBrain();
  return free ? 0 : 1;
}
/* undo in her memories: unlocked by Prim's tracing paper, 20 a day, and it gives the minute back */
const UNDO_PER_DAY = 20;
function undoLeft() { if (S.undoDay !== S.day) { S.undoDay = S.day; S.undoLeft = UNDO_PER_DAY; } return S.undoLeft; }
const pjHist = () => PJ.p.boxes ? PJ.bsHist.length : (PJ.st ? PJ.st.path.length - 1 : 0);
function owStorySpend(kind) {
  const c = owSpend(kind);
  if (kind === 'move' && PJ) { const L = pjHist(); OW.costs = OW.costs || []; if (L > OW.costs.length) OW.costs.push(c || 0); else OW.costs.length = L; }
  if (kind === 'reset') OW.costs = [];
  return c;
}
function owStoryUndo() {
  if (owLocked()) { SFX.buzz(); return; }
  if (!pjCanUndo()) { SFX.buzz(); $('#pj-msg').textContent = 'Undo is locked. Someone here might lend you a way to take a move back.'; return; }
  if (undoLeft() <= 0) { SFX.buzz(); $('#pj-msg').textContent = 'No undos left today.'; return; }
  const before = pjHist(); pjUndo(); drawPJ();
  const after = pjHist(); if (after >= before) return;
  S.undoLeft--; OW.costs = OW.costs || [];
  let back = 0; while (OW.costs.length > after) back += OW.costs.pop() || 0;
  S.mins = Math.max(DAY_START, S.mins - back);
  $('#pj-msg').textContent = `Undo · ${S.undoLeft} left today${back ? ` · +${back} min back` : ''}`;
  save(); owHud(); renderTray(); if (WINS.brain) renderBrain();
}
const owLocked = () => S.dayOver || OW.frozen || !!S.flags.ended;
function owOverloaded() {
  OW.shake = performance.now();
  if (PJ_STORY) { const vp = $('#pj-vp'); if (vp) vp.classList.add('dead'); }
  const v = $('#ow-view'); if (v) v.classList.add('dead');
}

function owKey(e) {
  if (!OW.g || OW.mode !== 'map' || !WINS.fixit || document.getElementById('memory')) return;
  if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const top = Object.values(WINS).reduce((a, w) => (+w.el.style.zIndex || 0) > (+a.el.style.zIndex || 0) ? w : a, WINS.fixit);
  if (top !== WINS.fixit && !(top.el.contains(document.activeElement))) { /* still allow: the map is the main thing in a session */ }
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const D = KEYDIR[k];
  if (D) { e.preventDefault(); if (owLocked()) { SFX.buzz(); return; } owMove(D[0], D[1]); }
  else if (k === 'Enter' || k === ' ' || k === 'e') { e.preventDefault(); if (owLocked()) { SFX.buzz(); return; } owEnter(); }
}
function owMove(dx, dy) {
  const g = OW.g, o = owState(g), M = owBuild(g), nx = o.x + dx, ny = o.y + dy;
  owSpend('map'); if (S.dayOver) return;
  const v = nx >= 0 && ny >= 0 && nx < M.W && ny < M.H ? M.t[ny * M.W + nx] : 0;
  if (v === 2 && !owPassable(g, nx, ny)) { owGate(M.gates.find(G => G.x === nx && G.y === ny)); return; }
  if (v === 3 && !owPassable(g, nx, ny)) { SFX.bump(); OW.shake = performance.now(); owSay('clear this memory first'); return; }
  if (!owPassable(g, nx, ny)) { SFX.bump(); OW.anim = { from: [o.x, o.y], to: [o.x + dx * .18, o.y + dy * .18], t0: performance.now(), bump: true }; return; }
  OW.anim = { from: [o.x, o.y], to: [nx, ny], t0: performance.now() };
  o.x = nx; o.y = ny; SFX.step(o.x + o.y); owReveal(g); owHud();
  if (o.x === M.core[0] && o.y === M.core[1] && S.g[g].layer >= 3 && !o.coreSeen) { o.coreSeen = true; owSay('her core. quiet in here.'); }
}
async function owGate(G) {
  const g = OW.g, ks = owKeys(g)[G.layer - 1];
  if (G.layer > S.g[g].layer + 1) { SFX.bump(); owSay('this gate is behind another one.'); return; }
  if (ks.have < G.need) { SFX.bump(); OW.shake = performance.now(); owSay(`locked · ${ks.have}/${G.need} keys`); return; }
  // open it: a layer of her comes off
  OW.frozen = true; SFX.gate(); OW.gateFx = { G, t0: performance.now() };
  await wait(REDUCED ? 100 : 1300);
  S.g[g].layer = Math.max(S.g[g].layer, G.layer); OW.frozen = false; OW.gateFx = null;
  if (g === 'ray') { owHud(); save(); rayFinale(); return; }
  owSay(G.layer >= 3 ? 'the last gate is open.' : `gate ${G.layer} open · layer ${G.layer} faced`);
  owHud(); renderFeed(); save();
  sessionLayerOpened(g, G.layer);
}

/* ---------------- diving into a memory: the projector, inside the Fix-it window ---------------- */
function owEnter() {
  const g = OW.g, o = owState(g), M = owBuild(g), ni = M.nodeAt.get(o.y * M.W + o.x);
  if (ni == null) { owSay('nothing here. find a glowing tile.'); SFX.tick(); return; }
  const n = M.nodes[ni], p = PANELS.find(q => q.id === n.pid); if (!p) return;
  if (g === 'ray' && rayLocked(n)) { SFX.bump(); OW.shake = performance.now(); owSay(`locked · held by ${n.src}`); runDialogue(seq('boss', 'boss', endSteps('ray_level_locked'), 'NONE')); return; }
  OW.mode = 'level'; cancelAnimationFrame(OW.raf); OW.raf = 0; owDispose3();
  SFX.link(); glitch('soft');
  const host = $('#ow-main'); if (!host) return;
  const inL = M.nodes.filter(m => m.layer === n.layer);
  PJ_STORY = { g, node: n, spend: owStorySpend, undo: owStoryUndo, locked: owLocked, win: owLevelWon, back: owBack }; OW.costs = [];
  pjNew(p);
  renderProjector(host, p, n.i + 1, inL.length);
  owHud();
  document.removeEventListener('keydown', pjKey); document.addEventListener('keydown', pjKey);
}
// the projector's bar in story mode: back to the map instead of the panel list; no answer button, no editor
function storyProjectorChrome(b, p) {
  const back = $('#pj-back', b); back.textContent = '◂ Map'; back.onclick = () => { SFX.click(); owBack(); };
  ['#pj-sol', '#pj-next', '#pj-solbox'].forEach(s => { const e = $(s, b); if (e) e.remove(); });
  const ed = $('[data-m="edit"]', b); if (ed) ed.remove();
  const bk = $('[data-m="back"] span', b); if (bk) bk.textContent = 'Back to the map';
  const dbg = $('.pj-debug', b); if (dbg) dbg.remove();
  const rs = $('#pj-reset', b); rs.onclick = () => { if (owLocked()) { SFX.buzz(); return; } pjReset(); owStorySpend('reset'); };
  const um = $('[data-m="undo"]', b); if (um) um.onclick = () => owStoryUndo();
  const rm = $('[data-m="reset"]', b); if (rm) rm.onclick = () => { if (owLocked()) { SFX.buzz(); return; } pjReset(); owStorySpend('reset'); };
  const bm = $('[data-m="back"]', b); if (bm) bm.onclick = () => { SFX.click(); owBack(); };
}
function owBack() {
  if (!PJ_STORY) return;
  PJ_STORY = null; pjDispose(); document.removeEventListener('keydown', pjKey);
  OW.mode = 'map';
  const b = WINS.fixit && WINS.fixit.body; if (b) owRenderShell(b);
}
function owLevelWon(p) {
  const g = OW.g, o = owState(g), first = !o.solved[p.id];
  o.solved[p.id] = true; save();
  if (first) { SFX.key(); OW.keyFx = performance.now(); }
  renderFeed();
  if (g === 'ray') { if (first) rayLevelWon(Object.keys(o.solved).length); }
  else sessionLevelWon(g, p, first);
  setTimeout(() => { if (PJ_STORY && PJ && PJ.p === p) { owBack(); } }, REDUCED ? 600 : 2600);
}

/* ---------------- drawing: a tilted top-down board with raised walls ---------------- */
function owLoop() { cancelAnimationFrame(OW.raf); const f = () => { owDraw(); OW.raf = requestAnimationFrame(f); }; OW.raf = requestAnimationFrame(f); }
function owDraw() {
  const cv = $('#ow-cv'); if (!cv || !OW.g || OW.mode !== 'map') return;
  if (OW.v3) { OW.v3.frame(); owDrawMini(); return; }
  const g = OW.g, M = owBuild(g), o = owState(g), T = OW_THEME[g], x = cv.getContext('2d'), now = performance.now();
  const Wp = cv.width, Hp = cv.height, ts = Math.max(48, Math.min(84, Math.floor(Math.min(Wp / 10, Hp / 7.2)))), lift = Math.round(ts * .22);
  // box position (tweened)
  let bx = o.x, by = o.y;
  if (OW.anim) { const k = Math.min(1, (now - OW.anim.t0) / 140), e = OW.anim.bump ? Math.sin(k * Math.PI) : 1 - Math.pow(1 - k, 3); const [fx, fy] = OW.anim.from, [tx, ty] = OW.anim.to; if (OW.anim.bump) { bx = fx + (tx - fx) * e; by = fy + (ty - fy) * e; } else { bx = fx + (tx - fx) * e; by = fy + (ty - fy) * e; } if (k >= 1) OW.anim = null; }
  let camX = bx * ts + ts / 2 - Wp / 2, camY = by * ts + ts / 2 - Hp / 2;
  camX = clamp(camX, -ts, M.W * ts - Wp + ts); camY = clamp(camY, -ts * 1.2, M.H * ts - Hp + ts);
  if (M.W * ts < Wp) camX = (M.W * ts - Wp) / 2; if (M.H * ts < Hp) camY = (M.H * ts - Hp) / 2 - lift / 2;
  const sh = OW.shake && now - OW.shake < 350 ? Math.sin((now - OW.shake) / 18) * 5 * (1 - (now - OW.shake) / 350) : 0;
  x.setTransform(1, 0, 0, 1, Math.round(-camX + sh), Math.round(-camY));
  const bg = x.createLinearGradient(0, camY, 0, camY + Hp); bg.addColorStop(0, '#0d0714'); bg.addColorStop(1, '#1f1030');
  x.fillStyle = bg; x.fillRect(camX - 10, camY - 10, Wp + 20, Hp + 20);
  const seen = o.seen, I = (a, b) => b * M.W + a;
  const x0 = Math.max(0, Math.floor(camX / ts) - 1), x1 = Math.min(M.W - 1, Math.ceil((camX + Wp) / ts) + 1), y0 = Math.max(0, Math.floor(camY / ts) - 1), y1 = Math.min(M.H - 1, Math.ceil((camY + Hp) / ts) + 1);
  // floor
  for (let y = y0; y <= y1; y++) for (let xx = x0; xx <= x1; xx++) {
    const k = I(xx, y), v = M.t[k], px = xx * ts, py = y * ts;
    if (seen[k] !== '1') continue;
    if (v >= 1) { x.fillStyle = T.floor[(xx + y) & 1]; x.fillRect(px, py, ts, ts); }
    if (v === 3 && !owPassable(g, xx, y)) {   // a seal: bars of light until the memory before it is cleared
      x.save(); x.shadowColor = T.acc; x.shadowBlur = 12; x.fillStyle = T.acc; x.globalAlpha = .55 + .25 * Math.sin(now / 250 + xx);
      for (let k = 0; k < 3; k++) x.fillRect(px + ts * (.2 + k * .25), py + ts * .08, ts * .1, ts * .84);
      x.restore();
    }
  }
  // memories
  M.nodes.forEach(n => {
    const k = I(n.x, n.y); if (seen[k] !== '1') return;
    const px = n.x * ts, py = n.y * ts, got = !!o.solved[n.pid], p = PANELS.find(q => q.id === n.pid), pulse = .55 + .45 * Math.sin(now / 420 + n.i);
    x.save(); x.shadowColor = T.acc; x.shadowBlur = got ? 0 : 10 * pulse;
    x.fillStyle = got ? 'rgba(255,255,255,.08)' : T.acc; x.globalAlpha = got ? 1 : .25 + .25 * pulse; x.fillRect(px + 3, py + 3, ts - 6, ts - 6);
    x.globalAlpha = 1; x.strokeStyle = got ? 'rgba(255,255,255,.35)' : T.acc; x.lineWidth = 2; x.strokeRect(px + 4, py + 4, ts - 8, ts - 8); x.restore();
    x.fillStyle = got ? 'rgba(255,255,255,.55)' : '#fff'; x.font = `bold ${Math.round(ts * .34)}px "Courier New", monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(got ? '✓' : g === 'ray' && rayLocked(n) ? '🔒' : String(n.i + 1), px + ts / 2, py + ts / 2 + 1);
    if (p && p.tut && !got) { x.fillStyle = '#ffd86e'; x.font = `bold ${Math.round(ts * .2)}px monospace`; x.fillText('NEW', px + ts / 2, py + ts * .2); }
  });
  // core
  if (seen[I(...M.core)] === '1') { const [cx, cy] = M.core, px = cx * ts + ts / 2, py = cy * ts + ts / 2, r = ts * (.32 + .04 * Math.sin(now / 300)); x.save(); x.shadowColor = T.acc; x.shadowBlur = 18; x.fillStyle = S.g[g].layer >= 3 ? T.acc : '#fff'; x.beginPath(); x.moveTo(px, py - r); x.lineTo(px + r, py); x.lineTo(px, py + r); x.lineTo(px - r, py); x.closePath(); x.fill(); x.restore(); }
  // walls (back to front, so fronts overlap), gates, then the box in its row
  const boxRow = Math.round(by);
  for (let y = y0; y <= y1; y++) {
    for (let xx = x0; xx <= x1; xx++) {
      const k = I(xx, y), v = M.t[k]; if (seen[k] !== '1') { x.fillStyle = '#0a0510'; x.fillRect(xx * ts, y * ts - lift, ts, ts + lift); continue; }
      if (v !== 0) continue;
      const px = xx * ts, py = y * ts;
      x.fillStyle = T.wall; x.fillRect(px, py, ts, ts);          // front face
      x.fillStyle = T.wallTop; x.fillRect(px, py - lift, ts, ts);  // top face
      x.fillStyle = T.acc; x.globalAlpha = .18; x.fillRect(px, py - lift, ts, 2); x.globalAlpha = 1;
    }
    M.gates.forEach(G => { if (G.y - 1 <= y && y === G.y + 1 && seen[I(G.x, G.y)] === '1') owDrawGate(x, G, ts, lift, now); });
    if (y === boxRow) owDrawBox(x, bx, by, ts, lift, T, now);
  }
  // fog edge: a soft vignette
  x.setTransform(1, 0, 0, 1, 0, 0);
  const vg = x.createRadialGradient(Wp / 2, Hp / 2, Math.min(Wp, Hp) * .35, Wp / 2, Hp / 2, Math.max(Wp, Hp) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = vg; x.fillRect(0, 0, Wp, Hp);
  if (OW.keyFx && now - OW.keyFx < 1400) { const k = (now - OW.keyFx) / 1400; x.globalAlpha = 1 - k; x.fillStyle = T.acc; x.font = `bold ${Math.round(28 + k * 10)}px "Courier New", monospace`; x.textAlign = 'center'; x.fillText('+1 KEY', Wp / 2, Hp * .35 - k * 30); x.globalAlpha = 1; }
  owDrawMini();
}
function owDrawGate(x, G, ts, lift, now) {
  const g = OW.g, T = OW_THEME[g], open = owGateOpen(g, G), px = G.x * ts, top = (G.y - 1) * ts - lift, h = ts * 3 + lift;
  const fx = OW.gateFx && OW.gateFx.G === G ? Math.min(1, (now - OW.gateFx.t0) / 1200) : open ? 1 : 0;
  x.save();
  x.fillStyle = '#120818'; x.fillRect(px - ts * .2, top, ts * 1.4, h);
  x.strokeStyle = T.acc; x.lineWidth = 3; x.shadowColor = T.acc; x.shadowBlur = open ? 4 : 12; x.strokeRect(px - ts * .2 + 2, top + 2, ts * 1.4 - 4, h - 4);
  x.shadowBlur = 0;
  // two doors sliding apart
  const dw = ts * .7 * (1 - fx);
  x.fillStyle = '#2a1636'; x.fillRect(px - ts * .2 + 4, top + 4, dw, h - 8); x.fillRect(px + ts * 1.2 - 4 - dw, top + 4, dw, h - 8);
  if (fx < 1) {
    const ks = owKeys(g)[G.layer - 1], cx = px + ts / 2, cy = top + h * .45;
    x.fillStyle = T.acc; x.beginPath(); x.arc(cx, cy - ts * .12, ts * .16, Math.PI, 0); x.lineWidth = 3; x.strokeStyle = T.acc; x.stroke(); x.fillRect(cx - ts * .22, cy - ts * .1, ts * .44, ts * .34);
    x.fillStyle = '#fff'; x.font = `bold ${Math.round(ts * .3)}px "Courier New", monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(`${ks.have}/${G.need}`, cx, top + h * .78);
  }
  x.fillStyle = 'rgba(255,255,255,.7)'; x.font = `bold ${Math.round(ts * .2)}px monospace`; x.textAlign = 'center'; x.fillText(`LAYER ${G.layer}`, px + ts / 2, top + ts * .3);
  x.restore();
}
function owDrawBox(x, bx, by, ts, lift, T, now) {
  const s = ts * .7, px = bx * ts + (ts - s) / 2, py = by * ts + (ts - s) / 2 - lift * .3, bob = Math.sin(now / 380) * 1.5;
  x.save();
  x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(bx * ts + ts / 2, by * ts + ts * .78, s * .5, s * .18, 0, 0, 7); x.fill();
  x.fillStyle = shade(T.acc); x.fillRect(px, py + s * .45 + bob, s, s * .45);           // front
  x.fillStyle = T.acc; x.shadowColor = T.acc; x.shadowBlur = 12; x.fillRect(px, py - s * .1 + bob, s, s * .58); // top
  x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px + 3, py - s * .1 + 3 + bob, s - 6, 3);
  x.restore();
}
function owDrawMini() {
  const mc = $('#ow-mini'); if (!mc || !OW.g) return;
  const g = OW.g, M = owBuild(g), o = owState(g), T = OW_THEME[g], s = 4;
  if (mc.width !== M.W * s + 8) { mc.width = M.W * s + 8; mc.height = M.H * s + 8; }
  const x = mc.getContext('2d'); x.clearRect(0, 0, mc.width, mc.height);
  x.fillStyle = 'rgba(10,5,16,.85)'; x.fillRect(0, 0, mc.width, mc.height);
  for (let y = 0; y < M.H; y++) for (let xx = 0; xx < M.W; xx++) {
    const k = y * M.W + xx; if (o.seen[k] !== '1') continue;
    const v = M.t[k]; x.fillStyle = v === 1 ? 'rgba(255,255,255,.28)' : v === 2 ? (owGateOpen(g, M.gates.find(G => G.x === xx && G.y === y)) ? 'rgba(255,255,255,.5)' : T.acc) : 'rgba(255,255,255,.05)';
    x.fillRect(4 + xx * s, 4 + y * s, s, s);
  }
  M.nodes.forEach(n => { if (o.seen[n.y * M.W + n.x] !== '1') return; x.fillStyle = o.solved[n.pid] ? '#7be3a4' : T.acc; x.fillRect(4 + n.x * s, 4 + n.y * s, s, s); });
  if ((performance.now() / 300 | 0) % 2) { x.fillStyle = '#fff'; x.fillRect(3 + o.x * s, 3 + o.y * s, s + 2, s + 2); }
}
