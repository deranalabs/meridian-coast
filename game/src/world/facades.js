// Facade atlas: paints 8x4 tiles (one bay by one storey each) into albedo, emissive and material canvases.
import { makeCanvas, tileableNoise, toTexture, clamp255 } from '../render/textures.js';
import { createRandom } from '../core/random.js';

export const ATLAS_COLUMNS = 8;
export const ATLAS_ROWS = 4;
const TILE = 128;
const WIDTH = ATLAS_COLUMNS * TILE;
const HEIGHT = ATLAS_ROWS * TILE;

/** Facade styles: tiles for upper floors (picked per building) and for the street-level storey. */
export const STYLES = {
  glass: { body: ['glassBlue', 'glassTeal', 'glassBronze'], ground: ['lobby', 'shopA'], bay: 3.0 },
  office: { body: ['ribbon', 'ribbonDark'], ground: ['shopA', 'lobby'], bay: 3.4 },
  deco: { body: ['deco', 'decoFin'], ground: ['shopB', 'decoGround'], bay: 3.2 },
  brick: { body: ['brick', 'brickDark'], ground: ['shopB', 'shopA'], bay: 3.3 },
  concrete: { body: ['concrete', 'concreteDuo'], ground: ['shopA', 'plainBase'], bay: 3.4 },
  pastel: { body: ['pastel', 'pastelBalcony'], ground: ['shopB', 'decoGround'], bay: 3.2 },
  stucco: { body: ['stuccoArch', 'pastel'], ground: ['oldShop', 'shopB'], bay: 3.0 },
  oldtown: { body: ['shutters', 'shuttersBalcony'], ground: ['oldShop', 'oldDoor'], bay: 2.8 },
  warehouse: { body: ['corrugated', 'corrugatedWindow'], ground: ['rollerDoor', 'corrugated'], bay: 4.2 },
};

const TILE_ORDER = [
  'glassBlue', 'glassTeal', 'glassBronze', 'ribbon', 'ribbonDark', 'deco', 'decoFin', 'brick',
  'brickDark', 'concrete', 'concreteDuo', 'pastel', 'pastelBalcony', 'stuccoArch', 'shutters', 'shuttersBalcony',
  'corrugated', 'corrugatedWindow', 'rollerDoor', 'lobby', 'shopA', 'shopB', 'decoGround', 'oldShop',
  'oldDoor', 'plainBase', 'roofGravel', 'roofTerracotta', 'roofMetal', 'cornice', 'parapet', 'plainWall',
];

/** Atlas cell [column, row] per tile name. */
export const TILE_CELL = Object.fromEntries(
  TILE_ORDER.map((name, index) => [name, [index % ATLAS_COLUMNS, Math.floor(index / ATLAS_COLUMNS)]]),
);

/** Tiles whose windows are always lit at night (shops and lobbies). */
export const ALWAYS_LIT = new Set(['lobby', 'shopA', 'shopB', 'decoGround', 'oldShop']);

function layers() {
  return { albedo: makeCanvas(WIDTH, HEIGHT), emissive: makeCanvas(WIDTH, HEIGHT), material: makeCanvas(WIDTH, HEIGHT) };
}

/**
 * A painter for one tile: rect(layer, x, y, w, h, style) draws in tile-local pixels (0..128); the material
 * layer takes [tintMask, roughness, metalness] in 0..1.
 */
