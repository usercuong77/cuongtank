// js/main.js
// Bootstraps the game (Start Screen, VietKey confirm, restart/menu flow)

import { Game, canvas } from './Game.js';
import { MAX } from './core/MaxSystem.js';
import { Shop } from './managers/Shop.js';
import { WaveManager } from './managers/WaveManager.js';

// Load saved tank system selection (optional)
try {
    const savedSys = localStorage.getItem('tankSystem');
    if (savedSys && document.querySelector(`input[name="tankSystem"][value="${savedSys}"]`)) {
        document.querySelector(`input[name="tankSystem"][value="${savedSys}"]`).checked = true;
        Game.selectedSystemId = savedSys;
    }
} catch(e) {}

MAX.UI.init();

Shop.init();


// --- Mode Settings (STEP 1): difficulty + playerCount ---
const SETTINGS_STORAGE_KEY = 'tb_settings';
const DEFAULT_SETTINGS = { difficulty: 'hard', playerCount: 1 };

const readSavedSettings = () => {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const s = JSON.parse(raw);
        const difficulty = (s && (s.difficulty === 'easy' || s.difficulty === 'hard')) ? s.difficulty : DEFAULT_SETTINGS.difficulty;
        const pc = (s && (s.playerCount === 2 || s.playerCount === '2')) ? 2 : 1;
        return { difficulty, playerCount: pc };
    } catch(e) {
        return { ...DEFAULT_SETTINGS };
    }
};

const ensureModePickerUI = () => {
    const startScreen = document.getElementById('startScreen');
    if (!startScreen) return;
    if (document.getElementById('modePicker')) return;

    const box = document.createElement('div');
    box.id = 'modePicker';
    box.style.cssText = 'margin:12px auto 10px; width:min(520px, 92vw); text-align:left; background:rgba(0,0,0,0.35); border:1px solid #333; border-radius:12px; padding:12px 14px;';

    box.innerHTML = `
        <div style="font-weight:800; color:#4CAF50; letter-spacing:0.5px; margin-bottom:8px;">CHẾ ĐỘ CHƠI</div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div>
                <div style="font-weight:700; margin-bottom:6px; color:#ddd;">Độ khó</div>
                <label style="display:flex; gap:8px; align-items:center; margin:4px 0; cursor:pointer;">
                    <input type="radio" name="difficulty" value="hard" checked />
                    <div><b>Hard</b> <span style="font-size:0.82rem; color:#888;">(chuột + bắn)</span></div>
                </label>
                <label style="display:flex; gap:8px; align-items:center; margin:4px 0; cursor:pointer;">
                    <input type="radio" name="difficulty" value="easy" />
                    <div><b>Easy</b> <span style="font-size:0.82rem; color:#888;">(auto-aim / auto-shoot)</span></div>
                </label>
            </div>

            <div>
                <div style="font-weight:700; margin-bottom:6px; color:#ddd;">Số người chơi</div>
                <label style="display:flex; gap:8px; align-items:center; margin:4px 0; cursor:pointer;">
                    <input type="radio" name="playerCount" value="1" checked />
                    <div><b>1P</b></div>
                </label>
                <label style="display:flex; gap:8px; align-items:center; margin:4px 0; cursor:pointer;">
                    <input type="radio" name="playerCount" value="2" />
                    <div><b>2P</b> <span style="font-size:0.82rem; color:#888;">(local co-op)</span></div>
                </label>
            </div>
        </div>

        <div style="font-size:0.8rem; color:#666; margin-top:8px; line-height:1.35;">(STEP 1 chỉ lưu lựa chọn — gameplay chưa đổi.)</div>
    `;

    // Insert right before the key guide, if present
    const keyGuide = startScreen.querySelector('.key-guide');
    if (keyGuide && keyGuide.parentElement) {
        keyGuide.parentElement.insertBefore(box, keyGuide);
    } else {
        startScreen.appendChild(box);
    }

    // Apply saved selection
    const saved = readSavedSettings();
    try {
        const d = box.querySelector(`input[name="difficulty"][value="${saved.difficulty}"]`);
        if (d) d.checked = true;
        const pc = box.querySelector(`input[name="playerCount"][value="${saved.playerCount}"]`);
        if (pc) pc.checked = true;
    } catch(e) {}
};

ensureModePickerUI();

// --- STEP 5.1: (2P) choose tank system for Player2 on start screen ---
const SYSTEM_P2_STORAGE_KEY = 'tankSystemP2';

const ensureP2SystemPickerUI = () => {
    const startScreen = document.getElementById('startScreen');
    const p1Picker = document.getElementById('systemPicker');
    if (!startScreen || !p1Picker) return;
    if (document.getElementById('systemPickerP2')) return;

    // Clone P1 picker markup to keep the exact styling/layout.
    const clone = p1Picker.cloneNode(true);
    clone.id = 'systemPickerP2';

    // Update title
    const title = clone.querySelector('div');
    if (title) title.textContent = 'CHỌN HỆ XE TĂNG (P2)';

    // Rename radio group
    const radios = clone.querySelectorAll('input[type="radio"][name="tankSystem"]');
    radios.forEach(r => { r.name = 'tankSystemP2'; });

    // Apply saved selection (optional). If none, mirror P1.
    try {
        const savedP2 = localStorage.getItem(SYSTEM_P2_STORAGE_KEY);
        const p1Sel = document.querySelector('input[name="tankSystem"]:checked');
        const fallback = p1Sel ? p1Sel.value : 'default';
        const target = savedP2 || fallback;
        const match = clone.querySelector(`input[name="tankSystemP2"][value="${target}"]`);
        if (match) match.checked = true
    } catch(e) {}

    // Insert right after P1 picker
    if (p1Picker.parentElement) p1Picker.parentElement.insertBefore(clone, p1Picker.nextSibling);
};

