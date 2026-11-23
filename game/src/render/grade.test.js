// The split grade's tints by sun height and the low-sun glow level.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitTone, sunGlowLevel, sunHeight } from './grade.js';

test('a high sun splits gently: amber on the sun side, teal-blue in shadow', () => {
  const { warm, cool, split } = splitTone(58);
  assert.ok(warm[0] > warm[2], 'warm side leans red');
  assert.ok(cool[2] > cool[0], 'cool side leans blue');
  assert.ok(split > 0.4 && split < 0.7);
});

test('a low sun splits harder, orange against violet', () => {
  const high = splitTone(58);
  const low = splitTone(4);
  assert.ok(low.split > high.split);
  assert.ok(low.warm[0] - low.warm[2] > high.warm[0] - high.warm[2], 'warmer at low sun');
  assert.ok(low.cool[0] > low.cool[1], 'violet: red over green in the shadow tint');
});

test('below the horizon the warm side turns pink: blue comes back over green', () => {
  const { warm, cool } = splitTone(-20);
  assert.ok(warm[2] > warm[1], 'pink, not orange');
  assert.ok(cool[2] > 1.1);
});

test('the split changes smoothly with no jump between bands', () => {
  let last = splitTone(70);
  for (let h = 69.5; h >= -30; h -= 0.5) {
    const next = splitTone(h);
    for (let i = 0; i < 3; i += 1) {
      assert.ok(Math.abs(next.warm[i] - last.warm[i]) < 0.02, `warm jumps at ${h}`);
      assert.ok(Math.abs(next.cool[i] - last.cool[i]) < 0.02, `cool jumps at ${h}`);
    }
    last = next;
  }
});

test('the sun glow shows only at a low sun', () => {
  assert.equal(sunGlowLevel(58), 0, 'noon');
  assert.equal(sunGlowLevel(-24), 0, 'night');
  assert.equal(sunGlowLevel(7), 1, 'dusk');
  assert.equal(sunGlowLevel(12.5), 1, 'golden hour');
  assert.ok(sunGlowLevel(24) > 0 && sunGlowLevel(24) < 1, 'fading in');
  assert.ok(sunGlowLevel(-2) > 0 && sunGlowLevel(-2) < 1, 'fading out');
});

test('sun height reads degrees from a unit direction', () => {
  assert.ok(Math.abs(sunHeight({ x: 0, y: 1, z: 0 }) - 90) < 1e-9);
  assert.ok(Math.abs(sunHeight({ x: Math.cos(0.2), y: Math.sin(0.2), z: 0 }) - 11.459) < 0.01);
});
