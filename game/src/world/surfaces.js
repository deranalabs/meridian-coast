// Ground surface textures painted on canvas: asphalt with patches and cracks, grass, sand, sidewalk pavers.
import { makeCanvas, tileableNoise, toTexture, clamp255 } from '../render/textures.js';
import { createRandom } from '../core/random.js';

const SIZE = 512;

function asphalt(seed) {
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);
  const broad = tileableNoise(SIZE, 4, 4, seed);
  const fine = tileableNoise(SIZE, 64, 2, seed + 1);
  const random = createRandom(seed);
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let index = 0; index < SIZE * SIZE; index += 1) {
    const speck = random.next() < 0.06 ? random.range(-30, 40) : 0;
    const value = 52 + (broad[index] - 0.5) * 26 + (fine[index] - 0.5) * 22 + speck;
    image.data[index * 4] = clamp255(value);
    image.data[index * 4 + 1] = clamp255(value);
    image.data[index * 4 + 2] = clamp255(value + 4);
    image.data[index * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  ctx.globalAlpha = 0.35;
  for (let patch = 0; patch < 5; patch += 1) {
    ctx.fillStyle = random.chance(0.5) ? '#2a2a2e' : '#4a4a4c';
    ctx.fillRect(random.range(0, SIZE), random.range(0, SIZE), random.range(40, 160), random.range(30, 120));
  }
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#1c1c1e';
  ctx.lineWidth = 1.5;
  for (let crack = 0; crack < 14; crack += 1) {
    let x = random.range(0, SIZE);
    let y = random.range(0, SIZE);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let step = 0; step < 10; step += 1) {
      x += random.range(-14, 14);
      y += random.range(-14, 14);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return toTexture(canvas);
}

function grass(seed) {
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);
  const broad = tileableNoise(SIZE, 6, 4, seed);
  const random = createRandom(seed);
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let index = 0; index < SIZE * SIZE; index += 1) {
    const blade = random.next();
    const g = 0.55 + (broad[index] - 0.5) * 0.5 + (blade - 0.5) * 0.35;
    image.data[index * 4] = clamp255(60 * g + 18);
    image.data[index * 4 + 1] = clamp255(118 * g + 22);
    image.data[index * 4 + 2] = clamp255(46 * g + 12);
    image.data[index * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return toTexture(canvas);
}

function sand(seed) {
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);
  const broad = tileableNoise(SIZE, 8, 4, seed);
  const ripple = tileableNoise(SIZE, 32, 2, seed + 4);
  const random = createRandom(seed);
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let index = 0; index < SIZE * SIZE; index += 1) {
    const grain = (random.next() - 0.5) * 26;
    const shade = (broad[index] - 0.5) * 30 + (ripple[index] - 0.5) * 18 + grain;
    image.data[index * 4] = clamp255(226 + shade);
    image.data[index * 4 + 1] = clamp255(196 + shade);
    image.data[index * 4 + 2] = clamp255(156 + shade * 0.8);
    image.data[index * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return toTexture(canvas);
}

/** Linear data texture: R puddle mask (broad), G fine roughness detail, B large-scale tone variation. */
function groundData(seed) {
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);
  const puddles = tileableNoise(SIZE, 5, 5, seed);
  const detail = tileableNoise(SIZE, 48, 3, seed + 9);
  const tone = tileableNoise(SIZE, 3, 3, seed + 17);
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let index = 0; index < SIZE * SIZE; index += 1) {
    image.data[index * 4] = clamp255(puddles[index] * 255);
    image.data[index * 4 + 1] = clamp255(detail[index] * 255);
    image.data[index * 4 + 2] = clamp255(tone[index] * 255);
    image.data[index * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return toTexture(canvas, { colour: false });
}

/** Paver styles per district in a 2x2 atlas: neon granite, beach terracotta-pink, harbor concrete, cobbles. */
export const PAVER_CELL = { neon: [0, 1], beach: [1, 1], harbor: [0, 0], heights: [1, 0], park: [0, 0] };

function pavers(seed) {
  const cell = 256;
  const { canvas, ctx } = makeCanvas(cell * 2, cell * 2);
  const random = createRandom(seed);
  const styles = [
    { x: 0, y: 0, base: [92, 90, 98], joint: '#2e2c33', rows: 4, cols: 2, jitter: 16 },
    { x: 1, y: 0, base: [214, 162, 140], joint: '#8a6656', rows: 4, cols: 4, jitter: 18 },
    { x: 0, y: 1, base: [168, 164, 156], joint: '#6e6a64', rows: 2, cols: 2, jitter: 10 },
    { x: 1, y: 1, base: [150, 132, 112], joint: '#4e4236', rows: 8, cols: 6, jitter: 26 },
  ];
  for (const style of styles) {
    const ox = style.x * cell;
    const oy = style.y * cell;
    ctx.fillStyle = style.joint;
    ctx.fillRect(ox, oy, cell, cell);
    const w = cell / style.cols;
    const h = cell / style.rows;
    for (let row = 0; row < style.rows; row += 1) {
      const shift = row % 2 ? w / 2 : 0;
      for (let col = -1; col <= style.cols; col += 1) {
        const j = random.range(-style.jitter, style.jitter);
        const [r, g, b] = style.base;
        ctx.fillStyle = `rgb(${clamp255(r + j)},${clamp255(g + j)},${clamp255(b + j)})`;
        const x = Math.max(ox, ox + col * w + shift + 1.5);
        const right = Math.min(ox + cell, ox + col * w + shift + w - 1.5);
        if (right > x) ctx.fillRect(x, oy + row * h + 1.5, right - x, h - 3);
      }
    }
  }
  const image = ctx.getImageData(0, 0, cell * 2, cell * 2);
  for (let index = 0; index < image.data.length; index += 4) {
    const grain = (random.next() - 0.5) * 18;
    image.data[index] = clamp255(image.data[index] + grain);
    image.data[index + 1] = clamp255(image.data[index + 1] + grain);
    image.data[index + 2] = clamp255(image.data[index + 2] + grain);
  }
  ctx.putImageData(image, 0, 0);
  return toTexture(canvas, { repeat: false });
}

export function createSurfaceTextures(seed = 3) {
  return {
    asphalt: asphalt(seed),
    grass: grass(seed + 1),
    sand: sand(seed + 2),
    data: groundData(seed + 3),
    pavers: pavers(seed + 4),
  };
}
