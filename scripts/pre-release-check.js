#!/usr/bin/env node
/* Full pre-release gate: syntax, static links/runtime order, tests, git sanity. */
const cp = require('child_process');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const isRelease = args.has('--release');
const isQuick = args.has('--quick');

function runStep(label, cmd, cmdArgs, opts = {}) {
  console.log(`\n==> ${label}`);
  const r = cp.spawnSync(cmd, cmdArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    ...opts
  });
  if (r.error) {
    throw new Error(`${label} failed (${r.error.message})`);
  }
  if (r.status !== 0) {
    throw new Error(`${label} failed (exit ${r.status})`);
  }
}

function runCapture(cmd, cmdArgs) {
  const r = cp.spawnSync(cmd, cmdArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (r.status !== 0) return null;
  return String(r.stdout || '').trim();
}

function gitSanity() {
  const gitVersion = runCapture('git', ['--version']);
  if (!gitVersion) {
    console.log('[git] skip: git not available');
    return;
  }

  const branch = runCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD']) || '(unknown)';
  const status = runCapture('git', ['status', '--porcelain']) || '';
  const dirty = status.length > 0;

  console.log('\n==> Git sanity');
  console.log(`[git] branch: ${branch}`);
  console.log(`[git] dirty : ${dirty ? 'yes' : 'no'}`);

  if (isRelease) {
    if (branch !== 'main') {
      throw new Error(`release mode requires branch 'main' (current: ${branch})`);
    }
    if (dirty) {
      throw new Error('release mode requires clean working tree');
    }
  }
}

function resolveNpmCommand() {
  if (process.platform !== 'win32') return 'npm';
  const probe = cp.spawnSync('where', ['npm.cmd'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (probe.status === 0) return 'npm.cmd';
  const fallback = 'C:\\Program Files\\nodejs\\npm.cmd';
  return fallback;
}

function main() {
  console.log('[pre-release] mode:', isRelease ? 'release' : (isQuick ? 'quick' : 'full'));

  runStep('Syntax check', process.execPath, [path.join('scripts', 'check-syntax.js')]);
  runStep('Static links + runtime order check', process.execPath, [path.join('scripts', 'check-static-links.js')]);

  if (!isQuick) {
    const npmCmd = resolveNpmCommand();
    if (process.platform === 'win32') {
      runStep('E2E test suite', 'cmd.exe', ['/c', npmCmd, 'run', 'test:e2e']);
    } else {
      runStep('E2E test suite', npmCmd, ['run', 'test:e2e']);
    }
  } else {
    console.log('\n==> E2E test suite');
    console.log('[skip] quick mode enabled');
  }

  gitSanity();
  console.log('\n[pre-release] PASS');
}

try {
  main();
} catch (err) {
  console.error(`\n[pre-release] FAIL: ${err.message}`);
  process.exit(1);
}
