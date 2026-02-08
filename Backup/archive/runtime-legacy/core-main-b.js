const Game = {
            selectedSystemId: 'default',
            mode: 'PVE',
            player: null, coins: [], gold: 0, upgrades: { maxHpLv: 0, dmgLv: 0, fireRateLv: 0, speedLv: 0, magnetLv: 0, armorLv: 0 }, enemies: [], clones: [], turrets: [], projectiles: [], particles: [], pickups: [], bossMines: [], texts: [], obstacles: [], score: 0, shake: 0, active: false,
            adminFreeze: false,
            adminNoSkillCooldown: false,
            unlocks: { assassin: false },
            pvp: null,
            pvpLoadouts: null,
            endlessMode: false,
            ui: {
                scoreVal: document.getElementById('scoreVal'), goldVal: document.getElementById('goldVal'), waveVal: document.getElementById('waveVal'), enemyCount: document.getElementById('enemyCount'), hpText: document.getElementById('hpText'), hpText2: document.getElementById('hpText2'), buffs: document.getElementById('buffsContainer'), healthBar: document.getElementById('healthBar'), healthBar2: document.getElementById('healthBar2'), weaponBar: document.getElementById('weaponBar'), weaponBar2: document.getElementById('weaponBar2'), ultiBar: document.getElementById('ultiBar'),
                updateScore(val) { this.scoreVal.innerText = val; }, updateGold(val) { if(this.goldVal) this.goldVal.innerText = val; }, updateWave(val) { this.waveVal.innerText = val; }, updateEnemies(val) { this.enemyCount.innerText = val; },
                updateHealth(curr, max) {
                    if (isNaN(curr)) curr = 0;
                    const pct = (max > 0) ? (curr / max) * 100 : 0;
                    const pid = (typeof Game !== 'undefined' && Game.__uiPid === 2) ? 2 : 1;
                    const hb = (pid === 2 && this.healthBar2) ? this.healthBar2 : this.healthBar;
                    const ht = (pid === 2 && this.hpText2) ? this.hpText2 : this.hpText;
                    if (!hb || !ht) return;
                    hb.style.width = `${Math.max(0, pct)}%`;
                    ht.innerText = `${Math.ceil(curr)}/${max}`;
                    if (pct < 30) hb.style.background = 'linear-gradient(90deg, #d32f2f, #f44336)';
                    else hb.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
                },
                updateUltiBar(val) { this.ultiBar.style.width = `${val}%`; },
                updateSkillSlots(systemId, pid=1) {
                    try {
                        const prefix = (pid === 2) ? 'skill2-' : 'skill-';
                        const sysId = systemId || 'default';
                        const defs = {
                            clone: getSystemSkillDef(sysId, 'clone'),
                            stealth: getSystemSkillDef(sysId, 'stealth'),
                            vampirism: getSystemSkillDef(sysId, 'vampirism')
                        };
                        Object.keys(defs).forEach(k => {
                            const def = defs[k] || {};
                            const slot = document.getElementById(prefix + k);
                            if (!slot) return;
                            if (def.color) {
                                slot.style.borderColor = def.color;
                                slot.style.color = def.color;
                            }
                            const icon = slot.querySelector('.icon');
                            if (icon) icon.innerHTML = def.labelHTML || def.label || '';
                        });
                    } catch(e) {}
                },
                setShieldOverlay(on) { const pid = (typeof Game !== 'undefined' && Game.__uiPid === 2) ? 2 : 1; const el = document.getElementById(pid === 2 ? 'shieldOverlay2' : 'shieldOverlay'); if (el) el.style.display = on ? 'block' : 'none'; },
                addBuff(name, color) { const div = document.createElement('div'); div.className = 'buff-icon'; div.id = `buff-${name}`; div.style.borderColor = color; div.style.color = color; div.innerText = name; this.buffs.appendChild(div); },
                removeBuff(name) { const el = document.getElementById(`buff-${name}`); if (el) el.remove(); },
                updateWeaponInventory(inventory, currentIndex) {
                    const pid = (typeof Game !== 'undefined' && Game.__uiPid === 2) ? 2 : 1;
                    const bar = (pid === 2 && this.weaponBar2) ? this.weaponBar2 : this.weaponBar;
                    if (!bar) return;
                    bar.innerHTML = '';
                    for (let i = 0; i < inventory.length; i++) {
                        const weapon = inventory[i];
                        const slot = document.createElement('div');
                        slot.className = 'slot';
                        if (i === currentIndex) slot.classList.add('selected');
slot.innerHTML = `<div class="icon">${weapon.icon}</div><div class="weapon-level">${weapon.level}</div>`;
                        slot.style.borderColor = weapon.color;
                        slot.style.color = weapon.color;
                        bar.appendChild(slot);
                    }
                },
                updateTankSystemUI(systemId) {
                    const sys = getTankSystem(systemId);
                    const pid = (typeof Game !== 'undefined' && Game.__uiPid === 2) ? 2 : 1;
                    const base = (pid === 2) ? 'skill2-' : 'skill-';
                    const map = [
                        { key: 'clone',     slotId: base + 'clone' },
                        { key: 'stealth',   slotId: base + 'stealth' },
                        { key: 'vampirism', slotId: base + 'vampirism' }
                    ];
                    for (const it of map) {
                        const def = getSystemSkillDef(sys.id, it.key);
                        const slot = document.getElementById(it.slotId);
                        if (!slot || !def) continue;
                        slot.style.borderColor = def.color || '#fff';
                        slot.style.color = def.color || '#fff';
                        const icon = slot.querySelector('.icon');
                        if (icon) icon.innerHTML = def.labelHTML || it.key;
                        const keyNum = slot.querySelector('.key-number');
                        if (keyNum) {
                            // Phase 2: show correct keys by mode (Hard: Q/E/R, Easy & 2P: J/K/L) + P2 skill 1/2/3
                            const __m = (Input && Input.getMode) ? Input.getMode() : (Game.startMode || {difficulty:'hard', players:1});
                            const __hard1p = (__m && __m.players === 1 && __m.difficulty === 'hard');
                            if (pid === 2) {
                                const km2 = { clone:'1', stealth:'2', vampirism:'3' };
                                keyNum.textContent = km2[it.key] || keyNum.textContent;
                            } else {
                                const km = __hard1p ? { clone:'Q', stealth:'E', vampirism:'R' } : { clone:'J', stealth:'K', vampirism:'L' };
                                keyNum.textContent = km[it.key] || (def.key || keyNum.textContent);
                            }
                        }
                    }
                    // Optional: show system name in world-info
                    try {
                        const wi = document.getElementById('world-info');
                        if (wi && pid !== 2) {
                            let sysName = sys.name;
                            try {
                                if (window.I18N && typeof window.I18N.systemText === 'function') {
                                    const sTxt = window.I18N.systemText(sys.id || systemId || 'default');
                                    if (sTxt && sTxt.name) sysName = sTxt.name;
                                }
                            } catch(e){}
                            wi.textContent = `Map Size: 3x | System: ${sysName} | Bug Fixed | Cleaned`;
                        }
                    } catch(e) {}
                },
                updateSkillCooldown(skillName, lastUsed, cooldown) {
                    const pid = (typeof Game !== 'undefined' && Game.__uiPid === 2) ? 2 : 1;
                    const overlay = document.getElementById(pid === 2 ? `cd2-${skillName}` : `cd-${skillName}`);
                    const txt = document.getElementById(pid === 2 ? `cdt2-${skillName}` : `cdt-${skillName}`);
                    const remaining = Math.max(0, (lastUsed + cooldown) - Date.now());
                    const percent = (cooldown > 0) ? (remaining / cooldown) * 100 : 0;

                    if (overlay) overlay.style.height = `${percent}%`;

                    const slotEl = document.getElementById(pid === 2 ? `skill2-${skillName}` : `skill-${skillName}`);
                    if (slotEl) {
                        if (remaining <= 0) { slotEl.classList.add('ready'); slotEl.classList.remove('cooling'); }
                        else { slotEl.classList.remove('ready'); slotEl.classList.add('cooling'); }
                    }

                    if (txt) {
                        if (remaining <= 0) {
                            txt.textContent = '';
                            txt.style.opacity = 0;
                        } else {
                            txt.textContent = (remaining < 1000)
                                ? `${Math.ceil(remaining)}ms`
                                : `${(remaining / 1000).toFixed(1)}s`;
                            txt.style.opacity = 1;
                        }
                    }
                }
            },
            initPvpRounds() {
                const now = Date.now();
                const totalRounds = 5;
                const roundsToWin = 3;
                this.pvp = {
                    totalRounds,
                    roundsToWin,
                    round: 1,
                    wins: [0, 0],
                    state: 'countdown',
                    countdownMs: 3000,
                    countdownEnd: now + 3000,
                    roundEndAt: 0,
                    freeze: true,
                    message: 'ROUND 1',
                    messageUntil: now + 900,
                    matchWinner: 0,
                    zone: null,
                    zoneLast: now,
                    zoneDamagePerSec: 0.10, // 10% max HP per second outside zone
                    zoneShrinkMs: 12000,
                    zonePauseMs: 12000,
                    zoneSteps: 5,
                    __matchWinSound: false
                };
                this.pvpResetRound();
            },
            pvpResetRound() {
                // Clear dynamic entities (keep obstacles/map)
                this.enemies = [];
                this.clones = [];
                this.turrets = [];
                this.projectiles = [];
                this.particles = [];
                this.pickups = [];
                this.coins = [];
                this.bossMines = [];
                this.texts = [];

                const cx = WORLD_WIDTH / 2;
                const cy = WORLD_HEIGHT / 2;
                const offset = Math.max(360, Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.35);

                const resetPlayer = (p, x, y) => {
                    if (!p) return;
                    p.x = x; p.y = y;
                    const r = p.radius || 22;
                    p.x = Math.max(r, Math.min(WORLD_WIDTH - r, p.x));
                    p.y = Math.max(r, Math.min(WORLD_HEIGHT - r, p.y));

                    p.hp = p.maxHp;
                    p.__noCollide = false;
                    p.isStealth = false;
                    p.lastShot = 0;
                    p.__pvpTarget = null;
                    p.__easyTarget = null;
                    p._pvpLockUntil = 0;
                    p._pvpSkillLockUntil = 0;
                    p._pvpHardCc = { lastAt: 0 };
                    p._motionVx = 0;
                    p._motionVy = 0;
                    p.__motionX = p.x;
                    p.__motionY = p.y;
                    p.__motionTick = Date.now();
                    p.ultiCharge = 0;
                    p.vampHeal = { windowStart: 0, healed: 0 };

                    if (p.skills) {
                        for (const k in p.skills) {
                            if (!p.skills[k]) continue;
                            p.skills[k].active = false;
                            p.skills[k].lastUsed = 0;
                            if (typeof p.skills[k].endTime === 'number') p.skills[k].endTime = 0;
                        }
                    }

                    if (p.buffs) {
                        for (const k in p.buffs) {
                            if (!p.buffs[k]) continue;
                            if (typeof p.buffs[k].active !== 'undefined') p.buffs[k].active = false;
                            if (typeof p.buffs[k].endTime !== 'undefined') p.buffs[k].endTime = 0;
                        }
                    }
                    if (p.effects) {
                        if (p.effects.stun) { p.effects.stun.active = false; p.effects.stun.endTime = 0; }
                        if (p.effects.slow) { p.effects.slow.active = false; p.effects.slow.endTime = 0; p.effects.slow.factor = 1; }
                    }
                    if (p.dash) p.dash.active = false;
                    if (p.ram) { p.ram.active = false; if (p.ram.hitSet && p.ram.hitSet.clear) p.ram.hitSet.clear(); }
                    if (p.mage && p.mage.blizzard) { p.mage.blizzard.active = false; p.mage.blizzard.locked = false; p.mage.blizzard.endTime = 0; }
                    if (typeof p.baseSpeed === 'number') p.speed = p.baseSpeed;
                    if (typeof p.baseRadius === 'number') p.radius = p.baseRadius;
                    if (typeof pvpApplyLoadoutToPlayer === 'function') pvpApplyLoadoutToPlayer(p, p.pid || 1);
                };

                if (this.pvp) {
                    // Reset shrinking zone
                    const cx = WORLD_WIDTH / 2;
                    const cy = WORLD_HEIGHT / 2;
                    const startR = Math.hypot(WORLD_WIDTH / 2, WORLD_HEIGHT / 2) * 0.98;
                    const endR = Math.max(220, Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.12);
                    const steps = Math.max(1, this.pvp.zoneSteps || 8);
                    const stepSize = (startR - endR) / steps;
                    this.pvp.zone = {
                        cx, cy,
                        startR,
                        endR,
                        r: startR,
                        active: true,
                        stepSize: stepSize,
                        stepIndex: 0,
                        phase: 'idle',
                        phaseStart: 0,
                        phaseEnd: 0,
                        fromR: startR,
                        toR: startR
                    };
                    this.pvp.zoneLast = Date.now();
                    this.pvp.__matchWinSound = false;
                }

                const p1 = (this.players && this.players[0]) ? this.players[0] : null;
                const p2 = (this.players && this.players[1]) ? this.players[1] : null;
                resetPlayer(p1, cx - offset / 2, cy);
                resetPlayer(p2, cx + offset / 2, cy);
                if (p1) p1.angle = 0;
                if (p2) p2.angle = Math.PI;

                // Refresh HUD (HP/ulti/buffs)
                try { if (this.ui && this.ui.buffs) this.ui.buffs.innerHTML = ''; } catch(e){}
                const __pidPrev = this.__uiPid;
                try {
                    if (p1) { this.__uiPid = 1; this.ui.updateHealth(p1.hp, p1.maxHp); this.ui.updateUltiBar(0); }
                    if (p2) { this.__uiPid = 2; this.ui.updateHealth(p2.hp, p2.maxHp); }
                } catch(e) {}
                finally { this.__uiPid = __pidPrev; }
            },
            pvpEndRound(winner, msgOverride) {
                const p = this.pvp;
                if (!p) return;
                const now = Date.now();

                if (winner > 0) {
                    try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.roundWin) MAX.Audio.roundWin(); } catch(e){}
                }

                if (winner === 1) p.wins[0]++;
                if (winner === 2) p.wins[1]++;

                p.round++;
                p.message = msgOverride || (winner > 0 ? `P${winner} THẮNG ROUND` : 'ROUND HÒA');
                p.messageUntil = now + 1200;
                p.roundEndAt = now + 1200;
                p.state = 'roundEnd';
                p.freeze = true;

                // Stop leftover entities from affecting the end of round
                this.clones = [];
                this.turrets = [];
                this.projectiles = [];
                this.particles = [];
                this.pickups = [];
                this.coins = [];
                this.bossMines = [];
                this.texts = [];

                if (p.wins[0] >= p.roundsToWin || p.wins[1] >= p.roundsToWin) {
                    p.matchWinner = (p.wins[0] >= p.roundsToWin) ? 1 : 2;
                } else if (p.round > p.totalRounds) {
                    if (p.wins[0] > p.wins[1]) p.matchWinner = 1;
                    else if (p.wins[1] > p.wins[0]) p.matchWinner = 2;
                    else p.matchWinner = -1; // draw after max rounds
                } else {
                    p.matchWinner = 0;
                }
            },
            pvpTick() {
                if (!this.pvp) this.initPvpRounds();
                const p = this.pvp;
                const now = Date.now();
                if (p.state === 'countdown') {
                    p.freeze = true;
                    if (!p.countdownEnd) p.countdownEnd = now + p.countdownMs;
                    if (now >= p.countdownEnd) {
                        p.state = 'active';
                        p.freeze = false;
                        p.message = 'FIGHT!';
                        p.messageUntil = now + 700;
                        try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.roundStart) MAX.Audio.roundStart(); } catch(e){}
                        if (p.zone) {
                            p.zone.active = true;
                            p.zone.r = p.zone.startR;
                            p.zone.stepIndex = 0;
                            p.zone.phase = 'idle';
                            p.zone.phaseStart = now;
                            p.zone.phaseEnd = now + (p.zonePauseMs || 5000);
                            p.zone.fromR = p.zone.startR;
                            p.zone.toR = p.zone.startR;
                        }
                    }
                    if (p.zone) {
                        p.zone.r = p.zone.startR;
                        p.zoneLast = now;
                    }
                } else if (p.state === 'roundEnd') {
                    p.freeze = true;
                    if (now >= (p.roundEndAt || now)) {
                        if (p.matchWinner !== 0) {
                            p.state = 'matchEnd';
                            p.freeze = true;
                            if (p.matchWinner === -1) p.message = 'HÒA';
                            else p.message = (p.matchWinner === 1) ? 'P1 THẮNG TRẬN' : 'P2 THẮNG TRẬN';
                            p.messageUntil = now + 600000;
                            if (!p.__matchWinSound) {
                                p.__matchWinSound = true;
                                try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.matchWin) MAX.Audio.matchWin(); } catch(e){}
                            }
                        } else {
                            this.pvpResetRound();
                            p.state = 'countdown';
                            p.countdownEnd = now + p.countdownMs;
                            p.message = `ROUND ${p.round}`;
                            p.messageUntil = now + 900;
                        }
                    }
                } else if (p.state === 'matchEnd') {
                    p.freeze = true;
                } else {
                    p.freeze = false;
                }

                // Shrinking zone + damage (active round only)
                if (p.state === 'active' && p.zone) {
                    if (p.zone.active) {
                        if (p.zone.phase === 'idle') {
                            if (now >= (p.zone.phaseEnd || now)) {
                                p.zone.phase = 'shrinking';
                                p.zone.phaseStart = now;
                                p.zone.phaseEnd = now + (p.zoneShrinkMs || 5000);
                                p.zone.fromR = p.zone.r;
                                p.zone.toR = Math.max(p.zone.endR, p.zone.fromR - (p.zone.stepSize || 0));
                            }
                        } else if (p.zone.phase === 'shrinking') {
                            const dur = (p.zoneShrinkMs || 5000);
                            const t = Math.max(0, Math.min(1, (now - (p.zone.phaseStart || now)) / dur));
                            p.zone.r = p.zone.fromR + (p.zone.toR - p.zone.fromR) * t;
                            if (now >= (p.zone.phaseEnd || now)) {
                                p.zone.r = p.zone.toR;
                                p.zone.stepIndex = (p.zone.stepIndex || 0) + 1;
                                if (p.zone.stepIndex >= (p.zoneSteps || 5)) {
                                    // Final size reached: keep zone at minimum, no further shrinking
                                    p.zone.phase = 'done';
                                    p.zone.phaseStart = 0;
                                    p.zone.phaseEnd = 0;
                                } else {
                                    p.zone.phase = 'idle';
                                    p.zone.phaseStart = now;
                                    p.zone.phaseEnd = now + (p.zonePauseMs || 5000);
                                }
                            }
                        }
                    }

                    const dt = Math.max(0, (now - (p.zoneLast || now)) / 1000);
                    p.zoneLast = now;

                    if (dt > 0 && p.zone.active) {
                        const __plist = (this.players && this.players.length) ? this.players : (this.player ? [this.player] : []);
                        for (let i = 0; i < __plist.length; i++) {
                            const pl = __plist[i];
                            if (!pl || typeof pl.hp !== 'number' || pl.hp <= 0) continue;
                            if (pl.invulnerable) continue;
                            const pr = (pl.radius || 0);
                            const dx = pl.x - p.zone.cx;
                            const dy = pl.y - p.zone.cy;
                            const dist = Math.hypot(dx, dy);
                            if (dist > (p.zone.r - pr)) {
                                const baseMax = (pl.maxHp && pl.maxHp > 0) ? pl.maxHp : pl.hp;
                                const dmg = Math.max(1, Math.round(baseMax * (p.zoneDamagePerSec || 0.10) * dt));
                                pl.hp = Math.max(0, pl.hp - dmg);
                                const __pidPrev = Game.__uiPid;
                                try { Game.__uiPid = (pl.pid || 1); Game.ui.updateHealth(pl.hp, pl.maxHp); } catch(e){}
                                finally { Game.__uiPid = __pidPrev; }
                            }
                        }
                    }
                }
            },
            pvpCheckRoundEnd() {
                const p = this.pvp;
                if (!p || p.state !== 'active') return;
                const p1 = (this.players && this.players[0]) ? this.players[0] : null;
                const p2 = (this.players && this.players[1]) ? this.players[1] : null;
                if (!p1 || !p2) return;
                const now = Date.now();

                if (p1.hp <= 0 || p2.hp <= 0) {
                    let winner = 0;
                    if (p1.hp <= 0 && p2.hp > 0) winner = 2;
                    else if (p2.hp <= 0 && p1.hp > 0) winner = 1;
                    else winner = 0;
                    this.pvpEndRound(winner);
                    return;
                }
            },
            init() {
                WORLD_WIDTH = canvas.width * 3; WORLD_HEIGHT = canvas.height * 3;

                // Phase 4: multi-player foundation (2P local). Keep P1 as Game.player for compatibility.
                const isPvp = (this.mode === 'PVP_DUEL_AIM');
                let sm = null;
                try { sm = (this.startMode && typeof this.startMode === 'object') ? this.startMode : null; } catch(e){}
                const playersCount = isPvp ? 2 : Math.max(1, Math.min(2, parseInt((sm && sm.players), 10) || 1));
                const p1Sys = (this.selectedSystemId || (sm && sm.p1System) || 'default');
                const p2Sys = (sm && sm.p2System) ? sm.p2System : 'default';

                this.player = new Player(p1Sys);

                // Prefer latest selected system from localStorage if present (prevents UI mismatch)
                try {
                    const _lsSys = localStorage.getItem("tankSystem");
                    if (_lsSys) this.selectedSystemId = _lsSys;
                } catch(e) {}

                // Safety: if selected system differs, honor selection (avoid UI mismatch)
                if (this.selectedSystemId && this.selectedSystemId !== this.player.systemId) {
                    const __p = this.player;
                    const __n = new Player(this.selectedSystemId);
                    __n.pid = __p.pid || 1;
                    __n.x = __p.x; __n.y = __p.y;
                    this.player = __n;
                }

                // Safety: if selected system differs, honor selection (avoid UI mismatch)
                if (this.selectedSystemId && this.selectedSystemId !== this.player.systemId) {
                    const __p = this.player;
                    const __n = new Player(this.selectedSystemId);
                    __n.pid = __p.pid || 1;
                    __n.x = __p.x; __n.y = __p.y;
                    this.player = __n;
                }
                this.player.pid = 1;
                this.player2 = null;
                this.players = [this.player];

                if (playersCount === 2) {
                    this.player2 = new Player(p2Sys);
                    this.player2.pid = 2;
                    // spawn slightly offset so they don't overlap
                    try {
                        this.player2.x = this.player.x + 120;
                        this.player2.y = this.player.y;
                        const r = this.player2.radius || 22;
                        this.player2.x = Math.max(r, Math.min(WORLD_WIDTH - r, this.player2.x));
                        this.player2.y = Math.max(r, Math.min(WORLD_HEIGHT - r, this.player2.y));
                    } catch(e){}
                    this.players.push(this.player2);
                }

                // Ensure 2P HUD visibility is correct immediately after init.
                try {
                    const __twoPInit = (playersCount === 2);
                    const __hud2Init = document.getElementById('hudP2');
                    const __rowInit = document.getElementById('playersHudRow');
                    if (__hud2Init) {
                        __hud2Init.classList.toggle('hidden', !__twoPInit);
                        __hud2Init.style.display = __twoPInit ? 'flex' : 'none';
                    }
                    if (__rowInit) __rowInit.classList.toggle('twoP', __twoPInit);
                } catch(e) {}

                if (isPvp) {
                    try {
                        if (this.player) pvpApplyLoadoutToPlayer(this.player, 1);
                        if (this.player2) pvpApplyLoadoutToPlayer(this.player2, 2);
                    } catch(e) {}
                }

                // Sync skill labels/colors with selected system
                try {
                    if (this.ui && this.ui.updateSkillSlots) {
                        this.ui.updateSkillSlots(this.player.systemId, 1);
                        if (this.player2) this.ui.updateSkillSlots(this.player2.systemId, 2);
                    }
                } catch(e) {}

                // PvP: double base HP for all systems (survivability buff)
                if (isPvp) {
                    const __pls = (this.players && this.players.length) ? this.players : [];
                    for (let __i = 0; __i < __pls.length; __i++) {
                        const __p = __pls[__i];
                        if (!__p || typeof __p.maxHp !== 'number') continue;
                        __p.maxHp = Math.max(1, Math.round(__p.maxHp * 2));
                        __p.hp = __p.maxHp;
                        if (typeof __p.__baseMaxHp === 'number') __p.__baseMaxHp = Math.max(1, Math.round(__p.__baseMaxHp * 2));
                        if (typeof __p.baseMaxHp === 'number') __p.baseMaxHp = Math.max(1, Math.round(__p.baseMaxHp * 2));
                    }
                }

                this.enemies = []; this.clones = []; this.turrets = []; this.projectiles = []; this.particles = []; this.pickups = []; this.texts = []; this.obstacles = []; this.score = 0; this.coins = []; this.gold = 0; this.upgrades = { maxHpLv: 0, dmgLv: 0, fireRateLv: 0, speedLv: 0, magnetLv: 0, armorLv: 0 }; this.active = true; this.paused = false;
                this.endlessMode = false;
                this.adminFreeze = false;
                this.adminNoSkillCooldown = false;
                this.__pvpCleaned = false;
                this.generateObstacles();
                if (isPvp) {
                    try { WaveManager.active = false; WaveManager.wave = 1; } catch(e){}
                    setElDisplay('bossHealthContainer', 'none');
                    this.initPvpRounds();
                } else {
                    WaveManager.wave = 1; WaveManager.startWave();
                }

                // Phase 10.2: init HUD for each player (HP/skills/weapons) with clear pid
                this.ui.updateScore(0); this.ui.updateGold(0); this.ui.updateUltiBar(0);
                const __pidPrev0 = Game.__uiPid;
                try {
                    Game.__uiPid = 1;
                    this.ui.updateHealth(this.player.hp, this.player.maxHp);
                    this.ui.updateWeaponInventory(this.player.inventory, this.player.currentWeaponIndex);
                    this.ui.updateTankSystemUI(this.player.systemId || p1Sys);

                    if (this.player2) {
                        Game.__uiPid = 2;
                        this.ui.updateHealth(this.player2.hp, this.player2.maxHp);
                        this.ui.updateWeaponInventory(this.player2.inventory, this.player2.currentWeaponIndex);
                        this.ui.updateTankSystemUI(this.player2.systemId || p2Sys);
                    }
                } finally { Game.__uiPid = __pidPrev0; }
this.ui.buffs.innerHTML = '';

                Admin.init();
                Input.init(); requestAnimationFrame(loop);
            },
            generateObstacles() {
                this.obstacles = [];
                for (let i = 0; i < 30; i++) {
                    const w = 100 + Math.random() * 150; const h = 100 + Math.random() * 150; const x = Math.random() * (WORLD_WIDTH - w); const y = Math.random() * (WORLD_HEIGHT - h); const distToCenter = Math.hypot(x - WORLD_WIDTH/2, y - WORLD_HEIGHT/2);
                    if (distToCenter < 400) continue;
                    if(Game.player && checkCircleRect({x: Game.player.x, y: Game.player.y, radius: 150}, {x, y, width: w, height: h})) continue;
                    this.obstacles.push(new Obstacle(x, y, w, h));
                }
            },
            gameOver() {
                this.active = false;
                this.paused = true;

                hideCombatUi();

                // Update end screen values
                try { document.getElementById('finalScore').innerText = this.score; } catch(e){}
                try { document.getElementById('finalWave').innerText = WaveManager.wave; } catch(e){}

                // Update best + sync UI
                try { if (typeof MAX !== 'undefined') MAX.State.updateBest(this.score, WaveManager.wave); } catch(e){}

                // Show screen
                showEl('gameOverScreen');
            },
            victory() {
                this.active = false;
                this.paused = true;

                hideCombatUi();

                const wave = WaveManager.wave;
                try { if (wave >= ASSASSIN_UNLOCK_WAVE) unlockAssassin('wave20'); } catch(e){}
                try { document.getElementById('victoryWave').innerText = wave; } catch(e){}
                try { document.getElementById('victoryScore').innerText = this.score; } catch(e){}

                // Update best + show best on victory screen
                try { if (typeof MAX !== 'undefined') MAX.State.updateBest(this.score, wave); } catch(e){}
                try {
                    const bs = (typeof MAX !== 'undefined' && MAX.State && MAX.State.save) ? MAX.State.save.bestScore : 0;
                    const bw = (typeof MAX !== 'undefined' && MAX.State && MAX.State.save) ? MAX.State.save.bestWave : 0;
                    const elBS = document.getElementById('victoryBestScore');
                    const elBW = document.getElementById('victoryBestWave');
                    if (elBS) elBS.innerText = bs;
                    if (elBW) elBW.innerText = bw;
                } catch(e){}

                showEl('victoryScreen');
            }
        };

        // === Gameplay Utilities (collision, FX helpers, minimap) ===
        function checkCollision(c1, c2) { if(!c1 || !c2 || c1.__noCollide || c2.__noCollide || isNaN(c1.x) || isNaN(c2.x)) return false; const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y); return dist < c1.radius + c2.radius; }
        function checkCircleRect(circle, rect) {
            if(isNaN(circle.x) || isNaN(circle.y)) return false; let testX = circle.x; let testY = circle.y;
            if (circle.x < rect.x) testX = rect.x; else if (circle.x > rect.x + rect.width) testX = rect.x + rect.width;
            if (circle.y < rect.y) testY = rect.y; else if (circle.y > rect.y + rect.height) testY = rect.y + rect.height;
            let distX = circle.x - testX; let distY = circle.y - testY; return (distX*distX + distY*distY) <= (circle.radius*circle.radius);
        }
        function isLineBlocked(x1, y1, x2, y2, obstacles) {
            const steps = 10; for(let i=0; i<=steps; i++) { const px = x1 + (x2-x1) * (i/steps); const py = y1 + (y2-y1) * (i/steps); for(let obs of obstacles) { if (px > obs.x && px < obs.x + obs.width && py > obs.y && py < obs.y + obs.height) return true; } } return false;
        }
        function hexToRgb(hex) {
            var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i; hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "255, 255, 255";
        }
        
        function createComplexExplosion(x, y, color) {
            if(isNaN(x) || isNaN(y)) return;
            const mult = 1;

            if (typeof MAX !== 'undefined') MAX.Audio.boom();

            // Shockwave
            Game.particles.push(new Particle(x, y, {type: 'shockwave', color: color, size: 5, maxRadius: 50, life: 0.5, decay: 0.1}));

            // Debris
            const debrisCount = Math.round(6 * mult);
            for(let i=0; i<debrisCount; i++) Game.particles.push(new Particle(x, y, {
                type: 'debris', color: color, size: 4 + Math.random()*4, life: 1.0, decay: 0.03,
                velocity: {x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10}
            }));

            // Smoke
            const smokeCount = Math.round(4 * mult);
            for(let i=0; i<smokeCount; i++) Game.particles.push(new Particle(x, y, {
                type: 'smoke', color: '#555', size: 10, life: 1.5, decay: 0.01,
                velocity: {x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2}
            }));

            // Sparks
            const sparkCount = Math.round(10 * mult);
            for(let i=0; i<sparkCount; i++) Game.particles.push(new Particle(x, y, {
                type: 'spark', color: color, size: 2, life: 0.25, decay: 0.08,
                velocity: {x: (Math.random()-0.5)*12, y: (Math.random()-0.5)*12}
            }));
        }
        function createExplosion(x, y, color, count) { // Compatibility wrapper.
            createComplexExplosion(x, y, color);
        }

        function createMuzzleFlash(x, y, color, count) { // Compatibility wrapper.
            createComplexExplosion(x, y, color);
        }
        function createMuzzleFlash(x, y, angle, color) {
            if (typeof MAX !== 'undefined') MAX.Audio.shoot();
            Game.particles.push(new Particle(x + Math.cos(angle)*10, y + Math.sin(angle)*10, {type: 'spark', color: color, size: 3, life: 0.1, decay: 0.5}));
        }
        function createDamageText(x, y, text, color) { if(isNaN(x)) return; Game.texts.push({ x, y, text, color, life: 1.0, dy: -1 }); }
        function chainLightning(startEnemy, baseDamage, count, range) {
            if (count <= 0) return;
            let nearest = null; let minDst = Infinity;
            Game.enemies.forEach(e => { if (e === startEnemy) return; const d = Math.hypot(e.x - startEnemy.x, e.y - startEnemy.y); if (d < range && d < minDst) { nearest = e; minDst = d; } });
            if (nearest) {
                nearest.hp -= baseDamage; createDamageText(nearest.x, nearest.y, Math.floor(baseDamage), '#FFEB3B');
                const steps = 10; const dx = (nearest.x - startEnemy.x) / steps; const dy = (nearest.y - startEnemy.y) / steps;
                for(let i=0; i<steps; i++) Game.particles.push(new Particle(startEnemy.x + dx*i, startEnemy.y + dy*i, {type: 'spark', color: '#FFEB3B', size: 2, life: 0.2}));
                chainLightning(nearest, baseDamage * 0.7, count - 1, range);
            }
        }

        function dropGold(x, y, amount, scatter = true) {
            if (isNaN(x) || isNaN(y)) return;
            const val = Math.max(0, Math.floor(amount || 0));
            if (val <= 0) return;
            const c = new Coin(x, y, val);
            if (scatter) { c.x += (Math.random()-0.5)*14; c.y += (Math.random()-0.5)*14; }
            Game.coins.push(c);
        }

        function dropPickup(x, y) {
            if(isNaN(x)) return;
            if (Math.random() > 0.35) return; // Increase chance to 35%.
            const lootTable = [{id: 'HP_PACK', weight: 20}, {id: 'SHIELD', weight: 10}, {id: 'RAPID_FIRE', weight: 10}, {id: 'AMMO_NORMAL', weight: 15}, {id: 'AMMO_FIRE', weight: 10}, {id: 'AMMO_STUN', weight: 10}, {id: 'AMMO_PIERCE', weight: 10}, {id: 'AMMO_LIGHTNING', weight: 10}, {id: 'AMMO_HOMING', weight: 5}];
            const totalWeight = lootTable.reduce((sum, item) => sum + item.weight, 0);
            let random = Math.random() * totalWeight; let selectedItemKey = 'HP_PACK';
            for (const item of lootTable) { if (random < item.weight) { selectedItemKey = item.id; break; } random -= item.weight; }
            if (ITEM_TYPES[selectedItemKey]) Game.pickups.push(new Pickup(x, y, ITEM_TYPES[selectedItemKey]));
        }

        function dropBossWeapon(x, y) {
            if (isNaN(x) || isNaN(y)) return;
            const weapons = ['AMMO_FIRE', 'AMMO_STUN', 'AMMO_PIERCE', 'AMMO_LIGHTNING', 'AMMO_HOMING'];
            const key = weapons[(Math.random() * weapons.length) | 0];
            if (ITEM_TYPES[key]) {
                const px = x + (Math.random() - 0.5) * 18;
                const py = y + (Math.random() - 0.5) * 18;
                Game.pickups.push(new Pickup(px, py, ITEM_TYPES[key]));
            }
        }

        function drawMiniMap() {
            const mapSize = MINIMAP_SIZE; const mapX = canvas.width - mapSize - 20; const mapY = canvas.height - mapSize - 20;
            ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); 
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(mapX, mapY, mapSize, mapSize);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(mapX, mapY, mapSize, mapSize);
            const scaleX = mapSize / WORLD_WIDTH; const scaleY = mapSize / WORLD_HEIGHT;
            if (Game.player) { ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.arc(mapX + Game.player.x * scaleX, mapY + Game.player.y * scaleY, 3, 0, Math.PI*2); ctx.fill(); }
            Game.enemies.forEach(e => { ctx.fillStyle = e.typeKey === 'BOSS' ? '#D50000' : '#f00'; const r = e.typeKey === 'BOSS' ? 6 : 2; ctx.beginPath(); ctx.arc(mapX + e.x * scaleX, mapY + e.y * scaleY, r, 0, Math.PI*2); ctx.fill(); });
            ctx.fillStyle = '#FFD700'; Game.pickups.forEach(p => { ctx.fillRect(mapX + p.x * scaleX - 1, mapY + p.y * scaleY - 1, 2, 2); });
            ctx.restore();
        }

        function drawPvpOverlay() {
            if (!Game || Game.mode !== 'PVP_DUEL_AIM' || !Game.pvp) return;
            const p = Game.pvp;
            const now = Date.now();
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Score + Round
            const roundDisp = Math.min(p.round || 1, p.totalRounds || 5);
            const scoreText = `P1 ${p.wins[0]} - ${p.wins[1]} P2  |  Round ${roundDisp}/${p.totalRounds}`;
            ctx.font = '700 18px Arial';
            const m = ctx.measureText(scoreText);
            const padX = 12, padY = 6;
            const sx = canvas.width / 2;
            const sy = 72;
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(sx - m.width / 2 - padX, sy - 12, m.width + padX * 2, 24);
            ctx.fillStyle = '#fff';
            ctx.fillText(scoreText, sx, sy);

            // Countdown
            if (p.state === 'countdown') {
                const remain = Math.max(0, (p.countdownEnd || 0) - now);
                const num = Math.ceil(remain / 1000);
                if (num > 0) {
                    ctx.font = '900 86px Arial';
                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.fillText(String(num), sx, canvas.height / 2);
                }
            }

            // Messages (round start/end, fight, match end)
            if (p.state !== 'matchEnd' && p.message && now < (p.messageUntil || 0)) {
                ctx.font = '900 48px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                ctx.fillText(p.message, sx, canvas.height / 2 - 60);
            }

            if (p.state === 'matchEnd') {
                const msg = (p.matchWinner === 1) ? 'P1 THẮNG TRẬN' : (p.matchWinner === 2 ? 'P2 THẮNG TRẬN' : 'HÒA');
                ctx.font = '900 56px Arial';
                ctx.fillStyle = '#FFD54F';
                ctx.fillText(msg, sx, canvas.height / 2 + 10);
                ctx.font = '600 18px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.75)';
                ctx.fillText('Save & Quit để về menu', sx, canvas.height / 2 + 48);
            }

            ctx.restore();
        }

        function drawPvpZone() {
            if (!Game || Game.mode !== 'PVP_DUEL_AIM' || !Game.pvp || !Game.pvp.zone) return;
            const z = Game.pvp.zone;
            if (!z.active) return;
            const r = z.r || z.startR;
            if (!r || isNaN(r)) return;

            ctx.save();
            // Shade outside of safe zone
            ctx.fillStyle = 'rgba(255,80,80,0.08)';
            ctx.beginPath();
            ctx.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
            ctx.arc(z.cx, z.cy, r, 0, Math.PI * 2, true);
            ctx.fill('evenodd');

            // Safe zone ring
            ctx.strokeStyle = 'rgba(255,82,82,0.85)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(z.cx, z.cy, r, 0, Math.PI * 2);
            ctx.stroke();

            // Inner glow
            ctx.strokeStyle = 'rgba(255,160,160,0.35)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(z.cx, z.cy, r - 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }

        function loop() {
            if (!Game.active) return;
            requestAnimationFrame(loop);
            if (Game.paused) return;

            let __isPvp = false;
            // Phase 10.1/12.1: show/hide P2 HUD + balance layout
            try {
                const __twoP = !!(Game.players && Game.players.length >= 2);
                const __hudP2 = document.getElementById('hudP2');
                if (__hudP2) {
                    __hudP2.classList.toggle('hidden', !__twoP);
                    __hudP2.style.display = __twoP ? 'flex' : 'none';
                }
                const __row = document.getElementById('playersHudRow');
                if (__row) {
                    if (__twoP) __row.classList.add('twoP');
                    else __row.classList.remove('twoP');
                }
            } catch(e) {}
// FPS CAP (30..120). Note: requestAnimationFrame cannot exceed monitor refresh rate.
            if (typeof MAX !== 'undefined' && MAX.State && MAX.State.save && MAX.State.save.settings) {
                const cap = Math.max(30, Math.min(120, MAX.State.save.settings.fpsCap || 60));
                const frameMs = 1000 / cap;
                const now = performance.now();
                if (!Game._fpsCapLast) Game._fpsCapLast = now;
                if (now - Game._fpsCapLast < frameMs) return;
                Game._fpsCapLast = now;
            }

            try {
                // Self-healing integrity check.
                if (!Game.player || typeof Game.player.takeDamage !== 'function') {
                     console.warn("Player integrity lost. Respawning...");
                     Game.player = new Player(Game.selectedSystemId || 'default');
                }

                __isPvp = (Game.mode === 'PVP_DUEL_AIM');
                try {
                    if (Game.ui && Game.ui.updateSkillSlots && Game.player) {
                        if (Game._hudSys1 !== Game.player.systemId) {
                            Game._hudSys1 = Game.player.systemId;
                            Game.ui.updateSkillSlots(Game._hudSys1, 1);
                        }
                        if (Game.player2) {
                            if (Game._hudSys2 !== Game.player2.systemId) {
                                Game._hudSys2 = Game.player2.systemId;
                                Game.ui.updateSkillSlots(Game._hudSys2, 2);
                            }
                        }
                    }
                } catch(e) {}
                if (__isPvp && typeof Game.pvpTick === 'function') Game.pvpTick();
                try {
                    const __btnReplay = document.getElementById('btnPvpReplay');
                    if (__btnReplay) __btnReplay.style.display = (__isPvp && Game.pvp && Game.pvp.state === 'matchEnd') ? 'inline-flex' : 'none';
                } catch(e){}
                const __pvpFreeze = (__isPvp && Game.pvp && Game.pvp.freeze);

                // PvP zone warning: flash HUD when near/outside safe zone
                try {
                    const hud1 = document.getElementById('hudP1');
                    const hud2 = document.getElementById('hudP2');
                    if (__isPvp && Game.pvp && Game.pvp.state === 'active' && Game.pvp.zone && Game.pvp.zone.active) {
                        const z = Game.pvp.zone;
                        const warnMargin = Math.max(90, Math.min(180, (z.r || 0) * 0.18));
                        const p1 = (Game.players && Game.players[0]) ? Game.players[0] : null;
                        const p2 = (Game.players && Game.players[1]) ? Game.players[1] : null;
                        let w1 = false, w2 = false;
                        if (p1 && p1.hp > 0) {
                            const d1 = Math.hypot(p1.x - z.cx, p1.y - z.cy);
                            const limit1 = (z.r || 0) - (p1.radius || 0);
                            w1 = d1 > (limit1 - warnMargin);
                        }
                        if (p2 && p2.hp > 0) {
                            const d2 = Math.hypot(p2.x - z.cx, p2.y - z.cy);
                            const limit2 = (z.r || 0) - (p2.radius || 0);
                            w2 = d2 > (limit2 - warnMargin);
                        }
                        if (hud1) hud1.classList.toggle('pvp-warn', !!w1);
                        if (hud2) hud2.classList.toggle('pvp-warn', !!w2);
                    } else {
                        if (hud1) hud1.classList.remove('pvp-warn');
                        if (hud2) hud2.classList.remove('pvp-warn');
                    }
                } catch(e){}
                if (!__isPvp) {
                    WaveManager.update();
                } else {
                    // PvP: clear leftover PvE entities (safe cleanup)
                    if (!Game.__pvpCleaned) {
                        try { if (Game.enemies) Game.enemies.length = 0; } catch(e){}
                        try { if (Game.pickups) Game.pickups.length = 0; } catch(e){}
                        try { if (Game.coins) Game.coins.length = 0; } catch(e){}
                        try { if (Game.bossMines) Game.bossMines.length = 0; } catch(e){}
                        Game.__pvpCleaned = true;
                    }
                    // Remove any enemy bullets that may remain
                    try {
                        if (Game.projectiles && Game.projectiles.length) {
                            Game.projectiles = Game.projectiles.filter(p => p && p.owner === 'PLAYER');
                        }
                    } catch(e){}
                }
                const __camTargets = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                if (__camTargets && __camTargets.length) Camera.update(__camTargets);
                if(canvas.width > 0 && canvas.height > 0) { ctx.fillStyle = '#121212'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
                ctx.save();
                let shakeX = 0, shakeY = 0; if (typeof MAX !== 'undefined' && MAX.State && MAX.State.save && !MAX.State.save.settings.shake) { Game.shake = 0; }
                if (!isNaN(Game.shake) && Game.shake > 0) { shakeX = Math.random() * Game.shake - Game.shake/2; shakeY = Math.random() * Game.shake - Game.shake/2; Game.shake *= 0.9; if(Game.shake < 0.5) Game.shake = 0; }
                if(!isNaN(Camera.x) && !isNaN(Camera.y)) {
                    const __z = (Camera && Camera.zoom) ? Camera.zoom : 1;
                    ctx.translate(shakeX, shakeY);
                    ctx.scale(__z, __z);
                    ctx.translate(-Camera.x, -Camera.y);
                }
                if (typeof drawPrettyMapBackground === 'function') {
                    drawPrettyMapBackground();
                } else {
                    ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
                    for (let y = 0; y <= WORLD_HEIGHT; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke(); }
                    for (let x = 0; x <= WORLD_WIDTH; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke(); }
                    ctx.strokeStyle = '#FF0000'; ctx.lineWidth = 5; ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
                }

                if (__isPvp) {
                    try { drawPvpZone(); } catch(e){}
                }

                Game.obstacles.forEach(obs => obs.draw());
                
                // Phase 4: multi-player foundation (players[]). P1 remains Game.player (camera follow P1).
                const __m4 = (Input && Input.getMode) ? Input.getMode() : (Game.startMode || {difficulty:'hard', players:1});
                const __is2p4 = !!(__m4 && __m4.players === 2);

                // Enforce "no-mouse" for 2P (shooting via mouse is disabled; Phase 5 will add auto-shoot).
                if (__is2p4) { try { Input.mouse.down = false; } catch(e){} }

                if (Game.players && Game.players.length) {
                    const p1 = Game.players[0];
                    if (p1) { Game.__uiPid = 1; if (!__pvpFreeze) p1.update(Game.obstacles); p1.draw(); }

                    const p2 = Game.players[1];
                    if (p2) {
                        if (__pvpFreeze) {
                            Game.__uiPid = 2;
                            p2.draw();
                            Game.__uiPid = 1;
                        } else {
                        // Temporarily map Arrow keys -> WASD, and 1/2/3 -> Q/E/R for P2 update (no mouse).
                        const K = Input.keys || {};
                        const ow = K['w'], oa = K['a'], os = K['s'], od = K['d'], oq = K['q'], oe = K['e'], orr = K['r'];

                        K['w'] = !!K['arrowup'];
                        K['a'] = !!K['arrowleft'];
                        K['s'] = !!K['arrowdown'];
                        K['d'] = !!K['arrowright'];

                        K['q'] = !!K['1'];
                        K['e'] = !!K['2'];
                        K['r'] = !!K['3'];

                        // Redirect "cycle" actions for P2 (reuse Player.update's p1_* action hooks)
                        // IMPORTANT: bind original consumeAction to Input to avoid `this` loss (crash in some browsers).
                        const __ocRaw = Input.consumeAction;
                        const __oc = (typeof __ocRaw === 'function' && __ocRaw.bind) ? __ocRaw.bind(Input) : __ocRaw;
                        try {
                            if (typeof __oc === 'function') {
                                Input.consumeAction = (name) => {
                                    if (typeof __oc !== 'function') return false;
                                    if (name === 'p1_weapon_cycle') return __oc('p2_weapon_cycle');
                                    if (name === 'p1_target_cycle') return __oc('p2_target_cycle');
                                    return __oc(name);
                                };
                            }
                        } catch(e){}

                        Game.__uiPid = 2;
                        p2.update(Game.obstacles);
                        p2.draw();
                        Game.__uiPid = 1;

                        try { Input.consumeAction = __ocRaw; } catch(e){}

                        // Restore original keys
                        K['w'] = ow; K['a'] = oa; K['s'] = os; K['d'] = od; K['q'] = oq; K['e'] = oe; K['r'] = orr;

                        // Restore P1 HUD (P2 update writes to the same HUD; Phase 10 will split HUD per-player).
                        try {
                            Game.ui.updateWeaponInventory(p1.inventory, p1.currentWeaponIndex);
                            Game.ui.updateTankSystemUI(p1.systemId || Game.selectedSystemId);
                            const __noSkillCdHud = !!(Game && Game.adminNoSkillCooldown);
                            const __cd = getSystemSkillCooldowns(p1.systemId);
                            Game.ui.updateSkillCooldown('clone', p1.skills.clone.lastUsed, __noSkillCdHud ? 0 : __cd.clone);
                            Game.ui.updateSkillCooldown('stealth', p1.skills.stealth.lastUsed, __noSkillCdHud ? 0 : __cd.stealth);
                            Game.ui.updateSkillCooldown('vampirism', p1.skills.vampirism.lastUsed, __noSkillCdHud ? 0 : __cd.vampirism);
                        } catch(e){}
                        }
                    }
                } else if (Game.player) { Game.player.update(Game.obstacles); Game.player.draw(); }

                Game.clones.forEach(c => { c.update(Game.enemies, Game.obstacles, Game.projectiles); c.draw(); });
                Game.clones = Game.clones.filter(c => !c.markedForDeletion);

                // Engineer turrets.
                if (Game.turrets && Game.turrets.length) {
                    Game.turrets.forEach(t => { t.update(Game.obstacles); t.draw(); });
                    Game.turrets = Game.turrets.filter(t => !t.markedForDeletion);
                }

                const __players = getPlayersListSafe();
                const __freezeEnemies = !!Game.adminFreeze;

                Game.pickups.forEach((p) => {
                    p.update(); p.draw();
                    if (p.markedForDeletion) return;
                    for (let __i = 0; __i < __players.length; __i++) {
                        const __pl = __players[__i];
                        if (!__pl) continue;
                        if (checkCollision(__pl, p)) {
                            if (p.config.type === 'HEAL') __pl.heal(p.config.value);
                            else if (p.config.type === 'BUFF') __pl.addBuff(p.config.buffType, p.config.duration);
                            else if (p.config.type === 'WEAPON') __pl.addWeapon(p.config.weaponId);
                            createDamageText(__pl.x, __pl.y - 30, p.config.label, p.config.color);
                            p.markedForDeletion = true;
                            break;
                        }
                    }
                });

                

                // Coins (gold).
                Game.coins.forEach((c) => {
                    c.update(); c.draw();

                    if (!__players.length) return;

                    let __pl = null;
                    let __best = 1e18;
                    for (let __i = 0; __i < __players.length; __i++) {
                        const p = __players[__i];
                        if (!p) continue;
                        const d = Math.hypot(p.x - c.x, p.y - c.y);
                        if (d < __best) { __best = d; __pl = p; }
                    }
                    if (!__pl) return;

                    const dx = (__pl.x - c.x);
                    const dy = (__pl.y - c.y);
                    const dist = (__best || 0.0001);

                    const pr = (__pl.radius || 20);
                    const cr = (c.radius || 10);

                    const magnetRange = pr + cr + 40 + 30 * ((Game.upgrades && Game.upgrades.magnetLv) ? Game.upgrades.magnetLv : 0);
                    const pickupRange = pr + cr + 6;

                    if (dist < magnetRange) {
                        const tPull = 1 - (dist / magnetRange); // 0..1
                        const pull = 0.45 + tPull * 1.35;
                        const ux = dx / dist;
                        const uy = dy / dist;

                        c.vx = (c.vx || 0) + ux * pull;
                        c.vy = (c.vy || 0) + uy * pull;

                        const v = Math.hypot(c.vx, c.vy);
                        const vmax = 10 + tPull * 10;
                        if (v > vmax) { c.vx = (c.vx / v) * vmax; c.vy = (c.vy / v) * vmax; }

                        if (dist < pickupRange) {
                            Game.gold += c.value;
                            Game.ui.updateGold(Game.gold);
                            createDamageText(__pl.x, __pl.y - 30, `+${c.value}`, '#FFD700');
                            c.markedForDeletion = true;
                        }
                    }
                });



                if (!__freezeEnemies && Game.bossMines && Game.bossMines.length) {
                    const nowM = Date.now();
                    for (let i = Game.bossMines.length - 1; i >= 0; i--) {
                        const m = Game.bossMines[i];
                        const t = m.detonateAt - nowM;
                        const pct = Math.max(0, Math.min(1, t / (m.delay || 1500)));

                        // Draw warning (Ultra)
                        if (typeof BossFX !== 'undefined' && BossFX && typeof BossFX.drawMine === 'function') {
                            BossFX.drawMine(m, pct);
                        } else {
                            ctx.save();
                            ctx.fillStyle = 'rgba(255,152,0,0.10)';
                            ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2); ctx.fill();
                            ctx.strokeStyle = 'rgba(255,152,0,0.95)';
                            ctx.lineWidth = 2;
                            ctx.beginPath(); ctx.arc(m.x, m.y, m.radius * (0.35 + 0.65 * pct), 0, Math.PI * 2); ctx.stroke();
                            ctx.restore();
                        }

                        if (nowM >= m.detonateAt) {
                            createComplexExplosion(m.x, m.y, '#FF9800');
                            if (typeof BossFX !== 'undefined' && BossFX && typeof BossFX.mineDetonateFX === 'function') BossFX.mineDetonateFX(m.x, m.y, m.radius || 80);

                            if (__players && __players.length) {
                                for (let __i = 0; __i < __players.length; __i++) {
                                    const __pl = __players[__i];
                                    if (!__pl || typeof __pl.takeDamage !== 'function') continue;
                                    const dP = Math.hypot(__pl.x - m.x, __pl.y - m.y);
                                    if (dP <= m.radius + __pl.radius) __pl.takeDamage(m.damage);
                                }
                            }
                            if (Game.clones && Game.clones.length) {
                                Game.clones.forEach(c => {
                                    const dC = Math.hypot(c.x - m.x, c.y - m.y);
                                    if (dC <= m.radius + c.radius) c.takeDamage(m.damage);
                                });
                            }

                            Game.bossMines.splice(i, 1);
                        }
                    }
                }

                // Mage Blizzard (R): bullets inside blizzard vanish (PvP supported)
                const mageBlizzards = [];
                const __pvpMode = (Game.mode === 'PVP_DUEL_AIM');
                const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                for (const __pl of __plist){
                    if (!__pl || __pl.systemId !== 'mage') continue;
                    if (!__pl.mage || !__pl.mage.blizzard || !__pl.mage.blizzard.active) continue;
                    const cfg = getSystemSkillDef('mage', 'vampirism') || {};
                    mageBlizzards.push({
                        x: __pl.mage.blizzard.x,
                        y: __pl.mage.blizzard.y,
                        r: (cfg.radius != null) ? cfg.radius : 220,
                        ownerPid: __pl.pid
                    });
                }

                Game.projectiles.forEach(p => {
                    if (!(__freezeEnemies && p.owner === 'ENEMY')) {
                        p.update();
                    }
                    // Remove hostile bullets inside Blizzard (outer circle)
                    if (mageBlizzards.length && !p.markedForDeletion) {
                        for (const bz of mageBlizzards){
                            const d = Math.hypot(p.x - bz.x, p.y - bz.y);
                            if (d > bz.r) continue;
                            let shouldRemove = false;
                            if (__pvpMode){
                                if (p.ownerPid != null && bz.ownerPid != null && p.ownerPid !== bz.ownerPid) shouldRemove = true;
                                if (p.owner === 'ENEMY') shouldRemove = true;
                            } else {
                                if (p.owner === 'ENEMY') shouldRemove = true;
                            }
                            if (shouldRemove){
                                p.markedForDeletion = true;
                                if (typeof createMuzzleFlash === 'function') createMuzzleFlash(p.x, p.y, 0, '#00E5FF');
                                break;
                            }
                        }
                    }

                    if (!p.markedForDeletion) p.draw();
                });


                Game.enemies.forEach(e => {
                    if (!__freezeEnemies) {
                        e.update(__players, Game.clones, Game.obstacles);
                    }
                    e.draw();
                    if (!__freezeEnemies) {
                        if (__players && __players.length) {
                            for (let __i = 0; __i < __players.length; __i++) {
                                const __pl = __players[__i];
                                if (!__pl) continue;
                                if (checkCollision(__pl, e)) {
                                    if (__pl.systemId !== 'assassin') { if (typeof __pl.takeDamage === 'function') __pl.takeDamage(e.contactDamage || 5, { enemy: e, type: 'CONTACT' }); }
                                    const angle = Math.atan2(e.y - __pl.y, e.x - __pl.x);
                                    e.x += Math.cos(angle) * 10; e.y += Math.sin(angle) * 10;
                                    break;
                                }
                            }
                        }
                        Game.clones.forEach(c => {
                            if (checkCollision(c, e)) { c.takeDamage(e.contactDamage || 5); const angle = Math.atan2(e.y - c.y, e.x - c.x); e.x += Math.cos(angle) * 10; e.y += Math.sin(angle) * 10; }
                        });
                    }
                });

                Game.projectiles.forEach(b => {
                    if (b.markedForDeletion) return;
                    if (__freezeEnemies && b.owner !== 'PLAYER') return;
                    let wallHit = false;
                    for(let obs of Game.obstacles) { 
                        if (checkCircleRect({x: b.x, y: b.y, radius: b.radius}, obs)) { 
                            if (b.config.special === 'PIERCE' || b.typeKey === 'PIERCING') { if(Math.random() < 0.2) createComplexExplosion(b.x, b.y, '#ccc'); } 
                            else { b.markedForDeletion = true; createComplexExplosion(b.x, b.y, '#aaa'); wallHit = true; break; }
                        } 
                    }
                    if(wallHit) return;

                    // PvP: player bullets hit opponent (no self/teammate)
                    if (Game.mode === 'PVP_DUEL_AIM' && b.owner === 'PLAYER') {
                        const __plist = getPlayersListSafe();
                        const __owner = resolveProjectileOwnerPlayer(b, __plist);
                        let __hit = false;
                        for (let __i = 0; __i < __plist.length; __i++) {
                            const __pl = __plist[__i];
                            if (!__pl || typeof __pl.hp !== 'number' || __pl.hp <= 0) continue;
                            if (b.ownerPid != null && __pl.pid === b.ownerPid) continue;
                            if (__owner && __pl === __owner) continue;
                            if (checkCollision(b, __pl)) {
                                const __baseDmg = (b && b.config && typeof b.config.damage === 'number') ? b.config.damage : 0;
                                const __pvpDmg = pvpBulletDamageForTarget(__owner, __pl, b, __baseDmg);
                                if (typeof __pl.takeDamage === 'function') __pl.takeDamage(__pvpDmg, { attacker: __owner, bullet: b, type: 'PVP_BULLET' });
                                pvpApplyBulletOnHit(__owner, __pl, b);
                                if (b.config.effect && typeof __pl.applyEffect === 'function') __pl.applyEffect(b.config.effect);
                                b.markedForDeletion = true;
                                createComplexExplosion(b.x, b.y, b.config.color || '#fff');
                                __hit = true;
                                break;
                            }
                        }
                        if (!__hit && Game.clones && Game.clones.length) {
                            for (let __i = 0; __i < Game.clones.length; __i++) {
                                const __cl = Game.clones[__i];
                                if (!__cl || __cl.markedForDeletion) continue;
                                if (b.ownerPid != null && __cl.ownerPid === b.ownerPid) continue;
                                if (checkCollision(b, __cl)) {
                                    const __baseDmgC = (b && b.config && typeof b.config.damage === 'number') ? b.config.damage : 0;
                                    const __pvpDmgC = pvpBulletDamageForTarget(__owner, __cl, b, __baseDmgC);
                                    if (typeof __cl.takeDamage === 'function') __cl.takeDamage(__pvpDmgC);
                                    pvpApplyBulletOnHit(__owner, __cl, b);
                                    if (b.config.effect && typeof __cl.applyEffect === 'function') __cl.applyEffect(b.config.effect);
                                    b.markedForDeletion = true;
                                    createComplexExplosion(b.x, b.y, b.config.color || '#fff');
                                    __hit = true;
                                    break;
                                }
                            }
                        }
                        if (__hit) return;
                    }

                    if (b.owner !== 'PLAYER') {
                        if (__players && __players.length) {
                             for (let __i = 0; __i < __players.length; __i++) {
                                 const __pl = __players[__i];
                                 if (!__pl) continue;
                                 if (checkCollision(b, __pl)) {
                                     if (typeof __pl.takeDamage === 'function') __pl.takeDamage(b.config.damage, { enemy: b.sourceEnemy || null, bullet: b, type: 'BULLET' });
                                     b.markedForDeletion = true; createComplexExplosion(b.x, b.y, '#E040FB');
                                     break;
                                 }
                             }
                        }
                        Game.clones.forEach(c => {
                            if (checkCollision(b, c)) { c.takeDamage(b.config.damage); b.markedForDeletion = true; createComplexExplosion(b.x, b.y, '#E040FB'); }
                        });
                        return;
                    }
                    Game.enemies.forEach(e => {
                        if (b.markedForDeletion) return; if (b.hitList.includes(e.id)) return;
                        if (checkCollision(b, e)) {
                            const dmgMult = (b.owner === 'PLAYER') ? (1 + 0.1 * ((Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0)) : 1;
                            const dmg = b.config.damage * dmgMult;
                            if (!b.config.noDirectHit) e.hp -= dmg;
                            let __owner = null;
                            if (b.owner === 'PLAYER') {
                                const __plist = getPlayersListSafe();
                                __owner = resolveProjectileOwnerPlayer(b, __plist);
                            }

if (b.owner === 'PLAYER' && __owner && typeof __owner.gainUltiCharge === 'function') __owner.gainUltiCharge(0.5);
                            if (b.owner === 'PLAYER' && __owner && __owner.systemId === 'default' && __owner.skills && __owner.skills.vampirism && __owner.skills.vampirism.active) {
                                // Lifesteal with cap per second
                                const now2 = Date.now();
                                if (!__owner.vampHeal) __owner.vampHeal = { windowStart: now2, healed: 0 };
                                if (now2 - __owner.vampHeal.windowStart >= 1000) { __owner.vampHeal.windowStart = now2; __owner.vampHeal.healed = 0; }
                                const cap = (SKILL_CONFIG.VAMPIRISM.capPerSecond || 0);
                                const want = dmg * (SKILL_CONFIG.VAMPIRISM.leechPercent || 0);
                                const remain = (cap > 0) ? Math.max(0, cap - __owner.vampHeal.healed) : want;
                                const healAmount = (cap > 0) ? Math.min(want, remain) : want;
                                if (healAmount > 0) { __owner.vampHeal.healed += healAmount; __owner.heal(healAmount); }
                            }
                            createDamageText(e.x, e.y, Math.round(dmg), b.config.color); createComplexExplosion(b.x, b.y, b.config.color);
                            if (b.config.effect) {
                                let eff = b.config.effect;
                                if (b.owner === 'PLAYER' && eff.type === 'BURN' && typeof eff.tickDamage === 'number') {
                                    eff = { ...eff, tickDamage: eff.tickDamage * dmgMult };
                                }
                                e.applyEffect(eff);
                            }
if (b.config.special === 'CHAIN') chainLightning(e, (dmg * b.config.chainDmgFactor), b.config.chainCount, b.config.chainRange);
                            if (b.config.special === 'EXPLODE') {
                                const r = b.config.explosionRadius || 120;
                                const splash = (b.config.splashFactor != null) ? b.config.splashFactor : 0.75;
                                const includeHit = !!b.config.noDirectHit;

                                if (b.config.shockwave) {
                                    Game.particles.push(new Particle(b.x, b.y, { type: 'shockwave', color: (b.config.shockColor || b.config.color), size: 10, maxRadius: r, decay: 0.05, glowBlur: 28, glowColor: (b.config.shockColor || b.config.color) }));
                                }

                                Game.enemies.forEach(e2 => {
                                    if (!e2 || e2.hp <= 0 || e2.markedForDeletion) return;
                                    if (!includeHit && e2 === e) return;

                                    const d2 = Math.hypot(e2.x - b.x, e2.y - b.y);
                                    if (d2 <= r) {
                                        const f = Math.max(0.08, 1 - (d2 / r));
                                        const base = includeHit ? dmg : (dmg * splash);
                                        const sd = Math.round(base * f);
                                        if (sd > 0) {
                                            e2.hp -= sd;
                                            createDamageText(e2.x, e2.y, sd, b.config.color);
                                        }
                                    }
                                });

                                Game.shake = Math.max(Game.shake, 10);
                            }
                            if (b.config.special === 'PIERCE') { b.pierceCount--; b.hitList.push(e.id); if (b.pierceCount <= 0) b.markedForDeletion = true; } else { b.markedForDeletion = true; }
                        }
                    });
                });

                Game.enemies = Game.enemies.filter(e => {
                    if (e.hp <= 0) {
                        createComplexExplosion(e.x, e.y, e.config.color); Game.score += e.config.score; Game.ui.updateScore(Game.score); if (e.typeKey === 'BOSS') dropBossWeapon(e.x, e.y); else dropPickup(e.x, e.y); dropGold(e.x, e.y, (e.config && !isNaN(e.config.gold)) ? e.config.gold : 0); 
                        if(Game.player && typeof Game.player.gainUltiCharge === 'function') Game.player.gainUltiCharge(2);
                        return false;
                    } return !e.markedForDeletion;
                });
                Game.projectiles = Game.projectiles.filter(p => !p.markedForDeletion);
                Game.pickups = Game.pickups.filter(p => !p.markedForDeletion);
                Game.coins = Game.coins.filter(c => !c.markedForDeletion);
                Game.particles.forEach(p => p.update()); Game.particles.forEach(p => p.draw()); Game.particles = Game.particles.filter(p => !p.markedForDeletion);
                Game.texts.forEach((t, i) => { ctx.fillStyle = t.color; ctx.font = 'bold 16px Arial'; ctx.globalAlpha = t.life; ctx.fillText(t.text, t.x, t.y); t.y += t.dy; t.life -= 0.02; if(t.life <= 0) Game.texts.splice(i, 1); ctx.globalAlpha = 1; });
                if (typeof MAX !== 'undefined' && MAX.State.save.settings.minimap) drawMiniMap();
                ctx.restore();
                if (__isPvp) { try { drawPvpOverlay(); } catch(e) {} }
                Game.ui.updateEnemies(Game.enemies.length);
                // FPS Counter
                if (typeof MAX !== 'undefined') {
                    const now = performance.now();
                    MAX.State.fps.frames++;
                    if (now - MAX.State.fps.last >= 500) {
                        MAX.State.fps.value = Math.round((MAX.State.fps.frames * 1000) / (now - MAX.State.fps.last));
                        MAX.State.fps.last = now;
                        MAX.State.fps.frames = 0;
                        const fpsVal = document.getElementById('fpsVal');
                        if (fpsVal && MAX.State.save.settings.fps) fpsVal.textContent = MAX.State.fps.value;
                    }
                }
                if (__isPvp) {
                    if (typeof Game.pvpCheckRoundEnd === 'function') Game.pvpCheckRoundEnd();
                } else {
                    if (Game.players && Game.players.length) { if (Game.players.every(p => p && p.hp <= 0)) Game.gameOver(); }
                    else { if (Game.player && Game.player.hp <= 0) Game.gameOver(); }
                }
            } catch (err) { console.error("Game Loop Error:", err); }
        }

        
        // Global unlock helper (shared across wave/save/start-screen flows)
        function unlockAssassin(reason){
            try {
                if (!Game.unlocks || typeof Game.unlocks !== 'object') Game.unlocks = { assassin: false };
                Game.unlocks.assassin = true;
                if (reason) Game.unlocks.assassinReason = String(reason);
                localStorage.setItem('tankUnlocks_v1', JSON.stringify(Game.unlocks));
            } catch(e) {}
            try { if (window.__refreshUnlocks) window.__refreshUnlocks(); } catch(e) {}
        }
        // Load unlocks (assassin)
        try {
            const rawUnlocks = localStorage.getItem('tankUnlocks_v1');
            const baseUnlocks = { assassin: false };
            if (rawUnlocks) {
                const u = JSON.parse(rawUnlocks);
                if (u && typeof u === 'object') { Game.unlocks = Object.assign(baseUnlocks, u); }
                else { Game.unlocks = baseUnlocks; }
            } else {
                Game.unlocks = baseUnlocks;
            }
        } catch(e) { try { Game.unlocks = { assassin: false }; } catch(e2) {} }

        // Load saved tank system selection (optional)
        try {
            const savedSys = localStorage.getItem('tankSystem');
            if (savedSys && document.querySelector(`input[name="tankSystem"][value="${savedSys}"]`)) {
                document.querySelector(`input[name="tankSystem"][value="${savedSys}"]`).checked = true;
                Game.selectedSystemId = savedSys;
            }
        } catch(e) {}

