// Auto-extracted from original HTML (converted to ES module)

import { BULLET_TYPES, getTankSystem, getSystemSkillDef } from '../constants.js';
import { hexToRgb } from '../utils.js';

export class UIManager {
  constructor() {
    this.scoreVal = document.getElementById('scoreVal');
    this.goldVal = document.getElementById('goldVal');
    this.waveVal = document.getElementById('waveVal');
    this.enemyCount = document.getElementById('enemyCount');
    this.hpText = document.getElementById('hpText');
    this.hpTextP2 = document.getElementById('hpTextP2');
    this.buffs = document.getElementById('buffsContainer');
    this.healthBar = document.getElementById('healthBar');
    this.healthBarP2 = document.getElementById('healthBarP2');
    this.healthBarContainerP2 = document.getElementById('healthBarContainerP2');
    this.weaponBar = document.getElementById('weaponBar');
    this.weaponBarP2 = document.getElementById('weaponBarP2');
    this.ultiBar = document.getElementById('ultiBar');

    // 2P: keep weapon HUD stable per player without requiring gameplay changes
    // (Step 2.2 will pass playerIndex explicitly; until then we auto-map by inventory reference.)
    this._invToPlayerIndex = new WeakMap();
    this._p1Inv = null;
    this._p2Inv = null;

    // STEP 3.5: show/hide P2 HP bar based on 2P mode (UI only)
    try {
      if (this.healthBarContainerP2) {
        this.healthBarContainerP2.style.display = (this._getPlayerCount() === 2) ? 'block' : 'none';
      }
    } catch (e) {}
  }

  _getPlayerCount() {
    let playerCount = 1;
    try {
      const gs = globalThis.Game && globalThis.Game.settings;
      if (gs && gs.playerCount != null) playerCount = Number(gs.playerCount);
    } catch (e) {}
    try {
      const raw = localStorage.getItem('tb_settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.playerCount != null) playerCount = Number(s.playerCount);
      }
    } catch (e) {}
    return playerCount;
  }

  _resolveWeaponPlayerIndex(inventory, explicitIndex) {
    const pc = this._getPlayerCount();

    // If not in 2P, reset mapping and always use P1.
    if (pc !== 2) {
      this._p1Inv = null;
      this._p2Inv = null;
      try { this._invToPlayerIndex = new WeakMap(); } catch (e) {}
      if (this.weaponBarP2) this.weaponBarP2.style.display = 'none';
      return 1;
    }

    const idx = Number(explicitIndex) || 0;
    if (idx === 1 || idx === 2) return idx;

    // Map by inventory reference (stable across frames).
    try {
      const mapped = this._invToPlayerIndex.get(inventory);
      if (mapped === 1 || mapped === 2) return mapped;
    } catch (e) {}

    if (!this._p1Inv) {
      this._p1Inv = inventory;
      try { this._invToPlayerIndex.set(inventory, 1); } catch (e) {}
      return 1;
    }

    if (inventory === this._p1Inv) return 1;

    if (!this._p2Inv) {
      this._p2Inv = inventory;
      try { this._invToPlayerIndex.set(inventory, 2); } catch (e) {}
      return 2;
    }

    if (inventory === this._p2Inv) return 2;

    // Fallback
    return 1;
  }

  // STEP 2: skill key labels must reflect mode
  // - Hard: Q/E/R
  // - Easy (1P) + 2P: B/N/M
  _getModeSkillKeyLabels() {
    // Prefer live in-memory settings if available
    let difficulty = 'hard';
    let playerCount = 1;
    try {
      const gs = globalThis.Game && globalThis.Game.settings;
      if (gs) {
        if (gs.difficulty) difficulty = String(gs.difficulty);
        if (gs.playerCount != null) playerCount = Number(gs.playerCount);
      }
    } catch (e) {}

    // Fallback to localStorage persisted settings (STEP 1)
    try {
      const raw = localStorage.getItem('tb_settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.difficulty) difficulty = String(s.difficulty);
        if (s.playerCount != null) playerCount = Number(s.playerCount);
      }
    } catch (e) {}

    const useBNM = (difficulty === 'easy') || (playerCount === 2);
    return useBNM ? ['B', 'N', 'M'] : ['Q', 'E', 'R'];
  }

