// DefaultTank: system 'default' skills (Clone, Stealth, Vampirism)
// Kept as close as possible to original Player logic.

import { GameObject } from '../GameObject.js';
import { PlayerBase, getPlayerContext } from '../Player.js';
import { COLORS, BULLET_TYPES, SKILL_CONFIG, WORLD_WIDTH, WORLD_HEIGHT, getSystemSkillDef } from '../../constants.js';
import { checkCircleRect, createDamageText, createComplexExplosion, createMuzzleFlash } from '../../utils.js';
import { Bullet } from '../Bullet.js';

// CloneTank was previously defined inside Player.js. It remains a simple entity.
export class CloneTank extends GameObject {
    constructor(x, y, ownerPlayer = null) {
        super(x, y, 22);
        this.ownerPlayer = ownerPlayer;
        this.hp = SKILL_CONFIG.CLONE.hp; this.maxHp = SKILL_CONFIG.CLONE.hp;
        this.spawnTime = Date.now(); this.duration = SKILL_CONFIG.CLONE.duration;
        this.speed = 4; this.angle = 0; this.lastShot = 0; this.moveAngle = Math.random() * Math.PI * 2;
    }
    update(enemies, obstacles, bullets) {
        if (this.duration !== Infinity && Date.now() - this.spawnTime > this.duration) {
            this.markedForDeletion = true; createComplexExplosion(this.x, this.y, COLORS.clone); return;
        }
        let nearest = null; let minDst = 1000;
        enemies.forEach(e => { const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < minDst) { minDst = d; nearest = e; } });
        
        let dodgeX = 0, dodgeY = 0;
        bullets.forEach(b => {
            if (b.owner === 'ENEMY') {
                const d = Math.hypot(b.x - this.x, b.y - this.y);
                if (d < 100) { 
                    const angleToBullet = Math.atan2(b.y - this.y, b.x - this.x);
                    dodgeX -= Math.cos(angleToBullet) * 2; dodgeY -= Math.sin(angleToBullet) * 2;
                }
            }
        });

        let desiredAngle = this.angle; let shouldMove = false;
        if (nearest) {
            const dx = nearest.x - this.x; const dy = nearest.y - this.y; const dist = Math.hypot(dx, dy); desiredAngle = Math.atan2(dy, dx);
            if (dist > 300) { shouldMove = true; } else if (dist < 150) { desiredAngle += Math.PI; shouldMove = true; } else { desiredAngle += Math.PI / 2; shouldMove = true; }
            const now = Date.now(); const aimAngle = Math.atan2(dy, dx); this.angle = aimAngle;
            if (now - this.lastShot > 600) { this.shoot(aimAngle); this.lastShot = now; }
        } else {
            shouldMove = true; desiredAngle = this.moveAngle; if(Math.random() < 0.05) this.moveAngle += (Math.random()-0.5); this.angle = desiredAngle;
        }
        if (dodgeX !== 0 || dodgeY !== 0) { desiredAngle = Math.atan2(dodgeY, dodgeX); shouldMove = true; }

        let bestAngle = desiredAngle; let foundPath = false;
        const checkAngles = [0, 20, -20, 45, -45, 70, -70, 90, -90, 110, -110, 135, -135, 160, -160, 180];
        for (let offset of checkAngles) {
            const checkRad = (offset * Math.PI) / 180; const testAngle = desiredAngle + checkRad; if(isNaN(testAngle)) continue;
            const lookAhead = Math.max(this.radius * 1.5, this.speed * 5); const nextX = this.x + Math.cos(testAngle) * lookAhead; const nextY = this.y + Math.sin(testAngle) * lookAhead;
            let collided = false;
            if (nextX < this.radius || nextX > WORLD_WIDTH - this.radius || nextY < this.radius || nextY > WORLD_HEIGHT - this.radius) { collided = true; }
            if (!collided) { for (let obs of obstacles) { if (checkCircleRect({x: nextX, y: nextY, radius: this.radius + 2}, obs)) { collided = true; break; } } }
            if (!collided) { bestAngle = testAngle; foundPath = true; break; }
        }
        if (shouldMove && foundPath && !isNaN(bestAngle)) { this.x += Math.cos(bestAngle) * this.speed; this.y += Math.sin(bestAngle) * this.speed; }
        for (let obs of obstacles) {
            if (checkCircleRect({x: this.x, y: this.y, radius: this.radius}, obs)) {
                const anglePush = Math.atan2(this.y - (obs.y + obs.height/2), this.x - (obs.x + obs.width/2));
                if(!isNaN(anglePush)) { this.x += Math.cos(anglePush) * 2; this.y += Math.sin(anglePush) * 2; }
            }
        }
        this.x = Math.max(0, Math.min(WORLD_WIDTH, this.x)); this.y = Math.max(0, Math.min(WORLD_HEIGHT, this.y)); this.validatePosition();
    }
    shoot(angle) {
        if(isNaN(angle)) return;
        const { Game } = getPlayerContext();
        const bullet = new Bullet(this.x, this.y, angle, 'NORMAL', BULLET_TYPES.NORMAL, 'PLAYER');
        bullet.config = { ...BULLET_TYPES.NORMAL, color: '#81D4FA' };
        // Allow clone bullets to leech-heal their owner when Default R (Vampirism) is active
        bullet.leechOwner = this.ownerPlayer;
 
        Game.projectiles.push(bullet);
        createMuzzleFlash(this.x, this.y, this.angle, '#81D4FA');
    }
    takeDamage(amount) {
        const { Game } = getPlayerContext();
        const alv = ((Game.upgrades?.armorLv ?? 0) | 0);
        const reduction = Math.min(0.60, alv * 0.05); // cap 60% để không quá OP
        const finalAmount = Math.max(1, Math.round(amount * (1 - reduction)));

        this.hp -= finalAmount;
        Game.ui.updateHealth(this.hp, this.maxHp, this.ownerPlayer?.playerIndex || 1);
        createDamageText(this.x, this.y - 20, `-${finalAmount}`, COLORS.clone);

        if (this.hp <= 0) { this.markedForDeletion = true; createComplexExplosion(this.x, this.y, COLORS.clone); }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); 
        // Scale visuals by radius (supports Siege Mode size)
        const __baseR = (this.baseRadius || 22);
        const __scale = (__baseR > 0) ? (this.radius / __baseR) : 1;
        if (!isNaN(__scale) && __scale !== 1) ctx.scale(__scale, __scale);

        ctx.globalAlpha = 0.7; ctx.strokeStyle = COLORS.clone; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.radius + 5, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#222'; ctx.fillRect(-22, -22, 44, 44); ctx.fillStyle = COLORS.clone; ctx.fillRect(-22, -22, 44, 44);
        ctx.rotate(this.angle); ctx.fillStyle = COLORS.cloneTurret; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(0, -6, 40, 12); ctx.restore();
    }
}

