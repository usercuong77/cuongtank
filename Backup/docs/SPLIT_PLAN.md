# File Split Plan (Finalized)

## Goal
Keep gameplay stable while making the codebase easy to extend (new systems, ammo, UI, and modes) with low refactor risk.

## Completion Status
- `DONE`: CSS externalized to `Game/assets/css/main.css`.
- `DONE`: runtime logic split into ordered modules under `Game/src/`.
- `DONE`: `index.html` loads runtime modules in explicit, validated order.
- `DONE`: PvP tuning config extracted into `Game/src/data/pvp-tuning-data.js` (aim/cc/passive/loadout-key).
- `DONE`: PvP runtime resolves tuning from `App.data` first, then legacy globals/config fallback.
- `DONE`: core input event bindings extracted from `core-engine.js` to `core-input-bindings.js`.
- `DONE`: VFX GFX theme data extracted from `ui-vfx.js` to `data/vfx-gfx-data.js`.
- `DONE`: wave progression/scaling rules extracted from `core-engine.js` to `core-wave-rules.js`.
- `DONE`: legacy monolith removed from live runtime and archived at:
  - `Backup/archive/runtime-legacy/game.monolith.js`
- `DONE`: automated guards prevent monolith regressions.

## Runtime Safety Contracts
- `App.boot.expectedRuntimeScripts` defines required runtime order.
- `runtime-order-guard.js` validates load order at boot and reports to `App.meta.runtimeOrder`.
- `Test/scripts/check-static-links.js` now fails if:
  - any local JS is loaded outside `src/`
  - legacy monolith file appears again in `Game/assets/js/game.js`
  - `index.html` references `assets/js/game.js`
- `Test/tests/runtime.spec.js` verifies:
  - runtime order contract is valid in browser
  - legacy runtime snapshots are not loaded
  - monolith is archived and not loaded by index
- PvP compatibility guarantees:
  - tuning data is available via `App.data.pvpTuning`
  - legacy alias `window.PVP_TUNING_CONFIG` is still provided
  - `systems-pvp.js` keeps legacy global constants used by `core-engine.js`/`qa-hooks.js`
- Runtime compatibility guarantees:
  - module exports can be published via `App.compat.expose(...)` with legacy global aliases

## Current Test Entry
- `Test/run-test.bat` (single runner)
  - default: `preflight`
  - optional modes: `release`, `e2e`, `headed`, `ui`, `visual`, `visual-update`
- visual shortcuts:
  - `Test/run-visual-check.bat`
  - `Test/run-visual-update.bat`

## Operational Rule
For game changes, update only runtime modules in `Game/src/` and keep legacy files in `Backup/archive/` only.
Keep PvP/skill tuning and loadout config in `Game/src/data/*` (not inline in systems modules).
