'use strict';
// ===== ゲーム本体 =====
const DIFFS = [
  { name: 'やさしい', hp: 0.7, bspeed: 0.8, fire: 0.75, lives: 5, bombs: 3, color: '#7ED957' },
  { name: 'ふつう', hp: 1.0, bspeed: 1.0, fire: 1.0, lives: 3, bombs: 3, color: '#5EC8FF' },
  { name: 'むずかしい', hp: 1.5, bspeed: 1.3, fire: 1.55, lives: 2, bombs: 2, color: '#FF5E7A' },
];
const PLAYER_DMG_SCALE = 1.0; // 自機の全弾ダメージ係数（武器ごとの数値で調整済み）
const ENEMY_HP_SCALE = 2.5; // 通常の敵の HP 係数（元の 1.25 の 2 倍）
const CHAIN_WORDS = [[12, 'きせき！！！'], [9, 'ばくはつ！！'], [7, 'すごい！！'], [5, 'ナイス！'], [3, 'いいね！'], [0, '']];

class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * this.dpr; canvas.height = H * this.dpr;
    this.particles = new Particles(1100); this.texts = new FloatTexts();
    this.bullets = []; this.enemies = []; this.ebullets = []; this.items = [];
    this.diffIndex = 1; this.diff = DIFFS[1];
    this.player = new Player(this);
    this.state = 'title'; this.stateT = 0; this.time = 0; this.scroll = 0; this.scrollSpeed = 60;
    this.stageIndex = 0; this.waves = []; this.waveIdx = 0; this.stageTime = 0; this.phase = 'waves'; this.phaseT = 0;
    this.score = 0; this.stageStartScore = 0; this.hi = 0; try { this.hi = parseInt(localStorage.getItem('tetorisu_hi') || '0', 10) || 0; } catch (e) { /* ストレージ不可の環境 */ }
    this.shakeAmt = 0; this.shakeX = 0; this.shakeY = 0; this.flash = 0;
    this.chainCount = 0; this.chainShowT = 0; this.maxChain = 0; this.popCount = 0; this.stagePop = 0; this.stageMaxChain = 0; this.stageDeaths = 0;
    this.fever = 0; this.feverT = 0; this.dmgMul = 1; this.enemyTime = 1; this.hitStop = 0; this.fireRate = 1; this.progress = 0;
    this.bombT = -1; this.bombGrid = null; this.optionFire = false;
    this.bosses = []; this.bossDiePos = []; this.bossExplodeAcc = 0;
    this.titleCursor = 1; this.paused = false; this.clearBonus = 0;
    this.reached = 0; try { this.reached = clamp(parseInt(localStorage.getItem('tetorisu_reached') || '0', 10) || 0, 0, STAGES.length - 1); } catch (e) { /* ignore */ }
    this.startStageSel = 0;
    this.titlePuyos = Array.from({ length: 9 }, (_, i) => ({ x: rand(60, W - 60), y: rand(80, H - 60), r: rand(22, 40), c: i % 5, vx: rand(-60, 60), vy: rand(-40, 40), ph: rand(TAU) }));
    this.allClear = false;
  }
  // ---------- 便利 ----------
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  addScore(n, x, y, show = true) {
    n = Math.round(n * (this.player.timers.score > 0 ? 2 : 1));
    this.score += n;
    if (show && x !== undefined) this.texts.add(x, y, `+${n}`, n >= 1000 ? '#FFE066' : '#fff', n >= 1000 ? 20 : 15, { life: 0.8 });
  }
  addBullet(b) {
    const p = this.player;
    b.dmg *= PLAYER_DMG_SCALE;
    if (this.optionFire) { b.dmg *= 0.45; b.size *= 0.72; b.fromOption = true; }
    else if (p.wide > 0 && !b.big) b.size *= 1 + 0.14 * p.wide;
    b.r = shapeRadius(b.shape, b.size) * 0.85;
    this.bullets.push(b);
  }
  addEBullet(b) { this.ebullets.push(b); }
  spawnEnemy(e) {
    if (!e.isBoss) { const mul = this.diff.hp * STAGES[this.stageIndex].hpMul * ENEMY_HP_SCALE; e.maxHp *= mul; e.hp = e.maxHp; }
    this.enemies.push(e);
  }
  spawnItem(key, x, y) { if (!ITEMS[key]) return; this.items.push(new Item(key, x, y)); }
  nearestEnemy(x, y, maxD = 9999, exclude = null) {
    let best = null, bd = maxD * maxD;
    for (const e of this.enemies) {
      if (e.dead || !e.entered || e.popTimer >= 0 || (e.isBoss && e.state === 'enter')) continue;
      if (exclude && exclude.has && exclude.has(e.id)) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  areaDamage(x, y, r, dmg, o = {}) {
    for (const e of this.enemies) {
      if (e.dead || !e.entered || e.id === o.exclude) continue;
      if (dist(x, y, e.x, e.y) < r + e.r) e.takeDamage(dmg, this, o.source);
    }
  }
  addFever(n) {
    if (this.feverT > 0) return;
    this.fever = Math.min(100, this.fever + n);
    if (this.fever >= 100) {
      this.feverT = 9; this.dmgMul = 1.4; Sound.sfx.fever(); this.shake(8); this.flash = 0.5;
      this.texts.add(W / 2, H / 2 - 80, 'FEVER!!', '#FF5EDB', 64, { pop: true, life: 1.5, vy: -10 });
      this.texts.add(W / 2, H / 2 - 30, 'どの色でもれんさする！', '#fff', 22, { life: 1.5, vy: -10 });
    }
  }
  megaBlast() {
    for (const e of this.enemies) {
      if (e.dead || !e.entered) continue;
      if (e.isBoss) e.takeDamage(70, this); else if (e.popTimer < 0) { e.popTimer = rand(0, 0.45); e.chainIndex = Math.max(1, e.chainIndex); }
    }
    this.ebullets.length = 0; this.flash = 0.7; this.shake(12); Sound.sfx.explode(1.6);
    this.particles.add({ type: 'ring', x: this.player.x, y: this.player.y, size: 900, color: '#FFB347', life: 0.7, lw: 14 });
    this.texts.add(W / 2, H / 2 - 60, 'メガブラスト！', '#FFB347', 44, { pop: true, life: 1.2 });
  }
  useBomb() {
    const p = this.player;
    if (!p.alive || p.bombs <= 0 || this.bombT >= 0 || this.state !== 'play') return;
    p.bombs--; this.bombT = 0; p.inv = Math.max(p.inv, 2.8); Sound.sfx.bomb(); this.shake(14);
    const keys = TETROMINO_KEYS;
    this.bombGrid = Array.from({ length: 13 }, () => Array.from({ length: 24 }, () => MINO_COLORS[pick(keys)]));
  }
  // ---------- 敵を倒す（連鎖の中心） ----------
  killEnemy(e, chain = 0) {
    if (e.dead) return;
    e.dead = true;
    const col = puyoColor(e.color, this.time);
    if (e.drawAs === 'mino') { fxMinoBurst(this.particles, e.x, e.y, e.minoColor, 10, e.shape); Sound.sfx.explode(0.5); }
    else fxPuyoPop(this.particles, e.x, e.y, e.r, col, chain);
    Sound.sfx.pop(chain);
    const mult = Math.min(64, Math.pow(2, chain));
    this.addScore(e.score * mult, e.x, e.y - e.r - 6, chain > 0 || e.score >= 300);
    this.popCount++; this.stagePop++;
    if (chain > 0) {
      this.chainCount = chain + 1; this.chainShowT = 1.4;
      this.maxChain = Math.max(this.maxChain, this.chainCount); this.stageMaxChain = Math.max(this.stageMaxChain, this.chainCount);
      if (chain >= 1) Sound.sfx.chainText(chain);
      this.shake(Math.min(10, 1 + chain * 1.2));
      if (chain >= 2) this.hitStop = Math.max(this.hitStop, 0.05 + Math.min(0.06, chain * 0.01));
      if (chain >= 4) this.flash = Math.max(this.flash, 0.18 + Math.min(0.3, chain * 0.03));
    }
    this.addFever(2 + chain * 3);
    if (e.def.onDeath) e.def.onDeath(e, this);
    if (!e.isBoss) {
      const radius = 80 + this.player.chainBonus + e.r;
      for (const o of this.enemies) {
        if (o === e || o.dead || o.popTimer >= 0 || !o.entered || o.popImmune > 0) continue;
        if (dist(e.x, e.y, o.x, o.y) - o.r > radius) continue;
        if (o.isBoss) { o.takeDamage(14 + chain * 14, this); continue; }
        const same = this.feverT > 0 || o.color === e.color || e.color === 5 || o.color === 5;
        if (same && !o.noChain) { o.popTimer = 0.14 + rand(0.06); o.chainIndex = chain + 1; }
        else o.takeDamage((10 + chain * 8) * (o.noChain ? 2 : 1), this);
      }
    }
    if (e.boss && !e.boss.dead) { e.boss.takeDamage(40 + chain * 20, this); this.texts.add(e.boss.x, e.boss.y - e.boss.r - 20, 'いたい！', '#fff', 18, { pop: true }); }
    let key = e.drop;
    if (!key && Math.random() < e.dropChance + chain * 0.005) key = randomItemKey(this);
    if (key) this.spawnItem(key, e.x, e.y);
  }
  // ---------- 状態遷移 ----------
  goTitle() {
    this.state = 'title'; this.stateT = 0; this.bullets.length = 0; this.enemies.length = 0; this.ebullets.length = 0; this.items.length = 0; this.particles.clear(); this.texts.clear(); this.paused = false; this.bombT = -1; this.feverT = 0; this.fever = 0; this.dmgMul = 1;
    Sound.play('title');
  }
  startGame() {
    this.diff = DIFFS[this.diffIndex]; this.player.resetAll(this.diffIndex);
    this.score = 0; this.maxChain = 0; this.popCount = 0; this.allClear = false;
    Sound.sfx.start();
    this.startStage(this.startStageSel);
  }
  startStage(i) {
    this.fireRate = this.diff.fire * 0.85; this.progress = 0;
    this.stageIndex = i; const st = STAGES[i];
    if (i > this.reached) { this.reached = i; try { localStorage.setItem('tetorisu_reached', String(i)); } catch (e) { /* ignore */ } }
    this.scrollSpeed = st.scroll; this.waves = generateWaves(i); this.waveIdx = 0; this.stageTime = 0; this.phase = 'waves'; this.phaseT = 0;
    this.bullets.length = 0; this.enemies.length = 0; this.ebullets.length = 0; this.items.length = 0; this.particles.clear(); this.texts.clear();
    this.bosses = []; this.bombT = -1; this.hitStop = 0; this.feverT = 0; this.fever = Math.min(this.fever, 60); this.dmgMul = 1; this.stagePop = 0; this.stageMaxChain = 0; this.stageDeaths = 0; this.chainShowT = 0;
    this.stageStartScore = this.score;
    const p = this.player; p.alive = true; p.hp = p.maxHp; p.x = -60; p.y = H / 2; p.entering = true; p.inv = 3; p.charge = 0; p.chargeReady = false;
    this.state = 'intro'; this.stateT = 0; this.paused = false;
    BG.init(i); Sound.play('stage' + i);
  }
  retryStage() { this.player.resetAll(this.diffIndex); this.score = this.stageStartScore; this.startStage(this.stageIndex); }
  startBoss() {
    const def = BOSS_DEFS[this.stageIndex];
    if (def.twins) { const a = new Boss(this, this.stageIndex, 0), b = new Boss(this, this.stageIndex, 1); a.twin = b; b.twin = a; this.bosses = [a, b]; }
    else this.bosses = [new Boss(this, this.stageIndex)];
    for (const b of this.bosses) this.enemies.push(b);
    this.phase = 'boss'; this.phaseT = 0; Sound.play('boss' + this.stageIndex);
  }
  onBossDefeated() {
    this.phase = 'bossDie'; this.phaseT = 0; this.bossExplodeAcc = 0;
    this.bossDiePos = this.bosses.map((b) => ({ x: b.x, y: b.y, r: b.r, c: b.color }));
    this.player.inv = Math.max(this.player.inv, 6); this.ebullets.length = 0;
    Sound.stop(); Sound.sfx.bossDie(); this.shake(18);
    let sc = 0; for (const b of this.bosses) sc += b.score;
    this.addScore(sc, W / 2, H / 2 - 100);
    for (const e of this.enemies) if (!e.dead && !e.isBoss && e.popTimer < 0) { e.popTimer = rand(0.1, 1.2); e.chainIndex = Math.max(1, e.chainIndex); }
  }
  stageClear() {
    this.enemies = this.enemies.filter((e) => !e.isBoss); this.bosses = [];
    this.state = 'clear'; this.stateT = 0; Sound.sfx.clear();
    this.clearBonus = this.stageMaxChain * 1000 + this.stagePop * 15 + (this.stageDeaths === 0 ? 5000 : 0) + this.player.lives * 500 + this.player.bombs * 300;
    this.score += this.clearBonus;
  }
  gameOver() { this.state = 'gameover'; this.stateT = 0; Sound.stop(); this.saveHi(); }
  ending() { this.state = 'ending'; this.stateT = 0; this.allClear = true; this.score += this.player.lives * 10000; this.saveHi(); Sound.play('title'); this.enemies.length = 0; this.ebullets.length = 0; this.bullets.length = 0; }
  saveHi() { if (this.score > this.hi) { this.hi = this.score; try { localStorage.setItem('tetorisu_hi', String(this.hi)); } catch (e) { /* ignore */ } } }

  // ---------- 更新 ----------
  update(dt) {
    Input.pollGamepad();
    if (Input.hit('mute')) { const m = Sound.toggleMute(); this.texts.add(W / 2, H - 60, m ? 'ミュート ON' : 'ミュート OFF', '#fff', 18); }
    this.time += dt; this.stateT += dt;
    this.shakeAmt *= Math.max(0, 1 - 6 * dt); this.flash = Math.max(0, this.flash - dt * 2.5);
    this.shakeX = rand(-1, 1) * this.shakeAmt; this.shakeY = rand(-1, 1) * this.shakeAmt;
    switch (this.state) {
      case 'title': this.updateTitle(dt); break;
      case 'intro': this.updateIntro(dt); break;
      case 'play': this.updatePlay(dt); break;
      case 'clear': this.updateClear(dt); break;
      case 'gameover': this.updateGameOver(dt); break;
      case 'ending': this.updateEnding(dt); break;
    }
    Input.endFrame();
  }
  updateTitle(dt) {
    this.scroll += 30 * dt;
    for (const p of this.titlePuyos) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < p.r || p.x > W - p.r) p.vx *= -1; if (p.y < 40 + p.r || p.y > H - p.r) p.vy *= -1; }
    if (Math.random() < 0.08) this.particles.add({ type: 'mino', shape: SHAPES[pick(TETROMINO_KEYS)], x: rand(W), y: -30, vy: rand(60, 120), vr: rand(-2, 2), size: rand(8, 16), color: MINO_COLORS[pick(TETROMINO_KEYS)], life: 7, alpha: 0.7 });
    this.particles.update(dt); this.texts.update(dt);
    if (Input.hit('up')) { this.titleCursor = (this.titleCursor + 2) % 3; Sound.sfx.select(); }
    if (Input.hit('down')) { this.titleCursor = (this.titleCursor + 1) % 3; Sound.sfx.select(); }
    if (Input.hit('left') && this.reached > 0) { this.startStageSel = (this.startStageSel + this.reached) % (this.reached + 1); Sound.sfx.select(); }
    if (Input.hit('right') && this.reached > 0) { this.startStageSel = (this.startStageSel + 1) % (this.reached + 1); Sound.sfx.select(); }
    if (Input.hit('confirm') && this.stateT > 0.5) { this.diffIndex = this.titleCursor; Sound.ensure(); Sound.resume(); this.startGame(); }
  }
  updateIntro(dt) {
    this.scroll += this.scrollSpeed * dt;
    this.player.update(dt);
    this.particles.update(dt); this.texts.update(dt);
    if (this.stateT > 2.8) { this.state = 'play'; this.stateT = 0; }
  }
  updatePlay(dt) {
    if (Input.hit('pause')) { this.paused = !this.paused; Sound.sfx.select(); }
    if (this.paused) return;
    const p = this.player, st = STAGES[this.stageIndex];
    this.scroll += this.scrollSpeed * dt;
    this.enemyTime = p.timers.slow > 0 ? 0.45 : 1;
    // ステージ内の進行度：敵の射撃頻度は序盤ひかえめ → 終盤に向けて激しく
    this.progress = this.phase === 'waves' ? clamp(this.stageTime / st.duration, 0, 1) : 1;
    this.fireRate = this.diff.fire * (0.85 + 0.45 * this.progress);
    if (this.feverT > 0) { this.feverT -= dt; this.fever = 100 * this.feverT / 9; if (this.feverT <= 0) { this.fever = 0; this.dmgMul = 1; } }
    // フェーズ
    this.phaseT += dt;
    if (this.phase === 'waves') {
      this.stageTime += dt;
      while (this.waveIdx < this.waves.length && this.waves[this.waveIdx].t <= this.stageTime) { this.waves[this.waveIdx].fn(this); this.waveIdx++; }
      if (this.stageTime >= st.duration) { this.phase = 'waitClear'; this.phaseT = 0; }
    } else if (this.phase === 'waitClear') {
      if (this.enemies.filter((e) => !e.dead && e.entered).length === 0 || this.phaseT > 6) { this.phase = 'warning'; this.phaseT = 0; Sound.stop(); Sound.sfx.warning(); }
    } else if (this.phase === 'warning') {
      if (this.phaseT > 2.7) this.startBoss();
    } else if (this.phase === 'boss') {
      if (this.bosses.length && this.bosses.every((b) => b.dead)) this.onBossDefeated();
    } else if (this.phase === 'bossDie') {
      this.bossExplodeAcc += dt;
      while (this.bossExplodeAcc > 0.13) {
        this.bossExplodeAcc -= 0.13;
        for (const b of this.bossDiePos) { const a = rand(TAU), rr = rand(b.r); fxPuyoPop(this.particles, b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr, rand(10, 26), puyoColor(b.c), 2); Sound.sfx.pop(randInt(0, 6)); }
        this.shake(6);
      }
      if (this.phaseT > 2.6) {
        for (const b of this.bossDiePos) { fxPuyoPop(this.particles, b.x, b.y, b.r * 1.6, puyoColor(b.c), 8); fxMinoBurst(this.particles, b.x, b.y, '#fff', 20); for (let i = 0; i < 4; i++) this.spawnItem(pick(['coin', 'gem', 'heal', 'power']), b.x + rand(-40, 40), b.y + rand(-40, 40)); }
        this.flash = 1; Sound.sfx.explode(2); this.stageClear(); return;
      }
    }
    // エンティティ
    p.update(dt);
    if (!p.alive && p.lives < 0 && p.respawnT <= 0) { this.gameOver(); return; }
    // 大れんさ時のヒットストップ（世界だけが一瞬スローになる）
    const wdt = this.hitStop > 0 ? dt * 0.22 : dt; this.hitStop -= dt;
    for (const e of this.enemies) e.update(wdt, this);
    for (const b of this.bullets) b.update(wdt, this);
    const edt = wdt * this.enemyTime;
    for (const b of this.ebullets) b.update(edt, this);
    for (const it of this.items) it.update(dt, this);
    this.collide();
    this.updateBomb(dt);
    this.particles.update(dt); this.texts.update(dt);
    if (this.chainShowT > 0) { this.chainShowT -= dt; if (this.chainShowT <= 0) this.chainCount = 0; }
    // 掃除
    this.enemies = this.enemies.filter((e) => !e.dead || e.isBoss);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.ebullets = this.ebullets.filter((b) => !b.dead);
    this.items = this.items.filter((i) => !i.dead);
  }
  collide() {
    const p = this.player;
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead || !e.entered || e.popTimer >= 0 || (e.isBoss && e.state === 'enter')) continue;
        const dx = b.x - e.x, dy = b.y - e.y, rr = b.r + e.r;
        if (dx * dx + dy * dy < rr * rr) { if (b.onHit(e, this)) { b.dead = true; break; } }
      }
    }
    if (!p.alive || p.entering) return;
    for (const e of this.enemies) {
      if (e.dead || !e.entered || (e.isBoss && e.state === 'enter')) continue;
      if (dist(p.x, p.y, e.x, e.y) < e.r * 0.85 + 12) {
        const before = p.alive;
        if (p.hit(e.isBoss ? 30 : 22) && !e.isBoss && e.popTimer < 0) e.takeDamage(45, this);
        if (before && !p.alive) this.stageDeaths++;
      }
    }
    for (const b of this.ebullets) {
      if (b.dead) continue;
      if (dist(p.x, p.y, b.x, b.y) < b.r + 11) { const before = p.alive; if (p.hit(b.kind === 'big' ? 20 : 14)) b.dead = true; if (before && !p.alive) this.stageDeaths++; }
    }
    for (const it of this.items) {
      if (it.dead) continue;
      if (dist(p.x, p.y, it.x, it.y) < 34) {
        it.dead = true; it.def.apply(this, p); fxItemGet(this.particles, it.x, it.y, it.def.color);
        if (!it.def.isWeapon) this.texts.add(it.x, it.y - 30, it.def.name, it.def.color === '#FFFFFF' ? '#fff' : it.def.color, 18, { pop: true });
      }
    }
  }
  updateBomb(dt) {
    if (this.bombT < 0) return;
    const prev = this.bombT; this.bombT += dt;
    if (prev < 0.55 && this.bombT >= 0.55) {
      for (const e of this.enemies) {
        if (e.dead || !e.entered) continue;
        if (e.isBoss) e.takeDamage(180, this); else if (e.popTimer < 0) { e.popTimer = rand(0, 0.5); e.chainIndex = Math.max(1, e.chainIndex); }
      }
      this.ebullets.length = 0; this.flash = 1; this.shake(16);
      this.texts.add(W / 2, H / 2 - 60, 'TETRIS!!', '#fff', 72, { pop: true, life: 1.3, vy: -15, outline: '#5A2A9A' });
      this.addScore(1000, W / 2, H / 2);
    }
    if (this.bombT > 1.3) this.bombT = -1;
  }
  updateClear(dt) {
    this.scroll += this.scrollSpeed * dt;
    this.player.x += (W + 100 - this.player.x) * (this.stateT > 3.5 ? 1.5 : 0) * dt;
    this.player.t += dt;
    this.particles.update(dt); this.texts.update(dt);
    for (const it of this.items) it.update(dt, this); this.items = this.items.filter((i) => !i.dead);
    const p = this.player;
    for (const it of this.items) if (dist(p.x, p.y, it.x, it.y) < 34) { it.dead = true; it.def.apply(this, p); fxItemGet(this.particles, it.x, it.y, it.def.color); }
    if (Math.random() < 0.3) this.particles.add({ type: 'star', x: rand(W), y: rand(H), size: rand(3, 8), color: pick(['#fff', '#FFE066', '#FF8FB0']), life: 0.8, shrink: true, vr: 5 });
    if (this.stateT > 5.2 || (this.stateT > 2.5 && Input.hit('confirm'))) {
      if (this.stageIndex < STAGES.length - 1) this.startStage(this.stageIndex + 1); else this.ending();
    }
  }
  updateGameOver(dt) {
    this.particles.update(dt); this.texts.update(dt);
    if (this.stateT > 1.2) {
      if (Input.hit('confirm')) { Sound.sfx.start(); this.retryStage(); }
      else if (Input.hit('back')) this.goTitle();
    }
  }
  updateEnding(dt) {
    this.scroll += 40 * dt; this.player.t += dt;
    for (const p of this.titlePuyos) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < p.r || p.x > W - p.r) p.vx *= -1; if (p.y < 40 + p.r || p.y > H - p.r) p.vy *= -1; }
    if (Math.random() < 0.3) this.particles.add({ type: 'star', x: rand(W), y: rand(H), size: rand(3, 8), color: pick(['#fff', '#FFE066', '#FF8FB0', '#8EE5FF']), life: 1, shrink: true, vr: 5 });
    this.particles.update(dt); this.texts.update(dt);
    if (this.stateT > 3 && Input.hit('confirm')) this.goTitle();
  }

  // ---------- 描画 ----------
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.save(); ctx.translate(this.shakeX, this.shakeY);
    switch (this.state) {
      case 'title': this.drawTitle(ctx); break;
      case 'intro': case 'play': this.drawPlay(ctx); if (this.state === 'intro') this.drawIntro(ctx); break;
      case 'clear': this.drawPlay(ctx); this.drawClear(ctx); break;
      case 'gameover': this.drawPlay(ctx); this.drawGameOver(ctx); break;
      case 'ending': this.drawEnding(ctx); break;
    }
    ctx.restore();
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.8})`; ctx.fillRect(0, 0, W, H); }
    Input.drawTouchUI(ctx);
  }
  drawPlay(ctx) {
    BG.draw(ctx, this, this.stageIndex);
    for (const it of this.items) it.draw(ctx);
    for (const e of this.enemies) if (!e.isBoss) e.draw(ctx, this);
    for (const e of this.enemies) if (e.isBoss) e.draw(ctx, this);
    for (const b of this.bullets) b.draw(ctx);
    for (const b of this.ebullets) b.draw(ctx, this.time);
    this.player.draw(ctx);
    this.particles.draw(ctx);
    if (this.bombT >= 0) this.drawBomb(ctx);
    this.texts.draw(ctx);
    if (this.state === 'play' || this.state === 'clear') this.drawHUD(ctx);
    if (this.feverT > 0) this.drawFeverBorder(ctx);
    if (this.player.alive && this.player.hurtFlash > 0) { // 被弾時の赤いビネット
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8); vg.addColorStop(0, 'rgba(255,40,80,0)'); vg.addColorStop(1, `rgba(255,40,80,${Math.min(1, this.player.hurtFlash * 2.5) * 0.55})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    if (this.player.alive && this.player.hp <= this.player.maxHp * 0.25 && this.state === 'play') { // HP ピンチ
      const a = 0.25 + Math.sin(this.time * 8) * 0.2; const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85); vg.addColorStop(0, 'rgba(255,0,40,0)'); vg.addColorStop(1, `rgba(255,0,40,${a})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    if (this.chainCount > 1 && this.chainShowT > 0) this.drawChain(ctx);
    if (this.phase === 'warning' && this.state === 'play') this.drawWarning(ctx);
    if (this.paused) { ctx.fillStyle = 'rgba(10,0,30,0.55)'; ctx.fillRect(0, 0, W, H); drawText(ctx, 'PAUSE', W / 2, H / 2 - 20, 56, '#fff', 'center', { outline: '#5A2A9A' }); drawText(ctx, 'P / ESC でさいかい', W / 2, H / 2 + 36, 20, '#fff'); }
  }
  drawHUD(ctx) {
    const p = this.player, st = STAGES[this.stageIndex];
    ctx.fillStyle = 'rgba(20,10,45,0.58)'; ctx.fillRect(0, 0, W, 42);
    // HP
    drawHeart(ctx, 20, 21, 9, '#FF5E7A');
    const hpw = 130, hk = clamp(p.hp / p.maxHp, 0, 1);
    roundRectPath(ctx, 34, 13, hpw, 16, 8); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    if (hk > 0) { roundRectPath(ctx, 34, 13, Math.max(10, hpw * hk), 16, 8); ctx.fillStyle = hk > 0.5 ? '#7ED957' : hk > 0.25 ? '#FFD84D' : (Math.floor(this.time * 6) % 2 ? '#FF5E7A' : '#FFB3C6'); ctx.fill(); }
    drawText(ctx, `${Math.ceil(p.hp)}/${p.maxHp}`, 34 + hpw / 2, 21, 12, '#fff', 'center', { outline: 'rgba(0,0,0,0.6)', outlineWidth: 3 });
    for (let i = 0; i < p.shield; i++) { ctx.fillStyle = '#8EE5FF'; ctx.beginPath(); ctx.arc(172 + i * 10, 21, 4, 0, TAU); ctx.fill(); }
    // 残機・ボム
    for (let i = 0; i < Math.min(6, p.lives); i++) { ctx.fillStyle = '#FFF7EC'; roundRectPath(ctx, 206 + i * 17, 14, 14, 9, 4); ctx.fill(); ctx.fillStyle = '#FF8FB0'; ctx.fillRect(206 + i * 17, 23, 8, 3); }
    drawText(ctx, p.lives > 6 ? `残機 ×${p.lives}` : '残機', 206, 34, 9, '#fff', 'left');
    for (let i = 0; i < Math.min(6, p.bombs); i++) drawMino(ctx, 318 + i * 14, 19, SHAPES.O, 5.5, MINO_COLORS.O);
    drawText(ctx, p.bombs > 6 ? `BOMB ×${p.bombs}` : 'BOMB(X)', 312, 34, 9, '#fff', 'left');
    // お供ミノ（4 スロット）
    drawText(ctx, 'お供', 405, 34, 9, '#fff', 'left');
    for (let i = 0; i < 4; i++) {
      const x = 412 + i * 17, on = i < p.options;
      if (on) { drawMino(ctx, x, 19, SHAPES.M, 12, '#FF7FAE', 0, 1, true); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 2.5, 18, 1.8, 0, TAU); ctx.arc(x + 2.5, 18, 1.8, 0, TAU); ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 6, 13, 12, 12); }
    }
    // スコア
    drawText(ctx, 'SCORE', 560, 10, 10, '#FFE3F0', 'center');
    drawText(ctx, String(this.score).padStart(8, '0'), 560, 26, 20, '#fff', 'center', { outline: 'rgba(0,0,0,0.4)', outlineWidth: 3 });
    drawText(ctx, `STAGE ${this.stageIndex + 1}`, 660, 21, 14, '#fff', 'center', { outline: 'rgba(0,0,0,0.5)', outlineWidth: 3 });
    // 武器パネル
    const w = p.weapon, lv = p.level, wc = w.rainbow ? rainbowColor(this.time * 3) : w.color;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRectPath(ctx, 710, 4, 246, 34, 8); ctx.fill();
    drawMino(ctx, 732, 21, w.key === 'R' ? SHAPES.T : w.shape, 6, wc, 0, 1, true);
    drawText(ctx, w.name, 758, 15, 14, '#fff', 'left', { outline: 'rgba(0,0,0,0.5)', outlineWidth: 3 });
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < lv ? wc : 'rgba(255,255,255,0.25)'; roundRectPath(ctx, 758 + i * 16, 25, 12, 7, 2); ctx.fill(); }
    drawText(ctx, lv >= 5 ? 'MAX' : `Lv${lv}`, 845, 29, 11, lv >= 5 ? '#FFE066' : '#fff', 'left');
    drawText(ctx, 'Q/E切替', 900, 29, 10, 'rgba(255,255,255,0.7)', 'left');
    // ステージ進行バー（ボスまでの距離）
    const pk = this.phase === 'waves' ? this.progress : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 42, W, 4);
    ctx.fillStyle = this.phase === 'waves' ? '#8EE5FF' : '#FF5E7A'; ctx.fillRect(0, 42, W * pk, 4);
    if (this.phase === 'waves') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W * pk, 44, 4, 0, TAU); ctx.fill(); }
    drawText(ctx, 'BOSS', W - 20, 53, 9, this.phase === 'waves' ? 'rgba(255,255,255,0.6)' : '#FF5E7A', 'right');
    // 所持武器
    const owned = WEAPONS.filter((ww) => p.weapons[ww.key]);
    owned.forEach((ww, i) => {
      const x = 724 + i * 24, y = 62, cur = ww.key === p.current;
      if (cur) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; roundRectPath(ctx, x - 11, y - 11, 22, 22, 5); ctx.fill(); }
      drawMino(ctx, x, y, ww.key === 'R' ? SHAPES.T : ww.shape, 4.2, ww.rainbow ? rainbowColor(this.time * 3) : ww.color, 0, cur ? 1 : 0.65);
      drawText(ctx, String(p.weapons[ww.key]), x + 8, y + 8, 9, '#fff', 'center', { outline: '#000', outlineWidth: 2 });
    });
    // フィーバーゲージ
    const fx = W / 2 - 150, fy = H - 16, fk = clamp(this.fever / 100, 0, 1);
    roundRectPath(ctx, fx, fy, 300, 10, 5); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    if (fk > 0) { roundRectPath(ctx, fx, fy, 300 * fk, 10, 5); ctx.fillStyle = this.feverT > 0 ? rainbowColor(this.time * 4) : '#FF5EDB'; ctx.fill(); }
    drawText(ctx, this.feverT > 0 ? `FEVER ${this.feverT.toFixed(1)}` : 'FEVER', W / 2, fy - 8, 11, '#fff', 'center', { outline: 'rgba(0,0,0,0.6)', outlineWidth: 3 });
    // 効果タイマー
    const tm = [['score', '×2', '#FFE44D'], ['rapid', 'RAPID', '#FF9F6F'], ['magnet', 'MAG', '#FF6F9F'], ['slow', 'SLOW', '#B8F0FF'], ['invincible', 'ムテキ', '#fff']];
    let tx = 14;
    for (const [k, label, col] of tm) if (p.timers[k] > 0) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRectPath(ctx, tx, H - 30, 64, 20, 6); ctx.fill(); drawText(ctx, `${label} ${Math.ceil(p.timers[k])}`, tx + 32, H - 20, 11, col); tx += 70; }
    if (p.speedLv > 1 || p.rear || p.missiles || p.wide || p.chainBonus) {
      const eq = []; if (p.speedLv > 1) eq.push(`SPD${p.speedLv}`); if (p.rear) eq.push('REAR'); if (p.missiles) eq.push('MSL'); if (p.wide) eq.push(`WIDE${p.wide}`); if (p.chainBonus) eq.push(`CHAIN+${p.chainBonus}`);
      drawText(ctx, eq.join('  '), 14, H - 42, 11, 'rgba(255,255,255,0.85)', 'left', { outline: 'rgba(0,0,0,0.5)', outlineWidth: 3 });
    }
    // ボス HP
    if ((this.phase === 'boss' || this.phase === 'bossDie') && this.bosses.length) {
      let hp = 0, max = 0; for (const b of this.bosses) { hp += Math.max(0, b.hp); max += b.maxHp; }
      const bx = 180, bw = W - 360, k = clamp(hp / max, 0, 1);
      roundRectPath(ctx, bx, 54, bw, 12, 6); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
      if (k > 0) { roundRectPath(ctx, bx, 54, Math.max(6, bw * k), 12, 6); ctx.fillStyle = k > 0.5 ? '#FF5E7A' : '#FF2D55'; ctx.fill(); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; roundRectPath(ctx, bx, 54, bw, 12, 6); ctx.stroke();
      const b0 = this.bosses[0];
      drawText(ctx, `${b0.name}  ${b0.bdef.en}`, W / 2, 76, 13, '#fff', 'center', { outline: 'rgba(0,0,0,0.6)', outlineWidth: 3 });
      if (b0.armorMax > 0 && b0.armorHp > 0) { roundRectPath(ctx, bx, 68, bw * (b0.armorHp / b0.armorMax), 4, 2); ctx.fillStyle = '#FFD27A'; ctx.fill(); }
    }
  }
  drawFeverBorder(ctx) {
    ctx.save(); ctx.lineWidth = 14; ctx.strokeStyle = rainbowColor(this.time * 4); ctx.globalAlpha = 0.45 + Math.sin(this.time * 10) * 0.2; ctx.strokeRect(0, 0, W, H); ctx.restore();
  }
  drawChain(ctx) {
    const n = this.chainCount, k = 1 - this.chainShowT / 1.4;
    const sc = k < 0.15 ? easeOutBack(k / 0.15) : 1, alpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    const x = W * 0.62, y = 150;
    const col = n >= 7 ? rainbowColor(this.time * 5) : n >= 4 ? '#FFE066' : '#fff';
    drawText(ctx, `${n}`, x - 40, y, 72 * sc, col, 'center', { outline: '#5A2A9A', outlineWidth: 10, alpha });
    drawText(ctx, 'れんさ！', x + 50, y + 10, 34 * sc, col, 'center', { outline: '#5A2A9A', outlineWidth: 8, alpha });
    const word = CHAIN_WORDS.find(([m]) => n >= m)[1];
    if (word) drawText(ctx, word, x, y + 56, 26 * sc, '#FF8FB0', 'center', { outline: '#5A2A9A', outlineWidth: 6, alpha });
  }
  drawWarning(ctx) {
    const t = this.phaseT, a = 0.5 + Math.sin(t * 12) * 0.5;
    ctx.fillStyle = `rgba(255,40,80,${0.18 * a})`; ctx.fillRect(0, H / 2 - 70, W, 140);
    ctx.fillStyle = 'rgba(60,0,20,0.75)'; ctx.fillRect(0, H / 2 - 50, W, 100);
    drawText(ctx, 'WARNING!!', W / 2, H / 2 - 12, 54, `rgba(255,80,110,${0.6 + a * 0.4})`, 'center', { outline: '#fff', outlineWidth: 4 });
    drawText(ctx, `${BOSS_DEFS[this.stageIndex].name} があらわれた！`, W / 2, H / 2 + 32, 20, '#fff');
    ctx.fillStyle = 'rgba(255,80,110,0.8)'; const off = (t * 300) % 80; for (let x = -80 + off; x < W; x += 80) { ctx.fillRect(x, H / 2 - 54, 40, 4); ctx.fillRect(x + 40, H / 2 + 50, 40, 4); }
  }
  drawBomb(ctx) {
    const t = this.bombT, rows = 13, cols = 24, cs = 40;
    if (!this.bombGrid) return;
    if (t < 0.55) {
      const filled = Math.floor(easeOut(t / 0.55) * rows);
      for (let r = 0; r < filled; r++) for (let c = 0; c < cols; c++) drawMino(ctx, c * cs + cs / 2, H - r * cs - cs / 2, SHAPES.M, cs, this.bombGrid[r][c], 0, 0.92);
    } else {
      const k = clamp((t - 0.55) / 0.6, 0, 1), size = cs * (1 - k);
      if (size > 1) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) drawMino(ctx, c * cs + cs / 2, H - r * cs - cs / 2, SHAPES.M, size, this.bombGrid[r][c], k * 3, 1 - k);
    }
  }
  drawIntro(ctx) {
    const t = this.stateT, st = STAGES[this.stageIndex];
    const k = t < 0.5 ? easeOut(t / 0.5) : t > 2.3 ? 1 - easeIn((t - 2.3) / 0.5) : 1;
    ctx.fillStyle = 'rgba(15,5,40,0.85)'; ctx.fillRect(0, 0, W, 80 * k); ctx.fillRect(0, H - 80 * k, W, 80 * k);
    ctx.save(); ctx.globalAlpha = clamp(k, 0, 1);
    ctx.fillStyle = 'rgba(15,5,40,0.55)'; roundRectPath(ctx, W / 2 - 300, H / 2 - 70, 600, 140, 20); ctx.fill();
    drawText(ctx, `STAGE ${this.stageIndex + 1}`, W / 2, H / 2 - 36, 30, '#FFE066', 'center', { outline: '#5A2A9A', outlineWidth: 6 });
    drawText(ctx, st.name, W / 2, H / 2 + 6, 44, '#fff', 'center', { outline: '#5A2A9A', outlineWidth: 8 });
    drawText(ctx, `${st.en}  —  ${st.sub}`, W / 2, H / 2 + 46, 18, '#FFE3F0', 'center', { outline: '#5A2A9A', outlineWidth: 4 });
    ctx.restore();
  }
  drawClear(ctx) {
    const t = this.stateT, k = Math.min(1, t / 0.6);
    ctx.fillStyle = `rgba(15,5,40,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = k;
    drawText(ctx, 'STAGE CLEAR!', W / 2, 120, 64 * easeOutBack(k), '#FFE066', 'center', { outline: '#5A2A9A', outlineWidth: 10 });
    const rows = [['スコア', String(this.score).padStart(8, '0')], ['最大れんさ', `${this.stageMaxChain} れんさ`], ['ポップしたぷよ', `${this.stagePop}`], ['クリアボーナス', `+${this.clearBonus}`], [this.stageDeaths === 0 ? 'ノーミス！' : 'ミス', this.stageDeaths === 0 ? '+5000' : `${this.stageDeaths} 回`]];
    rows.forEach(([a, b], i) => { if (t < 0.8 + i * 0.25) return; drawText(ctx, a, W / 2 - 40, 200 + i * 40, 22, '#FFE3F0', 'right', { outline: '#5A2A9A', outlineWidth: 5 }); drawText(ctx, b, W / 2 + 40, 200 + i * 40, 24, '#fff', 'left', { outline: '#5A2A9A', outlineWidth: 5 }); });
    if (t > 2.5) drawText(ctx, this.stageIndex < STAGES.length - 1 ? 'つぎのステージへ (Z)' : 'さいごのけっか (Z)', W / 2, 440, 20, `rgba(255,255,255,${0.6 + Math.sin(t * 6) * 0.4})`, 'center');
    ctx.restore();
  }
  drawGameOver(ctx) {
    const t = this.stateT, k = Math.min(1, t / 0.8);
    ctx.fillStyle = `rgba(20,0,30,${0.7 * k})`; ctx.fillRect(0, 0, W, H);
    drawText(ctx, 'GAME OVER', W / 2, 170, 70 * easeOutBack(k), '#FF5E7A', 'center', { outline: '#2A0A2A', outlineWidth: 12 });
    drawText(ctx, `SCORE ${String(this.score).padStart(8, '0')}`, W / 2, 250, 26, '#fff', 'center', { outline: '#2A0A2A', outlineWidth: 5 });
    drawText(ctx, `HI SCORE ${String(this.hi).padStart(8, '0')}`, W / 2, 285, 18, '#FFE066', 'center', { outline: '#2A0A2A', outlineWidth: 4 });
    drawText(ctx, `最大れんさ ${this.maxChain}   ポップ ${this.popCount}`, W / 2, 318, 18, '#FFE3F0', 'center', { outline: '#2A0A2A', outlineWidth: 4 });
    if (t > 1.2) { drawText(ctx, `Z / ENTER : STAGE ${this.stageIndex + 1} からリトライ`, W / 2, 390, 22, '#fff', 'center', { outline: '#2A0A2A', outlineWidth: 5 }); drawText(ctx, 'X / ESC : タイトルへ', W / 2, 425, 18, 'rgba(255,255,255,0.8)', 'center', { outline: '#2A0A2A', outlineWidth: 4 }); }
  }
  drawTitle(ctx) {
    BG.draw(ctx, this, 0);
    ctx.fillStyle = 'rgba(30,10,60,0.35)'; ctx.fillRect(0, 0, W, H);
    for (const p of this.titlePuyos) drawPuyo(ctx, p.x, p.y, p.r, puyoColor(p.c), { t: this.time, phase: p.ph, eyeDir: { x: Math.sin(this.time + p.ph), y: 0 } });
    this.particles.draw(ctx);
    const letters = 'TETORISU'.split(''), cols = ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'M'];
    const x0 = W / 2 - (letters.length * 82) / 2 + 41;
    letters.forEach((ch, i) => {
      const y = 130 + Math.sin(this.time * 3 + i * 0.6) * 10;
      drawMino(ctx, x0 + i * 82, y - 62, SHAPES[cols[i] === 'M' ? 'T' : cols[i]], 9, MINO_COLORS[cols[i]], Math.sin(this.time + i) * 0.2);
      drawText(ctx, ch, x0 + i * 82, y, 96, MINO_COLORS[cols[i]], 'center', { outline: '#2A1838', outlineWidth: 14, shadow: 'rgba(0,0,0,0.35)' });
    });
    drawText(ctx, 'テトリス × ぷよぷよ × 横スクロールシューティング', W / 2, 210, 22, '#fff', 'center', { outline: '#2A1838', outlineWidth: 6 });
    drawText(ctx, 'テトロミノでぷよを打ち抜け！　同じ色をまとめてポップさせて大れんさ！', W / 2, 242, 17, '#FFE3F0', 'center', { outline: '#2A1838', outlineWidth: 5 });
    drawText(ctx, `全 ${STAGES.length} ステージ　武器 ${WEAPONS.length} 種　ボス ${BOSS_DEFS.length} 体`, W / 2, 268, 13, 'rgba(255,255,255,0.8)', 'center', { outline: '#2A1838', outlineWidth: 4 });
    DIFFS.forEach((d, i) => {
      const y = 305 + i * 38, sel = i === this.titleCursor;
      drawText(ctx, (sel ? '▶ ' : '') + d.name + (sel ? ' ◀' : ''), W / 2, y, sel ? 28 : 22, sel ? d.color : 'rgba(255,255,255,0.75)', 'center', { outline: '#2A1838', outlineWidth: 6 });
    });
    const desc = ['残機5・敵ゆっくり。はじめての人に。', '残機3。バランスのよい難しさ。', '残機2・敵つよめ。れんさ上級者向け。'][this.titleCursor];
    drawText(ctx, desc, W / 2, 412, 15, 'rgba(255,255,255,0.85)', 'center', { outline: '#2A1838', outlineWidth: 4 });
    if (this.reached > 0) {
      const ss = STAGES[this.startStageSel];
      drawText(ctx, `◀  STAGE ${this.startStageSel + 1} ${ss.name} からスタート  ▶`, W / 2, 434, 15, '#FFE066', 'center', { outline: '#2A1838', outlineWidth: 4 });
    }
    drawText(ctx, 'Z / ENTER / タップ でスタート', W / 2, 455, 24, `rgba(255,255,255,${0.55 + Math.sin(this.time * 5) * 0.45})`, 'center', { outline: '#2A1838', outlineWidth: 6 });
    drawText(ctx, '移動: ↑↓←→ / WASD　ショット: Z　ボム: X　チャージ: C(長押し)　武器切替: Q / E　ポーズ: P　ミュート: M', W / 2, 500, 14, '#fff', 'center', { outline: '#2A1838', outlineWidth: 4 });
    drawText(ctx, 'ゲームパッド・タッチ操作にも対応', W / 2, 522, 12, 'rgba(255,255,255,0.75)', 'center', { outline: '#2A1838', outlineWidth: 3 });
    drawText(ctx, `HI SCORE ${String(this.hi).padStart(8, '0')}`, W - 16, 20, 16, '#FFE066', 'right', { outline: '#2A1838', outlineWidth: 4 });
    if (Sound.isMuted()) drawText(ctx, 'MUTE', 16, 20, 14, '#fff', 'left', { outline: '#2A1838', outlineWidth: 4 });
  }
  drawEnding(ctx) {
    BG.draw(ctx, this, STAGES.length - 1);
    ctx.fillStyle = 'rgba(10,0,30,0.45)'; ctx.fillRect(0, 0, W, H);
    for (const p of this.titlePuyos) drawPuyo(ctx, p.x, p.y, p.r, puyoColor(p.c), { t: this.time, phase: p.ph, eyeDir: { x: 0, y: -0.5 } });
    this.particles.draw(ctx);
    const t = this.stateT, k = Math.min(1, t / 0.8);
    drawText(ctx, 'ALL CLEAR!!', W / 2, 110, 76 * easeOutBack(k), rainbowColor(this.time * 2), 'center', { outline: '#2A1838', outlineWidth: 14 });
    drawText(ctx, 'テトロディメンションに平和がもどった！', W / 2, 175, 24, '#fff', 'center', { outline: '#2A1838', outlineWidth: 6 });
    drawText(ctx, 'ぷよたちもテトロミノもみんななかよし。あそんでくれてありがとう！', W / 2, 208, 17, '#FFE3F0', 'center', { outline: '#2A1838', outlineWidth: 5 });
    const rows = [['FINAL SCORE', String(this.score).padStart(8, '0')], ['HI SCORE', String(this.hi).padStart(8, '0')], ['最大れんさ', `${this.maxChain} れんさ`], ['ポップしたぷよ', `${this.popCount}`], ['なんいど', DIFFS[this.diffIndex].name]];
    rows.forEach(([a, b], i) => { if (t < 1 + i * 0.3) return; drawText(ctx, a, W / 2 - 30, 265 + i * 36, 20, '#FFE3F0', 'right', { outline: '#2A1838', outlineWidth: 5 }); drawText(ctx, b, W / 2 + 30, 265 + i * 36, 24, '#fff', 'left', { outline: '#2A1838', outlineWidth: 5 }); });
    // パレード
    const px = ((t * 120) % (W + 300)) - 150;
    this.player.x = px; this.player.y = 470 + Math.sin(t * 3) * 10; this.player.alive = true; this.player.inv = 0; this.player.draw(ctx);
    for (let i = 0; i < 5; i++) drawPuyo(ctx, px - 70 - i * 50, 470 + Math.sin(t * 6 + i) * 12, 18, puyoColor(i), { t: this.time + i, eyeDir: { x: 1, y: 0 } });
    if (t > 3) drawText(ctx, 'Z / ENTER でタイトルへ', W / 2, 520, 18, `rgba(255,255,255,${0.6 + Math.sin(t * 5) * 0.4})`, 'center', { outline: '#2A1838', outlineWidth: 4 });
  }
}
