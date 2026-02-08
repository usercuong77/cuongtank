// === Core Wave Start Rules ===
// Extracted from core-engine to keep wave-start lifecycle logic isolated and easier to maintain.
(() => {
    function runWaveStartLifecycle(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const waveManager = opts.waveManager || null;
        const game = opts.game || ((typeof Game !== 'undefined') ? Game : null);
        const createDamageTextFn = (typeof opts.createDamageTextFn === 'function') ? opts.createDamageTextFn : null;
        const setElDisplayFn = (typeof opts.setElDisplayFn === 'function') ? opts.setElDisplayFn : null;

        const worldWidth = Math.max(1, Number(opts.worldWidth || ((typeof WORLD_WIDTH !== 'undefined') ? WORLD_WIDTH : 1)));
        const worldHeight = Math.max(1, Number(opts.worldHeight || ((typeof WORLD_HEIGHT !== 'undefined') ? WORLD_HEIGHT : 1)));

        if (!waveManager || !game) return false;

        waveManager.active = true;
        waveManager.bossSpawned = false;
        waveManager.isBossWave = (waveManager.wave % 5 === 0);
        waveManager.scaling = (typeof waveManager.computeScaling === 'function') ? waveManager.computeScaling() : null;
        if (typeof game.generateObstacles === 'function') game.generateObstacles();

        // Co-op: revive at wave start while keeping inventory and shop buffs.
        const players = (game.players && game.players.length) ? game.players : (game.player ? [game.player] : []);
        const alive = (players && players.length) ? (players.find((p) => p && p.hp > 0) || null) : null;
        const anchor = alive || ((players && players.length) ? players[0] : null);
        const skipReviveOnce = !!(game && game.__skipCoopReviveOnce);
        if (game && game.__skipCoopReviveOnce) game.__skipCoopReviveOnce = false;

        if (players && players.length >= 2 && alive && !skipReviveOnce) {
            const hpPct = Math.max(0, Math.min(1, (alive.hp || 0) / Math.max(1, (alive.maxHp || 1))));
            let revived = 0;
            for (let i = 0; i < players.length; i++) {
                const pl = players[i];
                if (!pl) continue;
                if (pl.hp <= 0) {
                    pl.hp = Math.max(1, Math.round((pl.maxHp || 100) * hpPct));
                    pl.__noCollide = false;
                    pl.isStealth = false;
                    if (pl.dash) pl.dash.active = false;
                    if (pl.ram) pl.ram.active = false;
                    // Reset auto-aim cache to reacquire targets cleanly.
                    if (pl.__autoAim) {
                        pl.__autoAim.target = null;
                        pl.__autoAim.candidates = [];
                        pl.__autoAim.idx = 0;
                        pl.__autoAim.nextScan = 0;
                    }
                    pl.__easyTarget = null;

                    // Spawn near the first alive player (anchor).
                    const off = (i === 0 ? -1 : 1) * 55;
                    const r = (pl.radius || 22);
                    pl.x = Math.max(r, Math.min(worldWidth - r, (anchor.x + off)));
                    pl.y = Math.max(r, Math.min(worldHeight - r, (anchor.y + 55)));
                    revived++;
                }
            }
            if (revived > 0 && anchor && createDamageTextFn) {
                createDamageTextFn(anchor.x, anchor.y - 110, 'REVIVE!', '#00ff88');
            }
        }

        const uiAnchor = anchor || game.player || ((players && players.length) ? players[0] : null);
        if (waveManager.isBossWave) {
            waveManager.enemiesRemainingToSpawn = 1;
            if (uiAnchor && createDamageTextFn) {
                createDamageTextFn(uiAnchor.x, uiAnchor.y - 100, 'BOSS BATTLE!', '#D50000');
            }
            if (setElDisplayFn) setElDisplayFn('bossHealthContainer', 'block');
        } else {
            const count = (waveManager.scaling ? waveManager.scaling.spawnCount : (3 + Math.floor(waveManager.wave * 1.5)));
            waveManager.enemiesRemainingToSpawn = count;
            if (setElDisplayFn) setElDisplayFn('bossHealthContainer', 'none');
        }

        if (game.ui && typeof game.ui.updateWave === 'function') game.ui.updateWave(waveManager.wave);
        return true;
    }

    function runWaveStartLifecycleSafe(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        try {
            if (runWaveStartLifecycle(opts)) return true;
        } catch (e) {}

        const waveManager = opts.waveManager || null;
        const game = opts.game || ((typeof Game !== 'undefined') ? Game : null);
        const createDamageTextFn = (typeof opts.createDamageTextFn === 'function') ? opts.createDamageTextFn : null;
        const setElDisplayFn = (typeof opts.setElDisplayFn === 'function') ? opts.setElDisplayFn : null;
        const worldWidth = Math.max(1, Number(opts.worldWidth || ((typeof WORLD_WIDTH !== 'undefined') ? WORLD_WIDTH : 1)));
        const worldHeight = Math.max(1, Number(opts.worldHeight || ((typeof WORLD_HEIGHT !== 'undefined') ? WORLD_HEIGHT : 1)));

        if (!waveManager || !game) return false;

        waveManager.active = true;
        waveManager.bossSpawned = false;
        waveManager.isBossWave = (waveManager.wave % 5 === 0);
        waveManager.scaling = (typeof waveManager.computeScaling === 'function') ? waveManager.computeScaling() : null;
        if (typeof game.generateObstacles === 'function') game.generateObstacles();

        const players = (game.players && game.players.length) ? game.players : (game.player ? [game.player] : []);
        const alive = (players && players.length) ? (players.find((p) => p && p.hp > 0) || null) : null;
        const anchor = alive || ((players && players.length) ? players[0] : null);
        const skipReviveOnce = !!(game && game.__skipCoopReviveOnce);
        if (game && game.__skipCoopReviveOnce) game.__skipCoopReviveOnce = false;

        if (players && players.length >= 2 && alive && !skipReviveOnce) {
            const hpPct = Math.max(0, Math.min(1, (alive.hp || 0) / Math.max(1, (alive.maxHp || 1))));
            let revived = 0;
            for (let i = 0; i < players.length; i++) {
                const pl = players[i];
                if (!pl || pl.hp > 0) continue;

                pl.hp = Math.max(1, Math.round((pl.maxHp || 100) * hpPct));
                pl.__noCollide = false;
                pl.isStealth = false;
                if (pl.dash) pl.dash.active = false;
                if (pl.ram) pl.ram.active = false;
                if (pl.__autoAim) {
                    pl.__autoAim.target = null;
                    pl.__autoAim.candidates = [];
                    pl.__autoAim.idx = 0;
                    pl.__autoAim.nextScan = 0;
                }
                pl.__easyTarget = null;

                const off = (i === 0 ? -1 : 1) * 55;
                const r = (pl.radius || 22);
                pl.x = Math.max(r, Math.min(worldWidth - r, (anchor.x + off)));
                pl.y = Math.max(r, Math.min(worldHeight - r, (anchor.y + 55)));
                revived++;
            }
            if (revived > 0 && anchor && createDamageTextFn) {
                createDamageTextFn(anchor.x, anchor.y - 110, 'REVIVE!', '#00ff88');
            }
        }

        const uiAnchor = anchor || game.player || ((players && players.length) ? players[0] : null);
        if (waveManager.isBossWave) {
            waveManager.enemiesRemainingToSpawn = 1;
            if (uiAnchor && createDamageTextFn) {
                createDamageTextFn(uiAnchor.x, uiAnchor.y - 100, 'BOSS BATTLE!', '#D50000');
            }
            if (setElDisplayFn) setElDisplayFn('bossHealthContainer', 'block');
        } else {
            const count = (waveManager.scaling ? waveManager.scaling.spawnCount : (3 + Math.floor(waveManager.wave * 1.5)));
            waveManager.enemiesRemainingToSpawn = count;
            if (setElDisplayFn) setElDisplayFn('bossHealthContainer', 'none');
        }

        if (game.ui && typeof game.ui.updateWave === 'function') game.ui.updateWave(waveManager.wave);
        return true;
    }

    try {
        const app = window.App || (window.App = {});
        app.runtime = app.runtime || {};
        app.runtime.runWaveStartLifecycle = runWaveStartLifecycle;
        app.runtime.runWaveStartLifecycleSafe = runWaveStartLifecycleSafe;
        // Backward-compatible alias for transitional runtime usage.
        window.runWaveStartLifecycle = runWaveStartLifecycle;
        window.runWaveStartLifecycleSafe = runWaveStartLifecycleSafe;
    } catch (e) {}
})();
