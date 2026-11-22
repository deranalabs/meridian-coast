// Unit tests for the Progress page: every figure and line follows from a sample state and the game's data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { progressView, lastSaveText } from './progressdata.js';
import { STORY_MISSIONS } from '../missions/story/index.js';
import { ACTIVITIES } from '../missions/activities/index.js';
import { RANKS } from '../missions/progress.js';
import { PLACES } from '../data/places.js';
import { WEAPON_PRICES, CAR_PRICES } from '../data/prices.js';
import { STATIONS } from './radiocontent.js';
import { storyTotals, STORY_POINTS } from '../shotsstory.js';
import { createArsenal, giveWeapon } from '../combat/arsenal.js';
import { createVitals } from '../combat/vitals.js';

function sample(point = STORY_POINTS.garage) {
  const { done, paid, cash, respect } = storyTotals(point);
  const arsenal = createArsenal();
  for (const id of point.weapons) giveWeapon(arsenal, id);
  return { progress: { done, paid, respect, fails: 0 }, wallet: { cash }, arsenal, vitals: createVitals(),
    outfit: { colours: {} }, cars: (point.cars ?? []).map((type) => ({ type })) };
}

const fresh = () => ({ progress: { done: [], paid: [], respect: 0, fails: 0 }, wallet: { cash: 2480 },
  arsenal: createArsenal(), vitals: createVitals(), outfit: { colours: {} }, cars: [] });

const figuresOf = (state) => Object.fromEntries(progressView(state).figures.map((f) => [f.id, [f.value, f.of]]));
const SHOP_KINDS = ['gun', 'clothes', 'dealer', 'spray', 'food'];
const shops = PLACES.filter((place) => SHOP_KINDS.includes(place.kind)).length;

test('the figures of a late save', () => {
  const state = sample();
  assert.deepEqual(figuresOf(state), {
    jobs: [7, STORY_MISSIONS.length],
    sides: [ACTIVITIES.length, null],
    rank: [5, RANKS.length],
    respect: [state.progress.respect, null],
    weapons: [2, Object.keys(WEAPON_PRICES).length],
    cars: [2, 6],
    shops: [shops, null],
    radio: [STATIONS.length, null],
  });
});

test('the figures of a new game', () => {
  const figures = figuresOf(fresh());
  assert.deepEqual(figures.jobs, [0, STORY_MISSIONS.length]);
  assert.deepEqual([figures.rank[0], figures.weapons[0], figures.cars[0]], [1, 0, 0]);
  assert.equal(figures.sides[0], ACTIVITIES.filter((def) => !def.requires.length).length);
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

test('each district names the faction that holds it', () => {
  assert.deepEqual(progressView(fresh()).districts.map((d) => [d.id, d.faction]).sort(), [
    ['beach', 'Gilded Wake'], ['harbor', 'Salt Dogs'], ['heights', 'Calder Crew'], ['neon', 'Velvet Hand'],
  ]);
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
