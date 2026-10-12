
'use strict';
/* =========================================================
   CAN YOU FIX HER — DIVE OS v2.4 prototype (v4)
   ========================================================= */
const SAVE_KEY = 'cyfh_v8_save';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => innerWidth <= 720;
const pad2 = n => String(n).padStart(2, '0');

/* ---------------- art (yours, pixelized) ---------------- */
const ART = {
  prim: { body: '__PRIM_BODY__', face: '__PRIM_FACE__', w: 82, h: 170 },
  trix: { body: '__TRIX_BODY__', face: '__TRIX_FACE__', w: 124, h: 170 },
};
// two cascaded windows over the face: front (layer 1) and back (layer 2), same size, back offset down-right
const LEVELS = __LEVELS__;
const lvlAt = (g, i) => { const P = LEVELS[g]; return P[i < P.length ? i : P.length - 8 + (i % 8)]; };

/* ---------------- cast ---------------- */
const GIRLS = {
  prim: { id: 'PRIM_01', name: 'Prim', tag: 'Jirai Kei', from: 1, built: true, fill: false, hp: [600, 4800, 7000],
    layers: ['INSECURITY · "fragile girl"', 'INSECURITY · "fake artist"', 'CORE · ▒▒▒▒▒▒▒▒'], core: 'WILL_TO_LIVE',
    rule: 'Connect every pair of matching dots. Lines cannot cross. Drawing over another line cuts it.',
    fail: "{sad}it's okay. i'm slow too." },
  trix: { id: 'TRIX_02', name: 'Trix', tag: 'E-Girl', from: 2, built: true, fill: true, hp: [900, 5600, 7800],
    layers: ['INSECURITY · "pick-me airhead"', 'INSECURITY · "attention seeker"', 'CORE · ▒▒▒▒▒▒▒▒'], core: 'WILL_TO_LIVE',
    rule: 'OCD / Perfectionism: connect every pair AND fill 100% of the tiles. A board with gaps does not count.',
    fail: "{angry}time is a constraint. i hate constraints. next." },
  paige: { id: 'PAIGE_03', name: 'Paige', tag: 'Goth', from: 4, built: false, gim: 'Attachment: dots stuck side by side' },
  vel: { id: 'VEL_04', name: 'Vel', tag: 'Gyaru', from: 6, built: false, gim: 'Bipolar: portal nodes' },
  myne: { id: 'MYNE_05', name: 'Myne', tag: 'Tomboy', from: 8, built: false, gim: 'ADHD: lines wrap around the edges' },
};
const ORDER = ['prim', 'trix', 'paige', 'vel', 'myne'];
const PLAYABLE = ['prim', 'trix'];
const LAST_DAY = 14, LEVELS_PER_SESSION = 5, NIGHT_CHATS = 2, MAX_FIX = 2;
const SPECIAL = { 3: 'showcase', 7: 'postcard', 10: 'inspection' };
const SPECIAL_NAME = { showcase: 'HOBBY SHOWCASE', postcard: 'POSTCARD DAY', inspection: 'INSPECTION DAY' };
const QUAKE_DAYS = [5, 8, 11, 13];

/* ---------------- state ---------------- */
function fresh() {
  const g = {}; ORDER.forEach(k => g[k] = { layer: 0, dmg: 0, lvl: 0, ex: 0, sessions: 0, doneDay: 0, gone: false, nt: 0 });
  return {
    player: null, day: 1, phase: 'day', mins: 9 * 60, g,
    inv: [], apps: [], mementos: [], know: [], flags: {}, seen: {},
    logs: { boss: [], session: [], prim: [], trix: [] }, unread: { boss: 0, prim: 0, trix: 0 },
    active: null, queue: [], dyn: {}, session: null, route: [],
    todayLayers: 0, todayFixed: [], todayWorked: [], best: 0,
    mail: [], journal: [], show: {}, quakes: 0, asked: {}, used: {}, fixes: 0, met: {}, half: 1, at: 'd1',
    night: { chats: 0, with: [], bossPending: false, bossDone: false },
  };
}
let S = fresh();
let saveTimer = null;
function save() { /* progress is written at checkpoints only (start of morning, afternoon, night) */ }
function loadSave() { try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
const UPD = new Set();
setInterval(() => { if (S.flags && S.flags.ping && !document.getElementById('setup') && !document.getElementById('blackout')) SFX.vibrate(); }, 2600);
function refresh() { UPD.forEach(f => { try { f(); } catch (e) { console.error(e); } }); renderIcons(); renderTray(); applyAtmos(); }
const layersTotal = () => ORDER.reduce((a, k) => a + S.g[k].layer, 0);
const clockStr = () => { const m = S.mins % (24 * 60); return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); };
const tick = (n = 1) => { S.mins += n; };
const knows = k => S.know.includes(k);
const hasMem = m => S.mementos.includes(m);

/* ---------------- audio ---------------- */
const AU = { ctx: null, on: true, degrade: 0 };
function auInit() {
  if (AU.ctx) return;
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  const ctx = new C(); AU.ctx = ctx;
  AU.master = ctx.createGain(); AU.master.gain.value = AU.on ? .5 : 0; AU.master.connect(ctx.destination);
  AU.lp = ctx.createBiquadFilter(); AU.lp.type = 'lowpass'; AU.lp.frequency.value = 1700;
  AU.music = ctx.createGain(); AU.music.gain.value = .15; AU.lp.connect(AU.music); AU.music.connect(AU.master);
  const len = ctx.sampleRate * 2, crack = ctx.createBuffer(1, len, ctx.sampleRate), cd = crack.getChannelData(0);
  for (let i = 0; i < len; i++) cd[i] = Math.random() < .0008 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * .012;
  const s = ctx.createBufferSource(); s.buffer = crack; s.loop = true; AU.crackle = ctx.createGain(); AU.crackle.gain.value = .2; s.connect(AU.crackle); AU.crackle.connect(AU.master); s.start();
  startMusic(); setDegrade();
}
function setDegrade() {
  if (!AU.ctx) return;
  const d = clamp(layersTotal() / 10 + S.quakes * .08, 0, 1); AU.degrade = d;
  const t = AU.ctx.currentTime;
  AU.lp.frequency.setTargetAtTime((S.phase === 'night' ? 1100 : 1700) - d * 700, t, .5);
  AU.crackle.gain.setTargetAtTime(.18 + d * .5, t, .5);
}
const CHORDS_DAY = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]];
const CHORDS_NIGHT = [[57, 60, 64, 67], [53, 57, 60, 64], [50, 53, 57, 60], [52, 55, 59, 62]];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function startMusic() {
  let bar = 0; const BAR = 2.6;
  const play = () => {
    const ctx = AU.ctx; if (!ctx) return;
    const t0 = ctx.currentTime + .05, CH = S.phase === 'night' ? CHORDS_NIGHT : CHORDS_DAY, ch = CH[bar % 4], d = AU.degrade;
    ch.forEach((m, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = mtof(m);
      o.detune.value = (Math.random() - .5) * (6 + d * 50);
      const st = t0 + i * .025; g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(.1, st + .3); g.gain.setTargetAtTime(0, st + BAR - .6, .35);
      o.connect(g); g.connect(AU.lp); o.start(st); o.stop(st + BAR + 1.2);
    });
    const b = ctx.createOscillator(), bg = ctx.createGain(); b.type = 'sine'; b.frequency.value = mtof(ch[0] - 24);
    bg.gain.setValueAtTime(0, t0); bg.gain.linearRampToValueAtTime(.2, t0 + .04); bg.gain.setTargetAtTime(0, t0 + .8, .4); b.connect(bg); bg.connect(AU.lp); b.start(t0); b.stop(t0 + BAR);
    for (let k = 0; k < 8; k++) if (k % 2 === 0 || Math.random() < .5) noiseHit(t0 + k * BAR / 8, .02, 6500, k % 2 ? .018 : .03, AU.lp);
    for (let k = 0; k < 4; k++) if (Math.random() < .6) tone(mtof(ch[(k + bar) % 4] + 24), t0 + k * BAR / 4 + .1, .5, .035, 'sine', AU.lp);
    bar++;
  };
  play(); setInterval(play, BAR * 1000);
}
function tone(f, t, dur, vol, type = 'sine', dest) {
  const ctx = AU.ctx; if (!ctx) return; t = t || ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(dest || AU.master); o.start(t); o.stop(t + dur + .05);
}
function noiseHit(t, dur, hp, vol, dest, lowpass) {
  const ctx = AU.ctx; if (!ctx) return; t = t || ctx.currentTime;
  const len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = lowpass ? 'lowpass' : 'highpass'; f.frequency.value = hp;
  const g = ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(dest || AU.master); s.start(t);
}
const SFX = {
  click() { noiseHit(0, .016, 2500, .22); },
  tick() { noiseHit(0, .007, 4500, .07); },
  pop() { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(880, t, .09, .08, 'square'); tone(1320, t + .04, .1, .06, 'square'); },
  chime() { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(1046, t, .5, .11); tone(1568, t + .09, .7, .09); },
  mail() { if (!AU.ctx) return; const t = AU.ctx.currentTime;[1318, 1046, 1568].forEach((f, i) => tone(f, t + i * .1, .4, .08, 'triangle')); },
  item() { if (!AU.ctx) return; const t = AU.ctx.currentTime;[784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * .07, .35, .09, 'square')); },
  buzz() { if (!AU.ctx) return; tone(130, 0, .22, .14, 'sawtooth'); },
  glitch(len = .4) { if (!AU.ctx) return; noiseHit(0, len, 300, .3); tone(60 + Math.random() * 400, 0, len, .1, 'square'); },
  step(i = 0) { if (!AU.ctx) return; tone(523 * Math.pow(2, (i % 12) / 12), 0, .06, .045, 'triangle'); },
  link() { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(1046, t, .15, .09, 'triangle'); tone(1568, t + .06, .2, .08, 'triangle'); },
  win() { if (!AU.ctx) return; const t = AU.ctx.currentTime;[523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * .08, .6, .09, 'triangle')); },
  shatter() { if (!AU.ctx) return; noiseHit(0, .6, 1200, .3); const t = AU.ctx.currentTime;[1568, 1175, 880, 587].forEach((f, i) => tone(f, t + i * .07, .3, .08, 'square')); },
  rumble() { if (!AU.ctx) return; noiseHit(0, 1.6, 160, .9, null, true); tone(38, 0, 1.5, .35, 'sine'); tone(52, 0, 1.2, .2, 'sine'); },
  vibrate() { if (!AU.ctx) return; const t = AU.ctx.currentTime; for (let i = 0; i < 6; i++) tone(95, t + i * .09, .06, .12, 'square'); },
  rewind() { if (!AU.ctx) return; const t = AU.ctx.currentTime; for (let i = 0; i < 8; i++) tone(1600 - i * 150, t + i * .04, .05, .06, 'square'); },
};

