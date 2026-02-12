// === Persistence Module: SaveManager (storage helpers only) ===
        // Dev usage:
        //   SaveManager.save({ hello: "world" })
        //   SaveManager.load()
        //   SaveManager.hasSave()
        //   SaveManager.clear()
        function _saveSlotFromMode(mode){
            try{
                const players = (mode && typeof mode.players !== "undefined") ? (parseInt(mode.players,10)||1) : 1;
                const diff = (mode && mode.difficulty === "easy") ? "easy" : "hard";
                // Separate progress per-mode:
                // - hard 1P
                // - easy 1P
                // - 2P (shared regardless of difficulty toggle)
                if (players === 2) return "2p";
                return (diff === "easy" ? "easy1p" : "hard1p");
            }catch(e){
                return "hard1p";
            }
        }

        function _safeModeForSlot(){
            // Prefer live start-screen mode cfg (global), fallback to any internal cfg if available
            try {
                const liveCfg = __readStartModeCfg();
                if (liveCfg) return liveCfg;
            } catch(e) {}
            try { if (typeof safeReadModeCfg === "function") return safeReadModeCfg(); } catch(e) {}
            try {
                const game = __getGame();
                return (game && game.startMode) ? game.startMode : null;
            } catch(e){}
            return null;
        }

        function _slotFromSnap(snap){
            try{
                const m = (snap && snap.mode && typeof snap.mode === "object") ? snap.mode : _safeModeForSlot();
                return _saveSlotFromMode(m);
            }catch(e){
                return "hard1p";
            }
        }

        const SaveManager = {
            BASE_KEY: "tank_save_v1",
            VERSION: 1,
            SIG_VERSION: 1,
            _normSlot(slot){
                slot = (slot == null) ? "" : String(slot);
                slot = slot.trim().toLowerCase();
                // keep it simple/safe
                slot = slot.replace(/[^a-z0-9_-]/g, "");
                return slot;
            },
            _key(slot){
                slot = this._normSlot(slot);
                return slot ? (this.BASE_KEY + "::" + slot) : this.BASE_KEY;
            },
            _stableStringify(v){
                if (v === null || typeof v !== "object") return JSON.stringify(v);
                if (Array.isArray(v)) {
                    const arr = [];
                    for (let i = 0; i < v.length; i++) arr.push(this._stableStringify(v[i]));
                    return "[" + arr.join(",") + "]";
                }
                const keys = Object.keys(v).sort();
                const parts = [];
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    parts.push(JSON.stringify(k) + ":" + this._stableStringify(v[k]));
                }
                return "{" + parts.join(",") + "}";
            },
            _fallbackSign(payload, slot){
                const src = this._stableStringify(payload) + "|" + String(slot || "") + "|tb2d_save_guard_v1";
                let hash = 0x811c9dc5;
                for (let i = 0; i < src.length; i++) {
                    hash ^= src.charCodeAt(i);
                    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                }
                return (hash >>> 0).toString(16).padStart(8, "0");
            },
            _signPayload(payload, slot){
                const __slot = this._normSlot(slot);
                try {
                    const sec = (window && window.App && window.App.security) ? window.App.security : null;
                    if (sec && typeof sec.sign === "function") {
                        return sec.sign(payload, "save:" + __slot + ":v1");
                    }
                } catch(e){}
                return this._fallbackSign(payload, __slot);
            },
            _verifyPayload(payload, signature, slot){
                const __slot = this._normSlot(slot);
                const sig = String(signature || "");
                if (!sig) return false;
                try {
                    const sec = (window && window.App && window.App.security) ? window.App.security : null;
                    if (sec && typeof sec.verify === "function") {
                        return !!sec.verify(payload, sig, "save:" + __slot + ":v1");
                    }
                } catch(e){}
                return sig === this._fallbackSign(payload, __slot);
            },
            save(data, slot) {
                try {
                    const __slot = this._normSlot(slot);
                    const core = { version: this.VERSION, ts: Date.now(), data };
                    const payload = Object.assign({}, core, {
                        sigV: this.SIG_VERSION,
                        sig: this._signPayload(core, __slot)
                    });
                    localStorage.setItem(this._key(__slot), JSON.stringify(payload));
                    return true;
                } catch (e) {
                    console.warn("[Save] save failed:", e);
                    return false;
                }
            },
            _parse(raw, slot){
                if (!raw) return null;
                const obj = JSON.parse(raw);
                if (!obj || typeof obj !== "object") return null;
                if (obj.version !== this.VERSION) {
                    console.warn("[Save] version mismatch:", obj.version, "expected", this.VERSION);
                    return null;
                }
                // Backward compatible: old saves without signature still load.
                if (obj.sig || obj.sigV) {
                    const core = { version: obj.version, ts: obj.ts, data: obj.data };
                    if (!this._verifyPayload(core, obj.sig, slot)) {
                        console.warn("[Save] integrity mismatch -> possible tampering");
                        return null;
                    }
                }
                return obj;
            },
            _legacyRaw(){
                try{
                    // Legacy save used BASE_KEY (without ::slot).
                    return localStorage.getItem(this.BASE_KEY);
                }catch(e){ return null; }
            },
            _migrateLegacyIfMatches(requestedSlot){
                try{
                    const raw = this._legacyRaw();
                    if (!raw) return null;
                    const obj = this._parse(raw, null);
                    if (!obj) return null;
                    // Derive slot from legacy snapshot when available.
                    let snap = null;
                    try{
                        const d = obj.data;
                        snap = (d && d.snap) ? d.snap : d;
                    }catch(e){}
                    const legacySlot = _slotFromSnap(snap);
                    const legacyKey = this._key(legacySlot);
                    // Migrate legacy save to computed slot once.
                    if (!localStorage.getItem(legacyKey)) {
                        localStorage.setItem(legacyKey, raw);
                    }
                    // Remove legacy key to prevent cross-mode visibility.
                    localStorage.removeItem(this.BASE_KEY);
                    if (requestedSlot && this._normSlot(requestedSlot) === this._normSlot(legacySlot)) {
                        return obj;
                    }
                }catch(e){}
                return null;
            },
            load(slot) {
                try {
                    const __slot = this._normSlot(slot);
                    const raw = localStorage.getItem(this._key(__slot));
                    const obj = this._parse(raw, __slot);
                    if (obj) return obj;
                    // If slot save is missing, attempt legacy migration.
                    if (slot) {
                        const migrated = this._migrateLegacyIfMatches(slot);
                        if (migrated) return migrated;
                    }
                    return null;
                } catch (e) {
                    console.warn("[Save] load failed:", e);
                    return null;
                }
            },
            clear(slot) {
                try {
                    localStorage.removeItem(this._key(slot));
                    // If legacy belongs to this slot, remove it too.
                    if (slot) {
                        const raw = this._legacyRaw();
                        if (raw) {
                            const obj = this._parse(raw, null);
                            if (obj) {
                                let snap = null;
                                try{
                                    const d = obj.data;
                                    snap = (d && d.snap) ? d.snap : d;
                                }catch(e){}
                                const legacySlot = _slotFromSnap(snap);
                                if (this._normSlot(legacySlot) === this._normSlot(slot)) {
                                    localStorage.removeItem(this.BASE_KEY);
                                }
                            }
                        }
                    }
                    return true;
                } catch (e) {
                    console.warn("[Save] clear failed:", e);
                    return false;
                }
            },
            hasSave(slot) {
                try {
                    const __slot = this._normSlot(slot);
                    const rawSlot = localStorage.getItem(this._key(__slot));
                    if (rawSlot) {
                        const parsed = this._parse(rawSlot, __slot);
                        if (parsed) return true;
                    }
                    // Only count legacy save when it belongs to this slot.
                    const raw = this._legacyRaw();
                    if (!raw || !slot) return false;
                    const obj = this._parse(raw, null);
                    if (!obj) return false;
                    let snap = null;
                    try{
                        const d = obj.data;
                        snap = (d && d.snap) ? d.snap : d;
                    }catch(e){}
                    const legacySlot = _slotFromSnap(snap);
                    return (this._normSlot(legacySlot) === this._normSlot(slot));
                } catch (e) {
                    return false;
                }
            }
        };

        // Phase 3: runtime resolvers via App namespace (with global fallbacks).
        function __getRuntime(){
            try { return (window && window.App && window.App.runtime) ? window.App.runtime : null; } catch(e){ return null; }
        }
        function __getActions(){
            try { return (window && window.App && window.App.actions) ? window.App.actions : null; } catch(e){ return null; }
        }
        function __readStartModeCfg(){
            try {
                const actions = __getActions();
                if (actions && typeof actions.readStartModeCfg === 'function') return actions.readStartModeCfg();
            } catch(e){}
            try { if (typeof window !== "undefined" && typeof window.__readStartModeCfg === "function") return window.__readStartModeCfg(); } catch(e){}
            return null;
        }
        function __notifyStartSaveUI(){
            try {
                const rt = __getRuntime();
                if (rt && typeof rt.updateStartSaveUI === 'function') { rt.updateStartSaveUI(); return; }
            } catch(e){}
            try {
                const actions = __getActions();
                if (actions && typeof actions.updateStartSaveUI === 'function') { actions.updateStartSaveUI(); return; }
            } catch(e){}
            try { if (typeof window !== "undefined" && typeof window.__updateStartSaveUI === "function") window.__updateStartSaveUI(); } catch(e){}
        }
        function __getGame(){
            try {
                const rt = __getRuntime();
                if (rt && rt.Game) return rt.Game;
                return (typeof Game !== "undefined") ? Game : null;
            } catch(e){ return null; }
        }
        function __getShop(){
            try {
                const rt = __getRuntime();
                if (rt && rt.Shop) return rt.Shop;
                return (typeof Shop !== "undefined") ? Shop : null;
            } catch(e){ return null; }
        }
        function __getWaveManager(){
            try {
                const rt = __getRuntime();
                if (rt && rt.WaveManager) return rt.WaveManager;
                return (typeof WaveManager !== "undefined") ? WaveManager : null;
            } catch(e){ return null; }
        }
