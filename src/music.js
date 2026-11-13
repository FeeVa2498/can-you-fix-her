/* =========================================================
   SOUND OF THE MACHINE · until MusicBox.exe is installed there is no music at all, only an old PC:
   CRT whine and hum, the fan, the hard disk seeking now and then.
   MusicBox.exe (Prim's layer-1 gift): a compact Y2K media-player skin. Two modes:
   Playlist (you pick) and Vibe (it picks a track for what's happening on screen).
   Tracks are composed live with WebAudio, plus the projector theme (audio/projector_bgm.mp3).
   ========================================================= */
const PC = { on: false };
function pcAmbience() {
  if (PC.on || !AU.ctx) return; PC.on = true;
  const ctx = AU.ctx, out = ctx.createGain(); out.gain.value = .5; out.connect(AU.master); PC.out = out;
  // fan: low filtered noise
  const len = ctx.sampleRate * 3, nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
  let b = 0; for (let i = 0; i < len; i++) { b = (b + (Math.random() * 2 - 1) * .02) * .995; d[i] = b; }
  const fan = ctx.createBufferSource(); fan.buffer = nb; fan.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 380; const fg = ctx.createGain(); fg.gain.value = .9;
  fan.connect(fl); fl.connect(fg); fg.connect(out); fan.start();
  // mains hum and the CRT's high whine
  const hum = ctx.createOscillator(); hum.frequency.value = 50; const hg = ctx.createGain(); hg.gain.value = .006; hum.connect(hg); hg.connect(out); hum.start();
  const wh = ctx.createOscillator(); wh.frequency.value = 15734 / 2; const wg = ctx.createGain(); wg.gain.value = .0012; wh.connect(wg); wg.connect(out); wh.start();
  // the hard disk: little bursts of seek clicks
  const seek = () => {
    if (!AU.ctx) return; const t = ctx.currentTime + .05, n = 3 + (Math.random() * 9 | 0);
    for (let i = 0; i < n; i++) noiseHit(t + i * (.03 + Math.random() * .05), .012, 2400 + Math.random() * 2000, .05 + Math.random() * .05, out);
    PC.seekT = setTimeout(seek, 2500 + Math.random() * 9000);
  };
  PC.seekT = setTimeout(seek, 1500);
}
// a burst of disk activity (opening a window, installing)
function pcBusy(n = 14) { if (!AU.ctx || !PC.out) return; const t = AU.ctx.currentTime; for (let i = 0; i < n; i++) noiseHit(t + i * .045 + Math.random() * .02, .012, 2800, .07, PC.out); }

