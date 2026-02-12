// === Security Guard Runtime ===
// Release-only light hardening: key/context menu blockers + runtime sanitizers.
(() => {
    const root = window;
    const App = root.App || (root.App = {});
    App.runtime = App.runtime || {};
    App.security = App.security || {};

    const params = new URLSearchParams((root.location && root.location.search) ? root.location.search : '');
    const host = String((root.location && root.location.hostname) || '').toLowerCase();
    const protocol = String((root.location && root.location.protocol) || '').toLowerCase();

    const isQa = params.get('qa') === '1';
    const forceDev = params.get('dev') === '1';
    const forceRelease = params.get('release') === '1';
    const isLocal = (
        host === '' ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1'
    );
    const isFile = protocol === 'file:';
    const release = !!(forceRelease || (!isQa && !forceDev && !isLocal && !isFile));

    App.security.flags = {
        qa: isQa,
        local: isLocal,
        file: isFile,
        forceDev: forceDev,
        forceRelease: forceRelease,
        release: release
    };
    App.security.isRelease = function() { return !!(App.security.flags && App.security.flags.release); };
    App.security.isQa = function() { return !!(App.security.flags && App.security.flags.qa); };

    function stableStringify(value) {
        if (value === null || typeof value !== 'object') return JSON.stringify(value);
        if (Array.isArray(value)) {
            const arr = value.map((x) => stableStringify(x));
            return '[' + arr.join(',') + ']';
        }
        const keys = Object.keys(value).sort();
        const parts = [];
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            parts.push(JSON.stringify(k) + ':' + stableStringify(value[k]));
        }
        return '{' + parts.join(',') + '}';
    }

    function fnv1a(text) {
        const src = String(text || '');
        let hash = 0x811c9dc5;
        for (let i = 0; i < src.length; i++) {
            hash ^= src.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    }

    const tokenSalt = 'tb2d_guard_v1::' + host + '::' + protocol;

    App.security.sign = function(payload, scope) {
        const body = stableStringify(payload);
        const key = String(scope || 'default');
        return fnv1a(body + '|' + key + '|' + tokenSalt);
    };
    App.security.verify = function(payload, signature, scope) {
        const got = String(signature || '');
        if (!got) return false;
        const expected = App.security.sign(payload, scope);
        return got === expected;
    };

    function installInputGuards() {
        if (!release) return;
        if (App.security.__inputGuardsInstalled) return;
        App.security.__inputGuardsInstalled = true;

        root.addEventListener('contextmenu', function(e) {
            try { e.preventDefault(); } catch(err) {}
        }, true);

        root.addEventListener('keydown', function(e) {
            try {
                const key = String(e.key || '').toLowerCase();
                const ctrl = !!e.ctrlKey;
                const shift = !!e.shiftKey;
                const blocked = (
                    key === 'f12' ||
                    (ctrl && shift && (key === 'i' || key === 'j' || key === 'c' || key === 'k')) ||
                    (ctrl && key === 'u')
                );
                if (blocked) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            } catch(err) {}
            return true;
        }, true);
    }

    function sanitizePlayerState(player, nowMs) {
        if (!player || typeof player !== 'object') return;
        if (!Number.isFinite(player.maxHp) || player.maxHp <= 0) player.maxHp = 1;
        if (!Number.isFinite(player.hp)) player.hp = player.maxHp;
        if (player.hp < 0) player.hp = 0;
        if (player.hp > player.maxHp) player.hp = player.maxHp;

        const skills = player.skills && typeof player.skills === 'object' ? player.skills : null;
        if (!skills) return;
        const keys = ['clone', 'stealth', 'vampirism'];
        for (let i = 0; i < keys.length; i++) {
            const sk = skills[keys[i]];
            if (!sk || typeof sk !== 'object') continue;
            if (!Number.isFinite(sk.lastUsed)) sk.lastUsed = 0;
            if (sk.lastUsed > (nowMs + 60000)) sk.lastUsed = nowMs;
            if (sk.lastUsed < 0) sk.lastUsed = 0;
        }
    }

    App.runtime.sanitizeRuntimeState = function(Game) {
        try {
            if (!Game || typeof Game !== 'object') return;
            if (!Number.isFinite(Game.gold)) Game.gold = 0;
            if (Game.gold < 0) Game.gold = 0;
            if (Game.gold > 1000000000) Game.gold = 1000000000;

            const now = Date.now();
            if (Array.isArray(Game.players) && Game.players.length) {
                for (let i = 0; i < Game.players.length; i++) sanitizePlayerState(Game.players[i], now);
            } else {
                sanitizePlayerState(Game.player, now);
                sanitizePlayerState(Game.player2, now);
            }
        } catch (e) {}
    };

    installInputGuards();
})();

