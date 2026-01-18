// Mage Tank (Glass Cannon)
// Q: Fireball - big glowing orb, no trail, large AOE falloff + shockwave ring
// E: Blink - teleport forward by turret direction (safe placement)
// R: Blizzard - moving zone that stops when an enemy enters inner core, resumes when core is empty

import { PlayerBase, getPlayerContext } from '../Player.js';
import { SKILL_CONFIG, WORLD_WIDTH, WORLD_HEIGHT } from '../../constants.js';
import { checkCircleRect, createMuzzleFlash, createComplexExplosion, createDamageText, applySkillDamage } from '../../utils.js';
import { Bullet } from '../Bullet.js';

export class MageTank extends PlayerBase {
  constructor() {
    // HP 80, speed 6.0
    super('mage', { maxHp: 80, baseSpeed: 6.0 });

    this.blizzard = {
      active: false,
      x: 0,
      y: 0,
      endTime: 0,
      nextTick: 0,
      moving: true,
      dirAngle: 0
    };
  }

  update(input, obstacles, enemies, projectiles, clones, turrets, pickups, coins, bossMines, game) {
    // Core update (movement, shooting, collisions, cooldown UI)
    super.update(input, obstacles, enemies, projectiles, clones, turrets, pickups, coins, bossMines, game);

    const { Game } = getPlayerContext();
    if (!Game) return;

    const now = Date.now();
    if (!this.blizzard.active) return;

    const cfg = SKILL_CONFIG.mage.skills.vampirism;

    // Expire
    if (now >= this.blizzard.endTime) {
      this.blizzard.active = false;
      return;
    }

    // Stop when an enemy is inside the inner core. Resume when core is empty.
    let hasEnemyInCore = false;
    if (Game.enemies) {
      for (const e of Game.enemies) {
        if (!e || e.markedForDeletion || e.hp <= 0) continue;
        const d = Math.hypot(e.x - this.blizzard.x, e.y - this.blizzard.y);
        if (d <= (cfg.innerRadius || 60)) {
          hasEnemyInCore = true;
          break;
        }
      }
    }

    this.blizzard.moving = !hasEnemyInCore;

    // Move slowly forward in turret direction while moving
    if (this.blizzard.moving) {
      this.blizzard.dirAngle = this.angle; // allow steering
      const spd = (cfg.moveSpeed != null) ? cfg.moveSpeed : 2.6;
      this.blizzard.x += Math.cos(this.blizzard.dirAngle) * spd;
      this.blizzard.y += Math.sin(this.blizzard.dirAngle) * spd;

      // Clamp inside world
      this.blizzard.x = Math.max(0, Math.min(WORLD_WIDTH, this.blizzard.x));
      this.blizzard.y = Math.max(0, Math.min(WORLD_HEIGHT, this.blizzard.y));
    }

    // NEW: Blizzard clears enemy projectiles that enter its area
    // (do not touch player bullets or mines)
    if (Game.projectiles && Game.projectiles.length) {
      const r = cfg.radius || 220;
      for (let i = Game.projectiles.length - 1; i >= 0; i--) {
        const p = Game.projectiles[i];
        if (!p || p.markedForDeletion) continue;
        if (p.owner !== 'ENEMY') continue;
        const d = Math.hypot(p.x - this.blizzard.x, p.y - this.blizzard.y);
        if (d <= r) p.markedForDeletion = true;
      }
    }

    // Damage tick
    if (now >= this.blizzard.nextTick) {
      this.dealBlizzardTickDamage();
      this.blizzard.nextTick = now + (cfg.tickInterval || 500);
    }
  }

