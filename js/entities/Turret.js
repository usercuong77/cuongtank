// Auto-extracted from original HTML
import { GameObject } from './GameObject.js';
import { BULLET_TYPES } from '../constants.js';
import { isLineBlocked, createMuzzleFlash } from '../utils.js';
import { Bullet } from './Bullet.js';

let Game = null;
export function setTurretContext(ctxObj = {}) { if (ctxObj.Game !== undefined) Game = ctxObj.Game; }

export class Turret extends GameObject {
    constructor(x, y, cfg = {}) {
        super(x, y, 18);
        const now = Date.now();
        this.spawnTime = now;
        this.endTime = now + (cfg.duration || 10000);
        this.range = cfg.range || 650;
        this.fireInterval = cfg.fireRate || 320;
        this.lastShot = 0;
        this.color = cfg.color || '#81C784';
        this.bulletColor = cfg.bulletColor || '#66BB6A';
        this.bulletDmgMult = (typeof cfg.bulletDmgMult === 'number') ? cfg.bulletDmgMult : 0.65;
        this.angle = 0;
    }

    update(obstacles, enemies, projectiles, game) {
                if (game) Game = game;
                if (enemies) Game.enemies = enemies;
                if (projectiles) Game.projectiles = projectiles;
                if (obstacles) Game.obstacles = obstacles;
        const now = Date.now();
        if (now > this.endTime) {
            this.markedForDeletion = true;
            return;
        }

        // Aim nearest enemy in range (line-of-sight preferred)
        let target = null;
        let minDst = this.range;
        const obs = obstacles || Game.obstacles;

        for (const e of Game.enemies) {
            if (!e || e.markedForDeletion || e.hp <= 0) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < minDst) {
                if (!isLineBlocked(this.x, this.y, e.x, e.y, obs)) {
                    minDst = d;
                    target = e;
                }
            }
        }

        if (target) {
            const ang = Math.atan2(target.y - this.y, target.x - this.x);
            if (!isNaN(ang)) this.angle = ang;

            if (now - this.lastShot >= this.fireInterval) {
                this.shoot(this.angle);
                this.lastShot = now;
            }
        }
    }

    shoot(angle) {
        if (isNaN(angle)) return;
        const base = (BULLET_TYPES && BULLET_TYPES.NORMAL) ? BULLET_TYPES.NORMAL : { damage: 10, speed: 12, radius: 5, color: '#fff' };
        const cfg = { ...base, color: this.bulletColor };
        cfg.damage = Math.max(1, Math.round((cfg.damage || 10) * this.bulletDmgMult));

        const bullet = new Bullet(this.x, this.y, angle, 'NORMAL', cfg, 'PLAYER');
        Game.projectiles.push(bullet);
        createMuzzleFlash(this.x, this.y, angle, this.bulletColor);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // lifetime ring
        const now = Date.now();
        const total = Math.max(1, (this.endTime - this.spawnTime));
        const remain = Math.max(0, this.endTime - now);
        const pct = Math.max(0, Math.min(1, remain / total));
        ctx.strokeStyle = 'rgba(102, 187, 106, 0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();

        // base
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
        ctx.fill();

        // barrel
        ctx.rotate(this.angle);
        ctx.fillStyle = '#263238';
        ctx.fillRect(0, -6, 42, 12);
        ctx.fillStyle = this.bulletColor;
        ctx.fillRect(0, -4, 34, 8);

        ctx.restore();
    }
}
