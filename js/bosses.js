'use strict';
// ===== ボス =====
ENEMY_TYPES.bossBase = { hp: 1, r: 70, speed: 0, score: 0, noChain: true, update() {} };

const BOSS_DEFS = [
  { name: 'プヨキング', en: 'PUYO KING', hp: 2300, r: 70, color: 0, deco: 'crown', score: 10000 },
  { name: 'プヨクラゲ', en: 'JELLY PUYO', hp: 3300, r: 66, color: 2, deco: 'jelly', score: 15000, parts: { n: 6, rad: 120, spin: 0.9 } },
  { name: 'キツネプヨ', en: 'FOX PUYO', hp: 3600, r: 64, color: 3, deco: 'fox', score: 18000, parts: { n: 5, rad: 112, spin: 1.3 } },
  { name: 'ネオンツインズ', en: 'NEON TWINS', hp: 2000, r: 50, color: [4, 1], deco: 'neon', score: 10000, twins: true },
  { name: 'マグマプヨ', en: 'MAGMA PUYO', hp: 4400, r: 74, color: 0, deco: 'magma', score: 24000, armor: 1100 },
  { name: 'クリスタルプヨ', en: 'CRYSTAL PUYO', hp: 4600, r: 72, color: 4, deco: 'crystal', score: 25000, armor: 1300, parts: { n: 4, rad: 125, spin: -0.6 } },
  { name: 'ユキダルマプヨ', en: 'SNOWMAN PUYO', hp: 5200, r: 70, color: 2, deco: 'snow', score: 30000, parts: { n: 5, rad: 132, spin: -0.8 } },
  { name: 'テトロオーバーロード', en: 'TETRO OVERLORD', hp: 7200, r: 86, color: 4, deco: 'overlord', score: 50000, minoArmor: 8 },
];

