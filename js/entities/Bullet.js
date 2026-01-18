// Auto-extracted from original HTML
import { GameObject } from './GameObject.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';

let Game = null;
export function setBulletContext(ctxObj = {}) { if (ctxObj.Game !== undefined) Game = ctxObj.Game; }

export class Bullet extends GameObject {
    constructor(x, y, angle, typeKey, config, owner = 'PLAYER') {
        super(x, y, config.radius);
        this.angle = angle;
        this.typeKey = typeKey;
        this.config = config; 
        this.owner = owner; 
        this.velocity = { x: Math.cos(angle) * config.speed, y: Math.sin(angle) * config.speed };
        if(isNaN(this.velocity.x)) this.velocity.x = 0;
        if(isNaN(this.velocity.y)) this.velocity.y = 0;
        this.hitList = [];
        this.pierceCount = config.special === 'PIERCE' ? config.pierceCount : 0;
        
        // Trail system
        this.trail = []; 
        this.maxTrailLength = 8;

        // Optional lifetime (seconds)
        this.spawnTime = Date.now();
    }

    update(enemies, game) {
                if (game) Game = game;
                if (enemies) Game.enemies = enemies;
        // Optional lifetime
        if (this.config && typeof this.config.life === 'number' && this.config.life > 0) {
            if ((Date.now() - this.spawnTime) > this.config.life * 1000) {
                this.markedForDeletion = true;
            }
        }

        // Add position to trail (skip when explicitly disabled)
        if (!this.config || !this.config.noTrail) {
            this.trail.push({x: this.x, y: this.y});
            if(this.trail.length > this.maxTrailLength) this.trail.shift();
        }

        // Homing Logic
        if ((this.config.special === 'HOMING' || this.typeKey === 'ROCKET') && this.owner === 'PLAYER') {
            let nearest = null; let minDst = (this.config.homingRange != null) ? this.config.homingRange : 500;
            Game.enemies.forEach(e => {
                if(isNaN(e.x) || isNaN(e.y)) return;
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < minDst) { minDst = d; nearest = e; }
            });
            if (nearest) {
                const desiredAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
                if(!isNaN(desiredAngle)) {
                    const desiredVx = Math.cos(desiredAngle) * this.config.speed;
                    const desiredVy = Math.sin(desiredAngle) * this.config.speed;
                    const turnSpeed = (this.config.turnSpeed != null) ? this.config.turnSpeed : 0.2;
                    this.velocity.x = this.velocity.x * (1 - turnSpeed) + desiredVx * turnSpeed;
                    this.velocity.y = this.velocity.y * (1 - turnSpeed) + desiredVy * turnSpeed;
                    const currentSpeed = Math.hypot(this.velocity.x, this.velocity.y);
                    if (currentSpeed > 0 && !isNaN(currentSpeed)) {
                        this.velocity.x = (this.velocity.x / currentSpeed) * this.config.speed;
                        this.velocity.y = (this.velocity.y / currentSpeed) * this.config.speed;
                    }
                }
            }
        }

        // Update angle to match current velocity (for ROCKET drawing)


        if (this.typeKey === 'ROCKET') {


            this.angle = Math.atan2(this.velocity.y, this.velocity.x);


        }



