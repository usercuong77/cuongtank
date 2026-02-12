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
                const __resolveQaPlayer = (pid) => {
                    try {
                        const __pid = parseInt(pid, 10);
                        if (!Game) return null;
                        if (__pid === 2) {
                            if (Game.player2) return Game.player2;
                            if (Array.isArray(Game.players) && Game.players[1]) return Game.players[1];
                            return null;
                        }
                        if (__pid > 0 && Array.isArray(Game.players) && Game.players[__pid - 1]) return Game.players[__pid - 1];
                        return Game.player || (Array.isArray(Game.players) ? Game.players[0] : null) || null;
                    } catch(e) {
                        return null;
                    }
                };
                const __normalizeSkillKey = (skillKey) => {
                    const raw = String(skillKey || '').trim().toLowerCase();
                    if (raw === 'q' || raw === 'clone') return 'clone';
                    if (raw === 'e' || raw === 'stealth') return 'stealth';
                    if (raw === 'r' || raw === 'vampirism') return 'vampirism';
                    return raw;
                };
                const __createQaDummyEnemy = (x, y) => {
                    return {
                        x: Number(x || 0),
                        y: Number(y || 0),
                        radius: 18,
                        hp: 999999,
                        maxHp: 999999,
                        typeKey: 'QA_DUMMY',
                        markedForDeletion: false,
                        effects: {
                            stun: { active: false, endTime: 0 },
                            slow: { active: false, endTime: 0, factor: 1 }
                        },
                        applyEffect: function(effectConfig) {
                            try {
                                if (!effectConfig || !effectConfig.type) return;
                                const now = Date.now();
                                if (effectConfig.type === 'STUN') {
                                    this.effects.stun.active = true;
                                    this.effects.stun.endTime = now + Math.max(0, Number(effectConfig.duration || 800));
                                } else if (effectConfig.type === 'SLOW') {
                                    this.effects.slow.active = true;
                                    this.effects.slow.endTime = now + Math.max(0, Number(effectConfig.duration || 700));
                                    this.effects.slow.factor = Math.max(0.15, Math.min(1, Number(effectConfig.factor || 0.5)));
                                }
                            } catch(e) {}
                        },
                        takeDamage: function(amount) {
                            try {
                                const dmg = Math.max(0, Number(amount || 0));
                                this.hp = Math.max(1, this.hp - dmg);
                                return dmg;
                            } catch(e) {
                                return 0;
                            }
                        },
                        update: function() {},
                        draw: function() {}
                    };
                };
                const __ensureAssassinTarget = (player, skillName) => {
                    try {
                        if (!player || player.systemId !== 'assassin') return;
                        const __qRange = (typeof ASSASSIN_SKILL_RANGE_Q === 'number') ? ASSASSIN_SKILL_RANGE_Q : 520;
                        const __eRange = (typeof ASSASSIN_SKILL_RANGE_E === 'number') ? ASSASSIN_SKILL_RANGE_E : 650;
                        const __rRange = (typeof ASSASSIN_SKILL_RANGE_R === 'number') ? ASSASSIN_SKILL_RANGE_R : 900;
                        const rangeMap = { clone: __qRange, stealth: __eRange, vampirism: __rRange };
                        const wantedRange = Number(rangeMap[skillName] || __qRange);
                        const desiredDist = Math.max(80, Math.min(220, Math.round(wantedRange * 0.35)));

                        if (Game.mode === 'PVP_DUEL_AIM') {
                            const plist = Array.isArray(Game.players) ? Game.players : [];
                            for (let i = 0; i < plist.length; i++) {
                                const p = plist[i];
                                if (!p || p === player || (typeof p.hp === 'number' && p.hp <= 0)) continue;
                                p.isStealth = false;
                                p.x = player.x + desiredDist;
                                p.y = player.y;
                                return;
                            }
                            return;
                        }

                        if (!Array.isArray(Game.enemies)) Game.enemies = [];
                        for (let i = 0; i < Game.enemies.length; i++) {
                            const e = Game.enemies[i];
                            if (!e || e.markedForDeletion || (typeof e.hp === 'number' && e.hp <= 0)) continue;
                            const d = Math.hypot((e.x || 0) - player.x, (e.y || 0) - player.y);
                            if (d <= wantedRange * 0.95) return;
                        }
                        const dummy = __createQaDummyEnemy(player.x + desiredDist, player.y);
                        Game.enemies.push(dummy);
                    } catch(e) {}
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
                    qaGetPlayerSkillState: (pid) => {
                        try {
                            const p = __resolveQaPlayer(pid);
                            if (!p) return null;
                            const toSkillState = (src) => ({
                                lastUsed: Number((src && src.lastUsed) || 0),
                                active: !!(src && src.active),
                                endTime: Number((src && src.endTime) || 0)
                            });
                            return {
                                pid: Number(p.pid || 1),
                                systemId: String(p.systemId || 'default'),
                                x: Number(p.x || 0),
                                y: Number(p.y || 0),
                                angle: Number(p.angle || 0),
                                hp: Number(p.hp || 0),
                                maxHp: Number(p.maxHp || 0),
                                skills: {
                                    clone: toSkillState(p.skills && p.skills.clone),
                                    stealth: toSkillState(p.skills && p.skills.stealth),
                                    vampirism: toSkillState(p.skills && p.skills.vampirism)
                                },
                                stealthActive: !!p.isStealth,
                                dashActive: !!(p.dash && p.dash.active),
                                ramActive: !!(p.ram && p.ram.active),
                                juggerShieldActive: !!(p.buffs && p.buffs.juggerShield && p.buffs.juggerShield.active),
                                siegeActive: !!(p.buffs && p.buffs.siege && p.buffs.siege.active),
                                mageBlizzardActive: !!(p.mage && p.mage.blizzard && p.mage.blizzard.active),
                                turretCount: (Array.isArray(Game && Game.turrets)) ? Game.turrets.length : 0
                            };
                        } catch(e) {
                            return null;
                        }
                    },
                    qaSetPlayerHp: (hp, opts) => {
                        const options = (opts && typeof opts === 'object') ? opts : {};
                        const pid = (typeof options.pid !== 'undefined') ? options.pid : 1;
                        try {
                            const p = __resolveQaPlayer(pid);
                            if (!p) return false;
                            const maxHp = Math.max(0, Number(p.maxHp || 0));
                            const nextHp = Math.max(0, Math.min(maxHp, Number(hp || 0)));
                            p.hp = nextHp;
                            try {
                                const prevPid = Game.__uiPid;
                                Game.__uiPid = Number(p.pid || pid || 1);
                                if (Game.ui && typeof Game.ui.updateHealth === 'function') {
                                    Game.ui.updateHealth(p.hp, p.maxHp);
                                }
                                Game.__uiPid = prevPid;
                            } catch(e) {}
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    qaApplyPlayerDamage: (amount, opts) => {
                        const options = (opts && typeof opts === 'object') ? opts : {};
                        const pid = (typeof options.pid !== 'undefined') ? options.pid : 1;
                        try {
                            const p = __resolveQaPlayer(pid);
                            if (!p || typeof p.takeDamage !== 'function') return null;
                            const beforeHp = Number(p.hp || 0);
                            const raw = Math.max(0, Number(amount || 0));
                            const src = (options.source && typeof options.source === 'object') ? Object.assign({}, options.source) : {};
                            const sourceType = String(options.type || src.type || '').trim();
                            if (sourceType) src.type = sourceType;
                            if (!src.enemy && !src.attacker) {
                                src.enemy = {
                                    typeKey: 'QA_ATTACKER',
                                    hp: 999999,
                                    maxHp: 999999,
                                    x: Number(p.x || 0) + 32,
                                    y: Number(p.y || 0),
                                    pid: (Number(p.pid || 1) === 1) ? 2 : 1
                                };
                            }
                            p.takeDamage(raw, src);
                            const afterHp = Number(p.hp || 0);
                            return {
                                beforeHp: beforeHp,
                                afterHp: afterHp,
                                delta: Math.max(0, beforeHp - afterHp),
                                sourceType: src.type || null
                            };
                        } catch(e) {
                            return null;
                        }
                    },
                    qaApplyDefaultVampLifesteal: (damageDealt, opts) => {
                        const options = (opts && typeof opts === 'object') ? opts : {};
                        const pid = (typeof options.pid !== 'undefined') ? options.pid : 1;
                        try {
                            const p = __resolveQaPlayer(pid);
                            if (!p || typeof p.applyDefaultVampLifesteal !== 'function') return null;
                            const beforeHp = Number(p.hp || 0);
                            const healed = Number(p.applyDefaultVampLifesteal(Math.max(0, Number(damageDealt || 0))) || 0);
                            const afterHp = Number(p.hp || 0);
                            return {
                                beforeHp: beforeHp,
                                afterHp: afterHp,
                                healed: healed,
                                hpDelta: Math.max(0, afterHp - beforeHp)
                            };
                        } catch(e) {
                            return null;
                        }
                    },
                    qaSetSkillLastUsed: (skillKey, value, opts) => {
                        const options = (opts && typeof opts === 'object') ? opts : {};
                        const pid = (typeof options.pid !== 'undefined') ? options.pid : 1;
                        const key = __normalizeSkillKey(skillKey);
                        try {
                            const player = __resolveQaPlayer(pid);
                            if (!player || !player.skills || !player.skills[key]) return false;
                            const numeric = Number((typeof value !== 'undefined') ? value : 0);
                            player.skills[key].lastUsed = Number.isFinite(numeric) ? numeric : 0;
                            return true;
                        } catch(e) {
                            return false;
                        }
                    },
                    qaGetPvpSkillLockUntil: (pid) => {
                        try {
                            const player = __resolveQaPlayer(pid);
                            if (!player) return 0;
                            return Number(player._pvpSkillLockUntil || 0);
                        } catch(e) {
                            return 0;
                        }
                    },
                    qaUseSkill: (skillKey, opts) => {
                        const options = (opts && typeof opts === 'object') ? opts : {};
                        const pid = (typeof options.pid !== 'undefined') ? options.pid : 1;
                        const key = __normalizeSkillKey(skillKey);
                        try {
                            const player = __resolveQaPlayer(pid);
                            if (!player || typeof player.useSkill !== 'function') {
                                return { ok: false, reason: 'player-not-found', key: key };
                            }
                            if (!player.skills || !player.skills[key]) {
                                return { ok: false, reason: 'invalid-skill', key: key };
                            }

                            if (player.systemId === 'assassin') {
                                __ensureAssassinTarget(player, key);
                            }

                            const before = Number((player.skills[key] && player.skills[key].lastUsed) || 0);
                            const bypassCooldown = (options.noCooldown !== false);
                            const prevNoSkillCd = !!(Game && Game.adminNoSkillCooldown);

                            try {
                                if (Game && bypassCooldown) Game.adminNoSkillCooldown = true;
                                player.useSkill(key);
                            } finally {
                                if (Game && bypassCooldown) Game.adminNoSkillCooldown = prevNoSkillCd;
                            }

                            const after = Number((player.skills[key] && player.skills[key].lastUsed) || 0);
                            return {
                                ok: after > before,
                                key: key,
                                beforeLastUsed: before,
                                afterLastUsed: after,
                                state: (window.__qa && typeof window.__qa.qaGetPlayerSkillState === 'function')
                                    ? window.__qa.qaGetPlayerSkillState(pid)
                                    : null
                            };
                        } catch(e) {
                            return {
                                ok: false,
                                key: key,
                                reason: 'exception',
                                message: String((e && e.message) ? e.message : e)
                            };
                        }
                    },
                    qaSetMouseWorld: (x, y) => {
                        try {
                            if (!Input || !Input.mouse) return false;
                            const wx = Number(x || 0);
                            const wy = Number(y || 0);
                            const cx = (typeof Camera !== 'undefined' && Camera) ? Number(Camera.x || 0) : 0;
                            const cy = (typeof Camera !== 'undefined' && Camera) ? Number(Camera.y || 0) : 0;
                            Input.mouse.x = wx - cx;
                            Input.mouse.y = wy - cy;
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
