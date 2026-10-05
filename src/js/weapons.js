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
          this.vy = -this.vy; this.bounces--; this.vx *= 1.1; this.vy *= 1.1; this.dmg += 1; this.hits.clear();
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
// 威力の方針：まっすぐ狙う武器ほど強く、広がる・追尾する・画面を覆う武器ほど弱い
const WEAPONS = [
  {
    key: 'I', name: 'ラインレーザー', en: 'LINE LASER', color: MINO_COLORS.I, shape: SHAPES.I, desc: 'まっすぐ貫通。狙いが要るぶん最強クラスの威力', tier: '高威力',
    cooldown: (lv) => (lv >= 5 ? 0.09 : 0.18 - lv * 0.012),
    fire(g, p, lv) {
      const n = lv >= 3 ? 2 : 1, offs = n === 1 ? [0] : [-7, 7]; // 2 本でも 1 体に両方当たる間隔
      for (const oy of offs) g.addBullet(new Bullet({ x: p.x + 34, y: p.y + oy, vx: 980, dmg: 9 + lv * 1.6, size: lv >= 5 ? 10 : 8, shape: SHAPES.I, color: this.color, pierce: 2 + lv, glow: true }));
    },
  },
  {
    key: 'O', name: 'ヘビーブロック', en: 'HEAVY BLOCK', color: MINO_COLORS.O, shape: SHAPES.O, desc: '遅いが一撃が重く、着弾で小さく爆発', tier: '高威力',
    cooldown: (lv) => 0.55 - lv * 0.04,
    fire(g, p, lv) {
      const n = lv >= 5 ? 2 : 1, offs = n === 1 ? [0] : [-14, 14];
      for (const oy of offs) g.addBullet(new Bullet({ x: p.x + 30, y: p.y + oy, vx: 460, dmg: 22 + lv * 5, size: 11 + lv, shape: SHAPES.O, color: this.color, kind: 'heavy', blast: 40 + lv * 6, vr: 3 }));
    },
  },
  {
    key: 'T', name: 'トライスプレッド', en: 'TRI SPREAD', color: MINO_COLORS.T, shape: SHAPES.T, desc: '細い扇状に広がる。1 発は軽め', tier: '範囲',
    cooldown: (lv) => 0.21 - lv * 0.01,
    fire(g, p, lv) {
      const n = [3, 3, 4, 4, 5][lv - 1], spread = 0.11, sp = 820;
      for (let i = 0; i < n; i++) {
        const a = (i - (n - 1) / 2) * spread;
        g.addBullet(new Bullet({ x: p.x + 28, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 3.4 + lv * 0.75, size: 7, shape: SHAPES.T, color: this.color, rot: a, vr: 7 }));
      }
    },
  },
  {
    key: 'S', name: 'ウェーブ', en: 'WAVE', color: MINO_COLORS.S, shape: SHAPES.S, desc: 'うねって広めにカバー。威力は中くらい', tier: '範囲',
    cooldown: (lv) => 0.2 - lv * 0.01,
    fire(g, p, lv) {
      const pairs = lv >= 4 ? 2 : 1;
      for (let j = 0; j < pairs; j++) {
        const amp = 20 + lv * 4 + j * 14;
        for (const ph of [0, Math.PI]) g.addBullet(new Bullet({ x: p.x + 28, y: p.y, vx: 700, dmg: 3 + lv * 0.75, size: 7, shape: SHAPES.S, color: this.color, kind: 'wave', amp, freq: 9, phase: ph, pierce: 1 }));
      }
    },
  },
  {
    key: 'Z', name: 'リコシェ', en: 'RICOCHET', color: MINO_COLORS.Z, shape: SHAPES.Z, desc: '上下で跳ね返る。跳ねるたび少しだけ強化', tier: '範囲',
    cooldown: (lv) => 0.26 - lv * 0.012,
    fire(g, p, lv) {
      const angs = lv < 3 ? [-0.45, 0.45] : lv < 5 ? [-0.55, -0.2, 0.2, 0.55] : [-0.6, -0.3, 0, 0.3, 0.6], sp = 720;
      for (const a of angs) g.addBullet(new Bullet({ x: p.x + 28, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 3.8 + lv * 0.6, size: 8, shape: SHAPES.Z, color: this.color, kind: 'bounce', bounces: 2 + lv, vr: 9, life: 4 }));
    },
  },
  {
    key: 'J', name: 'ホーミング', en: 'HOMING', color: MINO_COLORS.J, shape: SHAPES.J, desc: '必ず追いかけるぶん威力は低め', tier: '自動',
    cooldown: (lv) => 0.3 - lv * 0.012,
    fire(g, p, lv) {
      const n = [1, 1, 2, 2, 3][lv - 1];
      for (let i = 0; i < n; i++) {
        const a = n === 1 ? 0 : (i - (n - 1) / 2) * 0.8;
        g.addBullet(new Bullet({ x: p.x + 26, y: p.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, speed: 600 + lv * 15, dmg: 2.2 + lv * 0.5, size: 8, shape: SHAPES.J, color: this.color, kind: 'homing', turn: 3 + lv * 0.6, life: 2.4 }));
      }
    },
  },
  {
    key: 'L', name: 'シャッター', en: 'SHATTER', color: MINO_COLORS.L, shape: SHAPES.L, desc: '本体は中威力、飛び散る破片は軽め', tier: '範囲',
    cooldown: (lv) => 0.34 - lv * 0.02,
    fire(g, p, lv) {
      g.addBullet(new Bullet({ x: p.x + 28, y: p.y, vx: 620, dmg: 8 + lv * 2, size: 9, shape: SHAPES.L, color: this.color, kind: 'split', frags: [4, 5, 6, 6, 8][lv - 1], fragDmg: 1.5 + lv * 0.4, splitTime: 0.7, vr: 5 }));
    },
  },
  {
    key: 'M', name: 'マシンガン', en: 'MACHINE GUN', color: MINO_COLORS.M, shape: SHAPES.M, desc: '一直線に高速連射。当て続ければ最強', tier: '高威力',
    cooldown: (lv) => 0.075 - lv * 0.006,
    fire(g, p, lv) {
      const n = lv >= 4 ? 2 : 1, offs = n === 1 ? [0] : [-6, 6];
      for (const oy of offs) g.addBullet(new Bullet({ x: p.x + 30, y: p.y + oy, vx: 1050, vy: rand(-25, 25), dmg: 4.5 + lv * 0.7, size: 7, shape: SHAPES.M, color: this.color, rot: rand(TAU), vr: 15 }));
    },
  },
  {
    key: 'P', name: 'スピンクロス', en: 'SPIN CROSS', color: MINO_COLORS.P, shape: SHAPES.P, desc: '回転しながら貫通。広く当たるぶん一撃は軽い', tier: '自動',
    cooldown: (lv) => 0.6 - lv * 0.04,
    fire(g, p, lv) {
      const n = lv >= 5 ? 2 : 1, offs = n === 1 ? [0] : [-34, 34];
      for (const oy of offs) g.addBullet(new Bullet({ x: p.x + 36, y: p.y + oy, vx: 390, dmg: 1.9 + lv * 0.45, size: 10 + lv, shape: SHAPES.P, color: this.color, kind: 'spin', vr: 9, pierce: Infinity, life: 3, tick: 0.15, glow: true }));
    },
  },
  {
    key: 'R', name: 'テトロレイン', en: 'TETRO RAIN', color: MINO_COLORS.D, shape: SHAPES.T, rainbow: true, desc: '前方の空から降る。手軽なぶん威力は低め', tier: '自動',
    cooldown: (lv) => 0.36 - lv * 0.025,
    fire(g, p, lv) {
      const n = [1, 1, 2, 2, 3][lv - 1];
      for (let i = 0; i < n; i++) {
        const k = pick(TETROMINO_KEYS);
        g.addBullet(new Bullet({ x: p.x + rand(110, 460), y: -30 - rand(60), vx: rand(20, 90), vy: rand(100, 300), gravity: 1500, dmg: 6 + lv * 1.5, size: 10, shape: SHAPES[k], color: MINO_COLORS[k], kind: 'rain', pierce: 1, vr: rand(-4, 4), life: 3 }));
      }
    },
  },
];
const WEAPON_INDEX = {}; WEAPONS.forEach((w, i) => (WEAPON_INDEX[w.key] = i));

