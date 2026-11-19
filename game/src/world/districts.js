// The four districts plus the park: their rectangles, block sizes, road widths, heights and facade styles.
import { DISTRICTS } from '../palette.js';

/**
 * x runs east and z runs south (north is -z). Each district is a grid of roads; `block` is the target
 * block size, `road` the road width, `sidewalk` the walkway width inside each block.
 */
export const DISTRICT_LIST = Object.freeze([
  {
    id: 'neon',
    ...DISTRICTS.neon,
    rect: { x0: -200, x1: 200, z0: -300, z1: 180 },
    blockX: 74,
    blockZ: 70,
    road: 16,
    sidewalk: 4.5,
    lot: 34,
    height: [24, 120],
    tallChance: 0.35,
    styles: ['glass', 'office', 'deco', 'brick', 'concrete'],
    podiums: true,
    neonSigns: 3,
  },
  {
    id: 'beach',
    ...DISTRICTS.beach,
    rect: { x0: 200, x1: 390, z0: -420, z1: 180 },
    blockX: 52,
    blockZ: 72,
    road: 12,
    sidewalk: 3.6,
    lot: 26,
    height: [8, 26],
    tallChance: 0.12,
    styles: ['pastel', 'deco', 'pastel', 'stucco'],
    podiums: true,
    neonSigns: 2,
  },
  {
    id: 'harbor',
    ...DISTRICTS.harbor,
    rect: { x0: -200, x1: 390, z0: 180, z1: 450 },
    blockX: 104,
    blockZ: 80,
    road: 14,
    sidewalk: 3,
    lot: 46,
    height: [7, 18],
    tallChance: 0.05,
    styles: ['warehouse', 'warehouse', 'brick', 'concrete'],
    podiums: false,
    neonSigns: 1,
  },
  {
    id: 'heights',
    ...DISTRICTS.heights,
    rect: { x0: -520, x1: -200, z0: -300, z1: 260 },
    blockX: 46,
    blockZ: 52,
    road: 10,
    sidewalk: 2.8,
    lot: 16,
    height: [7, 16],
    tallChance: 0.04,
    styles: ['oldtown', 'oldtown', 'stucco', 'brick'],
    podiums: false,
    neonSigns: 1,
  },
]);

export const PARK = Object.freeze({
  id: 'park',
  name: 'Solano Park',
  rect: { x0: -200, x1: 200, z0: -410, z1: -300 },
  road: 12,
});

export const DISTRICT_BY_ID = Object.freeze(Object.fromEntries(DISTRICT_LIST.map((d) => [d.id, d])));

/** The district whose rectangle holds (x, z), or null outside the city grid. */
export function districtAt(x, z) {
  for (const district of DISTRICT_LIST) {
    const r = district.rect;
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return district;
  }
  return null;
}