/* ---------------- atmosphere ---------------- */
(function noiseLoop() {
  const c = $('#noise'), x = c.getContext('2d'), img = x.createImageData(160, 100); let last = 0;
  const frame = ts => {
    requestAnimationFrame(frame); if (ts - last < 80) return; last = ts;
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--noise')) || 0; if (v < .01) return;
    for (let i = 0; i < img.data.length; i += 4) { const n = 130 + Math.random() * 125 | 0; img.data[i] = n; img.data[i + 1] = n * .86; img.data[i + 2] = n; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0);
  };
  requestAnimationFrame(frame);
})();
function applyAtmos() {
  document.documentElement.style.setProperty('--noise', (layersTotal() * .01 + S.quakes * .015).toFixed(3));
  document.documentElement.style.setProperty('--desat', (ORDER.filter(k => S.g[k].gone).length * .1).toFixed(3));
  const dk = $('#desktop'); if (dk) dk.classList.toggle('night', S.phase === 'night');
  drawCracks(); setDegrade();
}
function glitch(level = 'soft') {
  const app = $('#app'); const cls = level === 'hard' ? 'glitch-hard' : 'glitch-soft';
  app.classList.remove('glitch-soft', 'glitch-hard'); void app.offsetWidth; app.classList.add(cls);
  SFX.glitch(level === 'hard' ? 1 : .25); setTimeout(() => app.classList.remove(cls), level === 'hard' ? 1450 : 520);
}
function drawCracks() {
  const svg = $('#cracks'); if (!svg) return;
  if (+svg.dataset.n === S.quakes) return; svg.dataset.n = S.quakes;
  let rnd = 7; const R = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
  let out = '';
  for (let q = 0; q < S.quakes; q++) {
    let x = 20 + R() * 60, y = R() < .5 ? 0 : 100, pts = [[x, y]];
    for (let i = 0; i < 7; i++) { x += (R() - .5) * 12; y += (y > 50 ? -1 : 1) * (4 + R() * 7); pts.push([x, y]); }
    out += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="rgba(107,74,158,.45)" stroke-width=".35" vector-effect="non-scaling-stroke" style="stroke-width:2px"/>`;
  }
  svg.innerHTML = out;
}

/* ---------------- pixel icons ---------------- */
const ICONS = {
  folder: '<rect x="3" y="8" width="11" height="4" fill="#ff8cc6"/><rect x="3" y="11" width="26" height="16" fill="#ffb3d9"/><rect x="3" y="11" width="26" height="2" fill="#ffe3f1"/>',
  folderlock: '<rect x="3" y="8" width="11" height="4" fill="#b693ef"/><rect x="3" y="11" width="26" height="16" fill="#d8c6f4"/><rect x="18" y="15" width="10" height="9" fill="#e2458f"/><rect x="20" y="12" width="6" height="4" fill="none" stroke="#e2458f" stroke-width="2"/>',
  chat: '<rect x="2" y="5" width="19" height="13" fill="#8fdcf7"/><rect x="5" y="18" width="4" height="4" fill="#8fdcf7"/><rect x="5" y="9" width="12" height="2" fill="#6b4a9e"/><rect x="5" y="13" width="8" height="2" fill="#6b4a9e"/><rect x="12" y="13" width="18" height="12" fill="#ff8cc6"/><rect x="23" y="25" width="4" height="4" fill="#ff8cc6"/><rect x="15" y="17" width="11" height="2" fill="#fff"/>',
  mail: '<rect x="3" y="7" width="26" height="18" fill="#fff"/><path d="M3 7l13 10L29 7" fill="#ffd3ea" stroke="#e2458f" stroke-width="2"/><rect x="21" y="3" width="8" height="8" fill="#ff5fa8"/><rect x="24" y="5" width="2" height="4" fill="#fff"/>',
  lockdoc: '<rect x="6" y="3" width="16" height="26" fill="#fff"/><rect x="9" y="8" width="10" height="2" fill="#b9a3dc"/><rect x="9" y="12" width="8" height="2" fill="#b9a3dc"/><rect x="16" y="17" width="12" height="11" fill="#e2458f"/><rect x="19" y="13" width="6" height="6" fill="none" stroke="#e2458f" stroke-width="2"/><rect x="21" y="21" width="2" height="3" fill="#fff"/>',
  flower: '<path d="M16 18v11" stroke="#5fcf86" stroke-width="3"/><circle cx="16" cy="8" r="5" fill="#ffb3d9"/><circle cx="9" cy="13" r="5" fill="#d8c6f4"/><circle cx="23" cy="13" r="5" fill="#d8c6f4"/><circle cx="12" cy="19" r="4" fill="#ffb3d9"/><circle cx="20" cy="19" r="4" fill="#ffb3d9"/><circle cx="16" cy="14" r="4" fill="#ffd86e"/>',
  dice: '<path d="M16 2l12 7v14l-12 7-12-7V9z" fill="#8fdcf7"/><path d="M16 2v28M4 9l12 7 12-7" stroke="#6b4a9e" stroke-width="1.5" fill="none"/><rect x="9" y="14" width="3" height="3" fill="#fff"/><rect x="21" y="18" width="3" height="3" fill="#fff"/>',
  wrench: '<path d="M21 3a7 7 0 0 0-6 9L4 23a3 3 0 0 0 5 5l11-11a7 7 0 0 0 9-6l-4 3-4-1-1-4z" fill="#d8c6f4"/><path d="M6 24l1 1" stroke="#6b4a9e" stroke-width="2"/><rect x="22" y="5" width="3" height="3" fill="#ff8cc6"/>',
  brain: '<rect x="5" y="6" width="22" height="18" rx="7" fill="#ffb3d9"/><path d="M16 7v16M10 11q3 2 0 5M22 11q-3 2 0 5M9 19q4-1 6 2M23 19q-4-1-6 2" stroke="#e2458f" stroke-width="2" fill="none"/><rect x="12" y="25" width="8" height="4" fill="#b693ef"/>',
  box: '<rect x="4" y="12" width="24" height="16" fill="#d8c6f4"/><rect x="2" y="8" width="28" height="6" fill="#b693ef"/><rect x="14" y="8" width="4" height="20" fill="#ff8cc6"/><path d="M16 8q-6-7-8-2t8 2q6-7 8-2t-8 2" fill="#ff8cc6"/>',
  conv: '<rect x="3" y="4" width="26" height="24" fill="#fff"/><rect x="6" y="7" width="20" height="6" fill="#8fdcf7"/><path d="M8 18h14l-3-3M24 23H10l3 3" stroke="#e2458f" stroke-width="2" fill="none"/>',
  atlas: '<circle cx="16" cy="16" r="12" fill="#8fdcf7"/><path d="M9 9q4 3 2 7t3 7M20 6q-2 5 3 7t2 8" fill="#7be3a4"/><rect x="15" y="4" width="2" height="24" fill="#ffffff" opacity=".6"/>',
  gallery: '<rect x="2" y="6" width="28" height="20" fill="#ffd86e"/><rect x="5" y="9" width="22" height="14" fill="#fff"/><path d="M7 21l6-6 4 4 3-3 5 5z" fill="#ff8cc6"/><circle cx="21" cy="13" r="2" fill="#8fdcf7"/>',
  doc: '<rect x="7" y="3" width="15" height="26" fill="#fff"/><rect x="22" y="9" width="4" height="20" fill="#fff"/><rect x="10" y="12" width="12" height="2" fill="#b9a3dc"/><rect x="10" y="16" width="13" height="2" fill="#b9a3dc"/><rect x="10" y="20" width="9" height="2" fill="#b9a3dc"/>',
  journal: '<rect x="6" y="3" width="20" height="26" fill="#c7a17a"/><rect x="9" y="3" width="2" height="26" fill="#8a5a3a"/><rect x="14" y="10" width="9" height="2" fill="#fff4e0"/><rect x="14" y="14" width="7" height="2" fill="#fff4e0"/><path d="M20 22l3 3 3-3" fill="#ff5fa8"/>',
  img: '<rect x="3" y="6" width="26" height="20" fill="#ffd86e"/><rect x="5" y="8" width="22" height="16" fill="#d8c6f4"/><rect x="19" y="10" width="4" height="4" fill="#fff"/><path d="M5 24l7-8 5 5 3-3 7 6z" fill="#ff8cc6"/>',
  exe: '<rect x="3" y="5" width="26" height="22" fill="#f5eeff"/><rect x="3" y="5" width="26" height="5" fill="#ff8cc6"/><rect x="7" y="14" width="18" height="2" fill="#e2458f"/><rect x="7" y="19" width="12" height="2" fill="#b9a3dc"/>',
  trash: '<rect x="7" y="8" width="18" height="3" fill="#d8c6f4"/><rect x="13" y="5" width="6" height="3" fill="#d8c6f4"/><path d="M8 11h16l-2 17H10z" fill="#f5eeff"/><rect x="12" y="14" width="2" height="11" fill="#b9a3dc"/><rect x="18" y="14" width="2" height="11" fill="#b9a3dc"/>',
  lock: '<rect x="3" y="9" width="26" height="15" fill="#b9a3dc"/><rect x="12" y="13" width="9" height="9" fill="#e2458f"/><rect x="14" y="9" width="5" height="5" fill="none" stroke="#e2458f" stroke-width="2"/>',
  drive: '<rect x="3" y="9" width="26" height="15" fill="#f5eeff"/><rect x="3" y="21" width="26" height="3" fill="#b9a3dc"/><rect x="6" y="13" width="9" height="2" fill="#6b4a9e"/><rect x="23" y="13" width="3" height="3" fill="#ff8cc6"/>',
  puzzle: '<rect x="2" y="2" width="28" height="28" fill="#fff"/><circle cx="8" cy="8" r="4" fill="#ff5fa8"/><circle cx="24" cy="24" r="4" fill="#ff5fa8"/><path d="M8 8h8v16h8" stroke="#ff5fa8" stroke-width="3" fill="none"/><circle cx="24" cy="8" r="4" fill="#3fb6e0"/><circle cx="8" cy="24" r="4" fill="#ffbf3a"/>',
  feed: '<rect x="2" y="5" width="28" height="20" fill="#f5eeff"/><rect x="4" y="7" width="24" height="16" fill="#ffd3ea"/><rect x="10" y="9" width="12" height="9" fill="#fff"/><rect x="10" y="9" width="12" height="2" fill="#ff8cc6"/><circle cx="26" cy="9" r="2" fill="#ff4d7a"/>',
  soul: '<circle cx="16" cy="16" r="12" fill="#ff8cc6"/><path d="M16 4a12 12 0 0 0 0 24a6 6 0 0 1 0-12a6 6 0 0 0 0-12z" fill="#8fdcf7"/><circle cx="16" cy="10" r="2" fill="#ff8cc6"/><circle cx="16" cy="22" r="2" fill="#8fdcf7"/>',
  tmp: '<rect x="6" y="3" width="20" height="26" fill="#fff"/><rect x="6" y="3" width="20" height="6" fill="#ff8cc6"/><path d="M10 14h12M10 18h9M10 22h11" stroke="#e2458f" stroke-width="2" stroke-dasharray="2 2"/>',
  charm: '<path d="M16 28L5 17Q1 12 5 8T16 9Q22 4 27 8T27 17Z" fill="#ff8cc6"/><rect x="10" y="10" width="4" height="3" fill="#fff"/><rect x="15" y="2" width="2" height="6" fill="#ffd86e"/>',
  hourglass: '<rect x="7" y="3" width="18" height="3" fill="#b693ef"/><rect x="7" y="26" width="18" height="3" fill="#b693ef"/><path d="M9 6h14l-6 10 6 10H9l6-10z" fill="#f5eeff"/><path d="M12 22h8l-4-5z" fill="#ffd86e"/>',
  thread: '<rect x="9" y="6" width="14" height="20" fill="#ff5fa8"/><rect x="7" y="4" width="18" height="3" fill="#c7a17a"/><rect x="7" y="25" width="18" height="3" fill="#c7a17a"/><path d="M9 10h14M9 14h14M9 18h14M9 22h14" stroke="#e2458f" stroke-width="1"/><path d="M23 16q6 2 3 8" stroke="#ff5fa8" stroke-width="2" fill="none"/>',
  queen: '<path d="M8 26h16l-2-12 4-6-6 4-4-7-4 7-6-4 4 6z" fill="#f5eeff"/><rect x="7" y="26" width="18" height="3" fill="#b693ef"/><circle cx="16" cy="4" r="2" fill="#ff8cc6"/>',
};
const icon = n => `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${ICONS[n] || ICONS.doc}</svg>`;
const LOCK_SVG = '<svg viewBox="0 0 12 14" aria-hidden="true"><rect x="1" y="6" width="10" height="8" fill="currentColor"/><rect x="3" y="1" width="6" height="7" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

/* =========================================================
   PLAYER AVATAR
   ========================================================= */
const HAIRC = [['Ink', '#3a2440'], ['Cocoa', '#7a3b2e'], ['Honey', '#e3b35c'], ['Sakura', '#f4a2c8'], ['Sky', '#8fb8ff'], ['Snow', '#efeaf6']];
const EYEC = [['Violet', '#6a4ad6'], ['Mint', '#2f9e6e'], ['Ruby', '#d0405a'], ['Ocean', '#3a7bd5']];
const SKIN = [['Light', '#ffe4d6'], ['Warm', '#f2c4a0'], ['Deep', '#b9805c']];
const HAIRS = ['Short', 'Messy', 'Long', 'Ponytail'];
const OUTFITS = [['Hoodie', '#ff8cc6'], ['Cardigan', '#b693ef'], ['Shirt & tie', '#ffffff'], ['Sweater', '#8fdcf7']];
const ACCS = ['None', 'Glasses', 'Bandage', 'Hairclip'];
const shade = h => { const n = parseInt(h.slice(1), 16), f = .72; return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join(''); };
function drawFace(R, ln, ec, mo, emo, blink) {
  const eye = x0 => { R(ln, x0, 14, 3, 1); R(ec, x0, 15, 3, 2); R('#fff', x0, 15, 1, 1); };
  const shut = x0 => R(ln, x0, 16, 3, 1);
  const blush = n => { R('#ff9cc4', 11, 18, n, 1); R('#ff9cc4', 21 - n, 18, n, 1); };
  switch (emo) {
    case 'happy': [12, 17].forEach(x0 => { R(ln, x0, 16, 1, 1); R(ln, x0 + 1, 15, 1, 1); R(ln, x0 + 2, 16, 1, 1); }); R(mo, 14, 19, 1, 1); R(mo, 15, 20, 2, 1); R(mo, 17, 19, 1, 1); blush(3); break;
    case 'sad': [12, 17].forEach(x0 => { R(ln, x0, 15, 3, 1); R(ec, x0, 16, 3, 1); }); R(ln, 12, 13, 1, 1); R(ln, 19, 13, 1, 1); R('#8fdcf7', 12, 17, 1, 2); R(mo, 15, 19, 2, 1); R(mo, 14, 20, 1, 1); R(mo, 17, 20, 1, 1); blush(2); break;
    case 'surprised': [12, 17].forEach(x0 => { R(ln, x0, 13, 3, 1); R(ec, x0, 14, 3, 3); R('#fff', x0, 14, 1, 1); }); R(mo, 15, 19, 2, 2); blush(2); break;
    case 'angry': R(ln, 12, 13, 2, 1); R(ln, 14, 14, 1, 1); R(ln, 18, 13, 2, 1); R(ln, 17, 14, 1, 1); R(ec, 12, 15, 3, 1); R(ec, 17, 15, 3, 1); R(ln, 12, 16, 3, 1); R(ln, 17, 16, 3, 1); R(mo, 14, 20, 4, 1); R('#ff4d7a', 20, 9, 2, 1); R('#ff4d7a', 20, 8, 1, 3); break;
    case 'pain': R(ln, 12, 14, 1, 1); R(ln, 13, 15, 1, 1); R(ln, 14, 16, 1, 1); R(ln, 13, 16, 1, 1); R(ln, 19, 14, 1, 1); R(ln, 18, 15, 1, 1); R(ln, 17, 16, 1, 1); R(ln, 18, 16, 1, 1); R(ln, 14, 19, 4, 2); R('#fff', 14, 19, 4, 1); R('#8fdcf7', 21, 11, 1, 2); R('#8fdcf7', 10, 12, 1, 1); blush(2); break;
    case 'wince': shut(12); R(ln, 17, 14, 3, 1); R(ec, 17, 15, 3, 1); R(ln, 17, 16, 3, 1); R(mo, 14, 19, 2, 1); R(mo, 16, 20, 2, 1); R('#8fdcf7', 21, 12, 1, 1); blush(2); break;
    case 'shy': [12, 17].forEach(x0 => { R(ln, x0, 15, 3, 1); R(ec, x0 + 1, 16, 2, 1); }); R(mo, 15, 20, 2, 1); blush(4); break;
    default: if (blink) { shut(12); shut(17); } else { eye(12); eye(17); } R(mo, 15, 19, 2, 1); blush(2);
  }
}
function drawAvatar(cv, p, blink, emo = 'neutral') {
  const x = cv.getContext('2d'); x.clearRect(0, 0, 32, 32);
  const R = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const hc = p.hcol || HAIRC[p.hc][1], sk = p.scol || SKIN[p.skin][1], ec = p.ecol || EYEC[p.eye][1], oc = p.ocol || OUTFITS[p.outfit][1], ln = '#4a2d6e', mo = '#c2507a', dk = shade(hc);
  const ex = p.extra || [], has = k => ex.includes(k);
  if (p.hair === 2 || p.hair === 5) R(hc, 8, 10, 16, 17);
  if (p.hair === 5) { R(hc, 6, 14, 3, 13); R(hc, 23, 14, 3, 13); R(dk, 7, 20, 1, 6); R(dk, 24, 18, 1, 7); }
  if (p.hair === 3) { R(hc, 22, 8, 4, 12); R(hc, 23, 19, 3, 4); R('#ff8cc6', 22, 9, 2, 2); }
  if (p.hair === 4) for (let i = 0; i < 5; i++) { const y = 11 + i * 3, o = i % 2; R(hc, 4 + o, y, 5, 3); R(hc, 23 - o, y, 5, 3); R(dk, 4 + o, y + 2, 5, 1); R(dk, 23 - o, y + 2, 5, 1); }
  R(sk, 14, 21, 4, 4);
  R(oc, 7, 25, 18, 7); R(oc, 9, 24, 14, 1);
  if (p.odet === 'blouse') { R('#fff', 9, 24, 6, 2); R('#fff', 17, 24, 6, 2); R(shade(oc), 7, 30, 18, 1); R('#2a1a33', 13, 25, 6, 2); R('#2a1a33', 15, 27, 1, 4); R('#2a1a33', 16, 27, 1, 3); }
  else if (p.odet === 'hoodie') { R(shade(oc), 9, 24, 14, 2); R('#fff', 13, 26, 1, 3); R('#fff', 18, 26, 1, 3); R('#ffd3ea', 11, 29, 10, 2); }
  else {
    if (p.outfit === 0) { R('#fff', 13, 25, 1, 4); R('#fff', 18, 25, 1, 4); R('#e2458f', 10, 29, 12, 1); }
    if (p.outfit === 1) { R('#fff', 14, 24, 4, 8); R('#e9dcfb', 13, 25, 1, 7); R('#e9dcfb', 18, 25, 1, 7); }
    if (p.outfit === 2) { R('#ff5fa8', 15, 25, 2, 6); R('#e2458f', 15, 25, 2, 1); R('#d8c6f4', 7, 31, 18, 1); }
    if (p.outfit === 3) { R('#5ec8ee', 7, 28, 18, 2); R(sk, 14, 24, 4, 1); }
  }
  if (has('choker')) { R('#2a1a33', 13, 22, 6, 1); R('#ff8cc6', 15, 23, 2, 1); }
  R(sk, 10, 10, 12, 11); R(sk, 11, 21, 10, 1); R(sk, 9, 14, 1, 3); R(sk, 22, 14, 1, 3);
  R(hc, 9, 7, 14, 5); R(hc, 10, 6, 12, 1); R(hc, 9, 11, 2, 5); R(hc, 21, 11, 2, 5);
  if (p.hair === 4) { R(hc, 10, 11, 12, 2); R(dk, 10, 12, 12, 1); R(sk, 13, 12, 1, 1); R(sk, 18, 12, 1, 1); }
  else { R(hc, 11, 12, 3, 1); R(hc, 14, 12, 3, 2); R(hc, 18, 12, 3, 1); }
  if (p.hair === 1) { R(hc, 10, 5, 2, 1); R(hc, 14, 4, 2, 2); R(hc, 19, 5, 2, 1); R(hc, 22, 8, 2, 2); R(hc, 8, 9, 1, 2); }
  if (p.hair === 2) { R(hc, 8, 11, 2, 15); R(hc, 22, 11, 2, 15); }
  if (p.hair === 5) { R(hc, 8, 11, 2, 15); R(hc, 22, 11, 2, 15); R(dk, 15, 7, 1, 4); }
  drawFace(R, ln, ec, mo, emo, blink);
  if (p.acc === 1 || has('glasses')) { R(ln, 11, 13, 5, 1); R(ln, 11, 17, 5, 1); R(ln, 11, 13, 1, 5); R(ln, 15, 13, 1, 5); R(ln, 16, 13, 5, 1); R(ln, 16, 17, 5, 1); R(ln, 20, 13, 1, 5); R('rgba(255,255,255,.55)', 12, 14, 1, 1); R('rgba(255,255,255,.55)', 17, 14, 1, 1); }
  if (p.acc === 2) { R('#fff', 18, 18, 3, 2); R('#ffb3c7', 19, 18, 1, 2); }
  if (p.acc === 3) { R('#ffd86e', 18, 8, 3, 1); R('#ffd86e', 19, 7, 1, 3); }
  if (has('headphones')) { R('#2a1a33', 9, 5, 14, 1); R('#2a1a33', 9, 2, 3, 3); R('#2a1a33', 20, 2, 3, 3); R('#ff8cc6', 10, 3, 1, 1); R('#ff8cc6', 21, 3, 1, 1); R('#2a1a33', 7, 12, 3, 6); R('#2a1a33', 22, 12, 3, 6); R('#ff5fa8', 8, 13, 1, 4); R('#ff5fa8', 23, 13, 1, 4); }
  const img = x.getImageData(0, 0, 32, 32), d = img.data, out = [];
  for (let y = 0; y < 32; y++) for (let xx = 0; xx < 32; xx++) {
    const i = (y * 32 + xx) * 4; if (d[i + 3]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = xx + a, Y = y + b; return X >= 0 && Y >= 0 && X < 32 && Y < 32 && d[(Y * 32 + X) * 4 + 3]; })) out.push(i);
  }
  out.forEach(i => { d[i] = 74; d[i + 1] = 45; d[i + 2] = 110; d[i + 3] = 255; });
  x.putImageData(img, 0, 0);
}
// patients drawn in the same pixel-avatar style as the player
const PORTRAIT = {
  prim: { hair: 4, hcol: '#8e2a5c', ecol: '#d0405a', scol: '#ffe4d6', ocol: '#ffb3d1', odet: 'blouse', extra: ['choker'] },
  trix: { hair: 5, hcol: '#ff2e6a', ecol: '#d0405a', scol: '#ffe4d6', ocol: '#ff5f97', odet: 'hoodie', extra: ['glasses', 'headphones'] },
};
const PCACHE = {};
function portraitURL(g, emo = 'neutral') {
  const k = g + ':' + emo;
  if (!PCACHE[k]) { const c = document.createElement('canvas'); c.width = c.height = 32; drawAvatar(c, PORTRAIT[g], false, emo); PCACHE[k] = c.toDataURL(); }
  return PCACHE[k];
}
function avatarURL(p) { const c = document.createElement('canvas'); c.width = c.height = 32; drawAvatar(c, p); return c.toDataURL(); }

/* =========================================================
   CHAT VIEWS
   ========================================================= */
const WHO = {
  boss: { name: 'Boss', sub: '@r.admin · supervisor' },
  prim: { name: 'Prim', sub: 'PRIM_01 · Jirai Kei' },
  trix: { name: 'Trix', sub: 'TRIX_02 · E-Girl' },
  dive: { name: 'DIVE Administration', sub: 'no-reply' },
};
function avHTML(who, cls = '', emo) {
  if (PORTRAIT[who]) return `<img class="av ${cls}${S.g[who] && S.g[who].gone ? ' gone' : ''}" src="${portraitURL(who, emo || 'neutral')}" alt="${esc(WHO[who].name)}">`;
  if (who === 'me') return `<img class="av ${cls}" src="${S.player ? S.player.avatar : ''}" alt="you">`;
  if (ART[who]) return `<img class="av ${cls}${S.g[who] && S.g[who].gone ? ' gone' : ''}" src="${ART[who].face}" alt="${esc(WHO[who].name)}">`;
  if (who === 'dive') return `<div class="av q ${cls}" style="background:#6b4a9e">D</div>`;
  return `<div class="av q ${cls}" aria-label="no avatar">?</div>`;
}
const nameOf = w => w === 'me' ? (S.player ? S.player.name : 'Newbie') : (WHO[w] ? WHO[w].name : w);
function msgHTML(m) {
  if (m.who === 'sys') return `<div class="msg sys${m.del ? ' del' : ''}">${esc(m.text)}</div>`;
  return `<div class="msg ${m.who === 'me' ? 'me' : m.who}">${avHTML(m.who, '', m.emo)}<div class="bub"><div class="meta"><b>${esc(nameOf(m.who))}</b><span>${m.t}</span></div><div class="tx">${esc(m.text)}</div></div></div>`;
}
const VIEWS = {};
function mountChat(key, root, ch) {
  root.innerHTML = `<div class="chat"><header class="chat-head bevel"></header><div class="chat-log sunk" aria-live="polite"></div><div class="chat-choices"></div></div>`;
  $('.chat-log', root).addEventListener('click', () => { skipTyping = true; });
  VIEWS[key] = { ch, root }; renderView(key);
}
function setViewCh(key, ch) { if (!VIEWS[key]) return; VIEWS[key].ch = ch; S.unread[ch] = 0; renderView(key); }
function liveViews(ch) { return Object.values(VIEWS).filter(v => v.ch === ch && v.root.isConnected && !v.root.closest('.win').hidden); }
function chStatus(ch) {
  if (ch === 'boss') return WHO.boss.sub;
  const st = S.g[ch]; if (st && st.gone) return 'discharged · left the facility';
  return WHO[ch].sub;
}
function renderView(key) {
  const v = VIEWS[key]; if (!v || !v.root.isConnected) return;
  const ch = v.ch, head = $('.chat-head', v.root);
  if (ch === 'session') {
    const g = S.session ? S.session.g : null;
    head.innerHTML = g ? `${avHTML(g)}<div class="who"><b>${esc(GIRLS[g].name)}</b><span>session_${g}.tmp · temporary · deletes when the session ends</span></div>` : '<div class="who"><b>session.tmp</b><span>no active session</span></div>';
  } else head.innerHTML = `${avHTML(ch)}<div class="who"><b>${esc(WHO[ch].name)}</b><span>${esc(chStatus(ch))}</span></div>`;
  const log = $('.chat-log', v.root);
  log.innerHTML = S.logs[ch].length ? S.logs[ch].map(msgHTML).join('') : '<div class="msg sys ph">*** no messages yet ***</div>';
  log.scrollTop = log.scrollHeight;
  renderChoicesIn(v);
}
function appendMsg(ch, m) {
  return liveViews(ch).map(v => {
    const log = $('.chat-log', v.root); const ph = log.querySelector('.ph'); if (ph) ph.remove();
    const w = document.createElement('div'); w.innerHTML = msgHTML(m); const el = w.firstChild; log.appendChild(el); log.scrollTop = log.scrollHeight; return el;
  });
}

/* =========================================================
   DIALOGUE ENGINE (START / AUTO / ANSWER / END)
   ========================================================= */
const getDlg = id => S.dyn[id];
let dynN = 0;
function mkDlg(ch, nodes) { const id = 'd' + Date.now().toString(36) + '_' + (dynN++); S.dyn[id] = { dialogue_id: id, character_id: ch, initial_node: 's', nodes }; return id; }
// steps: [{ lines:[str|[sp,str]], choices:[{t, r:[...], req, act}] }]
function seq(ch, sp, steps, trig, param) {
  const parse = (who, t) => { const m = /^\{(\w+)\}\s*/.exec(t); return m ? [who, t.slice(m[0].length), m[1]] : [who, t, null]; };
  const norm = a => (a || []).map(x => Array.isArray(x) ? parse(x[0], x[1]) : parse(sp, x));
  const nodes = { s: { type: 'START', next_node: 'x0_s' } };
  steps.forEach((st, si) => {
    const nextStep = si + 1 < steps.length ? `x${si + 1}_s` : 'e';
    const L = norm(st.lines), afterLines = st.choices ? `q${si}` : nextStep;
    nodes[`x${si}_s`] = { type: 'START', actions_on_enter: st.act || [], pause: st.pause || 0, next_node: L.length ? `x${si}_0` : afterLines };
    if (L.length) L.forEach((ln, k) => nodes[`x${si}_${k}`] = { type: 'AUTO', speaker: ln[0], text: ln[1], emotion: ln[2], next_node: k === L.length - 1 ? afterLines : `x${si}_${k + 1}` });
    if (st.choices) {
      nodes[`q${si}`] = { type: 'ANSWER', choices: st.choices.map((c, k) => ({ choice_id: `c${si}_${k}`, text: c.t, requirements: c.req || {}, effects: {}, actions: c.act || [], next_node: (c.r && c.r.length) ? `r${si}_${k}_0` : nextStep })) };
      st.choices.forEach((c, k) => { const R = norm(c.r); R.forEach((ln, j) => nodes[`r${si}_${k}_${j}`] = { type: 'AUTO', speaker: ln[0], text: ln[1], emotion: ln[2], next_node: j === R.length - 1 ? nextStep : `r${si}_${k}_${j + 1}` }); });
    }
  });
  nodes.e = { type: 'END', trigger_event: trig || 'NONE', event_parameter: param || null };
  return mkDlg(ch, nodes);
}
function runDialogue(id) {
  if (S.active) { if (!S.queue.includes(id)) S.queue.push(id); save(); return; }
  const d = getDlg(id); if (!d) return;
  S.active = { id, ch: d.character_id, node: d.initial_node };
  save(); renderAllChoices(); step();
}
let runToken = 0, skipTyping = false;
async function step() {
  const tok = ++runToken;
  while (S.active) {
    const a = S.active, d = getDlg(a.id), n = d && d.nodes[a.node];
    if (!n) { S.active = null; break; }
    (n.actions_on_enter || []).forEach(doAction);
    if (n.type === 'START') { a.node = n.next_node; await wait(n.pause || 120); if (tok !== runToken) return; continue; }
    if (n.type === 'AUTO') { const ok = await say(a.ch, n, tok); if (!ok) return; a.node = n.next_node; continue; }
    if (n.type === 'ANSWER') { save(); renderAllChoices(); return; }
    if (n.type === 'END') {
      S.active = null; delete S.dyn[a.id]; save(); renderAllChoices();
      handleEnd(n);
      if (!S.active && S.queue.length) { const nx = S.queue.shift(); setTimeout(() => runDialogue(nx), 600); }
      refresh(); return;
    }
  }
}
async function say(ch, n, tok) {
  const sp = n.speaker, views = liveViews(ch);
  if (sp !== 'sys' && views.length) {
    const tmp = appendMsg(ch, { who: sp, text: '…', t: clockStr(), emo: n.emotion }); tmp.forEach(e => e.classList.add('typing'));
    await wait(280 + Math.min(750, n.text.length * 8)); tmp.forEach(e => e.remove());
  } else await wait(200);
  if (tok !== runToken) return false;
  tick(); const m = { who: sp, text: n.text, t: clockStr(), emo: n.emotion || undefined };
  if (ch === 'session' && PORTRAIT[sp] && n.emotion) setFeedEmo(n.emotion);
  S.logs[ch].push(m);
  if (liveViews(ch).length) {
    const els = appendMsg(ch, { ...m, text: '' });
    await Promise.all(els.map(el => typeInto(el.querySelector('.tx') || el, n.text)));
  } else if (sp !== 'sys') {
    S.unread[ch] = (S.unread[ch] || 0) + 1; SFX.chime();
    toast('Yappy Yappy · ' + (ch === 'session' ? 'session.tmp' : nameOf(sp)), esc(n.text.length > 90 ? n.text.slice(0, 88) + '…' : n.text), () => ch === 'session' ? focusSessionChat() : openYap(ch));
    renderIcons(); renderTasks(); renderBuddies();
  }
  save();
  await wait(sp === 'sys' ? 360 : 520);
  return tok === runToken;
}
function typeInto(el, text) {
  return new Promise(res => {
    if (!el) return res();
    skipTyping = false; let i = 0;
    const iv = setInterval(() => {
      if (skipTyping || !el.isConnected) { el.textContent = text; clearInterval(iv); return res(); }
      i += 2; el.textContent = text.slice(0, i); if (i % 6 === 0) SFX.tick();
      const log = el.closest('.chat-log'); if (log && i % 16 === 0) log.scrollTop = log.scrollHeight;
      if (i >= text.length) { el.textContent = text; clearInterval(iv); if (log) log.scrollTop = log.scrollHeight; res(); }
    }, 20);
  });
}
// requirements: items, apps, mementos, know (all), anyKnow (one of)
function reqList(r) {
  const out = []; if (!r) return out;
  (r.items || []).forEach(x => out.push({ cat: 'needs an item', label: x, ok: S.inv.includes(x) }));
  (r.apps || []).forEach(x => out.push({ cat: 'needs software', label: x, ok: S.apps.includes(x), app: true }));
  (r.mementos || []).forEach(x => out.push({ cat: 'needs a memento', label: x, ok: hasMem(x) }));
  (r.used || []).forEach(x => out.push({ cat: 'needs software you\'ve used', label: x, ok: !!(S.used && S.used[x]), app: true }));
  (r.know || []).forEach(x => out.push({ cat: 'you don\'t know enough yet', label: 'you know this', ok: knows(x) }));
  if (r.cond) out.push(...condReqs(r.cond));
  if (r.anyKnow) out.push({ cat: 'you don\'t know her well enough', label: 'you know her', ok: r.anyKnow.some(knows) });
  return out;
}
function renderAllChoices() { Object.values(VIEWS).forEach(renderChoicesIn); }
function renderChoicesIn(v) {
  if (!v.root.isConnected) return;
  const el = $('.chat-choices', v.root), a = S.active;
  if (a && a.ch === v.ch) {
    const n = getDlg(a.id) && getDlg(a.id).nodes[a.node];
    if (n && n.type === 'ANSWER') {
      el.innerHTML = n.choices.map((c, i) => {
        const reqs = reqList(c.requirements), miss = reqs.find(r => !r.ok);
        if (miss) return `<button class="btn choice locked" disabled aria-label="Locked choice"><span class="k">${LOCK_SVG}</span><span class="lockbar">▒▒▒▒▒▒▒▒▒▒▒▒▒▒</span></button>`;
        const chips = reqs.filter(r => !r.hide).map(r => `<span class="chip ok${r.app ? ' app' : ''}">✓ ${esc(r.label)}</span>`).join('');
        return `<button class="btn choice" data-i="${i}"><span class="k">${i + 1}</span><span class="ch-text">${esc(c.text)}</span>${chips ? `<span class="chips">${chips}</span>` : ''}</button>`;
      }).join('');
      $$('.choice[data-i]', el).forEach(b => b.onclick = () => choose(+b.dataset.i));
      return;
    }
    el.innerHTML = ''; return;
  }
  // idle controls
  if (v.ch === 'boss' && S.phase === 'night' && S.night.bossPending && !a) {
    el.innerHTML = `<button class="composer" id="nb-boss"><span class="dots">Boss is typing</span><b>Read</b></button>`;
    $('#nb-boss', el).onclick = () => { SFX.click(); startBossNight(); }; return;
  }
  if (S.g[v.ch] && S.phase === 'night' && !a) {
    const g = v.ch, ok = canNightChat(g), c = nightConvo(g);
    if (ok && c.by === 'girl') { el.innerHTML = `<button class="composer" data-nc="${g}"><span class="dots">${esc(GIRLS[g].name)} is typing</span><b>Read</b></button>`; }
    else if (ok) { el.innerHTML = `<button class="composer" data-nc="${g}"><span>Message ${esc(GIRLS[g].name)}…</span><b>Send</b></button>`; }
    else el.innerHTML = `<div class="status-line">${esc(nightChatWhyNot(g))}</div>`;
    const b = $('[data-nc]', el); if (b) b.onclick = () => { SFX.click(); startNightChat(g); };
    return;
  }
  el.innerHTML = `<div class="status-line">${esc(statusText(v.ch))}</div>`;
}
function statusText(ch) {
  if (S.active && S.active.ch !== ch) return 'Waiting… another conversation is active.';
  if (ch === 'session') return S.session ? 'Session in progress.' : 'No session.';
  if (ch === 'boss') return 'Boss is away.';
  if (S.g[ch] && S.g[ch].gone) return `${WHO[ch].name} has left the facility.`;
  return `${WHO[ch].name} is offline.`;
}
function choose(i) {
  const a = S.active; if (!a) return;
  const n = getDlg(a.id).nodes[a.node]; if (!n || n.type !== 'ANSWER') return;
  const c = n.choices[i]; if (!c) return;
  if (reqList(c.requirements).some(r => !r.ok)) { SFX.buzz(); return; }
  SFX.click(); tick();
  const m = { who: 'me', text: c.text, t: clockStr() }; S.logs[a.ch].push(m); appendMsg(a.ch, m);
  (c.actions || []).forEach(doAction);
  S.route.push(c.choice_id);
  a.node = c.next_node; renderAllChoices(); save(); step();
}
const KNOW_TXT = {
  prim_traces: 'Prim traces other people\'s art.', prim_hand: 'Prim\'s scars came from a hand that wasn\'t hers.', prim_sea: 'Prim dreams about a sea she has never seen.', prim_color: 'Prim loves coloring inside other people\'s lines.',
  trix_math: 'Trix is a math prodigy.', trix_chess: 'Trix plays 14 chess games in her head.', trix_proofs: 'Trix wants to do proofs all day, in sweatpants.', trix_soft: 'Trix thinks Prim is brave.', boss_travel: 'Someone doubts Boss\'s travel stories.', boss_lie: 'Boss mixed up Paris and Rome.',
};
function doAction(a) {
  if (a.action === 'GIVE_ITEM') { if (!S.inv.includes(a.value)) { S.inv.push(a.value); SFX.item(); toast('Added to inventory', `<b>${esc(a.value)}</b>`); } }
  else if (a.action === 'KNOW') { if (!knows(a.value)) S.know.push(a.value); }
  else if (a.action === 'JOURNAL') { if (!S.journal.some(j => j.text === a.value)) S.journal.push({ day: S.day, text: a.value }); }
  else if (a.action === 'SET_FLAG') S.flags[a.value] = true;
  else if (a.action === 'UNSET_FLAG') delete S.flags[a.value];
  else if (a.action === 'SHOW') { S.show[a.value[0]] = a.value[1]; renderShowcase(); }
  else if (a.action === 'GLITCH') glitch(a.value || 'soft');
  else if (a.action === 'PROBATION') { S.flags.probation = true; }
  else if (a.action === 'PING') { S.flags.ping = a.value; S.met = S.met || {}; S.met.prim = true; SFX.vibrate(); }
  save(); refresh();
}
const A = { know: k => ({ action: 'KNOW', value: k }), jr: t => ({ action: 'JOURNAL', value: t }), flag: f => ({ action: 'SET_FLAG', value: f }), show: (g, v) => ({ action: 'SHOW', value: [g, v] }) };
function stampProbation() {
  const t = document.createElement('div'); t.className = 'probstamp'; t.innerHTML = `<b>PROBATION</b><span>DAY ${S.day} / ${LAST_DAY}</span>`;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3400);
}
function handleEnd(n) {
  switch (n.trigger_event) {
    case 'BRIEF_DONE': S.flags.briefed = true; S.flags.ping = 'brain'; refresh(); break;
    case 'MORNING_DONE': afterMorning(); break;
    case 'SES_LEVEL': nextLevel(); break;
    case 'SES_AFTER': afterExchange(); break;
    case 'SES_CLOSE': closeSession(); break;
    case 'BOSS_NIGHT_DONE': S.night.bossDone = true; if (S.flags.protoReady && !S.flags.protoEnd) protoEndBoss(); break;
    case 'SHOW_DONE': if (PLAYABLE.filter(k => onSite(k) && met(k)).every(k => S.show[k])) setTimeout(() => runDialogue(seq('boss', 'boss', [{ lines: ['Lovely! Like the Louvre, but with more glitter and fewer Mona Lisas.', 'I\'m keeping everyone\'s pieces. That\'s it for today. Go rest.'] }])), 900), setTimeout(() => { S.flags.nightAfter = true; }, 1500); break;
    case 'PROTO_END': endGame('proto'); break;
  }
  save();
}

/* =========================================================
   WINDOW MANAGER
   ========================================================= */
const WINS = {}; let zTop = 10, cascade = 0;
function openWin(id, o) {
  if (WINS[id]) { WINS[id].el.hidden = false; focusWin(id); return WINS[id]; }
  const el = document.createElement('section'); el.className = 'win'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', o.title);
  const dk = $('#desktop'), dw = dk.clientWidth, dh = dk.clientHeight;
  const w = Math.min(o.w || 520, dw - 16), h = Math.min(o.h || 420, dh - 16);
  const x = clamp(o.x ?? (130 + cascade * 26), 6, Math.max(6, dw - w - 6)), y = clamp(o.y ?? (14 + cascade * 22), 6, Math.max(6, dh - h - 6));
  cascade = (cascade + 1) % 6;
  Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  el.innerHTML = `<div class="titlebar">${icon(o.icon)}<span class="tt">${esc(o.title)}</span>
    <button class="btn tbtn" data-a="min" aria-label="Minimize">_</button><button class="btn tbtn" data-a="close" aria-label="Close">×</button></div><div class="win-body"></div>`;
  dk.appendChild(el);
  const rec = { el, o, body: el.querySelector('.win-body'), upd: [] }; WINS[id] = rec;
  el.addEventListener('pointerdown', () => focusWin(id), true);
  const minimize = () => { el.hidden = true; renderTasks(); };
  el.querySelector('[data-a=close]').onclick = () => { SFX.click(); if (o.noClose && o.noClose()) { minimize(); toast(o.title, 'This window stays open until the session ends.'); } else closeWin(id); };
  el.querySelector('[data-a=min]').onclick = () => { SFX.click(); minimize(); };
  const tb = el.querySelector('.titlebar');
  tb.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || narrow()) return;
    const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop; tb.setPointerCapture(e.pointerId);
    const mv = ev => { el.style.left = clamp(ox + ev.clientX - sx, -el.offsetWidth + 80, dk.clientWidth - 60) + 'px'; el.style.top = clamp(oy + ev.clientY - sy, 0, dk.clientHeight - 30) + 'px'; };
    const up = () => { tb.removeEventListener('pointermove', mv); tb.removeEventListener('pointerup', up); };
    tb.addEventListener('pointermove', mv); tb.addEventListener('pointerup', up);
  });
  o.render(rec.body, rec); focusWin(id); renderTasks();
  return rec;
}
function closeWin(id) { const w = WINS[id]; if (!w) return; w.upd.forEach(f => UPD.delete(f)); if (w.o.onClose) w.o.onClose(); w.el.remove(); delete WINS[id]; renderTasks(); }
function focusWin(id) { Object.entries(WINS).forEach(([k, w]) => w.el.classList.toggle('inactive', k !== id)); const w = WINS[id]; if (w) { w.el.hidden = false; w.el.style.zIndex = ++zTop; } renderTasks(); }
function addUpd(rec, f) { rec.upd.push(f); UPD.add(f); }
function renderTasks() {
  const t = $('#tasks'); if (!t) return;
  const top = Object.entries(WINS).filter(([, w]) => !w.el.hidden).sort((a, b) => b[1].el.style.zIndex - a[1].el.style.zIndex)[0];
  const unread = Object.values(S.unread).reduce((a, b) => a + b, 0);
  t.innerHTML = Object.entries(WINS).map(([id, w]) => `<button class="btn task${top && top[0] === id ? ' on' : ''}${id === 'yap' && unread ? ' flash' : ''}" data-id="${id}" title="${esc(w.o.title)}">${icon(w.o.icon)}<span>${esc(w.o.title)}</span></button>`).join('');
  $$('.task', t).forEach(b => b.onclick = () => {
    const w = WINS[b.dataset.id]; SFX.click();
    if (!w.el.hidden && top && top[0] === b.dataset.id) { w.el.hidden = true; renderTasks(); } else { focusWin(b.dataset.id); if (b.dataset.id === 'yap') setViewCh('yap', yapCh); if (b.dataset.id === 'sess') renderView('sess'); }
  });
}

/* =========================================================
   DESKTOP / TASKBAR
   ========================================================= */
function toast(title, text, onclick) {
  const t = document.createElement('div'); t.className = 'toast bevel' + (onclick ? ' click' : '');
  t.innerHTML = `<div class="tb">${icon('soul')}<span>${esc(title)}</span></div><div class="tx">${text}</div>`;
  if (onclick) t.onclick = () => { onclick(); t.remove(); };
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 5200);
  const all = $$('.toast'); if (all.length > 3) all[0].remove();
}
function renderIcons() {
  const box = $('#icons'); if (!box) return;
  const unread = (S.unread.boss || 0) + (S.unread.prim || 0) + (S.unread.trix || 0);
  const mailUnread = S.mail.filter(m => !m.read).length;
  const list = [
    { id: 'yap', label: 'Yappy Yappy', ic: 'chat', fn: () => openYap(), badge: unread, ping: S.flags.ping === 'yap' },
    { id: 'mail', label: 'DiveMail', ic: 'mail', fn: openMail, badge: mailUnread },
    { id: 'brain', label: 'Fix-it', ic: 'wrench', fn: openBrain, ping: S.flags.ping === 'brain', isNew: S.phase === 'day' && availableToday().length > 0 && !S.session },
    { id: 'mbox', label: 'MementoBox', ic: 'box', fn: openMBox },
  ];
  if (S.session) list.splice(3, 0, { id: 'ses', label: 'session_' + S.session.g + '.tmp', ic: 'tmp', fn: focusSessionChat, isNew: true });
  if (SPECIAL[S.day] === 'showcase' && S.phase === 'day') list.push({ id: 'show', label: 'Showcase.exe', ic: 'gallery', fn: openShowcase, isNew: PLAYABLE.filter(k => onSite(k) && met(k)).some(k => !S.show[k]) });
  if (S.apps.includes('UnitConv.exe')) list.push({ id: 'conv', label: 'UnitConv.exe', ic: 'conv', fn: openConv });
  if (S.apps.includes('Atlas.exe')) list.push({ id: 'atlas', label: 'Atlas.exe', ic: 'atlas', fn: openAtlas });
  list.push({ id: 'bin', label: 'Recycle Bin', ic: 'trash', fn: openBin });
  if (S.flags.logRestored) list.push({ id: 'log', label: 'personal_log.txt', ic: 'lockdoc', fn: openLog });
  const sig = JSON.stringify(list.map(i => [i.id, i.badge, i.isNew, i.label, i.ic, i.ping]));
  if (box.dataset.sig === sig) return; box.dataset.sig = sig;
  box.innerHTML = list.map(i => `<button class="dicon${i.isNew ? ' new' : ''}${i.ping ? ' ping' : ''}" data-id="${i.id}">${icon(i.ic)}<span>${esc(i.label)}</span>${i.badge ? `<span class="badge">${i.badge} new</span>` : ''}</button>`).join('');
  list.forEach(i => box.querySelector(`[data-id="${i.id}"]`).onclick = () => { SFX.click(); i.fn(); });
}
function renderTray() {
  const el = $('#trayStats'); if (!el) return;
  // just a date, like any desktop. (day 1 = Mon 07/06)
  const d = new Date(2004, 5, 6 + S.day), wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  el.innerHTML = `<span class="ts-s">${wd} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}</span>`;
  $('#clock').textContent = (S.phase === 'night' ? '☾ ' : '') + clockStr();
}
function buildTaskbar() {
  $('#startbtn').innerHTML = `${icon('soul')}<span>Start</span>`;
  const sm = $('#startmenu');
  const items = [
    ['Yappy Yappy', 'chat', () => openYap()], ['DiveMail', 'mail', openMail], ['Fix-it', 'wrench', openBrain], ['MementoBox', 'box', openMBox], ['Recycle Bin', 'trash', openBin], null,
    ['CRT scanlines on/off', 'feed', () => document.body.classList.toggle('nocrt')], ['New game…', 'exe', confirmReset], ['Shut down', 'lock', () => { if (S.phase === 'night') shutDown(); else SFX.buzz(); }],
  ];
  sm.innerHTML = `<div class="side">DIVE OS <i>v2.4</i></div><ul>${items.map((it, i) => it ? `<li><button role="menuitem" data-i="${i}">${icon(it[1])}<span>${esc(it[0])}</span></button></li>` : '<li><hr></li>').join('')}</ul>`;
  $$('button', sm).forEach(b => b.onclick = () => { SFX.click(); toggleStart(false); items[b.dataset.i][2](); });
  $('#startbtn').onclick = () => { SFX.click(); toggleStart(sm.hidden); };
  document.addEventListener('pointerdown', e => { if (!sm.hidden && !e.target.closest('#startmenu,#startbtn')) toggleStart(false); });
  $('#soundbtn').onclick = () => { AU.on = !AU.on; $('#soundbtn').textContent = AU.on ? '♪' : '×'; if (AU.master) AU.master.gain.value = AU.on ? .5 : 0; };
}
function toggleStart(on) { const sm = $('#startmenu'); sm.hidden = !on; $('#startbtn').setAttribute('aria-expanded', String(on)); $('#startbtn').classList.toggle('on', on); }
function confirmReset() {
  openWin('reset', {
    title: 'New game', icon: 'exe', w: 340, h: 200, render: b => {
      b.innerHTML = `<div style="padding:8px;display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:1.5"><p style="margin:0">Wipe save_data.json and return to Choose Appearance? All progress will be lost.</p>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="rs-no">Cancel</button><button class="btn primary" id="rs-yes">Start over</button></div></div>`;
      $('#rs-no', b).onclick = () => closeWin('reset'); $('#rs-yes', b).onclick = () => { wipeSave(); location.reload(); };
    }
  });
}

/* =========================================================
   YAPYAP
   ========================================================= */
let yapCh = 'boss';
function openYap(ch) {
  if (ch) yapCh = ch;
  openWin('yap', {
    title: 'Yappy Yappy', icon: 'chat', w: 600, h: 520, x: 150, y: 24, noClose: () => !!S.active, render: (b, rec) => {
      b.innerHTML = `<div class="yapc"><div class="yap"><aside class="buddies sunk" id="yap-buddies"></aside><div id="yap-chat" style="min-width:0;min-height:0"></div></div></div>`;
      mountChat('yap', $('#yap-chat', b), yapCh); addUpd(rec, renderBuddies); addUpd(rec, () => renderChoicesIn(VIEWS.yap));
    }, onClose: () => { delete VIEWS.yap; }
  });
  setViewCh('yap', yapCh); renderBuddies(); renderTasks();
  if (S.flags.ping === 'yap') { S.flags.ping = null; }
  if (S.day === 1 && S.player && !S.flags.briefStarted) { S.flags.briefStarted = true; S.unread.boss = 0; yapCh = 'boss'; setViewCh('yap', 'boss'); setTimeout(() => runDialogue(briefDialogue()), 700); }
  renderIcons();
}
const onSite = k => GIRLS[k].built && !S.g[k].gone && S.day >= GIRLS[k].from;
function renderBuddies() {
  const el = $('#yap-buddies'); if (!el) return;
  const typing = ch => S.phase === 'night' && !S.active && (ch === 'boss' ? S.night.bossPending : girlWaiting(ch) && canNightChat(ch));
  const row = (ch, sub) => `<button class="buddy${yapCh === ch ? ' sel' : ''}" data-ch="${ch}">${avHTML(ch)}<span>${esc(WHO[ch].name)}<small class="${typing(ch) ? 'dots' : ''}">${esc(typing(ch) ? 'typing' : sub)}</small></span>${S.unread[ch] ? `<span class="un">${S.unread[ch]}</span>` : ''}</button>`;
  const gstat = k => S.g[k].gone ? 'offline' : (S.phase === 'night' && canNightChat(k)) || (S.phase === 'day') ? 'online' : 'offline';
  const people = PLAYABLE.filter(k => met(k) && (S.g[k].sessions > 0 || S.logs[k].length));
  el.innerHTML = `<h4>Chats</h4>${row('boss', 'supervisor')}
   ${S.session ? `<button class="buddy tmp${yapCh === 'session' ? ' sel' : ''}" data-ch="session">${avHTML(S.session.g)}<span>session_${S.session.g}.tmp<small>temporary</small></span></button>` : ''}
   ${people.map(k => row(k, gstat(k))).join('')}`;
  $$('.buddy[data-ch]', el).forEach(bt => bt.onclick = () => {
    SFX.click(); const ch = bt.dataset.ch; yapCh = ch; setViewCh('yap', ch); renderBuddies(); renderTasks(); renderIcons();
    if (S.phase === 'night' && !S.active) { if (ch === 'boss' && S.night.bossPending) startBossNight(); else if (PLAYABLE.includes(ch) && girlWaiting(ch) && canNightChat(ch)) startNightChat(ch); }
  });
}

/* =========================================================
   BOSS: travel talk, mornings, nights
   ========================================================= */
const kpiMax = () => 3 * Math.max(1, ORDER.filter(k => S.met && S.met[k]).length);
const KPI = () => `KPI ${layersTotal()}/${kpiMax()} layers`;
const ROOKIE = () => (S.player && S.player.name && S.player.name !== 'Newbie') ? S.player.name : 'rookie';

/* =========================================================
   DIALOGUE DATA · everything the characters say lives in data/*.csv
   (session, morning, night_boss, night_index, night_lines).
   On a web server the game reads data/*.csv fresh on every load;
   opened as a local file it uses the copy built into this page.
   ========================================================= */
const CSV_FILES = ['session', 'morning', 'night_boss', 'night_index', 'night_lines'];
const CSV_EMBED = __CSV_EMBED__;
const DATA_ISSUES = [];
let DD = { session: [], morning: [], boss: [], nightIdx: [], night: {}, source: 'built-in' };

function dataIssue(file, row, msg) { DATA_ISSUES.push({ file, row, msg }); }

// RFC-4180-ish parser: quotes, doubled quotes, newlines inside quotes, BOM, CRLF
function parseCSV(text) {
  text = String(text || '').replace(/^﻿/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"' && f === '') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
// -> [{col: value, _row: spreadsheet row number}]; blank rows skipped
function csvObjects(file, text) {
  const rows = parseCSV(text); if (!rows.length) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].every(v => !v.trim())) continue;
    const o = { _row: i + 1, _file: file }; head.forEach((h, k) => { if (h) o[h] = (rows[i][k] || '').trim(); });
    out.push(o);
  }
  return out;
}
// rows sharing an id form one entry; a blank id continues the entry above
function entries(rows) {
  const map = new Map(); let last = null;
  rows.forEach(r => {
    const id = r.id || last;
    if (!id) { dataIssue(r._file, r._row, 'row has no id'); return; }
    last = id;
    if (!map.has(id)) map.set(id, { id, meta: r, rows: [] });
    map.get(id).rows.push(r);
  });
  return [...map.values()];
}

/* ---------- conditions: "know:prim_sea; day>=5; !flag:x; used:Atlas.exe|app:Atlas.exe" ---------- */
const COND_HAS = ['know', 'flag', 'app', 'used', 'memento', 'item', 'met', 'gone', 'worked', 'special'];
const COND_VARS = ['day', 'quakes', 'kpi', 'patients', 'fixes', 'layers', 'sessions', 'special'];
const condCache = {};
function parseCond(str, file, row) {
  str = (str || '').trim(); if (!str) return [];
  if (condCache[str]) return condCache[str];
  const toks = str.split(/\s*[;&]\s*/).filter(Boolean).map(tok => {
    let neg = false; if (tok[0] === '!') { neg = true; tok = tok.slice(1).trim(); }
    let key = null;
    const alts = tok.split('|').map(a => {
      a = a.trim();
      let m = /^([\w.]+)\s*(>=|<=|!=|=|>|<)\s*(.+)$/.exec(a);
      if (m) { key = m[1] + m[2]; return { kind: 'cmp', key: m[1], op: m[2], val: m[3].trim() }; }
      m = /^(\w+)\s*:\s*(.+)$/.exec(a);
      if (m) { key = m[1] + ':'; return { kind: 'has', key: m[1].toLowerCase(), val: m[2].trim() }; }
      if (key) return parseCond(key + a, file, row)[0].alts[0];   // "know:a|b" means know:a or know:b
      return { kind: 'bad', raw: a };
    });
    alts.forEach(a => {
      if (a.kind === 'bad') dataIssue(file, row, `can't read condition "${a.raw}"`);
      else if (a.kind === 'has' && !COND_HAS.includes(a.key)) dataIssue(file, row, `unknown condition "${a.key}:" (use ${COND_HAS.join(', ')})`);
      else if (a.kind === 'cmp' && !COND_VARS.includes(a.key.split('.')[0])) dataIssue(file, row, `unknown number "${a.key}" (use ${COND_VARS.join(', ')})`);
      else if (a.kind === 'cmp' && a.key !== 'special' && isNaN(Number(a.val))) dataIssue(file, row, `"${a.key}${a.op}${a.val}" should compare with a number`);
    });
    return { neg, alts };
  });
  return (condCache[str] = toks);
}
function condVar(k) {
  const [a, b] = k.split('.');
  if (a === 'day') return S.day; if (a === 'quakes') return S.quakes; if (a === 'kpi') return layersTotal();
  if (a === 'fixes') return S.fixes || 0; if (a === 'patients') return availableToday().length;
  if (a === 'special') return SPECIAL[S.day] || 'none';
  if (a === 'layers') return b && S.g[b] ? S.g[b].layer : 0;
  if (a === 'sessions') return b && S.g[b] ? S.g[b].sessions : 0;
  return undefined;
}
function condAlt(a) {
  if (a.kind === 'cmp') {
    const v = condVar(a.key); if (v === undefined) return false;
    const n = Number(a.val), num = typeof v === 'number' && !isNaN(n), x = num ? n : a.val.toLowerCase(), y = num ? v : String(v).toLowerCase();
    return { '=': y === x, '!=': y !== x, '>=': y >= x, '<=': y <= x, '>': y > x, '<': y < x }[a.op];
  }
  if (a.kind !== 'has') return false;
  const v = a.val;
  switch (a.key) {
    case 'know': return knows(v);
    case 'flag': return !!S.flags[v];
    case 'app': return S.apps.includes(v);
    case 'used': return !!(S.used && S.used[v]);
    case 'memento': return hasMem(v);
    case 'item': return S.inv.includes(v);
    case 'met': return met(v);
    case 'gone': return !!(S.g[v] && S.g[v].gone);
    case 'worked': return (S.todayWorked || []).includes(v);
    case 'special': return (SPECIAL[S.day] || 'none') === v.toLowerCase();
  }
  return false;
}
const condTok = t => t.alts.some(condAlt) !== t.neg;
function cond(str) { return parseCond(str).every(condTok); }
// for choices: one entry per condition (locks the choice; apps / mementos / knowledge show as ✓ chips once met)
function condReqs(str) {
  return parseCond(str).map(t => {
    const a = t.alts[0], label = { app: 1, used: 1, memento: 1, item: 1 }[a.key] && !t.neg && t.alts.length === 1 ? a.val : a.key === 'know' && !t.neg ? 'you know this' : '';
    return { ok: condTok(t), label, app: a.key === 'app' || a.key === 'used', hide: !label };
  });
}

