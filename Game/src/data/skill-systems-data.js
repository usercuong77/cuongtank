// === Skill Systems Data (config-only) ===
(() => {
    const root = window;
    const app = root.App || (root.App = {});
    app.data = app.data || {};

    const defaultCooldowns = (typeof SKILL_CONFIG !== 'undefined' && SKILL_CONFIG)
        ? SKILL_CONFIG
        : {
            CLONE: { cooldown: 9000, duration: 12000 },
            STEALTH: { cooldown: 20000, duration: 3000 },
            VAMPIRISM: { cooldown: 25000, duration: 8000 }
        };

    const tankSystems = {
        default: {
            id: 'default',
            name: 'Hệ Chiến Binh',
            skills: {
                clone:     { key: 'Q', labelHTML: 'Phân<br>Thân', color: '#29B6F6', cooldown: defaultCooldowns.CLONE.cooldown, duration: defaultCooldowns.CLONE.duration },
                stealth:   { key: 'E', labelHTML: 'Tàng<br>Hình', color: '#AB47BC', cooldown: defaultCooldowns.STEALTH.cooldown, duration: defaultCooldowns.STEALTH.duration },
                vampirism: { key: 'R', labelHTML: 'Hút<br>Máu',   color: '#FF5252', cooldown: defaultCooldowns.VAMPIRISM.cooldown, duration: defaultCooldowns.VAMPIRISM.duration }
            }
        },
        speed: {
            id: 'speed',
            name: 'Hệ Tốc Độ',
            skills: {
                clone:     { key: 'Q', labelHTML: 'Lướt',               color: '#4FC3F7', cooldown: 3000,  duration: 250, dashSpeedMult: 3.2 },
                stealth:   { key: 'E', labelHTML: 'Miễn<br>Thương',     color: '#81D4FA', cooldown: 10000, duration: 1000 },
                vampirism: { key: 'R', labelHTML: 'Cường<br>Tốc',       color: '#29B6F6', cooldown: 14000, duration: 4000, speedMult: 1.25, fireMult: 0.5, damageMult: 1.3 }
            }
        },
        engineer: {
            id: 'engineer',
            name: 'Hệ Kỹ Sư',
            skills: {
                clone:     { key: 'Q', labelHTML: 'Tháp<br>Pháo',       color: '#81C784', cooldown: 12000, duration: 10000, maxTurrets: 1, range: 650, fireRate: 320, bulletColor: '#66BB6A', bulletDmgMult: 0.65 },
                stealth:   { key: 'E', labelHTML: 'Sửa<br>Chữa',        color: '#A5D6A7', cooldown: 16000, healPct: 0.3 },
                vampirism: { key: 'R', labelHTML: 'Xung<br>EMP',        color: '#00E5FF', cooldown: 18000, radius: 1020, stunDuration: 2400 }
            }
        },
        juggernaut: {
            id: 'juggernaut',
            name: 'Hệ Giáp Sắt',
            skills: {
                clone:     { key: 'Q', labelHTML: 'Giáp<br>Phản',       color: '#FFD54F', cooldown: 12000, duration: 5000, castText: 'J0: GIÁP PHẢN LỰC' },
                stealth:   { key: 'E', labelHTML: 'Cú<br>Húc',          color: '#FFCA28', cooldown: 8000, duration: 400, ramSpeedMult: 3.0, impactBase: 60, impactPerWave: 3, knockback: 95, castText: 'J0: CÚ HÚC' },
                vampirism: { key: 'R', labelHTML: 'Pháo<br>Đài',        color: '#FFC107', cooldown: 25000, duration: 6000, castText: 'J0: PHÁO ĐÀI' }
            }
        },
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
            name: 'Sát Thủ',
            skills: {
                clone:     { key: 'Q', labelHTML: 'Ám<br>Kích',      color: '#EF5350', cooldown: 5500, duration: 800 },
                stealth:   { key: 'E', labelHTML: 'Liên<br>Hoàn',    color: '#B0BEC5', cooldown: 11500, duration: 2000 },
                vampirism: { key: 'R', labelHTML: 'Thập<br>Ảnh',     color: '#FF7043', cooldown: 19000, duration: 3500 }
            }
        }
    };

    const assassinPvpSkillCooldowns = { clone: 6100, stealth: 12500, vampirism: 21000 };
    const systemSkillLabelHtmlEn = {
        default:    { clone: 'Clone',            stealth: 'Stealth',        vampirism: 'Lifesteal' },
        speed:      { clone: 'Dash',             stealth: 'Phase',          vampirism: 'Adrenaline' },
        engineer:   { clone: 'Turret',           stealth: 'Repair',         vampirism: 'EMP Pulse' },
        juggernaut: { clone: 'Reflect<br>Armor', stealth: 'Ram',            vampirism: 'Siege' },
        mage:       { clone: 'Fireball',         stealth: 'Blink',          vampirism: 'Blizzard' },
        assassin:   { clone: 'Ambush',           stealth: 'Chain<br>Slash', vampirism: 'Shadow<br>Barrage' }
    };

    app.data.skillSystems = {
        tankSystems: tankSystems,
        assassinPvpSkillCooldowns: assassinPvpSkillCooldowns,
        systemSkillLabelHtmlEn: systemSkillLabelHtmlEn
    };
})();
