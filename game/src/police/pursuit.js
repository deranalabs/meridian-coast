// Pursuit driving: steers a police car along a road route or straight at its target, rams, flanks and unsticks.
import { routeBetween } from './navigate.js';

const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Lateral offsets (metres, relative to the target's heading) for each pursuit role. */
const ROLES = {
  ram: { side: 0, ahead: 0 },
  left: { side: -3.2, ahead: 1.5 },
  right: { side: 3.2, ahead: 1.5 },
  block: { side: 0, ahead: 9 },
};
export const ROLE_ORDER = ['ram', 'left', 'right', 'block'];

/** Driver memory for one unit. */
export function createDriver(role = 'ram') {
  return { role, route: [], routeAge: 99, stuck: 0, reverse: 0, reverseSteer: 1 };
}

/**
 * The point this unit drives at: the target's predicted position plus its role offset. target is
 * {x, z, heading, speed}; close units aim at the car itself to ram or box it in.
 */
export function aimPoint(driver, unitX, unitZ, target) {
  const distance = Math.hypot(target.x - unitX, target.z - unitZ);
  const lead = clamp(distance / 30, 0, 1.2) * Math.max(0, target.speed);
  const fx = Math.sin(target.heading);
  const fz = Math.cos(target.heading);
  const role = ROLES[driver.role] ?? ROLES.ram;
  const near = distance < 22 ? 1 : 0;
  return {
    x: target.x + fx * (lead + role.ahead * near) + fz * role.side * near,
    z: target.z + fz * (lead + role.ahead * near) - fx * role.side * near,
  };
}

/**
 * Controls for one step. `vehicle` is the driving state; `clear(ax, az, bx, bz)` says whether the straight line
 * is free of buildings; graph is the road graph for routing round blocks.
 */
export function pursuitControls(driver, vehicle, target, dt, { graph, clear, cruise = 1 }) {
  const goal = aimPoint(driver, vehicle.x, vehicle.z, target);
  const distance = Math.hypot(goal.x - vehicle.x, goal.z - vehicle.z);
  let point = goal;
  driver.routeAge += dt;
  if (distance > 35 && !clear(vehicle.x, vehicle.z, goal.x, goal.z)) {
    if (driver.routeAge > 1.5 || !driver.route.length) {
      driver.route = routeBetween(graph, vehicle.x, vehicle.z, goal.x, goal.z);
      driver.routeAge = 0;
    }
    while (driver.route.length > 1 && Math.hypot(driver.route[0].x - vehicle.x, driver.route[0].z - vehicle.z) < 9) {
      driver.route.shift();
    }
    if (driver.route.length) point = driver.route[0];
  } else {
    driver.route = [];
  }
  const desired = Math.atan2(point.x - vehicle.x, point.z - vehicle.z);
  const error = wrap(desired - vehicle.heading);
  const speed = vehicle.speed;
  if (driver.reverse > 0) {
    driver.reverse -= dt;
    return { throttle: -1, steer: driver.reverseSteer, handbrake: false };
  }
  driver.stuck = Math.abs(speed) < 1.2 ? driver.stuck + dt : 0;
  if (driver.stuck > 1.1 && distance > 6) {
    driver.stuck = 0;
    driver.reverse = 0.9;
    driver.reverseSteer = error > 0 ? -1 : 1;
  }
  let throttle = cruise;
  const close = Math.hypot(target.x - vehicle.x, target.z - vehicle.z);
  if (Math.abs(error) > 1.1 && speed > 14) throttle = -0.6;
  else if (close < 14 && driver.role !== 'ram') throttle = clamp((target.speed - speed) * 0.3 + 0.3, -1, 1);
  if (close < 5 && target.speed < 2 && driver.role !== 'ram') throttle = -1;
  return {
    throttle,
    steer: clamp(error * 2.4, -1, 1),
    handbrake: Math.abs(error) > 1.4 && speed > 10,
  };
}