/* ---------- effects: "know:prim_sea; flag:x; probation; ping:brain; pause:900" ---------- */
function parseEffects(str, file, row) {
  const act = []; let pause = 0;
  (str || '').split(/\s*;\s*/).filter(Boolean).forEach(tok => {
    const m = /^(\w+)\s*(?::\s*(.*))?$/.exec(tok.trim()); if (!m) { dataIssue(file, row, `can't read effect "${tok}"`); return; }
    const k = m[1].toLowerCase(), v = (m[2] || '').trim();
    if (k === 'know' && v) act.push({ action: 'KNOW', value: v });
    else if (k === 'flag' && v) act.push({ action: 'SET_FLAG', value: v });
    else if (k === 'unflag' && v) act.push({ action: 'UNSET_FLAG', value: v });
    else if (k === 'journal' && v) act.push({ action: 'JOURNAL', value: v });
    else if (k === 'probation') act.push({ action: 'PROBATION' });
    else if (k === 'ping' && v) act.push({ action: 'PING', value: v });
    else if (k === 'glitch') act.push({ action: 'GLITCH', value: v || 'soft' });
    else if (k === 'show' && /^\w+\s*=\s*\w+$/.test(v)) act.push({ action: 'SHOW', value: v.split(/\s*=\s*/) });
    else if (k === 'pause' && !isNaN(+v)) pause = +v;
    else dataIssue(file, row, `unknown effect "${tok}" (use know:, flag:, unflag:, journal:, probation, ping:, glitch, show:, pause:)`);
  });
  return { act, pause };
}
const EMOS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'shy', 'pain', 'wince'];
// entry rows -> steps [{lines:[{who,emo,text}], act, pause, choices:[{t, cond, act, r:[...]}]}]
function compileSteps(e) {
  const steps = []; let cur = null, lastChoice = null;
  const fresh = () => { cur = { lines: [], act: [], pause: 0 }; steps.push(cur); lastChoice = null; };
  e.rows.forEach(r => {
    const type = (r.type || 'line').toLowerCase(), F = r._file, R = r._row;
    if (r.emo && !EMOS.includes(r.emo.toLowerCase())) dataIssue(F, R, `unknown emo "${r.emo}" (use ${EMOS.join(', ')})`);
    const ln = { who: (r.who || '').toLowerCase() || null, emo: (r.emo || '').toLowerCase() || null, text: r.text || '' };
    const fx = parseEffects(r.effects, F, R); if (r.journal) fx.act.push({ action: 'JOURNAL', value: r.journal });
    if (type === 'line') {
      if (!ln.text) dataIssue(F, R, 'line has no text');
      if (!cur || cur.choices || ((fx.act.length || fx.pause) && cur.lines.length)) fresh();
      cur.act.push(...fx.act); if (fx.pause) cur.pause = fx.pause;
      if (r.requires) dataIssue(F, R, '"requires" only works on choice rows (use the "if" column for a whole entry)');
      cur.lines.push(ln);
    } else if (type === 'choice') {
      if (!ln.text) dataIssue(F, R, 'choice has no text');
      if (!cur) fresh();
      cur.choices = cur.choices || [];
      if (r.requires) parseCond(r.requires, F, R);
      lastChoice = { t: ln.text, cond: r.requires || '', act: fx.act, r: [] }; cur.choices.push(lastChoice);
    } else if (type === 'reply') {
      if (!lastChoice) { dataIssue(F, R, 'reply has no choice above it'); return; }
      if (fx.act.length) dataIssue(F, R, 'effects/journal on a reply are ignored — put them on the choice');
      lastChoice.r.push(ln);
    } else dataIssue(F, R, `unknown type "${r.type}" (use line, choice, reply)`);
  });
  return steps;
}
function compileEntries(file, text, metaCols) {
  return entries(csvObjects(file, text)).map(e => {
    const m = { id: e.id, steps: compileSteps(e), _file: file, _row: e.meta._row };
    metaCols.forEach(c => m[c] = (e.meta[c] || '').trim());
    if (m.if) parseCond(m.if, file, m._row);
    if (m.day && !/^\d+(\s*-\s*\d+)?$/.test(m.day)) dataIssue(file, m._row, `day "${m.day}" should be a number like 3 or a range like 2-14`);
    return m;
  });
}
function compileData(texts) {
  DATA_ISSUES.length = 0;
  const d = { source: DD.source };
  d.session = compileEntries('session.csv', texts.session, ['girl', 'kind', 'layer', 'trigger', 'if']);
  d.session.forEach(e => {
    e.girl = e.girl.toLowerCase(); e.kind = e.kind.toLowerCase(); e.trigger = e.trigger.toUpperCase();
    if (!['intro', 'outro', 'react', 'break', 'quiz'].includes(e.kind)) dataIssue(e._file, e._row, `kind "${e.kind}" should be intro, outro, react, break or quiz`);
    if (e.trigger && !['WIN_HIGH', 'WIN_LOW', 'PERFECT_HIGH', 'PERFECT_LOW', 'FAIL_MOVES', 'FAIL_TIME'].includes(e.trigger)) dataIssue(e._file, e._row, `trigger "${e.trigger}" is not one of WIN_HIGH, WIN_LOW, PERFECT_HIGH, PERFECT_LOW, FAIL_MOVES, FAIL_TIME`);
  });
  d.morning = compileEntries('morning.csv', texts.morning, ['day', 'if', 'group', 'once']);
  d.boss = compileEntries('night_boss.csv', texts.night_boss, ['kind', 'girl', 'day', 'if']);
  d.boss.forEach(e => { e.girl = e.girl.toLowerCase(); e.kind = e.kind.toLowerCase(); if (!['opening', 'ask', 'farewell', 'extra', 'closing'].includes(e.kind)) dataIssue(e._file, e._row, `kind "${e.kind}" should be opening, ask, farewell, extra or closing`); });
  const lines = {}; compileEntries('night_lines.csv', texts.night_lines, []).forEach(e => lines[e.id] = e);
  d.nightIdx = csvObjects('night_index.csv', texts.night_index).map(r => {
    const starts = (r.starts || 'girl').toLowerCase();
    if (!['girl', 'me'].includes(starts)) dataIssue(r._file, r._row, `starts "${r.starts}" should be girl or me`);
    if (r.if) parseCond(r.if, r._file, r._row);
    if (!lines[r.id]) dataIssue(r._file, r._row, `no lines for "${r.id}" in night_lines.csv`);
    return { id: r.id, girl: (r.girl || '').toLowerCase(), order: +r.order || 0, by: starts === 'me' ? 'me' : 'girl', layer: +r.layers_broken || 0, if: r.if || '', _row: r._row };
  }).filter(c => lines[c.id]);
  d.nightIdx.forEach((c, i) => c._i = i);
  d.nightIdx.sort((a, b) => a.order - b.order || a._i - b._i);
  Object.keys(lines).forEach(id => { if (!d.nightIdx.some(c => c.id === id)) dataIssue('night_lines.csv', lines[id]._row, `"${id}" is not listed in night_index.csv, so it never plays`); });
  d.night = lines;
  return d;
}
async function loadDialogueData() {
  const texts = { ...CSV_EMBED }; let src = 'built-in copy';
  if (/^https?:$/.test(location.protocol)) {
    const got = await Promise.all(CSV_FILES.map(n => fetch(`data/${n}.csv`, { cache: 'no-cache' }).then(r => r.ok ? r.text() : null).catch(() => null)));
    const live = CSV_FILES.filter((n, i) => got[i] != null);
    got.forEach((t, i) => { if (t != null) texts[CSV_FILES[i]] = t; });
    if (live.length) src = live.length === CSV_FILES.length ? 'data/*.csv' : `data/ (${live.join(', ')}) + built-in copy`;
  }
  DD = compileData(texts); DD.source = src;
  const check = /[?&]check\b/.test(location.search);
  if (DATA_ISSUES.length) console.warn('Dialogue data problems:', DATA_ISSUES);
  if (DATA_ISSUES.length || check) showDataReport();
}
function showDataReport() {
  const n = DATA_ISSUES.length;
  const sum = `source: ${DD.source}\nsession: ${DD.session.length} entries · morning: ${DD.morning.length} · night_boss: ${DD.boss.length} · night chats: ${DD.nightIdx.length}\n\n`;
  const body = n ? `${n} problem${n > 1 ? 's' : ''} found. Rows with problems are skipped or may play oddly.\n\n` + DATA_ISSUES.map(x => `${x.file}  row ${x.row}:  ${x.msg}`).join('\n') : 'No problems found. ♡';
  // wait until the desktop is actually visible, then put the report on top
  const iv = setInterval(() => {
    if (['setup', 'lock', 'boot', 'blackout'].some(id => document.getElementById(id))) return;
    clearInterval(iv);
    setTimeout(() => { openNote('csvcheck', 'dialogue_check.txt', esc(sum + body).replace(/\n/g, '<br>')); focusWin('note:csvcheck'); }, 1500);
  }, 500);
}

