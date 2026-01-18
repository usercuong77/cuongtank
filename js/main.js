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


const startGame = () => {

    try {
        const selected = document.querySelector('input[name="tankSystem"]:checked');
        const sysId = selected ? selected.value : 'default';
        Game.selectedSystemId = sysId || 'default';
        try { localStorage.setItem('tankSystem', Game.selectedSystemId); } catch(e){}
    } catch(e) {}

    try { if (typeof MAX !== 'undefined') { MAX.Audio.init(); } } catch(e){}
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameUI').classList.remove('hidden');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Game.init();

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

    
