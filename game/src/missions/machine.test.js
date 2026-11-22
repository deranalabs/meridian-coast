// Unit tests for the mission machine: stages advance, every failure type, checkpoint restarts, rewards and saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, restartRun, jobLabel, stageLabel, stageTexts } from './machine.js';
import { STORY_MISSIONS } from './story/index.js';
import { ACTIVITIES } from './activities/index.js';
import { createProgress, payReward, cleanProgress, availableMissions, rankFor } from './progress.js';
import { normalise, serialise, parseSave } from '../save/savegame.js';

const DT = 1 / 60;
const view = (extra = {}) => ({ x: 0, z: 0, driving: false, carTag: null, stars: 0, dead: false, busted: false,
  cars: {}, targets: {}, enemies: {}, ...extra });

const DEF = {
  id: 'test-job', number: 1, reward: { cash: 500, respect: 10 },
  stages: [
    { type: 'goto', at: { x: 10, z: 0 }, radius: 3, text: 'Walk over' },
    { type: 'steal', car: 'mark', text: 'Take the car', checkpoint: true },
    { type: 'deliver', car: 'mark', at: { x: 50, z: 0 }, radius: 5, wait: 1, text: 'Park it' },
  ],
};

test('the job label places a story job among the story jobs and names a side job an activity', () => {
  const race = ACTIVITIES[0];
  const defs = [...STORY_MISSIONS, ...ACTIVITIES];
  assert.equal(jobLabel(STORY_MISSIONS[0], defs), 'Job 1 of 8');
  assert.equal(jobLabel(STORY_MISSIONS.at(-1), defs), 'Job 8 of 8', 'activities do not lengthen the story');
  assert.equal(jobLabel(race, defs), 'Activity');
});

test('stages advance in order and the run passes on the last one', () => {
  const run = createRun(DEF);
  assert.equal(stageLabel(run), 'Stage 1 of 3');
  assert.deepEqual(stageTexts(run), { objective: 'Walk over', next: 'Take the car' });
  assert.deepEqual(stepRun(run, view(), DT), []);
  const events = stepRun(run, view({ x: 9 }), DT);
  assert.deepEqual(events.map((e) => e.type), ['cleared', 'stage']);
  assert.equal(run.stage, 1);
  assert.equal(run.checkpoint, 1);
  stepRun(run, view({ driving: true, carTag: 'other' }), DT);
  assert.equal(run.stage, 1, 'the wrong car does not count');
  stepRun(run, view({ driving: true, carTag: 'mark' }), DT);
  assert.equal(run.stage, 2);
  const parked = view({ x: 50, driving: true, carTag: 'mark', cars: { mark: { health: 100 } } });
  for (let i = 0; i < 59; i += 1) stepRun(run, parked, DT);
  assert.equal(run.status, 'active', 'delivery waits a second');
  const last = stepRun(run, parked, DT * 2);
  assert.ok(last.some((e) => e.type === 'passed'));
  assert.equal(run.status, 'passed');
});

test('each failure type stops the run with its reason', () => {
  const cases = [
    [{ dead: true }, 'dead'],
    [{ busted: true }, 'caught'],
  ];
  for (const [extra, reason] of cases) {
    const run = createRun(DEF);
    assert.equal(stepRun(run, view(extra), DT)[0].reason, reason);
    assert.equal(run.status, 'failed');
    assert.deepEqual(stepRun(run, view({ x: 10 }), DT), [], 'a failed run is frozen');
  }
  const wreck = createRun(DEF);
  wreck.stage = 2;
  assert.equal(stepRun(wreck, view({ cars: { mark: { health: 0 } } }), DT)[0].reason, 'car-destroyed');
  const follow = createRun({ id: 'f', stages: [{ type: 'follow', target: 'van', min: 10, max: 60, text: 'Tail' }] });
  assert.equal(stepRun(follow, view({ targets: { van: { x: 80, z: 0 } } }), DT)[0].reason, 'too-far');
  const close = createRun(follow.def);
  let events = [];
  const near = view({ targets: { van: { x: 4, z: 0 } } });
  for (let i = 0; i < 200 && !events.length; i += 1) events = stepRun(close, near, DT);
  assert.equal(events[0].reason, 'spotted');
  const leashed = { type: 'evade', leash: { at: { x: 0, z: 0 }, metres: 20 }, text: 'x' };
  const leash = createRun({ id: 'l', stages: [leashed] });
  assert.equal(stepRun(leash, view({ x: 30, stars: 2 }), DT)[0].reason, 'abandoned');
});

test('defeat and evade objectives finish when the count or the stars reach zero', () => {
  const stages = [{ type: 'defeat', group: 'crew', text: 'x' }, { type: 'evade', text: 'y' }];
  const run = createRun({ id: 'd', stages });
  stepRun(run, view({ enemies: { crew: 2 }, stars: 2 }), DT);
  assert.equal(run.memo.left, 2);
  stepRun(run, view({ enemies: { crew: 0 }, stars: 2 }), DT);
  assert.equal(run.stage, 1);
  stepRun(run, view({ stars: 0 }), DT);
  assert.equal(run.status, 'passed');
});

test('a restart goes back to the last checkpoint with fresh stage state', () => {
  const run = createRun(DEF);
  stepRun(run, view({ x: 10 }), DT);
  stepRun(run, view({ driving: true, carTag: 'mark' }), DT);
  stepRun(run, view({ x: 50, driving: true, carTag: 'mark' }), DT);
  assert.ok(run.memo.wait > 0);
  stepRun(run, view({ busted: true }), DT);
  assert.deepEqual(restartRun(run).map((e) => [e.type, e.index, e.restart]), [['stage', 1, true]]);
  assert.equal(run.status, 'active');
  assert.equal(run.attempts, 2);
  assert.deepEqual(run.memo, {});
  assert.deepEqual(restartRun(run), [], 'only a failed run restarts');
});

test('the reward is paid once and respect sets the rank', () => {
  const progress = createProgress();
  const wallet = { cash: 100 };
  assert.deepEqual(payReward(progress, DEF, wallet), { cash: 500, respect: 10 });
  assert.deepEqual(payReward(progress, DEF, wallet), { cash: 0, respect: 0 });
  assert.equal(wallet.cash, 600);
  assert.equal(rankFor(progress.respect).name, 'Runner');
  const second = { id: 'two', number: 2, requires: ['test-job'] };
  const third = { id: 'three', number: 3, requires: ['two'] };
  assert.deepEqual(availableMissions(progress, [third, second, DEF]).map((d) => d.id), ['two']);
});

test('mission progress survives a save round trip and bad data is cleaned', () => {
  const progress = { done: ['m1-small-change', 'BAD ID', 'm1-small-change'], paid: ['m1-small-change', 'ghost'],
    respect: 12.4, fails: -3 };
  const { save, status } = parseSave(serialise({ ...normalise({}), missions: progress }));
  assert.equal(status, 'ok');
  assert.deepEqual(save.missions, { done: ['m1-small-change'], paid: ['m1-small-change'], respect: 12, fails: 0 });
  assert.deepEqual(cleanProgress(null), createProgress());
  assert.deepEqual(normalise({ cash: 5 }).missions, createProgress());
});
