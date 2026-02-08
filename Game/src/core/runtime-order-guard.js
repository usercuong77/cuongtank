// === Runtime Order Guard ===
// Runs last to verify runtime script order stays stable after refactors.
(() => {
    const root = window;
    const App = root.App || (root.App = {});
    App.meta = App.meta || {};
    App.boot = App.boot || {};

    if (typeof App.boot.verifyRuntimeScriptOrder !== 'function') return;

    let report = null;
    try {
        report = App.boot.verifyRuntimeScriptOrder();
    } catch (e) {
        report = { ok: false, error: String(e && e.message ? e.message : e) };
        App.meta.runtimeOrder = report;
    }

    try {
        if (!report || !report.ok) {
            console.error('[Runtime] Script order check failed.', report);
        }
        root.dispatchEvent(new CustomEvent('tank:runtime-order-check', {
            detail: report || { ok: false }
        }));
    } catch (e) {}
})();
