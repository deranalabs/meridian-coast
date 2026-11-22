// Where the hidden packages lie: open pavement just in from the kerbs, picked from a seed and spread over the map.
import { createRandom } from '../core/random.js';
import { polygonCentroid } from './geometry2d.js';
import { heightAt, WATER_LEVEL } from './heightfield.js';
import { edgeBand } from './boundary.js';
import { PACKAGE_COUNT } from '../economy/packages.js';

const ALONG = 7;
// The narrowest pavement is 2.8 m from kerb to wall: in from the kerb, and still a body's room short of the wall.
const IN_FROM_KERB = 1.3;
/** Room for a body round a parcel, clear of walls and landmarks. */
const CLEAR = 1.2;
const APART = 30;
/** The first one lies this far from where a new game starts, so a player soon learns that they exist. */
const FIRST = { x: 36, z: -68, from: 25 };

function pavement({ layout, ground, colliders }) {
  const open = [];
  for (const block of layout.blocks) {
    const centre = polygonCentroid(block.polygon);
    block.polygon.forEach((from, index) => {
      const to = block.polygon[(index + 1) % block.polygon.length];
      const length = Math.hypot(to.x - from.x, to.z - from.z);
      let inX = -(to.z - from.z) / length;
      let inZ = (to.x - from.x) / length;
      if (inX * (centre.x - from.x) + inZ * (centre.z - from.z) < 0) {
        inX = -inX;
        inZ = -inZ;
      }
      for (let along = ALONG; along < length - IN_FROM_KERB; along += ALONG) {
        const x = from.x + ((to.x - from.x) * along) / length + inX * IN_FROM_KERB;
        const z = from.z + ((to.z - from.z) * along) / length + inZ * IN_FROM_KERB;
        if (heightAt(x, z) <= WATER_LEVEL + 0.3 || edgeBand(x, z)) continue;
        const surface = ground.surfaceAt(x, z);
        if (surface.kind !== 'sidewalk') continue;
        if (colliders.inside(x, z) || colliders.resolveCircle(x, z, CLEAR).hit) continue;
        open.push({ x, y: surface.height, z });
      }
    });
  }
  return open;
}

/**
 * The spots for `seed`, each {x, y, z}: one near the start, then whichever open spot lies farthest from those
 * taken, shuffled a little by the seed, so the twenty ask for the whole map to be seen.
 */
export function packageSpots(world, seed) {
  const random = createRandom(seed * 193 + 17);
  const open = pavement(world).map((spot) => {
    const away = Math.hypot(spot.x - FIRST.x, spot.z - FIRST.z);
    return { spot, weight: 0.55 + 0.45 * random.next(), away, nearest: Infinity };
  });
  const early = open.filter((entry) => entry.away >= FIRST.from).sort((a, b) => a.away - b.away);
  const spots = [];
  let pick = early[0];
  while (pick && spots.length < PACKAGE_COUNT) {
    spots.push(pick.spot);
    const taken = pick.spot;
    pick = null;
    let best = -Infinity;
    for (const entry of open) {
      entry.nearest = Math.min(entry.nearest, Math.hypot(entry.spot.x - taken.x, entry.spot.z - taken.z));
      if (entry.nearest < APART || entry.nearest * entry.weight <= best) continue;
      best = entry.nearest * entry.weight;
      pick = entry;
    }
  }
  return spots;
}
