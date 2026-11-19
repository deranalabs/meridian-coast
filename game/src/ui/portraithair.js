// Portrait hair and hats: each wardrobe hair style painted behind and over the head in portrait space (0..100).
import { shade } from './portrait.js';

function blob(ctx, circles) {
  ctx.beginPath();
  for (const [x, y, r] of circles) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

/** The cap of hair over the crown, from ear to ear; `fringe` drops it lower over the brow. */
function crown(ctx, fringe = 0, lift = 0) {
  ctx.beginPath();
  ctx.moveTo(33.5, 42);
  ctx.bezierCurveTo(31, 16 - lift, 69, 16 - lift, 66.5, 42);
  ctx.lineTo(65, 36);
  ctx.bezierCurveTo(60, 30 + fringe, 45, 28 + fringe, 36, 34 + fringe * 0.4);
  ctx.closePath();
  ctx.fill();
}

const BACK = {
  long(ctx) {
    ctx.beginPath();
    ctx.moveTo(32, 36);
    ctx.bezierCurveTo(28, 60, 30, 76, 28, 84);
    ctx.lineTo(72, 84);
    ctx.bezierCurveTo(70, 76, 72, 60, 68, 36);
    ctx.fill();
  },
  ponytail(ctx) {
    ctx.beginPath();
    ctx.moveTo(62, 26);
    ctx.bezierCurveTo(80, 28, 78, 52, 72, 70);
    ctx.bezierCurveTo(70, 56, 70, 40, 60, 32);
    ctx.fill();
  },
  bun: (ctx) => blob(ctx, [[50, 17, 8]]),
  afro: (ctx) => blob(ctx, [[50, 33, 25], [30, 42, 10], [70, 42, 10]]),
  curls: (ctx) => blob(ctx, [[36, 30, 8], [44, 22, 9], [56, 22, 9], [64, 30, 8], [34, 40, 6], [66, 40, 6]]),
};

const FRONT = {
  crop: (ctx) => crown(ctx, 2, 2),
  buzz(ctx) {
    ctx.globalAlpha = 0.75;
    crown(ctx, -2, -1);
    ctx.globalAlpha = 1;
  },
  long(ctx) {
    crown(ctx, 3, 3);
    ctx.beginPath();
    ctx.moveTo(34, 36);
    ctx.lineTo(31, 62);
    ctx.lineTo(36, 52);
    ctx.moveTo(66, 36);
    ctx.lineTo(69, 62);
    ctx.lineTo(64, 52);
    ctx.fill();
  },
  ponytail: (ctx) => crown(ctx, -1, 1),
  bun: (ctx) => crown(ctx, -1, 1),
  afro: (ctx) => crown(ctx, -3, 6),
  curls: (ctx) => blob(ctx, [[40, 30, 5], [47, 27, 5], [54, 27, 5], [61, 30, 5]]),
  cap: (ctx) => crown(ctx, -2, 0),
  beanie: (ctx) => crown(ctx, -2, 0),
  sunhat: (ctx) => crown(ctx, -2, 0),
};

/** Paint the hair style's `layer` ('back' behind the head, 'front' over it) in `colour`. */
export function drawHair(ctx, style, colour, layer) {
  const paint = (layer === 'back' ? BACK : FRONT)[style];
  if (!paint) return;
  ctx.fillStyle = layer === 'back' ? shade(colour, -0.15) : colour;
  paint(ctx);
}

/** Hats from the hair slot: a cap with a brim, a knit beanie, a wide straw sun hat. */
export function drawHat(ctx, style, hex) {
  if (style === 'cap') {
    ctx.fillStyle = hex.top;
    ctx.beginPath();
    ctx.moveTo(33, 34);
    ctx.bezierCurveTo(32, 14, 68, 14, 67, 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(hex.top, -0.35);
    ctx.beginPath();
    ctx.ellipse(52, 34, 21, 3.4, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hex.accent;
    ctx.fillRect(48, 21, 6, 6);
  } else if (style === 'beanie') {
    ctx.fillStyle = hex.hair;
    ctx.beginPath();
    ctx.moveTo(33, 36);
    ctx.bezierCurveTo(31, 10, 69, 10, 67, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(hex.hair, -0.3);
    ctx.fillRect(32.5, 31, 35, 6);
    ctx.strokeStyle = shade(hex.hair, 0.2);
    ctx.lineWidth = 0.8;
    for (let x = 37; x < 65; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 31);
      ctx.lineTo(x, 37);
      ctx.stroke();
    }
  } else if (style === 'sunhat') {
    ctx.fillStyle = '#e8d49a';
    ctx.beginPath();
    ctx.ellipse(50, 33, 31, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(36, 33);
    ctx.bezierCurveTo(36, 14, 64, 14, 64, 33);
    ctx.fill();
    ctx.fillStyle = hex.outer ?? hex.accent;
    ctx.fillRect(36, 27, 28, 4);
  }
}
