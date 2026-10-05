'use strict';
// ===== 敵（ぷよ） =====
let _enemyId = 0;

class EBullet {
  constructor(x, y, vx, vy, o = {}) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.kind = o.kind || 'ball'; this.r = o.r || (this.kind === 'big' ? 12 : this.kind === 'needle' ? 5 : 7);
    this.color = o.color === undefined ? 0 : o.color; this.life = o.life || 8; this.age = 0; this.dead = false;
    this.homing = o.homing || 0; this.accel = o.accel || 0;
  }
  update(dt, g) {
    this.age += dt;
    if (this.homing && g.player.alive) {
      const p = g.player, a = Math.atan2(this.vy, this.vx), want = Math.atan2(p.y - this.y, p.x - this.x);
      let d = want - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      const na = a + clamp(d, -this.homing * dt, this.homing * dt), sp = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp;
    }
    if (this.accel) { const sp = Math.hypot(this.vx, this.vy) || 1, ns = sp + this.accel * dt; this.vx *= ns / sp; this.vy *= ns / sp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.age > this.life || this.x < -60 || this.x > W + 80 || this.y < -60 || this.y > H + 60) this.dead = true;
  }
  draw(ctx, t) {
    const col = puyoColor(this.color, t);
    ctx.save(); ctx.translate(this.x, this.y);
    if (this.kind === 'needle') ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.fillStyle = col.dark; ctx.beginPath();
    if (this.kind === 'needle') ctx.ellipse(0, 0, this.r * 2.6, this.r, 0, 0, TAU); else ctx.arc(0, 0, this.r + 1.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col.main; ctx.beginPath();
    if (this.kind === 'needle') ctx.ellipse(0, 0, this.r * 2.2, this.r * 0.7, 0, 0, TAU); else ctx.arc(0, 0, this.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-this.r * 0.35, -this.r * 0.35, this.r * 0.32, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// ぷよの描画
function drawPuyo(ctx, x, y, r, col, o = {}) {
  const t = o.t || 0;
  const wob = 1 + Math.sin(t * 5 + (o.phase || 0)) * 0.03;
  const sx = (o.sx || 1) * wob * (1 + (o.squash || 0)), sy = (o.sy || 1) / wob * (1 - (o.squash || 0) * 0.6);
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
  if (o.marked) { const k = 1 + Math.sin(t * 30) * 0.08; ctx.scale(k, k); }
  if (o.glow) { ctx.shadowColor = col.main; ctx.shadowBlur = o.glow; }
  // 本体
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  grad.addColorStop(0, col.light); grad.addColorStop(0.45, col.main); grad.addColorStop(1, col.dark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  // 少しだけ下が広い丸（ぷよっぽさ）
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.95, -r, r * 1.08, r * 0.3, r * 0.85, r * 0.75);
  ctx.bezierCurveTo(r * 0.5, r * 1.05, -r * 0.5, r * 1.05, -r * 0.85, r * 0.75);
  ctx.bezierCurveTo(-r * 1.08, r * 0.3, -r * 0.95, -r, 0, -r);
  ctx.closePath(); ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.strokeStyle = o.marked ? '#fff' : col.dark; ctx.stroke();
  ctx.shadowBlur = 0;
  // ハイライト
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.5, r * 0.22, r * 0.14, -0.6, 0, TAU); ctx.fill();
  // 目
  if (!o.noFace) {
    const ex = r * 0.34, ey = -r * 0.08, er = r * 0.26;
    const dx = (o.eyeDir ? o.eyeDir.x : -0.4) * er * 0.4, dy = (o.eyeDir ? o.eyeDir.y : 0) * er * 0.4;
    const style = col.eye || 'round';
    for (const s of [-1, 1]) {
      const cx = s * ex, cy = ey;
      if (o.blink || o.dizzy) {
        ctx.strokeStyle = col.dark; ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineCap = 'round';
        if (o.dizzy) { ctx.beginPath(); ctx.moveTo(cx - er * 0.6, cy - er * 0.6); ctx.lineTo(cx + er * 0.6, cy + er * 0.6); ctx.moveTo(cx + er * 0.6, cy - er * 0.6); ctx.lineTo(cx - er * 0.6, cy + er * 0.6); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(cx - er * 0.7, cy); ctx.lineTo(cx + er * 0.7, cy); ctx.stroke(); }
        continue;
      }
      ctx.fillStyle = '#fff'; ctx.beginPath();
      if (style === 'droopy') ctx.ellipse(cx, cy + r * 0.06, er, er * 0.8, s * 0.3, 0, TAU);
      else if (style === 'dot') ctx.arc(cx, cy, er * 0.55, 0, TAU);
      else ctx.ellipse(cx, cy, er * 0.85, er, 0, 0, TAU);
      ctx.fill();
      // 瞳
      ctx.fillStyle = '#2A1838';
      if (style === 'star') {
        drawStar(ctx, cx + dx, cy + dy, er * 0.55, '#2A1838', t * 2);
      } else if (style === 'cat') {
        ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy, er * 0.22, er * 0.7, 0, 0, TAU); ctx.fill();
      } else if (style === 'dot') {
        ctx.beginPath(); ctx.arc(cx + dx * 0.5, cy + dy * 0.5, er * 0.3, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(cx + dx, cy + dy, er * 0.5, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + dx - er * 0.18, cy + dy - er * 0.22, er * 0.16, 0, TAU); ctx.fill();
      // まぶた（眠そう）
      if (style === 'sleepy') { ctx.fillStyle = col.main; ctx.beginPath(); ctx.ellipse(cx, cy - er * 0.5, er * 0.95, er * 0.5, 0, 0, TAU); ctx.fill(); }
      // 怒り眉
      if (o.angry) { ctx.strokeStyle = col.dark; ctx.lineWidth = Math.max(2, r * 0.08); ctx.beginPath(); ctx.moveTo(cx - s * er * 0.9, cy - er * 1.15); ctx.lineTo(cx + s * er * 0.6, cy - er * 0.75); ctx.stroke(); }
    }
    // 口
    ctx.strokeStyle = col.dark; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.lineCap = 'round'; ctx.beginPath();
    if (o.angry) ctx.arc(0, r * 0.55, r * 0.18, Math.PI * 1.15, Math.PI * 1.85);
    else if (o.dizzy) ctx.arc(0, r * 0.45, r * 0.12, 0, TAU);
    else ctx.arc(0, r * 0.3, r * 0.2, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    // ほっぺ
    ctx.fillStyle = 'rgba(255,120,150,0.35)';
    ctx.beginPath(); ctx.ellipse(-r * 0.62, r * 0.22, r * 0.16, r * 0.1, 0, 0, TAU); ctx.ellipse(r * 0.62, r * 0.22, r * 0.16, r * 0.1, 0, 0, TAU); ctx.fill();
  }
  if (o.flash > 0) { ctx.globalAlpha = Math.min(1, o.flash * 6); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 1.02, 0, TAU); ctx.fill(); }
  ctx.restore();
}

const ENEMY_TYPES = {
  drift: { hp: 12, r: 20, speed: 120, score: 100, amp: 28, update(e, dt) { e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 2.2 + e.phase) * e.amp; } },
  cluster: { hp: 14, r: 19, speed: 115, score: 120, amp: 26, update(e, dt) { e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 2 + e.phase) * e.amp; } },
  mini: { hp: 6, r: 13, speed: 140, score: 60, dropChance: 0.1, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vx += (-e.speed - e.vx) * 2 * dt; e.vy *= Math.max(0, 1 - 2 * dt); e.y = clamp(e.y, 50, H - 20); } },
  shooter: {
    hp: 26, r: 22, speed: 170, score: 250, fireInterval: 1.7,
    init(e, o) { e.stopX = o.stopX || rand(540, 820); e.stay = o.stay || 7; },
    update(e, dt, g) {
      if (e.state === 0) { e.x -= e.speed * dt; if (e.x < e.stopX) e.state = 1; }
      else if (e.state === 1) {
        e.stateT += dt; e.y = e.baseY + Math.sin(e.t * 1.5 + e.phase) * 38;
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) { e.fireTimer = e.def.fireInterval / g.diff.fire; e.shootAimed(g, 230, g.stageIndex >= 2 ? 3 : 1, 0.28); }
        if (e.stateT > e.stay) e.state = 2;
      } else e.x -= 210 * dt;
    },
  },
  big: {
    hp: 95, r: 38, speed: 70, score: 500, amp: 18, dropChance: 0.55,
    update(e, dt) { e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 1.3 + e.phase) * e.amp; },
    onDeath(e, g) {
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i / 4) * TAU + 0.4;
        const m = new Enemy('mini', e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, { color: e.color });
        m.vx = Math.cos(a) * 260 - 60; m.vy = Math.sin(a) * 260; m.entered = true; m.popImmune = 0.35;
        g.spawnEnemy(m);
      }
    },
  },
  dasher: {
    hp: 18, r: 20, speed: 640, score: 200,
    update(e, dt, g) {
      if (e.state === 0) { e.x -= 230 * dt; if (e.x < W - 90) { e.state = 1; e.stateT = 0; } }
      else if (e.state === 1) {
        e.stateT += dt; e.squash = Math.sin(e.stateT * 40) * 0.08; e.angry = true;
        if (e.stateT > 0.85) { e.state = 2; const a = Math.atan2(g.player.y - e.y, g.player.x - e.x); e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed; }
      } else { e.x += e.vx * dt; e.y += e.vy * dt; if (Math.random() < 0.5) g.particles.add({ type: 'circle', x: e.x, y: e.y, size: 5, color: puyoColor(e.color).light, life: 0.3, shrink: true, alpha: 0.6 }); }
    },
  },
  spinner: {
    hp: 14, r: 17, speed: 90, score: 150,
    init(e, o) { e.cx = o.cx; e.cy = o.cy; e.ang = o.ang; e.rad = o.rad; e.spin = o.spin; },
    update(e, dt) { e.cx -= e.speed * dt; e.ang += e.spin * dt; e.x = e.cx + Math.cos(e.ang) * e.rad; e.y = e.cy + Math.sin(e.ang) * e.rad; },
  },
  ojama: { hp: 75, r: 26, speed: 60, score: 400, amp: 10, noChain: true, dropChance: 1, init(e) { e.color = -1; }, update(e, dt) { e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t + e.phase) * e.amp; } },
  bouncer: {
    hp: 16, r: 18, speed: 210, score: 180,
    init(e, o) { e.vx = -e.speed; e.vy = (o.dir || 1) * e.speed * 0.9; },
    update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; if (e.y < 60 + e.r) { e.y = 60 + e.r; e.vy = Math.abs(e.vy); e.squash = 0.2; } if (e.y > H - 20 - e.r) { e.y = H - 20 - e.r; e.vy = -Math.abs(e.vy); e.squash = 0.2; } },
  },
  homer: {
    hp: 20, r: 19, speed: 175, score: 220,
    init(e) { e.vx = -160; e.vy = 0; },
    update(e, dt, g) { const p = g.player, a = Math.atan2(p.y - e.y, p.x - e.x); e.vx += (Math.cos(a) * e.speed - e.vx) * 1.4 * dt; e.vy += (Math.sin(a) * e.speed - e.vy) * 1.4 * dt; e.x += e.vx * dt; e.y += e.vy * dt; },
  },
  turret: {
    hp: 42, r: 22, speed: 0, score: 300, fireInterval: 2.3,
    init(e, o) { e.top = !!o.top; e.y = e.top ? 44 + e.r * 0.55 : H - e.r * 0.55; },
    update(e, dt, g) {
      e.x -= g.scrollSpeed * 1.5 * dt;
      if (e.x < W - 20 && e.x > 40) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) { e.fireTimer = e.def.fireInterval / g.diff.fire; e.shootAimed(g, 210, g.stageIndex >= 3 ? 5 : 3, 0.3); }
      }
    },
  },
  wall: { hp: 22, r: 20, speed: 130, score: 80, init(e, o) { e.speed = o.speed || 130; }, update(e, dt) { e.x -= e.speed * dt; } },
  rainbow: { hp: 22, r: 20, speed: 135, score: 800, dropChance: 1, amp: 42, update(e, dt) { e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 2.6 + e.phase) * e.amp; } },
  carrier: { hp: 65, r: 24, speed: 55, score: 300, dropChance: 1, amp: 14, update(e, dt) { e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 1.2 + e.phase) * e.amp; } },
  // ボスのお供
  part: {
    hp: 32, r: 18, speed: 0, score: 150, dropChance: 0.25,
    init(e, o) { e.boss = o.boss; e.ang = o.ang; e.rad = o.rad; e.spin = o.spin; e.entered = true; },
    update(e, dt) {
      if (e.boss.dead) { if (e.popTimer < 0) e.popTimer = rand(0.05, 0.6); return; }
      e.ang += e.spin * dt; e.x = e.boss.x + Math.cos(e.ang) * e.rad; e.y = e.boss.y + Math.sin(e.ang) * e.rad;
    },
  },
  minoPart: {
    hp: 55, r: 16, speed: 0, score: 200, noChain: true, dropChance: 0.5,
    init(e, o) { e.boss = o.boss; e.ang = o.ang; e.rad = o.rad; e.spin = o.spin; e.shape = o.shape || SHAPES.O; e.drawAs = 'mino'; e.minoColor = o.minoColor || '#B0B8C8'; e.entered = true; e.color = -1; },
    update(e, dt) {
      if (e.boss.dead) { if (e.popTimer < 0) e.popTimer = rand(0.05, 0.6); return; }
      e.ang += e.spin * dt; e.x = e.boss.x + Math.cos(e.ang) * e.rad; e.y = e.boss.y + Math.sin(e.ang) * e.rad; e.rot = e.ang;
    },
  },
};

