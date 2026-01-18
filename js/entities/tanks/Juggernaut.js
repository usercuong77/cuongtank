// Juggernaut tank system (Hệ Giáp Sắt)
// Goal: keep original gameplay logic, but moved into its own class.

import { PlayerBase, getPlayerContext, setPlayerContext } from '../Player.js';
import {
  COLORS,
  BULLET_TYPES,
  ITEM_TYPES,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getFireRateMaxLv,
  getSystemSkillDef,
} from '../../constants.js';
import {
  checkCircleRect,
  createDamageText,
  createMuzzleFlash,
} from '../../utils.js';
import { Bullet } from '../Bullet.js';

export class Juggernaut extends PlayerBase {
  constructor() {
    // Keep baseline stats aligned with original defaults.
    super('juggernaut', { maxHp: 100, baseSpeed: 6.5, radius: 22 });
    this.baseRadius = this.baseRadius || 22;

    // Ensure ram container exists
    if (!this.ram) this.ram = { active: false, endTime: 0, vx: 0, vy: 0, hitSet: new Set() };
    if (!this.buffs) this.buffs = {};
    if (!this.buffs.juggerShield) this.buffs.juggerShield = { active: false, endTime: 0 };
    if (!this.buffs.siege) this.buffs.siege = { active: false, endTime: 0, speedMult: 0.3, fireMult: 0.5, sizeMult: 1.35, armorBase: 0.35, armorMult: 3 };
  }

  // Q/E/R mapping in UI: clone/stealth/vampirism
  useSkill(skillName) {
    const now = Date.now();
    const config = getSystemSkillDef(this.systemId, skillName);
    const skillState = this.skills[skillName];
    if (!skillState || !config) return;

    // Cooldown gate
    if (now - skillState.lastUsed < (config.cooldown || 0)) return;

    const { Game } = getPlayerContext();
    skillState.lastUsed = now;

    if (skillName === 'clone') {
      // J1: Reflective Shield (Giáp Phản)
      const dur = config.duration || 5000;
      this.buffs.juggerShield.active = true;
      this.buffs.juggerShield.endTime = now + dur;
      if (Game && Game.ui) {
        Game.ui.removeBuff('Giáp Phản');
        Game.ui.addBuff('Giáp Phản', (config && config.color) ? config.color : '#FFD54F');
      }
      createDamageText(this.x, this.y - 40, (config.castText || 'GIÁP PHẢN!'), (config && config.color) ? config.color : '#FFD54F');
      return;
    }

    if (skillName === 'stealth') {
      // J2: Battering Ram (Cú Húc)
      let dx = Math.cos(this.angle);
      let dy = Math.sin(this.angle);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;

      const dur = config.duration || 400;
      const ramSpeed = (this.baseSpeed || this.speed || 6.5) * (config.ramSpeedMult || 3.0);

      this.ram.active = true;
      this.ram.endTime = now + dur;
      this.ram.vx = dx * ramSpeed;
      this.ram.vy = dy * ramSpeed;
      this.ram.hitSet = new Set();

      if (Game) Game.shake = 8;
      createDamageText(this.x, this.y - 40, (config.castText || 'CÚ HÚC!'), (config && config.color) ? config.color : '#FFCA28');
      return;
    }

    if (skillName === 'vampirism') {
      // J3: Siege Mode (Pháo Đài)
      const dur = config.duration || 6000;
      this.buffs.siege.active = true;
      this.buffs.siege.endTime = now + dur;
      // Keep original multipliers (stored on buff object)
      this.buffs.siege.speedMult = (config.speedMult != null) ? config.speedMult : (this.buffs.siege.speedMult || 0.3);
      this.buffs.siege.fireMult = (config.fireMult != null) ? config.fireMult : (this.buffs.siege.fireMult || 0.5);
      this.buffs.siege.sizeMult = (config.sizeMult != null) ? config.sizeMult : (this.buffs.siege.sizeMult || 1.35);
      this.buffs.siege.armorBase = (config.armorBase != null) ? config.armorBase : (this.buffs.siege.armorBase || 0.35);
      this.buffs.siege.armorMult = (config.armorMult != null) ? config.armorMult : (this.buffs.siege.armorMult || 3);

      if (Game && Game.ui) {
        Game.ui.removeBuff('Pháo Đài');
        Game.ui.addBuff('Pháo Đài', (config && config.color) ? config.color : '#FFEB3B');
      }
      createDamageText(this.x, this.y - 40, (config.castText || 'PHÁO ĐÀI!'), (config && config.color) ? config.color : '#FFC107');
      return;
    }
  }

