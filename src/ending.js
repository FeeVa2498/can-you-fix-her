/* =========================================================
   RECKONING (day 15). The four girls are gone: every "insecurity" you broke was a reason to exist.
   Boss is the last patient: Ray, wired into a chair, tired. She tells you this is a simulation inside Ori,
   asks what your bedroom looks like, then opens her own small map: four gates, one per girl, each opened by
   the key you get when you delete that girl's journal on Ray's virtual machine (DiveVM, see finale.js).
   Behind each gate, five levels in that girl's mechanic (ray_1 … ray_20, 2–3 boxes, one rope box for Trix).
   Every level cleared, in any order, plays the next of Ray's 20 memories (still cutscenes, memory_1 … 20)
   and is one key for the wall at the end; the wall takes all 20. Behind it the last level (ray_21);
   clearing it plays the reveal (finale.js). Dialogue: sheet act5_ending.
   ========================================================= */
const RECKON_DAY = LAST_DAY + 1;
const RAY_GATES = ['prim', 'trix', 'paige', 'vel'], RAY_PER = 5, RAY_ALL = RAY_GATES.length * RAY_PER;   // ray_1–5 Prim, 6–10 Trix, 11–15 Paige, 16–20 Vel
const RAY_SRC = [['ray', 'prim_3_8']];   // the last level (ray_21) is a copy of this panel; Designer kit ▸ Boss level changes it
const reckoning = () => !!(S.flags && S.flags.reckoning);
const rayGirlOf = pid => RAY_GATES[Math.floor((+pid.split('_')[1] - 1) / RAY_PER)] || 'ray';
function rayPanels() {
  const out = [];
  RAY_GATES.forEach((g, gi) => {
    // designed in tools/ray_v13.js; if one is missing, borrow one of her layer-3 panels with 2–3 boxes
    const spare = panelsOf(g).filter(q => q.layer === 3 && !q.tut && (g === 'trix' || q.boxes.length >= 2)).sort((a, b) => a.minMoves - b.minMoves);
    for (let k = 0; k < RAY_PER; k++) {
      const id = 'ray_' + (gi * RAY_PER + k + 1); let p = PANELS.find(q => q.id === id);
      if (!p) { const src = spare[Math.min(spare.length - 1, Math.round(k * (spare.length - 1) / (RAY_PER - 1)))] || panelsOf(g)[0];
        p = JSON.parse(JSON.stringify(src)); Object.assign(p, { id, ray: true, src: g, layer: 1, n: gi * RAY_PER + k + 1, tut: undefined, belief: '' }); PANELS.push(p); }
      out.push(p);
    }
  });
  let last = PANELS.find(q => q.id === 'ray_21');
  if (!last) { const src = PANELS.find(q => q.id === RAY_SRC[0][1]) || PANELS.find(q => q.layer === 3 && !q.ray && !q.tut);
    last = JSON.parse(JSON.stringify(src)); Object.assign(last, { id: 'ray_21', ray: true, src: 'ray', layer: 1, n: 21, tut: undefined, belief: '' });
    last.boxes.forEach(b => { if (b.c == null) b.c = PanelEngine.girlHue(src); }); PANELS.push(last); }
  out.push(last); return out;
}
// the night before: Boss has one more patient
function reckoningEve() {
  if (S.day !== LAST_DAY) return [];
  return [{ lines: ['One last thing.', 'Tomorrow there\'s one more patient. The last one. Come in early, rookie.'] }];
}
async function beginReckoning() {
  S.day = RECKON_DAY; S.phase = 'day'; S.mins = DAY_START; S.dayOver = false; S.flags.reckoning = true;
  S.todayWorked = []; S.todayFixed = [];
  S.g.ray = S.g.ray || { layer: 0, sessions: 0, gone: false, nt: 0 };
  const unfinished = PLAYABLE.filter(g => met(g) && !complete(g));
  PLAYABLE.forEach(g => { S.g[g].gone = true; });   // they came home to Ray and went quiet
  checkpoint('reckoning');
  closeWorkWins(); applyAtmos(); refresh();
  document.body.classList.add('reckon');
  await lockScreen('Reckoning', 'Log in');
  glitch('hard'); SFX.glitch(.8);
  S.flags.rayFace = true; WHO.boss.name = 'Ray'; refresh();
  openYap('boss');
  const steps = endSteps('reckoning_morning');
  if (unfinished.length) steps.splice(3, 0, { lines: [`${unfinished.map(g => GIRLS[g].name.toLowerCase()).join(', ')}... i finished the rest myself last night. you were asleep.`] });
  runDialogue(seq('boss', 'boss', steps, 'RK_FEED'));
}
function endSteps(id) { const e = DD.ending && DD.ending[id]; return e ? playSteps(e.steps) : [{ lines: ['...'] }]; }
function rkFeed() {
  const dk = $('#desktop');
  openWin('feed', { title: 'VideoFeed.exe — RAY_00', icon: 'feed', w: 380, h: Math.min(640, dk.clientHeight - 16), x: 8, y: 8, noClose: () => !S.flags.rkDone, render: b => buildFeed(b, 'ray') });
  openYap('boss'); placeWin('yap', dk.clientWidth - 368, 8, 360, Math.min(640, dk.clientHeight - 16));
  setTimeout(() => runDialogue(seq('boss', 'boss', endSteps('reckoning_reveal'), 'RK_MAP')), 1200);
}
function rkMap() { runDialogue(seq('boss', 'boss', endSteps('reckoning_map'), 'RK_FILES')); }
function rkFiles() {
  S.flags.rkFiles = true; S.met.ray = true; S.flags.ping = 'brain'; save(); refresh();
  toast('DIVE OS', 'New device: <b>DiveVM</b> · RAY_00', openVM);
}
/* Ray's map: a hall; four gates off it (one per girl, opened by the key from her journal), five levels in a room
   behind each; at the end a wall that takes 20 keys (one per level cleared), and the last level behind it.
      rooms above the hall: Prim (x 2–6), Paige (x 11–15) · rooms below: Trix (x 6–10), Vel (x 15–19) */
