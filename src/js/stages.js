'use strict';
// ===== ステージ定義・背景・ウェーブ =====
const STAGES = [
  { name: 'スカイガーデン', en: 'SKY GARDEN', sub: 'そよ風とぷよの空', bg: 'sky', duration: 70, scroll: 60, hpMul: 1.0, spawnMul: 1.0, boss: 0 },
  { name: 'キャンディオーシャン', en: 'CANDY OCEAN', sub: 'あまあまの海をとびこえて', bg: 'candy', duration: 80, scroll: 72, hpMul: 1.25, spawnMul: 1.1, boss: 1 },
  { name: 'サクラ神社', en: 'SAKURA SHRINE', sub: '夕暮れの花びらと鳥居のむこう', bg: 'sakura', duration: 85, scroll: 65, hpMul: 1.5, spawnMul: 1.2, boss: 2 },
  { name: 'ネオンナイトシティ', en: 'NEON NIGHT CITY', sub: '雨とネオンのはざまで', bg: 'neon', duration: 90, scroll: 100, hpMul: 1.75, spawnMul: 1.3, boss: 3 },
  { name: 'ボルケーノ', en: 'VOLCANO', sub: '灼熱のマグマがうずまく', bg: 'volcano', duration: 95, scroll: 80, hpMul: 2.0, spawnMul: 1.4, boss: 4 },
  { name: 'クリスタルケイブ', en: 'CRYSTAL CAVE', sub: 'きらめく洞窟のおくへ', bg: 'crystal', duration: 100, scroll: 55, hpMul: 2.3, spawnMul: 1.5, boss: 5 },
  { name: 'オーロラ氷原', en: 'AURORA ICEFIELD', sub: '夜空にゆれる光のカーテン', bg: 'aurora', duration: 105, scroll: 70, hpMul: 2.6, spawnMul: 1.6, boss: 6 },
  { name: 'テトロディメンション', en: 'TETRO DIMENSION', sub: 'すべてのミノがうまれる場所', bg: 'tetro', duration: 115, scroll: 125, hpMul: 3.0, spawnMul: 1.75, boss: 7 },
];

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
  optionCarrier(g) { SP.carrier(g, g.player.options < 4 ? 'option' : 'power'); },
  goodCarrier(g) { SP.carrier(g, pick(['option', 'shield', 'missile', 'rear', 'healBig', 'bomb', 'maxhp', 'power', 'power', 'oneup', 'speed', 'chain', 'chargeup', 'wide'])); },
  mixedCluster(g) { // 2 色が隣り合う大きな塊
    const c1 = randInt(0, 4), c2 = (c1 + randInt(1, 4)) % 5, cx = W + 90, cy = rand(140, H - 140), phase = rand(TAU);
    for (let i = 0; i < 12; i++) { const col = i < 6 ? c1 : c2; g.spawnEnemy(new Enemy('cluster', cx + Math.floor(i / 3) * 44, cy + (i % 3) * 44 - 44, { color: col, phase, amp: 22, speed: 110 })); }
  },
  ringer(g) { g.spawnEnemy(new Enemy('ringer', W + 40, rand(110, H - 90), {})); },
  sniper(g) { g.spawnEnemy(new Enemy('sniper', W + 40, rand(100, H - 80), {})); },
  loopers(g) { const color = randInt(0, 4), y = rand(150, H - 150), dir = Math.random() < 0.5 ? 1 : -1, loopX = rand(450, 650); for (let i = 0; i < 3; i++) g.spawnEnemy(new Enemy('looper', W + 40 + i * 70, y, { color, dir, loopX })); },
  zigzags(g) { const color = randInt(0, 4); for (let i = 0; i < 3; i++) g.spawnEnemy(new Enemy('zigzag', W + 40 + i * 80, rand(120, H - 100), { color, dir: i % 2 ? 1 : -1 })); },
  divers(g) { const color = randInt(0, 4), top = Math.random() < 0.5; for (let i = 0; i < 3; i++) g.spawnEnemy(new Enemy('diver', 0, 0, { color, top, x: 300 + i * 160 })); },
  ambushers(g) { const color = randInt(0, 4); for (let i = 0; i < 2; i++) g.spawnEnemy(new Enemy('ambusher', -40, rand(120, H - 100), { color })); },
  spiraler(g) { g.spawnEnemy(new Enemy('spiraler', W + 50, rand(140, H - 120), {})); },
  bombers(g) { const color = randInt(0, 4), top = Math.random() < 0.5; for (let i = 0; i < 3; i++) g.spawnEnemy(new Enemy('bomber', W + 40 + i * 90, 0, { color, top })); },
  minefield(g) { const color = randInt(0, 4); for (let i = 0; i < 5; i++) g.spawnEnemy(new Enemy('mine', W + 40 + i * 55, rand(90, H - 70), { color })); },
  ricochets(g) { const color = randInt(0, 4); for (let i = 0; i < 2; i++) g.spawnEnemy(new Enemy('ricochet', W + 40 + i * 90, rand(120, H - 100), { color })); },
  wavers(g) { const color = randInt(0, 4); for (let i = 0; i < 2; i++) g.spawnEnemy(new Enemy('waver', W + 40 + i * 80, rand(120, H - 100), { color })); },
  rainMinis(g) { const color = randInt(0, 4); for (let i = 0; i < 6; i++) g.spawnEnemy(new Enemy('bouncer', W + 40 + i * 50, 80, { color, dir: 1, speed: 180 })); },
};


