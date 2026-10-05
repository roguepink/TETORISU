'use strict';
// ===== ステージ定義・背景・ウェーブ =====
const STAGES = [
  { name: 'スカイガーデン', en: 'SKY GARDEN', sub: 'そよ風とぷよの空', duration: 72, scroll: 60, hpMul: 1.0, spawnMul: 1.0, textColor: '#2A5A8A' },
  { name: 'キャンディオーシャン', en: 'CANDY OCEAN', sub: 'あまあまの海をとびこえて', duration: 84, scroll: 72, hpMul: 1.3, spawnMul: 1.15, textColor: '#8A2A6A' },
  { name: 'ネオンナイトシティ', en: 'NEON NIGHT CITY', sub: '雨とネオンのはざまで', duration: 94, scroll: 100, hpMul: 1.65, spawnMul: 1.3, textColor: '#FF5EDB' },
  { name: 'クリスタルケイブ', en: 'CRYSTAL CAVE', sub: 'きらめく洞窟のおくへ', duration: 100, scroll: 55, hpMul: 2.0, spawnMul: 1.45, textColor: '#8EF5E0' },
  { name: 'テトロディメンション', en: 'TETRO DIMENSION', sub: 'すべてのミノがうまれる場所', duration: 110, scroll: 125, hpMul: 2.4, spawnMul: 1.6, textColor: '#D8B4FF' },
];

