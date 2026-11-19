// The Marlin Crown casino tower: stepped bronze-glass tower with a lit crown, built into the facade mesh.
import { addBox, addCornice, addParapet } from './buildingkit.js';
import { heightAt } from './heightfield.js';

const STOREY = 3.4;

/** Write the casino into `builder`; returns its collider, crown light positions and sign spots. */
export function addCasino(builder, block, sidewalk) {
  const b = block.bounds;
  const site = { x0: b.x0 + sidewalk, z0: b.z0 + sidewalk, x1: b.x1 - sidewalk, z1: b.z1 - sidewalk };
  const cx = (site.x0 + site.x1) / 2;
  const cz = (site.z0 + site.z1) / 2;
  const base = heightAt(cx, cz) - 0.6;
  const look = { bay: 3.0, storey: STOREY, tint: [1, 0.92, 0.82], seed: 0.77, roofTint: [0.9, 0.85, 0.8] };
  const podiumTop = base + 0.6 + 4.4 * 2;
  addBox(builder, { ...site, y0: base, y1: podiumTop }, { ...look, tile: 'decoGround', storey: 4.4, vStart: 0 },
    'roofGravel');
  addCornice(builder, site, podiumTop - 0.3, 0.7, 0.5, look);
  const tiers = [
    { half: 17, floors: 36, tile: 'glassBronze' },
    { half: 13.5, floors: 8, tile: 'glassBronze' },
    { half: 10, floors: 5, tile: 'deco' },
    { half: 7, floors: 3, tile: 'lobby' },
  ];
  let y = podiumTop;
  let floorIndex = 0;
  const crown = [];
  for (const tier of tiers) {
    const box = { x0: cx - tier.half, z0: cz - tier.half, x1: cx + tier.half, z1: cz + tier.half, y0: y,
      y1: y + tier.floors * STOREY };
    addBox(builder, box, { ...look, tile: tier.tile, vStart: floorIndex }, 'roofGravel');
    addParapet(builder, box, 0.9, 0.4, look);
    crown.push({ x: cx, y: box.y1 + 0.5, z: cz, half: tier.half });
    floorIndex += tier.floors;
    y = box.y1;
  }
  return {
    collider: { x0: site.x0, z0: site.z0, x1: site.x1, z1: site.z1 },
    crown,
    top: y,
    centre: { x: cx, z: cz },
    signs: [
      { kind: 'roof', x: cx, y: podiumTop + 0.6, z: site.z1 - 0.2, rot: 0, width: 26, district: 'neon',
        word: 'MARLIN CROWN' },
      { kind: 'roof', x: site.x0 + 0.2, y: podiumTop + 0.6, z: cz, rot: -Math.PI / 2, width: 26, district: 'neon',
        word: 'CASINO' },
    ],
  };
}
