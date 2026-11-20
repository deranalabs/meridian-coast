// Tests for the Continue card: the lines it shows for a sample save text, a finished story and an unstamped save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSave } from '../save/savegame.js';
import { saveCardText, savedAtText, storyPoint } from './savecard.js';

const SAVED_AT = new Date(2026, 10, 20, 21, 14).getTime();
const SAMPLE = JSON.stringify({
  version: 2, cash: 41230, clock: 22340, savedAt: SAVED_AT,
  missions: { done: ['lantern-run', 'salt-and-chrome', 'white-van', 'headline', 'hill-favour', 'tarp-run'],
    paid: ['lantern-run'], respect: 128, fails: 3 },
});

test('a sample save gives the slot, the mission it stands at, the cash and the time', () => {
  const { save, status } = parseSave(SAMPLE);
  assert.equal(status, 'ok');
  assert.deepEqual(saveCardText(save), {
    slot: 'Slot 1 · Harbour Name',
    chapter: 'Mission 7 of 8',
    mission: 'Tide Tables',
    cash: '$41,230',
    saved: 'Saved Fri 20 Nov, 21:14',
  });
});

test('a new story stands at mission one, a finished one says so', () => {
  assert.deepEqual(storyPoint({ done: [] }), { step: 1, total: 8, title: 'Lantern Run' });
  const all = ['lantern-run', 'salt-and-chrome', 'white-van', 'headline', 'hill-favour', 'tarp-run', 'tide-tables',
    'gilded-tide'];
  const { save } = parseSave(JSON.stringify({ version: 2, missions: { done: all } }));
  const card = saveCardText(save, 2);
  assert.equal(card.chapter, 'All 8 missions done');
  assert.equal(card.mission, 'Story complete');
  assert.equal(card.slot, 'Slot 2 · Nobody');
});

test('a save with no stamp reads plainly, and minutes keep two digits', () => {
  assert.equal(savedAtText(0), '');
  assert.equal(savedAtText(Number.NaN), '');
  assert.equal(savedAtText(new Date(2026, 0, 4, 9, 5).getTime()), 'Sun 4 Jan, 09:05');
  const { save } = parseSave(JSON.stringify({ version: 2, cash: 7 }));
  assert.equal(saveCardText(save).saved, 'Saved at an unknown time');
  assert.equal(saveCardText(save).cash, '$7');
});
