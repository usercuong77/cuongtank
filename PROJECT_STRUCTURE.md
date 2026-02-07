# Project Structure (Simple)

## Core Game
- `index.html`: main game file (edit here)

## Tests
- `tests/`: automated test cases (gameplay + visual)
- `run-tests.bat`: run full local test check
- `run-visual-check.bat`: run visual-only check
- `run-visual-update.bat`: update visual snapshots (only when you accept UI changes)

## Push Helpers
- `push-dev.bat`: commit + push to `codex/ci-setup` (safe dev branch, no Netlify deploy)
- `release-main.bat`: commit + push to `main` (production release branch)
- `push-one-click.bat`: commit + push current branch as-is

## Scripts
- `scripts/`: internal helper scripts used by the root `.bat` launchers

## CI/CD
- `.github/workflows/e2e.yml`: GitHub auto test for gameplay/smoke
- `.github/workflows/visual.yml`: GitHub visual regression workflow

## Assets
- `Music/`: background music and in-game music

## Backups / Archive
- `archive/Old/`: old backup HTML versions
- `archive/Stable/`: stable snapshots

## Generated Folders
- `node_modules/`: npm dependencies (auto-generated)
- `test-results/`: test output (auto-generated)
