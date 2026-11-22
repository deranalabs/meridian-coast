// The jump on foot: a short arc of fixed height under gravity, its landing, and keeping that landing out of cars.

const HEIGHT = 0.9;
const GRAVITY = 16;
const LAUNCH = Math.sqrt(2 * GRAVITY * HEIGHT);

/** How high a jump goes and how long it takes to come back to the height it left. */
export const JUMP = Object.freeze({ height: HEIGHT, seconds: (2 * LAUNCH) / GRAVITY });

export function createJump() {
  return { active: false, time: 0, from: 0 };
}

/** Leave the ground from height `y`; only someone grounded can. Returns whether the jump began. */
export function startJump(jump, y) {
  if (jump.active) return false;
  Object.assign(jump, { active: true, time: 0, from: y });
  return true;
}

/** One step of the arc over ground at `floor`: the new height, never under the floor; lands on the way down. */
export function stepJump(jump, dt, floor) {
  jump.time += dt;
  const y = jump.from + LAUNCH * jump.time - 0.5 * GRAVITY * jump.time * jump.time;
  if (y > floor) return y;
  if (jump.time * GRAVITY >= LAUNCH) jump.active = false;
  return floor;
}

/** Where a body of `radius` with its feet at `y` goes so it is in no car: out by the nearest side. */
export function clearOfCars(cars, x, z, y, radius) {
  let px = x;
  let pz = z;
  for (const { position, spec, heading, visible } of cars) {
    if (!visible || y >= position.y + spec.roof) continue;
    const halfW = spec.width / 2 + radius;
    const halfL = spec.length / 2 + radius;
    const dx = px - position.x;
    const dz = pz - position.z;
    if (Math.abs(dx) > halfL + halfW || Math.abs(dz) > halfL + halfW) continue;
    const sin = Math.sin(heading);
    const cos = Math.cos(heading);
    let across = dx * cos - dz * sin;
    let along = dx * sin + dz * cos;
    if (Math.abs(across) >= halfW || Math.abs(along) >= halfL) continue;
    if (halfW - Math.abs(across) < halfL - Math.abs(along)) across = across < 0 ? -halfW : halfW;
    else along = along < 0 ? -halfL : halfL;
    px = position.x + across * cos + along * sin;
    pz = position.z - across * sin + along * cos;
  }
  return { x: px, z: pz };
}