// 攻撃パターン生成
const ATK = {
  wait: (dur) => ({ dur, tick() {} }),
  aimed: (n, interval, speed, spread = 0.2, dur = 3) => ({ dur, start(b) { b.acc = interval * 0.5; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval) { b.acc -= interval; b.shootAimed(g, speed, n, spread); } } }),
  ring: (n, speed, times = 3, interval = 0.8, kind) => ({ dur: times * interval + 0.4, start(b) { b.acc = interval * 0.6; b.cnt = 0; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval && b.cnt < times) { b.acc -= interval; b.cnt++; b.shootRing(g, n, speed, b.cnt * 0.33 + b.t, { kind }); b.squash = 0.3; } } }),
  spiral: (dur, rate, speed, turn, arms = 2) => ({ dur, start(b) { b.acc = 0; b.sang = 0; }, tick(b, dt, g) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; b.sang += turn; for (let i = 0; i < arms; i++) b.shoot(g, b.sang + (i / arms) * TAU, speed); } } }),
  homingBurst: (n, speed, times = 2, interval = 1.2) => ({ dur: times * interval + 0.6, start(b) { b.acc = interval * 0.5; b.cnt = 0; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval && b.cnt < times) { b.acc -= interval; b.cnt++; for (let i = 0; i < n; i++) b.shoot(g, Math.PI + (i - (n - 1) / 2) * 0.35, speed, { kind: 'big', homing: 1.3, life: 5 }); Sound.sfx.enemyShot(); } } }),
  curtain: (speed = 260, times = 3, interval = 1.3, gapH = 110) => ({ dur: times * interval + 0.6, start(b) { b.acc = interval * 0.5; b.cnt = 0; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval && b.cnt < times) { b.acc -= interval; b.cnt++; const gapY = g.player.y + rand(-30, 30); for (let y = 60; y < H; y += 34) if (Math.abs(y - gapY) > gapH / 2) g.addEBullet(new EBullet(b.x - b.r, y, -speed * g.diff.bspeed, 0, { color: b.color })); Sound.sfx.enemyShot(); b.squash = 0.3; } } }),
  rainNeedles: (dur = 3, rate = 0.12, speed = 380) => ({ dur, start(b) { b.acc = 0; }, tick(b, dt, g) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; g.addEBullet(new EBullet(rand(60, W - 40), -10, rand(-70, -20), speed * g.diff.bspeed, { color: b.color, kind: 'needle' })); } } }),
  sweep: (dur = 2.6, rate = 0.05, speed = 420) => ({ dur, start(b) { b.acc = 0; }, tick(b, dt, g, t) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; const a = Math.PI + Math.sin(t * 2.4) * 0.75; b.shoot(g, a, speed, { kind: 'needle' }); } } }),
  dash: (speed = 700) => ({
    dur: 3.4, noMove: true, start(b) { b.dstate = 0; },
    tick(b, dt, g, t) {
      if (b.dstate === 0) { b.y += clamp(g.player.y - b.y, -320 * dt, 320 * dt); b.squash = Math.sin(t * 30) * 0.07; b.angry = true; if (t > 0.9) { b.dstate = 1; } }
      else if (b.dstate === 1) { b.x -= speed * dt; g.particles.add({ type: 'circle', x: b.x + b.r, y: b.y + rand(-b.r, b.r), size: 8, color: puyoColor(b.color).light, life: 0.3, shrink: true }); if (b.x < -140) { b.dstate = 2; b.x = W + 160; b.y = rand(140, H - 120); } }
      else { b.x += (b.homeX - b.x) * 3 * dt; b.angry = b.phase >= 2; }
    },
  }),
  bounce: (dur = 4, speed = 320, n = 3) => ({
    dur, noMove: true, start(b) { b.vy = speed; },
    tick(b, dt, g) {
      b.y += b.vy * dt;
      if (b.y < 64 + b.r) { b.y = 64 + b.r; b.vy = Math.abs(b.vy); b.shootAimed(g, 220, n, 0.3); b.squash = 0.3; }
      if (b.y > H - 20 - b.r) { b.y = H - 20 - b.r; b.vy = -Math.abs(b.vy); b.shootAimed(g, 220, n, 0.3); b.squash = 0.3; }
      b.x += (b.homeX - b.x) * 2 * dt;
    },
  }),
  summon: (type, n, o = {}) => ({
    dur: 1.4, start(b, g) {
      b.squash = 0.35;
      for (let i = 0; i < n; i++) {
        const y = o.spread ? 90 + (i / Math.max(1, n - 1)) * (H - 180) : rand(90, H - 70);
        const e = new Enemy(type, W + 40 + i * 50, y, { color: o.sameColor ? b.color : randInt(0, 4), dir: i % 2 ? 1 : -1 });
        g.spawnEnemy(e);
      }
      g.texts.add(b.x, b.y - b.r - 30, 'おいで〜！', '#fff', 18, { pop: true });
    }, tick() {},
  }),
  formation: () => ({
    dur: 1.6, start(b, g) {
      const shape = SHAPES[pick(TETROMINO_KEYS)], color = randInt(0, 4), cy = rand(120, H - 140), phase = rand(TAU);
      for (const [sx, sy] of shape) g.spawnEnemy(new Enemy('cluster', W + 80 + sx * 44, cy + sy * 44, { color, phase, amp: 20, speed: 150 }));
      b.squash = 0.35;
    }, tick() {},
  }),
  bouncers: (n, speed, times = 2, interval = 1) => ({ dur: times * interval + 0.5, start(b) { b.acc = interval * 0.5; b.cnt = 0; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval && b.cnt < times) { b.acc -= interval; b.cnt++; const base = Math.atan2(g.player.y - b.y, g.player.x - b.x); for (let i = 0; i < n; i++) b.shoot(g, base + (i - (n - 1) / 2) * 0.4, speed, { bounces: 2, life: 6 }); Sound.sfx.enemyShot(); b.squash = 0.3; } } }),
  crossSpiral: (dur, rate, speed, turn) => ({ dur, start(b) { b.acc = 0; b.sang = 0; }, tick(b, dt, g) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; b.sang += turn; b.shoot(g, b.sang, speed); b.shoot(g, Math.PI - b.sang, speed); } } }),
  movingCurtain: (dur, speed = 250, rate = 0.45) => ({ dur, start(b) { b.acc = 0; }, tick(b, dt, g, t) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; const gapY = H / 2 + Math.sin(t * 1.6) * 170; for (let y = 60; y < H; y += 36) if (Math.abs(y - gapY) > 60) g.addEBullet(new EBullet(b.x - b.r, y, -speed * g.diff.bspeed, 0, { color: b.color })); } } }),
  rotatingFan: (dur, rate, speed, n = 5) => ({ dur, start(b) { b.acc = 0; }, tick(b, dt, g, t) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; const base = Math.PI + Math.sin(t * 1.5) * 0.9; for (let i = 0; i < n; i++) b.shoot(g, base + (i - (n - 1) / 2) * 0.25, speed); } } }),
  mines: (n) => ({ dur: 1.2, start(b, g) { for (let i = 0; i < n; i++) g.spawnEnemy(new Enemy('mine', rand(260, 650), rand(90, H - 70), { color: randInt(0, 4) })); g.texts.add(b.x, b.y - b.r - 30, 'ばくだん！', '#fff', 18, { pop: true }); b.squash = 0.35; }, tick() {} }),
  waveShots: (dur, rate, speed) => ({ dur, start(b) { b.acc = 0; }, tick(b, dt, g) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; const a = Math.atan2(g.player.y - b.y, g.player.x - b.x); b.shoot(g, a, speed, { amp: 45, freq: 7 }); b.shoot(g, a, speed, { amp: -45, freq: 7 }); } } }),
  gravArc: (times, n, interval = 0.9) => ({ dur: times * interval + 0.8, start(b) { b.acc = interval * 0.4; b.cnt = 0; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval && b.cnt < times) { b.acc -= interval; b.cnt++; for (let i = 0; i < n; i++) g.addEBullet(new EBullet(b.x, b.y, -(120 + i * 70) * g.diff.bspeed, -(380 + rand(-40, 40)) * g.diff.bspeed, { color: b.color, grav: 520, life: 6, kind: 'big' })); Sound.sfx.enemyShot(); b.squash = 0.3; } } }),
  needleRows: (times, interval = 0.7, speed = 380) => ({ dur: times * interval + 0.6, start(b) { b.acc = interval * 0.5; b.cnt = 0; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval && b.cnt < times) { b.acc -= interval; b.cnt++; const off = (b.cnt % 2) * 40; for (let y = 70 + off; y < H; y += 80) g.addEBullet(new EBullet(W + 20, y, -speed * g.diff.bspeed, 0, { color: b.color, kind: 'needle' })); Sound.sfx.enemyShot(); } } }),
  homingRing: (n, speed, times = 2, interval = 1.4) => ({ dur: times * interval + 0.8, start(b) { b.acc = interval * 0.5; b.cnt = 0; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval && b.cnt < times) { b.acc -= interval; b.cnt++; b.shootRing(g, n, speed, b.t, { homing: 0.7, life: 5 }); b.squash = 0.3; } } }),
  emberRain: (dur = 3, rate = 0.12) => ({ dur, start(b) { b.acc = 0; }, tick(b, dt, g) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; g.addEBullet(new EBullet(rand(60, W - 40), H + 10, rand(-80, 20), -(420 + rand(0, 160)) * g.diff.bspeed, { color: b.color, grav: 520, life: 6 })); } } }),
  geyser: (times = 3, interval = 1.1) => ({ dur: times * interval + 0.8, start(b) { b.acc = interval * 0.5; b.cnt = 0; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval && b.cnt < times) { b.acc -= interval; b.cnt++; const x = g.player.x + rand(-60, 140); for (let i = 0; i < 9; i++) g.addEBullet(new EBullet(x + rand(-8, 8), H + 20 + i * 26, 0, -(380 + i * 10) * g.diff.bspeed, { color: b.color, kind: 'needle', life: 4 })); g.texts.add(x, H - 30, '！', '#FFB347', 26, { pop: true, life: 0.6 }); Sound.sfx.enemyShot(); } } }),
  snowballs: (times = 3, n = 3, interval = 1) => ({ dur: times * interval + 0.8, start(b) { b.acc = interval * 0.5; b.cnt = 0; }, tick(b, dt, g) { b.acc += dt; if (b.acc >= interval && b.cnt < times) { b.acc -= interval; b.cnt++; const base = Math.atan2(g.player.y - b.y, g.player.x - b.x); for (let i = 0; i < n; i++) b.shoot(g, base + (i - (n - 1) / 2) * 0.3, 150, { kind: 'big', r: 16, accel: 60, life: 6 }); Sound.sfx.enemyShot(); b.squash = 0.35; } } }),
  blizzard: (dur = 3, rate = 0.3, speed = 300) => ({ dur, start(b) { b.acc = 0; }, tick(b, dt, g) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; const y = rand(60, H - 20); g.addEBullet(new EBullet(W + 20, y, -speed * g.diff.bspeed, 0, { color: b.color, kind: 'needle', amp: rand(20, 50), freq: 5, life: 5 })); } } }),
  minoDrop: (dur = 3, rate = 0.35) => ({ dur, start(b) { b.acc = 0; }, tick(b, dt, g) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; g.addEBullet(new EBullet(rand(100, W - 60), -20, -40, 120 * g.diff.bspeed, { color: b.color, kind: 'big', accel: 260, life: 6 })); } } }),
};

