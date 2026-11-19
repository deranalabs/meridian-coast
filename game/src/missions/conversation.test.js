// Unit tests for dialogue pacing: typewriter timing, punctuation pauses, skip, auto advance and queue order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversation, revealTimes, visibleCount, holdTime, CHARS_PER_SECOND } from './conversation.js';

const STEP = 1 / 60;
const run = (talk, seconds) => {
  for (let t = 0; t < seconds; t += STEP) talk.update(STEP);
};

test('the typewriter shows characters at its pace and pauses after a full stop', () => {
  const times = revealTimes('Hi. You.', 40);
  assert.equal(times[0], 0);
  assert.ok(Math.abs(times[1] - 1 / 40) < 1e-6);
  assert.ok(times[3] - times[2] > 0.2, 'a pause after ". "');
  assert.ok(times[2] - times[1] < 0.03, 'no pause mid-word');
  assert.equal(visibleCount(times, 0), 1);
  assert.equal(visibleCount(times, 10), 8);
  const talk = createConversation();
  talk.queue([['nell', 'Twenty letters long.']]);
  run(talk, 0.2);
  const shown = talk.text.length;
  assert.ok(shown > 3 && shown < 20, `shown ${shown}`);
  assert.equal(talk.text, 'Twenty letters long.'.slice(0, shown));
  assert.ok(Math.abs(shown - 0.2 * CHARS_PER_SECOND) <= 2);
});

test('skip finishes the line first, then moves to the next one', () => {
  const started = [];
  const talk = createConversation({ onLine: (line) => started.push(line.speaker) });
  let done = 0;
  talk.queue([['nell', 'First line of the talk.'], { speaker: 'ilo', text: 'Second.' }], () => {
    done += 1;
  });
  run(talk, 0.05);
  assert.equal(talk.complete, false);
  talk.skip();
  assert.equal(talk.complete, true);
  assert.equal(talk.text, 'First line of the talk.');
  assert.equal(talk.line.speaker, 'nell');
  talk.skip();
  assert.equal(talk.line.speaker, 'ilo');
  assert.equal(talk.text, '');
  talk.skip();
  talk.skip();
  assert.equal(talk.active, false);
  assert.equal(done, 1);
  assert.deepEqual(started, ['nell', 'ilo']);
});

test('a finished line holds for its reading time and then advances by itself', () => {
  const talk = createConversation();
  let done = false;
  talk.queue([['gus', 'Pay me.']], () => {
    done = true;
  });
  run(talk, 0.5);
  assert.equal(talk.complete, true);
  assert.equal(done, false);
  run(talk, holdTime('Pay me.') + 0.1);
  assert.equal(done, true);
  assert.equal(talk.active, false);
});

test('conversations play in the order they were queued, empty ones finish at once', () => {
  const order = [];
  const talk = createConversation({ onLine: (line) => order.push(line.text) });
  talk.queue([['a', 'one']], () => order.push('end one'));
  talk.queue([], () => order.push('end empty'));
  talk.queue([['b', 'two']], () => order.push('end two'));
  for (let i = 0; i < 4; i += 1) talk.skip();
  assert.deepEqual(order, ['one', 'end one', 'end empty', 'two', 'end two']);
  talk.queue([['c', 'three']], () => order.push('never'));
  talk.clear();
  assert.equal(talk.active, false);
  run(talk, 5);
  assert.equal(order.includes('never'), false);
});
