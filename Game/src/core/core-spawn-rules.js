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

    function resolveWaveEnemySpawn(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const rand = (typeof opts.randomFn === 'function') ? opts.randomFn : Math.random;
        const wave = Number(opts.wave || 1);
        const isBossWave = !!opts.isBossWave;

        const typeKey = pickWaveEnemyType(wave, isBossWave, rand);
        const spawnPoint = findEdgeSpawnPoint({
            cameraX: opts.cameraX,
            cameraY: opts.cameraY,
            viewportWidth: opts.viewportWidth,
            viewportHeight: opts.viewportHeight,
            worldWidth: opts.worldWidth,
            worldHeight: opts.worldHeight,
            obstacles: opts.obstacles,
            checkCircleRectFn: opts.checkCircleRectFn,
            maxAttempts: opts.maxAttempts,
            edgeBuffer: opts.edgeBuffer,
            worldPadding: opts.worldPadding,
            obstacleRadius: opts.obstacleRadius,
            randomFn: rand
        });
        return {
            typeKey: typeKey,
            valid: !!(spawnPoint && spawnPoint.valid),
            x: Number(spawnPoint && spawnPoint.x || 0),
            y: Number(spawnPoint && spawnPoint.y || 0),
            attempts: Number(spawnPoint && spawnPoint.attempts || 0)
        };
    }

    function resolveWaveEnemySpawnSafe(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const resolved = resolveWaveEnemySpawn(opts);
        if (resolved && resolved.valid) return resolved;

        // Safety fallback: legacy spawn search copied from engine behavior.
        const rand = (typeof opts.randomFn === 'function') ? opts.randomFn : Math.random;
        const typeKey = pickWaveEnemyType(Number(opts.wave || 1), !!opts.isBossWave, rand);

        const cameraX = Number(opts.cameraX || 0);
        const cameraY = Number(opts.cameraY || 0);
        const viewportWidth = Math.max(1, Number(opts.viewportWidth || 0));
        const viewportHeight = Math.max(1, Number(opts.viewportHeight || 0));
        const worldWidth = Math.max(1, Number(opts.worldWidth || 0));
        const worldHeight = Math.max(1, Number(opts.worldHeight || 0));
        const obstacles = Array.isArray(opts.obstacles) ? opts.obstacles : [];
        const checkCircleRectFn = (typeof opts.checkCircleRectFn === 'function') ? opts.checkCircleRectFn : null;

        let x = 0;
        let y = 0;
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 50) {
            const edge = Math.floor(rand() * 4);
            const buffer = 100;
            switch (edge) {
                case 0:
                    x = cameraX + rand() * viewportWidth;
                    y = cameraY - buffer;
                    break;
                case 1:
                    x = cameraX + viewportWidth + buffer;
                    y = cameraY + rand() * viewportHeight;
                    break;
                case 2:
                    x = cameraX + rand() * viewportWidth;
                    y = cameraY + viewportHeight + buffer;
                    break;
                default:
                    x = cameraX - buffer;
                    y = cameraY + rand() * viewportHeight;
                    break;
            }
            x = Math.max(100, Math.min(worldWidth - 100, x));
            y = Math.max(100, Math.min(worldHeight - 100, y));

            let hitObstacle = false;
            if (checkCircleRectFn) {
                for (let i = 0; i < obstacles.length; i++) {
                    if (checkCircleRectFn({ x: x, y: y, radius: 80 }, obstacles[i])) { hitObstacle = true; break; }
                }
            }
            if (!hitObstacle) valid = true;
            attempts++;
        }
        return { typeKey: typeKey, x: x, y: y, valid: valid, attempts: attempts };
    }

    try {
        const app = window.App || (window.App = {});
        app.runtime = app.runtime || {};
        app.runtime.pickWaveEnemyType = pickWaveEnemyType;
        app.runtime.findEdgeSpawnPoint = findEdgeSpawnPoint;
        app.runtime.resolveWaveEnemySpawn = resolveWaveEnemySpawn;
        app.runtime.resolveWaveEnemySpawnSafe = resolveWaveEnemySpawnSafe;

        // Backward-compatible aliases for transitional runtime usage.
        window.pickWaveEnemyType = pickWaveEnemyType;
        window.findEdgeSpawnPoint = findEdgeSpawnPoint;
        window.resolveWaveEnemySpawn = resolveWaveEnemySpawn;
        window.resolveWaveEnemySpawnSafe = resolveWaveEnemySpawnSafe;
    } catch (e) {}
})();
