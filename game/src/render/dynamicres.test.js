// Tests for dynamic resolution: slow frames step the render scale down, a long vsync run steps it back up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDynamicResolution } from './dynamicres.js';

function fakePost() {
  return {
    scale: 1,
    setScale(value) {
      this.scale = Math.round(value * 100) / 100;
    },
  };
}

function feed(controller, frameMs, seconds) {
  for (let t = 0; t < seconds; t += frameMs / 1000) controller.update(frameMs, frameMs / 1000);
}

test('after a 3 s warm-up, slow frames lower the scale, never below the minimum', () => {
  const post = fakePost();
  const controller = createDynamicResolution(post);
  feed(controller, 30, 20);
  assert.equal(post.scale, 0.6);
});

test('steady vsync frames bring the scale back up after the retry window', () => {
  const post = fakePost();
  const controller = createDynamicResolution(post);
  feed(controller, 25, 6);
  const lowered = post.scale;
  assert.ok(lowered < 1);
  feed(controller, 16.7, 40);
  assert.ok(post.scale > lowered);
});