  updateScore(val) {
    this.scoreVal.innerText = val;
  }

  updateGold(val) {
    if (this.goldVal) this.goldVal.innerText = val;
  }

  updateWave(val) {
    this.waveVal.innerText = val;
  }

  updateEnemies(val) {
    this.enemyCount.innerText = val;
  }
  updateHealth(curr, max, playerIndex = 1) {
    if (isNaN(curr)) curr = 0;
    if (!max || isNaN(max)) max = 1;

    const idx = Number(playerIndex) === 2 ? 2 : 1;
    const bar = (idx === 2) ? this.healthBarP2 : this.healthBar;
    const txt = (idx === 2) ? this.hpTextP2 : this.hpText;

    // Toggle P2 container visibility for 2P mode
    try {
      if (this.healthBarContainerP2) {
        this.healthBarContainerP2.style.display = (this._getPlayerCount() === 2) ? 'block' : 'none';
      }
    } catch (e) {}

    if (!bar || !txt) return;

    const pct = (curr / max) * 100;
    bar.style.width = `${Math.max(0, pct)}%`;
    txt.innerText = `${Math.ceil(curr)}/${max}`;

    if (pct < 30) bar.style.background = 'linear-gradient(90deg, #d32f2f, #f44336)';
    else bar.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
  }

  updateUltiBar(val) {
    this.ultiBar.style.width = `${val}%`;
  }

  addBuff(name, color) {
    const div = document.createElement('div');
    div.className = 'buff-icon';
    div.id = `buff-${name}`;
    div.style.borderColor = color;
    div.style.color = color;
    div.innerText = name;
    this.buffs.appendChild(div);
  }

  removeBuff(name) {
    const el = document.getElementById(`buff-${name}`);
    if (el) el.remove();
  }

