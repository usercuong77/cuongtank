#!/usr/bin/env node
/* Lightweight syntax checker for project JS files. */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = process.cwd();

const includeDirs = [
  'assets/js/runtime',
  'tests',
  'scripts'
];

const includeFiles = [
  'playwright.config.js'
];

function walkJsFiles(dirAbs, out) {
  if (!fs.existsSync(dirAbs)) return;
  const items = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const it of items) {
    const abs = path.join(dirAbs, it.name);
    if (it.isDirectory()) {
      if (it.name === 'node_modules' || it.name === '.git' || it.name === 'archive') continue;
      walkJsFiles(abs, out);
      continue;
    }
    if (!it.isFile()) continue;
    if (it.name.endsWith('.js')) out.push(abs);
  }
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

const files = [];
for (const f of includeFiles) {
  const abs = path.join(root, f);
  if (fs.existsSync(abs)) files.push(abs);
}
for (const d of includeDirs) {
  walkJsFiles(path.join(root, d), files);
}

files.sort((a, b) => rel(a).localeCompare(rel(b)));

if (files.length === 0) {
  console.log('[check:syntax] No JS files found to check.');
  process.exit(0);
}

let failed = 0;
for (const file of files) {
  const r = cp.spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });
  if (r.status !== 0) {
    failed += 1;
    console.error(`\n[check:syntax] FAIL ${rel(file)}`);
    if (r.stderr) process.stderr.write(r.stderr);
    if (r.stdout) process.stdout.write(r.stdout);
  } else {
    console.log(`[check:syntax] OK   ${rel(file)}`);
  }
}

if (failed > 0) {
  console.error(`\n[check:syntax] Failed: ${failed}/${files.length}`);
  process.exit(1);
}

console.log(`\n[check:syntax] Passed: ${files.length}/${files.length}`);
