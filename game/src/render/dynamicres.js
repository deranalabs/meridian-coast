// Dynamic resolution: steps the 3D render scale down when frames run long and back up when there is room.

const SLOW_MS = 17.8;
const VSYNC_MS = 17.1;
const STEP = 0.1;
const STABLE_SECONDS = 5;
const RETRY_SECONDS = 20;

/**
 * update(frameMs, dt) with the measured frame interval. Frames above SLOW_MS step the scale down; a long run
 * of vsync-paced frames steps it back up, but never to a scale that just failed until RETRY_SECONDS pass.
 */
export function createDynamicResolution(post, { min = 0.6, max = 1 } = {}) {
  let average = 16.7;
  let cooldown = 1.5;
  let stable = 0;
  let ceiling = max;
  let ceilingTimer = 0;
  return {
    get scale() {
      return post.scale;
    },
    update(frameMs, dt) {
      average += (frameMs - average) * Math.min(1, dt * 2.5);
      cooldown -= dt;
      ceilingTimer -= dt;
      if (ceilingTimer <= 0) ceiling = max;
      stable = average < VSYNC_MS ? stable + dt : 0;
      if (cooldown > 0) return;
      if (average > SLOW_MS && post.scale > min + 1e-3) {
        ceiling = post.scale - 1e-3;
        ceilingTimer = RETRY_SECONDS;
        post.setScale(post.scale - STEP);
        cooldown = 1.5;
        stable = 0;
      } else if (stable > STABLE_SECONDS && post.scale + STEP <= ceiling + 1e-3) {
        post.setScale(post.scale + STEP);
        cooldown = 1.5;
        stable = 0;
      }
    },
  };
}
