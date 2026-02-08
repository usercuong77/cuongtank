// === Core Input Event Bindings ===
// Extracted from core-engine to keep engine runtime smaller and easier to maintain.
(() => {
    function bindCoreInputEvents(input) {
        if (!input || input.__coreInputEventsBound) return;
        input.__coreInputEventsBound = true;

        const isGameplayKey = (k) => ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k);

        window.addEventListener('keydown', (e) => {
            // Let admin modal capture keys first.
            try { if (typeof Admin !== 'undefined' && Admin.captureKey && Admin.captureKey(e)) return; } catch (err) {}

            // Do not steal keys while user is typing in inputs.
            if (input._isTypingTarget(document.activeElement) || input._isTypingTarget(e.target)) return;

            const code = e.code || '';
            const kRaw = (e.key || '');
            const k = kRaw.toLowerCase();

            if (isGameplayKey(k)) e.preventDefault();

            // Edge detection: ignore key repeat events.
            const wasDown = (code && input.codes[code]) || input.keys[k] === true;
            input.keys[k] = true;
            if (code) input.codes[code] = true;

            // Keep legacy compatibility for numeric keys 1-6.
            if (['1', '2', '3', '4', '5', '6'].includes(kRaw)) input.keys[kRaw] = true;
            if (kRaw === ' ') input.keys[' '] = true;

            // Map key bindings by mode (Hard/Easy/2P).
            const m = input.getMode();
            const isHard1p = (m.players === 1 && m.difficulty === 'hard');
            const isNoMouseMode = (!isHard1p) || (m.players === 2);

            // Easy/2P: map J/K/L to Q/E/R while keeping Q/E/R fallback.
            if (isNoMouseMode) {
                if (code === 'KeyJ' || k === 'j') input.keys['q'] = true;
                if (code === 'KeyK' || k === 'k') input.keys['e'] = true;
                if (code === 'KeyL' || k === 'l') input.keys['r'] = true;
            }

            // Edge-trigger actions run only on first keydown.
            if (!wasDown && isNoMouseMode) {
                const __isPvp = (typeof Game !== 'undefined' && Game && Game.mode === 'PVP_DUEL_AIM');
                // Weapon cycle: P1=V, P2=Enter.
                if (code === 'KeyV' || k === 'v') { e.preventDefault(); input.queueAction('p1_weapon_cycle'); }
                if (!__isPvp && (code === 'Enter' || code === 'NumpadEnter' || k === 'enter')) { e.preventDefault(); input.queueAction('p2_weapon_cycle'); }

                // Target cycle: P1=T, P2=0 (numpad or digit).
                if (code === 'KeyT' || k === 't') { e.preventDefault(); input.queueAction('p1_target_cycle'); }
                if (!__isPvp && (code === 'Digit0' || code === 'Numpad0' || kRaw === '0')) { e.preventDefault(); input.queueAction('p2_target_cycle'); }
            }
        });

        window.addEventListener('keyup', (e) => {
            const code = e.code || '';
            const kRaw = (e.key || '');
            const k = kRaw.toLowerCase();

            input.keys[k] = false;
            if (code) input.codes[code] = false;

            if (['1', '2', '3', '4', '5', '6'].includes(kRaw)) input.keys[kRaw] = false;
            if (kRaw === ' ') input.keys[' '] = false;

            // Release mapped keys J/K/L => Q/E/R.
            const m = input.getMode();
            const isHard1p = (m.players === 1 && m.difficulty === 'hard');
            const isNoMouseMode = (!isHard1p) || (m.players === 2);
            if (isNoMouseMode) {
                // Release virtual key only when matching physical key is no longer held.
                if (code === 'KeyJ' || k === 'j') { if (!input.codes['KeyQ']) input.keys['q'] = false; }
                if (code === 'KeyK' || k === 'k') { if (!input.codes['KeyE']) input.keys['e'] = false; }
                if (code === 'KeyL' || k === 'l') { if (!input.codes['KeyR']) input.keys['r'] = false; }
            }
        });

        window.addEventListener('mousemove', (e) => { input.mouse.x = e.clientX; input.mouse.y = e.clientY; });
        window.addEventListener('mousedown', () => input.mouse.down = true);
        window.addEventListener('mouseup', () => input.mouse.down = false);

        window.addEventListener('blur', () => {
            input.keys = {};
            input.codes = {};
            input.actions = {};
            input.mouse.down = false;
        });
        window.addEventListener('focus', () => {
            input.keys = {};
            input.codes = {};
            input.actions = {};
        });
    }

    try {
        const app = window.App || (window.App = {});
        app.runtime = app.runtime || {};
        app.runtime.bindCoreInputEvents = bindCoreInputEvents;
        // Global alias kept for transitional compatibility.
        window.bindCoreInputEvents = bindCoreInputEvents;
    } catch (e) {}
})();
