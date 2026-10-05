'use strict';
// ===== 共通ユーティリティ =====
const W = 960, H = 540;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeIn = (t) => t * t;
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function weightedPick(list, rng = Math.random) {
  let total = 0; for (const it of list) total += it.w;
  let r = rng() * total;
  for (const it of list) { r -= it.w; if (r <= 0) return it; }
  return list[list.length - 1];
}

function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => { c = amt > 0 ? c + (255 - c) * amt : c * (1 + amt); return Math.round(clamp(c, 0, 255)); };
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function hsl(h, s, l, a = 1) { return `hsla(${h},${s}%,${l}%,${a})`; }

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const FONT = "'M PLUS Rounded 1c','Rounded Mplus 1c','Hiragino Maru Gothic ProN','Yu Gothic UI','Meiryo','IPAPGothic','Noto Sans CJK JP',sans-serif";
function drawText(ctx, text, x, y, size, color = '#fff', align = 'center', opts = {}) {
  ctx.save();
  ctx.font = `${opts.weight || 'bold'} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = opts.baseline || 'middle';
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (opts.shadow) { ctx.shadowColor = opts.shadow; ctx.shadowBlur = opts.shadowBlur || 12; }
  if (opts.outline) { ctx.lineJoin = 'round'; ctx.lineWidth = opts.outlineWidth || Math.max(3, size * 0.16); ctx.strokeStyle = opts.outline; ctx.strokeText(text, x, y); }
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.restore();
}

// ===== テトロミノ定義 =====
const SHAPES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
  M: [[0, 0]],
  P: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  D: [[0, 0], [1, 0]],
};
const TETROMINO_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const MINO_COLORS = { I: '#4DEBF5', O: '#F5D542', T: '#B86BF0', S: '#5BE06A', Z: '#F25C6E', J: '#4F7BF5', L: '#F5944D', M: '#F58BC9', P: '#6FE8D2', D: '#FFFFFF' };

const _boundsCache = new Map();
function shapeBounds(cells) {
  let b = _boundsCache.get(cells);
  if (b) return b;
  let minx = 99, miny = 99, maxx = -99, maxy = -99;
  for (const [x, y] of cells) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  b = { minx, miny, maxx, maxy, w: maxx - minx + 1, h: maxy - miny + 1, cx: (minx + maxx + 1) / 2, cy: (miny + maxy + 1) / 2 };
  _boundsCache.set(cells, b);
  return b;
}
function shapeRadius(cells, size) { const b = shapeBounds(cells); return Math.max(b.w, b.h) * size * 0.5; }

// ベベル付きのミノを (x,y) 中心に描く
function drawMino(ctx, x, y, cells, size, color, rot = 0, alpha = 1, glow = false) {
  const b = shapeBounds(cells);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = size * 1.2; }
  const light = shade(color, 0.5), dark = shade(color, -0.38);
  const bev = Math.max(1.5, size * 0.18);
  for (const [cx, cy] of cells) {
    const px = (cx - b.cx) * size, py = (cy - b.cy) * size;
    ctx.fillStyle = color; ctx.fillRect(px, py, size, size);
    ctx.fillStyle = light; ctx.fillRect(px, py, size, bev); ctx.fillRect(px, py, bev, size);
    ctx.fillStyle = dark; ctx.fillRect(px, py + size - bev, size, bev); ctx.fillRect(px + size - bev, py, bev, size);
    if (size >= 14) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + bev * 1.5, py + bev * 1.5, size * 0.22, size * 0.22); }
  }
  ctx.restore();
}

// 背景用：輪郭だけの半透明ミノ
function drawMinoGhost(ctx, x, y, cells, size, color, rot = 0, alpha = 0.35) {
  const b = shapeBounds(cells);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, size * 0.08); ctx.shadowColor = color; ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = rgba(color, 0.18);
  for (const [cx, cy] of cells) { const px = (cx - b.cx) * size, py = (cy - b.cy) * size; ctx.fillRect(px + 2, py + 2, size - 4, size - 4); ctx.strokeRect(px + 2, py + 2, size - 4, size - 4); }
  ctx.restore();
}

// ===== ぷよカラー =====
const PUYO_COLORS = [
  { name: 'あか', main: '#FF5E7A', dark: '#C83050', light: '#FFC2CF', eye: 'round' },
  { name: 'みどり', main: '#5BE06A', dark: '#2E9E3C', light: '#C8F7CC', eye: 'sleepy' },
  { name: 'あお', main: '#4FA3FF', dark: '#2360C0', light: '#C4E0FF', eye: 'droopy' },
  { name: 'きいろ', main: '#FFD84D', dark: '#C99A10', light: '#FFF2B8', eye: 'star' },
  { name: 'むらさき', main: '#B96BFF', dark: '#7A36C8', light: '#E6CCFF', eye: 'cat' },
];
const OJAMA_COLOR = { name: 'おじゃま', main: '#9AA0B0', dark: '#5C6270', light: '#E0E3EA', eye: 'dot' };
function rainbowColor(t, l = 62) { return hsl((t * 120) % 360, 90, l); }
function puyoColor(idx, t = 0) {
  if (idx === -1) return OJAMA_COLOR;
  if (idx === 5) return { name: 'レインボー', main: rainbowColor(t), dark: hsl((t * 120) % 360, 80, 40), light: hsl((t * 120) % 360, 90, 88), eye: 'round' };
  return PUYO_COLORS[idx];
}
