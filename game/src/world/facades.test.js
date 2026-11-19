// Tests for the facade atlas tables and its weathering grain: every styled tile exists, grain runs on over seams.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, TILE_CELL, ALWAYS_LIT, ATLAS_COLUMNS, ATLAS_ROWS, grainIndex } from './facades.js';
import { tileableNoise } from '../render/textures.js';

const TILE = 128;

test('every tile a style names has its own atlas cell inside the 8 x 4 grid', () => {
  const names = Object.values(STYLES).flatMap((style) => [...style.body, ...style.ground]);
  for (const name of [...names, ...ALWAYS_LIT]) {
    const cell = TILE_CELL[name];
    assert.ok(cell, `${name} has a cell`);
    assert.ok(cell[0] < ATLAS_COLUMNS && cell[1] < ATLAS_ROWS, `${name} is inside the atlas`);
  }
  const keys = Object.values(TILE_CELL).map(([c, r]) => `${c},${r}`);
  assert.equal(new Set(keys).size, keys.length, 'no two tiles share a cell');
});

test('grain jumps no more across a bay or storey seam than between neighbouring pixels inside a tile', () => {
  const noise = tileableNoise(TILE, TILE / 16, 3, 5);
  const at = (x, y) => noise[grainIndex(x, y)];
  let inside = 0;
  let seam = 0;
  for (let column = 0; column < ATLAS_COLUMNS; column += 1) {
    for (let row = 0; row < ATLAS_ROWS; row += 1) {
      const x0 = column * TILE;
      const y0 = row * TILE;
      for (let k = 0; k < TILE; k += 1) {
        inside = Math.max(inside, Math.abs(at(x0 + 63, y0 + k) - at(x0 + 64, y0 + k)));
        inside = Math.max(inside, Math.abs(at(x0 + k, y0 + 63) - at(x0 + k, y0 + 64)));
        // A wall repeats the tile: its last column meets its own first column, its top row its bottom row.
        seam = Math.max(seam, Math.abs(at(x0 + TILE - 1, y0 + k) - at(x0, y0 + k)));
        seam = Math.max(seam, Math.abs(at(x0 + k, y0 + TILE - 1) - at(x0 + k, y0)));
      }
    }
  }
  assert.ok(seam <= inside * 1.5 + 1e-6, `seam jump ${seam.toFixed(3)} vs inside ${inside.toFixed(3)}`);
});

test('neighbouring tiles read the grain at different offsets', () => {
  const a = [0, 1, 2, 3].map((k) => grainIndex(k, 0));
  const b = [0, 1, 2, 3].map((k) => grainIndex(TILE + k, 0));
  const c = [0, 1, 2, 3].map((k) => grainIndex(k, TILE));
  assert.notDeepEqual(a, b);
  assert.notDeepEqual(a, c);
});
