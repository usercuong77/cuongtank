const DEV_LOG = false;
function __devLog() {
    if (!DEV_LOG) return;
    console.log.apply(console, arguments);
}

// === Runtime Module: I18N + Start Screen Text Sync ===

(function initI18NCore(){
  if (window.I18N && window.I18N.__ready) return;

  const STORAGE_KEY = 'tankLang_v1';
  const TEXT = {
    vi: {
      ui: {
        languageButton: 'Ngôn ngữ: VI',
        settings: 'SETTINGS',
        settingsEsc: 'SETTINGS (Esc)',
        pause: 'PAUSE (P)',
        saveQuit: 'SAVE & QUIT',
        replayPvp: 'REPLAY PVP'
      },
      start: {
        subtitle: 'Chọn hệ xe - xem preview và kỹ năng',
        hintUpgrade: 'Nhặt 2 súng giống nhau để NÂNG CẤP (tối đa Lv.5).',
        hintAmmo: 'Đạn thường không bao giờ mất, chỉ bị hạ cấp.',
        hintBoss: 'CẢNH BÁO: Boss sẽ phá hủy mọi vật cản!',
        chooseSystem: 'CHỌN HỆ XE TĂNG',
        preview: 'PREVIEW',
        skillBoard: 'BẢNG CHIÊU',
        tip: 'Tip: tắt VietKey / bộ gõ tiếng Việt (chuyển EN) để di chuyển mượt mà.',
        keyMove: 'Di chuyển',
        keyAimShoot: 'Ngắm & Bắn',
        keyWeapon: 'Chọn súng',
        keySkill: 'Kỹ năng',
        keyPause: 'Tạm dừng',
        modeTitle: 'CHẾ ĐỘ',
        modePlayers: 'Người chơi',
        modeDifficulty: 'Độ khó',
        mode2p: 'Chế độ 2P',
        modeP2System: 'Hệ P2',
        pvpBuildHint: 'PvP-only: mỗi bên chọn 1 đạn + 3 trang bị khác nhau.',
        continue: 'TIẾP TỤC',
        clearSave: 'XÓA SAVE',
        deploy: 'TRIỂN KHAI',
        newGame: 'CHƠI MỚI',
        bestScore: 'Best Score',
        bestWave: 'Best Wave'
      },
      mode: {
        noteHard: 'Hard 1P: dùng chuột ngắm + click bắn.',
        noteEasy: 'Easy 1P: tự ngắm + tự bắn.',
        noteCoop: '2P Bot: chế độ co-op, tự ngắm + tự bắn.',
        notePvp: '2P PvP: vào trận rồi mới chọn đạn + trang bị trong Shop PvP.'
      },
      settings: {
        title: 'CÀI ĐẶT',
        close: 'ĐÓNG',
        volume: 'Âm lượng',
        musicVolume: 'Âm lượng nhạc',
        fpsCap: 'FPS cap',
        shake: 'Rung màn hình',
        minimap: 'Bản đồ mini',
        fpsCounter: 'Đếm FPS',
        autoSave: 'Tự động lưu',
        aimAssist: 'Hỗ trợ bắn',
        progress: 'TIẾN ĐỘ',
        save: 'LƯU',
        resetSave: 'XÓA SAVE',
        hotkeys: 'Phím tắt: P Tạm dừng/Tiếp tục, Esc Cài đặt, M Minimap, F FPS.'
      },
      welcome: {
        title: 'Chúc bạn chơi game vui vẻ!',
        line1: 'Trước khi vào menu chọn hệ xe, hãy chuẩn bị tinh thần "cày" thật đã nhé!',
        line2: '<b>Gợi ý nhanh:</b> Hard dùng chuột để ngắm/bắn - Easy/2P tự ngắm tự bắn.',
        line3: '<b>Liên hệ support:</b> <a href=\"https://www.facebook.com/lvmedits\" target=\"_blank\" rel=\"noopener\">Cường đẹp trai</a>',
        hint: 'Chỉ bấm nút để tiếp tục',
        button: 'Ok Cường đẹp trai'
      },
      pvp: {
        loadTitle: 'SHOP PvP - Chọn Đạn & Trang Bị',
        loadSub: 'Mỗi bên chọn 1 đạn PvP và 3 trang bị khác nhau. Có hiển thị thông số để người mới dễ xem.',
        loadHint: 'Build này chỉ dùng cho PvP.',
        ammo: 'Đạn PvP',
        item1: 'Trang bị 1',
        item2: 'Trang bị 2',
        item3: 'Trang bị 3',
        reset: 'Mặc định',
        confirm: 'Vào trận',
        noAmmoData: 'Không có dữ liệu đạn.',
        noItemData: 'Không có dữ liệu trang bị.',
        itemLabel: 'Trang bị'
      },
      assassin: {
        title: 'SÁT THỦ',
        lockText: 'Chơi thắng màn 20 để mở khóa hoặc nhập code.',
        inputPlaceholder: 'Nhập code mở khóa...',
        close: 'Đóng',
        unlock: 'Mở khóa',
        unlockedWave20: 'Đã mở khóa do wave >= 20',
        unlockedCode: 'Đã mở khóa bằng code',
        enterCode: 'Nhập code...',
        wrongCode: 'Sai code.',
        unlockOk: 'OK (Đã mở khóa)'
      },
      skill: {
        duration: 'Thời lượng',
        cooldown: 'Hồi chiêu',
        range: 'Tầm',
        assassinQ: '{range} - 3 lần chém - Có thể quay về',
        assassinE: '{range} - 3 mục tiêu - 2 chém/mục',
        assassinR: '{range} - 10 lần blink - Tối đa 3 hit/mục'
      }
    },
    en: {
      ui: {
        languageButton: 'Language: EN',
        settings: 'SETTINGS',
        settingsEsc: 'SETTINGS (Esc)',
        pause: 'PAUSE (P)',
        saveQuit: 'SAVE & QUIT',
        replayPvp: 'REPLAY PVP'
      },
      start: {
        subtitle: 'Choose your tank system - preview and skills',
        hintUpgrade: 'Pick up 2 identical guns to UPGRADE (max Lv.5).',
        hintAmmo: 'Normal ammo never disappears, it only gets downgraded.',
        hintBoss: 'WARNING: Boss can destroy all obstacles!',
        chooseSystem: 'CHOOSE TANK SYSTEM',
        preview: 'PREVIEW',
        skillBoard: 'SKILL BOARD',
        tip: 'Tip: turn off VietKey / Vietnamese IME (switch EN) for smoother movement.',
        keyMove: 'Move',
        keyAimShoot: 'Aim & Shoot',
        keyWeapon: 'Select weapon',
        keySkill: 'Skills',
        keyPause: 'Pause',
        modeTitle: 'MODE',
        modePlayers: 'Players',
        modeDifficulty: 'Difficulty',
        mode2p: '2P Mode',
        modeP2System: 'P2 System',
        pvpBuildHint: 'PvP-only: each side picks 1 ammo + 3 different items.',
        continue: 'CONTINUE',
        clearSave: 'CLEAR SAVE',
        deploy: 'DEPLOY',
        newGame: 'NEW GAME',
        bestScore: 'Best Score',
        bestWave: 'Best Wave'
      },
      mode: {
        noteHard: 'Hard 1P: mouse aim + click to shoot.',
        noteEasy: 'Easy 1P: auto-aim + auto-shoot.',
        noteCoop: '2P Bot: co-op mode, auto-aim + auto-shoot.',
        notePvp: '2P PvP: enter match first, then pick ammo + items in PvP Shop.'
      },
      settings: {
        title: 'SETTINGS',
        close: 'CLOSE',
        volume: 'Master Volume',
        musicVolume: 'Music Volume',
        fpsCap: 'FPS cap',
        shake: 'Screen shake',
        minimap: 'Minimap',
        fpsCounter: 'FPS Counter',
        autoSave: 'Auto Save',
        aimAssist: 'Aim Assist',
        progress: 'PROGRESS',
        save: 'SAVE',
        resetSave: 'RESET SAVE',
        hotkeys: 'Hotkeys: P Pause/Resume, Esc Settings, M Minimap, F FPS.'
      },
      welcome: {
        title: 'Have fun playing!',
        line1: 'Before entering the system menu, get ready for a serious grind.',
        line2: '<b>Quick tip:</b> Hard uses mouse aim/shoot - Easy/2P uses auto-aim and auto-shoot.',
        line3: '<b>Support contact:</b> <a href=\"https://www.facebook.com/lvmedits\" target=\"_blank\" rel=\"noopener\">Cuong dep trai</a>',
        hint: 'Press the button to continue',
        button: 'Ok Cuong dep trai'
      },
      pvp: {
        loadTitle: 'PvP SHOP - Pick Ammo & Items',
        loadSub: 'Each side picks 1 PvP ammo and 3 different items. Stats are shown for new players.',
        loadHint: 'This build applies to PvP only.',
        ammo: 'PvP Ammo',
        item1: 'Item 1',
        item2: 'Item 2',
        item3: 'Item 3',
        reset: 'Default',
        confirm: 'Enter Match',
        noAmmoData: 'No ammo data.',
        noItemData: 'No item data.',
        itemLabel: 'Item'
      },
      assassin: {
        title: 'ASSASSIN',
        lockText: 'Win Wave 20 to unlock, or enter code.',
        inputPlaceholder: 'Enter unlock code...',
        close: 'Close',
        unlock: 'Unlock',
        unlockedWave20: 'Unlocked by wave >= 20',
        unlockedCode: 'Unlocked by code',
        enterCode: 'Enter code...',
        wrongCode: 'Wrong code.',
        unlockOk: 'OK (Unlocked)'
      },
      skill: {
        duration: 'Duration',
        cooldown: 'Cooldown',
        range: 'Range',
        assassinQ: '{range} - 3 slashes - Can return',
        assassinE: '{range} - 3 targets - 2 slashes/target',
        assassinR: '{range} - 10 blinks - Up to 3 hits/target'
      }
    }
  };

  const SYSTEM_TEXTS = {
    default: {
      vi: { name: 'Chiến Binh', desc: 'Phân thân - Tàng hình - Hút máu', tagline: 'Bền bỉ - tự hồi phục theo damage (R)' },
      en: { name: 'Warrior', desc: 'Clone - Stealth - Lifesteal', tagline: 'Durable - sustain from damage (R)' }
    },
    speed: {
      vi: { name: 'Tốc Độ', desc: 'Lướt - Miễn thương - Cường tốc', tagline: 'Cơ động - lướt liên tục - cường tốc' },
      en: { name: 'Speed', desc: 'Dash - Invuln - Adrenaline', tagline: 'Mobility - rapid dashes - overdrive' }
    },
    engineer: {
      vi: { name: 'Kỹ Sư', desc: 'Tháp pháo - Sửa chữa - Xung EMP', tagline: 'Công trình - tháp pháo - EMP' },
      en: { name: 'Engineer', desc: 'Turret - Repair - EMP Pulse', tagline: 'Structures - turret control - EMP' }
    },
    juggernaut: {
      vi: { name: 'Giáp Sắt', desc: 'Giáp phản - Cú húc - Pháo đài', tagline: 'Tanker - giáp phản vàng kim - pháo đài' },
      en: { name: 'Juggernaut', desc: 'Reflect Armor - Ram - Siege', tagline: 'Tank - reflective armor - siege mode' }
    },
    mage: {
      vi: { name: 'Pháp Sư', desc: 'Hỏa cầu - Dịch chuyển - Bão tuyết', tagline: 'Glass cannon - bão tuyết cuốn sạch' },
      en: { name: 'Mage', desc: 'Fireball - Blink - Blizzard', tagline: 'Glass cannon - sweeping blizzard' }
    },
    assassin: {
      vi: { name: 'Sát Thủ', desc: 'Ám Kích - Liên Hoàn - Thập Ảnh', tagline: 'Ẩn ảnh - kiếm thuật - sát thương bùng nổ' },
      en: { name: 'Assassin', desc: 'Ambush - Multi-slash - Shadow Storm', tagline: 'Stealth - blade art - burst damage' }
    }
  };

  function getRawLang(){
    try {
      const v = String(localStorage.getItem(STORAGE_KEY) || '').trim().toLowerCase();
      return (v === 'en' || v === 'vi') ? v : 'vi';
    } catch(e){ return 'vi'; }
  }
  let currentLang = getRawLang();

  function lookup(obj, key){
    const parts = String(key || '').split('.');
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== 'object' || !(parts[i] in cur)) return null;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function fmt(str, vars){
    if (!vars || typeof vars !== 'object') return String(str);
    return String(str).replace(/\{([a-zA-Z0-9_]+)\}/g, (m, k) => {
      if (Object.prototype.hasOwnProperty.call(vars, k)) return String(vars[k]);
      return m;
    });
  }
  function t(key, vars){
    const byLang = TEXT[currentLang] || TEXT.vi;
    const val = lookup(byLang, key);
    if (val == null) {
      const fallback = lookup(TEXT.vi, key);
      return fmt((fallback == null ? key : fallback), vars);
    }
    return fmt(val, vars);
  }

  function setNodeText(sel, text){
    const el = document.querySelector(sel);
    if (el) el.textContent = text;
  }
  function setNodeHtml(sel, html){
    const el = document.querySelector(sel);
    if (el) el.innerHTML = html;
  }
  function setInputPlaceholder(id, text){
    const el = document.getElementById(id);
    if (el) el.setAttribute('placeholder', text);
  }
  function setSelectOptionText(selectId, value, text){
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const opt = sel.querySelector('option[value="' + value + '"]');
    if (opt) opt.textContent = text;
  }
  function setSkillGuideTexts(){
    const keyNodes = document.querySelectorAll('.keyGuideWide .kg .key');
    if (keyNodes && keyNodes.length >= 6) {
      keyNodes[0].textContent = 'WASD';
      keyNodes[1].textContent = (currentLang === 'en') ? 'Mouse' : 'Chu\u1ed9t';
      keyNodes[2].textContent = '1-6';
      keyNodes[3].textContent = 'Q/E/R';
      keyNodes[4].textContent = 'P';
      keyNodes[5].textContent = 'ESC';
    }
    const nodes = document.querySelectorAll('.keyGuideWide .kg span:last-child');
    if (!nodes || nodes.length < 6) return;
    nodes[0].textContent = t('start.keyMove');
    nodes[1].textContent = t('start.keyAimShoot');
    nodes[2].textContent = t('start.keyWeapon');
    nodes[3].textContent = t('start.keySkill');
    nodes[4].textContent = t('start.keyPause');
    nodes[5].textContent = t('ui.settings');
  }
  const SYSTEM_IDS = ['default', 'speed', 'engineer', 'juggernaut', 'mage', 'assassin'];

  function applySystemListTexts(){
    for (let i = 0; i < SYSTEM_IDS.length; i++) {
      const sysId = SYSTEM_IDS[i];
      const pack = SYSTEM_TEXTS[sysId] || SYSTEM_TEXTS.default;
      const row = pack[currentLang] || pack.vi;
      const item = document.querySelector('#systemList .sysItem[data-sys="' + sysId + '"]');
      if (item) {
        const n = item.querySelector('.sysName');
        const d = item.querySelector('.sysDesc');
        if (n) n.textContent = row.name;
        if (d) d.textContent = row.desc;
      }
      setSelectOptionText('p2SystemSelect', sysId, row.name);
    }
  }
  function isVisibleEl(el){
    if (!el) return false;
    const st = window.getComputedStyle(el);
    if (!st || st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return !!(r && r.width > 0 && r.height > 0);
  }
  function positionLanguageButton(){
    const btn = document.getElementById('btnLangToggleGlobal');
    if (!btn) return;
    const start = document.getElementById('startScreen');
    const startVisible = !!(start && !start.classList.contains('hidden'));
    if (!startVisible) {
      btn.style.display = 'none';
      return;
    }
    btn.style.display = 'inline-flex';
    btn.style.position = 'fixed';
    btn.style.right = 'auto';
    btn.style.transform = 'none';
    const gap = 8;

    const startSettings = document.getElementById('btnSettingsStart');
    if (isVisibleEl(startSettings)) {
      const r = startSettings.getBoundingClientRect();
      btn.style.top = Math.round(r.top) + 'px';
      btn.style.left = Math.max(8, Math.round(r.left - btn.offsetWidth - gap)) + 'px';
      return;
    }

    btn.style.top = '14px';
    btn.style.left = '14px';
  }
  function ensureLanguageButton(){
    if (document.getElementById('btnLangToggleGlobal')) return;
    const btn = document.createElement('button');
    btn.id = 'btnLangToggleGlobal';
    btn.className = 'btn';
    btn.type = 'button';
    btn.style.zIndex = '10060';
    btn.style.marginTop = '0';
    btn.style.padding = '10px 12px';
    btn.style.fontSize = '0.82rem';
    btn.style.background = '#1f1f1f';
    btn.style.border = '1px solid rgba(255,255,255,0.18)';
    btn.style.boxShadow = '0 0 16px rgba(255,255,255,0.07)';
    btn.addEventListener('click', () => {
      setLang(currentLang === 'vi' ? 'en' : 'vi');
    });
    document.body.appendChild(btn);
    requestAnimationFrame(positionLanguageButton);
  }

  const STATIC_TEXT_BINDINGS = [
    ['#btnLangToggleGlobal', 'ui.languageButton'],
    ['#btnSettingsStart', 'ui.settings'],
    ['#btnSettings', 'ui.settingsEsc'],
    ['#btnPause', 'ui.pause'],
    ['#btnSaveQuit', 'ui.saveQuit'],
    ['#btnPvpReplay', 'ui.replayPvp'],
    ['#btnCloseSettings', 'settings.close'],
    ['#btnSaveNow', 'settings.save'],
    ['#btnResetSave', 'settings.resetSave'],
    ['#welcomeCard h2', 'welcome.title'],
    ['#welcomeCard p:nth-of-type(1)', 'welcome.line1'],
    ['#welcomeHint', 'welcome.hint'],
    ['#welcomeContinueBtn', 'welcome.button'],
    ['.startSubtitle', 'start.subtitle'],
    ['.startHints .hintLine:nth-child(1)', 'start.hintUpgrade'],
    ['.startHints .hintLine:nth-child(2)', 'start.hintAmmo'],
    ['.startHints .hintLine:nth-child(3)', 'start.hintBoss'],
    ['.startLeft .panelTitle', 'start.chooseSystem'],
    ['.startRight .previewWrap .panelTitle', 'start.preview'],
    ['.startRight .skillsWrap .panelTitle', 'start.skillBoard'],
    ['.leftFootNote', 'start.tip'],
    ['#modeBox .modeTitle', 'start.modeTitle'],
    ['#modeBox .modeRow .modeLabel', 'start.modePlayers'],
    ['#p2SystemRow .modeLabel', 'start.modeP2System'],
    ['#pvpLoadoutHint', 'start.pvpBuildHint'],
    ['#startBtn', 'start.deploy'],
    ['#clearSaveBtn', 'start.clearSave'],
    ['#assassinLockPanel h3', 'assassin.title'],
    ['#assassinLockText', 'assassin.lockText'],
    ['#assassinUnlockClose', 'assassin.close'],
    ['#assassinUnlockBtn', 'assassin.unlock'],
    ['.pvpLoadTitleMain', 'pvp.loadTitle'],
    ['.pvpLoadSub', 'pvp.loadSub'],
    ['.pvpLoadRoundHint', 'pvp.loadHint'],
    ['#pvpLiveReset', 'pvp.reset'],
    ['#pvpLiveConfirm', 'pvp.confirm']
  ];

  const STATIC_HTML_BINDINGS = [
    ['#welcomeCard p:nth-of-type(2)', 'welcome.line2'],
    ['#welcomeCard p:nth-of-type(3)', 'welcome.line3']
  ];

  const STATIC_PLACEHOLDER_BINDINGS = [
    ['assassinUnlockInput', 'assassin.inputPlaceholder']
  ];
  const SETTINGS_INPUT_LABEL_BINDINGS = [
    ['setVolume', 'settings.volume'],
    ['setMusicVolume', 'settings.musicVolume'],
    ['setFpsCap', 'settings.fpsCap']
  ];
  const SETTINGS_CHECKBOX_BINDINGS = [
    ['setShake', 'settings.shake'],
    ['setMinimap', 'settings.minimap'],
    ['setFps', 'settings.fpsCounter'],
    ['setAutoSave', 'settings.autoSave'],
    ['setAimAssist', 'settings.aimAssist']
  ];
  const PVP_FIELD_LABEL_KEYS = ['pvp.ammo', 'pvp.item1', 'pvp.item2', 'pvp.item3'];

  function applyTextBindings(list){
    for (let i = 0; i < list.length; i++) {
      setNodeText(list[i][0], t(list[i][1]));
    }
  }
  function applyHtmlBindings(list){
    for (let i = 0; i < list.length; i++) {
      setNodeHtml(list[i][0], t(list[i][1]));
    }
  }
  function applyPlaceholderBindings(list){
    for (let i = 0; i < list.length; i++) {
      setInputPlaceholder(list[i][0], t(list[i][1]));
    }
  }
  function applyPvpFieldLabels(){
    const labels = document.querySelectorAll('#pvpLoadoutModal .pvpSideCard .pvpFieldLabel');
    if (!labels || labels.length === 0) return;
    for (let i = 0; i < labels.length; i++) {
      labels[i].textContent = t(PVP_FIELD_LABEL_KEYS[i % PVP_FIELD_LABEL_KEYS.length]);
    }
  }
  function applyContinueButtonText(){
    const continueBtn = document.getElementById('continueBtn');
    if (!continueBtn || continueBtn.classList.contains('hidden')) return;
    const m = String(continueBtn.textContent || '').match(/\(\s*WAVE\s*(\d+)\s*\)/i);
    if (m && m[1]) {
      continueBtn.textContent = t('start.continue') + ' (WAVE ' + m[1] + ')';
      return;
    }
    continueBtn.textContent = t('start.continue');
  }

  function applyStaticTexts(){
    const setCheckboxLabel = (inputId, key) => {
      const inp = document.getElementById(inputId);
      if (!inp || !inp.parentElement) return;
      const parent = inp.parentElement;
      let textNode = null;
      for (let i = 0; i < parent.childNodes.length; i++) {
        const n = parent.childNodes[i];
        if (n && n.nodeType === 3) { textNode = n; break; }
      }
      const txt = ' ' + t(key);
      if (textNode) textNode.nodeValue = txt;
      else parent.appendChild(document.createTextNode(txt));
    };
    const setLabelByInput = (inputId, key) => {
      const inp = document.getElementById(inputId);
      if (!inp || !inp.parentElement) return;
      const lbl = inp.parentElement.firstElementChild;
      if (lbl) lbl.textContent = t(key);
    };

    document.documentElement.setAttribute('lang', currentLang);
    applyTextBindings(STATIC_TEXT_BINDINGS);
    applyHtmlBindings(STATIC_HTML_BINDINGS);
    applyPlaceholderBindings(STATIC_PLACEHOLDER_BINDINGS);

    const setTitle = document.querySelector('#settingsModal > div > div:first-child > div:first-child');
    if (setTitle) setTitle.textContent = t('settings.title');
    for (let i = 0; i < SETTINGS_INPUT_LABEL_BINDINGS.length; i++) {
      setLabelByInput(SETTINGS_INPUT_LABEL_BINDINGS[i][0], SETTINGS_INPUT_LABEL_BINDINGS[i][1]);
    }
    for (let i = 0; i < SETTINGS_CHECKBOX_BINDINGS.length; i++) {
      setCheckboxLabel(SETTINGS_CHECKBOX_BINDINGS[i][0], SETTINGS_CHECKBOX_BINDINGS[i][1]);
    }
    const bestScoreEl = document.getElementById('bestScore');
    const bestWaveEl = document.getElementById('bestWave');
    if (bestScoreEl && bestScoreEl.parentNode && bestScoreEl.parentNode.firstChild) {
      bestScoreEl.parentNode.firstChild.nodeValue = t('start.bestScore') + ': ';
    }
    if (bestWaveEl && bestWaveEl.parentNode && bestWaveEl.parentNode.firstChild) {
      bestWaveEl.parentNode.firstChild.nodeValue = t('start.bestWave') + ': ';
    }
    const progTitle = document.querySelector('.settings-progress-title');
    if (progTitle) {
      progTitle.textContent = t('settings.progress');
    }
    const hotkeys = document.querySelector('#settingsModal .settings-hotkeys');
    if (hotkeys) hotkeys.textContent = t('settings.hotkeys');

    setSkillGuideTexts();
    applyPvpFieldLabels();
    applySystemListTexts();
    applyContinueButtonText();
    requestAnimationFrame(positionLanguageButton);
  }

  function emitLanguageChange(){
    try { window.dispatchEvent(new CustomEvent('tank:langchange', { detail: { lang: currentLang } })); } catch(e){}
  }
  function setLang(lang){
    const next = (String(lang || '').toLowerCase() === 'en') ? 'en' : 'vi';
    if (next === currentLang) return;
    currentLang = next;
    try { localStorage.setItem(STORAGE_KEY, currentLang); } catch(e){}
    applyStaticTexts();
    requestAnimationFrame(positionLanguageButton);
    emitLanguageChange();
  }
  function lang(){ return currentLang; }
  function systemText(id){
    const pack = SYSTEM_TEXTS[id] || SYSTEM_TEXTS.default;
    return pack[currentLang] || pack.vi;
  }

  window.I18N = {
    __ready: true,
    lang,
    setLang,
    t,
    apply: applyStaticTexts,
    systemText
  };
  window.t = t;

  function init(){
    ensureLanguageButton();
    applyStaticTexts();
    positionLanguageButton();
    window.addEventListener('resize', positionLanguageButton);
    setInterval(positionLanguageButton, 250);
    emitLanguageChange();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else setTimeout(init, 0);
})();

