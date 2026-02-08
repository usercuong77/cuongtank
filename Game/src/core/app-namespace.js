// === App Namespace Bootstrap ===
// Phase 3 kickoff: keep existing globals, add a stable namespace for safer extension.
(() => {
    const root = window;
    const App = root.App || (root.App = {});

    App.version = App.version || 'phase3-kickoff';
    App.runtime = App.runtime || {};
    App.actions = App.actions || {};
    App.state = App.state || {};
    App.ui = App.ui || {};
    App.rules = App.rules || {};
    App.config = App.config || {};
    App.meta = App.meta || {};

    // Lightweight registration helpers (non-breaking, optional for modules).
    App.register = App.register || {};
    App.register.runtime = App.register.runtime || function(name, value){
        try { if (name) App.runtime[name] = value; } catch(e){}
        return value;
    };
    App.register.action = App.register.action || function(name, value){
        try { if (name) App.actions[name] = value; } catch(e){}
        return value;
    };
    App.register.state = App.register.state || function(name, value){
        try { if (name) App.state[name] = value; } catch(e){}
        return value;
    };
    App.register.ui = App.register.ui || function(name, value){
        try { if (name) App.ui[name] = value; } catch(e){}
        return value;
    };
    App.register.rule = App.register.rule || function(name, value){
        try { if (name) App.rules[name] = value; } catch(e){}
        return value;
    };

    // Safe resolvers so modules can migrate away from direct window globals.
    App.resolve = App.resolve || {};
    App.resolve.runtime = App.resolve.runtime || function(name, fallback){
        try {
            if (name && App.runtime && typeof App.runtime[name] !== 'undefined') return App.runtime[name];
        } catch(e){}
        return fallback;
    };
    App.resolve.action = App.resolve.action || function(name, fallback){
        try {
            if (name && App.actions && typeof App.actions[name] === 'function') return App.actions[name];
        } catch(e){}
        return fallback;
    };
    App.resolve.config = App.resolve.config || function(name, fallback){
        try {
            if (name && App.config && typeof App.config[name] !== 'undefined') return App.config[name];
        } catch(e){}
        return fallback;
    };
    App.resolve.state = App.resolve.state || function(name, fallback){
        try {
            if (name && App.state && typeof App.state[name] !== 'undefined') return App.state[name];
        } catch(e){}
        return fallback;
    };
    App.resolve.rule = App.resolve.rule || function(name, fallback){
        try {
            if (name && App.rules && typeof App.rules[name] !== 'undefined') return App.rules[name];
        } catch(e){}
        return fallback;
    };

    // Runtime boot order contract (verified by runtime-order-guard.js).
    App.boot = App.boot || {};
    App.boot.expectedRuntimeScripts = App.boot.expectedRuntimeScripts || [
        'app-namespace.js',
        'i18n.js',
        'bgm.js',
        'welcome.js',
        'core-config-base.js',
        'skill-systems-data.js',
        'pvp-tuning-data.js',
        'pvp-loadout-data.js',
        'systems-pvp.js',
        'systems-skills.js',
        'core-engine.js',
        'save-flow.js',
        'core-state.js',
        'core-game-loop.js',
        'ui-menu.js',
        'ui-shop.js',
        'ui-hud.js',
        'ui-preview.js',
        'ui-vfx.js',
        'ui-weapons.js',
        'qa-hooks.js',
        'core-ui-vfx.js',
        'ui-lifecycle.js',
        'runtime-order-guard.js'
    ];
    App.boot.verifyRuntimeScriptOrder = App.boot.verifyRuntimeScriptOrder || function(){
        const expected = Array.isArray(App.boot.expectedRuntimeScripts)
            ? App.boot.expectedRuntimeScripts.slice()
            : [];
        const loaded = [];
        const duplicates = [];
        const seen = Object.create(null);
        try {
            const nodes = document.querySelectorAll('script[src]');
            for (let i = 0; i < nodes.length; i++) {
                const src = String(nodes[i].getAttribute('src') || '').trim();
                if (!src) continue;

                const cleanSrc = src.split('#')[0].split('?')[0];
                const slash = cleanSrc.lastIndexOf('/');
                const name = slash >= 0 ? cleanSrc.slice(slash + 1) : cleanSrc;
                if (!name || !/\.js$/i.test(name)) continue;
                if (expected.indexOf(name) < 0) continue;

                loaded.push(name);
                if (seen[name]) duplicates.push(name);
                seen[name] = true;
            }
        } catch(e){}

        const missing = [];
        const extras = [];
        for (let i = 0; i < expected.length; i++) {
            if (loaded.indexOf(expected[i]) < 0) missing.push(expected[i]);
        }
        for (let i = 0; i < loaded.length; i++) {
            if (expected.indexOf(loaded[i]) < 0) extras.push(loaded[i]);
        }
        let mismatchAt = -1;
        const commonLen = Math.min(expected.length, loaded.length);
        for (let i = 0; i < commonLen; i++) {
            if (expected[i] !== loaded[i]) { mismatchAt = i; break; }
        }
        if (mismatchAt === -1 && expected.length !== loaded.length) mismatchAt = commonLen;

        const report = {
            ok: (missing.length === 0 && extras.length === 0 && duplicates.length === 0 && mismatchAt === -1),
            expected: expected,
            loaded: loaded,
            missing: missing,
            extras: extras,
            duplicates: duplicates,
            mismatchAt: mismatchAt,
            checkedAt: Date.now()
        };
        App.meta = App.meta || {};
        App.meta.runtimeOrder = report;
        return report;
    };

    App.meta.createdAt = App.meta.createdAt || Date.now();
    App.meta.lastBootstrap = Date.now();
})();
