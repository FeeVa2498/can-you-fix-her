/* =========================================================
   APPS 2 · Newsie.exe (Vel's layer-1 gift), Pixie.exe (Prim's layer-1 gift; the apps are ordinary software, not made by the girls),
   Morse code, and two night questions that use them:
     · Prim asks whether you care about the world outside. "Of course" is only there if you opened
       Newsie today; then she asks what's new, and today's headline is the right answer (5 keys).
     · Vel texts you in Morse. The Morse reply is locked until Pixie's "Morse Decypher" has read her
       messages; 30 s on the clock. Answering in Morse: 5 keys.
   Locked answers never say what they need: only "Not enough knowledge".
   ========================================================= */

/* ---------------- Morse ---------------- */
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '?': '..--..', '!': '-.-.--', '.': '.-.-.-', ',': '--..--', "'": '.----.' };
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const toMorse = s => String(s).toUpperCase().split(/\s+/).filter(Boolean).map(w => [...w].map(c => MORSE[c] || '').filter(Boolean).join(' ')).join(' / ');
const fromMorse = s => String(s).trim().split(/\s*\/\s*/).map(w => w.split(/\s+/).map(c => MORSE_REV[c] || '?').join('')).join(' ');
const isMorse = s => { const t = String(s || '').trim(); return t.length >= 3 && /^[.\-\/\s]+$/.test(t) && /[.\-]/.test(t); };

/* ---------------- keys won at night ---------------- */
function giveKeys(g, k) {
  if (!S.g[g] || !k) return; const L = Math.min(3, S.g[g].layer + 1);
  S.g[g].bonusKeys = S.g[g].bonusKeys || {}; S.g[g].bonusKeys[L] = (S.g[g].bonusKeys[L] || 0) + k;
  SFX.item(); toast('Keys', `+${k} of ${esc(GIRLS[g].name)}'s keys (layer ${L})`); save();
}

