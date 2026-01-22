// EngineerTank (Engineer system)
// Extracted from original Player logic (systemId === 'engineer') with minimal refactor.

import { PlayerBase, getPlayerContext } from '../Player.js';
import { getSystemSkillDef } from '../../constants.js';
import { checkCircleRect, createDamageText, createComplexExplosion, applySkillDamage } from '../../utils.js';
import { Turret } from '../Turret.js';
import { Particle } from '../Particle.js';

export class EngineerTank extends PlayerBase {
  constructor() {
    // Stats are unchanged from current build (safe refactor).
    super('engineer', { maxHp: 100, baseSpeed: 6.5, radius: 22 });
  }

  // Q/E/R mapping keeps skill keys: clone/stealth/vampirism
  useSkill(skillName) {
    const now = Date.now();
    const config = getSystemSkillDef(this.systemId, skillName);
    const skillState = this.skills[skillName];
    if (!skillState || !config) return;

    // Cooldown gate
    if (now - skillState.lastUsed < (config.cooldown || 0)) return;

    const { Game } = getPlayerContext();
    if (!Game) return;

    skillState.lastUsed = now;

    // Q - Place Turret
    if (skillName === 'clone') {
      const maxTurrets = config.maxTurrets || 1;
      if (!Game.turrets) Game.turrets = [];
      if (Game.turrets.length >= maxTurrets) {
        const old = Game.turrets.shift();
        if (old) old.markedForDeletion = true;
      }

      // Find a valid placement position (not stuck in obstacles)
      const off = 55;
      const candidates = [
        { x: this.x + Math.cos(this.angle) * off, y: this.y + Math.sin(this.angle) * off },
        { x: this.x - Math.cos(this.angle) * off, y: this.y - Math.sin(this.angle) * off },
        { x: this.x + off, y: this.y },
        { x: this.x - off, y: this.y },
        { x: this.x, y: this.y + off },
        { x: this.x, y: this.y - off }
      ];

      let pos = candidates[0];
      outer: for (const c of candidates) {
        for (const obs of Game.obstacles) {
          if (checkCircleRect({ x: c.x, y: c.y, radius: 22 }, obs)) continue outer;
        }
        pos = c;
        break;
      }

      const turret = new Turret(pos.x, pos.y, {
        duration: config.duration || 10000,
        range: config.range || 650,
        fireRate: config.fireRate || 320,
        color: config.color || '#81C784',
        bulletColor: config.bulletColor || '#66BB6A',
        bulletDmgMult: (typeof config.bulletDmgMult === 'number') ? config.bulletDmgMult : 0.65
      });
      Game.turrets.push(turret);
      createDamageText(this.x, this.y - 40, 'TURRET!', config.color || '#81C784');
      return;
    }

    // E - Repair (instant heal)
    if (skillName === 'stealth') {
      const healAmt = config.heal || 30;
      if (typeof this.heal === 'function') this.heal(healAmt);
      else {
        this.hp = Math.min(this.maxHp, this.hp + healAmt);
        Game.ui.updateHealth(this.hp, this.maxHp, this.playerIndex || 1);
      }
      createDamageText(this.x, this.y - 40, 'REPAIR!', config.color || '#A5D6A7');
      createComplexExplosion(this.x, this.y, '#4CAF50', 10);
      return;
    }

    // R - EMP (AOE stun + clears enemy bullets + freezes boss briefly)
    if (skillName === 'vampirism') {
      // Tuning: EMP radius x3; stun/freeze duration x2
      const radius = (config.radius || 340) * 3;
      const dur = (config.stunDuration || 1200) * 2;
      const now2 = Date.now();
      let hit = 0;
      let bulletsCleared = 0;
      let bossFrozen = 0;

      // 1) Clear enemy projectiles in range
      if (Game.projectiles && Game.projectiles.length) {
        for (const b of Game.projectiles) {
          if (!b || b.markedForDeletion) continue;
          if (b.owner !== 'ENEMY') continue;
          const dB = Math.hypot(b.x - this.x, b.y - this.y);
          if (dB <= radius) {
            b.markedForDeletion = true;
            bulletsCleared++;
          }
        }
      }

      // 2) Stun normal enemies; boss gets a short 'freeze' + small damage
      for (const e of Game.enemies) {
        if (!e || e.markedForDeletion || e.hp <= 0) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d > radius) continue;

        if (e.typeKey === 'BOSS') {
          // Bypass STUN immunity: use existing stun slot as a short freeze
          if (e.effects && e.effects.stun) {
            e.effects.stun.active = true;
            // Double the previous freeze cap as well (was 900ms)
            e.effects.stun.endTime = now2 + Math.min(dur, 1800);
          }
          const base = (typeof e.maxHp === 'number' && e.maxHp > 0) ? e.maxHp : e.hp;
          const bossDmg = Math.max(30, Math.round(base * 0.015));
          const dealt = applySkillDamage(e, bossDmg, '#B3E5FC', { showText: false });
          createDamageText(e.x, e.y - 10, '-' + dealt, '#B3E5FC');
          createDamageText(e.x, e.y - 32, '\u0110\u00D3NG B\u0102NG!', '#00E5FF');
          createComplexExplosion(e.x, e.y, '#00E5FF', 10);
          bossFrozen++;
        } else {
          if (typeof e.applyEffect === 'function') e.applyEffect({ type: 'STUN', duration: dur });
          hit++;
        }
      }

      // Shockwave visual
      if (!Game.particles) Game.particles = [];
      Game.particles.push(new Particle(this.x, this.y, {
        type: 'shockwave',
        color: '#00E5FF',
        size: 12,
        maxRadius: radius,
        decay: 0.03
      }));

      createDamageText(this.x, this.y - 40, 'EMP! (' + hit + ')', '#00E5FF');
      if (bulletsCleared > 0) createDamageText(this.x, this.y - 62, 'TAN \u0110\u1EA0N: ' + bulletsCleared, '#B3E5FC');
      if (bossFrozen > 0) createDamageText(this.x, this.y - 84, 'BOSS \u0110\u00D3NG B\u0102NG!', '#00E5FF');
      Game.shake = Math.max(Game.shake, 14);
      return;
    }
  }
}
