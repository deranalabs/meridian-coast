// Arcade driving model: throttle, brakes, speed-sensitive steering, grip, handbrake drift, walls and the edge.
import { easeCarBack, keepInside } from '../world/boundary.js';

const MAX_STEER = 0.45;
/** The share of the wheel's angle that is gone at top speed. */
const STEER_FADE = 0.78;
/** How fast the wheel follows the hand, per second: low enough that a tap is a nudge. */
const STEER_FOLLOW = 4;
const REVERSE_MAX = 9;
const BRAKE = 26;
const ROLLING_DRAG = 0.12;
const AIR_DRAG = 0.0016;

/** The wheel angle a car wants at `forward` m/s for an input of -1..1 (a spec may carry its own steering). */
export function steerAngle(spec, forward, input) {
  const ratio = Math.min(1, Math.abs(forward) / spec.maxSpeed);
  return input * (spec.maxSteer ?? MAX_STEER) * (1 - ratio * (spec.steerFade ?? STEER_FADE));
}

/** A fresh vehicle state at (x, z) facing `heading` (radians, 0 = +z). */
export function createVehicleState(spec, x = 0, z = 0, heading = 0) {
  return {
    spec,
    x,
    z,
    heading,
    vx: 0,
    vz: 0,
    speed: 0,
    lateral: 0,
    steer: 0,
    yawRate: 0,
    slip: 0,
    spin: 0,
    impact: 0,
  };
}

/**
 * Advance one step. input = {throttle: -1..1, steer: -1..1, handbrake: bool}. `collide(x, z, r)` returns a
 * push-out {x, z, hit, nx, nz}; `blocked(x, z)` says whether the point is off-limits (water).
 */
export function stepVehicle(state, input, dt, collide = null, blocked = null) {
  const spec = state.spec;
  const fx = Math.sin(state.heading);
  const fz = Math.cos(state.heading);
  const rx = -fz;
  const rz = fx;
  let forward = state.vx * fx + state.vz * fz;
  let lateral = state.vx * rx + state.vz * rz;

  const speedRatio = Math.min(1, Math.abs(forward) / spec.maxSpeed);
  const steerTarget = steerAngle(spec, forward, input.steer);
  state.steer += (steerTarget - state.steer) * Math.min(1, dt * (spec.steerFollow ?? STEER_FOLLOW));

  if (input.throttle > 0) {
    if (forward < -0.5) forward += BRAKE * input.throttle * dt;
    else forward += spec.accel * input.throttle * (1 - speedRatio * speedRatio) * dt;
  } else if (input.throttle < 0) {
    if (forward > 0.5) forward -= BRAKE * -input.throttle * dt;
    else forward = Math.max(-REVERSE_MAX, forward - spec.accel * 0.6 * -input.throttle * dt);
  }
  if (input.handbrake) forward -= Math.sign(forward) * Math.min(Math.abs(forward), 9 * dt);
  forward -= forward * (ROLLING_DRAG + Math.abs(forward) * AIR_DRAG) * dt;
  const worldX = fx * forward + rx * lateral;
  const worldZ = fz * forward + rz * lateral;

  const wheelbase = spec.frontAxle - spec.rearAxle;
  let yawTarget = (forward * Math.tan(state.steer)) / wheelbase;
  if (input.handbrake) yawTarget *= 1.55;
  state.yawRate += (yawTarget - state.yawRate) * Math.min(1, dt * (input.handbrake ? 5 : 9));
  state.heading += state.yawRate * dt;

  // The body yaws but the momentum keeps its direction: re-read it in the new frame, then grip bleeds the
  // sideways part. Low rear grip (handbrake) lets it slide: that slip is the drift.
  const nfx = Math.sin(state.heading);
  const nfz = Math.cos(state.heading);
  const nrx = -nfz;
  const nrz = nfx;
  forward = worldX * nfx + worldZ * nfz;
  lateral = worldX * nrx + worldZ * nrz;
  const grip = input.handbrake ? 1.1 : spec.grip;
  const bled = lateral * (1 - Math.exp(-grip * dt));
  lateral -= bled;
  forward += Math.sign(forward) * Math.abs(bled) * 0.35;
  state.vx = nfx * forward + nrx * lateral;
  state.vz = nfz * forward + nrz * lateral;

  easeCarBack(state, dt, input.throttle);
  let nx = state.x + state.vx * dt;
  let nz = state.z + state.vz * dt;
  if (blocked && blocked(nx, nz)) {
    state.vx *= -0.2;
    state.vz *= -0.2;
    nx = state.x;
    nz = state.z;
    forward *= -0.2;
  }
  state.impact = 0;
  if (collide) {
    const radius = spec.width * 0.5;
    const reach = spec.length * 0.3;
    for (const offset of [reach, -reach]) {
      const cx = nx + nfx * offset;
      const cz = nz + nfz * offset;
      const result = collide(cx, cz, radius);
      if (!result.hit) continue;
      nx += result.x - cx;
      nz += result.z - cz;
      const into = state.vx * result.nx + state.vz * result.nz;
      if (into < 0) {
        state.impact = Math.max(state.impact, -into);
        state.vx -= result.nx * into * 1.3;
        state.vz -= result.nz * into * 1.3;
        state.vx *= 0.82;
        state.vz *= 0.82;
        state.yawRate += (offset > 0 ? 1 : -1) * into * 0.02;
      }
    }
  }
  state.x = nx;
  state.z = nz;
  keepInside(state);
  state.speed = state.vx * nfx + state.vz * nfz;
  state.lateral = state.vx * nrx + state.vz * nrz;
  state.slip = Math.abs(state.lateral);
  state.spin += (state.speed / spec.wheelRadius) * dt;
  return state;
}
