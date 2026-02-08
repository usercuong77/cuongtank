const __pvpTuningData = (window.App && window.App.data && window.App.data.pvpTuning)
    ? window.App.data.pvpTuning
    : (window.PVP_TUNING_CONFIG || ((typeof PVP_CONFIG !== 'undefined') ? PVP_CONFIG : null) || {});
        const __pvpPassiveTuning = (__pvpTuningData && __pvpTuningData.passive) ? __pvpTuningData.passive : {};
        const PVP_AIM_LEAD_MAX_MS = (__pvpTuningData.aimLeadMaxMs != null) ? __pvpTuningData.aimLeadMaxMs : 390;
        const PVP_AIM_LEAD_FACTOR = (__pvpTuningData.aimLeadFactor != null) ? __pvpTuningData.aimLeadFactor : 1.34;
        const PVP_AIM_MAX_TURN = (__pvpTuningData.aimMaxTurn != null) ? __pvpTuningData.aimMaxTurn : 0.17;
        const EASY_AUTO_AIM_LEAD_BLEND = (__pvpTuningData.easyAutoAimLeadBlend != null) ? __pvpTuningData.easyAutoAimLeadBlend : 0.55; // Easy: 55% predictive lead.
        const COOP_AUTO_AIM_LEAD_BLEND = (__pvpTuningData.coopAutoAimLeadBlend != null) ? __pvpTuningData.coopAutoAimLeadBlend : 0.30; // 2P Bot: 30% predictive lead.
        const AUTO_AIM_LEAD_MAX_MS = (__pvpTuningData.autoAimLeadMaxMs != null) ? __pvpTuningData.autoAimLeadMaxMs : 300;
        const PVP_SKILL_DAMAGE_MULT = (__pvpTuningData.skillDamageMult != null) ? __pvpTuningData.skillDamageMult : 0.85;
        const PVP_HARD_CC_CAP_MS = (__pvpTuningData.hardCcCapMs != null) ? __pvpTuningData.hardCcCapMs : 1000;
        const PVP_HARD_CC_DR_WINDOW_MS = (__pvpTuningData.hardCcDrWindowMs != null) ? __pvpTuningData.hardCcDrWindowMs : 3000;
        const PVP_HARD_CC_DR_MULT = (__pvpTuningData.hardCcDrMult != null) ? __pvpTuningData.hardCcDrMult : 0.60;
        const PVP_SKILL_GLOBAL_LOCKOUT_MS = (__pvpTuningData.skillGlobalLockoutMs != null) ? __pvpTuningData.skillGlobalLockoutMs : 300;
        const PVP_PASSIVE_DEFAULT_HITS_REQ = (__pvpPassiveTuning.defaultHitsReq != null) ? __pvpPassiveTuning.defaultHitsReq : 5;
        const PVP_PASSIVE_DEFAULT_SLOW_MS = (__pvpPassiveTuning.defaultSlowMs != null) ? __pvpPassiveTuning.defaultSlowMs : 800;
        const PVP_PASSIVE_DEFAULT_SLOW_FACTOR = (__pvpPassiveTuning.defaultSlowFactor != null) ? __pvpPassiveTuning.defaultSlowFactor : 0.88;
        const PVP_PASSIVE_ENGINEER_SKILL_MARK_BONUS = (__pvpPassiveTuning.engineerSkillMarkBonus != null) ? __pvpPassiveTuning.engineerSkillMarkBonus : 1.08;
        const PVP_PASSIVE_MAGE_STACK_REQ = (__pvpPassiveTuning.mageStackReq != null) ? __pvpPassiveTuning.mageStackReq : 4;
        const PVP_PASSIVE_MAGE_BURST_DAMAGE = (__pvpPassiveTuning.mageBurstDamage != null) ? __pvpPassiveTuning.mageBurstDamage : 22;
        const PVP_PASSIVE_MAGE_BURST_RADIUS = (__pvpPassiveTuning.mageBurstRadius != null) ? __pvpPassiveTuning.mageBurstRadius : 95;
        const PVP_PASSIVE_MAGE_BURST_SPLASH_MULT = (__pvpPassiveTuning.mageBurstSplashMult != null) ? __pvpPassiveTuning.mageBurstSplashMult : 0.60;

        const __pvpData = (window.App && window.App.data && window.App.data.pvpLoadout) ? window.App.data.pvpLoadout : null;
        const PVP_LOADOUT_STORAGE_KEY = (__pvpData && __pvpData.loadoutStorageKey)
            ? __pvpData.loadoutStorageKey
            : ((typeof window.PVP_LOADOUT_STORAGE_KEY !== 'undefined')
                ? window.PVP_LOADOUT_STORAGE_KEY
                : ((__pvpTuningData && __pvpTuningData.loadoutStorageKey) ? __pvpTuningData.loadoutStorageKey : 'tankPvpLoadout_v1'));
        const PVP_AMMO_TYPES = (__pvpData && __pvpData.ammoTypes) ? __pvpData.ammoTypes : (window.PVP_AMMO_TYPES || {});
        const PVP_ITEM_TYPES = (__pvpData && __pvpData.itemTypes) ? __pvpData.itemTypes : (window.PVP_ITEM_TYPES || {});
        const PVP_AMMO_EN_TEXT = (__pvpData && __pvpData.ammoEnText) ? __pvpData.ammoEnText : (window.PVP_AMMO_EN_TEXT || {});
        const PVP_ITEM_EN_TEXT = (__pvpData && __pvpData.itemEnText) ? __pvpData.itemEnText : (window.PVP_ITEM_EN_TEXT || {});
        const PVP_DEFAULT_LOADOUT = (__pvpData && __pvpData.defaultLoadout) ? __pvpData.defaultLoadout : (window.PVP_DEFAULT_LOADOUT || {
            p1: { ammo: 'ap40', items: ['composite_armor', 'cooldown_firewall', 'stealth_scrambler'] },
            p2: { ammo: 'jammer', items: ['burst_dampener', 'anti_pierce_liner', 'skill_hunter'] }
        });

        // === PvP Localization + Loadout Resolver ===
        function pvpLang(){
            try { return (window.I18N && typeof window.I18N.lang === 'function') ? window.I18N.lang() : 'vi'; } catch(e){ return 'vi'; }
        }
        function getPvpAmmoLocale(ammoId){
            const base = PVP_AMMO_TYPES && PVP_AMMO_TYPES[ammoId] ? PVP_AMMO_TYPES[ammoId] : null;
            if (!base) return { id: ammoId, label: ammoId || 'unknown', desc: '', stats: [] };
            if (pvpLang() === 'en' && PVP_AMMO_EN_TEXT[ammoId]) {
                const en = PVP_AMMO_EN_TEXT[ammoId];
                return { id: ammoId, label: en.label, desc: en.desc, stats: en.stats || [] };
            }
            return { id: ammoId, label: base.label || ammoId, desc: base.desc || '', stats: base.stats || [] };
        }
        function getPvpItemLocale(itemId){
            const base = PVP_ITEM_TYPES && PVP_ITEM_TYPES[itemId] ? PVP_ITEM_TYPES[itemId] : null;
            if (!base) return { id: itemId, label: itemId || 'unknown', desc: '', stats: [] };
            if (pvpLang() === 'en' && PVP_ITEM_EN_TEXT[itemId]) {
                const en = PVP_ITEM_EN_TEXT[itemId];
                return { id: itemId, label: en.label, desc: en.desc, stats: en.stats || [] };
            }
            return { id: itemId, label: base.label || itemId, desc: base.desc || '', stats: base.stats || [] };
        }


        function pvpCloneObj(v){
            try { return JSON.parse(JSON.stringify(v)); } catch(e) { return null; }
        }

        function pvpNormalizeItemList(items){
            const all = Object.keys(PVP_ITEM_TYPES || {});
            const out = [];
            const seen = {};
            const src = Array.isArray(items) ? items : [];
            for (let i = 0; i < src.length; i++) {
                const id = String(src[i] || '').trim();
                if (!id || !PVP_ITEM_TYPES[id] || seen[id]) continue;
                out.push(id); seen[id] = true;
                if (out.length >= 3) break;
            }
            for (let i = 0; out.length < 3 && i < all.length; i++) {
                const id = all[i];
                if (seen[id]) continue;
                out.push(id); seen[id] = true;
            }
            return out.slice(0, 3);
        }

        function sanitizePvpLoadouts(raw){
            const base = pvpCloneObj(PVP_DEFAULT_LOADOUT) || { p1:{ ammo:'ap40', items:[] }, p2:{ ammo:'jammer', items:[] } };
            const next = (raw && typeof raw === 'object') ? raw : {};
            const out = { p1: { ammo: base.p1.ammo, items: base.p1.items.slice(0) }, p2: { ammo: base.p2.ammo, items: base.p2.items.slice(0) } };
            ['p1','p2'].forEach((slot)=>{
                const src = (next && next[slot] && typeof next[slot] === 'object') ? next[slot] : {};
                const ammo = String(src.ammo || out[slot].ammo || '').trim();
                out[slot].ammo = PVP_AMMO_TYPES[ammo] ? ammo : out[slot].ammo;
                out[slot].items = pvpNormalizeItemList(src.items || out[slot].items || []);
            });
            return out;
        }

        function getPvpLoadoutByPid(pid){
            const slot = (pid === 2) ? 'p2' : 'p1';
            const raw = (typeof Game !== 'undefined' && Game && Game.pvpLoadouts) ? Game.pvpLoadouts : null;
            const safe = sanitizePvpLoadouts(raw);
            return (safe && safe[slot]) ? safe[slot] : sanitizePvpLoadouts(null)[slot];
        }

        function pvpHasItem(player, itemId){
            if (!player || !itemId) return false;
            const pid = (player.pid === 2) ? 2 : 1;
            const ld = player._pvpLoadout || getPvpLoadoutByPid(pid);
            return !!(ld && Array.isArray(ld.items) && ld.items.indexOf(itemId) >= 0);
        }

        function pvpGetAmmoByPlayer(player){
            if (!player) return null;
            const pid = (player.pid === 2) ? 2 : 1;
            const ld = player._pvpLoadout || getPvpLoadoutByPid(pid);
            const id = (ld && ld.ammo) ? String(ld.ammo) : '';
            return PVP_AMMO_TYPES[id] || null;
        }

        function getPlayersListSafe(){
            if (typeof Game === 'undefined' || !Game) return [];
            return (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
        }

        function resolveProjectileOwnerPlayer(projectile, playersList){
            const b = projectile || null;
            const list = Array.isArray(playersList) ? playersList : getPlayersListSafe();
            let owner = null;
            if (!b) return owner;
            if (b.ownerPid != null) {
                for (let i = 0; i < list.length; i++) {
                    const p = list[i];
                    if (p && p.pid === b.ownerPid) { owner = p; break; }
                }
            }
            if (!owner && b.ownerPlayer) owner = b.ownerPlayer;
            if (!owner && list.length) owner = list[0];
            return owner;
        }

        function pvpIsSummonTarget(t){
            if (!t) return false;
            if (typeof CloneTank !== 'undefined' && t instanceof CloneTank) return true;
            if (typeof Turret !== 'undefined' && t instanceof Turret) return true;
            return !!(t.ownerPid && !t.pid);
        }

        function pvpIsSummonBullet(b){
            if (!b) return false;
            const src = String(b.skillSource || '').toUpperCase();
            return (src === 'CLONE' || src === 'TURRET');
        }

        function pvpHasShieldLike(target){
            if (!target || !target.buffs) return false;
            const b = target.buffs;
            return !!((b.shield && b.shield.active) || (b.juggerShield && b.juggerShield.active) || (b.siege && b.siege.active));
        }

        function pvpTargetHasSkillDebuff(target){
            if (!target) return false;
            const now = Date.now();
            const e = target.effects || {};
            if (e.stun && e.stun.active && now <= (e.stun.endTime || 0)) return true;
            if (e.slow && e.slow.active && now <= (e.slow.endTime || 0)) return true;
            if (target._pvpWoundedUntil && now < target._pvpWoundedUntil) return true;
            return false;
        }

        function pvpTargetKey(target){
            if (!target) return 'none';
            if (typeof target.pid === 'number') return 'pid_' + target.pid;
            if (!target.__pvpKey) target.__pvpKey = 'obj_' + Math.random().toString(36).slice(2, 9);
            return target.__pvpKey;
        }

        function pvpProcReady(attacker, key, target, icdMs){
            if (!attacker || !key) return false;
            const now = Date.now();
            if (!attacker._pvpProc) attacker._pvpProc = {};
            const k = key + '|' + pvpTargetKey(target);
            const prev = attacker._pvpProc[k] || 0;
            if (now - prev < (icdMs || 0)) return false;
            attacker._pvpProc[k] = now;
            return true;
        }

        function pvpEstimateArmor(target){
            if (!target) return 0;
            let armor = Number(target.innateArmor || 0);
            if (pvpHasItem(target, 'duel_capacitor')) armor += (PVP_ITEM_TYPES.duel_capacitor.armorShift || 0);
            armor = Math.max(0, Math.min(0.75, armor));
            return armor;
        }

        function pvpApplyLoadoutToPlayer(player, pid){
            if (!player) return;
            const slotPid = (pid === 2 || player.pid === 2) ? 2 : 1;
            player._pvpLoadout = getPvpLoadoutByPid(slotPid);
            player._pvpProc = {};
            player._pvpBurst = { windowStart: 0, accum: 0, activeUntil: 0, cooldownUntil: 0 };
            player._pvpCdPenalty = { windowStart: 0, added: 0 };
            player._pvpWoundedUntil = 0;
            player._pvpRevealUntil = 0;
            player._pvpRevealBy = 0;
            player._pvpAntiRevealUntil = 0;
            player._pvpLastSkillCast = 0;
            player._pvpSkillLockUntil = 0;
            player._pvpHardCc = { lastAt: 0 };
            player._pvpDefaultHitCount = 0;
            player._pvpMageMarks = {};
        }

        function pvpApplyCdPenalty(target, ms){
            if (!target || !target.skills) return 0;
            let add = Math.max(0, Number(ms) || 0);
            if (add <= 0) return 0;
            const now = Date.now();
            const firewall = pvpHasItem(target, 'cooldown_firewall') ? PVP_ITEM_TYPES.cooldown_firewall : null;
            if (firewall) add *= (firewall.penaltyMult || 1);

            if (!target._pvpCdPenalty) target._pvpCdPenalty = { windowStart: now, added: 0 };
            const st = target._pvpCdPenalty;
            const win = (firewall && firewall.windowMs) ? firewall.windowMs : 2000;
            if (now - st.windowStart >= win) { st.windowStart = now; st.added = 0; }
            const cap = (firewall && firewall.capMsPerWindow != null) ? firewall.capMsPerWindow : 999999;
            const room = Math.max(0, cap - (st.added || 0));
            add = Math.min(add, room);
            if (add <= 0) return 0;

            ['clone','stealth','vampirism'].forEach((k)=>{
                if (target.skills[k] && typeof target.skills[k].lastUsed === 'number') target.skills[k].lastUsed += add;
            });
            st.added = (st.added || 0) + add;
            return add;
        }

        function pvpApplyReveal(target, ownerPid, baseMs){
            if (!target) return 0;
            const now = Date.now();
            if (target._pvpAntiRevealUntil && now < target._pvpAntiRevealUntil) return 0;
            let dur = Math.max(0, Number(baseMs) || 0);
            if (dur <= 0) return 0;
            if (pvpHasItem(target, 'stealth_scrambler')) {
                dur *= (PVP_ITEM_TYPES.stealth_scrambler.revealDurationMult || 1);
            }
            const until = now + Math.max(1, Math.round(dur));
            target._pvpRevealUntil = Math.max(target._pvpRevealUntil || 0, until);
            target._pvpRevealBy = ownerPid || 0;
            target.isStealth = false;
            if (target.skills && target.skills.stealth) target.skills.stealth.active = false;
            return Math.max(1, Math.round(dur));
        }

        function pvpApplySkillHunterRefund(attacker, ms){
            if (!attacker || !attacker.skills) return 0;
            const now = Date.now();
            const cfg = PVP_ITEM_TYPES.skill_hunter;
            if (attacker._pvpSkillHunterRefundAt && (now - attacker._pvpSkillHunterRefundAt) < (cfg.refundIcdMs || 1500)) return 0;
            const grant = Math.max(0, Number(ms) || 0);
            if (grant <= 0) return 0;
            ['clone','stealth','vampirism'].forEach((k)=>{
                if (attacker.skills[k] && typeof attacker.skills[k].lastUsed === 'number') attacker.skills[k].lastUsed -= grant;
            });
            attacker._pvpSkillHunterRefundAt = now;
            return grant;
        }

        function pvpBulletDamageForTarget(owner, target, bullet, baseDamage){
            let dmg = Number(baseDamage) || 0;
            if (dmg <= 0) return 0;
            const ammo = (bullet && bullet.pvpAmmoId) ? (PVP_AMMO_TYPES[bullet.pvpAmmoId] || null) : null;
            const now = Date.now();

            if (owner && target && pvpHasItem(owner, 'finisher_chip') && target.maxHp > 0 && (target.hp / target.maxHp) < (PVP_ITEM_TYPES.finisher_chip.threshold || 0.35)) {
                dmg *= (PVP_ITEM_TYPES.finisher_chip.damageMult || 1);
            }
            if (owner && target && pvpHasItem(owner, 'skill_hunter') && target._pvpLastSkillCast && (now - target._pvpLastSkillCast) <= (PVP_ITEM_TYPES.skill_hunter.windowMs || 2000)) {
                dmg *= (PVP_ITEM_TYPES.skill_hunter.damageMult || 1);
            }
            if (owner && target && pvpHasItem(owner, 'drone_disruptor') && pvpIsSummonTarget(target)) {
                dmg *= (PVP_ITEM_TYPES.drone_disruptor.damageToSummonMult || 1);
            }
            if (owner && target && owner.systemId === 'engineer' && pvpTargetHasSkillDebuff(target)) {
                dmg *= PVP_PASSIVE_ENGINEER_SKILL_MARK_BONUS;
            }

            if (ammo) {
                if (ammo.id === 'tracer' && target && target._pvpRevealUntil && now < target._pvpRevealUntil && target._pvpRevealBy === (owner ? owner.pid : 0)) {
                    dmg *= (ammo.revealedBonusMult || 1);
                }
                if (ammo.id === 'executioner' && target && target.maxHp > 0 && (target.hp / target.maxHp) < (ammo.executeThreshold || 0.35)) {
                    dmg *= (ammo.executeBonusMult || 1);
                }
                if (ammo.id === 'siegebreak') {
                    if (pvpIsSummonTarget(target)) dmg *= (ammo.summonBonusMult || 1);
                    if (pvpHasShieldLike(target)) dmg *= (ammo.shieldBonusMult || 1);
                }
                if (ammo.id === 'ap40') {
                    const armor = pvpEstimateArmor(target);
                    if (armor < (ammo.lowArmorThreshold || 0.05)) dmg *= (ammo.lowArmorDamageMult || 1);
                }
            }
            return Math.max(1, Math.round(dmg));
        }

        function pvpApplySystemPassivesOnHit(owner, target){
            if (!owner || !target) return;

            // Warrior passive: every 5 bullet hits apply a short slow.
            if (owner.systemId === 'default' && !pvpIsSummonTarget(target)) {
                owner._pvpDefaultHitCount = (owner._pvpDefaultHitCount || 0) + 1;
                if (owner._pvpDefaultHitCount >= PVP_PASSIVE_DEFAULT_HITS_REQ) {
                    owner._pvpDefaultHitCount = 0;
                    if (typeof target.applyEffect === 'function') {
                        target.applyEffect({ type:'SLOW', duration: PVP_PASSIVE_DEFAULT_SLOW_MS, factor: PVP_PASSIVE_DEFAULT_SLOW_FACTOR });
                    }
                    createDamageText(target.x, target.y - 34, 'CHAM', '#90CAF9');
                }
            }

            // Mage passive: apply marks on hit and burst at 4 stacks.
            if (owner.systemId === 'mage' && !pvpIsSummonTarget(target)) {
                if (!owner._pvpMageMarks) owner._pvpMageMarks = {};
                const key = pvpTargetKey(target);
                const next = (owner._pvpMageMarks[key] || 0) + 1;

                if (next >= PVP_PASSIVE_MAGE_STACK_REQ) {
                    owner._pvpMageMarks[key] = 0;
                    const burst = PVP_PASSIVE_MAGE_BURST_DAMAGE;
                    if (typeof target.takeDamage === 'function') {
                        target.takeDamage(burst, { attacker: owner, type: 'PVP_MAGE_BURST' });
                    } else if (typeof target.hp === 'number') {
                        target.hp -= burst;
                        if (target.hp < 0) target.hp = 0;
                    }

                    createComplexExplosion(target.x, target.y, '#4FC3F7', 10);
                    createDamageText(target.x, target.y - 34, 'NO AN', '#4FC3F7');

                    const splash = Math.max(1, Math.round(burst * PVP_PASSIVE_MAGE_BURST_SPLASH_MULT));
                    const radius = PVP_PASSIVE_MAGE_BURST_RADIUS;
                    const ownerPid = owner.pid || 1;
                    const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                    for (let i = 0; i < __plist.length; i++) {
                        const p = __plist[i];
                        if (!p || p === owner || p === target || typeof p.hp !== 'number' || p.hp <= 0) continue;
                        if (p.pid === ownerPid || p.isStealth) continue;
                        if (Math.hypot(p.x - target.x, p.y - target.y) > radius) continue;
                        if (typeof p.takeDamage === 'function') p.takeDamage(splash, { attacker: owner, type: 'PVP_MAGE_BURST' });
                    }

                    if (Game.clones && Game.clones.length) {
                        for (let i = 0; i < Game.clones.length; i++) {
                            const c = Game.clones[i];
                            if (!c || c.markedForDeletion || c === target) continue;
                            if (c.ownerPid && c.ownerPid === ownerPid) continue;
                            if (Math.hypot(c.x - target.x, c.y - target.y) > radius) continue;
                            if (typeof c.takeDamage === 'function') c.takeDamage(splash);
                        }
                    }
                } else {
                    owner._pvpMageMarks[key] = next;
                }
            }
        }

        function pvpApplyBulletOnHit(owner, target, bullet){
            if (!owner || !target || !bullet) return;
            const ammo = (bullet.pvpAmmoId && PVP_AMMO_TYPES[bullet.pvpAmmoId]) ? PVP_AMMO_TYPES[bullet.pvpAmmoId] : null;
            if (!ammo) return;

            if (ammo.id === 'jammer' && target.skills && pvpProcReady(owner, 'jammer', target, ammo.cooldownPenaltyIcdMs || 1800)) {
                const add = pvpApplyCdPenalty(target, ammo.cooldownPenaltyMs || 450);
                if (add > 0) createDamageText(target.x, target.y - 34, '+' + (add / 1000).toFixed(2) + 's CD', '#7FDBFF');
            }
            if (ammo.id === 'tracer') {
                pvpApplyReveal(target, owner.pid || 0, ammo.revealMs || 2000);
            }
            if (ammo.id === 'cryo' && typeof target.applyEffect === 'function' && pvpProcReady(owner, 'cryo', target, ammo.slowIcdMs || 1600)) {
                target.applyEffect({ type:'SLOW', duration: ammo.slowMs || 1200, factor: ammo.slowFactor || 0.78 });
            }
            if (ammo.id === 'executioner') {
                const now = Date.now();
                target._pvpWoundedUntil = Math.max(target._pvpWoundedUntil || 0, now + (ammo.woundMs || 2200));
            }
            if (pvpHasItem(owner, 'skill_hunter') && target._pvpLastSkillCast && (Date.now() - target._pvpLastSkillCast) <= (PVP_ITEM_TYPES.skill_hunter.windowMs || 2000)) {
                pvpApplySkillHunterRefund(owner, PVP_ITEM_TYPES.skill_hunter.refundMs || 350);
            }
            pvpApplySystemPassivesOnHit(owner, target);
        }

        // Phase 3 kickoff: expose PvP config/helpers through App runtime with global aliases.
        try {
            const __app = window.App || (window.App = {});
            const runtimeExports = {
                getPvpAmmoLocale: getPvpAmmoLocale,
                getPvpItemLocale: getPvpItemLocale,
                sanitizePvpLoadouts: sanitizePvpLoadouts,
                getPvpLoadoutByPid: getPvpLoadoutByPid,
                pvpHasItem: pvpHasItem,
                pvpGetAmmoByPlayer: pvpGetAmmoByPlayer,
                pvpApplyLoadoutToPlayer: pvpApplyLoadoutToPlayer,
                pvpApplyCdPenalty: pvpApplyCdPenalty,
                pvpApplyReveal: pvpApplyReveal,
                pvpApplySkillHunterRefund: pvpApplySkillHunterRefund,
                pvpBulletDamageForTarget: pvpBulletDamageForTarget,
                pvpApplySystemPassivesOnHit: pvpApplySystemPassivesOnHit,
                pvpApplyBulletOnHit: pvpApplyBulletOnHit
            };
            const configExports = {
                pvpAmmoTypes: PVP_AMMO_TYPES,
                pvpItemTypes: PVP_ITEM_TYPES,
                pvpDefaultLoadout: PVP_DEFAULT_LOADOUT,
                pvpLoadoutStorageKey: PVP_LOADOUT_STORAGE_KEY,
                pvpTuning: __pvpTuningData
            };
            const pvpRule = Object.freeze({
                ammoTypes: PVP_AMMO_TYPES,
                itemTypes: PVP_ITEM_TYPES,
                defaultLoadout: PVP_DEFAULT_LOADOUT,
                loadoutStorageKey: PVP_LOADOUT_STORAGE_KEY,
                tuning: __pvpTuningData
            });
            const globalExports = {
                getPvpAmmoLocale: getPvpAmmoLocale,
                getPvpItemLocale: getPvpItemLocale,
                sanitizePvpLoadouts: sanitizePvpLoadouts,
                getPvpLoadoutByPid: getPvpLoadoutByPid,
                pvpHasItem: pvpHasItem,
                pvpGetAmmoByPlayer: pvpGetAmmoByPlayer,
                pvpApplyLoadoutToPlayer: pvpApplyLoadoutToPlayer,
                pvpBulletDamageForTarget: pvpBulletDamageForTarget,
                pvpApplyBulletOnHit: pvpApplyBulletOnHit
            };

            if (__app.compat && typeof __app.compat.expose === 'function') {
                __app.compat.expose({
                    runtime: runtimeExports,
                    config: configExports,
                    rules: { pvp: pvpRule },
                    globals: globalExports
                });
            } else {
                __app.runtime = __app.runtime || {};
                __app.config = __app.config || {};
                __app.rules = __app.rules || {};
                Object.keys(runtimeExports).forEach((k) => { __app.runtime[k] = runtimeExports[k]; });
                Object.keys(configExports).forEach((k) => { __app.config[k] = configExports[k]; });
                __app.rules.pvp = pvpRule;
                Object.keys(globalExports).forEach((k) => { window[k] = globalExports[k]; });
            }
        } catch (e) {}