/* ---------------- Newsie.exe ---------------- */
// one silly headline a day (the front page), and what you'd tell Prim about it
const NEWS_DAYS = [
  ['Local man finally finds his other sock', 'After three years, the sock was "in the other drawer the whole time."', 'a guy out there finally found his other sock. after three years.'],
  ['My cat loafed for the first time', 'Witnesses describe the loaf as "perfectly rectangular" and "life-changing".', 'someone out there just got to see their cat loaf for the first time.'],
  ['Pigeon refuses to leave café, now has a regular order', 'Staff say he prefers the corner table and a single crumb of croissant.', 'there\'s a pigeon with a regular order at a café now.'],
  ['Kid names every ant in his backyard', '"Kevin is the fast one," he told reporters. There are 312 Kevins.', 'a kid out there named every single ant in his backyard.'],
  ['Grandma knits a sweater for a goose', 'The goose has reportedly been "much less rude" since.', 'some grandma knitted a sweater for a goose. it\'s less rude now.'],
  ['Office plant survives a year without water', 'Scientists are baffled. The plant has declined to comment.', 'an office plant went a whole year without water. scientists are baffled.'],
  ['Duck elected honorary mayor', 'The new mayor\'s first act: more bread in the park.', 'a small town elected a duck as honorary mayor.'],
  ['World\'s longest nap broken by accident', '"I just meant to rest my eyes," said the new record holder.', 'someone broke the record for the longest nap. by accident.'],
  ['Dog learns to open the fridge', 'The family now keeps the fridge locked. The dog is "working on it".', 'a dog learned to open the fridge. they have to lock it now.'],
  ['Snowman built in July, in a freezer aisle', 'Shoppers were asked not to give him a carrot.', 'someone built a snowman in july. in a supermarket freezer.'],
  ['Bakery bakes bread shaped like a loafing cat', 'Customers keep trying to pet it.', 'a bakery made bread that looks exactly like a loafing cat.'],
  ['Library book returned 40 years late', 'The fine was paid in coins. All of it.', 'a man returned a library book forty years late. paid in coins.'],
  ['Hamster runs 5 km a night, still hasn\'t arrived', 'Destination unknown. Spirit unbroken.', 'a hamster runs five kilometres a night and still hasn\'t gotten anywhere.'],
  ['Cat sits in a box far too small for it', 'The cat refused to elaborate.', 'a cat sat in a box way too small for it. no explanation.'],
];
// the small boxes: mostly filler, sometimes not
const NEWS_BRIEF = [
  'Brain-simulation trial "promising", says hospital board',
  'Research team: DIVE technology successfully developed',
  'Can one brain hold many selves? A new study says yes, for a while',
  'Hospital denies rumours of a "persona reduction" programme',
  'Doctor logs record hours inside a patient simulation',
  'Ethics panel questions the "avatar" feature in clinical simulators',
  'Missing: a counsellor, last seen at a psychiatric institute',
  'DIVE trial: patient\'s condition "critical", sources say',
  'Hospital board vote on "removing the others": details sealed',
  'Simulated worlds "built from the patient\'s own memories"',
  'Experts warn: an avatar may overwrite the user\'s own memories',
  'A doctor resigns. The hospital: "no comment"',
  'Late night: an unauthorised DIVE session is logged',
  'Avatar feature now live: "Be another person"',
];
const NEWS_FILLER = ['Weather: cloudy, with a chance of more cloudy', 'Horoscope: today is a good day to drink water', 'Crossword answers: page 9 (there is no page 9)', 'Ad: Lose weight fast! (Do not)', 'Traffic: a goose is crossing. Please wait.', 'Lost: one umbrella. Found: forty umbrellas.'];
const NEWS_SECTIONS = {
  fashion: [
    ['Gyaru is back', 'The tan, the lashes, the attitude. Street style has gone full 2003, and nobody is apologising.'],
    ['Platform boots: how high is too high?', 'Our answer: there is no too high. Our podiatrist\'s answer has been cut for length.'],
    ['Paris Fashion Week opens under a pink Eiffel Tower', 'The tower was lit pink for opening night. Half of Paris filmed it. The other half was on the runway.'],
    ['Camo goes couture', 'Military prints are all over the runways this season: olive, sand, and one very confident pink camo.'],
    ['Nail art, explained', 'Rhinestones, charms, tiny chains. How to type with them is not our problem.'],
  ],
  military: [
    ['Signals corps still teaches Morse code', 'Dots and dashes still get through when everything else is down. "It never crashes," says one instructor.'],
    ['Training on the roof of the world', 'Inside a high-altitude camp on Everest, on the Nepal–China border, where even breathing is a drill.'],
    ['The rifle that never jams', 'A field review: sand, mud, rain. It kept going. So did our reviewer, eventually.'],
    ['Field rations, ranked', 'By the people who actually have to eat them. Number one surprised everybody.'],
    ['Codes and ciphers, a short history', 'Armies have hidden their messages in hundreds of ways. Some are still in use today.'],
  ],
};
// the sheet "news" (dialogue.xlsx) wins over the lists above; they're only the fallback
function newsRows(txt) {
  if (!txt) return null; const rows = parseCSV(txt); const head = (rows[0] || []).map(h => h.trim().toLowerCase());
  const out = rows.slice(1).map(r => Object.fromEntries(head.map((h, k) => [h, (r[k] || '').trim()]))).filter(r => r.tab && r.title);
  return out.length ? out : null;
}
const newsSheet = () => (DD && DD.news) || null;
function newsFront() { const N = newsSheet(); if (!N) return NEWS_DAYS; const f = N.filter(r => r.tab === 'front').sort((a, b) => (+a.day || 0) - (+b.day || 0)).map(r => [r.title, r.body, r.reply || r.title]); return f.length ? f : NEWS_DAYS; }
function newsBriefs() { const N = newsSheet(); if (!N) return NEWS_BRIEF; const f = N.filter(r => r.tab === 'brief').sort((a, b) => (+a.day || 0) - (+b.day || 0)).map(r => r.title); return f.length ? f : NEWS_BRIEF; }
function newsFiller() { const N = newsSheet(); const f = N ? N.filter(r => r.tab === 'filler').map(r => r.title) : []; return f.length ? f : NEWS_FILLER; }
function newsTab(tab) {   // a section's stories; "day" = it shows up from that day on
  const N = newsSheet(), d = S.day || 1;
  const rows = N ? N.filter(r => r.tab === tab && (!r.day || +r.day <= d)).map((r, i) => [r.title, r.body || '', +r.day || 1, i]) : (NEWS_SECTIONS[tab] || []).map((r, i) => [...r, 1, i]);
  // every 4 days a section gets a new story: the newest is the cover story, older ones move down
  return tab === 'classifieds' ? rows : rows.sort((a, b) => b[2] - a[2] || a[3] - b[3]);
}
// the magazine's sections: [key, label, sticker, colour, tagline]
const NEWS_TABS = [
  ['front', 'Cover', '★', '#ff3d8f', ''], ['fashion', 'Fashion', '💅', '#ff7ac8', 'what everyone is wearing (and why)'], ['military', 'Military', '🎖', '#6b7a3a', 'gear · drills · field notes'],
  ['music', 'Music', '🎧', '#8a5cff', 'turn it up'], ['games', 'Games', '🎮', '#00b4e6', 'gg, no re'], ['odds', 'Odds', '🎲', '#17a463', 'place your bets'],
  ['travel', 'Travel', '✈', '#ff9a2e', 'go somewhere. anywhere.'], ['health', 'Health', '🩺', '#26b5a8', 'for body and brain'], ['tech', 'Tech', '💾', '#3a6cff', 'have you tried turning it off and on'],
  ['classifieds', 'Classifieds', '✂', '#b8a17a', 'small print, big feelings'],
];
const NEWSIE = { tab: 'front' };
const newsDay = () => clamp(S.day || 1, 1, newsFront().length);
function openNews() {
  S.used = S.used || {}; S.used['Newsie.exe'] = true; S.newsRead = S.day; save();   // "read today" (Prim asks)
  const dk = $('#desktop');
  openWin('news', { title: 'Newsie.exe', icon: 'news', w: Math.min(760, dk.clientWidth - 30), h: Math.min(580, dk.clientHeight - 20), x: 160, y: 14, skin: true, render: b => newsRender(b) });
}
// Test chamber: a day picker on top, so every issue (cover stories, rotations, classifieds) can be checked
function newsRender(b) {
  if (!S.flags.chamber) return newsRender1(b);
  const real = S.day; NEWSIE.day = clamp(NEWSIE.day || 1, 1, newsFront().length); S.day = NEWSIE.day;
  try { newsRender1(b); } finally { S.day = real; }
  const n = newsFront().length, bar = document.createElement('div'); bar.className = 'nz-test';
  bar.innerHTML = `<b>TEST · preview day</b><button data-d="-1" aria-label="Previous day">◂</button><select aria-label="Day">${Array.from({ length: n }, (_, i) => `<option value="${i + 1}"${i + 1 === NEWSIE.day ? ' selected' : ''}>day ${i + 1}</option>`).join('')}</select><button data-d="1" aria-label="Next day">▸</button><small>only in the Test chamber</small>`;
  b.prepend(bar); b.classList.add('nz-testing');
  const go = d => { NEWSIE.day = clamp(d, 1, n); SFX.click(); newsRender(b); };
  $$('[data-d]', bar).forEach(x => x.onclick = () => go(NEWSIE.day + +x.dataset.d));
  $('select', bar).onchange = e => go(+e.target.value);
}
function newsRender1(b) {
  const d = newsDay(), F = newsFront(), [hl, sub] = F[d - 1], tab = NEWS_TABS.find(t => t[0] === NEWSIE.tab) || NEWS_TABS[0];
  const fill = newsFiller(), ticker = [newsBriefs()[d - 1], fill[d % fill.length], fill[(d + 2) % fill.length], fill[(d + 4) % fill.length]].filter(Boolean);
  const by = '<span class="nz-by">by staff writer R.</span>';
  const tickerHTML = `<div class="nz-ticker"><b>IN BRIEF</b><div class="nz-tk"><span>${ticker.map(esc).join(' ✦ ')} ✦ </span><span>${ticker.map(esc).join(' ✦ ')} ✦ </span></div></div>`;
  let page;
  if (tab[0] === 'front') {
    const picks = ['travel', 'games', 'music', 'odds', 'health', 'tech'].map(k => [k, newsTab(k)[0]])   // each section's current cover story.filter(x => x[1]).slice(d % 2, d % 2 + 4);
    page = `<div class="nz-cover"><div class="nz-mast">Newsie<i>!</i></div><div class="nz-issue">ISSUE #${String(d).padStart(2, '0')} · DAY ${d} · FREE · 100% TRUE*</div>
      <figure class="nz-pola"><canvas width="96" height="64" id="nw-cat"></canvas><figcaption>cat of the day ♡</figcaption><span class="nz-tape"></span></figure>
      <div class="nz-hl"><span class="nz-burst">BREAKING!!</span><h2><mark>${esc(hl)}</mark></h2><p>${esc(sub)}</p>${by}</div>
      <ul class="nz-lines">${picks.map(([k, s]) => { const T = NEWS_TABS.find(t => t[0] === k); return `<li><button data-t="${k}" style="--c:${T[3]}"><b>${T[2]} ${esc(T[1].toUpperCase())}</b> ${esc(s[0])} →</button></li>`; }).join('')}</ul>
      <span class="nz-stk s1">NEW!</span><span class="nz-stk s2">*probably</span></div>`;
  } else if (tab[0] === 'classifieds') {
    page = `<div class="nz-sec nz-clas"><header class="nz-sh"><b>${tab[2]} ${esc(tab[1])}</b><small>${esc(tab[4])}</small></header>
      <div class="nz-ads">${newsTab('classifieds').map(([t], i) => `<p class="nz-ad" style="--r:${((i * 7) % 5 - 2) * .5}deg">${esc(t)}</p>`).join('')}</div></div>`;
  } else {
    const rows = newsTab(tab[0]);
    page = `<div class="nz-sec"><header class="nz-sh"><b>${tab[2]} ${esc(tab[1])}</b><small>${esc(tab[4])}</small></header>
      <div class="nz-grid">${rows.map(([t, x, day], i) => `<article class="nz-card${i ? '' : ' lead'}" style="--r:${i ? ((i % 2 ? 1 : -1) * (.4 + (i % 3) * .3)) : 0}deg">${i ? '' : `<span class="nz-rib">${day > 1 && (S.day || 1) - day < 4 ? 'NEW · ' : ''}COVER STORY</span>`}<h3>${esc(t)}</h3><p>${esc(x)}</p>${by}</article>`).join('')}</div></div>`;
  }
  b.innerHTML = `<div class="nz" style="--c:${tab[3]}"><div class="nz-page">${page}${tab[0] === 'front' ? tickerHTML : ''}</div>
    <nav class="nz-tabs">${NEWS_TABS.map(([k, l, ic, c]) => `<button class="nz-tab${k === tab[0] ? ' on' : ''}" data-t="${k}" style="--c:${c}"><span>${ic}</span>${esc(l)}</button>`).join('')}</nav></div>`;
  $$('[data-t]', b).forEach(x => x.onclick = () => { SFX.click(); NEWSIE.tab = x.dataset.t; newsRender(b); const pg = $('.nz-page', b); if (pg) pg.scrollTop = 0; });
  const cv = $('#nw-cat', b); if (cv) drawLoafCat(cv);
}
// a black-and-white cat, loafed (the front-page photo)
function drawLoafCat(cv) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height; x.imageSmoothingEnabled = false;
  x.fillStyle = '#d9d2c4'; x.fillRect(0, 0, W, H); x.fillStyle = '#c7bfae'; x.fillRect(0, 44, W, 20);
  const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  px(24, 26, 50, 24, '#1a1a1a'); px(22, 30, 54, 18, '#1a1a1a'); px(20, 36, 58, 12, '#1a1a1a');   // the loaf
  px(56, 14, 26, 22, '#1a1a1a'); px(57, 10, 6, 6, '#1a1a1a'); px(75, 10, 6, 6, '#1a1a1a');       // head and ears
  px(59, 12, 2, 3, '#e8a0a8'); px(77, 12, 2, 3, '#e8a0a8');
  px(62, 24, 14, 10, '#f4f1ea'); px(66, 34, 8, 12, '#f4f1ea');                                     // white muzzle and chest
  px(61, 20, 4, 3, '#cfe36a'); px(73, 20, 4, 3, '#cfe36a'); px(62, 21, 2, 2, '#111'); px(74, 21, 2, 2, '#111');
  px(68, 26, 2, 1, '#e88a98'); px(14, 40, 10, 4, '#1a1a1a'); px(12, 38, 4, 4, '#1a1a1a');          // nose, tail
  for (let i = 0; i < W * H / 40; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .06})`; x.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1); }
}

/* ---------------- Pixie.exe: a fairy that lives on the desktop ---------------- */
const PIX = { on: false, el: null, x: 300, y: 200, tx: 300, ty: 200, vx: 0, vy: 0, mode: 'fly', raf: 0, t: 0, until: 0, menu: null };
const PIX_EMOTES = [['wave', '👋', 'Wave'], ['sparkle', '✨', 'Sparkle'], ['twirl', '🌀', 'Twirl'], ['heart', '💖', 'Heart'], ['nap', '💤', 'Nap'], ['morse', '·–', 'Morse Decypher']];
function pixieBounds() { const r = $('#desktop').getBoundingClientRect(); return { l: r.left + 20, t: r.top + 20, r: r.right - 110, b: r.bottom - 120 }; }
function pixieOn() {
  if (PIX.on) return; PIX.on = true;
  const el = document.createElement('div'); el.id = 'pixie'; el.innerHTML = `<canvas width="24" height="24"></canvas><div class="px-say"></div>`; document.body.appendChild(el); PIX.el = el;
  const B = pixieBounds(); PIX.x = (B.l + B.r) / 2; PIX.y = B.b - 40; PIX.tx = PIX.x; PIX.ty = B.t + 80; PIX.mode = 'fly';
  let down = null;
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); down = { x: e.clientX, y: e.clientY, t: performance.now(), drag: false }; });
  el.addEventListener('pointermove', e => { if (!down) return;
    if (!down.drag && (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || performance.now() - down.t > 220)) { down.drag = true; pixieMenu(false); PIX.mode = 'held'; el.classList.add('held'); }
    if (down.drag) { PIX.x = e.clientX - 48; PIX.y = e.clientY - 40; } });
  el.addEventListener('pointerup', () => { if (!down) return; const d = down; down = null; el.classList.remove('held');
    if (d.drag) { PIX.mode = 'fly'; PIX.tx = PIX.x; PIX.ty = PIX.y; PIX.until = performance.now() + 1500; SFX.pop(); }
    else pixieMenu(!PIX.menu); });
  toast('Pixie.exe', 'A little fairy is out on your desktop. Click her. Hold to carry her.');
  pixieSay('✨', 1600); SFX.pop();
  const loop = now => { if (!PIX.on) return; pixieStep(now); PIX.raf = requestAnimationFrame(loop); }; PIX.raf = requestAnimationFrame(loop);
  refresh();
}
function pixieOff() { if (!PIX.on) return; PIX.on = false; cancelAnimationFrame(PIX.raf); pixieMenu(false); if (PIX.el) { PIX.el.classList.add('bye'); const e = PIX.el; setTimeout(() => e.remove(), 500); } PIX.el = null; refresh(); }
function pixieStep(now) {
  const B = pixieBounds(), el = PIX.el; if (!el) return;
  if (PIX.mode === 'fly' && !PIX.menu) {
    if (now > PIX.until || Math.hypot(PIX.tx - PIX.x, PIX.ty - PIX.y) < 8) { PIX.tx = B.l + Math.random() * (B.r - B.l); PIX.ty = B.t + Math.random() * (B.b - B.t); PIX.until = now + 3000 + Math.random() * 4000; }
  }
  if (PIX.menu && PIX.mode === 'fly') { PIX.vx = PIX.vy = 0; }   // menu open: she holds still so the bubbles can be clicked
  else if (PIX.mode === 'fly' || PIX.mode === 'go') {
    const acc = PIX.mode === 'go' ? .008 : .0014, ax = (PIX.tx - PIX.x) * acc, ay = (PIX.ty - PIX.y) * acc;
    PIX.vx = (PIX.vx + ax) * .93; PIX.vy = (PIX.vy + ay) * .93;
    const sp = Math.hypot(PIX.vx, PIX.vy), max = PIX.mode === 'go' ? 11 : 1.7; if (sp > max) { PIX.vx *= max / sp; PIX.vy *= max / sp; }
    PIX.x += PIX.vx; PIX.y += PIX.vy;
  }
  if (PIX.mode !== 'held') { PIX.x = clamp(PIX.x, B.l - 10, B.r + 10); PIX.y = clamp(PIX.y, B.t - 10, B.b + 10); }
  const bob = PIX.mode === 'nap' || PIX.menu ? 0 : Math.sin(now / 320) * 6;
  el.style.transform = `translate(${PIX.x}px,${PIX.y + bob}px)`;
  el.classList.toggle('left', PIX.vx < -.3);
  if ((now / 110 | 0) !== PIX.t) { PIX.t = now / 110 | 0; pixieDraw($('canvas', el), PIX.t % 2, PIX.mode === 'nap'); }
  if (PIX.mode !== 'nap' && Math.random() < (PIX.mode === 'go' ? .5 : .08)) pixieDust(PIX.x + 44, PIX.y + 64 + bob, 1);
  if (PIX.menu) PIX.menu.style.transform = `translate(${PIX.x + 48}px,${PIX.y + 46}px)`;
}
function pixieDraw(cv, f, sleep) {
  const x = cv.getContext('2d'); x.clearRect(0, 0, 24, 24); const p = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const wing = 'rgba(190,235,255,.75)', wy = f ? 6 : 8;
  p(4, wy, 6, 6, wing); p(14, wy, 6, 6, wing); p(5, wy + 6, 4, 3, wing); p(15, wy + 6, 4, 3, wing);   // wings
  p(9, 4, 6, 6, '#ffe2cf'); p(8, 3, 8, 3, '#ff9ccf'); p(8, 5, 2, 5, '#ff9ccf'); p(14, 5, 2, 5, '#ff9ccf');   // head, hair
  if (sleep) { p(10, 7, 2, 1, '#5a3a5a'); p(13, 7, 2, 1, '#5a3a5a'); } else { p(10, 6, 1, 2, '#5a3a5a'); p(13, 6, 1, 2, '#5a3a5a'); }
  p(11, 9, 2, 1, '#ff7aa8'); p(9, 10, 6, 6, '#ffb3d9'); p(8, 14, 8, 3, '#ff8cc6');   // dress
  p(10, 17, 1, 3, '#ffe2cf'); p(13, 17, 1, 3, '#ffe2cf');
  p(16, 10, 1, 6, '#c69cff'); p(15, 9, 3, 2, '#fff6a8');   // wand
}
function pixieDust(cx, cy, n = 6, spread = 14) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); s.className = 'px-dust'; s.style.left = (cx + (Math.random() - .5) * spread) + 'px'; s.style.top = (cy + (Math.random() - .5) * spread * .5) + 'px';
    s.style.setProperty('--dx', ((Math.random() - .5) * 30) + 'px'); s.style.setProperty('--dy', (20 + Math.random() * 40) + 'px'); s.style.background = ['#fff6a8', '#ffc2e6', '#c2f0ff', '#ffffff'][Math.random() * 4 | 0];
    document.body.appendChild(s); setTimeout(() => s.remove(), 1200);
  }
}
function pixieSay(t, ms = 1800) { const s = PIX.el && $('.px-say', PIX.el); if (!s) return; s.textContent = t; s.classList.add('on'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), ms); }
function pixieMenu(open) {
  if (PIX.menu) { PIX.menu.remove(); PIX.menu = null; document.removeEventListener('pointerdown', pixieMenuAway, true); }
  if (!open || !PIX.el) return;
  const m = document.createElement('div'); m.id = 'px-menu';
  m.innerHTML = PIX_EMOTES.map(([k, e, name], i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / PIX_EMOTES.length; return `<button class="px-b${k === 'morse' ? ' morse' : ''}" data-e="${k}" style="--x:${Math.cos(a) * 92}px;--y:${Math.sin(a) * 92}px;--d:${i * 40}ms" aria-label="${name}">${e}<span class="px-tip">${name}</span></button>`; }).join('');
  document.body.appendChild(m); PIX.menu = m; SFX.pop();
  $$('.px-b', m).forEach(b => b.onclick = e => { e.stopPropagation(); pixieMenu(false); pixieEmote(b.dataset.e); });
  setTimeout(() => document.addEventListener('pointerdown', pixieMenuAway, true), 0);
}
function pixieMenuAway(e) { if (PIX.menu && !PIX.menu.contains(e.target) && !(PIX.el && PIX.el.contains(e.target))) pixieMenu(false); }
async function pixieEmote(k) {
  const el = PIX.el; if (!el) return; SFX.click();
  el.classList.remove('e-wave', 'e-twirl', 'e-heart');
  if (k === 'wave') { el.classList.add('e-wave'); pixieSay('👋 hi!'); }
  else if (k === 'sparkle') { pixieSay('✨'); for (let i = 0; i < 4; i++) { pixieDust(PIX.x + 48, PIX.y + 40, 12, 90); await wait(120); } }
  else if (k === 'twirl') { el.classList.add('e-twirl'); pixieSay('🌀 wheee'); }
  else if (k === 'heart') { el.classList.add('e-heart'); pixieSay('💖'); for (let i = 0; i < 5; i++) { const h = document.createElement('i'); h.className = 'px-heart'; h.textContent = '♥'; h.style.left = (PIX.x + 24 + Math.random() * 48) + 'px'; h.style.top = (PIX.y) + 'px'; document.body.appendChild(h); setTimeout(() => h.remove(), 1500); await wait(140); } }
  else if (k === 'nap') { PIX.mode = 'nap'; pixieSay('💤 z z z', 4000); await wait(4200); if (PIX.mode === 'nap') { PIX.mode = 'fly'; PIX.until = 0; } }
  else if (k === 'morse') await pixieMorse();
  setTimeout(() => el.classList.remove('e-wave', 'e-twirl', 'e-heart'), 1200);
}
// Morse Decypher: fly to every bit of Morse on screen, dust it, and write the English over it
function morseTargets() {
  const vis = n => { const r = n.getBoundingClientRect(); if (!r.width || !r.height || !n.offsetParent) return false; const w = n.closest('.win'); if (w && w.hidden) return false;
    const log = n.closest('.chat-log'); if (log) { const L = log.getBoundingClientRect(); if (r.bottom < L.top || r.top > L.bottom) return false; }   // scrolled out of the chat
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  return $$('.msg .tx, .choice .ch-text, [data-morse]').filter(n => !n.closest('.morse-dec') && isMorse(n.dataset.morse || n.textContent) && vis(n));
}
// a girl's map: her layer-3 ledges spell two letters of Morse; read them over the minimap
function mapMorseTarget() {
  const mini = $('#ow-mini'), g = OW && OW.g; if (!mini || !g || !OW_MORSE[g] || !mini.offsetParent) return null;
  const w = mini.closest('.win'); if (w && w.hidden) return null;
  if (!(S.g[g] && S.g[g].layer >= 2)) return null;   // she has to have reached the part of the map where the letters are
  return { mini, g };
}
function mapMorseText(g) { return OW_MORSE[g].map((c, i) => fromMorse(c) + (OW_WORDGAP[g] === i ? ' ' : '')).join('').trim(); }
function mapMorseShow(g) {
  const view = $('#ow-view'), mini = $('#ow-mini'); if (!view || !mini) return;
  let b = $('.ow-morse', view); if (!b) { b = document.createElement('div'); b.className = 'ow-morse'; view.appendChild(b); }
  const r = mini.getBoundingClientRect(), V = view.getBoundingClientRect(), pad = 10;
  const h = Math.max(r.height + pad * 2, 78), left = Math.max(6, r.left - V.left - pad), right = Math.min(V.width - 6, r.right - V.left + pad);
  const top = Math.max(6, Math.min(V.height - h - 6, r.bottom - V.top + pad - h));   // cover the minimap, stay inside the view
  Object.assign(b.style, { left: left + 'px', top: top + 'px', width: (right - left) + 'px', height: h + 'px' });
  b.innerHTML = `<b>${esc(mapMorseText(g))}</b><small>${esc(OW_MORSE[g].join(OW_WORDGAP[g] === 0 ? ' / ' : ' '))}</small>`;
}
async function pixieMorse() {
  const ts = morseTargets(), mm = mapMorseTarget();
  if (!ts.length && !mm) { pixieSay('? no morse here'); return; }
  if (mm) {
    pixieSay('·–· let me see…', 1200); PIX.mode = 'go';
    const r = mm.mini.getBoundingClientRect(); PIX.tx = r.left + r.width / 2 - 48; PIX.ty = r.top - 92;
    const t0 = performance.now(); while (performance.now() - t0 < 1600 && Math.hypot(PIX.tx - PIX.x, PIX.ty - PIX.y) > 18) await wait(30);
    for (let i = 0; i < 8; i++) { pixieDust(r.left + Math.random() * r.width, r.top + Math.random() * r.height, 6, 24); await wait(60); }
    S.flags['mapmorse_' + mm.g] = true; save(); mapMorseShow(mm.g); SFX.tick();
    if (!ts.length) { PIX.mode = 'fly'; PIX.until = 0; pixieSay('✨ ' + mapMorseText(mm.g)); return; }
  }
  pixieSay('·–· let me see…', 1200); PIX.mode = 'go';
  for (const n of ts) {
    const r = n.getBoundingClientRect(); PIX.tx = r.left + Math.min(r.width - 60, 30); PIX.ty = r.top - 84;
    const t0 = performance.now(); while (performance.now() - t0 < 1400 && Math.hypot(PIX.tx - PIX.x, PIX.ty - PIX.y) > 18) await wait(30);
    for (let i = 0; i < 4; i++) { pixieDust(r.left + Math.random() * r.width, r.top - 6, 6, 20); await wait(60); }
    morseDecode(n); SFX.tick(); await wait(120);
  }
  PIX.mode = 'fly'; PIX.until = 0; pixieSay('✨ there!');
}
function morseDecode(n) {
  const code = n.dataset.morse || n.textContent, en = fromMorse(code);
  const host = n.closest('.bub') || n.closest('.choice') || n;
  host.classList.add('morse-dec');
  if (!$('.morse-en', host)) { const lab = document.createElement('div'); lab.className = 'morse-en'; lab.textContent = en; n.parentNode.insertBefore(lab, n); }
  // remember it on the message, so the chat keeps the translation
  for (const ch in S.logs) { const m = (S.logs[ch] || []).find(m => m.text === code && !m.en); if (m) { m.en = en; if (ch === 'vel') S.flags.vel_morse_read = true; } }
  if (S.flags.vel_morse_read && S.tq && S.tq.kind === 'morse') tqRender();   // Vel's Morse is read: the Morse reply unlocks
  save();
}

/* ---------------- the two questions ---------------- */
const PRIM_NEWS_RIGHT = ['{happy}...huh.', '{happy}that\'s nice. that\'s really nice.', '{shy}tell me tomorrow\'s too. if you want.'];
const PRIM_NEWS_WRONG = ['{neutral}...that was days ago.', '{sad}you don\'t have to pretend. it\'s ok.'];
function newsQuizStart() {
  const F = newsFront(), d = newsDay(), others = F.map((_, i) => i).filter(i => i !== d - 1).sort(() => Math.random() - .5).slice(0, 2);
  S.tq = { kind: 'news', g: 'prim', opts: [d - 1, ...others].sort(() => Math.random() - .5), ans: d - 1 }; save(); tqRender();
}
function newsQuizRender() {
  const T = S.tq; liveViews(T.g).forEach(v => { const box = $('.chat-choices', v.root); if (!box) return;
    box.innerHTML = `<div class="tq"><div class="tq-opts">${T.opts.map((i, k) => `<button class="choice tq-opt" data-o="${i}"><b>${'ABC'[k]}</b> ${esc(newsFront()[i][2])}</button>`).join('')}</div></div>`;
    $$('.tq-opt', box).forEach(x => x.onclick = () => newsQuizAnswer(+x.dataset.o)); });
}
function newsQuizAnswer(i) {
  const T = S.tq; if (!T || T.kind !== 'news') return; S.tq = null;
  liveViews('prim').forEach(v => { const box = $('.chat-choices', v.root); if (box) box.innerHTML = ''; });
  const m = { who: 'me', text: newsFront()[i][2], t: clockStr() }; S.logs.prim.push(m); appendMsg('prim', m);
  const ok = i === T.ans; if (ok) { giveKeys('prim', 5); S.flags.prim_news_right = true; } else SFX.buzz();
  save(); runDialogue(seq('prim', 'prim', [{ lines: ok ? PRIM_NEWS_RIGHT : PRIM_NEWS_WRONG }], 'NONE'));
}
// Vel's Morse: a locked Morse reply and an honest "no idea", 30 s on the clock
const VEL_MORSE_REPLY = 'OF COURSE';
const VEL_MORSE_NO = 'Sorry, I have no idea how to read morse code.';
function morseQuizStart() { S.tq = { kind: 'morse', g: 'vel' }; save(); tqRender(); }
function morseQuizRender() {
  const T = S.tq; if (!T.until) T.until = Date.now() + TQ_SECS * 1000;
  liveViews(T.g).forEach(v => { const box = $('.chat-choices', v.root); if (!box) return;
    const open = !!S.flags.vel_morse_read, code = toMorse(VEL_MORSE_REPLY);
    box.innerHTML = `<div class="tq"><div class="tq-bar"><i></i></div><div class="tq-opts">
      ${open ? `<button class="choice tq-opt" data-o="yes"><span class="ch-text" data-morse="${code}">${code}</span></button>` : `<button class="btn choice locked" disabled aria-label="Locked choice"><span class="k">${LOCK_SVG}</span><span class="lockbar">Not enough knowledge</span></button>`}
      <button class="choice tq-opt" data-o="no">${esc(VEL_MORSE_NO)}</button></div></div>`;
    $$('.tq-opt', box).forEach(x => x.onclick = () => morseQuizAnswer(x.dataset.o === 'yes'));
    const bar = $('.tq-bar i', box);
    const tick = () => { if (!S.tq || S.tq.kind !== 'morse' || !box.isConnected) return;
      const left = Math.max(0, S.tq.until - Date.now()); bar.style.width = (left / (TQ_SECS * 1000) * 100) + '%'; bar.classList.toggle('hot', left < 10000);
      if (left <= 0) { SFX.buzz(); toast('Time\'s up', 'An answer was picked at random.'); morseQuizAnswer(S.flags.vel_morse_read ? Math.random() < .5 : false); return; }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick); });
}
function morseQuizAnswer(yes) {
  const T = S.tq; if (!T || T.kind !== 'morse') return; S.tq = null;
  liveViews('vel').forEach(v => { const box = $('.chat-choices', v.root); if (box) box.innerHTML = ''; });
  const m = { who: 'me', text: yes ? toMorse(VEL_MORSE_REPLY) : VEL_MORSE_NO, t: clockStr() }; if (yes) m.en = VEL_MORSE_REPLY;
  S.logs.vel.push(m); appendMsg('vel', m);
  if (yes) { giveKeys('vel', 5); S.flags.vel_morse_right = true; } else SFX.buzz();
  save();
  const d = DD.night[yes ? 'vel_morse_yes' : 'vel_morse_no'];
  if (d) runDialogue(seq('vel', 'vel', playSteps(d.steps), 'NONE'));
}
