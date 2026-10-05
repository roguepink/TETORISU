'use strict';
// ===== アイテム =====
// draw(ctx, x, y, t) はアイコンの描画、apply(g, p) は取得効果
function drawHeart(ctx, x, y, s, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x - s * 0.45, y - s * 0.35, s * 0.22, 0, TAU); ctx.fill();
}
function drawStar(ctx, x, y, r, color, rot = 0) {
  ctx.fillStyle = color; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function iconLetter(ctx, x, y, letter, color, bg = '#fff') {
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
  drawText(ctx, letter, x, y + 1, 15, color);
}

const ITEMS = {
  heal: { name: 'ハート', color: '#FF6B9A', w: 10, draw(c, x, y) { drawHeart(c, x, y, 10, '#FF5E7A'); }, apply(g, p) { p.heal(30); Sound.sfx.heal(); } },
  healBig: { name: 'ビッグハート', color: '#FF3D7A', w: 5, draw(c, x, y, t) { drawHeart(c, x, y, 13 + Math.sin(t * 6), '#FF2D6A'); drawText(c, '+', x, y + 1, 14, '#fff'); }, apply(g, p) { p.heal(80); Sound.sfx.heal(); } },
  maxhp: { name: 'ハートMAX UP', color: '#FFB3C6', w: 2.5, draw(c, x, y) { drawHeart(c, x, y, 11, '#FF9FB8'); drawText(c, 'MAX', x, y + 2, 8, '#A0184A'); }, apply(g, p) { p.maxHp = Math.min(220, p.maxHp + 20); p.heal(40); Sound.sfx.heal(); } },
  power: { name: 'パワーアップ', color: '#FF8A3D', w: 8, draw(c, x, y) { iconLetter(c, x, y, 'P', '#FF6A00', '#FFE7B0'); }, apply(g, p) { p.powerUp(); Sound.sfx.powerup(); } },
  speed: { name: 'スピードアップ', color: '#6FD6FF', w: 5, draw(c, x, y) { c.fillStyle = '#4DC3FF'; c.beginPath(); c.moveTo(x - 12, y + 8); c.lineTo(x + 12, y); c.lineTo(x - 12, y - 8); c.lineTo(x - 5, y); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 4, y + 5); c.lineTo(x + 8, y); c.lineTo(x - 4, y - 5); c.closePath(); c.fill(); }, apply(g, p) { p.speedLv = Math.min(5, p.speedLv + 1); Sound.sfx.powerup(); } },
  shield: { name: 'シールド', color: '#8EE5FF', w: 6, draw(c, x, y, t) { c.strokeStyle = '#6FD6FF'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 11, 0, TAU); c.stroke(); c.fillStyle = 'rgba(160,230,255,0.5)'; c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 4, y - 4, 3, 0, TAU); c.fill(); }, apply(g, p) { p.shield = 3; Sound.sfx.powerup(); } },
  bomb: { name: 'ボム +1', color: '#FFD84D', w: 5, draw(c, x, y) { iconLetter(c, x, y, 'B', '#B8860B', '#FFF0A0'); }, apply(g, p) { p.bombs = Math.min(9, p.bombs + 1); Sound.sfx.item(); } },
  option: { name: 'オプション', color: '#C8A8FF', w: 6, draw(c, x, y, t) { drawMino(c, x, y, SHAPES.M, 11, '#B86BF0', t * 3); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.stroke(); }, apply(g, p) { p.options = Math.min(4, p.options + 1); Sound.sfx.weapon(); } },
  rear: { name: 'リアショット', color: '#A0E8D0', w: 3, draw(c, x, y) { drawMino(c, x, y, SHAPES.D, 9, '#6FE8D2'); drawText(c, '←', x - 0, y - 11, 11, '#fff'); }, apply(g, p) { p.rear = true; Sound.sfx.weapon(); } },
  missile: { name: 'ミサイル', color: '#8FB4FF', w: 3, draw(c, x, y) { drawMino(c, x, y - 6, SHAPES.J, 6, '#4F7BF5', -Math.PI / 2); drawMino(c, x, y + 6, SHAPES.J, 6, '#4F7BF5', Math.PI / 2); }, apply(g, p) { p.missiles = true; Sound.sfx.weapon(); } },
  wide: { name: 'ワイドショット', color: '#FFE08A', w: 3, draw(c, x, y) { drawMino(c, x, y, SHAPES.I, 7, '#F5D542'); drawText(c, 'W', x, y - 10, 10, '#fff'); }, apply(g, p) { p.wide = Math.min(2, p.wide + 1); Sound.sfx.powerup(); } },
  star: { name: 'スコア2倍', color: '#FFE44D', w: 5, draw(c, x, y, t) { drawStar(c, x, y, 13, '#FFE44D', t * 2); drawText(c, '×2', x, y + 1, 9, '#8A5A00'); }, apply(g, p) { p.timers.score = 14; Sound.sfx.item(); } },
  rapid: { name: 'ラピッドファイア', color: '#FF9F6F', w: 5, draw(c, x, y) { iconLetter(c, x, y, 'R', '#D04A00', '#FFD9C0'); }, apply(g, p) { p.timers.rapid = 12; Sound.sfx.powerup(); } },
  magnet: { name: 'マグネット', color: '#FF6F9F', w: 4, draw(c, x, y) { c.strokeStyle = '#FF3D7A'; c.lineWidth = 6; c.beginPath(); c.arc(x, y + 2, 8, Math.PI, TAU); c.stroke(); c.fillStyle = '#FF3D7A'; c.fillRect(x - 11, y + 2, 6, 6); c.fillRect(x + 5, y + 2, 6, 6); c.fillStyle = '#fff'; c.fillRect(x - 11, y + 5, 6, 3); c.fillRect(x + 5, y + 5, 6, 3); }, apply(g, p) { p.timers.magnet = 18; Sound.sfx.item(); } },
  slow: { name: 'スロウ', color: '#B8F0FF', w: 3, draw(c, x, y, t) { c.strokeStyle = '#8EE5FF'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3 + t; c.beginPath(); c.moveTo(x - Math.cos(a) * 12, y - Math.sin(a) * 12); c.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); c.stroke(); } }, apply(g, p) { p.timers.slow = 7; Sound.sfx.item(); } },
  invincible: { name: 'ムテキ', color: '#FFFFFF', w: 2, draw(c, x, y, t) { drawStar(c, x, y, 14, rainbowColor(t * 2), -t * 3); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); }, apply(g, p) { p.timers.invincible = 7; Sound.sfx.fever(); } },
  oneup: { name: '1UP', color: '#9CFF8A', w: 1.2, draw(c, x, y) { iconLetter(c, x, y, '1UP', '#1E8A2E', '#D4FFC8'); }, apply(g, p) { p.lives++; Sound.sfx.oneup(); } },
  blast: { name: 'メガブラスト', color: '#FFB347', w: 3.5, draw(c, x, y, t) { drawStar(c, x, y, 14, '#FF7A3D', t * 4); drawStar(c, x, y, 8, '#FFE066', -t * 4); }, apply(g, p) { g.megaBlast(); } },
  chain: { name: 'れんさアップ', color: '#D2A8FF', w: 3, draw(c, x, y) { c.fillStyle = '#B96BFF'; c.beginPath(); c.arc(x - 6, y, 7, 0, TAU); c.fill(); c.beginPath(); c.arc(x + 6, y, 7, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 6, y - 2, 2, 0, TAU); c.arc(x + 6, y - 2, 2, 0, TAU); c.fill(); }, apply(g, p) { p.chainBonus = Math.min(60, p.chainBonus + 15); Sound.sfx.powerup(); } },
  chargeup: { name: 'チャージアップ', color: '#FFD0FF', w: 3, draw(c, x, y) { iconLetter(c, x, y, 'C', '#A020A0', '#FFD8FF'); }, apply(g, p) { p.chargeSpeed = Math.min(2.5, p.chargeSpeed + 0.35); Sound.sfx.powerup(); } },
  coin: { name: 'コイン', color: '#FFD84D', w: 8, draw(c, x, y, t) { const w = Math.abs(Math.cos(t * 3)) * 11 + 1; c.fillStyle = '#F5C518'; c.beginPath(); c.ellipse(x, y, w, 11, 0, 0, TAU); c.fill(); c.fillStyle = '#FFF0A0'; c.beginPath(); c.ellipse(x, y, w * 0.6, 7, 0, 0, TAU); c.fill(); }, apply(g, p) { g.addScore(500, p.x, p.y - 30); Sound.sfx.item(); } },
  gem: { name: 'ジェム', color: '#7AF0FF', w: 4, draw(c, x, y) { c.fillStyle = '#5AE0FF'; c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x + 11, y - 3); c.lineTo(x, y + 13); c.lineTo(x - 11, y - 3); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x + 11, y - 3); c.lineTo(x - 11, y - 3); c.closePath(); c.fill(); }, apply(g, p) { g.addScore(2500, p.x, p.y - 30); Sound.sfx.item(); } },
  fever: { name: 'フィーバー', color: '#FF5EDB', w: 3, draw(c, x, y, t) { c.fillStyle = rainbowColor(t * 2, 70); c.beginPath(); c.arc(x, y, 12, 0, TAU); c.fill(); drawText(c, 'F', x, y + 1, 16, '#fff'); }, apply(g, p) { g.addFever(45); Sound.sfx.item(); } },
};
// 武器アイテム
for (const w of WEAPONS) {
  ITEMS['W_' + w.key] = {
    name: w.name, color: w.rainbow ? '#fff' : w.color, w: 3.2, weapon: w, isWeapon: true,
    draw(c, x, y, t) { drawMino(c, x, y, w.shape, w.key === 'I' ? 7 : 8, w.rainbow ? rainbowColor(t * 2) : w.color, Math.sin(t * 2) * 0.2); },
    apply(g, p) { p.gainWeapon(w.key); },
  };
}
const ITEM_KEYS = Object.keys(ITEMS);
const WEAPON_ITEM_KEYS = ITEM_KEYS.filter((k) => ITEMS[k].isWeapon);