const BOSS_ATTACKS = [
  [ // 1 プヨキング
    [ATK.aimed(1, 0.55, 220, 0, 3), ATK.bounce(4, 300, 3), ATK.summon('drift', 4, { sameColor: true, spread: true }), ATK.ring(10, 170, 2, 1), ATK.gravArc(2, 3), ATK.waveShots(2.5, 0.5, 200)],
    [ATK.aimed(3, 0.5, 250, 0.25, 3), ATK.dash(680), ATK.ring(14, 190, 3, 0.7), ATK.bounce(4, 400, 5), ATK.formation(), ATK.bouncers(3, 230, 2, 1), ATK.rotatingFan(3, 0.25, 200, 3), ATK.gravArc(3, 4)],
  ],
  [ // 2 プヨクラゲ
    [ATK.ring(12, 180, 3, 0.9), ATK.aimed(5, 0.8, 200, 0.18, 3), ATK.homingBurst(4, 160, 2, 1.2), ATK.summon('bouncer', 3, { sameColor: true }), ATK.waveShots(3, 0.4, 210), ATK.gravArc(3, 4), ATK.bouncers(3, 220, 2, 1)],
    [ATK.spiral(3, 0.09, 200, 0.35, 2), ATK.ring(16, 200, 3, 0.7), ATK.curtain(240, 3, 1.4), ATK.summon('bouncer', 4), ATK.homingBurst(6, 170, 2, 1), ATK.crossSpiral(3, 0.1, 190, 0.3), ATK.movingCurtain(3.5, 230, 0.5), ATK.mines(4)],
  ],
  [ // 3 キツネプヨ：狐火と素早い動き
    [ATK.homingRing(8, 140, 2, 1.4), ATK.aimed(3, 0.45, 260, 0.22, 3), ATK.dash(720), ATK.waveShots(3, 0.4, 220), ATK.summon('looper', 3), ATK.rotatingFan(3, 0.22, 220, 5)],
    [ATK.homingRing(12, 160, 2, 1.2), ATK.dash(800), ATK.spiral(3, 0.09, 210, 0.45, 2), ATK.bouncers(4, 240, 2, 0.9), ATK.summon('diver', 3), ATK.crossSpiral(3, 0.09, 200, 0.35), ATK.needleRows(4, 0.6, 400), ATK.mines(3)],
  ],
  [ // 4 ネオンツインズ
    [ATK.aimed(1, 0.3, 300, 0, 3), ATK.sweep(2.6), ATK.curtain(300, 2, 1.5, 120), ATK.dash(760), ATK.needleRows(4, 0.7, 380), ATK.bouncers(2, 260, 2, 0.9), ATK.waveShots(2.5, 0.35, 240)],
    [ATK.spiral(3, 0.08, 230, 0.5, 1), ATK.aimed(3, 0.35, 320, 0.2, 3), ATK.sweep(3, 0.04), ATK.summon('homer', 3), ATK.dash(820), ATK.rotatingFan(3, 0.18, 260, 5), ATK.crossSpiral(3, 0.08, 220, 0.4), ATK.movingCurtain(3, 300, 0.4), ATK.needleRows(5, 0.55, 420)],
  ],
  [ // 5 マグマプヨ：火山弾と間欠泉
    [ATK.emberRain(3, 0.14), ATK.geyser(3, 1.2), ATK.aimed(5, 0.7, 230, 0.16, 3), ATK.ring(14, 180, 3, 0.8), ATK.gravArc(3, 5), ATK.summon('bomber', 3), ATK.rotatingFan(3, 0.2, 230, 5)],
    [ATK.emberRain(4, 0.09), ATK.geyser(4, 0.9), ATK.spiral(3, 0.08, 220, 0.5, 3), ATK.curtain(270, 3, 1.2), ATK.homingBurst(5, 170, 2, 1.1), ATK.mines(4), ATK.crossSpiral(3, 0.08, 210, 0.45), ATK.bouncers(4, 250, 2, 1), ATK.summon('dasher', 3)],
  ],
  [ // 6 クリスタルプヨ
    [ATK.rainNeedles(3, 0.14, 340), ATK.ring(14, 190, 3, 0.8), ATK.aimed(5, 0.7, 220, 0.15, 3), ATK.spiral(3, 0.1, 190, 0.4, 3), ATK.gravArc(3, 5), ATK.waveShots(3, 0.35, 200), ATK.mines(3), ATK.bouncers(3, 240, 2, 1)],
    [ATK.rainNeedles(4, 0.09, 380), ATK.curtain(260, 3, 1.2), ATK.homingBurst(6, 170, 2, 1.2), ATK.ring(20, 210, 3, 0.6), ATK.summon('ojama', 2), ATK.spiral(3, 0.08, 210, 0.6, 4), ATK.bouncers(4, 240, 2, 1), ATK.crossSpiral(3.5, 0.07, 200, 0.5), ATK.needleRows(5, 0.6, 420), ATK.movingCurtain(3.5, 260, 0.45)],
  ],
  [ // 7 ユキダルマプヨ：雪玉と吹雪
    [ATK.snowballs(3, 3, 1), ATK.blizzard(3, 0.3, 300), ATK.rainNeedles(3, 0.12, 360), ATK.ring(16, 180, 3, 0.8), ATK.aimed(5, 0.6, 240, 0.15, 3), ATK.summon('ricochet', 2), ATK.waveShots(3, 0.3, 220), ATK.homingRing(8, 150, 2, 1.3)],
    [ATK.snowballs(4, 5, 0.9), ATK.blizzard(4, 0.18, 340), ATK.spiral(3.5, 0.07, 230, 0.5, 3), ATK.movingCurtain(3.5, 280, 0.4), ATK.gravArc(4, 5, 0.8), ATK.summon('waver', 3), ATK.crossSpiral(3, 0.07, 220, 0.4), ATK.needleRows(5, 0.55, 440), ATK.mines(4), ATK.dash(760)],
  ],
  [ // 8 テトロオーバーロード
    [ATK.spiral(3.5, 0.07, 230, 0.3, 3), ATK.aimed(7, 0.6, 260, 0.14, 3), ATK.formation(), ATK.curtain(300, 3, 1.1), ATK.homingBurst(6, 190, 3, 1), ATK.minoDrop(3, 0.4), ATK.rotatingFan(3, 0.15, 250, 7), ATK.waveShots(3, 0.3, 220), ATK.bouncers(5, 250, 2, 0.9), ATK.gravArc(3, 5), ATK.geyser(3, 1.1)],
    [ATK.dash(820), ATK.spiral(4, 0.06, 250, 0.55, 4), ATK.rainNeedles(3, 0.08, 420), ATK.ring(24, 220, 3, 0.55), ATK.curtain(320, 4, 1, 100), ATK.aimed(9, 0.5, 280, 0.12, 3), ATK.summon('dasher', 3), ATK.minoDrop(3, 0.25), ATK.formation(), ATK.crossSpiral(4, 0.06, 240, 0.45), ATK.movingCurtain(4, 320, 0.35), ATK.gravArc(4, 6, 0.7), ATK.needleRows(6, 0.5, 460), ATK.mines(5), ATK.snowballs(3, 5, 0.9), ATK.emberRain(3, 0.1), ATK.homingRing(12, 170, 2, 1.1)],
  ],
];

