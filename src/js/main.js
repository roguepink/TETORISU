'use strict';
// ===== 起動 =====
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  Input.init(canvas);
  const game = new Game(canvas);
  window.game = game;
  function resize() {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight;
    const s = Math.min(vw / W, vh / H);
    canvas.style.width = `${Math.floor(W * s)}px`; canvas.style.height = `${Math.floor(H * s)}px`;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();
  // 全画面（ボタン / F キー）。横向きに固定できる端末では固定する
  const fsBtn = document.getElementById('fs');
  const fsEl = document.documentElement;
  const canFullscreen = !!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen);
  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (fsEl.requestFullscreen) await fsEl.requestFullscreen({ navigationUI: 'hide' }); else if (fsEl.webkitRequestFullscreen) fsEl.webkitRequestFullscreen();
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      } else if (document.exitFullscreen) await document.exitFullscreen();
    } catch (e) { /* 全画面が許可されない環境 */ }
    setTimeout(resize, 100);
  }
  if (canFullscreen) {
    fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => { fsBtn.classList.toggle('hidden', !!document.fullscreenElement); resize(); });
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyF') toggleFullscreen(); });
    // 最初のタップ（またはキー）で自動的に全画面にする。ブラウザは操作の直後しか全画面を許さないため
    const isApp = window.matchMedia && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches);
    let autoDone = isApp;
    const autoFullscreen = (e) => {
      if (autoDone) return;
      if (e.target === fsBtn) { autoDone = true; return; } // 全画面ボタンそのものは、ボタンの処理にまかせる
      if (e.type === 'keydown' && (e.code === 'KeyF' || e.code === 'Escape')) return;
      autoDone = true;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) toggleFullscreen();
    };
    window.addEventListener('pointerdown', autoFullscreen);
    window.addEventListener('keydown', autoFullscreen);
  } else fsBtn.classList.add('hidden');
  const unlock = () => { if (Sound.ensure()) { Sound.resume(); if (game.state === 'title') Sound.play('title'); } };
  window.addEventListener('keydown', unlock); window.addEventListener('pointerdown', unlock);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    game.update(dt); game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // ホーム画面に追加したときにオフラインでも起動できるようにする（file:// では登録しない）
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* 無視 */ }
  }
});
