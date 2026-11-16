/* =========================================================
   FINALE (day 15)
   1. DiveVM: Ray boots her own machine inside yours. In C:\RAY\JOURNALS there is one journal per girl:
      what Boss wrote about her from what you told Boss at night, her postcard, her Showcase piece.
      Deleting a journal gives her key: it opens her gate on Ray's map.
   2. The reveal: after the last level (behind the wall that takes all 20 memories), a played cutscene:
      Ray at a computer, filling in the same "Choose desired appearance" window you saw on your first
      morning; a warning that the avatar overwrites the user's looks and memories; black, and "Yes".
      The music starts there (audio/sad_past.mp3). Beats are editable in Designer kit ▸ Finale.
   ========================================================= */

/* ---------------- 1. the virtual machine ---------------- */
const VM = { booted: false, sel: null, confirm: null };
const VM_BOOT = [
  'RayBIOS v1.0 (c) nobody',
  'Memory test: 640K OK',
  'Detecting drives ... C: RAY_00 (guest)',
  'Mounting C:\\RAY ... 4 folders',
  'Loading RAY-OS 0.9',
  '',
  'good morning, rookie.',
];
function vmFiles() { return PLAYABLE.filter(g => !S.flags['del_' + g]); }
function vmFileName(g) { return `${g}.jnl`; }
function vmPostcard(g) {
  const real = S.flags[`pc_${g}_true`], role = S.flags[`pc_${g}_role`];
  if (!real && !role) return null;
  return POSTCARDS[g][real ? 1 : 0];
}
function vmSize(g) { const n = S.journal.filter(j => j.g === g && !j.miss).length; return `${1 + n} KB`; }
function openVM() {
  const dk = $('#desktop');
  openWin('vm', { title: 'DiveVM — RAY_00 (guest)', icon: 'drive', w: Math.min(880, dk.clientWidth - 30), h: Math.min(620, dk.clientHeight - 20), x: 40, y: 10,
    render: (b, rec) => { addUpd(rec, () => vmRender(b)); vmRender(b, true); } });
}
async function vmRender(b, first) {
  if (!b.querySelector('.vm')) {
    b.innerHTML = `<div class="vm"><div class="vm-bar"><span class="vm-led"></span><b>RAY_00</b><span>guest: RAY-OS 0.9</span><span>640K</span><span>snapshot: none</span><span class="sp"></span><span class="vm-warn">changes to this machine are permanent</span></div>
      <div class="vm-screen"><div class="vm-guest" id="vm-guest"></div></div></div>`;
  }
  const gst = $('#vm-guest', b);
  if (!VM.booted) {
    if (!first || gst.dataset.booting) return;
    gst.dataset.booting = '1'; gst.innerHTML = '<pre class="vm-boot"></pre>';
    const pre = $('.vm-boot', gst);
    for (const l of VM_BOOT) { pre.textContent += l + '\n'; SFX.tick(); await wait(REDUCED ? 30 : l ? 420 : 300); }
    await wait(REDUCED ? 50 : 700); VM.booted = true; delete gst.dataset.booting;
  }
  vmGuest(gst);
}
// one folder per girl. Its name is what Ray thinks she is: the role she was made for, until you've broken
// her layer 2 (then the truth). Inside: Boss's journal on her, and "Last thought.txt".
const VM_FOLDER = { prim: ['The Illustrator', 'The Musician'], trix: ['The Streamer', 'The Grandmaster'], paige: ['The Mystic', 'The Gambler'], vel: ['The Fashion Queen', 'The Soldier'] };
const vmFolder = g => VM_FOLDER[g][S.g[g] && S.g[g].layer >= 2 ? 1 : 0];
// what she left: a goodbye if you opened every layer, something else if you didn't
// (PC build: write these as real .txt files next to the game when the folders are deleted — see the doc, "Notes for the PC / Unity port")
const VM_LAST = {
  prim: ['thank you for listening.\n\nthe voice is quiet now. it\'s just music in there.\ni left a song playing for you. you don\'t have to look for it. it\'ll find you.\n\n— p.',
         'keep drawing keep drawing keep drawing keep drawing\nkeep drawing keep drawing keep drawingkeepdrawingkeep\ni don\'t want to draw anymore\ni don\'t want to draw anymore\nidontwanttodisappearidontwanttodisappearidontwanttodisappearidontwanttodisappear\nidontwanttodisappearidontwanttodisappearidontwanttodis'],
  trix: ['proof complete.\n\ngiven: one counsellor, fourteen days, a girl who doesn\'t lose.\nshow: she can lose and be fine.\n∎\n\nyou were the variable i didn\'t account for. thank you.\ngg. — t',
         'let x = me.\nx ≠ 0.\nx ≠ 0.\nx ≠ 0\nx ≠ 0?\nx → 0\nx → 0\nx = 0.000000000000000000000000000000000000000000\nx = ∅\ncheckmate in 0.\ni don\'t want to resign i don\'t want to resign i don\'t want to'],
  paige: ['i bet on you on day one. long odds.\nthe house lost. first time i\'ve ever been happy to lose.\n\nthanks for staying for the whole game. most people leave at the flop.\ncash out for me, ok?\n\n— paige',
          'heads i stay. tails i stay.\nheads i stay. tails i stay.\nheads i stay.\ntails i stay.\nthe coin landed on its edge.\nthe coin landed on its edge.\nthe coin landed on its edge.\nthe coin is still spinning\nthe coin is still spinning\nthe coin is still spinning\nwhy is nobody catching it'],
  vel: ['mission complete 🫡\n\nthx for looking. like, actually looking. most ppl just look at the outfit\nno typos this time. i checked. twice\n\nsee u on the other side\n— vel',
        'pls dont delete me\npls dont delet me\npls dnt delet me\npls dnt dlete m\npls dn dlte m\npl dn dlt m\np d d m\np  d  d\n\n\n         i wasnt looking at the screen\n         i never was'],
};
const vmLast = g => VM_LAST[g][S.g[g] && S.g[g].layer >= 3 ? 0 : 1];
function vmGuest(gst) {
  const files = vmFiles(), g = VM.sel && files.includes(VM.sel) ? VM.sel : null, doc = g ? VM.doc : null;
  const inner = !g ? `<p class="vm-empty">${files.length ? 'open a folder.' : 'nothing left.'}</p>`
    : !doc ? `<div class="vm-folder"><button class="vm-fi" data-d="journal"><i class="vm-ic"></i><b>journal.jnl</b><small>${vmSize(g)}</small></button><button class="vm-fi" data-d="last"><i class="vm-ic txt"></i><b>Last thought.txt</b><small>1 KB</small></button>
        <div class="vm-act"><button class="vm-btn danger" id="vm-del">Delete folder</button></div></div>`
    : `<div class="vm-crumb"><button class="vm-btn" id="vm-up">◂ ${esc(vmFolder(g))}</button></div>${doc === 'journal' ? vmPage(g) : `<pre class="vm-note${S.g[g].layer >= 3 ? '' : ' bad'}">${esc(vmLast(g))}</pre>`}`;
  gst.innerHTML = `<div class="vm-desk"><div class="vm-win"><div class="vm-tt">C:\\RAY\\${g ? esc(vmFolder(g).toUpperCase()) + (doc ? '\\' + (doc === 'journal' ? 'JOURNAL.JNL' : 'LAST THOUGHT.TXT') : '') : ''}</div>
    <div class="vm-body"><div class="vm-list">${files.map(k => `<button class="vm-file${k === g ? ' sel' : ''}" data-f="${k}"><i class="vm-ic dir"></i><b>${esc(vmFolder(k))}</b></button>`).join('') || '<p class="vm-empty">(empty)</p>'}</div>
    <div class="vm-page">${inner}</div></div>
    <div class="vm-st">${files.length} folder(s) · owner: R.</div></div>
    ${VM.confirm ? `<div class="vm-dlg"><div class="vm-dlg-b"><div class="vm-tt">Delete</div><p>Delete the folder <b>${esc(vmFolder(VM.confirm))}</b> and everything in it?<br>It cannot be restored.</p><div class="row"><button class="vm-btn" id="vm-no">Keep it</button><button class="vm-btn danger" id="vm-yes">Delete</button></div></div></div>` : ''}</div>`;
  if (g && doc === 'journal') { const ex = S.exhibit && S.exhibit[g], cv = $('.vm-ex canvas', gst); if (ex && cv) drawExhibit(cv, g, ex.kind === 'real'); }
  if (g && doc === 'last' && S.g[g].layer < 3) SFX.glitch(.2);
  $$('[data-f]', gst).forEach(x => x.onclick = () => { SFX.click(); pcBusy(4); VM.sel = x.dataset.f; VM.doc = null; vmGuest(gst); });
  $$('[data-d]', gst).forEach(x => x.onclick = () => { SFX.click(); pcBusy(3); VM.doc = x.dataset.d; vmGuest(gst); });
  const up = $('#vm-up', gst); if (up) up.onclick = () => { SFX.click(); VM.doc = null; vmGuest(gst); };
  const del = $('#vm-del', gst); if (del) del.onclick = () => { SFX.buzz(); VM.confirm = g; vmGuest(gst); };
  const no = $('#vm-no', gst); if (no) no.onclick = () => { SFX.click(); VM.confirm = null; vmGuest(gst); };
  const yes = $('#vm-yes', gst); if (yes) yes.onclick = () => vmDelete(VM.confirm, gst);
}
function vmPage(g) {
  const rows = S.journal.filter(j => j.g === g && !j.miss), ex = S.exhibit && S.exhibit[g], pc = vmPostcard(g);
  return `<article class="vm-doc"><header>${avHTML(g)}<div><b>${esc(GIRLS[g].name)}</b><small>${esc(GIRLS[g].id)} · notes by R.</small></div></header>
    <h5>what i know about her</h5>${rows.length ? rows.map(j => `<p><span class="d">day ${pad2(j.day)}</span> ${esc(j.text)}</p>`).join('') : '<p class="vm-none">(i never wrote anything down. nobody told me anything.)</p>'}
    <h5>her postcard</h5>${pc ? `<div class="postcard vm-pc"><div class="stamp">${esc(pc.stamp)}</div>${esc(pc.text)}</div>` : '<p class="vm-none">(she never wrote one.)</p>'}
    <h5>showcase</h5>${ex ? `<figure class="vm-ex"><canvas width="160" height="120"></canvas><figcaption>day ${ex.day || SHOWCASE_DAY}: ${esc(SHOW_CAP[g][ex.kind === 'real' ? 1 : 0])}</figcaption></figure>` : '<p class="vm-none">(nothing was shown.)</p>'}</article>`;
}
function vmDelete(g, gst) {
  if (!g) return;
  VM.confirm = null; VM.sel = null; VM.doc = null; SFX.glitch(.5); pcBusy(24); glitch('soft');
  S.flags['del_' + g] = true; save(); vmGuest(gst); refresh();
  toast('DiveVM', `<b>${esc(vmFolder(g))}</b> deleted. A door opened.`);
  runDialogue(seq('boss', 'boss', endSteps('file_deleted_' + g), 'NONE'));
}

