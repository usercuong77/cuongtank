// === Start Screen Preview + Skill Panel Module ===
// Extracted from core-ui-vfx to keep runtime modules smaller and easier to maintain.

// === Start Screen Preview + Skill Panel Module ===
        (function(){
            const SYS_UI = {
                default: {
                    name: 'Chiến Binh',
                    accent: '#4CAF50',
                    tagline: 'Bền bỉ - tự hồi phục theo damage (R)',
                    gfx: { body:['#2E7D32','#4CAF50','#66BB6A'], turret:['#1B5E20','#2E7D32'], glow:'rgba(76,175,80,0.35)', sigil:'#45ff74' }
                },
                speed: {
                    name: 'Tốc Độ',
                    accent: '#29B6F6',
                    tagline: 'Cơ động - lướt liên tục - cường tốc',
                    gfx: { body:['#006064','#00ACC1','#4DD0E1'], turret:['#004D40','#006064'], glow:'rgba(41,182,246,0.35)', sigil:'#29B6F6' }
                },
                engineer: {
                    name: 'Kỹ Sư',
                    accent: '#FF7043',
                    tagline: 'Công trình - tháp pháo - EMP',
                    gfx: { body:['#5D4037','#8D6E63','#BCAAA4'], turret:['#3E2723','#5D4037'], glow:'rgba(255,112,67,0.35)', sigil:'#FF7043' }
                },
                juggernaut: {
                    name: 'Giáp Sắt',
                    accent: '#FFD54F',
                    tagline: 'Tanker - giáp phản vàng kim - pháo đài',
                    gfx: { body:['#4E342E','#6D4C41','#8D6E63'], turret:['#3E2723','#4E342E'], glow:'rgba(255,213,79,0.35)', sigil:'#FFD54F' }
                },
                mage: {
                    name: 'Pháp Sư',
                    accent: '#BA68C8',
                    tagline: 'Glass cannon - bão tuyết cuốn sạch',
                    gfx: { body:['#4A148C','#7B1FA2','#BA68C8'], turret:['#311B92','#4A148C'], glow:'rgba(186,104,200,0.45)', sigil:'#BA68C8' }
                },
                assassin: {
                    name: 'S\u00e1t Th\u1ee7',
                    accent: '#B67CFF',
                    tagline: '\u1ea8n \u1ea3nh \u2022 ki\u1ebfm thu\u1eadt \u2022 s\u00e1t th\u01b0\u01a1ng b\u00f9ng n\u1ed5',
                    gfx: { body:['#1b1228','#352046','#6a2ea6'], turret:['#120a1b','#1b1228'], glow:'rgba(176,86,255,0.45)', sigil:'#B67CFF' }
                }
            };

            const SYS_SKILLS = {
                default: {
                    Q: { name:'Phân Thân Chiến Đấu', desc:'Tạo phân thân bắn hỗ trợ. Damage từ phân thân vẫn tính các hệ số và có thể hút máu khi R bật.' },
                    E: { name:'Tàng Hình', desc:'Tàng hình trong thời gian ngắn để né sát thương và đi vòng sau. (Giảm hiển thị và khó bị focus).' },
                    R: { name:'Hút Máu', desc:'Trong thời gian hiệu lực, hồi máu theo % damage gây ra (có giới hạn hồi/giây), đúng chất Chiến Binh.' }
                },
                speed: {
                    Q: { name:'Lướt', desc:'Lướt theo hướng WASD; nếu đứng yên thì lướt theo hướng nòng. Trong lúc lướt sẽ không bắn.' },
                    E: { name:'Miễn Thương', desc:'Miễn thương ngắn. Nếu nhận sát thương trong thời gian hiệu lực, hồi lại 50% HP lượng sát thương đó.' },
                    R: { name:'Cường Tốc', desc:'Tăng sát thương + tốc độ di chuyển và giảm hồi chiêu bắn (cooldown x0.5 cho một lần bắn).' }
                },
                engineer: {
                    Q: { name:'Tháp Pháo', desc:'Triệu hồi tháp pháo hỗ trợ bắn. Vị trí đặt tháp rất quan trọng để giữ góc bắn.' },
                    E: { name:'Sửa Chữa', desc:'Hồi 30% HP tối đa mỗi lần dùng, giúp trụ giao tranh tốt hơn.' },
                    R: { name:'Xung EMP', desc:'Xung điện mạnh: làm tan biến đạn địch trong vùng và đóng băng boss (radius x3, freeze x2).' }
                },
                juggernaut: {
                    Q: { name:'Giáp Phản', desc:'Bật khiên vàng kim: giảm damage nhận vào và phản sát thương (không phản boss).' },
                    E: { name:'Cú Húc', desc:'Húc cực lực theo hướng nòng súng, tạo lực đẩy và mở giao tranh. Dùng để áp sát/thoát hiểm.' },
                    R: { name:'Pháo Đài', desc:'Chuyển sang Siege Mode: bắn ROCKET (homing), giảm damage nhận vào, rocket kế thừa level vũ khí.' }
                },
                mage: {
                    Q: { name:'Hỏa Cầu', desc:'Bắn hỏa cầu lớn, bay chậm, nổ AOE có falloff (gần tâm đau nhất) + shockwave glow.' },
                    E: { name:'Dịch Chuyển', desc:'Blink: dịch chuyển nhanh, reposition để giữ khoảng cách, đúng chất pháp sư.' },
                    R: { name:'Bão Tuyết', desc:'Cơn bão di chuyển theo nòng, khóa mục tiêu ở tâm nhỏ. Đạn địch bay vào vùng bão sẽ tan biến.' }
                },
                assassin: {
                    Q: { name:'\u00c1m K\u00edch Tam Tr\u1ea3m', desc:'D\u1ecbch chuy\u1ec3n t\u1edbi m\u1ee5c ti\u00eau v\u00e0 ch\u00e9m 3 l\u1ea7n li\u00ean ti\u1ebfp (c\u00f3 th\u1ec3 quay v\u1ec1).' },
                    E: { name:'Li\u00ean Ho\u00e0n \u1ea2nh Tr\u1ea3m', desc:'Ch\u1ecdn t\u1ed1i \u0111a 3 m\u1ee5c ti\u00eau g\u1ea7n nh\u1ea5t, m\u1ed7i m\u1ee5c ti\u00eau 2 nh\u00e1t.' },
                    R: { name:'Th\u1eadp \u1ea2nh Tr\u1ea3m', desc:'Blink + ch\u00e9m li\u00ean t\u1ee5c, m\u1ed7i m\u1ee5c ti\u00eau t\u1ed1i \u0111a 3 hit.' }
                }
            };

            const SYS_SKILLS_EN = {
                default: {
                    Q: { name:'Combat Clone', desc:'Summon a battle clone for support fire. Clone damage still uses multipliers and can lifesteal while R is active.' },
                    E: { name:'Stealth', desc:'Short stealth window to dodge damage and flank. Lower visibility and harder to focus.' },
                    R: { name:'Lifesteal', desc:'For a short duration, recover HP based on dealt damage (with per-second cap).' }
                },
                speed: {
                    Q: { name:'Dash', desc:'Dash toward WASD direction; if no input, dash toward turret direction. Cannot shoot during dash.' },
                    E: { name:'Phase', desc:'Short invulnerability. Damage taken during Phase is converted into 50% healing.' },
                    R: { name:'Adrenaline', desc:'Overdrive: higher damage + speed and reduced fire cooldown (cooldown * 0.5 for one proc).' }
                },
                engineer: {
                    Q: { name:'Turret', desc:'Deploy a support turret. Placement angle is critical for lane control.' },
                    E: { name:'Repair', desc:'Restore 30% max HP instantly, great for sustained fights.' },
                    R: { name:'EMP Pulse', desc:'Strong pulse: clears hostile bullets in range and freezes boss targets (radius x3, freeze x2).' }
                },
                juggernaut: {
                    Q: { name:'Reflect Armor', desc:'Activate plated shield: reduce incoming damage and reflect damage (not vs boss).' },
                    E: { name:'Ram', desc:'Heavy charge along turret direction to engage or disengage with knock force.' },
                    R: { name:'Siege Mode', desc:'Switch to Siege Mode: fire homing rockets, reduce damage taken, inherit weapon level.' }
                },
                mage: {
                    Q: { name:'Fireball', desc:'Large, slow projectile that explodes in AOE with falloff damage and shockwave.' },
                    E: { name:'Blink', desc:'Fast reposition tool to keep spacing and reset angle.' },
                    R: { name:'Blizzard', desc:'Moving storm bound to turret direction. Enemy bullets entering the storm are neutralized.' }
                },
                assassin: {
                    Q: { name:'Triple Ambush', desc:'Dash to target and slash 3 times in sequence (can return).' },
                    E: { name:'Chain Slash', desc:'Select up to 3 nearest targets, 2 slashes per target.' },
                    R: { name:'Shadow Barrage', desc:'Blink and slash repeatedly, max 3 hits per target.' }
                }
            };

            // Phase 3: resolve shared runtime/config through App namespace first, then global fallback.
            function __getRuntime(){
                try { return (window && window.App && window.App.runtime) ? window.App.runtime : null; } catch(e){ return null; }
            }
            function __getConfig(){
                try { return (window && window.App && window.App.config) ? window.App.config : null; } catch(e){ return null; }
            }
            function __getGame(){
                try {
                    const rt = __getRuntime();
                    if (rt && rt.Game) return rt.Game;
                    return (typeof Game !== 'undefined') ? Game : null;
                } catch(e){ return null; }
            }
            function __getMax(){
                try {
                    const rt = __getRuntime();
                    if (rt && rt.MAX) return rt.MAX;
                    return (typeof MAX !== 'undefined') ? MAX : null;
                } catch(e){ return null; }
            }
            function __getSystemSkillDefFn(){
                try {
                    const rt = __getRuntime();
                    if (rt && typeof rt.getSystemSkillDef === 'function') return rt.getSystemSkillDef;
                } catch(e){}
                try { if (typeof getSystemSkillDef === 'function') return getSystemSkillDef; } catch(e){}
                return null;
            }
            function __getUnlockAssassinFn(){
                try {
                    const rt = __getRuntime();
                    if (rt && typeof rt.unlockAssassin === 'function') return rt.unlockAssassin;
                } catch(e){}
                try { if (typeof unlockAssassin === 'function') return unlockAssassin; } catch(e){}
                return null;
            }
            function __getAssassinConfig(){
                try {
                    const cfg = __getConfig();
                    if (cfg && cfg.assassin) return cfg.assassin;
                } catch(e){}
                return null;
            }
            function __getAssassinUnlockCodes(){
                try {
                    const cfg = __getAssassinConfig();
                    if (cfg && Array.isArray(cfg.unlockCodes)) return cfg.unlockCodes;
                } catch(e){}
                try { if (typeof ASSASSIN_UNLOCK_CODES !== 'undefined' && Array.isArray(ASSASSIN_UNLOCK_CODES)) return ASSASSIN_UNLOCK_CODES; } catch(e){}
                return [];
            }
            function __getAssassinSkillRange(slot){
                const key = (slot || '').toUpperCase();
                try {
                    const cfg = __getAssassinConfig();
                    if (cfg) {
                        if (key === 'Q' && typeof cfg.skillRangeQ === 'number') return cfg.skillRangeQ;
                        if (key === 'E' && typeof cfg.skillRangeE === 'number') return cfg.skillRangeE;
                        if (key === 'R' && typeof cfg.skillRangeR === 'number') return cfg.skillRangeR;
                    }
                } catch(e){}
                try {
                    if (key === 'Q' && typeof ASSASSIN_SKILL_RANGE_Q !== 'undefined') return ASSASSIN_SKILL_RANGE_Q;
                    if (key === 'E' && typeof ASSASSIN_SKILL_RANGE_E !== 'undefined') return ASSASSIN_SKILL_RANGE_E;
                    if (key === 'R' && typeof ASSASSIN_SKILL_RANGE_R !== 'undefined') return ASSASSIN_SKILL_RANGE_R;
                } catch(e){}
                return 0;
            }

            function localLang(){
                try { return (window.I18N && typeof window.I18N.lang === 'function') ? window.I18N.lang() : 'vi'; } catch(e){ return 'vi'; }
            }
            function localT(key, vars){
                try { return (window.t ? window.t(key, vars) : key); } catch(e){ return key; }
            }
            function getSystemLocaleText(sysId, uiFallback){
                try {
                    if (window.I18N && typeof window.I18N.systemText === 'function') {
                        return window.I18N.systemText(sysId || 'default');
                    }
                } catch(e){}
                const ui = uiFallback || SYS_UI[sysId] || SYS_UI.default;
                return { name: ui.name, tagline: ui.tagline };
            }

            const SYS_STATS = {
                default:    { hp: 100, spd: 6.5, armor: 0.00, cd: 1.00, rad: 22 },
                speed:      { hp: 85,  spd: 8.2, armor: 0.00, cd: 0.85, rad: 22 },
                engineer:   { hp: 120, spd: 6.0, armor: 0.05, cd: 1.00, rad: 22 },
                juggernaut: { hp: 160, spd: 5.0, armor: 0.15, cd: 1.10, rad: 24 },
                mage:       { hp: 70,  spd: 6.2, armor: 0.00, cd: 1.00, rad: 19 },
                assassin:   { hp: 105, spd: 7.6, armor: 0.08, cd: 0.88, rad: 21 }
            };

            const SLOT_TO_KEY = { Q:'clone', E:'stealth', R:'vampirism' };

            function fmtMs(ms){
                if (ms == null || isNaN(ms)) return '-';
                const s = ms / 1000;
                return (s >= 10 ? s.toFixed(0) : s.toFixed(1)) + 's';
            }

            function getSkillDef(sysId, slot){
                try{
                    const getDef = __getSystemSkillDefFn();
                    if (typeof getDef === 'function') {
                        return getDef(sysId, SLOT_TO_KEY[slot]) || {};
                    }
                }catch(e){}
                return {};
            }
            function getExtraStats(sysId, slot){
                if (sysId !== 'assassin') return '';
                if (slot === 'Q') return localT('skill.assassinQ', { range: localT('skill.range') + ' ' + __getAssassinSkillRange('Q') });
                if (slot === 'E') return localT('skill.assassinE', { range: localT('skill.range') + ' ' + __getAssassinSkillRange('E') });
                if (slot === 'R') return localT('skill.assassinR', { range: localT('skill.range') + ' ' + __getAssassinSkillRange('R') });
                return '';
            }

            function setText(id, v){
                const el = document.getElementById(id);
                if (el) el.textContent = v;
            }

            function refreshProgress(){
                try{
                    const max = __getMax();
                    const bs = (max && max.Save && max.Save.save) ? max.Save.save.bestScore : 0;
                    const bw = (max && max.Save && max.Save.save) ? max.Save.save.bestWave  : 0;
                    setText('startBestScore', bs ?? 0);
                    setText('startBestWave', bw ?? 0);
                }catch(e){}
            }

            function applyUnlockUI(){
                const game = __getGame();
                const unlocked = !!(game && game.unlocks && game.unlocks.assassin);
                const item = document.querySelector('#systemList .sysItem[data-sys="assassin"]');
                const assText = getSystemLocaleText('assassin', SYS_UI.assassin);
                if (item){
                    const inp = item.querySelector('input[type="radio"]');
                    const nameEl = item.querySelector('.sysName');
                    if (inp) inp.disabled = !unlocked;
                    item.classList.toggle('locked', !unlocked);
                    if (nameEl) nameEl.textContent = assText.name;
                }
                const opt = document.querySelector('#p2SystemSelect option[value="assassin"]');
                if (opt){
                    opt.disabled = !unlocked;
                    opt.textContent = assText.name;
                }
                if (!unlocked) {
                    const sel = document.querySelector('input[name="tankSystem"][value="assassin"]');
                    if (sel && sel.checked) {
                        const def = document.querySelector('input[name="tankSystem"][value="default"]');
                        if (def) { def.checked = true; }
                    }
                }
            }
            window.__refreshUnlocks = applyUnlockUI;
            function isAssassinUnlocked(){
                try {
                    const game = __getGame();
                    return !!(game && game.unlocks && game.unlocks.assassin);
                } catch(e){ return false; }
            }
            function setAssassinUnlocked(reason){
                const unlockFn = __getUnlockAssassinFn();
                if (typeof unlockFn === 'function') unlockFn(reason);
            }
            function openAssassinLockModal(){
                const m = document.getElementById('assassinLockModal');
                if (!m) return;
                const msg = document.getElementById('assassinUnlockMsg');
                const inp = document.getElementById('assassinUnlockInput');
                const game = __getGame();
                const reason = (game && game.unlocks && game.unlocks.assassinReason) ? String(game.unlocks.assassinReason) : '';
                if (msg) {
                    if (reason === 'wave20') msg.textContent = localT('assassin.unlockedWave20');
                    else if (reason === 'code') msg.textContent = localT('assassin.unlockedCode');
                    else msg.textContent = '';
                }
                if (inp) { inp.value = ''; setTimeout(()=>{ try{ inp.focus(); }catch(e){} }, 0); }
                m.classList.remove('hidden');
            }
            function closeAssassinLockModal(){
                const m = document.getElementById('assassinLockModal');
                if (m) m.classList.add('hidden');
            }
            function tryUnlockAssassinByCode(){
                const inp = document.getElementById('assassinUnlockInput');
                const msg = document.getElementById('assassinUnlockMsg');
                const code = (inp && inp.value ? String(inp.value) : '').trim().toLowerCase();
                const unlockCodes = __getAssassinUnlockCodes();
                if (!code) { if (msg) msg.textContent = localT('assassin.enterCode'); return; }
                if (unlockCodes.some(c => String(c).trim().toLowerCase() === code)) {
                    setAssassinUnlocked('code');
                    if (msg) msg.textContent = localT('assassin.unlockOk');
                    const sel = document.querySelector('input[name="tankSystem"][value="assassin"]');
                    if (sel) { sel.checked = true; }
                    updateUI();
                    closeAssassinLockModal();
                } else {
                    if (msg) msg.textContent = localT('assassin.wrongCode');
                }
            }

            function updateActiveSysItem(sysId){
                document.querySelectorAll('#systemList .sysItem').forEach(el=>{
                    el.classList.toggle('active', el.getAttribute('data-sys') === sysId);
                });
            }

            function renderSkills(sysId){
                const wrap = document.getElementById('systemDetails');
                const tag = document.getElementById('sysTagline');
                if (!wrap) return;
                const ui = SYS_UI[sysId] || SYS_UI.default;
                const uiText = getSystemLocaleText(sysId, ui);
                if (tag) {
                    let tagText = uiText.name + ' - ' + uiText.tagline;
                    if (sysId === 'assassin') {
                        const game = __getGame();
                        const reason = (game && game.unlocks && game.unlocks.assassinReason) ? String(game.unlocks.assassinReason) : '';
                        if (reason === 'wave20') tagText += ' | ' + localT('assassin.unlockedWave20');
                        else if (reason === 'code') tagText += ' | ' + localT('assassin.unlockedCode');
                    }
                    tag.textContent = tagText;
                }

                const st = SYS_STATS[sysId] || SYS_STATS.default;
                const statsHtml = st ? `
                    <div class="sysQuickStats">
                        <span class="sysStatChip">HP <b>${st.hp}</b></span>
                        <span class="sysStatChip">SPD <b>${st.spd.toFixed(1)}</b></span>
                        <span class="sysStatChip">ARM <b>${Math.round(st.armor * 100)}%</b></span>
                        <span class="sysStatChip">CD <b>x${st.cd.toFixed(2)}</b></span>
                        <span class="sysStatChip">SIZE <b>${st.rad}</b></span>
                    </div>
                ` : '';

                const skillText = (localLang() === 'en')
                    ? (SYS_SKILLS_EN[sysId] || SYS_SKILLS_EN.default)
                    : (SYS_SKILLS[sysId] || SYS_SKILLS.default);

                const slots = ['Q','E','R'];
                const cards = slots.map(slot=>{
                    const def = getSkillDef(sysId, slot);
                    const name = (skillText[slot] && skillText[slot].name) ? skillText[slot].name : slot;
                    const desc = (skillText[slot] && skillText[slot].desc) ? skillText[slot].desc : '';
                    const cd = (def.cooldown != null) ? fmtMs(def.cooldown) : '-';
                    const dur = (def.duration != null) ? fmtMs(def.duration) : (def.time != null ? fmtMs(def.time) : '-');
                    const extra = getExtraStats(sysId, slot);
                    const extraHtml = extra ? `<div class="skillStats">${extra}</div>` : '';

                    return `
                        <div class="skillCard">
                            <div class="skillKey" style="--skill-glow:${ui.gfx.glow};">${slot}</div>
                            <div>
                                <div class="skillName">${name}</div>
                                <div class="skillDesc">${desc}</div>
                                <div class="skillStats">${localT('skill.duration')}: <b>${dur}</b> - ${localT('skill.cooldown')}: <b>${cd}</b></div>
                                ${extraHtml}
                            </div>
                        </div>
                    `;
                }).join('');

                wrap.innerHTML = statsHtml + cards;
            }

            // === Preview drawing (lightweight) ===
            function rr(ctx, x, y, w, h, r){
                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
                r = Math.min(r, w/2, h/2);
                ctx.beginPath();
                ctx.moveTo(x+r, y);
                ctx.lineTo(x+w-r, y);
                ctx.quadraticCurveTo(x+w, y, x+w, y+r);
                ctx.lineTo(x+w, y+h-r);
                ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
                ctx.lineTo(x+r, y+h);
                ctx.quadraticCurveTo(x, y+h, x, y+h-r);
                ctx.lineTo(x, y+r);
                ctx.quadraticCurveTo(x, y, x+r, y);
            }

            function drawTank(ctx, sysId, t, scale){
                const ui = SYS_UI[sysId] || SYS_UI.default;
                const g = ui.gfx;
                const w = ctx.canvas.width, h = ctx.canvas.height;

                ctx.clearRect(0,0,w,h);

                // background subtle grid (cheap)
                ctx.save();
                ctx.globalAlpha = 0.25;
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                const step = 40 * scale;
                for (let x = (t*10)%step; x < w; x += step){
                    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
                }
                for (let y = (t*12)%step; y < h; y += step){
                    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
                }
                ctx.restore();

                const cx = w*0.5, cy = h*0.52;

                // sigil ring
                ctx.save();
                ctx.translate(cx, cy+22*scale);
                const pulse = 0.7 + Math.sin(t*2.2)*0.15;
                ctx.globalAlpha = 0.9;
                ctx.strokeStyle = g.sigil;
                ctx.lineWidth = 3*scale;
                ctx.beginPath();
                ctx.arc(0,0,58*scale + Math.sin(t*1.5)*2*scale, 0, Math.PI*2);
                ctx.stroke();

                ctx.globalAlpha = 0.20 * pulse;
                ctx.fillStyle = g.sigil;
                ctx.beginPath();
                ctx.arc(0,0,62*scale, 0, Math.PI*2);
                ctx.fill();

                // simple emblem in circle (per system)
                ctx.globalAlpha = 0.85;
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.beginPath();
                ctx.arc(0,0,26*scale,0,Math.PI*2);
                ctx.fill();

                ctx.fillStyle = g.sigil;
                ctx.font = `900 ${Math.round(18*scale)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const emblem = (sysId==='speed')?'?':(sysId==='engineer')?'??':(sysId==='juggernaut')?'??':(sysId==='mage')?'?':(sysId==='assassin')?'A':'?';
                ctx.fillText(emblem, 0, 1*scale);

                ctx.restore();

                // tank
                ctx.save();
                ctx.translate(cx, cy);

                // glow
                ctx.shadowBlur = 22*scale;
                ctx.shadowColor = g.glow;

                // tracks
                ctx.fillStyle = 'rgba(0,0,0,0.65)';
                rr(ctx, -58*scale, -40*scale, 16*scale, 80*scale, 6*scale); ctx.fill();
                rr(ctx,  42*scale, -40*scale, 16*scale, 80*scale, 6*scale); ctx.fill();

                ctx.shadowBlur = 0;

                // body gradient
                const grad = ctx.createRadialGradient(-10*scale, -12*scale, 0, 0, 0, 70*scale);
                grad.addColorStop(0, g.body[2] || g.body[1] || g.body[0]);
                grad.addColorStop(0.55, g.body[1] || g.body[0]);
                grad.addColorStop(1, g.body[0]);
                ctx.fillStyle = grad;
                rr(ctx, -46*scale, -46*scale, 92*scale, 92*scale, 14*scale);
                ctx.fill();

                // highlight
                ctx.fillStyle = 'rgba(255,255,255,0.14)';
                rr(ctx, -38*scale, -38*scale, 44*scale, 16*scale, 8*scale);
                ctx.fill();

                // assassin diamond overlay (distinct silhouette)
                if (sysId === 'assassin') {
                    ctx.save();
                    ctx.rotate(Math.PI / 4);
                    const g2 = ctx.createLinearGradient(-24*scale, -24*scale, 24*scale, 24*scale);
                    g2.addColorStop(0, 'rgba(27,16,38,0.85)');
                    g2.addColorStop(0.6, 'rgba(53,32,70,0.85)');
                    g2.addColorStop(1, 'rgba(106,46,166,0.9)');
                    ctx.fillStyle = g2;
                    rr(ctx, -18*scale, -18*scale, 36*scale, 36*scale, 8*scale);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(182,124,255,0.75)';
                    ctx.lineWidth = 2*scale;
                    ctx.stroke();
                    ctx.restore();
                }

                // turret rotate slow
                const ang = Math.sin(t*0.9) * 0.35;
                ctx.rotate(ang);

                const tGrad = ctx.createRadialGradient(-8*scale, -8*scale, 0, 0, 0, 40*scale);
                tGrad.addColorStop(0, g.turret[1] || g.turret[0]);
                tGrad.addColorStop(1, g.turret[0]);
                ctx.fillStyle = tGrad;
                ctx.beginPath(); ctx.arc(0,0,30*scale,0,Math.PI*2); ctx.fill();

                // barrel
                const bGrad = ctx.createLinearGradient(0, -10*scale, 0, 10*scale);
                bGrad.addColorStop(0, '#777');
                bGrad.addColorStop(0.5, '#999');
                bGrad.addColorStop(1, '#555');
                ctx.fillStyle = bGrad;
                rr(ctx, 0, -10*scale, 74*scale, 20*scale, 8*scale);
                ctx.fill();

                // barrel tip
                ctx.fillStyle = g.sigil;
                rr(ctx, 64*scale, -12*scale, 14*scale, 24*scale, 6*scale);
                ctx.fill();

                // system-specific small details
                ctx.save();
                ctx.rotate(-ang);
                if (sysId === 'engineer'){
                    // bolts
                    ctx.fillStyle = 'rgba(255,112,67,0.9)';
                    for (let i=0;i<6;i++){
                        const a = i*Math.PI*2/6 + t*0.5;
                        ctx.beginPath();
                        ctx.arc(Math.cos(a)*44*scale, Math.sin(a)*44*scale, 2.3*scale, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
                if (sysId === 'juggernaut'){
                    // gold plating lines
                    ctx.strokeStyle = 'rgba(255,213,79,0.9)';
                    ctx.lineWidth = 2*scale;
                    ctx.beginPath();
                    ctx.moveTo(-46*scale, 0); ctx.lineTo(46*scale, 0);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, -46*scale); ctx.lineTo(0, 46*scale);
                    ctx.stroke();
                }
                if (sysId === 'mage'){
                    // arcane sparkles
                    ctx.fillStyle = 'rgba(186,104,200,0.95)';
                    for (let i=0;i<8;i++){
                        const a = i*Math.PI*2/8 + t*1.1;
                        const rr2 = 52*scale + Math.sin(t*2+i)*3*scale;
                        ctx.beginPath();
                        ctx.arc(Math.cos(a)*rr2, Math.sin(a)*rr2, 2.4*scale, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
                if (sysId === 'assassin'){
                    // cloak (behind)
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.rotate(ang + Math.PI);
                    ctx.fillStyle = 'rgba(35, 10, 60, 0.38)';
                    ctx.beginPath();
                    ctx.moveTo(-10*scale, -18*scale);
                    ctx.lineTo(-60*scale, 0);
                    ctx.lineTo(-10*scale, 18*scale);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();

                    // blade glow
                    ctx.save();
                    ctx.rotate(ang);
                    ctx.shadowBlur = 10*scale;
                    ctx.shadowColor = 'rgba(182,124,255,0.9)';
                    ctx.strokeStyle = 'rgba(196,143,255,0.85)';
                    ctx.lineWidth = 4*scale;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(80*scale, 0);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = 'rgba(255,255,255,0.85)';
                    rr(ctx, 70*scale, -4*scale, 10*scale, 8*scale, 4*scale);
                    ctx.fill();
                    ctx.restore();

                    // eye core
                    ctx.fillStyle = 'rgba(255, 80, 180, 0.9)';
                    ctx.beginPath();
                    ctx.arc(12*scale, 0, 3.2*scale, 0, Math.PI*2);
                    ctx.fill();
                }
                if (sysId === 'speed'){
                    // streaks
                    ctx.globalAlpha = 0.25;
                    ctx.strokeStyle = 'rgba(41,182,246,0.95)';
                    ctx.lineWidth = 6*scale;
                    ctx.lineCap = 'round';
                    for (let i=0;i<4;i++){
                        ctx.beginPath();
                        ctx.moveTo(-70*scale - i*18*scale, -18*scale + i*12*scale);
                        ctx.lineTo(-10*scale - i*12*scale, -30*scale + i*10*scale);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                }
                ctx.restore();

                ctx.restore();
            }

            function drawMini(sysId){
                const el = document.querySelector(`canvas.sysMini[data-sys="${sysId}"]`);
                if (!el) return;
                const ctx = el.getContext('2d');
                if (!ctx) return;
                drawTank(ctx, sysId, 0.0, 0.45);
            }

            function drawAllMinis(){
                document.querySelectorAll('canvas.sysMini').forEach(c=>{
                    const sysId = c.getAttribute('data-sys');
                    const ctx = c.getContext('2d');
                    if (ctx) drawTank(ctx, sysId, 0.0, 0.45);
                });
            }

                        function getSelectedSys(){
                const sel = document.querySelector('input[name="tankSystem"]:checked');
                return (sel && sel.value) ? sel.value : 'default';
            }

            let __lastValidSys = 'default';
            function updateUI(){
                let sysId = getSelectedSys();
                if (!__lastValidSys) __lastValidSys = sysId || 'default';
                if (sysId === 'assassin' && !isAssassinUnlocked()) {
                    openAssassinLockModal();
                    const fallback = document.querySelector(`input[name="tankSystem"][value="${__lastValidSys}"]`) || document.querySelector('input[name="tankSystem"][value="default"]');
                    if (fallback) { fallback.checked = true; sysId = fallback.value || 'default'; }
                    else { sysId = 'default'; }
                } else {
                    __lastValidSys = sysId;
                }
                updateActiveSysItem(sysId);
                renderSkills(sysId);
                refreshProgress();
                try { localStorage.setItem("tankSystem", sysId); } catch(e) {}
            }

            function init(){
                const start = document.getElementById('startScreen');
                const pv = document.getElementById('systemPreview');
                if (!start || !pv) return;
// Keep preview canvas backing-store in sync with its CSS box (no stretch)
const fitPreviewCanvas = () => {
    const rect = pv.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || 0));
    const h = Math.max(1, Math.round(rect.height || 0));
    if (pv.width !== w || pv.height !== h) {
        pv.width = w;
        pv.height = h;
    }
};

// Throttle resize work to 1x / animation frame
let __pvFitQueued = false;
const requestFitPreview = () => {
    if (__pvFitQueued) return;
    __pvFitQueued = true;
    requestAnimationFrame(() => {
        __pvFitQueued = false;
        try { if (start.classList.contains('hidden')) return; } catch (e) {}
        try { fitPreviewCanvas(); } catch (e) {}
    });
};

// First fit after layout
requestFitPreview();

// Best option: observe actual element size changes (flex, scrollbars, font load, etc.)
let __pvRO = null;
try {
    if (typeof ResizeObserver !== 'undefined') {
        __pvRO = new ResizeObserver(() => requestFitPreview());
        __pvRO.observe(pv);
        if (pv.parentElement) __pvRO.observe(pv.parentElement);
    }
} catch (e) {}

// Fallback
window.addEventListener('resize', requestFitPreview);
// mark active on click for whole label (even if input not changed)
                document.querySelectorAll('#systemList .sysItem').forEach(item=>{
                    item.addEventListener('click', ()=>{
                        const inp = item.querySelector('input[type="radio"]');
                        if (inp) { inp.checked = true; updateUI(); }
                    });
                });

                document.querySelectorAll('input[name="tankSystem"]').forEach(r=>{
                    r.addEventListener('change', updateUI);
                });

                drawAllMinis();
                applyUnlockUI();
                updateUI();
                window.addEventListener('tank:langchange', () => {
                    applyUnlockUI();
                    updateUI();
                });
                const lockModal = document.getElementById('assassinLockModal');
                const lockBtn = document.getElementById('assassinUnlockBtn');
                const lockClose = document.getElementById('assassinUnlockClose');
                const lockInput = document.getElementById('assassinUnlockInput');
                if (lockBtn) lockBtn.addEventListener('click', (e)=>{ e.preventDefault(); tryUnlockAssassinByCode(); });
                if (lockClose) lockClose.addEventListener('click', (e)=>{ e.preventDefault(); closeAssassinLockModal(); });
                if (lockInput) lockInput.addEventListener('keydown', (e)=>{
                    if (e.key === 'Enter') { e.preventDefault(); tryUnlockAssassinByCode(); }
                    else if (e.key === 'Escape') { e.preventDefault(); closeAssassinLockModal(); }
                });
                if (lockModal) {
                    lockModal.addEventListener('mousedown', (e)=>{
                        if (e.target === lockModal) { e.preventDefault(); closeAssassinLockModal(); }
                    });
                }

                // lightweight animation loop for preview only
                const pvCtx = pv.getContext('2d');
                let running = true;
                let __pvLastFit = 0;
                const stop = ()=>{ running = false; };
                const btn = document.getElementById('startBtn');
                btn && btn.addEventListener('click', stop);

                function loop(){
                    if (!running) return;
                    // stop when screen hidden
                    if (start.classList.contains('hidden')) return;
                    const sysId = getSelectedSys();
                    const t = (Date.now() % 100000) / 1000;
                    // Occasional safety-fit (in case CSS changes without a window resize)
                    if ((Date.now() - __pvLastFit) > 600) { __pvLastFit = Date.now(); requestFitPreview(); }
                    if (pvCtx) drawTank(pvCtx, sysId, t, 1);
                    requestAnimationFrame(loop);
                }
                requestAnimationFrame(loop);

                // refresh progress when user opens menu again
                try{
                    const _ret = window.returnToMenu;
                    // don't override; just refresh when menu shown (best effort)
                }catch(e){}
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
        })();
