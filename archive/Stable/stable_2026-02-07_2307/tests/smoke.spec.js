const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      // Clear storage once per test context (not every reload).
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

test('menu boot: start screen is visible', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);
  await expect(page.locator('#startScreen')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeVisible();
});

test('1P start: P1 HUD visible, P2 HUD hidden', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="1"]');
  await startMatch(page);

  await expect(page.locator('#hudP1')).toBeVisible();
  await expect(page.locator('#hudP2')).toBeHidden();
});

test('2P Bot start: P2 HUD is visible', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="2"]');
  await expect(page.locator('#p2ModeSeg')).toBeVisible();
  await page.check('input[name="mode2p"][value="coop"]');
  await startMatch(page);

  await expect(page.locator('#hudP2')).toBeVisible();
  await expect(page.locator('#hpText2')).toContainText('/');
  await expect(page.locator('#skillBar2')).toBeVisible();
  await expect(page.locator('#weaponBar2')).toBeVisible();
});

test('2P PvP start: loadout modal opens', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="2"]');
  await expect(page.locator('#p2ModeSeg')).toBeVisible();
  await page.check('input[name="mode2p"][value="pvp"]');
  await startMatch(page);

  await expect(page.locator('#pvpLoadoutModal')).toBeVisible();
});

test('Save & Quit returns to start screen', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="1"]');
  await startMatch(page);

  await expect(page.locator('#btnSaveQuit')).toBeVisible();
  await page.click('#btnSaveQuit');
  await expect(page.locator('#startScreen')).toBeVisible();
});

test('settings modal opens and closes on start screen', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);

  await expect(page.locator('#btnSettingsStart')).toBeVisible();
  await page.click('#btnSettingsStart');
  await expect(page.locator('#settingsModal')).toBeVisible();

  await page.click('#btnCloseSettings');
  await expect(page.locator('#settingsModal')).toBeHidden();
});

test('language toggle updates deploy text without reload', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);

  const startBtn = page.locator('#startBtn');
  const before = ((await startBtn.textContent()) || '').trim();
  await expect(page.locator('#btnLangToggleGlobal')).toBeVisible();
  await page.click('#btnLangToggleGlobal');

  await expect(startBtn).not.toHaveText(before);
  await expect(startBtn).toHaveText(/DEPLOY|TRIỂN KHAI/i);
});

test('mode switch toggles 2P sections correctly', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);

  await page.check('input[name="modePlayers"][value="2"]');
  await expect(page.locator('#p2ModeSeg')).toBeVisible();
  await expect(page.locator('#p2SystemRow')).toBeVisible();

  await page.check('input[name="modePlayers"][value="1"]');
  await expect(page.locator('#p2ModeSeg')).toBeHidden();
  await expect(page.locator('#p2SystemRow')).toBeHidden();
});

test('2P PvP confirm closes loadout modal', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="2"]');
  await page.check('input[name="mode2p"][value="pvp"]');
  await startMatch(page);

  const modal = page.locator('#pvpLoadoutModal');
  await expect(modal).toBeVisible();
  await expect(page.locator('#pvpLiveConfirm')).toBeVisible();
  await page.click('#pvpLiveConfirm');
  await expect(modal).toBeHidden();
});

test('game over flow: screen appears and restart hides it', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="1"]');
  await startMatch(page);

  await page.evaluate(() => {
    if (window.__qa && typeof window.__qa.forceGameOver === 'function') {
      window.__qa.forceGameOver();
    }
  });
  await expect(page.locator('#gameOverScreen')).toBeVisible();
  await page.click('#restartBtn');
  await expect(page.locator('#gameOverScreen')).toBeHidden();
  await expect(page.locator('#gameUI')).toBeVisible();
});

test('victory flow: menu button returns to start screen', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="1"]');
  await startMatch(page);

  await page.evaluate(() => {
    if (window.__qa && typeof window.__qa.forceVictory === 'function') {
      window.__qa.forceVictory();
    }
  });
  await expect(page.locator('#victoryScreen')).toBeVisible();
  await page.click('#victoryMenuBtn');
  await expect(page.locator('#startScreen')).toBeVisible();
});