  useSkill(skillKey) {
    const { Game } = getPlayerContext();
    if (!Game) return;

    // Cooldown gating + UI cooldown sync (uses base `this.skills.*.lastUsed`)
    const now = Date.now();
    const cfgAll = SKILL_CONFIG.mage && SKILL_CONFIG.mage.skills ? SKILL_CONFIG.mage.skills : null;
    const cfg = cfgAll ? cfgAll[skillKey] : null;
    const st = this.skills && this.skills[skillKey] ? this.skills[skillKey] : null;
    if (cfg && st) {
      const cd = cfg.cooldown || 0;
      if (cd > 0 && (now - (st.lastUsed || 0)) < cd) return;
      st.lastUsed = now;
      if (cfg.castText) createDamageText(this.x, this.y - 70, cfg.castText, cfg.color || '#fff');
    }

    // Q - Fireball
    if (skillKey === 'clone') {
      const wep = this.getCurrentWeaponObj ? this.getCurrentWeaponObj() : { level: 1 };
      const wLv = (wep && typeof wep.level === 'number') ? wep.level : 1;
      const damageBase = 60 + (wLv * 12);
      const damage = Math.round(damageBase * 3.2); // sát thương lớn, tăng theo level súng

      const fireball = {
        speed: (11/3),
        damage,
        radius: 36,
        color: '#FF3D00',
        noTrail: true,
        glowBlur: 80,
        glowColor: '#FF6E40',

        special: 'EXPLODE',
        explosionRadius: 260,
        splashFactor: 1.0,
        splashMin: 0.0,
        showShockwave: true
      };

      const b = new Bullet(this.x, this.y, this.angle, 'NORMAL', fireball, 'PLAYER');
      b.typeKey = 'FIREBALL';
      Game.projectiles.push(b);

      createMuzzleFlash(this.x, this.y, this.angle, fireball.color);

      // Tiny recoil for impact feel
      this.x -= Math.cos(this.angle) * 4;
      this.y -= Math.sin(this.angle) * 4;
      return;
    }

    // E - Blink (forward)
    if (skillKey === 'stealth') {
      const dist = 220 * 5;
      const oldX = this.x;
      const oldY = this.y;

      createComplexExplosion(oldX, oldY, '#E040FB', 14);

      const dirX = Math.cos(this.angle);
      const dirY = Math.sin(this.angle);

      const obs = Game.obstacles || [];
      const r = (this.radius != null) ? this.radius : 22;

      let placed = false;
      for (let d = dist; d >= 40; d -= 20) {
        const tx = oldX + dirX * d;
        const ty = oldY + dirY * d;

        // Clamp
        const cx = Math.max(r, Math.min(WORLD_WIDTH - r, tx));
        const cy = Math.max(r, Math.min(WORLD_HEIGHT - r, ty));

        let blocked = false;
        for (const o of obs) {
          if (checkCircleRect({ x: cx, y: cy, radius: r + 2 }, o)) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          this.x = cx;
          this.y = cy;
          placed = true;
          break;
        }
      }

      // If everything is blocked, stay put (avoid clipping into rocks)
      if (!placed) {
        this.x = oldX;
        this.y = oldY;
      }

      createComplexExplosion(this.x, this.y, '#E040FB', 14);
      return;
    }

    // R - Blizzard (moving zone)
    if (skillKey === 'vampirism') {
      const cfg = SKILL_CONFIG.mage.skills.vampirism;
      const now = Date.now();

      this.blizzard.active = true;
      this.blizzard.x = this.x;
      this.blizzard.y = this.y;
      this.blizzard.endTime = now + (cfg.duration || 5000);
      this.blizzard.nextTick = now;
      this.blizzard.moving = true;
      this.blizzard.dirAngle = this.angle;
      return;
    }
  }

  dealBlizzardTickDamage() {
    const { Game } = getPlayerContext();
    if (!Game || !Game.enemies) return;

    const cfg = SKILL_CONFIG.mage.skills.vampirism;
    const r = cfg.radius || 220;

    for (const e of Game.enemies) {
      if (!e || e.markedForDeletion || e.hp <= 0) continue;
      const d = Math.hypot(e.x - this.blizzard.x, e.y - this.blizzard.y);
      if (d <= r) {
        const tickDmg = ((cfg.tickDamage != null) ? cfg.tickDamage : 15) * 2;
        const dealt = applySkillDamage(e, tickDmg, '#00E5FF', { showText: false });
        createDamageText(e.x, e.y, String(dealt), '#00E5FF');

        if (typeof e.applyEffect === 'function') {
          e.applyEffect({ type: 'SLOW', duration: cfg.slowDuration || 650, mult: cfg.slowMult || 0.5 });
        }
      }
    }
  }

  draw(ctx) {
    // Draw blizzard under the tank
    if (this.blizzard.active) this.drawBlizzard(ctx);

    // Purple glow for mage body
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#E040FB';
    super.draw(ctx);
    ctx.restore();
  }

  drawBlizzard(ctx) {
    const cfg = SKILL_CONFIG.mage.skills.vampirism;
    const r = cfg.radius || 220;
    const core = cfg.innerRadius || 60;

    ctx.save();
    ctx.translate(this.blizzard.x, this.blizzard.y);

    // Outer zone
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.10)';
    ctx.fill();
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner core (stop detector)
    ctx.beginPath();
    ctx.arc(0, 0, core, 0, Math.PI * 2);
    ctx.strokeStyle = this.blizzard.moving ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Snow particles swirling
    const t = Date.now() / 250;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 10; i++) {
      const ang = (i * Math.PI / 5) + t;
      const dist = (r * 0.55) + Math.sin(t * 2 + i) * 18;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
