// Auto-extracted from original HTML
import { createDamageText } from '../utils.js';

// Module-scope injection (avoid importing Game)
let Game = null;
export function setAdminContext(game) { Game = game; }

export const Admin = {
    modal: null, panel: null, input: null, msg: null,
    prevPaused: false,
    init() {
        this.modal = document.getElementById('adminCodeModal');
        this.panel = document.getElementById('adminCodePanel');
        this.input = document.getElementById('adminCodeInput');
        this.msg = document.getElementById('adminCodeMsg');
        if (!this.modal || !this.input) return;

        // Click outside to close
        this.modal.addEventListener('mousedown', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Enter to submit
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.run(this.input.value);
            } else if (e.key === 'Escape') {
                e.preventDefault();
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
                // Full ammo upgrade to Lv.5 (replaces old C)
                if (Game.player && typeof Game.player.activateCheat === 'function') {
                    Game.player.activateCheat();
                    this.msg.textContent = 'OK';
                } else {
                    this.msg.textContent = 'Chưa vào game.';
                    return;
                }
                this.close();
                return;
            }

            if (code === 'cuongvang') {
                // +100.000 gold (replaces old V)
                Game.gold = (Game.gold || 0) + 100000;
                if (Game.player) createDamageText(Game.player.x, Game.player.y - 45, "+100000G", "#FFD700");
                this.msg.textContent = 'OK';
                this.close();
                return;
            }


            // --- Jump to any wave: wave15, wave20... ---
            const mWave = code.match(/^wave(\d+)$/);
            if (mWave) {
                const targetWave = Math.max(1, parseInt(mWave[1], 10) || 1);
                const WM = globalThis.WaveManager;
                if (!Game || !Game.player || !WM) {
                    this.msg.textContent = 'Chưa vào game.';
                    return;
                }

                // Close shop defensively (jump wave should resume gameplay)
                try {
                    const shop = document.getElementById('shopModal');
                    if (shop) shop.classList.add('hidden');
                    if (globalThis.Shop) globalThis.Shop.open = false;
                } catch (e) {}

                // Clear current combat objects to avoid leftover bullets/enemies
                try {
                    Game.enemies = [];
                    Game.projectiles = [];
                    Game.particles = [];
                    Game.pickups = [];
                    Game.coins = [];
                    Game.texts = [];
                    Game.clones = [];
                    Game.turrets = [];
                    Game.bossMines = [];
                } catch (e) {}

                // Reset wave state and start
                WM.wave = targetWave;
                WM.active = false;
                WM.spawnTimer = 0;
                WM.enemiesRemainingToSpawn = 0;
                WM.isBossWave = false;
                WM.bossSpawned = false;
                WM.scaling = null;

                try { createDamageText(Game.player.x, Game.player.y - 70, 'WAVE ' + targetWave, '#00E5FF'); } catch (e) {}

                try { WM.startWave(); } catch (e) {}

                this.msg.textContent = 'OK';
                // Force resume after closing modal (even if it was opened while Shop paused the game)
                this.prevPaused = false;
                this.close();
                return;
            }
            this.msg.textContent = 'Sai code.';
        } catch (err) {
            this.msg.textContent = 'Lỗi.';
        }
    },
    // Capture keys so typing doesn't control the tank
    captureKey(e) {
        // Open combo (hidden): Ctrl + Shift + X
        if (!this.isOpen() && e.ctrlKey && e.shiftKey && (e.code === 'KeyX' || e.key === 'X' || e.key === 'x')) {
            e.preventDefault();
            this.open();
            return true;
        }
        // If modal is open: block game controls BUT allow typing into input.
        if (this.isOpen()) {
            // Safety: allow Esc to close even if focus isn't on input
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
                return true;
            }
            // Do NOT preventDefault here, otherwise the input cannot receive characters.
            return true;
        }
        return false;
    }
};
