// Canvas texture helpers: tileable value noise, canvas creation and wrapping canvases as three textures.
import * as THREE from '../../vendor/three.module.min.js';
import { createRandom } from '../core/random.js';

export function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }) };
}

/** Tileable fractal value noise in [0, 1], `size` square, starting at `cells` cells per side. */
export function tileableNoise(size, cells, octaves, seed) {
  const random = createRandom(seed);
  const out = new Float32Array(size * size);
  let amplitude = 1;
  let total = 0;
  let grid = cells;
  for (let octave = 0; octave < octaves; octave += 1) {
    const lattice = new Float32Array(grid * grid);
    for (let index = 0; index < lattice.length; index += 1) lattice[index] = random.next();
    for (let y = 0; y < size; y += 1) {
      const gy = (y / size) * grid;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      const row0 = (y0 % grid) * grid;
      const row1 = ((y0 + 1) % grid) * grid;
      for (let x = 0; x < size; x += 1) {
        const gx = (x / size) * grid;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const c0 = x0 % grid;
        const c1 = (x0 + 1) % grid;
        const top = lattice[row0 + c0] + (lattice[row0 + c1] - lattice[row0 + c0]) * sx;
        const bottom = lattice[row1 + c0] + (lattice[row1 + c1] - lattice[row1 + c0]) * sx;
        out[y * size + x] += (top + (bottom - top) * sy) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= 0.5;
    grid *= 2;
  }
  for (let index = 0; index < out.length; index += 1) out[index] /= total;
  return out;
}

/** Paint per-pixel colours: fn(x, y, index) returns [r, g, b, a] in 0..255. */
export function paintPixels(ctx, width, height, fn) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const rgba = fn(x, y, index, data, index * 4);
      if (rgba) {
        data[index * 4] = rgba[0];
        data[index * 4 + 1] = rgba[1];
        data[index * 4 + 2] = rgba[2];
        data[index * 4 + 3] = rgba[3] ?? 255;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** Wrap a canvas as a repeating, mipmapped texture; colour textures are sRGB, data textures linear. */
export function toTexture(canvas, { colour = true, repeat = true, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  texture.anisotropy = anisotropy;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export function clamp255(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** A soft radial glow sprite (white, alpha falling off), used by lamps, light pools and smoke. */
export function glowTexture(size = 128, falloff = 2.2) {
  const { canvas, ctx } = makeCanvas(size, size);
  paintPixels(ctx, size, size, (x, y) => {
    const dx = (x + 0.5) / size * 2 - 1;
    const dy = (y + 0.5) / size * 2 - 1;
    const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    const a = Math.pow(1 - r, falloff);
    return [255, 255, 255, clamp255(a * 255)];
  });
  return toTexture(canvas, { colour: false, repeat: false });
}