function tilePainter(canvases, column, row) {
  const ox = column * TILE;
  const oy = row * TILE;
  function fill(layer, style) {
    const ctx = canvases[layer].ctx;
    if (layer === 'material') {
      ctx.fillStyle = `rgb(${style[0] * 255},${style[1] * 255},${style[2] * 255})`;
    } else {
      ctx.fillStyle = style;
    }
    return ctx;
  }
  return {
    rect(layer, x, y, w, h, style) {
      fill(layer, style).fillRect(ox + x, oy + y, w, h);
    },
    gradient(layer, x, y, w, h, stops, vertical = true) {
      const ctx = canvases[layer].ctx;
      const g = vertical
        ? ctx.createLinearGradient(0, oy + y, 0, oy + y + h)
        : ctx.createLinearGradient(ox + x, 0, ox + x + w, 0);
      for (const [t, colour] of stops) g.addColorStop(t, colour);
      ctx.fillStyle = g;
      ctx.fillRect(ox + x, oy + y, w, h);
    },
    arch(layer, x, y, w, h, style) {
      const ctx = fill(layer, style);
      ctx.beginPath();
      ctx.moveTo(ox + x, oy + y + h);
      ctx.lineTo(ox + x, oy + y + w / 2);
      ctx.arc(ox + x + w / 2, oy + y + w / 2, w / 2, Math.PI, 0);
      ctx.lineTo(ox + x + w, oy + y + h);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function glassPane(p, x, y, w, h, tone, random, lit = true) {
  p.gradient('albedo', x, y, w, h, [[0, tone[0]], [0.55, tone[1]], [1, tone[2]]]);
  const streak = random.range(0.2, 0.7) * w;
  p.rect('albedo', x + streak, y, w * 0.12, h, 'rgba(255,255,255,0.08)');
  p.rect('material', x, y, w, h, [0, 0.08, 0.85]);
  if (!lit) {
    p.rect('emissive', x, y, w, h, '#000');
    return;
  }
  const warm = random.chance(0.7);
  p.gradient('emissive', x, y, w, h, warm
    ? [[0, '#ffe2b0'], [0.6, '#d9944e'], [1, '#6a3a22']]
    : [[0, '#e8f2ff'], [0.6, '#8fb0d8'], [1, '#33415a']]);
  if (random.chance(0.5)) {
    for (let slat = y + 3; slat < y + h * 0.6; slat += 5) p.rect('emissive', x, slat, w, 2, 'rgba(0,0,0,0.45)');
  }
  const silhouette = random.range(0.15, 0.7) * w;
  p.rect('emissive', x + silhouette, y + h * 0.55, w * 0.18, h * 0.45, 'rgba(0,0,0,0.6)');
}

function wall(p, colour, roughness = 0.85) {
  p.rect('albedo', 0, 0, TILE, TILE, colour);
  p.rect('emissive', 0, 0, TILE, TILE, '#000');
  p.rect('material', 0, 0, TILE, TILE, [1, roughness, 0]);
}

function punchedWindow(p, x, y, w, h, random, frame = '#e9e4da', tone = ['#3a4a63', '#1f2a3a', '#2b3446']) {
  p.rect('albedo', x - 4, y - 4, w + 8, h + 8, frame);
  p.rect('material', x - 4, y - 4, w + 8, h + 8, [0.2, 0.5, 0.1]);
  glassPane(p, x, y, w, h, tone, random);
  p.rect('albedo', x - 6, y + h + 4, w + 12, 5, '#d8d2c6');
  p.rect('albedo', x + w / 2 - 1, y, 3, h, frame);
}

const PAINTERS = {
  glassBlue(p, random) {
    wall(p, '#5d6d80', 0.4);
    glassPane(p, 0, 0, TILE, 112, ['#6f8fb8', '#2c4466', '#1d2c44'], random);
    p.rect('albedo', 0, 112, TILE, 16, '#2a313c');
    p.rect('material', 0, 112, TILE, 16, [0.3, 0.35, 0.7]);
    p.rect('albedo', 0, 0, 4, TILE, '#a9b4c2');
    p.rect('albedo', 62, 0, 3, 112, '#8f9aa8');
  },
  glassTeal(p, random) {
    wall(p, '#4d6c6c', 0.4);
    glassPane(p, 0, 0, TILE, 108, ['#7fc4c0', '#2a5a62', '#183238'], random);
    p.rect('albedo', 0, 108, TILE, 20, '#1e2a2e');
    p.rect('material', 0, 108, TILE, 20, [0.3, 0.3, 0.8]);
    p.rect('albedo', 0, 0, 3, TILE, '#c0d6d4');
  },
  glassBronze(p, random) {
    wall(p, '#6b5a48', 0.45);
    glassPane(p, 0, 0, TILE, 110, ['#c49a70', '#5a4030', '#2c2018'], random);
    p.rect('albedo', 0, 110, TILE, 18, '#2e261f');
    p.rect('albedo', 0, 0, 5, TILE, '#d8c09a');
    p.rect('albedo', 42, 0, 2, 110, '#b89a78');
    p.rect('albedo', 84, 0, 2, 110, '#b89a78');
  },
  ribbon(p, random) {
    wall(p, '#d9d4c9', 0.8);
    glassPane(p, 0, 34, TILE, 62, ['#5a6f88', '#253348', '#1c2738'], random);
    p.rect('albedo', 0, 96, TILE, 4, '#9c968a');
    p.rect('albedo', 40, 34, 3, 62, '#c9c4b8');
    p.rect('albedo', 85, 34, 3, 62, '#c9c4b8');
  },
  ribbonDark(p, random) {
    wall(p, '#5a5d66', 0.6);
    glassPane(p, 0, 26, TILE, 74, ['#4f6378', '#1d2633', '#141b24'], random);
    p.rect('albedo', 63, 26, 3, 74, '#3a3d44');
  },
  deco(p, random) {
    wall(p, '#ece2cf', 0.8);
    p.rect('albedo', 0, 0, 16, TILE, '#f6efe0');
    p.rect('albedo', 112, 0, 16, TILE, '#f6efe0');
    punchedWindow(p, 30, 26, 68, 74, random, '#cfc3ad');
    p.rect('albedo', 26, 106, 76, 4, '#b9ab92');
  },
  decoFin(p, random) {
    wall(p, '#e6d6bf', 0.8);
    glassPane(p, 22, 18, 84, 88, ['#6b88a8', '#2b3c52', '#1f2b3b'], random);
    for (const x of [18, 60, 102]) p.rect('albedo', x, 0, 8, TILE, '#f8f0e0');
    p.rect('albedo', 0, 108, TILE, 6, '#c7b79c');
  },
  brick(p, random) {
    wall(p, '#9a5440', 0.92);
    for (let y = 0; y < TILE; y += 8) {
      const offset = (y / 8) % 2 ? 8 : 0;
      for (let x = -offset; x < TILE; x += 16) {
        const shade = random.range(-18, 18);
        p.rect('albedo', x, y, 15, 7, `rgb(${clamp255(150 + shade)},${clamp255(80 + shade)},${clamp255(62 + shade)})`);
      }
    }
    p.rect('material', 0, 0, TILE, TILE, [0.6, 0.92, 0]);
    punchedWindow(p, 34, 24, 60, 76, random, '#efe7d8');
  },
  brickDark(p, random) {
    wall(p, '#5e3a30', 0.92);
    for (let y = 0; y < TILE; y += 8) {
      const offset = (y / 8) % 2 ? 8 : 0;
      for (let x = -offset; x < TILE; x += 16) {
        const shade = random.range(-14, 14);
        p.rect('albedo', x, y, 15, 7, `rgb(${clamp255(98 + shade)},${clamp255(60 + shade)},${clamp255(50 + shade)})`);
      }
    }
    p.rect('material', 0, 0, TILE, TILE, [0.4, 0.92, 0]);
    punchedWindow(p, 22, 28, 36, 70, random, '#2b2b2b');
    punchedWindow(p, 72, 28, 36, 70, random, '#2b2b2b');
  },
  concrete(p, random) {
    wall(p, '#b8b4ac', 0.9);
    punchedWindow(p, 16, 30, 40, 64, random, '#8d8a84');
    punchedWindow(p, 72, 30, 40, 64, random, '#8d8a84');
    p.rect('albedo', 0, 120, TILE, 8, '#9c9890');
  },
  concreteDuo(p, random) {
    wall(p, '#a9aab0', 0.9);
    punchedWindow(p, 24, 22, 80, 70, random, '#cfd0d4', ['#55708a', '#26364a', '#1d2836']);
    p.rect('albedo', 0, 112, TILE, 16, '#8e9096');
  },
  pastel(p, random) {
    wall(p, '#f4efe6', 0.85);
    punchedWindow(p, 34, 26, 60, 70, random, '#ffffff', ['#79a8c4', '#2f4e66', '#243a4c']);
    p.rect('albedo', 28, 100, 72, 6, '#ffffff');
  },
  pastelBalcony(p, random) {
    wall(p, '#f2ebe0', 0.85);
    punchedWindow(p, 30, 18, 68, 84, random, '#ffffff', ['#7fb2c8', '#2f4e66', '#243a4c']);
    p.rect('albedo', 20, 92, 88, 4, '#ffffff');
    for (let x = 22; x < 108; x += 7) p.rect('albedo', x, 96, 2, 20, '#ffffff');
    p.rect('albedo', 20, 116, 88, 4, '#e8e0d2');
  },
  stuccoArch(p, random) {
    wall(p, '#efe2cc', 0.9);
    p.arch('albedo', 32, 18, 64, 84, '#d9c8ac');
    p.arch('material', 32, 18, 64, 84, [0.3, 0.6, 0]);
    glassPane(p, 38, 50, 52, 50, ['#5f7f98', '#2a3c50', '#1f2c3a'], random);
    p.arch('albedo', 38, 24, 52, 40, '#4a5f74');
  },
  shutters(p, random) {
    wall(p, '#e9d6b4', 0.92);
    punchedWindow(p, 44, 22, 40, 78, random, '#f4ecdc', ['#66788a', '#2c3846', '#202a34']);
    const shutter = random.pick(['#4f7a5a', '#3f6b8a', '#8a4b3a', '#6b6b3a']);
    for (const x of [24, 88]) {
      p.rect('albedo', x, 20, 16, 82, shutter);
      for (let y = 24; y < 100; y += 5) p.rect('albedo', x + 1, y, 14, 2, 'rgba(0,0,0,0.25)');
      p.rect('material', x, 20, 16, 82, [0, 0.7, 0]);
    }
  },
  shuttersBalcony(p, random) {
    wall(p, '#e4c9a2', 0.92);
    punchedWindow(p, 40, 18, 48, 88, random, '#f4ecdc', ['#66788a', '#2c3846', '#202a34']);
    p.rect('albedo', 30, 100, 68, 5, '#3a3530');
    for (let x = 32; x < 98; x += 6) p.rect('albedo', x, 84, 2, 16, '#2e2a26');
    p.rect('albedo', 30, 82, 68, 3, '#2e2a26');
    p.rect('material', 30, 82, 68, 23, [0, 0.4, 0.8]);
  },
  corrugated(p) {
    wall(p, '#a3a7a6', 0.55);
    for (let x = 0; x < TILE; x += 8) {
      p.gradient('albedo', x, 0, 8, TILE, [[0, '#b9bdbc'], [0.5, '#8a8f8f'], [1, '#c4c8c6']], false);
    }
    p.rect('material', 0, 0, TILE, TILE, [1, 0.5, 0.75]);
  },
  corrugatedWindow(p, random) {
    PAINTERS.corrugated(p, random);
    glassPane(p, 20, 20, 88, 30, ['#7a8c96', '#3a4650', '#283038'], random);
    p.rect('albedo', 18, 50, 92, 4, '#6f7474');
  },
  rollerDoor(p, random) {
    PAINTERS.corrugated(p, random);
    p.rect('albedo', 12, 20, 104, 108, '#7c8183');
    for (let y = 22; y < TILE; y += 6) p.rect('albedo', 12, y, 104, 2, '#5c6062');
    p.rect('albedo', 8, 16, 112, 6, '#d4a63a');
    p.rect('emissive', 52, 6, 24, 6, '#ffb060');
    p.rect('material', 12, 20, 104, 108, [0.2, 0.45, 0.8]);
  },
  lobby(p, random) {
    wall(p, '#2e3036', 0.5);
    glassPane(p, 6, 10, 116, 118, ['#5a6a80', '#2a3240', '#20242c'], random);
    p.gradient('emissive', 6, 10, 116, 118, [[0, '#fff1d0'], [1, '#c48a50']]);
    p.rect('albedo', 40, 40, 48, 88, '#1c1f24');
    p.rect('emissive', 44, 44, 40, 84, '#ffe6b8');
    p.rect('albedo', 0, 0, TILE, 10, '#b9a27a');
    p.rect('material', 0, 0, TILE, 10, [0, 0.3, 1]);
  },
  shopA(p, random) {
    wall(p, '#33363d', 0.6);
    p.rect('albedo', 0, 0, TILE, 26, '#1c1d22');
    p.rect('emissive', 6, 6, 116, 14, random.pick(['#ff4fa0', '#3fe0ff', '#ffb347', '#c45cff']));
    glassPane(p, 6, 32, 116, 96, ['#4f5d70', '#252c38', '#1c2028'], random);
    p.gradient('emissive', 6, 32, 116, 96, [[0, '#fff6dc'], [1, '#d08a48']]);
    for (let x = 14; x < 120; x += 22) p.rect('emissive', x, 90, 14, 30, 'rgba(40,20,30,0.85)');
  },
  shopB(p, random) {
    wall(p, '#e7dccb', 0.85);
    p.rect('albedo', 0, 0, TILE, 22, random.pick(['#2a6f6b', '#8a2f4f', '#2f3f8a', '#b4572a']));
    glassPane(p, 14, 30, 64, 98, ['#5a6a7a', '#262d38', '#1e222a'], random);
    p.gradient('emissive', 14, 30, 64, 98, [[0, '#ffe8c0'], [1, '#b8783c']]);
    p.rect('albedo', 88, 40, 30, 88, '#5a3a28');
    p.rect('emissive', 92, 46, 22, 30, '#ffcf8a');
  },
  decoGround(p, random) {
    wall(p, '#f0e4cc', 0.8);
    p.rect('albedo', 0, 0, TILE, 12, '#c7b08a');
    glassPane(p, 18, 24, 92, 104, ['#6a8098', '#2a3646', '#1f2731'], random);
    p.gradient('emissive', 18, 24, 92, 104, [[0, '#ffeccc'], [1, '#c98a52']]);
    p.rect('albedo', 62, 24, 4, 104, '#e2cfa8');
  },
  oldShop(p, random) {
    wall(p, '#dcc29c', 0.92);
    p.arch('albedo', 18, 18, 92, 110, '#6b4630');
    p.arch('emissive', 26, 26, 76, 102, '#000');
    glassPane(p, 26, 60, 76, 68, ['#5a6672', '#2a3038', '#20242a'], random);
    p.gradient('emissive', 26, 60, 76, 68, [[0, '#ffdca0'], [1, '#b06a34']]);
  },
  oldDoor(p) {
    wall(p, '#d8bb92', 0.92);
    p.arch('albedo', 38, 30, 52, 98, '#5a3a26');
    for (let x = 42; x < 88; x += 8) p.rect('albedo', x, 60, 3, 68, '#4a2e1e');
    p.rect('material', 38, 30, 52, 98, [0, 0.7, 0]);
  },
  plainBase(p, random) {
    wall(p, '#8f8a82', 0.9);
    p.rect('albedo', 0, 100, TILE, 28, '#76716a');
    punchedWindow(p, 30, 24, 68, 60, random, '#5a5752');
  },
  roofGravel(p, random) {
    wall(p, '#6d6a66', 0.95);
    for (let index = 0; index < 900; index += 1) {
      const shade = clamp255(90 + random.range(-40, 40));
      p.rect('albedo', random.range(0, TILE), random.range(0, TILE), 2, 2, `rgb(${shade},${shade - 4},${shade - 8})`);
    }
  },
  roofTerracotta(p, random) {
    wall(p, '#a6503a', 0.85);
    for (let y = 0; y < TILE; y += 16) {
      for (let x = 0; x < TILE; x += 16) {
        const shade = random.range(-20, 20);
        const colour = `rgb(${clamp255(176 + shade)},${clamp255(86 + shade * 0.6)},${clamp255(58 + shade * 0.4)})`;
        p.gradient('albedo', x, y, 16, 16, [[0, colour], [0.8, colour], [1, '#5a2a1e']]);
      }
    }
    p.rect('material', 0, 0, TILE, TILE, [0.2, 0.75, 0]);
  },
  roofMetal(p) {
    wall(p, '#8d9496', 0.45);
    for (let x = 0; x < TILE; x += 16) p.rect('albedo', x, 0, 3, TILE, '#b8bec0');
    p.rect('material', 0, 0, TILE, TILE, [0.6, 0.4, 0.8]);
  },
  cornice(p) {
    wall(p, '#e8e0d0', 0.8);
    p.gradient('albedo', 0, 0, TILE, TILE, [[0, '#f4ede0'], [0.3, '#c8bfae'], [0.55, '#f0e8da'], [1, '#9c9384']]);
    for (let x = 4; x < TILE; x += 12) p.rect('albedo', x, 70, 6, 30, '#b4aa98');
  },
  parapet(p) {
    wall(p, '#d4cec4', 0.88);
    p.rect('albedo', 0, 0, TILE, 14, '#efe9de');
    p.rect('albedo', 0, 110, TILE, 18, '#a8a298');
  },
  plainWall(p) {
    wall(p, '#d8d2c8', 0.9);
  },
};

function addGrain(canvas, ctx, seed, amount) {
  const noise = tileableNoise(WIDTH, 64, 3, seed);
  const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const random = createRandom(seed + 1);
  for (let index = 0; index < WIDTH * HEIGHT; index += 1) {
    const grain = (noise[index] - 0.5) * amount + (random.next() - 0.5) * amount * 0.6;
    image.data[index * 4] = clamp255(image.data[index * 4] + grain);
    image.data[index * 4 + 1] = clamp255(image.data[index * 4 + 1] + grain);
    image.data[index * 4 + 2] = clamp255(image.data[index * 4 + 2] + grain);
  }
  ctx.putImageData(image, 0, 0);
}

/** Paint the atlas once; returns three textures for the building material. */
export function createFacadeAtlas(seed = 5) {
  const canvases = layers();
  canvases.emissive.ctx.fillStyle = '#000';
  canvases.emissive.ctx.fillRect(0, 0, WIDTH, HEIGHT);
  canvases.material.ctx.fillStyle = 'rgb(255,220,0)';
  canvases.material.ctx.fillRect(0, 0, WIDTH, HEIGHT);
  TILE_ORDER.forEach((name, index) => {
    const random = createRandom(seed * 101 + index);
    const painter = tilePainter(canvases, index % ATLAS_COLUMNS, Math.floor(index / ATLAS_COLUMNS));
    PAINTERS[name](painter, random);
  });
  addGrain(canvases.albedo.canvas, canvases.albedo.ctx, seed, 16);
  return {
    albedo: toTexture(canvases.albedo.canvas, { colour: true, repeat: false }),
    emissive: toTexture(canvases.emissive.canvas, { colour: true, repeat: false }),
    material: toTexture(canvases.material.canvas, { colour: false, repeat: false }),
  };
}
