// === 2) Camera ===
        const Camera = {
            x: 0, y: 0,
            zoom: 1, targetZoom: 1,
            update(target) {
                let players = [];
                if (Array.isArray(target)) players = target;
                else if (target) players = [target];

                players = players.filter(p => p && !isNaN(p.x) && !isNaN(p.y));
                if (!players.length) return;

                const alive = players.filter(p => (typeof p.hp === 'number') ? p.hp > 0 : true);
                if (alive.length) players = alive;

                if (players.length === 1) {
                    const p = players[0];
                    this.targetZoom = 1;
                    this.zoom = 1;
                    this.x = p.x - canvas.width / 2;
                    this.y = p.y - canvas.height / 2;
                    this.x = Math.max(0, Math.min(this.x, WORLD_WIDTH - canvas.width));
                    this.y = Math.max(0, Math.min(this.y, WORLD_HEIGHT - canvas.height));
                    if (!isFinite(this.x)) this.x = 0;
                    if (!isFinite(this.y)) this.y = 0;
                    return;
                }

                let minX = 1e18, maxX = -1e18, minY = 1e18, maxY = -1e18;
                for (const p of players) {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                }

                let cx = (minX + maxX) / 2;
                let cy = (minY + maxY) / 2;

                const dx = Math.max(0, maxX - minX);
                const dy = Math.max(0, maxY - minY);

                const allowOver = (players.length >= 2);
                const edgePad = allowOver ? 300 : 0;

                // Keep the player-group midpoint centered; allow slight overscroll in 2P.
                const safeMaxW = allowOver
                    ? Math.max(1, WORLD_WIDTH + edgePad * 2)
                    : Math.max(1, Math.min(WORLD_WIDTH, 2 * Math.min(cx, WORLD_WIDTH - cx)));
                const safeMaxH = allowOver
                    ? Math.max(1, WORLD_HEIGHT + edgePad * 2)
                    : Math.max(1, Math.min(WORLD_HEIGHT, 2 * Math.min(cy, WORLD_HEIGHT - cy)));

                const basePad = 750;
                const padX = Math.min(basePad, Math.max(0, (safeMaxW - dx) / 2));
                const padY = Math.min(basePad, Math.max(0, (safeMaxH - dy) / 2));

                const reqW = Math.max(1, dx + padX * 2);
                const reqH = Math.max(1, dy + padY * 2);

                const zX = canvas.width / reqW;
                const zY = canvas.height / reqH;
                let desiredZoom = Math.min(zX, zY);

                const minZoomCenter = Math.max(canvas.width / safeMaxW, canvas.height / safeMaxH);
                const maxZoom = 1.1;
                desiredZoom = Math.max(minZoomCenter, Math.min(maxZoom, desiredZoom));

                this.targetZoom = desiredZoom;
                this.zoom += (this.targetZoom - this.zoom) * 0.08;
                if (!isFinite(this.zoom) || this.zoom <= 0) this.zoom = 1;

                const viewW = canvas.width / this.zoom;
                const viewH = canvas.height / this.zoom;

                this.x = cx - viewW / 2;
                this.y = cy - viewH / 2;

                const over = allowOver ? edgePad : 0;
                let clampMinX = allowOver ? -over : 0;
                let clampMaxX = allowOver ? (WORLD_WIDTH - viewW + over) : (WORLD_WIDTH - viewW);
                if (!allowOver && viewW >= WORLD_WIDTH) {
                    this.x = (WORLD_WIDTH - viewW) / 2;
                } else {
                    if (clampMaxX < clampMinX) { const mid = (clampMinX + clampMaxX) / 2; clampMinX = mid; clampMaxX = mid; }
                    this.x = Math.max(clampMinX, Math.min(this.x, clampMaxX));
                }

                let clampMinY = allowOver ? -over : 0;
                let clampMaxY = allowOver ? (WORLD_HEIGHT - viewH + over) : (WORLD_HEIGHT - viewH);
                if (!allowOver && viewH >= WORLD_HEIGHT) {
                    this.y = (WORLD_HEIGHT - viewH) / 2;
                } else {
                    if (clampMaxY < clampMinY) { const mid = (clampMinY + clampMaxY) / 2; clampMinY = mid; clampMaxY = mid; }
                    this.y = Math.max(clampMinY, Math.min(this.y, clampMaxY));
                }

                if (!isFinite(this.x)) this.x = 0;
                if (!isFinite(this.y)) this.y = 0;
            }
        };

        // === Core Object Classes === // Các lớp đối tượng
        class GameObject {
            constructor(x, y, radius) {
                this.x = x || 0; this.y = y || 0; this.radius = radius; this.markedForDeletion = false;
            }
            validatePosition() { if (isNaN(this.x)) this.x = 0; if (isNaN(this.y)) this.y = 0; }
        }

        // Particle system supports multiple types (circle/spark/shockwave/smoke/debris).
        class Particle extends GameObject {
            constructor(x, y, options) {
                super(x, y, options.size || Math.random() * 3 + 1);
                this.velocity = options.velocity || { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 };
                this.color = options.color || 'white';
                this.alpha = 1;
                this.life = options.life || 1.0;
                this.decay = options.decay || 0.02;
                this.type = options.type || 'circle'; // circle, spark, shockwave, smoke, debris
                this.maxRadius = options.maxRadius || 0; // Used for shockwave rendering.
                this.glowBlur = options.glowBlur || 0;
                this.glowColor = options.glowColor || this.color;
            }
            update() {
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                
                // Apply friction by particle type.
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

            draw() {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.alpha);
                
                if(this.type === 'shockwave') {
                    // Expanding ring.
                    if (this.glowBlur > 0) { ctx.shadowBlur = this.glowBlur; ctx.shadowColor = this.glowColor; }
                    const progress = 1 - this.alpha;
                    const currentRad = this.radius + (this.maxRadius - this.radius) * progress;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, currentRad, 0, Math.PI*2);
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 3 * this.alpha;
                    ctx.stroke();
                } else if (this.type === 'spark') {
                    // Thin spark line.
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x, this.y, 2, 2);
                } else if (this.type === 'debris') {
                    // Irregular debris shape.
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.alpha * 10);
                    ctx.fillStyle = this.color;
                    ctx.fillRect(-this.radius/2, -this.radius/2, this.radius, this.radius);
                } else if (this.type === 'smoke') {
                    // Soft circle.
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.fill();
                } else {
                    // Standard circle.
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        class Obstacle {
            constructor(x, y, width, height) {
                this.x = x; this.y = y; this.width = width; this.height = height;
            }
            draw() {
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

        class Pickup extends GameObject {
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
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y + this.floatOffset);
                ctx.shadowBlur = 15; ctx.shadowColor = this.config.color;
                // Ultra GFX compatibility: always use a valid color string.
                const __baseColor = (typeof __safeColor === 'function')
                    ? __safeColor(this.config && this.config.color, '#FFFFFF')
                    : ((this.config && this.config.color) ? this.config.color : '#FFFFFF');
                ctx.fillStyle = __baseColor;
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


        // Gold drop pickup entity.
        class Coin extends GameObject {
            constructor(x, y, value) {
                super(x, y, 10);
                this.value = value || 1;
                this.spawnTime = Date.now();
                this.maxLifeTime = 12000;
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
            draw() {
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

        // Bullet class handles trails, homing, and glow rendering.
        class Bullet extends GameObject {
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
                
                // Bullet trail system.
                this.trail = []; 
                this.maxTrailLength = 8;
            }

            update() {
                // Push position to trail (skip Fireball to avoid long streaks).
                if (!this.config.noTrail && this.typeKey !== 'FIREBALL') {
                    this.trail.push({x: this.x, y: this.y});
                    if(this.trail.length > this.maxTrailLength) this.trail.shift();
                } else {
                    // Keep trail empty.
                    this.trail.length = 0;
                }

                // Logic homing.
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

                // Align angle with current velocity (for correct ROCKET orientation).


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

            draw() {
                ctx.save();

                if (this.typeKey === 'ROCKET') {
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.angle);

                    const flicker = Math.random() * 0.5 + 0.5;
                    ctx.fillStyle = `rgba(255, 87, 34, ${flicker})`;
                    ctx.beginPath();
                    ctx.moveTo(-10, -4);
                    ctx.lineTo(-25 - Math.random()*10, 0);
                    ctx.lineTo(-10, 4);
                    ctx.fill();

                    ctx.fillStyle = '#424242';
                    ctx.fillRect(-10, -6, 20, 12);

                    ctx.strokeStyle = '#212121';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-10, -6, 20, 12);

                    ctx.fillStyle = '#D50000';
                    ctx.beginPath();
                    ctx.moveTo(10, -6);
                    ctx.lineTo(24, 0);
                    ctx.lineTo(10, 6);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#616161';
                    ctx.beginPath();
                    ctx.moveTo(-10, -6);
                    ctx.lineTo(-18, -12);
                    ctx.lineTo(-6, -6);
                    ctx.fill();
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(-10, 6);
                    ctx.lineTo(-18, 12);
                    ctx.lineTo(-6, 6);
                    ctx.fill();
                    ctx.stroke();

                }
                else if (this.typeKey === 'FIREBALL') {
                    ctx.translate(this.x, this.y);

                    const r = this.radius || 36;

                    ctx.shadowBlur = 30;
                    ctx.shadowColor = this.config.color || '#FF5722';

                    const g = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
                    g.addColorStop(0, 'rgba(255,255,255,0.95)');
                    g.addColorStop(0.25, 'rgba(255,183,77,0.95)');
                    g.addColorStop(0.6, 'rgba(255,87,34,0.85)');
                    g.addColorStop(1, 'rgba(255,87,34,0.10)');

                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fillStyle = g;
                    ctx.fill();

                    ctx.shadowBlur = 0;
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
                    ctx.strokeStyle = '#FF3D00';
                    ctx.lineWidth = 3;
                    ctx.globalAlpha = 0.9;
                    ctx.stroke();

                    ctx.globalAlpha = 1;
                } 
                else {
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

                    // Draw bullet head (kept from legacy code).
                    ctx.globalAlpha = 1;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = this.config.color;
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

        // Clone class.
        class CloneTank extends GameObject {
            constructor(x, y, ownerPid = 1) {
                super(x, y, 22);
                this.hp = SKILL_CONFIG.CLONE.hp; this.maxHp = SKILL_CONFIG.CLONE.hp;
                this.spawnTime = Date.now(); this.duration = SKILL_CONFIG.CLONE.duration;
                this.speed = 4; this.angle = 0; this.lastShot = 0; this.moveAngle = Math.random() * Math.PI * 2;
                this.ownerPid = ownerPid || 1;
                this.effects = { stun: { active: false, endTime: 0 }, slow: { active: false, endTime: 0, factor: 1 } };
            }
            applyEffect(effectConfig) {
                try {
                    if (!effectConfig || !effectConfig.type) return;
                    const now = Date.now();
                    if (effectConfig.type === 'STUN') {
                        const dur = (typeof effectConfig.duration === 'number') ? effectConfig.duration : 800;
                        this.effects.stun.active = true;
                        this.effects.stun.endTime = now + dur;
                    } else if (effectConfig.type === 'SLOW') {
                        const dur = (typeof effectConfig.duration === 'number') ? effectConfig.duration : 700;
                        const factor = (typeof effectConfig.factor === 'number') ? effectConfig.factor : 0.5;
                        this.effects.slow.active = true;
                        this.effects.slow.endTime = Math.max(this.effects.slow.endTime || 0, now + dur);
                        this.effects.slow.factor = Math.min(this.effects.slow.factor || 1, Math.max(0.15, Math.min(1, factor)));
                    }
                } catch(e){}
            }
            update(enemies, obstacles, bullets) {
                const now = Date.now();
                if (this.duration !== Infinity && now - this.spawnTime > this.duration) {
                    this.markedForDeletion = true; createComplexExplosion(this.x, this.y, COLORS.clone); return;
                }
                if (this.effects && this.effects.stun && this.effects.stun.active) {
                    if (now <= this.effects.stun.endTime) return;
                    this.effects.stun.active = false;
                }
                let nearest = null; let minDst = 1000;
                if (Game.mode === 'PVP_DUEL_AIM') {
                    const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                    __plist.forEach(p => {
                        if (!p || typeof p.hp === 'number' && p.hp <= 0) return;
                        if (p.isStealth) return;
                        if (this.ownerPid && p.pid === this.ownerPid) return;
                        const d = Math.hypot(p.x - this.x, p.y - this.y);
                        if (d < minDst) { minDst = d; nearest = p; }
                    });
                } else {
                    enemies.forEach(e => { const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < minDst) { minDst = d; nearest = e; } });
                }
                
                let moveSpeed = this.speed;
                if (this.effects && this.effects.slow && this.effects.slow.active) {
                    if (now <= this.effects.slow.endTime) moveSpeed *= (this.effects.slow.factor || 0.5);
                    else this.effects.slow.active = false;
                }

                let dodgeX = 0, dodgeY = 0;
                bullets.forEach(b => {
                    if (Game.mode === 'PVP_DUEL_AIM') {
                        if (b.owner !== 'PLAYER') return;
                        if (b.ownerPid != null && this.ownerPid && b.ownerPid === this.ownerPid) return;
                    } else {
                        if (b.owner !== 'ENEMY') return;
                    }
                        const d = Math.hypot(b.x - this.x, b.y - this.y);
                        if (d < 100) { 
                            const angleToBullet = Math.atan2(b.y - this.y, b.x - this.x);
                            dodgeX -= Math.cos(angleToBullet) * 2; dodgeY -= Math.sin(angleToBullet) * 2;
                        }
                });

                let desiredAngle = this.angle; let shouldMove = false;
                if (nearest) {
                    const dx = nearest.x - this.x; const dy = nearest.y - this.y; const dist = Math.hypot(dx, dy); desiredAngle = Math.atan2(dy, dx);
                    if (dist > 300) { shouldMove = true; } else if (dist < 150) { desiredAngle += Math.PI; shouldMove = true; } else { desiredAngle += Math.PI / 2; shouldMove = true; }
                    const aimAngle = Math.atan2(dy, dx); this.angle = aimAngle;
                    if (now - this.lastShot > 600) { this.shoot(aimAngle); this.lastShot = now; }
                } else {
                    shouldMove = true; desiredAngle = this.moveAngle; if(Math.random() < 0.05) this.moveAngle += (Math.random()-0.5); this.angle = desiredAngle;
                }
                if (dodgeX !== 0 || dodgeY !== 0) { desiredAngle = Math.atan2(dodgeY, dodgeX); shouldMove = true; }

                let bestAngle = desiredAngle; let foundPath = false;
                const checkAngles = [0, 20, -20, 45, -45, 70, -70, 90, -90, 110, -110, 135, -135, 160, -160, 180];
                for (let offset of checkAngles) {
                    const checkRad = (offset * Math.PI) / 180; const testAngle = desiredAngle + checkRad; if(isNaN(testAngle)) continue;
                    const lookAhead = Math.max(this.radius * 1.5, moveSpeed * 5); const nextX = this.x + Math.cos(testAngle) * lookAhead; const nextY = this.y + Math.sin(testAngle) * lookAhead;
                    let collided = false;
                    if (nextX < this.radius || nextX > WORLD_WIDTH - this.radius || nextY < this.radius || nextY > WORLD_HEIGHT - this.radius) { collided = true; }
                    if (!collided) { for (let obs of obstacles) { if (checkCircleRect({x: nextX, y: nextY, radius: this.radius + 2}, obs)) { collided = true; break; } } }
                    if (!collided) { bestAngle = testAngle; foundPath = true; break; }
                }
                if (shouldMove && foundPath && !isNaN(bestAngle)) { this.x += Math.cos(bestAngle) * moveSpeed; this.y += Math.sin(bestAngle) * moveSpeed; }
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
                const bullet = new Bullet(this.x, this.y, angle, 'NORMAL', BULLET_TYPES.NORMAL, 'PLAYER');
                bullet.ownerPid = this.ownerPid || 1;
                bullet.skillSource = 'CLONE'; bullet.skillKey = 'clone';
                bullet.config = { ...BULLET_TYPES.NORMAL, color: '#81D4FA' }; 
                Game.projectiles.push(bullet);
                createMuzzleFlash(this.x, this.y, this.angle, '#81D4FA');
            }
            takeDamage(amount) {
                const alv = (Game.upgrades && Game.upgrades.armorLv) ? (Game.upgrades.armorLv|0) : 0;
                const reduction = Math.min(0.60, alv * 0.05);
                const finalAmount = Math.max(1, Math.round(amount * (1 - reduction)));

                this.hp -= finalAmount;
                // (Phase 10.2) Clone HP should not update player HUD
createDamageText(this.x, this.y - 20, `-${finalAmount}`, COLORS.clone);

                if (this.hp <= 0) { this.markedForDeletion = true; createComplexExplosion(this.x, this.y, COLORS.clone); }
            }
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                // Scale visuals by radius (supports Siege Mode sizing).
                const __baseR = (this.baseRadius || 22);
                const __scale = (__baseR > 0) ? (this.radius / __baseR) : 1;
                if (!isNaN(__scale) && __scale !== 1) ctx.scale(__scale, __scale);

ctx.globalAlpha = 0.7; ctx.strokeStyle = COLORS.clone; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.radius + 5, 0, Math.PI*2); ctx.stroke();
                ctx.fillStyle = '#222'; ctx.fillRect(-22, -22, 44, 44); ctx.fillStyle = COLORS.clone; ctx.fillRect(-22, -22, 44, 44);
                ctx.rotate(this.angle); ctx.fillStyle = COLORS.cloneTurret; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(0, -6, 40, 12); ctx.restore();
            }
        }


        class Turret extends GameObject {
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
                this.ownerPid = (typeof cfg.ownerPid === 'number') ? cfg.ownerPid : 1;
            }

            update(obstacles) {
                const now = Date.now();
                if (now > this.endTime) {
                    this.markedForDeletion = true;
                    return;
                }

                // Prioritize nearest target with line-of-sight.
                let target = null;
                let minDst = this.range;
                const obs = obstacles || Game.obstacles;

                if (Game.mode === 'PVP_DUEL_AIM') {
                    const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                    for (const p of __plist) {
                        if (!p || typeof p.hp === 'number' && p.hp <= 0) continue;
                        if (p.isStealth) continue;
                        if (this.ownerPid && p.pid === this.ownerPid) continue;
                        const d = Math.hypot(p.x - this.x, p.y - this.y);
                        if (d < minDst) {
                            if (!isLineBlocked(this.x, this.y, p.x, p.y, obs)) {
                                minDst = d;
                                target = p;
                            }
                        }
                    }
                } else {
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
                bullet.ownerPid = this.ownerPid;
                bullet.ownerPlayer = null;
                bullet.skillSource = 'TURRET';
                bullet.skillKey = 'clone';
                Game.projectiles.push(bullet);
                createMuzzleFlash(this.x, this.y, angle, this.bulletColor);
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);

                // Lifetime display ring.
                const now = Date.now();
                const total = Math.max(1, (this.endTime - this.spawnTime));
                const remain = Math.max(0, this.endTime - now);
                const pct = Math.max(0, Math.min(1, remain / total));
                ctx.strokeStyle = 'rgba(102, 187, 106, 0.95)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
                ctx.stroke();

                // Main body.
                ctx.fillStyle = 'rgba(0,0,0,0.65)';
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
                ctx.fill();

                // Gun barrel.
                ctx.rotate(this.angle);
                ctx.fillStyle = '#263238';
                ctx.fillRect(0, -6, 42, 12);
                ctx.fillStyle = this.bulletColor;
                ctx.fillRect(0, -4, 34, 8);

                ctx.restore();
            }
        }

        class Enemy extends GameObject {
            constructor(x, y, typeKey, hpMultiplier = 1, dmgMultiplier = 1, speedMultiplier = 1, fireRateMultiplier = 1) {
                const config = ENEMY_TYPES[typeKey]; let radius = config.radius; if(typeKey === 'BOSS') radius = 70;
                super(x, y, radius); this.id = Math.random().toString(36).substr(2, 9); this.typeKey = typeKey; this.config = config; this.dmgMult = dmgMultiplier; this.speedMult = speedMultiplier; this.fireRateMult = fireRateMultiplier; this.contactDamage = Math.min(25, Math.round(5 * this.dmgMult)); this.maxHp = config.maxHp * hpMultiplier; this.hp = this.maxHp; this.angle = 0; this.effects = { stun: { active: false, endTime: 0 }, burn: { active: false, endTime: 0, nextTick: 0, damage: 0 }, slow: { active: false, endTime: 0, factor: 1 } }; this.lastShot = 0; this.bossState = 0; this.bossTimer = 0;
            }
            applyEffect(effectConfig) {
                if (this.typeKey === 'BOSS' && effectConfig.type === 'STUN') return; 
                const now = Date.now();
                if (effectConfig.type === 'STUN') { this.effects.stun.active = true; this.effects.stun.endTime = now + effectConfig.duration; } 
                else if (effectConfig.type === 'SLOW') {
                        const dur = (typeof effectConfig.duration === 'number') ? effectConfig.duration : 700;
                        const factor = (typeof effectConfig.factor === 'number') ? effectConfig.factor : 0.5;
                        if (!this.effects.slow) this.effects.slow = { active: false, endTime: 0, factor: 1 };
                        this.effects.slow.active = true;
                        this.effects.slow.endTime = Math.max(this.effects.slow.endTime || 0, now + dur);
                        this.effects.slow.factor = Math.min(this.effects.slow.factor || 1, Math.max(0.15, Math.min(1, factor)));
                    }
                    else if (effectConfig.type === 'BURN') { this.effects.burn.active = true; this.effects.burn.endTime = now + effectConfig.duration; this.effects.burn.nextTick = now + effectConfig.tickInterval; this.effects.burn.damage = effectConfig.tickDamage; }
            }
            update(player, clones, obstacles) {
                const now = Date.now();
                if (this.effects.stun.active && now <= this.effects.stun.endTime) return;
                if (this.effects.burn.active) {
                    if (now > this.effects.burn.endTime) this.effects.burn.active = false;
                    else if (now >= this.effects.burn.nextTick) { this.hp -= this.effects.burn.damage; this.effects.burn.nextTick = now + 500; createDamageText(this.x, this.y - 10, this.effects.burn.damage, '#FF5722'); }
                }

                let targets = [];
                const _playersArr = Array.isArray(player) ? player : (player ? [player] : []);
                for (let _i = 0; _i < _playersArr.length; _i++) {
                    const _p = _playersArr[_i];
                    if (!_p) continue;
                    if (typeof _p.hp === 'number' && _p.hp <= 0) continue;
                    if (_p.isStealth) continue;
                    targets.push(_p);
                }
                if (clones && clones.length) targets = targets.concat(clones);
                let target = null; if (targets.length > 0) { let minDst = Infinity; targets.forEach(t => { const d = Math.hypot(t.x - this.x, t.y - this.y); if(d < minDst) { minDst = d; target = t; } }); }
                if (!target) { this.x += Math.cos(now/1000) * 1; this.y += Math.sin(now/1000) * 1; this.validatePosition(); return; }

                const dx = target.x - this.x; const dy = target.y - this.y; const dist = Math.hypot(dx, dy); let desiredAngle = Math.atan2(dy, dx); let moveSpeed = this.config.speed * this.speedMult;

                    if (this.effects.slow && this.effects.slow.active) {
                        if (now <= this.effects.slow.endTime) moveSpeed *= (this.effects.slow.factor || 0.5);
                        else this.effects.slow.active = false;
                    }
                if (this.typeKey === 'BOSS') {
                    const hpBar = document.getElementById('bossHealthBar'); const hpContainer = document.getElementById('bossHealthContainer'); if (hpContainer.style.display !== 'block') hpContainer.style.display = 'block'; hpBar.style.width = `${(this.hp / this.maxHp) * 100}%`;
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
                            nextSummon: now + 7800
                        };
                        this._lastBossUpdate = now;
                    }
                    const ai = this.bossAI;

                    const dtBoss = Math.max(0.5, Math.min(2.0, (now - (this._lastBossUpdate || now)) / 16.666));
                    this._lastBossUpdate = now;

                    const hpPct = this.maxHp > 0 ? (this.hp / this.maxHp) : 1;

                    const waveNow = (typeof WaveManager !== 'undefined' && WaveManager.wave) ? (WaveManager.wave | 0) : 1;
                    const enrageLvl = Math.max(0, Math.min(1, (waveNow - 1) / 15));
                    const shouldEnrage = (hpPct <= 0.25);
                    if (shouldEnrage && !ai.enraged) {
                        ai.enraged = true;
                        createComplexExplosion(this.x, this.y, "#FF1744");
                        createDamageText(this.x, this.y - 80, "CU?NG N?!", "#FF1744");
                    }
                    if (!shouldEnrage) ai.enraged = false;

                    const enrageCdMult = ai.enraged ? Math.max(0.55, 0.85 - 0.25 * enrageLvl) : 1;
                    const enrageShootMult = ai.enraged ? (1.15 + 0.45 * enrageLvl) : 1;
                    const enrageMoveMult = ai.enraged ? (1.10 + 0.20 * enrageLvl) : 1;


                    moveSpeed = (dist > 320 ? 1.35 : 0.55) * this.speedMult * enrageMoveMult;

                    // Resolve current cast/state flow.
                    if (ai.state === 'charge_windup') {
                        moveSpeed = 0;
                        this.angle = ai.chargeDir;
                        if (now >= ai.stateEnd) {
                            ai.state = 'charge';
                            ai.stateEnd = now + 900;
                            const spd = (10.5 + (hpPct < 0.5 ? 1.5 : 0) + (ai.enraged ? (1.8 + 2.2 * enrageLvl) : 0)) * this.speedMult;
                            ai.chargeVx = Math.cos(ai.chargeDir) * spd;
                            ai.chargeVy = Math.sin(ai.chargeDir) * spd;
                            this.contactDamage = Math.round(18 * this.dmgMult * (ai.enraged ? (1.15 + 0.35 * enrageLvl) : 1));
                        }
                    } else if (ai.state === 'charge') {
                        this.x += ai.chargeVx * dtBoss;
                        this.y += ai.chargeVy * dtBoss;
                        moveSpeed = 0;
                        this.angle = ai.chargeDir;
                        this.contactDamage = Math.round(18 * this.dmgMult * (ai.enraged ? (1.15 + 0.35 * enrageLvl) : 1));
                        if (now >= ai.stateEnd) {
                            ai.state = 'idle';
                            this.contactDamage = Math.round(10 * this.dmgMult * (ai.enraged ? (1.10 + 0.30 * enrageLvl) : 1));
                        }
                    } else if (ai.state === 'radial_windup') {
                        moveSpeed *= 0.35;
                        if (now >= ai.stateEnd) {
                            const count = (hpPct < 0.5 ? 26 : 20) + (ai.enraged ? (4 + Math.round(4 * enrageLvl)) : 0);
                            for (let i = 0; i < count; i++) {
                                const ang = (i / count) * Math.PI * 2;
                                this.shoot(ang, 'FAST');
                            }
                            createDamageText(this.x, this.y - 70, "BẮN VÒNG TRÒN!", "#FF1744");
                            ai.state = 'idle';
                        }
                    } else if (ai.state === 'summon_cast') {
                        moveSpeed *= 0.25;
                        if (now >= ai.stateEnd) {
                            const cnt = (hpPct < 0.5 ? 5 : 4) + (ai.enraged ? (2 + Math.round(1 * enrageLvl)) : 0);
                            const types = ['RED','RED','RED','BLACK','YELLOW','PURPLE'];
                            const sc = (typeof WaveManager !== 'undefined' && WaveManager.scaling) ? WaveManager.scaling
                                      : ((typeof WaveManager !== 'undefined' && typeof WaveManager.computeScaling === 'function') ? WaveManager.computeScaling() : null);

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
                                const frM  = sc ? sc.fireRateMult : 1;

                                Game.enemies.push(new Enemy(sx, sy, tk, hpM, dmgM, spdM, frM));
                            }
                            createComplexExplosion(this.x, this.y, "#FF1744");
                            createDamageText(this.x, this.y - 70, "GỌI LÍNH!", "#FF1744");
                            ai.state = 'idle';
                        }
                    }

                    // Trigger boss abilities only while idle.
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
                                createDamageText(this.x, this.y - 70, "CHUẨN BỊ HÚC!", "#FF1744");
                            } else if (pick === 'radial') {
                                ai.state = 'radial_windup';
                                ai.stateEnd = now + 550;
                                ai.nextRadial = now + (hpPct < 0.5 ? 6000 : 7200) * enrageCdMult;
                            } else if (pick === 'mines') {
                                const mineCount = (hpPct < 0.5 ? 10 : 8) + (ai.enraged ? (3 + Math.round(3 * enrageLvl)) : 0);
                                const mineRadius = 80;
                                const delay = ai.enraged ? Math.max(900, 1300 - Math.round(250 * enrageLvl)) : 1500;
                                const dmgBase = (18 + (hpPct < 0.5 ? 4 : 0));
                                const dmg = Math.round(dmgBase * this.dmgMult * (ai.enraged ? (1.2 + 0.3 * enrageLvl) : 1));

                                if (!Game.bossMines) Game.bossMines = [];
                                for (let i = 0; i < mineCount; i++) {
                                    const ang = (i / mineCount) * Math.PI * 2 + Math.random() * 0.25;
                                    const r = 110 + Math.random() * 90;
                                    let mx = this.x + Math.cos(ang) * r;
                                    let my = this.y + Math.sin(ang) * r;
                                    mx = Math.max(60, Math.min(WORLD_WIDTH - 60, mx));
                                    my = Math.max(60, Math.min(WORLD_HEIGHT - 60, my));
                                    Game.bossMines.push({ x: mx, y: my, radius: mineRadius, spawnAt: now, detonateAt: now + delay, delay: delay, damage: dmg });
                                }
                                createDamageText(this.x, this.y - 70, "THẢ MÌN!", "#FF9800");
                                ai.nextMines = now + (hpPct < 0.5 ? 8000 : 9800) * enrageCdMult;
                            } else if (pick === 'summon') {
                                ai.state = 'summon_cast';
                                ai.stateEnd = now + 650;
                                ai.nextSummon = now + (hpPct < 0.5 ? 11000 : 13500) * enrageCdMult;
                                createDamageText(this.x, this.y - 70, "GỌI LÍNH!", "#FF1744");
                            }
                        }
                    }

                    // Baseline shooting (disabled during windup/casts).
                    const canShoot = (ai.state === 'idle');
                    if (canShoot && now - this.lastShot > (this.config.fireRate / (this.fireRateMult * enrageShootMult))) { 
                        this.shoot(desiredAngle, 'FAST');
                        this.lastShot = now;
                    }
                } else {
                    if (this.config.behavior === 'ORBIT' && dist < 250) desiredAngle += Math.PI / 2;
                    else if (this.config.behavior === 'SNIPER') { if (dist < 400) desiredAngle += Math.PI; else if (dist < 450) moveSpeed = 0; }
                    const fr = (this.config.fireRate / this.fireRateMult); if (this.config.fireRate && now - this.lastShot > fr) { if (dist < 800 && !isLineBlocked(this.x, this.y, target.x, target.y, obstacles)) { this.shoot(desiredAngle, 'NORMAL'); this.lastShot = now; } }
                }

                let bestAngle = desiredAngle; let foundPath = false;
                const checkAngles = [0, 20, -20, 45, -45, 65, -65, 90, -90, 110, -110, 135, -135, 160, -160, 180];
                for (let offset of checkAngles) {
                    const testAngle = desiredAngle + (offset * Math.PI) / 180; if(isNaN(testAngle)) continue;
                    const lookAhead = Math.max(this.radius * 1.5, (this.config.speed * this.speedMult) * 5); const nextX = this.x + Math.cos(testAngle) * lookAhead; const nextY = this.y + Math.sin(testAngle) * lookAhead;
                    let collided = false;
                    if (nextX < this.radius || nextX > WORLD_WIDTH - this.radius || nextY < this.radius || nextY > WORLD_HEIGHT - this.radius) collided = true;
                    if (!collided) { if (this.typeKey !== 'BOSS') { for (let obs of obstacles) { if (checkCircleRect({x: nextX, y: nextY, radius: this.radius + 5}, obs)) { collided = true; break; } } } }
                    if (!collided) { bestAngle = testAngle; foundPath = true; break; }
                }

                if (moveSpeed > 0 && (foundPath || this.typeKey === 'BOSS') && !isNaN(bestAngle)) { this.x += Math.cos(bestAngle) * moveSpeed; this.y += Math.sin(bestAngle) * moveSpeed; this.angle = bestAngle; } else { this.angle = Math.atan2(dy, dx); }

                for (let i = obstacles.length - 1; i >= 0; i--) {
                    let obs = obstacles[i];
                    if (checkCircleRect({x: this.x, y: this.y, radius: this.radius}, obs)) {
                        if (this.typeKey === 'BOSS') { obstacles.splice(i, 1); createComplexExplosion(obs.x + obs.width/2, obs.y + obs.height/2, '#546E7A'); createDamageText(this.x, this.y - 50, "CRUSH!", "#D50000"); } 
                        else { const anglePush = Math.atan2(this.y - (obs.y + obs.height/2), this.x - (obs.x + obs.width/2)); if(!isNaN(anglePush)) { this.x += Math.cos(anglePush) * 2; this.y += Math.sin(anglePush) * 2; } }
                    }
                }
                this.x = Math.max(0, Math.min(WORLD_WIDTH, this.x)); this.y = Math.max(0, Math.min(WORLD_HEIGHT, this.y)); this.validatePosition();
            }
            shoot(angle, mode) {
                if(isNaN(angle)) return;
                let speed = this.config.bulletSpeed; let dmg = this.config.bulletDmg; let color = this.typeKey === 'YELLOW' ? '#FFF59D' : '#E040FB';
                if (this.typeKey === 'BOSS') { color = '#FF1744'; if (mode === 'HEAVY') { dmg = 40; } if (mode === 'FAST') { speed = 12; } } dmg = Math.round(dmg * this.dmgMult);
                const bulletConfig = { damage: dmg, speed: speed, color: color, radius: 6 };
                const bullet = new Bullet(this.x, this.y, angle, 'NORMAL', bulletConfig, 'ENEMY');
                bullet.sourceEnemy = this;
                if (mode === 'HEAVY') bullet.radius = 10;
                Game.projectiles.push(bullet);
                createMuzzleFlash(this.x, this.y, angle, color);
            }
            draw() {
                ctx.save(); ctx.translate(this.x, this.y); if (this.effects.stun.active) { ctx.strokeStyle = '#00BCD4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, this.radius + 5, 0, Math.PI*2); ctx.stroke(); }
                ctx.rotate(this.angle);
                ctx.fillStyle = this.config.color; if (this.config.outline) { ctx.strokeStyle = this.config.outline; ctx.lineWidth = 3; ctx.strokeRect(-this.radius, -this.radius, this.radius*2, this.radius*2); }
                ctx.fillRect(-this.radius, -this.radius, this.radius*2, this.radius*2);
                if (this.typeKey === 'BOSS') { ctx.fillStyle = '#B71C1C'; ctx.fillRect(-20, -20, 40, 40); ctx.strokeStyle = '#FFEB3B'; ctx.strokeRect(-this.radius, -this.radius, this.radius*2, this.radius*2); }
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, -5, this.radius + 5, 10); ctx.restore();
                if (this.typeKey === 'BOSS' && this.bossAI) {
                    const now2 = Date.now();
                    const ai = this.bossAI;

                    if (ai.enraged) {
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
                if (this.typeKey !== 'BOSS') { const hpPercent = this.hp / this.maxHp; ctx.fillStyle = 'red'; ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30, 4); ctx.fillStyle = '#0f0'; ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30 * hpPercent, 4); }
            }
        }

        class Player extends GameObject {
            constructor(systemId = 'default') {
                super(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 22);
                this.systemId = systemId || 'default';
                // System base stats used as upgrade/save baseline.
                const STATS = {
                    default:    { hp: 100, spd: 6.5, armor: 0,    cdMult: 1.0,  rad: 22 },
                    speed:      { hp: 85,  spd: 8.2, armor: 0,    cdMult: 0.85, rad: 22 },
                    engineer:   { hp: 120, spd: 6.0, armor: 0.05, cdMult: 1.0,  rad: 22 },
                    juggernaut: { hp: 160, spd: 5.0, armor: 0.15, cdMult: 1.10, rad: 24 },
                    mage:       { hp: 70,  spd: 6.2, armor: 0,    cdMult: 1.0,  rad: 19 },
                    assassin:   { hp: 105, spd: 7.6, armor: 0.08, cdMult: 0.88, rad: 21 }
                };
                let s = STATS[this.systemId] || STATS.default;
                if (this.systemId === 'assassin' && typeof Game !== 'undefined' && Game && Game.mode === 'PVP_DUEL_AIM') {
                    s = { hp: 101, spd: 7.44, armor: 0.068, cdMult: 0.908, rad: 21 };
                }
                this.__baseMaxHp = s.hp; // used by upgrade rebase
                this.baseMaxHp = s.hp;   // compatibility
                this.maxHp = s.hp; this.hp = this.maxHp;
                this.baseSpeed = s.spd; this.speed = this.baseSpeed;
                this.baseRadius = s.rad; this.radius = this.baseRadius;
                this.innateArmor = s.armor;
                this.innateCdMult = s.cdMult;
                this.angle = 0; this.inventory = [{ id: 'NORMAL', level: 1 }]; this.currentWeaponIndex = 0; this.ultiCharge = 0; 
                this.buffs = { shield: { active: false, endTime: 0 }, juggerShield: { active: false, endTime: 0 }, rapid: { active: false, endTime: 0 }, phase: { active: false, endTime: 0 }, adrenaline: { active: false, endTime: 0, speedMult: 1.25, fireMult: 0.85, damageMult: 1.3 } , siege: { active: false, endTime: 0, speedMult: 0.3, fireMult: 0.5, sizeMult: 1.35, armorBase: 0.35, armorMult: 3 }};
                this.skills = { clone: { lastUsed: 0, active: false }, stealth: { lastUsed: 0, active: false, endTime: 0 }, vampirism: { lastUsed: 0, active: false, endTime: 0 } };
                this.vampHeal = { windowStart: 0, healed: 0 };
                this.dash = { active: false, endTime: 0, vx: 0, vy: 0 };
                this.ram = { active: false, endTime: 0, vx: 0, vy: 0, hitSet: new Set() };
                this.isStealth = false; this.lastShot = 0;
                this.invulnerable = false;
                this.effects = { stun: { active: false, endTime: 0 }, slow: { active: false, endTime: 0, factor: 1 } };

                // Mage-specific runtime state.
                this.mage = { blizzard: { active: false, x: 0, y: 0, endTime: 0, nextTick: 0, locked: false } };

                // Lightweight Assassin FX cache.
                this._assFx = { after: [], slashes: [], flashes: [] };

                // Base stats are applied from the STATS table above.
            }
            activateCheat() { this.inventory = [{ id: 'NORMAL', level: 5 }, { id: 'STUN', level: 5 }, { id: 'LIGHTNING', level: 5 }, { id: 'FIRE', level: 5 }, { id: 'PIERCING', level: 5 }, { id: 'HOMING', level: 5 }]; if (this.currentWeaponIndex >= this.inventory.length) { this.currentWeaponIndex = 0; } this.ultiCharge = 100; createDamageText(this.x, this.y - 60, "CHEAT ACTIVATED!", "#FFD700"); Game.ui.updateWeaponInventory(this.inventory, this.currentWeaponIndex); }
            addWeapon(weaponId) {
                const existingIndex = this.inventory.findIndex(w => w.id === weaponId);
                if (existingIndex !== -1) { if (this.inventory[existingIndex].level < 5) { this.inventory[existingIndex].level++; createDamageText(this.x, this.y - 40, `UPGRADE! LVL ${this.inventory[existingIndex].level}`, "#FFD700"); if (this.currentWeaponIndex === existingIndex) { Game.ui.updateWeaponInventory(this.inventory, this.currentWeaponIndex); } } else { createDamageText(this.x, this.y - 40, "MAX LEVEL!", "#fff"); } } 
                else { if (this.inventory.length >= 6) { createDamageText(this.x, this.y - 40, "FULL!", "#ff4444"); } else { this.inventory.push({ id: weaponId, level: 1 }); createDamageText(this.x, this.y - 40, "NEW WEAPON!", "#fff"); this.selectWeapon(this.inventory.length - 1); } }
                Game.ui.updateWeaponInventory(this.inventory, this.currentWeaponIndex);
            }
            selectWeapon(index) { if (index >= 0 && index < this.inventory.length) this.currentWeaponIndex = index; else this.currentWeaponIndex = 0; Game.ui.updateWeaponInventory(this.inventory, this.currentWeaponIndex); }
            loseCurrentWeapon() {
                // On-hit weapon penalty: simplified, readable, and stable.

                if (!this.inventory || this.inventory.length === 0) {
                    this.inventory = [{ id: 'NORMAL', level: 1 }];
                    this.currentWeaponIndex = 0;
                    Game.ui.updateWeaponInventory(this.inventory, this.currentWeaponIndex);
                    return;
                }

                if (!this.inventory[0] || this.inventory[0].id !== 'NORMAL') {
                    this.inventory.unshift({ id: 'NORMAL', level: 1 });
                    if (typeof this.currentWeaponIndex === 'number') this.currentWeaponIndex += 1;
                }

                if (this.currentWeaponIndex == null || this.currentWeaponIndex < 0 || this.currentWeaponIndex >= this.inventory.length) {
                    this.currentWeaponIndex = 0;
                }

                const currentWep = this.inventory[this.currentWeaponIndex];
                if (!currentWep) {
                    this.currentWeaponIndex = 0;
                    Game.ui.updateWeaponInventory(this.inventory, this.currentWeaponIndex);
                    return;
                }

                if (currentWep.id === 'NORMAL') {
                    const lv = (currentWep.level | 0) || 1;
                    if (lv > 1) {
                        currentWep.level = lv - 1;
                        createDamageText(this.x, this.y - 60, "GIẢM 1 CẤP!", "#ff4444");
                    } else {
                        currentWep.level = 1;
                    }
                    Game.ui.updateWeaponInventory(this.inventory, this.currentWeaponIndex);
                    return;
                }

                // Special-weapon handling branch.
                const lv = (currentWep.level | 0) || 1;
                if (lv > 1) {
                    currentWep.level = lv - 1;
                    createDamageText(this.x, this.y - 60, "GIẢM 1 CẤP!", "#ff4444");
                } else {
                    this.inventory.splice(this.currentWeaponIndex, 1);
                    this.currentWeaponIndex = 0;
                    createDamageText(this.x, this.y - 60, "MẤT VŨ KHÍ!", "#ff4444");
                }

                Game.ui.updateWeaponInventory(this.inventory, this.currentWeaponIndex);
            }
            getCurrentWeaponObj() { if (this.currentWeaponIndex === -1 || !this.inventory[this.currentWeaponIndex]) return { id: 'NORMAL', level: 1 }; return this.inventory[this.currentWeaponIndex]; }
            useSkill(skillName) {
                const now = Date.now();
                const config = getSystemSkillDef(this.systemId, skillName);
                const skillState = this.skills[skillName];
                if (!skillState || !config) return;
                const __isPvpSkill = (Game && Game.mode === 'PVP_DUEL_AIM');

                // Cooldown gate (admin cheat can disable cooldowns).
                const __skillCd = (config.cooldown || 0);
                const __noSkillCd = !!(Game && Game.adminNoSkillCooldown);
                if (__isPvpSkill && !__noSkillCd && now < (this._pvpSkillLockUntil || 0)) return;
                if (!__noSkillCd && (now - skillState.lastUsed < __skillCd)) return;

                if (this.systemId === 'speed') {
                    skillState.lastUsed = now;

                    if (skillName === 'clone') {
                        let dx = 0, dy = 0;
                        if (Input.keys.w) dy -= 1; if (Input.keys.s) dy += 1; if (Input.keys.a) dx -= 1; if (Input.keys.d) dx += 1;
                        if (dx === 0 && dy === 0) { dx = Math.cos(this.angle); dy = Math.sin(this.angle); }
                        const len = Math.hypot(dx, dy) || 1;
                        dx /= len; dy /= len;

                        const dur = config.duration || 250;
                        const dashSpeed = (this.baseSpeed || this.speed || 6.5) * (config.dashSpeedMult || 3.2);

                        this.dash.active = true;
                        this.dash.endTime = now + dur;
                        this.dash.vx = dx * dashSpeed;
                        this.dash.vy = dy * dashSpeed;

                        createDamageText(this.x, this.y - 40, 'DASH!', config.color || '#4FC3F7');
                        return;
                    }

                    if (skillName === 'stealth') {
                        const dur = config.duration || 800;
                        this.buffs.phase.active = true;
                        this.buffs.phase.endTime = now + dur;
                        Game.ui.removeBuff('Phase');
                        Game.ui.addBuff('Phase', config.color || '#81D4FA');
                        createDamageText(this.x, this.y - 40, 'PHASE!', config.color || '#81D4FA');
                        return;
                    }

                    if (skillName === 'vampirism') {
                        const dur = config.duration || 4000;
                        this.buffs.adrenaline.active = true;
                        this.buffs.adrenaline.endTime = now + dur;
                        this.buffs.adrenaline.speedMult = config.speedMult || 1.25;
                        this.buffs.adrenaline.fireMult = (config.fireMult != null) ? config.fireMult : 0.5;
                        this.buffs.adrenaline.damageMult = config.damageMult || 1.3;
                        Game.ui.removeBuff('Adren');
                        Game.ui.addBuff('Adren', config.color || '#29B6F6');
                        createDamageText(this.x, this.y - 40, 'ADREN!', config.color || '#29B6F6');
                        return;
                    }
                }

                if (this.systemId === 'engineer') {
                    skillState.lastUsed = now;

                    if (skillName === 'clone') {
                        if (!Game.turrets) Game.turrets = [];
                        const maxT = config.maxTurrets || 1;

                        if (Game.turrets.length >= maxT) {
                            const old = Game.turrets.shift();
                            if (old) { old.markedForDeletion = true; createComplexExplosion(old.x, old.y, config.color || '#81C784'); }
                            createDamageText(this.x, this.y - 60, 'THAY THẾ!', '#ccc');
                        }

                        const off = 55;
                        const candidates = [
                            { x: this.x + Math.cos(this.angle) * off, y: this.y + Math.sin(this.angle) * off },
                            { x: this.x - Math.cos(this.angle) * off, y: this.y - Math.sin(this.angle) * off },
                            { x: this.x + off, y: this.y },
                            { x: this.x - off, y: this.y },
                            { x: this.x, y: this.y + off },
                            { x: this.x, y: this.y - off }
                        ];
                        let pos = candidates[0];
                        outer: for (const c of candidates) {
                            for (const obs of Game.obstacles) {
                                if (checkCircleRect({ x: c.x, y: c.y, radius: 22 }, obs)) continue outer;
                            }
                            pos = c;
                            break;
                        }

                        const turret = new Turret(pos.x, pos.y, {
                            duration: config.duration || 10000,
                            range: config.range || 650,
                            fireRate: config.fireRate || 320,
                            color: config.color || '#81C784',
                            bulletColor: config.bulletColor || '#66BB6A',
                            bulletDmgMult: (typeof config.bulletDmgMult === 'number') ? config.bulletDmgMult : 0.65,
                            ownerPid: (this.pid || 1)
                        });
                        Game.turrets.push(turret);
                        createDamageText(this.x, this.y - 40, 'TURRET!', config.color || '#81C784');
                        return;
                    }

                    if (skillName === 'stealth') {
                        const healAmt = (typeof config.healPct === 'number')
                            ? Math.round((this.maxHp || 0) * config.healPct)
                            : (config.heal || 30);
                        if (typeof this.heal === 'function') this.heal(healAmt);
                        else {
                            this.hp = Math.min(this.maxHp, this.hp + healAmt);
                            const __pidPrevH = Game.__uiPid;
                            try { Game.__uiPid = (this.pid || 1); Game.ui.updateHealth(this.hp, this.maxHp); }
                            finally { Game.__uiPid = __pidPrevH; }
                        }
                        createDamageText(this.x, this.y - 40, 'REPAIR!', config.color || '#A5D6A7');
                        createComplexExplosion(this.x, this.y, '#4CAF50', 10);
                        return;
                    }

                                        if (skillName === 'vampirism') {
                        const radius = config.radius || 340;
                        const dur = config.stunDuration || 1200;
                        const now2 = Date.now();
                        let hit = 0;
                        let bulletsCleared = 0;
                        let bossFrozen = 0;

                        if (Game.projectiles && Game.projectiles.length) {
                            for (const b of Game.projectiles) {
                                if (!b || b.markedForDeletion) continue;
                                if (Game.mode === 'PVP_DUEL_AIM') {
                                    if (b.owner !== 'PLAYER') continue;
                                    if (b.ownerPid != null && b.ownerPid === (this.pid || 1)) continue;
                                } else {
                                    if (b.owner !== 'ENEMY') continue;
                                }
                                const dB = Math.hypot(b.x - this.x, b.y - this.y);
                                if (dB <= radius) { b.markedForDeletion = true; bulletsCleared++; }
                            }
                        }

                        if (Game.mode === 'PVP_DUEL_AIM') {
                            const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                            for (const __pl of __plist) {
                                if (!__pl || __pl === this || typeof __pl.hp !== 'number' || __pl.hp <= 0) continue;
                                if (__pl.isStealth) continue;
                                const d = Math.hypot(__pl.x - this.x, __pl.y - this.y);
                                if (d > radius) continue;
                                const base = (typeof __pl.maxHp === 'number' && __pl.maxHp > 0) ? __pl.maxHp : __pl.hp;
                                const dmgMultSkill = (1 + 0.1 * ((Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0));
                                const basePvpDmg = Math.max(20, Math.round(base * 0.02)); // ~2% HP
                                const pvpDmg = Math.max(1, Math.round(basePvpDmg * dmgMultSkill));
                                if (typeof __pl.applyEffect === 'function') __pl.applyEffect({ type: 'STUN', duration: dur });
                                if (typeof __pl.takeDamage === 'function') __pl.takeDamage(pvpDmg, { attacker: this, type: 'PVP_EMP' });
                                else { __pl.hp -= pvpDmg; if (__pl.hp < 0) __pl.hp = 0; }
                                createDamageText(__pl.x, __pl.y - 10, '-' + pvpDmg, '#B3E5FC');
                                hit++;
                            }
                            if (Game.clones && Game.clones.length) {
                                for (const __cl of Game.clones) {
                                    if (!__cl || __cl.markedForDeletion) continue;
                                    if (__cl.ownerPid && __cl.ownerPid === (this.pid || 1)) continue;
                                    const dC = Math.hypot(__cl.x - this.x, __cl.y - this.y);
                                    if (dC > radius) continue;
                                    const baseC = (typeof __cl.maxHp === 'number' && __cl.maxHp > 0) ? __cl.maxHp : __cl.hp;
                                    const dmgMultSkill = (1 + 0.1 * ((Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0));
                                    const basePvpDmgC = Math.max(3, Math.round(baseC * 0.02));
                                    const pvpDmgC = Math.max(1, Math.round(basePvpDmgC * dmgMultSkill));
                                    if (typeof __cl.applyEffect === 'function') __cl.applyEffect({ type: 'STUN', duration: dur });
                                    if (typeof __cl.takeDamage === 'function') __cl.takeDamage(pvpDmgC);
                                    hit++;
                                }
                            }
                        } else {
                            for (const e of Game.enemies) {
                                if (!e || e.markedForDeletion || e.hp <= 0) continue;
                                const d = Math.hypot(e.x - this.x, e.y - this.y);
                                if (d > radius) continue;
                                if (e.typeKey === 'BOSS') {
                                    if (e.effects && e.effects.stun) { e.effects.stun.active = true; e.effects.stun.endTime = now2 + Math.min(dur, 1800); }
                                    const base = (typeof e.maxHp === 'number' && e.maxHp > 0) ? e.maxHp : e.hp;
                                    const dmgMultSkill = (1 + 0.1 * ((Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0));
                                    const baseBossDmg = Math.max(30, Math.round(base * 0.015)); // ~1.5% HP (nh?)
                                    const bossDmg = Math.max(1, Math.round(baseBossDmg * dmgMultSkill));
                                    e.hp -= bossDmg;
                                    createDamageText(e.x, e.y - 10, '-' + bossDmg, '#B3E5FC');
                                    createDamageText(e.x, e.y - 32, 'ĐÓNG BĂNG!', '#00E5FF');
                                    createComplexExplosion(e.x, e.y, '#00E5FF', 10);
                                    bossFrozen++;
                                } else {
                                    e.applyEffect({ type: 'STUN', duration: dur });
                                    hit++;
                                }
                            }
                        }

                        // Shockwave visual effect.
                        Game.particles.push(new Particle(this.x, this.y, { type: 'shockwave', color: '#00E5FF', size: 12, maxRadius: radius, decay: 0.03 }));
                        createDamageText(this.x, this.y - 40, 'EMP! (' + hit + ')', '#00E5FF');
                        if (bulletsCleared > 0) createDamageText(this.x, this.y - 62, 'TAN ĐẠN: ' + bulletsCleared, '#B3E5FC');
                        if (bossFrozen > 0) createDamageText(this.x, this.y - 84, 'BOSS ĐÓNG BĂNG!', '#00E5FF');
                        Game.shake = Math.max(Game.shake, 14);
                        return;
                    }
                }


                // Juggernaut system: J2 - Ram.
                if (this.systemId === 'juggernaut') {
                    skillState.lastUsed = now;

                    // Juggernaut system: J1 - Q Reflect Armor.
                    if (skillName === 'clone') {
                        const dur = (config && config.duration) ? config.duration : 5000;
                        this.buffs.juggerShield.active = true;
                        this.buffs.juggerShield.endTime = now + dur;
                        Game.ui.removeBuff('Gi\u00e1p Ph\u1ea3n');
                        Game.ui.addBuff('Gi\u00e1p Ph\u1ea3n', (config && config.color) ? config.color : '#FFD54F');
                        createDamageText(this.x, this.y - 40, 'GI\u00c1P PH\u1ea2N!', (config && config.color) ? config.color : '#FFD54F');
                        Game.shake = Math.max(Game.shake, 6);
                        return;
                    }

                    if (skillName === 'stealth') {
                        // E: Ram - short speed burst; collision deals damage and knockback.
                        let dx = Math.cos(this.angle), dy = Math.sin(this.angle);
                        const len = Math.hypot(dx, dy) || 1;
                        dx /= len; dy /= len;

                        const dur = config.duration || 1000;
                        const mult = config.ramSpeedMult || 3.0; // +200% speed => x3
                        const ramSpeed = (this.baseSpeed || this.speed || 6.5) * mult;

                        if (!this.ram) this.ram = { active: false, endTime: 0, vx: 0, vy: 0, hitSet: new Set() };
                        this.ram.active = true;
                        this.ram.endTime = now + dur;
                        this.ram.vx = dx * ramSpeed;
                        this.ram.vy = dy * ramSpeed;
                        this.ram.hitSet = new Set();

                        createDamageText(this.x, this.y - 40, 'C\u00da H\u00daC!', config.color || '#FFCA28');
                        Game.shake = Math.max(Game.shake, 12);
                        return;
                    }

                    

                    // J3 - R Siege: force ROCKET, boost armor/fire rate, reduce movement speed.
                    if (skillName === 'vampirism') {
                        const dur = (config && config.duration) ? config.duration : 6000;
                        if (!this.buffs.siege) this.buffs.siege = { active: false, endTime: 0, speedMult: 0.3, fireMult: 0.5, sizeMult: 1.35, armorBase: 0.35, armorMult: 3 };
                        this.buffs.siege.active = true;
                        this.buffs.siege.endTime = now + dur;

                        Game.ui.removeBuff('Ph\u00e1o \u0110\u00e0i');
                        Game.ui.addBuff('Ph\u00e1o \u0110\u00e0i', (config && config.color) ? config.color : '#FFEB3B');
                        createDamageText(this.x, this.y - 40, 'PH\u00c1O \u0110\u00c0I!', (config && config.color) ? config.color : '#FFEB3B');
                        Game.shake = Math.max(Game.shake, 8);
                        return;
                    }
                    createDamageText(this.x, this.y - 40, config.castText || 'COMING SOON', config.color || '#FFD700');
                    return;
                }

                
                if (this.systemId === 'mage') {
                    const cfg = getSystemSkillDef('mage', skillName) || {};

                    if (skillName === 'clone') {
                        const cur = this.inventory[this.currentWeaponIndex] || { id: 'NORMAL', level: 1 };
                        const lv = (cur && cur.level) ? cur.level : 1;

                        const fireballCfg = {
                            speed: (cfg.fireballSpeed != null) ? cfg.fireballSpeed : 4,
                            damage: (((cfg.fireballBase || 60) + lv) * (cfg.fireballDmgMult || 3.2)),
                            radius: (cfg.fireballRadius != null) ? cfg.fireballRadius : 36,
                            color: cfg.color || '#FF5722',
                            special: 'EXPLODE',
                            explosionRadius: (cfg.explosionRadius != null) ? cfg.explosionRadius : 320,
                            splashFactor: (cfg.splashFactor != null) ? cfg.splashFactor : 1.0,
                            noTrail: true,
                            noDirectHit: true,
                            shockwave: true,
                            shockColor: '#FF6D00'
                        };

                        const tipX = this.x + Math.cos(this.angle) * (this.radius + 14);
                        const tipY = this.y + Math.sin(this.angle) * (this.radius + 14);
                        const __fb = new Bullet(tipX, tipY, this.angle, 'FIREBALL', fireballCfg, 'PLAYER');
                        __fb.ownerPid = this.pid || 1;
                        Game.projectiles.push(__fb);
                        createMuzzleFlash(tipX, tipY, this.angle, fireballCfg.color);
                        Game.shake = Math.max(Game.shake, 2);

                        createDamageText(this.x, this.y - 40, cfg.castText || 'Q: HỎA CẦU', cfg.color || '#FF5722');
                        this.skills[skillName].lastUsed = now;
                        return;
                    }

                    if (skillName === 'stealth') {
                        const __m = (Input && Input.getMode) ? Input.getMode() : (Game.startMode || {difficulty:'hard', players:1});
                        const __mouseMode = !!(__m && __m.players === 1 && __m.difficulty === 'hard');
                        let __tx, __ty;

                        if (__mouseMode) {
                            __tx = Input.mouse.x + Camera.x;
                            __ty = Input.mouse.y + Camera.y;
                        } else {
                            // Easy/2P: blink in current movement direction.
                            let __dx = 0, __dy = 0;
                            const __pid = this.pid || 1;

                            if (Input && Input.keys) {
                                if (__pid === 2) {
                                    if (Input.keys['arrowup']) __dy -= 1;
                                    if (Input.keys['arrowdown']) __dy += 1;
                                    if (Input.keys['arrowleft']) __dx -= 1;
                                    if (Input.keys['arrowright']) __dx += 1;
                                } else {
                                    if (Input.keys['w']) __dy -= 1;
                                    if (Input.keys['s']) __dy += 1;
                                    if (Input.keys['a']) __dx -= 1;
                                    if (Input.keys['d']) __dx += 1;
                                }
                            }

                            const __len = Math.hypot(__dx, __dy);
                            if (__len > 0.001) { __dx /= __len; __dy /= __len; }
                            else {
                                const __ang = (typeof this.angle === 'number') ? this.angle : 0;
                                __dx = Math.cos(__ang); __dy = Math.sin(__ang);
                            }

                            const __dist = 300;
                            __tx = this.x + __dx * __dist;
                            __ty = this.y + __dy * __dist;
                        }

createComplexExplosion(this.x, this.y, cfg.color || '#E040FB', 14);

                        this.x = __tx;
                        this.y = __ty;

                        this.x = Math.max(this.radius, Math.min(WORLD_WIDTH - this.radius, this.x));
                        this.y = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.y));

                        if (Game.obstacles && Game.obstacles.length) {
                            for (let t = 0; t < 10; t++) {
                                let stuck = false;
                                for (let obs of Game.obstacles) {
                                    if (checkCircleRect({ x: this.x, y: this.y, radius: this.radius }, obs)) {
                                        const obsCX = obs.x + obs.width / 2;
                                        const obsCY = obs.y + obs.height / 2;
                                        const ang = Math.atan2(this.y - obsCY, this.x - obsCX);
                                        this.x += Math.cos(ang) * 8;
                                        this.y += Math.sin(ang) * 8;
                                        stuck = true;
                                    }
                                }
                                if (!stuck) break;
                            }
                        }

                        createComplexExplosion(this.x, this.y, cfg.color || '#E040FB', 14);
                        createDamageText(this.x, this.y - 40, cfg.castText || 'E: DỊCH CHUYỂN', cfg.color || '#E040FB');

                        this.skills[skillName].lastUsed = now;
                        return;
                    }

                    if (skillName === 'vampirism') {
                        if (!this.mage) this.mage = { blizzard: { active: false, x: 0, y: 0, endTime: 0, nextTick: 0, locked: false } };
                        const bz = this.mage.blizzard;

                        bz.active = true;
                        bz.x = this.x;
                        bz.y = this.y;
                        bz.locked = false;
                        bz.endTime = now + (cfg.duration || 5500);
                        bz.nextTick = now;

                        Game.ui.removeBuff('Bão Tuyết');
                        Game.ui.addBuff('Bão Tuyết', cfg.color || '#00E5FF');
                        createDamageText(this.x, this.y - 40, cfg.castText || 'R: BÃO TUYẾT', cfg.color || '#00E5FF');

                        this.skills[skillName].lastUsed = now;
                        return;
                    }
                }

                // Assassin system: timeline-based Q/E/R execution.
                if (this.systemId === 'assassin') {
                    const obsList = (Game.obstacles && Game.obstacles.length) ? Game.obstacles : [];
                    const isUntargetablePvp = (t) => !!(Game.mode === 'PVP_DUEL_AIM' && t && t.isStealth);
                    const findNearest = (arr, range, losCheck) => {
                        let best = null; let bestD2 = Infinity;
                        const r2 = range * range;
                        for (let i = 0; i < arr.length; i++) {
                            const t = arr[i];
                            if (!t || (typeof t.hp === 'number' && t.hp <= 0)) continue;
                            if (isUntargetablePvp(t)) continue;
                            const dx = t.x - this.x; const dy = t.y - this.y; const d2 = dx * dx + dy * dy;
                            if (d2 > r2) continue;
                            if (losCheck && typeof isLineBlocked === 'function') { if (isLineBlocked(this.x, this.y, t.x, t.y, obsList)) continue; }
                            if (d2 < bestD2) { bestD2 = d2; best = t; }
                        }
                        return best;
                    };
                    const collectTargets = (range) => {
                        const r2 = range * range;
                        const outList = [];
                        if (Game.mode === 'PVP_DUEL_AIM') {
                            const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                            for (let i = 0; i < __plist.length; i++) {
                                const p = __plist[i];
                                if (!p || typeof p.hp !== 'number' || p.hp <= 0) continue;
                                if (isUntargetablePvp(p)) continue;
                                if ((this.pid != null) && p.pid === this.pid) continue;
                                const dx = p.x - this.x; const dy = p.y - this.y; const d2 = dx * dx + dy * dy;
                                if (d2 <= r2) outList.push({ t: p, d2: d2 });
                            }
                            if (Game.clones && Game.clones.length) {
                                for (let i = 0; i < Game.clones.length; i++) {
                                    const c = Game.clones[i];
                                    if (!c || c.markedForDeletion) continue;
                                    if (this.pid != null && c.ownerPid === this.pid) continue;
                                    const dx = c.x - this.x; const dy = c.y - this.y; const d2 = dx * dx + dy * dy;
                                    if (d2 <= r2) outList.push({ t: c, d2: d2 });
                                }
                            }
                        } else {
                            if (Game.enemies && Game.enemies.length) {
                                for (let i = 0; i < Game.enemies.length; i++) {
                                    const e = Game.enemies[i];
                                    if (!e || e.hp <= 0) continue;
                                    const dx = e.x - this.x; const dy = e.y - this.y; const d2 = dx * dx + dy * dy;
                                    if (d2 <= r2) outList.push({ t: e, d2: d2 });
                                }
                            }
                        }
                        outList.sort((a, b) => a.d2 - b.d2);
                        return outList.map(o => o.t);
                    };
                    if (skillName === 'clone') {
                        const range = ASSASSIN_SKILL_RANGE_Q;
                        let target = null;
                        if (Game.mode === 'PVP_DUEL_AIM') {
                            const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                            target = findNearest(__plist.filter(p => p && (!this.pid || p.pid !== this.pid) && !p.isStealth), range, true);
                        } else {
                            target = findNearest((Game.enemies || []), range, true);
                        }
                        if (!target) return;
                        const ox = this.x; const oy = this.y;
                        this.assassinTeleportTo(target.x, target.y, obsList);
                        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
                        this._assState = { active: true, type: 'Q', originX: ox, originY: oy, target: target, hitsLeft: 3, nextHit: now, hitInterval: 120, returnUntil: now, endTime: now + 900, mitigation: 0.1 };
                        this._assMitigation = { mult: 0.1, endTime: now + 900 };
                        if (!this._assFx) this._assFx = { after: [], slashes: [], flashes: [] };
                        this._assFx.flashes.push({ x: this.x, y: this.y, t: now, life: 240, size: 52, color: 'rgba(255,80,130,0.9)', ring: true });
                        this.skills[skillName].lastUsed = now;
                        return;
                    }
                    if (skillName === 'stealth') {
                        const targets = collectTargets(ASSASSIN_SKILL_RANGE_E).slice(0, 3);
                        if (!targets.length) return;
                        const ox = this.x; const oy = this.y;
                        this._assState = { active: true, type: 'E', originX: ox, originY: oy, targets: targets, targetIdx: 0, hitsLeft: 2, nextHit: now, hitInterval: 120, endTime: now + 2000, mitigation: 0.15 };
                        this._assMitigation = { mult: 0.15, endTime: this._assState.endTime };
                        if (!this._assFx) this._assFx = { after: [], slashes: [], flashes: [] };
                        this._assFx.flashes.push({ x: this.x, y: this.y, t: now, life: 260, size: 56, color: 'rgba(120,200,255,0.9)', ring: true });
                        this.skills[skillName].lastUsed = now;
                        return;
                    }
                    if (skillName === 'vampirism') {
                        const rTargets = collectTargets(ASSASSIN_SKILL_RANGE_R);
                        if (!rTargets.length) return;
                        const ox = this.x; const oy = this.y;
                        this._assState = { active: true, type: 'R', originX: ox, originY: oy, step: 0, maxSteps: 10, nextHit: now, hitInterval: 90, endTime: now + 900, mitigation: 0.15, hitCounts: new Map() };
                        this._assMitigation = { mult: 0.15, endTime: this._assState.endTime };
                        if (!this._assFx) this._assFx = { after: [], slashes: [], flashes: [] };
                        this._assFx.flashes.push({ x: this.x, y: this.y, t: now, life: 280, size: 64, color: 'rgba(255,170,80,0.95)', ring: true });
                        this.skills[skillName].lastUsed = now;
                        return;
                    }
                }
                // Fallback for non-default systems.
                if (this.systemId !== 'default') {
                    skillState.lastUsed = now;
                    createDamageText(this.x, this.y - 40, config.castText || 'COMING SOON', config.color || '#FFD700');
                    return;
                }


                // Default system: keep existing skill behavior.
                skillState.lastUsed = now;
                if (skillName === 'clone') {
                    if (Game.clones.length > 0) {
                        Game.clones.forEach(c => { c.markedForDeletion = true; createComplexExplosion(c.x, c.y, COLORS.clone); });
                        Game.clones = [];
                        createDamageText(this.x, this.y - 60, 'THAY THẾ!', '#ccc');
                    }
                    createDamageText(this.x, this.y - 40, 'PHÂN THÂN CHIẾN ĐẤU!', COLORS.clone);
                    Game.clones.push(new CloneTank(this.x + 50, this.y, this.pid || 1));
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
            addBuff(type, duration) { const now = Date.now(); if (type === 'shield') { this.buffs.shield.active = true; this.buffs.shield.endTime = now + duration; if (Game.ui && Game.ui.setShieldOverlay) Game.ui.setShieldOverlay(true); else { try{document.getElementById('shieldOverlay').style.display='block';}catch(e){} } Game.ui.addBuff('Shield', '#2196F3'); } else if (type === 'rapid') { this.buffs.rapid.active = true; this.buffs.rapid.endTime = now + duration; Game.ui.addBuff('Rapid', '#FF9800'); } }
            applyEffect(effectConfig) {
                try {
                    if (!effectConfig || !effectConfig.type) return;
                    const now = Date.now();
                    if (this._assMitigation && now <= this._assMitigation.endTime && effectConfig.type === 'STUN') { return; }
                    if (effectConfig.type === 'STUN') {
                        let dur = (typeof effectConfig.duration === 'number') ? effectConfig.duration : 800;
                        if (Game.mode === 'PVP_DUEL_AIM') {
                            dur = Math.min(dur, PVP_HARD_CC_CAP_MS);
                            if (!this._pvpHardCc) this._pvpHardCc = { lastAt: 0 };
                            if ((now - (this._pvpHardCc.lastAt || 0)) <= PVP_HARD_CC_DR_WINDOW_MS) {
                                dur = Math.max(1, Math.round(dur * PVP_HARD_CC_DR_MULT));
                            }
                            this._pvpHardCc.lastAt = now;
                        }
                        this.effects.stun.active = true;
                        this.effects.stun.endTime = now + dur;
                    } else if (effectConfig.type === 'SLOW') {
                        const dur = (typeof effectConfig.duration === 'number') ? effectConfig.duration : 700;
                        const factor = (typeof effectConfig.factor === 'number') ? effectConfig.factor : 0.5;
                        this.effects.slow.active = true;
                        this.effects.slow.endTime = Math.max(this.effects.slow.endTime || 0, now + dur);
                        this.effects.slow.factor = Math.min(this.effects.slow.factor || 1, Math.max(0.15, Math.min(1, factor)));
                    }
                } catch(e){}
            }
            useUltimate() {
                if (this.ultiCharge < 100) return;
                this.ultiCharge = 0;
                Game.ui.updateUltiBar(0);
                createDamageText(this.x, this.y - 80, "FIRESTORM!!!", "#FFD700");
                Game.shake = 30;
                const dmgMultSkill = (1 + 0.1 * ((Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0));
                if (typeof MAX !== 'undefined') MAX.Audio.ulti();
                createComplexExplosion(this.x, this.y, '#FF5722', 50);
                Game.enemies.forEach(e => {
                    if (!e || e.markedForDeletion || e.hp <= 0) return;
                    if (e.typeKey === 'BOSS') {
                        const bossDmg = Math.max(1, Math.round(250 * dmgMultSkill));
                        e.hp -= bossDmg;
                        createDamageText(e.x, e.y, `-${bossDmg}`, "#FFD700");
                        createComplexExplosion(e.x, e.y, '#FF5722', 20);
                    } else {
                        const dmg = Math.max(1, Math.round(150 * dmgMultSkill));
                        e.hp -= dmg;
                        createDamageText(e.x, e.y, `-${dmg}`, "#FF5722");
                        createComplexExplosion(e.x, e.y, '#FF5722', 10);
                    }
                });
            }
            gainUltiCharge(amount) { this.ultiCharge = Math.min(100, this.ultiCharge + amount); Game.ui.updateUltiBar(this.ultiCharge); }
            update(obstacles) {
                // Read current mode and map inputs per mode.
                const __m = (Input && Input.getMode) ? Input.getMode() : (Game.startMode || {difficulty:'hard', players:1});
                const __is2p = !!(__m && __m.players === 2);
                const __isEasy = !!(__m && __m.difficulty === 'easy');

                // Downed state (hp<=0): disable movement/shoot/skills and collisions.
                const __dead = (this.hp <= 0);
                if (__dead) { this.hp = 0; if (this.dash) this.dash.active = false; if (this.ram) this.ram.active = false; this.isStealth = false; }
                this.__noCollide = __dead;

                // 1P uses number keys for weapon select; 2P reserves numbers for P2 skills.
                if (!__is2p) {
                    if (Input.keys['1']) this.selectWeapon(0); if (Input.keys['2']) this.selectWeapon(1); if (Input.keys['3']) this.selectWeapon(2);
                    if (Input.keys['4']) this.selectWeapon(3); if (Input.keys['5']) this.selectWeapon(4); if (Input.keys['6']) this.selectWeapon(5);
                }

                // Easy/2P: support edge-trigger weapon/target cycling.
                if ((__isEasy || __is2p) && Input.consumeAction) {
                    if (Input.consumeAction('p1_weapon_cycle')) {
                        const n = (this.inventory && this.inventory.length) ? this.inventory.length : 0;
                        if (n > 0) this.selectWeapon((this.currentWeaponIndex + 1) % n);
                    }
                    if (Input.consumeAction('p1_target_cycle')) {
                        // Queue target-cycle request for the auto-aim update pass.
                        this.__targetCycleReq = (this.__targetCycleReq || 0) + 1;
                    }
                }

                const now = Date.now();
                // Track previous-frame velocity for predictive PvP auto-aim.
                const __motionDtMs = Math.max(1, now - (this.__motionTick || (now - 16)));
                const __motionPrevX = (typeof this.__motionX === 'number') ? this.__motionX : this.x;
                const __motionPrevY = (typeof this.__motionY === 'number') ? this.__motionY : this.y;
                this._motionVx = (this.x - __motionPrevX) / (__motionDtMs / 1000);
                this._motionVy = (this.y - __motionPrevY) / (__motionDtMs / 1000);
                this.__motionX = this.x;
                this.__motionY = this.y;
                this.__motionTick = now;
                let __assCasting = false;
                if (this.systemId === 'assassin' && this._assState && this._assState.active) {
                    const st = this._assState;
                    if (__dead) { st.active = false; this._assMitigation = null; }
                    else {
                        __assCasting = true;
                        const obsList = (Game.obstacles && Game.obstacles.length) ? Game.obstacles : [];
                        if (now > st.endTime) {
                            this.assassinTeleportTo(st.originX, st.originY, obsList);
                            st.active = false;
                            this._assMitigation = null;
                        } else if (st.type === 'Q') {
                            if (st.hitsLeft > 0 && now >= st.nextHit) {
                                const tgt = st.target;
                                const hidden = !!(Game.mode === 'PVP_DUEL_AIM' && tgt && tgt.isStealth);
                                if (!tgt || (typeof tgt.hp === 'number' && tgt.hp <= 0) || hidden) {
                                    st.hitsLeft = 0;
                                } else {
                                    if (typeof tgt.x === 'number' && typeof tgt.y === 'number') {
                                        this.angle = Math.atan2(tgt.y - this.y, tgt.x - this.x);
                                    }
                                    this.assassinSlash({ range: ASSASSIN_SLASH_RANGE, arc: (110 * Math.PI) / 180, fx: 'q', shake: 3, sparkCount: 10 });
                                    st.hitsLeft--;
                                    st.nextHit = now + st.hitInterval;
                                }
                            }
                            if (st.hitsLeft <= 0) {
                                this.assassinTeleportTo(st.originX, st.originY, obsList);
                                st.active = false;
                                this._assMitigation = null;
                            }
                        } else if (st.type === 'E') {
                            if (!st.targets || st.targetIdx >= st.targets.length) {
                                this.assassinTeleportTo(st.originX, st.originY, obsList);
                                st.active = false;
                                this._assMitigation = null;
                            } else {
                                let tgt = st.targets[st.targetIdx];
                                const hidden = !!(Game.mode === 'PVP_DUEL_AIM' && tgt && tgt.isStealth);
                                if (!tgt || (typeof tgt.hp === 'number' && tgt.hp <= 0) || hidden) {
                                    st.targetIdx++; st.hitsLeft = 2; st._teleported = false;
                                } else {
                                    if (!st._teleported) {
                                        this.assassinTeleportTo(tgt.x, tgt.y, obsList);
                                        st._teleported = true;
                                    }
                                    if (now >= st.nextHit) {
                                        this.angle = Math.atan2(tgt.y - this.y, tgt.x - this.x);
                                        this.assassinSlash({ range: ASSASSIN_SLASH_RANGE, arc: (110 * Math.PI) / 180, fx: 'e', shake: 3, sparkCount: 10 });
                                        st.hitsLeft--;
                                        st.nextHit = now + st.hitInterval;
                                    }
                                    if (st.hitsLeft <= 0) {
                                        st.targetIdx++;
                                        st.hitsLeft = 2;
                                        st._teleported = false;
                                        st.nextHit = now + 60;
                                    }
                                }
                            }
                        } else if (st.type === 'R') {
                            if (st.step >= st.maxSteps) {
                                this.assassinTeleportTo(st.originX, st.originY, obsList);
                                st.active = false;
                                this._assMitigation = null;
                            } else if (now >= st.nextHit) {
                                const range = ASSASSIN_SKILL_RANGE_R;
                                let cand = null; let bestD2 = Infinity;
                                const r2 = range * range;
                                if (Game.mode === 'PVP_DUEL_AIM') {
                                    const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                                    for (let i = 0; i < __plist.length; i++) {
                                        const p = __plist[i];
                                        if (!p || typeof p.hp !== 'number' || p.hp <= 0) continue;
                                        if (p.isStealth) continue;
                                        if ((this.pid != null) && p.pid === this.pid) continue;
                                        const count = st.hitCounts && st.hitCounts.get ? (st.hitCounts.get(p) || 0) : 0;
                                        if (count >= 3) continue;
                                        const dx = p.x - this.x; const dy = p.y - this.y; const d2 = dx * dx + dy * dy;
                                        if (d2 > r2) continue;
                                        if (d2 < bestD2) { bestD2 = d2; cand = p; }
                                    }
                                    if (!cand && Game.clones && Game.clones.length) {
                                        for (let i = 0; i < Game.clones.length; i++) {
                                            const c = Game.clones[i];
                                            if (!c || c.markedForDeletion) continue;
                                            if (this.pid != null && c.ownerPid === this.pid) continue;
                                            const count = st.hitCounts && st.hitCounts.get ? (st.hitCounts.get(c) || 0) : 0;
                                            if (count >= 3) continue;
                                            const dx = c.x - this.x; const dy = c.y - this.y; const d2 = dx * dx + dy * dy;
                                            if (d2 > r2) continue;
                                            if (d2 < bestD2) { bestD2 = d2; cand = c; }
                                        }
                                    }
                                } else {
                                    if (Game.enemies && Game.enemies.length) {
                                        for (let i = 0; i < Game.enemies.length; i++) {
                                            const e = Game.enemies[i];
                                            if (!e || e.hp <= 0) continue;
                                            const count = st.hitCounts && st.hitCounts.get ? (st.hitCounts.get(e) || 0) : 0;
                                            if (count >= 3) continue;
                                            const dx = e.x - this.x; const dy = e.y - this.y; const d2 = dx * dx + dy * dy;
                                            if (d2 > r2) continue;
                                            if (d2 < bestD2) { bestD2 = d2; cand = e; }
                                        }
                                    }
                                }
                                if (cand) {
                                    this.assassinTeleportTo(cand.x, cand.y, obsList);
                                    this.angle = Math.atan2(cand.y - this.y, cand.x - this.x);
                                    this.assassinSlash({ range: ASSASSIN_SLASH_RANGE, arc: (120 * Math.PI) / 180, fx: 'r', shake: 4, sparkCount: 12, width: 7 });
                                    if (this._assFx) {
                                        const f = this._assFx.flashes;
                                        f.push({ x: cand.x, y: cand.y, t: Date.now(), life: 220, size: 54, color: 'rgba(255,170,80,0.9)', ring: true });
                                        if (f.length > 12) f.shift();
                                    }
                                    if (st.hitCounts && st.hitCounts.set) {
                                        st.hitCounts.set(cand, (st.hitCounts.get(cand) || 0) + 1);
                                    }
                                }
                                st.step++;
                                st.nextHit = now + st.hitInterval;
                            }
                        }
                    }
                }

                // Negative status handling: stun/slow.
                let __stunned = false;
                if (this.effects && this.effects.stun && this.effects.stun.active) {
                    if (now <= this.effects.stun.endTime) __stunned = true;
                    else this.effects.stun.active = false;
                }

                if (!__dead && !__stunned) { if (Input.keys['q']) this.useSkill('clone'); if (Input.keys['e']) this.useSkill('stealth'); if (Input.keys['r']) this.useSkill('vampirism'); if (Input.keys[' ']) this.useUltimate(); }

                // Expire default-system skill states.
                if (this.systemId === 'default') {
                    if (this.isStealth && now > this.skills.stealth.endTime) {
                        this.isStealth = false;
                        this.skills.stealth.active = false;
                        createDamageText(this.x, this.y - 40, "HẾT TÀNG HÌNH", "#fff");
                    }
                    if (this.skills.vampirism.active && now > this.skills.vampirism.endTime) {
                        this.skills.vampirism.active = false;
                        createDamageText(this.x, this.y - 40, "HẾT HÚT MÁU", "#fff");
                    }
                }

                // Expire Speed-system buffs.
                if (this.systemId === 'speed') {
                    if (this.dash && this.dash.active && now > this.dash.endTime) {
                        this.dash.active = false;
                    }
                    if (this.buffs.phase && this.buffs.phase.active && now > this.buffs.phase.endTime) {
                        this.buffs.phase.active = false;
                        Game.ui.removeBuff('Phase');
                        createDamageText(this.x, this.y - 40, "HẾT PHASE", "#fff");
                    }
                    if (this.buffs.adrenaline && this.buffs.adrenaline.active && now > this.buffs.adrenaline.endTime) {
                        this.buffs.adrenaline.active = false;
                        Game.ui.removeBuff('Adren');
                        createDamageText(this.x, this.y - 40, "H?T ADREN", "#fff");
                    }
                }


                // Expire Juggernaut buffs.
                if (this.systemId === 'juggernaut') {
                    if (this.ram && this.ram.active && now > this.ram.endTime) {
                        this.ram.active = false;
                    }
                    if (this.buffs.juggerShield && this.buffs.juggerShield.active && now > this.buffs.juggerShield.endTime) {
                        this.buffs.juggerShield.active = false;
                        Game.ui.removeBuff('Gi\u00e1p Ph\u1ea3n');
                        createDamageText(this.x, this.y - 40, 'H\u1ebeT GI\u00c1P PH\u1ea2N', '#fff');
                    }
                
                    if (this.buffs.siege && this.buffs.siege.active && now > this.buffs.siege.endTime) {
                        this.buffs.siege.active = false;
                        Game.ui.removeBuff('Ph\u00e1o \u0110\u00e0i');
                        createDamageText(this.x, this.y - 40, 'H\u1ebeT PH\u00c1O \u0110\u00c0I', '#fff');
                    }
}

                // Compute effective speed after buffs/debuffs.
                let effSpeed = (this.baseSpeed || this.speed || 6.5);
                const spdLv = (Game.upgrades && typeof Game.upgrades.speedLv === 'number') ? (Game.upgrades.speedLv|0) : 0;
                if (spdLv > 0) {
                    effSpeed *= (1 + spdLv * 0.05);
                }

                if (this.systemId === 'speed' && this.buffs.adrenaline && this.buffs.adrenaline.active) {
                    effSpeed *= (this.buffs.adrenaline.speedMult || 1.25);
                }
                if (Game.mode === 'PVP_DUEL_AIM' && pvpHasItem(this, 'composite_armor')) {
                    effSpeed *= (PVP_ITEM_TYPES.composite_armor.speedMult || 1);
                }
                if (this.systemId === 'juggernaut' && this.buffs.siege && this.buffs.siege.active) {
                    effSpeed *= (this.buffs.siege.speedMult || 0.3);
                }
                if (this.effects && this.effects.slow && this.effects.slow.active) {
                    if (now <= this.effects.slow.endTime) effSpeed *= (this.effects.slow.factor || 0.5);
                    else this.effects.slow.active = false;
                }
                this.speed = effSpeed;

                // Scale size by current state (e.g., Siege Mode).
                if (this.baseRadius) {
                    const sm = (this.systemId === 'juggernaut' && this.buffs.siege && this.buffs.siege.active) ? (this.buffs.siege.sizeMult || 1.35) : 1;
                    this.radius = this.baseRadius * sm;
                }

                // Movement resolution: dash has priority.
                let dx = 0, dy = 0;
                if (__dead || __stunned) { dx = 0; dy = 0; if (this.dash) this.dash.active = false; if (this.ram) this.ram.active = false; }
                else if (__assCasting) { dx = 0; dy = 0; }
                else if (this.dash && this.dash.active && now <= this.dash.endTime) {
                    dx = this.dash.vx;
                    dy = this.dash.vy;
                } else if (this.ram && this.ram.active && now <= this.ram.endTime) {
                    dx = this.ram.vx;
                    dy = this.ram.vy;
                } else {
                    if (this.dash) this.dash.active = false;
                    if (this.ram) this.ram.active = false;
                    if (Input.keys.w) dy -= 1; if (Input.keys.s) dy += 1; if (Input.keys.a) dx -= 1; if (Input.keys.d) dx += 1;
                    if (dx !== 0 || dy !== 0) {
                        const length = Math.hypot(dx, dy) || 1;
                        dx = (dx / length) * effSpeed;
                        dy = (dy / length) * effSpeed;
                    }
                }

                if(isNaN(dx)) dx = 0; if(isNaN(dy)) dy = 0;
                let nextX = this.x + dx; let nextY = this.y + dy;

                let collided = false;
                for (let obs of obstacles) {
                    if (checkCircleRect({x: nextX, y: nextY, radius: this.radius}, obs)) {
                        collided = true;
                        if (!checkCircleRect({x: nextX, y: this.y, radius: this.radius}, obs)) this.x = nextX;
                        else if (!checkCircleRect({x: this.x, y: nextY, radius: this.radius}, obs)) this.y = nextY;
                        break;
                    }
                }
                if (!collided) { this.x = nextX; this.y = nextY; }

                for (let obs of obstacles) {
                    if (checkCircleRect({x: this.x, y: this.y, radius: this.radius}, obs)) {
                        const obsCX = obs.x + obs.width/2;
                        const obsCY = obs.y + obs.height/2;
                        const anglePush = Math.atan2(this.y - obsCY, this.x - obsCX);
                        this.x += Math.cos(anglePush) * 4;
                        this.y += Math.sin(anglePush) * 4;
                    }
                }

                this.x = Math.max(this.radius, Math.min(WORLD_WIDTH - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.y));

                if (this.systemId === 'juggernaut' && this.ram && this.ram.active && now <= this.ram.endTime) {
                    const ramCfg = getSystemSkillDef(this.systemId, 'stealth') || {};
                    const waveNow = (typeof WaveManager !== 'undefined' && WaveManager.wave) ? (WaveManager.wave | 0) : 1;
                    const impactBase = (typeof ramCfg.impactBase === 'number') ? ramCfg.impactBase : 60;
                    const impactPerWave = (typeof ramCfg.impactPerWave === 'number') ? ramCfg.impactPerWave : 3;
                    const knock = (typeof ramCfg.knockback === 'number') ? ramCfg.knockback : 95;
                    const dmgBase = Math.round(impactBase + impactPerWave * Math.max(0, waveNow - 1));
                    const dmgMultSkill = (1 + 0.1 * ((Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0));
                    const dmg = Math.max(1, Math.round(dmgBase * dmgMultSkill));

                    if (Game.mode === 'PVP_DUEL_AIM') {
                        const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                        for (const __pl of __plist) {
                            if (!__pl || __pl === this || typeof __pl.hp !== 'number' || __pl.hp <= 0) continue;
                            const pr = (__pl.radius || 22);
                            const d = Math.hypot(__pl.x - this.x, __pl.y - this.y);
                            if (d > this.radius + pr + 2) continue;

                            if (this.ram.hitSet && this.ram.hitSet.has(__pl)) continue;
                            if (this.ram.hitSet) this.ram.hitSet.add(__pl);

                            if (typeof __pl.takeDamage === 'function') __pl.takeDamage(dmg, { attacker: this, type: 'PVP_RAM' });
                            else { __pl.hp -= dmg; if (__pl.hp < 0) __pl.hp = 0; }
                            createDamageText(__pl.x, __pl.y - 10, '-' + dmg, '#FFCA28');

                            // Apply knockback to player.
                            const __noKnock = (__pl._assMitigation && now <= __pl._assMitigation.endTime);
                            if (!__noKnock) {
                                let nx = (__pl.x - this.x);
                                let ny = (__pl.y - this.y);
                                const l = Math.hypot(nx, ny) || 1;
                                nx /= l; ny /= l;
                                __pl.x += nx * knock;
                                __pl.y += ny * knock;
                                __pl.x = Math.max(pr, Math.min(WORLD_WIDTH - pr, __pl.x));
                                __pl.y = Math.max(pr, Math.min(WORLD_HEIGHT - pr, __pl.y));
                            }
                        }
                    } else {
                        for (const e of Game.enemies) {
                            if (!e || e.markedForDeletion || e.hp <= 0) continue;
                            if (e.typeKey === 'BOSS') continue;
                            const er = (e.radius || (e.config && e.config.radius) || 18);
                            const d = Math.hypot(e.x - this.x, e.y - this.y);
                            if (d > this.radius + er + 2) continue;

                            if (this.ram.hitSet && this.ram.hitSet.has(e)) continue;
                            if (this.ram.hitSet) this.ram.hitSet.add(e);

                            e.hp -= dmg;
                            createDamageText(e.x, e.y - 10, '-' + dmg, '#FFCA28');

                            // Apply knockback to target.
                            let nx = (e.x - this.x);
                            let ny = (e.y - this.y);
                            const l = Math.hypot(nx, ny) || 1;
                            nx /= l; ny /= l;
                            e.x += nx * knock;
                            e.y += ny * knock;
                            e.x = Math.max(er, Math.min(WORLD_WIDTH - er, e.x));
                            e.y = Math.max(er, Math.min(WORLD_HEIGHT - er, e.y));
                        }
                    }
                }

// Auto-aim is enabled for Easy/2P; Hard 1P keeps mouse aim. // Auto-aim cho Easy/2P; Hard 1P ngắm chuột
const __isPvp = (Game.mode === 'PVP_DUEL_AIM');
const __aimAssistOn = !(
    typeof MAX !== 'undefined' &&
    MAX &&
    MAX.State &&
    MAX.State.save &&
    MAX.State.save.settings &&
    MAX.State.save.settings.aimAssist === false
);
                try {
                    if (Game.ui && Game.ui.updateSkillSlots && Game.player) {
                        if (Game._hudSys1 !== Game.player.systemId) {
                            Game._hudSys1 = Game.player.systemId;
                            Game.ui.updateSkillSlots(Game._hudSys1, 1);
                        }
                        if (Game.player2) {
                            if (Game._hudSys2 !== Game.player2.systemId) {
                                Game._hudSys2 = Game.player2.systemId;
                                Game.ui.updateSkillSlots(Game._hudSys2, 2);
                            }
                        }
                    }
                } catch(e) {}
const __noMouseAim = (__is2p || __isEasy);

if (__isPvp) {
    // PvP: lock only LOS-valid targets and cap turret turn rate.
    let opp = null;
    const __plist = (Game.players && Game.players.length) ? Game.players : [];
    for (let __i = 0; __i < __plist.length; __i++) {
        const __p = __plist[__i];
        if (!__p || __p === this) continue;
        if (typeof __p.hp === 'number' && __p.hp <= 0) continue;
        opp = __p; break;
    }

    let target = null;
    if (opp && !opp.isStealth) {
        const obsList = (Game.obstacles && Game.obstacles.length) ? Game.obstacles : [];
        const blocked = (typeof isLineBlocked === 'function') ? isLineBlocked(this.x, this.y, opp.x, opp.y, obsList) : false;
        if (!blocked) target = opp;
    }

    const had = !!this.__pvpHadLos;
    const has = !!target;
    if (has && (!had || this.__pvpTarget !== target)) {
        this._pvpLockUntil = now + 200;
    }
    this.__pvpHadLos = has;
    this.__pvpTarget = target || null;
    this.__easyTarget = null; // Prevent PvE auto-shoot path while in PvP mode.

    if (target) {
        let aimX = target.x;
        let aimY = target.y;
        const __aimWeapon = (this.getCurrentWeaponObj && this.getCurrentWeaponObj()) ? this.getCurrentWeaponObj() : { id: 'NORMAL', level: 1 };
        const __aimId = (this.systemId === 'juggernaut' && this.buffs.siege && this.buffs.siege.active) ? 'ROCKET' : (__aimWeapon.id || 'NORMAL');
        const __aimCfg = (BULLET_TYPES && BULLET_TYPES[__aimId]) ? BULLET_TYPES[__aimId] : (BULLET_TYPES.NORMAL || { speed: 12 });
        const __bulletSpeed = Math.max(1, Number(__aimCfg.speed) || 12); // px/frame
        const __dist = Math.hypot(target.x - this.x, target.y - this.y);
        const __travelMs = (__dist / (__bulletSpeed * 60)) * 1000;
        const __leadFactor = __aimAssistOn ? PVP_AIM_LEAD_FACTOR : 0;
        const __leadMs = Math.max(0, Math.min(PVP_AIM_LEAD_MAX_MS, __travelMs * __leadFactor));
        const __vx = Number(target._motionVx || 0);
        const __vy = Number(target._motionVy || 0);
        aimX += (__vx * __leadMs / 1000);
        aimY += (__vy * __leadMs / 1000);

        const desired = Math.atan2(aimY - this.y, aimX - this.x);
        let diff = desired - this.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // Normalize angle delta to [-pi, pi].
        const maxTurn = PVP_AIM_MAX_TURN;
        if (diff > maxTurn) diff = maxTurn;
        if (diff < -maxTurn) diff = -maxTurn;
        this.angle += diff;
    }
} else if (__noMouseAim) {
    const AA = this.__autoAim || (this.__autoAim = { nextScan: 0, candidates: [], idx: 0, target: null });
    const nowMs = now;

    // Rescan candidate targets periodically or when current target is invalid.
    const needRescan = (nowMs >= AA.nextScan) || !AA.candidates || AA.candidates.length === 0 || !AA.target || (AA.target.hp <= 0);
    if (needRescan) {
        const ex = this.x, ey = this.y;
        const cand = [];
        const arr = Game.enemies || [];

        // 1) Collect alive targets with squared distance.
        for (let i = 0; i < arr.length; i++) {
            const e = arr[i];
            if (!e || e.hp <= 0) continue;
            const dx = e.x - ex, dy = e.y - ey;
            cand.push({ e, d2: dx * dx + dy * dy });
        }

        // 2) Sort candidates from nearest to farthest.
        cand.sort((a, b) => a.d2 - b.d2);

        // 3) Pick nearest target with clear line-of-sight.
        const obsList = (Game.obstacles && Game.obstacles.length) ? Game.obstacles : [];
        AA.target = null;
        AA.idx = 0;

        for (let i = 0; i < cand.length; i++) {
            const potential = cand[i].e;
            const blocked = (typeof isLineBlocked === 'function') ? isLineBlocked(ex, ey, potential.x, potential.y, obsList) : false;
            if (!blocked) {
                AA.target = potential;
                AA.idx = i;
                break;
            }
        }

        // Keep full candidate list for manual target cycling.
        AA.candidates = cand.map(o => o.e);

        // If all targets are blocked, keep target = null to avoid wall shots.
        AA.nextScan = nowMs + 150; // Rescan again after 150ms.
    }

    // Consume edge-trigger target-cycle requests from Input.
    const req = (this.__targetCycleReq || 0);
    if (req > 0 && AA.candidates && AA.candidates.length) {
        this.__targetCycleReq = 0;
        AA.idx = (AA.idx + req) % AA.candidates.length;
        AA.target = AA.candidates[AA.idx] || null;
    }

    // Revalidate target because it may die between scans.
    if (AA.target && AA.target.hp <= 0) AA.target = null;
    if (!AA.target && AA.candidates && AA.candidates.length) {
        AA.target = AA.candidates[0] || null;
        AA.idx = 0;
    }

    this.__easyTarget = AA.target || null;
    if (this.__easyTarget) {
        const __leadBlendBase = __isEasy ? EASY_AUTO_AIM_LEAD_BLEND : (__is2p ? COOP_AUTO_AIM_LEAD_BLEND : 0);
        const __leadBlend = __aimAssistOn ? __leadBlendBase : 0;
        let __aimX = this.__easyTarget.x;
        let __aimY = this.__easyTarget.y;

        if (__leadBlend > 0) {
            const __aimWeapon = (this.getCurrentWeaponObj && this.getCurrentWeaponObj()) ? this.getCurrentWeaponObj() : { id: 'NORMAL', level: 1 };
            const __aimId = (this.systemId === 'juggernaut' && this.buffs.siege && this.buffs.siege.active) ? 'ROCKET' : (__aimWeapon.id || 'NORMAL');
            const __aimCfg = (BULLET_TYPES && BULLET_TYPES[__aimId]) ? BULLET_TYPES[__aimId] : (BULLET_TYPES.NORMAL || { speed: 12 });
            const __bulletSpeed = Math.max(1, Number(__aimCfg.speed) || 12); // px/frame
            const __dist = Math.hypot(this.__easyTarget.x - this.x, this.__easyTarget.y - this.y);
            const __travelMs = (__dist / (__bulletSpeed * 60)) * 1000;
            const __leadMs = Math.max(0, Math.min(AUTO_AIM_LEAD_MAX_MS, __travelMs * __leadBlend));

            const __tPrev = Number(this.__easyTarget.__aaMotionTick || 0);
            const __dtMs = Math.max(1, now - (__tPrev || now - 16));
            const __xPrev = (typeof this.__easyTarget.__aaMotionX === 'number') ? this.__easyTarget.__aaMotionX : this.__easyTarget.x;
            const __yPrev = (typeof this.__easyTarget.__aaMotionY === 'number') ? this.__easyTarget.__aaMotionY : this.__easyTarget.y;
            const __vx = (this.__easyTarget._motionVx != null) ? Number(this.__easyTarget._motionVx) : ((this.__easyTarget.x - __xPrev) / (__dtMs / 1000));
            const __vy = (this.__easyTarget._motionVy != null) ? Number(this.__easyTarget._motionVy) : ((this.__easyTarget.y - __yPrev) / (__dtMs / 1000));

            __aimX += (__vx * __leadMs / 1000);
            __aimY += (__vy * __leadMs / 1000);
        }

        this.angle = Math.atan2(__aimY - this.y, __aimX - this.x);
        this.__easyTarget.__aaMotionX = this.__easyTarget.x;
        this.__easyTarget.__aaMotionY = this.__easyTarget.y;
        this.__easyTarget.__aaMotionTick = now;
    }
    // No target: keep current turret angle; do not fallback to mouse aim.
} else {
    const worldMouseX = Input.mouse.x + Camera.x;
    const worldMouseY = Input.mouse.y + Camera.y;
    this.angle = Math.atan2(worldMouseY - this.y, worldMouseX - this.x);
}

                if (this.systemId === 'mage' && this.mage && this.mage.blizzard && this.mage.blizzard.active) {
                    const bz = this.mage.blizzard;
                    const cfg = getSystemSkillDef('mage', 'vampirism') || {};
                    const outerR = (cfg.radius != null) ? cfg.radius : 220;
                    const innerR = (cfg.innerRadius != null) ? cfg.innerRadius : 70;

                    if (now > bz.endTime) {
                        bz.active = false;
                        bz.locked = false;
                        Game.ui.removeBuff('Bão Tuyết');
                    } else {
                        // Check lock state (enemy inside inner radius).
                        let locked = false;
                        if (Game.mode === 'PVP_DUEL_AIM') {
                            const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                            for (const __pl of __plist) {
                                if (!__pl || __pl === this || typeof __pl.hp !== 'number' || __pl.hp <= 0) continue;
                                const d = Math.hypot(__pl.x - bz.x, __pl.y - bz.y);
                                if (d <= innerR) { locked = true; break; }
                            }
                            if (!locked && Game.clones && Game.clones.length) {
                                for (const __cl of Game.clones) {
                                    if (!__cl || __cl.markedForDeletion) continue;
                                    if (__cl.ownerPid && __cl.ownerPid === (this.pid || 1)) continue;
                                    const dC = Math.hypot(__cl.x - bz.x, __cl.y - bz.y);
                                    if (dC <= innerR) { locked = true; break; }
                                }
                            }
                        } else {
                            for (const e of Game.enemies) {
                                if (!e || e.markedForDeletion || e.hp <= 0) continue;
                                const d = Math.hypot(e.x - bz.x, e.y - bz.y);
                                if (d <= innerR) { locked = true; break; }
                            }
                        }
                        bz.locked = locked;

                        // If not locked, update movement (scaled by FPS cap).
                        if (!bz.locked) {
                            const cap = Math.max(30, Math.min(120, (typeof MAX !== 'undefined' && MAX.State && MAX.State.save && MAX.State.save.settings) ? (MAX.State.save.settings.fpsCap || 60) : 60));
                            const pxPerSec = (cfg.moveSpeed != null) ? cfg.moveSpeed : 220;
                            const step = pxPerSec / cap;

                            bz.x += Math.cos(this.angle) * step;
                            bz.y += Math.sin(this.angle) * step;

                            bz.x = Math.max(outerR, Math.min(WORLD_WIDTH - outerR, bz.x));
                            bz.y = Math.max(outerR, Math.min(WORLD_HEIGHT - outerR, bz.y));
                        }

                        // Tick damage and apply slow.
                        const tickI = (cfg.tickInterval != null) ? cfg.tickInterval : 400;
                        if (now >= bz.nextTick) {
                            bz.nextTick = now + tickI;
                            const dmg = (cfg.tickDamage != null) ? cfg.tickDamage : 28;
                            const dmgMultSkill = (1 + 0.1 * ((Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0));
                            const dmgFinal = Math.max(1, Math.round(dmg * dmgMultSkill));
                            const slowFactor = (cfg.slowFactor != null) ? cfg.slowFactor : 0.5;
                            const slowDur = (cfg.slowDuration != null) ? cfg.slowDuration : 900;

                            if (Game.mode === 'PVP_DUEL_AIM') {
                                const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                                for (const __pl of __plist) {
                                    if (!__pl || __pl === this || typeof __pl.hp !== 'number' || __pl.hp <= 0) continue;
                                    const d = Math.hypot(__pl.x - bz.x, __pl.y - bz.y);
                                    if (d <= outerR) {
                                        if (typeof __pl.applyEffect === 'function') __pl.applyEffect({ type: 'SLOW', duration: slowDur, factor: slowFactor });
                                        if (typeof __pl.takeDamage === 'function') __pl.takeDamage(dmgFinal, { attacker: this, type: 'PVP_BLIZZARD' });
                                        else { __pl.hp -= dmgFinal; if (__pl.hp < 0) __pl.hp = 0; }
                                        createDamageText(__pl.x, __pl.y, dmgFinal, cfg.color || "#00E5FF");
                                    }
                                }
                                if (Game.clones && Game.clones.length) {
                                    for (const __cl of Game.clones) {
                                        if (!__cl || __cl.markedForDeletion) continue;
                                        if (__cl.ownerPid && __cl.ownerPid === (this.pid || 1)) continue;
                                        const dC = Math.hypot(__cl.x - bz.x, __cl.y - bz.y);
                                        if (dC <= outerR) {
                                            if (typeof __cl.applyEffect === 'function') __cl.applyEffect({ type: 'SLOW', duration: slowDur, factor: slowFactor });
                                            if (typeof __cl.takeDamage === 'function') __cl.takeDamage(dmgFinal);
                                        }
                                    }
                                }
                            } else {
                                for (const e of Game.enemies) {
                                    if (!e || e.markedForDeletion || e.hp <= 0) continue;
                                    const d = Math.hypot(e.x - bz.x, e.y - bz.y);
                                    if (d <= outerR) {
                                        e.hp -= dmgFinal;
                                        createDamageText(e.x, e.y, dmgFinal, cfg.color || "#00E5FF");
                                        if (typeof e.applyEffect === 'function') e.applyEffect({ type: 'SLOW', duration: slowDur, factor: slowFactor });
                                    }
                                }
                            }
                        }
                    }
                }

                // Expire item-based buffs.
                if (this.buffs.shield.active && now > this.buffs.shield.endTime) {
                    this.buffs.shield.active = false;
                    if (Game.ui && Game.ui.setShieldOverlay) Game.ui.setShieldOverlay(false); else { try{document.getElementById('shieldOverlay').style.display='none';}catch(e){} }
                    Game.ui.removeBuff('Shield');
                }
                if (this.buffs.rapid.active && now > this.buffs.rapid.endTime) {
                    this.buffs.rapid.active = false;
                    Game.ui.removeBuff('Rapid');
                }

// Auto-shoot is enabled for Easy/2P; Hard 1P keeps click-to-shoot. // Auto-shoot cho Easy/2P; Hard 1P bấm để bắn
if (__assCasting) { } else if (__isPvp) {
    if (!__dead && !__stunned) {
        const isP1 = ((this.pid || 1) === 1);
        const shootP1 = !!Input.keys[' '];
        const shootP2 = !!(Input.codes['Enter'] || Input.codes['NumpadEnter'] || Input.codes['Numpad0'] || Input.keys['enter']);
        const wantsShoot = isP1 ? shootP1 : shootP2;
        if (wantsShoot) {
            const tgt = this.__pvpTarget;
            const lockOk = (now > (this._pvpLockUntil || 0));
            if (tgt && lockOk) {
                const obsList = (Game.obstacles && Game.obstacles.length) ? Game.obstacles : [];
                const blocked = (typeof isLineBlocked === 'function') ? isLineBlocked(this.x, this.y, tgt.x, tgt.y, obsList) : false;
                if (!blocked) this.shoot(obstacles);
            }
        }
    }
} else if ((__is2p || __isEasy)) {
    if (!__dead && this.__easyTarget) this.shoot(obstacles);
} else {
    if (!__dead && Input.mouse.down) this.shoot(obstacles);
}

                const __noSkillCdHud = !!(Game && Game.adminNoSkillCooldown);
                const __cd = getSystemSkillCooldowns(this.systemId);
                Game.ui.updateSkillCooldown('clone', this.skills.clone.lastUsed, __noSkillCdHud ? 0 : __cd.clone);
                Game.ui.updateSkillCooldown('stealth', this.skills.stealth.lastUsed, __noSkillCdHud ? 0 : __cd.stealth);
                Game.ui.updateSkillCooldown('vampirism', this.skills.vampirism.lastUsed, __noSkillCdHud ? 0 : __cd.vampirism);
                this.validatePosition();
            }
            shoot(obstacles) {
                const now = Date.now();
                // Speed system: cannot shoot during dash for stable behavior.
                if (this.systemId === 'speed' && this.dash && this.dash.active && now <= this.dash.endTime) return; let weaponObj = this.getCurrentWeaponObj();
                let baseConfig = BULLET_TYPES[weaponObj.id];

                // Juggernaut Siege mode: always fire ROCKET regardless of current weapon.
                if (this.systemId === 'juggernaut' && this.buffs.siege && this.buffs.siege.active) {
                    let currentLv = weaponObj.level || 1;
                    weaponObj = { id: 'ROCKET', level: currentLv };
                    baseConfig = BULLET_TYPES.ROCKET;
                }
                // Balance per ammo type and weapon level.
                let level = weaponObj.level || 1;
                let damage = baseConfig.damage;
                let cooldown = baseConfig.cooldown;
                let speed = baseConfig.speed;

                if (weaponObj.id === 'NORMAL') {
                    // NORMAL: higher levels increase damage and reduce fire cooldown.
                    cooldown = Math.max(100, baseConfig.cooldown - (level - 1) * 30);
                    damage += (level - 1) * 3;
                }
                else if (weaponObj.id === 'FIRE') {
                    // FIRE: high fire rate with moderate per-shot damage.
                    cooldown = Math.max(80, baseConfig.cooldown - (level - 1) * 30);
                    damage += (level - 1) * 2;
                }
                else if (weaponObj.id === 'LIGHTNING') {
                    // LIGHTNING: scale damage by level and reduce cooldown noticeably.
                    damage += (level - 1) * 6;
                    cooldown = Math.max(250, baseConfig.cooldown - (level - 1) * 40); // Reduce fire cooldown by level.
                }
                else if (weaponObj.id === 'PIERCING') {
                    // PIERCING: sniper-oriented, higher base damage and strong cooldown reduction.
                    damage = 35 + (level - 1) * 12;
                    cooldown = Math.max(300, baseConfig.cooldown - (level - 1) * 60); // Apply strong fire-cooldown reduction.
                }
                else if (weaponObj.id === 'HOMING') {
                    // HOMING: better consistency on moving targets; higher levels increase DPS.
                    damage += (level - 1) * 4;
                    if (level >= 5) damage += 15;
                }
                else if (weaponObj.id === 'STUN') {
                    // STUN: control-focused ammo with level-based damage scaling.
                    cooldown = Math.max(200, baseConfig.cooldown - (level - 1) * 50);
                    damage += (level - 1) * 5;
                }
                else if (weaponObj.id === 'ROCKET') {
                    // ROCKET: strong AOE with mild cooldown scaling by level.
                    damage += (level - 1) * 15;
                    cooldown = Math.max(250, baseConfig.cooldown - (level - 1) * 40); // Slightly increase fire cadence.
                }
                // Apply innate cooldown multiplier by system.
                if (this.innateCdMult) cooldown *= this.innateCdMult;
                if (this.buffs.rapid.active) cooldown *= ITEM_TYPES.RAPID_FIRE.value;

                // Siege mode: multiply fire cadence by fireMult.
                if (this.systemId === 'juggernaut' && this.buffs.siege && this.buffs.siege.active) {
                    cooldown *= (this.buffs.siege.fireMult || 0.5);
                }

                // Adrenaline: temporarily increase damage and reduce fire cooldown.
                if (this.systemId === 'speed' && this.buffs.adrenaline && this.buffs.adrenaline.active) {
                    damage *= (this.buffs.adrenaline.damageMult || 1.3);
                    // Reduce fire cooldown while buff is active.
                    cooldown *= (this.buffs.adrenaline.fireMult || 0.5);
                }

                // Shop upgrade: each Fire Rate level reduces cooldown by 5%.
                if (Game.upgrades && Game.upgrades.fireRateLv) {
                    const flv = Game.upgrades.fireRateLv | 0;
                    const frMax = getFireRateMaxLv();
                    const flvC = Math.min(flv, frMax);
                    const mult = Math.pow(0.95, flvC);
                    cooldown *= mult;
                    cooldown = Math.max(80, cooldown); // Clamp minimum cooldown at 80ms to protect balance.
                }

                const __isPvp = (Game.mode === 'PVP_DUEL_AIM');
                const __pvpAmmo = __isPvp ? pvpGetAmmoByPlayer(this) : null;
                if (__isPvp && __pvpAmmo) {
                    damage *= (__pvpAmmo.damageMult || 1);
                    cooldown *= (__pvpAmmo.cooldownMult || 1);
                }
                if (__isPvp && pvpHasItem(this, 'duel_capacitor')) {
                    damage *= (PVP_ITEM_TYPES.duel_capacitor.bulletDamageMult || 1);
                    cooldown *= (PVP_ITEM_TYPES.duel_capacitor.fireCooldownMult || 1);
                }

                damage = Math.max(1, damage || 0);
                cooldown = Math.max(40, cooldown || 0);

                if (now - this.lastShot > cooldown) {
                    let finalConfig = { ...baseConfig, damage: damage, speed: speed };
                    if (weaponObj.id === 'LIGHTNING') { finalConfig.chainCount = baseConfig.chainCount + (level - 1); finalConfig.chainRange = baseConfig.chainRange + (level - 1) * 50; }
                    else if (weaponObj.id === 'PIERCING') { finalConfig.pierceCount = baseConfig.pierceCount + (level - 1); if (level >= 5) finalConfig.radius = 10; }
                    else if (weaponObj.id === 'FIRE') { finalConfig.effect = { ...baseConfig.effect, tickDamage: (baseConfig.effect.tickDamage + (level - 1) * 2) * ((this.systemId === 'speed' && this.buffs.adrenaline && this.buffs.adrenaline.active) ? (this.buffs.adrenaline.damageMult || 1.3) : 1) }; }
                    else if (weaponObj.id === 'HOMING') { finalConfig.turnSpeed = Math.min(0.5, baseConfig.turnSpeed + (level - 1) * 0.05); }
                    else if (weaponObj.id === 'STUN') { finalConfig.effect = { ...baseConfig.effect, duration: baseConfig.effect.duration + (level - 1) * 200 }; }
                    finalConfig.damage = Math.max(1, Math.round(Number(finalConfig.damage) || 0));
                    if (__isPvp) {
                        // PvP: increase projectile speed and slightly expand hit radius for consistency.
                        finalConfig.speed = Math.max(1, (Number(finalConfig.speed) || 0) * 1.18);
                        if (weaponObj.id !== 'ROCKET') {
                            const baseRadius = Number(finalConfig.radius || 4);
                            finalConfig.radius = Math.min(10, baseRadius + 0.9);
                        }
                    }

                    const __baseR2 = (this.baseRadius || 22);
                    const __scale2 = (__baseR2 > 0) ? (this.radius / __baseR2) : 1;
                    const muzzleDist = 35 * (__scale2 || 1);
                    const tipX = this.x + Math.cos(this.angle) * muzzleDist;
                    const tipY = this.y + Math.sin(this.angle) * muzzleDist;
                    const spawnBullet = (ang) => {
                        const __b = new Bullet(tipX, tipY, ang, weaponObj.id, finalConfig, 'PLAYER');
                        __b.ownerPid = this.pid || 1;
                        __b.ownerPlayer = this;
                        if (__isPvp && __pvpAmmo) __b.pvpAmmoId = __pvpAmmo.id;
                        Game.projectiles.push(__b);
                        createMuzzleFlash(tipX, tipY, ang, finalConfig.color);
                    };

                    if (weaponObj.id === 'NORMAL' && level >= 5) { spawnBullet(this.angle); spawnBullet(this.angle - 0.2); spawnBullet(this.angle + 0.2); }
                    else if (weaponObj.id === 'NORMAL' && level >= 3) { spawnBullet(this.angle - 0.1); spawnBullet(this.angle + 0.1); }
                    else if (weaponObj.id === 'HOMING' && level >= 5) { spawnBullet(this.angle); spawnBullet(this.angle - 0.3); spawnBullet(this.angle + 0.3); }
                    else { spawnBullet(this.angle); }

                    const recoilX = Math.cos(this.angle) * 2; const recoilY = Math.sin(this.angle) * 2; const nextX = this.x - recoilX; const nextY = this.y - recoilY;
                    let canRecoil = true; if (obstacles) { for (let obs of obstacles) { if (checkCircleRect({x: nextX, y: nextY, radius: this.radius}, obs)) { canRecoil = false; break; } } }
                    if (canRecoil) { this.x = nextX; this.y = nextY; }
                    this.lastShot = now;
                }
            }
            assassinTeleportTo(tx, ty, obstacles) {
                const __preX = this.x;
                const __preY = this.y;
                const __nowFx = Date.now();
                if (this.systemId === 'assassin') {
                    if (!this._assFx) this._assFx = { after: [], slashes: [], flashes: [] };
                    const a = this._assFx.after;
                    a.push({ x: __preX, y: __preY, angle: this.angle, t: __nowFx, life: 320 });
                    a.push({ x: __preX - Math.cos(this.angle || 0) * 6, y: __preY - Math.sin(this.angle || 0) * 6, angle: this.angle, t: __nowFx, life: 240 });
                    if (a.length > 10) a.shift();
                    const f = this._assFx.flashes;
                    f.push({ x: __preX, y: __preY, t: __nowFx, life: 220, size: 40, color: 'rgba(176,86,255,0.65)', ring: true });
                    if (f.length > 18) f.shift();
                }
                this.x = tx; this.y = ty;
                this.x = Math.max(this.radius, Math.min(WORLD_WIDTH - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.y));
                const obsList = (obstacles && obstacles.length) ? obstacles : (Game.obstacles || []);
                if (obsList && obsList.length) {
                    for (let t = 0; t < 10; t++) {
                        let stuck = false;
                        for (let obs of obsList) {
                            if (checkCircleRect({ x: this.x, y: this.y, radius: this.radius }, obs)) {
                                const obsCX = obs.x + obs.width / 2;
                                const obsCY = obs.y + obs.height / 2;
                                const ang = Math.atan2(this.y - obsCY, this.x - obsCX);
                                this.x += Math.cos(ang) * 8;
                                this.y += Math.sin(ang) * 8;
                                stuck = true;
                            }
                        }
                        if (!stuck) break;
                    }
                }
                this.x = Math.max(this.radius, Math.min(WORLD_WIDTH - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.y));
                if (this.systemId === 'assassin' && this._assFx) {
                    const f2 = this._assFx.flashes;
                    f2.push({ x: this.x, y: this.y, t: __nowFx, life: 240, size: 48, color: 'rgba(120,60,200,0.75)', ring: true });
                    if (f2.length > 18) f2.shift();
                }
            }
            assassinSlash(opts) {
                if (this.systemId === 'assassin') {
                    if (!this._assFx) this._assFx = { after: [], slashes: [], flashes: [] };
                    const now = Date.now();
                    const s = this._assFx.slashes;
                    const arc = (opts && typeof opts.arc === 'number') ? opts.arc : ((120 * Math.PI) / 180);
                    const range = (opts && typeof opts.range === 'number') ? opts.range : ASSASSIN_SLASH_RANGE;
                    const fx = (opts && opts.fx) ? String(opts.fx).toLowerCase() : 'basic';
                    const palettes = {
                        basic: { outer: 'rgba(196,143,255,0.9)', inner: 'rgba(255,255,255,0.9)', spark: 'rgba(255,200,255,0.9)' },
                        q:     { outer: 'rgba(255,80,130,0.9)', inner: 'rgba(255,220,240,0.95)', spark: 'rgba(255,120,170,0.9)' },
                        e:     { outer: 'rgba(120,200,255,0.9)', inner: 'rgba(220,245,255,0.95)', spark: 'rgba(160,220,255,0.9)' },
                        r:     { outer: 'rgba(255,170,80,0.95)', inner: 'rgba(255,235,200,0.98)', spark: 'rgba(255,210,150,0.9)' }
                    };
                    const pal = palettes[fx] || palettes.basic;
                    const baseLife = (opts && typeof opts.life === 'number')
                        ? opts.life
                        : (fx === 'r' ? 260 : (fx === 'e' ? 220 : (fx === 'q' ? 210 : 200)));
                    const slash = {
                        x: this.x,
                        y: this.y,
                        angle: this.angle,
                        arc,
                        range,
                        t: now,
                        life: baseLife,
                        width: (opts && typeof opts.width === 'number') ? opts.width : 6,
                        colorOuter: pal.outer,
                        colorInner: pal.inner,
                        spark: pal.spark,
                        sparks: []
                    };
                    const half = arc * 0.5;
                    const sparkCount = (opts && typeof opts.sparkCount === 'number') ? opts.sparkCount : 8;
                    for (let i = 0; i < sparkCount; i++) {
                        const aa = -half + Math.random() * arc;
                        const rr = range * (0.65 + Math.random() * 0.35);
                        slash.sparks.push({ a: aa, r: rr, len: 8 + Math.random() * 12, w: 1 + Math.random() * 1.4 });
                    }
                    s.push(slash);
                    if (s.length > 14) s.shift();

                    // Small flash at slash origin.
                    const f = this._assFx.flashes;
                    f.push({ x: this.x, y: this.y, t: now, life: 160, size: range * 0.45, color: pal.outer, ring: true });
                    if (f.length > 18) f.shift();

                    // Light screen shake.
                    try {
                        if (opts && typeof opts.shake === 'number') Game.shake = Math.max(Game.shake, opts.shake);
                    } catch(e) {}
                }
                const weaponObj = this.getCurrentWeaponObj ? this.getCurrentWeaponObj() : { id: "NORMAL", level: 1 };
                const baseConfig = (BULLET_TYPES && BULLET_TYPES[weaponObj.id]) ? BULLET_TYPES[weaponObj.id] : { damage: 22 };
                let level = weaponObj.level || 1;
                let base = baseConfig.damage;
                if (weaponObj.id === "NORMAL") { base += (level - 1) * 3; }
                else if (weaponObj.id === "FIRE") { base += (level - 1) * 2; }
                else if (weaponObj.id === "LIGHTNING") { base += (level - 1) * 6; }
                else if (weaponObj.id === "PIERCING") { base = 35 + (level - 1) * 12; }
                else if (weaponObj.id === "HOMING") { base += (level - 1) * 4; if (level >= 5) base += 15; }
                else if (weaponObj.id === "STUN") { base += (level - 1) * 5; }
                else if (weaponObj.id === "ROCKET") { base += (level - 1) * 15; }
                if (this.systemId === "speed" && this.buffs.adrenaline && this.buffs.adrenaline.active) { base *= (this.buffs.adrenaline.damageMult || 1.3); }
                const dmgLv = (Game.upgrades && Game.upgrades.dmgLv) ? (Game.upgrades.dmgLv | 0) : 0;
                const dmgMultSkill = (1 + 0.1 * dmgLv);
                const dmg = Math.max(1, Math.round(base * dmgMultSkill));
                const __baseR = (this.baseRadius || 22);
                const __scale = (__baseR > 0) ? (this.radius / __baseR) : 1;
                const range = (opts && typeof opts.range === "number" ? opts.range : 86) * (__scale || 1);
                const arc = (opts && typeof opts.arc === "number") ? opts.arc : ((110 * Math.PI) / 180);
                const half = arc * 0.5;
                const a0 = this.angle;
                const hitCheck = (tx, ty, tr) => {
                    const dx = tx - this.x; const dy = ty - this.y; const dist = Math.hypot(dx, dy);
                    if (dist > range + (tr || 0)) return false;
                    const ang = Math.atan2(dy, dx);
                    const diff = Math.atan2(Math.sin(ang - a0), Math.cos(ang - a0));
                    return Math.abs(diff) <= half;
                };
                let __assLeechScaledDamage = 0;
                let __assassinKills = 0;
                const __accAssassinLeech = (dealt, targetObj) => {
                    const val = Number(dealt) || 0;
                    if (val <= 0) return;
                    const factor = (targetObj && targetObj.typeKey === "BOSS") ? 0.5 : 1.0;
                    __assLeechScaledDamage += (val * factor);
                };

                if (Game.mode === "PVP_DUEL_AIM") {
                    const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                    for (let i = 0; i < __plist.length; i++) {
                        const p = __plist[i];
                        if (!p || typeof p.hp !== "number" || p.hp <= 0) continue;
                        if (p.isStealth) continue;
                        if ((this.pid != null) && p.pid === this.pid) continue;
                        if (hitCheck(p.x, p.y, p.radius || 0)) {
                            const hpBefore = (typeof p.hp === "number") ? p.hp : 0;
                            if (typeof p.takeDamage === "function") p.takeDamage(dmg, { attacker: this, type: "PVP_MELEE" });
                            const hpAfter = (typeof p.hp === "number") ? p.hp : hpBefore;
                            __accAssassinLeech(Math.max(0, hpBefore - hpAfter), p);
                        }
                    }
                    if (Game.clones && Game.clones.length) {
                        for (let i = 0; i < Game.clones.length; i++) {
                            const c = Game.clones[i];
                            if (!c || c.markedForDeletion) continue;
                            if (this.pid != null && c.ownerPid === this.pid) continue;
                            if (hitCheck(c.x, c.y, c.radius || 0)) {
                                const hpBefore = (typeof c.hp === "number") ? c.hp : 0;
                                if (typeof c.takeDamage === "function") c.takeDamage(dmg);
                                const hpAfter = (typeof c.hp === "number") ? c.hp : hpBefore;
                                __accAssassinLeech(Math.max(0, hpBefore - hpAfter), c);
                            }
                        }
                    }
                } else {
                    if (Game.enemies && Game.enemies.length) {
                        for (let i = 0; i < Game.enemies.length; i++) {
                            const e = Game.enemies[i];
                            if (!e || e.hp <= 0) continue;
                            if (hitCheck(e.x, e.y, e.radius || 0)) {
                                const hpBefore = (typeof e.hp === "number") ? e.hp : 0;
                                const bossBonus = (e.typeKey === "BOSS")
                                    ? Math.min(ASSASSIN_BOSS_SKILL_BONUS_CAP, Math.max(0, Math.round((e.maxHp || 0) * ASSASSIN_BOSS_SKILL_BONUS_PCT)))
                                    : 0;
                                const hitDamage = dmg + bossBonus;
                                e.hp -= hitDamage;
                                const dealt = Math.max(0, Math.min(hpBefore, hpBefore - e.hp));
                                __accAssassinLeech(dealt, e);
                                if (hpBefore > 0 && e.hp <= 0) __assassinKills++;
                                createDamageText(e.x, e.y, Math.round(hitDamage), "#E0E0E0");
                            }
                        }
                    }
                }

                if (__assLeechScaledDamage > 0) {
                    const __nowLeech = Date.now();
                    if (!this.assassinSkillLeech) this.assassinSkillLeech = { windowStart: __nowLeech, healed: 0 };
                    const __ls = this.assassinSkillLeech;
                    if (__nowLeech - __ls.windowStart >= 1000) { __ls.windowStart = __nowLeech; __ls.healed = 0; }

                    const __leechRatio = 0.02;
                    const __leechCap = 12;
                    let __healAmt = __assLeechScaledDamage * __leechRatio;
                    const __room = Math.max(0, __leechCap - (__ls.healed || 0));
                    if (__healAmt > 0 && __room > 0) {
                        __healAmt = Math.min(__healAmt, __room);
                        if (__healAmt > 0 && typeof this.heal === "function") {
                            __ls.healed = (__ls.healed || 0) + __healAmt;
                            this.heal(__healAmt);
                        }
                    }
                }
                if (__assassinKills > 0 && Game.mode !== "PVP_DUEL_AIM") {
                    const refundMs = this.applyAssassinKillCooldownRefund(__assassinKills * ASSASSIN_KILL_REFUND_MS);
                    if (refundMs > 0) {
                        createDamageText(this.x, this.y - 42, 'CD -' + (refundMs / 1000).toFixed(1) + 's', "#B388FF");
                    }
                }
                return dmg;
            }
            applyAssassinKillCooldownRefund(ms) {
                if (this.systemId !== "assassin") return 0;
                const addMs = Math.max(0, Number(ms) || 0);
                if (addMs <= 0 || !this.skills) return 0;

                const now = Date.now();
                if (!this.assassinKillCdRefund) this.assassinKillCdRefund = { windowStart: now, refunded: 0 };
                const st = this.assassinKillCdRefund;
                if (now - st.windowStart >= ASSASSIN_KILL_REFUND_WINDOW_MS) {
                    st.windowStart = now;
                    st.refunded = 0;
                }

                const room = Math.max(0, ASSASSIN_KILL_REFUND_CAP_MS - (st.refunded || 0));
                const grant = Math.min(addMs, room);
                if (grant <= 0) return 0;

                const keys = ["clone", "stealth", "vampirism"];
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    if (this.skills[k] && typeof this.skills[k].lastUsed === "number") {
                        this.skills[k].lastUsed -= grant;
                    }
                }

                st.refunded = (st.refunded || 0) + grant;
                return grant;
            }
            takeDamage(amount, source) {
                const now = Date.now();
                const isPvpMode = (Game.mode === 'PVP_DUEL_AIM');
                let rawAmount = amount;
                const juggerActive = (this.systemId === 'juggernaut' && this.buffs.juggerShield && this.buffs.juggerShield.active && now <= this.buffs.juggerShield.endTime);

                // Admin cheat: invulnerability.
                if (this.invulnerable) {
                    return;
                }

                // Assassin gets mitigation while casting.
                if (this._assMitigation && now <= this._assMitigation.endTime) {
                    const mult = (typeof this._assMitigation.mult === 'number') ? this._assMitigation.mult : 0.1;
                    amount *= mult;
                    rawAmount = amount;
                }

                // Speed system: Phase grants invulnerability.
                if (this.buffs.phase && this.buffs.phase.active && now <= this.buffs.phase.endTime) {
                    let a = amount;
                    if (this.buffs.shield.active) a *= 0.3;
                    if (juggerActive) a *= 0.5;

                    const alvP = (Game.upgrades && Game.upgrades.armorLv) ? (Game.upgrades.armorLv | 0) : 0;
                    let reductionP = (alvP * 0.05) + (this.innateArmor || 0);
                    if (isPvpMode && pvpHasItem(this, 'duel_capacitor')) reductionP += (PVP_ITEM_TYPES.duel_capacitor.armorShift || 0);
                    reductionP = Math.max(0, Math.min(0.75, reductionP));
                    const finalAmountP = (a > 0) ? Math.max(1, Math.round(a * (1 - reductionP))) : a;

                    const healAmt = (finalAmountP > 0) ? (finalAmountP * 0.5) : 0;
                    if (healAmt > 0) {
                        this.heal(healAmt);
                        createDamageText(this.x, this.y - 60, `+${Math.round(healAmt)}`, '#00ff88');
                    }
                    return;
                }

                // Juggernaut J1: Reflect Armor (does not reflect boss).
                if (juggerActive && rawAmount > 0) {
                    const attacker = source ? (source.enemy || source.attacker || null) : null;
                    if (attacker && attacker.typeKey !== 'BOSS' && typeof attacker.hp === 'number') {
                        const dmgMultSkill = (1 + 0.1 * ((Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0));
                        const reflectDmg = Math.max(1, Math.round(rawAmount * 0.5 * dmgMultSkill));
                        attacker.hp -= reflectDmg;
                        if (attacker.hp < 0) attacker.hp = 0;
                        // Sync HUD immediately after reflected damage in PvP.
                        if (attacker.pid && Game.ui && typeof Game.ui.updateHealth === 'function') {
                            const __pidPrevR = Game.__uiPid;
                            try { Game.__uiPid = attacker.pid; Game.ui.updateHealth(attacker.hp, attacker.maxHp || attacker.hp); }
                            finally { Game.__uiPid = __pidPrevR; }
                        }
                        createDamageText(attacker.x, attacker.y - 20, `-${reflectDmg}`, '#FFD54F');
                    }
                }

                // Damage-reduction layers.
                let modAmount = amount;
                if (this.buffs.shield.active) modAmount *= 0.3;
                if (juggerActive) modAmount *= 0.5;

                // When Siege is active: reduce incoming damage by 60%.
                if (this.buffs.siege && this.buffs.siege.active) modAmount *= 0.4;

                if (isPvpMode) {
                    const srcType = source && source.type ? String(source.type) : '';
                    const isPvpSkillDamage = (srcType === 'PVP_EMP' || srcType === 'PVP_RAM' || srcType === 'PVP_MELEE' || srcType === 'PVP_BLIZZARD');
                    if (isPvpSkillDamage) modAmount *= PVP_SKILL_DAMAGE_MULT;

                    if (pvpHasItem(this, 'composite_armor')) {
                        modAmount *= (PVP_ITEM_TYPES.composite_armor.damageTakenMult || 1);
                    }
                    const srcBullet = source && source.bullet ? source.bullet : null;
                    if (pvpHasItem(this, 'drone_disruptor') && pvpIsSummonBullet(srcBullet)) {
                        modAmount *= (PVP_ITEM_TYPES.drone_disruptor.damageTakenFromSummonMult || 1);
                    }

                    if (pvpHasItem(this, 'burst_dampener')) {
                        const cfg = PVP_ITEM_TYPES.burst_dampener;
                        if (!this._pvpBurst) this._pvpBurst = { windowStart: now, accum: 0, activeUntil: 0, cooldownUntil: 0 };
                        const st = this._pvpBurst;
                        if (!st.windowStart || (now - st.windowStart) > (cfg.windowMs || 800)) {
                            st.windowStart = now;
                            st.accum = 0;
                        }
                        st.accum += Math.max(0, Number(rawAmount) || 0);
                        const need = Math.max(1, (this.maxHp || 0) * (cfg.triggerPct || 0.14));
                        if ((st.accum >= need) && now >= (st.cooldownUntil || 0)) {
                            st.activeUntil = now + (cfg.activeMs || 1400);
                            st.cooldownUntil = now + (cfg.cooldownMs || 16000);
                            st.accum = 0;
                        }
                        if (now < (st.activeUntil || 0)) {
                            modAmount *= (cfg.activeMult || 1);
                        }
                    }
                }

                const hasShield = (this.buffs.shield.active || juggerActive || (this.buffs.siege && this.buffs.siege.active));
                if (!hasShield && modAmount > 0 && this.systemId !== 'assassin') {
                    const __pidPrevW = Game.__uiPid;
                    try { Game.__uiPid = (this.pid || 1); this.loseCurrentWeapon(); }
                    finally { Game.__uiPid = __pidPrevW; }
                }

                // Apply armor-based damage reduction.
                const alv = (Game.upgrades && Game.upgrades.armorLv) ? (Game.upgrades.armorLv | 0) : 0;
                let reduction = (alv * 0.05) + (this.innateArmor || 0);
                if (isPvpMode && pvpHasItem(this, 'duel_capacitor')) {
                    reduction += (PVP_ITEM_TYPES.duel_capacitor.armorShift || 0);
                }
                reduction = Math.max(0, Math.min(0.75, reduction));

                if (isPvpMode) {
                    const srcBullet = source && source.bullet ? source.bullet : null;
                    const srcAmmo = (srcBullet && srcBullet.pvpAmmoId && PVP_AMMO_TYPES[srcBullet.pvpAmmoId]) ? PVP_AMMO_TYPES[srcBullet.pvpAmmoId] : null;
                    if (srcAmmo && srcAmmo.id === 'ap40') {
                        let ignore = Math.max(0, Math.min(0.95, srcAmmo.armorIgnore || 0));
                        if (pvpHasItem(this, 'anti_pierce_liner')) {
                            ignore *= (1 - (PVP_ITEM_TYPES.anti_pierce_liner.reduceArmorIgnoreBy || 0));
                        }
                        reduction *= (1 - ignore);
                        if (pvpHasItem(this, 'anti_pierce_liner')) {
                            reduction = Math.max(PVP_ITEM_TYPES.anti_pierce_liner.minArmor || 0, reduction);
                        }
                        reduction = Math.max(0, Math.min(0.75, reduction));
                    }
                }

                const finalAmount = (modAmount > 0) ? Math.max(1, Math.round(modAmount * (1 - reduction))) : modAmount;

                this.hp -= finalAmount;
                if (this.hp < 0) this.hp = 0;
                const __pidPrev = Game.__uiPid;

                try { Game.__uiPid = (this.pid || 1); Game.ui.updateHealth(this.hp, this.maxHp); }
                finally { Game.__uiPid = __pidPrev; }
                Game.shake = 10;
            }

            heal(amount) {
                let healAmount = Number(amount) || 0;
                if (healAmount <= 0) return;

                if (Game.mode === 'PVP_DUEL_AIM' && this._pvpWoundedUntil && Date.now() < this._pvpWoundedUntil) {
                    healAmount *= (PVP_AMMO_TYPES.executioner.woundHealFactor || 1);
                }
                if (healAmount <= 0) return;

                this.hp = Math.min(this.hp + healAmount, this.maxHp);
                const __pidPrev = Game.__uiPid;

                try { Game.__uiPid = (this.pid || 1); Game.ui.updateHealth(this.hp, this.maxHp); }
                finally { Game.__uiPid = __pidPrev; }
                createDamageText(this.x, this.y - 20, `+${Math.floor(healAmount)}`, '#4CAF50');
            }
            draw() {
                // Mage system: render Blizzard in world space.
                if (this.systemId === 'mage' && this.mage && this.mage.blizzard && this.mage.blizzard.active) {
                    const bz = this.mage.blizzard;
                    const cfg = getSystemSkillDef('mage', 'vampirism') || {};
                    const outerR = (cfg.radius != null) ? cfg.radius : 220;
                    const innerR = (cfg.innerRadius != null) ? cfg.innerRadius : 70;

                    ctx.save();
                    ctx.translate(bz.x, bz.y);

                    ctx.beginPath();
                    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 229, 255, 0.10)';
                    ctx.fill();
                    ctx.strokeStyle = cfg.color || '#00E5FF';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    const t = Date.now() / 220;
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    const n = 12;
                    for (let i = 0; i < n; i++) {
                        const ang = t + i * (Math.PI * 2 / n);
                        const dist = (outerR * 0.35) + Math.sin(t * 1.7 + i) * (outerR * 0.14);
                        ctx.beginPath();
                        ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    if (bz.locked) {
                        ctx.beginPath();
                        ctx.arc(0, 0, innerR + 10 + Math.sin(t * 2) * 3, 0, Math.PI * 2);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                        ctx.lineWidth = 3;
                        ctx.stroke();
                    }

                    ctx.restore();
                }

                // Assassin VFX in world space.
                if (this.systemId === 'assassin' && this._assFx) {
                    const nowFx = Date.now();
                    // Afterimages.
                    for (let i = this._assFx.after.length - 1; i >= 0; i--) {
                        const a = this._assFx.after[i];
                        const age = nowFx - a.t;
                        if (age > a.life) { this._assFx.after.splice(i, 1); continue; }
                        const alpha = (1 - age / a.life) * 0.45;
                        ctx.save();
                        ctx.translate(a.x, a.y);
                        ctx.rotate(a.angle || 0);
                        ctx.globalAlpha = alpha;

                        // diamond body ghost
                        ctx.save();
                        ctx.rotate(Math.PI / 4);
                        ctx.fillStyle = 'rgba(30,10,45,0.55)';
                        ctx.beginPath();
                        ctx.roundRect(-14, -14, 28, 28, 5);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(176,86,255,0.55)';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        ctx.restore();

                        // cloak ghost
                        ctx.save();
                        ctx.rotate(Math.PI);
                        ctx.fillStyle = 'rgba(40, 10, 60, 0.35)';
                        ctx.beginPath();
                        ctx.moveTo(-4, -12);
                        ctx.lineTo(-34, 0);
                        ctx.lineTo(-4, 12);
                        ctx.closePath();
                        ctx.fill();
                        ctx.restore();

                        // blade ghost
                        ctx.strokeStyle = 'rgba(200, 150, 255, 0.75)';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(30, 0);
                        ctx.stroke();

                        ctx.restore();
                    }
                    // Slash arc trails.
                    for (let i = this._assFx.slashes.length - 1; i >= 0; i--) {
                        const s = this._assFx.slashes[i];
                        const age = nowFx - s.t;
                        if (age > s.life) { this._assFx.slashes.splice(i, 1); continue; }
                        const alpha = (1 - age / s.life);
                        const arc = (s.arc || 1.9);
                        const range = (s.range || 86);
                        const colOuter = s.colorOuter || 'rgba(196,143,255,0.9)';
                        const colInner = s.colorInner || 'rgba(255,255,255,0.9)';
                        const width = s.width || 6;
                        ctx.save();
                        ctx.translate(s.x, s.y);
                        ctx.rotate(s.angle || 0);
                        ctx.globalCompositeOperation = 'lighter';

                        // soft wedge glow
                        ctx.globalAlpha = 0.22 * alpha;
                        ctx.fillStyle = colOuter;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.arc(0, 0, range, -arc / 2, arc / 2);
                        ctx.closePath();
                        ctx.fill();

                        // outer arc
                        ctx.globalAlpha = 0.85 * alpha;
                        ctx.strokeStyle = colOuter;
                        ctx.lineWidth = width;
                        ctx.beginPath();
                        ctx.arc(0, 0, range, -arc / 2, arc / 2);
                        ctx.stroke();

                        // inner arc
                        ctx.globalAlpha = 1.0 * alpha;
                        ctx.strokeStyle = colInner;
                        ctx.lineWidth = Math.max(2, width * 0.45);
                        ctx.beginPath();
                        ctx.arc(0, 0, range - 2, -arc / 2, arc / 2);
                        ctx.stroke();

                        // sparks
                        if (s.sparks && s.sparks.length) {
                            ctx.globalAlpha = 0.9 * alpha;
                            ctx.strokeStyle = s.spark || colInner;
                            for (let k = 0; k < s.sparks.length; k++) {
                                const sp = s.sparks[k];
                                const a = sp.a || 0;
                                const r0 = sp.r || range * 0.7;
                                const len = sp.len || 10;
                                const w = sp.w || 1.2;
                                ctx.lineWidth = w;
                                ctx.beginPath();
                                ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
                                ctx.lineTo(Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len));
                                ctx.stroke();
                            }
                        }

                        ctx.restore();
                    }
                    // Blink flash for skill R.
                    for (let i = this._assFx.flashes.length - 1; i >= 0; i--) {
                        const f = this._assFx.flashes[i];
                        const age = nowFx - f.t;
                        if (age > f.life) { this._assFx.flashes.splice(i, 1); continue; }
                        const alpha = (1 - age / f.life);
                        const size = f.size || 28;
                        const col = f.color || 'rgba(160, 90, 255, 0.55)';
                        ctx.save();
                        ctx.translate(f.x, f.y);
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.8 * alpha;

                        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.4);
                        rg.addColorStop(0, 'rgba(255,255,255,0.85)');
                        rg.addColorStop(0.3, col);
                        rg.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = rg;
                        ctx.beginPath();
                        ctx.arc(0, 0, size * (0.6 + (1 - alpha) * 0.7), 0, Math.PI * 2);
                        ctx.fill();

                        if (f.ring) {
                            ctx.globalAlpha = 0.95 * alpha;
                            ctx.strokeStyle = col;
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.arc(0, 0, size * (0.7 + (1 - alpha) * 0.9), 0, Math.PI * 2);
                            ctx.stroke();
                        }

                        // cross streaks
                        ctx.globalAlpha = 0.5 * alpha;
                        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(-size, 0); ctx.lineTo(size, 0);
                        ctx.moveTo(0, -size); ctx.lineTo(0, size);
                        ctx.stroke();

                        ctx.restore();
                    }
                }

                ctx.save();
                ctx.translate(this.x, this.y);

                // Alpha behavior for Stealth/Phase states.
                let alpha = 1;
                if (this.isStealth) alpha = 0.4;
                if (this.buffs.phase && this.buffs.phase.active) alpha = 0.35;
                ctx.globalAlpha = alpha;

                // Lifesteal aura for the default system.
                if (this.skills.vampirism.active) {
                    ctx.strokeStyle = '#FF5252';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(255, 82, 82, 0.1)';
                    ctx.fill();
                }

                // Speed-system visual effects.
                if (this.buffs.phase && this.buffs.phase.active) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 16, 0, Math.PI * 2);
                    ctx.strokeStyle = '#81D4FA';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(129, 212, 250, 0.08)';
                    ctx.fill();
                }
                if (this.buffs.adrenaline && this.buffs.adrenaline.active) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
                    ctx.strokeStyle = '#29B6F6';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(41, 182, 246, 0.06)';
                    ctx.fill();
                }
                if (this.dash && this.dash.active) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 18, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(79, 195, 247, 0.55)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Shield buff from items.
                if (this.buffs.shield.active) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
                    ctx.strokeStyle = COLORS.shield;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(0, 191, 255, 0.1)';
                    ctx.fill();
                }

                
                if (this.buffs.juggerShield && this.buffs.juggerShield.active && Date.now() <= this.buffs.juggerShield.endTime) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 213, 79, 0.85)';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(255, 213, 79, 0.08)';
                    ctx.fill();
                }

                const __isAssassin = (this.systemId === 'assassin');
                if (__isAssassin) {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(170, 90, 255, 0.55)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(90, 35, 140, 0.10)';
                    ctx.fill();
                }
                const __bodyFill = __isAssassin ? '#1b1228' : '#333';
                const __bodyEdge = __isAssassin ? '#352046' : '#111';
                const __turretCore = __isAssassin ? '#241333' : COLORS.playerTurret;