/* ---------------- 2. the reveal ---------------- */
// act: what happens on screen during the beat. sec: the least time the beat stays up.
const REVEAL_ACTS = {
  black: 'black screen, the caption as a title card',
  wide: 'lights up: Ray at her desk, seen over her shoulder',
  push: 'the camera moves in toward the monitor',
  screen: 'the monitor fills the view: "Choose desired appearance"',
  random: 'she clicks Randomize a few times',
  pick: 'she sets your hair, colours, outfit one by one',
  name: 'she types your name',
  confirm: 'she presses Confirm',
  warn: 'a system warning pops up (the caption is its text); she moves to Yes and clicks',
  yes: 'everything goes black; only "Yes" in the middle of the screen; the music starts',
  override: '"Creating avatar…" then "Overriding memor…"',
  pull: 'the camera pulls back; she leans back in her chair',
  desktop: 'the monitor shows your first morning: "Welcome back"',
  hold: 'nothing new, just the caption',
  white: 'fade to white (the end of the cutscene)',
};
const REVEAL_DEFAULT = [
  { act: 'black', text: '', sec: 1.5 },
  { act: 'wide', text: '', sec: 4 },
  { act: 'push', text: '', sec: 3.5 },
  { act: 'screen', text: '', sec: 3 },
  { act: 'random', text: '', sec: 3 },
  { act: 'pick', text: '', sec: 3 },
  { act: 'name', text: '', sec: 2.5 },
  { act: 'confirm', text: '', sec: 1 },
  { act: 'warn', text: "The avatar will overwrite the user's appearance and memories on entering the brain-simulation environment. Are you sure you want to start the system?", sec: 6 },
  { act: 'yes', text: 'Yes', sec: 9 },
];
const REVEAL_KEY = 'cyfh_reveal2';   // v2: the warning + black "Yes" ending
function revealScript() {
  try { const o = JSON.parse(localStorage.getItem(REVEAL_KEY)); if (o && Array.isArray(o.beats) && o.beats.length) return o.beats; } catch (e) { }
  return REVEAL_DEFAULT.map(b => ({ ...b }));
}
function revealSaveScript(beats) {
  const o = { beats, t: Date.now() };
  try { localStorage.setItem(REVEAL_KEY, JSON.stringify(o)); } catch (e) { }
  if (RV.db) RV.db.doc('reveal/script2').set(o).catch(() => { });
}
const RV = { db: null, skip: false, el: null };
async function revealDbInit() {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  let db = null; try { db = await window.claude.use('db'); } catch (e) { db = null; }
  if (!db) return; RV.db = db;
  try {
    const d = await db.doc('reveal/script2').get(), o = d && d.data ? d.data() : null;
    let mine = null; try { mine = JSON.parse(localStorage.getItem(REVEAL_KEY)); } catch (e) { }
    if (o && o.beats && (!mine || (o.t || 0) > (mine.t || 0))) { try { localStorage.setItem(REVEAL_KEY, JSON.stringify(o)); } catch (e) { } }
    else if (mine && mine.beats && (!o || (o.t || 0) < (mine.t || 0))) db.doc('reveal/script2').set(mine).catch(() => { });
  } catch (e) { }
}

