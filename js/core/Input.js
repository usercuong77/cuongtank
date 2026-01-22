// Auto-extracted from original HTML
import { Admin } from './Admin.js';

// STEP 2: Mode-aware skill keybinds
// - Hard (1P): Q/E/R
// - Easy (1P) + 2P: B/N/M (mapped logically to Q/E/R skill slots)
// STEP 7: Local co-op input profiles
// - P1: WASD + (Hard: QER, Easy/2P: BNM)
// - P2 (2P only): Arrow keys + skills 1/2/3 (mapped logically to Q/E/R skill slots)

const DEFAULT_TB_SETTINGS = { difficulty: 'hard', playerCount: 1 };

// STEP 5: Switch target key for Player1 (Easy mode)
// Physical key: KeyT
const KEY_SWITCH_TARGET_P1 = 't';


// STEP 9: Switch target key for Player2 (2P)
// Use Digit0 to avoid relying on ShiftRight (e.key doesn't distinguish left/right Shift)
const KEY_SWITCH_TARGET_P2 = '0';


// AMMO_CYCLE_PATCH: Cycle ammo in 2P (since 1-6 are reserved for P2 skills)
// - P1: V
// - P2: Enter
const KEY_CYCLE_AMMO_P1 = 'v';
const KEY_CYCLE_AMMO_P2 = 'enter';

function readTBSettings() {
  // Prefer live in-memory settings if available
  try {
    const gs = globalThis.Game && globalThis.Game.settings;
    if (gs && (gs.difficulty || gs.playerCount)) {
      return {
        difficulty: (gs.difficulty || DEFAULT_TB_SETTINGS.difficulty),
        playerCount: Number(gs.playerCount ?? DEFAULT_TB_SETTINGS.playerCount)
      };
    }
  } catch (e) {}

  // Fallback to localStorage persisted settings (STEP 1)
  try {
    const raw = localStorage.getItem('tb_settings');
    if (raw) {
      const s = JSON.parse(raw);
      return {
        difficulty: (s.difficulty || DEFAULT_TB_SETTINGS.difficulty),
        playerCount: Number(s.playerCount ?? DEFAULT_TB_SETTINGS.playerCount)
      };
    }
  } catch (e) {}

  return { ...DEFAULT_TB_SETTINGS };
}

function isTwoPlayerMode() {
  const s = readTBSettings();
  return Number(s.playerCount ?? DEFAULT_TB_SETTINGS.playerCount) === 2;
}

