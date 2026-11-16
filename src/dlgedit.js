/* =========================================================
   DIALOGUE EDITOR (Designer kit ▸ Dialogue)
   Read every line of data/dialogue.xlsx inside the game and rewrite it.
   Edits are kept per cell: { sheet: { row: { col: { v: new text, o: text it replaced } } } }.
   They live in this browser (localStorage) and, when the game runs as a claude.ai
   artifact, in its shared database too (doc dlgedits/all), so Claude can read them back
   and write them into dialogue.xlsx for good. Applied on top of the workbook at load,
   and straight away with "Apply".
   ========================================================= */
const DLG_KEY = 'cyfh_dlg_edits';
const DLG_SHEETS = ['session', 'morning', 'night_boss', 'night_index', 'night_lines', 'first_message', 'journal', 'act5_ending', 'news'];
const DLG_LINE = ['type', 'who', 'emo', 'text'];                 // shown on every line
const DLG_MORE = ['requires', 'effects', 'journal', 'note'];      // under "more"
let DLG_BASE = null;                                              // the workbook's own text, before edits
const DLG = { sheet: 'night_lines', q: '', page: 0, onlyEdited: false, open: {}, db: null, dbT: 0 };

function dlgLoad() { try { const o = JSON.parse(localStorage.getItem(DLG_KEY)); return o && o.e ? o : { e: {}, t: 0 }; } catch (e) { return { e: {}, t: 0 }; } }
let DLG_ED = dlgLoad();
function dlgCount() { let n = 0; for (const s in DLG_ED.e) for (const r in DLG_ED.e[s]) n += Object.keys(DLG_ED.e[s][r]).length; return n; }
function dlgPersist() {
  DLG_ED.t = Date.now();
  try { localStorage.setItem(DLG_KEY, JSON.stringify(DLG_ED)); } catch (e) { }
  clearTimeout(DLG.dbT); DLG.dbT = setTimeout(dlgDbPush, 800);
}
function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function csvText(rows) { return rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n'; }

// the workbook text with the edits laid over it
function dlgApply(texts) {
  DLG_BASE = { ...texts };
  const out = { ...texts };
  for (const sh in DLG_ED.e) {
    if (!out[sh]) continue;
    const rows = parseCSV(out[sh]), head = (rows[0] || []).map(h => h.trim().toLowerCase());
    for (const r in DLG_ED.e[sh]) {
      const i = +r - 1; if (i < 1) continue;
      while (rows.length <= i) rows.push([]);
      for (const col in DLG_ED.e[sh][r]) {
        const k = head.indexOf(col); if (k < 0) continue;
        while (rows[i].length <= k) rows[i].push('');
        rows[i][k] = DLG_ED.e[sh][r][col].v;
      }
    }
    out[sh] = csvText(rows);
  }
  return out;
}
// recompile the dialogue with the current edits (no reload)
function dlgRecompile() {
  if (!DLG_BASE) return;
  DATA_ISSUES.length = 0;
  const src = DD.source; DD = compileData(dlgApply(DLG_BASE)); DD.source = src;
  return DATA_ISSUES.slice();
}

/* ---- shared database (claude.ai artifact) ---- */
async function dlgDbInit() {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  let db = null; try { db = await window.claude.use('db'); } catch (e) { db = null; }
  if (!db) return; DLG.db = db;
  try {
    const d = await db.doc('dlgedits/all').get(), o = d && d.data ? d.data() : null;
    if (o && o.e && (o.t || 0) > (DLG_ED.t || 0)) {
      DLG_ED = { e: o.e, t: o.t };
      try { localStorage.setItem(DLG_KEY, JSON.stringify(DLG_ED)); } catch (e) { }
      dlgRecompile(); const kb = $('#kit-body'); if (kb && KIT.tab === 'dlg') kitDialogue(kb);
    } else if (dlgCount() && (!o || (o.t || 0) < (DLG_ED.t || 0))) dlgDbPush();
  } catch (e) { console.warn('dialogue edits: shared database unavailable', e); }
}
function dlgDbPush() { if (DLG.db) DLG.db.doc('dlgedits/all').set({ e: DLG_ED.e, t: DLG_ED.t, n: dlgCount() }).catch(() => { }); }

/* ---- the editor ---- */
function dlgRows(sheet) {
  const base = DLG_BASE && DLG_BASE[sheet]; if (!base) return { head: [], rows: [] };
  const rows = parseCSV(base), head = (rows[0] || []).map(h => h.trim().toLowerCase());
  const ed = DLG_ED.e[sheet] || {};
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const n = i + 1, o = {}; head.forEach((h, k) => { if (h) o[h] = rows[i][k] || ''; });
    const e = ed[n] || {}; const cur = { ...o }; for (const c in e) cur[c] = e[c].v;
    if (Object.values(cur).every(v => !String(v).trim()) && !Object.keys(e).length) continue;
    out.push({ n, base: o, cur, edited: Object.keys(e), stale: Object.keys(e).filter(c => e[c].o !== o[c]) });
  }
  return { head, rows: out };
}
// rows sharing an id (or a blank id under it) form one conversation
function dlgGroups(rows) {
  const gs = []; let g = null;
  rows.forEach(r => { if (r.cur.id || !g) { g = { id: r.cur.id || '(no id)', rows: [] }; gs.push(g); } g.rows.push(r); });
  return gs;
}
const DLG_PER = 20;
function kitDialogue(el) {
  const { head, rows } = dlgRows(DLG.sheet);
  const q = DLG.q.trim().toLowerCase();
  let gs = dlgGroups(rows);
  if (q) gs = gs.filter(g => g.id.toLowerCase().includes(q) || g.rows.some(r => Object.values(r.cur).some(v => String(v).toLowerCase().includes(q))));
  if (DLG.onlyEdited) gs = gs.filter(g => g.rows.some(r => r.edited.length));
  const pages = Math.max(1, Math.ceil(gs.length / DLG_PER)); DLG.page = clamp(DLG.page, 0, pages - 1);
  const show = gs.slice(DLG.page * DLG_PER, DLG.page * DLG_PER + DLG_PER);
  const meta = head.filter(h => h && h !== 'id' && !DLG_LINE.includes(h) && !DLG_MORE.includes(h));
  const lineCols = DLG_LINE.filter(h => head.includes(h)), moreCols = DLG_MORE.filter(h => head.includes(h));
  const n = dlgCount(), nSheet = Object.values(DLG_ED.e[DLG.sheet] || {}).reduce((a, r) => a + Object.keys(r).length, 0);
  const cell = (r, c, cls) => {
    const v = r.cur[c], ed = r.edited.includes(c), st = r.stale.includes(c);
    const tag = c === 'text' || c === 'note' || c === 'effects' || c === 'requires' || c === 'journal' ? 'textarea' : 'input';
    const attrs = `class="dlg-in ${cls || ''}${ed ? ' ed' : ''}${st ? ' stale' : ''}" data-r="${r.n}" data-c="${c}" title="${esc(c)}${ed ? ' · edited (was: ' + esc(r.base[c] || '∅') + ')' : ''}${st ? ' · the workbook changed this cell since your edit' : ''}" placeholder="${esc(c)}"`;
    return tag === 'textarea' ? `<textarea ${attrs} rows="${Math.max(1, Math.ceil(String(v).length / 70))}">${esc(v)}</textarea>` : `<input ${attrs} value="${esc(v)}">`;
  };
  const playable = DLG.sheet === 'night_lines' || DLG.sheet === 'night_boss';
  el.innerHTML = `<p class="kit-p">Read and rewrite any line of the game. Edits are saved in this browser${DLG.db ? ' and in the artifact\'s shared data (Claude can read them and put them into dialogue.xlsx)' : ''}. Press <b>Apply</b> to use them right away. Edited cells are pink; hover one to see the old text.</p>
    <div class="kit-row dlg-tabs">${DLG_SHEETS.map(s => { const k = Object.values(DLG_ED.e[s] || {}).reduce((a, r) => a + Object.keys(r).length, 0); return `<button class="btn${s === DLG.sheet ? ' primary' : ''}" data-sh="${s}">${s}${k ? ` <small>·${k}</small>` : ''}</button>`; }).join('')}</div>
    <div class="kit-row"><input id="dlg-q" class="dlg-q" placeholder="search id or text…" value="${esc(DLG.q)}"><label><input type="checkbox" id="dlg-only"${DLG.onlyEdited ? ' checked' : ''}> edited only</label>
      <span class="sp" style="flex:1"></span><span class="dlg-n">${n} edit${n === 1 ? '' : 's'}</span>
      <button class="btn primary" id="dlg-apply">Apply</button><button class="btn" id="dlg-copy">Copy changes</button><button class="btn" id="dlg-exp">Export</button><button class="btn" id="dlg-undo"${nSheet ? '' : ' disabled'}>Revert sheet</button></div>
    <div class="dlg-msg" id="dlg-msg"></div>
    <div class="dlg-list">${show.map(g => {
      const m = g.rows[0].cur;
      return `<section class="dlg-g bevel"><header><b>${esc(g.id)}</b>${meta.map(h => m[h] ? `<span class="chip" title="${esc(h)}">${esc(h)}: ${esc(m[h])}</span>` : '').join('')}<small>row ${g.rows[0].n}${g.rows.length > 1 ? '–' + g.rows[g.rows.length - 1].n : ''}</small>${playable && g.id !== '(no id)' ? `<button class="btn dlg-play" data-play="${esc(g.id)}">▶ play</button>` : ''}</header>
        ${g.rows.map(r => `<div class="dlg-line${r.cur.type ? ' t-' + esc(r.cur.type.toLowerCase()) : ''}"><span class="dlg-rn">${r.n}</span><div class="dlg-cells">${lineCols.filter(c => c !== 'text').map(c => cell(r, c, 'sm')).join('')}${lineCols.includes('text') ? cell(r, 'text', 'txt') : ''}
          ${moreCols.length ? `<button class="dlg-more${moreCols.some(c => r.cur[c]) ? ' has' : ''}" data-more="${r.n}" title="requires / effects / journal / note">⋯</button>` : ''}
          ${DLG.open[DLG.sheet + r.n] ? `<div class="dlg-x">${moreCols.map(c => cell(r, c, 'x')).join('')}</div>` : ''}
          ${!lineCols.length ? head.filter(h => h && h !== 'id').map(c => cell(r, c, c === 'text' || c === 'note' ? 'txt' : 'sm')).join('') : ''}</div></div>`).join('')}
      </section>`;
    }).join('') || '<p class="kit-p">Nothing matches.</p>'}</div>
    <div class="kit-row dlg-pg"><button class="btn" id="dlg-prev"${DLG.page ? '' : ' disabled'}>◂</button><span>page ${DLG.page + 1}/${pages} · ${gs.length} conversations</span><button class="btn" id="dlg-next"${DLG.page < pages - 1 ? '' : ' disabled'}>▸</button></div>`;
  const msg = (t, cls) => { const m = $('#dlg-msg', el); m.textContent = t; m.className = 'dlg-msg ' + (cls || ''); };
  $$('[data-sh]', el).forEach(x => x.onclick = () => { SFX.click(); DLG.sheet = x.dataset.sh; DLG.page = 0; kitDialogue(el); });
  const qi = $('#dlg-q', el); qi.oninput = () => { DLG.q = qi.value; DLG.page = 0; clearTimeout(DLG.qt); DLG.qt = setTimeout(() => { kitDialogue(el); const n = $('#dlg-q', el); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  $('#dlg-only', el).onchange = e => { DLG.onlyEdited = e.target.checked; DLG.page = 0; kitDialogue(el); };
  $('#dlg-prev', el).onclick = () => { DLG.page--; kitDialogue(el); el.scrollTop = 0; };
  $('#dlg-next', el).onclick = () => { DLG.page++; kitDialogue(el); el.scrollTop = 0; };
  $$('[data-more]', el).forEach(x => x.onclick = () => { const k = DLG.sheet + x.dataset.more; DLG.open[k] = !DLG.open[k]; kitDialogue(el); });
  $$('.dlg-in', el).forEach(x => {
    if (x.tagName === 'TEXTAREA') x.oninput = () => { x.style.height = 'auto'; x.style.height = x.scrollHeight + 'px'; };
    x.onchange = () => {
      const r = +x.dataset.r, c = x.dataset.c, base = (rows.find(o => o.n === r) || { base: {} }).base[c] || '';
      const sh = DLG_ED.e[DLG.sheet] || (DLG_ED.e[DLG.sheet] = {});
      if (x.value === base) { if (sh[r]) { delete sh[r][c]; if (!Object.keys(sh[r]).length) delete sh[r]; } x.classList.remove('ed', 'stale'); }
      else { (sh[r] || (sh[r] = {}))[c] = { v: x.value, o: base }; x.classList.add('ed'); }
      if (!Object.keys(sh).length) delete DLG_ED.e[DLG.sheet];
      dlgPersist(); $('.dlg-n', el).textContent = `${dlgCount()} edits · not applied yet`;
    };
  });
  $$('textarea.dlg-in', el).forEach(x => { x.style.height = 'auto'; x.style.height = x.scrollHeight + 'px'; });
  $('#dlg-apply', el).onclick = () => {
    SFX.click(); const iss = dlgRecompile() || [];
    msg(iss.length ? `Applied. ${iss.length} problem${iss.length > 1 ? 's' : ''}: ` + iss.slice(0, 4).map(i => `${i.file} row ${i.row}: ${i.msg}`).join(' · ') : 'Applied. The game now uses your text. ♡', iss.length ? 'bad' : 'ok');
  };
  $('#dlg-copy', el).onclick = async () => {
    const t = dlgChangesText();
    try { await navigator.clipboard.writeText(t); msg('Copied the list of changes. Paste it to Claude to put them into dialogue.xlsx.', 'ok'); }
    catch (e) { msg('Copy blocked here: use Export.', 'bad'); }
  };
  $('#dlg-exp', el).onclick = () => dlgExport(msg);
  $('#dlg-undo', el).onclick = () => { delete DLG_ED.e[DLG.sheet]; dlgPersist(); dlgRecompile(); kitDialogue(el); msg(`Reverted every edit in ${DLG.sheet}.`, 'ok'); };
  $$('[data-play]', el).forEach(x => x.onclick = () => { SFX.click(); dlgRecompile(); dlgPlay(DLG.sheet, x.dataset.play); });
}
function dlgChangesText() {
  const out = [];
  for (const sh in DLG_ED.e) for (const r of Object.keys(DLG_ED.e[sh]).sort((a, b) => a - b)) for (const c in DLG_ED.e[sh][r]) {
    const e = DLG_ED.e[sh][r][c]; out.push(`[${sh} · row ${r} · ${c}]\n  old: ${e.o || '∅'}\n  new: ${e.v || '∅'}`);
  }
  return out.length ? `Dialogue edits (${out.length})\n\n` + out.join('\n\n') : 'No dialogue edits.';
}
async function dlgExport(msg) {
  const t = JSON.stringify({ kind: 'cyfh dialogue edits', t: DLG_ED.t, edits: DLG_ED.e }, null, 1);
  let dl = null;
  if (window.claude && typeof window.claude.use === 'function') { try { dl = await window.claude.use('downloads'); } catch (e) { dl = null; } }
  if (dl) { try { await dl.save({ filename: 'dialogue_edits.json', data: new Blob([t], { type: 'application/json' }) }); msg('Exported dialogue_edits.json.', 'ok'); } catch (e) { msg('Export cancelled.', ''); } return; }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'application/json' })); a.download = 'dialogue_edits.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); msg('Exported dialogue_edits.json.', 'ok'); }
  catch (e) { msg('Download blocked here: use Copy changes.', 'bad'); }
}
function dlgPlay(sheet, id) {
  if (S.active) { S.active = null; S.queue = []; }
  if (sheet === 'night_lines') {
    const d = DD.night[id]; if (!d) { toast('Dialogue', `${esc(id)} has no playable lines.`); return; }
    const ix = DD.nightIdx.find(e => e.id === id), g = ix && ix.girl || PLAYABLE.find(k => id.startsWith(k)) || 'prim';
    S.met[g] = true; openYap(g); runDialogue(seq(g, g, playSteps(d.steps), 'NONE'));
  } else {
    const e = DD.boss.find(x => x.id === id); if (!e) { toast('Dialogue', `${esc(id)} could not be found.`); return; }
    const g = e.girl || 'prim'; S.met[g] = true;
    openYap('boss'); runDialogue(seq('boss', 'boss', playSteps(e.steps, { girl: GIRLS[g] ? GIRLS[g].name : 'her' }), 'NONE'));
  }
}
