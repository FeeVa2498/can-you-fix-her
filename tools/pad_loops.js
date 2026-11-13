// Find arrow tiles (pads) that throw a box back and forth: from a pad, slide along its arrow; if the slide reaches
// another pad pointing the opposite way (or the slide ever revisits the same tile+direction) it's a ping-pong.
// node tools/pad_loops.js            list   |   node tools/pad_loops.js fix   remove one pad of each pair? (no: list only)
const P = require('../src/panels.json');
const K = (x, y) => x + ',' + y;
function blocked(p, x, y) {
  if (x < 0 || y < 0 || x > p.w || y > p.h) return true;
  const at = a => (a || []).some(q => q[0] === x && q[1] === y);
  return at(p.holes) || at(p.touch) || at(p.broken);
}
function pingPong(p) {
  const pads = new Map((p.pads || []).map(q => [K(q[0], q[1]), [q[2], q[3]]])), bad = [];
  for (const [k, d0] of pads) {
    let [x, y] = k.split(',').map(Number), d = d0; const seen = new Set();
    for (let s = 0; s < 200; s++) {
      const st = K(x, y) + '|' + d; if (seen.has(st)) { bad.push(k); break; } seen.add(st);
      const nx = x + d[0], ny = y + d[1]; if (blocked(p, nx, ny)) break;
      x = nx; y = ny; const pd = pads.get(K(x, y));
      if (pd) { if (pd[0] === -d[0] && pd[1] === -d[1]) { bad.push(k); break; } d = pd; }
      else if ((p.stops || []).some(q => q[0] === x && q[1] === y)) break;
    }
  }
  return bad;
}
if (require.main === module) {
const out = P.filter(p => !p.ray && (p.pads || []).length).map(p => ({ p, bad: pingPong(p) })).filter(o => o.bad.length);
out.forEach(o => console.log(o.p.id.padEnd(12), 'n', o.p.n, 'layer', o.p.layer, 'pads', JSON.stringify(o.p.pads), 'bad', o.bad.join(' ')));
console.log(out.length, 'panels');
}
module.exports = { pingPong };
