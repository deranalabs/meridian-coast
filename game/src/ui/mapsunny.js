// Full-map palette: a half-size copy of the shared city canvas repainted as a daylight map. The sea deepens away
// from a pale surf line, the park is green, major roads are wide and gold beside cream side streets, and each
// district's ground and blocks (in three tones) carry its faction colour. Rules in ui/mapstyle.js.
import { WORLD_BOUNDS } from '../world/heightfield.js';
import { DISTRICT_LIST, PARK } from '../world/districts.js';
import {
  SHORE_RADII, SEA_BANDS, blockTone, classifyPixel, hexRgb, landColour, roadClass, seaBand,
} from './mapstyle.js';

const SIZE = 1024;
// Hills and blends are lifted toward white, red most, blue least.
const LIFT = [0.54, 0.45, 0.3];
const KINDS = ['other', 'water', 'ground', 'sand', 'park', 'road', 'block'];
const WATER = 1;
const ROAD = 5;
/** Half the side of the window that tells a major road from a side street, and the block tone cell in pixels. */
const ROAD_REACH = 3;
const TONE_CELL = 11;
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];

const toPixel = (x, z) => [(x - WORLD_BOUNDS.x0) / (WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0) * SIZE,
  (z - WORLD_BOUNDS.z0) / (WORLD_BOUNDS.z1 - WORLD_BOUNDS.z0) * SIZE];

function areaRect(rect) {
  const [x0, y0] = toPixel(rect.x0, rect.z0);
  const [x1, y1] = toPixel(rect.x1, rect.z1);
  return { x0, y0, x1, y1 };
}

/** The city canvas (dark minimap colours) repainted for the full-map screen; the original is left untouched. */
export function sunnyCanvas(base) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(base, 0, 0, SIZE, SIZE);
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  const px = image.data;
  const kinds = new Uint8Array(SIZE * SIZE);
  for (let k = 0; k < kinds.length; k += 1) {
    kinds[k] = KINDS.indexOf(classifyPixel(px[k * 4], px[k * 4 + 1], px[k * 4 + 2]));
  }
  const areas = DISTRICT_LIST.map((district) => ({ ...areaRect(district.rect), accent: hexRgb(district.accent) }));
  const park = areaRect(PARK.rect);
  const kindAt = (x, y) => (x < 0 || y < 0 || x >= SIZE || y >= SIZE ? WATER : kinds[y * SIZE + x]);
  const landWithin = (x, y) => {
    for (const radius of SHORE_RADII) {
      for (const [dx, dy] of DIRECTIONS) {
        if (kindAt(Math.round(x + dx * radius), Math.round(y + dy * radius)) !== WATER) return radius;
      }
    }
    return Infinity;
  };
  const roadAround = (x, y) => {
    let count = 0;
    for (let dy = -ROAD_REACH; dy <= ROAD_REACH; dy += 1) {
      for (let dx = -ROAD_REACH; dx <= ROAD_REACH; dx += 1) if (kindAt(x + dx, y + dy) === ROAD) count += 1;
    }
    return count;
  };
  const windowPixels = (ROAD_REACH * 2 + 1) ** 2;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const k = y * SIZE + x;
      const i = k * 4;
      const kind = KINDS[kinds[k]];
      let colour;
      if (kind === 'water') colour = SEA_BANDS[seaBand(landWithin(x, y))];
      else if (kind === 'other') {
        colour = [0, 1, 2].map((c) => 255 - (255 - px[i + c]) * (1 - LIFT[c]));
      } else {
        const inPark = x >= park.x0 && x < park.x1 && y >= park.y0 && y < park.y1;
        const area = areas.find((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1);
        const road = kind === 'road' ? roadClass(roadAround(x, y), windowPixels) : null;
        const tone = blockTone(Math.floor(x / TONE_CELL), Math.floor(y / TONE_CELL));
        colour = landColour(inPark && kind !== 'road' ? 'park' : kind, area?.accent ?? null, tone, road);
      }
      px[i] = colour[0];
      px[i + 1] = colour[1];
      px[i + 2] = colour[2];
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
