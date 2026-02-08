const PVP_AIM_LEAD_MAX_MS = PVP_CONFIG.aimLeadMaxMs;
        const PVP_AIM_LEAD_FACTOR = PVP_CONFIG.aimLeadFactor;
        const PVP_AIM_MAX_TURN = PVP_CONFIG.aimMaxTurn;
        const EASY_AUTO_AIM_LEAD_BLEND = PVP_CONFIG.easyAutoAimLeadBlend; // Easy: 55% predictive lead.
        const COOP_AUTO_AIM_LEAD_BLEND = PVP_CONFIG.coopAutoAimLeadBlend; // 2P Bot: 30% predictive lead.
        const AUTO_AIM_LEAD_MAX_MS = PVP_CONFIG.autoAimLeadMaxMs;
        const PVP_SKILL_DAMAGE_MULT = PVP_CONFIG.skillDamageMult;
        const PVP_HARD_CC_CAP_MS = PVP_CONFIG.hardCcCapMs;
        const PVP_HARD_CC_DR_WINDOW_MS = PVP_CONFIG.hardCcDrWindowMs;
        const PVP_HARD_CC_DR_MULT = PVP_CONFIG.hardCcDrMult;
        const PVP_SKILL_GLOBAL_LOCKOUT_MS = PVP_CONFIG.skillGlobalLockoutMs;
        const PVP_PASSIVE_DEFAULT_HITS_REQ = PVP_CONFIG.passive.defaultHitsReq;
        const PVP_PASSIVE_DEFAULT_SLOW_MS = PVP_CONFIG.passive.defaultSlowMs;
        const PVP_PASSIVE_DEFAULT_SLOW_FACTOR = PVP_CONFIG.passive.defaultSlowFactor;
        const PVP_PASSIVE_ENGINEER_SKILL_MARK_BONUS = PVP_CONFIG.passive.engineerSkillMarkBonus;
        const PVP_PASSIVE_MAGE_STACK_REQ = PVP_CONFIG.passive.mageStackReq;
        const PVP_PASSIVE_MAGE_BURST_DAMAGE = PVP_CONFIG.passive.mageBurstDamage;
        const PVP_PASSIVE_MAGE_BURST_RADIUS = PVP_CONFIG.passive.mageBurstRadius;
        const PVP_PASSIVE_MAGE_BURST_SPLASH_MULT = PVP_CONFIG.passive.mageBurstSplashMult;

        const PVP_LOADOUT_STORAGE_KEY = PVP_CONFIG.loadoutStorageKey;
        const PVP_AMMO_TYPES = {
            ap40: {
                id:'ap40',
                label:'\u0110\u1ea1n Xuy\u00ean Gi\u00e1p AP-40',
                desc:'T\u1eadp trung ph\u00e1 gi\u00e1p v\u00e0 \u0111\u1ed5i s\u00e1t th\u01b0\u01a1ng.',
                stats:[
                    '+10% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    '+40% b\u1ecf qua gi\u00e1p m\u1ee5c ti\u00eau',
                    '-5% s\u00e1t th\u01b0\u01a1ng n\u1ebfu gi\u00e1p m\u1ee5c ti\u00eau < 5%',
                    '+8% th\u1eddi gian h\u1ed3i gi\u1eefa 2 ph\u00e1t b\u1eafn'
                ],
                damageMult:1.10, cooldownMult:1.08, armorIgnore:0.40, lowArmorDamageMult:0.95, lowArmorThreshold:0.05
            },
            jammer: {
                id:'jammer',
                label:'\u0110\u1ea1n Ph\u00e1 Nh\u1ecbp Null',
                desc:'Kh\u1eafc ch\u1ebf \u0111\u1ed1i th\u1ee7 ph\u1ee5 thu\u1ed9c k\u1ef9 n\u0103ng.',
                stats:[
                    '-14% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    'M\u1ed7i 2.0s, hit s\u1ebd c\u1ed9ng +0.38s h\u1ed3i chi\u00eau Q/E/R c\u1ee7a \u0111\u1ed1i th\u1ee7'
                ],
                damageMult:0.88, cooldownPenaltyMs:380, cooldownPenaltyIcdMs:2000
            },
            tracer: {
                id:'tracer',
                label:'\u0110\u1ea1n \u0110\u00e1nh D\u1ea5u Tracer',
                desc:'L\u1ed9 v\u1ecb tr\u00ed v\u00e0 truy s\u00e1t m\u1ee5c ti\u00eau \u0111\u00e3 \u0111\u00e1nh d\u1ea5u.',
                stats:[
                    '-8% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    'Hit s\u1ebd \u0111\u00e1nh d\u1ea5u 1.5s, l\u1ed9 v\u1ecb tr\u00ed m\u1ee5c ti\u00eau',
                    '+5% s\u00e1t th\u01b0\u01a1ng l\u00ean m\u1ee5c ti\u00eau \u0111ang b\u1ecb \u0111\u00e1nh d\u1ea5u'
                ],
                damageMult:0.93, revealMs:1500, revealedBonusMult:1.05
            },
            cryo: {
                id:'cryo',
                label:'\u0110\u1ea1n L\u00e0m Ch\u1eadm Cryo',
                desc:'C\u00e2u r\u1ec9a, d\u1ec5 b\u1eaft b\u00e0i v\u00e0 gi\u1eef kho\u1ea3ng c\u00e1ch.',
                stats:[
                    '-10% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    'M\u1ed7i 1.6s, hit g\u00e2y l\u00e0m ch\u1eadm 22% trong 1.2s'
                ],
                damageMult:0.90, slowFactor:0.78, slowMs:1200, slowIcdMs:1600
            },
            siegebreak: {
                id:'siegebreak',
                label:'\u0110\u1ea1n Ph\u00e1 Tri\u1ec3n Khai',
                desc:'C\u1ef1c m\u1ea1nh \u0111\u1ec3 tri\u1ec7t clone/turret v\u00e0 l\u00e1 ch\u1eafn.',
                stats:[
                    '-5% s\u00e1t th\u01b0\u01a1ng c\u01a1 b\u1ea3n',
                    '+40% s\u00e1t th\u01b0\u01a1ng l\u00ean clone/turret',
                    '+18% s\u00e1t th\u01b0\u01a1ng l\u00ean m\u1ee5c ti\u00eau \u0111ang c\u00f3 l\u00e1 ch\u1eafn'
                ],
                damageMult:0.95, summonBonusMult:1.40, shieldBonusMult:1.18
            },
            executioner: {
                id:'executioner',
                label:'\u0110\u1ea1n K\u1ebft Li\u1ec5u',
                desc:'\u0110\u00f2n k\u1ebft li\u1ec5u v\u00e0 c\u1eaft h\u1ed3i ph\u1ee5c \u0111\u1ed1i th\u1ee7.',
                stats:[
                    '-8% s\u00e1t th\u01b0\u01a1ng c\u01a1 b\u1ea3n',
                    'M\u1ee5c ti\u00eau d\u01b0\u1edbi 35% m\u00e1u: +22% s\u00e1t th\u01b0\u01a1ng',
                    'G\u00e2y V\u1ebft Th\u01b0\u01a1ng 2.2s: h\u1ed3i m\u00e1u ch\u1ec9 c\u00f2n 55%'
                ],
                damageMult:0.92, executeThreshold:0.35, executeBonusMult:1.22, woundMs:2200, woundHealFactor:0.55
            }
        };

        const PVP_ITEM_TYPES = {
            composite_armor: {
                id:'composite_armor',
                label:'Gi\u00e1p T\u1ed5ng H\u1ee3p',
                desc:'T\u0103ng \u0111\u1ed9 c\u1ee9ng c\u00e1p \u0111\u1ed5i l\u1ea1i m\u1ed9t ch\u00fat c\u01a1 \u0111\u1ed9ng.',
                stats:[
                    '-9% s\u00e1t th\u01b0\u01a1ng nh\u1eadn v\u00e0o',
                    '-4% t\u1ed1c \u0111\u1ed9 di chuy\u1ec3n'
                ],
                damageTakenMult:0.91, speedMult:0.96
            },
            burst_dampener: {
                id:'burst_dampener',
                label:'Gi\u1ea3m Ch\u1ea5n Burst',
                desc:'Ch\u1ed1ng s\u1ed1c s\u00e1t th\u01b0\u01a1ng trong giao tranh ng\u1eafn.',
                stats:[
                    'Nh\u1eadn >=14% m\u00e1u trong 0.8s s\u1ebd k\u00edch ho\u1ea1t',
                    'Khi k\u00edch ho\u1ea1t: -30% s\u00e1t th\u01b0\u01a1ng trong 1.4s',
                    'H\u1ed3i n\u1ed9i t\u1ea1i: 16s'
                ],
                triggerPct:0.14, windowMs:800, activeMult:0.70, activeMs:1400, cooldownMs:16000
            },
            anti_pierce_liner: {
                id:'anti_pierce_liner',
                label:'L\u00f3t Ch\u1ed1ng Xuy\u00ean',
                desc:'Kh\u1eafc ch\u1ebf AP v\u00e0 c\u00e1c b\u00e0i \u0111\u00e1nh xuy\u00ean gi\u00e1p.',
                stats:[
                    'Gi\u1ea3m 60% hi\u1ec7u l\u1ef1c xuy\u00ean gi\u00e1p c\u1ee7a AP-40',
                    '\u0110\u1ea3m b\u1ea3o t\u1ed1i thi\u1ec3u 4% gi\u00e1p sau khi b\u1ecb xuy\u00ean'
                ],
                reduceArmorIgnoreBy:0.60, minArmor:0.04
            },
            cooldown_firewall: {
                id:'cooldown_firewall',
                label:'T\u01b0\u1eddng L\u1eeda H\u1ed3i Chi\u00eau',
                desc:'H\u1ea1n ch\u1ebf b\u1ecb c\u1ed9ng th\u00eam h\u1ed3i chi\u00eau t\u1eeb \u0111\u1ea1n kh\u1eafc ch\u1ebf.',
                stats:[
                    'Gi\u1ea3m 55% hi\u1ec7u l\u1ef1c t\u0103ng h\u1ed3i chi\u00eau nh\u1eadn v\u00e0o',
                    'Tr\u1ea7n +0.5s c\u1ed9ng th\u00eam m\u1ed7i c\u1eeda s\u1ed5 2s'
                ],
                penaltyMult:0.45, capMsPerWindow:500, windowMs:2000
            },
            stealth_scrambler: {
                id:'stealth_scrambler',
                label:'B\u1ed9 Ph\u00e1 T\u00e0ng H\u00ecnh',
                desc:'H\u1ed7 tr\u1ee3 \u0111\u1ea5u tr\u00ed v\u1edbi c\u00e1c b\u00e0i l\u1ed9 v\u1ecb tr\u00ed.',
                stats:[
                    'Gi\u1ea3m 45% th\u1eddi gian b\u1ecb l\u1ed9 v\u1ecb tr\u00ed',
                    'Sau blink/t\u00e0ng h\u00ecnh: mi\u1ec5n l\u1ed9 v\u1ecb tr\u00ed 0.8s'
                ],
                revealDurationMult:0.55, antiRevealAfterBlinkMs:800
            },
            drone_disruptor: {
                id:'drone_disruptor',
                label:'Nhi\u1ec5u Drone',
                desc:'\u0110\u00e1nh v\u00e0o b\u00e0i clone/turret r\u1ea5t hi\u1ec7u qu\u1ea3.',
                stats:[
                    '-35% s\u00e1t th\u01b0\u01a1ng nh\u1eadn t\u1eeb clone/turret',
                    '+20% s\u00e1t th\u01b0\u01a1ng g\u00e2y l\u00ean clone/turret'
                ],
                damageTakenFromSummonMult:0.65, damageToSummonMult:1.20
            },
            duel_capacitor: {
                id:'duel_capacitor',
                label:'T\u1ee5 \u0110i\u1ec7n \u0110\u1ea5u Tay',
                desc:'T\u0103ng s\u00e1t th\u01b0\u01a1ng to\u00e0n tr\u1eadn, \u0111\u00e1nh \u0111\u1ed5i gi\u00e1p n\u1ec1n.',
                stats:[
                    '+10% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    '-8% th\u1eddi gian h\u1ed3i gi\u1eefa 2 ph\u00e1t',
                    '-6% gi\u00e1p c\u01a1 b\u1ea3n'
                ],
                bulletDamageMult:1.10, fireCooldownMult:0.92, armorShift:-0.06
            },
            finisher_chip: {
                id:'finisher_chip',
                label:'Chip K\u1ebft Li\u1ec5u',
                desc:'Ch\u1ed1t h\u1ea1 m\u1ee5c ti\u00eau th\u1ea5p m\u00e1u nhanh h\u01a1n.',
                stats:[
                    'M\u1ee5c ti\u00eau d\u01b0\u1edbi 35% m\u00e1u: +18% s\u00e1t th\u01b0\u01a1ng'
                ],
                threshold:0.35, damageMult:1.18
            },
            skill_hunter: {
                id:'skill_hunter',
                label:'S\u0103n K\u1ef9 N\u0103ng',
                desc:'Tr\u1eebng ph\u1ea1t \u0111\u1ed1i th\u1ee7 v\u1eeba d\u00f9ng k\u1ef9 n\u0103ng.',
                stats:[
                    'Trong 1.6s sau khi \u0111\u1ed1i th\u1ee7 d\u00f9ng skill: +9% s\u00e1t th\u01b0\u01a1ng',
                    'Hit \u0111\u00fang c\u1eeda s\u1ed5 n\u00e0y: gi\u1ea3m 0.25s h\u1ed3i chi\u00eau Q/E/R',
                    'H\u1ed3i n\u1ed9i t\u1ea1i refund: 2.2s'
                ],
                windowMs:1600, damageMult:1.09, refundMs:250, refundIcdMs:2200
            }
        };

        const PVP_AMMO_EN_TEXT = {
            ap40: {
                label: 'AP-40 Armor Piercing',
                desc: 'Built to break armor and force damage trades.',
                stats: ['+10% bullet damage', '+40% armor ignore', '-5% damage if target armor < 5%', '+8% shot cooldown']
            },
            jammer: {
                label: 'Null Jammer Rounds',
                desc: 'Counters skill-reliant opponents.',
                stats: ['-14% bullet damage', 'Every 2.0s, hit adds +0.38s cooldown to enemy Q/E/R']
            },
            tracer: {
                label: 'Tracer Mark Rounds',
                desc: 'Reveal and chase marked targets.',
                stats: ['-8% bullet damage', 'Hit marks target for 1.5s and reveals position', '+5% damage to marked targets']
            },
            cryo: {
                label: 'Cryo Slow Rounds',
                desc: 'Kite-and-control pressure ammo.',
                stats: ['-10% bullet damage', 'Every 1.6s, hit applies 22% slow for 1.2s']
            },
            siegebreak: {
                label: 'Siegebreak Rounds',
                desc: 'Great versus clone/turret/shield setups.',
                stats: ['-5% base damage', '+40% damage to clone/turret', '+18% damage to shielded targets']
            },
            executioner: {
                label: 'Executioner Rounds',
                desc: 'Execute low-HP targets and cut healing.',
                stats: ['-8% base damage', 'Targets under 35% HP: +22% damage', 'Applies Wound 2.2s: healing reduced to 55%']
            }
        };

        const PVP_ITEM_EN_TEXT = {
            composite_armor: {
                label: 'Composite Armor',
                desc: 'More toughness at slight mobility cost.',
                stats: ['-9% damage taken', '-4% move speed']
            },
            burst_dampener: {
                label: 'Burst Dampener',
                desc: 'Reduces burst damage spikes.',
                stats: ['Triggers on >=14% HP loss in 0.8s', 'When active: -30% damage taken for 1.4s', 'Internal cooldown: 16s']
            },
            anti_pierce_liner: {
                label: 'Anti-Pierce Liner',
                desc: 'Counter AP and armor-piercing builds.',
                stats: ['Reduce AP-40 armor ignore effect by 60%', 'Guarantee at least 4% armor after pierce']
            },
            cooldown_firewall: {
                label: 'Cooldown Firewall',
                desc: 'Mitigates added cooldown penalties.',
                stats: ['-55% incoming cooldown penalty effectiveness', 'Cap +0.5s extra penalty per 2s window']
            },
            stealth_scrambler: {
                label: 'Stealth Scrambler',
                desc: 'Counter reveal and tracking play.',
                stats: ['-45% reveal duration taken', 'After blink/stealth: anti-reveal for 0.8s']
            },
            drone_disruptor: {
                label: 'Drone Disruptor',
                desc: 'Efficient against clone/turret comps.',
                stats: ['-35% damage taken from clone/turret', '+20% damage dealt to clone/turret']
            },
            duel_capacitor: {
                label: 'Duel Capacitor',
                desc: 'Higher duel pressure with armor tradeoff.',
                stats: ['+10% bullet damage', '-8% fire cooldown', '-6% base armor']
            },
            finisher_chip: {
                label: 'Finisher Chip',
                desc: 'Faster closeout on low-HP targets.',
                stats: ['Targets under 35% HP: +18% damage']
            },
            skill_hunter: {
                label: 'Skill Hunter',
                desc: 'Punish enemies right after skill casts.',
                stats: ['Within 1.6s after enemy skill cast: +9% damage', 'Hit in window: refund 0.25s Q/E/R cooldown', 'Refund ICD: 2.2s']
            }
        };

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

        const PVP_DEFAULT_LOADOUT = {
            p1: { ammo: 'ap40', items: ['composite_armor', 'cooldown_firewall', 'stealth_scrambler'] },
            p2: { ammo: 'jammer', items: ['burst_dampener', 'anti_pierce_liner', 'skill_hunter'] }
        };

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
            __app.runtime = __app.runtime || {};
            __app.config = __app.config || {};
            __app.rules = __app.rules || {};
            __app.runtime.getPvpAmmoLocale = getPvpAmmoLocale;
            __app.runtime.getPvpItemLocale = getPvpItemLocale;
            __app.runtime.sanitizePvpLoadouts = sanitizePvpLoadouts;
            __app.runtime.getPvpLoadoutByPid = getPvpLoadoutByPid;
            __app.runtime.pvpHasItem = pvpHasItem;
            __app.runtime.pvpGetAmmoByPlayer = pvpGetAmmoByPlayer;
            __app.runtime.pvpApplyLoadoutToPlayer = pvpApplyLoadoutToPlayer;
            __app.runtime.pvpApplyCdPenalty = pvpApplyCdPenalty;
            __app.runtime.pvpApplyReveal = pvpApplyReveal;
            __app.runtime.pvpApplySkillHunterRefund = pvpApplySkillHunterRefund;
            __app.runtime.pvpBulletDamageForTarget = pvpBulletDamageForTarget;
            __app.runtime.pvpApplySystemPassivesOnHit = pvpApplySystemPassivesOnHit;
            __app.runtime.pvpApplyBulletOnHit = pvpApplyBulletOnHit;
            __app.config.pvpAmmoTypes = PVP_AMMO_TYPES;
            __app.config.pvpItemTypes = PVP_ITEM_TYPES;
            __app.config.pvpDefaultLoadout = PVP_DEFAULT_LOADOUT;
            __app.config.pvpLoadoutStorageKey = PVP_LOADOUT_STORAGE_KEY;
            __app.rules.pvp = Object.freeze({
                ammoTypes: PVP_AMMO_TYPES,
                itemTypes: PVP_ITEM_TYPES,
                defaultLoadout: PVP_DEFAULT_LOADOUT,
                loadoutStorageKey: PVP_LOADOUT_STORAGE_KEY
            });

            window.getPvpAmmoLocale = getPvpAmmoLocale;
            window.getPvpItemLocale = getPvpItemLocale;
            window.sanitizePvpLoadouts = sanitizePvpLoadouts;
            window.getPvpLoadoutByPid = getPvpLoadoutByPid;
            window.pvpHasItem = pvpHasItem;
            window.pvpGetAmmoByPlayer = pvpGetAmmoByPlayer;
            window.pvpApplyLoadoutToPlayer = pvpApplyLoadoutToPlayer;
            window.pvpBulletDamageForTarget = pvpBulletDamageForTarget;
            window.pvpApplyBulletOnHit = pvpApplyBulletOnHit;
        } catch (e) {}

