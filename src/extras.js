/* =========================================================
   EXTRAS · apps that boot like real software, the coin market,
   timed questions at night, Paige's coin at the start of her sessions.
   ========================================================= */

/* ---------- every app takes a moment to start (visual only: no work minutes) ---------- */
const APP_BOOT = {
  'UnitConv.exe': ['conv', 'UnitConv 2.1 · loading conversion tables', 'loading crypto feed…'],
  'Atlas.exe': ['atlas', 'Atlas · unfolding pages', 'tracing coastlines…'],
  'Fortune.exe': ['tarot', 'Fortune · shuffling the deck', 'cutting the deck…'],
  'MusicBox.exe': ['note', 'MusicBox · warming up the EQ', 'spinning the disc…'],
};
const APP_WIN = { 'UnitConv.exe': 'conv', 'Atlas.exe': 'atlas', 'Fortune.exe': 'fortune', 'MusicBox.exe': 'music' };
function launchApp(name, open) {
  const wid = APP_WIN[name];
  if (wid && WINS[wid]) { open(); return; }                  // already running
  const bid = 'boot:' + name; if (WINS[bid]) { focusWin(bid); return; }
  const [ic, l1, l2] = APP_BOOT[name] || ['exe', name, 'starting…'];
  const ms = REDUCED ? 300 : 2000 + Math.random() * 1000;
  pcBusy && pcBusy(ms / 100 | 0);
  openWin(bid, { title: name, icon: ic, w: 340, h: 170, render: b => {
    b.innerHTML = `<div class="boot b-${ic}"><div class="boot-ic">${icon(ic)}</div><div><b>${esc(l1)}</b><p class="boot-st">${esc(l2)}</p><div class="ldbar"><i></i></div></div></div>`;
    const bar = $('.ldbar i', b), t0 = performance.now();
    const tick = () => { if (!WINS[bid]) return; const k = Math.min(1, (performance.now() - t0) / ms); bar.style.width = (k * 100) + '%';
      if (k < 1) requestAnimationFrame(tick); else { closeWin(bid); open(); } };
    requestAnimationFrame(tick);
  } });
}

