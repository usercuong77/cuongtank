// === QA Hooks Module ===
// Extracted from core-ui-vfx to keep runtime modules smaller and easier to maintain.

const __installQaHooks = function() {
            try {
                const __getAction = (name) => {
                    try {
                        const app = window.App || null;
                        const actions = app && app.actions;
                        return (actions && typeof actions[name] === 'function') ? actions[name] : null;
                    } catch(e) {
                        return null;
                    }
                };
                const __notifyStartSaveUI = () => {
                    try {
                        const app = window.App || null;
                        if (app && app.runtime && typeof app.runtime.updateStartSaveUI === 'function') {
                            app.runtime.updateStartSaveUI();
                            return;
                        }
                    } catch(e) {}
                    try {
                        const fn = __getAction('updateStartSaveUI');
                        if (typeof fn === 'function') { fn(); return; }
                    } catch(e) {}
                    try { if (typeof window.__updateStartSaveUI === 'function') window.__updateStartSaveUI(); } catch(e) {}
                };
                const __readStartModeCfg = () => {
                    try {
                        const fn = __getAction('readStartModeCfg');
                        if (typeof fn === 'function') return fn();
                    } catch(e) {}
                    try { if (window.__readStartModeCfg) return window.__readStartModeCfg(); } catch(e) {}
                    return null;
                };
                const params = new URLSearchParams((window && window.location && window.location.search) ? window.location.search : '');
                if (params.get('qa') !== '1') return;
                window.__qa = Object.assign({}, window.__qa || {}, {
                    forceGameOver: () => {
                        try { if (Game && typeof Game.gameOver === 'function') Game.gameOver(); } catch(e) {}
                    },
                    forceVictory: () => {
                        try { if (Game && typeof Game.victory === 'function') Game.victory(); } catch(e) {}
                    },
                    getRuntimeState: () => {
                        try {
                            const p1 = (Game && (Game.player || (Game.players && Game.players[0]))) || null;
                            const p2 = (Game && (Game.player2 || (Game.players && Game.players[1]))) || null;
                            let pvpLoadouts = null;
                            let pvpState = null;
                            try {
                                pvpLoadouts = (Game && Game.pvpLoadouts) ? JSON.parse(JSON.stringify(Game.pvpLoadouts)) : null;
                            } catch(e) {
                                pvpLoadouts = null;
                            }
                            try {
                                pvpState = (Game && Game.pvp) ? {
                                    state: String(Game.pvp.state || ''),
                                    round: Number(Game.pvp.round || 0),
                                    totalRounds: Number(Game.pvp.totalRounds || 0),
                                    roundsToWin: Number(Game.pvp.roundsToWin || 0),
                                    wins: Array.isArray(Game.pvp.wins) ? [Number(Game.pvp.wins[0] || 0), Number(Game.pvp.wins[1] || 0)] : [0, 0],
                                    matchWinner: Number(Game.pvp.matchWinner || 0),
                                    freeze: !!Game.pvp.freeze
                                } : null;
                            } catch(e) {
                                pvpState = null;
                            }
                            return {
                                active: !!(Game && Game.active),
                                paused: !!(Game && Game.paused),
                                mode: (Game && Game.mode) ? String(Game.mode) : null,
                                wave: (typeof WaveManager !== 'undefined' && WaveManager && typeof WaveManager.wave !== 'undefined') ? (WaveManager.wave|0) : null,
                                gold: (Game && typeof Game.gold === 'number') ? Math.floor(Game.gold) : 0,
                                shopOpen: !!(typeof Shop !== 'undefined' && Shop && Shop.open),
                                pvpLoadouts: pvpLoadouts,
                                pvp: pvpState,
                                upgrades: (Game && Game.upgrades) ? {
                                    maxHpLv: Game.upgrades.maxHpLv|0,
                                    dmgLv: Game.upgrades.dmgLv|0,
                                    fireRateLv: Game.upgrades.fireRateLv|0,
                                    speedLv: Game.upgrades.speedLv|0,
                                    magnetLv: Game.upgrades.magnetLv|0,
                                    armorLv: Game.upgrades.armorLv|0
                                } : null,
                                p1: p1 ? { hp: Number(p1.hp || 0), maxHp: Number(p1.maxHp || 0) } : null,
                                p2: p2 ? { hp: Number(p2.hp || 0), maxHp: Number(p2.maxHp || 0) } : null,
                                assassinUnlocked: !!(Game && Game.unlocks && Game.unlocks.assassin),
                                assassinUnlockReason: (Game && Game.unlocks && Game.unlocks.assassinReason) ? String(Game.unlocks.assassinReason) : ''
                            };
                        } catch(e) {
                            return null;
                        }
                    },
                    openShop: (opts) => {
                        try {
                            if (typeof Shop === 'undefined' || !Shop || typeof Shop.show !== 'function') return false;
                            const options = (opts && typeof opts === 'object') ? opts : {};
                            const nextWave = Math.max(1, (parseInt(options.nextWave ?? options.wave, 10) || 2));
                            if (typeof options.gold !== 'undefined') {
                                const g = Math.max(0, Math.floor(Number(options.gold) || 0));
                                if (Game) Game.gold = g;
                                try { if (Game && Game.ui && typeof Game.ui.updateGold === 'function') Game.ui.updateGold(Game.gold); } catch(e) {}
                            }
                            Shop.show(nextWave, (Game && typeof Game.gold === 'number') ? Game.gold : 0, null);
                            return !!Shop.open;
                        } catch(e) {
                            return false;
                        }
                    },
                    buyShopMaxHp: () => {
                        try {
                            if (typeof Shop === 'undefined' || !Shop || typeof Shop.buyMaxHp !== 'function') return false;
                            if (!Shop.open) return false;
                            Shop.buyMaxHp();
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    closeShop: () => {
                        try {
                            if (typeof Shop === 'undefined' || !Shop || typeof Shop.hide !== 'function') return false;
                            Shop.hide();
                            return !Shop.open;
                        } catch(e) {
                            return false;
                        }
                    },
                    setAssassinUnlock: (reason) => {
                        try {
                            unlockAssassin(reason || 'qa');
                            return !!(Game && Game.unlocks && Game.unlocks.assassin);
                        } catch(e) {
                            return false;
                        }
                    },
                    clearAssassinUnlock: () => {
                        try {
                            if (!Game.unlocks || typeof Game.unlocks !== 'object') Game.unlocks = { assassin: false };
                            Game.unlocks.assassin = false;
                            Game.unlocks.assassinReason = '';
                            localStorage.setItem('tankUnlocks_v1', JSON.stringify(Game.unlocks));
                            try { if (window.__refreshUnlocks) window.__refreshUnlocks(); } catch(e) {}
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    writeSlotSave: (slot, snap) => {
                        try {
                            const rawSlot = (slot == null) ? 'hard1p' : String(slot);
                            const cleanSlot = rawSlot.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                            const key = cleanSlot ? ('tank_save_v1::' + cleanSlot) : 'tank_save_v1';
                            const payload = {
                                version: 1,
                                ts: Date.now(),
                                data: { kind: 'S2_MINIMAL', snap: snap || {} }
                            };
                            localStorage.setItem(key, JSON.stringify(payload));
                            try {
                                const w = (snap && typeof snap.wave !== 'undefined') ? (parseInt(snap.wave, 10) || 1) : 1;
                                if (w >= ASSASSIN_UNLOCK_WAVE) unlockAssassin('wave20');
                            } catch(e) {}
                            __notifyStartSaveUI();
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    clearAllSaves: () => {
                        try {
                            const keys = [];
                            for (let i = 0; i < localStorage.length; i++) {
                                const k = localStorage.key(i);
                                if (k && k.indexOf('tank_save_v1') === 0) keys.push(k);
                            }
                            keys.forEach((k) => localStorage.removeItem(k));
                            __notifyStartSaveUI();
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    pvpSetActive: () => {
                        try {
                            if (!Game || Game.mode !== 'PVP_DUEL_AIM') return false;
                            if (!Game.pvp && typeof Game.initPvpRounds === 'function') Game.initPvpRounds();
                            if (!Game.pvp) return false;
                            Game.pvp.state = 'active';
                            Game.pvp.freeze = false;
                            Game.pvp.countdownEnd = 0;
                            Game.pvp.roundEndAt = 0;
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    pvpSetScore: (p1Wins, p2Wins, round) => {
                        try {
                            if (!Game || !Game.pvp) return false;
                            Game.pvp.wins = [Math.max(0, parseInt(p1Wins, 10) || 0), Math.max(0, parseInt(p2Wins, 10) || 0)];
                            if (typeof round !== 'undefined') Game.pvp.round = Math.max(1, parseInt(round, 10) || 1);
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    pvpSetHp: (p1Hp, p2Hp) => {
                        try {
                            if (!Game || !Game.players || Game.players.length < 2) return false;
                            const p1 = Game.players[0];
                            const p2 = Game.players[1];
                            if (!p1 || !p2) return false;
                            p1.hp = Math.max(0, Math.min(Number(p1.maxHp || 0), Number(p1Hp || 0)));
                            p2.hp = Math.max(0, Math.min(Number(p2.maxHp || 0), Number(p2Hp || 0)));
                            try {
                                const prevPid = Game.__uiPid;
                                Game.__uiPid = 1;
                                if (Game.ui && typeof Game.ui.updateHealth === 'function') Game.ui.updateHealth(p1.hp, p1.maxHp);
                                Game.__uiPid = 2;
                                if (Game.ui && typeof Game.ui.updateHealth === 'function') Game.ui.updateHealth(p2.hp, p2.maxHp);
                                Game.__uiPid = prevPid;
                            } catch(e) {}
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    pvpCheckRoundEnd: () => {
                        try {
                            if (!Game || typeof Game.pvpCheckRoundEnd !== 'function') return false;
                            Game.pvpCheckRoundEnd();
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    pvpForceRoundResult: (winner) => {
                        try {
                            if (!Game || typeof Game.pvpEndRound !== 'function') return false;
                            Game.pvpEndRound(parseInt(winner, 10) || 0);
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    pvpAdvanceRoundEnd: () => {
                        try {
                            if (!Game || !Game.pvp || typeof Game.pvpTick !== 'function') return false;
                            if (Game.pvp.state !== 'roundEnd') return false;
                            Game.pvp.roundEndAt = Date.now() - 1;
                            Game.pvpTick();
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    qaGetSkillCooldownByMode: (systemId, skillKey, mode) => {
                        try {
                            const sid = String(systemId || 'default');
                            const key = String(skillKey || 'clone');
                            const modeKey = String(mode || ((Game && Game.mode) ? Game.mode : 'PVE'));
                            const sys = getTankSystem(sid);
                            const fallback = getTankSystem('default');
                            const base = (sys && sys.skills && sys.skills[key]) ? sys.skills[key] : ((fallback && fallback.skills) ? fallback.skills[key] : null);
                            if (!base) return null;
                            if (sid === 'assassin' && modeKey === 'PVP_DUEL_AIM') {
                                const pvpCd = ASSASSIN_PVP_SKILL_COOLDOWNS[key];
                                if (typeof pvpCd === 'number') return pvpCd;
                            }
                            return (typeof base.cooldown === 'number') ? base.cooldown : null;
                        } catch(e) {
                            return null;
                        }
                    },
                    qaCalcPvpDamageByMode: (opts) => {
                        try {
                            const o = (opts && typeof opts === 'object') ? opts : {};
                            const mode = (String(o.mode || 'PVP_DUEL_AIM') === 'PVP_DUEL_AIM') ? 'PVP_DUEL_AIM' : 'PVE';
                            const baseDamage = Math.max(0, Number(o.baseDamage || 0));
                            const ammoIdRaw = String(o.ammoId || '').trim();
                            const ammo = (ammoIdRaw && PVP_AMMO_TYPES[ammoIdRaw]) ? PVP_AMMO_TYPES[ammoIdRaw] : null;
                            const toItemList = (src) => {
                                const arr = Array.isArray(src) ? src : [];
                                const out = [];
                                const seen = {};
                                for (let i = 0; i < arr.length; i++) {
                                    const id = String(arr[i] || '').trim();
                                    if (!id || !PVP_ITEM_TYPES[id] || seen[id]) continue;
                                    out.push(id);
                                    seen[id] = true;
                                    if (out.length >= 6) break;
                                }
                                return out;
                            };
                            const ownerItems = toItemList(o.ownerItems);
                            const targetItems = toItemList(o.targetItems);
                            const ownerSystemId = String(o.ownerSystemId || 'default');
                            const targetHp = Math.max(0, Number((typeof o.targetHp !== 'undefined') ? o.targetHp : 100));
                            const targetMaxHp = Math.max(1, Number((typeof o.targetMaxHp !== 'undefined') ? o.targetMaxHp : 100));
                            const targetArmor = Math.max(0, Math.min(0.75, Number((typeof o.targetArmor !== 'undefined') ? o.targetArmor : 0)));
                            const targetIsSummon = !!o.targetIsSummon;
                            const targetShielded = !!o.targetShielded;
                            const targetSkillCastAgoMs = (typeof o.targetSkillCastAgoMs === 'number') ? Math.max(0, o.targetSkillCastAgoMs) : null;
                            const now = Date.now();

                            const owner = {
                                pid: 1,
                                systemId: ownerSystemId,
                                _pvpLoadout: { ammo: (ammo && ammo.id) ? ammo.id : 'ap40', items: ownerItems }
                            };
                            const target = {
                                pid: 2,
                                hp: targetHp,
                                maxHp: targetMaxHp,
                                innateArmor: targetArmor,
                                _pvpLoadout: { ammo: 'ap40', items: targetItems },
                                effects: {
                                    stun: { active: false, endTime: 0 },
                                    slow: { active: false, endTime: 0 }
                                },
                                buffs: {
                                    shield: { active: false },
                                    juggerShield: { active: false },
                                    siege: { active: false }
                                }
                            };
                            if (targetIsSummon) {
                                target.ownerPid = 2;
                                delete target.pid;
                            }
                            if (targetShielded) target.buffs.shield.active = true;
                            if (targetSkillCastAgoMs !== null) target._pvpLastSkillCast = now - targetSkillCastAgoMs;

                            let shotDamage = baseDamage;
                            if (mode === 'PVP_DUEL_AIM' && ammo) shotDamage *= (ammo.damageMult || 1);
                            if (mode === 'PVP_DUEL_AIM' && ownerItems.indexOf('duel_capacitor') >= 0) {
                                shotDamage *= (PVP_ITEM_TYPES.duel_capacitor.bulletDamageMult || 1);
                            }
                            shotDamage = Math.max(1, Math.round(shotDamage));

                            let finalDamage = shotDamage;
                            if (mode === 'PVP_DUEL_AIM') {
                                finalDamage = pvpBulletDamageForTarget(owner, target, { pvpAmmoId: ammo ? ammo.id : '' }, shotDamage);
                            }
                            return {
                                mode: mode,
                                ammoId: ammo ? ammo.id : null,
                                baseDamage: baseDamage,
                                shotDamage: shotDamage,
                                finalDamage: finalDamage,
                                estimatedArmor: pvpEstimateArmor(target)
                            };
                        } catch(e) {
                            return null;
                        }
                    },
                    qaGetAimAssistSnapshot: () => {
                        try {
                            const cfgRaw = __readStartModeCfg() || {};
                            const players = (parseInt(cfgRaw.players, 10) === 2) ? 2 : 1;
                            const difficulty = (String(cfgRaw.difficulty || 'hard').toLowerCase() === 'easy') ? 'easy' : 'hard';
                            const p2Mode = (String(cfgRaw.p2Mode || 'coop').toLowerCase() === 'pvp') ? 'pvp' : 'coop';
                            const isEasy = (players === 1 && difficulty === 'easy');
                            const is2pBot = (players === 2 && p2Mode !== 'pvp');
                            const isPvp = (players === 2 && p2Mode === 'pvp');
                            const aimAssistOn = !(
                                typeof MAX !== 'undefined' &&
                                MAX &&
                                MAX.State &&
                                MAX.State.save &&
                                MAX.State.save.settings &&
                                MAX.State.save.settings.aimAssist === false
                            );
                            const leadBlendBase = isEasy ? EASY_AUTO_AIM_LEAD_BLEND : (is2pBot ? COOP_AUTO_AIM_LEAD_BLEND : 0);
                            const leadBlend = aimAssistOn ? leadBlendBase : 0;
                            return {
                                players: players,
                                difficulty: difficulty,
                                p2Mode: p2Mode,
                                isEasy: isEasy,
                                is2pBot: is2pBot,
                                isPvp: isPvp,
                                aimAssistOn: aimAssistOn,
                                leadBlendBase: Number(leadBlendBase || 0),
                                leadBlend: Number(leadBlend || 0),
                                autoAimLeadMaxMs: Number(AUTO_AIM_LEAD_MAX_MS || 0),
                                pvpLeadFactor: Number(PVP_AIM_LEAD_FACTOR || 0),
                                pvpLeadMaxMs: Number(PVP_AIM_LEAD_MAX_MS || 0)
                            };
                        } catch(e) {
                            return null;
                        }
                    },
                    qaCalcAimLeadMsByMode: (modeKey, distance, bulletSpeed, aimAssistOnOverride) => {
                        try {
                            const modeRaw = String(modeKey || 'easy').toLowerCase();
                            const mode = (modeRaw === 'pvp') ? 'pvp' : ((modeRaw === 'coop' || modeRaw === '2pbot' || modeRaw === 'bot2p') ? 'coop' : 'easy');
                            const dist = Math.max(0, Number(distance || 0));
                            const spd = Math.max(1, Number(bulletSpeed || 12));
                            const travelMs = (dist / (spd * 60)) * 1000;
                            const hasOverride = (typeof aimAssistOnOverride !== 'undefined');
                            const aimAssistOn = hasOverride ? !!aimAssistOnOverride : !(
                                typeof MAX !== 'undefined' &&
                                MAX &&
                                MAX.State &&
                                MAX.State.save &&
                                MAX.State.save.settings &&
                                MAX.State.save.settings.aimAssist === false
                            );
                            if (mode === 'pvp') {
                                const factor = aimAssistOn ? Number(PVP_AIM_LEAD_FACTOR || 0) : 0;
                                const leadMs = Math.max(0, Math.min(Number(PVP_AIM_LEAD_MAX_MS || 0), travelMs * factor));
                                return {
                                    mode: mode,
                                    aimAssistOn: aimAssistOn,
                                    travelMs: travelMs,
                                    leadBase: factor,
                                    leadMs: leadMs,
                                    leadMaxMs: Number(PVP_AIM_LEAD_MAX_MS || 0)
                                };
                            }
                            const baseBlend = (mode === 'easy') ? Number(EASY_AUTO_AIM_LEAD_BLEND || 0) : Number(COOP_AUTO_AIM_LEAD_BLEND || 0);
                            const blend = aimAssistOn ? baseBlend : 0;
                            const leadMs = Math.max(0, Math.min(Number(AUTO_AIM_LEAD_MAX_MS || 0), travelMs * blend));
                            return {
                                mode: mode,
                                aimAssistOn: aimAssistOn,
                                travelMs: travelMs,
                                leadBase: baseBlend,
                                leadBlend: blend,
                                leadMs: leadMs,
                                leadMaxMs: Number(AUTO_AIM_LEAD_MAX_MS || 0)
                            };
                        } catch(e) {
                            return null;
                        }
                    },
                    isReady: true
                });
            } catch(e) {}
        };

window.__installQaHooks = __installQaHooks;
try {
    const __app = window.App || (window.App = {});
    __app.actions = __app.actions || {};
    __app.actions.installQaHooks = __installQaHooks;
} catch(e) {}
