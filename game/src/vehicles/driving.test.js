// Tests for the driving model: weight, steering, braking, handbrake slide, wall and water hits, and the chase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVehicleState, stepVehicle, steerAngle } from './driving.js';
import { CAR_TYPES } from './carmodels.js';
import { createColliders } from '../world/colliders.js';

const DT = 1 / 60;
const spec = CAR_TYPES.coupe;

function run(state, input, seconds, collide, blocked) {
  for (let t = 0; t < seconds; t += DT) stepVehicle(state, input, DT, collide, blocked);
  return state;
}

test('the weighty numbers: top speeds of 42, 36, 33 and 40 m/s, seven tenths of the old acceleration', () => {
  const numbers = (type) => [CAR_TYPES[type].maxSpeed, CAR_TYPES[type].accel];
  assert.deepEqual(numbers('coupe'), [42, 9.1]);
  assert.deepEqual(numbers('sedan'), [36, 7]);
  assert.deepEqual(numbers('pickup'), [33, 6.3]);
  assert.deepEqual(numbers('cruiser'), [40, 8.75]);
});

test('the wheel reaches 0.45 rad at rest and loses 78 percent of it at top speed', () => {
  assert.ok(Math.abs(steerAngle(spec, 0, 1) - 0.45) < 1e-9);
  assert.ok(Math.abs(steerAngle(spec, spec.maxSpeed, 1) - 0.45 * 0.22) < 1e-9);
  assert.ok(Math.abs(steerAngle(spec, spec.maxSpeed * 3, -1) + 0.45 * 0.22) < 1e-9, 'never less than that');
});

test('the wheel follows at four a second, so a tap of A or D only nudges the car', () => {
  const still = createVehicleState(spec);
  stepVehicle(still, { throttle: 0, steer: 1, handbrake: false }, DT);
  assert.ok(Math.abs(still.steer - 0.45 * 4 * DT) < 1e-9);
  const car = createVehicleState(spec);
  car.vz = 22;
  run(car, { throttle: 0.5, steer: 1, handbrake: false }, 0.12);
  run(car, { throttle: 0.5, steer: 0, handbrake: false }, 1.2);
  // The old handling (0.6 rad, 62 percent, seven a second) turned about half a radian on the same tap.
  assert.ok(Math.abs(car.heading) < 0.36, `a tap turned it ${car.heading.toFixed(2)} rad`);
});

test('full throttle builds speed along +z and stays under top speed', () => {
  const car = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 4);
  assert.ok(car.speed > 18 && car.speed < 25, `${car.speed.toFixed(1)} m/s after four seconds`);
  assert.ok(car.z > 35 && Math.abs(car.x) < 1e-6);
});

test('braking from speed stops the car, then holding brake reverses slowly', () => {
  const car = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 3);
  run(car, { throttle: -1, steer: 0, handbrake: false }, 0.8);
  assert.ok(Math.abs(car.speed) < 3);
  run(car, { throttle: -1, steer: 0, handbrake: false }, 3);
  assert.ok(car.speed < 0 && car.speed > -9.5);
});

test('positive steer turns left (toward +x when heading +z)', () => {
  const car = run(createVehicleState(spec), { throttle: 0.6, steer: 1, handbrake: false }, 2);
  assert.ok(car.heading > 0.3 && car.x > 0);
});

test('the handbrake in a turn makes the car slide sideways more', () => {
  const grip = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 2.5);
  const slide = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 2.5);
  run(grip, { throttle: 0.5, steer: 1, handbrake: false }, 0.8);
  run(slide, { throttle: 0.5, steer: 1, handbrake: true }, 0.8);
  assert.ok(slide.slip > grip.slip * 1.5);
});

test('a wall stops the car instead of letting it through', () => {
  const walls = createColliders();
  walls.addBox({ x0: -20, z0: 30, x1: 20, z1: 40 });
  const collide = (x, z, r) => walls.resolveCircle(x, z, r);
  const car = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 6, collide);
  assert.ok(car.z < 30, `front stayed out of the wall (z ${car.z.toFixed(2)})`);
});

test('a parked car with no input stays exactly where it was put', () => {
  const car = run(createVehicleState(spec, 12, -7, 1.1), { throttle: 0, steer: 0, handbrake: false }, 3);
  assert.equal(car.x, 12);
  assert.equal(car.z, -7);
  assert.equal(car.heading, 1.1);
  assert.equal(car.speed, 0);
});

test('hitting a wall at speed reports an impact over the mission damage threshold; creeping into it does not', () => {
  const walls = createColliders();
  walls.addBox({ x0: -20, z0: 30, x1: 20, z1: 40 });
  const collide = (x, z, r) => walls.resolveCircle(x, z, r);
  let fast = 0;
  const car = createVehicleState(spec);
  for (let t = 0; t < 6; t += DT) {
    stepVehicle(car, { throttle: 1, steer: 0, handbrake: false }, DT, collide);
    fast = Math.max(fast, car.impact);
  }
  let slow = 0;
  const creep = createVehicleState(spec, 0, 27);
  for (let t = 0; t < 3; t += DT) {
    stepVehicle(creep, { throttle: 0.15, steer: 0, handbrake: false }, DT, collide);
    slow = Math.max(slow, creep.impact);
  }
  assert.ok(fast > 3.5, `full-speed impact ${fast.toFixed(2)} m/s`);
  assert.ok(slow < 3.5, `creeping impact ${slow.toFixed(2)} m/s`);
});

test('every civilian type (the mission vans are pickups) pulls away and brakes to a stop', () => {
  for (const type of ['coupe', 'sedan', 'pickup']) {
    const car = run(createVehicleState(CAR_TYPES[type]), { throttle: 1, steer: 0, handbrake: false }, 3);
    assert.ok(car.speed > 11, `${type} reached ${car.speed.toFixed(1)} m/s`);
    let braking = 0;
    while (car.speed > 0.5 && braking < 6) {
      stepVehicle(car, { throttle: -1, steer: 0, handbrake: false }, DT);
      braking += DT;
    }
    assert.ok(braking < 2.5, `${type} took ${braking.toFixed(2)} s to stop`);
  }
});

test('a cruiser is a little slower than the best car but still keeps it in sight through a chase', () => {
  const flat = { throttle: 1, steer: 0, handbrake: false };
  const best = createVehicleState(CAR_TYPES.coupe, 0, -300);
  const police = createVehicleState(CAR_TYPES.cruiser, 0, -320);
  run(best, flat, 25);
  run(police, flat, 25);
  assert.ok(police.speed < best.speed && police.speed > best.speed * 0.94, `${police.speed} against ${best.speed}`);
  assert.ok(best.z - police.z < 75, `fell ${(best.z - police.z).toFixed(0)} m behind, out of a cruiser's sight`);
});

test('water blocks the car', () => {
  const blocked = (x, z) => z > 15;
  const car = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 4, null, blocked);
  assert.ok(car.z <= 15);
});
