// === PvP Tuning Data (config-only) ===
(() => {
    const root = window;
    const app = root.App || (root.App = {});
    app.data = app.data || {};

    const fallbackPassive = Object.freeze({
        defaultHitsReq: 5,
        defaultSlowMs: 800,
        defaultSlowFactor: 0.88,
        engineerSkillMarkBonus: 1.08,
        mageStackReq: 4,
        mageBurstDamage: 22,
        mageBurstRadius: 95,
        mageBurstSplashMult: 0.60
    });

    const fallback = Object.freeze({
        aimLeadMaxMs: 390,
        aimLeadFactor: 1.34,
        aimMaxTurn: 0.17,
        easyAutoAimLeadBlend: 0.55,
        coopAutoAimLeadBlend: 0.30,
        autoAimLeadMaxMs: 300,
        skillDamageMult: 0.85,
        hardCcCapMs: 1000,
        hardCcDrWindowMs: 3000,
        hardCcDrMult: 0.60,
        skillGlobalLockoutMs: 300,
        loadoutStorageKey: 'tankPvpLoadout_v1',
        passive: fallbackPassive
    });

    const source = (typeof PVP_CONFIG !== 'undefined' && PVP_CONFIG) ? PVP_CONFIG : fallback;
    const sourcePassive = (source && source.passive) ? source.passive : fallbackPassive;

    const pvpTuning = Object.freeze({
        aimLeadMaxMs: Number(source.aimLeadMaxMs != null ? source.aimLeadMaxMs : fallback.aimLeadMaxMs),
        aimLeadFactor: Number(source.aimLeadFactor != null ? source.aimLeadFactor : fallback.aimLeadFactor),
        aimMaxTurn: Number(source.aimMaxTurn != null ? source.aimMaxTurn : fallback.aimMaxTurn),
        easyAutoAimLeadBlend: Number(source.easyAutoAimLeadBlend != null ? source.easyAutoAimLeadBlend : fallback.easyAutoAimLeadBlend),
        coopAutoAimLeadBlend: Number(source.coopAutoAimLeadBlend != null ? source.coopAutoAimLeadBlend : fallback.coopAutoAimLeadBlend),
        autoAimLeadMaxMs: Number(source.autoAimLeadMaxMs != null ? source.autoAimLeadMaxMs : fallback.autoAimLeadMaxMs),
        skillDamageMult: Number(source.skillDamageMult != null ? source.skillDamageMult : fallback.skillDamageMult),
        hardCcCapMs: Number(source.hardCcCapMs != null ? source.hardCcCapMs : fallback.hardCcCapMs),
        hardCcDrWindowMs: Number(source.hardCcDrWindowMs != null ? source.hardCcDrWindowMs : fallback.hardCcDrWindowMs),
        hardCcDrMult: Number(source.hardCcDrMult != null ? source.hardCcDrMult : fallback.hardCcDrMult),
        skillGlobalLockoutMs: Number(source.skillGlobalLockoutMs != null ? source.skillGlobalLockoutMs : fallback.skillGlobalLockoutMs),
        loadoutStorageKey: String(source.loadoutStorageKey || fallback.loadoutStorageKey),
        passive: Object.freeze({
            defaultHitsReq: Number(sourcePassive.defaultHitsReq != null ? sourcePassive.defaultHitsReq : fallbackPassive.defaultHitsReq),
            defaultSlowMs: Number(sourcePassive.defaultSlowMs != null ? sourcePassive.defaultSlowMs : fallbackPassive.defaultSlowMs),
            defaultSlowFactor: Number(sourcePassive.defaultSlowFactor != null ? sourcePassive.defaultSlowFactor : fallbackPassive.defaultSlowFactor),
            engineerSkillMarkBonus: Number(sourcePassive.engineerSkillMarkBonus != null ? sourcePassive.engineerSkillMarkBonus : fallbackPassive.engineerSkillMarkBonus),
            mageStackReq: Number(sourcePassive.mageStackReq != null ? sourcePassive.mageStackReq : fallbackPassive.mageStackReq),
            mageBurstDamage: Number(sourcePassive.mageBurstDamage != null ? sourcePassive.mageBurstDamage : fallbackPassive.mageBurstDamage),
            mageBurstRadius: Number(sourcePassive.mageBurstRadius != null ? sourcePassive.mageBurstRadius : fallbackPassive.mageBurstRadius),
            mageBurstSplashMult: Number(sourcePassive.mageBurstSplashMult != null ? sourcePassive.mageBurstSplashMult : fallbackPassive.mageBurstSplashMult)
        })
    });

    app.data.pvpTuning = pvpTuning;
    app.config = app.config || {};
    app.config.pvpTuning = pvpTuning;

    // Backward-compatible global alias.
    root.PVP_TUNING_CONFIG = pvpTuning;
})();
