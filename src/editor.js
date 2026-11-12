/* =========================================================
   LEVEL EDITOR (LevelEditor.exe)
   For the game designer: every panel sorted by girl → layer, with
   tools to draw or fix a panel, check it with the solver, play it,
   reorder it, and move it to another girl or layer.
   Edits are saved in this browser (localStorage). Export panels.json
   to make them permanent (replace src/panels.json and rebuild).
   ========================================================= */
// v4: every panel is boxes. Edits saved by an older build keep only their hand-edited box panels, laid over the new built-in set.

function edLoad() {
  try {
    const s = JSON.parse(localStorage.getItem('cyfh_level_edits')); if (!s || !Array.isArray(s.panels) || !s.panels.length) return null;
    if (s.v === 4) return s.panels;
    const keep = s.panels.filter(p => p.edited && p.boxes);
    return keep.length ? edMerge(PANELS_BUILTIN, keep, null) : null;
  } catch (e) { return null; }
}
function edPersist() {
  edSync();
  try { localStorage.setItem('cyfh_level_edits', JSON.stringify({ v: 4, panels: PANELS, t: Date.now() })); return true; }
  catch (e) { edMsg('Could not save in this browser (storage full or blocked). Use Export to keep your work.', 'bad'); return false; }
}
/* When the game runs as a claude.ai artifact, edits are also kept in the artifact's shared
   database: every hand-edited level is one document in "levels", and "levelmeta/order" holds
   where every level sits (girl, layer, n) plus the deleted ids. Other devices (and Claude)
   then see the same edits. Elsewhere (GitHub Pages, a local file) only this browser keeps them. */
const EDB = { db: null, sent: {}, sentOrder: '' };
function edMerge(builtin, docs, meta) {
  const out = JSON.parse(JSON.stringify(builtin)), byId = new Map(out.map(p => [p.id, p]));
  docs.forEach(p => { if (byId.has(p.id)) Object.assign(byId.get(p.id), p); else { out.push(p); byId.set(p.id, p); } });
  if (meta) {
    const del = new Set(meta.removed || []);
    Object.entries(meta.order || {}).forEach(([id, [g, l, n]]) => { const p = byId.get(id); if (p) { p.girl = g; p.layer = l; p.n = n; } });
    return out.filter(p => !del.has(p.id));
  }
  return out;
}
async function edDbInit() {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  let db = null; try { db = await window.claude.use('db'); } catch (e) { db = null; }
  if (!db) return;
  EDB.db = db;
  try {
    const timeout = new Promise((_, rj) => setTimeout(() => rj(new Error('timeout')), 10000));
    const [ls, meta] = await Promise.race([Promise.all([db.collection('levels').get(), db.doc('levelmeta/order').get()]), timeout]);
    const docs = ls.docs.map(d => d.data()).filter(p => p && p.id && p.boxes);
    const m = meta && meta.data ? meta.data() : null;
    docs.forEach(p => EDB.sent[p.id] = JSON.stringify(p));
    if (m) EDB.sentOrder = JSON.stringify(m);
    if (!docs.length && !m) { if (PANELS.some(p => p.edited)) edSync(); return; }   // first run: upload what this browser already has
    PANELS = edMerge(PANELS_BUILTIN, docs, m);
    try { localStorage.setItem('cyfh_level_edits', JSON.stringify({ v: 4, panels: PANELS, t: Date.now() })); } catch (e) { }
    UPD.forEach(f => f()); if (WINS.editor) edRender();
  } catch (e) { console.warn('level edits: shared database unavailable', e); }
}
function edSync() {
  const db = EDB.db; if (!db) return;
  const ids = new Set(PANELS.map(p => p.id));
  PANELS.filter(p => p.edited).forEach(p => {
    const j = JSON.stringify(p); if (EDB.sent[p.id] === j) return;
    EDB.sent[p.id] = j; db.doc('levels/' + p.id).set(JSON.parse(j)).catch(e => { delete EDB.sent[p.id]; edMsg('Shared save failed (' + (e.code || e.message) + '): kept in this browser only.', 'bad'); });
  });
  Object.keys(EDB.sent).filter(id => !ids.has(id)).forEach(id => { delete EDB.sent[id]; db.doc('levels/' + id).delete().catch(() => { }); });
  const meta = { order: Object.fromEntries(PANELS.map(p => [p.id, [p.girl, p.layer, p.n]])), removed: PANELS_BUILTIN.map(p => p.id).filter(id => !ids.has(id)), t: Date.now() };
  const mj = JSON.stringify({ order: meta.order, removed: meta.removed });
  if (mj !== EDB.sentOrder) { EDB.sentOrder = mj; db.doc('levelmeta/order').set(meta).catch(() => { EDB.sentOrder = ''; }); }
}
setTimeout(edDbInit, 0);
const ED_GIRLS = ['prim', 'trix', 'paige', 'vel', 'myne'];
const ED_TOOLS = {
  line: [['start', 'Start', 'node', 'Điểm xuất phát (chỉ một)'], ['exit', 'Goal', 'node', 'Ô đích (có thể nhiều)'], ['wall', 'Wall', 'edge', 'Đoạn đứt / tường'], ['hole', 'Hole', 'node', 'Lỗ trên map'],
    ['sketch', 'Pencil', 'edge', 'Nét chì: bắt buộc đi qua'], ['avoid', 'Black pencil', 'edge', 'Chì đen: cấm đi'], ['num', 'Edge count', 'cell', 'Số cạnh trong ô (bấm lại để tăng 0→4, rồi xoá)'],
    ['dot', 'Dot', 'node', 'Chấm bắt buộc'], ['oneway', 'One-way', 'edge', 'Một chiều (bấm lại để đảo chiều, lần 3 xoá)'], ['portal', 'Portal', 'node', 'Bấm 2 điểm để tạo cặp; bấm cổng có sẵn để xoá cặp'],
    ['bridge', 'Overpass', 'node', 'Cầu vượt'], ['plate0', 'Plate ●', 'node', 'Công tắc xanh'], ['plate1', 'Plate ●', 'node', 'Công tắc cam'],
    ['gate0', 'Gate ▮', 'edge', 'Cổng xanh (bấm lại = cổng đảo, lần 3 xoá)'], ['gate1', 'Gate ▮', 'edge', 'Cổng cam (bấm lại = cổng đảo, lần 3 xoá)'], ['erase', 'Erase', 'any', 'Tẩy mọi thứ ở chỗ bấm']],
  box: [['box', 'Box', 'node', 'Đặt hộp; bấm hộp có sẵn để chọn và chỉnh thuộc tính (màu, dây, tên lửa, song sinh, đếm ngược)'],
    ['goal', 'Goal', 'node', 'Ô goal: bấm lại để đổi: nhận mọi hộp → hồng → đỏ → tím → vàng → xanh, rồi xoá'], ['wall', 'Wall', 'edge', 'Tường giữa hai ô'], ['hole', 'Hole', 'node', 'Lỗ trên map'],
    ['light', 'Light', 'node', 'Ô đèn: dây phải nằm trên đó'], ['num', 'Number', 'cell', 'Số giữa bốn ô: số cạnh dây phải đi (bấm lại để tăng 1→4, rồi xoá)'],
    ['pad', 'Arrow tile', 'node', 'Ô mũi tên (bấm lại để xoay →↓←↑, lần 5 xoá)'], ['stop', 'Stop', 'node', 'Ô phanh'], ['oneway', 'One-way', 'edge', 'Khe một chiều (bấm lại để đảo chiều)'],
    ['portal', 'Portal', 'node', 'Bấm 2 ô để tạo cặp'],
    ['switch', 'Switch', 'node', 'Ô chốt: bấm lại để đổi màu xanh → vàng → đỏ, rồi thành công tắc hai màu xanh/vàng → vàng/đỏ → đỏ/xanh (màu đầu dựng sẵn, màu sau hạ sẵn), rồi xoá'],
    ['door', 'Door', 'edge', 'Cửa khoá giữa hai ô: bấm lại để đổi màu xanh → vàng → đỏ, rồi xoá'],
    ['crack', 'Crack', 'node', 'Ô nứt: hộp rời đi là sụp'], ['paint', 'Paint', 'node', 'Ô sơn: hồng → đỏ → tím → vàng → xanh, rồi xoá'], ['erase', 'Erase', 'any', 'Tẩy mọi thứ ở chỗ bấm']],
};
const ED_TAGS = ['', 'basic', 'trail', 'boxes', 'lights', 'nums', 'switches', 'dbl', 'colors', 'paints', 'cracks', 'ends', 'holes', 'oneway', 'portals', 'pads', 'stops', 'dash', 'helpers', 'many', 'budget', 'twin', 'twinrope', 'nolock', 'plates', 'swap'];
let ED = null;
const edClone = o => JSON.parse(JSON.stringify(o));
const edSame = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
function edMsg(t, cls = '') { const m = $('#ed-msg'); if (m) { m.textContent = t; m.className = 'ed-msg ' + cls; } }

