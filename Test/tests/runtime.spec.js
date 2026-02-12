const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const legacyMonolithPath = path.join(workspaceRoot, 'Game', 'assets', 'js', 'game.js');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      if (window.name !== '__pw_storage_cleared__') {
        localStorage.clear();
        sessionStorage.clear();
        window.name = '__pw_storage_cleared__';
      }
    } catch (e) {}
  });
});

async function dismissWelcome(page) {
  const btn = page.locator('#welcomeContinueBtn');
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
  }
}

test('runtime boot-order contract is valid', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);

  await expect.poll(async () => {
    return await page.evaluate(() => {
      try {
        return !!(window.App && window.App.meta && window.App.meta.runtimeOrder && window.App.meta.runtimeOrder.ok);
      } catch (e) {
        return false;
      }
    });
  }).toBeTruthy();

  const report = await page.evaluate(() => {
    return (window.App && window.App.meta && window.App.meta.runtimeOrder) ? window.App.meta.runtimeOrder : null;
  });

  expect(report).toBeTruthy();
  expect(report.ok).toBeTruthy();
  expect(report.missing).toEqual([]);
  expect(report.extras).toEqual([]);
  expect(report.duplicates).toEqual([]);
  expect(report.mismatchAt).toBe(-1);
  expect(Array.isArray(report.loaded)).toBeTruthy();
  expect(report.loaded[0]).toBe('app-namespace.js');
  expect(report.loaded[report.loaded.length - 1]).toBe('runtime-order-guard.js');
});

test('security runtime stays in dev-safe mode on local QA route', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  const info = await page.evaluate(() => {
    const sec = (window.App && window.App.security) ? window.App.security : null;
    if (!sec || !sec.flags) return null;
    const payload = { hp: 123, gold: 456, nested: { wave: 7 } };
    const sig = (typeof sec.sign === 'function') ? sec.sign(payload, 'runtime-spec') : '';
    const ok = (typeof sec.verify === 'function') ? sec.verify(payload, sig, 'runtime-spec') : false;
    return {
      qa: !!sec.flags.qa,
      local: !!sec.flags.local,
      release: !!sec.flags.release,
      signVerifyOk: !!ok
    };
  });

  expect(info).toBeTruthy();
  expect(info.qa).toBeTruthy();
  expect(info.local).toBeTruthy();
  expect(info.release).toBeFalsy();
  expect(info.signVerifyOk).toBeTruthy();
});

test('qa hooks are blocked in forced release mode', async ({ page }) => {
  await page.goto('/?qa=1&release=1');
  await dismissWelcome(page);

  const state = await page.evaluate(() => {
    const sec = (window.App && window.App.security) ? window.App.security : null;
    return {
      hasQa: !!window.__qa,
      release: !!(sec && sec.flags && sec.flags.release),
      qaFlag: !!(sec && sec.flags && sec.flags.qa)
    };
  });

  expect(state).toBeTruthy();
  expect(state.release).toBeTruthy();
  expect(state.qaFlag).toBeTruthy();
  expect(state.hasQa).toBeFalsy();
});

test('legacy runtime snapshots are not loaded by index', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);

  const loadedRuntimeScripts = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('script[src]'));
    return nodes
      .map((n) => String(n.getAttribute('src') || ''))
      .map((src) => String(src || '').split('?')[0].split('#')[0].trim())
      .filter((src) => src.startsWith('src/'))
      .map((src) => {
        const i = src.lastIndexOf('/');
        return i >= 0 ? src.slice(i + 1) : src;
      })
      .filter(Boolean);
  });

  const legacy = [
    'core-config.js',
    'core-main-a.js',
    'core-main-b.js',
    'core-main.js',
    'core.js'
  ];

  for (const name of legacy) {
    expect(loadedRuntimeScripts).not.toContain(name);
  }
});

test('legacy monolith is archived and never loaded by index', async ({ page }) => {
  expect(fs.existsSync(legacyMonolithPath)).toBeFalsy();

  await page.goto('/');
  await dismissWelcome(page);

  const loadedScripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[src]'))
      .map((n) => String(n.getAttribute('src') || '').split('?')[0].split('#')[0].trim())
      .filter(Boolean);
  });

  expect(loadedScripts).not.toContain('assets/js/game.js');
});
