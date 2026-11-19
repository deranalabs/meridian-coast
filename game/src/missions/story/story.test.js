// Unit tests for the story missions' data: places resolve, stages are valid, rewards, the requires chain, the cast,
// the plot, setups against a fake kit, and mission one and two played through the pure state machine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_MISSIONS } from './index.js';
import { BEATS } from './plot.js';
import { PLACES, MISSION_PLACES } from '../../data/places.js';
import { castMember } from '../../data/cast.js';
import { storyPiece } from '../../data/clothing.js';
import { resolveMission } from '../resolve.js';
import { OBJECTIVE_TYPES } from '../objectives.js';
import { createRun, stepRun, restartRun } from '../machine.js';

/** Every place on a grid, facing +z, so ids resolve the way the game resolves them. */
const places = new Map([...PLACES, ...MISSION_PLACES].map((place, i) => [place.id,
  { ...place, x: (i % 6) * 100, z: Math.floor(i / 6) * 100, outX: 0, outZ: 1, heading: 0 }]));
const resolved = STORY_MISSIONS.map((def) => resolveMission(def, places));
const byId = new Map(resolved.map((def) => [def.id, def]));

test('every mission resolves: place ids exist, stage types are known, every stage has text', () => {
  assert.equal(STORY_MISSIONS.length, 6);
  for (const def of resolved) {
    assert.match(def.id, /^[a-z0-9-]+$/);
    assert.ok(def.startAt, `${def.id} has a start`);
    for (const stage of def.stages) {
      assert.ok(OBJECTIVE_TYPES[stage.type], `${def.id}: ${stage.type}`);
      assert.ok(stage.text.length > 8 && stage.text.length < 70, `${def.id}: "${stage.text}"`);
    }
  }
});

test('numbers run 1..n, ids are unique and each mission requires the one before', () => {
  STORY_MISSIONS.forEach((def, i) => {
    assert.equal(def.number, i + 1);
    assert.deepEqual(def.requires, i === 0 ? [] : [STORY_MISSIONS[i - 1].id]);
  });
  assert.equal(new Set(STORY_MISSIONS.map((def) => def.id)).size, STORY_MISSIONS.length);
});

test('rewards are whole, positive and grow with the story', () => {
  let last = 0;
  for (const def of STORY_MISSIONS) {
    assert.ok(Number.isInteger(def.reward.cash) && def.reward.cash > last);
    assert.ok(Number.isInteger(def.reward.respect) && def.reward.respect > 0);
    last = def.reward.cash;
  }
});

test('givers and every speaker are in the cast; costumes exist; the plot agrees', () => {
  for (const def of STORY_MISSIONS) {
    assert.ok(castMember(def.giver), def.giver);
    const lines = [...def.intro, ...def.outro, ...def.stages.flatMap((stage) => stage.talk ?? [])];
    for (const [speaker, text] of lines) {
      assert.ok(castMember(speaker), `${def.id}: ${speaker}`);
      assert.ok(text.length < 120, `${def.id}: line too long`);
    }
    for (const id of def.outfit ?? []) assert.ok(storyPiece(id), id);
    const beat = BEATS.find((entry) => entry.id === def.id);
    assert.ok(beat, `${def.id} in the plot`);
    assert.equal(beat.giver, def.giver);
    assert.equal(beat.title, def.title);
    assert.equal(beat.number, def.number);
  }
});

/** A kit that records what a setup asks for, with the real place lookups. */
function fakeKit() {
  const asked = [];
  const scope = () => ({
    cars: {}, targets: {}, enemies: {}, blips: [], focus: null,
    actor: (id, at) => asked.push(['actor', id, at]) && { position: { x: 0, z: 0 } },
    car: (tag, type, colour, at) => asked.push(['car', tag, at]),
    convoy: (name, options) => asked.push(['convoy', name, options.from, options.to]) && { car: { position: {} } },
    crew: (group, spots) => asked.push(['crew', group, spots.length]),
    course: (name, options) => asked.push(['convoy', name, options.from, options.to]) && { start: () => {} },
  });
  return { asked, kit: { scope, places, point: (id) => places.get(id) } };
}

test('every setup runs for every stage and names only known places and cast', () => {
  for (const def of STORY_MISSIONS) {
    for (let index = 0; index < def.stages.length; index += 1) {
      const { asked, kit } = fakeKit();
      const props = def.setup(kit, index, index > 0);
      props.onStage?.(index);
      props.onPassed?.();
      for (const entry of asked) {
        if (entry[0] === 'actor') assert.ok(castMember(entry[1]) && places.has(entry[2]), entry.join());
        if (entry[0] === 'convoy') assert.ok(places.has(entry[2]) && places.has(entry[3]), entry.join());
      }
    }
  }
});

const at = (id, extra = {}) => ({ x: places.get(id).x, z: places.get(id).z, driving: false, carTag: null, stars: 0,
  dead: false, busted: false, cars: {}, targets: {}, enemies: {}, ...extra });

test('mission one: kiosk, heat fails it, retry from the checkpoint, hand-over passes', () => {
  const run = createRun(byId.get('lantern-run'));
  stepRun(run, at('newsbox'), 0.1);
  assert.equal(run.stage, 1);
  assert.deepEqual(stepRun(run, at('newsbox', { stars: 1 }), 0.1).map((e) => e.reason ?? e.type), ['heat']);
  restartRun(run);
  assert.equal(run.stage, 1);
  assert.equal(stepRun(run, at('pell-hotel', { driving: true }), 3).length, 0, 'no hand-over from a car');
  const events = stepRun(run, at('pell-hotel'), 2);
  assert.equal(events.at(-1).type, 'passed');
});

test('mission two: the evade stage waits for its alarm before it can clear', () => {
  const run = createRun(byId.get('salt-and-chrome'));
  const coupe = { 'voss-coupe': { health: 100 } };
  stepRun(run, at('voss-yard', { driving: true, carTag: 'voss-coupe', cars: coupe }), 0.1);
  assert.equal(run.stage, 1, 'stolen');
  assert.equal(run.status, 'active');
  stepRun(run, at('voss-yard', { driving: true, carTag: 'voss-coupe', cars: coupe, stars: 2 }), 0.1);
  stepRun(run, at('voss-yard', { driving: true, carTag: 'voss-coupe', cars: coupe }), 0.1);
  assert.equal(run.stage, 2, 'lost the police');
  stepRun(run, at('lockup-bay', { driving: true, carTag: 'voss-coupe', cars: { 'voss-coupe': { health: 0 } } }), 0.1);
  assert.equal(run.reason, 'car-destroyed');
});
