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

test('pvp loadout confirm applies selected ammo/items', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);
  await page.evaluate(() => localStorage.removeItem('tankPvpLoadout_v1'));

  await page.check('input[name="modePlayers"][value="2"]');
  await page.check('input[name="mode2p"][value="pvp"]');
  await startMatch(page);
  await expect(page.locator('#pvpLoadoutModal')).toBeVisible();

  await expect.poll(async () => page.locator('#pvpLiveP1Ammo option').count()).toBeGreaterThan(0);
  await expect.poll(async () => page.locator('#pvpLiveP1Item1 option').count()).toBeGreaterThan(0);

  const picked = await page.evaluate(() => {
    function pickNonDefault(id) {
      const el = document.getElementById(id);
      if (!el || !el.options || !el.options.length) return null;
      const current = String(el.value || '');
      let next = current;
      for (let i = 0; i < el.options.length; i++) {
        const v = String(el.options[i].value || '');
        if (v && v !== current) { next = v; break; }
      }
      el.value = next;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return next;
    }

    return {
      p1Ammo: pickNonDefault('pvpLiveP1Ammo'),
      p1Item1: pickNonDefault('pvpLiveP1Item1'),
      p2Ammo: pickNonDefault('pvpLiveP2Ammo')
    };
  });

  await page.click('#pvpLiveConfirm');
  await expect(page.locator('#pvpLoadoutModal')).toBeHidden();

  await expect.poll(async () => {
    return await page.evaluate(() => {
      if (!window.__qa || typeof window.__qa.getRuntimeState !== 'function') return null;
      return window.__qa.getRuntimeState();
    });
  }).not.toBeNull();

  const state = await page.evaluate(() => window.__qa.getRuntimeState());

  expect(state.mode).toBe('PVP_DUEL_AIM');
  expect(state.paused).toBeFalsy();
  expect(state.pvpLoadouts && state.pvpLoadouts.p1 && state.pvpLoadouts.p1.ammo).toBe(picked.p1Ammo);
  expect(state.pvpLoadouts && state.pvpLoadouts.p2 && state.pvpLoadouts.p2.ammo).toBe(picked.p2Ammo);
  expect(state.pvpLoadouts && state.pvpLoadouts.p1 && state.pvpLoadouts.p1.items).toContain(picked.p1Item1);
});

test('save slots are isolated by difficulty (hard/easy)', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  await page.evaluate(() => {
    if (window.__qa && typeof window.__qa.clearAllSaves === 'function') {
      window.__qa.clearAllSaves();
    }
    if (window.__qa && typeof window.__qa.writeSlotSave === 'function') {
      window.__qa.writeSlotSave('hard1p', { wave: 9, gold: 100, mode: { players: 1, difficulty: 'hard' } });
      window.__qa.writeSlotSave('easy1p', { wave: 3, gold: 50, mode: { players: 1, difficulty: 'easy' } });
    }
  });

  await page.check('input[name="modePlayers"][value="1"]');
  await page.check('input[name="modeDifficulty"][value="hard"]');
  await expect(page.locator('#continueBtn')).toBeVisible();
  await expect(page.locator('#continueBtn')).toContainText(/WAVE 9/i);

  await page.check('input[name="modeDifficulty"][value="easy"]');
  await expect(page.locator('#continueBtn')).toBeVisible();
  await expect(page.locator('#continueBtn')).toContainText(/WAVE 3/i);

  await page.check('input[name="modeDifficulty"][value="hard"]');
  await expect(page.locator('#continueBtn')).toContainText(/WAVE 9/i);
});

test('clear save removes only current slot', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  await page.evaluate(() => {
    if (window.__qa && typeof window.__qa.clearAllSaves === 'function') {
      window.__qa.clearAllSaves();
    }
    if (window.__qa && typeof window.__qa.writeSlotSave === 'function') {
      window.__qa.writeSlotSave('hard1p', { wave: 8, gold: 80, mode: { players: 1, difficulty: 'hard' } });
      window.__qa.writeSlotSave('easy1p', { wave: 2, gold: 20, mode: { players: 1, difficulty: 'easy' } });
    }
  });

  await page.check('input[name="modePlayers"][value="1"]');
  await page.check('input[name="modeDifficulty"][value="hard"]');
  await expect(page.locator('#continueBtn')).toContainText(/WAVE 8/i);

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.click('#clearSaveBtn');
  await expect(page.locator('#continueBtn')).toBeHidden();

  await page.check('input[name="modeDifficulty"][value="easy"]');
  await expect(page.locator('#continueBtn')).toBeVisible();
  await expect(page.locator('#continueBtn')).toContainText(/WAVE 2/i);
});

test('shop max-hp cost scales up across multiple buys', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="1"]');
  await startMatch(page);

  const opened = await page.evaluate(() => {
    if (!window.__qa || typeof window.__qa.openShop !== 'function') return false;
    return window.__qa.openShop({ nextWave: 2, gold: 5000 });
  });
  expect(opened).toBeTruthy();
  await expect(page.locator('#shopModal')).toBeVisible();

  const s0 = await page.evaluate(() => window.__qa.getRuntimeState());
  await page.evaluate(() => window.__qa.buyShopMaxHp());
  const s1 = await page.evaluate(() => window.__qa.getRuntimeState());
  await page.evaluate(() => window.__qa.buyShopMaxHp());
  const s2 = await page.evaluate(() => window.__qa.getRuntimeState());

  const cost1 = s0.gold - s1.gold;
  const cost2 = s1.gold - s2.gold;

  expect(s1.upgrades.maxHpLv).toBe(s0.upgrades.maxHpLv + 1);
  expect(s2.upgrades.maxHpLv).toBe(s0.upgrades.maxHpLv + 2);
  expect(s2.p1.maxHp).toBeGreaterThan(s1.p1.maxHp);
  expect(cost1).toBeGreaterThan(0);
  expect(cost2).toBeGreaterThan(cost1);

  await page.evaluate(() => window.__qa.closeShop());
  await expect(page.locator('#shopModal')).toBeHidden();
});