const setP2PickerVisible = (visible) => {
    const el = document.getElementById('systemPickerP2');
    if (!el) return;
    el.style.display = visible ? '' : 'none';
};

const readPlayerCountUI = () => {
    try {
        const p = document.querySelector('input[name="playerCount"]:checked');
        return (p && p.value) ? parseInt(p.value, 10) : 1;
    } catch(e) {
        return 1;
    }
};

const wireP2PickerToggle = () => {
    try {
        const radios = document.querySelectorAll('input[name="playerCount"]');
        radios.forEach(r => {
            r.addEventListener('change', () => {
                ensureP2SystemPickerUI();
                setP2PickerVisible(readPlayerCountUI() === 2);
            });
        });
    } catch(e) {}
};

ensureP2SystemPickerUI();
setP2PickerVisible(readPlayerCountUI() === 2);
wireP2PickerToggle();


const startGame = () => {

    let startSettings = null;

    try {
        const selected = document.querySelector('input[name="tankSystem"]:checked');
        const sysP1 = selected ? selected.value : 'default';
        Game.selectedSystemId = sysP1 || 'default';
        try { localStorage.setItem('tankSystem', Game.selectedSystemId); } catch(e){}

        // STEP 5.1: P2 system (only used when 2P)
        const selectedP2 = document.querySelector('input[name="tankSystemP2"]:checked');
        const sysP2 = selectedP2 ? selectedP2.value : (sysP1 || 'default');
        try { localStorage.setItem(SYSTEM_P2_STORAGE_KEY, sysP2); } catch(e){}
        Game.selectedSystemIdP2 = sysP2;
    } catch(e) {}

    // Read selected settings (difficulty/playerCount) and store into Game.settings
    try {
        const d = document.querySelector('input[name="difficulty"]:checked');
        const p = document.querySelector('input[name="playerCount"]:checked');
        startSettings = {
            difficulty: (d && d.value) ? d.value : DEFAULT_SETTINGS.difficulty,
            playerCount: (p && p.value) ? parseInt(p.value, 10) : DEFAULT_SETTINGS.playerCount,
            // STEP 5.2: tank systems per-player
            systemP1: (Game && Game.selectedSystemId) ? Game.selectedSystemId : 'default',
            systemP2: (Game && (Game.selectedSystemIdP2 || Game.selectedSystemId)) ? (Game.selectedSystemIdP2 || Game.selectedSystemId) : 'default'
        };
        if (typeof Game.setSettings === 'function') Game.setSettings(startSettings);
        else Game.settings = startSettings;
    } catch(e) {}

    try { if (typeof MAX !== 'undefined') { MAX.Audio.init(); } } catch(e){}
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameUI').classList.remove('hidden');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Game.init(startSettings);

};

const openVietkeyConfirm = () => {
    const m = document.getElementById('vietkeyModal');
    if (!m) return startGame();
    m.classList.remove('hidden');

    const yes = document.getElementById('vkYes');
    const no = document.getElementById('vkNo');

    const close = () => m.classList.add('hidden');

    const onYes = () => { cleanup(); close(); startGame(); };
    const onNo  = () => { cleanup(); close(); /* stay on start screen */ };

    const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onYes(); }
        if (e.key === 'Escape') { e.preventDefault(); onNo(); }
    };

    const cleanup = () => {
        try {
            yes && yes.removeEventListener('click', onYes);
            no && no.removeEventListener('click', onNo);
            window.removeEventListener('keydown', onKey, true);
        } catch(e) {}
    };

    yes && yes.addEventListener('click', onYes);
    no  && no.addEventListener('click', onNo);
    window.addEventListener('keydown', onKey, true);
};

document.getElementById('startBtn').addEventListener('click', () => {
    openVietkeyConfirm();
});

const hideEndScreens = () => {
    try { document.getElementById('gameOverScreen').classList.add('hidden'); } catch(e){}
    try { document.getElementById('victoryScreen').classList.add('hidden'); } catch(e){}
};

const returnToMenu = () => {
    hideEndScreens();
    try { const bh = document.getElementById('bossHealthContainer'); if (bh) bh.style.display = 'none'; } catch(e){}
    try { const shop = document.getElementById('shopModal'); if (shop) shop.classList.add('hidden'); } catch(e){}
    try { document.getElementById('gameUI').classList.add('hidden'); } catch(e){}
    try { document.getElementById('startScreen').classList.remove('hidden'); } catch(e){}
    try { Game.active = false; Game.paused = false; } catch(e){}
    try { WaveManager.active = false; } catch(e){}
};

const restartRun = () => {
    try { Game.paused = false; } catch(e){}

    hideEndScreens();
    try { document.getElementById('startScreen').classList.add('hidden'); } catch(e){}
    try { document.getElementById('gameUI').classList.remove('hidden'); } catch(e){}
    try { Game.init(); } catch(e){}
};

const continueEndless = () => {
    // Close victory screen and keep playing from next wave
    hideEndScreens();
    try { Game.paused = false; Game.active = true; Game.endlessMode = true; } catch(e){}
    try { WaveManager.wave = (WaveManager.wave || 1) + 1; WaveManager.startWave(); } catch(e){}
};
// End screens buttons
document.getElementById('restartBtn').addEventListener('click', restartRun);
document.getElementById('menuBtnGO').addEventListener('click', returnToMenu);
document.getElementById('victoryRestartBtn').addEventListener('click', restartRun);
document.getElementById('victoryMenuBtn').addEventListener('click', returnToMenu);


document.getElementById('victoryEndlessBtn').addEventListener('click', continueEndless);
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

    
