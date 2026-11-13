/* =========================================================
   DESIGNER KIT (Test chamber) · apps, every girl's map, a map editor,
   jump to the big days, cutscenes, the boss's level, a gallery.
   Plus Boss's journal as a book: one page per girl.
   ========================================================= */
const KIT_APPS = ['MusicBox.exe', 'UnitConv.exe', 'Fortune.exe', 'Atlas.exe'];
const KIT_OPEN = { 'MusicBox.exe': () => openMusicBox(), 'UnitConv.exe': () => openConv(), 'Fortune.exe': () => openFortune(), 'Atlas.exe': () => openAtlas() };
const KIT = { tab: 'apps', g: 'prim' };
function openKit() {
  openWin('kit', { title: 'Designer kit', icon: 'puzzle', w: 780, h: 580, x: 120, y: 20, render: (b, rec) => { addUpd(rec, () => kitRender(b)); kitRender(b); } });
}
const KIT_TABS = [['apps', 'Apps'], ['nights', 'Night talks'], ['maps', 'Maps'], ['medit', 'Map editor'], ['events', 'Big days'], ['cuts', 'Cutscenes'], ['boss', 'Boss level'], ['gallery', 'Gallery']];
function kitRender(b) {
  if (KIT.tab === 'medit' && $('#me-cv', b)) return;   // the editor redraws itself
  b.innerHTML = `<div class="kit"><div class="kit-tabs">${KIT_TABS.map(([k, t]) => `<button class="kit-tab${KIT.tab === k ? ' on' : ''}" data-k="${k}">${t}</button>`).join('')}</div><div class="kit-body sunk" id="kit-body"></div></div>`;
  $$('.kit-tab', b).forEach(x => x.onclick = () => { SFX.click(); KIT.tab = x.dataset.k; b.innerHTML = ''; kitRender(b); });
  const body = $('#kit-body', b);
  ({ apps: kitApps, nights: kitNights, maps: kitMaps, medit: kitMapEditor, events: kitEvents, cuts: kitCuts, boss: kitBoss, gallery: kitGallery })[KIT.tab](body);
}

/* ---------- apps ---------- */
function kitApps(el) {
  el.innerHTML = `<p class="kit-p">Every app the girls can send. <b>Launch</b> runs it with its boot popup, <b>Install</b> runs the setup wizard first (like opening it from DiveMail).</p>
    <div class="kit-grid">${KIT_APPS.map(n => `<div class="kit-card bevel"><div class="kit-ic">${icon(APPICON[n] || 'exe')}</div><b>${n}</b><small>${esc(Object.entries(REWARD).find(([g, r]) => (r[1].atts || []).some(a => a.name === n)) ? 'from ' + GIRLS[Object.entries(REWARD).find(([g, r]) => (r[1].atts || []).some(a => a.name === n))[0]].name + ' · layer 1' : '')}</small>
      <div class="row"><button class="btn primary" data-l="${n}">Launch</button><button class="btn" data-i="${n}">Install</button></div></div>`).join('')}</div>
    <div class="kit-row"><label>Day for the coin market <input type="number" id="kit-day" min="1" max="15" value="${S.day}"></label><button class="btn" id="kit-q">Test Paige's timed question</button></div>`;
  $$('[data-l]', el).forEach(x => x.onclick = () => { SFX.click(); if (!S.apps.includes(x.dataset.l)) S.apps.push(x.dataset.l); launchApp(x.dataset.l, KIT_OPEN[x.dataset.l]); });
  $$('[data-i]', el).forEach(x => x.onclick = async () => { SFX.click(); await installApp(x.dataset.i); if (!S.apps.includes(x.dataset.i)) S.apps.push(x.dataset.i); launchApp(x.dataset.i, KIT_OPEN[x.dataset.i]); });
  $('#kit-day', el).onchange = e => { S.day = clamp(+e.target.value || 1, 1, 15); if (WINS.conv) { closeWin('conv'); openConv(); } };
  $('#kit-q', el).onclick = () => {
    SFX.click(); S.met.paige = true; S.g.paige.layer = 1; S.g.paige.ntDone = []; S.phase = 'night';
    openYap('paige'); S.tqNext = 'paige_coinq'; runDialogue(seq('paige', 'paige', [{ lines: TIMED_QS.paige_coinq.intro }], 'TIMED_Q'));
  };
}

