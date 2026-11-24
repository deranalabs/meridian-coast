// Gain queue tests: which wallet and respect changes pop up, how they merge, age, fade and leave, and their text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGainState, noteValue, stepGains, gainLook, gainText, GAIN_LIFE, GAIN_MERGE, GAIN_WARMUP,
  MAX_GAINS } from './gainqueue.js';

/** A state past its warm-up, with cash and respect already seen once. */
function warm(cash = 1000, respect = 10) {
  const state = createGainState();
  noteValue(state, 'cash', cash);
  noteValue(state, 'respect', respect);
  stepGains(state, GAIN_WARMUP + 0.01);
  return state;
}

test('the first value seen and every change in the warm-up only set the baseline', () => {
  const state = createGainState();
  noteValue(state, 'cash', 20970);
  stepGains(state, GAIN_WARMUP / 2);
  noteValue(state, 'cash', 40000);
  assert.equal(state.gains.length, 0);
  stepGains(state, GAIN_WARMUP);
  noteValue(state, 'cash', 40000);
  assert.equal(state.gains.length, 0);
  noteValue(state, 'cash', 40450);
  assert.deepEqual(state.gains.map((g) => [g.kind, g.amount]), [['cash', 450]]);
});

test('a rise pops up its exact amount; a fall or no change does not', () => {
  const state = warm(1000, 10);
  noteValue(state, 'cash', 800);
  noteValue(state, 'respect', 10);
  assert.equal(state.gains.length, 0);
  noteValue(state, 'respect', 22);
  noteValue(state, 'cash', 1250);
  assert.deepEqual(state.gains.map((g) => [g.kind, g.amount]), [['respect', 12], ['cash', 450]]);
});

test('quick rises of one kind merge into one pop-up, a later one starts a new pop-up', () => {
  const state = warm(0, 0);
  for (let i = 1; i <= 10; i += 1) {
    noteValue(state, 'cash', i * 100);
    stepGains(state, GAIN_MERGE / 4);
  }
  assert.equal(state.gains.length, 1);
  assert.equal(state.gains[0].amount, 1000);
  stepGains(state, GAIN_MERGE + 0.01);
  noteValue(state, 'cash', 1150);
  assert.deepEqual(state.gains.map((g) => g.amount), [1000, 150]);
});

test('a merge restarts the pop-up so it stays readable while the pay is still counting', () => {
  const state = warm(0, 0);
  noteValue(state, 'cash', 100);
  stepGains(state, GAIN_MERGE * 0.9);
  noteValue(state, 'cash', 300);
  assert.equal(state.gains[0].amount, 300);
  assert.ok(state.gains[0].age < GAIN_MERGE * 0.5);
});

test('pop-ups leave after their life and never more than the cap show at once', () => {
  const state = warm(0, 0);
  for (let i = 1; i <= MAX_GAINS + 2; i += 1) {
    noteValue(state, i % 2 ? 'cash' : 'respect', i * 10);
    stepGains(state, GAIN_MERGE + 0.01);
  }
  assert.equal(state.gains.length, MAX_GAINS);
  assert.equal(state.gains.at(-1).amount, (MAX_GAINS + 2) * 10 - MAX_GAINS * 10);
  stepGains(state, GAIN_LIFE);
  assert.equal(state.gains.length, 0);
});

test('a pop-up fades in, holds, rises and fades out by the end of its life', () => {
  assert.equal(gainLook(0).opacity, 0);
  assert.equal(gainLook(GAIN_LIFE * 0.4).opacity, 1);
  assert.equal(gainLook(GAIN_LIFE).opacity, 0);
  assert.ok(gainLook(GAIN_LIFE * 0.9).opacity < 1);
  let last = -1;
  for (let age = 0; age <= GAIN_LIFE; age += GAIN_LIFE / 20) {
    const { rise } = gainLook(age);
    assert.ok(rise >= last);
    last = rise;
  }
  assert.ok(last > 10 && last <= 32);
});

test('the text names the amount the way the HUD writes money and respect', () => {
  assert.equal(gainText('cash', 450), '+$450');
  assert.equal(gainText('cash', 40000), '+$40,000');
  assert.equal(gainText('respect', 12), '+12 respect');
});
