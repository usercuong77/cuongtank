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

    function getSystemSkillDef(systemId, skillKey) {
        const sys = getTankSystem(systemId);
        const fallbackDefault = getTankSystem('default');
        const base = (sys && sys.skills && sys.skills[skillKey])
            ? sys.skills[skillKey]
            : (fallbackDefault && fallbackDefault.skills ? fallbackDefault.skills[skillKey] : null);
        if (!base) return base;

        let out = base;
        if (systemId === 'assassin' && typeof Game !== 'undefined' && Game && Game.mode === 'PVP_DUEL_AIM') {
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
        app.runtime = app.runtime || {};
        app.rules = app.rules || {};
        const tankSystemsMap = getTankSystemsMap();
        const labelMap = getSystemSkillLabelHtmlEn();
        const assassinPvpCooldownMap = getAssassinPvpSkillCooldowns();
        app.runtime.getTankSystem = getTankSystem;
        app.runtime.getSystemSkillDef = getSystemSkillDef;
        app.runtime.getSystemSkillCooldowns = getSystemSkillCooldowns;
        app.rules.systems = tankSystemsMap;
        app.rules.systemSkillLabelEn = labelMap;
        app.rules.assassinPvpSkillCooldowns = assassinPvpCooldownMap;
        window.getTankSystem = getTankSystem;
        window.getSystemSkillDef = getSystemSkillDef;
        window.getSystemSkillCooldowns = getSystemSkillCooldowns;
        // Backward-compatible globals used by older QA/game helpers.
        window.SYSTEM_SKILL_LABEL_HTML_EN = labelMap;
        window.ASSASSIN_PVP_SKILL_COOLDOWNS = assassinPvpCooldownMap;
    } catch (e) {}
})();
