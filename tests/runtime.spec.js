const { test, expect } = require('@playwright/test');

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

test('legacy runtime snapshots are not loaded by index', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);

  const loadedRuntimeScripts = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('script[src]'));
    return nodes
      .map((n) => String(n.getAttribute('src') || ''))
      .map((src) => {
        const mark = 'assets/js/runtime/';
        const idx = src.indexOf(mark);
        return idx >= 0 ? src.slice(idx + mark.length).trim() : '';
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
