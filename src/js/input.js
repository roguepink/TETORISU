'use strict';
// ===== 入力（キーボード / ゲームパッド / タッチ） =====
const Input = (() => {
  const KEYMAP = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    fire: ['KeyZ', 'Space', 'KeyJ'], bomb: ['KeyX', 'KeyK'], charge: ['KeyC', 'ShiftLeft', 'ShiftRight', 'KeyL'],
    prev: ['KeyQ', 'KeyU'], next: ['KeyE', 'KeyI', 'Tab'], pause: ['KeyP', 'Escape'],
    confirm: ['Enter', 'KeyZ', 'Space', 'KeyJ'], back: ['Escape', 'KeyX'], mute: ['KeyM'],
  };
  const GP_BUTTONS = { fire: [0, 7], bomb: [1], charge: [2, 6], prev: [4], next: [5], pause: [9], confirm: [0, 9], back: [1] };
  const keys = new Set(), hits = new Set();
  let gpButtons = [], gpPrev = [], gpAxes = [0, 0];
  let anyHit = false;
  const touch = { enabled: false, moveId: null, lx: 0, ly: 0, dx: 0, dy: 0, buttons: {}, hitsNow: new Set(), tapStart: false, tapPos: null };
  const BTN = { bomb: { x: W - 62, y: H - 62, r: 38, label: 'BOMB' }, charge: { x: W - 158, y: H - 62, r: 38, label: 'CHG' }, next: { x: W - 62, y: H - 158, r: 30, label: 'WPN' } };
  let canvas = null;

  function init(cv) {
    canvas = cv;
    window.addEventListener('keydown', (e) => {
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!keys.has(e.code)) { hits.add(e.code); anyHit = true; }
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function hitButton(p) { for (const k in BTN) { const b = BTN[k]; if (dist(p.x, p.y, b.x, b.y) <= b.r + 8) return k; } return null; }
  function onDown(e) {
    const p = toCanvas(e);
    anyHit = true; touch.tapStart = true; touch.tapPos = p;
    if (e.pointerType === 'mouse') { // マウスは移動のみ（確認用）
      touch.moveId = e.pointerId; touch.lx = p.x; touch.ly = p.y; return;
    }
    touch.enabled = true;
    const b = hitButton(p);
    if (b) { touch.buttons[b] = e.pointerId; touch.hitsNow.add(b); return; }
    if (touch.moveId === null) { touch.moveId = e.pointerId; touch.lx = p.x; touch.ly = p.y; }
  }
  function onMove(e) {
    if (e.pointerId !== touch.moveId) return;
    const p = toCanvas(e);
    touch.dx += p.x - touch.lx; touch.dy += p.y - touch.ly; touch.lx = p.x; touch.ly = p.y;
  }
  function onUp(e) {
    if (e.pointerId === touch.moveId) touch.moveId = null;
    for (const k in touch.buttons) if (touch.buttons[k] === e.pointerId) delete touch.buttons[k];
  }
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    gpPrev = gpButtons; gpButtons = []; gpAxes = [0, 0];
    for (const gp of pads) {
      if (!gp) continue;
      gp.buttons.forEach((b, i) => { if (b.pressed) gpButtons[i] = true; });
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.abs(ax) > 0.2) gpAxes[0] = ax; if (Math.abs(ay) > 0.2) gpAxes[1] = ay;
      if (gpButtons[14]) gpAxes[0] = -1; if (gpButtons[15]) gpAxes[0] = 1; if (gpButtons[12]) gpAxes[1] = -1; if (gpButtons[13]) gpAxes[1] = 1;
      if (gpButtons.some((b, i) => b && !gpPrev[i])) anyHit = true;
      break;
    }
  }
  function down(action) {
    for (const k of KEYMAP[action] || []) if (keys.has(k)) return true;
    for (const i of GP_BUTTONS[action] || []) if (gpButtons[i]) return true;
    if (touch.enabled) {
      if (action === 'fire') return true;
      if (touch.buttons[action]) return true;
    }
    return false;
  }
  function hit(action) {
    if (hitKey(action)) return true;
    if (touch.hitsNow.has(action)) return true;
    if (action === 'confirm' && touch.tapStart) return true;
    return false;
  }
  // キーボード / ゲームパッドだけ（タップは含めない）
  function hitKey(action) {
    for (const k of KEYMAP[action] || []) if (hits.has(k)) return true;
    for (const i of GP_BUTTONS[action] || []) if (gpButtons[i] && !gpPrev[i]) return true;
    return false;
  }
  // このフレームにタップ／クリックされた座標（なければ null）
  function tap() { return touch.tapPos; }
  function axis() {
    let x = 0, y = 0;
    if (down('left')) x -= 1; if (down('right')) x += 1; if (down('up')) y -= 1; if (down('down')) y += 1;
    if (x === 0 && y === 0) { x = gpAxes[0]; y = gpAxes[1]; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  function consumeTouchDelta() { const d = { x: touch.dx, y: touch.dy }; touch.dx = 0; touch.dy = 0; return d; }
  function endFrame() { hits.clear(); touch.hitsNow.clear(); touch.tapStart = false; touch.tapPos = null; anyHit = false; }
  function consumeAnyHit() { const a = anyHit; anyHit = false; return a; }
  function drawTouchUI(ctx) {
    if (!touch.enabled) return;
    for (const k in BTN) {
      const b = BTN[k]; const on = !!touch.buttons[k];
      ctx.save(); ctx.globalAlpha = on ? 0.75 : 0.35;
      ctx.fillStyle = on ? '#FFD84D' : '#ffffff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.9; drawText(ctx, b.label, b.x, b.y, 16, '#222');
      ctx.restore();
    }
  }
  return { init, down, hit, hitKey, tap, axis, pollGamepad, endFrame, consumeAnyHit, consumeTouchDelta, drawTouchUI, touch };
})();
