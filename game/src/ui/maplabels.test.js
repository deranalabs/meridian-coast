// The map's labels: big enough to survive the sheet, and placed so none covers another, Ilo or the window's edge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeLabels, labelSizes, boxesOverlap } from './maplabels.js';

const VIEW = { width: 940, height: 660 };
const item = (text, x, y, options = {}) => ({ text, x, y, width: text.length * 17, height: 30, ...options });

test('the type is large on a full map and still fits a small one', () => {
  const full = labelSizes(940, 670);
  assert.ok(full.district >= 36 && full.job >= 28, JSON.stringify(full));
  const small = labelSizes(520, 380);
  assert.ok(small.district >= 20 && small.district < full.district);
  assert.ok(small.job >= 16 && small.job < full.job);
});

test('labels that share a spot are moved apart, the first keeping its place', () => {
  const items = [item('PALMETTO BEACH', 500, 200), item('Marlin Crown', 505, 205), item('Causeway Sprint', 498, 196)];
  const placed = placeLabels(items, VIEW);
  assert.deepEqual([placed[0].x, placed[0].y], [500, 200]);
  assert.equal(placed.length, 3);
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) assert.ok(!boxesOverlap(placed[i], placed[j]), `${i} on ${j}`);
  }
});

test('a job label gets out from under the player marker', () => {
  const marker = { x: 400, y: 300, width: 44, height: 44 };
  const [placed] = placeLabels([item('Rask Cabs', 402, 298, { rise: 20 })], VIEW, [marker]);
  assert.ok(!boxesOverlap(placed, marker));
});

test('a label stays inside the map', () => {
  for (const [x, y] of [[4, 4], [936, 656], [4, 656], [936, 4]]) {
    const [placed] = placeLabels([item('Gull Key Light', x, y)], VIEW);
    assert.ok(placed.x - placed.width / 2 >= 0 && placed.x + placed.width / 2 <= VIEW.width);
    assert.ok(placed.y - placed.height / 2 >= 0 && placed.y + placed.height / 2 <= VIEW.height);
  }
});

test('with no room an optional label is left out and a needed one is still drawn', () => {
  const wall = [{ x: 470, y: 330, width: 940, height: 660 }];
  assert.equal(placeLabels([item('Marlin Crown', 300, 300, { optional: true })], VIEW, wall).length, 0);
  assert.equal(placeLabels([item('Gilded Tide', 300, 300)], VIEW, wall).length, 1);
});

test('a label whose point is off the map is not dragged into view', () => {
  assert.equal(placeLabels([item('Meridian Bowl', -90, 300)], VIEW).length, 0);
});
