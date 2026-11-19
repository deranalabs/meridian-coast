// Place finder: snaps each named place to the sidewalk (or the kerbside lane for drive-in places) of a real block.
import { insetConvex } from './geometry2d.js';
import { DISTRICT_BY_ID } from './districts.js';

const DRIVE_IN = new Set(['spray', 'dealer', 'garage']);

function closestOnRing(ring, x, z) {
  let best = null;
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length];
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const length2 = dx * dx + dz * dz || 1;
    const t = Math.max(0.2, Math.min(0.8, ((x - p.x) * dx + (z - p.z) * dz) / length2));
    const px = p.x + dx * t;
    const pz = p.z + dz * t;
    const d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) {
      const length = Math.sqrt(length2);
      best = { d, x: px, z: pz, nx: dz / length, nz: -dx / length };
    }
  });
  return best;
}

/** Resolve PLACES against a layout: returns [{...place, x, z, heading, outX, outZ}]. */
export function findPlaces(layout, places) {
  return places.map((place) => {
    const district = DISTRICT_BY_ID[place.district];
    const [tx, tz] = place.near;
    const blocks = layout.blocks.filter((block) => block.district === place.district && !block.reserved);
    blocks.sort((a, b) => Math.hypot(a.centre.x - tx, a.centre.z - tz) - Math.hypot(b.centre.x - tx, b.centre.z - tz));
    const block = blocks[0];
    const ring = insetConvex(block.polygon, district.sidewalk * 0.5);
    const spot = closestOnRing(ring, tx, tz);
    const toCentre = (block.centre.x - spot.x) * spot.nx + (block.centre.z - spot.z) * spot.nz;
    const outX = toCentre > 0 ? -spot.nx : spot.nx;
    const outZ = toCentre > 0 ? -spot.nz : spot.nz;
    const push = DRIVE_IN.has(place.kind) ? district.sidewalk * 0.5 + 3.2 : 0;
    return {
      ...place,
      x: spot.x + outX * push,
      z: spot.z + outZ * push,
      outX,
      outZ,
      heading: Math.atan2(outX, outZ),
      block: block.id,
    };
  });
}
