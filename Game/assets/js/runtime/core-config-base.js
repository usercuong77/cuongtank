// === Runtime Module: Core Boot + MAX Services ===
const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        

        // === MAX Services (settings/save/audio/pause/fps) ===
        const MAX = (() => {
            const SAVE_KEY = "tank_battle_max_save_v1";

            const defaultSave = {
                bestScore: 0,
                bestWave: 0,
                settings: {
                    volume: 1.0,
                    musicVolume: 0.3,
                    fpsCap: 120,
                    shake: true,
                    minimap: true,
                    fps: true,
                    autoSave: true,
                    aimAssist: true
                }
            };

            const Storage = {
                load() {
                    try {
                        const raw = localStorage.getItem(SAVE_KEY);
                        if (!raw) return structuredClone(defaultSave);
                        const data = JSON.parse(raw);
                        return {
                            ...structuredClone(defaultSave),
                            ...data,
                            settings: { ...structuredClone(defaultSave.settings), ...(data.settings || {}) }
                        };
                    } catch (e) {
                        console.warn("Save load failed:", e);
                        return structuredClone(defaultSave);
                    }
                },
                save(saveObj) {
                    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveObj)); }
                    catch (e) { console.warn("Save write failed:", e); }
                },
                reset() { localStorage.removeItem(SAVE_KEY); }
            };

            // Lightweight WebAudio synth, no external files required.
            const Audio = {
                ctx: null,
                master: null,
                enabled: true,
                init() {
                this.paused = false;
                    if (this.ctx) return;
                    try {
                        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                        this.master = this.ctx.createGain();
                        this.master.gain.value = 0.8;
                        this.master.connect(this.ctx.destination);
                    } catch (e) {
                        console.warn("Audio disabled:", e);
                        this.enabled = false;
                    }
                },
                setVolume(v) {
                    if (!this.master) return;
                    this.master.gain.value = Math.max(0, Math.min(1, v));
                },
                ping(freq, dur, type="sine", gain=0.08) {
                    if (!this.enabled) return;
                    this.init();
                    if (!this.ctx) return;
                    const t0 = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const g = this.ctx.createGain();
                    osc.type = type;
                    osc.frequency.value = freq;
                    g.gain.value = gain;
                    osc.connect(g);
                    g.connect(this.master);
                    g.gain.setValueAtTime(gain, t0);
                    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
                    osc.start(t0);
                    osc.stop(t0 + dur);
                },
                shoot() { this.ping(520, 0.06, "square", 0.05); this.ping(260, 0.05, "sine", 0.03); },
                hit()   { this.ping(180, 0.08, "sawtooth", 0.05); },
                boom()  { this.ping(90, 0.18, "sawtooth", 0.08); this.ping(60, 0.22, "square", 0.05); },
                ulti()  { this.ping(140, 0.35, "sawtooth", 0.10); this.ping(70, 0.45, "square", 0.08); },
                ting() { this.ping(1040, 0.08, "sine", 0.06); this.ping(1560, 0.10, "triangle", 0.045); },
                roundStart() {
                    this.ping(520, 0.07, "square", 0.05);
                    setTimeout(() => this.ping(780, 0.07, "square", 0.05), 90);
                    setTimeout(() => this.ping(1040, 0.09, "triangle", 0.05), 180);
                },
                roundWin() {
                    this.ping(660, 0.10, "sine", 0.06);
                    setTimeout(() => this.ping(990, 0.12, "triangle", 0.05), 120);
                },
                matchWin() {
                    this.ping(520, 0.16, "sine", 0.08);
                    setTimeout(() => this.ping(780, 0.16, "sine", 0.07), 120);
                    setTimeout(() => this.ping(1040, 0.20, "triangle", 0.06), 240);
                }
            };

            const State = {
                save: Storage.load(),
                paused: false,
                fps: { last: performance.now(), frames: 0, value: 0 },
                applySettings() {
                    const s = this.save.settings;
                    Audio.setVolume(s.volume);
                                        if (window.BGM && typeof window.BGM.setMusicVolume === "function") { window.BGM.setMusicVolume(s.musicVolume); }
const fpsEl = document.getElementById("fpsCounter");
                    if (fpsEl) fpsEl.classList.toggle("hidden", !s.fps);
                },
                updateBest(score, wave) {
                    let changed = false;
                    if (score > this.save.bestScore) { this.save.bestScore = score; changed = true; }
                    if (wave > this.save.bestWave) { this.save.bestWave = wave; changed = true; }
                    if (changed && this.save.settings.autoSave) Storage.save(this.save);
                    this.syncSettingsUI();
                },
                syncSettingsUI() {
                    const bs = document.getElementById("bestScore");
                    const bw = document.getElementById("bestWave");
                    if (bs) bs.textContent = this.save.bestScore;
                    if (bw) bw.textContent = this.save.bestWave;

                    const s = this.save.settings;
                    const vol = document.getElementById("setVolume");
                    const volVal = document.getElementById("setVolumeVal");
                                        const mv = document.getElementById("setMusicVolume");
                    const mvVal = document.getElementById("setMusicVolumeVal");
const cap = document.getElementById("setFpsCap");
                    const capVal = document.getElementById("setFpsCapVal");
                    const sh = document.getElementById("setShake");
                    const mm = document.getElementById("setMinimap");
                    const fp = document.getElementById("setFps");
                    const as = document.getElementById("setAutoSave");
                    const aa = document.getElementById("setAimAssist");

                    if (vol) vol.value = s.volume;
                    if (volVal) volVal.textContent = Math.round(s.volume * 100) + "%";
                                        if (mv) mv.value = (typeof s.musicVolume === "number" ? s.musicVolume : 0.7);
                    if (mvVal) mvVal.textContent = Math.round((typeof s.musicVolume === "number" ? s.musicVolume : 0.7) * 100) + "%";
if (cap) cap.value = s.fpsCap;
                    if (capVal) capVal.textContent = String(s.fpsCap);
                    if (sh) sh.checked = !!s.shake;
                    if (mm) mm.checked = !!s.minimap;
                    if (fp) fp.checked = !!s.fps;
                    if (as) as.checked = !!s.autoSave;
                    if (aa) aa.checked = (s.aimAssist !== false);
                }
            };

            const UI = {
                init() {
                    // Action button group.
                    const topBar = document.getElementById("maxTopBar");
                    const btnSettings = document.getElementById("btnSettings");
                    const btnClose = document.getElementById("btnCloseSettings");
                    const btnPause = document.getElementById("btnPause");
                    const btnPvpReplay = document.getElementById("btnPvpReplay");
                    const modal = document.getElementById("settingsModal");

                                        const btnSettingsStart = document.getElementById("btnSettingsStart");
const open = () => { if (modal) modal.classList.remove("hidden"); };
                    const close = () => { if (modal) modal.classList.add("hidden"); };

                    if (btnSettings) btnSettings.addEventListener("click", open);
                    if (btnSettingsStart) btnSettingsStart.addEventListener("click", open);
                    if (btnClose) btnClose.addEventListener("click", close);
                    if (btnPause) btnPause.addEventListener("click", () => Toggle.pause());
                    if (btnPvpReplay) btnPvpReplay.addEventListener("click", () => {
                        try {
                            if (typeof Game !== "undefined" && Game && Game.mode === "PVP_DUEL_AIM") {
                                if (typeof window.openPvpLoadoutModal === 'function') window.openPvpLoadoutModal();
                                else if (typeof Game.initPvpRounds === "function") Game.initPvpRounds();
                            }
                        } catch(e){}
                    });

                    // Settings control group.
                    const vol = document.getElementById("setVolume");
                    const mv  = document.getElementById("setMusicVolume");
                    const cap = document.getElementById("setFpsCap");
                    const sh  = document.getElementById("setShake");
                    const mm  = document.getElementById("setMinimap");
                    const fp  = document.getElementById("setFps");
                    const as  = document.getElementById("setAutoSave");
                    const aa  = document.getElementById("setAimAssist");

                    const saveNow = document.getElementById("btnSaveNow");
                    const resetSave = document.getElementById("btnResetSave");

                    if (vol) vol.addEventListener("input", () => {
                        State.save.settings.volume = parseFloat(vol.value);
                        State.applySettings();
                        State.syncSettingsUI();
                        if (State.save.settings.autoSave) Storage.save(State.save);
                    });
                    if (mv) mv.addEventListener("input", () => {
    State.save.settings.musicVolume = parseFloat(mv.value);
    State.applySettings();
    State.syncSettingsUI();
    if (State.save.settings.autoSave) Storage.save(State.save);
});

if (cap) cap.addEventListener("input", () => {
                        const v = parseInt(cap.value, 10);
                        State.save.settings.fpsCap = Math.max(30, Math.min(120, isNaN(v) ? 60 : v));
                        State.syncSettingsUI();
                        if (State.save.settings.autoSave) Storage.save(State.save);
                    });
if (sh) sh.addEventListener("change", () => {
                        State.save.settings.shake = !!sh.checked;
                        State.syncSettingsUI();
                        if (State.save.settings.autoSave) Storage.save(State.save);
                    });
                    if (mm) mm.addEventListener("change", () => {
                        State.save.settings.minimap = !!mm.checked;
                        State.syncSettingsUI();
                        if (State.save.settings.autoSave) Storage.save(State.save);
                    });
                    if (fp) fp.addEventListener("change", () => {
                        State.save.settings.fps = !!fp.checked;
                        State.applySettings();
                        State.syncSettingsUI();
                        if (State.save.settings.autoSave) Storage.save(State.save);
                    });
                    if (as) as.addEventListener("change", () => {
                        State.save.settings.autoSave = !!as.checked;
                        State.syncSettingsUI();
                        Storage.save(State.save);
                    });
                    if (aa) aa.addEventListener("change", () => {
                        State.save.settings.aimAssist = !!aa.checked;
                        State.syncSettingsUI();
                        if (State.save.settings.autoSave) Storage.save(State.save);
                    });

                    if (saveNow) saveNow.addEventListener("click", () => Storage.save(State.save));
                    if (resetSave) resetSave.addEventListener("click", () => { Storage.reset(); State.save = Storage.load(); State.applySettings(); State.syncSettingsUI(); });

                    // Hotkeys (works alongside your Input system)
                    window.addEventListener("keydown", (e) => {
                        const code = e.code || "";
                        const k = (e.key || "").toLowerCase();

                        // ESC toggles Settings (works even when an input keeps focus)
                        if (k === "escape" || code === "Escape") {
                            e.preventDefault();
                            if (modal && !modal.classList.contains("hidden")) close(); else open();
                            return;
                        }

                        // Do not capture gameplay hotkeys while typing in text fields.
                        const tgt = e.target;
                        if (tgt) {
                            const tag = tgt.tagName;
                            const type = (tag === "INPUT" ? (tgt.getAttribute("type") || "").toLowerCase() : "");
                            const textLike = (tag === "TEXTAREA") || tgt.isContentEditable ||
                                             (tag === "INPUT" && ["text","password","search","email","number","tel","url"].includes(type));
                            if (textLike) return;
                        }

                        // Block key-repeat to avoid rapid pause toggling.
                        if (e.repeat) return;

                        // Use e.code so hotkeys remain stable under IME (VietKey/UniKey).
                        if (k === "p" || code === "KeyP") { e.preventDefault(); Toggle.pause(); return; }
                        if (k === "m" || code === "KeyM") { State.save.settings.minimap = !State.save.settings.minimap; State.syncSettingsUI(); if (State.save.settings.autoSave) Storage.save(State.save); return; }
                        if (k === "f" || code === "KeyF") { State.save.settings.fps = !State.save.settings.fps; State.applySettings(); State.syncSettingsUI(); if (State.save.settings.autoSave) Storage.save(State.save); return; }
});
                    // (v30) Start screen stats are shown in left panel (leftStats). No extra DOM injection here.
// Show the top bar only during gameplay.
                    const uiLayer = document.getElementById("gameUI");
                    const updateTop = () => {
                        const inGame = uiLayer && !uiLayer.classList.contains("hidden");
                        if (topBar) topBar.classList.toggle("hidden", !inGame);
                    };
                    setInterval(updateTop, 250);

                    State.applySettings();
                    State.syncSettingsUI();
                }
            };

            const Toggle = {
                pause() {
                    State.paused = !State.paused;
                    if (State.paused) {
                        if (typeof Game !== "undefined") Game.paused = true;
                    } else {
                        if (typeof Game !== "undefined") { Game.paused = false; requestAnimationFrame(loop); }
                    }
                }
            };

            return { State, Storage, Audio, UI, Toggle };
        })();

