const { test, expect } = require('@playwright/test');

async function resetToStartScreen(page) {
  await page.goto('/');
  await page.evaluate(() => {
    try {
      localStorage.removeItem('tankLang_v1');
      sessionStorage.clear();
    } catch (e) {}
  });
  await page.reload();
  const btn = page.locator('#welcomeContinueBtn');
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
  }
  await expect(page.locator('#startScreen')).toBeVisible();
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

test('visual: baseline screens', async ({ page }) => {
  // 1) Start screen main layout
  await resetToStartScreen(page);
  await expect(page.locator('.startLeft')).toHaveScreenshot('start-main.png', {
    animations: 'disabled',
    caret: 'hide',
    mask: [page.locator('canvas.sysMini')],
    maxDiffPixelRatio: 0.02
  });

  // 2) Settings modal
  await page.click('#btnSettingsStart');
  await expect(page.locator('#settingsModal')).toBeVisible();
  await expect(page.locator('#settingsModal .settings-panel')).toHaveScreenshot('settings-modal.png', {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.02
  });
  await page.click('#btnCloseSettings');

  // 3) Start mode box in 2P mode
  await page.check('input[name="modePlayers"][value="2"]');
  await expect(page.locator('#p2ModeSeg')).toBeVisible();
  await expect(page.locator('#p2SystemRow')).toBeVisible();
  await expect(page.locator('#modeBox')).toHaveScreenshot('mode-box-2p.png', {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.02
  });

  // 4) PvP loadout modal
  await page.check('input[name="mode2p"][value="pvp"]');
  await startMatch(page);
  await expect(page.locator('#pvpLoadoutModal')).toBeVisible();
  await expect(page.locator('#pvpLoadoutPanel')).toHaveScreenshot('pvp-loadout-panel.png', {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.02
  });

  // 5) Assassin lock modal
  await resetToStartScreen(page);
  await page.dispatchEvent('#systemList .sysItem[data-sys="assassin"]', 'click');
  await expect(page.locator('#assassinLockModal')).toBeVisible();
  await expect(page.locator('#assassinLockPanel')).toHaveScreenshot('assassin-lock-panel.png', {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.02
  });
});
