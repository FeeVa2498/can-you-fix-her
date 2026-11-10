# Can You Fix Her

A psychological narrative puzzle game set on **DIVE OS**, a retro pastel desktop.
This is a playable prototype covering Day 0 through the end of the first two patients (Prim and Trix).

**Play:** https://feeva2498.github.io/can-you-fix-her/

## Writing dialogue

All dialogue lives in one workbook, [`data/dialogue.xlsx`](data/dialogue.xlsx): the session chat, Boss's mornings and nights, the girls' night chats (with their unlock conditions), first messages and Boss's journal, plus writing space for emails, Act V and the personal log. See **[data/README.md](data/README.md)** (in Vietnamese) for the format.

On GitHub Pages the game reads `data/dialogue.xlsx` fresh on every load (via the bundled SheetJS reader in `vendor/`), so uploading an edited workbook is enough. No rebuild is needed. Add `?check` to the game URL to see a report of any mistakes.

## Layout

| Path | What |
|---|---|
| `index.html` | The built game (single file) |
| `data/dialogue.xlsx` | Dialogue (writers edit this) |
| `vendor/xlsx.full.min.js` | SheetJS 0.18.5 (Apache-2.0), reads the workbook in the browser |
| `src/game.js` | Game code (with placeholders filled in by the build) |
| `src/shell.html` | Page markup and styles |
| `src/levels.json` | Puzzle boards used by the story game (old ColorLine) |
| `src/panel_engine.js`, `src/panels.json` | New line-panel rules + the 100 verified panels (20 per girl) played in the Test chamber |
| `src/chamber*.js` | Title screen (Continue / New game / Test chamber), the Test chamber, panel drawing and Solution mode |
| `tools/design_all.js` | Designs and verifies panels (`node tools/design_all.js [girl]` → `src/panels.json`) |
| `src/art/` | Character sprites |
| `build.py` | Builds `index.html` from `src/` + `data/` (`python3 build.py`, needs openpyxl) |

Progress autosaves in the browser at the start of each morning, afternoon and night. To restart, use **Start → New game…** inside the game.
