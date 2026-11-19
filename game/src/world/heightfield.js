// The land's shape as pure functions: height at (x, z), the coast, the harbour quay, the island and hills.

export const WATER_LEVEL = -0.6;
export const BEACH_ROAD_X = 390;
export const BOARDWALK = Object.freeze({ x0: 397, x1: 409 });
export const QUAY_Z = 462;
export const ISLAND = Object.freeze({ x: 640, z: -150, radius: 78 });
export const WORLD_BOUNDS = Object.freeze({ x0: -820, x1: 900, z0: -760, z1: 820 });

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smooth(t) {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

function hills(x, z) {
  const west = 30 * smooth((-200 - x) / 320) + 34 * smooth((-500 - x) / 200);
  const ripple = 3.5 * Math.sin(z * 0.011) + 2 * Math.sin(z * 0.023 + x * 0.013);
  const north = 18 * smooth((-440 - z) / 220) * smooth((x + 260) / 200) * smooth((420 - x) / 60);
  return west + ripple * smooth((-210 - x) / 140) + north;
}

function shore(x, h) {
  if (x <= BOARDWALK.x1) return h;
  if (x <= 470) return 0.35 - (x - BOARDWALK.x1) * 0.0185;
  return Math.max(-6, -0.78 - (x - 470) * 0.06);
}

function harbour(x, z, h) {
  if (z <= QUAY_Z || x < -250) return h;
  const blend = smooth((x + 250) / 30);
  return h + (-6 - h) * blend;
}

function island(x, z, h) {
  const d = Math.hypot(x - ISLAND.x, z - ISLAND.z);
  const top = -6 + 9.8 * smooth(1 - d / ISLAND.radius);
  return Math.max(h, top);
}

/** The stadium sits on a levelled pad cut into the foot of the hills. */
export const STADIUM = Object.freeze({ x: -320, z: 362, radius: 96 });

function stadiumPad(x, z, h) {
  const d = Math.hypot(x - STADIUM.x, z - STADIUM.z);
  return h * smooth((d - STADIUM.radius) / 50);
}

/** Ground height in metres at (x, z); the city grid itself is flat at 0 except the Calder hillside. */
export function heightAt(x, z) {
  let h = hills(x, z);
  h = stadiumPad(x, z, h);
  h = shore(x, h);
  h = harbour(x, z, h);
  h = island(x, z, h);
  return h;
}

/** Ground slope as a unit normal [nx, ny, nz] by central differences. */
export function normalAt(x, z) {
  const e = 1;
  const dx = heightAt(x + e, z) - heightAt(x - e, z);
  const dz = heightAt(x, z + e) - heightAt(x, z - e);
  const length = Math.hypot(dx, 2 * e, dz);
  return [-dx / length, (2 * e) / length, -dz / length];
}