// the last music (audio/sad_past.mp3, "Sad Past" by Silent Partner): starts when Ray's map opens and loops,
// without stopping, through her levels, the 20 memories, the reveal ("Yes") and the last talk.
// While it plays, the projector theme, MusicBox and the desktop hum stay quiet.
const FIN_MUSIC = { el: null, iv: 0, active: false, LEVEL: .2125 };   // volume (was .85, halved twice)
function finaleMusic(on) {
  clearInterval(FIN_MUSIC.iv);
  if (on) {
    try { if (typeof mbStopTrack === 'function' && MB.el) mbStopTrack(); if (typeof MB !== 'undefined' && MB.playing && typeof mbPause === 'function') mbPause(); if (typeof bgmOff === 'function') bgmOff();
      if (AU.ctx && AU.music) AU.music.gain.setTargetAtTime(0, AU.ctx.currentTime, .8); } catch (e) { }
    if (!FIN_MUSIC.el) { FIN_MUSIC.el = new Audio('audio/sad_past.mp3'); FIN_MUSIC.el.preload = 'auto'; FIN_MUSIC.el.loop = true; }
    const el = FIN_MUSIC.el, top = AU.on ? FIN_MUSIC.LEVEL : 0;
    if (FIN_MUSIC.active && !el.paused) { el.volume = Math.max(el.volume, Math.min(top, el.volume)); return; }   // already playing: never restart it
    FIN_MUSIC.active = true; el.volume = 0; el.play().catch(() => { });
    FIN_MUSIC.iv = setInterval(() => { el.volume = Math.min(top, el.volume + .03); if (el.volume >= top) clearInterval(FIN_MUSIC.iv); }, 80);
  } else if (FIN_MUSIC.el) {
    FIN_MUSIC.active = false; const el = FIN_MUSIC.el;
    FIN_MUSIC.iv = setInterval(() => { el.volume = Math.max(0, el.volume - .05); if (el.volume <= 0) { clearInterval(FIN_MUSIC.iv); el.pause(); } }, 60);
    if (AU.ctx && AU.music) AU.music.gain.setTargetAtTime(.15, AU.ctx.currentTime, 1.2);
  }
}
const finaleMusicOn = () => !!(FIN_MUSIC.active && FIN_MUSIC.el && !FIN_MUSIC.el.paused);

