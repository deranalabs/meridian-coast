// Character portraits: a bust painted on a canvas from a cast member's colours, build, hair and face marks.
import { castColours } from '../actors/castlook.js';
import { drawHair, drawHat } from './portraithair.js';

const SHOULDERS = { slim: 31, average: 34, broad: 40, heavy: 42, petite: 29 };
const cache = new Map();

/** Mix a #rrggbb colour towards white (amount > 0) or black (amount < 0). */
export function shade(hex, amount) {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (v) => Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function background(ctx, back) {
  const glow = ctx.createRadialGradient(50, 38, 6, 50, 50, 76);
  glow.addColorStop(0, shade(back, 0.35));
  glow.addColorStop(1, shade(back, -0.55));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 100, 100);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 3;
  for (let x = -100; x < 100; x += 11) {
    ctx.beginPath();
    ctx.moveTo(x, 100);
    ctx.lineTo(x + 100, 0);
    ctx.stroke();
  }
}

function torso(ctx, person, hex) {
  const half = SHOULDERS[person.look.build] ?? 34;
  const body = person.look.outer ? hex.outer : hex.top;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(50 - half - 6, 101);
  ctx.quadraticCurveTo(50 - half - 3, 80, 50 - half + 8, 76);
  ctx.lineTo(50 + half - 8, 76);
  ctx.quadraticCurveTo(50 + half + 3, 80, 50 + half + 6, 101);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hex.top;
  ctx.beginPath();
  ctx.moveTo(41, 76);
  ctx.lineTo(50, person.look.outer ? 98 : 86);
  ctx.lineTo(59, 76);
  ctx.fill();
  if (person.look.outer) {
    ctx.strokeStyle = hex.outerLining;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(40, 76);
    ctx.lineTo(50, 99);
    ctx.moveTo(60, 76);
    ctx.lineTo(50, 99);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(50 - half - 6, 92, half * 2 + 12, 9);
}

function head(ctx, p, hex) {
  const skin = hex.skin;
  const neck = 6 + p.neck * 4;
  ctx.fillStyle = shade(skin, -0.18);
  ctx.fillRect(50 - neck, 56, neck * 2, 22);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(34.5, 45, 3, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(65.5, 45, 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const chin = 5 + p.jaw * 7;
  ctx.beginPath();
  ctx.moveTo(34, 40);
  ctx.bezierCurveTo(34, 18, 66, 18, 66, 40);
  ctx.bezierCurveTo(66, 52, 50 + chin, 62, 50, 63);
  ctx.bezierCurveTo(50 - chin, 62, 34, 52, 34, 40);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(44, 34, 6, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function face(ctx, person, p, hex) {
  const brow = 0.9 + p.brow * 1.6;
  ctx.fillStyle = '#f6f2ea';
  ctx.fillRect(41, 42.5, 6, 3);
  ctx.fillRect(53, 42.5, 6, 3);
  ctx.fillStyle = '#1a1214';
  ctx.fillRect(43, 42.5, 2.6, 3);
  ctx.fillRect(55, 42.5, 2.6, 3);
  ctx.strokeStyle = shade(hex.hair, -0.2);
  ctx.lineWidth = brow;
  ctx.beginPath();
  ctx.moveTo(40, 39.5 + p.brow);
  ctx.lineTo(47.5, 38.5);
  ctx.moveTo(52.5, 38.5);
  ctx.lineTo(60, 39.5 + p.brow);
  ctx.stroke();
  ctx.strokeStyle = shade(hex.skin, -0.32);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(50, 44);
  ctx.lineTo(48.5, 51);
  ctx.lineTo(51, 51.5);
  ctx.moveTo(45.5, 56);
  ctx.quadraticCurveTo(50, 57.5, 54.5, 56);
  ctx.stroke();
  if (p.mark === 'beard') {
    ctx.fillStyle = shade(hex.hair, 0.05);
    ctx.beginPath();
    ctx.moveTo(35, 46);
    ctx.bezierCurveTo(37, 58, 44, 64, 50, 64.5);
    ctx.bezierCurveTo(56, 64, 63, 58, 65, 46);
    ctx.bezierCurveTo(60, 54, 56, 53.5, 50, 53.5);
    ctx.bezierCurveTo(44, 53.5, 40, 54, 35, 46);
    ctx.fill();
  } else if (p.mark === 'scar') {
    ctx.strokeStyle = shade(hex.skin, 0.3);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(58, 46);
    ctx.lineTo(62, 53);
    ctx.stroke();
  } else if (p.mark === 'mole') {
    ctx.fillStyle = shade(hex.skin, -0.5);
    ctx.beginPath();
    ctx.arc(57, 53, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function accessory(ctx, person, hex) {
  const kind = person.look.accessory;
  if (kind === 'sunglasses') {
    ctx.fillStyle = '#120a1c';
    ctx.strokeStyle = hex.accent;
    ctx.lineWidth = 0.9;
    for (const x of [39.5, 51.5]) {
      ctx.beginPath();
      ctx.roundRect(x, 41, 9, 5.5, 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(48.5, 43);
    ctx.lineTo(51.5, 43);
    ctx.stroke();
  } else if (kind === 'chain') {
    ctx.strokeStyle = hex.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(42, 77);
    ctx.quadraticCurveTo(50, 90, 58, 77);
    ctx.stroke();
  } else if (kind === 'backpack' || kind === 'bag') {
    ctx.strokeStyle = shade(hex.accent, -0.2);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(kind === 'bag' ? 36 : 33, 78);
    ctx.lineTo(kind === 'bag' ? 64 : 35, 101);
    if (kind === 'backpack') {
      ctx.moveTo(67, 78);
      ctx.lineTo(65, 101);
    }
    ctx.stroke();
  }
}

/**
 * A portrait canvas for `person` (cached per id and size). The bust, hair, hat, face marks and accessory come
 * from data/cast.js, so every cast member has their own silhouette and colours.
 */
export function portraitCanvas(person, size = 128) {
  const key = `${person.id}@${size}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.scale(size / 100, size / 100);
  const hex = castColours(person);
  const p = person.portrait;
  background(ctx, p.back);
  drawHair(ctx, person.look.hair, hex.hair, 'back');
  torso(ctx, person, hex);
  head(ctx, p, hex);
  face(ctx, person, p, hex);
  drawHair(ctx, person.look.hair, hex.hair, 'front');
  drawHat(ctx, person.look.hair, hex);
  accessory(ctx, person, hex);
  cache.set(key, canvas);
  return canvas;
}
