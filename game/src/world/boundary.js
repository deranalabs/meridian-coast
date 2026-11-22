// The edge of the world: a soft wall over the last 40 m inside WORLD_BOUNDS that eases cars and walkers back.
import { WORLD_BOUNDS } from './heightfield.js';

/** How deep the band is, in metres in from each edge. */
export const EDGE_BAND = 40;
export const EDGE_LINE = 'Leaving Port Meridian: turn back';
/** Nothing's centre gets nearer the edge than this, so no bumper hangs over it. */
const INSET = 3;
/** A car may head outward at this many m/s for each metre it has left, so it can never reach the edge. */
const OUTWARD_PER_METRE = 1.2;

/** Null outside the band, else {depth: 0..1, left: metres to the edge, inX, inZ: the way back, length 1}. */
export function edgeBand(x, z) {
  const west = x - WORLD_BOUNDS.x0;
  const east = WORLD_BOUNDS.x1 - x;
  const north = z - WORLD_BOUNDS.z0;
  const south = WORLD_BOUNDS.z1 - z;
  const left = Math.min(west, east, north, south);
  if (left >= EDGE_BAND) return null;
  const weight = (distance) => Math.max(0, EDGE_BAND - distance);
  const inX = weight(west) - weight(east);
  const inZ = weight(north) - weight(south);
  const length = Math.hypot(inX, inZ);
  return { depth: Math.min(1, 1 - left / EDGE_BAND), left, inX: inX / length, inZ: inZ / length };
}

/** The hard line behind the soft wall: moves a point {x, z} inside the world. */
export function keepInside(point) {
  point.x = Math.max(WORLD_BOUNDS.x0 + INSET, Math.min(WORLD_BOUNDS.x1 - INSET, point.x));
  point.z = Math.max(WORLD_BOUNDS.z0 + INSET, Math.min(WORLD_BOUNDS.z1 - INSET, point.z));
  return point;
}

/** One step of the soft wall on a vehicle state: the speed bleeds and the nose and momentum turn inward. */
export function easeCarBack(car, dt, throttle = 0) {
  const band = edgeBand(car.x, car.z);
  if (!band) return;
  const { depth, left, inX, inZ } = band;
  const away = Math.atan2(inX, inZ) - car.heading;
  const error = Math.atan2(Math.sin(away), Math.cos(away));
  const moving = Math.min(1, Math.hypot(car.vx, car.vz) / 3 + Math.abs(throttle));
  const turn = Math.sign(error) * Math.min(Math.abs(error), (0.8 + 2.4 * depth) * moving * dt);
  car.heading += turn;
  const bleed = Math.exp(-(0.3 + 1.2 * depth) * dt);
  const { vx, vz } = car;
  car.vx = (vx * Math.cos(turn) + vz * Math.sin(turn)) * bleed;
  car.vz = (vz * Math.cos(turn) - vx * Math.sin(turn)) * bleed;
  const outward = -(car.vx * inX + car.vz * inZ);
  const excess = outward - Math.max(0, left - INSET) * OUTWARD_PER_METRE;
  if (excess > 0) {
    car.vx += inX * excess;
    car.vz += inZ * excess;
  }
}

/** Metres per second the band walks someone back: gentle where it starts, faster than a run near the edge. */
export function footPush(band) {
  return 1 + 7 * band.depth * band.depth;
}
