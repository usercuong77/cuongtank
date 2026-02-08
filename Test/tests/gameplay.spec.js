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

async function startPvpMatchAndConfirm(page) {
  await page.goto('/?qa=1');
  await dismissWelcome(page);
  await page.check('input[name="modePlayers"][value="2"]');
  await page.check('input[name="mode2p"][value="pvp"]');
  await startMatch(page);
  await expect(page.locator('#pvpLoadoutModal')).toBeVisible();
  await page.click('#pvpLiveConfirm');
  await expect(page.locator('#pvpLoadoutModal')).toBeHidden();
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

test('pvp round end awards win to surviving player', async ({ page }) => {
  await startPvpMatchAndConfirm(page);

  const state = await page.evaluate(() => {
    if (!window.__qa) return null;
    const s = window.__qa.getRuntimeState();
    if (!s || !s.p2) return null;
    const okActive = window.__qa.pvpSetActive();
    const okHp = window.__qa.pvpSetHp(0, s.p2.maxHp);
    const okEnd = window.__qa.pvpCheckRoundEnd();
    return { okActive, okHp, okEnd, state: window.__qa.getRuntimeState() };
  });

  expect(state).toBeTruthy();
  expect(state.okActive).toBeTruthy();
  expect(state.okHp).toBeTruthy();
  expect(state.okEnd).toBeTruthy();
  expect(state.state && state.state.pvp).toBeTruthy();
  expect(state.state.pvp.state).toBe('roundEnd');
  expect(state.state.pvp.wins[0]).toBe(0);
  expect(state.state.pvp.wins[1]).toBe(1);
  expect(state.state.pvp.round).toBe(2);
  expect(state.state.pvp.matchWinner).toBe(0);
  expect(state.state.pvp.freeze).toBeTruthy();
});

test('pvp match win condition reaches matchEnd and shows replay button', async ({ page }) => {
  await startPvpMatchAndConfirm(page);

  const state = await page.evaluate(() => {
    if (!window.__qa) return null;
    const okActive = window.__qa.pvpSetActive();
    const okScore = window.__qa.pvpSetScore(2, 0, 3);
    const okEnd = window.__qa.pvpForceRoundResult(1);
    const okAdvance = window.__qa.pvpAdvanceRoundEnd();
    return { okActive, okScore, okEnd, okAdvance, state: window.__qa.getRuntimeState() };
  });

  expect(state).toBeTruthy();
  expect(state.okActive).toBeTruthy();
  expect(state.okScore).toBeTruthy();
  expect(state.okEnd).toBeTruthy();
  expect(state.okAdvance).toBeTruthy();
  expect(state.state && state.state.pvp).toBeTruthy();
  expect(state.state.pvp.state).toBe('matchEnd');
  expect(state.state.pvp.matchWinner).toBe(1);
  expect(state.state.pvp.wins[0]).toBe(3);

  await expect.poll(async () => {
    return await page.evaluate(() => {
      const btn = document.getElementById('btnPvpReplay');
      if (!btn) return false;
      return getComputedStyle(btn).display !== 'none';
    });
  }).toBeTruthy();

  await expect(page.locator('#victoryScreen')).toBeHidden();
});

test('assassin skill cooldown regression stays correct across modes', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  const cds = await page.evaluate(() => {
    if (!window.__qa || typeof window.__qa.qaGetSkillCooldownByMode !== 'function') return null;
    return {
      pve: {
        q: window.__qa.qaGetSkillCooldownByMode('assassin', 'clone', 'PVE'),
        e: window.__qa.qaGetSkillCooldownByMode('assassin', 'stealth', 'PVE'),
        r: window.__qa.qaGetSkillCooldownByMode('assassin', 'vampirism', 'PVE')
      },
      pvp: {
        q: window.__qa.qaGetSkillCooldownByMode('assassin', 'clone', 'PVP_DUEL_AIM'),
        e: window.__qa.qaGetSkillCooldownByMode('assassin', 'stealth', 'PVP_DUEL_AIM'),
        r: window.__qa.qaGetSkillCooldownByMode('assassin', 'vampirism', 'PVP_DUEL_AIM')
      }
    };
  });

  expect(cds).toBeTruthy();
  expect(cds.pve.q).toBe(5500);
  expect(cds.pve.e).toBe(11500);
  expect(cds.pve.r).toBe(19000);
  expect(cds.pvp.q).toBe(6100);
  expect(cds.pvp.e).toBe(12500);
  expect(cds.pvp.r).toBe(21000);
  expect(cds.pvp.q).toBeGreaterThan(cds.pve.q);
  expect(cds.pvp.e).toBeGreaterThan(cds.pve.e);
  expect(cds.pvp.r).toBeGreaterThan(cds.pve.r);
});

