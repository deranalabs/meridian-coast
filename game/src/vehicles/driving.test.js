// Tests for the driving model: acceleration, braking, steering, handbrake slide, wall and water hits, rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVehicleState, stepVehicle } from './driving.js';
import { CAR_TYPES } from './carmodels.js';
import { createColliders } from '../world/colliders.js';

const DT = 1 / 60;
const spec = CAR_TYPES.coupe;

function run(state, input, seconds, collide, blocked) {
  for (let t = 0; t < seconds; t += DT) stepVehicle(state, input, DT, collide, blocked);
  return state;
}

test('full throttle accelerates forward along +z and stays under top speed', () => {
  const car = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 4);
  assert.ok(car.speed > 25 && car.speed < spec.maxSpeed);
  assert.ok(car.z > 40 && Math.abs(car.x) < 1e-6);
});

test('braking from speed stops the car, then holding brake reverses slowly', () => {
  const car = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 3);
  run(car, { throttle: -1, steer: 0, handbrake: false }, 1.4);
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
  run(grip, { throttle: 0.5, steer: 1, handbrake: false }, 0.6);
  run(slide, { throttle: 0.5, steer: 1, handbrake: true }, 0.6);
  assert.ok(slide.slip > grip.slip * 1.5);
});

test('a wall stops the car instead of letting it through', () => {
  const walls = createColliders();
  walls.addBox({ x0: -20, z0: 30, x1: 20, z1: 40 });
  const collide = (x, z, r) => walls.resolveCircle(x, z, r);
  const car = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 5, collide);
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
  for (let t = 0; t < 5; t += DT) {
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
    assert.ok(car.speed > 15, `${type} reached ${car.speed.toFixed(1)} m/s`);
    let braking = 0;
    while (car.speed > 0.5 && braking < 6) {
      stepVehicle(car, { throttle: -1, steer: 0, handbrake: false }, DT);
      braking += DT;
    }
    assert.ok(braking < 2.5, `${type} took ${braking.toFixed(2)} s to stop`);
  }
});

test('water blocks the car', () => {
  const blocked = (x, z) => z > 15;
  const car = run(createVehicleState(spec), { throttle: 1, steer: 0, handbrake: false }, 4, null, blocked);
  assert.ok(car.z <= 15);
});