// Body
                if (__isAssassin) {
                    // thin tracks
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(-24, -20, 6, 40);
                    ctx.fillRect(18, -20, 6, 40);

                    // diamond body
                    const gradA = ctx.createLinearGradient(-20, -20, 20, 20);
                    gradA.addColorStop(0, '#1b1026');
                    gradA.addColorStop(0.55, '#2d1540');
                    gradA.addColorStop(1, '#3b1b55');
                    ctx.save();
                    ctx.rotate(Math.PI / 4);
                    ctx.fillStyle = gradA;
                    ctx.beginPath();
                    ctx.roundRect(-16, -16, 32, 32, 6);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(182,124,255,0.7)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.restore();

                    // mask stripe
                    ctx.strokeStyle = 'rgba(255,80,180,0.85)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-12, 0);
                    ctx.lineTo(12, 0);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = __bodyFill;
                    ctx.fillRect(-22, -22, 44, 44);
                    ctx.fillStyle = __bodyEdge;
                    ctx.fillRect(-26, -24, 8, 48);
                    ctx.fillRect(18, -24, 8, 48);
                }

                // Turret
                ctx.rotate(this.angle);
                const wObj = this.getCurrentWeaponObj();
                const wConfig = BULLET_TYPES[wObj.id];
                const __blade = __isAssassin ? '#b67cff' : wConfig.color;
                if (__isAssassin) {
                    // turret base (diamond)
                    ctx.fillStyle = __turretCore;
                    ctx.beginPath();
                    ctx.roundRect(-12, -12, 24, 24, 6);
                    ctx.fill();

                    // eye core
                    ctx.fillStyle = 'rgba(255, 80, 180, 0.85)';
                    ctx.beginPath();
                    ctx.arc(4, 0, 3, 0, Math.PI * 2);
                    ctx.fill();

                    // katana blade
                    const bladeGrad = ctx.createLinearGradient(0, -3, 0, 3);
                    bladeGrad.addColorStop(0, '#f0e6ff');
                    bladeGrad.addColorStop(0.5, '#caa6ff');
                    bladeGrad.addColorStop(1, '#7a4ed1');
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(176,86,255,0.9)';
                    ctx.fillStyle = bladeGrad;
                    ctx.fillRect(0, -2, 56, 4);
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = 'rgba(120,70,200,0.9)';
                    ctx.fillRect(-2, -6, 8, 12); // guard
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    ctx.fillRect(52, -3, 8, 6); // tip
                } else {
                    ctx.fillStyle = wConfig.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, 18, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = COLORS.playerTurret;
                    ctx.fillRect(0, -6, 40, 12);
                }
                ctx.restore();
            }
        }

        // === Game Managers === // Trình quản lý game
        
        // Hidden admin code panel.
        const Admin = {
            modal: null, panel: null, input: null, msg: null,
            prevPaused: false,
            init() {
                this.modal = document.getElementById('adminCodeModal');
                this.panel = document.getElementById('adminCodePanel');
                this.input = document.getElementById('adminCodeInput');
                this.msg = document.getElementById('adminCodeMsg');
                if (!this.modal || !this.input) return;

                // Click outside to close.
                this.modal.addEventListener('mousedown', (e) => {
                    if (e.target === this.modal) this.close();
                });

                // Press Enter to submit.
                this.input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        // Stop Enter from bubbling to window to avoid triggering other hotkeys.
                        e.stopPropagation();
                        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
                        this.run(this.input.value);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
                        this.close();
                    }
                });
            },
            isOpen() {
                return this.modal && !this.modal.classList.contains('hidden');
            },
            open() {
                if (!this.modal) return;
                this.prevPaused = !!Game.paused;
                Game.paused = true;
                this.msg.textContent = '';
                this.input.value = '';
                this.modal.classList.remove('hidden');
                setTimeout(() => this.input.focus(), 0);
            },
            close() {
                if (!this.modal) return;
                this.modal.classList.add('hidden');
                Game.paused = this.prevPaused;
            },
            run(codeRaw) {
                const code = String(codeRaw || '').trim().toLowerCase();
                if (!code) { this.msg.textContent = 'Nhập code...'; return; }

                try {
                    if (code === 'cuongdan') {
                        // Upgrade all weapons to Lv.5 for all players.
                        const players = (Game.players && Game.players.length > 0) ? Game.players : [Game.player];
                        let count = 0;

                        // Preserve current UI pid to avoid HUD routing issues.
                        const prevPid = Game.__uiPid;

                        players.forEach(p => {
                            if (p && typeof p.activateCheat === 'function') {
                                // Set pid so HUD updates the correct player.
                                Game.__uiPid = p.pid || 1;
                                p.activateCheat();
                                count++;
                            }
                        });

                        // Restore previous UI pid.
                        Game.__uiPid = prevPid;

                        if (count > 0) {
                            this.msg.textContent = 'OK (All Players)';
                        } else {
                            this.msg.textContent = 'Chưa vào game.';
                            return;
                        }
                        this.close();
                        return;
                    }

                    if (code === 'cuongvang') {
                        // +1,000,000,000 gold (cheat).
                        Game.gold = (Game.gold || 0) + 1000000000;
                        try { if (Game.ui && typeof Game.ui.updateGold === 'function') Game.ui.updateGold(Game.gold); } catch(e) {}
                        if (Game.player) createDamageText(Game.player.x, Game.player.y - 45, "+1000000000G", "#FFD700");
                        this.msg.textContent = 'OK';
                        this.close();
                        return;
                    }

                    if (code === 'battu') {
                        const players = (Game.players && Game.players.length > 0) ? Game.players : [Game.player];
                        let count = 0;
                        let newState = null;

                        players.forEach(p => {
                            if (!p) return;
                            if (newState === null) newState = !p.invulnerable;
                            p.invulnerable = newState;
                            count++;
                        });

                        if (count > 0) {
                            this.msg.textContent = newState ? 'OK (Bất tử ON)' : 'OK (Bất tử OFF)';
                        } else {
                            this.msg.textContent = 'Chưa vào game.';
                            return;
                        }
                        this.close();
                        return;
                    }
                    if (code === 'dongbang') {
                        if (!Game || !Game.player) { this.msg.textContent = 'Chưa vào game.'; return; }
                        Game.adminFreeze = !Game.adminFreeze;
                        this.msg.textContent = Game.adminFreeze ? 'OK (Đóng băng ON)' : 'OK (Đóng băng OFF)';
                        this.close();
                        return;
                    }

                    if (code === 'cuonghoichieu') {
                        if (!Game || !Game.player) { this.msg.textContent = 'Chưa vào game.'; return; }
                        Game.adminNoSkillCooldown = !Game.adminNoSkillCooldown;
                        this.msg.textContent = Game.adminNoSkillCooldown ? 'OK (Hồi chiêu OFF)' : 'OK (Hồi chiêu ON)';
                        this.close();
                        return;
                    }

                    // Open Shop instantly.
                    if (code === 'shop') {
                        if (!Game || !Game.player) { this.msg.textContent = 'Chưa vào game.'; return; }
                        try {
                            // Ensure Shop is initialized.
                            try {
                                if (typeof Shop !== 'undefined' && Shop && typeof Shop.init === 'function' && (!Shop.els || !Shop.els.modal)) {
                                    Shop.init();
                                }
                            } catch(e) {}

                            const nextWaveNum = (typeof WaveManager !== 'undefined' && WaveManager && WaveManager.wave) ? (WaveManager.wave + 1) : 1;
                            const gold = (typeof Game !== 'undefined' && Game) ? (Game.gold || 0) : 0;

                            if (typeof Shop !== 'undefined' && Shop && typeof Shop.show === 'function') {
                                // Open Shop without next-wave callback.
                                Shop.show(nextWaveNum, gold, null);

                                // Show all upgrade cards; bypass random-3 selection.
                                if (Shop.cards && Shop.cards.length) {
                                    for (const c of Shop.cards) c.style.display = "block";
                                }

                                if (typeof Shop.refresh === 'function') Shop.refresh();

                                // Keep game paused while Shop is open.
                                this.prevPaused = true;

                                this.msg.textContent = 'OK (Shop)';
                                this.close();
                                return;
                            }

                            this.msg.textContent = 'Shop chưa sẵn sàng.';
                            return;
                        } catch (e) {
                            this.msg.textContent = 'Lỗi.';
                            return;
                        }
                    }

                    // Jump to wave: supports `wave20` and `wave 20`.
                    const mWave = code.match(/^wave\s*(\d{1,3})$/);
                    if (mWave) {
                        const target = Math.max(1, Math.min(200, parseInt(mWave[1], 10) || 1));
                        if (!Game || !Game.player) { this.msg.textContent = 'Chưa vào game.'; return; }

                        const wasActive = !!Game.active;
                        try {
                            // Clear current entities before starting the target wave.
                            if (Game.enemies) Game.enemies.length = 0;
                            if (Game.enemyBullets) Game.enemyBullets.length = 0;
                            if (Game.bullets) Game.bullets.length = 0;
                            if (Game.projectiles) Game.projectiles.length = 0;
                            if (Game.pickups) Game.pickups.length = 0;
                            if (Game.particles) Game.particles.length = 0;
                            if (Game.turrets) Game.turrets.length = 0;
                            if (Game.clones) Game.clones.length = 0;

                            hideCombatUi();
                            hideEndScreens();

                            // Reset wave state and start again.
                            try { WaveManager.active = false; WaveManager.spawnTimer = 0; WaveManager.enemiesRemainingToSpawn = 0; } catch(e){}
                            WaveManager.wave = target;
                            WaveManager.startWave();

                            // Resume game loop if currently on win/lose screen.
                            Game.active = true;
                            Game.paused = false;
                            try { if (typeof MAX !== 'undefined' && MAX.State) MAX.State.paused = false; } catch(e){}

                            // Restart loop only if it was previously stopped.
                            if (!wasActive && typeof loop === 'function') requestAnimationFrame(loop);

                            this.msg.textContent = 'OK (Wave ' + target + ')';
                            this.close();
                            return;
                        } catch (e) {
                            this.msg.textContent = 'Lỗi.';
                            return;
                        }
                    }

                    this.msg.textContent = 'Sai code.';
                } catch (err) {
                    this.msg.textContent = 'Lỗi.';
                }
            },
            // Block gameplay keys while text input is focused.
            captureKey(e) {
                // Hidden panel shortcut: Ctrl + Shift + X.
                if (!this.isOpen() && e.ctrlKey && e.shiftKey && (e.code === 'KeyX' || e.key === 'X' || e.key === 'x')) {
                    e.preventDefault();
                    this.open();
                    return true;
                }
                // When modal is open, block gameplay controls but allow text input.
                if (this.isOpen()) {
                    // Allow Esc to close even when input is not focused.
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this.close();
                        return true;
                    }
                    // Do not preventDefault so input can receive characters.
                    return true;
                }
                return false;
            }
        };

        const Input = {
            keys: {},
            codes: {},
            actions: {}, // Edge-trigger action queue: {actionName: count}
            mouse: { x: 0, y: 0, down: false },

            getMode() {
                // Use runtime mode from Game.startMode as source of truth.
                try {
                    if (typeof Game !== 'undefined' && Game && Game.startMode && typeof Game.startMode === 'object') {
                        const sm = Game.startMode;
                        const players = Math.max(1, Math.min(2, parseInt(sm.players, 10) || 1));
                        const difficulty = (sm.difficulty === 'easy') ? 'easy' : 'hard';
                        return Object.assign({}, sm, { players, difficulty });
                    }
                } catch(e) {}
                // Fallback to localStorage after reload.
                try {
                    const raw = localStorage.getItem('tankStartMode_v1');
                    if (raw) {
                        const cfg = JSON.parse(raw);
                        if (cfg && typeof cfg === 'object') {
                            const players = Math.max(1, Math.min(2, parseInt(cfg.players, 10) || 1));
                            const difficulty = (cfg.difficulty === 'easy') ? 'easy' : 'hard';
                            return Object.assign({}, cfg, { players, difficulty });
                        }
                    }
                } catch(e) {}
                return { difficulty: 'hard', players: 1 };
            },

            queueAction(name) {
                if (!name) return;
                this.actions[name] = (this.actions[name] || 0) + 1;
            },
            consumeAction(name) {
                const n = this.actions[name] || 0;
                if (n > 0) { this.actions[name] = n - 1; return true; }
                return false;
            },

            _isTypingTarget(el) {
                if (!el) return false;
                const tag = (el.tagName || '').toUpperCase();
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
                // Content-editable element handling.
                try { if (el.isContentEditable) return true; } catch(e){}
                return false;
            },

            init() {
                const isGameplayKey = (k) => ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k);

                window.addEventListener('keydown', (e) => {
                    // Let admin modal capture keys first.
                    try { if (typeof Admin !== 'undefined' && Admin.captureKey && Admin.captureKey(e)) return; } catch(err){}

                    // Do not steal keys while user is typing in inputs.
                    if (this._isTypingTarget(document.activeElement) || this._isTypingTarget(e.target)) return;

                    const code = e.code || '';
                    const kRaw = (e.key || '');
                    const k = kRaw.toLowerCase();

                    if (isGameplayKey(k)) e.preventDefault();

                    // Edge detection: ignore key repeat events.
                    const wasDown = (code && this.codes[code]) || this.keys[k] === true;
                    this.keys[k] = true;
                    if (code) this.codes[code] = true;

                    // Keep legacy compatibility for numeric keys 1-6.
                    if (['1','2','3','4','5','6'].includes(kRaw)) this.keys[kRaw] = true;
                    if (kRaw === ' ') this.keys[' '] = true;

                    // Map key bindings by mode (Hard/Easy/2P).
                    const m = this.getMode();
                    const isHard1p = (m.players === 1 && m.difficulty === 'hard');
                    const isNoMouseMode = (!isHard1p) || (m.players === 2);

                    // Easy/2P: map J/K/L to Q/E/R while keeping Q/E/R fallback.
                    if (isNoMouseMode) {
                        if (code === 'KeyJ' || k === 'j') this.keys['q'] = true;
                        if (code === 'KeyK' || k === 'k') this.keys['e'] = true;
                        if (code === 'KeyL' || k === 'l') this.keys['r'] = true;
                    }

                    // Edge-trigger actions run only on first keydown.
                    if (!wasDown && isNoMouseMode) {
                        const __isPvp = (typeof Game !== 'undefined' && Game && Game.mode === 'PVP_DUEL_AIM');
                        // Weapon cycle: P1=V, P2=Enter.
                        if (code === 'KeyV' || k === 'v') { e.preventDefault(); this.queueAction('p1_weapon_cycle'); }
                        if (!__isPvp && (code === 'Enter' || code === 'NumpadEnter' || k === 'enter')) { e.preventDefault(); this.queueAction('p2_weapon_cycle'); }

                        // Target cycle: P1=T, P2=0 (numpad or digit).
                        if (code === 'KeyT' || k === 't') { e.preventDefault(); this.queueAction('p1_target_cycle'); }
                        if (!__isPvp && (code === 'Digit0' || code === 'Numpad0' || kRaw === '0')) { e.preventDefault(); this.queueAction('p2_target_cycle'); }
                    }
                });

                window.addEventListener('keyup', (e) => {
                    const code = e.code || '';
                    const kRaw = (e.key || '');
                    const k = kRaw.toLowerCase();

                    this.keys[k] = false;
                    if (code) this.codes[code] = false;

                    if (['1','2','3','4','5','6'].includes(kRaw)) this.keys[kRaw] = false;
                    if (kRaw === ' ') this.keys[' '] = false;

                    // Release mapped keys J/K/L => Q/E/R.
                    const m = this.getMode();
                    const isHard1p = (m.players === 1 && m.difficulty === 'hard');
                    const isNoMouseMode = (!isHard1p) || (m.players === 2);
                    if (isNoMouseMode) {
                        // Release virtual key only when matching physical key is no longer held.
                        if (code === 'KeyJ' || k === 'j') { if (!this.codes['KeyQ']) this.keys['q'] = false; }
                        if (code === 'KeyK' || k === 'k') { if (!this.codes['KeyE']) this.keys['e'] = false; }
                        if (code === 'KeyL' || k === 'l') { if (!this.codes['KeyR']) this.keys['r'] = false; }
                    }
                });

                window.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
                window.addEventListener('mousedown', () => this.mouse.down = true);
                window.addEventListener('mouseup',   () => this.mouse.down = false);

                window.addEventListener('blur', () => {
                    this.keys = {};
                    this.codes = {};
                    this.actions = {};
                    this.mouse.down = false;
                });
                window.addEventListener('focus', () => {
                    this.keys = {};
                    this.codes = {};
                    this.actions = {};
                });
            }
        };

        const WaveManager = {
            wave: 1, finalWave: 20, enemiesRemainingToSpawn: 0, spawnTimer: 0, active: false, isBossWave: false, bossSpawned: false,
            scaling: null,
            computeScaling() {
                const w = this.wave | 0;
                const t = Math.max(0, w - 1);
                let hpMult = Math.min(4.0, 1 + 0.12 * t);
                let dmgMult = Math.min(3.0, 1 + 0.08 * t);
                const speedMult = Math.min(1.8, 1 + 0.02 * t);
                const fireRateMult = Math.min(1.8, 1 + 0.015 * t);

                const spawnInterval = Math.max(22, 60 - w * 2);
                const _baseSpawnCount = Math.min(60, 3 + Math.floor(w * 2) + Math.floor(w * w * 0.08));
                const _pCount = (typeof Game !== 'undefined' && Game.players && Game.players.length >= 2) ? 2 : 1;
                const spawnCount = (_pCount >= 2) ? Math.min(90, _baseSpawnCount * 2) : _baseSpawnCount;

                let bossHpMult = 1 + (w / 8);
                const bossDmgMult = 1 + (w / 12);



                // 2P balancing (anti-overpowered late game): monsters & boss tankier, monsters hit a bit harder
                const is2P = (_pCount >= 2);
                if (is2P) {
                    hpMult *= 1.35;
                    bossHpMult *= 1.8;
                    dmgMult *= 1.2;
                }

                return { hpMult, dmgMult, speedMult, fireRateMult, spawnInterval, spawnCount, bossHpMult, bossDmgMult };
            },
            startWave() {
                this.active = true; this.bossSpawned = false; this.isBossWave = (this.wave % 5 === 0); this.scaling = this.computeScaling(); Game.generateObstacles();
                // Co-op: revive at wave start while keeping inventory and shop buffs.
                const __players = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                const __alive = (__players && __players.length) ? (__players.find(p => p && p.hp > 0) || null) : null;
                const __anchor = __alive || ((__players && __players.length) ? __players[0] : null);
                const __skipReviveOnce = !!(Game && Game.__skipCoopReviveOnce);
                if (Game && Game.__skipCoopReviveOnce) Game.__skipCoopReviveOnce = false;
                if (__players && __players.length >= 2 && __alive && !__skipReviveOnce) {
                    const __hpPct = Math.max(0, Math.min(1, (__alive.hp || 0) / Math.max(1, (__alive.maxHp || 1))));
                    let __rev = 0;
                    for (let __i = 0; __i < __players.length; __i++) {
                        const __pl = __players[__i];
                        if (!__pl) continue;
                        if (__pl.hp <= 0) {
                            __pl.hp = Math.max(1, Math.round((__pl.maxHp || 100) * __hpPct)); __pl.__noCollide = false;
                            __pl.isStealth = false;
                            if (__pl.dash) __pl.dash.active = false;
                            if (__pl.ram) __pl.ram.active = false;
                            // Reset auto-aim cache to reacquire targets cleanly.
                            if (__pl.__autoAim) { __pl.__autoAim.target = null; __pl.__autoAim.candidates = []; __pl.__autoAim.idx = 0; __pl.__autoAim.nextScan = 0; }
                            __pl.__easyTarget = null;

                            // spawn near the first alive player (anchor)
                            const __off = (__i === 0 ? -1 : 1) * 55;
                            const __r = (__pl.radius || 22);
                            __pl.x = Math.max(__r, Math.min(WORLD_WIDTH - __r, (__anchor.x + __off)));
                            __pl.y = Math.max(__r, Math.min(WORLD_HEIGHT - __r, (__anchor.y + 55)));
                            __rev++;
                        }
                    }
                    if (__rev > 0) createDamageText(__anchor.x, __anchor.y - 110, "REVIVE!", "#00ff88");
                }

                if (this.isBossWave) { this.enemiesRemainingToSpawn = 1; createDamageText((__anchor||Game.player).x, (__anchor||Game.player).y - 100, "BOSS BATTLE!", "#D50000"); setElDisplay('bossHealthContainer', 'block'); } 
                else { const count = (this.scaling ? this.scaling.spawnCount : (3 + Math.floor(this.wave * 1.5))); this.enemiesRemainingToSpawn = count; setElDisplay('bossHealthContainer', 'none'); }
                Game.ui.updateWave(this.wave);
            },
            update() {
                if (!this.active) return;
                if (this.enemiesRemainingToSpawn > 0) {
                    this.spawnTimer++;
                    if (this.spawnTimer > (this.scaling ? this.scaling.spawnInterval : 60)) {
                        this.spawnEnemy();
                        this.spawnTimer = 0;
                        this.enemiesRemainingToSpawn--;
                    }
                } else if (Game.enemies.length === 0) {
                    this.active = false;

                    if (!Game.endlessMode && this.isBossWave && (this.wave >= (this.finalWave || 20))) {
                        try { if (Game.player) createDamageText(Game.player.x, Game.player.y - 50, "CHIẾN THẮNG!", "#4CAF50"); } catch(e){}
                        if (Game && typeof Game.victory === 'function') Game.victory();
                        return;
                    }

                    try { if (this.wave >= ASSASSIN_UNLOCK_WAVE) unlockAssassin('wave20'); } catch(e){}
                    this.wave++;
                    try {
                        const __ps = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                        let __a = null;
                        for (const __p of __ps) { if (__p && __p.hp > 0) { __a = __p; break; } }
                        __a = __a || __ps[0] || Game.player;
                        if (__a) createDamageText(__a.x, __a.y - 50, "WAVE COMPLETE!", "#FFD700");
                    } catch(e){}
                    Shop.show(this.wave, Game.gold, () => {
                        this.startWave();
                        const __ps2 = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                        for (const __p of __ps2) {
                            if (__p && __p.hp > 0 && typeof __p.heal === 'function') __p.heal(__p.maxHp * 0.3);
                        }
                    });
}
            },
            spawnEnemy() {
                let typeKey; if (this.isBossWave) { typeKey = 'BOSS'; } else { const pool = ['RED']; if (this.wave >= 2) pool.push('YELLOW'); if (this.wave >= 3) pool.push('YELLOW', 'BLACK'); if (this.wave >= 4) pool.push('BLACK', 'BLACK', 'PURPLE'); if (this.wave >= 5) pool.push('PURPLE', 'PURPLE'); typeKey = pool[Math.floor(Math.random() * pool.length)]; }
                let x, y, valid = false; let attempts = 0;
                while (!valid && attempts < 50) {
                    const edge = Math.floor(Math.random() * 4); const buffer = 100;
                    switch(edge) { case 0: x = Camera.x + Math.random() * canvas.width; y = Camera.y - buffer; break; case 1: x = Camera.x + canvas.width + buffer; y = Camera.y + Math.random() * canvas.height; break; case 2: x = Camera.x + Math.random() * canvas.width; y = Camera.y + canvas.height + buffer; break; case 3: x = Camera.x - buffer; y = Camera.y + Math.random() * canvas.height; break; }
                    x = Math.max(100, Math.min(WORLD_WIDTH - 100, x)); y = Math.max(100, Math.min(WORLD_HEIGHT - 100, y));
                    let hitObs = false; for(let obs of Game.obstacles) { if (checkCircleRect({x, y, radius: 80}, obs)) { hitObs = true; break; } }
                    if (!hitObs) valid = true; attempts++;
                }
                if (valid) { const sc = this.scaling || this.computeScaling(); const hpMult = this.isBossWave ? sc.bossHpMult : sc.hpMult; const dmgMult = this.isBossWave ? sc.bossDmgMult : sc.dmgMult; const speedMult = sc.speedMult; const fireRateMult = sc.fireRateMult; Game.enemies.push(new Enemy(x, y, typeKey, hpMult, dmgMult, speedMult, fireRateMult)); }
            }
        };

        // Shop manager between waves.
        const Shop = {
            open: false,
            onContinue: null,
            els: {
                modal: null,
                gold: null,
                nextWave: null,
                btnContinue: null,

                btnBuyMaxHp: null,
                maxHpCost: null,
                maxHpLevel: null,

                btnBuyDmg: null,
                dmgCost: null,
                dmgLevel: null,

                btnBuyFireRate: null,
                fireRateCost: null,
                fireRateLevel: null,

                btnBuySpeed: null,
                speedCost: null,
                speedLevel: null,

                btnBuyMagnet: null,
                magnetCost: null,
                magnetLevel: null,

                btnBuyArmor: null,
                armorCost: null,
                armorLevel: null,

                btnBuyHeal30: null,
                heal30Cost: null,
            },
            init() {
                this.els.modal = document.getElementById('shopModal');
                this.els.gold = document.getElementById('shopGold');
                this.els.nextWave = document.getElementById('shopNextWave');
                this.els.btnContinue = document.getElementById('btnShopContinue');

                
                
                this.cards = [];
                const grid = document.getElementById('shopCards');
                if (grid) {
                    const cards = Array.from(grid.querySelectorAll('.shopCard'));
                    for (const card of cards) {
                        const btn = card.querySelector('button[id^="btnBuy"]');
                        if (!btn) continue;
                        card.dataset.upKey = btn.id;
                        if (card.dataset && card.dataset.fixed === "1") {
                            // Fixed card: always visible, not randomized.
                        } else {
                            this.cards.push(card);
                        }
                    }
                }

                this._shuffle = (arr) => {
                    for (let i = arr.length - 1; i > 0; i--) {
                        const j = (Math.random() * (i + 1)) | 0;
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                    }
                    return arr;
                };

this.els.btnBuyMaxHp = document.getElementById('btnBuyMaxHp');
                this.els.maxHpCost = document.getElementById('upMaxHpCost');
                this.els.maxHpLevel = document.getElementById('upMaxHpLevel');

                
                this.els.btnBuyDmg = document.getElementById('btnBuyDmg');
                this.els.dmgCost = document.getElementById('upDmgCost');
                this.els.dmgLevel = document.getElementById('upDmgLevel');

                
                this.els.btnBuyFireRate = document.getElementById('btnBuyFireRate');
                this.els.fireRateCost = document.getElementById('upFireRateCost');
                this.els.fireRateLevel = document.getElementById('upFireRateLevel');

                this.els.btnBuySpeed = document.getElementById('btnBuySpeed');
                this.els.speedCost = document.getElementById('upSpeedCost');
                this.els.speedLevel = document.getElementById('upSpeedLevel');

                

                this.els.btnBuyMagnet = document.getElementById('btnBuyMagnet');
                this.els.magnetCost = document.getElementById('upMagnetCost');
                this.els.magnetLevel = document.getElementById('upMagnetLevel');
                if (this.els.btnBuyMagnet) {
                    this.els.btnBuyMagnet.addEventListener('click', () => this.buyMagnet());
                }

                this.els.btnBuyArmor = document.getElementById('btnBuyArmor');
                this.els.armorCost = document.getElementById('upArmorCost');
                this.els.armorLevel = document.getElementById('upArmorLevel');
                if (this.els.btnBuyArmor) {
                    this.els.btnBuyArmor.addEventListener('click', () => this.buyArmor());
                }

this.els.btnBuyHeal30 = document.getElementById('btnBuyHeal30');
this.els.heal30Cost = document.getElementById('upHeal30Cost');
if (this.els.heal30Cost) this.els.heal30Cost.textContent = "200";
if (this.els.btnBuyHeal30) {
    this.els.btnBuyHeal30.addEventListener('click', () => this.buyHeal());
}

if (this.els.btnBuyFireRate) {
                    this.els.btnBuyFireRate.addEventListener('click', () => this.buyFireRate());
                }

if (this.els.btnBuySpeed) {
                    this.els.btnBuySpeed.addEventListener('click', () => this.buySpeed());
                }

if (this.els.btnBuyDmg) {
                    this.els.btnBuyDmg.addEventListener('click', () => this.buyDmg());
                }

if (this.els.btnBuyMaxHp) {
                    this.els.btnBuyMaxHp.addEventListener('click', () => this.buyMaxHp());
                }

if (this.els.btnContinue) {
                    this.els.btnContinue.addEventListener('click', () => this.continue());
                }

                window.addEventListener('keydown', (e) => {
                    if (!this.open) return;
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.continue();
                    }
                });
            },
            show(nextWaveNum, gold, cb) {
                this.open = true;
                this.onContinue = cb || null;
                if (this.els.gold) this.els.gold.textContent = String(gold || 0);
                if (this.els.nextWave) this.els.nextWave.textContent = String(nextWaveNum || 1);
                if (this.els.modal) this.els.modal.classList.remove('hidden');
                Game.paused = true;
            
                this.randomizeChoices();
                this.refresh();
            },
            _apply2PCost(cost) {
                const is2P = (typeof Game !== 'undefined' && Game.players && Game.players.length >= 2);
                if (!is2P) return cost;

                // 2P: raise costs because upgrades affect both players.
                // Round to nearest 10 for cleaner pricing.
                let newCost = cost * 1.7;
                return Math.round(newCost / 10) * 10;
            },
            maxHpCostForLevel(lv) {
                lv = Math.max(0, lv|0);
                // Standard level-based price scaling.
                const cost = 50 + (40 * lv) + (5 * lv * (lv - 1));
                return this._apply2PCost(cost);
            },
            dmgCostForLevel(lv) {
                lv = Math.max(0, lv|0);
                // Standard level-based price scaling.
                const cost = 50 + (40 * lv) + (5 * lv * (lv - 1));
                return this._apply2PCost(cost);
            },
            fireRateCostForLevel(lv) {
                lv = Math.max(0, lv|0);
                // Fire Rate is very strong, so scale its price more aggressively.
                const cost = 90 + (70 * lv) + (10 * lv * lv);
                return this._apply2PCost(cost);
            },
            
            speedCostForLevel(lv) {
                lv = Math.max(0, lv|0);
                // Cheap support: encourage early movement upgrades
                const cost = 30 + (25 * lv) + (5 * lv * lv);
                return this._apply2PCost(cost);
            },

            magnetCostForLevel(lv) {
                lv = Math.max(0, lv|0);
                // Cheap support: encourage early quality-of-life upgrades
                const cost = 30 + (25 * lv) + (5 * lv * lv);
                return this._apply2PCost(cost);
            },
            armorCostForLevel(lv) {
                lv = Math.max(0, lv|0);
                // Premium: survivability scaling, keep it expensive
                const cost = 80 + (60 * lv) + (10 * lv * lv);
                return this._apply2PCost(cost);
            },
            isFireRateCapped(lvOverride = null) {
                const frMax = getFireRateMaxLv();
                const lv = (lvOverride !== null) ? (lvOverride|0) : ((Game.upgrades && Game.upgrades.fireRateLv) ? (Game.upgrades.fireRateLv|0) : 0);
                return lv >= frMax;
            },

            isUpgradeMaxed(upKey) {
                if (upKey === 'btnBuyArmor') {
                    const lv = (Game.upgrades && Game.upgrades.armorLv) ? (Game.upgrades.armorLv|0) : 0;
                    return lv >= 12;
                }
                if (upKey === 'btnBuySpeed') {
                    const lv = (Game.upgrades && typeof Game.upgrades.speedLv === 'number') ? (Game.upgrades.speedLv|0) : 0;
                    return lv >= 12;
                }
                if (upKey === 'btnBuyFireRate') { return this.isFireRateCapped(); }
                return false;
            },


            randomizeChoices() {
                if (!this.cards || this.cards.length === 0) return;

                let pool = this.cards.filter(c => !this.isUpgradeMaxed(c.dataset.upKey));
                if (pool.length === 0) pool = this.cards.slice();
                this._shuffle(pool);

                const pickN = Math.min(3, pool.length);
                const chosen = new Set();
                for (let i = 0; i < pickN; i++) chosen.add(pool[i].dataset.upKey);

                for (const c of this.cards) {
                    const show = chosen.has(c.dataset.upKey);
                    c.style.display = show ? "block" : "none";
                }
            },

            refresh() {
                // Update gold in header
                if (this.els.gold) this.els.gold.textContent = String(Game.gold || 0);

                // Max HP
                const hpLv = (Game.upgrades && Game.upgrades.maxHpLv) ? Game.upgrades.maxHpLv : 0;
                const hpCost = this.maxHpCostForLevel(hpLv);
                if (this.els.maxHpLevel) this.els.maxHpLevel.textContent = String(hpLv);
                if (this.els.maxHpCost) this.els.maxHpCost.textContent = String(hpCost);
                if (this.els.btnBuyMaxHp) {
                    const can = (Game.gold >= hpCost) && this._anyAlive();
                    this.els.btnBuyMaxHp.disabled = !can;
                    this.els.btnBuyMaxHp.style.opacity = can ? "1" : "0.55";
                    this.els.btnBuyMaxHp.style.cursor = can ? "pointer" : "not-allowed";
                }

                // Damage %
                const dmgLv = (Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0;
                const dmgCost = this.dmgCostForLevel(dmgLv);
                if (this.els.dmgLevel) this.els.dmgLevel.textContent = String(dmgLv);
                if (this.els.dmgCost) this.els.dmgCost.textContent = String(dmgCost);
                if (this.els.btnBuyDmg) {
                    const can = (Game.gold >= dmgCost) && this._anyAlive();
                    this.els.btnBuyDmg.disabled = !can;
                    this.els.btnBuyDmg.style.opacity = can ? "1" : "0.55";
                    this.els.btnBuyDmg.style.cursor = can ? "pointer" : "not-allowed";
                }

                // Fire Rate (-5% cooldown)
                const frMax = getFireRateMaxLv();
                let frLv = (Game.upgrades && Game.upgrades.fireRateLv) ? Game.upgrades.fireRateLv : 0;
                if (Game.upgrades && Game.upgrades.fireRateLv > frMax) { Game.upgrades.fireRateLv = frMax; frLv = frMax; }
                const frCost = this.fireRateCostForLevel(frLv);
                const frCapped = (frLv >= frMax);
                if (this.els.fireRateLevel) this.els.fireRateLevel.textContent = String(frLv);
                if (this.els.fireRateCost) this.els.fireRateCost.textContent = String(frCost);
                if (this.els.btnBuyFireRate) {
                    const can = (!frCapped) && (Game.gold >= frCost) && this._anyAlive();
                    this.els.btnBuyFireRate.disabled = !can || frCapped;
                    this.els.btnBuyFireRate.style.opacity = can ? "1" : "0.55";
                    this.els.btnBuyFireRate.style.cursor = can ? "pointer" : "not-allowed";
                }

                
                const sLv = (Game.upgrades && typeof Game.upgrades.speedLv === 'number') ? (Game.upgrades.speedLv|0) : 0;
                const sCapped = sLv >= 12;
                const sCost = this.speedCostForLevel(sLv);
                if (this.els.speedLevel) this.els.speedLevel.textContent = sCapped ? "MAX" : String(sLv);
                if (this.els.speedCost) this.els.speedCost.textContent = sCapped ? "-" : String(sCost);
                if (this.els.btnBuySpeed) {
                    const can = (!sCapped) && (Game.gold >= sCost) && this._anyAlive();
                    this.els.btnBuySpeed.disabled = !can || sCapped;
                    this.els.btnBuySpeed.style.opacity = can ? "1" : "0.55";
                    this.els.btnBuySpeed.style.cursor = can ? "pointer" : "not-allowed";
                }

// Pickup Range (+30px magnet range)
                const mLv = (Game.upgrades && Game.upgrades.magnetLv) ? Game.upgrades.magnetLv : 0;
                const mCost = this.magnetCostForLevel(mLv);
                if (this.els.magnetLevel) this.els.magnetLevel.textContent = String(mLv);
                if (this.els.magnetCost) this.els.magnetCost.textContent = String(mCost);
                if (this.els.btnBuyMagnet) {
                    const can = (Game.gold >= mCost) && this._anyAlive();
                    this.els.btnBuyMagnet.disabled = !can;
                    this.els.btnBuyMagnet.style.opacity = can ? "1" : "0.55";
                    this.els.btnBuyMagnet.style.cursor = can ? "pointer" : "not-allowed";
                }

                // Armor (-5% damage taken)
                const aLv = (Game.upgrades && Game.upgrades.armorLv) ? Game.upgrades.armorLv : 0;
                const aCost = this.armorCostForLevel(aLv);
                const armorCapped = (aLv >= 12);
                if (this.els.armorLevel) this.els.armorLevel.textContent = String(aLv);
                if (this.els.armorCost) this.els.armorCost.textContent = String(aCost);
                if (this.els.btnBuyArmor) {
                    const can = (!armorCapped) && (Game.gold >= aCost) && this._anyAlive();
                    this.els.btnBuyArmor.disabled = !can || armorCapped;
                    this.els.btnBuyArmor.style.opacity = can ? "1" : "0.55";
                    this.els.btnBuyArmor.style.cursor = can ? "pointer" : "not-allowed";
                }
            

// Heal 30% (consumable)
const healCost = 200;
if (this.els.heal30Cost) this.els.heal30Cost.textContent = String(healCost);
if (this.els.btnBuyHeal30) {
    const can = (Game.gold >= healCost) && this._anyAlive() && this._anyNeedHeal();
    this.els.btnBuyHeal30.disabled = !can;
    this.els.btnBuyHeal30.style.opacity = can ? "1" : "0.55";
    this.els.btnBuyHeal30.style.cursor = can ? "pointer" : "not-allowed";
}

},
            
            // === Co-op Shop Helpers (shared gold/buffs) ===
            _playersList() {
                try {
                    if (typeof Game !== 'undefined' && Game && Array.isArray(Game.players) && Game.players.length) return Game.players;
                } catch (e) {}
                return (typeof Game !== 'undefined' && Game && Game.player) ? [Game.player] : [];
            },
            _anyAlive() {
                const ps = this._playersList();
                for (const p of ps) { if (p && typeof p.hp === 'number' && p.hp > 0) return true; }
                return false;
            },

_anyNeedHeal() {
    const ps = this._playersList();
    for (const p of ps) {
        if (!p || typeof p.hp !== 'number' || typeof p.maxHp !== 'number') continue;
        if (p.hp > 0 && p.hp < (p.maxHp - 0.5)) return true;
    }
    return false;
},


            _anchorPlayer() {
                const ps = this._playersList();
                for (const p of ps) { if (p && typeof p.hp === 'number' && p.hp > 0) return p; }
                return ps[0] || (typeof Game !== 'undefined' && Game ? Game.player : null) || null;
            },
            _forEachPlayer(fn) {
                const ps = this._playersList();
                for (const p of ps) { if (p) { try { fn(p); } catch (e) {} } }
            },
buyMaxHp() {
                if (!this.open) return;
                const anchor = this._anchorPlayer();
                if (!anchor) return;

                const lv = (Game.upgrades && Game.upgrades.maxHpLv) ? Game.upgrades.maxHpLv : 0;
                const cost = this.maxHpCostForLevel(lv);

                if (Game.gold < cost) {
                    createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
                    return;
                }

                Game.gold -= cost;
                Game.ui.updateGold(Game.gold);

                Game.upgrades.maxHpLv = lv + 1;

                // Balance: linear scaling +25% of base per level.
                const pctPerLevel = 0.25; // +25% of base HP each level

                this._forEachPlayer((p) => {
                    // If no baseMaxHp (older save), fallback to current maxHp as base
                    if (!p.__baseMaxHp) p.__baseMaxHp = p.maxHp;

                    const base = p.__baseMaxHp;
                    const oldMax = p.maxHp;

                    // Formula: base * (1 + level * 0.25)
                    p.maxHp = Math.floor(base * (1 + (Game.upgrades.maxHpLv|0) * pctPerLevel));

                    // Keep current HP ratio (do not revive if dead)
                    if (p.hp > 0) {
                        const ratio = p.hp / oldMax;
                        p.hp = Math.floor(p.maxHp * ratio);
                    }
                });

                // Update HUD (2P aware)
                try {
                    const __pidPrevHUD = Game.__uiPid;
                    if (Game.player && Game.ui && Game.ui.updateHealth) { Game.__uiPid = 1; Game.ui.updateHealth(Game.player.hp, Game.player.maxHp); }
                    if (Game.player2 && Game.ui && Game.ui.updateHealth) { Game.__uiPid = 2; Game.ui.updateHealth(Game.player2.hp, Game.player2.maxHp); }
                    Game.__uiPid = __pidPrevHUD;
                } catch(e){}

                createDamageText(anchor.x, anchor.y - 45, "MAX HP UP!", "#FFD700");
                try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){};
                this.refresh();
            },
            buyDmg() {
                if (!this.open) return;
                const anchor = this._anchorPlayer();
                if (!anchor) return;

                const lv = (Game.upgrades && Game.upgrades.dmgLv) ? Game.upgrades.dmgLv : 0;
                const cost = this.dmgCostForLevel(lv);

                if (Game.gold < cost) {
                    createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
                    return;
                }

                // Pay
                Game.gold -= cost;
                Game.ui.updateGold(Game.gold);

                // Apply
                Game.upgrades.dmgLv = lv + 1;

                createDamageText(anchor.x, anchor.y - 45, "DMG +10%", "#FFD700");
                try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}

                this.refresh();
            },
            buyFireRate() {
                if (!this.open) return;
                const anchor = this._anchorPlayer();
                if (!anchor) return;

                const lv = (Game.upgrades && Game.upgrades.fireRateLv) ? Game.upgrades.fireRateLv : 0;
                                const frMax = getFireRateMaxLv();
                if (lv >= frMax) { createDamageText(anchor.x, anchor.y - 45, 'CD MAX', '#FFD700'); return; }
const cost = this.fireRateCostForLevel(lv);

                if (Game.gold < cost) {
                    createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
                    return;
                }

                // Pay
                Game.gold -= cost;
                Game.ui.updateGold(Game.gold);

                // Apply
                Game.upgrades.fireRateLv = lv + 1;

                createDamageText(anchor.x, anchor.y - 45, "CD -5%", "#FFD700");
                try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}

                this.refresh();
            },
            buySpeed() {
                if (!this.open) return;
                const anchor = this._anchorPlayer();
                if (!anchor) return;

                const lv = (Game.upgrades && typeof Game.upgrades.speedLv === 'number') ? (Game.upgrades.speedLv|0) : 0;
                if (lv >= 12) {
                    createDamageText(anchor.x, anchor.y - 45, "MAX", "#FFD700");
                    return;
                }
                const cost = this.speedCostForLevel(lv);

                if (Game.gold < cost) {
                    createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
                    return;
                }

                Game.gold -= cost;
                Game.ui.updateGold(Game.gold);

                Game.upgrades.speedLv = lv + 1;

                createDamageText(anchor.x, anchor.y - 45, "SPEED +5%", "#FFD700");
                try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}
                this.refresh();
            },


            buyMagnet() {
                if (!this.open) return;
                const anchor = this._anchorPlayer();
                if (!anchor) return;

                const lv = (Game.upgrades && Game.upgrades.magnetLv) ? Game.upgrades.magnetLv : 0;
                const cost = this.magnetCostForLevel(lv);
                if (Game.gold < cost) {
                    createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
                    return;
                }

                Game.gold -= cost;
                Game.ui.updateGold(Game.gold);

                Game.upgrades.magnetLv = lv + 1;

                createDamageText(anchor.x, anchor.y - 45, "MAGNET +30px", "#FFD700");
                try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}
                this.refresh();
            },

            buyArmor() {
                if (!this.open) return;
                const anchor = this._anchorPlayer();
                if (!anchor) return;

                const lv = (Game.upgrades && Game.upgrades.armorLv) ? Game.upgrades.armorLv : 0;
                                if (lv >= 12) { createDamageText(anchor.x, anchor.y - 45, 'ARMOR MAX', '#FFD700'); return; }
const cost = this.armorCostForLevel(lv);
                if (Game.gold < cost) {
                    createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
                    return;
                }

                Game.gold -= cost;
                Game.ui.updateGold(Game.gold);

                Game.upgrades.armorLv = lv + 1;

                createDamageText(anchor.x, anchor.y - 45, "ARMOR -5%", "#FFD700");
                try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}
                this.refresh();
            },

