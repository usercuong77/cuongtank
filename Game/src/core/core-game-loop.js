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
                            let __owner = null;
                            if (b.owner === 'PLAYER') {
                                const __plist = getPlayersListSafe();
                                __owner = resolveProjectileOwnerPlayer(b, __plist);
                            }
                            if (!b.config.noDirectHit) e.hp -= dmg;
                            if (__owner) e.__lastHitPlayer = __owner;

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
                                            if (__owner) e2.__lastHitPlayer = __owner;
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
                        const __killer = (Game.mode !== 'PVP_DUEL_AIM' && e.__lastHitPlayer && e.__lastHitPlayer.systemId === 'assassin')
                            ? e.__lastHitPlayer
                            : null;
                        if (__killer && typeof __killer.heal === 'function') {
                            const __healOnKill = Math.max(1, Math.round((__killer.maxHp || 0) * 0.02));
                            if (__healOnKill > 0) __killer.heal(__healOnKill);
                        }
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
        try {
            const __app = window.App || (window.App = {});
            __app.runtime = __app.runtime || {};
            __app.state = __app.state || {};
            __app.runtime.loop = loop;
            __app.runtime.unlockAssassin = unlockAssassin;
            __app.state.unlocks = Game.unlocks;
            window.unlockAssassin = unlockAssassin;
        } catch (e) {}
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

