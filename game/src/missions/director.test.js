// Unit tests for the director's alarms: an evade stage clears however soon the stars it raised are gone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMissions } from './director.js';
import { createWanted, setStars, clearWanted } from '../police/wanted.js';

const DT = 1 / 60;
const JOB = {
  id: 'alarm-job', number: 1, title: 'Alarm Job', reward: { cash: 100, respect: 1 }, stages: [
    { type: 'goto', at: { x: 0, z: 0 }, quiet: true, text: 'Stand at the door' },
    { type: 'evade', alert: 4, checkpoint: true, text: 'Lose four stars' },
    { type: 'deliver', at: { x: 90, z: 0 }, text: 'Reach the boat' },
  ],
};
const noInput = { pressed: () => false };
const retryKey = { pressed: (code) => code === 'Enter' };

/** A director over the least game it needs, with the real wanted rules behind a stand-in police. */
function setup() {
  const wanted = createWanted();
  const listeners = {};
  const police = {
    wanted,
    alert: (stars) => setStars(wanted, stars),
    standDown: () => clearWanted(wanted),
    heat: () => ({ stars: wanted.stars, seen: wanted.seen, searching: false }),
  };
  const game = {
    time: 0,
    scene: { add() {} },
    city: { layout: { graph: null } },
    ground: { surfaceAt: () => ({ height: 0 }) },
    ilo: { position: { x: 0, y: 0, z: 0 } },
    player: {
      state: { mode: 'foot', car: null, vitals: { health: 100 }, wallet: { cash: 0 } },
      placeOnFoot() {},
    },
    action: { police, events: { on: (name, fn) => { listeners[name] = fn; } } },
  };
  return { missions: createMissions(game, [JOB], new Map()), police, listeners };
}

test('an evade clears when its stars are gone before the next step', () => {
  const { missions, police } = setup();
  missions.jump(JOB.id, 0);
  missions.update(DT, noInput);
  assert.deepEqual([missions.state.run.stage, police.wanted.stars], [1, 4], 'the alarm went up as the stage began');
  police.standDown();
  missions.update(DT, noInput);
  assert.equal(missions.state.run.stage, 2);
});

test('an evade waits while the stars it raised are up', () => {
  const { missions } = setup();
  missions.jump(JOB.id, 0);
  for (let step = 0; step < 5; step += 1) missions.update(DT, noInput);
  assert.equal(missions.state.run.stage, 1);
});

test('a retried evade clears when its stars are gone before the next step', () => {
  const { missions, police, listeners } = setup();
  missions.jump(JOB.id, 1);
  listeners.busted();
  missions.update(DT, noInput);
  assert.equal(missions.state.phase, 'failed');
  missions.update(DT, retryKey);
  assert.deepEqual([missions.state.phase, police.wanted.stars], ['active', 4]);
  police.standDown();
  missions.update(DT, noInput);
  assert.equal(missions.state.run.stage, 2);
});