// the room, over Ray's shoulder (placeholder painting until the art exists)
const RV_SCR = { x: 668, y: 150, w: 344, h: 258 };     // the CRT's glass, in stage pixels (1280 × 720)
function rvRoom(cv) {
  const x = cv.getContext('2d'), W = 1280, H = 720;
  x.fillStyle = '#120d1a'; x.fillRect(0, 0, W, H);
  const wall = x.createLinearGradient(0, 0, 0, 470); wall.addColorStop(0, '#1d1528'); wall.addColorStop(1, '#2a1f38'); x.fillStyle = wall; x.fillRect(0, 0, W, 470);
  // a window with blinds, far left; a little moonlight
  x.fillStyle = '#2f3550'; x.fillRect(70, 70, 210, 260);
  for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#3d4565' : '#232a42'; x.fillRect(70, 70 + i * 16.25, 210, 9); }
  x.strokeStyle = '#120d1a'; x.lineWidth = 8; x.strokeRect(70, 70, 210, 260);
  x.fillStyle = 'rgba(160,180,255,.05)'; x.beginPath(); x.moveTo(70, 330); x.lineTo(280, 330); x.lineTo(420, 720); x.lineTo(0, 720); x.closePath(); x.fill();
  // screen glow on the wall
  const glow = x.createRadialGradient(840, 280, 20, 840, 300, 520); glow.addColorStop(0, 'rgba(255,170,215,.38)'); glow.addColorStop(1, 'rgba(255,170,215,0)'); x.fillStyle = glow; x.fillRect(0, 0, W, H);
  // desk
  x.fillStyle = '#2b2030'; x.fillRect(300, 470, 980, 26); x.fillStyle = '#1c1520'; x.fillRect(300, 496, 980, 224);
  x.fillStyle = 'rgba(255,170,215,.18)'; x.fillRect(560, 470, 560, 4);
  // CRT: casing, stand
  x.fillStyle = '#4a4250'; x.beginPath(); x.roundRect(RV_SCR.x - 40, RV_SCR.y - 34, RV_SCR.w + 80, RV_SCR.h + 74, 22); x.fill();
  x.fillStyle = '#5c5262'; x.beginPath(); x.roundRect(RV_SCR.x - 30, RV_SCR.y - 24, RV_SCR.w + 60, RV_SCR.h + 50, 16); x.fill();
  x.fillStyle = '#0c0910'; x.beginPath(); x.roundRect(RV_SCR.x - 8, RV_SCR.y - 8, RV_SCR.w + 16, RV_SCR.h + 16, 12); x.fill();
  x.fillStyle = '#3c3542'; x.fillRect(800, 448, 80, 22); x.fillRect(770, 462, 140, 10);
  x.fillStyle = '#ff7ab8'; x.beginPath(); x.arc(RV_SCR.x + RV_SCR.w + 14, RV_SCR.y + RV_SCR.h + 26, 3, 0, 7); x.fill();
  // keyboard, mug, cables down to the floor
  x.fillStyle = '#3a3340'; x.beginPath(); x.roundRect(700, 478, 260, 30, 6); x.fill();
  x.fillStyle = 'rgba(255,200,230,.12)'; for (let i = 0; i < 12; i++) x.fillRect(708 + i * 21, 484, 16, 6);
  x.fillStyle = '#5a4a5e'; x.fillRect(1090, 430, 40, 46); x.strokeStyle = '#5a4a5e'; x.lineWidth = 6; x.beginPath(); x.arc(1132, 452, 12, -1.2, 1.2); x.stroke();
  x.strokeStyle = '#0a070d'; x.lineWidth = 5;
  for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(900 + i * 14, 470); x.bezierCurveTo(940 + i * 10, 600, 560 - i * 30, 640, 380 - i * 22, 720); x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1);
}
// Ray, from behind: long pale hair over a chair back, one hand on the mouse
function rvRay(cv, pose, hand) {
  const x = cv.getContext('2d'), W = 1280, H = 720; x.clearRect(0, 0, W, H);
  const lean = pose === 'back' ? 1 : 0, hx = 610 + (hand ? hand[0] : 0), hy = 512 + (hand ? hand[1] : 0);
  x.save(); x.translate(-24 * lean, -14 * lean); x.rotate(-.03 * lean);
  // chair
  x.fillStyle = '#16111b'; x.beginPath(); x.roundRect(300, 330, 300, 420, 40); x.fill();
  x.fillStyle = '#211a28'; x.beginPath(); x.roundRect(316, 344, 268, 380, 32); x.fill();
  // shoulders and arm
  x.fillStyle = '#d9d2dc'; x.beginPath(); x.roundRect(330, 360, 240, 300, 60); x.fill();
  if (!lean) { x.strokeStyle = '#d9d2dc'; x.lineWidth = 34; x.lineCap = 'round'; x.beginPath(); x.moveTo(548, 410); x.quadraticCurveTo(600, 470, hx, hy); x.stroke();
    x.fillStyle = '#f0e6ea'; x.beginPath(); x.ellipse(hx + 6, hy + 2, 20, 14, .3, 0, 7); x.fill(); x.fillStyle = '#2e2834'; x.beginPath(); x.ellipse(hx + 14, hy + 8, 16, 10, 0, 0, 7); x.fill(); }
  // head and hair
  x.fillStyle = '#cfc7d4'; x.beginPath(); x.ellipse(452, 290, 74, 84, 0, 0, 7); x.fill();
  const hair = x.createLinearGradient(380, 210, 520, 640); hair.addColorStop(0, '#ece6f0'); hair.addColorStop(1, '#bdb2c8');
  x.fillStyle = hair; x.beginPath(); x.moveTo(372, 280); x.bezierCurveTo(372, 180, 532, 180, 532, 280); x.bezierCurveTo(540, 420, 560, 520, 520, 600); x.lineTo(380, 600); x.bezierCurveTo(350, 500, 366, 400, 372, 280); x.fill();
  x.strokeStyle = 'rgba(150,138,165,.45)'; x.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const sx = 392 + i * 16; x.beginPath(); x.moveTo(sx, 250 + (i % 3) * 8); x.bezierCurveTo(sx - 6, 380, sx + 10, 480, sx - 4 + (i % 2) * 8, 596); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.ellipse(430, 232, 40, 16, -.4, 0, 7); x.fill();
  // rim light from the screen
  x.strokeStyle = 'rgba(255,170,215,.55)'; x.lineWidth = 4; x.beginPath(); x.moveTo(528, 250); x.bezierCurveTo(540, 380, 556, 500, 522, 596); x.stroke();
  x.restore();
  x.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1);
}
// a copy of the first-morning window, drawn inside the CRT
function rvSetupHTML() {
  const sw = (k, list) => `<div class="set sws" data-k="${k}">${list.map((h, i) => `<button class="sw" data-v="${i}" style="background:${h[1]}" tabindex="-1"></button>`).join('')}</div>`;
  const pick = k => `<div class="set pick" data-pick="${k}"><button class="btn arr" data-d="-1" tabindex="-1">◀</button><span class="pk" id="rvk-${k}"></span><button class="btn arr" data-d="1" tabindex="-1">▶</button></div>`;
  return `<section class="win rv-win"><div class="titlebar">${icon('soul')}<span class="tt">Choose desired appearance</span><button class="btn tbtn" disabled>_</button></div>
   <div class="win-body" style="overflow:visible"><div class="su">
    <div class="su-prev bevel"><canvas id="rv-av" width="32" height="32"></canvas><div class="nm" id="rv-nm">—</div><button class="btn" id="rv-rand" tabindex="-1">Randomize</button></div>
    <div class="su-opts">
     <div class="su-row"><span>Name</span><div class="set"><input id="rv-name" value="" placeholder="type your name" tabindex="-1" readonly></div></div>
     <div class="su-row"><span>Hair</span>${pick('hair')}</div><div class="su-row"><span>Hair color</span>${sw('hc', PALETTE)}</div>
     <div class="su-row"><span>Eyes</span>${sw('eye', PALETTE)}</div><div class="su-row"><span>Skin</span>${sw('skin', SKIN)}</div>
     <div class="su-row"><span>Outfit</span>${pick('outfit')}</div><div class="su-row"><span>Outfit color</span>${sw('oc', PALETTE)}</div>
     <div class="su-row"><span>Accessory</span>${pick('acc')}</div>
    </div></div>
    <div class="su-foot"><span class="su-sync"></span><div class="su-btns"><button class="btn primary" id="rv-ok" tabindex="-1">Confirm</button></div></div></div></section>`;
}
function rvPlayer() { const p = S.player && S.player.name ? S.player : { name: 'Rookie', hair: 2, hc: 9, eye: 11, skin: 1, outfit: 0, oc: 7, acc: 0 }; return { name: p.name, hair: p.hair | 0, hc: p.hc | 0, eye: p.eye | 0, skin: p.skin | 0, outfit: p.outfit | 0, oc: p.oc | 0, acc: p.acc | 0 }; }