/* ---------- night talks: play any girl's night chat or any of Boss's night questions ---------- */
function kitNights(el) {
  const g = KIT.ng || (KIT.ng = 'prim');
  const chats = DD.nightIdx.filter(e => e.girl === g), boss = DD.boss.filter(e => !e.girl || e.girl === g);
  el.innerHTML = `<p class="kit-p">Play any night talk on its own (Yappy opens). <b>Simulate a night</b> runs the real night flow after a day working with her: Boss and she both message you; she can't be ignored.</p>
    <div class="kit-row">${PLAYABLE.map(k => `<button class="btn${k === g ? ' primary' : ''}" data-ng="${k}">${esc(GIRLS[k].name)}</button>`).join('')}<button class="btn primary" id="kn-sim">Simulate a night with ${esc(GIRLS[g].name)}</button></div>
    <h4>${esc(GIRLS[g].name)} · night chats (${chats.length})</h4><div class="kit-talk">${chats.map(e => `<button class="btn" data-nc="${e.id}" title="layer ${e.layer} · ${e.by === 'girl' ? 'she writes first' : 'you write first'}">${esc(e.id)} <small>L${e.layer}${e.by === 'girl' ? ' · ✉' : ''}</small></button>`).join('') || '<i>none</i>'}</div>
    <h4>Boss · night questions about ${esc(GIRLS[g].name)} (${boss.length})</h4><div class="kit-talk">${boss.map((e, i) => `<button class="btn" data-nb="${i}">${esc(e.id)} <small>${esc(e.kind)}${e.day ? ' · day ' + esc(e.day) : ''}</small></button>`).join('') || '<i>none</i>'}</div>`;
  $$('[data-ng]', el).forEach(x => x.onclick = () => { KIT.ng = x.dataset.ng; kitNights(el); });
  const ready = () => { S.met[g] = true; S.g[g].sessions = Math.max(1, S.g[g].sessions || 0); if (S.active) { S.active = null; S.queue = []; } };
  $$('[data-nc]', el).forEach(x => x.onclick = () => { SFX.click(); ready(); const d = DD.night[x.dataset.nc]; if (!d) return; openYap(g); runDialogue(seq(g, g, playSteps(d.steps), 'NONE')); });
  $$('[data-nb]', el).forEach(x => x.onclick = () => { SFX.click(); ready(); const e = boss[+x.dataset.nb]; openYap('boss'); runDialogue(seq('boss', 'boss', playSteps(e.steps, { girl: GIRLS[g].name }), 'NONE')); });
  $('#kn-sim', el).onclick = () => { SFX.click(); ready(); S.phase = 'day'; S.todayWorked = [g]; S.session = null; S.g[g].ntDone = S.g[g].ntDone || []; goNight(); };
}

/* ---------- maps: walk any girl's map, at any progress ---------- */
function kitMaps(el) {
  const st = KIT.mapL || (KIT.mapL = {});
  el.innerHTML = `<p class="kit-p">Walk a girl's map exactly as in the story (no minutes spent). Pick how many gates are already open.</p>
    <div class="kit-grid">${PLAYABLE.map(g => `<div class="kit-card bevel">${avHTML(g)}<b>${esc(GIRLS[g].name)}</b><small>${mapOverride(g) ? '<span class="chip">custom layout</span>' : 'built from her panels'}</small>
      <label>Gates open <select data-gl="${g}">${[0, 1, 2, 3].map(L => `<option value="${L}"${(st[g] || 0) === L ? ' selected' : ''}>${L}</option>`).join('')}</select></label>
      <label><input type="checkbox" data-gs="${g}"> memories before it solved</label>
      <button class="btn primary" data-m="${g}">Open map</button></div>`).join('')}</div>`;
  $$('[data-gl]', el).forEach(x => x.onchange = () => { st[x.dataset.gl] = +x.value; });
  $$('[data-m]', el).forEach(x => x.onclick = () => { SFX.click(); const g = x.dataset.m; kitWalk(g, st[g] || 0, $(`[data-gs="${g}"]`, el).checked); });
}
function kitWalk(g, L, solved) {
  if (WINS.fixit) { owClose && owClose(); closeWin('fixit'); }
  delete OWMAP[g]; S.met[g] = true; S.g[g].layer = L; S.g[g].ow = null; S.phase = 'day'; S.session = null;
  const M = owBuild(g), o = owState(g);
  if (solved) M.nodes.filter(n => n.layer <= L).forEach(n => o.solved[n.pid] = true);
  else M.nodes.filter(n => n.layer <= L && n.tut).forEach(n => o.solved[n.pid] = true);
  openWorld(g);
}