const Input = {
  // Raw physical key states
  _rawKeys: {},

  // One-frame edge flags (used for actions like switch target)
  pressed: {},

  // Mouse (only used in 1P Hard)
  mouse: { x: 0, y: 0, down: false },

  // Active player for Input.keys mapping (1 or 2)
  activePlayer: 1,

  // Logical keys view (Proxy)
  keys: null,

  setActivePlayer(n) {
    this.activePlayer = (Number(n) === 2) ? 2 : 1;
  },

  _getKey(prop) {
    if (typeof prop === 'symbol') return undefined;
    const lk = String(prop || '').toLowerCase();
    if (!lk) return undefined;

    const s = readTBSettings();
    const difficulty = String(s.difficulty || DEFAULT_TB_SETTINGS.difficulty).toLowerCase();
    const playerCount = Number(s.playerCount ?? DEFAULT_TB_SETTINGS.playerCount);
    const is2P = (playerCount === 2);
    const p = (this.activePlayer === 2) ? 2 : 1;

    // In 2P: disable numeric weapon hotkeys (avoid conflict with P2 skills 1/2/3)
    if (is2P && ['1', '2', '3', '4', '5', '6'].includes(lk)) return false;

    // P2 mapping (2P only)
    if (is2P && p === 2) {
      if (lk === 'w') return !!this._rawKeys['arrowup'];
      if (lk === 'a') return !!this._rawKeys['arrowleft'];
      if (lk === 's') return !!this._rawKeys['arrowdown'];
      if (lk === 'd') return !!this._rawKeys['arrowright'];

      // Skills: 1/2/3 map to logical q/e/r
      if (lk === 'q') return !!this._rawKeys['1'];
      if (lk === 'e') return !!this._rawKeys['2'];
      if (lk === 'r') return !!this._rawKeys['3'];

      // Prevent P2 from triggering ultimate via Space (keeps P1 behavior intact)
      if (lk === ' ') return false;

      // Fallback: use raw key (rarely needed)
      return !!this._rawKeys[lk];
    }

    // P1: skills B/N/M in Easy or 2P
    const useBNM = (difficulty === 'easy') || is2P;
    if (useBNM) {
      if (lk === 'q') return !!this._rawKeys['b'];
      if (lk === 'e') return !!this._rawKeys['n'];
      if (lk === 'r') return !!this._rawKeys['m'];
    }

    // Default: raw mapping
    return !!this._rawKeys[lk];
  },

  // Consume a key-down edge (returns true only once per physical press)
  consumePressed(key) {
    const k = String(key || '').toLowerCase();
    const v = !!this.pressed[k];
    this.pressed[k] = false;
    return v;
  },

  // Convenience for STEP 5
  consumeSwitchTargetP1() {
    return this.consumePressed(KEY_SWITCH_TARGET_P1);
  },

  // STEP 9: Switch target for Player2 (2P)
  consumeSwitchTargetP2() {
    if (!isTwoPlayerMode()) return false;
    const a = this.consumePressed('0');
    const b = this.consumePressed('digit0');
    const c = this.consumePressed('numpad0');
    const d = this.consumePressed('insert'); // fallback numpad0 NumLock off
    return a || b || c || d;
  },

  // AMMO_CYCLE_PATCH: Cycle ammo per-player in 2P
  consumeCycleAmmoP1() {
    if (!isTwoPlayerMode()) return false;
    return this.consumePressed(KEY_CYCLE_AMMO_P1);
  },
  consumeCycleAmmoP2() {
    if (!isTwoPlayerMode()) return false;
    return this.consumePressed(KEY_CYCLE_AMMO_P2);
  },

  // STEP 7: per-player input snapshot (optional convenience)
  getStateForPlayer(playerIndex = 1) {
    const prev = this.activePlayer;
    this.setActivePlayer(playerIndex);

    const up = !!this.keys.w;
    const down = !!this.keys.s;
    const left = !!this.keys.a;
    const right = !!this.keys.d;

    let moveX = (right ? 1 : 0) - (left ? 1 : 0);
    let moveY = (down ? 1 : 0) - (up ? 1 : 0);
    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY) || 1;
      moveX /= len;
      moveY /= len;
    }

    const state = {
      moveX,
      moveY,
      skillQ: !!this.keys['q'],
      skillE: !!this.keys['e'],
      skillR: !!this.keys['r'],
      ultimate: !!this.keys[' '],
      shoot: !!this.mouse.down,
      // STEP 5/9: target switching per-player (edge-trigger)
      switchTarget: (playerIndex === 2) ? (this.consumeSwitchTargetP2?.() || false) : (this.consumeSwitchTargetP1?.() || false)
    };

    this.setActivePlayer(prev);
    return state;
  },

  init() {
    // Create logical keys proxy once
    if (!this.keys || !this.keys.__isProxy) {
      const self = this;
      this.keys = new Proxy({ __isProxy: true }, {
        get(target, prop) {
          if (prop in target) return target[prop];
          return self._getKey(prop);
        }
      });
    }

    window.addEventListener('keydown', e => {
      if (typeof Admin !== 'undefined' && Admin.captureKey && Admin.captureKey(e)) return;

      const k = (e.key === ' ') ? ' ' : String(e.key || '').toLowerCase();
      const c = String(e.code || '').toLowerCase();
      // record edge (ignore key-repeat)
      if (!e.repeat) {
        if (!this._rawKeys[k]) this.pressed[k] = true;
        if (c && !this._rawKeys[c]) this.pressed[c] = true;
      }

      // Prevent scroll for movement keys
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();

      this._rawKeys[k] = true;
      if (c) this._rawKeys[c] = true;
    });

    window.addEventListener('keyup', e => {
      const k = (e.key === ' ') ? ' ' : String(e.key || '').toLowerCase();
      const c = String(e.code || '').toLowerCase();
      this._rawKeys[k] = false;
      if (c) this._rawKeys[c] = false;
    });

    // Mouse is only used in 1P Hard. In 2P we ignore mouse completely.
    window.addEventListener('mousemove', e => {
      if (isTwoPlayerMode()) return;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', () => {
      if (isTwoPlayerMode()) return;
      this.mouse.down = true;
    });
    window.addEventListener('mouseup', () => {
      if (isTwoPlayerMode()) return;
      this.mouse.down = false;
    });

    window.addEventListener('blur', () => {
      this._rawKeys = {};
      this.pressed = {};
      this.mouse.down = false;
    });
    window.addEventListener('focus', () => {
      this._rawKeys = {};
      this.pressed = {};
    });
  }
};

export { Input };