test('assassin code unlock works and persists after reload', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);

  const assassinInput = page.locator('input[name="tankSystem"][value="assassin"]');
  await expect(assassinInput).toBeDisabled();

  await page.dispatchEvent('#systemList .sysItem[data-sys="assassin"]', 'click');
  await expect(page.locator('#assassinLockModal')).toBeVisible();

  await page.fill('#assassinUnlockInput', 'CuOnGDepTraI');
  await page.click('#assassinUnlockBtn');
  await expect(page.locator('#assassinLockModal')).toBeHidden();
  await expect(assassinInput).toBeEnabled();
  await expect(assassinInput).toBeChecked();

  await page.reload();
  await dismissWelcome(page);
  await expect(page.locator('input[name="tankSystem"][value="assassin"]')).toBeEnabled();
});

test('wave-20 save unlocks assassin on menu', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  await page.evaluate(() => {
    if (window.__qa && typeof window.__qa.writeSlotSave === 'function') {
      window.__qa.writeSlotSave('hard1p', {
        wave: 21,
        gold: 0,
        mode: { players: 1, difficulty: 'hard' }
      });
    }
  });

  await expect(page.locator('#continueBtn')).toBeVisible();
  await expect(page.locator('#continueBtn')).toContainText(/WAVE 21/i);
  await expect(page.locator('input[name="tankSystem"][value="assassin"]')).toBeEnabled();
});

test('continue loads saved wave and gold', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  await page.evaluate(() => {
    if (window.__qa && typeof window.__qa.writeSlotSave === 'function') {
      window.__qa.writeSlotSave('hard1p', {
        wave: 6,
        gold: 321,
        mode: { players: 1, difficulty: 'hard' }
      });
    }
  });

  await expect(page.locator('#continueBtn')).toBeVisible();
  await page.click('#continueBtn');
  await confirmVietKeyModalIfNeeded(page);
  await expect(page.locator('#gameUI')).toBeVisible();

  await expect.poll(async () => {
    return await page.evaluate(() => {
      if (!window.__qa || typeof window.__qa.getRuntimeState !== 'function') return null;
      const s = window.__qa.getRuntimeState();
      return s ? s.wave : null;
    });
  }).toBe(6);

  await expect.poll(async () => {
    return await page.evaluate(() => {
      if (!window.__qa || typeof window.__qa.getRuntimeState !== 'function') return null;
      const s = window.__qa.getRuntimeState();
      return s ? s.gold : null;
    });
  }).toBe(321);
});

test('shop buy max-hp increases level and max HP', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="1"]');
  await startMatch(page);

  const opened = await page.evaluate(() => {
    if (!window.__qa || typeof window.__qa.openShop !== 'function') return false;
    return window.__qa.openShop({ nextWave: 2, gold: 500 });
  });
  expect(opened).toBeTruthy();
  await expect(page.locator('#shopModal')).toBeVisible();

  const before = await page.evaluate(() => window.__qa.getRuntimeState());
  const bought = await page.evaluate(() => {
    if (!window.__qa || typeof window.__qa.buyShopMaxHp !== 'function') return false;
    return window.__qa.buyShopMaxHp();
  });
  expect(bought).toBeTruthy();
  const after = await page.evaluate(() => window.__qa.getRuntimeState());

  expect(after.upgrades.maxHpLv).toBe(before.upgrades.maxHpLv + 1);
  expect(after.gold).toBeLessThan(before.gold);
  expect(after.p1.maxHp).toBeGreaterThan(before.p1.maxHp);

  await page.click('#btnShopContinue');
  await expect(page.locator('#shopModal')).toBeHidden();
});

test('aim assist setting persists after reload', async ({ page }) => {
  await page.goto('/');
  await dismissWelcome(page);

  await page.click('#btnSettingsStart');
  await expect(page.locator('#settingsModal')).toBeVisible();
  await page.uncheck('#setAimAssist');
  await page.click('#btnCloseSettings');
  await expect(page.locator('#settingsModal')).toBeHidden();

  await page.reload();
  await dismissWelcome(page);
  await page.click('#btnSettingsStart');
  await expect(page.locator('#setAimAssist')).not.toBeChecked();
});