/* ---------- map editor ---------- */
const MAPS_KEY = 'cyfh_maps';
let MAPS_CACHE = null;
function mapsStore() { if (!MAPS_CACHE) { try { MAPS_CACHE = JSON.parse(localStorage.getItem(MAPS_KEY)) || {}; } catch (e) { MAPS_CACHE = {}; } } return MAPS_CACHE; }
function mapsSave() { try { localStorage.setItem(MAPS_KEY, JSON.stringify(mapsStore())); } catch (e) { } }
// layout → the map the game walks: { W, H, t, nodes, gates, seals, start, core, nodeAt }
function mapFromLayout(g, L) {
  const W = L.W, H = L.H, t = new Uint8Array(W * H), ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  L.cells.forEach(([x, y, v]) => { if (ok(x, y)) t[y * W + x] = v; });
  const ps = id => PANELS.find(p => p.id === id);
  const raw = L.nodes.filter(n => ps(n.pid) && ok(n.x, n.y)).map(n => ({ ...n, layer: ps(n.pid).layer, tut: !!ps(n.pid).tut }));
  const nodes = [];
  [1, 2, 3].forEach(Ly => raw.filter(n => n.layer === Ly).sort((a, b) => a.x - b.x || a.y - b.y).forEach((n, i) => { t[n.y * W + n.x] = t[n.y * W + n.x] || 1; nodes.push({ x: n.x, y: n.y, layer: Ly, pid: n.pid, i, tut: n.tut }); }));
  const gates = L.gates.filter(q => ok(q.x, q.y)).map(q => { const total = nodes.filter(n => n.layer === q.layer).length; t[q.y * W + q.x] = 2; return { x: q.x, y: q.y, layer: q.layer, total, need: q.need || keysNeed(total) }; }).sort((a, b) => a.layer - b.layer);
  const seals = L.seals.filter(q => ok(q.x, q.y)).map(q => { t[q.y * W + q.x] = 3; return { x: q.x, y: q.y, pid: q.pid }; });
  return { g, W, H, t, nodes, gates, seals, start: L.start, core: L.core, nodeAt: new Map(nodes.map((n, k) => [n.y * W + n.x, k])), custom: true };
}
function mapOverride(g) { if (g === 'ray' || S.flags.noOverride) return null; const L = mapsStore()[g]; return L && L.on ? mapFromLayout(g, L) : null; }
function layoutFromMap(M) {
  const cells = []; for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) { const v = M.t[y * M.W + x]; if (v === 1) cells.push([x, y, 1]); }
  return { W: M.W, H: M.H, cells, nodes: M.nodes.map(n => ({ x: n.x, y: n.y, pid: n.pid })), gates: M.gates.map(q => ({ x: q.x, y: q.y, layer: q.layer, need: q.need })), seals: M.seals.map(q => ({ x: q.x, y: q.y, pid: q.pid })), start: M.start.slice(), core: M.core.slice() };
}
function generatedMap(g) { S.flags.noOverride = true; delete OWMAP[g]; const M = owBuild(g); delete OWMAP[g]; S.flags.noOverride = false; return M; }
const ME = { g: null, L: null, tool: 'floor', pid: '', layer: 1, need: 0, cs: 18 };
function kitMapEditor(el) {
  if (ME.g !== KIT.g || !ME.L) { ME.g = KIT.g; const saved = mapsStore()[ME.g]; ME.L = saved ? JSON.parse(JSON.stringify(saved)) : layoutFromMap(generatedMap(ME.g)); }
  const ps = panelsOf(ME.g).sort((a, b) => a.layer - b.layer || (a.tut ? -1 : 0) - (b.tut ? -1 : 0) || a.n - b.n);
  const on = mapsStore()[ME.g] && mapsStore()[ME.g].on;
  el.innerHTML = `<div class="me">
    <div class="me-bar">${PLAYABLE.map(g => `<button class="btn${g === ME.g ? ' primary' : ''}" data-mg="${g}">${esc(GIRLS[g].name)}</button>`).join('')}<span class="sp"></span>
      <label>W <input type="number" id="me-w" value="${ME.L.W}" min="8" max="120"></label><label>H <input type="number" id="me-h" value="${ME.L.H}" min="5" max="25"></label></div>
    <div class="me-tools">${[['floor', 'Floor'], ['erase', 'Erase'], ['node', 'Memory'], ['seal', 'Seal'], ['gate', 'Gate'], ['start', 'Start'], ['core', 'Core']].map(([k, t]) => `<button class="me-t${ME.tool === k ? ' on' : ''}" data-t="${k}">${t}</button>`).join('')}
      <select id="me-pid" title="Panel for Memory / Seal"><option value="">— panel —</option>${ps.map(p => `<option value="${p.id}"${ME.pid === p.id ? ' selected' : ''}>L${p.layer} · ${p.id}${p.tut ? ' (tut)' : ''}${ME.L.nodes.some(n => n.pid === p.id) ? ' ✓' : ''}</option>`).join('')}</select>
      <label>gate layer <select id="me-layer">${[1, 2, 3].map(L => `<option${ME.layer === L ? ' selected' : ''}>${L}</option>`).join('')}</select></label>
      <label>keys <input type="number" id="me-need" value="${ME.need || ''}" placeholder="auto" min="0" max="40" style="width:52px"></label></div>
    <div class="me-wrap"><canvas id="me-cv"></canvas></div>
    <div class="me-info" id="me-info"></div>
    <div class="me-btns"><button class="btn" id="me-gen">Reset to generated</button><button class="btn" id="me-clear">Clear</button><button class="btn primary" id="me-test">Test in 3D</button>
      <button class="btn${on ? ' primary' : ''}" id="me-use">${on ? '✓ Used in the game' : 'Use in the game'}</button><button class="btn" id="me-off">Remove custom</button><button class="btn" id="me-copy">Copy JSON</button><button class="btn" id="me-paste">Paste JSON</button></div></div>`;
  $$('[data-mg]', el).forEach(x => x.onclick = () => { KIT.g = x.dataset.mg; ME.g = null; kitMapEditor(el); });
  $$('.me-t', el).forEach(x => x.onclick = () => { ME.tool = x.dataset.t; $$('.me-t', el).forEach(y => y.classList.toggle('on', y === x)); });
  $('#me-pid', el).onchange = e => { ME.pid = e.target.value; if (ME.tool !== 'seal') ME.tool = 'node'; $$('.me-t', el).forEach(y => y.classList.toggle('on', y.dataset.t === ME.tool)); };
  $('#me-layer', el).onchange = e => { ME.layer = +e.target.value; ME.tool = 'gate'; $$('.me-t', el).forEach(y => y.classList.toggle('on', y.dataset.t === 'gate')); };
  $('#me-need', el).onchange = e => { ME.need = +e.target.value || 0; };
  const resize = () => { ME.L.W = clamp(+$('#me-w', el).value || ME.L.W, 8, 120); ME.L.H = clamp(+$('#me-h', el).value || ME.L.H, 5, 25); meDraw(el); };
  $('#me-w', el).onchange = resize; $('#me-h', el).onchange = resize;
  $('#me-gen', el).onclick = () => { ME.L = layoutFromMap(generatedMap(ME.g)); kitMapEditor(el); };
  $('#me-clear', el).onclick = () => { ME.L = { W: ME.L.W, H: ME.L.H, cells: [], nodes: [], gates: [], seals: [], start: [1, ME.L.H >> 1], core: [ME.L.W - 3, ME.L.H >> 1] }; kitMapEditor(el); };
  $('#me-test', el).onclick = () => { SFX.click(); mapsStore()['_test_' + ME.g] = ME.L; const g = ME.g; delete OWMAP[g]; OWMAP[g] = mapFromLayout(g, ME.L); S.g[g].layer = 0; S.g[g].ow = null; S.met[g] = true; if (WINS.fixit) { owClose(); closeWin('fixit'); } OWMAP[g] = mapFromLayout(g, ME.L); openWorld(g); };
  $('#me-use', el).onclick = () => { mapsStore()[ME.g] = { ...JSON.parse(JSON.stringify(ME.L)), on: true }; mapsSave(); delete OWMAP[ME.g]; toast('Map editor', `${GIRLS[ME.g].name}'s map: your layout is used in the game (this browser).`); kitMapEditor(el); };
  $('#me-off', el).onclick = () => { delete mapsStore()[ME.g]; mapsSave(); delete OWMAP[ME.g]; ME.g = null; kitMapEditor(el); };
  $('#me-copy', el).onclick = async () => { const t = JSON.stringify({ [ME.g]: ME.L }); try { await navigator.clipboard.writeText(t); toast('Map editor', 'Layout copied as JSON.'); } catch (e) { prompt('Copy this JSON', t); } };
  $('#me-paste', el).onclick = () => { const t = prompt('Paste a layout JSON'); if (!t) return; try { const o = JSON.parse(t), L = o[ME.g] || o; if (!L.cells || !L.W) throw 0; ME.L = L; kitMapEditor(el); } catch (e) { toast('Map editor', 'That is not a layout.'); } };
  const cv = $('#me-cv', el); let down = false;
  const cellAt = e => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / ME.cs), Math.floor((e.clientY - r.top) / ME.cs)]; };
  cv.onpointerdown = e => { down = true; cv.setPointerCapture(e.pointerId); meApply(...cellAt(e), el); };
  cv.onpointermove = e => { if (down && (ME.tool === 'floor' || ME.tool === 'erase')) meApply(...cellAt(e), el); };
  cv.onpointerup = () => { down = false; };
  meDraw(el);
}
function meApply(x, y, el) {
  const L = ME.L; if (x < 0 || y < 0 || x >= L.W || y >= L.H) return;
  const at = q => q.x === x && q.y === y, clr = () => { L.cells = L.cells.filter(c => !(c[0] === x && c[1] === y)); L.nodes = L.nodes.filter(q => !at(q)); L.gates = L.gates.filter(q => !at(q)); L.seals = L.seals.filter(q => !at(q)); };
  const floor = () => { if (!L.cells.some(c => c[0] === x && c[1] === y)) L.cells.push([x, y, 1]); };
  if (ME.tool === 'floor') floor();
  else if (ME.tool === 'erase') clr();
  else if (ME.tool === 'node') { if (!ME.pid) { toast('Map editor', 'Pick a panel first.'); return; } L.nodes = L.nodes.filter(q => q.pid !== ME.pid && !at(q)); floor(); L.nodes.push({ x, y, pid: ME.pid }); }
  else if (ME.tool === 'seal') { if (!ME.pid) { toast('Map editor', 'Pick the panel this seal waits for.'); return; } clr(); L.seals.push({ x, y, pid: ME.pid }); }
  else if (ME.tool === 'gate') { clr(); L.gates = L.gates.filter(q => q.layer !== ME.layer); L.gates.push({ x, y, layer: ME.layer, need: ME.need || 0 }); }
  else if (ME.tool === 'start') { floor(); L.start = [x, y]; }
  else if (ME.tool === 'core') { floor(); L.core = [x, y]; }
  meDraw(el);
}
function meDraw(el) {
  const L = ME.L, cv = $('#me-cv', el); if (!cv) return;
  const wrap = $('.me-wrap', el); ME.cs = clamp(Math.floor(Math.min((wrap.clientWidth || 700) / L.W, 330 / L.H)), 18, 28);   // big enough to click; the strip scrolls sideways
  const cs = ME.cs; cv.width = L.W * cs; cv.height = L.H * cs;
  const x = cv.getContext('2d'), T = OW_THEME[ME.g], ps = id => PANELS.find(p => p.id === id);
  x.fillStyle = '#1a1024'; x.fillRect(0, 0, cv.width, cv.height);
  x.strokeStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i <= L.W; i++) { x.beginPath(); x.moveTo(i * cs, 0); x.lineTo(i * cs, cv.height); x.stroke(); } for (let j = 0; j <= L.H; j++) { x.beginPath(); x.moveTo(0, j * cs); x.lineTo(cv.width, j * cs); x.stroke(); }
  L.cells.forEach(([cx, cy]) => { x.fillStyle = (cx + cy) & 1 ? T.floor[1] : T.floor[0]; x.fillRect(cx * cs + 1, cy * cs + 1, cs - 2, cs - 2); });
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${Math.round(cs * .5)}px monospace`;
  const LC = ['', '#7fd6ff', '#ffd86e', '#ff7aa8'];
  L.nodes.forEach(n => { const p = ps(n.pid); x.fillStyle = p ? LC[p.layer] : '#888'; x.fillRect(n.x * cs + 2, n.y * cs + 2, cs - 4, cs - 4); x.fillStyle = '#1a1024'; x.fillText(p && p.tut ? 'T' : String(p ? p.layer : '?'), n.x * cs + cs / 2, n.y * cs + cs / 2 + 1); });
  L.seals.forEach(q => { x.strokeStyle = T.acc; x.lineWidth = 2; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(q.x * cs + cs * (.25 + i * .25), q.y * cs + 3); x.lineTo(q.x * cs + cs * (.25 + i * .25), q.y * cs + cs - 3); x.stroke(); } });
  L.gates.forEach(q => { x.fillStyle = '#2a1636'; x.fillRect(q.x * cs + 1, q.y * cs + 1, cs - 2, cs - 2); x.strokeStyle = T.acc; x.lineWidth = 2; x.strokeRect(q.x * cs + 2, q.y * cs + 2, cs - 4, cs - 4); x.fillStyle = T.acc; x.fillText('G' + q.layer, q.x * cs + cs / 2, q.y * cs + cs / 2 + 1); });
  x.fillStyle = '#7dff9a'; x.fillText('S', L.start[0] * cs + cs / 2, L.start[1] * cs + cs / 2 + 1);
  x.fillStyle = '#fff'; x.fillText('◆', L.core[0] * cs + cs / 2, L.core[1] * cs + cs / 2 + 1);
  // checks: panels not placed, memories you can't reach from the start
  const M = mapFromLayout(ME.g, L), seen = new Set([L.start.join(',')]), q = [L.start.slice()];
  while (q.length) { const [a, b] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = a + dx, ny = b + dy, k = nx + ',' + ny; if (nx < 0 || ny < 0 || nx >= M.W || ny >= M.H || seen.has(k) || !M.t[ny * M.W + nx]) continue; seen.add(k); q.push([nx, ny]); } }
  const missing = panelsOf(ME.g).filter(p => !L.nodes.some(n => n.pid === p.id)), cut = L.nodes.filter(n => !seen.has(n.x + ',' + n.y));
  const per = [1, 2, 3].map(Ly => `L${Ly}: ${M.nodes.filter(n => n.layer === Ly).length} memories · gate ${(M.gates.find(g => g.layer === Ly) || {}).need ?? '—'} keys`).join(' · ');
  $('#me-info', el).innerHTML = `${per}<br>${missing.length ? `<span class="warn">Not on the map (${missing.length}): ${missing.slice(0, 12).map(p => p.id).join(', ')}${missing.length > 12 ? '…' : ''}</span>` : '<span class="ok">Every panel is on the map.</span>'}${cut.length ? ` · <span class="warn">${cut.length} memory tile(s) not connected to the start</span>` : ''}
    ${M.gates.length < 3 ? ' · <span class="warn">fewer than 3 gates</span>' : ''}`;
}

/* ---------- big days: start a real game at that day (your save is kept aside) ---------- */
const KIT_DAYS = [[1, 'Day 1 · first day'], [7, 'Day 7 · Postcard Day'], [10, 'Day 10 · Inspection'], [12, 'Day 12 · Showcase'], [14, 'Day 14 · last day (farewells)'], [15, 'Day 15 · Reckoning']];
function kitEvents(el) {
  el.innerHTML = `<p class="kit-p">Starts the real game on that morning, in a test run. Your own save is put aside and comes back with <b>Restore my save</b> on the test banner.</p>
    <div class="kit-row"><label>Progress <select id="ev-pre"><option value="typical">typical for that day</option><option value="all">every gate open</option><option value="none">no gates open</option></select></label>
      <label><input type="checkbox" id="ev-true"> every girl was told to follow her real passion (Showcase: the real pieces)</label></div>
    <div class="kit-list">${KIT_DAYS.map(([d, t]) => `<button class="btn" data-d="${d}">${t}</button>`).join('')}</div>`;
  $$('[data-d]', el).forEach(x => x.onclick = () => kitTestRun(+x.dataset.d, $('#ev-pre', el).value, $('#ev-true', el).checked));
}
function kitTestRun(day, preset, passion) {
  try { const cur = localStorage.getItem(SAVE_KEY); if (cur && !JSON.parse(cur).flags.testRun && !localStorage.getItem(SAVE_KEY + '_kept')) localStorage.setItem(SAVE_KEY + '_kept', cur); } catch (e) { }
  const T = fresh(); T.player = { name: 'Tester', hair: 0, hc: 0, eye: 11, skin: 1, outfit: 0, oc: 7, acc: 0 }; T.player.avatar = avatarURL(T.player);
  T.day = day; T.flags = { testRun: true, briefed: true, briefStarted: true, welcomeMail: true, tutMap: true, owTutorial: true, probation: true };
  const keep = S; S = T;
  PLAYABLE.forEach(g => {
    if (GIRLS[g].from > day) return; T.met[g] = true;
    const L = preset === 'all' ? 3 : preset === 'none' ? 0 : clamp(Math.floor((day - GIRLS[g].from) / 3.2), 0, 3);
    T.g[g].layer = L; T.g[g].ow = null; delete OWMAP[g];
    const M = owBuild(g), o = owState(g);
    for (let Ly = 1; Ly <= L; Ly++) { const ns = M.nodes.filter(n => n.layer === Ly), G = M.gates[Ly - 1]; ns.filter(n => n.tut).concat(ns.filter(n => !n.tut)).slice(0, Math.max(G ? G.need : 0, ns.filter(n => n.tut).length)).forEach(n => o.solved[n.pid] = true); }
    if (L >= 1) (REWARD[g][1].atts || []).forEach(a => { if (a.kind === 'app' && !T.apps.includes(a.name)) T.apps.push(a.name); });
    if (L >= 2) (REWARD[g][2].atts || []).forEach(a => { if (a.kind === 'mem' && !T.mementos.includes(a.name)) T.mementos.push(a.name); });
    if (passion) T.flags[g + '_true'] = true;
  });
  if (passion) T.flags.prim_music = true;
  T.at = day >= RECKON_DAY ? 'reckoning' : 'am'; if (day >= RECKON_DAY) T.day = LAST_DAY;
  S = keep;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(T)); sessionStorage.setItem('cyfh_autostart', '1'); } catch (e) { toast('Big days', 'Could not write the test save.'); return; }
  location.reload();
}
function testRunBanner() {
  const el = document.createElement('div'); el.id = 'testbar';
  el.innerHTML = `<b>TEST RUN</b> · day ${S.day} <button class="btn" id="tb-back">Restore my save</button>`;
  document.body.appendChild(el);
  $('#tb-back', el).onclick = () => { try { const k = localStorage.getItem(SAVE_KEY + '_kept'); if (k) localStorage.setItem(SAVE_KEY, k); else localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '_kept'); } catch (e) { } location.reload(); };
}

/* ---------- cutscenes ---------- */
function kitCuts(el) {
  el.innerHTML = `<p class="kit-p">Play the cutscenes and screen effects on their own.</p>
    <h4>Memories (the reckoning)</h4><div class="kit-list">${[1, 2, 3, 4, 5].map(k => `<button class="btn" data-mem="${k}">Memory ${k}</button>`).join('')}</div>
    <h4>Screen effects</h4><div class="kit-list"><button class="btn" data-fx="quake">Earthquake</button><button class="btn" data-fx="soft">Glitch (soft)</button><button class="btn" data-fx="hard">Glitch (hard)</button><button class="btn" data-fx="wake">Wake up</button><button class="btn" data-fx="lock">Lock screen</button><button class="btn" data-fx="feed">Break-layer effect</button></div>
    <h4>Talks</h4><div class="kit-list">${['reckoning_morning', 'reckoning_reveal', 'reckoning_map', 'final_talk'].map(k => `<button class="btn" data-talk="${k}">${k}</button>`).join('')}</div>
    <h4>Endings</h4><div class="kit-list"><button class="btn" data-end="reckoning">Reckoning ending</button><button class="btn" data-end="deadline">Deadline ending</button><button class="btn" id="cu-journal">Boss's journal (sample)</button><button class="btn" id="cu-show">Showcase window</button></div>`;
  $$('[data-mem]', el).forEach(x => x.onclick = () => { SFX.click(); playMemory(+x.dataset.mem); });
  $$('[data-fx]', el).forEach(x => x.onclick = async () => {
    const f = x.dataset.fx;
    if (f === 'quake') { delete S.flags['quake' + S.day]; earthquake(); }
    else if (f === 'soft' || f === 'hard') glitch(f);
    else if (f === 'wake') { const bo = document.createElement('div'); bo.id = 'blackout'; document.body.appendChild(bo); await wait(600); await wakeUp(); }
    else if (f === 'lock') await lockScreen('Good morning');
    else if (f === 'feed') { S.met.prim = true; if (typeof breakLayerFx === 'function') breakLayerFx('prim', 1); }
  });
  $$('[data-talk]', el).forEach(x => x.onclick = () => { SFX.click(); openYap('boss'); runDialogue(seq('boss', 'boss', endSteps(x.dataset.talk), 'NONE')); });
  $$('[data-end]', el).forEach(x => x.onclick = () => { kitSample(); endGame(x.dataset.end); });
  $('#cu-journal', el).onclick = () => { kitSample(); openJournal(); };
  $('#cu-show', el).onclick = () => { kitSample(); S.day = SHOWCASE_DAY; openShowcase(); };
}
// sandbox data so journal / endings / showcase have something to show
function kitSample() {
  PLAYABLE.forEach(g => { S.met[g] = true; });
  if (!S.journal.length) {
    const pick = g => { const e = DD.boss.find(e => e.girl === g && e.steps.some(st => (st.choices || []).some(c => (c.act || []).some(a => a.action === 'JOURNAL')))); if (!e) return []; const out = []; e.steps.forEach(st => (st.choices || []).forEach(c => (c.act || []).forEach(a => { if (a.action === 'JOURNAL' && out.length < 2) out.push(a.value); }))); return out; };
    PLAYABLE.forEach((g, i) => pick(g).forEach((t, k) => S.journal.push({ day: 2 + i * 2 + k, text: t, g })));
    S.journal.push({ day: 7, text: 'Postcard Day. I wrote to Santorini again. I always write to Santorini.' });
  }
  S.exhibit = S.exhibit || {}; PLAYABLE.forEach((g, i) => { if (!S.exhibit[g]) S.exhibit[g] = { kind: i % 2 ? 'real' : 'half', day: SHOWCASE_DAY }; });
}