function rayMap() {
  const W = 27, H = 15, t = new Uint8Array(W * H), I = (x, y) => y * W + x, HY = 7;
  for (let x = 1; x <= 21; x++) t[I(x, HY)] = 1;
  const ps = rayPanels(), nodes = [], gates = [];
  const SPOTS = [[-2, 0], [0, 0], [2, 0], [-1, 2], [1, 2]];   // inside a room, measured from its far edge
  [[4, -1], [8, 1], [13, -1], [17, 1]].forEach(([bx, dir], gi) => {
    const gy = HY + dir; t[I(bx, gy)] = 2; gates.push({ x: bx, y: gy, layer: gi + 1, total: 1, need: 1, k: RAY_GATES[gi], v: true });
    const y0 = dir < 0 ? 1 : HY + 2, y1 = dir < 0 ? HY - 2 : H - 2;
    for (let y = y0; y <= y1; y++) for (let x = bx - 2; x <= bx + 2; x++) t[I(x, y)] = 1;
    const far = dir < 0 ? y0 : y1;
    SPOTS.forEach(([dx, dy], k) => { const p = ps[gi * RAY_PER + k]; nodes.push({ x: bx + dx, y: far - dir * dy, layer: 1, pid: p.id, i: gi * RAY_PER + k, src: RAY_GATES[gi] }); });
  });
  t[I(22, HY)] = 2; gates.push({ x: 22, y: HY, layer: 5, total: RAY_ALL, need: RAY_ALL, fin: true });
  for (let y = HY - 2; y <= HY + 2; y++) for (let x = 23; x <= 25; x++) t[I(x, y)] = 1;
  nodes.push({ x: 24, y: HY, layer: 1, pid: ps[RAY_ALL].id, i: RAY_ALL, src: 'ray', last: true });
  return { g: 'ray', W, H, t, nodes, gates, seals: [], start: [1, HY], core: [25, HY - 2], nodeAt: new Map(nodes.map((n, i) => [I(n.x, n.y), i])) };
}
const rayLocked = () => false;   // the gates hold the levels now
const raySolved = () => { const o = owState('ray'); return Array.from({ length: RAY_ALL }, (_, i) => o.solved['ray_' + (i + 1)]).filter(Boolean).length; };
// Ray's gates: a girl's gate needs her journal deleted (her key); the wall needs every level cleared
function rayKeys() { const n = raySolved(); return owBuild('ray').gates.map(G => G.fin ? { have: n, need: RAY_ALL, total: RAY_ALL } : { have: S.flags['del_' + G.k] ? 1 : 0, need: 1, total: 1 }); }
const rayGateOpen = G => !!S.flags['rgate_' + (G.fin ? 'wall' : G.k)];
function rayGateLabel(G, open) { return G.fin ? (open ? '✓' : `🔒 ${raySolved()}/${RAY_ALL}`) : open ? '✓' : '🔒'; }   // no names: just locked doors
// a level cleared on Ray's map → the next of her memories (in order, whichever level it was); the last level → the reveal
async function rayLevelWon(pid) {
  if (pid === 'ray_21') { await wait(REDUCED ? 300 : 2600); rayFinale(); return; }
  const n = raySolved();
  await wait(REDUCED ? 300 : 2900); await playMemory(n);
  owSay(n >= RAY_ALL ? 'every memory. the wall will open now.' : `memory ${n}/${RAY_ALL}`);
}
async function rayFinale() {
  S.g.ray = S.g.ray || { layer: 0 }; S.g.ray.layer = 1; save();
  await playReveal({ flash: true });
  await lastScenes();   // thank you.txt → Recycle Bin → Ori wakes
  rkEnd();
}
function rkEnd() {
  S.flags.rkDone = true; save();
  const bo = document.createElement('div'); bo.id = 'blackout'; document.body.appendChild(bo);
  setTimeout(() => { bo.remove(); document.body.classList.remove('reckon'); endGame('reckoning'); }, REDUCED ? 300 : 900);
}
/* ---------- memories: still cutscenes; captions come by themselves (they can't be skipped) ---------- */
const memHold = t => 1800 + String(t).length * 55;   // how long a line stays after it has typed out
function playMemory(k) {
  return new Promise(res => {
    const steps = endSteps('memory_' + k), lines = steps.flatMap(s => s.lines || []).map(l => Array.isArray(l) ? l[1] : l).map(t => String(t).replace(/^\{\w+\}/, ''));
    const el = document.createElement('div'); el.id = 'memory'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', lines[0] || 'Memory');
    el.innerHTML = `<div class="mm-frame"><canvas width="960" height="540"></canvas><div class="mm-title"></div><div class="mm-cap" aria-live="polite"></div></div>`;
    document.body.appendChild(el);
    const cv = $('canvas', el); drawMemory(cv, k);
    $('.mm-title', el).textContent = lines[0] || '';
    let i = 1; SFX.glitch(.3);
    const next = async () => {
      if (i >= lines.length) { el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 600); return; }
      const cap = $('.mm-cap', el), line = lines[i]; cap.textContent = ''; await typeInto(cap, line); i++;
      setTimeout(next, memHold(line));   // no skipping: each line stays up, then the next comes by itself
    };
    setTimeout(next, 2200);   // the title first
  });
}
// placeholder paintings (to be replaced by hand-drawn art: watercolor manga, pale washes, ink lines)
const MEMORY_ART = {};   // k → image url, when the art exists
function drawMemory(cv, k) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height;
  if (MEMORY_ART[k]) { loadImg(MEMORY_ART[k]).then(img => x.drawImage(img, 0, 0, W, H)); return; }
  let sd = k * 9301 + 49297; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  const wash = (cols) => { const g = x.createLinearGradient(0, 0, W, H); cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${R() * .06})`; x.beginPath(); x.ellipse(R() * W, R() * H, 40 + R() * 160, 20 + R() * 80, R() * 3, 0, 7); x.fill(); } };
  const ink = (f, c = 'rgba(40,30,40,.75)', w = 2.2) => { x.save(); x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; f(); x.restore(); };
  const person = (cx, by, s, col, pose = 'stand') => { x.save(); x.fillStyle = col; x.beginPath(); x.ellipse(cx, by - 150 * s, 26 * s, 30 * s, 0, 0, 7); x.fill();
    if (pose === 'crouch') { x.beginPath(); x.ellipse(cx, by - 70 * s, 50 * s, 60 * s, 0, 0, 7); x.fill(); }
    else if (pose === 'sit') { x.beginPath(); x.roundRect(cx - 34 * s, by - 120 * s, 68 * s, 80 * s, 24 * s); x.fill(); x.fillRect(cx - 30 * s, by - 50 * s, 80 * s, 22 * s); }
    else { x.beginPath(); x.roundRect(cx - 34 * s, by - 120 * s, 68 * s, 120 * s, 24 * s); x.fill(); }
    x.restore(); };
  const girl = (cx, by, s, col, hair) => { person(cx, by, s, col); x.fillStyle = hair; x.beginPath(); x.ellipse(cx, by - 160 * s, 30 * s, 22 * s, 0, Math.PI, 0); x.fill(); x.fillRect(cx - 30 * s, by - 162 * s, 12 * s, 60 * s); x.fillRect(cx + 18 * s, by - 162 * s, 12 * s, 60 * s); };
  const ORI = 'rgba(250,245,240,.92)', RAY = 'rgba(236,230,242,.95)';
  const room = () => { x.fillStyle = 'rgba(70,55,70,.25)'; x.fillRect(0, 380, W, 160); x.fillStyle = 'rgba(40,40,70,.35)'; x.fillRect(90, 70, 190, 220);
    for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(200,210,255,.12)'; x.fillRect(90, 78 + i * 24, 190, 9); } };
  const screen = (sx, sy, w, h, glow = '#cfe6ff', txt) => { x.fillStyle = 'rgba(30,25,35,.85)'; x.beginPath(); x.roundRect(sx - 10, sy - 10, w + 20, h + 20, 10); x.fill(); x.fillStyle = glow; x.fillRect(sx, sy, w, h);
    const g = x.createRadialGradient(sx + w / 2, sy + h / 2, 10, sx + w / 2, sy + h / 2, w * 1.4); g.addColorStop(0, glow.replace(/^#/, '#') + '55'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (txt) { x.fillStyle = '#2a2236'; x.font = `bold ${Math.round(h / 9)}px monospace`; x.textAlign = 'center'; txt.split('\n').forEach((t, i) => x.fillText(t, sx + w / 2, sy + h / 2 + (i - .3) * h / 7)); x.textAlign = 'left'; } };
  const bed = (bx, by) => { x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(bx, by, 380, 70); x.fillStyle = 'rgba(180,200,210,.8)'; x.fillRect(bx, by + 70, 380, 20); x.fillStyle = 'rgba(120,130,140,.6)'; x.fillRect(bx - 10, by - 60, 14, 170); x.fillRect(bx + 376, by - 20, 14, 130); };
  const coat = (cx, by, s) => { person(cx, by, s, 'rgba(255,255,255,.96)'); ink(() => { x.beginPath(); x.moveTo(cx, by - 118 * s); x.lineTo(cx, by - 4 * s); x.stroke(); }, 'rgba(120,140,150,.6)', 2); x.fillStyle = 'rgba(120,180,200,.7)'; x.fillRect(cx + 10 * s, by - 100 * s, 16 * s, 10 * s); };
  const tears = (cx, cy) => ink(() => { x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx - 4, cy + 30, cx + 2, cy + 60); x.stroke(); }, 'rgba(120,170,230,.8)', 3);
  const COL = { prim: ['#ff7eb6', '#2b1b2e'], trix: ['#ff4d5e', '#ff9ec7'], paige: ['#a46bff', '#16121c'], vel: ['#ffd23f', '#f2c48d'] };
  ({
    1: () => { wash(['#d8d2cc', '#b9aeb0', '#8d7d86']); room(); person(700, 520, 2.1, 'rgba(30,20,30,.55)'); person(320, 470, 1, ORI, 'crouch');
      x.fillStyle = 'rgba(30,20,30,.2)'; x.beginPath(); x.moveTo(700, 520); x.lineTo(240, 540); x.lineTo(360, 520); x.fill(); },
    2: () => { wash(['#cdd3df', '#a9a3bd', '#6e6688']); person(420, 480, 1.2, ORI, 'crouch'); x.globalAlpha = .4; person(560, 500, 1.25, RAY); x.globalAlpha = 1;
      ink(() => { for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(470 + i * 8, 260); x.bezierCurveTo(520, 200 - i * 10, 560, 240, 560, 300); x.stroke(); } }, 'rgba(255,255,255,.5)', 1.5); },
    3: () => { wash(['#efe9f2', '#cfc3da', '#a598b8']); person(480, 520, 1.6, RAY); person(360, 520, 1, ORI, 'crouch');
      x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.arc(480, 270, 230, 0, 7); x.fill(); },
    4: () => { wash(['#2a2438', '#3a3150', '#1c1828']); room(); screen(520, 230, 240, 160, '#cfe6ff'); person(560, 540, 1, ORI, 'sit'); x.globalAlpha = .45; person(660, 540, 1, RAY, 'sit'); x.globalAlpha = 1;
      x.fillStyle = 'rgba(255,255,255,.75)'; [[560, 260, 40], [650, 300, 30], [600, 340, 26]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r * .3, 0, 7); x.fill(); }); },
    5: () => { wash(['#f6e3ec', '#ecc6d8', '#c99ab4']); person(300, 520, 1.5, RAY); girl(600, 520, 1.1, 'rgba(255,240,246,.95)', COL.prim[0]);
      x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(680, 340, 120, 150); ink(() => { x.beginPath(); x.moveTo(700, 380); x.bezierCurveTo(730, 350, 760, 420, 780, 380); x.moveTo(700, 430); x.lineTo(770, 460); x.stroke(); }); },
    6: () => { wash(['#ffe0e4', '#f2b8c2', '#c9798c']); person(260, 520, 1.5, RAY); girl(600, 520, 1.1, 'rgba(255,240,240,.95)', COL.trix[0]);
      screen(660, 300, 160, 110, '#ffd6e6', 'LIVE'); x.fillStyle = '#ff2d55'; x.beginPath(); x.arc(676, 316, 6, 0, 7); x.fill(); },
    7: () => { wash(['#e6dcf5', '#b9a6dc', '#5e4a85']); person(260, 520, 1.5, RAY); girl(600, 520, 1.1, 'rgba(235,228,245,.95)', COL.paige[1]);
      for (let i = 0; i < 3; i++) { x.save(); x.translate(640 + i * 50, 420); x.rotate(-.3 + i * .3); x.fillStyle = '#fff8ea'; x.fillRect(-22, -36, 44, 72); x.strokeStyle = '#7b5bb0'; x.strokeRect(-18, -32, 36, 64); x.restore(); } },
    8: () => { wash(['#fff3d6', '#f6d98f', '#d9a94c']); person(260, 520, 1.5, RAY); girl(600, 520, 1.1, 'rgba(255,250,236,.95)', COL.vel[0]);
      ink(() => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.beginPath(); x.moveTo(600 + Math.cos(a) * 140, 300 + Math.sin(a) * 140); x.lineTo(600 + Math.cos(a) * 170, 300 + Math.sin(a) * 170); x.stroke(); } }, 'rgba(255,255,255,.8)', 3); },
    9: () => { wash(['#e9e4ee', '#cfc7da', '#9f95b0']); [['prim', 180], ['trix', 380], ['paige', 580], ['vel', 780]].forEach(([g, cx]) => girl(cx, 500, .95, 'rgba(255,255,255,.92)', COL[g][0]));
      x.fillStyle = '#2b2236'; x.fillRect(150, 320, 60, 14); x.beginPath(); x.ellipse(150, 330, 22, 22, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(210, 330, 22, 22, 0, 0, 7); x.fill();
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#2b2236' : '#fff'; x.fillRect(350 + i * 15, 310 + j * 15, 15, 15); }
      x.fillStyle = '#fff'; x.fillRect(560, 315, 34, 34); x.fillStyle = '#2b2236'; [[568, 323], [586, 341], [577, 332]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); });
      x.fillStyle = '#3d3a2c'; x.fillRect(740, 325, 90, 12); x.fillRect(800, 337, 12, 22); },
    10: () => { wash(['#e8e4e0', '#c9c2bd', '#9a918c']); [['prim', 180], ['trix', 380], ['paige', 580], ['vel', 780]].forEach(([g, cx]) => { girl(cx, 500, .95, 'rgba(240,236,232,.8)', COL[g][0]);
        x.fillStyle = 'rgba(40,30,40,.6)'; x.fillRect(cx - 12, 345, 8, 3); x.fillRect(cx + 6, 345, 8, 3); }); },
    11: () => { wash(['#f2dde6', '#d6b2c4', '#a77d93']); girl(400, 520, 1.3, 'rgba(255,240,246,.95)', COL.prim[0]); x.fillStyle = '#fff'; x.fillRect(470, 330, 200, 150);
      ink(() => { for (let i = 0; i < 30; i++) { x.beginPath(); x.moveTo(480 + R() * 180, 340 + R() * 130); x.lineTo(480 + R() * 180, 340 + R() * 130); x.stroke(); } }, 'rgba(40,30,40,.6)', 1.5);
      x.globalAlpha = .35; person(760, 520, 1.6, ORI); x.globalAlpha = 1; x.fillStyle = 'rgba(160,20,50,.25)'; x.beginPath(); x.arc(760, 250, 50, 0, 7); x.fill(); },
    12: () => { wash(['#e6e0e2', '#bfb2b8', '#7f6d77']); x.fillStyle = '#f6efe9'; x.beginPath(); x.ellipse(420, 320, 200, 52, -.2, 0, 7); x.fill();
      x.fillStyle = '#d8c9a8'; x.fillRect(560, 250, 120, 16); x.fillStyle = '#9aa0a8'; x.beginPath(); x.moveTo(680, 250); x.lineTo(740, 258); x.lineTo(680, 266); x.fill();
      ink(() => { x.beginPath(); x.moveTo(330, 310); x.lineTo(450, 290); x.stroke(); }, 'rgba(170,20,30,.75)', 3); for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(200,170,120,.6)'; x.fillRect(260 + R() * 300, 400 + R() * 60, 6, 3); } },
    13: () => { wash(['#e8eef0', '#cfd9dc', '#aab8bd']); bed(290, 330); person(460, 340, .8, ORI, 'crouch');
      [['prim', 160], ['trix', 820], ['paige', 120], ['vel', 860]].forEach(([g, cx], i) => { x.globalAlpha = .28; girl(cx, 300 + (i % 2) * 140, .7, '#fff', COL[g][0]); x.globalAlpha = 1; });
      ink(() => { x.beginPath(); for (let i = 0; i < 6; i++) { x.moveTo(0, 60 + i * 20); x.lineTo(W, 60 + i * 20); } x.stroke(); }, 'rgba(120,140,150,.25)', 1); },
    14: () => { wash(['#eef3f4', '#d3dee1', '#b0c0c4']); bed(120, 360); person(300, 380, .9, RAY, 'sit'); coat(700, 540, 1.5); },
    15: () => { wash(['#0f1424', '#1d2a48', '#0b0f1a']); x.strokeStyle = 'rgba(120,200,255,.35)'; x.lineWidth = 1;
      for (let i = 0; i < 24; i++) { x.beginPath(); x.moveTo(i * 42, 540); x.lineTo(480, 260); x.stroke(); } for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(0, 300 + i * 32); x.lineTo(W, 300 + i * 32); x.stroke(); }
      x.fillStyle = 'rgba(160,220,255,.9)'; x.font = 'bold 64px monospace'; x.textAlign = 'center'; x.fillText('D · I · V · E', 480, 180); x.textAlign = 'left';
      [['prim', 260], ['trix', 400], ['paige', 560], ['vel', 700]].forEach(([g, cx]) => { x.globalAlpha = .7; girl(cx, 470, .6, 'rgba(200,230,255,.8)', COL[g][0]); x.globalAlpha = 1; }); },
    16: () => { wash(['#f0ebe4', '#d8cdc2', '#b3a597']); bed(80, 380); person(240, 400, .9, RAY, 'sit'); coat(660, 540, 1.4);
      x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(460, 160, 140, 60, 0, 0, 7); x.fill(); ink(() => { x.beginPath(); x.moveTo(380, 170); x.lineTo(430, 130); x.lineTo(470, 175); x.lineTo(520, 120); x.lineTo(560, 170); x.stroke(); }, 'rgba(90,120,150,.7)', 3); },
    17: () => { wash(['#e9e4dc', '#cbc4bb', '#9c958e']); x.fillStyle = 'rgba(80,60,60,.5)'; x.fillRect(120, 330, 720, 26);
      [200, 300, 400, 560, 660, 760].forEach(cx => person(cx, 340, .7, 'rgba(60,50,55,.55)')); screen(380, 60, 200, 120, '#ffd9d9', 'ORI\n!!'); },
    18: () => { wash(['#ece6e0', '#cbbfb6', '#958780']); coat(480, 540, 1.8); x.fillStyle = 'rgba(240,226,214,.95)'; x.beginPath(); x.ellipse(452, 330, 30, 22, -.4, 0, 7); x.fill(); },
    19: () => { wash(['#e3e8ee', '#b8c2cf', '#7b8698']); person(300, 520, 1.5, RAY); coat(640, 540, 1.6); tears(632, 290); tears(652, 292); },
    21: () => { wash(['#fbf7ee', '#eef2f4', '#d9e6ee']); x.fillStyle = '#cfe8ff'; x.fillRect(560, 60, 330, 300); const sky = x.createLinearGradient(0, 60, 0, 360); sky.addColorStop(0, '#9fd3ff'); sky.addColorStop(1, '#fff3d6'); x.fillStyle = sky; x.fillRect(570, 70, 310, 280);
      x.fillStyle = 'rgba(255,240,200,.9)'; x.beginPath(); x.arc(800, 150, 34, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.85)'; [[640, 120, 50], [700, 110, 36], [760, 250, 44]].forEach(([a, b, r]) => { x.beginPath(); x.ellipse(a, b, r, r * .4, 0, 0, 7); x.fill(); });
      x.strokeStyle = '#e8e2d6'; x.lineWidth = 10; x.strokeRect(565, 65, 320, 290); x.beginPath(); x.moveTo(725, 65); x.lineTo(725, 355); x.stroke();
      const sun = x.createLinearGradient(560, 360, 360, 540); sun.addColorStop(0, 'rgba(255,240,190,.45)'); sun.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = sun; x.beginPath(); x.moveTo(565, 355); x.lineTo(885, 355); x.lineTo(700, 540); x.lineTo(200, 540); x.fill();
      x.fillStyle = 'rgba(120,110,120,.45)'; x.fillRect(64, 400, 14, 90); x.fillRect(104, 400, 14, 90); x.fillRect(56, 380, 70, 22); x.fillRect(56, 320, 14, 70);   // the empty chair
      bed(150, 400);
      x.fillStyle = '#e9d6c8'; x.beginPath(); x.roundRect(450, 300, 74, 110, 26); x.fill();   // Ori, sitting up, turned to the window
      x.fillStyle = '#f3e3d6'; x.beginPath(); x.ellipse(492, 262, 30, 34, 0, 0, 7); x.fill();
      x.fillStyle = '#5b4652'; x.beginPath(); x.ellipse(482, 252, 33, 30, 0, Math.PI * .9, Math.PI * 2.15); x.fill(); x.fillRect(452, 252, 16, 70);
      x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(400, 395, 230, 26);   // the blanket over her legs
      ink(() => { x.beginPath(); x.moveTo(520, 262); x.lineTo(540, 258); x.stroke(); }, 'rgba(91,70,82,.6)', 2); },
    20: () => { wash(['#151020', '#251a36', '#0b0812']); screen(330, 120, 380, 260, '#e9ddff', 'AVATAR FEATURE\nBE ANOTHER PERSON'); x.globalAlpha = .95; person(520, 560, 1.4, 'rgba(30,24,40,.95)', 'sit'); x.globalAlpha = 1; },
  }[k] || (() => wash(['#ddd', '#bbb', '#999'])))();
  x.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1);
}
function memoryOverwrite(cv) {
  const x = cv.getContext('2d'); let k = 0;
  const iv = setInterval(() => { k += 4; x.fillStyle = '#4a2d6e'; x.fillRect(510, 372, 280, 14); x.fillStyle = '#ff5fa8'; x.fillRect(512, 374, Math.min(276, k * 2.76), 10); if (k >= 36) clearInterval(iv); }, 120);
}
/* Ray on the feed: wired into a chair in the dark (placeholder until the art exists) */
function drawRayBound(cv) {
  if (!cv) return; const x = rctx(cv);
  x.fillStyle = '#0d0a12'; x.fillRect(0, 0, RW, RH);
  const glow = x.createRadialGradient(120, 90, 10, 120, 110, 140); glow.addColorStop(0, 'rgba(120,200,255,.18)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = glow; x.fillRect(0, 0, RW, RH);
  x.strokeStyle = 'rgba(40,40,50,1)'; x.lineWidth = 2;
  for (let i = 0; i < 14; i++) { const sx = 20 + i * 15, tx = 100 + (i % 5) * 10, ty = 80 + (i % 4) * 22; x.beginPath(); x.moveTo(sx, 0); x.bezierCurveTo(sx, 60, tx + 20, ty - 40, tx, ty); x.stroke(); }
  x.fillStyle = '#2b2533'; x.beginPath(); x.roundRect(78, 70, 84, 120, 16); x.fill();
  x.fillStyle = '#d9d2dc'; x.beginPath(); x.ellipse(120, 70, 17, 20, -.2, 0, 7); x.fill();
  x.fillStyle = '#e8e2ea'; x.beginPath(); x.roundRect(96, 92, 48, 66, 12); x.fill();
  x.fillStyle = '#d9d2dc'; x.fillRect(92, 100, 8, 44); x.fillRect(140, 100, 8, 44);
  x.fillStyle = '#ff4d7a'; [[96, 112], [144, 118], [118, 92], [110, 140]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 1.8, 0, 7); x.fill(); });
  x.fillStyle = 'rgba(255,255,255,.75)'; x.font = 'bold 8px monospace'; x.textAlign = 'center'; x.fillText('RAY · placeholder art', 120, 204);
}
