# File Split Plan (AI-Friendly)

## Goal
Make the codebase easier to maintain, safer to edit, and faster to extend.

## Phase 1 (Completed)
- Externalized CSS from `index.html` to `assets/css/main.css`.
- Externalized JS from `index.html` to `assets/js/game.js`.
- Kept behavior unchanged and verified with automated tests.
- Status: `DONE` (Playwright: 28/28 passed).

## Phase 2 (Low Risk, In Progress)
- Split monolith into ordered runtime files without deep rewrites.
- Implemented in this step:
  - `assets/js/runtime/app-namespace.js`
  - `assets/js/runtime/i18n.js`
  - `assets/js/runtime/bgm.js`
  - `assets/js/runtime/welcome.js`
  - `assets/js/runtime/core-config-base.js`
  - `assets/js/runtime/systems-pvp.js`
  - `assets/js/runtime/systems-skills.js`
  - `assets/js/runtime/core-engine.js`
  - `assets/js/runtime/save-flow.js`
  - `assets/js/runtime/core-state.js`
  - `assets/js/runtime/core-game-loop.js`
  - `assets/js/runtime/ui-menu.js`
  - `assets/js/runtime/ui-shop.js`
  - `assets/js/runtime/ui-hud.js`
  - `assets/js/runtime/ui-preview.js`
  - `assets/js/runtime/ui-vfx.js`
  - `assets/js/runtime/ui-weapons.js`
  - `assets/js/runtime/qa-hooks.js`
  - `assets/js/runtime/ui-lifecycle.js`
  - `assets/js/runtime/core-ui-vfx.js`
- `index.html` now loads runtime files explicitly in order.
- Automated verification completed: Playwright `28/28` passed.
- Next extraction targets (inside runtime UI layer):
  - (none for now - core-ui-vfx is already slim boot init)

## Phase 3 (Medium Risk)
- Kickoff done: introduced `window.App` namespace and runtime aliases for safer future refactors.
- Converted `save-flow.js` critical paths to use `App.runtime/App.actions` resolvers with global fallbacks.
- Converted `ui-preview.js` to use `App.runtime/App.config` resolvers (Game/MAX/assassin config + unlock flow) with global fallbacks.
- Converted `ui-hud.js` to use `App.runtime` resolvers (Game/Enemy/Shop) with global fallbacks.
- Converted `ui-shop.js` to use `App.runtime/App.config` resolvers (Game/loadout apply/locale/loadout config) with global fallbacks.
- Converted `ui-menu.js` to use `App.runtime/App.config` resolvers (PvP mode config/loadout/locale + start-menu sync) with global fallbacks.
- Migrated shared runtime access points in `ui-vfx.js` to resolver pattern (`Game/Camera/MAX/Enemy/getSystemSkillDef`) while keeping VFX/render behavior unchanged.
- Exported shared runtime hooks to `App.runtime`:
  - `getTankSystem`, `getSystemSkillDef`, `getSystemSkillCooldowns` (from `systems-skills.js`)
  - `unlockAssassin` (from `core-game-loop.js`)
  - `Enemy` constructor (from `core-engine.js`)
  - `getPvpAmmoLocale`, `getPvpItemLocale`, `sanitizePvpLoadouts`, `pvpApplyLoadoutToPlayer` (from `systems-pvp.js`)
- Extended runtime exports for cross-module reuse:
  - `getPvpLoadoutByPid`, `pvpHasItem`, `pvpGetAmmoByPlayer`, `pvpApplyCdPenalty`, `pvpApplyReveal`,
    `pvpApplySkillHunterRefund`, `pvpBulletDamageForTarget`, `pvpApplySystemPassivesOnHit`, `pvpApplyBulletOnHit`
  - `writeSave`, `updateStartSaveUI`, `loop`, `getFireRateMaxLv`
- Added `App.state/App.ui/App.rules` grouping (non-breaking, with global fallback):
  - `App.state`: `game`, `camera`, `input`, `waveManager`, `startMode`, `save`, `unlocks`
  - `App.ui`: `gameHud`, `shop`, `drawPvpOverlay`, `drawPvpZone`, `drawPrettyMapBackground`, `drawMiniMap`, `BossFX`
  - `App.rules`: `systems`, `systemSkillLabelEn`, `pvp`, `skillConfig`, `fireRate`
- Step 5 completed:
  - Reduced direct global coupling in lifecycle/save QA paths by prioritizing `App.actions`/`App.runtime` resolvers.
  - Added shared resolver helpers in `app-namespace.js` (`App.resolve.*`) for safer future migrations.
- Step 6 completed:
  - Locked runtime script contract with `App.boot.expectedRuntimeScripts`.
  - Added `assets/js/runtime/runtime-order-guard.js` to verify load order, detect missing/extra/duplicate modules, and emit a runtime check event.
  - Standardized `index.html` runtime load order with `app-namespace.js` loaded first.
- Step 7 completed:
  - Archived unused legacy runtime snapshots from `assets/js/runtime/` to `archive/runtime-legacy/`:
    - `core-config.js`, `core-main-a.js`, `core-main-b.js`, `core-main.js`, `core.js`
  - Kept files for reference, no deletion.
- Step 8 completed:
  - Added runtime regression test file `tests/runtime.spec.js`:
    - validates runtime script order contract (`App.meta.runtimeOrder.ok`)
    - ensures legacy runtime snapshots are not loaded by `index.html`
- Convert cross-file globals to a single app namespace (`window.App`).
- Replace direct shared mutable globals with grouped modules (`App.state`, `App.ui`, `App.rules`).
- Add smoke assertions for critical boot paths after every module migration.

## Phase 4 (Stability)
- Add lightweight lint/format checks for JS consistency.
- Add a quick pre-release checklist script:
  - tests pass
  - no missing assets
  - branch/release sanity check
- Status update:
  - Added `scripts/check-syntax.js` (lightweight JS syntax gate via `node --check`).
  - Added `scripts/check-static-links.js` (checks local static refs and runtime script-order contract).
  - Added `scripts/pre-release-check.js` with modes:
    - full: syntax + static/runtime + e2e + git sanity
    - release: full + enforce `main` branch and clean working tree
  - Added one-click launchers:
    - `run-preflight.bat`
    - `run-release-check.bat`
  - Added npm scripts:
    - `check:syntax`, `check:assets`, `check:full`, `check:release`