  // Juggernaut core update (adds: Siege speed/size + Ram physics/impact)
  update(input, obstacles, enemies, projectiles, clones, turrets, pickups, coins, bossMines, game) {
    // Keep original injection behavior
    if (game) setPlayerContext({ Game: game });
    if (input) setPlayerContext({ Input: input });

    const ctx = getPlayerContext();
    const Game = ctx.Game;
    const Input = ctx.Input;

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

    // Skill hotkeys (mapping stays: q/e/r => clone/stealth/vampirism)
    if (Input.keys['q']) this.useSkill('clone');
    if (Input.keys['e']) this.useSkill('stealth');
    if (Input.keys['r']) this.useSkill('vampirism');
    if (Input.keys[' ']) this.useUltimate();

    const now = Date.now();

    // Expirations (Jugger-specific)
    if (this.ram && this.ram.active && now > this.ram.endTime) {
      this.ram.active = false;
    }

    if (this.buffs.juggerShield && this.buffs.juggerShield.active && now > this.buffs.juggerShield.endTime) {
      this.buffs.juggerShield.active = false;
      Game?.ui?.removeBuff?.('Giáp Phản');
      createDamageText(this.x, this.y - 40, 'HẾT GIÁP PHẢN', '#fff');
    }

    if (this.buffs.siege && this.buffs.siege.active && now > this.buffs.siege.endTime) {
      this.buffs.siege.active = false;
      Game?.ui?.removeBuff?.('Pháo Đài');
      createDamageText(this.x, this.y - 40, 'HẾT PHÁO ĐÀI', '#fff');
    }

    // Effective speed (base + shop speedLv + siege speedMult)
    let effSpeed = (this.baseSpeed || this.speed || 6.5);
    const spdLv = ((Game?.upgrades?.speedLv ?? 0) | 0);
    if (spdLv > 0) effSpeed *= (1 + spdLv * 0.05);
    if (this.buffs.siege && this.buffs.siege.active) {
      effSpeed *= (this.buffs.siege.speedMult || 0.3);
    }
    this.speed = effSpeed;

    // Radius scaling (Siege Mode)
    if (this.baseRadius) {
      const sm = (this.buffs.siege && this.buffs.siege.active) ? (this.buffs.siege.sizeMult || 1.35) : 1;
      this.radius = this.baseRadius * sm;
    }

    // Movement (Ram overrides)
    let dx = 0, dy = 0;
    if (this.ram && this.ram.active && now <= this.ram.endTime) {
      dx = this.ram.vx;
      dy = this.ram.vy;
    } else {
      if (this.ram) this.ram.active = false;
      if (Input.keys.w) dy -= 1;
      if (Input.keys.s) dy += 1;
      if (Input.keys.a) dx -= 1;
      if (Input.keys.d) dx += 1;
      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy) || 1;
        dx = (dx / length) * effSpeed;
        dy = (dy / length) * effSpeed;
      }
    }

    if (isNaN(dx)) dx = 0;
    if (isNaN(dy)) dy = 0;

    let nextX = this.x + dx;
    let nextY = this.y + dy;

    // Collision resolve (axis split)
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

    // Juggernaut J2: impact while ramming (push + damage)
    if (this.ram && this.ram.active && now <= this.ram.endTime) {
      const ramCfg = getSystemSkillDef(this.systemId, 'stealth') || {};
      const waveNow = (globalThis.WaveManager && globalThis.WaveManager.wave) ? (globalThis.WaveManager.wave | 0) : 1;
      const impactBase = (typeof ramCfg.impactBase === 'number') ? ramCfg.impactBase : 60;
      const impactPerWave = (typeof ramCfg.impactPerWave === 'number') ? ramCfg.impactPerWave : 3;
      const knock = (typeof ramCfg.knockback === 'number') ? ramCfg.knockback : 95;
      const dmg = Math.round(impactBase + impactPerWave * Math.max(0, waveNow - 1));

      const list = enemies || Game?.enemies || [];
      for (const e of list) {
        if (!e || e.markedForDeletion || e.hp <= 0) continue;
        if (e.typeKey === 'BOSS') continue; // an toàn: J2 chưa đẩy Boss

        const er = (e.radius || (e.config && e.config.radius) || 18);
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d > this.radius + er + 2) continue;

        if (this.ram.hitSet && this.ram.hitSet.has(e)) continue;
        if (this.ram.hitSet) this.ram.hitSet.add(e);

        e.hp -= dmg;
        createDamageText(e.x, e.y - 10, '-' + dmg, '#FFCA28');

        // Knockback
        let nx = (e.x - this.x);
        let ny = (e.y - this.y);
        const l = Math.hypot(nx, ny) || 1;
        nx /= l;
        ny /= l;
        e.x += nx * knock;
        e.y += ny * knock;
        e.x = Math.max(er, Math.min(WORLD_WIDTH - er, e.x));
        e.y = Math.max(er, Math.min(WORLD_HEIGHT - er, e.y));
      }
    }

    // Aim (same as PlayerBase)
    const cam = (Game && Game.camera) ? Game.camera : (globalThis.Camera || { x: 0, y: 0 });
    const worldMouseX = Input.mouse.x + (cam.x || 0);
    const worldMouseY = Input.mouse.y + (cam.y || 0);
    this.angle = Math.atan2(worldMouseY - this.y, worldMouseX - this.x);

    // Expire ITEM buffs (core)
    if (this.buffs.shield && this.buffs.shield.active && now > this.buffs.shield.endTime) {
      this.buffs.shield.active = false;
      const overlay = document.getElementById('shieldOverlay');
      if (overlay) overlay.style.display = 'none';
      Game?.ui?.removeBuff?.('Shield');
    }
    if (this.buffs.rapid && this.buffs.rapid.active && now > this.buffs.rapid.endTime) {
      this.buffs.rapid.active = false;
      Game?.ui?.removeBuff?.('Rapid');
    }

    // Shooting
    if (Input.mouse.down) this.shoot(obstacles);

    // UI cooldown display
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

  // Override shoot: Siege Mode forces ROCKET + fire rate multiplier
  shoot(obstacles) {
    const { Game } = getPlayerContext();
    const now = Date.now();

    let weaponObj = this.getCurrentWeaponObj();
    let baseConfig = BULLET_TYPES[weaponObj.id];
    if (!baseConfig) baseConfig = BULLET_TYPES.NORMAL;

    // Juggernaut Siege Mode: always shoot ROCKET regardless of current weapon
    if (this.buffs.siege && this.buffs.siege.active) {
      const currentLv = weaponObj.level || 1;
      weaponObj = { id: 'ROCKET', level: currentLv };
      baseConfig = BULLET_TYPES.ROCKET;
    }

    let level = weaponObj.level || 1;
    let damage = baseConfig.damage;
    let cooldown = baseConfig.cooldown;
    let speed = baseConfig.speed;

    // Weapon scaling by level (same as core)
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
      // Rocket scale: mỗi cấp +15 damage, giảm 20ms cooldown
      damage += (level - 1) * 15;
      cooldown = Math.max(100, baseConfig.cooldown - (level - 1) * 20);
    }

    // ITEM rapid fire
    if (this.buffs.rapid && this.buffs.rapid.active) cooldown *= ITEM_TYPES.RAPID_FIRE.value;

    // Juggernaut Siege Mode: double fire rate
    if (this.buffs.siege && this.buffs.siege.active) {
      cooldown *= (this.buffs.siege.fireMult || 0.5);
    }

    // Shop upgrade: Fire Rate (-5% cooldown per level)
    const flv = ((Game?.upgrades?.fireRateLv ?? 0) | 0);
    if (flv) {
      const frMax = getFireRateMaxLv();
      const flvC = Math.min(flv, frMax);
      const mult = Math.pow(0.95, flvC);
      cooldown *= mult;
      cooldown = Math.max(80, cooldown); // clamp
    }

    if (now - this.lastShot > cooldown) {
      let finalConfig = { ...baseConfig, damage: damage, speed: speed };

      // Per-weapon special scaling
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
      } else if (weaponObj.id === 'HOMING') {
        finalConfig.turnSpeed = Math.min(0.5, baseConfig.turnSpeed + (level - 1) * 0.05);
      } else if (weaponObj.id === 'STUN') {
        finalConfig.effect = { ...baseConfig.effect, duration: baseConfig.effect.duration + (level - 1) * 200 };
      }

      // Spawn point at turret tip
      const __baseR2 = (this.baseRadius || 22);
      const __scale2 = (__baseR2 > 0) ? (this.radius / __baseR2) : 1;
      const muzzleDist = 35 * (__scale2 || 1);
      const tipX = this.x + Math.cos(this.angle) * muzzleDist;
      const tipY = this.y + Math.sin(this.angle) * muzzleDist;

      const spawnBullet = (ang) => {
        Game?.projectiles?.push?.(new Bullet(tipX, tipY, ang, weaponObj.id, finalConfig, 'PLAYER'));
        createMuzzleFlash(tipX, tipY, ang, finalConfig.color);
      };

      // Multi-shot thresholds
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

      // Recoil
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

  // Override damage intake: reduce when skills active (reflect + siege armor)
  takeDamage(amount, source) {
    const { Game } = getPlayerContext();
    const now = Date.now();
    const rawAmount = amount;
    const juggerActive = (this.buffs.juggerShield && this.buffs.juggerShield.active && now <= this.buffs.juggerShield.endTime);

    // Reflective shield: reflect 50% raw damage to attacker (non-boss)
    if (juggerActive && rawAmount > 0) {
      const attacker = source ? (source.enemy || source.attacker || null) : null;
      if (attacker && attacker.typeKey !== 'BOSS' && typeof attacker.hp === 'number') {
        const reflectDmg = Math.max(1, Math.round(rawAmount * 0.5));
        attacker.hp -= reflectDmg;
        createDamageText(attacker.x, attacker.y - 20, `-${reflectDmg}`, '#FFD54F');
      }
    }

    // Damage reductions
    let modAmount = amount;
    if (this.buffs.shield && this.buffs.shield.active) modAmount *= 0.3;
    if (juggerActive) modAmount *= 0.5;

    // Siege Mode: reduce 60% incoming damage (take 40%)
    if (this.buffs.siege && this.buffs.siege.active) modAmount *= 0.4;

    const hasShield = ((this.buffs.shield && this.buffs.shield.active) || juggerActive || (this.buffs.siege && this.buffs.siege.active));
    if (!hasShield && modAmount > 0) this.loseCurrentWeapon();

    // Armor upgrade: -5% damage taken per level (cap 60%)
    const alv = ((Game?.upgrades?.armorLv ?? 0) | 0);
    const reduction = Math.min(0.60, alv * 0.05);
    const finalAmount = (modAmount > 0) ? Math.max(1, Math.round(modAmount * (1 - reduction))) : modAmount;

    this.hp -= finalAmount;
    if (this.hp < 0) this.hp = 0;
    if (Game && Game.ui) Game.ui.updateHealth(this.hp, this.maxHp);
    if (Game) Game.shake = 10;
  }

  // Override draw: shield ring + siege body scaling/shape
  draw(ctx) {
    // If this override runs, avoid double-drawing when Game.js also calls drawFx().
    this._skipDrawFxAt = Date.now();

    ctx.save();
    ctx.translate(this.x, this.y);

    // Alpha for stealth/phase (kept consistent with original base)
    let alpha = 1;
    if (this.isStealth) alpha = 0.4;
    if (this.buffs.phase && this.buffs.phase.active) alpha = 0.35;
    ctx.globalAlpha = alpha;

    // Item buff: Shield
    if (this.buffs.shield && this.buffs.shield.active) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 191, 255, 0.1)';
      ctx.fill();
    }

    // Juggernaut buff: Giáp Phản
    if (this.buffs.juggerShield && this.buffs.juggerShield.active && Date.now() <= this.buffs.juggerShield.endTime) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 213, 79, 0.08)';
      ctx.fill();
    }

    // Siege Mode visuals: scale chassis + add fortress plating
    const isSiege = (this.buffs.siege && this.buffs.siege.active && Date.now() <= this.buffs.siege.endTime);

    // Draw body/turret in its own scaled space so rings keep correct size
    ctx.save();
    const baseR = (this.baseRadius || 22);
    const scale = (baseR > 0) ? (this.radius / baseR) : 1;
    if (!isNaN(scale) && scale !== 1) ctx.scale(scale, scale);

    if (isSiege) {
      // Extra plating (purely visual)
      ctx.fillStyle = 'rgba(255, 193, 7, 0.18)';
      ctx.fillRect(-30, -30, 60, 60);
      ctx.strokeStyle = 'rgba(255, 193, 7, 0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(-30, -30, 60, 60);
    }

    // Body (original)
    ctx.fillStyle = '#333';
    ctx.fillRect(-22, -22, 44, 44);
    ctx.fillStyle = '#111';
    ctx.fillRect(-26, -24, 8, 48);
    ctx.fillRect(18, -24, 8, 48);

    // Turret (original)
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
    ctx.restore();
  }

  // Overlay VFX (called from Game.js)
  drawFx(ctx) {
    const now = Date.now();
    if (this._skipDrawFxAt && now - this._skipDrawFxAt < 25) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    let alpha = 1;
    if (this.isStealth) alpha = 0.4;
    if (this.buffs && this.buffs.phase && this.buffs.phase.active) alpha = 0.35;
    ctx.globalAlpha = alpha;

    // Juggernaut buff: Giáp Phản
    const jug = this.buffs && this.buffs.juggerShield;
    if (jug && jug.active && now <= jug.endTime) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 213, 79, 0.08)';
      ctx.fill();
    }

    // Fortress aura / shape hint (Pháo Đài)
    const siege = this.buffs && this.buffs.siege;
    if (siege && siege.active && now <= siege.endTime) {
      const r = (this.radius || 22) * 1.35;
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.65)';
      ctx.lineWidth = 3;
      ctx.strokeRect(-r, -r, r * 2, r * 2);

      // corner pads
      ctx.fillStyle = 'rgba(255, 213, 79, 0.10)';
      const pad = 10;
      ctx.fillRect(-r - 4, -r - 4, pad, pad);
      ctx.fillRect(r - pad + 4, -r - 4, pad, pad);
      ctx.fillRect(-r - 4, r - pad + 4, pad, pad);
      ctx.fillRect(r - pad + 4, r - pad + 4, pad, pad);
    }

    ctx.restore();
  }
}
