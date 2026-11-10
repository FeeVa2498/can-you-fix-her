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
| `vendor/three.min.js` | three.js r149 (MIT, `vendor/three.LICENSE`), packed into `index.html` for the 3D projector |
| `src/game.js` | Game code (with placeholders filled in by the build) |
| `src/shell.html` | Page markup and styles |
| `src/levels.json` | Puzzle boards used by the story game (old ColorLine) |
| `src/panel_engine.js`, `src/panels.json` | Panel engine v3: line panels (WASD or drag; holes, one-way links, portals, overpasses) and box panels (every key moves every box; dash tiles, stops, dash boxes, mirrored twin boxes, move budgets, rope boxes) + the 100 verified panels (20 per girl) played in the Test chamber |
| `src/chamber*.js` | Title screen (Continue / New game / Test chamber), the Test chamber, panel drawing, Solution mode and `chamber_3d.js` (PROJECT3D.EXE: the panel projected as a 3D vaporwave scene; View menu switches to the flat board) |
| `tools/design_v3.js` | Designs and verifies panels (`node tools/design_v3.js [girl]` → `src/panels.json`); keeps Prim layers 1–2 and Trix layer 1 as they are; box panels are checked by breadth-first search |
| `src/art/` | Character sprites |
| `build.py` | Builds `index.html` from `src/` + `data/` (`python3 build.py`, needs openpyxl) |

Progress autosaves in the browser at the start of each morning, afternoon and night. To restart, use **Start → New game…** inside the game.
