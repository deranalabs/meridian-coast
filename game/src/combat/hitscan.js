// Hitscan: one bullet ray against people (capsules), cars (oriented boxes), buildings and the ground.

const BODY_RADIUS = 0.32;

function hitCharacter(o, d, c, best) {
  const p = c.position;
  if (c.tilt !== 0 && Math.abs(c.tilt) > 1) {
    const lx = p.x + Math.sin(c.heading) * Math.sign(c.tilt) * 0.8 - o.x;
    const ly = p.y + 0.2 - o.y;
    const lz = p.z + Math.cos(c.heading) * Math.sign(c.tilt) * 0.8 - o.z;
    const t = lx * d.x + ly * d.y + lz * d.z;
    if (t <= 0 || t >= best) return null;
    const miss = Math.hypot(lx - d.x * t, ly - d.y * t, lz - d.z * t);
    return miss < 0.55 ? t : null;
  }
  const hx = d.x;
  const hz = d.z;
  const horizontal = hx * hx + hz * hz;
  if (horizontal < 1e-6) return null;
  const t = ((p.x - o.x) * hx + (p.z - o.z) * hz) / horizontal;
  if (t <= 0 || t >= best) return null;
  const miss = Math.hypot(o.x + hx * t - p.x, o.z + hz * t - p.z);
  if (miss > BODY_RADIUS) return null;
  const y = o.y + d.y * t - p.y - c.lift;
  if (y < 0.05 || y > 1.82) return null;
  const back = Math.sqrt(BODY_RADIUS * BODY_RADIUS - miss * miss) / Math.sqrt(horizontal);
  return Math.max(0.01, t - back);
}

function hitCar(o, d, car, best) {
  const c = Math.cos(car.heading);
  const s = Math.sin(car.heading);
  const rx = o.x - car.position.x;
  const rz = o.z - car.position.z;
  const origin = [rx * c - rz * s, o.y - car.position.y, rx * s + rz * c];
  const dir = [d.x * c - d.z * s, d.y, d.x * s + d.z * c];
  const half = [car.spec.width / 2, car.spec.roof / 2, car.spec.length / 2];
  const centre = [0, car.spec.roof / 2, 0];
  let near = 0;
  let far = best;
  let axis = 0;
  for (let k = 0; k < 3; k += 1) {
    if (Math.abs(dir[k]) < 1e-8) {
      if (Math.abs(origin[k] - centre[k]) > half[k]) return null;
      continue;
    }
    let t0 = (centre[k] - half[k] - origin[k]) / dir[k];
    let t1 = (centre[k] + half[k] - origin[k]) / dir[k];
    if (t0 > t1) [t0, t1] = [t1, t0];
    if (t0 > near) {
      near = t0;
      axis = k;
    }
    far = Math.min(far, t1);
    if (near > far) return null;
  }
  if (near <= 0) return null;
  const sign = -Math.sign(dir[axis]);
  const local = [0, 0, 0];
  local[axis] = sign;
  return { t: near, normal: { x: local[0] * c + local[2] * s, y: local[1], z: -local[0] * s + local[2] * c } };
}

/**
 * Cast from origin `o` along unit `d` up to `range`. world = {characters, cars, colliders, groundAt, ignore}.
 * Returns {t, point, normal, kind: 'body'|'car'|'wall'|'ground'|'air', target}.
 */
export function castShot(o, d, range, world) {
  let best = range;
  let kind = 'air';
  let target = null;
  let normal = { x: -d.x, y: -d.y, z: -d.z };
  for (const c of world.characters) {
    if (!c.visible || c === world.ignore) continue;
    const t = hitCharacter(o, d, c, best);
    if (t !== null) {
      best = t;
      kind = 'body';
      target = c;
      normal = { x: -d.x, y: 0, z: -d.z };
    }
  }
  for (const car of world.cars) {
    if (!car.visible || car === world.ignoreCar) continue;
    if (Math.abs(car.position.x - o.x) > best + 3 || Math.abs(car.position.z - o.z) > best + 3) continue;
    const hit = hitCar(o, d, car, best);
    if (hit) {
      best = hit.t;
      kind = 'car';
      target = car;
      normal = hit.normal;
    }
  }
  const wall = world.colliders.segmentHit(o.x, o.z, o.x + d.x * best, o.z + d.z * best, 0.75);
  if (wall < 1) {
    best *= wall;
    kind = 'wall';
    target = null;
    normal = { x: -d.x, y: 0, z: -d.z };
  }
  if (d.y < 0) {
    for (let t = 0.5; t < best; t += 0.5) {
      if (o.y + d.y * t <= world.groundAt(o.x + d.x * t, o.z + d.z * t)) {
        best = t;
        kind = 'ground';
        target = null;
        normal = { x: 0, y: 1, z: 0 };
        break;
      }
    }
  }
  return { t: best, point: { x: o.x + d.x * best, y: o.y + d.y * best, z: o.z + d.z * best }, normal, kind, target };
}
