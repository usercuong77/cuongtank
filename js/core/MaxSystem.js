// Auto-extracted from original HTML
// Converted from IIFE to exported object for ES Modules.

    const SAVE_KEY = "tank_battle_max_save_v1";

    const defaultSave = {
        bestScore: 0,
        bestWave: 0,
        settings: {
            volume: 0.8,
            fpsCap: 60,
            shake: true,
            minimap: true,
            fps: false,
            autoSave: true
        }
    };

    const Storage = {
        load() {
            try {
                const raw = localStorage.getItem(SAVE_KEY);
                if (!raw) return structuredClone(defaultSave);
                const data = JSON.parse(raw);
                const out = {
                    ...structuredClone(defaultSave),
                    ...data,
                    settings: { ...structuredClone(defaultSave.settings), ...(data.settings || {}) }
                };
                // Minimap is always ON (M key reserved for skill R in Easy/2P)
                out.settings.minimap = true;
                return out;
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

    // Tiny WebAudio synth (no external files)
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
        ting() { this.ping(1040, 0.08, "sine", 0.06); this.ping(1560, 0.10, "triangle", 0.045); }
    };

    const State = {
        save: Storage.load(),
        paused: false,
        fps: { last: performance.now(), frames: 0, value: 0 },
        applySettings() {
            const s = this.save.settings;
            Audio.setVolume(s.volume);
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
            const cap = document.getElementById("setFpsCap");
            const capVal = document.getElementById("setFpsCapVal");
            const sh = document.getElementById("setShake");
            const mm = document.getElementById("setMinimap");
            const fp = document.getElementById("setFps");
            const as = document.getElementById("setAutoSave");

            if (vol) vol.value = s.volume;
            if (volVal) volVal.textContent = Math.round(s.volume * 100) + "%";
            if (cap) cap.value = s.fpsCap;
            if (capVal) capVal.textContent = String(s.fpsCap);
            if (sh) sh.checked = !!s.shake;
            if (mm) { mm.checked = true; mm.disabled = true; }
            if (fp) fp.checked = !!s.fps;
            if (as) as.checked = !!s.autoSave;
        }
    };

    const UI = {
        init() {
            // Buttons
            const topBar = document.getElementById("maxTopBar");
            const btnSettings = document.getElementById("btnSettings");
            const btnClose = document.getElementById("btnCloseSettings");
            const btnPause = document.getElementById("btnPause");
            const modal = document.getElementById("settingsModal");

            const open = () => { if (modal) modal.classList.remove("hidden"); };
            const close = () => { if (modal) modal.classList.add("hidden"); };

            if (btnSettings) btnSettings.addEventListener("click", open);
            if (btnClose) btnClose.addEventListener("click", close);
            if (btnPause) btnPause.addEventListener("click", () => Toggle.pause());

            // Settings controls
            const vol = document.getElementById("setVolume");
            const cap = document.getElementById("setFpsCap");
            const sh  = document.getElementById("setShake");
            const mm  = document.getElementById("setMinimap");
            const fp  = document.getElementById("setFps");
            const as  = document.getElementById("setAutoSave");

            const saveNow = document.getElementById("btnSaveNow");
            const resetSave = document.getElementById("btnResetSave");

            if (vol) vol.addEventListener("input", () => {
                State.save.settings.volume = parseFloat(vol.value);
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
            });            if (mm) {
                // Minimap always ON (disabled toggle to avoid conflict with key M)
                State.save.settings.minimap = true;
                mm.checked = true;
                mm.disabled = true;
                State.syncSettingsUI();
                if (State.save.settings.autoSave) Storage.save(State.save);
            }
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

            if (saveNow) saveNow.addEventListener("click", () => Storage.save(State.save));
            if (resetSave) resetSave.addEventListener("click", () => { Storage.reset(); State.save = Storage.load(); State.applySettings(); State.syncSettingsUI(); });

            // Hotkeys (works alongside your Input system)
            window.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    if (modal && !modal.classList.contains("hidden")) close(); else open();
                }
                const k = e.key.toLowerCase();
                if (k === "p") Toggle.pause();                if (k === "f") { State.save.settings.fps = !State.save.settings.fps; State.applySettings(); State.syncSettingsUI(); if (State.save.settings.autoSave) Storage.save(State.save); }
            });

            // Show best on start screen too
            const start = document.getElementById("startScreen");
            if (start) {
                const div = document.createElement("div");
                div.style.marginTop = "14px";
                div.style.color = "#aaa";
                div.style.fontSize = "0.95rem";
                div.innerHTML = `Best Score: <span style="color:#4CAF50;font-weight:800">${State.save.bestScore}</span> | Best Wave: <span style="color:#4CAF50;font-weight:800">${State.save.bestWave}</span>`;
                start.appendChild(div);
            }

            // keep top bar visible only in game
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
                if (globalThis.Game) globalThis.Game.paused = true;
            } else {
                if (globalThis.Game) { globalThis.Game.paused = false; if (globalThis.loop) requestAnimationFrame(globalThis.loop); }
            }
        }
    };

    export const MAX = { State, Storage, Audio, UI, Toggle };