/* ---------------- tracks ---------------- */
const mt = m => 440 * Math.pow(2, (m - 69) / 12);
function mbNote(f, t, dur, vol, type = 'triangle', o = {}) {
  const ctx = AU.ctx, os = ctx.createOscillator(), g = ctx.createGain(); os.type = type; os.frequency.value = f; if (o.det) os.detune.value = o.det;
  const a = o.a || .01, rl = o.r || dur * .6;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.setTargetAtTime(0, t + Math.max(a, dur - rl), rl / 3);
  os.connect(g); g.connect(MB.bus); os.start(t); os.stop(t + dur + 1);
}
function mbHat(t, vol = .02, hp = 7000, dur = .03) { noiseHit(t, dur, hp, vol, MB.bus); }
function mbKick(t, vol = .25) { const ctx = AU.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .18); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g); g.connect(MB.bus); o.start(t); o.stop(t + .35); }
const TRACKS = [
  { id: 'lull', title: 'Desktop Lull', by: 'DIVE OS', bpm: 72, vibe: 'desktop',
    bar(t, k, B) { const ch = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]][k % 4];
      ch.forEach((m, i) => mbNote(mt(m), t + i * .03, B, .045, 'triangle', { a: .4, r: 1.2, det: (Math.random() - .5) * 8 }));
      mbNote(mt(ch[0] - 24), t, B * .9, .09, 'sine', { a: .05 });
      [0, 3, 5, 6].forEach(s => { if (Math.random() < .7) mbNote(mt(ch[(s + k) % 4] + 12), t + s * B / 8, .6, .03, 'sine', { r: .5 }); }); } },
  { id: 'lane', title: 'Memory Lane', by: 'DIVE OS', bpm: 104, vibe: 'map',
    bar(t, k, B) { const ch = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]][k % 4], s = B / 8;
      for (let i = 0; i < 8; i++) { mbNote(mt(ch[i % 3] + 12), t + i * s, s * .9, .028, 'square', { r: .05 }); if (i % 2 === 0) mbHat(t + i * s, .012); }
      mbNote(mt(ch[0] - 12), t, s * 3, .07, 'square', { r: .1 }); mbNote(mt(ch[0] - 12), t + 4 * s, s * 3, .06, 'square', { r: .1 });
      if (k % 2) mbNote(mt(ch[2] + 24), t + 6 * s, s * 2, .02, 'triangle'); } },
  { id: 'projector', title: 'Projector Dream', by: 'DIVE·PROJ', file: 'audio/projector_bgm.mp3', vibe: 'level' },
  { id: 'night', title: 'Night Messages', by: 'DIVE OS', bpm: 64, vibe: 'night',
    bar(t, k, B) { const ch = [[62, 65, 69, 72, 76], [55, 59, 62, 65, 69], [60, 64, 67, 71, 74], [57, 60, 64, 67, 71]][k % 4], s = B / 8;
      ch.forEach((m, i) => { mbNote(mt(m), t + i * .04, B * .7, .03, 'sine', { a: .02, r: 1.4 }); mbNote(mt(m) * 2.005, t + i * .04, .4, .006, 'sine'); });
      mbNote(mt(ch[0] - 24), t, s * 3, .1, 'sine'); mbNote(mt(ch[0] - 24), t + s * 5, s * 2, .07, 'sine');
      [2, 6].forEach(i => mbHat(t + i * s, .015, 3500, .08)); if (Math.random() < .6) mbNote(mt(ch[4] + 12), t + s * 5.5, .5, .02, 'triangle'); } },
  { id: 'holiday', title: 'Boss on Holiday', by: 'r.admin', bpm: 120, vibe: 'boss',
    bar(t, k, B) { const ch = [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 61, 64, 67]][k % 4], s = B / 8;
      [0, 3, 6].forEach(i => ch.slice(1).forEach(m => mbNote(mt(m), t + i * s, s * .8, .022, 'triangle', { r: .08 })));
      mbNote(mt(ch[0] - 12), t, s * 2.5, .08, 'triangle'); mbNote(mt(ch[0] - 5), t + s * 3, s * 1.5, .06, 'triangle'); mbNote(mt(ch[0] - 12), t + s * 4, s * 2, .07, 'triangle');
      for (let i = 0; i < 8; i++) mbHat(t + i * s, i % 2 ? .008 : .014, 6000); } },
  { id: 'overclock', title: 'Overclock', by: 'DIVE OS', bpm: 136, vibe: 'tired',
    bar(t, k, B) { const ch = [[57, 60, 64, 69], [56, 59, 62, 68], [53, 57, 60, 65], [52, 56, 59, 64]][k % 4], s = B / 16;
      for (let i = 0; i < 16; i++) mbNote(mt(ch[i % 4] + 12), t + i * s, s * .8, .022, 'square', { r: .03 });
      [0, 4, 8, 12].forEach(i => mbKick(t + i * s, .18)); [2, 6, 10, 14].forEach(i => mbHat(t + i * s, .02));
      mbNote(mt(ch[0] - 24), t, B, .06, 'sawtooth', { a: .02 }); } },
];
/* ---------------- the player ---------------- */
const MB = { cur: null, playing: false, vibe: true, vol: .7, bus: null, an: null, timer: 0, bar: 0, next: 0, el: null, ctxT: null };
const mbInstalled = () => S.apps && S.apps.includes('MusicBox.exe');
function mbInit() {
  if (MB.bus || !AU.ctx) return;
  MB.bus = AU.ctx.createGain(); MB.bus.gain.value = 0; MB.an = AU.ctx.createAnalyser(); MB.an.fftSize = 64;
  MB.bus.connect(MB.an); MB.bus.connect(AU.master);
  if (S.music) Object.assign(MB, { vibe: S.music.vibe !== false, vol: S.music.vol ?? .7 });
}
function mbStopTrack() {
  clearInterval(MB.timer); MB.timer = 0;
  if (MB.el) { const el = MB.el; MB.el = null; let v = el.volume; const iv = setInterval(() => { v -= .05; if (v <= 0) { clearInterval(iv); el.pause(); } else el.volume = v; }, 40); }
  if (MB.bus) MB.bus.gain.setTargetAtTime(0, AU.ctx.currentTime, .25);
}
function mbPlay(id) {
  auInit(); mbInit(); if (!AU.ctx) return;
  const T = TRACKS.find(t => t.id === id) || TRACKS[0];
  if (MB.cur === T.id && MB.playing) return;
  mbStopTrack();
  MB.cur = T.id; MB.playing = true; MB.bar = 0;
  const ctx = AU.ctx;
  if (T.file) {
    const el = new Audio(T.file); el.loop = true; el.volume = 0; MB.el = el; el.play().catch(() => { });
    let v = 0; const iv = setInterval(() => { if (MB.el !== el) { clearInterval(iv); return; } v = Math.min(MB.vol * .55 * (AU.on ? 1 : 0), v + .03); el.volume = v; if (v >= MB.vol * .55) clearInterval(iv); }, 60);
  } else {
    setTimeout(() => { if (MB.cur === T.id && MB.playing) MB.bus.gain.setTargetAtTime(MB.vol * .9, ctx.currentTime, .4); }, 300);
    const B = 60 / T.bpm * 4; MB.next = ctx.currentTime + .1;
    const sched = () => { while (MB.next < ctx.currentTime + 1.2) { try { T.bar(MB.next, MB.bar, B); } catch (e) { } MB.bar++; MB.next += B; } };
    sched(); MB.timer = setInterval(sched, 300);
  }
  if (PC.out) PC.out.gain.setTargetAtTime(.25, ctx.currentTime, .5);
  mbRender();
}
function mbPause() { MB.playing = false; mbStopTrack(); if (PC.out && AU.ctx) PC.out.gain.setTargetAtTime(.5, AU.ctx.currentTime, .5); mbRender(); }
function mbStep(d) { const i = TRACKS.findIndex(t => t.id === MB.cur), n = TRACKS[(i + d + TRACKS.length) % TRACKS.length]; MB.vibe = false; mbSave(); MB.playing = false; mbPlay(n.id); }
function mbSave() { S.music = { vibe: MB.vibe, vol: MB.vol }; }
// Vibe mode: what's on screen right now
function mbContext() {
  if (S.phase === 'night') return 'night';
  if (S.session) { if (typeof PJ_STORY !== 'undefined' && PJ_STORY) return 'level'; if (staminaPct() <= 15) return 'tired'; return 'map'; }
  if (S.active && S.active.ch === 'boss') return 'boss';
  return 'desktop';
}
setInterval(() => {
  if (!mbInstalled() || !MB.vibe || !MB.playing) return;
  const want = TRACKS.find(t => t.vibe === mbContext()); if (want && want.id !== MB.cur) { MB.playing = false; mbPlay(want.id); }
}, 1200);
function mbSetVol(v) { MB.vol = v; mbSave(); if (MB.el) MB.el.volume = v * .55 * (AU.on ? 1 : 0); else if (MB.bus && MB.playing) MB.bus.gain.setTargetAtTime(v * .9, AU.ctx.currentTime, .1); }