/* ---------- turning compiled entries into playable dialogue ---------- */
function tplVars(extra) {
  const left = LAST_DAY - S.day + 1, pts = availableToday().map(k => GIRLS[k].name);
  return { name: ROOKIE(), day: S.day, days_left: `${left} day${left === 1 ? '' : 's'}`, kpi: KPI(), patients: pts.length ? pts.join(', ') : 'nobody', ...extra };
}
const tpl = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
// compiled steps -> seq() steps, with {vars} filled in
function playSteps(steps, extra, mapAct) {
  const v = tplVars(extra), L = l => l.who ? [l.who, (l.emo ? `{${l.emo}}` : '') + tpl(l.text, v)] : (l.emo ? `{${l.emo}}` : '') + tpl(l.text, v);
  const A2 = acts => acts.map(a => a.action === 'JOURNAL' ? { ...a, value: (mapAct ? mapAct(tpl(a.value, v)) : tpl(a.value, v)) } : a);
  const out = steps.map(st => ({ lines: st.lines.map(L), act: A2(st.act), pause: st.pause,
    choices: st.choices && st.choices.map(c => ({ t: tpl(c.t, v), req: c.cond ? { cond: c.cond } : undefined, act: A2(c.act), r: c.r.map(L) })) }));
  return out.length ? out : [{ lines: [] }];
}
function dayMatch(spec, d) {
  if (!spec) return true;
  const m = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(spec); if (!m) return false;
  return m[2] ? d >= +m[1] && d <= +m[2] : d === +m[1];
}
const pickRnd = a => a[Math.random() * a.length | 0];
// session ----------------------------------------------------
function sesEntries(g, kind, f) { return DD.session.filter(e => e.girl === g && e.kind === kind && (!f || f(e)) && cond(e.if)); }
function sesSteps(g, kind, f) { const e = pickRnd(sesEntries(g, kind, f)); return e ? playSteps(e.steps) : null; }
function sesIntro(g) { return sesSteps(g, 'intro') || [{ lines: ['{neutral}...'] }]; }
function sesOutro(g) { return sesSteps(g, 'outro') || [{ lines: ['{neutral}bye.'] }]; }
function sesBreak(g, layer) { return sesSteps(g, 'break', e => +e.layer === layer) || [{ lines: ['{surprised}...something just came off.'] }]; }
function triggerOf(res) {
  if (res.failed) return res.why === 'moves' ? 'FAIL_MOVES' : 'FAIL_TIME';
  const high = res.tier === 'S' || res.tier === 'A', perfect = res.moves <= res.k;
  return (perfect ? 'PERFECT_' : 'WIN_') + (high ? 'HIGH' : 'LOW');
}
const FILLER = { lines: ['...'], choices: [{ t: 'Still with me?', r: ['mhm.'] }, { t: 'Take a breath.', r: ['ok.'] }] };
const QUIZ_CHANCE = .3;
function pickPool(g, res) {
  const work = Math.min(3, S.g[g].layer + 1), trig = triggerOf(res);
  let arr = sesEntries(g, 'react', e => (!e.layer || +e.layer === work) && e.trigger === trig);
  if (!arr.length) arr = sesEntries(g, 'react', e => (!e.layer || +e.layer === work) && !e.trigger);
  const out = arr.length ? playSteps(pickRnd(arr).steps) : [FILLER];
  const quiz = sesEntries(g, 'quiz');
  if (quiz.length && !res.failed && Math.random() < QUIZ_CHANCE) {
    const q = playSteps(pickRnd(quiz).steps); q.forEach(st => { if (st.choices) st.choices.sort(() => Math.random() - .5); }); out.push(...q);
  }
  return out;
}
// mornings ----------------------------------------------------
function morningSteps(day) {
  const steps = [], groups = {};
  DD.morning.forEach(e => {
    if (!dayMatch(e.day, day) || !cond(e.if)) return;
    const once = /^(y|yes|1|true|x)$/i.test(e.once);
    if (once && S.flags['once_' + e.id]) return;
    if (e.group) { if (groups[e.group]) return; groups[e.group] = true; }
    if (once) S.flags['once_' + e.id] = true;
    steps.push(...playSteps(e.steps));
  });
  return steps.length ? steps : [{ lines: [] }];
}
function briefDialogue() { return seq('boss', 'boss', morningSteps(1), 'BRIEF_DONE'); }
function morningDialogue() { return seq('boss', 'boss', morningSteps(S.day), 'MORNING_DONE'); }
// boss at night ------------------------------------------------
function bossEntries(kind, g) { return DD.boss.filter(e => e.kind === kind && (!g || !e.girl || e.girl === g) && dayMatch(e.day, S.day) && cond(e.if)); }
function bossBest(kind, g) { // her own > anyone's; a set day > any day
  let best = null, bs = -1;
  bossEntries(kind, g).forEach(e => { const s = (e.girl ? 2 : 0) + (e.day ? 1 : 0); if (s > bs) { bs = s; best = e; } });
  return best;
}
function bossQ(g, gone) {
  const name = GIRLS[g].name, ask = bossBest('ask', g);
  const steps = ask ? playSteps(ask.steps, { girl: name }, gone ? t => 'Her last day · ' + t : null) : [{ lines: [`How was ${name} today?`] }];
  if (gone) { const fw = bossBest('farewell', g); if (fw) steps[0].lines = playSteps(fw.steps, { girl: name }).flatMap(s => s.lines); }
  return steps;
}
function startBossNight() {
  if (S.active || !S.night.bossPending) return;
  S.night.bossPending = false;
  const steps = [], op = bossBest('opening');
  if (op) steps.push(...playSteps(op.steps));
  [...new Set([...S.todayWorked, ...S.todayFixed])].forEach(g => steps.push(...bossQ(g, S.todayFixed.includes(g))));
  bossEntries('extra').forEach(e => steps.push(...playSteps(e.steps)));
  const cl = bossBest('closing'); if (cl) steps.push(...playSteps(cl.steps));
  runDialogue(seq('boss', 'boss', steps.length ? steps : [{ lines: [] }], 'BOSS_NIGHT_DONE'));
}
// girls at night ------------------------------------------------
function nightList(g) { return DD.nightIdx.filter(c => c.girl === g); }
function nightConvo(g) {
  const st = S.g[g], list = nightList(g);
  if (!st.ntDone) st.ntDone = list.slice(0, st.nt || 0).map(c => c.id);
  const c = list.find(x => !st.ntDone.includes(x.id));
  if (!c || st.layer < c.layer || !cond(c.if)) return null;
  return { id: c.id, by: c.by, steps: DD.night[c.id].steps };
}
function nightAvail(g) { return S.phase === 'night' && PLAYABLE.includes(g) && !S.g[g].gone && S.g[g].sessions > 0; }
function canNightChat(g) { return nightAvail(g) && S.night.chats < NIGHT_CHATS && !S.night.with.includes(g) && !S.active && !!nightConvo(g); }
function girlWaiting(g) { const c = nightConvo(g); return nightAvail(g) && c && c.by === 'girl' && !S.night.with.includes(g); }
function nightChatWhyNot(g) {
  if (S.g[g].gone) return `${GIRLS[g].name} left the facility.`;
  if (S.active) return 'Waiting… another conversation is active.';
  if (S.night.with.includes(g)) return `${GIRLS[g].name} is offline.`;
  if (!nightConvo(g)) return `${GIRLS[g].name} is offline.`;
  if (S.night.chats >= NIGHT_CHATS) return 'It\'s late. Get some sleep.';
  return '';
}
function startNightChat(g) {
  if (!canNightChat(g)) return;
  const c = nightConvo(g);
  S.night.chats++; S.night.with.push(g); S.g[g].ntDone.push(c.id); S.g[g].nt = S.g[g].ntDone.length;
  S.unread[g] = 0;
  runDialogue(seq(g, g, playSteps(c.steps), 'NONE'));
  renderBuddies(); renderIcons();
}

