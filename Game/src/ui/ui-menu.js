// === Start Mode Selector + PvP Preload Config ===
        (function(){
            const STORAGE_KEY = 'tankStartMode_v1';
            const $ = (id)=>document.getElementById(id);
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
            function __sanitizePvpLoadouts(raw){
                try {
                    const rt = __getRuntime();
                    if (rt && typeof rt.sanitizePvpLoadouts === 'function') return rt.sanitizePvpLoadouts(raw);
                } catch(e){}
                try { if (typeof sanitizePvpLoadouts === 'function') return sanitizePvpLoadouts(raw); } catch(e){}
                const fb = __getPvpDefaultLoadout();
                return {
                    p1: {
                        ammo: (raw && raw.p1 && raw.p1.ammo) ? raw.p1.ammo : fb.p1.ammo,
                        items: (raw && raw.p1 && Array.isArray(raw.p1.items) && raw.p1.items.length) ? raw.p1.items.slice(0, 3) : (fb.p1.items || []).slice(0, 3)
                    },
                    p2: {
                        ammo: (raw && raw.p2 && raw.p2.ammo) ? raw.p2.ammo : fb.p2.ammo,
                        items: (raw && raw.p2 && Array.isArray(raw.p2.items) && raw.p2.items.length) ? raw.p2.items.slice(0, 3) : (fb.p2.items || []).slice(0, 3)
                    }
                };
            }
            function __notifyStartSaveUi(){
                try {
                    const rt = __getRuntime();
                    if (rt && typeof rt.updateStartSaveUI === 'function') { rt.updateStartSaveUI(); return; }
                } catch(e){}
                try { if (window.__updateStartSaveUI) window.__updateStartSaveUI(); } catch(e){}
            }

            function getRadioValue(name, fallback){
                const el = document.querySelector('input[name="'+name+'"]:checked');
                return el ? el.value : fallback;
            }
            function setRadioValue(name, value){
                const els = document.querySelectorAll('input[name="'+name+'"]');
                els && els.forEach(r=>{ r.checked = (r.value === value); });
            }

            function pvpSelectIds(){
                return {
                    p1Ammo: 'pvpP1Ammo', p2Ammo: 'pvpP2Ammo',
                    p1Items: ['pvpP1Item1','pvpP1Item2','pvpP1Item3'],
                    p2Items: ['pvpP2Item1','pvpP2Item2','pvpP2Item3']
                };
            }

            function fillSelect(el, list){
                if (!el) return;
                const prev = el.value;
                el.innerHTML = '';
                for (let i = 0; i < list.length; i++) {
                    const it = list[i];
                    const opt = document.createElement('option');
                    opt.value = it.id;
                    opt.textContent = it.label;
                    el.appendChild(opt);
                }
                if (prev && el.querySelector('option[value="' + prev + '"]')) el.value = prev;
            }

            function ensurePvpSelectOptions(){
                const ids = pvpSelectIds();
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

                fillSelect($(ids.p1Ammo), ammoList);
                fillSelect($(ids.p2Ammo), ammoList);
                for (let i = 0; i < ids.p1Items.length; i++) fillSelect($(ids.p1Items[i]), itemList);
                for (let i = 0; i < ids.p2Items.length; i++) fillSelect($(ids.p2Items[i]), itemList);
            }

            function normalizeSideItems(side){
                const ids = pvpSelectIds();
                const itemIds = (side === 'p2') ? ids.p2Items : ids.p1Items;
                const pvpItemTypes = __getPvpItemTypes();
                const all = Object.keys(pvpItemTypes || {});
                const used = {};
                for (let i = 0; i < itemIds.length; i++) {
                    const el = $(itemIds[i]);
                    if (!el) continue;
                    let val = String(el.value || '');
                    if (!pvpItemTypes[val] || used[val]) {
                        val = '';
                        for (let j = 0; j < all.length; j++) {
                            const cand = all[j];
                            if (!used[cand]) { val = cand; break; }
                        }
                        if (val) el.value = val;
                    }
                    if (val) used[val] = true;
                }
            }

            function readPvpLoadoutUI(){
                const ids = pvpSelectIds();
                const readSelectValue = (id, fallback) => {
                    const el = $(id);
                    return (el && el.value) ? el.value : fallback;
                };
                const readItems = (itemIds) => itemIds.map(id => readSelectValue(id, '')).filter(Boolean);
                const raw = {
                    p1: {
                        ammo: readSelectValue(ids.p1Ammo, 'ap40'),
                        items: readItems(ids.p1Items)
                    },
                    p2: {
                        ammo: readSelectValue(ids.p2Ammo, 'jammer'),
                        items: readItems(ids.p2Items)
                    }
                };
                return __sanitizePvpLoadouts(raw);
            }

            function writePvpLoadoutUI(raw){
                ensurePvpSelectOptions();
                const ids = pvpSelectIds();
                const cfg = __sanitizePvpLoadouts(raw || __getPvpDefaultLoadout());
                if ($(ids.p1Ammo)) $(ids.p1Ammo).value = cfg.p1.ammo;
                if ($(ids.p2Ammo)) $(ids.p2Ammo).value = cfg.p2.ammo;
                for (let i = 0; i < ids.p1Items.length; i++) {
                    if ($(ids.p1Items[i])) $(ids.p1Items[i]).value = cfg.p1.items[i] || cfg.p1.items[0];
                }
                for (let i = 0; i < ids.p2Items.length; i++) {
                    if ($(ids.p2Items[i])) $(ids.p2Items[i]).value = cfg.p2.items[i] || cfg.p2.items[0];
                }
                normalizeSideItems('p1');
                normalizeSideItems('p2');
            }

            function readCfg(){
                const difficulty = getRadioValue('modeDifficulty','hard');
                const players = parseInt(getRadioValue('modePlayers','1'),10) || 1;
                const p2Mode = getRadioValue('mode2p','coop');
                const p2System = ($('p2SystemSelect') && $('p2SystemSelect').value) ? $('p2SystemSelect').value : 'default';
                const pvpLoadout = readPvpLoadoutUI();
                return { difficulty, players, p2Mode, p2System, pvpLoadout };
            }

            function refreshUI(){
                const tr = (k, vars) => {
                    try { return window.t ? window.t(k, vars) : k; } catch(e){ return k; }
                };
                const cfg = readCfg();
                const toggleHidden = (id, hidden) => {
                    const el = $(id);
                    if (el) el.classList.toggle('hidden', !!hidden);
                };
                const modeNoteKey = () => {
                    if (cfg.players === 1) return (cfg.difficulty === 'easy') ? 'mode.noteEasy' : 'mode.noteHard';
                    return (cfg.p2Mode === 'pvp') ? 'mode.notePvp' : 'mode.noteCoop';
                };
                toggleHidden('p2SystemRow', cfg.players !== 2);
                toggleHidden('difficultySeg', cfg.players !== 1);
                toggleHidden('p2ModeSeg', cfg.players === 1);
                const variantLabel = $('modeVariantLabel');
                if (variantLabel) variantLabel.textContent = tr(cfg.players === 1 ? 'start.modeDifficulty' : 'start.mode2p');
                toggleHidden('pvpLoadoutRow', true);
                toggleHidden('pvpLoadoutHint', true);
                const note = $('modeNote');
                if (note) note.textContent = tr(modeNoteKey());
            }

            function save(){
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(readCfg())); } catch(e){}
            }

            function load(){
                let cfg = null;
                try {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    if (raw){
                        cfg = JSON.parse(raw);
                        if (cfg && typeof cfg === 'object'){
                            if (cfg.difficulty) setRadioValue('modeDifficulty', String(cfg.difficulty));
                            if (cfg.players) setRadioValue('modePlayers', String(cfg.players));
                            if (cfg.p2Mode) setRadioValue('mode2p', String(cfg.p2Mode));
                            const p2Sel = $('p2SystemSelect');
                            if (p2Sel && cfg.p2System) p2Sel.value = String(cfg.p2System);
                        }
                    }
                } catch(e){}

                ensurePvpSelectOptions();
                let rawPvp = null;
                try { const rp = localStorage.getItem(__getPvpLoadoutStorageKey()); if (rp) rawPvp = JSON.parse(rp); } catch(e){}
                if (!rawPvp && cfg && cfg.pvpLoadout) rawPvp = cfg.pvpLoadout;
                writePvpLoadoutUI(rawPvp || __getPvpDefaultLoadout());
                refreshUI();
            }

            // Hook listeners
            const radios = document.querySelectorAll('input[name="modeDifficulty"], input[name="modePlayers"], input[name="mode2p"]');
            radios && radios.forEach(r=>{
                r.addEventListener('change', ()=>{ refreshUI(); save(); __notifyStartSaveUi(); });
            });
            const p2Sel = $('p2SystemSelect');
            p2Sel && p2Sel.addEventListener('change', ()=>{ save(); __notifyStartSaveUi(); });

            const ids = pvpSelectIds();
            const allPvpSelects = [ids.p1Ammo, ids.p2Ammo].concat(ids.p1Items).concat(ids.p2Items);
            allPvpSelects.forEach((id)=>{
                const el = $(id);
                if (!el) return;
                el.addEventListener('change', ()=>{
                    normalizeSideItems('p1');
                    normalizeSideItems('p2');
                    save();
                });
            });

            load();
            window.addEventListener('tank:langchange', () => {
                ensurePvpSelectOptions();
                refreshUI();
            });

            // Expose for startGame to read
            window.__readPvpLoadoutUI = readPvpLoadoutUI;
            window.__writePvpLoadoutUI = writePvpLoadoutUI;
            window.__readStartModeCfg = readCfg;
            try {
                const __app = window.App || (window.App = {});
                __app.actions = __app.actions || {};
                __app.actions.readPvpLoadoutUI = readPvpLoadoutUI;
                __app.actions.writePvpLoadoutUI = writePvpLoadoutUI;
                __app.actions.readStartModeCfg = readCfg;
            } catch(e){}
        })();