// チャージショット：現在の武器の巨大ミノを貫通で発射
function fireChargeShot(g, p, w, lv, ratio) {
  const shape = w.key === 'R' ? SHAPES[pick(TETROMINO_KEYS)] : w.shape;
  const size = 24 + lv * 3 + ratio * 8;
  g.addBullet(new Bullet({ x: p.x + 60, y: p.y, vx: 430, dmg: 22 + lv * 7, size, shape, color: w.rainbow ? '#fff' : w.color, rainbow: !!w.rainbow, kind: 'spin', vr: 2.2, pierce: Infinity, life: 4, tick: 0.25, glow: true, big: true }));
  Sound.sfx.chargeShot(); g.shake(8);
  fxMinoBurst(g.particles, p.x + 60, p.y, w.rainbow ? '#fff' : w.color, 10);
}
// お供ミノの誘導ミサイル（弱めだが確実に当たる） / リアショット / ミサイル
function fireOptionMissile(g, x, y, color, lv) {
  g.addBullet(new Bullet({ x: x + 8, y, vx: 380, vy: rand(-120, 120), speed: 540 + lv * 15, dmg: 2 + lv * 0.5, size: 8, shape: SHAPES.M, color, kind: 'homing', turn: 5, life: 2.4, cute: true }));
}
function fireRearShot(g, p, color, lv) {
  for (const oy of [-8, 8]) g.addBullet(new Bullet({ x: p.x - 24, y: p.y + oy, vx: -800, vy: oy * 3, dmg: 3 + lv * 0.6, size: 7, shape: SHAPES.D, color, vr: 8 }));
}
function fireMissiles(g, p, color, lv) {
  for (const s of [-1, 1]) g.addBullet(new Bullet({ x: p.x, y: p.y + s * 16, vx: 200, vy: s * 400, speed: 560, dmg: 2.2 + lv * 0.6, size: 7, shape: SHAPES.J, color, kind: 'homing', turn: 3.5, life: 2.2 }));
}
