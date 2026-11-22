// Unit tests for the rank bar's words: the rung as n/steps on the ladder and the respect total under it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rankRung, rankLine } from './rankbar.js';
import { rankProgress } from '../missions/respect.js';
import { RANKS } from '../missions/progress.js';

test('156 respect is rank 5/6 with 24 to Tide Caller', () => {
  const progress = rankProgress(156);
  assert.equal(rankRung(progress), '5/6');
  assert.equal(rankLine(progress), '156 respect · 24 to Tide Caller');
});

test('the ladder has one rung per rank, from a new game to the top', () => {
  RANKS.forEach((rank, index) => {
    assert.equal(rankRung(rankProgress(rank.respect)), `${index + 1}/${RANKS.length}`);
  });
  assert.equal(rankLine(rankProgress(0)), '0 respect · 10 to Runner');
  assert.equal(rankLine(rankProgress(216)), '216 respect · Top rank');
});

test('part points never round the next rank closer than it is', () => {
  assert.equal(rankLine(rankProgress(59.9)), '59 respect · 1 to Earner');
});
