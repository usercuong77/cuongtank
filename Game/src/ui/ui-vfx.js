// === Combat VFX Module ===
// Extracted from core-ui-vfx to keep runtime modules smaller and easier to maintain.

// === Canvas roundRect Polyfill ===
(() => {
  try {
    if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        r = (typeof r === 'number') ? r : 0;
        r = Math.max(0, r);
        const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        this.moveTo(x + rr, y);
        this.arcTo(x + w, y, x + w, y + h, rr);
        this.arcTo(x + w, y + h, x, y + h, rr);
        this.arcTo(x, y + h, x, y, rr);
        this.arcTo(x, y, x + w, y, rr);
        this.closePath();
        return this;
      };
    }
  } catch (e) {}
})();

// === Graphics Config ===
const __VFX_GFX_FALLBACK = {
    SYSTEMS: {
        default: {
            body: ['#1B5E20', '#2E7D32', '#66BB6A'],
            turret: ['#0E3B14', '#1B5E20'],
            glow: 'rgba(76, 175, 80, 0.32)',
            accent: '#FF5252',
            track: '#121212',
            trackDetail: '#2b2b2b'
        }
    },
    PLAYER: {
        body: ['#1B5E20', '#2E7D32', '#66BB6A'],
        turret: ['#0E3B14', '#1B5E20'],
        glow: 'rgba(76, 175, 80, 0.32)',
        accent: '#FF5252',
        track: '#121212',
        trackDetail: '#2b2b2b'
    },
    CLONE: {
        body: ['#0277BD', '#29B6F6', '#4FC3F7'],
        turret: ['#01579B', '#0277BD'],
        glow: 'rgba(41, 182, 246, 0.4)',
        accent: '#81D4FA',
        track: '#101820',
        trackDetail: '#1b2b3a'
    },
    ENEMIES: {
        RED: { body: ['#C62828', '#E53935', '#EF5350'], glow: 'rgba(229, 57, 53, 0.4)' },
        BOSS: { body: ['#B71C1C', '#D32F2F', '#F44336'], core: ['#FF6F00', '#FF8F00', '#FFA000'], glow: 'rgba(244, 67, 54, 0.5)' }
    }
};
const GFX = (window.App && window.App.data && window.App.data.vfxGfx)
    ? window.App.data.vfxGfx
    : (window.VFX_GFX_DATA || __VFX_GFX_FALLBACK);

// Phase 3: App runtime/config resolvers with global fallback.
function __getRuntime() {
    try { return (window && window.App && window.App.runtime) ? window.App.runtime : null; } catch (e) { return null; }
}
function __getConfig() {
    try { return (window && window.App && window.App.config) ? window.App.config : null; } catch (e) { return null; }
}
function __getGame() {
    try {
        const rt = __getRuntime();
        if (rt && rt.Game) return rt.Game;
        return (typeof Game !== 'undefined') ? Game : null;
    } catch (e) { return null; }
}
function __getCamera() {
    try {
        const rt = __getRuntime();
        if (rt && rt.Camera) return rt.Camera;
        return (typeof Camera !== 'undefined') ? Camera : null;
    } catch (e) { return null; }
}
function __getMax() {
    try {
        const rt = __getRuntime();
        if (rt && rt.MAX) return rt.MAX;
        return (typeof MAX !== 'undefined') ? MAX : null;
    } catch (e) { return null; }
}
function __getSystemSkillDefFn() {
    try {
        const rt = __getRuntime();
        if (rt && typeof rt.getSystemSkillDef === 'function') return rt.getSystemSkillDef;
    } catch (e) {}
    try { if (typeof getSystemSkillDef === 'function') return getSystemSkillDef; } catch (e) {}
    return null;
}
function __getEnemyCtor() {
    try {
        const rt = __getRuntime();
        if (rt && rt.Enemy) return rt.Enemy;
        return (typeof Enemy !== 'undefined') ? Enemy : null;
    } catch (e) { return null; }
}
function __getPvpItemTypes() {
    try {
        const cfg = __getConfig();
        if (cfg && cfg.pvpItemTypes) return cfg.pvpItemTypes;
    } catch (e) {}
    try { if (typeof PVP_ITEM_TYPES !== 'undefined') return PVP_ITEM_TYPES; } catch (e) {}
    return {};
}

// === Rendering Utilities + Sprite Cache Helpers ===
function createTankGradient(x, y, radius, colors) {
    const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius * 1.5);
    gradient.addColorStop(0, colors[2] || colors[1] || colors[0]);
    gradient.addColorStop(0.5, colors[1] || colors[0]);
    gradient.addColorStop(1, colors[0]);
    return gradient;
}

function __normHex6(c) {
    if (typeof c !== 'string') return null;
    const s = c.trim();
    if (s[0] !== '#') return null;
    const raw = s.slice(1);
    if (/^[0-9a-fA-F]{3}$/.test(raw)) {
        return '#' + raw.split('').map(ch => ch + ch).join('');
    }
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return '#' + raw;
    if (/^[0-9a-fA-F]{8}$/.test(raw)) return '#' + raw.slice(0, 6); // drop alpha
    return null;
}

