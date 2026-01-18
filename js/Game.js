// js/Game.js
// Heart of the game (ES6 Modules)
// Refactor goal: keep original logic; only wire modules + draw(ctx)/update(args).

import { MAX } from './core/MaxSystem.js';
import { Input } from './core/Input.js';
import { Admin, setAdminContext } from './core/Admin.js';

import {
  WORLD_WIDTH as CONST_WORLD_WIDTH,
  WORLD_HEIGHT as CONST_WORLD_HEIGHT,
  MINIMAP_SIZE,
  SKILL_CONFIG
} from './constants.js';

import {
  setUtilsContext,
  checkCollision,
  checkCircleRect,
  createComplexExplosion,
  createDamageText,
  chainLightning,
  dropGold,
  dropPickup,
  dropBossWeapon,
  drawMiniMap
} from './utils.js';

import { setPlayerContext } from './entities/Player.js';
import { createPlayerBySystem } from './entities/tanks/index.js';
import { setEnemyContext } from './entities/Enemy.js';
import { setBulletContext } from './entities/Bullet.js';
import { setTurretContext } from './entities/Turret.js';

import { Particle } from './entities/Particle.js';
import { Pickup, Coin } from './entities/Pickup.js';
import { Obstacle } from './entities/Obstacle.js';

import { Shop, setShopContext } from './managers/Shop.js';
import { WaveManager, setWaveManagerContext } from './managers/WaveManager.js';
import { UIManager } from './managers/UIManager.js';

export const canvas = document.getElementById('gameCanvas');
if (!canvas) throw new Error('Missing <canvas id="gameCanvas"> in index.html');
export const ctx = canvas.getContext('2d');

// Keep original globals (some refactored modules still read these as globals).
export let WORLD_WIDTH = CONST_WORLD_WIDTH;
export let WORLD_HEIGHT = CONST_WORLD_HEIGHT;

globalThis.canvas = canvas;
globalThis.MINIMAP_SIZE = MINIMAP_SIZE;

globalThis.WORLD_WIDTH = WORLD_WIDTH;
globalThis.WORLD_HEIGHT = WORLD_HEIGHT;

export const Camera = {
  x: 0,
  y: 0,
  update(player) {
    if (!player || isNaN(player.x) || isNaN(player.y)) return;
    this.x = player.x - canvas.width / 2;
    this.y = player.y - canvas.height / 2;
    this.x = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, this.x));
    this.y = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, this.y));
    if (isNaN(this.x)) this.x = 0;
    if (isNaN(this.y)) this.y = 0;
  }
};

globalThis.Camera = Camera;

