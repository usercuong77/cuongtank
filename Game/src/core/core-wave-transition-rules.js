// === Core Wave Transition Rules ===
// Extracted from core-engine to keep wave-clear transition logic isolated and easier to maintain.
(() => {
    function runWaveClearTransition(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const waveManager = opts.waveManager || null;
        const game = opts.game || ((typeof Game !== 'undefined') ? Game : null);
        const shop = opts.shop || null;
        const createDamageTextFn = (typeof opts.createDamageTextFn === 'function') ? opts.createDamageTextFn : null;
        const unlockAssassinFn = (typeof opts.unlockAssassinFn === 'function') ? opts.unlockAssassinFn : null;
        const assassinUnlockWave = Number(opts.assassinUnlockWave != null ? opts.assassinUnlockWave : 20);

        if (!waveManager || !game || !shop || typeof shop.show !== 'function') return false;

        waveManager.active = false;

        if (!game.endlessMode && waveManager.isBossWave && (waveManager.wave >= (waveManager.finalWave || 20))) {
            try {
                if (game.player && createDamageTextFn) {
                    createDamageTextFn(game.player.x, game.player.y - 50, 'CHIẾN THẮNG!', '#4CAF50');
                }
            } catch (e) {}
            if (typeof game.victory === 'function') game.victory();
            return true;
        }

        try {
            if (waveManager.wave >= assassinUnlockWave && unlockAssassinFn) {
                unlockAssassinFn('wave20');
            }
        } catch (e) {}

        waveManager.wave++;

        try {
            const players = (game.players && game.players.length) ? game.players : (game.player ? [game.player] : []);
            let anchor = null;
            for (let i = 0; i < players.length; i++) {
                const p = players[i];
                if (p && p.hp > 0) { anchor = p; break; }
            }
            anchor = anchor || players[0] || game.player;
            if (anchor && createDamageTextFn) {
                createDamageTextFn(anchor.x, anchor.y - 50, 'WAVE COMPLETE!', '#FFD700');
            }
        } catch (e) {}

        shop.show(waveManager.wave, game.gold, () => {
            if (typeof waveManager.startWave === 'function') waveManager.startWave();
            const players = (game.players && game.players.length) ? game.players : (game.player ? [game.player] : []);
            for (let i = 0; i < players.length; i++) {
                const p = players[i];
                if (p && p.hp > 0 && typeof p.heal === 'function') p.heal(p.maxHp * 0.3);
            }
        });

        return true;
    }

    function runWaveClearTransitionSafe(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        try {
            if (runWaveClearTransition(opts)) return true;
        } catch (e) {}

        const waveManager = opts.waveManager || null;
        const game = opts.game || ((typeof Game !== 'undefined') ? Game : null);
        const shop = opts.shop || null;
        const createDamageTextFn = (typeof opts.createDamageTextFn === 'function') ? opts.createDamageTextFn : null;
        const unlockAssassinFn = (typeof opts.unlockAssassinFn === 'function') ? opts.unlockAssassinFn : null;
        const assassinUnlockWave = Number(opts.assassinUnlockWave != null ? opts.assassinUnlockWave : 20);

        if (!waveManager || !game || !shop || typeof shop.show !== 'function') return false;

        waveManager.active = false;

        if (!game.endlessMode && waveManager.isBossWave && (waveManager.wave >= (waveManager.finalWave || 20))) {
            try {
                if (game.player && createDamageTextFn) {
                    createDamageTextFn(game.player.x, game.player.y - 50, 'CHIẾN THẮNG!', '#4CAF50');
                }
            } catch (e) {}
            if (typeof game.victory === 'function') game.victory();
            return true;
        }

        try {
            if (waveManager.wave >= assassinUnlockWave && unlockAssassinFn) {
                unlockAssassinFn('wave20');
            }
        } catch (e) {}

        waveManager.wave++;

        try {
            const players = (game.players && game.players.length) ? game.players : (game.player ? [game.player] : []);
            let anchor = null;
            for (let i = 0; i < players.length; i++) {
                const p = players[i];
                if (p && p.hp > 0) { anchor = p; break; }
            }
            anchor = anchor || players[0] || game.player;
            if (anchor && createDamageTextFn) {
                createDamageTextFn(anchor.x, anchor.y - 50, 'WAVE COMPLETE!', '#FFD700');
            }
        } catch (e) {}

        shop.show(waveManager.wave, game.gold, () => {
            if (typeof waveManager.startWave === 'function') waveManager.startWave();
            const players = (game.players && game.players.length) ? game.players : (game.player ? [game.player] : []);
            for (let i = 0; i < players.length; i++) {
                const p = players[i];
                if (p && p.hp > 0 && typeof p.heal === 'function') p.heal(p.maxHp * 0.3);
            }
        });

        return true;
    }

    try {
        const app = window.App || (window.App = {});
        app.runtime = app.runtime || {};
        app.runtime.runWaveClearTransition = runWaveClearTransition;
        app.runtime.runWaveClearTransitionSafe = runWaveClearTransitionSafe;
        // Backward-compatible alias for transitional runtime usage.
        window.runWaveClearTransition = runWaveClearTransition;
        window.runWaveClearTransitionSafe = runWaveClearTransitionSafe;
    } catch (e) {}
})();
