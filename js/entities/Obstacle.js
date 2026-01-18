// Auto-extracted from original HTML
import { COLORS } from '../constants.js';

export class Obstacle {
    constructor(x, y, width, height) {
        this.x = x; this.y = y; this.width = width; this.height = height;
    }
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = COLORS.obstacle;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#263238'; // Shadow
        ctx.fillRect(this.x + 5, this.y + this.height, this.width - 5, 10); 
        ctx.fillRect(this.x + this.width, this.y + 5, 10, this.height - 5); 
        ctx.strokeStyle = COLORS.obstacleBorder;
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.stroke();
        ctx.restore();
    }
}
