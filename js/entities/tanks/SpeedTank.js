// Speed tank system (Hệ Tốc Độ)
// Extracted from original Player logic. Keeps gameplay identical.

import { PlayerBase, getPlayerContext } from '../Player.js';
import { WORLD_WIDTH, WORLD_HEIGHT, getSystemSkillDef } from '../../constants.js';
import { checkCircleRect, createDamageText } from '../../utils.js';

export class SpeedTank extends PlayerBase {
  constructor() {
    super('speed', { maxHp: 100, baseSpeed: 6.5, radius: 22 });
    this.baseRadius = this.baseRadius || 22;
    this._dashTrail = [];
  }

  // Q/E/R mapping: clone/stealth/vampirism
  useSkill(skillName) {
    const { Game, Input } = getPlayerContext();

    const now = Date.now();
    const config = getSystemSkillDef(this.systemId, skillName);
    const skillState = this.skills[skillName];
    if (!skillState || !config) return;

    // Cooldown gate
    if (now - skillState.lastUsed < (config.cooldown || 0)) return;

    skillState.lastUsed = now;

    if (skillName === 'clone') {
      // DASH: lướt nhanh theo hướng đang di chuyển (hoặc hướng nòng súng nếu đứng yên)
      let dx = 0, dy = 0;
      if (Input.keys.w) dy -= 1;
      if (Input.keys.s) dy += 1;
      if (Input.keys.a) dx -= 1;
      if (Input.keys.d) dx += 1;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(this.angle);
        dy = Math.sin(this.angle);
      }
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;

      const dur = config.duration || 250;
      const dashSpeed = (this.baseSpeed || this.speed || 6.5) * (config.dashSpeedMult || 3.2);

      this.dash.active = true;
      this.dash.endTime = now + dur;
      this.dash.vx = dx * dashSpeed;
      this.dash.vy = dy * dashSpeed;

      createDamageText(this.x, this.y - 40, 'DASH!', config.color || '#4FC3F7');
      return;
    }

    if (skillName === 'stealth') {
      // PHASE: miễn thương ngắn
      const dur = config.duration || 800;
      this.buffs.phase.active = true;
      this.buffs.phase.endTime = now + dur;
      if (Game && Game.ui) {
        Game.ui.removeBuff('Phase');
        Game.ui.addBuff('Phase', config.color || '#81D4FA');
      }
      createDamageText(this.x, this.y - 40, 'PHASE!', config.color || '#81D4FA');
      return;
    }

