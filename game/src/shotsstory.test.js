// Unit tests for the shot scenes' story seed: jobs done, respect, cash and weapons at each staged point.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_POINTS, seedStory } from './shotsstory.js';
import { createArsenal } from './combat/arsenal.js';
import { createWallet } from './economy/wallet.js';
import { createProgress, availableMissions, cleanProgress, rankFor } from './missions/progress.js';
import { lockReason } from './missions/respect.js';
import { STORY_MISSIONS } from './missions/story/index.js';

const newGame = () => ({
  missions: { progress: createProgress() },
  player: { state: { wallet: createWallet(2480), arsenal: createArsenal() } },
});

test('the last-job point has seven jobs paid, $52,400, 152 respect and both guns', () => {
  const game = newGame();
  seedStory(game, STORY_POINTS.lastJob);
  const { progress } = game.missions;
  const { wallet, arsenal } = game.player.state;
  assert.deepEqual(progress.done, STORY_MISSIONS.slice(0, 7).map((def) => def.id));
  assert.deepEqual(progress.paid, progress.done);
  assert.deepEqual([wallet.cash, progress.respect], [52400, 152]);
  assert.deepEqual(Object.keys(arsenal.owned), ['fists', 'pistol', 'smg']);
  assert.deepEqual(availableMissions(progress, STORY_MISSIONS).map((def) => def.number), [8]);
});

test('the fourth-job point has what three jobs pay, less the pistol', () => {
  const game = newGame();
  seedStory(game, STORY_POINTS.fourthJob);
  const { progress } = game.missions;
  const jobs = STORY_MISSIONS.slice(0, 3);
  const sum = (key) => jobs.reduce((total, def) => total + def.reward[key], 0);
  assert.equal(game.player.state.wallet.cash, 2480 + sum('cash') - 450);
  assert.equal(progress.respect, sum('respect'));
  assert.deepEqual(Object.keys(game.player.state.arsenal.owned), ['fists', 'pistol']);
});

test('every point is a valid save whose weapons its rank has unlocked', () => {
  for (const point of Object.values(STORY_POINTS)) {
    const game = newGame();
    seedStory(game, point);
    const { progress } = game.missions;
    assert.deepEqual(cleanProgress(progress), progress);
    for (const id of point.weapons) assert.equal(lockReason(`weapon:${id}`, progress.respect), '', id);
    assert.ok(rankFor(progress.respect).name !== 'Nobody');
  }
});