        this.x += this.velocity.x;
        this.y += this.velocity.y;
        if (this.x < 0 || this.x > WORLD_WIDTH || this.y < 0 || this.y > WORLD_HEIGHT) {
            this.markedForDeletion = true;
        }
        this.validatePosition();
    }

    draw(ctx) {
        ctx.save();

        // --- TRƯỜNG HỢP 1: VẼ ROCKET (Hình tên lửa) ---
        if (this.typeKey === 'ROCKET') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle); // Xoay theo hướng bay

            // 1. Vẽ đuôi lửa (Thruster)
            const flicker = Math.random() * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 87, 34, ${flicker})`; // Màu cam lửa
            ctx.beginPath();
            ctx.moveTo(-10, -4);
            ctx.lineTo(-25 - Math.random()*10, 0); // Đuôi lửa dài ngẫu nhiên
            ctx.lineTo(-10, 4);
            ctx.fill();

            // 2. Vẽ thân (Hình trụ)
            ctx.fillStyle = '#424242'; // Màu xám đen quân đội
            ctx.fillRect(-10, -6, 20, 12); // Dài 20, Rộng 12

            // Viền thân cho rõ
            ctx.strokeStyle = '#212121';
            ctx.lineWidth = 2;
            ctx.strokeRect(-10, -6, 20, 12);

            // 3. Vẽ đầu đạn (Tam giác)
            ctx.fillStyle = '#D50000'; // Đầu đỏ nguy hiểm
            ctx.beginPath();
            ctx.moveTo(10, -6);  // Góc trên thân
            ctx.lineTo(24, 0);   // Mũi nhọn
            ctx.lineTo(10, 6);   // Góc dưới thân
            ctx.fill();
            ctx.stroke();

            // 4. Vẽ cánh đuôi (Fins)
            ctx.fillStyle = '#616161';
            ctx.beginPath();
            ctx.moveTo(-10, -6);
            ctx.lineTo(-18, -12); // Cánh trên
            ctx.lineTo(-6, -6);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-10, 6);
            ctx.lineTo(-18, 12);  // Cánh dưới
            ctx.lineTo(-6, 6);
            ctx.fill();
            ctx.stroke();

        }
        // --- TRƯỜNG HỢP 1B: VẼ FIREBALL (Quả cầu lửa) ---
        // Copy từ bản gốc v36: chỉ vẽ quả cầu lửa (không có vòng tròn phụ), không có trail.
        else if (this.typeKey === 'FIREBALL') {
            ctx.translate(this.x, this.y);

            const baseR = (this.radius != null ? this.radius : 36);
            const r = baseR * 1.15;
            const c = (this.config && this.config.color) ? this.config.color : '#FF5722';

            // Glow mạnh
            ctx.shadowBlur = 40;
            ctx.shadowColor = c;

            // Radial gradient cho lõi + viền
            const g = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
            g.addColorStop(0, 'rgba(255,255,255,0.95)');
            g.addColorStop(0.25, 'rgba(255,183,77,0.95)');
            g.addColorStop(0.6, 'rgba(255,87,34,0.85)');
            g.addColorStop(1, 'rgba(255,87,34,0.10)');

            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();

            // Viền nóng
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF3D00';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.9;
            ctx.stroke();

            ctx.globalAlpha = 1;

            ctx.restore();
            return;
        }
        // --- TRƯỜNG HỢP 2: VẼ ĐẠN THƯỜNG (Giữ nguyên code cũ) ---
        else {
            // Optional: Orb bullets (no trail, strong glow)
            if (this.config && this.config.noTrail) {
                const glow = (this.config.glowBlur != null) ? this.config.glowBlur : 30;
                const glowColor = this.config.glowColor || this.config.color;
                ctx.globalAlpha = 1;
                ctx.shadowBlur = glow;
                ctx.shadowColor = glowColor;

                // Main orb
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.config.color;
                ctx.fill();

                // Inner highlight (gives "energy" feel)
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(this.x - this.radius * 0.25, this.y - this.radius * 0.25, Math.max(2, this.radius * 0.35), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.fill();

                // Thin rim
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
                ctx.strokeStyle = this.config.color;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.restore();
                return;
            }

            // Draw Trail (Code cũ của bạn)
            if(this.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for(let i=1; i<this.trail.length; i++) {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
                ctx.lineCap = 'round';
                ctx.lineWidth = this.radius;
                ctx.strokeStyle = this.config.color;
                ctx.globalAlpha = 0.4;
                ctx.stroke();
            }

            // Draw Head (Code cũ)
            ctx.globalAlpha = 1;
            ctx.shadowBlur = (this.config && this.config.glowBlur != null) ? this.config.glowBlur : 15;
            ctx.shadowColor = (this.config && this.config.glowColor) ? this.config.glowColor : this.config.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
            ctx.strokeStyle = this.config.color;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }
}

// --- CLONE CLASS ---