function __colorWithAlpha(color, a) {
    a = Math.max(0, Math.min(1, a));
    if (typeof color !== 'string') return `rgba(255,255,255,${a})`;
    const s = color.trim();

    const m = s.match(/^rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
    if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})`;

    const h = __normHex6(s);
    if (h) {
        const r = parseInt(h.slice(1, 3), 16);
        const g = parseInt(h.slice(3, 5), 16);
        const b = parseInt(h.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    return s;
}

function __safeColor(color, fallback) {
    fallback = fallback || '#FFFFFF';
    if (typeof color !== 'string') return fallback;
    const s = color.trim();

    if (s[0] === '#') {
        const h = __normHex6(s);
        return h || fallback;
    }

    if (s.startsWith('rgb') || s === 'transparent') return s;

    // named colors: best-effort
    return s || fallback;
}


// === Juggernaut FX Cache (Q shield + E ram) ===
const __JUGGER_FX = { shield: new Map(), ramTrail: null, ramTrailDpr: 0 };

function __getJuggerShieldSprite(baseR, dpr) {
    try {
        dpr = (dpr || 1);
        const key = Math.round(baseR) + '@' + dpr;
        if (__JUGGER_FX.shield.has(key)) return __JUGGER_FX.shield.get(key);

        const pad = 24;
        const size = Math.ceil((baseR + pad) * 2 * dpr);
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const g = c.getContext('2d');
        g.clearRect(0, 0, size, size);
        g.save();
        g.translate(size / 2, size / 2);
        g.scale(dpr, dpr);

        const TAU = Math.PI * 2;
        // metal gradient for plates
        const rg = g.createRadialGradient(-baseR * 0.25, -baseR * 0.25, 0, 0, 0, baseR * 1.35);
        rg.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
        rg.addColorStop(0.35, 'rgba(255, 213, 79, 0.95)');
        rg.addColorStop(0.75, 'rgba(255, 152, 0, 0.75)');
        rg.addColorStop(1, 'rgba(120, 70, 0, 0.55)');

        // segmented ring (armor plates)
        const segs = 12;
        for (let i = 0; i < segs; i++) {
            const a0 = (i / segs) * TAU;
            const a1 = a0 + (TAU / segs) * 0.78;
            g.strokeStyle = rg;
            g.lineCap = 'round';
            g.lineWidth = 7.5;
            g.beginPath();
            g.arc(0, 0, baseR, a0, a1);
            g.stroke();

            // plate rivet
            const am = (a0 + a1) * 0.5;
            const rx = Math.cos(am) * (baseR - 2);
            const ry = Math.sin(am) * (baseR - 2);
            g.fillStyle = 'rgba(0,0,0,0.35)';
            g.beginPath();
            g.arc(rx + 1, ry + 1, 2.8, 0, TAU);
            g.fill();
            g.fillStyle = 'rgba(255, 248, 225, 0.85)';
            g.beginPath();
            g.arc(rx, ry, 2.5, 0, TAU);
            g.fill();
        }

        // inner ring
        g.strokeStyle = 'rgba(255, 248, 225, 0.35)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, baseR - 9, 0, TAU);
        g.stroke();

        // outer rim
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(0, 0, baseR + 7, 0, TAU);
        g.stroke();

        // spikes (symbolize reflect)
        g.fillStyle = 'rgba(255, 193, 7, 0.65)';
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const ang = i * (Math.PI / 2) + Math.PI / 4;
            const sx = Math.cos(ang) * (baseR + 5);
            const sy = Math.sin(ang) * (baseR + 5);
            const nx = Math.cos(ang);
            const ny = Math.sin(ang);
            const px = -ny;
            const py = nx;
            g.beginPath();
            g.moveTo(sx + px * 4, sy + py * 4);
            g.lineTo(sx + nx * 13, sy + ny * 13);
            g.lineTo(sx - px * 4, sy - py * 4);
            g.closePath();
            g.fill();
            g.stroke();
        }

        // subtle notch ticks
        g.globalAlpha = 0.22;
        g.strokeStyle = 'rgba(255, 235, 59, 0.9)';
        g.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const ang = i * (TAU / 8);
            const x0 = Math.cos(ang) * (baseR - 2);
            const y0 = Math.sin(ang) * (baseR - 2);
            const x1 = Math.cos(ang) * (baseR + 10);
            const y1 = Math.sin(ang) * (baseR + 10);
            g.beginPath();
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
            g.stroke();
        }
        g.globalAlpha = 1;

        g.restore();

        const out = { c, baseR, size: size / dpr };
        __JUGGER_FX.shield.set(key, out);
        return out;
    } catch (e) {
        return null;
    }
}

function __getJuggerRamTrailSprite(dpr) {
    dpr = (dpr || 1);
    if (__JUGGER_FX.ramTrail && __JUGGER_FX.ramTrailDpr === dpr) return __JUGGER_FX.ramTrail;

    const w = Math.round(260 * dpr);
    const h = Math.round(90 * dpr);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.clearRect(0, 0, w, h);

    // outer glow ribbon
    let lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, 'rgba(255,193,7,0)');
    lg.addColorStop(0.20, 'rgba(255,193,7,0.22)');
    lg.addColorStop(0.55, 'rgba(255,152,0,0.18)');
    lg.addColorStop(1, 'rgba(255,152,0,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.ellipse(w * 0.58, h * 0.5, w * 0.58, h * 0.34, 0, 0, Math.PI * 2);
    g.fill();

    // core streak
    lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.18, 'rgba(255,255,255,0.22)');
    lg.addColorStop(0.55, 'rgba(255,235,59,0.18)');
    lg.addColorStop(1, 'rgba(255,235,59,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.ellipse(w * 0.62, h * 0.5, w * 0.56, h * 0.12, 0, 0, Math.PI * 2);
    g.fill();

    __JUGGER_FX.ramTrail = { c, w: w / dpr, h: h / dpr };
    __JUGGER_FX.ramTrailDpr = dpr;
    return __JUGGER_FX.ramTrail;
}



// === Blizzard FX Cache (Mage R) ===
const __BLZ_FX = { fogA: new Map(), fogB: new Map(), wall: new Map(), streak: null, streakDpr: 0 };

function __getBlizzardStreakSprite(dpr) {
    dpr = (dpr || 1);
    if (__BLZ_FX.streak && __BLZ_FX.streakDpr === dpr) return __BLZ_FX.streak;

    const w = Math.round(140 * dpr);
    const h = Math.round(22 * dpr);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.clearRect(0, 0, w, h);

    // long streak gradient (transparent -> white/blue -> transparent)
    const lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.12, 'rgba(255,255,255,0.30)');
    lg.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    lg.addColorStop(0.55, 'rgba(0,229,255,0.35)');
    lg.addColorStop(0.75, 'rgba(255,255,255,0.35)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');

    g.fillStyle = lg;
    g.beginPath();
    g.ellipse(w * 0.55, h * 0.5, w * 0.52, h * 0.22, 0, 0, Math.PI * 2);
    g.fill();

    // thin core line
    g.globalAlpha = 0.65;
    const lg2 = g.createLinearGradient(0, 0, w, 0);
    lg2.addColorStop(0, 'rgba(255,255,255,0)');
    lg2.addColorStop(0.20, 'rgba(255,255,255,0.55)');
    lg2.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    lg2.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = lg2;
    g.lineWidth = Math.max(1, 2 * dpr);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(w * 0.08, h * 0.5);
    g.lineTo(w * 0.94, h * 0.5);
    g.stroke();
    g.globalAlpha = 1;

    __BLZ_FX.streak = { c, w: w / dpr, h: h / dpr };
    __BLZ_FX.streakDpr = dpr;
    return __BLZ_FX.streak;
}

function __getBlizzardFogSprite(radius, variant, dpr) {
    try {
        dpr = (dpr || 1);
        const key = Math.round(radius) + '_v' + (variant || 0) + '@' + dpr;
        const map = (variant === 1) ? __BLZ_FX.fogB : __BLZ_FX.fogA;
        if (map.has(key)) return map.get(key);

        const pad = radius * 0.42 + 34;
        const R = radius + pad;
        const size = Math.ceil((R * 2) * dpr);
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const g = c.getContext('2d');
        g.clearRect(0, 0, size, size);

        g.save();
        g.translate(size / 2, size / 2);
        g.scale(dpr, dpr);

        const TAU = Math.PI * 2;

        // base mist
        const rg = g.createRadialGradient(-radius * 0.22, -radius * 0.22, 0, 0, 0, R);
        if (variant === 1) {
            rg.addColorStop(0, 'rgba(255,255,255,0.10)');
            rg.addColorStop(0.35, 'rgba(255,255,255,0.07)');
            rg.addColorStop(0.75, 'rgba(0,229,255,0.045)');
        } else {
            rg.addColorStop(0, 'rgba(0,229,255,0.08)');
            rg.addColorStop(0.40, 'rgba(255,255,255,0.06)');
            rg.addColorStop(0.80, 'rgba(255,255,255,0.03)');
        }
        rg.addColorStop(1, 'rgba(0,0,0,0)');

        g.fillStyle = rg;
        g.beginPath();
        g.arc(0, 0, R, 0, TAU);
        g.fill();

        // swirl arcs (painted once)
        g.lineCap = 'round';
        g.strokeStyle = (variant === 1) ? 'rgba(255,255,255,0.065)' : 'rgba(255,255,255,0.055)';
        g.lineWidth = (variant === 1) ? 2.1 : 1.6;
        const arcs = 30;
        for (let i = 0; i < arcs; i++) {
            const rr = radius * (0.25 + (i / arcs) * 0.92) + (i % 3) * 2;
            const a0 = (i * 0.37) % TAU;
            const a1 = a0 + (0.45 + (i % 5) * 0.07);
            g.beginPath();
            g.arc(0, 0, rr, a0, a1);
            g.stroke();
        }

        // snow speckles
        const dots = 110;
        for (let i = 0; i < dots; i++) {
            const pr = Math.sqrt(Math.random()) * radius * 1.05;
            const pa = Math.random() * TAU;
            const px = Math.cos(pa) * pr;
            const py = Math.sin(pa) * pr;
            const s = 0.8 + Math.random() * 1.8;
            g.fillStyle = (Math.random() < 0.25) ? 'rgba(0,229,255,0.10)' : 'rgba(255,255,255,0.12)';
            g.beginPath();
            g.arc(px, py, s, 0, TAU);
            g.fill();
        }

        g.restore();

        const out = { c, size: size / dpr, r: R };
        map.set(key, out);
        return out;
    } catch (e) {
        return null;
    }
}

function __getBlizzardWallSprite(radius, dpr) {
    try {
        dpr = (dpr || 1);
        const key = Math.round(radius) + '@' + dpr;
        if (__BLZ_FX.wall.has(key)) return __BLZ_FX.wall.get(key);

        const pad = 54;
        const R = radius + pad;
        const size = Math.ceil((R * 2) * dpr);
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const g = c.getContext('2d');
        g.clearRect(0, 0, size, size);

        g.save();
        g.translate(size / 2, size / 2);
        g.scale(dpr, dpr);

        const TAU = Math.PI * 2;

        // outer icy rim
        const rg = g.createRadialGradient(0, 0, radius * 0.9, 0, 0, R);
        rg.addColorStop(0, 'rgba(0,229,255,0.00)');
        rg.addColorStop(0.35, 'rgba(0,229,255,0.08)');
        rg.addColorStop(0.70, 'rgba(255,255,255,0.10)');
        rg.addColorStop(1, 'rgba(255,255,255,0.00)');

        g.strokeStyle = 'rgba(0,229,255,0.32)';
        g.lineWidth = 6;
        g.beginPath();
        g.arc(0, 0, radius + 6, 0, TAU);
        g.stroke();

        // turbulent wall fill
        g.fillStyle = rg;
        g.beginPath();
        g.arc(0, 0, R, 0, TAU);
        g.fill();

        // icy teeth (jagged spikes)
        const teeth = 44;
        g.fillStyle = 'rgba(255,255,255,0.10)';
        for (let i = 0; i < teeth; i++) {
            const a = (i / teeth) * TAU;
            const len = 10 + (i % 4) * 4;
            const w = 5 + (i % 3) * 2;
            const x0 = Math.cos(a) * (radius + 10);
            const y0 = Math.sin(a) * (radius + 10);
            const x1 = Math.cos(a) * (radius + 10 + len);
            const y1 = Math.sin(a) * (radius + 10 + len);
            const ax = Math.cos(a + Math.PI / 2) * w;
            const ay = Math.sin(a + Math.PI / 2) * w;
            g.beginPath();
            g.moveTo(x0 - ax, y0 - ay);
            g.lineTo(x0 + ax, y0 + ay);
            g.lineTo(x1, y1);
            g.closePath();
            g.fill();
        }

        // inner dash ring
        g.strokeStyle = 'rgba(255,255,255,0.12)';
        g.lineWidth = 2;
        g.setLineDash([10, 8]);
        g.beginPath();
        g.arc(0, 0, radius - 10, 0, TAU);
        g.stroke();
        g.setLineDash([]);

        g.restore();

        const out = { c, size: size / dpr, r: R };
        __BLZ_FX.wall.set(key, out);
        return out;
    } catch (e) {
        return null;
    }
}


const __SYS_SIGIL_FX = { cache: new Map() };

function __sigilKey(sysId, dpr) {
    return String(sysId || 'default') + '@' + String(dpr || 1);
}

function __drawEmblem(g, sysId, primary, secondary) {
    const TAU = Math.PI * 2;
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';

    // helper
    const stroke2 = (w, c) => { g.lineWidth = w; g.strokeStyle = c; };

    if (sysId === 'speed') {
        // Lightning bolt + chevrons
        g.fillStyle = __colorWithAlpha(primary, 0.92);
        g.strokeStyle = __colorWithAlpha('#FFFFFF', 0.35);
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(-8, -18);
        g.lineTo(3, -18);
        g.lineTo(-4, -2);
        g.lineTo(10, -2);
        g.lineTo(-6, 18);
        g.lineTo(-2, 4);
        g.lineTo(-14, 4);
        g.closePath();
        g.fill();
        g.stroke();

        // tiny chevrons
        g.strokeStyle = __colorWithAlpha(primary, 0.55);
        g.lineWidth = 2.2;
        for (let i = 0; i < 3; i++) {
            const y = 14 + i * 6;
            g.beginPath();
            g.moveTo(-14, y);
            g.lineTo(0, y - 6);
            g.lineTo(14, y);
            g.stroke();
        }

    } else if (sysId === 'engineer') {
        // Gear
        const teeth = 10;
        const r1 = 12, r2 = 18;
        g.fillStyle = __colorWithAlpha(primary, 0.92);
        g.strokeStyle = __colorWithAlpha('#FFFFFF', 0.22);
        g.lineWidth = 2;

        // teeth
        g.beginPath();
        for (let i = 0; i < teeth; i++) {
            const a = (i / teeth) * TAU;
            const a2 = a + TAU / (teeth * 2);
            g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            g.lineTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
        }
        g.closePath();
        g.fill();
        g.stroke();

        // inner hub
        g.fillStyle = __colorWithAlpha('#0b0b0b', 0.35);
        g.beginPath();
        g.arc(0, 0, 7.5, 0, TAU);
        g.fill();
        g.strokeStyle = __colorWithAlpha(primary, 0.35);
        g.lineWidth = 1.6;
        g.stroke();

    } else if (sysId === 'juggernaut') {
        // Heavy plate shield + rivets
        g.fillStyle = __colorWithAlpha(primary, 0.92);
        g.strokeStyle = __colorWithAlpha(secondary, 0.55);
        g.lineWidth = 2.6;
        g.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU - Math.PI / 2;
            const rr = (i % 2 === 0) ? 18 : 14;
            g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.stroke();

        // rivets
        g.fillStyle = __colorWithAlpha('#FFFFFF', 0.22);
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * TAU + 0.3;
            g.beginPath();
            g.arc(Math.cos(a) * 10, Math.sin(a) * 10, 1.9, 0, TAU);
            g.fill();
        }

    } else if (sysId === 'mage') {
        // Arcane crystal glyph
        g.fillStyle = __colorWithAlpha(primary, 0.85);
        g.strokeStyle = __colorWithAlpha('#FFFFFF', 0.22);
        g.lineWidth = 2.2;

        // diamond
        g.beginPath();
        g.moveTo(0, -18);
        g.lineTo(14, 0);
        g.lineTo(0, 18);
        g.lineTo(-14, 0);
        g.closePath();
        g.fill();
        g.stroke();

        // inner rune
        g.strokeStyle = __colorWithAlpha(primary, 0.55);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, -10);
        g.lineTo(6, 0);
        g.lineTo(0, 10);
        g.lineTo(-6, 0);
        g.closePath();
        g.stroke();

    } else if (sysId === 'assassin') {
        // Assassin: katana emblem
        g.save();
        // blade
        g.strokeStyle = __colorWithAlpha(primary, 0.9);
        g.lineWidth = 3.2;
        g.beginPath();
        g.moveTo(-18, 10);
        g.quadraticCurveTo(6, -6, 18, -18);
        g.stroke();

        // inner glow
        g.strokeStyle = __colorWithAlpha('#FFFFFF', 0.55);
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-16, 10);
        g.quadraticCurveTo(6, -6, 16, -16);
        g.stroke();

        // guard + handle
        g.strokeStyle = __colorWithAlpha(secondary, 0.8);
        g.lineWidth = 3.2;
        g.beginPath();
        g.moveTo(-10, 14);
        g.lineTo(2, 6);
        g.stroke();
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(-12, 16);
        g.lineTo(-18, 22);
        g.stroke();
        g.restore();
    } else {
        // default/warrior: sword (no shield)
        g.save();
        g.strokeStyle = __colorWithAlpha(primary, 0.9);
        g.lineWidth = 3.2;
        g.beginPath();
        g.moveTo(0, -20);
        g.lineTo(0, 16);
        g.stroke();

        // blade inner
        g.strokeStyle = __colorWithAlpha('#FFFFFF', 0.45);
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(0, -18);
        g.lineTo(0, 14);
        g.stroke();

        // guard
        g.strokeStyle = __colorWithAlpha(secondary, 0.7);
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-10, 6);
        g.lineTo(10, 6);
        g.stroke();

        // pommel
        g.fillStyle = __colorWithAlpha(primary, 0.9);
        g.beginPath();
        g.arc(0, 18, 3, 0, TAU);
        g.fill();
        g.restore();
    }

    g.restore();
}

function __getSystemSigilSprites(sysId, cfg, dpr) {
    try {
        dpr = (dpr || 1);
        const key = __sigilKey(sysId, dpr);
        if (__SYS_SIGIL_FX.cache.has(key)) return __SYS_SIGIL_FX.cache.get(key);

        const TAU = Math.PI * 2;
        const accent = __safeColor((cfg && (cfg.sigilAccent || cfg.accent)) || '#00E5FF', '#00E5FF');
        const glow = (cfg && cfg.glow) ? cfg.glow : __colorWithAlpha(accent, 0.25);
        const secondary = __safeColor((cfg && (cfg.sigilSecondary || (cfg.body && cfg.body[2]))) || '#FFFFFF', '#FFFFFF');

        const baseSize = 180;     // CSS px
        const baseR = 64;         // reference radius
        const cBase = document.createElement('canvas');
        cBase.width = Math.round(baseSize * dpr);
        cBase.height = Math.round(baseSize * dpr);
        const gb = cBase.getContext('2d');
        gb.setTransform(dpr, 0, 0, dpr, 0, 0);
        gb.translate(baseSize / 2, baseSize / 2);

        // soft floor glow
        const rg = gb.createRadialGradient(-10, -10, 0, 0, 0, baseR * 1.35);
        rg.addColorStop(0, __colorWithAlpha(accent, 0.18));
        rg.addColorStop(0.28, __colorWithAlpha(accent, 0.14));
        rg.addColorStop(0.60, __colorWithAlpha(accent, 0.08));
        rg.addColorStop(1, __colorWithAlpha(accent, 0.0));
        gb.fillStyle = rg;
        gb.beginPath();
        gb.arc(0, 0, baseR * 1.12, 0, TAU);
        gb.fill();

        // main ring
        gb.strokeStyle = __colorWithAlpha(accent, 0.48);
        gb.lineWidth = 3;
        gb.beginPath();
        gb.arc(0, 0, baseR * 0.98, 0, TAU);
        gb.stroke();

        // ticks
        gb.strokeStyle = __colorWithAlpha('#FFFFFF', 0.12);
        gb.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
            const a = i * (TAU / 12);
            const r1 = baseR * 0.84;
            const r2 = baseR * 0.98;
            gb.beginPath();
            gb.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            gb.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            gb.stroke();
        }

        // Assassin: add spike ring for a sharper underfoot effect
        if (sysId === 'assassin') {
            gb.strokeStyle = __colorWithAlpha(accent, 0.55);
            gb.lineWidth = 2.4;
            for (let i = 0; i < 8; i++) {
                const a = i * (TAU / 8);
                const r0 = baseR * 1.02;
                const r1 = baseR * 1.18;
                gb.beginPath();
                gb.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
                gb.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
                gb.stroke();
            }
        }

        // inner dot ring
        gb.fillStyle = __colorWithAlpha(accent, 0.22);
        for (let i = 0; i < 10; i++) {
            const a = i * (TAU / 10);
            gb.beginPath();
            gb.arc(Math.cos(a) * (baseR * 0.62), Math.sin(a) * (baseR * 0.62), 1.4, 0, TAU);
            gb.fill();
        }

        // overlay sprite (rotating segments)
        const cOv = document.createElement('canvas');
        cOv.width = Math.round(baseSize * dpr);
        cOv.height = Math.round(baseSize * dpr);
        const go = cOv.getContext('2d');
        go.setTransform(dpr, 0, 0, dpr, 0, 0);
        go.translate(baseSize / 2, baseSize / 2);

        go.strokeStyle = __colorWithAlpha(accent, 0.28);
        go.lineWidth = 4;
        go.setLineDash([10, 10]);
        go.beginPath();
        go.arc(0, 0, baseR * 1.05, 0, TAU);
        go.stroke();
        go.setLineDash([]);

        if (sysId === 'assassin') {
            go.strokeStyle = __colorWithAlpha(accent, 0.38);
            go.lineWidth = 2.2;
            for (let i = 0; i < 6; i++) {
                const a = i * (TAU / 6) + 0.3;
                const rA = baseR * 0.75;
                const rB = baseR * 1.05;
                go.beginPath();
                go.moveTo(Math.cos(a) * rA, Math.sin(a) * rA);
                go.lineTo(Math.cos(a) * rB, Math.sin(a) * rB);
                go.stroke();
            }
        }

        // 4 arc segments
        go.strokeStyle = __colorWithAlpha(secondary, 0.18);
        go.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            const a0 = i * (TAU / 4) + 0.25;
            const a1 = a0 + 0.55;
            go.beginPath();
            go.arc(0, 0, baseR * 0.78, a0, a1);
            go.stroke();
        }

        // emblem sprite
        const eSize = 96;
        const cEm = document.createElement('canvas');
        cEm.width = Math.round(eSize * dpr);
        cEm.height = Math.round(eSize * dpr);
        const ge = cEm.getContext('2d');
        ge.setTransform(dpr, 0, 0, dpr, 0, 0);
        ge.translate(eSize / 2, eSize / 2);

        // emblem soft glow backdrop (cheap)
        const erg = ge.createRadialGradient(-6, -6, 0, 0, 0, 32);
        erg.addColorStop(0, __colorWithAlpha(accent, 0.18));
        erg.addColorStop(0.5, __colorWithAlpha(accent, 0.08));
        erg.addColorStop(1, __colorWithAlpha(accent, 0));
        ge.fillStyle = erg;
        ge.beginPath();
        ge.arc(0, 0, 28, 0, TAU);
        ge.fill();

        // emblem itself
        __drawEmblem(ge, sysId, accent, secondary);

        const out = {
            base: cBase,
            overlay: cOv,
            emblem: cEm,
            meta: { baseSize, baseR, eSize }
        };

        __SYS_SIGIL_FX.cache.set(key, out);
        return out;
    } catch (e) {
        return null;
    }
}

function __drawSystemSigilUnderfoot(player, cfg, alpha) {
    try {
        const sysId = (player && player.systemId) ? player.systemId : 'default';
        const now = Date.now();
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
        const s = __getSystemSigilSprites(sysId, cfg, dpr);
        if (!s) return;

        const meta = s.meta;
        const baseR = meta.baseR;
        const desiredR = (player.radius || 22) + 28;
        const scale = desiredR / baseR;
        const drawS = meta.baseSize * scale;
        const t = now / 1000;
        const pulse = 1 + Math.sin(now / 210) * 0.018;

        const drawRing = (sysId !== 'mage');

        ctx.save();
        const a0 = Math.max(0, Math.min(1, alpha || 1));

        if (drawRing) {
            ctx.globalAlpha = a0 * 0.35;
            ctx.save();
            ctx.rotate(t * 0.35);
            ctx.drawImage(s.base, -drawS / 2, -drawS / 2, drawS, drawS);
            ctx.restore();

            ctx.globalAlpha = a0 * 0.25;
            ctx.save();
            ctx.rotate(-t * 0.9);
            ctx.drawImage(s.overlay, -drawS / 2, -drawS / 2, drawS, drawS);
            ctx.restore();
        } else {
            ctx.globalAlpha = a0 * 0.12;
            ctx.save();
            ctx.rotate(-t * 0.85);
            ctx.drawImage(s.overlay, -drawS / 2, -drawS / 2, drawS, drawS);
            ctx.restore();
        }

        const emS = meta.eSize * scale;
        const emY = desiredR * 0.52;

        // back glow
        ctx.globalAlpha = a0 * 0.22;
        ctx.save();
        ctx.translate(0, emY);
        const gPulse = 1 + Math.sin(now / 170) * 0.06;
        ctx.scale(gPulse, gPulse);
        ctx.drawImage(s.emblem, -emS / 2, -emS / 2, emS, emS);
        ctx.restore();

        // crisp emblem
        ctx.globalAlpha = a0 * 0.55;
        ctx.save();
        ctx.translate(0, emY);
        ctx.scale(pulse, pulse);
        ctx.drawImage(s.emblem, -emS / 2, -emS / 2, emS, emS);
        ctx.restore();

        ctx.restore();
    } catch (e) {}
}
// === Player Draw Override Pack ===
const _originalPlayerDraw = Player.prototype.draw;
Player.prototype.draw = function() {
    const __sysId = (this.systemId || 'default');
    const cfg = (GFX.SYSTEMS && (GFX.SYSTEMS[__sysId] || (this.systemId==='default' ? GFX.SYSTEMS.default : null))) ? (GFX.SYSTEMS[__sysId] || GFX.SYSTEMS.default) : (GFX.PLAYER || {});
    
    ctx.save();

    (function(){
        try {
            const now = Date.now();
            if (this.systemId !== 'speed') return;

            const isDashing = !!(this.dash && this.dash.active && now <= this.dash.endTime);
            if (!this.__dashFxOpt) this.__dashFxOpt = { trail: [], bolts: [], nextBoltAt: 0, sparks: [], nextSparkAt: 0, beam: null, beamDpr: 0 };
            const fx = this.__dashFxOpt;

            const keepMs = 260;

            if (isDashing) {
                fx.trail.push({ x: this.x, y: this.y, t: now });
                if (fx.trail.length > 16) fx.trail.shift();
            }

            fx.trail = (fx.trail || []).filter(p => (now - (p.t || now)) <= keepMs);

            const last = fx.trail[fx.trail.length - 1];
            const prev = fx.trail[Math.max(0, fx.trail.length - 2)];
            const mvx = (last && prev) ? (last.x - prev.x) : 0;
            const mvy = (last && prev) ? (last.y - prev.y) : 0;
            const vx = (isDashing ? (this.dash.vx || mvx) : mvx);
            const vy = (isDashing ? (this.dash.vy || mvy) : mvy);
            const ang = Math.atan2(vy || 0, (vx || 1));

            const dpr = ((typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1) || 1);
            if (!fx.beam || fx.beamDpr !== dpr) {
                fx.beamDpr = dpr;
                const bw = Math.round(220 * dpr);
                const bh = Math.round(70 * dpr);
                const c = document.createElement('canvas');
                c.width = bw; c.height = bh;
                const g = c.getContext('2d');
                g.clearRect(0, 0, bw, bh);

                // Glow body
                const lg = g.createLinearGradient(0, 0, bw, 0);
                lg.addColorStop(0, 'rgba(255,255,255,0)');
                lg.addColorStop(0.08, 'rgba(255,255,255,0.35)');
                lg.addColorStop(0.35, 'rgba(0,229,255,0.35)');
                lg.addColorStop(1, 'rgba(0,229,255,0)');
                g.fillStyle = lg;
                g.beginPath();
                g.ellipse(bw * 0.55, bh * 0.5, bw * 0.55, bh * 0.32, 0, 0, Math.PI * 2);
                g.fill();

                // Core streak
                const lg2 = g.createLinearGradient(0, 0, bw, 0);
                lg2.addColorStop(0, 'rgba(255,255,255,0)');
                lg2.addColorStop(0.12, 'rgba(255,255,255,0.55)');
                lg2.addColorStop(0.5, 'rgba(129,212,250,0.30)');
                lg2.addColorStop(1, 'rgba(0,229,255,0)');
                g.fillStyle = lg2;
                g.beginPath();
                g.ellipse(bw * 0.60, bh * 0.5, bw * 0.55, bh * 0.12, 0, 0, Math.PI * 2);
                g.fill();

                fx.beam = { c, w: bw / dpr, h: bh / dpr };
            }

            const makeBolt = (len, amp, steps) => {
                const pts = [{ x: 0, y: 0 }];
                for (let i = 1; i < steps; i++) {
                    const tt = i / steps;
                    const j = (Math.random() - 0.5) * amp * (1 - tt);
                    pts.push({ x: -len * tt, y: j });
                }
                pts.push({ x: -len, y: 0 });
                return pts;
            };

            if (isDashing && now >= fx.nextBoltAt) {
                fx.nextBoltAt = now + 90;
                fx.bolts.length = 0;
                for (let i = 0; i < 2; i++) {
                    fx.bolts.push({
                        off: (Math.random() - 0.5) * 26,
                        pts: makeBolt(120 + Math.random() * 70, 18, 7)
                    });
                }
            }

            if (isDashing && now >= fx.nextSparkAt) {
                fx.nextSparkAt = now + 70;
                for (let i = 0; i < 5; i++) {
                    fx.sparks.push({
                        x: Math.random() * 170,
                        y: (Math.random() - 0.5) * 30,
                        t: now,
                        life: 200 + Math.random() * 160
                    });
                }
                if (fx.sparks.length > 28) fx.sparks.splice(0, fx.sparks.length - 28);
            }
            fx.sparks = (fx.sparks || []).filter(sp => (now - sp.t) <= sp.life);

            // Draw trail ribbon (3 path strokes).
            if (fx.trail.length > 1) {
                ctx.save();
                ctx.lineCap = 'round';

                const drawSlice = (fromIdx, toIdx, lw, stroke, shadow) => {
                    if (toIdx <= fromIdx) return;
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = lw;
                    if (shadow) {
                        ctx.shadowBlur = shadow.blur;
                        ctx.shadowColor = shadow.color;
                    } else {
                        ctx.shadowBlur = 0;
                    }
                    ctx.beginPath();
                    ctx.moveTo(fx.trail[fromIdx].x, fx.trail[fromIdx].y);
                    for (let i = fromIdx + 1; i <= toIdx; i++) {
                        const p = fx.trail[i];
                        ctx.lineTo(p.x, p.y);
                    }
                    ctx.stroke();
                };

                const n = fx.trail.length;
                const iA = Math.max(0, n - 5);
                const iB = Math.max(0, n - 10);

                drawSlice(0, Math.min(iB, n - 1), 10, 'rgba(0,229,255,0.06)');
                if (iB < n - 1) drawSlice(iB, Math.min(iA, n - 1), 14, 'rgba(0,229,255,0.10)', { blur: 8, color: 'rgba(0,229,255,0.55)' });
                if (iA < n - 1) drawSlice(iA, n - 1, 18, 'rgba(0,229,255,0.14)', { blur: 10, color: 'rgba(0,229,255,0.60)' });

                // inner white core
                if (iB < n - 1) drawSlice(iB, n - 1, 5, 'rgba(255,255,255,0.10)');

                ctx.restore();
            }

            // Beam sprite behind tank (only while dashing).
            if (isDashing && fx.beam) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(ang + Math.PI);
                const len = 175;
                ctx.globalAlpha = 0.95;
                ctx.drawImage(fx.beam.c, -len, -fx.beam.h / 2, len, fx.beam.h);
                ctx.restore();
            }

            // Bolts + sparks (cheap strokes/arcs).
            if (isDashing && fx.bolts && fx.bolts.length) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(ang + Math.PI);

                for (let i = 0; i < fx.bolts.length; i++) {
                    const b = fx.bolts[i];
                    ctx.save();
                    ctx.translate(0, b.off);

                    // cyan thick glow
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = 'rgba(0,229,255,0.22)';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(b.pts[0].x, b.pts[0].y);
                    for (let k = 1; k < b.pts.length; k++) ctx.lineTo(b.pts[k].x, b.pts[k].y);
                    ctx.stroke();

                    // yellow core
                    ctx.strokeStyle = 'rgba(255,235,59,0.32)';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.moveTo(b.pts[0].x, b.pts[0].y);
                    for (let k = 1; k < b.pts.length; k++) ctx.lineTo(b.pts[k].x, b.pts[k].y);
                    ctx.stroke();

                    ctx.restore();
                }

                // sparks
                for (let i = 0; i < fx.sparks.length; i++) {
                    const sp = fx.sparks[i];
                    const age = now - sp.t;
                    const a = Math.max(0, 1 - age / sp.life);
                    ctx.fillStyle = `rgba(255,255,255,${0.08 + 0.16 * a})`;
                    ctx.beginPath();
                    ctx.arc(-(22 + sp.x), sp.y, 1.0 + 1.2 * a, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
        } catch (e) { /* silent */ }
    }).call(this);

ctx.translate(this.x, this.y);
    
    // Alpha for stealth/phase
    let alpha = 1;
    if (this.isStealth) alpha = 0.4;
    if (this.buffs.phase && this.buffs.phase.active) alpha = 0.35;
    ctx.globalAlpha = alpha;
    



    // === ASSASSIN SKILL RANGE INDICATORS (Q/E/R) ===
    if (this.systemId === 'assassin') {
        const __baseR = (this.baseRadius || 22);
        const __scale = (__baseR > 0) ? (this.radius / __baseR) : 1;
        const rings = [
            { r: ASSASSIN_SKILL_RANGE_Q * (__scale || 1), c: 'rgba(255,80,130,0.55)', dash: [8,6] },
            { r: ASSASSIN_SKILL_RANGE_E * (__scale || 1), c: 'rgba(120,200,255,0.55)', dash: [10,7] },
            { r: ASSASSIN_SKILL_RANGE_R * (__scale || 1), c: 'rgba(255,170,80,0.55)', dash: [12,8] }
        ];
        ctx.save();
        ctx.globalAlpha = 0.32 * (alpha || 1);
        ctx.lineWidth = 2;
        for (const ring of rings) {
            ctx.strokeStyle = ring.c;
            ctx.setLineDash(ring.dash || []);
            ctx.beginPath();
            ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
    }

    __drawSystemSigilUnderfoot(this, cfg, alpha);

    if (this.systemId === 'mage') {
        try {
            const now = Date.now();
            if (!this.__mageAuraFx) this.__mageAuraFx = { dpr: 0, sprite: null, meta: null };
            const fx = this.__mageAuraFx;
            const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;

            if (!fx.sprite || fx.dpr !== dpr) {
                fx.dpr = dpr;
                const baseSize = 180; // CSS px
                const baseR = 64;
                const c = document.createElement('canvas');
                c.width = Math.round(baseSize * dpr);
                c.height = Math.round(baseSize * dpr);
                const g = c.getContext('2d');
                g.setTransform(dpr, 0, 0, dpr, 0, 0);
                g.translate(baseSize / 2, baseSize / 2);

                // Soft halo (white-blue)
                const rg = g.createRadialGradient(-10, -10, 0, 0, 0, baseR * 1.35);
                rg.addColorStop(0, 'rgba(255,255,255,0.18)');
                rg.addColorStop(0.22, 'rgba(179,229,252,0.24)');
                rg.addColorStop(0.55, 'rgba(0,229,255,0.12)');
                rg.addColorStop(1, 'rgba(0,229,255,0)');
                g.fillStyle = rg;
                g.beginPath();
                g.arc(0, 0, baseR * 1.15, 0, Math.PI * 2);
                g.fill();

                // Rune ring
                g.strokeStyle = 'rgba(179,229,252,0.38)';
                g.lineWidth = 3;
                g.beginPath();
                g.arc(0, 0, baseR * 0.98, 0, Math.PI * 2);
                g.stroke();

                // Small rune ticks
                g.strokeStyle = 'rgba(255,255,255,0.16)';
                g.lineWidth = 2;
                for (let i = 0; i < 12; i++) {
                    const a = i * (Math.PI * 2 / 12);
                    const r1 = baseR * 0.86;
                    const r2 = baseR * 0.98;
                    g.beginPath();
                    g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
                    g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
                    g.stroke();
                }

                // Inner sparkle cluster (static)
                g.fillStyle = 'rgba(255,255,255,0.22)';
                for (let i = 0; i < 18; i++) {
                    const a = (i / 18) * Math.PI * 2;
                    const rr = 10 + (i % 6) * 2;
                    g.beginPath();
                    g.arc(Math.cos(a) * rr, Math.sin(a) * rr, (i % 3 === 0) ? 1.4 : 1.0, 0, Math.PI * 2);
                    g.fill();
                }

                fx.sprite = c;
                fx.meta = { baseSize, baseR };
            }

            const meta = fx.meta;
            const desiredR = (this.radius || 22) + 32;
            const scale = desiredR / meta.baseR;
            const drawS = meta.baseSize * scale;
            const t = now / 1000;

            ctx.save();
            ctx.globalAlpha = alpha * 0.55;
            ctx.rotate(t * 0.6);
            ctx.drawImage(fx.sprite, -drawS / 2, -drawS / 2, drawS, drawS);

            ctx.globalAlpha = alpha * 0.22;
            ctx.rotate(-t * 1.6);
            ctx.drawImage(fx.sprite, -drawS / 2, -drawS / 2, drawS, drawS);

            ctx.globalAlpha = alpha * 0.55;
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            for (let i = 0; i < 6; i++) {
                const a = t * 2.2 + i * (Math.PI * 2 / 6);
                const r = desiredR - 8 + Math.sin(t * 4 + i) * 1.5;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } catch (e) {}
    }

    // === ASSASSIN VISUAL PACK (distinct silhouette + blade + cloak + aura) ===
    if (this.systemId === 'assassin') {
        try {
            const now = Date.now();
            const t = now / 1000;
            const pulse = 0.6 + Math.sin(t * 6) * 0.4;

            // Cloak panel (draw behind body)
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.rotate((this.angle || 0) + Math.PI);
            ctx.fillStyle = 'rgba(60, 15, 90, 0.38)';
            ctx.beginPath();
            ctx.moveTo(-this.radius * 0.2, -this.radius * 0.9);
            ctx.lineTo(-this.radius * 2.2, 0);
            ctx.lineTo(-this.radius * 0.2, this.radius * 0.9);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Twin aura arcs
            ctx.save();
            const r = this.radius + 14;
            ctx.globalAlpha = 0.35 + 0.15 * pulse;
            ctx.strokeStyle = 'rgba(176, 86, 255, 0.45)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r, t, t + Math.PI * 1.2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(72, 0, 120, 0.35)';
            ctx.beginPath();
            ctx.arc(0, 0, r + 6, -t * 1.3, -t * 1.3 + Math.PI * 0.9);
            ctx.stroke();
            ctx.restore();

            // Blade barrel (katana-like)
            ctx.save();
            ctx.rotate(this.angle || 0);
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(176, 86, 255, 0.9)';
            ctx.strokeStyle = 'rgba(196, 143, 255, 0.85)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.radius * 0.2, 0);
            ctx.lineTo(this.radius * 2.6, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(this.radius * 2.4, -3, 6, 6);
            ctx.restore();

            // Eye core on turret
            ctx.save();
            ctx.rotate(this.angle || 0);
            ctx.fillStyle = 'rgba(255, 80, 180, 0.85)';
            ctx.beginPath();
            ctx.arc(this.radius * 0.25, 0, 3.2 + pulse * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // orbiting shadow motes
            ctx.save();
            ctx.globalAlpha = 0.7 * alpha;
            ctx.fillStyle = 'rgba(176, 86, 255, 0.75)';
            for (let i = 0; i < 4; i++) {
                const aa = t * 2.6 + i * (Math.PI * 2 / 4);
                const rr = (this.radius + 10) + Math.sin(t * 3 + i) * 2;
                ctx.beginPath();
                ctx.arc(Math.cos(aa) * rr, Math.sin(aa) * rr, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } catch (e) {}
    }
    const __isWarrior = (this.systemId === 'default' || this.systemId === 'warrior');
    if (__isWarrior && this.skills && this.skills.vampirism && this.skills.vampirism.active) {
        try {
            const now = Date.now();
            const TAU = Math.PI * 2;
            const t = now / 1000;
            const pulse = 0.6 + Math.sin(now / 140) * 0.4;
            const outer = this.radius + 24;

            if (!this.__vampFxLite) this.__vampFxLite = { nextScan: 0, targets: [], auraR: 0, auraGrad: null, crest: null, crestDpr: 0 };
            const fx = this.__vampFxLite;

            if (now >= (fx.nextScan || 0)) {
                fx.nextScan = now + 180;
                const maxTargets = 2;
                const maxD2 = 320 * 320;
                const picked = [];

                const game = __getGame();
                if (game && game.enemies && game.enemies.length) {
                    for (let i = 0; i < game.enemies.length; i++) {
                        const e = game.enemies[i];
                        if (!e || e.hp <= 0) continue;
                        const dx = e.x - this.x;
                        const dy = e.y - this.y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 >= maxD2) continue;
                        picked.push({ dx, dy, d2 });
                    }
                    picked.sort((a, b) => a.d2 - b.d2);
                }

                fx.targets = picked.slice(0, maxTargets);
            }

            if (!fx.auraGrad || fx.auraR !== outer) {
                fx.auraR = outer;
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, outer * 1.6);
                g.addColorStop(0, 'rgba(255,255,255,0.03)');
                g.addColorStop(0.22, 'rgba(255,23,68,0.15)');
                g.addColorStop(0.70, 'rgba(255,23,68,0.07)');
                g.addColorStop(1, 'rgba(255,23,68,0)');
                fx.auraGrad = g;
            }

            ctx.save();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'source-over';

            ctx.globalAlpha = 0.85;
            ctx.fillStyle = fx.auraGrad;
            ctx.beginPath();
            ctx.arc(0, 0, outer * 1.22, 0, TAU);
            ctx.fill();

            ctx.globalAlpha = 0.35 + 0.25 * pulse;
            ctx.strokeStyle = 'rgba(255, 82, 82, 0.95)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, outer + 6 + Math.sin(t * 5) * 2, 0, TAU);
            ctx.stroke();

            const targets = fx.targets || [];
            if (targets.length) {
                ctx.lineCap = 'round';
                for (let i = 0; i < targets.length; i++) {
                    const b = targets[i];
                    const sx = b.dx, sy = b.dy;
                    const len = Math.max(1, Math.sqrt(b.d2));
                    const nx = -sy / len, ny = sx / len;
                    const wob = Math.sin(t * 10 + i * 2.1) * 10;
                    const mx = sx * 0.55 + nx * wob;
                    const my = sy * 0.55 + ny * wob;

                    ctx.globalAlpha = 0.35 + 0.20 * pulse;
                    ctx.strokeStyle = 'rgba(183, 28, 28, 0.85)';
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.quadraticCurveTo(mx, my, 0, 0);
                    ctx.stroke();

                    ctx.globalAlpha = 0.55 + 0.25 * pulse;
                    ctx.strokeStyle = 'rgba(255, 235, 238, 0.95)';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.quadraticCurveTo(mx, my, 0, 0);
                    ctx.stroke();

                    const tt = (t * 1.8 + i * 0.33) % 1;
                    const px = sx * (1 - tt);
                    const py = sy * (1 - tt);
                    ctx.globalAlpha = 0.55 + 0.25 * pulse;
                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.beginPath();
                    ctx.arc(px, py, 2.0, 0, TAU);
                    ctx.fill();

                    ctx.globalAlpha = 0.35;
                    ctx.fillStyle = 'rgba(255, 23, 68, 0.8)';
                    ctx.beginPath();
                    ctx.arc(px, py, 3.4, 0, TAU);
                    ctx.fill();
                }
            }

            const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
            if (!fx.crest || fx.crestDpr !== dpr) {
                fx.crestDpr = dpr;
                const c = document.createElement('canvas');
                const size = 64;
                c.width = Math.round(size * dpr);
                c.height = Math.round(size * dpr);
                const cctx = c.getContext('2d');
                cctx.scale(dpr, dpr);
                cctx.translate(size / 2, size / 2);

                // ring
                cctx.strokeStyle = 'rgba(255, 82, 82, 0.85)';
                cctx.lineWidth = 2;
                cctx.beginPath();
                cctx.arc(0, 0, 22, 0, TAU);
                cctx.stroke();

                // shield (simple)
                cctx.fillStyle = 'rgba(183, 28, 28, 0.35)';
                cctx.strokeStyle = 'rgba(255, 235, 238, 0.7)';
                cctx.lineWidth = 2;
                cctx.beginPath();
                cctx.moveTo(0, -16);
                cctx.lineTo(14, -8);
                cctx.lineTo(11, 10);
                cctx.quadraticCurveTo(0, 18, -11, 10);
                cctx.lineTo(-14, -8);
                cctx.closePath();
                cctx.fill();
                cctx.stroke();

                // crossed swords
                cctx.strokeStyle = 'rgba(255, 235, 238, 0.9)';
                cctx.lineWidth = 3;
                cctx.lineCap = 'round';
                cctx.beginPath();
                cctx.moveTo(-10, 10);
                cctx.lineTo(10, -10);
                cctx.stroke();
                cctx.beginPath();
                cctx.moveTo(10, 10);
                cctx.lineTo(-10, -10);
                cctx.stroke();

                fx.crest = c;
            }

            if (fx.crest) {
                const size = 54;
                ctx.save();
                ctx.translate(0, -(this.radius + 38));
                ctx.globalAlpha = 0.55 + 0.25 * pulse;
                ctx.drawImage(fx.crest, -size / 2, -size / 2, size, size);
                ctx.restore();
            }

            ctx.restore();
        } catch (e) { /* silent */ }
    } else if (this.skills && this.skills.vampirism && this.skills.vampirism.active) {
        ctx.strokeStyle = '#FF5252';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 82, 82, 0.1)';
        ctx.fill();
    }

    const __isSpeedSys = (this.systemId === 'speed');
    const __nowFX = Date.now();
    const __TAU = Math.PI * 2;

    if (this.buffs.phase && this.buffs.phase.active) {
        if (__isSpeedSys) {
            try {
                if (!this.__speedBuffFx) this.__speedBuffFx = { dpr: 0, phaseSprite: null, phaseMeta: null, adrSprite: null, adrMeta: null, nextBoltAt: 0, bolts: [] };
                const __fx = this.__speedBuffFx;
                const __dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
                if (__fx.dpr !== __dpr) {
                    __fx.dpr = __dpr;
                    __fx.phaseSprite = null; __fx.phaseMeta = null;
                    __fx.adrSprite = null; __fx.adrMeta = null;
                    __fx.bolts = []; __fx.nextBoltAt = 0;
                }

                // Build phase sprite (cache).
                if (!__fx.phaseSprite) {
                    const baseSize = 140;  // CSS px
                    const baseR = 56;
                    const c = document.createElement('canvas');
                    c.width = Math.round(baseSize * __dpr);
                    c.height = Math.round(baseSize * __dpr);
                    const g = c.getContext('2d');
                    g.setTransform(__dpr, 0, 0, __dpr, 0, 0);
                    g.translate(baseSize / 2, baseSize / 2);

                    // Outer ring
                    const rg = g.createRadialGradient(-10, -10, 0, 0, 0, baseR * 1.25);
                    rg.addColorStop(0, 'rgba(255,255,255,0.12)');
                    rg.addColorStop(0.35, 'rgba(129,212,250,0.22)');
                    rg.addColorStop(1, 'rgba(129,212,250,0)');
                    g.fillStyle = rg;
                    g.beginPath();
                    g.arc(0, 0, baseR * 1.15, 0, __TAU);
                    g.fill();

                    g.strokeStyle = 'rgba(129,212,250,0.75)';
                    g.lineWidth = 4;
                    g.beginPath();
                    g.arc(0, 0, baseR, 0, __TAU);
                    g.stroke();

                    // Shield segments
                    g.strokeStyle = 'rgba(255,255,255,0.14)';
                    g.lineWidth = 3;
                    for (let i = 0; i < 6; i++) {
                        const a = i * (__TAU / 6);
                        g.beginPath();
                        g.arc(0, 0, baseR - 7, a - 0.22, a + 0.22);
                        g.stroke();
                    }

                    // Scanlines (clip)
                    g.save();
                    g.beginPath();
                    g.arc(0, 0, baseR - 10, 0, __TAU);
                    g.clip();
                    g.rotate(-0.25);
                    g.strokeStyle = 'rgba(255,255,255,0.06)';
                    g.lineWidth = 2;
                    for (let y = -80; y <= 80; y += 10) {
                        g.beginPath();
                        g.moveTo(-90, y);
                        g.lineTo(90, y + 22);
                        g.stroke();
                    }
                    g.restore();

                    // Inner core ring
                    g.strokeStyle = 'rgba(255,255,255,0.12)';
                    g.lineWidth = 2;
                    g.beginPath();
                    g.arc(0, 0, baseR * 0.55, 0, __TAU);
                    g.stroke();

                    __fx.phaseSprite = c;
                    __fx.phaseMeta = { baseSize, baseR };
                }

                const t = __nowFX / 1000;
                const pulse = 0.55 + Math.sin(__nowFX / 120) * 0.45;
                const desiredR = this.radius + 20;
                const meta = __fx.phaseMeta;
                const scale = desiredR / meta.baseR;
                const drawS = meta.baseSize * scale;

                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.shadowBlur = 0;

                ctx.globalAlpha = 0.78;
                ctx.rotate(t * 0.85);
                ctx.drawImage(__fx.phaseSprite, -drawS/2, -drawS/2, drawS, drawS);

                ctx.globalAlpha = 0.28 + 0.18 * pulse;
                ctx.rotate(-t * 1.9);
                ctx.drawImage(__fx.phaseSprite, -drawS/2, -drawS/2, drawS, drawS);

                ctx.globalAlpha = 0.45 + 0.25 * pulse;
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                for (let i = 0; i < 6; i++) {
                    const a = t * 2.4 + i * (__TAU / 6);
                    const r = desiredR + 3 + Math.sin(t * 5 + i) * 1.5;
                    const x = Math.cos(a) * r;
                    const y = Math.sin(a) * r;
                    ctx.beginPath();
                    ctx.arc(x, y, 1.4, 0, __TAU);
                    ctx.fill();
                }

                // Inner shimmer arcs
                ctx.globalAlpha = 0.16 + 0.12 * pulse;
                ctx.strokeStyle = 'rgba(129,212,250,0.55)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const a0 = t * 1.8 + i * (__TAU / 3);
                    ctx.beginPath();
                    ctx.arc(0, 0, desiredR - 9, a0, a0 + 0.95);
                    ctx.stroke();
                }

                ctx.restore();
            } catch (e) {
                // fallback
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 16, 0, Math.PI * 2);
                ctx.strokeStyle = '#81D4FA';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 16, 0, Math.PI * 2);
            ctx.strokeStyle = '#81D4FA';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    if (this.buffs.adrenaline && this.buffs.adrenaline.active) {
        if (__isSpeedSys) {
            try {
                if (!this.__speedBuffFx) this.__speedBuffFx = { dpr: 0, phaseSprite: null, phaseMeta: null, adrSprite: null, adrMeta: null, nextBoltAt: 0, bolts: [] };
                const __fx = this.__speedBuffFx;
                const __dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
                if (__fx.dpr !== __dpr) {
                    __fx.dpr = __dpr;
                    __fx.phaseSprite = null; __fx.phaseMeta = null;
                    __fx.adrSprite = null; __fx.adrMeta = null;
                    __fx.bolts = []; __fx.nextBoltAt = 0;
                }

                // Build ADRENALINE sprite (cache)
                if (!__fx.adrSprite) {
                    const baseSize = 160;
                    const baseR = 64;
                    const c = document.createElement('canvas');
                    c.width = Math.round(baseSize * __dpr);
                    c.height = Math.round(baseSize * __dpr);
                    const g = c.getContext('2d');
                    g.setTransform(__dpr, 0, 0, __dpr, 0, 0);
                    g.translate(baseSize / 2, baseSize / 2);

                    // Aura disk
                    const rg = g.createRadialGradient(-12, -12, 0, 0, 0, baseR * 1.35);
                    rg.addColorStop(0, 'rgba(255,255,255,0.10)');
                    rg.addColorStop(0.28, 'rgba(41,182,246,0.16)');
                    rg.addColorStop(0.62, 'rgba(0,229,255,0.10)');
                    rg.addColorStop(1, 'rgba(0,229,255,0)');
                    g.fillStyle = rg;
                    g.beginPath();
                    g.arc(0, 0, baseR * 1.20, 0, __TAU);
                    g.fill();

                    // Outer ring
                    g.strokeStyle = 'rgba(0,229,255,0.65)';
                    g.lineWidth = 4;
                    g.beginPath();
                    g.arc(0, 0, baseR, 0, __TAU);
                    g.stroke();

                    // Chevrons / speed marks
                    g.fillStyle = 'rgba(255,255,255,0.08)';
                    for (let i = 0; i < 12; i++) {
                        const a = i * (__TAU / 12);
                        const x = Math.cos(a) * (baseR - 6);
                        const y = Math.sin(a) * (baseR - 6);
                        g.save();
                        g.translate(x, y);
                        g.rotate(a);
                        g.beginPath();
                        g.moveTo(0, 0);
                        g.lineTo(-10, -4);
                        g.lineTo(-10, 4);
                        g.closePath();
                        g.fill();
                        g.restore();
                    }

                    // Inner ring
                    g.strokeStyle = 'rgba(255,255,255,0.10)';
                    g.lineWidth = 2;
                    g.beginPath();
                    g.arc(0, 0, baseR * 0.62, 0, __TAU);
                    g.stroke();

                    __fx.adrSprite = c;
                    __fx.adrMeta = { baseSize, baseR };
                }

                const t = __nowFX / 1000;
                const pulse = 0.55 + Math.sin(__nowFX / 110) * 0.45;
                const desiredR = this.radius + 18;
                const meta = __fx.adrMeta;
                const scale = desiredR / meta.baseR;
                const drawS = meta.baseSize * scale;

                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.shadowBlur = 0;

                ctx.globalAlpha = 0.62 + 0.18 * pulse;
                ctx.rotate(t * 0.9);
                ctx.drawImage(__fx.adrSprite, -drawS/2, -drawS/2, drawS, drawS);

                ctx.globalAlpha = 0.22 + 0.16 * pulse;
                ctx.rotate(-t * 1.8);
                ctx.drawImage(__fx.adrSprite, -drawS/2, -drawS/2, drawS, drawS);

                ctx.save();
                ctx.rotate(this.angle + Math.PI);
                ctx.globalAlpha = 0.22 + 0.22 * pulse;
                ctx.lineCap = 'round';
                ctx.strokeStyle = 'rgba(0,229,255,0.40)';
                ctx.lineWidth = 3;
                for (let i = -2; i <= 2; i++) {
                    const wob = 0.5 + Math.sin(t * 9 + i) * 0.5;
                    const len = 18 + wob * 28;
                    const y = i * 5.2;
                    const sx = this.radius + 10;
                    ctx.beginPath();
                    ctx.moveTo(sx, y);
                    ctx.lineTo(sx + len, y);
                    ctx.stroke();
                }
                ctx.restore();

                ctx.globalAlpha = 0.18 + 0.16 * pulse;
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 2;
                const segs = 6;
                for (let i = 0; i < segs; i++) {
                    const a0 = t * 2.2 + i * (__TAU / segs);
                    ctx.beginPath();
                    ctx.arc(0, 0, desiredR + 6, a0, a0 + 0.55);
                    ctx.stroke();
                }

                // Lightning bolts (precomputed points; built below in JS-safe way)
                if (!__fx.__boltSafe) {
                    __fx.__boltSafe = true;
                }
                // ensure bolts exist
                if (!Array.isArray(__fx.bolts)) __fx.bolts = [];
                if (__nowFX >= (__fx.nextBoltAt || 0)) {
                    __fx.nextBoltAt = __nowFX + 120;
                    __fx.bolts.length = 0;
                    const steps = 5;
                    for (let b = 0; b < 2; b++) {
                        const pts = [];
                        const startA = Math.random() * __TAU;
                        const span = 0.55 + Math.random() * 0.35;
                        for (let i = 0; i <= steps; i++) {
                            const aa = startA + (span * i / steps);
                            const rr = desiredR + 4 + (Math.random() - 0.5) * 6;
                            pts.push({ x: Math.cos(aa) * rr, y: Math.sin(aa) * rr });
                        }
                        __fx.bolts.push(pts);
                    }
                }

                if (__fx.bolts && __fx.bolts.length) {
                    ctx.globalAlpha = 0.20 + 0.18 * pulse;
                    ctx.strokeStyle = 'rgba(255,235,59,0.45)';
                    ctx.lineWidth = 2;
                    for (let i = 0; i < __fx.bolts.length; i++) {
                        const pts = __fx.bolts[i];
                        if (!pts || pts.length < 2) continue;
                        ctx.beginPath();
                        ctx.moveTo(pts[0].x, pts[0].y);
                        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
                        ctx.stroke();
                    }
                }

                ctx.restore();
            } catch (e) {
                // fallback
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
                ctx.strokeStyle = '#29B6F6';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
            ctx.strokeStyle = '#29B6F6';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    if (this.buffs.shield.active) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.shield;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 191, 255, 0.1)';
        ctx.fill();
    }
    

    if (this.systemId === 'juggernaut' && this.buffs.juggerShield && this.buffs.juggerShield.active && Date.now() <= this.buffs.juggerShield.endTime) {
        try {
            const nowJS = Date.now();
            const pulse = 0.55 + Math.sin(nowJS / 120) * 0.45;
            const t = nowJS / 1000;
            const desiredR = this.radius + 14;
            const dpr = ((typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1) || 1);

            // sprite armor ring (cache)
            const spr = __getJuggerShieldSprite(36, dpr);
            if (spr) {
                const scale = desiredR / spr.baseR;
                const drawS = spr.size * scale;

                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.shadowBlur = 0;

                ctx.globalAlpha = 0.78 + 0.10 * pulse;
                ctx.rotate(t * 1.35);
                ctx.drawImage(spr.c, -drawS / 2, -drawS / 2, drawS, drawS);

                ctx.globalAlpha = 0.22 + 0.10 * pulse;
                ctx.rotate(-t * 2.2);
                ctx.drawImage(spr.c, -drawS / 2, -drawS / 2, drawS, drawS);

                const a0 = t * 3.0;
                ctx.globalAlpha = 0.16 + 0.20 * pulse;
                ctx.strokeStyle = 'rgba(255,255,255,0.55)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, desiredR + 2, a0, a0 + 0.9);
                ctx.stroke();

                ctx.globalAlpha = 0.10 + 0.18 * pulse;
                ctx.strokeStyle = 'rgba(255, 235, 59, 0.55)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const aa = a0 + i * (Math.PI * 2 / 6);
                    const x0 = Math.cos(aa) * (desiredR + 2);
                    const y0 = Math.sin(aa) * (desiredR + 2);
                    const x1 = Math.cos(aa) * (desiredR + 14);
                    const y1 = Math.sin(aa) * (desiredR + 14);
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.lineTo(x1, y1);
                    ctx.stroke();
                }

                ctx.restore();
            } else {
                // fallback simple ring
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 213, 79, 0.85)';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        } catch (e) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 213, 79, 0.85)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    if (this.systemId === 'juggernaut' && this.ram && this.ram.active && Date.now() <= this.ram.endTime) {
        try {
            const nowR = Date.now();
            const pulse = 0.5 + Math.sin(nowR / 75) * 0.5;
            const dpr = ((typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1) || 1);
            const trailSpr = __getJuggerRamTrailSprite(dpr);

            // direction of ram
            const vx = (this.ram.vx || 0);
            const vy = (this.ram.vy || 0);
            let ang = Math.atan2(vy, vx);
            if (!isFinite(ang)) ang = (this.angle || 0);

            // cache sparks (avoid random every frame)
            if (!this.__ramFxOpt) this.__ramFxOpt = { sparks: [], nextAt: 0 };
            const fx = this.__ramFxOpt;
            if (nowR >= (fx.nextAt || 0)) {
                fx.nextAt = nowR + 80;
                fx.sparks.length = 0;
                for (let i = 0; i < 7; i++) {
                    fx.sparks.push({
                        a: (Math.random() - 0.5) * 0.65,
                        l: 10 + Math.random() * 18,
                        w: 1.2 + Math.random() * 1.2
                    });
                }
            }

            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;

            // back trail ribbon
            ctx.save();
            ctx.rotate(ang + Math.PI);
            ctx.globalAlpha = 0.75 + 0.12 * pulse;
            const len = 190;
            ctx.drawImage(trailSpr.c, -len, -trailSpr.h / 2, len, trailSpr.h);
            ctx.globalAlpha = 0.18 + 0.12 * pulse;
            ctx.drawImage(trailSpr.c, -len * 0.8, -trailSpr.h / 2, len * 0.8, trailSpr.h);
            ctx.restore();

            // front impact cone
            ctx.save();
            ctx.rotate(ang);
            const sx = this.radius + 10;
            const tip = sx + 72;
            ctx.globalAlpha = 0.22 + 0.20 * pulse;
            ctx.fillStyle = 'rgba(255, 193, 7, 0.16)';
            ctx.strokeStyle = 'rgba(255, 235, 59, 0.38)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(tip, -20);
            ctx.lineTo(tip + 10, 0);
            ctx.lineTo(tip, 20);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // shock ring at nose
            ctx.globalAlpha = 0.10 + 0.14 * pulse;
            ctx.strokeStyle = 'rgba(255, 152, 0, 0.35)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx + 18, 0, 18 + pulse * 4, -0.8, 0.8);
            ctx.stroke();

            // sparks
            ctx.globalAlpha = 0.20 + 0.25 * pulse;
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            for (let i = 0; i < fx.sparks.length; i++) {
                const sp = fx.sparks[i];
                ctx.lineWidth = sp.w;
                ctx.beginPath();
                ctx.moveTo(tip, 0);
                ctx.lineTo(tip + Math.cos(sp.a) * sp.l, Math.sin(sp.a) * sp.l);
                ctx.stroke();
            }

            ctx.restore();
            ctx.restore();
        } catch (e) {
            // no-op
        }
    }


    if (this.systemId === 'juggernaut' && this.buffs.siege && this.buffs.siege.active && Date.now() <= this.buffs.siege.endTime) {
        const now = Date.now();
        const t = now / 140;
        const pulse = 0.5 + Math.sin(t * 2.2) * 0.5;

        ctx.save();
        ctx.globalAlpha *= 0.95;

        const r = this.radius + 20 + pulse * 3;

        const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, r + 26);
        aura.addColorStop(0, 'rgba(255, 193, 7, 0.00)');
        aura.addColorStop(0.55, `rgba(255, 193, 7, ${0.10 + 0.08 * pulse})`);
        aura.addColorStop(1, 'rgba(255, 193, 7, 0.00)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, r + 26, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring + rotating segments
        ctx.shadowBlur = 22;
        ctx.shadowColor = 'rgba(255, 193, 7, 0.85)';
        ctx.strokeStyle = `rgba(255, 213, 79, ${0.35 + 0.25 * pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 16;
        ctx.shadowColor = 'rgba(255, 152, 0, 0.9)';
        ctx.lineWidth = 6;
        ctx.strokeStyle = `rgba(255, 152, 0, ${0.22 + 0.25 * pulse})`;
        const segs = 10;
        for (let i = 0; i < segs; i++) {
            const a0 = (t * 0.9) + i * (Math.PI * 2 / segs);
            ctx.beginPath();
            ctx.arc(0, 0, r - 6, a0, a0 + 0.35);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        const dx = Math.cos(this.angle);
        const dy = Math.sin(this.angle);
        const px = -dy;
        const py = dx;
        ctx.lineWidth = 2;
        for (let i = -3; i <= 3; i++) {
            const wob = 0.5 + Math.sin(t * 3.1 + i) * 0.5;
            const len = 10 + wob * 14;
            const sx = (-dx) * (this.radius + 10) + px * (i * 3.2);
            const sy = (-dy) * (this.radius + 10) + py * (i * 3.2);
            const ex = sx + (-dx) * len;
            const ey = sy + (-dy) * len;

            ctx.strokeStyle = `rgba(255, 87, 34, ${0.25 + 0.35 * wob})`;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 235, 59, ${0.18 + 0.35 * wob})`;
            ctx.beginPath();
            ctx.arc(ex, ey, 1.8 + wob * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8 + Math.sin(t * 1.8) * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    ctx.shadowBlur = 14;
    ctx.shadowColor = cfg.glow;

    const __tNow = Date.now();
    const __sys = __sysId || 'default';

    if (!this.__gfxPrev) this.__gfxPrev = { x: this.x, y: this.y, t: __tNow };
    const __dxp = (this.x - this.__gfxPrev.x);
    const __dyp = (this.y - this.__gfxPrev.y);
    const __dtp = Math.max(1, (__tNow - this.__gfxPrev.t) || 16);
    const __spd = Math.hypot(__dxp, __dyp) * (16 / __dtp);
    this.__gfxPrev.x = this.x; this.__gfxPrev.y = this.y; this.__gfxPrev.t = __tNow;

    const __baseR = 22;
    const __scale = ((this.radius || __baseR) / __baseR);
    if (!isNaN(__scale) && __scale > 0 && Math.abs(__scale - 1) > 0.001) ctx.scale(__scale, __scale);

    const bw = (__sys === 'speed') ? 40 : (__sys === 'juggernaut') ? 46 : (__sys === 'mage') ? 42 : 44;
    const bh = (__sys === 'speed') ? 38 : (__sys === 'juggernaut') ? 46 : (__sys === 'mage') ? 42 : 44;
    const corner = (__sys === 'speed') ? 10 : (__sys === 'juggernaut') ? 5 : (__sys === 'mage') ? 8 : 6;

    const gap = (__sys === 'juggernaut') ? 5 : 4;
    const trackW = (__sys === 'speed') ? 7 : (__sys === 'juggernaut') ? 10 : 8;
    const trackH = bh + 4;
    const leftX = -(bw / 2 + gap);
    const rightX = (bw / 2 - gap);

    (function(){
        const t = __tNow * 0.001;
        ctx.save();
        if (__sys === 'mage') {
            ctx.globalAlpha = 0.14;
            ctx.strokeStyle = __colorWithAlpha(cfg.accent || '#B3E5FC', 0.30);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, (this.radius || 22) + 10 + Math.sin(t * 2) * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = __colorWithAlpha(cfg.accent || '#B3E5FC', 0.55);
            for (let i = 0; i < 4; i++) {
                const a = t * 1.3 + i * (Math.PI * 2 / 4);
                ctx.beginPath();
                ctx.arc(Math.cos(a) * 18, Math.sin(a) * 18, 2.1, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (__sys === 'speed' && __spd > 0.7) {
            const ang = Math.atan2(__dyp, __dxp);
            const dx = Math.cos(ang), dy = Math.sin(ang);
            ctx.globalAlpha = 0.28;
            ctx.strokeStyle = __colorWithAlpha(cfg.accent || '#00E5FF', 0.38);
            ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i++) {
                const px = -dy * (i * 6);
                const py = dx * (i * 6);
                ctx.beginPath();
                ctx.moveTo(-dx * 10 + px, -dy * 10 + py);
                ctx.lineTo(-dx * 26 + px, -dy * 26 + py);
                ctx.stroke();
            }
        } else if (__sys === 'engineer') {
            ctx.globalAlpha = 0.14;
            ctx.strokeStyle = __colorWithAlpha(cfg.accent || '#FFAB00', 0.28);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 18 + Math.sin(t * 3.1) * 1.2, 0, Math.PI * 2);
            ctx.stroke();
        } else if (__sys === 'juggernaut' && __spd > 0.6) {
            ctx.globalAlpha = 0.14;
            ctx.fillStyle = 'rgba(160, 160, 160, 0.14)';
            ctx.beginPath();
            ctx.ellipse(-10, 16, 10, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(10, 16, 10, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }).call(this);

    ctx.shadowBlur = 0;
    ctx.fillStyle = (cfg.track || '#1a1a1a');
    ctx.fillRect(leftX, -trackH/2, trackW, trackH);
    ctx.fillRect(rightX, -trackH/2, trackW, trackH);

    ctx.fillStyle = (cfg.trackDetail || '#333');
    const step = (__sys === 'speed') ? 7 : (__sys === 'juggernaut') ? 9 : 8;
    for (let i = -trackH/2 + 4; i < trackH/2 - 4; i += step) {
        const w = Math.max(3, trackW - 2);
        ctx.fillRect(leftX + 1, i, w, 3);
        ctx.fillRect(rightX + 1, i, w, 3);
    }

    ctx.shadowBlur = 14;
    ctx.shadowColor = cfg.glow;

    const bodyGrad = createTankGradient(0, 0, Math.max(bw, bh) * 0.55, cfg.body);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-bw/2, -bh/2, bw, bh, corner);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(-bw/2 + 3, -bh/2 + 3, bw * 0.45, bh * 0.22, Math.max(2, corner - 3));
    ctx.fill();

    const rivet = (x,y) => {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath(); ctx.arc(x-0.5, y-0.5, 0.8, 0, Math.PI * 2); ctx.fill();
    };

    if (__sys === 'engineer') {
        // Hazard stripe + bolts + antenna
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = 'rgba(255,171,0,0.20)';
        ctx.fillRect(-bw/2 + 4, 3, bw - 8, 8);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        for (let x = -bw/2 + 6; x < bw/2 - 6; x += 6) {
            ctx.beginPath();
            ctx.moveTo(x, 3);
            ctx.lineTo(x + 6, 11);
            ctx.stroke();
        }
        for (const p of [[-bw/2+5,-bh/2+5],[bw/2-5,-bh/2+5],[-bw/2+5,bh/2-5],[bw/2-5,bh/2-5]]) rivet(p[0],p[1]);

        // Antenna
        ctx.strokeStyle = 'rgba(200,200,200,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bw/2-10, -bh/2+6);
        ctx.lineTo(bw/2-6, -bh/2-10);
        ctx.stroke();
        ctx.fillStyle = __colorWithAlpha(cfg.accent, 0.85);
        ctx.beginPath();
        ctx.arc(bw/2-6, -bh/2-10, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else if (__sys === 'juggernaut') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 213, 79, 0.22)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-bw/2+2, -bh/2+2, bw-4, bh-4, corner);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-bw*0.15, -bh/2+3);
        ctx.lineTo(-bw*0.15, bh/2-3);
        ctx.moveTo(bw*0.15, -bh/2+3);
        ctx.lineTo(bw*0.15, bh/2-3);
        ctx.stroke();

        for (const p of [[-bw/2+6,-bh/2+6],[bw/2-6,-bh/2+6],[-bw/2+6,bh/2-6],[bw/2-6,bh/2-6],[-bw*0.15,0],[bw*0.15,0]]) rivet(p[0],p[1]);

        // Front plow
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.moveTo(-bw/2, -8);
        ctx.lineTo(-bw/2-6, 0);
        ctx.lineTo(-bw/2, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    } else if (__sys === 'speed') {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.moveTo(-bw/2+4, -10);
        ctx.lineTo(-bw/2-8, -2);
        ctx.lineTo(-bw/2+4, 6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bw/2-4, -10);
        ctx.lineTo(bw/2+8, -2);
        ctx.lineTo(bw/2-4, 6);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = __colorWithAlpha(cfg.accent, 0.32);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-bw/2+6, 0);
        ctx.lineTo(bw/2-6, 0);
        ctx.stroke();
        ctx.restore();
    } else if (__sys === 'mage') {
        // Crystal corners + rune dots
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = __colorWithAlpha(cfg.accent, 0.30);
        const cr = 7;
        for (const p of [[-bw/2+6,-bh/2+6],[bw/2-6,-bh/2+6],[-bw/2+6,bh/2-6],[bw/2-6,bh/2-6]]) {
            ctx.beginPath();
            ctx.moveTo(p[0], p[1]-cr);
            ctx.lineTo(p[0]+cr, p[1]);
            ctx.lineTo(p[0], p[1]+cr);
            ctx.lineTo(p[0]-cr, p[1]);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (let i = 0; i < 8; i++) {
            const a = (__tNow * 0.002) + i * (Math.PI * 2 / 8);
            ctx.beginPath();
            ctx.arc(Math.cos(a)*14, Math.sin(a)*14, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    } else {
        // Warrior: front ram + crest
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.moveTo(0, -bh/2);
        ctx.lineTo(10, -bh/2-8);
        ctx.lineTo(20, -bh/2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, bh/2);
        ctx.lineTo(10, bh/2+8);
        ctx.lineTo(20, bh/2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = __colorWithAlpha(cfg.accent || '#FF5252', 0.25);
        ctx.beginPath();
        ctx.roundRect(-6, -6, 12, 12, 3);
        ctx.fill();
        ctx.restore();
    }

    ctx.rotate(this.angle);

    const wObj = this.getCurrentWeaponObj();
    const wConfig = (BULLET_TYPES && wObj && wObj.id && BULLET_TYPES[wObj.id]) ? BULLET_TYPES[wObj.id] : { color: '#ffffff' };
    const muzzleColor = __safeColor(wConfig.color, (cfg.accent || '#ffffff'));

    const turretR = (__sys === 'speed') ? 16 : (__sys === 'juggernaut') ? 20 : 18;
    const barrelLen = (__sys === 'speed') ? 46 : (__sys === 'juggernaut') ? 38 : 42;
    const barrelW = (__sys === 'speed') ? 10 : (__sys === 'juggernaut') ? 14 : 12;

    const turretGrad = ctx.createRadialGradient(-3, -3, 0, 0, 0, turretR);
    turretGrad.addColorStop(0, cfg.turret[1]);
    turretGrad.addColorStop(1, cfg.turret[0]);
    ctx.fillStyle = turretGrad;

    if (__sys === 'engineer') {
        ctx.beginPath();
        const teeth = 10;
        for (let i = 0; i < teeth; i++) {
            const a = i * (Math.PI * 2 / teeth);
            const r1 = turretR * 0.92;
            const r2 = turretR * 1.06;
            const r = (i % 2 === 0) ? r2 : r1;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, turretR, 0, Math.PI * 2);
        ctx.fill();
    }

    // Mage: rune ring
    if (__sys === 'mage') {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = __colorWithAlpha(cfg.accent, 0.35);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, turretR + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (let i = 0; i < 8; i++) {
            const a = (__tNow * 0.003) + i * (Math.PI * 2 / 8);
            ctx.beginPath();
            ctx.arc(Math.cos(a) * (turretR + 3), Math.sin(a) * (turretR + 3), 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    const barrelGrad = ctx.createLinearGradient(0, -barrelW/2, 0, barrelW/2);
    barrelGrad.addColorStop(0, '#555');
    barrelGrad.addColorStop(0.35, '#777');
    barrelGrad.addColorStop(0.75, '#555');
    barrelGrad.addColorStop(1, '#333');
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(0, -barrelW/2, barrelLen, barrelW);

    if (__sys === 'juggernaut') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(6, -barrelW/2 - 2, 16, 4);
        ctx.fillRect(6, barrelW/2 - 2, 16, 4);
    }

    ctx.fillStyle = muzzleColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = muzzleColor;
    ctx.fillRect(barrelLen - 5, -barrelW/2 - 1, 10, barrelW + 2);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(5, -barrelW/2 + 2, Math.max(10, barrelLen * 0.55), 3);

    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(6, turretR * 0.45), 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    if (this.systemId === 'mage' && this.mage && this.mage.blizzard && this.mage.blizzard.active) {
        const bz = this.mage.blizzard;
        const __getSkillDef = __getSystemSkillDefFn();
        const skillCfg = (__getSkillDef ? (__getSkillDef('mage', 'vampirism') || {}) : {});
        const outerR = (skillCfg.radius != null) ? skillCfg.radius : 220;
        const innerR = (skillCfg.innerRadius != null) ? skillCfg.innerRadius : 70;

        const now = Date.now();
        const t = now * 0.001;
        const TAU = Math.PI * 2;
        const dpr = ((typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1) || 1);

        // FX state (per blizzard instance)
        if (!bz.__stormFx) {
            const winds = [];
            const n = 22;
            for (let i = 0; i < n; i++) {
                const a = (i / n) * TAU;
                winds.push({
                    a0: a,
                    r0: (0.18 + (i % 7) / 7 * 0.75),
                    spd: 0.9 + (i % 5) * 0.18,
                    len: 45 + (i % 6) * 18,
                    wid: 1.2 + (i % 3) * 0.6,
                    phase: (i * 17) % 360
                });
            }
            bz.__stormFx = { last: 0, winds, gust: 0 };
        }
        const fx = bz.__stormFx;

        if (!fx.last || (now - fx.last) > 90) {
            fx.last = now;
            fx.gust = (fx.gust + 1) % 100000;
        }

        const fogA = __getBlizzardFogSprite(outerR, 0, dpr);
        const fogB = __getBlizzardFogSprite(outerR, 1, dpr);
        const wall = __getBlizzardWallSprite(outerR, dpr);
        const streak = __getBlizzardStreakSprite(dpr);

        ctx.save();
        ctx.translate(bz.x, bz.y);

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, outerR, 0, TAU);
        ctx.clip();

        ctx.globalAlpha = 0.22;
        ctx.fillStyle = 'rgba(0, 229, 255, 0.10)';
        ctx.beginPath();
        ctx.arc(0, 0, outerR, 0, TAU);
        ctx.fill();

        // Fog layers (sprite cache)
        if (fogA) {
            ctx.save();
            ctx.globalAlpha = 0.26;
            ctx.rotate(t * 0.35);
            ctx.drawImage(fogA.c, -fogA.size / 2, -fogA.size / 2, fogA.size, fogA.size);
            ctx.restore();
        }
        if (fogB) {
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.rotate(-t * 0.52);
            ctx.drawImage(fogB.c, -fogB.size / 2, -fogB.size / 2, fogB.size, fogB.size);
            ctx.restore();
        }

        if (streak) {
            const count = fx.winds.length;
            const swirlDir = 1;
            for (let i = 0; i < count; i++) {
                const w = fx.winds[i];
                const ang = w.a0 + swirlDir * (t * w.spd) + Math.sin((fx.gust + i) * 0.17) * 0.08;
                const rr = outerR * (w.r0 + 0.06 * Math.sin(t * 1.9 + i));

                const x = Math.cos(ang) * rr;
                const y = Math.sin(ang) * rr;

                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.translate(x, y);
                ctx.rotate(ang + Math.PI / 2);

                const edgeFade = Math.max(0, Math.min(1, 1 - (rr / outerR) * 0.9));
                ctx.globalAlpha *= (0.55 + edgeFade);

                const ww = streak.w;
                const hh = streak.h;
                const scaleL = (w.len / 140);
                const scaleW = (w.wid / 2.0);
                ctx.scale(scaleL, scaleW);
                ctx.drawImage(streak.c, -ww * 0.55, -hh * 0.5, ww, hh);
                ctx.restore();
            }
        }

        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(0, 0, innerR, 0, TAU);
        ctx.fill();

        ctx.globalAlpha = 0.55;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 10; i++) {
            const a = t * 2.0 + i * (TAU / 10);
            const r = innerR * (0.25 + 0.35 * Math.sin(t * 1.4 + i));
            ctx.beginPath();
            ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2.2, 0, TAU);
            ctx.fill();
        }
        ctx.restore();

        ctx.restore(); // end clip

        // Storm wall ring (sprite cache).
        if (wall) {
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.rotate(t * 0.45);
            ctx.drawImage(wall.c, -wall.size / 2, -wall.size / 2, wall.size, wall.size);
            ctx.restore();
        }

        // Outer outline + pulse
        const pulse = 0.65 + Math.sin(t * 6.0) * 0.12;
        ctx.strokeStyle = skillCfg.color || 'rgba(0,229,255,0.7)';
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, outerR, 0, TAU);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.globalAlpha = 0.55 * pulse;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 12]);
        ctx.beginPath();
        ctx.arc(0, 0, outerR - 10, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner outline (eye)
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, innerR, 0, TAU);
        ctx.stroke();

        if (bz.locked) {
            ctx.globalAlpha = 0.90;
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, innerR + 10 + Math.sin(t * 3.0) * 3, 0, TAU);
            ctx.stroke();

            ctx.globalAlpha = 0.55;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-innerR * 0.65, 0);
            ctx.lineTo(innerR * 0.65, 0);
            ctx.moveTo(0, -innerR * 0.65);
            ctx.lineTo(0, innerR * 0.65);
            ctx.stroke();
        }

        ctx.restore();
    }
};

const __EnemyCtorForDraw = __getEnemyCtor();
const _originalEnemyDraw = (__EnemyCtorForDraw && __EnemyCtorForDraw.prototype) ? __EnemyCtorForDraw.prototype.draw : null;
if (__EnemyCtorForDraw && __EnemyCtorForDraw.prototype && typeof _originalEnemyDraw === 'function') __EnemyCtorForDraw.prototype.draw = function() {
    const cfg = GFX.ENEMIES[this.typeKey] || GFX.ENEMIES.RED;
    
    if (this.typeKey === 'BOSS') {
        this.drawBoss();
        return;
    }
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    if (this.effects.stun.active) {
        ctx.strokeStyle = '#00BCD4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = cfg.glow;
    
    if (this.typeKey === 'BLACK') {
        ctx.fillStyle = '#111';
        ctx.fillRect(-this.radius - 3, -this.radius, 6, this.radius * 2);
        ctx.fillRect(this.radius - 3, -this.radius, 6, this.radius * 2);
    }
    
    const bodyGrad = createTankGradient(0, 0, this.radius, cfg.body);
    ctx.fillStyle = bodyGrad;
    
    if (cfg.outline) {
        ctx.strokeStyle = cfg.outline;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2, 4);
        ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.roundRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2, 4);
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(-this.radius + 3, -this.radius + 3, this.radius - 3, this.radius / 2, 2);
    ctx.fill();
    
    ctx.rotate(this.angle);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.fillRect(0, -5, this.radius + 5, 10);
    
    const bulletColor = this.typeKey === 'YELLOW' ? '#FFF59D' : '#E040FB';
    ctx.fillStyle = bulletColor;
    ctx.fillRect(this.radius, -6, 6, 12);
    
    ctx.restore();
    
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30, 5);
    
    const hpGrad = ctx.createLinearGradient(this.x - 15, 0, this.x + 15, 0);
    if (hpPercent > 0.5) {
        hpGrad.addColorStop(0, '#4CAF50');
        hpGrad.addColorStop(1, '#8BC34A');
    } else if (hpPercent > 0.25) {
        hpGrad.addColorStop(0, '#FF9800');
        hpGrad.addColorStop(1, '#FFC107');
    } else {
        hpGrad.addColorStop(0, '#f44336');
        hpGrad.addColorStop(1, '#E91E63');
    }
    ctx.fillStyle = hpGrad;
    ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30 * hpPercent, 5);
};

if (__EnemyCtorForDraw && __EnemyCtorForDraw.prototype) __EnemyCtorForDraw.prototype.drawBoss = function() {
    const cfg = GFX.ENEMIES.BOSS;
    const size = this.radius;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    if (this.bossAI && this.bossAI.enraged) {
        const pulse = 0.5 + Math.sin(Date.now() / 80) * 0.3;
        ctx.fillStyle = `rgba(255, 23, 68, ${0.1 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 23, 68, ${0.6 * pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(5, 8, size * 0.9, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Glow
    ctx.shadowBlur = 30;
    ctx.shadowColor = cfg.glow;
    
    const bodyGrad = createTankGradient(0, 0, size, cfg.body);
    ctx.fillStyle = bodyGrad;
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#FFEB3B';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    const corePulse = 0.8 + Math.sin(Date.now() / 200) * 0.2;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
    coreGrad.addColorStop(0, cfg.core[2]);
    coreGrad.addColorStop(0.5, cfg.core[1]);
    coreGrad.addColorStop(1, cfg.core[0]);
    
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4 * corePulse, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFEB3B';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFEB3B';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    const barrelLength = size * 1.2;
    const barrelWidth = 12;
    
    ctx.fillStyle = '#7F0000';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#424242';
    ctx.fillRect(0, -barrelWidth/2, barrelLength, barrelWidth);
    
    ctx.fillRect(0, -barrelWidth * 1.5, barrelLength * 0.8, barrelWidth * 0.7);
    ctx.fillRect(0, barrelWidth * 0.8, barrelLength * 0.8, barrelWidth * 0.7);
    
    ctx.fillStyle = '#FF5722';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#FF5722';
    ctx.fillRect(barrelLength - 5, -barrelWidth/2 - 2, 8, barrelWidth + 4);
    
    ctx.restore();
    
    if (this.bossAI) {
        const now2 = Date.now();
        const ai = this.bossAI;

        if (ai.state === 'charge_windup') {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,23,68,0.9)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(ai.chargeDir) * 280, this.y + Math.sin(ai.chargeDir) * 280);
            ctx.stroke();
            ctx.restore();
        }

        if (ai.state === 'radial_windup') {
            ctx.save();
            const t = Math.max(0, Math.min(1, (ai.stateEnd - now2) / 550));
            const r = 110 + (1 - t) * 50;
            ctx.strokeStyle = 'rgba(255,23,68,0.75)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (ai.state === 'summon_cast') {
            ctx.save();
            const t = Math.max(0, Math.min(1, (ai.stateEnd - now2) / 650));
            const r = 90 + (1 - t) * 70;
            ctx.strokeStyle = 'rgba(255,235,59,0.75)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
};

const _originalBulletDraw = Bullet.prototype.draw;

// Bullet sprite cache (nh? FPS)
const __BULLET_GFX = { sprites: new Map() };

function __bulletRoundRectPath(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - r);
    g.arcTo(x + w, y + h, x + w - r, y + h, r);
    g.lineTo(x + r, y + h);
    g.arcTo(x, y + h, x, y + h - r, r);
    g.lineTo(x, y + r);
    g.arcTo(x, y, x + r, y, r);
    g.closePath();
}

function __getBulletSprite(typeKey, baseColor, radius, dpr) {
    try {
        dpr = dpr || 1;
        radius = Math.max(2, radius || 4);
        const col = __safeColor(baseColor, '#FFFFFF');
        const key = `${typeKey}|${col}|${Math.round(radius*10)/10}|${dpr}`;
        if (__BULLET_GFX.sprites.has(key)) return __BULLET_GFX.sprites.get(key);

        const r = radius;
        const L = r * 5.2; // base length budget
        const W = r * 2.6;
        const pad = 18;
        const cw = Math.ceil((L + pad * 2) * dpr);
        const ch = Math.ceil((W + pad * 2) * dpr);

        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        const g = c.getContext('2d');
        g.clearRect(0, 0, cw, ch);

        g.save();
        g.translate(cw / 2, ch / 2);
        g.scale(dpr, dpr);

        const colA = (a) => __colorWithAlpha(col, a);

        // Common soft outer glow (draw once in sprite)
        if (typeKey !== 'PIERCING') {
            const og = g.createRadialGradient(-r*0.6, -r*0.6, 0, 0, 0, r*2.6);
            og.addColorStop(0, colA(0.55));
            og.addColorStop(0.5, colA(0.18));
            og.addColorStop(1, 'transparent');
            g.fillStyle = og;
            g.beginPath();
            g.arc(0, 0, r*2.4, 0, Math.PI*2);
            g.fill();
        }

        switch (typeKey) {
            case 'NORMAL': {
                // Metallic slug (capsule) with tiny tip
                const bodyL = r*3.9, bodyW = r*1.35;
                const grad = g.createLinearGradient(-bodyL/2, 0, bodyL/2, 0);
                grad.addColorStop(0, 'rgba(255,255,255,0.95)');
                grad.addColorStop(0.25, 'rgba(210,210,210,0.95)');
                grad.addColorStop(0.55, 'rgba(140,140,140,0.95)');
                grad.addColorStop(1, 'rgba(255,255,255,0.75)');
                g.fillStyle = grad;
                __bulletRoundRectPath(g, -bodyL/2, -bodyW/2, bodyL, bodyW, bodyW/2);
                g.fill();

                // Tip cone
                g.fillStyle = 'rgba(255,255,255,0.9)';
                g.beginPath();
                g.moveTo(bodyL/2, -bodyW/2);
                g.lineTo(bodyL/2 + r*0.9, 0);
                g.lineTo(bodyL/2, bodyW/2);
                g.closePath();
                g.fill();

                // Small highlight line
                g.strokeStyle = 'rgba(255,255,255,0.55)';
                g.lineWidth = 1;
                g.beginPath();
                g.moveTo(-bodyL/2 + r*0.3, -bodyW*0.18);
                g.lineTo(bodyL/2 - r*0.1, -bodyW*0.18);
                g.stroke();

                // Color ring at base (subtle)
                g.strokeStyle = colA(0.65);
                g.lineWidth = 1.5;
                g.beginPath();
                g.arc(-bodyL/2 + r*0.2, 0, r*0.55, 0, Math.PI*2);
                g.stroke();
                break;
            }

            case 'STUN': {
                // Cyan stun orb with rings + shock cross
                const rg = g.createRadialGradient(-r*0.4, -r*0.4, 0, 0, 0, r*1.9);
                rg.addColorStop(0, 'rgba(255,255,255,0.95)');
                rg.addColorStop(0.25, colA(0.95));
                rg.addColorStop(0.8, colA(0.35));
                rg.addColorStop(1, 'transparent');
                g.fillStyle = rg;
                g.beginPath(); g.arc(0,0,r*1.35,0,Math.PI*2); g.fill();

                g.strokeStyle = colA(0.75);
                g.lineWidth = 2;
                g.beginPath(); g.arc(0,0,r*1.25,0,Math.PI*2); g.stroke();
                g.globalAlpha = 0.55;
                g.beginPath(); g.arc(0,0,r*0.75,0,Math.PI*2); g.stroke();
                g.globalAlpha = 1;

                g.strokeStyle = 'rgba(255,255,255,0.85)';
                g.lineWidth = 1.5;
                g.beginPath();
                g.moveTo(-r*0.55, 0); g.lineTo(r*0.55, 0);
                g.moveTo(0, -r*0.55); g.lineTo(0, r*0.55);
                g.stroke();
                break;
            }

            case 'LIGHTNING': {
                // Bolt shard (zigzag spear)
                const boltL = r*4.6;
                const boltW = r*1.25;

                g.fillStyle = colA(0.95);
                g.beginPath();
                g.moveTo(-boltL/2, -boltW*0.2);
                g.lineTo(-boltL*0.05, -boltW*0.7);
                g.lineTo(-boltL*0.15, -boltW*0.15);
                g.lineTo(boltL*0.15, -boltW*0.85);
                g.lineTo(boltL*0.05, -boltW*0.1);
                g.lineTo(boltL/2, 0);
                g.lineTo(boltL*0.05, boltW*0.1);
                g.lineTo(boltL*0.15, boltW*0.85);
                g.lineTo(-boltL*0.15, boltW*0.15);
                g.lineTo(-boltL*0.05, boltW*0.7);
                g.lineTo(-boltL/2, boltW*0.2);
                g.closePath();
                g.fill();

                g.strokeStyle = 'rgba(255,255,255,0.8)';
                g.lineWidth = 1.25;
                g.beginPath();
                g.moveTo(-boltL/2 + r*0.3, 0);
                g.lineTo(boltL/2 - r*0.2, 0);
                g.stroke();
                break;
            }

            case 'FIRE': {
                // Flame droplet
                const flameL = r*4.8;
                const flameW = r*2.4;

                const fg = g.createLinearGradient(-flameL/2, 0, flameL/2, 0);
                fg.addColorStop(0, 'rgba(255,235,59,0.95)');
                fg.addColorStop(0.35, 'rgba(255,152,0,0.92)');
                fg.addColorStop(1, colA(0.95));

                g.fillStyle = fg;
                g.beginPath();
                g.moveTo(flameL*0.55, 0);
                g.quadraticCurveTo(flameL*0.15, -flameW*0.55, -flameL*0.35, 0);
                g.quadraticCurveTo(flameL*0.15, flameW*0.55, flameL*0.55, 0);
                g.closePath();
                g.fill();

                // inner core
                g.fillStyle = 'rgba(255,255,255,0.55)';
                g.beginPath();
                g.moveTo(flameL*0.35, 0);
                g.quadraticCurveTo(flameL*0.10, -flameW*0.28, -flameL*0.15, 0);
                g.quadraticCurveTo(flameL*0.10, flameW*0.28, flameL*0.35, 0);
                g.closePath();
                g.fill();
                break;
            }

            case 'PIERCING': {
                // Needle + arrowhead (no big glow)
                const needleL = r*5.6;
                const needleW = Math.max(2, r*0.75);

                g.fillStyle = colA(0.95);
                __bulletRoundRectPath(g, -needleL/2, -needleW/2, needleL*0.78, needleW, needleW/2);
                g.fill();

                g.beginPath();
                g.moveTo(needleL*0.28, -needleW*0.9);
                g.lineTo(needleL/2, 0);
                g.lineTo(needleL*0.28, needleW*0.9);
                g.closePath();
                g.fill();

                g.strokeStyle = 'rgba(255,255,255,0.6)';
                g.lineWidth = 1;
                g.beginPath();
                g.moveTo(-needleL/2 + r*0.25, -needleW*0.18);
                g.lineTo(needleL*0.25, -needleW*0.18);
                g.stroke();
                break;
            }

            case 'HOMING': {
                // Arcane orb + fins (spin in main draw)
                const rg = g.createRadialGradient(-r*0.45, -r*0.45, 0, 0, 0, r*1.9);
                rg.addColorStop(0, 'rgba(255,255,255,0.85)');
                rg.addColorStop(0.25, colA(0.95));
                rg.addColorStop(0.85, colA(0.35));
                rg.addColorStop(1, 'transparent');

                g.fillStyle = rg;
                g.beginPath(); g.arc(0,0,r*1.35,0,Math.PI*2); g.fill();

                g.strokeStyle = colA(0.75);
                g.lineWidth = 2;
                g.beginPath(); g.arc(0,0,r*1.25,0,Math.PI*2); g.stroke();

                // orbit ring
                g.globalAlpha = 0.55;
                g.lineWidth = 1.5;
                g.beginPath(); g.ellipse(0,0,r*1.55,r*0.85,0.2,0,Math.PI*2); g.stroke();
                g.globalAlpha = 1;

                // fins (3)
                g.fillStyle = colA(0.9);
                for (let i=0;i<3;i++){
                    const a = i*(Math.PI*2/3);
                    const x = Math.cos(a)*r*1.35;
                    const y = Math.sin(a)*r*1.35;
                    g.save();
                    g.translate(x,y);
                    g.rotate(a);
                    g.beginPath();
                    g.moveTo(0,0);
                    g.lineTo(r*0.85, r*0.22);
                    g.lineTo(r*0.85,-r*0.22);
                    g.closePath();
                    g.fill();
                    g.restore();
                }

                // core
                g.fillStyle = 'rgba(0,0,0,0.35)';
                g.beginPath(); g.arc(0,0,r*0.55,0,Math.PI*2); g.fill();
                g.fillStyle = 'rgba(255,255,255,0.65)';
                g.beginPath(); g.arc(-r*0.18,-r*0.18,r*0.20,0,Math.PI*2); g.fill();
                break;
            }

            default: {
                // Generic energy orb
                const rg = g.createRadialGradient(-r*0.45, -r*0.45, 0, 0, 0, r*2.0);
                rg.addColorStop(0, 'rgba(255,255,255,0.85)');
                rg.addColorStop(0.3, colA(0.9));
                rg.addColorStop(0.9, colA(0.25));
                rg.addColorStop(1, 'transparent');
                g.fillStyle = rg;
                g.beginPath(); g.arc(0,0,r*1.4,0,Math.PI*2); g.fill();
                g.strokeStyle = colA(0.55);
                g.lineWidth = 1.5;
                g.beginPath(); g.arc(0,0,r*1.25,0,Math.PI*2); g.stroke();
                break;
            }
        }

        g.restore();

        const sprite = { canvas: c, w: cw / dpr, h: ch / dpr };
        __BULLET_GFX.sprites.set(key, sprite);
        return sprite;
    } catch (e) {
        return null;
    }
}

Bullet.prototype.draw = function() {
    ctx.save();

    const tk = this.typeKey;
    const baseColor = __safeColor(this.config && this.config.color, '#FFFFFF');
    const dpr = (window.devicePixelRatio || 1);

    if (this.trail && this.trail.length > 1 && tk !== 'FIREBALL') {
        if (tk !== 'ROCKET') {
            const pts = this.trail;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);

            let lw = Math.max(1.2, this.radius * 1.0);
            let alpha = 0.28;

            if (tk === 'PIERCING') { lw = Math.max(1.0, this.radius * 0.7); alpha = 0.65; }
            else if (tk === 'LIGHTNING') { lw = Math.max(1.4, this.radius * 0.95); alpha = 0.45; ctx.setLineDash([6, 10]); }
            else if (tk === 'STUN') { lw = Math.max(1.2, this.radius * 0.85); alpha = 0.35; ctx.setLineDash([2, 7]); }
            else if (tk === 'FIRE') { lw = Math.max(1.8, this.radius * 1.15); alpha = 0.25; }
            else if (tk === 'HOMING') { lw = Math.max(1.4, this.radius * 1.0); alpha = 0.30; }

            ctx.strokeStyle = baseColor;
            ctx.lineWidth = lw;
            ctx.lineCap = 'round';
            ctx.globalAlpha = alpha;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.setLineDash([]);

            if (tk === 'FIRE') {
                const p = pts[pts.length - 1];
                const flick = 0.55 + Math.sin(Date.now() / 90 + this.x * 0.01) * 0.25;
                ctx.fillStyle = __colorWithAlpha('#FFEB3B', 0.35 * flick);
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(2, this.radius * 0.65), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Body.
    // ROCKET
    if (tk === 'ROCKET') {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const flameLength = 18 + Math.random() * 8;
        const flameGrad = ctx.createLinearGradient(-flameLength, 0, -8, 0);
        flameGrad.addColorStop(0, 'transparent');
        flameGrad.addColorStop(0.25, 'rgba(255,235,59,0.75)');
        flameGrad.addColorStop(0.55, 'rgba(255,152,0,0.9)');
        flameGrad.addColorStop(1, 'rgba(255,87,34,1)');

        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(-flameLength, 0);
        ctx.lineTo(-8, 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#424242';
        ctx.fillRect(-10, -5, 20, 10);

        ctx.fillStyle = '#D50000';
        ctx.beginPath();
        ctx.moveTo(10, -5);
        ctx.lineTo(18, 0);
        ctx.lineTo(10, 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#616161';
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(-15, -10);
        ctx.lineTo(-6, -5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, 5);
        ctx.lineTo(-15, 10);
        ctx.lineTo(-6, 5);
        ctx.closePath();
        ctx.fill();
    }
    else if (tk === 'FIREBALL') {
        ctx.translate(this.x, this.y);
        const r = this.radius || 36;

        ctx.shadowBlur = 35;
        ctx.shadowColor = '#FF5722';

        for (let i = 3; i >= 0; i--) {
            const layerR = r * (1 + i * 0.15);
            const alpha = 0.28 - i * 0.05;
            ctx.fillStyle = `rgba(255, 87, 34, ${alpha})`;
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.25) {
                const wave = Math.sin(a * 5 + Date.now() / 110) * 5;
                const px = Math.cos(a) * (layerR + wave);
                const py = Math.sin(a) * (layerR + wave);
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        coreGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
        coreGrad.addColorStop(0.2, 'rgba(255,235,59,0.9)');
        coreGrad.addColorStop(0.5, 'rgba(255,152,0,0.8)');
        coreGrad.addColorStop(0.8, 'rgba(255,87,34,0.6)');
        coreGrad.addColorStop(1, 'rgba(255,87,34,0)');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
    }
    // Other bullet types: sprite-based
    else {
        const ang = (typeof this.angle === 'number' && !isNaN(this.angle)) ? this.angle :
                    Math.atan2((this.velocity && this.velocity.y) || 0, (this.velocity && this.velocity.x) || 1);

        const sprite = __getBulletSprite(tk, baseColor, this.radius, dpr);

        ctx.translate(this.x, this.y);

        // slight spin for magic bullets
        if (tk === 'HOMING') ctx.rotate(ang + (Date.now() / 220));
        else if (tk === 'STUN') ctx.rotate(ang + (Date.now() / 420));
        else ctx.rotate(ang);

        if (sprite && sprite.canvas) {
            ctx.drawImage(sprite.canvas, -sprite.w / 2, -sprite.h / 2, sprite.w, sprite.h);
        } else {
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(2, this.radius), 0, Math.PI * 2);
            ctx.fill();
        }

        if (tk === 'LIGHTNING') {
            const flick = 0.4 + Math.random() * 0.35;
            ctx.strokeStyle = __colorWithAlpha('#FFFFFF', 0.55 * flick);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-this.radius * 1.2, 0);
            ctx.lineTo(this.radius * 1.8, 0);
            ctx.stroke();
        } else if (tk === 'FIRE') {
            const flick = 0.35 + Math.random() * 0.35;
            ctx.fillStyle = __colorWithAlpha('#FFEB3B', 0.20 * flick);
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(2, this.radius * 1.1), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
};


const _originalCloneDraw = CloneTank.prototype.draw;
CloneTank.prototype.draw = function() {
    const cfg = GFX.CLONE;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const __baseR = (this.baseRadius || 22);
    const __scale = (__baseR > 0) ? (this.radius / __baseR) : 1;
    if (!isNaN(__scale) && __scale !== 1) ctx.scale(__scale, __scale);
    
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = cfg.body[1];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.globalAlpha = 1;
    
    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = cfg.glow;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-26, -24, 8, 48);
    ctx.fillRect(18, -24, 8, 48);
    
    const bodyGrad = createTankGradient(0, 0, 22, cfg.body);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-22, -22, 44, 44, 6);
    ctx.fill();
    
    ctx.rotate(this.angle);
    
    const turretGrad = ctx.createRadialGradient(-3, -3, 0, 0, 0, 18);
    turretGrad.addColorStop(0, cfg.turret[1]);
    turretGrad.addColorStop(1, cfg.turret[0]);
    ctx.fillStyle = turretGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    
    const barrelGrad = ctx.createLinearGradient(0, -6, 0, 6);
    barrelGrad.addColorStop(0, '#555');
    barrelGrad.addColorStop(0.5, '#777');
    barrelGrad.addColorStop(1, '#555');
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(0, -6, 40, 12);
    
    ctx.fillStyle = '#81D4FA';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#81D4FA';
    ctx.fillRect(35, -7, 8, 14);
    
    ctx.restore();
};

const _originalObstacleDraw = Obstacle.prototype.draw;
Obstacle.prototype.draw = function() {
    ctx.save();
    
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(this.x + 10, this.y + 10, this.width, this.height);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(this.x + 14, this.y + 14, this.width, this.height);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(this.x + 18, this.y + 18, this.width, this.height);

    const cs = ctx.createLinearGradient(this.x, this.y + this.height, this.x, this.y + this.height + 14);
    cs.addColorStop(0, 'rgba(0,0,0,0.26)');
    cs.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cs;
    ctx.fillRect(this.x + 2, this.y + this.height, this.width - 4, 14);
    
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
    grad.addColorStop(0, '#546E7A');
    grad.addColorStop(0.5, '#607D8B');
    grad.addColorStop(1, '#455A64');
    
    ctx.fillStyle = grad;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(this.x, this.y, this.width, 5);
    
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(this.x, this.y, 5, this.height);
    
    ctx.strokeStyle = '#37474F';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 10, this.y + 10);
    ctx.lineTo(this.x + this.width - 10, this.y + this.height - 10);
    ctx.stroke();
    
    ctx.restore();
};



const __MAP_PRETTY = { tile: null, pattern: null, tileSize: 256, seed: (Math.random() * 1e9) | 0 };

function __buildMapPrettyTile() {
    try {
        const s = __MAP_PRETTY.tileSize || 256;
        const c = document.createElement('canvas');
        c.width = s; c.height = s;
        const g = c.getContext('2d');
        g.clearRect(0, 0, s, s);

        // base tone
        g.fillStyle = 'rgba(18, 20, 26, 1)';
        g.fillRect(0, 0, s, s);

        // subtle noise speckles
        for (let i = 0; i < 1100; i++) {
            const x = (Math.random() * s) | 0;
            const y = (Math.random() * s) | 0;
            const a = 0.02 + Math.random() * 0.05;
            g.fillStyle = `rgba(255,255,255,${a})`;
            g.fillRect(x, y, 1, 1);
        }

        // darker pits
        for (let i = 0; i < 420; i++) {
            const x = (Math.random() * s) | 0;
            const y = (Math.random() * s) | 0;
            const a = 0.03 + Math.random() * 0.06;
            g.fillStyle = `rgba(0,0,0,${a})`;
            g.fillRect(x, y, 1, 1);
        }

        // micro scratches
        g.strokeStyle = 'rgba(255,255,255,0.05)';
        g.lineWidth = 1;
        for (let i = 0; i < 24; i++) {
            const x1 = Math.random() * s;
            const y1 = Math.random() * s;
            const len = 18 + Math.random() * 38;
            const ang = Math.random() * Math.PI * 2;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len);
            g.stroke();
        }

        // soft tile grid (replaces expensive per-frame grid loops)
        g.strokeStyle = 'rgba(255,255,255,0.04)';
        g.lineWidth = 1;
        for (let i = 0; i <= s; i += 64) {
            g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, s); g.stroke();
            g.beginPath(); g.moveTo(0, i + 0.5); g.lineTo(s, i + 0.5); g.stroke();
        }

        __MAP_PRETTY.tile = c;
        try { __MAP_PRETTY.pattern = ctx.createPattern(__MAP_PRETTY.tile, 'repeat'); } catch (e) { __MAP_PRETTY.pattern = null; }
    } catch (e) {
        __MAP_PRETTY.tile = null;
        __MAP_PRETTY.pattern = null;
    }
}

function drawPrettyMapBackground() {
    try {
        if (!__MAP_PRETTY.tile || !__MAP_PRETTY.pattern) __buildMapPrettyTile();

        // viewport in world coords
        const cam = __getCamera();
        const camX = (cam && !isNaN(cam.x)) ? cam.x : 0;
        const camY = (cam && !isNaN(cam.y)) ? cam.y : 0;
        const z = (cam && cam.zoom && isFinite(cam.zoom)) ? cam.zoom : 1;
        const viewW = canvas.width / (z || 1);
        const viewH = canvas.height / (z || 1);
        const pad = 90;
        const x0 = Math.max(0, camX - pad);
        const y0 = Math.max(0, camY - pad);
        const x1 = Math.min(WORLD_WIDTH, camX + viewW + pad);
        const y1 = Math.min(WORLD_HEIGHT, camY + viewH + pad);
        const w = Math.max(0, x1 - x0);
        const h = Math.max(0, y1 - y0);
        if (w <= 0 || h <= 0) return;

        // Base
        ctx.fillStyle = '#0f1116';
        ctx.fillRect(x0, y0, w, h);

        // Texture pattern
        if (__MAP_PRETTY.pattern) {
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = __MAP_PRETTY.pattern;
            ctx.fillRect(x0, y0, w, h);
            ctx.restore();
        }

        // (Lighting disabled per user request)

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.55)';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        ctx.restore();
    } catch (e) {
        // fallback silent
    }
}

const _originalDrawMiniMap = typeof drawMiniMap === 'function' ? drawMiniMap : null;
drawMiniMap = function() {
    const game = __getGame();
    if (!game) return;
    const mapSize = 150;
    const mapX = canvas.width - mapSize - 20;
    const mapY = canvas.height - mapSize - 20;
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(mapX - 5, mapY - 5, mapSize + 10, mapSize + 10, 10);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(30, 30, 40, 0.9)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(mapX + (mapSize/5) * i, mapY);
        ctx.lineTo(mapX + (mapSize/5) * i, mapY + mapSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mapX, mapY + (mapSize/5) * i);
        ctx.lineTo(mapX + mapSize, mapY + (mapSize/5) * i);
        ctx.stroke();
    }
    
    const scaleX = mapSize / WORLD_WIDTH;
    const scaleY = mapSize / WORLD_HEIGHT;
    
    ctx.fillStyle = 'rgba(84, 110, 122, 0.6)';
    (game.obstacles || []).forEach(obs => {
        ctx.fillRect(mapX + obs.x * scaleX, mapY + obs.y * scaleY, obs.width * scaleX, obs.height * scaleY);
    });
    
    (game.enemies || []).forEach(e => {
        if (e.typeKey === 'BOSS') {
            ctx.fillStyle = '#FF1744';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#FF1744';
            ctx.beginPath();
            ctx.arc(mapX + e.x * scaleX, mapY + e.y * scaleY, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#f44336';
            ctx.fillRect(mapX + e.x * scaleX - 2, mapY + e.y * scaleY - 2, 4, 4);
        }
    });
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#FFD700';
    (game.pickups || []).forEach(p => {
        ctx.fillRect(mapX + p.x * scaleX - 1, mapY + p.y * scaleY - 1, 3, 3);
    });
    
    if (game.player) {
        ctx.fillStyle = '#4CAF50';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#4CAF50';
        ctx.beginPath();
        ctx.arc(mapX + game.player.x * scaleX, mapY + game.player.y * scaleY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mapX + game.player.x * scaleX, mapY + game.player.y * scaleY);
        ctx.lineTo(
            mapX + game.player.x * scaleX + Math.cos(game.player.angle) * 8,
            mapX + game.player.y * scaleY + Math.sin(game.player.angle) * 8
        );
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(mapX - 5, mapY - 5, mapSize + 10, mapSize + 10, 10);
    ctx.stroke();
    
    ctx.restore();
};

const _originalCreateComplexExplosion = createComplexExplosion;
createComplexExplosion = function(x, y, color, count) {
    if (isNaN(x) || isNaN(y)) return;
    const mult = count ? count / 10 : 1;
    const game = __getGame();
    const max = __getMax();
    if (!game || !game.particles) return;

    if (max && max.Audio && typeof max.Audio.boom === 'function') max.Audio.boom();

    game.particles.push(new Particle(x, y, {
        type: 'shockwave',
        color: color,
        size: 10,
        maxRadius: 60 * mult,
        life: 0.6,
        decay: 0.08
    }));
    
    // Inner shockwave
    game.particles.push(new Particle(x, y, {
        type: 'shockwave',
        color: '#fff',
        size: 5,
        maxRadius: 40 * mult,
        life: 0.4,
        decay: 0.1
    }));

    // Debris
    const debrisCount = Math.round(8 * mult);
    for (let i = 0; i < debrisCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 3 + Math.random() * 6;
        game.particles.push(new Particle(x, y, {
            type: 'debris',
            color: color,
            size: 4 + Math.random() * 4,
            life: 1.0,
            decay: 0.03,
            velocity: { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd }
        }));
    }

    // Smoke
    const smokeCount = Math.round(5 * mult);
    for (let i = 0; i < smokeCount; i++) {
        game.particles.push(new Particle(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, {
            type: 'smoke',
            color: '#555',
            size: 10 + Math.random() * 10,
            life: 1.5,
            decay: 0.015,
            velocity: { x: (Math.random() - 0.5) * 2, y: -1 - Math.random() * 2 }
        }));
    }

    // Sparks
    const sparkCount = Math.round(15 * mult);
    for (let i = 0; i < sparkCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 5 + Math.random() * 10;
        game.particles.push(new Particle(x, y, {
            type: 'spark',
            color: '#FFEB3B',
            size: 2,
            life: 0.3,
            decay: 0.06,
            velocity: { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd }
        }));
    }
};

const _originalCoinDraw = Coin.prototype.draw;
Coin.prototype.draw = function() {
    const time = Date.now();
    const bounce = Math.sin(time / 150 + this.x) * 3;
    const rotation = Math.sin(time / 200 + this.y);
    const t = (time - this.spawnTime) / this.maxLifeTime;
    const alpha = t > 0.85 ? Math.max(0, 1 - (t - 0.85) / 0.15) : 1;
    
    ctx.save();
    ctx.translate(this.x, this.y + bounce);
    ctx.globalAlpha = alpha;
    
    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FFD700';
    
    // 3D coin effect
    const width = 8 * Math.abs(rotation) + 2;
    
    // Edge
    ctx.fillStyle = '#FFA000';
    ctx.beginPath();
    ctx.ellipse(0, 0, width, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Face gradient
    const faceGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, 10);
    faceGrad.addColorStop(0, '#FFEB3B');
    faceGrad.addColorStop(0.5, '#FFD700');
    faceGrad.addColorStop(1, '#FFA000');
    
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.9, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-2, -3, width * 0.3, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // $ symbol
    if (Math.abs(rotation) > 0.3) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
    }
    
    ctx.restore();
};

// === Gameplay VFX Hook Pack (turret, boss, EMP) ===
(function(){
    const __TAU = Math.PI * 2;

    try {
        if (typeof Turret !== 'undefined' && Turret.prototype) {
            const _origTurretDraw = Turret.prototype.draw;

            Turret.prototype.draw = function() {
                const now = Date.now();
                const total = Math.max(1, (this.endTime - this.spawnTime));
                const remain = Math.max(0, this.endTime - now);
                const pct = Math.max(0, Math.min(1, remain / total));
                const baseR = (this.radius || 18);
                const pulse = 0.55 + 0.45 * Math.sin(now / 120);

                ctx.save();
                ctx.translate(this.x, this.y);

                // ground shadow
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.beginPath();
                ctx.ellipse(6, 8, baseR * 1.25, baseR * 0.85, 0, 0, __TAU);
                ctx.fill();
                ctx.globalAlpha = 1;

                // lifetime ring (track)
                ctx.lineWidth = 4;
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.14)';
                ctx.beginPath();
                ctx.arc(0, 0, baseR + 16, 0, __TAU);
                ctx.stroke();

                // progress ring
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.95)';
                ctx.beginPath();
                ctx.arc(0, 0, baseR + 16, -Math.PI / 2, -Math.PI / 2 + __TAU * pct);
                ctx.stroke();

                // subtle ticks
                ctx.globalAlpha = 0.25;
                ctx.strokeStyle = 'rgba(179, 229, 252, 0.85)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const a = i * (__TAU / 6) + now / 1400;
                    ctx.beginPath();
                    ctx.arc(0, 0, baseR + 16, a, a + 0.12);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // base plate (octagon)
                const plateR = baseR + 8;
                ctx.fillStyle = 'rgba(12, 18, 22, 0.92)';
                ctx.strokeStyle = 'rgba(140, 255, 255, 0.18)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const ang = i * (__TAU / 8) - Math.PI / 8;
                    const rr = plateR * (i % 2 ? 0.96 : 1);
                    const px = Math.cos(ang) * rr;
                    const py = Math.sin(ang) * rr;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // bolts
                for (let i = 0; i < 4; i++) {
                    const ang = i * (Math.PI / 2) + Math.PI / 4;
                    const bx = Math.cos(ang) * (plateR * 0.78);
                    const by = Math.sin(ang) * (plateR * 0.78);
                    ctx.fillStyle = 'rgba(0,0,0,0.45)';
                    ctx.beginPath();
                    ctx.arc(bx + 1, by + 1, 3.2, 0, __TAU);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(180, 220, 230, 0.9)';
                    ctx.beginPath();
                    ctx.arc(bx, by, 3, 0, __TAU);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(bx - 2, by);
                    ctx.lineTo(bx + 2, by);
                    ctx.stroke();
                }

                // core glow (no heavy blur)
                const coreR = baseR * 0.55;
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = 'rgba(0, 229, 255, 0.10)';
                ctx.beginPath();
                ctx.arc(0, 0, coreR * 2.1, 0, __TAU);
                ctx.fill();
                ctx.globalAlpha = 1;

                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath();
                ctx.arc(0, 0, coreR * 1.1, 0, __TAU);
                ctx.fill();

                ctx.fillStyle = 'rgba(0, 229, 255, ' + (0.28 + 0.22 * pulse) + ')';
                ctx.beginPath();
                ctx.arc(0, 0, coreR * (0.85 + 0.08 * pulse), 0, __TAU);
                ctx.fill();

                // turret head
                const headW = baseR * 1.55;
                const headH = baseR * 1.15;
                ctx.fillStyle = 'rgba(28, 46, 54, 0.95)';
                ctx.strokeStyle = 'rgba(255,255,255,0.10)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-headW / 2, -headH / 2, headW, headH, 6);
                ctx.fill();
                ctx.stroke();

                // top highlight plate
                ctx.globalAlpha = 0.28;
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.beginPath();
                ctx.roundRect(-headW / 2 + 4, -headH / 2 + 3, headW * 0.52, headH * 0.22, 4);
                ctx.fill();
                ctx.globalAlpha = 1;

                // hazard stripe band (subtle)
                ctx.save();
                ctx.globalAlpha = 0.22;
                ctx.translate(0, headH * 0.26);
                ctx.rotate(-0.2);
                ctx.fillStyle = 'rgba(255, 214, 0, 0.85)';
                for (let i = -40; i <= 40; i += 10) {
                    ctx.fillRect(i, -3, 6, 6);
                }
                ctx.restore();

                // barrel (heavy + segmented)
                ctx.rotate(this.angle || 0);
                const last = (this.lastShot || 0);
                const recoil = (now - last < 80) ? (1 - (now - last) / 80) : 0;
                const recoilOff = recoil * 5;

                ctx.fillStyle = '#1f2a2e';
                ctx.fillRect(-recoilOff, -7, 54, 14);
                ctx.fillStyle = '#37474F';
                ctx.fillRect(10 - recoilOff, -6, 30, 12);

                // segments / grooves
                ctx.globalAlpha = 0.55;
                ctx.fillStyle = 'rgba(10, 16, 20, 0.9)';
                for (let i = 12; i <= 42; i += 10) {
                    ctx.fillRect(i - recoilOff, -7, 2, 14);
                }
                ctx.globalAlpha = 1;

                // inner energy rail
                ctx.fillStyle = 'rgba(0, 229, 255, ' + (0.16 + 0.20 * pulse) + ')';
                ctx.fillRect(4 - recoilOff, -2, 44, 4);

                // muzzle tip
                const tipX = 46 - recoilOff;
                const tipColor = (this.bulletColor || '#66BB6A');
                ctx.fillStyle = tipColor;
                ctx.fillRect(tipX, -8, 10, 16);

                // muzzle highlight
                ctx.globalAlpha = 0.35 + 0.25 * pulse;
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillRect(tipX + 2, -3, 6, 2);
                ctx.globalAlpha = 1;

                ctx.restore();
            };

            // keep original accessible if needed
            Turret.prototype.__drawOriginal = _origTurretDraw;
        }
    } catch(e) {}

    function __spawnEmpFx(x, y, radius) {
        const game = __getGame();
        if (!game || !game.particles) return;

        const spawnTime = Date.now();

        class EMPBurstFX {
            constructor(x, y, r) {
                this.x = x;
                this.y = y;
                this.r = r;
                this.spawn = spawnTime;
                this.life = 540; // ms
                this.markedForDeletion = false;

                this.angs = [];
                this.jit = [];
                const n = 7;
                for (let i = 0; i < n; i++) {
                    const a = (i / n) * __TAU + (Math.random() * 0.45);
                    this.angs.push(a);
                    const arr = [];
                    for (let k = 0; k < 6; k++) arr.push((Math.random() - 0.5) * 0.35);
                    this.jit.push(arr);
                }
            }

            update() {
                const t = (Date.now() - this.spawn) / this.life;
                if (t >= 1) this.markedForDeletion = true;
            }

            draw() {
                const t = Math.max(0, Math.min(1, (Date.now() - this.spawn) / this.life));
                const alpha = 1 - t;
                const r = this.r * (0.22 + 0.78 * t);

                ctx.save();
                ctx.translate(this.x, this.y);

                // base rings
                ctx.globalAlpha = 0.85 * alpha;
                ctx.lineWidth = 10 * alpha;
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, __TAU);
                ctx.stroke();

                ctx.lineWidth = 4 * alpha;
                ctx.strokeStyle = 'rgba(179, 229, 252, 0.75)';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.68, 0, __TAU);
                ctx.stroke();

                // hex outline
                ctx.globalAlpha = 0.55 * alpha;
                ctx.setLineDash([10, 10]);
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.75)';
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = i * (__TAU / 6) - Math.PI / 2;
                    const px = Math.cos(a) * r * 0.92;
                    const py = Math.sin(a) * r * 0.92;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.setLineDash([]);

                // spokes
                ctx.globalAlpha = 0.35 * alpha;
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = i * (__TAU / 6) + t * 0.9;
                    ctx.moveTo(Math.cos(a) * r * 0.20, Math.sin(a) * r * 0.20);
                    ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
                }
                ctx.stroke();

                // bolts (jagged)
                ctx.globalAlpha = 0.90 * alpha;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                for (let i = 0; i < this.angs.length; i++) {
                    const a = this.angs[i];
                    const j = this.jit[i];
                    const ux = Math.cos(a), uy = Math.sin(a);
                    const px = -uy, py = ux;

                    ctx.strokeStyle = 'rgba(0, 229, 255, 0.95)';
                    ctx.beginPath();
                    const seg = 5;
                    for (let s = 0; s <= seg; s++) {
                        const tt = s / seg;
                        const dist = r * (0.15 + 0.85 * tt);
                        const off = (j[s] || 0) * r * 0.08 * (1 - tt);
                        const xx = ux * dist + px * off;
                        const yy = uy * dist + py * off;
                        if (s === 0) ctx.moveTo(xx, yy);
                        else ctx.lineTo(xx, yy);
                    }
                    ctx.stroke();

                    // inner white core
                    ctx.globalAlpha = 0.55 * alpha;
                    ctx.lineWidth = 1.6;
                    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
                    ctx.stroke();

                    // restore bolt style
                    ctx.globalAlpha = 0.90 * alpha;
                    ctx.lineWidth = 3;
                }

                // center burst
                ctx.globalAlpha = 0.65 * alpha;
                ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.18, 0, __TAU);
                ctx.fill();

                ctx.globalAlpha = 0.95 * alpha;
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.07, 0, __TAU);
                ctx.fill();

                ctx.restore();
            }
        }

        // main burst
        game.particles.push(new EMPBurstFX(x, y, radius));

        // extra after-rings (cheap, no blur)
        try {
            game.particles.push(new Particle(x, y, { type: 'shockwave', color: 'rgba(0,229,255,0.75)', size: 12, maxRadius: radius * 0.55, decay: 0.07 }));
            game.particles.push(new Particle(x, y, { type: 'shockwave', color: 'rgba(179,229,252,0.65)', size: 12, maxRadius: radius * 0.35, decay: 0.10 }));
        } catch(e) {}
    }

    try {
        if (typeof Player !== 'undefined' && Player.prototype && typeof Player.prototype.useSkill === 'function') {
            const _origUseSkill = Player.prototype.useSkill;
            Player.prototype.useSkill = function(skillName) {
                const pre = (this.skills && this.skills[skillName]) ? this.skills[skillName].lastUsed : null;
                const out = _origUseSkill.call(this, skillName);
                const now = Date.now();
                const post = (this.skills && this.skills[skillName]) ? this.skills[skillName].lastUsed : null;
                const didCast = (typeof post === 'number' && post !== pre && (now - post) < 120);

                const game = __getGame();
                if (didCast && game && game.mode === 'PVP_DUEL_AIM') {
                    this._pvpLastSkillCast = now;
                    this._pvpSkillLockUntil = Math.max(this._pvpSkillLockUntil || 0, now + PVP_SKILL_GLOBAL_LOCKOUT_MS);
                    if (pvpHasItem(this, 'stealth_scrambler') && (skillName === 'clone' || skillName === 'stealth')) {
                        const pvpItemTypes = __getPvpItemTypes();
                        const scrambler = pvpItemTypes.stealth_scrambler || {};
                        this._pvpAntiRevealUntil = now + (scrambler.antiRevealAfterBlinkMs || 800);
                    }
                }

                try {
                    if (didCast && this.systemId === 'engineer' && skillName === 'vampirism') {
                        const __getSkillDef = __getSystemSkillDefFn();
                        const cfg = __getSkillDef ? (__getSkillDef('engineer', 'vampirism') || {}) : {};
                        const radius = cfg.radius || 340;
                        __spawnEmpFx(this.x, this.y, radius);
                    }
                } catch(e) {}

                return out;
            }; 
        }
    } catch(e) {}
})();


