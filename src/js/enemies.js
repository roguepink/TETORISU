'use strict';
// ===== 敵（ぷよ） =====
let _enemyId = 0;

class EBullet {
  constructor(x, y, vx, vy, o = {}) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.kind = o.kind || 'ball'; this.r = o.r || (this.kind === 'big' ? 12 : this.kind === 'needle' ? 5 : 7);
    this.color = o.color === undefined ? 0 : o.color; this.life = o.life || 8; this.age = 0; this.dead = false;
    this.homing = o.homing || 0; this.accel = o.accel || 0;
    this.bounces = o.bounces || 0; this.grav = o.grav || 0; this.amp = o.amp || 0; this.freq = o.freq || 6; this.wt = 0;
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
    if (this.grav) this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.amp) { this.wt += dt; this.y += Math.cos(this.wt * this.freq) * this.amp * this.freq * dt; }
    if (this.bounces > 0) {
      if (this.y < 46 + this.r && this.vy < 0) { this.y = 46 + this.r; this.vy = -this.vy; this.bounces--; }
      else if (this.y > H - this.r && this.vy > 0) { this.y = H - this.r; this.vy = -this.vy; this.bounces--; }
    }
    if (this.age > this.life || this.x < -60 || this.x > W + 80 || this.y < -60 || this.y > H + 60) this.dead = true;
  }
  draw(ctx, t) {
    const col = puyoColor(this.color, t);
    ctx.save(); ctx.translate(this.x, this.y);
    if (this.kind === 'needle') ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath();
    if (this.kind === 'needle') ctx.ellipse(0, 0, this.r * 2.9, this.r * 1.35, 0, 0, TAU); else ctx.arc(0, 0, this.r + 3, 0, TAU);
    ctx.fill();
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
  drift: {
    hp: 21, r: 20, speed: 120, score: 100, amp: 28, fireInterval: 3.2,
    init(e) { e.fireTimer = rand(0.1, 0.5); }, // 登場してすぐ 1 発目を撃つ
    update(e, dt, g) {
      e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 2.2 + e.phase) * e.amp;
      if (e.x < W - 10 && e.x > 120) { e.fireTimer -= dt; if (e.fireTimer <= 0) { e.fireTimer = rand(1.2, 2.2) / g.fireRate; if (Math.random() < 0.85) e.shootAimed(g, 195, 1, 0); } }
    },
  },
  cluster: {
    hp: 24, r: 19, speed: 115, score: 120, amp: 26, fireInterval: 3,
    init(e) { e.fireTimer = rand(0.2, 0.8); },
    update(e, dt, g) {
      e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 2 + e.phase) * e.amp;
      if (e.x < W - 10 && e.x > 120) { e.fireTimer -= dt; if (e.fireTimer <= 0) { e.fireTimer = rand(1.5, 2.6) / g.fireRate; if (Math.random() < 0.65 + g.stageIndex * 0.04) e.shootAimed(g, 185, g.stageIndex >= 3 ? 3 : 1, 0.3); } }
    },
  },
  mini: { hp: 9, r: 13, speed: 140, score: 60, dropChance: 0.03, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vx += (-e.speed - e.vx) * 2 * dt; e.vy *= Math.max(0, 1 - 2 * dt); e.y = clamp(e.y, 50, H - 20); } },
  shooter: {
    hp: 45, r: 22, speed: 170, score: 250, fireInterval: 1.15,
    init(e, o) { e.stopX = o.stopX || rand(540, 820); e.stay = o.stay || 7; e.shots = 0; e.fireTimer = 0.4; },
    update(e, dt, g) {
      if (e.state === 0) { e.x -= e.speed * dt; if (e.x < e.stopX) e.state = 1; }
      else if (e.state === 1) {
        e.stateT += dt; e.y = e.baseY + Math.sin(e.t * 1.5 + e.phase) * 38;
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = e.def.fireInterval / g.fireRate; e.shots++;
          const k = e.shots % 3;
          if (k === 1) e.shootAimed(g, 230, g.stageIndex >= 2 ? 3 : 1, 0.28);
          else if (k === 2) e.shootBurst(g, 3, 300, 0.1);
          else e.shootRing(g, 6 + g.stageIndex, 150, e.t);
        }
        if (e.stateT > e.stay) e.state = 2;
      } else e.x -= 210 * dt;
    },
  },
  big: {
    hp: 165, r: 38, speed: 70, score: 500, amp: 18, dropChance: 0.35, fireInterval: 1.9,
    update(e, dt, g) {
      e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 1.3 + e.phase) * e.amp;
      if (e.x < W - 40) { e.fireTimer -= dt; if (e.fireTimer <= 0) { e.fireTimer = e.def.fireInterval / g.fireRate; if (e.hp < e.maxHp * 0.6) e.shootRing(g, 10, 140, e.t); else e.shootAimed(g, 170, 3, 0.35); } }
    },
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
    hp: 27, r: 20, speed: 640, score: 200,
    update(e, dt, g) {
      if (e.state === 0) { e.x -= 230 * dt; if (e.x < W - 90) { e.state = 1; e.stateT = 0; } }
      else if (e.state === 1) {
        e.stateT += dt; e.squash = Math.sin(e.stateT * 40) * 0.08; e.angry = true;
        if (e.stateT > 0.85) { e.state = 2; const a = Math.atan2(g.player.y - e.y, g.player.x - e.x); e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed; e.shootAimed(g, 230, 2, 0.5); }
      } else { e.x += e.vx * dt; e.y += e.vy * dt; if (Math.random() < 0.5) g.particles.add({ type: 'circle', x: e.x, y: e.y, size: 5, color: puyoColor(e.color).light, life: 0.3, shrink: true, alpha: 0.6 }); }
    },
  },
  spinner: {
    hp: 24, r: 17, speed: 90, score: 150, fireInterval: 1.9,
    init(e, o) { e.cx = o.cx; e.cy = o.cy; e.ang = o.ang; e.rad = o.rad; e.spin = o.spin; e.fireTimer = rand(0.6, 1.6); },
    update(e, dt, g) {
      e.cx -= e.speed * dt; e.ang += e.spin * dt; e.x = e.cx + Math.cos(e.ang) * e.rad; e.y = e.cy + Math.sin(e.ang) * e.rad;
      if (e.cx < W - 60) { e.fireTimer -= dt; if (e.fireTimer <= 0) { e.fireTimer = e.def.fireInterval / g.fireRate; e.shoot(g, e.ang, 160); } }
    },
  },
  ojama: { hp: 112, r: 26, speed: 60, score: 400, amp: 10, noChain: true, dropChance: 0.6, fireInterval: 2.8, init(e) { e.color = -1; }, update(e, dt, g) { e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t + e.phase) * e.amp; if (e.x < W - 40) { e.fireTimer -= dt; if (e.fireTimer <= 0) { e.fireTimer = e.def.fireInterval / g.fireRate; e.shootAimed(g, 160, 3, 0.4); } } } },
  bouncer: {
    hp: 27, r: 18, speed: 210, score: 180,
    init(e, o) { e.vx = -e.speed; e.vy = (o.dir || 1) * e.speed * 0.9; },
    update(e, dt, g) {
      e.x += e.vx * dt; e.y += e.vy * dt;
      let hit = false;
      if (e.y < 60 + e.r) { e.y = 60 + e.r; e.vy = Math.abs(e.vy); hit = true; }
      if (e.y > H - 20 - e.r) { e.y = H - 20 - e.r; e.vy = -Math.abs(e.vy); hit = true; }
      if (hit) { e.squash = 0.2; if (e.x < W - 30 && Math.random() < 0.85) e.shootAimed(g, 200, 1, 0); }
    },
  },
  homer: {
    hp: 30, r: 19, speed: 175, score: 220,
    init(e) { e.vx = -160; e.vy = 0; },
    update(e, dt, g) { const p = g.player, a = Math.atan2(p.y - e.y, p.x - e.x); e.vx += (Math.cos(a) * e.speed - e.vx) * 1.4 * dt; e.vy += (Math.sin(a) * e.speed - e.vy) * 1.4 * dt; e.x += e.vx * dt; e.y += e.vy * dt; if (e.x < W - 40) { e.fireTimer -= dt; if (e.fireTimer <= 0) { e.fireTimer = 1.6 / g.fireRate; e.shootAimed(g, 210, 1, 0); } } },
  },
  turret: {
    hp: 72, r: 22, speed: 0, score: 300, fireInterval: 1.6,
    init(e, o) { e.top = !!o.top; e.y = e.top ? 44 + e.r * 0.55 : H - e.r * 0.55; e.shots = 0; },
    update(e, dt, g) {
      e.x -= g.scrollSpeed * 1.5 * dt;
      if (e.x < W - 20 && e.x > 40) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = e.def.fireInterval / g.fireRate; e.shots++;
          if (e.shots % 2) e.shootAimed(g, 210, g.stageIndex >= 3 ? 5 : 3, 0.3);
          else { const base = e.top ? Math.PI / 2 : -Math.PI / 2; for (let i = -2; i <= 2; i++) e.shoot(g, base + i * 0.35, 150 + Math.abs(i) * 30, { kind: 'needle' }); Sound.sfx.enemyShot(); }
        }
      }
    },
  },
  wall: { hp: 33, r: 20, speed: 130, score: 80, fireInterval: 3.4, init(e, o) { e.speed = o.speed || 130; e.fireTimer = rand(0.5, 2); }, update(e, dt, g) { e.x -= e.speed * dt; if (e.x < W - 40) { e.fireTimer -= dt; if (e.fireTimer <= 0) { e.fireTimer = rand(2.6, 4.2) / g.fireRate; if (Math.random() < 0.25) e.shootAimed(g, 170, 1, 0); } } } },
  rainbow: { hp: 33, r: 20, speed: 135, score: 800, dropChance: 1, amp: 42, update(e, dt) { e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 2.6 + e.phase) * e.amp; } },
  carrier: { hp: 98, r: 24, speed: 55, score: 300, dropChance: 1, amp: 14, update(e, dt) { e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 1.2 + e.phase) * e.amp; } },
  // 停止してリング弾を撃つ
  ringer: {
    hp: 54, r: 23, speed: 150, score: 300, fireInterval: 1.6,
    init(e, o) { e.stopX = o.stopX || rand(520, 760); },
    update(e, dt, g) {
      if (e.state === 0) { e.x -= e.speed * dt; if (e.x < e.stopX) e.state = 1; }
      else if (e.state === 1) {
        e.stateT += dt; e.y = e.baseY + Math.sin(e.t * 1.2 + e.phase) * 30; e.fireTimer -= dt;
        if (e.fireTimer <= 0) { e.fireTimer = e.def.fireInterval / g.fireRate; e.shootRing(g, 8 + g.stageIndex * 2, 165, e.t); e.squash = 0.3; }
        if (e.stateT > 6) e.state = 2;
      } else e.x -= 200 * dt;
    },
  },
  // 右端で狙いすまして針弾を連射
  sniper: {
    hp: 45, r: 21, speed: 220, score: 320, fireInterval: 2.1,
    init(e) { e.stopX = rand(700, 860); },
    update(e, dt, g) {
      if (e.state === 0) { e.x -= e.speed * dt; if (e.x < e.stopX) e.state = 1; }
      else if (e.state === 1) {
        e.stateT += dt; e.y += clamp(g.player.y - e.y, -90 * dt, 90 * dt); e.fireTimer -= dt;
        if (e.fireTimer <= 0) { e.fireTimer = e.def.fireInterval / g.fireRate; e.shootBurst(g, 3 + (g.stageIndex >= 3 ? 2 : 0), 430, 0.11, { kind: 'needle' }); e.angry = true; }
        if (e.stateT > 7) e.state = 2;
      } else e.x -= 240 * dt;
    },
  },
  // 宙返りして弾をばらまく
  looper: {
    hp: 33, r: 19, speed: 230, score: 220,
    init(e, o) { e.loopX = o.loopX || rand(420, 700); e.dir = o.dir || (Math.random() < 0.5 ? 1 : -1); e.fired = false; },
    update(e, dt, g) {
      if (e.state === 0) { e.x -= e.speed * dt; if (e.x < e.loopX) { e.state = 1; e.ang = 0; e.cx = e.x; e.cy = e.y - e.dir * 70; } }
      else if (e.state === 1) {
        e.ang += 3.2 * dt; e.x = e.cx - Math.sin(e.ang) * 70; e.y = e.cy + e.dir * Math.cos(e.ang) * 70;
        if (!e.fired && e.ang > Math.PI) { e.fired = true; e.shootAimed(g, 220, 3, 0.3); }
        if (!e.fired2 && e.ang > Math.PI * 1.7) { e.fired2 = true; e.shootAimed(g, 240, 1, 0); }
        if (e.ang >= TAU) e.state = 2;
      } else e.x -= e.speed * 1.2 * dt;
    },
  },
  // ジグザグに進みながら上下に弾を落とす
  zigzag: {
    hp: 30, r: 18, speed: 230, score: 200, fireInterval: 0.9,
    init(e, o) { e.vy = (o.dir || 1) * 230; e.zt = 0; },
    update(e, dt, g) {
      e.x -= e.speed * dt; e.y += e.vy * dt; e.zt += dt;
      if (e.zt > 0.55) { e.zt = 0; e.vy = -e.vy; e.squash = 0.2; }
      if (e.y < 70) { e.y = 70; e.vy = Math.abs(e.vy); } if (e.y > H - 30) { e.y = H - 30; e.vy = -Math.abs(e.vy); }
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.x < W - 30) { e.fireTimer = e.def.fireInterval / g.fireRate; e.shoot(g, e.vy > 0 ? -Math.PI / 2 : Math.PI / 2, 150); }
    },
  },
  // 画面の上下から急降下して自機の高さでリング弾
  diver: {
    hp: 36, r: 20, speed: 430, score: 240,
    init(e, o) { e.top = o.top !== undefined ? o.top : Math.random() < 0.5; e.y = e.top ? -30 : H + 30; e.x = o.x || rand(300, 760); e.entered = true; },
    update(e, dt, g) {
      if (e.state === 0) {
        const ty = g.player.y, dir = e.top ? 1 : -1; e.y += dir * e.speed * dt;
        if ((e.top && e.y >= ty) || (!e.top && e.y <= ty) || e.y > H - 30 || e.y < 60) { e.state = 1; e.shootRing(g, 6 + g.stageIndex, 175, 0); e.squash = 0.35; }
      } else { e.y += (e.top ? -1 : 1) * e.speed * 0.8 * dt; e.x -= 70 * dt; }
    },
  },
  // 左（背後）から現れて追い越していく
  ambusher: {
    hp: 39, r: 20, speed: 170, score: 260, fireInterval: 1.3,
    init(e) { e.x = -40; e.entered = true; },
    update(e, dt, g) {
      e.stateT += dt;
      if (e.stateT < 2.4) e.x += e.speed * dt; else e.x -= 130 * dt;
      e.y = e.baseY + Math.sin(e.t * 2 + e.phase) * 25;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.x > 0) { e.fireTimer = e.def.fireInterval / g.fireRate; e.shootAimed(g, 200, 1, 0); }
    },
  },
  // ゆっくり進みながら渦巻き弾
  spiraler: {
    hp: 66, r: 24, speed: 60, score: 350,
    init(e) { e.sang = rand(TAU); e.acc = 0; },
    update(e, dt, g) {
      e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 0.8 + e.phase) * 40;
      if (e.x < W - 30) { e.acc += dt; const rate = 0.17 / g.fireRate; while (e.acc >= rate) { e.acc -= rate; e.sang += 0.42; e.shoot(g, e.sang, 150); e.shoot(g, e.sang + Math.PI, 150); } }
    },
  },
  // 天井・床沿いに飛び、重力弾を落とす
  bomber: {
    hp: 42, r: 21, speed: 150, score: 240, fireInterval: 0.75,
    init(e, o) { e.top = o.top !== false; e.y = e.top ? 72 : H - 50; },
    update(e, dt, g) {
      e.x -= e.speed * dt; e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.x < W - 20) { e.fireTimer = e.def.fireInterval / g.fireRate; g.addEBullet(new EBullet(e.x, e.y, -40, (e.top ? 60 : -60) * g.diff.bspeed, { color: e.color, kind: 'grav', grav: e.top ? 420 : -420 })); Sound.sfx.enemyShot(); }
    },
  },
  // 機雷ぷよ：倒すか近づくと弾をまき散らす
  mine: {
    hp: 18, r: 18, speed: 40, score: 150, dropChance: 0.04,
    init(e) { e.fuse = 0; },
    update(e, dt, g) {
      e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t + e.phase) * 10;
      if (g.player.alive && dist(e.x, e.y, g.player.x, g.player.y) < 75) { e.fuse += dt; if (e.fuse > 0.5) g.killEnemy(e, 0); }
    },
    onDeath(e, g) { if (g.bombT < 0) e.shootRing(g, 8, 185, e.t); },
  },
  // 弾を跳ね返しながら進む
  ricochet: {
    hp: 39, r: 20, speed: 110, score: 260, fireInterval: 1.8,
    update(e, dt, g) {
      e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 1.6 + e.phase) * 50; e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.x < W - 30) { e.fireTimer = e.def.fireInterval / g.fireRate; for (const a of [-0.6, 0.6]) e.shoot(g, Math.PI + a, 220, { bounces: 2, life: 5 }); Sound.sfx.enemyShot(); }
    },
  },
  // うねる弾を撃つ
  waver: {
    hp: 36, r: 20, speed: 130, score: 230, fireInterval: 1.5,
    update(e, dt, g) {
      e.x -= e.speed * dt; e.y = e.baseY + Math.sin(e.t * 1.4 + e.phase) * 35; e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.x < W - 30) { e.fireTimer = e.def.fireInterval / g.fireRate; e.shoot(g, Math.PI, 190, { amp: 50, freq: 7 }); e.shoot(g, Math.PI, 190, { amp: -50, freq: 7 }); Sound.sfx.enemyShot(); }
    },
  },
  // ボスのお供
  part: {
    hp: 48, r: 18, speed: 0, score: 150, dropChance: 0.08,
    init(e, o) { e.boss = o.boss; e.ang = o.ang; e.rad = o.rad; e.spin = o.spin; e.entered = true; },
    update(e, dt) {
      if (e.boss.dead) { if (e.popTimer < 0) e.popTimer = rand(0.05, 0.6); return; }
      e.ang += e.spin * dt; e.x = e.boss.x + Math.cos(e.ang) * e.rad; e.y = e.boss.y + Math.sin(e.ang) * e.rad;
    },
  },
  minoPart: {
    hp: 82, r: 16, speed: 0, score: 200, noChain: true, dropChance: 0.2,
    init(e, o) { e.boss = o.boss; e.ang = o.ang; e.rad = o.rad; e.spin = o.spin; e.shape = o.shape || SHAPES.O; e.drawAs = 'mino'; e.minoColor = o.minoColor || '#B0B8C8'; e.entered = true; e.color = -1; },
    update(e, dt) {
      if (e.boss.dead) { if (e.popTimer < 0) e.popTimer = rand(0.05, 0.6); return; }
      e.ang += e.spin * dt; e.x = e.boss.x + Math.cos(e.ang) * e.rad; e.y = e.boss.y + Math.sin(e.ang) * e.rad; e.rot = e.ang;
    },
  },
};

