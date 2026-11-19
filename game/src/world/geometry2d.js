// Plain 2D geometry on {x, z} points: polygon area, half-plane clipping, insets, segment intersection.

export function polygonArea(points) {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}

export function polygonCentroid(points) {
  let x = 0;
  let z = 0;
  for (const point of points) {
    x += point.x;
    z += point.z;
  }
  return { x: x / points.length, z: z / points.length };
}

/** Keep the part of a convex polygon where (p - origin) . normal >= offset (Sutherland-Hodgman). */
export function clipHalfPlane(points, origin, normal, offset) {
  const side = (p) => (p.x - origin.x) * normal.x + (p.z - origin.z) * normal.z - offset;
  const out = [];
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return out;
}

export function pointInConvex(points, p) {
  const sign = Math.sign(polygonArea(points));
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const cross = (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
    if (cross * sign < -1e-6) return false;
  }
  return true;
}

/** Inset a convex polygon by `distance` (each edge moved inward), by clipping with shifted edges. */
export function insetConvex(points, distance) {
  const sign = Math.sign(polygonArea(points));
  let result = points;
  for (let index = 0; index < points.length && result.length > 2; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 1e-6) continue;
    const normal = { x: (-(b.z - a.z) / length) * sign, z: ((b.x - a.x) / length) * sign };
    result = clipHalfPlane(result, a, normal, distance);
  }
  return result;
}

export function rectPolygon(x0, z0, x1, z1) {
  return [
    { x: x0, z: z0 },
    { x: x1, z: z0 },
    { x: x1, z: z1 },
    { x: x0, z: z1 },
  ];
}

/** Parameters (t, u) where segment a->b meets c->d, or null when they do not cross within both. */
export function segmentIntersection(a, b, c, d) {
  const rx = b.x - a.x;
  const rz = b.z - a.z;
  const sx = d.x - c.x;
  const sz = d.z - c.z;
  const denominator = rx * sz - rz * sx;
  if (Math.abs(denominator) < 1e-9) return null;
  const t = ((c.x - a.x) * sz - (c.z - a.z) * sx) / denominator;
  const u = ((c.x - a.x) * rz - (c.z - a.z) * rx) / denominator;
  const eps = 1e-6;
  if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) return null;
  return { t: Math.min(1, Math.max(0, t)), u: Math.min(1, Math.max(0, u)) };
}

/** Distance from p to segment a->b, and the closest parameter t. */
export function distanceToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz;
  let t = lengthSq > 0 ? ((p.x - a.x) * dx + (p.z - a.z) * dz) / lengthSq : 0;
  t = Math.max(0, Math.min(1, t));
  const x = a.x + dx * t;
  const z = a.z + dz * t;
  return { distance: Math.hypot(p.x - x, p.z - z), t };
}
