// === Tank Systems + Skill Framework === // Hệ xe + khung kỹ năng
        // Keep internal keys clone/stealth/vampirism for fixed Q/E/R slots to preserve existing HUD wiring.
        const TANK_SYSTEMS = {
            default: {
                id: 'default',
                name: 'Hệ Chiến Binh',
                skills: {
                    clone:     { key: 'Q', labelHTML: 'Phân<br>Thân',   color: '#29B6F6', cooldown: SKILL_CONFIG.CLONE.cooldown,     duration: SKILL_CONFIG.CLONE.duration },
                    stealth:   { key: 'E', labelHTML: 'Tàng<br>Hình',   color: '#AB47BC', cooldown: SKILL_CONFIG.STEALTH.cooldown,   duration: SKILL_CONFIG.STEALTH.duration },
                    vampirism: { key: 'R', labelHTML: 'Hút<br>Máu',     color: '#FF5252', cooldown: SKILL_CONFIG.VAMPIRISM.cooldown, duration: SKILL_CONFIG.VAMPIRISM.duration }
                }
            },
            speed: {
                id: 'speed',
                name: 'Hệ Tốc Độ',
                skills: {
                    // Q: Dash
                    clone:     { key: 'Q', labelHTML: 'Lướt',          color: '#4FC3F7', cooldown: 3000,  duration: 250, dashSpeedMult: 3.2 },
                    stealth:   { key: 'E', labelHTML: 'Miễn<br>Thương',         color: '#81D4FA', cooldown: 10000, duration: 1000 },
                    // R: Adrenaline (buff)
                    vampirism: { key: 'R', labelHTML: 'Cường<br>Tốc',         color: '#29B6F6', cooldown: 14000, duration: 4000, speedMult: 1.25, fireMult: 0.5, damageMult: 1.3 }
                }
            },
            engineer: {
                id: 'engineer',
                name: 'Hệ Kỹ Sư',
                skills: {
                    clone:     { key: 'Q', labelHTML: 'Tháp<br>Pháo',        color: '#81C784', cooldown: 12000, duration: 10000, maxTurrets: 1, range: 650, fireRate: 320, bulletColor: '#66BB6A', bulletDmgMult: 0.65 },
                    stealth:   { key: 'E', labelHTML: 'Sửa<br>Chữa',        color: '#A5D6A7', cooldown: 16000, healPct: 0.3 },
                    vampirism: { key: 'R', labelHTML: 'Xung<br>EMP',           color: '#00E5FF', cooldown: 18000, radius: 1020, stunDuration: 2400 }
                }
            },
            juggernaut: {
                id: 'juggernaut',
                name: 'Hệ Giáp Sắt',
                skills: {
                    // Q: Reflect Armor
                    clone:     { key: 'Q', labelHTML: 'Giáp<br>Phản', color: '#FFD54F', cooldown: 12000, duration: 5000, castText: 'J0: GIÁP PHẢN LỰC' },
                    // E: Ram
                    stealth:   { key: 'E', labelHTML: 'Cú<br>Húc',   color: '#FFCA28', cooldown: 8000,  duration: 400, ramSpeedMult: 3.0, impactBase: 60, impactPerWave: 3, knockback: 95, castText: 'J0: CÚ HÚC' },
                    // R: Siege Mode
                    vampirism: { key: 'R', labelHTML: 'Pháo<br>Đài', color: '#FFC107', cooldown: 25000, duration: 6000, castText: 'J0: PHÁO ĐÀI' }
                }
            }

        
            ,

            mage: {
                id: 'mage',
                name: 'Pháp Sư',
                color: '#7B1FA2',
                skills: {
                    clone: {
                        key: 'Q',
                        labelHTML: 'Hỏa<br>Cầu',
                        color: '#FF5722',
                        cooldown: 2000,
                        fireballBase: 60,
                        fireballDmgMult: 3.2,
                        fireballRadius: 36,
                        fireballSpeed: 4,
                        explosionRadius: 320,
                        splashFactor: 0.85,
                        castText: 'Q: HỎA CẦU'
                    },
                    stealth: {
                        key: 'E',
                        labelHTML: 'Dịch<br>Chuyển',
                        color: '#E040FB',
                        cooldown: 5500,
                        castText: 'E: DỊCH CHUYỂN'
                    },
                    vampirism: {
                        key: 'R',
                        labelHTML: 'Bão<br>Tuyết',
                        color: '#00E5FF',
                        cooldown: 16000,
                        duration: 5500,
                        radius: 220,
                        innerRadius: 70,
                        moveSpeed: 220,
                        tickInterval: 400,
                        tickDamage: 28,
                        slowFactor: 0.5,
                        slowDuration: 900,
                        castText: 'R: BÃO TUYẾT'
                    }
                }
            },

            assassin: {
                id: 'assassin',
                name: 'S\u00e1t Th\u1ee7',
                skills: {
                    clone:     { key: 'Q', labelHTML: '\u00c1m<br>K\u00edch', color: '#EF5350', cooldown: 5500, duration: 800 },
                    stealth:   { key: 'E', labelHTML: 'Li\u00ean<br>Ho\u00e0n',  color: '#B0BEC5', cooldown: 11500, duration: 2000 },
                    vampirism: { key: 'R', labelHTML: 'Th\u1eadp<br>\u1ea2nh', color: '#FF7043', cooldown: 19000, duration: 3500 }
                }
            }
        };

        function getTankSystem(id) {
            return TANK_SYSTEMS[id] || TANK_SYSTEMS.default;
        }

        const ASSASSIN_PVP_SKILL_COOLDOWNS = { clone: 6100, stealth: 12500, vampirism: 21000 };
        const SYSTEM_SKILL_LABEL_HTML_EN = {
            default:    { clone: 'Clone',            stealth: 'Stealth',        vampirism: 'Lifesteal' },
            speed:      { clone: 'Dash',             stealth: 'Phase',          vampirism: 'Adrenaline' },
            engineer:   { clone: 'Turret',           stealth: 'Repair',         vampirism: 'EMP Pulse' },
            juggernaut: { clone: 'Reflect<br>Armor', stealth: 'Ram',            vampirism: 'Siege' },
            mage:       { clone: 'Fireball',         stealth: 'Blink',          vampirism: 'Blizzard' },
            assassin:   { clone: 'Ambush',           stealth: 'Chain<br>Slash', vampirism: 'Shadow<br>Barrage' }
        };

        function getLocalizedSkillLabelHTML(systemId, skillKey){
            try {
                const lang = (window.I18N && typeof window.I18N.lang === 'function') ? window.I18N.lang() : 'vi';
                if (lang !== 'en') return null;
            } catch(e){ return null; }
            const bySys = SYSTEM_SKILL_LABEL_HTML_EN[systemId] || SYSTEM_SKILL_LABEL_HTML_EN.default;
            return (bySys && bySys[skillKey]) ? bySys[skillKey] : null;
        }

        function getSystemSkillDef(systemId, skillKey) {
            const sys = getTankSystem(systemId);
            const base = (sys && sys.skills && sys.skills[skillKey]) ? sys.skills[skillKey] : getTankSystem('default').skills[skillKey];
            if (!base) return base;

            let out = base;
            if (systemId === 'assassin' && typeof Game !== 'undefined' && Game && Game.mode === 'PVP_DUEL_AIM') {
                const cd = ASSASSIN_PVP_SKILL_COOLDOWNS[skillKey];
                if (typeof cd === 'number') out = Object.assign({}, out, { cooldown: cd });
            }
            const localizedLabelHTML = getLocalizedSkillLabelHTML(systemId, skillKey);
            if (localizedLabelHTML) out = Object.assign({}, out, { labelHTML: localizedLabelHTML });
            return out;
        }

        function getSystemSkillCooldowns(systemId){
            const sid = systemId || 'default';
            return {
                clone: (getSystemSkillDef(sid, 'clone') || {}).cooldown || 0,
                stealth: (getSystemSkillDef(sid, 'stealth') || {}).cooldown || 0,
                vampirism: (getSystemSkillDef(sid, 'vampirism') || {}).cooldown || 0
            };
        }

        // Phase 3 kickoff: expose skill resolvers via App/runtime with global aliases.
        try {
            const __app = window.App || (window.App = {});
            __app.runtime = __app.runtime || {};
            __app.rules = __app.rules || {};
            __app.runtime.getTankSystem = getTankSystem;
            __app.runtime.getSystemSkillDef = getSystemSkillDef;
            __app.runtime.getSystemSkillCooldowns = getSystemSkillCooldowns;
            __app.rules.systems = TANK_SYSTEMS;
            __app.rules.systemSkillLabelEn = SYSTEM_SKILL_LABEL_HTML_EN;
            window.getTankSystem = getTankSystem;
            window.getSystemSkillDef = getSystemSkillDef;
            window.getSystemSkillCooldowns = getSystemSkillCooldowns;
        } catch (e) {}

