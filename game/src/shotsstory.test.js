// Unit tests for the shot scenes' story seed: every staged total is a sum of the game's own rewards and prices.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_POINTS, STAGED_SAVED_AT, seedStory, storyTotals, storySaveText } from './shotsstory.js';
import { createArsenal } from './combat/arsenal.js';
import { createVitals, MAX_ARMOUR } from './combat/vitals.js';
import { createWallet } from './economy/wallet.js';
import { WEAPON_PRICES, ARMOUR_PRICE, CAR_PRICES, GEAR } from './data/prices.js';
import { createProgress, availableMissions, cleanProgress, isAvailable } from './missions/progress.js';
import { lockReason } from './missions/respect.js';
import { STORY_MISSIONS } from './missions/story/index.js';
import { ACTIVITIES } from './missions/activities/index.js';
import { defaultSave, parseSave } from './save/savegame.js';

const START = defaultSave().cash;
const jobsPay = (count, key) => STORY_MISSIONS.slice(0, count).reduce((total, def) => total + def.reward[key], 0);
const sprint = ACTIVITIES.find((def) => def.id === 'causeway-sprint');
const tideTablesGear = GEAR.cutter.price + GEAR.masks.price;

const newGame = () => ({
  missions: { progress: createProgress() },
  ownedCars: [],
  player: { state: { wallet: createWallet(START), arsenal: createArsenal(), vitals: createVitals() } },
});

function seeded(point) {
  const game = newGame();
  seedStory(game, point);
  return { game, progress: game.missions.progress, ...game.player.state };
}

test('the fourth-job point: three jobs paid, less the pistol', () => {
  const { progress, wallet, arsenal, vitals } = seeded(STORY_POINTS.fourthJob);
  assert.equal(wallet.cash, START + jobsPay(3, 'cash') - WEAPON_PRICES.pistol);
  assert.equal(progress.respect, jobsPay(3, 'respect'));
  assert.deepEqual(progress.done, STORY_MISSIONS.slice(0, 3).map((def) => def.id));
  assert.deepEqual(Object.keys(arsenal.owned), ['fists', 'pistol']);
  assert.equal(vitals.armour, 0);
});

test('the title point: six jobs paid, less both guns', () => {
  const { progress, wallet, arsenal } = seeded(STORY_POINTS.sixDone);
  assert.equal(wallet.cash, START + jobsPay(6, 'cash') - WEAPON_PRICES.pistol - WEAPON_PRICES.smg);
  assert.equal(progress.respect, jobsPay(6, 'respect'));
  assert.deepEqual(Object.keys(arsenal.owned), ['fists', 'pistol', 'smg']);
});

test('the last-job point: seven jobs and one sprint paid, less both guns, the vest and the job gear', () => {
  const { progress, wallet, arsenal, vitals } = seeded(STORY_POINTS.lastJob);
  const spent = WEAPON_PRICES.pistol + WEAPON_PRICES.smg + ARMOUR_PRICE.price + tideTablesGear;
  assert.equal(wallet.cash, START + jobsPay(7, 'cash') + sprint.reward.cash - spent);
  assert.equal(progress.respect, jobsPay(7, 'respect') + sprint.reward.respect);
  assert.deepEqual(progress.done, [...STORY_MISSIONS.slice(0, 7).map((def) => def.id), sprint.id]);
  assert.deepEqual(progress.paid, STORY_MISSIONS.slice(0, 7).map((def) => def.id));
  assert.deepEqual(Object.keys(arsenal.owned), ['fists', 'pistol', 'smg']);
  assert.equal(vitals.armour, MAX_ARMOUR);
  assert.deepEqual(availableMissions(progress, STORY_MISSIONS).map((def) => def.number), [8]);
});

test('the progress point is the last-job point less two cars', () => {
  const last = storyTotals(STORY_POINTS.lastJob);
  const { progress, wallet, game } = seeded(STORY_POINTS.garage);
  const types = game.ownedCars.map((car) => car.type);
  assert.equal(types.length, 2);
  assert.equal(wallet.cash, last.cash - types.reduce((total, type) => total + CAR_PRICES[type], 0));
  assert.equal(progress.respect, last.respect);
});

test('every point can be reached: money in hand, side jobs open and each buy unlocked by its rank', () => {
  for (const [name, point] of Object.entries(STORY_POINTS)) {
    const totals = storyTotals(point);
    const { progress } = seeded(point);
    assert.ok(totals.cash >= 0, name);
    assert.deepEqual(cleanProgress(progress), progress, name);
    for (const id of point.sides ?? []) {
      assert.ok(isAvailable(progress, ACTIVITIES.find((def) => def.id === id)), id);
    }
    const buys = [...point.weapons.map((id) => `weapon:${id}`), ...(point.cars ?? []).map((type) => `car:${type}`)];
    for (const id of buys) assert.equal(lockReason(id, totals.respect), '', id);
  }
});

test('a staged save parses to the same point with its stamp', () => {
  const { save, status } = parseSave(storySaveText(STORY_POINTS.garage));
  const totals = storyTotals(STORY_POINTS.garage);
  assert.equal(status, 'ok');
  assert.deepEqual([save.cash, save.missions.respect, save.savedAt], [totals.cash, totals.respect, STAGED_SAVED_AT]);
  assert.deepEqual(save.missions.done, totals.done);
  assert.deepEqual(Object.keys(save.weapons), ['fists', ...STORY_POINTS.garage.weapons]);
  assert.deepEqual(save.cars.map((car) => car.type), STORY_POINTS.garage.cars);
});
