// === HUD + UI Polish Module ===
// Extracted from core-ui-vfx to keep runtime modules smaller and easier to maintain.

// === UI Polish Pack (fonts + HP bars + shop cards) ===
(() => {
  // Inject CSS overrides (safe: uses !important where it matters).
  try {
    const css = `
:root{
  --ui-font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  --ui-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
html, body{
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body, button, input{ font-family: var(--ui-font); }
.hud-text{ letter-spacing: 0.3px; font-variant-numeric: tabular-nums; }

#hud-top-left, #hud-top-right{
  background: rgba(10,10,16,0.58) !important;
  border: 1px solid rgba(255,255,255,0.10) !important;
  border-radius: 16px !important;
  padding: 12px 14px !important;
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 34px rgba(0,0,0,0.38);
}
#hud-top-left .highlight{ text-shadow: 0 2px 0 rgba(0,0,0,0.8), 0 0 12px rgba(255,215,0,0.18); }

/* Player HP bar (chip bar) */
#healthBarContainer, #healthBarContainer2{
  position: relative !important;
  height: 22px !important;
  border-radius: 14px !important;
  border: 1px solid rgba(255,255,255,0.18) !important;
  background: rgba(0,0,0,0.58) !important;
  box-shadow: 0 10px 30px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.35);
  overflow: hidden;
}
#healthBarChip, #healthBarChip2, #healthBar, #shieldOverlay, #healthBar2, #shieldOverlay2{
  position:absolute;
  top:0; left:0;
  height:100%;
  border-radius: inherit;
}
#healthBarChip, #healthBarChip2{
  background: linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06));
  opacity: 0.55;
  filter: saturate(0.9);
  transition: width 0.55s cubic-bezier(.2,.9,.1,1);
}
#healthBar{
  transition: width 0.12s linear;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14), 0 0 18px rgba(76,175,80,0.18);
}
#shieldOverlay, #shieldOverlay2{
  background: linear-gradient(90deg, rgba(0,229,255,0.10), rgba(0,229,255,0.55), rgba(0,229,255,0.10));
  mix-blend-mode: screen;
}
#healthBarContainer #hpText, #healthBarContainer2 #hpText2{ font-family: var(--ui-mono); letter-spacing: 0.4px; }

/* Boss HP bar (chip bar) */
#bossHealthContainer{
  position: absolute;
  height: 34px !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255,23,68,0.55) !important;
  background: rgba(0,0,0,0.58) !important;
  box-shadow: 0 16px 50px rgba(0,0,0,0.55), 0 0 28px rgba(255,23,68,0.14);
  backdrop-filter: blur(6px);
  overflow: hidden;
}
#bossHealthContainer::before{
  content:"";
  position:absolute;
  inset:0;
  background: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.10), transparent 60%);
  pointer-events:none;
}
#bossHealthBarChip, #bossHealthBar{
  position:absolute;
  top:0; left:0;
  height:100%;
  border-radius: inherit;
}
#bossHealthBarChip{
  background: linear-gradient(90deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
  opacity: 0.55;
  transition: width 0.7s cubic-bezier(.2,.9,.1,1);
}
#bossHealthBar{ box-shadow: inset 0 0 0 1px rgba(255,255,255,0.10), 0 0 18px rgba(255,23,68,0.18); }
#bossName{ font-family: var(--ui-mono); letter-spacing: 1.2px; text-shadow: 0 2px 0 rgba(0,0,0,0.9), 0 0 14px rgba(255,23,68,0.22); }

/* Shop polish */
#shopModal{ backdrop-filter: blur(6px); }
#shopModal > div{
  background: linear-gradient(180deg, rgba(16,16,18,0.96), rgba(8,8,10,0.96)) !important;
  border: 1px solid rgba(255,215,0,0.55) !important;
  box-shadow: 0 20px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,215,0,0.12) inset !important;
}
.shopCard{
  --accent: rgba(255,255,255,0.45);
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-left: 3px solid var(--accent) !important;
  border-radius: 16px !important;
  padding: 14px !important;
  box-shadow: 0 12px 26px rgba(0,0,0,0.35);
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}
.shopCard::before{
  content:"";
  position:absolute;
  inset:-40px;
  background: radial-gradient(circle at 18% 12%, rgba(255,255,255,0.13), transparent 55%);
  transform: rotate(-10deg);
  pointer-events:none;
}
.shopCard:hover{ transform: translateY(-2px); box-shadow: 0 18px 40px rgba(0,0,0,0.45); }
.shopCard.is-locked{ filter: grayscale(0.15) saturate(0.85); }
.shopCard .shopIcon{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: rgba(0,0,0,0.34);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35);
  font-family: "Segoe UI Symbol", "Noto Sans Symbols2", "Arial Unicode MS", "Segoe UI", sans-serif;
}
.shopCard .shopTitleRow{ display:flex; align-items:center; gap: 10px; }
.shopCard .shopTitleText{ font-weight: 900 !important; color: #fff !important; letter-spacing: 0.4px; }
.shopCard .btn{
  border-radius: 14px !important;
  border: 1px solid rgba(255,255,255,0.18) !important;
  background: linear-gradient(180deg, rgba(255,215,0,0.92), rgba(255,160,0,0.92)) !important;
  box-shadow: 0 14px 26px rgba(0,0,0,0.35);
  color: #1b1200 !important;
  font-weight: 900 !important;
  letter-spacing: 0.6px;
}
.shopCard .btn:hover{ filter: brightness(1.06); }
.shopCard .btn:disabled{
  background: linear-gradient(180deg, rgba(140,140,140,0.45), rgba(80,80,80,0.45)) !important;
  color: rgba(255,255,255,0.75) !important;
  border-color: rgba(255,255,255,0.12) !important;
  box-shadow: none !important;
}

/* General buttons */
.btn{ border-radius: 14px; transition: transform 0.08s ease, filter 0.12s ease; }
.btn:active{ transform: translateY(1px) scale(0.99); }
`;
    const st = document.createElement('style');
    st.id = 'ui-polish-pack';
    st.textContent = css;
    document.head.appendChild(st);
  } catch(e) {}

  // === HUD Chip Bars + Shop Card Polish ===
  // Helpers.
  function clamp01(v){ v = +v; if (!isFinite(v)) return 0; return Math.max(0, Math.min(1, v)); }
  function __getRuntime(){
    try { return (window && window.App && window.App.runtime) ? window.App.runtime : null; } catch(e){ return null; }
  }
  function __getGame(){
    try {
      const rt = __getRuntime();
      if (rt && rt.Game) return rt.Game;
      return (typeof Game !== 'undefined') ? Game : null;
    } catch(e){ return null; }
  }
  function __getEnemyCtor(){
    try {
      const rt = __getRuntime();
      if (rt && rt.Enemy) return rt.Enemy;
      return (typeof Enemy !== 'undefined') ? Enemy : null;
    } catch(e){ return null; }
  }
  function __getShop(){
    try {
      const rt = __getRuntime();
      if (rt && rt.Shop) return rt.Shop;
      return (typeof Shop !== 'undefined') ? Shop : null;
    } catch(e){ return null; }
  }

  function ensureChip(containerId, barId, chipId){
    const cont = document.getElementById(containerId);
    const bar  = document.getElementById(barId);
    if (!cont || !bar) return null;
    let chip = document.getElementById(chipId);
    if (!chip){
      chip = document.createElement('div');
      chip.id = chipId;
      chip.style.width = bar.style.width || '100%';
      cont.insertBefore(chip, bar);
    }
    return chip;
  }

  function setChipWidth(chipEl, pct, isDamage){
    if (!chipEl) return;
    pct = Math.max(0, Math.min(100, pct));
    const prev = (chipEl.__pct == null) ? pct : chipEl.__pct;

    // Healing: snap chip to new value quickly
    if (!isDamage || pct >= prev){
      chipEl.style.transitionDuration = '0.18s';
      chipEl.style.width = pct + '%';
      chipEl.__pct = pct;
      return;
    }

    // Damage: keep chip at prev briefly, then animate down
    if (chipEl.__timer) clearTimeout(chipEl.__timer);
    chipEl.style.width = prev + '%';
    chipEl.__timer = setTimeout(() => {
      chipEl.style.transitionDuration = '0.7s';
      chipEl.style.width = pct + '%';
      chipEl.__pct = pct;
    }, 120);
  }

  // Install chip bars (DOM).
  const healthChip = ensureChip('healthBarContainer', 'healthBar', 'healthBarChip');
  const healthChip2 = ensureChip('healthBarContainer2', 'healthBar2', 'healthBarChip2');
  const bossChip   = ensureChip('bossHealthContainer', 'bossHealthBar', 'bossHealthBarChip');

  // Patch player health UI update (P1/P2 aware).
try {
  const game = __getGame();
  if (game && game.ui && typeof game.ui.updateHealth === 'function') {
    const __origUpdateHealth = game.ui.updateHealth.bind(game.ui);
    game.ui.updateHealth = function(curr, max){
      const gameNow = __getGame();
      const pid = (gameNow && gameNow.__uiPid === 2) ? 2 : 1;
      const lastHpKey  = (pid === 2) ? '__lastHp2'  : '__lastHp';
      const lastMaxKey = (pid === 2) ? '__lastMax2' : '__lastMax';
      const prevPct = clamp01((this[lastHpKey] || 0) / (this[lastMaxKey] || (max || 1))) * 100;
      __origUpdateHealth(curr, max);
      const pct = clamp01((curr || 0) / (max || 1)) * 100;
      const isDamage = (pct < prevPct);
      const chip = (pid === 2) ? healthChip2 : healthChip;
      if (chip) setChipWidth(chip, pct, isDamage);
      this[lastHpKey] = curr;
      this[lastMaxKey] = max;
    };
  }
} catch(e) {}


  // Patch boss health bar update (wrap Enemy.update safely).
  try {
    const EnemyCtor = __getEnemyCtor();
    if (EnemyCtor && EnemyCtor.prototype && typeof EnemyCtor.prototype.update === 'function') {
      const __origEnemyUpdate_UI = EnemyCtor.prototype.update;
      EnemyCtor.prototype.update = function(player, clones, obstacles){
        __origEnemyUpdate_UI.call(this, player, clones, obstacles);
        if (this && this.typeKey === 'BOSS') {
          const pct = clamp01((this.hp || 0) / (this.maxHp || 1)) * 100;
          const prev = (bossChip && bossChip.__pct != null) ? bossChip.__pct : pct;
          setChipWidth(bossChip, pct, pct < prev);
        }
      };
    }
  } catch(e) {}

  // Shop card polish (icons + accent colors + state classes).
  function decorateShopCards(){
    const cards = document.querySelectorAll('.shopCard');
    if (!cards || !cards.length) return;

    const MAP = {
      btnBuyMaxHp:   { icon: '\u2665', accent: '#66BB6A' },
      btnBuyDmg:     { icon: '\u2726', accent: '#EF5350' },
      btnBuyFireRate:{ icon: '\u26A1', accent: '#29B6F6' },
      btnBuySpeed:   { icon: '\u27A4', accent: '#7C4DFF' },
      btnBuyMagnet:  { icon: '\u26ED', accent: '#FFD54F' },
      btnBuyArmor:   { icon: '\u26E8', accent: '#B0BEC5' },
    };

    for (const card of cards){
      const btn = card.querySelector('button');
      if (!btn || !btn.id) continue;
      const info = MAP[btn.id] || { icon: '\u2B21', accent: 'rgba(255,255,255,0.45)' };
      card.style.setProperty('--accent', info.accent);

      // Title row: inject icon once
      let titleDiv = card.querySelector('div');
      if (titleDiv && !titleDiv.dataset.__decorated){
        titleDiv.dataset.__decorated = '1';
        titleDiv.classList.add('shopTitleRow');
        const txt = titleDiv.textContent;
        titleDiv.textContent = '';

        const ic = document.createElement('span');
        ic.className = 'shopIcon';
        ic.textContent = info.icon;
        ic.style.boxShadow = `0 0 0 1px rgba(0,0,0,0.35) inset, 0 0 18px ${info.accent}22`;

        const t = document.createElement('span');
        t.className = 'shopTitleText';
        t.textContent = txt;

        titleDiv.appendChild(ic);
        titleDiv.appendChild(t);
      }

      // State classes
      const isLocked = !!btn.disabled;
      card.classList.toggle('is-locked', isLocked);

      // MAX marker from any "MAX" level labels
      const maxText = card.querySelector('span') ? (card.innerText || '') : '';
      const isMax = (maxText.indexOf('MAX') !== -1);
      card.classList.toggle('is-max', isMax);
    }
  }

  // Wrap Shop.refresh so the classes update live
  try {
    const shop = __getShop();
    if (shop && typeof shop.refresh === 'function') {
      const __origShopRefresh_UI = shop.refresh;
      shop.refresh = function(){
        __origShopRefresh_UI.call(this);
        decorateShopCards();
      };
    }
  } catch(e) {}

  // First pass (in case shop already visible)
  try { decorateShopCards(); } catch(e) {}
})();
