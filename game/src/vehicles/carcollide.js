// Car-to-car contacts: each body is two circles; driven cars push apart and trade momentum, others stand firm.

const RESTITUTION = 0.25;

function circles(car, x, z, heading, out) {
  const reach = car.spec.length * 0.28;
  const fx = Math.sin(heading) * reach;
  const fz = Math.cos(heading) * reach;
  out[0] = x + fx;
  out[1] = z + fz;
  out[2] = x - fx;
  out[3] = z - fz;
  return car.spec.width * 0.5;
}

const ca = new Float32Array(4);
const cb = new Float32Array(4);

/**
 * Resolve contacts between dynamic `bodies` ({car, vehicle, mass}) and every visible car in `cars`. Dynamic
 * bodies have a driving state they own; other cars are treated as immovable. Calls onContact(body, otherCar,
 * otherBody, speed) for each contact with its closing speed.
 */
export function resolveCarContacts(bodies, cars, onContact) {
  const owner = new Map(bodies.map((body, order) => [body.car, { body, order }]));
  bodies.forEach((body, order) => {
    const v = body.vehicle;
    for (const other of cars) {
      if (other === body.car || !other.visible || other.ghost) continue;
      const entry = owner.get(other);
      if (entry && entry.order < order) continue;
      const otherBody = entry?.body;
      const ox = otherBody ? otherBody.vehicle.x : other.position.x;
      const oz = otherBody ? otherBody.vehicle.z : other.position.z;
      if (Math.abs(ox - v.x) > 7 || Math.abs(oz - v.z) > 7) continue;
      const ra = circles(body.car, v.x, v.z, v.heading, ca);
      const rb = circles(other, ox, oz, otherBody ? otherBody.vehicle.heading : other.heading, cb);
      let best = null;
      for (let i = 0; i < 4; i += 2) {
        for (let j = 0; j < 4; j += 2) {
          const dx = ca[i] - cb[j];
          const dz = ca[i + 1] - cb[j + 1];
          const d = Math.hypot(dx, dz);
          const overlap = ra + rb - d;
          if (overlap > 0 && (!best || overlap > best.overlap)) {
            best = { overlap, nx: dx / (d || 1), nz: dz / (d || 1) };
          }
        }
      }
      if (!best) continue;
      const ovx = otherBody ? otherBody.vehicle.vx : 0;
      const ovz = otherBody ? otherBody.vehicle.vz : 0;
      const closing = (v.vx - ovx) * best.nx + (v.vz - ovz) * best.nz;
      const share = otherBody ? otherBody.mass / (body.mass + otherBody.mass) : 1;
      v.x += best.nx * best.overlap * share;
      v.z += best.nz * best.overlap * share;
      if (otherBody) {
        otherBody.vehicle.x -= best.nx * best.overlap * (1 - share);
        otherBody.vehicle.z -= best.nz * best.overlap * (1 - share);
      }
      if (closing < 0) {
        const impulse = -(1 + RESTITUTION) * closing;
        v.vx += best.nx * impulse * share;
        v.vz += best.nz * impulse * share;
        const across = best.nx * Math.cos(v.heading) - best.nz * Math.sin(v.heading);
        v.yawRate += across * Math.min(1.5, -closing * 0.06);
        if (otherBody) {
          otherBody.vehicle.vx -= best.nx * impulse * (1 - share);
          otherBody.vehicle.vz -= best.nz * impulse * (1 - share);
        }
        onContact?.(body, other, otherBody, -closing);
      }
    }
  });
}
