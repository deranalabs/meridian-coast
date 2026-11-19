// Unit tests for the race and shop stages: gate spacing along a route, race passing and losing, buying an item,
// moving targets for drive stages, and timed stages that fail when the clock runs out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gatesAlong } from './course.js';
import { createRun, stepRun, stageLabel, timeLeft, clock } from './machine.js';

const DT = 1 / 60;
const view = (extra = {}) => ({ x: 0, z: 0, driving: true, carTag: 'mine', stars: 0, dead: false, busted: false,
  cars: {}, targets: {}, enemies: {}, bought: [], ...extra });

test('gates fall every spacing metres along the route and always end on the finish', () => {
  const route = [{ x: 0, z: 0 }, { x: 100, z: 0 }, { x: 100, z: 150 }];
  const gates = gatesAlong(route, 60);
  assert.deepEqual(gates.slice(0, 2), [{ x: 60, z: 0 }, { x: 100, z: 20 }]);
  assert.deepEqual(gates.at(-1), { x: 100, z: 150 });
  for (let i = 1; i < gates.length - 1; i += 1) {
    const step = Math.abs(gates[i].x - gates[i - 1].x) + Math.abs(gates[i].z - gates[i - 1].z);
    assert.ok(step <= 60.001, `gate ${i}`);
  }
  assert.equal(gatesAlong([{ x: 0, z: 0 }, { x: 70, z: 0 }], 60).length, 1, 'no gate crowding the finish');
});

const RACE = { id: 'race', stages: [
  { type: 'race', target: 'course', car: 'mine', inCar: true, limit: 30, text: 'Race' },
  { type: 'buy', item: 'gear:drill', at: { x: 0, z: 0 }, text: 'Buy the drill' },
] };

test('a race passes on the last gate, fails when the rival finishes first or Ilo leaves the car', () => {
  const course = { x: 0, z: 0, gate: 2, gates: 4, arrived: false, beaten: false };
  let run = createRun(RACE);
  assert.deepEqual(stepRun(run, view({ targets: { course } }), DT), []);
  assert.equal(run.memo.gate / run.memo.gates, 0.5);
  course.arrived = true;
  assert.deepEqual(stepRun(run, view({ targets: { course } }), DT).map((e) => e.type), ['cleared', 'stage']);
  run = createRun(RACE);
  stepRun(run, view({ targets: { course: { ...course, arrived: false, beaten: true } } }), DT);
  assert.equal(run.reason, 'beaten');
  run = createRun(RACE);
  stepRun(run, view({ driving: false, targets: { course: { ...course, arrived: false } } }), DT);
  assert.equal(run.reason, 'abandoned');
});

test('a timed stage shows its clock and fails at zero', () => {
  const run = createRun(RACE);
  const course = { x: 0, z: 0, gate: 0, gates: 3, arrived: false, beaten: false };
  assert.equal(stageLabel(run), 'Stage 1 of 2 · 0:30');
  for (let t = 0; t < 29; t += 1) stepRun(run, view({ targets: { course } }), 1);
  assert.equal(Math.round(timeLeft(run)), 1);
  stepRun(run, view({ targets: { course } }), 1.5);
  assert.equal(run.status, 'failed');
  assert.equal(run.reason, 'time');
  assert.equal(clock(125), '2:05');
});

test('a buy stage clears once the shop sold the item; drive stages can aim at a moving target', () => {
  const run = createRun(RACE);
  run.stage = 1;
  assert.deepEqual(stepRun(run, view({ bought: ['wear:cap'] }), DT), []);
  assert.deepEqual(stepRun(run, view({ bought: ['gear:drill'] }), DT).map((e) => e.type), ['cleared', 'passed']);
  const fare = createRun({ id: 'fare', stages: [{ type: 'drive', target: 'drop', radius: 6, text: 'Drop off' }] });
  assert.deepEqual(stepRun(fare, view({ x: 40 }), DT), []);
  const done = stepRun(fare, view({ x: 40, targets: { drop: { x: 42, z: 1 } } }), DT);
  assert.equal(done.at(-1).type, 'passed');
});
