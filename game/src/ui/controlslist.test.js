// The keys a new player is shown: the title's legend names every one, and the first hint names E twice over.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TITLE_KEYS, controlsLegend, roamHint } from './controlslist.js';

test('the title legend lists every key a first session needs', () => {
  const shown = TITLE_KEYS.map(([keys, what]) => `${keys.join(' ')}: ${what}`).join('\n');
  for (const wanted of [/W A S D.*arrows/i, /Shift: run/i, /Space:.*handbrake/i, /E:.*car.*talk/i,
    /Mouse: look.*aim/i, /Click: fire/i, /Q: aim/i, /1-4: weapons/i, /R: reload/i, /P: phone/i, /N: map/i,
    /Esc: pause/i]) {
    assert.match(shown, wanted);
  }
});

test('the legend stays compact: short lines, one row a key, all in the markup', () => {
  assert.ok(TITLE_KEYS.length <= 16, 'more rows would not fit 768x480');
  for (const [, what] of TITLE_KEYS) assert.ok(what.length <= 32, what);
  assert.equal((controlsLegend().match(/class="legend-row"/g) ?? []).length, TITLE_KEYS.length);
});

test('before the first job the hint names E for a car and the gold pillar, in one short line', () => {
  const plain = (html) => html.replace(/<[^>]+>/g, '');
  const first = plain(roamHint(0));
  assert.match(first, /^E\b/);
  assert.match(first, /car/);
  assert.match(first, /gold pillar/);
  assert.ok(first.length <= 42, first);
  assert.match(plain(roamHint(2)), /gold pillar.*P/);
});
