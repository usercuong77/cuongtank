// === Runtime Module: Welcome Overlay Gate ===
/* === Welcome Overlay (pre-menu) === */
(function(){
  const overlay = document.getElementById('welcomeOverlay');
  const startScreen = document.getElementById('startScreen');
  const btn = document.getElementById('welcomeContinueBtn');
  if(!overlay || !startScreen || !btn) return;
  if(window.__WELCOME_OVERLAY_INITED__) return;
  window.__WELCOME_OVERLAY_INITED__ = true;

  // Show welcome card on top of start menu (no dim background)
  overlay.style.display = 'flex';

  const close = () => {
    overlay.style.display = 'none';
  };

  // Only allow closing via button click.
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    try{ window.BGM && window.BGM.onUserGesture && window.BGM.onUserGesture('menu'); }catch(_e){}
    close();
  }, { passive: false });
})();

