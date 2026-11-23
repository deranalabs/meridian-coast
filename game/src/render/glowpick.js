// Which glow halos get drawn: the nearest few within reach, under a fixed cap, and where a car's tail lamps sit.

/** At most this many additive glow quads are on screen at once. */
export const MAX_GLOWS = 200;
/** Of them, this many are kept for the tail lamps of the nearest cars (two a car). */
export const TAIL_GLOWS = 40;
/** Static halos (signs, lit windows) further than this are not drawn. */
export const STATIC_REACH = 170;
/** Cars further than this show no tail halos. */
export const TAIL_REACH = 110;

/**
 * The indices of the `limit` sources nearest (x, z) within `reach`, nearest first, written into `out`.
 * `scratch` is a reusable array of [distance², index] pairs. Returns how many were written.
 */
export function pickNearest(sources, x, z, limit, reach, out, scratch = []) {
  const reach2 = reach * reach;
  let found = 0;
  for (let i = 0; i < sources.length; i += 1) {
    const dx = sources[i].x - x;
    const dz = sources[i].z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 > reach2) continue;
    const pair = scratch[found] ?? (scratch[found] = [0, 0]);
    pair[0] = d2;
    pair[1] = i;
    found += 1;
  }
  scratch.length = Math.max(scratch.length, found);
  const live = scratch.slice(0, found).sort((a, b) => a[0] - b[0]);
  const count = Math.min(limit, found);
  for (let i = 0; i < count; i += 1) out[i] = live[i][1];
  return count;
}

/**
 * The world points of a car's two tail lamps: behind the body by its spec's length, inset from each side, at the
 * height carmodels.js puts them. Heading 0 faces +z. Writes [x, y, z, x, y, z] into `out`.
 */
export function tailLampPoints(car, out = new Array(6)) {
  const { spec, position, heading } = car;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const rear = -spec.length / 2 - 0.12;
  const side = spec.width / 2 - 0.3;
  const y = position.y + (spec.bed ? spec.belt - 0.22 : spec.deck - 0.16);
  for (let k = 0; k < 2; k += 1) {
    const s = k === 0 ? -1 : 1;
    out[k * 3] = position.x + fx * rear + fz * side * s;
    out[k * 3 + 1] = y;
    out[k * 3 + 2] = position.z + fz * rear - fx * side * s;
  }
  return out;
}
