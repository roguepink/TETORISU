'use strict';
// ===== 自機の弾（テトロミノ） =====
let _bulletId = 0;
class Bullet {
  constructor(o) {
    this.id = _bulletId++;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.dmg = 5; this.size = 9; this.shape = SHAPES.M; this.color = '#fff';
    this.rot = 0; this.vr = 0; this.pierce = 0; this.life = 3; this.age = 0; this.kind = 'normal'; this.dead = false; this.glow = false;
    this.tick = 0.14; this.big = false;
    Object.assign(this, o);
    this.hits = this.kind === 'spin' ? new Map() : new Set();
    this.r = shapeRadius(this.shape, this.size) * 0.85;
    if (this.kind === 'wave') { this.baseY = this.y; this.vy = 0; }
  }
  update(dt, g) {
    this.age += dt;
    if (this.age > this.life) { this.dead = true; return; }
    switch (this.kind) {
      case 'wave':
        this.x += this.vx * dt;
        this.y = this.baseY + Math.sin(this.age * this.freq + this.phase) * this.amp;
        this.rot = Math.cos(this.age * this.freq + this.phase) * 0.6;
        break;
      case 'bounce':
        this.x += this.vx * dt; this.y += this.vy * dt; this.rot += this.vr * dt;
        if ((this.y < 40 + this.r && this.vy < 0) || (this.y > H - 20 - this.r && this.vy > 0)) {
          this.vy = -this.vy; this.bounces--; this.vx *= 1.12; this.vy *= 1.12; this.dmg += 3; this.hits.clear();
          fxSparkle(g.particles, this.x, this.y, this.color, 5); Sound.sfx.bounce();
          if (this.bounces < 0) this.dead = true;
        }
        break;
      case 'homing': {
        const e = g.nearestEnemy(this.x, this.y, 520, this.hits);
        let ang = Math.atan2(this.vy, this.vx);
        if (e) {
          const want = Math.atan2(e.y - this.y, e.x - this.x);
          let d = want - ang; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
          ang += clamp(d, -this.turn * dt, this.turn * dt);
        } else { // 敵がいなければ徐々に前へ
          let d = -ang; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
          ang += clamp(d, -2 * dt, 2 * dt);
        }
        this.vx = Math.cos(ang) * this.speed; this.vy = Math.sin(ang) * this.speed;
        this.x += this.vx * dt; this.y += this.vy * dt; this.rot = ang;
        if (this.cute) { if (Math.random() < 0.7) g.particles.add({ type: 'star', x: this.x - 6, y: this.y + rand(-3, 3), vx: -60, vy: rand(-20, 20), size: rand(2.5, 4.5), color: Math.random() < 0.5 ? '#fff' : this.color, life: 0.35, shrink: true, vr: 6 }); }
        else if (Math.random() < 0.5) g.particles.add({ type: 'circle', x: this.x, y: this.y, size: 3, color: this.color, life: 0.25, shrink: true, alpha: 0.6 });
        break;
      }
      case 'split':
        this.x += this.vx * dt; this.y += this.vy * dt; this.rot += this.vr * dt;
        if (this.age > this.splitTime) { this.split(g); this.dead = true; }
        break;
      case 'rain':
        this.vy += this.gravity * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.rot += this.vr * dt;
        if (this.y > H + 40) this.dead = true;
        break;
      case 'spin':
        this.x += this.vx * dt; this.y += this.vy * dt; this.rot += this.vr * dt;
        if (this.big && Math.random() < 0.6) g.particles.add({ type: 'cell', x: this.x + rand(-this.r, this.r), y: this.y + rand(-this.r, this.r), vx: -200, size: rand(4, 8), color: this.color, life: 0.4, shrink: true, vr: 5 });
        break;
      default:
        this.x += this.vx * dt; this.y += this.vy * dt; this.rot += this.vr * dt;
    }
    if (this.x > W + 60 || this.x < -80 || this.y < -80 || this.y > H + 80) this.dead = true;
  }
  split(g) {
    const n = this.frags, col = this.color;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.2, 0.2), sp = 520;
      g.addBullet(new Bullet({ x: this.x, y: this.y, vx: Math.cos(a) * sp + 150, vy: Math.sin(a) * sp, dmg: this.fragDmg, size: 7, shape: SHAPES.M, color: col, pierce: 1, vr: 12, life: 0.7 }));
    }
    fxMinoBurst(g.particles, this.x, this.y, col, 5);
  }
  // 敵にヒットしたとき。true を返したら弾は消える
  onHit(e, g) {
    if (this.kind === 'spin') {
      const last = this.hits.get(e.id);
      if (last !== undefined && this.age - last < this.tick) return false;
      this.hits.set(e.id, this.age);
      e.takeDamage(this.dmg, g, this);
      g.particles.add({ type: 'ring', x: e.x, y: e.y, size: e.r * 1.3, color: this.color, life: 0.2, lw: 3 });
      return false;
    }
    if (this.hits.has(e.id)) return false;
    this.hits.add(e.id);
    e.takeDamage(this.dmg, g, this);
    fxSparkle(g.particles, this.x, this.y, this.color, 3);
    if (this.kind === 'heavy') {
      g.areaDamage(this.x, this.y, this.blast, this.dmg * 0.6, { exclude: e.id, source: this });
      fxExplosion(g.particles, this.x, this.y, this.blast * 0.7, this.color);
      Sound.sfx.explode(0.6); g.shake(4);
      return true;
    }
    if (this.kind === 'split') { this.split(g); return true; }
    if (this.pierce > 0) { this.pierce--; return false; }
    return true;
  }
  draw(ctx) {
    const col = this.rainbow ? rainbowColor(this.age * 3 + this.id * 0.3) : this.color;
    if (this.cute) { // お供ミノのハート型ミサイル
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot + Math.PI / 2); ctx.shadowColor = col; ctx.shadowBlur = 8;
      drawHeart(ctx, 0, 0, this.size * 0.75, col); ctx.restore(); return;
    }
    if (this.big) {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 1.1, 0, TAU); ctx.fill(); ctx.restore();
    }
    drawMino(ctx, this.x, this.y, this.shape, this.size, col, this.rot, 1, this.glow);
  }
}