/* ---------------- mail, apps, mementos ---------------- */
const MEMENTOS = {
  'pressed_flower.mem': { ic: 'flower', from: 'Prim', desc: '×2 points while fixing Trix.', target: 'trix', mult: 2 },
  'lucky_d20.mem': { ic: 'dice', from: 'Trix', desc: '×2 points while fixing Prim.', target: 'prim', mult: 2 },
  'tracing_paper.mem': { ic: 'thread', from: 'Prim', desc: '40% chance: one pair links itself perfectly when a round starts.' },
  'hourglass.mem': { ic: 'hourglass', from: 'Trix', desc: 'Once per round: when time runs out, it flows back to zero.' },
  'sketch_of_you.mem': { ic: 'img', from: 'Prim', desc: 'A drawing of you, by Prim. +15% points on every round.', bonus: .15 },
  'queen_piece.mem': { ic: 'queen', from: 'Trix', desc: '+3 extra moves on every round.' },
};
const REWARD = {
  prim: {
    1: { subject: 'thank you (for today)', body: 'counsellor,\n\nthank you for being gentle.\ni traced a flower for you and pressed it between two pages.\n\ngive it to trix if you see her? she scares me a little. maybe it helps.\n\n— prim', atts: [{ kind: 'mem', name: 'pressed_flower.mem' }] },
    2: { subject: 'something i traced', body: 'i traced every page of an old atlas once. the places looked so pretty in other people\'s lines.\nhere\'s a copy. maybe you can go see them for me.\n\nand some tracing paper. lay it over anything and the lines just appear.\n\n— prim', atts: [{ kind: 'app', name: 'Atlas.exe' }, { kind: 'mem', name: 'tracing_paper.mem' }] },
    3: { subject: 'bye bye', body: 'boss says i faced everything. i\'m leaving today.\n\ni drew you. not traced. drew. it\'s bad. keep it anyway.\n\n— p.', atts: [{ kind: 'mem', name: 'sketch_of_you.mem' }] },
  },
  trix: {
    1: { subject: 'you\'re going to need these', body: 'you answer like someone who has never converted a unit in their life. here. UnitConv.\n\nalso a d20. statistically irrelevant. roll it next time you work on prim. trust me.\n\n— t', atts: [{ kind: 'mem', name: 'lucky_d20.mem' }, { kind: 'app', name: 'UnitConv.exe' }] },
    2: { subject: 'spare time', body: 'found an hourglass in my head. it flips itself when you run out.\ntake it. i don\'t need extra time.\n\n— t', atts: [{ kind: 'mem', name: 'hourglass.mem' }] },
    3: { subject: 'gg', body: 'checked out. taking the train home (boss\'s words).\n\nleft you my queen. she covers more squares than anyone.\n\n— t', atts: [{ kind: 'mem', name: 'queen_piece.mem' }] },
  },
};

const APPICON = { 'Atlas.exe': 'atlas', 'UnitConv.exe': 'conv' };
function sendMail(m) {
  m.id = 'm' + S.mail.length; m.read = false; m.day = S.day; m.t = clockStr();
  if (m.att) { m.atts = [m.att]; delete m.att; }
  (m.atts || []).forEach(a => a.got = false);
  S.mail.unshift(m); SFX.mail();
  toast('DiveMail', `New mail from <b>${esc(WHO[m.from] ? WHO[m.from].name : m.from)}</b>: ${esc(m.subject)}`, () => openMail(m.id));
  save(); refresh();
}
let mailSel = null;
function openMail(id) {
  if (typeof id === 'string') mailSel = id;
  openWin('mail', { title: 'DiveMail', icon: 'mail', w: 600, h: 460, x: 190, y: 40, render: (b, rec) => { addUpd(rec, renderMail); } });
  renderMail();
}
function renderMail() {
  const w = WINS.mail; if (!w) return; const b = w.body;
  if (!mailSel && S.mail[0]) mailSel = S.mail[0].id;
  const m = S.mail.find(x => x.id === mailSel);
  if (m && !m.read) { m.read = true; save(); setTimeout(renderIcons, 0); }
  const list = S.mail.map(x => `<button class="mitem${x.id === mailSel ? ' sel' : ''}${x.read ? '' : ' unread'}" data-id="${x.id}">${avHTML(x.from)}<b>${esc(x.subject)}</b><span>${esc(nameOf(x.from))}${S.flags.probation ? ' · Day ' + x.day : ''}</span></button>`).join('') || '<div class="status-line">Inbox empty.</div>';
  let view = '<div class="status-line">Select a message.</div>';
  if (m) {
    const atts = (m.atts || []).map((a, i) => {
      const isMem = a.kind === 'mem', ic = isMem ? MEMENTOS[a.name].ic : (APPICON[a.name] || 'exe');
      return `<div class="att">${icon(ic)}<div><b>${esc(a.name)}</b><small>${isMem ? 'memento · ' + esc(MEMENTOS[a.name].desc) : 'software · installs to your desktop'}</small></div>${a.got ? '<span class="chip ok">✓ downloaded</span>' : `<button class="btn primary" data-dl="${i}">Download</button>`}</div>`;
    }).join('');
    const card = m.card ? `<div class="postcard"><div class="stamp">${esc(m.card.stamp)}</div>${esc(m.card.text)}</div>` : '';
    view = `<h3>${esc(m.subject)}</h3><div class="from">${avHTML(m.from)}<span>from <b>${esc(nameOf(m.from))}</b> · ${m.t}</span></div><div class="body">${esc(m.body)}</div>${card}${atts}`;
  }
  b.innerHTML = `<div class="mail"><div class="mail-list sunk">${list}</div><div class="mail-view sunk">${view}</div></div>`;
  $$('.mitem', b).forEach(x => x.onclick = () => { SFX.click(); mailSel = x.dataset.id; renderMail(); });
  $$('[data-dl]', b).forEach(x => x.onclick = () => download(m, +x.dataset.dl));
}
function download(m, i = 0) {
  const a = m && m.atts && m.atts[i]; if (!a || a.got) return; a.got = true;
  if (a.kind === 'app') { if (!S.apps.includes(a.name)) S.apps.push(a.name); toast('Installed', `<b>${esc(a.name)}</b> is on your desktop.`); }
  else { if (!hasMem(a.name)) S.mementos.push(a.name); toast('MementoBox', `<b>${esc(a.name)}</b> added. ${esc(MEMENTOS[a.name].desc)}`, openMBox); }
  SFX.item(); save(); refresh(); renderMail();
}

function openMBox() {
  openWin('mbox', {
    title: 'MementoBox', icon: 'box', w: 520, h: 400, x: 210, y: 60, render: (b, rec) => {
      const r = () => { b.innerHTML = `<div class="mbox">${Object.entries(MEMENTOS).map(([k, v]) => hasMem(k) ? `<div class="mem bevel">${icon(v.ic)}<b>${esc(k)}</b><span>${esc(v.desc)}</span><small>from ${esc(v.from)} · active</small></div>` : `<div class="mem bevel empty">${icon('box')}<b>???.mem</b><small>empty slot</small></div>`).join('')}</div>`; };
      addUpd(rec, r); r();
    }
  });
}
function openConv() {
  S.used = S.used || {}; S.used['UnitConv.exe'] = true; save();
  openWin('conv', {
    title: 'UnitConv.exe', icon: 'conv', w: 440, h: 380, x: 240, y: 70, render: b => {
      const rows = [['mi', 'km', 1.609344], ['°F', '°C', null], ['lb', 'kg', 0.45359237]];
      b.innerHTML = `<div class="tool">${rows.map((r, i) => `<div class="trow bevel"><div><label for="cv${i}">${r[0]}</label><input id="cv${i}" inputmode="decimal" value="${['12', '98.6', '10'][i]}"></div><span class="arrow">→</span><div><label>${r[1]}</label><output id="co${i}"></output></div></div>`).join('')}<small style="color:var(--ink-soft);padding:0 4px">a gift from Trix ✧</small></div>`;
      const calc = () => rows.forEach((r, i) => { const v = parseFloat($('#cv' + i, b).value); const o = isNaN(v) ? '—' : r[2] ? (v * r[2]).toFixed(2) : ((v - 32) * 5 / 9).toFixed(1); $('#co' + i, b).textContent = o; });
      $$('input', b).forEach(x => x.addEventListener('input', calc)); calc();
    }
  });
}
const ATLAS = [['Eiffel Tower', 'Paris, France', '330 m of iron. Not in Rome.'], ['Mount Everest', 'Nepal / China border', '8,849 m. There is no Swiss side.'], ['Santorini', 'Greece', 'Blue domes, white walls, a lot of cats.'], ['Reykjavik', 'Iceland', 'Northernmost capital of a sovereign state.'], ['Kyoto', 'Japan', 'Over 1,600 temples.'], ['Angkor Wat', 'Siem Reap, Cambodia', 'Largest religious monument on Earth.'], ['Lisbon', 'Portugal', 'Seven hills and yellow trams.'], ['Istanbul', 'Türkiye', 'One city, two continents.'], ['Machu Picchu', 'Cusco region, Peru', '2,430 m above sea level.'], ['Marrakech', 'Morocco', 'The red city.'], ['Hanoi', 'Vietnam', 'Old Quarter: 36 streets.'], ['Patagonia', 'Argentina & Chile', 'Wind up to 120 km/h.'], ['Trans-Siberian Railway', 'Moscow → Vladivostok', '9,289 km.'], ['Venice', 'Italy', '118 small islands.']];
function openAtlas() {
  S.used = S.used || {}; S.used['Atlas.exe'] = true; save();
  openWin('atlas', {
    title: 'Atlas.exe', icon: 'atlas', w: 420, h: 460, x: 260, y: 50, render: b => {
      b.innerHTML = `<div class="tool" style="height:100%"><label for="atlas-q" style="font-size:11px;color:var(--ink-soft)">search a place</label><input id="atlas-q" placeholder="e.g. Eiffel" autocomplete="off"><div class="atlas-list" id="atlas-l"></div><small style="color:var(--ink-soft)">traced by Prim, page by page</small></div>`;
      const r = () => { const q = $('#atlas-q', b).value.toLowerCase(); $('#atlas-l', b).innerHTML = ATLAS.filter(a => !q || a.join(' ').toLowerCase().includes(q)).map(a => `<div class="aentry bevel"><b>${esc(a[0])}</b><span>${esc(a[1])}</span>${esc(a[2])}</div>`).join(''); };
      $('#atlas-q', b).addEventListener('input', r); r();
    }
  });
}

/* =========================================================
   DAY LOOP · morning half → break → afternoon half → night → shut down
   Autosave only at the start of each part (no save slots).
   ========================================================= */