export const Game = {
  // State
  selectedSystemId: 'default',
  active: false,
  paused: false,
  endlessMode: false,

  // Runtime
  player: null,
  enemies: [],
  clones: [],
  turrets: [],
  projectiles: [],
  particles: [],
  pickups: [],
  coins: [],
  bossMines: [],
  texts: [],
  obstacles: [],

  // Progression
  score: 0,
  gold: 0,
  upgrades: { maxHpLv: 0, dmgLv: 0, fireRateLv: 0, speedLv: 0, magnetLv: 0, armorLv: 0 },

  // Effects
  shake: 0,
  _fpsCapLast: 0,

  // UI
  ui: null,

  ensureUI() {
    if (!this.ui) this.ui = new UIManager();
  },

  init() {
    // Keep original world sizing behavior
    WORLD_WIDTH = canvas.width * 3;
    WORLD_HEIGHT = canvas.height * 3;
    globalThis.WORLD_WIDTH = WORLD_WIDTH;
    globalThis.WORLD_HEIGHT = WORLD_HEIGHT;

    this.ensureUI();

    this.player = createPlayerBySystem(this.selectedSystemId);
    this.enemies = [];
    this.clones = [];
    this.turrets = [];
    this.projectiles = [];
    this.particles = [];
    this.pickups = [];
    this.texts = [];
    this.obstacles = [];
    this.score = 0;
    this.coins = [];
    this.gold = 0;
    this.upgrades = { maxHpLv: 0, dmgLv: 0, fireRateLv: 0, speedLv: 0, magnetLv: 0, armorLv: 0 };
    this.active = true;
    this.paused = false;
    this.endlessMode = false;
    this.bossMines = [];
    this.shake = 0;

    this.generateObstacles();
    WaveManager.wave = 1;
    WaveManager.startWave();

    // UI sync (kept close to original)
    this.ui.updateScore(0);
    this.ui.updateGold(0);
    this.ui.updateHealth(100, 100);
    this.ui.updateUltiBar(0);
    this.ui.updateWeaponInventory(this.player.inventory, this.player.currentWeaponIndex);
    this.ui.updateTankSystemUI(this.selectedSystemId);
    if (this.ui.buffs) this.ui.buffs.innerHTML = '';

    Admin.init();
    Input.init();
    requestAnimationFrame(loop);
  },

  generateObstacles() {
    this.obstacles = [];
    for (let i = 0; i < 30; i++) {
      const w = 100 + Math.random() * 150;
      const h = 100 + Math.random() * 150;
      const x = Math.random() * (WORLD_WIDTH - w);
      const y = Math.random() * (WORLD_HEIGHT - h);
      const distToCenter = Math.hypot(x - WORLD_WIDTH / 2, y - WORLD_HEIGHT / 2);
      if (distToCenter < 400) continue;
      if (Game.player && checkCircleRect({ x: Game.player.x, y: Game.player.y, radius: 150 }, { x, y, width: w, height: h })) continue;
      this.obstacles.push(new Obstacle(x, y, w, h));
    }
  },

  gameOver() {
    this.active = false;
    this.paused = true;

    // Hide shop / boss UI (an toàn)
    try { const shop = document.getElementById('shopModal'); if (shop) shop.classList.add('hidden'); } catch(e){}
    try { const bh = document.getElementById('bossHealthContainer'); if (bh) bh.style.display = 'none'; } catch(e){}

    // Update end screen values
    try { document.getElementById('finalScore').innerText = this.score; } catch(e){}
    try { document.getElementById('finalWave').innerText = WaveManager.wave; } catch(e){}

    // Update best + sync UI
    try { if (typeof MAX !== 'undefined') MAX.State.updateBest(this.score, WaveManager.wave); } catch(e){}

    // Show screen
    try { document.getElementById('gameOverScreen').classList.remove('hidden'); } catch(e){}
  },

  victory() {
    this.active = false;
    this.paused = true;

    // Hide shop/boss UI defensively (matches original)
    try {
      const shop = document.getElementById('shopModal');
      if (shop) shop.classList.add('hidden');
    } catch (e) {}
    try {
      const bh = document.getElementById('bossHealthContainer');
      if (bh) bh.style.display = 'none';
    } catch (e) {}

    const wave = WaveManager.wave;
    try { document.getElementById('victoryWave').innerText = wave; } catch (e) {}
    try { document.getElementById('victoryScore').innerText = this.score; } catch (e) {}

    // Update best + show best on victory screen
    try { if (typeof MAX !== 'undefined') MAX.State.updateBest(this.score, wave); } catch (e) {}
    try {
      const bs = (typeof MAX !== 'undefined' && MAX.State && MAX.State.save) ? MAX.State.save.bestScore : 0;
      const bw = (typeof MAX !== 'undefined' && MAX.State && MAX.State.save) ? MAX.State.save.bestWave : 0;
      const elBS = document.getElementById('victoryBestScore');
      const elBW = document.getElementById('victoryBestWave');
      if (elBS) elBS.innerText = bs;
      if (elBW) elBW.innerText = bw;
    } catch (e) {}

    try { document.getElementById('victoryScreen').classList.remove('hidden'); } catch (e) {}
  }
};

// --- Inject module-scope contexts (avoid circular deps, keep original global-ish style) ---
setAdminContext(Game);
setShopContext(Game);
setWaveManagerContext(Game);