// 敵タイプごとの小物（見分けやすさと可愛さ）
function drawAccessory(ctx, e, col) {
  const { x, y, r } = e, t = e.t;
  ctx.save();
  switch (e.type) {
    case 'shooter': { // リボン
      ctx.fillStyle = '#FF5E7A'; ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.85); ctx.lineTo(x - r * 0.95, y - r * 1.15); ctx.lineTo(x - r * 0.85, y - r * 0.6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.85); ctx.lineTo(x - r * 0.25, y - r * 1.2); ctx.lineTo(x - r * 0.2, y - r * 0.7); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FFB7C5'; ctx.beginPath(); ctx.arc(x - r * 0.55, y - r * 0.88, r * 0.12, 0, TAU); ctx.fill(); break; }
    case 'sniper': { // モノクル
      ctx.strokeStyle = '#2A1838'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.08, r * 0.36, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - r * 0.34, y + r * 0.28); ctx.lineTo(x - r * 0.5, y + r * 0.7); ctx.stroke(); break; }
    case 'ringer': { // 天使の輪
      ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 4; ctx.shadowColor = '#FFE066'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.ellipse(x, y - r * 1.25 + Math.sin(t * 3) * 2, r * 0.6, r * 0.18, 0, 0, TAU); ctx.stroke(); break; }
    case 'looper': { // ゴーグル
      ctx.fillStyle = '#2A1838'; ctx.fillRect(x - r * 0.85, y - r * 0.75, r * 1.7, 5); ctx.strokeStyle = '#2A1838'; ctx.lineWidth = 3; for (const sgn of [-1, 1]) { ctx.fillStyle = '#8EE5FF'; ctx.beginPath(); ctx.arc(x + sgn * r * 0.36, y - r * 0.72, r * 0.2, 0, TAU); ctx.fill(); ctx.stroke(); } break; }
    case 'zigzag': { // 稲妻マーク
      ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.moveTo(x + r * 0.05, y + r * 0.2); ctx.lineTo(x - r * 0.2, y + r * 0.55); ctx.lineTo(x, y + r * 0.5); ctx.lineTo(x - r * 0.1, y + r * 0.85); ctx.lineTo(x + r * 0.25, y + r * 0.45); ctx.lineTo(x + r * 0.05, y + r * 0.5); ctx.closePath(); ctx.fill(); break; }
    case 'diver': { // ヘルメット
      ctx.fillStyle = '#FF8A3D'; ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.95, Math.PI, TAU); ctx.fill(); ctx.fillStyle = '#FFD27A'; ctx.fillRect(x - r * 0.15, y - r * 1.25, r * 0.3, r * 0.5); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.75, r * 0.12, 0, TAU); ctx.fill(); break; }
    case 'ambusher': { // 忍者の鉢巻
      ctx.fillStyle = '#2A1838'; ctx.fillRect(x - r * 0.95, y - r * 0.62, r * 1.9, 7); ctx.beginPath(); ctx.moveTo(x + r * 0.9, y - r * 0.6); ctx.lineTo(x + r * 1.5, y - r * 0.85 + Math.sin(t * 8) * 4); ctx.lineTo(x + r * 1.4, y - r * 0.45 + Math.sin(t * 8) * 4); ctx.closePath(); ctx.fill(); break; }
    case 'spiraler': { // うずまき
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i < 40; i++) { const a = i * 0.3 + t * 2, rr = i * r * 0.012; ctx.lineTo(x + Math.cos(a) * rr, y + r * 0.35 + Math.sin(a) * rr); } ctx.stroke(); break; }
    case 'bomber': { // ベレー帽
      ctx.fillStyle = '#5B3A9C'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.85, r * 0.75, r * 0.3, -0.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 1.05, r * 0.12, 0, TAU); ctx.fill(); break; }
    case 'ricochet': { // バンパー
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 5; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 40; ctx.beginPath(); ctx.arc(x, y, r * 1.18, 0, TAU); ctx.stroke(); break; }
    case 'waver': { // なみなみ帽
      ctx.strokeStyle = '#4FA3FF'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 8; i++) ctx.lineTo(x - r * 0.7 + i * r * 0.175, y - r * 1.05 + Math.sin(i * 1.3 + t * 6) * 4); ctx.stroke(); break; }
    case 'homer': { // ハートのアンテナ
      ctx.strokeStyle = col.dark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x + r * 0.15, y - r * 1.35); ctx.stroke(); drawHeart(ctx, x + r * 0.2, y - r * 1.45, r * 0.16, '#FF5E7A'); break; }
    case 'dasher': { // 鉢巻＋スピード線
      ctx.fillStyle = '#FF5E3A'; ctx.fillRect(x - r * 0.95, y - r * 0.55, r * 1.9, 6);
      if (e.state === 2) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + r * 1.1, y + i * r * 0.4); ctx.lineTo(x + r * 1.9, y + i * r * 0.5); ctx.stroke(); } } break; }
    case 'big': { // バンダナ
      ctx.fillStyle = '#2A6FD6'; ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r * 0.45); ctx.quadraticCurveTo(x, y - r * 1.1, x + r * 0.9, y - r * 0.45); ctx.lineTo(x + r * 0.85, y - r * 0.3); ctx.quadraticCurveTo(x, y - r * 0.8, x - r * 0.85, y - r * 0.3); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(x + i * r * 0.3, y - r * 0.62 + Math.abs(i) * r * 0.06, 2.5, 0, TAU); ctx.fill(); } break; }
    case 'turret': { // 花びら
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, r * 0.3, r * 0.16, a, 0, TAU); ctx.fill(); } break; }
    case 'carrier': { // 風船の紐の手
      break; }
  }
  ctx.restore();
}

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
    this.drop = o.drop || null; this.dropChance = o.dropChance !== undefined ? o.dropChance : (def.dropChance !== undefined ? def.dropChance : 0.03);
    this.eyeDir = { x: -0.5, y: 0 }; this.blinkT = rand(1, 4); this.blink = false; this.angry = false;
    this.isBoss = false; this.noChain = !!def.noChain; this.popImmune = 0; this.boss = null;
    if (def.init) def.init(this, o);
  }
  update(dt, g) {
    const d = dt * g.enemyTime;
    this.t += d; this.hitFlash -= dt; this.squash *= Math.max(0, 1 - 8 * dt); this.popImmune -= dt;
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.12 : rand(1.5, 4); }
    if (this.popTimer >= 0) { this.popTimer -= dt; if (this.popTimer < 0) { g.killEnemy(this, this.chainIndex); return; } }
    if (this.burst) { this.burst.t -= dt; if (this.burst.t <= 0) { this.burst.t = this.burst.interval; this.shootAimed(g, this.burst.speed, this.burst.n, this.burst.spread, this.burst.o); if (--this.burst.left <= 0) this.burst = null; } }
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
  shootBurst(g, count, speed, interval = 0.1, o = {}, n = 1, spread = 0) { this.burst = { left: count, t: 0, interval, speed, n, spread, o }; }
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
    if (this.type === 'ambusher' && this.x < 30) { // 背後からの予告
      const a = 0.5 + Math.sin(g.time * 18) * 0.5; ctx.fillStyle = `rgba(255,80,110,${0.4 + a * 0.6})`; ctx.beginPath(); ctx.moveTo(8, this.y - 14); ctx.lineTo(30, this.y); ctx.lineTo(8, this.y + 14); ctx.closePath(); ctx.fill();
      drawText(ctx, '!', 44, this.y, 22, '#FF5E7A', 'center', { outline: '#fff' });
    }
    const o = { t: this.t, phase: this.phase, eyeDir: this.eyeDir, blink: this.blink, flash: this.hitFlash, squash: this.squash, marked: this.popTimer >= 0, angry: this.angry || (this.type === 'ojama') };
    if (this.color === 5) o.glow = 14;
    drawPuyo(ctx, this.x, this.y, this.r, col, o);
    drawAccessory(ctx, this, col);
    if (this.type === 'mine') { // 導火線
      ctx.strokeStyle = '#5C3A2E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(this.x, this.y - this.r); ctx.quadraticCurveTo(this.x + 6, this.y - this.r - 14, this.x + 14, this.y - this.r - 12); ctx.stroke();
      const k = 0.5 + Math.sin(this.t * 20) * 0.5; ctx.fillStyle = this.fuse > 0 ? '#FF5E3A' : '#FFD84D'; ctx.beginPath(); ctx.arc(this.x + 14, this.y - this.r - 12, 3 + k * 2 + this.fuse * 6, 0, TAU); ctx.fill();
      if (this.fuse > 0) drawText(ctx, '!', this.x, this.y - this.r - 28, 20, '#FF5E3A', 'center', { outline: '#fff' });
    }
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
