'use strict';
// ===== ボス =====
ENEMY_TYPES.bossBase = { hp: 1, r: 70, speed: 0, score: 0, noChain: true, update() {} };

const BOSS_DEFS = [
  { name: 'プヨキング', en: 'PUYO KING', hp: 2800, r: 70, color: 0, deco: 'crown', score: 10000 },
  { name: 'プヨクラゲ', en: 'JELLY PUYO', hp: 4000, r: 66, color: 2, deco: 'jelly', score: 15000, parts: { n: 6, rad: 120, spin: 0.9 } },
  { name: 'ネオンツインズ', en: 'NEON TWINS', hp: 2400, r: 50, color: [4, 1], deco: 'neon', score: 10000, twins: true },
  { name: 'クリスタルプヨ', en: 'CRYSTAL PUYO', hp: 5500, r: 72, color: 4, deco: 'crystal', score: 25000, armor: 1400, parts: { n: 4, rad: 125, spin: -0.6 } },
  { name: 'テトロオーバーロード', en: 'TETRO OVERLORD', hp: 9000, r: 86, color: 4, deco: 'overlord', score: 50000, minoArmor: 8 },
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
  minoDrop: (dur = 3, rate = 0.35) => ({ dur, start(b) { b.acc = 0; }, tick(b, dt, g) { b.acc += dt; while (b.acc >= rate) { b.acc -= rate; g.addEBullet(new EBullet(rand(100, W - 60), -20, -40, 120 * g.diff.bspeed, { color: b.color, kind: 'big', accel: 260, life: 6 })); } } }),
};

const BOSS_ATTACKS = [
  [ // 1 プヨキング
    [ATK.aimed(1, 0.55, 220, 0, 3), ATK.bounce(4, 300, 3), ATK.summon('drift', 4, { sameColor: true, spread: true }), ATK.ring(10, 170, 2, 1)],
    [ATK.aimed(3, 0.5, 250, 0.25, 3), ATK.dash(680), ATK.ring(14, 190, 3, 0.7), ATK.bounce(4, 400, 5), ATK.formation()],
  ],
  [ // 2 プヨクラゲ
    [ATK.ring(12, 180, 3, 0.9), ATK.aimed(5, 0.8, 200, 0.18, 3), ATK.homingBurst(4, 160, 2, 1.2), ATK.summon('bouncer', 3, { sameColor: true })],
    [ATK.spiral(3, 0.09, 200, 0.35, 2), ATK.ring(16, 200, 3, 0.7), ATK.curtain(240, 3, 1.4), ATK.summon('bouncer', 4), ATK.homingBurst(6, 170, 2, 1)],
  ],
  [ // 3 ネオンツインズ
    [ATK.aimed(1, 0.3, 300, 0, 3), ATK.sweep(2.6), ATK.curtain(300, 2, 1.5, 120), ATK.dash(760)],
    [ATK.spiral(3, 0.08, 230, 0.5, 1), ATK.aimed(3, 0.35, 320, 0.2, 3), ATK.sweep(3, 0.04), ATK.summon('homer', 3), ATK.dash(820)],
  ],
  [ // 4 クリスタルプヨ
    [ATK.rainNeedles(3, 0.14, 340), ATK.ring(14, 190, 3, 0.8), ATK.aimed(5, 0.7, 220, 0.15, 3), ATK.spiral(3, 0.1, 190, 0.4, 3)],
    [ATK.rainNeedles(4, 0.09, 380), ATK.curtain(260, 3, 1.2), ATK.homingBurst(6, 170, 2, 1.2), ATK.ring(20, 210, 3, 0.6), ATK.summon('ojama', 2), ATK.spiral(3, 0.08, 210, 0.6, 4)],
  ],
  [ // 5 テトロオーバーロード
    [ATK.spiral(3.5, 0.07, 230, 0.3, 3), ATK.aimed(7, 0.6, 260, 0.14, 3), ATK.formation(), ATK.curtain(300, 3, 1.1), ATK.homingBurst(6, 190, 3, 1), ATK.minoDrop(3, 0.4)],
    [ATK.dash(820), ATK.spiral(4, 0.06, 250, 0.55, 4), ATK.rainNeedles(3, 0.08, 420), ATK.ring(24, 220, 3, 0.55), ATK.curtain(320, 4, 1, 100), ATK.aimed(9, 0.5, 280, 0.12, 3), ATK.summon('dasher', 3), ATK.minoDrop(3, 0.25), ATK.formation()],
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
    if (!this.attack) { this.attack = this.attacks[this.attackIdx % this.attacks.length]; this.attackIdx++; this.attackT = 0; if (this.attack.start) this.attack.start(this, g); }
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