// ===== 武器定義（10 種 × Lv1〜5） =====
const WEAPONS = [
  {
    key: 'I', name: 'ラインレーザー', en: 'LINE LASER', color: MINO_COLORS.I, shape: SHAPES.I, desc: 'まっすぐ貫通するロングショット',
    cooldown: (lv) => (lv >= 5 ? 0.075 : 0.17 - lv * 0.015),
    fire(g, p, lv) {
      const n = lv < 3 ? 1 : lv < 4 ? 2 : 3, offs = n === 1 ? [0] : n === 2 ? [-13, 13] : [-18, 0, 18];
      for (const oy of offs) g.addBullet(new Bullet({ x: p.x + 34, y: p.y + oy, vx: 980, dmg: 7 + lv * 2, size: lv >= 5 ? 10 : 8, shape: SHAPES.I, color: this.color, pierce: 2 + lv, glow: true }));
    },
  },
  {
    key: 'O', name: 'ヘビーブロック', en: 'HEAVY BLOCK', color: MINO_COLORS.O, shape: SHAPES.O, desc: '重い一撃、着弾すると爆発して周囲をまきこむ',
    cooldown: (lv) => 0.5 - lv * 0.045,
    fire(g, p, lv) {
      const n = lv >= 5 ? 3 : lv >= 3 ? 2 : 1, offs = n === 1 ? [0] : n === 2 ? [-22, 22] : [-34, 0, 34];
      for (const oy of offs) g.addBullet(new Bullet({ x: p.x + 30, y: p.y + oy, vx: 470, dmg: 26 + lv * 9, size: 11 + lv, shape: SHAPES.O, color: this.color, kind: 'heavy', blast: 55 + lv * 13, vr: 3 }));
    },
  },
  {
    key: 'T', name: 'トライスプレッド', en: 'TRI SPREAD', color: MINO_COLORS.T, shape: SHAPES.T, desc: '扇状に広がるショット',
    cooldown: (lv) => 0.2 - lv * 0.013,
    fire(g, p, lv) {
      const n = [3, 5, 5, 7, 7][lv - 1], spread = 0.2 + (lv >= 4 ? 0.02 : 0), sp = 820;
      for (let i = 0; i < n; i++) {
        const a = (i - (n - 1) / 2) * spread;
        g.addBullet(new Bullet({ x: p.x + 28, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 8 + lv * 2, size: 7 + (lv >= 5 ? 1 : 0), shape: SHAPES.T, color: this.color, rot: a, vr: 7 }));
      }
    },
  },
  {
    key: 'S', name: 'ウェーブ', en: 'WAVE', color: MINO_COLORS.S, shape: SHAPES.S, desc: 'うねりながら広い範囲をカバー',
    cooldown: (lv) => 0.18 - lv * 0.012,
    fire(g, p, lv) {
      const pairs = [1, 1, 2, 2, 3][lv - 1];
      for (let j = 0; j < pairs; j++) {
        const amp = 26 + lv * 7 + j * 18;
        for (const ph of [0, Math.PI]) g.addBullet(new Bullet({ x: p.x + 28, y: p.y, vx: 700, dmg: 7 + lv * 2, size: 7, shape: SHAPES.S, color: this.color, kind: 'wave', amp, freq: 9, phase: ph, pierce: 1 + (lv >= 4 ? 1 : 0) }));
      }
    },
  },
  {
    key: 'Z', name: 'リコシェ', en: 'RICOCHET', color: MINO_COLORS.Z, shape: SHAPES.Z, desc: '画面の上下で跳ね返り、跳ねるほど強くなる',
    cooldown: (lv) => 0.23 - lv * 0.016,
    fire(g, p, lv) {
      const angs = lv < 3 ? [-0.5, 0.5] : lv < 5 ? [-0.6, -0.25, 0.25, 0.6] : [-0.7, -0.35, 0, 0.35, 0.7], sp = 720;
      for (const a of angs) g.addBullet(new Bullet({ x: p.x + 28, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 9 + lv * 2, size: 8, shape: SHAPES.Z, color: this.color, kind: 'bounce', bounces: 2 + lv, vr: 9, life: 4 }));
    },
  },
  {
    key: 'J', name: 'ホーミング', en: 'HOMING', color: MINO_COLORS.J, shape: SHAPES.J, desc: '敵を追いかける誘導ミノ',
    cooldown: (lv) => 0.25 - lv * 0.017,
    fire(g, p, lv) {
      const n = [1, 2, 2, 3, 4][lv - 1];
      for (let i = 0; i < n; i++) {
        const a = n === 1 ? 0 : (i - (n - 1) / 2) * 0.9;
        g.addBullet(new Bullet({ x: p.x + 26, y: p.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, speed: 620 + lv * 20, dmg: 9 + lv * 2, size: 8, shape: SHAPES.J, color: this.color, kind: 'homing', turn: 3.2 + lv * 0.9, pierce: lv >= 4 ? 1 : 0, life: 2.6 }));
      }
    },
  },
  {
    key: 'L', name: 'シャッター', en: 'SHATTER', color: MINO_COLORS.L, shape: SHAPES.L, desc: '命中するとミノがバラバラに飛び散る',
    cooldown: (lv) => 0.32 - lv * 0.022,
    fire(g, p, lv) {
      const n = lv >= 4 ? 2 : 1, offs = n === 1 ? [0] : [-16, 16];
      for (const oy of offs) g.addBullet(new Bullet({ x: p.x + 28, y: p.y + oy, vx: 620, dmg: 12 + lv * 3, size: 9, shape: SHAPES.L, color: this.color, kind: 'split', frags: [4, 6, 8, 8, 12][lv - 1], fragDmg: 5 + lv * 1.5, splitTime: 0.7, vr: 5 }));
    },
  },
  {
    key: 'M', name: 'マシンガン', en: 'MACHINE GUN', color: MINO_COLORS.M, shape: SHAPES.M, desc: '雨あられの超高速連射',
    cooldown: (lv) => 0.07 - lv * 0.005,
    fire(g, p, lv) {
      const n = [1, 1, 2, 2, 3][lv - 1], offs = n === 1 ? [0] : n === 2 ? [-10, 10] : [-14, 0, 14];
      for (const oy of offs) g.addBullet(new Bullet({ x: p.x + 30, y: p.y + oy, vx: 1050, vy: rand(-45, 45), dmg: 4 + lv, size: 7, shape: SHAPES.M, color: this.color, rot: rand(TAU), vr: 15 }));
    },
  },
  {
    key: 'P', name: 'スピンクロス', en: 'SPIN CROSS', color: MINO_COLORS.P, shape: SHAPES.P, desc: '回転しながら敵をなぎはらう貫通弾',
    cooldown: (lv) => 0.55 - lv * 0.045,
    fire(g, p, lv) {
      const n = lv >= 4 ? 2 : 1, offs = n === 1 ? [0] : [-40, 40];
      for (const oy of offs) g.addBullet(new Bullet({ x: p.x + 36, y: p.y + oy, vx: 390, dmg: 6 + lv * 2, size: 10 + lv * 1.5, shape: SHAPES.P, color: this.color, kind: 'spin', vr: 9, pierce: Infinity, life: 3, tick: 0.13, glow: true }));
    },
  },
  {
    key: 'R', name: 'テトロレイン', en: 'TETRO RAIN', color: MINO_COLORS.D, shape: SHAPES.T, rainbow: true, desc: '前方の空からテトロミノが降りそそぐ',
    cooldown: (lv) => 0.3 - lv * 0.03,
    fire(g, p, lv) {
      const n = [1, 2, 2, 3, 4][lv - 1];
      for (let i = 0; i < n; i++) {
        const k = pick(TETROMINO_KEYS);
        g.addBullet(new Bullet({ x: p.x + rand(110, 460), y: -30 - rand(60), vx: rand(20, 90), vy: rand(100, 300), gravity: 1500, dmg: 14 + lv * 4, size: 10, shape: SHAPES[k], color: MINO_COLORS[k], kind: 'rain', pierce: 2, vr: rand(-4, 4), life: 3 }));
      }
    },
  },
];
const WEAPON_INDEX = {}; WEAPONS.forEach((w, i) => (WEAPON_INDEX[w.key] = i));