// === Boss FX Pack ===
const BossFX = (() => {
    const TAU = Math.PI * 2;

    function _burst(x, y, color, count, shockR) {
        const game = __getGame();
        if (!game || !game.particles) return;
        const c = count || 16;
        for (let i = 0; i < c; i++) {
            const ang = Math.random() * TAU;
            const spd = 3 + Math.random() * 8;
            game.particles.push(new Particle(x, y, {
                type: 'spark',
                color: color || '#FF1744',
                size: 2,
                life: 0.35,
                decay: 0.05,
                velocity: { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd }
            }));
        }
        game.particles.push(new Particle(x, y, {
            type: 'shockwave',
            color: color || '#FF1744',
            size: 10,
            maxRadius: shockR || 140,
            life: 0.6,
            decay: 0.07
        }));
    }

    function ensureIntro(boss) {
        if (!boss || boss.typeKey !== 'BOSS') return;
        if (boss._bossIntroStart) return;
        const game = __getGame();
        boss._bossIntroStart = Date.now();
        boss._chargeTrail = [];
        boss._lastTrailAt = 0;
        boss._lastChargeSparkAt = 0;

        try { if (game) game.shake = Math.max(game.shake || 0, 30); } catch(e) {}
        _burst(boss.x, boss.y, '#FF1744', 22, 190);
        try { createDamageText(boss.x, boss.y - (boss.radius + 38), 'MECHA BOSS', '#FFEB3B'); } catch(e) {}
    }

    function handleAfterUpdate(boss, snap) {
        if (!boss || boss.typeKey !== 'BOSS' || !boss.bossAI) return;
        const game = __getGame();
        const ai = boss.bossAI;
        const now = Date.now();
        const state = ai.state;

        // Enrage pop
        if (snap && snap.prevEnraged === false && ai.enraged === true) {
            _burst(boss.x, boss.y, '#FF1744', 26, 210);
            try { if (game) game.shake = Math.max(game.shake || 0, 22); } catch(e) {}
        }

        // State transition hits
        if (snap && snap.prevState !== state) {
            if (state === 'charge_windup') {
                _burst(boss.x, boss.y, '#FF1744', 10, 120);
            }
            if (state === 'charge') {
                boss._chargeTrail = [];
                boss._lastTrailAt = 0;
                boss._lastChargeSparkAt = 0;
                try { if (game) game.shake = Math.max(game.shake || 0, 18); } catch(e) {}
                _burst(boss.x, boss.y, '#FF1744', 10, 120);
            }
            if (state === 'radial_windup') {
                _burst(boss.x, boss.y, '#FFEB3B', 12, 150);
            }
            if (snap.prevState === 'radial_windup' && state === 'idle') {
                _burst(boss.x, boss.y, '#FF1744', 30, 240);
                try { if (game) game.shake = Math.max(game.shake || 0, 20); } catch(e) {}
            }
            if (state === 'summon_cast') {
                _burst(boss.x, boss.y, '#00E5FF', 16, 170);
                try { if (game) game.shake = Math.max(game.shake || 0, 10); } catch(e) {}
            }
        }

        // Charge trail (limited rate)
        if (state === 'charge') {
            const tNow = performance.now();
            if (!boss._lastTrailAt || (tNow - boss._lastTrailAt) > 32) {
                if (!boss._chargeTrail) boss._chargeTrail = [];
                boss._chargeTrail.push({ x: boss.x, y: boss.y });
                if (boss._chargeTrail.length > 10) boss._chargeTrail.shift();
                boss._lastTrailAt = tNow;
            }

            if (!boss._lastChargeSparkAt || (tNow - boss._lastChargeSparkAt) > 90) {
                const dir = (ai.chargeDir != null) ? ai.chargeDir : boss.angle;
                const sideAng = dir + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
                const px = boss.x + Math.cos(sideAng) * (boss.radius * 0.85);
                const py = boss.y + Math.sin(sideAng) * (boss.radius * 0.85);
                try {
                    if (game && game.particles) game.particles.push(new Particle(px, py, {
                        type: 'spark',
                        color: '#FFEB3B',
                        size: 2,
                        life: 0.22,
                        decay: 0.08,
                        velocity: { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 }
                    }));
                } catch(e) {}
                boss._lastChargeSparkAt = tNow;
            }
        }

        // Leaving charge => impact
        if (snap && snap.prevState === 'charge' && state !== 'charge') {
            _burst(boss.x, boss.y, '#FF1744', 22, 240);
            try { if (game) game.shake = Math.max(game.shake || 0, 24); } catch(e) {}
        }

        // Mines placed detection (boss update call-local)
        if (snap && game && game.bossMines && game.bossMines.length > snap.minesLen) {
            const add = game.bossMines.length - snap.minesLen;
            for (let i = 0; i < add; i++) {
                const m = game.bossMines[game.bossMines.length - 1 - i];
                if (!m) continue;
                m.fxStart = now;
                m._lastArcAt = 0;
                m._arcSeed = Math.random() * 1000;
                try {
                    if (game && game.particles) game.particles.push(new Particle(m.x, m.y, {
                        type: 'shockwave',
                        color: '#FF9800',
                        size: 6,
                        maxRadius: (m.radius || 80) * 0.9,
                        life: 0.35,
                        decay: 0.10
                    }));
                } catch(e) {}
            }
            try { game.shake = Math.max(game.shake || 0, 8); } catch(e) {}
        }

        // Summon adds detection (boss update call-local)
        if (snap && game && game.enemies && game.enemies.length > snap.enemiesLen) {
            const news = game.enemies.slice(snap.enemiesLen);
            for (const e of news) {
                if (!e || e.typeKey === 'BOSS') continue;
                e._spawnPortal = now;
                try {
                    if (game && game.particles) game.particles.push(new Particle(e.x, e.y, {
                        type: 'shockwave',
                        color: '#00E5FF',
                        size: 6,
                        maxRadius: 55,
                        life: 0.35,
                        decay: 0.09
                    }));
                    for (let k = 0; k < 8; k++) {
                        const ang = Math.random() * TAU;
                        const spd = 2 + Math.random() * 5;
                        game.particles.push(new Particle(e.x, e.y, {
                            type: 'spark',
                            color: '#00E5FF',
                            size: 2,
                            life: 0.22,
                            decay: 0.09,
                            velocity: { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd }
                        }));
                    }
                } catch(e) {}
            }
        }
    }

    function drawIntroUnder(boss) {
        if (!boss || boss.typeKey !== 'BOSS') return;
        const now = Date.now();
        const st = boss._bossIntroStart || now;
        const t = (now - st) / 1800;
        if (t > 1.1) return;

        const p = Math.max(0, Math.min(1, t));
        const fade = 1 - p;
        const r = boss.radius * (1.4 + p * 2.2);

        ctx.save();
        ctx.translate(boss.x, boss.y);
        ctx.globalAlpha = 0.75 * fade;

        const g = ctx.createRadialGradient(0, 0, boss.radius * 0.2, 0, 0, r);
        g.addColorStop(0, 'rgba(255,235,59,0.18)');
        g.addColorStop(0.45, 'rgba(255,23,68,0.20)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fill();

        // Rotating arcs
        ctx.globalAlpha = 0.90 * fade;
        ctx.strokeStyle = 'rgba(255,23,68,0.85)';
        ctx.lineWidth = 4;
        const rot = now / 180;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, boss.radius * (1.15 + i * 0.35), rot + i * 1.8, rot + i * 1.8 + 1.25);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawOver(boss) {
        if (!boss || boss.typeKey !== 'BOSS' || !boss.bossAI) return;
        const ai = boss.bossAI;
        const now = Date.now();

        // Charge telegraph: thick line + animated chevrons
        if (ai.state === 'charge_windup' || ai.state === 'charge') {
            const dir = (ai.chargeDir != null) ? ai.chargeDir : boss.angle;
            const len = 320;

            ctx.save();
            ctx.strokeStyle = 'rgba(255,23,68,0.55)';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(boss.x, boss.y);
            ctx.lineTo(boss.x + Math.cos(dir) * len, boss.y + Math.sin(dir) * len);
            ctx.stroke();

            // chevrons
            ctx.globalAlpha = 0.85;
            for (let i = 0; i < 9; i++) {
                const s = i / 9;
                const base = 70 + s * (len - 70);
                const flow = ((now / 80) + i) % 1;
                const shift = (flow * 34) - 17;
                const px = boss.x + Math.cos(dir) * (base + shift);
                const py = boss.y + Math.sin(dir) * (base + shift);

                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(dir);
                ctx.fillStyle = 'rgba(255,235,59,0.65)';
                ctx.beginPath();
                ctx.moveTo(-10, -10);
                ctx.lineTo(10, 0);
                ctx.lineTo(-10, 10);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }

        // Charge trail behind boss
        if (ai.state === 'charge' && boss._chargeTrail && boss._chargeTrail.length) {
            ctx.save();
            for (let i = boss._chargeTrail.length - 1; i >= 0; i--) {
                const p = boss._chargeTrail[i];
                const a = i / boss._chargeTrail.length;
                ctx.globalAlpha = 0.16 * a;
                ctx.fillStyle = 'rgba(255,23,68,0.9)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, boss.radius * (0.45 + 0.55 * a), 0, TAU);
                ctx.fill();
            }
            ctx.restore();
        }

        // Radial windup: ring + spikes
        if (ai.state === 'radial_windup') {
            const t = Math.max(0, Math.min(1, (ai.stateEnd - now) / 550));
            const r = 110 + (1 - t) * 70;

            ctx.save();
            ctx.translate(boss.x, boss.y);

            ctx.strokeStyle = 'rgba(255,23,68,0.35)';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 8]);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);

            const spikes = 24;
            ctx.strokeStyle = 'rgba(255,235,59,0.55)';
            ctx.lineWidth = 2;
            for (let i = 0; i < spikes; i++) {
                const ang = (i / spikes) * TAU + (now / 500);
                const r1 = r * 0.72;
                const r2 = r * 0.98;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
                ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
                ctx.stroke();
            }

            ctx.restore();
        }

        // Summon cast: portal ring
        if (ai.state === 'summon_cast') {
            const t = Math.max(0, Math.min(1, (ai.stateEnd - now) / 650));
            const r = 90 + (1 - t) * 90;

            ctx.save();
            ctx.translate(boss.x, boss.y);

            const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
            g.addColorStop(0, 'rgba(255,235,59,0.16)');
            g.addColorStop(0.55, 'rgba(0,229,255,0.14)');
            g.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.globalAlpha = 0.9;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, TAU);
            ctx.fill();

            ctx.strokeStyle = 'rgba(0,229,255,0.65)';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.65, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.restore();
        }

        // Enrage aura extra
        if (ai.enraged) {
            const pulse = 0.55 + Math.sin(now / 70) * 0.25;
            ctx.save();
            ctx.globalAlpha = 0.22 * pulse;
            ctx.strokeStyle = 'rgba(255,23,68,0.85)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, boss.radius * 1.9, 0, TAU);
            ctx.stroke();
            ctx.restore();
        }

        // Spawn portals for summoned adds (tiny flourish)
        const game = __getGame();
        if (game && game.enemies && game.enemies.length) {
            for (const e of game.enemies) {
                if (!e || e.typeKey === 'BOSS' || !e._spawnPortal) continue;
                const tt = (now - e._spawnPortal) / 450;
                if (tt > 1) { e._spawnPortal = 0; continue; }
                const rr = 10 + tt * 32;
                ctx.save();
                ctx.globalAlpha = 0.35 * (1 - tt);
                ctx.strokeStyle = 'rgba(0,229,255,0.75)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(e.x, e.y, rr, 0, TAU);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    function drawMine(m, pct) {
        if (!m) return;
        const now = Date.now();
        const r = m.radius || 80;
        const pulse = 0.6 + Math.sin(now / 90 + (m.x || 0) * 0.01) * 0.4;

        ctx.save();
        ctx.translate(m.x, m.y);

        // Soft fill
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(255,152,0,0.08)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fill();

        // Segmented warning ring
        ctx.strokeStyle = `rgba(255,152,0,${0.55 + 0.35 * pulse})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.55 + 0.45 * pct), 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        // Core glow
        const coreR = Math.max(6, r * 0.18);
        const g = ctx.createRadialGradient(-coreR * 0.3, -coreR * 0.3, 0, 0, 0, coreR * 2.4);
        g.addColorStop(0, `rgba(255,235,59,${0.85 * pulse})`);
        g.addColorStop(0.5, `rgba(255,152,0,${0.55 * pulse})`);
        g.addColorStop(1, 'rgba(255,87,34,0)');

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 2.2, 0, TAU);
        ctx.fill();

        // Hazard triangles
        ctx.rotate(now / 700);
        ctx.fillStyle = 'rgba(255,235,59,0.65)';
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate((i / 3) * TAU);
            ctx.beginPath();
            ctx.moveTo(r * 0.62, 0);
            ctx.lineTo(r * 0.45, -6);
            ctx.lineTo(r * 0.45, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Tiny arc flourish (cached-ish via seed)
        if (!m._lastArcAt || (now - m._lastArcAt) > 140) {
            m._arcSeed = (m._arcSeed || 0) + 0.7 + Math.random() * 1.7;
            m._lastArcAt = now;
        }
        const arcA = (m._arcSeed || 0) + now / 150;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, arcA, arcA + 0.7);
        ctx.stroke();

        ctx.restore();
    }

    function mineDetonateFX(x, y, r) {
        const rr = (r || 80);
        const game = __getGame();
        try { if (game) game.shake = Math.max(game.shake || 0, 12); } catch(e) {}
        try {
            if (!game || !game.particles) return;
            game.particles.push(new Particle(x, y, {
                type: 'shockwave',
                color: '#FF9800',
                size: 12,
                maxRadius: rr * 1.6,
                life: 0.55,
                decay: 0.07
            }));
            for (let i = 0; i < 18; i++) {
                const ang = Math.random() * TAU;
                const spd = 4 + Math.random() * 9;
                game.particles.push(new Particle(x, y, {
                    type: 'spark',
                    color: '#FFEB3B',
                    size: 2,
                    life: 0.28,
                    decay: 0.07,
                    velocity: { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd }
                }));
            }
        } catch(e) {}
    }

    return { ensureIntro, handleAfterUpdate, drawIntroUnder, drawOver, drawMine, mineDetonateFX };
})();

// Hook boss update (skill moments, mines placed, summons)
try {
    const EnemyCtor = __getEnemyCtor();
    if (EnemyCtor && EnemyCtor.prototype && typeof EnemyCtor.prototype.update === 'function') {
    const __origEnemyUpdateBossFX = EnemyCtor.prototype.update;
    EnemyCtor.prototype.update = function(player, clones, obstacles) {
        const isBoss = (this && this.typeKey === 'BOSS');
        const game = __getGame();
        const snap = isBoss ? {
            prevState: this.bossAI ? this.bossAI.state : null,
            prevEnraged: this.bossAI ? !!this.bossAI.enraged : false,
            minesLen: (game && game.bossMines) ? game.bossMines.length : 0,
            enemiesLen: (game && game.enemies) ? game.enemies.length : 0
        } : null;

        __origEnemyUpdateBossFX.call(this, player, clones, obstacles);

        if (isBoss && this.bossAI) {
            BossFX.ensureIntro(this);
            BossFX.handleAfterUpdate(this, snap);
        }
    };
    }
} catch(e) {}

// Hook boss draw (intro + telegraphs + trail)
try {
    const EnemyCtor = __getEnemyCtor();
    if (EnemyCtor && EnemyCtor.prototype && typeof EnemyCtor.prototype.drawBoss === 'function') {
    const __origDrawBossBossFX = EnemyCtor.prototype.drawBoss;
    EnemyCtor.prototype.drawBoss = function() {
        if (this && this.typeKey === 'BOSS') BossFX.drawIntroUnder(this);
        __origDrawBossBossFX.call(this);
        if (this && this.typeKey === 'BOSS') BossFX.drawOver(this);
    };
    }
} catch(e) {}

// Phase 3/4: expose key VFX entry points via App namespace (keep globals for compatibility).
try {
    const app = window.App || (window.App = {});
    app.runtime = app.runtime || {};
    app.ui = app.ui || {};
    app.runtime.createComplexExplosion = createComplexExplosion;
    app.ui.drawPrettyMapBackground = drawPrettyMapBackground;
    app.ui.drawMiniMap = drawMiniMap;
    app.ui.BossFX = BossFX;
    app.ui.mineDetonateFX = BossFX.mineDetonateFX;
} catch(e) {}

// === End Boss Cinematic FX Pack ===
