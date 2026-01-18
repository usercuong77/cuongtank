// Auto-extracted from original HTML
import { Enemy } from '../entities/Enemy.js';
import { Shop } from './Shop.js';
import { createDamageText, checkCircleRect } from '../utils.js';

let Game = null;
export function setWaveManagerContext(game) { Game = game; }

export const WaveManager = {
    wave: 1, finalWave: 20, enemiesRemainingToSpawn: 0, spawnTimer: 0, active: false, isBossWave: false, bossSpawned: false,
    scaling: null,
    computeScaling() {
        const w = this.wave | 0;
        const t = Math.max(0, w - 1);
        // NOTE: Linear scaling + caps để game không vỡ
        const hpMult = Math.min(4.0, 1 + 0.12 * t);
        const dmgMult = Math.min(3.0, 1 + 0.08 * t);
        const speedMult = Math.min(1.8, 1 + 0.02 * t);
        const fireRateMult = Math.min(1.8, 1 + 0.015 * t); // >1 nghĩa là bắn nhanh hơn

        const spawnInterval = Math.max(22, 60 - w * 2);
        const spawnCount = Math.min(60, 3 + Math.floor(w * 2) + Math.floor(w * w * 0.08));

        // Boss scale nhẹ hơn để không one-shot
        const bossHpMult = 1 + (w / 8);
        const bossDmgMult = 1 + (w / 12);

        return { hpMult, dmgMult, speedMult, fireRateMult, spawnInterval, spawnCount, bossHpMult, bossDmgMult };
    },
    startWave() {
        this.active = true; this.bossSpawned = false; this.isBossWave = (this.wave % 5 === 0); this.scaling = this.computeScaling(); Game.generateObstacles();
        if (this.isBossWave) { this.enemiesRemainingToSpawn = 1; createDamageText(Game.player.x, Game.player.y - 100, "BOSS BATTLE!", "#D50000"); document.getElementById('bossHealthContainer').style.display = 'block'; } 
        else { const count = (this.scaling ? this.scaling.spawnCount : (3 + Math.floor(this.wave * 1.5))); this.enemiesRemainingToSpawn = count; document.getElementById('bossHealthContainer').style.display = 'none'; }
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

            // Victory: thắng Boss ở finalWave (mặc định 20). Muốn endless thì tăng finalWave.
            if (!Game.endlessMode && this.isBossWave && (this.wave >= (this.finalWave || 20))) {
                try { if (Game.player) createDamageText(Game.player.x, Game.player.y - 50, "CHIẾN THẮNG!", "#4CAF50"); } catch(e){}
                if (Game && typeof Game.victory === 'function') Game.victory();
                return;
            }

            this.wave++;
            try { if (Game.player) createDamageText(Game.player.x, Game.player.y - 50, "WAVE COMPLETE!", "#FFD700"); } catch(e){}
            Shop.show(this.wave, Game.gold, () => {
                this.startWave();
                if (Game.player) Game.player.heal(50);
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

// --- SHOP MANAGER (Wave Complete -> Shop) ---
