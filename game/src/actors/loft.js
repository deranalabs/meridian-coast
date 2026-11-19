// Loft geometry: smooth shapes swept through elliptical rings, the base of every body part and garment.
import * as THREE from '../../vendor/three.module.min.js';

/**
 * Rings are [y, rx, rz, cx = 0, cz = 0, flatten = 0]: an ellipse of radii rx, rz centred at (cx, cz) at height
 * y; `flatten` squares the back (negative z) half toward a flat panel. Caps close the first and last ring.
 * `arc` limits the sweep (radians, centred on +z) to make open panels such as a hood or brim.
 */
export function loft(rings, { segments = 12, capStart = true, capEnd = true, arc = Math.PI * 2 } = {}) {
  const positions = [];
  const indices = [];
  const closed = arc >= Math.PI * 2 - 1e-4;
  const columns = closed ? segments : segments + 1;
  for (const ring of rings) {
    const [y, rx, rz, cx = 0, cz = 0, flatten = 0] = ring;
    for (let s = 0; s < columns; s += 1) {
      const angle = closed ? (s / segments) * Math.PI * 2 : -arc / 2 + (s / segments) * arc;
      let x = Math.sin(angle) * rx;
      let z = Math.cos(angle) * rz;
      if (flatten > 0 && z < 0) z *= 1 - flatten * 0.5;
      positions.push(cx + x, y, cz + z);
    }
  }
  const ascending = rings.length > 1 && rings[rings.length - 1][0] > rings[0][0];
  for (let r = 0; r + 1 < rings.length; r += 1) {
    for (let s = 0; s < segments; s += 1) {
      const next = closed ? (s + 1) % columns : s + 1;
      const a = r * columns + s;
      const b = r * columns + next;
      const c = (r + 1) * columns + s;
      const d = (r + 1) * columns + next;
      if (ascending) indices.push(a, b, c, b, d, c);
      else indices.push(a, c, b, b, c, d);
    }
  }
  const addCap = (ringIndex, isStart) => {
    const ring = rings[ringIndex];
    const centre = positions.length / 3;
    positions.push(ring[3] ?? 0, ring[0], ring[4] ?? 0);
    const base = ringIndex * columns;
    const facesDown = isStart === ascending;
    for (let s = 0; s < segments; s += 1) {
      const next = closed ? (s + 1) % columns : s + 1;
      if (facesDown) indices.push(centre, base + next, base + s);
      else indices.push(centre, base + s, base + next);
    }
  };
  if (capStart && closed) addCap(0, true);
  if (capEnd && closed) addCap(rings.length - 1, false);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Scale every ring's radii by `factor` and add `extra` metres: used to inflate clothing over a body part. */
export function inflate(rings, factor = 1, extra = 0) {
  return rings.map(([y, rx, rz, cx = 0, cz = 0, flatten = 0]) => [y, rx * factor + extra, rz * factor + extra, cx, cz,
    flatten]);
}

/** Rings between heights y0 and y1 (interpolating at the ends) taken from a profile, for sleeves and hems. */
export function sliceRings(rings, y0, y1) {
  const lo = Math.min(y0, y1);
  const hi = Math.max(y0, y1);
  const sample = (y) => {
    for (let index = 0; index + 1 < rings.length; index += 1) {
      const a = rings[index];
      const b = rings[index + 1];
      const min = Math.min(a[0], b[0]);
      const max = Math.max(a[0], b[0]);
      if (y >= min && y <= max) {
        const t = max === min ? 0 : (y - a[0]) / (b[0] - a[0]);
        return a.map((value, k) => (k === 0 ? y : value + ((b[k] ?? 0) - value) * t));
      }
    }
    const last = rings[rings.length - 1];
    const nearest = Math.abs(y - rings[0][0]) < Math.abs(y - last[0]) ? rings[0] : last;
    return [y, ...nearest.slice(1)];
  };
  const inside = rings.filter((ring) => ring[0] > lo && ring[0] < hi);
  const ordered = [sample(y0), ...inside.sort((a, b) => (y0 < y1 ? a[0] - b[0] : b[0] - a[0])), sample(y1)];
  return ordered;
}
