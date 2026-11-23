// Unit tests for the Progress page: the percentage, every bar, the career and each line follow from a sample state
// and the game's data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { progressView, lastSaveText } from './progressdata.js';
import { STORY_MISSIONS } from '../missions/story/index.js';
import { ACTIVITIES } from '../missions/activities/index.js';
import { RANKS } from '../missions/progress.js';
import { PLACES } from '../data/places.js';
import { WEAPON_PRICES, CAR_PRICES } from '../data/prices.js';
import { PACKAGE_COUNT } from '../economy/packages.js';
import { DISTRICT_LIST } from '../world/districts.js';
import { MAX_CARS } from '../shops/catalog.js';
import { createCareer, cleanCareer, completion } from '../stats/career.js';
import { storyTotals, STORY_POINTS } from '../shotsstory.js';
import { createArsenal, giveWeapon } from '../combat/arsenal.js';
import { createVitals } from '../combat/vitals.js';

function sample(point = STORY_POINTS.garage) {
  const { done, paid, cash, respect, packages } = storyTotals(point);
  const arsenal = createArsenal();
  for (const id of point.weapons) giveWeapon(arsenal, id);
  return { progress: { done, paid, respect, fails: 0 }, wallet: { cash }, arsenal, vitals: createVitals(),
    outfit: { colours: {} }, cars: (point.cars ?? []).map((type) => ({ type })), career: cleanCareer(point.career),
    packages: { count: packages.length, total: PACKAGE_COUNT } };
}

const fresh = () => ({ progress: { done: [], paid: [], respect: 0, fails: 0 }, wallet: { cash: 2480 },
  arsenal: createArsenal(), vitals: createVitals(), outfit: { colours: {} }, cars: [], career: createCareer(),
  packages: { count: 0, total: PACKAGE_COUNT } });

const barsOf = (state) => Object.fromEntries(progressView(state).bars.map((b) => [b.id, [b.have, b.of]]));
const SHOP_KINDS = ['gun', 'clothes', 'dealer', 'spray', 'food'];
const shops = PLACES.filter((place) => SHOP_KINDS.includes(place.kind)).length;

test('the bars of a late save', () => {
  const sides = STORY_POINTS.garage.sides.length;
  assert.deepEqual(barsOf(sample()), {
    jobs: [7, STORY_MISSIONS.length],
    sides: [sides, ACTIVITIES.length],
    guns: [2, Object.keys(WEAPON_PRICES).length],
    cars: [2, MAX_CARS],
    shops: [5, shops],
    packages: [7, PACKAGE_COUNT],
    districts: [DISTRICT_LIST.length, DISTRICT_LIST.length],
  });
});

test('a new game starts every bar and the percentage at 0', () => {
  const view = progressView(fresh());
  assert.ok(view.bars.every((bar) => bar.have === 0 && bar.of > 0));
  assert.equal(view.complete, 0);
});

test('the percentage is the bars\' mean share, and 100 only once every bar is full', () => {
  const view = progressView(sample());
  assert.equal(view.complete, completion(view.bars));
  assert.ok(view.complete > 0 && view.complete < 100);
  const full = view.bars.map((bar) => ({ have: bar.of, of: bar.of }));
  assert.equal(completion(full), 100);
});

test('the career counters come from the record, distance in km', () => {
  const view = progressView(sample());
  const career = Object.fromEntries(view.career.map((c) => [c.id, c.value]));
  const { stolen, starsLost, busted, wasted, metres } = STORY_POINTS.garage.career;
  assert.deepEqual(career, { stolen: String(stolen), starsLost: String(starsLost), busted: String(busted),
    wasted: String(wasted), km: (Math.floor(metres / 100) / 10).toFixed(1) });
  assert.deepEqual(view.now, { step: 5, of: RANKS.length, name: view.now.name,
    respect: storyTotals(STORY_POINTS.garage).respect });
});

test('the next job and the next rank with what it opens', () => {
  const { job, rank } = progressView(sample());
  assert.deepEqual(job, { id: 'gilded-tide', number: 8, total: 8, title: 'Gilded Tide', giver: 'Nell Okafor' });
  assert.equal(rank.name, 'Tide Caller');
  assert.equal(rank.needed, RANKS.at(-1).respect - storyTotals(STORY_POINTS.garage).respect);
  assert.equal(rank.opens.length, 1);
});

test('a finished story at the top rank has no next job and no next rank', () => {
  const state = sample();
  state.progress.done = STORY_MISSIONS.map((def) => def.id);
  state.progress.respect = RANKS.at(-1).respect;
  const { job, rank } = progressView(state);
  assert.deepEqual([job, rank], [null, null]);
});

test('three things on sale, at the shops\' prices, with the rank each still needs', () => {
  const late = progressView(sample()).sale;
  assert.equal(late.length, 3);
  assert.equal(late[0].id, 'weapon:shotgun');
  assert.equal(late[0].price, WEAPON_PRICES.shotgun);
  assert.equal(late[0].needs, '');
  assert.equal(late[1].price, CAR_PRICES[late[1].id.split(':')[1]]);
  assert.equal(late[2].needs, 'Tide Caller');
  const early = progressView(fresh()).sale;
  assert.equal(early.length, 3);
  assert.ok(early.every((item) => item.needs), 'a newcomer sees what rank opens');
});

test('the last save reads as on the Continue card', () => {
  const savedAt = new Date(2026, 10, 20, 21, 14).getTime();
  assert.equal(lastSaveText({ status: 'ok', save: { savedAt } }), 'Saved Fri 20 Nov, 21:14');
  assert.equal(lastSaveText({ status: 'empty', save: { savedAt: 0 } }), 'Not saved yet');
  assert.equal(lastSaveText(null), 'Not saved yet');
});