// ---- スポーンヘルパー ----
const SP = {
  line(g, o = {}) {
    const color = o.color !== undefined ? o.color : randInt(0, 4), n = o.n || 5, y = o.y !== undefined ? o.y : rand(95, H - 70), gap = o.gap || 48, phase = rand(TAU);
    for (let i = 0; i < n; i++) g.spawnEnemy(new Enemy('drift', W + 40 + i * gap, y, { color, phase, amp: o.amp !== undefined ? o.amp : 28, speed: o.speed }));
  },
  snake(g, o = {}) {
    const n = o.n || 8, y = rand(110, H - 90), c1 = randInt(0, 4), c2 = (c1 + randInt(1, 4)) % 5;
    for (let i = 0; i < n; i++) g.spawnEnemy(new Enemy('drift', W + 40 + i * 46, y, { color: Math.floor(i / 2) % 2 ? c2 : c1, phase: -i * 0.5, amp: 60, speed: o.speed || 140 }));
  },
  formation(g, o = {}) {
    const shape = SHAPES[o.shape || pick(TETROMINO_KEYS)], color = o.color !== undefined ? o.color : randInt(0, 4), cell = 44;
    const cx = W + 80, cy = o.y !== undefined ? o.y : rand(120, H - 140), phase = rand(TAU);
    for (const [sx, sy] of shape) g.spawnEnemy(new Enemy('cluster', cx + sx * cell, cy + sy * cell, { color, phase, amp: o.amp !== undefined ? o.amp : 24, speed: o.speed }));
  },
  twoFormations(g) { SP.formation(g, { y: rand(90, 200) }); SP.formation(g, { y: rand(300, H - 140) }); },
  colorBurst(g, o = {}) {
    const color = randInt(0, 4), n = o.n || 9, cx = W + 120, cy = rand(130, H - 130), phase = rand(TAU);
    for (let i = 0; i < n; i++) g.spawnEnemy(new Enemy('drift', cx + rand(-70, 70), clamp(cy + rand(-80, 80), 70, H - 40), { color, phase: phase + rand(-0.3, 0.3), amp: 14, speed: o.speed || 105 }));
  },
  wall(g, o = {}) {
    const gapY = o.gapY !== undefined ? o.gapY : rand(130, H - 130), gapH = o.gapH || 120; let c = randInt(0, 4);
    for (let y = 64; y < H - 8; y += 40) {
      if (Math.abs(y - gapY) < gapH / 2) continue;
      if (Math.random() < 0.35) c = randInt(0, 4);
      g.spawnEnemy(new Enemy('wall', W + 40 + (o.dx || 0), y, { color: c, speed: o.speed || 130 }));
    }
  },
  doubleWall(g) { const gy = rand(130, H - 130); SP.wall(g, { gapY: gy }); SP.wall(g, { gapY: H + 100 - gy, dx: 160 }); },
  spinner(g, o = {}) {
    const n = o.n || 5, color = randInt(0, 4), cx = W + 90, cy = rand(150, H - 130), rad = o.rad || 62, spin = pick([-2.2, 2.2]);
    for (let i = 0; i < n; i++) g.spawnEnemy(new Enemy('spinner', cx, cy, { color, cx, cy, ang: (i / n) * TAU, rad, spin, speed: o.speed || 90 }));
  },
  bigSpinner(g) { SP.spinner(g, { n: 8, rad: 95, speed: 70 }); },
  shooter(g, o = {}) { g.spawnEnemy(new Enemy('shooter', W + 40, o.y !== undefined ? o.y : rand(100, H - 80), {})); },
  shooters(g) { SP.shooter(g, { y: rand(90, 200) }); SP.shooter(g, { y: rand(320, H - 80) }); },
  big(g, o = {}) { g.spawnEnemy(new Enemy('big', W + 60, o.y !== undefined ? o.y : rand(120, H - 100), {})); },
  twoBig(g) { SP.big(g, { y: rand(100, 200) }); SP.big(g, { y: rand(320, H - 90) }); },
  dasher(g, o = {}) { const n = o.n || 1, color = randInt(0, 4); for (let i = 0; i < n; i++) g.spawnEnemy(new Enemy('dasher', W + 40 + i * 70, rand(90, H - 70), { color })); },
  dashers(g) { SP.dasher(g, { n: 3 }); },
  bouncers(g, o = {}) { const n = o.n || 3, color = randInt(0, 4); for (let i = 0; i < n; i++) g.spawnEnemy(new Enemy('bouncer', W + 40 + i * 90, i % 2 ? 90 : H - 60, { color, dir: i % 2 ? 1 : -1 })); },
  homers(g, o = {}) { const n = o.n || 3, color = randInt(0, 4); for (let i = 0; i < n; i++) g.spawnEnemy(new Enemy('homer', W + 40 + i * 60, rand(90, H - 70), { color })); },
  turrets(g) { g.spawnEnemy(new Enemy('turret', W + 40, 0, { top: true })); g.spawnEnemy(new Enemy('turret', W + 160, 0, { top: false })); },
  turretTop(g) { g.spawnEnemy(new Enemy('turret', W + 40, 0, { top: Math.random() < 0.5 })); },
  ojama(g, o = {}) { g.spawnEnemy(new Enemy('ojama', W + 50, o.y !== undefined ? o.y : rand(100, H - 80), {})); },
  ojamaLine(g) { const y = rand(100, H - 80); for (let i = 0; i < 3; i++) g.spawnEnemy(new Enemy('ojama', W + 50 + i * 70, y, {})); },
  rainbow(g) { g.spawnEnemy(new Enemy('rainbow', W + 40, rand(100, H - 80), { color: 5 })); },
  carrier(g, item) {
    const p = g.player; let key = item;
    if (!key) {
      const missing = WEAPONS.map((w) => w.key).filter((k) => !p.weapons[k]);
      const upgradable = WEAPONS.map((w) => w.key).filter((k) => p.weapons[k] && p.weapons[k] < 5);
      key = 'W_' + (missing.length && Math.random() < 0.65 ? pick(missing) : upgradable.length ? pick(upgradable) : pick(WEAPONS).key);
    }
    g.spawnEnemy(new Enemy('carrier', W + 40, rand(110, H - 90), { drop: key }));
  },
  goodCarrier(g) { SP.carrier(g, pick(['option', 'shield', 'missile', 'rear', 'healBig', 'bomb', 'maxhp', 'power', 'power', 'oneup', 'speed', 'chain', 'chargeup', 'wide'])); },
  mixedCluster(g) { // 2 色が隣り合う大きな塊
    const c1 = randInt(0, 4), c2 = (c1 + randInt(1, 4)) % 5, cx = W + 90, cy = rand(140, H - 140), phase = rand(TAU);
    for (let i = 0; i < 12; i++) { const col = i < 6 ? c1 : c2; g.spawnEnemy(new Enemy('cluster', cx + Math.floor(i / 3) * 44, cy + (i % 3) * 44 - 44, { color: col, phase, amp: 22, speed: 110 })); }
  },
  rainMinis(g) { const color = randInt(0, 4); for (let i = 0; i < 6; i++) g.spawnEnemy(new Enemy('bouncer', W + 40 + i * 50, 80, { color, dir: 1, speed: 180 })); },
};

