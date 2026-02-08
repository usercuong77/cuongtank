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
        const PVP_AIM_LEAD_MAX_MS = PVP_CONFIG.aimLeadMaxMs;
        const PVP_AIM_LEAD_FACTOR = PVP_CONFIG.aimLeadFactor;
        const PVP_AIM_MAX_TURN = PVP_CONFIG.aimMaxTurn;
        const EASY_AUTO_AIM_LEAD_BLEND = PVP_CONFIG.easyAutoAimLeadBlend; // Easy: 55% predictive lead.
        const COOP_AUTO_AIM_LEAD_BLEND = PVP_CONFIG.coopAutoAimLeadBlend; // 2P Bot: 30% predictive lead.
        const AUTO_AIM_LEAD_MAX_MS = PVP_CONFIG.autoAimLeadMaxMs;
        const PVP_SKILL_DAMAGE_MULT = PVP_CONFIG.skillDamageMult;
        const PVP_HARD_CC_CAP_MS = PVP_CONFIG.hardCcCapMs;
        const PVP_HARD_CC_DR_WINDOW_MS = PVP_CONFIG.hardCcDrWindowMs;
        const PVP_HARD_CC_DR_MULT = PVP_CONFIG.hardCcDrMult;
        const PVP_SKILL_GLOBAL_LOCKOUT_MS = PVP_CONFIG.skillGlobalLockoutMs;
        const PVP_PASSIVE_DEFAULT_HITS_REQ = PVP_CONFIG.passive.defaultHitsReq;
        const PVP_PASSIVE_DEFAULT_SLOW_MS = PVP_CONFIG.passive.defaultSlowMs;
        const PVP_PASSIVE_DEFAULT_SLOW_FACTOR = PVP_CONFIG.passive.defaultSlowFactor;
        const PVP_PASSIVE_ENGINEER_SKILL_MARK_BONUS = PVP_CONFIG.passive.engineerSkillMarkBonus;
        const PVP_PASSIVE_MAGE_STACK_REQ = PVP_CONFIG.passive.mageStackReq;
        const PVP_PASSIVE_MAGE_BURST_DAMAGE = PVP_CONFIG.passive.mageBurstDamage;
        const PVP_PASSIVE_MAGE_BURST_RADIUS = PVP_CONFIG.passive.mageBurstRadius;
        const PVP_PASSIVE_MAGE_BURST_SPLASH_MULT = PVP_CONFIG.passive.mageBurstSplashMult;

        const PVP_LOADOUT_STORAGE_KEY = PVP_CONFIG.loadoutStorageKey;
        const PVP_AMMO_TYPES = {
            ap40: {
                id:'ap40',
                label:'\u0110\u1ea1n Xuy\u00ean Gi\u00e1p AP-40',
                desc:'T\u1eadp trung ph\u00e1 gi\u00e1p v\u00e0 \u0111\u1ed5i s\u00e1t th\u01b0\u01a1ng.',
                stats:[
                    '+10% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    '+40% b\u1ecf qua gi\u00e1p m\u1ee5c ti\u00eau',
                    '-5% s\u00e1t th\u01b0\u01a1ng n\u1ebfu gi\u00e1p m\u1ee5c ti\u00eau < 5%',
                    '+8% th\u1eddi gian h\u1ed3i gi\u1eefa 2 ph\u00e1t b\u1eafn'
                ],
                damageMult:1.10, cooldownMult:1.08, armorIgnore:0.40, lowArmorDamageMult:0.95, lowArmorThreshold:0.05
            },
            jammer: {
                id:'jammer',
                label:'\u0110\u1ea1n Ph\u00e1 Nh\u1ecbp Null',
                desc:'Kh\u1eafc ch\u1ebf \u0111\u1ed1i th\u1ee7 ph\u1ee5 thu\u1ed9c k\u1ef9 n\u0103ng.',
                stats:[
                    '-14% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    'M\u1ed7i 2.0s, hit s\u1ebd c\u1ed9ng +0.38s h\u1ed3i chi\u00eau Q/E/R c\u1ee7a \u0111\u1ed1i th\u1ee7'
                ],
                damageMult:0.88, cooldownPenaltyMs:380, cooldownPenaltyIcdMs:2000
            },
            tracer: {
                id:'tracer',
                label:'\u0110\u1ea1n \u0110\u00e1nh D\u1ea5u Tracer',
                desc:'L\u1ed9 v\u1ecb tr\u00ed v\u00e0 truy s\u00e1t m\u1ee5c ti\u00eau \u0111\u00e3 \u0111\u00e1nh d\u1ea5u.',
                stats:[
                    '-8% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    'Hit s\u1ebd \u0111\u00e1nh d\u1ea5u 1.5s, l\u1ed9 v\u1ecb tr\u00ed m\u1ee5c ti\u00eau',
                    '+5% s\u00e1t th\u01b0\u01a1ng l\u00ean m\u1ee5c ti\u00eau \u0111ang b\u1ecb \u0111\u00e1nh d\u1ea5u'
                ],
                damageMult:0.93, revealMs:1500, revealedBonusMult:1.05
            },
            cryo: {
                id:'cryo',
                label:'\u0110\u1ea1n L\u00e0m Ch\u1eadm Cryo',
                desc:'C\u00e2u r\u1ec9a, d\u1ec5 b\u1eaft b\u00e0i v\u00e0 gi\u1eef kho\u1ea3ng c\u00e1ch.',
                stats:[
                    '-10% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    'M\u1ed7i 1.6s, hit g\u00e2y l\u00e0m ch\u1eadm 22% trong 1.2s'
                ],
                damageMult:0.90, slowFactor:0.78, slowMs:1200, slowIcdMs:1600
            },
            siegebreak: {
                id:'siegebreak',
                label:'\u0110\u1ea1n Ph\u00e1 Tri\u1ec3n Khai',
                desc:'C\u1ef1c m\u1ea1nh \u0111\u1ec3 tri\u1ec7t clone/turret v\u00e0 l\u00e1 ch\u1eafn.',
                stats:[
                    '-5% s\u00e1t th\u01b0\u01a1ng c\u01a1 b\u1ea3n',
                    '+40% s\u00e1t th\u01b0\u01a1ng l\u00ean clone/turret',
                    '+18% s\u00e1t th\u01b0\u01a1ng l\u00ean m\u1ee5c ti\u00eau \u0111ang c\u00f3 l\u00e1 ch\u1eafn'
                ],
                damageMult:0.95, summonBonusMult:1.40, shieldBonusMult:1.18
            },
            executioner: {
                id:'executioner',
                label:'\u0110\u1ea1n K\u1ebft Li\u1ec5u',
                desc:'\u0110\u00f2n k\u1ebft li\u1ec5u v\u00e0 c\u1eaft h\u1ed3i ph\u1ee5c \u0111\u1ed1i th\u1ee7.',
                stats:[
                    '-8% s\u00e1t th\u01b0\u01a1ng c\u01a1 b\u1ea3n',
                    'M\u1ee5c ti\u00eau d\u01b0\u1edbi 35% m\u00e1u: +22% s\u00e1t th\u01b0\u01a1ng',
                    'G\u00e2y V\u1ebft Th\u01b0\u01a1ng 2.2s: h\u1ed3i m\u00e1u ch\u1ec9 c\u00f2n 55%'
                ],
                damageMult:0.92, executeThreshold:0.35, executeBonusMult:1.22, woundMs:2200, woundHealFactor:0.55
            }
        };

        const PVP_ITEM_TYPES = {
            composite_armor: {
                id:'composite_armor',
                label:'Gi\u00e1p T\u1ed5ng H\u1ee3p',
                desc:'T\u0103ng \u0111\u1ed9 c\u1ee9ng c\u00e1p \u0111\u1ed5i l\u1ea1i m\u1ed9t ch\u00fat c\u01a1 \u0111\u1ed9ng.',
                stats:[
                    '-9% s\u00e1t th\u01b0\u01a1ng nh\u1eadn v\u00e0o',
                    '-4% t\u1ed1c \u0111\u1ed9 di chuy\u1ec3n'
                ],
                damageTakenMult:0.91, speedMult:0.96
            },
            burst_dampener: {
                id:'burst_dampener',
                label:'Gi\u1ea3m Ch\u1ea5n Burst',
                desc:'Ch\u1ed1ng s\u1ed1c s\u00e1t th\u01b0\u01a1ng trong giao tranh ng\u1eafn.',
                stats:[
                    'Nh\u1eadn >=14% m\u00e1u trong 0.8s s\u1ebd k\u00edch ho\u1ea1t',
                    'Khi k\u00edch ho\u1ea1t: -30% s\u00e1t th\u01b0\u01a1ng trong 1.4s',
                    'H\u1ed3i n\u1ed9i t\u1ea1i: 16s'
                ],
                triggerPct:0.14, windowMs:800, activeMult:0.70, activeMs:1400, cooldownMs:16000
            },
            anti_pierce_liner: {
                id:'anti_pierce_liner',
                label:'L\u00f3t Ch\u1ed1ng Xuy\u00ean',
                desc:'Kh\u1eafc ch\u1ebf AP v\u00e0 c\u00e1c b\u00e0i \u0111\u00e1nh xuy\u00ean gi\u00e1p.',
                stats:[
                    'Gi\u1ea3m 60% hi\u1ec7u l\u1ef1c xuy\u00ean gi\u00e1p c\u1ee7a AP-40',
                    '\u0110\u1ea3m b\u1ea3o t\u1ed1i thi\u1ec3u 4% gi\u00e1p sau khi b\u1ecb xuy\u00ean'
                ],
                reduceArmorIgnoreBy:0.60, minArmor:0.04
            },
            cooldown_firewall: {
                id:'cooldown_firewall',
                label:'T\u01b0\u1eddng L\u1eeda H\u1ed3i Chi\u00eau',
                desc:'H\u1ea1n ch\u1ebf b\u1ecb c\u1ed9ng th\u00eam h\u1ed3i chi\u00eau t\u1eeb \u0111\u1ea1n kh\u1eafc ch\u1ebf.',
                stats:[
                    'Gi\u1ea3m 55% hi\u1ec7u l\u1ef1c t\u0103ng h\u1ed3i chi\u00eau nh\u1eadn v\u00e0o',
                    'Tr\u1ea7n +0.5s c\u1ed9ng th\u00eam m\u1ed7i c\u1eeda s\u1ed5 2s'
                ],
                penaltyMult:0.45, capMsPerWindow:500, windowMs:2000
            },
            stealth_scrambler: {
                id:'stealth_scrambler',
                label:'B\u1ed9 Ph\u00e1 T\u00e0ng H\u00ecnh',
                desc:'H\u1ed7 tr\u1ee3 \u0111\u1ea5u tr\u00ed v\u1edbi c\u00e1c b\u00e0i l\u1ed9 v\u1ecb tr\u00ed.',
                stats:[
                    'Gi\u1ea3m 45% th\u1eddi gian b\u1ecb l\u1ed9 v\u1ecb tr\u00ed',
                    'Sau blink/t\u00e0ng h\u00ecnh: mi\u1ec5n l\u1ed9 v\u1ecb tr\u00ed 0.8s'
                ],
                revealDurationMult:0.55, antiRevealAfterBlinkMs:800
            },
            drone_disruptor: {
                id:'drone_disruptor',
                label:'Nhi\u1ec5u Drone',
                desc:'\u0110\u00e1nh v\u00e0o b\u00e0i clone/turret r\u1ea5t hi\u1ec7u qu\u1ea3.',
                stats:[
                    '-35% s\u00e1t th\u01b0\u01a1ng nh\u1eadn t\u1eeb clone/turret',
                    '+20% s\u00e1t th\u01b0\u01a1ng g\u00e2y l\u00ean clone/turret'
                ],
                damageTakenFromSummonMult:0.65, damageToSummonMult:1.20
            },
            duel_capacitor: {
                id:'duel_capacitor',
                label:'T\u1ee5 \u0110i\u1ec7n \u0110\u1ea5u Tay',
                desc:'T\u0103ng s\u00e1t th\u01b0\u01a1ng to\u00e0n tr\u1eadn, \u0111\u00e1nh \u0111\u1ed5i gi\u00e1p n\u1ec1n.',
                stats:[
                    '+10% s\u00e1t th\u01b0\u01a1ng \u0111\u1ea1n',
                    '-8% th\u1eddi gian h\u1ed3i gi\u1eefa 2 ph\u00e1t',
                    '-6% gi\u00e1p c\u01a1 b\u1ea3n'
                ],
                bulletDamageMult:1.10, fireCooldownMult:0.92, armorShift:-0.06
            },
            finisher_chip: {
                id:'finisher_chip',
                label:'Chip K\u1ebft Li\u1ec5u',
                desc:'Ch\u1ed1t h\u1ea1 m\u1ee5c ti\u00eau th\u1ea5p m\u00e1u nhanh h\u01a1n.',
                stats:[
                    'M\u1ee5c ti\u00eau d\u01b0\u1edbi 35% m\u00e1u: +18% s\u00e1t th\u01b0\u01a1ng'
                ],
                threshold:0.35, damageMult:1.18
            },
            skill_hunter: {
                id:'skill_hunter',
                label:'S\u0103n K\u1ef9 N\u0103ng',
                desc:'Tr\u1eebng ph\u1ea1t \u0111\u1ed1i th\u1ee7 v\u1eeba d\u00f9ng k\u1ef9 n\u0103ng.',
                stats:[
                    'Trong 1.6s sau khi \u0111\u1ed1i th\u1ee7 d\u00f9ng skill: +9% s\u00e1t th\u01b0\u01a1ng',
                    'Hit \u0111\u00fang c\u1eeda s\u1ed5 n\u00e0y: gi\u1ea3m 0.25s h\u1ed3i chi\u00eau Q/E/R',
                    'H\u1ed3i n\u1ed9i t\u1ea1i refund: 2.2s'
                ],
                windowMs:1600, damageMult:1.09, refundMs:250, refundIcdMs:2200
            }
        };

        const PVP_AMMO_EN_TEXT = {
            ap40: {
                label: 'AP-40 Armor Piercing',
                desc: 'Built to break armor and force damage trades.',
                stats: ['+10% bullet damage', '+40% armor ignore', '-5% damage if target armor < 5%', '+8% shot cooldown']
            },
            jammer: {
                label: 'Null Jammer Rounds',
                desc: 'Counters skill-reliant opponents.',
                stats: ['-14% bullet damage', 'Every 2.0s, hit adds +0.38s cooldown to enemy Q/E/R']
            },
            tracer: {
                label: 'Tracer Mark Rounds',
                desc: 'Reveal and chase marked targets.',
                stats: ['-8% bullet damage', 'Hit marks target for 1.5s and reveals position', '+5% damage to marked targets']
            },
            cryo: {
                label: 'Cryo Slow Rounds',
                desc: 'Kite-and-control pressure ammo.',
                stats: ['-10% bullet damage', 'Every 1.6s, hit applies 22% slow for 1.2s']
            },
            siegebreak: {
                label: 'Siegebreak Rounds',
                desc: 'Great versus clone/turret/shield setups.',
                stats: ['-5% base damage', '+40% damage to clone/turret', '+18% damage to shielded targets']
            },
            executioner: {
                label: 'Executioner Rounds',
                desc: 'Execute low-HP targets and cut healing.',
                stats: ['-8% base damage', 'Targets under 35% HP: +22% damage', 'Applies Wound 2.2s: healing reduced to 55%']
            }
        };

        const PVP_ITEM_EN_TEXT = {
            composite_armor: {
                label: 'Composite Armor',
                desc: 'More toughness at slight mobility cost.',
                stats: ['-9% damage taken', '-4% move speed']
            },
            burst_dampener: {
                label: 'Burst Dampener',
                desc: 'Reduces burst damage spikes.',
                stats: ['Triggers on >=14% HP loss in 0.8s', 'When active: -30% damage taken for 1.4s', 'Internal cooldown: 16s']
            },
            anti_pierce_liner: {
                label: 'Anti-Pierce Liner',
                desc: 'Counter AP and armor-piercing builds.',
                stats: ['Reduce AP-40 armor ignore effect by 60%', 'Guarantee at least 4% armor after pierce']
            },
            cooldown_firewall: {
                label: 'Cooldown Firewall',
                desc: 'Mitigates added cooldown penalties.',
                stats: ['-55% incoming cooldown penalty effectiveness', 'Cap +0.5s extra penalty per 2s window']
            },
            stealth_scrambler: {
                label: 'Stealth Scrambler',
                desc: 'Counter reveal and tracking play.',
                stats: ['-45% reveal duration taken', 'After blink/stealth: anti-reveal for 0.8s']
            },
            drone_disruptor: {
                label: 'Drone Disruptor',
                desc: 'Efficient against clone/turret comps.',
                stats: ['-35% damage taken from clone/turret', '+20% damage dealt to clone/turret']
            },
            duel_capacitor: {
                label: 'Duel Capacitor',
                desc: 'Higher duel pressure with armor tradeoff.',
                stats: ['+10% bullet damage', '-8% fire cooldown', '-6% base armor']
            },
            finisher_chip: {
                label: 'Finisher Chip',
                desc: 'Faster closeout on low-HP targets.',
                stats: ['Targets under 35% HP: +18% damage']
            },
            skill_hunter: {
                label: 'Skill Hunter',
                desc: 'Punish enemies right after skill casts.',
                stats: ['Within 1.6s after enemy skill cast: +9% damage', 'Hit in window: refund 0.25s Q/E/R cooldown', 'Refund ICD: 2.2s']
            }
        };

        // === PvP Localization + Loadout Resolver ===
        function pvpLang(){
            try { return (window.I18N && typeof window.I18N.lang === 'function') ? window.I18N.lang() : 'vi'; } catch(e){ return 'vi'; }
        }
        function getPvpAmmoLocale(ammoId){
            const base = PVP_AMMO_TYPES && PVP_AMMO_TYPES[ammoId] ? PVP_AMMO_TYPES[ammoId] : null;
            if (!base) return { id: ammoId, label: ammoId || 'unknown', desc: '', stats: [] };
            if (pvpLang() === 'en' && PVP_AMMO_EN_TEXT[ammoId]) {
                const en = PVP_AMMO_EN_TEXT[ammoId];
                return { id: ammoId, label: en.label, desc: en.desc, stats: en.stats || [] };
            }
            return { id: ammoId, label: base.label || ammoId, desc: base.desc || '', stats: base.stats || [] };
        }
        function getPvpItemLocale(itemId){
            const base = PVP_ITEM_TYPES && PVP_ITEM_TYPES[itemId] ? PVP_ITEM_TYPES[itemId] : null;
            if (!base) return { id: itemId, label: itemId || 'unknown', desc: '', stats: [] };
            if (pvpLang() === 'en' && PVP_ITEM_EN_TEXT[itemId]) {
                const en = PVP_ITEM_EN_TEXT[itemId];
                return { id: itemId, label: en.label, desc: en.desc, stats: en.stats || [] };
            }
            return { id: itemId, label: base.label || itemId, desc: base.desc || '', stats: base.stats || [] };
        }

        const PVP_DEFAULT_LOADOUT = {
            p1: { ammo: 'ap40', items: ['composite_armor', 'cooldown_firewall', 'stealth_scrambler'] },
            p2: { ammo: 'jammer', items: ['burst_dampener', 'anti_pierce_liner', 'skill_hunter'] }
        };

        function pvpCloneObj(v){
            try { return JSON.parse(JSON.stringify(v)); } catch(e) { return null; }
        }

        function pvpNormalizeItemList(items){
            const all = Object.keys(PVP_ITEM_TYPES || {});
            const out = [];
            const seen = {};
            const src = Array.isArray(items) ? items : [];
            for (let i = 0; i < src.length; i++) {
                const id = String(src[i] || '').trim();
                if (!id || !PVP_ITEM_TYPES[id] || seen[id]) continue;
                out.push(id); seen[id] = true;
                if (out.length >= 3) break;
            }
            for (let i = 0; out.length < 3 && i < all.length; i++) {
                const id = all[i];
                if (seen[id]) continue;
                out.push(id); seen[id] = true;
            }
            return out.slice(0, 3);
        }

        function sanitizePvpLoadouts(raw){
            const base = pvpCloneObj(PVP_DEFAULT_LOADOUT) || { p1:{ ammo:'ap40', items:[] }, p2:{ ammo:'jammer', items:[] } };
            const next = (raw && typeof raw === 'object') ? raw : {};
            const out = { p1: { ammo: base.p1.ammo, items: base.p1.items.slice(0) }, p2: { ammo: base.p2.ammo, items: base.p2.items.slice(0) } };
            ['p1','p2'].forEach((slot)=>{
                const src = (next && next[slot] && typeof next[slot] === 'object') ? next[slot] : {};
                const ammo = String(src.ammo || out[slot].ammo || '').trim();
                out[slot].ammo = PVP_AMMO_TYPES[ammo] ? ammo : out[slot].ammo;
                out[slot].items = pvpNormalizeItemList(src.items || out[slot].items || []);
            });
            return out;
        }

        function getPvpLoadoutByPid(pid){
            const slot = (pid === 2) ? 'p2' : 'p1';
            const raw = (typeof Game !== 'undefined' && Game && Game.pvpLoadouts) ? Game.pvpLoadouts : null;
            const safe = sanitizePvpLoadouts(raw);
            return (safe && safe[slot]) ? safe[slot] : sanitizePvpLoadouts(null)[slot];
        }

        function pvpHasItem(player, itemId){
            if (!player || !itemId) return false;
            const pid = (player.pid === 2) ? 2 : 1;
            const ld = player._pvpLoadout || getPvpLoadoutByPid(pid);
            return !!(ld && Array.isArray(ld.items) && ld.items.indexOf(itemId) >= 0);
        }

        function pvpGetAmmoByPlayer(player){
            if (!player) return null;
            const pid = (player.pid === 2) ? 2 : 1;
            const ld = player._pvpLoadout || getPvpLoadoutByPid(pid);
            const id = (ld && ld.ammo) ? String(ld.ammo) : '';
            return PVP_AMMO_TYPES[id] || null;
        }

        function getPlayersListSafe(){
            if (typeof Game === 'undefined' || !Game) return [];
            return (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
        }

        function resolveProjectileOwnerPlayer(projectile, playersList){
            const b = projectile || null;
            const list = Array.isArray(playersList) ? playersList : getPlayersListSafe();
            let owner = null;
            if (!b) return owner;
            if (b.ownerPid != null) {
                for (let i = 0; i < list.length; i++) {
                    const p = list[i];
                    if (p && p.pid === b.ownerPid) { owner = p; break; }
                }
            }
            if (!owner && b.ownerPlayer) owner = b.ownerPlayer;
            if (!owner && list.length) owner = list[0];
            return owner;
        }

        function pvpIsSummonTarget(t){
            if (!t) return false;
            if (typeof CloneTank !== 'undefined' && t instanceof CloneTank) return true;
            if (typeof Turret !== 'undefined' && t instanceof Turret) return true;
            return !!(t.ownerPid && !t.pid);
        }

        function pvpIsSummonBullet(b){
            if (!b) return false;
            const src = String(b.skillSource || '').toUpperCase();
            return (src === 'CLONE' || src === 'TURRET');
        }

        function pvpHasShieldLike(target){
            if (!target || !target.buffs) return false;
            const b = target.buffs;
            return !!((b.shield && b.shield.active) || (b.juggerShield && b.juggerShield.active) || (b.siege && b.siege.active));
        }

        function pvpTargetHasSkillDebuff(target){
            if (!target) return false;
            const now = Date.now();
            const e = target.effects || {};
            if (e.stun && e.stun.active && now <= (e.stun.endTime || 0)) return true;
            if (e.slow && e.slow.active && now <= (e.slow.endTime || 0)) return true;
            if (target._pvpWoundedUntil && now < target._pvpWoundedUntil) return true;
            return false;
        }

        function pvpTargetKey(target){
            if (!target) return 'none';
            if (typeof target.pid === 'number') return 'pid_' + target.pid;
            if (!target.__pvpKey) target.__pvpKey = 'obj_' + Math.random().toString(36).slice(2, 9);
            return target.__pvpKey;
        }

        function pvpProcReady(attacker, key, target, icdMs){
            if (!attacker || !key) return false;
            const now = Date.now();
            if (!attacker._pvpProc) attacker._pvpProc = {};
            const k = key + '|' + pvpTargetKey(target);
            const prev = attacker._pvpProc[k] || 0;
            if (now - prev < (icdMs || 0)) return false;
            attacker._pvpProc[k] = now;
            return true;
        }

        function pvpEstimateArmor(target){
            if (!target) return 0;
            let armor = Number(target.innateArmor || 0);
            if (pvpHasItem(target, 'duel_capacitor')) armor += (PVP_ITEM_TYPES.duel_capacitor.armorShift || 0);
            armor = Math.max(0, Math.min(0.75, armor));
            return armor;
        }

        function pvpApplyLoadoutToPlayer(player, pid){
            if (!player) return;
            const slotPid = (pid === 2 || player.pid === 2) ? 2 : 1;
            player._pvpLoadout = getPvpLoadoutByPid(slotPid);
            player._pvpProc = {};
            player._pvpBurst = { windowStart: 0, accum: 0, activeUntil: 0, cooldownUntil: 0 };
            player._pvpCdPenalty = { windowStart: 0, added: 0 };
            player._pvpWoundedUntil = 0;
            player._pvpRevealUntil = 0;
            player._pvpRevealBy = 0;
            player._pvpAntiRevealUntil = 0;
            player._pvpLastSkillCast = 0;
            player._pvpSkillLockUntil = 0;
            player._pvpHardCc = { lastAt: 0 };
            player._pvpDefaultHitCount = 0;
            player._pvpMageMarks = {};
        }

        function pvpApplyCdPenalty(target, ms){
            if (!target || !target.skills) return 0;
            let add = Math.max(0, Number(ms) || 0);
            if (add <= 0) return 0;
            const now = Date.now();
            const firewall = pvpHasItem(target, 'cooldown_firewall') ? PVP_ITEM_TYPES.cooldown_firewall : null;
            if (firewall) add *= (firewall.penaltyMult || 1);

            if (!target._pvpCdPenalty) target._pvpCdPenalty = { windowStart: now, added: 0 };
            const st = target._pvpCdPenalty;
            const win = (firewall && firewall.windowMs) ? firewall.windowMs : 2000;
            if (now - st.windowStart >= win) { st.windowStart = now; st.added = 0; }
            const cap = (firewall && firewall.capMsPerWindow != null) ? firewall.capMsPerWindow : 999999;
            const room = Math.max(0, cap - (st.added || 0));
            add = Math.min(add, room);
            if (add <= 0) return 0;

            ['clone','stealth','vampirism'].forEach((k)=>{
                if (target.skills[k] && typeof target.skills[k].lastUsed === 'number') target.skills[k].lastUsed += add;
            });
            st.added = (st.added || 0) + add;
            return add;
        }

        function pvpApplyReveal(target, ownerPid, baseMs){
            if (!target) return 0;
            const now = Date.now();
            if (target._pvpAntiRevealUntil && now < target._pvpAntiRevealUntil) return 0;
            let dur = Math.max(0, Number(baseMs) || 0);
            if (dur <= 0) return 0;
            if (pvpHasItem(target, 'stealth_scrambler')) {
                dur *= (PVP_ITEM_TYPES.stealth_scrambler.revealDurationMult || 1);
            }
            const until = now + Math.max(1, Math.round(dur));
            target._pvpRevealUntil = Math.max(target._pvpRevealUntil || 0, until);
            target._pvpRevealBy = ownerPid || 0;
            target.isStealth = false;
            if (target.skills && target.skills.stealth) target.skills.stealth.active = false;
            return Math.max(1, Math.round(dur));
        }

        function pvpApplySkillHunterRefund(attacker, ms){
            if (!attacker || !attacker.skills) return 0;
            const now = Date.now();
            const cfg = PVP_ITEM_TYPES.skill_hunter;
            if (attacker._pvpSkillHunterRefundAt && (now - attacker._pvpSkillHunterRefundAt) < (cfg.refundIcdMs || 1500)) return 0;
            const grant = Math.max(0, Number(ms) || 0);
            if (grant <= 0) return 0;
            ['clone','stealth','vampirism'].forEach((k)=>{
                if (attacker.skills[k] && typeof attacker.skills[k].lastUsed === 'number') attacker.skills[k].lastUsed -= grant;
            });
            attacker._pvpSkillHunterRefundAt = now;
            return grant;
        }

        function pvpBulletDamageForTarget(owner, target, bullet, baseDamage){
            let dmg = Number(baseDamage) || 0;
            if (dmg <= 0) return 0;
            const ammo = (bullet && bullet.pvpAmmoId) ? (PVP_AMMO_TYPES[bullet.pvpAmmoId] || null) : null;
            const now = Date.now();

            if (owner && target && pvpHasItem(owner, 'finisher_chip') && target.maxHp > 0 && (target.hp / target.maxHp) < (PVP_ITEM_TYPES.finisher_chip.threshold || 0.35)) {
                dmg *= (PVP_ITEM_TYPES.finisher_chip.damageMult || 1);
            }
            if (owner && target && pvpHasItem(owner, 'skill_hunter') && target._pvpLastSkillCast && (now - target._pvpLastSkillCast) <= (PVP_ITEM_TYPES.skill_hunter.windowMs || 2000)) {
                dmg *= (PVP_ITEM_TYPES.skill_hunter.damageMult || 1);
            }
            if (owner && target && pvpHasItem(owner, 'drone_disruptor') && pvpIsSummonTarget(target)) {
                dmg *= (PVP_ITEM_TYPES.drone_disruptor.damageToSummonMult || 1);
            }
            if (owner && target && owner.systemId === 'engineer' && pvpTargetHasSkillDebuff(target)) {
                dmg *= PVP_PASSIVE_ENGINEER_SKILL_MARK_BONUS;
            }

            if (ammo) {
                if (ammo.id === 'tracer' && target && target._pvpRevealUntil && now < target._pvpRevealUntil && target._pvpRevealBy === (owner ? owner.pid : 0)) {
                    dmg *= (ammo.revealedBonusMult || 1);
                }
                if (ammo.id === 'executioner' && target && target.maxHp > 0 && (target.hp / target.maxHp) < (ammo.executeThreshold || 0.35)) {
                    dmg *= (ammo.executeBonusMult || 1);
                }
                if (ammo.id === 'siegebreak') {
                    if (pvpIsSummonTarget(target)) dmg *= (ammo.summonBonusMult || 1);
                    if (pvpHasShieldLike(target)) dmg *= (ammo.shieldBonusMult || 1);
                }
                if (ammo.id === 'ap40') {
                    const armor = pvpEstimateArmor(target);
                    if (armor < (ammo.lowArmorThreshold || 0.05)) dmg *= (ammo.lowArmorDamageMult || 1);
                }
            }
            return Math.max(1, Math.round(dmg));
        }

        function pvpApplySystemPassivesOnHit(owner, target){
            if (!owner || !target) return;

            // Warrior passive: every 5 bullet hits apply a short slow.
            if (owner.systemId === 'default' && !pvpIsSummonTarget(target)) {
                owner._pvpDefaultHitCount = (owner._pvpDefaultHitCount || 0) + 1;
                if (owner._pvpDefaultHitCount >= PVP_PASSIVE_DEFAULT_HITS_REQ) {
                    owner._pvpDefaultHitCount = 0;
                    if (typeof target.applyEffect === 'function') {
                        target.applyEffect({ type:'SLOW', duration: PVP_PASSIVE_DEFAULT_SLOW_MS, factor: PVP_PASSIVE_DEFAULT_SLOW_FACTOR });
                    }
                    createDamageText(target.x, target.y - 34, 'CHAM', '#90CAF9');
                }
            }

            // Mage passive: apply marks on hit and burst at 4 stacks.
            if (owner.systemId === 'mage' && !pvpIsSummonTarget(target)) {
                if (!owner._pvpMageMarks) owner._pvpMageMarks = {};
                const key = pvpTargetKey(target);
                const next = (owner._pvpMageMarks[key] || 0) + 1;

                if (next >= PVP_PASSIVE_MAGE_STACK_REQ) {
                    owner._pvpMageMarks[key] = 0;
                    const burst = PVP_PASSIVE_MAGE_BURST_DAMAGE;
                    if (typeof target.takeDamage === 'function') {
                        target.takeDamage(burst, { attacker: owner, type: 'PVP_MAGE_BURST' });
                    } else if (typeof target.hp === 'number') {
                        target.hp -= burst;
                        if (target.hp < 0) target.hp = 0;
                    }

                    createComplexExplosion(target.x, target.y, '#4FC3F7', 10);
                    createDamageText(target.x, target.y - 34, 'NO AN', '#4FC3F7');

                    const splash = Math.max(1, Math.round(burst * PVP_PASSIVE_MAGE_BURST_SPLASH_MULT));
                    const radius = PVP_PASSIVE_MAGE_BURST_RADIUS;
                    const ownerPid = owner.pid || 1;
                    const __plist = (Game.players && Game.players.length) ? Game.players : (Game.player ? [Game.player] : []);
                    for (let i = 0; i < __plist.length; i++) {
                        const p = __plist[i];
                        if (!p || p === owner || p === target || typeof p.hp !== 'number' || p.hp <= 0) continue;
                        if (p.pid === ownerPid || p.isStealth) continue;
                        if (Math.hypot(p.x - target.x, p.y - target.y) > radius) continue;
                        if (typeof p.takeDamage === 'function') p.takeDamage(splash, { attacker: owner, type: 'PVP_MAGE_BURST' });
                    }

                    if (Game.clones && Game.clones.length) {
                        for (let i = 0; i < Game.clones.length; i++) {
                            const c = Game.clones[i];
                            if (!c || c.markedForDeletion || c === target) continue;
                            if (c.ownerPid && c.ownerPid === ownerPid) continue;
                            if (Math.hypot(c.x - target.x, c.y - target.y) > radius) continue;
                            if (typeof c.takeDamage === 'function') c.takeDamage(splash);
                        }
                    }
                } else {
                    owner._pvpMageMarks[key] = next;
                }
            }
        }

        function pvpApplyBulletOnHit(owner, target, bullet){
            if (!owner || !target || !bullet) return;
            const ammo = (bullet.pvpAmmoId && PVP_AMMO_TYPES[bullet.pvpAmmoId]) ? PVP_AMMO_TYPES[bullet.pvpAmmoId] : null;
            if (!ammo) return;

            if (ammo.id === 'jammer' && target.skills && pvpProcReady(owner, 'jammer', target, ammo.cooldownPenaltyIcdMs || 1800)) {
                const add = pvpApplyCdPenalty(target, ammo.cooldownPenaltyMs || 450);
                if (add > 0) createDamageText(target.x, target.y - 34, '+' + (add / 1000).toFixed(2) + 's CD', '#7FDBFF');
            }
            if (ammo.id === 'tracer') {
                pvpApplyReveal(target, owner.pid || 0, ammo.revealMs || 2000);
            }
            if (ammo.id === 'cryo' && typeof target.applyEffect === 'function' && pvpProcReady(owner, 'cryo', target, ammo.slowIcdMs || 1600)) {
                target.applyEffect({ type:'SLOW', duration: ammo.slowMs || 1200, factor: ammo.slowFactor || 0.78 });
            }
            if (ammo.id === 'executioner') {
                const now = Date.now();
                target._pvpWoundedUntil = Math.max(target._pvpWoundedUntil || 0, now + (ammo.woundMs || 2200));
            }
            if (pvpHasItem(owner, 'skill_hunter') && target._pvpLastSkillCast && (Date.now() - target._pvpLastSkillCast) <= (PVP_ITEM_TYPES.skill_hunter.windowMs || 2000)) {
                pvpApplySkillHunterRefund(owner, PVP_ITEM_TYPES.skill_hunter.refundMs || 350);
            }
            pvpApplySystemPassivesOnHit(owner, target);
        }

        // === Tank Systems + Skill Framework === // Hệ xe + khung kỹ năng
        // Keep internal keys clone/stealth/vampirism for fixed Q/E/R slots to preserve existing HUD wiring.
        const TANK_SYSTEMS = {
            default: {
                id: 'default',
                name: 'Hệ Chiến Binh',
                skills: {
                    clone:     { key: 'Q', labelHTML: 'Phân<br>Thân',   color: '#29B6F6', cooldown: SKILL_CONFIG.CLONE.cooldown,     duration: SKILL_CONFIG.CLONE.duration },
                    stealth:   { key: 'E', labelHTML: 'Tàng<br>Hình',   color: '#AB47BC', cooldown: SKILL_CONFIG.STEALTH.cooldown,   duration: SKILL_CONFIG.STEALTH.duration },
                    vampirism: { key: 'R', labelHTML: 'Hút<br>Máu',     color: '#FF5252', cooldown: SKILL_CONFIG.VAMPIRISM.cooldown, duration: SKILL_CONFIG.VAMPIRISM.duration }
                }
            },
            speed: {
                id: 'speed',
                name: 'Hệ Tốc Độ',
                skills: {
                    // Q: Dash
                    clone:     { key: 'Q', labelHTML: 'Lướt',          color: '#4FC3F7', cooldown: 3000,  duration: 250, dashSpeedMult: 3.2 },
                    stealth:   { key: 'E', labelHTML: 'Miễn<br>Thương',         color: '#81D4FA', cooldown: 10000, duration: 1000 },
                    // R: Adrenaline (buff)
                    vampirism: { key: 'R', labelHTML: 'Cường<br>Tốc',         color: '#29B6F6', cooldown: 14000, duration: 4000, speedMult: 1.25, fireMult: 0.5, damageMult: 1.3 }
                }
            },
            engineer: {
                id: 'engineer',
                name: 'Hệ Kỹ Sư',
                skills: {
                    clone:     { key: 'Q', labelHTML: 'Tháp<br>Pháo',        color: '#81C784', cooldown: 12000, duration: 10000, maxTurrets: 1, range: 650, fireRate: 320, bulletColor: '#66BB6A', bulletDmgMult: 0.65 },
                    stealth:   { key: 'E', labelHTML: 'Sửa<br>Chữa',        color: '#A5D6A7', cooldown: 16000, healPct: 0.3 },
                    vampirism: { key: 'R', labelHTML: 'Xung<br>EMP',           color: '#00E5FF', cooldown: 18000, radius: 1020, stunDuration: 2400 }
                }
            },
            juggernaut: {
                id: 'juggernaut',
                name: 'Hệ Giáp Sắt',
                skills: {
                    // Q: Reflect Armor
                    clone:     { key: 'Q', labelHTML: 'Giáp<br>Phản', color: '#FFD54F', cooldown: 12000, duration: 5000, castText: 'J0: GIÁP PHẢN LỰC' },
                    // E: Ram
                    stealth:   { key: 'E', labelHTML: 'Cú<br>Húc',   color: '#FFCA28', cooldown: 8000,  duration: 400, ramSpeedMult: 3.0, impactBase: 60, impactPerWave: 3, knockback: 95, castText: 'J0: CÚ HÚC' },
                    // R: Siege Mode
                    vampirism: { key: 'R', labelHTML: 'Pháo<br>Đài', color: '#FFC107', cooldown: 25000, duration: 6000, castText: 'J0: PHÁO ĐÀI' }
                }
            }

        
            ,

            mage: {
                id: 'mage',
                name: 'Pháp Sư',
                color: '#7B1FA2',
                skills: {
                    clone: {
                        key: 'Q',
                        labelHTML: 'Hỏa<br>Cầu',
                        color: '#FF5722',
                        cooldown: 2000,
                        fireballBase: 60,
                        fireballDmgMult: 3.2,
                        fireballRadius: 36,
                        fireballSpeed: 4,
                        explosionRadius: 320,
                        splashFactor: 0.85,
                        castText: 'Q: HỎA CẦU'
                    },
                    stealth: {
                        key: 'E',
                        labelHTML: 'Dịch<br>Chuyển',
                        color: '#E040FB',
                        cooldown: 5500,
                        castText: 'E: DỊCH CHUYỂN'
                    },
                    vampirism: {
                        key: 'R',
                        labelHTML: 'Bão<br>Tuyết',
                        color: '#00E5FF',
                        cooldown: 16000,
                        duration: 5500,
                        radius: 220,
                        innerRadius: 70,
                        moveSpeed: 220,
                        tickInterval: 400,
                        tickDamage: 28,
                        slowFactor: 0.5,
                        slowDuration: 900,
                        castText: 'R: BÃO TUYẾT'
                    }
                }
            },

            assassin: {
                id: 'assassin',
                name: 'S\u00e1t Th\u1ee7',
                skills: {
                    clone:     { key: 'Q', labelHTML: '\u00c1m<br>K\u00edch', color: '#EF5350', cooldown: 5500, duration: 800 },
                    stealth:   { key: 'E', labelHTML: 'Li\u00ean<br>Ho\u00e0n',  color: '#B0BEC5', cooldown: 11500, duration: 2000 },
                    vampirism: { key: 'R', labelHTML: 'Th\u1eadp<br>\u1ea2nh', color: '#FF7043', cooldown: 19000, duration: 3500 }
                }
            }
        };

        function getTankSystem(id) {
            return TANK_SYSTEMS[id] || TANK_SYSTEMS.default;
        }

        const ASSASSIN_PVP_SKILL_COOLDOWNS = { clone: 6100, stealth: 12500, vampirism: 21000 };
        const SYSTEM_SKILL_LABEL_HTML_EN = {
            default:    { clone: 'Clone',            stealth: 'Stealth',        vampirism: 'Lifesteal' },
            speed:      { clone: 'Dash',             stealth: 'Phase',          vampirism: 'Adrenaline' },
            engineer:   { clone: 'Turret',           stealth: 'Repair',         vampirism: 'EMP Pulse' },
            juggernaut: { clone: 'Reflect<br>Armor', stealth: 'Ram',            vampirism: 'Siege' },
            mage:       { clone: 'Fireball',         stealth: 'Blink',          vampirism: 'Blizzard' },
            assassin:   { clone: 'Ambush',           stealth: 'Chain<br>Slash', vampirism: 'Shadow<br>Barrage' }
        };

        function getLocalizedSkillLabelHTML(systemId, skillKey){
            try {
                const lang = (window.I18N && typeof window.I18N.lang === 'function') ? window.I18N.lang() : 'vi';
                if (lang !== 'en') return null;
            } catch(e){ return null; }
            const bySys = SYSTEM_SKILL_LABEL_HTML_EN[systemId] || SYSTEM_SKILL_LABEL_HTML_EN.default;
            return (bySys && bySys[skillKey]) ? bySys[skillKey] : null;
        }

        function getSystemSkillDef(systemId, skillKey) {
            const sys = getTankSystem(systemId);
            const base = (sys && sys.skills && sys.skills[skillKey]) ? sys.skills[skillKey] : getTankSystem('default').skills[skillKey];
            if (!base) return base;

            let out = base;
            if (systemId === 'assassin' && typeof Game !== 'undefined' && Game && Game.mode === 'PVP_DUEL_AIM') {
                const cd = ASSASSIN_PVP_SKILL_COOLDOWNS[skillKey];
                if (typeof cd === 'number') out = Object.assign({}, out, { cooldown: cd });
            }
            const localizedLabelHTML = getLocalizedSkillLabelHTML(systemId, skillKey);
            if (localizedLabelHTML) out = Object.assign({}, out, { labelHTML: localizedLabelHTML });
            return out;
        }

        function getSystemSkillCooldowns(systemId){
            const sid = systemId || 'default';
            return {
                clone: (getSystemSkillDef(sid, 'clone') || {}).cooldown || 0,
                stealth: (getSystemSkillDef(sid, 'stealth') || {}).cooldown || 0,
                vampirism: (getSystemSkillDef(sid, 'vampirism') || {}).cooldown || 0
            };
        }

