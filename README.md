# Can You Fix Her

A psychological narrative puzzle game set on **DIVE OS**, a retro pastel desktop.
This is a playable prototype covering Day 0 through the end of the first two patients (Prim and Trix).

**Play:** https://feeva2498.github.io/can-you-fix-her/

## Writing dialogue

All dialogue for the session chat, Boss's mornings, Boss's nights and the girls' night chats (with their unlock conditions) lives in CSV files in [`data/`](data/). See **[data/README.md](data/README.md)** (in Vietnamese) for the format.

On GitHub Pages the game reads `data/*.csv` fresh on every load, so uploading an edited CSV is enough. No rebuild is needed. Add `?check` to the game URL to see a report of any mistakes in the CSVs.

## Layout

| Path | What |
|---|---|
| `index.html` | The built game (single file) |
| `data/*.csv` | Dialogue |
| `src/game.js` | Game code (with placeholders filled in by the build) |
| `src/shell.html` | Page markup and styles |
| `src/levels.json` | Generated puzzle boards |
| `src/art/` | Character sprites |
| `build.py` | Builds `index.html` from `src/` + `data/` (`python3 build.py`) |

Progress autosaves in the browser at the start of each morning, afternoon and night. To restart, use **Start → New game…** inside the game.