const POOLS = [
  [ { w: 5, gap: 3.4, fn: SP.line }, { w: 4, gap: 3.6, fn: SP.formation }, { w: 2, gap: 4.2, fn: SP.shooter }, { w: 1.5, gap: 4.6, fn: SP.big }, { w: 2.5, gap: 3.4, fn: SP.colorBurst }, { w: 1.5, gap: 4, fn: SP.spinner }, { w: 1, gap: 3, fn: SP.dasher }, { w: 1.5, gap: 3.5, fn: SP.snake } ],
  [ { w: 4, gap: 3, fn: SP.line }, { w: 4, gap: 3.2, fn: SP.formation }, { w: 2, gap: 4, fn: SP.shooter }, { w: 2, gap: 4.4, fn: SP.big }, { w: 2.5, gap: 3.2, fn: SP.colorBurst }, { w: 2, gap: 3.6, fn: SP.spinner }, { w: 2, gap: 3, fn: SP.bouncers }, { w: 2, gap: 4.5, fn: SP.wall }, { w: 2, gap: 3.4, fn: SP.snake }, { w: 1, gap: 3.4, fn: SP.dashers }, { w: 1, gap: 4, fn: SP.ojama }, { w: 1.5, gap: 3.6, fn: SP.mixedCluster } ],
  [ { w: 3, gap: 2.8, fn: SP.line }, { w: 3, gap: 3, fn: SP.formation }, { w: 2, gap: 3.4, fn: SP.twoFormations }, { w: 2.5, gap: 3.8, fn: SP.shooters }, { w: 2, gap: 4, fn: SP.big }, { w: 2, gap: 3, fn: SP.colorBurst }, { w: 2, gap: 3.2, fn: SP.homers }, { w: 2, gap: 4.2, fn: SP.turrets }, { w: 1.5, gap: 4.4, fn: SP.wall }, { w: 2, gap: 3, fn: SP.bouncers }, { w: 1.5, gap: 3.4, fn: SP.dashers }, { w: 1.5, gap: 3.2, fn: SP.spinner }, { w: 1, gap: 3.8, fn: SP.ojama }, { w: 1.5, gap: 3.4, fn: SP.mixedCluster }, { w: 1, gap: 3, fn: SP.rainMinis } ],
  [ { w: 3, gap: 2.8, fn: SP.line }, { w: 3, gap: 2.9, fn: SP.formation }, { w: 2, gap: 3.4, fn: SP.twoFormations }, { w: 2, gap: 3.6, fn: SP.shooters }, { w: 2, gap: 3.8, fn: SP.twoBig }, { w: 2.5, gap: 3, fn: SP.colorBurst }, { w: 2, gap: 3.2, fn: SP.homers }, { w: 1.5, gap: 4, fn: SP.turrets }, { w: 2, gap: 4.6, fn: SP.doubleWall }, { w: 2, gap: 3.4, fn: SP.bigSpinner }, { w: 2, gap: 3.2, fn: SP.dashers }, { w: 2, gap: 3.6, fn: SP.ojamaLine }, { w: 2, gap: 3.2, fn: SP.mixedCluster }, { w: 1.5, gap: 3, fn: SP.rainMinis }, { w: 1.5, gap: 3, fn: SP.bouncers } ],
  [ { w: 3, gap: 2.5, fn: SP.line }, { w: 3, gap: 2.6, fn: SP.formation }, { w: 3, gap: 3, fn: SP.twoFormations }, { w: 2.5, gap: 3.2, fn: SP.shooters }, { w: 2, gap: 3.4, fn: SP.twoBig }, { w: 3, gap: 2.8, fn: SP.colorBurst }, { w: 2, gap: 3, fn: SP.homers }, { w: 2, gap: 3.6, fn: SP.turrets }, { w: 2, gap: 4.2, fn: SP.doubleWall }, { w: 2, gap: 3.2, fn: SP.bigSpinner }, { w: 2.5, gap: 3, fn: SP.dashers }, { w: 2, gap: 3.4, fn: SP.ojamaLine }, { w: 2.5, gap: 3, fn: SP.mixedCluster }, { w: 2, gap: 2.8, fn: SP.rainMinis }, { w: 2, gap: 2.8, fn: SP.bouncers }, { w: 1.5, gap: 3, fn: SP.snake } ],
];

