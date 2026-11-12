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
| `src/panel_engine.js`, `src/panels.json` | Panel engine v4: every panel is boxes, and every key moves every box on the board. Boxes: plain, rope (leaves a rope nothing crosses), reverse twin, rocket (slides), colours 1–3, landmine (Prim: exact moves, then a goal), die (Paige: prints the face underneath on each tile). Tiles: coloured goals, light tiles (lit by ropes), edge-count numbers, arrow tiles, stops, portals, one-way gaps, holes, cracked tiles, paint tiles, switches / double switches with coloured doors. 134 verified panels (27 tiny tutorials) |
| `src/chamber*.js` | Title screen (Continue / New game / Test chamber), the Test chamber, panel drawing, Solution mode and `chamber_3d.js` (PROJECT3D.EXE: the panel projected as a 3D vaporwave scene; View menu switches to the flat board) |
| `src/editor.js` | LevelEditor.exe (Test chamber → ✎ Level editor): edit, reorder, move, create and check panels in the browser; Export gives a new `panels.json` to drop into `src/` |
| `tools/design_v3.js` | Designs and verifies panels by breadth-first search and a "thinking" score: `IDS=a,b PART=out.json node tools/design_v3.js`, then `node tools/design_v3.js merge out.json` (never rebuilds the whole set by itself); `retext` rewrites the key-idea texts. Line-style specs are designed as lines and turned into rope boxes. `tools/convert_v4.js` is the one-off that turned the old line panels into rope-box panels |
| `src/art/` | Character sprites |
| `audio/projector_bgm.mp3` | Music for the projector window ("factory at night", provided by the user; re-encoded at 112 kb/s). Loaded by path, so keep it next to `index.html` |
| `build.py` | Builds `index.html` from `src/` + `data/` (`python3 build.py`, needs openpyxl) |

Progress autosaves in the browser at the start of each morning, afternoon and night. To restart, use **Start → New game…** inside the game.
