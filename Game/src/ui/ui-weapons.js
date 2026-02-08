// === Weapon UI Module ===
// Extracted from core-ui-vfx to keep runtime modules smaller and easier to maintain.

// === Weapon Icons + Rarity Borders (UI only) ===
(() => {
  // Map weaponId -> { icon, rarity }
  const WEAPON_UI_META = {
    NORMAL:    { icon: '\u25CF', rarity: 'common' },
    STUN:      { icon: '\u2737', rarity: 'uncommon' },
    FIRE:      { icon: '\u2739', rarity: 'uncommon' },
    LIGHTNING: { icon: '\u26A1', rarity: 'rare' },
    HOMING:    { icon: '\u2316', rarity: 'rare' },
    PIERCING:  { icon: '\u27A4', rarity: 'epic' },
    ROCKET:    { icon: '\u2604', rarity: 'legendary' }
  };

  // Inject CSS once
  try {
    if (!document.getElementById('weapon-rarity-css')) {
      const st = document.createElement('style');
      st.id = 'weapon-rarity-css';
      st.textContent = `
/* Weapon icons + rarity borders */
#weaponBar .weapon-slot{ border-width: 1.5px !important; }
#weaponBar .weapon-slot .icon{
  font-size: 20px !important;
  line-height: 1 !important;
  letter-spacing: 0 !important;
  transform: translateY(1px);
  font-family: "Segoe UI Symbol", "Noto Sans Symbols2", "Arial Unicode MS", "Segoe UI", sans-serif;
}
#weaponBar .weapon-slot .rarity-gem{
  position:absolute; top:7px; right:7px;
  width:9px; height:9px; border-radius:50%;
  background: var(--rarity-color, rgba(255,255,255,0.65));
  box-shadow: 0 0 0 1px rgba(0,0,0,0.45) inset, 0 0 12px var(--rarity-color, rgba(255,255,255,0.18));
  opacity: 0.95;
}
#weaponBar .weapon-slot.empty{
  border-color: rgba(255,255,255,0.10) !important;
}
#weaponBar .weapon-slot.empty .icon{ opacity: 0.35; font-size: 16px !important; }

#weaponBar .weapon-slot.rarity-common{
  --rarity-color: rgba(200,200,200,0.92);
  border-color: rgba(200,200,200,0.42) !important;
  box-shadow: 0 10px 26px rgba(0,0,0,0.45), 0 0 14px rgba(200,200,200,0.06);
}
#weaponBar .weapon-slot.rarity-uncommon{
  --rarity-color: rgba(102,187,106,0.98);
  border-color: rgba(102,187,106,0.55) !important;
  box-shadow: 0 10px 26px rgba(0,0,0,0.45), 0 0 18px rgba(102,187,106,0.12);
}
#weaponBar .weapon-slot.rarity-rare{
  --rarity-color: rgba(79,195,247,0.98);
  border-color: rgba(79,195,247,0.62) !important;
  box-shadow: 0 10px 26px rgba(0,0,0,0.45), 0 0 18px rgba(79,195,247,0.14);
}
#weaponBar .weapon-slot.rarity-epic{
  --rarity-color: rgba(171,71,188,0.99);
  border-color: rgba(171,71,188,0.66) !important;
  box-shadow: 0 10px 26px rgba(0,0,0,0.45), 0 0 18px rgba(171,71,188,0.14);
}
#weaponBar .weapon-slot.rarity-legendary{
  --rarity-color: rgba(255,213,79,1);
  border-color: rgba(255,213,79,0.78) !important;
  box-shadow: 0 12px 30px rgba(0,0,0,0.48), 0 0 24px rgba(255,213,79,0.20);
}
#weaponBar .weapon-slot.rarity-legendary::after{
  content:'';
  position:absolute; inset:0;
  border-radius: inherit;
  pointer-events:none;
  background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.10) 18%, transparent 36%);
  opacity: 0.65;
  mix-blend-mode: screen;
  transform: translateX(-30%);
  animation: weaponLegendShine 1.9s linear infinite;
}
@keyframes weaponLegendShine{
  0%{ transform: translateX(-55%); }
  100%{ transform: translateX(55%); }
}
      `;
      document.head.appendChild(st);
    }
  } catch(e) {}

  // Patch weapon UI builder (symbols + rarity)
  try {
    if (typeof Game !== 'undefined' && Game.ui && typeof Game.ui.updateWeaponInventory === 'function') {
      const __origUpdateWeaponInventory = Game.ui.updateWeaponInventory.bind(Game.ui);

      Game.ui.updateWeaponInventory = function(inventory, currentIndex) {
        try {
                    const pid = (typeof Game !== 'undefined' && Game.__uiPid === 2) ? 2 : 1;
                    const __bar = (pid === 2 && this.weaponBar2) ? this.weaponBar2 : this.weaponBar;
                    if (!__bar) return;
                    __bar.innerHTML = '';
          for (let i = 0; i < 6; i++) {
            const slot = document.createElement('div');
            slot.className = 'weapon-slot';

            const keyNum = document.createElement('div');
            keyNum.className = 'key-number';
            keyNum.innerText = (i + 1);
            slot.appendChild(keyNum);

            const icon = document.createElement('div');
            icon.className = 'icon';

            if (inventory && inventory[i]) {
              const id = inventory[i].id;
              const weapon = (typeof BULLET_TYPES !== 'undefined' && BULLET_TYPES && BULLET_TYPES[id]) ? BULLET_TYPES[id] : { id, name: id, color: '#fff' };
              const meta = WEAPON_UI_META[weapon.id] || { icon: (weapon.name || '?').slice(0, 1), rarity: 'common' };

              slot.classList.add(`rarity-${meta.rarity}`);
              slot.style.color = __safeColor(weapon.color, '#fff');
              slot.title = `${weapon.name || weapon.id}`;

              // Icon symbol
              icon.textContent = meta.icon;
              slot.appendChild(icon);

              // Level badge
              const lvl = document.createElement('div');
              lvl.className = 'level-indicator';
              lvl.innerText = `Lv.${inventory[i].level}`;
              slot.appendChild(lvl);

              // Rarity gem
              const gem = document.createElement('div');
              gem.className = 'rarity-gem';
              slot.appendChild(gem);

              // Active highlight keeps weapon color vibe
              if (i === currentIndex) {
                slot.classList.add('active');
                const wc = __safeColor(weapon.color, '#ffffff');
                try {
                  slot.style.background = `rgba(${hexToRgb(wc)}, 0.22)`;
                } catch(e) {}
              }
            } else {
              slot.classList.add('empty');
              icon.textContent = '-';
              slot.appendChild(icon);
            }

            __bar.appendChild(slot);
          }
        } catch(err) {
          // fallback to original if anything goes wrong
          try { __origUpdateWeaponInventory(inventory, currentIndex); } catch(e) {}
        }
      };
    }
  } catch(e) {}
})();
