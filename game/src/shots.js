// Deterministic screenshot scenes behind ?shot=<name>&seed=N: each sets time of day, actors and camera.
import { heightAt } from './world/heightfield.js';
import { UNITS } from './palette.js';

function nearestSign(game, x, z, district) {
  let best = null;
  let bestDistance = Infinity;
  for (const sign of game.city.buildings.signs) {
    if (sign.kind !== 'flat' || sign.district !== district) continue;
    const d = Math.hypot(sign.x - x, sign.z - z);
    if (d < bestDistance) {
      bestDistance = d;
      best = sign;
    }
  }
  return best;
}

/**
 * Each scene names its time of day and a stage(game) function that places actors and the camera after the
 * world is built; `steps` fixed simulation steps then run before the frame is captured.
 */
export const SHOTS = {
  drive: {
    time: 'dusk',
    steps: 240,
    stage(game) {
      game.camera.position.set(60, 3.2, -55);
      game.camera.lookAt(-40, 6, -62);
      game.ilo.position.set(40, 0.16, -48);
    },
  },
  foot: {
    time: 'night',
    steps: 90,
    stage(game) {
      const sign = nearestSign(game, -60, 20, 'neon');
      const nx = Math.sin(sign.rot);
      const nz = Math.cos(sign.rot);
      const x = sign.x + nx * 2.4;
      const z = sign.z + nz * 2.4;
      const y = heightAt(x, z) + UNITS.kerbHeight;
      game.ilo.position.set(x, y, z);
      game.ilo.heading = Math.atan2(nx, nz) + 0.55;
      game.ilo.play('idle');
      const sideX = nz;
      const sideZ = -nx;
      game.camera.position.set(x + nx * 3.3 + sideX * 1.2, y + 1.45, z + nz * 3.3 + sideZ * 1.2);
      game.camera.lookAt(x - sideX * 0.3, y + 1.55, z - sideZ * 0.3);
      game.focus = game.ilo.position;
    },
  },
  title: {
    time: 'dusk',
    steps: 60,
    stage(game) {
      game.camera.position.set(430, 22, 60);
      game.camera.lookAt(200, 30, -120);
    },
  },
};

export function getShot(name) {
  return SHOTS[name] ?? null;
}
