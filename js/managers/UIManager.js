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
    this.buffs = document.getElementById('buffsContainer');
    this.healthBar = document.getElementById('healthBar');
    this.weaponBar = document.getElementById('weaponBar');
    this.ultiBar = document.getElementById('ultiBar');
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

  updateHealth(curr, max) {
    if (isNaN(curr)) curr = 0;
    const pct = (curr / max) * 100;
    this.healthBar.style.width = `${Math.max(0, pct)}%`;
    this.hpText.innerText = `${Math.ceil(curr)}/${max}`;

    if (pct < 30) this.healthBar.style.background = 'linear-gradient(90deg, #d32f2f, #f44336)';
    else this.healthBar.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
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

  updateWeaponInventory(inventory, currentIndex) {
    this.weaponBar.innerHTML = '';
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

      this.weaponBar.appendChild(slot);
    }
  }

  updateTankSystemUI(systemId) {
    const sys = getTankSystem(systemId);
    const map = [
      { key: 'clone', slotId: 'skill-clone' },
      { key: 'stealth', slotId: 'skill-stealth' },
      { key: 'vampirism', slotId: 'skill-vampirism' },
    ];

    for (const it of map) {
      const def = getSystemSkillDef(sys.id, it.key);
      const slot = document.getElementById(it.slotId);
      if (!slot || !def) continue;

      slot.style.borderColor = def.color || '#fff';
      slot.style.color = def.color || '#fff';

      const icon = slot.querySelector('.icon');
      if (icon) icon.innerHTML = def.labelHTML || it.key;

      const keyNum = slot.querySelector('.key-number');
      if (keyNum) keyNum.textContent = def.key || keyNum.textContent;
    }

    // Optional: show system name in world-info
    try {
      const wi = document.getElementById('world-info');
      if (wi) wi.textContent = `Map Size: 3x | System: ${sys.name} | Bug Fixed | Cleaned`;
    } catch (e) {}
  }

  updateSkillCooldown(skillName, lastUsed, cooldown) {
    const overlay = document.getElementById(`cd-${skillName}`);
    const txt = document.getElementById(`cdt-${skillName}`);

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