  // STEP 2.1: support per-player weapon HUD
  // playerIndex: 1 => weaponBar, 2 => weaponBarP2
  updateWeaponInventory(inventory, currentIndex, playerIndex = 0) {
    if (!inventory) return;

    const idx = this._resolveWeaponPlayerIndex(inventory, playerIndex);
    const bar = (idx === 2 && this.weaponBarP2) ? this.weaponBarP2 : this.weaponBar;
    if (!bar) return;

    // Show/hide P2 bar based on 2P mode
    if (this.weaponBarP2) {
      const pc = this._getPlayerCount();
      this.weaponBarP2.style.display = (pc === 2) ? 'flex' : 'none';
    }

    bar.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';

      const keyNum = document.createElement('div');
      keyNum.className = 'key-number';
      keyNum.innerText = i + 1;
      slot.appendChild(keyNum);

      if (inventory[i]) {
        const weapon = BULLET_TYPES[inventory[i].id];
        slot.style.color = weapon.color;
        slot.style.borderColor = weapon.color;

        const icon = document.createElement('div');
        icon.className = 'icon';
        icon.innerText = weapon.name;
        slot.appendChild(icon);

        const lvl = document.createElement('div');
        lvl.className = 'level-indicator';
        lvl.innerText = `Lv.${inventory[i].level}`;
        slot.appendChild(lvl);

        if (i === currentIndex) {
          slot.classList.add('active');
          slot.style.background = `rgba(${hexToRgb(weapon.color)}, 0.3)`;
        }
      } else {
        slot.style.borderColor = '#333';
        slot.innerText = '-';
      }

      bar.appendChild(slot);
    }
  }
  updateTankSystemUI(systemId, playerIndex = 1) {
    const sys = getTankSystem(systemId);

    // STEP 4 UI: ensure P2 skill bar visibility matches 1P/2P mode.
    // (CSS defaults #skillBarP2 to display:none; we turn it on in 2P.)
    try {
      const pc = this._getPlayerCount();
      const sb2 = document.getElementById('skillBarP2');
      if (sb2) sb2.style.display = (pc === 2) ? 'flex' : 'none';
    } catch (e) {}

    const applyFor = (pi) => {
      const isP2 = Number(pi) === 2;
      const prefix = isP2 ? 'p2-' : '';
      const keyLabels = isP2 ? ['1', '2', '3'] : this._getModeSkillKeyLabels();
      const map = [
        { key: 'clone', slotId: `${prefix}skill-clone` },
        { key: 'stealth', slotId: `${prefix}skill-stealth` },
        { key: 'vampirism', slotId: `${prefix}skill-vampirism` },
      ];

      for (let i = 0; i < map.length; i++) {
        const it = map[i];
        const def = getSystemSkillDef(sys.id, it.key);
        const slot = document.getElementById(it.slotId);
        if (!slot || !def) continue;

        slot.style.borderColor = def.color || '#fff';
        slot.style.color = def.color || '#fff';

        const icon = slot.querySelector('.icon');
        if (icon) icon.innerHTML = def.labelHTML || it.key;

        const keyNum = slot.querySelector('.key-number');
        if (keyNum) keyNum.textContent = keyLabels[i] || (def.key || keyNum.textContent);
      }
    };

    // Apply for requested player.
    applyFor(playerIndex);

    // Back-compat: existing code calls updateTankSystemUI(systemId) once.
    // In 2P we also refresh P2 skill bar with the same system (until Step 5 adds per-player systems).
    try {
      const pc = this._getPlayerCount();
      if (Number(playerIndex) !== 2 && pc === 2) applyFor(2);
    } catch (e) {}

    // Optional: show system name in world-info (P1 only)
    if (Number(playerIndex) === 2) return;

    try {
      const wi = document.getElementById('world-info');
      if (wi) {
        let difficulty = 'hard';
        let playerCount = 1;
        try {
          const gs = globalThis.Game && globalThis.Game.settings;
          if (gs) {
            if (gs.difficulty) difficulty = String(gs.difficulty);
            if (gs.playerCount != null) playerCount = Number(gs.playerCount);
          }
        } catch (e) {}

        // Fallback to localStorage persisted settings (STEP 1)
        try {
          const raw = localStorage.getItem('tb_settings');
          if (raw) {
            const s = JSON.parse(raw);
            if (s.difficulty) difficulty = String(s.difficulty);
            if (s.playerCount != null) playerCount = Number(s.playerCount);
          }
        } catch (e) {}

        let suffix = '';
        if (playerCount === 2) {
          suffix = ' | P1 skills: B/N/M | P2 skills: 1/2/3 | P2 switch: 0';
        }
        wi.textContent = `Map Size: 3x | System: ${sys.name} | Bug Fixed | Cleaned${suffix}`;
      }
    } catch (e) {}
  }


    updateSkillCooldown(skillName, lastUsed, cooldown, playerIndex = 1) {
    const isP2 = Number(playerIndex) === 2;
    const prefix = isP2 ? 'p2-' : '';

    const overlay = document.getElementById(`${prefix}cd-${skillName}`);
    const txt = document.getElementById(`${prefix}cdt-${skillName}`);

    const remaining = Math.max(0, lastUsed + cooldown - Date.now());
    const percent = (remaining / cooldown) * 100;

    if (overlay) overlay.style.height = `${percent}%`;

    if (txt) {
      if (remaining <= 0) {
        txt.textContent = '';
        txt.style.opacity = 0;
      } else {
        // Hiển thị ms khi < 1s, còn lại hiển thị giây (1 chữ số thập phân)
        txt.textContent = remaining < 1000 ? `${Math.ceil(remaining)}ms` : `${(remaining / 1000).toFixed(1)}s`;
        txt.style.opacity = 1;
      }
    }
  }

}
