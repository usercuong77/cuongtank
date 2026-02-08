#!/usr/bin/env node
/* Fast unit checks for split pure modules (no browser boot required). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const testRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(testRoot, '..');

function absWorkspace(relPath) {
  return path.join(workspaceRoot, relPath);
}

function createRuntimeContext(extraGlobals = {}) {
  const windowObj = {};
  windowObj.window = windowObj;
  windowObj.App = {};

  const sandbox = {
    window: windowObj,
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...extraGlobals
  };

  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function loadScriptIntoContext(relPath, sandbox) {
  const file = absWorkspace(relPath);
  const src = fs.readFileSync(file, 'utf8');
  vm.runInContext(src, sandbox, { filename: file });
  return sandbox;
}

function loadScript(relPath, extraGlobals = {}) {
  const sandbox = createRuntimeContext(extraGlobals);
  loadScriptIntoContext(relPath, sandbox);
  return sandbox;
}

function approxEqual(actual, expected, eps = 1e-9) {
  return Math.abs(Number(actual) - Number(expected)) <= eps;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('wave-rules exports runtime APIs', () => {
  const sb = loadScript('Game/src/core/core-wave-rules.js');
  const rt = sb.window.App && sb.window.App.runtime;
  assert.ok(rt);
  assert.equal(typeof rt.getWavePlayerCount, 'function');
  assert.equal(typeof rt.computeWaveScalingForGame, 'function');
  assert.equal(typeof rt.computeWaveScalingSafe, 'function');
  assert.strictEqual(sb.window.computeWaveScalingSafe, rt.computeWaveScalingSafe);
});

test('wave-rules computes expected single-player scaling', () => {
  const sb = loadScript('Game/src/core/core-wave-rules.js');
  const scale = sb.window.App.runtime.computeWaveScalingForGame(10, { players: [{}] });
  assert.ok(approxEqual(scale.hpMult, 2.08));
  assert.ok(approxEqual(scale.dmgMult, 1.72));
  assert.ok(approxEqual(scale.speedMult, 1.18));
  assert.ok(approxEqual(scale.fireRateMult, 1.135));
  assert.equal(scale.spawnInterval, 40);
  assert.equal(scale.spawnCount, 31);
  assert.ok(approxEqual(scale.bossHpMult, 2.25));
  assert.ok(approxEqual(scale.bossDmgMult, 1 + (10 / 12)));
});

test('wave-rules applies 2P balancing multipliers', () => {
  const sb = loadScript('Game/src/core/core-wave-rules.js');
  const scale = sb.window.App.runtime.computeWaveScalingForGame(10, { players: [{}, {}] });
  assert.ok(approxEqual(scale.hpMult, 2.08 * 1.35));
  assert.ok(approxEqual(scale.dmgMult, 1.72 * 1.2));
  assert.equal(scale.spawnCount, 62);
  assert.ok(approxEqual(scale.bossHpMult, 2.25 * 1.8));
});

test('wave-rules safe wrapper falls back when source input throws', () => {
  const sb = loadScript('Game/src/core/core-wave-rules.js');
  const badGame = {};
  Object.defineProperty(badGame, 'players', {
    get() { throw new Error('boom'); }
  });
  const scale = sb.window.App.runtime.computeWaveScalingSafe(3, badGame);
  assert.ok(approxEqual(scale.hpMult, 1.24));
  assert.ok(approxEqual(scale.dmgMult, 1.16));
  assert.equal(scale.spawnInterval, 54);
  assert.equal(scale.spawnCount, 9);
});

test('wave-start lifecycle handles boss setup and revive flow', () => {
  const sb = loadScript('Game/src/core/core-wave-start-rules.js');
  const run = sb.window.App.runtime.runWaveStartLifecycle;
  let obstaclesGenerated = 0;
  let uiWave = 0;
  const texts = [];
  const displays = [];

  const alive = { hp: 50, maxHp: 100, x: 300, y: 400, radius: 22 };
  const dead = {
    hp: 0, maxHp: 100, x: 0, y: 0, radius: 20, __easyTarget: { id: 1 },
    dash: { active: true }, ram: { active: true },
    __autoAim: { target: {}, candidates: [1], idx: 7, nextScan: 10 }
  };
  const game = {
    players: [alive, dead],
    player: alive,
    generateObstacles() { obstaclesGenerated += 1; },
    ui: { updateWave(w) { uiWave = w; } }
  };
  const wm = {
    wave: 5,
    computeScaling() { return { spawnCount: 77 }; }
  };

  const ok = run({
    waveManager: wm,
    game,
    worldWidth: 1000,
    worldHeight: 800,
    createDamageTextFn: (...args) => texts.push(args),
    setElDisplayFn: (...args) => displays.push(args)
  });

  assert.equal(ok, true);
  assert.equal(wm.active, true);
  assert.equal(wm.bossSpawned, false);
  assert.equal(wm.isBossWave, true);
  assert.equal(wm.enemiesRemainingToSpawn, 1);
  assert.equal(obstaclesGenerated, 1);
  assert.equal(uiWave, 5);
  assert.ok(dead.hp > 0);
  assert.equal(dead.dash.active, false);
  assert.equal(dead.ram.active, false);
  assert.equal(dead.__easyTarget, null);
  assert.equal(dead.__autoAim.target, null);
  assert.deepEqual(dead.__autoAim.candidates, []);
  assert.ok(texts.some((x) => x[2] === 'REVIVE!'));
  assert.ok(texts.some((x) => x[2] === 'BOSS BATTLE!'));
  assert.ok(displays.some((x) => x[0] === 'bossHealthContainer' && x[1] === 'block'));
});

test('wave-start safe wrapper returns false for invalid args', () => {
  const sb = loadScript('Game/src/core/core-wave-start-rules.js');
  const runSafe = sb.window.App.runtime.runWaveStartLifecycleSafe;
  assert.equal(runSafe({}), false);
});

test('wave-transition lifecycle handles normal wave clear flow', () => {
  const sb = loadScript('Game/src/core/core-wave-transition-rules.js');
  const run = sb.window.App.runtime.runWaveClearTransition;
  const texts = [];
  const unlocks = [];
  let shopCall = null;
  let started = false;
  let healCalls = 0;

  const alive = {
    hp: 80, maxHp: 200, x: 100, y: 120,
    heal(v) { healCalls += 1; this.hp += v; }
  };
  const dead = { hp: 0, maxHp: 200, x: 50, y: 60, heal() { throw new Error('should not heal dead'); } };
  const game = {
    endlessMode: true,
    gold: 500,
    players: [alive, dead],
    player: alive
  };
  const wm = {
    wave: 20,
    finalWave: 20,
    isBossWave: false,
    startWave() { started = true; }
  };
  const shop = {
    show(wave, gold, onDone) {
      shopCall = { wave, gold };
      onDone();
    }
  };

  const ok = run({
    waveManager: wm,
    game,
    shop,
    createDamageTextFn: (...args) => texts.push(args),
    unlockAssassinFn: (...args) => unlocks.push(args),
    assassinUnlockWave: 20
  });

  assert.equal(ok, true);
  assert.equal(wm.active, false);
  assert.equal(wm.wave, 21);
  assert.equal(started, true);
  assert.equal(healCalls, 1);
  assert.deepEqual(shopCall, { wave: 21, gold: 500 });
  assert.ok(unlocks.some((x) => x[0] === 'wave20'));
  assert.ok(texts.some((x) => x[2] === 'WAVE COMPLETE!'));
});

test('wave-transition lifecycle handles victory branch', () => {
  const sb = loadScript('Game/src/core/core-wave-transition-rules.js');
  const run = sb.window.App.runtime.runWaveClearTransition;
  let victoryCalls = 0;
  let shopCalls = 0;
  const game = {
    endlessMode: false,
    player: { x: 10, y: 20 },
    victory() { victoryCalls += 1; }
  };
  const wm = { wave: 20, finalWave: 20, isBossWave: true };
  const shop = { show() { shopCalls += 1; } };
  const ok = run({ waveManager: wm, game, shop });
  assert.equal(ok, true);
  assert.equal(wm.active, false);
  assert.equal(wm.wave, 20);
  assert.equal(victoryCalls, 1);
  assert.equal(shopCalls, 0);
});

test('wave-transition safe wrapper returns false for invalid args', () => {
  const sb = loadScript('Game/src/core/core-wave-transition-rules.js');
  const runSafe = sb.window.App.runtime.runWaveClearTransitionSafe;
  assert.equal(runSafe({}), false);
});

test('pvp tuning exports frozen fallback config', () => {
  const sb = loadScript('Game/src/data/pvp-tuning-data.js');
  const tuning = sb.window.App.data.pvpTuning;
  assert.ok(tuning);
  assert.equal(Object.isFrozen(tuning), true);
  assert.equal(Object.isFrozen(tuning.passive), true);
  assert.equal(tuning.aimLeadMaxMs, 390);
  assert.equal(tuning.coopAutoAimLeadBlend, 0.30);
  assert.equal(tuning.passive.mageStackReq, 4);
  assert.strictEqual(sb.window.PVP_TUNING_CONFIG, tuning);
});

test('pvp tuning honors override config while keeping fallback defaults', () => {
  const sb = loadScript('Game/src/data/pvp-tuning-data.js', {
    PVP_CONFIG: {
      aimLeadFactor: '2',
      loadoutStorageKey: 'custom_loadout_v2',
      passive: {
        mageStackReq: 6
      }
    }
  });
  const tuning = sb.window.App.data.pvpTuning;
  assert.equal(tuning.aimLeadFactor, 2);
  assert.equal(tuning.aimLeadMaxMs, 390);
  assert.equal(tuning.loadoutStorageKey, 'custom_loadout_v2');
  assert.equal(tuning.passive.mageStackReq, 6);
  assert.equal(tuning.passive.defaultHitsReq, 5);
});

let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`[check:unit] OK   ${t.name}`);
  } catch (err) {
    failed += 1;
    console.error(`\n[check:unit] FAIL ${t.name}`);
    console.error(err && err.stack ? err.stack : String(err));
  }
}

if (failed > 0) {
  console.error(`\n[check:unit] Failed: ${failed}/${tests.length}`);
  process.exit(1);
}

console.log(`\n[check:unit] Passed: ${tests.length}/${tests.length}`);
