#!/usr/bin/env node
/* Validate release bundle integrity after build:release. */
const fs = require('fs');
const path = require('path');

const testRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(testRoot, '..');
const releaseRoot = path.join(workspaceRoot, 'Release', 'game-release');
const indexPath = path.join(releaseRoot, 'index.html');

function rel(p) {
  return path.relative(workspaceRoot, p).replace(/\\/g, '/');
}

function normalizeRef(s) {
  return String(s || '').trim().split('?')[0].split('#')[0].trim();
}

function isLocalAssetRef(v) {
  const s = String(v || '').trim();
  if (!s) return false;
  if (s.startsWith('data:')) return false;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//')) return false;
  if (s.startsWith('#')) return false;
  return true;
}

function extractHtmlRefs(html) {
  const refs = [];
  const rx = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = rx.exec(html)) !== null) {
    const raw = normalizeRef(m[1]);
    if (!isLocalAssetRef(raw)) continue;
    refs.push(raw);
  }
  return refs;
}

function walkJs(dirAbs, out) {
  if (!fs.existsSync(dirAbs)) return;
  const items = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const it of items) {
    const abs = path.join(dirAbs, it.name);
    if (it.isDirectory()) {
      walkJs(abs, out);
      continue;
    }
    if (it.isFile() && it.name.endsWith('.js')) out.push(abs);
  }
}

if (!fs.existsSync(releaseRoot)) {
  console.error(`[check:release:build] Missing release output: ${rel(releaseRoot)}`);
  process.exit(1);
}
if (!fs.existsSync(indexPath)) {
  console.error(`[check:release:build] Missing index.html: ${rel(indexPath)}`);
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const refs = extractHtmlRefs(indexHtml);
const missing = [];
for (const ref of refs) {
  const abs = path.join(releaseRoot, ref);
  if (!fs.existsSync(abs)) missing.push(ref);
}

const jsFiles = [];
walkJs(path.join(releaseRoot, 'src'), jsFiles);

const badMaps = [];
const debugTokens = [];
for (const abs of jsFiles) {
  const src = fs.readFileSync(abs, 'utf8');
  if (/sourceMappingURL/i.test(src)) badMaps.push(rel(abs));
  if (/\bdebugger\b/.test(src)) debugTokens.push(rel(abs));
}

const hasSecurityScript = /src\/core\/security-guard\.js/.test(indexHtml);

let failed = false;
if (missing.length > 0) {
  failed = true;
  console.error('[check:release:build] Missing asset refs:');
  for (const x of missing) console.error(`  - ${x}`);
}
if (badMaps.length > 0) {
  failed = true;
  console.error('[check:release:build] sourcemap tokens found:');
  for (const x of badMaps) console.error(`  - ${x}`);
}
if (debugTokens.length > 0) {
  failed = true;
  console.error('[check:release:build] debugger tokens found:');
  for (const x of debugTokens) console.error(`  - ${x}`);
}
if (!hasSecurityScript) {
  failed = true;
  console.error('[check:release:build] security-guard script not found in index.html');
}

if (failed) process.exit(1);

console.log('[check:release:build] OK');
console.log(`[check:release:build] output: ${rel(releaseRoot)}`);
console.log(`[check:release:build] refs checked: ${refs.length}`);
console.log(`[check:release:build] js scanned: ${jsFiles.length}`);