function randomItemKey(g) {
  const list = ITEM_KEYS.map((k) => ({ k, w: ITEMS[k].w }));
  const p = g.player;
  // 状況に応じた重み調整
  for (const it of list) {
    if (it.k === 'heal' || it.k === 'healBig') it.w *= p.hp < p.maxHp * 0.5 ? 1.8 : 0.8;
    if (it.k === 'option' && p.options >= 4) it.w = 0.3;
    if (it.k === 'rear' && p.rear) it.w = 0.3;
    if (it.k === 'missile' && p.missiles) it.w = 0.3;
    if (it.k === 'speed' && p.speedLv >= 5) it.w = 0.3;
    if (it.k === 'shield' && p.shield > 0) it.w *= 0.4;
  }
  return weightedPick(list).k;
}

class Item {
  constructor(key, x, y) {
    this.key = key; this.def = ITEMS[key]; this.x = x; this.y = y; this.t = rand(10); this.life = 14; this.dead = false;
    this.vx = rand(-60, -30); this.vy = rand(-80, 80); this.r = 18;
  }
  update(dt, g) {
    this.t += dt; this.life -= dt;
    const p = g.player;
    if (p.timers.magnet > 0 && p.alive) {
      const d = dist(this.x, this.y, p.x, p.y);
      if (d < 420) { const k = (1 - d / 420) * 900; this.vx += (p.x - this.x) / d * k * dt; this.vy += (p.y - this.y) / d * k * dt; }
    } else { this.vx += (-45 - this.vx) * dt; this.vy *= 1 - 1.5 * dt; }
    this.x += this.vx * dt; this.y += this.vy * dt + Math.sin(this.t * 3) * 14 * dt;
    if (this.y < 50) this.vy += 100 * dt; if (this.y > H - 20) this.vy -= 100 * dt;
    if (this.x < -40 || this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    if (this.life < 3 && Math.floor(this.life * 8) % 2 === 0) return;
    const bob = Math.sin(this.t * 3) * 3;
    ctx.save(); ctx.translate(this.x, this.y + bob);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.fill();
    ctx.strokeStyle = this.def.color; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = rgba(this.def.color === '#fff' || this.def.color === '#FFFFFF' ? '#FFD0FF' : this.def.color, 0.18); ctx.fill();
    this.def.draw(ctx, 0, 0, this.t);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-8, -9, 4, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