// ---- 出現パターン（min: 登場する最初のステージ番号） ----
const PATTERNS = [
  { k: 'line', min: 0, w: 4, gap: 3.4, fn: SP.line }, { k: 'formation', min: 0, w: 4, gap: 3.5, fn: SP.formation }, { k: 'shooter', min: 0, w: 2.5, gap: 4, fn: SP.shooter },
  { k: 'big', min: 0, w: 1.5, gap: 4.6, fn: SP.big }, { k: 'colorBurst', min: 0, w: 2, gap: 3.4, fn: SP.colorBurst }, { k: 'spinner', min: 0, w: 1.5, gap: 4, fn: SP.spinner },
  { k: 'dasher', min: 0, w: 1, gap: 3, fn: SP.dasher }, { k: 'snake', min: 0, w: 1.5, gap: 3.5, fn: SP.snake }, { k: 'loopers', min: 0, w: 1.5, gap: 3.6, fn: SP.loopers },
  { k: 'zigzags', min: 0, w: 1, gap: 3.4, fn: SP.zigzags }, { k: 'ringer', min: 0, w: 1.2, gap: 4.2, fn: SP.ringer }, { k: 'wavers', min: 0, w: 1, gap: 3.8, fn: SP.wavers },
  { k: 'bouncers', min: 1, w: 2, gap: 3, fn: SP.bouncers }, { k: 'wall', min: 1, w: 2, gap: 4.5, fn: SP.wall }, { k: 'dashers', min: 1, w: 1, gap: 3.4, fn: SP.dashers },
  { k: 'ojama', min: 1, w: 1, gap: 4, fn: SP.ojama }, { k: 'mixedCluster', min: 1, w: 1.5, gap: 3.6, fn: SP.mixedCluster }, { k: 'sniper', min: 1, w: 1.5, gap: 4.2, fn: SP.sniper },
  { k: 'divers', min: 1, w: 1.5, gap: 3.6, fn: SP.divers }, { k: 'ambushers', min: 1, w: 1, gap: 3.8, fn: SP.ambushers }, { k: 'bombers', min: 1, w: 1, gap: 4, fn: SP.bombers },
  { k: 'ricochets', min: 1, w: 1, gap: 3.8, fn: SP.ricochets }, { k: 'minefield', min: 1, w: 0.8, gap: 4.4, fn: SP.minefield },
  { k: 'twoFormations', min: 2, w: 2, gap: 3.4, fn: SP.twoFormations }, { k: 'shooters', min: 2, w: 2, gap: 3.8, fn: SP.shooters }, { k: 'homers', min: 2, w: 2, gap: 3.2, fn: SP.homers },
  { k: 'turrets', min: 2, w: 2, gap: 4.2, fn: SP.turrets }, { k: 'spiraler', min: 2, w: 1.5, gap: 4.2, fn: SP.spiraler }, { k: 'rainMinis', min: 2, w: 1, gap: 3, fn: SP.rainMinis },
  { k: 'twoBig', min: 3, w: 2, gap: 3.8, fn: SP.twoBig }, { k: 'doubleWall', min: 3, w: 2, gap: 4.6, fn: SP.doubleWall }, { k: 'bigSpinner', min: 3, w: 2, gap: 3.4, fn: SP.bigSpinner },
  { k: 'ojamaLine', min: 3, w: 2, gap: 3.6, fn: SP.ojamaLine },
];
// ステージごとの味付け（そのステージらしい敵を増やす）
const FLAVOR = [
  {}, { bouncers: 1.6, divers: 1.4 }, { loopers: 2, divers: 1.6, wavers: 1.5 }, { turrets: 1.6, sniper: 1.6, homers: 1.4 },
  { bombers: 2, minefield: 1.8, dashers: 1.4 }, { ojamaLine: 1.5, doubleWall: 1.4, spiraler: 1.5 }, { ricochets: 2, wavers: 1.8, spiraler: 1.4 }, { twoFormations: 1.4, bigSpinner: 1.3 },
];
function buildPool(si) {
  const fl = FLAVOR[si] || {};
  return PATTERNS.filter((p) => p.min <= si).map((p) => ({ fn: p.fn, gap: p.gap, w: p.w * (fl[p.k] || 1) * (si - p.min >= 2 ? 1.15 : 1) }));
}

