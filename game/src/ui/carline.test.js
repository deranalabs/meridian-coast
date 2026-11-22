// Unit tests for the line by the speedometer: the car's name and its standing, from the flags a car already has.
import test from 'node:test';
import assert from 'node:assert/strict';
import { carLine, JOB_CAR_NAMES } from './carline.js';
import { CAR_TYPES } from '../vehicles/carmodels.js';
import { STORY_MISSIONS } from '../missions/story/index.js';
import { ACTIVITIES } from '../missions/activities/index.js';

const car = (type, flags = {}) => ({ type, spec: CAR_TYPES[type], ...flags });

test('on foot there is no line', () => {
  assert.equal(carLine(null), null);
  assert.equal(carLine(undefined), null);
});

test('a car taken off the street carries its model name and reads Stolen, a police car too', () => {
  for (const type of Object.keys(CAR_TYPES)) {
    assert.deepEqual(carLine(car(type, { parked: true })), { name: CAR_TYPES[type].name, standing: 'Stolen' });
  }
  assert.equal(carLine(car('cruiser', { police: true })).standing, 'Stolen');
});

test('a car the game counts as owned, from the garage or the dealer, is yours', () => {
  assert.deepEqual(carLine(car('coupe', { owned: true })), { name: 'Juno Kestrel GT', standing: 'Yours' });
});

test('a job car goes by its own label while the job holds it, even once it is resprayed', () => {
  const van = car('pickup', { missionTag: 'linen-van' });
  assert.deepEqual(carLine(van), { name: 'Linen van', standing: 'Job car' });
  assert.equal(carLine({ ...van, owned: true }).standing, 'Job car');
});

test('the fare car is a cab', () => {
  assert.deepEqual(carLine(car('sedan', { missionTag: 'cab' })), { name: 'Rask Cabs sedan', standing: 'Cab' });
});

test('a job car the job has let go is an ordinary car again', () => {
  assert.deepEqual(carLine(car('pickup', { missionTag: null })), { name: 'Brava Tradesman', standing: 'Stolen' });
});

test('every car a job names has a label, and an unknown tag falls back to the model', () => {
  const tags = [...STORY_MISSIONS, ...ACTIVITIES]
    .flatMap((def) => [def.car, ...def.stages.map((stage) => stage.car)])
    .filter(Boolean);
  for (const tag of tags) assert.ok(JOB_CAR_NAMES[tag], tag);
  assert.equal(carLine(car('sedan', { missionTag: 'new-job' })).name, 'Calloway Meridia');
});