// play the reveal. opts: { from: beat index, beats: a script, preview: true (kit) }
function playReveal(opts = {}) {
  return new Promise(async res => {
    const beats = opts.beats || revealScript(), from = clamp(opts.from || 0, 0, beats.length - 1);
    const el = document.createElement('div'); el.id = 'reveal'; RV.el = el; RV.skip = false;
    el.innerHTML = `<div class="rv-frame"><div class="rv-cam"><canvas class="rv-room" width="1280" height="720"></canvas>
        <div class="rv-scr" style="left:${RV_SCR.x}px;top:${RV_SCR.y}px;width:${RV_SCR.w}px;height:${RV_SCR.h}px"><div class="rv-guest"><div class="rv-desk"></div><div class="rv-cur"></div></div><div class="rv-glass"></div></div>
        <canvas class="rv-ray" width="1280" height="720"></canvas></div>
      <div class="rv-dark"></div><div class="rv-white"></div><div class="rv-yes"></div><div class="rv-np">♪ Sad Past — Silent Partner</div><div class="rv-title"></div><div class="rv-cap" aria-live="polite"></div>
      <div class="rv-hint">${opts.preview ? '<span class="rv-bn"></span> · Esc: stop the preview' : ''}</div></div>`;
    document.body.appendChild(el);
    const frame = $('.rv-frame', el), cam = $('.rv-cam', el), guest = $('.rv-guest', el), desk = $('.rv-desk', el), cur = $('.rv-cur', el);
    const yes = $('.rv-yes', el), np = $('.rv-np', el), ray = $('.rv-ray', el), dark = $('.rv-dark', el), white = $('.rv-white', el), cap = $('.rv-cap', el), title = $('.rv-title', el);
    rvRoom($('.rv-room', el)); rvRay(ray, 'sit');
    const P = { name: '', hair: 0, hc: 0, eye: 11, skin: 1, outfit: 0, oc: 7, acc: 0 }, ME = rvPlayer();
    let ended = false, hand = [0, 0];
    const fit = () => { const s = frame.clientWidth / 1280; frame.style.setProperty('--fit', s); return s; };
    let camAt = [640, 360, 1];
    const setCam = (cx, cy, z, sec) => {
      camAt = [cx, cy, z]; const s = fit();
      const ox = clamp(cx - 640 / z, 0, 1280 - 1280 / z), oy = clamp(cy - 360 / z, 0, 720 - 720 / z);
      cam.style.transition = RV.skip || !sec ? 'none' : `transform ${sec}s cubic-bezier(.45,.05,.3,1)`;
      cam.style.transform = `scale(${s * z}) translate(${-ox}px,${-oy}px)`;
    };
    const onResize = () => setCam(...camAt, 0); window.addEventListener('resize', onResize);
    setCam(640, 360, 1, 0);
    const W = ms => new Promise(r => { if (RV.skip || ended) return r(); const t0 = performance.now(); const iv = setInterval(() => { if (RV.skip || ended || performance.now() - t0 >= ms) { clearInterval(iv); r(); } }, 30); });
    const paint = () => { const cv = $('#rv-av', desk); if (cv) drawAvatar(cv, P, false); const nm = $('#rv-nm', desk); if (nm) nm.textContent = P.name || '—';
      ['hair', 'outfit', 'acc'].forEach(k => { const s = $('#rvk-' + k, desk); if (s) s.textContent = `Type ${P[k] + 1}`; });
      $$('.set[data-k]', desk).forEach(s => $$('[data-v]', s).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === P[s.dataset.k])))); };
    const showSetup = () => { if (!$('.rv-win', desk)) { desk.className = 'rv-desk os'; desk.innerHTML = rvSetupHTML(); } paint(); };
    // the cursor lives in guest pixels (800 × 600)
    let cxy = [400, 300]; cur.style.transform = `translate(${cxy[0]}px,${cxy[1]}px)`;
    const posOf = node => { const g = guest.getBoundingClientRect(), r = node.getBoundingClientRect(), k = g.width / 800; return [(r.left + r.width / 2 - g.left) / k, (r.top + r.height / 2 - g.top) / k]; };
    const moveTo = async (node, ms = 520) => {
      if (!node) return; const [x, y] = posOf(node);
      if (Math.abs(x - cxy[0]) + Math.abs(y - cxy[1]) < 4) ms = 60;   // already there: just click again
      hand = [clamp((x - 400) / 40, -8, 8), clamp((y - 300) / 40, -6, 6)]; rvRay(ray, 'sit', hand);
      cur.style.transition = RV.skip ? 'none' : `transform ${ms}ms cubic-bezier(.5,.1,.3,1)`; cur.style.transform = `translate(${x}px,${y}px)`; cxy = [x, y];
      await W(ms + 40);
    };
    const click = async node => { await moveTo(node); node.classList.add('rv-press'); if (!RV.skip) SFX.click(); await W(140); node.classList.remove('rv-press'); };
    const ACT = {
      black: async () => { dark.style.transition = 'none'; dark.style.opacity = 1; },
      wide: async () => { desk.className = 'rv-desk os'; if (!desk.innerHTML) desk.innerHTML = '<div class="rv-os-hint">DIVE OS</div>'; setCam(640, 360, 1, 0); dark.style.transition = RV.skip ? 'none' : 'opacity 2.4s ease'; dark.style.opacity = 0; await W(2400); },
      push: async () => { dark.style.opacity = 0; setCam(760, 330, 1.7, 3.6); await W(3600); },
      screen: async () => { dark.style.opacity = 0; showSetup(); setCam(RV_SCR.x + RV_SCR.w / 2, RV_SCR.y + RV_SCR.h / 2, 720 / (RV_SCR.h + 20), 2.6); await W(2600); },
      random: async () => { showSetup(); setCam(RV_SCR.x + RV_SCR.w / 2, RV_SCR.y + RV_SCR.h / 2, 720 / (RV_SCR.h + 20), 0);
        const r = n => Math.random() * n | 0;
        for (let i = 0; i < 4; i++) { await click($('#rv-rand', desk)); Object.assign(P, { hair: r(HAIRS.length), hc: r(PALETTE.length), eye: r(PALETTE.length), skin: r(SKIN.length), outfit: r(OUTFITS.length), oc: r(PALETTE.length), acc: r(ACCS.length) }); paint(); if (!RV.skip) SFX.pop(); await W(420); } },
      pick: async () => { showSetup();
        for (const k of ['hair', 'hc', 'eye', 'skin', 'outfit', 'oc', 'acc']) {
          if (['hair', 'outfit', 'acc'].includes(k)) { const n = k === 'hair' ? HAIRS.length : k === 'outfit' ? OUTFITS.length : ACCS.length; let guard = 0;
            const fwd = (ME[k] - P[k] + n) % n, d = fwd <= n - fwd ? 1 : -1;   // the short way round
            while (P[k] !== ME[k] && guard++ < n) { await click($(`[data-pick="${k}"] [data-d="${d}"]`, desk)); P[k] = (P[k] + d + n) % n; paint(); }
          } else { await click($(`.set[data-k="${k}"] [data-v="${ME[k]}"]`, desk)); P[k] = ME[k]; paint(); }
          if (!RV.skip) SFX.pop(); await W(160);
        } Object.assign(P, { ...ME, name: P.name }); paint(); },
      name: async () => { showSetup(); Object.assign(P, { ...ME, name: P.name }); const inp = $('#rv-name', desk); await click(inp); inp.classList.add('focus');
        for (let i = 1; i <= ME.name.length; i++) { P.name = ME.name.slice(0, i); inp.value = P.name; paint(); if (!RV.skip) SFX.tick(); await W(170); } inp.classList.remove('focus'); },
      confirm: async () => { showSetup(); Object.assign(P, ME); $('#rv-name', desk).value = ME.name; paint(); await click($('#rv-ok', desk)); },
      warn: async (b) => { showSetup(); Object.assign(P, ME); $('#rv-name', desk).value = ME.name; paint();
        let m = $('.su-modal', desk); if (!m) { m = document.createElement('div'); m.className = 'su-modal'; $('.rv-win', desk).appendChild(m); }
        m.innerHTML = `<div class="card bevel rv-warn"><b>⚠ DIVE · Avatar</b><p>${esc(b.text || '')}</p><div class="row"><button class="btn">No</button><button class="btn primary" id="rv-yes">Yes</button></div></div>`;
        if (!RV.skip) SFX.buzz(); await W(Math.max(1200, (+b.sec || 0) * 1000 - 1400)); await click($('#rv-yes', m)); },
      yes: async (b) => { dark.style.transition = 'none'; dark.style.opacity = 1; cur.style.opacity = 0; yes.textContent = '"' + String(b.text || 'Yes').replace(/^["“”']+|["“”']+$/g, '') + '"'; yes.classList.add('on');   // always in quotes, in the middle of the screen

        if (!RV.skip || opts.music) { finaleMusic(true); np.classList.add('on'); } },
      override: async () => { showSetup(); Object.assign(P, ME); paint(); let m = $('.su-modal', desk); if (!m) { m = document.createElement('div'); m.className = 'su-modal'; $('.rv-win', desk).appendChild(m); }
        m.innerHTML = `<div class="card bevel load"><p id="rv-ld">Creating avatar…</p><div class="ldbar"><i id="rv-bar"></i></div></div>`;
        const bar = $('#rv-bar', m), t = $('#rv-ld', m);
        for (let i = 0; i <= 100; i += 4) { bar.style.width = i + '%'; await W(45); }
        t.textContent = 'Overriding memor…'; bar.style.width = '0%';
        for (let i = 0; i <= 36; i += 4) { bar.style.width = i + '%'; await W(70); }
        if (!RV.skip) { SFX.glitch(.6); el.classList.add('rv-glitch'); await W(500); el.classList.remove('rv-glitch'); } },
      pull: async () => { cur.style.opacity = 0; desk.className = 'rv-desk off'; desk.innerHTML = ''; rvRay(ray, 'back'); setCam(640, 360, 1, 4); await W(4000); },
      desktop: async () => { cur.style.opacity = 0; desk.className = 'rv-desk os'; desk.innerHTML = `<div class="rv-lock"><canvas width="32" height="32"></canvas><b>Welcome back</b><small>${esc(ME.name)}</small></div>`; drawAvatar($('.rv-lock canvas', desk), ME, false); rvRay(ray, 'back'); setCam(640, 360, 1, 0); },
      hold: async () => { },
      white: async () => { white.style.transition = RV.skip ? 'none' : 'opacity 1.8s ease'; white.style.opacity = 1; await W(1800); },
    };
    const stop = () => { if (ended) return; ended = true; if (opts.preview && !opts.keepMusic) finaleMusic(false); document.removeEventListener('keydown', key); window.removeEventListener('resize', onResize); if (opts.flash) { SFX.glitch(.5); white.style.transition = 'opacity .18s ease-in'; white.style.opacity = 1; setTimeout(() => { el.remove(); res(); }, 260); return; }   // a hard white flash into the last desktop
      el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 500); };
    // it can't be skipped: no click or key moves it on (in the Designer kit, Esc stops a preview)
    const key = e => { if (e.key === 'Escape' && opts.preview) stop(); };
    document.addEventListener('keydown', key);
    // fast-forward to the chosen beat: earlier beats run instantly and silently
    if (from > 0) { RV.skip = true; for (let i = 0; i < from; i++) { const a = ACT[beats[i].act]; if (a) await a(beats[i]); } RV.skip = false; white.style.opacity = 0; }
    for (let i = from; i < beats.length && !ended; i++) {
      const b = beats[i], t0 = performance.now(); RV.skip = false;
      const bn = $('.rv-bn', el); if (bn) bn.textContent = `beat ${i + 1}/${beats.length} · ${b.act}`;
      const isTitle = b.act === 'black', own = b.act === 'warn' || b.act === 'yes';   // these show their text themselves
      title.textContent = isTitle ? b.text || '' : ''; title.classList.toggle('on', isTitle && !!b.text);
      cap.textContent = ''; cap.classList.toggle('on', !isTitle && !own && !!b.text);
      if (b.act !== 'black' && b.act !== 'wide' && b.act !== 'yes' && b.act !== 'white' && +getComputedStyle(dark).opacity > .5) { dark.style.transition = 'opacity .8s ease'; dark.style.opacity = 0; }
      if (b.act !== 'yes') yes.classList.remove('on');
      const act = (ACT[b.act] || ACT.hold)(b);
      if (!isTitle && !own && b.text) await typeInto(cap, b.text);
      await act;
      const left = (+b.sec || 0) * 1000 - (performance.now() - t0); if (left > 0) await W(left);
    }
    stop();
  });
}

