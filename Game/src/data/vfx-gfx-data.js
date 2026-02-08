// === VFX Graphics Data (config-only) ===
(() => {
    const root = window;
    const app = root.App || (root.App = {});
    app.data = app.data || {};

    const vfxGfx = {
        // Per system (systemId). Note: Warrior is the 'default' system.
        SYSTEMS: {
            // WARRIOR (default/warrior)
            default: {
                body: ['#1B5E20', '#2E7D32', '#66BB6A'],
                turret: ['#0E3B14', '#1B5E20'],
                glow: 'rgba(76, 175, 80, 0.32)',
                accent: '#FF5252',
                track: '#121212',
                trackDetail: '#2b2b2b'
            },
            warrior: {
                body: ['#1B5E20', '#2E7D32', '#66BB6A'],
                turret: ['#0E3B14', '#1B5E20'],
                glow: 'rgba(76, 175, 80, 0.32)',
                accent: '#FF5252',
                track: '#121212',
                trackDetail: '#2b2b2b'
            },
            speed: {
                body: ['#004D40', '#006064', '#26C6DA'],
                turret: ['#00363A', '#004D40'],
                glow: 'rgba(0, 229, 255, 0.28)',
                accent: '#00E5FF',
                track: '#071416',
                trackDetail: '#12343a'
            },
            // ENGINEER (engineer)
            engineer: {
                body: ['#263238', '#455A64', '#90A4AE'],
                turret: ['#11191c', '#263238'],
                glow: 'rgba(255, 171, 0, 0.20)',
                accent: '#FFAB00',
                sigilAccent: '#00E676',
                track: '#101214',
                trackDetail: '#2a2f33'
            },
            juggernaut: {
                body: ['#212121', '#37474F', '#546E7A'],
                turret: ['#161616', '#212121'],
                glow: 'rgba(255, 193, 7, 0.20)',
                accent: '#FFD54F',
                sigilAccent: '#B0BEC5',
                sigilSecondary: '#FFD54F',
                track: '#0f0f0f',
                trackDetail: '#2a2a2a'
            },
            // ASSASSIN (assassin)
            assassin: {
                body: ['#0c0b12', '#1b1026', '#3b1b55'],
                turret: ['#07070d', '#150a1f'],
                glow: 'rgba(176, 86, 255, 0.55)',
                accent: '#B67CFF',
                track: '#0a0a10',
                trackDetail: '#1d1c2a'
            },
            mage: {
                body: ['#1A237E', '#283593', '#7986CB'],
                turret: ['#0D1454', '#1A237E'],
                glow: 'rgba(0, 229, 255, 0.18)',
                accent: '#B3E5FC',
                track: '#0b0f16',
                trackDetail: '#1a2436'
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
            BLACK: { body: ['#212121', '#424242', '#616161'], outline: '#757575', glow: 'rgba(97, 97, 97, 0.4)' },
            YELLOW: { body: ['#F9A825', '#FFD600', '#FFEB3B'], glow: 'rgba(255, 214, 0, 0.5)' },
            PURPLE: { body: ['#6A1B9A', '#9C27B0', '#BA68C8'], glow: 'rgba(156, 39, 176, 0.4)' },
            BOSS: { body: ['#B71C1C', '#D32F2F', '#F44336'], core: ['#FF6F00', '#FF8F00', '#FFA000'], glow: 'rgba(244, 67, 54, 0.5)' }
        }
    };

    app.data.vfxGfx = vfxGfx;
    // Backward-compatible global alias.
    root.VFX_GFX_DATA = vfxGfx;
})();
