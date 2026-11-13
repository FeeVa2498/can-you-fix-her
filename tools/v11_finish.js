// v11 finishing: merge route-first panels (tools/trix_v10.js output) and the new Vel set, fill empty beliefs.
// node tools/v11_finish.js rf <dir>        add every <id>.json in dir (layer and n from the id)
// node tools/v11_finish.js vel <part.json> replace Vel layer 2 entirely, add the rest; old vel_2_t1 moves out
// node tools/v11_finish.js beliefs         give every panel without a belief one from her pool
const fs = require('fs'), path = require('path'), OUT = path.join(__dirname, '../src/panels.json');
const ALL = JSON.parse(fs.readFileSync(OUT, 'utf8')), cmd = process.argv[2];
const put = p => { const i = ALL.findIndex(q => q.id === p.id); if (i >= 0) ALL[i] = p; else ALL.push(p); };
const idLN = id => { const m = /_(\d)_(\d+)$/.exec(id); return m ? [+m[1], +m[2]] : null; };
if (cmd === 'rf') {
  const dir = process.argv[3];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8').trim(); if (!txt) continue;
    const p = JSON.parse(txt), [L, n] = idLN(p.id); Object.assign(p, { layer: L, n, belief: p.belief || '' });
    if (p.girl === 'prim') p.feature = 'lightAll';
    put(p); console.log('added', p.id, p.minMoves);
  }
}
if (cmd === 'vel') {
  const got = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  for (let i = ALL.length - 1; i >= 0; i--) if (ALL[i].girl === 'vel' && ALL[i].layer === 2) ALL.splice(i, 1);
  got.forEach(put); console.log('vel', got.length);
}
if (cmd === 'beliefs') {
  const POOL = {
    prim: ['if i stay small, nobody can be disappointed.', 'tracing is safer than trying.', 'i only exist when someone looks at me.', 'quiet girls get to stay.', 'every mistake is a reason to leave.', 'i should be grateful for any attention.', 'the hand knows better than me.', 'if they see the real me, they\'ll go.'],
    trix: ['one wrong step and the whole proof is worthless.', 'cute is the price of being listened to.', 'if it isn\'t optimal, it doesn\'t count.', 'i can\'t rest until it\'s symmetrical.', 'nobody wants the girl who corrects them.', 'feelings are just unsolved equations.', 'second place is first loser.', 'i have to be right to be worth anything.'],
    paige: ['everyone leaves. it\'s just statistics.', 'bet small and you can\'t lose much.', 'luck is the only thing that ever chose me.', 'if i don\'t care, it can\'t hurt.', 'the house always wins. i\'m never the house.', 'keep one foot out the door.', 'the cards already decided.', 'hope is a bad bet.'],
    vel: ['loud is better than empty.', 'nobody takes the party girl seriously.', 'on gray days i\'m nobody.', 'if i slow down, the gray catches up.', 'rules are safer than feelings.', 'i have to be fun to be wanted.', 'every bridge i cross, i burn.', 'too much. always too much.'],
  };
  let k = 0;
  ALL.forEach(p => { if (!p.belief && POOL[p.girl]) { p.belief = POOL[p.girl][(k++ + p.n) % POOL[p.girl].length]; } });
  console.log('beliefs filled', k);
}
fs.writeFileSync(OUT, JSON.stringify(ALL, null, 1));