    if (skillName === 'vampirism') {
      // ADRENALINE: tăng tốc chạy + tăng tốc bắn + tăng damage tạm thời
      const dur = config.duration || 4000;
      this.buffs.adrenaline.active = true;
      this.buffs.adrenaline.endTime = now + dur;
      this.buffs.adrenaline.speedMult = config.speedMult || 1.25;
      this.buffs.adrenaline.fireMult = config.fireMult || 0.85;
      this.buffs.adrenaline.damageMult = config.damageMult || 1.3;
      if (Game && Game.ui) {
        Game.ui.removeBuff('Adren');
        Game.ui.addBuff('Adren', config.color || '#29B6F6');
      }
      createDamageText(this.x, this.y - 40, 'ADREN!', config.color || '#29B6F6');
      return;
    }
  }

  // Override update: dash physics (and keep all original update wiring)
  update(input, obstacles, enemies, projectiles, clones, turrets, pickups, coins, bossMines, game) {
    const ctx = getPlayerContext();
    let { Game, Input } = ctx;

    // Keep original injection behavior (used by other modules)
    if (game) Game = game;
    if (input) Input = input;
    if (enemies) Game.enemies = enemies;
    if (projectiles) Game.projectiles = projectiles;
    if (clones) Game.clones = clones;
    if (turrets) Game.turrets = turrets;
    if (pickups) Game.pickups = pickups;
    if (coins) Game.coins = coins;
    if (bossMines) Game.bossMines = bossMines;
    if (obstacles) Game.obstacles = obstacles;

    if (Input.keys['1']) this.selectWeapon(0);
    if (Input.keys['2']) this.selectWeapon(1);
    if (Input.keys['3']) this.selectWeapon(2);
    if (Input.keys['4']) this.selectWeapon(3);
    if (Input.keys['5']) this.selectWeapon(4);
    if (Input.keys['6']) this.selectWeapon(5);

    if (Input.keys['q']) this.useSkill('clone');
    if (Input.keys['e']) this.useSkill('stealth');
    if (Input.keys['r']) this.useSkill('vampirism');
    if (Input.keys[' ']) this.useUltimate();

    const now = Date.now();

    // Speed system expirations
    if (this.dash && this.dash.active && now > this.dash.endTime) {
      this.dash.active = false;
    }
    if (this.buffs.phase && this.buffs.phase.active && now > this.buffs.phase.endTime) {
      this.buffs.phase.active = false;
      if (Game && Game.ui) Game.ui.removeBuff('Phase');
      createDamageText(this.x, this.y - 40, 'HẾT PHASE', '#fff');
    }
    if (this.buffs.adrenaline && this.buffs.adrenaline.active && now > this.buffs.adrenaline.endTime) {
      this.buffs.adrenaline.active = false;
      if (Game && Game.ui) Game.ui.removeBuff('Adren');
      createDamageText(this.x, this.y - 40, 'HẾT ADREN', '#fff');
    }

    // Effective speed (Adrenaline + shop upgrades)
    let effSpeed = (this.baseSpeed || this.speed || 6.5);
    // Shop upgrade: Động Cơ (Lv 0 = chưa mua, mỗi cấp +5%)
    const spdLv = ((Game?.upgrades?.speedLv ?? 0) | 0);
    if (spdLv > 0) effSpeed *= (1 + spdLv * 0.05);

    if (this.buffs.adrenaline && this.buffs.adrenaline.active) {
      effSpeed *= (this.buffs.adrenaline.speedMult || 1.25);
    }

    // Movement (Dash overrides)
    // IMPORTANT: normalize diagonal movement so speed is consistent (no sqrt(2) boost).
    let dx = 0;
    let dy = 0;

    if (this.dash && this.dash.active && now <= this.dash.endTime) {
      dx = this.dash.vx;
      dy = this.dash.vy;
    } else {
      let ix = 0;
      let iy = 0;
      if (Input.keys.w) iy -= 1;
      if (Input.keys.s) iy += 1;
      if (Input.keys.a) ix -= 1;
      if (Input.keys.d) ix += 1;

      if (ix !== 0 || iy !== 0) {
        const len = Math.hypot(ix, iy) || 1;
        ix /= len;
        iy /= len;
        dx = ix * effSpeed;
        dy = iy * effSpeed;
      }
    }

    const nextX = this.x + dx;
    const nextY = this.y + dy;

    if (nextX > this.radius && nextX < WORLD_WIDTH - this.radius) {
      let collides = false;
      for (const obs of Game.obstacles) {
        if (checkCircleRect({ x: nextX, y: this.y, radius: this.radius }, obs)) {
          collides = true;
          break;
        }
      }
      if (!collides) this.x = nextX;
      else if (this.dash) this.dash.active = false;
    }

    if (nextY > this.radius && nextY < WORLD_HEIGHT - this.radius) {
      let collides = false;
      for (const obs of Game.obstacles) {
        if (checkCircleRect({ x: this.x, y: nextY, radius: this.radius }, obs)) {
          collides = true;
          break;
        }
      }
      if (!collides) this.y = nextY;
      else if (this.dash) this.dash.active = false;
    }

    // Aim
    const worldMouseX = Input.mouse.x + Camera.x;
    const worldMouseY = Input.mouse.y + Camera.y;
    this.angle = Math.atan2(worldMouseY - this.y, worldMouseX - this.x);

    // Expire item buffs
    if (this.buffs.shield.active && now > this.buffs.shield.endTime) {
      this.buffs.shield.active = false;
      const overlay = document.getElementById('shieldOverlay');
      if (overlay) overlay.style.display = 'none';
      if (Game && Game.ui) Game.ui.removeBuff('Shield');
    }
    if (this.buffs.rapid.active && now > this.buffs.rapid.endTime) {
      this.buffs.rapid.active = false;
      if (Game && Game.ui) Game.ui.removeBuff('Rapid');
    }

    if (Input.mouse.down) this.shoot(obstacles);

    if (Game && Game.ui) {
      Game.ui.updateSkillCooldown('clone', this.skills.clone.lastUsed, getSystemSkillDef(this.systemId, 'clone').cooldown);
      Game.ui.updateSkillCooldown('stealth', this.skills.stealth.lastUsed, getSystemSkillDef(this.systemId, 'stealth').cooldown);
      Game.ui.updateSkillCooldown('vampirism', this.skills.vampirism.lastUsed, getSystemSkillDef(this.systemId, 'vampirism').cooldown);
    }

    // Dash trail capture (visual only)
    if (!this._dashTrail) this._dashTrail = [];
    if (this.dash && this.dash.active && now <= this.dash.endTime) {
      this._dashTrail.push({ x: this.x, y: this.y, t: now });
      while (this._dashTrail.length > 14) this._dashTrail.shift();
    } else if (this._dashTrail.length) {
      this._dashTrail = this._dashTrail.filter(p => (now - p.t) < 260);
    }

    this.validatePosition();
  }

  // Override takeDamage: immune during Phase (and convert 50% to heal)
  takeDamage(amount, source) {
    const { Game } = getPlayerContext();
    const now = Date.now();

    if (this.buffs.phase && this.buffs.phase.active && now <= this.buffs.phase.endTime) {
      // Phase: miễn thương, và chuyển 50% sát thương nhận vào thành máu
      let a = amount;
      // Apply normal reductions (Shield + Armor) to keep balance
      if (this.buffs.shield && this.buffs.shield.active) a *= 0.3;

      const alvP = ((Game?.upgrades?.armorLv ?? 0) | 0);
      const reductionP = Math.min(0.60, alvP * 0.05);
      const finalAmountP = (a > 0) ? Math.max(1, Math.round(a * (1 - reductionP))) : a;

      const healAmt = (finalAmountP > 0) ? (finalAmountP * 0.5) : 0;
      if (healAmt > 0) {
        this.heal(healAmt);
        createDamageText(this.x, this.y - 60, `+${Math.round(healAmt)}`, '#00ff88');
      }
      return 0;
    }

    // Generic damage intake (same as base, without jugger/siege)
    let modAmount = amount;
    if (this.buffs.shield && this.buffs.shield.active) modAmount *= 0.3;

    const hasShield = (this.buffs.shield && this.buffs.shield.active);
    if (!hasShield && modAmount > 0) this.loseCurrentWeapon();

    const alv = ((Game?.upgrades?.armorLv ?? 0) | 0);
    const reduction = Math.min(0.60, alv * 0.05);
    const finalAmount = (modAmount > 0) ? Math.max(1, Math.round(modAmount * (1 - reduction))) : modAmount;

    this.hp -= finalAmount;
    if (this.hp < 0) this.hp = 0;
    if (Game && Game.ui) Game.ui.updateHealth(this.hp, this.maxHp);
    if (Game) Game.shake = 10;
    return finalAmount;
  }

  // Visual effects layer for Speed system (dash trail / phase / adrenaline)
  drawFx(ctx) {
    const now = Date.now();
    ctx.save();
    ctx.translate(this.x, this.y);

    // Dash after-image trail
    if (this._dashTrail && this._dashTrail.length) {
      for (let i = 0; i < this._dashTrail.length; i++) {
        const p = this._dashTrail[i];
        const age = now - p.t;
        const a = Math.max(0, 1 - age / 260);
        if (a <= 0) continue;
        ctx.globalAlpha = 0.35 * a;
        ctx.beginPath();
        ctx.arc(p.x - this.x, p.y - this.y, Math.max(6, this.radius * 0.55) * a, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(79, 195, 247, 1)";
        ctx.fill();
      }
    }

    // Phase aura
    if (this.buffs.phase && this.buffs.phase.active && now <= this.buffs.phase.endTime) {
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(129, 212, 250, 0.95)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Adrenaline aura
    if (this.buffs.adrenaline && this.buffs.adrenaline.active && now <= this.buffs.adrenaline.endTime) {
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(41, 182, 246, 0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }
}