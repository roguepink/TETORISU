'use strict';
// ===== パーティクル / 浮遊テキスト / エフェクト =====
class Particles {
  constructor(max = 1000) { this.list = []; this.max = max; }
  add(p) {
    if (this.list.length >= this.max) this.list.shift();
    p.age = 0; p.life = p.life || 0.6; p.vx = p.vx || 0; p.vy = p.vy || 0; p.rot = p.rot || 0; p.vr = p.vr || 0; p.g = p.g || 0; p.drag = p.drag || 0;
    this.list.push(p);
  }
  clear() { this.list.length = 0; }
  update(dt) {
    const l = this.list; let w = 0;
    for (let i = 0; i < l.length; i++) {
      const p = l[i]; p.age += dt;
      if (p.age >= p.life) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.rot += p.vr * dt;
      l[w++] = p;
    }
    l.length = w;
  }
  draw(ctx) {
    for (const p of this.list) {
      const t = p.age / p.life, a = p.fadeIn ? Math.min(1, t * 4) * (1 - t) : 1 - t;
      ctx.globalAlpha = Math.max(0, a * (p.alpha === undefined ? 1 : p.alpha));
      const s = p.size * (p.shrink ? (1 - t) : p.grow ? (0.3 + t * 1.2) : 1);
      switch (p.type) {
        case 'ring':
          ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, (p.lw || 4) * (1 - t));
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.2 + t * 0.8), 0, TAU); ctx.stroke(); break;
        case 'spark':
          ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke(); break;
        case 'cell':
          drawMino(ctx, p.x, p.y, SHAPES.M, s, p.color, p.rot); break;
        case 'mino':
          drawMino(ctx, p.x, p.y, p.shape || SHAPES.T, s, p.color, p.rot); break;
        case 'star': {
          ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath();
          for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s, a2 = i * Math.PI / 5; ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); }
          ctx.closePath(); ctx.fill(); ctx.restore(); break;
        }
        case 'drop': {
          ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
          ctx.beginPath(); ctx.moveTo(0, -s * 1.6); ctx.quadraticCurveTo(s, 0, 0, s); ctx.quadraticCurveTo(-s, 0, 0, -s * 1.6); ctx.fill(); ctx.restore(); break;
        }
        case 'text':
          drawText(ctx, p.text, p.x, p.y, s, p.color, 'center', { outline: p.outline || 'rgba(0,0,0,0.6)' }); break;
        default:
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, s), 0, TAU); ctx.fill();
          if (p.hl) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(p.x - s * 0.3, p.y - s * 0.3, s * 0.3, 0, TAU); ctx.fill(); }
      }
    }
    ctx.globalAlpha = 1;
  }
}

class FloatTexts {
  constructor() { this.list = []; }
  add(x, y, text, color = '#fff', size = 18, o = {}) { this.list.push({ x, y, text, color, size, age: 0, life: o.life || 0.9, vy: o.vy === undefined ? -50 : o.vy, outline: o.outline, pop: o.pop }); }
  clear() { this.list.length = 0; }
  update(dt) { this.list = this.list.filter((t) => { t.age += dt; t.y += t.vy * dt; return t.age < t.life; }); }
  draw(ctx) {
    for (const t of this.list) {
      const k = t.age / t.life; const sc = t.pop ? (k < 0.2 ? easeOutBack(k / 0.2) : 1) : 1;
      drawText(ctx, t.text, t.x, t.y, t.size * sc, t.color, 'center', { outline: t.outline || 'rgba(40,20,60,0.75)', alpha: k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1 });
    }
  }
}

// ぷよが弾けるエフェクト（バブルがはじける感じ）
function fxPuyoPop(ps, x, y, r, col, chain = 0) {
  const n = Math.round(10 + r * 0.4 + chain * 2);
  ps.add({ type: 'ring', x, y, size: r * 2.4 + chain * 6, color: col.light, life: 0.35, lw: 6 });
  ps.add({ type: 'ring', x, y, size: r * 1.6, color: col.main, life: 0.25, lw: 3 });
  ps.add({ type: 'circle', x, y, size: r * 1.1, color: col.light, life: 0.18, grow: true, alpha: 0.8 });
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), sp = rand(80, 260 + r * 2);
    ps.add({ type: 'drop', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 520, size: rand(3, 6 + r * 0.08), color: i % 3 === 0 ? col.light : col.main, life: rand(0.4, 0.8), drag: 1.2 });
  }
  for (let i = 0; i < 5 + chain; i++) {
    const a = rand(TAU), sp = rand(60, 200);
    ps.add({ type: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vr: rand(-8, 8), size: rand(3, 6), color: '#ffffff', life: rand(0.3, 0.6), shrink: true });
  }
  for (let i = 0; i < 4; i++) {
    ps.add({ type: 'circle', x: x + rand(-r, r), y: y + rand(-r, r), vx: rand(-30, 30), vy: rand(-90, -30), size: rand(2, 5), color: col.light, life: rand(0.5, 1), hl: true, alpha: 0.9 });
  }
}
function fxExplosion(ps, x, y, r, color = '#FFB347') {
  ps.add({ type: 'ring', x, y, size: r * 2, color: '#fff', life: 0.3, lw: 5 });
  ps.add({ type: 'circle', x, y, size: r, color: '#fff', life: 0.15, grow: true, alpha: 0.9 });
  for (let i = 0; i < 14 + r * 0.3; i++) {
    const a = rand(TAU), sp = rand(50, 300);
    ps.add({ type: 'circle', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: rand(3, 9), color: pick([color, '#FFE066', '#FF7A59', '#fff']), life: rand(0.3, 0.7), shrink: true, drag: 2 });
  }
  for (let i = 0; i < 8; i++) {
    const a = rand(TAU), sp = rand(200, 500);
    ps.add({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 2, color: '#FFF4B0', life: 0.25, drag: 3 });
  }
}
function fxMinoBurst(ps, x, y, color, n = 8, shape = null) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), sp = rand(100, 320);
    ps.add({ type: shape ? 'mino' : 'cell', shape, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, g: 700, vr: rand(-10, 10), size: rand(5, 9), color, life: rand(0.5, 0.9), shrink: true });
  }
}
function fxSparkle(ps, x, y, color, n = 6) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), sp = rand(30, 140);
    ps.add({ type: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vr: rand(-6, 6), size: rand(3, 7), color, life: rand(0.3, 0.7), shrink: true });
  }
}
function fxItemGet(ps, x, y, color) {
  ps.add({ type: 'ring', x, y, size: 50, color, life: 0.4, lw: 4 });
  fxSparkle(ps, x, y, color, 10);
  fxSparkle(ps, x, y, '#ffffff', 6);
}