function openEditor(id) {
  if (!ED) ED = { girl: 'prim', tool: 'wall', id: null, p: null, dirty: false };
  openWin('editor', { title: 'LevelEditor.exe', icon: 'puzzle', w: 1000, h: 660, x: 40, y: 8, onClose: () => { ED.armed = null; }, render: b => edRender(b) });
  focusWin('editor');
  if (id) edSelect(id, true);
}
function edRender(b) {
  b = b || (WINS.editor && WINS.editor.body); if (!b) return;
  b.innerHTML = `<div class="ed">
    <div class="ed-left sunk">
      <div class="ed-girls">${ED_GIRLS.map(g => `<button class="btn${g === ED.girl ? ' primary' : ''}" data-eg="${g}">${GIRLS[g].name}</button>`).join('')}</div>
      <div class="ed-tree" id="ed-tree"></div>
      <div class="ed-io">
        <button class="btn" id="ed-export" title="Tải panels.json (toàn bộ level) để lưu vĩnh viễn">Export</button>
        <button class="btn" id="ed-copy" title="Chép JSON vào clipboard">Copy JSON</button>
        <label class="btn" title="Nạp panels.json">Import<input type="file" id="ed-import" accept=".json,application/json" hidden></label>
        <button class="btn" id="ed-resetall" title="Bỏ mọi chỉnh sửa trong trình duyệt này, quay về bộ level gốc">Reset all</button>
      </div>
    </div>
    <div class="ed-mid">
      <div class="ed-tools" id="ed-tools"></div>
      <div class="ed-stage sunk"><svg id="ed-svg" role="img" aria-label="Level being edited"></svg></div>
      <div class="ed-msg" id="ed-msg" aria-live="polite"></div>
    </div>
    <div class="ed-right sunk" id="ed-props"></div>
  </div>`;
  $$('[data-eg]', b).forEach(x => x.onclick = () => { SFX.click(); ED.girl = x.dataset.eg; edRender(); });
  $('#ed-export', b).onclick = edExport;
  $('#ed-copy', b).onclick = () => { const t = JSON.stringify(PANELS, null, 1); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => edMsg('JSON copied (' + PANELS.length + ' levels).', 'ok'), () => edMsg('Clipboard blocked here: use Export.', 'bad')); };
  $('#ed-import', b).onchange = e => edImport(e.target.files[0]);
  $('#ed-resetall', b).onclick = e => {
    const bt = e.currentTarget; if (!bt.dataset.sure) { bt.dataset.sure = 1; bt.textContent = 'Sure? click again'; return; }
    PANELS = edClone(PANELS_BUILTIN); try { localStorage.removeItem('cyfh_level_edits'); } catch (er) { }
    if (EDB.db) { Object.keys(EDB.sent).forEach(id => EDB.db.doc('levels/' + id).delete().catch(() => { })); EDB.sent = {}; EDB.sentOrder = ''; EDB.db.doc('levelmeta/order').delete().catch(() => { }); }
    ED.id = ED.p = null; ED.dirty = false; UPD.forEach(f => f()); edRender(); edMsg('Back to the built-in levels.', 'ok');
  };
  edTree(); edTools(); edProps(); edDraw(); edBindSvg();
}
/* ---------------- level list ---------------- */
function edTree() {
  const t = $('#ed-tree'); if (!t) return;
  const list = PANELS.filter(p => p.girl === ED.girl);
  t.innerHTML = [1, 2, 3].map(L => {
    const rows = list.filter(p => p.layer === L).sort((a, c) => a.n - c.n);
    return `<div class="ed-layer"><div class="ed-lh"><b>Layer ${L} · ${REGION[L]}</b><button class="btn ed-mini" data-new="${L}" title="Level mới với một hộp dây">＋ rope</button><button class="btn ed-mini" data-newb="${L}" title="Level mới với một hộp thường">＋ box</button></div>
      ${rows.map((p, i) => `<div class="ed-row${ED.id === p.id ? ' sel' : ''}" data-id="${p.id}"><span class="no">${i + 1}</span><span class="nm">${esc(p.id)}</span>${p.tut ? '<i class="tg tut">TUT</i>' : ''}${p.edited ? '<i class="tg ed">✎</i>' : ''}${p.unsolved ? '<i class="tg bad" title="Chưa có lời giải">!</i>' : ''}<span class="mv"><button class="btn ed-mini" data-up="${p.id}" ${i ? '' : 'disabled'} aria-label="Move up">▲</button><button class="btn ed-mini" data-dn="${p.id}" ${i < rows.length - 1 ? '' : 'disabled'} aria-label="Move down">▼</button></span></div>`).join('') || '<div class="ed-empty">no levels</div>'}</div>`;
  }).join('');
  $$('.ed-row', t).forEach(r => r.onclick = e => { if (e.target.closest('button')) return; edSelect(r.dataset.id); });
  $$('[data-up]', t).forEach(x => x.onclick = () => edMove(x.dataset.up, -1));
  $$('[data-dn]', t).forEach(x => x.onclick = () => edMove(x.dataset.dn, 1));
  $$('[data-new]', t).forEach(x => x.onclick = () => edNew(+x.dataset.new, false));
  $$('[data-newb]', t).forEach(x => x.onclick = () => edNew(+x.dataset.newb, true));
}
function edRenumber(girl, layer) { PANELS.filter(p => p.girl === girl && p.layer === layer).sort((a, c) => a.n - c.n).forEach((p, i) => p.n = i + 1); }
function edMove(id, d) {
  const p = PANELS.find(x => x.id === id); if (!p) return;
  edRenumber(p.girl, p.layer);
  const sib = PANELS.find(x => x.girl === p.girl && x.layer === p.layer && x.n === p.n + d); if (!sib) return;
  [p.n, sib.n] = [sib.n, p.n]; p.edited = sib.edited = true;
  SFX.click(); edPersist(); UPD.forEach(f => f()); edTree();
}
function edSelect(id, force) {
  if (ED.dirty && !force && ED.armed !== id) { ED.armed = id; edMsg('Unsaved changes: click Save, or click that level again to drop them.', 'bad'); return; }
  const p = PANELS.find(x => x.id === id); if (!p) return;
  ED.armed = null; ED.id = id; ED.p = edClone(p); ED.dirty = false; ED.girl = p.girl; ED.selBox = null; ED.portalA = null;
  ED.tool = (ED_TOOLS[p.boxes ? 'box' : 'line'].find(t => t[0] === ED.tool) || ['wall'])[0];
  if (WINS.editor) edRender(); edMsg('');
}
function edNew(layer, box) {
  const id = `${ED.girl}_${layer}_c${Date.now().toString(36).slice(-5)}`;
  const n = Math.max(0, ...PANELS.filter(p => p.girl === ED.girl && p.layer === layer).map(p => p.n)) + 1;
  const p = { id, girl: ED.girl, layer, n, w: 3, h: 3, boxes: [box ? { x: 0, y: 3 } : { x: 0, y: 3, trail: true }], exit: [[3, 0]] };
  Object.assign(p, { belief: '', why: '', edited: true, unsolved: true });
  PANELS.push(p); edPersist(); UPD.forEach(f => f());
  edSelect(id, true); edMsg('New level added at the end of layer ' + layer + '. Draw it, then Check and Save.', 'ok');
}
/* ---------------- tools ---------------- */
function edMode() { return ED.p && ED.p.boxes ? 'box' : 'line'; }
function edTools() {
  const t = $('#ed-tools'); if (!t) return;
  if (!ED.p) { t.innerHTML = '<span class="ed-hint">Chọn một level bên trái, hoặc bấm ＋ để tạo level mới.</span>'; return; }
  t.innerHTML = ED_TOOLS[edMode()].map(([k, nm, , tip]) => `<button class="btn ed-tool${ED.tool === k ? ' on' : ''}${/1$/.test(k) ? ' ch1' : /0$/.test(k) ? ' ch0' : ''}" data-tool="${k}" title="${esc(tip)}">${esc(nm)}</button>`).join('');
  $$('[data-tool]', t).forEach(x => x.onclick = () => { ED.tool = x.dataset.tool; ED.portalA = null; edTools(); edMsg(ED_TOOLS[edMode()].find(q => q[0] === ED.tool)[3]); edDraw(); });
}
// pointer → what the tool acts on
function edTarget(fx, fy, kind) {
  const p = ED.p, E = PanelEngine;
  const node = () => { const x = Math.round(fx), y = Math.round(fy); return Math.hypot(fx - x, fy - y) < .42 && x >= 0 && y >= 0 && x <= p.w && y <= p.h ? { t: 'node', v: [x, y], d: Math.hypot(fx - x, fy - y) } : null; };
  const edge = () => {
    const c = [[Math.floor(fx), Math.round(fy), Math.floor(fx) + 1, Math.round(fy)], [Math.round(fx), Math.floor(fy), Math.round(fx), Math.floor(fy) + 1]]
      .filter(e => e[0] >= 0 && e[1] >= 0 && e[2] <= p.w && e[3] <= p.h)
      .map(e => ({ t: 'edge', v: e, d: Math.hypot(fx - (e[0] + e[2]) / 2, fy - (e[1] + e[3]) / 2) })).sort((a, b) => a.d - b.d)[0];
    return c && c.d < .4 ? c : null;
  };
  const cell = () => { const x = Math.floor(fx), y = Math.floor(fy); return x >= 0 && y >= 0 && x < p.w && y < p.h ? { t: 'cell', v: [x, y], d: Math.hypot(fx - x - .5, fy - y - .5) } : null; };
  if (kind === 'node') return node();
  if (kind === 'edge') return edge();
  if (kind === 'cell') return cell();
  return [node(), edge(), cell()].filter(Boolean).sort((a, b) => a.d - b.d)[0] || null;
}
const ekOf = e => PanelEngine.ekey(e[0], e[1], e[2], e[3]);
function edToggle(arr, item, eq) { const i = arr.findIndex(eq); if (i >= 0) arr.splice(i, 1); else arr.push(item); return arr; }
function edApply(tg) {
  const p = ED.p, tool = ED.tool, E = PanelEngine, L = k => (p[k] = p[k] || []);
  const atN = (a, v) => a[0] === v[0] && a[1] === v[1];
  if (tg.t === 'node') {
    const v = tg.v;
    switch (tool) {
      case 'start': p.start = [v.slice()]; break;
      case 'exit': edToggle(L('exit'), v.slice(), a => atN(a, v)); break;
      case 'goal': {
        const i = L('exit').findIndex(a => atN(a, v));
        // any box → her own colour → other selves 1..3 → gone
        if (i < 0) p.exit.push(v.slice()); else { const c = p.exit[i][2]; if (c === 4) p.exit.splice(i, 1); else p.exit[i] = [v[0], v[1], c == null ? 0 : c + 1]; }
        break;
      }
      case 'light': edToggle(L('lights'), v.slice(), a => atN(a, v)); break;
      case 'crack': edToggle(L('cracks'), v.slice(), a => atN(a, v)); break;
      case 'paint': {
        const i = L('paints').findIndex(a => atN(a, v));
        if (i < 0) p.paints.push([v[0], v[1], 0]); else if (p.paints[i][2] < 4) p.paints[i][2]++; else p.paints.splice(i, 1);
        break;
      }
      case 'switch': {
        const seq = [[1], [2], [3], [1, 2], [2, 3], [3, 1]], i = L('switches').findIndex(a => atN(a, v));
        if (i < 0) { p.switches.push([v[0], v[1], 1]); break; }
        const cur = p.switches[i], k = seq.findIndex(q => q[0] === cur[2] && (q[1] ?? null) === (cur[3] ?? null));
        if (k < 0 || k === seq.length - 1) p.switches.splice(i, 1); else p.switches[i] = [v[0], v[1], ...seq[k + 1]];
        break;
      }
      case 'hole': edToggle(L('holes'), v.slice(), a => atN(a, v)); break;
      case 'dot': edToggle(L('dots'), v.slice(), a => atN(a, v)); break;
      case 'bridge': edToggle(L('bridges'), v.slice(), a => atN(a, v)); break;
      case 'stop': edToggle(L('stops'), v.slice(), a => atN(a, v)); break;
      case 'plate0': case 'plate1': {
        const ch = +tool.slice(-1), i = L('plates').findIndex(a => atN(a, v));
        if (i >= 0 && p.plates[i][2] === ch) p.plates.splice(i, 1); else if (i >= 0) p.plates[i][2] = ch; else p.plates.push([v[0], v[1], ch]); break;
      }
      case 'pad': {
        const D = [[1, 0], [0, 1], [-1, 0], [0, -1]], i = L('pads').findIndex(a => atN(a, v));
        if (i < 0) p.pads.push([v[0], v[1], 1, 0]);
        else { const k = D.findIndex(d => d[0] === p.pads[i][2] && d[1] === p.pads[i][3]); if (k === 3) p.pads.splice(i, 1); else { p.pads[i][2] = D[k + 1][0]; p.pads[i][3] = D[k + 1][1]; } }
        break;
      }
      case 'portal': {
        const i = L('portals').findIndex(q => atN(q, v) || (q[2] === v[0] && q[3] === v[1]));
        if (i >= 0) { p.portals.splice(i, 1); ED.portalA = null; break; }
        if (!ED.portalA) { ED.portalA = v.slice(); edMsg('Now click the other end of the portal.'); return; }
        if (!atN(ED.portalA, v)) p.portals.push([...ED.portalA, ...v]);
        ED.portalA = null; break;
      }
      case 'box': {
        const i = p.boxes.findIndex(b => b.x === v[0] && b.y === v[1]);
        if (i >= 0) { ED.selBox = i; edProps(); edDraw(); return; }
        p.boxes.push({ x: v[0], y: v[1] }); ED.selBox = p.boxes.length - 1; break;
      }
      case 'erase': {
        ['exit', 'holes', 'dots', 'bridges', 'stops', 'lights', 'cracks', 'paints', 'switches'].forEach(k => { if (p[k]) p[k] = p[k].filter(a => !atN(a, v)); });
        ['plates', 'pads'].forEach(k => { if (p[k]) p[k] = p[k].filter(a => !atN(a, v)); });
        if (p.portals) p.portals = p.portals.filter(q => !atN(q, v) && !(q[2] === v[0] && q[3] === v[1]));
        if (p.boxes && p.boxes.length > 1) { p.boxes = p.boxes.filter(b => !(b.x === v[0] && b.y === v[1])); ED.selBox = null; }
        break;
      }
      default: return;
    }
  } else if (tg.t === 'edge') {
    const e = tg.v, k = ekOf(e), at = a => ekOf(a) === k;
    switch (tool) {
      case 'wall': edToggle(L('broken'), e.slice(), at); break;
      case 'sketch': edToggle(L('sketch'), e.slice(), at); if (p.avoid) p.avoid = p.avoid.filter(a => !at(a)); break;
      case 'avoid': edToggle(L('avoid'), e.slice(), at); if (p.sketch) p.sketch = p.sketch.filter(a => !at(a)); break;
      case 'oneway': {
        const i = L('oneway').findIndex(at);
        if (i < 0) p.oneway.push(e.slice()); else if (p.oneway[i][0] === e[0] && p.oneway[i][1] === e[1]) p.oneway[i] = [e[2], e[3], e[0], e[1]]; else p.oneway.splice(i, 1);
        break;
      }
      case 'gate0': case 'gate1': {
        const ch = +tool.slice(-1), i = L('gates').findIndex(at);
        if (i < 0) p.gates.push([...e, ch, 0]);
        else if (p.gates[i][4] !== ch) { p.gates[i][4] = ch; p.gates[i][5] = 0; }
        else if (!p.gates[i][5]) p.gates[i][5] = 1; else p.gates.splice(i, 1);
        break;
      }
      case 'door': {
        const i = L('doors').findIndex(at);
        if (i < 0) p.doors.push([...e, 1]); else if (p.doors[i][4] < 3) p.doors[i][4]++; else p.doors.splice(i, 1);
        if (p.broken) p.broken = p.broken.filter(a => !at(a));
        break;
      }
      case 'erase': ['broken', 'sketch', 'avoid', 'oneway', 'gates', 'doors'].forEach(kk => { if (p[kk]) p[kk] = p[kk].filter(a => !at(a)); }); break;
      default: return;
    }
  } else if (tg.t === 'cell') {
    const [x, y] = tg.v, i = (p.nums || []).findIndex(a => a[0] === x && a[1] === y);
    if (ED.tool === 'num') { if (i < 0) L('nums').push([x, y, p.boxes ? 1 : 0]); else if (p.nums[i][2] < 4) p.nums[i][2]++; else p.nums.splice(i, 1); }
    else if (ED.tool === 'erase') { if (i >= 0) p.nums.splice(i, 1); if (p.squares) p.squares = p.squares.filter(a => !(a[0] === x && a[1] === y)); }
    else return;
  }
  ED.dirty = true; edInvalidate(); SFX.tick(); edDraw(); edProps(); edMsg(ED.portalA ? 'Now click the other end of the portal.' : '');
}
function edInvalidate() { ['sol', 'solIn', 'solutions', 'minMoves', 'luck', 'quality'].forEach(k => delete ED.p[k]); ED.p.unsolved = true; }
/* ---------------- tidy a panel before saving / playing ---------------- */
function edNorm(src) {
  const p = edClone(src), E = PanelEngine, inB = ([x, y]) => x >= 0 && y >= 0 && x <= p.w && y <= p.h;
  const nodesOk = a => inB(a) && !(p.holes || []).some(h => h[0] === a[0] && h[1] === a[1]);
  ['exit', 'dots', 'bridges', 'stops', 'holes', 'lights', 'cracks', 'paints', 'switches'].forEach(k => { if (p[k]) p[k] = p[k].filter(a => inB(a)); });
  ['exit', 'dots', 'bridges', 'stops', 'lights', 'cracks', 'paints', 'switches'].forEach(k => { if (p[k]) p[k] = p[k].filter(nodesOk); });
  ['plates', 'pads'].forEach(k => { if (p[k]) p[k] = p[k].filter(a => nodesOk(a)); });
  if (p.portals) p.portals = p.portals.filter(q => nodesOk([q[0], q[1]]) && nodesOk([q[2], q[3]]));
  ['broken', 'sketch', 'avoid', 'oneway', 'gates', 'doors'].forEach(k => { if (p[k]) p[k] = p[k].filter(e => nodesOk([e[0], e[1]]) && nodesOk([e[2], e[3]])); });
  if (p.nums) p.nums = p.nums.filter(([x, y]) => x < p.w && y < p.h);
  if (p.boxes) { p.boxes = p.boxes.filter(b => nodesOk([b.x, b.y])); delete p.start; delete p.mirror; delete p.visitAll; }
  else {
    const s0 = (p.start || []).filter(nodesOk)[0] || [0, p.h];
    if (p.mirror) {
      p.mirror = 'x'; const m = E.mirrorOf(p, s0); p.start = [s0, m];
      const ex = []; (p.exit || []).forEach(a => [a, E.mirrorOf(p, a)].forEach(b => { if (!ex.some(c => edSame(c, b))) ex.push(b); })); p.exit = ex;
    } else p.start = [s0];
  }
  Object.keys(p).forEach(k => { if (Array.isArray(p[k]) && !p[k].length && !['exit', 'start', 'boxes'].includes(k)) delete p[k]; });
  return p;
}
/* ---------------- solver check ---------------- */
function edCheck(cb) {
  if (!ED.p) return;
  const p = edNorm(ED.p), E = PanelEngine;
  const probs = [];
  if (!(p.exit || []).length) probs.push('no goal');
  if (p.boxes && !p.boxes.length) probs.push('no box');
  if (p.boxes && p.exit.length > p.boxes.length) probs.push('more goals than boxes');
  if (probs.length) { edMsg('Cannot check: ' + probs.join(', ') + '.', 'bad'); return; }
  edMsg('Solving…');
  setTimeout(() => {
    const t0 = performance.now();
    if (p.boxes) {
      const r = E.boxSolve(p, 40, 6, 300000);
      if (r.wins.length) Object.assign(ED.p, { solIn: r.wins[0], minMoves: r.wins[0].length, solutions: r.wins.length >= 6 ? '6+' : r.wins.length, unsolved: false });
      else { edInvalidate(); }
      edMsg(r.wins.length ? `Solvable · shortest ${r.wins[0].length} moves · ${r.wins.length >= 6 ? '6+' : r.wins.length} shortest answer(s) · ${r.explored} positions checked (${Math.round(performance.now() - t0)} ms)`
        : r.capped ? 'Too big to finish checking (more than 300 000 positions). Add walls or make it smaller.' : 'No solution within 40 moves.', r.wins.length ? 'ok' : 'bad');
    } else {
      const sols = E.solve(p, 61, 2500000);
      if (sols.length) {
        const best = sols.map(s => ({ s, m: E.replay(p, s).moves })).sort((a, b) => a.m - b.m)[0];
        Object.assign(ED.p, { sol: best.s, minMoves: best.m, solutions: sols.length > 60 ? '60+' : sols.length, unsolved: false });
      } else edInvalidate();
      edMsg(sols.length ? `Solvable · ${sols.length > 60 ? 'more than 60' : sols.length} answer(s)${sols.capped ? ' (stopped early, maybe more)' : ''} · shortest ${ED.p.minMoves} moves (${Math.round(performance.now() - t0)} ms)`
        : sols.capped ? 'Stopped early: the board is too open to check fully. Add clues or walls.' : 'No solution: the line cannot reach a goal while keeping every rule.', sols.length ? (sols.length === 1 ? 'ok' : '') : 'bad');
    }
    edProps(); edTree(); if (cb) cb();
  }, 30);
}
/* ---------------- save / play / delete ---------------- */
function edSave() {
  if (!ED.p) return;
  const p = edNorm(ED.p); p.edited = true;
  const i = PANELS.findIndex(x => x.id === ED.id);
  const old = i >= 0 ? PANELS[i] : null;
  if (old && (old.girl !== p.girl || old.layer !== p.layer)) p.n = Math.max(0, ...PANELS.filter(x => x.girl === p.girl && x.layer === p.layer).map(x => x.n)) + 1;
  if (i >= 0) PANELS[i] = p; else PANELS.push(p);
  if (old) edRenumber(old.girl, old.layer); edRenumber(p.girl, p.layer);
  ED.p = edClone(p); ED.dirty = false; ED.girl = p.girl;
  edPersist(); UPD.forEach(f => f()); edTree(); edProps();
  edMsg(p.unsolved ? 'Saved (not checked yet: press Check so Solution mode and hints work).' : 'Saved.', p.unsolved ? '' : 'ok');
}
function edPlay() {
  if (!ED.p) return;
  const p = edNorm(ED.p);
  if (!(p.exit || []).length) { edMsg('Add a goal first.', 'bad'); return; }
  const go = () => { const q = edNorm(ED.p); if (WINS.projector) openProjector(q); else { ['feedcam', 'magnifier'].forEach(closeWin); openProjector(q); } };
  if (ED.p.unsolved) edCheck(go); else go();
}
function edDelete(bt) {
  if (!ED.p) return;
  if (!bt.dataset.sure) { bt.dataset.sure = 1; bt.textContent = 'Delete? click again'; return; }
  const i = PANELS.findIndex(x => x.id === ED.id);
  if (i >= 0) { const o = PANELS[i]; PANELS.splice(i, 1); edRenumber(o.girl, o.layer); }
  ED.id = ED.p = null; ED.dirty = false; edPersist(); UPD.forEach(f => f()); edRender(); edMsg('Level deleted.', 'ok');
}
function edDuplicate() {
  if (!ED.p) return;
  const p = edNorm(ED.p); p.id = `${p.girl}_${p.layer}_c${Date.now().toString(36).slice(-5)}`; p.n = Math.max(0, ...PANELS.filter(x => x.girl === p.girl && x.layer === p.layer).map(x => x.n)) + 1; p.edited = true; delete p.tut;
  PANELS.push(p); edPersist(); UPD.forEach(f => f()); edSelect(p.id, true); edMsg('Copy made at the end of the layer.', 'ok');
}
async function edExport() {
  const t = JSON.stringify(PANELS, null, 1);
  let dl = null;
  if (window.claude && typeof window.claude.use === 'function') { try { dl = await window.claude.use('downloads'); } catch (e) { dl = null; } }
  if (dl) {
    try { await dl.save({ filename: 'panels.json', data: new Blob([t], { type: 'application/json' }) }); edMsg(`Exported panels.json (${PANELS.length} levels).`, 'ok'); }
    catch (e) { edMsg(e && e.code === 'declined' ? 'Export cancelled.' : 'Export unavailable here: use Copy JSON.', e && e.code === 'declined' ? '' : 'bad'); }
    return;
  }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'application/json' })); a.download = 'panels.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    edMsg(`Exported panels.json (${PANELS.length} levels). Put it in src/ and rebuild to make the edits permanent.`, 'ok');
  } catch (e) { edMsg('Download blocked here: use Copy JSON.', 'bad'); }
}
function edImport(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const arr = JSON.parse(r.result);
      if (!Array.isArray(arr) || !arr.every(p => p && p.id && p.girl && p.layer && p.w !== undefined)) throw new Error('not a panels.json');
      PANELS = arr; edPersist(); ED.id = ED.p = null; ED.dirty = false; UPD.forEach(f => f()); edRender(); edMsg(`Imported ${arr.length} levels.`, 'ok');
    } catch (e) { edMsg('Import failed: ' + e.message, 'bad'); }
  };
  r.readAsText(file);
}
/* ---------------- properties panel ---------------- */
function edProps() {
  const b = $('#ed-props'); if (!b) return;
  if (!ED.p) { b.innerHTML = '<div class="ed-hint">LevelEditor.exe<br><br>Trái: danh sách level theo nhân vật → layer (▲▼ để đổi thứ tự).<br>Giữa: chọn công cụ rồi bấm lên bàn.<br>Phải: thuộc tính, Check (giải thử), Play, Save.<br><br>Mọi thay đổi lưu trong trình duyệt này. Dùng Export để giữ vĩnh viễn.</div>'; return; }
  const p = ED.p, box = !!p.boxes, sb = box && ED.selBox != null ? p.boxes[ED.selBox] : null;
  const st = p.unsolved ? '<span class="bad">not checked / no solution</span>' : `<span class="ok">${p.solutions} answer(s) · ${p.minMoves} moves</span>`;
  b.innerHTML = `<div class="ed-pp">
    <div class="ed-id">${esc(ED.id)}${ED.dirty ? ' <b class="bad">●</b>' : ''}</div>
    <label>Girl <select id="ep-girl">${ED_GIRLS.map(g => `<option value="${g}"${g === p.girl ? ' selected' : ''}>${GIRLS[g].name}</option>`).join('')}</select></label>
    <label>Layer <select id="ep-layer">${[1, 2, 3].map(l => `<option${l === p.layer ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>${box ? 'Tiles' : 'Cells'} <input id="ep-w" type="number" min="1" max="8" value="${box ? p.w + 1 : p.w}"> × <input id="ep-h" type="number" min="1" max="8" value="${box ? p.h + 1 : p.h}"></label>
    ${box ? '' : `<label><input type="checkbox" id="ep-mirror" ${p.mirror ? 'checked' : ''}> Mirror line (other hand)</label><label><input type="checkbox" id="ep-all" ${p.visitAll ? 'checked' : ''}> Visit every point</label>`}
    <label>Tutorial tag <select id="ep-tut">${ED_TAGS.map(t => `<option value="${t}"${(p.tut || '') === t ? ' selected' : ''}>${t || '—'}</option>`).join('')}</select></label>
    ${sb ? `<fieldset class="ed-box"><legend>Selected box</legend>
      <label>Colour <select id="eb-c"><option value=""${sb.c == null ? ' selected' : ''}>her own</option>${['pink (Prim)', 'red (Trix)', 'purple (Paige)', 'yellow (Vel)', 'blue (Myne)'].map((nm, c) => `<option value="${c}"${sb.c === c ? ' selected' : ''}>${nm}</option>`).join('')}</select></label>
      <label><input type="checkbox" id="eb-rope" ${sb.trail ? 'checked' : ''}> Rope box</label>
      <label><input type="checkbox" id="eb-dash" ${sb.dash ? 'checked' : ''}> Rocket box</label>
      <label><input type="checkbox" id="eb-twin" ${sb.m === 'opp' ? 'checked' : ''}> Reverse twin</label>
      <label>Bomb (presses) <input id="eb-n" type="number" min="0" max="30" placeholder="none" value="${sb.n ?? ''}"></label>
      <button class="btn" id="eb-del" ${p.boxes.length < 2 ? 'disabled' : ''}>Remove box</button></fieldset>` : box ? '<div class="ed-hint">Box tool: click a box to edit it.</div>' : ''}
    <label class="col">Belief (story) <textarea id="ep-belief" rows="2">${esc(p.belief || '')}</textarea></label>
    <label class="col">Key idea (Solution mode) <textarea id="ep-why" rows="3">${esc(p.why || '')}</textarea></label>
    <div class="ed-state">${st}</div>
    <div class="ed-acts">
      <button class="btn" id="ep-check" title="Giải thử bằng máy">Check</button>
      <button class="btn" id="ep-play" title="Chơi thử trong máy chiếu">Play ▸</button>
      <button class="btn primary" id="ep-save">Save</button>
      <button class="btn" id="ep-revert" ${ED.dirty ? '' : 'disabled'}>Revert</button>
      <button class="btn" id="ep-dup">Duplicate</button>
      <button class="btn" id="ep-del">Delete</button>
    </div></div>`;
  const ch = (id, f) => { const el = $(id, b); if (el) el.onchange = () => { f(el); ED.dirty = true; edInvalidate(); edDraw(); edProps(); }; };
  ch('#ep-girl', el => { p.girl = el.value; }); ch('#ep-layer', el => { p.layer = +el.value; });
  ch('#ep-w', el => { const v = Math.max(1, Math.min(8, +el.value || 1)); p.w = box ? Math.max(1, v - 1) : v; });
  ch('#ep-h', el => { const v = Math.max(1, Math.min(8, +el.value || 1)); p.h = box ? Math.max(1, v - 1) : v; });
  ch('#ep-mirror', el => { if (el.checked) p.mirror = 'x'; else { delete p.mirror; p.start = [p.start[0]]; } });
  ch('#ep-all', el => { if (el.checked) p.visitAll = true; else delete p.visitAll; });
  const tut = $('#ep-tut', b); if (tut) tut.onchange = () => { if (tut.value) p.tut = tut.value; else delete p.tut; ED.dirty = true; edProps(); };
  ['belief', 'why'].forEach(k => { const el = $('#ep-' + k, b); el.oninput = () => { p[k] = el.value; ED.dirty = true; const d = $('.ed-id', b); if (d && !d.querySelector('.bad')) d.insertAdjacentHTML('beforeend', ' <b class="bad">●</b>'); }; });
  if (sb) {
    ch('#eb-twin', el => { if (el.checked) sb.m = 'opp'; else delete sb.m; });
    ch('#eb-c', el => { if (el.value !== '') sb.c = +el.value; else delete sb.c; });
    ch('#eb-dash', el => { if (el.checked) sb.dash = true; else delete sb.dash; });
    ch('#eb-rope', el => { if (el.checked) sb.trail = true; else delete sb.trail; });
    ch('#eb-n', el => { if (el.value === '') delete sb.n; else sb.n = Math.max(0, +el.value); });
    $('#eb-del', b).onclick = () => { p.boxes.splice(ED.selBox, 1); ED.selBox = null; ED.dirty = true; edInvalidate(); edDraw(); edProps(); };
  }
  $('#ep-check', b).onclick = () => edCheck();
  $('#ep-play', b).onclick = edPlay;
  $('#ep-save', b).onclick = edSave;
  $('#ep-revert', b).onclick = () => edSelect(ED.id, true);
  $('#ep-dup', b).onclick = edDuplicate;
  $('#ep-del', b).onclick = e => edDelete(e.currentTarget);
}
/* ---------------- board ---------------- */
function edDraw(hover) {
  const svg = $('#ed-svg'); if (!svg) return;
  if (!ED.p) { svg.innerHTML = ''; return; }
  const p = edNorm(ED.p);
  svg.setAttribute('viewBox', vb(p, p.boxes ? .7 : .9));
  let h = '';
  // faint grid of every node so holes and empty spots can still be clicked
  for (let y = 0; y <= p.h; y++) for (let x = 0; x <= p.w; x++) h += `<circle class="ed-node" cx="${x}" cy="${y}" r=".06"/>`;
  h += p.boxes ? boxBoardSVG(p, {}) : boardSVG(p, { seen: new Set() });
  if (!p.boxes) (p.start || []).forEach(([x, y], i) => { h += `<rect class="ed-start${i ? ' other' : ''}" x="${x - .16}" y="${y - .16}" width=".32" height=".32" rx=".06"/>`; });
  (p.holes || []).forEach(([x, y]) => { h += `<path class="ed-hole" d="M${x - .2} ${y - .2}L${x + .2} ${y + .2}M${x + .2} ${y - .2}L${x - .2} ${y + .2}"/>`; });
  if (p.boxes && ED.selBox != null && p.boxes[ED.selBox]) { const b = p.boxes[ED.selBox]; h += `<rect class="ed-sel" x="${b.x - .42}" y="${b.y - .42}" width=".84" height=".84" rx=".12"/>`; }
  if (ED.portalA) h += `<circle class="ed-pend" cx="${ED.portalA[0]}" cy="${ED.portalA[1]}" r=".32"/>`;
  if (hover) {
    if (hover.t === 'node') h += `<circle class="ed-hov" cx="${hover.v[0]}" cy="${hover.v[1]}" r=".3"/>`;
    if (hover.t === 'edge') h += `<line class="ed-hov" x1="${hover.v[0]}" y1="${hover.v[1]}" x2="${hover.v[2]}" y2="${hover.v[3]}"/>`;
    if (hover.t === 'cell') h += `<rect class="ed-hov" x="${hover.v[0] + .1}" y="${hover.v[1] + .1}" width=".8" height=".8" rx=".1"/>`;
  }
  svg.innerHTML = h;
}
function edBindSvg() {
  const svg = $('#ed-svg'); if (!svg) return;
  const kind = () => (ED_TOOLS[edMode()].find(t => t[0] === ED.tool) || [, , 'any'])[2];
  svg.onpointermove = e => { if (!ED.p) return; const [fx, fy] = svgPt(svg, e); edDraw(edTarget(fx, fy, kind())); };
  svg.onpointerleave = () => edDraw();
  svg.onpointerdown = e => { if (!ED.p) return; const [fx, fy] = svgPt(svg, e), tg = edTarget(fx, fy, kind()); if (tg) edApply(tg); };
}