setPlayerContext({ Game, Input, MAX });
setEnemyContext({ Game, WaveManager });
setBulletContext({ Game });
setTurretContext({ Game });

setUtilsContext({ Game, MAX, Particle, Pickup, Coin, canvas, ctx });

// Expose a few legacy globals some modules still expect.
globalThis.Game = Game;
globalThis.MAX = MAX;
globalThis.Shop = Shop;
globalThis.WaveManager = WaveManager;

// --- Original loop() copied + minimal refactor (draw(ctx), update(args)) ---
export function loop() {
  if (!Game.active) return;
  requestAnimationFrame(loop);
  if (Game.paused) return;

  // FPS CAP (30..120). Note: requestAnimationFrame cannot exceed monitor refresh rate.
  if (typeof MAX !== 'undefined' && MAX.State && MAX.State.save && MAX.State.save.settings) {
    const cap = Math.max(30, Math.min(120, MAX.State.save.settings.fpsCap || 60));
    const frameMs = 1000 / cap;
    const now = performance.now();
    if (!Game._fpsCapLast) Game._fpsCapLast = now;
    if (now - Game._fpsCapLast < frameMs) return;
    Game._fpsCapLast = now;
  }

  try {
    // --- SELF-HEALING CHECK ---
    if (!Game.player || typeof Game.player.takeDamage !== 'function') {
      console.warn('Player integrity lost. Respawning...');
      Game.player = createPlayerBySystem(Game.selectedSystemId || 'default');
    }

    WaveManager.update();
    if (Game.player) Camera.update(Game.player);
    if (canvas.width > 0 && canvas.height > 0) {
      ctx.fillStyle = '#121212';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.save();
    let shakeX = 0,
      shakeY = 0;
    if (typeof MAX !== 'undefined' && MAX.State && MAX.State.save && !MAX.State.save.settings.shake) {
      Game.shake = 0;
    }
    if (!isNaN(Game.shake) && Game.shake > 0) {
      shakeX = Math.random() * Game.shake - Game.shake / 2;
      shakeY = Math.random() * Game.shake - Game.shake / 2;
      Game.shake *= 0.9;
      if (Game.shake < 0.5) Game.shake = 0;
    }
    if (!isNaN(Camera.x) && !isNaN(Camera.y)) {
      ctx.translate(-Camera.x + shakeX, -Camera.y + shakeY);
    }
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let y = 0; y <= WORLD_HEIGHT; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
      ctx.stroke();
    }
    for (let x = 0; x <= WORLD_WIDTH; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
      ctx.stroke();
    }
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    Game.obstacles.forEach((obs) => obs.draw(ctx));

    if (Game.player) {
      Game.player.update(Input, Game.obstacles, Game.enemies, Game.projectiles, Game.clones, Game.turrets, Game.pickups, Game.coins, Game.bossMines, Game);
      Game.player.draw(ctx);
      // Optional overlay VFX for tank systems.
      // This avoids relying solely on draw() override dispatch (some builds bind draw on instance).
      if (typeof Game.player.drawFx === 'function') {
        Game.player.drawFx(ctx);
      }
    }

    Game.clones.forEach((c) => {
      c.update(Game.enemies, Game.obstacles, Game.projectiles);
      c.draw(ctx);
    });
    Game.clones = Game.clones.filter((c) => !c.markedForDeletion);

    // --- ENGINEER TURRETS ---
    if (Game.turrets && Game.turrets.length) {
      Game.turrets.forEach((t) => {
        t.update(Game.obstacles, Game.enemies, Game.projectiles, Game);
        t.draw(ctx);
      });
      Game.turrets = Game.turrets.filter((t) => !t.markedForDeletion);
    }

    Game.pickups.forEach((p) => {
      p.update();
      p.draw(ctx);
      if (Game.player && checkCollision(Game.player, p)) {
        if (p.config.type === 'HEAL') Game.player.heal(p.config.value);
        else if (p.config.type === 'BUFF') Game.player.addBuff(p.config.buffType, p.config.duration);
        else if (p.config.type === 'WEAPON') Game.player.addWeapon(p.config.weaponId);
        createDamageText(Game.player.x, Game.player.y - 30, p.config.label, p.config.color);
        p.markedForDeletion = true;
      }
    });

    // --- COINS (Gold) ---
    Game.coins.forEach((c) => {
      c.update();
      c.draw(ctx);

      if (!Game.player) return;

      const dx = Game.player.x - c.x;
      const dy = Game.player.y - c.y;
      const dist = Math.hypot(dx, dy) || 0.0001;

      const pr = Game.player.radius || 20;
      const cr = c.radius || 10;

      // Nam châm hút vàng: trong phạm vi +40px (ngoài va chạm), coin sẽ bay về phía player
      const magnetRange = pr + cr + 40 + 30 * ((Game.upgrades?.magnetLv ?? 0) | 0); // bắt đầu hút
      const pickupRange = pr + cr + 6; // nhặt thật sự (gần sát)

      if (dist < magnetRange) {
        // kéo càng gần càng mạnh (mượt + đã tay)
        const tPull = 1 - dist / magnetRange; // 0..1
        const pull = 0.45 + tPull * 1.35; // lực hút
        const ux = dx / dist;
        const uy = dy / dist;

        // tăng tốc về phía player
        c.vx = (c.vx || 0) + ux * pull;
        c.vy = (c.vy || 0) + uy * pull;

        // giới hạn tốc độ để không "dị" (px/frame-ish)
        const v = Math.hypot(c.vx, c.vy);
        const vmax = 10 + tPull * 10; // càng gần càng nhanh
        if (v > vmax) {
          c.vx = (c.vx / v) * vmax;
          c.vy = (c.vy / v) * vmax;
        }

        // nếu đã đủ gần thì nhặt
        if (dist < pickupRange) {
          Game.gold += c.value;
          Game.ui.updateGold(Game.gold);
          createDamageText(Game.player.x, Game.player.y - 30, `+${c.value}`, '#FFD700');
          c.markedForDeletion = true;
        }
      }
    });

    // --- BOSS MINES (mìn nổ chậm) ---
    if (Game.bossMines && Game.bossMines.length) {
      const nowM = Date.now();
      for (let i = Game.bossMines.length - 1; i >= 0; i--) {
        const m = Game.bossMines[i];
        const t = m.detonateAt - nowM;
        const pct = Math.max(0, Math.min(1, t / (m.delay || 1500)));

        // Draw warning
        ctx.save();
        ctx.fillStyle = 'rgba(255,152,0,0.10)';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,152,0,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * (0.35 + 0.65 * pct), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (nowM >= m.detonateAt) {
          createComplexExplosion(m.x, m.y, '#FF9800');

          if (Game.player && typeof Game.player.takeDamage === 'function') {
            const dP = Math.hypot(Game.player.x - m.x, Game.player.y - m.y);
            if (dP <= m.radius + Game.player.radius) Game.player.takeDamage(m.damage);
          }
          if (Game.clones && Game.clones.length) {
            Game.clones.forEach((c) => {
              const dC = Math.hypot(c.x - m.x, c.y - m.y);
              if (dC <= m.radius + c.radius) c.takeDamage(m.damage);
            });
          }

          Game.bossMines.splice(i, 1);
        }
      }
    }

    Game.projectiles.forEach((p) => {
      p.update(Game.enemies, Game);
      p.draw(ctx);
    });

    Game.enemies.forEach((e) => {
      e.update(Game.player, Game.clones, Game.obstacles, Game.enemies, Game.projectiles, Game.bossMines, Game);
      e.draw(ctx);
      if (Game.player && checkCollision(Game.player, e)) {
        if (typeof Game.player.takeDamage === 'function') Game.player.takeDamage(e.contactDamage || 5, { enemy: e, type: 'CONTACT' });
        const angle = Math.atan2(e.y - Game.player.y, e.x - Game.player.x);
        e.x += Math.cos(angle) * 10;
        e.y += Math.sin(angle) * 10;
      }
      Game.clones.forEach((c) => {
        if (checkCollision(c, e)) {
          c.takeDamage(e.contactDamage || 5);
          const angle = Math.atan2(e.y - c.y, e.x - c.x);
          e.x += Math.cos(angle) * 10;
          e.y += Math.sin(angle) * 10;
        }
      });
    });

    Game.projectiles.forEach((b) => {
      if (b.markedForDeletion) return;
      let wallHit = false;
      for (const obs of Game.obstacles) {
        if (checkCircleRect({ x: b.x, y: b.y, radius: b.radius }, obs)) {
          if (b.config.special === 'PIERCE' || b.typeKey === 'PIERCING') {
            if (Math.random() < 0.2) createComplexExplosion(b.x, b.y, '#ccc');
          } else {
            b.markedForDeletion = true;
            createComplexExplosion(b.x, b.y, '#aaa');
            wallHit = true;
            break;
          }
        }
      }
      if (wallHit) return;

      if (b.owner !== 'PLAYER') {
        if (Game.player && checkCollision(b, Game.player)) {
          if (typeof Game.player.takeDamage === 'function') Game.player.takeDamage(b.config.damage, { enemy: b.sourceEnemy || null, bullet: b, type: 'BULLET' });
          b.markedForDeletion = true;
          createComplexExplosion(b.x, b.y, '#E040FB');
        }
        Game.clones.forEach((c) => {
          if (checkCollision(b, c)) {
            c.takeDamage(b.config.damage);
            b.markedForDeletion = true;
            createComplexExplosion(b.x, b.y, '#E040FB');
          }
        });
        return;
      }
      Game.enemies.forEach((e) => {
        if (b.markedForDeletion) return;
        if (b.hitList.includes(e.id)) return;
        if (checkCollision(b, e)) {
          const dmgMult = b.owner === 'PLAYER' ? 1 + 0.1 * ((Game.upgrades?.dmgLv ?? 0) | 0) : 1;
          const dmg = b.config.damage * dmgMult;
          e.hp -= dmg;
          if (b.owner === 'PLAYER' && Game.player && typeof Game.player.gainUltiCharge === 'function') Game.player.gainUltiCharge(0.5);
          if (Game.player && Game.player.systemId === 'default' && Game.player.skills.vampirism.active && b.owner === 'PLAYER') {
            // Lifesteal with cap per second
            const now2 = Date.now();
            if (!Game.player.vampHeal) Game.player.vampHeal = { windowStart: now2, healed: 0 };
            if (now2 - Game.player.vampHeal.windowStart >= 1000) {
              Game.player.vampHeal.windowStart = now2;
              Game.player.vampHeal.healed = 0;
            }
            const cap = SKILL_CONFIG.VAMPIRISM.capPerSecond || 0;
            const want = dmg * (SKILL_CONFIG.VAMPIRISM.leechPercent || 0);
            const remain = cap > 0 ? Math.max(0, cap - Game.player.vampHeal.healed) : want;
            const healAmount = cap > 0 ? Math.min(want, remain) : want;
            if (healAmount > 0) {
              Game.player.vampHeal.healed += healAmount;
              Game.player.heal(healAmount);
            }
          }
          createDamageText(e.x, e.y, Math.round(dmg), b.config.color);
          createComplexExplosion(b.x, b.y, b.config.color);
          if (b.config.effect) {
            let eff = b.config.effect;
            if (b.owner === 'PLAYER' && eff.type === 'BURN' && typeof eff.tickDamage === 'number') {
              eff = { ...eff, tickDamage: eff.tickDamage * dmgMult };
            }
            e.applyEffect(eff);
          }
          if (b.config.special === 'CHAIN') chainLightning(e, dmg * b.config.chainDmgFactor, b.config.chainCount, b.config.chainRange);
          if (b.config.special === 'EXPLODE') {
            const r = (b.config.explosionRadius != null) ? b.config.explosionRadius : 120;
            const splash = b.config.splashFactor != null ? b.config.splashFactor : 0.75;

            // Optional large shockwave ring (used by Mage Fireball)
            // NOTE: In ES modules, `this` inside the loop() function is undefined (strict mode).
            // Push into the Game-scoped array.
            if (b.config.showShockwave) {
              Game.particles.push(new Particle(b.x, b.y, {
                type: 'shockwave',
                color: b.config.color,
                size: 6,
                maxRadius: r,
                decay: 0.02,
                life: 0.7,
              }));
            }

            Game.enemies.forEach((e2) => {
              if (!e2 || e2 === e || e2.hp <= 0 || e2.markedForDeletion) return;
              const d2 = Math.hypot(e2.x - b.x, e2.y - b.y);
              if (d2 <= r) {
                const minF = (b.config.splashMin != null) ? b.config.splashMin : 0.15;
                const f = Math.max(minF, 1 - d2 / r);
                const sd = Math.round(dmg * splash * f);
                if (sd > 0) {
                  e2.hp -= sd;
                  createDamageText(e2.x, e2.y, sd, b.config.color);
                }
              }
            });
            Game.shake = Math.max(Game.shake, 10);
          }
          if (b.config.special === 'PIERCE') {
            b.pierceCount--;
            b.hitList.push(e.id);
            if (b.pierceCount <= 0) b.markedForDeletion = true;
          } else {
            b.markedForDeletion = true;
          }
        }
      });
    });

    Game.enemies = Game.enemies.filter((e) => {
      if (e.hp <= 0) {
        createComplexExplosion(e.x, e.y, e.config.color);
        Game.score += e.config.score;
        Game.ui.updateScore(Game.score);
        if (e.typeKey === 'BOSS') dropBossWeapon(e.x, e.y);
        else dropPickup(e.x, e.y);
        dropGold(e.x, e.y, e.config && !isNaN(e.config.gold) ? e.config.gold : 0);
        if (Game.player && typeof Game.player.gainUltiCharge === 'function') Game.player.gainUltiCharge(2);
        return false;
      }
      return !e.markedForDeletion;
    });
    Game.projectiles = Game.projectiles.filter((p) => !p.markedForDeletion);
    Game.pickups = Game.pickups.filter((p) => !p.markedForDeletion);
    Game.coins = Game.coins.filter((c) => !c.markedForDeletion);

    Game.particles.forEach((p) => p.update());
    Game.particles.forEach((p) => p.draw(ctx));
    Game.particles = Game.particles.filter((p) => !p.markedForDeletion);

    Game.texts.forEach((t, i) => {
      ctx.fillStyle = t.color;
      ctx.font = 'bold 16px Arial';
      ctx.globalAlpha = t.life;
      ctx.fillText(t.text, t.x, t.y);
      t.y += t.dy;
      t.life -= 0.02;
      if (t.life <= 0) Game.texts.splice(i, 1);
      ctx.globalAlpha = 1;
    });

    if (typeof MAX !== 'undefined' && MAX.State.save.settings.minimap) drawMiniMap();
    ctx.restore();
    Game.ui.updateEnemies(Game.enemies.length);

    // FPS Counter
    if (typeof MAX !== 'undefined') {
      const now = performance.now();
      MAX.State.fps.frames++;
      if (now - MAX.State.fps.last >= 500) {
        MAX.State.fps.value = Math.round((MAX.State.fps.frames * 1000) / (now - MAX.State.fps.last));
        MAX.State.fps.last = now;
        MAX.State.fps.frames = 0;
        const fpsVal = document.getElementById('fpsVal');
        if (fpsVal && MAX.State.save.settings.fps) fpsVal.textContent = MAX.State.fps.value;
      }
    }
    if (Game.player && Game.player.hp <= 0) Game.gameOver();
  } catch (err) {
    console.error('Game Loop Error:', err);
  }
}

// MAX.Toggle expects globalThis.loop
globalThis.loop = loop;
