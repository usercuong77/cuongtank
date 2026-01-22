// Auto-extracted from original HTML
import { MAX } from '../core/MaxSystem.js';
import { BULLET_TYPES, getFireRateMaxLv } from '../constants.js';
import { createDamageText } from '../utils.js';

let Game = null;
export function setShopContext(game) { Game = game; }

function forEachPlayer(cb) {
    if (!Game) return;
    const ps = (Array.isArray(Game.players) && Game.players.length)
        ? Game.players
        : (Game.player ? [Game.player] : []);
    for (const p of ps) {
        if (!p) continue;
        cb(p);
    }
}

function getPlayersSafe() {
    if (!Game) return [];
    if (Array.isArray(Game.players) && Game.players.length) return Game.players.filter(Boolean);
    return Game.player ? [Game.player] : [];
}

function isAnyPlayerAlive() {
    const ps = getPlayersSafe();
    return ps.some(p => (p && (p.hp > 0)));
}

function getAnchorPlayer() {
    const ps = getPlayersSafe();
    // Prefer an alive player so damage texts show near the active survivor
    return ps.find(p => p && p.hp > 0) || ps[0] || null;
}

export const Shop = {
    open: false,
    onContinue: null,
    els: {
        modal: null,
        gold: null,
        nextWave: null,
        btnContinue: null,

        btnBuyMaxHp: null,
        maxHpCost: null,
        maxHpLevel: null,

        btnBuyDmg: null,
        dmgCost: null,
        dmgLevel: null,

        btnBuyFireRate: null,
        fireRateCost: null,
        fireRateLevel: null,

        btnBuySpeed: null,
        speedCost: null,
        speedLevel: null,

        btnBuyMagnet: null,
        magnetCost: null,
        magnetLevel: null,

        btnBuyArmor: null,
        armorCost: null,
        armorLevel: null,
    },
    init() {
        this.els.modal = document.getElementById('shopModal');
        this.els.gold = document.getElementById('shopGold');
        this.els.nextWave = document.getElementById('shopNextWave');
        this.els.btnContinue = document.getElementById('btnShopContinue');

        
        
        // --- Step 3A: Random 3 upgrades mỗi lần mở shop ---
        this.cards = [];
        const grid = document.getElementById('shopCards');
        if (grid) {
            const cards = Array.from(grid.querySelectorAll('.shopCard'));
            for (const card of cards) {
                const btn = card.querySelector('button[id^="btnBuy"]');
                if (!btn) continue; // chỉ random các nâng cấp mua được
                card.dataset.upKey = btn.id;
                this.cards.push(card);
            }
        }

        this._shuffle = (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = (Math.random() * (i + 1)) | 0;
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

this.els.btnBuyMaxHp = document.getElementById('btnBuyMaxHp');
        this.els.maxHpCost = document.getElementById('upMaxHpCost');
        this.els.maxHpLevel = document.getElementById('upMaxHpLevel');

        
        this.els.btnBuyDmg = document.getElementById('btnBuyDmg');
        this.els.dmgCost = document.getElementById('upDmgCost');
        this.els.dmgLevel = document.getElementById('upDmgLevel');

        
        this.els.btnBuyFireRate = document.getElementById('btnBuyFireRate');
        this.els.fireRateCost = document.getElementById('upFireRateCost');
        this.els.fireRateLevel = document.getElementById('upFireRateLevel');

        this.els.btnBuySpeed = document.getElementById('btnBuySpeed');
        this.els.speedCost = document.getElementById('upSpeedCost');
        this.els.speedLevel = document.getElementById('upSpeedLevel');

        

        this.els.btnBuyMagnet = document.getElementById('btnBuyMagnet');
        this.els.magnetCost = document.getElementById('upMagnetCost');
        this.els.magnetLevel = document.getElementById('upMagnetLevel');
        if (this.els.btnBuyMagnet) {
            this.els.btnBuyMagnet.addEventListener('click', () => this.buyMagnet());
        }

        this.els.btnBuyArmor = document.getElementById('btnBuyArmor');
        this.els.armorCost = document.getElementById('upArmorCost');
        this.els.armorLevel = document.getElementById('upArmorLevel');
        if (this.els.btnBuyArmor) {
            this.els.btnBuyArmor.addEventListener('click', () => this.buyArmor());
        }
if (this.els.btnBuyFireRate) {
            this.els.btnBuyFireRate.addEventListener('click', () => this.buyFireRate());
        if (this.els.btnBuySpeed) {
            this.els.btnBuySpeed.addEventListener('click', () => this.buySpeed());
        }
        }
if (this.els.btnBuyDmg) {
            this.els.btnBuyDmg.addEventListener('click', () => this.buyDmg());
        }

if (this.els.btnBuyMaxHp) {
            this.els.btnBuyMaxHp.addEventListener('click', () => this.buyMaxHp());
        }

if (this.els.btnContinue) {
            this.els.btnContinue.addEventListener('click', () => this.continue());
        }

        window.addEventListener('keydown', (e) => {
            if (!this.open) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                this.continue();
            }
        });
    },
    show(nextWaveNum, gold, cb) {
        this.open = true;
        this.onContinue = cb || null;
        if (this.els.gold) this.els.gold.textContent = String(gold || 0);
        if (this.els.nextWave) this.els.nextWave.textContent = String(nextWaveNum || 1);
        if (this.els.modal) this.els.modal.classList.remove('hidden');
        Game.paused = true;
    
        this.randomizeChoices();
        this.refresh();
    },
    maxHpCostForLevel(lv) {
        lv = Math.max(0, lv|0);
        // 50 -> 90 -> 140 -> 200 -> 270 ...
        return 50 + (40 * lv) + (5 * lv * (lv - 1));
    },
    dmgCostForLevel(lv) { lv = Math.max(0, lv|0); return 50 + (40 * lv) + (5 * lv * (lv - 1)); },
    fireRateCostForLevel(lv) { lv = Math.max(0, lv|0); return 50 + (40 * lv) + (5 * lv * (lv - 1)); },
    
    speedCostForLevel(lv) {
        // Lv 0 = chưa mua. Mua lên Lv 1 (+5%) giá 50, sau đó 90, 140...
        lv = Math.max(0, lv|0);
        return 50 + (40 * lv) + (5 * lv * (lv - 1));
    },


    magnetCostForLevel(lv) { lv = Math.max(0, lv|0); return 50 + (40 * lv) + (5 * lv * (lv - 1)); },
    armorCostForLevel(lv) { lv = Math.max(0, lv|0); return 50 + (40 * lv) + (5 * lv * (lv - 1)); },
    getPlayerBaseCooldown() {
        // Ước tính cooldown cơ bản của vũ khí hiện tại (không tính buff/upgrade)
        try {
            if (!Game.player || !Game.player.currentWeaponObj) return 999999;
            const weaponObj = Game.player.currentWeaponObj();
            const baseConfig = BULLET_TYPES[weaponObj.id];
            if (!baseConfig) return 999999;

            let level = weaponObj.level || 1;
            let cooldown = baseConfig.cooldown;

            // Đồng bộ với logic trong Player.shoot (phần cooldown)
            if (weaponObj.id === 'NORMAL') cooldown = Math.max(100, baseConfig.cooldown - (level - 1) * 30);
            else if (weaponObj.id === 'FIRE') cooldown = Math.max(80, baseConfig.cooldown - (level - 1) * 30);
            else if (weaponObj.id === 'STUN') cooldown = Math.max(200, baseConfig.cooldown - (level - 1) * 50);

            return cooldown;
        } catch (e) {
            return 999999;
        }
    },

    isFireRateCapped(lvOverride = null) {
        const frMax = getFireRateMaxLv();
        const lv = (lvOverride !== null) ? (lvOverride|0) : ((Game.upgrades?.fireRateLv ?? 0) | 0);
        return lv >= frMax;
    },

    isUpgradeMaxed(upKey) {
        // Chỉ cap những upgrade có giới hạn rõ ràng để tránh mua "phí vàng"
        if (upKey === 'btnBuyArmor') {
            const lv = ((Game.upgrades?.armorLv ?? 0) | 0);
            return lv >= 12; // 12 * 5% = 60% (đúng cap ở takeDamage)
        }
        if (upKey === 'btnBuySpeed') {
            const lv = (Game.upgrades ? ((Game.upgrades.speedLv ?? 0)|0) : 0);
            return lv >= 12;
        }
        if (upKey === 'btnBuyFireRate') { return this.isFireRateCapped(); }
        return false;
    },


    randomizeChoices() {
        if (!this.cards || this.cards.length === 0) return;

        let pool = this.cards.filter(c => !this.isUpgradeMaxed(c.dataset.upKey));
        if (pool.length === 0) pool = this.cards.slice();
        this._shuffle(pool);

        const pickN = Math.min(3, pool.length);
        const chosen = new Set();
        for (let i = 0; i < pickN; i++) chosen.add(pool[i].dataset.upKey);

        for (const c of this.cards) {
            const show = chosen.has(c.dataset.upKey);
            c.style.display = show ? "block" : "none";
        }
    },

    refresh() {
        // Update gold in header
        if (this.els.gold) this.els.gold.textContent = String(Game.gold || 0);

        // Max HP
        const hpLv = ((Game.upgrades?.maxHpLv ?? 0) | 0);
const hpCost = this.maxHpCostForLevel(hpLv);
        if (this.els.maxHpLevel) this.els.maxHpLevel.textContent = String(hpLv);
        if (this.els.maxHpCost) this.els.maxHpCost.textContent = String(hpCost);
        if (this.els.btnBuyMaxHp) {
            const can = (Game.gold >= hpCost) && isAnyPlayerAlive();
            this.els.btnBuyMaxHp.disabled = !can;
            this.els.btnBuyMaxHp.style.opacity = can ? "1" : "0.55";
            this.els.btnBuyMaxHp.style.cursor = can ? "pointer" : "not-allowed";
        }

        // Damage %
        const dmgLv = ((Game.upgrades?.dmgLv ?? 0) | 0);
const dmgCost = this.dmgCostForLevel(dmgLv);
        if (this.els.dmgLevel) this.els.dmgLevel.textContent = String(dmgLv);
        if (this.els.dmgCost) this.els.dmgCost.textContent = String(dmgCost);
        if (this.els.btnBuyDmg) {
            const can = (Game.gold >= dmgCost) && isAnyPlayerAlive();
            this.els.btnBuyDmg.disabled = !can;
            this.els.btnBuyDmg.style.opacity = can ? "1" : "0.55";
            this.els.btnBuyDmg.style.cursor = can ? "pointer" : "not-allowed";
        }

        // Fire Rate (-5% cooldown)
        const frMax = getFireRateMaxLv();
        let frLv = ((Game.upgrades?.fireRateLv ?? 0) | 0);
if (Game.upgrades && (((Game.upgrades.fireRateLv ?? 0) | 0) > frMax)) { Game.upgrades.fireRateLv = frMax; frLv = frMax; }
        const frCost = this.fireRateCostForLevel(frLv);
        const frCapped = (frLv >= frMax);
        if (this.els.fireRateLevel) this.els.fireRateLevel.textContent = String(frLv);
        if (this.els.fireRateCost) this.els.fireRateCost.textContent = String(frCost);
        if (this.els.btnBuyFireRate) {
            const can = (!frCapped) && (Game.gold >= frCost) && isAnyPlayerAlive();
            this.els.btnBuyFireRate.disabled = !can || frCapped;
            this.els.btnBuyFireRate.style.opacity = can ? "1" : "0.55";
            this.els.btnBuyFireRate.style.cursor = can ? "pointer" : "not-allowed";
        }

        
        // Động Cơ (+5% tốc chạy mỗi cấp, Lv 0 = chưa mua)
        const sLv = (Game.upgrades ? ((Game.upgrades.speedLv ?? 0)|0) : 0);
        const sCapped = sLv >= 12;
        const sCost = this.speedCostForLevel(sLv);
        if (this.els.speedLevel) this.els.speedLevel.textContent = sCapped ? "MAX" : String(sLv);
        if (this.els.speedCost) this.els.speedCost.textContent = sCapped ? "-" : String(sCost);
        if (this.els.btnBuySpeed) {
            const can = (!sCapped) && (Game.gold >= sCost) && isAnyPlayerAlive();
            this.els.btnBuySpeed.disabled = !can || sCapped;
            this.els.btnBuySpeed.style.opacity = can ? "1" : "0.55";
            this.els.btnBuySpeed.style.cursor = can ? "pointer" : "not-allowed";
        }

// Pickup Range (+30px magnet range)
        const mLv = ((Game.upgrades?.magnetLv ?? 0) | 0);
const mCost = this.magnetCostForLevel(mLv);
        if (this.els.magnetLevel) this.els.magnetLevel.textContent = String(mLv);
        if (this.els.magnetCost) this.els.magnetCost.textContent = String(mCost);
        if (this.els.btnBuyMagnet) {
            const can = (Game.gold >= mCost) && isAnyPlayerAlive();
            this.els.btnBuyMagnet.disabled = !can;
            this.els.btnBuyMagnet.style.opacity = can ? "1" : "0.55";
            this.els.btnBuyMagnet.style.cursor = can ? "pointer" : "not-allowed";
        }

        // Armor (-5% damage taken)
        const aLv = ((Game.upgrades?.armorLv ?? 0) | 0);
const aCost = this.armorCostForLevel(aLv);
        const armorCapped = (aLv >= 12);
        if (this.els.armorLevel) this.els.armorLevel.textContent = String(aLv);
        if (this.els.armorCost) this.els.armorCost.textContent = String(aCost);
        if (this.els.btnBuyArmor) {
            const can = (!armorCapped) && (Game.gold >= aCost) && isAnyPlayerAlive();
            this.els.btnBuyArmor.disabled = !can || armorCapped;
            this.els.btnBuyArmor.style.opacity = can ? "1" : "0.55";
            this.els.btnBuyArmor.style.cursor = can ? "pointer" : "not-allowed";
        }
    },
    buyMaxHp() {
        if (!this.open) return;
        const anchor = getAnchorPlayer();
        if (!anchor) return;

        const lv = ((Game.upgrades?.maxHpLv ?? 0) | 0);
const cost = this.maxHpCostForLevel(lv);

        if (Game.gold < cost) {
            createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
            return;
        }

        // Pay
        Game.gold -= cost;
        Game.ui.updateGold(Game.gold);

        // Apply
        Game.upgrades.maxHpLv = lv + 1;
        forEachPlayer((p) => {
            p.maxHp += 20;
            // Step 1.2: don't revive a dead player inside shop
            if (p.hp > 0) p.hp = Math.min(p.hp + 20, p.maxHp);
        });
        if (Game.ui && typeof Game.ui.updateHealth === 'function') {
            forEachPlayer((p) => {
                if (!p) return;
                Game.ui.updateHealth(p.hp, p.maxHp, p.playerIndex || 1);
            });
        }

        createDamageText(anchor.x, anchor.y - 45, "MAX HP +20", "#FFD700");

        
        try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){};

        this.refresh();
    },
    buyDmg() {
        if (!this.open) return;
        const anchor = getAnchorPlayer();
        if (!anchor) return;

        const lv = ((Game.upgrades?.dmgLv ?? 0) | 0);
const cost = this.dmgCostForLevel(lv);

        if (Game.gold < cost) {
            createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
            return;
        }

        // Pay
        Game.gold -= cost;
        Game.ui.updateGold(Game.gold);

        // Apply
        Game.upgrades.dmgLv = lv + 1;

        createDamageText(anchor.x, anchor.y - 45, "DMG +10%", "#FFD700");
        try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}

        this.refresh();
    },
    buyFireRate() {
        if (!this.open) return;
        const anchor = getAnchorPlayer();
        if (!anchor) return;

        const lv = ((Game.upgrades?.fireRateLv ?? 0) | 0);
const frMax = getFireRateMaxLv();
        if (lv >= frMax) { createDamageText(anchor.x, anchor.y - 45, 'CD MAX', '#FFD700'); return; }
const cost = this.fireRateCostForLevel(lv);

        if (Game.gold < cost) {
            createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
            return;
        }

        // Pay
        Game.gold -= cost;
        Game.ui.updateGold(Game.gold);

        // Apply
        Game.upgrades.fireRateLv = lv + 1;

        createDamageText(anchor.x, anchor.y - 45, "CD -5%", "#FFD700");
        try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}

        this.refresh();
    },
    buySpeed() {
        if (!this.open) return;
        const anchor = getAnchorPlayer();
        if (!anchor) return;

        const lv = (Game.upgrades ? ((Game.upgrades.speedLv ?? 0)|0) : 0);
        if (lv >= 12) {
            createDamageText(anchor.x, anchor.y - 45, "MAX", "#FFD700");
            return;
        }
        const cost = this.speedCostForLevel(lv);

        if (Game.gold < cost) {
            createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
            return;
        }

        Game.gold -= cost;
        Game.ui.updateGold(Game.gold);

        Game.upgrades.speedLv = lv + 1;

        createDamageText(anchor.x, anchor.y - 45, "SPEED +5%", "#FFD700");
        try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}
        this.refresh();
    },


    buyMagnet() {
        if (!this.open) return;
        const anchor = getAnchorPlayer();
        if (!anchor) return;

        const lv = ((Game.upgrades?.magnetLv ?? 0) | 0);
const cost = this.magnetCostForLevel(lv);
        if (Game.gold < cost) {
            createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
            return;
        }

        Game.gold -= cost;
        Game.ui.updateGold(Game.gold);

        Game.upgrades.magnetLv = lv + 1;

        createDamageText(anchor.x, anchor.y - 45, "MAGNET +30px", "#FFD700");
        try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}
        this.refresh();
    },

    buyArmor() {
        if (!this.open) return;
        const anchor = getAnchorPlayer();
        if (!anchor) return;

        const lv = ((Game.upgrades?.armorLv ?? 0) | 0);
if (lv >= 12) { createDamageText(anchor.x, anchor.y - 45, 'ARMOR MAX', '#FFD700'); return; }
const cost = this.armorCostForLevel(lv);
        if (Game.gold < cost) {
            createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
            return;
        }

        Game.gold -= cost;
        Game.ui.updateGold(Game.gold);

        Game.upgrades.armorLv = lv + 1;

        createDamageText(anchor.x, anchor.y - 45, "ARMOR -5%", "#FFD700");
        try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}
        this.refresh();
    },

    hide() {
        this.open = false;
        this.onContinue = null;
        if (this.els.modal) this.els.modal.classList.add('hidden');
    },
    continue() {
        if (!this.open) return;
        const cb = this.onContinue;
        this.hide();
        Game.paused = false;
        // reset fps cap timer to avoid stutter after pause
        Game._fpsCapLast = performance.now();
        if (typeof cb === 'function') cb();
    }
};