/* ---------------- MusicBox.exe: compact skin ---------------- */
function openMusicBox() {
  S.used = S.used || {}; S.used['MusicBox.exe'] = true;
  auInit(); mbInit(); pcBusy(6);
  openWin('music', { title: 'MusicBox.exe', icon: 'note', w: 360, h: 196, x: 40, y: 380, skin: true, render: (b, rec) => {
    b.innerHTML = `<div class="mbx">
      <div class="mbx-face">
        <div class="mbx-lcd"><div class="mbx-mq"><span id="mb-title"></span></div><div class="mbx-row"><span id="mb-mode"></span><span id="mb-time">00:00</span></div><canvas id="mb-vis" width="150" height="34"></canvas></div>
        <div class="mbx-orb" aria-hidden="true"><i></i></div>
      </div>
      <div class="mbx-ctl">
        <button class="mbb" id="mb-prev" aria-label="Previous track">⏮</button><button class="mbb big" id="mb-play" aria-label="Play or pause">▶</button><button class="mbb" id="mb-next" aria-label="Next track">⏭</button>
        <button class="mbb pill" id="mb-vibe" aria-pressed="false" title="Vibe mode: MusicBox picks the track for what's happening">VIBE</button>
        <label class="mbx-vol" title="Volume"><span aria-hidden="true">◢</span><input type="range" id="mb-vol" min="0" max="1" step=".05" aria-label="Volume"></label>
      </div>
      <select id="mb-list" class="mbx-list" aria-label="Playlist">${TRACKS.map(t => `<option value="${t.id}">${esc(t.title)} — ${esc(t.by)}</option>`).join('')}</select>
    </div>`;
    $('#mb-play', b).onclick = () => { SFX.click(); if (MB.playing) mbPause(); else mbPlay(MB.vibe ? (TRACKS.find(t => t.vibe === mbContext()) || TRACKS[0]).id : (MB.cur || 'lull')); };
    $('#mb-prev', b).onclick = () => { SFX.click(); mbStep(-1); };
    $('#mb-next', b).onclick = () => { SFX.click(); mbStep(1); };
    $('#mb-vibe', b).onclick = () => { SFX.click(); MB.vibe = !MB.vibe; mbSave(); if (MB.vibe && !MB.playing) mbPlay((TRACKS.find(t => t.vibe === mbContext()) || TRACKS[0]).id); mbRender(); };
    $('#mb-vol', b).value = MB.vol; $('#mb-vol', b).oninput = e => mbSetVol(+e.target.value);
    $('#mb-list', b).onchange = e => { MB.vibe = false; mbSave(); MB.playing = false; mbPlay(e.target.value); };
    mbRender(); mbVis();
  } });
}
function mbRender() {
  const t = $('#mb-title'); if (!t) return;
  const T = TRACKS.find(x => x.id === MB.cur);
  t.textContent = T ? `${T.title} · ${T.by}   ✧   ` : 'MusicBox · no track   ✧   ';
  $('#mb-mode').textContent = MB.vibe ? `VIBE · ${({ desktop: 'desktop', map: 'her map', level: 'a memory', night: 'night', boss: 'boss', tired: 'running low' })[mbContext()]}` : 'PLAYLIST';
  $('#mb-play').textContent = MB.playing ? '❚❚' : '▶';
  $('#mb-vibe').setAttribute('aria-pressed', String(MB.vibe)); $('#mb-vibe').classList.toggle('on', MB.vibe);
  if (T) $('#mb-list').value = T.id;
}
function mbVis() {
  const cv = $('#mb-vis'); if (!cv) return;
  const x = cv.getContext('2d'), data = new Uint8Array(32), t0 = performance.now();
  const f = () => {
    if (!cv.isConnected) return;
    x.clearRect(0, 0, cv.width, cv.height);
    if (MB.an && !MB.el) MB.an.getByteFrequencyData(data);
    for (let i = 0; i < 18; i++) {
      let v = MB.el ? (MB.playing ? (.3 + .5 * Math.abs(Math.sin(performance.now() / (180 + i * 37) + i))) : 0) : data[i + 1] / 255;
      if (!MB.playing) v *= .1;
      const h = Math.max(1, v * cv.height); x.fillStyle = `hsl(${290 - i * 7},90%,${60 + v * 20}%)`; x.fillRect(i * 8.3, cv.height - h, 6, h);
    }
    const tm = $('#mb-time'); if (tm && MB.playing) { const s = (performance.now() - t0) / 1000 | 0; tm.textContent = `${pad2(s / 60 | 0)}:${pad2(s % 60)}`; }
    if ((performance.now() / 1000 | 0) % 2 === 0) mbRender();
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}
/* installing software from DiveMail: a little setup wizard, then the icon lands on the desktop */
function installApp(name) {
  return new Promise(res => {
    pcBusy(20);
    openWin('setup:' + name, { title: `Setup — ${name}`, icon: 'exe', w: 380, h: 210, render: b => {
      b.innerHTML = `<div class="inst"><div class="inst-ic">${icon(APPICON[name] || 'exe')}</div><div><b>Installing ${esc(name)}…</b><p id="in-st">Copying files</p><div class="ldbar"><i id="in-b"></i></div></div></div>`;
      const steps = ['Copying files', 'Registering components', 'Creating shortcuts', 'Done'];
      let k = 0; const bar = $('#in-b', b), st = $('#in-st', b);
      const iv = setInterval(() => {
        k += 3 + Math.random() * 6; bar.style.width = Math.min(100, k) + '%'; st.textContent = steps[Math.min(3, k / 34 | 0)];
        if (Math.random() < .3) pcBusy(4);
        if (k >= 100) { clearInterval(iv); setTimeout(() => { closeWin('setup:' + name); res(); }, 500); }
      }, REDUCED ? 20 : 140);
    } });
  });
}
