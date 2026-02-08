// === Runtime Module: Background Music (BGM) ===
/* === Background Music (BGM) ===
   Folder structure (same level as this HTML):
     Music/Background music/*.mp3   (menu)
     Music/Music in games/*.mp3     (in-game)
   OR (lowercase):
     music/Background music/*.mp3
     music/Music in games/*.mp3

   IMPORTANT (Browser limitation):
   - A page cannot "see" what's inside a folder unless the server provides directory listing,
     OR you provide a manifest file (playlist.txt / playlist.json / playlist.m3u).
   - VSCode Live Server usually blocks folder listing, so use playlist.txt for reliable auto play.

   playlist.txt format: one mp3 filename per line (must match exactly).
   Playback starts after a user gesture (Welcome OK / Start) due to browser autoplay rules.
*/
(function(){
  if (window.BGM) return;

  const state = {
    ctx: 'menu',
    discovered: false,
    playlists: { menu: [], game: [] },
    idx: { menu: 0, game: 0 },
    audio: null,
    lastUrl: null,
    muted: false,
    userVol: 0.7,
    vol: { menu: 0.45, game: 0.42 },
    rootPicked: null,
  };

  // Sync with saved settings (if available)
  try{
    const s = window.State && window.State.save && window.State.save.settings;
    if(s && typeof s.musicVolume === 'number') state.userVol = s.musicVolume;
  }catch(e){}

  const isMp3 = (name) => /\.mp3$/i.test(name || '');
  const niceName = (url) => {
    try {
      const u = new URL(url, location.href);
      const p = (u.pathname || '').split('/').pop() || '';
      return decodeURIComponent(p);
    } catch (e) { return String(url || ''); }
  };
  const uniq = (arr) => Array.from(new Set(arr));
  const uniqKeepOrder = (arr) => {
    const seen = new Set();
    const out = [];
    for (const v of arr){
      if(seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out;
  };
  const sortByName = (urls) => urls.slice().sort((a,b) =>
    niceName(a).localeCompare(niceName(b), 'vi', { numeric: true, sensitivity: 'base' })
  );

  function absBase(relDir){
    // relDir can be "./Music/Background music/"...
    try { return new URL(relDir, location.href).toString(); } catch(e){ return relDir; }
  }

  async function loadPlaylistFile(relDir){
    const dir = absBase(relDir);
    const candidates = ['playlist.json', 'playlist.txt', 'playlist.m3u'];
    for(const file of candidates){
      try{
        const url = new URL(file, dir).toString();
        const res = await fetch(url, { cache: 'no-store' });
        if(!res.ok) continue;

        if(file.endsWith('.json')){
          const data = await res.json();
          let arr = Array.isArray(data) ? data : (data && Array.isArray(data.tracks) ? data.tracks : []);
          const out = [];
          for(const item of arr){
            if(typeof item !== 'string') continue;
            const line = item.trim();
            if(!isMp3(line)) continue;
            try{ out.push(new URL(line, dir).toString()); }catch(e){}
          }
          return uniqKeepOrder(out);
        }else{
          const txt = await res.text();
          const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          const out = [];
          for(const line0 of lines){
            const line = line0.trim();
            if(!line || line.startsWith('#')) continue;
            if(!isMp3(line)) continue;
            try{ out.push(new URL(line, dir).toString()); }catch(e){}
          }
          return uniqKeepOrder(out);
        }
      }catch(e){}
    }
    return null; // not found
  }

  async function listMp3FromDirListing(relDir){
    const dir = absBase(relDir);
    try{
      const res = await fetch(dir, { cache: 'no-store' });
      if(!res.ok) return [];
      const txt = await res.text();

      // Parse common directory index formats (python http.server/nginx/apache).
      const reHref = /href\s*=\s*["']([^"']+)["']/ig;
      let m; const out = [];
      while((m = reHref.exec(txt))){
        const href = m[1];
        if(!href) continue;
        if(href === '../' || href.startsWith('?') || href.startsWith('#')) continue;
        if(!isMp3(href)) continue;
        try{ out.push(new URL(href, dir).toString()); }catch(e){}
      }
      return sortByName(uniq(out));
    }catch(e){
      return [];
    }
  }

  async function autoDiscover(){
    if(state.discovered) return;
    state.discovered = true;

    // Support both "music" and "Music".
    const roots = ['./music/', './Music/'];
    let pickedRoot = null;

    for(const root of roots){
      const menuRel = root + 'Background music/';
      const gameRel = root + 'Music in games/';

      // Prefer playlist file (works on Live Server), fallback to directory listing
      const [menuManifest, gameManifest] = await Promise.all([
        loadPlaylistFile(menuRel),
        loadPlaylistFile(gameRel),
      ]);

      const [menuList, gameList] = await Promise.all([
        (menuManifest !== null) ? Promise.resolve(menuManifest) : listMp3FromDirListing(menuRel),
        (gameManifest !== null) ? Promise.resolve(gameManifest) : listMp3FromDirListing(gameRel),
      ]);

      if ((menuList && menuList.length) || (gameList && gameList.length)){
        state.playlists.menu = menuList || [];
        state.playlists.game = gameList || [];
        pickedRoot = root;
        break;
      }
    }

    // Fallback: if only one playlist exists, use it for both contexts (so you still hear music)
    if(!state.playlists.menu.length && state.playlists.game.length){
      state.playlists.menu = state.playlists.game.slice();
    }
    if(!state.playlists.game.length && state.playlists.menu.length){
      state.playlists.game = state.playlists.menu.slice();
    }

    state.rootPicked = pickedRoot;

    const total = state.playlists.menu.length + state.playlists.game.length;
    if (total === 0) {
      try {
        __devLog('[BGM] No tracks found.');
        __devLog('[BGM] Checked roots:', roots);
        __devLog('[BGM] Live Server usually blocks folder listing, so use playlist.txt:');
        __devLog('  Music/Background music/playlist.txt');
        __devLog('  Music/Music in games/playlist.txt');
      } catch(e){}
    } else {
      try {
        __devLog('[BGM] Using root:', pickedRoot || '(unknown)');
        __devLog('[BGM] Tracks:', {
          menu: state.playlists.menu.map(niceName),
          game: state.playlists.game.map(niceName)
        });
      } catch(e){}
    }
  }

  function ensureAudio(){
    if(state.audio) return state.audio;
    const a = document.createElement('audio');
    a.preload = 'auto';
    a.loop = false;
    a.autoplay = false;
    a.crossOrigin = 'anonymous';
    a.addEventListener('ended', () => next());
    a.addEventListener('error', () => { setTimeout(() => next(), 180); });
    state.audio = a;
    return a;
  }

  function applyVolume(){
    const a = state.audio;
    if(!a) return;
    a.volume = state.muted ? 0 : ((state.vol[state.ctx] ?? 0.40) * (state.userVol ?? 1));
  }

  function setMusicVolume(v){
    const n = Math.max(0, Math.min(1, Number(v)));
    state.userVol = isNaN(n) ? 0.7 : n;
    applyVolume();
  }

  function setSrc(url){
    const a = ensureAudio();
    if(state.lastUrl && typeof state.lastUrl === 'string' && state.lastUrl.startsWith('blob:')){
      try { URL.revokeObjectURL(state.lastUrl); } catch(e){}
    }
    state.lastUrl = url;
    a.src = url;
  }

  function currentList(){
    return state.playlists[state.ctx] || [];
  }

  async function playCurrent(){
    await autoDiscover();
    const list = currentList();
    if(!list.length) return;

    let i = state.idx[state.ctx] || 0;
    if(i < 0) i = 0;
    if(i >= list.length) i = 0;
    state.idx[state.ctx] = i;

    const url = list[i];
    setSrc(url);
    applyVolume();

    try{
      const p = state.audio.play();
      if(p && p.catch) p.catch(()=>{});
    }catch(e){}
  }

  function next(){
    const list = currentList();
    if(!list.length) return;
    state.idx[state.ctx] = ((state.idx[state.ctx] || 0) + 1) % list.length;
    playCurrent();
  }

  function setContext(ctx){
    state.ctx = (ctx === 'game') ? 'game' : 'menu';
    if(state.audio){
      if(!state.audio.paused) playCurrent();
      else applyVolume();
    }
  }

  async function onUserGesture(ctx){
    setContext(ctx);
    ensureAudio();
    await playCurrent();
  }

  function mute(v=true){
    state.muted = !!v;
    applyVolume();
  }

  window.BGM = { setContext, onUserGesture, next, mute, setMusicVolume, _state: state };
})();

