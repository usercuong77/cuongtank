// js/entities/Player.js
// PlayerBase (core only) - cleaned: no systemId-specific logic.
// System-specific behavior must live in js/entities/tanks/*

import { GameObject } from './GameObject.js';
import {
  COLORS,
  BULLET_TYPES,
  ITEM_TYPES,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getFireRateMaxLv,
  getSystemSkillDef,
} from '../constants.js';
import {
  checkCircleRect,
  createDamageText,
  createComplexExplosion,
  createMuzzleFlash,
  applySkillDamage,
} from '../utils.js';
import { Bullet } from './Bullet.js';

// Module-scope injections to keep original logic (no Game import).
let Game = null;
let Input = null;
let MAX = null;

export function setPlayerContext(ctxObj = {}) {
  if (ctxObj.Game !== undefined) Game = ctxObj.Game;
  if (ctxObj.Input !== undefined) Input = ctxObj.Input;
  if (ctxObj.MAX !== undefined) MAX = ctxObj.MAX;
}

// Allow other modules (tanks) to read injected references without importing Game directly.
export function getPlayerContext() {
  return { Game, Input, MAX };
}

export class PlayerBase extends GameObject {
  constructor(systemId = 'default', stats = null) {
    const __stats = stats || {};
    const __radius = (__stats.radius != null) ? __stats.radius : 22;
    super(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, __radius);

    this.systemId = systemId || 'default';

    // Core stats
    this.maxHp = (__stats.hp != null ? __stats.hp : (__stats.maxHp != null ? __stats.maxHp : 100));
    this.hp = this.maxHp;

    this.baseSpeed = (__stats.speed != null ? __stats.speed : (__stats.baseSpeed != null ? __stats.baseSpeed : 6.5));
    this.speed = this.baseSpeed;

    this.baseRadius = __radius;

    // Aim
    this.angle = 0;

    // Weapons
    this.inventory = [{ id: 'NORMAL', level: 1 }];
    this.currentWeaponIndex = 0;
    this.lastShot = 0;

    // Ultimate
    this.ultiCharge = 0;

    // Generic buff containers (PlayerBase only handles ITEM buffs; systems handle the rest)
    this.buffs = {
      shield: { active: false, endTime: 0 }, // ITEM shield
      rapid: { active: false, endTime: 0 },  // ITEM rapid fire

      // Keep these fields to avoid undefined in subclasses (no logic here)
      juggerShield: { active: false, endTime: 0 },
      phase: { active: false, endTime: 0 },
      adrenaline: { active: false, endTime: 0, speedMult: 1.25, fireMult: 0.5, damageMult: 1.3 },
      siege: { active: false, endTime: 0, speedMult: 0.3, fireMult: 0.5, sizeMult: 1.35, armorBase: 0.35, armorMult: 3 },
    };

    // Skills state (3 slots are still named clone/stealth/vampirism)
    this.skills = {
      clone: { lastUsed: 0, active: false },
      stealth: { lastUsed: 0, active: false, endTime: 0 },
      vampirism: { lastUsed: 0, active: false, endTime: 0 },
    };

    // Keep these fields for subclasses compatibility (no core logic here)
    this.vampHeal = { windowStart: 0, healed: 0 };
    this.dash = { active: false, endTime: 0, vx: 0, vy: 0 };
    this.ram = { active: false, endTime: 0, vx: 0, vy: 0, hitSet: new Set() };
    this.isStealth = false;
  }

  // Cheats (used by Admin)
  activateCheat() {
    this.inventory = [
      { id: 'NORMAL', level: 5 },
      { id: 'STUN', level: 5 },
      { id: 'LIGHTNING', level: 5 },
      { id: 'FIRE', level: 5 },
      { id: 'PIERCING', level: 5 },
      { id: 'HOMING', level: 5 },
    ];
    if (this.currentWeaponIndex >= this.inventory.length) this.currentWeaponIndex = 0;
    this.ultiCharge = 100;
    createDamageText(this.x, this.y - 60, 'CHEAT ACTIVATED!', '#FFD700');
    Game?.ui?.updateWeaponInventory?.(this.inventory, this.currentWeaponIndex);
    Game?.ui?.updateUltiBar?.(this.ultiCharge);
  }