/* ---------- the boss's level ---------- */
function kitBoss(el) {
  const ps = rayPanels();
  el.innerHTML = `<p class="kit-p">Ray's map on the last day: four memories, each copied from one girl's panel and locked until her file is deleted, then the gate and the core.</p>
    <div class="kit-grid">${RAY_SRC.map(([g, id], i) => `<div class="kit-card bevel"><b>Memory ${i + 1}</b><small>held by ${esc(GIRLS[g].name)}</small>${miniBoard(ps[i])}
      <label>copied from <select data-src="${i}">${panelsOf(g).map(p => `<option value="${p.id}"${p.id === id ? ' selected' : ''}>${p.id}</option>`).join('')}</select></label>
      <div class="row"><button class="btn primary" data-play="${i}">Play</button><button class="btn" data-edit="${i}">Edit</button></div></div>`).join('')}</div>
    <div class="kit-row"><label><input type="checkbox" id="rb-lock"> locked like the story (files not deleted)</label><button class="btn primary" id="rb-map">Open Ray's map</button></div>
    <p class="kit-p"><small>Edits are saved like the level editor's (this browser; export from the editor). "copied from" makes a fresh copy of that panel.</small></p>`;
  $$('[data-src]', el).forEach(x => x.onchange = () => {
    const i = +x.dataset.src; RAY_SRC[i][1] = x.value; CH.raySrc = RAY_SRC.map(r => r[1]); chSave();
    const k = PANELS.findIndex(p => p.id === 'ray_' + (i + 1)); if (k >= 0) PANELS.splice(k, 1); delete OWMAP.ray; kitBoss(el);
  });
  $$('[data-play]', el).forEach(x => x.onclick = () => { SFX.click(); startPanel('ray_' + (+x.dataset.play + 1)); });
  $$('[data-edit]', el).forEach(x => x.onclick = () => { SFX.click(); openEditor('ray_' + (+x.dataset.edit + 1)); });
  $('#rb-map', el).onclick = () => {
    SFX.click(); const lock = $('#rb-lock', el).checked;
    PLAYABLE.forEach(g => { S.met[g] = true; S.flags['del_' + g] = !lock; });
    S.g.ray = { layer: 0, sessions: 0, gone: false, nt: 0 }; delete OWMAP.ray; WHO.boss.name = 'Ray';
    if (WINS.fixit) { owClose(); closeWin('fixit'); }
    openWorld('ray');
  };
}

