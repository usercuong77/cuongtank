const { test, expect } = require('@playwright/test');

const SYSTEM_IDS = ['default', 'speed', 'engineer', 'juggernaut', 'mage', 'assassin'];
const SKILL_KEYS = ['q', 'e', 'r'];

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

function createRuntimeErrorCollector(page) {
  const runtimeErrors = [];
  const whitelist = [
    /favicon/i,
    /Failed to load resource: the server responded with a status of 404/i
  ];
  const isWhitelisted = (msg) => whitelist.some((rule) => rule.test(String(msg || '')));

  page.on('pageerror', (err) => {
    const message = err && err.message ? err.message : String(err || '');
    if (!isWhitelisted(message)) runtimeErrors.push(`pageerror: ${message}`);
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = String(msg.text() || '');
    if (!isWhitelisted(text)) runtimeErrors.push(`console.error: ${text}`);
  });

  return runtimeErrors;
}

async function dismissWelcome(page) {
  const btn = page.locator('#welcomeContinueBtn');
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
  }
}

async function confirmVietKeyModalIfNeeded(page) {
  const btnYes = page.locator('#vkYes');
  if (await btnYes.isVisible().catch(() => false)) {
    await btnYes.click();
  }
}

async function startMatch(page) {
  await expect(page.locator('#startBtn')).toBeVisible();
  await page.click('#startBtn');
  await confirmVietKeyModalIfNeeded(page);
  await expect(page.locator('#gameUI')).toBeVisible();
}

async function bootSystemMatch(page, systemId) {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  if (systemId === 'assassin') {
    const unlocked = await page.evaluate(() => {
      if (!window.__qa || typeof window.__qa.setAssassinUnlock !== 'function') return false;
      return window.__qa.setAssassinUnlock('qa-smoke-matrix');
    });
    expect(unlocked).toBeTruthy();
  }

  await page.check('input[name="modePlayers"][value="1"]');
  await page.check(`input[name="tankSystem"][value="${systemId}"]`);
  await startMatch(page);

  await expect.poll(async () => {
    return await page.evaluate(() => {
      return !!(window.__qa && window.__qa.isReady && window.Game && window.Game.active);
    });
  }).toBeTruthy();
}

test('skill smoke matrix: 6 systems x Q/E/R activate and stay runtime-clean', async ({ page }) => {
  const runtimeErrors = createRuntimeErrorCollector(page);
  const matrix = {};

  for (const systemId of SYSTEM_IDS) {
    matrix[systemId] = {};
    await bootSystemMatch(page, systemId);

    for (const skillKey of SKILL_KEYS) {
      const castResult = await page.evaluate(({ skillKey }) => {
        if (!window.__qa || typeof window.__qa.qaUseSkill !== 'function') return null;
        return window.__qa.qaUseSkill(skillKey, { pid: 1, noCooldown: true });
      }, { skillKey });

      matrix[systemId][skillKey] = !!(castResult && castResult.ok);
      expect(castResult).toBeTruthy();
      expect(castResult.ok, `${systemId}:${skillKey} failed`).toBeTruthy();
      expect(castResult.state && castResult.state.systemId).toBe(systemId);
    }

    await page.waitForTimeout(60);
    expect(runtimeErrors, `runtime errors detected for ${systemId}`).toEqual([]);
  }

  for (const systemId of SYSTEM_IDS) {
    for (const skillKey of SKILL_KEYS) {
      expect(matrix[systemId][skillKey], `${systemId}:${skillKey} was not activated`).toBeTruthy();
    }
  }

  expect(runtimeErrors).toEqual([]);
});