  addWeapon(weaponId) {
    const existingIndex = this.inventory.findIndex(w => w.id === weaponId);
    if (existingIndex !== -1) {
      if (this.inventory[existingIndex].level < 5) {
        this.inventory[existingIndex].level++;
        createDamageText(this.x, this.y - 40, `UPGRADE! LVL ${this.inventory[existingIndex].level}`, '#FFD700');
      } else {
        createDamageText(this.x, this.y - 40, 'MAX LEVEL!', '#fff');
      }
    } else {
      if (this.inventory.length >= 6) {
        createDamageText(this.x, this.y - 40, 'FULL!', '#ff4444');
      } else {
        this.inventory.push({ id: weaponId, level: 1 });
        createDamageText(this.x, this.y - 40, 'NEW WEAPON!', '#fff');
        this.selectWeapon(this.inventory.length - 1);
      }
    }
    Game?.ui?.updateWeaponInventory?.(this.inventory, this.currentWeaponIndex);
  }

  selectWeapon(index) {
    if (index >= 0 && index < this.inventory.length) this.currentWeaponIndex = index;
    else this.currentWeaponIndex = 0;
    Game?.ui?.updateWeaponInventory?.(this.inventory, this.currentWeaponIndex);
  }

  loseCurrentWeapon() {
    // Hit penalty (logic giữ nguyên):
    // - NORMAL: giảm 1 cấp (min = 1)
    // - Special: nếu Lv>1 => giảm 1 cấp; nếu Lv=1 => mất vũ khí đó và CHUYỂN QUA NORMAL

    if (!this.inventory || this.inventory.length === 0) {
      this.inventory = [{ id: 'NORMAL', level: 1 }];
      this.currentWeaponIndex = 0;
      Game?.ui?.updateWeaponInventory?.(this.inventory, this.currentWeaponIndex);
      return;
    }

    // đảm bảo NORMAL luôn tồn tại ở slot 0
    if (!this.inventory[0] || this.inventory[0].id !== 'NORMAL') {
      this.inventory.unshift({ id: 'NORMAL', level: 1 });
      if (typeof this.currentWeaponIndex === 'number') this.currentWeaponIndex += 1;
    }

    if (this.currentWeaponIndex == null || this.currentWeaponIndex < 0 || this.currentWeaponIndex >= this.inventory.length) {
      this.currentWeaponIndex = 0;
    }

    const currentWep = this.inventory[this.currentWeaponIndex];
    if (!currentWep) {
      this.currentWeaponIndex = 0;
      Game?.ui?.updateWeaponInventory?.(this.inventory, this.currentWeaponIndex);
      return;
    }

    if (currentWep.id === 'NORMAL') {
      const lv = (currentWep.level | 0) || 1;
      if (lv > 1) {
        currentWep.level = lv - 1;
        createDamageText(this.x, this.y - 60, 'GIẢM 1 CẤP!', '#ff4444');
      } else {
        currentWep.level = 1;
      }
      Game?.ui?.updateWeaponInventory?.(this.inventory, this.currentWeaponIndex);
      return;
    }

    const lv = (currentWep.level | 0) || 1;
    if (lv > 1) {
      currentWep.level = lv - 1;
      createDamageText(this.x, this.y - 60, 'GIẢM 1 CẤP!', '#ff4444');
    } else {
      this.inventory.splice(this.currentWeaponIndex, 1);
      this.currentWeaponIndex = 0;
      createDamageText(this.x, this.y - 60, 'MẤT VŨ KHÍ!', '#ff4444');
    }

    Game?.ui?.updateWeaponInventory?.(this.inventory, this.currentWeaponIndex);
  }

