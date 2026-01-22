// Enemy entity (including Boss AI) - refactored to ES modules
// IMPORTANT: Keep original game logic. Only adapt globals to injected refs.

import { GameObject } from './GameObject.js';
import { Bullet } from './Bullet.js';

import { ENEMY_TYPES, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';
import {
  checkCircleRect,
  isLineBlocked,
  createDamageText,
  createComplexExplosion,
  createMuzzleFlash,
} from '../utils.js';

// Optional injected refs to avoid circular dependency on Game/WaveManager
let GameRef = null;
let WaveManagerRef = null;

/**
 * Inject shared refs used by legacy logic.
 * @param {{ Game?: any, WaveManager?: any }} ctx
 */
export function setEnemyContext(ctx = {}) {
  if (ctx.Game) GameRef = ctx.Game;
  if (ctx.WaveManager) WaveManagerRef = ctx.WaveManager;
}

function getWaveNow() {
  // Prefer injected WaveManager; fallback to global window.WaveManager if present.
  const wm = WaveManagerRef || (typeof window !== 'undefined' ? window.WaveManager : null);
  if (wm && typeof wm.wave !== 'undefined') return (wm.wave | 0) || 1;
  return 1;
}

function getScaling() {
  const wm = WaveManagerRef || (typeof window !== 'undefined' ? window.WaveManager : null);
  if (!wm) return null;
  if (wm.scaling) return wm.scaling;
  if (typeof wm.computeScaling === 'function') return wm.computeScaling();
  return null;
}

export class Enemy extends GameObject {
  constructor(x, y, typeKey, hpMultiplier = 1, dmgMultiplier = 1, speedMultiplier = 1, fireRateMultiplier = 1) {
    const config = ENEMY_TYPES[typeKey];
    let radius = config.radius;
    if (typeKey === 'BOSS') radius = 70;
    super(x, y, radius);

    this.id = Math.random().toString(36).substr(2, 9);
    this.typeKey = typeKey;
    this.config = config;
    this.dmgMult = dmgMultiplier;
    this.speedMult = speedMultiplier;
    this.fireRateMult = fireRateMultiplier;
    this.contactDamage = Math.min(25, Math.round(5 * this.dmgMult));
    this.maxHp = config.maxHp * hpMultiplier;
    this.hp = this.maxHp;
    this.angle = 0;

    this.effects = {
      stun: { active: false, endTime: 0 },
      burn: { active: false, endTime: 0, nextTick: 0, damage: 0 },
      slow: { active: false, endTime: 0, mult: 1 },
    };

    this.lastShot = 0;
    this.bossState = 0;
    this.bossTimer = 0;

    // refs (set each update)
    this._projectilesRef = null;
    this._enemiesRef = null;
    this._bossMinesRef = null;
  }

  applyEffect(effectConfig) {
    // Boss is immune to STUN
    if (this.typeKey === 'BOSS' && effectConfig.type === 'STUN') return;
    const now = Date.now();
    if (effectConfig.type === 'STUN') {
      this.effects.stun.active = true;
      this.effects.stun.endTime = now + effectConfig.duration;
    } else if (effectConfig.type === 'BURN') {
      this.effects.burn.active = true;
      this.effects.burn.endTime = now + effectConfig.duration;
      this.effects.burn.nextTick = now + effectConfig.tickInterval;
      this.effects.burn.damage = effectConfig.tickDamage;
    } else if (effectConfig.type === 'SLOW') {
      // Slow can affect all enemies (including boss) unless you want to add immunity.
      this.effects.slow.active = true;
      this.effects.slow.endTime = now + (effectConfig.duration || 500);
      this.effects.slow.mult = (effectConfig.mult != null) ? effectConfig.mult : 0.5;
    }
  }

  /**
   * Update enemy logic.
   * NOTE: Keep legacy signature expansion but preserve original behavior.
   */
  update(players, clones, obstacles, enemies, projectiles, bossMines) {
    // Capture injected refs (for spawning bullets/minions/mines)
    this._projectilesRef = projectiles || (GameRef ? GameRef.projectiles : null);
    this._enemiesRef = enemies || (GameRef ? GameRef.enemies : null);
    this._bossMinesRef = bossMines || (GameRef ? GameRef.bossMines : null);

    const now = Date.now();
    if (this.effects.stun.active && now <= this.effects.stun.endTime) return;

    if (this.effects.burn.active) {
      if (now > this.effects.burn.endTime) this.effects.burn.active = false;
      else if (now >= this.effects.burn.nextTick) {
        this.hp -= this.effects.burn.damage;
        this.effects.burn.nextTick = now + 500;
        createDamageText(this.x, this.y - 10, this.effects.burn.damage, '#FF5722');
      }
    }

    // Slow (e.g., Mage Blizzard)
    let slowMult = 1;
    if (this.effects.slow.active) {
      if (now > this.effects.slow.endTime) this.effects.slow.active = false;
      else slowMult = this.effects.slow.mult || 1;
    }

    // STEP 11: In co-op, enemies should chase the nearest player (not only P1).
    // Back-compat: older callsites may still pass a single player object.
    const playerList = Array.isArray(players)
      ? players
      : (players ? [players] : (GameRef && Array.isArray(GameRef.players) ? GameRef.players : []));

    let targets = [];
    for (const p of playerList) {
      if (!p) continue;
      // STEP 3.2: ignore dead players in co-op (hp <= 0)
      if (p.hp != null && p.hp <= 0) continue;
      if (p.isStealth) continue;
      targets.push(p);
    }
    targets = targets.concat(clones || []);

    let target = null;
    if (targets.length > 0) {
      let minDst = Infinity;
      targets.forEach((t) => {
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d < minDst) {
          minDst = d;
          target = t;
        }
      });
    }

    if (!target) {
      this.x += Math.cos(now / 1000) * 1;
      this.y += Math.sin(now / 1000) * 1;
      this.validatePosition();
      return;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    let desiredAngle = Math.atan2(dy, dx);
    let moveSpeed = this.config.speed * this.speedMult;

    // =========================
    // BOSS LOGIC (COPY from original, adapted only for refs)
    // =========================
    if (this.typeKey === 'BOSS') {
      const hpBar = document.getElementById('bossHealthBar');
      const hpContainer = document.getElementById('bossHealthContainer');
      if (hpContainer && hpContainer.style.display !== 'block') hpContainer.style.display = 'block';
      if (hpBar) hpBar.style.width = `${(this.hp / this.maxHp) * 100}%`;

      // --- BOSS SKILLS (Húc / Bắn vòng tròn / Mìn / Gọi lính) ---
      if (!this.bossAI) {
        this.bossAI = {
          state: 'idle',
          stateEnd: 0,
          chargeDir: 0,
          chargeVx: 0,
          chargeVy: 0,
          nextCharge: now + 2600,
          nextRadial: now + 3400,
          nextMines: now + 5200,
          nextSummon: now + 7800,
        };
        this._lastBossUpdate = now;
      }
      const ai = this.bossAI;

      const dtBoss = Math.max(0.5, Math.min(2.0, (now - (this._lastBossUpdate || now)) / 16.666));
      this._lastBossUpdate = now;

      const hpPct = this.maxHp > 0 ? this.hp / this.maxHp : 1;

      // Boss phase: dưới 25% máu sẽ CUỒNG NỘ. Mức cuồng nộ tăng theo màn (wave).
      const waveNow = getWaveNow();
      const enrageLvl = Math.max(0, Math.min(1, (waveNow - 1) / 15)); // 0..1
      const shouldEnrage = hpPct <= 0.25;
      if (shouldEnrage && !ai.enraged) {
        ai.enraged = true;
        createComplexExplosion(this.x, this.y, '#FF1744');
        createDamageText(this.x, this.y - 80, 'CUỒNG NỘ!', '#FF1744');
      }
      if (!shouldEnrage) ai.enraged = false;

      const enrageCdMult = ai.enraged ? Math.max(0.55, 0.85 - 0.25 * enrageLvl) : 1;
      const enrageShootMult = ai.enraged ? 1.15 + 0.45 * enrageLvl : 1;
      const enrageMoveMult = ai.enraged ? 1.1 + 0.2 * enrageLvl : 1;

      // Tuning di chuyển boss (để không dính người chơi quá gắt)
      moveSpeed = (dist > 320 ? 1.35 : 0.55) * this.speedMult * enrageMoveMult;

      // --- Resolve casting / state ---
      if (ai.state === 'charge_windup') {
        moveSpeed = 0;
        this.angle = ai.chargeDir;
        if (now >= ai.stateEnd) {
          ai.state = 'charge';
          ai.stateEnd = now + 900;
          const spd = (10.5 + (hpPct < 0.5 ? 1.5 : 0) + (ai.enraged ? 1.8 + 2.2 * enrageLvl : 0)) * this.speedMult;
          ai.chargeVx = Math.cos(ai.chargeDir) * spd;
          ai.chargeVy = Math.sin(ai.chargeDir) * spd;
          this.contactDamage = Math.round(18 * this.dmgMult * (ai.enraged ? 1.15 + 0.35 * enrageLvl : 1));
        }
      } else if (ai.state === 'charge') {
        // Dash theo thời gian (ổn định 60/120fps)
        this.x += ai.chargeVx * dtBoss;
        this.y += ai.chargeVy * dtBoss;
        moveSpeed = 0;
        this.angle = ai.chargeDir;
        this.contactDamage = Math.round(18 * this.dmgMult * (ai.enraged ? 1.15 + 0.35 * enrageLvl : 1));
        if (now >= ai.stateEnd) {
          ai.state = 'idle';
          this.contactDamage = Math.round(10 * this.dmgMult * (ai.enraged ? 1.1 + 0.3 * enrageLvl : 1));
        }
      } else if (ai.state === 'radial_windup') {
        moveSpeed *= 0.35;
        if (now >= ai.stateEnd) {
          const count = (hpPct < 0.5 ? 26 : 20) + (ai.enraged ? 4 + Math.round(4 * enrageLvl) : 0);
          for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2;
            this.shoot(ang, 'FAST');
          }
          createDamageText(this.x, this.y - 70, 'BẮN VÒNG TRÒN!', '#FF1744');
          ai.state = 'idle';
        }
      } else if (ai.state === 'summon_cast') {
        moveSpeed *= 0.25;
        if (now >= ai.stateEnd) {
          const cnt = (hpPct < 0.5 ? 5 : 4) + (ai.enraged ? 2 + Math.round(1 * enrageLvl) : 0);
          const types = ['RED', 'RED', 'RED', 'BLACK', 'YELLOW', 'PURPLE'];
          const sc = getScaling();

          for (let i = 0; i < cnt; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r = 120 + Math.random() * 80;
            let sx = this.x + Math.cos(ang) * r;
            let sy = this.y + Math.sin(ang) * r;
            sx = Math.max(80, Math.min(WORLD_WIDTH - 80, sx));
            sy = Math.max(80, Math.min(WORLD_HEIGHT - 80, sy));
            const tk = types[Math.floor(Math.random() * types.length)];

            const hpM = sc ? sc.hpMult : 1;
            const dmgM = sc ? sc.dmgMult : 1;
            const spdM = sc ? sc.speedMult : 1;
            const frM = sc ? sc.fireRateMult : 1;

            if (this._enemiesRef) {
              this._enemiesRef.push(new Enemy(sx, sy, tk, hpM, dmgM, spdM, frM));
            }
          }
          createComplexExplosion(this.x, this.y, '#FF1744');
          createDamageText(this.x, this.y - 70, 'GỌI LÍNH!', '#FF1744');
          ai.state = 'idle';
        }
      }

      // --- Trigger new abilities (idle only) ---
      if (ai.state === 'idle') {
        this.contactDamage = Math.round(10 * this.dmgMult);

        const options = [];
        if (now >= ai.nextCharge && dist < 520) options.push('charge');
        if (now >= ai.nextRadial) options.push('radial');
        if (now >= ai.nextMines) options.push('mines');
        if (now >= ai.nextSummon) options.push('summon');

        if (options.length > 0) {
          const pick = options[Math.floor(Math.random() * options.length)];

          if (pick === 'charge') {
            ai.state = 'charge_windup';
            ai.chargeDir = desiredAngle;
            ai.stateEnd = now + 600;
            ai.nextCharge = now + (hpPct < 0.5 ? 6500 : 7800) * enrageCdMult;
            createDamageText(this.x, this.y - 70, 'CHUẨN BỊ HÚC!', '#FF1744');
          } else if (pick === 'radial') {
            ai.state = 'radial_windup';
            ai.stateEnd = now + 550;
            ai.nextRadial = now + (hpPct < 0.5 ? 6000 : 7200) * enrageCdMult;
          } else if (pick === 'mines') {
            const mineCount = (hpPct < 0.5 ? 10 : 8) + (ai.enraged ? 3 + Math.round(3 * enrageLvl) : 0);
            const mineRadius = 80;
            const delay = ai.enraged ? Math.max(900, 1300 - Math.round(250 * enrageLvl)) : 1500;
            const dmgBase = 18 + (hpPct < 0.5 ? 4 : 0);
            const dmg = Math.round(dmgBase * this.dmgMult * (ai.enraged ? 1.2 + 0.3 * enrageLvl : 1));

            if (!this._bossMinesRef) {
              // if GameRef exists, create and attach.
              if (GameRef && !GameRef.bossMines) GameRef.bossMines = [];
              this._bossMinesRef = (GameRef && GameRef.bossMines) ? GameRef.bossMines : [];
            }

            for (let i = 0; i < mineCount; i++) {
              const ang = (i / mineCount) * Math.PI * 2 + Math.random() * 0.25;
              const r = 110 + Math.random() * 90;
              let mx = this.x + Math.cos(ang) * r;
              let my = this.y + Math.sin(ang) * r;
              mx = Math.max(60, Math.min(WORLD_WIDTH - 60, mx));
              my = Math.max(60, Math.min(WORLD_HEIGHT - 60, my));
              this._bossMinesRef.push({
                x: mx,
                y: my,
                radius: mineRadius,
                spawnAt: now,
                detonateAt: now + delay,
                delay: delay,
                damage: dmg,
              });
            }
            createDamageText(this.x, this.y - 70, 'THẢ MÌN!', '#FF9800');
            ai.nextMines = now + (hpPct < 0.5 ? 8000 : 9800) * enrageCdMult;
          } else if (pick === 'summon') {
            ai.state = 'summon_cast';
            ai.stateEnd = now + 650;
            ai.nextSummon = now + (hpPct < 0.5 ? 11000 : 13500) * enrageCdMult;
            createDamageText(this.x, this.y - 70, 'GỌI LÍNH!', '#FF1744');
          }
        }
      }

      // --- Baseline shooting (disable while charging/windup casts) ---
      const canShoot = ai.state === 'idle';
      if (canShoot && now - this.lastShot > this.config.fireRate / (this.fireRateMult * enrageShootMult)) {
        this.shoot(desiredAngle, 'FAST');
        this.lastShot = now;
      }
    } else {
      // =========================
      // NORMAL ENEMIES (original)
      // =========================
      if (this.config.behavior === 'ORBIT' && dist < 250) desiredAngle += Math.PI / 2;
      else if (this.config.behavior === 'SNIPER') {
        if (dist < 400) desiredAngle += Math.PI;
        else if (dist < 450) moveSpeed = 0;
      }
      const fr = this.config.fireRate / this.fireRateMult;
      if (this.config.fireRate && now - this.lastShot > fr) {
        if (dist < 800 && !isLineBlocked(this.x, this.y, target.x, target.y, obstacles)) {
          this.shoot(desiredAngle, 'NORMAL');
          this.lastShot = now;
        }
      }
    }

    // Pathing + obstacle collision (original)
    let bestAngle = desiredAngle;
    let foundPath = false;
    const checkAngles = [0, 20, -20, 45, -45, 65, -65, 90, -90, 110, -110, 135, -135, 160, -160, 180];
    for (let offset of checkAngles) {
      const testAngle = desiredAngle + (offset * Math.PI) / 180;
      if (isNaN(testAngle)) continue;
      const lookAhead = Math.max(this.radius * 1.5, this.config.speed * this.speedMult * 5);
      const nextX = this.x + Math.cos(testAngle) * lookAhead;
      const nextY = this.y + Math.sin(testAngle) * lookAhead;
      let collided = false;
      if (nextX < this.radius || nextX > WORLD_WIDTH - this.radius || nextY < this.radius || nextY > WORLD_HEIGHT - this.radius) collided = true;
      if (!collided) {
        if (this.typeKey !== 'BOSS') {
          for (let obs of obstacles) {
            if (checkCircleRect({ x: nextX, y: nextY, radius: this.radius + 5 }, obs)) {
              collided = true;
              break;
            }
          }
        }
      }
      if (!collided) {
        bestAngle = testAngle;
        foundPath = true;
        break;
      }
    }

    // Apply slow at the very end so it affects all behaviors uniformly.
    moveSpeed *= slowMult;
    if (moveSpeed > 0 && (foundPath || this.typeKey === 'BOSS') && !isNaN(bestAngle)) {
      this.x += Math.cos(bestAngle) * moveSpeed;
      this.y += Math.sin(bestAngle) * moveSpeed;
      this.angle = bestAngle;
    } else {
      this.angle = Math.atan2(dy, dx);
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      let obs = obstacles[i];
      if (checkCircleRect({ x: this.x, y: this.y, radius: this.radius }, obs)) {
        if (this.typeKey === 'BOSS') {
          obstacles.splice(i, 1);
          createComplexExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, '#546E7A');
          createDamageText(this.x, this.y - 50, 'CRUSH!', '#D50000');
        } else {
          const anglePush = Math.atan2(this.y - (obs.y + obs.height / 2), this.x - (obs.x + obs.width / 2));
          if (!isNaN(anglePush)) {
            this.x += Math.cos(anglePush) * 2;
            this.y += Math.sin(anglePush) * 2;
          }
        }
      }
    }

    this.x = Math.max(0, Math.min(WORLD_WIDTH, this.x));
    this.y = Math.max(0, Math.min(WORLD_HEIGHT, this.y));
    this.validatePosition();
  }

  shoot(angle, mode) {
    if (isNaN(angle)) return;
    let speed = this.config.bulletSpeed;
    let dmg = this.config.bulletDmg;
    let color = this.typeKey === 'YELLOW' ? '#FFF59D' : '#E040FB';
    if (this.typeKey === 'BOSS') {
      color = '#FF1744';
      if (mode === 'HEAVY') {
        dmg = 40;
      }
      if (mode === 'FAST') {
        speed = 12;
      }
    }
    dmg = Math.round(dmg * this.dmgMult);
    const bulletConfig = { damage: dmg, speed: speed, color: color, radius: 6 };
    const bullet = new Bullet(this.x, this.y, angle, 'NORMAL', bulletConfig, 'ENEMY');
    bullet.sourceEnemy = this;
    if (mode === 'HEAVY') bullet.radius = 10;

    if (this._projectilesRef) this._projectilesRef.push(bullet);
    createMuzzleFlash(this.x, this.y, angle, color);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.effects.stun.active) {
      ctx.strokeStyle = '#00BCD4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.rotate(this.angle);
    ctx.fillStyle = this.config.color;
    if (this.config.outline) {
      ctx.strokeStyle = this.config.outline;
      ctx.lineWidth = 3;
      ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
    }
    ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
    if (this.typeKey === 'BOSS') {
      ctx.fillStyle = '#B71C1C';
      ctx.fillRect(-20, -20, 40, 40);
      ctx.strokeStyle = '#FFEB3B';
      ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, -5, this.radius + 5, 10);
    ctx.restore();

    // Boss telegraphs (dễ né - dễ đọc)
    if (this.typeKey === 'BOSS' && this.bossAI) {
      const now2 = Date.now();
      const ai = this.bossAI;

      if (ai.enraged) {
        // Aura cuồng nộ (nhìn phát biết ngay)
        const pulse = 0.5 + 0.5 * Math.sin(now2 / 80);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,23,68,0.65)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 10 + pulse * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (ai.state === 'charge_windup') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,23,68,0.9)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(ai.chargeDir) * 280, this.y + Math.sin(ai.chargeDir) * 280);
        ctx.stroke();
        ctx.restore();
      }

      if (ai.state === 'radial_windup') {
        ctx.save();
        const t = Math.max(0, Math.min(1, (ai.stateEnd - now2) / 550));
        const r = 110 + (1 - t) * 50;
        ctx.strokeStyle = 'rgba(255,23,68,0.75)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (ai.state === 'summon_cast') {
        ctx.save();
        const t = Math.max(0, Math.min(1, (ai.stateEnd - now2) / 650));
        const r = 90 + (1 - t) * 70;
        ctx.strokeStyle = 'rgba(255,235,59,0.75)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Small enemies HP bar
    if (this.typeKey !== 'BOSS') {
      const hpPercent = this.hp / this.maxHp;
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30, 4);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30 * hpPercent, 4);
    }
  }
}