export class DefaultTank extends PlayerBase {
    constructor() {
        // Default system stats (as in original Player)
        super('default', { maxHp: 100, baseSpeed: 6.5, radius: 22 });
    }

    // Override default system skills (Q/E/R)
    useSkill(skillName) {
        const now = Date.now();
        const config = getSystemSkillDef(this.systemId, skillName);
        const skillState = this.skills[skillName];
        if (!skillState || !config) return;

        // Cooldown gate
        if (now - skillState.lastUsed < (config.cooldown || 0)) return;

        const { Game } = getPlayerContext();

        // Default system skill activation (copied from original)
        skillState.lastUsed = now;
        if (skillName === 'clone') {
            if (Game.clones.length > 0) {
                Game.clones.forEach(c => { c.markedForDeletion = true; createComplexExplosion(c.x, c.y, COLORS.clone); });
                Game.clones = [];
                createDamageText(this.x, this.y - 60, 'THAY THẾ!', '#ccc');
            }
            createDamageText(this.x, this.y - 40, 'PHÂN THÂN CHIẾN ĐẤU!', COLORS.clone);
            Game.clones.push(new CloneTank(this.x + 50, this.y, this));
        }
        else if (skillName === 'stealth') {
            createDamageText(this.x, this.y - 40, 'TÀNG HÌNH!', '#AB47BC');
            this.isStealth = true;
            skillState.active = true;
            skillState.endTime = now + (config.duration || 0);
        }
        else if (skillName === 'vampirism') {
            createDamageText(this.x, this.y - 40, 'HÚT MÁU!', '#FF5252');
            skillState.active = true;
            skillState.endTime = now + (config.duration || 0);
        }
    }

    update(input, obstacles, enemies, projectiles, clones, turrets, pickups, coins, bossMines, game) {
        // Keep core logic in PlayerBase
        super.update(input, obstacles, enemies, projectiles, clones, turrets, pickups, coins, bossMines, game);

        // Handle default-system timers (moved out of PlayerBase)
        const now = Date.now();

        if (this.skills && this.skills.stealth && this.skills.stealth.active) {
            if (now > (this.skills.stealth.endTime || 0)) {
                this.skills.stealth.active = false;
                this.isStealth = false;
            } else {
                this.isStealth = true;
            }
        }

        if (this.skills && this.skills.vampirism && this.skills.vampirism.active) {
            if (now > (this.skills.vampirism.endTime || 0)) {
                this.skills.vampirism.active = false;
            }
        }
    }

    draw(ctx) {
        const now = Date.now();
        const stealthOn = !!(this.skills && this.skills.stealth && this.skills.stealth.active && now <= (this.skills.stealth.endTime || 0));
        const vampOn = !!(this.skills && this.skills.vampirism && this.skills.vampirism.active && now <= (this.skills.vampirism.endTime || 0));

        if (stealthOn) {
            ctx.save();
            ctx.globalAlpha *= 0.25;
            super.draw(ctx);
            ctx.restore();
        } else {
            super.draw(ctx);
        }

        // --- Visual FX (pure visuals, no gameplay impact) ---
        if (stealthOn) {
            const pulse = 0.5 + 0.5 * Math.sin(now / 120);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            ctx.arc(0, 0, (this.radius || 22) + 12 + pulse * 3, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(171,71,188,${0.35 + pulse * 0.25})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }

        if (vampOn) {
            const pulse = 0.5 + 0.5 * Math.sin(now / 90);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            ctx.arc(0, 0, (this.radius || 22) + 10 + pulse * 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,82,82,${0.30 + pulse * 0.25})`;
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.restore();
        }
    }

}
