#!/usr/bin/env node
/* Checks static file references and runtime script order integrity. */
const fs = require('fs');
const path = require('path');

const testRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(testRoot, '..');
const gameRoot = path.join(workspaceRoot, 'Game');
const indexPath = path.join(gameRoot, 'index.html');
const cssPath = path.join(gameRoot, 'assets', 'css', 'main.css');
const appNsPath = path.join(gameRoot, 'assets', 'js', 'runtime', 'app-namespace.js');
const legacyMonolithPath = path.join(gameRoot, 'assets', 'js', 'game.js');

function rel(p) {
  return path.relative(workspaceRoot, p).replace(/\\/g, '/');
}

function isLocalAssetRef(v) {
  if (!v) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (s.startsWith('#')) return false;
  if (s.startsWith('data:')) return false;
  if (s.startsWith('mailto:')) return false;
  if (s.startsWith('javascript:')) return false;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//')) return false;
  return true;
}

function normalizeLocalRef(v) {
  let s = String(v || '').trim();
  s = s.replace(/^['"]|['"]$/g, '');
  s = s.split('?')[0].split('#')[0].trim();
  return s;
}

function extractHtmlRefs(html) {
  const refs = [];
  const rx = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = rx.exec(html)) !== null) {
    const raw = m[1];
    if (!isLocalAssetRef(raw)) continue;
    const clean = normalizeLocalRef(raw);
    if (clean) refs.push(clean);
  }
  return refs;
}

function extractCssUrls(css) {
  const refs = [];
  const rx = /url\(([^)]+)\)/gi;
  let m;
  while ((m = rx.exec(css)) !== null) {
    const raw = normalizeLocalRef(m[1]);
    if (!isLocalAssetRef(raw)) continue;
    if (raw) refs.push(raw);
  }
  return refs;
}

function parseExpectedRuntimeScripts(appNsSource) {
  const blockRx = /expectedRuntimeScripts\s*=\s*App\.boot\.expectedRuntimeScripts\s*\|\|\s*\[([\s\S]*?)\];/m;
  const m = blockRx.exec(appNsSource);
  if (!m) return [];
  const body = m[1];
  const out = [];
  const itemRx = /'([^']+)'/g;
  let x;
  while ((x = itemRx.exec(body)) !== null) {
    out.push(String(x[1] || '').trim());
  }
  return out.filter(Boolean);
}

function extractRuntimeScriptsFromIndex(indexHtml) {
  const list = [];
  const rx = /<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = rx.exec(indexHtml)) !== null) {
    const src = normalizeLocalRef(m[1]);
    const mark = 'assets/js/runtime/';
    const idx = src.indexOf(mark);
    if (idx < 0) continue;
    list.push(src.slice(idx + mark.length));
  }
  return list;
}

function extractScriptSrcs(indexHtml) {
  const out = [];
  const rx = /<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = rx.exec(indexHtml)) !== null) {
    const src = normalizeLocalRef(m[1]);
    if (src) out.push(src);
  }
  return out;
}

function existsLocal(refPath) {
  const abs = path.join(gameRoot, refPath);
  return fs.existsSync(abs);
}

if (!fs.existsSync(indexPath)) {
  console.error('[check:assets] Missing index.html');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const htmlRefs = extractHtmlRefs(indexHtml);
const scriptSrcs = extractScriptSrcs(indexHtml);
const missing = [];
for (const ref of htmlRefs) {
  if (!existsLocal(ref)) missing.push(ref);
}

if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  const cssRefs = extractCssUrls(css);
  for (const ref of cssRefs) {
    const cssBase = path.posix.dirname('assets/css/main.css');
    const resolved = ref.startsWith('/')
      ? ref.slice(1)
      : path.posix.normalize(path.posix.join(cssBase, ref));
    if (!existsLocal(resolved)) missing.push(resolved);
  }
}

const runtimeLoaded = extractRuntimeScriptsFromIndex(indexHtml);
const nonRuntimeLocalScripts = scriptSrcs.filter((src) => (
  src.startsWith('assets/js/') &&
  !src.startsWith('assets/js/runtime/')
));
const hasLegacyMonolithTag = scriptSrcs.includes('assets/js/game.js');
const runtimeDup = [];
const seen = new Set();
for (const x of runtimeLoaded) {
  if (seen.has(x)) runtimeDup.push(x);
  seen.add(x);
}

let runtimeMissing = [];
let runtimeExtras = [];
let runtimeMismatchAt = -1;
if (fs.existsSync(appNsPath)) {
  const appNs = fs.readFileSync(appNsPath, 'utf8');
  const expected = parseExpectedRuntimeScripts(appNs);
  if (expected.length > 0) {
    runtimeMissing = expected.filter((x) => !runtimeLoaded.includes(x));
    runtimeExtras = runtimeLoaded.filter((x) => !expected.includes(x));
    const common = Math.min(expected.length, runtimeLoaded.length);
    for (let i = 0; i < common; i++) {
      if (expected[i] !== runtimeLoaded[i]) {
        runtimeMismatchAt = i;
        break;
      }
    }
    if (runtimeMismatchAt < 0 && expected.length !== runtimeLoaded.length) {
      runtimeMismatchAt = common;
    }
  }
}

const hasFail =
  missing.length > 0 ||
  fs.existsSync(legacyMonolithPath) ||
  hasLegacyMonolithTag ||
  nonRuntimeLocalScripts.length > 0 ||
  runtimeDup.length > 0 ||
  runtimeMissing.length > 0 ||
  runtimeExtras.length > 0 ||
  runtimeMismatchAt >= 0;

if (missing.length > 0) {
  console.error('\n[check:assets] Missing static references:');
  for (const m of missing) console.error(`  - ${m}`);
}

if (runtimeDup.length > 0) {
  console.error('\n[check:assets] Duplicate runtime scripts in index.html:');
  for (const x of runtimeDup) console.error(`  - ${x}`);
}

if (fs.existsSync(legacyMonolithPath)) {
  console.error('\n[check:assets] Legacy monolith still exists in Game path:');
  console.error(`  - ${rel(legacyMonolithPath)}`);
}

if (hasLegacyMonolithTag) {
  console.error('\n[check:assets] index.html must not load legacy monolith script:');
  console.error('  - assets/js/game.js');
}

if (nonRuntimeLocalScripts.length > 0) {
  console.error('\n[check:assets] Found local JS scripts outside runtime folder:');
  for (const s of nonRuntimeLocalScripts) console.error(`  - ${s}`);
}

if (runtimeMissing.length > 0 || runtimeExtras.length > 0 || runtimeMismatchAt >= 0) {
  console.error('\n[check:assets] Runtime script order contract mismatch:');
  if (runtimeMissing.length > 0) {
    console.error('  missing:');
    for (const x of runtimeMissing) console.error(`    - ${x}`);
  }
  if (runtimeExtras.length > 0) {
    console.error('  extras:');
    for (const x of runtimeExtras) console.error(`    - ${x}`);
  }
  if (runtimeMismatchAt >= 0) {
    console.error(`  mismatchAt: ${runtimeMismatchAt}`);
  }
}

if (hasFail) {
  process.exit(1);
}

console.log(`[check:assets] OK index refs: ${htmlRefs.length}`);
console.log(`[check:assets] OK runtime scripts: ${runtimeLoaded.length}`);
if (fs.existsSync(cssPath)) console.log(`[check:assets] OK css refs scanned: ${rel(cssPath)}`);