// === 1) Core Config === // Cấu hình lõi
        const CORE_CONFIG = Object.freeze({
            worldScale: 3,
            minimapSize: 150,
            minimapMargin: 20
        });
        const ASSASSIN_CONFIG = Object.freeze({
            unlockWave: 20,
            unlockCodes: Object.freeze(['cuongdeptrai']),
            skillRangeQ: 520,
            skillRangeE: 650,
            skillRangeR: 900,
            killRefundMs: 1000,
            killRefundWindowMs: 5000,
            killRefundCapMs: 4000,
            bossSkillBonusPct: 0.015,
            bossSkillBonusCap: 3000
        });
        const PVP_CONFIG = Object.freeze({
            aimLeadMaxMs: 390,
            aimLeadFactor: 1.34,
            aimMaxTurn: 0.17,
            easyAutoAimLeadBlend: 0.55,
            coopAutoAimLeadBlend: 0.30,
            autoAimLeadMaxMs: 300,
            skillDamageMult: 0.85,
            hardCcCapMs: 1000,
            hardCcDrWindowMs: 3000,
            hardCcDrMult: 0.60,
            skillGlobalLockoutMs: 300,
            loadoutStorageKey: 'tankPvpLoadout_v1',
            passive: Object.freeze({
                defaultHitsReq: 5,
                defaultSlowMs: 800,
                defaultSlowFactor: 0.88,
                engineerSkillMarkBonus: 1.08,
                mageStackReq: 4,
                mageBurstDamage: 22,
                mageBurstRadius: 95,
                mageBurstSplashMult: 0.60
            })
        });

        let WORLD_WIDTH = window.innerWidth * CORE_CONFIG.worldScale;
        let WORLD_HEIGHT = window.innerHeight * CORE_CONFIG.worldScale;
        const MINIMAP_SIZE = CORE_CONFIG.minimapSize;
        const MINIMAP_MARGIN = CORE_CONFIG.minimapMargin;

        const COLORS = {
            player: '#4CAF50',
            playerTurret: '#2E7D32',
            clone: '#29B6F6', 
            cloneTurret: '#0288D1',
            shield: 'rgba(0, 191, 255, 0.4)',
            text: '#fff',
            obstacle: '#546E7A',
            obstacleBorder: '#37474F'
        };

        const ENEMY_TYPES = {
            RED: { id: 'RED', name: 'Lính thường', color: '#e53935', hp: 45, maxHp: 45, speed: 2.5, damage: 10, score: 10, radius: 18, behavior: 'CHASE', fireRate: 3000, bulletSpeed: 5.5, bulletDmg: 8 , gold: 10 },
            BLACK: { id: 'BLACK', name: 'Hạng nặng', color: '#212121', hp: 200, maxHp: 200, speed: 1.0, damage: 30, score: 50, radius: 28, behavior: 'CHASE_SLOW', outline: '#757575', fireRate: 4000, bulletSpeed: 4, bulletDmg: 20 , gold: 25 },
            YELLOW: { id: 'YELLOW', name: 'Trinh sát', color: '#FFD700', hp: 25, maxHp: 25, speed: 4.5, damage: 5, score: 25, radius: 14, behavior: 'ORBIT', fireRate: 1200, bulletSpeed: 7.5, bulletDmg: 5 , gold: 15 },
            PURPLE: { id: 'PURPLE', name: 'Bắn tỉa', color: '#9C27B0', hp: 40, maxHp: 40, speed: 1.8, damage: 15, score: 40, radius: 20, behavior: 'SNIPER', fireRate: 3500, bulletSpeed: 11, bulletDmg: 25 , gold: 40 },
            BOSS: { id: 'BOSS', name: 'MECHA BOSS', color: '#D50000', hp: 2000, maxHp: 2000, speed: 1.5, damage: 50, score: 1000, radius: 60, behavior: 'BOSS', fireRate: 2000, bulletSpeed: 8, bulletDmg: 20 , gold: 300 }
        };

        const BULLET_TYPES = {
            NORMAL: { id: 'NORMAL', name: 'Thường', color: '#FFF', damage: 20, speed: 12, cooldown: 350, radius: 4 },
            ROCKET: { id: 'ROCKET', name: 'Rocket', color: '#FF5722', damage: 90, speed: 9, cooldown: 650, radius: 6, special: 'EXPLODE', explosionRadius: 130, splashFactor: 0.75 , homingRange: 500, turnSpeed: 0.2 },
            STUN: { id: 'STUN', name: 'Choáng', color: '#00BCD4', damage: 15, speed: 14, cooldown: 450, radius: 5, effect: { type: 'STUN', duration: 1500 } },
            LIGHTNING: { id: 'LIGHTNING', name: 'Sấm Sét', color: '#FFEB3B', damage: 45, speed: 18, cooldown: 600, radius: 4, special: 'CHAIN', chainRange: 300, chainCount: 3, chainDmgFactor: 0.7 },
            FIRE: { id: 'FIRE', name: 'Đạn Lửa', color: '#FF5722', damage: 20, speed: 13, cooldown: 250, radius: 6, effect: { type: 'BURN', duration: 3000, tickInterval: 500, tickDamage: 8 } },
            PIERCING: { id: 'PIERCING', name: 'Xuyên', color: '#E91E63', damage: 60, speed: 22, cooldown: 700, radius: 6, special: 'PIERCE', pierceCount: 4 },
            HOMING: { id: 'HOMING', name: 'Đuổi', color: '#7C4DFF', damage: 25, speed: 11, cooldown: 450, radius: 5, special: 'HOMING', homingRange: 500, turnSpeed: 0.2 }
        };

        // Cap Fire Rate upgrade level based on NORMAL weapon baseline.
        function getFireRateMaxLv() {
            const baseCd = (BULLET_TYPES && BULLET_TYPES.NORMAL && BULLET_TYPES.NORMAL.cooldown) ? BULLET_TYPES.NORMAL.cooldown : 700;
            const target = 80;      // ms (same as clamp in Player.shoot)
            const mult = 0.95;      // -5% cooldown per level
            if (baseCd <= target) return 0;
            const lv = Math.ceil(Math.log(target / baseCd) / Math.log(mult));
            return Math.max(0, lv);
        }



        const ITEM_TYPES = {
            HP_PACK: { id: 'HP_PACK', color: '#4CAF50', label: '+HP', type: 'HEAL', value: 30, duration: 8000 },
            SHIELD: { id: 'SHIELD', color: '#2196F3', label: 'SHIELD', type: 'BUFF', buffType: 'shield', buffDuration: 8000, duration: 8000 },
            RAPID_FIRE: { id: 'RAPID_FIRE', color: '#FF9800', label: 'RAPID', type: 'BUFF', buffType: 'rapid', buffDuration: 8000, value: 0.5, duration: 8000 },
            AMMO_NORMAL: { id: 'AMMO_NORMAL', color: '#FFF', label: 'NORMAL', type: 'WEAPON', weaponId: 'NORMAL', duration: 15000 },
            AMMO_STUN: { id: 'AMMO_STUN', color: '#00BCD4', label: 'STUN', type: 'WEAPON', weaponId: 'STUN', duration: 15000 },
            AMMO_LIGHTNING: { id: 'AMMO_LIGHTNING', color: '#FFEB3B', label: 'LIGHT', type: 'WEAPON', weaponId: 'LIGHTNING', duration: 15000 },
            AMMO_FIRE: { id: 'AMMO_FIRE', color: '#FF5722', label: 'FIRE', type: 'WEAPON', weaponId: 'FIRE', duration: 15000 },
            AMMO_PIERCE: { id: 'AMMO_PIERCE', color: '#E91E63', label: 'PIERCE', type: 'WEAPON', weaponId: 'PIERCING', duration: 15000 },
            AMMO_HOMING: { id: 'AMMO_HOMING', color: '#7C4DFF', label: 'HOMING', type: 'WEAPON', weaponId: 'HOMING', duration: 15000 }
        };

        const SKILL_CONFIG = {
            CLONE: { cooldown: 14000, duration: 8000, hp: 150 },
            STEALTH: { cooldown: 11000, duration: 3000 },
            VAMPIRISM: { cooldown: 18000, duration: 4000, leechPercent: 0.2, capPerSecond: 20 }
        };

        // Backward-compatible aliases for existing runtime usage.
        const ASSASSIN_UNLOCK_WAVE = ASSASSIN_CONFIG.unlockWave;
        const ASSASSIN_UNLOCK_CODES = ASSASSIN_CONFIG.unlockCodes;
        const ASSASSIN_SKILL_RANGE_Q = ASSASSIN_CONFIG.skillRangeQ;
        const ASSASSIN_SKILL_RANGE_E = ASSASSIN_CONFIG.skillRangeE;
        const ASSASSIN_SKILL_RANGE_R = ASSASSIN_CONFIG.skillRangeR;
        const ASSASSIN_SKILL_RANGE_MAX = Math.max(ASSASSIN_SKILL_RANGE_Q, ASSASSIN_SKILL_RANGE_E, ASSASSIN_SKILL_RANGE_R);
        const ASSASSIN_SLASH_RANGE = ASSASSIN_SKILL_RANGE_MAX;
        const ASSASSIN_KILL_REFUND_MS = ASSASSIN_CONFIG.killRefundMs;
        const ASSASSIN_KILL_REFUND_WINDOW_MS = ASSASSIN_CONFIG.killRefundWindowMs;
        const ASSASSIN_KILL_REFUND_CAP_MS = ASSASSIN_CONFIG.killRefundCapMs;
        const ASSASSIN_BOSS_SKILL_BONUS_PCT = ASSASSIN_CONFIG.bossSkillBonusPct;
        const ASSASSIN_BOSS_SKILL_BONUS_CAP = ASSASSIN_CONFIG.bossSkillBonusCap;

        // Phase 3 kickoff: expose stable runtime/config refs via App namespace.
        try {
            const __app = window.App || (window.App = {});
            __app.runtime = __app.runtime || {};
            __app.config = __app.config || {};
            __app.rules = __app.rules || {};
            __app.runtime.MAX = MAX;
            __app.runtime.getFireRateMaxLv = getFireRateMaxLv;
            __app.config.core = CORE_CONFIG;
            __app.config.assassin = ASSASSIN_CONFIG;
            __app.config.pvp = PVP_CONFIG;
            __app.rules.skillConfig = SKILL_CONFIG;
            __app.rules.fireRate = Object.freeze({
                getMaxLevel: getFireRateMaxLv,
                multiplierPerLevel: 0.95,
                minCooldownMs: 80
            });
            window.MAX = MAX;
        } catch (e) {}

