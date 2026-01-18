// Auto-extracted from original HTML (tank_release_v32_shop_speed_lv0_ui_btnfix.html)
// NOTE: Keep names/logic identical to original.

import { WORLD_WIDTH, WORLD_HEIGHT, MINIMAP_SIZE, ITEM_TYPES } from './constants.js';

// Module-scope injections to preserve original global-style helpers without importing Game (avoid circular deps).
let Game = null;
let MAX = null;
let Particle = null;
let Pickup = null;
let Coin = null;
let canvas = null;
let ctx = null;

export function setUtilsContext(ctxObj = {}) {
  if (ctxObj.Game !== undefined) Game = ctxObj.Game;
  if (ctxObj.MAX !== undefined) MAX = ctxObj.MAX;
  if (ctxObj.Particle !== undefined) Particle = ctxObj.Particle;
  if (ctxObj.Pickup !== undefined) Pickup = ctxObj.Pickup;
  if (ctxObj.Coin !== undefined) Coin = ctxObj.Coin;
  if (ctxObj.canvas !== undefined) canvas = ctxObj.canvas;
  if (ctxObj.ctx !== undefined) ctx = ctxObj.ctx;
}

// --- 5. UTILS ---
function checkCollision(c1, c2) { if(!c1 || !c2 || isNaN(c1.x) || isNaN(c2.x)) return false; const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y); return dist < c1.radius + c2.radius; }
function checkCircleRect(circle, rect) {
    if(isNaN(circle.x) || isNaN(circle.y)) return false; let testX = circle.x; let testY = circle.y;
    if (circle.x < rect.x) testX = rect.x; else if (circle.x > rect.x + rect.width) testX = rect.x + rect.width;
    if (circle.y < rect.y) testY = rect.y; else if (circle.y > rect.y + rect.height) testY = rect.y + rect.height;
    let distX = circle.x - testX; let distY = circle.y - testY; return (distX*distX + distY*distY) <= (circle.radius*circle.radius);
}
function isLineBlocked(x1, y1, x2, y2, obstacles) {
    const steps = 10; for(let i=0; i<=steps; i++) { const px = x1 + (x2-x1) * (i/steps); const py = y1 + (y2-y1) * (i/steps); for(let obs of obstacles) { if (px > obs.x && px < obs.x + obs.width && py > obs.y && py < obs.y + obs.height) return true; } } return false;
}
function hexToRgb(hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i; hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "255, 255, 255";
}

function createComplexExplosion(x, y, color) {
    if(isNaN(x) || isNaN(y)) return;
    const mult = 1;

    if (typeof MAX !== 'undefined') MAX.Audio.boom();

    // Shockwave
    Game.particles.push(new Particle(x, y, {type: 'shockwave', color: color, size: 5, maxRadius: 50, life: 0.5, decay: 0.1}));

    // Debris
    const debrisCount = Math.round(6 * mult);
    for(let i=0; i<debrisCount; i++) Game.particles.push(new Particle(x, y, {
        type: 'debris', color: color, size: 4 + Math.random()*4, life: 1.0, decay: 0.03,
        velocity: {x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10}
    }));

    // Smoke
    const smokeCount = Math.round(4 * mult);
    for(let i=0; i<smokeCount; i++) Game.particles.push(new Particle(x, y, {
        type: 'smoke', color: '#555', size: 10, life: 1.5, decay: 0.01,
        velocity: {x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2}
    }));

    // Sparks
    const sparkCount = Math.round(10 * mult);
    for(let i=0; i<sparkCount; i++) Game.particles.push(new Particle(x, y, {
        type: 'spark', color: color, size: 2, life: 0.25, decay: 0.08,
        velocity: {x: (Math.random()-0.5)*12, y: (Math.random()-0.5)*12}
    }));
}
function createExplosion(x, y, color, count) { // Legacy wrapper
    createComplexExplosion(x, y, color);
}