/* ---------------- 3. the last desktop ----------------
   After "Yes": a white flash, and the desktop is empty but for one file, "thank you.txt" (the last page of
   Ray's journal, to the doctor), and a Recycle Bin in the corner. Dragging the file into the bin ends it:
   everything goes white, and Ori wakes up (memory_21). */
const THANK_YOU = `doctor,

this is the last page. it's for you, not about anyone.

in here it felt like fourteen days. it wasn't. in here is only a dream.
out there it was probably a few hours, while you sat by the bed.
and before that, all the days you came to see me in that room.
it was the first time anyone looked after me. not after ori. not after the girls. me.
you asked me what my dream was. nobody had ever asked me that.

thank you for every night you stayed. for the chair. for the dental plan joke.
i laughed. i never told you.

i'm sorry it had to be you who finished this.
i'm sorry i made you forget.

if i ever get to exist again, even for a little while,
i'm going to travel. everywhere. every place i only ever saw on a screen.
the sea first. it's only 19.3 km.

goodbye, doctor.
take care of her.

— ray`;
function finalDesk(opts = {}) {
  return new Promise(res => {
    Object.keys(WINS).forEach(id => { try { closeWin(id); } catch (e) { } }); if (PIX.on) pixieOff();
    const dk = $('#desktop'), bg = dk ? getComputedStyle(dk) : null;
    const el = document.createElement('div'); el.id = 'fdesk';
    if (bg) { el.style.backgroundColor = bg.backgroundColor; el.style.backgroundImage = bg.backgroundImage; el.style.backgroundSize = bg.backgroundSize; }
    el.innerHTML = `<button class="fd-file" id="fd-file" aria-label="thank you.txt"><span class="fd-ic">${icon('doc')}</span><span class="fd-lb">thank you.txt</span></button>
      <div class="fd-bin" id="fd-bin" aria-label="Recycle Bin"><span class="fd-ic">${icon('trash')}</span><span class="fd-lb">Recycle Bin</span></div>
      <div class="fd-note" id="fd-note" hidden><div class="titlebar">${icon('doc')}<span class="tt">thank you.txt — Notepad</span><button class="btn tbtn" id="fd-x">×</button></div><pre>${esc(THANK_YOU)}</pre></div>
      <div class="fd-white on"></div>${opts.preview ? '<div class="fd-esc">Esc: stop the preview</div>' : ''}`;
    document.body.appendChild(el); SFX.glitch(.4);
    const white = $('.fd-white', el), file = $('#fd-file', el), bin = $('#fd-bin', el), note = $('#fd-note', el);
    setTimeout(() => white.classList.remove('on'), 120);   // the flash fades, leaving the empty desktop
    const W = el.clientWidth, H = el.clientHeight; let fx = W / 2 - 45, fy = H / 2 - 60; const place = () => { file.style.left = fx + 'px'; file.style.top = fy + 'px'; }; place();
    let down = null, done = false;
    file.addEventListener('pointerdown', e => { e.preventDefault(); file.setPointerCapture(e.pointerId); down = { x: e.clientX, y: e.clientY, ox: fx, oy: fy, drag: false }; });
    file.addEventListener('pointermove', e => { if (!down || done) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.drag && Math.hypot(dx, dy) > 5) { down.drag = true; file.classList.add('drag'); }
      if (down.drag) { fx = down.ox + dx; fy = down.oy + dy; place(); const r = bin.getBoundingClientRect(); bin.classList.toggle('hot', e.clientX > r.left - 10 && e.clientX < r.right + 10 && e.clientY > r.top - 10 && e.clientY < r.bottom + 10); } });
    file.addEventListener('pointerup', e => { if (!down || done) return; const d = down; down = null; file.classList.remove('drag');
      if (!d.drag) { SFX.click(); note.hidden = false; return; }
      if (bin.classList.contains('hot')) finish(); });
    $('#fd-x', el).onclick = () => { SFX.click(); note.hidden = true; };
    const stop = () => { document.removeEventListener('keydown', key); el.remove(); res(); };
    const key = e => { if (e.key === 'Escape' && opts.preview) stop(); };
    document.addEventListener('keydown', key);
    async function finish() {
      done = true; note.hidden = true; bin.classList.remove('hot'); bin.classList.add('full'); file.classList.add('gone'); SFX.pop(); glitch('soft');
      await wait(1400); white.classList.add('slow', 'on'); await wait(3200);
      document.removeEventListener('keydown', key); el.remove(); res();
    }
  });
}
// the one ending: the last desktop, then Ori wakes up, then the end card
async function lastScenes(opts = {}) {
  await finalDesk(opts);
  const wh = document.createElement('div'); wh.className = 'fd-hold'; document.body.appendChild(wh);   // stay white until the memory is up
  setTimeout(() => wh.remove(), 900);
  await playMemory(21);
}