  getCurrentWeaponObj() {
    if (this.currentWeaponIndex === -1 || !this.inventory[this.currentWeaponIndex]) return { id: 'NORMAL', level: 1 };
    return this.inventory[this.currentWeaponIndex];
  }

  // Skills are implemented by subclasses (tanks)
  useSkill(skillName) {
    // Intentionally minimal: subclasses override.
    // Keeping no-op avoids accidental behavior in base.
    return;
  }

  addBuff(type, duration) {
    const now = Date.now();

    if (type === 'shield') {
      this.buffs.shield.active = true;
      this.buffs.shield.endTime = now + duration;
      const overlay = document.getElementById('shieldOverlay');
      if (overlay) overlay.style.display = 'block';
      Game?.ui?.addBuff?.('Shield', '#2196F3');
    } else if (type === 'rapid') {
      this.buffs.rapid.active = true;
      this.buffs.rapid.endTime = now + duration;
      Game?.ui?.addBuff?.('Rapid', '#FF9800');
    }
  }

  useUltimate() {
    if (this.ultiCharge < 100) return;

    this.ultiCharge = 0;
    Game?.ui?.updateUltiBar?.(0);

    createDamageText(this.x, this.y - 80, 'FIRESTORM!!!', '#FFD700');
    if (Game) Game.shake = 30;

    try { MAX?.Audio?.ulti?.(); } catch (e) {}

    createComplexExplosion(this.x, this.y, '#FF5722', 50);

    if (!Game?.enemies) return;
    Game.enemies.forEach(e => {
      if (!e || e.markedForDeletion) return;
      if (e.typeKey === 'BOSS') {
        applySkillDamage(e, 250, '#FFD700', { textPrefix: '-' });
        createComplexExplosion(e.x, e.y, '#FF5722', 20);
      } else {
        const base = 150;
        applySkillDamage(e, base, '#FF5722', { textPrefix: '-' });
        createComplexExplosion(e.x, e.y, '#FF5722', 10);
      }
    });
  }

  gainUltiCharge(amount) {
    this.ultiCharge = Math.min(100, this.ultiCharge + amount);
    Game?.ui?.updateUltiBar?.(this.ultiCharge);
  }