test('pvp damage regression remains stable for ammo and execute thresholds', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  const result = await page.evaluate(() => {
    if (!window.__qa || typeof window.__qa.qaCalcPvpDamageByMode !== 'function') return null;
    return {
      pveBase: window.__qa.qaCalcPvpDamageByMode({ mode: 'PVE', baseDamage: 100, ammoId: 'ap40', targetArmor: 0.2 }),
      pvpAp40: window.__qa.qaCalcPvpDamageByMode({ mode: 'PVP_DUEL_AIM', baseDamage: 100, ammoId: 'ap40', targetArmor: 0.2 }),
      pvpAp40LowArmor: window.__qa.qaCalcPvpDamageByMode({ mode: 'PVP_DUEL_AIM', baseDamage: 100, ammoId: 'ap40', targetArmor: 0.03 }),
      pvpExecutionerLowHp: window.__qa.qaCalcPvpDamageByMode({
        mode: 'PVP_DUEL_AIM',
        baseDamage: 100,
        ammoId: 'executioner',
        targetHp: 30,
        targetMaxHp: 100,
        targetArmor: 0.2
      }),
      pvpJammerFinisher: window.__qa.qaCalcPvpDamageByMode({
        mode: 'PVP_DUEL_AIM',
        baseDamage: 100,
        ammoId: 'jammer',
        ownerItems: ['finisher_chip'],
        targetHp: 30,
        targetMaxHp: 100,
        targetArmor: 0.2
      })
    };
  });

  expect(result).toBeTruthy();
  expect(result.pveBase.shotDamage).toBe(100);
  expect(result.pveBase.finalDamage).toBe(100);

  expect(result.pvpAp40.shotDamage).toBe(110);
  expect(result.pvpAp40.finalDamage).toBe(110);

  expect(result.pvpAp40LowArmor.shotDamage).toBe(110);
  expect(result.pvpAp40LowArmor.finalDamage).toBe(105);

  expect(result.pvpExecutionerLowHp.shotDamage).toBe(92);
  expect(result.pvpExecutionerLowHp.finalDamage).toBe(112);

  expect(result.pvpJammerFinisher.shotDamage).toBe(88);
  expect(result.pvpJammerFinisher.finalDamage).toBe(104);
});

test('aim-assist regression: Easy mode keeps 55% predictive lead preset', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  await page.check('input[name="modePlayers"][value="1"]');
  await page.check('input[name="modeDifficulty"][value="easy"]');

  const data = await page.evaluate(() => {
    if (!window.__qa) return null;
    const snap = (typeof window.__qa.qaGetAimAssistSnapshot === 'function') ? window.__qa.qaGetAimAssistSnapshot() : null;
    const lead = (typeof window.__qa.qaCalcAimLeadMsByMode === 'function')
      ? window.__qa.qaCalcAimLeadMsByMode('easy', 120, 12, true)
      : null;
    return { snap, lead };
  });

  expect(data).toBeTruthy();
  expect(data.snap).toBeTruthy();
  expect(data.snap.isEasy).toBeTruthy();
  expect(data.snap.leadBlendBase).toBeCloseTo(0.55, 6);
  expect(data.snap.leadBlend).toBeCloseTo(0.55, 6);

  expect(data.lead).toBeTruthy();
  expect(data.lead.mode).toBe('easy');
  expect(data.lead.leadBase).toBeCloseTo(0.55, 6);
  expect(data.lead.leadBlend).toBeCloseTo(0.55, 6);
  expect(data.lead.leadMs).toBeCloseTo(data.lead.travelMs * 0.55, 3);
});

test('aim-assist regression: 2P Bot keeps 30% predictive lead preset', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  await page.check('input[name="modePlayers"][value="2"]');
  await page.check('input[name="mode2p"][value="coop"]');

  const data = await page.evaluate(() => {
    if (!window.__qa) return null;
    const snap = (typeof window.__qa.qaGetAimAssistSnapshot === 'function') ? window.__qa.qaGetAimAssistSnapshot() : null;
    const lead = (typeof window.__qa.qaCalcAimLeadMsByMode === 'function')
      ? window.__qa.qaCalcAimLeadMsByMode('coop', 120, 12, true)
      : null;
    const easyLead = (typeof window.__qa.qaCalcAimLeadMsByMode === 'function')
      ? window.__qa.qaCalcAimLeadMsByMode('easy', 120, 12, true)
      : null;
    return { snap, lead, easyLead };
  });

  expect(data).toBeTruthy();
  expect(data.snap).toBeTruthy();
  expect(data.snap.is2pBot).toBeTruthy();
  expect(data.snap.leadBlendBase).toBeCloseTo(0.30, 6);
  expect(data.snap.leadBlend).toBeCloseTo(0.30, 6);

  expect(data.lead).toBeTruthy();
  expect(data.lead.mode).toBe('coop');
  expect(data.lead.leadBase).toBeCloseTo(0.30, 6);
  expect(data.lead.leadBlend).toBeCloseTo(0.30, 6);
  expect(data.lead.leadMs).toBeCloseTo(data.lead.travelMs * 0.30, 3);

  expect(data.easyLead).toBeTruthy();
  expect(data.easyLead.leadMs).toBeGreaterThan(data.lead.leadMs);
});

test('aim-assist regression: disabled setting forces Easy/2P Bot lead to 0', async ({ page }) => {
  await page.goto('/?qa=1');
  await dismissWelcome(page);

  await page.click('#btnSettingsStart');
  await expect(page.locator('#settingsModal')).toBeVisible();
  await page.uncheck('#setAimAssist');
  await page.click('#btnCloseSettings');
  await expect(page.locator('#settingsModal')).toBeHidden();

  const data = await page.evaluate(() => {
    if (!window.__qa) return null;
    return {
      easy: window.__qa.qaCalcAimLeadMsByMode('easy', 120, 12),
      coop: window.__qa.qaCalcAimLeadMsByMode('coop', 120, 12)
    };
  });

  expect(data).toBeTruthy();
  expect(data.easy).toBeTruthy();
  expect(data.coop).toBeTruthy();
  expect(data.easy.aimAssistOn).toBeFalsy();
  expect(data.coop.aimAssistOn).toBeFalsy();
  expect(data.easy.leadBlend).toBe(0);
  expect(data.coop.leadBlend).toBe(0);
  expect(data.easy.leadMs).toBe(0);
  expect(data.coop.leadMs).toBe(0);
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