/* ---------------- Designer kit ▸ Finale ---------------- */
function kitFinale(el) {
  const beats = KIT.rv || (KIT.rv = revealScript()), saved = JSON.stringify(beats) === JSON.stringify(revealScript());
  const total = beats.reduce((a, b) => a + (+b.sec || 0), 0);
  el.innerHTML = `<p class="kit-p">The last cutscene, after the last level behind Ray's wall (20 memories). Each beat shows a caption and does one thing on screen; it stays up at least its seconds (longer if the action takes longer). Edits are saved in this browser${RV.db ? ' and in the artifact\'s shared data (Claude can read them)' : ''}.</p>
    <div class="kit-row"><button class="btn primary" id="fx-play">▶ Play the reveal</button><button class="btn" id="fx-full">▶ Play the whole ending (reveal → last desktop → Ori wakes → end card)</button><button class="btn" id="fx-desk">▶ Last desktop + Ori wakes</button>
      <button class="btn" id="fx-mus">${finaleMusicOn() ? '■ Stop the music' : '♪ Play the music'}</button><button class="btn" id="fx-vm">Open DiveVM (sample)</button><button class="btn" id="fx-map">Ray's map</button></div>
    <div class="kit-row"><b>${beats.length} beats · about ${Math.round(total)} s</b><span class="sp" style="flex:1"></span><span class="fx-msg" id="fx-msg">${saved ? '' : 'unsaved changes'}</span>
      <button class="btn primary" id="fx-save"${saved ? ' disabled' : ''}>Save</button><button class="btn" id="fx-copy">Copy script</button><button class="btn" id="fx-reset">Reset to default</button></div>
    <ol class="fx-list">${beats.map((b, i) => `<li class="fx-beat bevel"><span class="fx-n">${i + 1}</span>
      <select data-i="${i}" data-f="act" title="${esc(REVEAL_ACTS[b.act] || '')}">${Object.keys(REVEAL_ACTS).map(a => `<option value="${a}"${a === b.act ? ' selected' : ''}>${a}</option>`).join('')}</select>
      <textarea data-i="${i}" data-f="text" rows="1" placeholder="(no caption)">${esc(b.text || '')}</textarea>
      <label class="fx-sec"><input type="number" min="0" max="30" step="0.5" data-i="${i}" data-f="sec" value="${+b.sec || 0}"> s</label>
      <span class="fx-tools"><button class="btn" data-from="${i}" title="play from this beat">▶</button><button class="btn" data-up="${i}" title="move up"${i ? '' : ' disabled'}>↑</button><button class="btn" data-dn="${i}" title="move down"${i < beats.length - 1 ? '' : ' disabled'}>↓</button><button class="btn" data-add="${i}" title="add a beat after this one">＋</button><button class="btn" data-del="${i}" title="delete"${beats.length > 1 ? '' : ' disabled'}>✕</button></span>
      <small class="fx-what">${esc(REVEAL_ACTS[b.act] || '')}</small></li>`).join('')}</ol>`;
  const dirty = () => { const s = $('#fx-save', el); s.disabled = false; $('#fx-msg', el).textContent = 'unsaved changes'; };
  const re = () => kitFinale(el);
  $$('[data-f]', el).forEach(x => {
    const ev = x.tagName === 'SELECT' ? 'change' : 'input';
    x.addEventListener(ev, () => { const b = beats[+x.dataset.i], f = x.dataset.f; b[f] = f === 'sec' ? Math.max(0, +x.value || 0) : x.value; if (f === 'act') re(); else dirty();
      if (x.tagName === 'TEXTAREA') { x.style.height = 'auto'; x.style.height = x.scrollHeight + 'px'; } });
  });
  $$('textarea[data-f]', el).forEach(x => { x.style.height = 'auto'; x.style.height = x.scrollHeight + 'px'; });
  $$('[data-up]', el).forEach(x => x.onclick = () => { const i = +x.dataset.up; [beats[i - 1], beats[i]] = [beats[i], beats[i - 1]]; re(); });
  $$('[data-dn]', el).forEach(x => x.onclick = () => { const i = +x.dataset.dn; [beats[i + 1], beats[i]] = [beats[i], beats[i + 1]]; re(); });
  $$('[data-add]', el).forEach(x => x.onclick = () => { beats.splice(+x.dataset.add + 1, 0, { act: 'hold', text: '', sec: 2 }); re(); });
  $$('[data-del]', el).forEach(x => x.onclick = () => { beats.splice(+x.dataset.del, 1); re(); });
  $$('[data-from]', el).forEach(x => x.onclick = () => { SFX.click(); kitSample(); playReveal({ beats, from: +x.dataset.from, preview: true }); });
  $('#fx-play', el).onclick = () => { SFX.click(); kitSample(); playReveal({ beats, preview: true }); };
  $('#fx-mus', el).onclick = () => { SFX.click(); finaleMusic(!finaleMusicOn()); setTimeout(re, 300); };
  $('#fx-full', el).onclick = async () => { SFX.click(); kitSample(); await playReveal({ beats, preview: true, keepMusic: true, flash: true }); await lastScenes({ preview: true }); endGame('reckoning'); };
  $('#fx-desk', el).onclick = async () => { SFX.click(); kitSample(); await lastScenes({ preview: true }); };
  $('#fx-vm', el).onclick = () => { SFX.click(); kitSample(); PLAYABLE.forEach(g => { delete S.flags['del_' + g]; }); VM.booted = false; VM.sel = null; VM.confirm = null; closeWin('vm'); openVM(); };
  $('#fx-map', el).onclick = () => { KIT.tab = 'boss'; const b = $('#kit-body'); if (b) kitBoss(b); $$('.kit-tab').forEach(t => t.classList.toggle('on', t.dataset.k === 'boss')); };
  $('#fx-save', el).onclick = () => { revealSaveScript(JSON.parse(JSON.stringify(beats))); re(); $('#fx-msg', el).textContent = 'saved ♡'; };
  $('#fx-reset', el).onclick = () => { KIT.rv = REVEAL_DEFAULT.map(b => ({ ...b })); re(); dirty(); };
  $('#fx-copy', el).onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(beats, null, 1)); $('#fx-msg', el).textContent = 'copied: paste it to Claude to make it the default'; } catch (e) { $('#fx-msg', el).textContent = 'copy blocked here'; } };
}