  update(input, obstacles, enemies, projectiles, clones, turrets, pickups, coins, bossMines, game) {
    // Keep original injection behavior (used by other modules)
    if (game) Game = game;
    if (input) Input = input;
    if (enemies && Game) Game.enemies = enemies;
    if (projectiles && Game) Game.projectiles = projectiles;
    if (clones && Game) Game.clones = clones;
    if (turrets && Game) Game.turrets = turrets;
    if (pickups && Game) Game.pickups = pickups;
    if (coins && Game) Game.coins = coins;
    if (bossMines && Game) Game.bossMines = bossMines;
    if (obstacles && Game) Game.obstacles = obstacles;

    if (!Input) return;

    // Weapon hotkeys
    if (Input.keys['1']) this.selectWeapon(0);
    if (Input.keys['2']) this.selectWeapon(1);
    if (Input.keys['3']) this.selectWeapon(2);
    if (Input.keys['4']) this.selectWeapon(3);
    if (Input.keys['5']) this.selectWeapon(4);
    if (Input.keys['6']) this.selectWeapon(5);

    // Skill hotkeys (subclass handles)
    if (Input.keys['q']) this.useSkill('clone');
    if (Input.keys['e']) this.useSkill('stealth');
    if (Input.keys['r']) this.useSkill('vampirism');
    if (Input.keys[' ']) this.useUltimate();

    const now = Date.now();

    // Effective speed (core): baseSpeed + shop upgrade speedLv
    let effSpeed = (this.baseSpeed || this.speed || 6.5);
    const spdLv = ((Game?.upgrades?.speedLv ?? 0) | 0);
    if (spdLv > 0) effSpeed *= (1 + spdLv * 0.05);
    this.speed = effSpeed;

    // Movement (core)
    let dx = 0, dy = 0;
    if (Input.keys.w) dy -= 1;
    if (Input.keys.s) dy += 1;
    if (Input.keys.a) dx -= 1;
    if (Input.keys.d) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy) || 1;
      dx = (dx / length) * effSpeed;
      dy = (dy / length) * effSpeed;
    }

    if (isNaN(dx)) dx = 0;
    if (isNaN(dy)) dy = 0;

    let nextX = this.x + dx;
    let nextY = this.y + dy;

    // Collision resolve (core axis split)
    let collided = false;
    if (obstacles) {
      for (let obs of obstacles) {
        if (checkCircleRect({ x: nextX, y: nextY, radius: this.radius }, obs)) {
          collided = true;
          if (!checkCircleRect({ x: nextX, y: this.y, radius: this.radius }, obs)) this.x = nextX;
          else if (!checkCircleRect({ x: this.x, y: nextY, radius: this.radius }, obs)) this.y = nextY;
          break;
        }
      }
    }
    if (!collided) {
      this.x = nextX;
      this.y = nextY;
    }

    // Push out if still overlapping
    if (obstacles) {
      for (let obs of obstacles) {
        if (checkCircleRect({ x: this.x, y: this.y, radius: this.radius }, obs)) {
          const obsCX = obs.x + obs.width / 2;
          const obsCY = obs.y + obs.height / 2;
          const anglePush = Math.atan2(this.y - obsCY, this.x - obsCX);
          this.x += Math.cos(anglePush) * 4;
          this.y += Math.sin(anglePush) * 4;
        }
      }
    }

    // Clamp to world bounds
    this.x = Math.max(this.radius, Math.min(WORLD_WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.y));

    // Aim (core): use Game.camera if exists, else fallback global Camera
    const cam = (Game && Game.camera) ? Game.camera : (globalThis.Camera || { x: 0, y: 0 });
    const worldMouseX = Input.mouse.x + (cam.x || 0);
    const worldMouseY = Input.mouse.y + (cam.y || 0);
    this.angle = Math.atan2(worldMouseY - this.y, worldMouseX - this.x);

    // Expire ITEM buffs (core)
    if (this.buffs.shield.active && now > this.buffs.shield.endTime) {
      this.buffs.shield.active = false;
      const overlay = document.getElementById('shieldOverlay');
      if (overlay) overlay.style.display = 'none';
      Game?.ui?.removeBuff?.('Shield');
    }
    if (this.buffs.rapid.active && now > this.buffs.rapid.endTime) {
      this.buffs.rapid.active = false;
      Game?.ui?.removeBuff?.('Rapid');
    }

    // Shooting (core)
    if (Input.mouse.down) this.shoot(obstacles);

    // UI cooldown display (core; tank may keep same 3 keys)
    const c1 = getSystemSkillDef(this.systemId, 'clone');
    const c2 = getSystemSkillDef(this.systemId, 'stealth');
    const c3 = getSystemSkillDef(this.systemId, 'vampirism');
    if (Game?.ui?.updateSkillCooldown) {
      if (c1) Game.ui.updateSkillCooldown('clone', this.skills.clone.lastUsed, c1.cooldown);
      if (c2) Game.ui.updateSkillCooldown('stealth', this.skills.stealth.lastUsed, c2.cooldown);
      if (c3) Game.ui.updateSkillCooldown('vampirism', this.skills.vampirism.lastUsed, c3.cooldown);
    }

    this.validatePosition();
  }

  shoot(obstacles) {
    const now = Date.now();

    let weaponObj = this.getCurrentWeaponObj();
    let baseConfig = BULLET_TYPES[weaponObj.id];
    if (!baseConfig) baseConfig = BULLET_TYPES.NORMAL;

    let level = weaponObj.level || 1;
    let damage = baseConfig.damage;
    let cooldown = baseConfig.cooldown;
    let speed = baseConfig.speed;

    // Weapon scaling by level (core logic kept)
    if (weaponObj.id === 'NORMAL') {
      cooldown = Math.max(100, baseConfig.cooldown - (level - 1) * 30);
      damage += (level - 1) * 3;
    } else if (weaponObj.id === 'FIRE') {
      cooldown = Math.max(80, baseConfig.cooldown - (level - 1) * 30);
      damage += (level - 1) * 2;
    } else if (weaponObj.id === 'LIGHTNING') {
      damage += (level - 1) * 5;
    } else if (weaponObj.id === 'PIERCING') {
      damage += (level - 1) * 10;
    } else if (weaponObj.id === 'HOMING') {
      damage += (level - 1) * 4;
      if (level >= 5) damage += 15;
    } else if (weaponObj.id === 'STUN') {
      cooldown = Math.max(200, baseConfig.cooldown - (level - 1) * 50);
    } else if (weaponObj.id === 'ROCKET') {
      damage += (level - 1) * 15;
      cooldown = Math.max(100, baseConfig.cooldown - (level - 1) * 20);
    }

    // ITEM rapid fire (core)
    if (this.buffs.rapid.active) cooldown *= ITEM_TYPES.RAPID_FIRE.value;

    // Shop upgrade: Fire Rate (-5% cooldown per level) (core)
    const flv = ((Game?.upgrades?.fireRateLv ?? 0) | 0);
    if (flv) {
      const frMax = getFireRateMaxLv();
      const flvC = Math.min(flv, frMax);
      const mult = Math.pow(0.95, flvC);
      cooldown *= mult;
      cooldown = Math.max(80, cooldown); // clamp
    }


    // SYSTEM buff: Adrenaline (SpeedTank R) — increases fire rate and bullet damage
    if (this.buffs?.adrenaline?.active) {
      // fireMult < 1 => faster firing (lower cooldown)
      const fm = (this.buffs.adrenaline.fireMult != null) ? this.buffs.adrenaline.fireMult : 0.5;
      cooldown *= fm;

      // damageMult > 1 => stronger bullets
      const dm = (this.buffs.adrenaline.damageMult != null) ? this.buffs.adrenaline.damageMult : 1.0;
      damage *= dm;
    }
    if (now - this.lastShot > cooldown) {
      let finalConfig = { ...baseConfig, damage: damage, speed: speed };

      // Per-weapon special scaling (core)
      if (weaponObj.id === 'LIGHTNING') {
        finalConfig.chainCount = baseConfig.chainCount + (level - 1);
        finalConfig.chainRange = baseConfig.chainRange + (level - 1) * 50;
      } else if (weaponObj.id === 'PIERCING') {
        finalConfig.pierceCount = baseConfig.pierceCount + (level - 1);
        if (level >= 5) finalConfig.radius = 10;
      } else if (weaponObj.id === 'FIRE') {
        finalConfig.effect = {
          ...baseConfig.effect,
          tickDamage: (baseConfig.effect.tickDamage + (level - 1) * 2),
        };
        if (this.buffs?.adrenaline?.active) {
          const dm = (this.buffs.adrenaline.damageMult != null) ? this.buffs.adrenaline.damageMult : 1.0;
          finalConfig.effect.tickDamage *= dm;
        }
      } else if (weaponObj.id === 'HOMING') {
        finalConfig.turnSpeed = Math.min(0.5, baseConfig.turnSpeed + (level - 1) * 0.05);
      } else if (weaponObj.id === 'STUN') {
        finalConfig.effect = { ...baseConfig.effect, duration: baseConfig.effect.duration + (level - 1) * 200 };
      }

      // Spawn point at turret tip (core)
      const __baseR2 = (this.baseRadius || 22);
      const __scale2 = (__baseR2 > 0) ? (this.radius / __baseR2) : 1;
      const muzzleDist = 35 * (__scale2 || 1);
      const tipX = this.x + Math.cos(this.angle) * muzzleDist;
      const tipY = this.y + Math.sin(this.angle) * muzzleDist;

      const spawnBullet = (ang) => {
        Game?.projectiles?.push?.(new Bullet(tipX, tipY, ang, weaponObj.id, finalConfig, 'PLAYER'));
        createMuzzleFlash(tipX, tipY, ang, finalConfig.color);
      };

      // Multi-shot thresholds (core)
      if (weaponObj.id === 'NORMAL' && level >= 5) {
        spawnBullet(this.angle);
        spawnBullet(this.angle - 0.2);
        spawnBullet(this.angle + 0.2);
      } else if (weaponObj.id === 'NORMAL' && level >= 3) {
        spawnBullet(this.angle - 0.1);
        spawnBullet(this.angle + 0.1);
      } else if (weaponObj.id === 'HOMING' && level >= 5) {
        spawnBullet(this.angle);
        spawnBullet(this.angle - 0.3);
        spawnBullet(this.angle + 0.3);
      } else {
        spawnBullet(this.angle);
      }

      // Recoil (core)
      const recoilX = Math.cos(this.angle) * 2;
      const recoilY = Math.sin(this.angle) * 2;
      const nx = this.x - recoilX;
      const ny = this.y - recoilY;

      let canRecoil = true;
      if (obstacles) {
        for (let obs of obstacles) {
          if (checkCircleRect({ x: nx, y: ny, radius: this.radius }, obs)) {
            canRecoil = false;
            break;
          }
        }
      }
      if (canRecoil) {
        this.x = nx;
        this.y = ny;
      }

      this.lastShot = now;
    }
  }

  takeDamage(amount, source) {
    // Core damage only: ITEM shield + armor upgrade + weapon loss
    let modAmount = amount;

    if (this.buffs.shield.active) modAmount *= 0.3;

    const hasShield = (this.buffs.shield.active);
    if (!hasShield && modAmount > 0) this.loseCurrentWeapon();

    // Armor upgrade: -5% damage taken per level (cap 60%)
    const alv = ((Game?.upgrades?.armorLv ?? 0) | 0);
    const reduction = Math.min(0.60, alv * 0.05);
    const finalAmount = (modAmount > 0) ? Math.max(1, Math.round(modAmount * (1 - reduction))) : modAmount;

    this.hp -= finalAmount;
    if (this.hp < 0) this.hp = 0;

    Game?.ui?.updateHealth?.(this.hp, this.maxHp);
    if (Game) Game.shake = 10;

    return finalAmount;
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
    Game?.ui?.updateHealth?.(this.hp, this.maxHp);
    createDamageText(this.x, this.y - 20, `+${Math.floor(amount)}`, '#4CAF50');
  }

  draw(ctx) {
    // Core draw only: body + turret + item shield ring + hp bar (basic)
    ctx.save();
    ctx.translate(this.x, this.y);

    // Basic shield ring (ITEM)
    if (this.buffs.shield && this.buffs.shield.active) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 191, 255, 0.1)';
      ctx.fill();
    }

    // Body
    ctx.fillStyle = '#333';
    ctx.fillRect(-22, -22, 44, 44);
    ctx.fillStyle = '#111';
    ctx.fillRect(-26, -24, 8, 48);
    ctx.fillRect(18, -24, 8, 48);

    // Turret
    ctx.rotate(this.angle);
    const wObj = this.getCurrentWeaponObj();
    const wConfig = BULLET_TYPES[wObj.id] || BULLET_TYPES.NORMAL;

    ctx.fillStyle = wConfig.color;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.playerTurret;
    ctx.fillRect(0, -6, 40, 12);

    ctx.restore();

    // Basic HP bar (world-space)
    const hpPct = (this.maxHp > 0) ? (this.hp / this.maxHp) : 0;
    const barW = 60;
    const barH = 7;
    const bx = this.x - barW / 2;
    const by = this.y - this.radius - 18;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

    ctx.fillStyle = '#2ECC71';
    ctx.fillRect(bx, by, Math.max(0, barW * Math.max(0, Math.min(1, hpPct))), barH);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(bx, by, barW, barH);
    ctx.restore();
  }
}

// Backward-compatible alias (if any old imports still use Player)
export const Player = PlayerBase;
