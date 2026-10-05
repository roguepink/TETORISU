'use strict';
// ===== 起動 =====
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  Input.init(canvas);
  const game = new Game(canvas);
  window.game = game;
  function resize() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = `${Math.floor(W * s)}px`; canvas.style.height = `${Math.floor(H * s)}px`;
  }
  window.addEventListener('resize', resize); resize();
  const unlock = () => { if (Sound.ensure()) { Sound.resume(); if (game.state === 'title') Sound.play('title'); } };
  window.addEventListener('keydown', unlock); window.addEventListener('pointerdown', unlock);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    game.update(dt); game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