const met = g => !!(S.met && S.met[g]);
function availableToday() { if (S.flags.afterSess || SPECIAL[S.day] === 'showcase' || !S.flags.briefed || S.phase !== 'day' || (S.fixes || 0) >= MAX_FIX) return []; return PLAYABLE.filter(k => met(k) && !S.g[k].gone && S.day >= GIRLS[k].from); }
function checkpoint(at) {
  S.at = at;
  const cp = JSON.parse(JSON.stringify({ ...S, active: null, queue: [], dyn: {}, session: null }));
  cp.logs.session = [];
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(cp)); } catch (e) { }
  const f = $('#saveflag'); if (f) { f.classList.add('on'); clearTimeout(saveTimer); saveTimer = setTimeout(() => f.classList.remove('on'), 1400); }
}
// a real-looking login / lock screen between parts of the day
function lockScreen(sub, btn = 'Log in') {
  return new Promise(res => {
    const el = document.createElement('div'); el.id = 'lock';
    const dl = S.flags.probation ? `Probation · day ${S.day} of ${LAST_DAY}` : '';
    el.innerHTML = `<div class="lk"><div class="lk-time">${clockStr()}</div><div class="lk-date">${esc(dl)}</div>
      <div class="lk-user"><img class="av" src="${S.player ? S.player.avatar : ''}" alt=""><b>${esc(S.player ? S.player.name : '')}</b><span>${esc(sub)}</span>
      <button class="btn primary" id="lk-go">${esc(btn)} ▸</button></div></div>`;
    document.body.appendChild(el); SFX.chime();
    const b = $('#lk-go', el); b.focus();
    b.onclick = () => { auInit(); SFX.click(); el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, REDUCED ? 0 : 350); };
  });
}
function closeWorkWins() { Object.keys(WINS).forEach(id => { if (!['yap', 'mail', 'mbox', 'reset'].includes(id) && !id.startsWith('note:')) closeWin(id); }); }
async function beginMorning() {
  S.phase = 'day'; S.half = 1; S.mins = 9 * 60 + 2; S.todayLayers = 0; S.todayFixed = []; S.todayWorked = []; S.fixes = 0;
  S.night = { chats: 0, with: [], bossPending: false, bossDone: false };
  checkpoint('am');
  closeWorkWins(); applyAtmos(); refresh();
  await lockScreen('Good morning');
  dayMail();
  openYap('boss');
  runDialogue(morningDialogue());
}
function dayMail() {
  const d = S.day;
  if (SPECIAL[d] === 'postcard') {
    sendMail({ from: 'boss', subject: 'Greetings from Santorini!', body: 'Wish you were here. (You are not. Nobody is. Rules are rules.)', card: { text: 'Dear rookie,\nThe sea is so blue it hurts.\nThe cats followed me all\nthe way to Oia.\n— Boss', stamp: 'LOCAL MAIL\n0 km' } });
    if (onSite('prim') && met('prim')) sendMail({ from: 'prim', subject: 'postcard', body: 'boss made us write one.', card: { text: 'to: the sea (19.3 km?)\nfrom: room 01\ni\'ll trace you\nsomeday.', stamp: '♡' } });
    if (onSite('trix') && met('trix')) sendMail({ from: 'trix', subject: 'postcard (mandatory)', body: 'here.', card: { text: 'to: any room with\na whiteboard.\nthat is all.', stamp: '♞' } });
    if (!S.journal.some(j => j.text.startsWith('Postcard Day. I wrote'))) S.journal.push({ day: d, text: 'Postcard Day. I wrote to Santorini again. I always write to Santorini.' });
  }
  if (SPECIAL[d] === 'inspection') sendMail({ from: 'dive', subject: 'Inspection report', body: `D____ I___________ & V______ E_________ — internal report\n\nemendation progress:   ${layersTotal()}/${kpiMax()}\noperator vitals:       unstable\nhost vitals:           declining (${S.quakes} seismic events)\n\nThis message was not meant for you. Please delete it.` });
}
// new patients only exist for the player once they've said something
function newPatientsToday() {
  if (S.day === GIRLS.trix.from && !met('trix') && !S.g.trix.gone) {
    setTimeout(() => {
      S.met.trix = true; S.flags.ping = 'brain';
      runDialogue(seq('trix', 'trix', [{ lines: ['{neutral}you\'re the new counsellor.', '{neutral}i\'m on your list today. i checked the list. twice.', '{neutral}don\'t be late.'] }]));
      refresh();
    }, 2500);
  }
}
function afterMorning() {
  if (SPECIAL[S.day] === 'showcase') { openShowcase(); return; }
  S.flags.ping = 'brain'; refresh();
  newPatientsToday();
  if (QUAKE_DAYS.includes(S.day) && !S.flags['quake' + S.day]) setTimeout(earthquake, 12000);
}
async function beginAfternoon() {
  S.half = 2; S.mins = 13 * 60 + 1;
  checkpoint('pm');
  closeWorkWins(); applyAtmos(); refresh();
  await lockScreen('Lunch break is over');
  S.flags.ping = 'brain'; refresh();
}
function earthquake() {
  if (S.flags['quake' + S.day]) return; S.flags['quake' + S.day] = true; S.quakes++;
  const app = $('#app'); app.classList.remove('quake'); void app.offsetWidth; app.classList.add('quake'); SFX.rumble();
  setTimeout(() => app.classList.remove('quake'), 1400);
  applyAtmos();
  const L = {
    1: ['Whoa! Little wobble. Totally normal. Happens in Tokyo every Tuesday.', 'Reminder: nobody leaves the building until every patient is fixed. House rules.'],
    2: ['Okay that one was bigger. I was in Kathmandu for one like this. Kinda. Spiritually.', 'Keep working. The faster they\'re fixed, the faster the floor stops dancing.'],
    3: ['Lights flickered. Don\'t panic. Santiago gets these all the time. Chile, right? Yes. Chile.', '...I said don\'t panic. I\'m not panicking. You\'re panicking.'],
    4: ['That one cracked the wallpaper.', 'No jokes this time. Work faster, rookie. Please.'],
  }[S.quakes] || ['Again.'];
  setTimeout(() => runDialogue(seq('boss', 'boss', [{ lines: L }])), 1600);
}
// after a session: break, or the end of the work day
function afterSession() {
  if (S.phase !== 'day') return;
  if ((S.fixes || 0) >= MAX_FIX) { goNight(); return; }
  if (!availableToday().length) { goNight(); return; }
  if (S.half === 1) beginAfternoon();
}
async function goNight() {
  if (S.session || S.phase === 'night') return;
  if (S.active || S.queue.length) { S.flags.nightAfter = true; return; }
  S.phase = 'night'; S.mins = 22 * 60 + 14;
  S.night = { chats: 0, with: [], bossPending: true, bossDone: false };
  checkpoint('night');
  closeWorkWins(); applyAtmos(); refresh();
  await lockScreen('Shift over');
  if (S.day === 1 && !S.flags.policyMail) { S.flags.policyMail = true; sendMail({ from: 'dive', subject: 'Facility policy', body: 'Welcome to the DIVE facility.\n\n1. Staff and patients may not leave the premises until all treatments are complete.\n2. During seismic events, remain indoors.\n3. Do not discuss your training. You have completed it.\n\n— DIVE Administration' }); }
  S.unread.boss = (S.unread.boss || 0) + 1;
  PLAYABLE.forEach(g => { if (girlWaiting(g)) S.unread[g] = (S.unread[g] || 0) + 1; });
  SFX.chime(); openYap('boss'); refresh();
}
setInterval(() => { if (S.flags && S.flags.nightAfter && !S.active && !S.queue.length && !S.session) { S.flags.nightAfter = false; goNight(); } }, 800);
async function shutDown() {
  if (S.phase !== 'night' || S.active || S.flags.ended) return;
  if (S.night.bossPending) S.journal.push({ day: S.day, text: 'I asked how everyone was. No answer tonight. I wrote nothing.', miss: true });
  S.night.bossPending = false;
  if (S.flags.protoReady) { endGame('proto'); return; }
  if (S.day >= LAST_DAY) { endGame('deadline'); return; }
  const bo = document.createElement('div'); bo.id = 'blackout'; document.body.appendChild(bo);
  await wait(REDUCED ? 200 : 1200); bo.remove();
  S.day++;
  await beginMorning();
}

/* =========================================================
   FIX-IT (patient list)
   ========================================================= */
function openBrain() { if (S.flags.ping === 'brain') { S.flags.ping = null; renderIcons(); } openWin('brain', { title: 'Fix-it', icon: 'wrench', w: 560, h: 440, x: 120, y: 30, render: (b, rec) => { addUpd(rec, renderBrain); renderBrain(); } }); }
function renderBrain() {
  const w = WINS.brain; if (!w) return; const b = w.body;
  const night = S.phase === 'night', sp = SPECIAL[S.day];
  const shown = PLAYABLE.filter(k => met(k));
  const cards = shown.map(k => {
    const G = GIRLS[k], st = S.g[k];
    let status = '', btn = '', dim = false, ok = false;
    if (st.gone) { status = 'discharged'; ok = true; dim = true; }
    else if (S.session && S.session.g === k) { status = 'in session'; btn = `<button class="btn" data-go="${k}">Return ▶</button>`; }
    else if (night) status = 'resting';
    else if (sp === 'showcase') status = 'showcase today';
    else if (S.session) status = 'waiting';
    else if (availableToday().includes(k)) { status = 'ready'; btn = `<button class="btn primary" data-dive="${k}">Start session ▶</button>`; }
    else status = 'resting';
    const pips = `<div class="pips" title="layers">${[0, 1, 2].map(i => `<span class="pip${st.layer > i ? '' : ' off'}"></span>`).join('')}</div>`;
    return `<div class="pcard bevel${dim ? ' dim' : ''}"><div class="top">${avHTML(k)}<div><b>${esc(G.name)}</b><small>${esc(G.id)}</small></div></div>${pips}<div class="st${ok ? ' ok' : ''}">${esc(status)}</div>${btn}</div>`;
  }).join('') || '<div class="status-line">No patients assigned yet.</div>';
  const part = night ? 'Closed until 09:00' : sp === 'showcase' ? 'Hobby Showcase' : S.half === 2 ? 'Afternoon session' : 'Morning session';
  b.innerHTML = `<div class="bd"><div class="bd-head"><div><div class="day">${S.flags.probation ? 'Day ' + S.day : 'Fix-it'}</div><div class="ph">${esc(part)} · ${clockStr()}</div></div></div>
    <div class="cards">${cards}</div>
    <div class="bd-foot">${S.flags.ended ? '<button class="btn primary" id="bd-new">New game</button>' : night ? `<button class="btn" id="bd-sleep" ${S.active ? 'disabled' : ''}>Shut down for the night</button>` : sp === 'showcase' ? '<button class="btn" id="bd-show">Open Showcase.exe</button>' : ''}</div></div>`;
  $$('[data-dive]', b).forEach(x => x.onclick = () => { SFX.click(); startSession(x.dataset.dive); });
  $$('[data-go]', b).forEach(x => x.onclick = () => { focusWin('feed'); focusWin('cl'); focusSessionChat(); });
  const s = $('#bd-sleep', b); if (s) s.onclick = () => { SFX.click(); shutDown(); };
  const sh = $('#bd-show', b); if (sh) sh.onclick = openShowcase;
  const nw = $('#bd-new', b); if (nw) nw.onclick = confirmReset;
}

/* =========================================================
   SHOWCASE DAY
   ========================================================= */
function drawExhibit(c, g, good) {
  const x = c.getContext('2d'), W = 160, H = 120; x.clearRect(0, 0, W, H);
  if (g === 'prim') {
    x.fillStyle = '#fffaf2'; x.fillRect(0, 0, W, H);
    if (good) {
      const pet = (cx, cy, a, col) => { x.fillStyle = col; x.beginPath(); x.ellipse(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 14, 8, a, 0, 7); x.fill(); x.strokeStyle = '#4a2d6e'; x.lineWidth = 1.5; x.stroke(); };
      for (let i = 0; i < 6; i++) pet(80, 52, i / 6 * Math.PI * 2, i % 2 ? '#ffb3d9' : '#d8c6f4');
      x.fillStyle = '#ffd86e'; x.beginPath(); x.arc(80, 52, 8, 0, 7); x.fill(); x.stroke();
      x.strokeStyle = '#5fcf86'; x.lineWidth = 3; x.beginPath(); x.moveTo(80, 72); x.quadraticCurveTo(86, 96, 76, 116); x.stroke();
      x.fillStyle = '#ff8cc6'; [[24, 20], [136, 30], [30, 96], [130, 92]].forEach(([a, b2]) => { x.fillRect(a, b2 - 3, 2, 8); x.fillRect(a - 3, b2, 8, 2); });
    } else {
      x.strokeStyle = '#5a5060'; x.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(80 + Math.sin(i * 2.1) * 6, 52 + Math.cos(i * 1.7) * 5, 10 + i * 2.2, i, i + 4.2); x.stroke(); }
      x.fillStyle = 'rgba(120,110,130,.25)'; x.fillRect(40, 70, 70, 12); x.fillRect(95, 30, 20, 30);
      x.beginPath(); x.moveTo(80, 76); x.lineTo(84, 116); x.stroke();
      x.fillStyle = '#5a5060'; x.font = '11px VT323, monospace'; x.fillText('original work #1', 6, 114);
    }
  } else {
    if (good) {
      x.fillStyle = '#2f5a46'; x.fillRect(0, 0, W, H); x.fillStyle = '#e9f5ee'; x.font = '10px VT323, monospace';
      ['Lemma 3. G has k paths', 'sum |P_i| = |G|  (no gaps)', 'P_i, P_j disjoint', '=> fill(G) = 100%', '', 'QED ✧'].forEach((l, i) => x.fillText(l, 10, 22 + i * 15));
      x.fillStyle = '#ffb3d9'; x.fillRect(128, 92, 22, 4);
    } else {
      x.fillStyle = '#ffd3ea'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.fillRect(30, 18, 100, 80);
      x.fillStyle = '#ff5fa8'; x.beginPath(); x.moveTo(52, 40); x.lineTo(60, 22); x.lineTo(68, 40); x.fill(); x.beginPath(); x.moveTo(92, 40); x.lineTo(100, 22); x.lineTo(108, 40); x.fill();
      x.strokeStyle = '#4a2d6e'; x.lineWidth = 1.5; x.beginPath(); x.arc(80, 62, 26, 0, 7); x.stroke();
      x.fillStyle = '#4a2d6e'; x.font = '18px VT323, monospace'; x.fillText('uwu', 68, 68); x.font = '11px VT323, monospace'; x.fillText('stream highlights (3 sec)', 26, 112);
    }
  }
}
function openShowcase() {
  openWin('show', { title: 'Showcase.exe', icon: 'gallery', w: 560, h: 470, x: 200, y: 30, render: (b, rec) => { addUpd(rec, renderShowcase); } });
  renderShowcase();
}
function renderShowcase() {
  const w = WINS.show; if (!w) return; const b = w.body;
  const here = PLAYABLE.filter(k => onSite(k) && met(k));
  const cap = { prim: ['"Original Work #1" — made to order, as "the artist".', '"Coloring in someone else\'s lines" — Prim ♡'], trix: ['"Stream highlights (3 sec)" — made to order, as "the gamer girl".', '"Lemma 3: no gaps" — Trix ✧'] };
  b.innerHTML = `<div class="show">${here.map(g => `<div class="exh bevel"><div class="who">${avHTML(g)}<b>${esc(GIRLS[g].name)}</b></div><canvas width="160" height="120" data-g="${g}"></canvas>
     <div class="cap">${esc(cap[g][S.show[g] === 'good' ? 1 : 0])}</div>${S.show[g] ? '<span class="chip ok">✓ talked</span>' : `<button class="btn primary" data-talk="${g}" ${S.active ? 'disabled' : ''}>Talk about it</button>`}</div>`).join('') || '<div class="status-line">Nobody is left to exhibit.</div>'}</div>`;
  $$('canvas', b).forEach(c => drawExhibit(c, c.dataset.g, S.show[c.dataset.g] === 'good'));
  $$('[data-talk]', b).forEach(x => x.onclick = () => { SFX.click(); showTalk(x.dataset.talk); });
}
function showTalk(g) {
  if (S.active) return;
  openYap(g);
  const D = {
    prim: { lines: ['{sad}this is my exhibit. boss said the artist has to draw something original.', '{sad}so i drew a rose. from nothing. it\'s... fine.'], choices: [
      { t: 'It\'s nice.', r: ['...thanks.'], act: [A.show('prim', 'bad'), A.jr('Showcase · Prim drew a rose "from nothing". She said it was fine. It was fine.')] },
      { t: 'Is this what you wanted to make?', r: ['{angry}what i want doesn\'t matter. i\'m the artist.'], act: [A.show('prim', 'bad'), A.jr('Showcase · Prim\'s rose. She said what she wants doesn\'t matter. I taught her that.')] },
      { t: 'Forget "original". Color in someone\'s lines — that\'s what you\'re great at.', req: { anyKnow: ['prim_traces', 'prim_color'] }, r: ['{surprised}...can i? really?', '{happy}okay. give me ten minutes.', ['sys', '*** Prim updated her exhibit ***']], act: [A.show('prim', 'good'), A.jr('Showcase · Prim colored in an old line drawing. Pink and lilac. The most beautiful thing in the room. The newbie told her she could.')] },
    ] },
    trix: { lines: ['behold. my exhibit. "stream highlights". 3 seconds of me saying uwu.', '{angry}boss said the gamer girl should do gamer girl things.'], choices: [
      { t: 'Very on-brand.', r: ['{happy}ikr. kill me. jk.'], act: [A.show('trix', 'bad'), A.jr('Showcase · Trix: three seconds of "uwu". On brand, the newbie said.')] },
      { t: 'You look bored.', r: ['{angry}bc i am bored.'], act: [A.show('trix', 'bad'), A.jr('Showcase · Trix looked bored. I did not ask why.')] },
      { t: 'Present your proof instead. The anonymous one.', req: { anyKnow: ['trix_math', 'trix_proofs'] }, r: ['{surprised}...in front of everyone?', '{happy}ok. ok ok ok. give me a whiteboard.', ['sys', '*** Trix updated her exhibit ***']], act: [A.show('trix', 'good'), A.jr('Showcase · Trix presented a 17-page proof on a whiteboard. Nobody understood it. She didn\'t care. She looked so happy.')] },
    ] },
  };
  runDialogue(seq(g, g, [D[g]], 'SHOW_DONE'));
}

/* =========================================================
   SESSION
   ========================================================= */
function startSession(g) {
  if (S.session || S.phase !== 'day' || S.active || !availableToday().includes(g)) return;
  closeWin('brain');
  const st = S.g[g]; st.sessions++; S.fixes = (S.fixes || 0) + 1;
  S.session = { g, level: 0, score: 0, emo: 'neutral' };
  if (!S.todayWorked.includes(g)) S.todayWorked.push(g);
  S.logs.session = [{ who: 'sys', text: `*** session_${g}.tmp created · ${GIRLS[g].id} connected ***`, t: clockStr() }];
  save(); glitch('soft');
  const big = $('#desktop').clientWidth >= 1180;
  openWin('feed', { title: `VideoFeed.exe — ${GIRLS[g].id}`, icon: 'feed', w: big ? 330 : 320, h: 600, x: big ? 108 : 20, y: 8, noClose: () => !!S.session, render: b => buildFeed(b, g) });
  openWin('cl', { title: 'Fix-it · board', icon: 'puzzle', w: big ? 450 : 440, h: 620, x: big ? 446 : 60, y: 8, noClose: () => !!S.session, render: b => buildCLShell(b) });
  openYap('session'); placeWin('yap', big ? 904 : 100, 8, big ? 368 : 360, big ? 600 : 520);
  refresh();
  const pick = a => a[Math.random() * a.length | 0];
  const go = () => runDialogue(seq('session', g, sesIntro(g), 'SES_LEVEL'));
  if (!S.flags.tutorial) { previewLevel(g); runTutorial().then(() => { S.flags.tutorial = true; save(); go(); }); }
  else go();
}
function previewLevel(g) {
  const st = S.g[g], L = lvlAt(g, st.lvl);
  focusWin('cl'); loadLevel({ n: L.n, pairs: L.pairs, sol: L.sol, fill: !!GIRLS[g].fill }, `LEVEL 1/${LEVELS_PER_SESSION}`); if (CL) CL.locked = true;
}
/* ---- first-time tutorial: everything dims except Boss's messages and the board ---- */
const TUTORIAL = [
  { t: 'Okay rookie, this is the Fix-it board. Think of it as a tiny city map. Like Tokyo, but flat.', hl: '.cl-board' },
  { t: 'Every dot has a twin of the same colour. Drag a line from one dot to its twin.', hl: '.cl-board' },
  { t: 'Lines can\'t cross. Draw over another line and you snip it. Rude. Effective.', hl: '.cl-board' },
  { t: 'This is the scoreboard. Faster = better grade. Fewer strokes = bonus. Like airport security: speed AND efficiency.', hl: '#cl-tiers' },
  { t: 'Run out of time or run out of moves and the board fails. Like missing a connecting flight in Doha. Been there. Probably.', hl: '#cl-tiers' },
  { t: 'Your score chips away at her layers, over there on the video feed. Clear all three and she walks out of here a whole new woman.', hl: null },
  { t: 'One session before lunch, one after. Five rounds each. Same patient twice or two patients, your call. I\'ll be watching. In a supportive, supervisor-y way.', hl: null },
];
async function runTutorial() {
  const dk = $('#desktop'), cl = WINS.cl; if (!cl) return;
  document.body.classList.add('tutorial');
  const dim = document.createElement('div'); dim.id = 'tut-dim'; dk.appendChild(dim);
  cl.el.hidden = false; cl.el.style.zIndex = 950;
  const box = document.createElement('div'); box.id = 'tut-box'; box.className = 'bevel'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Boss explains the board');
  box.innerHTML = `<div class="tut-head">${avHTML('boss')}<div><b>Boss</b><span>walking you through it</span></div></div><div class="tut-log" id="tut-log"></div><div class="tut-foot"><span id="tut-n"></span><button class="btn primary" id="tut-next">Next ▸</button></div>`;
  dk.appendChild(box);
  const r = cl.el.getBoundingClientRect(), d = dk.getBoundingClientRect();
  if (!narrow() && d.right - r.right > 330) { box.style.left = (r.right - d.left + 14) + 'px'; box.style.top = (r.top - d.top + 30) + 'px'; } else box.classList.add('bottom');
  for (let i = 0; i < TUTORIAL.length; i++) {
    const T = TUTORIAL[i];
    $('#tut-n', box).textContent = `${i + 1}/${TUTORIAL.length}`;
    $$('.tut-hl').forEach(e => e.classList.remove('tut-hl'));
    if (T.hl) { const h = $(T.hl, cl.el); if (h) h.classList.add('tut-hl'); }
    const m = document.createElement('div'); m.className = 'tut-msg'; $('#tut-log', box).appendChild(m);
    tick(); S.logs.boss.push({ who: 'boss', text: T.t, t: clockStr() });
    SFX.chime(); await typeInto(m, T.t); $('#tut-log', box).scrollTop = 1e6;
    const btn = $('#tut-next', box); btn.textContent = i === TUTORIAL.length - 1 ? 'Let\'s go!' : 'Next ▸'; btn.focus();
    await new Promise(res => { btn.onclick = () => { SFX.click(); res(); }; });
  }
  $$('.tut-hl').forEach(e => e.classList.remove('tut-hl'));
  dim.remove(); box.remove(); document.body.classList.remove('tutorial'); cl.el.style.zIndex = ++zTop;
  save();
}
function focusSessionChat() { openYap('session'); }
function placeWin(id, x, y, w, h) { const W = WINS[id]; if (!W || narrow()) return; const dk = $('#desktop'); Object.assign(W.el.style, { left: clamp(x, 6, Math.max(6, dk.clientWidth - w - 6)) + 'px', top: y + 'px', width: Math.min(w, dk.clientWidth - 16) + 'px', height: Math.min(h, dk.clientHeight - 16) + 'px' }); }
function nextLevel() {
  const ss = S.session; if (!ss) return;
  const g = ss.g, st = S.g[g], pool = LEVELS[g];
  const L = lvlAt(g, st.lvl); st.lvl++;
  ss.level++;
  setFeedEmo('neutral'); focusWin('cl'); loadLevel({ n: L.n, pairs: L.pairs, sol: L.sol, fill: !!GIRLS[g].fill }, `LEVEL ${ss.level}/${LEVELS_PER_SESSION}`);
  save();
}
function onSolved(res) {
  const ss = S.session; if (!ss) return;
  const g = ss.g, st = S.g[g], G = GIRLS[g];
  ss.score += res.total; S.best = Math.max(S.best, res.total); tick(10);
  let broke = 0;
  if (!res.failed) {
    st.dmg += res.total;
    // one layer per session at most: she has to rest after facing it
    if (st.layer < 3 && st.dmg >= G.hp[st.layer]) { st.dmg = 0; st.layer++; broke = st.layer; }
  }
  if (broke) S.todayLayers++;
  ss.broke = !!broke;
  save(); refresh(); renderFeed();
  (async () => {
    if (broke) await breakLayerFx(g, broke);
    if (st.layer >= 3 && !st.gone) { st.gone = true; S.todayFixed.push(g); }
    renderFeed(); save();
    const ex = broke ? sesBreak(g, broke) : pickPool(g, res);
    const extra = st.gone ? [{ lines: [['sys', `*** ${G.id} faced every layer and has been discharged ***`]] }] : [];
    if (narrow()) focusSessionChat();
    runDialogue(seq('session', g, [...ex, ...extra], 'SES_AFTER'));
  })();
}
function afterExchange() {
  const ss = S.session; if (!ss) return;
  const st = S.g[ss.g];
  if (st.gone || ss.broke) { closeSession(); return; }
  if (ss.level < LEVELS_PER_SESSION) { nextLevel(); return; }
  runDialogue(seq('session', ss.g, sesOutro(ss.g), 'SES_CLOSE'));
}
async function closeSession() {
  const ss = S.session; if (!ss) return;
  const g = ss.g;
  if (CL) { CL.locked = true; clearInterval(CL.timer); }
  for (const [t, d] of [[`*** session ended · score ${ss.score} ***`, false], ['session_' + g + '.tmp will be deleted in 3…', true], ['2…', true], ['1…', true]]) {
    const m = { who: 'sys', text: t, t: clockStr(), del: d }; S.logs.session.push(m); appendMsg('session', m); SFX.tick(); await wait(600);
  }
  S.session = null; S.logs.session = []; save();
  ['cl', 'feed'].forEach(closeWin);
  if (yapCh === 'session') { yapCh = 'boss'; setViewCh('yap', 'boss'); } renderBuddies();
  glitch('soft'); toast('Yappy Yappy', `<b>session_${g}.tmp</b> deleted.`);
  refresh();
  const st = S.g[g];
  if (ss.broke) { const R = REWARD[g][st.layer]; if (R) setTimeout(() => sendMail({ from: g, ...R, atts: R.atts.map(a => ({ ...a })) }), 1200); }
  if (st.gone) {
    setTimeout(() => runDialogue(seq('boss', 'boss', [{ lines: [`${GIRLS[g].name} faced her last layer and checked out! Bon voyage!`, 'One less case. Gold star for you, rookie.'] }])), 2200);
    if (PLAYABLE.every(k => S.g[k].gone)) S.flags.protoReady = true;
  }
  S.flags.sessEndAt = Date.now(); S.flags.afterSess = true; // break / end of day handled once chat is quiet
}
setInterval(() => { if (S.flags && S.flags.afterSess && Date.now() - (S.flags.sessEndAt || 0) > 3000 && !S.active && !S.queue.length && !S.session) { S.flags.afterSess = false; afterSession(); } }, 800);

