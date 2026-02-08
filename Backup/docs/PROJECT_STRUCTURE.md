# Project Structure (Simple)

## Core Game
- `index.html`: HTML layout shell
- `assets/css/main.css`: full game styles (moved out from `index.html`)
- `assets/js/runtime/i18n.js`: language + text sync module
- `assets/js/runtime/bgm.js`: background music module
- `assets/js/runtime/welcome.js`: welcome gate module
- `assets/js/runtime/app-namespace.js`: `window.App` bootstrap namespace for safer cross-module extension
- `assets/js/runtime/runtime-order-guard.js`: runtime boot-order verification guard (reports to `App.meta.runtimeOrder`)
- `assets/js/runtime/core-config-base.js`: base config/constants (world, enemies, bullets, items, global aliases)
- `assets/js/runtime/systems-pvp.js`: PvP constants, ammo/item stats, and PvP resolver logic
- `assets/js/runtime/systems-skills.js`: tank systems + skill framework
- `assets/js/runtime/core-engine.js`: camera + entities/classes + managers/shop runtime
- `assets/js/runtime/save-flow.js`: save/load/autosave/continue flow module
- `assets/js/runtime/core-state.js`: runtime game state object + unlock/load init helpers
- `assets/js/runtime/core-game-loop.js`: main `loop()` and per-frame gameplay update flow
- `assets/js/runtime/ui-menu.js`: start menu mode selector + PvP preload config
- `assets/js/runtime/ui-shop.js`: in-game PvP loadout shop modal logic
- `assets/js/runtime/ui-hud.js`: HUD polish module (HP chip bars + HUD style pass + shop card visual polish hook)
- `assets/js/runtime/ui-preview.js`: start screen preview + skill panel rendering
- `assets/js/runtime/ui-vfx.js`: combat VFX module (GFX config, VFX hooks, boss telegraphs)
- `assets/js/runtime/ui-weapons.js`: weapon bar icons + rarity UI polish
- `assets/js/runtime/qa-hooks.js`: QA/test hooks exposed under `window.__qa` when `?qa=1`
- `assets/js/runtime/ui-lifecycle.js`: start/game lifecycle hooks (start button, end screens, resize boot)
- `assets/js/runtime/core-ui-vfx.js`: lightweight UI boot init (`MAX.UI.init()`, `Shop.init()`)
- `assets/js/game.js`: legacy monolith snapshot (not loaded by `index.html`)

## Tests
- `tests/`: automated test cases (gameplay + visual)
- `tests/runtime.spec.js`: runtime boot-order and legacy-runtime load regression tests
- `run-tests.bat`: run full local test check
- `run-visual-check.bat`: run visual-only check
- `run-visual-update.bat`: update visual snapshots (only when you accept UI changes)
- `run-preflight.bat`: full local gate (syntax + static links/runtime order + e2e + git sanity)
- `run-release-check.bat`: strict release gate (all checks + require `main` branch + clean git tree)

## Push Helpers
- `push-dev.bat`: commit + push to `codex/ci-setup` (safe dev branch, no Netlify deploy)
- `release-main.bat`: commit + push to `main` (production release branch)

## Scripts
- `scripts/`: internal helper scripts used by the root `.bat` launchers
- `scripts/check-syntax.js`: lightweight JS syntax check for runtime/tests/scripts
- `scripts/check-static-links.js`: verify `index.html` / CSS local refs + runtime script contract
- `scripts/pre-release-check.js`: pre-release orchestrator for all checks
- `scripts/run-preflight.bat`: batch wrapper for full preflight check
- `scripts/run-release-check.bat`: batch wrapper for strict release check

## CI/CD
- `.github/workflows/e2e.yml`: GitHub auto test for gameplay/smoke
- `.github/workflows/visual.yml`: GitHub visual regression workflow

## Assets
- `Music/`: background music and in-game music

## Backups / Archive
- `archive/Old/`: old backup HTML versions
- `archive/Stable/`: stable snapshots
- `archive/runtime-legacy/`: legacy runtime snapshots not loaded by `index.html`

## Generated Folders
- `node_modules/`: npm dependencies (auto-generated)
- `test-results/`: test output (auto-generated)