class Enemy {
  constructor(type, x, y, o = {}) {
    const def = ENEMY_TYPES[type];
    this.id = _enemyId++; this.type = type; this.def = def; this.x = x; this.y = y; this.t = 0; this.dead = false; this.entered = false;
    this.color = o.color !== undefined ? o.color : randInt(0, 4);
    this.r = o.r || def.r; this.maxHp = def.hp * (o.hpMul || 1); this.hp = this.maxHp;
    this.score = def.score; this.speed = o.speed || def.speed;
    this.vx = 0; this.vy = 0; this.baseY = y; this.phase = o.phase !== undefined ? o.phase : rand(TAU); this.amp = o.amp !== undefined ? o.amp : (def.amp || 25);
    this.popTimer = -1; this.chainIndex = 0; this.hitFlash = 0; this.squash = 0;
    this.fireTimer = o.fireDelay !== undefined ? o.fireDelay : (def.fireInterval || 1.5) * rand(0.5, 1);
    this.state = 0; this.stateT = 0;
    this.drop = o.drop || null; this.dropChance = o.dropChance !== undefined ? o.dropChance : (def.dropChance !== undefined ? def.dropChance : 0.2);
    this.eyeDir = { x: -0.5, y: 0 }; this.blinkT = rand(1, 4); this.blink = false; this.angry = false;
    this.isBoss = false; this.noChain = !!def.noChain; this.popImmune = 0; this.boss = null;
    if (def.init) def.init(this, o);
  }
  update(dt, g) {
    const d = dt * g.enemyTime;
    this.t += d; this.hitFlash -= dt; this.squash *= Math.max(0, 1 - 8 * dt); this.popImmune -= dt;
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.12 : rand(1.5, 4); }
    if (this.popTimer >= 0) { this.popTimer -= dt; if (this.popTimer < 0) { g.killEnemy(this, this.chainIndex); return; } }
    this.def.update(this, d, g);
    if (g.player.alive) { const dx = g.player.x - this.x, dy = g.player.y - this.y, l = Math.hypot(dx, dy) || 1; this.eyeDir.x = dx / l; this.eyeDir.y = dy / l; }
    if (this.x < W + 30) this.entered = true;
    if (this.entered && (this.x < -90 || this.y < -160 || this.y > H + 160 || this.x > W + 400)) this.dead = true;
  }
  takeDamage(dmg, g, src) {
    if (this.dead || this.popTimer >= 0) return;
    this.hp -= dmg * (g.dmgMul || 1); this.hitFlash = 0.1; this.squash = 0.22;
    if (this.hp <= 0) g.killEnemy(this, 0);
  }
  shoot(g, ang, speed, o = {}) {
    const sp = speed * g.diff.bspeed;
    g.addEBullet(new EBullet(this.x, this.y, Math.cos(ang) * sp, Math.sin(ang) * sp, Object.assign({ color: this.color === -1 ? 4 : this.color }, o)));
  }
  shootAimed(g, speed, n = 1, spread = 0.25, o = {}) {
    const p = g.player, base = Math.atan2(p.y - this.y, p.x - this.x);
    for (let i = 0; i < n; i++) this.shoot(g, base + (i - (n - 1) / 2) * spread, speed, o);
    Sound.sfx.enemyShot(); this.squash = 0.25;
  }
  shootRing(g, n, speed, offset = 0, o = {}) { for (let i = 0; i < n; i++) this.shoot(g, offset + (i / n) * TAU, speed, o); Sound.sfx.enemyShot(); }
  draw(ctx, g) {
    const col = puyoColor(this.color, g.time);
    if (this.drawAs === 'mino') {
      if (this.hitFlash > 0) { ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 20; }
      drawMino(ctx, this.x, this.y, this.shape, 14, this.hitFlash > 0 ? '#ffffff' : this.minoColor, this.rot || 0);
      if (this.hitFlash > 0) ctx.restore();
      return;
    }
    if (this.type === 'carrier') { // 風船
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x, this.y - this.r); ctx.lineTo(this.x, this.y - this.r - 26); ctx.stroke();
      const ic = this.drop ? ITEMS[this.drop] : null;
      ctx.fillStyle = ic ? (ic.color === '#fff' || ic.color === '#FFFFFF' ? '#FFD0FF' : ic.color) : '#FFB7C5'; ctx.beginPath(); ctx.ellipse(this.x, this.y - this.r - 40, 16, 19, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(this.x - 5, this.y - this.r - 46, 4, 6, 0, 0, TAU); ctx.fill();
      if (ic) ic.draw(ctx, this.x, this.y - this.r - 40, g.time);
    }
    if (this.type === 'turret') { // 茎
      ctx.strokeStyle = '#3E8E41'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x, this.top ? 36 : H + 6); ctx.stroke();
      ctx.fillStyle = '#5BE06A'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(this.x + s * 12, this.top ? 48 : H - 10, 9, 5, s * 0.5, 0, TAU); ctx.fill(); }
    }
    const o = { t: this.t, phase: this.phase, eyeDir: this.eyeDir, blink: this.blink, flash: this.hitFlash, squash: this.squash, marked: this.popTimer >= 0, angry: this.angry || (this.type === 'ojama') };
    if (this.color === 5) o.glow = 14;
    drawPuyo(ctx, this.x, this.y, this.r, col, o);
    if (this.type === 'ojama') { // とげとげ帽子
      ctx.fillStyle = '#6C7384'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.8 + i * 0.3; ctx.moveTo(this.x + Math.cos(a) * this.r * 0.9, this.y + Math.sin(a) * this.r * 0.9); ctx.lineTo(this.x + Math.cos(a + 0.15) * this.r * 1.35, this.y + Math.sin(a + 0.15) * this.r * 1.35); ctx.lineTo(this.x + Math.cos(a + 0.3) * this.r * 0.9, this.y + Math.sin(a + 0.3) * this.r * 0.9); } ctx.fill();
    }
    if (this.type === 'big' || this.type === 'shooter') { // HP バー
      const w = this.r * 1.6, k = clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(this.x - w / 2, this.y - this.r - 10, w, 4);
      ctx.fillStyle = '#fff'; ctx.fillRect(this.x - w / 2, this.y - this.r - 10, w * k, 4);
    }
  }
}
