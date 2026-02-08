// === Tank Systems + Skill Framework === // Hệ xe + khung kỹ năng
(() => {
    const root = window;
    const app = root.App || (root.App = {});
    app.data = app.data || {};

    const fallbackDefaultSystem = {
        id: 'default',
        name: 'Hệ Chiến Binh',
        skills: {
            clone:     { key: 'Q', labelHTML: 'Phân<br>Thân', color: '#29B6F6', cooldown: SKILL_CONFIG.CLONE.cooldown, duration: SKILL_CONFIG.CLONE.duration },
            stealth:   { key: 'E', labelHTML: 'Tàng<br>Hình', color: '#AB47BC', cooldown: SKILL_CONFIG.STEALTH.cooldown, duration: SKILL_CONFIG.STEALTH.duration },
            vampirism: { key: 'R', labelHTML: 'Hút<br>Máu',   color: '#FF5252', cooldown: SKILL_CONFIG.VAMPIRISM.cooldown, duration: SKILL_CONFIG.VAMPIRISM.duration }
        }
    };

    function getSkillData() {
        return app.data.skillSystems || {};
    }

    function getTankSystemsMap() {
        const map = getSkillData().tankSystems || {};
        if (map.default) return map;
        return Object.assign({ default: fallbackDefaultSystem }, map);
    }

    function getTankSystem(id) {
        const systems = getTankSystemsMap();
        return systems[id] || systems.default || fallbackDefaultSystem;
    }

    function getAssassinPvpSkillCooldowns() {
        return getSkillData().assassinPvpSkillCooldowns || { clone: 6100, stealth: 12500, vampirism: 21000 };
    }

    function getSystemSkillLabelHtmlEn() {
        return getSkillData().systemSkillLabelHtmlEn || {};
    }

    function getLocalizedSkillLabelHTML(systemId, skillKey) {
        try {
            const lang = (window.I18N && typeof window.I18N.lang === 'function') ? window.I18N.lang() : 'vi';
            if (lang !== 'en') return null;
        } catch (e) {
            return null;
        }
        const labels = getSystemSkillLabelHtmlEn();
        const bySys = labels[systemId] || labels.default || {};
        return bySys[skillKey] || null;
    }

    function isPvpDuelAimMode() {
        return !!(typeof Game !== 'undefined' && Game && Game.mode === 'PVP_DUEL_AIM');
    }

    function applyNonPvpBalanceV1(systemId, skillKey, baseDef) {
        if (!baseDef || isPvpDuelAimMode()) return baseDef;

        // Balance package V1: applies only when mode !== 'PVP_DUEL_AIM'.
        if (systemId === 'mage' && skillKey === 'clone') {
            return Object.assign({}, baseDef, { fireballDmgMult: 2.9, explosionRadius: 280 });
        }
        if (systemId === 'mage' && skillKey === 'vampirism') {
            return Object.assign({}, baseDef, { tickDamage: 24 });
        }
        if (systemId === 'juggernaut' && skillKey === 'stealth') {
            return Object.assign({}, baseDef, { cooldown: 6800 });
        }
        if (systemId === 'juggernaut' && skillKey === 'vampirism') {
            return Object.assign({}, baseDef, { cooldown: 21000, duration: 7000 });
        }
        if (systemId === 'assassin' && skillKey === 'clone') {
            return Object.assign({}, baseDef, { cooldown: 5000 });
        }
        if (systemId === 'assassin' && skillKey === 'vampirism') {
            return Object.assign({}, baseDef, { cooldown: 17500 });
        }
        if (systemId === 'speed' && skillKey === 'clone') {
            return Object.assign({}, baseDef, { cooldown: 2600 });
        }
        if (systemId === 'speed' && skillKey === 'vampirism') {
            return Object.assign({}, baseDef, { cooldown: 12500, damageMult: 1.35 });
        }
        if (systemId === 'engineer' && skillKey === 'clone') {
            return Object.assign({}, baseDef, { bulletDmgMult: 0.60 });
        }
        if (systemId === 'engineer' && skillKey === 'stealth') {
            return Object.assign({}, baseDef, { healPct: 0.26 });
        }
        return baseDef;
    }

    function getSystemSkillDef(systemId, skillKey) {
        const sys = getTankSystem(systemId);
        const fallbackDefault = getTankSystem('default');
        const base = (sys && sys.skills && sys.skills[skillKey])
            ? sys.skills[skillKey]
            : (fallbackDefault && fallbackDefault.skills ? fallbackDefault.skills[skillKey] : null);
        if (!base) return base;

        const __isPvpMode = isPvpDuelAimMode();
        let out = applyNonPvpBalanceV1(systemId, skillKey, base);

        if (systemId === 'assassin' && __isPvpMode) {
            const cd = getAssassinPvpSkillCooldowns()[skillKey];
            if (typeof cd === 'number') out = Object.assign({}, out, { cooldown: cd });
        }
        const localizedLabelHTML = getLocalizedSkillLabelHTML(systemId, skillKey);
        if (localizedLabelHTML) out = Object.assign({}, out, { labelHTML: localizedLabelHTML });
        return out;
    }

    function getSystemSkillCooldowns(systemId) {
        const sid = systemId || 'default';
        return {
            clone: (getSystemSkillDef(sid, 'clone') || {}).cooldown || 0,
            stealth: (getSystemSkillDef(sid, 'stealth') || {}).cooldown || 0,
            vampirism: (getSystemSkillDef(sid, 'vampirism') || {}).cooldown || 0
        };
    }

    // Expose skill resolvers via App/runtime with global aliases.
    try {
        const tankSystemsMap = getTankSystemsMap();
        const labelMap = getSystemSkillLabelHtmlEn();
        const assassinPvpCooldownMap = getAssassinPvpSkillCooldowns();
        const runtimeExports = {
            getTankSystem: getTankSystem,
            getSystemSkillDef: getSystemSkillDef,
            getSystemSkillCooldowns: getSystemSkillCooldowns
        };
        const rulesExports = {
            systems: tankSystemsMap,
            systemSkillLabelEn: labelMap,
            assassinPvpSkillCooldowns: assassinPvpCooldownMap
        };
        // Backward-compatible globals used by older QA/game helpers.
        const globalExports = {
            getTankSystem: getTankSystem,
            getSystemSkillDef: getSystemSkillDef,
            getSystemSkillCooldowns: getSystemSkillCooldowns,
            SYSTEM_SKILL_LABEL_HTML_EN: labelMap,
            ASSASSIN_PVP_SKILL_COOLDOWNS: assassinPvpCooldownMap
        };

        if (app.compat && typeof app.compat.expose === 'function') {
            app.compat.expose({
                runtime: runtimeExports,
                rules: rulesExports,
                globals: globalExports
            });
        } else {
            app.runtime = app.runtime || {};
            app.rules = app.rules || {};
            Object.keys(runtimeExports).forEach((k) => { app.runtime[k] = runtimeExports[k]; });
            Object.keys(rulesExports).forEach((k) => { app.rules[k] = rulesExports[k]; });
            Object.keys(globalExports).forEach((k) => { window[k] = globalExports[k]; });
        }
    } catch (e) {}
})();
