// Full-map styling rules: what a pixel of the city canvas shows, and the colour it gets on the sunny map.
// Pure functions of numbers, so the map's look is tested without a canvas.

/** The minimap base palette (ui/minimap.js) that the full map reads back. */
const BASE = [
  ['water', [29, 92, 120]], ['ground', [58, 47, 74]], ['sand', [201, 167, 122]], ['park', [63, 122, 74]],
  ['road', [216, 208, 228]], ['block', [90, 76, 110]],
];
const NEAR = 42 * 42 * 3;

/** The kind of a base pixel, or 'other' (hills, block outlines, blends) when nothing in the palette is near. */
export function classifyPixel(r, g, b) {
  let best = 'other';
  let bestDistance = NEAR;
  for (const [kind, [pr, pg, pb]] of BASE) {
    const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (distance < bestDistance) {
      best = kind;
      bestDistance = distance;
    }
  }
  return best;
}

/** Sea from the shoreline (band 0, pale surf) out to deep water (band 4). */
export const SEA_BANDS = [[168, 234, 236], [96, 206, 226], [56, 176, 216], [34, 144, 196], [24, 112, 164]];
export const SHORE_RADII = [3, 9, 22, 46];

/** The sea band for a water pixel whose nearest land is first found within SHORE_RADII[band] (none: deepest). */
export function seaBand(landWithin) {
  const band = SHORE_RADII.findIndex((radius) => landWithin <= radius);
  return band === -1 ? SEA_BANDS.length - 1 : band;
}

const BLOCK_TONES = [[222, 206, 182], [206, 188, 162], [236, 224, 204]];
const GROUND = [240, 230, 210];
const SAND = [246, 226, 178];
const PARK = [128, 200, 120];
const SIDE_ROAD = [252, 248, 240];
const MAJOR_ROAD = [255, 214, 128];

/** One of the three building tones for the map cell (cx, cy): a fixed hash, so the map is the same every run. */
export function blockTone(cx, cy) {
  const h = Math.imul(cx * 73856093 ^ cy * 19349663, 0x27d4eb2d) >>> 0;
  return BLOCK_TONES[(h >>> 13) % BLOCK_TONES.length];
}

/** A road is major when at least `share` of the window around it is road (side streets are thinner than that). */
export const MAJOR_SHARE = 0.7;
export const roadClass = (roadPixels, windowPixels) => (roadPixels >= windowPixels * MAJOR_SHARE ? 'major' : 'side');

/** `colour` moved `amount` of the way toward `accent` (both [r, g, b]); integers. */
export function tint(colour, accent, amount) {
  return colour.map((value, i) => Math.round(value + (accent[i] - value) * amount));
}

/** '#rrggbb' as [r, g, b]. */
export const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/**
 * The sunny colour of a land pixel: kind from classifyPixel, the district accent ([r, g, b] or null outside the
 * districts), the block tone and the road class.
 */
export function landColour(kind, accent, tone, road) {
  if (kind === 'road') return road === 'major' ? MAJOR_ROAD : SIDE_ROAD;
  if (kind === 'park') return PARK;
  if (kind === 'sand') return SAND;
  const base = kind === 'block' ? tone : GROUND;
  return accent ? tint(base, accent, kind === 'block' ? 0.28 : 0.2) : base;
}
