/* =========================================================
   RECKONING (day 15). The four girls are gone: every "insecurity" you broke was a reason to exist.
   Boss is the last patient: Ray, wired into a chair, tired. She tells you this is a simulation inside Ori,
   asks what your bedroom looks like, then opens her own small map. Its four memories are locked until you
   delete that girl's journal on Ray's virtual machine (DiveVM, see finale.js). Each memory you clear plays
   one of Ray's memories (still cutscenes) and gives a key; the wall needs all four keys. Behind it, the last
   level; clearing it plays the reveal (finale.js). Dialogue: sheet act5_ending.
   ========================================================= */
const RECKON_DAY = LAST_DAY + 1;
const RAY_SRC = [['prim', 'prim_2_6'], ['trix', 'trix_2_4'], ['paige', 'paige_2_4'], ['vel', 'vel_2_2'], ['ray', 'prim_3_8']];   // the 5th is the last level, behind the wall
const reckoning = () => !!(S.flags && S.flags.reckoning);
function rayPanels() {
  return RAY_SRC.map(([g, id], i) => {
    let p = PANELS.find(q => q.id === 'ray_' + (i + 1));
    if (p) return p;
    const src = PANELS.find(q => q.id === id) || (g === 'ray' ? PANELS.find(q => q.layer === 3 && !q.ray && !q.tut) : panelsOf(g).find(q => q.layer === 2) || panelsOf(g)[0]);
    p = JSON.parse(JSON.stringify(src));
    Object.assign(p, { id: 'ray_' + (i + 1), ray: true, src: g, layer: 1, n: i + 1, tut: undefined, belief: '' });
    p.boxes.forEach(b => { if (b.c == null) b.c = PanelEngine.girlHue(src); });
    PANELS.push(p); return p;
  });
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
/* Ray's map: a corridor, four locked memories, a wall that takes four keys, the last level behind it */
function rayMap() {
  const W = 19, H = 7, t = new Uint8Array(W * H), I = (x, y) => y * W + x;
  for (let x = 1; x <= 12; x++) t[I(x, 3)] = 1;
  const spots = [[3, 1], [5, 5], [8, 1], [10, 5]];
  spots.forEach(([x, y]) => { t[I(x, y)] = 1; t[I(x, y < 3 ? 2 : 4)] = 1; });
  t[I(13, 3)] = 2;
  for (let y = 1; y <= 5; y++) for (let x = 14; x <= 17; x++) t[I(x, y)] = 1;
  const ps = rayPanels();
  const nodes = spots.map(([x, y], i) => ({ x, y, layer: 1, pid: ps[i].id, i, src: ps[i].src }));
  nodes.push({ x: 15, y: 3, layer: 1, pid: ps[4].id, i: 4, src: 'ray', last: true });   // behind the wall
  return { g: 'ray', W, H, t, nodes, gates: [{ x: 13, y: 3, layer: 1, total: 4, need: 4 }], start: [1, 3], core: [17, 3], nodeAt: new Map(nodes.map((n, i) => [I(n.x, n.y), i])) };
}
const rayLocked = n => n && n.src && n.src !== 'ray' && !S.flags['del_' + n.src];
// a memory cleared in Ray's map → the next of her memories and a key; the last level → the reveal
async function rayLevelWon(pid) {
  if (pid === 'ray_5') { await wait(REDUCED ? 300 : 2600); rayFinale(); return; }
  const o = owState('ray'), k = [1, 2, 3, 4].filter(i => o.solved['ray_' + i]).length;
  await wait(REDUCED ? 300 : 2900); await playMemory(k);
  owSay(k >= 4 ? 'four keys. the wall will open now.' : `key ${k}/4`);
}
async function rayFinale() {
  S.g.ray = S.g.ray || { layer: 0 }; S.g.ray.layer = 1; save();
  await playReveal();
  yapCh = 'boss'; openYap('boss');
  runDialogue(seq('boss', 'boss', endSteps('final_talk'), 'RK_END'));
}
function rkEnd() {
  S.flags.rkDone = true; save();
  const bo = document.createElement('div'); bo.id = 'blackout'; document.body.appendChild(bo);
  setTimeout(() => { bo.remove(); document.body.classList.remove('reckon'); endGame('reckoning'); }, REDUCED ? 300 : 2600);
}
/* ---------- memories: still cutscenes, one caption per click ---------- */
function playMemory(k) {
  return new Promise(res => {
    const steps = endSteps('memory_' + k), lines = steps.flatMap(s => s.lines || []).map(l => Array.isArray(l) ? l[1] : l).map(t => String(t).replace(/^\{\w+\}/, ''));
    const el = document.createElement('div'); el.id = 'memory'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', lines[0] || 'Memory');
    el.innerHTML = `<div class="mm-frame"><canvas width="960" height="540"></canvas><div class="mm-title"></div><div class="mm-cap" aria-live="polite"></div><div class="mm-hint">click ▸</div></div>`;
    document.body.appendChild(el);
    const cv = $('canvas', el); drawMemory(cv, k);
    $('.mm-title', el).textContent = lines[0] || '';
    let i = 1; SFX.glitch(.3);
    const next = async () => {
      if (i >= lines.length) { el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 600); document.removeEventListener('keydown', key); return; }
      const cap = $('.mm-cap', el); cap.textContent = ''; await typeInto(cap, lines[i]); i++;
      if (k === 5 && /Overriding/.test(lines[i - 1])) memoryOverwrite(cv);
    };
    const key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
    el.onclick = next; document.addEventListener('keydown', key);
    setTimeout(next, 700);
  });
}
// placeholder paintings (to be replaced by hand-drawn art: watercolor manga, pale washes, ink lines)
const MEMORY_ART = {};   // k → image url, when the art exists
function drawMemory(cv, k) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height;
  if (MEMORY_ART[k]) { loadImg(MEMORY_ART[k]).then(img => x.drawImage(img, 0, 0, W, H)); return; }
  const wash = (cols) => { const g = x.createLinearGradient(0, 0, W, H); cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .06})`; x.beginPath(); x.ellipse(Math.random() * W, Math.random() * H, 40 + Math.random() * 160, 20 + Math.random() * 80, Math.random() * 3, 0, 7); x.fill(); } };
  const ink = (f) => { x.save(); x.strokeStyle = 'rgba(40,30,40,.75)'; x.lineWidth = 2.2; x.lineCap = 'round'; x.lineJoin = 'round'; f(); x.restore(); };
  const person = (cx, by, s, col, pose = 'stand') => { x.save(); x.fillStyle = col; x.beginPath(); x.ellipse(cx, by - 150 * s, 26 * s, 30 * s, 0, 0, 7); x.fill();
    if (pose === 'crouch') { x.beginPath(); x.ellipse(cx, by - 70 * s, 50 * s, 60 * s, 0, 0, 7); x.fill(); } else { x.beginPath(); x.roundRect(cx - 34 * s, by - 120 * s, 68 * s, 120 * s, 24 * s); x.fill(); } x.restore(); };
  if (k === 1) { wash(['#d8d2cc', '#b9aeb0', '#8d7d86']);   // a small apartment, a crouched child, a looming shadow, a second girl appearing
    x.fillStyle = 'rgba(60,40,50,.35)'; x.fillRect(80, 60, 220, 300); person(700, 520, 2.1, 'rgba(30,20,30,.55)'); person(380, 470, 1, 'rgba(250,245,240,.9)', 'crouch');
    x.globalAlpha = .35; person(470, 470, 1.05, 'rgba(255,255,255,.9)'); x.globalAlpha = 1; }
  if (k === 2) { wash(['#efe6dc', '#d9c6cf', '#bfb3c9']);   // Ray, and four small girls in their colours
    person(480, 500, 1.4, 'rgba(250,248,245,.95)'); [['#ff7eb6', 270], ['#ff4d5e', 370], ['#a46bff', 590], ['#ffd23f', 690]].forEach(([c, cx]) => person(cx, 500, .8, c)); }
  if (k === 3) { wash(['#e8eef0', '#cfd9dc', '#aab8bd']);   // a hospital corridor; a hand, a pencil, a red streak; a doctor in a white coat
    ink(() => { x.beginPath(); for (let i = 0; i < 6; i++) { x.moveTo(0, 80 + i * 70); x.lineTo(W, 120 + i * 60); } x.stroke(); });
    x.fillStyle = '#f6efe9'; x.beginPath(); x.ellipse(300, 330, 120, 40, -.3, 0, 7); x.fill(); x.strokeStyle = '#3a2a2a'; x.lineWidth = 6; x.beginPath(); x.moveTo(250, 300); x.lineTo(380, 250); x.stroke();
    x.strokeStyle = 'rgba(170,20,30,.75)'; x.lineWidth = 4; x.beginPath(); x.moveTo(230, 345); x.lineTo(330, 320); x.stroke();
    person(720, 520, 1.5, 'rgba(255,255,255,.95)'); }
  if (k === 4) { wash(['#e9e4dc', '#cbc4bb', '#9c958e']);   // the board at a long table; the doctor standing, shaking their head
    x.fillStyle = 'rgba(80,60,60,.5)'; x.fillRect(120, 330, 720, 26); [200, 300, 400, 560, 660, 760].forEach(cx => person(cx, 340, .7, 'rgba(60,50,55,.55)')); person(480, 540, 1.3, 'rgba(255,255,255,.95)'); }
  if (k === 5) { wash(['#d7d0e2', '#a99bbd', '#5b4c70']);   // Ray at a CRT, choosing your face
    x.fillStyle = '#2a2236'; x.fillRect(470, 150, 360, 270); x.fillStyle = '#ffe9f3'; x.fillRect(490, 170, 320, 230);
    person(300, 520, 1.6, 'rgba(250,248,245,.95)');
    if (S.player && S.player.avatar) loadImg(S.player.avatar).then(img => { x.imageSmoothingEnabled = false; x.drawImage(img, 580, 190, 140, 140); x.fillStyle = '#4a2d6e'; x.font = '18px monospace'; x.fillText('Choose desired appearance', 510, 360); });
    ink(() => { x.beginPath(); x.moveTo(330, 330); x.lineTo(480, 380); x.stroke(); }); }
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
