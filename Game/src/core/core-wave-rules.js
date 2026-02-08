// === Core Wave Rules ===
// Extracted from core-engine to keep progression/scaling logic isolated and easier to test.
(() => {
    function getWavePlayerCount(game) {
        const g = game || ((typeof Game !== 'undefined') ? Game : null);
        if (g && g.players && g.players.length >= 2) return 2;
        return 1;
    }

    function computeWaveScalingForGame(wave, game) {
        const w = wave | 0;
        const t = Math.max(0, w - 1);
        let hpMult = Math.min(4.0, 1 + 0.12 * t);
        let dmgMult = Math.min(3.0, 1 + 0.08 * t);
        const speedMult = Math.min(1.8, 1 + 0.02 * t);
        const fireRateMult = Math.min(1.8, 1 + 0.015 * t);

        const spawnInterval = Math.max(22, 60 - w * 2);
        const baseSpawnCount = Math.min(60, 3 + Math.floor(w * 2) + Math.floor(w * w * 0.08));
        const playerCount = getWavePlayerCount(game);
        const spawnCount = (playerCount >= 2) ? Math.min(90, baseSpawnCount * 2) : baseSpawnCount;

        let bossHpMult = 1 + (w / 8);
        const bossDmgMult = 1 + (w / 12);

        // 2P balancing (anti-overpowered late game): monsters & boss tankier, monsters hit a bit harder.
        if (playerCount >= 2) {
            hpMult *= 1.35;
            bossHpMult *= 1.8;
            dmgMult *= 1.2;
        }

        return { hpMult, dmgMult, speedMult, fireRateMult, spawnInterval, spawnCount, bossHpMult, bossDmgMult };
    }

    function computeWaveScalingSafe(wave, game) {
        try {
            return computeWaveScalingForGame(wave, game);
        } catch (e) {}
        // Safety fallback: baseline scaling without external dependencies.
        const w = wave | 0;
        const t = Math.max(0, w - 1);
        const hpMult = Math.min(4.0, 1 + 0.12 * t);
        const dmgMult = Math.min(3.0, 1 + 0.08 * t);
        const speedMult = Math.min(1.8, 1 + 0.02 * t);
        const fireRateMult = Math.min(1.8, 1 + 0.015 * t);
        const spawnInterval = Math.max(22, 60 - w * 2);
        const spawnCount = Math.min(60, 3 + Math.floor(w * 2) + Math.floor(w * w * 0.08));
        const bossHpMult = 1 + (w / 8);
        const bossDmgMult = 1 + (w / 12);
        return { hpMult, dmgMult, speedMult, fireRateMult, spawnInterval, spawnCount, bossHpMult, bossDmgMult };
    }

    try {
        const app = window.App || (window.App = {});
        app.runtime = app.runtime || {};
        app.runtime.getWavePlayerCount = getWavePlayerCount;
        app.runtime.computeWaveScalingForGame = computeWaveScalingForGame;
        app.runtime.computeWaveScalingSafe = computeWaveScalingSafe;

        // Backward-compatible aliases for transitional runtime usage.
        window.getWavePlayerCount = getWavePlayerCount;
        window.computeWaveScalingForGame = computeWaveScalingForGame;
        window.computeWaveScalingSafe = computeWaveScalingSafe;
    } catch (e) {}
})();