function createMuzzleFlashLegacy(x, y, color, count) { // Legacy wrapper
    createComplexExplosion(x, y, color);
}
function createMuzzleFlash(x, y, angle, color) {
    if (typeof MAX !== 'undefined') MAX.Audio.shoot();
    Game.particles.push(new Particle(x + Math.cos(angle)*10, y + Math.sin(angle)*10, {type: 'spark', color: color, size: 3, life: 0.1, decay: 0.5}));
}
function createDamageText(x, y, text, color) { if(isNaN(x)) return; Game.texts.push({ x, y, text, color, life: 1.0, dy: -1 }); }
function chainLightning(startEnemy, baseDamage, count, range) {
    if (count <= 0) return;
    let nearest = null; let minDst = Infinity;
    Game.enemies.forEach(e => { if (e === startEnemy) return; const d = Math.hypot(e.x - startEnemy.x, e.y - startEnemy.y); if (d < range && d < minDst) { nearest = e; minDst = d; } });
    if (nearest) {
        nearest.hp -= baseDamage; createDamageText(nearest.x, nearest.y, Math.floor(baseDamage), '#FFEB3B');
        const steps = 10; const dx = (nearest.x - startEnemy.x) / steps; const dy = (nearest.y - startEnemy.y) / steps;
        for(let i=0; i<steps; i++) Game.particles.push(new Particle(startEnemy.x + dx*i, startEnemy.y + dy*i, {type: 'spark', color: '#FFEB3B', size: 2, life: 0.2}));
        chainLightning(nearest, baseDamage * 0.7, count - 1, range);
    }
}

function dropGold(x, y, amount, scatter = true) {
    if (isNaN(x) || isNaN(y)) return;
    const val = Math.max(0, Math.floor(amount || 0));
    if (val <= 0) return;
    const c = new Coin(x, y, val);
    if (scatter) { c.x += (Math.random()-0.5)*14; c.y += (Math.random()-0.5)*14; }
    Game.coins.push(c);
}

function dropPickup(x, y) {
    if(isNaN(x)) return;
    if (Math.random() > 0.35) return; // Tang len 35%
    const lootTable = [{id: 'HP_PACK', weight: 20}, {id: 'SHIELD', weight: 10}, {id: 'RAPID_FIRE', weight: 10}, {id: 'AMMO_NORMAL', weight: 15}, {id: 'AMMO_FIRE', weight: 10}, {id: 'AMMO_STUN', weight: 10}, {id: 'AMMO_PIERCE', weight: 10}, {id: 'AMMO_LIGHTNING', weight: 10}, {id: 'AMMO_HOMING', weight: 5}];
    const totalWeight = lootTable.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight; let selectedItemKey = 'HP_PACK';
    for (const item of lootTable) { if (random < item.weight) { selectedItemKey = item.id; break; } random -= item.weight; }
    if (ITEM_TYPES[selectedItemKey]) Game.pickups.push(new Pickup(x, y, ITEM_TYPES[selectedItemKey]));
}

function dropBossWeapon(x, y) {
    if (isNaN(x) || isNaN(y)) return;
    const weapons = ['AMMO_FIRE', 'AMMO_STUN', 'AMMO_PIERCE', 'AMMO_LIGHTNING', 'AMMO_HOMING'];
    const key = weapons[(Math.random() * weapons.length) | 0];
    if (ITEM_TYPES[key]) {
        const px = x + (Math.random() - 0.5) * 18;
        const py = y + (Math.random() - 0.5) * 18;
        Game.pickups.push(new Pickup(px, py, ITEM_TYPES[key]));
    }
}

function drawMiniMap() {
    const mapSize = MINIMAP_SIZE; const mapX = canvas.width - mapSize - 20; const mapY = canvas.height - mapSize - 20;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(mapX, mapY, mapSize, mapSize);
    const scaleX = mapSize / WORLD_WIDTH; const scaleY = mapSize / WORLD_HEIGHT;
    if (Game.player) { ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.arc(mapX + Game.player.x * scaleX, mapY + Game.player.y * scaleY, 3, 0, Math.PI*2); ctx.fill(); }
    Game.enemies.forEach(e => { ctx.fillStyle = e.typeKey === 'BOSS' ? '#D50000' : '#f00'; const r = e.typeKey === 'BOSS' ? 6 : 2; ctx.beginPath(); ctx.arc(mapX + e.x * scaleX, mapY + e.y * scaleY, r, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#FFD700'; Game.pickups.forEach(p => { ctx.fillRect(mapX + p.x * scaleX - 1, mapY + p.y * scaleY - 1, 2, 2); });
    ctx.restore();
}

export {
  checkCollision,
  checkCircleRect,
  isLineBlocked,
  hexToRgb,
  createComplexExplosion,
  createExplosion,
  createMuzzleFlash,
  createDamageText,
  chainLightning,
  dropGold,
  dropPickup,
  dropBossWeapon,
  drawMiniMap
};
