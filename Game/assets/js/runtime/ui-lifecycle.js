// === UI Lifecycle Module ===
// Extracted from core-ui-vfx to keep runtime modules smaller and easier to maintain.

function __getRuntime(){
            try { return (window && window.App && window.App.runtime) ? window.App.runtime : null; } catch(e){ return null; }
        }

        function __getConfig(){
            try { return (window && window.App && window.App.config) ? window.App.config : null; } catch(e){ return null; }
        }

        function __getPvpLoadoutStorageKey(){
            try {
                const cfg = __getConfig();
                if (cfg && cfg.pvpLoadoutStorageKey) return cfg.pvpLoadoutStorageKey;
            } catch(e){}
            try { if (typeof PVP_LOADOUT_STORAGE_KEY !== 'undefined') return PVP_LOADOUT_STORAGE_KEY; } catch(e){}
            return 'tankPvpLoadout_v1';
        }

        function __getPvpDefaultLoadout(){
            try {
                const cfg = __getConfig();
                if (cfg && cfg.pvpDefaultLoadout) return cfg.pvpDefaultLoadout;
            } catch(e){}
            try { if (typeof PVP_DEFAULT_LOADOUT !== 'undefined') return PVP_DEFAULT_LOADOUT; } catch(e){}
            return { p1:{ ammo:'ap40', items:[] }, p2:{ ammo:'jammer', items:[] } };
        }

        function __sanitizePvpLoadouts(raw){
            try {
                const rt = __getRuntime();
                if (rt && typeof rt.sanitizePvpLoadouts === 'function') return rt.sanitizePvpLoadouts(raw);
            } catch(e){}
            try { if (typeof sanitizePvpLoadouts === 'function') return sanitizePvpLoadouts(raw); } catch(e){}
            return raw || __getPvpDefaultLoadout();
        }

function __getAction(name){
            try {
                const a = window.App && window.App.actions;
                if (a && typeof a[name] === 'function') return a[name];
            } catch(e){}
            return null;
        }
function __readStartModeCfg(){
            const readCfg = __getAction('readStartModeCfg') || window.__readStartModeCfg;
            if (typeof readCfg === 'function') {
                try { return readCfg(); } catch(e){}
            }
            return { difficulty:'hard', players:1, p2Mode:'coop', p2System:'default' };
        }
function __getQaInstallHook(){
            const installQa = __getAction('installQaHooks') || window.__installQaHooks;
            return (typeof installQa === 'function') ? installQa : null;
        }
function safeGetEl(id){
            try { return document.getElementById(id); } catch(e){ return null; }
        }

        function hideEl(id){
            const el = safeGetEl(id);
            if (el) el.classList.add('hidden');
            return el;
        }

        function showEl(id){
            const el = safeGetEl(id);
            if (el) el.classList.remove('hidden');
            return el;
        }

        function setElDisplay(id, displayValue){
            const el = safeGetEl(id);
            if (el) el.style.display = displayValue;
            return el;
        }

        function blurActiveElement(){
            try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch(e) {}
        }

        function getSelectedSystemId(){
            try {
                const selected = document.querySelector('input[name="tankSystem"]:checked');
                const sysId = selected ? selected.value : 'default';
                return sysId || 'default';
            } catch(e){
                return 'default';
            }
        }

        function persistStartModeAndLoadout(cfg, isPvp){
            try {
                const players = isPvp ? 2 : Math.max(1, Math.min(2, parseInt(cfg.players,10) || 1));
                Game.startMode = {
                    difficulty: (isPvp ? 'hard' : ((cfg.difficulty === 'easy') ? 'easy' : 'hard')),
                    players: players,
                    p1System: Game.selectedSystemId || 'default',
                    p2System: (players === 2 ? (cfg.p2System || 'default') : null),
                    p2Mode: (players === 2 ? (cfg.p2Mode || 'coop') : null)
                };
                try {
                    const app = window.App || (window.App = {});
                    app.state = app.state || {};
                    app.state.startMode = Game.startMode;
                } catch(e){}
                if (!isPvp) {
                    try { localStorage.setItem('tankStartMode_v1', JSON.stringify(Object.assign({}, cfg, Game.startMode))); } catch(e){}
                }
            } catch(e) {}

            try {
                let rawPvp = null;
                const __pvpKey = __getPvpLoadoutStorageKey();
                try { const rp = localStorage.getItem(__pvpKey); if (rp) rawPvp = JSON.parse(rp); } catch(e) {}
                const pickedPvp = __sanitizePvpLoadouts(rawPvp || __getPvpDefaultLoadout());
                Game.pvpLoadouts = isPvp ? pickedPvp : null;
                if (isPvp) { try { localStorage.setItem(__pvpKey, JSON.stringify(pickedPvp)); } catch(e) {} }
            } catch(e) {}
        }