/* ---------- the coin market: four meme coins, new prices every day, different every playthrough ---------- */
const COINS = [
  { id: 'HEX', name: '$HEX', note: 'witchy. volatile.' },
  { id: 'BUNNY', name: '$BUNNY', note: 'cute until it isn\'t.' },
  { id: 'FLOPPY', name: '$FLOPPY', note: '1.44 MB of hope.' },
  { id: 'GRAVE', name: '$GRAVE', note: 'buried, then dug up.' },
];
function coinRng(n) { let x = (S.coinSeed = S.coinSeed || (1 + Math.random() * 2e9 | 0)) ^ (n * 2654435761); return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e6) / 1e6; }; }
// price of each coin in "USD" on a day: a seeded random walk from day 1
function coinPrices(day = S.day) {
  S.coinPx = S.coinPx || {};
  if (S.coinPx[day]) return S.coinPx[day];
  let px;
  if (day <= 1) { const r = coinRng(1); px = COINS.map(() => +(0.05 + r() * 4).toFixed(4)); }
  else { const prev = coinPrices(day - 1), r = coinRng(day); px = prev.map(v => +Math.max(0.0042, v * (0.7 + r() * 0.65)).toFixed(4)); }
  S.coinPx[day] = px; return px;
}
const coinRate = (a, b, day) => { const p = coinPrices(day), i = COINS.findIndex(c => c.id === a), j = COINS.findIndex(c => c.id === b); return p[i] / p[j]; };
const UNITS = [
  ['mi', 'km', v => v * 1.609344], ['ft', 'm', v => v * 0.3048], ['in', 'cm', v => v * 2.54], ['lb', 'kg', v => v * 0.45359237], ['oz', 'g', v => v * 28.349523],
  ['°F', '°C', v => (v - 32) * 5 / 9], ['gal', 'L', v => v * 3.785412], ['mph', 'km/h', v => v * 1.609344], ['acre', 'm²', v => v * 4046.8564], ['cup', 'mL', v => v * 236.5882],
];
// Trix's calculator: a chunky Y2K pocket device, black shell + candy pink keys, a green LCD
function openConv() {
  S.used = S.used || {}; S.used['UnitConv.exe'] = true; save();
  const U = S.ucx = S.ucx || { tab: 0, u: 0, rev: false, n: '1', cn: '100', a: 'HEX', b: 'BUNNY' };
  openWin('conv', { title: 'UnitConv.exe', icon: 'conv', w: 318, h: 520, x: 240, y: 40, skin: true, render: b => {
    const unitsLCD = () => { const u = UNITS[U.u], [f, t] = U.rev ? [u[1], u[0]] : [u[0], u[1]];
      return `<div class="lc-s">CONVERT <b>${esc(f)}</b> ▸ <b>${esc(t)}</b></div><div class="lc-in"><input id="ux-n" inputmode="decimal" value="${esc(U.n)}" aria-label="Value in ${esc(f)}"><span>${esc(f)}</span></div><div class="lc-out"><output id="ux-o"></output><span>${esc(t)}</span></div>`; };
    const cryptoLCD = () => { const p = coinPrices();
      return `<div class="lc-s">MEME MARKET · DAY ${S.day}</div>${COINS.map((c, i) => { const y = S.day > 1 ? coinPrices(S.day - 1)[i] : p[i], d = p[i] / y - 1;
        return `<div class="lc-tk"><b>${c.id}</b><canvas class="lc-sp" data-i="${i}" width="56" height="14"></canvas><span>${p[i].toFixed(4)}</span><i>${d >= 0 ? '▲' : '▼'}${Math.abs(d * 100).toFixed(1)}</i></div>`; }).join('')}
        <div class="lc-in sm"><input id="ux-c" inputmode="decimal" value="${esc(U.cn)}" aria-label="Amount of ${U.a}"><span>${U.a}▸${U.b}</span></div><div class="lc-out"><output id="ux-co"></output><span>${U.b}</span></div>`; };
    const keys = () => U.tab === 0
      ? `<div class="ux-grid">${UNITS.map((u, i) => `<button class="uk${i === U.u ? ' on' : ''}" data-u="${i}">${esc(u[0])}<i>▸</i>${esc(u[1])}</button>`).join('')}</div><div class="ux-row"><button class="uk wide" data-k="rev">⇄ SWAP</button><button class="uk wide" data-k="clr">C</button></div>`
      : `<div class="ux-lab">FROM</div><div class="ux-row">${COINS.map(c => `<button class="uk coin${U.a === c.id ? ' on' : ''}" data-a="${c.id}">${c.id}</button>`).join('')}</div>
         <div class="ux-lab">TO</div><div class="ux-row">${COINS.map(c => `<button class="uk coin${U.b === c.id ? ' on' : ''}" data-b="${c.id}">${c.id}</button>`).join('')}</div><div class="ux-row"><button class="uk wide" data-k="rev">⇄ SWAP</button><button class="uk wide" data-k="clr">C</button></div>`;
    const draw = () => {
      b.innerHTML = `<div class="ucx"><div class="ucx-top"><span class="ucx-brand">TRIX<b>CALC</b> <i>UC-2001</i></span><span class="ucx-solar" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>
        <div class="ucx-lcd">${U.tab === 0 ? unitsLCD() : cryptoLCD()}</div>
        <div class="ucx-mode" role="tablist"><button role="tab" data-t="0" class="${U.tab ? '' : 'on'}">UNIT</button><span class="ucx-led${U.tab ? ' r' : ''}"></span><button role="tab" data-t="1" class="${U.tab ? 'on' : ''}">CRYPTO</button></div>
        <div class="ucx-keys">${keys()}</div>
        <div class="ucx-foot">✧ property of trix · do not lick ✧</div></div>`;
      $$('[data-t]', b).forEach(x => x.onclick = () => { SFX.click(); U.tab = +x.dataset.t; draw(); });
      $$('[data-u]', b).forEach(x => x.onclick = () => { SFX.tick(); U.u = +x.dataset.u; draw(); });
      $$('[data-a]', b).forEach(x => x.onclick = () => { SFX.tick(); U.a = x.dataset.a; draw(); });
      $$('[data-b]', b).forEach(x => x.onclick = () => { SFX.tick(); U.b = x.dataset.b; draw(); });
      $$('[data-k]', b).forEach(x => x.onclick = () => { SFX.tick();
        if (x.dataset.k === 'rev') { if (U.tab === 0) U.rev = !U.rev; else [U.a, U.b] = [U.b, U.a]; }
        else { if (U.tab === 0) U.n = ''; else U.cn = ''; }
        draw(); const f = $('#ux-n,#ux-c', b); if (f) f.focus(); });
      if (U.tab === 0) {
        const calc = () => { U.n = $('#ux-n', b).value; const v = parseFloat(U.n), u = UNITS[U.u];
          let r = NaN; if (!isNaN(v)) { if (!U.rev) r = u[2](v); else { let lo = -1e9, hi = 1e9; for (let k = 0; k < 90; k++) { const m = (lo + hi) / 2; if (u[2](m) < v) lo = m; else hi = m; } r = (lo + hi) / 2; } }
          $('#ux-o', b).textContent = isNaN(r) ? '-----' : +r.toFixed(4); };
        $('#ux-n', b).addEventListener('input', calc); calc();
      } else {
        const calc = () => { U.cn = $('#ux-c', b).value; const v = parseFloat(U.cn); $('#ux-co', b).textContent = isNaN(v) ? '-----' : (v * coinRate(U.a, U.b)).toFixed(2); };
        $('#ux-c', b).addEventListener('input', calc); calc();
        $$('.lc-sp', b).forEach(cv => { const i = +cv.dataset.i, d0 = Math.max(1, S.day - 6), ys = []; for (let d = d0; d <= S.day; d++) ys.push(coinPrices(d)[i]);
          const c = cv.getContext('2d'), lo = Math.min(...ys), hi = Math.max(...ys) || 1; c.strokeStyle = '#1d3320'; c.lineWidth = 1.5; c.beginPath();
          ys.forEach((y, k) => { const X = ys.length > 1 ? k / (ys.length - 1) * 54 + 1 : 28, Y = 13 - (hi > lo ? (y - lo) / (hi - lo) : .5) * 12; k ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke(); });
      }
    };
    draw();
  } });
}

// a chat message posted straight from code: "{emo}text" becomes a face, never visible text
function say(who, text) { const m = /^\{(\w+)\}\s*/.exec(text); return { who, text: m ? text.slice(m[0].length) : text, emo: m ? m[1] : undefined, t: clockStr() }; }
/* ---------- timed questions at night: answer in time, get her keys ---------- */
const TQ_SECS = 30;
// Paige, layer 2 nights: meme coins. Which two coins is random per playthrough; the rate is that day's.
const TIMED_QS = {
  paige_coinq: {
    g: 'paige', layer: 1,   // shows while she is on her layer 2 (layer 1 open)
    intro: ['found a new way to gamble 24/7.', 'meme coins. the market never sleeps so neither do i.', '{happy}quick question. clock\'s on.'],
    ask: () => { const [a, b] = S.coinQ || (S.coinQ = (() => { const k = [...COINS].sort(() => Math.random() - .5); return [k[0].id, k[1].id]; })()); return { text: `100 $${a}. how much $${b} is that, right now? 🎲`, ans: 100 * coinRate(a, b) }; },
    right: ['{happy}...huh. you\'re right. that\'s annoyingly attractive.', '{happy}correct. the house is impressed. take these.', '{happy}fast AND right? today\'s our lucky day.'],
    wrong: ['{neutral}nope. the market ate that one.', '{sad}wrong. i went all in on your number, by the way. kidding. mostly.', '{neutral}that\'s not it. the coin doesn\'t forgive.'],
    late: ['{neutral}too slow. the price moved. it always moves.', '{sad}and... time. that\'s the game.', '{neutral}clock ran out. so did my patience. kidding. kind of.'],
  },
};
function timedQFor(g) {
  const st = S.g[g]; st.ntDone = st.ntDone || [];
  return Object.entries(TIMED_QS).find(([id, q]) => q.g === g && st.layer === q.layer && !st.ntDone.includes(id));
}
function startTimedQ(id) {
  const q = TIMED_QS[id]; if (!q) return;
  const a = q.ask(), m = { who: q.g, text: a.text, t: clockStr() }; S.logs[q.g].push(m); appendMsg(q.g, m); SFX.vibrate && SFX.vibrate();
  S.tq = { id, g: q.g, ans: a.ans, until: null }; save();   // the clock starts once her chat is on screen
  tqRender();
}
function tqRender() {
  const T = S.tq; if (!T) return;
  if (T.kind === 'tarot') return tarotRender();
  const views = liveViews(T.g); if (!views.length) return;
  if (!T.until) T.until = Date.now() + TQ_SECS * 1000;
  views.forEach(v => {
    const box = $('.chat-choices', v.root); if (!box) return;
    box.innerHTML = `<div class="tq"><div class="tq-bar"><i></i></div><div class="tq-row"><input class="tq-in" inputmode="decimal" placeholder="your answer" autocomplete="off"><button class="btn primary tq-go">Send</button></div></div>`;
    const inp = $('.tq-in', box), bar = $('.tq-bar i', box);
    const send = () => tqAnswer(inp.value);
    $('.tq-go', box).onclick = send; inp.onkeydown = e => { if (e.key === 'Enter') send(); };
    setTimeout(() => inp.focus(), 50);
    const tick = () => {
      if (!S.tq || !box.isConnected) return;
      const left = Math.max(0, S.tq.until - Date.now()), k = left / (TQ_SECS * 1000);
      bar.style.width = (k * 100) + '%'; bar.classList.toggle('hot', left < 10000);
      if (left <= 0) { tqAnswer(null); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function tqAnswer(v) {
  const T = S.tq; if (!T) return; S.tq = null;
  const q = TIMED_QS[T.id], g = T.g;
  liveViews(g).forEach(vw => { const box = $('.chat-choices', vw.root); if (box) box.innerHTML = ''; });
  let lines, ok = false;
  if (v == null || v === '') lines = [pickRnd(q.late)];
  else {
    const m = { who: 'me', text: String(v), t: clockStr() }; S.logs[g].push(m); appendMsg(g, m);
    const n = parseFloat(String(v).replace(/,/g, '')); ok = isFinite(n) && Math.abs(n - T.ans) <= Math.max(.01, Math.abs(T.ans) * .01);
    lines = [pickRnd(ok ? q.right : q.wrong)];
  }
  const act = [];
  if (ok) {
    const k = 3 + (Math.random() * 3 | 0), L = S.g[g].layer + 1;
    S.g[g].bonusKeys = S.g[g].bonusKeys || {}; S.g[g].bonusKeys[L] = (S.g[g].bonusKeys[L] || 0) + k;
    SFX.item(); toast('Keys', `+${k} of ${esc(GIRLS[g].name)}'s keys (layer ${L})`);
  } else SFX.buzz();
  save();
  runDialogue(seq(g, g, [{ lines }], 'NONE'));
}


/* ---------- Trix vs the Elite Four: four timed questions, answered with Paige's tarot app ----------
   Each opponent gets one Major Arcana card per playthrough (random, no repeats). While her question is on,
   Fortune.exe always draws that card; its description says how to beat that opponent. Three options each
   (the right one + two other cards' answers from different groups); no option ever shows up twice. */
const ARCANA = [
  ['0', '✦', 'The Fool', 'A leap into the unknown, without looking down.', 'Play an opening he has never seen. Get him out of his preparation.', 'surprise'],
  ['I', '✧', 'The Magician', 'Every tool is already on the table. Use them all.', 'Develop every piece before you attack.', 'structure'],
  ['II', '☽', 'The High Priestess', 'What is hidden speaks louder than what is shown.', 'Play quiet moves. Stop his plans before he makes them.', 'defence'],
  ['III', '❀', 'The Empress', 'A garden that grows slowly, and feeds itself.', 'Gain space with pawns and squeeze him slowly.', 'structure'],
  ['IV', '♜', 'The Emperor', 'Stone walls. A throne that does not move.', 'Castle early. Keep your king safe and your position solid.', 'defence'],
  ['V', '✝', 'The Hierophant', 'The old teachings. The way it has always been done.', 'Stick to main-line theory. Play the book move.', 'study'],
  ['VI', '♡', 'The Lovers', 'Two that move as one.', 'Make your pieces work in pairs: the bishop pair, doubled rooks.', 'structure'],
  ['VII', '➶', 'The Chariot', 'Forward, without stopping. Will over doubt.', 'Attack early and keep the initiative. Don\'t let him breathe.', 'attack'],
  ['VIII', '∞', 'Strength', 'A gentle hand that tames the lion.', 'Stay calm, absorb his attack, then counter.', 'defence'],
  ['IX', '☉', 'The Hermit', 'Alone with a lantern, thinking for a long time.', 'Slow down. Use your clock and calculate deeper.', 'study'],
  ['X', '☸', 'Wheel of Fortune', 'What goes up, turns.', 'Make the position chaotic. Play for complications.', 'surprise'],
  ['XI', '⚖', 'Justice', 'Every weight answered with an equal weight.', 'Answer every threat exactly. Keep the position balanced and symmetrical.', 'defence'],
  ['XII', '⚲', 'The Hanged Man', 'Give something up to see the world upside down.', 'Sacrifice material for position: a gambit.', 'attack'],
  ['XIII', '☠', 'Death', 'An ending makes room for what comes next.', 'Trade queens early and go into the endgame.', 'endgame'],
  ['XIV', '⚱', 'Temperance', 'Pour slowly. Never too much of one thing.', 'Balance attack and defence. Don\'t overextend.', 'structure'],
  ['XV', '⛓', 'The Devil', 'The chains you cannot see.', 'Pin and trap his pieces. Take away his moves.', 'attack'],
  ['XVI', '⚡', 'The Tower', 'A sudden strike, and everything falls.', 'Look for a tactic: one combination against his king.', 'attack'],
  ['XVII', '★', 'The Star', 'A quiet light on a very long road.', 'Play the long game. Keep a small edge and grind.', 'endgame'],
  ['XVIII', '☾', 'The Moon', 'In the dark, nothing is what it seems.', 'Set traps. Play a move that looks like a mistake.', 'surprise'],
  ['XIX', '☀', 'The Sun', 'Open sky. Everything in plain light.', 'Open the position: open files, open diagonals.', 'attack'],
  ['XX', '♪', 'Judgement', 'Look back, and answer the call.', 'Study his past games and play against his habits.', 'study'],
  ['XXI', '◯', 'The World', 'The circle closes. Every corner reached.', 'Play on the whole board. Switch flanks when he defends one.', 'endgame'],
].map(([n, sig, name, desc, ans, grp]) => ({ n, sig, name, desc, ans, grp }));
// the Elite Four of the chess site Trix plays on (titles say nothing about how to beat them)
const ELITE4 = [['kn1ght_shift', 'the Gatekeeper'], ['M0RPHY_GHOST', 'the Ghost'], ['zugzwang.exe', 'the Machine'], ['IvoryQueen', 'the Champion']];
function tarotSetup() {
  if (S.tarotQ) return S.tarotQ;
  const sh = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const used = new Set(), qs = [];
  const right = sh(ARCANA.map((_, i) => i)).slice(0, 4); right.forEach(i => used.add(i));
  for (const r of right) {
    const pool = sh(ARCANA.map((_, i) => i).filter(i => !used.has(i) && ARCANA[i].grp !== ARCANA[r].grp));
    const w = []; for (const i of pool) { if (w.length === 2) break; if (w.every(x => ARCANA[x].grp !== ARCANA[i].grp)) w.push(i); }
    w.forEach(i => used.add(i));
    qs.push({ card: r, opts: sh([r, ...w]) });
  }
  return (S.tarotQ = qs);
}
// Fortune.exe draws this card while a question is up
const tarotRigged = () => (S.tq && S.tq.kind === 'tarot' && S.tarotQ ? S.tarotQ[S.tq.step].card : null);
// during the reading she only takes notes; whether the plans worked comes the next night, after she plays them
const TAROT_NOTE = ["{neutral}noted. plan saved.", "{neutral}...that's a strange plan. noted anyway.", "{neutral}logged. i'll test it.", "{shy}hm. ok. writing it down."];
const TAROT_LATE = ["{neutral}clock. a flag falls. no plan for that one.", "{angry}time. even the cards are slower than him."];
function tarotStart() {
  tarotSetup(); S.tq = { id: 'trix_tarot', kind: 'tarot', g: 'trix', step: 0, right: 0, until: null }; save(); tarotAsk();
}
function tarotAsk() {
  const T = S.tq, [nm, title] = ELITE4[T.step];
  const m = say('trix', `how do i beat ${nm}, "${title}"?`); S.logs.trix.push(m); appendMsg('trix', m);
  SFX.vibrate && SFX.vibrate(); T.until = null; save(); tarotRender();
}
function tarotRender() {
  const T = S.tq; if (!T || T.kind !== 'tarot') return;
  const views = liveViews(T.g); if (!views.length) return;
  if (!T.until) T.until = Date.now() + TQ_SECS * 1000;
  const q = S.tarotQ[T.step];
  views.forEach(v => {
    const box = $('.chat-choices', v.root); if (!box) return;
    box.innerHTML = `<div class="tq"><div class="tq-bar"><i></i></div><div class="tq-opts">${q.opts.map((i, k) => `<button class="choice tq-opt" data-o="${i}"><b>${'ABC'[k]}</b> ${esc(ARCANA[i].ans)}</button>`).join('')}</div></div>`;
    $$('.tq-opt', box).forEach(x => x.onclick = () => tarotAnswer(+x.dataset.o));
    const bar = $('.tq-bar i', box), step = T.step;
    const tick = () => {
      if (!S.tq || S.tq.step !== step || !box.isConnected) return;
      const left = Math.max(0, S.tq.until - Date.now());
      bar.style.width = (left / (TQ_SECS * 1000) * 100) + '%'; bar.classList.toggle('hot', left < 10000);
      if (left <= 0) { tarotAnswer(pickRnd(q.opts), true); return; }   // time's up: the system picks one of the three at random
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function tarotAnswer(i, late) {
  const T = S.tq; if (!T || T.kind !== 'tarot' || T.busy) return; T.busy = true;
  const q = S.tarotQ[T.step], ok = i === q.card;
  liveViews('trix').forEach(vw => { const box = $('.chat-choices', vw.root); if (box) box.innerHTML = ''; });
  if (late) { SFX.buzz(); toast('Time\'s up', 'An answer was picked at random.'); }
  if (i != null) { const m = { who: 'me', text: ARCANA[i].ans, t: clockStr() }; S.logs.trix.push(m); appendMsg('trix', m); }
  if (ok) T.right++; SFX.tick();
  const r = say('trix', pickRnd(i == null ? TAROT_LATE : TAROT_NOTE));
  await wait(600); S.logs.trix.push(r); appendMsg('trix', r);
  T.step++; T.busy = false;
  if (T.step < 4) { await wait(900); tarotAsk(); return; }
  // done: the results (2 keys per game won) come in her next night chat (trix_11_all / _some / _none)
  const n = T.right; S.tq = null;
  S.flags.trix_e4 = n; S.flags.trix_e4_done = true; S.flags[n === 4 ? 'trix_e4_all' : n === 0 ? 'trix_e4_none' : 'trix_e4_some'] = true; save();
  const end = ["{neutral}four plans. i'll play them tomorrow night.", "{shy}don't ask how it went. i'll tell you. goodnight."];
  runDialogue(seq('trix', 'trix', [{ lines: end }], 'NONE'));
}

/* ---------- Paige flips a coin at the start of every session ---------- */
const PAIGE_ASK = ['{happy}heads or tails?', 'call it. heads or tails.', '{happy}before we start. heads or tails? humor me.', 'pick one. the coin\'s already in the air.'];
const PAIGE_WIN = ['{happy}today\'s our lucky day.', '{happy}you called it. today\'s our lucky day. don\'t waste it.', '{happy}the coin likes you. don\'t let it go to your head.', '{happy}ha! lucky. stay lucky, okay?'];
const PAIGE_LOSE = ['{neutral}ugh. the coin\'s never wrong though. that\'s the worst part.', '{sad}...wrong. and i was rooting for you.', '{neutral}figures. the house always wins.', '{sad}bad call. it\'s fine. it\'s fine. it\'s not fine.'];
function paigeCoinStep() {
  const pick = v => [{ action: 'COIN_PICK', value: v }];
  return { lines: [pickRnd(PAIGE_ASK)], choices: [{ t: 'Heads.', act: pick('HEADS') }, { t: 'Tails.', act: pick('TAILS') }] };
}
async function paigeSessionCoin() {
  const ss = S.session; if (!ss) return;
  const res = Math.random() < .5 ? 'HEADS' : 'TAILS';
  const els = appendMsg('session', { who: 'paige', text: '', t: clockStr() });
  els.forEach(e => { e.classList.add('coinmsg'); $('.tx', e).innerHTML = '<span class="coin spin"><b>?</b></span> <i>flipping…</i>'; });
  SFX.pop(); await wait(REDUCED ? 200 : 1600);
  els.forEach(e => { $('.tx', e).innerHTML = `<span class="coin ${res === 'HEADS' ? 'h' : 't'}"><b>${res[0]}</b></span> <b>${res}</b>`; });
  S.logs.session.push({ who: 'paige', text: `🪙 ${res}`, t: clockStr() });
  SFX.tick(); await wait(500);
  ss.lucky = ss.pick === res; save();
  if (ss.lucky) toast('Lucky streak', 'This session: every 2 inputs cost 1 minute.');
  runDialogue(seq('session', 'paige', [{ lines: [pickRnd(ss.lucky ? PAIGE_WIN : PAIGE_LOSE)] }], 'SES_SCAN'));
}

/* ---------- Profiles.exe (DIVE default): what you know about each girl you've worked with ----------
   Fields fill in as you learn them: night talks (how many you've had with her), layers faced, flags.
   Until then a field shows ???. */
const PROFILE = {   // v13: Boss's plan (layer 1) → her real passion (layer 2) → why (layer 3)
  prim: [['Name', 'Prim'], ['File', 'PRIM_01'], ['Style', 'Jirai Kei'], ["Boss's plan", 'illustrator', { s: 1 }],
    ['Likes', 'tracing paper, pastel pens, rain on the window', { nt: 1 }], ['Always wears', 'headphones, even when she draws', { nt: 2 }],
    ['Real passion', 'music. little songs on a keyboard with three broken keys.', { L: 1, f: 'prim_music' }],
    ['Why the headphones', 'when she is made to draw, a voice says "draw. again." her songs are the one room in her head it can\'t walk into.', { L: 2 }],
    ['Afraid of', 'being fixed into someone who doesn\'t need anything', { L: 2 }], ['Wants', 'to see the sea. it\'s 19 km away.', { nt: 5 }]],
  trix: [['Name', 'Trix'], ['File', 'TRIX_02'], ['Style', 'E-Girl'], ["Boss's plan", 'gamer girl, streamer', { s: 1 }],
    ['Likes', 'a clean board, a quiet room, being right', { nt: 1 }], ['Hates', 'being called cute mid-sentence', { nt: 2 }],
    ['Real passion', 'mathematics and chess. 2400 rated. 14 games in her head at once.', { L: 1, f: 'trix_true' }],
    ['Why', 'boss had her practise for a fake chat that voted on her worth; she lost on purpose to make the counter go up. a proof is true with zero viewers; the board doesn\'t care what she looks like.', { L: 2 }],
    ['Afraid of', 'losing on purpose again', { L: 2 }], ['Wants', 'a room with a whiteboard', { nt: 5 }]],
  paige: [['Name', 'Paige'], ['File', 'PAIGE_03'], ['Style', 'Goth'], ["Boss's plan", 'the mystic: tarot, candles, fate', { s: 1 }],
    ['Likes', 'the sound of a shuffle, a die in mid-air', { nt: 1 }], ['Hates', 'goodbyes with no time attached', { nt: 2 }],
    ['Real passion', 'gambling. odds, dice, cards. numbers that don\'t pretend to be fate.', { L: 1, f: 'paige_true' }],
    ['Why', 'she read the last counsellor\'s cards the night before they vanished: the sun. nothing warned her. she can\'t beat the chaos, so she plays with it. every coin flip says: i\'m not scared of you.', { L: 2 }],
    ['Afraid of', 'people leaving', { L: 2 }], ['Wants', 'one bet she doesn\'t have to hedge', { nt: 5 }]],
  vel: [['Name', 'Vel'], ['File', 'VEL_04'], ['Style', 'Gyaru'], ["Boss's plan", 'fashion queen', { s: 1 }],
    ['Likes', 'glitter, big boots, loud music', { nt: 1 }], ['Hates', 'being called a bimbo', { nt: 2 }],
    ['Real passion', 'guns and military gear. rifles, field manuals. strips an AR-15 blindfolded in 38 s.', { L: 1, f: 'vel_true' }],
    ['Why the typos', 'she texts without looking at the screen: eyes on the target, trust your hands. every typo is a miss, and she keeps score.', { L: 2 }],
    ['Afraid of', 'being fixed into someone who doesn\'t count anything', { L: 2 }], ['Wants', 'to send one perfect message', { nt: 5 }]],
};
function profKnown(g, at) {
  if (!at) return true; const st = S.g[g] || {};
  if (at.f && S.flags[at.f]) return true;
  if (at.s && (st.sessions || 0) >= at.s) return true;
  if (at.nt && (st.ntDone || []).length >= at.nt) return true;
  if (at.L && (st.layer || 0) >= at.L) return true;
  return false;
}
const profCount = g => (PROFILE[g] || []).filter(f => profKnown(g, f[2])).length;
const profPeople = () => PLAYABLE.filter(g => met(g) && ((S.g[g].sessions || 0) > 0 || S.flags.chamber));
// tell the player when a profile gets a new line
function profCheck() {
  S.prof = S.prof || {};
  profPeople().forEach(g => { const n = profCount(g); if (S.prof[g] != null && n > S.prof[g]) { S.flags.profNew = true; toast('Profiles', `${esc(GIRLS[g].name)}'s profile was updated.`); } S.prof[g] = n; });
}
function openProfiles() {
  S.flags.profNew = false; renderIcons();
  let at = profPeople()[0];
  openWin('profiles', { title: 'Profiles - DIVE', icon: 'id', w: 560, h: 460, x: 200, y: 40, render: (b, rec) => {
    const draw = () => {
      const ppl = profPeople(); if (!ppl.includes(at)) at = ppl[0];
      if (!at) { b.innerHTML = '<div class="prof"><p class="jr-none">No patient files yet. Work with someone first.</p></div>'; return; }
      const fs = PROFILE[at] || [];
      b.innerHTML = `<div class="prof"><nav class="prof-tabs">${ppl.map(g => `<button class="prof-tab${g === at ? ' on' : ''}" data-pg="${g}" style="--c:${SEL_COL[g]}">${avHTML(g)}<span>${esc(GIRLS[g].name)}</span></button>`).join('')}</nav>
        <article class="prof-card" style="--c:${SEL_COL[at]}"><div class="prof-pic">${selPortrait(at)}</div><div class="prof-body"><div class="prof-head"><b>${esc(GIRLS[at].name)}</b><small>patient file · ${profCount(at)}/${fs.length} known</small></div>
          <dl>${fs.map(([k, v, cond]) => { const ok = profKnown(at, cond); return `<dt>${esc(k)}</dt><dd class="${ok ? '' : 'unk'}">${ok ? esc(v) : '???'}</dd>`; }).join('')}</dl></div></article></div>`;
      $$('[data-pg]', b).forEach(x => x.onclick = () => { SFX.click(); at = x.dataset.pg; draw(); });
    };
    addUpd(rec, draw); draw();
  } });
}
