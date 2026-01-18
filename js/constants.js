// Auto-extracted from original HTML (tank_release_v32_shop_speed_lv0_ui_btnfix.html)
// NOTE: Keep names/logic identical to original.

export let WORLD_WIDTH = window.innerWidth * 3;
export let WORLD_HEIGHT = window.innerHeight * 3;
export const MINIMAP_SIZE = 150;
export const MINIMAP_MARGIN = 20;

export const COLORS = {
    player: '#4CAF50',
    playerTurret: '#2E7D32',
    clone: '#29B6F6', 
    cloneTurret: '#0288D1',
    shield: 'rgba(0, 191, 255, 0.4)',
    text: '#fff',
    obstacle: '#546E7A',
    obstacleBorder: '#37474F'
};

export const ENEMY_TYPES = {
    RED: { id: 'RED', name: 'Lính thường', color: '#e53935', hp: 45, maxHp: 45, speed: 2.5, damage: 10, score: 10, radius: 18, behavior: 'CHASE', fireRate: 3000, bulletSpeed: 5.5, bulletDmg: 8 , gold: 6 },
    BLACK: { id: 'BLACK', name: 'Hạng nặng', color: '#212121', hp: 200, maxHp: 200, speed: 1.0, damage: 30, score: 50, radius: 28, behavior: 'CHASE_SLOW', outline: '#757575', fireRate: 4000, bulletSpeed: 4, bulletDmg: 20 , gold: 25 },
    YELLOW: { id: 'YELLOW', name: 'Trinh sát', color: '#FFD700', hp: 25, maxHp: 25, speed: 4.5, damage: 5, score: 25, radius: 14, behavior: 'ORBIT', fireRate: 1200, bulletSpeed: 7.5, bulletDmg: 5 , gold: 12 },
    PURPLE: { id: 'PURPLE', name: 'Bắn tỉa', color: '#9C27B0', hp: 40, maxHp: 40, speed: 1.8, damage: 15, score: 40, radius: 20, behavior: 'SNIPER', fireRate: 3500, bulletSpeed: 11, bulletDmg: 25 , gold: 40 },
    BOSS: { id: 'BOSS', name: 'MECHA BOSS', color: '#D50000', hp: 2000, maxHp: 2000, speed: 1.5, damage: 50, score: 1000, radius: 60, behavior: 'BOSS', fireRate: 2000, bulletSpeed: 8, bulletDmg: 20 , gold: 300 }
};

export const BULLET_TYPES = {
    NORMAL: { id: 'NORMAL', name: 'Thường', color: '#FFF', damage: 20, speed: 12, cooldown: 350, radius: 4 },
    ROCKET: { id: 'ROCKET', name: 'Rocket', color: '#FF5722', damage: 90, speed: 9, cooldown: 650, radius: 6, special: 'EXPLODE', explosionRadius: 130, splashFactor: 0.75 , homingRange: 500, turnSpeed: 0.2 },
    STUN: { id: 'STUN', name: 'Choáng', color: '#00BCD4', damage: 15, speed: 14, cooldown: 450, radius: 5, effect: { type: 'STUN', duration: 1500 } },
    LIGHTNING: { id: 'LIGHTNING', name: 'Sấm Sét', color: '#FFEB3B', damage: 45, speed: 18, cooldown: 600, radius: 4, special: 'CHAIN', chainRange: 300, chainCount: 3, chainDmgFactor: 0.7 },
    FIRE: { id: 'FIRE', name: 'Đạn Lửa', color: '#FF5722', damage: 20, speed: 13, cooldown: 250, radius: 6, effect: { type: 'BURN', duration: 3000, tickInterval: 500, tickDamage: 8 } },
    PIERCING: { id: 'PIERCING', name: 'Xuyên', color: '#E91E63', damage: 60, speed: 22, cooldown: 700, radius: 6, special: 'PIERCE', pierceCount: 4 },
    HOMING: { id: 'HOMING', name: 'Đuổi', color: '#7C4DFF', damage: 25, speed: 11, cooldown: 450, radius: 5, special: 'HOMING', homingRange: 500, turnSpeed: 0.2 }
};

