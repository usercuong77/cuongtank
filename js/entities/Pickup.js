// Auto-extracted from original HTML
import { GameObject } from './GameObject.js';

export class Pickup extends GameObject {
    constructor(x, y, config) {
        super(x, y, 15);
        this.config = config;
        this.spawnTime = Date.now();
        this.maxLifeTime = config.duration;
        this.floatOffset = 0;
    }
    update() {
        this.floatOffset = Math.sin(Date.now() / 200) * 3;
        if (Date.now() - this.spawnTime > this.maxLifeTime) this.markedForDeletion = true;
        this.validatePosition();
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + this.floatOffset);
        ctx.shadowBlur = 15; ctx.shadowColor = this.config.color;
        ctx.fillStyle = this.config.color;
        ctx.fillRect(-12, -12, 24, 24);
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
        ctx.strokeRect(-12, -12, 24, 24);
        ctx.shadowBlur = 0; ctx.fillStyle = 'white'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText(this.config.label, 0, 4);
        const lifePercent = 1 - (Date.now() - this.spawnTime) / this.maxLifeTime;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(-12, 14, 24 * lifePercent, 3);
        ctx.restore();
    }
}


// --- COIN / GOLD DROP ---
export class Coin extends GameObject {
    constructor(x, y, value) {
        super(x, y, 10);
        this.value = value || 1;
        this.spawnTime = Date.now();
        this.maxLifeTime = 12000; // 12s rồi tự biến mất (tối ưu)
        const ang = Math.random() * Math.PI * 2;
        const sp = 2.2 + Math.random() * 1.8;
        this.vx = Math.cos(ang) * sp;
        this.vy = Math.sin(ang) * sp - 1.2;
        this.rot = Math.random() * Math.PI * 2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.rot += 0.2;
        if (Date.now() - this.spawnTime > this.maxLifeTime) this.markedForDeletion = true;
        this.validatePosition();
    }
    draw(ctx) {
        const t = (Date.now() - this.spawnTime) / this.maxLifeTime;
        const alpha = t > 0.85 ? Math.max(0, 1 - (t - 0.85) / 0.15) : 1;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 16; ctx.shadowColor = '#FFD700';
        const squish = 0.25 + Math.abs(Math.sin(this.rot)) * 0.75;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 * squish, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFF4C2'; ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-2, -2, 2.2 * squish, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
