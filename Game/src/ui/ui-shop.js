// === In-Game PvP Loadout Shop ===
        (function(){
            const IDS = {
                modal: 'pvpLoadoutModal',
                p1Ammo: 'pvpLiveP1Ammo', p2Ammo: 'pvpLiveP2Ammo',
                p1Items: ['pvpLiveP1Item1','pvpLiveP1Item2','pvpLiveP1Item3'],
                p2Items: ['pvpLiveP2Item1','pvpLiveP2Item2','pvpLiveP2Item3'],
                p1AmmoInfo: 'pvpLiveP1AmmoInfo', p2AmmoInfo: 'pvpLiveP2AmmoInfo',
                p1ItemsInfo: 'pvpLiveP1ItemsInfo', p2ItemsInfo: 'pvpLiveP2ItemsInfo',
                reset: 'pvpLiveReset',
                confirm: 'pvpLiveConfirm'
            };

            const $ = (id) => document.getElementById(id);
            function __getRuntime(){
                try { return (window && window.App && window.App.runtime) ? window.App.runtime : null; } catch(e){ return null; }
            }
            function __getConfig(){
                try { return (window && window.App && window.App.config) ? window.App.config : null; } catch(e){ return null; }
            }
            function __getGame(){
                try {
                    const rt = __getRuntime();
                    if (rt && rt.Game) return rt.Game;
                    return (typeof Game !== 'undefined') ? Game : null;
                } catch(e){ return null; }
            }
            function __getPvpAmmoTypes(){
                try {
                    const cfg = __getConfig();
                    if (cfg && cfg.pvpAmmoTypes) return cfg.pvpAmmoTypes;
                } catch(e){}
                try { if (typeof PVP_AMMO_TYPES !== 'undefined') return PVP_AMMO_TYPES; } catch(e){}
                return {};
            }
            function __getPvpItemTypes(){
                try {
                    const cfg = __getConfig();
                    if (cfg && cfg.pvpItemTypes) return cfg.pvpItemTypes;
                } catch(e){}
                try { if (typeof PVP_ITEM_TYPES !== 'undefined') return PVP_ITEM_TYPES; } catch(e){}
                return {};
            }
            function __getPvpDefaultLoadout(){
                try {
                    const cfg = __getConfig();
                    if (cfg && cfg.pvpDefaultLoadout) return cfg.pvpDefaultLoadout;
                } catch(e){}
                try { if (typeof PVP_DEFAULT_LOADOUT !== 'undefined') return PVP_DEFAULT_LOADOUT; } catch(e){}
                return { p1:{ ammo:'ap40', items:[] }, p2:{ ammo:'jammer', items:[] } };
            }
            function __getPvpLoadoutStorageKey(){
                try {
                    const cfg = __getConfig();
                    if (cfg && cfg.pvpLoadoutStorageKey) return cfg.pvpLoadoutStorageKey;
                } catch(e){}
                try { if (typeof PVP_LOADOUT_STORAGE_KEY !== 'undefined') return PVP_LOADOUT_STORAGE_KEY; } catch(e){}
                return 'tankPvpLoadout_v1';
            }
            function __getSanitizePvpLoadoutsFn(){
                try {
                    const rt = __getRuntime();
                    if (rt && typeof rt.sanitizePvpLoadouts === 'function') return rt.sanitizePvpLoadouts;
                } catch(e){}
                try { if (typeof sanitizePvpLoadouts === 'function') return sanitizePvpLoadouts; } catch(e){}
                return function(v){ return v; };
            }
            function __sanitizePvpLoadouts(raw){
                const fn = __getSanitizePvpLoadoutsFn();
                try { return fn(raw); } catch(e){ return raw; }
            }
            function __getPvpAmmoLocaleFn(){
                try {
                    const rt = __getRuntime();
                    if (rt && typeof rt.getPvpAmmoLocale === 'function') return rt.getPvpAmmoLocale;
                } catch(e){}
                try { if (typeof getPvpAmmoLocale === 'function') return getPvpAmmoLocale; } catch(e){}
                return function(ammoId){ return { id: ammoId, label: ammoId || 'unknown', desc: '', stats: [] }; };
            }
            function __getPvpItemLocaleFn(){
                try {
                    const rt = __getRuntime();
                    if (rt && typeof rt.getPvpItemLocale === 'function') return rt.getPvpItemLocale;
                } catch(e){}
                try { if (typeof getPvpItemLocale === 'function') return getPvpItemLocale; } catch(e){}
                return function(itemId){ return { id: itemId, label: itemId || 'unknown', desc: '', stats: [] }; };
            }
            function __getPvpApplyLoadoutToPlayerFn(){
                try {
                    const rt = __getRuntime();
                    if (rt && typeof rt.pvpApplyLoadoutToPlayer === 'function') return rt.pvpApplyLoadoutToPlayer;
                } catch(e){}
                try { if (typeof pvpApplyLoadoutToPlayer === 'function') return pvpApplyLoadoutToPlayer; } catch(e){}
                return null;
            }

            function safeLoadStored(){
                try {
                    const raw = localStorage.getItem(__getPvpLoadoutStorageKey());
                    if (!raw) return null;
                    return JSON.parse(raw);
                } catch(e){ return null; }
            }

            function fillSelect(el, list){
                if (!el) return;
                const prev = el.value;
                el.innerHTML = '';
                for (let i = 0; i < list.length; i++) {
                    const it = list[i];
                    const opt = document.createElement('option');
                    opt.value = it.id;
                    opt.textContent = it.label || it.id;
                    el.appendChild(opt);
                }
                if (prev && el.querySelector('option[value="' + prev + '"]')) el.value = prev;
            }

            function ensureOptions(){
                const pvpAmmoTypes = __getPvpAmmoTypes();
                const pvpItemTypes = __getPvpItemTypes();
                const getAmmoLocale = __getPvpAmmoLocaleFn();
                const getItemLocale = __getPvpItemLocaleFn();
                const ammoList = Object.keys(pvpAmmoTypes || {}).map(k => {
                    const tx = getAmmoLocale(k);
                    return { id:k, label: tx.label || k };
                });
                const itemList = Object.keys(pvpItemTypes || {}).map(k => {
                    const tx = getItemLocale(k);
                    return { id:k, label: tx.label || k };
                });
                fillSelect($(IDS.p1Ammo), ammoList);
                fillSelect($(IDS.p2Ammo), ammoList);
                for (let i = 0; i < IDS.p1Items.length; i++) fillSelect($(IDS.p1Items[i]), itemList);
                for (let i = 0; i < IDS.p2Items.length; i++) fillSelect($(IDS.p2Items[i]), itemList);
            }

            function normalizeSide(side){
                const pvpItemTypes = __getPvpItemTypes();
                const all = Object.keys(pvpItemTypes || {});
                const ids = (side === 'p2') ? IDS.p2Items : IDS.p1Items;
                const used = {};
                for (let i = 0; i < ids.length; i++) {
                    const el = $(ids[i]);
                    if (!el) continue;
                    let v = String(el.value || '');
                    if (!pvpItemTypes[v] || used[v]) {
                        v = '';
                        for (let j = 0; j < all.length; j++) {
                            if (!used[all[j]]) { v = all[j]; break; }
                        }
                        if (v) el.value = v;
                    }
                    if (v) used[v] = true;
                }
            }

            function readUI(){
                const defaultLoadout = __getPvpDefaultLoadout();
                if (!$(IDS.modal)) {
                    return __sanitizePvpLoadouts(safeLoadStored() || defaultLoadout);
                }
                const raw = {
                    p1: {
                        ammo: ($(IDS.p1Ammo) && $(IDS.p1Ammo).value) ? $(IDS.p1Ammo).value : 'ap40',
                        items: IDS.p1Items.map(id => ($(id) && $(id).value) ? $(id).value : '').filter(Boolean)
                    },
                    p2: {
                        ammo: ($(IDS.p2Ammo) && $(IDS.p2Ammo).value) ? $(IDS.p2Ammo).value : 'jammer',
                        items: IDS.p2Items.map(id => ($(id) && $(id).value) ? $(id).value : '').filter(Boolean)
                    }
                };
                return __sanitizePvpLoadouts(raw);
            }

            function writeUI(raw){
                ensureOptions();
                const cfg = __sanitizePvpLoadouts(raw || __getPvpDefaultLoadout());

                if ($(IDS.p1Ammo)) $(IDS.p1Ammo).value = cfg.p1.ammo;
                if ($(IDS.p2Ammo)) $(IDS.p2Ammo).value = cfg.p2.ammo;
                for (let i = 0; i < IDS.p1Items.length; i++) {
                    if ($(IDS.p1Items[i])) $(IDS.p1Items[i]).value = cfg.p1.items[i] || cfg.p1.items[0];
                }
                for (let i = 0; i < IDS.p2Items.length; i++) {
                    if ($(IDS.p2Items[i])) $(IDS.p2Items[i]).value = cfg.p2.items[i] || cfg.p2.items[0];
                }

                normalizeSide('p1');
                normalizeSide('p2');
                renderAllInfo();
                return readUI();
            }

            function escapeHtml(s){
                return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            function renderBlock(title, desc, stats){
                let html = '<div class="pvpStatTitle">' + escapeHtml(title || 'Unknown') + '</div>';
                if (desc) html += '<div class="pvpStatDesc">' + escapeHtml(desc) + '</div>';
                const arr = Array.isArray(stats) ? stats : [];
                if (arr.length) {
                    html += '<ul class="pvpStatList">';
                    for (let i = 0; i < arr.length; i++) html += '<li>' + escapeHtml(arr[i]) + '</li>';
                    html += '</ul>';
                }
                return html;
            }
            const tr = (k, vars) => {
                try { return window.t ? window.t(k, vars) : k; } catch(e){ return k; }
            };

            function renderSide(side){
                const cfg = readUI();
                const slot = (side === 'p2') ? 'p2' : 'p1';
                const ammoId = cfg[slot].ammo;
                const items = cfg[slot].items || [];

                const getAmmoLocale = __getPvpAmmoLocaleFn();
                const getItemLocale = __getPvpItemLocaleFn();
                const ammo = getAmmoLocale(ammoId);
                const ammoInfoEl = $(side === 'p2' ? IDS.p2AmmoInfo : IDS.p1AmmoInfo);
                if (ammoInfoEl) {
                    if (!ammo || !ammo.id) ammoInfoEl.innerHTML = '<div class="pvpStatMuted">' + escapeHtml(tr('pvp.noAmmoData')) + '</div>';
                    else ammoInfoEl.innerHTML = renderBlock(ammo.label || ammo.id, ammo.desc || '', ammo.stats || []);
                }

                const itemInfoEl = $(side === 'p2' ? IDS.p2ItemsInfo : IDS.p1ItemsInfo);
                if (itemInfoEl) {
                    let html = '';
                    for (let i = 0; i < items.length; i++) {
                        const itemId = items[i];
                        const it = getItemLocale(itemId);
                        if (!it || !it.id) continue;
                        html += '<div class="pvpItemBlock">' + renderBlock(tr('pvp.itemLabel') + ' ' + (i + 1) + ': ' + (it.label || it.id), it.desc || '', it.stats || []) + '</div>';
                    }
                    itemInfoEl.innerHTML = html || '<div class="pvpStatMuted">' + escapeHtml(tr('pvp.noItemData')) + '</div>';
                }
            }

            function renderAllInfo(){
                renderSide('p1');
                renderSide('p2');
            }

            function persist(cfg){
                try { localStorage.setItem(__getPvpLoadoutStorageKey(), JSON.stringify(__sanitizePvpLoadouts(cfg))); } catch(e) {}
            }

            function applyToGame(cfg){
                const safe = __sanitizePvpLoadouts(cfg || __getPvpDefaultLoadout());
                const game = __getGame();
                try { if (game) game.pvpLoadouts = safe; } catch(e) {}
                persist(safe);

                try {
                    if (game && game.mode === 'PVP_DUEL_AIM') {
                        const applyLoadoutToPlayer = __getPvpApplyLoadoutToPlayerFn();
                        if (typeof applyLoadoutToPlayer === 'function') {
                            if (game.player) applyLoadoutToPlayer(game.player, 1);
                            if (game.player2) applyLoadoutToPlayer(game.player2, 2);
                        }
                        if (typeof game.pvpResetRound === 'function') game.pvpResetRound();
                        if (game.pvp) {
                            const now = Date.now();
                            game.pvp.state = 'countdown';
                            game.pvp.freeze = true;
                            game.pvp.countdownEnd = now + (game.pvp.countdownMs || 3000);
                            game.pvp.message = 'ROUND ' + (game.pvp.round || 1);
                            game.pvp.messageUntil = now + 900;
                            game.pvp.roundEndAt = 0;
                        }
                    }
                } catch(e) {}
            }

            function open(){
                const modal = $(IDS.modal);
                if (!modal) return;
                ensureOptions();
                const game = __getGame();
                const base = __sanitizePvpLoadouts((game && game.pvpLoadouts) ? game.pvpLoadouts : (safeLoadStored() || __getPvpDefaultLoadout()));
                writeUI(base);
                modal.classList.remove('hidden');
                try { if (game) game.paused = true; } catch(e) {}
            }

            function close(keepPaused){
                const modal = $(IDS.modal);
                if (!modal) return;
                modal.classList.add('hidden');
                if (!keepPaused) {
                    const game = __getGame();
                    try { if (game) game.paused = false; } catch(e) {}
                }
            }

            function handleConfirm(){
                const picked = readUI();
                applyToGame(picked);
                close(false);
            }

            function handleReset(){
                const cfg = writeUI(__getPvpDefaultLoadout());
                persist(cfg);
            }

            function bind(){
                const all = [IDS.p1Ammo, IDS.p2Ammo].concat(IDS.p1Items).concat(IDS.p2Items);
                for (let i = 0; i < all.length; i++) {
                    const el = $(all[i]);
                    if (!el || el.__pvpLiveBound) continue;
                    el.__pvpLiveBound = true;
                    el.addEventListener('change', () => {
                        normalizeSide('p1');
                        normalizeSide('p2');
                        const cfg = readUI();
                        persist(cfg);
                        renderAllInfo();
                    });
                }

                const btnOk = $(IDS.confirm);
                if (btnOk && !btnOk.__pvpLiveBound) {
                    btnOk.__pvpLiveBound = true;
                    btnOk.addEventListener('click', handleConfirm);
                }

                const btnReset = $(IDS.reset);
                if (btnReset && !btnReset.__pvpLiveBound) {
                    btnReset.__pvpLiveBound = true;
                    btnReset.addEventListener('click', handleReset);
                }

                window.addEventListener('keydown', (e) => {
                    const modal = $(IDS.modal);
                    if (!modal || modal.classList.contains('hidden')) return;
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        handleConfirm();
                    }
                    if (e.key === 'Enter') {
                        const ae = document.activeElement;
                        if (ae && ae.tagName === 'SELECT') return;
                        e.preventDefault();
                        handleConfirm();
                    }
                }, true);
            }

            function init(){
                bind();
                ensureOptions();
                const stored = __sanitizePvpLoadouts(safeLoadStored() || __getPvpDefaultLoadout());
                writeUI(stored);
                window.addEventListener('tank:langchange', () => {
                    ensureOptions();
                    renderAllInfo();
                });
            }

            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
            else setTimeout(init, 0);

            try {
                const __app = window.App || (window.App = {});
                __app.actions = __app.actions || {};
                __app.actions.openPvpLoadoutModal = open;
                __app.actions.closePvpLoadoutModal = close;
            } catch(e){}
            window.openPvpLoadoutModal = open;
            window.closePvpLoadoutModal = close;
            window.__readPvpLoadoutUI = readUI;
            window.__writePvpLoadoutUI = writeUI;
        })();