// --- Global cap: Fire Rate upgrade max level (based on NORMAL gun) ---
export function getFireRateMaxLv() {
    const baseCd = (BULLET_TYPES && BULLET_TYPES.NORMAL && BULLET_TYPES.NORMAL.cooldown) ? BULLET_TYPES.NORMAL.cooldown : 700;
    const target = 80;      // ms (same as clamp in Player.shoot)
    const mult = 0.95;      // -5% cooldown per level
    if (baseCd <= target) return 0;
    const lv = Math.ceil(Math.log(target / baseCd) / Math.log(mult));
    return Math.max(0, lv);
}



export const ITEM_TYPES = {
    HP_PACK: { id: 'HP_PACK', color: '#4CAF50', label: '+HP', type: 'HEAL', value: 30, duration: 8000 },
    SHIELD: { id: 'SHIELD', color: '#2196F3', label: 'SHIELD', type: 'BUFF', buffType: 'shield', buffDuration: 8000, duration: 8000 },
    RAPID_FIRE: { id: 'RAPID_FIRE', color: '#FF9800', label: 'RAPID', type: 'BUFF', buffType: 'rapid', buffDuration: 8000, value: 0.5, duration: 8000 },
    AMMO_NORMAL: { id: 'AMMO_NORMAL', color: '#FFF', label: 'NORMAL', type: 'WEAPON', weaponId: 'NORMAL', duration: 15000 },
    AMMO_STUN: { id: 'AMMO_STUN', color: '#00BCD4', label: 'STUN', type: 'WEAPON', weaponId: 'STUN', duration: 15000 },
    AMMO_LIGHTNING: { id: 'AMMO_LIGHTNING', color: '#FFEB3B', label: 'LIGHT', type: 'WEAPON', weaponId: 'LIGHTNING', duration: 15000 },
    AMMO_FIRE: { id: 'AMMO_FIRE', color: '#FF5722', label: 'FIRE', type: 'WEAPON', weaponId: 'FIRE', duration: 15000 },
    AMMO_PIERCE: { id: 'AMMO_PIERCE', color: '#E91E63', label: 'PIERCE', type: 'WEAPON', weaponId: 'PIERCING', duration: 15000 },
    AMMO_HOMING: { id: 'AMMO_HOMING', color: '#7C4DFF', label: 'HOMING', type: 'WEAPON', weaponId: 'HOMING', duration: 15000 }
};

export const SKILL_CONFIG = {
    // Hệ Chiến Binh (default)
    CLONE: { cooldown: 14000, duration: 8000, hp: 150 },
    STEALTH: { cooldown: 11000, duration: 3000 },
    VAMPIRISM: { cooldown: 18000, duration: 4000, leechPercent: 0.2, capPerSecond: 20 },

    // Hệ Pháp Sư (mage)
    mage: {
        id: 'mage',
        name: 'Pháp Sư',
        skills: {
            // Q: Hỏa Cầu (Fireball)
            clone: { key: 'Q', labelHTML: 'Hỏa<br>Cầu', color: '#FF5722', cooldown: 3000, castText: 'Q: HỎA CẦU' },
            // E: Dịch Chuyển (Blink)
            stealth: { key: 'E', labelHTML: 'Dịch<br>Chuyển', color: '#E040FB', cooldown: 5000, castText: 'E: BLINK' },
            // R: Bão Tuyết (Blizzard)
            vampirism: {
                key: 'R',
                labelHTML: 'Bão<br>Tuyết',
                color: '#00E5FF',
                cooldown: 15000,
                duration: 5000,
                radius: 220,
                innerRadius: 60,
                moveSpeed: 2.6,
                tickInterval: 500,
                tickDamage: 15,
                slowMult: 0.5,
                slowDuration: 650,
                castText: 'R: BÃO TUYẾT'
            }
        }
    }
};

