// Unit tests for respect: rank thresholds, what each rank unlocks, the shop lock, and the repeatable activities
// (they resolve, pay every time, and the taxi tip follows the meter).
import test from 'node:test';
import assert from 'node:assert/strict';
import { RANKS, rankFor, createProgress, payReward, isAvailable } from './progress.js';
import { RANK_UNLOCKS, lockReason, nextUnlock, unlockedItems, unlockLabel, rankNeeded, rankProgress }
  from './respect.js';
import { itemsFor } from '../shops/catalog.js';
import { ACTIVITIES } from './activities/index.js';
import { tipFor, FARES } from './activities/taxi.js';
import { resolveMission } from './resolve.js';
import { PLACES, MISSION_PLACES } from '../data/places.js';
import { CLOTHING } from '../data/clothing.js';
import { STORY_MISSIONS } from './story/index.js';

test('rank thresholds climb and every rank has a name', () => {
  assert.deepEqual(RANKS.map((rank) => rank.respect), [0, 10, 30, 60, 100, 180]);
  assert.equal(rankFor(0).name, 'Nobody');
  assert.equal(rankFor(29).name, 'Runner');
  assert.equal(rankFor(30).name, 'Known Face');
  assert.equal(rankFor(9999).name, 'Tide Caller');
  const story = STORY_MISSIONS.reduce((sum, def) => sum + def.reward.respect, 0);
  assert.ok(story >= 180, `the story alone reaches the top rank (${story})`);
});

test('unlocks open at their rank and the shop shows the lock until then', () => {
  for (const rank of Object.keys(RANK_UNLOCKS)) assert.ok(RANKS.some((entry) => entry.name === rank), rank);
  assert.equal(rankNeeded('weapon:pistol'), null);
  assert.equal(lockReason('weapon:smg', 29), 'Rank: Known Face');
  assert.equal(lockReason('weapon:smg', 30), '');
  assert.equal(lockReason('weapon:pistol', 0), '');
  assert.deepEqual(nextUnlock(12),
    { name: 'Known Face', respect: 30, needed: 18, opens: ['weapon:smg', 'car:pickup'] });
  assert.equal(nextUnlock(500), null);
  assert.deepEqual(unlockedItems(10), RANK_UNLOCKS.Runner);
  assert.equal(unlockLabel('weapon:smg'), 'Ratchet SMG');
  assert.equal(unlockLabel('wear:gilt-blazer'), 'Gilt Blazer');
  for (const id of Object.values(RANK_UNLOCKS).flat()) {
    if (id.startsWith('wear:')) assert.ok(CLOTHING.some((piece) => `wear:${piece.id}` === id), id);
  }
  const ctx = (respect) => ({ wallet: { cash: 99999 }, arsenal: { owned: {} }, vitals: { health: 50, armour: 0 },
    outfit: {}, cars: [], driving: false, stars: 0, lockedBy: (id) => lockReason(id, respect) });
  const smg = (respect) => itemsFor('gun', ctx(respect)).find((item) => item.id === 'weapon:smg');
  assert.equal(smg(0).disabled, true);
  assert.equal(smg(0).locked, true);
  assert.equal(smg(0).reason, 'Rank: Known Face');
  assert.equal(smg(40).disabled, false);
});

test('job gear is only on the shelf while a mission asks for it', () => {
  const ctx = { wallet: { cash: 5000 }, arsenal: { owned: {} }, vitals: { health: 100, armour: 0 }, outfit: {},
    cars: [], driving: false, stars: 0 };
  assert.ok(!itemsFor('gun', ctx).some((item) => item.job));
  const gear = itemsFor('gun', { ...ctx, gear: ['gear:cutter', 'gear:masks'] }).filter((item) => item.job);
  assert.deepEqual(gear.map((item) => item.id), ['gear:cutter']);
  assert.equal(itemsFor('clothes', { ...ctx, gear: ['gear:masks'] })[0].id, 'gear:masks');
});

const places = new Map([...PLACES, ...MISSION_PLACES].map((place, i) => [place.id,
  { ...place, x: i * 50, z: 0, outX: 0, outZ: 1, heading: 0 }]));

test('activities resolve, repeat, pay every time and sort after the story', () => {
  for (const def of ACTIVITIES) {
    const resolved = resolveMission(def, places);
    assert.ok(resolved.repeat && resolved.activity && def.number > 100, def.id);
  }
  for (const [from, to] of FARES) assert.ok(places.has(from) && places.has(to), `${from} ${to}`);
  const progress = createProgress();
  const wallet = { cash: 0 };
  const [race] = ACTIVITIES;
  progress.done.push('salt-and-chrome');
  assert.ok(isAvailable(progress, race));
  assert.deepEqual(payReward(progress, race, wallet), { cash: 600, respect: 6 });
  assert.ok(isAvailable(progress, race), 'still open after a win');
  assert.deepEqual(payReward(progress, race, wallet, 40), { cash: 640, respect: 6 });
  assert.equal(wallet.cash, 1240);
  assert.equal(progress.respect, 12);
  assert.equal(tipFor(30), 120);
  assert.equal(tipFor(-5), 0);
});

test('rank progress gives the fraction of the way to the next rank and is full at the top', () => {
  assert.deepEqual(rankProgress(0),
    { step: 1, steps: 6, name: 'Nobody', next: 'Runner', respect: 0, fraction: 0, gained: 0, span: 10 });
  assert.deepEqual(rankProgress(45),
    { step: 3, steps: 6, name: 'Known Face', next: 'Earner', respect: 45, fraction: 0.5, gained: 15, span: 30 });
  assert.equal(rankProgress(59.9).name, 'Known Face');
  assert.equal(rankProgress(60).fraction, 0);
  assert.equal(rankProgress(-8).fraction, 0, 'negative respect clamps to zero');
  assert.equal(rankProgress(undefined).name, 'Nobody');
  const top = rankProgress(RANKS.at(-1).respect + 50);
  assert.equal(top.next, null);
  assert.equal(top.fraction, 1);
  for (let points = 0; points < 200; points += 7) {
    const { fraction } = rankProgress(points);
    assert.ok(fraction >= 0 && fraction <= 1, `fraction at ${points}`);
  }
});
