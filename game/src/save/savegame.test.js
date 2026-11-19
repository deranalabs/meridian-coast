// Tests for the save format: round trips, old versions migrate, corrupt or future data falls back safely.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, serialise, normalise, defaultSave, SAVE_VERSION } from './savegame.js';

test('a save round-trips through text', () => {
  const save = {
    ...defaultSave(),
    cash: 1234,
    weapons: { fists: { clip: 0, reserve: 0 }, pistol: { clip: 7, reserve: 40 } },
    current: 'pistol',
    outfit: { top: 2, bottom: 1, outer: 99, hair: 7, colours: { top: '#ff00aa' } },
    cars: [{ type: 'coupe', colour: '#123456' }],
    position: { x: 10, z: -20, heading: 1 },
    time: 'night',
  };
  const { save: loaded, status } = parseSave(serialise(save));
  assert.equal(status, 'ok');
  assert.equal(loaded.version, SAVE_VERSION);
  assert.equal(loaded.cash, 1234);
  assert.deepEqual(loaded.weapons.pistol, { clip: 7, reserve: 40 });
  assert.equal(loaded.current, 'pistol');
  assert.equal(loaded.outfit.top, 2);
  assert.equal(loaded.outfit.colours.top, '#ff00aa');
  assert.deepEqual(loaded.cars, [{ type: 'coupe', colour: '#123456' }]);
  assert.deepEqual(loaded.position, { x: 10, z: -20, heading: 1 });
  assert.equal(loaded.time, 'night');
});

test('empty, corrupt and non-object text give the default save', () => {
  assert.equal(parseSave('').status, 'empty');
  assert.equal(parseSave(null).status, 'empty');
  assert.equal(parseSave('{not json').status, 'corrupt');
  assert.equal(parseSave('[1,2]').status, 'corrupt');
  assert.equal(parseSave('"text"').status, 'corrupt');
  assert.equal(parseSave('{broken').save.cash, defaultSave().cash);
});

test('a save from a newer version is refused, not misread', () => {
  const result = parseSave(JSON.stringify({ version: SAVE_VERSION + 1, cash: 9 }));
  assert.equal(result.status, 'future');
  assert.equal(result.save.cash, defaultSave().cash);
});

test('version 1 saves migrate their flat position', () => {
  const { save, status } = parseSave(JSON.stringify({ version: 1, cash: 50, x: 3, z: 4 }));
  assert.equal(status, 'ok');
  assert.equal(save.cash, 50);
  assert.deepEqual(save.position, { x: 3, z: 4, heading: 0 });
});

test('bad fields are clamped or dropped field by field', () => {
  const save = normalise({
    version: 2,
    cash: -50,
    health: 900,
    weapons: { pistol: { clip: 999, reserve: 'many' }, rocket: { clip: 1 }, fists: 3 },
    current: 'rocket',
    cars: [{ type: 'tank' }, { type: 'sedan', colour: 'red' }, null],
    position: { x: 'far', z: 2 },
    time: 'noon',
    outfit: { top: 'blue', colours: { top: 'nope' } },
  });
  assert.equal(save.cash, 0);
  assert.equal(save.health, 100);
  assert.deepEqual(save.weapons.pistol, { clip: 12, reserve: 0 });
  assert.equal(save.weapons.rocket, undefined);
  assert.equal(save.current, 'fists');
  assert.deepEqual(save.cars, [{ type: 'sedan', colour: '#c0c5ce' }]);
  assert.equal(save.position, null);
  assert.equal(save.time, 'dusk');
  assert.deepEqual(save.outfit, { colours: {} });
});