// --- S0: Tank System (3 systems) + Skill Framework ---
// Note: Internal skill keys remain 'clone/stealth/vampirism' as 3 fixed slots (Q/E/R)
// to keep the existing UI overlay ids (cd-clone/cd-stealth/cd-vampirism) stable.
export const TANK_SYSTEMS = {
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
            // Q / E / R slots giữ nguyên (clone/stealth/vampirism) để UI không đổi
            // Q: Dash
            clone:     { key: 'Q', labelHTML: 'Lướt',          color: '#4FC3F7', cooldown: 3000,  duration: 250, dashSpeedMult: 3.2 },
            // E: Phase (miễn thương ngắn)
            stealth:   { key: 'E', labelHTML: 'Miễn<br>Thương',         color: '#81D4FA', cooldown: 10000, duration: 1000 },
            // R: Adrenaline (buff)
            vampirism: { key: 'R', labelHTML: 'Cuồng<br>Tốc',         color: '#29B6F6', cooldown: 14000, duration: 4000, speedMult: 1.25, fireMult: 0.85, damageMult: 1.3 }
        }
    },
    engineer: {
        id: 'engineer',
        name: 'Hệ Kỹ Sư',
        skills: {
            // Q: Turret đặt tháp tự bắn
            clone:     { key: 'Q', labelHTML: 'Tháp<br>Pháo',        color: '#81C784', cooldown: 12000, duration: 10000, maxTurrets: 1, range: 650, fireRate: 320, bulletColor: '#66BB6A', bulletDmgMult: 0.65 },
            // E: Repair hồi máu tức thì
            stealth:   { key: 'E', labelHTML: 'Sửa<br>Chữa',        color: '#A5D6A7', cooldown: 16000, heal: 30 },
            // R: EMP choáng diện rộng (Boss miễn nhiễm theo Enemy.applyEffect)
            vampirism: { key: 'R', labelHTML: 'Xung<br>EMP',           color: '#00E5FF', cooldown: 18000, radius: 340, stunDuration: 1200 }
        }
    },
    mage: {
        id: 'mage',
        name: 'Pháp Sư',
        skills: {
            // Use the same 3 fixed slots: clone / stealth / vampirism => Q / E / R
            clone:     { ...SKILL_CONFIG.mage.skills.clone },
            stealth:   { ...SKILL_CONFIG.mage.skills.stealth },
            vampirism: { ...SKILL_CONFIG.mage.skills.vampirism }
        }
    },
    juggernaut: {
        id: 'juggernaut',
        name: 'Hệ Giáp Sắt',
        skills: {
            // J0: chỉ khung UI + cooldown. Logic sẽ triển khai ở J1/J2/J3
            // Q: Reflective Shield
            clone:     { key: 'Q', labelHTML: 'Giáp<br>Phản', color: '#FFD54F', cooldown: 12000, duration: 5000, castText: 'J0: GIÁP PHẢN LỰC' },
            // E: Battering Ram
            stealth:   { key: 'E', labelHTML: 'Cú<br>Húc',   color: '#FFCA28', cooldown: 8000,  duration: 400, ramSpeedMult: 3.0, impactBase: 60, impactPerWave: 3, knockback: 95, castText: 'J0: CÚ HÚC' },
            // R: Siege Mode
            vampirism: { key: 'R', labelHTML: 'Pháo<br>Đài', color: '#FFC107', cooldown: 25000, duration: 6000, castText: 'J0: PHÁO ĐÀI' }
        }
    }

};

export function getTankSystem(id) {
    return TANK_SYSTEMS[id] || TANK_SYSTEMS.default;
}

export function getSystemSkillDef(systemId, skillKey) {
    const sys = getTankSystem(systemId);
    return (sys && sys.skills && sys.skills[skillKey]) ? sys.skills[skillKey] : getTankSystem('default').skills[skillKey];
}
