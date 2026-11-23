// Unit tests for the screenshot sheet: its four slots in order, and the story point the map scene stands at.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOT_LIST } from './shot-list.mjs';
import { getShot } from '../game/src/shots.js';
import { STORY_POINTS, storyTotals } from '../game/src/shotsstory.js';
import { createArsenal } from '../game/src/combat/arsenal.js';
import { createVitals } from '../game/src/combat/vitals.js';
import { createWallet } from '../game/src/economy/wallet.js';
import { createProgress, availableMissions } from '../game/src/missions/progress.js';
import { STORY_MISSIONS } from '../game/src/missions/story/index.js';
import { ACTIVITIES } from '../game/src/missions/activities/index.js';

/** Only what a scene's stage() touches; records the stars and the cars the police adopt. */
function stagedGame() {
  const seen = { stars: 0, cruisers: 0 };
  const game = {
    missions: { progress: createProgress() },
    ownedCars: [],
    player: {
      state: { wallet: createWallet(0), arsenal: createArsenal(), vitals: createVitals() },
      placeOnFoot() {},
    },
    fleet: { reuse: (type) => ({ type }) },
    action: {
      police: {
        setStars: (stars) => { seen.stars = stars; },
        units: { adopt: () => { seen.cruisers += 1; } },
      },
    },
  };
  return { game, seen };
}

test('the sheet is the chase, the street job, the shop and Progress, in that order', () => {
  assert.deepEqual(SHOT_LIST.map((shot) => `${shot.name}:${shot.file}`), [
    'mission:1-mission.jpg', 'street:2-street.jpg', 'shop:3-shop.jpg', 'progress:4-progress.jpg',
  ]);
});

test('the sheet sorts by file name as listed, and every slot has a scene; map, fight and rain stay debug', () => {
  const files = SHOT_LIST.map((shot) => shot.file);
  assert.deepEqual([...files].sort(), files);
  for (const { name } of [...SHOT_LIST, { name: 'map' }, { name: 'combat' }, { name: 'missionRain' }]) {
    assert.ok(getShot(name), name);
  }
  assert.equal(getShot('missionRain').weather, 'rain');
});

test('the street cell is job 3 of 8 under way: two jobs done, its last stage on foot with a line of talk', () => {
  assert.equal(storyTotals(STORY_POINTS.thirdJob).paid.length, 2);
  const def = STORY_MISSIONS[2];
  assert.equal(def.id, 'white-van');
  assert.equal(def.number, 3);
  const stage = def.stages[3];
  assert.equal(stage.onFoot, true);
  assert.ok(stage.talk.length > 0);
  assert.equal(getShot('street').time, 'golden');
});

test('the map stands at the last job: it pins Gilded Tide and both side jobs, with two stars and two cruisers', () => {
  const { game, seen } = stagedGame();
  getShot('map').stage(game);
  const totals = storyTotals(STORY_POINTS.lastJob);
  const { progress } = game.missions;
  assert.equal(game.player.state.wallet.cash, totals.cash);
  assert.equal(progress.respect, totals.respect);
  assert.deepEqual(availableMissions(progress, STORY_MISSIONS).map((def) => def.number), [8]);
  assert.equal(availableMissions(progress, ACTIVITIES).length, 2);
  assert.deepEqual(seen, { stars: 2, cruisers: 2 });
});