/* ---------- gallery ---------- */
function kitGallery(el) {
  el.innerHTML = `<h4>Showcase (day 12) · what each girl submits</h4>
    <div class="gal">${PLAYABLE.map(g => ['half', 'real'].map(k => `<figure class="bevel"><canvas width="160" height="120" data-ex="${g}" data-k="${k}"></canvas><figcaption><b>${esc(GIRLS[g].name)}</b> · ${k === 'real' ? 'her real passion' : 'half-hearted (as ordered)'}<br><small>${esc(SHOW_CAP[g][k === 'real' ? 1 : 0])}</small></figcaption></figure>`).join('')).join('')}</div>
    <h4>Portraits</h4><div class="gal">${PLAYABLE.map(g => `<figure class="bevel">${ART[g] ? `<img src="${ART[g].body}" alt="${esc(GIRLS[g].name)}" style="height:150px;image-rendering:pixelated">` : avHTML(g, 'big')}<figcaption><b>${esc(GIRLS[g].name)}</b> · ${esc(GIRLS[g].tag)}${ART[g] ? '' : ' <small>(placeholder)</small>'}</figcaption></figure>`).join('')}</div>
    <h4>Memory cutscenes</h4><div class="gal">${[1, 2, 3, 4, 5].map(k => `<figure class="bevel"><canvas width="960" height="540" data-memc="${k}" style="width:240px;height:135px"></canvas><figcaption>Memory ${k}</figcaption></figure>`).join('')}</div>`;
  $$('[data-ex]', el).forEach(c => drawExhibit(c, c.dataset.ex, c.dataset.k === 'real'));
  $$('[data-memc]', el).forEach(c => { try { drawMemory(c, +c.dataset.memc); } catch (e) { } });
}

