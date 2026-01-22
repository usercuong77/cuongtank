// Speed tank system (Hệ Tốc Độ)
// Extracted from original Player logic. Keeps gameplay identical.

import { PlayerBase, getPlayerContext, setPlayerContext } from '../Player.js';
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

  // Override update: dash physics (kept) + defer aim/auto-shoot/ammo-cycle to PlayerBase via super.update()
  update(input, obstacles, enemies, projectiles, pickups) {
    // Ensure skills can read current input (used in useSkill())
    if (input) {
      // SpeedTank.useSkill reads Input via getPlayerContext()
      // so keep the module-scope input synced.
      // (No circular deps: uses Player module context.)
      //
      // NOTE: Game is injected elsewhere by the game loop.
      //
      // eslint-disable-next-line no-undef
    }

    // Sync context input for useSkill()
    // (Importing setPlayerContext avoids relying on stale Input.)
    //
    // We only set Input here; Game is already injected by the game loop.
    //
    // eslint-disable-next-line no-undef
    
    // setPlayerContext may not exist in older builds; guard for safety.
    try {
      if (input && typeof setPlayerContext === 'function') setPlayerContext({ Input: input });
    } catch (e) {
      // ignore
    }

    const ctx = getPlayerContext();
    const Game = ctx.Game;
    const Input = input || ctx.Input;
    if (!Input) return;

    // Trigger skills/ultimate using core-mapped keys (q/e/r/space)
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
    const spdLv = ((Game?.upgrades?.speedLv ?? 0) | 0);
    if (spdLv > 0) effSpeed *= (1 + spdLv * 0.05);
    if (this.buffs.adrenaline && this.buffs.adrenaline.active) {
      effSpeed *= (this.buffs.adrenaline.speedMult || 1.25);
    }
    this.speed = effSpeed;

    // Movement (Dash overrides)
    let dx = 0;
    let dy = 0;
    const dashActive = (this.dash && this.dash.active && now <= this.dash.endTime);
    if (dashActive) {
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

    const obsList = obstacles || Game?.obstacles || [];

    const nextX = this.x + dx;
    const nextY = this.y + dy;

    if (nextX > this.radius && nextX < WORLD_WIDTH - this.radius) {
      let collides = false;
      for (const obs of obsList) {
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
      for (const obs of obsList) {
        if (checkCircleRect({ x: this.x, y: nextY, radius: this.radius }, obs)) {
          collides = true;
          break;
        }
      }
      if (!collides) this.y = nextY;
      else if (this.dash) this.dash.active = false;
    }
    // Run core logic (aim mode, auto-shoot, ammo cycle, UI cooldown)
    // without core movement + without double skill triggers.
    const keyObj = Input.keys;
    const keysToOverride = ['w', 'a', 's', 'd', 'q', 'e', 'r', ' '];
    const hadOwn = {};
    const prevVal = {};

    if (keyObj && typeof keyObj === 'object') {
      for (const k of keysToOverride) {
        hadOwn[k] = Object.prototype.hasOwnProperty.call(keyObj, k);
        prevVal[k] = keyObj[k];
        keyObj[k] = false;
      }
    }

    try {
      super.update.apply(this, arguments);
    } finally {
      if (keyObj && typeof keyObj === 'object') {
        for (const k of keysToOverride) {
          if (hadOwn[k]) keyObj[k] = prevVal[k];
          else delete keyObj[k];
        }
      }
    }

    // Keep Speed's effective speed after super.update (super may overwrite speed).
    this.speed = effSpeed;

    // Dash trail capture (visual only)
    if (!this._dashTrail) this._dashTrail = [];
    this._dashTrail.push({ x: this.x, y: this.y, t: now, a: this.angle });
    // Keep last ~250ms of trail
    const cutoff = now - 250;
    while (this._dashTrail.length > 0 && this._dashTrail[0].t < cutoff) this._dashTrail.shift();
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
    if (Game && Game.ui) Game.ui.updateHealth(this.hp, this.maxHp, this.playerIndex || 1);
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