// === Persistence Module: Minimal Snapshot + Hotkeys === // Snapshot tối thiểu
// Ctrl+Shift+S: save snapshot to localStorage.
// Ctrl+Shift+L: load and log snapshot (without applying).
(function initSaveS2Hotkeys(){
    if (window.__saveS2HotkeysInited) return;
    window.__saveS2HotkeysInited = true;

    function isTypingTarget(){
        const ae = document.activeElement;
        if (!ae) return false;
        const tag = (ae.tagName || "").toUpperCase();
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || ae.isContentEditable;
    }

    function safeReadModeCfg(){
        // Prefer reading the live selected config from Start Screen.
        try {
            const liveCfg = __readStartModeCfg();
            if (liveCfg) return liveCfg;
        } catch(e){}
        // Fallback: read persisted mode config.
        try {
            const raw = localStorage.getItem("tankStartMode_v1");
            if (raw) return JSON.parse(raw);
        } catch(e){}
        return null;
    }

    function captureMinimal(){
        const game = __getGame();
        const wm = __getWaveManager();
        const wave = (wm && typeof wm.wave !== "undefined") ? (wm.wave|0) : 1;
        const gold = (game && typeof game.gold !== "undefined") ? Math.floor(game.gold||0) : 0;
        const mode = safeReadModeCfg();
        // Capture Shop upgrade levels so reload preserves stats.
        let upgrades = null;
        try{
            if (game && game.upgrades && typeof game.upgrades === "object"){
                upgrades = {
                    maxHpLv: game.upgrades.maxHpLv|0,
                    dmgLv: game.upgrades.dmgLv|0,
                    fireRateLv: game.upgrades.fireRateLv|0,
                    speedLv: game.upgrades.speedLv|0,
                    magnetLv: game.upgrades.magnetLv|0,
                    armorLv: game.upgrades.armorLv|0,
                };
            }
        }catch(e){}
        // Capture weapon inventories per player (P1/P2).
let weapons = null;
try{
    if (game){
        const p1 = game.player || (game.players && game.players[0]);
        const p2 = game.player2 || (game.players && game.players[1]);
        function capP(p){
            if (!p) return null;
            const inv = Array.isArray(p.inventory) ? p.inventory.map(w => ({
                id: String((w && w.id) ? w.id : ""),
                level: (w && typeof w.level !== "undefined") ? (w.level|0) : 1
            })) : null;
            const idx = (p && typeof p.currentWeaponIndex !== "undefined") ? (p.currentWeaponIndex|0) : 0;
            return { inv, idx };
        }
        const w1 = capP(p1);
        const w2 = capP(p2);
        if (w1 || w2) weapons = { p1: w1, p2: w2 };
    }
}catch(e){}
        // Capture HP percent to restore correct ratio after MaxHP reapply.
        let hpPct = null;
        try{
            if (game){
                const p1 = game.player || (game.players && game.players[0]);
                const p2 = game.player2 || (game.players && game.players[1]);
                function pctOf(p){
                    if (!p || typeof p.hp !== "number" || typeof p.maxHp !== "number" || !(p.maxHp > 0)) return null;
                    let v = p.hp / p.maxHp;
                    if (!isFinite(v)) return null;
                    v = Math.max(0, Math.min(1, v));
                    // Reduce decimal noise and save payload size.
                    return Math.round(v * 10000) / 10000;
                }
                const a = pctOf(p1);
                const b = pctOf(p2);
                if (a !== null || b !== null) hpPct = { p1: a, p2: b };
            }
        }catch(e){}
return { wave, gold, mode, upgrades, weapons, hpPct };
    }

    // Helper: normalize and apply upgrades (idempotent-safe).
    function _clampInt(v, lo, hi){
        v = (parseInt(v, 10) || 0);
        if (v < lo) v = lo;
        if (v > hi) v = hi;
        return v|0;
    }
    function normalizeUpgrades(u){
        u = (u && typeof u === "object") ? u : {};
        return {
            maxHpLv: _clampInt(u.maxHpLv, 0, 999),
            dmgLv: _clampInt(u.dmgLv, 0, 999),
            fireRateLv: _clampInt(u.fireRateLv, 0, 999),
            speedLv: _clampInt(u.speedLv, 0, 999),
            magnetLv: _clampInt(u.magnetLv, 0, 999),
            armorLv: _clampInt(u.armorLv, 0, 999),
        };
    }
    function getPlayersList(){
        try{
            const game = __getGame();
            if (game){
                if (game.players && Array.isArray(game.players) && game.players.length) return game.players.slice();
                const arr = [];
                if (game.player) arr.push(game.player);
                if (game.player2) arr.push(game.player2);
                return arr;
            }
        }catch(e){}
        return [];
    }
    function applyUpgradesFromSnapshot(snap){
        try{
            if (!snap || typeof snap !== "object" || !snap.upgrades) return;
            const game = __getGame();
            if (!game) return;

            const prev = normalizeUpgrades(game.upgrades || {});
            const next = normalizeUpgrades(snap.upgrades || {});

            if (!game.upgrades || typeof game.upgrades !== "object"){
                game.upgrades = { maxHpLv:0, dmgLv:0, fireRateLv:0, speedLv:0, magnetLv:0, armorLv:0 };
            }
            // mutate to keep any potential references safe
            game.upgrades.maxHpLv = next.maxHpLv;
            game.upgrades.dmgLv = next.dmgLv;
            game.upgrades.fireRateLv = next.fireRateLv;
            game.upgrades.speedLv = next.speedLv;
            game.upgrades.magnetLv = next.magnetLv;
            game.upgrades.armorLv = next.armorLv;

                        // MaxHP (linear): +25% of base per level.
            const pctPerLevel = 0.25; // must match Shop.buyMaxHp()

            // Force update to keep save stable across builds
            if ((prev.maxHpLv|0) !== (next.maxHpLv|0) || true){
                const pls = getPlayersList();
                const SYS_BASE = { default:100, speed:85, engineer:120, juggernaut:160, mage:70, assassin:105 };

                for (let i=0;i<pls.length;i++){
                    const p = pls[i];
                    if (!p) continue;

                    // Resolve base HP per system (prefer __baseMaxHp from Player constructor)
                    let base = (typeof p.__baseMaxHp === "number" && p.__baseMaxHp > 0) ? p.__baseMaxHp : null;
                    if (!(base > 0)){
                        const sid = (p.systemId || p.system || p.type || 'default').toString().toLowerCase();
                        base = SYS_BASE[sid] || SYS_BASE.default;

                        // If saved from very old build and lv was 0, treat current maxHp as base
                        if ((prev.maxHpLv|0) === 0){
                            const cur = (typeof p.maxHp === "number" && p.maxHp > 0) ? p.maxHp : base;
                            base = cur;
                        }
                    }

                    base = Math.max(1, base|0);
                    p.__baseMaxHp = base;

                    // Formula: base * (1 + level * 0.25)
                    p.maxHp = Math.floor(base * (1 + (next.maxHpLv|0) * pctPerLevel));

                    if (typeof p.hp === "number") p.hp = Math.min(p.hp, p.maxHp);
                }

                // update HUD for both players
                try{
                    const __pidPrevHUD = game.__uiPid;
                    if (game.player && game.ui && game.ui.updateHealth) { game.__uiPid = 1; game.ui.updateHealth(game.player.hp, game.player.maxHp); }
                    if (game.player2 && game.ui && game.ui.updateHealth) { game.__uiPid = 2; game.ui.updateHealth(game.player2.hp, game.player2.maxHp); }
                    game.__uiPid = __pidPrevHUD;
                }catch(e){}
            }
}catch(e){
            console.warn("[Save] applyUpgradesFromSnapshot failed:", e);
        }
    }


    

// === Save Restore Step 5.5: apply HP percent after MaxHP restore ===
function applyHpPctFromSnapshot(snap){
    try{
        if (!snap || typeof snap !== "object") return;
        const hp = snap.hpPct || snap.hpPercent || null;
        if (!hp) return;
        const game = __getGame();
        if (!game) return;

        const p1 = game.player || (game.players && game.players[0]);
        const p2 = game.player2 || (game.players && game.players[1]);

        function readPct(obj, key){
            if (!obj || typeof obj !== "object") return null;
            const v = obj[key];
            return (typeof v === "number" && isFinite(v)) ? v : null;
        }

        const pct1 = (typeof hp === "number" && isFinite(hp)) ? hp : readPct(hp, "p1");
        const pct2 = readPct(hp, "p2");

        function applyOne(p, pct){
            if (!p || pct === null || pct === undefined) return;
            if (typeof p.maxHp !== "number" || !(p.maxHp > 0)) return;
            let v = pct;
            if (!isFinite(v)) return;
            v = Math.max(0, Math.min(1, v));
            const newHp = Math.max(0, Math.min(p.maxHp, Math.round(p.maxHp * v)));
            p.hp = newHp;
        }

        applyOne(p1, pct1);
        applyOne(p2, pct2);

        // update HUD for both players (uses Game.__uiPid routing)
        try{
            const __pidPrevHUD = game.__uiPid;
            if (game.ui && typeof game.ui.updateHealth === "function"){
                if (p1) { game.__uiPid = 1; game.ui.updateHealth(p1.hp, p1.maxHp); }
                if (p2) { game.__uiPid = 2; game.ui.updateHealth(p2.hp, p2.maxHp); }
            }
            game.__uiPid = __pidPrevHUD;
        }catch(e){}
    }catch(e){
        console.warn("[Save] applyHpPctFromSnapshot failed:", e);
    }
}

// === Save Restore Step 6: normalize/apply weapon inventories ===
function _clampLv(v, lo, hi){
    v = (parseInt(v, 10) || 0);
    if (v < lo) v = lo;
    if (v > hi) v = hi;
    return v|0;
}
function normalizeInventory(inv){
    const out = [];
    const seen = new Set();
    if (Array.isArray(inv)){
        for (let i=0;i<inv.length;i++){
            const w = inv[i] || {};
            const id = String(w.id || "").trim();
            if (!id) continue;
            if (seen.has(id)) continue;
            let lv = _clampLv(w.level, 1, 5);
            // NORMAL must be >= 1
            if (id === "NORMAL" && lv < 1) lv = 1;
            out.push({ id, level: lv });
            seen.add(id);
        }
    }
    if (!seen.has("NORMAL")){
        out.unshift({ id: "NORMAL", level: 1 });
    }
    // If somehow empty, enforce NORMAL
    if (!out.length){
        out.push({ id: "NORMAL", level: 1 });
    }
    return out;
}
function normalizeWeaponPack(pack){
    if (!pack || typeof pack !== "object") return null;
    const inv = normalizeInventory(pack.inv);
    let idx = (parseInt(pack.idx, 10) || 0);
    if (idx < 0 || idx >= inv.length) idx = 0;
    return { inv, idx };
}
function applyWeaponsFromSnapshot(snap){
    try{
        if (!snap || typeof snap !== "object" || !snap.weapons) return;
        const game = __getGame();
        if (!game) return;

        const p1 = game.player || (game.players && game.players[0]);
        const p2 = game.player2 || (game.players && game.players[1]);
        const w = snap.weapons || {};

        const prevPid = game.__uiPid;
        function applyOne(pid, p, pack){
            if (!p || !pack) return;
            const np = normalizeWeaponPack(pack);
            if (!np) return;

            // Restore inventory + current weapon index
            p.inventory = np.inv.map(o => ({ id: o.id, level: o.level }));
            p.currentWeaponIndex = np.idx|0;

            // Refresh HUD for that player
            try{
                game.__uiPid = pid;
                if (game.ui && typeof game.ui.updateWeaponInventory === "function"){
                    game.ui.updateWeaponInventory(p.inventory, p.currentWeaponIndex);
                }
            }catch(e){}
        }

        applyOne(1, p1, w.p1);
        applyOne(2, p2, w.p2);

        game.__uiPid = prevPid;
    }catch(e){
        console.warn("[Save] applyWeaponsFromSnapshot failed:", e);
    }
}
    // === Save Restore Step 3: apply minimal snapshot safely ===
    function applyMinimalSnapshot(snap){
        try{
            if (!snap || typeof snap !== "object"){
                console.warn("[Save] Invalid snapshot:", snap);
                return false;
            }
            const game = __getGame();
            const wm = __getWaveManager();
            const actions = __getActions();

            const wave = Math.max(1, (parseInt(snap.wave, 10) || 1));
            const gold = Math.max(0, Math.floor(Number(snap.gold || 0)));
            try { if (wave >= ASSASSIN_UNLOCK_WAVE) unlockAssassin('wave20'); } catch(e){}

            // Persist mode for next init (and also feed Game.startMode if available)
            try{
                if (snap.mode && typeof snap.mode === "object"){
                    localStorage.setItem("tankStartMode_v1", JSON.stringify(snap.mode));
                    try { if (game) game.startMode = Object.assign({}, snap.mode); } catch(e) {}
                }
            } catch(e){}

            // If we're still on start screen, start game first (no UI changes, just reuse existing startGame)
            const startEl = document.getElementById("startScreen");
            const onMenu = !!(startEl && !startEl.classList.contains("hidden"));
            if (onMenu){
                try{
                    // Prefer direct start to avoid Vietkey modal blocking dev load
                    if (actions && typeof actions.startGame === "function") actions.startGame();
                    else if (typeof startGame === "function") startGame();
                    else {
                        const btn = document.getElementById("startBtn");
                        btn && btn.click();
                    }
                } catch(e){
                    console.warn("[Save] Could not start game for apply:", e);
                }
            }

            // Must have initialized player(s) to apply safely
            if (!game || (!game.player && !(game.players && game.players.length))){
                console.warn("[Save] Game not ready yet. Try load again after starting the game.");
                return false;
            }

            // Apply state to running game (minimal: wave + gold + endless flag). Keep everything else untouched for now.
            const wasActive = !!game.active;
            try { game.active = true; } catch(e){}
            try { game.paused = false; } catch(e){}
            try { if (window.MAX && MAX.State) MAX.State.paused = false; } catch(e){}

            // Update gold
            try{
                game.gold = gold;
                if (game.ui && typeof game.ui.updateGold === "function") game.ui.updateGold(game.gold);
            } catch(e){}

            // Restore Shop upgrade levels and reapply MaxHP.
try{ applyUpgradesFromSnapshot(snap); }catch(e){}

// Restore HP percent per player (0% keeps downed state).
try{ applyHpPctFromSnapshot(snap); }catch(e){}

// Restore inventory and current weapon per player.
try{ applyWeaponsFromSnapshot(snap); }catch(e){}

            // If saved while downed, skip auto-revive on first startWave.
            try{
                const hp = snap.hpPct || snap.hpPercent || null;
                let dead1 = false, dead2 = false;
                if (typeof hp === "number" && isFinite(hp)) {
                    dead1 = (hp <= 0);
                } else if (hp && typeof hp === "object") {
                    if (typeof hp.p1 === "number" && isFinite(hp.p1)) dead1 = (hp.p1 <= 0);
                    if (typeof hp.p2 === "number" && isFinite(hp.p2)) dead2 = (hp.p2 <= 0);
                }
                if ((dead1 || dead2) && game) game.__skipCoopReviveOnce = true;
            } catch(e){}
            // Clear volatile runtime lists to avoid mixing wave states
            try{
                const lists = ["enemies","bullets","pickups","particles","texts","coins"];
                for (let i = 0; i < lists.length; i++){
                    const k = lists[i];
                    if (game[k] && Array.isArray(game[k])) game[k].length = 0;
                }
            } catch(e){}

            // Hide end screens if any
            try { const go = document.getElementById("gameOverScreen"); go && go.classList.add("hidden"); } catch(e){}
            try { const vc = document.getElementById("victoryScreen"); vc && vc.classList.add("hidden"); } catch(e){}

            // Apply wave + restart wave
            try{
                if (wm){
                    wm.wave = wave;
                    const fw = (wm.finalWave|0) || 20;
                    try { game.endlessMode = (wave > fw); } catch(e){}
                    if (typeof wm.startWave === "function") wm.startWave();
                    if (game.ui && typeof game.ui.updateWave === "function") game.ui.updateWave(wm.wave);
                }
            } catch(e){}

            // Restart loop only if it was previously stopped
            try{
                if (!wasActive && typeof loop === "function") requestAnimationFrame(loop);
            } catch(e){}

            __devLog("[Save] Applied minimal snapshot -> wave:", wave, "gold:", gold, "mode:", snap.mode || null);
            return true;
        } catch(e){
            console.warn("[Save] applyMinimalSnapshot failed:", e);
            return false;
        }
    }
function logHelpOnce(){
        if (window.__saveS2HelpShown) return;
        window.__saveS2HelpShown = true;
        __devLog("%c[SAVE] Dev hotkeys ready: Ctrl+Shift+S (save), Ctrl+Shift+L (load/apply)", "color:#8ff; font-weight:700");
    }
    // Delay help log a bit to avoid spamming early boot logs
    setTimeout(logHelpOnce, 500);

    window.addEventListener("keydown", function(e){
        if (isTypingTarget()) return;
        if (!e.ctrlKey || !e.shiftKey) return;

        const code = e.code || e.key;
        if (code === "KeyS"){
            e.preventDefault();
            e.stopPropagation();
            try {
                const game = __getGame();
                if (game && game.mode === "PVP_DUEL_AIM") {
                    __devLog("[Save] Disabled in PvP.");
                    return;
                }
            } catch(e){}
            const snap = captureMinimal();
            const ok = SaveManager.save({ kind: "S2_MINIMAL", snap }, _slotFromSnap(snap));
            __devLog(ok ? "[Save] Saved S2 minimal snapshot:" : "[Save] FAILED to save snapshot:", snap);
            __notifyStartSaveUI();
        } else if (code === "KeyL"){
            e.preventDefault();
            e.stopPropagation();
            const __slot = _saveSlotFromMode(_safeModeForSlot());
            const obj = SaveManager.load(__slot);
            if (!obj){
                __devLog("[Save] No save found.");
                return;
            }
            __devLog("[Save] Loaded save object:", obj);

            // Apply minimal snapshot immediately (wave + gold + mode).
            const d = obj.data;
            const snap = (d && d.snap) ? d.snap : d;
            const ok = applyMinimalSnapshot(snap);
            if (!ok) __devLog("[Save] Apply failed. (Tip: start game first, then Ctrl+Shift+L again)");
        }
    }, { capture: true });

// === Autosave Flow (active gameplay + shop + save&quit) === // Autosave khi đang chơi
// Autosave right before opening Shop.
// SAVE & QUIT button: save snapshot then return to menu.
    let __saveS7_lastTs = 0;

    function _isEndScreenVisible(){
        try{
            const go = document.getElementById("gameOverScreen");
            if (go && !go.classList.contains("hidden")) return true;
            const vc = document.getElementById("victoryScreen");
            if (vc && !vc.classList.contains("hidden")) return true;
        }catch(e){}
        return false;
    }

    function _isOnMenu(){
        try{
            const startEl = document.getElementById("startScreen");
            return !!(startEl && !startEl.classList.contains("hidden"));
        }catch(e){}
        return false;
    }

    function writeSave(reason){
        try{
            const game = __getGame();
            if (game && game.mode === "PVP_DUEL_AIM") return false;
            const snap = captureMinimal();
            const ok = SaveManager.save({ kind: "S2_MINIMAL", snap, meta: { reason: String(reason || "") } }, _slotFromSnap(snap));
            if (ok) __saveS7_lastTs = Date.now();
            try {
                const app = window.App || (window.App = {});
                app.state = app.state || {};
                app.state.save = app.state.save || {};
                app.state.save.lastWriteTs = __saveS7_lastTs;
                app.state.save.lastReason = String(reason || '');
            } catch(e){}
            __notifyStartSaveUI();
            return ok;
        }catch(e){
            console.warn("[Save] writeSave failed:", e);
            return false;
        }
    }
    try {
        const app = window.App || (window.App = {});
        app.runtime = app.runtime || {};
        app.actions = app.actions || {};
        app.runtime.writeSave = writeSave;
        app.actions.writeSave = writeSave;
    } catch(e) {}

    // Wrap Shop.show to autosave at a safe between-wave checkpoint. // Bọc Shop.show để autosave an toàn
    (function wrapShopShowAutosave(){
        try{
            const shop = __getShop();
            if (!shop || typeof shop.show !== "function") return;
            if (shop.__saveS7Wrapped) return;
            const _orig = shop.show;
            shop.show = function(){
                try{
                    // Do not autosave on menu/end screens to avoid overwriting valid saves.
                    if (!_isOnMenu() && !_isEndScreenVisible()) writeSave("shop");
                }catch(e){}
                return _orig.apply(this, arguments);
            };
            shop.__saveS7Wrapped = true;
        }catch(e){}
    })();

    // Periodic autosave: check every 5s, save at most every 60s.
    (function initPeriodicAutosave(){
        if (window.__saveS7AutoInited) return;
        window.__saveS7AutoInited = true;

        const CHECK_MS = 5000;
        const SAVE_EVERY_MS = 60000;

        setInterval(function(){
            try{
                if (_isOnMenu()) return;
                if (_isEndScreenVisible()) return;

                const game = __getGame();
                if (!game) return;
                if (!game.active || game.paused) return;

                // Skip saving while Shop is open (already saved before Shop.show).
                try{ const shop = __getShop(); if (shop && shop.open) return; }catch(e){}

                const now = Date.now();
                if (now - (__saveS7_lastTs || 0) < SAVE_EVERY_MS) return;

                writeSave("autosave");
            }catch(e){}
        }, CHECK_MS);
    })();

    // Save & Quit button.
    (function bindSaveQuit(){
        function bind(){
            const btn = document.getElementById("btnSaveQuit");
            if (!btn || btn.__saveBound) return;
            btn.__saveBound = true;

            btn.addEventListener("click", function(e){
                try{ e.preventDefault(); e.stopPropagation(); }catch(err){}
                // Always force a manual save here (even if autosave just ran).
                writeSave("save_quit");
                // Return to menu using existing handler.
                try{
                    const actions = __getActions();
                    if (actions && typeof actions.returnToMenu === "function") actions.returnToMenu();
                    else if (typeof returnToMenu === "function") returnToMenu();
                    else {
                        // Fallback: return to start screen.
                        hideEl('gameUI');
                        showEl('startScreen');
                        try{ window.BGM && window.BGM.setContext && window.BGM.setContext('menu'); }catch(e){}
                        try { const game = __getGame(); if (game) { game.active = false; game.paused = false; } } catch(e){}
                        try { const wm = __getWaveManager(); if (wm) wm.active = false; } catch(e){}
                    }
                }catch(err){
                    console.warn("[Save] Save & Quit returnToMenu failed:", err);
                }
            }, { capture: true });
        }

        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once:true });
        else setTimeout(bind, 0);
    })();