/* ---------- Boss's journal: a book, one page per girl (her showcase piece on it), plus his own notes ---------- */
function openJournal() {
  const pages = PLAYABLE.filter(g => met(g) || S.journal.some(j => j.g === g)).concat(['notes']);
  let at = pages[0];
  openWin('journal', { title: 'journal - R.', icon: 'journal', w: 620, h: 540, x: 140, y: 20, render: b => {
    const draw = () => {
      const g = at, rows = S.journal.filter(j => !j.miss && (g === 'notes' ? !j.g || !PLAYABLE.includes(j.g) : j.g === g));
      const ex = g !== 'notes' && S.exhibit && S.exhibit[g];
      const ending = g === 'notes' && S.flags.ended ? `<div class="jr-end">${esc(journalPart(S.journal.filter(j => !j.ray && !j.miss).length < 4 ? 'ending_few' : 'ending_many'))}</div><div class="jr-end ps">${esc(journalPart('ps'))}</div>` : '';
      b.innerHTML = `<div class="jr"><nav class="jr-tabs">${pages.map(p => `<button class="jr-tab${p === at ? ' on' : ''}" data-pg="${p}">${p === 'notes' ? 'R.' : esc(GIRLS[p].name)}</button>`).join('')}</nav>
        <article class="jr-page"><header>${g === 'notes' ? '<b>my notes</b><small>private. not for the newbie.</small>' : `${avHTML(g)}<b>${esc(GIRLS[g].name)}</b><small>${esc(GIRLS[g].id)} · ${esc(GIRLS[g].tag)}</small>`}</header>
          ${ex ? `<figure class="jr-ex"><canvas width="160" height="120"></canvas><figcaption>Showcase, day ${ex.day || SHOWCASE_DAY}: ${esc(SHOW_CAP[g][ex.kind === 'real' ? 1 : 0])}</figcaption></figure>` : ''}
          ${rows.length ? rows.map(j => `<p><span class="jr-d">Day ${pad2(j.day)}</span> ${esc(j.text)}</p>`).join('') : '<p class="jr-none">(nothing written yet)</p>'}${ending}</article></div>`;
      if (ex) drawExhibit($('.jr-ex canvas', b), g, ex.kind === 'real');
      $$('[data-pg]', b).forEach(x => x.onclick = () => { SFX.click(); at = x.dataset.pg; draw(); });
    };
    draw();
  } });
}
