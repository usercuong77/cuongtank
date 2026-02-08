# Runtime Legacy Archive

These files are preserved snapshots from earlier runtime splits and are **not loaded** by `index.html`.

Archived files:
- `core-config.js`
- `core-main-a.js`
- `core-main-b.js`
- `core-main.js`
- `core.js`
- `game.monolith.js` (previous single-file runtime before full split)

Purpose:
- keep historical reference while reducing noise in `Game/src/`
- avoid accidental import/use in current runtime pipeline
