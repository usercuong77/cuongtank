// Auto-extracted from original HTML
import { GameObject } from './GameObject.js';

export class Particle extends GameObject {
    constructor(x, y, options) {
        super(x, y, options.size || Math.random() * 3 + 1);
        this.velocity = options.velocity || { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 };
        this.color = options.color || 'white';
        this.alpha = 1;
        this.life = options.life || 1.0;
        this.decay = options.decay || 0.02;
        this.type = options.type || 'circle'; // circle, spark, shockwave, smoke, debris
        this.maxRadius = options.maxRadius || 0; // For shockwave
    }
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // Friction depends on type
        if (this.type === 'debris') {
            this.velocity.x *= 0.95; this.velocity.y *= 0.95;
        } else if (this.type === 'smoke') {
            this.velocity.x *= 0.98; this.velocity.y *= 0.98;
            this.radius += 0.2; // Smoke expands
        } else {
            this.velocity.x *= 0.9; this.velocity.y *= 0.9;
        }

        this.alpha -= this.decay;
        if (this.alpha <= 0) this.markedForDeletion = true;
        this.validatePosition();
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        
        if(this.type === 'shockwave') {
            // Expanding ring
            const progress = 1 - this.alpha;
            const currentRad = this.radius + (this.maxRadius - this.radius) * progress;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRad, 0, Math.PI*2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3 * this.alpha;
            ctx.stroke();
        } else if (this.type === 'spark') {
            // Thin line/spark
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, 2, 2);
        } else if (this.type === 'debris') {
            // Irregular shape
            ctx.translate(this.x, this.y);
            ctx.rotate(this.alpha * 10);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.radius/2, -this.radius/2, this.radius, this.radius);
        } else if (this.type === 'smoke') {
            // Soft circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        } else {
            // Standard circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        ctx.restore();
    }
}