const startGame = (modeOverride) => {
            const cfg = __readStartModeCfg();
            const isPvp = (modeOverride === 'PVP_DUEL_AIM') || (cfg && cfg.players === 2 && cfg.p2Mode === 'pvp');
            try { Game.mode = isPvp ? 'PVP_DUEL_AIM' : 'PVE'; } catch(e){}

            try {
                Game.selectedSystemId = getSelectedSystemId();
                try { localStorage.setItem('tankSystem', Game.selectedSystemId); } catch(e){}
            } catch(e) {}

            persistStartModeAndLoadout(cfg, isPvp);

            try { if (typeof MAX !== 'undefined') { MAX.Audio.init(); } } catch(e){}
            try { window.BGM && window.BGM.onUserGesture && window.BGM.onUserGesture('game'); } catch(e){}
            hideEl('startScreen');
            showEl('gameUI');
            blurActiveElement();
            syncCanvasToViewport();
            Game.init();
            if (isPvp) {
                try {
                    const openPvpModal = __getAction('openPvpLoadoutModal') || window.openPvpLoadoutModal;
                    if (typeof openPvpModal === 'function') openPvpModal();
                } catch(e) {}
            } else {
                try {
                    const closePvpModal = __getAction('closePvpLoadoutModal') || window.closePvpLoadoutModal;
                    if (typeof closePvpModal === 'function') closePvpModal(true);
                } catch(e) {}
            }
        };

        const openVietkeyConfirm = (modeOverride) => {
            const m = safeGetEl('vietkeyModal');
            if (!m) return startGame(modeOverride);
            m.classList.remove('hidden');

            const yes = safeGetEl('vkYes');
            const no = safeGetEl('vkNo');
            const close = () => m.classList.add('hidden');
            const onYes = () => { cleanup(); close(); startGame(modeOverride); };
            const onNo  = () => { cleanup(); close(); };
            const onKey = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); onYes(); }
                if (e.key === 'Escape') { e.preventDefault(); onNo(); }
            };
            const cleanup = () => {
                try {
                    yes && yes.removeEventListener('click', onYes);
                    no && no.removeEventListener('click', onNo);
                    window.removeEventListener('keydown', onKey, true);
                } catch(e) {}
            };
            yes && yes.addEventListener('click', onYes);
            no  && no.addEventListener('click', onNo);
            window.addEventListener('keydown', onKey, true);
        };

        const hideEndScreens = () => {
            hideEl('gameOverScreen');
            hideEl('victoryScreen');
        };

        const hideCombatUi = () => {
            hideEl('shopModal');
            setElDisplay('bossHealthContainer', 'none');
        };

        const returnToMenu = () => {
            hideEndScreens();
            hideCombatUi();
            hideEl('pvpLoadoutModal');
            hideEl('gameUI');
            showEl('startScreen');
            try{ window.BGM && window.BGM.setContext && window.BGM.setContext('menu'); }catch(e){}
            try { Game.active = false; Game.paused = false; } catch(e){}
            try { WaveManager.active = false; } catch(e){}
        };

        const restartRun = () => {
            try { Game.paused = false; } catch(e){}
            hideEndScreens();
            hideEl('startScreen');
            showEl('gameUI');
            try { Game.init(); } catch(e){}
        };

        const continueEndless = () => {
            // Continue from victory screen into endless flow and restart RAF loop.
            hideEndScreens();
            try { Game.endlessMode = true; Game.active = true; Game.paused = false; } catch(e){}
            try { if (typeof MAX !== 'undefined' && MAX.State) { MAX.State.paused = false; } } catch(e){}
            try { WaveManager.wave = (WaveManager.wave || 1) + 1; WaveManager.startWave(); } catch(e){}
            try { Game._fpsCapLast = 0; } catch(e){}
            try { requestAnimationFrame(loop); } catch(e){}
        };

        function syncCanvasToViewport(){
            try {
                if (!canvas) return;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            } catch(e) {}
        }

        function bindClickOnce(id, handler){
            const el = document.getElementById(id);
            if (!el || el.__hookBoundMain === true) return;
            el.__hookBoundMain = true;
            el.addEventListener('click', handler);
        }

        function installStartHooks(){
            bindClickOnce('startBtn', () => openVietkeyConfirm());
        }

        function installEndScreenHooks(){
            bindClickOnce('restartBtn', restartRun);
            bindClickOnce('menuBtnGO', returnToMenu);
            bindClickOnce('victoryRestartBtn', restartRun);
            bindClickOnce('victoryMenuBtn', returnToMenu);
            bindClickOnce('victoryEndlessBtn', continueEndless);
        }

        function installWindowHooks(){
            if (window.__hookBoundViewportMain) return;
            window.__hookBoundViewportMain = true;
            window.addEventListener('resize', syncCanvasToViewport);
        }

        function bindMainHooks(){
            installStartHooks();
            installEndScreenHooks();
            installWindowHooks();
            const installQaHooks = __getQaInstallHook();
            if (installQaHooks) installQaHooks();
        }

        function initMainLifecycle(){
            // Keep canvas ready before first run/restart.
            syncCanvasToViewport();
        }

        function startMainLifecycle(){
            // Reserved lifecycle entry for future boot modules.
        }

        function bootMainLifecycle(){
            initMainLifecycle();
            bindMainHooks();
            startMainLifecycle();
        }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootMainLifecycle, { once: true });
        else setTimeout(bootMainLifecycle, 0);

        // Phase 3 kickoff: expose lifecycle actions via window/App namespace.
        try {
            const __app = window.App || (window.App = {});
            __app.actions = __app.actions || {};
            __app.state = __app.state || {};
            __app.ui = __app.ui || {};
            __app.actions.startGame = startGame;
            __app.actions.returnToMenu = returnToMenu;
            __app.actions.restartRun = restartRun;
            __app.actions.continueEndless = continueEndless;
            __app.state.startMode = __app.state.startMode || null;
            __app.ui.hideEndScreens = hideEndScreens;
            __app.ui.hideCombatUi = hideCombatUi;
            window.startGame = startGame;
            window.returnToMenu = returnToMenu;
        } catch (e) {}




