// === Core Spawn Rules ===
// Extracted from core-engine to keep enemy spawn logic isolated and easier to maintain.
(() => {
    function pickWaveEnemyType(wave, isBossWave, randomFn) {
        if (isBossWave) return 'BOSS';
        const rand = (typeof randomFn === 'function') ? randomFn : Math.random;
        const w = wave | 0;
        const pool = ['RED'];
        if (w >= 2) pool.push('YELLOW');
        if (w >= 3) pool.push('YELLOW', 'BLACK');
        if (w >= 4) pool.push('BLACK', 'BLACK', 'PURPLE');
        if (w >= 5) pool.push('PURPLE', 'PURPLE');
        return pool[Math.floor(rand() * pool.length)];
    }

    function findEdgeSpawnPoint(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const rand = (typeof opts.randomFn === 'function') ? opts.randomFn : Math.random;

        const cameraX = Number(opts.cameraX || 0);
        const cameraY = Number(opts.cameraY || 0);
        const viewportWidth = Math.max(1, Number(opts.viewportWidth || 0));
        const viewportHeight = Math.max(1, Number(opts.viewportHeight || 0));
        const worldWidth = Math.max(1, Number(opts.worldWidth || 0));
        const worldHeight = Math.max(1, Number(opts.worldHeight || 0));
        const obstacles = Array.isArray(opts.obstacles) ? opts.obstacles : [];
        const checkCircleRectFn = (typeof opts.checkCircleRectFn === 'function') ? opts.checkCircleRectFn : null;

        const maxAttempts = Math.max(1, Number(opts.maxAttempts != null ? opts.maxAttempts : 50));
        const edgeBuffer = Number(opts.edgeBuffer != null ? opts.edgeBuffer : 100);
        const worldPadding = Number(opts.worldPadding != null ? opts.worldPadding : 100);
        const obstacleRadius = Number(opts.obstacleRadius != null ? opts.obstacleRadius : 80);

        let x = 0;
        let y = 0;
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < maxAttempts) {
            const edge = Math.floor(rand() * 4);
            switch (edge) {
                case 0:
                    x = cameraX + rand() * viewportWidth;
                    y = cameraY - edgeBuffer;
                    break;
                case 1:
                    x = cameraX + viewportWidth + edgeBuffer;
                    y = cameraY + rand() * viewportHeight;
                    break;
                case 2:
                    x = cameraX + rand() * viewportWidth;
                    y = cameraY + viewportHeight + edgeBuffer;
                    break;
                default:
                    x = cameraX - edgeBuffer;
                    y = cameraY + rand() * viewportHeight;
                    break;
            }

            x = Math.max(worldPadding, Math.min(worldWidth - worldPadding, x));
            y = Math.max(worldPadding, Math.min(worldHeight - worldPadding, y));

            let hitObstacle = false;
            if (checkCircleRectFn) {
                for (let i = 0; i < obstacles.length; i++) {
                    if (checkCircleRectFn({ x: x, y: y, radius: obstacleRadius }, obstacles[i])) {
                        hitObstacle = true;
                        break;
                    }
                }
            }

            if (!hitObstacle) valid = true;
            attempts++;
        }

        return { valid: valid, x: x, y: y, attempts: attempts };
    }

    try {
        const app = window.App || (window.App = {});
        app.runtime = app.runtime || {};
        app.runtime.pickWaveEnemyType = pickWaveEnemyType;
        app.runtime.findEdgeSpawnPoint = findEdgeSpawnPoint;

        // Backward-compatible aliases for transitional runtime usage.
        window.pickWaveEnemyType = pickWaveEnemyType;
        window.findEdgeSpawnPoint = findEdgeSpawnPoint;
    } catch (e) {}
})();