function generateWaves(si) {
  const st = STAGES[si], rng = mulberry32(1234 + si * 977), waves = [], pool = buildPool(si);
  let t = 2.5;
  while (t < st.duration - 5) {
    const pat = weightedPick(pool, rng);
    waves.push({ t, fn: pat.fn });
    const progress = t / st.duration; // 序盤はゆるく、終盤に向けて密度アップ
    t += (pat.gap * (1.3 - 0.55 * progress) / st.spawnMul) * (0.85 + rng() * 0.3);
  }
  for (let ct = 10; ct < st.duration - 8; ct += 36) waves.push({ t: ct, fn: (g) => SP.carrier(g) });
  for (let ct = 14; ct < st.duration - 8; ct += 34) waves.push({ t: ct, fn: SP.optionCarrier });
  for (let ct = 26; ct < st.duration - 8; ct += 55) waves.push({ t: ct, fn: SP.goodCarrier });
  for (let ct = 40; ct < st.duration - 8; ct += 60) waves.push({ t: ct, fn: SP.rainbow });
  if (si >= 1) for (let ct = 30; ct < st.duration - 8; ct += 33) waves.push({ t: ct, fn: SP.ojama });
  waves.sort((a, b) => a.t - b.t);
  return waves;
}

const BG = (() => {
  const cache = {};
  function wrap(x, period, margin) { return ((x % period) + period) % period - margin; }
  const KEYS = ['sky', 'candy', 'neon', 'crystal', 'tetro', 'sakura', 'volcano', 'aurora'];
  function init(key) {
    if (cache[key]) return cache[key];
    const si = KEYS.indexOf(key);
    const rng = mulberry32(99 + si * 13), c = { key };
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
    } else if (si === 5) { // サクラ神社
      c.ridgeA = Array.from({ length: 12 }, (_, i) => ({ x: i * 180, h: R(60, 140) }));
      c.ridgeB = Array.from({ length: 10 }, (_, i) => ({ x: i * 220, h: R(90, 190) }));
      c.torii = Array.from({ length: 4 }, (_, i) => ({ x: i * 520 + R(0, 120), h: R(150, 210), w: R(110, 150) }));
      c.trees = Array.from({ length: 7 }, (_, i) => ({ x: i * 260 + R(0, 80), h: R(70, 120), s: R(0.8, 1.3) }));
      c.lanterns = Array.from({ length: 12 }, (_, i) => ({ x: i * 130 + R(-20, 20), y: R(70, 120), ph: R(0, TAU) }));
      c.stone = Array.from({ length: 6 }, (_, i) => ({ x: i * 330 + R(0, 100), s: R(0.7, 1.1) }));
      c.petals = Array.from({ length: 60 }, () => ({ x: R(0, 1300), y: R(0, H), s: R(3, 7), ph: R(0, TAU), sp: R(20, 45) }));
    } else if (si === 6) { // ボルケーノ
      c.smoke = Array.from({ length: 10 }, () => ({ x: R(0, 1600), y: R(40, 220), s: R(1, 2.2), a: R(0.25, 0.5) }));
      c.volcanos = Array.from({ length: 4 }, (_, i) => ({ x: i * 450 + R(0, 100), w: R(220, 340), h: R(180, 260) }));
      c.pillars = Array.from({ length: 8 }, (_, i) => ({ x: i * 240 + R(0, 80), w: R(28, 60), h: R(80, 220) }));
      c.embers = Array.from({ length: 70 }, () => ({ x: R(0, 1200), y: R(0, H), s: R(1.5, 4), ph: R(0, TAU), sp: R(40, 110) }));
      c.bubbles = Array.from({ length: 14 }, () => ({ x: R(0, 1200), ph: R(0, TAU), s: R(6, 16) }));
    } else if (si === 7) { // オーロラ氷原
      c.stars = Array.from({ length: 90 }, () => ({ x: R(0, 1400), y: R(0, 330), s: R(0.5, 1.8), ph: R(0, TAU) }));
      c.bergs = Array.from({ length: 6 }, (_, i) => ({ x: i * 330 + R(0, 100), w: R(140, 260), h: R(70, 150) }));
      c.floes = Array.from({ length: 9 }, (_, i) => ({ x: i * 220 + R(0, 60), w: R(90, 200), h: R(18, 30), ph: R(0, TAU) }));
      c.snow = Array.from({ length: 90 }, () => ({ x: R(0, 1300), y: R(0, H), s: R(1.5, 4), ph: R(0, TAU), sp: R(25, 60) }));
      c.pines = Array.from({ length: 10 }, (_, i) => ({ x: i * 200 + R(0, 80), h: R(40, 90) }));
    } else {
      c.stars = [0.1, 0.3, 0.6].map((f, li) => ({ f, pts: Array.from({ length: 70 - li * 15 }, () => ({ x: R(0, 1400), y: R(0, H), s: R(0.5, 1.5 + li), ph: R(0, TAU) })) }));
      c.nebula = Array.from({ length: 6 }, () => ({ x: R(0, 1600), y: R(50, 450), s: R(120, 260), col: pick(['rgba(160,80,255,', 'rgba(255,90,200,', 'rgba(80,200,255,']) }));
      c.minos = Array.from({ length: 11 }, () => ({ x: R(0, 1400), y: R(-200, H), s: R(26, 50), k: pick(TETROMINO_KEYS), rot: R(0, TAU), vr: R(-0.4, 0.4), vy: R(20, 50) }));
    }
    cache[key] = c; return c;
  }
  function cloud(ctx, x, y, s, alpha) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.beginPath();
    ctx.arc(x, y, 26 * s, 0, TAU); ctx.arc(x + 28 * s, y - 10 * s, 32 * s, 0, TAU); ctx.arc(x + 62 * s, y, 24 * s, 0, TAU); ctx.arc(x + 30 * s, y + 10 * s, 28 * s, 0, TAU); ctx.fill();
  }
  function draw(ctx, g, stageIndex) {
    const key = STAGES[stageIndex].bg, c = init(key), sc = g.scroll, t = g.time, si = KEYS.indexOf(key);
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
    } else if (si === 5) { // ---- サクラ神社：夕暮れ ----
      const gr = ctx.createLinearGradient(0, 0, 0, 400); gr.addColorStop(0, '#5B3A9C'); gr.addColorStop(0.5, '#E8789A'); gr.addColorStop(1, '#FFD39A'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 400);
      const sg = ctx.createRadialGradient(760, 350, 10, 760, 350, 140); sg.addColorStop(0, 'rgba(255,200,120,1)'); sg.addColorStop(0.3, 'rgba(255,150,90,0.8)'); sg.addColorStop(1, 'rgba(255,150,90,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(760, 350, 140, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7A4F9E'; ctx.beginPath(); ctx.moveTo(-50, 400); for (const r of c.ridgeB) { const x = wrap(r.x - sc * 0.12, 2200, 300); ctx.lineTo(x, 400 - r.h); ctx.lineTo(x + 110, 400 - r.h * 0.6); } ctx.lineTo(W + 50, 400); ctx.fill();
      ctx.fillStyle = '#5A3A80'; ctx.beginPath(); ctx.moveTo(-50, 400); for (const r of c.ridgeA) { const x = wrap(r.x - sc * 0.2, 2160, 300); ctx.lineTo(x, 400 - r.h); ctx.lineTo(x + 90, 400 - r.h * 0.5); } ctx.lineTo(W + 50, 400); ctx.fill();
      const gg = ctx.createLinearGradient(0, 395, 0, H); gg.addColorStop(0, '#5E8F4E'); gg.addColorStop(1, '#2E5A2E'); ctx.fillStyle = gg; ctx.fillRect(0, 395, W, H - 395);
      ctx.fillStyle = '#C9B9A2'; roundRectPath(ctx, -10, 452, W + 20, 46, 0); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 14; i++) { const x = wrap(i * 80 - sc * 0.9, 1120, 80); roundRectPath(ctx, x, 456, 60, 38, 10); ctx.fill(); }
      for (const tr of c.trees) { // 桜の木
        const x = wrap(tr.x - sc * 0.45, 1820, 150), y = 400;
        ctx.fillStyle = '#5A3A2A'; ctx.fillRect(x - 6, y - tr.h, 12, tr.h);
        for (const [dx, dy, r] of [[0, -tr.h - 10, 46], [-36, -tr.h + 10, 34], [38, -tr.h + 6, 36], [-10, -tr.h - 40, 32], [20, -tr.h - 34, 30]]) { ctx.fillStyle = r % 2 ? '#FFB7D5' : '#FF9FC6'; ctx.beginPath(); ctx.arc(x + dx * tr.s, y + dy * tr.s, r * tr.s, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x - 12 * tr.s, y - (tr.h + 30) * tr.s, 18 * tr.s, 0, TAU); ctx.fill();
      }
      for (const st of c.stone) { const x = wrap(st.x - sc * 0.6, 1980, 100), s = st.s; ctx.fillStyle = '#8C8C8C'; ctx.fillRect(x - 6 * s, 420 - 46 * s, 12 * s, 46 * s); ctx.fillRect(x - 16 * s, 420 - 4, 32 * s, 6); ctx.fillStyle = '#6E6E6E'; ctx.beginPath(); ctx.moveTo(x - 20 * s, 420 - 46 * s); ctx.lineTo(x, 420 - 66 * s); ctx.lineTo(x + 20 * s, 420 - 46 * s); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FFE08A'; ctx.fillRect(x - 5 * s, 420 - 40 * s, 10 * s, 10 * s); }
      for (const tg of c.torii) { // 鳥居
        const x = wrap(tg.x - sc * 0.6, 2080, 200), h = tg.h, w = tg.w, y = 455;
        ctx.fillStyle = '#D9381E'; ctx.fillRect(x - w / 2, y - h, 12, h); ctx.fillRect(x + w / 2 - 12, y - h, 12, h);
        ctx.fillRect(x - w / 2 - 12, y - h + 32, w + 24, 10);
        ctx.fillStyle = '#2A1A1A'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 26, y - h); ctx.lineTo(x + w / 2 + 26, y - h); ctx.lineTo(x + w / 2 + 20, y - h + 14); ctx.lineTo(x - w / 2 - 20, y - h + 14); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#D9381E'; ctx.fillRect(x - 6, y - h + 14, 12, 20);
      }
      ctx.strokeStyle = 'rgba(60,30,30,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 20) ctx.lineTo(x, 60 + Math.sin((x + sc * 0.8) * 0.012) * 14); ctx.stroke();
      for (const l of c.lanterns) { const x = wrap(l.x - sc * 0.8, 1560, 60), y = 60 + Math.sin((x + sc * 0.8) * 0.012) * 14 + 16 + Math.sin(t * 2 + l.ph) * 3; ctx.save(); ctx.shadowColor = '#FF8A4D'; ctx.shadowBlur = 18; ctx.fillStyle = '#FF5E3A'; roundRectPath(ctx, x - 9, y - 12, 18, 26, 7); ctx.fill(); ctx.restore(); ctx.fillStyle = '#FFD27A'; ctx.fillRect(x - 5, y - 4, 10, 10); ctx.fillStyle = '#2A1A1A'; ctx.fillRect(x - 6, y - 15, 12, 3); ctx.fillRect(x - 6, y + 12, 12, 3); }
      for (const p of c.petals) { const x = wrap(p.x - sc * 1.2 - t * 40, 1300, 50), y = (p.y + Math.sin(t * 1.5 + p.ph) * 18 + t * p.sp) % H; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + p.ph); ctx.fillStyle = Math.sin(p.ph) > 0 ? '#FFC2DA' : '#FF9FC6'; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    } else if (si === 6) { // ---- ボルケーノ ----
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#12040A'); gr.addColorStop(0.55, '#3A0C10'); gr.addColorStop(0.85, '#8A2A10'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      for (const s of c.smoke) { const x = wrap(s.x - sc * 0.2 - t * 12, 1800, 200); ctx.fillStyle = `rgba(60,40,45,${s.a})`; ctx.beginPath(); ctx.ellipse(x, s.y + Math.sin(t * 0.7 + s.x) * 6, 90 * s.s, 34 * s.s, 0, 0, TAU); ctx.fill(); }
      for (const v of c.volcanos) { // 遠景の火山と噴煙
        const x = wrap(v.x - sc * 0.25, 1900, 300);
        ctx.fillStyle = '#2A0E10'; ctx.beginPath(); ctx.moveTo(x - v.w / 2, 460); ctx.lineTo(x - 22, 460 - v.h); ctx.lineTo(x + 22, 460 - v.h); ctx.lineTo(x + v.w / 2, 460); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.shadowColor = '#FF7A1A'; ctx.shadowBlur = 25; ctx.fillStyle = '#FF9A2A'; ctx.fillRect(x - 18, 460 - v.h - 3, 36, 6); ctx.restore();
        ctx.strokeStyle = 'rgba(255,140,40,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 10, 460 - v.h); ctx.quadraticCurveTo(x + 40, 460 - v.h * 0.5, x + v.w * 0.3, 460); ctx.stroke();
        ctx.fillStyle = 'rgba(80,60,60,0.5)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + Math.sin(t * 0.8 + i) * 14, 460 - v.h - 20 - i * 26, 16 + i * 6, 0, TAU); ctx.fill(); }
      }
      for (const p of c.pillars) { const x = wrap(p.x - sc * 0.5, 1920, 100); ctx.fillStyle = '#1C0C0E'; ctx.fillRect(x, 470 - p.h, p.w, p.h); ctx.fillStyle = 'rgba(255,120,40,0.35)'; ctx.fillRect(x, 470 - p.h, 4, p.h); }
      // 溶岩の川
      const lg = ctx.createLinearGradient(0, 455, 0, H); lg.addColorStop(0, '#FFD23A'); lg.addColorStop(0.3, '#FF7A1A'); lg.addColorStop(1, '#B3260A'); ctx.save(); ctx.shadowColor = '#FF6A00'; ctx.shadowBlur = 30; ctx.fillStyle = lg; ctx.fillRect(0, 458, W, H - 458); ctx.restore();
      ctx.strokeStyle = 'rgba(255,240,150,0.6)'; ctx.lineWidth = 2; for (let row = 0; row < 3; row++) { ctx.beginPath(); for (let x = -20; x <= W + 20; x += 16) ctx.lineTo(x, 470 + row * 22 + Math.sin((x + sc * 1.3) * 0.04 + t * 1.5 + row) * 4); ctx.stroke(); }
      for (const b of c.bubbles) { const k = (t * 0.6 + b.ph) % 1, x = wrap(b.x - sc * 1.3, 1200, 50); if (k < 0.7) { ctx.fillStyle = 'rgba(255,230,120,0.9)'; ctx.beginPath(); ctx.arc(x, 500, b.s * k, 0, TAU); ctx.fill(); } else { ctx.strokeStyle = 'rgba(255,240,180,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, 500, b.s * (0.7 + (k - 0.7) * 3), 0, TAU); ctx.stroke(); } }
      for (const e of c.embers) { const x = wrap(e.x - sc * 1.1 + Math.sin(t * 2 + e.ph) * 10, 1200, 30), y = ((e.y - t * e.sp) % (H + 40) + H + 40) % (H + 40) - 20, a = 0.5 + Math.sin(t * 8 + e.ph) * 0.4; ctx.fillStyle = `rgba(255,${160 + Math.floor(a * 80)},60,${a})`; ctx.beginPath(); ctx.arc(x, y, e.s, 0, TAU); ctx.fill(); }
    } else if (si === 7) { // ---- オーロラ氷原 ----
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#040A24'); gr.addColorStop(0.7, '#0B2A4A'); gr.addColorStop(1, '#0A1E38'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; for (const s of c.stars) { const x = wrap(s.x - sc * 0.08, 1400, 20); ctx.globalAlpha = 0.4 + Math.sin(t * 2 + s.ph) * 0.35; ctx.fillRect(x, s.y, s.s, s.s); } ctx.globalAlpha = 1;
      // オーロラ（3 本のカーテン）
      for (let band = 0; band < 3; band++) {
        const col = ['rgba(90,255,180,', 'rgba(120,200,255,', 'rgba(200,120,255,'][band];
        for (let x = 0; x < W; x += 10) {
          const ph = x * 0.008 + t * (0.5 + band * 0.2) + band * 2 + sc * 0.002;
          const top = 60 + band * 40 + Math.sin(ph) * 40 + Math.sin(ph * 2.3) * 14, hgt = 90 + Math.sin(ph * 1.7 + 1) * 40;
          const ag = ctx.createLinearGradient(0, top, 0, top + hgt); ag.addColorStop(0, col + '0)'); ag.addColorStop(0.3, col + (0.28 - band * 0.05) + ')'); ag.addColorStop(1, col + '0)');
          ctx.fillStyle = ag; ctx.fillRect(x, top, 10, hgt);
        }
      }
      ctx.fillStyle = '#F2F7FF'; ctx.beginPath(); ctx.arc(150, 90, 34, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(200,215,235,0.5)'; ctx.beginPath(); ctx.arc(138, 82, 7, 0, TAU); ctx.arc(160, 100, 5, 0, TAU); ctx.fill();
      for (const b of c.bergs) { const x = wrap(b.x - sc * 0.3, 1980, 300); ctx.fillStyle = '#9FC4E8'; ctx.beginPath(); ctx.moveTo(x - b.w / 2, 440); ctx.lineTo(x - b.w * 0.2, 440 - b.h); ctx.lineTo(x + b.w * 0.15, 440 - b.h * 0.7); ctx.lineTo(x + b.w / 2, 440); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#D6EAFF'; ctx.beginPath(); ctx.moveTo(x - b.w * 0.2, 440 - b.h); ctx.lineTo(x + b.w * 0.15, 440 - b.h * 0.7); ctx.lineTo(x - b.w * 0.05, 440); ctx.lineTo(x - b.w * 0.4, 440); ctx.closePath(); ctx.fill(); }
      for (const p of c.pines) { const x = wrap(p.x - sc * 0.45, 2000, 100); ctx.fillStyle = '#0E3A3A'; ctx.beginPath(); ctx.moveTo(x - 16, 440); ctx.lineTo(x, 440 - p.h); ctx.lineTo(x + 16, 440); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#E8F4FF'; ctx.beginPath(); ctx.moveTo(x - 7, 440 - p.h * 0.55); ctx.lineTo(x, 440 - p.h); ctx.lineTo(x + 7, 440 - p.h * 0.55); ctx.closePath(); ctx.fill(); }
      const wg = ctx.createLinearGradient(0, 438, 0, H); wg.addColorStop(0, '#13406A'); wg.addColorStop(1, '#061830'); ctx.fillStyle = wg; ctx.fillRect(0, 438, W, H - 438);
      ctx.fillStyle = 'rgba(120,255,200,0.12)'; for (let i = 0; i < 6; i++) ctx.fillRect(0, 450 + i * 16 + Math.sin(t + i) * 3, W, 3);
      for (const f of c.floes) { const x = wrap(f.x - sc * 0.75, 1980, 220), y = 452 + Math.sin(t * 1.2 + f.ph) * 4; ctx.fillStyle = '#EAF5FF'; roundRectPath(ctx, x, y, f.w, f.h, 10); ctx.fill(); ctx.fillStyle = '#B9D8F2'; roundRectPath(ctx, x, y + f.h - 8, f.w, 8, 6); ctx.fill(); ctx.fillStyle = 'rgba(234,245,255,0.25)'; roundRectPath(ctx, x, y + f.h + 2, f.w, f.h * 0.8, 10); ctx.fill(); }
      for (const s of c.snow) { const x = wrap(s.x - sc * 0.9 + Math.sin(t * 1.3 + s.ph) * 20, 1300, 30), y = (s.y + t * s.sp) % (H + 20) - 10; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(x, y, s.s, 0, TAU); ctx.fill(); }
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
