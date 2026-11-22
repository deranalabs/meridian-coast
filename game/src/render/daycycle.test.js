// Tests for the day cycle: a seamless blend, lamps on at night and off at noon, and pinned times that stay put.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDayBlend, lookFor } from './daycycle.js';
import { getTimeOfDay } from './timeofday.js';
import { DAY_SECONDS, startingClock, createDayClock, clockText } from '../systems/dayclock.js';
import { getShot } from '../shots.js';
import { SHOT_LIST } from '../../../tests/shot-list.mjs';
import { defaultSave, parseSave, serialise } from '../save/savegame.js';

/** Every number a look holds, named. */
function flat(look) {
  const out = {};
  for (const [key, value] of Object.entries(look)) {
    if (typeof value === 'number') out[key] = value;
    else if (value?.isColor) for (const part of 'rgb') out[`${key}.${part}`] = value[part];
    else if (value?.isVector3) for (const part of 'xyz') out[`${key}.${part}`] = value[part];
  }
  return out;
}

test('the blend has no jump anywhere round the day, midnight included', () => {
  const blend = createDayBlend();
  const samples = [];
  const steps = DAY_SECONDS * 4;
  for (let step = 0; step <= steps; step += 1) samples.push(flat(blend.at(((step / steps) * 24) % 24)));
  for (const key of Object.keys(samples[0])) {
    const values = samples.map((sample) => sample[key]);
    const range = Math.max(...values) - Math.min(...values);
    for (let step = 1; step < values.length; step += 1) {
      const jump = Math.abs(values[step] - values[step - 1]);
      assert.ok(jump <= range * 0.03 + 1e-6, `${key} jumps at ${((step / steps) * 24).toFixed(2)} h`);
    }
  }
});

test('lamps are off at noon and on from dusk through the night to dawn', () => {
  const blend = createDayBlend();
  assert.equal(blend.at(12).lampLevel, 0);
  for (const hour of [19.5, 22, 0, 3, 6]) assert.ok(blend.at(hour).lampLevel > 0.4, `${hour} h`);
});

test('noon is lighter than dawn or dusk, which are lighter than midnight', () => {
  const blend = createDayBlend();
  const sun = (hour) => blend.at(hour).sunIntensity;
  assert.ok(sun(12) > sun(6.3) && sun(6.3) > sun(0));
  assert.ok(sun(12) > sun(19.5) && sun(19.5) > sun(0));
  assert.ok(Math.abs(blend.at(12).sunDir.length() - 1) < 1e-6);
});

test('the four named times are presets with every field of a look', () => {
  const fields = Object.keys(lookFor(getTimeOfDay('dusk'))).sort();
  for (const name of ['day', 'dusk', 'night', 'dawn']) {
    const preset = getTimeOfDay(name);
    assert.equal(preset.name, name);
    assert.deepEqual(Object.keys(lookFor(preset)).sort(), fields, name);
  }
});

test('free play goes round once in about twelve minutes and holds during a job', () => {
  const clock = createDayClock(startingClock(null, null));
  assert.equal(clock.cycles, true);
  assert.ok(Math.abs(DAY_SECONDS - 720) <= 60);
  const from = clock.hour;
  clock.advance(60, true);
  assert.equal(clock.hour, from, 'held');
  clock.advance(DAY_SECONDS / 2, false);
  assert.ok(Math.abs(((clock.hour - from + 24) % 24) - 12) < 1e-6);
  clock.advance(DAY_SECONDS / 2, false);
  assert.ok(Math.abs(clock.hour - from) < 1e-6);
});

test('an address pins a time and every staged scene ignores the cycle', () => {
  const staged = SHOT_LIST.map(({ name }) => startingClock(getShot(name), null));
  const asked = ['day', 'dusk', 'night', 'dawn'].map((name) => startingClock(null, name));
  for (const start of [...staged, ...asked]) {
    const clock = createDayClock(start);
    assert.equal(clock.cycles, false);
    const from = clock.hour;
    clock.advance(500, false);
    clock.setHour(3);
    assert.equal(clock.hour, from);
  }
  assert.deepEqual(staged.map((start) => start.time), SHOT_LIST.map(({ name }) => getShot(name).time));
  assert.equal(startingClock(null, 'teatime').cycles, true);
});

test('the clock reads as hours and minutes', () => {
  assert.equal(clockText(21 + 40 / 60), '21:40');
  assert.equal(clockText(0), '00:00');
  assert.equal(clockText(23.9999), '23:59');
});

test('the hour survives a save, and an older save without one still loads', () => {
  assert.equal(parseSave(serialise({ ...defaultSave(), hour: 6.5 })).save.hour, 6.5);
  assert.equal(parseSave(JSON.stringify({ version: 2, time: 'night' })).save.hour, 22.5);
});