// チャージショット：現在の武器の巨大ミノを貫通で発射
function fireChargeShot(g, p, w, lv, ratio) {
  const shape = w.key === 'R' ? SHAPES[pick(TETROMINO_KEYS)] : w.shape;
  const size = 24 + lv * 3 + ratio * 8;
  g.addBullet(new Bullet({ x: p.x + 60, y: p.y, vx: 430, dmg: 42 + lv * 16, size, shape, color: w.rainbow ? '#fff' : w.color, rainbow: !!w.rainbow, kind: 'spin', vr: 2.2, pierce: Infinity, life: 4, tick: 0.22, glow: true, big: true }));
  Sound.sfx.chargeShot(); g.shake(8);
  fxMinoBurst(g.particles, p.x + 60, p.y, w.rainbow ? '#fff' : w.color, 10);
}
// お供ミノの誘導ミサイル（弱めだが確実に当たる） / リアショット / ミサイル
function fireOptionMissile(g, x, y, color, lv) {
  g.addBullet(new Bullet({ x: x + 8, y, vx: 380, vy: rand(-120, 120), speed: 540 + lv * 15, dmg: 4 + lv * 1.5, size: 8, shape: SHAPES.M, color, kind: 'homing', turn: 5, life: 2.4, cute: true }));
}
function fireRearShot(g, p, color, lv) {
  for (const oy of [-8, 8]) g.addBullet(new Bullet({ x: p.x - 24, y: p.y + oy, vx: -800, vy: oy * 3, dmg: 4 + lv, size: 7, shape: SHAPES.D, color, vr: 8 }));
}
function fireMissiles(g, p, color, lv) {
  for (const s of [-1, 1]) g.addBullet(new Bullet({ x: p.x, y: p.y + s * 16, vx: 200, vy: s * 400, speed: 560, dmg: 7 + lv * 2, size: 7, shape: SHAPES.J, color, kind: 'homing', turn: 3.5, life: 2.2 }));
}