// === Start Menu Save Buttons (Continue + Clear Save) ===
// Continue applies minimal snapshot via applyMinimalSnapshot().
(function initSaveS4MenuUI(){
    if (window.__saveS4MenuUIInited) return;
    window.__saveS4MenuUIInited = true;

    function getSnapFromObj(obj){
        try{
            if (!obj) return null;
            const d = obj.data;
            if (!d) return null;
            return (d && d.snap) ? d.snap : d;
        }catch(e){ return null; }
    }

    function updateStartSaveUI(){
        try{
            const tr = (k, vars) => {
                try { return window.t ? window.t(k, vars) : k; } catch(e){ return k; }
            };
            const cont = document.getElementById("continueBtn");
            const clr  = document.getElementById("clearSaveBtn");
            const startBtn = document.getElementById("startBtn");
            if (!cont || !clr || !startBtn || !SaveManager) return;

            const deployLabel = tr('start.deploy');
            const __modeCfg = _safeModeForSlot();
            if (__modeCfg && __modeCfg.players === 2 && __modeCfg.p2Mode === 'pvp') {
                cont.classList.add("hidden");
                clr.classList.add("hidden");
                startBtn.textContent = deployLabel;
                return;
            }
            const cfgSlot = _saveSlotFromMode(__modeCfg);

            const has = SaveManager.hasSave(cfgSlot);

            if (has){
                const obj = SaveManager.load(cfgSlot);
                const snap = getSnapFromObj(obj);
                const w = snap && snap.wave ? (parseInt(snap.wave, 10) || 1) : null;
                if (w && w >= ASSASSIN_UNLOCK_WAVE) { try { unlockAssassin('wave20'); } catch(e){} }
                cont.textContent = w ? (tr('start.continue') + " (WAVE " + w + ")") : tr('start.continue');
                cont.classList.remove("hidden");
                clr.classList.remove("hidden");
                startBtn.textContent = tr('start.newGame');
            } else {
                cont.classList.add("hidden");
                clr.classList.add("hidden");
                startBtn.textContent = deployLabel;
            }
        }catch(e){}
    }
    window.__updateStartSaveUI = updateStartSaveUI;
    try {
        const app = window.App || (window.App = {});
        app.runtime = app.runtime || {};
        app.actions = app.actions || {};
        app.runtime.updateStartSaveUI = updateStartSaveUI;
        app.actions.updateStartSaveUI = updateStartSaveUI;
    } catch(e) {}
    window.addEventListener('tank:langchange', updateStartSaveUI);

    function onContinue(){
        const cfgSlot = _saveSlotFromMode(_safeModeForSlot());
        const obj = SaveManager.load(cfgSlot);
        if (!obj){
            updateStartSaveUI();
            __devLog("[Save] No save found.");
            return;
        }
        const snap = getSnapFromObj(obj);
        const ok = (typeof applyMinimalSnapshot === "function") ? applyMinimalSnapshot(snap) : false;
        if (!ok) __devLog("[Save] Continue failed. (Tip: try again after game starts)");
    }

    function onClear(){
        try{
            const cfgSlot = _saveSlotFromMode(_safeModeForSlot());
            if (!SaveManager.hasSave(cfgSlot)) { updateStartSaveUI(); return; }
            const label = (cfgSlot === "2p") ? "2P" : (cfgSlot === "easy1p" ? "Easy" : "Hard");
            if (!confirm("Xóa save của chế độ " + label + "?")) return;
            SaveManager.clear(cfgSlot);
            updateStartSaveUI();
            __devLog("[Save] Save cleared:", cfgSlot);
        }catch(e){}
    }
function bind(){
        const cont = document.getElementById("continueBtn");
        const clr  = document.getElementById("clearSaveBtn");
        if (cont && !cont.__saveBound){
            cont.__saveBound = true;
            cont.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); onContinue(); });
        }
        if (clr && !clr.__saveBound){
            clr.__saveBound = true;
            clr.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); onClear(); });
        }
        updateStartSaveUI();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once:true });
    else setTimeout(bind, 0);

    // If save changes in another tab, update UI
    window.addEventListener("storage", function(e){
        try{
            if (e && typeof e.key === 'string' && e.key.indexOf(SaveManager.BASE_KEY) === 0) updateStartSaveUI();
        }catch(err){}
    });
})();
})();

