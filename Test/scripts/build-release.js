#!/usr/bin/env node
/* Build production-ready release bundle (minify + light obfuscation, no sourcemaps). */
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const JavaScriptObfuscator = require('javascript-obfuscator');

const testRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(testRoot, '..');
const gameRoot = path.join(workspaceRoot, 'Game');
const releaseRoot = path.join(workspaceRoot, 'Release', 'game-release');

function rel(p) {
  return path.relative(workspaceRoot, p).replace(/\\/g, '/');
}

function ensureDir(abs) {
  fs.mkdirSync(abs, { recursive: true });
}

function cleanDir(abs) {
  fs.rmSync(abs, { recursive: true, force: true });
  ensureDir(abs);
}

function walkFiles(rootAbs) {
  const out = [];
  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const abs = path.join(dir, it.name);
      if (it.isDirectory()) {
        walk(abs);
        continue;
      }
      if (it.isFile()) out.push(abs);
    }
  }
  walk(rootAbs);
  return out;
}

function shouldProcessJs(relPath) {
  return relPath.startsWith('src/') && relPath.endsWith('.js');
}

function shouldObfuscate(relPath) {
  return (
    relPath.startsWith('src/core/') ||
    relPath.startsWith('src/systems/')
  );
}

async function processJs(code, relPath) {
  const mini = await minify(code, {
    compress: {
      passes: 2,
      drop_debugger: true,
      keep_fargs: false,
      pure_getters: false
    },
    mangle: true,
    format: {
      comments: false
    }
  });

  if (!mini || typeof mini.code !== 'string' || !mini.code.trim()) {
    throw new Error(`Terser output empty for ${relPath}`);
  }

  let outCode = mini.code;
  if (shouldObfuscate(relPath)) {
    const obfuscated = JavaScriptObfuscator.obfuscate(outCode, {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      renameGlobals: false,
      stringArray: true,
      stringArrayThreshold: 0.25,
      splitStrings: false,
      unicodeEscapeSequence: false,
      transformObjectKeys: false,
      simplify: true
    });
    outCode = obfuscated.getObfuscatedCode();
  }
  return outCode;
}

async function main() {
  if (!fs.existsSync(gameRoot)) {
    throw new Error(`Missing Game folder: ${rel(gameRoot)}`);
  }

  cleanDir(releaseRoot);
  const files = walkFiles(gameRoot);

  let copied = 0;
  let processedJs = 0;
  let obfuscatedJs = 0;

  for (const srcAbs of files) {
    const relFromGame = path.relative(gameRoot, srcAbs).replace(/\\/g, '/');
    const outAbs = path.join(releaseRoot, relFromGame);
    ensureDir(path.dirname(outAbs));

    if (shouldProcessJs(relFromGame)) {
      const srcCode = fs.readFileSync(srcAbs, 'utf8');
      const outCode = await processJs(srcCode, relFromGame);
      fs.writeFileSync(outAbs, outCode, 'utf8');
      processedJs += 1;
      if (shouldObfuscate(relFromGame)) obfuscatedJs += 1;
      continue;
    }

    fs.copyFileSync(srcAbs, outAbs);
    copied += 1;
  }

  const manifest = {
    builtAt: new Date().toISOString(),
    source: rel(gameRoot),
    output: rel(releaseRoot),
    filesTotal: files.length,
    processedJs,
    obfuscatedJs,
    copied
  };
  fs.writeFileSync(path.join(releaseRoot, 'release-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log('[build:release] OK');
  console.log(`[build:release] source: ${rel(gameRoot)}`);
  console.log(`[build:release] output: ${rel(releaseRoot)}`);
  console.log(`[build:release] js processed: ${processedJs} (obfuscated: ${obfuscatedJs})`);
  console.log(`[build:release] files copied: ${copied}`);
}

main().catch((err) => {
  console.error(`[build:release] FAIL: ${err.message}`);
  process.exit(1);
});

