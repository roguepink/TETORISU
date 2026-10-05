'use strict';
// ===== 自機（かわいい飛行機） =====
class Player {
  constructor(g) { this.g = g; this.resetAll(1); }
  resetAll(diff) {
    const d = DIFFS[diff];
    this.lives = d.lives; this.bombs = d.bombs; this.maxHp = 100; this.hp = 100;
    this.weapons = { T: 1 }; this.current = 'T';
    this.options = 0; this.rear = false; this.missiles = false; this.shield = 0; this.speedLv = 1; this.wide = 0;
    this.chainBonus = 0; this.chargeSpeed = 1;
    this.timers = { score: 0, rapid: 0, magnet: 0, slow: 0, invincible: 0 };
    this.x = 120; this.y = H / 2; this.vx = 0; this.vy = 0; this.alive = true; this.inv = 0; this.hurtFlash = 0;
    this.fireTimer = 0; this.fireCount = 0; this.missileTimer = 0; this.charge = 0; this.charging = false; this.chargeReady = false; this.chargeTick = 0;
    this.t = 0; this.blinkT = 2; this.blink = false; this.entering = false; this.respawnT = 0; this.optionAng = 0; this.optPos = []; this.optionTimer = 0;
  }
  respawn() {
    this.alive = true; this.hp = this.maxHp; this.x = -60; this.y = H / 2; this.inv = 3.2; this.entering = true; this.charge = 0; this.chargeReady = false;
    for (const k in this.timers) this.timers[k] = 0;
  }
  get weapon() { return WEAPONS[WEAPON_INDEX[this.current]]; }
  get level() { return this.weapons[this.current] || 1; }
  get speed() { return 230 + this.speedLv * 38; }
  get invincible() { return this.inv > 0 || this.timers.invincible > 0; }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); this.g.texts.add(this.x, this.y - 40, `+${n}`, '#FF8FB0', 20, { pop: true }); }
  gainWeapon(key) {
    const w = WEAPONS[WEAPON_INDEX[key]];
    if (this.weapons[key]) {
      if (this.weapons[key] >= 5) { this.g.addScore(2000, this.x, this.y - 44); this.g.texts.add(this.x, this.y - 70, `${w.name} MAX!`, w.color, 20, { pop: true }); }
      else { this.weapons[key]++; this.g.texts.add(this.x, this.y - 48, `${w.name} Lv${this.weapons[key]}!`, w.rainbow ? '#fff' : w.color, 22, { pop: true }); }
      Sound.sfx.powerup();
    } else {
      this.weapons[key] = Math.max(1, Math.min(5, Math.floor(this.level * 0.6)));
      this.g.texts.add(this.x, this.y - 48, `NEW! ${w.name}`, w.rainbow ? '#fff' : w.color, 24, { pop: true });
      this.g.texts.add(this.x, this.y - 24, w.desc, '#fff', 14, { life: 1.8, vy: -30 });
      Sound.sfx.weapon();
    }
    this.current = key;
  }
  powerUp() {
    if (this.level < 5) { this.weapons[this.current]++; this.g.texts.add(this.x, this.y - 48, `POWER UP! Lv${this.level}`, '#FFB347', 22, { pop: true }); }
    else { // 既に MAX なら他の武器も強化
      let up = false; for (const k in this.weapons) if (this.weapons[k] < 5) { this.weapons[k]++; up = true; }
      this.g.texts.add(this.x, this.y - 48, up ? 'ぜんぶ POWER UP!' : 'MAX POWER!', '#FFB347', 22, { pop: true });
      if (!up) this.g.addScore(3000, this.x, this.y - 70);
    }
  }
  switchWeapon(dir) {
    const keys = WEAPONS.map((w) => w.key).filter((k) => this.weapons[k]);
    if (keys.length <= 1) return;
    const i = keys.indexOf(this.current);
    this.current = keys[(i + dir + keys.length) % keys.length];
    this.fireTimer = Math.min(this.fireTimer, 0.08);
    Sound.sfx.switchWeapon();
    this.g.texts.add(this.x, this.y - 44, this.weapon.name, this.weapon.rainbow ? '#fff' : this.weapon.color, 18);
  }
  hit(dmg) {
    if (!this.alive || this.invincible || this.g.bombT >= 0) return false;
    if (this.shield > 0) {
      this.shield--; this.inv = 0.8; Sound.sfx.shieldHit();
      this.g.particles.add({ type: 'ring', x: this.x, y: this.y, size: 70, color: '#8EE5FF', life: 0.35, lw: 5 });
      if (this.shield === 0) this.g.texts.add(this.x, this.y - 44, 'シールド消失', '#8EE5FF', 16);
      return true;
    }
    this.hp -= dmg; this.inv = 1.3; this.hurtFlash = 0.3; Sound.sfx.hurt(); this.g.shake(7);
    fxSparkle(this.g.particles, this.x, this.y, '#FF5E7A', 10);
    if (this.hp <= 0) this.die();
    return true;
  }
  die() {
    this.alive = false; this.hp = 0; this.lives--; this.respawnT = 1.8; this.charge = 0; this.chargeReady = false;
    Sound.sfx.death(); this.g.shake(16);
    fxExplosion(this.g.particles, this.x, this.y, 50, '#FFB7C5');
    for (let i = 0; i < 12; i++) fxMinoBurst(this.g.particles, this.x, this.y, pick(Object.values(MINO_COLORS)), 2);
    // 装備ロスト
    this.options = Math.max(0, this.options - 1); this.shield = 0; this.missiles = false; this.rear = false;
    if (this.level > 1) this.weapons[this.current]--;
    for (const k in this.timers) this.timers[k] = 0;
  }
  update(dt) {
    const g = this.g;
    this.t += dt; this.inv -= dt; this.hurtFlash -= dt; this.optionAng += dt * 2.4;
    for (const k in this.timers) if (this.timers[k] > 0) this.timers[k] -= dt;
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.12 : rand(2, 5); }
    if (!this.alive) {
      this.respawnT -= dt;
      if (this.respawnT <= 0 && this.lives >= 0) this.respawn();
      return;
    }
    if (this.entering) { this.x += 260 * dt; if (this.x >= 120) { this.x = 120; this.entering = false; } }
    else {
      const ax = Input.axis(), td = Input.consumeTouchDelta();
      let nx = this.x + ax.x * this.speed * dt + td.x * 1.15, ny = this.y + ax.y * this.speed * dt + td.y * 1.15;
      this.vx = (nx - this.x) / dt; this.vy = (ny - this.y) / dt;
      this.x = clamp(nx, 24, W - 40); this.y = clamp(ny, 56, H - 24);
    }
    // 排気
    if (Math.random() < 0.7) g.particles.add({ type: 'circle', x: this.x - 34, y: this.y + 2 + rand(-3, 3), vx: -160 + rand(-40, 40), vy: rand(-20, 20), size: rand(3, 6), color: pick(['#FFE3A0', '#FFB7C5', '#fff']), life: 0.35, shrink: true, alpha: 0.8 });
    // 射撃
    const w = this.weapon, lv = this.level;
    this.fireTimer -= dt;
    if (Input.down('fire') && !this.entering) {
      if (this.fireTimer <= 0) {
        w.fire(g, this, lv);
        let cd = w.cooldown(lv); if (this.timers.rapid > 0) cd *= 0.6; if (g.feverT > 0) cd *= 0.75;
        this.fireTimer = cd; this.fireCount++;
        Sound.sfx.shoot(WEAPON_INDEX[this.current]);
        const col = w.rainbow ? rainbowColor(this.t * 3) : w.color;
        if (this.rear && this.fireCount % 2 === 0) fireRearShot(g, this, col, lv);
      }
    } else if (this.fireTimer < 0) this.fireTimer = 0;
    // オプション（お供ミノ）：機体の周りに最大 4 つ。少し遅れて追従し、弱めの本体武器を撃つ
    const slots = [[-38, -42], [-38, 42], [-66, -22], [-66, 22]];
    while (this.optPos.length < this.options) this.optPos.push({ x: this.x - 40, y: this.y });
    this.optPos.length = this.options;
    for (let i = 0; i < this.options; i++) {
      const o = this.optPos[i], tx = this.x + slots[i][0], ty = this.y + slots[i][1] + Math.sin(this.t * 4 + i * 1.5) * 4, k = Math.min(1, 9 * dt);
      o.x += (tx - o.x) * k; o.y += (ty - o.y) * k;
    }
    this.optionTimer -= dt;
    if (this.options > 0 && Input.down('fire') && !this.entering && this.optionTimer <= 0) {
      // 順番に 1 つずつハート型の誘導ミサイルを撃つ。数が増えるほど弾幕が厚くなる
      this.optionTimer = (0.42 / this.options) * (this.timers.rapid > 0 ? 0.7 : 1) * (g.feverT > 0 ? 0.8 : 1);
      this.optionShot = (this.optionShot || 0) + 1;
      const o = this.optPos[this.optionShot % this.optPos.length];
      if (o) { fireOptionMissile(g, o.x, o.y, w.rainbow ? rainbowColor(this.t * 3) : '#FF7FAE', lv); Sound.sfx.optionShot(); }
    }
    if (this.missiles) { this.missileTimer -= dt; if (this.missileTimer <= 0 && Input.down('fire')) { this.missileTimer = 0.5; fireMissiles(g, this, w.rainbow ? '#fff' : w.color, lv); } }
    // チャージ
    const chg = Input.down('charge') && !this.entering;
    if (chg) {
      this.charging = true; this.charge += dt * this.chargeSpeed * 0.85;
      this.chargeTick -= dt; if (this.chargeTick <= 0) { this.chargeTick = 0.1; Sound.sfx.charge(Math.min(1, this.charge)); }
      if (this.charge >= 1 && !this.chargeReady) { this.chargeReady = true; Sound.sfx.chargeReady(); fxSparkle(g.particles, this.x, this.y, w.rainbow ? '#fff' : w.color, 12); }
      if (Math.random() < this.charge) g.particles.add({ type: 'cell', x: this.x + rand(-50, 50), y: this.y + rand(-50, 50), vx: 0, vy: 0, size: 5, color: w.rainbow ? rainbowColor(this.t * 3) : w.color, life: 0.3, shrink: true, vr: 8 });
    } else if (this.charging) {
      this.charging = false;
      if (this.charge >= 0.45) fireChargeShot(g, this, w, lv, Math.min(1.5, this.charge));
      this.charge = 0; this.chargeReady = false;
    }
    // ボム
    if (Input.hit('bomb')) g.useBomb();
    if (Input.hit('prev')) this.switchWeapon(-1);
    if (Input.hit('next')) this.switchWeapon(1);
  }
  optionPos(i) { return this.optPos[i] || { x: this.x - 40, y: this.y }; }
  draw(ctx) {
    if (!this.alive) return;
    const g = this.g, t = this.t, w = this.weapon, wcol = w.rainbow ? rainbowColor(t * 3) : w.color;
    // オプション
    for (let i = 0; i < this.options; i++) { // お供ミノ（顔つき）
      const p = this.optionPos(i);
      drawMino(ctx, p.x, p.y, SHAPES.M, 16, wcol, Math.sin(t * 3 + i) * 0.15, 1, true);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - 3.5, p.y - 1, 2.8, 0, TAU); ctx.arc(p.x + 3.5, p.y - 1, 2.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2A1838'; ctx.beginPath(); ctx.arc(p.x - 2.5, p.y - 1, 1.4, 0, TAU); ctx.arc(p.x + 4.5, p.y - 1, 1.4, 0, TAU); ctx.fill();
    }
    // シールド
    if (this.shield > 0) {
      ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.08; ctx.fillStyle = '#8EE5FF'; ctx.beginPath(); ctx.arc(this.x, this.y, 44, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.8; ctx.strokeStyle = '#D8F6FF'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
      for (let i = 0; i < this.shield; i++) { ctx.fillStyle = '#8EE5FF'; ctx.beginPath(); ctx.arc(this.x - 10 + i * 10, this.y - 50, 4, 0, TAU); ctx.fill(); }
    }
    // チャージリング
    if (this.charge > 0) {
      const k = Math.min(1, this.charge);
      ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = this.chargeReady ? rainbowColor(t * 6) : wcol; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(this.x, this.y, 50 + (this.chargeReady ? Math.sin(t * 20) * 4 : 0), -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); ctx.restore();
      if (this.chargeReady) drawMino(ctx, this.x + 70, this.y, w.key === 'R' ? SHAPES.T : w.shape, 8 + Math.sin(t * 15) * 2, wcol, t * 3, 0.9, true);
    }
    // 点滅（無敵）
    if (this.inv > 0 && this.timers.invincible <= 0 && Math.floor(t * 20) % 2 === 0 && !this.entering) ctx.globalAlpha = 0.45;
    const tilt = clamp(this.vy / 600, -1, 1);
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(tilt * 0.22);
    // プロペラ
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(36, 0, 3, 22 * Math.abs(Math.sin(t * 38)) + 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FF9FB6'; ctx.beginPath(); ctx.arc(34, 0, 4.5, 0, TAU); ctx.fill();
    // 尾翼
    ctx.fillStyle = '#FF8FB0'; ctx.beginPath(); ctx.moveTo(-20, -8); ctx.lineTo(-33, -27); ctx.lineTo(-38, -27); ctx.lineTo(-33, -4); ctx.closePath(); ctx.fill();
    drawHeart(ctx, -31, -17, 3.2, '#fff');
    ctx.fillStyle = '#FF8FB0'; roundRectPath(ctx, -38, -4, 16, 9, 4); ctx.fill();
    // 上の翼
    ctx.fillStyle = '#FF9FB6'; roundRectPath(ctx, -12, -24, 22, 9, 4); ctx.fill();
    // 本体
    ctx.fillStyle = '#FFF7EC'; roundRectPath(ctx, -32, -14, 66, 28, 14); ctx.fill();
    ctx.strokeStyle = '#E8C2B0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#FFB7C5'; roundRectPath(ctx, -28, 3, 56, 8, 4); ctx.fill();
    // 下の翼
    ctx.fillStyle = '#FF8FB0'; roundRectPath(ctx, -14, 6, 30, 12, 6); ctx.fill();
    ctx.fillStyle = '#fff'; roundRectPath(ctx, -8, 9, 14, 3, 1.5); ctx.fill();
    // 顔
    const eyeShift = this.vx > 50 ? 1.5 : 0;
    for (const ex of [10, 22]) {
      if (this.blink) { ctx.strokeStyle = '#4A2A3A'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 4, -4); ctx.lineTo(ex + 4, -4); ctx.stroke(); continue; }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, -4, 5.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4A2A3A'; ctx.beginPath(); ctx.arc(ex + 1.2 + eyeShift, -3.5, 3.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 2.2 + eyeShift, -5, 1.2, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#4A2A3A'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(16, 1, 3.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,150,0.45)'; ctx.beginPath(); ctx.ellipse(5, 2, 3.5, 2.2, 0, 0, TAU); ctx.ellipse(28, 2, 3.5, 2.2, 0, 0, TAU); ctx.fill();
    // 武器カラーのマーク
    drawMino(ctx, -14, -2, w.key === 'R' ? SHAPES.T : w.shape, 3.4, wcol, 0);
    if (this.hurtFlash > 0) { ctx.globalAlpha = Math.min(1, this.hurtFlash * 3); ctx.fillStyle = '#fff'; roundRectPath(ctx, -32, -14, 66, 28, 14); ctx.fill(); }
    ctx.restore();
    ctx.globalAlpha = 1;
    // ムテキのオーラ
    if (this.timers.invincible > 0) {
      ctx.save(); ctx.strokeStyle = rainbowColor(t * 5); ctx.lineWidth = 4; ctx.globalAlpha = 0.8; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -t * 80;
      ctx.beginPath(); ctx.arc(this.x, this.y, 46, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }
}
