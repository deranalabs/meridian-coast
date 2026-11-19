// Pursuit units: police cruisers that spawn out of sight, chase, box in, drop officers, search and leave.
import { createVehicleState, stepVehicle } from '../vehicles/driving.js';
import { poseCar } from '../vehicles/carpose.js';
import { createDriver, pursuitControls, ROLE_ORDER } from './pursuit.js';
import { spawnPoint } from './navigate.js';

const NAVY = '#16203a';

/** Cruiser units; ctx = {fleet, colliders, ground, graph, random} from the police system. */
export function createUnits({ fleet, colliders, ground, graph, random }) {
  const units = [];
  const heightAt = (x, z) => ground.surfaceAt(x, z).height;
  const collide = (x, z, r) => colliders.resolveCircle(x, z, r);
  const blocked = (x, z) => ground.surfaceAt(x, z).kind === 'water';
  const clear = (ax, az, bx, bz) => colliders.segmentHit(ax, az, bx, bz, 3) >= 1;

  function adopt(car, x, z, heading, fromPatrol = false) {
    car.lightsOn = true;
    car.police = true;
    car.flashPhase = random() * 0.5;
    const unit = {
      car,
      vehicle: createVehicleState(car.spec, x, z, heading),
      driver: createDriver(ROLE_ORDER[units.length % ROLE_ORDER.length]),
      mode: 'pursue',
      officersOut: false,
      fromPatrol,
      mass: 1.25,
    };
    unit.vehicle.vx = Math.sin(heading) * 8;
    unit.vehicle.vz = Math.cos(heading) * 8;
    poseCar(car, unit.vehicle, heightAt, 0);
    units.push(unit);
    return unit;
  }

  /** A new cruiser on a road 90 to 150 m from the target, out of its sight. */
  function spawn(target) {
    const point = spawnPoint(graph, target.x, target.z, 90, 150, random, (x, z) => clear(x, z, target.x, target.z));
    if (!point) return null;
    const car = fleet.reuse('cruiser', NAVY);
    if (!car) return null;
    return adopt(car, point.x, point.z, point.heading);
  }

  function retire(unit) {
    units.splice(units.indexOf(unit), 1);
    unit.car.lightsOn = false;
    return unit;
  }

  /** One step: target = {x, z, heading, speed, driving}; mode per unit is pursue, search or leave. */
  function update(dt, target, { seen, lastKnown, leave }) {
    const retired = [];
    for (const unit of units) {
      const v = unit.vehicle;
      unit.mode = leave ? 'leave' : seen ? 'pursue' : 'search';
      let goal = target;
      let cruise = 1;
      if (unit.mode === 'search') {
        goal = { x: lastKnown.x, z: lastKnown.z, heading: v.heading, speed: 0 };
        cruise = 0.7;
      } else if (unit.mode === 'leave') {
        goal = { x: v.x + (v.x - target.x), z: v.z + (v.z - target.z), heading: v.heading, speed: 0 };
        cruise = 0.6;
        unit.car.lightsOn = false;
      }
      const controls = unit.officersOut && unit.mode !== 'leave'
        ? { throttle: 0, steer: 0, handbrake: true }
        : pursuitControls(unit.driver, v, goal, dt, { graph, clear, cruise });
      if (unit.mode === 'search' && Math.hypot(goal.x - v.x, goal.z - v.z) < 12) controls.throttle = -0.4;
      stepVehicle(v, controls, dt, collide, blocked);
      poseCar(unit.car, v, heightAt, dt);
      const far = Math.hypot(v.x - target.x, v.z - target.z);
      if ((unit.mode === 'leave' && far > 130) || far > 320) retired.push(unit);
    }
    return retired.map(retire);
  }

  return { units, spawn, adopt, update, retire };
}
