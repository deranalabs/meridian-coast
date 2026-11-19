// Unit tests for the phone's pure helpers: when a job can be taken, the next rank, and contact names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { blockReason, nextRank } from './phone.js';
import { shortName } from './phoneview.js';
import { CAST } from '../data/cast.js';

test('a job can be taken only on foot, with no heat and no job running', () => {
  const free = { missionActive: false, stars: 0, mode: 'foot', down: false };
  assert.equal(blockReason(free), null);
  assert.match(blockReason({ ...free, stars: 2 }), /police/);
  assert.match(blockReason({ ...free, missionActive: true }), /job/);
  assert.match(blockReason({ ...free, mode: 'driving' }), /car/);
});

test('the next rank is above the current respect and runs out at the top', () => {
  assert.equal(nextRank(0).respect, 10);
  assert.ok(nextRank(10).respect > 10);
  assert.equal(nextRank(1e9), null);
});

test('contact names are short and unique', () => {
  assert.equal(shortName('Augustin "Gus" Pell'), 'Gus');
  assert.equal(shortName('Capt. Renata Solis'), 'Solis');
  const names = CAST.map((person) => shortName(person.name));
  assert.equal(new Set(names).size, names.length);
});