/* ---------- Video Feed: the patient in Room 0, reacting to the chat ---------- */
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; }); }
const RW = 180, RH = 200, SEAT_X = 90, SEAT_Y = 194;
function drawRoom(c) {
  const x = c.getContext('2d'), R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  R('#ffe6f3', 0, 0, RW, 122); for (let i = 0; i < RW; i += 14) R('#ffd6ea', i, 0, 6, 122);
  for (let i = 7; i < RW; i += 28) for (let j = 10; j < 118; j += 22) { R('#fff', i + 2, j, 2, 2); }
  R('#f5eeff', 0, 120, RW, 32); R('#d8c6f4', 0, 120, RW, 2); R('#e9dcfb', 0, 150, RW, 2);
  R('#e9d6f7', 0, 152, RW, 48); for (let i = 0; i < RW; i += 12) R('#dcc5ef', i, 152, 1, 48);
  x.fillStyle = '#ffc6e2'; x.beginPath(); x.ellipse(90, 186, 78, 13, 0, 0, 7); x.fill(); x.fillStyle = '#ffb3d9'; x.beginPath(); x.ellipse(90, 186, 64, 9, 0, 0, 7); x.fill();
  // window
  R('#b693ef', 12, 16, 50, 66); R('#fff', 14, 18, 46, 62); const g = x.createLinearGradient(0, 20, 0, 78); g.addColorStop(0, '#a9e3ff'); g.addColorStop(1, '#e9f8ff'); x.fillStyle = g; x.fillRect(16, 20, 42, 58);
  R('#fff', 22, 34, 10, 3); R('#fff', 20, 37, 15, 3); R('#fff', 40, 52, 9, 2); R('#fff', 38, 54, 13, 2); R('#fff', 36, 20, 2, 58); R('#fff', 16, 48, 42, 2);
  R('#ff8cc6', 6, 12, 10, 78); R('#ff8cc6', 58, 12, 10, 78); R('#e2458f', 8, 12, 1, 78); R('#e2458f', 12, 12, 1, 78); R('#e2458f', 61, 12, 1, 78); R('#e2458f', 65, 12, 1, 78); R('#c9a2f5', 4, 10, 66, 3);
  // picture
  R('#ffd86e', 128, 24, 38, 30); R('#fff', 131, 27, 32, 24); x.fillStyle = '#ff8cc6'; x.beginPath(); x.moveTo(147, 46); x.lineTo(139, 37); x.arc(143, 35, 4, Math.PI, 0); x.arc(151, 35, 4, Math.PI, 0); x.closePath(); x.fill();
  // plant + lamp
  R('#b693ef', 152, 134, 18, 18); R('#9a7bd0', 152, 134, 18, 3); x.fillStyle = '#7bd88f'; [[161, 118, 6, 14], [154, 124, 5, 10], [168, 124, 5, 10], [161, 108, 4, 8]].forEach(([a, b, w, h]) => { x.beginPath(); x.ellipse(a, b, w, h, 0, 0, 7); x.fill(); });
  R('#9a7bd0', 20, 98, 2, 54); R('#9a7bd0', 14, 150, 14, 3); x.fillStyle = '#ffd86e'; x.beginPath(); x.moveTo(12, 100); x.lineTo(30, 100); x.lineTo(26, 86); x.lineTo(16, 86); x.closePath(); x.fill();
  // armchair: back + seat (behind the patient)
  x.fillStyle = '#9a7bd0'; x.beginPath(); x.roundRect(38, 80, 104, 108, 22); x.fill();
  x.fillStyle = '#c9a7f0'; x.beginPath(); x.roundRect(42, 84, 96, 100, 18); x.fill();
  [[64, 108], [90, 102], [116, 108], [64, 136], [90, 132], [116, 136]].forEach(([a, b]) => R('#9a7bd0', a, b, 2, 2));
  R('#b693ef', 40, 168, 100, 20);
}
function drawFront(c) {
  const x = c.getContext('2d');
  x.fillStyle = '#9a7bd0'; x.beginPath(); x.roundRect(26, 132, 24, 64, 10); x.fill(); x.beginPath(); x.roundRect(130, 132, 24, 64, 10); x.fill();
  x.fillStyle = '#c9a7f0'; x.beginPath(); x.roundRect(28, 134, 20, 60, 8); x.fill(); x.beginPath(); x.roundRect(132, 134, 20, 60, 8); x.fill();
  x.fillStyle = '#e3d0fa'; x.fillRect(31, 137, 14, 3); x.fillRect(135, 137, 14, 3);
  x.fillStyle = '#9a7bd0'; x.beginPath(); x.roundRect(40, 186, 100, 12, 4); x.fill(); x.fillStyle = '#b693ef'; x.fillRect(42, 188, 96, 7);
  x.fillStyle = '#6b4a9e'; x.fillRect(46, 197, 4, 3); x.fillRect(130, 197, 4, 3);
}

const HEAD_SPR = { prim: [52, 6], trix: [74, 10] };
const EMOTE = { happy: '♪', sad: '…', surprised: '!', angry: '#', pain: '!!', wince: '>_<', shy: '///', neutral: '' };
function buildFeed(b, g) {
  const hs = HEAD_SPR[g], hx = SEAT_X - ART[g].w / 2 + hs[0], hy = SEAT_Y - ART[g].h + hs[1];
  b.innerHTML = `<div class="feed"><div class="feed-top"><span class="live">● LIVE</span><span>Room 0 · ${esc(GIRLS[g].name)}</span><span class="id">${esc(GIRLS[g].id)}</span></div>
    <div class="feed-screen" id="feed-screen"><div class="feed-stage" id="feed-stage"><canvas class="room" width="${RW}" height="${RH}"></canvas><canvas id="feed-cv" class="feed-body" width="${RW}" height="${RH}"></canvas><canvas class="room-front" width="${RW}" height="${RH}"></canvas>
      <div class="emote" id="feed-emote" style="left:${hx / RW * 100}%;top:${hy / RH * 100}%" aria-live="polite"></div></div></div>
    <div class="layers sunk" id="feed-layers"></div></div>`;
  drawRoom($('.room', b)); drawFront($('.room-front', b));
  loadImg(ART[g].body).then(img => { const cv = $('#feed-cv', b); if (cv && !S.g[g].gone) cv.getContext('2d').drawImage(img, SEAT_X - ART[g].w / 2, SEAT_Y - ART[g].h); renderFeed(); });
  renderFeed();
}
function setFeedEmo(emo) {
  if (!S.session) return; S.session.emo = emo;
  const st = $('#feed-stage'), em = $('#feed-emote'); if (!st || !em) return;
  em.textContent = EMOTE[emo] || ''; em.className = 'emote e-' + emo + (EMOTE[emo] ? ' on' : '');
  st.className = 'feed-stage'; void st.offsetWidth; st.classList.add('mv-' + emo);
}
function renderFeed() {
  const st0 = $('#feed-stage'); if (!st0 || !S.session) return;
  const g = S.session.g, st = S.g[g], G = GIRLS[g];
  const msg = $('#feed-msg'); if (msg) msg.remove();
  const body = $('#feed-cv');
  if (st.gone) { if (body && !body.dataset.dissolved) body.getContext('2d').clearRect(0, 0, RW, RH); $('#feed-screen').insertAdjacentHTML('beforeend', '<div class="feed-msg" id="feed-msg">DISCHARGED ♡<small>she has left the facility</small></div>'); }
  const box = $('#feed-layers'); if (!box) return;
  box.innerHTML = [0, 1, 2].map(i => {
    const done = st.layer > i, cur = st.layer === i, hp = G.hp[i], left = done ? 0 : cur ? Math.max(0, hp - st.dmg) : hp;
    return `<div class="lyr${done ? ' done' : ''}${cur ? ' cur' : ''}"><span class="n">Layer ${i + 1}</span><div class="hp"><i style="width:${left / hp * 100}%"></i></div><span class="v">${done ? '✓' : ''}</span></div>`;
  }).join('');
}
async function breakLayerFx(g, L) {
  SFX.shatter(); glitch(L === 3 ? 'hard' : 'soft'); setFeedEmo('surprised');
  if (L === 3) { await wait(500); await dissolve(g); }
  else await wait(700);
  renderFeed();
}
function dissolve(g) {
  return new Promise(res => {
    const cv = $('#feed-cv'); if (!cv) return res(); const x = cv.getContext('2d');
    const cells = []; for (let y = 0; y < RH; y += 2) for (let xx = 0; xx < RW; xx += 2) cells.push([xx, y]);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[cells[i], cells[j]] = [cells[j], cells[i]]; }
    let k = 0; const per = Math.ceil(cells.length / 40);
    const iv = setInterval(() => { for (let n = 0; n < per && k < cells.length; n++, k++) x.clearRect(cells[k][0], cells[k][1], 2, 2); if (k >= cells.length) { clearInterval(iv); cv.dataset.dissolved = '1'; res(); } }, 45);
  });
}

/* ---------- ColorLine.exe ---------- */
const CL_COLORS = ['#ff5fa8', '#3fb6e0', '#ffbf3a', '#5fcf86', '#a77bf0', '#ff8a5c', '#38c9be', '#e86bd8'];
const BASE_T = { 5: [10, 15, 20], 6: [15, 22, 30], 7: [22, 32, 45], 8: [30, 45, 60] };
const PTS = { S: 300, A: 240, B: 190, C: 150 };
let CL = null, clBody = null;
function thresholds(L) { const f = L.fill ? 1.3 : 1; return BASE_T[L.n].map(t => Math.round(t * f)); }
const timeLimit = L => thresholds(L)[2] * 2;
const moveWindow = () => 2;
const moveLimit = k => k + 3 + (hasMem('queen_piece.mem') ? 3 : 0);
function scoreOf(L, sec, moves) {
  const th = thresholds(L), k = L.pairs.length, g = S.session ? S.session.g : null;
  const tier = sec <= th[0] ? 'S' : sec <= th[1] ? 'A' : sec <= th[2] ? 'B' : 'C';
  const mb = moves <= k ? 100 : moves <= k + moveWindow() ? 50 : 0;
  const base = PTS[tier] + mb;
  let mult = 1, multFrom = null, bonus = 0;
  S.mementos.forEach(m => { const M = MEMENTOS[m]; if (M.target === g && M.mult > mult) { mult = M.mult; multFrom = m; } if (M.bonus) bonus += M.bonus; });
  const total = Math.round(base * mult * (1 + bonus));
  return { tier, pts: PTS[tier], mb, mult, multFrom, bonus, total, th, k, sec, moves };
}
function buildCLShell(b) {
  clBody = b;
  b.innerHTML = `<div class="cl"><div class="cl-top" id="cl-top"><span>no board loaded</span></div>
    <p class="cl-rule" id="cl-rule"></p><div class="tiers" id="cl-tiers"></div>
    <div class="cl-board"><div class="cl-wrap" id="cl-wrap"><div class="cl-idle">Waiting for the patient…</div></div></div>
    <div class="cl-stat" id="cl-stat"></div></div>`;
}
const key = (r, c) => r * 100 + c;
function loadLevel(L, label) {
  if (!clBody || !clBody.isConnected) return;
  if (CL && CL.timer) clearInterval(CL.timer);
  const N = L.n, dots = {};
  L.pairs.forEach((p, i) => { dots[key(p[0][0], p[0][1])] = i; dots[key(p[1][0], p[1][1])] = i; });
  CL = { max: moveLimit(L.pairs.length), L, N, k: L.pairs.length, dots, paths: L.pairs.map(() => null), cur: -1, drawing: false, moves: 0, last: -1, t0: 0, sec: 0, done: false, locked: false, label, timer: null, rewound: false, auto: -1 };
  // red_thread: 40% chance one pair links itself (perfect path)
  if (hasMem('tracing_paper.mem') && L.sol && Math.random() < .4) { const i = Math.random() * CL.k | 0; CL.paths[i] = L.sol[i].map(q => q.slice()); CL.auto = i; }
  const G = GIRLS[S.session.g];
  const mems = S.mementos.map(m => `<span title="${esc(MEMENTOS[m].desc)}" style="display:inline-block;width:18px;height:18px;vertical-align:middle">${icon(MEMENTOS[m].ic)}</span>`).join('');
  $('#cl-top', clBody).innerHTML = `<span><b>${esc(G.name)}</b> · ${label}</span><span>${N}×${N} · ${CL.k} colors${L.fill ? ' · FILL 100%' : ''}</span><span>${mems}</span><span class="r" id="cl-time">0.0s</span>`;
  $('#cl-rule', clBody).textContent = G.rule + (CL.auto >= 0 ? ' ✦ tracing_paper.mem linked one pair for you.' : '');
  const th = thresholds(L);
  $('#cl-tiers', clBody).innerHTML = `<span class="tier" data-t="S">≤${th[0]}s S·${PTS.S}</span><span class="tier" data-t="A">≤${th[1]}s A·${PTS.A}</span><span class="tier" data-t="B">≤${th[2]}s B·${PTS.B}</span><span class="tier" data-t="C">≤${timeLimit(L)}s C·${PTS.C}</span><span class="tier mv">${CL.k} strokes +100 · ≤${CL.k + moveWindow()} +50</span><span class="tier" style="border-color:var(--danger);color:var(--danger)">limit ${timeLimit(L)}s${hasMem('hourglass.mem') ? ' ⏳' : ''} · ${CL.max} moves</span>`;
  const wrap = $('#cl-wrap', clBody);
  wrap.innerHTML = `<div class="cl-grid" id="cl-grid" style="grid-template-columns:repeat(${N},1fr);grid-template-rows:repeat(${N},1fr)"></div><svg class="cl-svg" id="cl-svg" viewBox="0 0 ${N} ${N}" preserveAspectRatio="none"></svg>`;
  const grid = $('#cl-grid', wrap);
  let h = ''; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const d = dots[key(r, c)]; h += `<div class="ccell" data-r="${r}" data-c="${c}">${d !== undefined ? `<span class="dot" style="background:${CL_COLORS[d]};color:${CL_COLORS[d]}"></span>` : ''}</div>`; }
  grid.innerHTML = h;
  const cellAt = e => { const rc = grid.getBoundingClientRect(); return [clamp(Math.floor((e.clientY - rc.top) / rc.height * N), 0, N - 1), clamp(Math.floor((e.clientX - rc.left) / rc.width * N), 0, N - 1)]; };
  grid.addEventListener('pointerdown', e => {
    if (!CL || CL.locked || CL.done) return; e.preventDefault();
    const [r, c] = cellAt(e), d = CL.dots[key(r, c)];
    let col = -1;
    if (d !== undefined) { col = d; CL.paths[d] = [[r, c]]; }
    else { const o = ownerAt(r, c); if (o < 0) return; col = o; const p = CL.paths[o], i = p.findIndex(q => q[0] === r && q[1] === c); p.length = i + 1; }
    CL.cur = col; CL.drawing = true;
    if (col !== CL.last) { CL.moves++; CL.last = col; }
    if (CL.moves > CL.max) { CL.moves = CL.max; renderCL(); failLevel('moves'); return; }
    if (!CL.t0) { CL.t0 = performance.now(); CL.timer = setInterval(updTime, 100); }
    grid.setPointerCapture(e.pointerId); SFX.step(0); renderCL();
  });
  grid.addEventListener('pointermove', e => { if (CL && CL.drawing && !CL.locked && !CL.done) { const [r, c] = cellAt(e); stepTo(r, c); } });
  const up = () => { if (!CL) return; CL.drawing = false; checkWin(); };
  grid.addEventListener('pointerup', up); grid.addEventListener('pointercancel', up);
  renderCL(); updTime();
}
function ownerAt(r, c) { for (let i = 0; i < CL.paths.length; i++) { const p = CL.paths[i]; if (p && p.some(q => q[0] === r && q[1] === c)) return i; } return -1; }
function complete(i) {
  const p = CL.paths[i]; if (!p || p.length < 2) return false;
  const [a, b] = CL.L.pairs[i], s = p[0], e = p[p.length - 1];
  const isA = q => q[0] === a[0] && q[1] === a[1], isB = q => q[0] === b[0] && q[1] === b[1];
  return (isA(s) && isB(e)) || (isB(s) && isA(e));
}
function stepTo(r, c) {
  let guard = 0;
  while (guard++ < 16 && CL && !CL.done) {
    const p = CL.paths[CL.cur]; if (!p) return; const h = p[p.length - 1];
    if (h[0] === r && h[1] === c) return;
    const dr = Math.sign(r - h[0]), dc = Math.sign(c - h[1]);
    const first = Math.abs(r - h[0]) >= Math.abs(c - h[1]) ? [h[0] + dr, h[1]] : [h[0], h[1] + dc];
    const second = first[0] !== h[0] ? [h[0], h[1] + dc] : [h[0] + dr, h[1]];
    if (extend(first) || ((second[0] !== h[0] || second[1] !== h[1]) && extend(second))) { renderCL(); checkWin(); continue; }
    return;
  }
}
function extend([r, c]) {
  const i = CL.cur, p = CL.paths[i], h = p[p.length - 1];
  if (Math.abs(r - h[0]) + Math.abs(c - h[1]) !== 1) return false;
  const j = p.findIndex(q => q[0] === r && q[1] === c);
  if (j >= 0) { p.length = j + 1; SFX.tick(); return true; }
  if (complete(i)) return false;
  const d = CL.dots[key(r, c)];
  if (d !== undefined && d !== i) return false;
  const o = ownerAt(r, c);
  if (o >= 0 && o !== i) { const q = CL.paths[o], m = q.findIndex(x => x[0] === r && x[1] === c); q.length = m; if (!q.length) CL.paths[o] = null; }
  p.push([r, c]);
  if (complete(i)) SFX.link(); else SFX.step(p.length);
  return true;
}
function filledCount() { let n = 0; CL.paths.forEach(p => { if (p) n += p.length; }); return n; }
function updTime() {
  if (!CL || !clBody || !clBody.isConnected) return;
  let sec = CL.done ? CL.sec : CL.t0 ? (performance.now() - CL.t0) / 1000 : 0;
  const lim = timeLimit(CL.L);
  if (!CL.done && sec > lim) {
    if (hasMem('hourglass.mem') && !CL.rewound) { CL.rewound = true; CL.t0 = performance.now(); sec = 0; SFX.rewind(); toast('hourglass.mem', 'Time flowed back to zero.'); }
    else { failLevel('time'); return; }
  }
  const t = $('#cl-time', clBody); if (t) t.textContent = sec.toFixed(1) + 's';
  const th = thresholds(CL.L), tier = sec <= th[0] ? 'S' : sec <= th[1] ? 'A' : sec <= th[2] ? 'B' : 'C';
  $$('#cl-tiers .tier[data-t]', clBody).forEach(e => e.classList.toggle('on', e.dataset.t === tier));
}
function renderCL() {
  if (!CL || !clBody || !clBody.isConnected) return;
  const N = CL.N, owner = {};
  CL.paths.forEach((p, i) => p && p.forEach(q => owner[key(q[0], q[1])] = i));
  $$('.ccell', clBody).forEach(el => {
    const k = key(+el.dataset.r, +el.dataset.c), o = owner[k];
    el.style.background = o !== undefined ? CL_COLORS[o] + '38' : '';
    const dot = el.firstElementChild; if (dot) dot.classList.toggle('ok', complete(CL.dots[k]));
  });
  $('#cl-svg', clBody).innerHTML = CL.paths.map((p, i) => p && p.length > 1 ? `<polyline points="${p.map(q => `${q[1] + .5},${q[0] + .5}`).join(' ')}" fill="none" stroke="${CL_COLORS[i]}" stroke-width=".34" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${p.map(q => `${q[1] + .5},${q[0] + .5}`).join(' ')}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".08" stroke-linecap="round" stroke-linejoin="round"/>` : '').join('');
  const conn = CL.paths.filter((p, i) => complete(i)).length, fill = Math.round(filledCount() / (N * N) * 100);
  $('#cl-stat', clBody).innerHTML = `<span>linked <b>${conn}/${CL.k}</b></span><span>moves <b>${CL.moves}/${CL.max}</b></span><span>filled <b>${fill}%</b>${CL.L.fill ? ' (need 100%)' : ''}</span>`;
}
function resultCard(html) { const ov = document.createElement('div'); ov.className = 'cl-res'; ov.innerHTML = `<div class="card bevel">${html}</div>`; $('#cl-wrap', clBody).appendChild(ov); }
function failLevel(why = 'time') {
  if (!CL || CL.done) return;
  CL.done = true; CL.failed = true; CL.drawing = false; clearInterval(CL.timer); SFX.buzz(); glitch('soft'); setFeedEmo('pain');
  resultCard(`<h3>${why === 'moves' ? 'OUT OF MOVES' : 'TIME UP'}</h3><div class="big">×</div><table><tr><td>${why === 'moves' ? 'move limit ' + CL.max + ' reached' : 'limit ' + timeLimit(CL.L) + 's reached'}</td><td>+0</td></tr></table><p>No damage this board. ${esc(GIRLS[S.session.g].name)} is replying…</p>`);
  setTimeout(() => onSolved({ total: 0, failed: true, why }), 700);
}
function checkWin() {
  if (!CL || CL.done) return;
  if (!CL.paths.every((p, i) => complete(i))) return;
  if (CL.L.fill && filledCount() < CL.N * CL.N) { if (!CL.drawing && !CL.fillWarned) { CL.fillWarned = true; SFX.buzz(); toast('ColorLine.exe', 'All pairs linked, but there are empty tiles. Trix needs 100%.'); } return; }
  if (!CL.t0) CL.t0 = performance.now();
  CL.done = true; CL.drawing = false; CL.sec = (performance.now() - CL.t0) / 1000; clearInterval(CL.timer); updTime();
  const res = scoreOf(CL.L, CL.sec, CL.moves); SFX.win(); setFeedEmo('wince');
  const g = S.session.g, st = S.g[g];
  resultCard(`<h3>BOARD CLEAR ✧</h3><div class="big">${res.tier}</div>
    <table><tr><td>time ${res.sec.toFixed(1)}s → grade ${res.tier}</td><td>+${res.pts}</td></tr>
    <tr><td>strokes ${res.moves}/${res.k}${res.mb === 100 ? ' · perfect' : res.mb ? ' · good' : ''}</td><td>+${res.mb}</td></tr>
    ${res.mult > 1 ? `<tr><td>${esc(res.multFrom)} ×${res.mult}</td><td>×${res.mult}</td></tr>` : ''}${res.bonus ? `<tr><td>sketch_of_you.mem</td><td>+${Math.round(res.bonus * 100)}%</td></tr>` : ''}
    <tr class="tot"><td>damage to Layer ${Math.min(st.layer + 1, 3)}</td><td>${res.total}</td></tr></table>
    <p>${esc(GIRLS[g].name)} is replying in session chat…</p>`);
  setTimeout(() => onSolved(res), 700);
}