buyHeal() {
    if (!this.open) return;
    const anchor = this._anchorPlayer();
    if (!anchor) return;

    const cost = 200;
    if (!this._anyAlive()) return;

    // Prevent wasting gold if everyone alive is already full HP
    if (!this._anyNeedHeal()) {
        createDamageText(anchor.x, anchor.y - 45, "HP FULL", "#FFD700");
        this.refresh();
        return;
    }

    if (Game.gold < cost) {
        createDamageText(anchor.x, anchor.y - 45, "NOT ENOUGH GOLD", "#FFD700");
        return;
    }

    Game.gold -= cost;
    try { if (Game.ui && Game.ui.updateGold) Game.ui.updateGold(Game.gold); } catch(e){}

    // Heal 30% maxHP for each alive player (no revive)
    this._forEachPlayer((p) => {
        if (!p || typeof p.hp !== 'number' || typeof p.maxHp !== 'number') return;
        if (p.hp <= 0) return;
        const amt = p.maxHp * 0.3;
        if (typeof p.heal === 'function') p.heal(amt);
        else p.hp = Math.min(p.maxHp, p.hp + amt);
    });

    createDamageText(anchor.x, anchor.y - 55, "HEAL +30%", "#4CAF50");
    try { if (typeof MAX !== 'undefined' && MAX.Audio && MAX.Audio.ting) MAX.Audio.ting(); } catch(e){}
    this.refresh();
},



            hide() {
                this.open = false;
                this.onContinue = null;
                if (this.els.modal) this.els.modal.classList.add('hidden');
            },
            continue() {
                if (!this.open) return;
                const cb = this.onContinue;
                this.hide();
                Game.paused = false;
                // reset fps cap timer to avoid stutter after pause
                Game._fpsCapLast = performance.now();
                if (typeof cb === 'function') cb();
            }
        };

        // Phase 3 kickoff: expose engine singletons via window/App namespace.
        try {
            const __app = window.App || (window.App = {});
            __app.runtime = __app.runtime || {};
            __app.state = __app.state || {};
            __app.ui = __app.ui || {};
            __app.runtime.Camera = Camera;
            __app.runtime.Input = Input;
            __app.runtime.WaveManager = WaveManager;
            __app.runtime.Shop = Shop;
            __app.runtime.Enemy = Enemy;
            __app.state.camera = Camera;
            __app.state.input = Input;
            __app.state.waveManager = WaveManager;
            __app.ui.shop = Shop;
            window.Camera = Camera;
            window.Input = Input;
            window.WaveManager = WaveManager;
            window.Shop = Shop;
            window.Enemy = Enemy;
        } catch (e) {}