class Boss extends Enemy {
  constructor(g, stage, twinIndex = -1) {
    const def = BOSS_DEFS[stage];
    const color = Array.isArray(def.color) ? def.color[Math.max(0, twinIndex)] : def.color;
    super('bossBase', W + 180, H / 2, { color });
    this.g = g; this.stage = stage; this.bdef = def; this.name = def.name; this.isBoss = true; this.entered = true; this.noChain = true;
    this.r = def.r; this.twinIndex = twinIndex; this.twin = null;
    this.maxHp = def.hp * g.diff.hp; this.hp = this.maxHp; this.score = def.score;
    this.homeX = twinIndex >= 0 ? 760 : 740; this.baseY = twinIndex >= 0 ? (twinIndex === 0 ? H / 2 - 120 : H / 2 + 120) : H / 2;
    this.y = this.baseY; this.state = 'enter'; this.phase = 1; this.attack = null; this.attackIdx = twinIndex > 0 ? 2 : 0; this.attackT = 0; this.attacks = BOSS_ATTACKS[stage][0];
    this.armorMax = def.armor ? def.armor * g.diff.hp : 0; this.armorHp = this.armorMax; this.exposedT = 0;
    this.partTimer = 0; this.deadT = 0; this.acc = 0; this.hitSfx = 0;
  }
  summonParts(g) {
    const pd = this.bdef.parts;
    if (pd) {
      for (let i = 0; i < pd.n; i++) g.spawnEnemy(new Enemy('part', this.x, this.y, { boss: this, ang: (i / pd.n) * TAU, rad: pd.rad, spin: pd.spin, color: this.color }));
    }
    if (this.bdef.minoArmor) {
      for (let i = 0; i < this.bdef.minoArmor; i++) {
        const k = pick(TETROMINO_KEYS);
        g.spawnEnemy(new Enemy('minoPart', this.x, this.y, { boss: this, ang: (i / this.bdef.minoArmor) * TAU, rad: this.r + 52, spin: 0.7, shape: SHAPES[k], minoColor: shade(MINO_COLORS[k], -0.25) }));
      }
    }
  }
  livingParts(g) { return g.enemies.filter((e) => e.boss === this && !e.dead).length; }
  enterPhase2(g) {
    this.phase = 2; this.angry = true; this.attacks = BOSS_ATTACKS[this.stage][1]; this.attack = null; this.attackIdx = 0;
    g.texts.add(this.x, this.y - this.r - 40, 'おこった！！', '#FF5E7A', 30, { pop: true, life: 1.4 });
    g.shake(10); Sound.sfx.warning();
    g.particles.add({ type: 'ring', x: this.x, y: this.y, size: this.r * 4, color: '#fff', life: 0.6, lw: 8 });
    this.summonParts(g);
  }
  takeDamage(dmg, g) {
    if (this.dead || this.state === 'enter') return;
    let d = dmg * (g.dmgMul || 1);
    if (this.armorMax > 0) {
      if (this.armorHp > 0) {
        this.armorHp -= d; d *= 0.12;
        if (this.armorHp <= 0) { this.exposedT = 9; g.texts.add(this.x, this.y - this.r - 40, 'アーマーブレイク！', '#D8B4FF', 28, { pop: true }); fxMinoBurst(g.particles, this.x, this.y, '#D8B4FF', 24); Sound.sfx.explode(1.2); g.shake(10); }
      }
    }
    this.hp -= d; this.hitFlash = 0.08; this.squash = 0.12;
    if (this.hitSfx <= 0) { Sound.sfx.bossHit(); this.hitSfx = 0.08; }
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.deadT = 0; }
  }
  update(dt, g) {
    const d = dt * g.enemyTime;
    this.t += d; this.hitFlash -= dt; this.hitSfx -= dt; this.squash *= Math.max(0, 1 - 8 * dt);
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.12 : rand(2, 5); }
    if (g.player.alive) { const dx = g.player.x - this.x, dy = g.player.y - this.y, l = Math.hypot(dx, dy) || 1; this.eyeDir.x = dx / l; this.eyeDir.y = dy / l; }
    if (this.dead) { this.deadT += dt; this.x += rand(-4, 4); this.y += rand(-4, 4); return; }
    if (this.state === 'enter') {
      this.x += (this.homeX - this.x) * 1.6 * dt;
      if (Math.abs(this.x - this.homeX) < 6) { this.state = 'fight'; this.summonParts(g); }
      return;
    }
    if (this.phase === 1 && (this.hp < this.maxHp * 0.5 || (this.twin && this.twin.dead))) this.enterPhase2(g);
    // アーマー再生
    if (this.armorMax > 0 && this.armorHp <= 0) { this.exposedT -= dt; if (this.exposedT <= 0) { this.armorHp = this.armorMax * 0.7; g.texts.add(this.x, this.y - this.r - 40, 'アーマー再生', '#D8B4FF', 20); } }
    // お供再召喚
    if ((this.bdef.parts || this.bdef.minoArmor) && this.livingParts(g) === 0) { this.partTimer += dt; if (this.partTimer > 9) { this.partTimer = 0; this.summonParts(g); } }
    // 攻撃
    if (!this.attack) {
      const cands = this.attacks.filter((a) => a !== this.lastAttack);
      this.attack = this.attackIdx < 2 ? this.attacks[this.attackIdx] : pick(cands);
      this.lastAttack = this.attack; this.attackIdx++; this.attackT = 0;
      if (this.attack.start) this.attack.start(this, g);
    }
    this.attackT += d;
    this.attack.tick(this, d, g, this.attackT);
    if (this.attackT > this.attack.dur) this.attack = null;
    if (!this.attack || !this.attack.noMove) {
      const spd = this.phase === 2 ? 1.5 : 1;
      const ty = this.baseY + Math.sin(this.t * 0.8 * spd) * (this.twinIndex >= 0 ? 70 : 150);
      const tx = this.homeX + Math.cos(this.t * 0.5 * spd) * 40;
      this.x += (tx - this.x) * 1.5 * dt; this.y += (ty - this.y) * 1.5 * dt;
    }
    this.y = clamp(this.y, 50 + this.r * 0.6, H - this.r * 0.6);
  }
  draw(ctx, g) {
    const col = puyoColor(this.color, g.time), t = this.t, deco = this.bdef.deco;
    const o = { t, eyeDir: this.eyeDir, blink: this.blink, flash: this.hitFlash, squash: this.squash, angry: this.angry || deco === 'overlord', dizzy: this.dead };
    if (deco === 'overlord') {
      const gr = ctx.createRadialGradient(this.x, this.y, this.r * 0.5, this.x, this.y, this.r * 2.2);
      gr.addColorStop(0, 'rgba(120,40,200,0.45)'); gr.addColorStop(1, 'rgba(60,0,120,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 2.2, 0, TAU); ctx.fill();
    }
    if (deco === 'neon') o.glow = 30;
    if (deco === 'fox') { // 狐火のオーラ
      ctx.save(); ctx.globalAlpha = 0.5; for (let i = 0; i < 3; i++) { const a = t * 1.4 + i * 2.1, fx = this.x + Math.cos(a) * this.r * 1.25, fy = this.y + Math.sin(a) * this.r * 0.9; const fg = ctx.createRadialGradient(fx, fy, 2, fx, fy, 26); fg.addColorStop(0, 'rgba(120,230,255,0.9)'); fg.addColorStop(1, 'rgba(120,230,255,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx, fy, 26, 0, TAU); ctx.fill(); } ctx.restore();
      for (const sgn of [-1, 1]) { ctx.fillStyle = col.main; ctx.beginPath(); ctx.moveTo(this.x + sgn * this.r * 0.45, this.y - this.r * 0.75); ctx.lineTo(this.x + sgn * this.r * 0.85, this.y - this.r * 1.45); ctx.lineTo(this.x + sgn * this.r * 0.95, this.y - this.r * 0.6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(this.x + sgn * this.r * 0.58, this.y - this.r * 0.78); ctx.lineTo(this.x + sgn * this.r * 0.83, this.y - this.r * 1.25); ctx.lineTo(this.x + sgn * this.r * 0.88, this.y - this.r * 0.68); ctx.closePath(); ctx.fill(); }
    }
    if (deco === 'magma') { // 溶岩のしずく
      for (let i = 0; i < 4; i++) { const dx = (i - 1.5) * this.r * 0.45, k = (t * 0.7 + i * 0.37) % 1; ctx.fillStyle = '#FF8A1A'; ctx.beginPath(); ctx.ellipse(this.x + dx, this.y + this.r * 0.8 + k * 36, 5, 8 + k * 6, 0, 0, TAU); ctx.fill(); }
    }
    if (deco === 'jelly') {
      ctx.save(); ctx.strokeStyle = col.main; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
      for (let i = 0; i < 6; i++) {
        const bx = this.x + (i - 2.5) * this.r * 0.32, by = this.y + this.r * 0.7;
        const ph = t * 3 + i;
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.bezierCurveTo(bx + Math.sin(ph) * 20, by + 40, bx - Math.sin(ph * 1.3) * 25, by + 80, bx + Math.sin(ph * 0.7) * 18, by + 115);
        ctx.stroke();
        ctx.fillStyle = col.light; ctx.beginPath(); ctx.arc(bx + Math.sin(ph * 0.7) * 18, by + 115, 7, 0, TAU); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 0.92;
    }
    drawPuyo(ctx, this.x, this.y, this.r, col, o);
    ctx.globalAlpha = 1;
    if (deco === 'crown') {
      const cx = this.x, cy = this.y - this.r * 0.95;
      ctx.fillStyle = '#FFD84D'; ctx.beginPath(); ctx.moveTo(cx - 34, cy + 4); ctx.lineTo(cx - 36, cy - 30); ctx.lineTo(cx - 18, cy - 12); ctx.lineTo(cx, cy - 40); ctx.lineTo(cx + 18, cy - 12); ctx.lineTo(cx + 36, cy - 30); ctx.lineTo(cx + 34, cy + 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#C99A10'; ctx.lineWidth = 2.5; ctx.stroke();
      for (const [px, py, c] of [[-36, -30, '#FF5E7A'], [0, -40, '#4FA3FF'], [36, -30, '#5BE06A']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + px, cy + py, 5, 0, TAU); ctx.fill(); }
    }
    if (deco === 'neon') {
      ctx.save(); ctx.translate(this.x, this.y); ctx.fillStyle = 'rgba(20,10,40,0.9)'; roundRectPath(ctx, -this.r * 0.75, -this.r * 0.32, this.r * 1.5, this.r * 0.4, 8); ctx.fill();
      ctx.fillStyle = this.twinIndex === 0 ? '#FF5EDB' : '#5EF0FF'; ctx.globalAlpha = 0.8; roundRectPath(ctx, -this.r * 0.65, -this.r * 0.25, this.r * 0.5, this.r * 0.1, 4); ctx.fill(); ctx.restore();
    }
    if (deco === 'fox') { // 狐のお面（白地に赤い模様）
      ctx.save(); ctx.translate(this.x, this.y); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.moveTo(-this.r * 0.72, -this.r * 0.5); ctx.quadraticCurveTo(0, -this.r * 0.95, this.r * 0.72, -this.r * 0.5); ctx.quadraticCurveTo(this.r * 0.6, this.r * 0.15, 0, this.r * 0.5); ctx.quadraticCurveTo(-this.r * 0.6, this.r * 0.15, -this.r * 0.72, -this.r * 0.5); ctx.fill();
      ctx.strokeStyle = '#D9381E'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sgn * this.r * 0.5, -this.r * 0.55); ctx.lineTo(sgn * this.r * 0.3, -this.r * 0.35); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sgn * this.r * 0.55, this.r * 0.05); ctx.lineTo(sgn * this.r * 0.35, this.r * 0.2); ctx.stroke(); }
      ctx.fillStyle = '#2A1838'; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sgn * this.r * 0.3, -this.r * 0.12, this.r * 0.17, this.r * 0.07, sgn * 0.45, 0, TAU); ctx.fill(); }
      if (this.angry || this.dead) { ctx.strokeStyle = '#2A1838'; ctx.lineWidth = 3; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sgn * this.r * 0.5, -this.r * 0.3); ctx.lineTo(sgn * this.r * 0.15, -this.r * 0.2); ctx.stroke(); } }
      ctx.fillStyle = '#D9381E'; ctx.beginPath(); ctx.arc(0, this.r * 0.22, this.r * 0.08, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (deco === 'magma') { // 溶岩の殻（アーマー）とひび割れ
      if (this.armorHp > 0) {
        const k = this.armorHp / this.armorMax;
        ctx.save(); ctx.globalAlpha = 0.9; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.4, rr = this.r * (0.55 + (i % 3) * 0.14), sz = this.r * (0.26 + (i % 2) * 0.08) * (0.6 + 0.4 * k); ctx.fillStyle = '#3A1210'; ctx.beginPath(); ctx.arc(this.x + Math.cos(a) * rr, this.y + Math.sin(a) * rr, sz, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = `rgba(255,${120 + Math.sin(t * 6) * 60},40,0.9)`; ctx.lineWidth = 3; ctx.shadowColor = '#FF7A1A'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(this.x - this.r * 0.6, this.y - this.r * 0.2); ctx.lineTo(this.x - this.r * 0.25, this.y + this.r * 0.1); ctx.lineTo(this.x - this.r * 0.35, this.y + this.r * 0.5); ctx.moveTo(this.x + this.r * 0.5, this.y - this.r * 0.4); ctx.lineTo(this.x + this.r * 0.3, this.y); ctx.lineTo(this.x + this.r * 0.6, this.y + this.r * 0.35); ctx.stroke(); ctx.restore();
      } else { ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.2; ctx.strokeStyle = '#FFD27A'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 1.15, 0, TAU); ctx.stroke(); ctx.restore(); }
    }
    if (deco === 'snow') { // 雪だるま：頭・バケツ帽子・マフラー・にんじん鼻
      const hr = this.r * 0.55, hy = this.y - this.r - hr * 0.75;
      drawPuyo(ctx, this.x, hy, hr, col, { t, eyeDir: this.eyeDir, blink: this.blink, angry: this.angry, dizzy: this.dead, flash: this.hitFlash });
      ctx.fillStyle = '#FF8A3D'; ctx.beginPath(); ctx.moveTo(this.x - hr * 0.1, hy + hr * 0.15); ctx.lineTo(this.x - hr * 0.95, hy + hr * 0.3); ctx.lineTo(this.x - hr * 0.1, hy + hr * 0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#24407A'; ctx.beginPath(); ctx.moveTo(this.x - hr * 0.7, hy - hr * 0.75); ctx.lineTo(this.x + hr * 0.7, hy - hr * 0.75); ctx.lineTo(this.x + hr * 0.55, hy - hr * 1.6); ctx.lineTo(this.x - hr * 0.55, hy - hr * 1.6); ctx.closePath(); ctx.fill(); ctx.fillRect(this.x - hr * 0.85, hy - hr * 0.8, hr * 1.7, 6);
      ctx.fillStyle = '#E8384F'; roundRectPath(ctx, this.x - this.r * 0.8, this.y - this.r * 0.95, this.r * 1.6, 14, 7); ctx.fill(); ctx.fillRect(this.x + this.r * 0.3, this.y - this.r * 0.9, 14, this.r * 0.5);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#24407A'; ctx.beginPath(); ctx.arc(this.x, this.y - this.r * 0.35 + i * this.r * 0.38, 5, 0, TAU); ctx.fill(); }
    }
    if (deco === 'crystal' && this.armorHp > 0) {
      const k = this.armorHp / this.armorMax;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + t * 0.4, rr = this.r * 1.05, len = this.r * (0.45 + 0.35 * k) * (0.8 + 0.2 * Math.sin(t * 3 + i));
        const c = ['#B9F5E8', '#FFD0F0', '#D8C8FF'][i % 3];
        ctx.save(); ctx.translate(this.x + Math.cos(a) * rr, this.y + Math.sin(a) * rr); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = c; ctx.globalAlpha = 0.85; ctx.shadowColor = c; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, -len); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    } else if (deco === 'crystal') {
      ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.2; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 1.15, 0, TAU); ctx.stroke(); ctx.restore();
    }
    if (deco === 'overlord') {
      drawMino(ctx, this.x - this.r * 0.55, this.y - this.r * 0.95, SHAPES.L, 13, '#6A2BB0', -0.5);
      drawMino(ctx, this.x + this.r * 0.55, this.y - this.r * 0.95, SHAPES.J, 13, '#6A2BB0', 0.5);
      drawMino(ctx, this.x, this.y - this.r * 1.2, SHAPES.T, 14, '#FFD84D', Math.PI, 1, true);
    }
    if (this.dead) return;
    // 名前 (ツインは個別)
    if (this.twinIndex >= 0) drawText(ctx, this.twinIndex === 0 ? 'ムラサキ' : 'ミドリ', this.x, this.y - this.r - 16, 14, '#fff', 'center', { outline: '#000' });
  }
}
