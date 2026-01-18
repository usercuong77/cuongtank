// Auto-extracted from original HTML

export class GameObject {
    constructor(x, y, radius) {
        this.x = x || 0; this.y = y || 0; this.radius = radius; this.markedForDeletion = false;
    }
    validatePosition() { if (isNaN(this.x)) this.x = 0; if (isNaN(this.y)) this.y = 0; }
}