function generateWaves(si) {
  const st = STAGES[si], rng = mulberry32(1234 + si * 977), waves = [];
  let t = 2;
  const pool = POOLS[si];
  while (t < st.duration - 5) {
    const pat = weightedPick(pool, rng);
    waves.push({ t, fn: pat.fn });
    t += (pat.gap / st.spawnMul) * (0.85 + rng() * 0.3);
  }
  for (let ct = 7; ct < st.duration - 8; ct += 13) waves.push({ t: ct, fn: (g) => SP.carrier(g) });
  for (let ct = 16; ct < st.duration - 8; ct += 19) waves.push({ t: ct, fn: SP.goodCarrier });
  for (let ct = 24; ct < st.duration - 8; ct += 27) waves.push({ t: ct, fn: SP.rainbow });
  if (si >= 1) for (let ct = 30; ct < st.duration - 8; ct += 31) waves.push({ t: ct, fn: SP.ojama });
  waves.sort((a, b) => a.t - b.t);
  return waves;
}

// ---- 背景 ----
const BG = (() => {
  const cache = {};
  function wrap(x, period, margin) { return ((x % period) + period) % period - margin; }
  function init(si) {
    if (cache[si]) return cache[si];
    const rng = mulberry32(99 + si * 13), c = { si };
    const R = (a, b) => a + rng() * (b - a);
    if (si === 0) {
      c.farClouds = Array.from({ length: 9 }, () => ({ x: R(0, 1400), y: R(60, 300), s: R(0.6, 1.3) }));
      c.islands = Array.from({ length: 4 }, (_, i) => ({ x: i * 420 + R(0, 120), y: R(360, 460), w: R(120, 220), trees: Math.floor(R(1, 4)) }));
      c.nearClouds = Array.from({ length: 5 }, () => ({ x: R(0, 1600), y: R(80, 480), s: R(1.2, 2) }));
      c.petals = Array.from({ length: 28 }, () => ({ x: R(0, 1200), y: R(0, H), s: R(3, 6), ph: R(0, TAU) }));
    } else if (si === 1) {
      c.hills = Array.from({ length: 6 }, (_, i) => ({ x: i * 260 + R(0, 80), w: R(180, 320), h: R(60, 130), col: pick(['#B9F5E8', '#FFD0F0', '#D8C8FF', '#FFF0B8']) }));
      c.lollis = Array.from({ length: 7 }, () => ({ x: R(0, 1600), h: R(70, 150), col: pick(['#FF5E7A', '#5BE06A', '#4FA3FF', '#FFD84D', '#B96BFF']) }));
      c.candies = Array.from({ length: 10 }, () => ({ x: R(0, 1500), y: R(70, 300), s: R(10, 22), kind: Math.floor(R(0, 3)), col: pick(['#FF8FB0', '#8EE5FF', '#FFE066', '#C8A8FF']), ph: R(0, TAU) }));
      c.bubbles = Array.from({ length: 40 }, () => ({ x: R(0, 1200), y: R(0, H), s: R(3, 12), sp: R(20, 60), ph: R(0, TAU) }));
    } else if (si === 2) {
      c.far = Array.from({ length: 26 }, (_, i) => ({ x: i * 70 + R(-10, 10), w: R(40, 75), h: R(120, 300) }));
      c.mid = Array.from({ length: 14 }, (_, i) => ({ x: i * 150 + R(-20, 20), w: R(70, 130), h: R(90, 260), neon: pick(['#FF5EDB', '#5EF0FF', '#FFE066', '#B96BFF']), sign: rng() < 0.5 ? pick(TETROMINO_KEYS) : null }));
      c.rain = Array.from({ length: 70 }, () => ({ x: R(0, 1200), y: R(0, H), l: R(14, 30), sp: R(600, 900) }));
      c.stars = Array.from({ length: 50 }, () => ({ x: R(0, W), y: R(0, 250), s: R(0.5, 1.5) }));
    } else if (si === 3) {
      c.crystals = Array.from({ length: 16 }, () => ({ x: R(0, 1500), y: R(60, 500), s: R(18, 50), col: pick(['#8EF5E0', '#FFB7E6', '#C8B4FF', '#9FD8FF']), rot: R(-0.4, 0.4), ph: R(0, TAU) }));
      c.stalTop = Array.from({ length: 40 }, (_, i) => ({ x: i * 40, h: R(20, 90) }));
      c.stalBot = Array.from({ length: 40 }, (_, i) => ({ x: i * 40, h: R(20, 80) }));
      c.dust = Array.from({ length: 60 }, () => ({ x: R(0, 1200), y: R(0, H), s: R(1, 3), ph: R(0, TAU) }));
    } else {
      c.stars = [0.1, 0.3, 0.6].map((f, li) => ({ f, pts: Array.from({ length: 70 - li * 15 }, () => ({ x: R(0, 1400), y: R(0, H), s: R(0.5, 1.5 + li), ph: R(0, TAU) })) }));
      c.nebula = Array.from({ length: 6 }, () => ({ x: R(0, 1600), y: R(50, 450), s: R(120, 260), col: pick(['rgba(160,80,255,', 'rgba(255,90,200,', 'rgba(80,200,255,']) }));
      c.minos = Array.from({ length: 11 }, () => ({ x: R(0, 1400), y: R(-200, H), s: R(26, 50), k: pick(TETROMINO_KEYS), rot: R(0, TAU), vr: R(-0.4, 0.4), vy: R(20, 50) }));
    }
    cache[si] = c; return c;
  }
  function cloud(ctx, x, y, s, alpha) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.beginPath();
    ctx.arc(x, y, 26 * s, 0, TAU); ctx.arc(x + 28 * s, y - 10 * s, 32 * s, 0, TAU); ctx.arc(x + 62 * s, y, 24 * s, 0, TAU); ctx.arc(x + 30 * s, y + 10 * s, 28 * s, 0, TAU); ctx.fill();
  }
  function draw(ctx, g, si) {
    const c = init(si), sc = g.scroll, t = g.time;
    if (si === 0) {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7CC9FF'); gr.addColorStop(0.6, '#BFE6FF'); gr.addColorStop(1, '#F2FAFF'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      const sg = ctx.createRadialGradient(830, 90, 10, 830, 90, 160); sg.addColorStop(0, 'rgba(255,250,200,1)'); sg.addColorStop(0.25, 'rgba(255,240,170,0.9)'); sg.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(830, 90, 160, 0, TAU); ctx.fill();
      for (const cl of c.farClouds) cloud(ctx, wrap(cl.x - sc * 0.15, 1500, 150), cl.y, cl.s, 0.75);
      for (const is of c.islands) {
        const x = wrap(is.x - sc * 0.4, 1700, 300);
        ctx.fillStyle = '#B98A5A'; ctx.beginPath(); ctx.ellipse(x, is.y + 30, is.w * 0.5, 36, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8ED95F'; ctx.beginPath(); ctx.ellipse(x, is.y + 8, is.w * 0.55, 20, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < is.trees; i++) { const tx = x - is.w * 0.3 + i * (is.w * 0.3); ctx.fillStyle = '#7A5230'; ctx.fillRect(tx - 3, is.y - 18, 6, 22); ctx.fillStyle = '#5BC46A'; ctx.beginPath(); ctx.arc(tx, is.y - 26, 16, 0, TAU); ctx.fill(); ctx.fillStyle = '#FF8FB0'; ctx.beginPath(); ctx.arc(tx + 6, is.y - 30, 4, 0, TAU); ctx.arc(tx - 7, is.y - 22, 3, 0, TAU); ctx.fill(); }
      }
      for (const cl of c.nearClouds) cloud(ctx, wrap(cl.x - sc * 0.8, 1900, 250), cl.y, cl.s, 0.85);
      ctx.fillStyle = '#FFB7D5';
      for (const p of c.petals) { const x = wrap(p.x - sc * 1.3 - t * 30, 1300, 50), y = (p.y + Math.sin(t * 1.5 + p.ph) * 20 + t * 25) % H; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + p.ph); ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    } else if (si === 1) {
      const gr = ctx.createLinearGradient(0, 0, 0, 340); gr.addColorStop(0, '#FFB8DE'); gr.addColorStop(1, '#D9B8FF'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 340);
      const sea = ctx.createLinearGradient(0, 330, 0, H); sea.addColorStop(0, '#7FDBFF'); sea.addColorStop(1, '#2F6FD8'); ctx.fillStyle = sea; ctx.fillRect(0, 330, W, H - 330);
      for (const h of c.hills) { const x = wrap(h.x - sc * 0.2, 1560, 300); ctx.fillStyle = h.col; ctx.beginPath(); ctx.ellipse(x, 335, h.w, h.h, 0, Math.PI, TAU); ctx.fill(); }
      for (const l of c.lollis) { const x = wrap(l.x - sc * 0.3, 1600, 100); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, 335); ctx.lineTo(x, 335 - l.h); ctx.stroke(); ctx.fillStyle = l.col; ctx.beginPath(); ctx.arc(x, 335 - l.h - 20, 24, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, 335 - l.h - 20, 13, 0, Math.PI * 1.5); ctx.stroke(); }
      // 波
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
      for (let row = 0; row < 4; row++) { const y = 345 + row * 45; ctx.beginPath(); for (let x = -40; x <= W + 40; x += 20) ctx.lineTo(x, y + Math.sin((x + sc * (1 + row * 0.3)) * 0.03 + t * 2 + row) * 6); ctx.stroke(); }
      for (const cd of c.candies) {
        const x = wrap(cd.x - sc * 0.5, 1500, 60), y = cd.y + Math.sin(t * 1.5 + cd.ph) * 10;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5 + cd.ph); ctx.globalAlpha = 0.85;
        if (cd.kind === 0) { ctx.strokeStyle = cd.col; ctx.lineWidth = cd.s * 0.6; ctx.beginPath(); ctx.arc(0, 0, cd.s, 0, TAU); ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.3) * cd.s, Math.sin(i * 1.3) * cd.s, 2, 0, TAU); ctx.fill(); } }
        else if (cd.kind === 1) drawStar(ctx, 0, 0, cd.s, cd.col);
        else drawHeart(ctx, 0, 0, cd.s * 0.8, cd.col);
        ctx.restore();
      }
      for (const b of c.bubbles) { const x = wrap(b.x - sc * 0.9, 1200, 30), y = ((b.y - t * b.sp) % (H + 40) + H + 40) % (H + 40) - 20; if (y < 330) continue; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + Math.sin(t * 2 + b.ph) * 4, y, b.s, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - b.s * 0.35, y - b.s * 0.35, b.s * 0.25, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 12; i++) { const x = (i * 97 + t * 40) % W, y = 350 + (i * 53) % 170; const k = Math.sin(t * 4 + i) * 0.5 + 0.5; drawStar(ctx, x, y, 3 + k * 3, 'rgba(255,255,255,0.8)'); }
    } else if (si === 2) {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#07081C'); gr.addColorStop(1, '#231347'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; for (const s of c.stars) { ctx.globalAlpha = 0.4 + Math.sin(t * 3 + s.x) * 0.3; ctx.fillRect(s.x, s.y, s.s, s.s); } ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFF4C8'; ctx.beginPath(); ctx.arc(780, 110, 46, 0, TAU); ctx.fill(); ctx.fillStyle = '#0B0C24'; ctx.beginPath(); ctx.arc(800, 95, 40, 0, TAU); ctx.fill();
      for (const b of c.far) { const x = wrap(b.x - sc * 0.25, 1820, 100); ctx.fillStyle = '#161A3C'; ctx.fillRect(x, 490 - b.h, b.w, b.h); ctx.fillStyle = '#FFE28A'; for (let wy = 500 - b.h; wy < 480; wy += 16) for (let wx = x + 6; wx < x + b.w - 6; wx += 12) if (((wx * 7 + wy * 13) % 11) < 5) ctx.fillRect(wx, wy, 5, 7); }
      for (const b of c.mid) {
        const x = wrap(b.x - sc * 0.55, 2100, 200);
        ctx.fillStyle = '#0A0B22'; ctx.fillRect(x, 495 - b.h, b.w, b.h);
        ctx.save(); ctx.strokeStyle = b.neon; ctx.shadowColor = b.neon; ctx.shadowBlur = 14; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 495); ctx.lineTo(x, 495 - b.h); ctx.lineTo(x + b.w, 495 - b.h); ctx.lineTo(x + b.w, 495); ctx.stroke();
        if (b.sign) drawMino(ctx, x + b.w / 2, 495 - b.h + 40, SHAPES[b.sign], 11, b.neon, 0, 0.9 + Math.sin(t * 10 + x) * 0.1, true);
        ctx.restore();
        ctx.fillStyle = 'rgba(94,240,255,0.5)'; for (let wy = 505 - b.h; wy < 485; wy += 22) for (let wx = x + 8; wx < x + b.w - 8; wx += 16) if (((wx * 3 + wy * 7) % 9) < 4) ctx.fillRect(wx, wy, 7, 9);
      }
      // 地面と反射
      const gg = ctx.createLinearGradient(0, 495, 0, H); gg.addColorStop(0, '#2A1858'); gg.addColorStop(1, '#0C0820'); ctx.fillStyle = gg; ctx.fillRect(0, 495, W, H - 495);
      ctx.strokeStyle = 'rgba(255,94,219,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 496); ctx.lineTo(W, 496); ctx.stroke();
      for (let i = 0; i < 12; i++) { const x = wrap(i * 100 - sc * 1.2, 1200, 50); ctx.fillStyle = 'rgba(94,240,255,0.18)'; ctx.fillRect(x, 500, 40, 36); }
      ctx.strokeStyle = 'rgba(180,200,255,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (const r of c.rain) { const x = wrap(r.x - sc * 1.3 - t * 250, 1200, 50), y = ((r.y + t * r.sp) % (H + 40)) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + r.l); } ctx.stroke();
    } else if (si === 3) {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#031A20'); gr.addColorStop(0.5, '#0B3B45'); gr.addColorStop(1, '#052226'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      for (const cr of c.crystals) {
        const x = wrap(cr.x - sc * 0.3, 1500, 80), k = 0.6 + Math.sin(t * 2 + cr.ph) * 0.25;
        ctx.save(); ctx.translate(x, cr.y); ctx.rotate(cr.rot); ctx.globalAlpha = k; ctx.fillStyle = cr.col; ctx.shadowColor = cr.col; ctx.shadowBlur = 25;
        ctx.beginPath(); ctx.moveTo(0, -cr.s * 1.6); ctx.lineTo(cr.s * 0.6, -cr.s * 0.3); ctx.lineTo(cr.s * 0.4, cr.s); ctx.lineTo(-cr.s * 0.4, cr.s); ctx.lineTo(-cr.s * 0.6, -cr.s * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(0, -cr.s * 1.6); ctx.lineTo(cr.s * 0.6, -cr.s * 0.3); ctx.lineTo(0, -cr.s * 0.2); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = '#052126';
      ctx.beginPath(); ctx.moveTo(-50, 0); for (const s of c.stalTop) { const x = wrap(s.x - sc * 0.6, 1600, 100); ctx.lineTo(x, 40); ctx.lineTo(x + 20, 40 + s.h); } ctx.lineTo(W + 50, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-50, H); for (const s of c.stalBot) { const x = wrap(s.x - sc * 0.6 + 20, 1600, 100); ctx.lineTo(x, H); ctx.lineTo(x + 20, H - s.h); } ctx.lineTo(W + 50, H); ctx.fill();
      for (const d of c.dust) { const x = wrap(d.x - sc * 0.9, 1200, 30), y = d.y + Math.sin(t * 0.8 + d.ph) * 15; ctx.fillStyle = `rgba(180,255,240,${0.3 + Math.sin(t * 3 + d.ph) * 0.3})`; ctx.beginPath(); ctx.arc(x, y, d.s, 0, TAU); ctx.fill(); }
      const fg = ctx.createLinearGradient(0, 300, 0, H); fg.addColorStop(0, 'rgba(120,220,210,0)'); fg.addColorStop(1, 'rgba(120,220,210,0.18)'); ctx.fillStyle = fg; ctx.fillRect(0, 300, W, H - 300);
    } else {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#02000A'); gr.addColorStop(1, '#140A2E'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      for (const n of c.nebula) { const x = wrap(n.x - sc * 0.12, 1700, 300); const ng = ctx.createRadialGradient(x, n.y, 0, x, n.y, n.s); ng.addColorStop(0, n.col + '0.28)'); ng.addColorStop(1, n.col + '0)'); ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(x, n.y, n.s, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fff'; for (const layer of c.stars) for (const s of layer.pts) { const x = wrap(s.x - sc * layer.f, 1400, 20); ctx.globalAlpha = 0.5 + Math.sin(t * 2 + s.ph) * 0.4; ctx.fillRect(x, s.y, s.s, s.s); } ctx.globalAlpha = 1;
      // グリッドの床
      ctx.strokeStyle = 'rgba(160,100,255,0.45)'; ctx.lineWidth = 1.5;
      const hz = 400;
      for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 60 - (sc * 1.5 % 60), H); ctx.lineTo(W / 2 + i * 6 - (sc * 1.5 % 60) * 0.1, hz); ctx.stroke(); }
      for (let i = 0; i < 10; i++) { const k = ((i / 10) + (t * 0.5 % 1)) % 1; const y = hz + Math.pow(k, 2.2) * (H - hz); ctx.globalAlpha = k; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,94,219,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, hz); ctx.lineTo(W, hz); ctx.stroke();
      for (const m of c.minos) { const x = wrap(m.x - sc * 0.35, 1400, 100), y = ((m.y + t * m.vy) % (H + 300)) - 150; drawMinoGhost(ctx, x, y, SHAPES[m.k], m.s, MINO_COLORS[m.k], m.rot + t * m.vr, 0.4); }
    }
  }
  return { draw, init };
})();
