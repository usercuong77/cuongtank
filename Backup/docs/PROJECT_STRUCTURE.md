# Project Structure (Current)

## Top-Level Layout
- `index.html`: root entry that redirects to `Game/index.html`
- `Game/`: files required to run the game
- `Test/`: automated test stack, QA scripts, and push helpers
- `Backup/`: archive snapshots and backup docs
- `.github/workflows/`: CI workflows (e2e + visual)

## Game Runtime
- `Game/index.html`: shell layout, runtime script load order
- `Game/assets/css/main.css`: full game stylesheet
- `Game/src/`: runtime modules grouped by domain (single source of truth)
- `Game/Music/`: game music assets

## Runtime Modules (Game/src)
- `core/*`: boot namespace, config/state/engine/game-loop, wave rules (including `computeWaveScalingSafe`), wave-start rules (including `runWaveStartLifecycleSafe`), wave-transition rules (including `runWaveClearTransitionSafe`), spawn rules, input bindings, save flow, QA hooks
- `systems/*`: skill and PvP systems
- `ui/*`: menu, preview, HUD, VFX, shop, lifecycle, welcome flow
- `data/*`: config/data modules (`i18n.js`, `skill-systems-data.js`, `pvp-tuning-data.js`, `pvp-loadout-data.js`, `vfx-gfx-data.js`)

## Legacy Archive
- `Backup/archive/runtime-legacy/game.monolith.js`: archived legacy monolith (not used by game)
- `Backup/archive/runtime-legacy/core*.js`: archived legacy runtime snapshots

## Test Entrypoints
- `Test/run-test.bat`: single test runner
  - default: `preflight` (syntax + static/runtime checks + e2e + git sanity)
  - other modes: `release`, `e2e`, `headed`, `ui`, `visual`, `visual-update`
- `Test/run-visual-check.bat`: shortcut for visual regression check
- `Test/run-visual-update.bat`: shortcut for visual snapshot update

## Test Scripts
- `Test/scripts/check-syntax.js`: syntax check for runtime/tests/scripts JS
- `Test/scripts/check-static-links.js`: static refs + runtime-order contract + anti-monolith guard
- `Test/scripts/pre-release-check.js`: orchestrates preflight/release gates
- `Test/tests/runtime.spec.js`: runtime contract + legacy-not-loaded regression tests
- `Test/tests/smoke.spec.js`, `Test/tests/gameplay.spec.js`, `Test/tests/visual.spec.js`: gameplay and UI test suites

## Push Helpers
- `Test/push-dev.bat`: commit + push current branch to `origin/codex/ci-setup`
- `Test/release-main.bat`: release push to `origin/main`

## Generated Output
- `Test/node_modules/`: npm dependencies
- `Test/test-results/`: local Playwright results