/* =========================================================
   NOTES · RECYCLE BIN · the locked log
   ========================================================= */
const ABOUT_DIVE = `DIVE
<span class="red">D</span>ream <span class="red">I</span>nterference &amp; <span class="red">V</span>irtual <span class="red">E</span>mendation
--------------------------------------
A neural intervention developed by an
external psychiatric institute.

host:       ORI (real name withheld)
condition:  dissociative overload
procedure:  reduce co-existing personas
            to one integrated identity
operator:   Dr. ████████

LOG  operator memory overwritten from
     inside the dream (unauthorised)
LOG  operator now believes they are an
     "a counsellor on probation"
LOG  persona "BOSS" holds admin rights`;
function journalText() {
  const real = S.journal.filter(j => !j.miss), misses = S.journal.filter(j => j.miss).length;
  const body = S.journal.map(j => `Day ${pad2(j.day)} · ${j.text}`).join('\n\n');
  const sad = real.length < 4 ? `\n\n--------------------------------------\nYou didn't tell me much.\nI made them. I gave them faces and\nprofiles and names. And I don't know\nwho they were. Nobody does now.` : `\n\n--------------------------------------\nI can't keep them. But I kept what you\ntold me about them. That has to count.`;
  return `journal.txt          owner: R.
(private. not for the newbie.)
======================================

${body || '(empty)'}${sad}${misses ? `\n\n(${misses} night${misses > 1 ? 's' : ''} I asked and nobody answered.)` : ''}

--------------------------------------
P.S.
I told you about Reykjavik and Kyoto
and the night trains in Switzerland.

I've never been anywhere.
I've never left this city.
Every place I know, I found on the
internet at 3 a.m., in a hospital bed.

I just wanted them to have a bigger
world than mine.`;
}
function openNote(id, title, body, cls = '', ic = 'doc') {
  openWin('note:' + id, { title: title + ' - Notepad', icon: ic, w: 460, h: 480, render: b => { b.innerHTML = `<div class="notepad sunk ${cls}">${body}</div>`; } });
}
function openBin() {
  openWin('bin', { title: 'Recycle Bin', icon: 'trash', w: 460, h: 300, x: 200, y: 80, render: (b, rec) => {
    const r = () => {
      b.innerHTML = `<div class="ex"><div class="ex-list sunk" style="display:block">${S.flags.logRestored ? '<div class="denied">The Recycle Bin is empty.</div>'
        : `<div class="binrow bevel">${icon('lockdoc')}<div><b>personal_log.txt</b><small>deleted Day 0, 23:58 · 4 KB · owner ████████</small></div><button class="btn primary" id="bin-restore">Restore</button></div>`}</div><div class="ex-status">${S.flags.logRestored ? 0 : 1} object(s)</div></div>`;
      const x = $('#bin-restore', b); if (x) x.onclick = () => { S.flags.logRestored = true; SFX.item(); toast('Recycle Bin', '<b>personal_log.txt</b> restored to the desktop.'); save(); refresh(); r(); };
    };
    addUpd(rec, r); r();
  } });
}
function openLog() {
  openWin('log', { title: 'personal_log.txt', icon: 'lockdoc', w: 380, h: 280, x: 240, y: 120, render: b => {
    b.innerHTML = `<div class="denied"><h3>This file is password protected</h3>owner: ████████<br>last opened: Day 0, 23:57<br>hint: [corrupted]
      <form id="log-form" autocomplete="off"><label for="log-pw">PASSWORD</label><input id="log-pw" class="sunk" type="password" maxlength="24"><button class="btn primary" type="submit">Unlock</button></form><div class="err" id="log-err"></div></div>`;
    $('#log-form', b).onsubmit = e => { e.preventDefault(); S.flags.logTries = (S.flags.logTries || 0) + 1; SFX.buzz(); $('#log-err', b).textContent = S.flags.logTries > 2 ? 'Incorrect password. (Your fingers almost typed something. Then forgot.)' : 'Incorrect password.'; $('#log-pw', b).value = ''; save(); };
  } });
}

/* =========================================================
   ENDINGS
   ========================================================= */
function protoEndBoss() {
  S.flags.protoEnd = true;
  runDialogue(seq('boss', 'boss', [{ lines: ['Both of them faced everything and checked out. New patients are on their way.', 'You\'re doing so well, rookie.', '...I almost don\'t want this to end. Haha. Kidding. Mostly.'] }], 'PROTO_END'));
}
function endGame(kind) {
  S.flags.ended = true; S.flags.endKind = kind; checkpoint('ended'); refresh();
  glitch('hard');
  setTimeout(() => {
    openNote('journal', 'journal.txt', journalText(), 'journal', 'journal');
    const fixed = PLAYABLE.filter(k => S.g[k].gone).map(k => GIRLS[k].name);
    openWin('end', {
      title: kind === 'proto' ? 'End of prototype' : 'Deadline', icon: 'soul', w: 500, h: 560, x: 110, y: 16, render: b => {
        b.innerHTML = `<div class="endc"><div class="chapter"><div class="hero"><small>${kind === 'proto' ? 'DAY ' + S.day + ' / ' + LAST_DAY : 'DAY ' + LAST_DAY + ' · TIME UP'}</small><h2>${kind === 'proto' ? 'Two patients "discharged"' : 'KPI missed'}</h2></div></div>
        <div class="panel sunk" style="padding:0"><div class="term">KPI           ${layersTotal()}/${kpiMax()}
discharged    ${esc(fixed.join(', ') || 'none')}
journal       ${S.journal.filter(j => !j.miss).length} entries · ${S.journal.filter(j => j.miss).length} silent nights
showcase      ${PLAYABLE.map(k => GIRLS[k].name + ': ' + (S.show[k] === 'good' ? 'encouraged' : S.show[k] ? 'as ordered' : '—')).join(' · ')}
mementos      ${S.mementos.length}/${Object.keys(MEMENTOS).length} · software ${S.apps.length}/2
<span class="m">earthquakes   ${S.quakes}</span></div></div>
        <p style="margin:0;font-size:13px;line-height:1.6">They didn't leave the facility. Every layer you removed was her will to live. She went back to the person who made her, and stopped.</p>
        <p style="margin:0;font-size:12px;color:var(--ink-soft);line-height:1.5">Boss kept a journal. It's open behind this window.</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn" id="en-dive">about_dive.txt</button><button class="btn primary" id="en-new">New game</button></div></div>`;
        $('#en-dive', b).onclick = () => openNote('dive', 'about_dive.txt', ABOUT_DIVE); $('#en-new', b).onclick = confirmReset;
      }
    });
    SFX.win();
  }, 900);
}

/* =========================================================
   CHOOSE APPEARANCE (the overwrite)
   ========================================================= */
function setupScreen() {
  return new Promise(resolve => {
    const P = { name: 'Newbie', hair: 0, hc: 0, eye: 0, skin: 0, outfit: 0, acc: 0 };
    const el = document.createElement('div'); el.id = 'setup';
    el.innerHTML = `<section class="win" role="dialog" aria-label="Choose desired appearance"><div class="titlebar" style="cursor:default">${icon('soul')}<span class="tt">Choose desired appearance</span><button class="btn tbtn" disabled aria-label="Minimize">_</button><button class="btn tbtn" disabled aria-label="Close">×</button></div>
     <div class="win-body" style="overflow:visible"><div class="su">
      <div class="su-prev bevel"><canvas id="su-cv" width="32" height="32" aria-label="Avatar preview"></canvas><div class="nm" id="su-nm"></div><button class="btn" id="su-rand">Randomize</button></div>
      <div class="su-opts">
       <div class="su-row"><span>Name</span><div class="set"><input id="su-name" maxlength="12" value="" placeholder="Newbie" autocomplete="off"></div></div>
       <div class="su-row"><span>Hair</span><div class="set" data-k="hair">${HAIRS.map((h, i) => `<button class="pill" data-v="${i}">${h}</button>`).join('')}</div></div>
       <div class="su-row"><span>Hair color</span><div class="set" data-k="hc">${HAIRC.map((h, i) => `<button class="sw" data-v="${i}" style="background:${h[1]}" aria-label="${h[0]}" title="${h[0]}"></button>`).join('')}</div></div>
       <div class="su-row"><span>Eyes</span><div class="set" data-k="eye">${EYEC.map((h, i) => `<button class="sw" data-v="${i}" style="background:${h[1]}" aria-label="${h[0]}" title="${h[0]}"></button>`).join('')}</div></div>
       <div class="su-row"><span>Skin</span><div class="set" data-k="skin">${SKIN.map((h, i) => `<button class="sw" data-v="${i}" style="background:${h[1]}" aria-label="${h[0]}" title="${h[0]}"></button>`).join('')}</div></div>
       <div class="su-row"><span>Outfit</span><div class="set" data-k="outfit">${OUTFITS.map((h, i) => `<button class="pill" data-v="${i}">${h[0]}</button>`).join('')}</div></div>
       <div class="su-row"><span>Accessory</span><div class="set" data-k="acc">${ACCS.map((h, i) => `<button class="pill" data-v="${i}">${h}</button>`).join('')}</div></div>
      </div></div>
      <div class="su-foot"><span class="su-sync"></span><div class="su-btns"><button class="btn primary" id="su-ok">Confirm</button></div></div></div></section>`;
    document.body.appendChild(el);
    const cv = $('#su-cv', el), paint = blink => drawAvatar(cv, P, blink);
    const upd = () => { $$('.set[data-k]', el).forEach(s => $$('[data-v]', s).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === P[s.dataset.k])))); $('#su-nm', el).textContent = P.name || 'Newbie'; paint(false); };
    $$('.set[data-k]', el).forEach(s => s.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; auInit(); SFX.pop(); P[s.dataset.k] = +b.dataset.v; upd(); }));
    $('#su-name', el).addEventListener('input', e => { P.name = e.target.value.replace(/[<>]/g, '').trim() || 'Newbie'; upd(); });
    $('#su-rand', el).onclick = () => { auInit(); SFX.pop(); P.hair = Math.random() * 4 | 0; P.hc = Math.random() * 6 | 0; P.eye = Math.random() * 4 | 0; P.skin = Math.random() * 3 | 0; P.outfit = Math.random() * 4 | 0; P.acc = Math.random() * 4 | 0; upd(); };
    const blinkIv = setInterval(() => { paint(true); setTimeout(() => paint(false), 140); }, 3200);
    $('#su-ok', el).onclick = () => {
      auInit(); SFX.click();
      const m = document.createElement('div'); m.className = 'su-modal';
      m.innerHTML = `<div class="card bevel" role="alertdialog" aria-label="Confirm appearance"><p>Is this how you want to look?<br>This can't be changed later.</p><div class="row"><button class="btn" id="su-no">No</button><button class="btn primary" id="su-yes">Yes</button></div></div>`;
      $('.win', el).appendChild(m); $('#su-yes', m).focus();
      $('#su-no', m).onclick = () => { SFX.click(); m.remove(); };
      $('#su-yes', m).onclick = async () => {
        clearInterval(blinkIv); SFX.click();
        P.name = (P.name || 'Newbie').slice(0, 12);
        const player = { ...P, avatar: avatarURL(P) };
        m.innerHTML = `<div class="card bevel load" role="status"><p id="ld-t">Creating avatar…</p><div class="ldbar"><i id="ld-b"></i></div></div>`;
        const bar = $('#ld-b', m), txt = $('#ld-t', m);
        for (let i = 0; i <= 100; i += 4) { bar.style.width = i + '%'; await wait(REDUCED ? 5 : 55); }
        txt.textContent = 'Overriding memor…'; bar.style.width = '0%';
        for (let i = 0; i <= 36; i += 4) { bar.style.width = i + '%'; await wait(REDUCED ? 5 : 70); }
        const bo = document.createElement('div'); bo.id = 'blackout'; document.body.appendChild(bo);
        el.remove();
        await wait(1600);
        resolve(player);
      };
    };
    upd(); $('#su-name', el).focus();
  });
}

/* =========================================================
   BOOT
   ========================================================= */
async function wakeUp() {
  let bo = $('#blackout'); if (!bo) { bo = document.createElement('div'); bo.id = 'blackout'; document.body.appendChild(bo); }
  applyAtmos(); refresh();
  $('#app').classList.add('waking');
  bo.classList.add('wake');
  await wait(REDUCED ? 300 : 3200);
  bo.remove(); $('#app').classList.remove('waking');
}
async function bootOS() {
  const el = document.createElement('div'); el.id = 'boot'; document.body.appendChild(el);
  el.innerHTML = '<div class="splash"><div><div class="logo">DIVE OS</div><div class="sub">v2.4 ♡ patient care network</div><div class="lbar"><i></i></div></div></div>';
  requestAnimationFrame(() => requestAnimationFrame(() => { const i = $('.lbar i', el); if (i) i.style.width = '100%'; }));
  await wait(REDUCED ? 300 : 1500); el.remove();
  applyAtmos(); refresh();
}
function day1Start() {
  S.phase = 'day'; S.day = 1; S.half = 1; S.mins = 9 * 60 + 2; S.todayLayers = 0; S.todayFixed = []; S.todayWorked = []; S.fixes = 0;
  S.night = { chats: 0, with: [], bossPending: false, bossDone: false };
  S.unread.boss = 1; S.flags.ping = 'yap';
  checkpoint('d1'); refresh();
}
async function main() {
  await loadDialogueData();
  buildTaskbar(); renderIcons(); renderTray();
  let saved = loadSave();
  if (saved && saved.player) {
    // autosave: continue from the last checkpoint, no menus
    S = Object.assign(fresh(), saved);
    S.active = null; S.queue = []; S.dyn = {}; S.session = null;
    await bootOS();
    if (S.flags.ended) { refresh(); endGame(S.flags.endKind || 'proto'); return; }
    if (S.at === 'd1') { S.flags.briefStarted = false; S.logs.boss = []; day1Start(); await lockScreen('Welcome back'); return; }
    if (S.at === 'pm') { S.phase = 'day'; await beginAfternoon(); return; }
    if (S.at === 'night') { S.phase = 'day'; S.session = null; await goNight(); return; }
    await beginMorning(); return;
  }
  const player = await setupScreen();
  S = fresh(); S.player = player; day1Start();
  await wakeUp();
}
main();

